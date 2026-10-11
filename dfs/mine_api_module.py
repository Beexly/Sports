import re, json

t = open('dfs/dk_app_full.js').read()

roots = {
    'u': '/draftgroups/v1',
    'l': '/draftgroups/v3',
    'd': '/contests/v1',
    'f': '/contests/v2',
    'A': '/lineups/v1',
    'p': '/entries/v1',
}

found = {}
for var, root in roots.items():
    pat = re.compile(re.escape(f'var {var}="{root}"'))
    m = pat.search(t)
    if not m:
        continue
    chunk = t[m.start():m.start() + 6000]
    esc_root = re.escape(root)
    # concat usage: var+"/suffix"
    concats = set(re.findall(re.escape(var) + r'\+"([\w/${}.?=&-]{2,70})"', chunk))
    # direct literal usage: "/root/suffix"
    concats |= set(re.findall('"' + esc_root + r'([\w/${}.?=&-]{2,70})"', chunk))
    found[root] = sorted(concats)
    print(f'== {root}: {len(found[root])} methods')
    for x in found[root][:25]:
        print('   ', x)

json.dump(found, open('dfs/dk_api_module_map.json', 'w'), indent=1)
print('saved')
