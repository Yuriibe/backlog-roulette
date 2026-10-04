import { Check, RotateCcw } from "lucide-react";
import type { Game } from "../../types";

interface GameRevealCardProps {
  game: Game;
  rerollsLeft: number;
  onAccept: () => void;
  onReroll: () => void;
}

const INTRO_BY_GENRE: Record<string, string> = {
  Metroidvania: "A tightly interconnected world rewarding curiosity and careful exploration.",
  ARPG: "Build-crafting and combat depth await — a great excuse to try something new.",
  Roguelike: "Every run is a fresh story. Perfect for a themed, self-imposed challenge.",
  "Action-Adventure": "A hand-crafted world built around discovery and clever design.",
  Exploration: "A game best experienced with as little outside knowledge as possible.",
  "Card Game": "Deceptively deep systems hiding behind simple rules.",
};

export function GameRevealCard({ game, rerollsLeft, onAccept, onReroll }: GameRevealCardProps) {
  const intro =
    (game.genre && INTRO_BY_GENRE[game.genre]) ||
    "A great pick from your backlog — time to find out what it has in store.";

  return (
    <div className="card max-w-xl mx-auto p-6 animate-pop-in">
      <div className="flex gap-5">
        <div className="w-28 h-40 rounded-xl overflow-hidden shrink-0 bg-ink-700 border border-white/10">
          {game.coverUrl ? (
            <img src={game.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 p-2 text-center">
              {game.title}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-100 mb-1">{game.title}</h2>
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            {game.genre && <span className="px-2 py-1 rounded-full bg-accent-600/20 text-accent-300">{game.genre}</span>}
            {game.playtime && (
              <span className="px-2 py-1 rounded-full bg-ink-700 text-slate-300 capitalize">{game.playtime}</span>
            )}
            <span className="px-2 py-1 rounded-full bg-ink-700 text-slate-300">
              {game.previouslyPlayed ? "Played before" : "Never played"}
            </span>
          </div>
          <p className="text-sm text-slate-300 mb-3">{intro}</p>
          {game.notes && (
            <p className="text-sm text-slate-400 italic border-l-2 border-accent-600/40 pl-3">"{game.notes}"</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/5">
        <button className="btn-secondary" onClick={onReroll} disabled={rerollsLeft <= 0}>
          <RotateCcw size={16} />
          Spin again {rerollsLeft > 0 ? `(${rerollsLeft} left)` : ""}
        </button>
        <button className="btn-primary" onClick={onAccept}>
          <Check size={16} />
          Accept this game
        </button>
      </div>
      {rerollsLeft <= 0 && (
        <p className="text-xs text-slate-500 mt-3 text-center">
          Out of rerolls for this session — accept this one, or adjust filters and spin fresh.
        </p>
      )}
    </div>
  );
}
