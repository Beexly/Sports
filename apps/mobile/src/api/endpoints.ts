import type { GseClient, RequestOptions } from "./client";
import {
  decodeBoardState,
  decodeBrief,
  decodeCalibration,
  decodeExplain,
  decodePassthrough,
  decodePerformance,
  decodePickList,
} from "./decoders";
import type {
  ApiResult,
  BoardState,
  BriefPayload,
  CalibrationPayload,
  PerformancePayload,
  PublicPick,
} from "./contracts";

/**
 * Typed endpoint functions — one per real server route.
 *
 * Every path here exists in Beexly/Sports today and is exercised by the web
 * app. Two families:
 *
 *   PUBLIC  — `/api/board/*`, `/api/picks*`, `/api/calibration`, `/api/brief`,
 *             `/api/performance`. Anonymous-capable; the server resolves an
 *             anonymous viewer through `getEntitlements("FREE")`, so the app
 *             gets the SAME tier semantics signed out as the web does.
 *
 *   MOBILE  — `/api/mobile/v1/*`. Not yet in the repo; the PR-ready handlers
 *             live in `server-patches/`. Until they deploy, the call returns a
 *             404 and the app degrades honestly rather than showing an error a
 *             customer cannot act on.
 *
 * Nothing here computes. Every value is the server's.
 */

export interface EndpointContext {
  client: GseClient;
  /** Bearer token from the device session, when signed in. */
  token: string | null;
  signal?: AbortSignal;
}

function opts<T>(
  ctx: EndpointContext,
  decode: (body: unknown) => T,
  extra: Partial<RequestOptions<T>> = {},
): RequestOptions<T> {
  return { decode, token: ctx.token, signal: ctx.signal, ...extra };
}

/* ══════════════════════════════════════════════════════════════════════════
   BOARD
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/board/state — the live gate lanes.
 *
 * Public and IP-rate-limited (60/min). Carries the honest-empty classifier in
 * `meta.degradationCharacter`, which is what lets the app say "quiet slate"
 * rather than "loading" forever.
 */
export function boardState(ctx: EndpointContext): Promise<ApiResult<BoardState>> {
  return ctx.client.request(
    "/api/board/state",
    opts(ctx, decodeBoardState, { cacheKey: "board/state", freshness: "board" }),
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PICKS
   ══════════════════════════════════════════════════════════════════════════ */

export interface PicksQuery {
  sport?: string;
  /** Eastern calendar day, YYYY-MM-DD. */
  date?: string;
  grade?: string;
}

/**
 * GET /api/picks — the published set for a viewer.
 *
 * Server-side gated: FREE viewers receive a teaser with `confidence: null` and
 * a null `factorBreakdown`. The app must render those nulls as redactions.
 *
 * The cache key includes the query, because a cached NFL response served for a
 * MLB request is a wrong-content bug, not a stale-content bug.
 */
export function picks(
  ctx: EndpointContext,
  query: PicksQuery = {},
): Promise<ApiResult<PublicPick[]>> {
  const key = `picks/${query.sport ?? "all"}/${query.date ?? "today"}/${query.grade ?? "all"}`;
  return ctx.client.request(
    "/api/picks",
    opts(ctx, decodePickList, { query: { ...query }, cacheKey: key, freshness: "picks" }),
  );
}

/** GET /api/picks/[id]/explain — the reasoning trail for one pick. */
export function pickExplain(
  ctx: EndpointContext,
  id: string,
): Promise<ApiResult<Record<string, unknown>>> {
  return ctx.client.request(
    `/api/picks/${encodeURIComponent(id)}/explain`,
    opts(ctx, decodeExplain, { cacheKey: `pick/${id}/explain`, freshness: "picks" }),
  );
}

/** GET /api/picks/[id]/audit — provenance. FREE gets a summary; PRO+ the detail. */
export function pickAudit(
  ctx: EndpointContext,
  id: string,
): Promise<ApiResult<Record<string, unknown>>> {
  return ctx.client.request(
    `/api/picks/${encodeURIComponent(id)}/audit`,
    opts(ctx, decodeExplain, { cacheKey: `pick/${id}/audit`, freshness: "picks" }),
  );
}

/** GET /api/picks/daily-slate — the slate view. */
export function dailySlate(
  ctx: EndpointContext,
  query: { sport?: string; date?: string } = {},
): Promise<ApiResult<PublicPick[]>> {
  return ctx.client.request(
    "/api/picks/daily-slate",
    opts(ctx, decodePickList, {
      query: { ...query },
      cacheKey: `slate/${query.sport ?? "all"}/${query.date ?? "today"}`,
      freshness: "picks",
    }),
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CALIBRATION / PERFORMANCE / BRIEF
   ══════════════════════════════════════════════════════════════════════════ */

export function calibration(ctx: EndpointContext): Promise<ApiResult<CalibrationPayload>> {
  return ctx.client.request(
    "/api/calibration",
    opts(ctx, decodeCalibration, { cacheKey: "calibration", freshness: "calibration" }),
  );
}

export function performance(ctx: EndpointContext): Promise<ApiResult<PerformancePayload>> {
  return ctx.client.request(
    "/api/performance",
    opts(ctx, decodePerformance, { cacheKey: "performance", freshness: "performance" }),
  );
}

export function brief(ctx: EndpointContext): Promise<ApiResult<BriefPayload>> {
  return ctx.client.request(
    "/api/brief",
    opts(ctx, decodeBrief, { cacheKey: "brief", freshness: "brief" }),
  );
}

/** GET /api/clv — Elite-only line-value ledger. 403s for everyone else, cleanly. */
export function clvLedger(ctx: EndpointContext): Promise<ApiResult<unknown>> {
  return ctx.client.request(
    "/api/clv",
    opts(ctx, decodePassthrough, { cacheKey: "clv", freshness: "performance" }),
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WATCHLIST
   ══════════════════════════════════════════════════════════════════════════ */

export interface WatchlistEntry {
  id: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface WatchlistMeta {
  tier: string;
  alertsEligible: boolean;
  followCount: number;
  followLimit: number | null;
}

function decodeWatchlist(body: unknown): { entries: WatchlistEntry[]; meta: WatchlistMeta } {
  const root = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const data = Array.isArray(root.data) ? root.data : [];
  const meta = (typeof root.meta === "object" && root.meta !== null ? root.meta : {}) as Record<
    string,
    unknown
  >;
  return {
    entries: data.map((raw) => {
      const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      return {
        id: typeof r.id === "string" ? r.id : "",
        entityType: typeof r.entityType === "string" ? r.entityType : "",
        entityId: typeof r.entityId === "string" ? r.entityId : "",
        createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
      };
    }),
    meta: {
      tier: typeof meta.tier === "string" ? meta.tier : "FREE",
      // Defaults to FALSE. An unknown alert entitlement must never render as
      // "you will be notified", because the user then stops checking.
      alertsEligible: meta.alertsEligible === true,
      followCount: typeof meta.followCount === "number" ? meta.followCount : 0,
      followLimit: typeof meta.followLimit === "number" ? meta.followLimit : null,
    },
  };
}

export function watchlist(
  ctx: EndpointContext,
): Promise<ApiResult<{ entries: WatchlistEntry[]; meta: WatchlistMeta }>> {
  return ctx.client.request(
    "/api/watchlist",
    opts(ctx, decodeWatchlist, { cacheKey: "watchlist", freshness: "me" }),
  );
}

export function watchlistFollow(
  ctx: EndpointContext,
  entityType: string,
  entityId: string,
): Promise<ApiResult<unknown>> {
  return ctx.client.request(
    "/api/watchlist/follow",
    opts(ctx, decodePassthrough, { method: "POST", body: { entityType, entityId } }),
  );
}

export function watchlistUnfollow(
  ctx: EndpointContext,
  entityType: string,
  entityId: string,
): Promise<ApiResult<unknown>> {
  return ctx.client.request(
    "/api/watchlist/unfollow",
    opts(ctx, decodePassthrough, { method: "POST", body: { entityType, entityId } }),
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE (contract defined here; handlers shipped as a server patch)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * A single cold-start call.
 *
 * WHY THIS EXISTS: the app needs the board, the brief, the viewer's tier and
 * the freshness anchor before it can render its first useful screen. Fetching
 * four endpoints means four cold TLS handshakes on a cellular radio — the
 * slowest possible first impression. One aggregated call, one connection.
 *
 * The server patch that implements it is in `server-patches/`; it composes the
 * SAME loaders the individual routes use, so it cannot become a second source
 * of truth for any value.
 */
export interface BootstrapPayload {
  board: BoardState | null;
  brief: BriefPayload | null;
  tier: string;
  alertsEligible: boolean;
  serverTime: string;
  modelVersion: string | null;
}

function decodeBootstrap(body: unknown): BootstrapPayload {
  const root = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const data = (typeof root.data === "object" && root.data !== null ? root.data : {}) as Record<
    string,
    unknown
  >;
  const account = (typeof data.account === "object" && data.account !== null ? data.account : {}) as Record<
    string,
    unknown
  >;
  return {
    board: data.board ? decodeBoardState(data.board) : null,
    brief: data.brief ? decodeBrief(data.brief) : null,
    tier: typeof account.tier === "string" ? account.tier : "FREE",
    alertsEligible: account.alertsEligible === true,
    serverTime: typeof data.serverTime === "string" ? data.serverTime : new Date().toISOString(),
    modelVersion: typeof data.modelVersion === "string" ? data.modelVersion : null,
  };
}

export function bootstrap(ctx: EndpointContext): Promise<ApiResult<BootstrapPayload>> {
  return ctx.client.request(
    "/api/mobile/v1/bootstrap",
    opts(ctx, decodeBootstrap, { cacheKey: "mobile/bootstrap", freshness: "board" }),
  );
}

/** DELETE-account contract. Required by App Review guideline 5.1.1(v). */
export function deleteAccount(
  ctx: EndpointContext,
  confirmation: string,
): Promise<ApiResult<unknown>> {
  return ctx.client.request(
    "/api/mobile/v1/account/delete",
    opts(ctx, decodePassthrough, {
      method: "POST",
      body: { confirmation, confirm: true },
    }),
  );
}

/** Register an APNs/Expo push token against the signed-in account. */
export function registerDevice(
  ctx: EndpointContext,
  input: {
    pushToken: string;
    platform: "ios";
    appVersion: string;
    buildNumber: string;
    deviceModel: string;
    locale: string;
  },
): Promise<ApiResult<unknown>> {
  return ctx.client.request(
    "/api/mobile/v1/devices",
    opts(ctx, decodePassthrough, { method: "POST", body: input }),
  );
}

export function unregisterDevice(
  ctx: EndpointContext,
  pushToken: string,
): Promise<ApiResult<unknown>> {
  return ctx.client.request(
    "/api/mobile/v1/devices",
    opts(ctx, decodePassthrough, { method: "DELETE", body: { pushToken } }),
  );
}

/**
 * Every endpoint the app calls, with its availability. Used by the diagnostics
 * screen so an operator can see at a glance whether the mobile contract has
 * deployed yet — rather than inferring it from a customer complaint.
 */
export const ENDPOINT_MANIFEST: readonly { path: string; family: "public" | "mobile"; method: string }[] = [
  { path: "/api/board/state", family: "public", method: "GET" },
  { path: "/api/picks", family: "public", method: "GET" },
  { path: "/api/picks/daily-slate", family: "public", method: "GET" },
  { path: "/api/picks/[id]/explain", family: "public", method: "GET" },
  { path: "/api/picks/[id]/audit", family: "public", method: "GET" },
  { path: "/api/calibration", family: "public", method: "GET" },
  { path: "/api/performance", family: "public", method: "GET" },
  { path: "/api/brief", family: "public", method: "GET" },
  { path: "/api/clv", family: "public", method: "GET" },
  { path: "/api/watchlist", family: "public", method: "GET" },
  { path: "/api/watchlist/follow", family: "public", method: "POST" },
  { path: "/api/watchlist/unfollow", family: "public", method: "POST" },
  { path: "/api/mobile/v1/bootstrap", family: "mobile", method: "GET" },
  { path: "/api/mobile/v1/devices", family: "mobile", method: "POST" },
  { path: "/api/mobile/v1/account/delete", family: "mobile", method: "POST" },
] as const;