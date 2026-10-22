export const KIT_SEQUENCES = [
  {
    day: 0,
    name: "First touch",
    subject: "A page for {business} — see it before you pay",
    body: `Hey {first} —

Saw {business} around {town}. The site (or the Facebook page doing the job of a site) is making people work too hard to call you.

I build one-pagers for trades in The Woodlands / Spring / Conroe. $350 flat. You see a preview with your name on it before any money moves. If you hate it, you owe nothing.

Reply KIT and send: business name, phone, the towns you want on the page.

Garrett
The Woodlands`,
  },
  {
    day: 3,
    name: "Follow-up",
    subject: "Still holding a preview slot for {business}",
    body: `{first} — quick bump.

I didn't want this sitting in the pile. If you send the four things (name, phone, services, towns) I can usually have a preview the same day.

If the timing's wrong, say so — I'll close the file.

Garrett`,
  },
  {
    day: 7,
    name: "Breakup",
    subject: "Closing the file on {business}",
    body: `{first} —

Going to close the preview file for {business} so I'm not chasing you.

If you want it later, DM KIT to @gbeexly. No hard feelings.

Garrett`,
  },
] as const;

export const PARTNERSHIPS = [
  {
    who: "Sign shops",
    offer: "SignPreview on your quote page",
    price: "Widget free to install. $150 design packages split 70/30 in your favor on leads you close, or $0 if you only want the widget.",
    why: "Customers who see the sign approve faster. You stop selling from a blank form.",
    ask: "Drop the iframe on your quote page. Send me your shop name, color, and the inbox leads should hit.",
  },
  {
    who: "Wedding planners",
    offer: "Vow & Post as your paper suite",
    price: "Planner rate: 20% on suites you place. Welcome / seating / menu / numbers, print-ready.",
    why: "Your couple gets a paper system, not four random Etsy files that don't match.",
    ask: "One sample suite under your couple's names. If they don't use it, you owe nothing.",
  },
  {
    who: "Venues",
    offer: "Seating planner + suite, white-labeled to the property",
    price: "Free planner embed for couples. Paid suite if they print. Venue keeps the couple's email.",
    why: "Couples linger on your site building the floor. You look like the grown-up in the room.",
    ask: "Logo, color, and a coordinator email. Live in a week.",
  },
] as const;

export const SCORING = [
  { pts: 3, rule: "Named a town we actually serve (Woodlands, Spring, Conroe, Tomball, Magnolia, Humble, Atascocita)" },
  { pts: 3, rule: "Has a phone number on their current page or Google listing" },
  { pts: 2, rule: "Asked for a preview, or used the word this week / as soon as" },
  { pts: 2, rule: "Rendered a SignPreview mockup (business name on a sign)" },
  { pts: 2, rule: "Finished a seating chart or quote (email captured)" },
  { pts: 1, rule: "Instagram or Facebook that posts at least monthly" },
  { pts: -3, rule: "Outside Texas, or wants e-commerce / app / custom SaaS" },
  { pts: -2, rule: "Price-only reply with no business name" },
];

export function band(score: number) {
  if (score >= 7) return "Hot — preview today";
  if (score >= 4) return "Warm — sequence, don't pitch twice";
  if (score >= 1) return "Cool — one breakup then close";
  return "Pass — do not spend a follow-up";
}
