// design-sync shim: components read process.env.* (gates, pricing phase); the design runtime has no
// process. Provide an empty env so every gate resolves to its fail-closed default.
const g = globalThis as { process?: { env: Record<string, string | undefined> } };
if (typeof g.process === "undefined") g.process = { env: {} };
export {};
