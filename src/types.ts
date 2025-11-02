// Environment bindings
export interface Env {
    AI: Ai;
    STUDY_STATE: DurableObjectNamespace;
    STUDY_WORKFLOW: WorkflowBinding;
    QUIZ_WORKFLOW: WorkflowBinding;
    CACHE: KVNamespace;
    ENVIRONMENT: string;
    MAX_SESSION_DURATION: string;
    MAX_QUIZ_QUESTIONS: string;
}

// Workflow binding
export interface WorkflowBinding {
    create(options: { params: any }): Promise<WorkflowInstance>;
    get(id: string): Promise<WorkflowInstance>;
}

export interface WorkflowInstance {
    id: string;
    status(): Promise<WorkflowStatus>;
}

export interface WorkflowStatus {
    status: 'running' | 'completed' | 'failed';
    output?: any;
    error?: string;
}

// Chat types
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface ChatHistory {
    sessionId: string;
    messages: ChatMessage[];
}

export interface ChatHistoryResponse {
    success: boolean;
    data: ChatHistory;
}

// Study session types
export interface StudySession {
    id: string;
    topic: string;
    duration: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    startTime: number;
    endTime?: number;
    status: 'active' | 'completed' | 'paused';
    messagesCount?: number;
    summary?: string;
}

export interface StudySessionParams {
    sessionId: string;
    topic: string;
    duration: number;
    difficulty: string;
    userId: string;
}

// Quiz types
export interface QuizAnswer {
    questionId: string;
    answer: string;
    isCorrect?: boolean;
    pointsEarned?: number;
}

export interface Quiz {
    id: string;
    topic: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    questions: QuizQuestion[];
    createdAt: number;
}

export interface QuizQuestion {
    id: string;
    question: string;
    type: 'multiple-choice' | 'short-answer' | 'true-false';
    options?: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
}

export interface QuizResult {
    quizId: string;
    score: number;
    maxScore: number;
    percentage: number;
    completedAt: number;
    timeSpent: number;
    answers: QuizAnswer[];
}

export interface QuizGenerationParams {
    topic: string;
    questionCount: number;
    difficulty: string;
    userId: string;
}

// Progress types
export interface ProgressData {
    userId: string;
    totalStudyTime: number;
    totalSessions: number;
    totalQuizzes: number;
    averageScore: number;
    currentStreak: number;
    longestStreak: number;
    topicsStudied: TopicProgress[];
    recentActivity: ActivityRecord[];
}

export interface TopicProgress {
    topic: string;
    masteryLevel: number; // 0-100
    timeSpent: number;
    sessionsCount: number;
    quizAverage: number;
    lastStudied: number;
    nextReview?: number;
}

export interface ActivityRecord {
    type: 'session' | 'quiz';
    topic: string;
    timestamp: number;
    duration?: number;
    score?: number;
}

// State management types
export interface UserState {
    userId: string;
    sessions: Record<string, StudySession>;
    chatHistories: Record<string, ChatHistory>;
    quizzes: Record<string, Quiz>;
    quizResults: QuizResult[];
    progress: ProgressData;
    spacedRepetitionQueue: SpacedRepetitionItem[];
}

export interface SpacedRepetitionItem {
    topic: string;
    nextReview: number;
    interval: number; // days
    easeFactor: number;
    repetitions: number;
}

// AI Service types
export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface AIStreamChunk {
    content: string;
    done: boolean;
}