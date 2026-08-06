/**
 * ads.txt — honest empty inventory declaration.
 * GSE is not a display-ad network; crawlers should not invent sellers.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const BODY = `# Galaxy Sports Edge does not sell third-party display advertising inventory.
# No authorized digital sellers. Contact: hq@galaxysportsedge.com
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
