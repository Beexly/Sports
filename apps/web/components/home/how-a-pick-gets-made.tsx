/**
 * How a pick gets made, in plain words.
 *
 * Owner directive (2026-10-17): explain the decision process the way you
 * would to a friend on the street. Short sentences, everyday words, no
 * internal names. Rendered on the home page and at /how-it-works.
 */

export const HOW_A_PICK_GETS_MADE_STEPS = [
  {
    title: "We look at the lines.",
    body: "What the books are offering, and which way it's moving.",
  },
  {
    title: "We check who's hurt.",
    body: "And who's still on the field. A missing starter changes a game.",
  },
  {
    title: "We size it up.",
    body: "Every pick gets a number for how strong it looks. Higher means stronger.",
  },
  {
    title: "We tell you why.",
    body: "On Pro and Elite, every pick comes with a few plain lines on why. No guessing.",
  },
] as const;

export const HOW_A_PICK_GETS_MADE_CLOSER =
  "It's a signal, not a promise. Strong picks still lose. When the game ends, it counts as a win or a loss, and it stays on the record. Some days nothing looks strong enough, so we pass.";

export function HowAPickGetsMade({
  headingLevel = "h2",
}: {
  headingLevel?: "h1" | "h2";
}): JSX.Element {
  const Heading = headingLevel;
  return (
    <section aria-labelledby="how-a-pick-gets-made" data-testid="how-a-pick-gets-made">
      <Heading
        id="how-a-pick-gets-made"
        className="text-3xl font-black tracking-tight text-ion-white sm:text-4xl"
      >
        How a pick gets made
      </Heading>
      <ol className="mt-8 grid gap-4 sm:grid-cols-2">
        {HOW_A_PICK_GETS_MADE_STEPS.map((step, i) => (
          <li key={step.title} className="surface-card p-5">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-orbital-cyan">
              {i + 1}
            </p>
            <p className="mt-2 text-lg font-semibold text-ion-white">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ion-1">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 max-w-2xl text-base leading-7 text-ion-1">{HOW_A_PICK_GETS_MADE_CLOSER}</p>
    </section>
  );
}
