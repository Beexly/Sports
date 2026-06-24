import type { Metadata } from "next";
import { GalaxyShell } from "@/components/galaxy/shell";
import { RookiePlazaClient } from "@/components/galaxy/rookie-plaza-client";
import { getCurrentProfileView } from "@/lib/galaxy/session";
import { getRookiePlazaState } from "@/lib/galaxy/rookie-plaza";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rookie Plaza - Galaxy Dynasty",
  description: "The first playable Galaxy Dynasty town: move, talk, run First Signal, and route into the Campus.",
  alternates: { canonical: "/galaxy/campus/rookie-plaza" },
};

export default async function RookiePlazaPage() {
  const profile = await getCurrentProfileView();
  return (
    <GalaxyShell profile={profile}>
      <RookiePlazaClient initialState={getRookiePlazaState(profile)} />
    </GalaxyShell>
  );
}
