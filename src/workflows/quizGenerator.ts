import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { QuizGenerationParams, Quiz, QuizQuestion, TopicProgress } from '../types';

type QuizGenEnv = {
    STUDY_STATE: DurableObjectNamespace;
    AI: Ai;
    CACHE: KVNamespace;
};

// Workers AI response type
interface AiTextGenerationOutput {
    response?: string;
}

export class QuizGenerationWorkflow extends WorkflowEntrypoint<QuizGenEnv, QuizGenerationParams> {
    async run(event: WorkflowEvent<QuizGenerationParams>, step: WorkflowStep) {
        const { topic, questionCount, difficulty, userId } = event.payload;

        // Step 1: Analyze study session content
        const contentAnalysis = await step.do('analyze-content', async () => {
            const id = this.env.STUDY_STATE.idFromName(userId);
            const stub = this.env.STUDY_STATE.get(id);

            // Get user's sessions on this topic
            const progressResponse = await stub.fetch('http://internal/progress/topics');
            const topics = await progressResponse.json() as TopicProgress[];
            const topicProgress = topics.find((t) => t.topic === topic);

            return {
                masteryLevel: topicProgress?.masteryLevel || 0,
                sessionsCount: topicProgress?.sessionsCount || 0,
                averageScore: topicProgress?.quizAverage || 0,
            };
        });

        // Step 2: Identify key concepts
        const keyConcepts = await step.do('identify-concepts', async () => {
            const prompt = `List 5-10 key concepts for ${topic} at ${difficulty} level.
Return as a simple comma-separated list.`;

            try {
                const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                    messages: [
                        { role: 'system', content: 'You are a curriculum expert.' },
                        { role: 'user', content: prompt },
                    ],
                    max_tokens: 200,
                }) as AiTextGenerationOutput;

                const conceptsText = response.response || '';
                return conceptsText.split(',').map(c => c.trim()).filter(c => c.length > 0);
            } catch (error) {
                return [`Core ${topic} concepts`, `${topic} fundamentals`, `${topic} applications`];
            }
        });

        // Step 3: Generate questions via LLM
        const generatedQuestions = await step.do('generate-questions', async () => {
            // Check cache first
            const cacheKey = `quiz:${topic}:${difficulty}:${questionCount}`;
            const cached = await this.env.CACHE.get(cacheKey);

            if (cached) {
                console.log('Using cached quiz questions');
                return JSON.parse(cached);
            }

            const prompt = `Generate ${questionCount} quiz questions about ${topic} at ${difficulty} level.

Focus on these concepts: ${keyConcepts.join(', ')}

Return ONLY valid JSON (no markdown, no explanation):
{
  "questions": [
    {
      "id": "q1",
      "question": "What is...?",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Explanation here",
      "points": 10
    }
  ]
}

Requirements:
- Mix question types: multiple-choice, true-false, short-answer
- Clear, unambiguous questions
- Good distractors for multiple choice
- Comprehensive explanations
- Points: 10 (easy), 15 (medium), 20 (hard)`;

            try {
                const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                    messages: [
                        { role: 'system', content: 'You generate quiz questions. Return only valid JSON.' },
                        { role: 'user', content: prompt },
                    ],
                    max_tokens: 2500,
                    temperature: 0.8,
                }) as AiTextGenerationOutput;

                const content = response.response || '{}';

                // Extract JSON
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('No JSON in response');
                }

                const parsed = JSON.parse(jsonMatch[0]);

                if (!parsed.questions || !Array.isArray(parsed.questions)) {
                    throw new Error('Invalid format');
                }

                // Cache for 1 hour
                await this.env.CACHE.put(cacheKey, JSON.stringify(parsed.questions), {
                    expirationTtl: 3600,
                });

                return parsed.questions;
            } catch (error) {
                console.error('Question generation failed:', error);
                return this.getFallbackQuestions(topic, questionCount, keyConcepts);
            }
        });

        // Step 4: Validate question quality
        const validatedQuestions = await step.do('validate-questions', async () => {
            const validated: QuizQuestion[] = [];

            for (const q of generatedQuestions) {
                // Ensure required fields
                if (!q.question || !q.correctAnswer || !q.explanation) {
                    continue;
                }

                // Ensure proper structure
                const validatedQ: QuizQuestion = {
                    id: q.id || `q${validated.length + 1}`,
                    question: q.question,
                    type: q.type || 'short-answer',
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    points: q.points || 10,
                };

                validated.push(validatedQ);
            }

            return validated.slice(0, questionCount);
        });

        // Step 5: Create answer key
        const answerKey = await step.do('create-answer-key', async () => {
            const key: Record<string, string> = {};

            validatedQuestions.forEach(q => {
                key[q.id] = q.correctAnswer;
            });

            return key;
        });

        // Step 6: Store quiz in Durable Object
        const quizId = await step.do('store-quiz', async () => {
            const id = this.env.STUDY_STATE.idFromName(userId);
            const stub = this.env.STUDY_STATE.get(id);

            const quiz: Quiz = {
                id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                topic,
                difficulty: difficulty as any,
                questions: validatedQuestions,
                createdAt: Date.now(),
            };

            await stub.fetch('http://internal/quiz/save', {
                method: 'POST',
                body: JSON.stringify(quiz),
            });

            return quiz.id;
        });

        // Step 7: Return quiz to user
        return await step.do('finalize-quiz', async () => {
            return {
                success: true,
                quizId,
                quiz: {
                    id: quizId,
                    topic,
                    difficulty,
                    questions: validatedQuestions,
                    totalPoints: validatedQuestions.reduce((sum, q) => sum + q.points, 0),
                    estimatedTime: validatedQuestions.length * 2, // 2 min per question
                },
                answerKey,
                keyConcepts,
            };
        });
    }

    private getFallbackQuestions(
        topic: string,
        count: number,
        concepts: string[]
    ): QuizQuestion[] {
        const questions: QuizQuestion[] = [];

        for (let i = 0; i < Math.min(count, 5); i++) {
            const concept = concepts[i % concepts.length] || topic;

            questions.push({
                id: `q${i + 1}`,
                question: `Explain your understanding of ${concept}.`,
                type: 'short-answer',
                correctAnswer: 'Open-ended answer',
                explanation: `This tests your understanding of ${concept}.`,
                points: 10,
            });
        }

        return questions;
    }
}