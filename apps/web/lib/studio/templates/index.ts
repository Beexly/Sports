/**
 * Galaxy Studio templates.
 *
 * All 8 Phase 3 templates ship. Each template enforces its own voice rules
 * via the compliance scanner override pattern.
 *
 * Spec: docs/product/galaxy-studio-spec.md
 */

import { fanExplainerTemplate } from "./fan-explainer";
import { bettingEducationTemplate } from "./betting-education";
import { xThreadTemplate } from "./x-thread";
import { sponsorSafeTemplate } from "./sponsor-safe";
import { fantasyAngleTemplate } from "./fantasy-angle";
import { tiktokReelsScriptTemplate } from "./tiktok-reels-script";
import { newsletterBlockTemplate } from "./newsletter-block";
import { youtubeTitlesTemplate } from "./youtube-titles";

import type { StudioTemplate } from "./types";

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  fanExplainerTemplate,
  bettingEducationTemplate,
  xThreadTemplate,
  sponsorSafeTemplate,
  fantasyAngleTemplate,
  tiktokReelsScriptTemplate,
  newsletterBlockTemplate,
  youtubeTitlesTemplate,
];

export {
  fanExplainerTemplate,
  bettingEducationTemplate,
  xThreadTemplate,
  sponsorSafeTemplate,
  fantasyAngleTemplate,
  tiktokReelsScriptTemplate,
  newsletterBlockTemplate,
  youtubeTitlesTemplate,
};

export type {
  StudioTemplate,
  CreatorAssetKind,
  VoiceTone,
  ComplianceRule,
  GenerationContext,
  ClaudePrompt,
} from "./types";
