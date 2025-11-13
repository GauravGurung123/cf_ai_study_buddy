import { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import QuizMode from './components/QuizMode';
import ProgressDashboard from './components/ProgressDashboard';
import { MessageSquare, Trophy, BarChart3, Plus, Menu } from 'lucide-react';
import { apiClient } from './api/client';

type View = 'chat' | 'quiz' | 'progress';

interface Session {
    id: string;
    topic: string;
    duration: number;
    difficulty: string;
    startTime: number;
    status: string;
}

function App() {
    const [view, setView] = useState<View>('chat');
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [userId] = useState('demo-user');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        loadCurrentSession();
    }, []);

    const loadCurrentSession = async () => {
        try {
            const session = await apiClient.getCurrentSession(userId);
            setCurrentSession(session);
        } catch (error) {
            console.error('Failed to load session:', error);
        }
    };

    const startNewSession = async (topic: string, duration: number, difficulty: string) => {
        try {
            const session = await apiClient.startStudySession(topic, duration, difficulty, userId);
            setCurrentSession(session);
            setView('chat');
        } catch (error) {
            console.error('Failed to start session:', error);
            alert('Failed to start study session');
        }
    };

    const completeSession = async () => {
        if (!currentSession) return;
        try {
            await apiClient.completeStudySession(currentSession.id, userId);
            setCurrentSession(null);
        } catch (error) {
            console.error('Failed to complete session:', error);
        }
    };

    return (
        <div className="flex h-screen bg-white dark:bg-gray-900">
            {/* Sidebar - ChatGPT style */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-950 text-white flex flex-col overflow-hidden`}>
                <div className="p-3 border-b border-gray-800">
                    <button
                        onClick={() => {
                            setCurrentSession(null);
                            setView('chat');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">New study session</span>
                    </button>
                </div>

                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    <button
                        onClick={() => setView('chat')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            view === 'chat' ? 'bg-gray-800' : 'hover:bg-gray-800'
                        }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm">Study Chat</span>
                    </button>
                    <button
                        onClick={() => setView('quiz')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            view === 'quiz' ? 'bg-gray-800' : 'hover:bg-gray-800'
                        }`}
                    >
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm">Take Quiz</span>
                    </button>
                    <button
                        onClick={() => setView('progress')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            view === 'progress' ? 'bg-gray-800' : 'hover:bg-gray-800'
                        }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-sm">My Progress</span>
                    </button>
                </nav>

                {currentSession && (
                    <div className="p-3 border-t border-gray-800">
                        <div className="text-xs text-gray-400 mb-2">Current Session</div>
                        <div className="text-sm font-medium mb-1">{currentSession.topic}</div>
                        <div className="text-xs text-gray-400 mb-3">{currentSession.duration} minutes</div>
                        <button
                            onClick={completeSession}
                            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            Complete Session
                        </button>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Top bar */}
                <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {currentSession ? currentSession.topic : 'AI Study Buddy'}
                    </h1>
                </header>

                {/* Content area */}
                <main className="flex-1 overflow-hidden">
                    {!currentSession && view === 'chat' ? (
                        <WelcomeScreen onStart={startNewSession} />
                    ) : view === 'chat' && currentSession ? (
                        <ChatInterface sessionId={currentSession.id} userId={userId} />
                    ) : view === 'quiz' ? (
                        <QuizMode userId={userId} />
                    ) : (
                        <ProgressDashboard userId={userId} />
                    )}
                </main>
            </div>
        </div>
    );
}

function WelcomeScreen({ onStart }: { onStart: (topic: string, duration: number, difficulty: string) => void }) {
    const [topic, setTopic] = useState('');
    const [duration, setDuration] = useState(30);
    const [difficulty, setDifficulty] = useState('intermediate');
    const [showForm, setShowForm] = useState(false);

    const quickTopics = [
        'JavaScript Fundamentals',
        'Python Programming',
        'Machine Learning Basics',
        'React Development',
        'Data Structures',
        'Web Development',
    ];

    const handleQuickStart = (quickTopic: string) => {
        onStart(quickTopic, 30, 'intermediate');
    };

    const handleCustomStart = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic.trim()) {
            onStart(topic, duration, difficulty);
        }
    };

    if (showForm) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                    <button
                        onClick={() => setShowForm(false)}
                        className="mb-6 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                        ← Back
                    </button>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                            Start a new study session
                        </h2>

                        <form onSubmit={handleCustomStart} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    What would you like to study?
                                </label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., Quantum Physics, Spanish Grammar, Calculus..."
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Duration
                                    </label>
                                    <select
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={15}>15 minutes</option>
                                        <option value={30}>30 minutes</option>
                                        <option value={45}>45 minutes</option>
                                        <option value={60}>60 minutes</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Level
                                    </label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                            >
                                Start Session
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex items-center justify-center p-4">
            <div className="w-full max-w-3xl text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                    AI Study Buddy
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
                    Your personal AI tutor powered by Llama 3.3
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                    {quickTopics.map((quickTopic) => (
                        <button
                            key={quickTopic}
                            onClick={() => handleQuickStart(quickTopic)}
                            className="px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
                        >
                            <div className="font-medium text-gray-900 dark:text-white">{quickTopic}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                30 min • Intermediate
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Custom study session
                </button>

                <div className="mt-12 text-sm text-gray-500 dark:text-gray-400">
                    Chat with AI • Generate quizzes • Track your progress
                </div>
            </div>
        </div>
    );
}

export default App;