# Approved repos — 2026-10-14 (founder approval: "any and all data or info you need")

## The four

| repo | what it is (verified via GitHub API 2026-10-14) | relevance to GSE | status |
|---|---|---|---|
| `morluto/rea` | "Reverse engineer anything with agents, from app behavior down to native binaries." TypeScript, 214k+ stars, active (pushed 2026-10-14) | **Directly relevant**: agent-driven reverse engineering of app behavior — the same class of work as the LineStar/NGS/Action Network endpoint discovery this cycle. Candidate for cracking the paid-tier LineStar surfaces and any API that needs behavior-level probing. | APPROVED — not yet used |
| `WerWolv/ImHex` | Hex editor for reverse engineers. C++, 55k stars, active | Binary/file-format inspection. Relevant only if we hit an opaque binary or proprietary file format; no current GSE surface needs it. | APPROVED — dormant |
| `wtsxDev/reverse-engineering` | Curated list of RE resources (last pushed 2023) | Reference material / technique catalog. Useful as a lookup when a new protection scheme appears; nothing to integrate. | APPROVED — reference only |
| `alufers/mitmproxy2swagger` | "Automagically reverse-engineer REST APIs via capturing traffic." HTML, 9.6k stars, active (2026-10-12) | **Directly relevant, highest of the four**: capture traffic against a site and auto-produce an OpenAPI spec. This is the fastest path to formalizing any endpoint we discover by browsing (LineStar DailyFantasyApi, Action Network, ESPN internals) into a reusable, documented client. Pairs with the repo's existing HAR-capture workstream (audit build items #6/#7). | APPROVED — candidate for next wiring cycle |

## Why these matter to the current edge

This cycle's highest-value find was that **the transport was verified but the meaning was not**
(Action Network served 200s while labelling DraftKings as Caesars). The pattern that closes that
class permanently is: capture real traffic → auto-generate a spec → assert semantic identity in the
client. `mitmproxy2swagger` is exactly that pipeline for HTTP APIs; `rea` extends it to behavior-level
reverse engineering when there is no clean HTTP surface.

## Concrete next uses (do these before inventing new ones)

1. **Formalize the LineStar DesktopModules/DailyFantasyApi surface** (9 routes, 5 still 404-by-name)
   with `mitmproxy2swagger`: capture the working routes from a browse session, generate the spec,
   then diff the spec's route list against our 404s to find the real names of
   `GetTeamDefenseReport` / `GetSalaryChanges` / `GetPerfect` / `GetSalaryComparison` /
   `GetDailyDashboard`.
2. **Formalize the Action Network `/web/v1/*` plane** (scoreboard, books, and whatever the app calls
   on load) the same way, then encode the verified `source_name` map as the spec's enum — making the
   book-id mislabelling class impossible to reintroduce silently.
3. Keep `rea` in reserve for anything that resists traffic capture (native app, certificate pinning).

## Boundaries

- Approval covers reading, cloning, and integrating their public code/data per each repo's license.
- robots/ToS of the *target* sites (LineStar, Action Network, ESPN, NGS) still govern what we capture;
  approval of these tools does not override target-site terms.
- Record each use in the ingestion coverage doc with provenance, same as every other source.
