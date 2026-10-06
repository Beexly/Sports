# PROVENANCE — real-data validation lead, 2026-10-02.
# Hand-built 20-item beat-text fixture for the trust-signals keyword classifier.
# Provenance tags: REAL = verbatim content from a documented source; REAL-ISH =
# faithful paraphrase of documented content; SYNTHETIC = invented only for taxonomy
# coverage, clearly marked. "my_label" is the validator's own best-fit
# SignalType — SELF-LABELED, not independent ground truth. Any agreement numbers
# below are self-consistency, never a validation. The classifier gate stays
# UNVALIDATED: no independently labeled corpus exists (challenges.md C10).
import json

ITEMS = [
    # -- @throwthedamball lane (registry x-throwthedamball.md) --
    {"id": "ttdb-01", "prov": "REAL", "src": "x-throwthedamball.md post 2105612970453574116",
     "text": "How often Guards have been 1-on-1 in pass blocking and how their percentile grade fulfilling their assignment",
     "my_label": "scheme"},
    {"id": "ttdb-02", "prov": "REAL", "src": "x-throwthedamball.md reply thread",
     "text": "Cam Jurgens (Eagles C) fell off the map... never the same after the back injury",
     "my_label": "injury"},
    {"id": "ttdb-03", "prov": "REAL", "src": "x-throwthedamball.md reply thread",
     "text": "Sisi Mauigoa credited with 2 pressures allowed through 3 games with 0 sacks",
     "my_label": "scheme"},
    {"id": "ttdb-04", "prov": "REAL", "src": "x-throwthedamball.md reply thread",
     "text": "Giants lead the league in leaving their entire line 1-on-1, highest island rates for tackles AND guards",
     "my_label": "scheme"},
    {"id": "ttdb-05", "prov": "REAL", "src": "x-throwthedamball.md reply thread",
     "text": "Tyler Steen is doing really great this season",
     "my_label": "lineup"},
    {"id": "ttdb-06", "prov": "REAL", "src": "x-throwthedamball.md reply thread",
     "text": "Nick Allegretti can't play guard or center",
     "my_label": "lineup"},
    {"id": "ttdb-07", "prov": "REAL", "src": "x-throwthedamball.md Substack Summer Update",
     "text": "Launching Go On Fourth Advisory, a football research and analytics advisory for syndicates and prop firms; weekly betting gameplans plus mid-week Stats and Angles; Substack returning to paid",
     "my_label": "off_field"},
    # -- @the_waldman lane (registry x-the_waldman.md) --
    {"id": "wald-01", "prov": "REAL", "src": "x-the_waldman.md 2026-10-01 TNF timeline",
     "text": "Steelers at Browns sims and projections: Aaron Rodgers 17.9, Harold Fannin 16.1, Deshaun Watson 14.5, Jaylen Warren 14.0, Michael Pittman Jr. 13.0, Pat Freiermuth 10.6 (half-PPR). No bets. Plus 11.6 units so far this year.",
     "my_label": "projection_divergence"},
    {"id": "wald-02", "prov": "REAL", "src": "x-the_waldman.md 2026-10-01 TNF timeline",
     "text": "He is 89% to go over 7.45 in the sims; the sims' favorite prop in terms of implied ROI was Fannin over 6.5 receptions",
     "my_label": "projection_divergence"},
    {"id": "wald-03", "prov": "REAL", "src": "x-the_waldman.md 2026-09 Eagles@Bears timeline",
     "text": "Jalen Hurts 18.4, DeVonta Smith 15.6, Saquon Barkley 12.7, Case Keenum 12.4, Rome Odunze 9.3 (half-PPR projections)",
     "my_label": "projection_divergence"},
    # -- @mysportsupdate lane (registry x-mysportsupdate.md) --
    {"id": "msu-01", "prov": "REAL", "src": "x-mysportsupdate.md 2026 offseason",
     "text": "Ravens sign Trey Hendrickson after rescinding Maxx Crosby trade: 4 years up to $120M, $60M fully guaranteed, $20M signing bonus",
     "my_label": "lineup"},
    {"id": "msu-02", "prov": "REAL", "src": "x-mysportsupdate.md 2026 preseason",
     "text": "Bears LT Ozzy Trapilo activated off PUP: ruptured patellar tendon in the January playoffs, expected to miss all of 2026, now practicing",
     "my_label": "injury"},
    {"id": "msu-03", "prov": "REAL", "src": "x-mysportsupdate.md 2026-01",
     "text": "Larry Fitzgerald elected to the Pro Football Hall of Fame, Class of 2026, first ballot: 1,432 receptions, 17,492 yards",
     "my_label": "off_field"},
    # -- @doug_clawson lane (registry x-doug_clawson.md) --
    {"id": "claw-01", "prov": "REAL", "src": "x-doug_clawson.md 2026-01",
     "text": "Trevor Lawrence is the 4th player in NFL history with 10+ total TD and 0 turnovers in a 2-game span",
     "my_label": "historical_comp"},
    {"id": "claw-02", "prov": "REAL", "src": "x-doug_clawson.md 2026-01",
     "text": "Malik Willis is the 1st QB since Michael Vick in 2002 to complete every pass plus 100 pass yards plus a pass TD plus a rush TD in a first half",
     "my_label": "historical_comp"},
    # -- TNF program doc lanes (tnf-intelligence-program-2026-10-01.md) --
    {"id": "tnf-01", "prov": "REAL-ISH", "src": "tnf-intelligence-program-2026-10-01.md trust lane",
     "text": "viral video: Rodgers burying Metcalf on the sideline, quote 'this mfer sucks ass'",
     "my_label": "trust_quote"},
    {"id": "tnf-02", "prov": "REAL-ISH", "src": "tnf-intelligence-program-2026-10-01.md trust lane",
     "text": "Roman Wilson usage trending up, 3 then 5 then 7 receptions; last man in the trust circle, role expanding",
     "my_label": "lineup"},
    {"id": "tnf-03", "prov": "REAL-ISH", "src": "tnf-intelligence-program-2026-10-01.md Monken case study",
     "text": "Monken's 2026 offense: quick-game rate up to 0.639, average air yards down from 8.33 to 6.12, heavy play-action",
     "my_label": "scheme"},
    # -- SYNTHETIC fills for uncovered taxonomy classes --
    {"id": "syn-01", "prov": "SYNTHETIC", "src": "validator fill; weather class has no documented item",
     "text": "High winds at Huntington Bank Field tonight, gusts to 35 mph, rain expected in the second half",
     "my_label": "weather"},
    {"id": "syn-02", "prov": "SYNTHETIC", "src": "validator fill; injury language beyond the registry",
     "text": "Denzel Boston limited in Thursday practice with a hamstring, game-time decision",
     "my_label": "injury"},
]

if __name__ == "__main__":
    import sys
    sys.path.insert(0, "/home/hatch/workspace/gse-intelligence-build")
    import importlib.util as ilu, os
    pkg = "/home/hatch/workspace/gse-intelligence-build/trust-signals"
    spec = ilu.spec_from_file_location("trust_signals", os.path.join(pkg, "__init__.py"),
                                      submodule_search_locations=[pkg])
    mod = ilu.module_from_spec(spec); sys.modules["trust_signals"] = mod
    spec.loader.exec_module(mod)
    from trust_signals import classify as C

    per = {}
    for it in ITEMS:
        pred = C.classify(it["text"]).value
        trust = C.detect_trust_dynamics(it["text"])
        pol = C.score_polarity(it["text"])
        mag = C.score_magnitude(it["text"], C.classify(it["text"]))
        ok = pred == it["my_label"]
        per.setdefault(it["my_label"], {"n": 0, "agree": 0})
        per[it["my_label"]]["n"] += 1
        per[it["my_label"]]["agree"] += ok
        print(f"{it['id']:8} prov={it['prov']:9} mine={it['my_label']:20} pred={pred:12} "
              f"{'AGREE' if ok else 'MISS':5} trust={trust} pol={pol} mag={mag}")
    print("\nself-consistency (NOT validation — labels are the validator's own):")
    tot_n = tot_a = 0
    for k, v in sorted(per.items()):
        tot_n += v["n"]; tot_a += v["agree"]
        print(f"  {k:20} {v['agree']}/{v['n']}")
    print(f"  overall {tot_a}/{tot_n}")
