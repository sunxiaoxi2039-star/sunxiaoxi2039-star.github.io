"""Generate every plate with the OpenAI Images API (GPT image model).

    export OPENAI_API_KEY=...            # never commit this
    python3 tools/generate_images.py --sheets        # 1) character sheets -> assets/refs/
    python3 tools/generate_images.py                 # 2) all shots (skips existing)
    python3 tools/generate_images.py --only e3s06    # regenerate one shot

Shots that feature characters are generated with the images *edits* endpoint,
passing that shot's character sheets as reference images so faces, clothes and
colors stay consistent across all five episodes. Only Python stdlib is used.
"""
import argparse, base64, json, os, sys, time, urllib.request, uuid
from load_data import ROOT, load, full_prompt, refs_in

API = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
MODEL = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")
SIZE, QUALITY = "1536x1024", os.environ.get("OPENAI_IMAGE_QUALITY", "high")


def _post(url, body, headers):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("OPENAI_API_KEY is not set")
    req = urllib.request.Request(url, data=body, headers={"Authorization": f"Bearer {key}", **headers})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(5 * 2 ** attempt); continue
            sys.exit(f"HTTP {e.code}: {msg[:500]}")


def generate(prompt):
    body = json.dumps({"model": MODEL, "prompt": prompt, "size": SIZE, "quality": QUALITY, "n": 1}).encode()
    return _post(f"{API}/images/generations", body, {"Content-Type": "application/json"})


def edit(prompt, ref_paths):
    b = uuid.uuid4().hex; parts = []
    def field(name, value):
        parts.append(f"--{b}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())
    for k, v in (("model", MODEL), ("prompt", prompt), ("size", SIZE), ("quality", QUALITY), ("n", "1")):
        field(k, v)
    for p in ref_paths:
        parts.append(f"--{b}\r\nContent-Disposition: form-data; name=\"image[]\"; filename=\"{p.name}\"\r\nContent-Type: image/png\r\n\r\n".encode() + p.read_bytes() + b"\r\n")
    parts.append(f"--{b}--\r\n".encode())
    return _post(f"{API}/images/edits", b"".join(parts), {"Content-Type": f"multipart/form-data; boundary={b}"})


def save(resp, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(base64.b64decode(resp["data"][0]["b64_json"]))
    print("  saved", path.relative_to(ROOT))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheets", action="store_true", help="generate character reference sheets")
    ap.add_argument("--only", nargs="*", help="shot ids to (re)generate")
    ap.add_argument("--episode", type=int)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    data = load(); refdir = ROOT / "assets" / "refs"
    if a.sheets:
        for k, v in data["characters"].items():
            out = refdir / f"{k}.png"
            if out.exists() and not a.force: continue
            print("sheet", k)
            save(generate(f"Character design sheet, front view, side view and three expressions, plain warm paper background. {data['style']}. {v}."), out)
        return
    for ep in data["episodes"]:
        if a.episode and ep["n"] != a.episode: continue
        for s in ep["shots"]:
            if a.only and s["id"] not in a.only: continue
            out = ROOT / "assets" / f"ep{ep['n']}" / f"{s['id']}.png"
            if out.exists() and not (a.force or a.only): continue
            prompt = full_prompt(data, s)
            refs = [refdir / f"{r}.png" for r in dict.fromkeys(refs_in(s["prompt"])) if (refdir / f"{r}.png").exists()]
            print(s["id"], f"({len(refs)} refs)")
            save(edit(prompt, refs[:4]) if refs else generate(prompt), out)
    os.system(f"{sys.executable} {ROOT / 'tools' / 'build_manifest.py'}")


if __name__ == "__main__":
    main()
