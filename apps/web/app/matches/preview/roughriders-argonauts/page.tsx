/**
 * /matches/preview/roughriders-argonauts — CFL proof slice (upcoming, Argonauts @ Roughriders).
 * Fixture-only Event Genome. See components/matches/event-genome-page.tsx.
 */

import type { Metadata } from "next";
import { EventGenomePage, genomeMetadata } from "@/components/matches/event-genome-page";

export const metadata: Metadata = genomeMetadata("roughriders-argonauts");

export default function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  return <EventGenomePage slug="roughriders-argonauts" searchParams={searchParams} />;
}
