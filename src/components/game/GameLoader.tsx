"use client";

import { useState, useEffect, useCallback } from "react";
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
    img.onerror = () => resolve(); // don't block on failures
    img.src = url;
  });
}

export default function GameLoader() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const preload = useCallback(async () => {
    const urls = collectAllImageUrls();
    const total = urls.length;
    let loaded = 0;

    // Load in batches of 8 for parallel but not overwhelming
    const batchSize = 8;
    for (let i = 0; i < total; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.all(batch.map(preloadImage));
      loaded += batch.length;
      setProgress(Math.round((loaded / total) * 100));
    }

    // Small delay so 100% is visible
    await new Promise((r) => setTimeout(r, 300));
    setReady(true);
  }, []);

  useEffect(() => {
    preload();
  }, [preload]);

  if (ready) return <Game />;

  return (
    <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white overflow-hidden">
      {/* Simple fruit emoji as loading indicator */}
      <div className="text-6xl mb-8 animate-bounce">🍎</div>

      <h1 className="text-2xl font-bold mb-6">Memuat TEBU...</h1>

      {/* Progress bar */}
      <div className="w-64 h-3 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-white/70">{progress}%</p>
    </div>
  );
}
