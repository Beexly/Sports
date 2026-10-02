"""GSE Brain Engine — MiMo-V2.6 on ZeroGPU (free tier).

Serves XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B (MIT) in 4-bit behind @spaces.GPU.
ZeroGPU hardware only — this Space can never bill the account (see README.md
billing policy). The /chat endpoint speaks the GSE grounding contract: every
prompt should include VERIFIED DATA and demand cited numbers + INFERENCE flags.
"""

import spaces
import torch
import gradio as gr
from transformers import (
    AutoModelForImageTextToText,
    AutoTokenizer,
    BitsAndBytesConfig,
)

MODEL_ID = "XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B"

SYSTEM_PROMPT = (
    "You are a specialist in the GSE NFL intelligence engine. "
    "You are given VERIFIED DATA in the user message. HARD RULES: "
    "(1) Every numeric claim MUST cite a value from the VERIFIED DATA. "
    "(2) Anything inferred beyond the data MUST be labeled INFERENCE with a breaking_condition. "
    "(3) Output ONLY valid JSON when a JSON schema is requested."
)

print("Loading tokenizer...", flush=True)
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)

print("Loading model in 4-bit...", flush=True)
bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16)
model = AutoModelForImageTextToText.from_pretrained(
    MODEL_ID,
    quantization_config=bnb,
    device_map="auto",
    torch_dtype=torch.float16,
    trust_remote_code=True,
)
model.eval()
print("Model ready.", flush=True)


@spaces.GPU(duration=60)
def chat(message: str, history: list):
    """Chat endpoint (api_name=/chat). Text-only; history as Gradio pairs."""
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for h_user, h_asst in history or []:
            messages.append({"role": "user", "content": h_user})
            messages.append({"role": "assistant", "content": h_asst})
        messages.append({"role": "user", "content": message})

        text = tokenizer.apply_chat_template(
            messages, add_generation_prompt=True, tokenize=False)
        inputs = tokenizer(text, return_tensors="pt").to("cuda")
        input_len = inputs["input_ids"].shape[1]

        with torch.inference_mode():
            out = model.generate(
                **inputs,
                max_new_tokens=2048,
                temperature=0.2,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
            )
        response = tokenizer.batch_decode(
            out[:, input_len:], skip_special_tokens=True)[0]
        return response.strip()
    except Exception as exc:  # never crash the Space; return the error loudly
        return f"[BRAIN-ENGINE ERROR] {type(exc).__name__}: {exc}"


demo = gr.ChatInterface(
    fn=chat,
    title="GSE Brain Engine (MiMo-V2.6, ZeroGPU)",
    description=(
        "The GSE NFL intelligence engine's LLM specialist layer, served free on "
        "Hugging Face ZeroGPU. Send it VERIFIED DATA + a grounding prompt; it "
        "reasons (L3 chains, L4 adversary, L5 synthesis) and cites numbers."
    ),
)

if __name__ == "__main__":
    demo.launch()
