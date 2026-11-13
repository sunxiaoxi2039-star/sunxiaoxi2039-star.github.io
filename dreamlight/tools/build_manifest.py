"""Scan assets/ for generated plates and write assets/manifest.json for the player."""
import json
from load_data import ROOT, load

data = load()
plates = {}
for ep in data["episodes"]:
    for s in ep["shots"]:
        for ext in ("webp", "png", "jpg"):
            f = ROOT / "assets" / f"ep{ep['n']}" / f"{s['id']}.{ext}"
            if f.exists():
                plates[s["id"]] = f.relative_to(ROOT / "assets").as_posix()
                break
(ROOT / "assets" / "manifest.json").write_text(json.dumps({"plates": plates}, indent=1), encoding="utf-8")
print(f"{len(plates)} plates in manifest")
