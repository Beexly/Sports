import type { Metadata } from "next";
import { RedlineWorld } from "@/components/redline/redline-world";
import { orderPacksForStorefront, upcomingOnly } from "@/components/packages/storefront-order";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { getActiveUpcomingWriteups } from "@/lib/writeups/coach-writeup-engine";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Galaxy Sports Edge | NFL Picks, Player Props & Parlays",
  description: "Plain-English NFL picks, player props and parlays. See the field, choose your pack, and unlock the official slate.",
};

export default function HomePage(): JSX.Element {
  const packs = orderPacksForStorefront(LIVE_PACKAGE_CATALOG);
  const writeups = upcomingOnly(getActiveUpcomingWriteups());
  return <RedlineWorld packs={packs} writeups={writeups} />;
}
