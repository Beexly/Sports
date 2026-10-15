import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProgramReviewView } from "./program-view";

export const metadata: Metadata = {
  title: "Program Review — Internal",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * /ops/program — the owner's review surface for the engine program:
 * the frozen book, the ratified forward program, tonight's packet,
 * ingestion depth, the Layer-2 reasoning layer, and gate state.
 *
 * Renders ONLY the committed record in lib/program-review/program-data.ts.
 * No live feed is wired into this page yet, so nothing here is fetched,
 * computed, or emitted at render time — and the standing banner states
 * the emission state plainly: ZERO_OBJECT, RVC NOT_CLEARED.
 */
export default async function ProgramReviewPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }
  return <ProgramReviewView />;
}
