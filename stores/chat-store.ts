import { create } from "zustand";

export interface ChatMessage {
  id: string;
  content: string;
  username: string;
  avatarUrl?: string;
  isBot: boolean;
  isFlagged: boolean;
  createdAt: Date;
}

interface ChatState {
  messages: ChatMessage[];
  isConnected: boolean;
  youtubeQueue: string[];
  youtubeQueueIndex: number;
  youtubeVideoId: string | null;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setConnected: (connected: boolean) => void;
  clearMessages: () => void;
  setYoutubeQueue: (queue: string[], index?: number) => void;
  advanceYoutubeQueue: () => void;
  setYoutubeVideoId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isConnected: false,
  youtubeQueue: [],
  youtubeQueueIndex: 0,
  youtubeVideoId: null,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message].slice(-200),
    })),
  setMessages: (messages) => set({ messages }),
  setConnected: (connected) => set({ isConnected: connected }),
  clearMessages: () => set({ messages: [] }),
  setYoutubeQueue: (queue, index = 0) =>
    set({ youtubeQueue: queue, youtubeQueueIndex: index, youtubeVideoId: queue[index] ?? null }),
  advanceYoutubeQueue: () =>
    set((state) => {
      const next = state.youtubeQueueIndex + 1;
      if (next >= state.youtubeQueue.length) return {};
      return { youtubeQueueIndex: next, youtubeVideoId: state.youtubeQueue[next] };
    }),
  setYoutubeVideoId: (id) =>
    set(id ? { youtubeQueue: [id], youtubeQueueIndex: 0, youtubeVideoId: id } : { youtubeQueue: [], youtubeQueueIndex: 0, youtubeVideoId: null }),
}));
