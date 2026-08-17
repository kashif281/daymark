"use client";

import { useEffect } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __daymarkInstallPrompt?: InstallPromptEvent;
  }
}

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__daymarkInstallPrompt = event as InstallPromptEvent;
      window.dispatchEvent(new Event("daymark-install-ready"));
    };

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
    };
  }, []);

  return null;
}
