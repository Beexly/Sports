# NGS coverage, PFF uniqueness, Zoo, and the cited papers

Opened on 2026-10-22. The image `NGSAWS.png` is the framework figure from the AWS post: tracking and labels, a CNN per frame, self-attention, a play embedding, a linear layer, then an ensemble for classification, t-SNE for discovery, and Grad-CAM for interaction highlights.

The string `tel:6186262017` is the Grad-CAM citation mangled by the page. The AWS source says Proceedings of the IEEE international conference on computer vision, pp. 618-626, 2017. It is not a phone number.

## What the sources actually say

NFL and AWS, 2023. Eight classes: Cover 0 Man, Cover 1 Man, Cover 2 Man, Cover 2 Zone, Cover 3 Zone, Cover 4 Zone, Cover 6 Zone, and Prevent. Prevent is zone. Tracking is 10 frames per second. A frame is a defender-by-offense image. Relative features are the difference between the defensive and offensive player. The CNN uses a 1x1 kernel so player order does not matter. Self-attention weighs frames. The play embedding is the average of the attention embeddings. The ensemble of 5 averages the model outputs. Label smoothing is used because charting labels are noisy. Their reported 2021 test numbers, not re-run here: Zoo 68.8%, CNN-LSTM 86.5%, one CNN-attention model 87.7%, ensemble of 5 88.9% accuracy on eight coverages. Top-2 for the ensemble is 97.6%. Man versus zone is 95.4%.

Gordeev and Singer, Kaggle 2020, first place. A 2D CNN on relative location and speed. They replace reported speed with displacement times 10. Acceleration is scaled by `(Dis / S) / 0.1`. They clip the rush target to -30 and 50 yards. Y-flip augmentation. Transformers, label smoothing, and Voronoi features did not help that rushing model. The coverage model later used attention and label smoothing anyway, on a different task.

Seth and Weisman, PFF, 2021. Six k-means clusters of coverage frequencies, then PCA. Uniqueness is how far a team's PCA point is from the origin. Uncommon coverages, Cover 4 and Cover 6 in their writeup, pull a team away from the origin. They say uniqueness does not by itself mean fewer EPA per pass. Their 2020 ranking was not remeasured.

Alammar, 2018, is CC BY-NC-SA. The post was read. Its text was not copied. The attention formula used here is Vaswani et al., 2017.

## Added

- `packages/prediction-engine/src/nfl/coverage-scheme.ts`: the eight classes, defender-minus-offense deltas, the 10 Hz speed correction, the mean ensemble, PCA-origin uniqueness, and the neighbor-mismatch review rate.
- `packages/prediction-engine/src/models/label-smoothing.ts`: Müller, Kornblith, and Hinton, 2019. Epsilon is a caller input. NGS did not publish theirs.
- `packages/prediction-engine/src/models/scaled-dot-product.ts`: softmax of the scaled dot product.
- `packages/prediction-engine/src/models/grad-cam.ts`: channel weight is the mean gradient, then ReLU. Guided Grad-CAM is that map times the guided-backprop signal.

The 2D t-SNE embedding was not optimized. The neighbor conditional and its perplexity are in `packages/prediction-engine/src/evaluation/neighbor-conditional.ts`. The mismatch rate still flags a play for review and does not relabel it.
