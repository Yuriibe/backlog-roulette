import { useMemo, useRef, useState } from "react";
import { Library, Loader2, Plus, RefreshCw, RotateCw, Tag, Upload, Wand2, X } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import type { Game } from "../../types";
import { uniqueGenres, uniqueTags } from "../../lib/roulette";
import { lookupGameLength } from "../../lib/hltbLookup";
import { syncSteamLibrary } from "../../lib/steamSync";
import { GameCard } from "./GameCard";
import { GameFormModal } from "./GameFormModal";
import { ImportModal } from "./ImportModal";
import { FilterBar, DEFAULT_BACKLOG_FILTERS } from "./FilterBar";
import type { BacklogFilters } from "./FilterBar";
import { EmptyState } from "../common/EmptyState";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface BacklogViewProps {
  onChooseGame: (gameId: string) => void;
  onGoToActiveRun: () => void;
}

export function BacklogView({ onChooseGame, onGoToActiveRun }: BacklogViewProps) {
  const games = useAppStore((s) => s.games);
  const addGame = useAppStore((s) => s.addGame);
  const updateGame = useAppStore((s) => s.updateGame);
  const deleteGame = useAppStore((s) => s.deleteGame);
  const resetGameToBacklog = useAppStore((s) => s.resetGameToBacklog);
  const bulkAddTag = useAppStore((s) => s.bulkAddTag);
  const syncPlayedHours = useAppStore((s) => s.syncPlayedHours);
  const steamApiKey = useAppStore((s) => s.settings.steamApiKey);
  const steamId = useAppStore((s) => s.settings.steamId);
  const runs = useAppStore((s) => s.runs);
  const activeRuns = useAppStore((s) => s.activeOrPausedRuns());
  const maxActiveRuns = useAppStore((s) => s.settings.maxActiveRuns ?? 1);
  const atActiveLimit = activeRuns.length >= maxActiveRuns;

  const [filters, setFilters] = useState<BacklogFilters>(DEFAULT_BACKLOG_FILTERS);
  const [editing, setEditing] = useState<Game | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<Game | null>(null);
  const [importedMsg, setImportedMsg] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagText, setBulkTagText] = useState("");
  const [taggedMsg, setTaggedMsg] = useState<string | null>(null);
  const [blockedPlay, setBlockedPlay] = useState<Game | null>(null);
  const [confirmRecalibrate, setConfirmRecalibrate] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number } | null>(null);
  const [enrichSummary, setEnrichSummary] = useState<string | null>(null);
  const cancelEnrichRef = useRef(false);
  const [syncingSteam, setSyncingSteam] = useState(false);
  const [steamSyncMsg, setSteamSyncMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const genres = useMemo(() => uniqueGenres(games), [games]);
  const tags = useMemo(() => uniqueTags(games), [games]);
  const missingInfoGames = useMemo(() => games.filter((g) => !g.playtime && !g.estimatedHours), [games]);

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (filters.status !== "all" && g.status !== filters.status) return false;
      if (filters.genre !== "all" && g.genre !== filters.genre) return false;
      if (filters.playtime !== "any" && g.playtime !== filters.playtime) return false;
      if (filters.tag !== "all" && !(g.tags ?? []).includes(filters.tag)) return false;
      if (filters.played === "never" && g.previouslyPlayed) return false;
      if (filters.played === "previously" && !g.previouslyPlayed) return false;
      if (filters.hasEstimate === "missing" && (g.playtime || g.estimatedHours)) return false;
      if (filters.hasEstimate === "set" && !g.playtime && !g.estimatedHours) return false;
      if (filters.search.trim() && !g.title.toLowerCase().includes(filters.search.trim().toLowerCase())) return false;
      return true;
    });
  }, [games, filters]);

  function hasActiveRun(gameId: string) {
    return runs.some((r) => r.gameId === gameId && (r.status === "active" || r.status === "paused"));
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteGame(deleting.id);
    setDeleting(null);
  }

  function handlePlay(game: Game) {
    if (atActiveLimit) {
      setBlockedPlay(game);
      return;
    }
    onChooseGame(game.id);
  }

  function toggleSelect(gameId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  }

  function applyBulkTag() {
    if (!bulkTagText.trim() || selectedIds.size === 0) return;
    bulkAddTag(Array.from(selectedIds), bulkTagText.trim());
    setTaggedMsg(`Tagged ${selectedIds.size} game${selectedIds.size === 1 ? "" : "s"} "${bulkTagText.trim()}".`);
    setTimeout(() => setTaggedMsg(null), 4000);
    setBulkTagText("");
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  async function runLookupBatch(targets: Game[], verb: string) {
    if (targets.length === 0) return;

    cancelEnrichRef.current = false;
    setEnriching(true);
    setEnrichSummary(null);
    let updated = 0;
    let noMatch = 0;

    for (let i = 0; i < targets.length; i++) {
      if (cancelEnrichRef.current) break;
      setEnrichProgress({ done: i, total: targets.length });
      const result = await lookupGameLength(targets[i].title);
      if (result.ok) {
        updateGame(targets[i].id, {
          estimatedHours: result.estimatedHours,
          playtime: result.playtime,
        });
        updated++;
      } else {
        noMatch++;
      }
      // Polite pacing against an unofficial/undocumented endpoint.
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    setEnrichProgress(null);
    setEnriching(false);
    const stopped = cancelEnrichRef.current;
    setEnrichSummary(
      `${verb} ${updated} game${updated === 1 ? "" : "s"} from HowLongToBeat.` +
        (noMatch > 0 ? ` ${noMatch} had no match.` : "") +
        (stopped ? " Stopped early." : "")
    );
  }

  async function syncAllPlayedHours() {
    if (!steamApiKey || !steamId) return;
    setSyncingSteam(true);
    setSteamSyncMsg(null);
    const result = await syncSteamLibrary(steamApiKey, steamId);
    setSyncingSteam(false);
    if (!result.ok || !result.games) {
      setSteamSyncMsg({ text: result.error ?? "Steam sync failed.", error: true });
      return;
    }
    const updated = syncPlayedHours(result.games.map((g) => ({ title: g.title, playedHours: g.playedHours, previouslyPlayed: g.previouslyPlayed })));
    setSteamSyncMsg({
      text:
        updated > 0
          ? `Refreshed playtime for ${updated} game${updated === 1 ? "" : "s"}.`
          : "Playtime is already up to date.",
    });
    setTimeout(() => setSteamSyncMsg(null), 4000);
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <header className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-100">My Backlog</h1>
        <div className="flex gap-2 flex-wrap">
          {missingInfoGames.length > 0 && (
            <button
              className="btn-secondary"
              onClick={() => runLookupBatch(missingInfoGames, "Filled in")}
              disabled={enriching}
            >
              {enriching ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              Fill missing info ({missingInfoGames.length})
            </button>
          )}
          {games.length > 0 && (
            <button
              className="btn-secondary"
              onClick={() => setConfirmRecalibrate(true)}
              disabled={enriching}
              title="Re-fetches every game's length from HowLongToBeat and overwrites whatever's currently stored — use this to fix games where the estimate looks wrong."
            >
              {enriching ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
              Recalibrate all ({games.length})
            </button>
          )}
          {steamApiKey && steamId && (
            <button
              className="btn-secondary"
              onClick={syncAllPlayedHours}
              disabled={syncingSteam}
              title="Refreshes played hours for every game already in your backlog that's also in your Steam library. Doesn't add or remove games."
            >
              {syncingSteam ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sync playtime from Steam
            </button>
          )}
          <button
            className={selectMode ? "btn-primary" : "btn-secondary"}
            onClick={() => {
              setSelectMode((v) => !v);
              setSelectedIds(new Set());
            }}
          >
            <Tag size={16} /> {selectMode ? "Cancel tagging" : "Tag multiple"}
          </button>
          <button className="btn-secondary" onClick={() => setImporting(true)}>
            <Upload size={16} /> Import
          </button>
          <button className="btn-primary" onClick={() => setEditing("new")}>
            <Plus size={16} /> Add game
          </button>
        </div>
      </header>

      {enriching && enrichProgress && (
        <div className="card px-4 py-3 mb-4 flex items-center gap-3 animate-fade-in">
          <Loader2 size={16} className="animate-spin text-accent-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-slate-300">
              Looking up {enrichProgress.done + 1} of {enrichProgress.total} on HowLongToBeat...
            </p>
            <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden mt-1.5">
              <div
                className="h-full bg-accent-500 transition-all duration-300"
                style={{ width: `${(enrichProgress.done / enrichProgress.total) * 100}%` }}
              />
            </div>
          </div>
          <button className="btn-ghost text-xs" onClick={() => (cancelEnrichRef.current = true)}>
            Stop
          </button>
        </div>
      )}
      {enrichSummary && (
        <div className="card px-4 py-2 mb-4 text-sm text-emerald-300 animate-fade-in">{enrichSummary}</div>
      )}
      {steamSyncMsg && (
        <div
          className={`card px-4 py-2 mb-4 text-sm animate-fade-in ${
            steamSyncMsg.error ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {steamSyncMsg.text}
        </div>
      )}

      {selectMode && (
        <div className="card px-4 py-3 mb-4 flex flex-wrap items-center gap-3 animate-fade-in">
          <span className="text-sm text-slate-300">
            {selectedIds.size} selected — click game covers below to select/deselect
          </span>
          <input
            className="input w-auto flex-1 min-w-[160px]"
            placeholder="Tag name, e.g. Backlog"
            value={bulkTagText}
            onChange={(e) => setBulkTagText(e.target.value)}
          />
          <button
            className="btn-primary text-sm"
            onClick={applyBulkTag}
            disabled={selectedIds.size === 0 || !bulkTagText.trim()}
          >
            Apply tag to {selectedIds.size}
          </button>
          <button className="btn-ghost text-sm" onClick={() => setSelectedIds(new Set(filtered.map((g) => g.id)))}>
            Select all filtered ({filtered.length})
          </button>
          {selectedIds.size > 0 && (
            <button className="btn-ghost text-sm" onClick={() => setSelectedIds(new Set())}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      )}

      {importedMsg && (
        <div className="card px-4 py-2 mb-4 text-sm text-emerald-300 animate-fade-in">{importedMsg}</div>
      )}
      {taggedMsg && <div className="card px-4 py-2 mb-4 text-sm text-emerald-300 animate-fade-in">{taggedMsg}</div>}

      {games.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Your backlog is empty"
          description="Add a game manually or import your Steam library to get started."
          action={
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setImporting(true)}>
                Import
              </button>
              <button className="btn-primary" onClick={() => setEditing("new")}>
                Add game
              </button>
            </div>
          }
        />
      ) : (
        <>
          <FilterBar filters={filters} genres={genres} tags={tags} onChange={setFilters} />
          {filtered.length === 0 ? (
            <EmptyState
              icon={Library}
              title="No games match these filters"
              description="Try adjusting your search or filters."
              action={
                <button className="btn-secondary" onClick={() => setFilters(DEFAULT_BACKLOG_FILTERS)}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((g) => (
                <GameCard
                  key={g.id}
                  game={g}
                  onEdit={() => setEditing(g)}
                  onDelete={() => setDeleting(g)}
                  onReset={g.status !== "backlog" && !hasActiveRun(g.id) ? () => resetGameToBacklog(g.id) : undefined}
                  onPlay={g.status === "backlog" ? () => handlePlay(g) : undefined}
                  selectMode={selectMode}
                  selected={selectedIds.has(g.id)}
                  onToggleSelect={() => toggleSelect(g.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <GameFormModal
          initial={editing === "new" ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSave={(payload) => {
            if (editing === "new") {
              addGame(payload);
            } else {
              updateGame(editing.id, payload);
            }
            setEditing(null);
          }}
        />
      )}

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImported={(added, updated) => {
            setImporting(false);
            const parts: string[] = [];
            if (added > 0) parts.push(`imported ${added} game${added === 1 ? "" : "s"}`);
            if (updated > 0) parts.push(`refreshed playtime for ${updated} game${updated === 1 ? "" : "s"}`);
            setImportedMsg(parts.length > 0 ? `Done — ${parts.join(", ")}.` : "Nothing new to apply.");
            setTimeout(() => setImportedMsg(null), 4000);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this game?"
          message={`"${deleting.title}" and any run history tied to it will be permanently removed.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {blockedPlay && atActiveLimit && (
        <ConfirmDialog
          title="You've reached your active game limit"
          message={`You can have ${maxActiveRuns} game${maxActiveRuns === 1 ? "" : "s"} active at once. Finish, pause, or abandon one before starting "${blockedPlay.title}" — or raise the limit in Settings.`}
          confirmLabel="Go to Active Run"
          onConfirm={() => {
            setBlockedPlay(null);
            onGoToActiveRun();
          }}
          onCancel={() => setBlockedPlay(null)}
        />
      )}

      {confirmRecalibrate && (
        <ConfirmDialog
          title="Recalibrate playtime for all games?"
          message={`This re-fetches length data from HowLongToBeat for all ${games.length} games and overwrites their current "estimated hours to beat" and playtime bucket, including any you've set manually. Genre, tags, notes, and hours already played are untouched. Takes a few minutes for a large backlog — you can stop it partway.`}
          confirmLabel="Start recalibration"
          onConfirm={() => {
            setConfirmRecalibrate(false);
            runLookupBatch(games, "Recalibrated");
          }}
          onCancel={() => setConfirmRecalibrate(false)}
        />
      )}
    </div>
  );
}
