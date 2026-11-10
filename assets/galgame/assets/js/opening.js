/* =========================================================
   ACT V · 身份选择 / 少年行囊 / 开局指令
   ========================================================= */
(function () {
  'use strict';
  const APP = window.QH_APP;
  const D = window.QH;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let built = false;
  let copied = false;
  let sealing = false;

  const els = {};
  function cache() {
    els.gallery = $('#idGallery');
    els.name = $('#vName');
    els.look = $('#vLook');
    els.trait = $('#vTrait');
    els.extra = $('#vExtra');
    els.sFav = $('#sFav');
    els.sMoney = $('#sMoney');
    els.sEnergy = $('#sEnergy');
    els.sCrush = $('#sCrush');
    els.perks = $('#sPerks');
    els.note = $('#sNote');
    els.output = $('#eOutput');
    els.outputText = $('#eOutputText');
    els.copyState = $('#copyState');
  }

  function currentId() {
    return D.identities.find(i => i.id === APP.state.id) || D.identities[3];
  }

  function buildGallery() {
    els.gallery.innerHTML = '';
    D.identities.forEach((it, idx) => {
      const b = document.createElement('button');
      b.className = 'idcard' + (it.id === APP.state.id ? ' is-on' : '');
      b.dataset.id = it.id;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(it.id === APP.state.id));
      b.setAttribute('aria-label', it.name + ' · ' + it.sub);
      b.innerHTML = `
        <div class="idcard__inner">
          <img class="idcard__img" src="${it.img}" alt="${it.name}">
          <div class="idcard__veil"></div>
          <div class="idcard__glare"></div>
          <div class="idcard__body">
            <span class="idcard__no">IDENTITY · ${it.id}</span>
            <b class="idcard__name">${it.name}</b>
            <span class="idcard__sub">${it.sub}</span>
            <div class="idcard__stats">
              <span>¥${it.money}</span><span>精力 ${it.energy}</span><span>好感 ${it.fav}</span>
            </div>
          </div>
          <span class="idcard__tick" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 8.4l3.2 3.2L13 4.6"/></svg></span>
        </div>`;
      b.addEventListener('click', () => select(it.id));
      b.addEventListener('pointermove', (e) => tilt(b, e));
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
      els.gallery.appendChild(b);
    });
  }

  function tilt(card, e) {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - .5;
    const py = (e.clientY - r.top) / r.height - .5;
    const rx = clamp(-py * 14, -9, 9);
    const ry = clamp(px * 18, -12, 12);
    card.style.transform = `translateY(-4px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.02)`;
  }

  function select(id) {
    APP.state.id = id;
    $$('.idcard').forEach(c => {
      const on = c.dataset.id === id;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-checked', String(on));
      c.style.transform = '';
    });
    updateSummary();
    const it = currentId();
    $('#sNote').textContent = it.note;
    ensureText();
  }

  function updateSummary() {
    const it = currentId();
    els.sFav.textContent = it.fav;
    els.sMoney.textContent = '¥ ' + it.money;
    els.sEnergy.textContent = it.energy;
    els.sCrush.textContent = it.crush;
    els.perks.innerHTML = it.perks.map(p => `<span>${p}</span>`).join('');
  }

  function getSex() {
    const customEl = $('#vSexCustom');
    const custom = (customEl && customEl.value || '').trim();
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
    lines.push(`【开局】我是${name}，周清禾的同桌${sexStr}。身份：${it.id} ${it.name}（钱包¥${it.money}，精力上限${it.energy}；${it.perks.join('；')}）。`);
    if (detail.length) lines.push('补充设定：' + detail.join('｜'));
    lines.push('请从下面这段开场的最后一刻接着写，不要重复开场原文，不要替我说话或行动。');
    lines.push('——开场——');
    lines.push(D.opening.join('\n'));
    lines.push('——————');
    const secret = it.id === 'D' ? '已知道粮油铺' : '无';
    lines.push(`开局状态：2月27日周五 · 下午百日誓师后 · 7班教室 · 距高考100天（距一模17天）；好感${it.fav}/100；心动10；学力140 · 模考约68 · Lv.1 几何迷路人；翻唱号「冷感绝缘体.」127粉 · Tier1 野生冷感黑历史 · 设备Lv.1；小铁盒¥43.5；钱包¥${it.money}；精力${it.energy}/${it.energy} · 精神饱满；已暴露的秘密：${secret}。`);
    return lines.join('\n');
  }

  function ensureText() {
    if (!els.outputText) return;
    els.outputText.textContent = buildText();
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fallthrough */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  function showResult(text) {
    APP.openModal('缔结完成', '百日同桌契约 · 开局指令', `
      <div class="seal-out">
        <p class="seal-out__lead">把下面这段整段复制，粘贴到聊天框发送。她会从她把笔推过三八线的那一刻，接着往下写。</p>
        <pre id="sealText"></pre>
        <div class="seal-out__bar">
          <span class="seal-out__state" id="sealState"></span>
          <button class="btn btn--tiny" id="sealCopy">复制指令</button>
          <button class="btn btn--gold" data-close>进教室</button>
        </div>
      </div>`);
    $('#sealText').textContent = text;
    const doCopy = async () => {
      const ok = await copyText(text);
      $('#sealState').textContent = ok ? '已复制到剪贴板' : '复制失败，请手动全选';
      $('#sealState').classList.toggle('is-bad', !ok);
      return ok;
    };
    $('#sealCopy').addEventListener('click', doCopy);
    return doCopy;
  }

  function randomFill() {
    const p = D.presets;
    els.name.value = p.names[Math.floor(Math.random() * p.names.length)];
    els.look.value = p.looks[Math.floor(Math.random() * p.looks.length)];
    els.trait.value = p.traits[Math.floor(Math.random() * p.traits.length)];
    els.extra.value = p.extras[Math.floor(Math.random() * p.extras.length)];
    ensureText();
    APP.toast('行囊已随机装好。不喜欢可以改。');
  }

  function init() {
    cache();
    if (!built) {
      built = true;
      buildGallery();
      $$('#vSex button').forEach(b => b.addEventListener('click', () => {
        $$('#vSex button').forEach(x => x.classList.toggle('is-on', x === b));
        const custom = $('#vSexCustom');
        if (custom) custom.value = '';
        ensureText();
      }));
      const sexCustom = $('#vSexCustom');
      if (sexCustom) sexCustom.addEventListener('input', () => {
        if (sexCustom.value.trim()) $$('#vSex button').forEach(x => x.classList.remove('is-on'));
        ensureText();
      });
      [els.name, els.look, els.trait, els.extra].forEach(inp => {
        if (!inp) return;
        inp.addEventListener('input', ensureText);
      });
      $('#btnRandom').addEventListener('click', randomFill);
      $('#btnCopy').addEventListener('click', async () => {
        const text = buildText();
        els.outputText.textContent = text;
        const copy = showResult(text);
        const ok = await copy();
        APP.toast(ok ? '开局指令已复制。去开一局吧。' : '复制失败，请手动全选。', 2600);
        els.copyState.textContent = ok ? '已复制' : '请手动复制';
      });
      $('#btnShowOpening').addEventListener('click', () => {
        APP.openModal('原卡开场白', '2月27日 · 下午第二节课后', `
          <div class="opening-read">
            ${D.opening.map(p => `<p>${p}</p>`).join('')}
          </div>`, 'modal--opening');
      });
      const stampPad = $('#vStampPad');
      if (stampPad) {
        stampPad.addEventListener('click', () => {
          stampPad.classList.add('is-stamped');
          APP.state.stamped = true;
          APP.toast('红手印已按在百日冲刺目标卡上。');
        });
      }
      $('#btnSeal').addEventListener('click', seal);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && APP.state.act === 5 && !$('#modal').classList.contains('is-open')) {
          if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
        }
      });
    }
    updateSummary();
    $('#sNote').textContent = currentId().note;
    ensureText();
  }

  async function seal() {
    if (sealing) return;
    sealing = true;
    const stampPad = $('#vStampPad');
    if (stampPad && !stampPad.classList.contains('is-stamped')) {
      stampPad.classList.add('is-stamped');
      APP.state.stamped = true;
    }
    const btn = $('#btnSeal');
    btn.disabled = true;
    const text = buildText();
    els.outputText.textContent = text;
    await APP.transition({ num: '100', label: '高三(7)班 · 距高考一百天', flash: true, word: true, duration: 2700 });
    const copy = showResult(text);
    const ok = await copy();
    els.copyState.textContent = ok ? '已复制到剪贴板' : '请手动复制';
    copied = true;
    setTimeout(() => {
      APP.toast(ok ? '契约已缔结 · 开局指令已复制，去聊天框粘贴吧。' : '契约已缔结 · 请手动复制指令。', 4200);
    }, 300);
    btn.disabled = false;
    sealing = false;
  }

  window.QH_OPENING = { init, buildText, select };
})();
