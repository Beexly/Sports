"use client";

/**
 * Clipboard copy hook — pure navigator.clipboard, zero dependencies.
 * Re-implemented TS-native (pattern common to dozens of MIT hook libraries).
 */

import { useCallback, useState } from "react";

interface UseClipboardOptions {
  /** How long to show "copied" state (ms). Default 2000. */
  timeout?: number;
}

interface UseClipboardResult {
  copied: boolean;
  copy: (text: string) => Promise<void>;
}

export function useClipboard({ timeout = 2000 }: UseClipboardOptions = {}): UseClipboardResult {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      if (!navigator?.clipboard) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
      } catch {
        // Silently fail — clipboard access may be denied
      }
    },
    [timeout]
  );

  return { copied, copy };
}
