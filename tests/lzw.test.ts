import { describe, expect, it } from "vitest";
import { lzwEncode } from "../src/gif/lzw";

/**
 * A from-scratch LZW *decoder* mirroring the GIF variant's dictionary
 * growth rules exactly, used only here to round-trip `lzwEncode`'s output
 * back to the original indices — the strongest correctness check available
 * without an external GIF reference file.
 */
function decodeForTest(encoded: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  let bitPos = 0;
  const readCode = (size: number): number => {
    let code = 0;
    for (let i = 0; i < size; i++) {
      const byteIndex = bitPos >> 3;
      const bitIndex = bitPos & 7;
      const bit = (encoded[byteIndex] >> bitIndex) & 1;
      code |= bit << i;
      bitPos++;
    }
    return code;
  };

  let dict: Map<number, number[]>;
  let codeSize: number;
  let nextCode: number;

  const resetDict = (): void => {
    dict = new Map();
    for (let i = 0; i < clearCode; i++) dict.set(i, [i]);
    codeSize = minCodeSize + 1;
    nextCode = endCode + 1;
  };
  resetDict();

  const output: number[] = [];
  let prevEntry: number[] | null = null;

  for (;;) {
    const code = readCode(codeSize);

    if (code === clearCode) {
      resetDict();
      prevEntry = null;
      continue;
    }
    if (code === endCode) break;

    let entry: number[];
    if (dict.has(code)) {
      entry = dict.get(code)!;
    } else if (code === nextCode && prevEntry) {
      entry = [...prevEntry, prevEntry[0]];
    } else {
      throw new Error(`bad LZW code ${code} at bit ${bitPos}`);
    }

    output.push(...entry);

    if (prevEntry) {
      dict.set(nextCode, [...prevEntry, entry[0]]);
      nextCode++;
      // `>=` here vs `>` in lzwEncode's matching check — see the comment
      // there — compensates for the decoder's dictionary insertion always
      // lagging the encoder's by exactly one code.
      if (nextCode >= 1 << codeSize && codeSize < 12) codeSize++;
    }

    prevEntry = entry;
  }

  return output;
}

describe("lzwEncode", () => {
  it("round-trips a short run of indices", () => {
    const indices = Uint8Array.from([0, 1, 2, 3, 0, 1, 2, 3, 0, 0, 0, 0]);
    const encoded = lzwEncode(indices, 2);
    expect(decodeForTest(encoded, 2)).toEqual(Array.from(indices));
  });

  it("round-trips a single repeated value", () => {
    const indices = new Uint8Array(50).fill(3);
    const encoded = lzwEncode(indices, 2);
    expect(decodeForTest(encoded, 2)).toEqual(Array.from(indices));
  });

  it("round-trips an empty buffer", () => {
    const encoded = lzwEncode(new Uint8Array(0), 2);
    expect(decodeForTest(encoded, 2)).toEqual([]);
  });

  it("round-trips the KwKwK repeating-pattern edge case", () => {
    const indices = Uint8Array.from([0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
    const encoded = lzwEncode(indices, 2);
    expect(decodeForTest(encoded, 2)).toEqual(Array.from(indices));
  });

  it("round-trips a large, high-entropy buffer through a dictionary reset", () => {
    // A pseudo-random-ish but deterministic sequence long enough to grow the
    // dictionary past its 4096-entry cap and force an in-stream reset.
    const indices = new Uint8Array(20000);
    let seed = 1;
    for (let i = 0; i < indices.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      indices[i] = seed % 8;
    }

    const encoded = lzwEncode(indices, 3);
    expect(decodeForTest(encoded, 3)).toEqual(Array.from(indices));
  });

  it("round-trips full-width 8-bit palette indices", () => {
    const indices = Uint8Array.from({ length: 300 }, (_, i) => i % 256);
    const encoded = lzwEncode(indices, 8);
    expect(decodeForTest(encoded, 8)).toEqual(Array.from(indices));
  });
});
