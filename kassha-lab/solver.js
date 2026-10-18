/* ============================================================
   かっしゃ ラボ — つりあいの ソルバー
   ・ひもは たて（まっすぐ うえ・した）と みなす。まさつ なし、ひもの おもさ なし
   ・ひも 1本の ちから（張力）は どこでも おなじ
   ・うごける もの（動滑車・おもり・棒・輪軸・て）の 「うごき」を じゆうど q に して、
     ひもの ながさ L_r(q) が いくら かわるか（C = ∂L/∂q）を しらべる
       つりあい（仮想仕事）:  Σ_r C[r][j]·T_r = G_j   （G_j = −Σ m·∂y/∂q_j、うえ＋）
       ひく ながさ（拘束）:    Σ_j C[r][j]·dq_j = 0    （ひもの 全長は いつも おなじ）
     → おなじ C から ちからと ながさを だすので「しごとの げんり」が かならず なりたつ
   ・ひもが 何本 あっても 連立方程式 として とく（ガウスの 消去法）

   sys = {
     bodies: { id: { t: 種類, x, y, ... } },
       ceil   … 天井（y）。ひもの はしを {b, x} で むすぶ
       fixed  … 定滑車（x, y, r, m）。天井に とめて ある
       move   … 動滑車（x, y, r, m）。wheels: [{dx, r}] で 車を ふやせる（2れん）
       weight … おもり（x, y=うえの へり, m）。hang: id で ほかの ものに つるす
       bar    … 棒（x1, x2, y, m）。lever: x を 書くと そこが 支点の てこ
       wheel  … 輪軸（x, y, R, r）。天井に とめて ある
       hand   … て（y）。ひもの はしを もって ひく
     ropes: [ { id, pts: [ 点, 点, ... ] } ]
       点 = {b} 滑車の 車に かける（はし いがい）/ {b, hook:1} フックに むすぶ /
            {b:"天井", x} / {b:"棒", x} / {b:"輪軸", on:"R"|"r", s:"L"|"R"} / {b:"おもり", dx}
   }
   ブラウザでは window.KasshaSolver、node では module.exports。
   ============================================================ */
(function (root) {
  "use strict";
  var EPS = 1e-9;
  var HOOK = 10;            // 滑車の フックまでの きょり（はんけい の そと）

  function wheelsOf(b) { return b.wheels || [{ dx: 0, r: b.r || 20 }]; }
  function isPulley(b) { return b.t === "fixed" || b.t === "move"; }

  function add(map, k, v) { if (v) map[k] = (map[k] || 0) + v; }

  // ---------- じゆうど と 「点の うごき」 ----------
  function dofsOf(sys) {
    var B = sys.bodies, list = [], at = {};
    Object.keys(B).forEach(function (id) {
      var b = B[id];
      if (b.t === "move" || b.t === "hand" || (b.t === "weight" && !b.hang)) { at[id] = { y: list.length }; list.push({ b: id, k: "y" }); }
      else if (b.t === "bar" && b.lever == null) { at[id] = { y: list.length, t: list.length + 1 }; list.push({ b: id, k: "y" }, { b: id, k: "t" }); }
      else if (b.t === "bar" || b.t === "wheel") { at[id] = { t: list.length }; list.push({ b: id, k: "t" }); }
    });
    return { list: list, at: at };
  }

  // id の ものの、よこ x の ところが うえに どれだけ うごくか（じゆうど ごとの けいすう）
  function coef(sys, D, id, x, seen) {
    var b = sys.bodies[id], out = {}, a = D.at[id];
    if (!b) throw new Error("ない もの: " + id);
    if (b.t === "weight" && b.hang) {
      seen = seen || {};
      if (seen[id]) throw new Error("つるす じゅんばんが ループ: " + id);
      seen[id] = 1;
      return coef(sys, D, b.hang, b.x, seen);
    }
    if (b.t === "move" || b.t === "hand" || b.t === "weight") add(out, a.y, 1);
    else if (b.t === "bar") {
      if (b.lever == null) { add(out, a.y, 1); add(out, a.t, x - (b.x1 + b.x2) / 2); }
      else add(out, a.t, x - b.lever);
    }
    return out;
  }

  // ひもの 点の いち（SVG：y は した＋）と、その 点の うごき
  function pointInfo(sys, D, p) {
    var b = sys.bodies[p.b];
    if (!b) throw new Error("ない もの: " + p.b);
    var kind, x, y, c;
    if (b.t === "ceil") { kind = "tie"; x = p.x; y = b.y; c = {}; }
    else if (isPulley(b)) {
      var w = wheelsOf(b)[p.w || 0];
      if (p.hook) { kind = "hook"; x = b.x; y = b.y; }
      else { kind = "wrap"; x = b.x + w.dx; y = b.y; }
      c = coef(sys, D, p.b, b.x);
    } else if (b.t === "weight") { kind = "tie"; x = b.x + (p.dx || 0); y = b.y; c = coef(sys, D, p.b, b.x); }
    else if (b.t === "bar") { kind = "tie"; x = p.x; y = b.y; c = coef(sys, D, p.b, p.x); }
    else if (b.t === "wheel") {
      var rad = p.on === "r" ? b.r : b.R, s = p.s === "L" ? 1 : -1;
      kind = "tie"; x = b.x + (p.s === "L" ? -rad : rad); y = b.y; c = {}; add(c, D.at[p.b].t, s * rad);
    } else if (b.t === "hand") { kind = "hand"; x = null; y = b.y; c = coef(sys, D, p.b, 0); }
    else throw new Error("ひもを かけられない: " + p.b);
    return { kind: kind, b: p.b, x: x, y: y, c: c, p: p };
  }

  // ---------- ひもの かたちを しらべる ----------
  function ropeShape(sys, D, rope) {
    var P = rope.pts.map(function (p) { return pointInfo(sys, D, p); });
    var n = P.length, err = null;
    if (n < 2) return { err: "short" };
    P.forEach(function (q, i) {
      var end = i === 0 || i === n - 1;
      if (end && q.kind === "wrap") err = err || "wrapEnd";
      if (!end && q.kind !== "wrap") err = err || "midTie";
    });
    if (err) return { err: err };
    // て は はしの となりの 点の はんたいがわ（滑車に かけたら くるっと まわる）
    var segs = [];
    for (var i = 0; i < n - 1; i++) {
      var A = P[i], Bp = P[i + 1], up;
      if (A.kind === "hand" || Bp.kind === "hand") {
        var o = A.kind === "hand" ? Bp : A, hand = A.kind === "hand" ? A : Bp;
        up = hand.y < o.y ? (A === hand ? 0 : 1) : (A === hand ? 1 : 0);
      } else {
        if (Math.abs(A.y - Bp.y) < EPS) return { err: "flat", at: i };
        up = A.y < Bp.y ? 0 : 1;     // 0: A が うえ
      }
      segs.push({ a: i, b: i + 1, upper: up === 0 ? i : i + 1, lower: up === 0 ? i + 1 : i });
    }
    // 滑車に かける ところは、りょうどなりが どちらも うえ か どちらも した
    for (var k = 1; k < n - 1; k++) {
      var before = segs[k - 1].upper === k, after = segs[k].upper === k;   // true: この 点が うえ
      if (before !== after) return { err: "wrapSide", at: k };
      P[k].over = before;             // 定滑車 ふう（うえを とおる）
    }
    return { P: P, segs: segs };
  }

  // ---------- 連立方程式（はばの ある 行列も OK） ----------
  // A x = b を とく。rank と ふごうごう（つりあわない）も かえす
  function linsolve(A, b, ncol) {
    var m = A.length, M = A.map(function (row, i) { return row.slice().concat([b[i]]); });
    var piv = [], r = 0;
    for (var c = 0; c < ncol && r < m; c++) {
      var best = r;
      for (var i = r + 1; i < m; i++) if (Math.abs(M[i][c]) > Math.abs(M[best][c])) best = i;
      if (Math.abs(M[best][c]) < 1e-9) continue;
      var t = M[r]; M[r] = M[best]; M[best] = t;
      for (var i2 = 0; i2 < m; i2++) {
        if (i2 === r) continue;
        var f = M[i2][c] / M[r][c];
        if (f) for (var c2 = c; c2 <= ncol; c2++) M[i2][c2] -= f * M[r][c2];
      }
      piv.push(c); r++;
    }
    var scale = 1;
    b.forEach(function (v) { scale = Math.max(scale, Math.abs(v)); });
    for (var i3 = r; i3 < m; i3++) if (Math.abs(M[i3][ncol]) > 1e-7 * scale) return { rank: r, bad: true };
    var x = new Array(ncol).fill(0);
    piv.forEach(function (c3, i4) { x[c3] = M[i4][ncol] / M[i4][c3]; });
    return { rank: r, x: x, bad: false };
  }

  // ---------- とく ----------
  function solve(sys) {
    var D, shapes = [], err = null;
    try {
      D = dofsOf(sys);
      sys.ropes.forEach(function (rope) {
        var s = ropeShape(sys, D, rope);
        if (s.err && !err) err = { code: s.err, rope: rope.id, at: s.at };
        shapes.push(s);
      });
    } catch (e) { return { ok: false, err: { code: "data", msg: e.message } }; }
    if (err) return { ok: false, err: err };

    var nd = D.list.length, nr = sys.ropes.length;
    var handIds = Object.keys(sys.bodies).filter(function (id) { return sys.bodies[id].t === "hand"; });
    var handDof = handIds.length ? D.at[handIds[0]].y : -1;
    var handUse = 0, handRope = -1;

    // C[r][j]: ひも r の ながさが、じゆうど j が 1 うごくと どれだけ かわるか
    var C = shapes.map(function (s, r) {
      var row = new Array(nd).fill(0);
      s.segs.forEach(function (g) {
        var U = s.P[g.upper].c, L = s.P[g.lower].c;
        Object.keys(U).forEach(function (j) { row[j] += U[j]; });
        Object.keys(L).forEach(function (j) { row[j] -= L[j]; });
      });
      s.P.forEach(function (q) { if (q.kind === "hand") { handUse++; handRope = r; } });
      return row;
    });
    if (handIds.length > 1 || handUse > 1) return { ok: false, err: { code: "hand2" } };
    if (handIds.length && handUse === 0) return { ok: false, err: { code: "noHand" } };

    // おもさ による ちから（うえ＋）
    var G = new Array(nd).fill(0);
    Object.keys(sys.bodies).forEach(function (id) {
      var b = sys.bodies[id];
      if (!b.m || b.t === "fixed" || b.t === "ceil" || b.t === "wheel") return;
      var mx = b.t === "bar" ? (b.mx != null ? b.mx : (b.x1 + b.x2) / 2) : b.x;
      var c = coef(sys, D, id, mx);
      Object.keys(c).forEach(function (j) { G[j] -= b.m * c[j]; });
    });

    var rows = [], rhs = [], mov = [];
    for (var j = 0; j < nd; j++) if (j !== handDof) {
      mov.push(j);
      rows.push(C.map(function (row) { return row[j]; }));
      rhs.push(G[j]);
    }
    var sol = linsolve(rows, rhs, nr);
    if (sol.bad) return { ok: false, err: { code: "fall" } };            // つりあわない（おちる・まわる）
    if (sol.rank < nr) return { ok: false, err: { code: "many" } };     // ひもの ちからが きまらない
    if (mov.length > nr) {
      // うごきかたが ひとつに きまらない（ぐらぐら）
      return { ok: false, err: { code: "wobble" } };
    }
    var T = sol.x;
    for (var r = 0; r < nr; r++) if (T[r] < -1e-7) return { ok: false, err: { code: "slack", rope: sys.ropes[r].id } };

    var res = { ok: true, sys: sys, D: D, shapes: shapes, C: C, T: {}, tension: T.map(function (v) { return Math.abs(v) < 1e-9 ? 0 : v; }) };
    sys.ropes.forEach(function (rope, i) { res.T[rope.id] = res.tension[i]; });

    // ひく ながさ: て を 1 ひくと、じゆうど が どれだけ うごくか
    res.k = new Array(nd).fill(0);
    if (handDof >= 0) {
      var ch = C[handRope][handDof];           // ±1。て が した なら −1
      res.handRope = sys.ropes[handRope].id;
      res.hand = res.tension[handRope];
      res.handDir = ch < 0 ? "down" : "up";
      var dqh = ch;                            // ひもを 1 ひきだす
      var K = C.map(function (row) { return mov.map(function (j) { return row[j]; }); });
      var b2 = C.map(function (row) { return -row[handDof] * dqh; });
      var kin = linsolve(K, b2, mov.length);
      if (kin.bad || kin.rank < mov.length) return { ok: false, err: { code: "wobble" } };
      mov.forEach(function (j, i) { res.k[j] = kin.x[i]; });
      res.k[handDof] = dqh;
    }
    return res;
  }

  // ---------- けっかの よみだし ----------
  // うえへの うごき（て を 1 ひいたとき）
  function liftOf(res, id, x) {
    var c = coef(res.sys, res.D, id, x != null ? x : res.sys.bodies[id].x), s = 0;
    Object.keys(c).forEach(function (j) { s += c[j] * res.k[j]; });
    return s;
  }
  // じゆうど q（px、うえ＋）の ときの 点の うごき
  function dispOf(sys, D, id, x, q) {
    var c = coef(sys, D, id, x), s = 0;
    Object.keys(c).forEach(function (j) { s += c[j] * (q[j] || 0); });
    return s;
  }

  // とめて ある もの（定滑車・輪軸・天井）が ささえる ちから（した むき＋）
  function supportOf(res, id) {
    var sys = res.sys, b = sys.bodies[id], s = 0;
    res.shapes.forEach(function (sh, r) {
      sh.segs.forEach(function (g) {
        if (sh.P[g.upper].b === id) s += res.tension[r];
        if (sh.P[g.lower].b === id) s -= res.tension[r];
      });
    });
    if (b.t === "ceil") {
      Object.keys(sys.bodies).forEach(function (k) {
        var o = sys.bodies[k];
        if (o.t === "fixed" || o.t === "wheel") s += supportOf(res, k);
      });
      return s;
    }
    return s + (b.m || 0);
  }

  // もんだいの 「□」を だす
  //   {q:"hand"} {q:"T", rope} {q:"lift", b, pull} {q:"pull", b, lift} {q:"support", b}
  //   {q:"param", path:"bodies.w.m", target:{...}, value, origin, scale}  … ぎゃくに たどる
  function getPath(o, path) { return path.split(".").reduce(function (a, k) { return a[k]; }, o); }
  function setPath(o, path, v) {
    var ks = path.split("."), last = ks.pop();
    ks.reduce(function (a, k) { return a[k]; }, o)[last] = v;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function ask(sys, a) {
    if (a.q === "param") {
      // f(v) = target − value を 0 に する v を セカント法で さがす（1じ なら 2かいで ぴったり）
      var f = function (v) { var s = clone(sys); setPath(s, a.path, v); var r = ask(s, a.target); return r == null ? NaN : r - a.value; };
      var v0 = getPath(sys, a.path), v1 = v0 + 10, f0 = f(v0), f1 = f(v1);
      for (var it = 0; it < 60 && Math.abs(f1) > 1e-10; it++) {
        if (!isFinite(f0) || !isFinite(f1) || f1 === f0) return null;
        var v2 = v1 - f1 * (v1 - v0) / (f1 - f0);
        v0 = v1; f0 = f1; v1 = v2; f1 = f(v1);
      }
      if (!isFinite(f1) || Math.abs(f1) > 1e-6) return null;
      return (v1 - (a.origin || 0)) * (a.scale || 1);
    }
    var res = solve(sys);
    if (!res.ok) return null;
    if (a.q === "hand") return res.hand;
    if (a.q === "T") return res.T[a.rope];
    if (a.q === "support") return supportOf(res, a.b);
    if (a.q === "lift") return liftOf(res, a.b) * a.pull;
    if (a.q === "pull") return a.lift / liftOf(res, a.b);
    throw new Error("しらない とい: " + a.q);
  }

  var api = { dofs: dofsOf, solve: solve, ask: ask, liftOf: liftOf, dispOf: dispOf, coef: coef, supportOf: supportOf, wheelsOf: wheelsOf, HOOK: HOOK, clone: clone };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KasshaSolver = api;
})(this);
