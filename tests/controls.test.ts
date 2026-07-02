import { describe, expect, it } from "vitest";
import { displayName, formatValue } from "../src/ui/controls";

describe("displayName", () => {
  it("strips the leading shader-convention 'u'", () => {
    expect(displayName("uSpeed")).toBe("Speed");
  });

  it("only strips one leading 'u', not repeated ones", () => {
    expect(displayName("uuColor")).toBe("uColor");
  });

  it("leaves a name with no leading 'u' untouched", () => {
    expect(displayName("scale")).toBe("scale");
  });

  it("returns an empty string for a bare 'u'", () => {
    expect(displayName("u")).toBe("");
  });
});

describe("formatValue", () => {
  it("rounds an int to a whole number with no decimals", () => {
    expect(formatValue("int", 3.7)).toBe("4");
  });

  it("formats a float to 2 decimal places", () => {
    expect(formatValue("float", 1)).toBe("1.00");
  });

  it("formats a vec3 color channel to 2 decimal places", () => {
    expect(formatValue("vec3", 0.5)).toBe("0.50");
  });
});
