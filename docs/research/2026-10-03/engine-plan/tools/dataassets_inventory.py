#!/usr/bin/env python3
"""Binary data-asset inventory -> mind knowledge JSONL shards (u_11).
Run with: ~/workspace/gse-discovery/venv/bin/python ~/workspace/eng-mine/dataassets_inventory.py
Reads schemas + stats only; never dumps full tables or raw binary bytes."""
import os, json, pickle, glob, subprocess, sys
import urllib.request

import pyarrow.parquet as pq
import pyarrow.compute as pc
import pyarrow as pa

HOME = os.path.expanduser('~')
W = os.path.join(HOME, 'workspace')
OUT = os.path.join(W, 'eng-mine/shards-out')
os.makedirs(OUT, exist_ok=True)
rows = []

def add_row(source_path, title, body, engine_status='ingestible', bytes_read=None):
    if bytes_read is None:
        try:
            bytes_read = os.path.getsize(source_path)
        except OSError:
            bytes_read = 0
    rows.append({
        'source_path': source_path,
        'host': 'vm',
        'bytes_read': bytes_read,
        'coverage': 'schema_inventory',
        'row_type': 'data_source',
        'title': title,
        'body': body,
        'engine_status': engine_status,
    })

def is_numeric(t):
    return pa.types.is_integer(t) or pa.types.is_floating(t) or pa.types.is_decimal(t)

KEY_STAT_COLS = ['epa', 'wpa', 'success', 'yards_gained', 'air_yards', 'yards_after_catch',
                 'cpoe', 'completion_probability', 'pass_oe', 'xyac_epa', 'qb_epa',
                 'rush_attempt', 'pass_attempt', 'wp', 'vegas_wp', 'total_home_score',
                 'total_away_score', 'spread_line', 'total_line']

def summarize_parquet(path, engine_status='ingestible', feature_link='', note=''):
    base = os.path.basename(path)
    try:
        pf = pq.ParquetFile(path)
    except Exception as e:
        add_row(path, f'{base} — UNREADABLE',
                f'PARQUET READ FAILED: {type(e).__name__}: {e}\nFile could not be inventoried; inspect manually.',
                engine_status)
        return
    try:
        md = pf.metadata
        nrows = md.num_rows
        created_by = md.created_by or 'unknown'
        schema = pf.schema_arrow
        names = schema.names
        L = []
        L.append(f'FILE: {path}')
        L.append(f'SIZE: {os.path.getsize(path):,} bytes | ROWS: {nrows:,} | COLUMNS: {len(names)} | ROW GROUPS: {md.num_row_groups} | WRITER: {created_by}')
        if note:
            L.append(f'NOTE: {note}')
        L.append('SCHEMA (column: arrow_type):')
        for n in names:
            L.append(f'  {n}: {schema.field(n).type}')
        for col, label in (('season', 'SEASON'), ('week', 'WEEK')):
            if col in names:
                try:
                    c = pf.read(columns=[col]).column(col)
                    L.append(f'{label} COVERAGE: min={pc.min(c).as_py()} max={pc.max(c).as_py()} distinct={pc.count_distinct(c).as_py()}')
                except Exception as e:
                    L.append(f'{label} probe failed: {type(e).__name__}: {e}')
        if 'game_id' in names:
            try:
                g = pf.read(columns=['game_id']).column('game_id')
                L.append(f'GAMES: {pc.count_distinct(g).as_py():,} distinct game_id')
            except Exception as e:
                L.append(f'game_id probe failed: {type(e).__name__}: {e}')
        stat_cols = [c for c in KEY_STAT_COLS if c in names]
        if not stat_cols:
            stat_cols = [n for n in names if is_numeric(schema.field(n).type)][:10]
        if stat_cols:
            try:
                tbl = pf.read(columns=stat_cols)
                L.append('NUMERIC STATS (min / max / mean, nulls skipped):')
                for c in stat_cols:
                    col = tbl.column(c)
                    try:
                        mm = pc.min_max(col).as_py()
                        mv = pc.mean(col).as_py()
                        mean_s = f'{float(mv):.4f}' if mv is not None else 'null'
                        L.append(f'  {c}: min={mm["min"]} max={mm["max"]} mean={mean_s}')
                    except Exception as e:
                        L.append(f'  {c}: stat failed ({type(e).__name__})')
            except Exception as e:
                L.append(f'stats read failed: {type(e).__name__}: {e}')
        try:
            batch = next(pf.iter_batches(batch_size=3))
            sample = batch.slice(0, 3).to_pylist()
            L.append('SAMPLE (first 3 rows, values truncated to 100 chars):')
            for r in sample:
                L.append('  ' + json.dumps({k: (str(v)[:100] if v is not None else None) for k, v in r.items()}, default=str)[:700])
        except Exception as e:
            L.append(f'sample failed: {type(e).__name__}: {e}')
        if feature_link:
            L.append(f'ENGINE FEATURE LINKAGE: {feature_link}')
        add_row(path, f'{base} — schema inventory ({nrows:,} rows x {len(names)} cols)', '\n'.join(L), engine_status)
    except Exception as e:
        add_row(path, f'{base} — INVENTORY FAILED',
                f'Unexpected error during inventory: {type(e).__name__}: {e}', engine_status)

def proto_of(path):
    with open(path, 'rb') as f:
        head = f.read(2)
    if head[:1] == b'\x80':
        return f'pickle protocol {head[1]}'
    return 'pickle protocol 0/1 (no PROTO opcode in header)'

def describe(obj, depth=0):
    pad = '  ' * depth
    t = type(obj).__name__
    if depth > 3:
        return f'{pad}<max depth: {t}>'
    try:
        import pandas as pd
        if isinstance(obj, pd.DataFrame):
            return f'{pad}DataFrame shape={obj.shape} columns={list(obj.columns)[:25]}'
        if isinstance(obj, pd.Series):
            return f'{pad}Series len={len(obj)} dtype={obj.dtype} name={obj.name}'
    except Exception:
        pass
    try:
        import numpy as np
        if isinstance(obj, np.ndarray):
            return f'{pad}ndarray shape={obj.shape} dtype={obj.dtype}'
        if isinstance(obj, np.generic):
            return f'{pad}{t} value={obj}'
    except Exception:
        pass
    if isinstance(obj, dict):
        lines = [f'{pad}dict len={len(obj)} keys:']
        for i, (k, v) in enumerate(obj.items()):
            if i >= 25:
                lines.append(f'{pad}  ... +{len(obj) - 25} more keys')
                break
            vs = describe(v, depth + 1) if depth < 3 else type(v).__name__
            lines.append(f'{pad}  [{k!r}]:\n{vs}')
        return '\n'.join(lines)
    if isinstance(obj, (list, tuple)):
        inner = describe(obj[0], depth + 1) if obj and depth < 3 else (type(obj[0]).__name__ if obj else 'empty')
        return f'{pad}{t} len={len(obj)} elem[0]:\n{inner}'
    r = repr(obj)
    return f'{pad}{t}: {r[:250]}'

def summarize_pickle(path, method_link='', engine_status='ingestible'):
    base = os.path.basename(path)
    L = [f'FILE: {path}', f'SIZE: {os.path.getsize(path):,} bytes', f'FORMAT: {proto_of(path)}']
    if method_link:
        L.append(f'METHOD: {method_link}')
    try:
        with open(path, 'rb') as f:
            obj = pickle.load(f)
        L.append('TOP-LEVEL OBJECT STRUCTURE:')
        L.append(describe(obj))
    except Exception as e:
        L.append(f'PICKLE LOAD FAILED: {type(e).__name__}: {e}')
        L.append('Object could not be deserialized in this environment; structure unknown beyond file size and protocol.')
    add_row(path, f'{base} — pickle inventory', '\n'.join(L), engine_status)

# ---------------- target 1: residual_wpa_ests pickles ----------------
RESID_LINK = ("residual_wpa.py — MOVE-37 Experiment 3 (residual WPA discovery). Target |wpa − wpa_hat|: "
    "HistGradientBoostingRegressor predicts wpa from 9 pre-snap features "
    "(down, ydstogo, yardline_100, score_differential, quarter_seconds_remaining, shotgun, no_huddle, "
    "posteam_timeouts_remaining, defteam_timeouts_remaining); gplearn SymbolicRegressor discovers formulas "
    "for residual magnitude. Seeds 42/123/7; train seasons 2021–2024. Each pickle = fitted SR estimator bundle per seed. "
    "Feeds: symbolic-formula discovery for WPA residual structure (engine feature candidate: residual-WPA formula terms).")
for p in sorted(glob.glob(os.path.join(W, 'gse-discovery/residual_wpa_ests/*.pkl'))):
    summarize_pickle(p, method_link=RESID_LINK)

# ---------------- target 2: wpa2_*_ests pickles ----------------
WPA2_LINKS = {
    'wpa2_robust_ests': ("wpa2_robust.py — MOVE-37 Experiment 1: robustified WPA² symbolic regression with log-cosh loss. "
        "Target wpa² clipped at train 99th pct, standardized; 9 standardized W1 pre-snap features; "
        "primary SR x3 seeds (train 2021–22 → test 2023) + replication_seed42 (train 2021–23 → test 2024) + "
        "shuffled-target null. Pickles = fitted estimators. Feeds: WPA² formula discovery, time-term (X4=quarter_seconds_remaining) hypothesis testing."),
    'wpa2_softtarget_ests': ("wpa2_softtarget.py — identical protocol to wpa2_robust primary + soft-target regularization "
        "beta=0.9 on y_train (Vanneschi & Castelli 2021). Tests whether the quarter_seconds_remaining (X4) term survives "
        "soft-target + log-cosh. Seeds 123/42/7. Pickles = fitted estimators."),
    'wpa2_strat_ests': ("wpa2_stratified.py — EARLY stratum (game_seconds_remaining>2700, Q1, time ~constant) vs "
        "LATE stratum (<900, Q4, time varies maximally); tests conditional-contribution hypothesis for the X4 time term. "
        "Files: EARLY/LATE × primary/replication × seeds. Pickles = fitted estimators per stratum/split/seed."),
}
for dname, link in WPA2_LINKS.items():
    for p in sorted(glob.glob(os.path.join(W, 'gse-discovery/symbolic-regression', dname, '*.pkl'))):
        summarize_pickle(p, method_link=link)

# ---------------- target 3: data_snapshot_20260913 ----------------
SNAP = os.path.join(W, 'gse-discovery/data_snapshot_20260913')
SNAP_LINK = ("GSE Phase 6 frozen snapshot 2026-09-13 (download_snapshot.py via nflreadpy 0.1.5; MANIFEST.md + manifest.json). "
    "Seasons 1999–2025; tables: pbp (372 cols), depth_charts, injuries, officials, schedules, rosters. "
    "RECORDED GAP: no weather table exists in nflverse — do not use for wind/temperature modeling. "
    "Feeds: point-in-time training features (learn_wide), depth-chart/injury context, officiating crews.")
pbp_files = sorted(glob.glob(os.path.join(SNAP, 'pbp_*.parquet')))
other_files = sorted(glob.glob(os.path.join(SNAP, '*.parquet')))
other_files = [f for f in other_files if os.path.basename(f) not in {os.path.basename(p) for p in pbp_files}]
for p in pbp_files:
    summarize_parquet(p, feature_link=SNAP_LINK + " Table: play-by-play, one row per play.")
for p in other_files:
    bn = os.path.basename(p)
    kind = 'depth chart' if bn.startswith('depth_charts') else ('injury report' if bn.startswith('injuries') else ('officiating crew' if bn.startswith('officials') else 'snapshot table'))
    summarize_parquet(p, feature_link=SNAP_LINK + f' Table: {kind}.')
# pbp/ subdir stubs (19-byte files)
stub_dir = os.path.join(SNAP, 'pbp')
stubs = sorted(glob.glob(os.path.join(stub_dir, '*.parquet')))
if stubs:
    sizes = {os.path.getsize(s) for s in stubs}
    add_row(stub_dir,
            'data_snapshot pbp/ subdir — 19-byte stub files (not real data)',
            f'DIRECTORY: {stub_dir}\nFILES: {len(stubs)} parquet stubs, sizes={sorted(sizes)} bytes each.\n'
            'These are placeholder/stub files (likely failed or skipped downloads), NOT real data. '
            'The real pbp parquets are the top-level pbp_YYYY.parquet files in data_snapshot_20260913/ (see their rows). '
            'Do not treat pbp/ stubs as a data source.')

# ---------------- FTN charting (ENGINE-EXCLUDED) ----------------
FTN_NOTE = ("FTN charting data — ENGINE-EXCLUDED per standing rule (no FTN data as engine input). "
    "Schema knowledge only: the mind may know these columns exist and what they measure, but must never "
    "use FTN charting values in any engine feature, weight, or calibration.")
for p in sorted(glob.glob(os.path.join(W, 'gse-discovery/ftn_charting_*.parquet'))):
    summarize_parquet(p, engine_status='engine_excluded:FTN', feature_link=FTN_NOTE)

# ---------------- target 4: qb-behavioral-profiles ----------------
QB_LINK = ("qb-behavioral-profiles — Garrett 2026-10-01 directive: engine reasoning must be player-specific and deep, "
    "not category-based ('veteran QB' labels predict nothing). Pipeline: code/download_pbp.py → data/pbp_<season>.parquet "
    "(nflverse via nflreadpy, 2010–2026); code/compute_metrics.py → data/qb_season_metrics.parquet + data/by_qb/<qb>.csv "
    "(186 QBs); code/gen_profiles.py → profiles/<qb>.md (8 QBs: Rodgers, Watson, Keenum, Mahomes, Allen, Burrow, Hurts, Jackson). "
    "Methods: target-fixation HHI, trust targets, INT situational splits, run behavior, EPA splits. QB identity via "
    "passer_player_id (GSIS) mapped to canonical names; min 100 dropbacks per QB-season. "
    "Feeds: player-depth QB reasoning features (trust-target concentration, situational INT tendency, scramble/run behavior).")
QB = os.path.join(W, 'qb-behavioral-profiles/data')
for p in sorted(glob.glob(os.path.join(QB, 'pbp_*.parquet'))):
    summarize_parquet(p, feature_link=QB_LINK + ' Table: season play-by-play input to QB metric computation.')
summarize_parquet(os.path.join(QB, 'qb_season_metrics.parquet'), feature_link=QB_LINK + ' Table: computed per-QB-season behavioral metrics (output of compute_metrics.py).')
by_qb = sorted(glob.glob(os.path.join(QB, 'by_qb/*.csv')))
if by_qb:
    add_row(os.path.join(QB, 'by_qb'),
            'qb-behavioral-profiles by_qb/ — 186 per-QB CSVs (directory summary)',
            f'DIRECTORY: {os.path.join(QB, "by_qb")}\nFILES: {len(by_qb)} CSVs, one per QB (e.g. {", ".join(os.path.basename(b) for b in by_qb[:5])} ...).\n'
            'Each CSV = that QB\'s season-level behavioral metrics from compute_metrics.py (same schema as qb_season_metrics.parquet, filtered to one QB). '
            'ENGINE FEATURE LINKAGE: ' + QB_LINK,
            bytes_read=sum(os.path.getsize(b) for b in by_qb))

# ---------------- target 5: coaching TRAIN-NOW pbp ----------------
COACH = os.path.join(W, 'sports-docs/intelligence/coaching/data')
COACH_LINK = ("TRAIN-NOW vintage (Garrett 2026-10-02 HARD directive): training set = 2022–2025 full nflverse seasons + "
    "2026 Weeks 1–4, available TODAY. Walk-forward: train 2022–2024, validate 2025, live-check 2026 W1–4. "
    "Each component calibrates as it wires; reasoning and intelligence train on the same frozen vintage. "
    "Feeds: the engine's primary training corpus — every point-in-time feature, weight, and calibration reads these files.")
for p in sorted(glob.glob(os.path.join(COACH, 'play_by_play_202*.parquet'))):
    summarize_parquet(p, feature_link=COACH_LINK)

# ---------------- target 6: gse-lab/whalelay ----------------
WHALE_LINK = ("gse-lab/whalelay load.py via nflreadpy: load_pbp([2025,2026]), load_player_stats([2025,2026]), "
    "load_schedules([2025,2026]). Supports the whalelay parlay-leg renderer (angles.py, leg_odds.py, render_legs.py, "
    "likely26.py) — same-season freshness for 2025–2026 slate work.")
for p in sorted(glob.glob(os.path.join(W, 'gse-lab/whalelay/*.parquet'))):
    summarize_parquet(p, feature_link=WHALE_LINK)

# ---------------- target 7: vendor/Sports gse-dataset diff + inventory ----------------
def summarize_jsonl(path, engine_status='ingestible', note=''):
    base = os.path.basename(path)
    L = [f'FILE: {path}', f'SIZE: {os.path.getsize(path):,} bytes']
    if note:
        L.append(f'NOTE: {note}')
    try:
        wc = subprocess.run(['wc', '-l', path], capture_output=True, text=True).stdout.strip()
        L.append(f'LINES (wc -l): {wc}')
    except Exception:
        pass
    keys_union = []
    n_parsed = 0
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                if n_parsed < 5:
                    try:
                        rec = json.loads(line)
                        n_parsed += 1
                        if isinstance(rec, dict):
                            for k in rec.keys():
                                if k not in keys_union:
                                    keys_union.append(k)
                    except Exception:
                        pass
                else:
                    break
        L.append(f'RECORD SCHEMA (union of keys from first {n_parsed} records):')
        for k in keys_union:
            L.append(f'  {k}')
        if not keys_union:
            L.append('  (no JSON object records parsed in first 5 lines — check file format)')
    except Exception as e:
        L.append(f'READ FAILED: {type(e).__name__}: {e}')
    return L, keys_union

def vendor_gse_dataset():
    repo = os.path.join(W, 'vendor/Sports')
    ds_rel = 'data/gse-dataset'
    # local SHAs at vendor HEAD
    out = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', 'HEAD', '--', ds_rel],
                         capture_output=True, text=True).stdout
    local = {}
    for line in out.splitlines():
        if '\t' not in line:
            continue
        sha = line.split()[2]
        p = line.split('\t', 1)[1]
        local[p] = sha
    # remote tree from main
    api = os.path.join(W, 'skills/github/bin/github-api')
    r = subprocess.run([api, 'GET', '/repos/Beexly/Sports/git/trees/main?recursive=1'],
                       capture_output=True, text=True)
    remote = {}
    try:
        tree = json.loads(r.stdout)['tree']
        for e in tree:
            if e.get('path', '').startswith(ds_rel + '/') and e.get('type') == 'blob':
                remote[e['path']] = e['sha']
    except Exception as e:
        add_row(os.path.join(repo, ds_rel),
                'gse-dataset vendor diff — REMOTE TREE FETCH FAILED',
                f'Could not fetch main tree: {type(e).__name__}: {e}\n'
                f'Local vendor HEAD files inventoried as-is; diff status unknown — treat all as needs_diff.',
                'needs_diff')
        return
    all_paths = sorted(set(local) | set(remote))
    n_same, n_diff, n_local_only, n_remote_only = 0, 0, 0, 0
    diff_list = []
    for p in all_paths:
        ls, rs = local.get(p), remote.get(p)
        if ls and rs and ls == rs:
            n_same += 1
        elif ls and rs:
            n_diff += 1
            diff_list.append(p)
        elif ls:
            n_local_only += 1
            diff_list.append(p + ' (local only)')
        else:
            n_remote_only += 1
            diff_list.append(p + ' (remote only)')
    # inventory top-level *.jsonl local files
    for p in sorted(glob.glob(os.path.join(repo, ds_rel, '*.jsonl'))):
        rel = os.path.relpath(p, repo)
        rs, ls = remote.get(rel), local.get(rel)
        if rs and ls and rs == ls:
            L, keys = summarize_jsonl(p, note='STALE-CHECK: identical to Beexly/Sports@main (blob SHA match) — local schema = live schema.')
            status = 'ingestible'
        else:
            L, keys = summarize_jsonl(p)
            # fetch live head via Range for live schema
            live_keys = []
            try:
                req = urllib.request.Request(
                    f'https://raw.githubusercontent.com/Beexly/Sports/main/{rel}',
                    headers={'Range': 'bytes=0-65535', 'User-Agent': 'motif-inventory'})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    chunk = resp.read().decode('utf-8', errors='replace')
                for line in chunk.splitlines()[:8]:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                        if isinstance(rec, dict):
                            for k in rec.keys():
                                if k not in live_keys:
                                    live_keys.append(k)
                        if len(live_keys) >= 40:
                            break
                    except Exception:
                        continue
                L.append('LIVE @main SCHEMA (first records via Range fetch):')
                for k in live_keys:
                    L.append(f'  {k}')
                only_live = [k for k in live_keys if k not in keys]
                only_local = [k for k in keys if k not in live_keys]
                if only_live:
                    L.append(f'KEYS ONLY IN LIVE: {only_live}')
                if only_local:
                    L.append(f'KEYS ONLY IN STALE LOCAL: {only_local}')
                if not only_live and not only_local:
                    L.append('Key sets match; difference is in values/rows, not schema.')
            except Exception as e:
                L.append(f'LIVE FETCH FAILED: {type(e).__name__}: {e} — live schema unknown.')
            L.insert(1, f'STALE-CHECK: DIFFERS from Beexly/Sports@main (vendor checkout is stale) — live schema fetched above.')
            status = 'needs_diff'
        L.append('ENGINE FEATURE LINKAGE: gse-dataset = engine dataset bundle (games, contracts, features, fourth-down, '
                 'holdout, participation, rosters, player-id-crosswalk, bridge-premises). Feeds: engine training/eval joins.')
        add_row(p, f'{os.path.basename(p)} — jsonl schema inventory', '\n'.join(L), status)
    # current/ subdir summary
    cur = os.path.join(repo, ds_rel, 'current')
    if os.path.isdir(cur):
        items = []
        for f in sorted(os.listdir(cur)):
            fp = os.path.join(cur, f)
            if os.path.isfile(fp):
                items.append(f'{f} ({os.path.getsize(fp):,} bytes)')
        add_row(cur, 'gse-dataset/current/ — week3 live-slate bundle (directory summary)',
                'DIRECTORY: ' + cur + '\nFILES:\n  ' + '\n  '.join(items) +
                '\nNOTE: week3-connected-slate / signals / engine-readings / ngs-st-pace / usage-adjustments = live Week 3 engine inputs. '
                'Inventory is directory-level; individual live-slate files change weekly.',
                'ingestible', bytes_read=sum(os.path.getsize(os.path.join(cur, f)) for f in os.listdir(cur) if os.path.isfile(os.path.join(cur, f))))
    # diff summary row
    add_row(os.path.join(repo, ds_rel),
            'gse-dataset vendor-vs-main DIFF SUMMARY',
            f'VENDOR CHECKOUT: {repo} (stale)\nLIVE: Beexly/Sports@main\n'
            f'FILES IDENTICAL: {n_same}\nFILES DIFFERING: {n_diff}\nLOCAL ONLY: {n_local_only}\nREMOTE ONLY: {n_remote_only}\n'
            f'DIFFERING/LOCAL-ONLY/REMOTE-ONLY PATHS:\n' + ('\n'.join(f'  {d}' for d in diff_list) if diff_list else '  (none)') +
            '\nPer-file rows above carry live-vs-stale schema comparison; differing files are tagged needs_diff.',
            'needs_diff' if (n_diff or n_local_only or n_remote_only) else 'ingestible')

vendor_gse_dataset()

# ---------------- write shards (split at ~8MB) ----------------
SHARD_MAX = 8 * 1024 * 1024
shard_idx = 0
buf = []
cur_size = 0
n_written = 0
def flush():
    global shard_idx, buf, cur_size, n_written
    if not buf:
        return
    fn = os.path.join(OUT, f'mind_knowledge_u_11_dataassets_{shard_idx:02d}.jsonl')
    with open(fn, 'w') as f:
        for r in buf:
            f.write(json.dumps(r) + '\n')
    n_written += len(buf)
    print(f'wrote {fn}: {len(buf)} rows, {os.path.getsize(fn):,} bytes', flush=True)
    shard_idx += 1
    buf = []
    cur_size = 0

for r in rows:
    s = json.dumps(r)
    if cur_size + len(s) > SHARD_MAX and buf:
        flush()
    buf.append(r)
    cur_size += len(s) + 1
flush()
print(f'TOTAL ROWS: {n_written}', flush=True)
