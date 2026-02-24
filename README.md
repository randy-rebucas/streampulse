# StreamPulse

Live streaming platform with AI-powered chat moderation, intelligent chatbot assistant, and automatic stream summaries.

Built with Next.js 16, LiveKit, Vercel AI SDK, NextAuth.js, and Mongoose.

## Features

- **Live Video Streaming** - Broadcast with camera, mic, and screen share via LiveKit WebRTC
- **Real-Time Chat** - Instant messaging through LiveKit data channels with message history
- **AI Chat Moderation** - Every message is screened by OpenAI's Moderation API before broadcast
- **AI Chatbot** - Mention `@bot` in chat to get contextual responses powered by GPT-4o-mini
- **AI Stream Summaries** - Auto-generated summaries with key topics, highlights, and sentiment analysis when a stream ends
- **Authentication** - Sign up / sign in with NextAuth.js (GitHub, Google OAuth, email/password)
- **Creator Dashboard** - Go live, view analytics, and manage stream settings
- **Stream Discovery** - Browse live streams on the home page with viewer counts and tags

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Streaming | LiveKit (WebRTC SFU) |
| Real-Time Chat | LiveKit Data Channels |
| AI | Vercel AI SDK + OpenAI (GPT-4o-mini, Moderation API) |
| Auth | NextAuth.js v5 |
| Database | MongoDB + Mongoose |
| UI | Tailwind CSS 4 + Lucide Icons |
| State | Zustand |

## Project Structure

```
streampulse/
├── app/
│   ├── page.tsx                          # Home page (browse live streams)
│   ├── layout.tsx                        # Root layout (NextAuth + dark theme)
│   ├── (auth)/                           # Sign in / sign up pages
│   ├── (dashboard)/                      # Creator dashboard
│   │   ├── page.tsx                      # Dashboard home
│   │   ├── stream/page.tsx               # Go live page
│   │   ├── analytics/page.tsx            # Stream analytics + AI summaries
│   │   └── settings/page.tsx             # Profile settings
│   ├── watch/[streamId]/page.tsx         # Watch a stream (player + chat)
│   └── api/
│       ├── livekit/token/route.ts        # LiveKit access tokens
│       ├── livekit/webhook/route.ts      # Stream start/end events
│       ├── chat/send/route.ts            # Send message (with AI moderation)
│       ├── chat/history/route.ts         # Chat history for late joiners
│       ├── ai/chatbot/route.ts           # AI chatbot responses
│       ├── ai/summarize/route.ts         # Generate stream summary
│       ├── streams/route.ts              # List / create streams
│       ├── streams/[streamId]/route.ts   # Get stream details
│       └── api/auth/[...nextauth]/route.ts  # NextAuth route handler
│       └── api/auth/register/route.ts    # Email/password registration
├── components/
│   ├── stream/                           # Video player, controls, cards
│   ├── chat/                             # Chat panel, messages, input
│   ├── dashboard/                        # Sidebar, summary cards
│   └── layout/                           # Navbar
├── lib/
│   ├── db.ts                             # Mongoose connection
│   ├── mongoClient.ts                    # MongoClient for NextAuth adapter
│   ├── models/                           # Mongoose models
│   │   ├── user.ts
│   │   ├── stream.ts
│   │   ├── chatMessage.ts
│   │   └── streamSummary.ts
│   ├── livekit.ts                        # Token generation helpers
│   ├── ai/moderate.ts                    # OpenAI moderation
│   ├── ai/chatbot.ts                     # Chatbot logic
│   ├── ai/summarize.ts                   # Summary generation
│   ├── utils.ts                          # Utility functions
│   └── constants.ts                      # App constants
├── stores/
│   └── chat-store.ts                     # Zustand chat state
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- MongoDB database (recommend [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

You will need:

| Service | Where to get keys |
|---|---|
| **NextAuth.js** | [authjs.dev](https://authjs.dev) |
| **LiveKit** | [livekit.io](https://livekit.io) (free Cloud tier or self-host) |
| **MongoDB Atlas** | [mongodb.com/atlas](https://www.mongodb.com/atlas) |
| **OpenAI** | [platform.openai.com](https://platform.openai.com) |

### 3. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage

### As a Streamer

1. Sign in and go to **Dashboard > Go Live**
2. Enter a stream title, description, and tags
3. Click **Go Live** to start broadcasting
4. Share the watch link with your audience
5. End the stream when done - an AI summary will be generated automatically

### As a Viewer

1. Browse live streams on the home page
2. Click a stream to watch
3. Sign in to participate in chat
4. Mention `@bot` to interact with the AI chatbot

### AI Features

- **Moderation**: Messages containing hate speech, harassment, or inappropriate content are automatically blocked
- **Chatbot**: Type `@bot`, `@ai`, or `@streampulse` followed by your question to get an AI response
- **Summaries**: After a stream ends, visit **Dashboard > Analytics** to see AI-generated summaries with key topics, highlights, and sentiment

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Deployment

### Vercel (Recommended for Next.js)

1. Push your code to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add all environment variables in project settings
4. Deploy

**Note**: LiveKit requires a persistent server and cannot run on Vercel's serverless functions. Use [LiveKit Cloud](https://livekit.io) or deploy a LiveKit server on [Fly.io](https://fly.io) / [Railway](https://railway.app).

## Database Schema

Four Mongoose models in `lib/models/`:

- **User** - Synced from NextAuth, stores profile + stream key
- **Stream** - Stream metadata, live status, viewer counts
- **ChatMessage** - All chat messages with moderation flags
- **StreamSummary** - AI-generated summaries linked to streams

No migrations needed — MongoDB creates collections automatically on first write.
