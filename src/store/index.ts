// src/store/index.ts
import { create } from "zustand";
import { createSessionStore } from "./session";
import { createQuizStore } from "./quiz";
import { AppState } from "./types";

const useAppStore = create<AppState>()((...args) => ({
  ...createSessionStore(...args),
  ...createQuizStore(...args),
}));

export default useAppStore;