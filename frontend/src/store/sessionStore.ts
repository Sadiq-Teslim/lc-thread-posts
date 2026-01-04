import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SessionState {
  sessionId: string | null;
  expiresAt: string | null;
  isConfigured: boolean;
  setSession: (sessionId: string, expiresAt: string) => void;
  clearSession: () => void;
  hasValidSession: () => boolean;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      expiresAt: null,
      isConfigured: false,

      setSession: (sessionId: string, expiresAt: string) => {
        set({
          sessionId,
          expiresAt,
          isConfigured: true,
        });
      },

      clearSession: () => {
        set({
          sessionId: null,
          expiresAt: null,
          isConfigured: false,
        });
      },

      hasValidSession: () => {
        const state = get();
        if (!state.sessionId || !state.expiresAt) {
          return false;
        }

        // Check if session has expired
        const expiryDate = new Date(state.expiresAt);
        const now = new Date();

        if (now >= expiryDate) {
          // Session expired, clear it
          set({
            sessionId: null,
            expiresAt: null,
            isConfigured: false,
          });
          return false;
        }

        return true;
      },
    }),
    {
      name: "lc-poster-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        expiresAt: state.expiresAt,
        isConfigured: state.isConfigured,
      }),
    }
  )
);
