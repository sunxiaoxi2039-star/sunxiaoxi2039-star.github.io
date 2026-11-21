# 一个 HTML，十个镜头

重做 Gemini 4 Neon 用例 #28（[@agenticjay：单个 27 KB HTML 里的十种交互 3D 效果](https://x.com/agenticjay/status/2123172043533508664)）。原帖打不开，所以十个镜头都是重新写的，没有照搬任何现成的着色器。

| 文件 | 作用 |
|---|---|
| `index.html` | 视频页 |
| `shots.mp4` | 成片：33.75 秒，1920×1080，30 fps，128 BPM 卡点，带配乐 |
| `live.html` | 整支片子本体：一个 32 KB 的 HTML（gzip 后 13 KB），十个全屏 GLSL 着色器加辉光后期，无库、无素材；在浏览器里实时播放 |
| `soundtrack.m4a` | 配乐，实时版点「从头播放」时用它当时钟 |
| `capture.js` | 逐帧渲染：Playwright 打开 `live.html?capture`，把每帧喂给 ffmpeg |
| `music.py` | 配乐合成（numpy + scipy）：底鼓、拍手、踩镲、贝斯、琶音、铺底，每次切镜都有冲击音，超新星前留出空拍蓄力 |

## 剪辑结构（128 BPM，一拍 0.469 秒）

| 镜头 | 拍数 | 起点 |
|---|---|---|
| 01 黑洞（片头叠标题） | 8 | 0.00 秒 |
| 02 星系 → 09 超空间 | 各 6 | 3.75 秒起，每 2.81 秒切一次 |
| 10 超新星（第 4 拍爆炸） | 8 | 26.25 秒 |
| 片尾 | 8 | 30.00 秒 |

## 重新渲染

```bash
npm install playwright
python3 music.py music.wav
node capture.js video video_only.mp4
ffmpeg -i video_only.mp4 -i music.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest shots.mp4
```

4 核 CPU（SwiftShader 软件渲染）上，每帧 0.2 到 5 秒不等：黑洞和极光最慢，超空间最快。
