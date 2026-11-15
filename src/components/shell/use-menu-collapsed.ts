"use client";

import { useSyncExternalStore } from "react";

const KEY = "shell.menuCollapsed";

type FlagStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * The collapsed flag, kept in the given storage. A storage that throws never breaks the caller:
 * an unreadable one counts as expanded, and an unwritable one keeps the choice for this page only.
 */
export function createCollapsedStore(storage: () => FlagStorage) {
  const listeners = new Set<() => void>();
  let unsaved: boolean | null = null;

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get(): boolean {
      if (unsaved !== null) return unsaved;
      try {
        return storage().getItem(KEY) === "1";
      } catch {
        return false;
      }
    },
    set(value: boolean): void {
      try {
        storage().setItem(KEY, value ? "1" : "0");
        unsaved = null;
      } catch {
        unsaved = value;
      }
      listeners.forEach((listener) => listener());
    },
  };
}

const store = createCollapsedStore(() => window.localStorage);

/** Also follows a change made in another tab. */
function subscribe(listener: () => void) {
  const unsubscribe = store.subscribe(listener);
  window.addEventListener("storage", listener);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", listener);
  };
}

/** The server cannot know the browser's choice, so it and the hydrating render show the menu. */
const serverSnapshot = () => false;

export function useMenuCollapsed(): [collapsed: boolean, setCollapsed: (value: boolean) => void] {
  return [useSyncExternalStore(subscribe, store.get, serverSnapshot), store.set];
}
