#!/usr/bin/env python3
"""Assemble halo/index.html from teardowns/halo-above-the-clouds.html.

Run from the repo root:  python3 halo/build.py
The teardown fragment is the single source of text; this script only wraps it in the
day-page layout (same classes as d/YYYY-MM-DD/index.html) so the two never drift apart.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRAG = (ROOT / "teardowns" / "halo-above-the-clouds.html").read_text(encoding="utf-8").strip()

TITLE = "Halo Above the Clouds · 设计雷达 拆解"
DESC = ("云海之上的环形餐厅：真实瑞士高程 + 光线步进体积云 + 11.7 万盏村镇灯，Three.js r187 "
        "全自写着色器，还用无头 Chrome 渲了一部 45 秒短片；据作者称由 Claude Code（Opus 5.5）从 11 张 AI 参考图搭出。")
URL = "https://sunxiaoxi2039-star.github.io/halo/"
OG = "https://sunxiaoxi2039-star.github.io/halo/og.jpg"
REPO = "https://github.com/Leonxlnx/halo-above-the-clouds"
FILM = REPO + "/releases/download/v1.0/halo_film_1080p30.mp4"

PLAIN = """<section class="dp-plain"><div class="dp-h2">大白话拆解</div><p><b>它是什么：</b>一座架在两座雪山尖之间、悬在云海上的环形餐厅，脚下是真实的布里恩茨湖和伯尔尼阿尔卑斯：一个能自由飞的 Three.js 实时场景，外加一部从同一场景逐帧渲出来的 45 秒无人机短片。</p><p><b>好在哪：</b>它把「AI 概念图」真的落成了一个可以飞进去的 3D 世界——云是着色器一步步走出来的、灯是 11.7 万个点、餐厅里连桌布吊灯和食客都在；而且整条管线（烘数据、渲染、后期、剪辑）全部开源，一个外部库都没用。</p><p><b>怎么做到的：</b></p><ol><li>先在作者电脑上把真实高程、村镇灯光、云的 3D 噪声、HDRI 天空「烘」成 0.3 GB 的数据包，浏览器只负责画。</li><li>渲染是 Three.js r187 + WebGL2，全部自写 GLSL：对数深度装下 0.2 米到 240 公里，体积云按半分辨率光线步进再合成，自家 HDR 后期做泛光和胶片曲线。</li><li>短片用 puppeteer 驱动无头 Chrome 逐帧渲染，每帧叠 8 个子帧得到抗锯齿和运动模糊，剪辑点卡在配乐拍子上；没有用 React、GSAP、模型文件或任何后期库。</li></ol></section>"""

GALLERY = """<div class="halo-gal">
      <figure><img src="ring.webp" alt="环形餐厅近景：玻璃餐厅与内露台" loading="lazy" decoding="async" width="1280" height="720" /><figcaption>环与内露台（作者渲染图）</figcaption></figure>
      <figure><img src="glow.webp" alt="蓝调时刻，环的 LED 与远处暮光" loading="lazy" decoding="async" width="1280" height="720" /><figcaption>蓝调时刻的暮光（作者渲染图）</figcaption></figure>
      <figure><img src="wide.webp" alt="短片结尾的大远景：环、云海与山谷" loading="lazy" decoding="async" width="1280" height="720" /><figcaption>短片结尾的大远景（作者渲染图）</figcaption></figure>
    </div>"""

HTML = f"""<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0c0c0e" />
  <title>{TITLE}</title>
  <meta name="description" content="{DESC}" />
  <link rel="canonical" href="{URL}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="设计雷达" />
  <meta property="og:locale" content="zh_CN" />
  <meta property="og:title" content="{TITLE}" />
  <meta property="og:description" content="{DESC}" />
  <meta property="og:url" content="{URL}" />
  <meta property="og:image" content="{OG}" />
  <meta property="og:image:secure_url" content="{OG}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="675" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{TITLE}" />
  <meta name="twitter:description" content="{DESC}" />
  <meta name="twitter:image" content="{OG}" />
  <meta itemprop="name" content="{TITLE}" />
  <meta itemprop="description" content="{DESC}" />
  <meta itemprop="image" content="{OG}" />
  <link rel="stylesheet" href="../styles.css" />
  <style>
    .halo-btns {{ display: flex; flex-wrap: wrap; gap: 8px; }}
    .halo-btns .btn-open {{ margin: 4px 0 8px; }}
    .halo-gal {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 18px 0 6px; }}
    .halo-gal figure {{ margin: 0; }}
    .halo-gal img {{ display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 12px; background: #111; border: 1px solid var(--line); }}
    .halo-gal figcaption {{ font-size: 12px; color: var(--muted); margin-top: 6px; }}
    .halo-credit {{ font-size: 12px; color: var(--muted); line-height: 1.6; margin: 14px 0 0; }}
  </style>
</head>
<body class="dp-body">
  <header class="dp-top">
    <a class="dp-home" href="../"><span>✦</span>设计雷达</a>
    <div class="dp-top-r"><a class="dp-maplink" href="../map/">知识地图</a><button type="button" class="dp-share-mini" data-share>分享</button></div>
  </header>
  <main class="dp">
    <div class="dp-kicker">专题拆解 · 开源 Three.js 场景</div>
    <h1 class="dp-title">Halo Above the Clouds</h1>
    <p class="dp-lede">云海之上的环形餐厅：真实瑞士高程、光线步进体积云、11.7 万盏村镇灯，Three.js r187 全自写着色器；同一场景还用无头 Chrome 逐帧渲出一部 45 秒无人机短片。据作者称由 Claude Code（Opus 5.5）从 11 张 AI 参考图搭出。</p>
    <a class="dp-hero-link" href="{REPO}" target="_blank" rel="noopener">
      <img class="dp-hero" src="hero.webp" alt="Halo Above the Clouds：两座雪山尖之间的环形餐厅，脚下是云海" width="1280" height="720" />
    </a>
    <div class="halo-btns">
      <a class="btn-open" href="{REPO}" target="_blank" rel="noopener">GitHub 源码 ↗</a>
      <a class="btn-open" href="{FILM}" target="_blank" rel="noopener">看 45 秒短片（MP4）↗</a>
    </div>
    {PLAIN}
    {GALLERY}
    <details class="dp-full"><summary>完整技术拆解</summary><div class="teardown">{FRAG}</div></details>
    <p class="halo-credit">图片来自作者仓库 docs/（MIT）。高程：AWS Terrain Tiles（Mapzen / Tilezen，含 EU-DEM 等）；纹理与天空 HDRI：Poly Haven（CC0）；短片配乐：Scott Buckley「Uprising」（CC BY 4.0）。</p>
    <button type="button" class="dp-share" data-share>复制链接 / 分享</button>
    <nav class="dp-nav"><a href="../">‹ 回首页</a><a href="../d/2026-10-05/">Procedural Tokyo 拆解</a><span>›</span></nav>
    <p class="dp-foot">设计雷达 · 每天 8 个值得看的网站、App UI 和网页小游戏</p>
  </main>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
(function(){{
  var canon=document.querySelector('link[rel=canonical]').href;
  var toastEl=document.getElementById('toast');
  function toast(m){{toastEl.textContent=m;toastEl.classList.add('show');setTimeout(function(){{toastEl.classList.remove('show')}},1800);}}
  function legacyCopy(){{var t=document.createElement('textarea');t.value=canon;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();var ok=false;try{{ok=document.execCommand('copy');}}catch(e){{}}document.body.removeChild(t);toast(ok?'链接已复制':'复制失败，请手动复制地址栏');}}
  function copy(){{if(navigator.clipboard&&navigator.clipboard.writeText){{navigator.clipboard.writeText(canon).then(function(){{toast('链接已复制');}},legacyCopy);}}else legacyCopy();}}
  function share(){{
    var data={{title:document.title,text:document.querySelector('meta[name=description]').content,url:canon}};
    if(navigator.share){{navigator.share(data).catch(function(e){{if(e&&e.name!=='AbortError')copy();}});return;}}
    copy();
  }}
  document.querySelectorAll('[data-share]').forEach(function(b){{b.addEventListener('click',share);}});
}})();
</script>
</body>
</html>
"""

(ROOT / "halo" / "index.html").write_text(HTML, encoding="utf-8")
print("wrote halo/index.html", len(HTML), "bytes")
