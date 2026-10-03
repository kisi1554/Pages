'use strict';
/* =========================================================
   core.js … 数学・3D描画・音・保存・シール・図形のなまえ判定
   ========================================================= */

/* ---------- ベクトル・行列 ---------- */
const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function newell(pts) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return V3.norm([x, y, z]);
}
function centroid(pts) {
  const c = [0, 0, 0];
  for (const p of pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  return V3.mul(c, 1 / pts.length);
}

const M3 = {
  I: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
  mul(a, b) {
    const c = new Array(9);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++)
      c[r * 3 + k] = a[r * 3] * b[k] + a[r * 3 + 1] * b[3 + k] + a[r * 3 + 2] * b[6 + k];
    return c;
  },
  ap: (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]],
  T: m => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]],
  axis(e, t) {
    const [x, y, z] = e, c = Math.cos(t), s = Math.sin(t), C = 1 - c;
    return [x * x * C + c, x * y * C - z * s, x * z * C + y * s,
            y * x * C + z * s, y * y * C + c, y * z * C - x * s,
            z * x * C - y * s, z * y * C + x * s, z * z * C + c];
  },
  rotX: t => M3.axis([1, 0, 0], t),
  rotY: t => M3.axis([0, 1, 0], t),
  rotZ: t => M3.axis([0, 0, 1], t),
  ortho(m) {
    let a = V3.norm([m[0], m[1], m[2]]);
    let b = [m[3], m[4], m[5]];
    b = V3.norm(V3.sub(b, V3.mul(a, V3.dot(a, b))));
    const c = V3.cross(a, b);
    return [...a, ...b, ...c];
  },
  lerp: (a, b, t) => M3.ortho(a.map((v, i) => v + (b[i] - v) * t)),
  round: m => m.map(v => Math.round(v)),
};
/* 回転＋平行移動 {R,t} */
const AF = {
  I: () => ({ R: M3.I(), t: [0, 0, 0] }),
  aboutLine(a, e, ang) { const R = M3.axis(e, ang); return { R, t: V3.sub(a, M3.ap(R, a)) }; },
  compose: (A, B) => ({ R: M3.mul(A.R, B.R), t: V3.add(M3.ap(A.R, B.t), A.t) }),
  ap: (A, p) => V3.add(M3.ap(A.R, p), A.t),
  move: v => ({ R: M3.I(), t: v.slice() }),
};

/* ---------- 色 ---------- */
function hexRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(rgb, k = 1, a = 1) {
  return `rgba(${Math.min(255, rgb[0] * k) | 0},${Math.min(255, rgb[1] * k) | 0},${Math.min(255, rgb[2] * k) | 0},${a})`;
}

/* ---------- ふりがな ---------- */
const R = (k, y) => `<ruby>${k}<rt>${y}</rt></ruby>`;
const W = {
  men: R('面', 'めん'), hen: R('辺', 'へん'), chou: R('頂点', 'ちょうてん'), kaku: R('角', 'かく'),
  chokkaku: R('直角', 'ちょっかく'), heikou: R('平行', 'へいこう'), suichoku: R('垂直', 'すいちょく'),
  teimen: R('底面', 'ていめん'), sokumen: R('側面', 'そくめん'), tenkai: R('展開図', 'てんかいず'),
  setsudan: R('切断面', 'せつだんめん'), kakudo: R('角度', 'かくど'), taikaku: R('対角線', 'たいかくせん'),
};

/* ---------- 保存 ---------- */
const Store = {
  get(k, def) {
    try { const v = localStorage.getItem('zukeiLab.' + k); return v == null ? def : JSON.parse(v); }
    catch (e) { return def; }
  },
  set(k, v) { try { localStorage.setItem('zukeiLab.' + k, JSON.stringify(v)); } catch (e) { /* 保存できなくても遊べる */ } },
};

/* ---------- 音（WebAudio の合成音だけ） ---------- */
const Snd = {
  on: Store.get('sound', true),
  ctx: null,
  ensure() {
    if (!this.on) return null;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
    return this.ctx;
  },
  tone(f, dur = 0.12, type = 'sine', vol = 0.12, when = 0, f2 = null) {
    const c = this.ensure(); if (!c) return;
    const t0 = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur = 0.25, vol = 0.12) {
    const c = this.ensure(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1800;
    s.buffer = buf; g.gain.value = vol; s.connect(f).connect(g).connect(c.destination); s.start();
  },
  tap() { this.tone(880, 0.06, 'triangle', 0.07); },
  pop(i = 0) { this.tone(520 + i * 60, 0.09, 'sine', 0.12, 0, 900 + i * 60); },
  ok() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.1, i * 0.08)); },
  ng() { this.tone(260, 0.22, 'square', 0.04, 0, 180); },
  roll() { this.tone(150, 0.12, 'sine', 0.2, 0, 70); },
  cut() { this.noise(0.3, 0.1); this.tone(1200, 0.25, 'sawtooth', 0.02, 0, 300); },
  bump() { this.tone(110, 0.1, 'square', 0.05); },
  fanfare() { [659, 784, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.09, i * 0.09)); },
};

/* ---------- トースト ---------- */
let toastTimer = null;
function toast(html, ms = 2200) {
  const el = document.getElementById('toast');
  el.innerHTML = html; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/* ---------- シール ---------- */
const STICKERS = [
  { id: 'face', e: '🟦', name: 'めん はかせ', how: 'りったいの めんを ぜんぶ ぬった' },
  { id: 'edge', e: '📏', name: 'へん はかせ', how: 'りったいの へんを ぜんぶ なぞった' },
  { id: 'vert', e: '📍', name: 'ちょうてん はかせ', how: 'ちょうてんに ぜんぶ シールを はった' },
  { id: 'euler', e: '🧙', name: 'オイラーの ひみつ', how: 'めん・へん・ちょうてんを ぜんぶ かぞえた' },
  { id: 'net', e: '📦', name: 'てんかいず', how: 'りったいを てんかいずに ひらいた' },
  { id: 'net5', e: '🎁', name: 'ひらき めいじん', how: '5しゅるいの りったいを ひらいた' },
  { id: 'zukan', e: '📚', name: 'りったい ずかん', how: 'ぜんぶの りったいを みた' },
  { id: 'hex', e: '⬡', name: 'ろっかく きり', how: 'りっぽうたいを きって ろっかっけいを だした' },
  { id: 'circle', e: '⭕', name: 'まるい きりくち', how: 'まがった りったいを きった' },
  { id: 'cut5', e: '✂️', name: 'きりくち コレクター', how: '5しゅるいの きりくちを みつけた' },
  { id: 'roll', e: '🎲', name: 'ころころ', how: 'さいころを 20かい ころがした' },
  { id: 'dice', e: '🔮', name: 'さいころ よそう', how: 'さいころ もんだいに 3かい せいかい' },
  { id: 'cycloid', e: '🌈', name: 'サイクロイド', how: 'まるを ころがして あとを みた' },
  { id: 'block10', e: '🧱', name: 'つみき 10こ', how: 'つみきを 10こ くっつけた' },
  { id: 'odai', e: '🏯', name: 'みとりず めいじん', how: 'さんめんずの おだいを とけた' },
  { id: 'puzzle', e: '🧩', name: 'かたち パズル', how: 'かたち パズルを といた' },
  { id: 'puzzle5', e: '🏅', name: 'パズル めいじん', how: 'かたち パズルを 5もん といた' },
  { id: 'angle', e: '📐', name: 'かくどの ひみつ', how: 'かくを あつめて 180°を みた' },
  { id: 'quiz8', e: '⭐', name: 'クイズ ほし', how: 'クイズで 8もん いじょう せいかい' },
  { id: 'quiz10', e: '👑', name: 'クイズ おうさま', how: 'クイズで ぜんもん せいかい' },
];
const Stickers = {
  got: new Set(Store.get('stickers', [])),
  give(id) {
    if (this.got.has(id)) return;
    const s = STICKERS.find(x => x.id === id); if (!s) return;
    this.got.add(id); Store.set('stickers', [...this.got]);
    setTimeout(() => { toast(`<b>シール ゲット！</b><span class="big">${s.e}</span>${s.name}`, 2800); Snd.fanfare(); }, 500);
    this.badge();
  },
  badge() { const el = document.getElementById('stCount'); if (el) el.textContent = `${this.got.size}/${STICKERS.length}`; },
};

/* ---------- まいフレーム ---------- */
const Loop = {
  fns: [], last: 0,
  add(f) { this.fns.push(f); },
  start() {
    const tick = t => {
      const dt = Math.min(0.05, (t - (this.last || t)) / 1000); this.last = t;
      for (const f of this.fns) { try { f(dt); } catch (e) { console.error(e); } }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
};
const App = { tab: 'solid' };

/* =========================================================
   3D ビュー（canvas 2D で ぬりえ式に えがく）
   ========================================================= */
const LIGHT = V3.norm([-0.35, 0.6, 0.75]);
class View3D {
  constructor(canvas, opt = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.opt = opt;
    this.R = M3.mul(M3.rotX(0.42), M3.rotY(-0.62));
    this.R0 = this.R.slice();
    this.center = [0, 0, 0]; this.fitR = 1.6; this.tCenter = null; this.tFitR = null;
    this.zoom = 1; this.vel = [0, 0]; this.autoSpin = false;
    this.W = 300; this.H = 300; this.dpr = 1; this.dirty = true;
    this.rotTween = null; this.pointers = new Map();
    this.onTap = opt.onTap || null; this.rotatable = opt.rotatable !== false;
    this.items = []; this.order = []; this.cull = true;
    if (!opt.static) {
      this._bind();
      new ResizeObserver(() => this.resize()).observe(canvas);
      this.resize();
    }
  }
  resize() {
    const r = this.cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.W = this.cv.width; this.H = this.cv.height; this.dirty = true;
  }
  _pd() { const a = [...this.pointers.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1; }
  _bind() {
    const cv = this.cv; cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => {
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      Snd.ensure();
      if (this.pointers.size === 1) {
        this.down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
        this.vel = [0, 0]; this.lastMove = performance.now();
      } else { this.down = null; this.pinch = this._pd(); this.pinchZ = this.zoom; }
    });
    cv.addEventListener('pointermove', e => {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (this.pointers.size >= 2) {
        if (this.pinch) { this.zoom = clamp(this.pinchZ * this._pd() / this.pinch, 0.4, 3); this.dirty = true; }
        return;
      }
      if (!this.down) return;
      this.down.moved += Math.abs(dx) + Math.abs(dy);
      if (!this.rotatable || this.down.moved < 6) return;
      this.rotateBy(dx * 0.011, dy * 0.011);
      this.vel = [dx * 0.011, dy * 0.011]; this.lastMove = performance.now();
    });
    const up = e => {
      if (!this.pointers.delete(e.pointerId)) return;
      if (this.down && this.pointers.size === 0) {
        const r = cv.getBoundingClientRect();
        if (this.down.moved < 8 && performance.now() - this.down.t < 650 && this.onTap)
          this.onTap((e.clientX - r.left) * this.dpr, (e.clientY - r.top) * this.dpr);
        if (performance.now() - this.lastMove > 90) this.vel = [0, 0];
      }
      if (this.pointers.size < 2) this.pinch = null;
      if (this.pointers.size === 0) this.down = null;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); this.zoom = clamp(this.zoom * Math.exp(-e.deltaY * 0.0015), 0.4, 3); this.dirty = true; }, { passive: false });
  }
  rotateBy(ax, ay) { this.R = M3.ortho(M3.mul(M3.mul(M3.rotX(ay), M3.rotY(ax)), this.R)); this.dirty = true; this.rotTween = null; }
  resetView() { this.rotTo(this.R0); this.zoom = 1; this.vel = [0, 0]; }
  rotTo(target) { this.rotTween = { from: this.R.slice(), to: target, t: 0 }; this.vel = [0, 0]; }
  /* n の向きを こちらに むける */
  lookAlong(n, up = [0, 1, 0]) {
    n = V3.norm(n);
    if (Math.abs(V3.dot(up, n)) > 0.95) up = [0, 0, -1];
    const x = V3.norm(V3.cross(up, n)), y = V3.cross(n, x);
    this.rotTo([...x, ...y, ...n]);
  }
  fitTo(center, r) { this.tCenter = center; this.tFitR = r; }
  step(dt) {
    if (this.pointers.size === 0 && Math.abs(this.vel[0]) + Math.abs(this.vel[1]) > 0.0005) {
      this.rotateBy(this.vel[0], this.vel[1]); this.vel[0] *= 0.93; this.vel[1] *= 0.93;
    }
    if (this.autoSpin && this.pointers.size === 0 && !this.rotTween) { this.R = M3.ortho(M3.mul(this.R, M3.rotY(dt * 0.6))); this.dirty = true; }
    if (this.rotTween) {
      const w = this.rotTween; w.t = Math.min(1, w.t + dt * 1.8);
      this.R = M3.lerp(w.from, w.to, ease(w.t)); this.dirty = true;
      if (w.t >= 1) this.rotTween = null;
    }
    const k = 1 - Math.exp(-dt * 7);
    if (this.tCenter) {
      const d = V3.dist(this.center, this.tCenter);
      if (d > 1e-4) { this.center = V3.lerp(this.center, this.tCenter, k); this.dirty = true; }
    }
    if (this.tFitR) {
      if (Math.abs(this.fitR - this.tFitR) > 1e-4) { this.fitR += (this.tFitR - this.fitR) * k; this.dirty = true; }
    }
  }
  get scale() { return Math.min(this.W, this.H) * 0.4 / this.fitR * this.zoom; }
  proj(p) {
    const q = M3.ap(this.R, V3.sub(p, this.center));
    const D = this.fitR * 4.5, f = D / (D - q[2]), s = this.scale;
    return [this.W / 2 + q[0] * s * f, this.H / 2 - q[1] * s * f, q[2]];
  }
  clear(bg) {
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0);
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, this.W, this.H); } else c.clearRect(0, 0, this.W, this.H);
  }
  /*
    items: [{p:[[x,y,z]...], col:[r,g,b], nb:[], hard:[], layer, alpha, decor:fn}]
    opt: {cull, transparent, silhouette, edge, lw}
  */
  drawPolys(items, opt = {}) {
    const ctx = this.ctx, cull = opt.cull !== false, dpr = this.dpr;
    const lw = (opt.lw || 2.2) * dpr, edgeCol = opt.edge || '#2a3645';
    for (const it of items) {
      const sp = it.sp = it.p.map(p => this.proj(p));
      let a = 0, z = 0;
      for (let i = 0; i < sp.length; i++) {
        const s = sp[i], t = sp[(i + 1) % sp.length];
        a += s[0] * t[1] - t[0] * s[1]; z += s[2];
      }
      it.front = a < 0; it.z = z / sp.length;
      const nv = M3.ap(this.R, newell(it.p));
      const sgn = it.front ? 1 : -1;
      it.light = 0.8 + 0.3 * Math.max(0, sgn * V3.dot(nv, LIGHT));
    }
    const order = items.map((_, i) => i).sort((i, j) => ((items[i].layer || 0) - (items[j].layer || 0)) || (items[i].z - items[j].z));
    this.items = items; this.order = order; this.cull = cull;
    const path = sp => { ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], sp[i][1]); ctx.closePath(); };
    const edgeOK = (it, i) => it.hard ? it.hard[i] : true;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (opt.transparent) {
      for (const i of order) {
        const it = items[i]; path(it.sp);
        ctx.fillStyle = rgba(it.col, it.light, it.alpha != null ? it.alpha : (it.front ? 0.22 : 0.14)); ctx.fill();
      }
      for (const pass of [0, 1]) {
        for (const i of order) {
          const it = items[i], n = it.sp.length;
          for (let e = 0; e < n; e++) {
            const nb = it.nb ? it.nb[e] : -1, nbIt = nb >= 0 ? items[nb] : null;
            const hard = edgeOK(it, e);
            const sil = !hard && nbIt && nbIt.front !== it.front;
            if (!hard && !sil) continue;
            const vis = it.front || (nbIt && nbIt.front);
            if ((pass === 0) === !!vis) continue;
            const a = it.sp[e], b = it.sp[(e + 1) % n];
            ctx.setLineDash(vis ? [] : [6 * dpr, 6 * dpr]);
            ctx.strokeStyle = vis ? edgeCol : 'rgba(42,54,69,.55)'; ctx.lineWidth = vis ? lw : lw * 0.8;
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          }
        }
      }
      ctx.setLineDash([]);
      for (const i of order) if (items[i].decor && items[i].front) items[i].decor(items[i], ctx, this);
      return;
    }
    for (const i of order) {
      const it = items[i];
      if (cull && !it.front && !it.noCull) continue;
      path(it.sp);
      ctx.fillStyle = rgba(it.col, it.front ? it.light : it.light * 0.82, it.alpha != null ? it.alpha : 1); ctx.fill();
      if (it.noEdge) { if (it.decor) it.decor(it, ctx, this); continue; }
      ctx.strokeStyle = it.edgeCol || edgeCol; ctx.lineWidth = it.lw ? it.lw * dpr : lw;
      const n = it.sp.length;
      ctx.beginPath();
      for (let e = 0; e < n; e++) {
        const nb = it.nb ? it.nb[e] : -1;
        const show = edgeOK(it, e) || (opt.silhouette !== false && cull && nb >= 0 && !items[nb].front);
        if (!show) continue;
        const a = it.sp[e], b = it.sp[(e + 1) % n];
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
      if (it.decor) it.decor(it, ctx, this);
    }
  }
  pick(x, y) {
    for (let k = this.order.length - 1; k >= 0; k--) {
      const it = this.items[this.order[k]];
      if (!it || !it.sp || it.noPick) continue;
      if (this.cull && !it.front && !it.noCull) continue;
      if (pointInPoly(x, y, it.sp)) return it;
    }
    return null;
  }
  label(p, text, opt = {}) {
    const s = this.proj(p), c = this.ctx, d = this.dpr;
    const fs = (opt.size || 15) * d;
    c.font = `bold ${fs}px "Hiragino Maru Gothic ProN","Yu Gothic",sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (opt.bg) {
      const w = c.measureText(text).width + fs * 0.9;
      c.fillStyle = opt.bg; roundRect(c, s[0] - w / 2, s[1] - fs * 0.75, w, fs * 1.5, fs * 0.6); c.fill();
    }
    c.lineWidth = 4 * d; c.strokeStyle = opt.stroke || 'rgba(255,255,255,.9)';
    if (!opt.bg) c.strokeText(text, s[0], s[1]);
    c.fillStyle = opt.color || '#1d2b3a'; c.fillText(text, s[0], s[1]);
  }
  dot(p, r, fill, stroke) {
    const s = this.proj(p), c = this.ctx;
    c.beginPath(); c.arc(s[0], s[1], r * this.dpr, 0, Math.PI * 2);
    c.fillStyle = fill; c.fill();
    if (stroke) { c.lineWidth = 2 * this.dpr; c.strokeStyle = stroke; c.stroke(); }
    return s;
  }
  line(a, b, col, w = 3, dash) {
    const s = this.proj(a), t = this.proj(b), c = this.ctx;
    c.setLineDash(dash ? dash.map(v => v * this.dpr) : []);
    c.strokeStyle = col; c.lineWidth = w * this.dpr; c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(t[0], t[1]); c.stroke();
    c.setLineDash([]);
  }
}
function pointInPoly(x, y, sp) {
  let ins = false;
  for (let i = 0, j = sp.length - 1; i < sp.length; j = i++) {
    const xi = sp[i][0], yi = sp[i][1], xj = sp[j][0], yj = sp[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
  const t = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / L, 0, 1);
  return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t);
}

/* 2D キャンバスの大きさ合わせ */
function fitCanvas(cv) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (w && h && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; return true; }
  return false;
}

/* =========================================================
   かたちの なまえ（平面図形の判定）
   ========================================================= */
/* 3D の平らな多角形を 2D になおす */
function flatten(pts3) {
  const n = newell(pts3), c = centroid(pts3);
  let u = V3.sub(pts3[0], c);
  if (V3.len(u) < 1e-9) u = V3.sub(pts3[1], c);
  u = V3.norm(u); const w = V3.cross(n, u);
  return pts3.map(p => { const d = V3.sub(p, c); return [V3.dot(d, u), V3.dot(d, w)]; });
}
function simplify2D(P) {
  let pts = P.slice();
  // ちかすぎる点を まとめる
  const size = Math.max(...pts.map(p => Math.hypot(p[0], p[1]))) || 1;
  pts = pts.filter((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > size * 0.004; });
  // 一直線の点を のぞく
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      const v1 = [b[0] - a[0], b[1] - a[1]], v2 = [c[0] - b[0], c[1] - b[1]];
      const cr = (v1[0] * v2[1] - v1[1] * v2[0]) / ((Math.hypot(...v1) * Math.hypot(...v2)) || 1);
      if (Math.abs(cr) < 0.006 && v1[0] * v2[0] + v1[1] * v2[1] > 0) { pts.splice(i, 1); changed = true; break; }
    }
  }
  return pts;
}
function polyAngles(P) {
  // 内角（度）。向きは自動で判断
  let area = 0;
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const ccw = area > 0, n = P.length;
  return P.map((b, i) => {
    const a = P[(i - 1 + n) % n], c = P[(i + 1) % n];
    const d1 = Math.atan2(c[1] - b[1], c[0] - b[0]), d2 = Math.atan2(a[1] - b[1], a[0] - b[0]);
    let ang = ccw ? d2 - d1 : d1 - d2;
    while (ang < 0) ang += Math.PI * 2; while (ang >= Math.PI * 2) ang -= Math.PI * 2;
    return ang * 180 / Math.PI;
  });
}
const NGON = { 3: ['三角形', 'さんかくけい'], 4: ['四角形', 'しかくけい'], 5: ['五角形', 'ごかくけい'], 6: ['六角形', 'ろっかくけい'], 7: ['七角形', 'ななかくけい'], 8: ['八角形', 'はっかくけい'] };
const SHAPE = {
  tri: [R('三角形', 'さんかくけい'), 'さんかくけい'],
  eqtri: [R('正三角形', 'せいさんかくけい'), 'せいさんかくけい'],
  isotri: [R('二等辺三角形', 'にとうへんさんかくけい'), 'にとうへんさんかくけい'],
  rtri: [R('直角三角形', 'ちょっかくさんかくけい'), 'ちょっかくさんかくけい'],
  risotri: [R('直角二等辺三角形', 'ちょっかくにとうへんさんかくけい'), 'ちょっかくにとうへんさんかくけい'],
  square: [R('正方形', 'せいほうけい'), 'せいほうけい'],
  rect: [R('長方形', 'ちょうほうけい'), 'ちょうほうけい'],
  rhombus: [R('ひし形', 'ひしがた'), 'ひしがた'],
  para: [R('平行四辺形', 'へいこうしへんけい'), 'へいこうしへんけい'],
  trap: [R('台形', 'だいけい'), 'だいけい'],
  isotrap: [R('等脚台形', 'とうきゃくだいけい'), 'とうきゃくだいけい'],
  quad: [R('四角形', 'しかくけい'), 'しかくけい'],
  concave: ['へこんだ ' + R('四角形', 'しかくけい'), 'へこんだしかくけい'],
  pent: [R('五角形', 'ごかくけい'), 'ごかくけい'],
  hex: [R('六角形', 'ろっかくけい'), 'ろっかくけい'],
  rpent: [R('正五角形', 'せいごかくけい'), 'せいごかくけい'],
  rhex: [R('正六角形', 'せいろっかくけい'), 'せいろっかくけい'],
  circle: [R('円', 'えん'), 'えん'],
  ellipse: [R('だ円', 'だえん'), 'だえん'],
  curved: ['まっすぐな せんと まがった せんの かたち', 'まがったかたち'],
};
function classify2D(P0) {
  const P = simplify2D(P0), n = P.length;
  const sides = P.map((p, i) => { const q = P[(i + 1) % n]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });
  const ang = polyAngles(P);
  const eq = (a, b) => Math.abs(a - b) <= 0.025 * Math.max(a, b);
  const isR = a => Math.abs(a - 90) < 1.5;
  const res = (key, reason) => ({ key, name: SHAPE[key] ? SHAPE[key][0] : key, kana: SHAPE[key] ? SHAPE[key][1] : key, reason, n, sides, angles: ang, pts: P });
  if (n > 8) {
    const L = sides.slice().sort((a, b) => a - b), med = L[Math.floor(L.length / 2)];
    if (L[L.length - 1] > med * 4) return res('curved', 'まっすぐな ところと まるい ところが あるよ');
    const c = P.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]);
    const ds = P.map(p => Math.hypot(p[0] - c[0], p[1] - c[1]));
    const mx = Math.max(...ds), mn = Math.min(...ds);
    return mn / mx > 0.97 ? res('circle', 'まんなかから どこまでも おなじ ながさ') : res('ellipse', 'たまごを ほそながく したような まる');
  }
  if (n === 3) {
    const [a, b, c] = sides, allEq = eq(a, b) && eq(b, c), two = eq(a, b) || eq(b, c) || eq(a, c);
    const right = ang.some(isR);
    if (allEq) return res('eqtri', '3つの へんの ながさが ぜんぶ おなじ。かくは ぜんぶ 60°');
    if (right && two) return res('risotri', '2つの へんが おなじ ながさで、直角が ある'.replace('直角', W.chokkaku));
    if (right) return res('rtri', W.chokkaku + 'の かくが 1つ ある');
    if (two) return res('isotri', '2つの へんの ながさが おなじ');
    return res('tri', '3つの へんで かこまれた かたち');
  }
  if (n === 4) {
    if (ang.some(a => a > 180.5)) return res('concave', 'かどが 1つ うちがわに へこんでいる');
    const dir = i => { const p = P[i], q = P[(i + 1) % 4]; const l = Math.hypot(q[0] - p[0], q[1] - p[1]); return [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; };
    const par = (i, j) => { const a = dir(i), b = dir(j); return Math.abs(a[0] * b[1] - a[1] * b[0]) < 0.02; };
    const p1 = par(0, 2), p2 = par(1, 3), allR = ang.every(isR);
    const allEq = sides.every(s => eq(s, sides[0]));
    if (allEq && allR) return res('square', '4つの へんが おなじ ながさで、4つの かどが ぜんぶ ' + W.chokkaku);
    if (allR) return res('rect', '4つの かどが ぜんぶ ' + W.chokkaku);
    if (allEq) return res('rhombus', '4つの へんが ぜんぶ おなじ ながさ');
    if (p1 && p2) return res('para', 'むかいあう へんが 2くみとも ' + W.heikou);
    if (p1 || p2) {
      const legs = p1 ? [sides[1], sides[3]] : [sides[0], sides[2]];
      if (eq(legs[0], legs[1])) return res('isotrap', W.heikou + 'な へんが 1くみ。ななめの へんが おなじ ながさ');
      return res('trap', 'むかいあう へんが 1くみだけ ' + W.heikou);
    }
    return res('quad', '4つの へんで かこまれた かたち');
  }
  const reg = sides.every(s => eq(s, sides[0])) && ang.every(a => Math.abs(a - ang[0]) < 1.5);
  if (n === 5) return reg ? res('rpent', 'へんも かくも ぜんぶ おなじ。かくは 108°') : res('pent', '5つの へんで かこまれた かたち');
  if (n === 6) return reg ? res('rhex', 'へんも かくも ぜんぶ おなじ。かくは 120°') : res('hex', '6つの へんで かこまれた かたち');
  const nm = NGON[n];
  return { key: 'n' + n, name: nm ? R(nm[0], nm[1]) : n + 'かくけい', kana: nm ? nm[1] : '', reason: n + 'つの へんで かこまれた かたち', n, sides, angles: ang, pts: P };
}

/* ズームボタン */
const $ = id => document.getElementById(id);
function bindZoom(stage, getView) {
  stage.querySelectorAll('.zoom button').forEach(b => b.addEventListener('click', () => {
    const v = getView(); if (!v) return; Snd.tap();
    if (b.dataset.z === 'in') v.zoom = clamp(v.zoom * 1.2, 0.4, 3);
    else if (b.dataset.z === 'out') v.zoom = clamp(v.zoom / 1.2, 0.4, 3);
    else v.resetView();
    v.dirty = true;
  }));
}
