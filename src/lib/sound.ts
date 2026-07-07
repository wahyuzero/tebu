// Sound utilities using real audio files (Pixabay CC0)

let bgm: HTMLAudioElement | null = null;
let musicEnabled = true;

const SFX = {
  correct: "/audio/sfx/correct.mp3",
  wrong: "/audio/sfx/wrong.mp3",
  click: "/audio/sfx/click.mp3",
  victory: "/audio/sfx/victory.mp3",
  shuffle: "/audio/sfx/shuffle.mp3",
} as const;

function playSfx(key: keyof typeof SFX) {
  if (!musicEnabled) return;
  try {
    const audio = new Audio(SFX[key]);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
}

export function playClick() {
  playSfx("click");
}

export function playSuccess() {
  playSfx("correct");
}

export function playFail() {
  playSfx("wrong");
}

export function playPlace() {
  playSfx("click");
}

export function playVictory() {
  playSfx("victory");
}

export function playShuffle() {
  playSfx("shuffle");
}

export function startMusic() {
  if (bgm) return;
  try {
    bgm = new Audio("/audio/bgm/kids-world.mp3");
    bgm.loop = true;
    bgm.volume = 0.15;
    bgm.play().catch(() => {});
  } catch {}
}

export function stopMusic() {
  if (bgm) {
    bgm.pause();
    bgm.currentTime = 0;
    bgm = null;
  }
}

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled;
  if (!enabled) stopMusic();
}

export function isMusicEnabled() {
  return musicEnabled;
}
