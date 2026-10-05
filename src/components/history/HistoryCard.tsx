import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import type { Game, Run } from "../../types";
import { GameCover } from "../common/GameCover";

interface HistoryCardProps {
  run: Run;
  game: Game | undefined;
  onResetToBacklog: () => void;
}

export function HistoryCard({ run, game, onResetToBacklog }: HistoryCardProps) {
  const [open, setOpen] = useState(false);
  const completedCount = run.objectives.filter((o) => o.completed).length;

  return (
    <div className="card overflow-hidden">
      <button className="w-full flex items-center gap-4 p-4 text-left" onClick={() => setOpen((o) => !o)}>
        <div className="w-12 h-16 rounded-lg overflow-hidden bg-ink-700 shrink-0">
          <GameCover coverUrl={game?.coverUrl} title={game?.title ?? ""} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-100 truncate">{game?.title ?? "Unknown game"}</p>
          <p className="text-sm text-slate-400 truncate">{run.challenge.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {run.status === "completed" ? "Completed" : "Abandoned"}{" "}
            {run.endedAt && new Date(run.endedAt).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full capitalize shrink-0 ${
            run.status === "completed" ? "bg-emerald-600/20 text-emerald-300" : "bg-red-900/30 text-red-300"
          }`}
        >
          {run.status}
        </span>
        {open ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/5 pt-4 animate-fade-in">
          <p className="text-sm text-slate-300 mb-3">{run.challenge.description}</p>
          <p className="text-xs text-slate-400 mb-3">
            {completedCount} / {run.objectives.length} objectives completed
          </p>
          {run.completion?.rating && (
            <p className="text-sm text-slate-300 mb-1">Rating: {"★".repeat(run.completion.rating)}</p>
          )}
          {run.completion?.timeSpentHours !== undefined && (
            <p className="text-sm text-slate-300 mb-1">Time spent: {run.completion.timeSpentHours}h</p>
          )}
          {run.completion?.reflection && (
            <p className="text-sm text-slate-400 italic mb-1">"{run.completion.reflection}"</p>
          )}
          {run.completion?.favoriteMoments && (
            <p className="text-sm text-slate-400 mb-1">Favorite moment: {run.completion.favoriteMoments}</p>
          )}
          {run.abandonReason && <p className="text-sm text-slate-400 italic mb-1">Reason: {run.abandonReason}</p>}
          {run.notes && <p className="text-sm text-slate-400 mt-2">Notes: {run.notes}</p>}

          <button className="btn-ghost text-xs mt-3" onClick={onResetToBacklog}>
            <RotateCcw size={14} /> Reset game to Backlog
          </button>
        </div>
      )}
    </div>
  );
}
