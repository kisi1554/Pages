/* ============================================================
   さむらい vs にんじゃ — たたかいの しくみ（えを かかない ぶぶん）
   1フレーム＝1/60びょう。ブラウザでも node でも うごく（tests/ で 1000せん する）
   ちょうせいの めやす（3すくみ）:
     ・かまえ（ガード）は くないの れんげきを ぜんぶ とめる。おしたて なら はじき返す
     ・しゅりけん は かまえ ゲージを けずる（0 で くずれる）。うしろ からは ガードできない
     ・いあい は せが たかい あたりはんい。ジャンプちゅうの あいてには 1.3ばい
     ・かわりみ は いあい を まるた で うけて、うしろに まわりこむ
   ============================================================ */
(function (root) {
  "use strict";

  var G = 0.9;            // じゅうりょく（px/フレーム²）
  var GROUND = 430;       // じめんの たかさ（がめんは たかさ 500）
  var ARENA_W = 1400;     // ステージの はば
  var XMIN = 60, XMAX = 1340;
  var MAXSEP = 640;       // 2人が はなれられる さいだい（カメラに おさめる）
  var PARRY = 10;         // かまえ を おして から この フレーム いないなら はじき返し
  var TIME = 60 * 60;     // 60びょう
  var SP_PASSIVE = 0.045; // ひっさつ ゲージが しぜんに たまる りょう

  // わざ: su=だすまで ac=あたる あいだ re=もどり box=[まえ0, まえ1, うえ, した]（あしもと から）
  var MOVES = {
    kiru1: { su: 9, ac: 4, re: 15, dmg: 7, box: [15, 118, -128, -30], kb: 4, hs: 20, gdmg: 7, bs: 12, next: "kiru2" },
    kiru2: { su: 7, ac: 4, re: 15, dmg: 7, box: [15, 118, -112, -20], kb: 4, hs: 20, gdmg: 7, bs: 12, next: "kiru3" },
    kiru3: { su: 12, ac: 5, re: 26, whiff: 12, dmg: 14, box: [10, 128, -150, -16], kb: 11, hs: 26, gdmg: 14, bs: 16, step: 3.2 },
    kiruA: { su: 5, ac: 9, re: 10, dmg: 9, box: [0, 104, -122, 12], kb: 5, hs: 20, gdmg: 14, bs: 12, air: true },
    kunai1: { su: 4, ac: 3, re: 8, dmg: 5, box: [10, 84, -112, -48], kb: 2, hs: 14, gdmg: 7, bs: 8, next: "kunai2" },
    kunai2: { su: 4, ac: 3, re: 8, dmg: 5, box: [10, 84, -104, -44], kb: 2, hs: 14, gdmg: 7, bs: 8, next: "kunai3" },
    kunai3: { su: 4, ac: 3, re: 8, dmg: 5, box: [10, 84, -112, -48], kb: 2, hs: 14, gdmg: 7, bs: 8, next: "kunai4" },
    kunai4: { su: 6, ac: 3, re: 14, whiff: 8, dmg: 7, box: [10, 92, -116, -40], kb: 7, hs: 18, gdmg: 9, bs: 10 },
    kunaiA: { su: 4, ac: 7, re: 8, dmg: 6, box: [0, 82, -96, 16], kb: 3, hs: 14, gdmg: 7, bs: 8, air: true }
  };
  var IAI = { dash: 14, speed: 21, rec: 32, dmg: 22, bonus: 8, box: [-24, 92, -250, 6], kb: 12, hs: 34, gdmg: 70, bs: 20, airMul: 1.3 };
  var SHURI = { dmg: 5, gdmg: 30, chip: 2, kb: 3, hs: 12, bs: 10, speed: 9.5, stock: 3, recharge: 80 };

  var CHARS = {
    samurai: {
      id: "samurai", name: "さむらい", hp: 100, walk: 2.6, back: 2.2, jv: -16.5, jumps: 1, airS: 2.6,
      w: 64, h: 145, atk: "kiru1", air: "kiruA", guard: true
    },
    ninja: {
      id: "ninja", name: "にんじゃ", hp: 100, walk: 4.6, back: 4.2, jv: -15.5, jv2: -13.5, jumps: 2, airS: 4.2,
      w: 54, h: 130, atk: "kunai1", air: "kunaiA", shuriken: true
    }
  };

  var NOIN = {};

  function fighter(ch, idx) {
    var C = CHARS[ch];
    return {
      idx: idx, ch: ch, C: C, x: idx ? 840 : 560, y: GROUND, vx: 0, vy: 0, face: idx ? -1 : 1,
      hp: C.hp, sp: 0, gp: 100, gpT: 0, st: "idle", sf: 0, len: 0, mv: null, mvName: "", hit: false, q: false,
      onG: true, jumps: 0, stock: SHURI.stock, stockT: 0, inv: 0, smoke: 0, charge: 0, guardStart: -99,
      act: 0, combo: 0, prev: NOIN
    };
  }

  function createMatch(o) {
    o = o || {};
    return {
      frame: 0, time: o.time || TIME, hitstop: 0, over: false, winner: -1, reason: "",
      fighters: [fighter(o.p1 || "samurai", 0), fighter(o.p2 || "ninja", 1)],
      shots: [], logs: [], events: []
    };
  }

  function ev(m, t, x, y, extra) {
    var e = { t: t, x: x, y: y };
    if (extra) for (var k in extra) e[k] = extra[k];
    m.events.push(e);
  }

  function startMove(f, name) {
    f.st = "atk"; f.mv = MOVES[name]; f.mvName = name; f.sf = 0; f.hit = false; f.q = false; f.act++;
    if (f.onG) f.vx = 0;
  }
  function free(f) { f.st = f.onG ? "idle" : "air"; f.sf = 0; f.mv = null; f.mvName = ""; }
  function stun(f, len) { f.st = "stun"; f.sf = 0; f.len = len; f.mv = null; f.mvName = ""; f.charge = 0; }

  function updateFighter(m, f, o, I) {
    var C = f.C, P = f.prev;
    function pr(k) { return !!I[k] && !P[k]; }
    f.sf++;
    if (f.inv > 0) f.inv--;
    if (f.smoke > 0) f.smoke--;
    if (C.shuriken && f.stock < SHURI.stock && ++f.stockT >= SHURI.recharge) { f.stock++; f.stockT = 0; }
    if (f.st !== "guard" && f.st !== "bstun") { if (++f.gpT > 40) f.gp = Math.min(100, f.gp + 0.5); }
    f.sp = Math.min(100, f.sp + SP_PASSIVE);

    switch (f.st) {
      case "hit": case "stun": case "bstun":
        if (f.onG) f.vx *= 0.82;
        if (f.sf >= f.len) {
          var wasBlock = f.st === "bstun";
          // れんぞくで たくさん あたったら、たちなおる あいだは むてき（ずっと はめられない）
          if (f.st === "hit" && f.combo >= 4) f.inv = Math.max(f.inv, 20);
          f.combo = 0;
          free(f);
          if (wasBlock && C.guard && I.b && f.onG) f.st = "guard";
        }
        break;
      case "atk": {
        var mv = f.mv;
        if (mv.step && f.sf < mv.su) f.vx = f.face * mv.step; else if (f.onG) f.vx *= 0.7;
        if (pr("a") && mv.next && f.sf >= 2) f.q = true;
        if (f.q && mv.next && f.sf >= mv.su + mv.ac + 3) { startMove(f, mv.next); break; }
        // れんだの さいごが からぶり だと すこし よろける（すきが できる）
        if (f.sf >= mv.su + mv.ac + mv.re + (f.hit ? 0 : mv.whiff || 0)) free(f);
        break;
      }
      case "guard":
        f.vx = 0;
        if (!I.b || !f.onG) free(f);
        else if (pr("a")) startMove(f, C.atk);
        break;
      case "charge":
        f.vx = 0; f.charge = f.sf;
        if ((!I.s && f.sf >= 16) || f.sf >= 60) {
          f.st = "iai"; f.sf = 0; f.hit = false; f.act++;
          f.mv = { dmg: IAI.dmg + IAI.bonus * Math.min(1, (f.charge - 16) / 44), box: IAI.box, kb: IAI.kb, hs: IAI.hs, gdmg: IAI.gdmg, bs: IAI.bs, airMul: IAI.airMul, iai: true };
          ev(m, "iai", f.x, f.y - 80, { who: f.idx });
        }
        break;
      case "iai":
        f.vx = f.sf <= IAI.dash ? f.face * IAI.speed : 0;
        if (f.sf >= IAI.dash + IAI.rec) { free(f); f.charge = 0; }
        break;
      case "kawa":
        f.vx = 0;
        if (f.sf >= 45) { f.sp = Math.min(100, f.sp + 50); free(f); }
        break;
      case "throw":
        if (f.sf === 6) {
          m.shots.push({ x: f.x + f.face * 40, y: f.onG ? f.y - 85 : f.y - 70, vx: f.face * SHURI.speed, vy: f.onG ? 0 : 3.5, owner: f.idx, rot: 0, alive: true });
          ev(m, "throw", f.x, f.y - 85, { who: f.idx });
        }
        if (f.sf >= 16) free(f);
        break;
      case "smokeT":
        if (f.sf === 6) { f.smoke = 200; ev(m, "smoke", f.x, f.y - 60, { who: f.idx }); }
        if (f.sf >= 16) free(f);
        break;
      case "ko":
        f.vx = 0;
        break;
      default:
        control(m, f, o, I, pr);
    }

    if (!f.onG) f.vy += G;
    f.x += f.vx; f.y += f.vy;
    if (f.y >= GROUND) {
      if (!f.onG) {
        f.onG = true; f.jumps = 0;
        ev(m, "land", f.x, GROUND, { who: f.idx });
        if (f.st === "air" || (f.st === "atk" && f.mv && f.mv.air)) free(f);
      }
      f.y = GROUND; f.vy = 0;
    } else f.onG = false;
  }

  function control(m, f, o, I, pr) {
    var C = f.C;
    if (f.onG && Math.abs(o.x - f.x) > 4) f.face = o.x > f.x ? 1 : -1;
    var dir = (I.r ? 1 : 0) - (I.l ? 1 : 0);
    if (f.onG) {
      f.vx = dir * (dir === f.face ? C.walk : C.back);
      var ns = dir ? "walk" : "idle";
      if (f.st !== ns) { f.st = ns; f.sf = 0; }
    } else {
      var t = dir * C.airS;
      f.vx += Math.max(-0.5, Math.min(0.5, t - f.vx));
      f.st = "air";
    }
    if (pr("j") && f.jumps < C.jumps) {
      f.vy = f.jumps === 0 && f.onG ? C.jv : (C.jv2 || C.jv);
      if (!f.onG && f.jumps === 0) f.jumps = 1; // あしばを ふみはずした あとの ジャンプは 2だんめ あつかい
      f.jumps++; f.onG = false; f.st = "air"; f.sf = 0;
      ev(m, "jump", f.x, f.y, { who: f.idx, n: f.jumps });
    }
    if (pr("a")) { startMove(f, f.onG ? C.atk : C.air); return; }
    if (C.guard && I.b && f.onG) {
      f.st = "guard"; f.sf = 0; f.vx = 0;
      if (pr("b")) f.guardStart = m.frame;
      return;
    }
    if (C.shuriken && pr("b") && f.stock > 0) {
      f.st = "throw"; f.sf = 0; f.stock--; f.act++;
      if (f.onG) f.vx = 0;
      return;
    }
    if (pr("s") && f.sp >= 100) {
      if (C.guard && f.onG) { f.sp = 0; f.st = "charge"; f.sf = 0; f.charge = 0; f.act++; ev(m, "charge", f.x, f.y - 80, { who: f.idx }); return; }
      if (C.shuriken) { f.sp = 0; f.st = "kawa"; f.sf = 0; f.act++; ev(m, "kawaReady", f.x, f.y - 70, { who: f.idx }); return; }
    }
    if (pr("k") && C.shuriken && f.sp >= 40 && f.smoke <= 0) { f.sp -= 40; f.st = "smokeT"; f.sf = 0; f.act++; }
  }

  function hurt(f) { return [f.x - f.C.w / 2, f.x + f.C.w / 2, f.y - f.C.h, f.y]; }
  function boxOf(f, b) {
    return f.face > 0 ? [f.x + b[0], f.x + b[1], f.y + b[2], f.y + b[3]] : [f.x - b[1], f.x - b[0], f.y + b[2], f.y + b[3]];
  }
  function overlap(a, b) { return a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2]; }

  // いま あたる じょうたいの わざ（なければ null）
  function activeBox(f) {
    if (f.hit) return null;
    if (f.st === "atk" && f.sf >= f.mv.su && f.sf < f.mv.su + f.mv.ac) return boxOf(f, f.mv.box);
    if (f.st === "iai" && f.sf <= IAI.dash + 2) return boxOf(f, IAI.box);
    return null;
  }

  function kawarimi(m, def, att, shot) {
    ev(m, "doron", def.x, def.y - 60, { who: def.idx });
    m.logs.push({ x: def.x, y: def.y, face: def.face, t: 0 });
    if (!shot) {
      def.x = Math.max(XMIN, Math.min(XMAX, att.x - att.face * 85));
      def.y = GROUND; def.vy = 0; def.onG = true;
      def.face = att.x > def.x ? 1 : -1;
      stun(att, 30);
      att.hit = true;
    } else {
      def.x = Math.max(XMIN, Math.min(XMAX, def.x - def.face * 120));
    }
    free(def);
    def.inv = 24;
    def.smoke = Math.max(def.smoke, 60);
  }

  // dir = あいてが とばされる むき。 かえりち: "hit" | "block" | "parry" | "reflect" | "kawa" | ""
  function applyHit(m, att, def, mv, dir, shot) {
    if (def.st === "ko" || def.inv > 0) return "";
    if (def.st === "kawa") { kawarimi(m, def, att, shot); return "kawa"; }
    var guarding = def.C.guard && (def.st === "guard" || def.st === "bstun") && def.face === -dir;
    if (guarding) {
      if (def.st === "guard" && m.frame - def.guardStart <= PARRY) {
        def.sp += 20;
        ev(m, "parry", def.x + def.face * 40, def.y - 90, { who: def.idx });
        m.hitstop = Math.max(m.hitstop, 8);
        if (shot) return "reflect";
        stun(att, 44); att.vx = -att.face * 3;
        return "parry";
      }
      def.gp -= mv.gdmg; def.hp -= mv.chip || 0; def.sp += 3; def.gpT = 0;
      def.vx = dir * mv.kb * 0.6;
      if (def.gp <= 0) {
        def.gp = 0; stun(def, 50);
        ev(m, "break", def.x, def.y - 90, { who: def.idx });
      } else {
        def.st = "bstun"; def.sf = 0; def.len = mv.bs;
        ev(m, "kin", def.x + def.face * 36, def.y - 90, { who: def.idx });
      }
      m.hitstop = Math.max(m.hitstop, 3);
      return "block";
    }
    var dmg = mv.dmg;
    if (!def.onG && mv.airMul) dmg *= mv.airMul;
    def.combo = def.st === "hit" ? (def.combo || 0) + 1 : 1;
    def.hp -= dmg;
    def.st = "hit"; def.sf = 0; def.len = mv.hs; def.mv = null; def.mvName = ""; def.charge = 0;
    def.vx = dir * mv.kb;
    if (!def.onG) def.vy = Math.min(def.vy, -4);
    def.sp += dmg; att.sp += dmg * 1.2;
    ev(m, "hit", def.x, def.y - def.C.h * 0.6, { who: def.idx, dmg: dmg, iai: !!mv.iai, shot: !!shot, by: att.ch, combo: def.combo, air: !def.onG });
    m.hitstop = Math.max(m.hitstop, dmg >= 12 ? 8 : 4);
    return "hit";
  }

  function step(m, inputs) {
    m.events = [];
    var F = m.fighters, i;
    for (i = 0; i < m.logs.length; i++) m.logs[i].t++;
    m.logs = m.logs.filter(function (l) { return l.t < 90; });
    if (m.over) { m.frame++; return m; }
    if (m.hitstop > 0) { m.hitstop--; return m; }
    m.frame++;
    var ins = [inputs && inputs[0] || NOIN, inputs && inputs[1] || NOIN];
    updateFighter(m, F[0], F[1], ins[0]);
    updateFighter(m, F[1], F[0], ins[1]);

    // おしあい（うえを とびこえる ときは すりぬける）
    var a = F[0], b = F[1];
    var dx = b.x - a.x;
    var minD = (a.C.w + b.C.w) / 2 * 0.85;
    if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 60 && a.st !== "iai" && b.st !== "iai") {
      var s = dx === 0 ? (a.face > 0 ? 1 : -1) : (dx > 0 ? 1 : -1);
      var push = (minD - Math.abs(dx)) / 2;
      a.x -= s * push; b.x += s * push;
    }
    for (i = 0; i < 2; i++) F[i].x = Math.max(XMIN, Math.min(XMAX, F[i].x));
    if (Math.abs(b.x - a.x) > MAXSEP) {
      var c = (a.x + b.x) / 2, half = MAXSEP / 2, sg = b.x > a.x ? 1 : -1;
      a.x = c - sg * half; b.x = c + sg * half;
    }

    // ちかくの こうげき（あいうちも ある）
    var hits = [];
    for (i = 0; i < 2; i++) {
      var f = F[i], o = F[1 - i], hb = activeBox(f);
      if (hb && overlap(hb, hurt(o))) hits.push([f, o, f.mv]);
    }
    hits.forEach(function (h) { h[0].hit = true; applyHit(m, h[0], h[1], h[2], h[0].face, null); });

    // しゅりけん
    m.shots.forEach(function (p) {
      if (!p.alive) return;
      p.x += p.vx; p.y += p.vy; p.rot += 0.5;
      if (p.y >= GROUND - 4) { p.alive = false; ev(m, "stick", p.x, GROUND); return; }
      if (p.x < 0 || p.x > ARENA_W) { p.alive = false; return; }
      var t = F[1 - p.owner], hb = hurt(t);
      if (overlap([p.x - 10, p.x + 10, p.y - 10, p.y + 10], hb)) {
        var r = applyHit(m, F[p.owner], t, SHURI, p.vx > 0 ? 1 : -1, p);
        if (r === "reflect") { p.owner = t.idx; p.vx = -p.vx * 1.15; p.vy = 0; ev(m, "reflect", p.x, p.y, { who: t.idx }); }
        else if (r) p.alive = false;
      }
    });
    m.shots = m.shots.filter(function (p) { return p.alive; });

    for (i = 0; i < 2; i++) { F[i].sp = Math.min(100, F[i].sp); F[i].prev = ins[i]; }

    // しょうぶ あり
    var ko0 = F[0].hp <= 0, ko1 = F[1].hp <= 0;
    if (ko0 || ko1) {
      m.over = true; m.reason = "ko";
      m.winner = ko0 && ko1 ? -1 : ko0 ? 1 : 0;
      for (i = 0; i < 2; i++) if (F[i].hp <= 0) { F[i].hp = 0; F[i].st = "ko"; F[i].sf = 0; }
      ev(m, "ko", 0, 0, { winner: m.winner });
    } else if (m.frame >= m.time) {
      m.over = true; m.reason = "time";
      var r0 = F[0].hp / F[0].C.hp, r1 = F[1].hp / F[1].C.hp;
      m.winner = Math.abs(r0 - r1) < 0.005 ? -1 : r0 > r1 ? 0 : 1;
      if (m.winner >= 0) { var L = F[1 - m.winner]; L.st = "ko"; L.sf = 0; }
      ev(m, "ko", 0, 0, { winner: m.winner, time: true });
    }
    return m;
  }

  // シード つき らんすう（CPU と テスト が つかう）
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var SN = {
    G: G, GROUND: GROUND, ARENA_W: ARENA_W, XMIN: XMIN, XMAX: XMAX, MAXSEP: MAXSEP, PARRY: PARRY, TIME: TIME,
    MOVES: MOVES, IAI: IAI, SHURI: SHURI, CHARS: CHARS,
    createMatch: createMatch, step: step, hurt: hurt, activeBox: activeBox, rng: rng
  };
  if (typeof module !== "undefined" && module.exports) module.exports = SN;
  else root.SN = SN;
})(this);
