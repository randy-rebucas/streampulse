# StreamPulse — Feature List

## Authentication
- Sign up / Sign in (NextAuth v5, credentials + GitHub / Google OAuth)
- Admin-controlled registration toggle (enable / disable new sign-ups)

## Streaming
- Go live with LiveKit WebRTC (camera, microphone, screen share)
- RTMP ingest via OBS — stream key generation & regeneration from the dashboard
- OBS server URL displayed for copy-paste into OBS settings
- Guest co-streamer invite — one-time token link; guest gets in-browser mic/camera controls
- OBS browser-source chat overlay (`/stream-overlay/[streamId]`) — transparent background, slide-in animations, AI message badge
- YouTube re-streaming (egress) — forward your live stream to a YouTube stream key
- Scheduled streams — set a future go-live date/time; upcoming entries shown on your public profile

## Watch Page (`/watch/[streamId]`)
- Live stream player (camera/screen via LiveKit)
- Follow / unfollow streamer button with live follower count
- Floating emoji reaction particles over the video
- Guest co-streamer mode — join with a `?guestToken=` URL parameter
- Mobile chat toggle — floating "Chat" FAB opens a bottom-sheet panel on small screens

## Chat
- Real-time messaging via LiveKit data channels
- Full message history loaded on join (last N messages)
- Slow mode — configurable per-streamer cooldown (0–120 s)
- Pinned message — streamer-set persistent banner at the top of chat
- Slash commands: `/ban`, `/timeout`, `/unban`, `/shoutout`, `/pin`, `/unpin`
- AI content moderation — every message screened by OpenAI Moderation API; configurable `category_scores` threshold
- Banned words filter — streamer-defined word list blocked server-side
- User links — clickable usernames link to `/u/[username]` profiles

## Reactions & Polls
- Live emoji reaction bursts (❤️ 🔥 😂 👏 😮 🎉) broadcast to all viewers as floating particles
- Polls — streamers create polls (up to 6 options, optional duration); viewers vote in real time; live percentage bars after voting

## Watch Party (`/watch-party/[streamId]`)
- Synchronized YouTube video queue — host's active video automatically synced to all viewers (polled every 10 s)
- Queue thumbnail strip below the player — viewers can jump to any queued video
- Host info overlay on the video (avatar, name, Live/Saved badge, position counter, follow button)
- Full chat panel with reactions, polls, and pinned messages
- Saved queue shown as a scrollable playlist on the host's public profile

## Analytics & Summaries
- Aggregate stats bar — total streams, all-time peak viewers, total chat messages, average duration
- Per-stream cards with peak viewers, chat message count, and duration
- Viewer history sparkline chart (custom SVG with grid lines and peak marker annotation)
- AI-generated stream summaries (key topics, highlights, sentiment) — shown per stream
- Streams sorted newest-first

## AI Features
- AI chatbot assistant — mention `@bot`, `@ai`, or `@streampulse` in chat for GPT-4o-mini responses
- Automatic stream summarization triggered on stream end via LiveKit webhook
- Content moderation — configurable `category_scores` threshold per category; admin-adjustable

## Social & Discovery
- Follow / unfollow system with follower counts
- Public streamer profile pages (`/u/[username]`) — hero banner, avatar, bio, live status badge, "Watch Live" CTA, past streams, scheduled streams, watch party playlist
- Edit profile link on own profile → dashboard settings
- Category / tag browse page (`/category/[tag]`)
- Home page stream discovery — live streams with viewer counts and tags

## Dashboard & Settings
- Profile card — display name, email (read-only), avatar URL, bio with character counter
- Chat settings card — slow mode slider, pinned message input, own save button
- Stream key card — copy stream key, OBS server URL hint, destructive regenerate button
- **Admin panel** — banned words list, AI moderation threshold per category, registration toggle, maintenance mode, site-wide announcement banner
