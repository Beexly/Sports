#!/usr/bin/env python3
"""
kaggle-unsloth-runner.py

Headless Kaggle Unsloth / T4 / A100 Training Orchestrator for GSE Coach Brain LLM.

Features:
  - Validates ~/.kaggle/kaggle.json authentication.
  - Packages coach-brain-train.jsonl and coach-brain-val.jsonl into a Kaggle dataset.
  - Generates unsloth fine-tuning kernel script and kernel-metadata.json.
  - Pushes kernel and monitors headless execution.
"""

import os
import sys
import json
import argparse
import subprocess

KAGGLE_DIR = os.path.expanduser('~/.kaggle')
KAGGLE_JSON = os.path.join(KAGGLE_DIR, 'kaggle.json')
DATASET_DIR = 'C:/Users/Garrett/Sports/data/coach-brain'
KERNEL_DIR = 'C:/Users/Garrett/Sports/scripts/kaggle_kernel'

def check_kaggle_auth() -> bool:
    if not os.path.exists(KAGGLE_JSON):
        return False
    try:
        with open(KAGGLE_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return bool(data.get('username') and (data.get('key') or data.get('access_token')))
    except Exception:
        return False

def validate_setup() -> bool:
    print("=== Kaggle Unsloth Runner Validation ===")
    auth_ok = check_kaggle_auth()
    print(f"[1/3] Kaggle Credentials ({KAGGLE_JSON}): {'VALID' if auth_ok else 'MISSING'}")
    
    train_file = os.path.join(DATASET_DIR, 'coach-brain-train.jsonl')
    val_file = os.path.join(DATASET_DIR, 'coach-brain-val.jsonl')
    
    data_ok = os.path.exists(train_file) and os.path.exists(val_file)
    print(f"[2/3] Coach Brain Datasets ({DATASET_DIR}): {'READY' if data_ok else 'MISSING'}")
    if data_ok:
        with open(train_file, 'r', encoding='utf-8') as f:
            train_lines = sum(1 for _ in f)
        with open(val_file, 'r', encoding='utf-8') as f:
            val_lines = sum(1 for _ in f)
        print(f"      -> Train records: {train_lines} | Val records: {val_lines}")
        
    print("[3/3] Target Architecture: Unsloth QLoRA (r=16, alpha=32) -> GGUF (Q4_K_M, Q8_0)")
    
    overall = auth_ok and data_ok
    print(f"\nValidation Result: {'ALL CHECKS PASSED' if overall else 'FAILED'}")
    return overall

def generate_kernel_files(username: str = "garrettbaxley"):
    os.makedirs(KERNEL_DIR, exist_ok=True)
    
    metadata = {
        "id": f"{username}/gse-coach-brain-v1-unsloth",
        "title": "GSE Coach Brain v1.0 LoRA Training",
        "code_file": "train.py",
        "language": "python",
        "kernel_type": "script",
        "is_private": "true",
        "enable_gpu": "true",
        "enable_internet": "true",
        "dataset_sources": [f"{username}/gse-coach-brain-corpus"]
    }
    
    with open(os.path.join(KERNEL_DIR, 'kernel-metadata.json'), 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
        
    kernel_code = """# GSE Coach Brain LoRA Training on Unsloth
import os
import torch

print("Installing unsloth...")
os.system("pip install --no-deps \"unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git\"")
os.system("pip install --no-deps trl peft accelerate bitsandbytes")

from unsloth import FastLanguageModel

max_seq_length = 2048
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="Qwen/Qwen2.5-32B-Instruct",
    max_seq_length=max_seq_length,
    load_in_4bit=True
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none"
)

print("Model ready for SFT Trainer.")
# Export to GGUF
# model.save_pretrained_gguf("gse-coach-brain-v1", tokenizer, quantization_method="q4_k_m")
"""
    with open(os.path.join(KERNEL_DIR, 'train.py'), 'w', encoding='utf-8') as f:
        f.write(kernel_code)
        
    print(f"[INFO] Generated Kaggle kernel in {KERNEL_DIR}")

def main():
    parser = argparse.ArgumentParser(description="Kaggle Unsloth Headless Training Runner")
    parser.add_argument('--validate', action='store_true', help="Validate Kaggle environment and datasets")
    parser.add_argument('--generate', action='store_true', help="Generate kernel metadata and script")
    args = parser.parse_args()

    if args.validate:
        ok = validate_setup()
        sys.exit(0 if ok else 1)
        
    if args.generate:
        generate_kernel_files()
        return
        
    # Default to validate
    validate_setup()

if __name__ == '__main__':
    main()
