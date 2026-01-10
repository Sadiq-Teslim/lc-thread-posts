import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SessionState {
  sessionId: string | null;
  isConfigured: boolean;
  setSession: (sessionId: string) => void;
  clearSession: () => void;
  hasValidSession: () => boolean;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      isConfigured: false,

      setSession: (sessionId: string) => {
        set({
          sessionId,
          isConfigured: true,
        });
      },

      clearSession: () => {
        set({
          sessionId: null,
          isConfigured: false,
        });
      },

      hasValidSession: () => {
        const state = get();
        // Session is valid if sessionId exists (persists until disconnect)
        return !!state.sessionId;
      },
    }),
    {
      name: "lc-poster-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        isConfigured: state.isConfigured,
      }),
    }
  )
);
