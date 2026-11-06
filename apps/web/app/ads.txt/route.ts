/**
 * ads.txt — authorizes Google AdSense (publisher pub-8151105906877749) as the
 * only seller of this site's display inventory. f08c47fec0942fa0 is Google's
 * fixed AdSense certification authority ID.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const BODY = `google.com, pub-8151105906877749, DIRECT, f08c47fec0942fa0
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
