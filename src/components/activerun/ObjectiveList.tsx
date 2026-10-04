import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import type { RunObjective } from "../../types";

interface ObjectiveListProps {
  objectives: RunObjective[];
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

export function ObjectiveList({ objectives, onToggle, onEdit }: ObjectiveListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <ul className="flex flex-col gap-2">
      {objectives.map((o) => (
        <li
          key={o.id}
          className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
            o.completed ? "bg-accent-600/10 border-accent-600/30" : "bg-ink-900/60 border-white/5"
          }`}
        >
          <button
            onClick={() => onToggle(o.id)}
            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
              o.completed ? "bg-accent-500 border-accent-500" : "border-slate-500 hover:border-accent-400"
            }`}
          >
            {o.completed && <Check size={14} className="text-white" />}
          </button>

          {editingId === o.id ? (
            <div className="flex-1 flex gap-2">
              <input
                className="input flex-1"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
              <button
                className="btn-primary text-xs py-1"
                onClick={() => {
                  onEdit(o.id, draft);
                  setEditingId(null);
                }}
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <span className={`flex-1 text-sm ${o.completed ? "text-slate-400 line-through" : "text-slate-200"}`}>
                {o.text}
                {o.isBonus && <span className="ml-2 text-xs text-accent-400">bonus</span>}
              </span>
              <button
                className="text-slate-500 hover:text-slate-300 shrink-0"
                onClick={() => {
                  setEditingId(o.id);
                  setDraft(o.text);
                }}
              >
                <Pencil size={14} />
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
