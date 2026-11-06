"""
apply_seam.py — the application seam: named, and deliberately NOT connected.

The adjustment grammar (grammar.py) emits weight-0 reasoning records into
a shadow ledger. Nothing in v1 applies those records to anything: no
distribution is shifted, no price is moved, no candidate is touched,
emission stays ZERO_OBJECT.

If a future gate ever clears adjustments for application, THIS is the
only door: an applicator implementing AdjustmentApplicationSeam.apply(),
called with an explicit gate-clearance token issued by that gate. The
shape is fixed now so the wiring, when and if it is ever authorized, is
a single reviewed connection instead of a new invention — and so that
any code path that tries to apply adjustments without going through the
seam is visible in review.

v1 ships exactly one behavior: refusal. apply() raises SeamNotConnected
unconditionally. grammar.py never imports this module.
"""


class SeamNotConnected(Exception):
    """Raised on any attempt to apply adjustment records in v1."""


class AdjustmentApplicationSeam:
    """Contract for a future, gate-cleared applicator.

    A conforming implementation (none exists in v1) would:
    - accept only records that pass grammar.fence_problems();
    - require `gate_clearance` to name the clearing gate and its frozen
      manifest (RVC clearance on a frozen manifest is the fleet's standing
      bar for anything that touches a live number);
    - return a NEW candidate object, never mutate one in place;
    - log every application back into the adjustment ledger's lineage.

    Until such an implementation is built and cleared, the seam refuses.
    """

    def apply(self, records, candidate, *, gate_clearance=None):
        raise SeamNotConnected(
            "adjustment application is not connected in v1: records are "
            "weight-0 reasoning artifacts; no gate has cleared application, "
            "and this seam is the only door. (records=%d, gate_clearance=%r)"
            % (len(records), gate_clearance))

    @staticmethod
    def describe():
        return {
            "seam": "AdjustmentApplicationSeam.apply",
            "connected": False,
            "reason": "v1 is shadow-only by doctrine: adjustments are reasoning-layer records at weight 0; emission is ZERO_OBJECT; no gate has cleared application",
            "would_require": [
                "RVC clearance on a frozen manifest",
                "backtested magnitudes (spec build-order step 6) replacing the qualitative bands",
                "a reviewed applicator implementation behind this seam",
            ],
        }
