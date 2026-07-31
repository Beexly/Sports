"use client";

/**
 * Microsoft Clarity bootstrap (official @microsoft/clarity).
 *
 * Loaded only when OP-004 gating says both the master analytics flag and
 * NEXT_PUBLIC_CLARITY_PROJECT_ID are present. Replaces the inline snippet so
 * init/event/tag APIs stay on the supported package surface.
 *
 * Privacy (binding):
 * - Never call identify() with email/name/raw PII from this component.
 * - consentV2 is NOT auto-granted here. If the Clarity project requires cookie
 *   consent, wire the banner to Clarity.consentV2 and flip only after grant.
 * - Session replay can capture DOM; keep secrets out of public markup.
 */

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

export function MicrosoftClarity({ projectId }: { projectId: string }) {
  useEffect(() => {
    const id = projectId.trim();
    if (!id) return;
    Clarity.init(id);
  }, [projectId]);

  return null;
}
