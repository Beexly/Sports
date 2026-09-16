import { createContext, useContext } from "react";

import type { GseClient } from "./client";

/**
 * The client, injected rather than imported.
 *
 * A module-level singleton would make every screen untestable and would leak
 * one test's fake fetch into the next. Injection costs one context and buys the
 * ability to render a screen against a scripted server in a test — which is the
 * only way to verify the gate and empty states, the states that matter most.
 */
export const GseClientContext = createContext<GseClient | null>(null);

export function useGseClient(): GseClient {
  const client = useContext(GseClientContext);
  if (!client) {
    throw new Error(
      "useGseClient() was called outside <AppProviders>. Mount the providers at the " +
        "root layout. A fallback client here would silently point a screen at the " +
        "wrong environment.",
    );
  }
  return client;
}