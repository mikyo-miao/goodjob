# BGM 曲目说明

播放器曲目来自 `assets/js/data.js` 的 `bgmTracks`，按顺序自动轮播，也可以在 `冷感绝缘体. FM` 播放器里点选/上一首/下一首。

## 现有曲目

| # | 标题 | 文件 | 说明 |
|---|---|---|---|
| 01 | 三八线上的晴空 | `bgm_desk.mp3` | 木吉他 / 电钢琴，instrumental |
| 02 | 百米外的雨伞 | `bgm_origin.mp3` | 钢琴 / 雨声，instrumental |
| 03 | 门帘后的七月 | `bgm_night.mp3` | 女声 + 木吉他，原深夜清唱版 |
| 04 | 窗扣 | `bgm_vocal_window.mp3` | 女声清唱，晚自习 |
| 05 | 米袋 | `bgm_vocal_rice.mp3` | 女声清唱，雨夜 |
| 06 | 三八线 | `bgm_vocal_line.mp3` | 女声清唱，轻 |
| 07 | 没唱完的半首 | `bgm_vocal_half.mp3` | 女声清唱，凌晨 |

## 新增清唱曲目

- 生成模型：本地 ComfyUI + ACE-Step 1.5 Turbo
- 格式：MP3 / 320 kbps / 48 kHz
- 时长：50–58 秒
- 风格：a cappella、solo female vocal、voice only、close-mic、breathy、late night
- 歌词与参数：`assets/audio/bgm_manifest.json`
- 生成脚本：`tools/gen_more_vocals.py`

重新生成某一首：

```bash
python tools/gen_more_vocals.py window
python tools/gen_more_vocals.py rice
python tools/gen_more_vocals.py line
python tools/gen_more_vocals.py half
```

生成后会自动覆盖 `assets/audio/bgm_vocal_*.mp3`。新增曲目需要同步加到 `data.js` 的 `bgmTracks`，并把 `index.html` 的版本串加一。
