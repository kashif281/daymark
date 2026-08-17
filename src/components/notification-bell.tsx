"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  openSignal = 0,
}: {
  todos: ReminderTodo[];
  openSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const push = usePushNotifications();
  const { install, iosKind } = usePwaInstall();
  const upcoming = useMemo(
    () =>
      todos.filter(
        (todo) => todo.reminderAt && !todo.completed,
      ),
    [todos],
  );

  useEffect(() => {
    if (!openSignal) return;
    queueMicrotask(() => setOpen(true));
  }, [openSignal]);

  const badgeCount = upcoming.length;
  const needsAttention = !push.subscribed;

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

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-start sm:pt-20">
          <button
            aria-label="Close notifications"
            className="absolute inset-0"
            type="button"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Notifications</h2>
                <p className="mt-1 text-xs text-[#8c8b86]">
                  Enable alerts so reminder todos reach this phone.
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

            <div className="mt-4 space-y-2">
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
                  onClick={() =>
                    void (push.subscribed ? push.disable() : push.enable())
                  }
                >
                  {push.subscribed
                    ? "Disable notifications"
                    : "Enable notifications"}
                </button>
              )}
              {push.subscribed ? (
                <button
                  className="flex w-full items-center justify-center rounded-lg border border-[#deddd8] py-2.5 text-[12px] font-semibold disabled:opacity-50"
                  disabled={push.busy}
                  type="button"
                  onClick={() => void push.sendTest()}
                >
                  Send test notification
                </button>
              ) : null}
            </div>

            {push.message ? (
              <p className="mt-3 text-[11px] leading-5 text-[#777671]">
                {push.message}
              </p>
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
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] leading-5 text-[#8f8e89]">
                    No timed todos yet. Add a personal todo with a reminder.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
