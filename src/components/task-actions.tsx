"use client";

import {
  List,
  MessageSquareText,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  ensureBulletPrefix,
  handleBulletKeyDown,
  normalizeBulletText,
} from "@/lib/task-notes";

type TaskComment = {
  id: string;
  content: string;
  author: string;
  createdAt: string;
};

type TaskActionsProps = {
  task: {
    id: string;
    title: string;
    description?: string | null;
    screenshotUrl?: string | null;
    hoursWorked?: number | null;
  };
  onUpdate: (updates: {
    description: string | null;
    screenshotUrl: string | null;
    hoursWorked: number | null;
  }) => void;
  onDelete: () => void;
};

export function TaskActions({
  task,
  onUpdate,
  onDelete,
}: TaskActionsProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(task.description ?? "");
  const [screenshotUrl, setScreenshotUrl] = useState(task.screenshotUrl ?? "");
  const [hoursWorked, setHoursWorked] = useState(
    task.hoursWorked != null ? String(task.hoursWorked) : "",
  );
  const [bulletMode, setBulletMode] = useState(
    Boolean(task.description?.includes("\n- ") || task.description?.startsWith("- ")),
  );
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function openDialog() {
    setOpen(true);
    setDescription(task.description ?? "");
    setScreenshotUrl(task.screenshotUrl ?? "");
    setHoursWorked(task.hoursWorked != null ? String(task.hoursWorked) : "");
    setBulletMode(
      Boolean(
        task.description?.includes("\n- ") || task.description?.startsWith("- "),
      ),
    );
    setConfirmDelete(false);
    setError("");
    setLoading(true);

    const response = await fetch(`/api/tasks/${task.id}`);
    if (!response.ok) {
      setError("Could not load task details.");
      setLoading(false);
      return;
    }

    const data = (await response.json()) as {
      task: {
        description: string | null;
        screenshotUrl: string | null;
        hoursWorked: number | null;
        comments: TaskComment[];
      };
    };
    setDescription(data.task.description ?? "");
    setScreenshotUrl(data.task.screenshotUrl ?? "");
    setHoursWorked(
      data.task.hoursWorked != null ? String(data.task.hoursWorked) : "",
    );
    setBulletMode(
      Boolean(
        data.task.description?.includes("\n- ") ||
          data.task.description?.startsWith("- "),
      ),
    );
    setComments(data.task.comments);
    setLoading(false);
  }

  async function saveDetails() {
    setSavingDetails(true);
    setError("");
    const cleanedDescription = bulletMode
      ? normalizeBulletText(description)
      : description.trim();
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: cleanedDescription || null,
        screenshotUrl: screenshotUrl.trim() || null,
        hoursWorked: hoursWorked.trim() === "" ? null : hoursWorked.trim(),
      }),
    });

    if (!response.ok) {
      setError("Could not save the task.");
      setSavingDetails(false);
      return;
    }

    const data = (await response.json()) as {
      task: {
        description: string | null;
        screenshotUrl: string | null;
        hoursWorked: number | null;
      };
    };
    setDescription(data.task.description ?? "");
    setScreenshotUrl(data.task.screenshotUrl ?? "");
    setHoursWorked(
      data.task.hoursWorked != null ? String(data.task.hoursWorked) : "",
    );
    onUpdate({
      description: data.task.description,
      screenshotUrl: data.task.screenshotUrl,
      hoursWorked: data.task.hoursWorked,
    });
    setSavingDetails(false);
  }

  async function addComment() {
    const content = comment.trim();
    if (!content) return;

    setSavingComment(true);
    setError("");
    const response = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      setError("Could not add the comment.");
      setSavingComment(false);
      return;
    }

    const data = (await response.json()) as { comment: TaskComment };
    setComments((current) => [...current, data.comment]);
    setComment("");
    setSavingComment(false);
  }

  async function deleteTask() {
    setDeleting(true);
    setError("");
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Could not delete the task.");
      setDeleting(false);
      return;
    }

    setOpen(false);
    onDelete();
  }

  return (
    <>
      <button
        aria-label={`Edit ${task.title}`}
        className="shrink-0 rounded-lg p-1.5 text-[#8b8a85] hover:bg-black/5 hover:text-[#4f4e49]"
        onClick={() => void openDialog()}
      >
        <MoreHorizontal size={17} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`task-dialog-${task.id}`}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#deddd8] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#969590]">
                  Task details
                </p>
                <h2
                  id={`task-dialog-${task.id}`}
                  className="mt-1 text-lg font-bold text-[#292927]"
                >
                  {task.title}
                </h2>
              </div>
              <button
                aria-label="Close task details"
                className="rounded-lg p-1.5 text-[#8b8a85] hover:bg-[#f3f3f0]"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg bg-[#fff0ee] px-3 py-2 text-xs text-[#a7463d]">
                {error}
              </p>
            ) : null}

            <div className="mt-5">
              <div className="flex items-center justify-between gap-2">
                <label
                  className="text-xs font-bold text-[#4d4c48]"
                  htmlFor={`task-description-${task.id}`}
                >
                  Description
                </label>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                    bulletMode
                      ? "bg-[#eeecfa] text-[#5f4db9]"
                      : "text-[#8b8a85] hover:bg-[#f3f3f0]"
                  }`}
                  onClick={() => {
                    setBulletMode((current) => {
                      const next = !current;
                      if (next) setDescription((value) => ensureBulletPrefix(value));
                      return next;
                    });
                  }}
                >
                  <List size={13} /> Bullets
                </button>
              </div>
              <textarea
                id={`task-description-${task.id}`}
                className="mt-2 min-h-40 w-full resize-y rounded-xl border border-[#deddd8] bg-[#fafaf8] px-3 py-2.5 text-sm outline-none transition focus:border-[#8a79dc] focus:ring-3 focus:ring-[#8a79dc]/10"
                disabled={loading}
                placeholder={
                  loading
                    ? "Loading…"
                    : bulletMode
                      ? "- What did you do?"
                      : "Add a description"
                }
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onKeyDown={(event) => {
                  if (bulletMode) {
                    handleBulletKeyDown(event, description, setDescription);
                  }
                }}
              />
              <label
                className="mt-4 block text-xs font-bold text-[#4d4c48]"
                htmlFor={`task-hours-${task.id}`}
              >
                Hours worked <span className="font-medium text-[#999893]">(optional)</span>
              </label>
              <input
                id={`task-hours-${task.id}`}
                className="mt-2 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-3 py-2.5 text-sm outline-none transition focus:border-[#8a79dc] focus:ring-3 focus:ring-[#8a79dc]/10"
                disabled={loading}
                inputMode="decimal"
                min="0"
                placeholder="e.g. 1.5"
                step="0.25"
                type="number"
                value={hoursWorked}
                onChange={(event) => setHoursWorked(event.target.value)}
              />
              <label
                className="mt-4 block text-xs font-bold text-[#4d4c48]"
                htmlFor={`task-screenshot-${task.id}`}
              >
                Screenshots link
              </label>
              <input
                id={`task-screenshot-${task.id}`}
                className="mt-2 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-3 py-2.5 text-sm outline-none transition focus:border-[#8a79dc] focus:ring-3 focus:ring-[#8a79dc]/10"
                disabled={loading}
                placeholder="Google Drive screenshots link"
                value={screenshotUrl}
                onChange={(event) => setScreenshotUrl(event.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <button
                  className="rounded-lg bg-[#292927] px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
                  disabled={loading || savingDetails}
                  onClick={() => void saveDetails()}
                >
                  {savingDetails ? "Saving…" : "Save details"}
                </button>
              </div>
            </div>

            <div className="mt-6 border-t border-[#ecebe7] pt-5">
              <h3 className="flex items-center gap-2 text-xs font-bold text-[#4d4c48]">
                <MessageSquareText size={15} className="text-[#7161d6]" />
                Comments
              </h3>
              <div className="mt-3 space-y-2">
                {loading ? (
                  <p className="text-xs text-[#969590]">Loading comments…</p>
                ) : comments.length ? (
                  comments.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-[#f7f6fb] px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[11px] font-bold">
                          {item.author}
                        </span>
                        <time className="shrink-0 text-[10px] text-[#999893]">
                          {new Intl.DateTimeFormat(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(item.createdAt))}
                        </time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#686762]">
                        {item.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#969590]">No comments yet.</p>
                )}
              </div>
              <textarea
                className="mt-3 min-h-20 w-full resize-y rounded-xl border border-[#deddd8] px-3 py-2.5 text-sm outline-none transition focus:border-[#8a79dc] focus:ring-3 focus:ring-[#8a79dc]/10"
                placeholder="Add a comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <button
                  className="rounded-lg bg-[#7161d6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6553c6] disabled:opacity-50"
                  disabled={!comment.trim() || savingComment}
                  onClick={() => void addComment()}
                >
                  {savingComment ? "Adding…" : "Add comment"}
                </button>
              </div>
            </div>

            <div className="mt-6 border-t border-[#ecebe7] pt-4">
              {confirmDelete ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[#a7463d]">
                    Delete this task and all its comments?
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-[#deddd8] px-3 py-2 text-xs font-semibold"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-lg bg-[#b8493f] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={deleting}
                      onClick={() => void deleteTask()}
                    >
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-[#a7463d] hover:bg-[#fff0ee]"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} /> Delete task
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
