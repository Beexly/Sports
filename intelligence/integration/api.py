# PROVENANCE: thin provider-wiring façade over the canonical reasoning engine
# (reasoning/). Converged 2026-10-02: reasoning/ owns the ONE contract —
# engine, escalation state machine, c08 adversarial layer, checklist validator,
# and canonical types. This module keeps the provider-wired public surface
# (analyze/adversary_review/correlated_theses/validate_checklist) and the
# ProviderRegistry vocabulary, but every reasoning operation delegates to
# reasoning/. No independent pipeline, no parallel types.
#
# Research basis: reasoning-depth-spec.md §7 (API shape), §4 (escalation),
# §5 (checklist gate), §2.6 (resume); contracts/integration-contracts.md §1.
"""Unified intelligence API: provider-wired façade over the canonical engine.

Callers pass a ProviderRegistry (qb-behavior, coaching, trust-signals, OL
providers); the façade translates provider data into the canonical
DataContext, runs reasoning's AnalysisEngine, and returns the canonical
ReasoningTrace with the contract's serialized level views attached.
"""
from __future__ import annotations

from typing import Any, Optional

import reasoning as R
from reasoning.exceptions import ChecklistInvalid
from reasoning.interfaces import AnalysisRequest as RAnalysisRequest, DataContext, GameRequest

from . import types as T
from .pipeline import TOP_PASS_RUSH_CUTOFF, build_causal_chains
from .providers import DataGapError, ProviderRegistry
from .trace import FileTraceStore, make_trace_id, utcnow_iso
from .types import (
    AnalysisRequest,
    BetLeg,
    BreakingCondition,
    ChecklistVerdict,
    ContractViolation,
    Exposure,
    ReasoningDepth,
    ReasoningTrace,
    ThesisBundle,
    Verification,
)

__all__ = ["analyze", "adversary_review", "validate_checklist", "correlated_theses",
           "ContractViolation"]


# ---------------------------------------------------------------------------
# DTO -> canonical conversion
# ---------------------------------------------------------------------------

def _cond_id(link_id: str, metric: str) -> str:
    return f"{link_id}:{metric}"


def _to_canonical_chains(chains: list[T.CausalChain],
                         link_conditions: dict[str, list[BreakingCondition]]
                         ) -> tuple[list[R.CausalChain], dict[str, str], dict[str, Verification]]:
    """Convert façade chains to canonical chains.

    Returns (chains, display_texts, verifications): display_texts maps link id
    to the human breaking-condition text (spec §6.1's "TTT > 2.6s or quick-game
    < 0.55" form); verifications maps condition id to its Verification so the
    serialized L4 view can round-trip machine-checkable conditions.
    """
    out: list[R.CausalChain] = []
    display: dict[str, str] = {}
    verifs: dict[str, Verification] = {}
    for chain in chains:
        r_links = []
        for link in chain.links:
            link_id = link.id or "link"
            display[link_id] = link.breaking_condition or ""
            r_conds = []
            for cond in link_conditions.get(link_id, []):
                cid = _cond_id(link_id, cond.metric)
                verifs[cid] = cond.verification
                r_conds.append(R.BreakingCondition(
                    id=cid, text=cond.description, metric=cond.metric,
                    op=cond.operator, threshold=cond.threshold))
            r_links.append(R.CausalLink(
                id=link_id, cause=link.cause, mechanism=link.mechanism,
                outcome=link.outcome, verification=R.Verification(link.verification.value),
                breaking_conditions=r_conds, load_bearing=True))
        out.append(R.CausalChain(id=link_id, links=r_links))
    return out, display, verifs


def _to_canonical_leg(leg: BetLeg) -> R.BetLeg:
    return R.BetLeg(id=leg.leg_id, description=leg.description,
                    causal_link_ids=list(leg.causal_links))


# ---------------------------------------------------------------------------
# ProviderRegistry -> canonical DataContext
# ---------------------------------------------------------------------------

def _build_data_context(game: dict[str, Any], providers: ProviderRegistry,
                        league_avgs: Optional[dict[str, float]] = None
                        ) -> tuple[DataContext, dict[str, str], dict[str, Verification]]:
    """Translate provider data into the canonical DataContext.

    Checklist semantics: provider present and serving -> CLEAR; provider
    raises DataGapError -> DATA-GAP (checked, nothing usable); provider
    absent -> UNCHECKED (never checked — invalid at L3+, never downgraded
    silently). scheme_matchup is CONFLICT when a neutralization chain exists
    while the defense still prices a top pass rush.
    """
    ctx = DataContext()
    week, season = int(game.get("week", 0)), int(game.get("season", 0))
    hints: dict[str, str] = {}
    evidence: dict[str, list[tuple[str, R.Verification]]] = {}
    gap_flags: dict[str, list[str]] = {}  # qb_id -> withheld/failed sub-providers
    checked_qbs = 0                    # QBs actually inspected this call

    def ev(track: str, text: str, v: R.Verification) -> None:
        evidence.setdefault(track, []).append((text, v))

    # A withheld or failed sub-provider must leave a trace the adversary can
    # see. Swallowing it lets the enclosing track keep reading CLEAR, which is
    # how a gap becomes an invisible gap. Recorded as INFERENCE gap evidence —
    # it is an absence of measurement, never a measurement. Keyed by qb_id so
    # the track verdict can be decided per QB rather than by counting flags.
    def _note_gap(track: str, qb_id: str, gap_note: Optional[str],
                  what: str) -> None:
        detail = f": {gap_note}" if gap_note else ""
        ev(track, f"DATA-GAP — {what} (not observed){detail}",
           R.Verification.INFERENCE)
        gap_flags.setdefault(qb_id, []).append(what)

    # --- qb_behavior ---
    if providers.qb is None:
        hints["qb_behavior"] = "UNCHECKED"
    else:
        try:
            for team, qb_id in (game.get("qbs") or {}).items():
                p = providers.qb.get_qb_profile(qb_id, week, season)
                checked_qbs += 1
                ev("qb_behavior",
                   f"QB profile {p.name} ({team}): EPA/db {p.epa_per_dropback}, "
                   f"pressure-to-sack {p.pressure_to_sack_rate}, HHI {p.target_hhi}",
                   R.Verification(p.verification.value))
                try:
                    s = providers.qb.get_pressure_splits(qb_id, week, season)
                    ev("qb_behavior",
                       f"{p.name} INT clean {s.int_rate_clean} / pressured {s.int_rate_pressure}",
                       R.Verification(s.verification.value))
                except DataGapError as e:
                    _note_gap("qb_behavior", qb_id, e.reason,
                              f"{p.name} pressure splits")
                # Rolling form (buildable-systems.md #1): trailing-16-game
                # EPA/db, anti-leakage, trade-following. Additive: providers
                # without get_form are skipped, never failed.
                get_form = getattr(providers.qb, "get_form", None)
                if callable(get_form):
                    try:
                        f = get_form(qb_id, season, week)
                        if f and f.get("form_epa") is not None:
                            ev("qb_behavior",
                               f"{p.name} rolling form: EPA/db "
                               f"{f['form_epa']:+.3f} over {f['n_games']}g "
                               f"(availability {f['availability']:.2f})",
                               R.Verification.LIVE_VERIFIED)
                            ctx.observations[f"form.{qb_id}.epa"] = f["form_epa"]
                        elif f:
                            # Withheld below the 100-dropback gate. The note
                            # must reach L4: "not enough games" is context the
                            # adversary discounts form with, not a silent zero.
                            _note_gap("qb_behavior", qb_id, f.get("gap_note"),
                                      f"{p.name} rolling form withheld")
                    except DataGapError as e:
                        _note_gap("qb_behavior", qb_id, e.reason,
                                  f"{p.name} rolling form")
                # QB familiarity (#28, additive): starter stability feeds the
                # weak-link check — an unstable QB situation is load-bearing
                # context the L4 adversary must see.
                get_fam = getattr(providers.qb, "get_familiarity", None)
                if callable(get_fam):
                    fam = get_fam(team, season, week, qb_id)
                    if fam and fam.get("familiarity") is not None:
                        ctx.observations[f"fam.{team}.starter_share"] = \
                            float(fam["familiarity"])
                        if fam.get("backup_flag"):
                            ev("qb_behavior",
                               f"{team} QB instability: {fam['qb_id']} started "
                               f"{fam['familiarity']:.0%} of trailing "
                               f"{fam['n_starts']}g (backup flag)",
                               R.Verification.INFERENCE)
                # Trust-target profile (#3, additive): top target share feeds
                # prop/reasoning layers; the full breakdown is one call away.
                get_tt = getattr(providers.qb, "get_trust_targets", None)
                if callable(get_tt):
                    tt = get_tt(qb_id, season, week)
                    if tt and tt.get("shares"):
                        top = tt["shares"][0]
                        ctx.observations[f"trust.{qb_id}.top_target_share"] = \
                            float(top["share"])
                        # Withheld, never zeroed. trust_target.target_profile()
                        # returns hhi=None when the split is too thin; writing
                        # 0.0 here would publish "perfectly unconcentrated"
                        # as a measurement and let L4 read a gap as a fact.
                        # Matches specialists.py:126 (is not None, not truthiness).
                        if tt.get("hhi") is not None:
                            ctx.observations[f"trust.{qb_id}.target_hhi"] = \
                                float(tt["hhi"])
                        else:
                            _note_gap("qb_behavior", qb_id, tt.get("gap_note"),
                                      f"{p.name} trust-target HHI withheld")
                # Scheme-regime staleness (coaching adjustments -> QB form):
                # a top-decile scheme adjustment inside the trailing window
                # means the QB's rolling form spans two regimes — flag it so
                # the L4 adversary discounts accordingly.
                get_adj = getattr(providers.coaching, "get_adjustment", None)
                if callable(get_adj):
                    try:
                        adj_weeks = []
                        for w in range(max(1, week - 4), week):
                            a = get_adj(season, team, w)
                            if a and a.get("top_decile"):
                                adj_weeks.append(w)
                        if adj_weeks:
                            ev("qb_behavior",
                               f"{p.name} trailing form spans a scheme-regime "
                               f"change (top-decile adjustment wk "
                               f"{min(adj_weeks)}); form is stale-prone",
                               R.Verification.INFERENCE)
                            ctx.observations[f"form.{qb_id}.regime_stale"] = 1.0
                    except DataGapError as e:
                        _note_gap("qb_behavior", qb_id, e.reason,
                                  f"{p.name} scheme-regime history")
                # τ̂ 4th-down risk preference (P1: wire the validated gate into
                # the live path). Served at a neutral mid-bin WP because a
                # pre-game context has no live state; the real call site is
                # expected_wp_given_coach below, which takes the actual state.
                # A DataGapError here is EXPECTED while tau_hat.csv is
                # uncommitted — it is recorded as a gap, never swallowed.
                get_tau = getattr(providers.coaching, "get_tau_hat", None)
                if callable(get_tau):
                    try:
                        t = get_tau(team, season, "opp", 0.50)
                        if t.get("tau_hat") is not None:
                            ctx.observations[f"coaching.{team}.tau_hat"] = \
                                float(t["tau_hat"])
                            ev("coaching_scheme",
                               f"{team} 4th-down risk preference tau-hat "
                               f"{t['tau_hat']:.3f} ({t.get('fallback_level')}"
                               f", {t.get('n_decisions')} decisions)",
                               R.Verification.COMPUTED)
                    except DataGapError as e:
                        _note_gap("coaching_scheme", qb_id, e.reason,
                                  f"{team} tau-hat (4th-down risk preference)")
            # CLEAR only when the track was actually served. An empty qbs map
            # checked nothing, and a QB whose every sub-provider came back
            # withheld is a gap, not a clean read. Per checklist semantics:
            # UNCHECKED = never checked, DATA-GAP = checked, nothing usable.
            if checked_qbs == 0:
                hints["qb_behavior"] = "UNCHECKED"
                ev("qb_behavior",
                   "DATA-GAP — no QBs supplied for this game; qb_behavior "
                   "was never checked", R.Verification.INFERENCE)
            elif all(qb_id in gap_flags for qb_id in
                     ((game.get("qbs") or {}).values())):
                hints["qb_behavior"] = "DATA-GAP"
            else:
                hints["qb_behavior"] = "CLEAR"
        except DataGapError as e:
            hints["qb_behavior"] = "DATA-GAP"
            ev("qb_behavior", f"DATA-GAP: {e.reason}", R.Verification.INFERENCE)

    # --- coaching_scheme ---
    if providers.coaching is None:
        hints["coaching_scheme"] = "UNCHECKED"
    else:
        try:
            for team in (game.get("away"), game.get("home")):
                if not team:
                    continue
                fp = providers.coaching.get_scheme_fingerprint(team, week, season)
                v = R.Verification(fp.verification.value)
                if fp.quickgame_rate is not None:
                    ctx.observations[f"scheme.{team}.quickgame_rate"] = float(fp.quickgame_rate)
                    # Canonical keys the breaking conditions evaluate against.
                    if team == game.get("home"):
                        ctx.observations["quickgame_rate"] = float(fp.quickgame_rate)
                if fp.ttt_seconds is not None:
                    ctx.observations[f"scheme.{team}.ttt_seconds"] = float(fp.ttt_seconds)
                    if team == game.get("home"):
                        ctx.observations["ttt_seconds"] = float(fp.ttt_seconds)
                if fp.avg_air_yards is not None:
                    ctx.observations[f"scheme.{team}.avg_air_yards"] = float(fp.avg_air_yards)
                ev("coaching_scheme",
                   f"{team} scheme: quick-game {fp.quickgame_rate}, air yards {fp.avg_air_yards}",
                   v)
                # Pressure-answer adaptation (#24, additive): is this team coming
                # off an elite pass rush, and does it systematically answer
                # with quick game (the Monken template)?
                get_pa = getattr(providers.coaching, "get_pressure_answer", None)
                if callable(get_pa):
                    pa_ = get_pa(team, week, season)
                    if pa_ and pa_.get("faced_elite_last_week"):
                        prof = (f", profile hit-rate {pa_['profile_hit_rate']} "
                                f"over {pa_['profile_n']}g"
                                if pa_.get("profile_hit_rate") is not None else "")
                        ev("coaching_scheme",
                           f"{team} coming off top-5 rush "
                           f"({pa_['last_week_opponent']}){prof}",
                           R.Verification.COMPUTED)
                        ctx.observations[f"scheme.{team}.off_elite_rush"] = 1.0
            for team, coach_id in (game.get("playcallers") or {}).items():
                cp = None
                last_gap = None
                for cid in (coach_id, coach_id.lower().replace(" ", "-")):
                    try:
                        cp = providers.coaching.get_coach_profile(cid, season)
                        break
                    except DataGapError as e:
                        last_gap = e.reason
                        continue
                if cp is None:
                    ev("coaching_scheme",
                       f"no profile for playcaller {coach_id} ({team})"
                       + (f": {last_gap}" if last_gap else ""),
                       R.Verification.INFERENCE)
                    continue
                ctx.profiles[f"coach.{coach_id}"] = cp.yoy_delta_note or cp.name
                ev("coaching_scheme", f"{cp.name} ({cp.role}, {team}): {cp.yoy_delta_note}",
                   R.Verification(cp.verification.value))
            hints["coaching_scheme"] = "CLEAR"
        except DataGapError as e:
            hints["coaching_scheme"] = "DATA-GAP"
            ev("coaching_scheme", f"DATA-GAP: {e.reason}", R.Verification.INFERENCE)

    # --- trust_signals ---
    if providers.trust is None:
        hints["trust_signals"] = "UNCHECKED"
    else:
        try:
            n = 0
            for team in (game.get("away"), game.get("home")):
                if not team:
                    continue
                for s in providers.trust.get_trust_signals(team, week, season):
                    n += 1
                    ev("trust_signals", f"{s.player_id}: {s.text}",
                       R.Verification(s.verification.value))
            hints["trust_signals"] = "CLEAR"
            if n == 0:
                ev("trust_signals", "intake swept, nothing material",
                   R.Verification.INFERENCE)
        except DataGapError as e:
            hints["trust_signals"] = "DATA-GAP"
            ev("trust_signals", f"DATA-GAP: {e.reason}", R.Verification.INFERENCE)

    # --- offensive_line ---
    if providers.ol is None:
        hints["offensive_line"] = "UNCHECKED"
    else:
        try:
            for team in (game.get("away"), game.get("home")):
                if not team:
                    continue
                ol = providers.ol.get_ol_state(team, week, season)
                ctx.observations[f"ol.{team}.starters_out_n"] = float(len(ol.starters_out))
                ev("offensive_line",
                   f"{team} OL: {len(ol.starters_out)} starters out "
                   f"({', '.join(ol.starters_out) or 'none'}), continuity {ol.continuity_index}",
                   R.Verification(ol.verification.value))
            hints["offensive_line"] = "CLEAR"
        except DataGapError as e:
            hints["offensive_line"] = "DATA-GAP"
            ev("offensive_line", f"DATA-GAP: {e.reason}", R.Verification.INFERENCE)

    # --- L3 causal chains (provider-built, converted to canonical) ---
    chains_i, link_conds = build_causal_chains(game, providers, league_avgs)
    chains_c, display, verifs = _to_canonical_chains(chains_i, link_conds)
    ctx.chains = chains_c
    for conds in link_conds.values():
        for c in conds:
            if c.observed is not None:
                ctx.observations[c.metric] = float(c.observed)

    # --- scheme_matchup: CONFLICT when a neutralization chain exists while the
    # --- defense still prices a top pass rush (stat vs scheme disagreement).
    defense = game.get("defense", {}) or {}
    top_rush = any(
        isinstance(defense.get(t), dict)
        and (defense[t].get("pass_rush_rank") or 99) <= TOP_PASS_RUSH_CUTOFF
        for t in (game.get("away"), game.get("home")) if t)
    if chains_c and top_rush:
        hints["scheme_matchup"] = "CONFLICT"
    elif chains_c:
        hints["scheme_matchup"] = "CLEAR"
    else:
        hints["scheme_matchup"] = "NOTHING-MATERIAL"

    ctx.checklist_hints = hints
    ctx.track_evidence = evidence
    return ctx, display, verifs


# ---------------------------------------------------------------------------
# Serialized contract views over the canonical trace
# ---------------------------------------------------------------------------

def _serialize_l3(trace: R.ReasoningTrace, display: dict[str, str]) -> list[dict[str, Any]]:
    out = []
    for chain in trace.chains:
        links = []
        for link in chain.links:
            links.append({
                "id": link.id,
                "cause": link.cause,
                "mechanism": link.mechanism,
                "outcome": link.outcome,
                "verification": link.verification.value,
                "breaking_condition": display.get(link.id, ""),
                "load_bearing": link.load_bearing,
            })
        out.append({"id": chain.id, "links": links})
    return out


def _serialize_l4(trace: R.ReasoningTrace,
                  verifs: dict[str, Verification]) -> dict[str, Any]:
    report = getattr(trace, "adversary_report", None)
    if report is None:
        return {}
    bundles = []
    for b in report.correlated_theses:
        if len(b.leg_ids) < 2:
            continue  # singletons are not theses (spec §8 T4)
        shared = (b.shared_link_ids[0] if len(b.shared_link_ids) == 1
                  else ",".join(sorted(b.shared_link_ids)))
        bundles.append({
            "id": b.id,
            "shared_link": shared,
            "legs": [{"leg_id": lid} for lid in b.leg_ids],
            "thesis_broken": report.thesis_verdicts.get(b.id) == "KILL",
        })
    return {
        "breaking_conditions_met": report.breaking_conditions_met,
        "evaluated_conditions": [
            {"condition_id": r.condition_id,
             "description": r.text,
             "metric": r.metric,
             "operator": r.op,
             "threshold": r.threshold,
             "observed": r.observed_value,
             "verification": verifs.get(r.condition_id, Verification.INFERENCE).value,
             "verifiable": r.verifiable,
             "met": r.met}
            for r in report.condition_results
        ],
        "correlated_theses": bundles,
        "counter_argument": report.counter_argument,
        "pre_mortem": report.pre_mortem,
        "weak_link": report.weak_link,
        "weak_links": [
            {"link_id": w.link_id, "verification": w.verification.value,
             "breaking_condition_present": w.breaking_condition_present}
            for w in report.weak_links
        ],
        "gap_assumptions": {
            g.track: f"{g.assumed_value} — {g.rationale}"
            for g in report.gap_assumptions
        },
    }


def _finalize_contract_view(trace: R.ReasoningTrace, display: dict[str, str],
                            verifs: dict[str, Verification]) -> R.ReasoningTrace:
    """Attach the contract's serialized level views to the canonical trace."""
    if "L3" in trace.levels:
        trace.levels["L3"] = {**trace.levels["L3"],
                              "chains": _serialize_l3(trace, display)}
    if "L4" in trace.levels or getattr(trace, "adversary_report", None) is not None:
        trace.levels["L4"] = {**trace.levels.get("L4", {}),
                              **_serialize_l4(trace, verifs)}
    if "L5" in trace.levels:
        trace.levels["L5"] = dict(trace.levels["L5"])
        trace.levels["L5"]["layer_verdicts"] = {
            t: {"verdict": trace.checklist[t].value}
            for t in ("offensive_line", "coaching_scheme", "qb_behavior")
            if t in trace.checklist
        }
        # Weak-link disclosure belongs on published output (spec §8 T5): if the
        # recommendation doesn't already flag the INFERENCE load-bearing link,
        # append it — never publish a weak thesis without the flag.
        report = getattr(trace, "adversary_report", None)
        if (report is not None and report.weak_link
                and "INFERENCE" not in trace.levels["L5"]["recommendation"]):
            weak = ", ".join(
                f"{w.link_id} [{w.verification.value}]" for w in report.weak_links)
            trace.levels["L5"]["recommendation"] += (
                f" Weak-link flag: load-bearing INFERENCE/SINGLE_SOURCE link(s): "
                f"{weak}. Treat the recommendation as conditional on these links holding.")
    if trace.label == "FINAL":
        pass
    elif trace.label == "INVALID":
        pass
    else:
        trace.label = "ANALYSIS-DRAFT — not for publication"
    return trace


def _invalid_trace(game: dict[str, Any], depth: R.ReasoningDepth,
                   hints: dict[str, str]) -> R.ReasoningTrace:
    """Build the INVALID contract trace when the checklist gate rejects."""
    return R.ReasoningTrace(
        trace_id="pending",
        depth=depth,
        game=dict(game),
        exposure=R.Exposure.ANALYSIS,
        checklist={t: R.ChecklistVerdict(hints.get(t, "UNCHECKED")) for t in R.TRACKS},
        label="INVALID",
    )


# ---------------------------------------------------------------------------
# analyze — the provider-wired entry point (delegates to the canonical engine)
# ---------------------------------------------------------------------------

def analyze(req: AnalysisRequest,
            providers: ProviderRegistry,
            store: Optional[FileTraceStore] = None,
            league_avgs: Optional[dict[str, float]] = None,
            now_iso: Optional[str] = None) -> R.ReasoningTrace:
    """Run the full pipeline over provider data. Delegates to reasoning's
    AnalysisEngine; returns the canonical ReasoningTrace with the contract's
    serialized level views attached.

    Contract (spec §7): exposure published_pick|card MUST return depth L5;
    a pick is never returned below L5. Checklist INVALID is returned as a
    labeled trace, never raised.
    """
    game = dict(req.game or {})
    ctx, display, verifs = _build_data_context(game, providers, league_avgs)

    r_req = RAnalysisRequest(
        game=GameRequest(away=game.get("away") or "", home=game.get("home") or "",
                         week=int(game.get("week", 0)), season=int(game.get("season", 0))),
        question=req.question,
        exposure=R.Exposure(req.exposure.value),
        requested_depth=R.ReasoningDepth(req.requested_depth.value),
        resume_trace_id=None,  # the façade owns resume (below), not the engine
        market_edge_pct=float(game.get("market_contradiction_pct", 0.0) or 0.0),
        legs=[_to_canonical_leg(leg) for leg in req.legs],
    )

    engine = R.AnalysisEngine()
    try:
        trace = engine.analyze(r_req, ctx)
    except ChecklistInvalid:
        trace = _invalid_trace(
            game, R.ReasoningDepth(req.requested_depth.value), ctx.checklist_hints)
    else:
        # Post-hoc gate: the engine only validates at L4; a sub-L4 trace with
        # UNCHECKED tracks at L3+ is INVALID per spec §5 (never downgrade silently).
        gate = R.validate_checklist(trace)
        if not gate.valid:
            trace.label = "INVALID"

    trace = _finalize_contract_view(trace, display, verifs)
    trace.trace_id = make_trace_id(trace.game, trace.depth, trace.levels)

    # Resume: merge as a NEW level on the old trace; never rewrite (spec §2.6).
    if req.resume_trace_id and store is not None:
        old = store.load(req.resume_trace_id)
        if old is None:
            raise KeyError(f"no such trace: {req.resume_trace_id}")
        old = _ensure_canonical(old)
        new_level = f"update_{(now_iso or utcnow_iso())[:10]}"
        if new_level in old.levels:
            raise ValueError(f"level {new_level!r} already exists — refusing to overwrite")
        merged_levels = dict(old.levels)
        merged_levels[new_level] = {
            "depth": trace.depth.value,
            "levels": trace.levels,
            "label": trace.label,
        }
        merged = R.ReasoningTrace(
            trace_id=make_trace_id(old.game, old.depth, merged_levels),
            game=dict(old.game),
            depth=old.depth,
            escalation_log=list(old.escalation_log),
            levels=merged_levels,
            checklist=dict(old.checklist),
            tool_calls=list(old.tool_calls) + [
                {"tool": "trace/resume",
                 "args": {"from": req.resume_trace_id, "level": new_level},
                 "returned": "new_signals"}],
            label=old.label,
        )
        merged.escalation_log.append(R.EscalationEntry(
            from_depth=old.depth, to_depth=old.depth,
            trigger="resume_merge:new_signals", at=utcnow_iso()))
        trace = merged

    if store is not None:
        store.save(trace)
    return trace


def _ensure_canonical(trace: Any) -> R.ReasoningTrace:
    """Accept a canonical trace or a legacy façade DTO; return canonical."""
    if isinstance(trace, R.ReasoningTrace):
        return trace
    # Legacy DTO shape (integration.types.ReasoningTrace).
    return R.ReasoningTrace(
        trace_id=trace.trace_id,
        depth=R.ReasoningDepth(trace.depth.value),
        game=dict(trace.game),
        escalation_log=[R.EscalationEntry(
            from_depth=R.ReasoningDepth(e.from_depth.value),
            to_depth=R.ReasoningDepth(e.to_depth.value),
            trigger=e.trigger, at=e.at) for e in trace.escalation_log],
        levels=dict(trace.levels),
        checklist={k: R.ChecklistVerdict(v.value) for k, v in trace.checklist.items()},
        tool_calls=list(trace.tool_calls),
        label=trace.label,
    )


# ---------------------------------------------------------------------------
# Primitive operations — thin delegation to the canonical implementations
# ---------------------------------------------------------------------------

def validate_checklist(trace: Any) -> R.ChecklistResult:
    """Spec §5 gate. Delegates to reasoning's canonical validator."""
    return R.validate_checklist(_ensure_canonical(trace))


def correlated_theses(legs: tuple[BetLeg, ...],
                      link_conditions: dict[str, list[BreakingCondition]]
                      ) -> list[ThesisBundle]:
    """Group legs sharing >=1 causal link into a single ThesisBundle (spec §8 T4).

    Delegates grouping to reasoning's canonical union-find; thesis_broken keeps
    the façade's pinned semantics (all declared conditions met; unevaluable
    conditions never count as met — silence is not evidence).
    """
    r_legs = [_to_canonical_leg(leg) for leg in legs]
    chains: list[R.CausalChain] = []
    observed: dict[str, float] = {}
    for link_id, conds in link_conditions.items():
        r_conds = []
        for i, c in enumerate(conds):
            r_conds.append(R.BreakingCondition(
                id=f"{link_id}:c{i}", text=c.description, metric=c.metric,
                op=c.operator, threshold=c.threshold))
            if c.observed is not None:
                observed[c.metric] = float(c.observed)
        chains.append(R.CausalChain(
            id=link_id,
            links=[R.CausalLink(id=link_id, cause="", mechanism="", outcome="",
                                verification=R.Verification.INFERENCE,
                                breaking_conditions=r_conds, load_bearing=True)]))
    trace = R.ReasoningTrace(trace_id="adhoc", depth=R.ReasoningDepth.L4,
                             legs=r_legs, chains=chains, observed_values=observed)
    leg_by_id = {leg.leg_id: leg for leg in legs}
    out: list[ThesisBundle] = []
    for b in R.correlated_theses(r_legs, trace):
        if len(b.leg_ids) < 2:
            continue
        shared = (b.shared_link_ids[0] if len(b.shared_link_ids) == 1
                  else ",".join(sorted(b.shared_link_ids)))
        conds = link_conditions.get(shared, [])
        met = [c.is_met() for c in conds]
        broken = bool(conds) and all(m is True for m in met)
        out.append(ThesisBundle(
            legs=tuple(leg_by_id[lid] for lid in b.leg_ids),
            shared_link=shared, thesis_broken=broken,
            note=("legs share one causal link: a single thesis with combined exposure, "
                  "never N independent edges")))
    return out


def adversary_review(legs: tuple[BetLeg, ...],
                     link_conditions: dict[str, list[BreakingCondition]],
                     chains: list[T.CausalChain],
                     outputs: Any = None) -> R.AdversaryReport:
    """L4 adversary pass (spec §4). Delegates to reasoning's canonical
    adversarial layer; the façade supplies chains and observed values."""
    r_chains, _, _ = _to_canonical_chains(list(chains), link_conditions)
    observed: dict[str, float] = {}
    for conds in link_conditions.values():
        for c in conds:
            if c.observed is not None:
                observed[c.metric] = float(c.observed)
    trace = R.ReasoningTrace(
        trace_id="adhoc", depth=R.ReasoningDepth.L4,
        legs=[_to_canonical_leg(leg) for leg in legs],
        chains=r_chains, observed_values=observed,
        checklist={t: R.ChecklistVerdict.CLEAR for t in R.TRACKS},
    )
    return R.adversary_review(trace)
