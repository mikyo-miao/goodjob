# -*- coding: utf-8 -*-
"""Generate five additional unaccompanied female-vocal tracks for the guide page.

Uses the local ComfyUI ACE-Step 1.5 Turbo workflow from gen_music_ace.py.
Output: assets/audio/bgm_vocal_*.mp3 (320 kbps).
"""
import json
import shutil
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from gen_music_ace import AUDIO, OUTPUT, build_workflow, submit, wait

TRACKS = [
    {
        "file": "bgm_vocal_window.mp3",
        "tags": "a cappella, unaccompanied solo female vocal, voice only, no instruments, no drums, no guitar, no piano, close-mic, breathy, intimate, quiet, late night, slow, rubato, natural room reverb, Mandarin Chinese, gentle, melancholic, fragile",
        "lyrics": "[verse]\n晚自习的灯 还亮着半边\n你推过来的笔 停在白线中间\n我把窗扣 扣得很轻\n怕风进来 也怕你听见\n[chorus]\n窗扣响了一声 又一声\n像我没说出口的 那点认真\n你把外套 搭在我椅背\n我假装没看见 假装不冷\n[verse]\n楼下的车铃 响过几遍\n我把答案 写到纸的边缘\n你问我借 一块橡皮\n我说不借 却推到你手边\n[chorus]\n窗扣响了一声 又一声\n像我没说出口的 那点认真\n等灯灭了 等人都走远\n你能不能 别走那么前",
        "language": "zh",
        "duration": 55,
        "bpm": 72,
        "keyscale": "A minor",
    },
    {
        "file": "bgm_vocal_rice.mp3",
        "tags": "a cappella, unaccompanied solo female vocal, voice only, no instruments, no drums, no guitar, no piano, close-mic, breathy, intimate, quiet, low register, slow, natural room reverb, Mandarin Chinese, fragile, bittersweet",
        "lyrics": "[verse]\n楼下的米袋 又响了一遍\n我把声音 压得很浅\n你说顺路 要帮我搬\n我说不用 却走得很慢\n[chorus]\n米袋很重 雨很凉\n我把校服 拉得很长\n别看我 别问我住哪\n我只是 不想让你看见\n[verse]\n巷口的灯 坏了一半\n我数着台阶 数到第七段\n你把伞 往我这边偏\n我说不冷 手却攥紧伞杆\n[chorus]\n米袋很重 雨很凉\n我把校服 拉得很长\n等有一天 我走得很远\n再告诉你 我家在哪",
        "language": "zh",
        "duration": 55,
        "bpm": 68,
        "keyscale": "D minor",
    },
    {
        "file": "bgm_vocal_line.mp3",
        "tags": "a cappella, unaccompanied solo female vocal, voice only, no instruments, no drums, no guitar, no piano, close-mic, breathy, intimate, quiet, gentle, slightly playful, slow, natural room reverb, Mandarin Chinese, warm",
        "lyrics": "[verse]\n你在桌上 画了一条线\n说谁越界 谁就请客\n我把手肘 收了回去\n却把橡皮 推到你那边\n[chorus]\n三八线 三八线\n画得那么直 那么浅\n你睡着的时候 手越了界\n我没推回去 只看了你一眼\n[verse]\n你借我的笔 没还\n我借你的伞 没还\n我们谁也不提\n像这样 就能拖到毕业\n[chorus]\n三八线 三八线\n画得那么直 那么浅\n等六月以后 桌子搬空\n这条线 会不会还在你心里",
        "language": "zh",
        "duration": 50,
        "bpm": 80,
        "keyscale": "C major",
    },
    {
        "file": "bgm_vocal_half.mp3",
        "tags": "a cappella, unaccompanied solo female vocal, voice only, no instruments, no drums, no guitar, no piano, close-mic, breathy, intimate, quiet, late night, slow, natural room reverb, Mandarin Chinese, lonely, fragile",
        "lyrics": "[verse]\n耳机里的伴奏 循环到第三遍\n我把音量 调到最小的一格\n一百二十七个 陌生的名字\n没有人知道 我在这里唱歌\n[chorus]\n没唱完的半首 留在凌晨\n像我没敢 按下的发送\n如果有一天 你刷到我\n会不会 听出窗扣的声音\n[verse]\n我把门缝 塞得很严\n怕楼下的米袋 被谁听见\n你发来一句 早点睡\n我回了一个 嗯\n[chorus]\n没唱完的半首 留在凌晨\n像我没敢 说出的姓名\n等天亮以后 我就删掉\n假装今晚 什么也没发生",
        "language": "zh",
        "duration": 58,
        "bpm": 74,
        "keyscale": "A minor",
    },
    {
        "file": "bgm_vocal_june.mp3",
        "tags": "a cappella, unaccompanied solo female vocal, voice only, no instruments, no drums, no guitar, no piano, close-mic, breathy, intimate, quiet, slow, natural room reverb, Mandarin Chinese, hopeful, bittersweet",
        "lyrics": "[verse]\n黑板上的数字 一天天变小\n你把倒计时 改成我的名字\n我假装没看见\n却把它 抄在草稿纸背面\n[chorus]\n六月七日 雨会不会停\n你会不会 站在校门外面\n我把没说的话 唱成一首歌\n等风把它 吹到你耳边\n[verse]\n最后一节课 铃声响得很慢\n你把椅子 往我这边搬\n我说别挤\n却把书 往旁边挪了一半\n[chorus]\n六月七日 雨会不会停\n你会不会 站在校门外面\n等考完最后一科\n我想告诉你 我没走远",
        "language": "zh",
        "duration": 58,
        "bpm": 70,
        "keyscale": "G major",
    },
]


def find_saved_audio(outputs):
    saved = None
    for node in outputs.values():
        if not isinstance(node, dict):
            continue
        for key in ("audio", "audio_file", "files"):
            v = node.get(key)
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, dict) and item.get("filename"):
                        saved = (item.get("subfolder", ""), item["filename"])
            elif isinstance(v, dict) and v.get("filename"):
                saved = (v.get("subfolder", ""), v["filename"])
    return saved


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for i, track in enumerate(TRACKS):
        if only and only not in track["file"]:
            continue
        print("=== submit", track["file"], flush=True)
        wf = build_workflow(track, seed=20261110 + i * 97)
        pid = submit(wf)
        print("prompt", pid, flush=True)
        outputs = wait(pid)
        print("outputs", json.dumps(outputs, ensure_ascii=False), flush=True)
        saved = find_saved_audio(outputs)
        if not saved:
            raise RuntimeError("no audio filename for " + track["file"])
        subfolder, filename = saved
        src = OUTPUT / subfolder / filename
        if not src.exists():
            src = OUTPUT / filename
        dst = AUDIO / track["file"]
        shutil.copy2(src, dst)
        print("saved", dst, dst.stat().st_size, flush=True)
        time.sleep(2)


if __name__ == "__main__":
    main()
