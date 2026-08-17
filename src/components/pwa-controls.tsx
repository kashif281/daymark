"use client";

import { Bell, Download, Smartphone } from "lucide-react";
import { IosInstallHelp, usePwaInstall } from "@/components/pwa-install-prompt";
import { usePushNotifications } from "@/components/use-push-notifications";

export function PwaControls() {
  const {
    installed,
    iosKind,
    message: installMessage,
    showIosHelp,
    setShowIosHelp,
    install,
  } = usePwaInstall();
  const push = usePushNotifications();

  return (
    <section className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
      <h2 className="flex items-center gap-2 text-[13px] font-bold">
        <Smartphone size={15} className="text-[#6d5bd0]" />
        Reminders
      </h2>
      <p className="mt-2 text-[11px] leading-4 text-[#8f8e89]">
        Install Daymark and enable push notifications for todo reminders.
      </p>
      <div className="mt-4 space-y-2">
        {installed ? (
          <p className="rounded-lg bg-[#f7f6fb] px-3 py-2 text-[10px] leading-4 text-[#777671]">
            Daymark is installed on this device.
          </p>
        ) : (
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#deddd8] py-2.5 text-[11px] font-semibold hover:bg-[#f8f8f6]"
            onClick={() => void install()}
          >
            <Download size={13} /> Install Daymark
          </button>
        )}
        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2f2e2c] py-2.5 text-[11px] font-semibold text-white disabled:opacity-50"
          disabled={push.busy}
          onClick={() => void (push.subscribed ? push.disable() : push.enable())}
        >
          <Bell size={13} />
          {push.subscribed ? "Disable notifications" : "Enable notifications"}
        </button>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#deddd8] py-2.5 text-[11px] font-semibold disabled:opacity-50"
          disabled={push.busy || !push.subscribed}
          onClick={() => void push.sendTest()}
        >
          Send test notification
        </button>
      </div>
      {installMessage || push.message ? (
        <p className="mt-2 text-[10px] leading-4 text-[#777671]">
          {installMessage || push.message}
        </p>
      ) : null}
      {showIosHelp && iosKind ? (
        <IosInstallHelp kind={iosKind} onClose={() => setShowIosHelp(false)} />
      ) : null}
    </section>
  );
}
