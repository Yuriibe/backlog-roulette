import { Pause, Play, X } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import type { Run } from "../../types";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { GameCover } from "../common/GameCover";

interface ActiveRunBannerProps {
  run: Run;
  onContinue: () => void;
}

export function ActiveRunBanner({ run, onContinue }: ActiveRunBannerProps) {
  const game = useAppStore((s) => s.games.find((g) => g.id === run.gameId));
  const pauseRun = useAppStore((s) => s.pauseRun);
  const resumeRun = useAppStore((s) => s.resumeRun);
  const abandonRun = useAppStore((s) => s.abandonRun);
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);

  if (!game) return null;

  return (
    <div className="card max-w-xl mx-auto p-5 animate-fade-in border-accent-600/30">
      <p className="label mb-2">You already have a run in progress</p>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-ink-700 shrink-0">
          <GameCover coverUrl={game.coverUrl} title={game.title} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 truncate">{game.title}</p>
          <p className="text-sm text-slate-400 truncate">{run.challenge.name}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-ink-700 text-slate-300 capitalize shrink-0">
          {run.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button className="btn-primary" onClick={onContinue}>
          Continue run
        </button>
        {run.status === "active" ? (
          <button className="btn-secondary" onClick={() => pauseRun(run.id)}>
            <Pause size={16} /> Pause
          </button>
        ) : (
          <button className="btn-secondary" onClick={() => resumeRun(run.id)}>
            <Play size={16} /> Resume
          </button>
        )}
        <button className="btn-ghost text-red-300" onClick={() => setConfirmingAbandon(true)}>
          <X size={16} /> Abandon
        </button>
      </div>

      {confirmingAbandon && (
        <ConfirmDialog
          title="Abandon this run?"
          message="The game will move to Abandoned. You can always reset it back to your backlog later."
          confirmLabel="Abandon run"
          danger
          onConfirm={() => {
            abandonRun(run.id);
            setConfirmingAbandon(false);
          }}
          onCancel={() => setConfirmingAbandon(false)}
        />
      )}
    </div>
  );
}
