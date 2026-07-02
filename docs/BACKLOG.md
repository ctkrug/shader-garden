# Backlog — Shader Garden

Epic/story breakdown for the build phase. High-level on purpose — each story is scoped for a
single build run. All start unchecked.

## Epic 1: Core WebGL2 pipeline hardening

The scaffold (context, program, uniform reflection, renderer) exists; this epic rounds off the
edges before the gallery and editor lean on it harder.

- [x] Pause the render loop on `visibilitychange` (hidden tab) to avoid burning battery/CPU
      on a backgrounded page
- [x] Verify DPR-aware resize across a real range of devices/zoom levels, not just the dev
      machine, and fix any blur/letterboxing found
- [x] Design polish: 200ms crossfade between the outgoing and incoming preset frame on swap,
      per `docs/DESIGN.md`'s juice plan (currently a hard cut)

## Epic 2: Preset gallery

- [ ] Add three more presets (ray-march tunnel, wave interference, kaleidoscope) so the gallery
      spans a wider range of GLSL techniques than the three shipped in scaffold
- [ ] Render a small live or cached-frame thumbnail per gallery card instead of text-only cards
- [ ] "Fork" action: duplicate a preset's source into an editable custom slot without mutating
      the original preset (original stays the reset target)
- [ ] Design polish: filmstrip touch/swipe on mobile, active-card glow state matches
      `docs/DESIGN.md` tokens

## Epic 3: Live editing & hot reload

- [ ] Integrate an in-browser code editor (CodeMirror) for the forked shader's fragment source
- [ ] Debounce recompilation on keystroke; surface `ShaderCompileError`/`ProgramLinkError`
      inline without blanking the last good frame (renderer already supports this — wire the
      editor to it)
- [ ] Persist the active custom shader source and its uniform values to `localStorage` so a
      reload doesn't lose in-progress work
- [ ] Design polish: bottom-sheet control dock collapse/expand on mobile, error-state pulse
      per `docs/DESIGN.md`

## Epic 4: GIF export

- [ ] Frame capture loop: read back N frames from the canvas on a fixed cadence, decoupled from
      the live render loop's frame rate
- [ ] Client-side GIF encoder producing a looping GIF from the captured frames (no server
      round-trip)
- [ ] Export UI: duration/fps/resolution controls, a progress indicator during encode, and a
      download link on completion
- [ ] Design polish: export button success-state morph (checkmark + success glow, 2s) per
      `docs/DESIGN.md`'s juice plan
