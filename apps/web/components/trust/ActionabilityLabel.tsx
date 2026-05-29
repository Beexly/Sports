import type { SurfaceKind } from "@/lib/galaxy/kernel/surfaces";

interface Props {
  surfaceKind: SurfaceKind;
  tier: "free" | "pro" | "elite" | "all" | "operator";
  className?: string;
}

function actionabilityText(kind: SurfaceKind, tier: Props["tier"]): string {
  if (kind === "academy") return "Educational";
  if (kind === "cockpit") return "Operator only";
  if (kind === "concept") return "Editorial";
  if (kind === "commercial") return "Informational";
  if (kind === "social") return "Shareable";
  if (tier === "operator") return "Operator only";
  return "Intelligence signal";
}

export function ActionabilityLabel({ surfaceKind, tier, className = "" }: Props) {
  const text = actionabilityText(surfaceKind, tier);
  return (
    <span
      className={["font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500", className].join(" ")}
      aria-label={`Surface type: ${text}`}
    >
      {text}
    </span>
  );
}
