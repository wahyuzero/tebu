"use client";

import { useState, useCallback, useEffect, useRef, forwardRef, useMemo } from "react";
import { App as CapApp } from "@capacitor/app";
import { LEVELS, FRUITS, buildLetterPool, ASSETS, type Fruit } from "@/lib/game-data";
import {
  playClick,
  playPlace,
  playSuccess,
  playFail,
  playShuffle,
  playVictory,
  startMusic,
  stopMusic,
  setMusicEnabled,
} from "@/lib/sound";

type Screen = "home" | "preview" | "levels" | "play";

interface PoolLetter {
  id: number;
  letter: string;
  used: boolean;
}

interface SlotLetter {
  id: number; // pool letter id, or -1 if empty
  letter: string;
}

export default function Game() {
  const [screen, setScreen] = useState<Screen>("home");
  const [currentLevel, setCurrentLevel] = useState(0); // 0-indexed
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const [musicOn, setMusicOn] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [result, setResult] = useState<null | "success" | "fail">(null);
  const [playToken, setPlayToken] = useState(0); // increments to force fresh gameplay mount

  const navigate = useCallback((s: Screen) => {
    playClick();
    setScreen(s);
  }, []);

  const toggleMusic = useCallback(() => {
    const next = !musicOn;
    setMusicOn(next);
    setMusicEnabled(next);
    if (next) {
      startMusic();
    } else {
      stopMusic();
    }
    playClick();
  }, [musicOn]);

  // Keep a ref so the first-interaction listener always reads the latest value
  const musicOnRef = useRef(musicOn);
  useEffect(() => {
    musicOnRef.current = musicOn;
  }, [musicOn]);

  // Start music on first user interaction (browser autoplay policy).
  // This listener is added ONCE on mount — it does NOT re-run when musicOn changes,
  // which previously caused duplicate startMusic() calls and overlapping loops.
  useEffect(() => {
    const onFirstInteract = () => {
      if (musicOnRef.current) startMusic();
      window.removeEventListener("pointerdown", onFirstInteract);
    };
    window.addEventListener("pointerdown", onFirstInteract);
    return () => window.removeEventListener("pointerdown", onFirstInteract);
  }, []);

  const handleExit = useCallback(() => {
    playClick();
    setShowExitConfirm(true);
  }, []);

  // Exit action: reload the page (per user request — temporary)
  const confirmExit = useCallback(() => {
    playClick();
    setShowExitConfirm(false);
    // On Android (Capacitor), exit the app for real
    CapApp.exitApp().catch(() => {
      // Web fallback: go back to home screen
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    });
  }, []);

  const startLevel = useCallback((idx: number) => {
    playClick();
    setCurrentLevel(idx);
    setResult(null);
    setPlayToken((t) => t + 1);
    setScreen("play");
  }, []);

  const onLevelResult = useCallback(
    (success: boolean) => {
      if (success) {
        playSuccess();
        setCompletedLevels((prev) => {
          const next = new Set(prev);
          next.add(currentLevel);
          return next;
        });
        setResult("success");
      } else {
        playFail();
        setResult("fail");
      }
    },
    [currentLevel]
  );

  const retryLevel = useCallback(() => {
    playClick();
    setResult(null);
    setPlayToken((t) => t + 1);
  }, []);

  const nextLevel = useCallback(() => {
    playClick();
    setCurrentLevel(currentLevel + 1);
    setResult(null);
    setPlayToken((t) => t + 1);
  }, [currentLevel]);

  return (
    <div className="relative w-full h-screen overflow-hidden select-none">
      {screen === "home" && (
        <HomeScreen
          onStart={() => navigate("preview")}
          onInfo={() => {
            playClick();
            setShowInfo(true);
          }}
          onExit={handleExit}
          musicOn={musicOn}
          onToggleMusic={toggleMusic}
        />
      )}

      {screen === "preview" && (
        <FruitPreviewScreen
          onStart={() => navigate("levels")}
          onBack={() => navigate("home")}
        />
      )}

      {screen === "levels" && (
        <LevelSelectScreen
          onBack={() => navigate("preview")}
          onSelect={startLevel}
          completedLevels={completedLevels}
        />
      )}

      {screen === "play" && (
        <GameplayScreen
          key={playToken}
          level={currentLevel}
          result={result}
          onBack={() => navigate("levels")}
          onResult={onLevelResult}
          onRetry={retryLevel}
          onNext={nextLevel}
          isLastLevel={currentLevel === LEVELS.length - 1}
        />
      )}

      {/* Exit confirmation dialog */}
      {showExitConfirm && (
        <ConfirmDialog
          onYes={confirmExit}
          onNo={() => {
            playClick();
            setShowExitConfirm(false);
          }}
        />
      )}

      {/* Info dialog */}
      {showInfo && (
        <InfoDialog
          onClose={() => {
            playClick();
            setShowInfo(false);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   SHARED: Music Toggle Button (top-left corner)
   ============================================================ */
function MusicToggleButton({
  musicOn,
  onToggle,
}: {
  musicOn: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="hover:scale-110 active:scale-95 transition-transform"
      aria-label={musicOn ? "Matikan musik" : "Nyalakan musik"}
    >
      <div className="relative">
        <img
          src={ASSETS.buttons.musicOn}
          alt="Music"
          className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all ${
            musicOn ? "" : "opacity-50 grayscale"
          }`}
        />
        {!musicOn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[120%] h-[3px] bg-red-600 rotate-45 rounded-full shadow-lg" />
          </div>
        )}
      </div>
    </button>
  );
}

/* ============================================================
   SHARED: Exit Button (top-right corner) using Button_Keluar.png
   Button_Keluar.png has no internal whitespace (100% content), same as
   Button_Music_On.png, so it uses the same size as the music icon.
   ============================================================ */
function ExitButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hover:scale-110 active:scale-95 transition-transform"
      aria-label="Keluar"
    >
      <img
        src={ASSETS.buttons.keluar}
        alt="Keluar"
        className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      />
    </button>
  );
}

/* ============================================================
   SHARED: Info Button (uses Button_Info.png)
   Button_Info.png has internal whitespace (~85% content), so we scale it
   ~15% larger than the music icon so both appear visually equal in size.
   ============================================================ */
function InfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hover:scale-110 active:scale-95 transition-transform"
      aria-label="Info"
    >
      <img
        src={ASSETS.buttons.info}
        alt="Info"
        className="w-[5.75rem] h-[5.75rem] sm:w-[6.9rem] sm:h-[6.9rem] md:w-[8rem] md:h-[8rem] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      />
    </button>
  );
}

/* ============================================================
   HOME / WELCOME SCREEN
   - Top-LEFT:  [Music] [INFO]
   - Top-RIGHT: [Exit] (uses Button Keluar Main Game)
   - Title: uses Welcome_Screen_Text.png (not manual text)
   - Start button: uses Button Bermain (not Mulai)
   ============================================================ */
function HomeScreen({
  onStart,
  onInfo,
  onExit,
  musicOn,
  onToggleMusic,
}: {
  onStart: () => void;
  onInfo: () => void;
  onExit: () => void;
  musicOn: boolean;
  onToggleMusic: () => void;
}) {
  return (
    <div
      className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${ASSETS.backgrounds.home})` }}
    >
      <div className="absolute inset-0 bg-black/10" />

      {/* Top bar: [Music] [INFO] on LEFT, [Exit] on RIGHT */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between p-5 sm:p-7 md:p-10">
        <div className="flex items-center gap-4 sm:gap-5">
          <MusicToggleButton musicOn={musicOn} onToggle={onToggleMusic} />
          <InfoButton onClick={onInfo} />
        </div>
        <ExitButton onClick={onExit} />
      </div>

      {/* Center content: Welcome text image + Bermain button */}
      <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-10 px-4 pt-16 sm:pt-20 pb-6 max-w-3xl w-full">
        {/* Welcome title image */}
        <img
          src={ASSETS.text.welcome}
          alt="Game Edukasi Anak TEBU Tebak Nama Buah"
          className="w-[88%] sm:w-[80%] md:w-[72%] max-w-2xl h-auto object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.55)] animate-float"
        />

        <ImgButton
          src={ASSETS.buttons.bermain}
          alt="Bermain"
          onClick={onStart}
          className="w-48 sm:w-56 md:w-64 hover:scale-105 active:scale-95 animate-pulse-glow"
        />
      </div>
    </div>
  );
}

/* ============================================================
   FRUIT PREVIEW SCREEN
   Shows all 8 fruits with their names. Clicking Mulai goes to
   level select. Has a back (home) button to return to welcome.
   ============================================================ */
function FruitPreviewScreen({
  onStart,
  onBack,
}: {
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-cover bg-center flex flex-col items-center"
      style={{ backgroundImage: `url(${ASSETS.backgrounds.mainMenu})` }}
    >
      <div className="absolute inset-0 bg-black/30" />

      {/* Top bar: back button + title (title in a flexible FrameBox) */}
      <div className="relative z-10 w-full flex items-center justify-between p-4 sm:p-5">
        <ImgButton
          src={ASSETS.buttons.home}
          alt="Kembali"
          onClick={onBack}
          className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 hover:scale-105 active:scale-95"
        />
        <FrameBox
          src={ASSETS.backgrounds.frameMainMenu}
          className="flex items-center justify-center px-5 sm:px-7 py-2 sm:py-3"
        >
          <img
            src={ASSETS.text.welcome}
            alt="Game Edukasi Anak TEBU"
            className="h-11 sm:h-14 md:h-16 w-auto object-contain"
          />
        </FrameBox>
        {/* spacer to balance */}
        <div className="fl-icon-sm" />
      </div>

      {/* Fruit grid — each card uses a flexible FrameBox */}
      <div className="relative z-10 w-full max-w-5xl px-4 sm:px-8 flex-1 min-h-0 flex items-center py-2 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 md:gap-8 w-full">
          {FRUITS.map((fruit, idx) => (
            <FrameBox
              key={idx}
              src={ASSETS.backgrounds.frameMainMenu}
              className="flex flex-col items-center justify-center p-3 sm:p-5 animate-slide-in-up"
            >
              <img
                src={fruit.image}
                alt={fruit.display}
                className="w-[clamp(4rem,22vw,10rem)] h-[clamp(4rem,22vw,10rem)] object-contain drop-shadow-md hover:scale-110 transition-transform"
              />
            </FrameBox>
          ))}
        </div>
      </div>

      {/* Mulai button */}
      <div className="relative z-10 pb-6 sm:pb-10 pt-2">
        <ImgButton
          src={ASSETS.buttons.mulai}
          alt="Mulai"
          onClick={onStart}
          className="w-48 sm:w-60 md:w-72 hover:scale-105 active:scale-95 animate-pulse-glow"
        />
      </div>
    </div>
  );
}

/* ============================================================
   LEVEL SELECT SCREEN — fully responsive grid
   ============================================================ */
function LevelSelectScreen({
  onBack,
  onSelect,
  completedLevels,
}: {
  onBack: () => void;
  onSelect: (idx: number) => void;
  completedLevels: Set<number>;
}) {
  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-cover bg-center flex flex-col items-center"
      style={{ backgroundImage: `url(${ASSETS.backgrounds.mainMenu})` }}
    >
      <div className="absolute inset-0 bg-black/30" />

      {/* Top bar with back button + title (uses Frame_Main_Menu + Welcome text PNG) */}
      <div className="relative z-10 w-full flex items-center justify-between p-4 sm:p-5">
        <ImgButton
          src={ASSETS.buttons.home}
          alt="Kembali"
          onClick={onBack}
          className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 hover:scale-105 active:scale-95"
        />
        <FrameBox
          src={ASSETS.backgrounds.frameMainMenu}
          className="flex items-center justify-center px-5 sm:px-7 py-2 sm:py-3"
        >
          <img
            src={ASSETS.text.welcome}
            alt="Game Edukasi Anak TEBU"
            className="h-11 sm:h-14 md:h-16 w-auto object-contain"
          />
        </FrameBox>
        {/* spacer to balance */}
        <div className="fl-icon-sm" />
      </div>

      {/* Level grid — responsive: 2 cols on small, 4 cols on medium+ */}
      <div className="relative z-10 w-full max-w-5xl px-4 sm:px-8 pb-8 flex-1 min-h-0 flex items-center overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 md:gap-8 w-full">
          {LEVELS.map((fruit, idx) => {
            const completed = completedLevels.has(idx);
            return (
              <button
                key={idx}
                onClick={() => onSelect(idx)}
                className="relative hover:scale-105 active:scale-95 transition-transform"
                aria-label={`Level ${idx + 1}`}
              >
                <img
                  src={ASSETS.buttons.level(idx + 1)}
                  alt={`Level ${idx + 1}`}
                  className="w-full h-auto object-contain drop-shadow-lg"
                />
                {completed && (
                  <span
                    className="absolute top-1 right-1 text-2xl sm:text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                    aria-label="completed"
                  >
                    ⭐
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   GAMEPLAY SCREEN
   - Desktop / landscape: fruit LEFT, letters RIGHT (with placeholder above letters)
   - Mobile portrait: stacked (fruit top, letters bottom)
   - Uses Main_Game_Text image as instruction
   ============================================================ */
// Levels that need compact sizing (too many letters for normal layout)
const COMPACT_LEVELS = new Set(["STRAWBERRY"]);

function GameplayScreen({
  level,
  onBack,
  onResult,
  result,
  onRetry,
  onNext,
  isLastLevel,
}: {
  level: number;
  onBack: () => void;
  onResult: (success: boolean) => void;
  result: null | "success" | "fail";
  onRetry: () => void;
  onNext: () => void;
  isLastLevel: boolean;
}) {
  const fruit: Fruit = LEVELS[level];
  // Levels that need compact sizing (too many letters for normal layout)
  const isCompact = COMPACT_LEVELS.has(fruit.name);
  const [pool, setPool] = useState<PoolLetter[]>(() =>
    buildLetterPool(fruit).map((l, i) => ({ id: i, letter: l, used: false }))
  );
  const [slots, setSlots] = useState<SlotLetter[]>(() =>
    fruit.letters.map(() => ({ id: -1, letter: "" }))
  );
  const [wrong, setWrong] = useState(false);
  const checkedRef = useRef(false);
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  const poolRef = useRef(pool);
  useEffect(() => { poolRef.current = pool; }, [pool]);
  const slotsRef = useRef(slots);
  useEffect(() => { slotsRef.current = slots; }, [slots]);

  // --- Timer ---
  const TIMER_SECONDS = 60;
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (result) {
      // Stop timer when game ends
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          // Trigger fail
          setTimeout(() => onResultRef.current(false), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Flying letter animation system ---
  const [flying, setFlying] = useState<FlyingLetterData[]>([]);
  const flyingKeyRef = useRef(0);
  // Refs to actual DOM tiles so we can read their screen positions
  const poolTileRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const slotRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const isAnimatingRef = useRef(false);

  const ANIM_MS = 280;

  // Helper: get center of an element relative to the gameplay container
  const getCenter = useCallback((el: HTMLElement | null | undefined) => {
    if (!el) return { x: 0, y: 0, w: 0, h: 0 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }, []);

  const placeLetter = useCallback(
    (poolId: number) => {
      if (result || checkedRef.current || isAnimatingRef.current) return;
      const poolItem = poolRef.current.find((p) => p.id === poolId);
      if (!poolItem || poolItem.used) return;

      const emptyIdx = slotsRef.current.findIndex((s) => s.id === -1);
      if (emptyIdx === -1) return;

      const fromEl = poolTileRefs.current.get(poolId);
      const toEl = slotRefs.current.get(emptyIdx);
      const from = getCenter(fromEl);
      const to = getCenter(toEl);
      const size = Math.min(from.w, from.h);

      isAnimatingRef.current = true;
      playPlace();

      const key = flyingKeyRef.current++;
      const onDone = () => {
        // Apply the real state change after the flight animation
        const curSlots = slotsRef.current;
        const curPool = poolRef.current;
        const newSlots = [...curSlots];
        newSlots[emptyIdx] = { id: poolId, letter: poolItem.letter };
        setSlots(newSlots);
        const newPool = curPool.map((p) => (p.id === poolId ? { ...p, used: true } : p));
        setPool(newPool);
        setWrong(false);
        setFlying((prev) => prev.filter((f) => f.key !== key));
        isAnimatingRef.current = false;

        // Auto-check once all slots are filled
        const allFilled = newSlots.every((s) => s.id !== -1);
        if (allFilled && !checkedRef.current) {
          checkedRef.current = true;
          const arranged = newSlots.map((s) => s.letter).join("");
          const correct = arranged === fruit.name;
          if (correct) {
            setTimeout(() => onResult(true), 450);
          } else {
            setWrong(true);
            setTimeout(() => onResult(false), 1600);
          }
        }
      };

      setFlying((prev) => [
        ...prev,
        { key, letter: poolItem.letter, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, size, onDone, dir: "to-slot" },
      ]);
    },
    [result, getCenter]
  );

  const removeLetter = useCallback(
    (slotIdx: number) => {
      if (result || isAnimatingRef.current) return;
      const slot = slotsRef.current[slotIdx];
      if (slot.id === -1) return;

      const fromEl = slotRefs.current.get(slotIdx);
      const toEl = poolTileRefs.current.get(slot.id);
      const from = getCenter(fromEl);
      const to = getCenter(toEl);
      const size = Math.min(from.w, from.h);

      isAnimatingRef.current = true;
      playClick();

      const key = flyingKeyRef.current++;
      const onDone = () => {
        const curSlots = slotsRef.current;
        const curPool = poolRef.current;
        const newSlots = [...curSlots];
        newSlots[slotIdx] = { id: -1, letter: "" };
        setSlots(newSlots);
        const newPool = curPool.map((p) => (p.id === slot.id ? { ...p, used: false } : p));
        setPool(newPool);
        setWrong(false);
        checkedRef.current = false;
        setFlying((prev) => prev.filter((f) => f.key !== key));
        isAnimatingRef.current = false;
      };

      setFlying((prev) => [
        ...prev,
        { key, letter: slot.letter, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, size, onDone, dir: "to-pool" },
      ]);
    },
    [result, getCenter]
  );

  const shufflePool = useCallback(() => {
    if (result || isAnimatingRef.current) return;
    playShuffle();
    setPool((prev) => {
      const active = prev.map((p) => ({ ...p, used: false }));
      for (let i = active.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [active[i], active[j]] = [active[j], active[i]];
      }
      return active;
    });
    setSlots(fruit.letters.map(() => ({ id: -1, letter: "" })));
    setWrong(false);
    checkedRef.current = false;
  }, [fruit, result]);

  // Fruit panel (left on desktop/landscape, top on mobile portrait)
  const fruitPanel = (
    <div className="relative flex flex-col items-center justify-center animate-float">
      <img
        src={ASSETS.backgrounds.frameBuah}
        alt=""
        className={`${isCompact ? "w-[clamp(7rem,45vw,16rem)]" : "w-[clamp(9rem,60vw,22rem)]"} h-auto object-contain pointer-events-none drop-shadow-xl`}
      />
      <div className="absolute inset-0 flex items-center justify-center pt-2">
        <img
          src={fruit.image}
          alt={fruit.display}
          className={`${isCompact ? "w-[clamp(4rem,28vw,9rem)]" : "w-[clamp(5.5rem,36vw,14rem)]"} h-auto object-contain drop-shadow-lg`}
        />
      </div>
    </div>
  );

  // Letters panel (right on desktop/landscape, bottom on mobile portrait)
  // Includes: instruction image (placeholder), answer slots, letter pool
  const lettersPanel = (
    <div className="flex flex-col items-center w-full max-w-lg h-full">
      {/* Top section: instruction + answer slots — fixed size */}
      <div className={`flex flex-col items-center ${isCompact ? "gap-2" : "gap-3"} w-full flex-shrink-0`}>
        {/* Instruction image — hidden on compact to save space */}
        {!isCompact && (
          <img
            src={ASSETS.text.mainGame}
            alt="Susun Huruf Menjadi Nama Buah Yang Benar"
            className="w-full max-w-lg h-auto object-contain drop-shadow-md"
          />
        )}

        {/* Answer slots */}
        <div className={`flex flex-wrap items-center justify-center ${isCompact ? "gap-2.5" : "gap-3 sm:gap-4 md:gap-5"}`}>
          {slots.map((slot, i) => (
            <AnswerSlot
              key={i}
              ref={(el: HTMLButtonElement | null) => {
                if (el) slotRefs.current.set(i, el);
                else slotRefs.current.delete(i);
              }}
              letter={slot.letter}
              filled={slot.id !== -1}
              wrong={wrong}
              onClick={() => removeLetter(i)}
              compact={isCompact}
            />
          ))}
        </div>
      </div>

      {/* Middle section: letter pool — takes remaining space (flex-1 min-h-0) */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center py-1">
        <FrameBox
          src={ASSETS.backgrounds.frameHuruf}
          className="w-full bg-black/35"
        >
          <div className={`grid justify-items-center ${isCompact ? "gap-1.5 p-1.5" : "gap-1.5 sm:gap-2 p-1.5 sm:p-2"}`} style={{ gridTemplateColumns: `repeat(${Math.ceil(pool.length / 2)}, 1fr)` }}>
            {pool.map((p) => (
              <LetterTile
                key={p.id}
                ref={(el: HTMLButtonElement | null) => {
                  if (el) poolTileRefs.current.set(p.id, el);
                  else poolTileRefs.current.delete(p.id);
                }}
                letter={p.letter}
                disabled={p.used || result !== null}
                onClick={() => placeLetter(p.id)}
                compact={isCompact}
              />
            ))}
          </div>
        </FrameBox>
      </div>

      {/* Bottom section: shuffle button — always visible, fixed at bottom */}
      {!result && (
        <div className="flex-shrink-0 pb-1 pt-1">
          <button
            onClick={shufflePool}
            className="hover:scale-110 active:scale-95 transition-transform"
          >
            <img
              src={ASSETS.buttons.acakHuruf}
              alt="Acak Huruf"
              style={{
                height: isCompact ? "clamp(2rem, 8vw, 3rem)" : "clamp(2.5rem, 10vw, 4rem)",
                width: "auto",
              }}
            />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-cover bg-center flex flex-col"
      style={{ backgroundImage: `url(${ASSETS.backgrounds.mainMenu})` }}
    >
      <div className="absolute inset-0 bg-black/30" />

      {/* Flying letters overlay (renders on top of everything in gameplay) */}
      {flying.map((f) => (
        <FlyingLetter key={f.key} data={f} duration={ANIM_MS} />
      ))}

      {/* Top bar: back + level (smaller) + timer */}
      <div className="relative z-10 w-full flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4">
        <ImgButton
          src={ASSETS.buttons.home}
          alt="Kembali"
          onClick={onBack}
          className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 hover:scale-105 active:scale-95"
        />
        <img
          src={ASSETS.buttons.level(level + 1)}
          alt={`Level ${level + 1}`}
          className="h-10 sm:h-12 md:h-16 w-auto object-contain drop-shadow-lg"
        />
        {/* Timer — PNG-based with timer-bg + digit sprites */}
        <div
          className="relative flex-shrink-0"
          style={{
            width: "clamp(9rem, 26vw, 13rem)",
            aspectRatio: "399 / 166",
          }}
        >
          <img
            src={ASSETS.timer.bg}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
          <div
            className="absolute flex items-center justify-center gap-0"
            style={{
              top: "12%",
              bottom: "12%",
              left: "34%",
              right: "17%",
              filter: timeLeft <= 10
                ? "saturate(3) hue-rotate(-30deg) brightness(0.8)"
                : "none",
            }}
          >
            {(() => {
              const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
              const ss = String(timeLeft % 60).padStart(2, "0");
              const digits = [mm[0], mm[1], "colon", ss[0], ss[1]];
              return digits.map((d, i) =>
                d === "colon" ? (
                  <span
                    key={i}
                    className="font-black leading-none select-none"
                    style={{
                      fontSize: "clamp(0.8rem, 3.2vw, 1.4rem)",
                      color: timeLeft <= 10 ? "#dc2626" : "#92400e",
                      textShadow: "0 1px 0 rgba(255,255,255,0.5)",
                      margin: "0 clamp(0.05rem, 0.3vw, 0.15rem)",
                    }}
                  >
                    :
                  </span>
                ) : (
                  <img
                    key={i}
                    src={ASSETS.timer.digit(parseInt(d))}
                    alt={d}
                    className="h-[65%] w-auto object-contain max-w-[18%]"
                    draggable={false}
                  />
                ),
              );
            })()}
          </div>
        </div>
      </div>

      {/* Main gameplay area: side-by-side on desktop/landscape, stacked on mobile portrait */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-6 flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {/* Desktop / landscape: two columns (fruit left, letters right) */}
        <div className="hidden md:grid grid-cols-2 gap-8 lg:gap-12 items-center w-full">
          <div className="flex justify-center">{fruitPanel}</div>
          <div className="flex justify-center">{lettersPanel}</div>
        </div>

        {/* Mobile portrait: stacked (fruit top, letters bottom) */}
        <div className="flex md:hidden flex-col items-center gap-3 w-full min-h-0">
          {fruitPanel}
          {lettersPanel}
        </div>
      </div>

      {/* Result overlays */}
      {result === "success" && (
        <ResultOverlay
          type="success"
          onRetry={onRetry}
          onNext={onNext}
          onBack={onBack}
          isLastLevel={isLastLevel}
        />
      )}
      {result === "fail" && (
        <ResultOverlay
          type="fail"
          onRetry={onRetry}
          onNext={onNext}
          onBack={onBack}
          isLastLevel={isLastLevel}
        />
      )}
    </div>
  );
}

/* Answer slot — uses Huruf_X.png for filled, Tanda_Tanya.png for empty */
const AnswerSlot = forwardRef<
  HTMLButtonElement,
  {
    letter: string;
    filled: boolean;
    wrong: boolean;
    onClick: () => void;
    compact?: boolean;
  }
>(function AnswerSlot({ letter, filled, wrong, onClick, compact }, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={!filled}
      className={`relative ${compact ? "w-[clamp(1.8rem,8vw,3rem)] h-[clamp(2.4rem,10vw,3.5rem)]" : "w-[clamp(2.5rem,12vw,4rem)] h-[clamp(3rem,14vw,5rem)]"} flex items-center justify-center transition-all ${
        filled ? "hover:scale-105 active:scale-95 cursor-pointer" : "cursor-default"
      }`}
      aria-label={filled ? `huruf ${letter}` : "slot kosong"}
    >
      <img
        src={filled ? ASSETS.letters.letter(letter) : ASSETS.letters.questionMark}
        alt={filled ? letter : "kosong"}
        className={`w-full h-full object-contain drop-shadow-md transition-all ${
          wrong ? "animate-shake" : filled ? "animate-bounce-in" : ""
        }`}
      />
    </button>
  );
});

/* Letter tile in the pool — uses Huruf_X.png image.
   Fixed responsive size (not tied to the frame's aspect ratio), so letters
   are always large & readable. The frame (FrameBox) stretches to fit however
   many rows of tiles there are. */
const LetterTile = forwardRef<
  HTMLButtonElement,
  {
    letter: string;
    disabled: boolean;
    onClick: () => void;
    compact?: boolean;
  }
>(function LetterTile({ letter, disabled, onClick, compact }, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`relative ${compact ? "w-full max-w-[4rem] aspect-[5/6]" : "w-full max-w-[5.5rem] aspect-[5/6]"} flex items-center justify-center transition-all ${
        disabled
          ? "opacity-30 cursor-default"
          : "hover:scale-110 hover:-translate-y-1 active:scale-95 cursor-pointer"
      }`}
      aria-label={`huruf ${letter}`}
    >
      <img
        src={ASSETS.letters.letter(letter)}
        alt={letter}
        className="w-full h-full object-contain drop-shadow-md"
      />
    </button>
  );
});

/* Flying letter — animates from one screen point to another, then calls onDone */
interface FlyingLetterData {
  key: number;
  letter: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  size: number;
  onDone: () => void;
  dir: "to-slot" | "to-pool";
}
function FlyingLetter({ data, duration }: { data: FlyingLetterData; duration: number }) {
  const ref = useRef<HTMLImageElement>(null);
  // Use state to flip from "start" to "end" position so the transition runs.
  const [reached, setReached] = useState(false);

  useEffect(() => {
    // Mount at start position, then on next frame move to end.
    const t = requestAnimationFrame(() => setReached(true));
    const done = window.setTimeout(data.onDone, duration + 20);
    return () => {
      cancelAnimationFrame(t);
      clearTimeout(done);
    };
  }, []);

  const left = reached ? data.toX : data.fromX;
  const top = reached ? data.toY : data.fromY;

  return (
    <img
      ref={ref}
      src={ASSETS.letters.letter(data.letter)}
      alt=""
      className="pointer-events-none fixed z-50 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
      style={{
        position: "fixed",
        left,
        top,
        width: data.size,
        height: data.size,
        transform: `translate(-50%, -50%) scale(${reached ? 1 : 1.15}) rotate(${reached ? 0 : data.dir === "to-slot" ? -10 : 10}deg)`,
        transition: `left ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1), top ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1), transform ${duration}ms ease-out`,
      }}
    />
  );
}

/* ============================================================
   RESULT OVERLAY (Success / Fail)
   - Uses Text_Berhasil / Text_Gagal images
   ============================================================ */
function ResultOverlay({
  type,
  onRetry,
  onNext,
  onBack,
  isLastLevel,
}: {
  type: "success" | "fail";
  onRetry: () => void;
  onNext: () => void;
  onBack: () => void;
  isLastLevel: boolean;
}) {
  const success = type === "success";
  // Confetti only on success
  const confetti = useMemo(() => {
    if (!success) return null;
    const colors = ["#fbbf24", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#f97316"];
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.8 + Math.random() * 1.5,
      color: colors[i % colors.length],
      rotate: Math.random() * 360,
    }));
  }, [success]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4 py-6 overflow-hidden">
      {/* Confetti rain on success */}
      {confetti &&
        confetti.map((c) => (
          <div
            key={c.id}
            className="confetti-piece"
            style={{
              left: `${c.left}%`,
              background: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              transform: `rotate(${c.rotate}deg)`,
            }}
          />
        ))}

      <FrameBox
        src={ASSETS.backgrounds.frameMainMenu}
        className="flex flex-col items-center gap-3 px-5 py-6 sm:px-10 sm:py-8 max-w-lg w-full text-center animate-pop bg-black/30"
      >
        {/* On last level success, show "Game Selesai" title at top */}
        {success && isLastLevel && (
          <img
            src={ASSETS.buttons.gameSelesai}
            alt="Game Selesai"
            className="w-56 sm:w-64 md:w-72 mx-auto object-contain drop-shadow-2xl animate-bounce-in"
          />
        )}
        <img
          src={success ? ASSETS.buttons.starBerhasil : ASSETS.buttons.starGagal}
          alt={success ? "Berhasil" : "Gagal"}
          className={`w-44 sm:w-56 md:w-64 mx-auto object-contain ${
            success ? "animate-bounce-in" : "animate-wiggle-strong"
          }`}
        />
        <img
          src={success ? ASSETS.text.berhasil : ASSETS.text.gagal}
          alt={success ? "Selamat kamu berhasil" : "Yah kamu gagal ayo coba lagi"}
          className="w-[92%] max-w-md mx-auto object-contain drop-shadow animate-slide-in-up"
        />

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          {success && isLastLevel ? (
            /* Last level done — only Home button */
            <ImgButton
              src={ASSETS.buttons.home}
              alt="Kembali ke Home"
              onClick={onBack}
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 hover:scale-110 active:scale-95 animate-pulse-glow"
            />
          ) : (
            /* Normal level — Home + Ulangi + (Lanjut if success) */
            <>
              <ImgButton
                src={ASSETS.buttons.home}
                alt="Kembali"
                onClick={onBack}
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 hover:scale-110 active:scale-95"
              />
              <ImgButton
                src={ASSETS.buttons.ulangi}
                alt="Ulangi"
                onClick={onRetry}
                className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 hover:scale-110 active:scale-95"
              />
              {success && (
                <ImgButton
                  src={ASSETS.buttons.lanjut}
                  alt="Lanjut"
                  onClick={onNext}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 hover:scale-110 active:scale-95 animate-pulse-glow"
                />
              )}
            </>
          )}
        </div>
      </FrameBox>
    </div>
  );
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */
function ImgButton({
  src,
  alt,
  onClick,
  className = "",
}: {
  src: string;
  alt: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button onClick={onClick} className={`transition-transform ${className}`} aria-label={alt}>
      <img src={src} alt={alt} className="w-full h-full object-contain" />
    </button>
  );
}

/* FrameBox — renders a PNG frame as a 9-slice border-image so it stretches
   freely to any size/aspect ratio while keeping its decorative border crisp.
   The frame image's border (~5%) is sliced and repeated/stretched around the
   edges; the center area is transparent so children show through. This makes
   the frame flexible instead of locking the container to the PNG's aspect
   ratio. */
function FrameBox({
  src,
  children,
  className = "",
  slice = "80",
}: {
  src: string;
  children?: React.ReactNode;
  className?: string;
  slice?: string; // border-image-slice value (px in source image)
}) {
  return (
    <div
      className={className}
      style={{
        borderStyle: "solid",
        borderWidth: "clamp(14px, 3.5%, 28px)",
        borderImage: `url(${src}) ${slice} fill / clamp(14px, 3.5%, 28px) / 0 stretch`,
      }}
    >
      {children}
    </div>
  );
}

/* Exit confirmation dialog — uses Exit Text.png */
function ConfirmDialog({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4 py-6">
      <FrameBox
        src={ASSETS.backgrounds.frameMainMenu}
        className="flex flex-col items-center gap-5 px-6 py-6 sm:px-10 sm:py-8 max-w-md w-full text-center animate-pop bg-black/30"
      >
        <img
          src={ASSETS.text.exit}
          alt="Apakah kamu yakin ingin keluar dari permainan ini"
          className="w-[92%] mx-auto object-contain drop-shadow animate-slide-in-up"
        />
        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <button onClick={onYes} className="hover:scale-110 active:scale-95 transition-transform">
            <img src={ASSETS.buttons.iya} alt="Iya" className="w-28 sm:w-32 md:w-36 h-auto object-contain" />
          </button>
          <button onClick={onNo} className="hover:scale-110 active:scale-95 transition-transform">
            <img src={ASSETS.buttons.tidak} alt="Tidak" className="w-28 sm:w-32 md:w-36 h-auto object-contain" />
          </button>
        </div>
      </FrameBox>
    </div>
  );
}

function InfoDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4 py-6">
      <FrameBox
        src={ASSETS.backgrounds.frameMainMenu}
        className="flex flex-col items-center fl-gap px-5 py-6 sm:px-8 sm:py-8 max-w-lg w-full animate-pop bg-black/40 max-h-[85vh] overflow-y-auto"
      >
        <img
          src={ASSETS.text.welcome}
          alt="Game Edukasi Anak TEBU"
          className="h-14 sm:h-16 md:h-20 w-auto object-contain animate-bounce-in"
        />
        <div className="text-base sm:text-lg md:text-xl text-white space-y-2 mb-2 text-center [text-shadow:_0_1px_3px_rgba(0,0,0,0.8)]">
          <p className="font-bold text-yellow-300 text-lg sm:text-xl md:text-2xl">Game Demo</p>
        </div>
        <div className="flex justify-center">
          <ImgButton
            src={ASSETS.buttons.keluarMainGame}
            alt="Keluar"
            onClick={onClose}
            className="w-44 sm:w-52 md:w-56 hover:scale-105 active:scale-95"
          />
        </div>
      </FrameBox>
    </div>
  );
}