import { scanMediaClaimText } from "@/lib/media-revenue/claim-safety";

export interface CommercialCopyScan {
  readonly ok: boolean;
  readonly blockedTerms: readonly string[];
  readonly evidenceRequiredTerms: readonly string[];
  readonly warnings: readonly string[];
}

export function scanCommercialCopy(text: string): CommercialCopyScan {
  const mediaScan = scanMediaClaimText(text);
  return {
    blockedTerms: mediaScan.blockedHits,
    evidenceRequiredTerms: mediaScan.evidenceRequiredHits,
    ok: mediaScan.ok && mediaScan.evidenceRequiredHits.length === 0,
    warnings: mediaScan.warnings,
  };
}

export function assertCommercialCopySafe(text: string): void {
  const scan = scanCommercialCopy(text);
  if (!scan.ok) {
    throw new Error(`Unsafe commercial copy: ${[...scan.blockedTerms, ...scan.evidenceRequiredTerms].join(", ")}`);
  }
}
