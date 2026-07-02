export interface FrameLoopVisibility {
  addEventListener: (type: "visibilitychange", listener: () => void) => void;
  removeEventListener: (type: "visibilitychange", listener: () => void) => void;
  isHidden: () => boolean;
}

export interface FrameLoopDeps {
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (handle: number) => void;
  visibility: FrameLoopVisibility;
}

function defaultDeps(): FrameLoopDeps {
  return {
    requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
    cancelAnimationFrame: (handle) => window.cancelAnimationFrame(handle),
    visibility: {
      addEventListener: (type, listener) => document.addEventListener(type, listener),
      removeEventListener: (type, listener) => document.removeEventListener(type, listener),
      isHidden: () => document.hidden,
    },
  };
}

/**
 * Drives a requestAnimationFrame loop that pauses itself while the tab is
 * hidden (`document.visibilitychange`) instead of burning CPU/battery on a
 * shader nobody can see, and resumes cleanly when the tab comes back.
 */
export class FrameLoop {
  private handle: number | null = null;
  private running = false;
  private readonly deps: FrameLoopDeps;

  constructor(
    private readonly onFrame: (timeMs: number) => void,
    deps: Partial<FrameLoopDeps> = {},
  ) {
    this.deps = { ...defaultDeps(), ...deps };
    this.deps.visibility.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    if (!this.deps.visibility.isHidden()) this.schedule();
  }

  stop(): void {
    this.running = false;
    this.cancelScheduled();
    this.deps.visibility.removeEventListener("visibilitychange", this.handleVisibilityChange);
  }

  /** True while running but currently paused because the tab is hidden. */
  get isPaused(): boolean {
    return this.running && this.handle === null;
  }

  private schedule(): void {
    this.handle = this.deps.requestAnimationFrame((time) => {
      this.handle = null;
      this.onFrame(time);
      if (this.running && !this.deps.visibility.isHidden()) this.schedule();
    });
  }

  private cancelScheduled(): void {
    if (this.handle !== null) {
      this.deps.cancelAnimationFrame(this.handle);
      this.handle = null;
    }
  }

  private handleVisibilityChange = (): void => {
    if (!this.running) return;
    if (this.deps.visibility.isHidden()) {
      this.cancelScheduled();
    } else if (this.handle === null) {
      this.schedule();
    }
  };
}
