"use client";

import { Bell, Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { IosInstallHelp, usePwaInstall } from "@/components/pwa-install-prompt";

export function PwaControls() {
  const {
    installed,
    iosKind,
    message: installMessage,
    showIosHelp,
    setShowIosHelp,
    install,
  } = usePwaInstall();
  const [pushSupported, setPushSupported] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setPushSupported(
        "serviceWorker" in navigator &&
          "PushManager" in window &&
          "Notification" in window,
      );
    });

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").then(async () => {
        const response = await fetch("/api/push-subscriptions");
        if (!response.ok) return;
        const data = (await response.json()) as {
          configured: boolean;
          publicKey: string | null;
          subscribed: boolean;
        };
        setPushConfigured(data.configured);
        setPublicKey(data.publicKey);

        const registration = await navigator.serviceWorker.ready;
        const current = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(current) && data.subscribed);
      });
    }
  }, []);

  async function togglePush() {
    if (!pushSupported || !publicKey) return;
    setBusy(true);
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();

      if (current) {
        await fetch("/api/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: current.endpoint }),
        });
        await current.unsubscribe();
        setSubscribed(false);
        setMessage("Notifications turned off.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission was not granted.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("Could not save push subscription.");

      setSubscribed(true);
      setMessage("Notifications are enabled on this device.");
    } catch (error) {
      console.error(error);
      setMessage("Could not update notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTestPush() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/reminders/test-push", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Could not send test notification.");
      }
      setMessage("Test notification sent. Check your device.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not send the test notification.",
      );
    } finally {
      setBusy(false);
    }
  }

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
          disabled={busy || !pushSupported || !pushConfigured}
          onClick={() => void togglePush()}
        >
          <Bell size={13} />
          {subscribed ? "Disable notifications" : "Enable notifications"}
        </button>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#deddd8] py-2.5 text-[11px] font-semibold disabled:opacity-50"
          disabled={busy || !subscribed}
          onClick={() => void sendTestPush()}
        >
          Send test notification
        </button>
      </div>
      {!pushConfigured ? (
        <p className="mt-2 text-[10px] leading-4 text-[#a06c32]">
          Push keys still need to be generated for this environment.
        </p>
      ) : null}
      {installMessage || message ? (
        <p className="mt-2 text-[10px] leading-4 text-[#777671]">
          {installMessage || message}
        </p>
      ) : null}
      {showIosHelp && iosKind ? (
        <IosInstallHelp kind={iosKind} onClose={() => setShowIosHelp(false)} />
      ) : null}
    </section>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
