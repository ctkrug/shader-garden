const MUTE_STORAGE_KEY = "shader-garden:muted";

/**
 * A single synthesized UI confirmation sound (short sine blip) used for
 * preset swap and export-complete. No audio files — everything is
 * generated with WebAudio oscillators. The AudioContext is created lazily
 * on the first `tick()` call (autoplay policy requires a user gesture),
 * and every method no-ops in environments without AudioContext (tests,
 * older browsers) instead of throwing.
 */
export class TickPlayer {
  private context: AudioContext | null = null;
  private muted: boolean;

  constructor(private readonly storage: Pick<Storage, "getItem" | "setItem"> | null = safeLocalStorage()) {
    this.muted = this.storage?.getItem(MUTE_STORAGE_KEY) === "true";
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.storage?.setItem(MUTE_STORAGE_KEY, String(muted));
  }

  toggle(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  tick(frequency = 880): void {
    if (this.muted) return;

    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return;

    this.context ??= new AudioContextCtor();
    const ctx = this.context;
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);

    // Quick attack, quick decay — a "blip," not a tone.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.035);
  }
}

function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
