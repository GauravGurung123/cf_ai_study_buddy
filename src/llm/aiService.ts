import { ChatMessage, AIResponse, QuizQuestion } from '../types';

export class AIService {
    private ai: Ai;

    constructor(ai: Ai) {
        this.ai = ai;
    }

    /**
     * Generate a chat response with context
     */
    async chat(userMessage: string, history: ChatMessage[]): Promise<string> {
        const systemPrompt = `You are an encouraging and patient AI study tutor. Your goals:
- Help students understand complex topics through clear explanations
- Break down difficult concepts into simpler parts
- Use analogies and examples to illustrate ideas
- Ask probing questions to check understanding
- Adjust explanations based on student responses
- Encourage critical thinking and curiosity
- Stay focused on educational content
- Be supportive and positive

When explaining:
- Start with high-level concepts, then dive deeper
- Use concrete examples
- Check for understanding regularly
- Relate new concepts to familiar ones`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10), // Keep last 10 messages for context
            { role: 'user', content: userMessage },
        ];

        try {
            const response = await this.ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                messages,
                max_tokens: 1024,
                temperature: 0.7,
            });

            return response.response || 'I apologize, but I encountered an error. Please try again.';
        } catch (error) {
            console.error('AI chat error:', error);
            throw new Error('Failed to generate AI response');
        }
    }

    /**
     * Generate an explanation for a topic
     */
    async explainTopic(topic: string, difficulty: string): Promise<string> {
        const prompt = `Explain ${topic} at a ${difficulty} level. 
Provide a clear, structured explanation that:
1. Introduces the core concept
2. Breaks it down into key components
3. Provides practical examples
4. Mentions real-world applications
Keep it concise but comprehensive (300-500 words).`;

        try {
            const response = await this.ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                messages: [
                    { role: 'system', content: 'You are an expert educator.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 800,
                temperature: 0.7,
            });

            return response.response || '';
        } catch (error) {
            console.error('AI explain error:', error);
            throw new Error('Failed to generate explanation');
        }
    }

    /**
     * Generate quiz questions for a topic
     */
    async generateQuiz(
        topic: string,
        questionCount: number,
        difficulty: string
    ): Promise<QuizQuestion[]> {
        const prompt = `Generate ${questionCount} ${difficulty} level quiz questions about ${topic}.

Return ONLY valid JSON in this exact format (no other text):
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here?",
      "type": "multiple-choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Why this is correct...",
      "points": 10
    }
  ]
}

Requirements:
- Mix of multiple-choice, true-false, and short-answer questions
- Clear, unambiguous questions
- Well-crafted distractors for multiple choice
- Comprehensive explanations
- Points: 10 for easy, 15 for medium, 20 for hard
- Test understanding, not just memorization`;

        try {
            const response = await this.ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                messages: [
                    { role: 'system', content: 'You are a quiz generation expert. Return only valid JSON.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 2048,
                temperature: 0.8,
            });

            const content = response.response || '{}';

            // Extract JSON from response (handle cases where model adds extra text)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate and return questions
            if (!parsed.questions || !Array.isArray(parsed.questions)) {
                throw new Error('Invalid quiz format');
            }

            return parsed.questions;
        } catch (error) {
            console.error('AI quiz generation error:', error);

            // Return fallback questions if generation fails
            return this.getFallbackQuestions(topic, questionCount);
        }
    }

    /**
     * Generate study recommendations
     */
    async getStudyRecommendations(
        topicsStudied: string[],
        weakAreas: string[]
    ): Promise<string> {
        const prompt = `Based on these studied topics: ${topicsStudied.join(', ')}
And these weak areas: ${weakAreas.join(', ')}

Provide 3-5 specific study recommendations to improve understanding. 
Be actionable and specific.`;

        try {
            const response = await this.ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                messages: [
                    { role: 'system', content: 'You are a study advisor.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 512,
                temperature: 0.7,
            });

            return response.response || 'Continue practicing and reviewing concepts regularly.';
        } catch (error) {
            console.error('AI recommendations error:', error);
            return 'Focus on reviewing weak areas and practice with more examples.';
        }
    }

    /**
     * Generate session summary
     */
    async summarizeSession(
        topic: string,
        messages: ChatMessage[],
        duration: number
    ): Promise<string> {
        const conversationText = messages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');

        const prompt = `Summarize this ${duration}-minute study session on ${topic}:

${conversationText}

Provide a brief summary including:
1. Main concepts covered
2. Questions asked
3. Areas of strength
4. Areas needing more practice
5. Suggested next steps

Keep it concise (150-200 words).`;

        try {
            const response = await this.ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                messages: [
                    { role: 'system', content: 'You are a session summarizer.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 400,
                temperature: 0.5,
            });

            return response.response || 'Session completed successfully.';
        } catch (error) {
            console.error('AI summary error:', error);
            return `Studied ${topic} for ${duration} minutes. Continue practicing to reinforce learning.`;
        }
    }

    /**
     * Fallback quiz questions when generation fails
     */
    private getFallbackQuestions(topic: string, count: number): QuizQuestion[] {
        const questions: QuizQuestion[] = [];

        for (let i = 0; i < Math.min(count, 3); i++) {
            questions.push({
                id: `q${i + 1}`,
                question: `What is a key concept in ${topic}?`,
                type: 'short-answer',
                correctAnswer: 'Various answers accepted',
                explanation: `This question tests your understanding of ${topic}.`,
                points: 10,
            });
        }

        return questions;
    }
}