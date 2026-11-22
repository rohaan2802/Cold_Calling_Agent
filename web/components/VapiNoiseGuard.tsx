"use client";

import { useEffect } from "react";

/**
 * VAPI / Daily.co often rejects with "Meeting has ended" after stop/hangup.
 * Next.js 15 shows that as a red "Console Error" overlay (same UI as the N badge).
 * Swallow only that teardown noise — leave real errors alone.
 */
function isNoise(reason: unknown): boolean {
  const raw =
    typeof reason === "string"
      ? reason
      : reason instanceof Error
        ? `${reason.name} ${reason.message} ${reason.stack || ""}`
        : reason && typeof reason === "object" && "message" in reason
          ? String((reason as { message: unknown }).message)
          : (() => {
              try {
                return JSON.stringify(reason);
              } catch {
                return String(reason ?? "");
              }
            })();
  return /meeting has ended|meeting ended in error|meeting ended|exiting meeting|room was deleted|room deleted|ejected|ejection|left the call|websocket.*close|connection.*closed|daily\.co.*ended|daily-js version|no longer supported\.?\s*please upgrade|please upgrade to a newer version|react-hydration-error|hydrat(?:e|ion)/i.test(
    raw
  );
}

function argsLookLikeNoise(args: unknown[]): boolean {
  try {
    return isNoise(args.map((a) => (typeof a === "string" ? a : a instanceof Error ? a.message : JSON.stringify(a))).join(" "));
  } catch {
    return args.some((a) => isNoise(a));
  }
}

export default function VapiNoiseGuard() {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isNoise(event.reason)) return;
      event.preventDefault();
      event.stopImmediatePropagation?.();
    };

    const onError = (event: ErrorEvent) => {
      const msg = `${event.message || ""} ${event.error?.message || ""} ${event.error?.stack || ""}`;
      if (!isNoise(msg) && !isNoise(event.error)) return;
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return true;
    };

    // Next.js Turbopack overlay hooks console.error — filter Daily teardown spam there.
    const originalError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      if (argsLookLikeNoise(args)) return;
      originalError(...args);
    };

    // Capture phase so we run before Next's overlay listeners when possible
    window.addEventListener("unhandledrejection", onRejection, true);
    window.addEventListener("error", onError, true);
    return () => {
      console.error = originalError;
      window.removeEventListener("unhandledrejection", onRejection, true);
      window.removeEventListener("error", onError, true);
    };
  }, []);

  return null;
}
