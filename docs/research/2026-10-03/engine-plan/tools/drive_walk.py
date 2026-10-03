import json, subprocess, sys, collections

ROOT = "1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG"
OUT = "/home/hatch/workspace/eng-mine/drive-inventory/inventory.jsonl"

def run(params):
    cmd = ["hatch_gws_cli", "drive", "files", "list", "--params", json.dumps(params)]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        raise RuntimeError(p.stderr[:500])
    return json.loads(p.stdout)

def list_children(folder_id, page_token=None):
    params = {
        "q": f"'{folder_id}' in parents and trashed=false",
        "pageSize": 1000,
        "fields": "nextPageToken,files(id,name,mimeType,size,md5Checksum,parents,modifiedTime)",
    }
    if page_token:
        params["pageToken"] = page_token
    return run(params)

seen_folders = set([ROOT])
queue = collections.deque([ROOT])
n_files = 0
n_folders = 0
out = open(OUT, "w")
try:
    while queue:
        fid = queue.popleft()
        page_token = None
        while True:
            res = list_children(fid, page_token)
            for f in res.get("files", []):
                f["_walk_parent"] = fid
                out.write(json.dumps(f) + "\n")
                if f["mimeType"] == "application/vnd.google-apps.folder":
                    n_folders += 1
                    if f["id"] not in seen_folders:
                        seen_folders.add(f["id"])
                        queue.append(f["id"])
                else:
                    n_files += 1
            page_token = res.get("nextPageToken")
            if not page_token:
                break
        if (n_files + n_folders) % 500 == 0:
            print(f"progress: {n_files} files, {n_folders} folders, queue={len(queue)}", flush=True)
finally:
    out.close()
print(f"DONE: {n_files} files, {n_folders} folders")
