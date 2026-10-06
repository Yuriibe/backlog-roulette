import { useState } from "react";
import { Dices, PartyPopper, Pause, Play, RotateCcw, X } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import type { Game, Run } from "../../types";
import { ObjectiveList } from "./ObjectiveList";
import { CompletionModal } from "./CompletionModal";
import { EmptyState } from "../common/EmptyState";
import { Modal } from "../common/Modal";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { GameCover } from "../common/GameCover";

interface ActiveRunViewProps {
  onDone: () => void;
}

export function ActiveRunView({ onDone }: ActiveRunViewProps) {
  const runs = useAppStore((s) => s.activeOrPausedRuns());
  const games = useAppStore((s) => s.games);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ game: Game; run: Run } | null>(null);

  if (summary) {
    const completedCount = summary.run.objectives.filter((o) => o.completed).length;
    return (
      <div className="p-6 md:p-10 max-w-xl mx-auto flex flex-col items-center text-center gap-4 animate-pop-in">
        <div className="w-16 h-16 rounded-2xl bg-accent-600/20 flex items-center justify-center">
          <PartyPopper size={28} className="text-accent-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Run complete!</h1>
        <p className="text-slate-400">
          {summary.game.title} — {summary.run.challenge.name}
        </p>
        <div className="card p-5 w-full text-left mt-2">
          <p className="text-sm text-slate-300 mb-2">
            {completedCount} / {summary.run.objectives.length} objectives completed
          </p>
          {summary.run.completion?.rating && (
            <p className="text-sm text-slate-300 mb-2">Rating: {"★".repeat(summary.run.completion.rating)}</p>
          )}
          {summary.run.completion?.timeSpentHours !== undefined && (
            <p className="text-sm text-slate-300 mb-2">Time spent: {summary.run.completion.timeSpentHours}h</p>
          )}
          {summary.run.completion?.reflection && (
            <p className="text-sm text-slate-400 italic mb-2">"{summary.run.completion.reflection}"</p>
          )}
          {summary.run.completion?.favoriteMoments && (
            <p className="text-sm text-slate-400">Favorite moment: {summary.run.completion.favoriteMoments}</p>
          )}
        </div>
        <button className="btn-primary mt-2" onClick={() => setSummary(null)}>
          Done
        </button>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          icon={Dices}
          title="No active run"
          description="Spin the roulette to pick a game and start a challenge."
          action={
            <button className="btn-primary" onClick={onDone}>
              Go to Roulette
            </button>
          }
        />
      </div>
    );
  }

  const selectedRun = runs.find((r) => r.id === selectedId) ?? (runs.length === 1 ? runs[0] : null);

  if (!selectedRun) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 mb-6">Active games ({runs.length})</h1>
        <div className="flex flex-col gap-3">
          {runs.map((run) => {
            const game = games.find((g) => g.id === run.gameId);
            if (!game) return null;
            const completedCount = run.objectives.filter((o) => o.completed).length;
            return (
              <button
                key={run.id}
                className="card p-4 flex items-center gap-4 text-left hover:border-accent-600/40 transition-colors"
                onClick={() => setSelectedId(run.id)}
              >
                <div className="w-14 h-18 rounded-lg overflow-hidden bg-ink-700 shrink-0 border border-white/10">
                  <GameCover coverUrl={game.coverUrl} title={game.title} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-100 truncate">{game.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-ink-700 text-slate-300 capitalize shrink-0">
                      {run.status}
                    </span>
                  </div>
                  <p className="text-sm text-accent-300 truncate">{run.challenge.name}</p>
                  {run.objectives.length > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {completedCount} / {run.objectives.length} objectives
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const game = games.find((g) => g.id === selectedRun.gameId);
  if (!game) return null;

  return (
    <RunDetail
      run={selectedRun}
      game={game}
      onBack={runs.length > 1 ? () => setSelectedId(null) : undefined}
      onLeave={() => setSelectedId(null)}
      onCompleted={(g, r) => {
        setSelectedId(null);
        setSummary({ game: g, run: r });
      }}
    />
  );
}

interface RunDetailProps {
  run: Run;
  game: Game;
  onBack?: () => void;
  onLeave: () => void;
  onCompleted: (game: Game, run: Run) => void;
}

function RunDetail({ run, game, onBack, onLeave, onCompleted }: RunDetailProps) {
  const pauseRun = useAppStore((s) => s.pauseRun);
  const resumeRun = useAppStore((s) => s.resumeRun);
  const cancelRun = useAppStore((s) => s.cancelRun);
  const abandonRun = useAppStore((s) => s.abandonRun);
  const completeRun = useAppStore((s) => s.completeRun);
  const toggleObjective = useAppStore((s) => s.toggleObjective);
  const editObjective = useAppStore((s) => s.editObjective);
  const setRunNotes = useAppStore((s) => s.setRunNotes);

  const [showComplete, setShowComplete] = useState(false);
  const [showAbandon, setShowAbandon] = useState(false);
  const [abandonReason, setAbandonReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const completedCount = run.objectives.filter((o) => o.completed).length;
  const progress = run.objectives.length > 0 ? Math.round((completedCount / run.objectives.length) * 100) : 0;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      {onBack && (
        <button className="text-xs text-slate-500 underline hover:text-slate-300 mb-4" onClick={onBack}>
          ← Back to active games
        </button>
      )}
      <div className="flex gap-5 mb-6">
        <div className="w-24 h-32 rounded-xl overflow-hidden bg-ink-700 shrink-0 border border-white/10">
          <GameCover coverUrl={game.coverUrl} title={game.title} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-100">{game.title}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-ink-700 text-slate-300 capitalize">{run.status}</span>
          </div>
          <p className="text-accent-300 font-medium">{run.challenge.name}</p>
          <p className="text-sm text-slate-400 mt-1">{run.challenge.description}</p>
          <p className="text-xs text-slate-500 mt-2">Started {new Date(run.startedAt).toLocaleDateString()}</p>
        </div>
      </div>

      {run.objectives.length > 0 && (
        <>
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
              <div className="h-full bg-accent-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <section className="mb-6">
            <h2 className="label mb-2">Objectives</h2>
            <ObjectiveList
              objectives={run.objectives}
              onToggle={(id) => toggleObjective(run.id, id)}
              onEdit={(id, text) => editObjective(run.id, id, text)}
            />
          </section>
        </>
      )}

      <section className="mb-8">
        <h2 className="label mb-2">Your notes</h2>
        <textarea
          className="input"
          rows={4}
          placeholder="Jot down thoughts about your playthrough..."
          value={run.notes}
          onChange={(e) => setRunNotes(run.id, e.target.value)}
        />
      </section>

      <div className="flex flex-wrap gap-3">
        {run.status === "active" ? (
          <button className="btn-secondary" onClick={() => pauseRun(run.id)}>
            <Pause size={16} /> Pause
          </button>
        ) : (
          <button className="btn-secondary" onClick={() => resumeRun(run.id)}>
            <Play size={16} /> Resume
          </button>
        )}
        <button className="btn-primary" onClick={() => setShowComplete(true)}>
          Mark as complete
        </button>
        <button className="btn-secondary" onClick={() => setShowCancel(true)}>
          <RotateCcw size={16} /> Put back in backlog
        </button>
        <button className="btn-ghost text-red-300" onClick={() => setShowAbandon(true)}>
          <X size={16} /> Abandon run
        </button>
      </div>

      {showComplete && (
        <CompletionModal
          onCancel={() => setShowComplete(false)}
          onSubmit={(completion) => {
            completeRun(run.id, completion);
            setShowComplete(false);
            onCompleted(game, { ...run, status: "completed", completion });
          }}
        />
      )}

      {showCancel && (
        <ConfirmDialog
          title="Put this game back in the backlog?"
          message="This ends the run without counting it as abandoned — no history entry is kept, as if it never started. Your notes and objective progress on this run will be lost."
          confirmLabel="Put back in backlog"
          onConfirm={() => {
            cancelRun(run.id);
            setShowCancel(false);
            onLeave();
          }}
          onCancel={() => setShowCancel(false)}
        />
      )}

      {showAbandon && (
        <Modal title="Abandon this run?" onClose={() => setShowAbandon(false)}>
          <p className="text-sm text-slate-300 mb-4">
            This moves the game to Abandoned. It's totally fine to stop enjoying a game — you can reset it back to
            your backlog any time from History.
          </p>
          <label className="label">Reason (optional)</label>
          <textarea
            className="input mt-1 mb-4"
            rows={2}
            value={abandonReason}
            onChange={(e) => setAbandonReason(e.target.value)}
            placeholder="Wasn't feeling it, moving to something else, etc."
          />
          <div className="flex justify-end gap-3">
            <button className="btn-ghost" onClick={() => setShowAbandon(false)}>
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                abandonRun(run.id, abandonReason.trim() || undefined);
                setShowAbandon(false);
                setAbandonReason("");
                onLeave();
              }}
            >
              Abandon run
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
