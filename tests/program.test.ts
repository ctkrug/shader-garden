import { describe, expect, it } from "vitest";
import { cleanInfoLog } from "../src/gl/program";

describe("cleanInfoLog", () => {
  it("returns null for a null log", () => {
    expect(cleanInfoLog(null)).toBeNull();
  });

  it("strips a trailing NUL byte some drivers append", () => {
    expect(cleanInfoLog("ERROR: 0:1: 'this' : syntax error\n\0")).toBe(
      "ERROR: 0:1: 'this' : syntax error",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(cleanInfoLog("  ERROR: bad thing  \n")).toBe("ERROR: bad thing");
  });

  it("leaves an already-clean log untouched", () => {
    expect(cleanInfoLog("ERROR: 0:3: 'foo' undeclared identifier")).toBe(
      "ERROR: 0:3: 'foo' undeclared identifier",
    );
  });
});
