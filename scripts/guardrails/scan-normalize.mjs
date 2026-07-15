const CONFUSABLES = new Map(
  Object.entries({
    а: "a",
    е: "e",
    о: "o",
    р: "p",
    с: "c",
    у: "y",
    х: "x",
    і: "i",
    ј: "j",
    һ: "h",
    Α: "A",
    Β: "B",
    Ε: "E",
    Ζ: "Z",
    Η: "H",
    Ι: "I",
    Κ: "K",
    Μ: "M",
    Ν: "N",
    Ο: "O",
    Ρ: "P",
    Τ: "T",
    Υ: "Y",
    Χ: "X",
    α: "a",
    ι: "i",
    κ: "k",
    ν: "v",
    ο: "o",
    ρ: "p",
    υ: "u",
  }),
);

const CONFUSABLE_PATTERN = new RegExp(
  `[${[...CONFUSABLES.keys()].join("")}]`,
  "g",
);

export function normalizeScanText(input) {
  return input
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u2060\uFEFF\u00AD]/g, "")
    .replace(CONFUSABLE_PATTERN, (character) => CONFUSABLES.get(character) ?? character)
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\S\r\n]+/g, " ");
}

export function collapseStringJoins(input) {
  return input
    .replace(/["'`]\s*\+\s*["'`]/g, "")
    .replace(/\$\{[^{}]*\}/g, "");
}
