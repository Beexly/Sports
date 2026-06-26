/**
 * /matches/preview/ecuador-germany — soccer proof slice (Ecuador 2–1 Germany).
 * Fixture-only Event Genome. See components/matches/event-genome-page.tsx.
 */

import type { Metadata } from "next";
import { EventGenomePage, genomeMetadata } from "@/components/matches/event-genome-page";

export const metadata: Metadata = genomeMetadata("ecuador-germany");

export default function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  return <EventGenomePage slug="ecuador-germany" searchParams={searchParams} />;
}
