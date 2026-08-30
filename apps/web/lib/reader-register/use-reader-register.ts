"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_EXPLAIN_REGISTER,
  isExplainRegister,
  type ExplainRegister,
} from "@/lib/pick-explainer/prompts";

/**
 * Shared hook — "same data, different doorway" (NFL House doctrine).
 *
 * Reads and writes the reader's chosen register from/to localStorage under
 * the canonical key `gse-reader-register`. Every surface that honours the
 * reader register must use this hook so the choice propagates site-wide
 * without duplication.
 *
 * SSR-safe: `null` on first render; the stored value after mount.
 * Callers that need a concrete value immediately may fall back to
 * `DEFAULT_EXPLAIN_REGISTER`.
 */

export const REGISTER_STORAGE_KEY = "gse-reader-register";

export function useReaderRegister(): [
  ExplainRegister,
  (next: ExplainRegister) => void,
] {
  const [register, setRegister] = useState<ExplainRegister>(
    DEFAULT_EXPLAIN_REGISTER,
  );

  // Read after mount so SSR and first client render agree on DEFAULT.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REGISTER_STORAGE_KEY);
      setRegister(isExplainRegister(raw) ? raw : DEFAULT_EXPLAIN_REGISTER);
    } catch {
      setRegister(DEFAULT_EXPLAIN_REGISTER);
    }
  }, []);

  function choose(next: ExplainRegister): void {
    setRegister(next);
    try {
      window.localStorage.setItem(REGISTER_STORAGE_KEY, next);
    } catch {
      // Private mode — the choice holds for this visit only.
    }
  }

  return [register, choose];
}
