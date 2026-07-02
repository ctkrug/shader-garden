/** Packs variable-width codes LSB-first into a byte stream, as GIF's LZW variant requires. */
class BitWriter {
  private readonly bytes: number[] = [];
  private buffer = 0;
  private bufferBits = 0;

  writeCode(code: number, size: number): void {
    this.buffer |= code << this.bufferBits;
    this.bufferBits += size;
    while (this.bufferBits >= 8) {
      this.bytes.push(this.buffer & 0xff);
      this.buffer >>= 8;
      this.bufferBits -= 8;
    }
  }

  finish(): Uint8Array {
    if (this.bufferBits > 0) {
      this.bytes.push(this.buffer & 0xff);
      this.buffer = 0;
      this.bufferBits = 0;
    }
    return Uint8Array.from(this.bytes);
  }
}

/**
 * GIF-flavor LZW encoding of a palette-index buffer: codes 0..2^minCodeSize-1
 * are the literal palette indices, `clearCode` (2^minCodeSize) resets the
 * dictionary, `endCode` (clearCode + 1) terminates the stream. Code width
 * grows from minCodeSize+1 up to 12 bits as the dictionary fills, and the
 * dictionary auto-resets (with an explicit clear code) at the 4096-entry
 * limit rather than growing unbounded.
 *
 * Returns the raw encoded bit stream only — sub-block framing (255-byte
 * chunks + terminator) is the caller's concern (see `encoder.ts`).
 */
export function lzwEncode(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const writer = new BitWriter();

  let dict = new Map<number, number>();
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;

  const packKey = (prefixCode: number, suffix: number): number => prefixCode * 256 + suffix;

  const resetDict = (): void => {
    dict = new Map();
    codeSize = minCodeSize + 1;
    nextCode = endCode + 1;
  };

  writer.writeCode(clearCode, codeSize);

  if (indices.length === 0) {
    writer.writeCode(endCode, codeSize);
    return writer.finish();
  }

  let prefixCode = indices[0];

  for (let i = 1; i < indices.length; i++) {
    const suffix = indices[i];
    const key = packKey(prefixCode, suffix);
    const existing = dict.get(key);

    if (existing !== undefined) {
      prefixCode = existing;
      continue;
    }

    writer.writeCode(prefixCode, codeSize);

    if (nextCode === 4096) {
      writer.writeCode(clearCode, codeSize);
      resetDict();
    } else {
      dict.set(key, nextCode);
      nextCode++;
      // A decoder can only add its own matching dictionary entry one code
      // *after* the encoder does (it needs the following code's first byte
      // to complete the entry), so growing here one code "late" relative to
      // the naive `nextCode >= 2^codeSize` keeps both sides reading/writing
      // the same bit width at every position in the stream.
      if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
    }

    prefixCode = suffix;
  }

  writer.writeCode(prefixCode, codeSize);
  writer.writeCode(endCode, codeSize);

  return writer.finish();
}
