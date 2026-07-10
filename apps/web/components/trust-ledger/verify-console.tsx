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
function RecomputePanel({
  pickId,
  payload,
  contentHash,
}: {
  pickId?: string;
  payload?: string;
  contentHash?: string;
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
      Every pick on the live board carries this same pre-kickoff seal.{" "}
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
      setRes((await r.json()) as VerifyResponse);
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
                  <dd className="font-mono text-ion-white">{res.frozenAt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ion-2">Model version</dt>
                  <dd className="font-mono text-ion-white">{res.modelVersion}</dd>
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
                  <dd className="font-mono text-ion-white">{res.frozenAt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ion-2">Result</dt>
                  <dd className="font-mono text-ion-white">{res.result}</dd>
                </div>
                {res.committed && (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ion-2">Committed line / entry price</dt>
                      <dd className="font-mono text-ion-white">
                        {res.committed.line} at {res.committed.entryOdds > 0 ? "+" : ""}
                        {res.committed.entryOdds}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ion-2">Market fair probability</dt>
                      <dd className="font-mono text-ion-white">
                        {(res.committed.marketFairProb * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ion-2">Committed confidence / edge</dt>
                      <dd className="font-mono text-ion-white">
                        {res.committed.confidence} / {res.committed.edgeScore}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ion-2">Calibrated model probability</dt>
                      <dd className="font-mono text-ion-white">
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
