/**
 * RFC 9116 security.txt — under-leveraged trust surface for a frontier product.
 * No vulnerability theater; clear contact + policy links only.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 86400;

const BODY = `# Galaxy Sports Edge — security contact
Contact: mailto:hq@galaxysportsedge.com
Preferred-Languages: en
Canonical: https://www.galaxysportsedge.com/.well-known/security.txt
Policy: https://www.galaxysportsedge.com/responsible-play
Hiring: https://www.galaxysportsedge.com/about
Expires: 2027-08-06T00:00:00.000Z
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
