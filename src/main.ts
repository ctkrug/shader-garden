import { FrameLoop } from "./app/frame-loop";
import { createGLContext } from "./gl/context";
import { ShaderRenderer, type UniformValue } from "./gl/renderer";
import { parseUniforms, type UniformType } from "./gl/uniforms";
import { PRESETS, getPreset } from "./presets/registry";
import { CustomPresetStore } from "./presets/customStore";
import { isForkedPreset, type ForkedPreset } from "./presets/fork";
import { renderGallery } from "./ui/gallery";
import { renderThumbnail } from "./presets/thumbnail";
import { renderControls, type ControlValues } from "./ui/controls";
import { renderExportPanel } from "./ui/exportPanel";
import { crossfadeOut } from "./ui/crossfade";
import { exportGif } from "./export/gifExporter";
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
        <a class="header-link" href="https://github.com/ctkrug/shader-garden" target="_blank" rel="noopener" aria-label="View source on GitHub">
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
        </a>
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
      <div class="control-dock-body">
        <div class="uniform-controls"></div>
        <div class="export-panel" aria-label="Export as GIF"></div>
      </div>
    </footer>
  </div>
  <section class="page-info" aria-labelledby="about-heading">
    <div class="page-info-inner">
      <h2 id="about-heading">Write a fragment shader, watch it react, keep the GIF</h2>
      <p class="page-info-lead">
        Shader Garden is a GLSL playground that runs entirely in your browser. Start from one of six
        hand-written generative-art presets, fork it into an editable copy, and change its code or its
        controls while the render updates live. When you like what you see, export it as a looping GIF
        and download it. No account, no build step, no server round-trip.
      </p>

      <div class="page-info-cols">
        <article>
          <h3>Controls that build themselves</h3>
          <p>
            Every slider and color picker is generated from the shader source. Declare a uniform with a
            trailing hint like <code>// min:0 max:5 default:1.2</code> and Shader Garden reflects it into
            a labelled control. Edit the shader and the panel regenerates as you type.
          </p>
        </article>
        <article>
          <h3>Fork, don't destroy</h3>
          <p>
            Editing always starts from a copy, so the original presets never change and resetting is just
            reselecting one. Your fork and its values persist to local storage, so a reload picks up right
            where you left off.
          </p>
        </article>
        <article>
          <h3>A GIF, not just a link</h3>
          <p>
            Pick a size, length, and frame rate. Shader Garden renders your shader off-screen at a fixed
            cadence, quantizes the frames to a shared palette, and writes a GIF89a file client-side. The
            encoder is hand-written, same as the WebGL pipeline.
          </p>
        </article>
      </div>

      <h3 class="page-info-faq-heading">Questions</h3>
      <dl class="page-info-faq">
        <dt>Do I need to know GLSL to use it?</dt>
        <dd>No. Start by dragging the sliders on a preset. When you want to go further, fork one and read
          its code next to the live render.</dd>

        <dt>Where do my GIFs get made?</dt>
        <dd>In your browser. Frame capture, color quantization, and GIF encoding all run client-side, so
          nothing you make is uploaded anywhere.</dd>

        <dt>Can I break a preset?</dt>
        <dd>Only your fork. A compile error shows inline and the last working frame keeps rendering, so a
          typo mid-edit never blanks the canvas.</dd>

        <dt>What browsers work?</dt>
        <dd>Any current desktop or mobile browser with WebGL2. The canvas renders at your device pixel
          ratio, so it stays sharp on high-density screens.</dd>

        <dt>Is it free and open source?</dt>
        <dd>Yes, MIT licensed. The full source, including the from-scratch GIF encoder, is on GitHub.</dd>
      </dl>

      <a class="page-cta" href="https://github.com/ctkrug/shader-garden" target="_blank" rel="noopener">View the source on GitHub</a>
    </div>
  </section>
  <footer class="page-footer">
    <span class="page-footer-mark">Shader Garden</span>
    <a href="https://apps.charliekrug.com" target="_blank" rel="noopener">More by Charlie Krug → apps.charliekrug.com</a>
  </footer>
`;

const stageEl = app.querySelector(".stage") as HTMLElement;
const canvas = app.querySelector("canvas") as HTMLCanvasElement;
const galleryEl = app.querySelector(".gallery-rail") as HTMLElement;
const controlsEl = app.querySelector(".uniform-controls") as HTMLElement;
const exportPanelEl = app.querySelector(".export-panel") as HTMLElement;
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

/** One off-screen render per gallery preset, up front — cheap relative to a compile, and keeps loadPreset() free of GL work unrelated to the active shader. */
const presetThumbnails = new Map(
  PRESETS.map((preset) => [preset.id, renderThumbnail(vertexSource, preset.fragmentSource)] as const).filter(
    (entry): entry is [string, string] => entry[1] !== null,
  ),
);

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

  // Drop any in-flight debounced edit-apply/persist from whatever fork was
  // previously active — left pending, it would fire after this swap and
  // recompile/persist the *new* active preset with the *old* one's source.
  debouncedApplyEdit.cancel();
  debouncedPersist.cancel();

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
    presetThumbnails,
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
  void openEditor();
} else {
  loadPreset(activePresetId);
}

let currentTimeSeconds = 0;

const frameLoop = new FrameLoop((timeMs) => {
  resize();
  currentTimeSeconds = timeMs / 1000;
  renderer.render(currentTimeSeconds, [canvas.width, canvas.height], mouse, uniformValues);
});

renderExportPanel(exportPanelEl, {
  onExport: (request, onProgress) => {
    const preset = getActivePreset();
    if (!preset) return Promise.reject(new Error("no active preset to export"));

    return exportGif({
      vertexSource,
      fragmentSource: preset.fragmentSource,
      uniformValues,
      mouse,
      startTimeSeconds: currentTimeSeconds,
      ...request,
      onProgress,
    });
  },
});

frameLoop.start();
