'use strict';
// ロボット ファイター（うごき・わざ・CPU）

const HALF = 6.8;   // れっしゃの はしまでの ながさ（まんなかから）
const ROOF = 1.3;   // れっしゃの やねの たかさ

const CHARS = [
  { id: 'drill', name: 'ドリルン', color: '#e8433a', sub: '#f4f4f4', dark: '#7a1c18', eye: '#7ff3ff', size: 1.0,
    speed: 4.4, jump: 8.6, power: 1.0, weight: 1.0, sup: 'drill', supName: 'ドリル ロケット', type: 'バランス',
    stars: [2, 2, 2], emoji: '🔴' },
  { id: 'gotsun', name: 'ゴツン', color: '#2f6fe0', sub: '#c3ccd8', dark: '#173a7a', eye: '#ffe14d', size: 1.15,
    speed: 3.6, jump: 7.8, power: 1.25, weight: 1.35, sup: 'press', supName: 'ズドーン プレス', type: 'パワー',
    stars: [3, 1, 1], emoji: '🔵' },
  { id: 'pyun', name: 'ピュン', color: '#ffc21a', sub: '#ff6fb0', dark: '#8a5a00', eye: '#ff3d8b', size: 0.9,
    speed: 5.4, jump: 9.4, power: 0.85, weight: 0.8, sup: 'beam', supName: 'ビリビリ ビーム', type: 'スピード',
    stars: [1, 3, 3], emoji: '🟡' },
];

// わざ: st=ためる じかん ac=あたる じかん rc=もどる じかん、r0..r1=まえ方向の とどく はんい、y0..y1=たかさ
const MOVES = {
  punch1: { st: .07, ac: .08, rc: .17, dmg: 5, r0: .2, r1: 1.25, y0: .9, y1: 1.8, kb: 2.2, kby: 0, stun: .32, lunge: 1.6, next: 'punch2', pow: .3, arm: 1 },
  punch2: { st: .07, ac: .08, rc: .17, dmg: 6, r0: .2, r1: 1.3, y0: .9, y1: 1.8, kb: 2.6, kby: 0, stun: .34, lunge: 1.6, next: 'punch3', pow: .35, arm: -1 },
  punch3: { st: .12, ac: .1, rc: .3, dmg: 10, r0: .2, r1: 1.45, y0: .8, y1: 1.8, kb: 7.5, kby: 4.5, stun: .5, lunge: 3.2, pow: .6, arm: 1, upper: true },
  kick: { st: .17, ac: .12, rc: .32, dmg: 12, r0: .2, r1: 1.6, y0: .2, y1: 1.4, kb: 9, kby: 6.5, stun: .55, lunge: 2.2, pow: .7 },
  airPunch: { st: .06, ac: .22, rc: .14, dmg: 7, r0: .1, r1: 1.3, y0: .2, y1: 1.8, kb: 4, kby: 2.5, stun: .38, air: true, pow: .4, arm: 1 },
  airKick: { st: .1, ac: .7, rc: .16, dmg: 10, r0: .1, r1: 1.4, y0: -.3, y1: 1.1, kb: 7.5, kby: 5.5, stun: .5, air: true, dive: true, pow: .6 },
};
const SUPERS = {
  drill: { dmg: 22, r0: -.2, r1: 1.5, y0: .2, y1: 1.9, kb: 14, kby: 7.5, stun: .9, pow: 1, sup: true },
  press: { dmg: 22, r0: -1, r1: 1, y0: -.5, y1: 1.5, kb: 11, kby: 10, stun: .9, pow: 1, sup: true },
  beam: { dmg: 18, kb: 11, kby: 7, stun: .9, pow: 1, sup: true },
};

function Fighter(ch, side) { this.ch = ch; this.side = side; this.reset(side < 0 ? -2.6 : 2.6); }
Fighter.prototype.reset = function (z) {
  Object.assign(this, { z, y: 0, x: 0, vz: 0, vy: 0, facing: z < 0 ? 1 : -1, hp: 100, dispHp: 100, sp: this.sp || 0,
    state: 'idle', at: 0, move: null, mname: '', hitDone: false, buffer: null, inv: 0, stun: 0, tumble: false, spin: 0,
    airAtk: false, anim: 0, flash: 0, ro: null, phase: '', combo: 0, comboT: 0 });
};
Fighter.prototype.canAct = function () { return this.state === 'idle' || this.state === 'walk' || this.state === 'guard' || (this.state === 'air' && !this.airAtk); };
Fighter.prototype.onFloor = function () { return Math.abs(this.z) <= HALF; };
Fighter.prototype.height = function () { return 1.75 * this.ch.size; };

Fighter.prototype.startMove = function (name, env) {
  this.state = 'atk'; this.mname = name; this.move = MOVES[name]; this.at = 0; this.hitDone = false; this.buffer = null;
  if (this.move.air) this.airAtk = true;
  env.sfx('whoosh');
};
Fighter.prototype.startSuper = function (env) {
  this.sp = 0; this.state = 'super'; this.at = 0; this.phase = 'wind'; this.hitDone = false; this.vz = 0;
  if (this.y <= 0) this.vy = 0;
  env.superStart(this);
};

Fighter.prototype.checkHit = function (m, o) {
  if (o.inv > 0 || o.state === 'ringout' || o.state === 'ko' || o.state === 'down' || o.state === 'getup') return false;
  const s = this.ch.size, os = o.ch.size;
  const rel = (o.z - this.z) * this.facing;
  if (rel < m.r0 * s - 0.35 * os || rel > m.r1 * s + 0.35 * os) return false;
  const a0 = this.y + m.y0 * s, a1 = this.y + m.y1 * s, b0 = o.y, b1 = o.y + o.height();
  return a1 > b0 && a0 < b1;
};

Fighter.prototype.update = function (dt, inp, opp, env) {
  const ch = this.ch;
  this.anim += dt;
  if (this.inv > 0) this.inv -= dt;
  if (this.flash > 0) this.flash -= dt;
  if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
  if (this.state === 'ringout') { this.updRingout(dt, opp, env); return; }
  const grounded = this.y <= 0 && this.onFloor();
  // あいてを むく
  if ((this.state === 'idle' || this.state === 'walk' || this.state === 'guard') && Math.abs(opp.z - this.z) > 0.05) this.facing = opp.z > this.z ? 1 : -1;
  // わざを だす
  if (env.fight && this.canAct()) {
    if ((inp.superP || this.supBuf) && this.sp >= 100) { this.supBuf = false; this.startSuper(env); }
    else if (inp.punchP) this.startMove(grounded ? 'punch1' : 'airPunch', env);
    else if (inp.kickP) this.startMove(grounded ? 'kick' : 'airKick', env);
    else if (inp.jumpP && grounded) { this.vy = ch.jump; this.y = 0.001; this.state = 'air'; this.airAtk = false; env.sfx('jump'); }
  } else if (this.state === 'atk' && inp.punchP && this.move.next) this.buffer = this.move.next;
  if (inp.superP && this.sp >= 100 && !this.canAct()) this.supBuf = true;
  if (this.state === 'hit' || this.state === 'ringout') this.supBuf = false;
  // あるく・ガード
  let mv = env.fight ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
  const st = this.state;
  if (st === 'idle' || st === 'walk' || st === 'guard') {
    if (!grounded) this.state = 'air';
    else if (mv === 0) { this.state = 'idle'; this.vz *= Math.exp(-14 * dt); }
    else if (mv === -this.facing) { this.state = 'guard'; this.vz = mv * ch.speed * 0.45; }
    else { this.state = 'walk'; this.vz = mv * ch.speed; }
  } else if (st === 'air') {
    this.vz += mv * ch.speed * 3 * dt;
    const lim = ch.speed * 1.1; if (Math.abs(this.vz) > lim && Math.sign(this.vz) === mv) this.vz = Math.sign(this.vz) * lim;
  }
  // じょうたいごとの しょり
  if (this.state === 'atk') this.updAtk(dt, opp, env, grounded);
  else if (this.state === 'super') this.updSuper(dt, opp, env);
  else if (this.state === 'hit' || this.state === 'gstun') {
    this.stun -= dt;
    if (this.tumble) this.spin += dt * 11;
    if (this.stun <= 0 && grounded) { this.state = 'idle'; this.tumble = false; this.spin = 0; }
  } else if (this.state === 'down') { this.stun -= dt; if (this.stun <= 0) { this.state = 'getup'; this.stun = 0.35; } }
  else if (this.state === 'getup') { this.stun -= dt; if (this.stun <= 0) { this.state = 'idle'; this.inv = 0.45; } }
  else if (this.state === 'ko') { this.spin += dt * 9; }

  // うごく
  const wasAir = this.y > 0;
  const hang = this.state === 'super' && (this.phase === 'wind' || this.phase === 'dash') && this.ch.sup !== 'press';
  if (!(this.y <= 0 && this.onFloor() && this.vy <= 0) && !hang) this.vy -= env.g * dt;
  if (hang && this.y > 0) this.vy = 0;
  this.y += this.vy * dt;
  this.z += this.vz * dt;
  if (this.onFloor() && this.y < 0 && this.y > -0.9 && this.state !== 'ko') {
    this.y = 0;
    if (wasAir || this.vy < -0.5) this.land(env, opp);
    this.vy = 0;
  }
  // ゆかの まさつ と Gで ずるずる
  if (this.y <= 0 && this.onFloor()) {
    const walking = this.state === 'walk' || this.state === 'guard';
    const dashing = this.state === 'super' && this.phase === 'dash';
    if (!walking && !dashing && this.state !== 'atk') this.vz *= Math.exp(-7 * dt);
    if (this.state !== 'ko') this.z += env.slide * dt;
  }
  // じぶんからは おちない（とばされた ときだけ おちる）
  if (this.state !== 'hit' && this.state !== 'ko' && Math.abs(this.z) <= HALF + 0.01) {
    const L = HALF - 0.25; if (this.z > L) { this.z = L; if (this.vz > 0) this.vz = 0; } if (this.z < -L) { this.z = -L; if (this.vz < 0) this.vz = 0; }
  }
  if (this.y < -1.0 && this.state !== 'ko') this.startRingout(opp, env);
};

Fighter.prototype.land = function (env, opp) {
  if (this.state === 'hit' && this.tumble) { this.state = 'down'; this.stun = 0.55; this.tumble = false; this.spin = 0; this.vz *= 0.4; env.sfx('thud'); env.dust(this, 8); return; }
  if (this.state === 'atk' && this.move.air) { this.state = 'idle'; this.vz *= 0.3; env.sfx('land'); env.dust(this, 4); return; }
  if (this.state === 'super' && this.phase === 'slam') { this.phase = 'end'; this.at = 0; env.shock(this, opp); return; }
  if (this.state === 'air') { this.state = 'idle'; env.sfx('land'); env.dust(this, 3); }
};

Fighter.prototype.updAtk = function (dt, opp, env, grounded) {
  const m = this.move; this.at += dt;
  if (m.dive && this.at >= m.st && this.at - dt < m.st) { this.vy = Math.min(this.vy, -9); this.vz = this.facing * 8; }
  if (!m.air && this.at < m.st + m.ac) this.vz = this.facing * m.lunge;
  if (this.at >= m.st && this.at < m.st + m.ac) {
    if (!this.hitDone && this.checkHit(m, opp)) { this.hitDone = true; env.hit(this, opp, m); if (m.dive) { this.vy = 6; this.vz = -this.facing * 2; } }
  } else if (this.at >= m.st + m.ac) {
    if (!m.air) this.vz *= Math.exp(-10 * dt);
    if (this.buffer && grounded) { const b = this.buffer; this.buffer = null; this.startMove(b, env); return; }
    if (this.at >= m.st + m.ac + m.rc) { this.state = this.y > 0 ? 'air' : 'idle'; this.move = null; }
  }
};

Fighter.prototype.updSuper = function (dt, opp, env) {
  this.at += dt; const k = this.ch.sup;
  if (k === 'drill') {
    if (this.phase === 'wind') { this.vz = 0; if (this.at > 0.32) { this.phase = 'dash'; this.at = 0; env.sfx('whoosh'); } }
    else if (this.phase === 'dash') {
      this.vz = this.facing * 18;
      if (!this.hitDone && this.checkHit(SUPERS.drill, opp)) { this.hitDone = true; env.hit(this, opp, SUPERS.drill); }
      if (this.at > 0.5 || this.hitDone) { this.phase = 'end'; this.at = 0; this.vz *= 0.25; }
    } else if (this.at > 0.38) { this.state = this.y > 0 ? 'air' : 'idle'; this.airAtk = true; }
  } else if (k === 'press') {
    if (this.phase === 'wind') { this.vz = 0; if (this.at > 0.25) { this.phase = 'rise'; this.at = 0; this.vy = 12.5; this.y = Math.max(this.y, 0.01); this.vz = Math.max(-7, Math.min(7, (opp.z - this.z) / 1.3)); env.sfx('jump'); } }
    else if (this.phase === 'rise') { if (this.vy < 0 || this.at > 1.6) { this.phase = 'slam'; this.vy = -26; this.vz = 0; env.sfx('whoosh'); } }
    else if (this.phase === 'slam') { if (!this.hitDone && this.checkHit(SUPERS.press, opp)) { this.hitDone = true; env.hit(this, opp, SUPERS.press); } }
    else if (this.phase === 'end' && this.at > 0.45) { this.state = 'idle'; }
  } else {
    if (this.phase === 'wind') { this.vz = 0; if (this.at > 0.38) { this.phase = 'end'; this.at = 0; env.beam(this); } }
    else if (this.at > 0.45) { this.state = this.y > 0 ? 'air' : 'idle'; this.airAtk = true; }
  }
};

Fighter.prototype.startRingout = function (opp, env) {
  this.state = 'ringout'; this.tumble = false;
  this.ro = { t: 0, dir: Math.sign(this.z) || 1, side: Math.random() < 0.5 ? -1 : 1, sz: 0, sy: 0, sx: 0, tz: 0 };
  this.vy = 0; this.vz = 0;
  env.ringout(this);
};
Fighter.prototype.updRingout = function (dt, opp, env) {
  const r = this.ro; r.t += dt;
  if (r.t < 1.1 || this.hp <= 0) {           // ひゅーっと おちて うしろへ
    this.z += (r.dir * 1.5 - 13) * dt; this.y -= (2 + r.t * 14) * dt; this.x += r.side * 3 * dt; this.spin += dt * 8;
    if (this.hp <= 0) return;
    if (r.t >= 1.1) { r.sz = this.z; r.sy = this.y; r.sx = this.x; r.tz = opp.z > 0 ? -3 : 3; env.sfx('balloon'); }
  } else if (r.t < 2.7) {                    // ふうせんで もどってくる
    const k = (r.t - 1.1) / 1.6, e = 1 - Math.pow(1 - k, 3);
    this.z = r.sz + (r.tz - r.sz) * e; this.y = r.sy + (3.2 - r.sy) * e; this.x = r.sx * (1 - e); this.spin = 0;
    this.facing = opp.z > this.z ? 1 : -1;
  } else {
    this.state = 'air'; this.airAtk = true; this.vy = 0; this.vz = 0; this.x = 0; this.inv = 1.2; this.ro = null;
  }
};

// ---------- CPU ----------
const LEVELS = [
  { name: 'やさしい', react: 0.5, aggr: 0.35, guard: 0.08, dmg: 0.7, jump: 0.08 },
  { name: 'ふつう', react: 0.3, aggr: 0.6, guard: 0.3, dmg: 0.9, jump: 0.14 },
  { name: 'つよい', react: 0.16, aggr: 0.85, guard: 0.55, dmg: 1.05, jump: 0.2 },
];
function AI(lv) { this.lv = LEVELS[lv]; this.t = 0.6; this.move = 0; this.holdT = 0; this.combo = 0; this.inp = {}; this.airKick = false; }
AI.prototype.think = function (dt, me, op) {
  const L = this.lv, I = { left: false, right: false, punchP: false, kickP: false, jumpP: false, superP: false };
  const d = op.z - me.z, ad = Math.abs(d), dir = Math.sign(d) || 1;
  this.t -= dt; this.holdT -= dt;
  // れんぞく パンチ
  if (this.combo > 0 && me.state === 'atk' && me.move && me.move.next && me.at > me.move.st) { I.punchP = true; this.combo--; }
  // くうちゅうで けり
  if (me.state === 'air' && !me.airAtk && this.airKick && ad < 2.6 && me.vy < 2) { I.kickP = true; this.airKick = false; }
  if (this.t <= 0) {
    this.t = L.react * (0.6 + Math.random() * 0.8);
    this.move = 0;
    const threat = (op.state === 'atk' || (op.state === 'super')) && ad < 2.4;
    const cornered = Math.abs(me.z) > HALF - 1.6 && Math.sign(me.z) === -dir;
    if (threat && Math.random() < L.guard) { this.move = -dir; this.holdT = 0.45; }
    else if (me.sp >= 100 && Math.random() < 0.5 * L.aggr + 0.2 && ((me.ch.sup === 'beam' && ad < 9) || (me.ch.sup === 'drill' && ad < 6.5) || (me.ch.sup === 'press' && ad < 5.5))) I.superP = true;
    else if (cornered && Math.random() < 0.45) { I.jumpP = true; this.move = dir; this.holdT = 0.6; this.airKick = false; }
    else if (ad > 1.55) {
      this.move = dir; this.holdT = 0.3;
      if (Math.random() < L.jump && ad < 4.5) { I.jumpP = true; this.airKick = Math.random() < 0.7; }
    } else if (Math.random() < L.aggr) {
      if (Math.random() < 0.62) { I.punchP = true; this.combo = Math.random() < L.aggr ? 2 : (Math.random() < 0.5 ? 1 : 0); }
      else I.kickP = true;
    } else if (Math.random() < 0.4) { this.move = -dir; this.holdT = 0.3; }
  }
  if (this.holdT > 0 || this.move) {
    let m = this.move;
    // はしで さがりすぎない
    if (m && Math.abs(me.z) > HALF - 0.8 && Math.sign(me.z) === m && m !== dir && this.holdT < 0.2) m = 0;
    I.left = m < 0; I.right = m > 0;
  }
  return I;
};
