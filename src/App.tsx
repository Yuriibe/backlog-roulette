import { useState } from "react";
import { Shell } from "./components/layout/Shell";
import { RouletteView } from "./components/roulette/RouletteView";
import { BacklogView } from "./components/backlog/BacklogView";
import { ActiveRunView } from "./components/activerun/ActiveRunView";
import { HistoryView } from "./components/history/HistoryView";
import { SettingsView } from "./components/settings/SettingsView";
import { ChallengeSelectView } from "./components/challenge/ChallengeSelectView";

export type View = "roulette" | "backlog" | "active-run" | "history" | "settings";

export default function App() {
  const [view, setView] = useState<View>("roulette");
  const [pendingChallengeGameId, setPendingChallengeGameId] = useState<string | null>(null);

  if (pendingChallengeGameId) {
    return (
      <Shell view={view} onNavigate={setView}>
        <ChallengeSelectView
          gameId={pendingChallengeGameId}
          onCancel={() => setPendingChallengeGameId(null)}
          onRunStarted={() => {
            setPendingChallengeGameId(null);
            setView("active-run");
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell view={view} onNavigate={setView}>
      {view === "roulette" && (
        <RouletteView
          onGameAccepted={(gameId) => setPendingChallengeGameId(gameId)}
          onGoToActiveRun={() => setView("active-run")}
        />
      )}
      {view === "backlog" && (
        <BacklogView
          onChooseGame={(gameId) => setPendingChallengeGameId(gameId)}
          onGoToActiveRun={() => setView("active-run")}
        />
      )}
      {view === "active-run" && <ActiveRunView onDone={() => setView("roulette")} />}
      {view === "history" && <HistoryView />}
      {view === "settings" && <SettingsView />}
    </Shell>
  );
}
