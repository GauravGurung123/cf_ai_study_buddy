import { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import QuizMode from './components/QuizMode';
import ProgressDashboard from './components/ProgressDashboard';
import { BookOpen, MessageSquare, Trophy, BarChart3 } from 'lucide-react';
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

    useEffect(() => {
        // Load current session on mount
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
            alert('Study session completed! Great work!');
        } catch (error) {
            console.error('Failed to complete session:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-3">
                            <BookOpen className="w-8 h-8 text-indigo-600" />
                            <h1 className="text-2xl font-bold text-gray-900">AI Study Buddy</h1>
                        </div>

                        {currentSession && (
                            <div className="flex items-center space-x-4">
                                <div className="text-sm text-gray-600">
                                    <span className="font-medium">{currentSession.topic}</span>
                                    <span className="mx-2">•</span>
                                    <span>{currentSession.duration} min</span>
                                </div>
                                <button
                                    onClick={completeSession}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    Complete Session
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setView('chat')}
                            className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                                view === 'chat'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <MessageSquare className="w-5 h-5" />
                            <span className="font-medium">Chat</span>
                        </button>

                        <button
                            onClick={() => setView('quiz')}
                            className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                                view === 'quiz'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Trophy className="w-5 h-5" />
                            <span className="font-medium">Quiz</span>
                        </button>

                        <button
                            onClick={() => setView('progress')}
                            className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                                view === 'progress'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <BarChart3 className="w-5 h-5" />
                            <span className="font-medium">Progress</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!currentSession && view === 'chat' ? (
                    <SessionSetup onStart={startNewSession} />
                ) : view === 'chat' && currentSession ? (
                    <ChatInterface sessionId={currentSession.id} userId={userId} />
                ) : view === 'quiz' ? (
                    <QuizMode userId={userId} />
                ) : (
                    <ProgressDashboard userId={userId} />
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-500">
                        Built with Cloudflare Workers AI • Powered by Llama 3.3
                    </p>
                </div>
            </footer>
        </div>
    );
}

function SessionSetup({ onStart }: { onStart: (topic: string, duration: number, difficulty: string) => void }) {
    const [topic, setTopic] = useState('');
    const [duration, setDuration] = useState(30);
    const [difficulty, setDifficulty] = useState('intermediate');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic.trim()) {
            onStart(topic, duration, difficulty);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Start a Study Session</h2>
                <p className="text-gray-600 mb-8">
                    Choose a topic and let's learn together with AI assistance
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                            What do you want to study?
                        </label>
                        <input
                            type="text"
                            id="topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Quantum Physics, React Hooks, Spanish Grammar..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                            Duration (minutes)
                        </label>
                        <select
                            id="duration"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>60 minutes</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Difficulty Level
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {['beginner', 'intermediate', 'advanced'].map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setDifficulty(level)}
                                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                                        difficulty === level
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                >
                                    <span className="capitalize font-medium">{level}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full px-6 py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                        Start Learning
                    </button>
                </form>
            </div>
        </div>
    );
}

export default App;