# Galaxy Sports Edge — Security & AI Governance Binder

This directory holds the technical-security, AI-governance, and
architecture-boundary documentation for Galaxy Sports Edge.

**Posture:** investor-grade. The goal is that when an acquirer or
security-due-diligence reviewer asks about repo hygiene, AI tool
discipline, or competitor-leak risk, the answers exist on paper and
match practice.

Anchor frameworks:

- **NIST SSDF** — Secure Software Development Framework. Treats security
  as integrated into the development lifecycle, not bolted on.
- **CISA Secure-by-Design** — security as a product feature, not an
  afterthought.
- **FTC data-minimization** — collect only what's needed, retain only
  as long as needed, lock down access.

## File index

| File | Purpose |
|---|---|
| [`REPO_SECURITY_CHECKLIST.md`](./REPO_SECURITY_CHECKLIST.md) | Repo, branch, secrets, dependency, and access controls. |
| [`AI_TOOL_CONFIDENTIALITY_POLICY.md`](./AI_TOOL_CONFIDENTIALITY_POLICY.md) | Rules for using Claude, Codex, ChatGPT, and other AI tools without leaking trade secrets. |
| [`PUBLIC_PRIVATE_ARCHITECTURE_BOUNDARY.md`](./PUBLIC_PRIVATE_ARCHITECTURE_BOUNDARY.md) | Three-layer model: public / protected / restricted. What may live where. |
| [`COMPETITOR_LEAK_AUDIT.md`](./COMPETITOR_LEAK_AUDIT.md) | Recurring audit checklist: what can a competitor infer from what's public? |

See also: [`../legal-ip/`](../legal-ip/) for the IP-protection layer.

## The principle

> Hide the machinery. Show the result.

A competitor seeing Galaxy's website should think: "they have impressive
features." A competitor inspecting Galaxy's bundle should think: "I
cannot rebuild this from what's exposed."

These documents make that posture explicit and auditable.
