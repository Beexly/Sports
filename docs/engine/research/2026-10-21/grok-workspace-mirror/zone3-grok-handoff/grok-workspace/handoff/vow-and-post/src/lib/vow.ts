export const VOW_PRODUCTS = [
  {
    slug: "welcome",
    name: "Welcome sign",
    price: 49,
    size: "18×24 in",
    etsyTitle: "Welcome Wedding Sign | Ivory Letterpress Look | Printable 18x24",
    tags: ["wedding welcome sign", "printable wedding sign", "ivory wedding decor", "reception entrance"],
    blurb: "The first thing they see. Names, date, a single line of hospitality.",
  },
  {
    slug: "seating",
    name: "Seating chart",
    price: 79,
    size: "24×36 in",
    etsyTitle: "Wedding Seating Chart | Editorial Table List | Printable 24x36",
    tags: ["wedding seating chart", "find your seat sign", "reception seating", "printable seating chart"],
    blurb: "Find your seat, without the laminated chaos.",
  },
  {
    slug: "menu",
    name: "Menu",
    price: 29,
    size: "5×7 in",
    etsyTitle: "Wedding Menu Card | Cotton Paper Look | Printable 5x7",
    tags: ["wedding menu", "reception dinner menu", "printable menu card"],
    blurb: "Courses set in type, not clip art.",
  },
  {
    slug: "numbers",
    name: "Table numbers",
    price: 39,
    size: "5×7 in · set of 10",
    etsyTitle: "Wedding Table Numbers 1–10 | Brass-and-Ivory | Printable Set",
    tags: ["wedding table numbers", "reception table signs", "printable table numbers"],
    blurb: "A set of ten. Quiet numerals, not balloons.",
  },
] as const;

export type VowSlug = (typeof VOW_PRODUCTS)[number]["slug"];

export const SAMPLE_COUPLE = {
  a: "Elena",
  b: "Marcus",
  last: "Navarro",
  date: "October 17, 2026",
  venue: "The Peach Orchard · Tomball",
  note: "Sample couple — replace with yours.",
};

export const SAMPLE_TABLES = [
  { n: 1, guests: "The Navarros, Aunt Lila, Ben" },
  { n: 2, guests: "The Chen family" },
  { n: 3, guests: "Work — Westside clinic" },
  { n: 4, guests: "College, table of seven" },
  { n: 5, guests: "The Whitfields" },
  { n: 6, guests: "Plus-ones & cousins" },
];

export const SAMPLE_MENU = [
  { course: "To begin", dish: "Peach & burrata, torn basil" },
  { course: "Then", dish: "Gulf snapper, brown butter, citrus" },
  { course: "Or", dish: "Short rib, smoked shallot, polenta" },
  { course: "After", dish: "Olive-oil cake, roasted fig" },
];
