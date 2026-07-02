import { ShaderRenderer } from "../gl/renderer";
import { parseUniforms } from "../gl/uniforms";
import { defaultUniformValues } from "./defaultUniforms";

const THUMBNAIL_SIZE = 96;
/** A moment past t=0 so periodic shaders (waves, plasma) aren't caught at a flat starting frame. */
const THUMBNAIL_TIME_SECONDS = 1.5;

/**
 * Renders one static frame of a preset off-screen at a small fixed size and
 * returns it as a data URL for a gallery card's background image. Returns
 * `null` rather than throwing on any failure (unsupported WebGL2, a broken
 * shader) so a missing thumbnail degrades to the card's plain background
 * instead of breaking the gallery.
 */
export function renderThumbnail(vertexSource: string, fragmentSource: string): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = THUMBNAIL_SIZE;
    canvas.height = THUMBNAIL_SIZE;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      preserveDrawingBuffer: true,
    }) as WebGL2RenderingContext | null;
    if (!gl) return null;

    const renderer = new ShaderRenderer(gl, vertexSource, fragmentSource);
    const uniformValues = defaultUniformValues(parseUniforms(fragmentSource));
    renderer.render(THUMBNAIL_TIME_SECONDS, [THUMBNAIL_SIZE, THUMBNAIL_SIZE], [0.5, 0.5], uniformValues);

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
