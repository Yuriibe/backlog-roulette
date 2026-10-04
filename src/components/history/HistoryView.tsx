import { useMemo } from "react";
import { History } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { HistoryCard } from "./HistoryCard";
import { EmptyState } from "../common/EmptyState";

export function HistoryView() {
  const runs = useAppStore((s) => s.runs);
  const games = useAppStore((s) => s.games);
  const resetGameToBacklog = useAppStore((s) => s.resetGameToBacklog);

  const historyRuns = useMemo(
    () =>
      runs
        .filter((r) => r.status === "completed" || r.status === "abandoned")
        .sort((a, b) => new Date(b.endedAt ?? b.startedAt).getTime() - new Date(a.endedAt ?? a.startedAt).getTime()),
    [runs]
  );

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">History</h1>

      {historyRuns.length === 0 ? (
        <EmptyState
          icon={History}
          title="No completed or abandoned runs yet"
          description="Once you finish or abandon a run, it will show up here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {historyRuns.map((run) => (
            <HistoryCard
              key={run.id}
              run={run}
              game={games.find((g) => g.id === run.gameId)}
              onResetToBacklog={() => resetGameToBacklog(run.gameId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
