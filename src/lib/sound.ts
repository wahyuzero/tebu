// Sound utilities using Web Audio API (no external audio files needed)

let audioCtx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;
let musicEnabled = true;
let musicPlaying = false; // prevents overlapping music loops

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AC();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Play a short tone for click / feedback sounds. */
export function playTone(freq: number, duration = 0.15, type: OscillatorType = "sine", volume = 0.18) {
  if (!musicEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

/** Pleasant click sound. */
export function playClick() {
  playTone(660, 0.08, "triangle", 0.14);
}

/** Success sound (ascending arpeggio). */
export function playSuccess() {
  if (!musicEnabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.25, "triangle", 0.2), i * 120);
  });
}

/** Fail sound (descending). */
export function playFail() {
  if (!musicEnabled) return;
  const notes = [392.0, 349.23, 293.66]; // G4, F4, D4
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.3, "sawtooth", 0.16), i * 150);
  });
}

/** Correct letter placement sound. */
export function playPlace() {
  playTone(880, 0.1, "triangle", 0.16);
}

// Simple cheerful background melody (loop)
const MELODY: [number, number][] = [
  // [frequency, duration in beats]
  [523.25, 0.5], // C5
  [659.25, 0.5], // E5
  [783.99, 0.5], // G5
  [659.25, 0.5], // E5
  [523.25, 0.5], // C5
  [587.33, 0.5], // D5
  [659.25, 1.0], // E5
  [0, 0.5], // rest
  [783.99, 0.5], // G5
  [880.0, 0.5], // A5
  [987.77, 0.5], // B5
  [880.0, 0.5], // A5
  [783.99, 0.5], // G5
  [659.25, 0.5], // E5
  [523.25, 1.0], // C5
  [0, 0.5], // rest
];

const BEAT = 320; // ms per beat

export function startMusic() {
  if (musicPlaying) return; // idempotent — never start a second loop
  const ctx = getCtx();
  if (!ctx || !musicEnabled) return;
  if (ctx.state === "suspended") ctx.resume();
  // Clear any stray timer (shouldn't exist if musicPlaying is false, but safe)
  if (musicTimer !== null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }

  if (!musicGain) {
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.07;
    musicGain.connect(ctx.destination);
  }

  musicPlaying = true;
  let i = 0;
  const playNext = () => {
    if (!musicEnabled || !musicGain || !ctx || !musicPlaying) {
      musicPlaying = false;
      musicTimer = null;
      return;
    }
    const [freq, dur] = MELODY[i % MELODY.length];
    if (freq > 0) {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      noteGain.gain.setValueAtTime(0, ctx.currentTime);
      noteGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur * (BEAT / 1000));
      osc.connect(noteGain);
      noteGain.connect(musicGain);
      osc.start();
      osc.stop(ctx.currentTime + dur * (BEAT / 1000));
    }
    i++;
    musicTimer = window.setTimeout(playNext, dur * BEAT);
  };
  playNext();
}

export function stopMusic() {
  if (musicTimer !== null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  musicPlaying = false;
}

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled;
  if (!enabled) stopMusic();
}

export function isMusicEnabled() {
  return musicEnabled;
}
