export type UncertaintyStateKind =
  | "live"
  | "sample"
  | "preview"
  | "pending"
  | "failure-case";

interface Props {
  kind: UncertaintyStateKind;
  detail?: string;
  className?: string;
}

const STATE_CONFIG: Record<
  UncertaintyStateKind,
  { label: string; colorClass: string; dotClass: string }
> = {
  live: {
    label: "Live data",
    colorClass: "text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  sample: {
    label: "Sample data",
    colorClass: "text-violet-400",
    dotClass: "bg-violet-500",
  },
  preview: {
    label: "Preview",
    colorClass: "text-blue-400",
    dotClass: "bg-blue-500",
  },
  pending: {
    label: "Pending wiring",
    colorClass: "text-amber-400",
    dotClass: "bg-amber-500",
  },
  "failure-case": {
    label: "Failure case documented",
    colorClass: "text-gray-400",
    dotClass: "bg-gray-500",
  },
};

export function UncertaintyState({ kind, detail, className = "" }: Props) {
  const config = STATE_CONFIG[kind];
  return (
    <span
      className={["inline-flex items-center gap-1.5", className].join(" ")}
      aria-label={detail ? `${config.label}: ${detail}` : config.label}
    >
      <span
        className={["h-1.5 w-1.5 rounded-full shrink-0", config.dotClass].join(" ")}
        aria-hidden="true"
      />
      <span className={["font-mono text-[9px] uppercase tracking-[0.16em]", config.colorClass].join(" ")}>
        {config.label}
      </span>
      {detail && (
        <span className="font-mono text-[9px] text-gray-500">— {detail}</span>
      )}
    </span>
  );
}
