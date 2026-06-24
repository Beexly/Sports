# Spatial Quality Gate

This branch is now Babylon-first for the Spatial OS slice. `packages/galaxy-spatial` owns the Babylon scene shell, materials, procedural asset kit, Rookie Plaza world builder, Beat visual instrument primitives, performance budgets, and quality gate scoring. Three.js is no longer the spatial engine dependency for this package.

| Gate | Current score | Evidence |
| --- | ---: | --- |
| Improves understanding | 3 | Rookie Plaza makes district routing spatial. |
| Improves emotion | 3 | Stadium-gold player, weather lighting, gates, and NPC markers exist. |
| Visual quality | 4 | Multi-part procedural Babylon player, NPC, gate, marker, Beat, and route-trail assets exist; authored final art remains gated. |
| Interaction clarity | 4 | NPC panel, quest panel, inventory, room roster, joystick, and route buttons exist. |
| Performance | 4 | Small procedural mesh kit, explicit engine dispose, resize handling, and fallback triggers. |
| Fallback quality | 3 | Static fallback background if WebGL init fails. |
| Accessibility | 4 | DOM controls, route buttons, keyboard movement, and touch joystick are labeled. |
| Data honesty | 4 | No fake live stats or copied assets. |
| Not decorative wallpaper | 4 | Movement and First Signal action are connected to progression. |
