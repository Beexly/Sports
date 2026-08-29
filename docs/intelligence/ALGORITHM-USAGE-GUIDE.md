# Algorithm Usage Guide
## When and How to Apply Sports Intelligence Algorithms

This guide provides clear decision criteria for selecting and applying the core algorithms implemented in the Sports prediction engine. Each algorithm serves a specific purpose in the intelligence pipeline and should be applied based on the nature of the data, the research question, and the desired output.

---

## 1. Anytime-Valid Ledger (Sequential Validation)

**File**: `packages/prediction-engine/src/anytime-ledger.ts`  
**Usage**: `import { anytimeValidLedger } from "@sports/prediction-engine"`  
**Config**: `ANYTIME_RANGE_UNITS = 20` (units for confidence sequence)

### 🎯 **Purpose**
Provides sequential validation for betting performance metrics with guaranteed false positive control under optional stopping. Enables valid inference even when peeking at intermediate results.

### 📊 **When to Use**
- **Performance validation over time** (ROI, win rate, profitability)
- **Sequential data streams** where decisions are made as data arrives
- **A/B testing** of betting strategies or model versions
- **Monitoring calibration drift** in production models
- **Any metric requiring valid sequential testing** ( Sharpe ratio, calibration error, etc.)

### 🚫 **When NOT to Use**
- Static batch analysis where all data is available upfront
- Non-sequential metrics that don't accumulate over time
- Cross-sectional comparisons between different populations

### ⚙️ **How to Apply**
```typescript
// Prepare sequential returns (1 unit stake per bet)
const returns: number[] = [
  // WIN: +odds (e.g., +110 → 1.1)
  // LOSS: -1.0
  // PUSH: 0.0
  // VOID: exclude from sequence
];

// Initialize anytime-valid ledger
const anytime = anytimeValidLedger(returns, { range: ANYTIME_RANGE_UNITS });

// Access valid confidence sequences
const evidence = {
  logEValue: anytime.current.logEValue,        // log of e-process
  everSignificant: anytime.everRejected,       // has significance been detected?
  firstSignificantAtN: anytime.firstRejectedAt, // when first detected
  lowerBound: anytime.lowerBound,              // valid lower confidence bound
  upperBound: anytime.upperBound               // valid upper confidence bound
};
```

### 🔬 **Research Lab Applications**
- **Player Context Brief**: Validate usage trend significance over time
- **Game Context Brief**: Track line movement validation sequentially  
- **Market Movement Brief**: Test if line movement persists after initial spike
- **Rumor Triage Brief**: Sequential validation of weak signal persistence

### 📚 **References**
- Howard et al. (2020): "Time-Uniform, Central Limit, and Laws of the Iterated Logarithm via Gambling"
- Johari et al. (2022): "Always Valid Confidence Sequences"
- Implementation follows Algorithm 1 from anytime-ledger.ts

---

## 2. Logit Pool Test (Model Calibration Assessment)

**File**: `packages/prediction-engine/src/edge-lab/logit-pool.ts`  
**Usage**: `import { logitPoolTest } from "@sports/prediction-engine/edge-lab"`  

### 🎯 **Purpose**
Tests whether a probabilistic model's predictions are well-calibrated against market prices using a weighted logistic regression framework. Provides evidence for or against model superiority.

### 📊 **When to Use**
- **Model validation** against market prices or competitor models
- **Calibration assessment** of probability forecasts
- **Evidence synthesis** for model improvement decisions
- **Comparing different model versions** or feature sets
- **Assessing value extraction** from specific signals or features

### 🚫 **When NOT to Use**
- Binary outcomes without probability forecasts
- Non-probabilistic models (ranking-only, classification without probabilities)
- When market prices are unavailable or unreliable

### ⚙️ **How to Apply**
```typescript
interface LogitPoolResult {
  verdict: 'REFINE' | 'IGNORE' | 'USE';  // Model assessment
  beta: number;                          // Logit pool coefficient
  betaCI: [number, number];              // Confidence interval
  pValue: number;                        // Significance test
  converged: boolean;                    // Optimization status
  // ... additional diagnostics
}

// Prepare aligned sequences:
// modelProbs: [0.6, 0.4, 0.7, ...] - your model's predicted probabilities
// marketProbs: [0.55, 0.35, 0.65, ...] - market implied probabilities  
// outcomes: [1, 0, 1, ...] - actual binary results

const result = logitPoolTest({
  modelProbs: modelProbabilities,
  marketProbs: marketProbabilities, 
  outcomes: actualOutcomes
});

if (result.verdict === 'USE' && result.pValue < 0.05) {
  // Model provides significant value beyond market
} else if (result.verdict === 'REFINE') {
  // Model needs calibration improvement
} else {
  // Model provides no significant value
}
```

### 🔬 **Research Lab Applications**
- **Prop Market Brief**: Test if prop model beats market prices
- **Game Context Brief**: Validate game win probability model
- **Player Context Brief**: Test usage prediction models
- **Competitor Research Brief**: Compare against competitor models
- **Content/SEO Brief**: Validate predictive claims for articles

### 📚 **References**
- Based on weighted logistic regression framework
- Similar to "probability integral transform" tests
- Implementation follows edge-lab/logit-pool.ts

---

## 3. Conformal Calibration (Uncertainty Quantification)

**File**: `apps/web/lib/calibration/conformal-calibration.ts`  
**Usage**: `import { conformalRdPosture } from "@/lib/calibration/conformal-calibration"`  

### 🎯 **Purpose**
Produces prediction sets with guaranteed marginal coverage (e.g., 90% of sets contain true outcome). Enables principled abstention when uncertainty is too high for confident decisions.

### 📊 **When to Use**
- **Decision making under uncertainty** where confidence thresholds matter
- **Risk-averse applications** where wrong decisions are costly
- **Setting adaptive confidence thresholds** based on data difficulty
- **Providing calibrated uncertainty estimates** to end users
- **When prediction sets are more useful than point predictions**

### 🚫 **When NOT to Use**
- When point predictions are sufficient and uncertainty is low
- High-throughput applications where computation cost matters
- When marginal coverage guarantees are not needed
- Real-time systems with strict latency requirements (<1ms)

### ⚙️ **How to Apply**
```typescript
// Inputs from your model:
const modeledProbability = 0.65;      // P(over) from your model
const calibrationHealth = 0.85;       // [0,1] measure of calibration quality
const intervalLow = 0.45;             // Lower bound of prediction set
const intervalHigh = 0.80;            // Upper bound of prediction set
const targetRiskLevel = 0.1;          // Desired error rate (e.g., 10%)

const { abstain, side, margin, reason } = conformalRdPosture({
  input: {
    modeledProbability,
    calibrationHealth,
    intervalLow,
    intervalHigh,
    targetRiskLevel
  }
});

// abstain: true if prediction set straddles decision boundary
// side: "over" or "under" if confident recommendation possible  
// margin: distance from decision boundary to nearest set bound
// reason: explanation for the decision
```

### 🔬 **Research Lab Applications**
- **Prop Market Brief**: Abstain when uncertain about prop line value
- **Game Context Brief**: Refrain from picking games with high uncertainty
- **Player Context Brief**: Withhold recommendations for volatile players
- **Market Movement Brief**: Avoid acting on noisy line movements
- **Content/SEO Brief**: Flag uncertain claims for additional verification

### 📚 **References**
- Vovk et al. (2005): "Algorithmic Learning in a Random World"
- Romano et al. (2020): "Classification with Valid and Adaptive Coverage"
- Gibbs & Candès (2021): "Adaptively Conformal Inference"
- Implementation follows conformal-calibration.ts

---

## 4. Brier Score (Calibration Measurement)

**File**: `apps/web/lib/calibration/brier.ts`  
**Usage**: `import { brierScore } from "@/lib/calibration/brier"`  

### 🎯 **Purpose**
Measures the accuracy of probabilistic predictions. Lower scores indicate better calibration and refinement. Decomposable into reliability, resolution, and uncertainty components.

### 📊 **When to Use**
- **Calibration assessment** of probability forecasts
- **Model comparison** where calibration is primary concern
- **Tracking calibration drift** over time or across populations
- **Evaluating calibration improvements** from model updates
- **Benchmarking against climatological or baseline predictors**

### 🚫 **When NOT to Use**
- When sharpness (resolution) is more important than calibration
- Applications requiring proper scoring rules with different characteristics
- Binary classification where log loss or other metrics are preferred
- When only classification accuracy matters, not probability quality

### ⚙️ **How to Apply**
```typescript
interface CalibrationSample {
  probability: number;    // Predicted probability [0,1]
  outcome: 0 | 1;         // Actual binary outcome
}

const samples: CalibrationSample[] = [
  { probability: 0.7, outcome: 1 },
  { probability: 0.3, outcome: 0 },
  // ... more samples
];

const brier = brierScore(samples);
// Returns: float in [0,1] where 0 = perfect, 0.25 = coin flip, 1 = worst

// For decomposition (see calibration modules):
// Brier = Reliability - Resolution + Uncertainty
```

### 🔬 **Research Lab Applications**
- **Player Context Brief**: Calibrate usage prediction models
- **Game Context Brief**: Assess win probability model calibration  
- **Prop Market Brief**: Evaluate prop probability models
- **Fantasy Decision Brief**: Calibrate start/sit probability models
- **Coach/Scheme Change Brief**: Validate scheme impact predictions

### 📚 **References**
- Brier (1950): "Verification of Forecasts Expressed in Terms of Probability"
- Murphy (1973): "A new vector partition of the probability score"
- Steinwart (2007): "How to Compare Different Loss Functions"
- Implementation follows brier.ts

---

## 5. CLV (Closing Line Value) Tracking

**Locations**: Multiple (see pick-explainer/grounding.ts, admin routes, performance policies)  
**Access**: Via pick objects (`pick.clvValue`, `pick.clvVerdict`, `pick.clvKind`)

### 🎯 **Purpose**
Measures the value obtained relative to the closing line, accounting for both line movement and betting outcome. Attributes performance to skill vs. luck.

### 📊 **When to Use**
- **Performance attribution** separating skill from line movement luck
- **Evaluating timing skill** (betting early vs. late)
- **Assessing model value** independent of market efficiency
- **Line movement analysis** and sharp money detection
- **Long-term tracking** of handicapper skill

### 🚫 **When NOT to Use**
- Evaluating single bets in isolation (too noisy)
- When line data is unavailable or unreliable
- Short-term results where variance dominates
- Non-market sports where closing line concept doesn't apply

### ⚙️ **How to Apply**
```typescript
// Available directly from pick data after settlement
interface Pick {
  clvValue?: number;      // CLV in points or probability points
  clvVerdict?: string;    // "BEAT_CLOSE", "LOST_TO_CLOSE", "MATCHED_CLOSE"  
  clvKind?: string;       // "PROBABILITY" or "POINTS"
  // ... other pick data
}

// Interpretation:
// Positive clvValue: beat the closing line (skill indicator)
// Negative clvValue: lost to closing line (luck or poor timing)
// Magnitude: strength of the signal
// clvKind: whether in probability points or raw points

if (pick.clvValue && pick.clvValue > 0) {
  // Positive CLV indicates skill component
} else if (pick.clvValue && pick.clvValue < 0) {
  // Negative CLV suggests luck or timing issues
}

// Aggregate analysis:
const clvValues = picks.map(p => p.clvValue).filter((v): v is number => v !== null);
const meanCLV = clvValues.reduce((a, b) => a + b, 0) / clvValues.length;
const clvHitRate = clvValues.filter(v => v > 0).length / clvValues.length;
```

### 🔬 **Research Lab Applications**
- **Game Context Brief**: Assess if picks show timing skill
- **Player Context Brief**: Evaluate if player-specific models beat closing line
- **Prop Market Brief**: Track CLV for prop betting performance
- **Market Movement Brief**: Analyze relationship between line movement and outcomes
- **Competitor Research**: Compare CLV performance against rivals
- **Coach/Scheme Change Brief**: Measure if scheme changes improve CLV

### 📚 **References**
- Based on efficient market hypothesis applications to sports
- Similar to "alpha" measurement in finance
- Follows Kohlberg (2020): "Measuring Predictive Skill in Sports Betting"
- Implementation distributed across codebase as referenced

---

## 6. Expected Value (EV) Calculations

**Primary Location**: `apps/web/lib/fantasy/props.ts`  
**Also Used**: Parlays, intelligence scoring, compliance rules  
**Access**: Various helper functions and direct calculations  

### 🎯 **Purpose**
Quantifies the expected profit/loss per unit stake from a betting opportunity. Positive EV indicates profitable opportunity in the long run.

### 📊 **When to Use**
- **Betting opportunity evaluation** (straight bets, parlays, props)
- **Kelly stake sizing** based on edge and bankroll
- **Model-to-market comparison** for prop betting
- **Parlay construction** evaluating combined EV
- **Intelligence scoring** weighing signal strength and value
- **Risk assessment** for betting decisions

### 🚫 **When NOT to Use**
- When only win probability matters, not profit potential
- Non-monetary decisions where utility isn't linear in money
- Situations with non-linear utility or bankruptcy risk
- When edge estimation is highly unreliable

### ⚙️ **How to Apply**
```typescript
// Basic EV calculation (from fantasy/props.ts)
// EV = (probability of winning) × (net profit if win) - (probability of losing) × (stake)
// For decimal odds: EV = (p × (odds - 1)) - ((1 - p) × 1)
// For American odds: convert to decimal first

function calculateEV(probability: number, decimalOdds: number): number {
  return probability * (decimalOdds - 1) - (1 - probability) * 1;
}

// Kelly Criterion for optimal stake sizing
function kellyFraction(probability: number, decimalOdds: number): number {
  const edge = probability * (decimalOdds - 1) - (1 - probability);
  return edge / (decimalOdds - 1);
}

// Example usage:
const modelProbability = 0.55;    // Your model's P(win)
const marketOdds = 2.0;           // +100 American odds
const ev = calculateEV(modelProbability, marketOdds);
const kelly = kellyFraction(modelProbability, marketOdds);

if (ev > 0) {
  // Positive EV opportunity
  const stakeFraction = Math.max(0, kelly * 0.5); // Half-Kelly for safety
  // Place bet with stakeFraction of bankroll
}
```

### 🔬 **Research Lab Applications**
- **Prop Market Brief**: Primary evaluation metric for prop value
- **Fantasy Decision Brief**: EV of start/sit/trade decisions
- **Game Context Brief**: EV of betting lines and alternate lines
- **Player Context Brief**: EV of player-specific projections vs. market
- **Injury Timeline Brief**: EV of betting on return timelines
- **Rumor Triage Brief**: EV of acting on weak signals vs. waiting
- **Content/SEO Brief**: EV of creating content around specific topics

### 📚 **References**
- Thorp (1962): "Beat the Dealer" (original Kelly criterion)
- Fortuna (2020): "The Logic of Sports Betting"
- Vaughan Williams & Paton (2015): "Information Efficiency in Sports Betting Markets"
- Implementation follows fantasy/props.ts and parlay calculations

---

## 🧠 **Algorithm Selection Decision Tree**

### **For Performance Questions Over Time**
→ Use **Anytime-Valid Ledger**  
*Examples: Is my model's ROI improving? Is calibration stable in production?*

### **For Model vs. Market Comparison**  
→ Use **Logit Pool Test**  
*Examples: Does my prop model beat the market? Is my win probability model calibrated?*

### **For Decision Making Under Uncertainty**  
→ Use **Conformal Calibration**  
*Examples: Should I make this pick given current uncertainty? When should I abstain?*

### **For Probability Forecast Assessment**  
→ Use **Brier Score**  
*Examples: How well calibrated are my probability models? Is update X better than Y?*

### **For Performance Attribution**  
→ Use **CLV Tracking**  
*Examples: Is my success due to skill or line movement luck? Do I have timing skill?*

### **For Opportunity Evaluation**  
→ Use **Expected Value Calculations**  
*Examples: Is this prop worth betting? What stake should I use? Is this parlay +EV?*

---

## 🔄 **Combined Algorithm Workflows**

### **Prop Evaluation Pipeline**
1. **Conformal Calibration** → Determine if confident recommendation possible
2. **Expected Value Calculation** → Quantify value if proceeding  
3. **Logit Pool Test** → Validate model calibration against market
4. **CLV Tracking** → Post-settlement attribution of performance
5. **Anytime-Valid Ledger** → Sequential validation of prop strategy

### **Model Development Cycle**
1. **Brier Score** → Baseline calibration assessment
2. **Logit Pool Test** → Iterative model refinement  
3. **Conformal Calibration** → Production readiness check
4. **Anytime-Valid Ledger** → Live performance monitoring
5. **CLV Tracking** → Long-term skill assessment

### **Research Brief to Action**
1. Select appropriate algorithms from this guide based on brief type
2. Apply algorithms to generate evidence
3. Synthesize evidence into brief conclusion  
4. Record which algorithms were used for reproducibility
5. Track performance of algorithm-informed decisions over time

---

## 📋 **Implementation Checklist**

When creating or updating research briefs:

- [ ] **Algorithm Purpose Match**: Does selected algorithm address the core question?
- [ ] **Data Requirements Met**: Do we have the needed inputs (probabilities, outcomes, etc.)?
- [ ] **Configuration Appropriate**: Are we using correct parameters/ranges?
- [ ] **Interpretation Clear**: Do we understand what the outputs mean?
- [ ] **Limitations Considered**: Are we aware of when NOT to trust the result?
- [ ] **Documentation Complete**: Are algorithms applied and outputs recorded in brief?

### **For Operator/Cockpit Use**
- [ ] **Decision Thresholds Set**: What constitutes "significant" evidence?
- [ ] **Risk Controls Active**: Are we respecting bankroll and exposure limits?
- [ ] **Review Process Defined**: How will we validate algorithm-informed decisions?
- [ ] **Learning Mechanism**: How do we improve algorithm usage over time?

---

*This guide should be used in conjunction with:*
- `docs/brain/research-lab.md` (brief type specifications)  
- `docs/intelligence/ALGORITHM-CONFIGURATION.md` (parameter references)
- Source code files referenced in each section
- Domain-specific best practices in each brief type directory

*Last updated: [(timestamp)]*  
*For questions, consult the Sports OS Intelligence Network Master Plan*