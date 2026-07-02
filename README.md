# Shader Garden

A live GLSL playground: fork a generative-art preset, tweak its uniforms in real time,
and export the result as a looping GIF — all in the browser, no build step to see it run.

## Why

Most "shader toy" experiences are either a black-box iframe or a wall of code with no
feedback loop. Shader Garden is the middle ground: a hand-rolled WebGL2 pipeline that
compiles your fragment shader on every keystroke, reflects its `uniform` declarations
into live controls automatically, and lets you walk away with a shareable artifact
(a looping GIF) instead of just a URL.

## What it does

- **Gallery of presets** — six hand-written generative-art shaders (plasma, flow
  fields, voronoi cells, a ray-marched tunnel, wave interference, kaleidoscope)
  to fork and remix.
- **Fork, don't destroy** — forking a preset copies its source into an editable
  custom slot; the original gallery entry never mutates, so it's always the
  reset target.
- **Live in-browser editor** — a CodeMirror panel edits a fork's fragment source
  directly; edits debounce into a recompile, and its `uniform` controls (sliders,
  color pickers) regenerate automatically from the GLSL declarations. A compile
  error surfaces inline without blanking the last good frame.
- **Reload-safe editing** — the fork you're editing and its uniform values persist
  to `localStorage`, so a page reload picks up right where you left off.
- **Real-time preview** — a fullscreen WebGL2 canvas rendered at device pixel ratio,
  driven by a compact render loop (time, resolution, mouse).
- **GIF export** — capture N frames of the render loop client-side and encode a
  looping GIF, no server round-trip.

## Stack

- **TypeScript** + **Vite** for the dev server and static build.
- **Raw WebGL2** — no three.js/regl. The pipeline (context setup, program
  compile/link, uniform reflection, render loop) is hand-rolled on purpose; that's
  the point of the project.
- **Vitest** for unit tests on the non-GL logic (uniform parsing, preset registry,
  GIF frame timing).

## Status

Core rendering pipeline, gallery/forking, and live in-browser editing (with
reload-safe persistence) are in place; GIF export is next. See
[`docs/VISION.md`](docs/VISION.md) for the full plan,
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the build breakdown, and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a map of the code.

## Development

```bash
npm install
npm run dev      # local dev server with hot reload
npm test         # unit tests
npm run build    # static production build into dist/
```
