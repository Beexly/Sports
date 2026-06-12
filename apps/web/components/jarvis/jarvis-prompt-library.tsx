import type { PromptTemplate, PromptType } from "@/lib/jarvis/prompt-library";

/**
 * Jarvis Prompt Library — registered templates grouped by type.
 * Code-backed, deterministic; the owner launches sessions from these.
 */

export function JarvisPromptLibrary({ prompts }: { prompts: readonly PromptTemplate[] }) {
  const byType = new Map<PromptType, PromptTemplate[]>();
  for (const p of prompts) {
    const list = byType.get(p.type) ?? [];
    list.push(p);
    byType.set(p.type, list);
  }

  return (
    <section
      data-testid="jarvis-prompt-library"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Prompt Library
        </h2>
        <span className="rounded border border-green-900/60 bg-green-900/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-green-400">
          {prompts.length} templates · code-backed
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {Array.from(byType.entries()).map(([type, list]) => (
          <div key={type}>
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {type.replace(/_/g, " ")}
            </p>
            <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
              {list.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] font-bold text-slate-200">{p.id}</p>
                    <span className="text-[8px] font-bold uppercase text-blue-400">
                      {p.modelRecommendation} · {p.tokenBudget}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{p.purpose}</p>
                  <p className="mt-0.5 text-[9px] text-slate-600">
                    Boundary: {p.approvalBoundary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
