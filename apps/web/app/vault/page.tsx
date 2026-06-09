// Retired placeholder — the calibration surface at /performance is the live receipt; this dead page now redirects.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Page(): never {
  redirect("/performance");
}
