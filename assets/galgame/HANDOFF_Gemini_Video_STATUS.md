# Gemini 视频补齐 · 执行状态（2026-11-10 22:55）

## 结论

**6 / 6 已接入。** B2、B4 为本次 Gemini 生成；B3、B5、D7、D4 为用户提供的 Gemini 视频，已统一转码并接入页面。

| 场景 | 文件 | 来源 | 分辨率 | 时长 | 帧率 | 音频 |
|---|---|---|---|---|---|---|
| B2 冷水池 | `assets/video/B2_cold_water.mp4` | Gemini（刘星 u/0） | 1920×1080 | 5.00s | 24fps | 无 |
| B3 百米外的伞 | `assets/video/B3_umbrella.mp4` | 用户素材包 | 1920×1080 | 5.00s | 24fps | 无 |
| B4 曲奇铁盒 | `assets/video/B4_cookie_tin.mp4` | Gemini（刘希望 u/2） | 1920×1080 | 5.00s | 24fps | 无 |
| B5 十九块九 | `assets/video/B5_armor.mp4` | 用户素材包 | 1920×1080 | 5.00s | 24fps | 无 |
| D7 极光网咖 | `assets/video/D7_cybercafe.mp4` | 用户素材包 | 1920×1080 | 5.00s | 24fps | 无 |
| D4 梧桐河道夜骑 | `assets/video/D4_night_ride.mp4` | 用户素材包 | 1920×1080 | 5.00s | 24fps | 无 |

页面已验证：六条视频分别点击 B2/B3/B4/B5 胶片卡、D4 百日玩法、D7 走读地图后，`videoWidth=1920`、`videoHeight=1080`、`readyState=4`、`paused=false`。

## 页面改动

- `assets/js/data.js`
  - B2 → `B2_cold_water.mp4`
  - B3 → `B3_umbrella.mp4`
  - B4 → `B4_cookie_tin.mp4`
  - B5 → `B5_armor.mp4`
  - `mapScenes.cybercafe.video` → `D7_cybercafe.mp4`
  - D4 `plays` 第 4 条与 `mapScenes.canal.video` → `D4_night_ride.mp4`
- `assets/js/app.js`：视频/海报源加 `?v=20261110z6`，避免旧 D4 缓存
- `index.html`：6 处版本串 → `?v=20261110z6`

## D4 新静帧（女生单人版）

- `assets/bg/D4_night_cycling.png`（1536×864，NAI V5，seed 467221187）
- 已移除原图中的男生，改为女生单人夜骑
- 备份：`assets/bg/legacy_gemini/D4_night_cycling_old.png`、`D4_night_cycling_two_people.png`
- 候选：`assets/bg/_d4_candidates/`

## 备份与记录

- 旧视频：`assets/video/legacy_gemini/`
- 原始下载：`assets/video/gemini_raw/`
- Manifest：`assets/video/gemini_manifest.json`
- 桌面素材包：`C:\Users\ZhuanZ（无密码）\Desktop\周清禾_剩余视频素材_20261110`

## 备注

- 未使用 VPN、API Key、第三方下载站或本地 MiniMax H3。
- 未记录密码、Token 或登录凭据。
- 一次原生文件对话框操作因前台窗口是 QQ，误把项目路径粘贴进 QQ 聊天窗口；已停止使用 SendKeys 操作文件对话框，后续改用隐藏 file input + 浏览器工具上传。
