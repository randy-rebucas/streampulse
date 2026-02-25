# StreamPulse

Full-featured live streaming platform with AI-powered chat, watch parties, polls, follower system, and automatic stream summaries.

Built with Next.js, LiveKit, Vercel AI SDK, NextAuth.js v5, and MongoDB/Mongoose.

## Features

### Streaming
- **Live Video Broadcasting** — Camera, mic, and screen share via LiveKit WebRTC
- **OBS/RTMP Support** — Stream key management; copy the ingest URL directly from the dashboard
- **OBS Chat Overlay** — Transparent browser source at `/stream-overlay/[streamId]` with slide-in animations and AI message badges
- **Guest Co-Streaming** — Invite a collaborator with a one-time guest token; they get mic/camera controls in the viewer
- **Stream Recording** — Start/stop cloud egress recordings from the stream dashboard
- **Scheduled Streams** — Set a go-live date and time; upcoming streams appear on your public profile
- **Stream Discovery** — Browse and filter live streams on the home page with viewer counts and tags

### Chat
- **Real-Time Messaging** — Instant delivery via LiveKit data channels with full message history for late joiners
- **AI Moderation** — Every message screened by OpenAI Moderation API; flagged content is blocked before broadcast
- **AI Chatbot** — Mention `@bot`, `@ai`, or `@streampulse` in chat for contextual GPT-4o-mini responses
- **Reactions** — Emoji burst animations floating over the video (❤️ 🔥 😂 👏 😮 🎉)
- **Polls** — Streamers can create live polls with up to 6 options; viewers vote in real time
- **Pinned Messages** — Streamer can pin a message that stays visible at the top of chat
- **Slow Mode** — Configurable per-user message cooldown
- **Moderation Commands** — `/ban`, `/timeout`, `/unban`, `/pin`, `/unpin`, `/shoutout`
- **User Banning** — Permanent ban or timed timeout with reason; managed from settings

### Watch Party
- **YouTube Queue Player** — Host queues YouTube videos from the dashboard; viewers watch in sync
- **Live Sync** — Queue index polled every 10 s so all viewers follow the host's position in real time
- **Queue Thumbnails** — Horizontal strip below the video lets viewers jump to any queued video
- **Shared Chat** — Full chat panel with reactions, polls, and pinned messages during a watch party
- **Public Playlist** — Saved queue appears on the host's public profile as a scrollable playlist

### Social
- **User Profiles** — `/u/[username]` with hero banner, avatar, bio, live/offline status, and past streams
- **Follow / Unfollow** — Follow any streamer; follower count shown on profiles and stream overlays
- **Edit Profile** — Avatar URL, display name, bio from the settings dashboard

### Creator Dashboard
- **Go Live Page** — Title, description, tags, YouTube queue, stream key copy, OBS server URL, scheduled streams
- **Analytics** — Aggregate stats (total streams, all-time peak viewers, total chat messages, avg duration) + per-stream sparkline charts and AI summaries
- **Watch Party Manager** — Add/remove/reorder YouTube videos, preview the player, share the party link
- **Settings** — Profile, chat settings (slow mode, pinned message), stream key regeneration, admin panel

### AI
- **Stream Summaries** — Auto-generated when a stream ends: key topics, highlights, and sentiment analysis
- **Chatbot** — Context-aware responses scoped to your stream
- **Content Moderation** — Real-time screening with OpenAI Moderation API

### Admin
- **Site Settings** — Toggle maintenance mode, set a site-wide announcement banner, and manage featured streams

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Streaming | LiveKit (WebRTC SFU) |
| Real-Time Chat | LiveKit Data Channels |
| AI | Vercel AI SDK + OpenAI (GPT-4o-mini, Moderation API) |
| Auth | NextAuth.js v5 |
| Database | MongoDB + Mongoose |
| UI | Tailwind CSS v4 + Lucide Icons |
| State | Zustand |

## Project Structure

```
streampulse/
├── app/
│   ├── page.tsx                              # Home — browse live streams
│   ├── layout.tsx                            # Root layout (NextAuth + theme)
│   ├── (auth)/                               # Sign-in / sign-up pages
│   ├── (dashboard)/dashboard/
│   │   ├── page.tsx                          # Dashboard home
│   │   ├── stream/page.tsx                   # Go live
│   │   ├── analytics/page.tsx                # Analytics + AI summaries
│   │   ├── settings/page.tsx                 # Profile & stream settings
│   │   └── watch-party/page.tsx              # YouTube queue manager
│   ├── u/[username]/page.tsx                 # Public user profile
│   ├── watch/[streamId]/page.tsx             # Watch a live stream
│   ├── watch-party/[streamId]/page.tsx       # Watch party viewer
│   ├── stream-overlay/[streamId]/page.tsx    # OBS browser source overlay
│   └── api/
│       ├── auth/[...nextauth]/route.ts        # NextAuth handler
│       ├── auth/register/route.ts             # Email/password registration
│       ├── livekit/token/route.ts             # Viewer/streamer tokens
│       ├── livekit/guest-token/route.ts       # Guest co-streamer token
│       ├── livekit/webhook/route.ts           # Stream start/end events
│       ├── livekit/egress/route.ts            # Recording start/stop
│       ├── chat/send/route.ts                 # Send message (+ moderation)
│       ├── chat/history/route.ts              # Chat history
│       ├── ai/chatbot/route.ts                # AI chatbot
│       ├── ai/summarize/route.ts              # Stream summary generation
│       ├── streams/route.ts                   # List / create streams
│       ├── streams/[streamId]/route.ts        # Stream details
│       ├── polls/route.ts                     # Create / get / delete polls
│       ├── polls/[pollId]/vote/route.ts       # Cast a vote
│       ├── follow/[username]/route.ts         # Follow / unfollow
│       ├── user/profile/route.ts              # Update profile
│       ├── user/stream-key/route.ts           # Regenerate stream key
│       ├── user/watch-party/route.ts          # Save watch party queue
│       ├── user/[username]/route.ts           # Public profile data
│       ├── watch-party/[username]/route.ts    # Live party state
│       └── admin/route.ts                     # Admin site settings
├── components/
│   ├── stream/                               # Player, controls, cards, poll widget, reaction overlay
│   ├── chat/                                 # Chat panel, message, input, pinned message
│   ├── dashboard/                            # Sidebar, stream summary card
│   └── layout/                              # Navbar
├── lib/
│   ├── db.ts                                 # Mongoose connection singleton
│   ├── mongoClient.ts                        # MongoClient for NextAuth adapter
│   ├── livekit.ts                            # Token generation helpers
│   ├── models/
│   │   ├── user.ts
│   │   ├── stream.ts
│   │   ├── chatMessage.ts
│   │   ├── streamSummary.ts
│   │   ├── poll.ts
│   │   ├── follow.ts
│   │   ├── ban.ts
│   │   ├── scheduledStream.ts
│   │   └── siteSettings.ts
│   ├── ai/
│   │   ├── moderate.ts                       # OpenAI Moderation API
│   │   ├── chatbot.ts                        # Chatbot logic
│   │   └── summarize.ts                      # Summary generation
│   ├── utils.ts
│   └── constants.ts
└── stores/
    └── chat-store.ts                         # Zustand — messages, reactions, polls, YouTube queue
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- MongoDB database (recommend [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)
- LiveKit server ([LiveKit Cloud](https://livekit.io) free tier or self-hosted)
- OpenAI API key

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | [livekit.io](https://livekit.io) dashboard |
| `NEXT_PUBLIC_LIVEKIT_WS_URL` | LiveKit server WebSocket URL |
| `MONGODB_URI` | [MongoDB Atlas](https://www.mongodb.com/atlas) connection string |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) |

OAuth providers (optional):

| Variable | Notes |
|---|---|
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth app |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth app |

### 3. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

### Streaming

1. Sign in → **Dashboard → Go Live**
2. Set title, description, and tags
3. Copy the **Stream Key** and **RTMP ingest URL** into OBS (Settings → Stream → Custom)
4. Optionally add the **OBS Chat Overlay** as a browser source (`/stream-overlay/[streamId]`)
5. Click **Go Live** in the dashboard, then start streaming in OBS
6. End the stream from the dashboard — an AI summary is generated automatically

### Watch Party

1. Go to **Dashboard → Watch Party**
2. Paste YouTube video URLs to build a queue
3. Save and share the party link (`/watch-party/[username]`)
4. Viewers see the queue in sync and can chat in real time

### Chat Commands (streamers only)

| Command | Action |
|---|---|
| `/pin <message>` | Pin a message to the top of chat |
| `/unpin` | Remove the pinned message |
| `/ban @user [reason]` | Permanently ban a user |
| `/timeout @user [minutes]` | Temporarily mute a user |
| `/unban @user` | Remove a ban |
| `/shoutout @user` | Post a shoutout message |

### AI Chatbot

Type `@bot`, `@ai`, or `@streampulse` in chat followed by your question. The bot responds in chat with context about the current stream.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server (Turbopack) |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add all environment variables
4. Deploy

> **Note:** LiveKit requires a persistent WebSocket server. Use [LiveKit Cloud](https://livekit.io) or self-host on [Fly.io](https://fly.io) / [Railway](https://railway.app). Do not point `NEXT_PUBLIC_LIVEKIT_WS_URL` at a Vercel function.

## Database Models

| Model | Purpose |
|---|---|
| `User` | Profile, stream key, bio, follow counts, watch party queue |
| `Stream` | Metadata, live status, viewer counts, tags |
| `ChatMessage` | All messages with moderation flags |
| `StreamSummary` | AI-generated post-stream summaries |
| `Poll` | Live poll questions, options, votes, expiry |
| `Follow` | Follower → following relationships |
| `Ban` | User bans and timeouts with reason and expiry |
| `ScheduledStream` | Upcoming stream announcements |
| `SiteSettings` | Admin-controlled global site configuration |

No migrations needed — MongoDB creates collections automatically on first write.
