import { useState } from 'react';
import { Trophy, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';

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

interface QuizModeProps {
    userId: string;
}

export default function QuizMode({ userId }: QuizModeProps) {
    const [stage, setStage] = useState<'setup' | 'taking' | 'results'>('setup');
    const [topic, setTopic] = useState('');
    const [questionCount, setQuestionCount] = useState(5);
    const [difficulty, setDifficulty] = useState('intermediate');
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [result, setResult] = useState<QuizResult | null>(null);
    const [quizId, setQuizId] = useState('');

    const generateQuiz = async () => {
        if (!topic.trim()) return;

        setLoading(true);
        try {
            const quiz = await apiClient.generateQuiz(topic, questionCount, difficulty, userId);
            setQuestions(quiz.questions);
            setQuizId(quiz.quizId);
            setStage('taking');
        } catch (error) {
            console.error('Failed to generate quiz:', error);
            alert('Failed to generate quiz. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const submitAnswer = (answer: string) => {
        setAnswers(prev => ({
            ...prev,
            [questions[currentQuestion].id]: answer,
        }));

        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const submitQuiz = async () => {
        setLoading(true);
        try {
            const quizResult = await apiClient.submitQuiz(quizId, answers, userId);
            setResult(quizResult);
            setStage('results');
        } catch (error) {
            console.error('Failed to submit quiz:', error);
            alert('Failed to submit quiz. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetQuiz = () => {
        setStage('setup');
        setTopic('');
        setQuestions([]);
        setCurrentQuestion(0);
        setAnswers({});
        setResult(null);
        setQuizId('');
    };

    if (stage === 'setup') {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="flex items-center space-x-3 mb-6">
                        <Trophy className="w-8 h-8 text-indigo-600" />
                        <h2 className="text-3xl font-bold text-gray-900">Generate Quiz</h2>
                    </div>

                    <p className="text-gray-600 mb-8">
                        Test your knowledge with AI-generated questions
                    </p>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quiz Topic
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g., World War II, Calculus, JavaScript..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Number of Questions
                            </label>
                            <select
                                value={questionCount}
                                onChange={(e) => setQuestionCount(Number(e.target.value))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value={5}>5 questions</option>
                                <option value={10}>10 questions</option>
                                <option value={15}>15 questions</option>
                                <option value={20}>20 questions</option>
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
                            onClick={generateQuiz}
                            disabled={!topic.trim() || loading}
                            className="w-full px-6 py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Generating Quiz...</span>
                                </>
                            ) : (
                                <span>Generate Quiz</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (stage === 'taking') {
        const question = questions[currentQuestion];
        const progress = ((currentQuestion + 1) / questions.length) * 100;

        return (
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Question {currentQuestion + 1} of {questions.length}</span>
                            <span>{Math.round(progress)}% Complete</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-indigo-600 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Question */}
                    <div className="mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                            {question.question}
                        </h3>
                        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
              {question.points} points
            </span>
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-3">
                        {question.type === 'multiple-choice' && question.options ? (
                            question.options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => submitAnswer(option)}
                                    className="w-full px-6 py-4 text-left border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-colors"
                                >
                                    <span className="font-medium">{option}</span>
                                </button>
                            ))
                        ) : question.type === 'true-false' ? (
                            <>
                                <button
                                    onClick={() => submitAnswer('True')}
                                    className="w-full px-6 py-4 text-left border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-colors"
                                >
                                    <span className="font-medium">True</span>
                                </button>
                                <button
                                    onClick={() => submitAnswer('False')}
                                    className="w-full px-6 py-4 text-left border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-colors"
                                >
                                    <span className="font-medium">False</span>
                                </button>
                            </>
                        ) : (
                            <div>
                <textarea
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={4}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            submitAnswer(e.currentTarget.value);
                        }
                    }}
                />
                                <button
                                    onClick={(e) => {
                                        const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                                        submitAnswer(textarea.value);
                                    }}
                                    className="mt-3 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Submit Answer
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Submit Quiz Button */}
                    {currentQuestion === questions.length - 1 && answers[question.id] && (
                        <button
                            onClick={submitQuiz}
                            disabled={loading}
                            className="mt-8 w-full px-6 py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <span>Submit Quiz</span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (stage === 'results' && result) {
        const passed = result.percentage >= 70;

        return (
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    {/* Results Header */}
                    <div className="text-center mb-8">
                        {passed ? (
                            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                        ) : (
                            <XCircle className="w-20 h-20 text-orange-500 mx-auto mb-4" />
                        )}
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            {passed ? 'Great Job!' : 'Keep Practicing!'}
                        </h2>
                        <p className="text-gray-600">
                            You scored {result.score} out of {result.maxScore} points
                        </p>
                    </div>

                    {/* Score Display */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 mb-8">
                        <div className="text-center">
                            <div className="text-6xl font-bold text-indigo-600 mb-2">
                                {Math.round(result.percentage)}%
                            </div>
                            <div className="text-gray-600">Final Score</div>
                        </div>
                    </div>

                    {/* Question Review */}
                    <div className="space-y-4 mb-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Review</h3>
                        {questions.map((q, _) => {
                            const userAnswer = result.answers[q.id];
                            const isCorrect = userAnswer?.toLowerCase() === q.correctAnswer.toLowerCase();

                            return (
                                <div
                                    key={q.id}
                                    className={`p-4 rounded-lg border-2 ${
                                        isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                                    }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        {isCorrect ? (
                                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                                        ) : (
                                            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 mb-2">{q.question}</p>
                                            <p className="text-sm text-gray-700">
                                                <span className="font-medium">Your answer:</span> {userAnswer || 'No answer'}
                                            </p>
                                            {!isCorrect && (
                                                <p className="text-sm text-gray-700 mt-1">
                                                    <span className="font-medium">Correct answer:</span> {q.correctAnswer}
                                                </p>
                                            )}
                                            <p className="text-sm text-gray-600 mt-2 italic">{q.explanation}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-4">
                        <button
                            onClick={resetQuiz}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Take Another Quiz
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}