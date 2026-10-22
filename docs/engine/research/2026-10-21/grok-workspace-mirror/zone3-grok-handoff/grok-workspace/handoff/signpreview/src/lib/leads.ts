export type Lead = {
  id: string;
  product: "signpreview" | "seating" | "quote" | "vow" | "kit";
  name: string;
  business: string;
  email: string;
  at: string;
  meta?: Record<string, string>;
};

const KEY = "beexly-leads-v1";

export function listLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Lead[]) : [];
  } catch {
    return [];
  }
}

export function saveLead(partial: Omit<Lead, "id" | "at">): Lead {
  const lead: Lead = {
    ...partial,
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
  };
  const next = [lead, ...listLeads()].slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(next));
  return lead;
}

export function leadsCsv(rows = listLeads()): string {
  const header = "id,product,name,business,email,at,meta";
  const body = rows.map((r) =>
    [r.id, r.product, r.name, r.business, r.email, r.at, JSON.stringify(r.meta ?? {})]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header, ...body].join("\n");
}
