import { useState } from "react";
import { Star } from "lucide-react";
import { Modal } from "../common/Modal";
import type { RunCompletion } from "../../types";

interface CompletionModalProps {
  onSubmit: (completion: RunCompletion) => void;
  onCancel: () => void;
}

export function CompletionModal({ onSubmit, onCancel }: CompletionModalProps) {
  const [timeSpentHours, setTimeSpentHours] = useState("");
  const [rating, setRating] = useState(0);
  const [reflection, setReflection] = useState("");
  const [favoriteMoments, setFavoriteMoments] = useState("");

  return (
    <Modal title="Mark this run complete" onClose={onCancel} wide>
      <div className="flex flex-col gap-4">
        <div>
          <label className="label">Your rating</label>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)}>
                <Star
                  size={24}
                  className={n <= rating ? "fill-accent-400 text-accent-400" : "text-slate-600"}
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Time spent (hours, optional)</label>
          <input
            className="input mt-1"
            type="number"
            min="0"
            step="0.5"
            value={timeSpentHours}
            onChange={(e) => setTimeSpentHours(e.target.value)}
          />
        </div>
        <div>
          <label className="label">A short reflection</label>
          <textarea
            className="input mt-1"
            rows={3}
            placeholder="How did the challenge go?"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Favorite moments (optional)</label>
          <textarea
            className="input mt-1"
            rows={2}
            value={favoriteMoments}
            onChange={(e) => setFavoriteMoments(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={() =>
            onSubmit({
              timeSpentHours: timeSpentHours ? Number(timeSpentHours) : undefined,
              rating: rating || undefined,
              reflection: reflection.trim() || undefined,
              favoriteMoments: favoriteMoments.trim() || undefined,
            })
          }
        >
          Complete run
        </button>
      </div>
    </Modal>
  );
}
