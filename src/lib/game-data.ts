// Game data for TEBU (Tebak Nama Buah) - Guess the Fruit Name

export interface Fruit {
  name: string; // uppercase fruit name
  display: string; // capitalized display name
  image: string; // path to fruit image
  letters: string[]; // individual letters of the fruit name
}

export const FRUITS: Fruit[] = [
  {
    name: "APEL",
    display: "Apel",
    image: "/game/fruits/Apel.png",
    letters: ["A", "P", "E", "L"],
  },
  {
    name: "PIR",
    display: "Pir",
    image: "/game/fruits/Pir.png",
    letters: ["P", "I", "R"],
  },
  {
    name: "KIWI",
    display: "Kiwi",
    image: "/game/fruits/Kiwi.png",
    letters: ["K", "I", "W", "I"],
  },
  {
    name: "JERUK",
    display: "Jeruk",
    image: "/game/fruits/Jeruk.png",
    letters: ["J", "E", "R", "U", "K"],
  },
  {
    name: "LEMON",
    display: "Lemon",
    image: "/game/fruits/Lemon.png",
    letters: ["L", "E", "M", "O", "N"],
  },
  {
    name: "NANAS",
    display: "Nanas",
    image: "/game/fruits/Nanas.png",
    letters: ["N", "A", "N", "A", "S"],
  },
  {
    name: "PISANG",
    display: "Pisang",
    image: "/game/fruits/Pisang.png",
    letters: ["P", "I", "S", "A", "N", "G"],
  },
  {
    name: "STRAWBERRY",
    display: "Strawberry",
    image: "/game/fruits/Strawberry.png",
    letters: ["S", "T", "R", "A", "W", "B", "E", "R", "R", "Y"],
  },
];

// 8 levels: one per unique fruit
export const LEVELS: Fruit[] = [
  FRUITS[0], // L1: Apel
  FRUITS[1], // L2: Pir
  FRUITS[2], // L3: Kiwi
  FRUITS[3], // L4: Jeruk
  FRUITS[4], // L5: Lemon
  FRUITS[5], // L6: Nanas
  FRUITS[6], // L7: Pisang
  FRUITS[7], // L8: Strawberry
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a scrambled letter pool for a given fruit.
 * Pool = fruit letters + distractor letters, shuffled.
 * Total pool size aims for ~10 letters (so shorter words get more distractors).
 */
export function buildLetterPool(fruit: Fruit): string[] {
  const nameLetters = [...fruit.letters];
  const nameSet = new Set(nameLetters);

  // Target a pool size of about 10 letters, but never less than name length + 3
  const targetSize = Math.max(nameLetters.length + 4, Math.min(10, nameLetters.length + 5));
  const distractorCount = Math.max(3, targetSize - nameLetters.length);

  const distractorPool = ALPHABET.filter((l) => !nameSet.has(l));
  const distractors = shuffle(distractorPool).slice(0, distractorCount);

  return shuffle([...nameLetters, ...distractors]);
}

// Image asset paths helper
export const ASSETS = {
  backgrounds: {
    home: "/game/backgrounds/Home_Background.png",
    mainMenu: "/game/backgrounds/Main_Menu_Background.png",
    frameBuah: "/game/backgrounds/Frame_Buah.png",
    frameHuruf: "/game/backgrounds/Frame_Huruf.png",
    frameMainMenu: "/game/backgrounds/Frame_Main_Menu.png",
  },
  buttons: {
    bermain: "/game/buttons/Button_Bermain.png",
    gameSelesai: "/game/buttons/Button_Game_Selesai.png",
    info: "/game/buttons/Button_Info.png",
    iya: "/game/buttons/Button_Iya.png",
    keluar: "/game/buttons/Button_Keluar.png",
    keluarMainGame: "/game/buttons/Button_Keluar_Main_Game.png",
    lanjut: "/game/buttons/Button_Lanjut.png",
    level: (n: number) => `/game/buttons/Button_Level_${n}.png`,
    mulai: "/game/buttons/Button_Mulai.png",
    musicOn: "/game/buttons/Button_Music_On.png",
    tidak: "/game/buttons/Button_Tidak.png",
    ulangi: "/game/buttons/Button_Ulangi.png",
    home: "/game/buttons/Buttone_Home.png",
    starBerhasil: "/game/buttons/Star_Berhasil.png",
    starGagal: "/game/buttons/Star_Gagal.png",
  },
  letters: {
    // Single letter tile image, e.g. "A" -> /game/letters/Huruf_A.png
    letter: (l: string) => `/game/letters/Huruf_${l.toUpperCase()}.png`,
    // Question mark placeholder for empty answer slots
    questionMark: "/game/letters/Tanda_Tanya.png",
  },
  text: {
    welcome: "/game/text/Welcome_Screen_Text.png",
    exit: "/game/text/Exit_Text.png",
    mainGame: "/game/text/Main_Game_Text.png",
    berhasil: "/game/text/Text_Berhasil.png",
    gagal: "/game/text/Text_Gagal.png",
  },
} as const;
