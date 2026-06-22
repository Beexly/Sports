/**
 * GET /api/dfs/projections/template
 * Returns a downloadable CSV template for the GSE projection upload format.
 */

import { projectionCsvTemplate } from "@/lib/dfs/parsers/projection-csv";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const csv = projectionCsvTemplate();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="gse-projections-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
