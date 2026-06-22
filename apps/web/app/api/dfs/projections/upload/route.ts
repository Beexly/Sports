/**
 * POST /api/dfs/projections/upload
 *
 * Uploads a projection CSV for a slate, creating a DfsProjectionSet and
 * associated DfsPlayerProjection records.
 *
 * Body (JSON):
 *   { slateId, csvText, sourceName?, modelVersion?, isDefault? }
 */

import { NextResponse } from "next/server";
import { parseProjectionCsv } from "@/lib/dfs/parsers/projection-csv";
import { createProjectionSet, getSlate } from "@/lib/dfs/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      slateId?: string;
      csvText?: string;
      sourceName?: string;
      modelVersion?: string;
      isDefault?: boolean;
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

    let projections;
    try {
      projections = parseProjectionCsv(body.csvText);
    } catch (parseErr) {
      return NextResponse.json(
        {
          error: `CSV parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        },
        { status: 400 }
      );
    }

    if (projections.length === 0) {
      return NextResponse.json(
        { error: "CSV contained no valid projection rows." },
        { status: 400 }
      );
    }

    const result = await createProjectionSet(body.slateId, projections, {
      sourceType: "USER_UPLOAD",
      sourceName: body.sourceName,
      modelVersion: body.modelVersion,
      isDefault: body.isDefault ?? false,
      isUserUpload: true,
      isModeled: false,
    });

    return NextResponse.json({
      projectionSetId: result.projectionSetId,
      count: result.count,
    });
  } catch (err) {
    console.error("[POST /api/dfs/projections/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
