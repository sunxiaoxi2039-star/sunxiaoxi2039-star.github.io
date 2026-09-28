#!/usr/bin/env python3
"""Sync the site tree from a published bundle.

publish/manifest.json (pushed by the agent through the GitHub connector, tiny):
  {"bundle": "https://<host>/_publish/site-<hash>.tar.gz", "bundle_sha256": "...", "note": "..."}
The bundle is a .tar.gz of the whole static site plus files.json ({"files": {path: sha256}}).
Everything is verified (bundle hash, then every file hash) before the repo is touched.
Files listed in the previous publish/files.json but absent now are deleted.
Never touches .github/ or publish/manifest.json.
"""
import hashlib, io, json, sys, tarfile, time, urllib.request
from pathlib import Path

ROOT = Path.cwd()
PROTECTED = (".github/", "publish/")


def get(url, tries=5):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "radar-sync"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa
            if i == tries - 1:
                raise
            print(f"retry {url}: {e}")
            time.sleep(3 + i * 5)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    m = json.loads((ROOT / "publish/manifest.json").read_text())
    blob = get(m["bundle"])
    if sha(blob) != m["bundle_sha256"]:
        sys.exit(f"bundle hash mismatch: {sha(blob)} != {m['bundle_sha256']}")
    content = {}
    with tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz") as tf:
        for mem in tf.getmembers():
            if not mem.isfile():
                continue
            name = mem.name.lstrip("./")
            if name.startswith("/") or ".." in name.split("/"):
                sys.exit(f"refusing path {name}")
            content[name] = tf.extractfile(mem).read()
    raw = content.pop("files.json")
    files = json.loads(raw)["files"]
    if set(files) != set(content):
        sys.exit(f"bundle/file list mismatch: {sorted(set(files) ^ set(content))[:10]}")
    for path, h in files.items():
        if path.startswith(PROTECTED):
            sys.exit(f"refusing protected path {path}")
        if sha(content[path]) != h:
            sys.exit(f"hash mismatch for {path}")
    old_list = ROOT / "publish/files.json"
    old = json.loads(old_list.read_text())["files"] if old_list.exists() else {}
    changed = 0
    for path, data in content.items():
        p = ROOT / path
        if p.exists() and p.read_bytes() == data:
            continue
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        changed += 1
    removed = 0
    for path in old:
        if path not in files and not path.startswith(PROTECTED):
            p = ROOT / path
            if p.exists():
                p.unlink()
                removed += 1
    old_list.parent.mkdir(exist_ok=True)
    old_list.write_bytes(raw)
    print(f"updated {changed} files, removed {removed}, total {len(files)}")


if __name__ == "__main__":
    main()
