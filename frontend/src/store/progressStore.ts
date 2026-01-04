import { create } from "zustand";

interface ProgressState {
  currentDay: number;
  threadId: string | null;
  hasActiveThread: boolean;
  nextDay: number;
  setProgress: (data: {
    current_day: number;
    thread_id: string | null;
    has_active_thread: boolean;
    next_day: number;
  }) => void;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
  currentDay: 0,
  threadId: null,
  hasActiveThread: false,
  nextDay: 1,

  setProgress: (data) => {
    set({
      currentDay: data.current_day,
      threadId: data.thread_id,
      hasActiveThread: data.has_active_thread,
      nextDay: data.next_day,
    });
  },

  resetProgress: () => {
    set({
      currentDay: 0,
      threadId: null,
      hasActiveThread: false,
      nextDay: 1,
    });
  },
}));
