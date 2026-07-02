"use client";

import { useState } from "react";

/**
 * CryptoPassButton — starts a Coinbase Commerce hosted checkout for an
 * annual pass. Rendered ONLY when the server says crypto payments are
 * enabled (the page gates on cryptoPaymentsEnabled()), so this component
 * never has to guess about configuration.
 */
export function CryptoPassButton({ tier }: { tier: "PRO" | "ELITE" }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function start() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/billing/crypto-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const body = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (res.status === 401) {
        window.location.href = "/auth/signin?callbackUrl=/pricing";
        return;
      }
      if (!res.ok || !body?.url) {
        setState("error");
        setMessage(body?.error ?? "Could not start checkout. Try again.");
        return;
      }
      window.location.href = body.url;
    } catch {
      setState("error");
      setMessage("Could not start checkout. Try again.");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void start()}
        disabled={state === "loading"}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-titanium px-5 py-2.5 text-sm font-semibold text-ion-white transition-colors hover:border-orbital-cyan disabled:opacity-60"
      >
        {state === "loading" ? "Opening checkout…" : `Pay ${tier === "PRO" ? "Pro" : "Elite"} annual with crypto`}
      </button>
      {message && <p className="text-xs text-alert">{message}</p>}
    </div>
  );
}
