import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Shuffle, TriangleAlert } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { generateChallenges, getPromptPreview, validateChallenges } from "../../lib/api";
import type { Challenge, ChallengeFocus } from "../../types";
import { ChallengeOptionCard } from "./ChallengeOptionCard";
import { ChallengeEditModal } from "./ChallengeEditModal";

interface ChallengeSelectViewProps {
  gameId: string;
  onCancel: () => void;
  onRunStarted: () => void;
}

const BLANK_CHALLENGE: Challenge = {
  id: "draft",
  style: "creative",
  name: "",
  description: "",
  primaryObjective: "",
  bonusObjectives: [],
  whyFun: "",
};

export function ChallengeSelectView({ gameId, onCancel, onRunStarted }: ChallengeSelectViewProps) {
  const game = useAppStore((s) => s.games.find((g) => g.id === gameId));
  const startRun = useAppStore((s) => s.startRun);
  const defaultFocus = useAppStore((s) => s.settings.challengeFocus);

  const [focus, setFocus] = useState<ChallengeFocus>(defaultFocus);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [isManualDraft, setIsManualDraft] = useState(false);

  const [promptText, setPromptText] = useState<string | null>(null);
  const [pasteBack, setPasteBack] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load(focusOverride?: ChallengeFocus) {
    if (!game) return;
    setLoading(true);
    setError(null);
    const result = await generateChallenges({
      game: {
        title: game.title,
        genre: game.genre,
        playtime: game.playtime,
        estimatedHours: game.estimatedHours,
        previouslyPlayed: game.previouslyPlayed,
        playedHours: game.playedHours,
        notes: game.notes,
      },
      challengeFocus: focusOverride ?? focus,
    });
    if (result.ok && result.challenges) {
      setChallenges(result.challenges);
    } else {
      setChallenges(null);
      setError(result.error ?? "Couldn't generate challenges.");
    }
    setLoading(false);
  }

  function changeFocus(next: ChallengeFocus) {
    if (next === focus) return;
    setFocus(next);
    load(next);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  async function loadPromptPreview() {
    if (!game) return;
    const text = await getPromptPreview({
      game: {
        title: game.title,
        genre: game.genre,
        playtime: game.playtime,
        estimatedHours: game.estimatedHours,
        previouslyPlayed: game.previouslyPlayed,
        playedHours: game.playedHours,
        notes: game.notes,
      },
      challengeFocus: focus,
    });
    setPromptText(text);
  }

  function parsePasteBack() {
    setPasteError(null);
    try {
      const raw = JSON.parse(pasteBack);
      const parsed = validateChallenges(raw);
      if (!parsed) {
        setPasteError(
          "That doesn't match the expected format — make sure it's a JSON array of exactly 3 challenge objects, as the prompt instructed."
        );
        return;
      }
      setChallenges(parsed);
      setError(null);
    } catch {
      setPasteError("Couldn't parse that as JSON. Paste only Claude's JSON array response.");
    }
  }

  function handleChoose(challenge: Challenge) {
    startRun(gameId, challenge);
    onRunStarted();
  }

  function surpriseMe() {
    if (!challenges || challenges.length === 0) return;
    const idx = Math.floor(Math.random() * challenges.length);
    handleChoose(challenges[idx]);
  }

  if (!game) {
    return (
      <div className="p-10 text-center text-slate-400">
        Game not found.
        <button className="btn-ghost mt-4" onClick={onCancel}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-20 rounded-lg overflow-hidden bg-ink-700 shrink-0">
            {game.coverUrl && <img src={game.coverUrl} alt="" className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="label mb-1">Choose a challenge for</p>
            <h1 className="text-xl font-bold text-slate-100">{game.title}</h1>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1">
          <span className="label">Focus for this game</span>
          <div className="inline-flex rounded-xl bg-ink-900 border border-white/10 p-1">
            <button
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                focus === "longform" ? "bg-accent-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => changeFocus("longform")}
              disabled={loading}
            >
              Help me finish it
            </button>
            <button
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                focus === "variety" ? "bg-accent-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => changeFocus("variety")}
              disabled={loading}
            >
              Variety
            </button>
          </div>
        </div>
      </header>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <Loader2 size={28} className="animate-spin text-accent-400" />
          <p className="text-sm">Asking Claude for three ways to experience this game...</p>
        </div>
      )}

      {!loading && error && !challenges && (
        <div className="card p-6 max-w-xl mx-auto">
          <div className="flex items-start gap-3 mb-4">
            <TriangleAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-100">Claude CLI isn't available right now</p>
              <p className="text-sm text-slate-400 mt-1">{error}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            You can still generate challenges manually: copy the prompt below into Claude (claude.ai or the CLI), then
            paste the JSON response back here.
          </p>
          <div className="flex gap-2 mb-3">
            <button className="btn-secondary text-sm" onClick={loadPromptPreview}>
              {promptText ? "Refresh prompt" : "Show prompt to copy"}
            </button>
            <button className="btn-secondary text-sm" onClick={() => load()}>
              <RefreshCw size={14} /> Retry Claude CLI
            </button>
          </div>
          {promptText && (
            <div className="mb-4">
              <textarea readOnly className="input font-mono text-xs h-40" value={promptText} />
              <button
                className="btn-ghost text-xs mt-1"
                onClick={async () => {
                  await navigator.clipboard.writeText(promptText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied!" : "Copy prompt"}
              </button>
            </div>
          )}
          <div>
            <label className="label">Paste Claude's JSON response</label>
            <textarea
              className="input mt-1 font-mono text-xs h-32"
              value={pasteBack}
              onChange={(e) => setPasteBack(e.target.value)}
              placeholder='[{"style": "creative", "name": "...", ...}]'
            />
            {pasteError && <p className="text-xs text-red-300 mt-1">{pasteError}</p>}
            <button className="btn-primary text-sm mt-2" onClick={parsePasteBack} disabled={!pasteBack.trim()}>
              Parse & continue
            </button>
          </div>
        </div>
      )}

      {!loading && challenges && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {challenges.map((c) => (
              <ChallengeOptionCard
                key={c.id}
                challenge={c}
                onChoose={() => handleChoose(c)}
                onEdit={() => {
                  setIsManualDraft(false);
                  setEditing(c);
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <button className="btn-secondary text-sm" onClick={() => load()}>
              <RefreshCw size={14} /> Regenerate
            </button>
            <button className="btn-secondary text-sm" onClick={surpriseMe}>
              <Shuffle size={14} /> Surprise me
            </button>
          </div>
        </>
      )}

      <div className="text-center mt-8 flex flex-col items-center gap-2">
        <button
          className="text-xs text-slate-500 underline hover:text-slate-300"
          onClick={() => {
            setIsManualDraft(true);
            setEditing({ ...BLANK_CHALLENGE, id: "draft-" + Date.now() });
          }}
        >
          Prefer to write your own challenge instead?
        </button>
        <button className="text-xs text-slate-500 underline hover:text-slate-300" onClick={onCancel}>
          Cancel and pick a different game
        </button>
      </div>

      {editing && (
        <ChallengeEditModal
          initial={editing}
          title={isManualDraft ? "Write your own challenge" : "Edit challenge"}
          onSave={(c) => {
            setEditing(null);
            handleChoose(c);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
