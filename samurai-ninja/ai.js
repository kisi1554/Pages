/* ============================================================
   さむらい vs にんじゃ — CPU
   ・あいての ようすは「はんのう じかん」ぶん むかしの すがたしか みえない
     （はんのうの たびに ランダムに かわる。けむりだま の なかだと さらに おそく、いちも ずれる）
   ・こうどうは ステートマシン: えらんだ「よてい」（あるく・きる・かまえる・とぶ…）を
     きめた フレームの あいだ つづけて、おわったら また かんがえる
   ・つよい でも はんのうは 0.18びょう より はやく ならず、ときどき ぼんやり する
     （こどもが かてる すきを のこす）
   ============================================================ */
(function (root) {
  "use strict";
  var SN = root.SN || (typeof require !== "undefined" ? require("./engine.js") : null);

  // lv 0 = よわい, 2 = ふつう, 4 = つよい（1・3 は ストーリーの あいだ）
  var LEVELS = [
    { react: 30, jit: 14, think: 24, aggr: 0.34, def: 0.22, miss: 0.25, spec: 0.35, idle: 0.26 },
    { react: 24, jit: 11, think: 18, aggr: 0.44, def: 0.34, miss: 0.18, spec: 0.5, idle: 0.18 },
    { react: 18, jit: 8, think: 14, aggr: 0.54, def: 0.46, miss: 0.12, spec: 0.65, idle: 0.12 },
    { react: 14, jit: 6, think: 11, aggr: 0.6, def: 0.56, miss: 0.09, spec: 0.75, idle: 0.09 },
    { react: 11, jit: 5, think: 9, aggr: 0.66, def: 0.64, miss: 0.07, spec: 0.85, idle: 0.07 }
  ];
  var HIST = 64;
  var MASH = { samurai: 2, ninja: 6 };   // atkRate が これを こえたら「れんだ してくる あいて」（あいての キャラ べつ）

  function CPU(idx, lv, seed) {
    this.idx = idx;
    this.L = LEVELS[Math.max(0, Math.min(4, lv | 0))];
    this.rnd = SN.rng(seed || 1);
    this.hist = [];
    this.plan = { type: "idle", t: 20 };
    this.delay = this.L.react;
    this.out = {};
    this.seen = -1;      // さいごに はんのうした あいての わざ（act）
    this.noise = 0;
    this.lastAct = -1;
    this.atkRate = 0;    // あいてが こうげきを くりだす はやさ（れんだ を みぬく）
  }

  CPU.prototype.observe = function (m) {
    var o = m.fighters[1 - this.idx];
    this.foeCh = o.ch;
    this.hist.push({
      x: o.x, y: o.y, st: o.st, sf: o.sf, mvName: o.mvName, face: o.face, onG: o.onG, act: o.act, smoke: o.smoke,
      shots: m.shots.filter(function (p) { return p.owner === o.idx; }).map(function (p) { return { x: p.x, y: p.y, vx: p.vx }; })
    });
    if (this.hist.length > HIST) this.hist.shift();
    this.atkRate *= 0.99;
    if (o.st === "atk" && o.act !== this.lastAct) { this.lastAct = o.act; this.atkRate += 1; }
  };

  CPU.prototype.seenFoe = function () {
    var i = Math.max(0, this.hist.length - 1 - this.delay);
    return this.hist[i];
  };

  CPU.prototype.resample = function (foeSmoke) {
    var L = this.L, r = this.rnd;
    this.delay = Math.round(L.react + (r() * 2 - 1) * L.jit);
    if (foeSmoke) { this.delay += 14; this.noise = (r() * 2 - 1) * 90; } else this.noise = 0;
    this.delay = Math.max(7, Math.min(HIST - 1, this.delay));
  };

  CPU.prototype.setPlan = function (type, t, extra) {
    this.plan = { type: type, t: t, f: 0 };
    if (extra) for (var k in extra) this.plan[k] = extra[k];
  };

  // まい フレーム よぶ。 かえりち は そうさ（l r j a b s k）
  CPU.prototype.input = function (m) {
    this.observe(m);
    var me = m.fighters[this.idx], S = this.seenFoe(), L = this.L, r = this.rnd;
    var I = {};
    if (!S || m.over) return (this.out = I);
    var fx = S.x + this.noise, dx = fx - me.x, d = Math.abs(dx), toward = dx > 0 ? 1 : -1;
    var sam = me.C.guard;

    // ---- はんのう（あいての うごきを みて すぐ うごく）----
    var busy = this.plan.type === "iai" || this.plan.type === "atk" && this.plan.f < 4;
    if (!busy && S.act !== this.seen && (S.st === "atk" || S.st === "charge" || S.st === "iai" || S.st === "throw")) {
      this.seen = S.act;
      this.resample(S.smoke > 0);
      var near = d < (S.st === "charge" || S.st === "iai" ? 420 : 190);
      if (near && r() < L.def) {
        if (sam) {
          if (S.st === "charge" || S.st === "iai") this.setPlan(r() < 0.5 ? "back" : "guard", 26);
          else this.setPlan("guard", 16 + (r() * 18 | 0));
        } else {
          if ((S.st === "charge" || S.st === "iai") && me.sp >= 100 && r() < L.spec) this.setPlan("kawa", 3);
          else if (S.st === "charge") this.setPlan("back", 30);
          else if (me.sp >= 100 && r() < L.spec * 0.35) this.setPlan("kawa", 3);
          else this.setPlan(r() < 0.6 ? "back" : "hop", 14);
        }
      }
    }
    // ガードの あとの はんげき（れんげきの さいごを うけたら すぐ うちかえす）
    if (sam && (me.st === "bstun" || me.st === "guard") && this.plan.type === "guard" && S.st === "atk" && S.mvName && SN.MOVES[S.mvName] &&
        !SN.MOVES[S.mvName].next && S.sf > SN.MOVES[S.mvName].su + SN.MOVES[S.mvName].ac && d < 170 && r() < L.def + 0.2) {
      this.setPlan("rush", 30, { n: 2 });
    }
    // とんでくる しゅりけん
    if (!busy && this.plan.type !== "guard" && S.shots.length) {
      var inc = S.shots.some(function (p) { return (p.vx > 0) === (me.x > p.x) && Math.abs(p.x - me.x) < 230; });
      if (inc && r() < L.def * 0.12) {
        if (sam) this.setPlan(r() < 0.75 ? "guard" : "atk", 20, { n: 1 });
        else this.setPlan("hop", 12);
      }
    }
    // とびこんで くる あいて（たいくう）
    if (!busy && sam && !S.onG && d < 170 && this.plan.type !== "guard" && this.plan.type !== "atk" && r() < L.def * 0.08) {
      if (me.sp >= 100 && r() < L.spec) this.setPlan("iai", 40, { hold: 16 });
      else this.setPlan("atk", 20, { n: 1 });
    }

    // ---- よていが おわったら かんがえる ----
    if (this.plan.t <= 0) { this.resample(S.smoke > 0); this.think(me, S, d, toward); }

    // ---- よていを じっこう ----
    var p = this.plan, fwd = toward > 0 ? "r" : "l", bwd = toward > 0 ? "l" : "r";
    var self = this;
    function tap(k) { if (!self.out[k]) I[k] = true; }
    switch (p.type) {
      case "walk": I[fwd] = true; break;
      case "rush":
        // さむらい は ながい かたなの とどく ぎりぎり、にんじゃ は ふところ まで ちかづいて うつ
        if (p.go === undefined) { if (d > (sam ? 145 : 72)) I[fwd] = true; else p.go = p.f; }
        if (p.go !== undefined && (p.f - p.go) % 7 === 0 && p.n > 0) { tap("a"); p.n--; }
        break;
      case "back":
        // かべ ぎわ なら うしろに さがらず、とびこえて ぬける
        if ((bwd === "l" && me.x < SN.XMIN + 70) || (bwd === "r" && me.x > SN.XMAX - 70)) { this.setPlan("jump", 34, { dir: 1, dbl: true }); I[fwd] = true; tap("j"); break; }
        I[bwd] = true; break;
      case "guard":
        if (sam) {
          I.b = true;
          // れんだ して くる あいてには かまえ を おしなおして はじき返しを ねらう
          if (this.atkRate > MASH[this.foeCh] && p.f > 0 && p.f % 9 === 0 && r() < L.def) I.b = false;
        }
        break;
      case "atk":
        if (p.f % 7 === 0 && p.f / 7 < p.n) tap("a");
        break;
      case "jump":
        I[p.dir > 0 ? fwd : bwd] = true;
        if (p.f === 0) tap("j");
        if (p.dbl && p.f === 12) tap("j");
        if (p.air && p.f === p.air) tap("a");
        break;
      case "hop":
        I[bwd] = true;
        if (p.f === 0) tap("j");
        break;
      case "shuri": if (p.f === 0) tap("b"); break;
      case "iai":
        if (p.f === 0) tap("s");
        else if (p.f < p.hold && me.st === "charge") I.s = true;
        break;
      case "kawa": if (p.f === 0) tap("s"); break;
      case "smoke": if (p.f === 0) tap("k"); break;
    }
    p.f++; p.t--;
    this.out = I;
    return I;
  };

  CPU.prototype.think = function (me, S, d, toward) {
    var L = this.L, r = this.rnd, x = r();
    var think = Math.max(4, Math.round(L.think * (0.6 + r() * 0.8)));
    if (r() < L.idle) { this.setPlan("idle", think + (r() * 16 | 0)); return; }
    if (r() < L.miss) {
      var junk = ["walk", "back", "idle", "atk"][r() * 4 | 0];
      this.setPlan(junk, think, { n: 1 });
      return;
    }
    var sam = me.C.guard;
    // あいてが よろけている: チャンス
    if (S.st === "stun" && S.sf < 20 && d < 220 && r() < L.aggr + 0.2) { this.setPlan("rush", 34, { n: sam ? 3 : 4 }); return; }
    // あいてが ふりまわしている: すきを まって うつ
    if (S.st === "atk" && d < 210 && S.mvName && SN.MOVES[S.mvName]) {
      var mv = SN.MOVES[S.mvName], rec = S.sf > mv.su + mv.ac;
      if (rec && !mv.next && d < (sam ? 190 : 150) && r() < L.def + 0.15) { this.setPlan("rush", 30, { n: sam ? 2 : 3 }); return; }
      if (r() < L.def + 0.2) {
        if (sam) this.setPlan("guard", 10 + (r() * 14 | 0));
        else this.setPlan(me.stock > 0 && d > 150 ? "shuri" : "back", 12);
        return;
      }
    }
    // れんだ してくる あいてには、まあいを とって まつ
    if (this.atkRate > MASH[this.foeCh] && r() < L.def + 0.2) {
      if (sam) {
        if (d < 160) { this.setPlan(r() < 0.6 ? "guard" : "back", 14 + (r() * 12 | 0)); return; }
        if (d < 260) { this.setPlan("idle", think); return; }
      } else {
        if (d < 170) { this.setPlan(r() < 0.6 ? "back" : "jump", 16, { dir: 1, dbl: true, air: 22 }); return; }
        if (d < 320 && me.stock > 0) { this.setPlan("shuri", 18); return; }
        if (d < 260) { this.setPlan("idle", think); return; }
      }
    }
    if (me.C.guard) {
      // ---- さむらい ----
      if (me.sp >= 100 && d > 110 && d < 340 && (!S.onG ? r() < L.spec : r() < L.spec * 0.3)) {
        this.setPlan("iai", 50, { hold: 16 + (r() * 24 | 0) }); return;
      }
      if (d >= 112 && d < 150 && S.onG && S.st !== "atk" && x < L.aggr + 0.2) {
        // かたなの さきだけ とどく まあい
        this.setPlan("atk", 9 + 18 * 2, { n: 1 + (r() * 3 | 0) });
      } else if (d < 135) {
        if (x < L.aggr) this.setPlan("atk", 9 + 18 * 2, { n: 1 + (r() * 3 | 0) });
        else if (x < L.aggr + 0.25) this.setPlan("guard", 16 + (r() * 24 | 0));
        else this.setPlan("back", think);
      } else if (d < 260) {
        if (x < 0.55) this.setPlan("walk", think);
        else if (x < 0.75) this.setPlan("guard", 18 + (r() * 16 | 0));
        else if (x < 0.85) this.setPlan("jump", 30, { dir: 1, air: 14 });
        else this.setPlan("idle", think);
      } else {
        if (x < 0.8) this.setPlan("walk", think + 10);
        else this.setPlan("guard", 20);
      }
    } else {
      // ---- にんじゃ ----
      if (S.st === "charge") {
        if (me.sp >= 100 && r() < L.spec) this.setPlan("kawa", 3);
        else this.setPlan("back", 30);
        return;
      }
      if (me.sp >= 40 && me.sp < 100 && me.smoke <= 0 && r() < 0.06 * L.spec) { this.setPlan("smoke", 18); return; }
      if (d > 300) {
        if (me.stock > 0 && x < 0.3 + (1 - L.aggr) * 0.6) this.setPlan("shuri", 18);
        else this.setPlan("walk", think);
      } else if (d > 140) {
        if (me.stock > 0 && x < 0.1 + (1 - L.aggr) * 0.35) this.setPlan("shuri", 18);
        else if (x < 0.6) this.setPlan("walk", think);
        else if (x < 0.8) this.setPlan("jump", 34, { dir: 1, dbl: r() < 0.5, air: 18 });
        else this.setPlan("back", think);
      } else {
        if (x < L.aggr) this.setPlan("atk", 7 * 4 + 10, { n: 2 + (r() * 3 | 0) });
        else if (x < L.aggr + 0.2) this.setPlan("jump", 30, { dir: 1, dbl: r() < 0.4, air: 16 });
        else this.setPlan("back", think);
      }
    }
  };

  var AI = { CPU: CPU, LEVELS: LEVELS };
  if (typeof module !== "undefined" && module.exports) module.exports = AI;
  else root.SNAI = AI;
})(this);
