# Provenance: reasoning-depth-spec.md §4 (Reasoning levels L1–L5), §6.2 (verification
# statuses), §6.3 (checklist verdicts), §7 (API shape). Implements the closed enums that
# every downstream consumer (adversarial layer c08, checklist validator, UI) depends on.

"""Closed enumerations for the GSE reasoning engine.

These enums are closed by spec: adding a value is a schema migration, not a casual
edit, because persisted traces and cross-agent contracts depend on them.
"""

from enum import Enum


class ReasoningDepth(str, Enum):
    """Reasoning levels L1–L5 per spec §4.

    L1 — Direct lookup: single profile/table/line. No cross-referencing.
    L2 — Cross-stat correlation: two or more signals combined.
    L3 — Causal chain: explicit cause → mechanism → outcome, each link sourced.
    L4 — Adversarial: dedicated adversary attempts to kill the L3 thesis.
    L5 — Synthesis across corpus + live signals. Only L5 may produce a
         public-facing pick or multi-leg card.
    """

    L1 = "L1"
    L2 = "L2"
    L3 = "L3"
    L4 = "L4"
    L5 = "L5"

    @classmethod
    def ordered(cls) -> list["ReasoningDepth"]:
        return [cls.L1, cls.L2, cls.L3, cls.L4, cls.L5]

    def rank(self) -> int:
        return self.ordered().index(self)

    def is_at_least(self, other: "ReasoningDepth") -> bool:
        return self.rank() >= other.rank()


class Verification(str, Enum):
    """Verification status of a factual claim, spec §6.2.

    CORPUS       — ingested from a sourced dataset or document. Traceable to file/row.
    COMPUTED     — derived by engine code from CORPUS inputs. Reproducible: the trace
                   stores the code version + inputs hash.
    SINGLE_SOURCE — one outlet, uncorroborated. Cannot be load-bearing at L4+
                    without an explicit flag.
    INFERENCE    — model judgment. Must carry its breaking condition (spec §4 L3).
    """

    CORPUS = "CORPUS"
    COMPUTED = "COMPUTED"
    SINGLE_SOURCE = "SINGLE_SOURCE"
    INFERENCE = "INFERENCE"


class ChecklistVerdict(str, Enum):
    """Per-track verdict of the no-blind-spots checklist, spec §6.3.

    CLEAR            — checked, material factored into the chain.
    NOTHING_MATERIAL — checked, nothing moves the needle. Recorded: silence is not evidence.
    DATA_GAP         — no usable data. The L4 adversary must assume the worst plausible value.
    CONFLICT         — track disagrees with another track. Auto-escalates to L4.
    UNCHECKED        — valid only below L3. At L3+, UNCHECKED on any track invalidates the trace.
    """

    CLEAR = "CLEAR"
    NOTHING_MATERIAL = "NOTHING-MATERIAL"
    DATA_GAP = "DATA-GAP"
    CONFLICT = "CONFLICT"
    UNCHECKED = "UNCHECKED"


class Exposure(str, Enum):
    """What the analysis is for. Drives the depth contract, spec §7.

    none           — internal exploration. Any depth.
    analysis       — internal analysis with real reasoning. Any depth, checklist recommended.
    published_pick — a pick that could be published. MUST be L5.
    card           — a multi-leg card. MUST be L5.
    """

    NONE = "none"
    ANALYSIS = "analysis"
    PUBLISHED_PICK = "published_pick"
    CARD = "card"

    def requires_l5(self) -> bool:
        return self in (self.PUBLISHED_PICK, self.CARD)


# The five mandatory intelligence tracks, spec §5. Every L3+ analysis must record a
# verdict for each — including "checked, nothing material."
TRACKS: tuple[str, ...] = (
    "qb_behavior",      # QB behavioral profile (starter + relevant backups)
    "coaching_scheme",  # HC + OC/playcaller + DC tendencies, YoY deltas
    "offensive_line",   # unit health, continuity, pressure allowed vs expected
    "trust_signals",    # social/video/news intake for both teams
    "scheme_matchup",   # OL-vs-DL, scheme-vs-scheme neutralization check
)

# Conflict-resolution precedence, spec §5: live-verified > computed > corpus >
# single-source > inference. Maps Verification → precedence rank (higher wins).
VERIFICATION_PRECEDENCE: dict[Verification, int] = {
    Verification.COMPUTED: 4,   # live-verified/computed from corpus inputs
    Verification.CORPUS: 3,     # corpus-sourced
    Verification.SINGLE_SOURCE: 2,
    Verification.INFERENCE: 1,
}
