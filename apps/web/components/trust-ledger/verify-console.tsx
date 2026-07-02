"use client";

import { useState } from "react";

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
  contentHash?: string;
};

export function VerifyConsole() {
  const [hash, setHash] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [res, setRes] = useState<VerifyResponse | null>(null);

  async function check() {
    const trimmed = hash.trim().toLowerCase();
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
  }

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
          onClick={check}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
