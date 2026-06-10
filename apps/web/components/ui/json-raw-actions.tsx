"use client";

/**
 * JsonRawActions — the quiet, SECONDARY escape hatch for the raw payload.
 *
 * The {@link JsonHumanizer} renders an API/JSON-looking payload as a readable
 * table/card. The raw JSON itself is never the hero: it is demoted to this
 * small client affordance — a neutral "Copy raw JSON" pill and a "Download
 * .json" pill, both rendered as ghost/secondary actions, never a CTA.
 *
 * Ported from canonical (Sports-canonical-2026-06-03). Delta from canonical:
 * the shared ButtonSecondary kit component does not exist in this clone, so
 * the same neutral surface-pill markup is inlined here verbatim
 * (rounded-full border-surface-line bg-surface-raised) to stay drop-in
 * compatible when the kit lands.
 *
 * DELIBERATELY not a pretty-printed dump rendered into a preformatted block.
 * The payload is serialized lazily (on click) into the clipboard / a Blob
 * download, so the raw blob is available on demand without ever being rendered
 * into the DOM as a wall of JSON.
 *
 * Token-only (surface-*, ion-*). Client component: it ships the two click
 * handlers and a transient "Copied" confirmation. Server callers pass the
 * already-resolved data object; this component never fetches.
 */

import { useCallback, useRef, useState, type ReactNode } from "react";

export interface JsonRawActionsProps {
  /** The exact payload to expose — rendered to JSON only on demand. */
  data: unknown;
  /** Suggested download filename (without extension). Defaults to "data". */
  filename?: string;
  /** Optional className merged onto the actions row wrapper. */
  className?: string;
}

function serialize(data: unknown): string {
  try {
    // Pretty-print for the on-demand copy/download artifact only — this string
    // is handed to the clipboard / a Blob, never rendered into the DOM.
    return JSON.stringify(data, null, 2);
  } catch {
    // Circular or non-serializable payload — fail honestly, never fabricate.
    return "";
  }
}

/** Neutral surface pill — byte-compatible with the canonical kit's secondary tone. */
function RawActionPill({
  children,
  onClick,
  ariaLabel,
  testId,
}: {
  children: ReactNode;
  onClick: () => void;
  ariaLabel: string;
  testId: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={testId}
      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-surface-line bg-surface-raised px-3 py-1 text-[11px] font-medium tracking-wide text-ion-2 transition hover:border-surface-line-strong hover:text-ion-white"
    >
      {children}
    </button>
  );
}

export function JsonRawActions({
  data,
  filename = "data",
  className = "",
}: JsonRawActionsProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCopy = useCallback(async () => {
    const text = serialize(data);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure context / permission) — leave the label
      // unchanged rather than asserting a success that did not happen.
      setCopied(false);
    }
  }, [data]);

  const onDownload = useCallback(() => {
    const text = serialize(data);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [data, filename]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <RawActionPill
        onClick={() => {
          void onCopy();
        }}
        ariaLabel="Copy the raw JSON payload to the clipboard"
        testId="json-copy-raw"
      >
        {copied ? "Copied" : "Copy raw JSON"}
      </RawActionPill>
      <RawActionPill
        onClick={onDownload}
        ariaLabel="Download the raw JSON payload as a .json file"
        testId="json-download-raw"
      >
        Download .json
      </RawActionPill>
    </div>
  );
}
