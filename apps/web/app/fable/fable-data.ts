export const PROOF_LAYERS = [
  {
    body:
      "The source registry records what a feed may support, what it cannot support, and which owner or legal review is still needed before reuse.",
    label: "Source rights",
    title: "Every input gets a use boundary.",
  },
  {
    body:
      "Public statements are marked as proven, partial, unsupported, false, blocked, or owner-gated so the site does not drift into unsupported copy.",
    label: "Claim ledger",
    title: "Claims are sorted before they ship.",
  },
  {
    body:
      "Least confidence, tight margins, and entropy push examples into a local review queue before the product speaks too loudly.",
    label: "Uncertainty",
    title: "Weak spots move into review.",
  },
  {
    body:
      "Population drift, divergence, chi-square checks, and football segment parity tests keep evaluation attached to the data that produced it.",
    label: "Drift and parity",
    title: "Model behavior gets stress checks.",
  },
  {
    body:
      "Deploys, paid resources, destructive changes, wildcard IAM, production traffic, and cross-account actions require explicit approval and a dry-run path.",
    label: "AWS gates",
    title: "Cloud action is blocked by default.",
  },
  {
    body:
      "The public forensic demo runs from a fixture. Synthetic Clean Rooms examples stay synthetic until a real partner, rights review, and budget exist.",
    label: "Demo artifacts",
    title: "Research stays reproducible.",
  },
] as const;

export const COMMANDS = [
  "npm run fable:evidence",
  "npm run fable:claims",
  "npm run fable:sources",
  "npm run fable:aws-gates",
  "npm run fable:demo",
] as const;

export const NON_CLAIMS = [
  "No live AWS setup is implied by this page.",
  "No paid model call, deploy, DNS change, or production traffic action is required here.",
  "No source data is moved to AWS unless source rights and owner approval allow it.",
  "No sports outcome is promised. The work improves evidence discipline, not certainty.",
] as const;
