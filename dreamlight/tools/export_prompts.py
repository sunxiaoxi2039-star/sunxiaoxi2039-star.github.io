"""Write prompts/PROMPTS.md (copy-paste into ChatGPT) and prompts/shots.jsonl."""
import json
from load_data import ROOT, load, full_prompt, refs_in

data = load()
out = ROOT / "prompts"
out.mkdir(exist_ok=True)
md = [f"# 《{data['title']}》GPT 生图提示词", "",
      "用法：在 ChatGPT（GPT 图像模型）里先依次生成下方「角色设定图」，并在同一对话中把设定图作为参考，",
      "再逐镜生成。画幅一律选 **横版 3:2 (1536×1024)**。生成后按镜头编号保存到 `assets/ep{N}/{镜头ID}.png`，",
      "然后运行 `python3 tools/build_manifest.py`，播放器会自动用 GPT 画面替换程序绘制画面。", "",
      "## 统一画风（每条提示词已自动带上）", "", f"> {data['style']}", "", "## 角色设定图（先生成，保持角色一致）", ""]
for k, v in data["characters"].items():
    md += [f"### {k}", "", "```", f"Character design sheet, front view, side view and three expressions, plain warm paper background. {data['style']}. {v}.", "```", ""]
lines = []
for ep in data["episodes"]:
    md += [f"## 第{ep['n']}集 · {ep['title']}（{ep['theme']}）", "", ep["summary"], ""]
    for s in ep["shots"]:
        p = full_prompt(data, s)
        refs = refs_in(s["prompt"])
        lines.append(json.dumps({"id": s["id"], "episode": ep["n"], "refs": refs, "prompt": p}, ensure_ascii=False))
        line = f"{s.get('who', '')}：{s['line']}" if s.get("line") else f"标题卡：{s.get('title', '')} {s.get('subtitle', '')}"
        md += [f"**{s['id']}** · {s['dur']}s · {line}", ""]
        if refs:
            md += [f"参考设定图：{', '.join(refs)}", ""]
        md += ["```", p, "```", ""]
(out / "PROMPTS.md").write_text("\n".join(md), encoding="utf-8")
(out / "shots.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"wrote {len(lines)} shot prompts")
