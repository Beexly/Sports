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
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-label font-bold",
          ok ? "bg-verify/20 text-verify" : "bg-titanium/40 text-ion-1",
        ].join(" ")}
        aria-hidden="true"
      >
        {ok ? "✓" : "·"}
      </span>
      <div className="min-w-0">
        <p className={ok ? "text-ion-1" : "text-ion-2"}>{label}</p>
        <p className="text-label text-ion-3">{detail}</p>
      </div>
    </div>
  );
}
