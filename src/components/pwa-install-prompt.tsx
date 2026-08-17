"use client";

import { Download, Share, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "daymark-hide-install-banner";

export function usePwaInstall() {
  const [installed, setInstalled] = useState(false);
  const [iosKind, setIosKind] = useState<"safari" | "other" | null>(null);
  const [message, setMessage] = useState("");
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(
        (navigator as Navigator & { standalone?: boolean }).standalone,
      );

    queueMicrotask(() => {
      setInstalled(standalone);
      if (ios && !standalone) {
        const safari =
          /safari/i.test(userAgent) &&
          !/crios|fxios|edgios|android/i.test(userAgent);
        setIosKind(safari ? "safari" : "other");
      }
    });

    const markInstalled = () => {
      setInstalled(true);
      window.__daymarkInstallPrompt = undefined;
    };

    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const promptEvent = window.__daymarkInstallPrompt;
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      window.__daymarkInstallPrompt = undefined;
      return;
    }

    if (iosKind) {
      setShowIosHelp(true);
      return;
    }

    setMessage(
      "Open the browser menu and tap Install app or Add to Home screen.",
    );
  }, [iosKind]);

  return {
    installed,
    iosKind,
    message,
    setMessage,
    showIosHelp,
    setShowIosHelp,
    install,
  };
}

export function IosInstallHelp({
  kind,
  onClose,
}: {
  kind: "safari" | "other";
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/40 p-4 sm:place-items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Install Daymark</h2>
            <p className="mt-1 text-sm text-[#777671]">
              {kind === "safari"
                ? "Add it to your Home Screen from Safari."
                : "iPhone can only install this app from Safari."}
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg p-1 text-[#8f8e89] hover:bg-[#f2f2ef]"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {kind === "other" ? (
          <p className="mt-4 text-sm leading-6 text-[#5f5e5a]">
            Open this page in Safari, then follow the steps below.
          </p>
        ) : null}
        <ol className="mt-4 space-y-3 text-sm leading-6 text-[#5f5e5a]">
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#efedfb] text-[11px] font-bold text-[#6d5bd0]">
              1
            </span>
            <span>
              Tap the Share button
              <Share size={14} className="mx-1 inline align-text-bottom" />
              at the bottom of Safari.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#efedfb] text-[11px] font-bold text-[#6d5bd0]">
              2
            </span>
            <span>Scroll down and tap Add to Home Screen.</span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#efedfb] text-[11px] font-bold text-[#6d5bd0]">
              3
            </span>
            <span>Tap Add. Daymark will appear on your Home Screen.</span>
          </li>
        </ol>
        <button
          className="mt-5 w-full rounded-lg bg-[#292927] py-2.5 text-sm font-semibold text-white"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export function PwaInstallHeaderButton() {
  const { installed, iosKind, showIosHelp, setShowIosHelp, install } =
    usePwaInstall();

  if (installed) {
    return showIosHelp && iosKind ? (
      <IosInstallHelp kind={iosKind} onClose={() => setShowIosHelp(false)} />
    ) : null;
  }

  return (
    <>
      <button
        className="flex items-center gap-1.5 rounded-lg border border-[#deddd8] bg-white px-3 py-2 text-[13px] font-semibold hover:bg-[#f8f8f6] xl:hidden"
        onClick={() => void install()}
      >
        <Download size={15} />
        Install
      </button>
      {showIosHelp && iosKind ? (
        <IosInstallHelp kind={iosKind} onClose={() => setShowIosHelp(false)} />
      ) : null}
    </>
  );
}

export function PwaInstallBanner() {
  const { installed, iosKind, showIosHelp, setShowIosHelp, install } =
    usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    });
  }, []);

  if (installed || dismissed) {
    return showIosHelp && iosKind ? (
      <IosInstallHelp kind={iosKind} onClose={() => setShowIosHelp(false)} />
    ) : null;
  }

  return (
    <>
      <div className="border-b border-[#ddd8f5] bg-[#efedfb] px-4 py-3 xl:hidden">
        <div className="mx-auto flex max-w-[1220px] items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#6d5bd0] text-white">
            <Download size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-4">Install Daymark</p>
            <p className="mt-0.5 text-[11px] leading-4 text-[#6f668f]">
              Add the app to your phone&apos;s home screen
            </p>
          </div>
          <button
            className="rounded-lg bg-[#6d5bd0] px-3 py-2 text-[12px] font-semibold text-white"
            onClick={() => void install()}
          >
            Install
          </button>
          <button
            aria-label="Dismiss install prompt"
            className="rounded-lg p-1.5 text-[#6f668f] hover:bg-white/70"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, "1");
              setDismissed(true);
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {showIosHelp && iosKind ? (
        <IosInstallHelp kind={iosKind} onClose={() => setShowIosHelp(false)} />
      ) : null}
    </>
  );
}
