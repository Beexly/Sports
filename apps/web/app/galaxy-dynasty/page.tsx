import type { Metadata } from "next";
import { GalaxyDynastyCityClient } from "@/components/galaxy-dynasty/galaxy-dynasty-city-client";

export const metadata: Metadata = {
  title: "Galaxy Dynasty City Prototype",
  description:
    "An IP-safe GTA-inspired Galaxy Dynasty vertical slice with third-person movement, city dressing, RuneScape-readable hub paths, minimap, and Beat/Blacktop route anchors.",
};

export default function GalaxyDynastyPage() {
  return <GalaxyDynastyCityClient />;
}
