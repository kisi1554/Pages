// やきゅう しあい — ルールと だきゅうの シミュレーション（がめんに かんけい しない じゅんすいな けいさん）
// node でも ブラウザ でも うごく（ブラウザでは window.YS）。
//
// ざひょう: ホームベースが (0,0)、y が センターの ほう、x が ライトの ほう（めーとる）。
// だきゅうの むき dir（ど）: 0 = センター、マイナス = レフト、プラス = ライト。±45 を こえたら ファウル。
(function (root) {
  "use strict";

  // ===== きほんの すうじ =====
  const BASE = 27.43;                       // るいかん
  const BASES = [{ x: 0, y: 0 }, { x: 19.4, y: 19.4 }, { x: 0, y: 38.8 }, { x: -19.4, y: 19.4 }];
  const POS_NAME = ["ピッチャー", "キャッチャー", "ファースト", "セカンド", "サード", "ショート", "レフト", "センター", "ライト"];
  const FIELD_POS = [
    { x: 0, y: 18.4 }, { x: 0, y: -1.5 }, { x: 21, y: 26 }, { x: 11, y: 38 }, { x: -21, y: 26 },
    { x: -11, y: 38 }, { x: -42, y: 80 }, { x: 0, y: 90 }, { x: 42, y: 80 },
  ];
  const FOUL_DEG = 45;
  const FENCE_H = 3.0;
  const GRAV = 9.8, TAU = 4.2, DEC = 3.6, Z0 = 0.9, CATCH_Z = 2.8, REACH = 1.3;
  const D2R = Math.PI / 180;
  // タイミングの ずれ（びょう）。バッティングセンターと おなじ かんがえかた:
  // ぴったり ≤ just、ヒット ≤ hit、ファウル ≤ foul、それより ずれたら からぶり
  const WIN = { just: 0.045, hit: 0.095, foul: 0.15 };
  const LEAD = 0.06;                        // タップしてから バットに あたるまで
  const PITCHES = {
    fast: { name: "まっすぐ", time: 1.0, brk: 0, sd: 0 },
    curve: { name: "カーブ", time: 1.17, brk: 0.7, sd: 0.08 },
    slow: { name: "スロー", time: 1.45, brk: 0, sd: -0.04 },
  };
  const CELL = [-0.68, 0, 0.68];

  function fenceDist(dir) { return 89 + 16 * Math.cos(2 * Math.min(Math.abs(dir), 45) * D2R); }

  // ===== らんすう =====
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const f = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (n) => Math.floor(f() * n);
    return f;
  }
  function gauss(r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // のうりょく → はやさ
  const runSpeed = (spd) => 7.3 + 0.45 * (spd - 1);
  const fieldSpeed = (spd) => 5.6 + 0.3 * (spd - 1);
  const throwSpeed = (arm) => 22 + 2.2 * (arm - 1);
  function throwTime(from, to, arm) {
    const d = dist(from, to);
    return (d / throwSpeed(arm)) * (1 + Math.max(0, d - 40) / 110);
  }

  // ===== しあいの じょうたい =====
  function newGame(opts) {
    const innings = opts && opts.innings || 9;
    const mk = () => Array.from({ length: 9 }, () => ({ ab: 0, h: 0, rbi: 0, hr: 0, bb: 0, so: 0, r: 0 }));
    return {
      innings, inning: 1, half: 0, outs: 0, balls: 0, strikes: 0,
      bases: [null, null, null],          // { p: だじゅんの ばんごう }
      line: [[], []], runs: [0, 0], hits: [0, 0], errors: [0, 0],
      order: [0, 0], stats: [mk(), mk()],
      over: false, winner: null, walkoff: false, halfOver: false,
    };
  }
  const batTeam = (st) => st.half;
  const fieldTeam = (st) => 1 - st.half;
  const batterIdx = (st) => st.order[st.half];
  function isWalkoff(st) { return st.half === 1 && st.inning >= st.innings && st.runs[1] > st.runs[0]; }

  // とくてんを いれる。サヨナラに なったら そこで やめる（ホームランは ぜんいん かえる）。
  // かえした かず を かえす。
  function addRuns(st, runners, opts) {
    const o = opts || {};
    const t = st.half;
    let n = 0;
    for (const rn of runners) {
      if (st.over) break;
      st.runs[t]++;
      st.line[t][st.inning - 1] = (st.line[t][st.inning - 1] || 0) + 1;
      if (rn && rn.p != null) st.stats[t][rn.p].r++;
      n++;
      if (isWalkoff(st) && !o.hr) { endGame(st, true); break; }
    }
    if (o.hr && isWalkoff(st)) endGame(st, true);
    return n;
  }
  function endGame(st, walkoff) {
    st.over = true;
    st.walkoff = !!walkoff;
    st.winner = st.runs[0] > st.runs[1] ? 0 : st.runs[1] > st.runs[0] ? 1 : -1;
  }
  // アウトを ふやす。3アウトで こうたい。
  function addOut(st, n) {
    st.outs += n == null ? 1 : n;
    if (st.outs >= 3) { st.outs = 3; endHalf(st); return true; }
    return false;
  }
  function endHalf(st) {
    const t = st.half;
    if (st.line[t][st.inning - 1] == null) st.line[t][st.inning - 1] = 0;
    st.halfOver = true;
    if (t === 0) {
      // さいしゅうかいの おもてで うらの チームが かっていたら うらは しない
      if (st.inning >= st.innings && st.runs[1] > st.runs[0]) { st.line[1][st.inning - 1] = "X"; endGame(st, false); return; }
      st.half = 1;
    } else {
      if (st.inning >= st.innings) { endGame(st, false); return; } // えんちょう なし（どうてんは ひきわけ）
      st.inning++; st.half = 0;
    }
    st.outs = 0; st.balls = 0; st.strikes = 0; st.bases = [null, null, null];
  }
  function nextBatter(st) {
    st.order[st.half] = (st.order[st.half] + 1) % 9;
    st.balls = 0; st.strikes = 0;
  }

  // フォースで すすめる（フォアボール）。おしだされた ランナーを かえす。
  function forceAdvance(bases, runner) {
    const b = bases.slice();
    const scored = [];
    if (b[0]) {
      if (b[1]) { if (b[2]) scored.push(b[2]); b[2] = b[1]; }
      b[1] = b[0];
    }
    b[0] = runner;
    return { bases: b, scored };
  }

  // 1きゅうごとの けっか（うたなかった・からぶり・ファウル）
  // kind: "ball" | "called" | "swing" | "foul" | "buntfoul"
  // かえす: "ball" | "strike" | "foul" | "walk" | "strikeout"
  function applyPitch(st, kind) {
    const t = st.half, p = batterIdx(st);
    if (kind === "ball") {
      st.balls++;
      if (st.balls >= 4) {
        const f = forceAdvance(st.bases, { p });
        st.bases = f.bases;
        st.stats[t][p].bb++;
        const n = addRuns(st, f.scored);
        st.stats[t][p].rbi += n;
        if (!st.over) nextBatter(st);
        return { ev: "walk", scored: n, pushIn: n > 0 };
      }
      return { ev: "ball" };
    }
    if (kind === "foul") {
      if (st.strikes < 2) st.strikes++;
      return { ev: "foul" };
    }
    // ストライク（みのがし・からぶり・2ストライクからの バントファウル）
    st.strikes++;
    if (st.strikes >= 3) {
      st.stats[t][p].so++; st.stats[t][p].ab++;
      nextBatter(st);
      addOut(st);
      return { ev: "strikeout", swing: kind !== "called", bunt: kind === "buntfoul" };
    }
    return { ev: "strike", swing: kind === "swing" };
  }

  // とうるい: from は 0(1るい) か 1(2るい)。safe なら すすむ、だめなら アウト。
  function stealTimes(st, from, runner, catcher, pitchTime) {
    const v = runSpeed(runner.spd);
    const runT = 0.25 + (BASE - 3.5) / v;
    const thr = pitchTime + 0.5 + throwTime(BASES[0], BASES[from + 2 > 3 ? 3 : from + 2], catcher.arm);
    return { runT, thr };
  }
  function applySteal(st, from, safe) {
    const rn = st.bases[from];
    if (!rn) return null;
    st.bases[from] = null;
    if (safe) { st.bases[from + 1] = rn; return { ev: "steal", safe: true }; }
    addOut(st);
    return { ev: "steal", safe: false };
  }

  // ===== なげる =====
  function cellTarget(cell) { return { x: CELL[cell % 3], y: CELL[2 - Math.floor(cell / 3)] }; }
  // baseTime: まっすぐが ホームに つくまでの びょう
  function makePitch(type, cell, pitcher, baseTime, r, ctrl) {
    const P = PITCHES[type] || PITCHES.fast;
    const tg = cellTarget(cell);
    const sd = (0.53 + (5 - pitcher.arm) * 0.035 + P.sd) * (ctrl == null ? 1 : ctrl);
    const x = tg.x + gauss(r) * sd, y = tg.y + gauss(r) * sd;
    const time = baseTime * P.time * (1.06 - 0.015 * pitcher.arm);
    return { type, cell, x, y, time, brk: P.brk, inZone: Math.abs(x) <= 1 && Math.abs(y) <= 1 };
  }
  // ボールの ときの かんじ（そとに どれくらい はずれたか）
  const outside = (pitch) => Math.max(0, Math.max(Math.abs(pitch.x), Math.abs(pitch.y)) - 1);

  // ===== うつ =====
  // swing: { dtn: タイミングの ずれ（せいきか ずみ、マイナス=はやい）, aim: -1(ひだり)〜1(みぎ), bunt }
  // かえす: { kind: "miss" | "foul" | "inplay", ball, q, just }
  function contact(pitch, swing, batter, r) {
    if (swing.bunt) {
      const p = (pitch.inZone ? 0.86 : 0.45) * (0.82 + 0.04 * batter.meet);
      if (r() > p) return r() < 0.55 ? { kind: "foul", bunt: true } : { kind: "miss", bunt: true };
      const dir = clamp(gauss(r) * 22 + (swing.aim || 0) * 15, -60, 60);
      return { kind: "inplay", bunt: true, q: 0.2, ball: { v: 7 + r() * 5, angle: -8 + r() * 10, dir } };
    }
    const meetF = 0.9 + 0.05 * batter.meet;
    const a = Math.abs(swing.dtn) / meetF + outside(pitch) * 0.06;
    if (a > WIN.foul) return { kind: "miss" };
    if (a > WIN.hit) {
      if (r() < 0.72) return { kind: "foul" };
      // かすった だきゅう: ファウルフライ か ぼてぼて
      const side = (swing.dtn < 0 ? -1 : 1);
      return { kind: "inplay", q: 0, ball: { v: 14 + r() * 14, angle: -10 + r() * 75, dir: side * (40 + r() * 30) } };
    }
    const q = 1 - a / WIN.hit;                 // 0〜1（1が ジャスト）
    if (q < 0.4 && r() < 0.3) return { kind: "foul" };   // かすって うしろへ
    const v = 21 + 21 * Math.pow(q, 0.8) + (batter.pow - 3) * 1.8 + gauss(r) * 2.5;
    let angle = 6 + 19 * q + gauss(r) * 14 + pitch.y * 5;
    if (q > 0.75) angle = 0.5 * angle + 0.5 * (24 + gauss(r) * 6);   // ジャストは いい かくど に なりやすい
    // はやい（dtn<0）→ ひっぱり（レフト）、おそい → ながし（ライト）。タップいちでも かわる
    const dir = swing.dtn * 300 + (swing.aim || 0) * 18 + gauss(r) * 9;
    return {
      kind: "inplay", q, just: a <= WIN.just,
      ball: { v: clamp(v, 10, 50), angle: clamp(angle, -15, 75), dir: clamp(dir, -85, 85) },
    };
  }

  // ===== だきゅうの とびかた =====
  function prepBall(b) {
    const a = b.angle * D2R, th = b.dir * D2R;
    const vh = b.v * Math.cos(a), vz = b.v * Math.sin(a);
    const fair = Math.abs(b.dir) <= FOUL_DEG;
    const fd = fenceDist(b.dir);
    const sAir = (t) => vh * TAU * (1 - Math.exp(-t / TAU));
    let T = (vz + Math.sqrt(vz * vz + 2 * GRAV * Z0)) / GRAV;
    let hr = false, wall = false, sT, vg0;
    if (fair && sAir(T) >= fd) {
      const tf = -TAU * Math.log(1 - fd / (vh * TAU));
      const zf = Z0 + vz * tf - 0.5 * GRAV * tf * tf;
      if (zf > FENCE_H) hr = true;
      else { wall = true; T = tf; }
    }
    if (wall) { sT = fd - 1.5; vg0 = 0; }
    else { sT = sAir(T); vg0 = vh * Math.exp(-T / TAU) * (b.angle < 10 ? 0.85 : 0.6); }
    let tStop = T + vg0 / DEC, sStop = sT + (vg0 * vg0) / (2 * DEC);
    if (fair && !hr && sStop > fd - 1.5) {
      // フェンスまで ころがって とまる
      const ds = fd - 1.5 - sT;
      const disc = vg0 * vg0 - 2 * DEC * ds;
      const dt = ds <= 0 ? 0 : (vg0 - Math.sqrt(Math.max(0, disc))) / DEC;
      tStop = T + dt; sStop = Math.max(sT, fd - 1.5);
    }
    return { b, th, vh, vz, T, sT, vg0, tStop, sStop, fair, fd, hr, wall, sAir };
  }
  // t びょうごの ボールの いち
  function ballAt(pb, t) {
    let s, z = 0, air = false;
    if (t < pb.T) { s = pb.sAir(t); z = Z0 + pb.vz * t - 0.5 * GRAV * t * t; air = true; }
    else if (t < pb.tStop) { const d = t - pb.T; s = pb.sT + pb.vg0 * d - 0.5 * DEC * d * d; z = Math.abs(Math.sin(d * 6)) * Math.max(0, pb.vg0 - DEC * d) * 0.03; }
    else s = pb.sStop;
    if (pb.hr && t >= pb.T) s = pb.sAir(pb.T);
    return { x: s * Math.sin(pb.th), y: s * Math.cos(pb.th), z: Math.max(0, z), s, air };
  }

  // しゅびの せんしゅ（pos じゅん）→ うごきの すうじ
  function fielders(def) {
    return FIELD_POS.map((p, i) => {
      const pl = def[i];
      const of = i >= 6;
      return { pos: i, x: p.x, y: p.y, v: fieldSpeed(pl.spd) * (of ? 0.92 : 1), react: of ? 0.75 : i === 0 ? 0.45 : 0.3, arm: pl.arm };
    });
  }

  // だれが いつ どこで ボールを とるか
  function fieldBall(pb, fs) {
    if (pb.hr) return { hr: true, t: pb.T };
    const tMax = pb.tStop + 12;
    for (let t = 0.12; t <= tMax; t += 0.02) {
      const p = ballAt(pb, t);
      if (p.air) {
        if (p.z > CATCH_Z) continue;
        if (!pb.fair && p.s > 75) continue;          // スタンドの なか
      } else if (!pb.fair) {
        return { foul: true, t: pb.T, x: p.x, y: p.y };
      }
      let best = null;
      for (const f of fs) {
        // うちの せんしゅは ライナーに はんのう しにくい
        const liner = p.air && f.pos <= 5;
        const d = Math.hypot(p.x - f.x, p.y - f.y) - (liner ? 0.9 : REACH);
        const need = f.react + (liner ? 0.25 : 0) + Math.max(0, d) / f.v;
        if (need <= t && (!best || need < best.need)) best = { f, need };
      }
      if (best) return { f: best.f.pos, t, x: p.x, y: p.y, air: p.air, foul: !pb.fair };
    }
    const p = ballAt(pb, tMax);
    return { f: 7, t: tMax, x: p.x, y: p.y, air: false };
  }

  // うけた せんしゅの かわりに ベースに はいる ひと
  function coverOf(base, chaser) {
    const c = { 1: [2, 0, 3], 2: [5, 3, 0], 3: [4, 5, 0], 4: [1, 0, 1] }[base];
    return c.find((p) => p !== chaser);
  }

  // ===== インプレーの けっか =====
  // opt: { choice: "auto" | 1|2|3|4（なげる るい）, seed, err（エラーの かくりつ）, def: しゅびの せんしゅ(pos じゅん), bat: [だじゅんの せんしゅ] }
  function resolvePlay(st, pb, fe, opt) {
    const r = rng(opt.seed || 1);
    const def = opt.def, bat = opt.bat;
    const fs = fielders(def);
    const outs0 = st.outs;
    const bi = batterIdx(st);
    const errRate = opt.err == null ? 0.02 : opt.err;
    const res = {
      kind: null, outs: [], scored: [], bases: [null, null, null], batterBase: 0, batterOut: false,
      error: false, hit: false, rbi: 0, fe, pb, anim: null, throws: [], bunt: !!opt.bunt,
    };
    // ランナー（バッターも ふくむ）。base: 0=ホーム（バッター）1〜3
    const R = [];
    R.push({ p: bi, base: 0, batter: true, v: runSpeed(bat[bi].spd), forced: true });
    let forced = true;
    for (let b = 1; b <= 3; b++) {
      const rn = st.bases[b - 1];
      forced = forced && !!rn;
      if (rn) R.push({ p: rn.p, base: b, batter: false, v: runSpeed(bat[rn.p].spd), forced });
    }
    R.sort((a, b) => b.base - a.base);      // まえの ランナー から

    const anim = { chaser: fe.f, fe, covers: [], runners: [], throws: [], marks: [], end: 0 };
    res.anim = anim;
    const fpos = { x: fe.x, y: fe.y };

    if (fe.hr) {
      res.kind = "hr"; res.hit = true; res.batterBase = 4;
      R.forEach((x) => { x.target = 4; x.s = x.batter ? 0.5 : 0.2; x.v = x.v * 0.6; });
      res.scored = R.map((x) => ({ p: x.p, t: 0 }));
      res.rbi = R.length;
      finishAnim(anim, R, res, fe.t);
      return res;
    }
    if (fe.foul && !fe.air) { res.kind = "foul"; anim.end = fe.t + 0.6; return res; }

    let err = false, tField = fe.t;
    let aircatch = fe.air;
    if (aircatch && r() < errRate * 0.7) { aircatch = false; err = true; tField += 1.1; }
    if (fe.foul && !aircatch) { res.kind = "foul"; res.error = err; anim.end = fe.t + 1; return res; }
    const chaser = fs[fe.f];
    const transfer = fe.f >= 6 ? 1.1 : 0.5;
    const tt = (k, from, t0, arm) => t0 + throwTime(from, BASES[k % 4], arm);

    if (aircatch) {
      // フライ・ライナー アウト
      res.batterOut = true;
      res.outs.push({ p: bi, t: tField, base: 0, force: true, batter: true });
      const b = fe.air && pb.b.angle >= 22 ? (Math.hypot(fe.x, fe.y) > 45 ? "fly" : "pop") : "liner";
      res.kind = fe.foul ? "foulfly" : b;
      R.forEach((x) => { x.target = x.base; x.s = null; });
      const batterR = R.find((x) => x.batter); batterR.target = 0; batterR.s = 0.8; batterR.outAt = tField; batterR.stopAt = 0.8 + 12 / batterR.v;
      if (outs0 + 1 < 3) {
        // タッチアップ（オート）
        let aheadTarget = 5;
        for (const x of R) {
          if (x.batter) continue;
          const k = x.base + 1;
          if (x.base >= 2 && k < aheadTarget) {
            const runT = tField + 0.25 + BASE / x.v;
            const thrT = tt(k, fpos, tField + transfer, chaser.arm);
            const margin = 0.45 + gauss(r) * 0.3;
            if (runT + margin < thrT) { x.target = k; x.s = tField + 0.25; x.lead = 0; x.arrive = runT; }
          }
          aheadTarget = x.target;
        }
        const goers = R.filter((x) => !x.batter && x.target > x.base);
        if (goers.length) {
          const tgt = goers[0];
          const thrT = tt(tgt.target, fpos, tField + transfer, chaser.arm) + gauss(r) * 0.25;
          res.throws.push({ from: fpos, to: tgt.target, t0: tField + transfer, t1: thrT });
          if (thrT < tgt.arrive) {
            tgt.outAt = thrT; tgt.outBase = tgt.target;
            res.outs.push({ p: tgt.p, t: thrT, base: tgt.target, force: false });
          }
        }
      }
      return settle(st, R, res, anim, outs0, err, fe);
    }

    // ===== ゴロ・ヒット（じめんに ついた ボール）=====
    if (!fe.air && fe.f <= 5 && r() < errRate) { err = true; tField += 1.3; }  // ファンブル
    const grounder = pb.T < 0.7;
    const infield = fe.f <= 5 && !err;
    const two = outs0 === 2;
    for (const x of R) {
      x.lead = x.batter ? 0 : 3;
      if (x.batter) { x.s = opt.bunt ? 0.55 : 0.85; continue; }
      if (two) { x.s = 0.1; continue; }
      if (grounder) {
        if (x.forced) x.s = 0.1;
        else if (infield) x.s = null;           // うごかない
        else x.s = 0.45;
      } else {
        // フライが おちた: とちゅうで まっていて、おちたら はしる
        if (x.forced) x.s = Math.max(0.1, pb.T - 1.2);
        else if (fe.f >= 6) x.s = pb.T - 0.6;
        else x.s = null;
      }
    }
    const arrive = (x, k) => x.s + (dist0(x.base, k) - x.lead) / x.v + 0.15 * Math.max(0, k - x.base - 1);
    const tThrowStart = tField + transfer;
    // ランナーの はんだん（まえから じゅんに）
    let aheadTarget = 5;
    for (const x of R) {
      const minK = x.forced ? x.base + 1 : x.base;
      let maxK = aheadTarget >= 4 ? 4 : aheadTarget - 1;
      if (x.s == null) { x.target = x.base; aheadTarget = x.target; continue; }
      maxK = Math.max(maxK, minK);
      let tgt = minK;
      const margin = 0.15 + gauss(r) * 0.35;
      for (let k = maxK; k > minK; k--) {
        if (arrive(x, k) + margin < tt(k, fpos, tThrowStart, chaser.arm)) { tgt = k; break; }
      }
      if (tgt === x.base && x.base > 0) { x.s = null; }  // もどる
      x.target = tgt;
      if (x.s != null) x.arrive = arrive(x, tgt);
      aheadTarget = x.target;
    }
    // しゅびの はんだん
    const movers = R.filter((x) => x.s != null && x.target > x.base);
    const tNoise = gauss(r) * 0.15;
    const outsList = [];
    const cand = (from, t0, arm, except) => movers.filter((x) => !except.includes(x) && x.target <= 4).map((x) => {
      const T1 = t0 + throwTime(from, BASES[x.target % 4], arm) + tNoise;
      return { x, k: x.target, T1, m: x.arrive - T1 };
    });
    let first = null;
    const c1 = cand(fpos, tThrowStart, chaser.arm, []);
    if (opt.choice && opt.choice !== "auto") {
      const k = +opt.choice;
      const c = c1.find((c) => c.k === k);
      first = c || { x: null, k, T1: tThrowStart + throwTime(fpos, BASES[k % 4], chaser.arm), m: -1 };
    } else if (c1.length) {
      const ok = c1.filter((c) => c.m > 0.05);
      if (ok.length) {
        if (two) first = ok.reduce((a, b) => (b.m > a.m ? b : a));
        else first = ok.reduce((a, b) => (b.k > a.k ? b : a));
      } else {
        // アウトに できない: まえの ランナーの さきへ かえす
        const lead = c1.reduce((a, b) => (b.k > a.k ? b : a));
        first = { x: null, k: lead.k, T1: lead.T1, m: -1 };
      }
    }
    let throwErr = false;
    if (first) {
      if (!err && first.m > 0 && r() < errRate * 0.5) throwErr = true;   // あくそうきゅう
      res.throws.push({ from: fpos, to: first.k, t0: tThrowStart, t1: first.T1, wild: throwErr });
      if (first.x && first.m > 0 && !throwErr) {
        outsList.push({ x: first.x, t: first.T1, base: first.k });
        // ゲッツー（ちゅうけい）
        if (outs0 + 1 < 3) {
          const pivot = tStartRelay(first.T1);
          const relayArm = Math.max(def[3].arm, def[5].arm);
          const c2 = cand(BASES[first.k % 4], pivot, relayArm, [first.x]).filter((c) => c.m > 0.05);
          if (c2.length) {
            const s = c2.find((c) => c.k === 1) || c2.reduce((a, b) => (b.k > a.k ? b : a));
            res.throws.push({ from: BASES[first.k % 4], to: s.k, t0: pivot, t1: s.T1 });
            outsList.push({ x: s.x, t: s.T1, base: s.k });
          }
        }
      }
    }
    if (throwErr) {
      err = true;
      for (const x of movers) if (x.target < 4) { x.target++; x.arrive = arrive(x, x.target); }
      // ひとつ まえの ランナーを おいこさない
      fixOrder(R, arrive);
    }
    for (const o of outsList) {
      o.x.outAt = o.t; o.x.outBase = o.base;
      const force = o.x.batter ? o.base === 1 : (o.x.forced && o.base === o.x.base + 1);
      res.outs.push({ p: o.x.p, t: o.t, base: o.base, force, batter: o.x.batter });
      if (o.x.batter) res.batterOut = true;
    }
    const bOut = res.outs.find((o) => o.batter);
    res.kind = res.outs.length >= 2 ? "dp" : bOut && bOut.base >= 2 ? "stretch" : res.batterOut ? "groundout" : res.outs.length ? "fc" : "safe";
    if (res.kind === "stretch") res.hit = !err;   // ヒットの あと よくばって アウト（ヒットは ヒット）
    return settle(st, R, res, anim, outs0, err, fe);
  }
  const tStartRelay = (t) => t + 0.45;
  function dist0(from, to) { return (to - from) * BASE; }
  function fixOrder(R, arrive) {
    let ahead = 5;
    for (const x of R) {
      if (x.outAt != null) continue;
      if (ahead < 4 && x.target >= ahead) { x.target = Math.max(x.base, ahead - 1); if (x.s != null) x.arrive = arrive(x, x.target); }
      ahead = x.target;
    }
  }

  // とくてん・アウト・あたらしい るいの じょうたいを まとめる
  function settle(st, R, res, anim, outs0, err, fe) {
    res.error = err;
    const outsAll = res.outs.slice().sort((a, b) => a.t - b.t);
    const totalOuts = outs0 + outsAll.length;
    let third = null;
    if (totalOuts >= 3) third = outsAll[2 - outs0];
    const forceThird = !!(third && third.force);   // フォースアウト・バッターの 1るいアウトが 3つめ なら とくてん なし
    for (const x of R) {
      if (x.outAt != null) continue;
      if (x.target >= 4) {
        const t = x.arrive != null ? x.arrive : 0;
        if (third && (forceThird || t >= third.t)) continue;
        res.scored.push({ p: x.p, t });
      } else if (x.target >= 1 && !(third)) {
        res.bases[x.target - 1] = { p: x.p };
      }
      if (x.batter) res.batterBase = x.target;
    }
    if (third) res.bases = [null, null, null];
    res.scored.sort((a, b) => a.t - b.t);
    if (!res.batterOut && res.kind === "safe") {
      res.hit = !err;
      res.kind = err ? "error" : ["", "single", "double", "triple", "inside"][res.batterBase] || "single";
    }
    if (res.kind === "groundout" && res.bunt && res.scored.length + R.filter((x) => !x.batter && x.target > x.base && x.outAt == null).length > 0) res.kind = "sac";
    if (res.kind === "fly" && res.scored.length && res.outs.length === 1) res.kind = "sf";
    res.rbi = err || res.kind === "dp" ? 0 : res.scored.length;
    finishAnim(anim, R, res, fe.t);
    return res;
  }

  function finishAnim(anim, R, res, tField) {
    let end = tField + 1.0;
    anim.runners = R.map((x) => {
      const a = { p: x.p, base: x.base, target: x.target, s: x.s, v: x.v, lead: x.lead || 0, outAt: x.outAt, batter: x.batter, stopAt: x.stopAt };
      if (x.s != null) end = Math.max(end, x.s + ((x.target - x.base) * BASE - a.lead) / x.v + 0.3);
      if (x.outAt != null) end = Math.max(end, x.outAt + 0.8);
      return a;
    });
    anim.throws = res.throws;
    res.throws.forEach((t) => (end = Math.max(end, t.t1 + 0.6)));
    for (const o of res.outs) anim.marks.push({ t: o.t, base: o.base, text: "アウト！" });
    anim.covers = [1, 2, 3, 4].map((b) => ({ f: coverOf(b, anim.chaser), base: b }));
    if (res.fe && res.fe.hr) end = Math.max(end, res.fe.t + 0.5);
    anim.end = Math.min(end, 30);
  }

  // インプレーの けっかを しあいに はんえい する
  function applyPlay(st, res) {
    const t = st.half, p = batterIdx(st);
    const S = st.stats[t][p];
    if (res.kind === "foul") { return applyPitch(st, "foul"); }
    if (res.error) st.errors[1 - t]++;
    const sac = res.kind === "sac" || res.kind === "sf";
    if (!sac) S.ab++;
    if (res.hit) { S.h++; st.hits[t]++; if (res.kind === "hr" || res.kind === "inside") S.hr++; }
    const outsN = res.outs.length;
    // さきに るいを うごかす（とくてんが はいる まえに ランナーが いなく ならないように）
    st.bases = res.bases;
    const n = addRuns(st, res.scored, { hr: res.kind === "hr" });
    S.rbi += res.rbi ? Math.min(res.rbi, n) : 0;
    nextBatter(st);
    if (!st.over && outsN) addOut(st, outsN);
    return { ev: "play", kind: res.kind, scored: n };
  }

  const api = {
    BASE, BASES, POS_NAME, FIELD_POS, FOUL_DEG, FENCE_H, WIN, LEAD, PITCHES, fenceDist,
    rng, gauss, clamp, runSpeed, fieldSpeed, throwSpeed, throwTime,
    newGame, batTeam, fieldTeam, batterIdx, isWalkoff, addRuns, addOut, endHalf, nextBatter, endGame,
    forceAdvance, applyPitch, stealTimes, applySteal,
    cellTarget, makePitch, outside, contact, prepBall, ballAt, fielders, fieldBall, resolvePlay, applyPlay, coverOf,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.YS = api;
})(this);
