import { describe, expect, it } from "vitest";
import { CustomPresetStore } from "../src/presets/customStore";
import { PRESETS } from "../src/presets/registry";

describe("CustomPresetStore", () => {
  it("starts empty", () => {
    expect(new CustomPresetStore().all).toEqual([]);
  });

  it("adds a fork to .all and makes it retrievable by id", () => {
    const store = new CustomPresetStore();
    const forked = store.fork(PRESETS[0]);

    expect(store.all).toEqual([forked]);
    expect(store.get(forked.id)).toBe(forked);
  });

  it("returns undefined for an id that was never forked", () => {
    expect(new CustomPresetStore().get("nope")).toBeUndefined();
  });

  it("keeps multiple forks independently addressable", () => {
    const store = new CustomPresetStore();
    const a = store.fork(PRESETS[0]);
    const b = store.fork(PRESETS[1]);

    expect(store.all).toHaveLength(2);
    expect(store.get(a.id)).toBe(a);
    expect(store.get(b.id)).toBe(b);
  });

  it("never adds to or replaces the static PRESETS array", () => {
    const originalLength = PRESETS.length;
    new CustomPresetStore().fork(PRESETS[0]);

    expect(PRESETS.length).toBe(originalLength);
  });

  describe("updateSource", () => {
    it("overwrites a fork's fragmentSource in place", () => {
      const store = new CustomPresetStore();
      const forked = store.fork(PRESETS[0]);

      store.updateSource(forked.id, "void main() {}");

      expect(store.get(forked.id)?.fragmentSource).toBe("void main() {}");
    });

    it("is a no-op for an unknown id", () => {
      const store = new CustomPresetStore();
      expect(() => store.updateSource("nope", "void main() {}")).not.toThrow();
    });
  });
});
