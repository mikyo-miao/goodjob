# 死装同桌 · 周清禾 ｜ 真 Live2D Cubism 交接方案（2026-11-09）

> **2026-11-10 注**：`galgame/index.html` 已按新的「精致清新二次元 · 单页长卷」方案重构；本文件第 1 节描述的「当前五幕全屏页面」是重构前状态。真 Live2D 接入时，请以 `README.md` 与 `DESIGN-NOTES.md` 的新结构为准；旧的五幕 CSS / `opening.js` 仍保留，但已不被入口引用。

> 交付对象：下一个对话的 Agent
> 任务：把《死装同桌·周清禾》第三幕的交互立绘，从「星轨置换」升级为**真正的 Live2D Cubism `.moc3` 模型**，只做 W01 燕麦收腰学院装；其余 15 套服装保留展示、不做交互。
> 本文件是唯一总控文档。开始前先完整读完，不要凭记忆直接开工。

---

## 0. 已确认的决策（不要再问用户）

1. **只做 W01**：W01 做真骨骼/真 `.moc3`；其他 15 套服装只展示、不开放交互。
2. **母图用 A-pose**：`F:\AI-Workspace\Claude\嘉欣同桌\galgame\_rig\a_pose.png`（832×1216，透明底，已生成并验收过构图）。
3. **走真 Cubism 路线**：目标格式 `.moc3`，不接受“看起来像 Live2D 的替代格式”作为最终交付。
4. **See-through 本地跑**：不用在线 demo（在线只作为 OOM 时的应急对照，需先问用户）。
5. **当前网页保留**：现有「星轨置换」版作为 fallback，不要在上游模型验收前覆盖。
6. **8 个动作全要**：护胸后仰、抬手拨发、推眼镜、捂嘴、抱臂偏头、跺脚、转身换重心、触电缩肩。
7. 用户已确认 NAI V5 同源参数可用于补画；商业用途未确认，默认按个人/非商业处理。
8. 允许安装 JDK 21、Python 独立 venv、Node 依赖；所有大文件放 F 盘（C 盘只剩约 11GB）。

---

## 1. 当前工程状态（先读，避免重复劳动）

### 1.1 已有网页

- 根目录：`F:\AI-Workspace\Claude\嘉欣同桌\galgame`
- 入口：`index.html`
- 本地服务：`python -m http.server 8123`，页面 `http://localhost:8123/`
- 现有第三幕：`assets/js/live2d.js` 的 WebGL 网格 + 星轨置换（不是真骨骼）；`assets/flow/` 有 42 张光流图；`assets/css/beautify.css` 是本轮美化层。
- 现有档案/衣橱/秘密/开局指令均正常；不要为了上模型把 UI 推倒。

### 1.2 已生成的 A-pose

- 文件：`galgame\_rig\a_pose.png`（832×1216，RGBA，透明底）
- 生成参数：NAI V5 Full，seed `1748707176`，28 steps，CFG 6.5，CFG Rescale 0.25，`k_euler_ancestral`，画风预设 `V5偏live2D精致动漫`，透明背景开。
- 构图：正面、双臂与身体分开约 25°、双手张开、双脚可见、无口罩/围巾。
- 用途：作为 See-through 拆层与 psd2live 绑定的母图。

### 1.3 已放弃的东西（不要再用）

- `galgame\assets\rig\` 下的 `body/head/armL/armR` 及 `_up/_fore` 是上一轮硬切木偶实验，袖子在肘部撕裂、端盖穿帮，已判定不可交付。
- `galgame\assets\js\puppet.js` 与 `galgame\_rig\test.html` 是同一实验的测试页，**不要接进主页面**。
- 不要用 `J621111/live2d-automation` 之类“生成模拟 `.moc3`”的工具；它的 `ready_for_cubism_editor=false`，不是真模型。

---

## 2. 目标交付物

1. 一套可运行的 **Cubism `.moc3` 模型**：
   - `*.model3.json`
   - `*.moc3`
   - 纹理图集（PNG）
   - `*.physics3.json`、`*.motion3.json`、`*.exp3.json`（如使用）
   - `*.cdi3.json`（如工具链需要）
2. 网页预览：能加载 `.moc3`，可拖动参数、播放动作、检查穿模。
3. 接入现有 Galgame 页面第三幕：
   - 中央为真模型；点击 7 个 DOM 热区触发 8 个动作；
   - 左侧监测面板、右侧衣橱、底部纸本档案保持现有设计；
   - 其他 15 套服装切换为静态展示，不开放点击，显示“仅展示，不开放交互”。
4. 验收记录：Core 检查、Web 检查、动作截图/录屏、已知限制。

---

## 3. 环境与依赖

### 3.1 现有环境（已核对）

| 项 | 状态 |
|---|---|
| Node | `v24.14.0`，npm `11.9.0` ✅ |
| Python | `3.12.14` ✅ |
| Git | `2.53.0.windows.2` ✅ |
| GPU | RTX 4060 Laptop，8GB VRAM，驱动 591.74 ✅（紧张但可用） |
| 磁盘 | F: 剩 195GB；C: 剩 11GB（**所有大文件放 F:**） |
| Java | **未安装**，需要 JDK 21 |
| Cubism Core | 未配置，需要从官方或 PurismCore 获取 |

### 3.2 安装 JDK 21（放 F 盘）

推荐 Eclipse Temurin 21 Windows x64 zip：

- 下载：`https://adoptium.net/temurin/releases/?version=21`（选 Windows x64 `.zip`）
- 解压到：`F:\AI\tools\jdk-21`
- 当前 shell 设置：
  ```bash
  export JAVA_HOME=/f/AI/tools/jdk-21
  export PATH="$JAVA_HOME/bin:$PATH"
  java -version
  ```
- 期望：`openjdk version "21.x"`。
- 如果 `java --source 21` 报错，确认 PATH 指向 JDK 21 而不是 JRE。

### 3.3 Python 独立环境（不要污染 ComfyUI）

See-through 需要 `torch==2.8.0+cu128`，而 ComfyUI 的 venv 是 torch 2.11；**必须新建独立 venv**：

```bash
cd /f/AI-Workspace/Claude/嘉欣同桌
git clone https://github.com/shitagaki-lab/see-through.git _see_through
cd _see_through
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -U pip
pip install torch==2.8.0+cu128 torchvision==0.23.0+cu128 torchaudio==2.8.0+cu128 \
  --index-url https://download.pytorch.org/whl/cu128
pip install -r requirements.txt
```

国内网络建议：

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

模型首次运行自动下载；LayerDiff 3D + Marigold + SAM 合计可能 10–20GB，放 F 盘。

### 3.4 Cubism Core

- 官方 Cubism SDK for Web：`https://www.live2d.com/en/sdk/download/web/`
- 下载后按 `live2d-agent-kit/docs/setup.md` 的「配置本机官方 Core」放置 `live2dcubismcore.js` / `live2dcubismcore.min.js`。
- 许可：个人/小规模事业者开发与发布免出版许可（Expandable Application 除外）；本项目按个人非商业处理。
- 如果官方 Core 在 Windows 上配置困难，运行时可用 **PurismCore**（MIT，ABI 兼容 Cubism Core 5/6）或 **Ayagami**（MIT/Apache），但导出仍建议先用官方 Core 验证。

---

## 4. 推荐流水线总览

```
A-pose (已有)
  ↓
See-through 本地拆层 → 23 层 PSD（含被遮挡区域补画）
  ↓
人工/AI 图层清理与补画（眼睛闭合、嘴型、发丝、手臂、眼镜、衣服）
  ↓
live2d-agent-kit / psd2live → manifest → CMO3 + MOC3 + 图集
  ↓
官方 Cubism Core / 网页预览验证
  ↓
加参数、动作、物理（8 动作 + idle/blink/look/talk）
  ↓
PixiJS + pixi-live2d-display 接入现有第三幕
```

---

## 5. 分步执行（含检查点）

### Step 0：备份与隔离

```bash
cd /f/AI-Workspace/Claude/嘉欣同桌
cp -r galgame galgame_backup_20261109
```

- 所有新工作放在 `F:\AI-Workspace\Claude\嘉欣同桌\_live2d_work` 或 `galgame_cubism`。
- 不要在 `galgame` 里直接覆盖第三幕，直到模型通过验收。

**检查点 0**：备份目录存在，当前页面仍可打开。

---

### Step 1：live2d-agent-kit 最小示例（先验证真 `.moc3` 能导出）

```bash
cd /f/AI-Workspace/Claude/嘉欣同桌
git clone https://github.com/Ariakage/live2d-agent-kit.git _live2d_kit
cd _live2d_kit
bash scripts/doctor.sh
bash scripts/setup-psd2live.sh
java --source 21 examples/minimal-model/GenerateExample.java work/minimal/assets
bash scripts/export-model.sh work/minimal/assets/manifest.json work/minimal/low
bash scripts/validate.sh --model work/minimal/low/Minimal.model3.json
```

期望产物：

- `work/minimal/low/` 下有 `Minimal.model3.json`、`*.moc3`、纹理、`*.physics3.json` 等；
- `validate.sh` 通过；
- 网页预览能加载并显示一个几何小人。

如果失败：

- 先看 `docs/setup.md` 的 JDK/Core 配置；
- Windows 下 `bash` 用 Git Bash；如果 `psd2live` 的 Gradle/JDK 不兼容，优先尝试 **WSL2 Ubuntu 24.04** 跑同一套命令；
- 不要改用模拟 `.moc3` 的工具。

**检查点 1**：把最小示例的模型文件列表、`validate` 输出、网页预览截图发给用户确认。**通过后才进入 Step 2。**

---

### Step 2：See-through 本地拆层

```bash
cd /f/AI-Workspace/Claude/嘉欣同桌/_see_through
source .venv/Scripts/activate
export HF_ENDPOINT=https://hf-mirror.com

# 8GB 显存：优先量化管线，1024 分辨率
python inference/scripts/inference_psd_quantized.py \
  --srcp "F:/AI-Workspace/Claude/嘉欣同桌/galgame/_rig/a_pose.png" \
  --save_to_psd \
  --resolution 1024
```

如果 OOM：

1. 降到 `--resolution 896` 或 `768`；
2. 用 `inference_psd_blockswap.py`；
3. 仍 OOM 才考虑在线 ModelScope demo（先问用户）。

输出：`workspace/layerdiff_output/*.psd`（含中间 depth/mask）。

**检查点 2**：打开 PSD，检查：
- 头/脸/眼/嘴/发/躯干/裙/腿/手臂是否分开；
- 手臂是否完整（A-pose 手臂与身体分开，应该比抱臂姿势好拆）；
- 被遮挡区域是否有补画；
- 是否有明显串层（头发带衣服、手臂带裙子）。

把图层列表 + 一张分层预览图发给用户确认。

---

### Step 3：图层清理与补画

这一阶段是质量上限的关键，不要跳过。

#### 3.1 最低图层要求

按 `live2d-agent-kit/docs/manifest.md` 和 `SKILL.md` 的命名/坐标规范，至少准备：

- `body`（躯干+裙+腿+鞋，或拆成 body/skirt/legs）
- `head`（脸+前发，含眼镜）
- `hairFront` / `hairBack` / `hairSideL` / `hairSideR`
- `eyeL_open` / `eyeL_closed` / `eyeR_open` / `eyeR_closed`
- `irisL` / `irisR`
- `browL` / `browR`
- `mouth_closed` / `mouth_open`（或 3 个口型）
- `armL_upper` / `armL_fore` / `armL_hand`
- `armR_upper` / `armR_fore` / `armR_hand`
- `cardigan` / `shirt` / `skirt`
- `glasses`（如果 See-through 把眼镜并进脸，需要手动拆）
- `legL` / `legR` / `shoes`（如果要跺脚）

> psd2live 的 manifest 支持合并/拆分；先看最小示例与 Pink Sakura 的 30 层配方，再决定最终层数。不要一上来追求 30 层，先保证 8 个动作能跑。

#### 3.2 补画清单

- **闭眼层**：两只眼睛的闭合版本；可以从 NAI 生成或用 See-through/图像编辑补。闭眼不能带虹膜残影。
- **嘴型**：闭口、半开、张口；至少 3 个。
- **发丝**：前发/后发/侧发；发梢不要带衣服像素。
- **手臂**：A-pose 手臂本身是分开的，但袖口/手部可能需要补画完整轮廓；肩窝、肘部内侧如有透明缺口，用 NAI/内容感知补画。
- **眼镜**：镜框与镜片最好独立；如果并进脸，转头时会变形。
- **被遮挡区域**：See-through 已补大部分；重点检查脖子后方、手臂后方、裙下腿部。

#### 3.3 NAI 补画参数（已确认的同源参数）

- 模型：`nai-diffusion-5-full`，Anime 模式
- 尺寸：832×1216（或按局部裁剪）
- 28 steps，CFG 6.5，CFG Rescale 0.25，`k_euler_ancestral`
- 画风：`V5偏live2D精致动漫`（正/负预设）
- 透明背景开
- 种子：优先复用 `1748707176`；局部补画可随机，但保持同角色/同服装
- 质量/排除预设：off / none
- 参考：`F:\AI-Workspace\Claude\嘉欣同桌\立绘工程\还原元数据.json` 的 E01 提示词与 `style_preset.py`

补画后逐张检查：
- 颜色/光影/发丝走向与原图一致；
- 透明边缘无黑边/白边；
- 图层命名与 manifest 一致。

**检查点 3**：分层 PSD + 图层清单 + 关键图层预览（眼、嘴、手臂、眼镜）发给用户确认。

---

### Step 4：psd2live 绑定与 `.moc3` 导出

1. 阅读：
   - `live2d-agent-kit/SKILL.md`
   - `docs/workflow.md`
   - `docs/manifest.md`
   - `tools/README.md`
   - `examples/pink-sakura/README.md`（30 层、41 参数、14 动作、14 物理的完整样板）
2. 以 Pink Sakura 的 manifest 为模板，改成周清禾的图层、参数、物理。
3. 先导出 **low**（1024 图集）验证：
   ```bash
   bash scripts/export-model.sh work/zqh/assets/manifest.json work/zqh/low
   bash scripts/validate.sh --model work/zqh/low/ZhouQinghe.model3.json
   ```
4. 用网页预览检查：
   - 头部参数 `ParamAngleX/Y/Z`；
   - 眨眼 `ParamEyeLOpen/ParamEyeROpen`；
   - 口型 `ParamMouthOpenY/ParamMouthForm`；
   - 呼吸 `ParamBreath`；
   - 头发/裙摆物理。
5. 通过后再做 HD 超分（`realesr-animevideov3-x4`），保持 MOC 字节一致。

**检查点 4**：`.moc3` 在官方 Core/网页预览里能加载；转头、眨眼、张嘴、呼吸、头发物理至少各有一张截图/GIF。

---

### Step 5：参数、动作与物理

#### 5.1 标准参数（优先用 Cubism 标准 id）

- `ParamAngleX` / `ParamAngleY` / `ParamAngleZ`
- `ParamEyeLOpen` / `ParamEyeROpen`
- `ParamEyeBallX` / `ParamEyeBallY`
- `ParamMouthOpenY` / `ParamMouthForm`
- `ParamBrowLY` / `ParamBrowRY`
- `ParamBodyAngleX` / `ParamBodyAngleY` / `ParamBodyAngleZ`
- `ParamBreath`
- `ParamArmLA` / `ParamArmRA`（如 psd2live 支持标准手臂参数）
- 自定义（按 manifest 定义）：`ParamArmLUpper`、`ParamArmLFore`、`ParamArmRUpper`、`ParamArmRFore`、`ParamHandL`、`ParamHandR`、`ParamLegL`、`ParamLegR`

#### 5.2 8 个动作与热区映射

| 热区 | 动作 | 目标 | 时长 | 备注 |
|---|---|---|---|---|
| 右耳后 | 抬手拨发 | 右手抬到右耳后，拨开黑发，露挑染 | 0.9s | 手停 0.3s 再放下 |
| 平光镜/眼尾 | 推眼镜 | 右手食指推镜桥，镜片反光 | 0.7s | 手指回缩 |
| 唇珠/下半脸 | 捂嘴 | 手背挡下唇，随即放下别过脸 | 0.8s | 加红晕参数 |
| 领口/锁骨 | 护胸后仰 | 双臂收拢到胸前，肩胛后缩，重心后移 | 0.8s | 身体 `ParamBodyAngleX` 后仰 |
| 开衫/腰线 | 抱臂偏头 | 双臂交叉，下巴抬起，视线移开 | 0.9s | 默认待机可停在此姿势 |
| 手背/水笔 | 触电缩肩 | 被碰到耳后/手背时全身一颤，肩颈缩紧 | 0.5s | 高频小幅抖动 |
| 裙摆/鞋跟 | 跺脚 | 桌下一条腿抬起轻踢，裙摆惯性 | 0.7s | 腿骨 + 裙摆物理 |
| 整体/转身 | 转身换重心 | 身体侧转 15°，重心换到另一条腿 | 1.0s | `ParamBodyAngleX/Z` |

待机动作：`idle`（呼吸 + 轻微重心摆动 + 偶尔眨眼）、`blink`、`look_around`、`talk`（口型 + 轻微头部）。

动作文件建议：
- 每个动作 0.5–1.0s；
- `fadeIn/fadeOut` 0.2–0.3s；
- 动作之间可打断：点击新热区时先回到中性或直接交叉淡入；
- 物理：前发/后发/裙摆/领口/眼镜挂绳（如有）各一组。

**检查点 5**：8 个动作逐个录屏/GIF；检查肩、肘、腕、裙摆无撕裂；手指不穿脸；眼镜不飞。

---

### Step 6：接入现有 Galgame 页面

#### 6.1 运行库

- 推荐：`pixi.js` + `pixi-live2d-display` + `live2dcubismcore.min.js`（Cubism 4/5 兼容版本按模型版本选）。
- 或直接复用 `live2d-agent-kit/templates/web-preview` 的加载逻辑。
- 需要本地 HTTP 服务（不能用 `file://` 加载 `.moc3`）。

#### 6.2 页面改造

- 复制 `galgame` → `galgame_cubism`，在副本上改；验收后再替换。
- 第三幕中央 `.doll` 内放一个 `<canvas id="live2dCanvas">`，移除旧的 `live2d.js` 星轨置换（保留文件作 fallback，不加载）。
- `PIXI.Application` 尺寸按 `.doll` 的 832:1216 比例；模型缩放/定位到脚底对齐档案条上方。
- 7 个 DOM 热区继续用现有 `.hs` 按钮，点击时：
  - 调用 `model.motion('TapBody', index)` 或直接 tween 参数；
  - 同步更新心率、好感、秘密、红晕、台词气泡；
  - 更新 `#dollEmo` 文案。
- 左侧监测面板/右侧衣橱/底部档案/秘密物证匣全部保留。
- 其他 15 套服装：点击后显示静态 `w{id}e01.webp`，隐藏热区，气泡提示“这套只展示，不开放交互”；不要加载第二套 `.moc3`。

#### 6.3 移动端

- 模型 canvas 高度约 `calc(100vh - hud - archive - 20px)`，宽度按比例；
- 手机隐藏左右面板（现有 CSS 已做），保留热区与档案；
- 检查 390×844、820×1180 无横向溢出。

**检查点 6**：桌面 1600×900 / 1280×720、平板 820×1180、手机 390×844 截图；控制台无报错；模型加载 < 3s（本地）。

---

### Step 7：验收与回滚

验收清单：

- [ ] `Minimal` 示例 `.moc3` 能导出并通过 validate
- [ ] 周清禾 `.moc3` 在官方 Core / 网页预览加载
- [ ] 转头 `ParamAngleX` ±30°、`ParamAngleY` ±20° 无破面
- [ ] 眨眼、张嘴、呼吸、头发/裙摆物理
- [ ] 8 个动作全部可触发，动作间可打断
- [ ] 肩/肘/腕/裙摆无撕裂；手指不穿脸；眼镜不飞
- [ ] 第三幕 UI 与美化层保持
- [ ] 其他 15 套静态展示、无交互
- [ ] 桌面/平板/手机无溢出、无报错
- [ ] 保留 `galgame_backup_20261109` 可回滚

回滚：直接用 `galgame_backup_20261109` 覆盖 `galgame`；或保留 `?fallback=1` 加载旧版。

---

## 6. 关键风险与应对

| 风险 | 应对 |
|---|---|
| `live2d-agent-kit`/`psd2live` 在 Windows 上跑不通 | 先用 Git Bash；失败则用 WSL2 Ubuntu 24.04；再失败则改用 Rev2D/Iki 做对照样片，并向用户报告 |
| See-through 8GB OOM | `inference_psd_quantized.py --resolution 896/768`；`inference_psd_blockswap.py`；关闭其他 GPU 程序；最后才考虑在线 demo（先问用户） |
| See-through 图层串层/补画差 | 手动 PSD 清理；NAI 局部补画；必要时放弃自动分层，按 See-through 输出为底稿手工修 |
| psd2live manifest 学习曲线 | 先跑最小示例；再以 Pink Sakura 30 层 manifest 为模板；逐层加，不要一次全上 |
| `.moc3` 在网页运行库版本不兼容 | 用 kit 的 web-preview 模板；确认 Cubism Core 版本与模型版本；必要时用 PurismCore |
| 时间超预期 | 先交付“能加载 + 转头/眨眼/呼吸 + 3 个动作”的最小模型，再迭代到 8 个动作 |
| 商业许可 | 个人/非商业默认；若要商业发布，先让用户确认 Live2D 出版许可 |

---

## 7. 绝对不要做

- 不要把现有 7 张 `w01e01~e07` 直接当 `.moc3` 素材；它们没有分层。
- 不要用 `assets/rig` 的硬切手臂和 `puppet.js`；已判定不可交付。
- 不要用生成“模拟 `.moc3`”的 MCP 工具。
- 不要在模型未验收前覆盖 `galgame`。
- 不要在没有备份的情况下重跑 `psd2live` 到同一输出目录；每次用新目录。
- 不要把大模型/权重装到 C 盘。

---

## 8. 建议的执行顺序（给新对话）

1. 读本文件 + `live2d-agent-kit/SKILL.md` + `docs/workflow.md` + `docs/manifest.md`。
2. 安装 JDK 21，跑通最小示例；把产物列表和截图发给用户。
3. 装 See-through venv，跑 A-pose 的 1024 量化 PSD；把图层列表和预览发给用户。
4. 清理/补画图层；先做 8 个动作需要的最小层，不追求 30 层。
5. psd2live 出 low 模型；网页预览验证转头/眨眼/呼吸。
6. 加 8 个动作与物理；逐个录屏。
7. 在 `galgame_cubism` 接入；桌面/移动验收；再替换 `galgame`。

---

## 9. 新对话开场提示词（直接复制）

```text
接手「死装同桌·周清禾」的真 Live2D Cubism 任务。请先完整阅读：
F:\AI-Workspace\Claude\嘉欣同桌\galgame\HANDOFF_Live2D_Cubism_20261109.md

已确认决策：
1) 只做 W01 燕麦收腰学院装的真 .moc3；其他 15 套只展示、不交互。
2) 母图用 F:\AI-Workspace\Claude\嘉欣同桌\galgame\_rig\a_pose.png。
3) 走真 Cubism：See-through 本地拆层 → live2d-agent-kit/psd2live → .moc3 → 网页运行库。
4) 当前 galgame 页面保留为 fallback，不要先覆盖。
5) 先做 Spike：装 JDK 21 → live2d-agent-kit 最小示例 → See-through 对 A-pose 出 PSD。
每完成一步给我检查点（产物路径、命令输出、截图），不要一次跑完。
如果 Windows 上 psd2live 跑不通，再切 WSL2；如果仍失败，先停下来报告，不要改用模拟 .moc3 的工具。
```

---

## 10. 参考链接

- Live2D Cubism SDK for Web：https://www.live2d.com/en/sdk/download/web/
- Live2D SDK 许可：https://www.live2d.com/en/sdk/license/
- live2d-agent-kit：https://github.com/Ariakage/live2d-agent-kit
- psd2live：https://github.com/tsunehimatoi/psd2live
- See-through：https://github.com/shitagaki-lab/see-through
- Stretchy Studio：https://github.com/MangoLion/stretchystudio
- Anime2.5DRig：https://github.com/852wa/Anime2.5DRig
- Rev2D：https://github.com/RevStudio/Rev2D
- Iki：https://github.com/zeikar/iki
- PurismCore：https://github.com/SakuraMotion/PurismCore
- Ayagami：https://github.com/AyagamiDev/ayagami
