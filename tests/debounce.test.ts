import { describe, expect, it } from "vitest";
import { debounce } from "../src/editor/debounce";

function fakeTimer() {
  let nextHandle = 1;
  const pending = new Map<number, () => void>();
  return {
    setTimeout: (fn: () => void) => {
      const handle = nextHandle++;
      pending.set(handle, fn);
      return handle;
    },
    clearTimeout: (handle: number) => {
      pending.delete(handle);
    },
    flush() {
      const callbacks = [...pending.values()];
      pending.clear();
      for (const cb of callbacks) cb();
    },
    get pendingCount() {
      return pending.size;
    },
  };
}

describe("debounce", () => {
  it("collapses a burst of calls into a single invocation", () => {
    const timer = fakeTimer();
    const calls: number[] = [];
    const debounced = debounce((n: number) => calls.push(n), 300, timer);

    debounced(1);
    debounced(2);
    debounced(3);
    expect(timer.pendingCount).toBe(1);

    timer.flush();
    expect(calls).toEqual([3]);
  });

  it("cancel() prevents a pending call from firing", () => {
    const timer = fakeTimer();
    const calls: number[] = [];
    const debounced = debounce(() => calls.push(1), 300, timer);

    debounced();
    debounced.cancel();
    timer.flush();

    expect(calls).toEqual([]);
    expect(timer.pendingCount).toBe(0);
  });

  it("allows separate bursts to each fire once", () => {
    const timer = fakeTimer();
    const calls: number[] = [];
    const debounced = debounce(() => calls.push(1), 300, timer);

    debounced();
    timer.flush();
    debounced();
    timer.flush();

    expect(calls).toEqual([1, 1]);
  });
});
