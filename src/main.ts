import { FrameLoop } from "./app/frame-loop";
import { createGLContext } from "./gl/context";
import { ShaderRenderer, type UniformValue } from "./gl/renderer";
import { parseUniforms, type UniformType } from "./gl/uniforms";
import { PRESETS, getPreset } from "./presets/registry";
import { CustomPresetStore } from "./presets/customStore";
import { renderGallery } from "./ui/gallery";
import { renderControls } from "./ui/controls";
import { crossfadeOut } from "./ui/crossfade";
import { TickPlayer } from "./audio/tick";
import vertexSource from "./shaders/fullscreen.vert.glsl?raw";

const app = document.getElementById("app");
if (!app) throw new Error("missing #app root element");

app.innerHTML = `
  <div class="app-shell">
    <header class="app-header">
      <h1 class="wordmark">Shader Garden</h1>
      <button class="mute-toggle" type="button" aria-pressed="false" aria-label="Mute sound"></button>
    </header>
    <nav class="gallery-rail" aria-label="Preset gallery"></nav>
    <main class="stage">
      <canvas></canvas>
      <pre class="stage-error" role="alert"></pre>
    </main>
    <footer class="control-dock" aria-label="Uniform controls"></footer>
  </div>
`;

const stageEl = app.querySelector(".stage") as HTMLElement;
const canvas = app.querySelector("canvas") as HTMLCanvasElement;
const galleryEl = app.querySelector(".gallery-rail") as HTMLElement;
const controlsEl = app.querySelector(".control-dock") as HTMLElement;
const errorEl = app.querySelector(".stage-error") as HTMLElement;
const muteButton = app.querySelector(".mute-toggle") as HTMLButtonElement;

const { gl, resize } = createGLContext(canvas);
const renderer = new ShaderRenderer(gl, vertexSource, PRESETS[0].fragmentSource);
const tick = new TickPlayer();
const customPresets = new CustomPresetStore();

let activePresetId = PRESETS[0].id;
const uniformValues = new Map<string, UniformValue>();
const mouse: [number, number] = [0, 0];

function updateMuteButton(): void {
  muteButton.textContent = tick.isMuted ? "🔇" : "🔊";
  muteButton.setAttribute("aria-pressed", String(tick.isMuted));
}

function showError(message: string | null): void {
  errorEl.textContent = message ?? "";
}

function captureFrameSnapshot(): string | null {
  try {
    return canvas.toDataURL("image/png");
  } catch {
    // Not fatal — the swap just happens as a hard cut instead of a dissolve.
    return null;
  }
}

function loadPreset(id: string, { crossfade = false } = {}): void {
  const preset = getPreset(id) ?? customPresets.get(id);
  if (!preset) return;

  const snapshot = crossfade ? captureFrameSnapshot() : null;

  try {
    renderer.recompile(preset.fragmentSource);
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
    return;
  }

  showError(null);
  activePresetId = id;
  uniformValues.clear();

  const decls = parseUniforms(preset.fragmentSource);
  renderControls(controlsEl, decls, {
    onChange: (name: string, type: UniformType, value: number[]) => {
      uniformValues.set(name, { type, value });
    },
  });

  renderGallery(
    galleryEl,
    PRESETS,
    activePresetId,
    { onSelect: swapPreset, onFork: forkAndSwitch },
    customPresets.all,
  );
  tick.tick(880);

  if (snapshot) crossfadeOut(stageEl, snapshot);
}

function swapPreset(id: string): void {
  if (id === activePresetId) return;
  loadPreset(id, { crossfade: true });
}

function forkAndSwitch(sourceId: string): void {
  const source = getPreset(sourceId);
  if (!source) return;

  const forked = customPresets.fork(source);
  loadPreset(forked.id, { crossfade: true });
}

muteButton.addEventListener("click", () => {
  tick.toggle();
  updateMuteButton();
});

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse[0] = (event.clientX - rect.left) / rect.width;
  mouse[1] = 1 - (event.clientY - rect.top) / rect.height;
});

updateMuteButton();
loadPreset(activePresetId);

const frameLoop = new FrameLoop((timeMs) => {
  resize();
  renderer.render(timeMs / 1000, [canvas.width, canvas.height], mouse, uniformValues);
});

frameLoop.start();
