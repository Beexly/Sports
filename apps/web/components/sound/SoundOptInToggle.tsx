"use client";

import * as React from "react";
import {
  isSoundOptedIn,
  setSoundOptIn,
  playAmbient,
} from "@/lib/sound/ambient-sound";

export interface SoundOptInToggleProps {
  readonly className?: string;
}

export function SoundOptInToggle({ className }: SoundOptInToggleProps): JSX.Element {
  const [optedIn, setOptedIn] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setOptedIn(isSoundOptedIn());
  }, []);

  function toggle(): void {
    const next = !optedIn;
    setOptedIn(next);
    setSoundOptIn(next);
    if (next) void playAmbient("data-tick");
  }

  if (!mounted) {
    return <></>;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={optedIn}
      className={[
        "inline-flex items-center gap-2 rounded border border-mineral bg-gray-900/60 px-3 py-1.5 transition-colors hover:border-gray-600",
        className ?? "",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-2 w-2 rounded-full",
          optedIn ? "bg-emerald-400" : "bg-gray-600",
        ].join(" ")}
        aria-hidden="true"
      />
      <span className="font-mono text-[9px] uppercase tracking-widest text-gray-300">
        Ambient sound: {optedIn ? "on" : "off"}
      </span>
    </button>
  );
}
