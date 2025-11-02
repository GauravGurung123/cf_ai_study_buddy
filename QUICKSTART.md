# Quick Start Guide

Get cf_ai_study_buddy running in 10 minutes.

## Prerequisites Check

```bash
# Verify Node.js (need 18+)
node --version

# Verify npm
npm --version

# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

## Setup (5 minutes)

### 1. Install Dependencies

```bash
# Backend
npm install

# Frontend
npm install
```

### 2. Create KV Namespace

```bash
# Production KV
wrangler kv:namespace create "CACHE"

# Development KV
wrangler kv:namespace create "CACHE" --preview

wrangler kv namespace list

#Quick sanity check:
wrangler kv key put --binding=cf_ai_study_buddy_CACHE_dev hello world
wrangler kv key get --binding=cf_ai_study_buddy_CACHE_dev hello 
```

Copy the IDs to `wrangler.toml`.

### 3. Configure Environment

Create `.dev.vars`:
```
ENVIRONMENT=development
```

Create `frontend/.env.local`:
```
VITE_API_URL=http://localhost:8787
```

## Run Locally (2 minutes)

### Terminal 1: Backend

```bash
npm run dev
# or
wrangler dev
```

Access at http://localhost:8787

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Access at http://localhost:5173

## Test the Application

1. **Start a Study Session**
    - Enter topic: "JavaScript"
    - Duration: 30 minutes
    - Difficulty: Intermediate
    - Click "Start Learning"

2. **Chat with AI**
    - Ask: "What are closures in JavaScript?"
    - See AI tutor explain
    - Ask follow-up questions

3. **Generate Quiz**
    - Switch to Quiz tab
    - Topic: "JavaScript"
    - 5 questions
    - Take the quiz

4. **View Progress**
    - Switch to Progress tab
    - See stats and charts
    - Check topic mastery

## Deploy to Production (3 minutes)

### 1. Deploy Backend

```bash
wrangler deploy
```

Note the Worker URL (e.g., `https://cf-ai-study-buddy.your-subdomain.workers.dev`)

### 2. Update Frontend Config

Create `frontend/.env.production`:
```
VITE_API_URL=https://cf-ai-study-buddy.your-subdomain.workers.dev
```

### 3. Build and Deploy Frontend

```bash
cd frontend
npm run build
wrangler pages deploy dist --project-name cf-ai-study-buddy
```

Note the Pages URL (e.g., `https://cf-ai-study-buddy.pages.dev`)

## Verify Deployment

```bash
# Test backend
curl https://cf-ai-study-buddy.your-subdomain.workers.dev/health

# Visit frontend
open https://cf-ai-study-buddy.pages.dev
```

## Common Commands

```bash
# Development
npm run dev              # Start backend dev server
cd frontend && npm run dev  # Start frontend dev server

# Deployment
wrangler deploy          # Deploy backend
wrangler pages deploy frontend/dist  # Deploy frontend

# Monitoring
wrangler tail            # View real-time logs
wrangler deployments list  # List deployments

# Testing
npm test                 # Run tests
npm run type-check       # Check TypeScript
```

## Project Structure Quick Reference

```
cf_ai_study_buddy/
├── src/
│   ├── index.ts                  # Main Worker (API gateway)
│   ├── types.ts                  # TypeScript types
│   ├── llm/
│   │   └── aiService.ts          # AI integration
│   ├── durableObjects/
│   │   └── StudyState.ts         # State management
│   └── workflows/
│       ├── studySession.ts       # Study orchestration
│       └── quizGenerator.ts      # Quiz generation
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main React app
│   │   ├── components/           # React components
│   │   └── api/
│   │       └── client.ts         # API client
│   └── public/
├── wrangler.toml                 # Cloudflare config
├── package.json                  # Backend dependencies
├── README.md                     # Main documentation
├── PROMPTS.md                    # AI prompts used
├── DEPLOYMENT.md                 # Deployment guide
└── ARCHITECTURE.md               # Architecture docs
```

## Key Features Demo

### 1. AI Chat Tutor
- Natural language conversations
- Context-aware responses
- Explains complex topics
- Adaptive to skill level

### 2. Study Sessions
- Timed learning sessions
- Progress tracking
- Session summaries
- Spaced repetition

### 3. AI-Generated Quizzes
- Multiple question types
- Difficulty levels
- Instant feedback
- Detailed explanations

### 4. Progress Dashboard
- Study time tracking
- Topic mastery levels
- Quiz performance
- Visual charts

## Troubleshooting

### Backend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
wrangler dev
```

### Frontend can't connect to backend
- Check `VITE_API_URL` in `.env.local`
- Verify backend is running
- Check CORS settings

### AI responses failing
- Verify Workers AI is enabled in Cloudflare dashboard
- Check account has AI credits
- Review wrangler logs: `wrangler tail`

### Durable Objects error
```bash
# Force redeploy with migrations
wrangler deploy --force
```

## Next Steps

After getting it running:

1. **Read the docs**
    - [README.md](./README.md) - Full documentation
    - [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
    - [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment

2. **Customize**
    - Modify AI prompts in `src/llm/aiService.ts`
    - Update UI in `frontend/src/components/`
    - Add new features

3. **Deploy to production**
    - Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
    - Set up custom domain
    - Configure monitoring

4. **Monitor**
    - Watch logs: `wrangler tail`
    - Check analytics in Cloudflare dashboard
    - Review error rates

## Support

- **Documentation**: Check README.md first
- **Cloudflare Docs**: https://developers.cloudflare.com
- **Issues**: Review common troubleshooting section
- **Community**: Cloudflare Discord

## What's Built With

- **Backend**: Cloudflare Workers + Durable Objects
- **AI**: Workers AI (Llama 3.3 70B)
- **Orchestration**: Cloudflare Workflows
- **Frontend**: React + TypeScript + Tailwind CSS
- **Hosting**: Cloudflare Pages
- **Caching**: KV Namespace

## Performance Expectations

- **Cold Start**: <50ms (Worker), ~100ms (Durable Object)
- **API Latency**: <10ms (excluding AI)
- **AI Response**: 1-3 seconds
- **Global Latency**: <100ms (from edge)

## Limits (Free Tier)

- 100k Worker requests/day
- Limited Workers AI tokens
- 1M Durable Object operations/day
- 100k KV reads/day

Plenty for development and testing!

---

**You're ready to go! 🚀**

Start with `npm run dev` and explore the application.