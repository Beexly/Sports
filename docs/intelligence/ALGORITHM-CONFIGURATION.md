# Algorithm Configuration Reference
## Parameters, Feature Flags, and Environment Variables for Sports Intelligence Algorithms

This document provides a reference for configuring and tuning the core algorithms used in the Sports prediction engine. Proper configuration ensures algorithms are applied appropriately for different use cases, data characteristics, and risk tolerances.

---

## 1. Anytime-Valid Ledger Configuration

**File**: `packages/prediction-engine/src/anytime-ledger.ts`  
**Key Constants**: Located at the top of the file

### 🔧 **Primary Configuration**
```typescript
// Confidence sequence range (controls sensitivity to deviations)
export const ANYTIME_RANGE_UNITS = 20;  // Default: 20 units

// E-process tuning parameters (advanced)
const ALPHA = 0.05;                     // Significance level (hardcoded in some places)
const PSI = function(x: number): number { return x * x / 2; };  // Shape function
```

### 🎯 **Usage Guidelines**
- **Lower values** (e.g., 5-10): More sensitive to early deviations, higher false positive risk
- **Higher values** (e.g., 30-50): More conservative, requires stronger evidence for significance
- **Typical ranges by use case**:
  - Performance monitoring: 15-25 units
  - Early warning systems: 8-12 units  
  - High-stakes validation: 25-40 units

### ⚙️ **Runtime Override Pattern**
While primarily configured via constants, some usages accept range options:
```typescript
// In public-roi-policy.ts:
const anytime = anytimeValidLedger(input.returns, { 
  range: ANYTIME_RANGE_UNITS  // Can be overridden per-call
});

// For custom ranges:
const customAnytime = anytimeValidLedger(returns, { range: 15 });
```

### 📊 **Monitoring & Tuning**
- Track `anytime.current.logEValue` over time - should fluctuate around 0 under null
- Monitor `anytime.everRejected` rate - should be ~ALPHA under proper calibration
- Adjust based on observed false positive/negative rates in your specific application

---

## 2. Logit Pool Test Configuration

**File**: `packages/prediction-engine/src/edge-lab/logit-pool.ts`  
**Key Parameters**: Function arguments and internal constants

### 🔧 **Function Signature**
```typescript
export function logitPoolTest(args: {
  modelProbs: number[];     // [0,1] predicted probabilities
  marketProbs: number[];    // [0,1] market implied probabilities  
  outcomes: number[];       // 0 or 1 actual outcomes
}): LogitPoolResult
```

### ⚙️ **Internal Tuning Parameters**
```typescript
// Optimization settings (internal to logitPoolTest)
const MAX_ITERATIONS = 100;
const TOLERANCE = 1e-6;
const REGULARIZATION_LAMBDA = 0.01;  // Prevents extreme beta values

// Verdict thresholds (can be adjusted based on risk tolerance)
const BETA_POSITIVE_THRESHOLD = 0.05;   // Minimum meaningful edge
const BETA_NEGATIVE_THRESHOLD = -0.05;
```

### 🎯 **Usage Guidelines**
- **Input Requirements**: Equal-length arrays, synchronized timestamps
- **Data Quality**: Remove outliers, ensure no perfect separation (leads to non-convergence)
- **Interpretation Calibration**:
  - `beta > 0`: Model gives higher probabilities to actual winners than market
  - `beta < 0`: Market is better calibrated than model
  - `|beta| < 0.05`: Practically insignificant difference
  
### 📊 **Advanced Configuration**
For specialized use cases, consider modifying:
```typescript
// In the actual implementation, these affect behavior:
// - Link function (currently logit, could be probit or others)
// - Weighting scheme (currently uniform, could be precision-weighted)
// - Regularization type (L2 shown, could be L1 or elastic net)
// - Optimization algorithm (currently simple gradient descent)
```

### 🔬 **Research Applications**
- **Model Selection**: Compare multiple models using same market/outcomes
- **Feature Ablation**: Test value of specific feature sets
- **Temporal Analysis**: Rolling window logit pool to detect regime changes
- **Segmentation**: Apply to specific game types, player tiers, or situations

---

## 3. Conformal Calibration Configuration

**File**: `apps/web/lib/calibration/conformal-calibration.ts`  
**Key Parameters**: Function arguments and internal thresholds

### 🔧 **Function Signature**
```typescript
export function conformalRdPosture(args: {
  input: {
    modeledProbability: number;   // [0,1] from your model
    calibrationHealth: number;    // [0,1] measure of model calibration
    intervalLow: number;          // Lower bound of prediction set
    intervalHigh: number;         // Upper bound of prediction set
    targetRiskLevel: number;      // Desired error rate (e.g., 0.1 for 90% coverage)
  }
}): { abstain: boolean; side: Side | null; margin: number; reason: string }
```

### ⚙️ **Internal Decision Thresholds**
```typescript
// Risk tolerance adjustments (internal constants)
const MIN_CALIBRATION_HEALTH = 0.6;    // Reject if calibration too poor
const MAX_INTERVAL_WIDTH = 0.8;        // Reject if prediction set too wide
const MIN_MARGIN_FOR_CONFIDENCE = 0.05; // Minimum edge to make call
```

### 🎯 **Usage Guidelines**
- **targetRiskLevel**: Directly controls conservatism
  - 0.01 (99% coverage): Very conservative, frequent abstention
  - 0.05 (95% coverage): Standard scientific threshold  
  - 0.10 (90% coverage): Balanced approach
  - 0.20 (80% coverage): Aggressive, rare abstention
  
- **calibrationHealth**: Should come from recent calibration measurement
  - Typical sources: Brier score transformation, ECE, or reliability diagrams
  - Range [0,1] where 1 = perfect calibration

- **intervalLow/high**: Should come from your uncertainty quantification method
  - Examples: Bayesian credible intervals, bootstrap percentiles, ensemble spread

### 📊 **Advanced Configuration**
For specialized uncertainty quantification:
```typescript
// Different conformity score functions (currently using modeled probability)
// Could use: residuals, p-values, Bayesian posteriors, etc.

// Alternative risk measures (currently using simple interval straddle)
// Could use: expected loss, value-at-risk, etc.

// Different decision rules (currently: abstain if interval contains 0.5)
// Could be: optimal decision under loss function, etc.
```

### 🔬 **Research Applications**
- **Risk-sensitive domains**: Player props where mistakes are costly
- **Novel situations**: High uncertainty environments (rookie players, new schemes)
- **Conservative reporting**: When publication requires high confidence
- **Active learning**: Query strategy for labeling most uncertain examples

---

## 4. Brier Score Configuration

**File**: `apps/web/lib/calibration/brier.ts`  
**Note**: Pure function - minimal configuration needed

### 🔧 **Function Signature**
```typescript
export function brierScore(samples: readonly { 
  readonly probability: number; 
  readonly outcome: 0 | 1 
}[]): number
```

### ⚙️ **Related Configuration (in calibration modules)**
While Brier score itself has no parameters, its interpretation benefits from:
```typescript
// In calibration reporting modules:
// Climatological baseline (for skill score calculation)
const CLIMOLOGICAL_BASELINE = 0.25;  // For binary events with 50% base rate

// Decomposition weights (if using reliability-resolution-uncertainty)
// Typically: Brier = Reliability - Resolution + Uncertainty

// Sample size corrections (for small sample bias adjustment)
// See: Murphy (1973) and Bröcker & Smith (2007)
```

### 🎯 **Usage Guidelines**
- **Interpretation Context**: Always compare to relevant baseline
  - Perfect score: 0.0
  - Climatological: varies by base rate (p*(1-p))  
  - No skill: climatological baseline
  - Positive skill: below climatological
  
- **Sample Size Considerations**:
  - Minimum n ≈ 20-30 for rough estimates
  - n ≥ 100 for reliable comparisons
  - Apply bias correction for small samples
  
- **Binning Strategy** (for reliability diagrams):
  - Typical: 10 bins of equal probability width
  - Alternative: Equal sample size bins
  - Adaptive: Based on data density

### 📊 **Advanced Applications**
- **Brier Skill Score**: BSS = 1 - (Brier_model / Brier_ref)
- **Component Analysis**: Reliability, Resolution, Uncertainty decomposition
- **Threshold Brier**: For specific probability thresholds of interest
- **Spatial/Temporal Brier**: For analyzing calibration across dimensions

---

## 5. CLV (Closing Line Value) Configuration

**Access**: Via pick objects and calculation helpers  
**Location**: Distributed - see `pick-explainer/grounding.ts`, admin routes, etc.

### 🔧 **Data Requirements**
For accurate CLV calculation, need:
- **Opening line**: Line at time of bet/prediction
- **Current line**: Line at time of evaluation (often closing)
- **Bet outcome**: Win/Loss/Push (for monetary CLV)
- **Stake size**: Usually 1 unit for standardization
- **Odds format**: Consistent conversion to decimal implied probability

### ⚙️ **Calculation Variants**
Different implementations exist for different use cases:

#### **Probability Points CLV** (most common)
```typescript
// CLV in probability points = (model probability at bet time) - (market probability at close)
// Positive: model was more accurate than market
// Negative: market moved against model's prediction
const clvProbPoints = modelProbAtBet - marketProbAtClose;
```

#### **Monetary/Points CLV** 
```typescript
// For point spreads/totals:
// CLV in points = (line at bet time) - (line at close)
// Positive: got better number than closing line
// Negative: got worse number than closing line

// For moneylines (requires odds conversion):
// Convert both lines to implied probability, then compute probability points CLV
```

#### **Kelly-Weighted CLV**
```typescript
// Weight CLV by Kelly fraction to account for edge size
// More meaningful than raw CLV when edges vary significantly
```

### 🎯 **Usage Guidelines**
- **Timing Consistency**: Always compare same stimulus-to-response intervals
- **Line Source**: Use consistent line sources (same book, composite, etc.)
- **Outcome Clarity**: Define what constitutes win/loss/push for your sport/market
- **Stake Standardization**: Usually 1 unit unless analyzing actual betting records
- **Units Clarity**: Always specify if CLV is in probability points, points, or monetary units

### 📊 **Advanced Configuration**
- **Multiple Book CLV**: Use consensus or weighted average closing line
- **Time-Weighted CLV**: Give more weight to recent line movements
- **Expected CLV**: Model-based prediction of CLV before line movement occurs
- **CLV Decomposition**: Separate into timing skill, line movement prediction, and luck components

### 🔬 **Research Applications**
- **Line Movement Analysis**: What types of news move lines persistently?
- **Sharp Money Detection**: Do certain bettor types show persistent positive CLV?
- **Model Timing Evaluation**: Do we get better/worse lines than market average?
- **Sport/Market Comparisons**: Which markets offer most CLV opportunity?

---

## 6. Expected Value (EV) Calculation Configuration

**Primary Location**: `apps/web/lib/fantasy/props.ts`  
**Also Used**: Parlays, compliance rules, intelligence scoring

### 🔧 **Basic EV Functions**
```typescript
// From fantasy/props.ts - EV per $1 staked
export function calculateEV(probability: number, decimalOdds: number): number {
  return probability * (decimalOdds - 1) - (1 - probability) * 1;
}

// Kelly fraction for optimal stake sizing
export function kellyFraction(probability: number, decimalOdds: number): number {
  const edge = probability * (decimalOdds - 1) - (1 - probability);
  return edge / (decimalOdds - 1);
}
```

### ⚙️ **Related Configuration Parameters**
```typescript
// In various modules:
// Kelly fraction limits (for risk control)
const MAX_KELLY_FRACTION = 0.25;    // Never bet more than 25% Kelly
const HALF_KELLY = 0.5;             // Common safety factor
const QUARTER_KELLY = 0.25;         // Very conservative

// EV thresholds for action
const MIN_EV_FOR_ACTION = 0.01;     // 1% edge minimum to consider
const STRONG_EV_THRESHOLD = 0.10;   // 10% edge for high conviction
```

### 🎯 **Usage Guidelines**
- **Probability Calibration**: Garbage in, garbage out - use well-calibrated probabilities
- **Odds Source Consistency**: Use same source for odds that you use for probability comparison
- **Stake Sizing**: Always apply Kelly fraction or similar risk control to EV opportunities
- **Edge Definition**: Be clear whether EV includes vig/juice or is vig-free
- **Multi-leg Considerations**: For parlays, remember EV compounds but so does variance

### 📊 **Advanced Applications**
- **Expected Value of Sample Information (EVSI)**: Value of waiting for more data
- **Expected Value of Perfect Information (EVPI)**: Value of eliminating uncertainty
- **Risk-Adjusted EV**: Incorporate utility functions, bankruptcy risk, or volatility preferences
- **Dynamic EV**: Recalculate as new information arrives (connects to anytime-valid)

### 🔬 **Research Applications**
- **Prop Market Inefficiencies**: Where do systematic EV opportunities exist?
- **Line Shopping Value**: How much EV is gained from seeking best line?
- **Timing Strategies**: EV of betting early vs. late vs. middle
- **Information Value**: What types of data generate positive EV when modeled correctly?

---

## 🏗️ **Configuration Management Best Practices**

### **Environment Variables** (.env files)
While most algorithm parameters are hardcoded for stability, consider exposing:
```env
# .env.example
ANYTIME_RANGE_UNITS=20
LOGIT_POOL_MIN_BETA=0.05
CONFORMAL_TARGET_RISK=0.1
MIN_EV_THRESHOLD=0.01
MAX_KELLY_FRACTION=0.25
```

### **Feature Flags** (for A/B testing and gradual rollout)
Consider implementing for major algorithm changes:
```typescript
// Example feature flag pattern
if (process.env.USE_NEW_CONFORMAL_VERSION === 'true') {
  // Use updated conformal calibration
} else {
  // Use standard version
}
```

### **Configuration Validation**
Always validate configuration parameters:
```typescript
function validateAnytimeConfig(range: number): boolean {
  return range > 0 && range <= 100;  // Reasonable bounds
}

function validateEVThreshold(ev: number): boolean {
  return ev >= -1 && ev <= 1;  // Valid EV range for unit stake
}
```

### **Documentation & Change Control**
- Document any non-standard configurations in research briefs
- Version control algorithm configuration files
- Review configuration changes as part of model governance
- A/B test significant configuration changes before full deployment

---

## 📋 **Quick Reference Tables**

### **Anytime-Valid Ledger**
| Parameter | Typical Range | Effect of Increase |
|-----------|---------------|-------------------|
| ANYTIME_RANGE_UNITS | 10-40 | Decreases sensitivity, increases required evidence |
| ALPHA (implicit) | 0.01-0.10 | Increases false positive rate |

### **Logit Pool Test**  
| Parameter | Typical Range | Effect |
|-----------|---------------|--------|
| BETA_THRESHOLD | 0.03-0.10 | Higher = requires stronger evidence for model superiority |
| REGULARIZATION | 0.001-0.1 | Higher = more conservative beta estimates |

### **Conformal Calibration**
| Parameter | Typical Range | Effect |
|-----------|---------------|--------|
| TARGET_RISK_LEVEL | 0.01-0.20 | Lower = more conservative, more abstention |
| MIN_CALIBRATION_HEALTH | 0.5-0.8 | Higher = stricter calibration requirement |
| MAX_INTERVAL_WIDTH | 0.5-0.9 | Lower = more likely to abstain on wide sets |

### **EV Calculations**
| Parameter | Typical Range | Effect |
|-----------|---------------|--------|
| MIN_EV_THRESHOLD | 0.005-0.02 | Higher = fewer opportunities acted upon |
| MAX_KELLY_FRACTION | 0.1-0.3 | Higher = more aggressive betting |
| SAFETY_FACTOR | 0.25-0.5 | Lower = more conservative stake sizing |

---

*This configuration guide should be used in conjunction with:*
- `docs/intelligence/ALGORITHM-USAGE-GUIDE.md` (when to apply each algorithm)
- Source code files referenced in each section
- Domain-specific calibration and validation procedures
*Last updated: [(timestamp)]*