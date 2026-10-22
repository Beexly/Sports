# AWS/NGS "Pressure Probability" — architecture of a private NGS stat

Source: AWS for M&E Blog, Ari Entin, 20 SEP 2023, "Tackling Next Gen Stats: How AWS is using AI to
advance sports analytics with the NFL" (English body harvested from the page).

## What it is
The NFL's NGS team and the AWS Generative AI Innovation Center built a suit of pressure analytics
inspired by 2023 Big Data Bowl submissions: per-defender pressure, pressure magnitude over a play,
blocking responsibility and credit, double teams, unblocked rushers. Two figures describe the
system: a pressure-score estimator (team and player level) and an automated blocker/rusher identifier.

## Data and model specifics (verbatim facts worth pinning)
- **>90,000 passing plays over five seasons**, tracking captured **10 times per second** — x/y
  coordinates, velocities and orientations of every player, per play.
- Blocker/rusher identification: baseline positional models -> dynamic-variable models (speed,
  distance, orientation) -> **graph neural network** treating each player as a node. Production model
  is **AutoGluon**, **>99% accuracy**, **183 features**, over the first 3 seconds of the play.
- Pressure score: neural nets were tried and abandoned as unstable; the shipped approach is
  **one-player-at-a-time prediction with heavy feature engineering**.
- "Situational average player" — the counterfactual *"how would an average player have done in that
  situation instead of Player X?"* — is a **transformer over ~200,000 play snippets**.

## Why this matters to this KB
The situational-average-player transformer is the documented mechanism behind ghost-defender style
"expected positioning" products: a learned baseline agent distribution, with the player's residual
against it as the metric. That gives a concrete architecture for the Ghosts item in the mission
brief instead of a pure guess. The 183-feature blocker/rusher classifier is likewise a spec for
pre-snap/post-snap role labelling.

## Reconstruction notes (ours, not theirs)
- 10 Hz x/y/v/orientation per player is the feature substrate; public BDB releases carry the same
  shape, so the pipeline is reproducible on open data.
- One-player-at-a-time framing means the target is a per-player Bernoulli with engineered context,
  not a joint field model — cheaper and, per the article, more stable than the neural alternative.
