"use client";

import { useCallback, useEffect, useState } from "react";

type PushBlockReason = "ios-chrome" | "ios-install" | "unsupported" | "missing-keys" | null;

function detectPushEnvironment() {
  const userAgent = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(userAgent);
  const chromeIos = /crios/i.test(userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const hasApi =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  if (ios && chromeIos) return { supported: false, reason: "ios-chrome" as const };
  if (ios && !standalone) return { supported: false, reason: "ios-install" as const };
  if (!hasApi) return { supported: false, reason: "unsupported" as const };
  return { supported: true, reason: null };
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [blockReason, setBlockReason] = useState<PushBlockReason>(null);
  const [configured, setConfigured] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const environment = detectPushEnvironment();
    queueMicrotask(() => {
      setSupported(environment.supported);
      setBlockReason(environment.reason);
    });

    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async () => {
        const response = await fetch("/api/push-subscriptions");
        if (!response.ok) return;
        const data = (await response.json()) as {
          configured: boolean;
          publicKey: string | null;
          subscribed: boolean;
        };
        setConfigured(data.configured);
        setPublicKey(data.publicKey);
        if (!data.configured && !environment.reason) {
          setBlockReason("missing-keys");
        }

        const registration = await navigator.serviceWorker.ready;
        const current = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(current) && data.subscribed);
      });
  }, []);

  const enable = useCallback(async () => {
    const environment = detectPushEnvironment();
    if (!environment.supported) {
      setBlockReason(environment.reason);
      setMessage(
        environment.reason === "ios-chrome"
          ? "iPhone Chrome cannot receive notifications. Open this site in Safari, install Daymark, then enable notifications."
          : environment.reason === "ios-install"
            ? "On iPhone, install Daymark from Safari first, then tap Enable notifications."
            : "This browser cannot receive push notifications.",
      );
      return false;
    }

    if (!publicKey) {
      setMessage("Push notifications are not configured yet.");
      return false;
    }

    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission was not granted.");
        return false;
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("Could not save push subscription.");

      setSubscribed(true);
      await fetch("/api/reminders/flush", { method: "POST" });
      setMessage("Notifications are on for this phone.");
      return true;
    } catch (error) {
      console.error(error);
      setMessage("Could not enable notifications on this device.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
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
      }
      setSubscribed(false);
      setMessage("Notifications turned off.");
    } catch (error) {
      console.error(error);
      setMessage("Could not update notifications.");
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/reminders/test-push", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not send test notification.");
      }
      setMessage("Test notification sent. Check your lock screen.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not send the test notification.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    supported,
    blockReason,
    configured,
    subscribed,
    busy,
    message,
    setMessage,
    enable,
    disable,
    sendTest,
  };
}
