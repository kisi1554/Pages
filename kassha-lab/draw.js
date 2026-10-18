/* ============================================================
   かっしゃ ラボ — しくみの え（SVG）
   KasshaDraw.render(sys, opts) が <g> の なかみ（もじれつ）を かえす。
   たいけん・くみたて・もんだい の ぜんぶで おなじ え を つかう。
   opts:
     q       … じゆうど ごとの うごき（px、うえ＋）。KasshaSolver の D.list と おなじ じゅん
     D       … KasshaSolver.dofs(sys) の けっか（なければ つくる）
     spring  … {value, max} て の ところに ばねばかり を かく
     hooks   … true なら つかって いない フックも かく（くみたて）
     hl      … { id: true } ひかる もの
     labels  … true なら lab（60g・□g・A など）を かく
   ============================================================ */
(function (root) {
  "use strict";
  var S = root.KasshaSolver || (typeof require === "function" ? require("./solver.js") : null);
  var HOOK = S.HOOK;

  function f1(v) { return Math.round(v * 10) / 10; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // ---------- いま の いち ----------
  function geo(sys, opts) {
    var D = opts.D || S.dofs(sys), q = opts.q || [];
    var B = sys.bodies;
    function disp(id, x) { return S.dispOf(sys, D, id, x, q); }
    function center(id) { var b = B[id]; return { x: b.x, y: b.y - disp(id, b.x) }; }
    function barY(id, x) { return B[id].y - disp(id, x); }
    function wheelAng(id) { var a = D.at[id]; return a && a.t != null ? (q[a.t] || 0) : 0; }
    return { D: D, q: q, disp: disp, center: center, barY: barY, wheelAng: wheelAng };
  }

  // ひもの 点を え の ざひょうに する
  //   かえす: [{kind, x, y, cx, cy, r, entry, over, b}]
  function ropePoints(sys, G, pts) {
    var B = sys.bodies, out = [];
    var list = pts.slice();
    if (list.length && B[list[0].b] && B[list[0].b].t === "hand") list.reverse();
    // まず だいたいの いち（滑車は まんなか）
    var rough = list.map(function (p) {
      var b = B[p.b];
      if (b.t === "ceil") return { x: p.x, y: b.y };
      if (b.t === "fixed" || b.t === "move") {
        var c = G.center(p.b), w = S.wheelsOf(b)[p.w || 0];
        return { x: c.x + (p.hook ? 0 : w.dx), y: c.y };
      }
      if (b.t === "weight") { var cw = G.center(p.b); return { x: cw.x + (p.dx || 0), y: cw.y }; }
      if (b.t === "bar") return { x: p.x, y: G.barY(p.b, p.x) };
      if (b.t === "wheel") { var rad = p.on === "r" ? b.r : b.R; return { x: b.x + (p.s === "L" ? -rad : rad), y: b.y }; }
      if (b.t === "hand") return { x: null, y: b.y - G.disp(p.b, 0) };
      return { x: 0, y: 0 };
    });
    list.forEach(function (p, i) {
      var b = B[p.b], R = rough[i], o = { b: p.b, kind: "tie", x: R.x, y: R.y };
      if (b.t === "fixed" || b.t === "move") {
        var w = S.wheelsOf(b)[p.w || 0];
        if (p.hook) {
          var nb = rough[i === 0 ? 1 : i - 1];
          var top = nb ? nb.y < R.y : true;
          o.kind = "hook"; o.y = R.y + (top ? -(w.r + HOOK) : (w.r + HOOK)); o.top = top;
        } else {
          var prev = i > 0 ? out[i - 1] : null, next = rough[i + 1];
          o.kind = "wrap"; o.cx = R.x; o.cy = R.y; o.r = w.r;
          var px = prev ? prev.x : null;
          var entryL = p.s ? p.s === "L" : (px != null ? (px < R.x - 0.5 ? true : (px > R.x + 0.5 ? false : !(next && next.x != null && next.x < R.x))) : true);
          o.entry = entryL ? "L" : "R";
          o.over = prev ? prev.y > R.y : (next ? next.y > R.y : true);
          o.x = R.x + (entryL ? -w.r : w.r);          // はいる ところ
          o.x2 = R.x + (entryL ? w.r : -w.r);         // でる ところ
        }
      } else if (b.t === "hand") {
        var pv = out[i - 1];
        o.kind = "hand";
        o.x = pv ? (pv.kind === "wrap" ? pv.x2 : pv.x) : 0;
      }
      out.push(o);
    });
    return out;
  }

  function ropePath(P) {
    if (!P.length) return "";
    var d = "M" + f1(P[0].kind === "wrap" ? P[0].x2 : P[0].x) + " " + f1(P[0].y);
    for (var i = 1; i < P.length; i++) {
      var p = P[i];
      d += " L" + f1(p.x) + " " + f1(p.y);
      if (p.kind === "wrap" && i < P.length - 1) {
        var sweep = (p.over === (p.entry === "L")) ? 1 : 0;
        d += " A" + p.r + " " + p.r + " 0 0 " + sweep + " " + f1(p.x2) + " " + f1(p.y);
      }
    }
    return d;
  }

  // 滑車の まわった かくど（ひもが どれだけ とおったか から）
  function wrapTurns(sys, opts, rot) {
    var G0 = geo(sys, { D: opts.D, q: [] }), G1 = geo(sys, opts);
    sys.ropes.forEach(function (rope) {
      if (rope.pts.length < 3) return;
      var A = ropePoints(sys, G0, rope.pts), Bp = ropePoints(sys, G1, rope.pts);
      var acc = 0;
      for (var i = 1; i < A.length; i++) {
        acc += Math.abs(Bp[i].y - Bp[i - 1].y) - Math.abs(A[i].y - A[i - 1].y);
        var p = Bp[i];
        if (p.kind === "wrap" && i < A.length - 1) {
          var sign = p.over ? (p.entry === "L" ? -1 : 1) : (p.entry === "L" ? 1 : -1);
          var key = p.b + ":" + (rope.pts[i].w || 0);
          rot[key] = (rot[key] || 0) + sign * acc / p.r * 180 / Math.PI;
        }
      }
    });
  }

  function wheelSvg(cx, cy, r, ang, cls) {
    var s = '<g class="wheel ' + (cls || "") + '" transform="translate(' + f1(cx) + " " + f1(cy) + ')">';
    s += '<circle r="' + r + '" class="wh-out"/><circle r="' + (r - 4) + '" class="wh-in"/>';
    s += '<g transform="rotate(' + f1(ang || 0) + ')">';
    for (var k = 0; k < 3; k++) {
      var a = k * Math.PI / 3, dx = Math.cos(a) * (r - 6), dy = Math.sin(a) * (r - 6);
      s += '<line x1="' + f1(-dx) + '" y1="' + f1(-dy) + '" x2="' + f1(dx) + '" y2="' + f1(dy) + '" class="wh-sp"/>';
    }
    s += '</g><circle r="3.5" class="wh-ax"/></g>';
    return s;
  }

  function ring(x, y, cls) { return '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="5" class="ring ' + (cls || "") + '"/>'; }
  function text(x, y, s, cls, anchor) {
    return '<text x="' + f1(x) + '" y="' + f1(y) + '" class="' + (cls || "lab") + '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + esc(s) + "</text>";
  }
  function tag(x, y, s, cls) {
    var w = Math.max(30, String(s).length * 9 + 12);
    return '<g class="tag ' + (cls || "") + '"><rect x="' + f1(x - w / 2) + '" y="' + f1(y - 12) + '" width="' + w + '" height="22" rx="8"/>' +
      text(x, y + 4, s, "tag-t", "middle") + "</g>";
  }

  // ばねばかり（はりが うごく）
  function springSvg(x, y, dir, value, max) {
    var len = 74, w = 24, travel = 46;
    var y0 = dir > 0 ? y : y - len;               // dir>0: した に のびる
    var frac = Math.max(0, Math.min(1, (value || 0) / max));
    var s = '<g class="spring">';
    s += '<rect x="' + f1(x - w / 2) + '" y="' + f1(y0) + '" width="' + w + '" height="' + len + '" rx="6" class="sp-body"/>';
    var t0 = y0 + 14;
    for (var k = 0; k <= 6; k++) {
      var ty = dir > 0 ? t0 + travel * k / 6 : y0 + len - 14 - travel * k / 6;
      s += '<line x1="' + f1(x + 2) + '" y1="' + f1(ty) + '" x2="' + f1(x + (k % 3 === 0 ? 10 : 7)) + '" y2="' + f1(ty) + '" class="sp-tick"/>';
    }
    var py = dir > 0 ? t0 + travel * frac : y0 + len - 14 - travel * frac;
    // ばね（ジグザグ）
    var zz = "M" + f1(x - 4) + " " + f1(dir > 0 ? y0 + 6 : y0 + len - 6), n = 7;
    var za = dir > 0 ? y0 + 6 : y0 + len - 6, zb = py;
    for (var j = 1; j <= n; j++) zz += " L" + f1(x - 4 + (j % 2 ? -5 : 5)) + " " + f1(za + (zb - za) * j / n);
    s += '<path d="' + zz + '" class="sp-coil"/>';
    s += '<line x1="' + f1(x - 9) + '" y1="' + f1(py) + '" x2="' + f1(x + 10) + '" y2="' + f1(py) + '" class="sp-needle"/>';
    s += "</g>";
    return { svg: s, end: dir > 0 ? y0 + len : y0 };
  }

  function render(sys, opts) {
    opts = opts || {};
    var B = sys.bodies, G = geo(sys, opts), hl = opts.hl || {}, out = [], over = [];
    var ceil = null, used = {}, rot = {};
    Object.keys(B).forEach(function (id) { if (B[id].t === "ceil") ceil = B[id]; });
    var W = sys.w || 360;
    if (opts.q && opts.q.length) wrapTurns(sys, opts, rot);

    // てんじょう・ゆか
    if (ceil) {
      // よこに あまった ところ（がめんの はば が ちがう とき）まで のばす
      var hs = '<g class="ceil"><rect x="-600" y="-200" width="' + (W + 1200) + '" height="' + (ceil.y + 200) + '"/>';
      for (var hx = -600; hx < W + 600; hx += 16) hs += '<line x1="' + hx + '" y1="' + ceil.y + '" x2="' + (hx + 14) + '" y2="' + (ceil.y - 14) + '"/>';
      out.push(hs + '<line x1="-600" y1="' + ceil.y + '" x2="' + (W + 600) + '" y2="' + ceil.y + '" class="ceil-edge"/></g>');
    }
    if (sys.floor) out.push('<rect x="-600" y="' + sys.floor + '" width="' + (W + 1200) + '" height="300" class="floor"/>');
    if (opts.under) out.push(opts.under);

    // ひも
    var ropesSvg = [], handPts = [];
    sys.ropes.forEach(function (rope) {
      if (!rope.pts.length) return;
      var P = ropePoints(sys, G, rope.pts);
      P.forEach(function (p, i) {
        if (p.kind === "hook") used[p.b + (p.top ? ":top" : ":bot")] = true;
        if (p.kind === "hand") handPts.push({ p: p, prev: P[i - 1], rope: rope });
      });
      ropesSvg.push('<path d="' + ropePath(P) + '" class="rope ' + (rope.cls || "") + '"/>');
      P.forEach(function (p) { if (p.kind === "tie" && B[p.b].t === "ceil") ropesSvg.push(ring(p.x, p.y + 3, "knot")); });
      if (opts.labels && rope.lab && P.length > 1) {
        var k = rope.labAt || 0, a = P[k], b2 = P[k + 1];
        var ax = a.kind === "wrap" ? a.x2 : a.x;
        over.push(tag(ax + (rope.labDx != null ? rope.labDx : 18), (a.y + b2.y) / 2, rope.lab, "rope-lab"));
      }
    });

    // おもりを つるす ひも（hang）
    Object.keys(B).forEach(function (id) {
      var b = B[id];
      if (b.t !== "weight" || !b.hang) return;
      var h = B[b.hang], c = G.center(id), top;
      if (h.t === "move") { var hc = G.center(b.hang); top = { x: hc.x, y: hc.y + S.wheelsOf(h)[0].r + HOOK }; used[b.hang + ":bot"] = true; }
      else if (h.t === "bar") top = { x: b.x, y: G.barY(b.hang, b.x) };
      else top = G.center(b.hang);
      out.push('<line x1="' + f1(top.x) + '" y1="' + f1(top.y) + '" x2="' + f1(c.x) + '" y2="' + f1(c.y) + '" class="hang"/>');
    });

    // 滑車・輪軸・棒
    var bodiesSvg = [];
    Object.keys(B).forEach(function (id) {
      var b = B[id], cls = hl[id] ? "hl" : "";
      if (b.t === "fixed" || b.t === "move") {
        var c = G.center(id), ws = S.wheelsOf(b), r0 = ws[0].r;
        var s = '<g class="pulley ' + b.t + " " + cls + '" data-id="' + id + '">';
        if (b.t === "fixed" && ceil) {
          s += '<path d="M' + f1(c.x - 7) + " " + ceil.y + " L" + f1(c.x - 3) + " " + f1(c.y) + " L" + f1(c.x + 3) + " " + f1(c.y) + " L" + f1(c.x + 7) + " " + ceil.y + 'Z" class="frame"/>';
        }
        if (ws.length > 1) {
          var xa = c.x + ws[0].dx, xb = c.x + ws[ws.length - 1].dx;
          s += '<rect x="' + f1(xa - 4) + '" y="' + f1(c.y - 4) + '" width="' + f1(xb - xa + 8) + '" height="8" rx="4" class="frame"/>';
        }
        var botY = c.y + r0 + HOOK, topY = c.y - r0 - HOOK;
        if (used[id + ":bot"] || (opts.hooks && b.t === "move" && b.hookAt !== "top") || (opts.hooks && b.t === "fixed" && b.hookAt === "bot")) {
          s += '<rect x="' + f1(c.x - 3) + '" y="' + f1(c.y) + '" width="6" height="' + f1(r0 + HOOK - 5) + '" class="frame"/>' + ring(c.x, botY);
        }
        if (used[id + ":top"] || (opts.hooks && b.hookAt === "top")) {
          s += '<rect x="' + f1(c.x - 3) + '" y="' + f1(topY + 5) + '" width="6" height="' + f1(r0 + HOOK - 5) + '" class="frame"/>' + ring(c.x, topY);
        }
        ws.forEach(function (w, k) { s += wheelSvg(c.x + w.dx, c.y, w.r, rot[id + ":" + k], b.t); });
        s += "</g>";
        bodiesSvg.push(s);
        if (opts.labels && b.lab) over.push(tag(c.x + (b.labDx != null ? b.labDx : -(r0 + 26)), c.y + (b.labDy || 0), b.lab, "mass-lab"));
      } else if (b.t === "wheel") {
        var a = G.wheelAng(id) * 180 / Math.PI, s2 = '<g class="axle ' + cls + '">';
        if (ceil) s2 += '<path d="M' + f1(b.x - 10) + " " + ceil.y + " L" + f1(b.x - 3) + " " + b.y + " L" + f1(b.x + 3) + " " + b.y + " L" + f1(b.x + 10) + " " + ceil.y + 'Z" class="frame"/>';
        s2 += '<g transform="translate(' + b.x + " " + b.y + ')"><circle r="' + b.R + '" class="wa-big"/><g transform="rotate(' + f1(a) + ')">';
        for (var k2 = 0; k2 < 4; k2++) {
          var an = k2 * Math.PI / 4, dx = Math.cos(an) * (b.R - 5), dy = Math.sin(an) * (b.R - 5);
          s2 += '<line x1="' + f1(-dx) + '" y1="' + f1(-dy) + '" x2="' + f1(dx) + '" y2="' + f1(dy) + '" class="wh-sp"/>';
        }
        s2 += '</g><circle r="' + b.r + '" class="wa-small"/><circle r="3.5" class="wh-ax"/></g></g>';
        bodiesSvg.push(s2);
        if (opts.labels && b.labR) {
          over.push('<line x1="' + b.x + '" y1="' + b.y + '" x2="' + f1(b.x + b.R * 0.71) + '" y2="' + f1(b.y - b.R * 0.71) + '" class="dim"/>');
          over.push(tag(b.x + b.R * 0.71 + 20, b.y - b.R * 0.71 - 6, b.labR, "dim-lab"));
        }
        if (opts.labels && b.labr) {
          over.push('<line x1="' + b.x + '" y1="' + b.y + '" x2="' + f1(b.x - b.r) + '" y2="' + b.y + '" class="dim dim-s"/>');
          over.push(tag(b.x - b.R - 22, b.y + 2, b.labr, "dim-lab"));
        }
      } else if (b.t === "bar") {
        var ya = G.barY(id, b.x1), yb = G.barY(id, b.x2);
        bodiesSvg.push('<line x1="' + b.x1 + '" y1="' + f1(ya) + '" x2="' + b.x2 + '" y2="' + f1(yb) + '" class="bar ' + cls + '"/>');
        if (b.lever != null) {
          var ly = G.barY(id, b.lever);
          bodiesSvg.push('<path d="M' + b.lever + " " + f1(ly + 5) + " l-14 26 h28 Z" + '" class="fulcrum"/>');
        }
        if (opts.labels && b.marks) b.marks.forEach(function (mk) {
          var y = Math.min(ya, yb) - (mk[3] || 24);       // 棒の うえ に すんぽう
          over.push('<path d="M' + mk[0] + " " + (y - 5) + " v10 M" + mk[1] + " " + (y - 5) + " v10 M" + mk[0] + " " + y + " H" + mk[1] + '" class="dim"/>');
          over.push(tag((mk[0] + mk[1]) / 2, y + 1, mk[2], "dim-lab"));
        });
        if (opts.labels && b.lab) over.push(tag((b.x1 + b.x2) / 2, Math.max(ya, yb) + 22, b.lab, "mass-lab"));
      }
    });

    // おもり
    var wSvg = [];
    Object.keys(B).forEach(function (id) {
      var b = B[id];
      if (b.t !== "weight") return;
      var c = G.center(id), w = b.w || 50, h = b.h || 40, cls = hl[id] ? "hl" : "";
      var s = '<g class="weight ' + (b.cls || "") + " " + cls + '">';
      s += '<rect x="' + f1(c.x - w / 2) + '" y="' + f1(c.y + 4) + '" width="' + w + '" height="' + h + '" rx="7"/>';
      s += ring(c.x, c.y + 1, "w-ring");
      if (b.emoji) s += '<text x="' + f1(c.x) + '" y="' + f1(c.y + 4 + h * 0.72) + '" class="w-emoji" text-anchor="middle" font-size="' + Math.round(h * 0.7) + '">' + b.emoji + "</text>";
      else if (opts.labels !== false && b.lab != null) s += text(c.x, c.y + 4 + h / 2 + 6, b.lab, "w-lab", "middle");
      s += "</g>";
      wSvg.push(s);
      if (b.emoji && b.lab) over.push(tag(c.x, c.y + h + 18, b.lab, "w-tag"));
    });

    // て
    handPts.forEach(function (H) {
      var p = H.p, prev = H.prev, dir = prev && prev.y < p.y ? 1 : -1;  // 1: した に ひく
      var hb = B[p.b], hy = p.y, s = "";
      if (opts.spring) {
        var sp = springSvg(p.x, hy, dir, opts.spring.value, opts.spring.max);
        s += sp.svg; hy = sp.end;
      }
      var em = hb.emoji || (dir > 0 ? "✊" : "✊");
      s += '<text x="' + f1(p.x) + '" y="' + f1(hy + (dir > 0 ? 26 : -4)) + '" class="hand-em" text-anchor="middle">' + em + "</text>";
      bodiesSvg.push('<g class="hand">' + s + "</g>");
      if (opts.labels && hb.lab) {
        var ay = hy + (dir > 0 ? 34 : -34);
        var tip = ay + (dir > 0 ? 18 : -18);
        over.push('<path d="M' + f1(p.x) + " " + f1(ay) + " V" + f1(tip - dir * 6) + '" class="arrow"/>' +
          '<path d="M' + f1(p.x - 6) + " " + f1(tip - dir * 8) + " L" + f1(p.x) + " " + f1(tip) + " L" + f1(p.x + 6) + " " + f1(tip - dir * 8) + 'Z" class="arrow-h"/>');
        var tw = Math.max(30, String(hb.lab).length * 9 + 12);
        var side = p.x + 26 + tw > W ? -1 : 1;
        over.push(tag(p.x + (hb.labDx != null ? hb.labDx : side * (22 + tw / 2)), hy + (dir > 0 ? 16 : -14), hb.lab, "hand-lab"));
      }
    });

    return out.join("") + ropesSvg.join("") + wSvg.join("") + bodiesSvg.join("") + over.join("") + (opts.over || "");
  }

  var api = { render: render, ropePoints: ropePoints, geo: geo, springSvg: springSvg };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KasshaDraw = api;
})(this);
