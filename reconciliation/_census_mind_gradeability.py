#!/usr/bin/env python3
"""Measure what in the MIND corpus is actually gradeable.

Backs reconciliation/mind_corpus_gradeability.md. Every number in that
document comes from this script.

The question it answers: the literature loop grades a premise by
comparing its numeric_value to a binary game outcome, which only works
for a premise that asserts a PROBABILITY. Measured on the live index,
285 of 5,509 premises are probability-gradeable. This script measures
what the other 5,224 can be graded on instead.

Buckets the corpus by:
  1. what the numeric_claim's metric actually IS (specific vs
     placeholder);
  2. whether the paper is about NFL football at all;
  3. whether the record has a usable CONCEPT (principle name + context
     tags + direction);
  4. whether its context tags have a measure surface in the database.
"""
import json, os, re, collections

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS = os.path.join(
    WT, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl"
)

# The placeholder metric names the extractor assigned when it could not
# determine what the number measured. Measured: these six cover 5,110 of
# the 5,149 records.
PLACEHOLDER_METRICS = {
    "situational_game_unit",
    "statistical_parameter",
    "temporal_epoch",
    "empirical_sample_size",
    "performance_ratio",
    None,
}

SPORTS_UNITS = {
    "points", "yards", "seconds", "percent", "multiplier",
    "multiplier_or_threshold", "coefficient", "count", "samples",
    "rate", "share", "probability", "brier", "correlation", "cpoe",
    "delta", "floor", "states",
}

NFL = re.compile(
    r"\b(NFL|football|quarterback|pass rush|pass-rush|offensive line|"
    r"wide receiver|tight end|super bowl|line of scrimmage|margin|"
    r"spread|point spread|playoff|yardage|scrimmage)\b", re.I
)

# Context tag -> the database surface that can MEASURE it. Every model
# and column named here was verified present in
# packages/db/prisma/schema.prisma on 2026-10-20.
MEASURABLE_CONTEXTS = {
    "workload":      "player_game_stats snap counts",
    "acwr":          "player_game_stats + team_game_efficiency (workload PROXY, not acwr itself)",
    "injuries":      "injury (name, status, date) -> injury count per team",
    "depth_chart":   "depth_chart_entry.depthRank",
    "route_running": "next_gen_stats + player_game_stats.receivingYards",
    "separation":    "next_gen_stats.avgSeparation, .cpoe",
    "props_receiving": "player_game_stats.targets, .targetShare, .receivingYards",
    "tracking":      "next_gen_stats + the vision parquet",
    "interceptions": "player_game_stats.interceptions",
    "coverage":      "next_gen_stats.coverage",
    "live_odds":     "odds snapshots",
    "epa":           "team_game_efficiency.offEpaPerPlay/.offSuccess/.defEpaPerPlay/.defSuccess",
    "game_state":    "signals / live game state",
    "rest":          "games.restDaysHome / restDaysAway",
}

# The three tags that are PLACEHOLDER METRIC NAMES, not real contexts.
# They cover 3,274 records each and measure nothing.
PSEUDO_CONTEXTS = {"metric_specification", "player_evaluation", "situational_game_unit"}


def main():
    recs = []
    with open(CORPUS, encoding="utf8") as f:
        for line in f:
            line = line.strip()
            if line:
                recs.append(json.loads(line))

    metric_counts = collections.Counter()
    unit_counts = collections.Counter()
    buckets = collections.Counter()
    tag_counts = collections.Counter()
    claim_types = collections.Counter()
    field_present = collections.Counter()
    named_specific = []
    examples = collections.defaultdict(list)

    for r in recs:
        nc = r.get("numeric_claim") or {}
        metric = nc.get("metric")
        unit = nc.get("unit")
        has_num = isinstance(nc.get("value"), (int, float))
        metric_counts[metric] += 1
        unit_counts[unit] += 1
        claim_types[r.get("claim_type")] += 1

        for fld in ("principle_or_feature", "applicable_contexts",
                    "influence_direction", "evidence_quote", "domain",
                    "claim_type", "numeric_claim", "how_it_influences",
                    "item_id", "title"):
            if r.get(fld) not in (None, "", [], {}):
                field_present[fld] += 1

        ctxs = r.get("applicable_contexts") or []
        for c in ctxs:
            tag_counts[c] += 1

        is_placeholder = metric in PLACEHOLDER_METRICS
        is_specific = (not is_placeholder) and has_num and unit in SPORTS_UNITS
        if is_specific:
            named_specific.append(r)
        is_nfl = bool(NFL.search((str(r.get("title")) or "") + " " +
                                 (str(r.get("evidence_quote")) or "")))

        if not has_num:
            k = "NO_NUMERIC_CLAIM"
        elif is_specific:
            k = "GAME_LEVEL_QUANTITY_NFL" if is_nfl else "SPECIFIC_METRIC_NON_NFL"
        elif is_placeholder:
            k = "PLACEHOLDER_METRIC_NFL" if is_nfl else "PLACEHOLDER_METRIC_NON_NFL"
        else:
            k = "SPECIFIC_METRIC_NON_NFL"
        buckets[k] += 1
        if len(examples[k]) < 3:
            examples[k].append((r.get("title"), nc, str(r.get("evidence_quote"))[:120]))

    total = len(recs)
    total_tag_pairs = sum(tag_counts.values())
    measurable_pairs = sum(n for c, n in tag_counts.items()
                           if c in MEASURABLE_CONTEXTS)
    pseudo_pairs = sum(n for c, n in tag_counts.items() if c in PSEUDO_CONTEXTS)
    real_tag_pairs = total_tag_pairs - pseudo_pairs

    # The gradeable population: correlational/causal records whose contexts
    # are measurable AND whose metric is specifically named.
    cc = 0
    cc_measurable = 0
    cc_measurable_named = 0
    for r in recs:
        if r.get("claim_type") not in ("correlational", "causal"):
            continue
        cc += 1
        ctxs = r.get("applicable_contexts") or []
        if any(c in MEASURABLE_CONTEXTS for c in ctxs):
            cc_measurable += 1
            nc = r.get("numeric_claim") or {}
            if (nc.get("metric") not in PLACEHOLDER_METRICS
                    and isinstance(nc.get("value"), (int, float))
                    and nc.get("unit") in SPORTS_UNITS):
                cc_measurable_named += 1

    out = {
        "artifact": "mind_corpus_gradeability",
        "measured_at": "2026-10-20",
        "corpus": "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl",
        "total_records": total,
        "numeric_claim": {
            "metric_distribution": {str(k): v for k, v in metric_counts.most_common()},
            "unit_distribution": {str(k): v for k, v in unit_counts.most_common()},
            "placeholder_metric_records": sum(
                v for k, v in metric_counts.items() if k in PLACEHOLDER_METRICS),
            "specifically_named_metric_on_sports_unit": len(named_specific),
        },
        "buckets": dict(buckets),
        "bucket_examples": {k: [{"title": t, "claim": c, "quote": q}
                                 for t, c, q in v]
                             for k, v in examples.items()},
        "field_presence": dict(field_present),
        "claim_type_distribution": dict(claim_types),
        "context_tags": {
            "distinct_tags": len(tag_counts),
            "total_tag_pairs": total_tag_pairs,
            "measurable_tags": sorted(MEASURABLE_CONTEXTS),
            "measurable_tag_pairs": measurable_pairs,
            "measurable_pct_of_all_pairs": round(100 * measurable_pairs / total_tag_pairs, 1),
            "pseudo_context_pairs": pseudo_pairs,
            "pseudo_contexts": sorted(PSEUDO_CONTEXTS),
            "measurable_pct_excluding_pseudo": round(
                100 * measurable_pairs / real_tag_pairs, 1) if real_tag_pairs else None,
            "tag_distribution": {str(k): v for k, v in tag_counts.most_common()},
        },
        "gradeable_population": {
            "correlational_or_causal": cc,
            "and_measurable_context": cc_measurable,
            "and_specifically_named_metric": cc_measurable_named,
        },
    }

    p = os.path.join(WT, "reconciliation", "mind_corpus_gradeability.json")
    json.dump(out, open(p, "w", encoding="utf8"), indent=1)
    print(json.dumps({
        "total_records": out["total_records"],
        "numeric_claim": out["numeric_claim"],
        "buckets": out["buckets"],
        "field_presence": out["field_presence"],
        "claim_type_distribution": out["claim_type_distribution"],
        "context_tags": {
            k: v for k, v in out["context_tags"].items()
            if k not in ("tag_distribution",)
        },
        "gradeable_population": out["gradeable_population"],
    }, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
