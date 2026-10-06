import { Check, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";
import type { Game } from "../../types";
import { GameCover } from "../common/GameCover";

const STATUS_COLOR: Record<Game["status"], string> = {
  backlog: "bg-ink-700 text-slate-300",
  active: "bg-accent-600/20 text-accent-300",
  completed: "bg-emerald-600/20 text-emerald-300",
  abandoned: "bg-red-900/30 text-red-300",
};

interface GameCardProps {
  game: Game;
  onEdit: () => void;
  onDelete: () => void;
  onReset?: () => void;
  onPlay?: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function GameCard({
  game,
  onEdit,
  onDelete,
  onReset,
  onPlay,
  selectMode,
  selected,
  onToggleSelect,
}: GameCardProps) {
  return (
    <div
      className={`card overflow-hidden flex flex-col group ${selectMode ? "cursor-pointer" : ""} ${
        selected ? "ring-2 ring-accent-500" : ""
      }`}
      onClick={selectMode ? onToggleSelect : undefined}
    >
      <div className="relative aspect-[3/4] bg-ink-700">
        <GameCover
          coverUrl={game.coverUrl}
          title={game.title}
          showTitleFallback
          placeholderClassName="w-full h-full flex items-center justify-center text-sm text-slate-400 p-3 text-center"
        />
        {selectMode ? (
          <span
            className={`absolute top-2 left-2 w-5 h-5 rounded-md border flex items-center justify-center ${
              selected ? "bg-accent-500 border-accent-500" : "bg-black/50 border-white/30"
            }`}
          >
            {selected && <Check size={14} className="text-white" />}
          </span>
        ) : (
          <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[game.status]}`}>
            {game.status}
          </span>
        )}
        {game.isSample && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-black/50 text-slate-300">
            sample
          </span>
        )}
        {!selectMode && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-2">
            {onPlay && (
              <button className="btn-primary text-xs py-1.5" onClick={onPlay}>
                <Play size={14} /> Play this
              </button>
            )}
            <button className="btn-secondary text-xs py-1.5" onClick={onEdit}>
              <Pencil size={14} /> Edit
            </button>
            {onReset && (
              <button className="btn-secondary text-xs py-1.5" onClick={onReset}>
                <RotateCcw size={14} /> Reset
              </button>
            )}
            <button className="btn-danger text-xs py-1.5" onClick={onDelete}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-sm text-slate-100 truncate">{game.title}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
          {game.genre && <span>{game.genre}</span>}
          {game.playtime && <span className="capitalize">· {game.playtime}</span>}
        </div>
        {game.tags && game.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {game.tags.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-600/15 text-accent-300">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
          <span>{game.playedHours ? `Played ${game.playedHours}h` : ""}</span>
          <span>Added {new Date(game.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
