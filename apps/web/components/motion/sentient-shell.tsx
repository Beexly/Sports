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

import { useState } from "react";
import { GhostJarvis } from "./ghost-jarvis";
import { DreamSequence } from "./dream-sequence";
import { GlitchTruth } from "./glitch-truth";
import { ThermalVision } from "./thermal-vision";

export function SentientShell() {
  const [thermalActive, setThermalActive] = useState(false);

  // Glitch truth infers its own state from environment
  // In a real implementation this would read from a global store
  // For now, we show subtle glitch occasionally as ambient texture
  const [glitchTrigger] = useState(() => Math.random() < 0.15);
  const glitchLevel = glitchTrigger ? 0.15 : 0;

  return (
    <>
      <GhostJarvis />
      <DreamSequence />
      <GlitchTruth trigger={glitchTrigger} level={glitchLevel} />
      <ThermalVision active={thermalActive} onToggle={setThermalActive} />
    </>
  );
}
