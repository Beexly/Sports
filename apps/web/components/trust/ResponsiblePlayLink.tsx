import Link from "next/link";
import { isRestraintGatedByTier } from "@/lib/responsible-intelligence/restraint";

interface Props {
  className?: string;
  label?: string;
}

/**
 * Responsible play link — never tier-gated.
 * isRestraintGatedByTier() returns the literal type `false` (not `boolean`)
 * so TypeScript enforces this at compile time.
 */
export function ResponsiblePlayLink({ className = "", label = "Responsible play" }: Props) {
  const gated: false = isRestraintGatedByTier();
  void gated;

  return (
    <Link
      href="/responsible-play"
      className={[
        "font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500 hover:text-gray-300 transition-colors underline-offset-2 hover:underline",
        className,
      ].join(" ")}
      aria-label="Responsible play resources"
    >
      {label}
    </Link>
  );
}
