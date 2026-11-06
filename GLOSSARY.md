# Domain Glossary — Galaxy Sports Edge (GSE) & Galaxy Science Institute (GSI)

This glossary defines the canonical ubiquitous language shared across Galaxy Sports Edge (`GSE`) and Galaxy Science Institute (`GSI`). Every term has one unambiguous domain meaning across code, tests, dossiers, and Architecture Decision Records (`docs/adr/ADR-0001` through `docs/adr/ADR-0006`).

## Core Sports & Market Domain (`GSE`)

- **Market Foundation Layer (Layer 1)**: The consensus closing or live market line treated as the baseline prior before situational reasoning is applied.
- **Situational Overlay (Layer 2)**: The structured contextual adjustment derived from coaching tendencies, trench pressure disruption, active injury availability, weather physics, and rest/travel differentials.
- **De-Vigged Fair Probability**: The bookmaker-margin-removed implied probability of a market outcome computed via Shin closed-form or multiplicative power de-vigging.
- **Conjunction Gate (Stage 5 Gate)**: The final decision boundary requiring calibrated probability, positive expected value against the de-vigged market, source agreement, and conformal interval clearance before a play is eligible for publication.
- **Pass Discipline**: The mandatory rule that any market side, total, player prop, or same-game parlay failing the Conjunction Gate is marked `PASS` (`publishAllowed: false`) rather than forced onto the board.
- **Call-Sheet Ticket**: A verified, publication-cleared wager or player prop recommendation backed by full-game snap-by-snap simulation and signed conformal calibration bounds.
- **360-Degree Full-Board Review**: The mandatory evaluation of every market category offered on a game slate, including quarters (`1Q–4Q`), halves (`1H/2H`), full-game sides and totals, quarterback and skill-player props, kicking markets, individual defensive player (`IDP`) sacks and tackles, and touchdown scorer markets.
- **Official New Engine Verified Record**: The single authoritative settled performance ledger (`62-23-1`, `72.9%`, `+26.50u` entering Week 9) tracked in `data/engine/new_engine_official_ledger_2026.json`.
- **CollegeGuard**: The strict domain firewall separating college football (`CFB`: higher variance and wider home-field advantage) from NFL calibration parameters so college data never contaminates NFL probability heads.

## Universal Dynamical Systems & Biophysical Domain (`GSI`)

- **Phase-Transition Criticality**: The measurable pre-collapse regime of a coupled dynamical system characterized by rising susceptibility, spectral radius approaching unity, and slowing recovery rates.
- **Spin-Glass Susceptibility ($\chi_{\text{SG}}$)**: The frustration metric measuring how close an interacting network (such as an offensive line pocket, defensive coverage shell, or physiological organ network) is to structural breakdown under external stress.
- **Ollivier–Ricci Curvature ($\kappa_{\text{OR}}$)**: The Wasserstein-1 transport curvature across graph edges quantifying whether neighborhood pathways are bottlenecked (negative curvature) or redundantly supported (positive curvature).
- **Sulcal Waveguide Focusing**: The geometric concentration of shear wave energy along curved cortical or stadium boundaries governed by Sogge local smoothing and Kakeya directional tube bounds.
- **Kelvin Circulation Anomaly ($\Delta\Gamma_{\text{Kelvin}}$)**: The departure from ideal circulation conservation across a fluid or hemodynamic loop used as an early indicator of vortex stretching or microvascular decompensation.
- **Comparator Challenge**: A formal Lean 4 specification verification test that detects whether a candidate mathematical statement or agent policy is genuinely faithful or a trivial/reward-hacked tautology.

## Multi-Agent & Coworker Governance Domain (`Jarvis` / `OpenDots` / `AG-UI`)

- **Dot**: A persistent AI coworker with its own workspace, memory pages, Streamable HTTP MCP connections, and isolated container environment.
- **Approval Card (`Ask First`)**: A human-in-the-loop review card (`Ask -> Browse -> Approve -> Save`) required before any mutating tool call, outbound communication, or capital allocation can execute.
- **Draft-Only Capability (`DRAFT_AWAITS_APPROVAL`)**: An agent capability permitted to prepare research, grant applications, or social media packages while strictly forbidden from autonomous public execution (`canExecute: false`, `requiresHumanApproval: true`).
