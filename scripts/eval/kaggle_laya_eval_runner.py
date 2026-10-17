# Kaggle Laya Evaluation Runner for GSE Emission Gate
# Model: convaiinnovations/laya (or ggml-org/Laya-GGUF)
# Dataset: emission-gate-eval-set-v2.jsonl (3,694 settled picks)

import os
import json
import time
import pandas as pd

print("=== GSE Job B: Laya Emission Gate Evaluation Runner ===")
print("Checking GPU availability...")
try:
    import torch
    gpu_available = torch.cuda.is_available()
    print(f"CUDA Available: {gpu_available}")
    if gpu_available:
        print(f"Device: {torch.cuda.get_device_name(0)}")
        print(f"Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
except ImportError:
    gpu_available = False
    print("Torch not installed.")

# 1. Load the Evaluation Set
dataset_path = "emission-gate-eval-set-v2.jsonl"
if not os.path.exists(dataset_path):
    print(f"Dataset not found at {dataset_path}. Please upload emission-gate-eval-set-v2.jsonl as Kaggle dataset.")
else:
    rows = []
    with open(dataset_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    print(f"Loaded {len(rows)} evaluation records.")
    
    # Summary of markets
    df = pd.DataFrame(rows)
    print("Market breakdown:")
    print(df["market"].value_counts())

print("\nRunner ready for Laya weights inference.")
