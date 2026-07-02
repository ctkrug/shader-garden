import { describe, expect, it } from "vitest";
import { TickPlayer } from "../src/audio/tick";

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

describe("TickPlayer", () => {
  it("defaults to unmuted when storage has no prior value", () => {
    expect(new TickPlayer(fakeStorage()).isMuted).toBe(false);
  });

  it("reads a previously persisted mute state", () => {
    const storage = fakeStorage();
    storage.setItem("shader-garden:muted", "true");
    expect(new TickPlayer(storage).isMuted).toBe(true);
  });

  it("toggle() flips state and persists it", () => {
    const storage = fakeStorage();
    const player = new TickPlayer(storage);

    expect(player.toggle()).toBe(true);
    expect(player.isMuted).toBe(true);
    expect(storage.getItem("shader-garden:muted")).toBe("true");

    expect(player.toggle()).toBe(false);
    expect(storage.getItem("shader-garden:muted")).toBe("false");
  });

  it("tick() does not throw without an AudioContext (node/test environment)", () => {
    const player = new TickPlayer(fakeStorage());
    expect(() => player.tick()).not.toThrow();
  });

  it("tick() is a no-op while muted", () => {
    const storage = fakeStorage();
    const player = new TickPlayer(storage);
    player.setMuted(true);
    expect(() => player.tick()).not.toThrow();
  });
});
