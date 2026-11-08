'use strict';
// てき の しゅるい。update(e, G, dt) の G は game.js が わたす どうぐばこ
//   G.P(うさぎ) G.D(むずかしさ) G.rnd G.dist G.faceTo G.move G.keep G.strafe G.shoot G.zone G.ring
//   G.say G.hurt G.burst G.spawn G.later G.snd G.draw G.M G.local G.t()

const ENEMY = {};
const ENEMY_ORDER = ['takenoko', 'heishi', 'kani', 'ishitsukuri', 'kuramochi', 'abe', 'ootomo', 'isonokami', 'tsukai', 'kaguya'];

// うさぎの むね に むかう はやさ
function aimV(G, from, spd, spread) {
  const P = G.P, d = V3.norm([P.x - from[0], P.y + 0.8 - from[1], P.z - from[2]]);
  if (!spread) return V3.mul(d, spd);
  const a = Math.atan2(d[0], d[2]) + spread, h = Math.hypot(d[0], d[2]);
  return V3.mul([Math.sin(a) * h, d[1], Math.cos(a) * h], spd);
}

// ---------------- 1. たけのこ へい ----------------
ENEMY.takenoko = {
  name: 'たけのこ へい', emoji: '🎋', hp: 2, r: 0.7, h: 2.1, mesh: 'takenoko', stomp: true,
  desc: 'かぐやひめの けらい。いつも げんき いっぱいで、ぶるぶる ためてから まっすぐ とっしん してくる。',
  weak: 'あたまを ふみつけ！ とっしんは よこに よけよう',
  intro: ['にょきっ！ たけのこ へい さんじょう！', 'にょきにょき〜！ まけないぞ〜！', 'たけのこ ぱわー！'],
  hurt: ['にょっ！', 'いてて…'], bye: 'にょ〜ん…',
  init(e) { e.st = 'walk'; },
  reset(e) { e.st = 'rest'; e.t = 0; e.wob = 0; },
  update(e, G, dt) {
    const P = G.P; e.cd -= dt;
    if (e.st === 'walk') {
      G.faceTo(e, P.x, P.z, dt, 6); G.move(e, P.x, P.z, 2.6 * G.D.spd, dt);
      if (G.dist(e) < 8 && e.cd <= 0) { e.st = 'wind'; e.t = 0; }
    } else if (e.st === 'wind') {
      e.t += dt; G.faceTo(e, P.x, P.z, dt, 10); e.wob = Math.sin(e.t * 50) * 0.12;
      if (e.t > 0.65) { e.st = 'dash'; e.t = 0; e.wob = 0; e.dx = Math.sin(e.face); e.dz = Math.cos(e.face); e.touchOn = true; G.snd.whoosh(); }
    } else if (e.st === 'dash') {
      e.t += dt; e.x += e.dx * 12 * G.D.spd * dt; e.z += e.dz * 12 * G.D.spd * dt;
      if (e.t > 0.5) { e.st = 'rest'; e.t = 0; e.touchOn = false; }
    } else {
      e.t += dt; if (e.t > 0.9) { e.st = 'walk'; e.cd = G.rnd(1.4, 2.6); }
    }
  },
};

// ---------------- 2. みかどの へいし ----------------
ENEMY.heishi = {
  name: 'みかどの へいし', emoji: '🏹', hp: 4, r: 0.7, h: 2.3, mesh: 'heishi', stomp: true,
  desc: 'みかどの めいれいで やってきた ゆみの へいたい。とおくから やを うつけど、ちかづくと「ひえ〜」と にげだす。',
  weak: 'ちかづいて きねで ぺったん。や は バリアで はねかえせる',
  intro: ['みかどの めいれいで あります！ うつぞ〜！', 'ゆみの めいじん、さんじょう で あります！'],
  hurt: ['ひえっ！', 'たいちょう〜！'], bye: 'ていさつ しっぱい で あります〜',
  init(e) { e.st = 'move'; e.sd = Math.random() < 0.5 ? 1 : -1; },
  reset(e) { e.st = 'move'; },
  update(e, G, dt) {
    const P = G.P, d = G.dist(e); e.cd -= dt;
    if (e.st === 'aim') {
      e.t += dt; if (e.t < 0.65) G.faceTo(e, P.x, P.z, dt, 8);
      if (e.t > 0.85) { e.st = 'shoot'; e.t = 0; e.n = 0; }
      return;
    }
    if (e.st === 'shoot') {
      e.t += dt;
      if (e.n < 3 && e.t > e.n * 0.18) {
        const o = G.local(e, -0.3, 1.4, 0.6), dist = Math.max(1, d);
        const v = V3.mul(V3.norm([Math.sin(e.face), (P.y + 0.8 - o[1]) / dist, Math.cos(e.face)]), 16 * G.D.spd);
        G.shoot({ kind: 'arrow', x: o[0], y: o[1], z: o[2], v, r: 0.35, max: 3 });
        e.n++; G.snd.arrow();
      }
      if (e.t > 0.7) { e.st = 'move'; e.cd = G.rnd(2, 3) * G.D.cd; }
      return;
    }
    G.faceTo(e, P.x, P.z, dt, 6);
    if (d < 6) {
      if (!e.panic) { e.panic = true; G.say(e, 'ひえ〜！ ちかよらないで ほしい で あります！', 1.6); }
      G.keep(e, 14, 99, 4.2 * G.D.spd, dt);
    } else {
      e.panic = false; G.keep(e, 10, 15, 3 * G.D.spd, dt); G.strafe(e, e.sd, 1.2, dt);
    }
    if (e.cd <= 0 && d > 4) { e.st = 'aim'; e.t = 0; G.snd.draw(); }
  },
  extra(e, G) { // ねらいの せん
    if (e.st !== 'aim') return;
    const len = 14, a = e.face;
    G.draw('cube', TM(e.x + Math.sin(a) * len / 2, 0.2, e.z + Math.cos(a) * len / 2, 0.14, 0.04, len, a), [1, 0.2, 0.2], 1);
  },
};

// ---------------- 3. つきの かに ----------------
ENEMY.kani = {
  name: 'つきの かに', emoji: '🦀', hp: 6, r: 1.0, h: 1.4, mesh: 'kani', stomp: true,
  desc: '「つきの もようは かにだよ！」と いいはる かに。よこあるきが とくいで、あわを ぷくぷく とばす。',
  weak: 'こうらを ふみつけると ひっくりかえって ダメージ 2ばい',
  intro: ['カニカニ〜♪ つきの もようは わたしだよ！', 'チョキチョキ、じゃま するよ〜'],
  hurt: ['カニッ！', 'あわわ'], bye: 'ぶくぶく… カニ〜',
  init(e) { e.st = 'side'; e.sd = 1; e.swap = 2; e.claw = 0; },
  reset(e) { e.st = 'side'; e.claw = 0; },
  weakMul(e) { return e.flipT > 0 ? 2 : 1; },
  onStomp(e, G) { e.stun = 2.5; e.flipT = 2.5; G.say(e, 'ひっくりかえった〜！ おきられない〜', 1.6); },
  update(e, G, dt) {
    const P = G.P, d = G.dist(e); e.cd -= dt;
    G.faceTo(e, P.x, P.z, dt, 8);
    if (e.st === 'pinch') {
      e.t += dt; e.claw = Math.min(1, e.t / 0.5);
      if (e.t > 0.55 && !e.done) {
        e.done = true; e.claw = -0.3; G.snd.snap();
        const a = Math.atan2(P.x - e.x, P.z - e.z) - e.face;
        if (d < 2.8 && Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 1.0 && P.y < 1.5) G.hurt([e.x, 0, e.z]);
      }
      if (e.t > 0.9) { e.st = 'side'; e.claw = 0; e.cd = G.rnd(1.5, 2.5) * G.D.cd; }
      return;
    }
    if (e.st === 'bubble') {
      e.t += dt;
      if (e.t > 0.4 && !e.done) {
        e.done = true; G.snd.bubble();
        const o = G.local(e, 0, 0.8, 0.9);
        for (let i = 0; i < 6; i++) {
          const v = aimV(G, o, 3.6 * G.D.spd, (i - 2.5) * 0.22);
          v[1] = 0.6;
          G.shoot({ kind: 'bubble', x: o[0], y: o[1], z: o[2], v, r: 0.4, max: 3.4, float: true });
        }
      }
      if (e.t > 0.8) { e.st = 'side'; e.cd = G.rnd(1.8, 2.8) * G.D.cd; }
      return;
    }
    e.swap -= dt; if (e.swap <= 0) { e.sd *= -1; e.swap = G.rnd(1.2, 2.5); }
    G.strafe(e, e.sd, 5 * G.D.spd, dt); G.keep(e, 3, 6.5, 3, dt);
    if (e.cd <= 0) {
      e.st = d < 4 ? 'pinch' : 'bubble'; e.t = 0; e.done = false;
      if (e.st === 'pinch') G.say(e, 'チョッキン するよ〜', 1.1);
    }
  },
  extra(e, G, s) {
    if (e.flipT > 0) return;
    for (const sd of [-1, 1]) {
      const m = M4.ident(); M4.translate(m, e.x, e.y, e.z); M4.rotY(m, e.face);
      M4.translate(m, sd * 0.95, 0.65, 0.5); M4.rotX(m, -(e.claw || 0) * 1.1 + Math.sin(G.t() * 4 + sd) * 0.08); M4.rotY(m, sd * 0.35);
      M4.scale(m, s, s, s);
      G.draw(G.M.claw, m, e.flash > 0 ? [2, 2, 2] : null, 0);
    }
  },
};

// ---------------- 4. いしづくりの みこ ----------------
const SMALL_SHOTS = ['dango', 'air3', 'refl'];
ENEMY.ishitsukuri = {
  name: 'いしづくりの みこ', emoji: '🥣', hp: 6, r: 0.8, h: 2.9, mesh: 'ishitsukuri',
  desc: '「ほとけさまの いしの はち」を もってきた いばりんぼの おうじ。…でも ほんとうは にせもの。はちを たてに する。',
  weak: 'まえから なげた だんごは はちで ふせがれる。うしろから なげるか、きねで たたこう。はちを なげたら チャンス！',
  intro: ['この はちは ほとけさまの はち… の にせもの じゃ！ かたいぞ！', 'えっへん！ わしの はちは びくとも せん！'],
  hurt: ['むむっ！', 'はちが…！'], bye: 'はちを すてて にげるのじゃ〜（はじを すてる）',
  init(e) { e.st = 'walk'; e.bowl = true; e.bowlT = 0; },
  reset(e) { if (e.st === 'throw') e.st = 'walk'; },
  guard(e, src, kind) {
    if (!e.bowl || !SMALL_SHOTS.includes(kind)) return false;
    const a = Math.atan2(src[0] - e.x, src[2] - e.z) - e.face;
    return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 1.3;
  },
  update(e, G, dt) {
    const P = G.P; e.cd -= dt;
    G.faceTo(e, P.x, P.z, dt, 3);
    if (!e.bowl) { e.bowlT -= dt; if (e.bowlT <= 0) { e.bowl = true; G.say(e, 'ふっふっふ、はちが もどって きたぞ', 1.4); } }
    if (e.st === 'throw') {
      e.t += dt;
      if (e.t > 0.7) {
        e.bowl = false; e.bowlT = 3.5; e.st = 'walk'; e.cd = G.rnd(4, 5.5) * G.D.cd;
        const dx = P.x - e.x, dz = P.z - e.z, l = Math.hypot(dx, dz) || 1, sp = 9 * G.D.spd;
        G.shoot({ kind: 'bowl', x: e.x + dx / l, y: 0.75, z: e.z + dz / l, v: [dx / l * sp, 0, dz / l * sp], r: 0.85, ground: true, reflect: false, max: 4 });
        G.snd.roll(); G.say(e, 'ころころ〜 はち アタック！ ジャンプで よけられるかな？', 1.6);
      }
      return;
    }
    G.keep(e, 5, 9, 1.8 * G.D.spd, dt);
    if (e.cd <= 0 && e.bowl) { e.st = 'throw'; e.t = 0; }
  },
  extra(e, G, s) {
    if (!e.bowl) return;
    const up = e.st === 'throw' ? Math.min(1, e.t / 0.5) : 0;
    const p = G.local(e, 0, 1.3 + up * 1.6, 0.85 - up * 0.6);
    G.draw(G.M.bowl, TM(p[0], p[1], p[2], 0.85 * s, 0.85 * s, 0.85 * s, e.face, Math.PI / 2 * (1 - up)), e.flash > 0 ? [2, 2, 2] : null, 0);
  },
};

// ---------------- 5. くらもちの みこ ----------------
ENEMY.kuramochi = {
  name: 'くらもちの みこ', emoji: '🌸', hp: 5, r: 0.8, h: 2.9, mesh: 'kuramochi',
  desc: '「ほうらいの たまの えだ」を もつ おうじ。じつは しょくにんに つくらせた つくりもの。にせものの ぶんしんを だして まどわせる。',
  weak: 'ぶんしんは 1かい あてると きえる。ほんものを みきわめよう',
  intro: ['ほうらいの たまの えだ… ほんもの だよ？ たぶん！', 'きらきら〜 うつくしいだろう？'],
  hurt: ['あいたっ', 'えだが おれる〜'], bye: 'しょくにんさんに おかね はらってない の ばれた〜',
  init(e) { e.st = 'idle'; e.tp = 3.5; e.sd = Math.random() < 0.5 ? 1 : -1; },
  update(e, G, dt) {
    const P = G.P; e.cd -= dt; e.tp -= dt;
    G.faceTo(e, P.x, P.z, dt, 6);
    G.strafe(e, e.sd, 1.5, dt); G.keep(e, 6, 12, 2.5, dt);
    if (e.tp <= 0 && !e.clone) {
      e.tp = G.rnd(3.5, 5);
      G.burst([e.x, 1.5, e.z], 14, [[1, 0.8, 1], [1, 1, 0.6]], 4, 0.25, 0);
      for (let i = 0; i < 8; i++) {
        const a = G.rnd(0, Math.PI * 2), r = G.rnd(7, 12), x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
        if (Math.hypot(x, z) < G.ARENA - 2) { e.x = x; e.z = z; break; }
      }
      e.spawn = 0.4; G.snd.tp();
      const clones = G.en().filter((c) => c.clone && !c.dead).length;
      if (e.hp < e.maxHp * 0.9 && clones < 2) {
        for (let i = 0; i < 2 - clones; i++) {
          const a = G.rnd(0, Math.PI * 2);
          G.spawn('kuramochi', e.x + Math.cos(a) * 4, e.z + Math.sin(a) * 4, { clone: true, hp: 1, quiet: true });
        }
        G.say(e, 'どれが ほんものか わかるかな〜？', 1.8);
      }
    }
    if (e.cd <= 0) {
      e.cd = G.rnd(2.2, 3.2) * G.D.cd * (e.clone ? 1.7 : 1);
      const o = G.local(e, 0.9, 2.1, 0.4), n = e.clone ? 1 : 5;
      const cols = [[1, 0.42, 0.42], [0.45, 0.75, 0.99], [1, 0.83, 0.23], [0.41, 0.86, 0.49], [0.97, 0.51, 0.67]];
      for (let i = 0; i < n; i++) G.shoot({ kind: 'jewel', x: o[0], y: o[1], z: o[2], v: aimV(G, o, 7 * G.D.spd, (i - (n - 1) / 2) * 0.28), r: 0.4, max: 4, col: cols[i % 5] });
      G.snd.orb();
    }
  },
};

// ---------------- 6. あべの みうし ----------------
ENEMY.abe = {
  name: 'あべの みうし', emoji: '🔥', hp: 6, r: 0.95, h: 2.9, mesh: 'abe',
  desc: '「もえない ひねずみの かわごろも」を じまんする おかねもち。はしると ほのおの あしあとが のこる。',
  weak: '3かい あてると かわごろもが もえて あわてだす。その あいだ ダメージ 2ばい',
  intro: ['ひねずみの かわごろもは もえないのだ！ おかねで かった！', 'おかねもちの おとおり だ〜！'],
  hurt: ['おっと！', 'こばんが〜'], bye: 'かわごろも、もえちゃった…',
  init(e) { e.st = 'run'; e.sd = 1; e.fireT = 0; e.hits = 0; e.burn = 0; },
  reset(e) { if (e.st === 'charge' || e.st === 'wind') { e.st = 'run'; e.wob = 0; } },
  weakMul(e) { return e.burn > 0 ? 2 : 1; },
  onHit(e, G) {
    e.hits++;
    if (e.hits % 3 === 0 && e.burn <= 0) { e.burn = 3.5; e.st = 'burn'; e.touchOn = false; G.say(e, 'あちちちっ！ もえない はず じゃ なかったのか〜！', 2); G.snd.fire(); }
  },
  update(e, G, dt) {
    const P = G.P; e.cd -= dt;
    if (e.burn > 0) {
      e.burn -= dt; e.face += Math.sin(G.t() * 3 + e.id) * dt * 4;
      e.x += Math.sin(e.face) * 5 * dt; e.z += Math.cos(e.face) * 5 * dt;
      if (Math.random() < dt * 20) G.burst(G.local(e, 0, 1.6, -0.6), 1, [[1, 0.55, 0.1], [1, 0.85, 0.2]], 2, 0.3, -2);
      if (e.burn <= 0) e.st = 'run';
      return;
    }
    if (e.st === 'wind') {
      e.t += dt; G.faceTo(e, P.x, P.z, dt, 10); e.wob = Math.sin(e.t * 40) * 0.1;
      if (e.t > 0.6) { e.st = 'charge'; e.t = 0; e.wob = 0; e.dx = Math.sin(e.face); e.dz = Math.cos(e.face); e.touchOn = true; G.snd.whoosh(); }
      return;
    }
    if (e.st === 'charge') {
      e.t += dt; e.x += e.dx * 11 * G.D.spd * dt; e.z += e.dz * 11 * G.D.spd * dt;
      e.fireT -= dt; if (e.fireT <= 0) { e.fireT = 0.12; G.zone({ kind: 'fire', x: e.x, z: e.z, r: 0.85, act: 3 }); }
      if (e.t > 0.7) { e.st = 'run'; e.touchOn = false; e.cd = G.rnd(3, 4.5) * G.D.cd; }
      return;
    }
    const ox = e.x, oz = e.z;
    if (Math.random() < dt * 0.4) e.sd *= -1;
    G.strafe(e, e.sd, 4.5 * G.D.spd, dt); G.keep(e, 6, 9, 3, dt);
    G.faceTo(e, e.x + (e.x - ox) * 10, e.z + (e.z - oz) * 10, dt, 8);
    e.fireT -= dt; if (e.fireT <= 0) { e.fireT = 0.3; G.zone({ kind: 'fire', x: e.x, z: e.z, r: 0.85, act: 3 }); }
    if (e.cd <= 0) { e.st = 'wind'; e.t = 0; G.say(e, 'おかねもちの たいあたり〜！', 1.3); }
  },
};

// ---------------- 7. おおともの みゆき ----------------
ENEMY.ootomo = {
  name: 'おおともの みゆき', emoji: '🐉', hp: 7, r: 0.85, h: 2.9, mesh: 'ootomo',
  desc: '「りゅうの くびの たま」を ねらう いさましい たいしょう。りゅうを よんで かみなりを おとす。でも すぐ ふなよいする。',
  weak: 'かみなりの あとは ふらふら。その あいだ ダメージ 2ばい',
  intro: ['りゅうの くびの たまを とってくるぞ！ …うっぷ', 'わしこそ ゆうかんな だいなごん！'],
  hurt: ['ぬおっ！', 'まだまだ！'], bye: 'ふね… こりごり じゃ…',
  init(e) { e.st = 'walk'; e.raise = 0; },
  reset(e) { if (e.st === 'summon' && !e.done) { e.st = 'walk'; e.raise = 0; } },
  weakMul(e) { return e.st === 'dizzy' ? 2 : 1; },
  update(e, G, dt) {
    const P = G.P; e.cd -= dt;
    if (e.st === 'dizzy') {
      e.t += dt; e.wob = Math.sin(e.t * 6) * 0.25;
      if (Math.random() < dt * 3) G.burst(G.local(e, 0, 3.1, 0), 1, [[0.6, 0.9, 0.6]], 1, 0.2, -1);
      if (e.t > 2.6) { e.st = 'walk'; e.wob = 0; }
      return;
    }
    if (e.st === 'summon') {
      e.t += dt; e.raise = Math.min(1, e.t / 0.4);
      if (e.t > 0.8 && !e.done) {
        e.done = true; G.snd.warn();
        G.zone({ kind: 'thunder', x: P.x, z: P.z, r: 1.4, warn: G.D.warn, act: 0.35 });
        for (let i = 0; i < 2; i++) { const a = G.rnd(0, Math.PI * 2), r = G.rnd(2.5, 4.5); G.zone({ kind: 'thunder', x: P.x + Math.cos(a) * r, z: P.z + Math.sin(a) * r, r: 1.4, warn: G.D.warn + 0.3, act: 0.35 }); }
      }
      if (e.t > 0.8 + G.D.warn + 0.7) { e.st = 'dizzy'; e.t = 0; e.raise = 0; G.say(e, 'うっぷ… ふなよい しそう…', 1.8); }
      return;
    }
    G.faceTo(e, P.x, P.z, dt, 4); G.keep(e, 7, 11, 2 * G.D.spd, dt); G.strafe(e, 1, 1, dt);
    if (e.cd <= 0) { e.st = 'summon'; e.t = 0; e.done = false; e.cd = G.rnd(4.5, 6) * G.D.cd; G.say(e, 'りゅうよ、かみなりを〜！', 1.4); }
  },
  extra(e, G, s) {
    const t = G.t(), p = G.local(e, -0.72, 2.9 + (e.raise || 0) * 0.5, 0.3);
    const c = [0.5 + 0.5 * Math.sin(t * 3), 0.5 + 0.5 * Math.sin(t * 3 + 2), 0.5 + 0.5 * Math.sin(t * 3 + 4)];
    const js = (0.45 + (e.raise || 0) * 0.35) * s;
    G.draw('sphere', TM(p[0], p[1], p[2], js, js, js), c, 1);
    for (let i = 0; i < 7; i++) { // ちいさな りゅう
      const a = t * 1.8 - i * 0.32, r = 1.7 * s, sz = (i === 0 ? 0.5 : 0.38 - i * 0.03) * s;
      G.draw('sphere', TM(e.x + Math.cos(a) * r, e.y + 2.4 + Math.sin(a * 2) * 0.3, e.z + Math.sin(a) * r, sz, sz, sz), i === 0 ? [0.3, 0.75, 0.4] : [0.2, 0.6, 0.3], 0.2);
    }
  },
};

// ---------------- 8. いそのかみの まろたり ----------------
ENEMY.isonokami = {
  name: 'いそのかみの まろたり', emoji: '🐦', hp: 5, r: 0.85, h: 2.7, mesh: 'isonokami', fly: true, flyY: 5.2,
  desc: '「つばめの こやすがい」を とるため、かごに のって そらに ぶらさがって いる おうじ。つばめたちを けしかけて くる。',
  weak: 'つづけて 2かい あてると かごから おっこちる。おちたら きねで ぺったん！（ダメージ 2ばい）',
  intro: ['つばめの こやすがい、とったどー！ …あっ ちがった', 'たかい ところから しつれい！'],
  hurt: ['ゆれる〜！', 'わわっ'], bye: 'こしを うった… もう こりごり',
  init(e) { e.st = 'fly'; e.streak = 0; e.streakT = 0; e.y = 5.2; },
  weakMul(e) { return e.st === 'fallen' ? 2 : 1; },
  onHit(e, G) {
    if (e.st !== 'fly') return;
    e.streak++; e.streakT = 2.5;
    if (e.streak >= 2) { e.st = 'falling'; e.vy = 0; e.streak = 0; G.say(e, 'あ〜れ〜！ おちる〜！', 1.8); G.snd.fall(); }
  },
  update(e, G, dt) {
    const P = G.P; e.cd -= dt; e.streakT -= dt; if (e.streakT <= 0) e.streak = 0;
    if (e.st === 'falling') {
      e.vy -= 15 * dt; e.y += e.vy * dt;
      if (e.y <= 0) { e.y = 0; e.vy = 0; e.st = 'fallen'; e.t = 0; G.burst([e.x, 0.3, e.z], 12, [[0.7, 0.7, 0.75]], 4, 0.3); G.snd.thud(); }
      return;
    }
    if (e.st === 'fallen') { e.t += dt; e.wob = Math.sin(e.t * 3) * 0.08; if (e.t > 3.5) { e.st = 'rise'; e.wob = 0; } return; }
    if (e.st === 'rise') {
      e.y += 3 * dt;
      if (e.y >= 5.2) { e.y = 5.2; e.st = 'fly'; G.say(e, 'こんどこそ こやすがいを…！', 1.4); }
      return;
    }
    e.y = 5.2 + Math.sin(G.t() * 1.5 + e.id) * 0.3;
    G.faceTo(e, P.x, P.z, dt, 4); G.keep(e, 6, 11, 2.2 * G.D.spd, dt); G.strafe(e, 1, 1.4, dt);
    if (e.cd <= 0) {
      e.cd = G.rnd(2.6, 3.6) * G.D.cd;
      for (let i = 0; i < 3; i++) {
        const a = e.face + (i - 1) * 1.1;
        G.shoot({ kind: 'swallow', x: e.x, y: e.y + 1.5, z: e.z, v: [Math.sin(a) * 6, 2, Math.cos(a) * 6], home: 1.3, turn: 4, spd: 9 * G.D.spd, r: 0.45, max: 4.5 });
      }
      G.snd.chirp(); if (Math.random() < 0.4) G.say(e, 'つばめさん、たのんだ！', 1.2);
    }
  },
  extra(e, G) {
    if (e.st === 'fly' || e.st === 'rise') G.draw('cyl', TM(e.x, e.y + 2.9 + 15, e.z, 0.06, 30, 0.06), [0.79, 0.65, 0.49], 0);
    if (e.st === 'fly') for (let i = 0; i < 2; i++) { // まわりを とぶ つばめ
      const a = G.t() * 2.5 + i * Math.PI, p = [e.x + Math.cos(a) * 1.8, e.y + 2.5, e.z + Math.sin(a) * 1.8];
      G.draw(G.M.swallow, orientZ(p, [-Math.sin(a), 0, Math.cos(a)], 0.8), null, 0);
    }
  },
};

// ---------------- 9. つきの つかい ----------------
ENEMY.tsukai = {
  name: 'つきの つかい', emoji: '☁️', hp: 8, r: 0.9, h: 2.9, mesh: 'tsukai', fly: true, flyY: 3.4,
  desc: 'かぐやひめを むかえに くもに のって やってきた てんにん。おっとり しているけど、ひかりの やと ねむりの たまを つかう。',
  weak: 'むらさきの たまに あたると ねむくなる（おそくなる）。ダッシュで よけるか バリアで はねかえそう',
  intro: ['かぐやさまを おむかえに まいりました。じゃまを しないで… ね？', 'つきの みやこから ごあいさつ に まいりました'],
  hurt: ['まあ、らんぼうな…', 'あらあら'], bye: 'つきへ かえります… ごきげんよう',
  init(e) { e.st = ''; e.sd = Math.random() < 0.5 ? 1 : -1; e.n = 0; e.y = 3.4; },
  reset(e) { e.st = ''; e.glow = 0; },
  update(e, G, dt) {
    const P = G.P; e.cd -= dt;
    e.y = 3.4 + Math.sin(G.t() * 1.3 + e.id) * 0.4;
    G.faceTo(e, P.x, P.z, dt, 4); G.keep(e, 9, 13, 2.4 * G.D.spd, dt); G.strafe(e, e.sd, 1.6, dt);
    if (e.st === 'cast') {
      e.t += dt; e.glow = Math.min(1, e.t / 0.6);
      if (e.t > 0.6) {
        e.st = ''; e.glow = 0;
        const o = G.local(e, 0, 1.9, 0.8);
        if (e.next === 'sleep') {
          G.shoot({ kind: 'sleep', x: o[0], y: o[1], z: o[2], v: aimV(G, o, 4.5), r: 0.7, effect: 'sleep', max: 6, home: 3, turn: 1.2, spd: 4.5 });
          G.say(e, 'ねんね しましょうね…', 1.4); G.snd.sleep();
        } else {
          for (let i = 0; i < 3; i++) G.shoot({ kind: 'larrow', x: o[0], y: o[1], z: o[2], v: aimV(G, o, 9, (i - 1) * 0.5), home: 1.0, turn: 3, spd: 11 * G.D.spd, r: 0.35, max: 4 });
          G.snd.orb();
        }
      }
      return;
    }
    if (e.cd <= 0) { e.st = 'cast'; e.t = 0; e.n++; e.next = e.n % 3 === 0 ? 'sleep' : 'arrow'; e.cd = G.rnd(2.4, 3.2) * G.D.cd; }
  },
  extra(e, G) {
    if (!e.glow) return;
    const p = G.local(e, 0, 1.9, 0.8), s = 0.3 + e.glow * 0.5;
    G.draw('sphere', TM(p[0], p[1], p[2], s, s, s), e.next === 'sleep' ? [0.75, 0.55, 1] : [1, 1, 0.7], 1);
  },
};

// ---------------- ボス: かぐやひめ ----------------
ENEMY.kaguya = {
  name: 'かぐやひめ', emoji: '👸', hp: 26, r: 1.6, h: 3.4, mesh: 'kaguya', fly: true, flyY: 3, boss: true,
  desc: 'たけから うまれた つきの おひめさま。つきの おだんごを ひとりじめ しようと している。ひかりの たま・たけのこ・つきの わ を つかう。',
  weak: 'わっかは ジャンプ、あかい まるからは にげる。うかんでいるので きねは ジャンプして あてよう',
  intro: ['おほほ… わたくしが あいてを して さしあげますわ！'],
  hurt: ['きゃっ！', 'おもちで べたべた〜！', 'あら、やりますわね', 'もう！ にがしませんわ'], bye: '',
  init(e, G) { e.intro = true; e.y = 14; e.atkT = 3; e.phase = 1; e.last = ''; e.tx = e.x; e.tz = e.z; e.ty = 3; e.moveT = 2; e.charge = 0; e.n = 0; },
  onHit(e, G) {
    if (e.phase === 1 && e.hp <= e.maxHp / 2) {
      e.phase = 2; e.atkT = 2.2;
      G.snd.phase(); G.snd.setFast(true);
      G.say(e, 'まあ！ ほんきを だしますわよ！', 2.6);
      G.burst([e.x, e.y + 1.6, e.z], 30, [[1, 0.95, 0.6], [1, 1, 1]], 9, 0.25, 0);
    }
  },
  update(e, G, dt) {
    const P = G.P;
    e.charge = Math.max(0, e.charge - dt);
    G.faceTo(e, P.x, P.z);
    if (e.intro) {
      e.y += (3 - e.y) * (1 - Math.exp(-dt * 2.2));
      if (Math.abs(e.y - 3) < 0.15) { e.intro = false; G.bossReady(); }
      return;
    }
    e.moveT -= dt;
    const dx = e.tx - e.x, dz = e.tz - e.z, dl = Math.hypot(dx, dz);
    if (e.moveT <= 0 || dl < 0.5) {
      for (let i = 0; i < 8; i++) {
        const a = G.rnd(0, Math.PI * 2), d = G.rnd(5, 15), x = Math.cos(a) * d, z = Math.sin(a) * d;
        e.tx = x; e.tz = z; if (Math.hypot(x - P.x, z - P.z) > 7) break;
      }
      e.ty = G.rnd(2.6, 4.2); e.moveT = G.rnd(2.5, 4.5);
    }
    const spd = e.phase === 2 ? 4.2 : 2.8;
    if (dl > 0.01) { const s = Math.min(dl, spd * dt); e.x += dx / dl * s; e.z += dz / dl * s; }
    e.y += (e.ty + Math.sin(G.t() * 1.8) * 0.3 - e.y) * (1 - Math.exp(-dt * 2));
    e.atkT -= dt;
    if (e.atkT <= 0) kaguyaAttack(e, G);
  },
  extra(e, G) {
    if (e.charge <= 0) return;
    const s = 0.4 + (0.6 - e.charge) * 1.6, p = G.local(e, 0, 2.0, 1.0);
    G.draw('sphere', TM(p[0], p[1], p[2], s, s, s), [1, 0.95, 0.55], 1);
  },
};
function kaguyaAttack(e, G) {
  const P = G.P, ph2 = e.phase === 2;
  e.n++;
  if (ph2 && e.n % 3 === 0) { // けらいを よぶ
    G.say(e, 'たけのこ へいたち、おいでなさい！', 1.6);
    for (let i = 0; i < 2; i++) { const a = G.rnd(0, Math.PI * 2); G.spawn('takenoko', P.x + Math.cos(a) * 9, P.z + Math.sin(a) * 9, { quiet: true, minion: true }); }
    e.atkT = 3 * G.D.cd; return;
  }
  const list = ['orb', 'bamboo', 'ring'].filter((a) => a !== e.last);
  const a = list[Math.floor(Math.random() * list.length)];
  e.last = a;
  if (a === 'orb') {
    G.say(e, ph2 ? 'ひかりの たま、たくさん！' : 'ひかりの たま！', 1.4);
    for (let v = 0; v < (ph2 ? 2 : 1); v++) {
      G.later(e, v * 0.9, () => { e.charge = 0.55; });
      G.later(e, v * 0.9 + 0.55, () => {
        const o = G.local(e, 0, 1.9, 0.6), n = ph2 ? 5 : 3;
        for (let i = 0; i < n; i++) G.shoot({ kind: 'orb', x: o[0], y: o[1], z: o[2], v: aimV(G, o, G.D.orb, (i - (n - 1) / 2) * (ph2 ? 0.3 : 0.38)), r: 0.6, max: 6, low: true });
        G.snd.orb();
      });
    }
    e.atkT = (ph2 ? 2.6 : 3.0) * G.D.cd;
  } else if (a === 'bamboo') {
    G.say(e, 'たけのこ にょきにょき！', 1.4); G.hint('あかい まるから にげて！', 2);
    if (ph2) for (let i = 0; i < 4; i++) G.later(e, i * 0.55, () => G.zone({ kind: 'bamboo', x: P.x + P.vx * 0.3, z: P.z + P.vz * 0.3, r: 1.15, warn: G.D.warn, act: 1.4 }));
    else {
      G.zone({ kind: 'bamboo', x: P.x, z: P.z, r: 1.15, warn: G.D.warn, act: 1.4 });
      for (let i = 0; i < 2; i++) { const q = G.rnd(0, Math.PI * 2), d = G.rnd(2.5, 5); G.zone({ kind: 'bamboo', x: P.x + Math.cos(q) * d, z: P.z + Math.sin(q) * d, r: 1.15, warn: G.D.warn, act: 1.4 }); }
    }
    G.snd.warn();
    e.atkT = (ph2 ? 3.2 : 2.8) * G.D.cd;
  } else {
    G.say(e, 'つきの わ！', 1.4); G.hint('ひかる わっかは ジャンプで とびこえて！', 2.6);
    e.charge = 0.6;
    for (let i = 0; i < (ph2 ? 2 : 1); i++) G.later(e, 0.6 + i * 1.1, () => { G.ring(e.x, e.z); G.snd.ring(); });
    e.atkT = (ph2 ? 3.4 : 3.2) * G.D.cd;
  }
}
