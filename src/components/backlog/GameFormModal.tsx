import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Modal } from "../common/Modal";
import type { Game, GameStatus, PlaytimeBucket } from "../../types";
import { lookupGameLength } from "../../lib/hltbLookup";

interface GameFormModalProps {
  initial?: Game;
  onSave: (game: Omit<Game, "id" | "createdAt">) => void;
  onCancel: () => void;
}

export function GameFormModal({ initial, onSave, onCancel }: GameFormModalProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [genre, setGenre] = useState(initial?.genre ?? "");
  const [playtime, setPlaytime] = useState<PlaytimeBucket | "">(initial?.playtime ?? "");
  const [estimatedHours, setEstimatedHours] = useState(initial?.estimatedHours?.toString() ?? "");
  const [playedHours, setPlayedHours] = useState(initial?.playedHours?.toString() ?? "");
  const [status, setStatus] = useState<GameStatus>(initial?.status ?? "backlog");
  const [previouslyPlayed, setPreviouslyPlayed] = useState(initial?.previouslyPlayed ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function refreshFromHltb() {
    if (!title.trim()) return;
    setLookingUp(true);
    setLookupError(null);
    const result = await lookupGameLength(title.trim());
    setLookingUp(false);
    if (!result.ok) {
      setLookupError(result.error ?? "No match found.");
      return;
    }
    if (result.estimatedHours !== undefined) setEstimatedHours(String(result.estimatedHours));
    if (result.playtime) setPlaytime(result.playtime);
  }

  function save() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      coverUrl: coverUrl.trim() || undefined,
      genre: genre.trim() || undefined,
      playtime: playtime || undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      playedHours: playedHours ? Number(playedHours) : undefined,
      status,
      previouslyPlayed,
      notes: notes.trim() || undefined,
      tags: tagsText.trim()
        ? tagsText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      isSample: initial?.isSample,
      source: initial?.source ?? "manual",
    });
  }

  return (
    <Modal title={initial ? "Edit game" : "Add a game"} onClose={onCancel} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Title</label>
          <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="md:col-span-2">
          <label className="label">Cover image URL (optional)</label>
          <input className="input mt-1" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
        </div>
        <div>
          <label className="label">Genre</label>
          <input className="input mt-1" value={genre} onChange={(e) => setGenre(e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value as GameStatus)}>
            <option value="backlog">Backlog</option>
            {status === "active" && <option value="active">Active</option>}
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>
          {status === "active" && (
            <p className="text-xs text-slate-500 mt-1">
              To start a game playing, use "Play this" from the backlog instead — it tracks a real run.
            </p>
          )}
        </div>
        <div>
          <label className="label">Playtime bucket</label>
          <select className="input mt-1" value={playtime} onChange={(e) => setPlaytime(e.target.value as PlaytimeBucket | "")}>
            <option value="">Not set</option>
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
        <div>
          <label className="label">Estimated hours to beat</label>
          <div className="flex gap-2 mt-1">
            <input
              className="input"
              type="number"
              min="0"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary shrink-0 px-3"
              onClick={refreshFromHltb}
              disabled={lookingUp || !title.trim()}
              title="Look up on HowLongToBeat"
            >
              {lookingUp ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            </button>
          </div>
          {lookupError && <p className="text-xs text-red-300 mt-1">{lookupError}</p>}
        </div>
        <div>
          <label className="label">Hours already played (optional)</label>
          <input
            className="input mt-1"
            type="number"
            min="0"
            value={playedHours}
            onChange={(e) => setPlayedHours(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Different from the estimate above — this is time you've actually logged. Kept up to date automatically
            when you re-sync from Steam (My Backlog → Import → Sync from Steam); edit it here for anything else.
          </p>
        </div>
        {initial && (
          <div>
            <label className="label">Added to backlog</label>
            <p className="input mt-1 flex items-center text-slate-400">
              {new Date(initial.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        )}
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            id="previously-played"
            type="checkbox"
            checked={previouslyPlayed}
            onChange={(e) => setPreviouslyPlayed(e.target.checked)}
            className="w-4 h-4 accent-accent-500"
          />
          <label htmlFor="previously-played" className="text-sm text-slate-300">
            I've played this before
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="label">Tags (comma-separated)</label>
          <input
            className="input mt-1"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="e.g. Just bought, Co-op, With Sarah"
          />
          <p className="text-xs text-slate-500 mt-1">
            Use tags to roll the Roulette through a subset of your backlog, like games you just bought.
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="label">Personal notes</label>
          <textarea
            className="input mt-1"
            rows={3}
            placeholder="Why do you want to play this?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={save} disabled={!title.trim()}>
          Save
        </button>
      </div>
    </Modal>
  );
}
