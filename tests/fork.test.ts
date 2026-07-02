import { describe, expect, it } from "vitest";
import { forkPreset, isForkedPreset } from "../src/presets/fork";
import { PRESETS } from "../src/presets/registry";

describe("forkPreset", () => {
  it("copies the source's fragment source under a new id", () => {
    const original = PRESETS[0];
    const forked = forkPreset(original);

    expect(forked.id).not.toBe(original.id);
    expect(forked.fragmentSource).toBe(original.fragmentSource);
    expect(forked.forkedFrom).toBe(original.id);
  });

  it("never mutates the original preset object", () => {
    const original = PRESETS[0];
    const snapshot = { ...original };

    forkPreset(original);

    expect(original).toEqual(snapshot);
  });

  it("produces a unique id on every call, even from the same source", () => {
    const original = PRESETS[0];
    const first = forkPreset(original);
    const second = forkPreset(original);

    expect(first.id).not.toBe(second.id);
  });
});

describe("isForkedPreset", () => {
  it("is false for an original registry preset", () => {
    expect(isForkedPreset(PRESETS[0])).toBe(false);
  });

  it("is true for a preset produced by forkPreset", () => {
    expect(isForkedPreset(forkPreset(PRESETS[0]))).toBe(true);
  });
});
