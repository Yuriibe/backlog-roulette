import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Trash2, Upload, XCircle } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { buildFullExport, downloadJson } from "../../lib/importExport";
import type { FullExport } from "../../lib/importExport";
import { getClaudeStatus } from "../../lib/api";
import type { ClaudeStatus } from "../../lib/api";
import { ConfirmDialog } from "../common/ConfirmDialog";

export function SettingsView() {
  const games = useAppStore((s) => s.games);
  const runs = useAppStore((s) => s.runs);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const removeSampleGames = useAppStore((s) => s.removeSampleGames);
  const replaceAllData = useAppStore((s) => s.replaceAllData);
  const resetAllData = useAppStore((s) => s.resetAllData);

  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatus | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRemoveSamples, setConfirmRemoveSamples] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleCount = games.filter((g) => g.isSample).length;

  useEffect(() => {
    getClaudeStatus().then(setClaudeStatus);
  }, []);

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as FullExport;
      if (!Array.isArray(data.games) || !Array.isArray(data.runs) || !data.settings) {
        setImportMsg("That file doesn't look like a Backlog Roulette export.");
        return;
      }
      replaceAllData({ games: data.games, runs: data.runs, settings: data.settings });
      setImportMsg("Data imported successfully.");
    } catch {
      setImportMsg("Couldn't parse that file as JSON.");
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-slate-100">Settings</h1>

      <section className="card p-5">
        <h2 className="font-semibold text-slate-100 mb-3">Challenge focus</h2>
        <div className="flex flex-col gap-2">
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              settings.challengeFocus === "longform"
                ? "bg-accent-600/10 border-accent-600/40"
                : "border-white/10 hover:bg-white/5"
            }`}
          >
            <input
              type="radio"
              className="mt-1 accent-accent-500"
              checked={settings.challengeFocus === "longform"}
              onChange={() => updateSettings({ challengeFocus: "longform" })}
            />
            <div>
              <p className="text-sm font-medium text-slate-100">Help me finish long games</p>
              <p className="text-xs text-slate-400 mt-0.5">
                For long, story-driven single-player games, challenges become an ongoing approach for the whole
                playthrough — pacing rituals, a roleplay lens, a recurring habit — instead of a single one-off
                task. Short/replayable games (roguelikes, arcade, puzzle) are unaffected.
              </p>
            </div>
          </label>
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              settings.challengeFocus === "variety"
                ? "bg-accent-600/10 border-accent-600/40"
                : "border-white/10 hover:bg-white/5"
            }`}
          >
            <input
              type="radio"
              className="mt-1 accent-accent-500"
              checked={settings.challengeFocus === "variety"}
              onChange={() => updateSettings({ challengeFocus: "variety" })}
            />
            <div>
              <p className="text-sm font-medium text-slate-100">Variety</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Always generate concise, session- or run-sized objectives, regardless of game length.
              </p>
            </div>
          </label>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-slate-100 mb-3">Game length lookup (HowLongToBeat)</h2>
        <p className="text-sm text-slate-400 mb-2">
          Automatically fills in estimated completion time for games missing it (mainly Steam-synced, unplayed
          games) — this is what the Challenge focus detection above actually relies on. No API key needed; use My
          Backlog → "Fill missing info" to run it.
        </p>
        <p className="text-xs text-amber-400/90">
          Heads up: HowLongToBeat has no official API, so this calls their internal search endpoint the same way
          their own site does. It can break without warning if they change it — if "Fill missing info" starts
          failing on everything, that's likely why, not a bug in your data. Genre isn't available from this
          source, only length.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-slate-100 mb-3">Roulette</h2>
        <label className="label block mb-1">Max rerolls per spin session</label>
        <input
          type="number"
          min={0}
          max={20}
          className="input w-32"
          value={settings.maxRerolls}
          onChange={(e) => updateSettings({ maxRerolls: Math.max(0, Number(e.target.value) || 0) })}
        />
        <p className="text-xs text-slate-500 mt-2">
          How many times you can spin again before accepting a game, per selection session.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-slate-100 mb-3">Claude CLI integration</h2>
        {claudeStatus === null && <p className="text-sm text-slate-400">Checking...</p>}
        {claudeStatus && claudeStatus.available && (
          <p className="text-sm text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} /> Claude CLI detected — AI challenge generation is ready.
          </p>
        )}
        {claudeStatus && !claudeStatus.available && (
          <div className="text-sm text-amber-300 flex items-start gap-2">
            <XCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p>Claude CLI isn't available ({claudeStatus.reason}).</p>
              <p className="text-slate-400 mt-1">
                Install and sign in to Claude Code, then restart the backend. You can still generate challenges
                manually via the copy-prompt fallback shown during challenge generation.
              </p>
            </div>
          </div>
        )}
        <button className="btn-secondary text-sm mt-3" onClick={() => getClaudeStatus().then(setClaudeStatus)}>
          Re-check
        </button>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-slate-100 mb-3">Data</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className="btn-secondary text-sm"
            onClick={() => downloadJson("backlog-roulette-export.json", buildFullExport(games, runs, settings))}
          >
            <Download size={16} /> Export all data
          </button>
          <button className="btn-secondary text-sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import data
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
            }}
          />
        </div>
        {importMsg && <p className="text-sm text-slate-300 mb-4">{importMsg}</p>}

        {sampleCount > 0 && (
          <div className="flex items-center justify-between gap-3 py-3 border-t border-white/5">
            <p className="text-sm text-slate-400">{sampleCount} sample game(s) still in your backlog.</p>
            <button className="btn-ghost text-sm" onClick={() => setConfirmRemoveSamples(true)}>
              Remove sample data
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 py-3 border-t border-white/5">
          <p className="text-sm text-slate-400">Permanently erase all games, runs, and settings.</p>
          <button className="btn-danger text-sm" onClick={() => setConfirmReset(true)}>
            <Trash2 size={16} /> Reset all data
          </button>
        </div>
      </section>

      {confirmReset && (
        <ConfirmDialog
          title="Reset all data?"
          message="This permanently deletes every game, run, and setting. This cannot be undone."
          confirmLabel="Reset everything"
          danger
          onConfirm={() => {
            resetAllData();
            setConfirmReset(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {confirmRemoveSamples && (
        <ConfirmDialog
          title="Remove sample games?"
          message="This removes the example games (Hollow Knight, Path of Exile 2, etc.) that shipped with the app. Your own games are untouched."
          confirmLabel="Remove samples"
          danger
          onConfirm={() => {
            removeSampleGames();
            setConfirmRemoveSamples(false);
          }}
          onCancel={() => setConfirmRemoveSamples(false)}
        />
      )}
    </div>
  );
}
