import * as React from "react";
import { AccessibilityInfo } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { GseClient } from "../api/client";
import { MemoryCacheStorage, type CacheStorage } from "../api/cache";
import { GseClientContext, useGseClient } from "../api/context";
import { ThemeProvider, buildTheme } from "../theme";
import { usePreferences } from "../state/preferences";
import { useSession } from "../state/session";
import { AsyncStorageCacheAdapter } from "../api/async-storage-adapter";
import { setHapticsEnabled } from "../lib/haptics";

/**
 * The API origin.
 *
 * `EXPO_PUBLIC_API_BASE_URL` wins when set, so a staging build can point at a
 * preview deployment. The fallback is the CANONICAL WWW host, never the apex —
 * `apps/web/lib/seo/site-url.ts` is explicit that every absolute URL must derive
 * from `https://www.galaxysportsedge.com` and that the apex redirects at the DNS
 * layer. Hardcoding the apex here would make every request take a redirect.
 */
const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ??
  "https://www.galaxysportsedge.com";

/**
 * App providers.
 *
 * ORDER MATTERS and is not alphabetical:
 *
 *   GestureHandlerRootView  must be the outermost native view, or every
 *                           gesture inside it silently does nothing.
 *   SafeAreaProvider        must wrap anything that reads insets.
 *   QueryClientProvider     below both, so a query can be cancelled when a
 *                           screen unmounts inside the safe area.
 *   GseClientProvider       below Query, because the query keys are built from
 *                           the endpoint functions that close over the client.
 *   ThemeProvider           innermost of the structural ones, so a theme flip
 *                           re-renders content without remounting navigation.
 *
 * THE QUERY CLIENT CONFIG, and why each number is what it is:
 *
 *   staleTime 60s           matches FRESHNESS_BUDGET_MS.board, the tightest
 *                           budget in the app. Per-query `staleTime` overrides
 *                           it downward for slow-moving surfaces.
 *   retry 0                 Retry lives in the HTTP client, which understands
 *                           gate bodies and Retry-After. A second, dumber retry
 *                           layer on top would double-request on every 503.
 *   refetchOnWindowFocus false
 *                           RN has no window focus, and the "focus" events on
 *                           this platform fire on app-state changes that the
 *                           screens handle deliberately instead.
 *   gcTime 24h              the on-disk cache is the source of truth for
 *                           offline reads, not the in-memory GC window.
 */

const QUERY_DEFAULTS = {
  staleTime: 60_000,
  retry: false as const,
  refetchOnWindowFocus: false,
  gcTime: 24 * 60 * 60 * 1000,
};

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: QUERY_DEFAULTS, mutations: { retry: 0 } },
  });
}

/**
 * A storage that prefers the persistent adapter and falls back to memory.
 *
 * The fallback is not a nicety: on a cold start before the first unlock,
 * AsyncStorage can throw. Crashing the app because the cache is unavailable
 * would be worse than running without a cache.
 */
function makeStorage(): CacheStorage {
  try {
    return new AsyncStorageCacheAdapter();
  } catch {
    return new MemoryCacheStorage();
  }
}

export function AppProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  const [queryClient] = React.useState(makeQueryClient);

  const themeMode = usePreferences((s) => s.themeMode);
  const hapticsEnabled = usePreferences((s) => s.hapticsEnabled);
  const reducedMotionOverride = usePreferences((s) => s.reduceMotionOverride);
  const hydrate = useSession((s) => s.hydrate);

  // One client for the process. Rebuilding it on a token change would drop the
  // cache and thrash the network; the token travels per-request instead.
  const [client] = React.useState(() =>
    GseClient.withStorage(API_BASE_URL, makeStorage()),
  );

  const systemReduceMotion = useSystemReduceMotion();

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    setHapticsEnabled(hapticsEnabled);
  }, [hapticsEnabled]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <GseClientContext.Provider value={client}>
            <ThemeProvider mode={themeMode}>
              <MotionPreferenceProvider
                systemReduce={systemReduceMotion}
                override={reducedMotionOverride}
              >
                {children}
              </MotionPreferenceProvider>
            </ThemeProvider>
          </GseClientContext.Provider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Reads the OS "Reduce Motion" accessibility setting and keeps it current.
 *
 * Read here, once, rather than in each animating component: the design contract
 * says reduced motion is honoured globally and "never override it in
 * components", and the only way to guarantee that is for components to have one
 * place to ask.
 */
function useSystemReduceMotion(): boolean {
  const [reduce, setReduce] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduce(value);
      })
      .catch(() => {
        // An unsupported platform reports false rather than failing the boot.
      });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      if (mounted) setReduce(value);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}

/* ── Reduce motion ─────────────────────────────────────────────────────── */

/**
 * The design contract: "Reduced motion is honored globally … Never override it
 * in components."
 *
 * This provider is what makes that enforceable. It ORs the OS setting with the
 * user's explicit override, so a component can ask one question
 * (`useMotion().durations`) and get a correct answer, instead of each
 * component re-reading `AccessibilityInfo` and one of them getting it wrong.
 */
export interface MotionPreference {
  reduce: boolean;
  durations: { fast: number; base: number; slow: number; cinematic: number };
}

const MotionContext = React.createContext<MotionPreference>({
  reduce: false,
  durations: { fast: 150, base: 280, slow: 520, cinematic: 880 },
});

export function MotionPreferenceProvider({
  systemReduce,
  override,
  children,
}: {
  systemReduce: boolean;
  override: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  const base = React.useMemo(() => buildTheme("field").motion.dur, []);
  const reduce = systemReduce || override;
  const value = React.useMemo<MotionPreference>(
    () => ({
      reduce,
      durations: {
        fast: reduce ? base.reduced : base.fast,
        base: reduce ? base.reduced : base.base,
        slow: reduce ? base.reduced : base.slow,
        cinematic: reduce ? base.reduced : base.cinematic,
      },
    }),
    [reduce, base],
  );
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion(): MotionPreference {
  return React.useContext(MotionContext);
}

/* Re-export so feature code has one import for "the client". */
export { useGseClient };