/* =========================================================
   App：单页长卷 / 开屏 / 对白 / 记忆 / 立绘 / 手记 / 沙盒 / 契约
   ========================================================= */
(function () {
  'use strict';

  const D = window.QH;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const state = {
    act1i: 0,
    typing: false,
    typeTimer: null,
    innerTimer: null,
    lineCb: null,
    memIndex: 0,
    memInit: false,
    playInit: false,
    secrets: new Set(),
    outfit: '01',
    pose: 'e01',
    outfitUnlocked: new Set(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']),
    hsStage: {},
    bubbleTimer: null,
    fav: 22,
    heat: 1,
    stage: null,
    stageReady: false,
    stageTried: false,
    id: 'D',
    stamped: false,
    inkReady: false,
    sealing: false,
    bgmStarted: false,
    bgmPlaying: false,
    usingFallback: false,
    audioUnavailable: false,
    autoTrack: true,
    playerIndex: 0,
    playerOpen: false,
    lastFocus: null
  };
  window.QH_STATE = state;

  /* ---------------- Toast ---------------- */
  const toastEl = $('#toast');
  let toastTimer = null;
  function toast(msg, ms) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), ms || 2200);
  }

  /* ---------------- Modal ---------------- */
  const modal = $('#modal');
  const modalBody = $('#modalBody');
  const modalTitle = $('#modalTitle');
  const modalKicker = $('#modalKicker');

  function openModal(kicker, title, html, cls) {
    if (!modal) return;
    modalKicker.textContent = kicker || '预览';
    modalTitle.textContent = title || '';
    modalBody.innerHTML = html || '';
    const card = $('.modal__card', modal);
    card.className = 'modal__card' + (cls ? ' ' + cls : '');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    state.lastFocus = document.activeElement;
    setTimeout(() => {
      const x = $('.modal__x', modal);
      if (x) x.focus({ preventScroll: true });
    }, 50);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (state.lastFocus && state.lastFocus.focus) {
      state.lastFocus.focus({ preventScroll: true });
    }
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) closeModal();
    });
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = $$('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])', modal)
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) closeModal();
  });

  /* =========================================================
     开屏黑板
     ========================================================= */
  const loader = $('#loader');
  const loaderBar = $('#loaderBar');
  const loaderPct = $('#loaderPct');
  const loaderStatus = $('#loaderStatus');
  const loaderEnter = $('#loaderEnter');
  const loaderEnterTxt = $('#loaderEnterTxt');
  const loaderNum = $('#loaderNum');
  const loaderGhost = $('#loaderGhost');

  let loadedCount = 0;
  let totalCount = 0;
  let loaderReady = false;
  let loaderDone = false;
  let shownPct = 0;
  const loaderStart = performance.now();

  const preloadAssets = [
    'assets/ui/blackboard_bg.webp',
    'assets/bg/A1_classroom_bg.png',
    'assets/bg/A3_heroine_defense.png',
    'assets/bg/B1_waterroom.png',
    'assets/bg/D1_math.png',
    'assets/ui/avatar/av4_e01.png',
    'assets/ui/avatar/av4_e02.png',
    'assets/ui/avatar/av4_e03.png',
    'assets/ui/avatar/av4_e05.png',
    'assets/ui/avatar/av4_e06.png',
    'assets/lihui/w01e01.webp',
    'assets/lihui/w01e02.webp',
    'assets/lihui/w01e03.webp',
    'assets/lihui/w01e04.webp',
    'assets/lihui/w01e05.webp',
    'assets/lihui/w01e06.webp',
    'assets/lihui/w01e07.webp'
  ];

  function setLoaderProgress(p) {
    shownPct = Math.max(shownPct, p);
    if (loaderBar) loaderBar.style.width = shownPct + '%';
    if (loaderPct) loaderPct.textContent = Math.round(shownPct) + '%';
    if (loaderGhost) loaderGhost.style.opacity = String(clamp(1 - shownPct / 62, 0, 1));
    if (loaderNum) loaderNum.style.opacity = String(clamp((shownPct - 42) / 38, .15, 1));
    if (loaderStatus) {
      if (shownPct < 35) loaderStatus.textContent = '正在擦净靠窗倒数第二排的粉笔灰…';
      else if (shownPct < 70) loaderStatus.textContent = '正在把目标卡摆到桌角…';
      else if (shownPct < 100) loaderStatus.textContent = '正在把窗推开一条缝…';
      else loaderStatus.textContent = '椅子拉开了。';
    }
  }

  function once(fn) {
    let called = false;
    return function () {
      if (called) return;
      called = true;
      fn();
    };
  }

  function finishLoader() {
    if (loaderReady) return;
    loaderReady = true;
    setLoaderProgress(100);
    const elapsed = performance.now() - loaderStart;
    const delay = Math.max(0, 850 - elapsed);
    setTimeout(() => {
      if (loaderEnter) loaderEnter.disabled = false;
      if (loaderEnterTxt) loaderEnterTxt.textContent = '拉开椅子坐下 ▸';
      if (loader) loader.classList.add('is-ready');
    }, delay);
  }

  function itemDone() {
    loadedCount++;
    setLoaderProgress(Math.min(99, (loadedCount / totalCount) * 100));
    if (loadedCount >= totalCount) finishLoader();
  }

  if (loader) {
    totalCount = preloadAssets.length + 1;
    preloadAssets.forEach((src) => {
      const img = new Image();
      const done = once(itemDone);
      img.onload = done;
      img.onerror = done;
      img.src = src;
    });

    const probe = document.createElement('video');
    probe.preload = 'auto';
    probe.muted = true;
    probe.playsInline = true;
    probe.src = 'assets/video/A1_classroom_loop.mp4';
    const probeDone = once(itemDone);
    probe.addEventListener('loadeddata', probeDone, { once: true });
    probe.addEventListener('error', probeDone, { once: true });
    setTimeout(probeDone, 3500);
    probe.load();

    setTimeout(() => {
      if (!loaderReady) {
        loadedCount = totalCount;
        finishLoader();
      }
    }, 6000);
  }

  function reveal() {
    if (!loaderReady || loaderDone || !loader) return;
    loaderDone = true;
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(() => { loader.hidden = true; }, 800);
    const desk = $('#sec-desk');
    if (desk) {
      desk.setAttribute('tabindex', '-1');
      desk.focus({ preventScroll: true });
    }
    initDust();
    startBgm();
    setTimeout(() => toast('「冷感绝缘体. FM」已开始播放 · 右上角可调音量', 2600), 1500);
  }

  if (loaderEnter) loaderEnter.addEventListener('click', reveal);
  window.addEventListener('wheel', (e) => {
    if (loader && !loader.hidden && loaderReady && e.deltaY > 0) reveal();
  }, { passive: true });
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches[0]) touchStartY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (loader && !loader.hidden && loaderReady && touchStartY - e.touches[0].clientY > 24) reveal();
  }, { passive: true });

  /* =========================================================
     首屏粉笔浮尘（全站唯一粒子）
     ========================================================= */
  let dustInited = false;

  function makeDust(canvas, cfg) {
    if (!canvas || reduced) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, parts = [], raf = 0;

    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      parts = [];
      for (let i = 0; i < cfg.count; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: .4 + Math.random() * cfg.size,
          vy: cfg.speed * (.5 + Math.random()),
          vx: (Math.random() - .5) * cfg.drift,
          a: .12 + Math.random() * cfg.alpha,
          ph: Math.random() * 6.28
        });
      }
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
        if (p.y > h + 8) { p.y = -8; p.x = Math.random() * w; }
        if (p.x < -8) p.x = w + 8;
        if (p.x > w + 8) p.x = -8;
        const tw = .55 + .45 * Math.sin(t * .0013 + p.ph);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,246,226,' + (p.a * tw).toFixed(3) + ')';
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    spawn();
    raf = requestAnimationFrame(frame);
    new ResizeObserver(() => { resize(); spawn(); }).observe(canvas);
  }

  function initDust() {
    if (dustInited) return;
    dustInited = true;
    makeDust($('#aDust'), { count: 30, size: 1.3, alpha: .42, speed: -.1, drift: .18 });
    makeDust($('#worldDust'), { count: 46, size: 1.8, alpha: .46, speed: -.06, drift: .26 });
  }

  /* =========================================================
     深夜电台（WebAudio 合成，无外部素材）
     ========================================================= */
  function Ambient() {
    this.ctx = null;
    this.on = false;
    this.gain = null;
    this.timer = null;
  }
  Ambient.prototype.start = function () {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.gain = master;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    filter.Q.value = .6;
    filter.connect(master);

    [73.42, 110.0, 146.83, 220.0].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 3 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 3 ? .04 : .075 - i * .012;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = .04 + i * .017;
      const lg = ctx.createGain();
      lg.gain.value = .03;
      lfo.connect(lg);
      lg.connect(g.gain);
      lfo.start();
      o.connect(g);
      g.connect(filter);
      o.start();
    });

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * .35;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const ng = ctx.createGain();
    ng.gain.value = .01;
    noise.connect(hp);
    hp.connect(ng);
    ng.connect(master);
    noise.start();

    this.chime();
  };
  Ambient.prototype.chime = function () {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const play = () => {
      if (!this.on) { this.timer = setTimeout(play, 5200); return; }
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880 + Math.random() * 660;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.024, t + .02);
      g.gain.exponentialRampToValueAtTime(.0008, t + 1.5);
      o.connect(g);
      g.connect(this.gain);
      o.start(t);
      o.stop(t + 1.6);
      this.timer = setTimeout(play, 6200 + Math.random() * 8000);
    };
    this.timer = setTimeout(play, 3200);
  };
  Ambient.prototype.toggle = function (force) {
    this.start();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.on = typeof force === 'boolean' ? force : !this.on;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(this.on ? .15 : 0, now + .9);
    return this.on;
  };
  const ambient = new Ambient();
  const btnRadio = $('#btnRadio');

  /* =========================================================
     顶栏章节联动
     ========================================================= */
  const navLinks = $$('#hudNav a');
  const secs = navLinks
    .map(a => document.getElementById(a.dataset.sec))
    .filter(Boolean);
  const allSecs = $$('.sec');
  const worldBySection = {
    'sec-desk': 'desk',
    'sec-origin': 'origin',
    'sec-stage': 'stage',
    'sec-archive': 'stage',
    'sec-play': 'play',
    'sec-contract': 'night'
  };
  let spyTick = false;

  function maybeAutoTrack() {
    if (!state.bgmStarted || !state.autoTrack || !state.bgmPlaying) return;
    const w = $('#world') ? $('#world').dataset.world : 'desk';
    const idx = { desk: 0, origin: 1, stage: 1, play: 2, night: 2 }[w];
    const target = D.bgmTracks && D.bgmTracks[idx];
    if (typeof idx === 'number' && idx !== state.playerIndex && target && target.ready !== false) {
      setBgmTrack(idx, true);
    }
  }

  function updateSpy() {
    spyTick = false;
    if (!secs.length) return;
    const line = scrollY + innerHeight * .32;
    let current = secs[0];
    for (const s of secs) {
      if (s.offsetTop <= line) current = s;
    }
    navLinks.forEach(a => a.classList.toggle('is-on', a.dataset.sec === current.id));

    let worldSection = allSecs[0];
    for (const s of allSecs) {
      if (s.offsetTop <= line) worldSection = s;
    }
    const w = worldBySection[worldSection.id] || 'desk';
    const world = $('#world');
    if (world && world.dataset.world !== w) {
      world.dataset.world = w;
      $$('.world__layer').forEach(layer => layer.classList.toggle('is-on', layer.dataset.world === w));
      maybeAutoTrack();
    }
  }
  window.addEventListener('scroll', () => {
    if (spyTick) return;
    spyTick = true;
    requestAnimationFrame(updateSpy);
  }, { passive: true });
  updateSpy();

  /* =========================================================
     通用视频切换
     ========================================================= */
  function setVideo(videoEl, posterEl, videoName, posterName) {
    if (!videoEl || !posterEl) return;
    if (posterName) {
      const pSrc = 'assets/bg/' + posterName + '?v=20261110z6';
      if (posterEl.getAttribute('src') !== pSrc) {
        posterEl.src = pSrc;
        posterEl.classList.remove('is-hidden');
      }
    }
    if (!videoName) {
      videoEl.classList.remove('is-live');
      videoEl.removeAttribute('src');
      videoEl.removeAttribute('data-src');
      return;
    }
    const src = 'assets/video/' + videoName + '?v=20261110z6';
    if (videoEl.dataset.src !== src) {
      videoEl.dataset.src = src;
      videoEl.classList.remove('is-live');
      videoEl.src = src;
      videoEl.load();
      const onReady = () => {
        videoEl.classList.add('is-live');
        posterEl.classList.add('is-hidden');
      };
      videoEl.addEventListener('loadeddata', onReady, { once: true });
      videoEl.addEventListener('error', () => {
        videoEl.classList.remove('is-live');
        posterEl.classList.remove('is-hidden');
      }, { once: true });
    }
    videoEl.play().catch(() => {});
  }

  /* =========================================================
     01 · 三八线
     ========================================================= */
  const aVideo = $('#aVideo');
  const aPoster = $('#aPoster');
  const aAvatar = $('#aAvatar');
  const aMode = $('#aMode');
  const aLine = $('#aLine');
  const aInner = $('#aInner');
  const aInnerText = $('#aInnerText');
  const aScene = $('#aScene');
  const aChapter = $('#aChapter');
  const aGuard = $('#aGuard');
  const aGuardText = $('#aGuardText');
  const aDots = $('#aDots');
  const aPrev = $('#aPrev');
  const aNext = $('#aNext');

  if (aDots) {
    D.act1.forEach(() => aDots.appendChild(document.createElement('i')));
  }

  function typeLine(text, cb) {
    clearInterval(state.typeTimer);
    aLine.textContent = '';
    state.typing = true;
    state.lineCb = cb || null;
    if (reduced || !loaderDone) {
      aLine.textContent = text;
      state.typing = false;
      const f = state.lineCb;
      state.lineCb = null;
      if (f) f();
      return;
    }
    let i = 0;
    state.typeTimer = setInterval(() => {
      i++;
      aLine.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(state.typeTimer);
        state.typing = false;
        const f = state.lineCb;
        state.lineCb = null;
        if (f) f();
      }
    }, 28);
  }

  function finishTyping() {
    if (!state.typing) return false;
    clearInterval(state.typeTimer);
    aLine.textContent = D.act1[state.act1i].line;
    state.typing = false;
    const f = state.lineCb;
    state.lineCb = null;
    if (f) f();
    return true;
  }

  function setLine(i) {
    state.act1i = i;
    const d = D.act1[i];
    aMode.textContent = d.mode;
    aAvatar.src = 'assets/ui/avatar/av4_' + d.emo + '.png';
    aAvatar.alt = '周清禾 · ' + (D.emotionNames[d.emo] || '清冷');
    aScene.textContent = d.scene;
    aChapter.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(D.act1.length).padStart(2, '0');
    $$('i', aGuard).forEach((el, k) => el.classList.toggle('is-on', k < d.guard));
    aGuardText.textContent = d.guardText;
    setVideo(aVideo, aPoster, d.video, d.poster);
    aInner.classList.remove('is-on');
    aInnerText.textContent = d.inner;
    $$('i', aDots).forEach((el, k) => el.classList.toggle('is-on', k <= i));
    if (aPrev) aPrev.disabled = i === 0;
    const last = i === D.act1.length - 1;
    aNext.innerHTML = last
      ? '往下走 · 来处 <span aria-hidden="true">▸</span>'
      : '下一步 <span aria-hidden="true">▸</span>';
    aNext.classList.toggle('btn--primary', last);
    clearTimeout(state.innerTimer);
    typeLine(d.line, () => {
      state.innerTimer = setTimeout(() => aInner.classList.add('is-on'), 220);
    });
  }

  function nextLine() {
    if (finishTyping()) return;
    if (state.act1i < D.act1.length - 1) {
      setLine(state.act1i + 1);
    } else {
      const target = $('#sec-origin');
      if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function prevLine() {
    if (finishTyping()) return;
    if (state.act1i > 0) setLine(state.act1i - 1);
  }

  if (aNext) aNext.addEventListener('click', () => { nextLine(); aNext.blur(); });
  if (aPrev) aPrev.addEventListener('click', () => { prevLine(); aPrev.blur(); });

  $$('.gossip').forEach(g => {
    g.addEventListener('click', () => {
      const info = D.gossip[+g.dataset.gossip];
      if (!info) return;
      aInnerText.textContent = info.inner;
      aInner.classList.add('is-on');
      g.classList.add('is-poked');
      setTimeout(() => g.classList.remove('is-poked'), 2800);
      toast(info.who + '的声音从背后飘过来。', 1700);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (modal && modal.classList.contains('is-open')) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const ae = document.activeElement;
    if (ae && ae.closest && ae.closest('#sec-desk') && (ae.tagName === 'BUTTON' || ae.tagName === 'A')) return;
    const desk = $('#sec-desk');
    if (!desk) return;
    const r = desk.getBoundingClientRect();
    if (!(r.top < innerHeight * .72 && r.bottom > innerHeight * .28)) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      nextLine();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevLine();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextLine();
    }
  });

  /* =========================================================
     第一幕 · 课桌第一人称小动作
     ========================================================= */
  const deskTools = $('#deskTools');
  if (deskTools) {
    deskTools.addEventListener('click', (e) => {
      const btn = e.target.closest('.desk-tool');
      if (!btn) return;
      const id = btn.dataset.desk;
      const info = D.deskProps && D.deskProps[id];
      if (!info || btn.classList.contains('is-done')) return;
      btn.classList.add('is-done');
      if (state.typing) finishTyping();
      aLine.textContent = info.line;
      aInnerText.textContent = info.inner;
      aInner.classList.add('is-on');
      aMode.textContent = info.label;
      $$('i', aGuard).forEach((el, k) => el.classList.toggle('is-on', k < info.guard));
      aGuardText.textContent = info.guardText;
      toast(info.result, 2600);
    });
  }

  /* =========================================================
     第三幕 · 双面牛皮纸笔记本
     ========================================================= */
  const archive = $('#archive');
  const notebookFlip = $('#notebookFlip');
  const notebookFlipBack = $('#notebookFlipBack');

  function setNotebook(flipped) {
    if (!archive) return;
    archive.classList.toggle('is-flipped', flipped);
    if (flipped) buildPolaroidsBack();
  }
  if (notebookFlip) notebookFlip.addEventListener('click', () => setNotebook(true));
  if (notebookFlipBack) notebookFlipBack.addEventListener('click', () => setNotebook(false));

  /* =========================================================
     全站 BGM / 耳机播放器
     ========================================================= */
  const player = $('#player');
  const playerList = $('#playerList');
  const playerPlay = $('#playerPlay');
  const playerTrack = $('#playerTrack');
  const playerMeta = $('#playerMeta');
  const playerVol = $('#playerVol');
  const playerClose = $('#playerClose');
  const playerMin = $('#playerMin');
  const playerMini = $('#playerMini');
  const playerPrev = $('#playerPrev');
  const playerNext = $('#playerNext');
  const voicePlay = $('#voicePlay');
  const voiceText = $('#playerVoiceText');
  const voiceCard = $('.player__voice');
  const bgm = new Audio();
  bgm.preload = 'none';
  bgm.volume = .32;
  let bgmFallback = null;

  function BgmFallback() {
    this.ctx = null;
    this.on = false;
    this.timer = null;
    this.step = 0;
    this.master = null;
  }
  BgmFallback.prototype.start = function () {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.on = true;
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = .07;
    this.master.connect(ctx.destination);
    const chords = [
      [261.63, 329.63, 392.00, 493.88],
      [196.00, 246.94, 293.66, 392.00],
      [164.81, 196.00, 246.94, 329.63],
      [220.00, 261.63, 329.63, 392.00]
    ];
    const play = () => {
      if (!this.on) return;
      const chord = chords[this.step % chords.length];
      const t = ctx.currentTime;
      chord.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = i === 0 ? 'triangle' : 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * .12);
        g.gain.linearRampToValueAtTime(.055 / (i + 1), t + i * .12 + .04);
        g.gain.exponentialRampToValueAtTime(.0001, t + 3.8);
        o.connect(g);
        g.connect(this.master);
        o.start(t + i * .12);
        o.stop(t + 4.2);
      });
      this.step++;
      this.timer = setTimeout(play, 4000);
    };
    this.on = true;
    play();
  };
  BgmFallback.prototype.stop = function () {
    this.on = false;
    clearTimeout(this.timer);
    if (this.master) this.master.gain.value = 0;
  };
  BgmFallback.prototype.setVolume = function (v) {
    if (this.master) this.master.gain.value = v * .22;
  };

  function fmtTime(s) {
    if (!isFinite(s) || s <= 0) return '00:00';
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }

  function updatePlayerUI() {
    if (playerPlay) playerPlay.textContent = state.bgmPlaying ? 'Ⅱ' : '▶';
    if (btnRadio) {
      btnRadio.classList.toggle('is-on', state.bgmPlaying);
      btnRadio.setAttribute('aria-pressed', String(state.bgmPlaying));
    }
    if (playerList) {
      $$('button', playerList).forEach((b, i) => b.classList.toggle('is-on', i === state.playerIndex));
    }
    if (playerMeta && D.bgmTracks[state.playerIndex]) {
      const t = D.bgmTracks[state.playerIndex];
      const now = state.usingFallback ? 0 : bgm.currentTime;
      const dur = state.usingFallback ? 0 : bgm.duration;
      playerMeta.textContent = t.meta + (dur ? ' · ' + fmtTime(now) + ' / ' + fmtTime(dur) : '');
    }
  }

  function showPlayerMini(show) {
    if (playerMini) playerMini.classList.toggle('is-on', show);
  }

  function openPlayer(open) {
    state.playerOpen = open;
    if (!player) return;
    player.classList.toggle('is-open', open);
    player.setAttribute('aria-hidden', String(!open));
    if (open) showPlayerMini(false);
  }

  function startFallback() {
    if (state.usingFallback && bgmFallback && bgmFallback.on) return;
    if (!bgmFallback) bgmFallback = new BgmFallback();
    bgmFallback.setVolume(Number(playerVol ? playerVol.value : 38) / 100);
    bgmFallback.start();
    state.usingFallback = true;
    state.bgmPlaying = true;
    updatePlayerUI();
  }

  function setBgmTrack(i, autoplay, manual) {
    const tracks = D.bgmTracks || [];
    if (!tracks.length) return;
    if (manual) state.autoTrack = false;
    const nextIndex = (i + tracks.length) % tracks.length;
    const t = tracks[nextIndex];
    if (t.ready === false) {
      if (manual) toast('这首还没录好，先听别的。', 1800);
      return;
    }
    state.playerIndex = nextIndex;
    state.usingFallback = false;
    state.audioUnavailable = false;
    if (bgmFallback) bgmFallback.stop();
    bgm.pause();
    if (playerTrack) playerTrack.textContent = t.name;
    if (playerMeta) playerMeta.textContent = t.meta;
    updatePlayerUI();
    bgm.src = t.src;
    bgm.load();
    if (autoplay) {
      bgm.play().catch(() => startFallback());
    }
  }

  function toggleBgm() {
    if (state.usingFallback) {
      if (!bgmFallback) startFallback();
      else if (state.bgmPlaying) {
        bgmFallback.stop();
        state.bgmPlaying = false;
      } else {
        bgmFallback.start();
        state.bgmPlaying = true;
      }
      updatePlayerUI();
      return;
    }
    if (bgm.paused) {
      bgm.play().catch(() => startFallback());
    } else {
      bgm.pause();
    }
  }

  function startBgm() {
    if (state.bgmStarted) return;
    state.bgmStarted = true;
    state.autoTrack = true;
    setBgmTrack(0, true);
  }

  bgm.addEventListener('play', () => {
    state.usingFallback = false;
    state.bgmPlaying = true;
    updatePlayerUI();
    maybeAutoTrack();
  });
  bgm.addEventListener('pause', () => {
    if (state.usingFallback) return;
    state.bgmPlaying = false;
    updatePlayerUI();
  });
  bgm.addEventListener('ended', () => {
    if (state.usingFallback || state.audioUnavailable) return;
    setBgmTrack(state.playerIndex + 1, true);
  });
  bgm.addEventListener('error', () => {
    state.audioUnavailable = true;
    if (state.bgmStarted) startFallback();
  });
  bgm.addEventListener('timeupdate', () => {
    if (state.bgmPlaying) updatePlayerUI();
  });

  if (playerList) {
    D.bgmTracks.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.track = String(i);
      b.innerHTML = '<i>' + String(i + 1).padStart(2, '0') + '</i><span>' + t.name + '</span>';
      b.addEventListener('click', () => setBgmTrack(i, true, true));
      playerList.appendChild(b);
    });
  }
  D.bgmTracks.forEach(t => {
    fetch(t.src, { method: 'HEAD' })
      .then(r => { t.ready = r.ok; maybeAutoTrack(); })
      .catch(() => { t.ready = false; });
  });
  if (playerPlay) playerPlay.addEventListener('click', toggleBgm);
  if (playerPrev) playerPrev.addEventListener('click', () => setBgmTrack(state.playerIndex - 1, true, true));
  if (playerNext) playerNext.addEventListener('click', () => setBgmTrack(state.playerIndex + 1, true, true));
  if (playerClose) playerClose.addEventListener('click', () => { showPlayerMini(false); openPlayer(false); });
  if (playerMin) playerMin.addEventListener('click', () => { openPlayer(false); showPlayerMini(true); });
  if (playerMini) playerMini.addEventListener('click', () => {
    showPlayerMini(false);
    openPlayer(true);
    if (!state.bgmStarted) startBgm();
    else if (!state.bgmPlaying) toggleBgm();
  });
  if (playerVol) {
    playerVol.addEventListener('input', () => {
      const v = Number(playerVol.value) / 100;
      bgm.volume = v;
      if (bgmFallback) bgmFallback.setVolume(v);
    });
  }
  if (btnRadio) {
    btnRadio.addEventListener('click', () => {
      if (!state.playerOpen) {
        openPlayer(true);
        if (!state.bgmStarted) startBgm();
        else if (!state.bgmPlaying) toggleBgm();
      } else {
        toggleBgm();
      }
    });
  }
  if (voicePlay) {
    voicePlay.addEventListener('click', () => {
      if (state.playerIndex !== 2) setBgmTrack(2, false);
      if (!state.usingFallback && bgm.duration) {
        bgm.currentTime = Math.min(30, bgm.duration * .3);
        bgm.play().catch(() => {});
      } else {
        startFallback();
      }
      if (voiceCard) voiceCard.classList.remove('is-recalled');
      if (voiceText) voiceText.textContent = '“明天早点来学校。”';
      setTimeout(() => {
        if (bgm && !state.usingFallback) bgm.pause();
        if (bgmFallback) bgmFallback.stop();
        state.bgmPlaying = false;
        updatePlayerUI();
        if (voiceCard) voiceCard.classList.add('is-recalled');
        if (voiceText) voiceText.textContent = '「周清禾」撤回了一条语音';
      }, 6200);
    });
  }

  /* =========================================================
     第五幕 · 朱砂印泥与盖章音
     ========================================================= */
  const inkPad = $('#inkPad');
  if (inkPad) {
    inkPad.addEventListener('click', () => {
      state.inkReady = true;
      inkPad.classList.add('is-inked');
      toast('指尖沾了一点朱砂。', 1600);
    });
  }

  let stampCtx = null;
  function playStampSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!stampCtx) stampCtx = new AC();
      const ctx = stampCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(55, t + .12);
      g.gain.setValueAtTime(.16, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .18);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + .2);
      const len = Math.floor(ctx.sampleRate * .08);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * .4;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(.06, t);
      ng.gain.exponentialRampToValueAtTime(.001, t + .08);
      src.connect(ng);
      ng.connect(ctx.destination);
      src.start(t);
    } catch (e) { /* silent */ }
  }

  /* =========================================================
     02 · 来处
     ========================================================= */
  const bVideo = $('#bVideo');
  const bPoster = $('#bPoster');
  const bTrack = $('#bTrack');
  const bCounter = $('#bCounter');
  const bCaptionText = $('#bCaptionText');

  if (bTrack) {
    D.memories.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'film' + (i === 0 ? ' is-on' : '');
      b.dataset.mem = String(i);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === 0));
      b.innerHTML = '<span class="film__thumb"><img src="assets/bg/' + m.poster + '" alt="" loading="lazy"><span class="film__no">' + String(i + 1).padStart(2, '0') + '</span></span><b>' + m.short + '</b><span>' + m.title + '</span>';
      b.addEventListener('click', () => setMemory(i));
      bTrack.appendChild(b);
    });
  }

  function setMemory(i) {
    const m = D.memories[i];
    if (!m) return;
    state.memIndex = i;
    setVideo(bVideo, bPoster, m.video, m.poster);
    bCounter.textContent = String(i + 1).padStart(2, '0') + ' / 06';
    $$('.film', bTrack).forEach((el, k) => {
      el.classList.toggle('is-on', k === i);
      el.setAttribute('aria-selected', String(k === i));
    });
    bCaptionText.textContent = m.caption;
    if (!reduced && bCaptionText.animate) {
      bCaptionText.animate(
        [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }],
        { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
    }
  }

  if (bCaptionText) bCaptionText.textContent = D.memories[0].caption;

  const originObs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting || state.memInit) return;
      state.memInit = true;
      setMemory(0);
      originObs.disconnect();
    });
  }, { rootMargin: '360px 0px' });
  if (bTrack) originObs.observe(bTrack);

  /* =========================================================
     03 · 隔桌
     ========================================================= */
  const stageDoll = $('#stageDoll');
  const doll = $('#doll');
  const bubble = $('#dollBubble');
  const wardrobeRail = $('#wardrobeRail');

  function ensureStage() {
    if (state.stageReady || state.stageTried) return;
    state.stageTried = true;
    const canvas = $('#liveCanvas');
    if (!canvas || !window.QHStage) { fallbackStage(); return; }
    const st = new window.QHStage(canvas);
    if (!st.init()) { fallbackStage(); return; }
    state.stage = st;
    state.stageReady = true;
    const stageVideo = $('#cStageVideo');
    if (stageVideo) {
      fetch('assets/video/C0_stage.mp4', { method: 'HEAD' })
        .then(r => {
          if (!r.ok) return;
          stageVideo.src = 'assets/video/C0_stage.mp4';
          stageVideo.addEventListener('loadeddata', () => stageVideo.classList.add('is-live'), { once: true });
          stageVideo.play().catch(() => {});
        })
        .catch(() => {});
    }
    st.setBase('assets/lihui/w01e01.webp');
    st.preload(['e02', 'e03', 'e04', 'e05', 'e06', 'e07'].map(e => 'assets/lihui/w01' + e + '.webp'));
    const flows = [];
    for (let i = 2; i <= 7; i++) {
      flows.push('assets/flow/w01_e01_e0' + i + '.png', 'assets/flow/w01_e0' + i + '_e01.png');
    }
    st.preload(flows);
    st.onStare(() => {
      if (state.outfit === '01' && state.pose !== 'e06') {
        st.morphTo(
          'assets/lihui/w01e06.webp',
          'assets/flow/w01_' + state.pose + '_e06.png',
          'assets/flow/w01_e06_' + state.pose + '.png',
          520,
          [0.5, 0.1]
        );
        state.pose = 'e06';
      } else {
        st.crossfade('assets/lihui/w' + state.outfit + 'e06.webp');
      }
      setBubble('周清禾', '“……你还要看多久。”', '再看，我就要收钱了。', 4200);
      setHeat(4);
      blush(.72);
      state.fav = Math.min(100, state.fav + 1);
      renderRecord();
    });
    renderRecord();
  }

  function fallbackStage() {
    const canvas = $('#liveCanvas');
    if (!canvas) return;
    const img = document.createElement('img');
    img.src = 'assets/lihui/w01e01.webp';
    img.alt = '周清禾立绘';
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;object-position:center bottom';
    canvas.replaceWith(img);
    toast('当前浏览器不支持 WebGL，已切换为静态立绘。', 3200);
  }

  function setBubble(who, text, inner, ms) {
    if (!bubble) return;
    $('#bubbleWho').textContent = who;
    $('#bubbleText').textContent = text;
    $('#bubbleInner').textContent = inner || '';
    bubble.classList.add('is-on');
    clearTimeout(state.bubbleTimer);
    state.bubbleTimer = setTimeout(() => bubble.classList.remove('is-on'), ms || 5200);
  }

  function blush(level) {
    const c = $('#blushCheek');
    const e = $('#blushEar');
    if (c) c.style.opacity = String(clamp(level * .85, 0, 1));
    if (e) e.style.opacity = String(clamp(level, 0, 1));
  }

  function setHeat(level) {
    state.heat = clamp(Math.round(level), 1, 5);
    $$('#vHeat i').forEach((el, k) => el.classList.toggle('is-on', k < state.heat));
    const label = $('#vHeatText');
    if (label) label.textContent = D.heatLabels[state.heat - 1];
  }

  function renderRecord() {
    const fav = $('#vFav');
    const bar = $('#vFavBar');
    const secrets = $('#vSecrets');
    const tabCount = $('#tabSecretCount');
    const pokeCount = $('#pokeCount');
    if (fav) fav.textContent = state.fav;
    if (bar) bar.style.width = state.fav + '%';
    if (secrets) secrets.textContent = state.secrets.size;
    if (tabCount) tabCount.textContent = state.secrets.size + '/7';
    if (pokeCount) pokeCount.textContent = state.secrets.size + ' / 7';
  }

  function buildPoke() {
    const list = $('#pokeList');
    if (!list) return;
    list.innerHTML = '';
    D.hotspotOrder.forEach(key => {
      const h = D.hotspots[key];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'poke-btn';
      b.dataset.poke = key;
      b.setAttribute('aria-label', h.short + ' · ' + h.label);
      b.innerHTML = '<span class="poke-btn__k">' + h.short + '</span><span class="poke-btn__d" aria-hidden="true"><i></i><i></i><i></i></span>';
      b.addEventListener('click', () => pokeHotspot(key));
      list.appendChild(b);
    });
  }

  function syncPoke(key) {
    $$('.poke-btn').forEach(b => {
      const k = b.dataset.poke;
      const rec = state.hsStage[k];
      const stage = rec ? rec.stage : -1;
      const max = rec ? (rec.max || 0) : 0;
      b.classList.toggle('is-on', k === key);
      b.classList.toggle('is-done', max >= 3);
      $$('i', b).forEach((dot, i) => dot.classList.toggle('on', i <= stage));
    });
  }

  function currentEmotion() {
    const last = Object.values(state.hsStage).sort((a, b) => b.t - a.t)[0];
    return last ? last.emo : 'e01';
  }

  function pokeHotspot(key) {
    const h = D.hotspots[key];
    if (!h) return;
    const rec = state.hsStage[key] || { stage: -1, max: 0, t: 0 };
    if (rec.stage >= 2) rec.stage = -1;
    rec.stage = Math.min(2, rec.stage + 1);
    rec.max = Math.max(rec.max || 0, rec.stage + 1);
    rec.t = Date.now();
    rec.emo = h.stages[rec.stage].emo;
    state.hsStage[key] = rec;
    const s = h.stages[rec.stage];

    if (state.stage && state.stage.ok) {
      if (state.outfit === '01') {
        if (s.emo !== state.pose) {
          state.stage.morphTo(
            'assets/lihui/w01' + s.emo + '.webp',
            'assets/flow/w01_' + state.pose + '_' + s.emo + '.png',
            'assets/flow/w01_' + s.emo + '_' + state.pose + '.png',
            420,
            [h.anchor[0] / 100, h.anchor[1] / 100]
          );
          state.pose = s.emo;
        }
      } else {
        state.stage.crossfade('assets/lihui/w' + state.outfit + s.emo + '.webp');
      }
      state.stage.impulse(h.anchor[0] / 100, h.anchor[1] / 100, rec.stage === 2 ? 1.6 : 1.15);
    }

    setBubble('周清禾', s.line, s.inner, 5600);
    setHeat(s.heat);
    blush(s.heat / 5);
    $('#vMask').textContent = s.mask;
    $('#vNote').textContent = s.note;
    $('#dollEmo').textContent = D.emotionNames[s.emo] || '清冷';
    if (rec.stage === 0) unlockSecret(h.secret);
    if (rec.stage === 2) toast('这一处，她没再嘴硬。', 2000);
    syncPoke(key);
    renderRecord();
  }

  function nearestPart(nx, ny) {
    let best = null, bestD = Infinity;
    D.hotspotOrder.forEach(key => {
      const a = D.hotspots[key].anchor;
      const dx = nx - a[0] / 100;
      const dy = (ny - a[1] / 100) * 1.45;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = key; }
    });
    return bestD <= .028 ? best : null;
  }

  (function bindDollTap() {
    if (!doll) return;
    let down = null;
    doll.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.hs') || e.target.closest('.doll-bubble')) return;
      down = { x: e.clientX, y: e.clientY, t: Date.now() };
    }, { passive: true });
    doll.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = Date.now() - down.t < 620;
      down = null;
      if (moved > 12 || !quick) return;
      const target = $('#liveCanvas') || doll;
      const r = target.getBoundingClientRect();
      if (!r.width) return;
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
      const key = nearestPart(nx, ny);
      if (key) pokeHotspot(key);
    }, { passive: true });
  })();

  function unlockSecret(i) {
    if (state.secrets.has(i)) return false;
    state.secrets.add(i);
    $$('.polaroid[data-secret="' + i + '"]').forEach(p => {
      p.classList.remove('is-locked');
      p.classList.add('is-unlocked');
    });
    state.fav = Math.min(100, state.fav + 2);
    renderRecord();
    return true;
  }

  function buildPolaroids() {
    buildPolaroidGrid($('#polaroids'));
    buildPolaroidsBack();
  }

  function buildPolaroidsBack() {
    buildPolaroidGrid($('#polaroidsBack'));
  }

  function buildPolaroidGrid(wrap) {
    if (!wrap) return;
    wrap.innerHTML = '';
    D.hotspotOrder.forEach((key, i) => {
      const h = D.hotspots[key];
      const p = document.createElement('button');
      p.type = 'button';
      p.className = 'polaroid ' + (state.secrets.has(i) ? 'is-unlocked' : 'is-locked');
      p.dataset.secret = String(i);
      p.innerHTML = '<img src="assets/bg/' + h.polaroid + '" alt="' + h.secretName + '" loading="lazy"><b>' + D.polaroidLabels[i] + '</b>';
      p.addEventListener('click', () => {
        if (!state.secrets.has(i)) {
          toast('这一格还是空的。去碰碰她。', 1800);
          return;
        }
        openModal(
          '课桌物证 · ' + String(i + 1).padStart(2, '0'),
          h.secretName,
          '<div class="evi"><img src="assets/bg/' + h.polaroid + '" alt="' + h.secretName + '"><p>' + h.stages[2].inner + '</p><em>' + h.stages[0].note + '</em></div>',
          'modal--evi'
        );
      });
      wrap.appendChild(p);
    });
  }

  function buildWardrobe() {
    if (!wardrobeRail) return;
    wardrobeRail.innerHTML = '';
    D.outfits.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wr' + (o.id === state.outfit ? ' is-on' : '') + (state.outfitUnlocked.has(o.id) ? '' : ' is-locked');
      b.dataset.outfit = o.id;
      b.innerHTML = '<em>' + o.id + '</em><b>' + o.name + '</b>';
      b.title = o.name + ' · ' + o.sub;
      b.addEventListener('click', () => selectOutfit(o));
      wardrobeRail.appendChild(b);
    });
    const foot = $('#wardrobeState');
    if (foot) foot.textContent = '已解锁 ' + state.outfitUnlocked.size + ' / 16';
  }

  function selectOutfit(o) {
    if (!state.outfitUnlocked.has(o.id)) {
      openSeal(o);
      return;
    }
    state.outfit = o.id;
    $$('.wr').forEach(b => b.classList.toggle('is-on', b.dataset.outfit === o.id));
    const wn = $('#wardrobeName');
    const dout = $('#dollOutfit');
    if (wn) wn.textContent = o.name;
    if (dout) dout.textContent = o.id + ' / ' + o.name;

    if (state.stage && state.stage.ok) {
      const prefix = 'assets/lihui/w' + o.id;
      state.stage.preload(['e01', 'e02', 'e03', 'e04', 'e05', 'e06', 'e07'].map(e => prefix + e + '.webp'));
      if (o.id === '01') {
        state.pose = 'e01';
        state.stage.crossfade(prefix + 'e01.webp', () => { state.pose = 'e01'; });
      } else {
        state.stage.crossfade(prefix + currentEmotion() + '.webp');
      }
    }

    if (o.line) {
      setBubble('周清禾', o.line, o.inner, 6200);
      const note = $('#vNote');
      const mask = $('#vMask');
      if (note) note.textContent = o.note;
      if (mask) mask.textContent = o.private ? '耳根烧透 · 视线躲闪' : '换了一身 · 站得有点僵';
      setHeat(o.private ? 5 : 3);
      blush(o.private ? .85 : .4);
    }
    toast('换上了「' + o.name + '」', 2200);
  }

  function openSeal(o) {
    openModal(
      '衣橱深处 · 仅限独处',
      o.name,
      '<div class="seal"><p class="seal__kicker">封条未启</p><h4>' + o.name + '</h4><p class="seal__sub">' + o.sub + '</p><p class="seal__txt">这件衣服被她用防尘袋裹了两层，压在二楼小阁楼衣柜的最底层。只有在老语音室从里面抵住门、或是阁楼拉严窗帘的夜晚，拿着那张按了红手印的字据，她才会咬着嘴唇换给你一个人看。</p><button class="btn btn--primary" id="sealTear" type="button">按字据兑现 · 拆开防尘袋</button></div>',
      'modal--seal'
    );
    const tear = $('#sealTear');
    if (tear) {
      tear.addEventListener('click', () => {
        state.outfitUnlocked.add(o.id);
        buildWardrobe();
        selectOutfit(o);
        closeModal();
        toast('封条拆开了。她别过脸，没说话。', 2600);
      });
    }
  }

  const btnWardrobeAll = $('#btnWardrobeAll');
  if (btnWardrobeAll) {
    btnWardrobeAll.addEventListener('click', () => {
      openModal(
        '衣橱',
        '百日衣橱 · 十六套',
        '<div class="wardrobe-all">' + D.outfits.map(o =>
          '<button class="wa-item' + (state.outfitUnlocked.has(o.id) ? '' : ' is-locked') + (o.id === state.outfit ? ' is-on' : '') + '" data-outfit="' + o.id + '" type="button"><b>' + o.id + '</b><span>' + o.name + '</span><em>' + (state.outfitUnlocked.has(o.id) ? o.sub : '封条未启') + '</em></button>'
        ).join('') + '</div><p class="wa-note">前 10 套日常装可以直接换。后 6 套需要先按字据拆开封条；网页里只做立绘与台词预览。</p>'
      );
      $$('.wa-item', modalBody).forEach(b => {
        b.addEventListener('click', () => {
          const o = D.outfits.find(x => x.id === b.dataset.outfit);
          if (!o) return;
          closeModal();
          selectOutfit(o);
        });
      });
    });
  }


  /* =========================================================
     03.5 · 同桌手记
     ========================================================= */
  function buildArchive() {
    const grid = $('#archiveGrid');
    if (grid) {
      grid.innerHTML = D.archive.grid.map(g => {
        const cls = g.span === 2 ? 'span2' : g.span === 3 ? 'span3' : '';
        return '<div class="' + cls + '"><span>' + g.label + '</span><b>' + g.value + '</b><em>' + g.note + '</em></div>';
      }).join('');
    }

    const scraps = $('#archiveScraps');
    if (scraps) {
      scraps.innerHTML = D.archive.scraps.map((s, i) =>
        '<article><i>' + String(i + 1).padStart(2, '0') + '</i><b>' + s.title + '</b><p>' + s.text + '</p></article>'
      ).join('');
    }

    $$('.a-tab').forEach(t => {
      t.addEventListener('click', () => {
        $$('.a-tab').forEach(x => {
          x.classList.toggle('is-on', x === t);
          x.setAttribute('aria-selected', String(x === t));
        });
        $$('.a-page').forEach(p => p.classList.toggle('is-on', p.dataset.page === t.dataset.tab));
      });
    });

    buildPolaroids();
  }

  /* =========================================================
     04 · 百日
     ========================================================= */
  const dVideo = $('#dVideo');
  const dPoster = $('#dPoster');
  const playNav = $('#playNav');
  const playMap = $('#playMap');

  if (playNav) {
    D.plays.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pn' + (i === 0 ? ' is-on' : '');
      b.dataset.play = String(i);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === 0));
      b.innerHTML = '<i>' + String(i + 1).padStart(2, '0') + '</i><b>' + p.nav + '</b><span>' + p.sub + '</span><em>' + p.tag.split(' · ')[1] + '</em>';
      b.addEventListener('click', () => setPlay(i));
      playNav.appendChild(b);
    });
  }

  if (playMap) {
    Object.entries(D.mapScenes).forEach(([key, sc]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.map = key;
      b.textContent = sc.name;
      b.addEventListener('click', () => setMap(key, b));
      playMap.appendChild(b);
    });
  }

  function renderPlayInfo(rows) {
    const box = $('#playInfo');
    if (!box) return;
    box.innerHTML = rows.map(r =>
      '<div class="pi-row"><span class="pi-k">' + r[0] + '</span><span class="pi-v">' + r[1] + '</span></div>'
    ).join('');
  }

  function setPlay(i) {
    $$('.pn').forEach(b => {
      const on = +b.dataset.play === i;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    const p = D.plays[i];
    if (!p) return;
    const tag = $('#dTag');
    if (tag) tag.textContent = p.tag;
    setVideo(dVideo, dPoster, p.video, p.poster);
    renderPlayInfo(p.rows);
    $$('#playMap button').forEach(b => b.classList.toggle('is-on', b.dataset.map === p.map));
  }

  function setMap(key, btn) {
    const sc = D.mapScenes[key];
    if (!sc) return;
    $$('#playMap button').forEach(b => b.classList.toggle('is-on', b === btn));
    $$('.pn').forEach(b => {
      b.classList.remove('is-on');
      b.setAttribute('aria-selected', 'false');
    });
    const tag = $('#dTag');
    if (tag) tag.textContent = sc.tag;
    setVideo(dVideo, dPoster, sc.video, sc.poster);
    renderPlayInfo([['地点', sc.name], ['场景', sc.note]]);
    toast('走读地图 · ' + sc.name, 1600);
  }

  renderPlayInfo(D.plays[0].rows);

  const playObs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting || state.playInit) return;
      state.playInit = true;
      setPlay(0);
      playObs.disconnect();
    });
  }, { rootMargin: '360px 0px' });
  if (playNav) playObs.observe(playNav);

  /* =========================================================
     05 · 落座
     ========================================================= */
  const idGallery = $('#idGallery');
  const idViewport = $('#idViewport');
  const idPrev = $('#idPrev');
  const idNext = $('#idNext');
  const els = {
    name: $('#vName'),
    look: $('#vLook'),
    trait: $('#vTrait'),
    extra: $('#vExtra')
  };

  if (idGallery) {
    D.identities.forEach(it => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'idcard' + (it.id === state.id ? ' is-on' : '');
      b.dataset.id = it.id;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(it.id === state.id));
      b.innerHTML = '<img class="idcard__img" src="' + it.img + '" alt="' + it.name + '" loading="lazy"><div class="idcard__body"><span class="idcard__no">IDENTITY · ' + it.id + '</span><b class="idcard__name">' + it.name + '</b><span class="idcard__sub">' + it.sub + '</span><div class="idcard__stats"><span>¥' + it.money + '</span><span>精力 ' + it.energy + '</span><span>好感 ' + it.fav + '</span></div></div>';
      b.addEventListener('click', () => selectIdentity(it.id));
      idGallery.appendChild(b);
    });
    const centerFirst = () => {
      const first = idGallery.querySelector('.idcard.is-on');
      if (first) centerIdentityCard(first, false);
    };
    requestAnimationFrame(centerFirst);
    setTimeout(centerFirst, 600);
  }

  function currentId() {
    return D.identities.find(i => i.id === state.id) || D.identities[3];
  }

  function centerIdentityCard(card, smooth) {
    if (!card || !idViewport) return;
    const cr = card.getBoundingClientRect();
    const vr = idViewport.getBoundingClientRect();
    const delta = (cr.left - vr.left) - (vr.width - cr.width) / 2;
    const max = Math.max(0, idViewport.scrollWidth - idViewport.clientWidth);
    const target = Math.min(max, Math.max(0, idViewport.scrollLeft + delta));
    idViewport.scrollTo({ left: target, behavior: smooth === false ? 'auto' : 'smooth' });
    if (smooth !== false) {
      setTimeout(() => {
        if (Math.abs(idViewport.scrollLeft - target) > 2) idViewport.scrollLeft = target;
      }, 520);
    }
  }

  function selectIdentity(id) {
    state.id = id;
    let selected = null;
    $$('.idcard').forEach(c => {
      const on = c.dataset.id === id;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-checked', String(on));
      if (on) selected = c;
    });
    updateSummary();
    centerIdentityCard(selected);
  }

  function stepIdentity(dir) {
    const cards = idGallery ? Array.from(idGallery.querySelectorAll('.idcard')) : [];
    if (!cards.length) return;
    let i = cards.findIndex(c => c.dataset.id === state.id);
    if (i < 0) i = 0;
    const next = (i + dir + cards.length) % cards.length;
    selectIdentity(cards[next].dataset.id);
  }

  if (idPrev) idPrev.addEventListener('click', () => stepIdentity(-1));
  if (idNext) idNext.addEventListener('click', () => stepIdentity(1));

  function updateSummary() {
    const it = currentId();
    const fav = $('#sFav');
    const money = $('#sMoney');
    const energy = $('#sEnergy');
    const crush = $('#sCrush');
    const perks = $('#sPerks');
    const note = $('#sNote');
    if (fav) fav.textContent = it.fav;
    if (money) money.textContent = '¥' + it.money;
    if (energy) energy.textContent = it.energy;
    if (crush) crush.textContent = it.crush;
    if (perks) perks.innerHTML = it.perks.map(p => '<span>' + p + '</span>').join('');
    if (note) note.textContent = it.note;
  }

  function getSex() {
    const custom = ($('#vSexCustom') && $('#vSexCustom').value || '').trim();
    if (custom) return custom;
    const on = $('#vSex button.is-on');
    return on ? on.dataset.sex : '';
  }

  function buildText() {
    const it = currentId();
    const name = (els.name.value || '').trim() || '（未填写）';
    const sex = getSex();
    const sexStr = sex ? '（' + sex + '）' : '';
    const extra = (els.extra.value || '').trim();
    const look = (els.look.value || '').trim();
    const trait = (els.trait.value || '').trim();

    const detail = [];
    if (look) detail.push('外貌：' + look);
    if (trait) detail.push('性格：' + trait);
    if (extra) detail.push('额外：' + extra);

    const lines = [];
    lines.push('【开局】我是' + name + '，周清禾的同桌' + sexStr + '。身份：' + it.id + ' ' + it.name + '（钱包 ¥' + it.money + '，精力上限 ' + it.energy + '；' + it.perks.join('；') + '）。');
    if (detail.length) lines.push('补充设定：' + detail.join('｜'));
    lines.push('请从下面这段开场的最后一刻接着写，不要重复开场原文，不要替我说话或行动。');
    lines.push('——开场——');
    lines.push(D.opening.join('\n'));
    lines.push('——————');
    const secret = it.id === 'D' ? '已知道粮油铺' : '无';
    lines.push('开局状态：2月27日周五 · 下午百日誓师后 · 高三（7）班教室 · 距高考100天（距一模17天）；好感 ' + it.fav + '/100；心动 10；学力 140 · 模考约 68 · Lv.1 几何迷路人；翻唱号「冷感绝缘体.」127 粉 · Tier 1；设备 Lv.1 地摊耳机麦；小铁盒 ¥43.5；钱包 ¥' + it.money + '；精力 ' + it.energy + '/' + it.energy + '；已暴露的秘密：' + secret + '。');
    return lines.join('\n');
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  function showResult(text) {
    openModal(
      '缔结完成',
      '百日同桌契约 · 开局文稿',
      '<div class="seal-out"><p class="seal-out__lead">把下面这段整段复制，粘贴到聊天框发送。故事会从她把水笔推过三八线的那一刻接着往下写。</p><pre id="sealText"></pre><div class="seal-out__bar"><span class="seal-out__state" id="sealState"></span><button class="btn btn--tiny" id="sealCopy" type="button">复制文稿</button><button class="btn btn--primary" data-close type="button">收好，进教室</button></div></div>'
    );
    const pre = $('#sealText');
    if (pre) pre.textContent = text;
    const copyBtn = $('#sealCopy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const ok = await copyText(text);
        const st = $('#sealState');
        if (st) {
          st.textContent = ok ? '已复制到剪贴板' : '复制失败，请手动全选';
          st.classList.toggle('is-bad', !ok);
        }
      });
    }
    return copyText(text).then(ok => {
      const st = $('#sealState');
      if (st) {
        st.textContent = ok ? '已复制到剪贴板' : '复制失败，请手动全选';
        st.classList.toggle('is-bad', !ok);
      }
      return ok;
    });
  }

  function stamp() {
    if (state.stamped) {
      toast('手印已经按好了。', 1400);
      return;
    }
    if (!state.inkReady) {
      state.inkReady = true;
      if (inkPad) inkPad.classList.add('is-inked');
      toast('先沾了一点朱砂，再按下去。', 1600);
    }
    state.stamped = true;
    const pad = $('#vStampPad');
    if (pad) pad.classList.add('is-stamped');
    playStampSound();
    toast('红手印按在了目标卡右下角。', 1800);
  }

  async function seal() {
    if (state.sealing) return;
    state.sealing = true;
    if (!state.stamped) stamp();
    const text = buildText();
    const ok = await showResult(text);
    toast(ok ? '契约已缔结 · 开局文稿已复制。' : '契约已缔结 · 请手动复制。', 3200);
    state.sealing = false;
  }

  const stampPad = $('#vStampPad');
  if (stampPad) stampPad.addEventListener('click', stamp);
  const btnSeal = $('#btnSeal');
  if (btnSeal) btnSeal.addEventListener('click', seal);

  const btnCopy = $('#btnCopy');
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      const text = buildText();
      const ok = await showResult(text);
      toast(ok ? '开局文稿已复制。' : '复制失败，请在弹窗里手动全选。', 2600);
    });
  }

  const btnShowOpening = $('#btnShowOpening');
  if (btnShowOpening) {
    btnShowOpening.addEventListener('click', () => {
      openModal(
        '原卡开场白',
        '2月27日 · 下午第二节课后',
        '<div class="opening-read">' + D.opening.map(p => '<p>' + p + '</p>').join('') + '</div>',
        'modal--opening'
      );
    });
  }

  const btnRandom = $('#btnRandom');
  if (btnRandom) {
    btnRandom.addEventListener('click', () => {
      const p = D.presets;
      if (els.name) els.name.value = rand(p.names);
      if (els.look) els.look.value = rand(p.looks);
      if (els.trait) els.trait.value = rand(p.traits);
      if (els.extra) els.extra.value = rand(p.extras);
      toast('行囊已随机装好。不喜欢可以改。', 2000);
    });
  }

  $$('#vSex button').forEach(b => {
    b.addEventListener('click', () => {
      $$('#vSex button').forEach(x => x.classList.toggle('is-on', x === b));
      const custom = $('#vSexCustom');
      if (custom) custom.value = '';
    });
  });
  const sexCustom = $('#vSexCustom');
  if (sexCustom) {
    sexCustom.addEventListener('input', () => {
      if (sexCustom.value.trim()) $$('#vSex button').forEach(x => x.classList.remove('is-on'));
    });
  }

  /* =========================================================
     初始化
     ========================================================= */
  buildPoke();
  buildWardrobe();
  buildArchive();
  updateSummary();
  setLine(0);
  setHeat(1);
  renderRecord();

  const stageObs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      ensureStage();
      stageObs.disconnect();
    });
  }, { rootMargin: '420px 0px' });
  if (stageDoll) stageObs.observe(stageDoll);

  window.QH_APP = {
    state,
    D,
    toast,
    openModal,
    closeModal,
    selectIdentity,
    setBgmTrack,
    updatePlayerUI,
    playerTrack
  };
})();
