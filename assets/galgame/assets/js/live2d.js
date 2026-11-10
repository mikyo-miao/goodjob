/* =========================================================
   Live2D-ish Stage Engine
   WebGL 2D 网格蒙皮 + 二阶弹簧物理
   —— 呼吸 / 视线跟随 / 发丝与裙摆阻尼 / 点击冲量 / 眨眼 / 说话
   ========================================================= */
(function () {
  'use strict';
  const VERT = `
    attribute vec2 aUV;
    uniform vec2 uHeadPivot;
    uniform vec2 uBodyPivot;
    uniform vec2 uImpulseCenter;
    uniform float uHeadAngle;
    uniform float uHeadYaw;
    uniform float uBodyLean;
    uniform float uBreath;
    uniform float uHair;
    uniform float uSkirt;
    uniform float uImpulse;
    uniform float uTime;
    uniform float uTalk;
    varying vec2 vUV;

    vec2 rot(vec2 p, vec2 pivot, float a){
      vec2 d = p - pivot;
      float c = cos(a), s = sin(a);
      return pivot + vec2(c * d.x - s * d.y, s * d.x + c * d.y);
    }
    float band(float v, float a, float b, float c, float d){
      return smoothstep(a, b, v) * (1.0 - smoothstep(c, d, v));
    }

    void main(){
      vec2 uv = aUV;
      vec2 p = uv;

      float wHead = 1.0 - smoothstep(0.170, 0.255, uv.y);
      p = rot(p, uHeadPivot, uHeadAngle * wHead);
      p.x += uHeadYaw * wHead * (uv.y - uHeadPivot.y) * 1.25;
      p.y += uBreath * 0.0032 * wHead;

      float chest = band(uv.y, 0.215, 0.270, 0.345, 0.415);
      p.y += uBreath * 0.0048 * chest;
      p.x += (uv.x - 0.5) * uBreath * 0.013 * chest;

      float wBody = smoothstep(0.21, 0.62, uv.y);
      p = rot(p, uBodyPivot, uBodyLean * wBody);

      float side = smoothstep(0.085, 0.24, abs(uv.x - 0.5));
      float hairY = smoothstep(0.025, 0.115, uv.y) * (1.0 - smoothstep(0.55, 0.69, uv.y));
      float hairW = side * hairY * mix(0.32, 1.85, uv.y);
      p.x += uHair * 0.016 * hairW;
      p.y += sin(uTime * 1.25 + uv.y * 7.0) * 0.0016 * hairW;

      float skirtX = 1.0 - smoothstep(0.10, 0.23, abs(uv.x - 0.5));
      float skirtW = band(uv.y, 0.375, 0.415, 0.505, 0.560) * skirtX;
      p.x += uSkirt * 0.012 * skirtW * (uv.y - 0.37) * 3.2;
      p.y += abs(uSkirt) * 0.0028 * skirtW;

      float mouthW = (1.0 - smoothstep(0.020, 0.050, abs(uv.x - 0.503)))
                   * band(uv.y, 0.150, 0.160, 0.170, 0.182);
      p.y += uTalk * 0.0042 * mouthW * sin(uTime * 17.0);

      vec2 d = uv - uImpulseCenter;
      float dist = length(d * vec2(1.0, 0.74));
      float fall = smoothstep(0.30, 0.0, dist);
      p += normalize(d + vec2(1e-5)) * uImpulse * 0.032 * fall;
      p.y += uImpulse * 0.0065 * fall;

      vUV = uv;
      vec2 clip = p * 2.0 - 1.0;
      clip.y *= -1.0;
      gl_Position = vec4(clip, 0.0, 1.0);
    }
  `;

  const FRAG = `
    precision mediump float;
    uniform sampler2D uTexA;
    uniform sampler2D uTexB;
    uniform sampler2D uFlow;
    uniform float uMix;
    uniform float uHasFlow;
    uniform vec2 uFlowSize;
    uniform vec2 uWipeCenter;
    uniform float uWipeR;
    uniform float uBlink;
    uniform float uGazeX;
    uniform float uGazeY;
    varying vec2 vUV;

    void main(){
      vec2 uv = vUV;
      float eyeL = 1.0 - smoothstep(0.022, 0.042, abs(uv.x - 0.487));
      float eyeR = 1.0 - smoothstep(0.022, 0.042, abs(uv.x - 0.548));
      float eyeBand = smoothstep(0.112, 0.122, uv.y) * (1.0 - smoothstep(0.132, 0.143, uv.y))
                    * max(eyeL, eyeR);
      uv.x += uGazeX * 0.0030 * eyeBand;
      uv.y += uGazeY * 0.0018 * eyeBand;

      vec4 c;
      vec4 a, b;
      float m = smoothstep(0.0, 1.0, uMix);
      if (uHasFlow > 0.5) {
        vec4 e = texture2D(uFlow, uv);
        float fx = (e.r * 65280.0 + e.g * 255.0) / 65535.0;
        float fy = (e.b * 65280.0 + e.a * 255.0) / 65535.0;
        vec2 f = vec2(fx, fy) * 192.0 - 96.0;
        a = texture2D(uTexA, uv + f / uFlowSize * 0.10);
        b = texture2D(uTexB, uv);
        vec2 pp = vec2(uv.x, uv.y * 1.38);
        vec2 cp = vec2(uWipeCenter.x, uWipeCenter.y * 1.38);
        float d = distance(pp, cp);
        float mask = smoothstep(uWipeR + 0.10, uWipeR - 0.10, d);
        c = mix(a, b, mask);
        float ring = exp(-pow((d - uWipeR) / 0.018, 2.0));
        c.rgb += vec3(1.0, 0.86, 0.58) * ring * 0.22 * (1.0 - m);
      } else {
        a = texture2D(uTexA, uv);
        b = texture2D(uTexB, uv);
        c = mix(a, b, m);
      }

      if (c.a < 0.015) discard;
      gl_FragColor = c;
    }
  `;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function spring(cur, target, vel, k, c, dt) {
    const a = (target - cur) * k - vel * c;
    vel += a * dt;
    cur += vel * dt;
    return [cur, vel];
  }

  function QHStage(canvas) {
    this.canvas = canvas;
    this.ok = false;
    this.cache = new Map();
    this.current = null;
    this.next = null;
    this.mix = 1;
    this.target = { x: 0.5, y: 0.5 };
    this.pointer = { x: 0.5, y: 0.5, in: false };
    this.phys = {
      headAngle: 0, headAngleV: 0,
      headYaw: 0, headYawV: 0,
      bodyLean: 0, bodyLeanV: 0,
      hair: 0, hairV: 0,
      skirt: 0, skirtV: 0,
      impulse: 0, impulseV: 0,
      center: [0.5, 0.3]
    };
    this.t = 0;
    this.last = 0;
    this.blink = 0;
    this.blinkTimer = 2.4 + Math.random() * 2.4;
    this.talk = 0;
    this.talkOn = false;
    this.avoidUntil = 0;
    this.stare = 0;
    this.stareFired = 0;
    this.stareCb = null;
    this.emotion = 'e01';
    this.base = '01';
    this.raf = 0;
    this._loop = this._loop.bind(this);
  }

  QHStage.prototype.init = function () {
    const gl = this.canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
            || this.canvas.getContext('experimental-webgl', { alpha: true, antialias: true });
    if (!gl) return false;
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aUV');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return false;
    }
    this.prog = prog;
    gl.useProgram(prog);

    // mesh
    const cols = 48, rows = 64;
    const verts = new Float32Array(cols * rows * 2);
    let i = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        verts[i++] = x / (cols - 1);
        verts[i++] = y / (rows - 1);
      }
    }
    const idx = [];
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols - 1; x++) {
        const a = y * cols + x, b = a + 1, c = a + cols, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    this.count = idx.length;

    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

    this.u = {};
    ['uHeadPivot', 'uBodyPivot', 'uImpulseCenter', 'uHeadAngle', 'uHeadYaw', 'uBodyLean',
      'uBreath', 'uHair', 'uSkirt', 'uImpulse', 'uTime', 'uTalk',
      'uTexA', 'uTexB', 'uFlow', 'uMix', 'uHasFlow', 'uFlowSize', 'uWipeCenter', 'uWipeR', 'uBlink', 'uGazeX', 'uGazeY'].forEach(n => {
      this.u[n] = gl.getUniformLocation(prog, n);
    });

    gl.useProgram(prog);
    gl.uniform2f(this.u.uHeadPivot, 0.5, 0.205);
    gl.uniform2f(this.u.uBodyPivot, 0.5, 0.44);
    gl.uniform1f(this.u.uMix, 1);
    gl.uniform1f(this.u.uHasFlow, 0);
    gl.uniform2f(this.u.uFlowSize, 260, 380);
    gl.uniform2f(this.u.uWipeCenter, 0.5, 0.2);
    gl.uniform1f(this.u.uWipeR, 0.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    this.ok = true;
    this._bindPointer();
    this._startTime = performance.now();
    this.raf = requestAnimationFrame(this._loop);
    return true;
  };

  QHStage.prototype._bindPointer = function () {
    const c = this.canvas;
    const host = c.closest('.doll') || c;
    const set = (e) => {
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      this.pointer.x = Math.min(1.4, Math.max(-0.4, px));
      this.pointer.y = Math.min(1.4, Math.max(-0.4, py));
      this.pointer.in = true;
    };
    host.addEventListener('pointermove', set, { passive: true });
    host.addEventListener('pointerleave', () => { this.pointer.in = false; });
    host.addEventListener('pointerdown', (e) => {
      set(e);
      if (!e.target.closest('.hs') && !e.target.closest('.doll-bubble')) {
        this.impulse(this.pointer.x, this.pointer.y, 1);
      }
    }, { passive: true });
  };

  QHStage.prototype.onStare = function (cb) { this.stareCb = cb; };

  QHStage.prototype.impulse = function (x, y, power) {
    const p = this.phys;
    p.center = [x, y];
    p.impulseV += (power || 1) * 6.2;
    p.hairV += 2.4;
    p.skirtV += 1.6;
    this.talk = 1;
  };

  QHStage.prototype.setTalking = function (on) { this.talkOn = !!on; };

  QHStage.prototype._texture = function (url, cb) {
    if (this.cache.has(url)) {
      const t = this.cache.get(url);
      if (t.ready && cb) cb(t.tex);
      return t;
    }
    const gl = this.gl;
    const tex = gl.createTexture();
    const entry = { tex, ready: false, waiters: cb ? [cb] : [] };
    this.cache.set(url, entry);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      entry.ready = true;
      entry.img = img;
      entry.waiters.forEach(f => { try { f(tex); } catch (e) { console.error(e); } });
      entry.waiters = [];
      this._resize();
    };
    img.onerror = () => { entry.error = true; };
    img.src = url;
    return entry;
  };

  QHStage.prototype.preload = function (urls) {
    urls.forEach(u => this._texture(u));
  };

  QHStage.prototype.setBase = function (url, done) {
    this._texture(url, (tex) => {
      this.current = tex;
      this.next = null;
      this.mix = 1;
      if (done) done();
    });
    this.currentUrl = url;
  };

  QHStage.prototype.crossfade = function (url, done) {
    if (!this.ok) { if (done) done(); return; }
    if (this.currentUrl === url) { if (done) done(); return; }
    this._texture(url, (tex) => {
      this.next = tex;
      this.flowTex = null;
      this.hasFlow = false;
      this.mix = 0;
      this.currentUrl = url;
      this._fadeStart = performance.now();
      this._fadeDur = 260;
      if (done) setTimeout(done, 120);
    });
  };

  QHStage.prototype.morphTo = function (url, flowUrl, flowBackUrl, duration, center, done) {
    if (!this.ok) { if (done) done(); return; }
    if (this.currentUrl === url) { if (done) done(); return; }
    this._texture(url, (tex) => {
      this._texture(flowUrl, (flow) => {
        const start = (back) => {
          this.next = tex;
          this.flowTex = flow;
          this.flowBack = back || flow;
          this.hasFlow = true;
          this.mix = 0;
          this.currentUrl = url;
          this._fadeStart = performance.now();
          this._fadeDur = duration || 820;
          this.wipeCenter = center || [0.5, 0.22];
          if (done) setTimeout(done, 80);
        };
        start(flow);
      });
    });
  };

  QHStage.prototype._resize = function () {
    if (!this.ok) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  };

  QHStage.prototype._loop = function (now) {
    if (!this.ok) return;
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    this.t += dt;
    const t = this.t;
    const p = this.phys;

    // 目标值：视线跟随
    const px = this.pointer.x, py = this.pointer.y;
    let hx = this.pointer.in ? (px - 0.5) : 0;
    let hy = this.pointer.in ? (py - 0.45) : 0;

    // 长时间盯脸 → 偏头躲闪
    const inFace = this.pointer.in && px > 0.34 && px < 0.66 && py > 0.02 && py < 0.18;
    if (inFace) {
      this.stare += dt;
      if (this.stare > 2.3 && t - this.stareFired > 6) {
        this.stareFired = t;
        this.avoidUntil = t + 1.4;
        if (this.stareCb) this.stareCb();
      }
    } else {
      this.stare = Math.max(0, this.stare - dt * 2);
    }
    if (t < this.avoidUntil) {
      hx = -hx * 1.8 + 0.06;
      hy = 0.02;
    }

    const headTarget = hx * 0.20;
    const yawTarget = hx * 0.028;
    const bodyTarget = hx * 0.05 + Math.sin(t * 0.55) * 0.004;
    const hairTarget = -hx * 0.95 + Math.sin(t * 0.9) * 0.16 + Math.sin(t * 0.43 + 1.7) * 0.08;
    const skirtTarget = Math.sin(t * 0.72) * 0.26 + Math.sin(t * 1.31 + 0.6) * 0.08;

    [p.headAngle, p.headAngleV] = spring(p.headAngle, headTarget, p.headAngleV, 46, 9.2, dt);
    [p.headYaw, p.headYawV] = spring(p.headYaw, yawTarget, p.headYawV, 40, 9, dt);
    [p.bodyLean, p.bodyLeanV] = spring(p.bodyLean, bodyTarget, p.bodyLeanV, 30, 8.4, dt);
    [p.hair, p.hairV] = spring(p.hair, hairTarget, p.hairV, 22, 5.2, dt);
    [p.skirt, p.skirtV] = spring(p.skirt, skirtTarget, p.skirtV, 18, 4.6, dt);
    [p.impulse, p.impulseV] = spring(p.impulse, 0, p.impulseV, 85, 11.5, dt);

    // 眨眼
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2.6 + Math.random() * 3.1;
      this._blinkStart = t;
    }
    if (this._blinkStart != null) {
      const k = (t - this._blinkStart) / 0.16;
      this.blink = k >= 1 ? 0 : Math.sin(k * Math.PI);
      if (k >= 1) { this._blinkStart = null; this.blink = 0; }
    }

    // 说话
    const talkTarget = this.talkOn ? 1 : 0;
    this.talk += (talkTarget - this.talk) * Math.min(1, dt * 8);

    const breath = Math.sin(t * 1.35) * 0.5 + 0.5;

    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuf);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(this.u.uHeadPivot, 0.5, 0.205);
    gl.uniform2f(this.u.uBodyPivot, 0.5, 0.44);
    gl.uniform2f(this.u.uImpulseCenter, p.center[0], p.center[1]);
    gl.uniform1f(this.u.uHeadAngle, p.headAngle);
    gl.uniform1f(this.u.uHeadYaw, p.headYaw);
    gl.uniform1f(this.u.uBodyLean, p.bodyLean);
    gl.uniform1f(this.u.uBreath, breath);
    gl.uniform1f(this.u.uHair, p.hair);
    gl.uniform1f(this.u.uSkirt, p.skirt);
    gl.uniform1f(this.u.uImpulse, p.impulse);
    gl.uniform1f(this.u.uTime, t);
    gl.uniform1f(this.u.uTalk, this.talk);
    gl.uniform1f(this.u.uGazeX, hx * 1.6);
    gl.uniform1f(this.u.uGazeY, hy * 1.4);
    gl.uniform1f(this.u.uBlink, this.blink);

    if (this._fadeStart != null) {
      this.mix = Math.min(1, (now - this._fadeStart) / (this._fadeDur || 260));
      if (this.mix >= 1) { this.current = this.next; this.next = null; this.flowTex = null; this.hasFlow = false; this._fadeStart = null; }
    }
    gl.uniform1f(this.u.uMix, this.next ? this.mix : 1);
    gl.uniform1f(this.u.uHasFlow, (this.hasFlow && this.flowTex && this.next) ? 1 : 0);
    gl.uniform2f(this.u.uWipeCenter, (this.wipeCenter || [0.5, 0.22])[0], (this.wipeCenter || [0.5, 0.22])[1]);
    gl.uniform1f(this.u.uWipeR, (this.next ? this.mix : 1) * 1.55);

    const texA = this.next ? this.current : this.current;
    const texB = this.next || this.current;
    if (texA) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.uniform1i(this.u.uTexA, 0);
    }
    if (texB) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texB);
      gl.uniform1i(this.u.uTexB, 1);
    }
    if (this.flowTex && this.hasFlow && this.next) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.flowTex);
      gl.uniform1i(this.u.uFlow, 2);
    }
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    this.raf = requestAnimationFrame(this._loop);
  };

  QHStage.prototype.destroy = function () {
    cancelAnimationFrame(this.raf);
    this.ok = false;
  };

  window.QHStage = QHStage;
})();
