import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Challenge, Game, Run, RunObjective, Settings } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { SAMPLE_GAMES } from "../data/sampleGames";
import { cleanTitle } from "../lib/cleanTitle";

function id(): string {
  return crypto.randomUUID();
}

interface AppState {
  games: Game[];
  runs: Run[];
  settings: Settings;

  // games
  addGame: (game: Omit<Game, "id" | "createdAt" | "status"> & { status?: Game["status"] }) => Game;
  updateGame: (id: string, patch: Partial<Game>) => void;
  deleteGame: (id: string) => void;
  importGames: (games: Omit<Game, "id" | "createdAt">[]) => number;
  removeSampleGames: () => void;
  resetGameToBacklog: (id: string) => void;
  bulkAddTag: (gameIds: string[], tag: string) => void;

  // runs
  activeOrPausedRun: () => Run | undefined;
  startRun: (gameId: string, challenge: Challenge) => Run;
  pauseRun: (runId: string) => void;
  resumeRun: (runId: string) => void;
  abandonRun: (runId: string, reason?: string) => void;
  completeRun: (runId: string, completion: Run["completion"]) => void;
  toggleObjective: (runId: string, objectiveId: string) => void;
  editObjective: (runId: string, objectiveId: string, text: string) => void;
  setRunNotes: (runId: string, notes: string) => void;

  // settings / data
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAllData: (data: { games: Game[]; runs: Run[]; settings: Settings }) => void;
  resetAllData: () => void;
}

function objectivesFromChallenge(challenge: Challenge): RunObjective[] {
  if (challenge.style === "freeplay") return [];
  const primary: RunObjective = {
    id: id(),
    text: challenge.primaryObjective,
    isBonus: false,
    completed: false,
  };
  const bonuses: RunObjective[] = challenge.bonusObjectives.map((text) => ({
    id: id(),
    text,
    isBonus: true,
    completed: false,
  }));
  return [primary, ...bonuses];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      games: SAMPLE_GAMES,
      runs: [],
      settings: DEFAULT_SETTINGS,

      addGame: (game) => {
        const newGame: Game = {
          ...game,
          title: cleanTitle(game.title),
          id: id(),
          createdAt: new Date().toISOString(),
          status: game.status ?? "backlog",
        };
        set((s) => ({ games: [...s.games, newGame] }));
        return newGame;
      },

      updateGame: (gameId, patch) => {
        const cleanPatch = patch.title !== undefined ? { ...patch, title: cleanTitle(patch.title) } : patch;
        set((s) => ({
          games: s.games.map((g) => (g.id === gameId ? { ...g, ...cleanPatch } : g)),
        }));
      },

      deleteGame: (gameId) => {
        set((s) => ({
          games: s.games.filter((g) => g.id !== gameId),
          runs: s.runs.filter((r) => r.gameId !== gameId),
        }));
      },

      importGames: (newGames) => {
        const existing = new Set(get().games.map((g) => g.title.trim().toLowerCase()));
        let added = 0;
        const toAdd: Game[] = [];
        for (const g of newGames) {
          const title = cleanTitle(g.title);
          const key = title.trim().toLowerCase();
          if (existing.has(key)) continue;
          existing.add(key);
          toAdd.push({ ...g, title, id: id(), createdAt: new Date().toISOString() });
          added++;
        }
        set((s) => ({ games: [...s.games, ...toAdd] }));
        return added;
      },

      removeSampleGames: () => {
        set((s) => ({ games: s.games.filter((g) => !g.isSample) }));
      },

      resetGameToBacklog: (gameId) => {
        set((s) => ({
          games: s.games.map((g) => (g.id === gameId ? { ...g, status: "backlog" } : g)),
        }));
      },

      bulkAddTag: (gameIds, tag) => {
        const cleanTag = tag.trim();
        if (!cleanTag || gameIds.length === 0) return;
        const idSet = new Set(gameIds);
        set((s) => ({
          games: s.games.map((g) =>
            idSet.has(g.id) ? { ...g, tags: Array.from(new Set([...(g.tags ?? []), cleanTag])) } : g
          ),
        }));
      },

      activeOrPausedRun: () => {
        return get().runs.find((r) => r.status === "active" || r.status === "paused");
      },

      startRun: (gameId, challenge) => {
        const run: Run = {
          id: id(),
          gameId,
          challenge,
          objectives: objectivesFromChallenge(challenge),
          status: "active",
          startedAt: new Date().toISOString(),
          notes: "",
        };
        set((s) => ({
          runs: [...s.runs, run],
          games: s.games.map((g) => (g.id === gameId ? { ...g, status: "active" } : g)),
        }));
        return run;
      },

      pauseRun: (runId) => {
        set((s) => ({
          runs: s.runs.map((r) => (r.id === runId ? { ...r, status: "paused" } : r)),
        }));
      },

      resumeRun: (runId) => {
        set((s) => ({
          runs: s.runs.map((r) => (r.id === runId ? { ...r, status: "active" } : r)),
        }));
      },

      abandonRun: (runId, reason) => {
        const run = get().runs.find((r) => r.id === runId);
        if (!run) return;
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId
              ? { ...r, status: "abandoned", endedAt: new Date().toISOString(), abandonReason: reason }
              : r
          ),
          games: s.games.map((g) => (g.id === run.gameId ? { ...g, status: "abandoned" } : g)),
        }));
      },

      completeRun: (runId, completion) => {
        const run = get().runs.find((r) => r.id === runId);
        if (!run) return;
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId
              ? { ...r, status: "completed", endedAt: new Date().toISOString(), completion }
              : r
          ),
          games: s.games.map((g) => (g.id === run.gameId ? { ...g, status: "completed" } : g)),
        }));
      },

      toggleObjective: (runId, objectiveId) => {
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  objectives: r.objectives.map((o) =>
                    o.id === objectiveId ? { ...o, completed: !o.completed } : o
                  ),
                }
              : r
          ),
        }));
      },

      editObjective: (runId, objectiveId, text) => {
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  objectives: r.objectives.map((o) => (o.id === objectiveId ? { ...o, text } : o)),
                }
              : r
          ),
        }));
      },

      setRunNotes: (runId, notes) => {
        set((s) => ({
          runs: s.runs.map((r) => (r.id === runId ? { ...r, notes } : r)),
        }));
      },

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
      },

      replaceAllData: (data) => {
        set({ games: data.games, runs: data.runs, settings: data.settings });
      },

      resetAllData: () => {
        set({ games: [], runs: [], settings: DEFAULT_SETTINGS });
      },
    }),
    {
      name: "backlog-roulette-data",
      version: 1,
      migrate: (persistedState, version) => {
        const state = persistedState as { games?: Game[] } | undefined;
        if (version < 1 && state?.games) {
          state.games = state.games.map((g) => ({ ...g, title: cleanTitle(g.title) }));
        }
        return state;
      },
    }
  )
);
