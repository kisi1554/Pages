'use strict';
// ジェットコースターの レール（カメの ように すすみながら かたちを つくる）

const TRACK_SEGS = [
  { len: 26, f: 'station' },
  { len: 12, pitch: 24, f: 'lift' },
  { len: 62, f: 'lift' },
  { len: 16, pitch: -24, f: 'lift' },
  { len: 4 },
  { len: 18, pitch: -60, tag: 'drop' },       // だいきな おちる ところ
  { len: 20, tag: 'drop' },
  { len: 28, pitch: 60 },
  { len: 14, f: 'boost' },
  { len: 16, pitch: 26 },                     // ふわっと する おか
  { len: 32, pitch: -52, tag: 'air' },
  { len: 16, pitch: 26 },
  { len: 80, turn: 180, bank: 62 },           // かたむいた カーブ
  { len: 12 },
  { len: 72, loop: true, drift: 7, tag: 'loop' }, // ループ
  { len: 12, pitch: 14 },
  { len: 12, pitch: -14 },
  { len: 36, roll: 360, tag: 'roll' },        // くるりん ひねり
  { len: 12, pitch: -10 },
  { len: 12, pitch: 10 },
  { len: 60, turn: -110, bank: -50 },
  { len: 14, pitch: 22 },
  { len: 28, pitch: -44, tag: 'air' },
  { len: 14, pitch: 22 },
  { len: 16, pitch: 16 },                     // たかい ところへ のぼる
  { len: 40 },
  { len: 16, pitch: -16 },
  { len: 70, turn: -200, bank: -58 },        // ぐるぐる らせん
  { len: 10, f: 'boost' },
  { len: 56, f: 'tunnel' },
  { len: 12, pitch: 20 },
  { len: 24, pitch: -40, tag: 'air' },
  { len: 12, pitch: 20 },
  { len: 30, roll: -360, tag: 'roll' },
  { len: 70, turn: 130, bank: 50 },
  { len: 44, f: 'brake' },
  { len: 22, f: 'station' },
];

function buildTrackPath() {
  const { V3: V } = (typeof module !== 'undefined') ? require('./gl.js') : { V3 };
  const D = Math.PI / 180;
  const ss = (t) => t * t * t * (t * (t * 6 - 15) + 10);       // なめらか 0→1
  const bell = (t) => Math.sin(Math.PI * t) ** 2;              // 0→1→0
  let p = [0, 0, 0], F = [0, 0, -1], U = [0, 1, 0], R = [1, 0, 0];
  const pts = [{ p, F, U, R, f: 'station', tag: '' }];
  const Y = [0, 1, 0];
  for (const sg of TRACK_SEGS) {
    const n = Math.round(sg.len);
    const R0 = R;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, ds = ss(t1) - ss(t0);
      if (sg.turn) { const a = -sg.turn * D * ds; F = V.rot(F, Y, a); U = V.rot(U, Y, a); R = V.rot(R, Y, a); }
      if (sg.bank) { const a = sg.bank * D * (bell(t1) - bell(t0)); U = V.rot(U, F, -a); R = V.rot(R, F, -a); }
      if (sg.pitch) { const a = sg.pitch * D * ds; F = V.rot(F, R, a); U = V.rot(U, R, a); }
      if (sg.loop) { const a = 2 * Math.PI * (t1 - t0); F = V.rot(F, R, a); U = V.rot(U, R, a); }
      if (sg.roll) { const a = sg.roll * D * ds; U = V.rot(U, F, -a); R = V.rot(R, F, -a); }
      p = V.add(p, F);
      if (sg.drift) p = V.madd(p, R0, sg.drift * ds);
      F = V.norm(F); R = V.norm(V.cross(F, U)); U = V.norm(V.cross(R, F));
      pts.push({ p, F, U, R, f: sg.f || '', tag: sg.tag || '' });
    }
  }
  // いちばん ひくい ところが じめんから 2.5m に なるように もちあげる
  let lo = Infinity; for (const q of pts) lo = Math.min(lo, q.p[1] - (q.U[1] < 0 ? 1 : 0));
  for (const q of pts) q.p = [q.p[0], q.p[1] - lo + 3.5, q.p[2]];
  return pts;
}

function Track() {
  this.pts = buildTrackPath();
  this.len = this.pts.length - 1;
}
Track.prototype.frameAt = function (s) {
  const P = this.pts;
  if (s < 0) s = 0; if (s > this.len - 0.001) s = this.len - 0.001;
  const i = Math.floor(s), t = s - i, a = P[i], b = P[i + 1];
  const F = V3.norm(V3.lerp(a.F, b.F, t));
  let U = V3.lerp(a.U, b.U, t);
  const R = V3.norm(V3.cross(F, U)); U = V3.cross(R, F);
  return { p: V3.lerp(a.p, b.p, t), F, U, R, f: a.f, tag: a.tag };
};
// まがりぐあい（dF/ds）
Track.prototype.curv = function (s) {
  const a = this.frameAt(s - 1), b = this.frameAt(s + 1);
  return V3.mul(V3.sub(b.F, a.F), 0.5);
};

// ---------- レールの メッシュ ----------
function buildTrackMesh(track, theme) {
  const b = new Builder();
  const P = track.pts;
  const tube = (ox, oy, r, col, seg) => {
    const ring = (q) => {
      const c = V3.madd(V3.madd(q.p, q.R, ox), q.U, oy), out = [];
      for (let k = 0; k <= seg; k++) {
        const a = 2 * Math.PI * k / seg, n = V3.add(V3.mul(q.R, Math.cos(a)), V3.mul(q.U, Math.sin(a)));
        out.push([V3.madd(c, n, r), n]);
      }
      return out;
    };
    let prev = ring(P[0]);
    for (let i = 1; i < P.length; i++) {
      const cur = ring(P[i]);
      for (let k = 0; k < seg; k++) {
        const a = prev[k], bb = prev[k + 1], c = cur[k + 1], d = cur[k];
        for (const v of [a, bb, c, a, c, d]) b.v(v[0], v[1], col);
      }
      prev = cur;
    }
  };
  const rail = hexc('#f2f2f2'), spine = hexc(theme.trackColor), tie = hexc('#5b6270');
  tube(0.55, -0.05, 0.09, rail, 6);
  tube(-0.55, -0.05, 0.09, rail, 6);
  tube(0, -0.5, 0.2, spine, 8);
  const bulbs = ['#ff4d6d', '#ffd23f', '#3ae0ff', '#7cff6b', '#ff8cf0'].map((h) => hexc(h, 0.5));
  for (let i = 0; i < P.length; i += 2) {
    const q = P[i];
    const m = M4.frame(q.R, q.U, q.F, V3.madd(q.p, q.U, -0.2));
    M4.scale(m, 1.25, 0.1, 0.22); b.add('cube', m, tie);
    const m2 = M4.frame(q.R, q.U, q.F, V3.madd(q.p, q.U, -0.36));
    M4.scale(m2, 0.12, 0.3, 0.16); b.add('cube', m2, tie);
    if (i % 4 === 0) {
      for (const sd of [-1, 1]) {
        const m3 = M4.frame(q.R, q.U, q.F, V3.madd(V3.madd(q.p, q.U, -0.5), q.R, sd * 0.24));
        M4.scale(m3, 0.12, 0.12, 0.12); b.add('cube', m3, bulbs[(i / 4 + (sd > 0 ? 2 : 0)) % bulbs.length]);
      }
    }
  }
  return b;
}

// ---------- けしき（じめん・まち・き・やま・くも・はしら・えき・トンネル） ----------
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function buildScenery(track) {
  const b = new Builder();
  const P = track.pts, rnd = rng(20261107);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const q of P) { x0 = Math.min(x0, q.p[0]); x1 = Math.max(x1, q.p[0]); z0 = Math.min(z0, q.p[2]); z1 = Math.max(z1, q.p[2]); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // レールの ちかくか しらべる ための マス目
  const cell = 16, grid = new Map();
  for (const q of P) { const k = Math.floor(q.p[0] / cell) + ',' + Math.floor(q.p[2] / cell); grid.set(k, true); }
  const nearTrack = (x, z, r) => {
    const n = Math.ceil(r / cell);
    const gx = Math.floor(x / cell), gz = Math.floor(z / cell);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) if (grid.has((gx + i) + ',' + (gz + j))) return true;
    return false;
  };
  // じめん（いちまつもよう で スピードが わかる）
  const T = 40, NT = 46;
  const g1 = hexc('#6cc24a'), g2 = hexc('#5db33f'), g3 = hexc('#8fd65b');
  for (let i = -NT; i < NT; i++) for (let j = -NT; j < NT; j++) {
    const x = cx + i * T, z = cz + j * T;
    const c = ((i + j) & 1) ? g1 : (rnd() < 0.15 ? g3 : g2);
    const p0 = [x, 0, z], p1 = [x + T, 0, z], p2 = [x + T, 0, z + T], p3 = [x, 0, z + T], n = [0, 1, 0];
    for (const v of [p0, p1, p2, p0, p2, p3]) b.v(v, n, c);
  }
  // みずうみ
  const lake = { x: cx - 160, z: cz + 120 };
  { const m = M4.ident(); M4.translate(m, lake.x, 0.06, lake.z); M4.scale(m, 150, 0.1, 110); b.add('cyl', m, hexc('#3fa7e8')); }
  // みち（レールの したに ある ゆうえんちの みち）
  const path = hexc('#e8d7b0');
  for (let i = 0; i < P.length; i += 3) {
    const q = P[i]; if (q.U[1] < 0.5) continue;
    const m = M4.ident(); M4.translate(m, q.p[0] + q.R[0] * 5, 0.04, q.p[2] + q.R[2] * 5);
    M4.rotY(m, Math.atan2(q.F[0], q.F[2])); M4.scale(m, 3, 0.05, 3.4); b.add('cube', m, path);
  }
  // はしら
  const pc = hexc('#f5f7fb'), pc2 = hexc('#4a78d8');
  for (let i = 0; i < P.length; i += 6) {
    const q = P[i]; if (q.U[1] < 0.55 || q.f === 'tunnel') continue;
    const top = q.p[1] - 0.6; if (top < 1) continue;
    const base = V3.madd(q.p, q.U, -0.6);
    const m = M4.ident(); M4.translate(m, base[0], top / 2, base[2]); M4.scale(m, 0.45, top, 0.45); b.add('cyl', m, pc);
    const m2 = M4.ident(); M4.translate(m2, base[0], 0.4, base[2]); M4.scale(m2, 1.1, 0.8, 1.1); b.add('cube', m2, pc2);
  }
  // ループの したの ささえ
  for (let i = 0; i < P.length; i++) {
    const q = P[i]; if (q.tag !== 'loop' || i % 5) continue;
    if (q.U[1] > 0.3 || q.p[1] < 6) continue;
    const top = q.p[1]; const m = M4.ident(); M4.translate(m, q.p[0], top / 2, q.p[2]); M4.scale(m, 0.35, top, 0.35); b.add('cyl', m, pc);
  }
  // トンネル（8かくけいの つつ）
  const tcolA = hexc('#ff9f1c'), tcolB = hexc('#2ec4b6'), tl = hexc('#fff3b0', 0.5);
  let ti = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const q = P[i], q2 = P[i + 1]; if (q.f !== 'tunnel' || q2.f !== 'tunnel') continue;
    ti++;
    const ctr = (o) => V3.madd(o.p, o.U, 2.2);
    for (let k = 0; k < 8; k++) {
      const a0 = 2 * Math.PI * k / 8 + Math.PI / 8, a1 = 2 * Math.PI * (k + 1) / 8 + Math.PI / 8;
      const pt = (o, a, r) => V3.madd(V3.madd(ctr(o), o.R, Math.cos(a) * r), o.U, Math.sin(a) * r);
      const n = V3.norm(V3.add(V3.mul(q.R, Math.cos((a0 + a1) / 2)), V3.mul(q.U, Math.sin((a0 + a1) / 2))));
      const c = (Math.floor(ti / 4) & 1) ? tcolA : tcolB;
      if (k === 6) continue; // した は あけておく（レールが みえる）
      const A = pt(q, a0, 4.6), B = pt(q, a1, 4.6), C = pt(q2, a1, 4.6), Dd = pt(q2, a0, 4.6);
      const ni = V3.mul(n, -1);
      for (const v of [A, B, C, A, C, Dd]) b.v(v, ni, c);
      const A2 = pt(q, a0, 5.0), B2 = pt(q, a1, 5.0), C2 = pt(q2, a1, 5.0), D2 = pt(q2, a0, 5.0);
      for (const v of [A2, B2, C2, A2, C2, D2]) b.v(v, n, c);
    }
    if (ti % 5 === 0) {
      for (const sd of [-1, 1]) {
        const m = M4.frame(q.R, q.U, q.F, V3.madd(V3.madd(ctr(q), q.R, sd * 3.2), q.U, 2.6));
        M4.scale(m, 0.6, 0.25, 1.2); b.add('cube', m, tl);
      }
    }
  }
  // えき（はじめと おわり）
  const st = [P[12], P[P.length - 12]];
  for (const q of st) {
    { // カメラが ある がわ（みぎ）には なにも おかない
      const sd = -1;
      const m = M4.frame(q.R, q.U, q.F, V3.madd(V3.madd(q.p, q.R, sd * 3.2), q.U, -0.3));
      M4.scale(m, 3.6, 0.6, 26); b.add('cube', m, hexc('#e0e4ec'));
      for (let k = -2; k <= 2; k++) {
        const m2 = M4.frame(q.R, q.U, q.F, V3.madd(V3.madd(V3.madd(q.p, q.R, sd * 4.6), q.U, 3.4), q.F, k * 6));
        M4.scale(m2, 0.3, 7, 0.3); b.add('cube', m2, hexc('#ff5d8f'));
      }
    }
    const roof = M4.frame(q.R, q.U, q.F, V3.madd(V3.madd(q.p, q.U, 7.1), q.R, -2.5)); M4.scale(roof, 6, 0.4, 28); b.add('cube', roof, hexc('#ff5d8f'));
    const roof2 = M4.frame(q.R, q.U, q.F, V3.madd(V3.madd(q.p, q.U, 7.5), q.R, -2.8)); M4.scale(roof2, 4.6, 0.4, 26); b.add('cube', roof2, hexc('#ffd23f'));
    for (let k = -2; k <= 2; k++) { // えきの はしら
      const c = V3.madd(V3.madd(q.p, q.R, -3.4), q.F, k * 6), h = Math.max(0.1, q.p[1] - 0.6);
      const pm = M4.ident(); M4.translate(pm, c[0], h / 2, c[2]); M4.scale(pm, 0.8, h, 0.8); b.add('cube', pm, hexc('#c9b8a0'));
    }
  }
  // ゴールの もん（しろくろ）
  {
    const q = P[P.length - 30];
    for (let k = -5; k <= 5; k++) for (let r = 0; r < 2; r++) {
      const m = M4.frame(q.R, q.U, q.F, V3.madd(V3.madd(q.p, q.R, k * 0.8), q.U, 6.2 + r * 0.8));
      M4.scale(m, 0.8, 0.8, 0.3); b.add('cube', m, ((k + r) & 1) ? hexc('#111111') : hexc('#ffffff'));
    }
    for (const sd of [-1, 1]) { const m = M4.frame(q.R, q.U, q.F, V3.madd(V3.madd(q.p, q.R, sd * 4.4), q.U, 3.3)); M4.scale(m, 0.4, 7, 0.4); b.add('cube', m, hexc('#ffffff')); }
  }
  // かんらんしゃ
  {
    const fx = cx + 120, fz = cz - 60, fy = 46, R = 38;
    const ring = hexc('#ff6fb0'), sp = hexc('#ffffff');
    for (let k = 0; k < 36; k++) {
      const a = 2 * Math.PI * k / 36;
      const m = M4.ident(); M4.translate(m, fx, fy + Math.sin(a) * R, fz + Math.cos(a) * R); M4.rotX(m, -a); M4.scale(m, 0.8, 0.8, 6.8); b.add('cube', m, ring);
      if (k % 3 === 0) {
        const m2 = M4.ident(); M4.translate(m2, fx, fy + Math.sin(a) * R / 2, fz + Math.cos(a) * R / 2); M4.rotX(m2, -a); M4.scale(m2, 0.4, 0.4, R); b.add('cube', m2, sp);
        const cc = hexc(['#ffd23f', '#3ae0ff', '#7cff6b', '#ff4d6d'][(k / 3) % 4]);
        const m3 = M4.ident(); M4.translate(m3, fx + 2.2, fy + Math.sin(a) * R - 2.5, fz + Math.cos(a) * R); M4.scale(m3, 3, 3.4, 3); b.add('cube', m3, cc);
        const m4 = M4.ident(); M4.translate(m4, fx + 2.2, fy + Math.sin(a) * R - 0.5, fz + Math.cos(a) * R); M4.scale(m4, 0.6, 0.6, 0.6); b.add('cube', m4, hexc('#fff3b0', 0.5));
      }
    }
    for (const sd of [-1, 1]) for (const z2 of [-1, 1]) {
      const m = M4.ident(); M4.translate(m, fx + sd * 4, fy / 2, fz + z2 * 12); M4.rotX(m, z2 * 0.25); M4.scale(m, 1, fy + 2, 1); b.add('cube', m, sp);
    }
    if (nearTrack(fx, fz, 50)) { /* かさなっても きにしない */ }
  }
  // まち（ビル）
  const bcol = ['#f7c59f', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#caffbf', '#fdffb6', '#9bf6ff', '#ffadad'].map((h) => hexc(h));
  const win = hexc('#fff1a8', 0.5);
  for (let k = 0; k < 140; k++) {
    const a = rnd() * Math.PI * 2, r = 260 + rnd() * 420;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.8;
    if (Math.hypot(x - lake.x, z - lake.z) < 170) continue;
    const w = 14 + rnd() * 22, d = 14 + rnd() * 22, h = 18 + rnd() * 70;
    b.box(x, h / 2, z, w, h, d, bcol[k % bcol.length]);
    for (let y = 8; y < h - 4; y += 9) b.box(x, y, z, w + 0.4, 2.2, d + 0.4, win);
    if (rnd() < 0.3) b.box(x, h + 3, z, 1, 6, 1, hexc('#ff4d6d', 1));
  }
  // き
  const leaf = [hexc('#2f9e44'), hexc('#37b24d'), hexc('#40c057')], trunk = hexc('#8d5524');
  for (let k = 0; k < 420; k++) {
    const x = cx + (rnd() - 0.5) * 900, z = cz + (rnd() - 0.5) * 900;
    if (nearTrack(x, z, 14) || Math.hypot(x - lake.x, z - lake.z) < 160) continue;
    const s = 0.7 + rnd() * 1.2;
    b.box(x, 1.5 * s, z, 0.7 * s, 3 * s, 0.7 * s, trunk);
    const m = M4.ident(); M4.translate(m, x, 5.5 * s, z);
    if (k & 1) { M4.scale(m, 5 * s, 7 * s, 5 * s); b.add('cone', m, leaf[k % 3]); }
    else { M4.scale(m, 5.5 * s, 5 * s, 5.5 * s); b.add('ball', m, leaf[k % 3]); }
  }
  // とおくの やま
  for (let k = 0; k < 26; k++) {
    const a = k / 26 * Math.PI * 2 + rnd() * 0.2, r = 1100 + rnd() * 300;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, h = 160 + rnd() * 260, w = 380 + rnd() * 300;
    const m = M4.ident(); M4.translate(m, x, h / 2 - 5, z); M4.scale(m, w, h, w); b.add('cone', m, hexc(k & 1 ? '#5f9e6e' : '#6f8fae'));
    if (h > 300) { const m2 = M4.ident(); M4.translate(m2, x, h * 0.86, z); M4.scale(m2, w * 0.29, h * 0.3, w * 0.29); b.add('cone', m2, hexc('#ffffff')); }
  }
  // くも
  for (let k = 0; k < 50; k++) {
    const x = cx + (rnd() - 0.5) * 1800, z = cz + (rnd() - 0.5) * 1800, y = 110 + rnd() * 120;
    for (let j = 0; j < 4; j++) {
      const m = M4.ident(); M4.translate(m, x + (rnd() - 0.5) * 50, y + rnd() * 8, z + (rnd() - 0.5) * 30);
      const s = 30 + rnd() * 30; M4.scale(m, s * 1.6, s * 0.6, s); b.add('ball', m, hexc('#ffffff'));
    }
  }
  return { b, center: [cx, 0, cz] };
}

// そら（カメラを かこむ おおきな たま。いろは テーマで かわる）
function buildSky(theme) {
  const b = new Builder();
  const top = theme.skyTop, hor = theme.skyHor, LA = 16, LO = 24, R = 1600;
  const col = (y) => { const t = Math.max(0, Math.min(1, y)); const k = Math.pow(t, 0.6); return [hor[0] + (top[0] - hor[0]) * k, hor[1] + (top[1] - hor[1]) * k, hor[2] + (top[2] - hor[2]) * k, 1]; };
  for (let i = 0; i < LA; i++) for (let j = 0; j < LO; j++) {
    const sp = (ii, jj) => { const t = Math.PI * ii / LA, f = 2 * Math.PI * jj / LO; return [Math.sin(t) * Math.cos(f), Math.cos(t), Math.sin(t) * Math.sin(f)]; };
    const q = [sp(i, j), sp(i + 1, j), sp(i + 1, j + 1), sp(i, j), sp(i + 1, j + 1), sp(i, j + 1)];
    for (const v of q) b.v(V3.mul(v, R), [0, 1, 0], col(v[1]));
  }
  const r = rng(7);
  if (theme.night > 0.5) {
    for (let k = 0; k < 260; k++) {
      const a = r() * Math.PI * 2, e = 0.12 + r() * 1.3;
      const d = [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)];
      const m = M4.ident(); const p = V3.mul(d, R * 0.95); M4.translate(m, p[0], p[1], p[2]); const s = 3 + r() * 5; M4.scale(m, s, s, s);
      b.add('cube', m, [1, 1, 0.9, 1]);
    }
  }
  // たいよう／おつきさま
  const sd = V3.norm(theme.sunDir || theme.L), sp = V3.mul(sd, R * 0.9);
  const m = M4.ident(); M4.translate(m, sp[0], sp[1], sp[2]); const s = theme.night > 0.5 ? 70 : 110; M4.scale(m, s, s, s);
  b.add('sphere', m, [...theme.sun.slice(0, 3), 1]);
  return b;
}

if (typeof module !== 'undefined') module.exports = { buildTrackPath, TRACK_SEGS };
