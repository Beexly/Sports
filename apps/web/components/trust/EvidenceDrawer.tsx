import type { ReactNode } from "react";

interface Props {
  label?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Disclosure-only evidence drawer. Uses <details>/<summary> — no JS state.
 * Accessible via keyboard. respects prefers-reduced-motion natively.
 */
export function EvidenceDrawer({ label = "Evidence chain", children, className = "" }: Props) {
  return (
    <details
      className={["group", className].join(" ")}
    >
      <summary
        className="cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 rounded"
        aria-label={label}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500 hover:text-gray-300 transition-colors">
            {label}
          </span>
          <svg
            aria-hidden="true"
            className="h-2.5 w-2.5 text-gray-600 transition-transform group-open:rotate-90"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 2l4 3-4 3" />
          </svg>
        </span>
      </summary>
      <div className="mt-2 pl-1">
        {children}
      </div>
    </details>
  );
}
