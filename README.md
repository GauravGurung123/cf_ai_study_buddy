# cf_ai_study_buddy

An AI-powered study companion built on Cloudflare infrastructure that helps students learn effectively through intelligent conversations, adaptive quizzes, and progress tracking.

## Features

- 🤖 **AI Chat Interface**: Natural conversations with Llama 3.3 LLM
- 📚 **Study Sessions**: Coordinated workflows for structured learning
- 🧠 **Memory System**: Tracks topics, progress, and learning patterns
- 🎯 **Adaptive Quizzes**: AI-generated questions based on study material
- 📊 **Progress Tracking**: Visual dashboard of learning metrics
- ⏰ **Spaced Repetition**: Smart reminders for review sessions

## Architecture

### Components

1. **LLM Integration** (Workers AI - Llama 3.3)
   - Natural language understanding
   - Content explanation and simplification
   - Quiz question generation
   - Study tips and recommendations

2. **Workflow Coordination** (Cloudflare Workflows)
   - Study session orchestration
   - Quiz generation pipeline
   - Progress calculation
   - Spaced repetition scheduling

3. **State Management** (Durable Objects)
   - User session state
   - Study history persistence
   - Progress metrics
   - Topic mastery levels

4. **Frontend** (Cloudflare Pages)
   - React-based chat interface
   - Real-time messaging
   - Progress visualization
   - Responsive design

## Tech Stack

- **Backend**: Cloudflare Workers
- **LLM**: Workers AI (Llama 3.3 70B)
- **Orchestration**: Cloudflare Workflows
- **State**: Durable Objects
- **Frontend**: React + Cloudflare Pages
- **Styling**: Tailwind CSS

## Project Structure

```
cf_ai_study_buddy/
├── src/
│   ├── index.ts              # Main Worker entry point
│   ├── workflows/
│   │   ├── studySession.ts   # Study session workflow
│   │   └── quizGenerator.ts  # Quiz generation workflow
│   ├── durableObjects/
│   │   └── StudyState.ts     # State management
│   └── llm/
│       └── aiService.ts      # LLM integration
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main React app
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── QuizMode.tsx
│   │   │   └── ProgressDashboard.tsx
│   │   └── api/
│   │       └── client.ts     # API client
│   └── public/
├── wrangler.toml             # Cloudflare configuration
├── package.json
├── README.md                 # This file
└── PROMPTS.md               # AI prompts documentation
```

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Cloudflare account with Workers AI enabled
- Wrangler CLI installed: `npm install -g wrangler`

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd cf_ai_study_buddy
```

2. **Install dependencies**
```bash
npm install
cd frontend && npm install && cd ..
```

3. **Configure Wrangler**
```bash
wrangler login
```

4. **Set up environment variables**
Create `.dev.vars` file:
```
AI_GATEWAY_ID=your-gateway-id
```

5. **Deploy Durable Objects & Workflows**
```bash
wrangler deploy
```

6. **Build frontend**
```bash
cd frontend
npm run build
```

7. **Deploy to Pages**
```bash
wrangler pages deploy frontend/dist
```

## Running Locally

### Backend Development

```bash
# Start Workers dev server
npm run dev

# Or with wrangler directly
wrangler dev
```

The Worker will be available at `http://localhost:8787`

### Frontend Development

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Full Stack Local Testing

Terminal 1:
```bash
wrangler dev
```

Terminal 2:
```bash
cd frontend
VITE_API_URL=http://localhost:8787 npm run dev
```

## API Endpoints

### Chat Endpoints
- `POST /api/chat` - Send message to AI
- `GET /api/chat/history` - Get conversation history

### Study Session Endpoints
- `POST /api/study/start` - Start new study session
- `GET /api/study/current` - Get current session
- `POST /api/study/complete` - Complete session

### Quiz Endpoints
- `POST /api/quiz/generate` - Generate quiz for topic
- `POST /api/quiz/submit` - Submit quiz answers
- `GET /api/quiz/results` - Get quiz history

### Progress Endpoints
- `GET /api/progress` - Get overall progress
- `GET /api/progress/topics` - Get topic mastery levels

## Usage Examples

### Starting a Study Session

```javascript
// POST /api/study/start
{
  "topic": "Quantum Physics",
  "duration": 30,
  "difficulty": "intermediate"
}
```

### Chatting with AI

```javascript
// POST /api/chat
{
  "message": "Explain quantum entanglement",
  "sessionId": "session_123"
}
```

### Generating a Quiz

```javascript
// POST /api/quiz/generate
{
  "topic": "Quantum Physics",
  "questionCount": 5,
  "difficulty": "intermediate"
}
```

## Workflow Details

### Study Session Workflow

1. Initialize session with topic and settings
2. Activate AI tutor for the topic
3. Enable chat interactions
4. Monitor time and engagement
5. Generate summary and recommendations
6. Update progress metrics
7. Schedule spaced repetition

### Quiz Generation Workflow

1. Analyze study session content
2. Identify key concepts
3. Generate questions via LLM
4. Validate question quality
5. Create answer key
6. Store quiz in state
7. Return quiz to user

## Memory & State

The application uses Durable Objects to maintain:

- **User Sessions**: Active conversations and context
- **Study History**: All topics studied with timestamps
- **Progress Metrics**: Mastery levels and learning velocity
- **Quiz Results**: Performance over time
- **Spaced Repetition Queue**: Upcoming review topics

## Deployment

### Production Deployment

1. **Deploy Workers & Workflows**
```bash
wrangler deploy --env production
```

2. **Deploy Frontend**
```bash
cd frontend
npm run build
wrangler pages deploy dist --project-name cf-ai-study-buddy
```

### Environment Configuration

Update `wrangler.toml` for production:
```toml
[env.production]
name = "cf-ai-study-buddy"
vars = { ENVIRONMENT = "production" }
```

## Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Test workflows
npm run test:workflows
```

## Performance Considerations

- **Cold Start**: ~50ms with Workflows
- **LLM Response**: ~2-3s for Llama 3.3
- **State Access**: <10ms with Durable Objects
- **Edge Latency**: <50ms globally

## Security

- Rate limiting on all endpoints
- Input validation and sanitization
- Session-based authentication
- CORS configuration
- No sensitive data in logs

## Future Enhancements

- Voice input/output support
- Multi-language support
- Collaborative study rooms
- Integration with external learning platforms
- Mobile app (React Native)
- Advanced analytics dashboard

## Troubleshooting

### Common Issues

**Issue**: LLM responses are slow
- **Solution**: Check Workers AI quota and consider caching

**Issue**: Durable Objects not persisting
- **Solution**: Verify wrangler.toml configuration

**Issue**: Frontend can't connect to API
- **Solution**: Check CORS settings and API URL

### Debug Mode

Enable debug logging:
```bash
wrangler dev --log-level debug
```

## Contributing

Feedback and suggestions are welcome. For detailed guidelines on how to contribute, please refer to the [CONTRIBUTING.md](./CONTRIBUTING.md) file.

## License

MIT License - see the full text in the [LICENSE.md](./LICENSE.md) file.

---

Built with ❤️ using Cloudflare's edge platform
