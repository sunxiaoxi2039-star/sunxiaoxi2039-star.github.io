"""Read episodes.js (a JSON object assigned to window.DREAMLIGHT)."""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent


def load():
    src = (ROOT / "episodes.js").read_text(encoding="utf-8")
    body = re.sub(r"^\s*window\.DREAMLIGHT\s*=\s*", "", src).rstrip().rstrip(";")
    return json.loads(body)


def expand(data, text):
    """Replace [XIAOYA]-style tokens with the full character descriptions."""
    for k, v in data["characters"].items():
        text = text.replace(f"[{k}]", v)
    return text


def refs_in(text):
    return [k for k in re.findall(r"\[([A-Z_]+)\]", text)]


def full_prompt(data, shot):
    return f"{data['style']}. {expand(data, shot['prompt'])}."
