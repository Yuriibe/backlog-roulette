import { useState } from "react";
import { Modal } from "../common/Modal";
import type { Challenge, ChallengeStyle } from "../../types";

interface ChallengeEditModalProps {
  initial: Challenge;
  title: string;
  onSave: (challenge: Challenge) => void;
  onCancel: () => void;
}

export function ChallengeEditModal({ initial, title, onSave, onCancel }: ChallengeEditModalProps) {
  const [name, setName] = useState(initial.name);
  const [style, setStyle] = useState<ChallengeStyle>(initial.style);
  const [description, setDescription] = useState(initial.description);
  const [primaryObjective, setPrimaryObjective] = useState(initial.primaryObjective);
  const [bonusText, setBonusText] = useState(initial.bonusObjectives.join("\n"));
  const [whyFun, setWhyFun] = useState(initial.whyFun);
  const [effortEstimate, setEffortEstimate] = useState(initial.effortEstimate ?? "");

  function save() {
    if (!name.trim() || !primaryObjective.trim()) return;
    onSave({
      ...initial,
      name: name.trim(),
      style,
      description: description.trim(),
      primaryObjective: primaryObjective.trim(),
      bonusObjectives: bonusText.split("\n").map((b) => b.trim()).filter(Boolean).slice(0, 6),
      whyFun: whyFun.trim(),
      effortEstimate: effortEstimate.trim() || undefined,
    });
  }

  return (
    <Modal title={title} onClose={onCancel} wide>
      <div className="flex flex-col gap-4">
        <div>
          <label className="label">Name</label>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Style</label>
          <select className="input mt-1" value={style} onChange={(e) => setStyle(e.target.value as ChallengeStyle)}>
            <option value="creative">Creative</option>
            <option value="exploration">Exploration</option>
            <option value="wildcard">Wildcard</option>
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input mt-1" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Primary objective</label>
          <input className="input mt-1" value={primaryObjective} onChange={(e) => setPrimaryObjective(e.target.value)} />
        </div>
        <div>
          <label className="label">Bonus objectives (one per line)</label>
          <textarea className="input mt-1" rows={3} value={bonusText} onChange={(e) => setBonusText(e.target.value)} />
        </div>
        <div>
          <label className="label">Why it's fun</label>
          <input className="input mt-1" value={whyFun} onChange={(e) => setWhyFun(e.target.value)} />
        </div>
        <div>
          <label className="label">Estimated extra effort (optional)</label>
          <input className="input mt-1" value={effortEstimate} onChange={(e) => setEffortEstimate(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={save}>
          Save
        </button>
      </div>
    </Modal>
  );
}
