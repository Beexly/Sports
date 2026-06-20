// Solo arcade — the platform requires a rules module at the zip root. Galaxy City
// runs entirely client-side (Three.js in index.html); this is the required stub.
export const meta = { game: "galaxy-city", minPlayers: 1, maxPlayers: 1 };
export function setup() { return {}; }
export function validateAction() { return { ok: true }; }
export function applyAction(state) { return state; }
export function isGameOver() { return { over: false }; }
export function viewFor(state) { return state; }
