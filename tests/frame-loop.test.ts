import { describe, expect, it } from "vitest";
import { FrameLoop, type FrameLoopVisibility } from "../src/app/frame-loop";

function fakeVisibility(): FrameLoopVisibility & { hidden: boolean; fire: () => void } {
  let listener: (() => void) | null = null;
  return {
    hidden: false,
    addEventListener: (_type, fn) => {
      listener = fn;
    },
    removeEventListener: () => {
      listener = null;
    },
    isHidden() {
      return this.hidden;
    },
    fire() {
      listener?.();
    },
  };
}

function fakeRaf() {
  let nextHandle = 1;
  const pending = new Map<number, FrameRequestCallback>();
  return {
    requestAnimationFrame: (cb: FrameRequestCallback) => {
      const handle = nextHandle++;
      pending.set(handle, cb);
      return handle;
    },
    cancelAnimationFrame: (handle: number) => {
      pending.delete(handle);
    },
    flush(time = 0) {
      const callbacks = [...pending.values()];
      pending.clear();
      for (const cb of callbacks) cb(time);
    },
    get pendingCount() {
      return pending.size;
    },
  };
}

describe("FrameLoop", () => {
  it("schedules and invokes onFrame on start", () => {
    const raf = fakeRaf();
    const visibility = fakeVisibility();
    const frames: number[] = [];
    const loop = new FrameLoop((t) => frames.push(t), { ...raf, visibility });

    loop.start();
    expect(raf.pendingCount).toBe(1);
    raf.flush(16);
    expect(frames).toEqual([16]);
  });

  it("stops scheduling further frames after stop()", () => {
    const raf = fakeRaf();
    const visibility = fakeVisibility();
    const loop = new FrameLoop(() => {}, { ...raf, visibility });

    loop.start();
    loop.stop();
    expect(raf.pendingCount).toBe(0);

    raf.flush();
    expect(raf.pendingCount).toBe(0);
  });

  it("cancels the pending frame when the tab becomes hidden", () => {
    const raf = fakeRaf();
    const visibility = fakeVisibility();
    const loop = new FrameLoop(() => {}, { ...raf, visibility });

    loop.start();
    expect(raf.pendingCount).toBe(1);

    visibility.hidden = true;
    visibility.fire();

    expect(raf.pendingCount).toBe(0);
    expect(loop.isPaused).toBe(true);
  });

  it("resumes scheduling when the tab becomes visible again", () => {
    const raf = fakeRaf();
    const visibility = fakeVisibility();
    const loop = new FrameLoop(() => {}, { ...raf, visibility });

    loop.start();
    visibility.hidden = true;
    visibility.fire();
    expect(raf.pendingCount).toBe(0);

    visibility.hidden = false;
    visibility.fire();
    expect(raf.pendingCount).toBe(1);
    expect(loop.isPaused).toBe(false);
  });

  it("does not resume onFrame calls after stop() even if visibility flips", () => {
    const raf = fakeRaf();
    const visibility = fakeVisibility();
    const frames: number[] = [];
    const loop = new FrameLoop(() => frames.push(1), { ...raf, visibility });

    loop.start();
    loop.stop();

    visibility.hidden = true;
    visibility.fire();
    visibility.hidden = false;
    visibility.fire();

    expect(raf.pendingCount).toBe(0);
    expect(frames).toEqual([]);
  });
});
