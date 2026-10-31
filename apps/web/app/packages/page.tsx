import type { Metadata } from "next";
import { RedlineWorld } from "@/components/redline/redline-world";
import { orderPacksForStorefront, upcomingOnly } from "@/components/packages/storefront-order";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { getActiveUpcomingWriteups } from "@/lib/writeups/coach-writeup-engine";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "NFL Betting Packs | Galaxy Sports Edge",
  description: "Compare this week's NFL packs and unlock official picks in place after checkout.",
};

export default function PackagesPage(): JSX.Element {
  const packs = orderPacksForStorefront(LIVE_PACKAGE_CATALOG);
  const writeups = upcomingOnly(getActiveUpcomingWriteups());
  return <RedlineWorld packs={packs} writeups={writeups} initialStage={2} initialPanel="packs" />;
}
