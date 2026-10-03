/**
 * Sportsbook/DFS affiliate-free pledge (F-6 / H-F2).
 *
 * Machine-readable posture only. Does not import or modify the
 * affiliate-structural-separation guardrail.
 */

export const AFFILIATE_FREE_PLEDGE = {
  pledged: true,
  category: "sportsbook_dfs_affiliate",
  since: "2026-08-20",
  enforcement:
    "guardrail affiliate-structural-separation runs on every commit",
} as const;

export const PLEDGE_STATEMENT =
  "Galaxy Sports Edge does not carry sportsbook or DFS affiliate or commission links, and never will — published 2026-08-20";

export const PLEDGE_WHY =
  "A company paid when its users lose cannot credibly claim unbiased picks.";

export const PLEDGE_VIOLATION =
  "any violation will be published on this page within 24 hours";
