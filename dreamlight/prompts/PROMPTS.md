# 《小芽与风的种子》GPT 生图提示词

用法：在 ChatGPT（GPT 图像模型）里先依次生成下方「角色设定图」，并在同一对话中把设定图作为参考，
再逐镜生成。画幅一律选 **横版 3:2 (1536×1024)**。生成后按镜头编号保存到 `assets/ep{N}/{镜头ID}.png`，
然后运行 `python3 tools/build_manifest.py`，播放器会自动用 GPT 画面替换程序绘制画面。

## 统一画风（每条提示词已自动带上）

> Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark

## 角色设定图（先生成，保持角色一致）

### XIAOYA

```
Character design sheet, front view, side view and three expressions, plain warm paper background. Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons.
```

### XUXU

```
Character design sheet, front view, side view and three expressions, plain warm paper background. Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xuxu, a small round wind spirit made entirely of soft white dandelion fluff, about the size of a melon, two tiny shiny black bead eyes, a single bright green leaf sprouting from its top, faint warm glow, loose dandelion seeds trailing behind it.
```

### XUXU_BIG

```
Character design sheet, front view, side view and three expressions, plain warm paper background. Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xuxu grown huge, a giant fluffy white dandelion-fluff wind spirit as big as a bus, two black bead eyes, a green leaf on top, glowing softly, strong enough to carry a child on its back.
```

### GRANDMA

```
Character design sheet, front view, side view and three expressions, plain warm paper background. Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Grandma, a kind elderly Chinese woman with silver hair in a neat bun, round wire glasses, an indigo cotton jacket and a faded floral apron, gentle wrinkled smile.
```

### MOM

```
Character design sheet, front view, side view and three expressions, plain warm paper background. Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Mom, a tired Chinese woman in her early thirties, dark hair in a loose ponytail, beige trench coat, office lanyard, kind eyes with dark circles.
```

### OLDBUILDING

```
Character design sheet, front view, side view and three expressions, plain warm paper background. Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. a five-story 1980s Chinese red-brick apartment building with green-painted balconies, laundry lines, potted plants and pigeons, its windows subtly arranged like a sleepy kind face.
```

### FOGMAN

```
Character design sheet, front view, side view and three expressions, plain warm paper background. Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Mister Grey, a towering faceless figure made of grey fog and city smog wearing a tall fog top hat, colors draining into grey wherever it passes.
```

### RHINO

```
Character design sheet, front view, side view and three expressions, plain warm paper background. Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. the Iron Rhino, a yellow excavator imagined as a giant mechanical rhinoceros with two round headlight eyes and rusty armor plates.
```

### DRIVER

```
Character design sheet, front view, side view and three expressions, plain warm paper background. Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. a weary construction worker in his forties wearing a dusty orange vest and yellow hard hat, gentle tired face.
```

## 第1集 · 雨天的水洼（融合 · 梦与现实第一次重叠）

幼儿园放学，妈妈迟到了。小芽在水洼里看见另一片晴空，风的种子「絮絮」从倒影里浮了出来。红绿灯变成灯笼，汽车变成打呼噜的甲虫——这个世界，从此有了第二层。

**e1s01** · 5s · 标题卡：第一集 雨天的水洼

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Title-card background: a single dandelion seed floating over a rain-spotted puddle reflecting a pale blue sky, soft paper texture, lots of empty space.
```

**e1s02** · 7s · 旁白：妈妈说，下午五点来接我。可是钟上的长针，已经走过好多好多圈了。

参考设定图：XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Wide shot, a small kindergarten gate on a rainy Chinese city street at dusk, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons standing alone under the dripping eaves, wet asphalt reflecting warm shop lights, grey-blue rain, umbrellas passing far away.
```

**e1s03** · 6s · 小芽：咦？水洼里面……是晴天？

参考设定图：XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Low angle close shot, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons crouching over a large puddle on the sidewalk; the puddle impossibly reflects a bright summer sky with huge white cumulus clouds shaped like whales, while the real sky above is grey and rainy.
```

**e1s04** · 7s · 絮絮：嘘——你看得见我？大人们都看不见我的。

参考设定图：XUXU

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Magical moment, Xuxu, a small round wind spirit made entirely of soft white dandelion fluff, about the size of a melon, two tiny shiny black bead eyes, a single bright green leaf sprouting from its top, faint warm glow, loose dandelion seeds trailing behind it rising up out of the puddle's bright reflected sky, ripples of light spreading, dandelion seeds swirling upward, rain drops frozen and glittering around it.
```

**e1s05** · 7s · 小芽：红绿灯变成灯笼了！汽车……在打呼噜！

参考设定图：XIAOYA, XUXU

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. The rainy city street transformed through a child's imagination: traffic lights have become glowing red paper lanterns, parked cars have become sleepy giant beetles with headlight eyes half closed, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons and Xuxu, a small round wind spirit made entirely of soft white dandelion fluff, about the size of a melon, two tiny shiny black bead eyes, a single bright green leaf sprouting from its top, faint warm glow, loose dandelion seeds trailing behind it watching in wonder.
```

**e1s06** · 6s · 旁白：那天我才知道，雨伞是会飞的，就像海里的水母。

参考设定图：XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Dozens of colorful umbrellas floating up into the rainy sky like jellyfish with trailing ribbons, glowing softly, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons small at the bottom of the frame looking up with arms open.
```

**e1s07** · 6s · 妈妈：小芽！对不起，对不起……妈妈又加班了。

参考设定图：MOM, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Mom, a tired Chinese woman in her early thirties, dark hair in a loose ponytail, beige trench coat, office lanyard, kind eyes with dark circles running up out of breath with a dripping umbrella and kneeling to hug Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons at the kindergarten gate, a tiny white fluff ball hiding in the girl's raincoat hood, rainy evening light.
```

**e1s08** · 8s · 絮絮：我叫絮絮，是风的种子。你勇敢一点，我就会长大一点。

参考设定图：MOM, XIAOYA, XUXU

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Seen from behind, Mom, a tired Chinese woman in her early thirties, dark hair in a loose ponytail, beige trench coat, office lanyard, kind eyes with dark circles and Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons walking home hand in hand down a quiet night street after rain, wet road reflecting streetlights, Xuxu, a small round wind spirit made entirely of soft white dandelion fluff, about the size of a melon, two tiny shiny black bead eyes, a single bright green leaf sprouting from its top, faint warm glow, loose dandelion seeds trailing behind it peeking out of the girl's hood glowing like a tiny moon.
```

**e1s09** · 5s · 标题卡：下一集 会呼吸的老楼

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Title-card background: an old red-brick apartment balcony with potted flowers at golden hour, soft paper texture, lots of empty space.
```

## 第2集 · 会呼吸的老楼（融合 · 爱的地方也有灵魂）

周末去外婆家。外婆的老楼会呼吸、会眨眼，屋顶上的菜园里风是甜的。可墙上出现了一个红红的大字——小芽第一次听说「拆」。

**e2s01** · 5s · 标题卡：第二集 会呼吸的老楼

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Title-card background: laundry drying on a line between old balconies, sunlight through white sheets, soft paper texture, lots of empty space.
```

**e2s02** · 7s · 旁白：周末，我们去外婆家。外婆住在一栋会呼吸的老楼里。

参考设定图：OLDBUILDING, XIAOYA, XUXU

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Bright summer morning, a five-story 1980s Chinese red-brick apartment building with green-painted balconies, laundry lines, potted plants and pigeons, its windows subtly arranged like a sleepy kind face towering under a huge blue sky with cumulus clouds, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons tiny at the bottom looking up, Xuxu, a small round wind spirit made entirely of soft white dandelion fluff, about the size of a melon, two tiny shiny black bead eyes, a single bright green leaf sprouting from its top, faint warm glow, loose dandelion seeds trailing behind it floating beside her, cicada-summer atmosphere.
```

**e2s03** · 7s · 老楼：呼——小芽长高啦。上回你还够不着门铃呢。

参考设定图：OLDBUILDING

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Close view of a five-story 1980s Chinese red-brick apartment building with green-painted balconies, laundry lines, potted plants and pigeons, its windows subtly arranged like a sleepy kind face whose windows have gently opened like eyes and whose balcony curtains breathe in and out like a sleeping giant, warm and friendly, sunlight and floating dust.
```

**e2s04** · 7s · 外婆：这些花啊，跟外婆一样老啦。可是每年，它们还是会开。

参考设定图：GRANDMA, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. A lush rooftop vegetable garden on top of the old building: tomatoes, scallions, sunflowers in old enamel basins, pigeons, Grandma, a kind elderly Chinese woman with silver hair in a neat bun, round wire glasses, an indigo cotton jacket and a faded floral apron, gentle wrinkled smile watering plants with a tin can while Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons holds a ripe red tomato, city rooftops stretching behind.
```

**e2s05** · 7s · 絮絮：这里的风，是甜的！

参考设定图：XUXU, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Golden sunset on the rooftop garden, Xuxu, a small round wind spirit made entirely of soft white dandelion fluff, about the size of a melon, two tiny shiny black bead eyes, a single bright green leaf sprouting from its top, faint warm glow, loose dandelion seeds trailing behind it tumbling joyfully through the warm wind scattering seeds, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons spinning with her arms wide, long shadows, glowing orange clouds.
```

**e2s06** · 6s · 小芽：外婆，墙上这个红红的字……是什么怪兽？

参考设定图：XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Ominous shot of the building's brick wall with a huge red painted Chinese character '拆' inside a circle, the paint dripping, in the girl's imagination it looks like a red monster's face, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons small and seen from behind looking up at it.
```

**e2s07** · 7s · 外婆：……那是一个「拆」字。意思是，老楼要搬家了。

参考设定图：GRANDMA, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Quiet dusk on the rooftop, Grandma, a kind elderly Chinese woman with silver hair in a neat bun, round wire glasses, an indigo cotton jacket and a faded floral apron, gentle wrinkled smile kneeling down to eye level with Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons, holding both her small hands, a bittersweet expression, purple sky, first lights coming on in the city.
```

**e2s08** · 7s · 老楼：没关系……老东西，总是要给新东西让路的。

参考设定图：OLDBUILDING

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Night view of a five-story 1980s Chinese red-brick apartment building with green-painted balconies, laundry lines, potted plants and pigeons, its windows subtly arranged like a sleepy kind face, only a few warm windows lit, the window-eyes look sad and sleepy, moonlight, fireflies around the potted plants.
```

**e2s09** · 6s · 小芽：我不让！我会保护你的，老楼！

参考设定图：XIAOYA, XUXU

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons standing on grandma's balcony at night in her pajamas, small fists clenched, determined face, Xuxu, a small round wind spirit made entirely of soft white dandelion fluff, about the size of a melon, two tiny shiny black bead eyes, a single bright green leaf sprouting from its top, faint warm glow, loose dandelion seeds trailing behind it glowing beside her, the city lights below.
```

**e2s10** · 5s · 标题卡：下一集 灰雾来了

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Title-card background: grey fog creeping over a colorful street, colors fading at the edges, soft paper texture, lots of empty space.
```

## 第3集 · 灰雾来了（对抗 · 当颜色被吃掉）

灰雾从城市里涌出来，它走到哪里，颜色就消失在哪里。妈妈变得很凶，絮絮变得很小。小芽拿起蜡笔，第一次向「灰先生」宣战。可第二天，铁犀牛来到了老楼前。

**e3s01** · 5s · 标题卡：第三集 灰雾来了

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Title-card background: a single yellow crayon lying on grey paper, fog at the edges, soft paper texture, lots of empty space.
```

**e3s02** · 8s · 旁白：后来，灰雾来了。它走过的地方，颜色就不见了。

参考设定图：FOGMAN

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. A colorful city street being swallowed by rolling grey fog from the right side, everything the fog touches drains into grey monochrome, Mister Grey, a towering faceless figure made of grey fog and city smog wearing a tall fog top hat, colors draining into grey wherever it passes faintly visible inside the fog, the left side still warm and colorful.
```

**e3s03** · 7s · 妈妈：别闹了！妈妈很累……你就不能乖一点吗？

参考设定图：MOM, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. A small apartment kitchen at night, Mom, a tired Chinese woman in her early thirties, dark hair in a loose ponytail, beige trench coat, office lanyard, kind eyes with dark circles on the phone with a stressed face, papers and hospital forms on the table, turning sharply toward Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons who holds up a crayon drawing, the room desaturated and grey with only the drawing still colorful.
```

**e3s04** · 7s · 絮絮：小芽……我变小了。

参考设定图：XIAOYA, XUXU

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. A dim grey child's bedroom, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons sitting on the floor hugging her knees, Xuxu, a small round wind spirit made entirely of soft white dandelion fluff, about the size of a melon, two tiny shiny black bead eyes, a single bright green leaf sprouting from its top, faint warm glow, loose dandelion seeds trailing behind it shrunken to the size of a cotton ball and barely glowing, grey fog seeping under the door.
```

**e3s05** · 7s · 灰先生：小孩子，懂什么呢。没用的，没用的……

参考设定图：FOGMAN, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Low angle, Mister Grey, a towering faceless figure made of grey fog and city smog wearing a tall fog top hat, colors draining into grey wherever it passes towering over the grey street like a skyscraper, bending down toward tiny Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons in her yellow raincoat, which is the only color left in the frame.
```

**e3s06** · 8s · 小芽：我有蜡笔！红色是外婆的番茄，黄色是我的雨衣！

参考设定图：XIAOYA, XUXU

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons drawing huge crayon strokes in the air, red, yellow and green lines blooming into flowers, tomatoes and sunbeams that push the grey fog back, color flooding back into the street in a wave, Xuxu, a small round wind spirit made entirely of soft white dandelion fluff, about the size of a melon, two tiny shiny black bead eyes, a single bright green leaf sprouting from its top, faint warm glow, loose dandelion seeds trailing behind it growing brighter.
```

**e3s07** · 7s · 旁白：第二天，铁犀牛来了。它们的眼睛，是两盏不会眨的灯。

参考设定图：RHINO

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Morning at the old building, a fence of blue construction panels, two the Iron Rhino, a yellow excavator imagined as a giant mechanical rhinoceros with two round headlight eyes and rusty armor plates rumbling in through dust, their headlight eyes glaring, residents' furniture piled on the sidewalk.
```

**e3s08** · 7s · 小芽：走开！这是外婆的家！

参考设定图：XIAOYA, RHINO

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons standing alone in front of the giant the Iron Rhino, a yellow excavator imagined as a giant mechanical rhinoceros with two round headlight eyes and rusty armor plates with her arms spread wide to block it, yellow raincoat bright against the dust, the rhino's headlights blazing.
```

**e3s09** · 7s · 絮絮：小芽！你的勇气……我感觉到了！

参考设定图：XUXU_BIG, XIAOYA, RHINO

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xuxu grown huge, a giant fluffy white dandelion-fluff wind spirit as big as a bus, two black bead eyes, a green leaf on top, glowing softly, strong enough to carry a child on its back bursting up to giant size behind Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons in a storm of dandelion seeds and light, facing the the Iron Rhino, a yellow excavator imagined as a giant mechanical rhinoceros with two round headlight eyes and rusty armor plates, dramatic wind, dust and seeds swirling.
```

**e3s10** · 5s · 标题卡：下一集 铁犀牛与外婆的窗

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Title-card background: a hospital window at night with a small potted dandelion on the sill, soft paper texture, lots of empty space.
```

## 第4集 · 铁犀牛与外婆的窗（对抗 · 敌人的另一面）

外婆住进了医院。小芽骑着长大的絮絮飞过城市，要打败铁犀牛。可驾驶室里坐着一个和爸爸一样疲惫的叔叔；而灰雾的源头，是医院楼梯间里偷偷哭泣的妈妈。

**e4s01** · 5s · 标题卡：第四集 铁犀牛与外婆的窗

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Title-card background: city rooftops at dusk seen from above, a trail of dandelion seeds across the sky, soft paper texture, lots of empty space.
```

**e4s02** · 8s · 旁白：我骑着絮絮飞过屋顶。整座城市，像一盘会发光的跳棋。

参考设定图：XIAOYA, XUXU_BIG

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons riding on the back of Xuxu grown huge, a giant fluffy white dandelion-fluff wind spirit as big as a bus, two black bead eyes, a green leaf on top, glowing softly, strong enough to carry a child on its back, soaring over a dense Chinese city at dusk, thousands of warm windows like glowing board-game pieces, a vast orange and violet sky with towering clouds.
```

**e4s03** · 7s · 小芽：外婆住进了医院。妈妈说，外婆的心，累了。

参考设定图：GRANDMA, XIAOYA, XUXU_BIG

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Seen from outside through a hospital window at night, Grandma, a kind elderly Chinese woman with silver hair in a neat bun, round wire glasses, an indigo cotton jacket and a faded floral apron, gentle wrinkled smile asleep in a white hospital bed with an IV drip, a small crayon drawing taped to the wall, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons riding Xuxu grown huge, a giant fluffy white dandelion-fluff wind spirit as big as a bus, two black bead eyes, a green leaf on top, glowing softly, strong enough to carry a child on its back hovering outside the glass.
```

**e4s04** · 7s · 小芽：铁犀牛！我要打败你！

参考设定图：XIAOYA, XUXU_BIG, RHINO

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Night battle at the half-demolished old building, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons riding Xuxu grown huge, a giant fluffy white dandelion-fluff wind spirit as big as a bus, two black bead eyes, a green leaf on top, glowing softly, strong enough to carry a child on its back charging at the the Iron Rhino, a yellow excavator imagined as a giant mechanical rhinoceros with two round headlight eyes and rusty armor plates whose headlights cut through the dust, broken walls revealing old wallpaper and grandma's kitchen.
```

**e4s05** · 8s · 司机叔叔：小朋友……叔叔也不想拆。叔叔的女儿，跟你一样大。

参考设定图：DRIVER

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Inside the excavator cab at night, a weary construction worker in his forties wearing a dusty orange vest and yellow hard hat, gentle tired face with a tired gentle smile showing a small worn photo of his own five-year-old daughter clipped to the dashboard, warm cabin light, rain on the windshield.
```

**e4s06** · 7s · 铁犀牛：咕……我也只是，被派来的而已。

参考设定图：RHINO, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. The the Iron Rhino, a yellow excavator imagined as a giant mechanical rhinoceros with two round headlight eyes and rusty armor plates lowering its huge head, rusty tears running from its headlight eyes, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons reaching out to touch its metal nose, soft rain, sad and tender mood.
```

**e4s07** · 7s · 旁白：我跟着灰雾一直走，一直走，走到了它开始的地方。

参考设定图：XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons seen from behind climbing a dim hospital stairwell, a thin river of grey fog flowing down the steps toward her from above, a green exit sign glowing.
```

**e4s08** · 8s · 小芽：原来……灰雾，是妈妈的眼泪。

参考设定图：MOM

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Mom, a tired Chinese woman in her early thirties, dark hair in a loose ponytail, beige trench coat, office lanyard, kind eyes with dark circles sitting alone on the hospital stairs with her face in her hands, crying quietly, grey fog softly rising from her tears and drifting down the stairwell, lonely fluorescent light.
```

**e4s09** · 8s · 小芽：妈妈不哭。我把黄色借给你。

参考设定图：XIAOYA, MOM

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons hugging Mom, a tired Chinese woman in her early thirties, dark hair in a loose ponytail, beige trench coat, office lanyard, kind eyes with dark circles tightly on the stairs and pressing a yellow crayon into her hand, warm golden color spreading out from the two of them and dissolving the grey fog.
```

**e4s10** · 5s · 标题卡：下一集 风的种子

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Title-card background: a dandelion clock against a dawn sky, seeds just starting to drift, soft paper texture, lots of empty space.
```

## 第5集 · 风的种子（领悟 · 离开，是另一种留下）

外婆醒了，指着窗台上的蒲公英说：它要飞走，才能在别的地方开花。老楼向小芽道谢；絮絮化作一千颗种子散向城市。第二年春天，新楼的墙缝里开出了一朵蒲公英。

**e5s01** · 5s · 标题卡：第五集 风的种子

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Title-card background: morning light on a white hospital curtain, a shadow of a dandelion, soft paper texture, lots of empty space.
```

**e5s02** · 8s · 外婆：小芽，你看蒲公英。它要飞走，才能在别的地方开花呀。

参考设定图：GRANDMA, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Bright morning hospital room, Grandma, a kind elderly Chinese woman with silver hair in a neat bun, round wire glasses, an indigo cotton jacket and a faded floral apron, gentle wrinkled smile awake and smiling, sitting up in bed holding a dandelion clock, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons leaning on the bed, sunlight pouring through the window, seeds drifting in the light.
```

**e5s03** · 8s · 小芽 / 外婆：「可我不想老楼飞走，也不想你飞走。」「傻孩子，外婆会一直待在你心里的风里。」

参考设定图：GRANDMA, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Close two-shot, Grandma, a kind elderly Chinese woman with silver hair in a neat bun, round wire glasses, an indigo cotton jacket and a faded floral apron, gentle wrinkled smile gently patting Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons's head, the girl's eyes full of tears but trying to smile, warm sunlight, a soft breeze moving the curtain.
```

**e5s04** · 8s · 老楼：谢谢你，小芽。能被一个孩子这样爱过，我已经很满足了。

参考设定图：OLDBUILDING, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Last day of a five-story 1980s Chinese red-brick apartment building with green-painted balconies, laundry lines, potted plants and pigeons, its windows subtly arranged like a sleepy kind face, empty balconies, the window-eyes now smiling peacefully and closing, former residents waving goodbye from the street, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons waving, golden afternoon light.
```

**e5s05** · 8s · 絮絮：小芽，我要变成一千颗种子啦。等你长大一点，就会到处看见我。

参考设定图：XUXU_BIG

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xuxu grown huge, a giant fluffy white dandelion-fluff wind spirit as big as a bus, two black bead eyes, a green leaf on top, glowing softly, strong enough to carry a child on its back gently dissolving into thousands of glowing dandelion seeds that scatter across the dawn sky over the whole city, its bead eyes smiling one last time.
```

**e5s06** · 7s · 小芽：絮絮——再见——！

参考设定图：XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons seen from behind on a rooftop at dawn, waving with both arms at a sky full of drifting glowing dandelion seeds, wind blowing her raincoat.
```

**e5s07** · 9s · 旁白：第二年春天，新楼盖好了。外婆的番茄，搬到了新阳台上。

参考设定图：GRANDMA, MOM, XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Next spring, a new bright apartment building with a community garden in front, Grandma, a kind elderly Chinese woman with silver hair in a neat bun, round wire glasses, an indigo cotton jacket and a faded floral apron, gentle wrinkled smile walking with a cane, Mom, a tired Chinese woman in her early thirties, dark hair in a loose ponytail, beige trench coat, office lanyard, kind eyes with dark circles relaxed and smiling, Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons holding both their hands, tomato seedlings and blossoms, gentle breeze.
```

**e5s08** · 8s · 小芽：大人们看不见的东西，其实一直都在。只要你，愿意蹲下来看。

参考设定图：XIAOYA

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Xiaoya, a 5-year-old Chinese girl with a short black bob haircut and straight bangs, round rosy cheeks, big curious dark eyes, wearing a bright yellow raincoat over a blue-and-white striped shirt, red rubber boots, a small canvas bag of crayons crouching to look at a single yellow dandelion growing out of a crack in the new pavement, beside it a small puddle reflecting a faint whale-shaped cloud, a tiny wisp of white fluff with two bead eyes winking from the flower.
```

**e5s09** · 7s · 标题卡：完 小芽与风的种子

```
Hand-painted 2D animated feature film still in the classic Japanese hand-drawn studio tradition of the 1980s-2000s: poster-colour (gouache) background paintings with visible brush texture, towering cumulus clouds with soft lavender-blue shadows, lush layered foliage, warm nostalgic natural light, simple rounded character designs with thin brown ink outlines and flat two-tone cel shading, cinematic 16:9 composition from a child's eye level, no text, no captions, no watermark. Final card background: a wide spring meadow at the edge of a city, countless dandelion seeds drifting into a blue sky, soft paper texture, lots of empty space.
```
