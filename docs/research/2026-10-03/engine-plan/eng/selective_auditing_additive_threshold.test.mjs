import { selectiveAuditingAdditiveThreshold } from "./selective_auditing_additive_threshold.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// happy path: observed error, audit
{
  const r = selectiveAuditingAdditiveThreshold(0.5, 0.1, 0.2, 0.05, 1, 1);
  assert(r.ok, "happy should ok");
  assert(r.tau === 0.5 + 0.1 * ((1 - 0.2 - 0.05) * 1 * 1 / 0.2), "delta match");
}

// fail closed: bad inputs
{
  const cases = [
    [NaN, 0.1, 0.5, 0.05, 1, 1],
    [0.5, -1, 0.5, 0.05, 1, 1],
    [0.5, 0.1, 0, 0.05, 1, 1],
    [0.5, 0.1, 0.5, 0, 1, 1],
    [0.5, 0.1, 0.5, 0.05, 2, 1],
    [0.5, 0.1, 0.5, 0.05, 1, 2],
  ];
  for (const c of cases) {
    const r = selectiveAuditingAdditiveThreshold(...c);
    assert(!r.ok, "should fail closed: " + JSON.stringify(c));
  }
}

console.log("selective_auditing_additive_threshold.test.mjs: 2 groups passed");
