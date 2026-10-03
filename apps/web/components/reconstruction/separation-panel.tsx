import type { ReconstructedSeparationSurface } from "@/lib/reconstruction/separation-surface";

/**
 * Renders the reconstructed-separation surface: de-noised receiver separation
 * tendencies with honest intervals and a RECONSTRUCTED provenance line. Static
 * server render of server-loaded data — no client JS. Never presents a value as
 * measured tracking; the disclosure and the interval carry the honesty.
 */
export function SeparationPanel({ surface }: { surface: ReconstructedSeparationSurface }) {
  return (
    <section className="surface-card p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orbital-cyan">
        Reconstructed · estimated, not measured
      </p>
      <h2 className="mt-2 text-xl font-bold text-white">Receiver separation tendency</h2>

      {!surface.available ? (
        <p className="mt-3 text-sm leading-6 text-ion-1">{surface.note}</p>
      ) : (
        <>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-ion-2">
            De-noised from public Next Gen Stats: a receiver&apos;s thin-sample weekly
            averages are shrunk toward the field, and shown with a 95% interval. This
            is a reconstructed tendency, not measured tracking.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-ion-2">
                  <th className="pb-2 pr-4">Receiver</th>
                  <th className="pb-2 pr-4">Pos</th>
                  <th className="pb-2 pr-4">Tendency (yd)</th>
                  <th className="pb-2 pr-4">95% interval</th>
                  <th className="pb-2">Weeks</th>
                </tr>
              </thead>
              <tbody>
                {surface.players.map((p) => (
                  <tr key={p.gsisId} className="border-t border-titanium/50">
                    <td className="py-2 pr-4 text-ion-white">{p.name}</td>
                    <td className="py-2 pr-4 text-ion-2">{p.position ?? "—"}</td>
                    <td className="py-2 pr-4 font-mono text-ion-white">{p.tendency.toFixed(2)}</td>
                    <td className="py-2 pr-4 font-mono text-ion-2">
                      {p.low.toFixed(2)}–{p.high.toFixed(2)}
                    </td>
                    <td className="py-2 font-mono text-ion-2">{p.weeks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {surface.players[0] && (
            <p className="mt-3 text-[11px] leading-5 text-ion-2">{surface.players[0].disclosure}</p>
          )}
        </>
      )}
    </section>
  );
}
