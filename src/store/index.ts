// File path: src/store/index.ts
// Main store combining session and quiz state for K12Beast app

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createSessionStore } from "./session";
import { createQuizStore } from "./quiz";
import { AppState, Message } from "./types";
import { produce } from "immer";

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createSessionStore(set, get),
      ...createQuizStore(set, get),
      addMessage: (message: Message) =>
        set(
          produce((state: AppState) => {
            state.messages = [...state.messages, message];
          })
        ),
      updateMessage: (index: number, message: Partial<Message>) =>
        set(
          produce((state: AppState) => {
            state.messages[index] = { ...state.messages[index], ...message };
          })
        ),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages,
        sessionId: state.sessionId,
        sessionTerminated: state.sessionTerminated,
      }),
    }
  )
);

export default useAppStore;