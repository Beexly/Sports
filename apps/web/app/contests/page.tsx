import { redirect } from "next/navigation";

/**
 * Canonical contest bay lives under /fantasy/contests (practice paper slate).
 * Bare /contests was 404 in production — redirect so ops/docs links work.
 */
export default function ContestsAliasPage() {
  redirect("/fantasy/contests");
}
