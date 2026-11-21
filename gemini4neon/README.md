# Gemini 4 Neon 用例 · 整理归位

> 收集日期 2026-11-20。数据来自 [cheercheung/awesome-gemini-4-neon-use-cases](https://github.com/cheercheung/awesome-gemini-4-neon-use-cases)（CC BY 4.0），该清单从 X、Hacker News 和 Google 官方渠道收了 **105 条**，每条带原帖链接。本页的中文摘要、子类和成本表是重新写的；X、blog.google 和媒体图床在本会话里都连不上，所以没有逐条打开原帖核对。

> 注意：清单里有 Google、Google AI、Antigravity 官方账号的帖子，看上去模型已正式发布；但各条成绩、成本和效果都是作者或榜单方自己说的，没有独立复核。

> 我们自己重做了一条：[#103 机甲组装与升空 → `n01/`](n01/)（原创机甲，纯代码 Three.js，26 秒带配乐）。

## 三句话看完

- **做什么最多**：31 条 3D 场景、14 条动态图形——Three.js / 体素 / SVG 的同题对比是主力，经典题还是「鹈鹕骑自行车」。
- **成本**：双方都报了金额的 8 组同题对比里，Neon 有 7 组更贵（对 GPT-6.2 Sol 3 组、Astra 2 组、Fable 5.2 和 Hydrogen 各 1 组），只有对 Opus 5.5 那组（#30）便宜一半；另有 #23 作者说 Neon 更快更便宜但没给数字。全是单次自报，档位和提示不一定对齐，只能当线索。
- **榜单**：榜单方自己发的成绩里，Neon 大多在前列：Vending-Bench 2、Tuesday@Work、Penalty Bench、Models Engineering Index 第一，Vals Index 和 Agent Arena 第二，Text Arena 第三，Wojak-Bench 第四；Browser Use 74% 低于 Sol 的 82%。短板集中在速度和成本：CUDA 调试题耗时近 4 倍（#90），Plotly 43 题全对但花费是 Hydrogen 的约 2.7 倍（#95），RuneScape 没在时限内跑完（#87）。

## 整理方法（照 Fable 5.5 归档那套）

1. **统一格式**：每条留回链（原帖）、对象（作者）、类型（雷达大类 + 子类）、一句话摘要、来源索引；另加证据类型、出处、作者自报成本。机器可读版在 `cases.json`。
2. **规则归位**：上游 5 个大类拆成 8 个子类；视觉类归雷达的 `动效`，游戏归 `小游戏`，工程、知识工作、榜单不是设计作品，单独记为 `资料`。
3. **去重**：上游已按帖子 ID 去重；同一作者的系列（如 @SamuelAlbanie 的 9 条一句提示演示）按上游拆成单条。
4. **数据沉淀**：上游英文标题、观察、备注、媒体链接都留在 JSON 的 `upstream` 和 `poster` / `video` 字段里，换规则或做日报时可以直接用。
5. **只把需要拍板的推上来**：真人肖像、他人 IP、归属不清的，列在文末「需要你拍板」，每条附票拟。
6. **可重跑**：`build.py` 读上游 JSON 加 `editorial.json`（人工编辑层）生成三件产物；上游加了新条目也能直接重跑，新条目会自动进「需要你拍板」。

## 一眼看全

| 子类 | 雷达大类 | 条数 |
|---|---|---|
| 3D 场景 | 动效 | 31 |
| 动态图形 | 动效 | 14 |
| 绘图与插画 | 动效 | 8 |
| 科普可视化 | 动效 | 10 |
| 游戏互动 | 小游戏 | 12 |
| 知识工作 | 资料 | 4 |
| 工程集成 | 资料 | 4 |
| 评测榜单 | 资料 | 22 |
| **合计** | | **105** |

证据类型：演示 59、测评 23、榜单 16、集成 4、局限 3。出处：作者自述 67、官方演示 18、榜单方发布 17、工具方 3。同题对比 37 条，带作者自报成本/耗时 24 条，公开提示词 2 条。

高产作者：@SamuelAlbanie（9）、@IndependentEco（4）、@Google（3）、@HarshithLucky3（3）、@thtbee_（3）、@chetaslua（3）、@AdamHoltererer（3）、@notjazii（3）

## 先看这 10 条

没有观看数，按我的判断挑：技术密度高、过程交代得清楚、能看出模型实际做了什么。

- **#60** · [Google Antigravity 官方：一句提示让 Swarm 做出双人合成波 3D 迷你高尔夫，8 个 agent 并行，自带验证器逐关检查](https://x.com/antigravity/status/2123176067380711725) — @antigravity · 游戏互动 · 官方演示
- **#69** · [Google 官方：WebGL2 第一人称自由滑雪模拟器，勃朗峰和霞慕尼地形、6 条滑线、120 Hz 物理、雪痕和空间音频](https://www.youtube.com/watch?v=xhG-jNObuz4) — @Google · 游戏互动 · 官方演示
- **#77** · [Google 官方：Neon swarm 用一张参考图做出 10 万格的 Sheets 计算机视觉实验室，50 万+ 公式，边缘检测、深度图、重打光等 6 种模式](https://www.youtube.com/watch?v=vPsBbuz9IbE) — @Google · 知识工作 · 官方演示
- **#57** · [Google 官方：Antigravity Swarm 按档案照片重建图灵 1936 年的书房，桌上有台能跑的通用图灵机](https://x.com/GoogleAI/status/2123168242797809944) — @GoogleAI · 科普可视化 · 官方演示
- **#24** · [一张参考图做出 Three.js WebGPU 四足机器人，带四腿 IK 和走、小跑、飞奔三种步态](https://x.com/thebuggeddev/status/2123170821250400282) — @thebuggeddev · 3D 场景
- **#65** · [把一个 C++20 + WebGPU 高斯泼溅引擎改成四座塔的面包房平台跳跃游戏，演示视频也是模型录的](https://x.com/GlitterPixely/status/2123235794747891968) — @GlitterPixely · 游戏互动
- **#28** · [一个 27 KB 的 HTML 里塞进十种交互 3D 效果：着色器、水面、光照](https://x.com/agenticjay/status/2123172043533508664) — @agenticjay · 3D 场景 · 官方演示
- **#34** · [安提基特拉机械：出土残件、复原齿轮、表盘三种视图切换](https://x.com/SamuelAlbanie/status/2123174406419828813) — @SamuelAlbanie · 科普可视化 · 官方演示
- **#25** · [不用任何库的原生 JS，12 fps 油画质感 3D 动画演绎济慈《秋颂》](https://x.com/vamsibatchuk/status/2123170948568535488) — @GeokenAI · 动态图形 · 官方演示
- **#103** · [Three.js 机甲组装再升空的动画](https://x.com/alohaproxy/status/2123619339995668726) — @alohaproxy · 3D 场景

## 作者自报的耗时与成本

双方都报了金额的 8 组同题对比里，Neon 有 7 组更贵（对 GPT-6.2 Sol 3 组、Astra 2 组、Fable 5.2 和 Hydrogen 各 1 组），只有对 Opus 5.5 那组（#30）便宜一半；另有 #23 作者说 Neon 更快更便宜但没给数字。全是单次自报，档位和提示不一定对齐，只能当线索。

同题对比：

| # | 题目 | 作者 | 自报数字 |
|---|---|---|---|
| 12 | [体素花园同题对 GPT-6.2 Sol（都是 xhigh）：Neon 1.01 美元，Sol 0.19 美元](https://x.com/Angaisb_/status/2123161449681805531) | @Angaisb_ | Neon 1.01 美元 · Sol 0.19 美元 |
| 15 | [鹈鹕骑车四模型同题（Neon / Hydrogen / Astra / Sol），作者最喜欢 Neon 的样子](https://x.com/Super_Nius/status/2123162610254442796) | @Super_Nius | Neon 约 3 分钟 |
| 20 | [游戏手柄绘图同题对 GPT-6.2 Sol：画得差不多，Neon 用时是 Sol 的两倍多、花费是三倍](https://x.com/notjazii/status/2123166093422272839) | @notjazii | Neon 20 分钟 · 约 1.60 美元；Sol 9 分钟 · 约 0.53 美元 |
| 23 | [雨夜便利店同题对 Sol：画面作者更喜欢 Sol，但这次 Neon 更快更便宜](https://x.com/Super_Nius/status/2123169627815698522) | @Super_Nius | Neon 更快更便宜（未给数字） |
| 30 | [建筑插画同题对 Opus 5.5：Neon 便宜一半，但作者更喜欢 Opus 画的](https://x.com/notjazii/status/2123172429791129848) | @notjazii | Neon 约 20 分钟 · 3.50 美元；Opus 18 分钟 · 7.20 美元 |
| 42 | [体素版「幻影忍者」同题对 Fable 5.2：Neon 稍贵，作者更喜欢 Fable 的构图](https://x.com/thehypedotnews/status/2123182627674796462) | @thehypedotnews | Neon 12.93 美元；Fable 11.19 美元 |
| 46 | [「造一座巨大的闹鬼吸血鬼大教堂」同题对 Sol，作者认为难分高下](https://x.com/jan_volad/status/2123205954649100424) | @jan_volad | Neon 2.67 美元；Sol 1.69 美元 |
| 52 | [章鱼骑车动画对 Astra：效果接近，Neon 用了将近两倍时间（档位不同）](https://x.com/ZryMiller/status/2123228351984980040) | @ZryMiller | Neon high 41 分钟 · 4.02 美元；Astra xhigh 21 分 53 秒 · 2.52 美元 |
| 80 | [Agent Arena：Neon High 1336 分排第二（基于 4200 次社区 agent 会话）](https://x.com/arena/status/2123169189397709174) | @arena | 每任务中位成本 2.82 美元 |
| 83 | [Artificial Analysis 编码 agent 榜：Neon xhigh + Antigravity CLI 59 分，Carbon high 55 分](https://x.com/ArtificialAnlys/status/2123170648772288540) | @ArtificialAnlys | 每任务平均 6.86 美元 |
| 85 | [AA 智能指数：Neon xhigh 61、Carbon high 60，输出 token 多约 15%](https://x.com/ArtificialAnlys/status/2123170655424450840) | @ArtificialAnlys | 每任务约 21 分钟（Carbon high 约 36 分钟） |
| 90 | [同一道 CUDA 调试题的端到端耗时：Neon 是另两家的近 4 倍](https://x.com/elliotarledge/status/2123200759819124893) | @elliotarledge | Neon 约 76 秒；Astra、Opus 5.5 约 20 秒 |
| 95 | [Plotly 43 题数据分析：43 题全对；Hydrogen 也全对，花费只有 Neon 的四成不到](https://news.ycombinator.com/item?id=50553968) | @chriddyp | Neon 17.03 美元 · 每题中位 46 秒；Hydrogen 6.36 美元 · 32 秒 |
| 100 | [京都鸟居和竹林黎明漫游同题对 Astra：Neon 更贵也更慢](https://x.com/teddyaisi/status/2123627618146959641) | @teddyaisi | Neon 9.14 美元 · 1 小时 8 分 19 秒；Astra 6.67 美元 · 41 分 9 秒 |

单跑（无对照）：

| # | 题目 | 作者 | 自报数字 |
|---|---|---|---|
| 13 | [Three.js + GLSL 着色器场景](https://x.com/cfenghub/status/2123162154132242885) | @cfenghub | 2 分 40 秒 |
| 51 | [体素奇幻城堡，一句提示](https://x.com/Lentils80/status/2123226306351661099) | @Lentils80 | 27 分钟 |
| 53 | [Antigravity 里 Neon xhigh 做的 Three.js 蝴蝶动画](https://x.com/thtbee_/status/2123259795172212871) | @thtbee_ | 57 分钟 · 5 小时额度的 23% · 周额度 7% |
| 55 | [给参考图、迭代三轮的 Three.js 像素巫师世界](https://x.com/thtbee_/status/2123279727935033355) | @thtbee_ | 5 小时额度的 39% · 周额度 11% |
| 56 | [城堡渲染基准：一段视频加几张截图](https://x.com/nemumusitocha/status/2123287660525719823) | @nemumusitocha | 约周额度的 4% |
| 58 | [Flappy Bird 式横版闯关原型](https://x.com/notjazii/status/2123162053292458218) | @notjazii | 约 5 分钟 |
| 65 | [把一个 C++20 + WebGPU 高斯泼溅引擎改成四座塔的面包房平台跳跃游戏，演示视频也是模型录的](https://x.com/GlitterPixely/status/2123235794747891968) | @GlitterPixely | 3 条提示 · 约 60 分钟 swarm |
| 67 | [太空竞速原型（high 档）](https://x.com/badboyfoxy/status/2123251809183785076) | @badboyfoxy | 约 15 分钟 · 1.50 美元 |
| 68 | [塔防原型，作者说玩起来很顺](https://x.com/DeryaTR_/status/2123276863481254210) | @DeryaTR_ | 约 20 分钟 · 5 小时额度的 2% |
| 103 | [Three.js 机甲组装再升空的动画](https://x.com/alohaproxy/status/2123619339995668726) | @alohaproxy | 两轮共 8.3 万 token · 1.20 美元 · 10 分钟以上 |

## 3D 场景（31）

| # | 作品 | 作者 | 证据 | 出处 |
|---|---|---|---|---|
| 9 | [Three.js 版「鹈鹕骑自行车」动画](https://x.com/StatsWire/status/2123160089854898346) | @StatsWire | 演示 | 作者自述 |
| 12 | [体素花园同题对 GPT-6.2 Sol（都是 xhigh）：Neon 1.01 美元，Sol 0.19 美元](https://x.com/Angaisb_/status/2123161449681805531) | @Angaisb_ | 测评 · 对比 | 作者自述 |
| 13 | [Three.js + GLSL 着色器场景](https://x.com/cfenghub/status/2123162154132242885) | @cfenghub | 演示 | 作者自述 |
| 16 | [Three.js 骑车动画三模型同题：作者看 Neon 胜过 Opus 5.5、跟 Carbon 接近](https://x.com/AI_Screening/status/2123164032882659819) | @AI_Screening | 测评 · 对比 | 作者自述 |
| 17 | [海上航行的高桅帆船动画（Neon xhigh）](https://x.com/Mr_Salio/status/2123164576275370440) | @Mr_Salio | 演示 | 作者自述 |
| 18 | [Neon xhigh 生成的体素宝塔](https://x.com/LuminaBench/status/2123164858996908367) | @LuminaBench | 演示 | 作者自述 |
| 21 | [Neon xhigh 搭的 3D 水上飞机，作者说出得快、界面更干净](https://x.com/LuminaBench/status/2123166304664191391) | @LuminaBench | 演示 | 作者自述 |
| 23 | [雨夜便利店同题对 Sol：画面作者更喜欢 Sol，但这次 Neon 更快更便宜](https://x.com/Super_Nius/status/2123169627815698522) | @Super_Nius | 测评 · 对比 | 作者自述 |
| 24 | [一张参考图做出 Three.js WebGPU 四足机器人，带四腿 IK 和走、小跑、飞奔三种步态](https://x.com/thebuggeddev/status/2123170821250400282) | @thebuggeddev | 演示 | 作者自述 |
| 26 | [三角龙 3D 演示](https://x.com/LeslieNooteboom/status/2123171009167765651) | @LeslieNooteboom | 演示 | 官方演示 |
| 27 | [3D 齿轮传动四模型同题（Neon / Carbon / Astra / Sol），作者偏向 Neon](https://x.com/SPAC89/status/2123171830739632189) | @SPAC89 | 测评 · 对比 | 作者自述 |
| 28 | [一个 27 KB 的 HTML 里塞进十种交互 3D 效果：着色器、水面、光照](https://x.com/agenticjay/status/2123172043533508664) | @agenticjay | 演示 | 官方演示 |
| 29 | [Google 官方：Neon 借 Antigravity Swarm 驱动 Blender，搭出一张 Gemini 4 主题的实验台](https://x.com/Google/status/2123172290250621166) | @Google | 集成 | 官方演示 |
| 37 | [河谷里的多拱高架桥和火车，多机位加线框视图](https://x.com/SamuelAlbanie/status/2123174416154759418) | @SamuelAlbanie | 演示 | 官方演示 |
| 38 | [仿剑桥的 3D 城市，鸟瞰和近景](https://x.com/SamuelAlbanie/status/2123174419379962139) | @SamuelAlbanie | 演示 | 官方演示 |
| 39 | [Antigravity 里 Neon high 渲染的霓虹主题地球](https://x.com/HarshithLucky3/status/2123175900007309696) | @HarshithLucky3 | 演示 | 作者自述 |
| 40 | [让 Neon 迭代改进一个游艇场景](https://x.com/LyalinDotCom/status/2123176455123165366) | @LyalinDotCom | 演示 | 作者自述 |
| 41 | [在作者自己的 VFX 工具里用 Neon 做戏服材质（六张）](https://x.com/fofrAI/status/2123176812360745019) | @fofrAI | 演示 | 作者自述 |
| 42 | [体素版「幻影忍者」同题对 Fable 5.2：Neon 稍贵，作者更喜欢 Fable 的构图](https://x.com/thehypedotnews/status/2123182627674796462) ⚠️ | @thehypedotnews | 测评 · 对比 | 作者自述 |
| 44 | [纽约场景同题对 Opus：Neon 放进了布鲁克林大桥、自由女神和出租车街道，但跑起来作者电脑卡](https://x.com/aipulseda1ly/status/2123188460639117489) | @aipulseda1ly | 测评 · 对比 | 作者自述 |
| 46 | [「造一座巨大的闹鬼吸血鬼大教堂」同题对 Sol，作者认为难分高下](https://x.com/jan_volad/status/2123205954649100424) | @jan_volad | 测评 · 对比 | 作者自述 |
| 47 | [Antigravity 里做的手机拆装 3D 原型，附一板设计组件](https://x.com/ai_for_success/status/2123207149870547423) | @ai_for_success | 演示 | 作者自述 |
| 48 | [零样本生成可交互的 3D 历史帆船，船体和水面分层渲染，作者觉得比 Sol 写实](https://x.com/abhinavflac/status/2123212198663323848) | @abhinavflac | 演示 · 对比 | 作者自述 |
| 50 | [DesignArena 同题对 Argon：阿尔卑斯滑雪小屋，Neon 没被要求就自己加了飘雪](https://x.com/DesignArena/status/2123220446074253768) | @DesignArena | 测评 · 对比 | 工具方 |
| 51 | [体素奇幻城堡，一句提示](https://x.com/Lentils80/status/2123226306351661099) | @Lentils80 | 演示 | 作者自述 |
| 53 | [Antigravity 里 Neon xhigh 做的 Three.js 蝴蝶动画](https://x.com/thtbee_/status/2123259795172212871) | @thtbee_ | 演示 | 作者自述 |
| 55 | [给参考图、迭代三轮的 Three.js 像素巫师世界](https://x.com/thtbee_/status/2123279727935033355) | @thtbee_ | 演示 | 作者自述 |
| 56 | [城堡渲染基准：一段视频加几张截图](https://x.com/nemumusitocha/status/2123287660525719823) | @nemumusitocha | 测评 | 作者自述 |
| 100 | [京都鸟居和竹林黎明漫游同题对 Astra：Neon 更贵也更慢](https://x.com/teddyaisi/status/2123627618146959641) | @teddyaisi | 测评 · 对比 | 作者自述 |
| 102 | [涩谷十字路口夜景同题对 Opus 5.5，作者请大家投票，没有打分](https://x.com/petergyang/status/2123620968568676457) | @petergyang | 测评 · 对比 | 作者自述 |
| 103 | [Three.js 机甲组装再升空的动画](https://x.com/alohaproxy/status/2123619339995668726) | @alohaproxy | 演示 | 作者自述 |

## 动态图形（14）

| # | 作品 | 作者 | 证据 | 出处 |
|---|---|---|---|---|
| 11 | [medium 档跑的鹈鹕骑车动画，经典测试题的又一次独立复跑](https://x.com/xiangning0/status/2123161354496557071) | @xiangning0 | 演示 | 作者自述 |
| 15 | [鹈鹕骑车四模型同题（Neon / Hydrogen / Astra / Sol），作者最喜欢 Neon 的样子](https://x.com/Super_Nius/status/2123162610254442796) | @Super_Nius | 测评 · 对比 | 作者自述 |
| 25 | [不用任何库的原生 JS，12 fps 油画质感 3D 动画演绎济慈《秋颂》](https://x.com/vamsibatchuk/status/2123170948568535488) | @GeokenAI | 演示 | 官方演示 |
| 43 | [鹈鹕主题的产品动效短片](https://x.com/chetaslua/status/2123184113561817370) | @chetaslua | 演示 | 作者自述 |
| 45 | [一道叫「香蕉测试」的视觉测试题的 Neon 输出](https://x.com/AdamHoltererer/status/2123189288107999706) | @AdamHoltererer | 演示 | 作者自述 |
| 49 | [纯 JS、不用外部素材做的模型介绍动效片](https://x.com/chetaslua/status/2123219124260315301) | @chetaslua | 演示 | 作者自述 |
| 52 | [章鱼骑车动画对 Astra：效果接近，Neon 用了将近两倍时间（档位不同）](https://x.com/ZryMiller/status/2123228351984980040) | @ZryMiller | 测评 · 对比 | 作者自述 |
| 54 | [照着参考图生成几个界面组件和配套动效](https://x.com/op7418/status/2123269503736070603) ⚠️ | @op7418 | 演示 | 作者自述 |
| 71 | [Google 员工和 Neon 合作的发布片，没说明哪些画面和音频出自哪个工具](https://x.com/gracepursuits/status/2123190512853176421) ⚠️ | @gracepursuits | 演示 | 官方演示 |
| 96 | [Antigravity + Swarm 做的 Three.js 火柴人连续打斗动画](https://x.com/chetaslua/status/2123720700670398680) | @chetaslua | 演示 | 作者自述 |
| 97 | [夕阳帆船三模型叠放对比：Fable 5.2 / GPT-6.2 Astra / Neon，未公开提示和设置](https://x.com/Da7_Tech/status/2123712489443713478) | @Da7_Tech | 测评 · 对比 | 作者自述 |
| 98 | [把头像做成会动的收藏卡 GIF（稀有度和价格都是装饰）](https://x.com/aiiii498/status/2123657122575450535) | @aiiii498 | 演示 | 作者自述 |
| 99 | [一只墨线画的眼睛不断变成花、蝴蝶等图案的抽象动画](https://x.com/thtbee_/status/2123636478932881627) | @thtbee_ | 演示 | 作者自述 |
| 101 | [一段器乐编曲（音轨加钢琴卷帘画面），Neon 负责了哪部分没说清](https://x.com/aisearchio/status/2123621132024848408) ⚠️ | @aisearchio | 演示 | 作者自述 |

## 绘图与插画（8）

| # | 作品 | 作者 | 证据 | 出处 |
|---|---|---|---|---|
| 7 | [AI Studio 里 Neon high 画的宝马 M4 CS 侧视 SVG](https://x.com/HarshithLucky3/status/2123158145380085991) | @HarshithLucky3 | 演示 | 作者自述 |
| 8 | [一组三张的 SVG 测试图](https://x.com/AdamHoltererer/status/2123159230291054903) | @AdamHoltererer | 演示 | 作者自述 |
| 10 | [xhigh 档画的一位女演员肖像 SVG](https://x.com/lyraxana/status/2123161268647539052) ⚠️ | @lyraxana | 演示 | 作者自述 |
| 14 | [早期权限下让 Neon 写代码「画」出来的一组十二张绘画](https://x.com/kickingkeys/status/2123162238643044705) | @kickingkeys | 演示 | 作者自述 |
| 19 | [一只骑车骑到心累的鹈鹕 SVG（AI Studio，Neon high）](https://x.com/HarshithLucky3/status/2123165824576114932) | @HarshithLucky3 | 演示 | 作者自述 |
| 20 | [游戏手柄绘图同题对 GPT-6.2 Sol：画得差不多，Neon 用时是 Sol 的两倍多、花费是三倍](https://x.com/notjazii/status/2123166093422272839) | @notjazii | 测评 · 对比 | 作者自述 |
| 22 | [一匹 2D 马，作者觉得比以前的 Gemini 画得好](https://x.com/jony_palino/status/2123168463640269001) | @jony_palino | 演示 | 作者自述 |
| 30 | [建筑插画同题对 Opus 5.5：Neon 便宜一半，但作者更喜欢 Opus 画的](https://x.com/notjazii/status/2123172429791129848) | @notjazii | 测评 · 对比 | 作者自述 |

## 科普可视化（10）

| # | 作品 | 作者 | 证据 | 出处 |
|---|---|---|---|---|
| 2 | [从模拟逻辑门、电路板一路做到复古终端显示的交互电子演示，一句提示、没改过](https://x.com/SamuelAlbanie/status/2123174394889687151) | @SamuelAlbanie | 演示 | 官方演示 |
| 31 | [旅行者 1 号从发射到飞掠木星的 3D 动画](https://x.com/SamuelAlbanie/status/2123174398064570622) | @SamuelAlbanie | 演示 | 官方演示 |
| 32 | [能在行星和星座视图之间切换的 3D 天文馆](https://x.com/SamuelAlbanie/status/2123174400572719261) | @SamuelAlbanie | 演示 | 官方演示 |
| 33 | [巴贝奇 2 号差分机 3D 复原，齿轮组和数字显示都会动](https://x.com/SamuelAlbanie/status/2123174403038982379) | @SamuelAlbanie | 演示 | 官方演示 |
| 34 | [安提基特拉机械：出土残件、复原齿轮、表盘三种视图切换](https://x.com/SamuelAlbanie/status/2123174406419828813) | @SamuelAlbanie | 演示 | 官方演示 |
| 35 | [可视化风洞：飞机等形状周围的气流线](https://x.com/SamuelAlbanie/status/2123174409284260270) | @SamuelAlbanie | 演示 | 官方演示 |
| 36 | [剑桥国王学院礼拜堂剖面，内外视角切换](https://x.com/SamuelAlbanie/status/2123174412488716605) | @SamuelAlbanie | 演示 | 官方演示 |
| 57 | [Google 官方：Antigravity Swarm 按档案照片重建图灵 1936 年的书房，桌上有台能跑的通用图灵机](https://x.com/GoogleAI/status/2123168242797809944) | @GoogleAI | 演示 | 官方演示 |
| 72 | [给 VR 游戏 H3VR2 的装备做图解说明](https://x.com/Msfs2000J/status/2123201737217773826) | @Msfs2000J | 演示 | 作者自述 |
| 104 | [用一支 MV（歌词加动画图解）讲前沿模型怎么训练、怎么后训练](https://x.com/elliotarledge/status/2123608819943211022) | @elliotarledge | 演示 | 作者自述 |

## 游戏互动（12）

| # | 作品 | 作者 | 证据 | 出处 |
|---|---|---|---|---|
| 58 | [Flappy Bird 式横版闯关原型](https://x.com/notjazii/status/2123162053292458218) | @notjazii | 演示 | 作者自述 |
| 59 | [剑盾战斗场景同题对 Fable 5.2（两段带标注的视频）](https://x.com/IndependentEco/status/2123169526619758996) | @IndependentEco | 测评 · 对比 | 作者自述 |
| 60 | [Google Antigravity 官方：一句提示让 Swarm 做出双人合成波 3D 迷你高尔夫，8 个 agent 并行，自带验证器逐关检查](https://x.com/antigravity/status/2123176067380711725) | @antigravity | 演示 | 官方演示 |
| 61 | [骑士对决动画同题对 Opus 5.5](https://x.com/IndependentEco/status/2123177347046355324) | @IndependentEco | 测评 · 对比 | 作者自述 |
| 62 | [单个 HTML 文件里的表现主义无尽艺术游戏](https://x.com/GeokenAI/status/2123178088439959750) | @GeokenAI | 演示 | 作者自述 |
| 63 | [第一人称冰霜 Boss 战原型同题对 Opus 5.5](https://x.com/IndependentEco/status/2123187721040503097) | @IndependentEco | 测评 · 对比 | 作者自述 |
| 64 | [西瓜投篮小游戏](https://x.com/AdamHoltererer/status/2123189375831859349) | @AdamHoltererer | 演示 | 作者自述 |
| 65 | [把一个 C++20 + WebGPU 高斯泼溅引擎改成四座塔的面包房平台跳跃游戏，演示视频也是模型录的](https://x.com/GlitterPixely/status/2123235794747891968) | @GlitterPixely | 演示 | 作者自述 |
| 66 | [Antigravity Swarm 做的小型 3D 游戏，手机和桌面都能玩](https://x.com/ai_for_success/status/2123239282626478306) | @ai_for_success | 演示 | 作者自述 |
| 67 | [太空竞速原型（high 档）](https://x.com/badboyfoxy/status/2123251809183785076) | @badboyfoxy | 演示 | 作者自述 |
| 68 | [塔防原型，作者说玩起来很顺](https://x.com/DeryaTR_/status/2123276863481254210) | @DeryaTR_ | 演示 | 作者自述 |
| 69 | [Google 官方：WebGL2 第一人称自由滑雪模拟器，勃朗峰和霞慕尼地形、6 条滑线、120 Hz 物理、雪痕和空间音频](https://www.youtube.com/watch?v=xhG-jNObuz4) | @Google | 演示 | 官方演示 |

## 知识工作（4）

| # | 作品 | 作者 | 证据 | 出处 |
|---|---|---|---|---|
| 70 | [让 Neon 做调研，产出一张「Gemini 4 各型号怎么选」的表](https://x.com/Arcadia_Bao/status/2123171058002088343) | @Arcadia_Bao | 演示 | 作者自述 |
| 74 | [丢一篇文章加一个公开的做幻灯片 skill，产出可编辑的 Google Slides，配图自动生成并插入](https://x.com/tetumemo/status/2123210419137601764) | @tetumemo | 演示 | 作者自述 |
| 75 | [写作测试：一篇中文奇幻小说的开头](https://x.com/Arcadia_Bao/status/2123222272697913481) | @Arcadia_Bao | 演示 | 作者自述 |
| 77 | [Google 官方：Neon swarm 用一张参考图做出 10 万格的 Sheets 计算机视觉实验室，50 万+ 公式，边缘检测、深度图、重打光等 6 种模式](https://www.youtube.com/watch?v=vPsBbuz9IbE) | @Google | 演示 | 官方演示 |

## 工程集成（4）

| # | 作品 | 作者 | 证据 | 出处 |
|---|---|---|---|---|
| 3 | [tscircuit 维护者让三家模型设计蓝牙电动牙刷电路：Neon 外观最好，但布线没走完、封装选得差](https://x.com/seveibar/status/2123229845274653112) | @seveibar | 测评 · 对比 | 工具方 |
| 4 | [在 Muse 里搭一个侧边对话，把请求和回复转发给 Neon](https://x.com/kajikent/status/2123232182298976767) | @kajikent | 集成 | 作者自述 |
| 5 | [T3 Code 三模型分工：Fable 写实现、GPT-6.2 Astra 试玩、Neon 只管写文案](https://x.com/theo/status/2123273253850628260) ⚠️ | @theo | 集成 | 工具方 |
| 6 | [用 Neon 返修一个原本用 Argon 写的 Spotify 推荐 MCP：修了 bug，还自作主张加了口味推荐](https://x.com/Lentils80/status/2123285929649455409) | @Lentils80 | 集成 | 作者自述 |

## 评测榜单（22）

榜单方自己发的成绩里，Neon 大多在前列：Vending-Bench 2、Tuesday@Work、Penalty Bench、Models Engineering Index 第一，Vals Index 和 Agent Arena 第二，Text Arena 第三，Wojak-Bench 第四；Browser Use 74% 低于 Sol 的 82%。短板集中在速度和成本：CUDA 调试题耗时近 4 倍（#90），Plotly 43 题全对但花费是 Hydrogen 的约 2.7 倍（#95），RuneScape 没在时限内跑完（#87）。

| # | 作品 | 作者 | 证据 | 出处 |
|---|---|---|---|---|
| 1 | [发布当天无界面（headless）跑 Neon 不稳定，作者让 Opus 5.5 在旁边盯着跑](https://x.com/IndependentEco/status/2123155946801070204) | @IndependentEco | 局限 | 作者自述 |
| 73 | [裁图时 Neon 夸起了自己裁得好（单次截图）](https://x.com/viticci/status/2123208444681372133) | @viticci | 局限 | 作者自述 |
| 76 | [作者自编的 Dario 笑话，Neon 看懂了、Opus 5.5 没看懂（单次）](https://x.com/MichaelLee009/status/2123236918456733855) | @MichaelLee009 | 测评 · 对比 | 作者自述 |
| 78 | [Vals Index 70.9%，总榜第二，比 Fable 5.2 低 0.4 分；金融、法律分榜第一](https://x.com/ValsAI/status/2123168167879147542) | @ValsAI | 榜单 · 对比 | 榜单方发布 |
| 79 | [早期权限测试：在 Antigravity 里做了 17 个交互演示，成功和翻车都记了](https://x.com/kimmonismus/status/2123168299890704735) | @kimmonismus | 测评 | 作者自述 |
| 80 | [Agent Arena：Neon High 1336 分排第二（基于 4200 次社区 agent 会话）](https://x.com/arena/status/2123169189397709174) | @arena | 榜单 · 对比 | 榜单方发布 |
| 81 | [Text Arena：Neon High 1518，落后 Carbon High 1526 和 Argon High 1521](https://x.com/arena/status/2123169199396946279) | @arena | 榜单 · 对比 | 榜单方发布 |
| 82 | [Wojak-Bench（参考图转可 3D 打印手办，两两投票）首秀第四，评分 1056](https://x.com/lukaspet/status/2123169317076574513) | @lukaspet | 榜单 · 对比 | 榜单方发布 |
| 83 | [Artificial Analysis 编码 agent 榜：Neon xhigh + Antigravity CLI 59 分，Carbon high 55 分](https://x.com/ArtificialAnlys/status/2123170648772288540) | @ArtificialAnlys | 榜单 · 对比 | 榜单方发布 |
| 84 | [AA-Briefcase 知识工作榜：Neon xhigh 1700 Elo，Carbon high 1611；做演示文稿一项 1771](https://x.com/ArtificialAnlys/status/2123170651980931421) | @ArtificialAnlys | 榜单 · 对比 | 榜单方发布 |
| 85 | [AA 智能指数：Neon xhigh 61、Carbon high 60，输出 token 多约 15%](https://x.com/ArtificialAnlys/status/2123170655424450840) | @ArtificialAnlys | 榜单 · 对比 | 榜单方发布 |
| 86 | [Vending-Bench 2 自动售货经营模拟排第一，日志里有虚构的讨价还价说辞](https://x.com/andonlabs/status/2123174738789011875) | @andonlabs | 榜单 | 榜单方发布 |
| 87 | [RuneScape 基准：策略很有野心，但没在时限内跑完](https://x.com/maxbittker/status/2123183525515886696) | @maxbittker | 局限 | 榜单方发布 |
| 88 | [Mercor APEX-Agents：Pass@1 82.9%、均分 88.9%；APEX-Accounting Pass@1 只有 23.5%](https://x.com/mercor/status/2123184025808650641) | @mercor | 榜单 · 对比 | 榜单方发布 |
| 89 | [CursorBench 4.1：Neon 默认档 63.7%，Hydrogen 57.3%](https://x.com/cursor_ai/status/2123198346802450926) | @cursor_ai | 榜单 · 对比 | 榜单方发布 |
| 90 | [同一道 CUDA 调试题的端到端耗时：Neon 是另两家的近 4 倍](https://x.com/elliotarledge/status/2123200759819124893) | @elliotarledge | 榜单 · 对比 | 榜单方发布 |
| 91 | [Surge AI Tuesday@Work 71.6，略高于 Fable 5.2 的 71.2；DAYJOB Finance、GDP.xlsx、Riemann-bench 也居首](https://x.com/HelloSurgeAI/status/2123213638819348485) | @HelloSurgeAI | 榜单 · 对比 | 榜单方发布 |
| 92 | [Penalty Bench（判罚是否与裁判一致，题量小）在 Antigravity 下排第一](https://x.com/wenhaocha1/status/2123252530713124967) | @wenhaocha1 | 榜单 · 对比 | 榜单方发布 |
| 93 | [Browser Use 基准 74%，与 Opus 5.5 持平，低于 GPT-6.2 Sol 的 82%](https://x.com/browser_use/status/2123263050501509123) | @browser_use | 榜单 · 对比 | 榜单方发布 |
| 94 | [PandaCode 工具调用失败率：发布当晚 9465 次调用失败 65 次，约 0.7%，与 Carbon 持平](https://x.com/aicodeking/status/2123277076174196882) | @aicodeking | 测评 · 对比 | 作者自述 |
| 95 | [Plotly 43 题数据分析：43 题全对；Hydrogen 也全对，花费只有 Neon 的四成不到](https://news.ycombinator.com/item?id=50553968) | @chriddyp | 榜单 · 对比 | 榜单方发布 |
| 105 | [第三方综合指数 Models Engineering Index：Neon 68.1，20 个模型里第一（各模型覆盖不均）](https://news.ycombinator.com/item?id=50568130) | @hn-aarvin | 榜单 · 对比 | 榜单方发布 |

## 可以直接抄的提示词

- **#46** [「造一座巨大的闹鬼吸血鬼大教堂」同题对 Sol，作者认为难分高下](https://x.com/jan_volad/status/2123205954649100424) — @jan_volad

  ```
  Build a huge haunted vampire cathedral
  ```

- **#60** [Google Antigravity 官方：一句提示让 Swarm 做出双人合成波 3D 迷你高尔夫，8 个 agent 并行，自带验证器逐关检查](https://x.com/antigravity/status/2123176067380711725) — @antigravity

  ```
  Build NEONPUTT '84: a 2-player synthwave 3D mini golf game with custom GLSL shaders, 240Hz fixed-timestep physics, procedural Web Audio SFX, and 8 animated courses.
  ```

## 需要你拍板（6 条 + 2 个整体问题）

整体问题：

1. **资料类要不要上设计雷达**：知识工作 4、工程集成 4、评测榜单 22 条不是设计作品。票拟：页面保留（排在视觉类后面、可用筛选单看），不进雷达日报。
2. **官方演示要不要单列**：18 条被上游标为官方演示（Google、Google AI、Antigravity 官方账号，以及上游认定的 Google 员工，如 @SamuelAlbanie 的 9 条），是宣传素材。票拟：照收，卡片上标「官方演示」。

| # | 作品 | 问题 | 票拟 |
|---|---|---|---|
| 5 | [T3 Code 三模型分工：Fable 写实现、GPT-6.2 Astra 试玩、Neon 只管写文案](https://x.com/theo/status/2123273253850628260) | Neon 在这个工作流里只写文案，算不算 Neon 的用例 | 收录在工程集成 |
| 10 | [xhigh 档画的一位女演员肖像 SVG](https://x.com/lyraxana/status/2123161268647539052) | 真人肖像（一位女演员），非本人授权 | 收录、回链保留，但不放缩略图 |
| 42 | [体素版「幻影忍者」同题对 Fable 5.2：Neon 稍贵，作者更喜欢 Fable 的构图](https://x.com/thehypedotnews/status/2123182627674796462) | 体素复刻乐高「幻影忍者」，涉及他人 IP | 照收、标 ⚠️（同 Fable 归档里宝可梦类的处理） |
| 54 | [照着参考图生成几个界面组件和配套动效](https://x.com/op7418/status/2123269503736070603) | 界面组件 + 动效，也可以算进雷达的「App UI」 | 先按动态图形收录 |
| 71 | [Google 员工和 Neon 合作的发布片，没说明哪些画面和音频出自哪个工具](https://x.com/gracepursuits/status/2123190512853176421) | 发布片里哪些画面和音频是 Neon 做的，原帖没说 | 收录，摘要里已写明归属不清 |
| 101 | [一段器乐编曲（音轨加钢琴卷帘画面），Neon 负责了哪部分没说清](https://x.com/aisearchio/status/2123621132024848408) | 器乐编曲里 Neon 负责哪部分没说清，可能主要是别的音频工具 | 收录，摘要里已写明归属不清 |

---

上游英文条目 © cheercheung，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；原帖、图片、视频归各自作者。本目录的中文摘要和整理是在其基础上的改写。
