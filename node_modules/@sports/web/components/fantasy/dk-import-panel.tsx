"use client";

/**
 * DkImportPanel — load a real DraftKings salary CSV into the optimizer.
 *
 * Upload the export DK puts on the contest draft page, or paste it. We parse it
 * to real players/salaries/teams and run the optimizer on YOUR slate. Projections
 * and ownership are modeled (the CSV has none) and labelled as such.
 */

import { useRef, useState } from "react";
import { parseDkCsv, validateSlate } from "@/lib/fantasy/dk-import";
import type { DfsPlayer } from "@/lib/fantasy/dfs-slate";

export function DkImportPanel({ onImport, onReset, imported }: { onImport: (players: DfsPlayer[]) => void; onReset: () => void; imported: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string; warnings: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = (raw: string) => {
    const r = parseDkCsv(raw);
    if (r.players.length === 0) {
      setStatus({ ok: false, msg: r.warnings[0] ?? "Could not parse the file.", warnings: [] });
      return;
    }
    const missing = validateSlate(r.players);
    const warn = [...r.warnings];
    if (missing.length) warn.push(`Roster gaps: ${missing.join("; ")}. The optimizer may not fill every slot.`);
    setStatus({ ok: true, msg: `Imported ${r.players.length} players. Projections & ownership are modeled from DK's averages.`, warnings: warn.slice(0, 4) });
    onImport(r.players);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => load(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  return (
    <div className="surface-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm font-semibold text-orbital-cyan">
          {open ? "▾" : "▸"} Import a DraftKings slate (CSV)
        </button>
        {imported && (
          <button type="button" onClick={() => { onReset(); setStatus(null); setText(""); }} className="text-xs text-ion-2 underline hover:text-ion-white">
            reset to sample slate
          </button>
        )}
        <span className="ml-auto font-mono text-[10px] text-ion-2">DK draft page → Export to CSV</span>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} aria-label="Upload DraftKings CSV" className="text-xs text-ion-1 file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-ion-white" />
            <span className="text-[11px] text-ion-2">or paste below</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Paste DraftKings CSV"
            rows={4}
            placeholder="Position,Name + ID,Name,ID,Roster Position,Salary,Game Info,TeamAbbrev,AvgPointsPerGame&#10;QB,..."
            className="w-full rounded-md border border-mineral bg-transparent p-2 font-mono text-[11px] text-ion-1"
          />
          <button type="button" onClick={() => load(text)} disabled={!text.trim()} className="btn btn-primary btn-sm disabled:opacity-40">Load slate</button>

          {/* verify = confirmed import, alert = failed parse — semantic status, never plasma */}
          {status && (
            <div className={`rounded-md border p-3 text-xs ${status.ok ? "border-verify/30" : "border-alert/30"}`}>
              <p className={status.ok ? "text-verify" : "text-alert"}>{status.msg}</p>
              {status.warnings.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-ion-2">
                  {status.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              )}
            </div>
          )}
          <p className="text-[10px] leading-relaxed text-ion-2">
            No login, no scraping. This reads only the CSV you provide. The export carries real players, positions,
            salaries, teams, and DK&apos;s average points; projections, floor/ceiling, and ownership are modeled here and
            replaced when a licensed projection source is wired behind the founder gate.
          </p>
        </div>
      )}
    </div>
  );
}
