# SPORTS INTELLIGENCE LEVERAGE ACTION PLAN
## Based on Deep Repository Analysis

### 🔍 KEY FINDINGS

#### ✅ WELL-IMPLEMENTED ALGORITHMS (SPORTS REPO)
1. **Anytime-Valid Ledger** (`packages/prediction-engine/src/anytime-ledger.ts`)
   - Used in public ROI policy calculation
   - Configured with `ANYTIME_RANGE_UNITS = 20`
   - Provides sequential validation for betting performance

2. **Logit Pool Test** (`packages/prediction-engine/src/edge-lab/logit-pool.ts`)
   - Used in phase1-acceptance testing
   - Tests model calibration against market probabilities
   - Part of evidence synthesis framework

3. **Conformal Calibration** (`apps/web/lib/calibration/conformal-calibration.ts`)
   - Used in decision genome for abstention decisions
   - API exposed via `conformalRdPosture`
   - Provides prediction sets with guaranteed coverage

4. **Brier Score** (`apps/web/lib/calibration/brier.ts`)
   - Used across calibration modules
   - Integrated in backtesting and reporting
   - Measures probability calibration

5. **CLV Tracking** (Multiple locations)
   - Tracked in pick explanations (`pick-explainer/grounding.ts`)
   - Used in admin routes and performance policies
   - Tracks closing line value attribution

6. **Expected Value Calculations**
   - Sophisticated modeling in fantasy props (`apps/web/lib/fantasy/props.ts`)
   - Used in parlay calculations
   - Embedded in intelligence scoring

#### ⚠️ UNDER-LEVERAGED OPPORTUNITIES

#### 1. **RESEARCH-TO-ALGORITHM MAPPING GAP**
- Research Lab documentation (`docs/brain/research-lab.md`) describes 10 brief types
- **NO CLEAR MAPPING** from brief types to specific algorithms
- Operators/researchers lack guidance on WHEN to apply which algorithm

#### 2. **FRONTEND-BACKEND DISCONNECT**
- beexly-dev repository shows **ZERO integration** of sports intelligence algorithms
- Despite sophisticated backend, frontend is DMV test prep/casual gaming site
- Missing: EV calculators, prop bet advisors, CLV visualizers, anytime-valid dashboards

#### 3. **CONFIGURATION & FEATURE FLAGS LIMITED**
- Algorithm behavior appears hard-coded in many places
- No visible toggles for:
  - Switching between different EV calculation methods
  - Enabling/disabling conformal prediction sets  
  - Adjusting anytime-valid alpha parameters
  - Selecting different calibration methods

#### 4. **KNOWLEDGE TRANSFER BARRIERS**
- No clear path from research brief → algorithm application → backtest → deployment
- Research lab concept exists but disconnected from actual algorithm implementation
- Missing decision trees: "When to use Algorithm X"

### 🚀 ACTIONABLE LEVERAGE PLAN

#### PHASE 1: DOCUMENTATION & KNOWLEDGE CLOSURE (IMMEDIATE)

**1.1 Create Algorithm Decision Guide**
```
docs/intelligence/ALGORITHM-USAGE-GUIDE.md
- When to use Anytime-Valid Ledger (sequential data, performance validation)
- When to use Logit Pool Test (model calibration assessment, evidence synthesis)
- When to use Conformal Calibration (uncertainty quantification, refusal decisions)
- When to use Brier Score (calibration measurement, model comparison)
- When to use CLV Tracking (performance attribution, line movement analysis)
- When to use EV Calculations (prop betting, parlay construction, stake sizing)
```

**1.2 Enhance Research Lab Documentation**
```
docs/brain/research-lab.md → ADD "Algorithm Application" section to each brief type:
- Injury Timeline Brief → Use Anytime-Valid for rehab progression validation
- Player Context Brief → Use EV Calculations for usage trend betting
- Game Context Brief → Use Conformal Calibration for line movement uncertainty
- Prop Market Brief → Use Logit Pool Test + EV Calculator
- etc.
```

**1.3 Create Configuration Reference**
```
docs/intelligence/ALGORITHM-CONFIGURATION.md
- Environment variables for algorithm toggles
- Feature flags for A/B testing
- Parameter ranges for each algorithm
- Default values and recommended settings
```

#### PHASE 2: FRONTEND INTEGRATION (NEXT 2-3 CYCLES)

**2.1 Build Intelligence Dashboard Components**
```
apps/web/components/intelligence/
- EVCalculator.tsx: Model probability vs market line, Kelly stake
- CLVVisualizer.tsx: Historical CLV distribution, BEAT/LOST/MATCHED ratios  
- PropAdvisor.tsx: pOver/pUnder, recommended side, best ALT line
- AnytimeValidMonitor.tsx: Sequential validation evidence, significance tracking
- LogitPoolAnalyzer.tsx: Model calibration vs market, beta coefficients
```

**2.2 Create Research Lab → Algorithm Integration**
```
apps/web/pages/research-lab/
- AlgorithmSelector.tsx: Choose which algorithms to apply to brief
- AlgorithmParameters.tsx: Configure algorithm settings per brief
- ResultsIntegrator.tsx: Show how algorithms informed the brief conclusion
```

**2.3 Add Algorithm Usage Tracking**
- Modify research brief outputs to include "Algorithms Applied" metadata
- Create algorithm usage analytics dashboard
- Track correlation between algorithm usage and pick performance

#### PHASE 3: KNOWLEDGE LOOP CLOSURE (ONGOING)

**3.1 Automated Leverage Monitoring**
- Weekly scan for TODO/FIXME in algorithm-related files
- Monthly check for unused algorithm imports  
- Quarterly verify research-lab.md mentions all core algorithms
- Alert when algorithm usage deviates from documented patterns

**3.2 Leverage Metrics Dashboard**
- Percentage of research briefs referencing specific algorithms
- Algorithm usage frequency over time
- Documentation coverage metrics
- Correlation between algorithm usage and pick ROI

**3.3 Knowledge Transfer System**
- Template: "Research Brief → Algorithm Application → Backtest → Deployment"
- Examples for each of the 10 brief types
- Version-controlled algorithm decision templates

### 📊 IMMEDIATE DELIVERABLES (BATCH 1)

1. **Algorithm Usage Guide** (`docs/intelligence/ALGORITHM-USAGE-GUIDE.md`)
2. **Enhanced Research Lab** (`docs/brain/research-lab.md` with algorithm mappings)
3. **Configuration Reference** (`docs/intelligence/ALGORITHM-CONFIGURATION.md`)
4. **Initial Component** (`apps/web/components/intelligence/EVCalculator.tsx`)

### 🔧 TECHNICAL IMPLEMENTATION NOTES

#### Algorithm Access Points:
- Anytime-Valid: `import { anytimeValidLedger } from "@sports/prediction-engine"`
- Logit Pool: `import { logitPoolTest } from "@sports/prediction-engine/edge-lab"`  
- Conformal: `import { conformalRdPosture } from "@/lib/calibration/conformal-calibration"`
- Brier: `import { brierScore } from "@/lib/calibration/brier"`
- CLV: Available via pick grounding objects (`pick.clvValue`, `pick.clvVerdict`)
- EV: Available in fantasy props (`props.ts`) and parlay calculations

#### Integration Patterns:
- Use React hooks for real-time algorithm updates
- Leverage existing API routes where available
- Create new API endpoints only when necessary
- Follow existing TypeScript strictness and testing patterns

### 📈 SUCCESS METRICS

Short-term (1 week):
- 100% of core algorithms documented with usage guidance
- Research lab.md updated with algorithm mappings for all brief types
- At least 1 frontend component integrating sports intelligence

Medium-term (1 month):
- Algorithm usage tracking implemented in research brief outputs
- Frontend dashboard showing real-time algorithm outputs
- Configuration system for algorithm toggling

Long-term (ongoing):
- measurable increase in algorithm utilization across research briefs
- documented improvements in pick performance linked to specific algorithm usage
- knowledge transfer system reducing onboarding time for new researchers

---
*Generated from deep repository analysis - [(timestamp)]*