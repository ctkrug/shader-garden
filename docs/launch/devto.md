---
title: "I built a browser shader playground where the controls write themselves"
published: false
tags: webgl, glsl, typescript, javascript
---

Most shader playgrounds make you pick a side. Either it's a gallery you can only look at, or
it's a raw code editor with a Compile button and no guardrails. Neither gives you the loop that
actually teaches you shaders: pick something that already looks good, change one number, watch
it respond, and keep the result.

So I built [Shader Garden](https://apps.charliekrug.com/shader-garden/): a GLSL playground that
runs entirely in the browser. You fork a generative-art preset, tweak it live, and export a
looping GIF. It's TypeScript and raw WebGL2, no three.js. Here are the two build decisions I
found most interesting.

## The uniform declarations are the UI

The core idea is that a fragment shader already describes its own control surface. Every
tweakable value is a `uniform`, so instead of hand-building a panel per preset, I reflect the
source.

A shader declares its knobs like this:

```glsl
uniform float uSpeed; // min:0 max:5 default:1.2 step:0.05
uniform vec3  uColor;  // color default:#ff8844
```

A small regex pulls out the type, the name, and the trailing `key:value` comment. A `float`
becomes a range slider with those bounds, a `vec3` flagged `color` becomes a color picker. That
trailing comment is the entire schema. There's no JSON manifest to keep in sync with the source,
and the hint reads naturally right where the value is declared.

The payoff shows up when you edit a shader. Add a new uniform in the editor, and the control
panel regenerates on the next recompile with a slider for it already wired up. The reflection
step is maybe forty lines of code, and it's the whole product. Everything else is scaffolding
around it.

One thing I had to get right: when the panel rebuilds after an edit, sliders you already moved
need to keep their values instead of snapping back to the shader's default. So the re-render
takes the current uniform values as overrides and only falls back to the meta `default:` for
uniforms it hasn't seen before.

## A GIF encoder, from scratch, in the browser

I wanted people to walk away with a file, not a link. That meant encoding a GIF client-side, and
I decided to write the encoder by hand to match the no-library spirit of the WebGL pipeline.

The pipeline renders the shader off-screen at a fixed cadence (independent of whatever rate the
live canvas is painting at), reads back each frame with `gl.readPixels`, and then does the two
hard parts of GIF encoding:

- **Color quantization.** GIF allows 256 colors per frame. I build one histogram across every
  captured frame and run median-cut quantization to pick a single shared palette, so the whole
  loop is color-consistent instead of flickering between per-frame palettes. Every color that
  was actually captured gets an exact palette index during the split, which makes the per-pixel
  lookup O(1).
- **LZW.** GIF uses a variable-width LZW variant with an in-stream dictionary reset at 4096
  entries. The subtle bug here is the code-size growth check: it has to fire one code later than
  a textbook LZW encoder, because a decoder can only build its matching dictionary entry one step
  behind you. I only trusted it once the tests round-tripped the output through a decoder I wrote
  in the test file.

## What I'd do differently

The reflection layer only handles `float`, `int`, and `color` uniforms today. Supporting `vec2`
as an XY pad and adding a curve editor for time-based values would make it a much better teaching
tool, and the architecture already supports it: the control panel is generated, so it's mostly a
matter of adding renderers.

The code is on [GitHub](https://github.com/ctkrug/shader-garden) (MIT), and the live version is
[here](https://apps.charliekrug.com/shader-garden/). If you end up making something with it, I'd
love to see it.
</content>
