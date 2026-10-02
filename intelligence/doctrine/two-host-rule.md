# Two-host rule

A full-disk search on one host does not establish global absence.

Machine A is Beexly, Windows, working tree C:/Users/Garrett/Sports-wt-intel. It has the Sports repo, the committed seed CSVs, and a local agent-bus directory. It does not have the shadow corpus.

Machine B is the host that held ~/workspace with 40-plus directories and the coaching producer scripts. This session did not reach it. Absence of those paths on Beexly is a Machine A fact, not a global fact.

The fix, when an artifact exists on only one host, is to commit it. A commit resolves on any checkout. Do not rsync secrets. Do not treat a missing path here as proof the file was never built.
