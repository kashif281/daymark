"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function EodModal({
  projectId,
  projectName,
  onClose,
}: {
  projectId?: string;
  projectName?: string;
  onClose: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [blockers, setBlockers] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!summary.trim()) return;
    setSaving(true);
    const entry = { summary, blockers, tomorrow, projectId };

      const response = await fetch("/api/eod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (!response.ok) {
        setSaving(false);
        return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {projectName ? `${projectName} EOD` : "Combined EOD"}
            </h2>
            <p className="mt-1 text-xs text-[#888782]">
              {projectName
                ? "Wrap up this project for today."
                : "Summarize your full day across every project."}
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg p-2 text-[#888782] hover:bg-[#f3f3f0]"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>
        <label className="mt-5 block text-xs font-bold text-[#62615d]">
          What did you complete?
        </label>
        <textarea
          className="mt-2 min-h-28 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        ></textarea>
        <label className="mt-4 block text-xs font-bold text-[#62615d]">
          Blockers
        </label>
        <textarea
          className="mt-2 min-h-20 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
          value={blockers}
          onChange={(event) => setBlockers(event.target.value)}
        ></textarea>
        <label className="mt-4 block text-xs font-bold text-[#62615d]">
          Next up tomorrow
        </label>
        <textarea
          className="mt-2 min-h-20 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
          value={tomorrow}
          onChange={(event) => setTomorrow(event.target.value)}
        ></textarea>
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-lg px-4 py-2 text-xs font-semibold" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            disabled={!summary.trim() || saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save EOD"}
          </button>
        </div>
      </div>
    </div>
  );
}
