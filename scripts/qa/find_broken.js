const fs = require('fs');

const catalogPath = "data/equations/equation_executable_catalog_12304.json";
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

let broken = [];
let validCount = 0;

for (let eq of catalog.equations || []) {
    let formula = eq.formula_expression;
    if (!formula) continue;

    let bindings = eq.parameter_bindings || [];
    let clean = formula.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').trim();

    // Test if it parses and runs successfully when ALL math functions are correctly supplied
    let fnBody = `
        const logit_inv = (x) => 1 / (1 + Math.exp(-x));
        const abs = Math.abs;
        const exp = Math.exp;
        const max = Math.max;
        const min = Math.min;
        const sqrt = Math.sqrt;
        const pow = Math.pow;
        const sign = Math.sign;
        const sin = Math.sin;
        const cos = Math.cos;
        const tan = Math.tan;
        const log = Math.log;
        const callable_kernel = (x, y) => 1;
        const sigmoid = (x) => 1 / (1 + Math.exp(-x));
        const norm_cdf = (x) => 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI)));
        const logit = (x) => Math.log(x / (1 - x));

        return ${clean};
    `;

    try {
        let fn = new Function(...bindings, fnBody);
        let args = bindings.map((_, i) => i + 1); // Mock data 1, 2, 3...
        let res = fn(...args);

        // Let's also check for ReferenceError to ANY undefined symbol that wasn't mocked.
        // Wait, if it didn't throw, it found all its variables in bindings or the fnBody!
        validCount++;

    } catch (e) {
        broken.push({
            id: eq.equation_id,
            error: e.message,
            clean: clean,
            formula: formula,
            bindings: bindings
        });
    }
}

console.log(`Found ${broken.length} genuinely broken equations!`);
for (let b of broken) {
    console.log(b.id, b.error);
    console.log("Formula:", b.formula);
    console.log("Cleaned:", b.clean);
    console.log("Bindings:", b.bindings);
    console.log("-------------------");
}
