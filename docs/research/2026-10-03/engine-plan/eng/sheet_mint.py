"""Mint reader. Does not open mind.jsonl. Unknown id returns None."""
from __future__ import annotations

import sheet_identities as ident

_LANDED = {
    "js_41": ident.js_41,
    "js_51": ident.js_51,
    "js_equal": ident.js_equal,
    "js_41_ln": ident.js_41_ln,
    "chen_h": ident.chen_h,
    "chen_kendall": ident.chen_kendall,
    "divos_next_goal": ident.divos_next_goal,
    "divos_odd_even": ident.divos_odd_even,
    "bass_sigma": ident.bass_sigma,
    "aldous_sigma": ident.aldous_sigma,
    "dpo_7": ident.dpo_7,
    "ppo_clip_7": ident.ppo_clip_7,
    "lora_3": ident.lora_3,
    "aci_2": ident.aci_2,
}

_SOURCE = {
    "js_41": {"paper": "Lin 1991", "footer": 147, "equation_number": "4.1", "log_base": 2},
    "js_51": {"paper": "Lin 1991", "footer": 149, "equation_number": "5.1", "log_base": 2},
    "js_equal": {"paper": "Lin 1991", "footer": 147, "equation_number": "4.1", "log_base": 2},
    "js_41_ln": {"paper": "Lin 1991", "footer": 147, "equation_number": "4.1", "log_base": "ln"},
    "chen_h": {"paper": "arXiv:1710.06056", "footer": 8, "equation_number": "3.2", "log_base": None},
    "chen_kendall": {"paper": "arXiv:1710.06056", "footer": 2, "equation_number": "page-2", "log_base": None},
    "divos_next_goal": {"paper": "arXiv:1811.03931", "footer": 20, "equation_number": "A1", "log_base": None},
    "divos_odd_even": {"paper": "arXiv:1811.03931", "footer": 20, "equation_number": "Table A1", "log_base": None},
    "bass_sigma": {"paper": "arXiv:2608.12291", "footer": 44, "equation_number": "sigma_B", "log_base": None},
    "aldous_sigma": {"paper": "arXiv:2608.12291", "footer": 44, "equation_number": "sigma_A", "log_base": None},
    "dpo_7": {"paper": "arXiv:2305.18290", "footer": None, "equation_number": "7", "log_base": None},
    "ppo_clip_7": {"paper": "arXiv:1707.06347", "footer": None, "equation_number": "7", "log_base": None},
    "lora_3": {"paper": "arXiv:2106.09685", "footer": None, "equation_number": "3", "log_base": None},
    "aci_2": {"paper": "arXiv:2106.00170", "footer": None, "equation_number": "2", "log_base": None},
}


def get(id):
    return _LANDED.get(id)


def ids():
    return sorted(_LANDED)


def source(id):
    return _SOURCE.get(id)
