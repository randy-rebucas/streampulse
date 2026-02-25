# StreamPulse — Feature Documentation

> Live streaming platform with AI-powered chat moderation, intelligent chatbot, automatic stream summaries, Watch Party, and YouTube simulcasting.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Home Page — Live Stream Directory](#2-home-page--live-stream-directory)
3. [Streaming (Go Live)](#3-streaming-go-live)
4. [Viewer Watch Page](#4-viewer-watch-page)
5. [Real-Time Chat](#5-real-time-chat)
6. [AI Features](#6-ai-features)
7. [Analytics Dashboard](#7-analytics-dashboard)
8. [Watch Party](#8-watch-party)
9. [User Settings](#9-user-settings)
10. [Admin — Site Settings](#10-admin--site-settings)
11. [API Reference](#11-api-reference)
12. [Tech Stack](#12-tech-stack)

---

## 1. Authentication

StreamPulse uses **NextAuth.js v5** with a credentials-only (email + password) strategy.

### Sign Up (`/sign-up`)
- Users register with a **name**, **email**, and **password** (min 8, max 128 characters).
- A unique **username** is auto-generated from the email prefix; a numeric suffix is appended automatically if the username is already taken.
- A **stream key** is generated at registration using `crypto.getRandomValues()`.
- Registration can be **enabled or disabled** by the admin (see §10).
- The first account is always allowed through (bootstrap protection — prevents lockout).

### Sign In (`/sign-in`)
- Email + password login via the `credentials` NextAuth provider.
- A `callbackUrl` query param is honoured but restricted to same-origin paths only (open-redirect protection).

### Session
- JWT-based sessions. The JWT carries `id` and `username`; username is refreshed from the database on every session update.

---

## 2. Home Page — Live Stream Directory

**Route:** `/`

- Displays all **currently live streams** in a responsive grid (1 → 2 → 3 → 4 columns).
- Each **Stream Card** shows:
  - Thumbnail / live video preview
  - Stream title
  - Streamer name & avatar
  - Live viewer count
  - Category tags
- A **search bar** in the navbar lets viewers filter streams by title or tag.
- Unauthenticated users can browse and watch streams. Sign-in is only required to send chat messages.

---

## 3. Streaming (Go Live)

**Route:** `/dashboard/stream`

Streamers set up and broadcast from this page.

### Starting a Stream
1. Enter a **Stream Title** (required) and optional **Description**.
2. Select up to **3 category tags** from: Gaming, Music, Art, Tech, Cooking, Education, Sports, Talk Show, Science, Entertainment.
3. Optionally enter a **YouTube Stream Key** to simultaneously push the stream to YouTube.
4. Click **Go Live** — a LiveKit room is created, a stream record is saved to the database, and the live preview appears on screen.

### While Live
- A **local video preview** shows the streamer their own outgoing feed.
- A **LIVE badge** and, if active, a **YouTube badge** are shown.
- **Stream Controls** allow muting/unmuting camera and microphone.
- The **YouTube Queue Player** (Watch Party) lets the streamer queue YouTube videos that sync to viewers in real time.
- **Active sessions panel** lists any concurrent streams (e.g., from another device) and allows ending them individually.

### Ending a Stream
- Clicking **End Stream** stops the LiveKit room, marks the stream as ended in the database, and triggers an AI summary generation automatically via the LiveKit webhook.

### YouTube Simulcasting
- Enter a YouTube Stream Key in the setup form.
- After going live, click **Start YouTube** to begin an RTMP egress from LiveKit to YouTube.
- The YouTube status badge transitions: `idle → starting → live`.
- Click **Stop YouTube** to end the egress independently of the main stream.

---

## 4. Viewer Watch Page

**Route:** `/watch/[streamId]`

### Features
- Embeds the **LiveKit video player** for authenticated viewers; shows a sign-in prompt for guests.
- Displays **stream metadata**: title, description, streamer avatar, live badge, viewer count, tags.
- Shows a **chat panel** (right sidebar on desktop, collapsible on mobile).
- Renders the **YouTube Queue Player** if the streamer has an active Watch Party queue — the video syncs across all viewers simultaneously.
- If the stream is offline, a friendly "Stream has ended" state is shown.

---

## 5. Real-Time Chat

Available on both the Watch page (`/watch/[streamId]`) and the Watch Party page (`/watch-party/[streamId]`).

### Sending Messages
- Authenticated users type messages (max **500 characters**) and press Enter or click Send.
- Messages are broadcast via **LiveKit Data Channels** for zero-latency delivery.
- Messages are also **persisted to MongoDB** for late-joiner history.

### Chat History
- Late joiners receive the last **100 messages** automatically on connect.

### AI Moderation
- Every message is run through the **OpenAI Moderation API** before delivery.
- Flagged messages are silently dropped; the sender receives an error.

### AI Chatbot
- Mention `@bot`, `@ai`, or `@streampulse` in a message to trigger the **StreamPulse AI** assistant.
- The bot responds using **GPT-4o-mini**, with the stream title, description, and the last 20 chat messages as context.
- Bot responses are capped at ~200 characters and are rate-limited to once every **10 seconds** per stream.
- Bot messages are visually distinguished with a bot icon and "StreamPulse AI" label.

---

## 6. AI Features

### Stream Summary (Auto-generated)
Triggered automatically when a stream ends via the LiveKit webhook.

The summary is generated with **GPT-4o** and includes:

| Field | Description |
|---|---|
| `title` | Catchy replay title |
| `tldr` | 2–3 sentence overview |
| `keyTopics` | Array of main discussion topics |
| `highlights` | Timestamped moments with type (`funny`, `important`, `question`, `announcement`) |
| `sentiment` | Overall chat mood: `positive`, `neutral`, or `negative` |

Summaries are saved to the `StreamSummary` collection and displayed on the Analytics page.

### AI Chatbot
See §5 — Real-Time Chat → AI Chatbot.

### Content Moderation
See §5 — Real-Time Chat → AI Moderation.

---

## 7. Analytics Dashboard

**Route:** `/dashboard/analytics`

- Lists all of the signed-in user's streams (live and ended).
- For each stream, displays:
  - Stream title and status badge (LIVE / Ended)
  - **Peak viewers**
  - Stream start date/time
  - **AI-generated summary card** (if available) — shows TL;DR, key topics, highlights, and sentiment badge.
- Streams without a summary yet show an empty state.

### Stream Summary Card
The `StreamSummaryCard` component renders:
- TL;DR paragraph
- Key topics as pill badges
- Highlight list with timestamps and type icons
- Sentiment indicator with colour coding (green / grey / red)

---

## 8. Watch Party

Two parts: a **host dashboard** for managing the queue, and a **public viewer page**.

### Host — Watch Party Dashboard

**Route:** `/dashboard/watch-party`

- Build and manage a **YouTube video queue**.
  - Paste any YouTube URL or video ID into the input field; the video ID is extracted automatically.
  - Drag-and-drop handles (⠿ grip) for reordering queue items.
  - Delete individual items from the queue.
  - **Preview** any queued video inline without going live (eye icon).
  - Inline player supports prev/next navigation and close button.
- **Save Queue** — persists the current queue order to the database.
- **Copy Watch Party Link** — copies the public watch-party URL (`/watch-party/{username}`) to the clipboard.
- **Quick-play URL bar** — enter any YouTube URL to instantly play it in the inline preview player, independent of the queue.

### Public Watch Party Page

**Route:** `/watch-party/[streamId]`

The `streamId` parameter is actually the host's **username** (format: `watchparty-{username}` internally).

- **When the host is live**: the page polls every 10 seconds to sync the current queue index; a **● Live** badge is shown; the embedded YouTube IFrame player tracks the host's position in real time.
- **When the host is offline**: the saved queue is displayed with a **(saved queue)** label. Viewers can browse the list but playback is not synced.
- **Prev / Next** navigation controls for the current video.
- **Live chat** specific to the watch party room — polling every 3 seconds.
- Guests (not signed in) see a **"Sign in to chat"** prompt.
- Chat messages are stored under a `watchparty-{username}` stream ID so they don't collide with regular stream chats.

---

## 9. User Settings

**Route:** `/dashboard/settings`

### Profile
- Update **Display Name**.
- Email is shown read-only (cannot be changed here).
- Changes are saved via `PATCH /api/user/profile` and the active session is refreshed immediately.

### Stream Key
- The stream key is always **hidden** (shown as dots) for security.
- Click **Regenerate Stream Key** to generate a new key (confirms via dialog before proceeding).
- The new key is shown **once** in plaintext with copy-to-clipboard and show/hide toggle.
- After leaving the settings page the key is never shown again.

---

## 10. Admin — Site Settings

**Route:** `/dashboard/settings` (admin-only section)

The admin section is only visible when the signed-in account's email matches the `ADMIN_EMAIL` environment variable.

### Registration Toggle
- A toggleswitch labelled **Allow New Registrations**.
- When **disabled**, the `/api/auth/register` endpoint returns `403 Registration is currently disabled.` for all new sign-up attempts.
- When **enabled** (default), sign-ups proceed normally.
- The toggle state is stored in a `SiteSettings` MongoDB collection (singleton document keyed `"global"`).
- The first user account is always allowed regardless of this setting (bootstrap protection).

---

## 11. API Reference

### Auth
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new account |
| `*` | `/api/auth/[...nextauth]` | NextAuth handler (sign in, JWT, etc.) |

### Streams
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/streams` | List live streams |
| `POST` | `/api/streams` | Create a new stream record |
| `GET` | `/api/streams/[streamId]` | Get stream details + summary |
| `PATCH` | `/api/streams/[streamId]` | Update stream (title, isLive, tags, queue, etc.) |

### LiveKit
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/livekit/token` | Issue a LiveKit access token |
| `POST` | `/api/livekit/egress` | Start / stop YouTube RTMP egress |
| `POST` | `/api/livekit/webhook` | LiveKit event webhook (triggers AI summary on end) |

### Chat
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/chat/send` | Send a chat message (runs AI moderation, triggers bot) |
| `GET` | `/api/chat/history` | Fetch last 100 messages for a stream |

### AI
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/ai/chatbot` | Generate a bot reply (internal) |
| `POST` | `/api/ai/summarize` | Generate a stream summary (internal, requires `x-internal-secret`) |

### User
| Method | Route | Description |
|---|---|---|
| `PATCH` | `/api/user/profile` | Update display name |
| `POST` | `/api/user/stream-key` | Regenerate stream key |
| `GET / PATCH` | `/api/user/watch-party` | Get / save user's YouTube queue |

### Watch Party
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/watch-party/[username]` | Get host's active stream state + queue |

### Admin
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/admin/settings` | Get site settings (admin only) |
| `PATCH` | `/api/admin/settings` | Update site settings (admin only) |

---

## 12. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Streaming | LiveKit (WebRTC SFU) |
| Real-Time Chat | LiveKit Data Channels + MongoDB persistence |
| AI | Vercel AI SDK + OpenAI (GPT-4o, GPT-4o-mini, Moderation API) |
| Auth | NextAuth.js v5 (Credentials provider, JWT strategy) |
| Database | MongoDB + Mongoose |
| UI | Tailwind CSS v4 + Lucide Icons |
| State Management | Zustand |
| YouTube Integration | YouTube IFrame API + LiveKit RTMP Egress |

### Database Collections

| Collection | Purpose |
|---|---|
| `users` | Accounts, stream keys, watch party queues |
| `streams` | Stream records, metadata, viewer counts |
| `chatmessages` | Persistent chat messages (regular + watch party) |
| `streamsummaries` | AI-generated post-stream summaries |
| `sitesettings` | Global admin settings (registration toggle) |

### Environment Variables

| Variable | Purpose |
|---|---|
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret |
| `NEXTAUTH_URL` | App base URL |
| `MONGODB_URI` | MongoDB connection string |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `LIVEKIT_URL` | LiveKit server URL (`wss://...`) |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit URL exposed to the browser |
| `OPENAI_API_KEY` | OpenAI API key (AI features) |
| `INTERNAL_SECRET` | Shared secret for internal API calls (summarize endpoint) |
| `ADMIN_EMAIL` | Email address of the admin account |
