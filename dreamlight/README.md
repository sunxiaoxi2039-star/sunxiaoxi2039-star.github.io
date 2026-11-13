# 小芽与风的种子 · Dreamlight

五集动画短片：一个五岁女孩视角的梦幻世界，与现实融合、对抗、领悟。
手绘水彩风格的日式动画美术，原创角色与故事，**只用 GPT 生图 + 代码**完成。

- 在线观看：`/dreamlight/`（GitHub Pages）
- 剧本与世界观：[story/BIBLE.md](story/BIBLE.md)
- 48 个镜头的 GPT 生图提示词：[prompts/PROMPTS.md](prompts/PROMPTS.md)

## 怎么用

```bash
# 本地预览
python3 -m http.server 8000      # 打开 http://localhost:8000/dreamlight/

# 改了 episodes.js 之后，重新导出提示词
python3 tools/export_prompts.py

# 方式 A：在 ChatGPT 里手动生图，按镜头 ID 存到 assets/ep{N}/{id}.png，然后
python3 tools/build_manifest.py

# 方式 B：用 API 批量生图（密钥只放在环境变量里，不要提交）
export OPENAI_API_KEY=...
python3 tools/generate_images.py --sheets   # 先生成 9 张角色设定图
python3 tools/generate_images.py            # 再生成全部镜头（自动带上设定图作参考）

# 导出 MP4（1280×720 / 24fps / 带配乐），需要 Playwright + ffmpeg
node tools/render.cjs          # 全部五集 -> out/
node tools/render.cjs 3        # 只导第三集
```

没有 GPT 画面的镜头会由 `engine.js` 实时程序绘制，所以项目随时都能完整播放；
生成一张就替换一张。镜头运动、粒子、灰度、字幕和八音盒配乐始终由代码生成。
