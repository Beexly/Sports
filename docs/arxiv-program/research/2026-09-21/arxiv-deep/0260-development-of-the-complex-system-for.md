# 0260 Development of the complex system for the remote monitoring of the human heart rate (arXiv:2010.13629v1)

**Citation:** A. A. Kramov and O. S. Bauzha (2020; underlying article dated 2016). *Development of the complex system for the remote monitoring of the human heart rate*. arXiv:2010.13629v1. URL: https://arxiv.org/abs/2010.13629v1
**Ledger completed:** 2026-09-21. **Read:** full text (local extract, 296 lines, including references).
**Verdict:** REJECT — a hobbyist hardware telemetry prototype with no validation, no equations, and no quantitative results; nothing here transfers to GSE modeling beyond the generic idea of a real-time data pipeline.

## 1. Research question

The paper describes the construction of a low-cost, small-series device for the remote, real-time monitoring of a human heart rate: a photoplethysmography (PPG) pulse sensor feeds an ATmega8 microcontroller, which relays readings over Bluetooth (paired HC-05 modules) to an Arduino Uno, which forwards them over Ethernet (ENC28J60) to a browser-based WebSocket/JSON interface. The implicit question is whether such a system can be built cheaply (~$20 in small series) and operate in real time with arrhythmia flagging. It is an engineering build log, not a hypothesis-driven study.

## 2. Dataset / schema

No experimental dataset is reported. The paper describes a data pipeline, not data collection: PPG sensor readings → UART serial → Bluetooth → Arduino → Ethernet → JSON messages → browser visualization. There is no cohort, no recording duration, no sample size, no schema of a stored dataset, and no downloadable data. The only "signal" mentioned is a real-time heart-rate value streamed to a web client, with tachycardia/bradycardia flagged when the measured rate deviates from a threshold. Access: not applicable — nothing was collected or published.

## 3. Method / model

Hardware/software chain as stated in the paper:
1. Pulse sensor based on photoplethysmography (optical measurement of blood-volume change in microvascular tissue) → ATmega8 microcontroller.
2. ATmega8 transmits over UART at a stated 38,600 baud (sic) to an HC-05 Bluetooth module.
3. A paired HC-05 module receives the stream and passes it to an Arduino Uno.
4. Arduino Uno forwards via SPI to an ENC28J60 Ethernet controller (3.3 V, 25 MHz crystal) for internet delivery.
5. Browser client receives JSON over WebSocket and renders the heart rate in real time.
6. The ATmega8 clock was adjusted to 16 MHz to match the Arduino's timing. Arrhythmia detection is simple threshold deviation: heart rate above/below set bounds is reported as tachycardia/bradycardia. Approximate small-series production cost stated as $20.

## 4. Equations & assumptions

No equations stated. The paper contains no mathematical model — no signal-processing formulation, no filtering equations, no detection-theory derivation, no error model. The only quantitative technical parameters stated are: UART speed 38,600 baud; 16 MHz clocks on ATmega8 and Arduino Uno; ENC28J60 supply 3.3 V with a 25 MHz crystal; approximate cost $20.

## 5. Features / target

Not a modeling paper. The "input" is a raw PPG waveform sampled by the pulse sensor; the "target" is a real-time heart-rate value displayed in a browser, plus binary tachycardia/bradycardia flags from threshold crossings. No feature engineering, no label definition beyond the threshold, no prediction horizon (it is monitoring, not forecasting).

## 6. Validation design

None. The paper reports no experiment: no test subjects, no recording sessions, no comparison against a reference device (e.g., ECG), no accuracy/latency/false-alarm measurement, no train/test or any evaluation protocol. Validation is asserted by construction ("the system works"), not measured.

## 7. Numerical results / baselines

There are effectively no results. The only numbers in the paper are the hardware parameters listed in §4 and the ~$20 cost estimate. No heart-rate accuracy figure, no Bland-Altman or correlation vs ECG, no latency measurement, no packet-loss rate, no power-consumption figure, no sample size of any test. The claim that the device detects tachycardia and bradycardia is presented without a single measured true/false positive.

## 8. Code / data availability

None stated. No repository, no firmware source, no schematic, no dataset, no URL of any kind beyond the arXiv listing itself.

## 9. Leakage & limitations

- **No validation whatsoever** — the core claim (remote heart-rate monitoring works) is untested against any ground truth.
- **Threshold-only arrhythmia logic** — flagging on raw rate deviation with no filtering, artifact rejection, or motion-artifact handling makes the tachycardia/bradycardia detector clinically and practically meaningless; PPG is notoriously motion-sensitive.
- **Obsolete hardware stack** — HC-05 Bluetooth 2.0 modules, ATmega8, and ENC28J60 Ethernet are a 2010s hobbyist chain; the UART "38,600 baud" figure is nonstandard (38,400 is the standard rate), suggesting the parameters were not carefully verified.
- **No security or privacy design** — unencrypted Bluetooth serial and plain WebSocket JSON carrying health data; unsuitable for any real deployment.
- **No external validity to NFL/GSE** — consumer heart-rate telemetry has no connection to GSE's modeling problems (probabilities, markets, player valuation).

## 10. GSE overlap

**No overlap and no new capability.** Nothing in Garrett's existing-research map touches wearable hardware, physiological telemetry, or PPG signal processing — and nothing in GSE's product surface needs it. The 2026-09-18 ML brief lists "multimodal fusion" as a commissioned topic, but that refers to fusing data modalities for prediction, not building pulse sensors. At most, the paper is a generic reminder that real-time JSON/WebSocket telemetry pipelines are cheap to build — an architecture pattern, not a method. This is firmly outside the 500-paper program's value surface.

## 11. GSE implementation spec

No implementation is recommended. If GSE ever needed a real-time telemetry pattern (e.g., streaming live odds or play events to a dashboard), the standard approach would be a managed message bus / WebSocket gateway, not this hardware chain. Estimated effort for any transferable piece: zero — there is no transferable piece.

## 12. Reproducible test

Not applicable — there is no model, no dataset, and no claimed numeric result to reproduce. Any "test" would be rebuilding the hardware, which has no bearing on GSE's engine.

## 13. Acceptance / rejection gate

REJECT unconditionally as GSE methodology. The gate it fails at the threshold: no equations, no validation design, no reported numbers, no code — it does not meet the minimum bar of a research input to the engine. File retained only as a program-completeness record.

## 14. Improvement experiment

If the underlying goal (cheap remote cardiac monitoring) were ever relevant, the correct next experiment would be a validation study, not more hardware: record simultaneous PPG (this device) and ECG (reference) on ≥ 30 subjects across rest/activity states, report mean absolute heart-rate error and false-alarm rates for the threshold detector, then replace the threshold with a proper artifact-rejecting pipeline. None of this serves GSE, so it is noted here only for completeness.
