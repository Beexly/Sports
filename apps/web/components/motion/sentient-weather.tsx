"use client";

/**
 * SentientWeather — The interface feels the market.
 *
 * A background atmosphere layer that reads the live board state and
 * translates it into environmental conditions:
 *  - High volatility → stormy magenta lightning, turbulent filaments
 *  - Strong consensus → calm cyan aurora, steady pulse
 *  - Data stale → gray haze, slow drift
 *  - Gate active → ultraviolet fog, held breath
 *
 * Pure CSS animations driven by React props. No canvas, cheap to run.
 */

export type WeatherState = "calm" | "active" | "volatile" | "stale" | "gated";

export function SentientWeather({
  state = "calm",
  intensity = 0.5,
}: {
  state?: WeatherState;
  intensity?: number;
}) {
  const weatherStyles: Record<WeatherState, React.CSSProperties> = {
    calm: {
      background:
        "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,229,255,0.06) 0%, transparent 60%), " +
        "radial-gradient(ellipse 60% 50% at 20% 80%, rgba(123,97,255,0.04) 0%, transparent 55%), " +
        "linear-gradient(180deg, #05070B 0%, #080a12 100%)",
    },
    active: {
      background:
        "radial-gradient(ellipse 70% 50% at 60% 25%, rgba(0,229,255,0.10) 0%, transparent 55%), " +
        "radial-gradient(ellipse 50% 40% at 30% 70%, rgba(123,97,255,0.08) 0%, transparent 50%), " +
        "linear-gradient(180deg, #05070B 0%, #0a0c14 100%)",
    },
    volatile: {
      background:
        "radial-gradient(ellipse 60% 45% at 70% 20%, rgba(255,56,199,0.12) 0%, transparent 50%), " +
        "radial-gradient(ellipse 50% 35% at 25% 75%, rgba(0,229,255,0.06) 0%, transparent 45%), " +
        "linear-gradient(180deg, #05070B 0%, #120810 100%)",
    },
    stale: {
      background:
        "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(100,100,120,0.05) 0%, transparent 60%), " +
        "linear-gradient(180deg, #05070B 0%, #060608 100%)",
    },
    gated: {
      background:
        "radial-gradient(ellipse 65% 50% at 50% 35%, rgba(123,97,255,0.10) 0%, transparent 55%), " +
        "radial-gradient(ellipse 45% 40% at 80% 80%, rgba(255,56,199,0.06) 0%, transparent 50%), " +
        "linear-gradient(180deg, #05070B 0%, #0c0a18 100%)",
    },
  };

  const lightningOpacity = state === "volatile" ? intensity * 0.3 : 0;
  const pulseSpeed = state === "calm" ? "8s" : state === "active" ? "4s" : "2s";

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 transition-all duration-[2000ms]">
      {/* Base atmosphere */}
      <div
        className="absolute inset-0 transition-all duration-[2000ms]"
        style={weatherStyles[state]}
      />

      {/* Lightning flicker for volatile state */}
      {state === "volatile" && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 30% 20% at 70% 30%, rgba(255,56,199,0.15), transparent)",
            animation: `sentient-lightning 3s steps(1) infinite`,
            opacity: lightningOpacity,
          }}
        />
      )}

      {/* Breathing pulse overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,229,255,0.02), transparent)",
          animation: `sentient-breathe ${pulseSpeed} ease-in-out infinite`,
        }}
      />

      {/* Static noise for stale state */}
      {state === "stale" && (
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />
      )}
    </div>
  );
}
