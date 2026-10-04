import { useEffect, useRef, useState } from "react";
import type { Game } from "../../types";

interface RouletteWheelProps {
  eligible: Game[];
  winner: Game | null;
  spinToken: number;
  onSettled: () => void;
}

const CARD_WIDTH = 160;
const CARD_GAP = 12;
const STEP = CARD_WIDTH + CARD_GAP;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function RouletteWheel({ eligible, winner, spinToken, onSettled }: RouletteWheelProps) {
  const [reelItems, setReelItems] = useState<Game[]>([]);
  const [offset, setOffset] = useState(0);
  const [instant, setInstant] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!winner || eligible.length === 0) return;

    const loops = Math.max(3, Math.ceil(30 / eligible.length));
    const items: Game[] = [];
    for (let i = 0; i < loops; i++) items.push(...shuffle(eligible));
    items.push(winner);

    setInstant(true);
    setReelItems(items);
    setOffset(0);
    setSpinning(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const containerWidth = containerRef.current?.offsetWidth ?? 0;
        const targetIndex = items.length - 1;
        const finalOffset = targetIndex * STEP - containerWidth / 2 + CARD_WIDTH / 2;
        setInstant(false);
        setOffset(finalOffset);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  return (
    <div ref={containerRef} className="relative overflow-hidden w-full max-w-2xl h-48 mx-auto rounded-2xl bg-ink-900/60 border border-white/5">
      <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-accent-400 shadow-glow z-10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-transparent to-ink-950 z-10" />
      <div
        className="flex gap-3 h-full items-center px-0 py-4"
        style={{
          transform: `translateX(${-offset + (containerRef.current ? 0 : 0)}px)`,
          transition: instant ? "none" : "transform 2.6s cubic-bezier(0.12, 0.72, 0.1, 1)",
        }}
        onTransitionEnd={() => {
          if (spinning) {
            setSpinning(false);
            onSettled();
          }
        }}
      >
        {reelItems.map((g, i) => (
          <div
            key={i}
            style={{ width: CARD_WIDTH }}
            className="shrink-0 h-full rounded-xl overflow-hidden border border-white/10 bg-ink-700"
          >
            {g.coverUrl ? (
              <img src={g.coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 p-2 text-center">
                {g.title}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
