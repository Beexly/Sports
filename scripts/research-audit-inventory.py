"""Read XLSX research exports without executing formulas or dependencies."""
import collections
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'

def load(path):
    with zipfile.ZipFile(path) as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            shared = [''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml'))]
        rels = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        sheets = []
        for s in ET.fromstring(z.read('xl/workbook.xml')).find('s:sheets', NS):
            target = rels[s.attrib[R]]
            target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
            rows = []
            for row in ET.fromstring(z.read(target)).findall('.//s:sheetData/s:row', NS):
                cells = {}
                for c in row:
                    v = c.find('s:v', NS)
                    text = v.text if v is not None else ''
                    if c.attrib.get('t') == 's':
                        text = shared[int(text)]
                    elif c.attrib.get('t') == 'inlineStr':
                        text = ''.join(n.text or '' for n in c.findall('.//s:t', NS))
                    if text:
                        cells[c.attrib['r']] = text
                if cells:
                    rows.append({'row': int(row.attrib['r']), 'cells': cells})
            sheets.append({'name': s.attrib['name'], 'rows': rows})
        return {'source': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'live_parity': 'NOT_VERIFIED', 'sheets': sheets}

if __name__ == '__main__':
    out = Path('docs/ops/research-audit-2026-09-17')
    out.mkdir(parents=True, exist_ok=True)
    for name in ['gse_research_analysis.xlsx', 'gse_research_analysis_1.xlsx']:
        p = Path('C:/Users/Garrett/Downloads') / name
        result = load(p)
        (out / (p.stem + '.json')).write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
        print(name, result['sha256'])
        for sheet in result['sheets']:
            print(sheet['name'], 'nonempty_rows=', len(sheet['rows']))
            print(json.dumps(sheet['rows'][:2], ensure_ascii=True)[:4000])
