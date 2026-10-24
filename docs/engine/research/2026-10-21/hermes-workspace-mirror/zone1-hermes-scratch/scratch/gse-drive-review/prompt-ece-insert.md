Read-only. Do not modify any repo.

identical-row-bakeoff.ts and calibration-map-bakeoff.ts report raw ECE. debiasedExpectedCalibrationError exists in apps/web/lib/calibration/ece-debiased.ts. equalMassEce exists in packages/prediction-engine/src/calibration-map.ts.

For each bakeoff file, name the function, the line that computes raw ECE, and whether adding a second field (debiased, raw left unchanged) would change a published pick. Quote the publish path if any caller of those bakeoffs writes a pick. If no caller writes a pick, say diagnostic-only.

Write C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\ece-insert.md
