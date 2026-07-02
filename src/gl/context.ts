import { resolveDevicePixelRatio } from "./dpr";

export interface GLContext {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  resize: () => boolean;
}

/**
 * Creates a WebGL2 context sized to its canvas's CSS box at device pixel
 * ratio, so rendering stays crisp on retina displays. `resize()` is cheap
 * to call every frame — it only touches the canvas when the backing size
 * has actually drifted from the CSS size.
 */
export function createGLContext(canvas: HTMLCanvasElement): GLContext {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: true, // required so a captured frame reflects what was drawn
  });

  if (!gl) {
    throw new Error("WebGL2 is not supported in this browser");
  }

  const resize = (): boolean => {
    const dpr = resolveDevicePixelRatio(window.devicePixelRatio || 1);
    const displayWidth = Math.round(canvas.clientWidth * dpr);
    const displayHeight = Math.round(canvas.clientHeight * dpr);

    const needsResize =
      canvas.width !== displayWidth || canvas.height !== displayHeight;

    if (needsResize) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, displayWidth, displayHeight);
    }

    return needsResize;
  };

  return { gl, canvas, resize };
}
