import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, Target, Award } from 'lucide-react';
import { apiClient } from '../api/client';

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

interface ProgressDashboardProps {
    userId: string;
}

const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981'];

export default function ProgressDashboard({ userId }: ProgressDashboardProps) {
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProgress();
    }, [userId]);

    const loadProgress = async () => {
        try {
            const data = await apiClient.getProgress(userId);
            setProgress(data);
        } catch (error) {
            console.error('Failed to load progress:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!progress) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">No progress data available</p>
            </div>
        );
    }

    const statCards = [
        {
            title: 'Total Study Time',
            value: `${Math.round(progress.totalStudyTime)} min`,
            icon: Clock,
            color: 'bg-blue-500',
        },
        {
            title: 'Study Sessions',
            value: progress.totalSessions,
            icon: Target,
            color: 'bg-purple-500',
        },
        {
            title: 'Quizzes Taken',
            value: progress.totalQuizzes,
            icon: Award,
            color: 'bg-pink-500',
        },
        {
            title: 'Average Score',
            value: `${Math.round(progress.averageScore)}%`,
            icon: TrendingUp,
            color: 'bg-green-500',
        },
    ];

    const masteryData = progress.topicsStudied
        .sort((a, b) => b.masteryLevel - a.masteryLevel)
        .slice(0, 5)
        .map(topic => ({
            name: topic.topic.length > 20 ? topic.topic.substring(0, 20) + '...' : topic.topic,
            mastery: topic.masteryLevel,
        }));

    const pieData = progress.topicsStudied
        .sort((a, b) => b.timeSpent - a.timeSpent)
        .slice(0, 5)
        .map(topic => ({
            name: topic.topic.length > 15 ? topic.topic.substring(0, 15) + '...' : topic.topic,
            value: Math.round(topic.timeSpent),
        }));

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
                                <div className={`${stat.color} p-2 rounded-lg`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Streak Info */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Study Streak</h3>
                        <p className="text-3xl font-bold">{progress.currentStreak} days</p>
                        <p className="text-sm opacity-90 mt-1">
                            Longest streak: {progress.longestStreak} days
                        </p>
                    </div>
                    <div className="text-6xl">🔥</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mastery Levels */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Topic Mastery Levels</h3>
                    {masteryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={masteryData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Bar dataKey="mastery" fill="#4F46E5" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-300 flex items-center justify-center text-gray-500">
                            <p>No data available yet</p>
                        </div>
                    )}
                </div>

                {/* Time Distribution */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Time Distribution</h3>
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-300 flex items-center justify-center text-gray-500">
                            <p>No data available yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Topics Table */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Topics Overview</h3>
                {progress.topicsStudied.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Topic
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mastery
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Time Spent
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sessions
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quiz Avg
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Studied
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {progress.topicsStudied.map((topic, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {topic.topic}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2" style={{ width: '100px' }}>
                                                <div
                                                    className="bg-indigo-600 h-2 rounded-full"
                                                    style={{ width: `${topic.masteryLevel}%` }}
                                                />
                                            </div>
                                            <span>{topic.masteryLevel}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {Math.round(topic.timeSpent)} min
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {topic.sessionsCount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {topic.quizAverage > 0 ? `${Math.round(topic.quizAverage)}%` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(topic.lastStudied).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">No topics studied yet</p>
                )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                {progress.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                        {progress.recentActivity.slice(0, 10).map((activity, index) => (
                            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-2 h-2 rounded-full ${activity.type === 'session' ? 'bg-blue-500' : 'bg-green-500'}`} />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{activity.topic}</p>
                                        <p className="text-xs text-gray-500">
                                            {activity.type === 'session' ? 'Study Session' : 'Quiz'}
                                            {activity.duration && ` • ${Math.round(activity.duration)} min`}
                                            {activity.score && ` • Score: ${Math.round(activity.score)}%`}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500">
        {new Date(activity.timestamp).toLocaleDateString()}
        </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
            </div>
        </div>
    );
}