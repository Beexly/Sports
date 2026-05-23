import { buildVaultSourceHref } from "@/lib/utm";

type ContextualVaultCtaProps = {
  surface: "loss-room" | "passes" | "methodology" | "ledger";
};

const copy = {
  "loss-room": {
    title:
      "Vault is where Garrett walks through the internal rationale behind entries like this.",
    body: "No additional picks. More context.",
  },
  passes: {
    title: "Vault is where the most instructive holds get discussed in more depth.",
    body: "No additional picks. More context.",
  },
  methodology: {
    title: "Vault office hours is where members bring methodology questions.",
    body: "No additional picks. More context.",
  },
  ledger: {
    title: "The Ledger records the outcome. Vault is where the weekly rationale gets written.",
    body: "No additional picks. More context.",
  },
};

export function ContextualVaultCta({ surface }: ContextualVaultCtaProps) {
  const content = copy[surface];

  return (
    <aside className="proof-module" aria-label="Vault context">
      <h2>{content.title}</h2>
      <p>{content.body}</p>
      <a className="button" href={buildVaultSourceHref(surface)}>
        Read about Vault
      </a>
    </aside>
  );
}
