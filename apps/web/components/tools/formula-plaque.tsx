/**
 * FormulaPlaque — the "math you can read" plaque shown next to every
 * calculator result. Purely presentational, server-safe (no hooks), reused
 * across all /tools pages so every calculator states its formula in the
 * same plain-mono style.
 */

export interface FormulaPlaqueProps {
  readonly formula: string;
  readonly label?: string;
  readonly className?: string;
}

export function FormulaPlaque({ formula, label = "The math", className = "" }: FormulaPlaqueProps): JSX.Element {
  return (
    <div className={`rounded-lg border border-mineral bg-carbon/60 px-4 py-3 ${className}`}>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">{label}</p>
      <p
        data-testid="formula-plaque"
        className="mt-1.5 whitespace-pre-wrap break-words font-mono text-sm leading-6 tabular-nums text-orbital-cyan"
      >
        {formula}
      </p>
    </div>
  );
}
