import { Env, StudySession, ChatMessage, Quiz, ProgressData } from './types';
import { AIService } from './llm/aiService';
import { StudyState } from './durableObjects/StudyState';
import { StudySessionWorkflow } from './workflows/studySession';
import { QuizGenerationWorkflow } from './workflows/quizGenerator';

export { StudyState, StudySessionWorkflow, QuizGenerationWorkflow };

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            // Initialize services
            const aiService = new AIService(env.AI);

            // Route handling
            if (path.startsWith('/api/chat')) {
                return await handleChat(request, env, aiService, corsHeaders);
            } else if (path.startsWith('/api/study')) {
                return await handleStudy(request, env, aiService, corsHeaders, ctx);
            } else if (path.startsWith('/api/quiz')) {
                return await handleQuiz(request, env, aiService, corsHeaders, ctx);
            } else if (path.startsWith('/api/progress')) {
                return await handleProgress(request, env, corsHeaders);
            } else if (path === '/' || path === '/health') {
                return new Response(JSON.stringify({ status: 'healthy', service: 'AI Study Buddy' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            return new Response('Not Found', { status: 404, headers: corsHeaders });
        } catch (error) {
            console.error('Worker error:', error);
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    },
};

async function handleChat(
    request: Request,
    env: Env,
    aiService: AIService,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/chat') {
        const body = await request.json() as { message: string; sessionId: string; userId?: string };
        const { message, sessionId, userId = 'default-user' } = body;

        // Validate input
        if (!message || message.trim().length === 0) {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (message.length > 10000) {
            return new Response(JSON.stringify({ error: 'Message too long' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Get Durable Object for this user
        const id = env.STUDY_STATE.idFromName(userId);
        const stub = env.STUDY_STATE.get(id);

        // Get conversation history
        const history = await stub.fetch('http://internal/chat/history', {
            method: 'POST',
            body: JSON.stringify({ sessionId }),
        }).then(r => r.json()) as ChatMessage[];

        // Generate AI response
        const response = await aiService.chat(message, history);

        // Save message to history
        await stub.fetch('http://internal/chat/save', {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
                userMessage: message,
                aiResponse: response,
            }),
        });

        return new Response(JSON.stringify({ response, sessionId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (request.method === 'GET' && url.pathname === '/api/chat/history') {
        const sessionId = url.searchParams.get('sessionId');
        const userId = url.searchParams.get('userId') || 'default-user';

        if (!sessionId) {
            return new Response(JSON.stringify({ error: 'sessionId required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const id = env.STUDY_STATE.idFromName(userId);
        const stub = env.STUDY_STATE.get(id);

        const history = await stub.fetch('http://internal/chat/history', {
            method: 'POST',
            body: JSON.stringify({ sessionId }),
        }).then(r => r.json());

        return new Response(JSON.stringify({ history }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

async function handleStudy(
    request: Request,
    env: Env,
    aiService: AIService,
    corsHeaders: Record<string, string>,
    ctx: ExecutionContext
): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/study/start') {
        const body = await request.json() as { topic: string; duration: number; difficulty: string; userId?: string };
        const { topic, duration, difficulty, userId = 'default-user' } = body;

        // Validate input
        if (!topic || topic.trim().length === 0) {
            return new Response(JSON.stringify({ error: 'Topic is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (duration < 5 || duration > 120) {
            return new Response(JSON.stringify({ error: 'Duration must be between 5 and 120 minutes' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const validDifficulties = ['beginner', 'intermediate', 'advanced'];
        if (!validDifficulties.includes(difficulty)) {
            return new Response(JSON.stringify({ error: 'Invalid difficulty level' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Create session ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Get Durable Object
        const id = env.STUDY_STATE.idFromName(userId);
        const stub = env.STUDY_STATE.get(id);

        // Create session in state
        const session: StudySession = {
            id: sessionId,
            topic,
            duration,
            difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
            startTime: Date.now(),
            status: 'active',
        };

        await stub.fetch('http://internal/session/create', {
            method: 'POST',
            body: JSON.stringify(session),
        });

        // Start workflow
        try {
            const workflow = await env.STUDY_WORKFLOW.create({
                params: { sessionId, topic, duration, difficulty, userId },
            });

            return new Response(JSON.stringify({ session, workflowId: workflow.id }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } catch (error) {
            console.error('Failed to start workflow:', error);
            // Return session even if workflow fails
            return new Response(JSON.stringify({ session, workflowId: null }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    }

    if (request.method === 'GET' && url.pathname === '/api/study/current') {
        const userId = url.searchParams.get('userId') || 'default-user';

        const id = env.STUDY_STATE.idFromName(userId);
        const stub = env.STUDY_STATE.get(id);

        const session = await stub.fetch('http://internal/session/current').then(r => r.json());

        return new Response(JSON.stringify({ session }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (request.method === 'POST' && url.pathname === '/api/study/complete') {
        const body = await request.json() as { sessionId: string; userId?: string };
        const { sessionId, userId = 'default-user' } = body;

        if (!sessionId) {
            return new Response(JSON.stringify({ error: 'sessionId required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const id = env.STUDY_STATE.idFromName(userId);
        const stub = env.STUDY_STATE.get(id);

        await stub.fetch('http://internal/session/complete', {
            method: 'POST',
            body: JSON.stringify({ sessionId }),
        });

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

async function handleQuiz(
    request: Request,
    env: Env,
    aiService: AIService,
    corsHeaders: Record<string, string>,
    ctx: ExecutionContext
): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/quiz/generate') {
        const body = await request.json() as { topic: string; questionCount: number; difficulty: string; userId?: string };
        const { topic, questionCount, difficulty, userId = 'default-user' } = body;

        // Validate input
        if (!topic || topic.trim().length === 0) {
            return new Response(JSON.stringify({ error: 'Topic is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (questionCount < 1 || questionCount > 20) {
            return new Response(JSON.stringify({ error: 'Question count must be between 1 and 20' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const validDifficulties = ['beginner', 'intermediate', 'advanced'];
        if (!validDifficulties.includes(difficulty)) {
            return new Response(JSON.stringify({ error: 'Invalid difficulty level' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Start quiz generation workflow
        try {
            const workflow = await env.QUIZ_WORKFLOW.create({
                params: { topic, questionCount, difficulty, userId },
            });

            // In a real implementation, you would poll for workflow completion
            // For now, return the workflow ID
            return new Response(JSON.stringify({
                workflowId: workflow.id,
                message: 'Quiz generation started'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } catch (error) {
            console.error('Failed to start quiz workflow:', error);

            // Fallback: generate quiz directly
            const questions = await aiService.generateQuiz(topic, questionCount, difficulty);
            const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const id = env.STUDY_STATE.idFromName(userId);
            const stub = env.STUDY_STATE.get(id);

            const quiz: Quiz = {
                id: quizId,
                topic,
                difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
                questions,
                createdAt: Date.now(),
            };

            await stub.fetch('http://internal/quiz/save', {
                method: 'POST',
                body: JSON.stringify(quiz),
            });

            return new Response(JSON.stringify({
                quizId,
                questions,
                totalPoints: questions.reduce((sum, q) => sum + q.points, 0)
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    }

    if (request.method === 'POST' && url.pathname === '/api/quiz/submit') {
        const body = await request.json() as { quizId: string; answers: Record<string, string>; userId?: string };
        const { quizId, answers, userId = 'default-user' } = body;

        if (!quizId || !answers) {
            return new Response(JSON.stringify({ error: 'quizId and answers required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const id = env.STUDY_STATE.idFromName(userId);
        const stub = env.STUDY_STATE.get(id);

        const result = await stub.fetch('http://internal/quiz/submit', {
            method: 'POST',
            body: JSON.stringify({ quizId, answers }),
        }).then(r => r.json());

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (request.method === 'GET' && url.pathname === '/api/quiz/results') {
        const userId = url.searchParams.get('userId') || 'default-user';

        const id = env.STUDY_STATE.idFromName(userId);
        const stub = env.STUDY_STATE.get(id);

        const results = await stub.fetch('http://internal/quiz/results').then(r => r.json());

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

async function handleProgress(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/progress') {
        const userId = url.searchParams.get('userId') || 'default-user';

        const id = env.STUDY_STATE.idFromName(userId);
        const stub = env.STUDY_STATE.get(id);

        const progress = await stub.fetch('http://internal/progress/overall').then(r => r.json());

        return new Response(JSON.stringify({ progress }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (request.method === 'GET' && url.pathname === '/api/progress/topics') {
        const userId = url.searchParams.get('userId') || 'default-user';

        const id = env.STUDY_STATE.idFromName(userId);
        const stub = env.STUDY_STATE.get(id);

        const topics = await stub.fetch('http://internal/progress/topics').then(r => r.json());

        return new Response(JSON.stringify({ topics }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}