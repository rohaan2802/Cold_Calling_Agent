"use client";

import { useEffect } from "react";

/** Default toast / status message lifetime across the app. */
export const MESSAGE_DISMISS_MS = 7000;

/** Clears a message string after `ms` (default 7s). */
export function useAutoDismiss(
  message: string,
  clear: () => void,
  ms = MESSAGE_DISMISS_MS
) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clear, ms);
    return () => clearTimeout(timer);
  }, [message, clear, ms]);
}

/** Runs `clear` once after `ms` when `active` is true (default 7s). */
export function useAutoClearWhen(
  active: boolean,
  clear: () => void,
  ms = MESSAGE_DISMISS_MS
) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(clear, ms);
    return () => clearTimeout(timer);
  }, [active, clear, ms]);
}
