import { afterEach, describe, expect, it } from "vitest";
import { safeLocalStorage } from "../src/util/safeStorage";

describe("safeLocalStorage", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  it("returns null when window is undefined (SSR, node test env)", () => {
    delete (globalThis as { window?: unknown }).window;

    expect(safeLocalStorage()).toBeNull();
  });

  it("returns window.localStorage when it's accessible", () => {
    const fakeLocalStorage = { getItem: () => null } as unknown as Storage;
    (globalThis as { window?: unknown }).window = { localStorage: fakeLocalStorage };

    expect(safeLocalStorage()).toBe(fakeLocalStorage);
  });

  it("returns null instead of throwing when accessing localStorage throws", () => {
    (globalThis as { window?: unknown }).window = {
      get localStorage(): Storage {
        throw new DOMException("denied", "SecurityError");
      },
    };

    expect(safeLocalStorage()).toBeNull();
  });
});
