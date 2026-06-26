/**
 * /matches/preview/rays-royals — MLB proof slice (Rays 13–2 Royals).
 * Fixture-only Event Genome. See components/matches/event-genome-page.tsx.
 */

import type { Metadata } from "next";
import { EventGenomePage, genomeMetadata } from "@/components/matches/event-genome-page";

export const metadata: Metadata = genomeMetadata("rays-royals");

export default function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  return <EventGenomePage slug="rays-royals" searchParams={searchParams} />;
}
