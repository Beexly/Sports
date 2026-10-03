import type { OddsFormat } from "@/lib/tools/betting-math";

/**
 * OddsFormatToggle — the American/decimal switch every /tools calculator's
 * odds input shares. Purely presentational: takes the current format and a
 * setter, renders two buttons. No hooks of its own, so it needs no "use
 * client" directive — it is always mounted inside an already-client parent.
 */

export interface OddsFormatToggleProps {
  readonly format: OddsFormat;
  readonly onChange: (format: OddsFormat) => void;
  readonly className?: string;
}

const OPTIONS: ReadonlyArray<{ value: OddsFormat; label: string }> = [
  { value: "american", label: "American" },
  { value: "decimal", label: "Decimal" },
];

export function OddsFormatToggle({ format, onChange, className = "" }: OddsFormatToggleProps): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label="Odds format"
      className={`inline-flex rounded-lg border border-mineral bg-eclipse/60 p-1 ${className}`}
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === format;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              active ? "bg-orbital-cyan text-ion-blue-ink" : "text-ion-1 hover:text-ion-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
