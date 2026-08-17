"use client";

import { Bell, Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePwaInstall } from "@/components/pwa-install-prompt";
import { usePushNotifications } from "@/components/use-push-notifications";

type ReminderTodo = {
  id: string;
  title: string;
  completed: boolean;
  reminderAt: string | null;
  reminderSentAt: string | null;
};

export function NotificationBell({
  todos,
  onResolve,
}: {
  todos: ReminderTodo[];
  onResolve?: (todo: ReminderTodo) => void;
}) {
  const [open, setOpen] = useState(false);
  const push = usePushNotifications();
  const { install, iosKind } = usePwaInstall();
  const upcoming = useMemo(
    () => todos.filter((todo) => todo.reminderAt && !todo.completed),
    [todos],
  );

  const badgeCount = upcoming.length;
  const needsAttention = !push.subscribed;

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              aria-label="Close notifications"
              className="absolute inset-0"
              type="button"
              onClick={() => setOpen(false)}
            />
            <div className="relative max-h-[min(36rem,calc(100dvh-2rem))] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Notifications</h2>
                  <p className="mt-1 text-xs text-[#8c8b86]">
                    Reminder todos waiting on this phone.
                  </p>
                </div>
                <button
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-[#888782] hover:bg-[#f3f3f0]"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  <X size={17} />
                </button>
              </div>

              {!push.subscribed ? (
                <div className="mt-4">
                  {push.blockReason === "ios-chrome" ||
                  push.blockReason === "ios-install" ? (
                    <button
                      className="flex w-full items-center justify-center rounded-lg bg-[#6d5bd0] py-2.5 text-[12px] font-semibold text-white"
                      type="button"
                      onClick={() => void install()}
                    >
                      {iosKind === "other"
                        ? "Open in Safari to install"
                        : "Install Daymark first"}
                    </button>
                  ) : (
                    <button
                      className="flex w-full items-center justify-center rounded-lg bg-[#2f2e2c] py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
                      disabled={push.busy}
                      type="button"
                      onClick={() => void push.enable()}
                    >
                      Enable notifications
                    </button>
                  )}
                  {push.message ? (
                    <p className="mt-3 text-[11px] leading-5 text-[#777671]">
                      {push.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
                  Upcoming reminders
                </p>
                <div className="mt-2 space-y-2">
                  {upcoming.length ? (
                    upcoming.map((todo) => (
                      <div
                        key={todo.id}
                        className="rounded-xl bg-[#f7f6fb] px-3 py-2.5"
                      >
                        <p className="text-[12px] font-semibold">{todo.title}</p>
                        <p className="mt-1 text-[10px] text-[#8f8e89]">
                          {todo.reminderSentAt
                            ? "Reminder sent"
                            : new Intl.DateTimeFormat(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              }).format(new Date(todo.reminderAt!))}
                        </p>
                        {onResolve ? (
                          <button
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#367653]"
                            type="button"
                            onClick={() => onResolve(todo)}
                          >
                            <Check size={12} /> Mark resolved
                          </button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] leading-5 text-[#8f8e89]">
                      No timed todos yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        aria-label="Notifications"
        className="relative z-10 rounded-lg p-2 text-[#777771] hover:bg-white"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Bell size={18} />
        {needsAttention || badgeCount ? (
          <span className="absolute right-1.5 top-1.5 grid min-w-1.5 place-items-center rounded-full bg-[#7966db] px-1 text-[8px] font-bold leading-3 text-white">
            {badgeCount > 0 ? (badgeCount > 9 ? "9+" : badgeCount) : ""}
          </span>
        ) : null}
      </button>
      {panel}
    </>
  );
}
