import {
    UserState,
    StudySession,
    ChatHistory,
    ChatMessage,
    Quiz,
    QuizResult,
    ProgressData,
    TopicProgress,
    ActivityRecord,
    SpacedRepetitionItem,
} from '../types';

export class StudyState implements DurableObject {
    private state: DurableObjectState;
    private userState: UserState | null = null;

    constructor(state: DurableObjectState) {
        this.state = state;
    }

    async fetch(request: Request): Promise<Response> {
        // Initialize state if needed
        if (!this.userState) {
            this.userState = await this.state.storage.get<UserState>('userState') || this.createDefaultState();
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            // Chat endpoints
            if (path === '/chat/history') {
                return await this.getChatHistory(request);
            } else if (path === '/chat/save') {
                return await this.saveChatMessage(request);
            }

            // Session endpoints
            else if (path === '/session/create') {
                return await this.createSession(request);
            } else if (path === '/session/current') {
                return await this.getCurrentSession();
            } else if (path === '/session/complete') {
                return await this.completeSession(request);
            }

            // Quiz endpoints
            else if (path === '/quiz/save') {
                return await this.saveQuiz(request);
            } else if (path === '/quiz/submit') {
                return await this.submitQuiz(request);
            } else if (path === '/quiz/results') {
                return await this.getQuizResults();
            }

            // Progress endpoints
            else if (path === '/progress/overall') {
                return await this.getOverallProgress();
            } else if (path === '/progress/topics') {
                return await this.getTopicProgress();
            } else if (path === '/progress/update') {
                return await this.updateProgress(request);
            }

            return new Response('Not Found', { status: 404 });
        } catch (error) {
            console.error('Durable Object error:', error);
            return new Response(JSON.stringify({ error: 'Internal error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    private createDefaultState(): UserState {
        return {
            userId: 'default-user',
            sessions: {},
            chatHistories: {},
            quizzes: {},
            quizResults: [],
            progress: {
                userId: 'default-user',
                totalStudyTime: 0,
                totalSessions: 0,
                totalQuizzes: 0,
                averageScore: 0,
                currentStreak: 0,
                longestStreak: 0,
                topicsStudied: [],
                recentActivity: [],
            },
            spacedRepetitionQueue: [],
        };
    }

    // Chat methods
    private async getChatHistory(request: Request): Promise<Response> {
        const { sessionId } = await request.json();
        const history = this.userState!.chatHistories[sessionId];

        return new Response(JSON.stringify(history?.messages || []), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    private async saveChatMessage(request: Request): Promise<Response> {
        const { sessionId, userMessage, aiResponse } = await request.json();

        if (!this.userState!.chatHistories[sessionId]) {
            this.userState!.chatHistories[sessionId] = {
                sessionId,
                messages: [],
            };
        }

        const timestamp = Date.now();

        this.userState!.chatHistories[sessionId].messages.push(
            {
                role: 'user',
                content: userMessage,
                timestamp,
            },
            {
                role: 'assistant',
                content: aiResponse,
                timestamp: timestamp + 1,
            }
        );

        await this.state.storage.put('userState', this.userState);

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Session methods
    private async createSession(request: Request): Promise<Response> {
        const session: StudySession = await request.json();

        this.userState!.sessions[session.id] = session;
        this.userState!.progress.totalSessions++;

        // Add to recent activity
        this.userState!.progress.recentActivity.unshift({
            type: 'session',
            topic: session.topic,
            timestamp: session.startTime,
        });

        // Keep only last 50 activities
        this.userState!.progress.recentActivity = this.userState!.progress.recentActivity.slice(0, 50);

        await this.state.storage.put('userState', this.userState);

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    private async getCurrentSession(): Promise<Response> {
        const activeSessions = Object.values(this.userState!.sessions).filter(
            s => s.status === 'active'
        );

        const currentSession = activeSessions[activeSessions.length - 1] || null;

        return new Response(JSON.stringify(currentSession), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    private async completeSession(request: Request): Promise<Response> {
        const { sessionId } = await request.json();
        const session = this.userState!.sessions[sessionId];

        if (session) {
            session.status = 'completed';
            session.endTime = Date.now();

            const duration = (session.endTime - session.startTime) / 1000 / 60; // minutes
            this.userState!.progress.totalStudyTime += duration;

            // Update topic progress
            await this.updateTopicProgress(session.topic, duration);

            await this.state.storage.put('userState', this.userState);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Quiz methods
    private async saveQuiz(request: Request): Promise<Response> {
        const quiz: Quiz = await request.json();

        this.userState!.quizzes[quiz.id] = quiz;
        await this.state.storage.put('userState', this.userState);

        return new Response(JSON.stringify({ success: true, quizId: quiz.id }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    private async submitQuiz(request: Request): Promise<Response> {
        const { quizId, answers } = await request.json();
        const quiz = this.userState!.quizzes[quizId];

        if (!quiz) {
            return new Response(JSON.stringify({ error: 'Quiz not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        let score = 0;
        const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);

        quiz.questions.forEach(question => {
            if (answers[question.id]?.toLowerCase() === question.correctAnswer.toLowerCase()) {
                score += question.points;
            }
        });

        const result: QuizResult = {
            quizId,
            score,
            maxScore,
            percentage: (score / maxScore) * 100,
            answers,
            completedAt: Date.now(),
            timeSpent: 0, // Can be tracked separately
        };

        this.userState!.quizResults.push(result);
        this.userState!.progress.totalQuizzes++;

        // Update average score
        const allScores = this.userState!.quizResults.map(r => r.percentage);
        this.userState!.progress.averageScore =
            allScores.reduce((sum, s) => sum + s, 0) / allScores.length;

        // Add to recent activity
        this.userState!.progress.recentActivity.unshift({
            type: 'quiz',
            topic: quiz.topic,
            timestamp: Date.now(),
            score: result.percentage,
        });

        // Update topic quiz average
        await this.updateTopicQuizAverage(quiz.topic, result.percentage);

        await this.state.storage.put('userState', this.userState);

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    private async getQuizResults(): Promise<Response> {
        return new Response(JSON.stringify(this.userState!.quizResults), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Progress methods
    private async getOverallProgress(): Promise<Response> {
        return new Response(JSON.stringify(this.userState!.progress), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    private async getTopicProgress(): Promise<Response> {
        return new Response(JSON.stringify(this.userState!.progress.topicsStudied), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    private async updateTopicProgress(topic: string, duration: number): Promise<void> {
        let topicProgress = this.userState!.progress.topicsStudied.find(t => t.topic === topic);

        if (!topicProgress) {
            topicProgress = {
                topic,
                masteryLevel: 0,
                timeSpent: 0,
                sessionsCount: 0,
                quizAverage: 0,
                lastStudied: Date.now(),
            };
            this.userState!.progress.topicsStudied.push(topicProgress);
        }

        topicProgress.timeSpent += duration;
        topicProgress.sessionsCount++;
        topicProgress.lastStudied = Date.now();

        // Calculate mastery level (simple heuristic)
        topicProgress.masteryLevel = Math.min(
            100,
            (topicProgress.sessionsCount * 10) + (topicProgress.quizAverage * 0.5)
        );
    }

    private async updateTopicQuizAverage(topic: string, score: number): Promise<void> {
        const topicProgress = this.userState!.progress.topicsStudied.find(t => t.topic === topic);

        if (topicProgress) {
            const quizResults = this.userState!.quizResults.filter(
                r => this.userState!.quizzes[r.quizId]?.topic === topic
            );

            const avg = quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length;
            topicProgress.quizAverage = avg;

            // Update mastery level
            topicProgress.masteryLevel = Math.min(
                100,
                (topicProgress.sessionsCount * 10) + (topicProgress.quizAverage * 0.5)
            );
        }
    }

    private async updateProgress(request: Request): Promise<Response> {
        const updates = await request.json();

        Object.assign(this.userState!.progress, updates);
        await this.state.storage.put('userState', this.userState);

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
}