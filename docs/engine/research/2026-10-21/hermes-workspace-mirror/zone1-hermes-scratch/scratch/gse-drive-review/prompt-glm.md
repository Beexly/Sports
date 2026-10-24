You are reviewing a local Google Drive dump for the GSE reasoning engine. Read files. Do not modify anything under G:\ or C:\Users\Garrett\Sports.

Folder (Windows path):
G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26

Your slice: PDF papers only (*.pdf) in that folder, not in subfolders of zips. Skip duplicate filenames that end in " (1).pdf" or " (2).pdf". If a PDF is 0 bytes or will not open, record the path and "unreadable", do not invent its contents.

Already implemented on branch motif/gse-intelligence-build-2026-10-02 (do not recommend rebuilding these):
- bridge-model.ts logistic bridge with homeSign, sample counts, refusal below 200 rows
- from-bridge.ts reads stored premises and refuses when none are stored
- iWinRNFL 1704.00197v3 (home edge 2.1778, 1187 games, MAE 11.348, sigma 14 unfitted)
- 4th-down matrix 1601.04302 (3464 go plays, 1866 converted = 0.539, not the paper's 0.779)
- dynamic multi-week ratings, commit 1758cfa0d
- compile-time slate barrier: WITHHELD and INSUFFICIENT cannot be a slate trace
- calibration seam on feat/trueprob-calibration-boundary already passes probabilityCalibrator at both assessIndependentEdge call sites and is pushed

Known gap: a published pick from scoreGames / process-sport does not consult a reasoning trace. Closing that is the frontier. Do not invent Dirichlet process priors, do-calculus, or a calibration map. Do not copy paper text. Learn the method. Restrictive license = research only.

Write this file, and only this file:
C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\glm-papers.md

For each paper you actually opened, one block:
- file name
- one-line method (your words)
- already implemented / new / blocked
- whether it can supply a directional premise with a real sample count
- whether it belongs on the pick path, in shadow, or nowhere
End with at most 5 concrete next wires, each naming a file in the live repo or saying "no live file yet". No victory language. No invented numbers.
