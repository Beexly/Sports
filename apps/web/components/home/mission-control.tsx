const LANES = [
  {
    label: "Board",
    status: "Live",
    tone: "cyan",
    title: "Prices first",
    body: "Odds, book count, freshness, and line movement are the only live inputs allowed to move confidence today.",
  },
  {
    label: "Schedule",
    status: "Live",
    tone: "cyan",
    title: "Rest has weight",
    body: "Back-to-backs, rest gaps, and schedule density are measured because they come from settled game logs.",
  },
  {
    label: "Players",
    status: "Shadow",
    tone: "violet",
    title: "Not priced yet",
    body: "Lineups, injuries, starters, goalies, and usage stay visible as blocked evidence until a licensed feed is configured.",
  },
  {
    label: "Officials",
    status: "Shadow",
    tone: "violet",
    title: "Tracked, not trusted",
    body: "Referee and umpire tendencies can matter. They do not affect picks until source quality and sample size pass review.",
  },
  {
    label: "Venue",
    status: "Shadow",
    tone: "violet",
    title: "Park, dome, field",
    body: "Weather, roof, surface, altitude, and park effects are planned evidence, not assumed context.",
  },
  {
    label: "EV",
    status: "Locked",
    tone: "magenta",
    title: "Independent or nothing",
    body: "True EV remains unavailable until the engine has a source-backed fair probability separate from the market.",
  },
] as const;

export function MissionControl() {
  return (
    <section
      className="section"
      aria-labelledby="mission-control-title"
      style={{
        background:
          "linear-gradient(180deg, rgba(0,229,255,0.035), rgba(5,6,8,0.95) 42%, rgba(122,92,255,0.04))",
      }}
    >
      <div className="container">
        <div className="section-head">
          <div>
            <p className="section-eyebrow">Today&apos;s Board</p>
            <h2 id="mission-control-title">
              The smartest move is sometimes <em>no move.</em>
            </h2>
          </div>
          <div className="meta">
            Evidence first
            <br />
            Confidence second
          </div>
        </div>

        <div className="mission-control-grid">
          <div className="mission-core" aria-label="Signal decision sequence">
            <div className="mission-core-top">
              <span className="mission-kicker">Current posture</span>
              <strong>Live odds engine + shadow context graph</strong>
            </div>
            <div className="mission-flow" aria-hidden="true">
              <span>Read</span>
              <i />
              <span>Check</span>
              <i />
              <span>Price</span>
              <i />
              <span>Gate</span>
            </div>
            <p>
              Galaxy Sports Edge scores what it can prove. Missing player,
              official, venue, pace, and milestone feeds are not guessed; they
              are marked shadow-only until real evidence arrives.
            </p>
            <div className="mission-verdict">
              <span>Verdict rule</span>
              <strong>If the evidence is thin, we don&apos;t post.</strong>
            </div>
          </div>

          <div className="mission-lanes">
            {LANES.map((lane) => (
              <article key={lane.label} className={`mission-lane mission-lane-${lane.tone}`}>
                <div className="mission-lane-head">
                  <span>{lane.label}</span>
                  <b>{lane.status}</b>
                </div>
                <h3>{lane.title}</h3>
                <p>{lane.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
