import { scanMediaClaimText } from "./claim-safety";

export interface SeoPack {
  readonly title: string;
  readonly alternateTitles: readonly string[];
  readonly description: string;
  readonly tags: readonly string[];
  readonly thumbnailText: string;
  readonly pinnedComment: string;
  readonly cta: string;
  readonly disclosure?: string;
}

export interface SeoPackValidation {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export function validateSeoPack(pack: SeoPack): SeoPackValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (pack.title.trim().length === 0) errors.push("Title is required.");
  if (pack.description.trim().length === 0) errors.push("Description is required.");
  if (pack.thumbnailText.trim().split(/\s+/).filter(Boolean).length > 5) {
    warnings.push("Thumbnail text should stay at five words or fewer.");
  }
  const claimScan = scanMediaClaimText([pack.title, pack.description, pack.thumbnailText, pack.pinnedComment, pack.cta].join("\n"));
  for (const hit of claimScan.blockedHits) errors.push(`Blocked claim phrase: ${hit}`);
  warnings.push(...claimScan.warnings);
  if (claimScan.evidenceRequiredHits.length > 0) warnings.push(`Evidence required: ${claimScan.evidenceRequiredHits.join(", ")}`);
  const sponsorContext = /sponsor|affiliate|paid promotion/i.test([pack.title, pack.description, pack.pinnedComment, pack.cta].join(" "));
  if (sponsorContext && !pack.disclosure?.trim()) errors.push("Disclosure is required for affiliate or sponsor content.");
  return { errors, ok: errors.length === 0, warnings };
}
