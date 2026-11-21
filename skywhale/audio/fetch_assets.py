#!/usr/bin/env python3
"""Fetch and build everything the SKY WHALE soundtrack needs, pinned by
assets.json: sfizz (built from source, sfizz_render patched to write
32-bit float WAV), VSCO 2 CE (SFZ branch, sparse), Salamander Grand Piano,
and the field recordings / impulse responses.  Idempotent: existing files
whose hashes match are kept.

Usage: python3 fetch_assets.py [--build-dir DIR] [--check] [--wws]
"""
import hashlib
import json
import os
import subprocess
import sys

sys.dont_write_bytecode = True  # keep the repo free of __pycache__
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "OfflineSoundBuild/1.0 (generic research client)"}


def sh(cmd, cwd=None):
    print("  $", " ".join(cmd) if isinstance(cmd, list) else cmd, flush=True)
    subprocess.run(cmd, cwd=cwd, check=True)


def file_hash(path, algo):
    h = hashlib.new(algo)
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def verify(path, entry):
    for algo in ("sha256", "sha1", "md5"):
        if algo in entry:
            return file_hash(path, algo) == entry[algo]
    return os.path.exists(path)


def download(url, dest, max_wait=3 * 3600):
    """GET with patience for HTTP 429 (Wikimedia rate-limits bulk clients;
    honour Retry-After)."""
    waited = 0
    while True:
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
                data = r.read()
            tmp = dest + ".part"
            with open(tmp, "wb") as f:
                f.write(data)
            os.replace(tmp, dest)
            return
        except urllib.error.HTTPError as e:
            if e.code == 429 and waited < max_wait:
                ra = int(e.headers.get("retry-after", "120"))
                print(f"    429 from server, waiting {ra} s (Retry-After) ...", flush=True)
                time.sleep(ra + 5)
                waited += ra + 5
                continue
            raise


def fetch_git(name, g, build):
    d = os.path.join(build, g["dir"])
    if os.path.isdir(os.path.join(d, ".git")):
        head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=d, capture_output=True, text=True).stdout.strip()
        if head == g["commit"]:
            if "sparse" in g:
                sp = os.path.join(d, ".git", "info", "sparse-checkout")
                want = "\n".join(g["sparse"]) + "\n"
                if not os.path.exists(sp) or open(sp).read() != want:
                    with open(sp, "w") as f:
                        f.write(want)
                    sh(["git", "read-tree", "-mu", "HEAD"], cwd=d)
            print(f"[git] {name}: {head[:10]} ok")
            return d
    print(f"[git] {name}: cloning {g['url']} @ {g['ref']}")
    os.makedirs(os.path.dirname(d), exist_ok=True)
    if "sparse" in g:
        sh(["git", "clone", "--depth", "1", "--filter=blob:none", "--no-checkout", "-b", g["ref"], g["url"], d])
        sh(["git", "sparse-checkout", "init", "--no-cone"], cwd=d)
        with open(os.path.join(d, ".git", "info", "sparse-checkout"), "w") as f:
            f.write("\n".join(g["sparse"]) + "\n")
        sh(["git", "checkout", g["ref"]], cwd=d)
    else:
        cmd = ["git", "clone", "--depth", "1", "-b", g["ref"], g["url"], d]
        if g.get("submodules"):
            cmd[2:2] = ["--recurse-submodules", "--shallow-submodules"]
        sh(cmd)
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=d, capture_output=True, text=True).stdout.strip()
    if head != g["commit"]:
        sh(["git", "fetch", "--depth", "1", "origin", g["commit"]], cwd=d)
        sh(["git", "checkout", g["commit"]], cwd=d)
    return d


def build_sfizz(d, patch):
    exe = os.path.join(d, "build", "library", "bin", "sfizz_render")
    patched = subprocess.run(["git", "diff", "--quiet", "--", "clients/sfizz_render.cpp"], cwd=d).returncode != 0
    if not patched:
        sh(["git", "apply", patch], cwd=d)
    if os.path.exists(exe) and os.path.getmtime(exe) > os.path.getmtime(os.path.join(d, "clients", "sfizz_render.cpp")):
        print("[sfizz] sfizz_render up to date")
        return exe
    os.makedirs(os.path.join(d, "build"), exist_ok=True)
    sh(["cmake", "..", "-DCMAKE_BUILD_TYPE=Release", "-DSFIZZ_JACK=OFF", "-DSFIZZ_RENDER=ON",
        "-DSFIZZ_SHARED=OFF", "-DENABLE_LTO=OFF", "-DSFIZZ_TESTS=OFF"], cwd=os.path.join(d, "build"))
    sh(["make", f"-j{os.cpu_count() or 2}", "sfizz_render"], cwd=os.path.join(d, "build"))
    return exe


def main():
    build = os.environ.get("SKYWHALE_AUDIO_BUILD", "/workspace/_build/audio")
    if "--build-dir" in sys.argv:
        build = sys.argv[sys.argv.index("--build-dir") + 1]
    with open(os.path.join(HERE, "assets.json")) as f:
        A = json.load(f)
    for name, g in A["git"].items():
        if "--check" in sys.argv:
            d = os.path.join(build, g["dir"])
            head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=d, capture_output=True, text=True).stdout.strip()
            print(f"[git] {name}: {'ok' if head == g['commit'] else 'MISSING/DIFFERENT'}")
            continue
        d = fetch_git(name, g, build)
        if name == "sfizz":
            build_sfizz(d, os.path.join(HERE, g["patch"]))
    missing = []
    files = list(A["files"])
    if "--wws" in sys.argv:
        files += A["optional_wikimedia"]["files"]
    for e in files:
        dest = os.path.join(build, e["dest"])
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if os.path.exists(dest) and verify(dest, e):
            print(f"[file] {e['id']}: ok")
            continue
        if "--check" in sys.argv:
            print(f"[file] {e['id']}: MISSING")
            missing.append(e["id"])
            continue
        print(f"[file] {e['id']}: downloading {e['url']}")
        try:
            download(e["url"], dest)
        except Exception as ex:  # noqa
            print(f"    FAILED: {ex}")
            missing.append(e["id"])
            continue
        if not verify(dest, e):
            print(f"    HASH MISMATCH for {e['id']}")
            missing.append(e["id"])
    if missing:
        print("Missing assets:", ", ".join(missing))
        sys.exit(1)
    print("All assets present.")


if __name__ == "__main__":
    main()
