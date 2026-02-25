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

export interface ReactionBurst {
  id: string;
  emoji: string;
  x: number; // 0–100 % from left
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface ActivePoll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  endsAt?: string;
  myVote?: number; // option index the current user voted for
}

interface ChatState {
  messages: ChatMessage[];
  isConnected: boolean;
  youtubeQueue: string[];
  youtubeQueueIndex: number;
  youtubeVideoId: string | null;
  // new
  pinnedMessage: string;
  reactions: ReactionBurst[];
  activePoll: ActivePoll | null;

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setConnected: (connected: boolean) => void;
  clearMessages: () => void;
  setYoutubeQueue: (queue: string[], index?: number) => void;
  advanceYoutubeQueue: () => void;
  setYoutubeVideoId: (id: string | null) => void;
  setPinnedMessage: (msg: string) => void;
  addReaction: (emoji: string) => void;
  removeReaction: (id: string) => void;
  setActivePoll: (poll: ActivePoll | null) => void;
  updatePollVotes: (options: PollOption[], totalVotes: number, myVote?: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isConnected: false,
  youtubeQueue: [],
  youtubeQueueIndex: 0,
  youtubeVideoId: null,
  pinnedMessage: "",
  reactions: [],
  activePoll: null,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message].slice(-200) })),
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
    set(id
      ? { youtubeQueue: [id], youtubeQueueIndex: 0, youtubeVideoId: id }
      : { youtubeQueue: [], youtubeQueueIndex: 0, youtubeVideoId: null }),
  setPinnedMessage: (msg) => set({ pinnedMessage: msg }),
  addReaction: (emoji) =>
    set((state) => ({
      reactions: [
        ...state.reactions,
        { id: crypto.randomUUID(), emoji, x: Math.random() * 80 + 10 },
      ].slice(-30),
    })),
  removeReaction: (id) =>
    set((state) => ({ reactions: state.reactions.filter((r) => r.id !== id) })),
  setActivePoll: (poll) => set({ activePoll: poll }),
  updatePollVotes: (options, totalVotes, myVote) =>
    set((state) =>
      state.activePoll
        ? { activePoll: { ...state.activePoll, options, totalVotes, myVote: myVote ?? state.activePoll.myVote } }
        : {}
    ),
}));
