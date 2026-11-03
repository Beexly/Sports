
"""Mutation harness: prove each 2026-11-03 fix is load-bearing.

For each mutation we (a) break exactly one fix, (b) run the test that is supposed
to catch it, and (c) require a NON-ZERO exit. Then restore and confirm green.
A fix whose test stays green under mutation is not proven.
"""
import io, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(".").resolve()
TRAINER = ROOT / "scripts/ops/replay_weeks_1_to_8_trainer.py"
DIGEST = ROOT / "intelligence/voice_brain/morning_digest.py"

def run(test):
    p = subprocess.run([sys.executable, "-m", "pytest", test, "-q", "-x"],
                       capture_output=True, text=True, cwd=str(ROOT))
    tail = (p.stdout or "").strip().splitlines()
    return p.returncode, (tail[-1] if tail else "")

def with_backup(path, fn):
    bak = path.with_suffix(path.suffix + ".mutbak")
    shutil.copyfile(path, bak)
    try:
        fn(path)
    finally:
        pass
    return bak

results = []

# ---------- mutation A: remove the evidence rescale ----------
bak = with_backup(TRAINER, lambda p: None)
src = io.open(bak, encoding="utf-8").read()
start = src.index("        # Rescale each team's Beta prior")
end = src.index("        df[\"prior_logit\"] = prior_logit")
mutA = src[:start] + src[end:]
io.open(TRAINER, "w", encoding="utf-8").write(mutA)
rc, tail = run("tests/test_weeks_1_to_8_replay_trainer.py")
results.append(("A: remove prior rescale", rc, tail))
shutil.copyfile(bak, TRAINER)

# ---------- mutation B: re-introduce the duplicate whole-season update ----------
src = io.open(bak, encoding="utf-8").read()
anchor = "        df[\"prior_logit\"] = prior_logit"
dup = """        for t in teams:
            m = (df["posteam"] == t) & (df["week"].isin(weeks))
            n = int(m.sum())
            if n:
                wins = int(df.loc[m, "is_pass"].sum())
                prior_alpha[t], prior_beta[t] = _beta_update(prior_alpha[t], prior_beta[t], wins, n)
"""
assert anchor in src
mutB = src.replace(anchor, anchor + "\n" + dup, 1)
io.open(TRAINER, "w", encoding="utf-8").write(mutB)
rc, tail = run("tests/test_weeks_1_to_8_replay_trainer.py")
results.append(("B: re-add duplicate prior update", rc, tail))
shutil.copyfile(bak, TRAINER)

# ---------- mutation C: revert digest to the wrong epoch keys ----------
dbak = with_backup(DIGEST, lambda p: None)
dsrc = io.open(dbak, encoding="utf-8").read()
good = """            "brier": last.get("brier_pass", last.get("brier")),
            "log_loss": last.get("logloss_pass", last.get("log_loss")),
            "ece": last.get("ece_pass", last.get("ece")),"""
bad = """            "brier": last.get("brier"),
            "log_loss": last.get("log_loss"),
            "ece": last.get("ece"),"""
assert good in dsrc
io.open(DIGEST, "w", encoding="utf-8").write(dsrc.replace(good, bad))
rc, tail = run("tests/test_live_voice_app.py")
results.append(("C: revert digest epoch keys", rc, tail))
shutil.copyfile(dbak, DIGEST)

# ---------- cleanup + restore verification ----------
for p in (TRAINER, DIGEST):
    bak = p.with_suffix(p.suffix + ".mutbak")
    if bak.exists():
        bak.unlink()

print("\n=== MUTATION RESULTS (nonzero exit == fix is load-bearing) ===")
allgood = True
for name, rc, tail in results:
    verdict = "CAUGHT" if rc not in (0, None) else "NOT CAUGHT **"
    if rc in (0, None):
        allgood = False
    print(f"  {name:38s} exit={rc}  {verdict}  | {tail[:70]}")

rc_final, tail_final = run("tests/test_weeks_1_to_8_replay_trainer.py")
print(f"\nRESTORED green? exit={rc_final} | {tail_final}")
print("ALL MUTATIONS CAUGHT" if allgood and rc_final == 0 else "HARNESS INCOMPLETE")
