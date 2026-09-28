#!/usr/bin/env python3
"""Sync the site tree from a remote publish source.

publish/manifest.json (pushed by the agent, tiny):
  {"source": "https://<host>/_site/", "files_sha256": "<sha256 of files.json>", "note": "..."}
The source serves files.json = {"files": {"path": sha256, ...}} and every listed file.
All downloads are verified before anything in the repo is touched. Files that were
listed in the previous publish/files.json but not in the new one are deleted.
Never touches .github/, publish/manifest.json or README.md.
"""
import hashlib, json, os, sys, time, urllib.request
from pathlib import Path

ROOT = Path.cwd()
PROTECTED = (".github/", "publish/manifest.json")


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "radar-sync"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa
            if i == tries - 1:
                raise
            print(f"retry {url}: {e}")
            time.sleep(2 + i * 3)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    m = json.loads((ROOT / "publish/manifest.json").read_text())
    src = m["source"].rstrip("/") + "/"
    raw = get(src + "files.json")
    if sha(raw) != m["files_sha256"]:
        sys.exit(f"files.json hash mismatch: {sha(raw)} != {m['files_sha256']}")
    files = json.loads(raw)["files"]
    staged = {}
    for path, h in sorted(files.items()):
        if path.startswith(PROTECTED) or ".." in path or path.startswith("/"):
            sys.exit(f"refusing path {path}")
        local = ROOT / path
        if local.exists() and sha(local.read_bytes()) == h:
            continue
        data = get(src + urllib.request.quote(path))
        if sha(data) != h:
            sys.exit(f"hash mismatch for {path}")
        staged[path] = data
    old_list = ROOT / "publish/files.json"
    old = json.loads(old_list.read_text())["files"] if old_list.exists() else {}
    for path, data in staged.items():
        p = ROOT / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
    removed = 0
    for path in old:
        if path not in files and not path.startswith(PROTECTED):
            p = ROOT / path
            if p.exists():
                p.unlink(); removed += 1
    old_list.write_bytes(raw)
    print(f"updated {len(staged)} files, removed {removed}, total {len(files)}")


if __name__ == "__main__":
    main()
