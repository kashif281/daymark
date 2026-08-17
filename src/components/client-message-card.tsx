"use client";

import { Check, RotateCcw, Trash2 } from "lucide-react";

export type ClientMessageItem = {
  id: string;
  sender: string;
  content: string;
  receivedAt: string;
  resolved?: boolean;
};

export function ClientMessageCard({
  message,
  projectName,
  onResolve,
  onDelete,
}: {
  message: ClientMessageItem;
  projectName?: string;
  onResolve: (resolved: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${
        message.resolved ? "bg-[#f3f3f0]" : "bg-[#f7f6fb]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold">{message.sender}</p>
          {projectName ? (
            <p className="text-[9px] text-[#9c9b96]">{projectName}</p>
          ) : null}
        </div>
        <time className="shrink-0 text-[10px] text-[#999893]">
          {new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(message.receivedAt))}
        </time>
      </div>
      <p
        className={`mt-3 whitespace-pre-wrap text-[12px] leading-5 ${
          message.resolved ? "text-[#8f8e89] line-through" : "text-[#686762]"
        }`}
      >
        {message.content}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#367653] hover:bg-[#e5f5eb]"
          onClick={() => onResolve(!message.resolved)}
        >
          {message.resolved ? <RotateCcw size={12} /> : <Check size={12} />}
          {message.resolved ? "Reopen" : "Mark resolved"}
        </button>
        <button
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#a7463d] hover:bg-[#fff0ee]"
          onClick={onDelete}
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}
