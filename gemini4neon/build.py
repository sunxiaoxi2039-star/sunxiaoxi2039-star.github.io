#!/usr/bin/env python3
"""Build the Gemini 4 Neon use-case archive (cases.json / README.md / index.html).

Usage (from the repo root):
  python3 gemini4neon/build.py <upstream use-cases.json> [<upstream zh-CN.json>]

Upstream: https://github.com/cheercheung/awesome-gemini-4-neon-use-cases (CC BY 4.0),
files data/use-cases.json and data/localizations/zh-CN.json.

The human edits live in gemini4neon/editorial.json, keyed by upstream id:
子类, 中文一句话摘要, 作者自报的成本/耗时, 需要拍板 + 票拟. Upstream cases that are not in
editorial.json yet still get built (machine zh-CN title or the English title, subclass by
upstream category) and are listed under 需要你拍板 so they get a human pass.
"""
import html, json, sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
UPSTREAM_REPO = "cheercheung/awesome-gemini-4-neon-use-cases"
UPSTREAM_URL = f"https://github.com/{UPSTREAM_REPO}"
PAGE_URL = "https://sunxiaoxi2039-star.github.io/gemini4neon/"
GENERATED = "2026-11-20"

SUB_ORDER = ["3D 场景", "动态图形", "绘图与插画", "科普可视化", "游戏互动", "知识工作", "工程集成", "评测榜单"]
SUB_TO_CAT = {"3D 场景": "动效", "动态图形": "动效", "绘图与插画": "动效", "科普可视化": "动效",
              "游戏互动": "小游戏", "知识工作": "资料", "工程集成": "资料", "评测榜单": "资料"}
FALLBACK_SUB = {"graphics": "3D 场景", "games": "游戏互动", "knowledge": "知识工作",
                "engineering": "工程集成", "evaluations": "评测榜单"}
TYPE_ZH = {"Demo": "演示", "Tutorial": "教程", "Evaluation": "测评", "Integration": "集成",
           "Benchmark": "榜单", "Limit": "局限"}
ORIGIN_ZH = {"creator-report": "作者自述", "provider-demo": "官方演示",
             "benchmark-owner": "榜单方发布", "tool-developer": "工具方"}

# Hand-written reading of the cost rows below; case numbers are upstream's as of GENERATED.
COST_TAKEAWAY = (
    "双方都报了金额的 8 组同题对比里，Neon 有 7 组更贵（对 GPT-6.2 Sol 3 组、Astra 2 组、Fable 5.2 和 Hydrogen 各 1 组），"
    "只有对 Opus 5.5 那组（#30）便宜一半；另有 #23 作者说 Neon 更快更便宜但没给数字。"
    "全是单次自报，档位和提示不一定对齐，只能当线索。"
)
EVAL_TAKEAWAY = (
    "榜单方自己发的成绩里，Neon 大多在前列：Vending-Bench 2、Tuesday@Work、Penalty Bench、Models Engineering Index 第一，"
    "Vals Index 和 Agent Arena 第二，Text Arena 第三，Wojak-Bench 第四；Browser Use 74% 低于 Sol 的 82%。"
    "短板集中在速度和成本：CUDA 调试题耗时近 4 倍（#90），Plotly 43 题全对但花费是 Hydrogen 的约 2.7 倍（#95），RuneScape 没在时限内跑完（#87）。"
)


def esc(s):
    return html.escape(s or "", quote=True)


def md(s):
    return (s or "").replace("|", "\\|").replace("\n", " ")


def thumb_of(item):
    for m in item.get("media_assets", []):
        if m.get("kind") == "video" and m.get("poster_url"):
            return m["poster_url"], m.get("url")
        if m.get("kind") == "image" and m.get("url"):
            return m["url"], None
    return None, None


def build(up, zh, ed):
    picks = ed.get("picks", [])
    out = []
    for it in up["items"]:
        e = ed["items"].get(it["id"])
        n = it["public_number"]
        poster, video = thumb_of(it)
        rec = {
            "id": it["id"],
            "no": n,
            "回链": it["source_url"],
            "对象": it["author_handle"],
            "类型": None,
            "子类": None,
            "摘要": None,
            "来源": [UPSTREAM_REPO],
            "证据": TYPE_ZH.get(it["type"], it["type"]),
            "出处": ORIGIN_ZH.get(it["evidence_origin"], it["evidence_origin"]),
            "同题对比": it["kind"] == "comparison",
            "date": it["date"],
            "成本": None,
            "prompt": it["prompt_text"] if it.get("prompt_public") else None,
            "poster": poster,
            "video": video,
            "media_count": len(it.get("media_assets", [])),
            "thumb": True,
            "supporting_urls": it.get("supporting_urls", []),
            "upstream": {"title": it["title"], "observation": it["observation"], "notes": it["body_notes"]},
            "需要拍板": None,
            "票拟": None,
        }
        if e:
            rec["子类"] = e["子类"]
            rec["摘要"] = e["摘要"]
            rec["成本"] = e.get("成本")
            rec["thumb"] = e.get("thumb", True)
            rec["需要拍板"] = e.get("需要拍板")
            rec["票拟"] = e.get("票拟")
        else:
            rec["子类"] = FALLBACK_SUB.get(it["category_key"], "评测榜单")
            rec["摘要"] = (zh.get(f"case-{n}") or {}).get("title") or it["title"]
            rec["需要拍板"] = "新条目：摘要是上游机翻标题、子类按上游大类兜底，还没人工过"
            rec["票拟"] = "按兜底收录，下次改写"
        rec["类型"] = SUB_TO_CAT[rec["子类"]]
        out.append(rec)

    def key(r):
        return (picks.index(r["id"]) if r["id"] in picks else len(picks), SUB_ORDER.index(r["子类"]), r["no"])

    out.sort(key=key)
    return out


def stats(rows):
    return {
        "total": len(rows),
        "by_sub": {s: sum(r["子类"] == s for r in rows) for s in SUB_ORDER},
        "by_cat": dict(Counter(r["类型"] for r in rows)),
        "by_evidence": dict(Counter(r["证据"] for r in rows).most_common()),
        "by_origin": dict(Counter(r["出处"] for r in rows).most_common()),
        "comparisons": sum(r["同题对比"] for r in rows),
        "with_cost": sum(bool(r["成本"]) for r in rows),
        "with_prompt": sum(bool(r["prompt"]) for r in rows),
        "need_decision": sum(bool(r["需要拍板"]) for r in rows),
        "by_author_top": Counter(r["对象"] for r in rows).most_common(10),
        "dates": dict(sorted(Counter(r["date"] for r in rows).items())),
    }


def write_json(rows, st, up, path):
    doc = {
        "generated": GENERATED,
        "model": "Gemini 4 Neon",
        "upstream": {"repo": UPSTREAM_URL, "license": "CC BY 4.0", "source_scope": up.get("source_scope")},
        "schema": "回链=原帖 / 对象=作者 / 类型=雷达大类（动效·小游戏·资料）/ 子类 / 摘要=中文一句话 / 来源=收录自哪份索引；"
                  "证据=演示·测评·榜单·集成·局限；出处=作者自述·官方演示·榜单方发布·工具方；成本=作者自报",
        "stats": st,
        "items": rows,
    }
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def link(r):
    return f"[{md(r['摘要'])}]({r['回链']})"


def write_readme(rows, st, path):
    by_no = {r["no"]: r for r in rows}
    picks = [r for r in rows if r["id"] in EDITORIAL.get("picks", [])]
    L = []
    L.append("# Gemini 4 Neon 用例 · 整理归位\n")
    L.append(f"> 收集日期 {GENERATED}。数据来自 [{UPSTREAM_REPO}]({UPSTREAM_URL})（CC BY 4.0），"
             f"该清单从 X、Hacker News 和 Google 官方渠道收了 **{st['total']} 条**，每条带原帖链接。"
             "本页的中文摘要、子类和成本表是重新写的；X、blog.google 和媒体图床在本会话里都连不上，所以没有逐条打开原帖核对。\n")
    L.append("> 注意：清单里有 Google、Google AI、Antigravity 官方账号的帖子，看上去模型已正式发布；但各条成绩、成本和效果都是作者或榜单方自己说的，没有独立复核。\n")

    L.append("> 我们自己重做了两条：[#28 一个 HTML，十个镜头 → `shots/`](shots/)（32 KB 单文件、十个 GLSL 着色器、128 BPM 卡点）；[#103 机甲组装与升空 → `n01/`](n01/)（原创机甲，Three.js）。\n")
    L.append("## 三句话看完\n")
    L.append(f"- **做什么最多**：{st['by_sub']['3D 场景']} 条 3D 场景、{st['by_sub']['动态图形']} 条动态图形——Three.js / 体素 / SVG 的同题对比是主力，经典题还是「鹈鹕骑自行车」。")
    L.append(f"- **成本**：{COST_TAKEAWAY}")
    L.append(f"- **榜单**：{EVAL_TAKEAWAY}\n")

    L.append("## 整理方法（照 Fable 5.5 归档那套）\n")
    L.append("1. **统一格式**：每条留回链（原帖）、对象（作者）、类型（雷达大类 + 子类）、一句话摘要、来源索引；另加证据类型、出处、作者自报成本。机器可读版在 `cases.json`。")
    L.append("2. **规则归位**：上游 5 个大类拆成 8 个子类；视觉类归雷达的 `动效`，游戏归 `小游戏`，工程、知识工作、榜单不是设计作品，单独记为 `资料`。")
    L.append("3. **去重**：上游已按帖子 ID 去重；同一作者的系列（如 @SamuelAlbanie 的 9 条一句提示演示）按上游拆成单条。")
    L.append("4. **数据沉淀**：上游英文标题、观察、备注、媒体链接都留在 JSON 的 `upstream` 和 `poster` / `video` 字段里，换规则或做日报时可以直接用。")
    L.append("5. **只把需要拍板的推上来**：真人肖像、他人 IP、归属不清的，列在文末「需要你拍板」，每条附票拟。")
    L.append("6. **可重跑**：`build.py` 读上游 JSON 加 `editorial.json`（人工编辑层）生成三件产物；上游加了新条目也能直接重跑，新条目会自动进「需要你拍板」。\n")

    L.append("## 一眼看全\n")
    L.append("| 子类 | 雷达大类 | 条数 |\n|---|---|---|")
    for s in SUB_ORDER:
        L.append(f"| {s} | {SUB_TO_CAT[s]} | {st['by_sub'][s]} |")
    L.append(f"| **合计** | | **{st['total']}** |\n")
    L.append("证据类型：" + "、".join(f"{k} {v}" for k, v in st["by_evidence"].items())
             + "。出处：" + "、".join(f"{k} {v}" for k, v in st["by_origin"].items())
             + f"。同题对比 {st['comparisons']} 条，带作者自报成本/耗时 {st['with_cost']} 条，公开提示词 {st['with_prompt']} 条。\n")
    L.append("高产作者：" + "、".join(f"{a}（{n}）" for a, n in st["by_author_top"][:8]) + "\n")

    L.append("## 先看这 10 条\n")
    L.append("没有观看数，按我的判断挑：技术密度高、过程交代得清楚、能看出模型实际做了什么。\n")
    for r in picks:
        tag = " · 官方演示" if r["出处"] == "官方演示" else ""
        L.append(f"- **#{r['no']}** · {link(r)} — {r['对象']} · {r['子类']}{tag}")
    L.append("")

    L.append("## 作者自报的耗时与成本\n")
    L.append(COST_TAKEAWAY + "\n")
    L.append("同题对比：\n")
    L.append("| # | 题目 | 作者 | 自报数字 |\n|---|---|---|---|")
    for r in sorted((r for r in rows if r["成本"] and r["同题对比"]), key=lambda r: r["no"]):
        L.append(f"| {r['no']} | {link(r)} | {r['对象']} | {md(r['成本'])} |")
    L.append("\n单跑（无对照）：\n")
    L.append("| # | 题目 | 作者 | 自报数字 |\n|---|---|---|---|")
    for r in sorted((r for r in rows if r["成本"] and not r["同题对比"]), key=lambda r: r["no"]):
        L.append(f"| {r['no']} | {link(r)} | {r['对象']} | {md(r['成本'])} |")
    L.append("")

    for s in SUB_ORDER:
        sub = sorted((r for r in rows if r["子类"] == s), key=lambda r: r["no"])
        if not sub:
            continue
        L.append(f"## {s}（{len(sub)}）\n")
        if s == "评测榜单":
            L.append(EVAL_TAKEAWAY + "\n")
        L.append("| # | 作品 | 作者 | 证据 | 出处 |\n|---|---|---|---|---|")
        for r in sub:
            warn = " ⚠️" if r["需要拍板"] else ""
            cmp_ = " · 对比" if r["同题对比"] else ""
            L.append(f"| {r['no']} | {link(r)}{warn} | {r['对象']} | {r['证据']}{cmp_} | {r['出处']} |")
        L.append("")

    L.append("## 可以直接抄的提示词\n")
    for r in sorted((r for r in rows if r["prompt"]), key=lambda r: r["no"]):
        L.append(f"- **#{r['no']}** {link(r)} — {r['对象']}\n\n  ```\n  {r['prompt']}\n  ```\n")

    dec = sorted((r for r in rows if r["需要拍板"]), key=lambda r: r["no"])
    L.append(f"## 需要你拍板（{len(dec)} 条 + 2 个整体问题）\n")
    L.append("整体问题：\n")
    L.append(f"1. **资料类要不要上设计雷达**：知识工作 {st['by_sub']['知识工作']}、工程集成 {st['by_sub']['工程集成']}、评测榜单 {st['by_sub']['评测榜单']} 条不是设计作品。票拟：页面保留（排在视觉类后面、可用筛选单看），不进雷达日报。")
    L.append(f"2. **官方演示要不要单列**：{st['by_origin'].get('官方演示', 0)} 条被上游标为官方演示（Google、Google AI、Antigravity 官方账号，以及上游认定的 Google 员工，如 @SamuelAlbanie 的 9 条），是宣传素材。票拟：照收，卡片上标「官方演示」。\n")
    L.append("| # | 作品 | 问题 | 票拟 |\n|---|---|---|---|")
    for r in dec:
        L.append(f"| {r['no']} | {link(r)} | {md(r['需要拍板'])} | {md(r['票拟'])} |")
    L.append("")
    L.append("---\n")
    L.append(f"上游英文条目 © {UPSTREAM_REPO.split('/')[0]}，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；原帖、图片、视频归各自作者。本目录的中文摘要和整理是在其基础上的改写。")
    path.write_text("\n".join(L) + "\n", encoding="utf-8")


CSS = """
    .g4-note{padding:12px 16px;font-size:13px;color:var(--muted);line-height:1.6;max-width:520px;margin:0 auto}
    .g4-note a{color:var(--gold)}
    .g4-wrap[hidden]{display:none}
    .g4-noimg{display:flex;align-items:center;justify-content:center;aspect-ratio:16/10;font-size:13px;color:var(--muted);background:rgba(255,255,255,.04)}
    .g4-badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;color:var(--gold);background:var(--gold-dim)}
    .g4-badge.is-cmp{color:var(--site);background:rgba(126,184,255,.12)}
    .g4-no{margin-left:auto;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
    .card-row{flex-wrap:wrap}
    .g4-cost{display:block;margin-top:6px;font-size:13px;color:var(--gold)}
    .tag[data-type="动效"]{color:var(--app)}
    .g4-foot{padding:8px 16px 24px;font-size:12px;color:var(--muted);line-height:1.6;max-width:520px;margin:0 auto}
    .g4-foot a{color:var(--muted)}
    .brand-link{white-space:nowrap}
"""

JS = """
    (() => {
      const chips=document.getElementById('filters'); const cards=[...document.querySelectorAll('.g4-wrap')]; const count=document.getElementById('count');
      chips.addEventListener('click',e=>{const b=e.target.closest('.chip'); if(!b) return;
        chips.querySelectorAll('.chip').forEach(c=>c.classList.remove('is-active')); b.classList.add('is-active');
        const f=b.dataset.filter; let n=0;
        cards.forEach(c=>{const on=f==='all'||(f==='cmp'?c.dataset.cmp==='1':c.dataset.sub===f); c.hidden=!on; if(on) n++;});
        count.textContent=n+' 条'; window.scrollTo({top:0});});
    })();
"""


def card(r, is_pick):
    if r["poster"] and r["thumb"]:
        img = f'<img class="card-thumb" src="{esc(r["poster"])}" alt="" loading="lazy" decoding="async" width="800" height="500" />'
    else:
        img = '<div class="g4-noimg">无缩略图 · 点开看原帖</div>'
    badges = ""
    if is_pick:
        badges += '<span class="hi-badge">先看</span>'
    if r["出处"] == "官方演示":
        badges += '<span class="g4-badge">官方演示</span>'
    if r["同题对比"]:
        badges += '<span class="g4-badge is-cmp">同题对比</span>'
    cost = f'<span class="g4-cost">自报：{esc(r["成本"])}</span>' if r["成本"] else ""
    desc = f'{esc(r["对象"])} · {esc(r["证据"])} · {esc(r["出处"])}'
    return (
        f'<div class="g4-wrap" data-sub="{esc(r["子类"])}" data-cmp="{1 if r["同题对比"] else 0}">'
        f'<a href="{esc(r["回链"])}" target="_blank" rel="noopener" class="card{" is-hi" if is_pick else ""}">{img}'
        f'<div class="card-body"><div class="card-row"><span class="tag" data-type="{esc(r["类型"])}">{esc(r["子类"])}</span>'
        f'{badges}<span class="g4-no">#{r["no"]} · {esc(r["date"][5:])}</span></div>'
        f'<div class="card-title">{esc(r["摘要"])}</div><div class="card-desc">{desc}{cost}</div></div></a></div>'
    )


def write_html(rows, st, path):
    picks = set(EDITORIAL.get("picks", []))
    n = st["total"]
    chips = ['<button type="button" class="chip is-active" data-filter="all">全部</button>']
    chips += [f'<button type="button" class="chip" data-filter="{esc(s)}">{esc(s)} {st["by_sub"][s]}</button>'
              for s in SUB_ORDER if st["by_sub"][s]]
    chips.append(f'<button type="button" class="chip" data-filter="cmp">同题对比 {st["comparisons"]}</button>')
    desc = f"社区和榜单方发布的 {n} 条 Gemini 4 Neon 用例，按设计雷达分类整理，中文一句话摘要，每条回链原帖。"
    page = f"""<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0c0c0e" />
  <title>Gemini 4 Neon 用例归档 · 设计雷达</title>
  <meta name="description" content="{esc(desc)}" />
  <link rel="canonical" href="{PAGE_URL}" />
  <meta property="og:title" content="Gemini 4 Neon 用例归档 · 设计雷达" />
  <meta property="og:description" content="{esc(desc)}" />
  <meta property="og:url" content="{PAGE_URL}" />
  <link rel="stylesheet" href="../styles.css" />
  <style>{CSS}  </style>
</head>
<body>
  <header class="topbar" id="topbar">
    <div class="brand">
      <span class="brand-mark">✦</span>
      <span class="brand-name">设计雷达</span>
      <a class="brand-link" href="../">回首页 ›</a>
    </div>
    <nav class="filters" id="filters" aria-label="子类筛选">{''.join(chips)}</nav>
  </header>
  <p class="g4-note">X、Hacker News 和 Google 官方渠道上的 Gemini 4 Neon 用例共 {n} 条：{st['by_sub']['3D 场景'] + st['by_sub']['动态图形'] + st['by_sub']['绘图与插画'] + st['by_sub']['科普可视化']} 条视觉作品、{st['by_sub']['游戏互动']} 个小游戏，加上工程、知识工作和榜单成绩。效果、成本、排名都是作者或发布方自述，没有逐条核实。点卡片直达原帖。<a href="README.md">清单、成本表与方法 ›</a> · <a href="cases.json">cases.json ›</a> · <a href="shots/">我们重做的 #28 一个 HTML 十个镜头 ›</a> · <a href="n01/">#103 机甲升空 ›</a></p>
  <main id="feed" class="feed"><section class="day"><div class="day-head"><div class="day-date">Gemini 4 Neon · {GENERATED} 归档</div><div class="day-count" id="count">{n} 条</div></div>{''.join(card(r, r["id"] in picks) for r in rows)}</section></main>
  <p class="g4-foot">整理自 <a href="{UPSTREAM_URL}" target="_blank" rel="noopener">{UPSTREAM_REPO}</a>（CC BY 4.0），中文摘要为本站改写；原帖、图片和视频归各自作者。</p>
  <script>{JS}  </script>
</body>
</html>
"""
    path.write_text(page, encoding="utf-8")


EDITORIAL = {}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    up = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    zh = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8")).get("cases", {}) if len(sys.argv) > 2 else {}
    EDITORIAL = json.loads((HERE / "editorial.json").read_text(encoding="utf-8"))
    rows = build(up, zh, EDITORIAL)
    st = stats(rows)
    write_json(rows, st, up, HERE / "cases.json")
    write_readme(rows, st, HERE / "README.md")
    write_html(rows, st, HERE / "index.html")
    print(f"built {st['total']} cases · need_decision={st['need_decision']} · by_sub={st['by_sub']}")
