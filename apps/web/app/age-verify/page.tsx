/**
 * D-8 / S3: 21+ attestation interstitial. Server-rendered form, no client JS.
 * Middleware redirects unattested visitors here from any betting surface with
 * ?next=<path>; POSTing sets the cookie (via /api/age-verify) and returns them.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { safeAgeRedirect } from "@/lib/age-verify/surface";

export const metadata: Metadata = {
  title: "Age Check — 21+",
  robots: { index: false, follow: false },
};

export default function AgeVerifyPage({
  searchParams,
}: {
  searchParams: { next?: string };
}): JSX.Element {
  const next = safeAgeRedirect(searchParams.next);

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-carbon px-4 text-ion"
    >
      <div className="w-full max-w-md rounded-2xl border border-mineral bg-abyss p-8 shadow-2xl shadow-black/60">
        <h1 className="text-2xl font-bold tracking-tight text-ion-white">
          Are you 21 or older?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ion-1">
          Galaxy Sports Edge publishes sports analytics and pick records. You
          must be at least 21 to continue. This is an attestation, not identity
          verification.
        </p>
        <form action="/api/age-verify" method="post" className="mt-6 space-y-3">
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            name="answer"
            value="over"
            className="w-full rounded-ds-md bg-orbital-cyan px-4 py-2.5 font-semibold text-carbon transition hover:opacity-90"
          >
            Yes, I&apos;m 21 or older
          </button>
          <button
            type="submit"
            name="answer"
            value="under"
            className="w-full rounded-ds-md border border-mineral px-4 py-2.5 text-sm text-ion-1 transition hover:border-ion-2"
          >
            No, I&apos;m under 21
          </button>
        </form>
        <p className="mt-6 text-xs leading-relaxed text-ion-2">
          If you have questions about gambling, see{" "}
          <Link href="/responsible-play" className="underline">
            responsible play
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
