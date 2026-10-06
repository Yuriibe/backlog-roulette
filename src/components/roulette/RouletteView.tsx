import { useMemo, useState } from "react";
import { Dices, ListChecks, Sparkles } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { DEFAULT_FILTERS } from "../../types";
import type { Game, RouletteFilters } from "../../types";
import { getEligibleGames, pickRandom, uniqueGenres, uniqueTags } from "../../lib/roulette";
import { FilterPanel } from "./FilterPanel";
import { RouletteWheel } from "./RouletteWheel";
import { GameRevealCard } from "./GameRevealCard";
import { ActiveRunBanner } from "./ActiveRunBanner";
import { ManualPickModal } from "./ManualPickModal";
import { EmptyState } from "../common/EmptyState";

type Phase = "setup" | "spinning" | "revealed";

interface RouletteViewProps {
  onGameAccepted: (gameId: string) => void;
  onGoToActiveRun: () => void;
}

export function RouletteView({ onGameAccepted, onGoToActiveRun }: RouletteViewProps) {
  const games = useAppStore((s) => s.games);
  const activeRuns = useAppStore((s) => s.activeOrPausedRuns());
  const maxRerolls = useAppStore((s) => s.settings.maxRerolls);
  const maxActiveRuns = useAppStore((s) => s.settings.maxActiveRuns ?? 1);
  const atActiveLimit = activeRuns.length >= maxActiveRuns;

  const [filters, setFilters] = useState<RouletteFilters>(DEFAULT_FILTERS);
  const [phase, setPhase] = useState<Phase>("setup");
  const [winner, setWinner] = useState<Game | null>(null);
  const [spinToken, setSpinToken] = useState(0);
  const [rerollsUsed, setRerollsUsed] = useState(0);
  const [quickSuggestion, setQuickSuggestion] = useState<Game | null>(null);
  const [manualPicking, setManualPicking] = useState(false);

  const backlogGames = useMemo(() => games.filter((g) => g.status === "backlog"), [games]);
  const genres = useMemo(() => uniqueGenres(backlogGames), [backlogGames]);
  const tags = useMemo(() => uniqueTags(backlogGames), [backlogGames]);
  const eligible = useMemo(() => getEligibleGames(games, filters), [games, filters]);

  function spin(isReroll: boolean) {
    const pool = eligible.length > 0 ? eligible : [];
    const next = pickRandom(pool);
    if (!next) return;
    setWinner(next);
    setPhase("spinning");
    setSpinToken((t) => t + 1);
    if (isReroll) setRerollsUsed((r) => r + 1);
    else setRerollsUsed(0);
  }

  function acceptGame(game: Game) {
    onGameAccepted(game.id);
  }

  if (atActiveLimit) {
    return (
      <div className="p-6 md:p-10 flex flex-col gap-6 items-center justify-center min-h-screen">
        <p className="text-sm text-slate-400 text-center max-w-md">
          You've reached your limit of {maxActiveRuns} active game{maxActiveRuns === 1 ? "" : "s"}. Finish, pause,
          or abandon one below before starting another — or raise the limit in Settings.
        </p>
        <div className="flex flex-col gap-4 w-full items-center">
          {activeRuns.map((run) => (
            <ActiveRunBanner key={run.id} run={run} onContinue={onGoToActiveRun} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-1">What should I play?</h1>
        <p className="text-sm text-slate-400">Spin to let fate pick your next game from the backlog.</p>
      </header>

      {activeRuns.length > 0 && (
        <p className="text-xs text-slate-500 text-center mb-6">
          {activeRuns.length} / {maxActiveRuns} active game{maxActiveRuns === 1 ? "" : "s"} in progress —{" "}
          <button className="underline hover:text-slate-300" onClick={onGoToActiveRun}>
            view them
          </button>
          .
        </p>
      )}

      {phase === "setup" && (
        <div className="flex flex-col gap-6 items-center">
          <FilterPanel filters={filters} genres={genres} tags={tags} onChange={setFilters} />

          {eligible.length === 0 ? (
            <EmptyState
              icon={Dices}
              title="No eligible games match these filters"
              description="Try widening your filters, or add more games to your backlog."
              action={
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
                    Clear filters
                  </button>
                  {backlogGames.length > 0 && (
                    <button className="btn-ghost" onClick={() => setManualPicking(true)}>
                      <ListChecks size={16} /> Choose manually instead
                    </button>
                  )}
                </div>
              }
            />
          ) : (
            <>
              <p className="text-xs text-slate-500">{eligible.length} eligible game{eligible.length === 1 ? "" : "s"}</p>
              <button className="btn-primary text-base px-8 py-3" onClick={() => spin(false)}>
                <Dices size={20} />
                Spin the wheel
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap justify-center">
                <span>or</span>
                <button
                  className="underline hover:text-slate-300"
                  onClick={() => setQuickSuggestion(pickRandom(eligible) ?? null)}
                >
                  get a quick suggestion without spinning
                </button>
                <span>·</span>
                <button className="underline hover:text-slate-300" onClick={() => setManualPicking(true)}>
                  choose a game yourself
                </button>
              </div>

              {quickSuggestion && (
                <div className="card px-4 py-3 flex items-center gap-3 animate-fade-in">
                  <Sparkles size={16} className="text-accent-400 shrink-0" />
                  <p className="text-sm text-slate-300">
                    How about <span className="font-semibold text-slate-100">{quickSuggestion.title}</span>?
                  </p>
                  <button className="btn-ghost text-xs py-1" onClick={() => acceptGame(quickSuggestion)}>
                    Start this
                  </button>
                  <button className="btn-ghost text-xs py-1" onClick={() => setQuickSuggestion(null)}>
                    Dismiss
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {(phase === "spinning" || phase === "revealed") && winner && (
        <div className="flex flex-col gap-8 items-center">
          <RouletteWheel
            eligible={eligible}
            winner={winner}
            spinToken={spinToken}
            onSettled={() => setPhase("revealed")}
          />
          {phase === "revealed" && (
            <GameRevealCard
              game={winner}
              rerollsLeft={Math.max(0, maxRerolls - rerollsUsed)}
              onAccept={() => acceptGame(winner)}
              onReroll={() => spin(true)}
            />
          )}
          {phase === "revealed" && (
            <button
              className="text-xs text-slate-500 underline hover:text-slate-300"
              onClick={() => {
                setPhase("setup");
                setWinner(null);
              }}
            >
              Back to filters
            </button>
          )}
        </div>
      )}

      {manualPicking && (
        <ManualPickModal
          games={backlogGames}
          onClose={() => setManualPicking(false)}
          onPick={(game) => {
            setManualPicking(false);
            acceptGame(game);
          }}
        />
      )}
    </div>
  );
}
