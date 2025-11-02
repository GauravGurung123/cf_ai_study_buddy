# Architecture Documentation

## System Overview

AI Study Buddy is built entirely on Cloudflare's edge platform, utilizing Workers, Durable Objects, Workflows, Workers AI, and Pages for a fully serverless architecture.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                         │
│                   (React Frontend)                           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Worker                           │
│                  (API Gateway)                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Route handling                                    │   │
│  │  • Request validation                                │   │
│  │  • CORS management                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└──┬───────────────┬───────────────┬────────────────┬────────┘
   │               │               │                │
   │ LLM           │ State         │ Orchestration  │ Cache
   ▼               ▼               ▼                ▼
┌──────────┐  ┌──────────┐  ┌────────────┐  ┌───────────┐
│ Workers  │  │ Durable  │  │ Cloudflare │  │    KV     │
│   AI     │  │ Objects  │  │ Workflows  │  │ Namespace │
│(Llama3.3)│  │  (State) │  │  (Jobs)    │  │  (Cache)  │
└──────────┘  └──────────┘  └────────────┘  └───────────┘
```

## Component Details

### 1. Frontend (Cloudflare Pages)

**Technology**: React 18 + TypeScript + Tailwind CSS

**Key Components**:
- `App.tsx`: Main application shell, navigation, session management
- `ChatInterface.tsx`: Real-time chat with AI tutor
- `QuizMode.tsx`: Interactive quiz taking experience
- `ProgressDashboard.tsx`: Visual analytics and progress tracking

**State Management**:
- React hooks (useState, useEffect) for local state
- API client for server communication
- No global state library (kept simple)

**Routing**:
- Tab-based navigation (Chat, Quiz, Progress)
- No complex routing library needed

**Build Output**:
- Static assets served from Cloudflare's edge
- ~200KB gzipped bundle size
- Optimized for <3s load time globally

### 2. API Gateway (Cloudflare Worker)

**File**: `src/index.ts`

**Responsibilities**:
- HTTP request routing
- CORS header management
- Request validation
- Error handling
- Service coordination

**Endpoints**:

```typescript
// Chat
POST   /api/chat
GET    /api/chat/history

// Study Sessions
POST   /api/study/start
GET    /api/study/current
POST   /api/study/complete

// Quizzes
POST   /api/quiz/generate
POST   /api/quiz/submit
GET    /api/quiz/results

// Progress
GET    /api/progress
GET    /api/progress/topics
```

**Performance**:
- <50ms p50 latency (edge-first)
- ~1MB memory footprint
- Handles 50k+ req/s per region

### 3. AI Service (Workers AI)

**File**: `src/llm/aiService.ts`

**Model**: Llama 3.3 70B Instruct (FP8 Fast)

**Use Cases**:

1. **Chat Conversations**
    - Context-aware responses
    - Maintains conversation history
    - Adjusts to difficulty level

2. **Topic Explanations**
    - Structured educational content
    - Adaptive to user level
    - Example-rich explanations

3. **Quiz Generation**
    - Multiple question types
    - Difficulty-appropriate questions
    - Automatic validation

4. **Session Summaries**
    - Key concepts covered
    - Areas of strength/weakness
    - Next steps recommendations

**Prompt Engineering**:
```typescript
// System prompt sets AI persona
const systemPrompt = `You are an encouraging AI tutor...`;

// Context management
const messages = [
  { role: 'system', content: systemPrompt },
  ...history.slice(-10), // Last 10 messages
  { role: 'user', content: userMessage },
];
```

**Token Management**:
- Max tokens: 1024-2048 depending on use case
- Temperature: 0.5-0.8 for balance
- Streaming: Optional for real-time responses

### 4. State Management (Durable Objects)

**File**: `src/durableObjects/StudyState.ts`

**Purpose**: Persistent, strongly consistent state per user

**Data Model**:

```typescript
interface UserState {
  userId: string;
  sessions: Record<string, StudySession>;
  chatHistories: Record<string, ChatHistory>;
  quizzes: Record<string, Quiz>;
  quizResults: QuizResult[];
  progress: ProgressData;
  spacedRepetitionQueue: SpacedRepetitionItem[];
}
```

**Key Features**:

1. **Automatic Persistence**
    - All changes saved to durable storage
    - No manual database management
    - Transactions handled automatically

2. **Consistency Guarantees**
    - Single-threaded execution per user
    - No race conditions
    - Linearizable reads/writes

3. **Geographic Distribution**
    - Migrates close to user
    - <10ms access latency
    - Automatic replication

**Internal API**:
```
POST /chat/history        - Get chat messages
POST /chat/save          - Save new message
POST /session/create     - Create study session
GET  /session/current    - Get active session
POST /session/complete   - Complete session
POST /quiz/save          - Save quiz
POST /quiz/submit        - Submit answers
GET  /quiz/results       - Get results
GET  /progress/overall   - Get all progress
GET  /progress/topics    - Get topic breakdown
```

### 5. Orchestration (Cloudflare Workflows)

#### Study Session Workflow
**File**: `src/workflows/studySession.ts`

**Steps**:

1. **Initialize Session**
    - Create session record
    - Set start time
    - Return session ID

2. **Load Previous Progress**
    - Query Durable Object
    - Get mastery level
    - Retrieve history

3. **Generate Learning Path**
    - Determine approach (intro/review/advanced)
    - Set focus areas
    - Calculate recommended duration

4. **Monitor Duration**
    - Wait for session duration
    - Can be interrupted by user

5. **Generate Summary**
    - Analyze chat history
    - Call AI for summary
    - Highlight key concepts

6. **Update Mastery Level**
    - Calculate progress
    - Apply bonuses
    - Update state

7. **Schedule Spaced Repetition**
    - Calculate next review date
    - Add to queue
    - Set reminder

**Duration**: 15-60 minutes typically
**Retry Logic**: Automatic for failed steps
**Observability**: Full step-by-step logging

#### Quiz Generation Workflow
**File**: `src/workflows/quizGenerator.ts`

**Steps**:

1. **Analyze Content**
    - Load user's study history
    - Get mastery levels
    - Identify weak areas

2. **Identify Key Concepts**
    - Call AI to extract concepts
    - Rank by importance
    - Select for quiz coverage

3. **Generate Questions**
    - Call AI with prompt template
    - Parse JSON response
    - Validate format

4. **Validate Quality**
    - Check question clarity
    - Verify answer correctness
    - Ensure proper structure

5. **Create Answer Key**
    - Extract correct answers
    - Store explanations
    - Map IDs

6. **Store Quiz**
    - Save to Durable Object
    - Generate unique ID
    - Link to user

7. **Return to User**
    - Format response
    - Include metadata
    - Ready for use

**Duration**: 10-30 seconds
**Caching**: 1 hour for similar requests
**Fallback**: Mock questions if AI fails

### 6. Caching (KV Namespace)

**Binding**: `CACHE`

**Use Cases**:

1. **Quiz Question Caching**
    - Key: `quiz:{topic}:{difficulty}:{count}`
    - TTL: 1 hour
    - Reduces AI calls by ~60%

2. **Topic Explanations**
    - Key: `explain:{topic}:{level}`
    - TTL: 24 hours
    - Common topics cached

3. **User Preferences**
    - Key: `prefs:{userId}`
    - TTL: 7 days
    - Fast access

**Performance**:
- <10ms read latency globally
- Eventually consistent
- 1GB storage (free tier)

## Data Flow Examples

### Example 1: Starting a Study Session

```
User Action: Click "Start Learning" with topic="Physics"

1. Frontend → Worker
   POST /api/study/start
   { topic: "Physics", duration: 30, difficulty: "intermediate" }

2. Worker → Durable Object
   POST /session/create
   Creates session record

3. Worker → Workflow
   Triggers StudySessionWorkflow
   Starts background orchestration

4. Worker → Frontend
   Returns { session, workflowId }

5. Workflow (Background)
   - Loads user progress
   - Generates learning path
   - Monitors duration
   - Eventually generates summary

6. User starts chatting
   Frontend → Worker → AI
   Chat messages processed in real-time
```

### Example 2: Taking a Quiz

```
User Action: Generate quiz on "Calculus"

1. Frontend → Worker
   POST /api/quiz/generate
   { topic: "Calculus", questionCount: 10, difficulty: "advanced" }

2. Worker → KV (Check Cache)
   Key: quiz:Calculus:advanced:10
   Result: MISS

3. Worker → Workflow
   Triggers QuizGenerationWorkflow

4. Workflow → AI
   Generates questions with structured prompt

5. Workflow → Durable Object
   Saves quiz with unique ID

6. Worker → KV (Cache)
   Stores for 1 hour

7. Worker → Frontend
   Returns quiz questions

8. User submits answers
   Frontend → Worker → Durable Object
   Calculates score, updates progress

9. Frontend displays results
   Shows score, explanations, recommendations
```

### Example 3: Viewing Progress

```
User Action: Navigate to Progress tab

1. Frontend → Worker
   GET /api/progress?userId=demo-user

2. Worker → Durable Object
   GET /progress/overall

3. Durable Object
   - Calculates aggregates
   - Formats response
   - Returns complete progress data

4. Worker → Frontend
   Returns {
     totalStudyTime,
     topicsStudied,
     recentActivity,
     etc.
   }

5. Frontend
   - Renders charts with Recharts
   - Displays statistics
   - Shows activity timeline
```

## Security Architecture

### Authentication (Simplified for Demo)
- User ID passed in requests
- Production would use JWT tokens
- Cloudflare Access for admin

### Rate Limiting
```typescript
// Per-user limits via Durable Objects
const limiter = await env.RATE_LIMITER.get(id);
await limiter.check(userId);
```

### Input Validation
```typescript
// All inputs sanitized
const sanitized = sanitizeInput(userMessage);
// Length limits enforced
if (message.length > 10000) throw new Error();
```

### CORS Configuration
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## Scalability

### Horizontal Scaling
- Workers: Automatic, unlimited
- Durable Objects: Per-user isolation
- Workflows: Distributed execution
- KV: Global replication

### Performance Characteristics

| Component | Cold Start | Warm Latency | Throughput |
|-----------|-----------|--------------|------------|
| Worker | <50ms | <5ms | 50k req/s |
| Durable Object | ~100ms | <10ms | 1k req/s/instance |
| Workflow | ~200ms | N/A | 1k/s |
| Workers AI | ~2s | ~1-2s | Limited by quota |
| KV Read | N/A | <10ms | 100k/s |

### Cost Projections

**Free Tier**:
- 100k Worker requests/day
- Workers AI limited tokens
- 1M DO reads, writes/day
- 100k KV reads/day

**Paid Tier (1k users)**:
- Workers: ~$5/month
- Durable Objects: ~$10/month
- Workers AI: ~$50/month
- KV: ~$0.50/month
- **Total: ~$65/month**

## Monitoring & Observability

### Built-in Metrics
- Request count
- Error rate
- CPU time
- Duration percentiles

### Custom Logging
```typescript
console.log('Chat message', {
  userId,
  sessionId,
  messageLength: message.length,
  aiResponseTime: duration,
});
```

### Tracing
```typescript
// Workflow steps automatically traced
await step.do('step-name', async () => {
  // Logic here
});
```

## Deployment Architecture

### Environments

1. **Development**
    - Local wrangler dev
    - Preview KV namespace
    - Workers AI sandbox

2. **Staging** (Optional)
    - Separate Worker
    - Test data
    - Full integration tests

3. **Production**
    - Production Worker
    - Production KV
    - Production DO instances
    - Custom domain

### CI/CD Pipeline

```yaml
main branch
  ↓
GitHub Actions
  ↓
├─ Run tests
├─ Build frontend
├─ Deploy Worker
└─ Deploy Pages
  ↓
Production
```

## Future Enhancements

### Planned Features
1. **Voice Input/Output**
    - Speech-to-text
    - Text-to-speech
    - Real-time conversation

2. **Collaborative Study**
    - Multi-user sessions
    - Shared whiteboards
    - Group quizzes

3. **Advanced Analytics**
    - Learning velocity
    - Concept graphs
    - Predictive insights

4. **Mobile App**
    - React Native
    - Offline mode
    - Push notifications

### Scalability Improvements
1. **Response Streaming**
    - SSE for real-time AI
    - Partial content rendering
    - Better UX

2. **Advanced Caching**
    - Predictive prefetch
    - Smart invalidation
    - Multi-tier strategy

3. **Load Balancing**
    - Geographic routing
    - Capacity-based
    - Fallback regions

## Troubleshooting

### Common Issues

**High AI Latency**
- Cache common responses
- Use smaller model for simple queries
- Implement request queuing

**DO State Loss**
- Ensure proper error handling
- Use transactions
- Implement backup strategy

**Workflow Timeouts**
- Break into smaller steps
- Add retry logic
- Implement checkpointing

## References

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Workflows Documentation](https://developers.cloudflare.com/workflows/)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)