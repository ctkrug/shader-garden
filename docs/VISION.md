# Vision — Shader Garden

## The problem

Shader playgrounds today force a choice: a curated black box (a preset gallery you can only
look at) or a raw code editor with zero guidance (a wall of GLSL and a Compile button). Neither
gives you the loop that actually teaches you shaders — pick something that already looks good,
change one number, watch it respond instantly, and walk away with something to show for it.

## Who it's for

People curious about generative art and graphics programming who know a little JavaScript but
not GLSL — plus anyone who just wants to make a pretty looping GIF without installing Processing
or After Effects. The gallery is the on-ramp; the live editor is where curiosity turns into
actual shader literacy.

## The core idea

A fragment shader IS the artwork, and its `uniform` declarations ARE the control surface. Rather
than hand-building a UI per preset, Shader Garden **reflects** the GLSL source: parse the
`uniform` lines, read UI hints from a trailing comment (`min:0 max:5 default:1.2`), and generate
sliders/color pickers automatically. Editing a shader's uniforms — even in a forked custom
shader — regenerates its controls with no extra code. That reflection step is the whole product;
everything else (gallery, export) is scaffolding around it.

## Key design decisions

- **Hand-rolled WebGL2, no three.js/regl.** The pipeline (context, program compile/link,
  uniform reflection, render loop) is the point of the project — pulling in a scene-graph
  library would hide the graphics fundamentals this project exists to showcase.
- **Convention over configuration for uniforms.** A trailing `// min:0 max:5 default:1.2`
  comment is the entire "schema" — no separate JSON manifest per preset to keep in sync with
  the shader source, and it reads naturally right where the value is declared.
  See [`src/gl/uniforms.ts`](../src/gl/uniforms.ts).
  - Ambition: a preset degrades gracefully if it changes over time — see the
    [design direction](DESIGN.md) if the visual language ever needs a second pass.
- **Client-side GIF export, no server.** The whole point is a static, zero-backend site
  (see the servable-site build notes in the repo). Frame capture and GIF encoding both happen
  in the browser off the same canvas the user is already looking at.
- **Fork, don't destroy.** Editing a shader always starts from a copy of a preset — the original
  gallery entries never mutate, so "reset to original" is just reloading the preset.

## What "v1 done" looks like

- The gallery ships with a handful of hand-written presets spanning different techniques
  (wave interference, domain-warped noise, cellular patterns, ray marching).
- Editing a shader's source hot-recompiles on debounce, regenerates the uniform panel from the
  new declarations, and surfaces compile errors inline without blanking the last good frame.
- Uniform edits (sliders, color pickers) update the render in real time with no perceptible lag.
- A user can export the current render as a looping GIF (configurable duration/fps/resolution)
  entirely client-side and download it.
- The whole app builds to a single static `dist/` directory deployable to a subpath
  (`apps.charliekrug.com/shader-garden`) with relative asset paths and no server dependency.
- The page follows [`docs/DESIGN.md`](DESIGN.md)'s blueprint/technical direction end to end —
  the canvas is the hero at every breakpoint, every control is themed, nothing reads as a stub.
