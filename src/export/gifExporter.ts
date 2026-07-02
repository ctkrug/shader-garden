import { ShaderRenderer, type UniformValue } from "../gl/renderer";
import { buildHistogram, quantize, quantizeFrame } from "../gif/quantize";
import { encodeGif } from "../gif/encoder";
import { computeFrameTimestamps, delayCentiseconds } from "./frameTiming";

export interface ExportGifOptions {
  vertexSource: string;
  fragmentSource: string;
  uniformValues: ReadonlyMap<string, UniformValue>;
  mouse: readonly [number, number];
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  /** Shader clock to start the capture at, so the export continues from wherever the live render currently is instead of jumping back to t=0. */
  startTimeSeconds: number;
  /** Called with (stepsDone, stepsTotal) across both the render/readback pass and the quantize/encode pass. */
  onProgress?: (stepsDone: number, stepsTotal: number) => void;
}

/**
 * Renders the given shader off-screen at a fixed capture cadence — its own
 * loop over `computeFrameTimestamps()`, entirely decoupled from the live
 * render loop's `requestAnimationFrame` timing — then quantizes and
 * LZW-encodes the captured frames into a looping GIF. Runs end to end in
 * the browser with no server round-trip.
 */
export async function exportGif(options: ExportGifOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;

  const gl = canvas.getContext("webgl2", {
    alpha: false,
    preserveDrawingBuffer: true,
  }) as WebGL2RenderingContext | null;
  if (!gl) throw new Error("WebGL2 is unavailable — cannot render an off-screen export capture");

  const renderer = new ShaderRenderer(gl, options.vertexSource, options.fragmentSource);
  const timestamps = computeFrameTimestamps({ fps: options.fps, durationSeconds: options.durationSeconds });
  const delayCs = delayCentiseconds(options.fps);
  const totalSteps = timestamps.length * 2; // capture pass + quantize/encode pass

  const rgbaFrames: Uint8ClampedArray[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    renderer.render(
      options.startTimeSeconds + timestamps[i],
      [options.width, options.height],
      options.mouse,
      options.uniformValues,
    );

    const raw = new Uint8ClampedArray(options.width * options.height * 4);
    gl.readPixels(0, 0, options.width, options.height, gl.RGBA, gl.UNSIGNED_BYTE, raw);
    rgbaFrames.push(flipVertically(raw, options.width, options.height));

    options.onProgress?.(i + 1, totalSteps);
    if (i % 4 === 3) await yieldToBrowser();
  }

  const palette = quantize(buildHistogram(rgbaFrames), 256);

  const frames = [];
  for (let i = 0; i < rgbaFrames.length; i++) {
    frames.push({ indices: quantizeFrame(rgbaFrames[i], palette), delayCs });
    options.onProgress?.(timestamps.length + i + 1, totalSteps);
    if (i % 4 === 3) await yieldToBrowser();
  }

  const gifBytes = encodeGif({ width: options.width, height: options.height, colors: palette.colors, frames, loop: true });
  return new Blob([gifBytes.buffer as ArrayBuffer], { type: "image/gif" });
}

/** `gl.readPixels` origin is bottom-left; GIF rows are stored top-left-first. */
function flipVertically(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  const rowBytes = width * 4;
  for (let y = 0; y < height; y++) {
    const srcStart = y * rowBytes;
    const dstStart = (height - 1 - y) * rowBytes;
    out.set(pixels.subarray(srcStart, srcStart + rowBytes), dstStart);
  }
  return out;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
