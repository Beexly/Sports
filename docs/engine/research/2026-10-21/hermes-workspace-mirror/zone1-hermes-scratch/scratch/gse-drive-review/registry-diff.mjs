(async () => {
  const path = await import("node:path");
  const mods = ["src/signal-registry.js", "src/signal-registry-definitions.js", "src/signal-registry-extensions.js"];
  const sets = {};
  for (const m of mods) {
    try {
      const url = "file:///" + path.resolve(m).split(path.sep).join("/");
      const mod = await import(url);
      const key = Object.keys(mod).find((k) => Array.isArray(mod[k]) && mod[k].length > 20);
      if (key) sets[m] = mod[key].filter((s) => s.activationStatus === "ACTIVE").map((s) => s.id);
    } catch (e) {
      console.log(m, "ERR", e.message.slice(0, 60));
    }
  }
  for (const [m, ids] of Object.entries(sets)) console.log(m, "ACTIVE:", ids.length);
  const ks = Object.keys(sets);
  for (let i = 0; i < ks.length; i++)
    for (let j = i + 1; j < ks.length; j++) {
      const a = new Set(sets[ks[i]]), b = new Set(sets[ks[j]]);
      const onlyA = [...a].filter((x) => !b.has(x));
      const onlyB = [...b].filter((x) => !a.has(x));
      if (onlyA.length || onlyB.length) {
        console.log("only in", ks[i], ":", JSON.stringify(onlyA));
        console.log("only in", ks[j], ":", JSON.stringify(onlyB));
      }
    }
})();
