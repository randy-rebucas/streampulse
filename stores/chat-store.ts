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
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setConnected: (connected: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isConnected: false,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message].slice(-200),
    })),
  setMessages: (messages) => set({ messages }),
  setConnected: (connected) => set({ isConnected: connected }),
  clearMessages: () => set({ messages: [] }),
}));
