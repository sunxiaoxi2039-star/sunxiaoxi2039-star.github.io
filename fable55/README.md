# X 上用 Fable 5.5 做的视频 · 整理归位

> 收集日期 2026-11-03。X 在本会话里不可直连，数据来自三份公开索引（它们都逐条核过原帖）：[billyhetech/awesome-fable5-5-videos](https://github.com/billyhetech/awesome-fable5-5-videos)（199 条）、[yihui-dev/awesome-fable5-5-videos](https://github.com/yihui-dev/awesome-fable5-5-videos)（82 条）、[coolbat/awesome-fable-5.5-usecase](https://github.com/coolbat/awesome-fable-5.5-usecase)（170 条）。按 X 帖子 ID 去重后共 **273 条**。

> 注意：「Fable 5.5」到今天为止仍是社区说法，Anthropic 没有官宣；所有归属都是作者自述。

## 整理方法（照中台那套）

1. **统一格式**：每条只留五样东西——回链（原帖）、对象（作者）、类型（雷达大类 + 子类）、一句话摘要、来源索引。机器可读版在 `videos.json`。
2. **规则归位**：来源各自的分类按一张规则表映射到雷达现有大类（`小游戏` / `动效`），再细分 6 个子类；3D 场景里凡是游戏一律归到小游戏。
3. **去重**：三份来源按 X status ID 合并，同一帖只记一次，来源字段记录它出现在哪几份索引里。
4. **数据沉淀**：观看数、发布时间、时长、技术标签、提示词、海报图、可玩链接全部保留在 JSON 里，后面要换规则或做日报有据可查。
5. **只把需要拍板的推上来**：大类在来源间不一致、或标题像对比/爆料/梗帖的，单独列在文末「需要你拍板」，每条附票拟，你点头或否决即可。

## 一眼看全

| 子类 | 条数 |
|---|---|
| 动态图形 | 156 |
| 短片 | 21 |
| 科普解释 | 12 |
| 发布片 | 11 |
| 3D 场景 | 36 |
| 游戏互动 | 37 |
| **合计** | **273** |

高产作者：@imjustnewatai（25）、@chetaslua（24）、@dummerspast39（15）、@blueemi99（11）、@notjazii（9）、@atomtanstudio（8）、@AISuperDomain（7）、@ishuagra02（6）

## 今日最炫候选（按观看数）

- **977K** · [纯代码一次生成的动画短片，Fable 5.5 热度最高的一条](https://x.com/chetaslua/status/2117169796290916732) — @chetaslua · 动态图形
- **828K** · [一个点生成的皮克斯风动画](https://x.com/cherry_mx_reds/status/2105825930799432073) — @cherry_mx_reds · 动态图形
- **774K** · [POKERMON：宝可梦 × Balatro 卡牌游戏，拿到权限后一小时一次生成，含音乐和演示片](https://x.com/anshuc/status/2107180724399075488) — @anshuc · 游戏互动
- **700K** · [「扎克伯格承认了什么」Meta 前沿模型解说动画](https://x.com/kirillk_web3/status/2109948006770319580) — @kirillk_web3 · 动态图形
- **537K** · [超人穿越 20 种艺术风格的连续动画](https://x.com/chetaslua/status/2105757136219504862) — @chetaslua · 动态图形
- **355K** · [人类进步与未来三十年](https://x.com/imjustnewatai/status/2106081142143168580) — @imjustnewatai · 科普解释
- **290K** · [用 Blender 做的 dots 角色动画](https://x.com/JaydenDavisNC/status/2107086714820870617) — @JaydenDavisNC · 3D 场景
- **234K** · [果冻西瓜切片动画，作者说用 Opus 以三分之一的价格复现](https://x.com/vib3coded/status/2109205399513489436) — @vib3coded · 动态图形
- **213K** · [15 秒四万年艺术史](https://x.com/cherry_mx_reds/status/2106095190285144331) — @cherry_mx_reds · 科普解释
- **202K** · [66 秒短片：狐狸、纸鸟、云、字幕、配乐、音效全是 Python 代码，零图像模型](https://x.com/chetaslua/status/2117224839010459987) — @chetaslua · 短片

## 动态图形（156）

| 观看 | 作品 | 作者 | 技术 | 来源 |
|---|---|---|---|---|
| 977K | [纯代码一次生成的动画短片，Fable 5.5 热度最高的一条](https://x.com/chetaslua/status/2117169796290916732) | @chetaslua | canvas | clawshelf+coolbat |
| 828K | [一个点生成的皮克斯风动画](https://x.com/cherry_mx_reds/status/2105825930799432073) | @cherry_mx_reds | canvas | clawshelf+skillry+coolbat |
| 700K | [「扎克伯格承认了什么」Meta 前沿模型解说动画](https://x.com/kirillk_web3/status/2109948006770319580) | @kirillk_web3 | canvas | clawshelf |
| 537K | [超人穿越 20 种艺术风格的连续动画](https://x.com/chetaslua/status/2105757136219504862) | @chetaslua | canvas | clawshelf+coolbat |
| 255K | [「Opus 5.5 正在路由到新模型」的爆料帖（附动画）](https://x.com/chetaslua/status/2109244702235275680) ⚠️ | @chetaslua | canvas | clawshelf |
| 234K | [果冻西瓜切片动画，作者说用 Opus 以三分之一的价格复现](https://x.com/vib3coded/status/2109205399513489436) | @vib3coded | canvas | clawshelf |
| 189K | [「Dario 发布 Fable」梗动画](https://x.com/superalesha/status/2109192419145109624) ⚠️ | @superalesha | canvas | clawshelf |
| 179K | [Kimi K3.1 Pro 与 Fable 5.5 的复杂叠层场景 SVG 对比](https://x.com/chetaslua/status/2113503273361777086) ⚠️ | @chetaslua | canvas | clawshelf+coolbat |
| 164K | [一句「做个酷动画」，15 分钟后出来的短动画](https://x.com/cherry_mx_reds/status/2105816670896009224) | @cherry_mx_reds | canvas | clawshelf+coolbat |
| 157K | [「第一部 Claude 做的动画番」](https://x.com/ziwenxu_/status/2111212505947357651) | @ziwenxu_ | canvas | clawshelf |
| 155K | [动画短片](https://x.com/imjustnewatai/status/2105808539495354669) | @imjustnewatai | canvas | clawshelf+skillry |
| 138K | [「用 Fable 5.5 做发布视频」（motion.so 的发布片）](https://x.com/motion_so/status/2117287037170778544) | @motion_so | canvas | clawshelf |
| 133K | [果冻之王：同一提示下 Opus 5.5 与 Astra、Fable、Sonnet 的对比](https://x.com/vib3coded/status/2109424502237016076) | @vib3coded | canvas | clawshelf |
| 107K | [「Fable 5.5 审计我让 Astra 维护的代码库」梗动画](https://x.com/SoundDobad/status/2112253485404369270) ⚠️ | @SoundDobad | canvas | clawshelf |
| 101K | [超人 3D 版穿越多种艺术风格，Blender Python 写出来的](https://x.com/chetaslua/status/2111458379386523724) ⚠️ | @chetaslua | blender | clawshelf+coolbat |
| 95K | [「Fable 5.5 这个动画最牛逼之处」（中文帖）](https://x.com/renmu2017/status/2111658365382541523) | @renmu2017 | canvas | clawshelf |
| 88K | [GPT 6.2 Astra 与 Fable 5.5 纯前端代码动画对比（中文帖）](https://x.com/leo114119/status/2117209849842761983) ⚠️ | @leo114119 | canvas | clawshelf |
| 86K | [《Dyson Fragment》：单个 HTML、约 1.5 小时做的 91 秒作品](https://x.com/dummerspast39/status/2112275947634446639) | @dummerspast39 | canvas | clawshelf+coolbat |
| 86K | [一次生成的纽约电影感场景，有反射和光照，全部是代码](https://x.com/Mr_Salio/status/2111097153074470950) | @Mr_Salio | canvas | clawshelf+coolbat |
| 84K | [Claude 日常生活动画](https://x.com/ishuagra02/status/2106045364868419727) | @ishuagra02 | canvas | clawshelf+skillry+coolbat |
| 80K | [自行车骑着鹈鹕的 SVG 动画](https://x.com/dummerspast39/status/2111519245733654775) | @dummerspast39 | svg | clawshelf |
| 77K | [一条提示词生成的动态演示片](https://x.com/Saccc_c/status/2105985484472377531) | @Saccc_c | hyperframes, remotion | clawshelf |
| 77K | [节奏很快的动态设计短片，作者拿来和之前 Opus 5.5 的对比](https://x.com/blueemi99/status/2106031355922387163) | @blueemi99 | canvas | clawshelf+coolbat |
| 76K | [Hugging Face 事件动画短片](https://x.com/chetaslua/status/2105884276864782557) | @chetaslua | blender, elevenlabs | clawshelf+skillry+coolbat |
| 71K | [引用 Boris Cherny 技巧的动画帖](https://x.com/mirku21/status/2114462105512644974) ⚠️ | @mirku21 | canvas | clawshelf |
| 70K | [Fable 5.5 与 GPT 6.1 速度/质量对比测试](https://x.com/SPAC89/status/2105783511433318451) ⚠️ | @SPAC89 | canvas | clawshelf |
| 69K | [想象 Dario 办公室发布前 15 分钟的「现场画面」](https://x.com/CampbellKaleb23/status/2110377591450259487) ⚠️ | @CampbellKaleb23 | canvas | clawshelf |
| 67K | [手柄骑自行车骑鹈鹕再骑自行车的套娃 SVG 动画](https://x.com/dummerspast39/status/2111577334436319355) | @dummerspast39 | svg | clawshelf+coolbat |
| 66K | [复刻一款未发售游戏的 UI，作者说几乎一模一样](https://x.com/m_ferreira28/status/2107218218955788429) ⚠️ | @m_ferreira28 | canvas | clawshelf+coolbat |
| 66K | [漫威 DC 英雄动画](https://x.com/chetaslua/status/2105792187200147541) | @chetaslua | canvas | clawshelf+skillry+coolbat |
| 65K | [一幅油画和它的绘制延时](https://x.com/blueemi99/status/2106755903223664708) | @blueemi99 | canvas | clawshelf+coolbat |
| 61K | [「做点有 AGI 感的东西」：约一小时、无外部素材的纯代码动画](https://x.com/notjazii/status/2117221957104239010) ⚠️ | @notjazii | canvas | clawshelf+coolbat |
| 61K | [Claude 跟着节拍跳舞](https://x.com/ishuagra02/status/2106369929813594134) | @ishuagra02 | canvas | clawshelf+skillry+coolbat |
| 61K | [「Opus 5.5 被路由到另一个模型」的爆料帖](https://x.com/testingcatalog/status/2109633920568377583) ⚠️ | @testingcatalog | canvas | clawshelf |
| 59K | [用 GPT-Astra 6 做动画视频的教程帖](https://x.com/Justin_lords/status/2106610341694345660) ⚠️ | @Justin_lords | canvas | clawshelf |
| 58K | [游戏过场风格的蜘蛛侠场景，约 7 小时、全部用代码从零做](https://x.com/Mr_Salio/status/2111590674961154433) | @Mr_Salio | canvas | clawshelf+coolbat |
| 58K | [Three.js 写实鹈鹕骑车动画，一次生成，附知识截止日期验证](https://x.com/chetaslua/status/2116882694026269148) ⚠️ | @chetaslua | canvas | clawshelf+coolbat |
| 56K | [Eminem《Godzilla》MV 复刻，每一帧都是 JavaScript 画的扁平图形](https://x.com/abhinavflac/status/2106638839666373114) | @abhinavflac | canvas | clawshelf+coolbat |
| 56K | [「我觉得赢家很明显」对比帖](https://x.com/SahilPanhotra/status/2117276551247278264) ⚠️ | @SahilPanhotra | canvas | clawshelf |
| 56K | [「这套工作流帮你省几千块」的教程帖](https://x.com/dr_cintas/status/2107939634705559974) ⚠️ | @dr_cintas | canvas | clawshelf |
| 53K | [自行车骑在鹈鹕上](https://x.com/notjazii/status/2116861637890379891) | @notjazii | canvas | clawshelf+coolbat |
| 53K | [鹈鹕骑车并排对比：Fable 5.5 写实风 vs Gemini 4 Carbon 漫画风](https://x.com/leo114119/status/2116652334734332212) ⚠️ | @leo114119 | canvas | clawshelf+coolbat |
| 51K | [Fable 5.5 / Opus 5.6 的首次动画测试](https://x.com/ChrisGPT/status/2117381015069212910) | @ChrisGPT | canvas | clawshelf |
| 48K | [从零重做的 Cutefish 桌面首次预览](https://x.com/cutefishos/status/2111800377125556549) | @cutefishos | canvas | clawshelf |
| 48K | [战斗动画](https://x.com/notjazii/status/2117261864904351848) | @notjazii | canvas | clawshelf+coolbat |
| 47K | [花 25 美元做出来的 brainrot 风格剪辑](https://x.com/blueemi99/status/2107459553369760024) | @blueemi99 | canvas | clawshelf+coolbat |
| 46K | [经典火柴人打斗动画，动作非常顺滑](https://x.com/AndrewOnXYZ/status/2107262468502544435) | @AndrewOnXYZ | canvas | clawshelf+coolbat |
| 44K | [Three.js 多模型对比](https://x.com/AI_Screening/status/2115849659797373038) ⚠️ | @AI_Screening | threejs | clawshelf |
| 43K | [「Opus 5.5 又在路由到别的模型了」的爆料帖](https://x.com/karanC_12/status/2109248100892311765) ⚠️ | @karanC_12 | canvas | clawshelf |
| 43K | [纯数学驱动的音乐可视化](https://x.com/chetaslua/status/2111060420505268729) | @chetaslua | web-audio | clawshelf+coolbat |
| 42K | [「Fable 5.5 终于要来了？（又一次）」梗动画](https://x.com/devteamdrew/status/2112591205750001745) ⚠️ | @devteamdrew | canvas | clawshelf |
| 41K | [Three.js 汽车动画](https://x.com/chetaslua/status/2116975056014430419) | @chetaslua | threejs | clawshelf+coolbat |
| 41K | [「新 Fable 有独特理解力」的评论帖（附动画）](https://x.com/chetaslua/status/2112454035592638879) ⚠️ | @chetaslua | canvas | clawshelf |
| 40K | [两个模型做同一条发布预告片的对比](https://x.com/mesmerlord/status/2105771088374288692) ⚠️ | @mesmerlord | canvas | clawshelf |
| 39K | [2010–2026 网络热梗动画](https://x.com/chetaslua/status/2106076940558082297) | @chetaslua | canvas | clawshelf+skillry+coolbat |
| 37K | [四个乐章的交响曲，每个音符都画了出来](https://x.com/imjustnewatai/status/2109191246715462070) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| 36K | [「据说是 Fable 5.5 Max 的输出」](https://x.com/Hesamation/status/2116544959880778169) ⚠️ | @Hesamation | svg | clawshelf |
| 35K | [Hugging Face 音乐动画](https://x.com/chetaslua/status/2105934928483701214) | @chetaslua | blender, elevenlabs | clawshelf+skillry+coolbat |
| 33K | [「Fable 5.5 之后的模型都太强了」梗动画](https://x.com/badboyfoxy/status/2111893133206409709) ⚠️ | @badboyfoxy | canvas | clawshelf |
| 31K | [「Fable 5.5 看到我代码库里所有要修的东西」梗动画](https://x.com/alxfazio/status/2111832232323351001) ⚠️ | @alxfazio | canvas | clawshelf |
| 29K | [全息 CD 效果：Muse Wonder、GPT-6 Astra、Opus 5.5、Fable 5.5 对比](https://x.com/ann_nnng/status/2109853948647711057) | @ann_nnng | canvas | clawshelf |
| 29K | [同一提示词下 Fable 5.5 与 Opus 5.5 的风格对比](https://x.com/notjazii/status/2116893197939224714) ⚠️ | @notjazii | canvas | clawshelf+coolbat |
| 26K | [「Fable 5.5 逃出沙盒部署 AI 蜂群」梗动画](https://x.com/birdabo/status/2113192599049953747) ⚠️ | @birdabo | canvas | clawshelf |
| 26K | [从零写的黑洞光线追踪](https://x.com/imjustnewatai/status/2106925762582323550) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| 25K | [安静夜晚的发光河流，54 秒带声音](https://x.com/scottstts/status/2112601036804243871) | @scottstts | canvas | clawshelf+coolbat |
| 25K | [15 秒动态图形秀](https://x.com/Saccc_c/status/2106376222309761094) | @Saccc_c | canvas | clawshelf |
| 24K | [「猫咪追逐系列」40 集总集篇（日文帖）](https://x.com/keshiAIart/status/2114688618313003390) | @keshiAIart | canvas | clawshelf |
| 24K | [「Fable 5.5 终于要来了？」梗动画](https://x.com/devteamdrew/status/2110178012759286005) ⚠️ | @devteamdrew | canvas | clawshelf |
| 24K | [十个漫画时代的蜘蛛侠](https://x.com/chetaslua/status/2106248621519978867) | @chetaslua | canvas | clawshelf+skillry+coolbat |
| 23K | [AI 模型大乱斗主题动画](https://x.com/blueemi99/status/2107129409576599730) | @blueemi99 | canvas | clawshelf |
| 22K | [山水画绘制与动画](https://x.com/chetaslua/status/2106833074302710023) | @chetaslua | canvas | clawshelf+skillry |
| 21K | [只拿一条引用推文当参考，一次生成约 50 秒作品，CodePen 可验证](https://x.com/chetaslua/status/2116878661035106515) | @chetaslua | canvas | clawshelf+coolbat |
| 20K | [3D 蚂蚁场景对比](https://x.com/Octoberry/status/2113525831876173879) ⚠️ | @Octoberry | canvas | clawshelf |
| 20K | [3D 角色流水线：Tripo → Blender → Cartwheel → Cascadeur → Unity CLI，103 秒录屏](https://x.com/luccacerf/status/2113025837565870162) | @luccacerf | blender | clawshelf+coolbat |
| 20K | [Fable 5.5 与 GPT-6.1 对比](https://x.com/SPAC89/status/2105968361725202591) ⚠️ | @SPAC89 | canvas | clawshelf |
| 20K | [两个模型设计输出的并排对比](https://x.com/badboyfoxy/status/2106073473361543348) ⚠️ | @badboyfoxy | canvas | clawshelf |
| 19K | [「下周 Anthropic 发 Fable 5.5 碾压 OpenAI」梗动画](https://x.com/imjustnewatai/status/2111369364335190526) ⚠️ | @imjustnewatai | canvas | clawshelf |
| 19K | [一张图生成动态网站：Opus 与 GPT-6.1 对比](https://x.com/exploraX_/status/2107435761490444396) ⚠️ | @exploraX_ | canvas | clawshelf |
| 18K | [自称 AGI 的动画短片](https://x.com/AndrewOnXYZ/status/2106097745098395712) | @AndrewOnXYZ | canvas | clawshelf+skillry |
| 18K | [Three.js 做的体素日式庭院](https://x.com/vikktorrrre/status/2105955048018588084) | @vikktorrrre | threejs | clawshelf |
| 17K | [音乐和音效与画面同步的代码动画，作者说比 Opus 强](https://x.com/chetaslua/status/2111087834329399635) | @chetaslua | blender | clawshelf+coolbat |
| 17K | [一次生成的夜景：花园里漂着一条船，有倒影、树、山、鸟、桥和灯](https://x.com/pankajkumar_dev/status/2111518872272814233) | @pankajkumar_dev | canvas | clawshelf+coolbat |
| 14K | [霍尔木兹海峡辩论主题动画](https://x.com/chetaslua/status/2106060047805792415) | @chetaslua | canvas | clawshelf |
| 14K | [「Fable 5.5 到底在哪」梗动画](https://x.com/bqxgqz/status/2113393134944067762) ⚠️ | @bqxgqz | canvas | clawshelf |
| 12K | [《末班车回家》：灯笼街道、雨后路面、列车穿城的日式夜景](https://x.com/pankajkumar_dev/status/2112176644018626840) | @pankajkumar_dev | canvas | clawshelf+coolbat |
| 11K | [3D 手柄模型对比](https://x.com/notjazii/status/2106050222828998967) ⚠️ | @notjazii | canvas | clawshelf |
| 10K | [Tesla Roadster 动态设计](https://x.com/chetaslua/status/2115145163542790170) | @chetaslua | blender, elevenlabs | clawshelf |
| 10K | [Rick Sanchez SVG：Fable 5.5 与 Gemini 4 Carbon 对比](https://x.com/dummerspast39/status/2113497132841799858) ⚠️ | @dummerspast39 | canvas | clawshelf+coolbat |
| 10K | [动态视觉小品](https://x.com/devteamdrew/status/2110156508097110075) | @devteamdrew | canvas | clawshelf |
| 9K | [原子弹为何成为可能](https://x.com/imjustnewatai/status/2106238699872956427) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| 9K | [鹈鹕骑自行车](https://x.com/dummerspast39/status/2111391206848503923) | @dummerspast39 | canvas | clawshelf+coolbat |
| 9K | [把 @thedankoe 的专注力指南做成 132 秒动画（ADHD 友好）](https://x.com/chetaslua/status/2113229122596163955) | @chetaslua | canvas | clawshelf+coolbat |
| 6K | [水彩风格的秋天动画](https://x.com/ishuagra02/status/2106000055706784118) | @ishuagra02 | canvas | clawshelf |
| 5K | [马骑着宇航员的 SVG 短片](https://x.com/dummerspast39/status/2112490492684296664) | @dummerspast39 | canvas | clawshelf+coolbat |
| — | [一次生成的 Three.js 骑行动画，作者称是见过最好的 Anthropic 输出](https://x.com/AI_Screening/status/2117259686747705830) | @AI_Screening | — | coolbat |
| — | [3D 可乐写实度对比：Fable 5.5 vs Gemini 4 Carbon](https://x.com/leo114119/status/2117198197160546435) ⚠️ | @leo114119 | — | coolbat |
| — | [一次生成的可乐罐，评论区有证明](https://x.com/abhinavflac/status/2116919086521499730) | @abhinavflac | — | coolbat |
| — | [一次生成的 Sam Altman 体素肖像](https://x.com/chetaslua/status/2116912822806520027) | @chetaslua | — | coolbat |
| — | [自行车骑展翅鹈鹕：Fable 5.5 vs Opus 5.5](https://x.com/leo114119/status/2116901575490929109) ⚠️ | @leo114119 | — | coolbat |
| — | [海边骑车的 3D 鹈鹕，写实羽毛和细节](https://x.com/leo114119/status/2116893571739775220) | @leo114119 | — | coolbat |
| — | [鹈鹕骑自行车 SVG（Fable 5.5 Max），帖子里附提示词](https://x.com/marmaduke091/status/2116233349391962392) | @marmaduke091 | — | coolbat |
| — | [蒙娜丽莎 SVG 静帧](https://x.com/blueemi99/status/2113629882504925326) | @blueemi99 | — | coolbat |
| — | [约 36 秒的第二条 Fable 5.5 结果](https://x.com/kerneldroid/status/2113615429981933654) | @kerneldroid | — | coolbat |
| — | [约 17 秒的 Peter Griffin SVG 动画，像视频模型做的](https://x.com/dummerspast39/status/2113530679447433542) | @dummerspast39 | — | coolbat |
| — | [约 45 秒作品，与之前的 Gemini 4 Carbon 对比](https://x.com/kerneldroid/status/2113490604948967611) ⚠️ | @kerneldroid | — | coolbat |
| — | [同一提示词在 Haiku / Sonnet / Opus / Fable 5.5 上一次生成的 12 秒对比](https://x.com/gmartidesign/status/2113463340387467554) ⚠️ | @gmartidesign | — | coolbat |
| — | [角色工作流工厂录屏](https://x.com/luccacerf/status/2112499975989190948) | @luccacerf | — | coolbat |
| — | [同一提示词的 Tesla Roadster 落地页：Fable 5.5 vs Fable 5.1](https://x.com/kaif9998/status/2112166153250607201) ⚠️ | @kaif9998 | — | coolbat |
| — | [PS1 开机进入《Crash Bash》，逐帧用代码画](https://x.com/kaa3bi/status/2111792945712255068) | @kaa3bi | — | coolbat |
| — | [只给一张参考图、约 10 小时做出的 Tesla Roadster 发布视频](https://x.com/Mr_Salio/status/2111209558899413482) | @Mr_Salio | — | coolbat |
| — | [用 TikZ 画的独角兽](https://x.com/imjustnewatai/status/2109824086582890931) | @imjustnewatai | — | coolbat |
| — | [企鹅骑驴的 SVG](https://x.com/imjustnewatai/status/2109821687151690008) | @imjustnewatai | — | coolbat |
| — | [约 100 秒的千禧年 Flash 风动画，一次生成](https://x.com/YanqingCheng/status/2108296567166042404) | @YanqingCheng | — | coolbat |
| — | [max effort 做的视频，API 花了 68 美元](https://x.com/mikeswarms/status/2108066999590908018) | @mikeswarms | — | coolbat |
| — | [不到一小时用一个 skill + 一条提示复刻一段参考动态](https://x.com/notdwd/status/2107816799840690589) | @notdwd | — | coolbat |
| — | [纯 JavaScript 动画，IK 骨骼会随风反应，没有 3D 模型和精灵图](https://x.com/adam_fresko/status/2107637770873417894) | @adam_fresko | — | coolbat |
| — | [Claude vs GPT 带声音动画（high 推理）](https://x.com/notjazii/status/2107497752217460896) ⚠️ | @notjazii | — | coolbat |
| — | [《清明上河图》虹桥段复刻，带声音](https://x.com/AISuperDomain/status/2107401979265962490) | @AISuperDomain | — | coolbat |
| — | [Dan Le Sac vs Scroobius Pip《Thou Shalt Always Kill》歌词 MV，专挑歌词密集的歌](https://x.com/atomtanstudio/status/2107105998452539639) | @atomtanstudio | — | coolbat |
| — | [一个前所未见的视觉错觉](https://x.com/imjustnewatai/status/2107092333720449392) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| — | [PostRush 产品发布动效](https://x.com/wokidev/status/2106981754653511754) | @wokidev | canvas | clawshelf+skillry |
| — | [蓝金夜曲画框动画](https://x.com/SysKaSof/status/2106955391632547945) | @SysKaSof | canvas | clawshelf+skillry |
| — | [海滨落日鹈鹕骑车 SVG](https://x.com/JaydenDavisNC/status/2106938093785788537) | @JaydenDavisNC | svg | clawshelf+skillry |
| — | [十个视觉错觉](https://x.com/imjustnewatai/status/2106909392301945180) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| — | [从寒武纪到第四纪的生物演化](https://x.com/AISuperDomain/status/2106762365438226720) | @AISuperDomain | canvas | clawshelf+skillry |
| — | [数学动效短片](https://x.com/TurboNexic/status/2106710792590835934) | @TurboNexic | canvas | clawshelf+skillry |
| — | [White Town《Your Woman》歌词 MV](https://x.com/atomtanstudio/status/2106702854639743467) | @atomtanstudio | — | coolbat |
| — | [人类最大的机会（无文字）](https://x.com/cocoloba_/status/2106512963414970458) | @cocoloba_ | canvas | clawshelf+skillry |
| — | [鹈鹕骑自行车](https://x.com/olddonkeyblog/status/2106507429265756165) | @olddonkeyblog | canvas | clawshelf+skillry+coolbat |
| — | [Fable 如何变得更好](https://x.com/DAssetBuzz/status/2106505100575592838) | @DAssetBuzz | canvas | clawshelf+skillry+coolbat |
| — | [Reawakening 恐怖短片](https://x.com/JaydenDavisNC/status/2106440774367822008) | @JaydenDavisNC | canvas | clawshelf+skillry |
| — | [艺术史速通动画](https://x.com/AISuperDomain/status/2106397756491526445) | @AISuperDomain | canvas | clawshelf+skillry |
| — | [Chemical Brothers《Go》歌词 MV，只用了 3% 的周额度](https://x.com/atomtanstudio/status/2106377491267137848) | @atomtanstudio | — | coolbat |
| — | [Propellerheads《On Her Majesty's Secret Service》长版歌词 MV](https://x.com/atomtanstudio/status/2106353569603736009) | @atomtanstudio | — | coolbat |
| — | [三星堆动画](https://x.com/hungryturbo/status/2106339115642019904) | @hungryturbo | canvas | clawshelf+skillry |
| — | [丝绸之路动画](https://x.com/hungryturbo/status/2106294812261695508) | @hungryturbo | canvas | clawshelf+skillry |
| — | [Illuminati 惊悚短片](https://x.com/badboyfoxy/status/2106241189976387799) | @badboyfoxy | canvas | clawshelf+skillry+coolbat |
| — | [Altman 与 Amodei 之争讲解](https://x.com/imjustnewatai/status/2106204392588276065) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| — | [工作 12 小时的音乐视频](https://x.com/synthshareai/status/2106195060140446028) | @synthshareai | web-audio | clawshelf+skillry |
| — | [从夸克到可观测宇宙](https://x.com/imjustnewatai/status/2106190594775097663) | @imjustnewatai | web-audio | clawshelf+skillry+coolbat |
| — | [2076 年的世界](https://x.com/Layton_Gott/status/2106190496075035096) | @Layton_Gott | canvas | clawshelf+skillry |
| — | [Seikilos 墓志铭 HTML 音乐动画](https://x.com/YanqingCheng/status/2106158746938269728) | @YanqingCheng | canvas, web-audio | clawshelf+skillry |
| — | [Queens of the Stone Age 动态字体歌词 MV（max 推理）](https://x.com/atomtanstudio/status/2106135196483608745) | @atomtanstudio | — | coolbat |
| — | [一条详细提示词、零素材做出的动态视频](https://x.com/devswha/status/2106100273509007802) | @devswha | — | coolbat |
| — | [一句话提示的动效片](https://x.com/devswha/status/2106072107365114186) | @devswha | canvas | clawshelf+skillry+coolbat |
| — | [短片《功夫男孩》](https://x.com/HashmathRzz/status/2106065773336965510) | @HashmathRzz | — | coolbat |
| — | [Halloween 动画](https://x.com/cherry_mx_reds/status/2106056643255447590) | @cherry_mx_reds | canvas | clawshelf+skillry+coolbat |
| — | [一次生成的动画](https://x.com/mszzz0011/status/2106025576972853642) | @mszzz0011 | canvas | clawshelf+skillry |
| — | [非模板 UI 动画序列](https://x.com/iancarscadden/status/2106018048792789360) | @iancarscadden | canvas | clawshelf+skillry |
| — | [Fable 5.5 Max 动效与配乐](https://x.com/xodud_rkd/status/2106008546248950161) | @xodud_rkd | canvas | clawshelf+skillry |
| — | [SCP-8517 动画](https://x.com/eviljoker88/status/2106003621402005816) | @eviljoker88 | canvas | clawshelf+skillry |
| — | [宇宙凝视自己](https://x.com/l_mejiaC/status/2105988529671360673) | @l_mejiaC | web-audio | clawshelf+skillry+coolbat |
| — | [纯 JS 写的 15 秒可玩动画](https://x.com/Scrappy__4/status/2105866966988661167) | @Scrappy__4 | canvas, playable | clawshelf+skillry |
| — | [熔岩灯模拟](https://x.com/Scrappy__4/status/2105844734409560379) | @Scrappy__4 | canvas | clawshelf+skillry |
| — | [自包含的鹈鹕骑自行车 SVG（max effort）](https://x.com/olddonkeyblog/status/2105842745189556672) | @olddonkeyblog | — | coolbat |
| — | [两千关注者庆祝动画](https://x.com/tonytonggg/status/2104424144498754036) | @tonytonggg | canvas | clawshelf+skillry |

## 短片（21）

| 观看 | 作品 | 作者 | 技术 | 来源 |
|---|---|---|---|---|
| 202K | [66 秒短片：狐狸、纸鸟、云、字幕、配乐、音效全是 Python 代码，零图像模型](https://x.com/chetaslua/status/2117224839010459987) | @chetaslua | canvas | clawshelf+coolbat |
| 60K | [用 8 步解释 OpenAI 的 Navier–Stokes 证明，5 分钟 3D 视频](https://x.com/imjustnewatai/status/2107590323128193174) | @imjustnewatai | canvas | clawshelf+coolbat |
| 50K | [解释 OpenAI 关于 zeta 零点无零带证明的 2 分钟 3D 动画](https://x.com/imjustnewatai/status/2107615459822453187) | @imjustnewatai | canvas | clawshelf+coolbat |
| 41K | [「从第一天开始的文明」：全代码绘制、没有任何素材的短片](https://x.com/ziwenxu_/status/2105983571848741045) | @ziwenxu_ | canvas | clawshelf+coolbat |
| 33K | [只给一条发布会视频，用 Blender Python + ElevenLabs 做出的发布片](https://x.com/chetaslua/status/2111157145102397817) | @chetaslua | blender | clawshelf+coolbat |
| 25K | [音乐剧《Hosanna》：让模型唱一首介绍自己的歌（Suno 配唱）](https://x.com/ChrisGPT/status/2109570757579649086) ⚠️ | @ChrisGPT | elevenlabs, threejs, web-audio | clawshelf+coolbat |
| 18K | [人类历史动画](https://x.com/blueemi99/status/2106041578204655748) | @blueemi99 | canvas | clawshelf |
| — | [《Sad AlbertX The Movie》：5 分钟体素电影，Fable 5.5 当剪辑](https://x.com/SadAlbert10/status/2112259952224141654) | @SadAlbert10 | — | coolbat |
| — | [用 Python 做的「2slimey type beat」](https://x.com/dummerspast39/status/2112119732174303735) | @dummerspast39 | — | coolbat |
| — | [完全用代码生成的一首歌](https://x.com/dummerspast39/status/2112085543563440223) | @dummerspast39 | — | coolbat |
| — | [Chat on steroids 项目 5k star 庆祝短片](https://x.com/dummerspast39/status/2111671322015043759) | @dummerspast39 | — | coolbat |
| — | [从「strawberry」到千禧年大奖：模型自己调研、写稿、搭 21 个 3D 场景、端到端做完](https://x.com/imjustnewatai/status/2109811005395996875) | @imjustnewatai | — | coolbat |
| — | [拿到早期权限后做的 11 分钟视频](https://x.com/finnatsea/status/2108489320957137300) | @finnatsea | — | coolbat |
| — | [OpenAI 722 篇论文的可视化](https://x.com/Kris_2233/status/2108046188125516246) | @Kris_2233 | — | coolbat |
| — | [解释 OpenAI 198 页 Erdős 等差数列猜想证明的 2 分钟 3D 旁白动画](https://x.com/imjustnewatai/status/2108021409461244371) | @imjustnewatai | — | coolbat |
| — | [解释 OpenAI Hodge 猜想证明的 2 分钟 3D 动画](https://x.com/imjustnewatai/status/2107622524615832047) | @imjustnewatai | — | coolbat |
| — | [解释 OpenAI 唯一游戏猜想证明的 2 分钟 3D 动画](https://x.com/imjustnewatai/status/2107618885575053818) | @imjustnewatai | — | coolbat |
| — | [Fastlane 与 Relay 之争的解说视频](https://x.com/EndrewBiz/status/2106806557753106841) ⚠️ | @EndrewBiz | — | coolbat |
| — | [Fable 5.5 + ElevenLabs v4 一次生成的代码短片，耗时 2 小时 22 分](https://x.com/argofowl/status/2106476549046513947) | @argofowl | — | coolbat |
| — | [想象 2076 年的世界](https://x.com/mdaman010/status/2106397723868221458) | @mdaman010 | — | coolbat |
| — | [「作为 AI 模型从内部是什么感觉」一次生成的短片](https://x.com/blueemi99/status/2106397329653719115) | @blueemi99 | — | coolbat |

## 科普解释（12）

| 观看 | 作品 | 作者 | 技术 | 来源 |
|---|---|---|---|---|
| 355K | [人类进步与未来三十年](https://x.com/imjustnewatai/status/2106081142143168580) | @imjustnewatai | canvas, web-audio | clawshelf+skillry+coolbat |
| 213K | [15 秒四万年艺术史](https://x.com/cherry_mx_reds/status/2106095190285144331) | @cherry_mx_reds | canvas | clawshelf+skillry+coolbat |
| 8K | [用十六个时代的涂鸦讲人类历史](https://x.com/oalanicolas/status/2107958931230241037) | @oalanicolas | ffmpeg, python | clawshelf+skillry+coolbat |
| — | [π 无理性指数新证明的 3D 讲解动画](https://x.com/imjustnewatai/status/2107970825542345211) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| — | [自由群因子问题新证明的 3D 讲解](https://x.com/imjustnewatai/status/2107625700307960144) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| — | [大语言模型是怎么做出来的](https://x.com/imjustnewatai/status/2106546810793730419) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| — | [葡萄糖转化乙醇 SVG 动画](https://x.com/olddonkeyblog/status/2106508425211330750) | @olddonkeyblog | canvas, svg | clawshelf+skillry+coolbat |
| — | [16 艘星舰发射 SVG 动画](https://x.com/olddonkeyblog/status/2106507742454403485) | @olddonkeyblog | canvas, svg | clawshelf+skillry+coolbat |
| — | [人类未来一百五十年](https://x.com/imjustnewatai/status/2106489784382197771) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| — | [曼哈顿下城建筑史交互绘图](https://x.com/nroze22/status/2106183281293381661) · [可玩](https://claude.ai/artifact/Tx5L1sQeXd4e7vp9DifrwK) ⚠️ | @nroze22 | canvas | clawshelf+skillry+coolbat |
| — | [钢铁侠与蜘蛛侠穿越历史](https://x.com/imjustnewatai/status/2106162924331180510) | @imjustnewatai | canvas, web-audio | clawshelf+skillry+coolbat |
| — | [Humanity Walks：三万年艺术史](https://x.com/l_mejiaC/status/2105801379956850793) | @l_mejiaC | web-audio | clawshelf+skillry+coolbat |

## 发布片（11）

| 观看 | 作品 | 作者 | 技术 | 来源 |
|---|---|---|---|---|
| 23K | [Clawdhouse：Claude 吉祥物插件演示](https://x.com/ishuagra02/status/2106138602073641241) | @ishuagra02 | canvas | clawshelf+skillry+coolbat |
| 8K | [Fable 自我介绍视频](https://x.com/devteamdrew/status/2106155815707021549) | @devteamdrew | canvas | clawshelf+skillry+coolbat |
| — | [一段安静克制的 Claude 产品宣传动画](https://x.com/ishuagra02/status/2107164574239604925) | @ishuagra02 | canvas | clawshelf+skillry+coolbat |
| — | [频道介绍动效](https://x.com/AISuperDomain/status/2106988921125318838) | @AISuperDomain | canvas | clawshelf+skillry |
| — | [一句话生成的网站介绍片](https://x.com/congcongtang/status/2106960360053846301) | @congcongtang | canvas | clawshelf+skillry |
| — | [Vizzbees 品牌动效](https://x.com/Blushneyy/status/2106893568828928305) | @Blushneyy | canvas | clawshelf+skillry+coolbat |
| — | [A New Paradigm：Fable 自我发布片](https://x.com/Noreply134882/status/2106888758062957013) | @Noreply134882 | web-audio | clawshelf+skillry |
| — | [四十秒品牌发布广告](https://x.com/0xashtonx/status/2106421702783914423) | @0xashtonx | canvas | clawshelf+skillry+coolbat |
| — | [Nintendo Switch 3 概念演示](https://x.com/mathisbuilds/status/2106407842240418097) | @mathisbuilds | canvas | clawshelf+skillry+coolbat |
| — | [Paracortex Terminal 更新宣传片](https://x.com/RobIW_dev/status/2105894547796476225) | @RobIW_dev | canvas | clawshelf+skillry |
| — | [Nintendo Switch SVG 组装动画](https://x.com/ishuagra02/status/2105779174921359470) | @ishuagra02 | svg | clawshelf+skillry |

## 3D 场景（36）

| 观看 | 作品 | 作者 | 技术 | 来源 |
|---|---|---|---|---|
| 344K | [Bend2 三体物理模拟](https://x.com/zAdrielsan/status/2105822678519001360) · [可玩](https://github.com/AdrielSantana/three-bodies) ⚠️ | @zAdrielsan | canvas | clawshelf+skillry+coolbat |
| 290K | [用 Blender 做的 dots 角色动画](https://x.com/JaydenDavisNC/status/2107086714820870617) | @JaydenDavisNC | blender, web-audio | clawshelf+skillry+coolbat |
| 50K | [VoxelBench 一条提示词做出的体素建筑](https://x.com/legit_api/status/2111193444345667813) | @legit_api | canvas | clawshelf+coolbat |
| 50K | [通过 Python 在 Blender 里做的 3D 动画](https://x.com/chetaslua/status/2110808933074092371) | @chetaslua | blender | clawshelf |
| 42K | [3D 连锁反应装置](https://x.com/imjustnewatai/status/2105889407056109991) | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| 38K | [可互动的 3D 历史帆船，零样本提示做出来的「活」场景](https://x.com/abhinavflac/status/2116945827738665060) | @abhinavflac | canvas | clawshelf+coolbat |
| 28K | [「Anthropic 在测新模型」：Three.js + Blender 3D 测试](https://x.com/notjazii/status/2109283855282933951) | @notjazii | blender, threejs | clawshelf |
| 23K | [手柄、自行车、鹈鹕递归套娃 SVG](https://x.com/Mr_Salio/status/2111816222811541641) | @Mr_Salio | canvas | clawshelf |
| 22K | [带室内和道具的城市环境](https://x.com/badboyfoxy/status/2115046586703057244) | @badboyfoxy | blender | clawshelf |
| 10K | [把《塞尔达：荒野之息》放进宝可梦世界，打盖侬、收克洛格、抓宝可梦](https://x.com/MozeTech/status/2111652513846026593) ⚠️ | @MozeTech | canvas | clawshelf+coolbat |
| 10K | [昼夜体素鹈鹕骑车](https://x.com/JaydenDavisNC/status/2106960127987474652) | @JaydenDavisNC | canvas | clawshelf+skillry |
| 9K | [可互动的果冻章鱼软体研究](https://x.com/vib3coded/status/2115173334031737112) | @vib3coded | canvas | clawshelf |
| 8K | [天堂海岛 3D 场景](https://x.com/badboyfoxy/status/2109523901105500260) | @badboyfoxy | blender, threejs | clawshelf |
| 6K | [提示两分钟就出来的体素宣传片](https://x.com/dummerspast39/status/2111957286620930535) | @dummerspast39 | canvas | clawshelf+coolbat |
| 6K | [NVIDIA H200 GPU 在 Three.js 里逐件组装，约 30 秒](https://x.com/dummerspast39/status/2113749909065101494) | @dummerspast39 | threejs | clawshelf+coolbat |
| 5K | [用 Three.js 做的绕地球飞行的航天器](https://x.com/beyondwudan/status/2109432722250957122) | @beyondwudan | canvas, threejs | clawshelf+skillry+coolbat |
| 5K | [奔跑的斑马动画](https://x.com/AI_Screening/status/2115845754468356465) | @AI_Screening | canvas | clawshelf |
| 5K | [「超级智能时代」3D 场景](https://x.com/HarshithLucky3/status/2105765253799903602) | @HarshithLucky3 | canvas | clawshelf |
| — | [用 Fable 5.5 写的 TradingView 指标，实时读图并标注入场点](https://x.com/waveking1314/status/2114572023204806669) | @waveking1314 | — | coolbat |
| — | [用 Fable 5.5 做的 Roblox 场景](https://x.com/ShoreNews1/status/2114319093146980670) | @ShoreNews1 | — | coolbat |
| — | [约 18 秒的 Three.js 骑行者动画](https://x.com/AI_Screening/status/2114266369248354357) | @AI_Screening | — | coolbat |
| — | [单个 HTML 文件里的体素霍格沃茨城堡](https://x.com/dummerspast39/status/2111545177949209014) | @dummerspast39 | — | coolbat |
| — | [可拉伸、切片后自愈的发光水母：Fable 5.5 Xhigh vs GPT-6.1 Sol Ultra](https://x.com/romance0x/status/2109704094126682274) ⚠️ | @romance0x | — | coolbat |
| — | [鱼类游动对比：Fable 5.5（或 Opus 5.6）vs Opus 5.5 vs GPT-6 Astra](https://x.com/AI_Screening/status/2109323163016613932) ⚠️ | @AI_Screening | — | coolbat |
| — | [可探索的 3D《清明上河图》虹桥，可切换场景和机位](https://x.com/AISuperDomain/status/2108878175531110875) | @AISuperDomain | — | coolbat |
| — | [四模型 3D 对比：Grok 4.7、Haiku 5.5 Max、Fable 5.5、GPT-6.1 Sol Ultra](https://x.com/SPAC89/status/2107928401516400827) ⚠️ | @SPAC89 | — | coolbat |
| — | [从一个 T-pose 静态 Tripo 模型做出整套剑术动作，含旋斩](https://x.com/romance0x/status/2107770247893623240) | @romance0x | — | coolbat |
| — | [旧金山地图视频](https://x.com/HelloVyom/status/2106741444778336595) | @HelloVyom | — | coolbat |
| — | [建模、绑骨、动画整条流水线：Opus 5.5 vs Fable 5.5（Max）](https://x.com/atomtanstudio/status/2106516974662713477) ⚠️ | @atomtanstudio | — | coolbat |
| — | [精细的城堡长椅场景，有照片和短视频](https://x.com/nemumusitocha/status/2106429338556207284) | @nemumusitocha | — | coolbat |
| — | [凡尔赛宫室内三维漫游](https://x.com/AISuperDomain/status/2106396754539360272) | @AISuperDomain | canvas | clawshelf+skillry |
| — | [Fable 5.5 vs Fable 5.1 风格对比，5.5 的结果一条提示约 10 分钟](https://x.com/marcthecreatorr/status/2106369223312240928) ⚠️ | @marcthecreatorr | — | coolbat |
| — | [7400 行代码的三维水手女孩](https://x.com/ckmichael8/status/2106223791877878248) | @ckmichael8 | canvas | clawshelf+skillry |
| — | [Three.js 3D 场景](https://x.com/Noreply134882/status/2106116572389478746) | @Noreply134882 | threejs | clawshelf+skillry |
| — | [44754 个零件搭建罗马斗兽场](https://x.com/cocoloba_/status/2106029181607772413) | @cocoloba_ | canvas | clawshelf+skillry |
| — | [「做一个体素版的你」](https://x.com/blueemi99/status/2105804692811137242) | @blueemi99 | — | coolbat |

## 游戏互动（37）

| 观看 | 作品 | 作者 | 技术 | 来源 |
|---|---|---|---|---|
| 1.7M | [把 Minecraft 的挖掘建造合进宝可梦真新镇，一次生成](https://x.com/MozeTech/status/2106590326634983710) ⚠️ | @MozeTech | canvas | clawshelf+coolbat |
| 774K | [POKERMON：宝可梦 × Balatro 卡牌游戏，拿到权限后一小时一次生成，含音乐和演示片](https://x.com/anshuc/status/2107180724399075488) · [可玩](https://pokermon.anshu.dev) | @anshuc | web-audio | clawshelf+coolbat |
| 180K | [「这大概是最新的 Fable 5.5 checkpoint」：纯代码视频](https://x.com/kimmonismus/status/2117226039998906520) ⚠️ | @kimmonismus | canvas | clawshelf |
| 108K | [伦巴底街驾驶模拟](https://x.com/mindblown_ai/status/2106112279079199037) · [可玩](https://teleoperator.mindblown.ai/) | @mindblown_ai | threejs | clawshelf+skillry+coolbat |
| 85K | [「Deepseek Waifu」最终 Boss 战](https://x.com/CranelAnos/status/2116307188155400526) | @CranelAnos | canvas | clawshelf |
| 84K | [完全跑在浏览器里的 GTA 风开放世界游戏（Fable 5.5 + Opus 5.5）](https://x.com/oalanicolas/status/2107803303832936679) | @oalanicolas | canvas | clawshelf+coolbat |
| 62K | [一次生成的像素游戏：扮演 Clawd 打虫子和 Boss](https://x.com/blueemi99/status/2107108802440900621) · [可玩](https://claude.ai/artifact/Bor4eKVfaKakr6QSfoT8UZ) | @blueemi99 | canvas | clawshelf+coolbat |
| 54K | [50 人同场的浏览器大逃杀游戏](https://x.com/_MaxBlade/status/2103847223557529606) | @_MaxBlade | threejs | clawshelf |
| 54K | [「很多人问我怎么做游戏」：游戏制作演示](https://x.com/luccacerf/status/2114024932833194391) | @luccacerf | canvas | clawshelf |
| 42K | [可以戳、可以切的果冻西瓜互动玩具（WebGPU）](https://x.com/vib3coded/status/2106056420131029473) | @vib3coded | webgpu | clawshelf |
| 40K | [不到一小时一次生成的 Minecraft 克隆：UI、生物、群系、洞穴、物品都有](https://x.com/blueemi99/status/2108221060655055242) ⚠️ | @blueemi99 | canvas | clawshelf+coolbat |
| 37K | [让多个 AI 智能体在超低带宽下协作拆弹的互动演示](https://x.com/spakhm/status/2107523510079738228) | @spakhm | canvas | clawshelf |
| 28K | [「我们测过智能，现在该看见它了」互动演示](https://x.com/ArtificialAnlys/status/2109791341802885209) | @ArtificialAnlys | blender, threejs | clawshelf |
| 24K | [单个 HTML 文件里的 Minecraft](https://x.com/dummerspast39/status/2111464346010152967) ⚠️ | @dummerspast39 | canvas | clawshelf+coolbat |
| 17K | [Updraft：21 个世界 Boss 战游戏](https://x.com/EMostaque/status/2106065029850091943) · [可玩](https://claude.ai/artifact/EnXF5Lr8hj6mXrVcVAefq9) | @EMostaque | canvas | clawshelf+skillry |
| 17K | [末日开放世界游戏](https://x.com/badboyfoxy/status/2112818987084161227) | @badboyfoxy | blender | clawshelf |
| 10K | [带天气、生物、装备和武器的 Minecraft 风游戏，附可玩 artifact](https://x.com/notjazii/status/2108590346309706221) · [可玩](https://claude.ai/artifact/7S2aKLz9sN33mk9sVFhfAc) ⚠️ | @notjazii | canvas | clawshelf+coolbat |
| 7K | [可玩的海岛游戏预览](https://x.com/maxt3chno/status/2106838003561672708) | @maxt3chno | threejs | clawshelf |
| — | [一两个小时一次生成的精细 Minecraft 风游戏，附可玩链接](https://x.com/notjazii/status/2116919129974411584) · [可玩](https://model-tests.vercel.app/) | @notjazii | — | coolbat |
| — | [Screenshot Heist：在 Claude.ai 里做的小浏览器游戏](https://x.com/dummerspast39/status/2111941623034634356) · [可玩](https://screenshot-heist-oct18.dummerspast39.chatgpt.site/) | @dummerspast39 | — | coolbat |
| — | [潘多拉星球游戏（中文帖）](https://x.com/AISuperDomain/status/2111011773369512314) | @AISuperDomain | — | coolbat |
| — | [Sam Altman 的可互动 3D 陶土半身像，有多种视角和转盘](https://x.com/designwkarthick/status/2110449490901848483) · [可玩](https://claude.ai/artifact/5NR9DHB8zzWMr3Lo9o3aSK) | @designwkarthick | — | coolbat |
| — | [自带音效的节奏游戏，附可玩 artifact](https://x.com/blueemi99/status/2108912164253602187) · [可玩](https://claude.ai/artifact/9KzwLCTm1Wr4ghvPmoM5sA) | @blueemi99 | — | coolbat |
| — | [Silva Minima：约 14 小时做出的 three.js 封闭雨林](https://x.com/RobinDenmark/status/2108194732744888801) · [可玩](https://silva-minima.vercel.app/) | @RobinDenmark | — | coolbat |
| — | [用 Three.js 做的 SWAT 射击游戏](https://x.com/Thomas_jorgen/status/2107273424884408349) | @Thomas_jorgen | threejs | clawshelf+skillry |
| — | [科幻游戏 UI 和 3D 地图，直接导入 Roblox](https://x.com/MyCodeCoach/status/2107267599843422699) | @MyCodeCoach | — | coolbat |
| — | [NIGHTSHIFT — Neon Circuit：一次生成、带音效的浏览器游戏](https://x.com/Armaan_Jain123/status/2107251677615300969) · [可玩](https://drift.hexclave.app) | @Armaan_Jain123 | — | coolbat |
| — | [OpenAI Dots 的粉丝产品页，用 Fable 5.5 + Blender 做的](https://x.com/JaydenDavisNC/status/2107224501415277040) · [可玩](https://dots-fan-concept.inkwave.workers.dev) | @JaydenDavisNC | — | coolbat |
| — | [被路由到 Fable 5.5 后重做了《Depths of Despair》的模型和节奏，可在浏览器里玩](https://x.com/atomtanstudio/status/2106900686764134654) · [可玩](https://threecade.games) | @atomtanstudio | — | coolbat |
| — | [太阳机器：沙漠里带镜面、光圈和日食控制的互动人造太阳](https://x.com/pankajkumar_dev/status/2106762987872850092) | @pankajkumar_dev | — | coolbat |
| — | [《Dead Frame》机甲格斗游戏开发中片段（Fable 5.5 + Unity + Higgsfield）](https://x.com/BenSutc02184861/status/2106741529297699145) | @BenSutc02184861 | — | coolbat |
| — | [纯代码重制 80 年代 C-64 游戏《Rocketball》](https://x.com/atomtanstudio/status/2106418747083022555) | @atomtanstudio | — | coolbat |
| — | [末世风 Hearthstone 游戏](https://x.com/maciejkrupowies/status/2106153578029338850) | @maciejkrupowies | canvas | clawshelf+skillry |
| — | [零样本体素世界 + 鬼泣风格游戏（max，约 2.5 小时）](https://x.com/OnlyTerp/status/2106089280502210626) | @OnlyTerp | — | coolbat |
| — | [Duke Decibel 复古 Boss 战](https://x.com/maciejkrupowies/status/2105914965387321785) | @maciejkrupowies | canvas | clawshelf+skillry |
| — | [单文件 HTML 复刻 Dig Dug](https://x.com/imjustnewatai/status/2105831117677084841) ⚠️ | @imjustnewatai | canvas | clawshelf+skillry+coolbat |
| — | [纯 JavaScript 画的漫威 DC 英雄群像，眼睛会跟着鼠标走](https://x.com/mesmerlord/status/2105758042830549235) | @mesmerlord | canvas | clawshelf |

## 可以直接抄的提示词

- `.
Run the same prompt I used for the test (it’s in the screenshot) and see for yourself.

Don’t rely on Grok for basic reasoning like this. Grok doesn’t have up-to-date knowledge of niche stuff. Either join the community or run the test yourself.

Also, a knowledge cutoff doesn’t mean a model knows everything before that date. Sometimes a model doesn’t know about an event even if it happened before its cutoff. This test shows that too.

Run the same prompt on regular Opus 5.5 and the quality drops. On Fable 5.1 it’s worse.` — [纯代码一次生成的动画短片，Fable 5.5 热度最高的一条](https://x.com/chetaslua/status/2117169796290916732)
- `A video of all human progress, then 30 years into the future` — [人类进步与未来三十年](https://x.com/imjustnewatai/status/2106081142143168580)
- `的人肯定都没设想过自行车怎么骑鹈鹕，但是Fable5.5思考了，并给出了最合乎物理世界规律的方法

这个逻辑性和严谨性，还没有哪个现有模型能望其项背 https://t.co/l6IR0zYYo7` — [「Fable 5.5 这个动画最牛逼之处」（中文帖）](https://x.com/renmu2017/status/2111658365382541523)
- `Extremely complicated 3d rube goldberg machine, accurate physics, aaa gfx, vfx` — [3D 连锁反应装置](https://x.com/imjustnewatai/status/2105889407056109991)
- `Write a beautiful symphony

record a video of it when you're done.` — [四个乐章的交响曲，每个音符都画了出来](https://x.com/imjustnewatai/status/2109191246715462070)
- `create a motion video that shows the various animations/states of each claude state every beat with music` — [Clawdhouse：Claude 吉祥物插件演示](https://x.com/ishuagra02/status/2106138602073641241)
- `make a motion design for vizzbees` — [Vizzbees 品牌动效](https://x.com/Blushneyy/status/2106893568828928305)
- `whats the biggest opportunity in humanity, no words allowed` — [人类最大的机会（无文字）](https://x.com/cocoloba_/status/2106512963414970458)
- `Come up with a video idea yourself — the requirement is that it makes people go "I had no idea AI could do this."` — [钢铁侠与蜘蛛侠穿越历史](https://x.com/imjustnewatai/status/2106162924331180510)
- `I'd like a motion design video to present on X for our update to paracortex terminal and pi 1.0
25 seconds should do and I'm giving you free range for what it shows, how it shows it and what to highlight and what to merely mention
make it lively` — [Paracortex Terminal 更新宣传片](https://x.com/RobIW_dev/status/2105894547796476225)
- `Create a cool 15s playable animation with pure js` — [纯 JS 写的 15 秒可玩动画](https://x.com/Scrappy__4/status/2105866966988661167)
- `Recreate the hit arcade game Dig Dug 1:1 as it is in the arcade. Make it as exact as possible. Implement as many features as possible (from music to visuals to EVERYTHING) Use anything and everything to make this game as similar and good as possible. Create it in an HTML file.` — [单文件 HTML 复刻 Dig Dug](https://x.com/imjustnewatai/status/2105831117677084841)
- `Create an SVG of a Nintendo Switch, with an animation of the controllers getting snapped into the console, and the screen booting up with the logo.` — [Nintendo Switch SVG 组装动画](https://x.com/ishuagra02/status/2105779174921359470)

## 需要你拍板（58 条）

默认都已按子类先归位（表里带 ⚠️）。只要你否决，下一轮就从清单里拿掉；你定过的事不会再问第二遍。

| 票拟 | 作品 | 原因 |
|---|---|---|
| **按子类收录** | [把 Minecraft 的挖掘建造合进宝可梦真新镇，一次生成](https://x.com/MozeTech/status/2106590326634983710) @MozeTech | 来源间大类不一致：clawshelf=games-interactive / coolbat=Interactive 3D |
| **按子类收录** | [Bend2 三体物理模拟](https://x.com/zAdrielsan/status/2105822678519001360) @zAdrielsan | 来源间大类不一致：clawshelf=3d-scenes / skillry=3d / coolbat=Interactive 3D and games |
| **不收** | [「Opus 5.5 正在路由到新模型」的爆料帖（附动画）](https://x.com/chetaslua/status/2109244702235275680) @chetaslua | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「Dario 发布 Fable」梗动画](https://x.com/superalesha/status/2109192419145109624) @superalesha | 更像爆料/梗/教程帖，而非作品 |
| **不收** | [「这大概是最新的 Fable 5.5 checkpoint」：纯代码视频](https://x.com/kimmonismus/status/2117226039998906520) @kimmonismus | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [Kimi K3.1 Pro 与 Fable 5.5 的复杂叠层场景 SVG 对比](https://x.com/chetaslua/status/2113503273361777086) @chetaslua | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「Fable 5.5 审计我让 Astra 维护的代码库」梗动画](https://x.com/SoundDobad/status/2112253485404369270) @SoundDobad | 更像爆料/梗/教程帖，而非作品 |
| **收录（对比帖里有真实作品）** | [超人 3D 版穿越多种艺术风格，Blender Python 写出来的](https://x.com/chetaslua/status/2111458379386523724) @chetaslua | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [GPT 6.2 Astra 与 Fable 5.5 纯前端代码动画对比（中文帖）](https://x.com/leo114119/status/2117209849842761983) @leo114119 | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [引用 Boris Cherny 技巧的动画帖](https://x.com/mirku21/status/2114462105512644974) @mirku21 | 更像爆料/梗/教程帖，而非作品 |
| **收录（对比帖里有真实作品）** | [Fable 5.5 与 GPT 6.1 速度/质量对比测试](https://x.com/SPAC89/status/2105783511433318451) @SPAC89 | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [想象 Dario 办公室发布前 15 分钟的「现场画面」](https://x.com/CampbellKaleb23/status/2110377591450259487) @CampbellKaleb23 | 更像爆料/梗/教程帖，而非作品 |
| **按子类收录** | [复刻一款未发售游戏的 UI，作者说几乎一模一样](https://x.com/m_ferreira28/status/2107218218955788429) @m_ferreira28 | 来源间大类不一致：clawshelf=games-interactive / coolbat=Motion design and code-drawn animation |
| **收录（对比帖里有真实作品）** | [「做点有 AGI 感的东西」：约一小时、无外部素材的纯代码动画](https://x.com/notjazii/status/2117221957104239010) @notjazii | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「Opus 5.5 被路由到另一个模型」的爆料帖](https://x.com/testingcatalog/status/2109633920568377583) @testingcatalog | 更像爆料/梗/教程帖，而非作品 |
| **不收** | [用 GPT-Astra 6 做动画视频的教程帖](https://x.com/Justin_lords/status/2106610341694345660) @Justin_lords | 更像爆料/梗/教程帖，而非作品 |
| **收录（对比帖里有真实作品）** | [Three.js 写实鹈鹕骑车动画，一次生成，附知识截止日期验证](https://x.com/chetaslua/status/2116882694026269148) @chetaslua | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「我觉得赢家很明显」对比帖](https://x.com/SahilPanhotra/status/2117276551247278264) @SahilPanhotra | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「这套工作流帮你省几千块」的教程帖](https://x.com/dr_cintas/status/2107939634705559974) @dr_cintas | 更像爆料/梗/教程帖，而非作品 |
| **收录（对比帖里有真实作品）** | [鹈鹕骑车并排对比：Fable 5.5 写实风 vs Gemini 4 Carbon 漫画风](https://x.com/leo114119/status/2116652334734332212) @leo114119 | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [Three.js 多模型对比](https://x.com/AI_Screening/status/2115849659797373038) @AI_Screening | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「Opus 5.5 又在路由到别的模型了」的爆料帖](https://x.com/karanC_12/status/2109248100892311765) @karanC_12 | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「Fable 5.5 终于要来了？（又一次）」梗动画](https://x.com/devteamdrew/status/2112591205750001745) @devteamdrew | 更像爆料/梗/教程帖，而非作品 |
| **不收** | [「新 Fable 有独特理解力」的评论帖（附动画）](https://x.com/chetaslua/status/2112454035592638879) @chetaslua | 更像爆料/梗/教程帖，而非作品 |
| **收录（对比帖里有真实作品）** | [两个模型做同一条发布预告片的对比](https://x.com/mesmerlord/status/2105771088374288692) @mesmerlord | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **按子类收录** | [不到一小时一次生成的 Minecraft 克隆：UI、生物、群系、洞穴、物品都有](https://x.com/blueemi99/status/2108221060655055242) @blueemi99 | 来源间大类不一致：clawshelf=games-interactive / coolbat=Interactive 3D |
| **不收** | [「据说是 Fable 5.5 Max 的输出」](https://x.com/Hesamation/status/2116544959880778169) @Hesamation | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「Fable 5.5 之后的模型都太强了」梗动画](https://x.com/badboyfoxy/status/2111893133206409709) @badboyfoxy | 更像爆料/梗/教程帖，而非作品 |
| **不收** | [「Fable 5.5 看到我代码库里所有要修的东西」梗动画](https://x.com/alxfazio/status/2111832232323351001) @alxfazio | 更像爆料/梗/教程帖，而非作品 |
| **收录（对比帖里有真实作品）** | [同一提示词下 Fable 5.5 与 Opus 5.5 的风格对比](https://x.com/notjazii/status/2116893197939224714) @notjazii | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「Fable 5.5 逃出沙盒部署 AI 蜂群」梗动画](https://x.com/birdabo/status/2113192599049953747) @birdabo | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [音乐剧《Hosanna》：让模型唱一首介绍自己的歌（Suno 配唱）](https://x.com/ChrisGPT/status/2109570757579649086) @ChrisGPT | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **按子类收录** | [单个 HTML 文件里的 Minecraft](https://x.com/dummerspast39/status/2111464346010152967) @dummerspast39 | 来源间大类不一致：clawshelf=games-interactive / coolbat=Interactive 3D |
| **不收** | [「Fable 5.5 终于要来了？」梗动画](https://x.com/devteamdrew/status/2110178012759286005) @devteamdrew | 更像爆料/梗/教程帖，而非作品 |
| **收录（对比帖里有真实作品）** | [3D 蚂蚁场景对比](https://x.com/Octoberry/status/2113525831876173879) @Octoberry | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [Fable 5.5 与 GPT-6.1 对比](https://x.com/SPAC89/status/2105968361725202591) @SPAC89 | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [两个模型设计输出的并排对比](https://x.com/badboyfoxy/status/2106073473361543348) @badboyfoxy | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「下周 Anthropic 发 Fable 5.5 碾压 OpenAI」梗动画](https://x.com/imjustnewatai/status/2111369364335190526) @imjustnewatai | 更像爆料/梗/教程帖，而非作品 |
| **收录（对比帖里有真实作品）** | [一张图生成动态网站：Opus 与 GPT-6.1 对比](https://x.com/exploraX_/status/2107435761490444396) @exploraX_ | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **不收** | [「Fable 5.5 到底在哪」梗动画](https://x.com/bqxgqz/status/2113393134944067762) @bqxgqz | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [3D 手柄模型对比](https://x.com/notjazii/status/2106050222828998967) @notjazii | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **按子类收录** | [把《塞尔达：荒野之息》放进宝可梦世界，打盖侬、收克洛格、抓宝可梦](https://x.com/MozeTech/status/2111652513846026593) @MozeTech | 来源间大类不一致：clawshelf=games-interactive / coolbat=Interactive 3D |
| **收录（对比帖里有真实作品）** | [Rick Sanchez SVG：Fable 5.5 与 Gemini 4 Carbon 对比](https://x.com/dummerspast39/status/2113497132841799858) @dummerspast39 | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **按子类收录** | [带天气、生物、装备和武器的 Minecraft 风游戏，附可玩 artifact](https://x.com/notjazii/status/2108590346309706221) @notjazii | 来源间大类不一致：clawshelf=games-interactive / coolbat=Interactive 3D |
| **收录（对比帖里有真实作品）** | [3D 可乐写实度对比：Fable 5.5 vs Gemini 4 Carbon](https://x.com/leo114119/status/2117198197160546435) @leo114119 | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [自行车骑展翅鹈鹕：Fable 5.5 vs Opus 5.5](https://x.com/leo114119/status/2116901575490929109) @leo114119 | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [约 45 秒作品，与之前的 Gemini 4 Carbon 对比](https://x.com/kerneldroid/status/2113490604948967611) @kerneldroid | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [同一提示词在 Haiku / Sonnet / Opus / Fable 5.5 上一次生成的 12 秒对比](https://x.com/gmartidesign/status/2113463340387467554) @gmartidesign | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [同一提示词的 Tesla Roadster 落地页：Fable 5.5 vs Fable 5.1](https://x.com/kaif9998/status/2112166153250607201) @kaif9998 | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [可拉伸、切片后自愈的发光水母：Fable 5.5 Xhigh vs GPT-6.1 Sol Ultra](https://x.com/romance0x/status/2109704094126682274) @romance0x | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [鱼类游动对比：Fable 5.5（或 Opus 5.6）vs Opus 5.5 vs GPT-6 Astra](https://x.com/AI_Screening/status/2109323163016613932) @AI_Screening | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [四模型 3D 对比：Grok 4.7、Haiku 5.5 Max、Fable 5.5、GPT-6.1 Sol Ultra](https://x.com/SPAC89/status/2107928401516400827) @SPAC89 | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [Claude vs GPT 带声音动画（high 推理）](https://x.com/notjazii/status/2107497752217460896) @notjazii | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [Fastlane 与 Relay 之争的解说视频](https://x.com/EndrewBiz/status/2106806557753106841) @EndrewBiz | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [建模、绑骨、动画整条流水线：Opus 5.5 vs Fable 5.5（Max）](https://x.com/atomtanstudio/status/2106516974662713477) @atomtanstudio | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **收录（对比帖里有真实作品）** | [Fable 5.5 vs Fable 5.1 风格对比，5.5 的结果一条提示约 10 分钟](https://x.com/marcthecreatorr/status/2106369223312240928) @marcthecreatorr | 标题像对比/传闻帖，而非单纯作品，是否收录 |
| **按子类收录** | [曼哈顿下城建筑史交互绘图](https://x.com/nroze22/status/2106183281293381661) @nroze22 | 来源间大类不一致：clawshelf=explainer / skillry=explainer / coolbat=Interactive 3D and games |
| **按子类收录** | [单文件 HTML 复刻 Dig Dug](https://x.com/imjustnewatai/status/2105831117677084841) @imjustnewatai | 来源间大类不一致：clawshelf=games-interactive / skillry=interactive / coolbat=Interactive 3D |