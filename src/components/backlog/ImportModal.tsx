import { useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Search, Upload } from "lucide-react";
import { Modal } from "../common/Modal";
import { parseImportFile, toGamePayload } from "../../lib/importExport";
import type { ParsedImportGame } from "../../lib/importExport";
import { syncSteamLibrary } from "../../lib/steamSync";
import { useAppStore } from "../../store/useAppStore";

interface ImportModalProps {
  onClose: () => void;
  onImported: (count: number) => void;
}

type Source = "file" | "steam";

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const games = useAppStore((s) => s.games);
  const importGames = useAppStore((s) => s.importGames);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [source, setSource] = useState<Source>("file");
  const [parsed, setParsed] = useState<ParsedImportGame[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewSearch, setPreviewSearch] = useState("");

  const [apiKeyDraft, setApiKeyDraft] = useState(settings.steamApiKey ?? "");
  const [steamIdDraft, setSteamIdDraft] = useState(settings.steamId ?? "");
  const [editingCreds, setEditingCreds] = useState(!settings.steamApiKey || !settings.steamId);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const existingTitles = new Set(games.map((g) => g.title.trim().toLowerCase()));

  function applyParsed(rows: ParsedImportGame[]) {
    setParsed(rows);
    const nonDupeIndices = rows
      .map((r, i) => (existingTitles.has(r.title.trim().toLowerCase()) ? -1 : i))
      .filter((i) => i !== -1);
    setSelected(new Set(nonDupeIndices));
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const rows = parseImportFile(file.name, text);
    if (rows.length === 0) {
      setFileError(
        "Couldn't find any games in that file. Expected a CSV with a Title column, or JSON (array, or a Steam-style { response: { games: [...] } } export)."
      );
      setParsed(null);
      return;
    }
    setFileError(null);
    applyParsed(rows);
  }

  async function handleSteamSync() {
    setSyncing(true);
    setSyncError(null);
    updateSettings({ steamApiKey: apiKeyDraft.trim(), steamId: steamIdDraft.trim() });
    const result = await syncSteamLibrary(apiKeyDraft.trim(), steamIdDraft.trim());
    setSyncing(false);
    if (!result.ok || !result.games) {
      setSyncError(result.error ?? "Steam sync failed.");
      return;
    }
    if (result.games.length === 0) {
      setSyncError("Steam returned zero games for that account.");
      return;
    }
    setEditingCreds(false);
    applyParsed(result.games);
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const visibleRows = useMemo(() => {
    if (!parsed) return [];
    const q = previewSearch.trim().toLowerCase();
    return parsed
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !q || p.title.toLowerCase().includes(q));
  }, [parsed, previewSearch]);

  function deselectAll() {
    setSelected(new Set());
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const { i } of visibleRows) next.add(i);
      return next;
    });
  }

  function doImport() {
    if (!parsed) return;
    const toImport = parsed.filter((_, i) => selected.has(i)).map(toGamePayload);
    const added = importGames(toImport);
    onImported(added);
  }

  return (
    <Modal title="Import backlog" onClose={onClose} wide>
      {!parsed && (
        <>
          <div className="flex gap-2 mb-4">
            <button
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                source === "file" ? "bg-accent-600 text-white" : "bg-ink-700 text-slate-300 hover:bg-ink-600"
              }`}
              onClick={() => setSource("file")}
            >
              Upload file
            </button>
            <button
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                source === "steam" ? "bg-accent-600 text-white" : "bg-ink-700 text-slate-300 hover:bg-ink-600"
              }`}
              onClick={() => setSource("steam")}
            >
              Sync from Steam
            </button>
          </div>

          {source === "file" && (
            <div
              className="border-2 border-dashed border-white/10 rounded-xl p-10 text-center cursor-pointer hover:border-accent-500/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <Upload size={28} className="text-accent-400 mx-auto mb-3" />
              <p className="text-slate-300 mb-1">Drop a CSV or JSON file here, or click to browse</p>
              <p className="text-xs text-slate-500">
                CSV: a "Title" column (optionally Genre, Hours). JSON: a Steam games export or a plain array.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {fileError && <p className="text-sm text-red-300 mt-3">{fileError}</p>}
            </div>
          )}

          {source === "steam" && (
            <div className="border border-white/10 rounded-xl p-5">
              {editingCreds ? (
                <>
                  <p className="text-sm text-slate-400 mb-4">
                    Pulls your <em>entire</em> owned-games library via Steam's official Web API — title, playtime
                    and cover art. This stays entirely between your browser, your local backend, and Steam; nothing
                    is sent anywhere else. Saved locally so you can re-sync anytime without re-entering it.
                  </p>
                  <div className="flex flex-col gap-3 mb-4">
                    <div>
                      <label className="label">Steam Web API key</label>
                      <input
                        className="input mt-1"
                        value={apiKeyDraft}
                        onChange={(e) => setApiKeyDraft(e.target.value)}
                        placeholder="Get a free one at steamcommunity.com/dev/apikey"
                      />
                    </div>
                    <div>
                      <label className="label">SteamID64 or custom profile URL name</label>
                      <input
                        className="input mt-1"
                        value={steamIdDraft}
                        onChange={(e) => setSteamIdDraft(e.target.value)}
                        placeholder="e.g. 76561198012345678, or the name in steamcommunity.com/id/<name>"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-amber-400 mb-4">
                    Your Steam profile's "Game details" privacy must be set to Public for this to work, even with
                    your own key.
                  </p>
                  {syncError && <p className="text-sm text-red-300 mb-3">{syncError}</p>}
                  <button
                    className="btn-primary text-sm"
                    onClick={handleSteamSync}
                    disabled={syncing || !apiKeyDraft.trim() || !steamIdDraft.trim()}
                  >
                    {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {syncing ? "Syncing..." : "Sync library"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300 mb-1">Steam account connected.</p>
                  <p className="text-xs text-slate-500 mb-4">
                    Re-run this anytime you buy new games — already-imported titles are skipped automatically.
                  </p>
                  {syncError && <p className="text-sm text-red-300 mb-3">{syncError}</p>}
                  <div className="flex gap-2">
                    <button className="btn-primary text-sm" onClick={handleSteamSync} disabled={syncing}>
                      {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {syncing ? "Syncing..." : "Sync now"}
                    </button>
                    <button className="btn-ghost text-sm" onClick={() => setEditingCreds(true)}>
                      Change account
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {parsed && (
        <>
          <p className="text-sm text-slate-400 mb-3">
            Found {parsed.length} games. Duplicates (matched by title) are unchecked by default — {selected.size}{" "}
            selected.
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="input pl-8 text-sm"
                placeholder="Filter this list..."
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
              />
            </div>
            <button className="btn-ghost text-xs" onClick={deselectAll} disabled={selected.size === 0}>
              Deselect all
            </button>
            <button className="btn-ghost text-xs" onClick={selectAllVisible}>
              Select all{previewSearch.trim() ? " shown" : ""}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Adding just a couple of new games? Click "Deselect all", then check only the ones you want.
          </p>

          <div className="max-h-80 overflow-y-auto flex flex-col gap-1 mb-4 border border-white/5 rounded-xl p-2">
            {visibleRows.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">No games match "{previewSearch}".</p>
            )}
            {visibleRows.map(({ p, i }) => {
              const isDupe = existingTitles.has(p.title.trim().toLowerCase());
              return (
                <label
                  key={i}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggle(i)}
                    className="w-4 h-4 accent-accent-500"
                  />
                  {p.coverUrl && (
                    <img src={p.coverUrl} alt="" className="w-6 h-8 object-cover rounded shrink-0 bg-ink-700" />
                  )}
                  <span className="flex-1 text-slate-200">{p.title}</span>
                  {p.genre && <span className="text-xs text-slate-500">{p.genre}</span>}
                  {isDupe && <span className="text-xs text-amber-400">already in backlog</span>}
                </label>
              );
            })}
          </div>
          <div className="flex justify-between">
            <button className="btn-ghost text-sm" onClick={() => setParsed(null)}>
              Start over
            </button>
            <div className="flex gap-3">
              <button className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={doImport} disabled={selected.size === 0}>
                Import {selected.size} game{selected.size === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
