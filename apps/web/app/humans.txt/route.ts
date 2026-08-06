/**
 * humans.txt — brand-human layer browsers and curious operators still hit.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const BODY = `/* TEAM */
Site: Galaxy Sports Edge (GSE)
Org: Galaxy Sports Network / Beexly
Contact: hq@galaxysportsedge.com
Location: The Woodlands, Texas area · remote-first product

/* SITE */
Standards: publish-before-kickoff · CLV-backed proof · honesty gates
Law: finish · dark · or refuse the write
Doctrine: We detect. You decide.
Stack: free-first data · Jynx credit routing · durable Postgres on public writes

/* THANKS */
Operators who refuse hype and verify receipts.
`;

export function GET(): NextResponse {
  return new NextResponse(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
