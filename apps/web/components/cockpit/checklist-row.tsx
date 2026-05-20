/**
 * ChecklistRow — small operator-facing checklist line item.
 *
 * Reused across cockpit surfaces for "this is satisfied / this is not"
 * checks. Pure presentation. No I/O.
 */

export interface ChecklistRowProps {
  readonly ok: boolean;
  readonly label: string;
  readonly detail: string;
  readonly className?: string;
}

export function ChecklistRow({
  ok,
  label,
  detail,
  className,
}: ChecklistRowProps) {
  return (
    <div className={["flex items-center gap-3", className ?? ""].join(" ")}>
      <span
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          ok ? "bg-green-700 text-green-100" : "bg-gray-700 text-gray-300",
        ].join(" ")}
        aria-hidden="true"
      >
        {ok ? "✓" : "·"}
      </span>
      <div className="min-w-0">
        <p className={ok ? "text-gray-200" : "text-gray-400"}>{label}</p>
        <p className="text-[10px] text-gray-500">{detail}</p>
      </div>
    </div>
  );
}
