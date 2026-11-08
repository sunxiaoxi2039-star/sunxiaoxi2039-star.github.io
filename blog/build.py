#!/usr/bin/env python3
"""Build the agentic-commerce blog post + blog index + Atom feed from a markdown source.

Markdown conventions (tiny dialect, one paragraph per line):
  # Title / *subtitle* / ## h2 / ### h3 / - ul / 1. ol / --- hr
  旧规则：... followed by 新规则：...  -> rule comparison block
  [^key] -> numbered citation linking to REFS[key]
  ## 一句话回答 -> answer callout ; ## 写作手记... -> notes box ; ## 参考资料 -> refs list
"""
import html, json, re, sys
from pathlib import Path

SRC = Path(sys.argv[1])
SITE = Path(sys.argv[2])
META = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))
REFS = {r["key"]: r for r in META["refs"]}
BASE = "https://sunxiaoxi2039-star.github.io"
SLUG = META["slug"]
URL = f"{BASE}/blog/{SLUG}/"

cite_order = []


def inline(s):
    s = html.escape(s, quote=False)

    def cite(m):
        k = m.group(1)
        if k not in REFS:
            sys.exit(f"unknown ref {k}")
        if k not in cite_order:
            cite_order.append(k)
        n = cite_order.index(k) + 1
        return f'<sup class="cite"><a href="#ref-{k}" aria-label="参考资料 {n}">[{n}]</a></sup>'

    s = re.sub(r"\[\^([a-z0-9_-]+)\]", cite, s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![*\w])\*([^*\n]+?)\*(?!\*)", r"<em>\1</em>", s)
    return s


lines = SRC.read_text(encoding="utf-8").splitlines()
title = lines[0].lstrip("# ").strip()
lede = ""
i = 1
while i < len(lines) and not lines[i].strip():
    i += 1
if lines[i].startswith("*") and lines[i].endswith("*"):
    lede = lines[i].strip("*").strip()
    i += 1

out, toc = [], []
section = None  # 'answer' | 'notes' | 'refs' | None
list_tag = None
rule_open = False


def close_list():
    global list_tag
    if list_tag:
        out.append(f"</{list_tag}>")
        list_tag = None


def close_rule():
    global rule_open
    if rule_open:
        out.append("</div>")
        rule_open = False


def close_section():
    global section
    close_list(); close_rule()
    if section in ("answer", "notes"):
        out.append("</section>")
    section = None


RULE_RE = re.compile(r"^规则([一二三四五六七八九十])｜(.+)$")
CN = "一二三四五六七八九十"

for raw in lines[i:]:
    line = raw.rstrip()
    if not line.strip():
        close_list()
        continue
    if line.startswith("## "):
        close_section()
        h = line[3:].strip()
        if h in ("一句话回答", "先说结论"):
            section = "answer"
            out.append(f'<section class="bl-answer" id="answer"><h2>{h}</h2>')
        elif h.startswith("写作手记"):
            section = "notes"
            out.append(f'<section class="bl-notes" id="notes"><h2>{inline(h)}</h2>')
            if META.get("score"):
                sc = META["score"]
                out.append(f'<div class="bl-score"><b>{sc["total"]}</b><span>/ 100 · {html.escape(sc["label"])}</span></div>')
        elif h == "参考资料":
            section = "refs"
            out.append('<h2 id="refs">参考资料</h2>')
            out.append("@@REFS@@")
        else:
            hid = META.get("anchors", {}).get(h, "")
            out.append(f'<h2{f" id={chr(34)}{hid}{chr(34)}" if hid else ""}>{inline(h)}</h2>')
        continue
    if section == "refs":
        continue
    if line.startswith("### "):
        close_list(); close_rule()
        h = line[4:].strip()
        m = RULE_RE.match(h)
        if m:
            n = CN.index(m.group(1)) + 1
            rid = f"rule-{n}"
            toc.append((rid, m.group(2)))
            out.append(f'<h3 id="{rid}"><span class="no">规则{m.group(1)}</span>{inline(m.group(2))}</h3>')
        else:
            out.append(f"<h3>{inline(h)}</h3>")
        continue
    if line.strip() == "---":
        close_list(); close_rule()
        out.append("<hr />")
        continue
    if line.startswith("旧规则：") or line.startswith("新规则："):
        close_list()
        kind = "old" if line.startswith("旧") else "new"
        if not rule_open:
            out.append('<div class="bl-rule">')
            rule_open = True
        out.append(f'<p class="{kind}"><span class="k">{line[:3]}</span>{inline(line[4:])}</p>')
        if kind == "new":
            close_rule()
        continue
    m = re.match(r"^(-|\d+\.)\s+(.*)$", line)
    if m:
        close_rule()
        tag = "ul" if m.group(1) == "-" else "ol"
        if list_tag != tag:
            close_list()
            out.append(f"<{tag}>")
            list_tag = tag
        out.append(f"<li>{inline(m.group(2))}</li>")
        continue
    close_list(); close_rule()
    out.append(f"<p>{inline(line)}</p>")
close_section()

# refs: cited ones first in citation order, then any uncited extras
ordered = cite_order + [k for k in REFS if k not in cite_order]
ref_html = ['<ol class="bl-refs">']
for k in ordered:
    r = REFS[k]
    ref_html.append(
        f'<li id="ref-{k}">{html.escape(r["who"])}：<a href="{html.escape(r["url"])}" target="_blank" rel="noopener">'
        f'{html.escape(r["title"])}</a>{("（" + html.escape(r["note"]) + "）") if r.get("note") else ""}</li>'
    )
ref_html.append("</ol>")
body = "\n".join(out).replace("@@REFS@@", "\n".join(ref_html))

toc_html = ""
if toc:
    toc_html = '<nav class="bl-toc" aria-label="六条规则"><div class="bl-toc-t">六条新规则</div><ol>' + "".join(
        f'<li><a href="#{rid}">{inline(t)}</a></li>' for rid, t in toc) + "</ol></nav>"
body = body.replace("<!--TOC-->", toc_html)
if "<!--TOC-->" not in "\n".join(out) and toc_html:
    # put TOC right after the answer callout
    body = body.replace("</section>", "</section>\n" + toc_html, 1)

plain = html.unescape(re.sub(r"<[^>]+>", "", "\n".join(out).split("@@REFS@@")[0]))
plain = re.sub(r"\[\d+\]", "", plain)
plain_len = len(re.findall(r"[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]", plain)) + len(re.findall(r"[A-Za-z0-9]+", plain))
read_min = max(1, round(plain_len / 500))
esc = lambda s: html.escape(s, quote=True)
desc = META["description"]
og = f"{BASE}/blog/{SLUG}/og.jpg"
ld = {
    "@context": "https://schema.org", "@type": "BlogPosting", "headline": title, "description": desc,
    "datePublished": META["date"], "dateModified": META["date"], "inLanguage": "zh-Hans",
    "mainEntityOfPage": URL, "image": og, "author": {"@type": "Person", "name": META["author"]},
}

page = f"""<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0c0c0e" />
  <title>{esc(title)} · 个人博客</title>
  <meta name="description" content="{esc(desc)}" />
  <link rel="canonical" href="{URL}" />
  <link rel="alternate" type="application/atom+xml" title="个人博客" href="{BASE}/blog/feed.xml" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="设计雷达 · 个人博客" />
  <meta property="og:locale" content="zh_CN" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(desc)}" />
  <meta property="og:url" content="{URL}" />
  <meta property="og:image" content="{og}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="article:published_time" content="{META['date']}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{esc(title)}" />
  <meta name="twitter:description" content="{esc(desc)}" />
  <meta name="twitter:image" content="{og}" />
  <link rel="stylesheet" href="../blog.css?v={META['version']}" />
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body>
  <header class="bl-top">
    <a class="bl-home" href="../../"><span>✦</span>设计雷达</a>
    <a class="bl-crumb" href="../">个人博客 ›</a>
  </header>
  <main class="bl">
    <article>
      <div class="bl-kicker">个人博客 · {META['date']}</div>
      <h1 class="bl-title">{esc(title)}</h1>
      <p class="bl-lede">{inline(lede)}</p>
      <div class="bl-meta"><span>{esc(META['author'])}</span><span>约 {plain_len:,} 字 · 读完约 {read_min} 分钟</span><span>{esc(' · '.join(META['tags']))}</span></div>
      <div class="bl-prose">
{body}
      </div>
    </article>
    <a class="bl-back" href="../">‹ 返回个人博客</a>
  </main>
  <footer class="bl-foot">个人博客 · 观点仅代表作者本人 · 事实以文末参考资料为准</footer>
</body>
</html>
"""
outdir = SITE / "blog" / SLUG
outdir.mkdir(parents=True, exist_ok=True)
(outdir / "index.html").write_text(page, encoding="utf-8")

# blog index
posts = META["posts"]
cards = "\n".join(
    f"""      <a class="bl-post" href="{p['slug']}/">
        <div class="bl-post-date">{p['date']}</div>
        <div class="bl-post-title">{esc(p['title'])}</div>
        <div class="bl-post-desc">{esc(p['desc'])}</div>
        <div class="bl-tags">{''.join(f'<span>{esc(t)}</span>' for t in p['tags'])}</div>
      </a>""" for p in posts)
index = f"""<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0c0c0e" />
  <title>个人博客 · 设计雷达</title>
  <meta name="description" content="{esc(META['blog_desc'])}" />
  <link rel="canonical" href="{BASE}/blog/" />
  <link rel="alternate" type="application/atom+xml" title="个人博客" href="{BASE}/blog/feed.xml" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="设计雷达 · 个人博客" />
  <meta property="og:title" content="个人博客 · 设计雷达" />
  <meta property="og:description" content="{esc(META['blog_desc'])}" />
  <meta property="og:url" content="{BASE}/blog/" />
  <meta property="og:image" content="{BASE}/blog/{posts[0]['slug']}/og.jpg" />
  <link rel="stylesheet" href="blog.css?v={META['version']}" />
</head>
<body>
  <header class="bl-top">
    <a class="bl-home" href="../"><span>✦</span>设计雷达</a>
    <span class="bl-crumb" aria-current="page">个人博客</span>
  </header>
  <main class="bl">
    <div class="bl-kicker">个人博客</div>
    <h1 class="bl-title">慢一点的长文</h1>
    <p class="bl-lede">{esc(META['blog_desc'])}</p>
    <div class="bl-list">
{cards}
    </div>
    <a class="bl-rss" href="feed.xml">订阅 Atom feed ›</a>
  </main>
  <footer class="bl-foot">个人博客 · 观点仅代表作者本人</footer>
</body>
</html>
"""
(SITE / "blog" / "index.html").write_text(index, encoding="utf-8")

# Atom feed
entries = "\n".join(
    f"""  <entry>
    <title>{html.escape(p['title'])}</title>
    <link href="{BASE}/blog/{p['slug']}/" />
    <id>{BASE}/blog/{p['slug']}/</id>
    <updated>{p['date']}T08:00:00Z</updated>
    <summary>{html.escape(p['desc'])}</summary>
  </entry>""" for p in posts)
feed = f"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-Hans">
  <title>个人博客 · 设计雷达</title>
  <subtitle>{html.escape(META['blog_desc'])}</subtitle>
  <link href="{BASE}/blog/" />
  <link rel="self" href="{BASE}/blog/feed.xml" />
  <id>{BASE}/blog/</id>
  <updated>{posts[0]['date']}T08:00:00Z</updated>
  <author><name>{html.escape(META['author'])}</name></author>
{entries}
</feed>
"""
(SITE / "blog" / "feed.xml").write_text(feed, encoding="utf-8")
print(f"built {outdir/'index.html'}  chars={plain_len} read={read_min}min cites={len(cite_order)} refs={len(REFS)}")
