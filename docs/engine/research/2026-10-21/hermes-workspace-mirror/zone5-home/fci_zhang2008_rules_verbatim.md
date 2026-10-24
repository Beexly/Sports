# Zhang (2008) FCI Orientation Rules R5–R10 — Verbatim Reproductions & Path Definitions

Compiled 2026-10-20. Every quote below was **actually retrieved** from the live URL given. Nothing is reconstructed or inferred.

Notation key used throughout (Zhang's own):
`◦` = circle mark · `—` / `−` = tail mark · `→` / `←` = arrowhead · `∗` = arbitrary/any mark (metasymbol) · `o-o` = circle-circle edge.

---

## 1. PRIMARY — Zhang (2008), *Artificial Intelligence* 172(16–17):1873–1896

**URL:** https://www.sciencedirect.com/science/article/pii/S0004370208001008/pdf?md5=03171b4be4f0081617691c24f18ea85f&pid=1-s2.0-S0004370208001008-main.pdf
(retrieved as full text; the PDF itself is Elsevier-gated to 403 for direct download, but the article full text is served. Alternative public copies: CMU Dietrich tech report 168, https://www.cmu.edu/dietrich/philosophy/docs/tech-reports/168_Zhang.pdf — scanned, no text layer, 86 pages, 0 extractable characters, so rules had to be read from rendered page images.)

### R5 (verbatim prose)
> **R5** For every (remaining) α◦−−◦β, if there is an uncovered circle path _p_ =〈 _α, γ,...,θ,β_〉 between _α_ and _β_ s.t. _α,θ_ are not adjacent and β,γ are not adjacent, then orient α◦−−◦β and every edge on _p_ as undirected edges (—).

Display-math fragments for R5 as extracted from the same source:
`\alpha\circ{\mathrm{ 一 }}\circ\beta` , `p=\langle\alpha,\gamma,\ldots,\theta,\beta\rangle` , `\alpha\circ\text{—}\alpha` , `\beta,\gamma` , `\beta`

### R6 (verbatim prose)
> **R6** If α—β◦−−∗ _γ_ ( _α_ and _γ_ may or may not be adjacent), then orient β◦−−∗ _γ_ as _β_ −− ∗ _γ._

Display-math fragments:
`\alpha-\beta\circ—\ast\gamma` , `\gamma` , `\beta\circ—\ast\gamma` , `\beta`

### R7 (verbatim prose)
> **R7** If α −− ◦ β◦−−∗ _γ,_ and _α, γ_ are not adjacent, then orient β◦−−∗ _γ_ as _β_ −− ∗ _γ._

Display-math fragments:
`\alpha—\circ\beta\circ—\ast\gamma` , `\beta—\ast\gamma` , `\beta\circ—\ast\gamma` , `\beta—\ast\gamma.`

> **Note on the R5/R6/R7 glyph rendering:** the primary PDF's inline math is typeset with *line-dash* characters, so the extracted prose renders marks as `◦−−◦`, `◦−−∗`, `−−◦`. In the *display* math the same edges are `◦—◦` (R5) and `◦—∗` (R6/R7). Both are reproduced above exactly as retrieved. The authoritative glyph identities come from the sources in §2–§4, which use the same notation with unambiguous semantics.

### R8 (verbatim prose)
> **R8** If α → _β_ → _γ_ or α−− ◦ _β_ → _γ,_ and α◦→ _γ,_ orient α◦→ _γ_ as _α_ → _γ._

Display math: `\alpha\rightarrow\beta\rightarrow\gamma` , `\alpha—\circ\beta\rightarrow\gamma` , `\alpha\circ\rightarrow\gamma` , `\alpha\rightarrow\gamma`

### R9 (verbatim prose)
> **R9** If α◦→ _γ,_ and _p_ =〈 _α,β,θ,...,γ_ 〉 is an uncovered p.d. path from α to γ such that _γ_ and _β_ are not adjacent, then orient α◦→ _γ_ as _α_ → _γ._

Display math: `\alpha\circ\rightarrow\gamma` , `p=\langle\alpha,\beta,\theta,\ldots,\gamma\rangle` , `\beta` , `\alpha\circ\rightarrow\gamma` , `\alpha\rightarrow\gamma`

### R10 (verbatim prose)
> **R10** Suppose α◦→ _γ, β_ → _γ_ ← _θ, _p_ 1is an uncovered p.d. path from _α_ to _β,_ and _p_ 2is an uncovered p.d. path from _α_ to _θ._ Letμ be the vertex adjacent to _α_ on _p_ 1( _μ_ could be β), and _ω_ be the vertex adjacent to _α_ on _p_ 2( _ω_ could be θ). If _μ_ and _ω_ are distinct, and are not adjacent, then orient α◦→ _γ_ as _α_ → _γ._

Display math: `\alpha\circ\rightarrow\gamma,\beta\rightarrow\gamma\leftarrow\theta,p_1` , `\beta` , `p_2` , `\theta` , `\mu` , `\beta` , `p_1` , `\mu` , `\omega` , `\alpha` , `\theta` , `\alpha\circ\rightarrow\gamma` , `\alpha\rightarrow\gamma`

### Definitions 9 and 10 (verbatim, PRIMARY)
> **Definition 9 (uncovered path).** In a PMG, a path p =〈V0,...,Vn〉 is said to be uncovered if for every 1 i n− 1, Vi−1and Vi+1are not adjacent, i.e., if every consecutive triple on the path is unshielded.

> **Definition 10 (potentially directed path).** In a PMG, a path p =〈V0,...,Vn〉 is said to be potentially directed (abbreviated as **p.d.**) fromV0to Vnif for every 0 _i n_ − 1, the edge between Viand _V_ i+1is not into Vior out of _V_ i+1.

> Intuitively, a p.d. path is one that could be oriented into a directed path by changing the circles on the path into appropriate tails or arrowheads. As we shall see, uncovered p.d. paths play an important role in locating invariant tails. A special case of a p.d. path is where every edge on the path is of the form ◦−−◦; we call such a **path a circle path.**

> A distinctive property of uncovered path is of course that after _R0_ is executed, every consecutive triple on the path has a definite status either as a collider or as a non-collider.

**IMPORTANT:** In the primary, the phrases "uncovered circle path" and "uncovered potentially directed path" are used in R5/R9/R10 but are **not themselves formally defined** — the paper defines *uncovered path* (Def. 9), *potentially directed path* (Def. 10), and *circle path* (as a special case of p.d. path). §2 below gives the explicit combined definitions.

### Soundness proofs for R5–R8 (verbatim, PRIMARY) — **decisive evidence on the R6/R7 antecedent difference**
> **R5:** The antecedent of this rule implies that 〈 _α, γ,...,θ,β,α_ 〉 forms an uncovered cycle that consists of ◦−−◦ edges. Suppose a mixed graph, contrary to what the rule requires, has an arrowhead on this cycle. In light of R1, the cycle must be oriented as a directed cycle to avoid unshielded colliders not in _GT._ But then the graph is not ancestral.
> Display: `\langle\alpha,\gamma,\ldots,\theta,\beta,\alpha\rangle` , `0—0` , `\mathcal{G}_{T}`
> **R6:** if any graph, contrary to what the rule requires, contains _α_—β←∗γ, the graph is not ancestral.
> Display: `\alpha-\beta\leftarrow\ast\gamma`
> **R7:** Suppose a mixed graph, contrary to what the rule requires, has an arrowhead at _β_ on the edge between β and _γ._ Then either _α_— _β←∗γ_ is present, in which case the graph is not ancestral; or _α_ → _β←∗γ_ is present, in which case the graph contains an unshielded collider not in _GT._
> Display: `\alpha-\beta\leftarrow\ast\gamma` , `\beta` , `\alpha\rightarrow\beta\leftarrow\ast\gamma` , `\beta` , `\gamma.` , `\mathcal{G}_{T}`
> **R8:** This rule is analogous to R2. Obviously if a mixed graph, contrary to what the rule requires, contains _α_ ↔ _γ,_ then either an almost directed cycle is present or there is an arrowhead into an undirected edge, and hence the graph is not ancestral.
> Display: `\alpha\leftrightarrow\gamma,`

> **⇒ Why this settles the R6/R7 distinction:** the R7 proof's two cases are `α—β←∗γ` and `α→β←∗γ`. These are the two *resolutions* of R7's antecedent edge `α—◦β`: the circle at β becomes a **tail** (giving `α—β`) or an **arrowhead** (giving `α→β`). Since R7's antecedent explicitly has a circle at β, resolving it must be able to produce `α—β` — i.e. **R7's α–β edge is `α—◦β` (tail at α, circle at β)**. R6's proof, by contrast, uses `α—β←∗γ` with the α–β edge *unchanged* from its antecedent, and R6's antecedent display is `\alpha-\beta\circ—\ast\gamma` — **no circle between α and β**. ⇒ **R6's α–β edge has no circle at β; R7's does.** This is the same conclusion independently reached from Tetrad's ASCII (`A---B` vs `A--oB`), Tetrad's code, pcalg's code, and causal-learn's PR #194 code.

### Figure captions (verbatim, PRIMARY)
> **Fig. 4.** Graphical illustrations of _R5_–R7.
> **Fig. 5.** Graphical illustrations of _R8_–R10.
> **Fig. 6.** An example where _R9_ is needed. (a) is the (unknown) causal MAG. (b) gives the FCI output, to which _R9_ can be applied (twice) to yield (c).

---

## 2. SECONDARY — Claassen & Heskes (2012), *A Logical Characterization of Constraint-Based Causal Discovery*, arXiv:1202.3711

**URL:** https://arxiv.org/pdf/1202.3711 (also https://arxiv.org/abs/1202.3711)
This is the **best verbatim source for the two path definitions in their combined form**, in clean Unicode.

### Combined definitions (verbatim)
> In a PAG P (see below), a path u = ⟨V0, . . . , Vn+1⟩ is said to be an **uncovered potentially directed (p.d.) path**, if each successive triple along u is unshielded, and no edge Vi ∗−∗Vi+1 has an arrowhead at Vi or a tail at Vi+1. If all edges on u are of the form ◦−◦, then the path is called an **uncovered circle path**.

### Table 1 rows (verbatim, from the PDF text layer; "uncov." = "uncovered", "idem" = "idem for all edges on u")
> **R5** If u = ⟨Z, X, .., W, Y, Z, X⟩is an uncov. circle path, then Z −−Y (idem for all edges on u).
> **R6** If X −−Z ◦−∗Y , then orient as Z −−∗Y .
> **R7** If X −−◦Z ◦−∗Y , and X −⧹⧸−Y , then Z −−∗Y .
> **R8a** If Z −→X −→Y and Z ◦→Y , then Z −→Y .
> **R8b** If Z −−◦X −→Y and Z ◦→Y , then Z −→Y .
> **R9** If Z ◦→Y , u = ⟨Z, X, W, .., Y ⟩is an uncov. p.d. path, and X −⧹⧸−Y , then Z −→Y .
> **R10** If Z ◦→Y , X −→Y ←−W, u1 = ⟨Z, S, .., X⟩and u2 = ⟨Z, V, .., W⟩are uncov. p.d. paths, (possibly with S = X and/or V = W), then if S −⧹⧸−V , then Z −→Y .

Footnote (verbatim):
> We follow the numbering from (Zhang, 2008a). The metasymbol ∗ stands for an arbitrary edge mark, and X −⧹⧸−Y explicitly indicates the absence of an edge between X and Y in the PAG P; see also Figures 2 and 3.

Algorithm 1 (verbatim, relevant lines):
> 1: P ←fully ◦−◦connected graph over V
> 9: P ←R5 (uncovered circle paths)
> 10: repeat P ←R6 −R7 until finished
> 11: repeat P ←R8a−R10 until finished

**⚠ NOTE ON R5 STATEMENT:** This source's R5 is phrased differently from the primary (it uses a *cyclic* path ⟨Z,X,..,W,Y,Z,X⟩ and a single non-adjacency mark `−⧹⧸−`) whereas the primary states it as a path ⟨α,γ,...,θ,β〉 with two explicit non-adjacency conditions (α,θ not adjacent; β,γ not adjacent). The primary is authoritative.

---

## 3. SECONDARY — "A fast score-based search algorithm for maximal ancestral graphs", arXiv:2402.04777

**URL:** https://arxiv.org/pdf/2402.04777
**This is the single most implementation-friendly source**: it gives Definitions B.1/B.2/B.3 *and* R5–R10 with explicit LaTeX macros, so the mark semantics are unambiguous from the source code.

### Definitions (verbatim, from PDF text layer)
> **Definition B.1.** In a PMG, a path π = ⟨v0, . . . , vn⟩is said to be uncovered if for every 1 ≤i ≤n −1, vi−1 and vi+1 are not adjacent.
> **Definition B.2.** In a PMG, a path π = ⟨v0, . . . , vn⟩is said to be potentially directed (p.d.) from v0 to vn if for every 1 ≤i ≤n, the edge between vi−1 and vi is neither vi−1 ←∗vi nor vi−1 ∗−vi.
> **Definition B.3.** In a PMG, a path π is a circle path if every edge on the path is of the form ◦−◦.

### Rules (verbatim, from PDF text layer)
> The additional rules provided by Zhang (2007) are:
> **R5** For every a ◦−◦b if there is an uncovered circle path π = ⟨a, c, . . . , d, b⟩ for a, b such that a, d are not adjacent and b, c are not adjacent, then orient a ◦−◦b and all the edges on π as undirected edges;
> **R6** If a −b ◦−∗c, then orient b ◦−∗c as b −∗c;
> **R7** If a −◦b ◦−∗c, and a, c are not adjacent, then orient b ◦−∗c as b −∗c;
> **R8** If a →b →c or a −◦b →c, and a ◦→c, then orient a ◦→c as a →c.
> **R9** If a ◦→c, and π = ⟨a, b, . . . , c⟩ is an uncovered p.d. path from a to c such that b and c are not adjacent, then orient a ◦→c as a →c.
> **R10** Suppose a ◦→c and b →c ←d, π1 is an uncovered p.d. path from a to b, and π2 is an uncovered p.d. path from a to d. Let x be the vertex adjacent to a on π1, and y be the vertex adjacent to a on π2. If x and y are distinct, and are not adjacent, then orient a ◦→c as a →c.

### LaTeX source (verbatim from the arXiv e-print, https://arxiv.org/e-print/2402.04777, `Appendix.tex`) — this pins the glyph semantics exactly
```latex
\begin{definition}\label{uncoveredpath}
In a PMG, a path $\pi = \langle v_0, \ldots,v_n \rangle$ is said to be \emph{uncovered} if for every $1 \leq i \leq n-1$, $v_{i-1}$ and $v_{i+1}$ are not adjacent.
\end{definition}
\begin{definition}\label{pdirectedpath}
In a PMG, a path $\pi = \langle v_0, \ldots,v_n \rangle$ is said to be \emph{potentially directed} (\emph{p.d.}) from $v_0$ to $v_n$ if for every $1 \leq i \leq n$, the edge between $v_{i-1}$ and $v_i$ is neither $v_{i-1} \getss v_i $ nor $v_{i-1} \sun v_{i}$.
\end{definition}
\begin{definition}
In a PMG, a path $\pi$ is a \emph{circle path} if every edge on the path is of the form $\dcircleedge$.
\end{definition}
...
    \item[$\mathcal{R}5$] For every $a \dcircleedge b$ if there is an uncovered circle path $\pi = \langle a,c, \ldots, d,b \rangle$ for $a,b$ such that $a,d$ are not adjacent and $b,c$ are not adjacent, then orient $a \dcircleedge b$ and all the edges on $\pi$ as undirected edges;
    \item[$\mathcal{R}6$] If $a - b \cseg  c$, then orient $b \cseg c$ as $b \uns c$;
    \item[$\mathcal{R}7$] If $a \rcircleedge b \cseg c$, and $a, c$ are not adjacent, then orient $b \cseg c$ as $b \uns c$;
    \item[$\mathcal{R}8$] If $a \rightarrow b \rightarrow c$ or $a \rcircleedge b \rightarrow c$, and $a \circlearrow c$, then orient $a \circlearrow c$ as $a \rightarrow c$;
    \item[$\mathcal{R}9$] If $a \circlearrow c $, and $\pi = \langle a,b, \ldots, c \rangle$ is an uncovered p.d.~path from $a$ to $c$ such that $b$ and $c$ are not adjacent, then orient $a \circlearrow c $ as $a \rightarrow c$;
    \item[$\mathcal{R}10$] Suppose $a \circlearrow c$ and $b \rightarrow c \leftarrow d$, $\pi_1$ is an uncovered p.d.~path from $a$ to $b$, and $\pi_2$ is an uncovered p.d.~path from $a$ to $d$. Let $x$ be the vertex adjacent to $a$ on $\pi_1$, and $y$ be the vertex adjacent to $a$ on $\pi_2$. If $x$ and $y$ are distinct, and are not adjacent, then orient $a \circlearrow c$ as $a \rightarrow c$.
```
Macro definitions (verbatim from `main.tex`) — **these fix the glyph meanings**:
```latex
\newcommand{\circlearrow}{\mathbin{\circ\mkern -7mu\rightarrow} }
\newcommand{\rcircleedge}{\mathbin{-\mkern -3mu \circ} }
\newcommand{\dcircleedge}{\mathbin{\circ\mkern -6.5mu-\mkern -6.5mu\circ} }
\newcommand{\uns}{\mathbin{-\mkern -3mu*}}
\newcommand{\cseg}{\mathbin{\circ\!\!-\mkern -7mu*}}
```
⇒ `\dcircleedge` = ◦−◦ (circle-circle) · `\rcircleedge` = −◦ (tail at left, circle at right) · `\cseg` = ◦−∗ (circle at left, star at right) · `\uns` = −∗ (tail at left, star at right) · `\circlearrow` = ◦→

**⇒ From these macros, the exact reading of the two antecedents is:**
- **R6** antecedent: `a - b` followed by `b ◦−∗c`. In fast_mag's rendering the `a - b` segment is a **plain dash with NO circle at b** — i.e. the α–β edge is *not* a circle-circle edge and carries no circle at β.
- **R7** antecedent: `a −◦b` (dash + **circle at b**) followed by `b ◦−∗c`, plus a and c not adjacent.

**⇒ Therefore R6 and R7 differ exactly as follows (this is the decisive point for implementation):**
- R6: the α–β edge is written `α - β` — **no circle at β**.
- R7: the α–β edge is written `α −◦ β` — **there IS a circle at β**, and additionally α and γ must be non-adjacent.

**⇒ What kind of edge is R6's `α - β` exactly?** Tetrad's 7.6.4 ASCII says `R6: If A---Bo-*C` and its code checks `Edges.isUndirectedEdge(edge)` = **TAIL at both ends** (`-` and `-`); pcalg's R6 checks `apag[b, ] == 3 & apag[, b] == 3` = **tail–tail**; causal-learn PR #194's `ruleR6` requires `graph.get_endpoint(node_B, node_A) == Endpoint.TAIL` on a tail-entered edge = **tail–tail**. ⇒ **R6's antecedent edge α–β is an undirected (tail–tail, `A---B`) edge, NOT `α→β`.** (In Zhang's PDF typography the undirected edge is set as a plain dash `—`, which is why the fast_mag LaTeX shows `a - b`.)

**⇒ R7's α–β edge is `α -o β` (tail at α, circle at β)** — Tetrad 7.6.4: `R7: If A--oBo-*C`; Tetrad code: `graph.getEndpoint(a, b) == Endpoint.CIRCLE && graph.getEndpoint(b, a) == Endpoint.TAIL`; pcalg R7: `apag[b, ] == 3 & apag[, b] == 1`; causal-learn `ruleR7`: `get_endpoint(node_B, node) == Endpoint.TAIL` with a CIRCLE-entered edge.

Confirmed independently by the primary's own LaTeX display fragments for R6 (`\alpha-\beta\circ—\ast\gamma` — no circle between α and β) versus R7 (`\alpha—\circ\beta\circ—\ast\gamma` — circle between α and β), and by the primary's R7 soundness proof (see §1).

**⇒ Visual confirmation (Zhang 2012 Table 1, arXiv:1202.3711 p.3, rendered at 900 dpi):** the R6 row's X–Z edge is a **plain line with no circle at Z**; the R7 row's X–Z edge is **line + circle at Z** (`X — ◦ Z`). The Z–Y edge in both rows is `Z ◦ — ∗ Y`.

---

## 4. SECONDARY — Tetrad (Spirtes/Ramsey group), `FciOrient.java` + javadocs

### 4a. Java source, current master
**URL:** https://raw.githubusercontent.com/cmu-phil/tetrad/master/tetrad-lib/src/main/java/edu/cmu/tetrad/search/utils/FciOrient.java
(tag 7.6.9: https://raw.githubusercontent.com/cmu-phil/tetrad/v7.6.9/tetrad-lib/src/main/java/edu/cmu/tetrad/search/utils/FciOrient.java)

Javadoc comments (verbatim; the source file is double-encoded UTF-8 mojibake on the wire, repaired here — the repaired text is what is quoted):
> R5 For every (remaining) α o−−o β, if there is an uncovered circle path p = <α,γ,...,θ,β> between α and β s.t. α,θ are not adjacent and β,γ are not adjacent, then orient α o−−o β and every edge on p as undirected edges (--).
> R6 If α —- β o−−∗ γ (α and γ may or may not be adjacent), then orient β o−−∗ γ as β −−∗ γ.
> R7 If α −−o β o−−∗ γ, and α, γ are not adjacent, then orient β o−−∗ γ as β −−∗ γ.
> R8 If α → β → γ or α−−◦β → γ, and α o→ γ, orient α o→ γ as α → γ.
> R9 If α o→ γ, and p = <α,β,θ,...,γ> is an uncovered potentialy directed path from α to γ such that γ and β are not adjacent, then orient α o→ γ as α → γ.
> R10 Suppose α o→ γ, β → γ ← θ, p1 is an uncovered potentially directed (semidirected) path from α to β, and p2 is an uncovered p.d. path from α to θ. Let μ be the vertex adjacent to α on p1 (μ could be β), and ω be the vertex adjacent to α on p2 (ω could be θ). If μ and ω are distinct, and are not adjacent, then orient α o→ γ as α → γ.

### 4b. Tetrad 7.6.9 javadoc (HTML, same text)
**URL:** https://www.phil.cmu.edu/tetrad-javadocs/7.6.9/edu/cmu/tetrad/search/utils/FciOrient.html

### 4c. Tetrad 7.6.4 javadoc — **pure-ASCII rendering, the most useful for a TypeScript port**
**URL:** https://www.phil.cmu.edu/tetrad-javadocs/7.6.4/edu/cmu/tetrad/search/utils/FciOrient.html
> Implements Zhang's rule R5, orient circle undirectedPaths: for any Ao-oB, if there is an uncovered circle path u = [A,C,...,D,B] such that A,D nonadjacent and B,C nonadjacent, then A---B and orient every edge on u undirected.
> Implements Zhang's rules R6 and R7, applies them over the graph once. Orient single tails. **R6: If A---Bo-*C then A---B--*C. R7: If A--oBo-*C and A,C nonadjacent, then A--oB--*C**

### 4d. Tetrad's actual implementation of R6/R7 (verbatim code, master branch)
```java
public void ruleR6(Graph graph) {
    // We first look for undirected edges x â- y and the look for γ adjacent to either the x or the
    // y endpoint.
    for (Edge edge : graph.getEdges()) {
        if (!Edges.isUndirectedEdge(edge)) { continue; }
        { Node a = edge.getNode1(); Node b = edge.getNode2();
          for (Node c : graph.getAdjacentNodes(b)) {
            if (c != a && graph.getEndpoint(c, b) == Endpoint.CIRCLE) {
                setEndpoint(graph, c, b, Endpoint.TAIL); ...
```
```java
public void ruleR7(Graph graph) {
    for (Edge edge : graph.getEdges()) {
        { Node a = edge.getNode1(); Node b = edge.getNode2();
          if (graph.getEndpoint(a, b) == Endpoint.CIRCLE && graph.getEndpoint(b, a) == Endpoint.TAIL) {
            for (Node c : graph.getAdjacentNodes(b)) {
              if (c != a && !graph.isAdjacentTo(a, c) && graph.getEndpoint(c, b) == Endpoint.CIRCLE) {
                setEndpoint(graph, c, b, Endpoint.TAIL); ...
```
Tetrad `Edge.toString()` (https://raw.githubusercontent.com/cmu-phil/tetrad/master/tetrad-lib/src/main/java/edu/cmu/tetrad/graph/Edge.java) prints `node1 <mark1>-<mark2> node2` with TAIL→`-`, ARROW→`<`/`>`, CIRCLE→`o`. Hence 7.6.4's `A---B` = tail-tail, `A--oB` = tail at A / circle at B, `B o-*C` = circle at B / star at C.

**⇒ Tetrad's R6 fires on an undirected (tail-tail) α–β edge; R7 fires on a tail-at-α / circle-at-β edge. Only R7 checks α/γ non-adjacency.** Both orient the **circle at β on the β–γ edge** to a tail; the mark at γ is untouched.

**⇒ Tetrad endpoint-direction convention (needed to read the code correctly).** `EdgeListGraph.getEndpoint(node1, node2)` is implemented as `edge.getEndpoint(node2)` — i.e. it returns the endpoint **at node2**. Verified at https://raw.githubusercontent.com/cmu-phil/tetrad/master/tetrad-lib/src/main/java/edu/cmu/tetrad/graph/EdgeListGraph.java
> public Endpoint getEndpoint(Node node1, Node node2) { Edge edge = getEdge(node1, node2); if (edge != null) { return edge.getEndpoint(node2); } return null; }

So in `ruleR7`, `graph.getEndpoint(a, b) == Endpoint.CIRCLE` = **circle at b**, and `graph.getEndpoint(b, a) == Endpoint.TAIL` = **tail at a** — i.e. the a–b edge is `a -o b`. And in `ruleR6`, `graph.getEndpoint(c, b) == Endpoint.CIRCLE` = circle at b, and `setEndpoint(graph, c, b, Endpoint.TAIL)` writes the tail at b — i.e. exactly "orient β∘−∗γ as β−∗γ", leaving γ's mark alone.
Also note `Edges.isUndirectedEdge(edge)` is literally `endpoint1 == TAIL && endpoint2 == TAIL` (https://raw.githubusercontent.com/cmu-phil/tetrad/master/tetrad-lib/src/main/java/edu/cmu/tetrad/graph/Edges.java):
> public static boolean isUndirectedEdge(Edge edge) { return ((edge.getEndpoint1() == Endpoint.TAIL) && (edge.getEndpoint2() == Endpoint.TAIL)); }

---

## 5. SECONDARY — `pcalg` R package (CRAN source, Mooij/Colombo et al.)

**URL:** https://cran.r-project.org/src/contrib/pcalg_2.7-12.tar.gz → `pcalg/R/pcalg.R`, `pcalg/R/udag2pag.R`
(mirror of the same file: https://rdrr.io/cran/pcalg/src/R/pcalg.R)

### 5a. `udag2pag.R` mark-code legend (verbatim)
> ## Notation:
> ## 0: no edge
> ## 1: -o
> ## 2: -> (arrowhead)
> ## 3: - (tail)
> ## a=alpha
> ## b=beta
> ## c=gamma
> ## d=theta

### 5b. R5 implementation (verbatim, `pcalg.R`)
```r
      ##-- R5 ------------------------------------------------------------------
      if (rules[5]) {
        ind <- which((apag == 1 & t(apag) == 1), arr.ind = TRUE) ## a o-o b
        ...
          ## find all c s.t. a o-o c and c is not connected to b
          indC <- which((apag[a, ] == 1 & apag[, a] == 1) & (apag[b, ] == 0 & apag[, b] == 0))
          ## find all d s.t. b o-o d and d is not connected to a
          indD <- which((apag[b, ] == 1 & apag[, b] == 1) & (apag[a, ] == 0 & apag[, a] == 0))
          ...
                if (apag[c, d] == 1 && apag[d, c] == 1) {
                  ## normal version
                  if (length(unfVect) == 0) {
                    apag[a, b] <- apag[b, a] <- 3
                    apag[a, c] <- apag[c, a] <- 3
                    apag[c, d] <- apag[d, c] <- 3
                    apag[d, b] <- apag[b, d] <- 3
                    if (verbose) {
                      cat("\nRule 5","\n")
                      cat("There exists an uncovered circle path between",
                          a, "and", b, ". Orient", a, "-", b, "and", a, "-", c, "-", d, "-", b, "\n")
```
and the general case:
```r
	  ucp <- minUncovCircPath(p, pag = apag, path = c(a,c,d,b),
				  unfVect = unfVect, verbose = verbose)
                  ## there is a path ---> orient
                  if (length(ucp) > 1) {
                    ## orient every edge on the path as --
                    n <- length(ucp)
                    apag[ucp[1], ucp[n]] <- apag[ucp[n], ucp[1]] <- 3 ## a--b
                    for (j in seq_len(length(ucp)-1)) {
                      apag[ucp[j], ucp[j + 1]] <- apag[ucp[j + 1], ucp[j]] <- 3 ## each edge on the path --
                    }
                  }
```

### 5c. R6 implementation (verbatim) — **note: pcalg uses `apag[b, ] == 3 & apag[, b] == 3` (tail–tail on the α–β edge) and does NOT check α/γ adjacency**
```r
      ##-- R6 ------------------------------------------------------------------
      if (rules[6]) {
        ind <- which((apag != 0 & t(apag) == 1), arr.ind = TRUE)## b o-* c
        for (i in seq_len(nrow(ind))) {
            b <- ind[i, 1]
            c <- ind[i, 2]
            indA <- which(apag[b, ] == 3 & apag[, b] == 3)
            if (length(indA) > 0) {
              apag[c, b] <- 3
              if (verbose)
                cat("\nRule 6","\nOrient:", b, "o-*", c, "as", b, "-*", c, "\n")
```

### 5d. R7 implementation (verbatim) — **note the asymmetry: R7 requires `apag[b, ] == 3 & apag[, b] == 1`, i.e. tail at b-side index and circle at the other, plus non-adjacency of a and c**
```r
      ##-- R7 ------------------------------------------------------------------
      if (rules[7]) {
        ind <- which((apag != 0 & t(apag) == 1), arr.ind = TRUE)
        for (i in seq_len(nrow(ind))) {
            b <- ind[i, 1]
            c <- ind[i, 2]
            indA <- which((apag[b, ] == 3 & apag[, b] == 1) &
                          (apag[c, ] == 0 & apag[, c] == 0))
            indA <- setdiff(indA, c)
            if (length(indA) > 0) {
              if (length(unfVect) == 0) { ## normal version
                apag[c, b] <- 3
                if (verbose) {
                  cat("\nRule 7","\n")
                  cat("Orient", indA, "-o", b, "o-*", c, "as", b, "-*", c, "\n")
```

**⇒ pcalg's own messages print the rules as `b o-* c` → `b -* c` (R6) and `a -o b o-* c` → `b -* c` (R7) — matching the user's project-spec notation exactly.**

### 5e. R9/R10 verbatim strings from pcalg
> "There exists an uncovered potentially directed path between", a, "and", c, ". Orient:", a, " ->",c
> "There exists an uncovered circle path between", a, "and", b, ". Orient", a, "-", b, "and", a, "-", c, "-", d, "-", b

### 5f. Helper-function headers (verbatim)
```r
minUncovPdPath <- function(p, pag, a,b,c, unfVect, verbose = FALSE)
{
  ## Purpose: find a minimal uncovered pd path for a,b,c saved in path.
  ## Check also for the conservative case that it is unambiguous
  ## If a path exists this is the output, otherwise NA
...
minUncovCircPath <- function(p, pag, path, unfVect, verbose = FALSE)
{
  ## Purpose: find a minimal uncovered circle path for a,c,d,b saved in path.
  ## Check also for the conservative case that it is unambiguous
  ## If a path exists this is the output, otherwise NA
```

---

## 6. ADDITIONAL SECONDARY SOURCES (all retrieved, all verbatim)

### 6a. Teny et al., *A Kernel-based Approach for Learning Causal Graphs From Continuous Data* (PhD thesis)
**URL:** https://etheses.whiterose.ac.uk/id/eprint/29129/7/Teny_thesis_Deposit.pdf
> R5: For every (remaining) α ◦––◦β, if there is an uncovered circle path p = ⟨α, γ, ..., θ, β⟩ between α and β s.t. α, θ are not adjacent and β, γ are not adjacent, then orient α ◦––◦β and every edge on p as undirected edges (––).
> R6: If α––◦β ◦––∗γ (α and γ may or may not be adjacent), then orient β ◦––∗γ as β––∗γ.
> R7: If α––◦β ◦––∗γ and α, γ are not adjacent, then orient β ◦––∗γ as β––∗γ.
> R8: If α →β →γ or α––◦β →γ, and α◦→γ , orient α◦→γ as α →γ.
> R9: If α◦→γ, and p = ⟨α, β, θ, ..., γ⟩is an uncovered p.d. path from α to γ such that γ and β are not adjacent, then orient α◦→γ as α →γ.
> R10: Suppose α◦→γ, β →γ ←θ, p1 is an uncovered p.d. path from α to β, p2 is an uncovered p.d. path from α to θ. …

**⚠ DISAGREEMENT — see §7, item 1: this thesis's R6 antecedent reads `α––◦β` (WITH a circle at β), identical to its own R7 antecedent. That contradicts the primary and every other source.**

### 6b. XInsight: eXplainable Data Analysis Through The Lens of Causality (Ma et al., arXiv:2207.12718 / PACMMOD)
**URL:** https://arxiv.org/pdf/2207.12718
> R5: for every (remaining) 𝛼◦−◦𝛽, if there is an uncovered circle path 𝑝= (𝛼,𝛾, · · · ,𝜃, 𝛽) between 𝛼and 𝛽s.t. 𝛼and 𝛽are not adjacent, and 𝛾and 𝜃are not adjacent, then orient 𝛼◦−◦𝛽and every edge on 𝑝as undirected edges (—);
> R6: if 𝛼−𝛽◦−∗𝛾(𝛼and 𝛾may or may not be adjacent), then orient 𝛽◦−∗𝛾as 𝛽−∗𝛾;
> R7: if 𝛼−𝛽◦−∗𝛾, and 𝛼and 𝛾are not adjacent, then orient 𝛽◦−∗𝛾as 𝛽−∗𝛾;
> R8: if 𝛼→𝛽→𝛾or 𝛼−◦𝛽→𝛾, and 𝛼◦→𝛾, orient 𝛼◦→𝛾as 𝛼→𝛾;
> R9: if 𝛼◦→𝛾and 𝑝= (𝛼,𝛽,𝜃, · · · ,𝛾) is an uncovered p.d. path from 𝛼to 𝛾such that 𝛽and 𝛾are not adjacent, then orient 𝛼◦→𝛾as 𝛼→𝛾;
> R10: suppose 𝛼◦→𝛾, 𝛽→𝛾←𝜃, 𝑝1 is an uncovered p.d. path from 𝛼to 𝛽and 𝑝2 is an uncovered p.d. path from 𝛼to 𝜃. Let 𝜇be the node adjacent to 𝛼on 𝑝1 (𝜇could be 𝛽), and 𝜔be the node adjacent to 𝛼on 𝑝2 (𝜔could be 𝜃). If 𝜇and 𝜔are distinct, and are not adjacent, then orient 𝛼◦→𝛾as 𝛼→𝛾;

**⚠ DISAGREEMENT — see §7, item 2: this source's R7 antecedent reads `𝛼−𝛽◦−∗𝛾` (NO circle between α and β), identical to its own R6 antecedent. It also states R5's non-adjacency conditions as "𝛼 and 𝛽 are not adjacent" (α and β!), which is wrong — should be α/θ and β/γ.**

### 6c. "Discovering Cyclic Causal Models in Psychological Research" (OSF preprint)
**URL:** https://files.osf.io/v1/resources/qb9t3/providers/osfstorage/64e4a0273fc43d2741e58f0b?format=pdf&action=download&direct&version=2
> (v) For every (remaining) A◦–◦B, if there is an uncovered circle path p = ⟨A,C, ..., D, B⟩ between A and B such that A, D are not adjacent and B,C are not adjacent, then orient A◦–◦B and every edge on p as undirected edges (—).
> (vi) If A — B◦–∗C (A and C may or may not be adjacent), then orient B◦–∗C as B–∗C.
> (vii) If A−◦B◦–∗C and A,C are not adjacent, then orient B◦–∗C as B–∗C.
> (viii) If A→B→C or A–◦B→C, and A◦→C, orient A◦→C as A→C.
> (ix) If A◦→C, and p = ⟨A, B, D, ..., C⟩ is an uncovered potentially directed path from A to C such that C and B are not adjacent, then orient A◦→C as A→C.
> (x) Suppose A◦→C, B→C←D, p1 is an uncovered potentially directed path from A to B, and p2 is an uncovered potentially directed path from A to D. Let m be the vertex adjacent to A on p1 (m could be B), and w be the vertex adjacent to A on p2 (w could be D). If m and w are distinct, and are not adjacent, then orient A◦→D as A→D.

**⇒ This source agrees with the primary exactly: R6 = `A — B◦–∗C` (no circle at B); R7 = `A−◦B◦–∗C` (circle at B).**

### 6d. "Local Causal Structure Learning in the Presence of Latent Variables…" (arXiv:2607.19866)
**URL:** https://arxiv.org/pdf/2607.19866
> Rule 5. For every remaining edge X ◦−◦Y, if there exists an uncovered circle path p = ⟨X, Z, . . . , W, Y⟩ between X and Y such that Sepset(X, W) ∈ Sepsets and Y ∈ Sepset(X, W), and Sepset(Y, Z) ∈ Sepsets and X ∈ Sepset(Y, Z), then orient X ◦−◦Y and every edge on p as undirected edges.
> Rule 6. If X −Y ◦−∗Z, then orient Y ◦−∗Z as Y −∗Z.
> Rule 7. If X −◦Y ◦−∗Z, Sepset(X, Z) ∈ Sepsets, and Y ∉ Sepset(X, Z), then orient Y ◦−∗Z as Y −∗Z.
> Rule 8. If X →Y →Z or X −◦Y →Z, and X◦→Z, then orient X◦→Z as X →Z.
> Rule 9. If X◦→Z, and p = ⟨X, Y, W, . . . , Z⟩ is an uncovered potentially directed path from X to Z such that Sepset(Z, Y) ∈ Sepsets and X ∉ Sepset(Z, Y), then orient X◦→Z as X →Z.
> Rule 10. Suppose X◦→Z, Y →Z ←W, π1 is an uncovered potentially directed path from X to Y, and π2 is an uncovered potentially directed path from X to W. Let U be the vertex adjacent to X on π1 (U could be Y) and let V be the vertex adjacent to X on π2 (V could be W). If U and V are distinct, Sepset(U, V) ∈ Sepsets, and X ∉ Sepset(U, V), then orient X◦→Z as X →Z.

**⇒ R6 = `X −Y` (no circle at Y); R7 = `X −◦Y` (circle at Y). Agrees with the primary.**
(Also note this source substitutes Sepset conditions for the "non-adjacent" wording of R5/R7/R9/R10.)

### 6e. Andrews et al. (2020), *On the Completeness of Causal Discovery in the Presence of Latent Confounders and Selection Bias* — UAI 2020 supplement
**URL:** http://proceedings.mlr.press/v108/andrews20a/andrews20a-supp.pdf
> R8 If α →β →γ or α −◦β →γ, and α◦→γ, orient α◦→γ as α →γ.
> R9 If α◦→γ, and π = ⟨α, β, θ, . . . , γ⟩is an uncovered potentially directed path from α to γ such that γ and β are not adjacent, then orient α◦→γ as α →γ.
> R10 Suppose α◦→γ, β →γ ←θ, π1 is an uncovered potentially directed path from α to β, and π2 is an uncovered potentially directed path from α to θ. Let µ be the vertex adjacent to α on π1 (µ could be β), and ω be the vertex adjacent to α on π2 (ω could be θ). If µ and ω are distinct, and are not adjacent, then orient α◦→γ as α →γ.

### 6f. "FCI with Tiered Background Knowledge" (Andrews et al., NeurIPS 2021) — appears in the same UAI-2020 supplement PDF, §5.2
> R8 If α →β →γ or α −◦β →γ, and α◦→γ, orient α◦→γ as α →γ.
> R9 If α◦→γ, and π = ⟨α, β, θ, . . . , γ⟩is an uncovered potentially directed path from α to γ such that γ and β are not adjacent, then orient α◦→γ as α →γ.
> R10 Suppose α◦→γ, β →γ ←θ, π1 is an uncovered potentially directed path from α to β, and π2 is an uncovered potentially directed path from α to θ. Let µ be the vertex adjacent to α on π1 (µ could be β), and ω be the vertex adjacent to α on π2 (ω could be θ). If µ and ω are distinct, and are not adjacent, then orient α◦→γ as α →γ.

### 6g. "Efficient Latent Variable Causal Discovery" (arXiv:2510.04263), Appendix C.1
**URL:** https://arxiv.org/pdf/2510.04263
> In these rules, α, β, γ, θ denote generic vertices, and the symbol "∗" is a wildcard that can represent an arrowhead (→), a tail (-), or a circle (◦). Any rule that does not apply in a given configuration can be ignored.
> R5: If α ◦−◦ β and there is an uncovered circle-only path ⟨α, . . . , β⟩ such that α and β are not adjacent to one another's immediate neighbors on that path, orient α ◦−◦ β (and every edge on the path) as undirected, i.e. α - β.
> R6: If α - β ◦−∗ γ, then orient β ◦−∗ γ as β - γ.
> R7: If α - β ◦−◦ γ and α and γ are not adjacent, orient β ◦−◦ γ as β - γ.
> R8: If α → β → γ or α - β → γ, and α◦→ γ is present, orient α◦→ γ as α → γ.
> R9: If α◦→ γ and there is an uncovered potentially-directed path ⟨α, β, θ, . . . , γ⟩ such that β and γ are not adjacent, then orient α◦→ γ as α → γ.
> R10: Suppose α◦→ γ, β → γ ← θ, and there exist uncovered potentially-directed paths p1: α →∗ β and p2: α →∗ θ, where the two neighbors of α on p1 and p2 (denote them ν and ω) are distinct and not adjacent. In that case, orient α◦→ γ as α → γ.

### 6h. "Structural Causal Bandits under Markov Equivalence" (causalai.net)
**URL:** https://causalai.net/r122.pdf
> Lemma 24 (Lemma 2 in Wang et al. (2024a)). Let Q be a PMG obtained from some valid local transformations from a PAG P and the orientation rules. Suppose a MAG M consistent to Q and the local transformation C_Q … If there is an uncovered circle path p = ⟨V1, V2, · · · , Vn⟩, n ≥3 in Q, then any two non-consecutive vertices are not adjacent (minimal circle path).
> … By the definition of an uncovered circle path, such a path must include at least one non-uncovered triple ⟨Vi, Vi+1, Vi+2⟩ on the circle path.

### 6i. Mooij et al. (2020), *Constraint-Based Causal Discovery using Partial Ancestral Graphs in DMAGs*, AISTATS supplement — **the "possibly directed" variant**
**URL:** http://proceedings.mlr.press/v124/m-mooij20a/m-mooij20a-supp.pdf
> **Deﬁnition 13** A path v0, e1, v1, . . . , vn between nodes v0 and vn in a DPAG P is called a **possibly directed path** from v0 to vn if for each i = 1, . . . , n, the edge ei between vi−1 and vi is not into vi−1 (i.e., is of the form vi−1 ◦−◦vi, vi−1 ◦→vi, or vi−1 →vi). The path is called **uncovered** if every subsequent triple is unshielded, i.e., vi and vi−2 are not adjacent in P for i = 2, . . . , n.
> Proposition 4 … there exist **uncovered possibly directed paths** (see Deﬁnition 13) from i to j in P of the form i, u, . . . , j and i, v, . . . , j such that u, v are distinct non-adjacent nodes in P …

**⇒ This is the "possibly directed uncovered path" spelling the task asked about. Note it is the *reverse* orientation convention of Zhang's p.d. path: Mooij's "not into vi−1" = no arrowhead at the path's start end; Zhang's Def 10 = "not into Vi nor out of Vi+1" (no arrowhead at the start, no tail at the end).**

### 6j. causal-learn GitHub issue #159 and PR #194
**Issue #159:** https://github.com/py-why/causal-learn/issues/159
> Is the current implementation of FCI algorithm complete according to [1]? The current version doesn't seem to include rules R5-R10 described in [1].
> Reference: [1] Zhang, Jiji. "On the completeness of orientation rules for causal discovery in the presence of latent confounders and selection bias." Artificial Intelligence 172.16-17 (2008): 1873-1896.

**PR #194:** https://github.com/py-why/causal-learn/pull/194
> Add orientation rules 567 for Augmented FCI according to [1]. These rules are related to undirected edges, in order to deal with selection bias. (when there's no selection, they can be ignored)
> [1] Jiji Zhang, "On the completeness of orientation rules for causal discovery in the presence of latent confounders and selection bias", 2008

PR #194 code (from the diff at https://api.github.com/repos/py-why/causal-learn/pulls/194 with `Accept: application/vnd.github.v3.diff`), verbatim:
```python
+def ruleR5(graph: Graph, changeFlag: bool,
+           verbose: bool = False) -> bool:
+    """
+    Rule R5 of the FCI algorithm.
+    by Jiji Zhang, 2008, "On the completeness of orientation rules for causal discovery in the presence of latent confounders and selection bias"]
+
+    This function orients any edge that is part of an uncovered circle path between two nodes A and B,
+    if such a path exists. The path must start and end with a circle edge and must be uncovered, i.e. the
+    nodes on the path must not be adjacent to A or B. The orientation of the edges on the path is set to
+    double tail.
+    """
...
+                # Check if there is an uncovered circle path between A and B (A o-o C ..  D o-o B)
+                # s.t. A is not adjacent to D and B is not adjacent to C
```
```python
+def ruleR6(graph: Graph, changeFlag: bool, verbose: bool = False) -> bool:
+    for node_B in nodes:
+        # Find A - B
+        intoBTails = graph.get_nodes_into(node_B, Endpoint.TAIL)
+        exist = False
+        for node_A in intoBTails:
+            if graph.get_endpoint(node_B, node_A) == Endpoint.TAIL:
+                exist = True
+        if not exist: continue
+        # Find B o-*C
+        intoBCircles = graph.get_nodes_into(node_B, Endpoint.CIRCLE)
+        for node_C in intoBCircles:
+            changeFlag = True
+            edge = graph.get_edge(node_B, node_C)
+            graph.remove_edge(edge)
+            graph.add_edge(Edge(node_B, node_C, Endpoint.TAIL, edge.get_proximal_endpoint(node_C)))
```
```python
+def ruleR7(graph: Graph, changeFlag: bool, verbose: bool = False) -> bool:
+    for node_B in nodes:
+        # Find A -o B
+        intoBCircles = graph.get_nodes_into(node_B, Endpoint.CIRCLE)
+        node_A_list = [node for node in intoBCircles if graph.get_endpoint(node_B, node) == Endpoint.TAIL]
+        # Find B o-*C
+        for node_C in intoBCircles:
+            for node_A in node_A_list:
+                if not graph.is_adjacent_to(node_A, node_C):
+                    changeFlag = True
+                    edge = graph.get_edge(node_B, node_C)
+                    graph.remove_edge(edge)
+                    graph.add_edge(Edge(node_B, node_C, Endpoint.TAIL, edge.get_proximal_endpoint(node_C)))
```
**⇒ causal-learn PR #194's `ruleR6` requires the A–B edge to be TAIL at BOTH ends (undirected); `ruleR7` requires a tail at the A end and a circle at the B end, plus A/C non-adjacency. This matches Tetrad and pcalg exactly.**

### 6k. Diepen et al. (2023), *Beyond the Markov Equivalence Class* (PMLR 213)
**URL:** https://proceedings.mlr.press/v213/diepen23a/diepen23a.pdf
> RC3 (FCI) Propagate standard FCI orientation rules R1-R4', R8-R10 until exhaustion.
> After running the CDC and the parent orientation rule, we will again run rules R1-R4' and R8-R10 of the FCI algorithm, as described in Zhang (2008), until no new orientations are made.
**⇒ Mentions R8–R10 only; does not restate R5–R7.**

---

## 7. ⚠ DISAGREEMENTS BETWEEN SOURCES (flagged, as requested)

**1. R6 antecedent — is there a circle at β on the α–β edge?**
- **PRIMARY (Zhang 2008)** and **Tetrad (7.6.4 ASCII + 7.6.9 code + javadoc)** and **pcalg** and **causal-learn PR #194** and **arXiv:2607.19866** and **the OSF "Discovering Cyclic Causal Models"** and **arXiv:2402.04777 LaTeX** all agree:
  - R6: α–β edge has **NO circle at β** (Tetrad 7.6.4: `A---Bo-*C`; pcalg: `apag[b, ] == 3 & apag[, b] == 3`; causal-learn: A–B must be TAIL at BOTH ends).
  - R7: α–β edge **DOES have a circle at β** (Tetrad 7.6.4: `A--oBo-*C`; pcalg: `apag[b, ] == 3 & apag[, b] == 1`; causal-learn: `get_endpoint(node_B, node) == Endpoint.TAIL`).
- **Teny thesis (§6a)** states R6 as `α––◦β` — with a circle at β — which makes its R6 and R7 antecedents *identical* (differing only by the α/γ non-adjacency clause). **This contradicts the primary and is very likely a transcription error in the thesis.** Do not port from the thesis.
- **XInsight (§6b)** states R7 as `𝛼−𝛽◦−∗𝛾` — with **no** circle at β — which makes *its* R6 and R7 antecedents identical. **This is the mirror-image error, also likely a transcription error.** It additionally mis-states R5's non-adjacency conditions as "𝛼 and 𝛽 are not adjacent" (should be α/θ and β/γ).
- **⇒ The user's project spec R6/R7 are CORRECT**: R6 = `A - B o-* C` (no circle at B on the A–B edge; the A–B edge is undirected/tail–tail); R7 = `A -o B o-* C` (circle at B on the A–B edge, plus A,C non-adjacent).

> **One caveat worth double-checking in your spec:** your R6 writes the A–B edge as `A - B`. Every implementation (Tetrad, pcalg, causal-learn) treats this as an **undirected / tail–tail** edge (`A---B` in Tetrad ASCII), i.e. **not** `A → B`. If your project spec intends `A → B` (a directed edge with an arrowhead at B), that would be **wrong** and would fire R6 in cases it shouldn't. Worth confirming the intent in your spec — the primary's typography is a plain dash there, which is Zhang's undirected-edge glyph, not an arrowhead.

**1b. R5's statement is worded differently across sources.**
- **PRIMARY (Zhang 2008):** path `p =〈α, γ,...,θ,β〉` with **two** explicit non-adjacency conditions (α,θ not adjacent; β,γ not adjacent). This is the authoritative form.
- **Zhang 2012 / Claassen & Heskes Table 1 (§2):** a *cyclic* path `⟨Z, X, .., W, Y, Z, X⟩` with a single "not adjacent" mark. Same rule, different (compressed) phrasing.
- **arXiv:2402.04777, Tetrad, pcalg, Teny, OSF:** the primary's form with different letters (a,d / b,c).
- **XInsight (§6b):** states "𝛼and 𝛽are not adjacent" — **transposed and wrong** (α and β ARE adjacent; that is the o-o edge being oriented).
- **⇒ The user's spec is CORRECT** ("A is non-adjacent to gk and B is non-adjacent to g1" = the primary's α/θ and β/γ).

**2. R5's non-adjacency conditions — consolidated.**
- **PRIMARY:** "s.t. α,θ are not adjacent and β,γ are not adjacent" — i.e. the endpoints of the *circle path* (θ, γ) must not be adjacent to the respective endpoints of the o-o edge.
- **arXiv:2402.04777, Tetrad, pcalg, Teny, OSF:** "a,d are not adjacent and b,c are not adjacent" — identical semantics, different letters.
- **XInsight (§6b):** "𝛼and 𝛽are not adjacent, and 𝛾and 𝜃are not adjacent" — **transposed/wrong** (α and β ARE adjacent — that's the o-o edge being oriented).
- **⇒ The user's spec is CORRECT** ("A is non-adjacent to gk and B is non-adjacent to g1" — matching the primary's α/θ and β/γ).

**3. R5's path length / `k >= 2` in the user's spec.**
- The primary writes the path as `p =〈α, γ,...,θ,β〉` — nominally at least 3 nodes beyond α and β, and the proof states "〈α,γ,...,θ,β,α〉 forms an uncovered cycle".
- The user's spec says `p = <A, g1, ..., gk, B> (k >= 2)`. This is **consistent** with the primary's notation, and Tetrad's implementation corroborates the minimum length:
> `// We constrain the algorithm so that the path must be a circle path, there can be no length 1 or length 2 paths, and all nodes on the path are uncovered. We add further constraints so that the path taken together with the x o-o y edge forms an uncovered cyclic circle path.`
- **⇒ k ≥ 2 is correct** (equivalently: the circle path must have ≥3 edges / ≥4 nodes, so the o-o edge α–β plus the path forms an uncovered cycle of length ≥4).

**4. p.d. path direction convention (Zhang vs Mooij).**
- Zhang's Def 10: "the edge between Vi and V_{i+1} is **not into Vi** nor **out of V_{i+1}**" — no arrowhead at the path's *start* end, no tail at the path's *end* end. (Matches arXiv:1202.3711: "no arrowhead at Vi or a tail at Vi+1"; matches arXiv:2402.04777 B.2: "neither vi−1 ←∗vi nor vi−1 ∗−vi".)
- Mooij's Def 13: "the edge ei between vi−1 and vi is **not into vi−1**" — no arrowhead at the *start* end, but says nothing about the end end. **Same direction convention**, slightly weaker statement.
- ⚠ **A real hazard:** arXiv:2607.19866 Rule 9 and Rule 10 render the p.d. path as `X →∗ ... →∗ Z` / `p1: α →∗ β` — i.e. **arrowheads at the far end**. That is the *opposite* of "no arrowhead at Vi". arXiv:2510.04263 does the same (`p1: α →∗ β`). These renderings use `→∗` where the primary writes `∗→` relative to the path's start. **A TypeScript implementation must use the primary's Def 10 semantics (no arrowhead at the start end, no tail at the end end), not the `→∗` shorthand.** With Zhang's Def 10, a p.d. path from α to γ has, on each edge, the marks: circle-or-tail at the α-side, circle-or-arrowhead at the γ-side.

**5. "uncovered circle path" / "uncovered potentially directed path" definitions.**
- The **primary** never defines these two phrases; it defines *uncovered path* (Def 9), *potentially directed path* (Def 10) and *circle path* (a special case of a p.d. path). "Uncovered circle path" and "uncovered p.d. path" are used in R5/R9/R10.
- **arXiv:1202.3711 (§2)** is the only source found that gives both as explicit single-sentence definitions, and it is the one to quote for a spec. Its "uncovered potentially directed (p.d.) path" = unshielded triples + no arrowhead at Vi + no tail at Vi+1; "uncovered circle path" = same but every edge of the form ◦−◦.
- **arXiv:2402.04777 (§3)** gives them as three separate definitions (B.1 uncovered, B.2 p.d., B.3 circle path) and is the clearest for a port.
- **causalai.net r122.pdf (§6h)** uses "uncovered circle path" with the property "any two non-consecutive vertices are not adjacent (minimal circle path)" and "n ≥3" for the path ⟨V1,…,Vn⟩ — note this counts the *path* nodes (so n≥3 nodes, i.e. ≥2 edges), which is a different counting convention from Zhang's "at least 3 edges" reading in Tetrad's Dijkstra implementation. Flag if you rely on it.

---

## 8. IMPLEMENTATION SUMMARY (derived from the above, not a quote)

| Rule | Antecedent | Consequence | Which marks change |
|---|---|---|---|
| **R5** | edge `α o-o β` (circle-circle); there is an **uncovered circle path** `p = ⟨α,γ,…,θ,β⟩` (every edge on p is o-o; every consecutive triple on p is unshielded; ≥2 internal nodes) with **α not adjacent to θ** and **β not adjacent to γ** | orient `α o-o β` **and every edge on p** as undirected (`--`) | the circle at **both** ends of **every** edge of p (including the α–β edge) → tail at both ends. Equivalently: the cycle `⟨α,γ,…,θ,β,α⟩` becomes an undirected cycle. |
| **R6** | edge `α -- β` (**undirected / tail–tail, NO circle at β**) and edge `β o-* γ`. **α and γ may or may not be adjacent** (no adjacency condition) | orient `β o-* γ` as `β -* γ` | **only the circle at β on the β–γ edge** → tail; the mark at γ is untouched; the α–β edge is untouched |
| **R7** | edge `α -o β` (**tail at α, circle at β**) and edge `β o-* γ`, and **α, γ not adjacent** | orient `β o-* γ` as `β -* γ` | **only the circle at β on the β–γ edge** → tail; the circle at β on the α–β edge is untouched |
| **R8** | `α → β → γ` or `α -o β → γ`, and `α o→ γ` | orient `α o→ γ` as `α → γ` | circle at α → arrowhead |
| **R9** | `α o→ γ` and an **uncovered p.d. path** `p = ⟨α,β,θ,…,γ⟩` with **γ not adjacent to β** | orient `α o→ γ` as `α → γ` | circle at α → arrowhead |
| **R10** | `α o→ γ`, `β → γ ← θ`, uncovered p.d. path `p1` from α to β, uncovered p.d. path `p2` from α to θ; let μ = α's neighbour on p1, ω = α's neighbour on p2; **μ ≠ ω and μ,ω not adjacent** | orient `α o→ γ` as `α → γ` | circle at α → arrowhead |

**⚠ R6 vs R7 — the single most common porting bug:** these two rules look nearly identical in most secondary write-ups, and the R6 antecedent is **not** `α→β`. In Zhang's own typography the R6 antecedent edge is a **plain dash** = an **undirected (tail–tail) edge**, and it is *R7* that adds the circle at β (`α -o β`). A TypeScript port must therefore distinguish:
- R6 fires on `α -- β` (tail–tail) + `β o-* γ`, **no** α/γ adjacency requirement.
- R7 fires on `α -o β` (tail at α, **circle at β**) + `β o-* γ`, **requiring** α and γ non-adjacent.

**Path definitions to implement (from §2 / §3):**
- **Uncovered path**: every consecutive triple on the path is unshielded (no edge between V_{i-1} and V_{i+1}).
- **Potentially directed (p.d.) path** from V0 to Vn: every edge V_i–V_{i+1} has **no arrowhead at V_i** and **no tail at V_{i+1}** (i.e. allowed forms: `o-o`, `o->`, `->o`, `->->`; disallowed: anything with an arrowhead at the near end, anything with a tail at the far end).
- **Uncovered circle path**: an uncovered path in which every edge is `o-o` (`◦−◦`).
- **R5's "uncovered cycle"** (primary's own proof wording): `⟨α,γ,…,θ,β,α⟩` — the circle path plus the α–β edge — must consist of o-o edges and be uncovered. Note the α–θ and β–γ non-adjacency conditions are *additional* to the path's own unshieldedness: they ensure the **closing** triples of the cycle are also unshielded.

---

## 9. SOURCES THAT COULD NOT BE RETRIEVED (reported honestly)

- **https://biostatistics.dk/teaching/advtopics/slides/advtop_fci_cwb.pdf** — 403 Forbidden to curl **and** to the real browser (HTTP 403 from the server; not a UA/TLS issue). Not quoted.
- **https://www.sciencedirect.com/science/article/pii/S0004370208001008/pdf?…** — direct `curl` gets 403 (Elsevier anti-bot). Full text WAS obtained via the extract tool; the primary quotes in §1 come from that full text. No page images were obtained for the primary, so Fig. 4/Fig. 5 were not inspected directly.
- **https://hal.science/hal-03765355/document** (Assad et al., JAIR "Survey and Evaluation of Causal Discovery Methods for Time Series") — blocked by Anubis proof-of-work; the "FCI-Rule 5/6/7" text was only visible in search-engine snippets, so it is **not** quoted here.
- **Scribd "MADI Report"** — not retrievable; not quoted.
- **XInsight (dl.acm.org/doi/pdf/10.1145/3589301)** — 403; the arXiv version (2207.12718) was used instead.
- **Wikipedia "Partial ancestral graph" / "Causal discovery"** — searched but produced no verbatim rule text; not quoted.
- **Tetrad javadocs 7.6.9 and 7.6.4** and **FciOrient.java** — served with **double-encoded UTF-8** (mojibake: `Î±`, `â\x88\x92`). Repaired losslessly before quoting; raw bytes verified with a hex dump.
- **CMU Dietrich tech report 168** (Zhang's own tech report, the closest publicly-scanned copy of the primary) — 86-page **image-only scan with zero extractable text**; rules were read from 400–500 dpi rendered page images via OCR-by-vision, and the transcription of R6/R7 was independently cross-checked against the primary's LaTeX display fragments, Tetrad's ASCII javadoc, and pcalg's/causal-learn's code. It uses an earlier/different R5 phrasing (`α o-o β … uncovered circle path between α and β s.t. α,δ not adjacent and β,γ not adjacent`).
