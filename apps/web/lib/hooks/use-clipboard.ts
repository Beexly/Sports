"use client";

/**
 * Clipboard write hook with optional reset-after timeout.
 */

import { useCallback, useRef, useState } from "react";

export interface UseClipboardResult {
  readonly copied: boolean;
  readonly copy: (text: string) => Promise<void>;
  readonly error: string | null;
}

export function useClipboard(resetMs = 2000): UseClipboardResult {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string) => {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        setError("Clipboard API not available");
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setError(null);
        setCopied(true);

        // Clear any pending reset timer
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          setCopied(false);
          timerRef.current = null;
        }, resetMs);
      } catch (err) {
        setCopied(false);
        setError(err instanceof Error ? err.message : "Failed to copy to clipboard");
      }
    },
    [resetMs]
  );

  return { copied, copy, error };
}
