# GSE Conformal Diagnostic Residual Flag & Sealed EPA Dropoff Specification

Source: Grok-2 Shared Specification (2026-10-26)
Status: Integrated into Tuesday Lock & Invariance Protocol

---

## 1. Conformal Diagnostic Residual Flag

The sealed model emits a total for each game $\hat{y}_i$. An external total (after multiplicative de-vig) is observed. The residual is defined as:

$$r_i = \text{sealed model total}_i - \text{external total}_i$$

### Empirical Quantile Calculation
The absolute residuals from the sealed process are sorted:

$$|r|_{(1)} \le |r|_{(2)} \le \dots \le |r|_{(n)}$$

The empirical quantile at coverage level $1 - \alpha$ is the finite-sample order statistic:

$$\hat{q} = |r|_{(\lceil (1-\alpha)(n+1)\rceil)}$$

### Decision Rule
Any game where $|r_i| > \hat{q}$ triggers a **Residual Flag**.

- **Strict Diagnostic Boundary:** The flag indicates an external market total sitting outside the empirical residual band generated under the sealed process.
- **Invariance Guarantee:** It is strictly diagnostic. It **does NOT** change sealed ratings, the EPA dropoff table, the ranking, the prediction, or the `coachMindsetHash`.

---

## 2. Conformal Prediction Interval

For game $i$ with sealed model total $\hat{y}_i$, the conformal prediction interval at significance level $\alpha$ is:

$$\mathcal{C}_{1-\alpha}(\hat{y}_i) = \left[ \hat{y}_i - \hat{q},\; \hat{y}_i + \hat{q} \right]$$

- Any external market total falling outside this interval generates a diagnostic flag.
- The interval represents the exact region of external totals statistically consistent with the residual distribution established under the sealed coach mindset.

---

## 3. Sealed EPA Dropoff Table

### Definition & Hashing
The **EPA Dropoff Table** is a sealed, immutable lookup table recording the expected-points-added residual remaining when any given player or positional tier is removed.

- **Inclusion in Tuesday Seal:** The entire serialized table is hashed directly into the `coachMindsetHash` on the Tuesday `v1.0` lock at 04:00 CT.
- **Injury Execution:** When an injury occurs (Wed $v2.0$, Fri $v3.0$, Sun T-90 $v4.0$), the engine queries the sealed dropoff value for the inactive player and reallocates that residual down the depth chart exclusively under the already-sealed parameters.
- **Zero-Drift Constraint:** Because the table itself resides inside the hashed object, the operator leaves `coachMindsetHash` byte-for-byte unchanged across all injury versions.
- **Zero Mid-Week Re-estimation:** The table is never recalibrated or adjusted post-seal based on market closing lines, practice reports, or external observations.
