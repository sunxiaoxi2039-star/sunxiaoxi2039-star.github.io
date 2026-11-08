# 个人博客

`/blog/` 是手写的长文栏目，**不经过**雷达的发布管线（`publish/manifest.json` → `sync.py`），样式也独立（`blog/blog.css`），雷达改版不会影响它。

## 写作流程

先自己写初稿 → 对照网上的深度文章查证、补充 → 交独立评审打分（≥85 发布）→ 发布。

## 文件

| 路径 | 作用 |
|---|---|
| `src/<slug>.md` | 文章源稿（极简 markdown：一行一段；`### 规则一｜…` 生成目录；`旧规则：`/`新规则：` 生成对照框；`[^key]` 生成引用角标） |
| `src/<slug>.meta.json` | 标题、日期、标签、评分、参考资料（`refs`）、博客首页文章列表（`posts`） |
| `src/<slug>.og.html` | 分享图模板（1200×630，用 Playwright 截图成 `<slug>/og.jpg`） |
| `build.py` | 生成 `<slug>/index.html`、`index.html`（博客首页）、`feed.xml` |

## 重新生成

```bash
python3 blog/build.py blog/src/agentic-commerce.md . blog/src/agentic-commerce.meta.json
```

在仓库根目录运行。新增文章时，把新文章加到 meta 的 `posts` 列表最前面。

## 注意

首页 `index.html` 顶栏的「个人博客 ›」入口和新文章横幅是手动加的。雷达生成器（`publish_pages.py`）下次发布会覆盖首页，需要在生成器模板里同步加上，否则入口会消失（`/blog/` 本身不受影响）。
