/* =========================================================
   QHPuppet · W01 四层骨骼木偶
   body / head / armL / armR
   ========================================================= */
(function () {
  'use strict';
  const VERT = `
    attribute vec2 aUV;
    attribute float aWeight;
    uniform int uKind;
    uniform vec2 uHeadPivot,uHipPivot,uSpinePivot,uShoulderPivot,uElbowPivot,uImpulseCenter;
    uniform float uHeadAngle,uHeadYaw,uBodyLean,uSpineBend,uBreath,uHair,uSkirt,uTime,uImpulse,uLegLift,uLegBend,uShoulderAngle,uElbowAngle;
    varying vec2 vUV;
    vec2 rot(vec2 p, vec2 pivot, float a){
      vec2 d=p-pivot; float c=cos(a),s=sin(a);
      return pivot+vec2(c*d.x-s*d.y,s*d.x+c*d.y);
    }
    float band(float v,float a,float b,float c,float d){return smoothstep(a,b,v)*(1.0-smoothstep(c,d,v));}
    void main(){
      vec2 uv=aUV; vec2 p=uv;
      if(uKind==1){
        p=rot(p,uHipPivot,uBodyLean*0.55);
        p=rot(p,uSpinePivot,uSpineBend*0.5);
        p=rot(p,uHeadPivot,uHeadAngle);
        p.x+=uHeadYaw*(p.y-uHeadPivot.y)*1.05;
        p.y+=uBreath*0.0022;
      } else if(uKind==2 || uKind==3){
        p=rot(p,uHipPivot,uBodyLean*0.6);
        p=rot(p,uSpinePivot,uSpineBend*0.5);
        vec2 p1=rot(p,uShoulderPivot,uShoulderAngle);
        vec2 e2=rot(uElbowPivot,uShoulderPivot,uShoulderAngle);
        vec2 p2=rot(p-uElbowPivot,vec2(0.0),uShoulderAngle+uElbowAngle)+e2;
        p=mix(p1,p2,aWeight);
      } else {
        p=rot(p,uHipPivot,uBodyLean);
        p=rot(p,uSpinePivot,uSpineBend*0.7);
        float chest=band(uv.y,0.20,0.27,0.35,0.42);
        p.y+=uBreath*0.0045*chest;
        p.x+=(uv.x-0.5)*uBreath*0.013*chest;
        float side=smoothstep(0.075,0.22,abs(uv.x-0.5));
        float hairY=smoothstep(0.04,0.14,uv.y)*(1.0-smoothstep(0.56,0.70,uv.y));
        float hairW=side*hairY*mix(0.35,1.7,uv.y);
        p.x+=uHair*0.016*hairW;
        p.y+=sin(uTime*1.25+uv.y*7.0)*0.0016*hairW;
        float skirtW=band(uv.y,0.40,0.44,0.53,0.58)*(1.0-smoothstep(0.12,0.24,abs(uv.x-0.5)));
        p.x+=uSkirt*0.012*skirtW*(uv.y-0.38)*3.2;
        p.y+=abs(uSkirt)*0.0028*skirtW;
        float legMask=(1.0-smoothstep(0.44,0.48,uv.x))*smoothstep(0.50,0.55,uv.y);
        p=rot(p,vec2(0.42,0.52),uLegLift*legMask);
        p=rot(p,vec2(0.41,0.72),uLegBend*legMask*smoothstep(0.70,0.78,uv.y));
        vec2 d=uv-uImpulseCenter; float dist=length(d*vec2(1.0,0.75));
        float fall=smoothstep(0.30,0.0,dist);
        p+=normalize(d+vec2(1e-5))*uImpulse*0.030*fall;
        p.y+=uImpulse*0.006*fall;
      }
      vUV=uv;
      vec2 clip=p*2.0-1.0; clip.y*=-1.0;
      gl_Position=vec4(clip,0.0,1.0);
    }
  `;
  const FRAG = `
    precision mediump float;
    uniform sampler2D uTex;
    varying vec2 vUV;
    void main(){
      vec4 c=texture2D(uTex,vUV);
      if(c.a<0.015) discard;
      gl_FragColor=c;
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
  function smooth(a, b, v) {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function QHPuppet(canvas) {
    this.canvas = canvas;
    this.ok = false;
    this.cache = new Map();
    this.t = {
      headAngle: 0, headAngleV: 0, headYaw: 0, headYawV: 0,
      bodyLean: 0, bodyLeanV: 0, spine: 0, spineV: 0,
      hair: 0, hairV: 0, skirt: 0, skirtV: 0,
      impulse: 0, impulseV: 0, impulseCenter: [0.5, 0.3],
      legLift: 0, legLiftV: 0, legBend: 0, legBendV: 0,
      armL1: 0, armL1V: 0, armL2: 0, armL2V: 0,
      armR1: 0, armR1V: 0, armR2: 0, armR2V: 0
    };
    this.target = { armL1: 0, armL2: 0, armR1: 0, armR2: 0, legLift: 0, legBend: 0 };
    this.pointer = { x: 0.5, y: 0.5, in: false };
    this.talkOn = false; this.talk = 0; this.time = 0; this.last = 0; this.raf = 0;
    this.stare = 0; this.stareCb = null; this.avoid = 0; this.pose = 'rest';
  }

  QHPuppet.prototype.init = function () {
    const gl = this.canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) return false;
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aUV');
    gl.bindAttribLocation(prog, 1, 'aWeight');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return false;
    }
    this.prog = prog;
    gl.useProgram(prog);
    const cols = 48, rows = 64;
    const verts = new Float32Array(cols * rows * 2);
    let k = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      verts[k++] = x / (cols - 1);
      verts[k++] = y / (rows - 1);
    }
    const idx = [];
    for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols - 1; x++) {
      const a = y * cols + x, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    this.count = idx.length;
    this.rows = rows; this.cols = cols;
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    this.zeroW = new Float32Array(cols * rows);
    this.wbufZero = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wbufZero);
    gl.bufferData(gl.ARRAY_BUFFER, this.zeroW, gl.STATIC_DRAW);
    const names = ['uKind', 'uHeadPivot', 'uHipPivot', 'uSpinePivot', 'uShoulderPivot', 'uElbowPivot',
      'uImpulseCenter', 'uHeadAngle', 'uHeadYaw', 'uBodyLean', 'uSpineBend', 'uBreath', 'uHair',
      'uSkirt', 'uTime', 'uImpulse', 'uLegLift', 'uLegBend', 'uShoulderAngle', 'uElbowAngle', 'uTex'];
    this.u = {};
    names.forEach(n => { this.u[n] = gl.getUniformLocation(prog, n); });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    this.ok = true;
    this._bindPointer();
    this.raf = requestAnimationFrame(this._loop.bind(this));
    return true;
  };

  QHPuppet.prototype.loadTexture = function (url, cb) {
    if (this.cache.has(url)) {
      const e = this.cache.get(url);
      if (e.ready && cb) cb(e.tex);
      return e;
    }
    const gl = this.gl;
    const tex = gl.createTexture();
    const e = { tex, ready: false, waiters: cb ? [cb] : [] };
    this.cache.set(url, e);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      e.ready = true;
      e.waiters.forEach(f => { try { f(tex); } catch (err) { console.error(err); } });
      e.waiters = [];
    };
    img.onerror = () => { e.error = true; };
    img.src = url;
    return e;
  };

  QHPuppet.prototype.loadAll = function (cb) {
    const urls = {
      body: 'assets/rig/body.png', head: 'assets/rig/head.png',
      armL: 'assets/rig/armL.png', armR: 'assets/rig/armR.png'
    };
    let n = 0;
    this.tex = {};
    Object.keys(urls).forEach(k => this.loadTexture(urls[k], tex => {
      this.tex[k] = tex;
      n++;
      if (n === 4) {
        this._buildWeights();
        this.setPose('cross', true);
        if (cb) cb();
      }
    }));
  };

  QHPuppet.prototype._armWeight = function (p, S, E, W) {
    const ax = S[0], ay = S[1], bx = E[0], by = E[1], cx = W[0], cy = W[1];
    let t1 = ((p.x - ax) * (bx - ax) + (p.y - ay) * (by - ay)) / Math.max(1, (bx - ax) ** 2 + (by - ay) ** 2);
    t1 = Math.max(0, Math.min(1, t1));
    let qx = ax + (bx - ax) * t1, qy = ay + (by - ay) * t1;
    const d1 = (p.x - qx) ** 2 + (p.y - qy) ** 2;
    let t2 = ((p.x - bx) * (cx - bx) + (p.y - by) * (cy - by)) / Math.max(1, (cx - bx) ** 2 + (cy - by) ** 2);
    t2 = Math.max(0, Math.min(1, t2));
    qx = bx + (cx - bx) * t2; qy = by + (cy - by) * t2;
    const d2 = (p.x - qx) ** 2 + (p.y - qy) ** 2;
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by);
    const t = d1 <= d2 ? t1 * (l1 / (l1 + l2)) : l1 / (l1 + l2) + t2 * (l2 / (l1 + l2));
    return smooth(0.36, 0.64, t);
  };

  QHPuppet.prototype._buildWeights = function () {
    const gl = this.gl, cols = this.cols, rows = this.rows, W = 832, H = 1216;
    const SL = [330, 285], EL = [270, 450], WL = [200, 600];
    const SR = [502, 285], ER = [562, 450], WR = [632, 600];
    const mk = (S, E, Wp) => {
      const a = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        a[y * cols + x] = this._armWeight({ x: (x / (cols - 1)) * W, y: (y / (rows - 1)) * H }, S, E, Wp);
      }
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW);
      return b;
    };
    this.wL = mk(SL, EL, WL);
    this.wR = mk(SR, ER, WR);
  };

  QHPuppet.prototype._bindPointer = function () {
    const c = this.canvas;
    const host = c.closest('.doll') || c;
    const set = e => {
      const r = c.getBoundingClientRect();
      this.pointer.x = (e.clientX - r.left) / r.width;
      this.pointer.y = (e.clientY - r.top) / r.height;
      this.pointer.in = true;
    };
    host.addEventListener('pointermove', set, { passive: true });
    host.addEventListener('pointerleave', () => { this.pointer.in = false; });
    host.addEventListener('pointerdown', e => {
      set(e);
      if (!e.target.closest('.hs')) this.impulse(this.pointer.x, this.pointer.y, 1);
    }, { passive: true });
  };

  QHPuppet.prototype.onStare = function (cb) { this.stareCb = cb; };
  QHPuppet.prototype.impulse = function (x, y, p) {
    this.t.impulseV += (p || 1) * 6;
    this.t.impulseCenter = [x, y];
  };
  QHPuppet.prototype.setTalking = function (on) { this.talkOn = !!on; };

  QHPuppet.prototype.setPose = function (name, instant) {
    this.pose = name;
    const d = Math.PI / 180;
    const table = {
      rest: { armL1: 0, armL2: 0, armR1: 0, armR2: 0 },
      cross: { armL1: -12 * d, armL2: -144 * d, armR1: 12 * d, armR2: 144 * d },
      guard: { armL1: -6 * d, armL2: -158 * d, armR1: 9 * d, armR2: 156 * d },
      tuck: { armL1: -6 * d, armL2: -158 * d, armR1: -96 * d, armR2: -134 * d },
      glasses: { armL1: -6 * d, armL2: -158 * d, armR1: -118 * d, armR2: -124 * d },
      mouth: { armL1: -6 * d, armL2: -158 * d, armR1: -120 * d, armR2: -141 * d },
      stomp: { armL1: -12 * d, armL2: -144 * d, armR1: 12 * d, armR2: 144 * d, legLift: 0.22, legBend: 0.26 },
      turn: { armL1: -12 * d, armL2: -144 * d, armR1: 12 * d, armR2: 144 * d }
    };
    const P = table[name] || {};
    Object.keys(P).forEach(k => { this.target[k] = P[k]; });
    if (instant) {
      ['armL1', 'armL2', 'armR1', 'armR2', 'legLift', 'legBend'].forEach(k => {
        this.t[k] = this.target[k];
        this.t[k + 'V'] = 0;
      });
    }
  };

  QHPuppet.prototype.resize = function () {
    if (!this.ok) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
  };

  QHPuppet.prototype._loop = function (now) {
    if (!this.ok) return;
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now; this.time += dt;
    const t = this.time, p = this.t, T = this.target;
    const hx = this.pointer.in ? (this.pointer.x - 0.5) : 0;
    const inFace = this.pointer.in && this.pointer.x > 0.34 && this.pointer.x < 0.66 && this.pointer.y > 0.02 && this.pointer.y < 0.20;
    if (inFace) {
      this.stare += dt;
      if (this.stare > 2.4 && t - this.avoid > 6) {
        this.avoid = t;
        if (this.stareCb) this.stareCb();
      }
    } else this.stare = Math.max(0, this.stare - dt * 2);
    let headTarget = hx * 0.2;
    let yawTarget = hx * 0.03;
    let bodyTarget = hx * 0.05 + Math.sin(t * 0.55) * 0.004;
    if (t < this.avoid + 1.2) {
      headTarget = -hx * 0.28;
      yawTarget = -hx * 0.03;
    }
    [p.headAngle, p.headAngleV] = spring(p.headAngle, headTarget, p.headAngleV, 46, 9, dt);
    [p.headYaw, p.headYawV] = spring(p.headYaw, yawTarget, p.headYawV, 38, 9, dt);
    [p.bodyLean, p.bodyLeanV] = spring(p.bodyLean, bodyTarget, p.bodyLeanV, 28, 8.4, dt);
    [p.spine, p.spineV] = spring(p.spine, hx * 0.012, p.spineV, 24, 7.6, dt);
    [p.hair, p.hairV] = spring(p.hair, -hx * 0.95 + Math.sin(t * 0.9) * 0.16 + Math.sin(t * 0.43 + 1.7) * 0.08, p.hairV, 22, 5.2, dt);
    [p.skirt, p.skirtV] = spring(p.skirt, Math.sin(t * 0.72) * 0.26 + Math.sin(t * 1.31 + 0.6) * 0.08, p.skirtV, 18, 4.6, dt);
    [p.impulse, p.impulseV] = spring(p.impulse, 0, p.impulseV, 85, 11.5, dt);
    ['armL1', 'armL2', 'armR1', 'armR2', 'legLift', 'legBend'].forEach(k => {
      [p[k], p[k + 'V']] = spring(p[k], T[k] || 0, p[k + 'V'], 38, 8.6, dt);
    });
    this.talk += ((this.talkOn ? 1 : 0) - this.talk) * Math.min(1, dt * 8);
    const breath = Math.sin(t * 1.35) * 0.5 + 0.5;
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuf);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.u.uHeadPivot, 0.5, 0.205);
    gl.uniform2f(this.u.uHipPivot, 0.5, 0.43);
    gl.uniform2f(this.u.uSpinePivot, 0.5, 0.33);
    gl.uniform2f(this.u.uImpulseCenter, p.impulseCenter[0], p.impulseCenter[1]);
    gl.uniform1f(this.u.uHeadAngle, p.headAngle);
    gl.uniform1f(this.u.uHeadYaw, p.headYaw);
    gl.uniform1f(this.u.uBodyLean, p.bodyLean);
    gl.uniform1f(this.u.uSpineBend, p.spine);
    gl.uniform1f(this.u.uBreath, breath);
    gl.uniform1f(this.u.uHair, p.hair);
    gl.uniform1f(this.u.uSkirt, p.skirt);
    gl.uniform1f(this.u.uTime, t);
    gl.uniform1f(this.u.uImpulse, p.impulse);
    gl.uniform1f(this.u.uLegLift, p.legLift);
    gl.uniform1f(this.u.uLegBend, p.legBend);
    const draw = (tex, kind, wbuf) => {
      gl.uniform1i(this.u.uKind, kind);
      gl.uniform1i(this.u.uTex, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.bindBuffer(gl.ARRAY_BUFFER, wbuf);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
      if (kind === 2) {
        gl.uniform2f(this.u.uShoulderPivot, 330 / 832, 285 / 1216);
        gl.uniform2f(this.u.uElbowPivot, 270 / 832, 450 / 1216);
        gl.uniform1f(this.u.uShoulderAngle, p.armL1);
        gl.uniform1f(this.u.uElbowAngle, p.armL2);
      } else if (kind === 3) {
        gl.uniform2f(this.u.uShoulderPivot, 502 / 832, 285 / 1216);
        gl.uniform2f(this.u.uElbowPivot, 562 / 832, 450 / 1216);
        gl.uniform1f(this.u.uShoulderAngle, p.armR1);
        gl.uniform1f(this.u.uElbowAngle, p.armR2);
      } else {
        gl.uniform2f(this.u.uShoulderPivot, 0.5, 0.3);
        gl.uniform2f(this.u.uElbowPivot, 0.5, 0.4);
        gl.uniform1f(this.u.uShoulderAngle, 0);
        gl.uniform1f(this.u.uElbowAngle, 0);
      }
      gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };
    if (this.tex.body) draw(this.tex.body, 0, this.wbufZero);
    if (this.tex.head) draw(this.tex.head, 1, this.wbufZero);
    if (this.tex.armL) draw(this.tex.armL, 2, this.wL);
    if (this.tex.armR) draw(this.tex.armR, 3, this.wR);
    this.raf = requestAnimationFrame(this._loop.bind(this));
  };

  window.QHPuppet = QHPuppet;
})();
