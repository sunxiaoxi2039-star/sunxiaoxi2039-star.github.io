#!/usr/bin/env python3
"""Inline src/head.html + src/*.js (sorted by name) into one standalone index.html.

The JS files are fragments of a single ES module that share one scope, so they
are concatenated in filename order rather than imported from each other.
Run:  python3 windvale/build.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"


def main() -> None:
    head = (SRC / "head.html").read_text(encoding="utf-8")
    parts = []
    for js in sorted(SRC.glob("*.js")):
        parts.append(f"// ---- {js.name} ----\n" + js.read_text(encoding="utf-8").rstrip() + "\n")
    html = (
        head.rstrip()
        + "\n<script type=\"module\">\n"
        + "\n".join(parts)
        + "</script>\n</body>\n</html>\n"
    )
    out = ROOT / "index.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT.parent)} ({len(html.encode('utf-8')) / 1024:.0f} KB, {len(parts)} modules)")


if __name__ == "__main__":
    main()
