import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { StudySessionParams } from '../types';

type StudySessionEnv = {
    STUDY_STATE: DurableObjectNamespace;
    AI: Ai;
};

export class StudySessionWorkflow extends WorkflowEntrypoint<StudySessionEnv, StudySessionParams> {
    async run(event: WorkflowEvent<StudySessionParams>, step: WorkflowStep) {
        const { sessionId, topic, duration, difficulty, userId } = event.payload;

        // Step 1: Initialize session
        const initResult = await step.do('initialize-session', async () => {
            console.log(`Initializing study session ${sessionId} for ${topic}`);

            return {
                sessionId,
                topic,
                startTime: Date.now(),
                status: 'initialized',
            };
        });

        // Step 2: Load user's previous progress on this topic
        const previousProgress = await step.do('load-progress', async () => {
            const id = this.env.STUDY_STATE.idFromName(userId);
            const stub = this.env.STUDY_STATE.get(id);

            const response = await stub.fetch('http://internal/progress/topics');
            const topics = await response.json();

            const topicProgress = topics.find((t: any) => t.topic === topic);

            return {
                masteryLevel: topicProgress?.masteryLevel || 0,
                timeSpent: topicProgress?.timeSpent || 0,
                sessionsCount: topicProgress?.sessionsCount || 0,
            };
        });

        // Step 3: Generate personalized learning path
        const learningPath = await step.do('generate-learning-path', async () => {
            const isNewTopic = previousProgress.sessionsCount === 0;
            const needsReview = previousProgress.masteryLevel < 50;

            let approach = 'standard';
            if (isNewTopic) {
                approach = 'introduction';
            } else if (needsReview) {
                approach = 'reinforcement';
            } else {
                approach = 'advanced';
            }

            return {
                approach,
                suggestedDuration: duration,
                focusAreas: this.getFocusAreas(approach, topic),
            };
        });

        // Step 4: Monitor session (in real workflow, this would be more complex)
        await step.sleep('monitor-duration', duration * 60 * 1000); // Convert minutes to ms

        // Step 5: Generate session summary
        const summary = await step.do('generate-summary', async () => {
            const id = this.env.STUDY_STATE.idFromName(userId);
            const stub = this.env.STUDY_STATE.get(id);

            // Get chat history for this session
            const historyResponse = await stub.fetch('http://internal/chat/history', {
                method: 'POST',
                body: JSON.stringify({ sessionId }),
            });
            const messages = await historyResponse.json();

            // Use AI to generate summary
            const prompt = `Summarize this study session on ${topic}. 
Session approach: ${learningPath.approach}
Number of interactions: ${messages.length}
Duration: ${duration} minutes

Provide a brief summary of what was covered and recommendations for next steps.`;

            try {
                const aiResponse = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                    messages: [
                        { role: 'system', content: 'You are a study session summarizer.' },
                        { role: 'user', content: prompt },
                    ],
                    max_tokens: 300,
                });

                return aiResponse.response || 'Session completed successfully.';
            } catch (error) {
                return `Completed ${duration}-minute study session on ${topic}.`;
            }
        });

        // Step 6: Update mastery level
        const masteryUpdate = await step.do('update-mastery', async () => {
            const id = this.env.STUDY_STATE.idFromName(userId);
            const stub = this.env.STUDY_STATE.get(id);

            // Calculate new mastery level (simplified algorithm)
            const sessionBonus = 5;
            const timeBonus = Math.min(10, Math.floor(duration / 10));
            const newMasteryLevel = Math.min(100, previousProgress.masteryLevel + sessionBonus + timeBonus);

            return {
                previousLevel: previousProgress.masteryLevel,
                newLevel: newMasteryLevel,
                increase: newMasteryLevel - previousProgress.masteryLevel,
            };
        });

        // Step 7: Schedule spaced repetition
        const repetitionSchedule = await step.do('schedule-repetition', async () => {
            const id = this.env.STUDY_STATE.idFromName(userId);
            const stub = this.env.STUDY_STATE.get(id);

            // Calculate next review date based on mastery level
            let intervalDays = 1;
            if (masteryUpdate.newLevel >= 80) {
                intervalDays = 7;
            } else if (masteryUpdate.newLevel >= 60) {
                intervalDays = 3;
            } else if (masteryUpdate.newLevel >= 40) {
                intervalDays = 2;
            }

            const nextReview = Date.now() + (intervalDays * 24 * 60 * 60 * 1000);

            return {
                topic,
                nextReview,
                intervalDays,
                masteryLevel: masteryUpdate.newLevel,
            };
        });

        // Step 8: Return workflow result
        return await step.do('finalize-workflow', async () => {
            return {
                success: true,
                sessionId,
                summary,
                masteryUpdate,
                repetitionSchedule,
                learningPath,
            };
        });
    }

    private getFocusAreas(approach: string, topic: string): string[] {
        switch (approach) {
            case 'introduction':
                return [
                    `Basic concepts of ${topic}`,
                    'Fundamental principles',
                    'Simple examples',
                    'Common terminology',
                ];
            case 'reinforcement':
                return [
                    `Review core concepts of ${topic}`,
                    'Practice problems',
                    'Common misconceptions',
                    'Real-world applications',
                ];
            case 'advanced':
                return [
                    `Advanced aspects of ${topic}`,
                    'Complex scenarios',
                    'Edge cases',
                    'Integration with other concepts',
                ];
            default:
                return [`Understanding ${topic}`, 'Key concepts', 'Examples'];
        }
    }
}