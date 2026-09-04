"use client";

/**
 * SentientShell — The living interface layer.
 *
 * Wraps the entire application with ambient sentient systems:
 *  - GhostJarvis: occasional machine thoughts
 *  - DreamSequence: idle-mode generative visuals
 *  - GlitchTruth: electromagnetic interference when data is uncertain
 *  - ThermalVision: heatmap toggle for conviction
 *
 * All state is self-contained. No props needed from server.
 */

import { useEffect, useState } from "react";
import { GhostJarvis } from "./ghost-jarvis";
import { DreamSequence } from "./dream-sequence";
import { GlitchTruth } from "./glitch-truth";
import { ThermalVision, shouldMountThermalVision } from "./thermal-vision";

export function SentientShell() {
  const [thermalActive, setThermalActive] = useState(false);

  // Subtle glitch as ambient texture, shown occasionally. The random roll runs
  // CLIENT-SIDE ONLY (after mount) so SSR and first client render always agree
  // — rolling it during render caused a global hydration mismatch (~15% of loads
  // flipped the GlitchTruth overlay between rendered and null).
  const [glitchTrigger, setGlitchTrigger] = useState(false);
  useEffect(() => {
    setGlitchTrigger(Math.random() < 0.15);
  }, []);
  const glitchLevel = glitchTrigger ? 0.15 : 0;

  return (
    <>
      <GhostJarvis />
      <DreamSequence />
      <GlitchTruth trigger={glitchTrigger} level={glitchLevel} />
      {/* Dev-only: the data-thermal binding the heatmap needs does not exist
          yet, so in production this would only be a floating debug-style pill
          over the bottom-left of every page. See shouldMountThermalVision(). */}
      {shouldMountThermalVision() ? (
        <ThermalVision active={thermalActive} onToggle={setThermalActive} />
      ) : null}
    </>
  );
}
