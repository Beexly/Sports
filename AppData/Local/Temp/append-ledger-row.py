import io, sys

p = r"C:\Users\Garrett\Sports-wt-devig-asym\docs\ops\AGENT_LEDGER.md"
row = (
    "| SIGDEV-1 | Asymmetric-input devig tests: the #965 fix is now pinned by tests that FAIL on the old code "
    "(2026-09-30). Test-only, no production code changed. Session 1 of the total-signal-wiring program. The two existing "
    "tests could not have caught either defect: `devigAdapter(-110,-110)` is symmetric, so normalising a NEGATED implied "
    "probability still cancels to 0.5, and `devigOracleAdapter([-110,-110], \"proportional\")` passed a string that is not "
    "one of the seven DevigMethod values. Added 11 tests on asymmetric books. `devigAdapter`: -110/-125 -> 0.4853/0.5147 "
    "(old code 0.5319, because it read American odds as decimal prices); -150/+200 -> 0.6429/0.3571 summing to 1 (old code "
    "4.0/-3.0, a NEGATIVE probability); -105/+105 -> 0.5122 (old code divided by exactly zero, since 1/-105 + 1/105 === 0); "
    "zero price fails closed. `devigOracleAdapter`: additive on [-110,150] -> [0.5619,0.4381] vs multiplicative "
    "[0.567,0.433] (old body returned the multiplicative vector under every method name while labelling it additive); shin "
    "on a three-way book -> [0.3909,0.3909,0.2182] vs multiplicative [0.3793,0.3793,0.2414]; six methods each sum to 1 with "
    "every leg in (0,1); `proportional`, `bogus-method`, null and undefined all report raw.method `multiplicative` (old "
    "adapter echoed the caller's string verbatim into raw.method, the same claim-versus-computation gap #965 closed "
    "elsewhere). Expected values were taken from running devig/oracle.ts directly, not asserted by hand. NON-VACUITY "
    "PROVEN BY INJECTION: reverted both adapter source files to 3e074c584^ with the new tests in place and 9 of the 11 "
    "failed, then restored HEAD and all 27 pass. Full engine suite 858 files / 6306 tests / 0 failed (was 6295 tests); "
    "tsc --noEmit exit 0; guardrails run-all 25/26, the single failure being the unwaived brace-expansion HIGH that also "
    "fails main and is not fixable by an agent (package-lock.json and dated waivers are forbidden, AGENTS.md:1210-1212). | "
    "hermes | DONE | docs/ops/handoffs/2026-09-30-devig-asymmetric-tests.md |\n"
)
with io.open(p, "r", encoding="utf-8", newline="") as f:
    content = f.read()
if "SIGDEV-1" in content:
    print("ALREADY PRESENT, no write")
    sys.exit(0)
if not content.endswith("\n"):
    content += "\n"
with io.open(p, "w", encoding="utf-8", newline="") as f:
    f.write(content + row)
with io.open(p, "r", encoding="utf-8", newline="") as f:
    after = f.read()
print("SIGDEV-1 count:", after.count("SIGDEV-1"))
print("size grew by:", len(after) - len(content))
print("tail:", repr(after[-120:]))