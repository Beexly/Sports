/**
 * POST /api/dfs/slates/import-dk-csv
 *
 * Imports a DraftKings salary CSV to create a new DfsSlate and its DfsSalaryRows.
 *
 * Accepts:
 *   - multipart/form-data with a "file" field (CSV) plus "name", "slateDate",
 *     "season" (optional), "week" (optional) fields.
 *   - application/json with { csvText, name, slateDate, season?, week? }.
 */

import { NextResponse } from "next/server";
import { parseDkCsv } from "@/lib/dfs/parsers/dk-csv";
import { createSlateFromDkCsv } from "@/lib/dfs/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    let csvText: string | null = null;
    let name: string | null = null;
    let slateDateRaw: string | null = null;
    let seasonRaw: string | null = null;
    let weekRaw: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file && typeof file !== "string" && "text" in file) {
        csvText = await (file as File).text();
      }
      name = form.get("name") as string | null;
      slateDateRaw = form.get("slateDate") as string | null;
      seasonRaw = form.get("season") as string | null;
      weekRaw = form.get("week") as string | null;
    } else {
      const body = (await req.json()) as {
        csvText?: string;
        name?: string;
        slateDate?: string;
        season?: number;
        week?: number;
      };
      csvText = body.csvText ?? null;
      name = body.name ?? null;
      slateDateRaw = body.slateDate ?? null;
      seasonRaw = body.season != null ? String(body.season) : null;
      weekRaw = body.week != null ? String(body.week) : null;
    }

    if (!csvText) {
      return NextResponse.json(
        {
          error:
            "csvText is required. Send multipart/form-data with a 'file' field, " +
            "or JSON with a 'csvText' field.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "name is required." },
        { status: 400 }
      );
    }

    if (!slateDateRaw) {
      return NextResponse.json(
        { error: "slateDate is required (ISO 8601 date string, e.g. 2025-09-07)." },
        { status: 400 }
      );
    }

    const slateDate = new Date(slateDateRaw);
    if (isNaN(slateDate.getTime())) {
      return NextResponse.json(
        { error: `Invalid slateDate: "${slateDateRaw}". Provide an ISO 8601 date.` },
        { status: 400 }
      );
    }

    const season = seasonRaw ? parseInt(seasonRaw, 10) : undefined;
    const week = weekRaw ? parseInt(weekRaw, 10) : undefined;

    let rows;
    try {
      rows = parseDkCsv(csvText);
    } catch (parseErr) {
      return NextResponse.json(
        { error: `CSV parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}` },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV contained no valid player rows." },
        { status: 400 }
      );
    }

    const result = await createSlateFromDkCsv(rows, { name, season, week, slateDate });

    return NextResponse.json({
      slateId: result.slateId,
      rowCount: result.rowCount,
      slateDate: slateDate.toISOString(),
      name,
    });
  } catch (err) {
    console.error("[POST /api/dfs/slates/import-dk-csv]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
