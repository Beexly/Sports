import { redirect, notFound } from "next/navigation";
import { isContestsPublic } from "@/lib/launch/public-surface-gate";

/**
 * Canonical contest bay lives under /fantasy/contests (practice paper slate).
 * Bare /contests was 404 in production — redirect so ops/docs links work.
 * When Contest Bay is dark, stay 404 (do not leak the surface via alias).
 */
export default function ContestsAliasPage() {
  if (!isContestsPublic()) notFound();
  redirect("/fantasy/contests");
}
