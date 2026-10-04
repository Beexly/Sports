import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Verdict } from "@/lib/types";

export function Stamp({ tone, children }: { tone: "good" | "warn" | "flat"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-xs tracking-widest uppercase px-2 py-1",
        tone === "good" && "bg-primary text-primary-ink",
        tone === "warn" && "bg-accent text-accent-ink",
        tone === "flat" && "bg-surface-2 text-fg",
      )}
    >
      {children}
    </span>
  );
}

export function verdictTone(verdict: Verdict): "good" | "warn" | "flat" {
  if (verdict === "admit") return "good";
  if (verdict === "hold") return "warn";
  return "flat";
}

export function Meta({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs tracking-wide text-muted uppercase">{children}</p>;
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("border border-line bg-surface p-4 sm:p-6", className)}>{children}</section>;
}

export function Num({ children }: { children: ReactNode }) {
  return <span className="font-mono tabular-nums">{children}</span>;
}

export function ttt(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(3) : "—";
}

export function when(iso: string | null) {
  if (!iso) return "not yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
