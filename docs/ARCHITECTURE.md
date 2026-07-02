# Architecture — Shader Garden

A concise map of the codebase for picking up work with fresh context. See
[`VISION.md`](VISION.md) for why, [`BACKLOG.md`](BACKLOG.md) for what's left,
[`DESIGN.md`](DESIGN.md) for the visual language.

## Run it

```bash
npm install
npm run dev      # vite dev server, http://localhost:5173
npm test         # vitest — pure-logic unit tests, no browser needed
npm run build    # tsc -b && vite build -> dist/
npm run lint     # eslint . --ext .ts
```

## Data flow

```
GLSL source (src/shaders/presets/*.frag.glsl)
  -> PRESETS registry (src/presets/registry.ts)
  -> parseUniforms() reflects `uniform` decls + trailing meta comment (src/gl/uniforms.ts)
  -> renderControls() builds sliders/color pickers from the decls (src/ui/controls.ts)
       -> user drags a control -> onChange -> uniformValues Map (src/main.ts)
  -> ShaderRenderer.render() applies uniformValues + uTime/uResolution/uMouse every frame (src/gl/renderer.ts)
```

Selecting a preset in the gallery (`src/ui/gallery.ts`) calls `loadPreset()` in
`main.ts`, which recompiles the program, re-parses uniforms, and re-renders the
control panel — the control panel is always regenerated from source, never
hand-wired per preset.

Editing a fork follows the same pipeline through a different entry point:
`ShaderEditor`'s debounced `onChange` (`src/editor/debounce.ts`, 400ms) calls
`applyEditorSource()` in `main.ts`, which recompiles, commits the edit to the
fork (`CustomPresetStore.updateSource()`), and re-renders the control panel —
passing the *current* uniform values as `initialValues` so `renderControls()`
restores each slider/color picker instead of resetting it to the shader's
meta default. A failed recompile throws before the old program is touched
(`ShaderRenderer.recompile()`), so the last-good frame keeps rendering while
the error surfaces inline.

GIF export is a parallel pipeline off the same `ShaderRenderer` class, driven
independently of the live `FrameLoop`:

```
export panel request (src/ui/exportPanel.ts)
  -> exportGif() renders the active fragment source on a detached WebGL2
     canvas at fixed timestamps (src/export/frameTiming.ts), reading back
     each frame with gl.readPixels (src/export/gifExporter.ts)
  -> buildHistogram() + quantize() build one shared 256-color palette across
     every captured frame via median-cut (src/gif/quantize.ts)
  -> quantizeFrame() maps each frame's pixels to palette indices
  -> encodeGif() LZW-encodes each frame (src/gif/lzw.ts) and assembles a
     complete GIF89a byte stream (src/gif/encoder.ts) -> Blob -> download link
```

## Modules

- **`src/gl/`** — the hand-rolled WebGL2 pipeline, no scene-graph library.
  - `context.ts` — creates the WebGL2 context; `resize()` keeps the canvas's
    backing buffer in sync with its CSS box at a clamped device pixel ratio.
  - `dpr.ts` — pure `resolveDevicePixelRatio()`, capped at 2x (see inline doc
    for why uncapped DPR is a real perf problem on retina phones).
  - `program.ts` — compile/link with typed `ShaderCompileError` /
    `ProgramLinkError` so callers can surface the raw GL info log.
  - `uniforms.ts` — `parseUniforms()`, the reflection step described in
    VISION.md: regexes `uniform <type> <name>; // key:val key:val` out of
    fragment source. This is the whole "schema" — no manifest files.
  - `renderer.ts` — `ShaderRenderer` owns the current GL program, swaps it on
    `recompile()` (previous program keeps rendering if the new one fails to
    compile), and draws a fullscreen triangle every frame.
- **`src/presets/`** — the preset registry and forking.
  - `registry.ts` — `PRESETS`, a static, immutable array of `{ id, name,
    description, fragmentSource }`. Never mutated at runtime.
  - `fork.ts` — `forkPreset()` copies a preset's source under a new id
    (`forkedFrom` records the original). Pure function, no state.
    `isForkedPreset()` is the type guard the app shell uses to decide
    whether the editor/persistence apply to the active preset.
  - `customStore.ts` — `CustomPresetStore`, the session-lifetime list of
    forks. Kept separate from `PRESETS` so a fork can never replace an
    original gallery entry. `updateSource()` overwrites a fork's source in
    place — the editor's hot-recompile path commits edits here rather than
    holding a second, divergent copy of the text.
- **`src/ui/`** — DOM rendering, no framework.
  - `gallery.ts` — renders the preset rail: one card per `PRESETS` entry (with
    a fork button), then a "Custom" section for anything in the
    `CustomPresetStore`.
  - `controls.ts` — renders the uniform control panel from `UniformDecl[]`;
    a `vec3` with a `color` meta flag becomes a color input, `float`/`int`
    become range sliders. Anything else is skipped rather than guessed at.
    Takes an optional `initialValues` map (`ControlValues`) so a re-render
    after a hot-recompile can restore a control to its current value
    instead of the shader's meta default.
  - `color.ts` — `hexToRgb()`/`rgbToHex()`, the color-input <-> shader-uniform
    conversion (`rgbToHex` is what lets a color control's re-render reflect
    a live uniform value rather than only ever the meta default).
  - `crossfade.ts` — `crossfadeOut()` overlays a snapshot `<img>` over the
    stage and fades it out, so a preset swap dissolves instead of hard-cutting.
- **`src/editor/`** — the live source editor for a forked preset.
  - `shaderEditor.ts` — `ShaderEditor`, a CodeMirror 6 view themed to the
    blueprint palette (`cpp()` provides GLSL-adjacent syntax highlighting —
    there's no dedicated GLSL language package). `onChange` fires only for
    user edits, not for the programmatic `setSource()` used when switching
    which fork is displayed (distinguished via the transaction's
    `userEvent` annotation). Loaded behind a dynamic `import()` in
    `main.ts` so its ~500KB doesn't block the canvas's first frame.
  - `debounce.ts` — generic `debounce()` with injectable timer functions
    (same DI pattern as `FrameLoop`). Used both for edit-triggered
    recompiles (400ms) and edit-triggered persistence writes (300ms).
- **`src/gif/`** — a from-scratch GIF89a encoder, no dependency, in keeping
  with the "hand-rolled, no scene-graph library" philosophy for the WebGL
  pipeline above.
  - `quantize.ts` — `buildHistogram()` counts every distinct RGB color across
    all captured frames; `quantize()` is median-cut color quantization that
    recursively splits the widest-range bucket at its weighted median until
    a target palette size is reached, tagging every source color with its
    bucket's index as it goes. That gives `QuantizedPalette.indexOf()` an
    exact O(1) lookup for any color that was actually captured — brute-force
    nearest-color search (`nearestColorIndex()`) is only a defensive
    fallback. `quantizeFrame()` maps a pixel buffer to palette indices.
  - `lzw.ts` — `lzwEncode()`, GIF's variable-width LZW variant (12-bit max
    code, in-stream dictionary reset at 4096 entries). The code-size growth
    check intentionally fires one code later than textbook LZW — see the
    inline comment — because a decoder can only build its matching
    dictionary entry one code after the encoder does.
  - `encoder.ts` — `encodeGif()` assembles the full byte stream: header,
    global color table (padded to a power of two), an optional NETSCAPE2.0
    loop extension, and a graphic control extension + image descriptor +
    LZW sub-blocks per frame.
- **`src/export/`** — the capture/orchestration layer between the renderer
  and the GIF encoder.
  - `frameTiming.ts` — `computeFrameTimestamps()`, fixed-cadence capture
    timestamps at a target fps, independent of whatever rate the live
    `FrameLoop` happens to be painting at.
  - `gifExporter.ts` — `exportGif()` renders the requested fragment source
    on a fresh, detached `<canvas>`/WebGL2 context sized to the export
    resolution, looping over `computeFrameTimestamps()` and reading back
    each frame with `gl.readPixels` (flipped vertically — GL's origin is
    bottom-left, GIF rows are top-left-first). Yields to the event loop
    every few frames so a multi-second capture doesn't freeze the UI, then
    quantizes and encodes the result into a `Blob`. Not unit-tested (needs
    a real WebGL2 context) — verify by running the export panel in a
    browser.
- **`src/persistence/customState.ts`** — `saveCustomState()`/
  `loadCustomState()`/`clearCustomState()`, best-effort `localStorage`
  persistence (one entry: the most-recently-edited fork's source + uniform
  values) so a reload restores in-progress editing. A runtime shape check
  on load treats a corrupted or stale value as absent rather than crashing.
- **`src/util/safeStorage.ts`** — `safeLocalStorage()`, guarded
  `window.localStorage` access shared by `TickPlayer` and
  `persistence/customState.ts`.
- **`src/app/`**
  - `frame-loop.ts` — `FrameLoop` wraps `requestAnimationFrame` and pauses
    itself on `document.visibilitychange` so a backgrounded tab stops
    rendering. Deps (raf/caf/visibility) are injectable for testing.
- **`src/audio/tick.ts`** — `TickPlayer`, a single WebAudio-synthesized UI
  blip (no audio files) with a `localStorage`-persisted mute flag. Every
  method no-ops without an `AudioContext` (tests, older browsers).
- **`src/ui/exportPanel.ts`** — `renderExportPanel()`, the size/duration/fps
  controls + export button + progress bar + download link. Rendered once
  (unlike `controls.ts`, it doesn't get rebuilt per preset swap) and owns
  its own in-progress/success/failure button states.
- **`src/main.ts`** — wires all of the above into the app shell: builds the
  DOM skeleton, owns the active-preset/uniform-values state, opens/closes
  the editor panel, drives the `FrameLoop`, and hands `exportGif()` the
  active preset's source, current uniform values, and the live render's
  current shader-clock time (so an export continues from what's on screen
  instead of restarting at t=0).

## Testing approach

`tests/` covers pure logic only (uniform parsing, DPR clamp, fork/store
isolation, frame-loop scheduling with injected fakes, color conversion, mute
persistence, edit-recompile debouncing, custom-state save/load, GIF frame
timing, median-cut quantization, LZW encoding, and full GIF89a byte-stream
assembly) — see `vite.config.ts`'s `test.environment: "node"`. The LZW and
GIF encoder tests round-trip their output through a hand-written decoder/
parser in the test file itself — the strongest correctness check available
without an external reference GIF. DOM-heavy modules (`gallery.ts`,
`controls.ts`, `crossfade.ts`, `shaderEditor.ts`, `exportPanel.ts`) and the
WebGL-dependent `gifExporter.ts` are intentionally left untested at the unit
level: this environment's Node version predates what the current `jsdom`
requires (confirmed by trying it — `ERR_REQUIRE_ESM` from a transitive dep),
so DOM/WebGL assertions aren't practical here. Verify UI changes by running
`npm run dev` and checking in a real/headless browser instead (a Playwright
+ Chromium install is available in this environment for that).

## Build & deploy

Static output only — `vite.config.ts` sets `base: "./"` so the build works
from a subpath (`apps.charliekrug.com/shader-garden`) as well as a domain
root. `npm run build` produces `dist/` (`index.html` + hashed `assets/`),
servable as-is with no backend.
