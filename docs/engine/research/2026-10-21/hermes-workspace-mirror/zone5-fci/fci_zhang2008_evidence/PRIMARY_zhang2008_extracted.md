SOURCE: https://www.sciencedirect.com/science/article/pii/S0004370208001008/pdf?md5=03171b4be4f0081617691c24f18ea85f&pid=1-s2.0-S0004370208001008-main.pdf
PRIMARY: Zhang, J. (2008). On the completeness of orientation rules for causal discovery in the presence of latent confounders and selection bias. Artificial Intelligence 172(16-17), 1873-1896.
NOTE: raw text layer as served by the publisher. Inline math is interleaved with display-math fragments by the extractor; prose is verbatim.

=========== SECTION 4: EXTRA ORIENTATION RULES (R5-R10) + DEFINITIONS 9/10 ===========

 of uncovered path is of course that after _R0_ is executed, every consecutive triple on the path has
a definite status either as a collider or as a non-collider.

Definition 10 (potentially directed path). In a PMG, a path p =〈V0,...,Vn〉 is said to be potentially directed (abbreviated as
**p.d.**) fromV0to Vnif for every 0 _i n_ − 1, the edge between Viand _V_ i+1is not into Vior out of _V_ i+1.

$$
p=\\langle V\_0,\\ldots,V\_n\\rangle
$$

$$
V\_{0}
$$

$$
V\_{n}
$$

$$
V\_{i}
$$

$$
0\\leqslant i\\leqslant n-1
$$

$$
V\_{i+1}
$$

$$
V\_{i}
$$

$$
V\_{i+1}
$$

Intuitively, a p.d. path is one that could be oriented into a directed path by changing the circles on the path into
appropriate tails or arrowheads. As we shall see, uncovered p.d. paths play an important role in locating invariant tails.
A special case of a p.d. path is where every edge on the path is of the form ◦−−◦; we call such a **pathacircle path.**

Here is the first block of additional rules:

_R5_ For every (remaining)
not adjacent and _β, γ_
_R6_ Ifα—β◦−−∗ _γ_ ( _α_ and

α◦−−◦β, if there is an uncovered circle path _p_ =〈 _α, γ,...,θ,β_〉 between _α_ and _β_ s.t. _α,θ_ are
are not adjacent, then orient α◦−−◦β and every edge on _p_ as undirected edges (—).
_γ_ may or may not be adjacent), then orient β◦−−∗ _γ_ as _β_ −− ∗ _γ._

$$
\\alpha\\circ{\\mathrm{ 一 }}\\circ\\beta,
$$

$$
p=\\langle\\alpha,\\gamma,\\ldots,\\theta,\\beta\\rangle
$$

$$
\\alpha\\circ\\text{—}\\alpha
$$

$$
\\beta,\\gamma
$$

$$
\\beta
$$

$$
\\alpha-\\beta\\circ—\\ast\\gamma
$$

$$
\\gamma
$$

$$
\\beta\\circ—\\ast\\gamma
$$

$$
\\alpha—\\circ\\beta\\circ—\\ast\\gamma
$$

_R7_ Ifα −− ◦ β◦−−∗ _γ,_ and _α, γ_ are not adjacent, then orient β◦−−∗ _γ_ as _β_ −− ∗ _γ._

$$
\\beta—\*\\gamma
$$

$$
\\beta\\circ—\\ast\\gamma
$$

$$
\\beta—\*\\gamma.
$$

A pictorial illustration of _R5_– _R7_ is given in Fig. 4. These rules are obviously related to undirected edges. _R5_ leadto
undirected edges, and _R6_ depend on undirected edges. So if it is known that the true casual MAG does not contain
undirected edges—for example, in those cases where selection bias is known to be absent—these two are not needed.
In that case, moreover, _R7_ will not get triggered at all, because neither _R0_– _R4_ introduced earlier nor _R8_–R10 to be
introduced shortly can lead to −− ◦ edges, which are in the antecedent of R7.

17See \[2\] for an alternative and perhaps more efficient formulation of this rule that takes on a special kind of discriminating paths.

18Ali et al. \[2\] employed a slightly different graphical object, called _Joined Graphs,_ to represent Markov equivalence classes of MAGs. The difference
between Joined Graphs and PAGs is just that the former only represent invariant arrowheads, and do not distinguish between tails and circles. This makes
Joined Graphs syntactically simpler, at the price of losing information about invariant tails. Our result in this paper can also be seen as an attempt to
distinguish between real tails and pseudo tails in joined graphs.

* * *

$ \\alpha $ $ \\beta $ $ \\diamond $ $ \\alpha $ $ \\beta $

$R6$ $R7$

**Fig. 4.** Graphical illustrations of _R5_–R7.

That is why we introduce these three rules as a block. If there is no issue of selection bias, we would only consider
19
MAGs with directed and bi-directed edges, in which case _R5_– _R7_ can be ignored in principle. The next block of rules, by
contrast, may still be applicable.

_R8_ Ifα → _β_ → _γ_ or

α−− ◦ _β_ → _γ,_ and α◦→ _γ,_ orientα◦→ _γ_

as _α_ → _γ._

$$
\\alpha\\rightarrow\\beta\\rightarrow\\gamma
$$

$$
\\alpha—\\circ\\beta\\rightarrow\\gamma
$$

$$
\\alpha\\circ\\rightarrow\\gamma
$$

$$
\\alpha\\rightarrow\\gamma
$$

_R9_ Ifα◦→ _γ,_ and _p_
orient α◦→ _γ_ as

=〈 _α,β,θ,...,γ_ 〉 is an uncovered p.d. path from
_α_ → _γ._

_α_ to _γ_ such that _γ_ and _β_ are not adjacent, then

$$
\\alpha\\circ\\rightarrow\\gamma
$$

$$
p=\\langle\\alpha,\\beta,\\theta,\\ldots,\\gamma\\rangle
$$

$$
\\beta
$$

$$
\\alpha\\circ\\rightarrow\\gamma
$$

$$
\\alpha\\rightarrow\\gamma
$$

R10 Suppose α◦→ _γ, β_ → _γ_ ← _θ, p_ 1is an uncovered p.d. path from _α_ to _β,_ and _p_ 2is an uncovered p.d. path from _α_ to
_θ._ Letμ be the vertex adjacent to _α_ on _p_ 1( _μ_ could be β), and _ω_ be the vertex adjacent to _α_ on _p_ 2( _ω_ could be θ).
If _μ_ and _ω_ are distinct, and are not adjacent, then orient α◦→ _γ_ as _α_ → _γ._

## α on p 1 ( μ could be

$$
\\alpha
$$

$$
\\alpha\\circ\\rightarrow\\gamma,\\beta\\rightarrow\\gamma\\leftarrow\\theta,p\_{1}
$$

$$
\\beta,
$$

$$
p\_{2}
$$

$$
\\theta.
$$

$$
p\_{1}
$$

$$
\\mu
$$

$$
\\beta)
$$

$$
p\_{2}
$$

$$
\\alpha
$$

$$
\\theta)
$$

$$
\\mu
$$

$$
\\omega
$$

$$
\\alpha\\circ\\rightarrow\\gamma
$$

$$
\\alpha\\rightarrow\\gamma
$$

These rules are visualized in Fig. 5. All of them are about turning partially directed edges ◦→
are valuable because ↔ and → represent very different causal information.

into directed ones →, which

$$
\\rightarrow
$$

$$
\\circ{\\to}
$$

Call the FCI algorithm supplemented with these rules the Augmented FCI (AFCI) algorithm.
rules are sound.

20
We first show that these

$$
\\cdot^{20}
$$

**Theorem 1.** _Let PFCI be the output of the FCI algorithm, and PAFCI the graph resulting from applying R5_–R10 _to PFCI until none of_
_them applies. The extra tails introduced in PAFCI are invariant._

$$
\\mathcal{P}\_{FCI}
$$

$$
\\mathcal{P}\_{AFCI}
$$

$$
\\mathcal{P}\_{FCI}
$$

$$
\\mathcal{P}\_{AFCI}
$$

**Proof.** For each rule, we just need to show that any mixed graph that violates the rule does not belong to \[GT\], i.e., is either
not a MAG or not Markov equivalent to _GT._ The theorem then follows by a simple induction.

$$
\[\\mathcal{G}\_T\]
$$

$$
\\mathcal{G}\_{T}
$$

R5: The antecedent of this rule implies that 〈 _α, γ,...,θ,β,α_〉 forms an uncovered cycle that consists of ◦−−◦ edges.
Suppose a mixed graph, contrary to what the rule requires, has an arrowhead on this cycle. In light of R1, the cycle must
be oriented as a directed cycle to avoid unshielded colliders not in _GT._ But then the graph is not ancestral.

$$
\\langle\\alpha,\\gamma,\\ldots,\\theta,\\beta,\\alpha\\rangle
$$

$$
0—0
$$

$$
\\mathcal{G}\_{T}
$$

$$
\\alpha-\\beta\\leftarrow\*\\gamma
$$

R6: if any graph, contrary to what the rule requires, contains _α_—β←∗γ, the graph is not ancestral.

R7: Suppose a mixed graph, contrary to what the rule requires, has an arrowhead at _β_ onthe edge betweenβ and _γ._
Then either _α_— _β←∗γ_ is present, in which case the graph is not ancestral; or _α_ → _β←∗γ_ is present, in which case the
graph contains an unshielded collider not in _GT._

$$
\\alpha-\\beta\\leftarrow\*\\gamma
$$

$$
\\beta
$$

$$
\\alpha\\rightarrow\\beta\\leftarrow\*\\gamma
$$

$$
\\beta
$$

$$
\\gamma.
$$

$$
\

=========== SOUNDNESS PROOFS R5-R8 ===========

_{AFCI}
$$

$$
\\mathcal{P}\_{AFCI}^{C}
$$

$$
\\mathcal{P}\_{AFCI}
$$

$$
\\mathcal{P}\_{AFCI}^{C}
$$

C C
**Lemma 4.1.** _For every edge_ A◦−−◦ _B inPAFCI, PAFCI can be oriented into a DAG with no unshielded colliders in which A_ → _B appears,_
_and can also be oriented into a DAG with no unshielded colliders in which A_ ← _B appears._

$$
A\\circ\\text{—}\\circ B
$$

$$
\\mathcal{P} _{AFCI}^{C},\\mathcal{P}_{AFCI}^{C}
$$

$$
A\\rightarrow B
$$

$$
A\\gets B
$$

The proof is given in Appendix A, which makes use of Lemma 5 in Meek (1995). This fact is relevant because of the
following theorem:

**Theorem 2.** _Let H be the graph resulting from the following procedure applied to PAFCI:_

$$
\\mathcal{P}\_{AFCI};
$$

(1) _orient the circles on_ ◦→ _edges in PAFCI as tails, and orient the circles on_ −− ◦ _edges in PAFCI as arrowheads_ ( _that is, turn all_ ◦→
_edges and all_ −− ◦ _edges into directed edges_ →); _and_

$$
\\mathcal{P}\_{AFCI}
$$

$$
\\mathcal{P}\_{AFCI}
$$

$$
\\text{—}\\text{"}
$$

$$
\\circ{\\to}
$$

$$
\\rightarrow);
$$

(2) _orient PAFCIC into a DAG with no unshielded colliders._

$$
\\mathcal{P}\_{AFCI}^{C}
$$

$$
\[\\mathcal{G}\_T\].
$$

_Then H is a member of_ \[ _GT\]._

$$
\\mathcal{H}
$$

The proof of this theorem is given in Appendix A. The theorem has a couple of important implications. First, it suggests a
way to turn _PAFCI,_ a representation of a Markov equivalence class of MAGs, into a representative MAG. What is special about
this construction is that no extra undirected edges or bi-directed edges are introduced. So the outcome is a representative
member of the Markov equivalence class with the fewest undirected edges and bi-directed edges. Such a representative is
conceivably easier to fit and score than other members in the class, in light of the fact that UGs are in general harder to
fit than DAGs and the results presented in \[10\] suggesting that it is better to have fewer bi-directed edges in fitting a MAG
model. If so, it will be particularly useful for developing score-based causal discovery algorithm based on MAGs.

$$
\\ma