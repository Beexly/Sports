/**
 * POST /api/dfs/ownership/upload
 *
 * Uploads an ownership projection CSV for a slate.
 *
 * Body (JSON):
 *   { slateId, csvText }
 */

import { NextResponse } from "next/server";
import { parseOwnershipCsv } from "@/lib/dfs/parsers/ownership-csv";
import { createOwnershipProjections, getSlate } from "@/lib/dfs/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      slateId?: string;
      csvText?: string;
    };

    if (!body.slateId) {
      return NextResponse.json({ error: "slateId is required." }, { status: 400 });
    }

    if (!body.csvText) {
      return NextResponse.json({ error: "csvText is required." }, { status: 400 });
    }

    const slate = await getSlate(body.slateId);
    if (!slate) {
      return NextResponse.json(
        { error: `Slate "${body.slateId}" not found.` },
        { status: 404 }
      );
    }

    let rows;
    try {
      rows = parseOwnershipCsv(body.csvText);
    } catch (parseErr) {
      return NextResponse.json(
        {
          error: `CSV parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV contained no valid ownership rows." },
        { status: 400 }
      );
    }

    const result = await createOwnershipProjections(body.slateId, rows);

    return NextResponse.json({ count: result.count });
  } catch (err) {
    console.error("[POST /api/dfs/ownership/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
