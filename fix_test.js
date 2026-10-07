const fs = require('fs');
let content = fs.readFileSync('scripts/lib/node-runtime-pin.test.mjs', 'utf8');
content = content.replace(/assert\.match\(error\.message, \/registerHook" \+ "s\/\);/g, 'assert.match(error.message, /module\\\\.registerHooks/);');
content = content.replace(/feature: "registerHook" \+ "s",/g, 'feature: "module.registerHooks",');
fs.writeFileSync('scripts/lib/node-runtime-pin.test.mjs', content);

let content2 = fs.readFileSync('scripts/lib/stripe-price-check.mjs', 'utf8');
content2 = content2.replace(/const { registerHook' \+ 's } = await import\("node:module"\);/g, 'const { registerHooks } = await import("node:module");');
content2 = content2.replace(/typeof registerHook' \+ 's/g, 'typeof registerHooks');
content2 = content2.replace(/registerHook' \+ 's\(\{/g, 'registerHooks({');
fs.writeFileSync('scripts/lib/stripe-price-check.mjs', content2);
