# BDB 2025 coaching deck — pre-snap clustering -> coverage prediction (method)

"Data Driven Gameplans: Transforming Pre-Snap Data into Post-Snap Results", Jake Allison & Kratik
Malhotra, NFL Big Data Bowl 2025 coaching track (20 pages, PDF at
`extracted_data/kaggle/gp/DataDrivenGameplans_Allison.pdf`).

## Method, verbatim
- Pre-snap inputs: down, distance, field position, **hash (five buckets: L, L-Mid, Mid, R-Mid, R)**,
  offensive personnel (RB/FB count, TE count), score differential, and **per-player pre-snap position
  clusters**.
- Clustering: positions of each WR/TE/RB/FB (and CB/FS/SS/ILB) stored **relative to the ball**, then
  **k-means per player** on the snap x/y, cluster number + x/y fed to a neural network.
- Post-snap outputs predicted: run/pass, man/zone, coverage shell (Cover 1, Cover 3, …).

## Worked examples they give
- Devin Duvernay on the right side on the line (clusters 6/12/1) -> Baltimore runs slightly more than
  it passes; off the line changes the split.
- Jevon Holland within 10 yards of the ball (clusters 12/2/7/3) -> "greatly increases the likelihood"
  of man coverage; cluster 13 uninformative.

## Why it matters
This is a *pre-snap-only* coverage predictor with a player-specific spatial basis, i.e. exactly the
"pre-snap motion/alignment as diagnostic trigger" idea in the mission brief, minus the motion
component. The clustering step is the transferable trick: it quantifies leverage per player rather
than using raw coordinates, which the BDB 2027 `lined_up_position` and `defenderLocation` codes
already approximate categorically.

# Also pulled — helmet laboratory results
`fedecarranza/2023-helmet-laboratory-testing-performance-results` (DbCL-1.0): a ranked helmet table
with three verdict columns (better laboratory performance / not recommended / newly prohibited).
Physical-equipment covariate for injury work, 711 bytes, trivial to join by helmet model.

# Blocked, stated
Helmet-assignment competition files still 403 — `kaggle competitions download` requires the rules to
have been accepted on the web, and `kaggle` has no join command; the `/api/v1/competitions/join`
guesses 404'd. Mirrors exist (frames 320x180, 193 MB) but ship no labels.
