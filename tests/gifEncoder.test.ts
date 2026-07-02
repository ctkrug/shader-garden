import { describe, expect, it } from "vitest";
import { encodeGif } from "../src/gif/encoder";
import type { RgbColor } from "../src/gif/quantize";

/** Mirrors lzwEncode's dictionary-growth timing — see tests/lzw.test.ts. */
function lzwDecode(encoded: Uint8Array, minCodeSize: number): number[] {
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

  let dict = new Map<number, number[]>();
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
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
    if (dict.has(code)) entry = dict.get(code)!;
    else if (code === nextCode && prevEntry) entry = [...prevEntry, prevEntry[0]];
    else throw new Error(`bad LZW code ${code}`);

    output.push(...entry);

    if (prevEntry) {
      dict.set(nextCode, [...prevEntry, entry[0]]);
      nextCode++;
      if (nextCode >= 1 << codeSize && codeSize < 12) codeSize++;
    }
    prevEntry = entry;
  }

  return output;
}

interface ParsedGif {
  width: number;
  height: number;
  globalColors: RgbColor[];
  loopForever: boolean;
  frames: Array<{ delayCs: number; indices: number[] }>;
}

/** A minimal from-scratch GIF89a reader — just enough to verify what encodeGif() produces. */
function parseGif(bytes: Uint8Array): ParsedGif {
  let pos = 0;
  const readByte = (): number => bytes[pos++];
  const readUint16LE = (): number => {
    const value = bytes[pos] | (bytes[pos + 1] << 8);
    pos += 2;
    return value;
  };
  const readAscii = (length: number): string => {
    const text = Array.from(bytes.slice(pos, pos + length), (b) => String.fromCharCode(b)).join("");
    pos += length;
    return text;
  };

  const header = readAscii(6);
  if (header !== "GIF89a") throw new Error(`bad header: ${header}`);

  const width = readUint16LE();
  const height = readUint16LE();
  const packed = readByte();
  const hasGct = (packed & 0x80) !== 0;
  const gctSize = 1 << ((packed & 0x07) + 1);
  readByte(); // background color index
  readByte(); // pixel aspect ratio

  const globalColors: RgbColor[] = [];
  if (hasGct) {
    for (let i = 0; i < gctSize; i++) {
      globalColors.push({ r: readByte(), g: readByte(), b: readByte() });
    }
  }

  let loopForever = false;
  const frames: Array<{ delayCs: number; indices: number[] }> = [];
  let pendingDelayCs = 0;

  const readSubBlocks = (): Uint8Array => {
    const chunks: number[] = [];
    for (;;) {
      const size = readByte();
      if (size === 0) break;
      for (let i = 0; i < size; i++) chunks.push(readByte());
    }
    return Uint8Array.from(chunks);
  };

  for (;;) {
    const marker = readByte();
    if (marker === 0x3b) break; // trailer

    if (marker === 0x21) {
      const label = readByte();
      if (label === 0xf9) {
        const blockSize = readByte();
        readByte(); // packed disposal/transparency flags
        pendingDelayCs = readUint16LE();
        readByte(); // transparent color index
        void blockSize;
        readByte(); // block terminator
      } else if (label === 0xff) {
        const blockSize = readByte();
        const appId = readAscii(blockSize);
        const data = readSubBlocks();
        if (appId === "NETSCAPE2.0" && data[0] === 0x01) loopForever = true;
      } else {
        readSubBlocks();
      }
      continue;
    }

    if (marker === 0x2c) {
      readUint16LE(); // left
      readUint16LE(); // top
      const frameWidth = readUint16LE();
      const frameHeight = readUint16LE();
      readByte(); // local flags (none supported by encodeGif)
      const minCodeSize = readByte();
      const encoded = readSubBlocks();
      const indices = lzwDecode(encoded, minCodeSize);

      expect(indices).toHaveLength(frameWidth * frameHeight);
      frames.push({ delayCs: pendingDelayCs, indices });
      continue;
    }

    throw new Error(`unexpected block marker 0x${marker.toString(16)}`);
  }

  return { width, height, globalColors, loopForever, frames };
}

describe("encodeGif", () => {
  it("round-trips a single 2x2 two-color frame", () => {
    const colors: RgbColor[] = [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 0, b: 255 },
    ];
    const indices = Uint8Array.from([0, 1, 1, 0]);

    const bytes = encodeGif({ width: 2, height: 2, colors, frames: [{ indices, delayCs: 10 }] });
    const parsed = parseGif(bytes);

    expect(parsed.width).toBe(2);
    expect(parsed.height).toBe(2);
    expect(parsed.frames).toHaveLength(1);
    expect(parsed.frames[0].indices).toEqual(Array.from(indices));
    expect(parsed.frames[0].delayCs).toBe(10);
    expect(parsed.globalColors[0]).toEqual(colors[0]);
    expect(parsed.globalColors[1]).toEqual(colors[1]);
  });

  it("round-trips multiple frames with independent delays", () => {
    const colors: RgbColor[] = [
      { r: 10, g: 20, b: 30 },
      { r: 200, g: 210, b: 220 },
    ];
    const frameA = { indices: Uint8Array.from([0, 0, 1, 1]), delayCs: 4 };
    const frameB = { indices: Uint8Array.from([1, 1, 0, 0]), delayCs: 8 };

    const bytes = encodeGif({ width: 2, height: 2, colors, frames: [frameA, frameB] });
    const parsed = parseGif(bytes);

    expect(parsed.frames).toHaveLength(2);
    expect(parsed.frames[0].indices).toEqual(Array.from(frameA.indices));
    expect(parsed.frames[0].delayCs).toBe(4);
    expect(parsed.frames[1].indices).toEqual(Array.from(frameB.indices));
    expect(parsed.frames[1].delayCs).toBe(8);
  });

  it("writes a NETSCAPE2.0 loop-forever extension by default", () => {
    const bytes = encodeGif({
      width: 1,
      height: 1,
      colors: [{ r: 0, g: 0, b: 0 }],
      frames: [{ indices: Uint8Array.from([0]), delayCs: 1 }],
    });
    expect(parseGif(bytes).loopForever).toBe(true);
  });

  it("omits the loop extension when loop is false", () => {
    const bytes = encodeGif({
      width: 1,
      height: 1,
      colors: [{ r: 0, g: 0, b: 0 }],
      frames: [{ indices: Uint8Array.from([0]), delayCs: 1 }],
      loop: false,
    });
    expect(parseGif(bytes).loopForever).toBe(false);
  });

  it("rounds the global color table up to a power of two and pads with black", () => {
    const colors: RgbColor[] = Array.from({ length: 5 }, (_, i) => ({ r: i, g: i, b: i }));
    const bytes = encodeGif({
      width: 1,
      height: 1,
      colors,
      frames: [{ indices: Uint8Array.from([0]), delayCs: 1 }],
    });
    const parsed = parseGif(bytes);

    expect(parsed.globalColors).toHaveLength(8);
    expect(parsed.globalColors[4]).toEqual(colors[4]);
    expect(parsed.globalColors[7]).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("splits large frames across multiple 255-byte LZW sub-blocks without corrupting the data", () => {
    const width = 64;
    const height = 64;
    const colors: RgbColor[] = Array.from({ length: 200 }, (_, i) => ({
      r: (i * 7) % 256,
      g: (i * 13) % 256,
      b: (i * 29) % 256,
    }));
    const indices = Uint8Array.from({ length: width * height }, (_, i) => i % colors.length);

    const bytes = encodeGif({ width, height, colors, frames: [{ indices, delayCs: 5 }] });
    const parsed = parseGif(bytes);

    expect(parsed.frames[0].indices).toEqual(Array.from(indices));
  });

  it("ends with the GIF trailer byte", () => {
    const bytes = encodeGif({
      width: 1,
      height: 1,
      colors: [{ r: 0, g: 0, b: 0 }],
      frames: [{ indices: Uint8Array.from([0]), delayCs: 1 }],
    });
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });
});
