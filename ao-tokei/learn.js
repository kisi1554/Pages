// とけいを まなぼう — アナログ とけいの よみかたを あそびながら おぼえる
(() => {
  'use strict';
  const KEY = 'ao-tokei-learn-v1';
  const host = window.AoTokei || { sfx: {}, tone() {}, isSound: () => false };
  const sfx = (name) => { try { host.sfx[name] && host.sfx[name](); } catch (e) { /* ignore */ } };
  const stage = document.getElementById('lrStage');
  const NS = 'http://www.w3.org/2000/svg';

  // ---------- ほぞん ----------
  const DEFAULT_DAY = [
    { e: '🌅', name: 'おきる', t: 7 * 60 },
    { e: '🍙', name: 'あさごはん', t: 7 * 60 + 30 },
    { e: '🎒', name: 'ようちえん', t: 8 * 60 + 30 },
    { e: '🍱', name: 'おひるごはん', t: 12 * 60 },
    { e: '🍪', name: 'おやつ', t: 15 * 60 },
    { e: '🍛', name: 'ばんごはん', t: 18 * 60 + 30 },
    { e: '🛁', name: 'おふろ', t: 19 * 60 + 30 },
    { e: '🌙', name: 'ねる', t: 20 * 60 + 30 }
  ];
  const data = { stickers: [], best: {}, day: DEFAULT_DAY.map((d) => ({ ...d })), minNums: true };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) {
      if (Array.isArray(s.stickers)) data.stickers = s.stickers;
      if (s.best && typeof s.best === 'object') data.best = s.best;
      if (Array.isArray(s.day) && s.day.length === DEFAULT_DAY.length) data.day = s.day;
      if (typeof s.minNums === 'boolean') data.minNums = s.minNums;
    }
  } catch (e) { /* つかえない ときは そのまま */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } }

  // ---------- じかんの ことば ----------
  const mod = (a, n) => ((a % n) + n) % n;
  const H12 = (t) => (Math.floor(mod(t, 1440) / 60) % 12) || 12;
  const MIN = (t) => Math.floor(mod(t, 60));
  // 1・3・4・6・8・10 は「ぷん」、2・5・7・9 は「ふん」
  const fun = (m) => ([0, 1, 3, 4, 6, 8].includes(m % 10) ? 'ぷん' : 'ふん');
  function timeText(t) {
    const h = H12(t), m = MIN(t);
    if (m === 0) return `${h}じ`;
    if (m === 30) return `${h}じはん`;
    return `${h}じ${m}${fun(m)}`;
  }
  function speakText(t) {
    const h = H12(t), m = MIN(t);
    if (m === 0) return `${h}時`;
    if (m === 30) return `${h}時半`;
    return `${h}時${m}分`;
  }
  function period(t) {
    const h = Math.floor(mod(t, 1440) / 60);
    if (h >= 5 && h < 10) return { e: '🌅', w: 'あさ' };
    if (h >= 10 && h < 16) return { e: '☀️', w: 'ひる' };
    if (h >= 16 && h < 19) return { e: '🌇', w: 'ゆうがた' };
    return { e: '🌙', w: 'よる' };
  }
  const digital = (t) => `${Math.floor(mod(t, 1440) / 60)}:${String(MIN(t)).padStart(2, '0')}`;
  function spanText(min) {
    const h = Math.floor(min / 60), m = min % 60;
    if (h && m) return `${h}じかん ${m}${fun(m)}`;
    if (h) return `${h}じかん`;
    return `${m}${fun(m)}`;
  }
  window.AoClock = { timeText };

  function speak(text) {
    if (!host.isSound() || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; u.rate = 0.9; u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  const good = () => { host.tone(784, 0, 0.12, 'triangle', 0.25); host.tone(1046, 0.1, 0.12, 'triangle', 0.25); host.tone(1318, 0.2, 0.25, 'triangle', 0.25); };
  const boo = () => { host.tone(330, 0, 0.18, 'sawtooth', 0.12); host.tone(262, 0.15, 0.25, 'sawtooth', 0.12); };

  // ---------- アナログ とけい（SVG） ----------
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const polar = (deg, r) => [Math.sin(deg * Math.PI / 180) * r, -Math.cos(deg * Math.PI / 180) * r];

  function makeClock(box, opt = {}) {
    const svg = el('svg', { viewBox: '-122 -122 244 244', role: 'img', 'aria-label': 'とけい' }, box);
    el('circle', { r: 104, class: 'ck-rim' }, svg);
    el('circle', { r: 100, class: 'ck-face' }, svg);
    const sector = el('path', { class: 'ck-sector', d: '' }, svg);
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      const [x1, y1] = polar(i * 6, 96), [x2, y2] = polar(i * 6, big ? 86 : 91);
      el('line', { x1, y1, x2, y2, class: 'ck-tick' + (big ? ' big' : '') }, svg);
    }
    for (let h = 1; h <= 12; h++) {
      const [x, y] = polar(h * 30, 72);
      el('text', { x, y, class: 'ck-num' }, svg).textContent = h;
    }
    // そとがわの「ふん」の すうじ
    const minG = el('g', {}, svg);
    for (let i = 0; i < 12; i++) {
      const [x, y] = polar(i * 30, 115);
      el('circle', { cx: x, cy: y, r: 8.5, class: 'ck-min-bg' }, minG);
      el('text', { x, y, class: 'ck-min' }, minG).textContent = i * 5;
    }
    const hourG = el('g', {}, svg);
    el('line', { x1: 0, y1: 10, x2: 0, y2: -50, class: 'ck-hour' }, hourG);
    el('circle', { cx: 0, cy: -38, r: 18, class: 'ck-hand-grip' }, hourG);
    const minG2 = el('g', {}, svg);
    el('line', { x1: 0, y1: 12, x2: 0, y2: -82, class: 'ck-minute' }, minG2);
    el('circle', { cx: 0, cy: -70, r: 16, class: 'ck-hand-grip' }, minG2);
    const secG = el('g', { style: 'display:none' }, svg);
    el('line', { x1: 0, y1: 16, x2: 0, y2: -88, class: 'ck-second' }, secG);
    el('circle', { r: 6, class: 'ck-pin' }, svg);
    const badge = document.createElement('span');
    badge.className = 'ck-period';
    box.appendChild(badge);

    const c = {
      t: opt.t ?? 0, sec: null, svg,
      set(t, sec = null) {
        c.t = mod(t, 1440); c.sec = sec;
        hourG.setAttribute('transform', `rotate(${(c.t / 60 % 12) * 30})`);
        minG2.setAttribute('transform', `rotate(${(c.t % 60) * 6})`);
        secG.style.display = sec == null ? 'none' : '';
        if (sec != null) secG.setAttribute('transform', `rotate(${sec * 6})`);
        badge.textContent = opt.period === false ? '' : period(c.t).e;
      },
      minNums(on) { minG.style.display = on ? '' : 'none'; },
      glow(which) {
        svg.classList.toggle('ck-glow', which === 'h');
        svg.classList.toggle('ck-glow-m', which === 'm');
      },
      // みじかい はりが いる「すうじと すうじの あいだ」を いろで しめす
      showSector(on) {
        if (!on) { sector.setAttribute('d', ''); return; }
        const h = Math.floor(c.t / 60) % 12;
        const a = h * 30, b = a + 30;
        const [x1, y1] = polar(a, 100), [x2, y2] = polar(b, 100);
        sector.setAttribute('d', `M0 0 L${x1} ${y1} A100 100 0 0 1 ${x2} ${y2} Z`);
      },
      animateTo(target, ms = 900, done) {
        const from = c.t;
        let to = target;
        while (to < from) to += 1440;
        if (to - from > 720 && ms > 0) to -= 1440;
        if (to < from) to = target < from ? target + 1440 : target;
        const t0 = performance.now();
        cancelAnimationFrame(c._raf);
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          const e = 1 - Math.pow(1 - k, 3);
          c.set(from + (to - from) * e);
          if (k < 1) c._raf = requestAnimationFrame(step);
          else { c.set(target); done && done(); }
        };
        c._raf = requestAnimationFrame(step);
      }
    };
    c.minNums(opt.minNums ?? data.minNums);
    c.set(c.t);

    if (opt.drag) {
      box.classList.add('drag');
      let mode = null, raw = 0, lastMin = 0;
      const step = () => opt.step ? opt.step() : 1;
      const angleOf = (ev) => {
        const r = svg.getBoundingClientRect();
        const x = ev.clientX - (r.left + r.width / 2), y = ev.clientY - (r.top + r.height / 2);
        return { a: mod(Math.atan2(x, -y) * 180 / Math.PI, 360), d: Math.hypot(x, y) / (r.width / 2) * 122 };
      };
      const diff = (a, b) => { const d = mod(a - b, 360); return d > 180 ? 360 - d : d; };
      svg.addEventListener('pointerdown', (ev) => {
        const { a, d } = angleOf(ev);
        const ma = (c.t % 60) * 6, ha = (c.t / 60 % 12) * 30;
        const dm = diff(a, ma), dh = diff(a, ha);
        if (dm < 25 && dh < 25) mode = d < 62 ? 'h' : 'm';
        else mode = dm <= dh ? 'm' : 'h';
        raw = c.t; lastMin = a / 6;
        c.glow(mode);
        svg.setPointerCapture(ev.pointerId);
        ev.preventDefault();
        move(ev);
      });
      const move = (ev) => {
        if (!mode) return;
        const { a } = angleOf(ev);
        const before = c.t;
        if (mode === 'm') {
          // ながい はりを まわすと みじかい はりも いっしょに すすむ
          let dmn = a / 6 - lastMin;
          if (dmn > 30) dmn -= 60;
          if (dmn < -30) dmn += 60;
          lastMin = a / 6;
          raw += dmn;
          const s = step();
          c.set(Math.round(raw / s) * s);
        } else {
          // みじかい はりは「なんじ」だけを かえる
          const m = c.t % 60;
          let h = Math.round(a / 30 - m / 60);
          h = mod(h, 12);
          const base = h * 60 + m;
          const cands = [base, base + 720];
          const pick = cands.reduce((p, q) => (Math.abs(mod(q - c.t + 720, 1440) - 720) < Math.abs(mod(p - c.t + 720, 1440) - 720) ? q : p));
          c.set(pick);
          raw = c.t;
        }
        if (c.t !== before) { host.tone(mode === 'm' ? 1400 : 900, 0, 0.03, 'square', 0.04); opt.onChange && opt.onChange(c.t); }
      };
      svg.addEventListener('pointermove', move);
      const up = () => { if (!mode) return; mode = null; raw = c.t; c.glow(null); opt.onEnd && opt.onEnd(c.t); };
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
    }
    return c;
  }

  // ---------- がめん きりかえ ----------
  let cleanup = null;
  let current = 'menu';
  function open(view) {
    if (cleanup) { cleanup(); cleanup = null; }
    try { speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    current = view;
    stage.innerHTML = '';
    stage.classList.toggle('menu-mode', view === 'menu');
    VIEWS[view]();
  }
  function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content;
  }
  function top(title) {
    const f = h(`<div class="lr-top"><button class="lr-back">← もどる</button><h2>${title}</h2><span class="spacer"></span></div>`);
    f.querySelector('.lr-back').addEventListener('click', () => { sfx('tap'); open('menu'); });
    stage.appendChild(f);
  }
  const q = (s) => stage.querySelector(s);

  const MENU = [
    { v: 'now', e: '🕰️', name: 'いま なんじ？', d: 'ほんとうの とけい', c: '#e6f0ff', cd: '#cfe0ff' },
    { v: 'play', e: '✋', name: 'はりを うごかそう', d: 'ゆびで くるくる', c: '#fff3c4', cd: '#ffe08a' },
    { v: 'read', e: '❓', name: 'とけい クイズ', d: 'なんじかな？', c: '#e3f6ee', cd: '#b9e8d2' },
    { v: 'set', e: '🎯', name: 'はりを あわせよう', d: 'いわれた じかんに', c: '#fde3ea', cd: '#f7bccb' },
    { v: 'day', e: '🌞', name: 'あおちゃんの いちにち', d: 'なんじに なにする？', c: '#ffe6df', cd: '#ffc4b5' },
    { v: 'tips', e: '💡', name: 'とけいの ひみつ', d: 'はりの きまり', c: '#eeecfb', cd: '#d3cdf5' },
    { v: 'book', e: '📒', name: 'シールちょう', d: '', c: '#fff', cd: '#cfe0ff' }
  ];

  const VIEWS = {
    // ---------- メニュー ----------
    menu() {
      stage.appendChild(h(`<h2 class="lr-title">🕰️ とけいを まなぼう</h2>
        <p class="lr-lead">クイズに こたえると シールが もらえるよ</p><div class="lr-menu"></div>`));
      const grid = q('.lr-menu');
      MENU.forEach((m) => {
        const b = h(`<button class="lr-card" style="--c:${m.c};--cd:${m.cd}"><span class="e">${m.e}</span><b>${m.name}</b><small>${m.v === 'book' ? `${data.stickers.length} / ${STICKERS.length} まい` : m.d}</small></button>`).firstChild;
        b.addEventListener('click', () => { sfx('tap'); open(m.v); });
        grid.appendChild(b);
      });
    },

    // ---------- いま なんじ？ ----------
    now() {
      top('🕰️ いま なんじ？');
      stage.appendChild(h(`<div class="lr-body"><div class="clock-box"></div><div class="lr-side">
        <div class="time-big" id="nowTxt"></div>
        <div class="digital" id="nowDig"></div>
        <div class="next-box" id="nowNext"></div>
        <div class="pill-row"><button class="pill" id="nowSay">🗣️ よんで</button><button class="pill" id="nowNums"></button></div>
        <div class="legend"><span class="h">🔴 みじかい はり ＝ なんじ</span><span class="m">🔵 ながい はり ＝ なんぷん</span></div>
      </div></div>`));
      const ck = makeClock(q('.clock-box'));
      numsToggle(q('#nowNums'), ck);
      let last = -1;
      const tick = () => {
        const d = new Date();
        const t = d.getHours() * 60 + d.getMinutes();
        ck.set(t + d.getSeconds() / 60, d.getSeconds());
        if (t !== last) {
          last = t;
          const p = period(t);
          q('#nowTxt').textContent = `${p.w}の ${timeText(t)}`;
          q('#nowDig').textContent = digital(t);
          const nx = nextEvent(t);
          q('#nowNext').textContent = `つぎは ${nx.e}${nx.name}（${timeText(nx.t)}）まで あと ${spanText(nx.left)}`;
        }
      };
      tick();
      const id = setInterval(tick, 250);
      q('#nowSay').addEventListener('click', () => {
        const d = new Date();
        const t = d.getHours() * 60 + d.getMinutes();
        speak(`いまは、${period(t).w}の ${speakText(t)}です`);
      });
      cleanup = () => clearInterval(id);
    },

    // ---------- はりを うごかそう ----------
    play() {
      top('✋ はりを うごかそう');
      stage.appendChild(h(`<div class="lr-body"><div class="clock-box"></div><div class="lr-side">
        <div class="time-big" id="plTxt"></div>
        <div class="time-sub" id="plDig"></div>
        <div class="pill-row">
          <button class="pill" data-d="-60">−1じかん</button><button class="pill" data-d="-5">−5ふん</button>
          <button class="pill" data-d="5">＋5ふん</button><button class="pill" data-d="60">＋1じかん</button>
        </div>
        <div class="pill-row">
          <button class="pill" id="plRun">⏩ 1じかん すすめる</button>
          <button class="pill" id="plSay">🗣️ よんで</button>
          <button class="pill" id="plNums"></button>
        </div>
        <div class="legend"><span class="h">🔴 みじかい はり ＝ なんじ</span><span class="m">🔵 ながい はり ＝ なんぷん</span></div>
      </div></div>`));
      const show = (t) => {
        const p = period(t);
        q('#plTxt').textContent = `${p.e} ${p.w}の ${timeText(t)}`;
        q('#plDig').textContent = `デジタル とけいだと ${digital(t)}`;
      };
      const ck = makeClock(q('.clock-box'), { t: 15 * 60, drag: true, onChange: show, onEnd: (t) => speak(speakText(t)) });
      show(ck.t);
      numsToggle(q('#plNums'), ck);
      stage.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
        sfx('tap');
        const d = Number(b.dataset.d);
        const s = Math.abs(d) === 5 ? 5 : 1;
        ck.set(Math.round((ck.t + d) / s) * s); show(ck.t);
      }));
      // ながい はりが 1しゅう すると みじかい はりが すうじ 1つぶん すすむ
      q('#plRun').addEventListener('click', () => {
        const b = q('#plRun');
        b.disabled = true;
        const from = ck.t;
        ck.glow('m');
        const t0 = performance.now(), ms = 3000;
        const stepA = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          ck.set(from + 60 * k); show(Math.floor(ck.t));
          if (k < 1) ck._raf = requestAnimationFrame(stepA);
          else {
            ck.set(from + 60); show(ck.t); ck.glow(null); b.disabled = false;
            sfx('minute');
            q('#plDig').textContent = 'ながい はりが 1しゅう ＝ 1じかん！';
          }
        };
        ck._raf = requestAnimationFrame(stepA);
      });
      q('#plSay').addEventListener('click', () => speak(`${period(ck.t).w}の ${speakText(ck.t)}`));
      cleanup = () => cancelAnimationFrame(ck._raf);
    },

    // ---------- とけい クイズ（よむ） ----------
    read() { levelPick('❓ とけい クイズ', 'read', (lv) => quiz('read', lv)); },
    // ---------- はりを あわせよう ----------
    set() { levelPick('🎯 はりを あわせよう', 'set', (lv) => quiz('set', lv)); },

    // ---------- あおちゃんの いちにち ----------
    day() {
      top('🌞 あおちゃんの いちにち');
      stage.appendChild(h(`<div class="lr-body"><div class="clock-box"></div><div class="lr-side">
        <div class="time-big" id="dyTxt"></div>
        <div class="pill-row">
          <button class="pill" data-d="-5">−5ふん</button><button class="pill" data-d="5">＋5ふん</button>
          <button class="pill" id="dySay">🗣️ よんで</button><button class="pill" id="dyReset">↺ もとに もどす</button>
        </div>
        <div class="sched"></div>
      </div></div>`));
      const ck = makeClock(q('.clock-box'));
      let sel = 0;
      const list = q('.sched');
      const render = () => {
        list.innerHTML = '';
        data.day.forEach((ev, i) => {
          const b = h(`<button class="${i === sel ? 'on' : ''}"><span class="e">${ev.e}</span><span><b>${ev.name}</b><small>${timeText(ev.t)}</small></span></button>`).firstChild;
          b.addEventListener('click', () => { sfx('tap'); sel = i; render(); pick(true); });
          list.appendChild(b);
        });
      };
      const pick = (anim) => {
        const ev = data.day[sel];
        q('#dyTxt').textContent = `${ev.e} ${ev.name}は ${period(ev.t).w}の ${timeText(ev.t)}`;
        if (anim) ck.animateTo(ev.t, 900, () => speak(`${ev.name}は、${speakText(ev.t)}`));
        else ck.set(ev.t);
      };
      stage.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
        sfx('tap');
        const ev = data.day[sel];
        ev.t = mod(Math.round((ev.t + Number(b.dataset.d)) / 5) * 5, 1440);
        save(); render(); pick(false);
      }));
      q('#dySay').addEventListener('click', () => { const ev = data.day[sel]; speak(`${ev.name}は、${speakText(ev.t)}`); });
      q('#dyReset').addEventListener('click', () => {
        sfx('tap');
        data.day = DEFAULT_DAY.map((d) => ({ ...d }));
        save(); render(); pick(true);
      });
      render(); pick(false);
      cleanup = () => cancelAnimationFrame(ck._raf);
    },

    // ---------- とけいの ひみつ ----------
    tips() {
      top('💡 とけいの ひみつ');
      stage.appendChild(h(`<div class="lr-body"><div class="clock-box"></div><div class="tips">
        <div class="tip"><span class="e">🔴</span><span><span class="hh">みじかい はり</span>は「なんじ」を おしえるよ</span></div>
        <div class="tip"><span class="e">🔵</span><span><span class="mm">ながい はり</span>は「なんぷん」を おしえるよ</span></div>
        <div class="tip"><span class="e">🔢</span><span>ながい はりが <b>1</b>を さしたら 5ふん、<b>2</b>なら 10ぷん。すうじ 1つで <b>5ふん</b> ずつ ふえるよ</span></div>
        <div class="tip"><span class="e">🔄</span><span>ながい はりが ぐるっと 1しゅう すると <b>1じかん</b>。みじかい はりが すうじ 1つぶん すすむよ</span></div>
        <div class="tip"><span class="e">🌗</span><span>ながい はりが <b>6</b>に きたら「はん」。3じ30ぷん ＝ 3じはん</span></div>
        <div class="tip"><span class="e">🌍</span><span>みじかい はりは 1にちで 2しゅう。あさに 1しゅう、よるに 1しゅう するよ</span></div>
      </div></div>`));
      const ck = makeClock(q('.clock-box'));
      // ながい はりが ぐるぐる まわる おてほん
      let t = 9 * 60;
      ck.set(t);
      const id = setInterval(() => { t += 1; ck.set(t); }, 60);
      cleanup = () => clearInterval(id);
    },

    // ---------- シールちょう ----------
    book() {
      top('📒 シールちょう');
      stage.appendChild(h(`<p class="lr-lead">${data.stickers.length} / ${STICKERS.length} まい あつめたよ</p><div class="sticker-grid"></div>`));
      const g = q('.sticker-grid');
      STICKERS.forEach((s, i) => {
        const got = data.stickers.includes(s);
        g.appendChild(h(`<span class="${got ? 'got' : 'empty'}">${got ? s : i + 1}</span>`));
      });
    }
  };

  function numsToggle(btn, ck) {
    const r = () => { btn.textContent = data.minNums ? '🔢 ふんの すうじ：あり' : '🔢 ふんの すうじ：なし'; btn.classList.toggle('on', data.minNums); };
    r();
    btn.addEventListener('click', () => { sfx('tap'); data.minNums = !data.minNums; ck.minNums(data.minNums); save(); r(); });
  }

  function nextEvent(t) {
    const list = data.day.map((d) => ({ ...d, left: mod(d.t - t, 1440) || 1440 }));
    return list.sort((a, b) => a.left - b.left)[0];
  }

  // ---------- クイズ ----------
  const LEVELS = [
    { name: 'ちょうど', ex: '3じ', star: '⭐', make: () => rnd(12) * 60, step: 60 },
    { name: 'はん', ex: '3じはん', star: '⭐⭐', make: () => rnd(12) * 60 + rnd(2) * 30, step: 30 },
    { name: '5ふん', ex: '3じ15ふん', star: '⭐⭐⭐', make: () => rnd(12) * 60 + rnd(12) * 5, step: 5 },
    { name: '1ぷん', ex: '3じ17ふん', star: '⭐⭐⭐⭐', make: () => rnd(12) * 60 + rnd(60), step: 1 }
  ];
  const ROUND = 5;
  const STICKERS = ['🐳', '🐬', '🐠', '🐙', '🦀', '🐢', '🦕', '🦖', '🐘', '🦒', '🦁', '🐼', '🐨', '🐰', '🐻',
    '🦊', '🐶', '🐱', '🐧', '🦉', '🚃', '🚄', '🚀', '✈️', '🚒', '🍓', '🍰', '🍦', '🌈', '👑'];
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function levelPick(title, kind, go) {
    top(title);
    stage.appendChild(h(`<p class="lr-lead">${kind === 'read' ? 'とけいを みて、なんじか こたえてね' : 'はりを ゆびで うごかして、おなじ じかんに してね'}</p><div class="levels"></div>`));
    const box = q('.levels');
    LEVELS.forEach((lv, i) => {
      const best = data.best[`${kind}${i}`];
      const b = h(`<button class="level"><span class="st">${lv.star}</span>${lv.name}<small>れい：${lv.ex}</small><small>${best != null ? `さいこう ${best} / ${ROUND}` : 'まだ やってないよ'}</small></button>`).firstChild;
      b.addEventListener('click', () => { sfx('tap'); go(i); });
      box.appendChild(b);
    });
  }

  function distractors(t, lv) {
    const h12 = Math.floor(t / 60) % 12, m = t % 60;
    const out = new Set();
    const add = (x) => { x = mod(x, 720); if (x !== t && x % LEVELS[lv].step === 0) out.add(x); };
    // よくある まちがい: みじかい はりの ひとつ まえ／あと の すうじを よむ
    add(t + (m >= 30 ? 60 : -60));
    // ながい はりの すうじを そのまま「ふん」に してしまう
    if (m % 5 === 0 && m !== 0 && lv >= 2) add(h12 * 60 + m / 5);
    // ながい はりと みじかい はりを とりちがえる
    if (lv >= 2 || m === 0) { const nh = Math.round(m / 5) % 12; add(nh * 60 + (h12 % 12) * 5); }
    if (lv === 1) add(t + (m === 30 ? -30 : 30));
    let guard = 0;
    while (out.size < 2 && guard++ < 50) add(LEVELS[lv].make());
    return [...out].slice(0, 2);
  }

  function quiz(kind, lv) {
    const L = LEVELS[lv];
    const results = [];
    let qi = 0;
    const title = kind === 'read' ? '❓ とけい クイズ' : '🎯 はりを あわせよう';
    const used = new Set();
    const nextQ = () => {
      let t, g = 0;
      do { t = L.make(); } while ((used.has(t) || (kind === 'set' && t === 0)) && g++ < 30);
      used.add(t);
      return t;
    };

    const render = () => {
      if (qi >= ROUND) return finish();
      stage.innerHTML = '';
      top(title);
      const t = nextQ();
      let missed = false;
      stage.appendChild(h(`<div class="dots">${Array.from({ length: ROUND }, (_, i) => `<i class="${i < results.length ? (results[i] ? 'ok' : 'ng') : ''}${i === qi ? ' now' : ''}">${i < results.length ? (results[i] ? '◯' : '') : ''}</i>`).join('')}</div>
        <div class="lr-body"><div class="clock-box"></div><div class="lr-side">
          ${kind === 'set' ? `<div class="target">「${timeText(t)}」に してね</div>` : '<div class="time-big">なんじ かな？</div>'}
          ${kind === 'read' ? '<div class="choices"></div>' : '<div class="pill-row"><button class="btn go" id="qDone">👍 できた！</button></div>'}
          <div class="feedback" id="qFb"></div>
          <div class="hint-box" id="qHint"></div>
          <div class="pill-row"><button class="pill hint" id="qHintBtn">💡 ヒント</button><button class="pill" id="qNums"></button></div>
        </div></div>`));
      const ck = makeClock(q('.clock-box'), {
        period: false,
        drag: kind === 'set',
        step: () => Math.min(L.step, 5),
        onEnd: () => { q('#qFb').textContent = ''; q('#qFb').className = 'feedback'; }
      });
      numsToggle(q('#qNums'), ck);
      if (kind === 'read') {
        ck.set(t);
        const opts = shuffle([t, ...distractors(t, lv)]);
        const box = q('.choices');
        opts.forEach((o) => {
          const b = h(`<button class="choice">${timeText(o)}</button>`).firstChild;
          b.addEventListener('click', () => {
            if (o === t) {
              b.classList.add('right');
              box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
              correct(!missed, t);
            } else {
              missed = true;
              b.classList.add('wrong'); b.disabled = true;
              boo();
              q('#qFb').className = 'feedback ng';
              q('#qFb').textContent = 'おしい！ もういちど みてね';
              showHint(ck, t);
            }
          });
          box.appendChild(b);
        });
      } else {
        ck.set(12 * 60);
        q('#qDone').addEventListener('click', () => {
          const got = mod(ck.t, 720), want = mod(t, 720);
          if (got === want) { q('#qDone').disabled = true; correct(!missed, t); return; }
          missed = true;
          boo();
          q('#qFb').className = 'feedback ng';
          const hOk = Math.floor(got / 60) === Math.floor(want / 60), mOk = got % 60 === want % 60;
          q('#qFb').textContent = !hOk && mOk ? '🔴 みじかい はりを みてね' : hOk && !mOk ? '🔵 ながい はりを みてね' : 'もう すこし！';
          showHint(ck, t);
        });
      }
      q('#qHintBtn').addEventListener('click', () => { sfx('tap'); missed = true; showHint(ck, t); });
      const correct = (first, tt) => {
        good();
        q('#qFb').className = 'feedback ok';
        q('#qFb').textContent = first ? '⭕ せいかい！' : '⭕ できたね！';
        speak(`${speakText(tt)}`);
        results.push(first);
        qi++;
        timer = setTimeout(render, 1600);
      };
    };

    const showHint = (ck, t) => {
      const h12 = H12(t), m = MIN(t);
      ck.showSector(kind === 'read');
      const hh = kind === 'read'
        ? (m === 0 ? `🔴 みじかい はりは ${h12}。🔵 ながい はりが 12だから「ちょうど」` : `🔴 みじかい はりは ${h12}と ${h12 % 12 + 1}の あいだ → ${h12}じ`)
        : `🔴 みじかい はりを ${m === 0 ? h12 : `${h12}と ${h12 % 12 + 1}の あいだ`}に`;
      const mm = m === 0 ? '' : m % 5 === 0
        ? `🔵 ながい はりは ${m / 5}${kind === 'read' ? ' → ' : 'に（'}${m}${fun(m)}${kind === 'read' ? '' : '）'}`
        : `🔵 ながい はりは ${Math.floor(m / 5) * 5}${fun(Math.floor(m / 5) * 5)}から こまかい めもり ${m % 5}つ`;
      q('#qHint').textContent = [hh, mm].filter(Boolean).join('　');
    };

    const finish = () => {
      stage.innerHTML = '';
      top(title);
      const score = results.filter(Boolean).length;
      const key = `${kind}${lv}`;
      if (data.best[key] == null || score > data.best[key]) data.best[key] = score;
      // さいごまで やったら シールを 1まい（ぜんぶ もっていたら なし）
      const left = STICKERS.filter((s) => !data.stickers.includes(s));
      const st = left.length ? left[rnd(left.length)] : null;
      if (st) data.stickers.push(st);
      save();
      stage.appendChild(h(`<div class="result">
        <div class="stars-big">${'⭐'.repeat(score)}${'☆'.repeat(ROUND - score)}</div>
        <p>${score === ROUND ? 'ぜんもん せいかい！ すごい！' : score >= 3 ? 'よく できました！' : 'がんばったね！'}</p>
        ${st ? `<span class="sticker-new">${st}</span><p>シールを もらったよ！</p>` : '<p>シールは ぜんぶ あつめたよ 👑</p>'}
        <div class="pill-row" style="margin-top:12px">
          <button class="btn go" id="qAgain">↺ もういちど</button>
          <button class="btn sub" id="qBook">📒 シールちょう</button>
        </div></div>`));
      sfx('alarm');
      q('#qAgain').addEventListener('click', () => { sfx('tap'); quiz(kind, lv); });
      q('#qBook').addEventListener('click', () => { sfx('tap'); open('book'); });
    };

    let timer = null;
    cleanup = () => clearTimeout(timer);
    render();
  }

  // ---------- はじめ ----------
  window.AoLearn = {
    onTab(on) {
      if (on && !stage.childElementCount) open('menu');
      if (!on && current !== 'menu' && (current === 'now' || current === 'tips')) open('menu');
    }
  };
  if (document.getElementById('lr').classList.contains('on')) open('menu');
})();
