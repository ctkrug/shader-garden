import type { RgbColor } from "./quantize";
import { lzwEncode } from "./lzw";

export interface GifFrame {
  /** Palette index per pixel, `width * height` entries, row-major top-left origin. */
  indices: Uint8Array;
  /** Frame display duration in hundredths of a second. */
  delayCs: number;
}

export interface EncodeGifOptions {
  width: number;
  height: number;
  colors: readonly RgbColor[];
  frames: readonly GifFrame[];
  /** Loop forever via a Netscape2.0 application extension. Defaults to true. */
  loop?: boolean;
}

class ByteWriter {
  private readonly bytes: number[] = [];

  byte(value: number): this {
    this.bytes.push(value & 0xff);
    return this;
  }

  ascii(text: string): this {
    for (let i = 0; i < text.length; i++) this.byte(text.charCodeAt(i));
    return this;
  }

  uint16LE(value: number): this {
    return this.byte(value & 0xff).byte((value >> 8) & 0xff);
  }

  finish(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

/** Bits needed to index a palette of this size, clamped to GIF's [2, 8] range. */
function colorTableBitDepth(paletteLength: number): number {
  let bits = 1;
  while (1 << bits < paletteLength) bits++;
  return Math.max(2, Math.min(8, bits));
}

/**
 * Assembles a complete, from-scratch GIF89a byte stream: header, global
 * color table, an optional NETSCAPE2.0 loop extension, and one graphic
 * control extension + image descriptor + LZW sub-blocks per frame. No
 * local color tables, no interlacing, no transparency — the shader render
 * this exports never needs them.
 */
export function encodeGif(options: EncodeGifOptions): Uint8Array {
  const { width, height, colors, frames } = options;
  const loop = options.loop ?? true;

  const bits = colorTableBitDepth(colors.length);
  const tableSize = 1 << bits;

  const writer = new ByteWriter();
  writer.ascii("GIF89a");
  writer.uint16LE(width);
  writer.uint16LE(height);

  const globalColorTableFlag = 0x80;
  const colorResolution = (bits - 1) << 4;
  const sizeField = bits - 1;
  writer.byte(globalColorTableFlag | colorResolution | sizeField);
  writer.byte(0); // background color index
  writer.byte(0); // pixel aspect ratio (square pixels)

  for (let i = 0; i < tableSize; i++) {
    const color = colors[i] ?? { r: 0, g: 0, b: 0 };
    writer.byte(color.r).byte(color.g).byte(color.b);
  }

  if (loop) {
    writer.byte(0x21).byte(0xff).byte(0x0b);
    writer.ascii("NETSCAPE2.0");
    writer.byte(0x03).byte(0x01).uint16LE(0).byte(0x00); // sub-block: loop count 0 = forever
  }

  for (const frame of frames) {
    writer.byte(0x21).byte(0xf9).byte(0x04); // graphic control extension, 4 data bytes
    writer.byte(0x00); // disposal unspecified, no user input flag, no transparency
    writer.uint16LE(frame.delayCs);
    writer.byte(0x00); // transparent color index (unused)
    writer.byte(0x00); // block terminator

    writer.byte(0x2c); // image descriptor
    writer.uint16LE(0); // left
    writer.uint16LE(0); // top
    writer.uint16LE(width);
    writer.uint16LE(height);
    writer.byte(0x00); // no local color table, no interlace

    writer.byte(bits); // LZW minimum code size
    const encoded = lzwEncode(frame.indices, bits);
    for (let offset = 0; offset < encoded.length; offset += 255) {
      const end = Math.min(offset + 255, encoded.length);
      writer.byte(end - offset);
      for (let i = offset; i < end; i++) writer.byte(encoded[i]);
    }
    writer.byte(0x00); // block terminator
  }

  writer.byte(0x3b); // trailer
  return writer.finish();
}
