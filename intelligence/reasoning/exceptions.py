# Provenance: reasoning-depth-spec.md §4 (escalation triggers, "skipping levels is a logged
# exception, never silent"), §5 (checklist gate), §7 (contract rules: published picks/cards
# MUST be L5 — anything else is a contract violation, surfaced loudly), §10 (definition of done).

"""Typed errors for the reasoning engine.

The engine fails loudly and specifically: a silent downgrade, an unchecked track, or a
below-L5 publication is a contract violation, not a warning.
"""


class ReasoningError(Exception):
    """Base class for all reasoning-engine errors."""


class ContractViolation(ReasoningError):
    """A hard spec contract was broken.

    Raised (never swallowed) when: analyze() is asked to produce a published pick or
    card below L5; a trace claims L5 without the checklist passing; the L5 synthesis
    does not honor Garrett's hierarchy (OL → scheme → QB).
    """


class ChecklistInvalid(ReasoningError):
    """The no-blind-spots checklist gate rejected the trace, spec §5.

    Carries the offending track names so the caller can fix the intake, not the validator.
    """

    def __init__(self, message: str, invalid_tracks: list[str] | None = None):
        super().__init__(message)
        self.invalid_tracks = invalid_tracks or []


class LevelSkipped(ReasoningError):
    """Raised only in strict mode when a level was skipped without a logged exception.

    Normal operation logs the skip as an EscalationEntry (skipped=True) instead of
    raising; this error exists for audit harnesses that forbid skips entirely.
    """


class WeakLinkError(ReasoningError):
    """A load-bearing L3 chain link is INFERENCE or SINGLE_SOURCE and was not flagged.

    Per spec §4 L3, inference links must carry breaking conditions; per §8 T5 the trace
    must be flagged weak_link=True and the breaking condition machine-checkable.
    """


class TraceNotFound(ReasoningError):
    """A resume was requested for a trace id the store does not have (spec §2.6)."""


class InvalidDepth(ReasoningError):
    """analyze() received a requested_depth that is not a ReasoningDepth."""


class AdversaryNotWired(ReasoningError):
    """L4 was reached but no adversary module is registered.

    The adversary is mandatory, not optional — the engine refuses to fake L4.
    """
