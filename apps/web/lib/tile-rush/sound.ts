export type GameSoundId =
  | "pick"
  | "match"
  | "shuffle"
  | "cleared"
  | "gameOver"
  | "timeUp"
  | "tick";

export const STORAGE_SOUND_MUTED = "frx-tile-rush-sound-muted";

export function readSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_SOUND_MUTED) === "1";
}

export function writeSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_SOUND_MUTED, muted ? "1" : "0");
}

function playTone(
  ctx: AudioContext,
  startTime: number,
  frequency: number,
  duration: number,
  options?: {
    type?: OscillatorType;
    volume?: number;
    attack?: number;
    release?: number;
  }
) {
  const {
    type = "sine",
    volume = 0.12,
    attack = 0.008,
    release = 0.06,
  } = options ?? {};

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + duration + release
  );
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + release + 0.02);
}

function playNoiseSweep(ctx: AudioContext, startTime: number) {
  const bufferSize = ctx.sampleRate * 0.18;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(400, startTime);
  filter.frequency.exponentialRampToValueAtTime(2200, startTime + 0.16);
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.08, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(startTime);
  source.stop(startTime + 0.2);
}

class GameSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  isMuted() {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  play(id: GameSoundId) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    switch (id) {
      case "pick":
        playTone(ctx, t, 620, 0.04, { type: "triangle", volume: 0.09 });
        break;
      case "match":
        playTone(ctx, t, 523.25, 0.07, { type: "sine", volume: 0.11 });
        playTone(ctx, t + 0.06, 659.25, 0.07, { type: "sine", volume: 0.11 });
        playTone(ctx, t + 0.12, 783.99, 0.1, { type: "sine", volume: 0.13 });
        break;
      case "shuffle":
        playNoiseSweep(ctx, t);
        break;
      case "cleared":
        playTone(ctx, t, 523.25, 0.1, { volume: 0.12 });
        playTone(ctx, t + 0.1, 659.25, 0.1, { volume: 0.12 });
        playTone(ctx, t + 0.2, 783.99, 0.1, { volume: 0.12 });
        playTone(ctx, t + 0.32, 1046.5, 0.18, { volume: 0.14 });
        break;
      case "gameOver":
        playTone(ctx, t, 330, 0.14, { type: "sawtooth", volume: 0.06 });
        playTone(ctx, t + 0.12, 220, 0.2, { type: "sawtooth", volume: 0.05 });
        break;
      case "timeUp":
        playTone(ctx, t, 440, 0.12, { type: "square", volume: 0.05 });
        playTone(ctx, t + 0.16, 330, 0.18, { type: "square", volume: 0.05 });
        break;
      case "tick":
        playTone(ctx, t, 880, 0.025, { type: "triangle", volume: 0.04 });
        break;
    }
  }
}

export const gameSoundEngine = new GameSoundEngine();
