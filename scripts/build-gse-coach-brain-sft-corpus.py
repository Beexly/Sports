#!/usr/bin/env python3
"""
build-gse-coach-brain-sft-corpus.py

Compile Garrett's full verified intelligence corpus into ChatML SFT JSONL dataset.
Ingests:
  1. MIND_CORPUS_3000.jsonl (5,149 verified reasoning items)
  2. X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md (80 situational rules + analyst insights)
  3. sunday_45_corpus_and_equations_feed.jsonl (50 works with formulas & code references)

Outputs:
  - data/llm/gse-coach-brain-v1-sft.jsonl (Full SFT corpus)
  - data/coach-brain/coach-brain-train.jsonl (95%)
  - data/coach-brain/coach-brain-val.jsonl (5%)
"""

import os
import sys
import json
import re
import hashlib
import random
from pathlib import Path
from typing import List, Dict, Any

SYSTEM_PROMPT = (
    "You are GSE-COACH-BRAIN-V1, Garrett Baxley's Neuro-Symbolic Sports Intelligence Engine. "
    "CORE DOCTRINE: Coach Mindset is locked at Tuesday 04:00 CT (v1.0) and NEVER mutates. "
    "Injury overlays (v2.0 Wed, v3.0 Fri, v4.0 Sun T-90) only reallocate targets/carries via Sinkhorn "
    "and apply bounded EPA replacement dropoffs. Probabilities are calibrated via the -5.2pt isotonic curve."
)

def compute_merkle_leaf(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

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
                title = item.get('title', '')
                principle = item.get('principle_name') or item.get('principle_or_feature', '')
                evidence = item.get('evidence_quote') or item.get('mechanism_quote', '')
                how = item.get('how_it_influences_reasoning') or item.get('influence_description', '')
                domain = item.get('domain', 'nfl_reasoning')
                item_id = item.get('item_id', 'mind')
                
                if not title and not evidence:
                    continue
                
                user_content = (
                    f"[Domain: {domain}] Analyze the strategic mechanism and game-theory impact of: {title}\n\n"
                    f"Principle: {principle}"
                )
                assistant_content = (
                    f"### Empirical Evidence & Causal Mechanism\n{evidence}\n\n"
                    f"### Reasoning Influence & Engine Application\n{how}"
                )
                
                leaf = compute_merkle_leaf(f"{item_id}|{title}|{evidence}")
                
                records.append({
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                        {"role": "assistant", "content": assistant_content}
                    ],
                    "metadata": {
                        "source": "MIND_CORPUS_3000",
                        "source_id": item_id,
                        "merkle_leaf": leaf
                    }
                })
            except Exception:
                continue
    return records

def parse_x_situational(path: str) -> List[Dict[str, Any]]:
    records = []
    if not os.path.exists(path):
        print(f"[WARN] X-Situational corpus not found at {path}")
        return records
        
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
        
    record_blocks = re.split(r'### Record ', text)
    for block in record_blocks[1:]:
        lines = block.strip().splitlines()
        header = lines[0].strip() if lines else 'Record'
        
        situation = ''
        context = ''
        lesson = ''
        post = ''
        
        for line in lines:
            line_str = line.strip()
            if line_str.startswith('- Post:'):
                post = line_str[len('- Post:'):].strip()
            elif line_str.startswith('- THE SITUATION:'):
                situation = line_str[len('- THE SITUATION:'):].strip()
            elif line_str.startswith('- THE CONTEXT THAT CHANGES THE READ:'):
                context = line_str[len('- THE CONTEXT THAT CHANGES THE READ:'):].strip()
            elif line_str.startswith('- THE LESSON FOR THE MODEL:'):
                lesson = line_str[len('- THE LESSON FOR THE MODEL:'):].strip()
                
        if not lesson and not context:
            continue
            
        user_content = (
            f"Evaluate situational scenario: {header}\n\n"
            f"Post / Observation: {post}\n\n"
            f"Situation: {situation}\n"
            f"How does situational context alter the evaluation?"
        )
        
        assistant_content = (
            f"### Contextual Re-weighting\n{context}\n\n"
            f"### Operational Model Directive\n{lesson}"
        )
        
        leaf = compute_merkle_leaf(f"{header}|{situation}|{context}")
        
        records.append({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
                {"role": "assistant", "content": assistant_content}
            ],
            "metadata": {
                "source": "X_SITUATIONAL_CORPUS",
                "header": header,
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
                item_id = eq.get('itemId', 'EQ')
                title = eq.get('title', '')
                latex = eq.get('equationLatex', '')
                summary = eq.get('verbatimSummary', '')
                app = eq.get('engineApplication', '')
                domain = eq.get('domain', 'sports_analytics')
                
                user_content = (
                    f"[Domain: {domain}] Explain the formulation and GSE engine application of: {title} ({item_id})\n\n"
                    f"Equation: {latex}"
                )
                assistant_content = (
                    f"### Theoretical Summary\n{summary}\n\n"
                    f"### Engine Integration & Operational Application\n{app}"
                )
                
                leaf = compute_merkle_leaf(f"{item_id}|{title}|{latex}")
                
                records.append({
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                        {"role": "assistant", "content": assistant_content}
                    ],
                    "metadata": {
                        "source": "SUNDAY_45_EQUATIONS",
                        "itemId": item_id,
                        "merkle_leaf": leaf
                    }
                })
            except Exception:
                continue
    return records

def main():
    random.seed(42)

    mind_path = 'C:/Users/Garrett/Sports/docs/engine/research/2026-10-17/MIND_CORPUS_3000.jsonl'
    x_path = 'C:/Users/Garrett/Sports/docs/engine/research/2026-10-21/X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md'
    eq_path = 'C:/Users/Garrett/Sports/brain/feeds/2026-10-25/sunday_45_corpus_and_equations_feed.jsonl'

    print("=== GSE Coach Brain SFT Corpus Builder ===")
    print(f"Ingesting MIND: {mind_path}")
    mind_records = parse_mind_corpus(mind_path)
    print(f" -> Loaded {len(mind_records)} MIND records")

    print(f"Ingesting X Situational: {x_path}")
    x_records = parse_x_situational(x_path)
    print(f" -> Loaded {len(x_records)} X-Situational rules")

    print(f"Ingesting Equations: {eq_path}")
    eq_records = parse_equations_feed(eq_path)
    print(f" -> Loaded {len(eq_records)} Equation records")

    all_records = mind_records + x_records + eq_records
    
    # Deduplication by merkle_leaf
    seen_leaves = set()
    deduped = []
    for r in all_records:
        leaf = r['metadata']['merkle_leaf']
        if leaf not in seen_leaves:
            seen_leaves.add(leaf)
            deduped.append(r)
            
    print(f"\nTotal collected: {len(all_records)} | After deduplication: {len(deduped)}")
    
    random.shuffle(deduped)
    val_count = max(1, int(len(deduped) * 0.05))
    train_records = deduped[val_count:]
    val_records = deduped[:val_count]
    
    print(f"Split: Train = {len(train_records)} ({len(train_records)/len(deduped):.1%}) | Val = {len(val_records)} ({len(val_records)/len(deduped):.1%})")
    
    out_dir_llm = Path('C:/Users/Garrett/Sports/data/llm')
    out_dir_coach = Path('C:/Users/Garrett/Sports/data/coach-brain')
    out_dir_llm.mkdir(parents=True, exist_ok=True)
    out_dir_coach.mkdir(parents=True, exist_ok=True)
    
    all_out = out_dir_llm / 'gse-coach-brain-v1-sft.jsonl'
    train_out = out_dir_coach / 'coach-brain-train.jsonl'
    val_out = out_dir_coach / 'coach-brain-val.jsonl'
    
    with open(all_out, 'w', encoding='utf-8') as f:
        for r in deduped:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
            
    with open(train_out, 'w', encoding='utf-8') as f:
        for r in train_records:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
            
    with open(val_out, 'w', encoding='utf-8') as f:
        for r in val_records:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
            
    print(f"\nOutputs generated:")
    print(f"  - {all_out} ({len(deduped)} records)")
    print(f"  - {train_out} ({len(train_records)} records)")
    print(f"  - {val_out} ({len(val_records)} records)")
    print("SFT corpus compilation complete!")

if __name__ == '__main__':
    main()
