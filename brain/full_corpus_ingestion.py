# -*- coding: utf-8 -*-
import os, glob, json, zipfile, shutil
import xml.etree.ElementTree as ET

def docx_to_text(docx_path):
    try:
        with zipfile.ZipFile(docx_path) as z:
            xml_content = z.read('word/document.xml')
        tree = ET.fromstring(xml_content)
        paragraphs = []
        for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = [node.text for node in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
            if texts:
                paragraphs.append(''.join(texts))
        return '\n\n'.join(paragraphs)
    except Exception as e:
        return f'Error extracting docx: {e}'

# 1. Convert all DOCX files from Downloads into docs
docx_targets = [
    ('ASTRA-PACK-COMBINED (1).docx', r'c:\Users\Garrett\Sports\docs\engine\research\2026-10-11\ASTRA_PACK_COMBINED.md'),
    ('NFL_KICKOFF_COMMAND_BOARD_2026-10-11.docx', r'c:\Users\Garrett\Sports\docs\predictions\research\2026-10-11\NFL_KICKOFF_COMMAND_BOARD_2026-10-11.md'),
    ('Sports Engine and Glicko2 Audit.docx', r'c:\Users\Garrett\Sports\docs\engine\research\2026-10-11\SPORTS_ENGINE_AND_GLICKO2_AUDIT.md'),
    ('Completeness audit passed, four gaps closed, delivery v7 shipped.docx', r'c:\Users\Garrett\Sports\docs\engine\research\2026-10-11\COMPLETENESS_AUDIT_V7_SHIPPED.md'),
    ('Biophysical Telemetry and Regularity Audit.docx', r'c:\Users\Garrett\Sports\docs\engine\research\2026-10-11\BIOPHYSICAL_TELEMETRY_REGULARITY_AUDIT.md'),
    ('Motif Systems Inventory \u2014 Fleet Integration Brief (2).docx', r'c:\Users\Garrett\Sports\docs\data-sources\research\2026-10-11\MOTIF_SYSTEMS_FLEET_INTEGRATION_BRIEF.md'),
    ('### 1.docx', r'c:\Users\Garrett\Sports\docs\engine\research\2026-10-11\HARMONIC_AND_SIGNAL_AUDIT.md'),
    ('GSE_Master_Operating_System_Blueprint_v2.docx', r'c:\Users\Garrett\Sports\docs\engine\research\2026-10-11\GSE_MASTER_OPERATING_SYSTEM_BLUEPRINT_V2.md')
]

downloads_dir = r'C:\Users\Garrett\Downloads'
for docx_name, out_path in docx_targets:
    full_docx = os.path.join(downloads_dir, docx_name)
    if os.path.exists(full_docx):
        text = docx_to_text(full_docx)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(f"# {os.path.splitext(docx_name)[0]}\n\nSource: {docx_name}\n\n" + text)
        print(f"Extracted {len(text)} chars from {docx_name} -> {out_path}")

# 2. Ingest Hermes Plan and ASTRA fix
hermes_plan = r'C:\Users\Garrett\AppData\Local\hermes\# GSE - The Plan.txt'
if os.path.exists(hermes_plan):
    dest = r'c:\Users\Garrett\Sports\docs\engine\research\2026-10-11\GSE_THE_PLAN_HERMES.md'
    shutil.copy2(hermes_plan, dest)
    print(f"Copied Hermes plan -> {dest}")

# 3. Mirror GSE ML Service models (ETKF, Free Energy, IRL, MPS Layer, TDA)
ml_models_src = r'c:\Users\Garrett\gse-ml-service\app\models'
ml_models_dst = r'c:\Users\Garrett\Sports\intelligence\engines\ml_service_models'
if os.path.exists(ml_models_src):
    os.makedirs(ml_models_dst, exist_ok=True)
    for f in glob.glob(os.path.join(ml_models_src, '*.py')):
        shutil.copy2(f, ml_models_dst)
    print(f"Mirrored GSE ML Service models from {ml_models_src} -> {ml_models_dst}")

# Mirror GSE ML Service tests
ml_tests_src = r'c:\Users\Garrett\gse-ml-service\app\tests'
ml_tests_dst = r'c:\Users\Garrett\Sports\intelligence\engines\ml_service_tests'
if os.path.exists(ml_tests_src):
    os.makedirs(ml_tests_dst, exist_ok=True)
    for f in glob.glob(os.path.join(ml_tests_src, '*.py')):
        shutil.copy2(f, ml_tests_dst)
    print(f"Mirrored GSE ML Service tests from {ml_tests_src} -> {ml_tests_dst}")

# 4. Mirror JEV Lab modules (jev_curate, jev_fuse, jev_score, move37, etc.)
jev_src = r'c:\workspace\gse-lab-20260919'
jev_dst = r'c:\Users\Garrett\Sports\intelligence\jev'
if os.path.exists(jev_src):
    os.makedirs(jev_dst, exist_ok=True)
    for f in glob.glob(os.path.join(jev_src, '*.py')):
        shutil.copy2(f, jev_dst)
    print(f"Mirrored JEV lab scripts from {jev_src} -> {jev_dst}")

# 5. Mirror documents from OneDrive Galaxy Sports Edge
od_docs = r'c:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge'
if os.path.exists(od_docs):
    od_dest = r'c:\Users\Garrett\Sports\docs\engine\research\2026-10-11'
    for f in glob.glob(os.path.join(od_docs, '*.md')):
        shutil.copy2(f, od_dest)
        print(f"Mirrored OneDrive doc: {os.path.basename(f)}")

print("Full intelligence harvest and synthesis complete.")
