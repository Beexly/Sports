# Mathematical Analysis of Containment and Resemblance in Corpus Merging

**Author:** Adversarial Mathematician (Google Flash 3.8 / Anti-Gravity)  
**Date:** 2026-10-04  
**Target:** `inbox/night/flash/false-merge.md`

---

## 1. Formal Formulation

Let document $A$ and document $B$ be represented as sets of $k$-shingles (or token n-grams) $S_A$ and $S_B$.
Define:
- **Resemblance (Jaccard Similarity):**
  $$R(A, B) = \frac{|S_A \cap S_B|}{|S_A \cup S_B|}$$
- **Directional Containment of $A$ in $B$:**
  $$C(A \to B) = \frac{|S_A \cap S_B|}{|S_A|}$$
- **Symmetric / Min-Containment:**
  $$C_{\min}(A, B) = \frac{|S_A \cap S_B|}{\min(|S_A|, |S_B|)}$$

Partition each document into a **Preamble/Apparatus subset** $P$ (boilerplate, template headers, literature review, general background) and an **Equation/Theorem Kernel subset** $E$:
$$S_A = P_A \cup E_A, \quad S_B = P_B \cup E_B, \quad P_A \cap E_A = \emptyset, \quad P_B \cap E_B = \emptyset$$

---

## 2. Quantitative Pathology: Shared Preamble, Disjoint Math

### Scenario 1: $400 / 500 = 0.80$
Consider two papers from the same workshop, author group, or template:
- $|S_A| = 500$, $|S_B| = 500$
- Shared apparatus: $|P_A \cap P_B| = 400$
- Mathematical kernels are completely disjoint: $E_A \cap E_B = \emptyset$, where $|E_A| = 100, |E_B| = 100$.
- Total intersection: $|S_A \cap S_B| = 400$.
- Union: $|S_A \cup S_B| = 400 + 100 + 100 = 600$.

Computing the metrics:
$$C(A \to B) = \frac{400}{500} = 0.80$$
$$R(A, B) = \frac{400}{600} \approx 0.667$$

**Consequence:** A containment rule with threshold $\tau \le 0.80$ triggers an automatic merge. Two completely distinct mathematical procedures (with $0\%$ equation overlap) are collapsed into a single entity solely due to shared boilerplate preamble.

### Scenario 2: $2000 / 3000 = 0.67$ Under a $0.50$ Rule
Consider two extensive manuscripts ($3,000$ shingles each):
- Shared preamble/background literature review: $2,000$ shingles ($P_A = P_B$).
- Disjoint methodology and derivations: $1,000$ shingles each ($E_A \cap E_B = \emptyset$).
- Total intersection: $|S_A \cap S_B| = 2,000$.
- Union: $|S_A \cup S_B| = 4,000$.

Computing the metrics:
$$C(A \to B) = \frac{2000}{3000} \approx 0.667$$
$$R(A, B) = \frac{2000}{4000} = 0.50$$

**Consequence:** Under any decision boundary $\tau \le 0.50$ (or $\tau \le 0.66$), the system declares equivalence and merges them. The entire distinct $1,000$-shingle mathematical derivation is erased or cross-contaminated.

### Scenario 3: Asymmetric Inclusion (Macro in Corpus)
Let $M$ be a standard $200$-shingle macro or definition block (e.g. standard Kalman filter equations or Bradley-Terry logit baseline).
Let $P$ be a $5,000$-shingle research paper that cites or embeds macro $M$:
$$|S_M| = 200, \quad |S_P| = 5,000, \quad S_M \subset S_P$$
- Intersection: $|S_M \cap S_P| = 200$.
- Union: $|S_M \cup S_P| = 5,000$.

Computing the metrics:
$$C(M \to P) = \frac{200}{200} = 1.00$$
$$C(P \to M) = \frac{200}{5000} = 0.04$$
$$R(M, P) = \frac{200}{5000} = 0.04$$

---

## 3. Pathological Failures of Containment in Each Direction

Containment fails predictably and catastrophically in both directions:

### Direction A: False Positive (Over-Merge / Premature Absorption)
*Condition:* Evaluating $C(A \to B)$ where $|S_A| \ll |S_B|$ or where $A$ has high boilerplate density.
- **The Error:** Containment yields $C(A \to B) \to 1.0$, falsely concluding that Document $A$ is an alternate draft or duplicate of Document $B$.
- **Mechanism:** Small standalone utility modules, sub-theorems, or cited definitions are swallowed by omnibus papers. When an omnibus survey cites an author's distinct 200-shingle proof, $C(\text{proof} \to \text{survey}) = 1.0$. Merging treats the survey as identical to the lemma, corrupting citation boundaries, authorship attribution, and modular indexing.
- **The Preamble Hazard:** When two distinct papers use the same conference LaTeX template, author institutional disclosure, and problem statement, $C(A \to B) \ge 0.70 - 0.85$, causing disjoint mathematical claims to be forcibly merged.

### Direction B: False Negative (Under-Merge / Fragmented Duplication)
*Condition:* Evaluating $C(B \to A)$ where $|S_B| \gg |S_A|$, or comparing symmetric $R(A, B)$ across expanded revisions.
- **The Error:** Containment yields $C(B \to A) \to 0$, failing to recognize that Document $B$ is a direct expansion, camera-ready extension, or full monograph of the exact theorem in Document $A$.
- **Mechanism:** If an author expands an 8-page workshop paper ($1,500$ shingles) into a 40-page journal article ($12,000$ shingles) by adding simulation graphs, extended historical context, and proofs of minor corollaries, the equation kernel $E$ remains identical. However:
  $$C(\text{Journal} \to \text{Workshop}) = \frac{1500}{12000} = 0.125 \ll \tau$$
  A naive containment gate evaluates them as completely distinct works, generating duplicate entries in the intelligence index with disjoint belief states.

---

## 4. Why $\tau = 0.80$ Must Never Be Recommended

Recommending a scalar threshold such as $\tau = 0.80$ is an anti-pattern for three mathematical reasons:

1. **Boilerplate Mass Swamps Kernel Mass:** In modern computational literature, narrative prose and apparatus comprise $70\%\text{--}85\%$ of shingle mass. Because $0.80$ lies squarely within the typical range of boilerplate overlap among papers in the same subfield or template series, $\tau = 0.80$ guarantees severe false merges of disjoint mathematical kernels.
2. **Threshold Fragility across Document Length Distributions:** The metric $C(A, B)$ is inherently non-scale-invariant. A threshold that prevents false merges on $10,000$-word treatises will aggressively fracture 500-word research notes, while a threshold calibrated for short notes will aggressively over-merge large documents.
3. **Absence of Semantic Gating:** Any scalar threshold on raw unweighted text shingles treats the word `"introduction"` with the same weight as the token sequence `"L_ij = \theta_i - \theta_j"`.

### The Necessary Architecture
Instead of threshold tuning on global text shingles:
- **Decompose Document into Dual Representations:**
  1. Lexical Shell ($P$)
  2. Mathematical AST / Equation Registry ($E$)
- **Gate Condition:**
  Two documents MAY ONLY be merged if:
  $$\text{Jaccard}(E_A, E_B) \ge \tau_{\text{math}} \quad \text{AND} \quad \text{ContradictionCheck}(A, B) = \emptyset$$
  Boilerplate containment $C(P_A \to P_B)$ must be discarded entirely from equivalence decisions.
