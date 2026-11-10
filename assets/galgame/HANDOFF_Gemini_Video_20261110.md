# 交接任务书：周清禾引导页 · Gemini 视频补齐（6 条）

> 交接对象：下一个 Agent
> 项目：`F:\AI-Workspace\Claude\嘉欣同桌\galgame`
> 入口：`index.html`
> 数据：`assets/js/data.js`
> 目标：用 Edge 已登录的 Gemini（Computer Use）把页面里仍然只有图片的 6 个场景补成 1080p 循环视频，并接入页面、完成验收。
> 硬性要求：**不要再用本地 MiniMax H3**；所有新视频走 Gemini；不要动 UI 贴纸、身份卡、拍立得、道具。

---

## 0. 一句话目标

把第二幕 B2~B5、走读地图 D7、以及重做的 D4 梧桐河道夜骑，共 **6 条**场景视频，用 Gemini 生成并接入页面；每条最终为 **1920×1080 / 16:9 / 约 5 秒 / 无音频 / 可循环**。

---

## 1. 项目路径与当前状态

- 项目根：`F:\AI-Workspace\Claude\嘉欣同桌\galgame`
- 页面：`index.html`
- 数据：`assets/js/data.js`
- 场景图：`assets/bg/`
- 视频：`assets/video/`
- 本地预览：
  ```bash
  cd "F:\AI-Workspace\Claude\嘉欣同桌\galgame"
  python -m http.server 8123
  ```
  打开 `http://localhost:8123/`。
- 当前页面版本查询串：`?v=20261110x`。改完后统一改成 `?v=20261110y`（7 处）。

当前视频状态：

| 场景 | 现状 |
|---|---|
| B1 水房 | 已有视频，**不要动** |
| B2 冷水池 | 仅图片，`data.js` 的 `video` 为空 |
| B3 百米外的伞 | 仅图片，`video` 为空 |
| B4 曲奇铁盒 | 仅图片，`video` 为空 |
| B5 十九块九 | 仅图片，`video` 为空 |
| B6 二楼深夜 | 已有视频，**不要动** |
| D1 数学 / D2 语音室 / D3 欠条 / D5 车棚 / D6 旧书店 | 已有视频，**不要动** |
| D4 梧桐河道夜骑 | 已有视频，但**很丑，必须重做** |
| D7 极光网咖 | 仅图片，地图 `video` 为空 |
| C0 第三幕舞台 | 已有视频，**不要动** |

---

## 2. 本次只做这 6 条

| 编号 | 场景 | 源图 | 目标文件 | 动作 |
|---|---|---|---|---|
| B2 | 冷水池 | `assets/bg/B2_cold_water_wash.png` | `assets/video/B2_cold_water.mp4` | 新生成 |
| B3 | 百米外的伞 | `assets/bg/B3_father_rain_umbrella.png` | `assets/video/B3_umbrella.mp4` | 新生成 |
| B4 | 曲奇铁盒 | `assets/bg/B4_mother_hands_cookie_tin.png` | `assets/video/B4_cookie_tin.mp4` | 新生成 |
| B5 | 十九块九 | `assets/bg/B5_attic_mirror_mask.png` | `assets/video/B5_armor.mp4` | 新生成 |
| D7 | 极光网咖 | `assets/bg/D7_cybercafe_sleepy.png` | `assets/video/D7_cybercafe.mp4` | 新生成 |
| D4 | 梧桐河道夜骑 | **新静帧**（见第 7 节） | `assets/video/D4_night_ride.mp4` | 新静帧 + 新视频，替换旧版 |

**不要做：**
- 不要给 E1~E7 身份卡、C1~C7 拍立得、4 张课桌道具、8 枚 UI 贴纸、世界层背景生成视频。
- 不要重做 B1、B6、C0、D1、D2、D3、D5、D6。
- 不要改页面布局、文案、CSS、BGM 播放器。
- 不要使用旧 B2~B5 的奇幻视频、旧 D7 的赛博视频。
- 不要把旧 D4 图片直接拿去做视频；D4 必须先有新静帧。

---

## 3. 环境与账号

- 使用 **Edge 浏览器**，已经登录 Gemini；直接打开 `https://gemini.google.com/`。
- 右上角账户切换器里有 **三个中文名称账户**，以界面显示为准，轮流使用。
- **不要输入密码、不要创建新账号、不要使用 API Key、不要用第三方下载站。**
- 如果页面要求重新登录、验证码或密码：**停下来报告**，不要尝试绕过。
- 模型：
  - 正式片：**Veo 3.1 Quality**（或界面里最高画质的视频模型）。
  - 试镜头/排查：Veo 3.1 Fast。
  - 如果界面名称不同，记录实际使用的模型名，不要凭记忆写。
- 每条视频用一个账户生成；下载完成后再切换下一个账户，避免额度集中耗尽。
- 记录每条视频实际使用的账户中文名；不要记录密码。

---

## 4. 风格基准

- 角色锚点：长直黑发、银丝半框平光镜、白色口罩、燕麦色针织开衫、白衬衫、深蓝百褶裙；以源图为准。
- 保留源图的画风、光影、色调与构图；不要变成写实、3D、欧美、赛博、奇幻。
- 低饱和、柔和、青春恋爱感；不要过饱和橙色、满屏秋叶/灯笼。
- 画面里不要出现文字、水印、logo、额外人物、畸形肢体。
- 视频只做**轻微、连续、可循环**的运动；不要突然推拉、不要切镜、不要 morph。

---

## 5. 通用生成规范

- 用源图作为首帧/参考图，不要纯文生视频。
- 时长 5 秒；如果 Gemini 输出 8 秒，剪到 5 秒；如果只有 4 秒，保留 4 秒，页面会循环。
- 分辨率：优先 1920×1080；如果 Gemini 只给 720p，用 ffmpeg lanczos 超分到 1920×1080，并在 manifest 记录源分辨率。
- 帧率：24fps。
- 编码：H.264 / yuv420p / faststart。
- **去掉音频**：页面视频静音，BGM 独立播放。
- 循环：优先选首尾构图接近的片段；不要用明显的镜头运动。
- 负面词统一包含：
  ```text
  text, letters, watermark, logo, signature, extra people, extra limbs, deformed hands,
  deformed bicycle, spinning in place, stationary bike, camera cut, jitter, flicker,
  morphing, style change, photorealistic, 3d render, oversaturated, fantasy, sci-fi
  ```
   D4 额外加：`front view, face close-up, autumn leaves everywhere, orange overload`。

---

## 6. 逐条任务与提示词

### B2 · 冷水池

- 源图：`assets/bg/B2_cold_water_wash.png`
- 输出：`assets/video/B2_cold_water.mp4`
- 正向提示词：
  ```text
  Preserve the exact anime style, character, composition and warm dusk lighting of the reference image.
  The girl continues washing the white shirt in the concrete sink; white soap foam and water droplets move gently;
  her ponytail and cardigan sleeve sway slightly; the water surface ripples; slow, steady camera push-in;
  5 seconds, seamless loop, no camera cut, no extra people, no text, no watermark.
  ```
- 验收：洗手/揉衣服的动作自然；泡沫和水滴在动；没有奇幻泡泡；人物与源图一致。

### B3 · 百米外的伞

- 源图：`assets/bg/B3_father_rain_umbrella.png`
- 输出：`assets/video/B3_umbrella.mp4`
- 正向提示词：
  ```text
  Preserve the exact anime style, character, rainy window composition and soft melancholy of the reference image.
  Raindrops slide slowly down the glass; the girl holding the black umbrella breathes softly;
  the distant tricycle and camphor trees stay still; the curtain edge moves slightly;
  slow, gentle camera drift; 5 seconds, seamless loop, no camera cut, no extra people, no text.
  ```
- 验收：雨滴下滑；人物呼吸/发丝微动；远处三轮车不消失；没有额外人物。

### B4 · 曲奇铁盒

- 源图：`assets/bg/B4_mother_hands_cookie_tin.png`
- 输出：`assets/video/B4_cookie_tin.mp4`
- 正向提示词：
  ```text
  Preserve the exact anime style, warm attic lighting and close-up composition of the reference image.
  Close-up of the girl's hands holding the open vintage blue cookie tin; the coins glint softly;
  the pink note trembles slightly; the desk lamp light flickers gently; slow camera push-in;
  5 seconds, seamless loop, no face, no body, no extra hands, no text, no watermark.
  ```
- 验收：只出现手和铁盒；硬币有微光；便签轻颤；没有脸/胸/身体；没有额外手。

### B5 · 十九块九

- 源图：`assets/bg/B5_attic_mirror_mask.png`
- 输出：`assets/video/B5_armor.mp4`
- 正向提示词：
  ```text
  Preserve the exact anime style, character, attic mirror composition and morning light of the reference image.
  The girl gently adjusts her silver half-rim glasses and white mask in front of the mirror;
  morning sunlight and dust motes drift slowly; a few strands of hair move;
  slow, gentle camera drift; 5 seconds, seamless loop, no camera cut, no extra people, no text.
  ```
- 验收：戴眼镜/口罩的动作自然；晨光与浮尘在动；镜子里没有第二个错误人影；没有额外人物。

### D7 · 极光网咖

- 源图：`assets/bg/D7_cybercafe_sleepy.png`
- 输出：`assets/video/D7_cybercafe.mp4`
- 正向提示词：
  ```text
  Preserve the exact anime style, character, cozy internet cafe booth and soft cyan/amber lighting of the reference image.
  The girl sleeps peacefully on the leather sofa, holding math papers; her chest rises and falls slowly;
  the monitor audio waveform moves gently; the ambient light breathes softly; slow camera push-in;
  5 seconds, seamless loop, no camera cut, no extra people, no text, no cyberpunk neon.
  ```
- 验收：呼吸起伏自然；显示器波形在动；没有赛博霓虹/全息；没有额外人物。

---

## 7. D4 · 梧桐河道夜骑（重点重做）

### 7.1 旧版问题

旧 D4 的核心问题不是“画得不好看”这么简单：

- 自行车在**原地转动**，没有向前运动的参照；
- 人物正面特写、摆拍感强；
- 车轮/车架/腿部有 AI 变形；
- 橙色秋叶和灯笼过饱和，和页面的清新低饱和风格冲突。

新版必须让观众一眼看出：**两辆车在向前走，路面、树、路灯在向后 parallax，车轮在转，人物在骑。**

### 7.2 新静帧（先做图，再做视频）

优先使用本地 NAI V5：

- 脚本/风格：`立绘工程/style_preset.py` 的 `STYLE_POS / STYLE_NEG`（`V5偏live2D精致动漫`）。
- 尺寸：**1536×864**（16:9）。
- 参数：28 steps，CFG 6，`k_euler_ancestral`，CFG Rescale 0.25，随机种子，质量预设 off，UC none。
- 输出：先存 `assets/bg/D4_night_cycling_new.png`，确认后备份旧图，再覆盖 `assets/bg/D4_night_cycling.png`。

正向提示词：

```text
masterpiece, best quality, cinematic anime, 16:9, summer night, old plane-tree lined river road,
two Chinese high school students riding old bicycles side by side, viewed from rear three-quarter,
no front face close-up, correct bicycle anatomy, wheels on wet asphalt, warm yellow streetlights,
deep blue night sky, low saturation, soft rim light, motion blur on the background,
romantic youth, delicate lineart, no text, no watermark, no extra people
```

负向提示词：

```text
front view, face close-up, deformed bicycle, extra wheels, extra legs, spinning in place,
stationary bike, bike trainer, text, watermark, logo, extra people, oversaturated orange,
autumn leaves everywhere, photorealistic, 3d render, camera cut, jitter, morphing
```

静帧验收：

- 16:9；
- 两人并排骑旧单车，侧后方视角；
- 车轮、车架、腿的比例正确；
- 深蓝夜色 + 暖黄路灯，低饱和；
- 没有正面大特写、没有满屏秋叶灯笼。

如果新对接方没有 NAI 权限：用 Gemini 图像生成同一提示词的 16:9 静帧，但必须先检查上述 5 条；不合格就重抽，**不要拿旧 D4 图凑**。

### 7.3 D4 视频提示词

用新静帧做图生视频：

```text
Camera tracks alongside from a rear three-quarter view. The two bicycles move forward along the wet river road;
the wheels rotate; the road texture, plane trees and streetlights parallax past; the school coats flutter;
steady forward motion, no spinning in place, no camera cut, no sudden zoom;
5 seconds, seamless loop, anime, low saturation, warm streetlights, deep blue night, no text, no watermark.
```

负面词：

```text
spinning in place, stationary bicycle, bike on a trainer, front view, face close-up,
deformed wheels, deformed frame, extra legs, extra people, text, watermark, logo,
camera cut, jitter, flicker, morphing, oversaturated orange, autumn leaves everywhere
```

D4 验收（必须逐条看 5 秒）：

- 自行车相对路面**向前移动**，不是原地转轮；
- 背景树/路灯有向后 parallax；
- 车轮在转，车架/腿不变形；
- 两人并排，侧后方视角，不露正面大特写；
- 低饱和夜色，没有橙色过载；
- 首尾构图接近，循环不明显跳。

---

## 8. Gemini Computer Use 操作步骤

1. 打开 Edge，进入 `https://gemini.google.com/`。
2. 右上角账户切换器，选择三个中文名账户中的一个；**记录本次使用的账户名**。
3. 新建对话，上传对应源图（B2/B3/B4/B5/D7 用现有图；D4 用新静帧）。
4. 选择视频生成 / Veo；正式片选 Quality，试镜头选 Fast。
5. 粘贴第 6/7 节的正向提示词；如有独立 negative 输入框，粘贴负面词。
6. 生成后先看预览：
   - 画面风格是否与源图一致；
   - 是否有额外人物/文字/水印；
   - 运动是否自然、是否可循环；
   - D4 是否真的向前骑。
7. 不合格：同账户最多重试 2 次；仍不合格就切换下一个中文名账户，换一个重试。
8. 合格：点下载，保存到 `assets/video/gemini_raw/`，文件名用场景编号（如 `B2_raw.mp4`）。
9. 下载完成后再切换账户，继续下一条。
10. 如果三个账户都提示额度/次数用尽：停止，记录已完成/未完成清单，报告，不要创建新账号或绕过限制。
11. 如果 Gemini 界面与上述不同：截图并记录实际按钮/菜单名，按界面操作，不要猜坐标乱点。

---

## 9. 文件落盘与命名

- 原始下载：`assets/video/gemini_raw/`
- 旧文件备份：`assets/video/legacy_gemini/`
- 旧 D4 图备份：`assets/bg/legacy_gemini/`
- 最终文件：
  - `assets/video/B2_cold_water.mp4`
  - `assets/video/B3_umbrella.mp4`
  - `assets/video/B4_cookie_tin.mp4`
  - `assets/video/B5_armor.mp4`
  - `assets/video/D7_cybercafe.mp4`
  - `assets/video/D4_night_ride.mp4`
- 新 D4 静帧：`assets/bg/D4_night_cycling.png`（覆盖前先备份旧图）。

统一转码命令（按需改文件名）：

```bash
ffmpeg -y -i raw.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24" \
  -t 5 -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p \
  -movflags +faststart -an final.mp4
```

- 如果源已经是 1920×1080，仍然跑一次统一转码，确保 24fps / H.264 / 无音频。
- 如果源是 720p，上面的 scale 会 lanczos 超分到 1080p；在 manifest 记录“源 720p，已超分”。
- 不要保留音频轨道。

---

## 10. data.js / index.html 修改点

### 10.1 `assets/js/data.js`

1. `memories` 里 B2~B5 的 `video` 字段当前为空，改为：
   - B2：`'B2_cold_water.mp4'`
   - B3：`'B3_umbrella.mp4'`
   - B4：`'B4_cookie_tin.mp4'`
   - B5：`'B5_armor.mp4'`
2. `mapScenes.cybercafe.video` 当前为空，改为 `'D7_cybercafe.mp4'`。
3. D4：
   - `plays` 第 4 条（`nav: '放学路与十八场风波'`）的 `video` 已是 `'D4_night_ride.mp4'`，不用改路径，替换文件即可；
   - `mapScenes.canal.video` 已是 `'D4_night_ride.mp4'`，替换文件即可；
   - `plays` 第 4 条与 `mapScenes.canal` 的 `poster` 都是 `'D4_night_cycling.png'`，用新静帧覆盖该图。
4. **不要改** B1/B6/C0/D1/D2/D3/D5/D6 的任何路径。

### 10.2 `index.html`

- 把 7 处 `?v=20261110x` 统一改成 `?v=20261110y`（CSS 4 处 + JS 3 处）。
- 不改其他结构。

### 10.3 缓存

改完后强制刷新（Ctrl+F5），确认浏览器加载的是新视频，不是旧缓存。

---

## 11. 验收清单

### 视频文件

- [ ] 6 条 MP4 都存在，文件名正确。
- [ ] 每条 1920×1080、24fps、H.264、无音频、约 4–5 秒。
- [ ] 文件大小合理（通常 1–8MB/条）。

### 页面

- [ ] 打开 `http://localhost:8123/`，控制台无 404、无 JS 报错。
- [ ] 第二幕点 B2/B3/B4/B5 胶片卡，主画幅切换为对应视频并播放。
- [ ] 百日玩法选 D4，视频为新夜骑；走读地图点「梧桐河道」也是新夜骑。
- [ ] 走读地图点「极光网咖」，视频为 D7。
- [ ] 每个视频元素：`videoWidth=1920`、`videoHeight=1080`、`readyState=4`、`paused=false`。
- [ ] BGM 播放器仍正常，切歌/自动切章不受影响。
- [ ] 390px 移动视口无横向溢出。

### D4 专项

- [ ] 自行车相对路面向前移动，不是原地转轮。
- [ ] 背景树/路灯 parallax。
- [ ] 车轮/车架/腿无变形。
- [ ] 两人并排、侧后方视角、无正面大特写。
- [ ] 低饱和夜色，无橙色过载。

### 账号与记录

- [ ] manifest 记录每条视频使用的中文名账户、模型、尝试次数、源分辨率、输出分辨率。
- [ ] 没有记录密码、Token 或任何登录凭据。

---

## 12. Manifest 模板

保存为 `assets/video/gemini_manifest.json`：

```json
{
  "generated_at": "2026-11-10T00:00:00+08:00",
  "task": "Zhou Qinghe guide page - Gemini video fill",
  "model": "Veo 3.1 Quality",
  "videos": [
    {
      "scene": "B2",
      "source_image": "assets/bg/B2_cold_water_wash.png",
      "output": "assets/video/B2_cold_water.mp4",
      "account": "中文名账户 A",
      "attempts": 1,
      "source_resolution": "1280x720",
      "output_resolution": "1920x1080",
      "duration_sec": 5.0,
      "size_bytes": 0,
      "prompt": "...",
      "negative": "..."
    }
  ]
}
```

---

## 13. 回滚

- 旧 B2~B5、D7、D4 视频备份在 `assets/video/legacy_gemini/`。
- 旧 D4 图备份在 `assets/bg/legacy_gemini/`。
- 如果某条新视频不合格：
  1. 恢复对应备份；
  2. 如果 `data.js` 已指向新文件，先确认备份文件同名，或把 `video` 改回空/旧路径；
  3. 在 manifest 标记 `failed`，不要删除源图。
- 不要删除 `source_360/` 或其他历史备份。

---

## 14. 交付物

1. 6 条最终 MP4。
2. 新 D4 静帧 `assets/bg/D4_night_cycling.png`。
3. `assets/video/gemini_manifest.json`。
4. 更新后的 `assets/js/data.js` 与 `index.html`。
5. 一份简短验收报告：每条视频的账户、模型、耗时、分辨率、是否重试、D4 运动是否通过。
6. 备份目录说明。

---

## 15. 新对接方开场白（可直接复制）

```text
你接手「死装同桌·周清禾」引导页的 Gemini 视频补齐任务。

项目：F:\AI-Workspace\Claude\嘉欣同桌\galgame
任务书：F:\AI-Workspace\Claude\嘉欣同桌\galgame\HANDOFF_Gemini_Video_20261110.md

请先完整读任务书，再开始。硬性要求：
1) 不要用本地 MiniMax H3，全部用 Edge 已登录的 Gemini + Computer Use；
2) 三个中文名账户轮流用，不输入密码、不创建新账号；额度用尽就停并报告；
3) 只做 B2/B3/B4/B5/D7/D4 六条视频；不要动 B1/B6/C0/D1/D2/D3/D5/D6，不要动 UI 贴纸/身份卡/拍立得/道具；
4) D4 必须先做新静帧，再做图生视频；旧 D4 的问题是自行车原地转、没有前进感，必须解决；
5) 最终 1920×1080、16:9、约 5 秒、无音频、可循环；接入 data.js 并验收页面；
6) 交付 6 条 MP4、新 D4 静帧、manifest、更新后的 data.js/index.html 和验收报告。

先读任务书，然后按第 8 节 Gemini Computer Use 步骤执行；每完成一条就记录账户、模型、耗时和文件路径。遇到登录、额度、界面变化，先截图并报告，不要猜。
```
