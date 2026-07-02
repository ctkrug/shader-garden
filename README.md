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

- **Gallery of presets** — a handful of hand-written generative-art shaders (plasma,
  flow fields, voronoi cells, kaleidoscopic ray marching) to fork and remix.
- **Hot-reloading uniforms** — edit a shader's source and its `uniform` controls
  (sliders, color pickers) regenerate automatically from the GLSL declarations.
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

Early scaffold — see [`docs/VISION.md`](docs/VISION.md) for the full plan and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the build breakdown.

## Development

```bash
npm install
npm run dev      # local dev server with hot reload
npm test         # unit tests
npm run build    # static production build into dist/
```
