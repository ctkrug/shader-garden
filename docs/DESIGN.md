# Design direction — Shader Garden

## Aesthetic direction

**Blueprint / technical workbench.** Shader Garden is a workbench for hand-written GLSL, not
a toy — the chrome should read like an oscilloscope or an engineering blueprint: dark
graph-paper canvas, monospace readouts, precise hairlines, a cyan "signal" accent with a warm
amber "warning/export" accent. The shader render itself supplies all the color and motion; the
UI around it stays quiet, technical, and confident so the art is always the loudest thing on
screen.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0e14` | page background, outside the canvas |
| `--surface-1` | `#10151d` | control dock, gallery rail |
| `--surface-2` | `#161c26` | raised elements: preset cards, popovers |
| `--grid-line` | `rgba(126, 227, 255, 0.06)` | blueprint graph-paper grid overlay |
| `--text` | `#e6edf3` | primary text |
| `--text-muted` | `#7d8590` | secondary/meta text |
| `--accent` | `#7ee3ff` | signal cyan — active state, focus ring, live values |
| `--accent-support` | `#ff9d5c` | amber — export/record actions, warnings |
| `--success` | `#7ee787` | compile success, export complete |
| `--danger` | `#ff6b6b` | shader compile errors |
| Display font | **Space Grotesk** (Google Fonts), fallback `system-ui, sans-serif` | wordmark, section headings |
| UI/mono font | **JetBrains Mono** (Google Fonts), fallback `ui-monospace, monospace` | body UI, uniform readouts, code editor |
| Type scale | 1.25 ratio: 12 / 14 / 16 / 20 / 25 / 31 / 39px | — |
| Spacing unit | 8px scale (4px half-step allowed for hairline gaps) | — |
| Corner radius | 4px — sharp and technical, never pill-shaped | — |
| Shadow / glow | soft `0 0 12px rgba(126,227,255,0.25)` cyan glow on focused/active controls; flat 1px `--grid-line` borders elsewhere, no drop shadows | — |
| Motion | UI transitions 150ms ease-out; canvas/program swap crossfade 200ms; control feedback (slider thumb, button press) 100ms | — |

## Layout intent

The **canvas is the hero** — it renders fullscreen behind everything else, always ≥60% of the
viewport, with the blueprint grid as a faint overlay on the page background visible only in the
margins around it.

- **Desktop (1440×900):** canvas fills the viewport edge-to-edge. A gallery rail sits on the
  left edge (click a card to swap). Once cards render live thumbnails instead of text
  (backlog epic 2), this collapses to a slim 64px icon rail; until then it's 208px
  (`--rail-width`) so the name/description text has room to read instead of wrapping
  letter-by-letter. A floating, semi-translucent control dock is pinned to the bottom
  (uniform sliders/color swatches + export button), glassy over the canvas rather than
  pushing it into a smaller box.
- **Phone (390×844):** canvas takes the top ~58% of the viewport. Below it, a horizontally
  scrollable filmstrip of preset thumbnails, then a collapsible bottom sheet for uniform
  controls (collapsed by default, tap the handle to expand) so the render stays dominant.
- No state has the canvas shrink to a small fixed-pixel box — it always resizes to fill its
  container at devicePixelRatio.

## Signature detail

The wordmark **"SHADER GARDEN"** in the header is itself rendered with a live CSS effect: a
slow-moving cyan/amber gradient sweep clipped to the text (`background-clip: text`), echoing the
gradient-driven shaders below it. It's the one flourish — everything else stays restrained so
the wordmark and the canvas do the talking.

## Juice plan (toy interactions)

Shader Garden is a playground rather than a game, so the feedback plan is proportionate:

- **Preset swap:** the outgoing frame crossfades to the incoming one over 200ms (no hard cut).
- **Slider drag:** the numeric readout updates live and the track fills with the accent color;
  thumb depresses 2px on press (100ms ease-out).
- **Compile error:** the control dock border pulses `--danger` once (150ms) and an inline error
  readout appears in mono type — no modal, stays in flow.
- **Export success:** the export button morphs into a checkmark + download link for 2s
  (`--success` glow), then reverts.
- **Sound:** a single synthesized UI tick (short sine blip, WebAudio, ~30ms, low volume) on
  preset swap and on export-complete — subtle confirmation, not a game SFX suite. A mute toggle
  in the header persists to `localStorage`; the `AudioContext` is created lazily on first
  pointer interaction and every call site guards for browsers/tests without `AudioContext`.
- Respects `prefers-reduced-motion`: crossfades and pulses drop to instant swaps, sound is
  unaffected (it's not motion).
