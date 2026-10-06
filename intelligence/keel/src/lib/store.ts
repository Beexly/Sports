import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LaneYield } from "@/lib/learn";
import { observeLexicon, type Lexicon } from "@/lib/memory";
import { SHELF } from "@/lib/shelf";
import type { Finding, Recount, SealCheck } from "@/lib/types";

function seedLexicon() {
  return SHELF.reduce<Lexicon>((lex, row) => observeLexicon(lex, row.lane, [row]), {});
}

type KeelState = {
  findings: Finding[];
  laneIndex: number;
  watch: boolean;
  intervalMin: number;
  lastShiftAt: string | null;
  lastShiftNote: string | null;
  seal: SealCheck | null;
  recount: Recount | null;
  busy: boolean;
  yields: Record<string, LaneYield>;
  shiftsRun: number;
  lexicon: Lexicon;
  addFindings: (rows: Finding[]) => void;
  setWatch: (watch: boolean) => void;
  setIntervalMin: (intervalMin: number) => void;
  bumpLane: () => void;
  noteShift: (note: string) => void;
  noteYield: (laneId: string, admits: number, holds: number, rejects: number) => void;
  setSeal: (seal: SealCheck) => void;
  setRecount: (recount: Recount) => void;
  setBusy: (busy: boolean) => void;
  setLexicon: (lexicon: Lexicon) => void;
};

export const useKeel = create<KeelState>()(
  persist(
    (set, get) => ({
      findings: [],
      laneIndex: 0,
      watch: true,
      intervalMin: 10,
      lastShiftAt: null,
      lastShiftNote: null,
      seal: null,
      recount: null,
      busy: false,
      yields: {},
      shiftsRun: 0,
      lexicon: seedLexicon(),
      addFindings: (rows) => {
        const seen = new Set(get().findings.map((f) => f.url));
        const fresh = rows.filter((r) => r.url && !seen.has(r.url));
        set({ findings: [...fresh, ...get().findings].slice(0, 180) });
      },
      setWatch: (watch) => set({ watch }),
      setIntervalMin: (intervalMin) => set({ intervalMin }),
      bumpLane: () => set({ laneIndex: get().laneIndex + 1 }),
      noteShift: (note) => set({ lastShiftAt: new Date().toISOString(), lastShiftNote: note }),
      noteYield: (laneId, admits, holds, rejects) => {
        const prev = get().yields[laneId] ?? { pulls: 0, admits: 0, holds: 0, rejects: 0 };
        set({
          shiftsRun: get().shiftsRun + 1,
          yields: {
            ...get().yields,
            [laneId]: {
              pulls: prev.pulls + 1,
              admits: prev.admits + admits,
              holds: prev.holds + holds,
              rejects: prev.rejects + rejects,
            },
          },
        });
      },
      setSeal: (seal) => set({ seal }),
      setRecount: (recount) => set({ recount }),
      setBusy: (busy) => set({ busy }),
      setLexicon: (lexicon) => set({ lexicon }),
    }),
    {
      name: "keel-ledger-v3",
      skipHydration: true,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<KeelState>;
        return {
          ...current,
          ...saved,
          lexicon: saved.lexicon && Object.keys(saved.lexicon).length ? saved.lexicon : current.lexicon,
          busy: false,
        };
      },
      partialize: (s) => ({
        findings: s.findings,
        laneIndex: s.laneIndex,
        watch: s.watch,
        intervalMin: s.intervalMin,
        lastShiftAt: s.lastShiftAt,
        lastShiftNote: s.lastShiftNote,
        seal: s.seal,
        recount: s.recount,
        yields: s.yields,
        shiftsRun: s.shiftsRun,
        lexicon: s.lexicon,
      }),
    },
  ),
);
