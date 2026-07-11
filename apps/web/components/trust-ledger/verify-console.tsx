"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * VerifyConsole — the interactive half of /verify. Takes a receipt hash,
 * calls the public verification endpoint, and renders one of four honest
 * states: not found, verified + sealed (pre-kickoff), verified + open
 * (full committed fields), or INTEGRITY FAILURE (the red state that keeps
 * everyone honest, including us).
 */

type VerifyResponse = {
  found: boolean;
  error?: string;
  verified?: boolean;
  sealed?: boolean;
  frozenAt?: string;
  modelVersion?: string;
  note?: string;
  result?: string;
  game?: { matchup: string; sport: string; commenceTime: string } | null;
  committed?: {
    line: number;
    entryOdds: number;
    marketFairProb: number;
    confidence: number;
    edgeScore: number;
    modelProb: number | null;
  };
  payload?: string;
  contentHash?: string;
  pickId?: string;
};

/**
 * Recompute-it-yourself: the EXACT leaf preimage and the frozen receipt hash.
 * The receipt hash is SHA-256 over `leaf:<pickId>:<payload>` (hashLeaf,
 * proof-of-record.ts) — NOT over the payload alone. We show the full preimage
 * string so a skeptic can copy it, run SHA-256, and get a digest that matches
 * the receipt hash. Rendered on BOTH the verified branch (confirm intact) and
 * the integrity-failure branch (reproduce WHY the stored record no longer
 * matches) — the failure case is exactly when independent recompute matters
 * most. Renders nothing until the endpoint returns the raw material.
 */
/**
 * The zero-server-trust moment: recompute the receipt hash IN THE VISITOR'S
 * BROWSER via WebCrypto. The server's "verified" verdict, the displayed
 * payload, and the frozen hash are all inputs the visitor can now check
 * against each other locally — a MATCH here means their own machine derived
 * the same digest from the same committed fields. No fetch, no trust.
 */
function BrowserRecompute({
  preimage,
  contentHash,
  context = "verified",
}: {
  preimage: string;
  contentHash: string;
  /**
   * Which server verdict this recompute sits under. Under a failed verdict a
   * local MATCH must not read as "the record is healthy": the server hashes
   * the same string, so MATCH there means the committed payload is intact
   * and the failure is column drift &mdash; the stored row no longer agrees
   * with what was sealed. The copy has to say that, never contradict the red
   * verdict above it.
   */
  context?: "verified" | "failure";
}) {
  const [verdict, setVerdict] = useState<"idle" | "working" | "match" | "mismatch" | "unsupported">(
    "idle",
  );
  const [computed, setComputed] = useState<string | null>(null);

  // A new receipt (fresh paste or deep link) must start from an idle verdict.
  // React reuses this component instance across lookups, so without the reset
  // a previous receipt's MATCH would display for a hash that was never
  // recomputed locally.
  useEffect(() => {
    setVerdict("idle");
    setComputed(null);
  }, [preimage, contentHash]);

  const run = useCallback(async () => {
    if (!globalThis.crypto?.subtle) {
      setVerdict("unsupported");
      return;
    }
    setVerdict("working");
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(preimage),
    );
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setComputed(hex);
    setVerdict(hex === contentHash.toLowerCase() ? "match" : "mismatch");
  }, [preimage, contentHash]);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void run()}
        disabled={verdict === "working"}
        className="rounded-lg border border-orbital-cyan/40 px-3 py-2 text-xs font-semibold text-orbital-cyan hover:bg-orbital-cyan/10 disabled:opacity-60"
      >
        {verdict === "working" ? "Computing…" : "Recompute in this browser"}
      </button>
      {verdict === "match" && context === "verified" && (
        <p className="mt-2 text-xs font-semibold text-verify" role="status">
          MATCH. Your browser computed{" "}
          <code className="break-all font-mono text-[10px]">{computed?.slice(0, 16)}…</code>{" "}
          from the committed fields, identical to the frozen receipt hash. No
          part of that computation touched our servers.
        </p>
      )}
      {verdict === "match" && context === "failure" && (
        <p className="mt-2 text-xs font-semibold text-caution" role="status">
          Digest match, verdict unchanged. Your browser computed{" "}
          <code className="break-all font-mono text-[10px]">{computed?.slice(0, 16)}…</code>{" "}
          from the committed string, so the frozen commitment itself is
          intact. The failure above means the record&apos;s stored fields no
          longer agree with that committed string. The break is between the
          live record and what was sealed, and this local check does not
          clear it.
        </p>
      )}
      {verdict === "mismatch" && (
        <p className="mt-2 text-xs font-semibold text-alert" role="status">
          MISMATCH. Your browser&apos;s digest ({computed?.slice(0, 16)}…) does
          not equal the displayed receipt hash. That means the displayed
          payload and hash do not belong together. Take a screenshot; this is
          exactly the state this system exists to expose.
        </p>
      )}
      {verdict === "unsupported" && (
        <p className="mt-2 text-xs text-ion-2" role="status">
          This browser does not expose WebCrypto. You can still copy the
          string above into any SHA-256 tool.
        </p>
      )}
    </div>
  );
}

function RecomputePanel({
  pickId,
  payload,
  contentHash,
  context = "verified",
}: {
  pickId?: string;
  payload?: string;
  contentHash?: string;
  context?: "verified" | "failure";
}) {
  if (!pickId || !payload || !contentHash) return null;
  const preimage = `leaf:${pickId}:${payload}`;
  return (
    <details className="mt-6 border-t border-white/10 pt-4">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-ion-2 hover:text-ion-white">
        Recompute it yourself
      </summary>
      <p className="mt-3 text-xs leading-relaxed text-ion-2">
        Don&apos;t take our word for it. Run SHA-256 over the exact string below
        &mdash; prefix included &mdash; and it equals the receipt hash we froze
        before kickoff. Any change to a single character changes the digest.
      </p>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ion-2">
          SHA-256 input (hash this exact string)
        </p>
        <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-ion-white">
          {preimage}
        </pre>
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ion-2">
          Receipt hash (SHA-256)
        </p>
        <code className="mt-1 block break-all rounded bg-black/40 p-3 font-mono text-[11px] text-ion-white">
          {contentHash}
        </code>
      </div>
      <BrowserRecompute preimage={preimage} contentHash={contentHash} context={context} />
    </details>
  );
}

/**
 * Post-verdict funnel: a verified receipt is the product demo. Shown only on
 * the two verified branches — never on the not-found or integrity-failure
 * states, where selling anything would be tone-deaf.
 */
function VerifiedNextSteps() {
  return (
    <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-ion-2">
      The live board publishes with this same pre-kickoff seal.{" "}
      <Link href="/picks" className="font-semibold text-orbital-cyan hover:text-ion-white">
        See today&apos;s board
      </Link>{" "}
      or{" "}
      <Link href="/proof" className="font-semibold text-orbital-cyan hover:text-ion-white">
        browse the whole settled record
      </Link>
      .
    </p>
  );
}

export function VerifyConsole({ initialHash = "" }: { initialHash?: string }) {
  const [hash, setHash] = useState(initialHash);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [res, setRes] = useState<VerifyResponse | null>(null);

  const check = useCallback(async (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(trimmed)) {
      setRes({ found: false, error: "A receipt hash is 64 hex characters." });
      setState("done");
      return;
    }
    setState("loading");
    try {
      const r = await fetch(`/api/verify?hash=${trimmed}`);
      const body = (await r.json().catch(() => null)) as VerifyResponse | null;
      if (!r.ok || body === null) {
        // A server fault must never wear the not-found copy — telling a user
        // to "check for a copy/paste miss" over our 5xx blames them for our
        // outage. The endpoint's own error text (e.g. the 503 "not a verdict"
        // line) wins when present.
        setRes({
          found: false,
          error:
            body?.error ??
            `The verifier hit an error (HTTP ${r.status}). This is not a verdict on the receipt; try again shortly.`,
        });
      } else {
        setRes(body);
      }
    } catch {
      setRes({ found: false, error: "Could not reach the verifier. Try again." });
    }
    setState("done");
  }, []);

  // Deep links from pick cards arrive with the hash pre-filled: run the
  // check on arrival so "click receipt -> see verdict" is one step.
  useEffect(() => {
    if (initialHash) void check(initialHash);
  }, [initialHash, check]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Receipt hash</span>
          <input
            type="text"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="Paste a 64-character receipt hash"
            spellCheck={false}
            className="min-h-[44px] w-full rounded-lg border border-titanium bg-carbon px-4 font-mono text-sm text-ion-white placeholder:text-ion-2 focus:border-orbital-cyan focus:outline-none focus:ring-2 focus:ring-orbital-cyan/25"
          />
        </label>
        <button
          type="button"
          onClick={() => void check(hash)}
          disabled={state === "loading"}
          className="btn-primary min-h-[44px] px-6 font-semibold disabled:opacity-60"
        >
          {state === "loading" ? "Checking…" : "Verify"}
        </button>
      </div>

      {state === "done" && res && (
        <div
          role="status"
          className={`rounded-xl border p-5 ${
            !res.found
              ? "border-titanium bg-carbon"
              : res.verified
                ? "border-orbital-cyan/40 bg-orbital-cyan/5"
                : "border-alert/60 bg-alert/10"
          }`}
        >
          {!res.found ? (
            <p className="text-sm text-ion-1">
              {res.error ?? "No receipt matches that hash. Check for a copy/paste miss."}
            </p>
          ) : !res.verified ? (
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-alert">
                Integrity check failed
              </p>
              <p className="mt-2 text-sm text-ion-1">
                The stored record no longer matches its frozen hash. That should
                never happen, and showing you this state is the point of the
                system: it cannot be hidden.
              </p>
              {/* The failure case is exactly when independent recompute matters
                  most — reproduce the mismatch yourself rather than trust the
                  red verdict. Shows only for open (post-kickoff) receipts, which
                  are the only ones that return the raw payload. */}
              <RecomputePanel
                pickId={res.pickId}
                payload={res.payload}
                contentHash={res.contentHash}
                context="failure"
              />
            </div>
          ) : res.sealed ? (
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-orbital-cyan">
                Verified · sealed until kickoff
              </p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ion-2">Commitment frozen</dt>
                  <dd className="break-all text-right font-mono text-ion-white">{res.frozenAt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ion-2">Model version</dt>
                  <dd className="break-all text-right font-mono text-ion-white">{res.modelVersion}</dd>
                </div>
              </dl>
              {res.note && <p className="mt-3 text-xs leading-5 text-ion-2">{res.note}</p>}
              <VerifiedNextSteps />
            </div>
          ) : (
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-orbital-cyan">
                Verified · commitment intact
              </p>
              <dl className="mt-3 grid gap-2 text-sm">
                {res.game && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ion-2">Game</dt>
                    <dd className="text-ion-white">
                      {res.game.matchup} · {res.game.sport}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-ion-2">Frozen (pre-kickoff)</dt>
                  <dd className="break-all text-right font-mono text-ion-white">{res.frozenAt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ion-2">Result</dt>
                  <dd className="break-all text-right font-mono text-ion-white">{res.result}</dd>
                </div>
                {res.committed && (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ion-2">Committed line / entry price</dt>
                      <dd className="break-all text-right font-mono text-ion-white">
                        {res.committed.line} at {res.committed.entryOdds > 0 ? "+" : ""}
                        {res.committed.entryOdds}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ion-2">Market fair probability</dt>
                      <dd className="break-all text-right font-mono text-ion-white">
                        {(res.committed.marketFairProb * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ion-2">Committed confidence / edge</dt>
                      <dd className="break-all text-right font-mono text-ion-white">
                        {res.committed.confidence} / {res.committed.edgeScore}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ion-2">Calibrated model probability</dt>
                      <dd className="break-all text-right font-mono text-ion-white">
                        {res.committed.modelProb == null
                          ? "none claimed (honest)"
                          : `${(res.committed.modelProb * 100).toFixed(1)}%`}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              <RecomputePanel
                pickId={res.pickId}
                payload={res.payload}
                contentHash={res.contentHash}
              />
              <VerifiedNextSteps />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
