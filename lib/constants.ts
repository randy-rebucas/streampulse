export const APP_NAME = "StreamPulse";
export const APP_DESCRIPTION = "Live streaming platform with AI-powered features";

export const CHAT_MAX_LENGTH = 500;
export const CHAT_HISTORY_LIMIT = 100;
export const BOT_RATE_LIMIT_MS = 10000; // 10 seconds between bot responses
export const BOT_CONTEXT_WINDOW = 20; // last 20 messages for bot context

export const STREAM_TAGS = [
  "Gaming",
  "Music",
  "Art",
  "Tech",
  "Cooking",
  "Education",
  "Sports",
  "Talk Show",
  "Science",
  "Entertainment",
] as const;
