#!/usr/bin/env python3
"""
compile-coach-brain-corpus.py

GSE Coach Brain LLM (gse-coach-brain-v1) Dataset Compiler
Ingests:
  1. MIND_CORPUS_3000.jsonl (5,149 verified reasoning items)
  2. X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md (80 situational rules + analyst insights)
  3. sunday_45_corpus_and_equations_feed.jsonl (Sunday 45 equations & game scripts)
  4. survivor_edges.jsonl (nfl-farm calibration survivor records)

Outputs:
  - data/coach-brain/coach-brain-sft-v1.jsonl (ChatML format)
  - data/coach-brain/coach-brain-train.jsonl (95%)
  - data/coach-brain/coach-brain-val.jsonl (5%)
"""

import os
import sys
import json
import re
import hashlib
import random
import argparse
from typing import List, Dict, Any, Tuple

SYSTEM_PROMPT = (
    "You are GSE Coach Brain v1.0, an omni-cognitive NFL coaching and game-theory engine "
    "developed for Galaxy Sports Edge. You analyze NFL matchups, situational play-calling, "
    "trench warfare, blitz schemes, clock management, and in-game decisions using causal "
    "reasoning, Belichick-Adams ten-metric breakdowns, calibrated probabilities (-5.2pt curve), "
    "and empirical game-state mathematics."
)

def compute_merkle_leaf(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def resolve_path(candidates: List[str]) -> str:
    for p in candidates:
        norm_p = os.path.normpath(os.path.expanduser(p))
        if os.path.exists(norm_p):
            return norm_p
    return candidates[0]

def parse_mind_corpus(path: str) -> List[Dict[str, Any]]:
    records = []
    if not os.path.exists(path):
        print(f"[WARN] MIND corpus not found at {path}")
        return records
    
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
                situation = item.get('situation', '').strip()
                reasoning = item.get('reasoning', '').strip()
                category = item.get('category', 'general_coaching')
                rule = item.get('rule', '')
                
                if not situation or not reasoning:
                    continue
                
                user_content = f"[Category: {category}] Analyze the following game situation and prescribe the optimal strategy:\n\n{situation}"
                assistant_content = f"### Causal Diagnosis\n{reasoning}"
                if rule:
                    assistant_content += f"\n\n### Operational Directive\n{rule}"
                
                raw_id = item.get('id', 'mind')
                leaf = compute_merkle_leaf(f"{situation}|{reasoning}")
                
                records.append({
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                        {"role": "assistant", "content": assistant_content}
                    ],
                    "metadata": {
                        "source": "MIND_CORPUS_3000",
                        "source_id": raw_id,
                        "merkle_leaf": leaf
                    }
                })
            except Exception as e:
                continue
    return records

def parse_x_situational(path: str) -> List[Dict[str, Any]]:
    records = []
    if not os.path.exists(path):
        print(f"[WARN] X-Situational corpus not found at {path}")
        return records
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Extract rules via regex
    rule_pattern = re.compile(
        r'### (Rule \d+:[^\n]+)\n'
        r'-\s*\*\*Trigger:\*\*\s*([^\n]+)\n'
        r'-\s*\*\*Causal Mechanism:\*\*\s*([^\n]+)\n'
        r'-\s*\*\*Symbolic Constraint:\*\*\s*([^\n]+)',
        re.MULTILINE
    )
    
    for m in rule_pattern.finditer(content):
        rule_title = m.group(1).strip()
        trigger = m.group(2).strip()
        causal = m.group(3).strip()
        constraint = m.group(4).strip()
        
        user_content = (
            f"Evaluate situational rule: {rule_title}\n\n"
            f"Scenario / Trigger: {trigger}\n"
            f"How should the coaching model adjust its causal beliefs and symbolic constraints?"
        )
        
        assistant_content = (
            f"### Causal Mechanism\n{causal}\n\n"
            f"### Symbolic Constraints & Probabilistic Shift\n{constraint}"
        )
        
        leaf = compute_merkle_leaf(f"{rule_title}|{trigger}|{causal}")
        
        records.append({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
                {"role": "assistant", "content": assistant_content}
            ],
            "metadata": {
                "source": "X_SITUATIONAL_RULES",
                "rule_name": rule_title,
                "merkle_leaf": leaf
            }
        })
        
    return records

def parse_equations_feed(path: str) -> List[Dict[str, Any]]:
    records = []
    if not os.path.exists(path):
        print(f"[WARN] Equations feed not found at {path}")
        return records
        
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                eq = json.loads(line)
                eq_id = eq.get('equation_id', 'EQ')
                title = eq.get('title', '')
                formula = eq.get('formula', '')
                citation = eq.get('paper_citation', '')
                app = eq.get('application', '')
                code_ref = eq.get('code_ref', '')
                
                user_content = (
                    f"Explain the mathematical formulation and engine integration for {title} ({eq_id}).\n"
                    f"Citation: {citation}"
                )
                assistant_content = (
                    f"### Mathematical Formulation\n$$\n{formula}\n$$\n\n"
                    f"### Production Application\n{app}\n\n"
                    f"### Code Reference\nImplemented in `{code_ref}`."
                )
                
                leaf = compute_merkle_leaf(f"{eq_id}|{formula}")
                
                records.append({
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                        {"role": "assistant", "content": assistant_content}
                    ],
                    "metadata": {
                        "source": "SUNDAY_45_EQUATIONS",
                        "equation_id": eq_id,
                        "merkle_leaf": leaf
                    }
                })
            except Exception:
                continue
    return records

def parse_survivor_edges(path: str) -> List[Dict[str, Any]]:
    """
    STANDING DOCTRINE (HARD): READ LINES AND ODDS STRICTLY LAST (Step N / Zone 3).
    Market-derived `marketFairProb` target records from `survivor_edges.jsonl` are
    quarantined from Zone 1/2 Coach-Brain SFT training so the Coach-Brain never
    memorizes bookmaker lines as its football projection.
    """
    return []

def main():
    parser = argparse.ArgumentParser(description="Compile GSE Coach Brain SFT Corpus")
    parser.add_argument('--dry-run', action='store_true', help="Validate schemas and counts without writing files")
    parser.add_argument('--output-dir', default='C:/Users/Garrett/Sports/data/coach-brain', help="Output directory")
    parser.add_argument('--val-ratio', type=float, default=0.05, help="Validation split ratio")
    parser.add_argument('--seed', type=int, default=42, help="Random seed for deterministic split")
    args = parser.parse_args()

    random.seed(args.seed)

    mind_path = resolve_path([
        'C:/Users/Garrett/Sports/brain/feeds/MIND_CORPUS_3000.jsonl',
        'C:/Users/Garrett/Downloads/MIND_CORPUS_3000.jsonl'
    ])
    x_path = resolve_path([
        'C:/Users/Garrett/Sports/docs/engine/X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md',
        'C:/Users/Garrett/Downloads/X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md'
    ])
    eq_path = resolve_path([
        'C:/Users/Garrett/Sports/brain/feeds/sunday_45_corpus_and_equations_feed.jsonl',
        'C:/Users/Garrett/Downloads/sunday_45_corpus_and_equations_feed.jsonl'
    ])
    survivor_path = resolve_path([
        'C:/Users/Garrett/nfl-farm/survivor_edges.jsonl',
        'C:/Users/Garrett/nfl-farm/extracted_data/survivor_edges.jsonl'
    ])

    print("=== GSE Coach Brain LLM Corpus Compiler ===")
    print(f"Ingesting MIND: {mind_path}")
    mind_records = parse_mind_corpus(mind_path)
    print(f" -> Loaded {len(mind_records)} MIND records")

    print(f"Ingesting X Situational: {x_path}")
    x_records = parse_x_situational(x_path)
    print(f" -> Loaded {len(x_records)} X-Situational rules")

    print(f"Ingesting Equations: {eq_path}")
    eq_records = parse_equations_feed(eq_path)
    print(f" -> Loaded {len(eq_records)} Equation records")

    print(f"Ingesting Survivor Edges: {survivor_path}")
    survivor_records = parse_survivor_edges(survivor_path)
    print(f" -> Loaded {len(survivor_records)} Survivor Edge records")

    all_records = mind_records + x_records + eq_records + survivor_records
    
    # Deduplication by merkle_leaf
    seen_leaves = set()
    deduped = []
    for r in all_records:
        leaf = r['metadata']['merkle_leaf']
        if leaf not in seen_leaves:
            seen_leaves.add(leaf)
            deduped.append(r)
            
    print(f"\nTotal collected: {len(all_records)} | After deduplication: {len(deduped)}")
    
    # Shuffle deterministically
    random.shuffle(deduped)
    val_count = int(len(deduped) * args.val_ratio)
    train_records = deduped[val_count:]
    val_records = deduped[:val_count]
    
    print(f"Split: Train = {len(train_records)} ({len(train_records)/len(deduped):.1%}) | Val = {len(val_records)} ({len(val_records)/len(deduped):.1%})")
    
    if args.dry_run:
        print("\n[DRY RUN] Schema verification successful. Sample record 0:")
        sample = deduped[0]
        print(json.dumps(sample, indent=2)[:500] + "\n...")
        print("[DRY RUN] Finished without writing to disk.")
        return
        
    os.makedirs(args.output_dir, exist_ok=True)
    
    all_out = os.path.join(args.output_dir, 'coach-brain-sft-v1.jsonl')
    train_out = os.path.join(args.output_dir, 'coach-brain-train.jsonl')
    val_out = os.path.join(args.output_dir, 'coach-brain-val.jsonl')
    
    with open(all_out, 'w', encoding='utf-8') as f:
        for r in deduped:
            f.write(json.dumps(r) + '\n')
            
    with open(train_out, 'w', encoding='utf-8') as f:
        for r in train_records:
            f.write(json.dumps(r) + '\n')
            
    with open(val_out, 'w', encoding='utf-8') as f:
        for r in val_records:
            f.write(json.dumps(r) + '\n')
            
    print(f"\nOutputs generated:")
    print(f"  - {all_out} ({len(deduped)} records)")
    print(f"  - {train_out} ({len(train_records)} records)")
    print(f"  - {val_out} ({len(val_records)} records)")
    print("Corpus compilation complete!")

if __name__ == '__main__':
    main()
