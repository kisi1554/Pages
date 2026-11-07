'use strict';
// ロボット・れっしゃ・こうか の えがきかた

const COLS = {};
function C(h) { return COLS[h] || (COLS[h] = hexc(h)); }

function fighterPose(f) {
  const P = { hipY: 0.95, bob: 0, lean: 0, twist: 0, sh: [-0.55, -0.45], el: [-1.7, -1.9], hip: [-0.25, 0.25], knee: [0.3, 0.35], spinX: 0, lie: 0, glow: 0, out: [0.12, 0.12] };
  const a = f.anim, st = f.state;
  const crouch = (k) => { P.hipY -= 0.18 * k; P.hip[0] -= 0.4 * k; P.hip[1] -= 0.4 * k; P.knee[0] += 0.8 * k; P.knee[1] += 0.8 * k; };
  if (st === 'idle') { P.bob = Math.sin(a * 5) * 0.03; crouch(0.15 + Math.sin(a * 5) * 0.08); }
  else if (st === 'walk') {
    const s = Math.sin(a * 12); P.hip = [s * 0.6, -s * 0.6]; P.knee = [Math.max(0, -s) * 1.0 + 0.1, Math.max(0, s) * 1.0 + 0.1];
    P.bob = Math.abs(s) * 0.05; P.lean = 0.12;
  } else if (st === 'guard') { P.sh = [-1.25, -1.15]; P.el = [-2.0, -2.0]; P.lean = -0.15; crouch(0.45); P.out = [0.3, 0.3]; }
  else if (st === 'air') { P.hip = [-0.7, 0.25]; P.knee = [1.3, 0.6]; P.sh = [-2.2, -0.4]; P.el = [-0.5, -1.2]; }
  else if (st === 'atk') {
    const m = f.move, n = f.mname;
    const k = f.at < m.st ? f.at / m.st : 1, back = f.at > m.st + m.ac ? Math.min(1, (f.at - m.st - m.ac) / m.rc) : 0;
    const ext = k * (1 - back * 0.7);
    if (n === 'kick') {
      P.hip[1] = -0.3 - 1.4 * ext; P.knee[1] = 1.4 * (1 - ext) + 0.05; P.lean = -0.35 * ext; P.sh = [-0.9, 0.3]; P.el = [-1.6, -1.0]; P.hip[0] = 0.2; P.knee[0] = 0.4;
    } else if (n === 'airKick') {
      P.hip = [-1.0, -0.2]; P.knee = [0.1, 0.6]; P.lean = -0.5; P.sh = [-2.4, -2.4]; P.el = [-0.3, -0.3];
    } else {
      const i = (m.arm || 1) > 0 ? 1 : 0, j = 1 - i;
      if (m.upper) { P.sh[i] = -0.6 - 2.1 * ext; P.el[i] = -1.8 + 1.5 * ext; crouch(0.5 * (1 - ext)); P.lean = 0.2 - 0.3 * ext; }
      else { P.sh[i] = -0.4 - 1.15 * ext; P.el[i] = -2.0 + 2.0 * ext; P.lean = 0.25 * ext; }
      P.twist = 0.45 * ext * (i ? -1 : 1);
      P.sh[j] = -0.7; P.el[j] = -2.0;
      if (n === 'airPunch') { P.hip = [-0.6, 0.2]; P.knee = [1.2, 0.5]; }
    }
  } else if (st === 'super') {
    const s = f.ch.sup, ph = f.phase;
    P.glow = 1;
    if (ph === 'wind') { P.sh = [-2.8, -2.8]; P.el = [-0.2, -0.2]; crouch(0.4); P.bob = Math.sin(a * 40) * 0.03; }
    else if (s === 'drill') { P.sh = [-1.57, -1.57]; P.el = [0, 0]; P.lean = 0.6; P.hip = [0.5, 0.7]; P.knee = [0.3, 0.6]; }
    else if (s === 'press') { if (ph === 'rise') { P.hip = [-1.4, -1.4]; P.knee = [2.2, 2.2]; P.sh = [-2.8, -2.8]; P.el = [-0.4, -0.4]; } else { P.sh = [-0.3, -0.3]; P.out = [0.9, 0.9]; crouch(ph === 'end' ? 0.9 : 0); } }
    else { P.sh = [-1.57, -1.57]; P.el = [-0.1, -0.1]; P.lean = -0.1; P.hip = [-0.4, 0.4]; }
  } else if (st === 'hit' || st === 'gstun') {
    if (st === 'gstun') { P.sh = [-1.25, -1.15]; P.el = [-2.0, -2.0]; P.lean = -0.35; crouch(0.4); }
    else { P.lean = -0.55; P.sh = [0.8, 0.5]; P.el = [-0.4, -0.2]; P.hip = [-0.6, 0.2]; P.knee = [0.6, 0.3]; P.spinX = -f.spin; }
  } else if (st === 'down') { P.lie = 1; P.sh = [-2.9, -2.9]; P.el = [0, 0]; P.hip = [0, 0]; P.knee = [0.1, 0.1]; }
  else if (st === 'getup') { P.lie = Math.max(0, f.stun / 0.35); crouch(0.6 * (1 - P.lie)); }
  else if (st === 'ko' || st === 'ringout') {
    const w = Math.sin(a * 18); P.sh = [-2.6 + w * 0.6, -2.6 - w * 0.6]; P.el = [-0.3, -0.3]; P.hip = [w * 0.5, -w * 0.5]; P.knee = [0.6, 0.6];
    P.spinX = -f.spin; if (f.ro && f.ro.t > 1.1) { P.spinX = 0; P.sh = [-2.9, -0.4]; P.el = [0, -1.5]; P.hip = [-0.2, 0.3]; P.knee = [0.3, 0.3]; }
  } else if (st === 'win') {
    const w = Math.sin(a * 9); P.sh = [-2.9 + w * 0.3, -2.9 - w * 0.3]; P.el = [-0.2, -0.2]; P.bob = Math.abs(Math.sin(a * 6)) * 0.35;
  } else if (st === 'lose') { P.lean = 0.7; P.sh = [0.1, 0.1]; P.el = [-0.2, -0.2]; crouch(0.6); }
  return P;
}

function drawFighter(R, f, base, t) {
  const ch = f.ch, P = fighterPose(f), main = C(ch.color), sub = C(ch.sub), dark = C(ch.dark), eye = C(ch.eye);
  let fl = f.flash > 0 ? 1 : 0;
  if (f.inv > 0 && Math.floor(t * 20) % 2 === 0 && f.state !== 'ringout') fl = 0.5;
  const glow = Math.max(fl * 0.7, P.glow * (0.4 + Math.sin(t * 30) * 0.2));
  const m0 = M4.clone(base);
  M4.rotY(m0, f.facing > 0 ? 0 : Math.PI);
  M4.scale(m0, ch.size, ch.size, ch.size);
  if (P.lie > 0) { M4.translate(m0, 0, 0.25 * P.lie, -0.9 * P.lie); M4.rotX(m0, -Math.PI / 2 * P.lie); M4.translate(m0, 0, 0, 0); }
  if (P.spinX) { M4.translate(m0, 0, 0.9, 0); M4.rotX(m0, P.spinX); M4.translate(m0, 0, -0.9, 0); }
  const part = (m, prim, sx, sy, sz, col, e) => { const q = M4.clone(m); M4.scale(q, sx, sy, sz); R.draw(prim, q, col, e == null ? glow : e); };
  // あし
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1;
    const m = M4.clone(m0); M4.translate(m, sd * 0.22, P.hipY + P.bob, 0); M4.rotX(m, P.hip[i]);
    const th = M4.clone(m); M4.translate(th, 0, -0.22, 0); part(th, 'cyl', 0.24, 0.46, 0.24, dark);
    M4.translate(m, 0, -0.45, 0); part(m, 'sphere', 0.22, 0.22, 0.22, sub); M4.rotX(m, P.knee[i]);
    const sh = M4.clone(m); M4.translate(sh, 0, -0.22, 0); part(sh, 'cube', 0.25, 0.46, 0.27, main);
    M4.translate(m, 0, -0.45, 0.06); part(m, 'cube', 0.3, 0.16, 0.44, sub);
  }
  // からだ
  const body = M4.clone(m0); M4.translate(body, 0, P.hipY + P.bob, 0); M4.rotX(body, P.lean); M4.rotY(body, P.twist);
  part(body, 'cube', 0.55, 0.2, 0.36, dark);
  const tor = M4.clone(body); M4.translate(tor, 0, 0.42, 0);
  part(tor, 'cube', ch.id === 'gotsun' ? 0.95 : 0.78, 0.62, 0.48, main);
  const chest = M4.clone(tor); M4.translate(chest, 0, 0.06, 0.24); part(chest, 'sphere', 0.26, 0.26, 0.1, eye, 1);
  const belt = M4.clone(tor); M4.translate(belt, 0, -0.3, 0); part(belt, 'cube', 0.8, 0.1, 0.5, sub);
  // あたま
  const hd = M4.clone(body); M4.translate(hd, 0, 1.0, 0);
  if (ch.id === 'pyun') {
    part(hd, 'sphere', 0.6, 0.55, 0.55, main);
    for (const sd of [-1, 1]) {
      const e2 = M4.clone(hd); M4.translate(e2, sd * 0.13, 0.03, 0.25); part(e2, 'sphere', 0.13, 0.15, 0.08, eye, 1);
      const ear = M4.clone(hd); M4.translate(ear, sd * 0.2, 0.36, 0); M4.rotZ(ear, -sd * 0.4); part(ear, 'cone', 0.14, 0.34, 0.14, sub);
    }
  } else if (ch.id === 'gotsun') {
    part(hd, 'cube', 0.6, 0.44, 0.52, sub);
    const vis = M4.clone(hd); M4.translate(vis, 0, 0.05, 0.26); part(vis, 'cube', 0.46, 0.12, 0.04, eye, 1);
    const jaw = M4.clone(hd); M4.translate(jaw, 0, -0.2, 0.08); part(jaw, 'cube', 0.66, 0.16, 0.5, main);
    for (const sd of [-1, 1]) { const ho = M4.clone(hd); M4.translate(ho, sd * 0.34, 0.12, 0); part(ho, 'cyl', 0.12, 0.12, 0.12, dark); }
  } else {
    part(hd, 'cube', 0.5, 0.46, 0.5, main);
    const vis = M4.clone(hd); M4.translate(vis, 0, 0.04, 0.25); part(vis, 'cube', 0.38, 0.13, 0.04, eye, 1);
    const dr = M4.clone(hd); M4.translate(dr, 0, 0.42, 0); M4.rotY(dr, t * 12); part(dr, 'cone', 0.3, 0.42, 0.3, sub);
  }
  const ant = M4.clone(hd); M4.translate(ant, ch.id === 'drill' ? 0.18 : 0, ch.id === 'pyun' ? 0.33 : 0.3, -0.1);
  if (ch.id !== 'pyun') { part(ant, 'cyl', 0.03, 0.3, 0.03, dark); M4.translate(ant, 0, 0.17, 0); part(ant, 'sphere', 0.09, 0.09, 0.09, eye, 1); }
  // うで
  const fist = ch.id === 'gotsun' ? 0.36 : 0.27;
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1;
    const m = M4.clone(tor); M4.translate(m, sd * (ch.id === 'gotsun' ? 0.58 : 0.5), 0.2, 0); M4.rotZ(m, sd * P.out[i]); M4.rotX(m, P.sh[i]);
    part(m, 'sphere', ch.id === 'gotsun' ? 0.44 : 0.26, ch.id === 'gotsun' ? 0.36 : 0.26, ch.id === 'gotsun' ? 0.44 : 0.26, ch.id === 'gotsun' ? main : sub);
    const up = M4.clone(m); M4.translate(up, 0, -0.2, 0); part(up, 'cyl', 0.17, 0.4, 0.17, dark);
    M4.translate(m, 0, -0.4, 0); M4.rotX(m, P.el[i]);
    const lo = M4.clone(m); M4.translate(lo, 0, -0.2, 0); part(lo, 'cube', 0.2, 0.4, 0.2, main);
    M4.translate(m, 0, -0.46, 0); part(m, 'sphere', fist, fist, fist, sub);
    if (f.state === 'super' && ch.sup === 'drill' && f.phase !== 'wind') {
      const d = M4.clone(m); M4.translate(d, 0, -0.35, 0); M4.rotY(d, t * 30); M4.rotX(d, Math.PI); part(d, 'cone', 0.34, 0.7, 0.34, C('#ffd23f'), 1);
    }
  }
  // ふうせん（おちたときに もどってくる）
  if (f.ro && f.ro.t > 1.1 && f.hp > 0) {
    const bm = M4.clone(m0); M4.translate(bm, 0, 3.4 + Math.sin(t * 4) * 0.05, 0);
    part(bm, 'sphere', 1.1, 1.3, 1.1, C('#ff4d6d'), 0.15);
    const st = M4.clone(m0); M4.translate(st, 0, 2.3, 0); part(st, 'cyl', 0.03, 1.0, 0.03, C('#ffffff'));
  }
}

function drawTrain(R, arena, th) {
  const offs = [-4.6, 0, 4.6], body = C(th.car), stripe = C(th.car2), dark = C('#333844'), deck = C('#ffe9a8');
  for (const off of offs) {
    const b = arena(off, -ROOF, 0);
    const q = (x, y, z, sx, sy, sz, col, prim, e) => { const m = M4.clone(b); M4.translate(m, x, y, z); M4.scale(m, sx, sy, sz); R.draw(prim || 'cube', m, col, e); };
    q(0, 0.62, 0, 1.75, 0.95, 4.25, body);
    q(0, 0.75, 0, 1.8, 0.18, 4.3, stripe);
    q(0, 1.24, 0, 1.95, 0.12, 4.45, deck);
    for (let k = -1; k <= 1; k++) q(0, 1.31, k * 1.3, 1.96, 0.03, 0.3, stripe);
    for (const x of [-0.62, 0.62]) for (const z of [-1.5, 1.5]) {
      const m = M4.clone(b); M4.translate(m, x, 0.12, z); M4.rotZ(m, Math.PI / 2); M4.scale(m, 0.32, 0.18, 0.32); R.draw('cyl', m, dark);
    }
    q(0, 0.35, 2.25, 0.4, 0.3, 0.3, dark);
    if (off > 0) { // せんとう車の かお
      q(0, 0.6, 2.4, 1.6, 0.9, 1.0, body, 'sphere');
      for (const x of [-0.4, 0.4]) q(x, 0.8, 2.85, 0.32, 0.32, 0.12, C('#fff9c4'), 'sphere', 1);
      q(0, 0.42, 2.88, 0.5, 0.1, 0.06, C('#ffffff'), 'cube', 1);
    }
    if (off < 0) for (const x of [-0.6, 0.6]) q(x, 0.7, -2.15, 0.3, 0.2, 0.06, C('#ff2a2a'), 'cube', 1);
  }
}
