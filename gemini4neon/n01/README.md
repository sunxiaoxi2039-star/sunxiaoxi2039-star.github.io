# N-01 霓 · 机甲组装与升空

重做 Gemini 4 Neon 用例 #103（[@alohaproxy 的 Three.js 机甲组装升空](https://x.com/alohaproxy/status/2123619339995668726)）。原帖视频在制作环境里打不开，所以机甲造型、镜头和配乐都是重新设计的。

| 文件 | 作用 |
|---|---|
| `index.html` | 视频页 |
| `n01.mp4` | 成片：26 秒，1920×1080，30 fps，带配乐 |
| `live.html` + `main.js` + `timeline.json` | 实时版：浏览器里用 Three.js 渲染，three@0.170.0 走 jsDelivr |
| `soundtrack.m4a` | 配乐，实时版点「从头播放」时用它当时钟 |
| `capture.js` | 逐帧渲染：Playwright 打开 `live.html?capture`，把每帧喂给 ffmpeg |
| `sound.py` | 配乐合成（numpy + scipy），和画面共用 `timeline.json` |

## 怎么做的

- **确定性**：`renderAt(t)` 是时间的纯函数，粒子、火花、烟都由带种子的随机数和解析公式算出，所以能逐帧离线渲染，也能在浏览器里实时跑。
- **机甲**：圆角盒、锥化盒、圆柱拼出来的层级骨架（髋、膝、踝关节可弯曲），14 个部件各有飞入方向、旋转和锁定时刻；灯带是 HDR 自发光材质，交给 Bloom 出辉光。
- **画面**：程序化霓虹网格地面、发光停机坪、立柱灯带、顶棚舱门、天光束；夜景城市是 1100 个实例化楼块配程序生成的窗户贴图；后期为 UnrealBloom、色差、暗角、颗粒和闪白。
- **配乐**：合成器铺底随剧情换和弦；每个部件对接时有伺服声和金属撞击；还有蓄能上升音、冲击波低频、倒计时、升空轰鸣和片尾重低音。

## 重新渲染

```bash
npm install three@0.170.0 playwright   # 本地渲染时 capture.js 会优先用 node_modules 里的 three
python3 sound.py soundtrack.wav
node capture.js video video_only.mp4
ffmpeg -i video_only.mp4 -i soundtrack.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest n01.mp4
```

在 4 核 CPU（SwiftShader 软件渲染）上每帧约 2 秒，780 帧约 28 分钟。
