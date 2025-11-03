const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:8787';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface StudySession {
    id: string;
    topic: string;
    duration: number;
    difficulty: string;
    startTime: number;
    status: string;
}

interface Quiz {
    quizId: string;
    questions: Question[];
    totalPoints: number;
}

interface Question {
    id: string;
    question: string;
    type: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
}

interface QuizResult {
    score: number;
    maxScore: number;
    percentage: number;
    answers: Record<string, string>;
}

interface ProgressData {
    totalStudyTime: number;
    totalSessions: number;
    totalQuizzes: number;
    averageScore: number;
    currentStreak: number;
    longestStreak: number;
    topicsStudied: TopicProgress[];
    recentActivity: ActivityRecord[];
}

interface TopicProgress {
    topic: string;
    masteryLevel: number;
    timeSpent: number;
    sessionsCount: number;
    quizAverage: number;
    lastStudied: number;
}

interface ActivityRecord {
    type: 'session' | 'quiz';
    topic: string;
    timestamp: number;
    duration?: number;
    score?: number;
}

class APIClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response.json();
    }

    // Chat endpoints
    async sendChatMessage(
        message: string,
        sessionId: string,
        userId: string
    ): Promise<string> {
        const data = await this.request<{ response: string }>('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ message, sessionId, userId }),
        });
        return data.response;
    }

    async getChatHistory(
        sessionId: string,
        userId: string
    ): Promise<ChatMessage[]> {
        const data = await this.request<{ history: ChatMessage[] }>(
            `/api/chat/history?sessionId=${sessionId}&userId=${userId}`
        );
        return data.history;
    }

    // Study session endpoints
    async startStudySession(
        topic: string,
        duration: number,
        difficulty: string,
        userId: string
    ): Promise<StudySession> {
        const data = await this.request<{ session: StudySession }>('/api/study/start', {
            method: 'POST',
            body: JSON.stringify({ topic, duration, difficulty, userId }),
        });
        return data.session;
    }

    async getCurrentSession(userId: string): Promise<StudySession | null> {
        const data = await this.request<{ session: StudySession | null }>(
            `/api/study/current?userId=${userId}`
        );
        return data.session;
    }

    async completeStudySession(sessionId: string, userId: string): Promise<void> {
        await this.request('/api/study/complete', {
            method: 'POST',
            body: JSON.stringify({ sessionId, userId }),
        });
    }

    // Quiz endpoints
    async generateQuiz(
        topic: string,
        questionCount: number,
        difficulty: string,
        userId: string
    ): Promise<Quiz> {
        // Note: In production, you'd want to poll for workflow completion
        // For now, we'll simulate with a delay
        await this.request<{ workflowId: string }>('/api/quiz/generate', {
            method: 'POST',
            body: JSON.stringify({ topic, questionCount, difficulty, userId }),
        });
// Wait a bit for workflow to complete (simplified)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Return mock data for now - in production, fetch from workflow result
        return {
            quizId: `quiz_${Date.now()}`,
            questions: this.generateMockQuestions(topic, questionCount),
            totalPoints: questionCount * 10,
        };
    }

    async submitQuiz(
        quizId: string,
        answers: Record<string, string>,
        userId: string
    ): Promise<QuizResult> {
        const data = await this.request<QuizResult>('/api/quiz/submit', {
            method: 'POST',
            body: JSON.stringify({ quizId, answers, userId }),
        });
        return data;
    }

    async getQuizResults(userId: string): Promise<QuizResult[]> {
        const data = await this.request<{ results: QuizResult[] }>(
            `/api/quiz/results?userId=${userId}`
        );
        return data.results;
    }

    // Progress endpoints
    async getProgress(userId: string): Promise<ProgressData> {
        const data = await this.request<{ progress: ProgressData }>(
            `/api/progress?userId=${userId}`
        );
        return data.progress;
    }

    async getTopicProgress(userId: string): Promise<TopicProgress[]> {
        const data = await this.request<{ topics: TopicProgress[] }>(
            `/api/progress/topics?userId=${userId}`
        );
        return data.topics;
    }

    // Helper method to generate mock questions (for demo purposes)
    private generateMockQuestions(topic: string, count: number): Question[] {
        const questions: Question[] = [];

        for (let i = 0; i < count; i++) {
            questions.push({
                id: `q${i + 1}`,
                question: `Question ${i + 1} about ${topic}?`,
                type: i % 3 === 0 ? 'multiple-choice' : i % 3 === 1 ? 'true-false' : 'short-answer',
                options: i % 3 === 0 ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
                correctAnswer: i % 3 === 0 ? 'Option A' : i % 3 === 1 ? 'True' : 'Sample answer',
                explanation: `This is the explanation for question ${i + 1}.`,
                points: 10,
            });
        }

        return questions;
    }
}

export const apiClient = new APIClient(API_URL);