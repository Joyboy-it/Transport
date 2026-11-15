import { describe, expect, test } from "vitest";
import { createCollapsedStore } from "./use-menu-collapsed";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}
const broken = () => {
  throw new Error("storage is blocked");
};

describe("collapsed menu store", () => {
  test("is expanded when nothing is stored", () => {
    expect(createCollapsedStore(() => memoryStorage()).get()).toBe(false);
  });

  test('reads "1" under shell.menuCollapsed as collapsed', () => {
    expect(createCollapsedStore(() => memoryStorage({ "shell.menuCollapsed": "1" })).get()).toBe(true);
  });

  test("collapsing is kept in the storage, so a new page load sees it", () => {
    const storage = memoryStorage();
    createCollapsedStore(() => storage).set(true);
    expect(storage.data.get("shell.menuCollapsed")).toBe("1");
    expect(createCollapsedStore(() => storage).get()).toBe(true);
  });

  test("expanding again is kept too", () => {
    const storage = memoryStorage({ "shell.menuCollapsed": "1" });
    createCollapsedStore(() => storage).set(false);
    expect(createCollapsedStore(() => storage).get()).toBe(false);
  });

  test("a change is announced to subscribers until they unsubscribe", () => {
    const store = createCollapsedStore(() => memoryStorage());
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.set(true);
    expect(calls).toBe(1);
    unsubscribe();
    store.set(false);
    expect(calls).toBe(1);
  });

  test("a storage that cannot be read counts as expanded", () => {
    const store = createCollapsedStore(() => ({ ...memoryStorage(), getItem: broken }));
    expect(store.get()).toBe(false);
  });

  test("a storage that cannot be written still collapses and expands for this page", () => {
    const store = createCollapsedStore(() => ({ ...memoryStorage(), setItem: broken }));
    let calls = 0;
    store.subscribe(() => calls++);
    store.set(true);
    expect(store.get()).toBe(true);
    store.set(false);
    expect(store.get()).toBe(false);
    expect(calls).toBe(2);
  });

  test("a browser that refuses to hand out the storage does not throw", () => {
    const store = createCollapsedStore(broken);
    expect(store.get()).toBe(false);
    store.set(true);
    expect(store.get()).toBe(true);
  });
});
