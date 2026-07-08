"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Game from "@/components/game/Game";
import { ASSETS, FRUITS } from "@/lib/game-data";

// Collect every image URL the game could ever need
function collectAllImageUrls(): string[] {
  const urls: string[] = [];

  // backgrounds
  Object.values(ASSETS.backgrounds).forEach((v) => urls.push(v));

  // buttons (static ones)
  Object.entries(ASSETS.buttons).forEach(([, v]) => {
    if (typeof v === "string") urls.push(v);
  });
  // level buttons 1-10
  for (let i = 1; i <= 10; i++) urls.push(ASSETS.buttons.level(i));

  // text
  Object.values(ASSETS.text).forEach((v) => urls.push(v));

  // fruit images
  FRUITS.forEach((f) => urls.push(f.image));

  // letters A-Z + tanda tanya
  for (let c = 65; c <= 90; c++) urls.push(ASSETS.letters.letter(String.fromCharCode(c)));
  urls.push(ASSETS.letters.questionMark);

  return [...new Set(urls)];
}

// Preload a single image — returns a promise that resolves when loaded
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

// Audio files to preload
const AUDIO_URLS = [
  "/audio/sfx/correct.mp3",
  "/audio/sfx/wrong.mp3",
  "/audio/sfx/click.mp3",
  "/audio/sfx/victory.mp3",
  "/audio/sfx/shuffle.mp3",
  "/audio/bgm/kids-world.mp3",
];

function preloadAudio(url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.oncanplaythrough = () => resolve();
    audio.onerror = () => resolve();
    audio.src = url;
    audio.load();
  });
}

// Loading messages that cycle
const LOADING_MESSAGES = [
  "Menyiapkan buah-buahan...",
  "Mengocok huruf-huruf...",
  "Menyusun kata-kata...",
  "Memuat level permainan...",
  "Hampir siap!",
];

// Inline styles for animations (can't use Tailwind keyframes for these)
const styles = `
@keyframes fruit-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-18px) rotate(-8deg); }
  75% { transform: translateY(10px) rotate(5deg); }
}

@keyframes fruit-pop-in {
  0% { transform: scale(0) rotate(-20deg); opacity: 0; }
  60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes title-glow {
  0%, 100% { text-shadow: 0 0 20px rgba(255,215,0,0.3), 0 4px 8px rgba(0,0,0,0.3); transform: scale(1); }
  50% { text-shadow: 0 0 40px rgba(255,215,0,0.6), 0 4px 12px rgba(0,0,0,0.4); transform: scale(1.03); }
}

@keyframes bar-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
}

@keyframes leaf-sway {
  0%, 100% { transform: rotate(-15deg) translateX(0); }
  50% { transform: rotate(10deg) translateX(5px); }
}

@keyframes dot-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
`;

export default function GameLoader() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [showFruits, setShowFruits] = useState(false);
  const startTime = useRef(Date.now());

  // Cycle loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Show fruits with staggered animation after brief delay
  useEffect(() => {
    const t = setTimeout(() => setShowFruits(true), 300);
    return () => clearTimeout(t);
  }, []);

  const preload = useCallback(async () => {
    const imageUrls = collectAllImageUrls();
    const allUrls = [...imageUrls, ...AUDIO_URLS];
    const total = allUrls.length;
    let loaded = 0;

    const batchSize = 8;
    for (let i = 0; i < total; i += batchSize) {
      const batch = allUrls.slice(i, i + batchSize);
      await Promise.all(
        batch.map((url) =>
          url.endsWith(".mp3") ? preloadAudio(url) : preloadImage(url)
        )
      );
      loaded += batch.length;
      setProgress(Math.round((loaded / total) * 100));
    }

    // Ensure minimum 1.5s loading time so animations are visible
    const elapsed = Date.now() - startTime.current;
    const remaining = Math.max(0, 1500 - elapsed);
    await new Promise((r) => setTimeout(r, remaining));

    setReady(true);
  }, []);

  useEffect(() => {
    preload();
  }, [preload]);

  if (ready) return <Game />;

  // Pick 5 fruits to display in the loading screen
  const displayFruits = FRUITS.slice(0, 5);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div
        className="w-full h-[100dvh] flex flex-col items-center justify-center text-white overflow-hidden relative"
        style={{
          background: "linear-gradient(160deg, #1a472a 0%, #0d3320 40%, #0a2918 70%, #071f12 100%)",
        }}
      >
        {/* Decorative background circles */}
        <div
          className="absolute rounded-full"
          style={{
            width: "clamp(300px, 80vw, 600px)",
            height: "clamp(300px, 80vw, 600px)",
            background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Sparkle dots */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute rounded-full bg-yellow-300"
            style={{
              width: `${4 + (i % 3) * 2}px`,
              height: `${4 + (i % 3) * 2}px`,
              top: `${15 + (i * 11) % 70}%`,
              left: `${10 + (i * 13) % 80}%`,
              animation: `sparkle ${1.5 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}

        {/* Leaf decorations */}
        <div
          className="absolute text-3xl opacity-20"
          style={{
            top: "12%",
            right: "15%",
            animation: "leaf-sway 3s ease-in-out infinite",
            fontSize: "clamp(1.5rem, 5vw, 3rem)",
          }}
        >
          🍃
        </div>
        <div
          className="absolute text-3xl opacity-15"
          style={{
            bottom: "18%",
            left: "10%",
            animation: "leaf-sway 4s ease-in-out infinite",
            animationDelay: "1s",
            fontSize: "clamp(1.2rem, 4vw, 2.5rem)",
            transform: "scaleX(-1)",
          }}
        >
          🍃
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center" style={{ gap: "clamp(16px, 4vw, 32px)" }}>
          {/* TEBU Title */}
          <div className="text-center">
            <h1
              className="font-black tracking-wider"
              style={{
                fontSize: "clamp(3rem, 14vw, 6rem)",
                animation: "title-glow 2s ease-in-out infinite",
                color: "#FFD700",
                lineHeight: 1.1,
              }}
            >
              TEBU
            </h1>
            <p
              className="text-white/60 font-medium"
              style={{
                fontSize: "clamp(0.75rem, 3vw, 1.1rem)",
                marginTop: "clamp(4px, 1vw, 8px)",
                letterSpacing: "0.2em",
              }}
            >
              Tebak Nama Buah
            </p>
          </div>

          {/* Bouncing fruit row */}
          <div
            className="flex items-end justify-center"
            style={{
              gap: "clamp(8px, 3vw, 20px)",
              height: "clamp(50px, 18vw, 90px)",
            }}
          >
            {displayFruits.map((fruit, i) => (
              <div
                key={fruit.name}
                className="flex-shrink-0"
                style={{
                  opacity: showFruits ? 1 : 0,
                  animation: showFruits
                    ? `fruit-pop-in 0.5s ease-out ${i * 0.15}s both, fruit-float ${2 + i * 0.3}s ease-in-out ${0.5 + i * 0.15}s infinite`
                    : "none",
                }}
              >
                <img
                  src={fruit.image}
                  alt={fruit.name}
                  style={{
                    width: "clamp(36px, 14vw, 70px)",
                    height: "clamp(36px, 14vw, 70px)",
                    objectFit: "contain",
                    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Progress section */}
          <div className="flex flex-col items-center" style={{ gap: "clamp(8px, 2vw, 14px)", width: "clamp(200px, 70vw, 360px)" }}>
            {/* Progress bar */}
            <div
              className="w-full rounded-full overflow-hidden relative"
              style={{
                height: "clamp(10px, 3vw, 16px)",
                backgroundColor: "rgba(255,255,255,0.1)",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              <div
                className="h-full rounded-full relative"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #22c55e, #4ade80, #86efac, #4ade80, #22c55e)",
                  backgroundSize: "200% 100%",
                  animation: "bar-shimmer 2s linear infinite",
                  transition: "width 0.3s ease-out",
                  boxShadow: "0 0 12px rgba(34,197,94,0.5)",
                }}
              />
            </div>

            {/* Loading message */}
            <p
              className="text-white/70 font-medium text-center"
              style={{
                fontSize: "clamp(0.7rem, 2.5vw, 0.95rem)",
                minHeight: "1.2em",
                transition: "opacity 0.3s ease",
              }}
            >
              {LOADING_MESSAGES[msgIdx]}
              <span style={{ animation: "dot-pulse 1.5s infinite" }}>
                {" "}
                <span style={{ animationDelay: "0s" }}>.</span>
                <span style={{ animationDelay: "0.3s" }}>.</span>
                <span style={{ animationDelay: "0.6s" }}>.</span>
              </span>
            </p>

            {/* Percentage */}
            <p
              className="text-yellow-400/80 font-bold"
              style={{ fontSize: "clamp(0.8rem, 3vw, 1.1rem)" }}
            >
              {progress}%
            </p>
          </div>
        </div>

        {/* Bottom credit */}
        <p
          className="absolute bottom-4 text-white/20"
          style={{ fontSize: "clamp(0.55rem, 2vw, 0.75rem)" }}
        >
          Pixabay CC0 Audio
        </p>
      </div>
    </>
  );
}
