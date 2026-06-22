/**
 * GET /api/dfs/ownership/template
 * Returns a downloadable CSV template for the GSE ownership upload format.
 */

import { ownershipCsvTemplate } from "@/lib/dfs/parsers/ownership-csv";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const csv = ownershipCsvTemplate();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="gse-ownership-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
