import { FrameLoop } from "./app/frame-loop";
import { createGLContext } from "./gl/context";
import { ShaderRenderer, type UniformValue } from "./gl/renderer";
import { parseUniforms, type UniformType } from "./gl/uniforms";
import { PRESETS, getPreset } from "./presets/registry";
import { CustomPresetStore } from "./presets/customStore";
import { isForkedPreset, type ForkedPreset } from "./presets/fork";
import { renderGallery } from "./ui/gallery";
import { renderControls, type ControlValues } from "./ui/controls";
import { crossfadeOut } from "./ui/crossfade";
import { TickPlayer } from "./audio/tick";
import type { ShaderEditor } from "./editor/shaderEditor";
import { debounce } from "./editor/debounce";
import { loadCustomState, saveCustomState } from "./persistence/customState";
import vertexSource from "./shaders/fullscreen.vert.glsl?raw";

const app = document.getElementById("app");
if (!app) throw new Error("missing #app root element");

app.innerHTML = `
  <div class="app-shell">
    <header class="app-header">
      <h1 class="wordmark">Shader Garden</h1>
      <div class="header-actions">
        <button class="editor-toggle" type="button" aria-pressed="false" aria-label="Edit shader source" hidden>&lt;/&gt;</button>
        <button class="mute-toggle" type="button" aria-pressed="false" aria-label="Mute sound"></button>
      </div>
    </header>
    <nav class="gallery-rail" aria-label="Preset gallery"></nav>
    <main class="stage">
      <canvas></canvas>
      <pre class="stage-error" role="alert"></pre>
      <aside class="editor-panel" aria-label="Shader source editor">
        <div class="editor-panel-header">
          <span>Fragment shader</span>
          <button class="editor-close" type="button" aria-label="Close editor">✕</button>
        </div>
        <div class="editor-panel-body"></div>
      </aside>
    </main>
    <footer class="control-dock is-collapsed" aria-label="Uniform controls">
      <button class="control-dock-handle" type="button" aria-label="Toggle uniform controls" aria-expanded="false"></button>
      <div class="control-dock-body"></div>
    </footer>
  </div>
`;

const stageEl = app.querySelector(".stage") as HTMLElement;
const canvas = app.querySelector("canvas") as HTMLCanvasElement;
const galleryEl = app.querySelector(".gallery-rail") as HTMLElement;
const controlsEl = app.querySelector(".control-dock-body") as HTMLElement;
const controlDockEl = app.querySelector(".control-dock") as HTMLElement;
const controlDockHandle = app.querySelector(".control-dock-handle") as HTMLButtonElement;
const errorEl = app.querySelector(".stage-error") as HTMLElement;
const muteButton = app.querySelector(".mute-toggle") as HTMLButtonElement;
const editorToggleButton = app.querySelector(".editor-toggle") as HTMLButtonElement;
const editorCloseButton = app.querySelector(".editor-close") as HTMLButtonElement;
const editorPanelEl = app.querySelector(".editor-panel") as HTMLElement;
const editorPanelBodyEl = app.querySelector(".editor-panel-body") as HTMLElement;

const { gl, resize } = createGLContext(canvas);
const renderer = new ShaderRenderer(gl, vertexSource, PRESETS[0].fragmentSource);
const tick = new TickPlayer();
const customPresets = new CustomPresetStore();

let activePresetId = PRESETS[0].id;
const uniformValues = new Map<string, UniformValue>();
const mouse: [number, number] = [0, 0];

let editor: ShaderEditor | null = null;
let editorOpen = false;

function getActivePreset() {
  return getPreset(activePresetId) ?? customPresets.get(activePresetId);
}

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

/** CodeMirror is a sizeable bundle — deferred behind a dynamic import so the canvas (the hero) never waits on it. */
async function ensureEditor(source: string): Promise<ShaderEditor> {
  if (!editor) {
    const { ShaderEditor } = await import("./editor/shaderEditor");
    editor = new ShaderEditor(editorPanelBodyEl, source, {
      onChange: (nextSource) => debouncedApplyEdit(nextSource),
    });
  } else {
    editor.setSource(source);
  }
  return editor;
}

async function openEditor(): Promise<void> {
  const preset = getActivePreset();
  if (!preset || !isForkedPreset(preset)) return;

  await ensureEditor(preset.fragmentSource);
  editorOpen = true;
  editorPanelEl.dataset.open = "true";
  editorToggleButton.setAttribute("aria-pressed", "true");
  editor?.focus();
}

function closeEditor(): void {
  editorOpen = false;
  editorPanelEl.dataset.open = "false";
  editorToggleButton.setAttribute("aria-pressed", "false");
}

/** Re-syncs the editor toggle/panel to the active preset — call after any preset switch. */
function refreshEditorPanel(): void {
  const preset = getActivePreset();
  const editable = !!preset && isForkedPreset(preset);

  editorToggleButton.hidden = !editable;

  if (!editable) {
    closeEditor();
    return;
  }

  if (editorOpen && preset) void ensureEditor(preset.fragmentSource);
}

function handleUniformChange(name: string, type: UniformType, value: number[]): void {
  uniformValues.set(name, { type, value });

  const preset = getActivePreset();
  if (preset && isForkedPreset(preset)) debouncedPersist(preset);
}

function persistCustomState(preset: ForkedPreset): void {
  const values: Record<string, UniformValue> = {};
  for (const [name, value] of uniformValues) values[name] = value;

  saveCustomState({
    forkedFrom: preset.forkedFrom,
    fragmentSource: preset.fragmentSource,
    uniformValues: values,
  });
}

const debouncedPersist = debounce(persistCustomState, 300);

function loadPreset(
  id: string,
  { crossfade = false, initialValues }: { crossfade?: boolean; initialValues?: ControlValues } = {},
): void {
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
  renderControls(controlsEl, decls, { onChange: handleUniformChange }, initialValues);

  renderGallery(
    galleryEl,
    PRESETS,
    activePresetId,
    { onSelect: swapPreset, onFork: forkAndSwitch },
    customPresets.all,
  );
  tick.tick(880);
  refreshEditorPanel();
  if (isForkedPreset(preset)) persistCustomState(preset);

  if (snapshot) crossfadeOut(stageEl, snapshot);
}

/** Recompiles against a debounced editor edit. Keeps the last-good frame on a compile error (renderer.recompile already leaves the old program intact). */
function applyEditorSource(source: string): void {
  const preset = getActivePreset();
  if (!preset || !isForkedPreset(preset)) return;

  try {
    renderer.recompile(source);
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
    pulseControlDockError();
    return;
  }

  showError(null);
  customPresets.updateSource(preset.id, source);

  const decls = parseUniforms(source);
  renderControls(controlsEl, decls, { onChange: handleUniformChange }, uniformValues);

  persistCustomState({ ...preset, fragmentSource: source });
}

const debouncedApplyEdit = debounce(applyEditorSource, 400);

function pulseControlDockError(): void {
  controlDockEl.classList.remove("control-dock--error");
  void controlDockEl.offsetWidth; // restart the CSS animation
  controlDockEl.classList.add("control-dock--error");
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
  void openEditor();
}

/** Recreates the most-recently-edited fork from localStorage, if any, so a reload doesn't lose in-progress work. */
function restoreCustomPreset(): { id: string; initialValues: ControlValues } | null {
  const persisted = loadCustomState();
  if (!persisted) return null;

  const origin = getPreset(persisted.forkedFrom);
  if (!origin) return null;

  const restored = customPresets.fork(origin);
  customPresets.updateSource(restored.id, persisted.fragmentSource);

  return { id: restored.id, initialValues: new Map(Object.entries(persisted.uniformValues)) };
}

muteButton.addEventListener("click", () => {
  tick.toggle();
  updateMuteButton();
});

editorToggleButton.addEventListener("click", () => {
  if (editorOpen) closeEditor();
  else void openEditor();
});

editorCloseButton.addEventListener("click", closeEditor);

controlDockHandle.addEventListener("click", () => {
  const collapsed = controlDockEl.classList.toggle("is-collapsed");
  controlDockHandle.setAttribute("aria-expanded", String(!collapsed));
});

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse[0] = (event.clientX - rect.left) / rect.width;
  mouse[1] = 1 - (event.clientY - rect.top) / rect.height;
});

updateMuteButton();

const restored = restoreCustomPreset();
if (restored) {
  loadPreset(restored.id, { initialValues: restored.initialValues });
} else {
  loadPreset(activePresetId);
}

const frameLoop = new FrameLoop((timeMs) => {
  resize();
  renderer.render(timeMs / 1000, [canvas.width, canvas.height], mouse, uniformValues);
});

frameLoop.start();
