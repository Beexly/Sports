# Recovery Priorities

Verify live state before using this list.

1. Settlement correctness and scanner/CI hardening (#119) if absent from main.
2. Per-page Cockpit ADMIN invariant (#123) if absent from main.
3. Frontier fabric: Agent Foundry, Assurance, Resource Radar, shadow router (#124).
4. Governed playback spine: evidence envelope, events, epistemic deltas, certificate, Game Room/Twin/Brain/autopsy/Studio projections (#112).
5. CLV/Pedersen schema work (#122): code/review only; production migration remains founder-gated.
6. Fantasy engine (#121): resolve original naming before any public projection.
7. Galaxy Dynasty world graph (#52): preserve as future shared-world substrate.

Do not combine unrelated concerns into a mega-PR. Rebase or port the smallest proven commits, preserving all later current-main hardening.
