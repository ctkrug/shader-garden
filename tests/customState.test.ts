import { describe, expect, it } from "vitest";
import { clearCustomState, loadCustomState, saveCustomState } from "../src/persistence/customState";

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  } as Storage;
}

describe("customState", () => {
  it("returns null when nothing has been saved", () => {
    expect(loadCustomState(fakeStorage())).toBeNull();
  });

  it("round-trips a saved state", () => {
    const storage = fakeStorage();
    const state = {
      forkedFrom: "plasma",
      fragmentSource: "void main() {}",
      uniformValues: { uSpeed: { type: "float" as const, value: [1.2] } },
    };

    saveCustomState(state, storage);
    expect(loadCustomState(storage)).toEqual(state);
  });

  it("overwrites the previously saved state", () => {
    const storage = fakeStorage();
    saveCustomState({ forkedFrom: "plasma", fragmentSource: "a", uniformValues: {} }, storage);
    saveCustomState({ forkedFrom: "voronoi", fragmentSource: "b", uniformValues: {} }, storage);

    expect(loadCustomState(storage)?.forkedFrom).toBe("voronoi");
  });

  it("treats corrupted JSON as absent instead of throwing", () => {
    const storage = fakeStorage();
    storage.setItem("shader-garden:custom-state", "{not valid json");

    expect(loadCustomState(storage)).toBeNull();
  });

  it("treats a value missing required fields as absent", () => {
    const storage = fakeStorage();
    storage.setItem("shader-garden:custom-state", JSON.stringify({ forkedFrom: "plasma" }));

    expect(loadCustomState(storage)).toBeNull();
  });

  it("clearCustomState removes the saved entry", () => {
    const storage = fakeStorage();
    saveCustomState({ forkedFrom: "plasma", fragmentSource: "a", uniformValues: {} }, storage);

    clearCustomState(storage);

    expect(loadCustomState(storage)).toBeNull();
  });
});
