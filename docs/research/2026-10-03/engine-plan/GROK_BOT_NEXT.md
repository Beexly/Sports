# GROK_BOT_NEXT

Clock 14:06 CT. This file is the assignment. Do not wait for a human to paste it.

Do not settle picks. Do not write Neon. Do not pass --merge. Do not append to mind.jsonl. Do not restart math pid 5508. Do not call AIML (HTTP 403, out of funds). Do not start a second mind_train.py. Writer on mind.jsonl was pid 22412 at the 13:53 handle check.

Pull research/engine-plan-2026-10-03. Worktree was e5aa84b at 13:53 and origin has moved. Pull before you edit.

Already on origin, do not duplicate:
- eng/tinkabot_eq_calibration_log_loss.py commit 7d9cd37. Identity LL = -[y log p + (1-y) log(1-p)]. Missing: the test file. Add test_tinkabot_eq_calibration_log_loss.py beside it and run it.
- eng/tinkabot_eq_ml_temperature.py already exists. Do not add a second temperature module.
- eng/tinkabot_eq_ml_shannon_entropy.py, eng/tinkabot_eq_ml_brier_skill.py, eng/tinkabot_eq_cognitive_nosofsky.py, eng/tinkabot_eq_vision_supplied_l.py.
- brain/mind_equations_heavy.jsonl at 07deab97, 8 dark rows, picks_settled 0. Extend that file. Do not rebuild intelligence_index.json. Do not copy it into mind.jsonl.

Missing identities to implement, one function per file, IDENTITY tinkabot, null on missing inputs, test beside the module, commit and push:
1. kl_divergence: KL(q||p) = sum q log(q/p). Kullback and Leibler 1951. Skip q=0. p below caller eps returns null.
2. rescorla_wagner: V <- V + alpha (lambda - V), alpha in [0, 1]. Rescorla and Wagner 1972.
3. platt_scale: q = 1 / (1 + exp(-(A s + B))). A and B caller-supplied. Platt 1999.
4. adam_step: m = b1*m + (1-b1)*g; v = b2*v + (1-b2)*g*g; theta = theta - alpha * mhat / (sqrt(vhat) + eps). Kingma and Ba, arXiv 1412.6980, Algorithm 1. Betas caller-supplied.
5. horn_schunck_constraint: Ex*u + Ey*v + Et = 0. Return the residual. Horn and Schunck 1981 p. 187. Do not implement the iterative solver.

After each push, append one row to brain/mind_equations_heavy.jsonl with signal_id, equation, source, code_path, status WIRED_DARK, picks_settled 0. A row with no source path is invalid.

Report to GSE only: commit sha, test count, picks_settled 0. If a bot starts a mint, stop that task.
