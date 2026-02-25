# StreamPulse — Feature List

## Authentication
- Sign up / Sign in (NextAuth v5, credentials-based)
- Admin-controlled registration toggle

## Streaming
- Go live with LiveKit WebRTC
- Stream key generation & regeneration
- Guest co-streamer invite (token-based)
- OBS browser source chat overlay (`/stream-overlay/[streamId]`)
- Scheduled streams (create / delete)

## Watch Page
- Live stream player
- Follow / unfollow streamer button
- Floating emoji reaction particles overlay

## Chat
- Real-time chat via LiveKit data channels
- Slow mode (configurable seconds per streamer)
- Pinned messages (streamer-set persistent banner)
- Slash commands: `/ban`, `/timeout`, `/unban`, `/shoutout`, `/pin`, `/unpin`
- AI content moderation with configurable sensitivity threshold
- Banned words filter
- Chat history loaded on join (last N messages)

## Reactions & Polls
- Live emoji reaction bursts broadcast to all viewers
- Polls: create, vote, and end (streamer-controlled)

## Watch Party
- Synchronized YouTube video watch parties

## Analytics & Summaries
- AI-generated stream summaries (OpenAI)
- Viewer history sparkline chart (SVG with peak marker)
- PDF export of stream summary (browser print)

## AI Features
- AI chatbot assistant
- Stream summarization
- Content moderation (configurable `category_scores` threshold)

## Social & Discovery
- Follow system (follow / unfollow streamers)
- Public streamer profile pages (`/u/[username]`)
- Category / tag browse page (`/category/[tag]`)
- Follower count display

## Dashboard & Settings
- Bio editor
- Slow mode slider (0–120 seconds)
- Pinned message input
- Stream key regeneration
- **Admin panel:** banned words list, AI moderation threshold, registration toggle
