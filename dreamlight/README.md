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

没有 GPT 画面的镜头由代码“手绘”，所以项目随时都能完整播放；生成一张 GPT 画面就替换一张。

## 代码手绘是怎么做的

| 文件 | 负责 |
|---|---|
| `paint.js` | 水粉纸纹与笔触纹理、积云（球体并集高度场 → 模糊法线 → 赛璐璐分层上色）、树冠叶团、草地、砖墙、窗户/防盗窗/空调外机、电线杆、湿地面倒影 |
| `chars.js` | 小芽、妈妈、外婆、司机、絮絮、灰先生、铁犀牛：细棕色描线 + 两层赛璐璐阴影，按 5 岁孩子的头身比例绘制 |
| `scenes.js` | 19 个场景（雨天街道、会呼吸的老楼、屋顶菜园、雾中城市、拆迁工地、黄昏飞行……），每个场景分远/中/近三层，静态层只画一次并缓存 |
| `engine.js` | 多层视差镜头、角色按场景光线染色、雨/雾/蒲公英种子/萤火虫等粒子、柔光 + 纸纹 + 暗角的“胶片”收尾、标题与字幕、八音盒配乐 |

镜头运动、粒子、灰度、字幕和配乐始终由代码生成。
