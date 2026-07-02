export interface CrossfadeDeps {
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  setTimeout: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
}

function defaultDeps(): CrossfadeDeps {
  return {
    requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
  };
}

/**
 * Overlays a snapshot of the outgoing frame on `container` and fades it out,
 * so a preset swap reads as a dissolve into the new shader instead of a hard
 * cut. The overlay is a plain <img>, independent of whatever WebGL program
 * renders underneath it — the caller supplies the snapshot (e.g. a
 * `canvas.toDataURL()` capture taken right before recompiling).
 *
 * A setTimeout fallback removes the overlay even if `transitionend` never
 * fires (e.g. `prefers-reduced-motion` disables the transition entirely).
 */
export function crossfadeOut(
  container: HTMLElement,
  snapshotSrc: string,
  durationMs = 200,
  deps: Partial<CrossfadeDeps> = {},
): void {
  const { requestAnimationFrame, setTimeout } = { ...defaultDeps(), ...deps };

  const overlay = document.createElement("img");
  overlay.src = snapshotSrc;
  overlay.className = "frame-crossfade";
  overlay.style.setProperty("--crossfade-duration", `${durationMs}ms`);
  overlay.setAttribute("aria-hidden", "true");
  container.appendChild(overlay);

  const remove = (): void => {
    overlay.remove();
  };

  overlay.addEventListener("transitionend", remove, { once: true });
  setTimeout(remove, durationMs + 50);

  requestAnimationFrame(() => {
    overlay.classList.add("frame-crossfade--out");
  });
}
