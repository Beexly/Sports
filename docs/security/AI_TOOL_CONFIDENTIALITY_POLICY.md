# AI Tool Confidentiality Policy — Galaxy Sports Edge

Galaxy is built with Claude (Anthropic), Codex (OpenAI), ChatGPT, and
potentially other AI tools. These tools are extraordinary leverage —
and a meaningful confidentiality risk if used carelessly.

This policy governs what may and may not be shared with AI tools.

**Audience:** Founder + any future contributor or collaborator using
AI tools while working on Galaxy.

## The risk model

When you paste content into an AI tool, that content may be:

- Stored by the provider for varying retention windows
- Logged for abuse monitoring
- Used to improve the model (per provider's training policy)
- Visible to provider employees in some circumstances
- Stored in your account history (visible to anyone with account access)
- Captured in screenshots you take of the conversation
- Cached or indexed if the conversation is shared via a public link

The risk is not necessarily that Anthropic or OpenAI steal Galaxy's IP.
The risk is that:

1. Proprietary methodology leaks into training data over time
2. Account credentials are compromised, exposing the full chat history
3. Shared chat links accidentally make content public
4. Screenshots taken for portfolios reveal proprietary surfaces
5. Provider terms change, retroactively widening the disclosure surface

Trade-secret status depends on **reasonable measures** to keep
information secret. Treating AI tools as fully public reduces the legal
defensibility of anything pasted into them.

## Classification

Every piece of Galaxy information falls into one of three buckets.

### Bucket A — Public

Already public on the website, on social, in press, or in publicly
available source code. Safe to share with any AI tool.

Examples:
- Feature names (Parlay MRI, No-Bet Engine, Market Mirage)
- The taxonomy of NO_BET_REASONS (reason codes are public)
- The public copy from the marketing site
- The factor list (factor names public; weights not)
- The Academy module curriculum titles
- Existing JSON-LD / SEO copy

### Bucket B — Protected

Internal to Galaxy. Not yet public. May be shared with AI tools
**only under approved conditions** (see Approved Conditions below).

Examples:
- Server-side code
- Prisma schema and migrations
- Internal admin / cockpit code
- Unreleased product surfaces
- Pricing experiments
- Roadmap documents
- Architecture decision drafts
- Test data structure
- Performance metrics

### Bucket C — Restricted

Highly sensitive. **Never** share with public AI tools regardless of
conditions.

Examples:
- API keys, database credentials, OAuth secrets, webhook secrets,
  any value matching a `*_KEY`, `*_SECRET`, `*_TOKEN` pattern
- User PII (emails, identities, payment metadata)
- Production database contents
- Proprietary scoring formulas with exact weights
- Proprietary thresholds (publish gate exact numbers, calibration
  trigger numbers, parlay MRI verdict thresholds)
- System prompts used in production AI surfaces
- Prompt chains used to drive the Brain
- Per-coach baselines, per-source reliability scores, model calibration
  rules with exact values
- Customer data exports
- Financial models / forecasts
- M&A or fundraising materials

---

## Approved conditions for Bucket B (Protected)

Bucket B content may be shared with AI tools when:

1. **The tool is operating under business / enterprise terms** that
   exclude the data from training and provide commercial confidentiality
   commitments. Examples:
   - Claude API used under Anthropic Commercial Terms with zero-data-
     retention agreement (if applicable)
   - ChatGPT Enterprise / Team where Chat history is excluded from
     training by default
   - Codex / GitHub Copilot Business where telemetry exclusion is
     configured
   - Claude Code (CLI) operating against the user's own keys / chat
     account where account settings disable training data use

2. **The conversation will not be shared publicly** (no shared chat
   link, no public screenshot).

3. **The minimum necessary content is provided** — paste the file or
   snippet needed, not the whole repo. Don't dump the schema if a single
   model definition would do.

4. **No Bucket C content is included** even incidentally (no API keys,
   no thresholds, no system prompts).

Bucket B content must **never** be shared with:

- Free-tier consumer AI tools that train on input by default
- AI tools whose terms include broad usage rights to input
- Any AI tool where you cannot verify the data handling
- Any AI tool used on a shared / unmanaged device

---

## Specific rules

### Repo & source code

- ✅ Reading or editing source via Claude Code CLI operating on your
  local repo is fine — that is the intended workflow.
- ✅ Asking Claude / Codex to write/refactor a specific file is fine.
- ⚠️ Pasting full directories or schemas into web chats: use only the
  minimum slice needed. Prefer file-by-file work in the CLI.
- ❌ Do not paste the entire prediction engine, scoring weights, or
  prompt library into a web chat.
- ❌ Do not commit AI conversation transcripts to the public repo unless
  they contain only Bucket A content.

### Prompts and system instructions

- ❌ Do not share Galaxy's production system prompts with any AI tool
  outside the deployment context.
- ❌ Do not share evaluation rubrics, prompt-chain logic, or
  prompt-engineering work in public AI chats.
- ✅ Centralize prompts in `apps/web/lib/prompts/` (server-only) once
  built, and treat that file as Bucket C.

### Generated code review

- ✅ Always review AI-generated code before commit
- ✅ Trust gate runs on every change — including AI-generated content
- ✅ Vitest + typecheck must pass before merge
- ✅ Apply the same security review to AI-generated code as to
  hand-written code — AI tools sometimes generate insecure patterns
  (unsafe SQL, missing input validation, exposed secrets in examples)

### Screenshots

- ⚠️ Screenshots are a major leak vector. They preserve content even
  after browser/chat is cleared.
- ✅ Crop tightly. Show only what's relevant.
- ❌ Never screenshot a chat that contains Bucket B or C content for
  any external use (portfolio, social, blog, podcast).
- ❌ Never screenshot admin / cockpit surfaces for external use.
- ⚠️ Internal screenshots (in commits, docs, design files) are fine if
  they reveal only Bucket A content.

### Conversation history

- ✅ Periodically review AI tool chat history. Delete conversations
  containing Bucket B or C content once no longer needed.
- ✅ Use AI tool data controls (ChatGPT settings → Data Controls;
  Anthropic Console settings) to manage retention.
- ⚠️ Account compromise = chat history compromise. Use strong 2FA on
  every AI tool account.

### Public sharing

- ❌ Never publish a "How I built X" post that includes Galaxy's
  proprietary methodology, prompts, or thresholds.
- ✅ "How I built X" posts can mention Galaxy by name, describe public
  features, and discuss general approach.
- ⚠️ Treat any external retelling as a potential trade-secret
  disclosure. Err narrow.

---

## AI agent contributions to the repo

When AI agents (Claude Code, Codex, etc.) commit code to the repo:

- ✅ The operator (founder or contractor) remains the legal author
- ✅ Commits should follow normal review and CI requirements
- ✅ AI-generated commit messages should be reviewed for any leaked
  internal information
- ⚠️ Avoid commit messages that include exact thresholds, system
  prompts, or proprietary formulas
- ✅ AI-generated code is subject to the same trust-gate scan as
  hand-written code

## Tooling-specific notes

### Claude Code (CLI)

- Operates against the user's terminal and repo
- Conversations live in the local session
- Outputs are visible only to the user unless explicitly shared
- Treat as Bucket B-safe when used locally

### Anthropic Console / Claude.ai web

- Default account: free / pro
- Training opt-out available in account settings — verify enabled
- Bucket B content: only with training opt-out verified
- Bucket C content: never

### ChatGPT / OpenAI

- Consumer tier: trains on conversations by default unless opt-out set
- Team / Enterprise: excluded from training by default
- Bucket B content: Team/Enterprise only with verified settings
- Bucket C content: never

### Codex / GitHub Copilot

- Configure organization settings to exclude code from training
- Disable suggestions matching public code if proprietary IP is a concern
- Bucket B content: only with org settings verified
- Bucket C content: never

### Cursor, Windsurf, other IDE-integrated tools

- Per-tool policy review required before adoption
- Treat as Bucket B-safe only if data handling verified

---

## Incident response

If you suspect a Bucket B or C disclosure to an AI tool:

1. Document what was shared, to which tool, on which account, at what
   time
2. Delete the conversation from the tool
3. Request data deletion via the provider's data deletion process where
   available
4. Rotate any secrets that may have been exposed
5. Review the AI tool's training/retention policy effective at time of
   disclosure
6. Update this policy if a gap is identified
7. Note the incident in a security log (off-repo)

## Review cadence

- This policy reviewed quarterly
- AI tool terms re-reviewed annually or on T&C update
- Audit of chat histories quarterly
- Audit of screenshots-in-the-wild before any public announcement
