/* ============================================================
   ずけい の どうぐ
   dotgrid: てん を むすんで 三角形・四角形 を かく（直角 に しるし）
   box    : はこ を ゆび で まわす・面 を タップ で かぞえる・ひらく
   fold   : かみ を おって 分数
   tape   : テープ図（ぜんたい・ぶぶん を タップ）
   solids : つつ・はこ・さいころ・ボール を ころがす・つむ・うつしとる
   ============================================================ */
(function (SD) {
  "use strict";

  SD.tool("dotgrid", function (host, cfg) {
    var C = cfg.cols || 6, Rr = cfg.rows || 5, g = 52, W = C * g + 10, H = Rr * g + 10, pts = [], closed = false, showRight = false, svg;
    var P = function (p) { return [5 + p[0] * g + g / 2, 5 + p[1] * g + g / 2]; };
    function draw() {
      svg = SD.mkSvg(host, W, H, "dotgrid");
      if (pts.length) {
        var d = pts.map(function (p, i) { var q = P(p); return (i ? "L" : "M") + q[0] + " " + q[1]; }).join("") + (closed ? "Z" : "");
        SD.el("path", { d: d, fill: closed ? "#ffe8cc" : "none", stroke: "#e8590c", "stroke-width": 4, "stroke-linejoin": "round" }, svg);
        if (closed) SD.rightCorners(pts).forEach(function (k) {
          var n = pts.length, b = P(pts[k]), a = P(pts[(k + n - 1) % n]), c = P(pts[(k + 1) % n]);
          var u = [(a[0] - b[0]), (a[1] - b[1])], w = [(c[0] - b[0]), (c[1] - b[1])], lu = Math.hypot(u[0], u[1]), lw = Math.hypot(w[0], w[1]), s = 13;
          u = [u[0] / lu * s, u[1] / lu * s]; w = [w[0] / lw * s, w[1] / lw * s];
          SD.el("path", { d: "M" + (b[0] + u[0]) + " " + (b[1] + u[1]) + " l" + w[0] + " " + w[1] + " l" + (-u[0]) + " " + (-u[1]), fill: "none", stroke: showRight ? "#c92a2a" : "#1c7ed6", "stroke-width": showRight ? 4 : 2.5 }, svg);
        });
      }
      for (var y = 0; y < Rr; y++) for (var x = 0; x < C; x++) {
        var q = P([x, y]), used = pts.some(function (p) { return p[0] === x && p[1] === y; }), first = pts.length && pts[0][0] === x && pts[0][1] === y && !closed;
        SD.el("circle", { cx: q[0], cy: q[1], r: first ? 11 : used ? 8 : 6, fill: first ? "#2f9e44" : used ? "#e8590c" : "#adb5bd", class: "dot", "data-x": x, "data-y": y }, svg);
      }
      if (closed) {
        var nm = { tri: "{三角形|さんかくけい}", righttri: "{直角三角形|ちょっかくさんかくけい}", rect: "{長方形|ちょうほうけい}", square: "{正方形|せいほうけい}", quad: "{四角形|しかくけい}", poly: "かど が たくさん の かたち", "": "かたち に なって いないよ" }[SD.classify(pts)];
        lab.innerHTML = SD.h(nm);
      } else lab.textContent = pts.length ? "はじめ の ● に もどると とじるよ" : "てん を タップ";
    }
    var lab = document.createElement("div"); lab.className = "rulerlab";
    function tap(x, y) {
      if (closed) return;
      if (pts.length >= 3 && pts[0][0] === x && pts[0][1] === y) { closed = true; SD.sfx("kira"); draw(); return; }
      var last = pts[pts.length - 1];
      if (last && last[0] === x && last[1] === y) return;
      if (pts.some(function (p) { return p[0] === x && p[1] === y; })) { SD.sfx("bu"); return; }
      pts.push([x, y]); SD.sfx("poko"); draw();
    }
    function onDown(ev) {
      ev.preventDefault();
      var p = SD.svgPt(svg, ev), x = Math.round((p.x - 5 - g / 2) / g), y = Math.round((p.y - 5 - g / 2) / g);
      if (x < 0 || y < 0 || x >= C || y >= Rr) return;
      var q = P([x, y]); if (Math.hypot(q[0] - p.x, q[1] - p.y) > g * 0.45) return;
      tap(x, y);
    }
    host.addEventListener("pointerdown", onDown);
    draw();
    var btns = SD.toolBtns(host, [["けす", function () { pts = []; closed = false; showRight = false; draw(); }]]);
    btns.insertBefore(lab, btns.firstChild);
    return {
      value: function () { return closed ? SD.classify(pts) : ""; },
      set: function (v) { pts = (SD.SHAPES[v] || SD.SHAPES.tri)[0].map(function (p) { return p.slice(); }); closed = true; draw(); },
      act: function (name, list) {
        if (name === "draw") {
          pts = []; closed = false; showRight = false; draw();
          var p = Promise.resolve();
          list.concat([list[0]]).forEach(function (q) { p = p.then(function () { tap(q[0], q[1]); return SD.wait(450); }); });
          return p.then(function () { return SD.wait(600); });
        }
        if (name === "right") { showRight = true; draw(); return SD.wait(1200); }
        return SD.wait(600);
      },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; btns.remove(); }
    };
  });

  /* ---- はこ ---- */
  var FACE_COL = ["#ffc9c9", "#a5d8ff", "#b2f2bb", "#ffec99", "#d0bfff", "#ffd8a8"];
  SD.tool("box", function (host, cfg) {
    var w = cfg.w || 4, h = cfg.h || 2, d = cfg.d || 3, yaw = -0.6, pitch = 0.45, num = {}, cnt = 0, open = !!cfg.open, W = 340, H = 250, svg, drag = null;
    var V = [];
    [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sy) { [-1, 1].forEach(function (sz) { V.push([sx * w / 2, sy * h / 2, sz * d / 2]); }); }); });
    // V の ばんごう: (sx,sy,sz) = (-,-,-)0 (-,-,+)1 (-,+,-)2 (-,+,+)3 (+,-,-)4 (+,-,+)5 (+,+,-)6 (+,+,+)7
    var F = [[1, 5, 7, 3], [4, 0, 2, 6], [5, 4, 6, 7], [0, 1, 3, 2], [3, 7, 6, 2], [0, 4, 5, 1]];
    var k = Math.min(36, 150 / Math.max(w, h, d));
    function proj(p) {
      var x = p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw), z = -p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw);
      var y = p[1] * Math.cos(pitch) - z * Math.sin(pitch), z2 = p[1] * Math.sin(pitch) + z * Math.cos(pitch);
      return [W / 2 + x * k, H / 2 - y * k, z2];
    }
    function draw() {
      svg = SD.mkSvg(host, W, H, "boxtool");
      if (open) return drawNet();
      var P2 = V.map(proj);
      F.map(function (f, i) {
        var a = P2[f[0]], b = P2[f[1]], c = P2[f[2]];
        var nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        return { i: i, f: f, vis: nz < 0, z: f.reduce(function (s, j) { return s + P2[j][2]; }, 0) };
      }).filter(function (o) { return o.vis; }).sort(function (a, b) { return a.z - b.z; }).forEach(function (o) {
        var pts = o.f.map(function (j) { return P2[j][0].toFixed(1) + "," + P2[j][1].toFixed(1); }).join(" ");
        var g = SD.el("g", { class: "face", "data-f": o.i }, svg);
        SD.el("polygon", { points: pts, fill: num[o.i] ? FACE_COL[o.i] : "#fff4e6", stroke: "#8b5e3c", "stroke-width": 3, "stroke-linejoin": "round" }, g);
        if (num[o.i]) {
          var cx = o.f.reduce(function (s, j) { return s + P2[j][0]; }, 0) / 4, cy = o.f.reduce(function (s, j) { return s + P2[j][1]; }, 0) / 4;
          SD.el("text", { x: cx, y: cy, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 24, "font-weight": "bold", fill: "#3b2a1e" }, g, num[o.i]);
        }
      });
      lab.textContent = cnt ? "めん " + cnt + "まい かぞえた" : "ゆび で まわす・めん を タップ";
    }
    function drawNet() {
      // じゅうじ の ひらきかた: うえ(4)・ひだり(3)・まえ(0)・みぎ(2)・うしろ(1)・した(5)
      var s = 22, cells = [[4, 1, 0, w, d], [3, 0, 1, d, h], [0, 1, 1, w, h], [2, 2, 1, d, h], [1, 3, 1, w, h], [5, 1, 2, w, d]];
      var colX = [0, d, d + w, d + w + d], rowY = [0, d, d + h];
      var totalW = (d * 2 + w * 2) * s, ox = (W - totalW) / 2, oy = (H - (d * 2 + h) * s) / 2;
      cells.forEach(function (c) {
        var x = ox + colX[c[1]] * s, y = oy + rowY[c[2]] * s;
        SD.el("rect", { x: x, y: y, width: c[3] * s, height: c[4] * s, fill: num[c[0]] ? FACE_COL[c[0]] : "#fff4e6", stroke: "#8b5e3c", "stroke-width": 2.5, class: "pop" }, svg);
        if (num[c[0]]) SD.el("text", { x: x + c[3] * s / 2, y: y + c[4] * s / 2, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 18, "font-weight": "bold" }, svg, num[c[0]]);
      });
      lab.textContent = "ひらいた かたち（めん 6まい）";
    }
    var lab = document.createElement("div"); lab.className = "rulerlab";
    function count(i) { if (num[i]) return; cnt++; num[i] = cnt; SD.sfx("poko"); draw(); }
    function onDown(ev) {
      ev.preventDefault();
      drag = { x: ev.clientX, y: ev.clientY, moved: 0, f: ev.target.closest && ev.target.closest(".face") };
      try { host.setPointerCapture(ev.pointerId); } catch (e) { /* なくても うごく */ }
    }
    function onMove(ev) {
      if (!drag || open) return;
      ev.preventDefault();
      var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = ev.clientX; drag.y = ev.clientY;
      yaw += dx * 0.012; pitch = Math.max(-1.3, Math.min(1.3, pitch + dy * 0.012)); draw();
    }
    function onUp() { if (drag && drag.moved < 8 && drag.f && !open) count(+drag.f.getAttribute("data-f")); drag = null; }
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    draw();
    var btns = SD.toolBtns(host, [["📂 ひらく／とじる", function () { open = !open; T.wasOpen = T.wasOpen || open; SD.sfx("swish"); draw(); }], ["けす", function () { num = {}; cnt = 0; draw(); }]]);
    btns.insertBefore(lab, btns.firstChild);
    var spinTo = function (ty, tp, ms) {
      var y0 = yaw, p0 = pitch, steps = 16, p = Promise.resolve();
      for (var i = 1; i <= steps; i++) (function (i) { p = p.then(function () { yaw = y0 + (ty - y0) * i / steps; pitch = p0 + (tp - p0) * i / steps; draw(); return SD.wait(ms / steps); }); })(i);
      return p;
    };
    var T = {
      wasOpen: open,
      value: function () { return cnt; },
      opened: function () { return T.wasOpen; },
      set: function () { for (var i = 0; i < 6; i++) count(i); },
      act: function (name) {
        if (name === "countFaces") {
          var order = [[0, -0.6, 0.45], [2, -0.6, 0.45], [4, -0.6, 0.45], [1, 2.5, -0.45], [3, 2.5, -0.45], [5, 2.5, -0.45]], p = Promise.resolve();
          order.forEach(function (o) { p = p.then(function () { return spinTo(o[1], o[2], 300); }).then(function () { count(o[0]); return SD.wait(350); }); });
          return p.then(function () { return spinTo(-0.6, 0.45, 400); });
        }
        if (name === "spin") return spinTo(yaw + Math.PI * 2, pitch, 1600);
        if (name === "open") { open = true; T.wasOpen = true; SD.sfx("swish"); draw(); return SD.wait(1200); }
        return SD.wait(600);
      },
      destroy: function () { ["pointerdown", "pointermove", "pointerup", "pointercancel"].forEach(function (e, i) { host.removeEventListener(e, [onDown, onMove, onUp, onUp][i]); }); host.innerHTML = ""; btns.remove(); }
    };
    return T;
  });

  /* ---- かみ を おる（分数） ---- */
  SD.tool("fold", function (host, cfg) {
    var shape = cfg.shape || "square", k = 1, paint = {}, W = 340, H = shape === "tape" ? 120 : 200, svg;
    function parts() {
      var out = [];
      if (shape === "tape") { var x0 = 20, L = 300; for (var i = 0; i < k; i++) out.push([x0 + i * L / k, 40, L / k, 44]); }
      else {
        var S = 160, x = (W - S) / 2, y = 20;
        if (k === 1) out.push([x, y, S, S]);
        if (k === 2) out.push([x, y, S / 2, S], [x + S / 2, y, S / 2, S]);
        if (k === 4) out.push([x, y, S / 2, S / 2], [x + S / 2, y, S / 2, S / 2], [x, y + S / 2, S / 2, S / 2], [x + S / 2, y + S / 2, S / 2, S / 2]);
      }
      return out;
    }
    function draw(anim) {
      svg = SD.mkSvg(host, W, H, "foldtool");
      parts().forEach(function (r, i) {
        SD.el("rect", { x: r[0], y: r[1], width: r[2], height: r[3], fill: paint[i] ? "#ffa94d" : "#fff", stroke: "#8b5e3c", "stroke-width": 2.5, class: "part" + (anim ? " pop" : ""), "data-i": i, "stroke-dasharray": k > 1 ? "" : "" }, svg);
      });
      var c = Object.keys(paint).length;
      lab.innerHTML = k === 1 ? "おって みよう" : "おなじ 大きさ " + k + "つ の うち " + c + "つ" + (c ? " ＝ " + SD.frac(c, k) : "");
    }
    var lab = document.createElement("div"); lab.className = "rulerlab";
    function onDown(ev) {
      var t = ev.target.closest && ev.target.closest(".part"); if (!t || k === 1) return;
      ev.preventDefault();
      var i = +t.getAttribute("data-i"); if (paint[i]) delete paint[i]; else paint[i] = 1;
      SD.sfx("poko"); draw();
    }
    function fold(n) {
      if (n === 3 ? k !== 1 : k !== 1 && k !== 2) { SD.sfx("bu"); return false; }
      k = n === 3 ? 3 : k * 2;
      paint = {}; SD.sfx("swish"); draw(true); return true;
    }
    host.addEventListener("pointerdown", onDown);
    draw();
    var list = [["📄 はんぶん に おる", function () { fold(2); }]];
    if (shape === "tape") list.push(["3つ に おる", function () { fold(3); }]);
    list.push(["↺ ひろげる", function () { k = 1; paint = {}; draw(true); }]);
    var btns = SD.toolBtns(host, list);
    btns.insertBefore(lab, btns.firstChild);
    return {
      value: function () { var c = Object.keys(paint).length; return c ? c + "/" + k : ""; },
      set: function (v) { var s = String(v).split("/"); k = +s[1]; paint = {}; for (var i = 0; i < +s[0]; i++) paint[i] = 1; draw(); },
      act: function (name, n) {
        if (name === "fold") { fold(2); return SD.wait(900); }
        if (name === "paint") { paint = {}; for (var i = 0; i < n; i++) paint[i] = 1; SD.sfx("poko"); draw(); return SD.wait(1000); }
        return SD.wait(600);
      },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; btns.remove(); }
    };
  });

  /* ---- テープ図 ---- */
  SD.tool("tape", function (host, cfg) {
    var sel = null, W = 340, svg;
    function draw() {
      host.innerHTML = SD.pics.tape(cfg.parts.map(function (p) { return { w: p.w, label: p.label, q: p.q }; }), cfg.whole).replace('class="pic tape"', 'class="tool tapetool"');
      svg = host.querySelector("svg");
      var tot = cfg.parts.reduce(function (s, p) { return s + p.w; }, 0), k = 300 / tot, x = 20;
      cfg.parts.forEach(function (p, i) {
        var id = p.q ? "q" : "p" + i;
        SD.el("rect", { x: x, y: 26, width: p.w * k, height: 38, fill: sel === id ? "#ffd43b55" : "transparent", stroke: sel === id ? "#f08c00" : "none", "stroke-width": 4, class: "hitp", "data-id": id }, svg);
        x += p.w * k;
      });
      SD.el("rect", { x: 20, y: 66, width: 300, height: 48, fill: sel === "whole" ? "#ffd43b55" : "transparent", stroke: sel === "whole" ? "#f08c00" : "none", "stroke-width": 4, rx: 8, class: "hitp", "data-id": "whole" }, svg);
    }
    function onDown(ev) { var t = ev.target.closest && ev.target.closest(".hitp"); if (!t) return; ev.preventDefault(); sel = t.getAttribute("data-id"); SD.sfx("poko"); draw(); }
    host.addEventListener("pointerdown", onDown);
    draw();
    return {
      value: function () { return sel; },
      set: function (v) { sel = v; draw(); },
      act: function (name, v) { if (name === "show") { sel = v; SD.sfx("poko"); draw(); } return SD.wait(900); },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; }
    };
  });

  /* ---- つつ・はこ・さいころ・ボール ---- */
  var SOL = ["tsutsu", "hako", "sai", "ball"];
  var drawSolid = function (id, g) {
    if (id === "tsutsu") g.innerHTML = '<rect x="-24" y="-30" width="48" height="56" fill="#ffc9c9" stroke="#c92a2a" stroke-width="2.5"/><ellipse cx="0" cy="26" rx="24" ry="8" fill="#ffc9c9" stroke="#c92a2a" stroke-width="2.5"/><ellipse cx="0" cy="-30" rx="24" ry="8" fill="#ffe3e3" stroke="#c92a2a" stroke-width="2.5"/>';
    if (id === "hako") g.innerHTML = '<polygon points="-34,-10 22,-10 22,30 -34,30" fill="#a5d8ff" stroke="#1864ab" stroke-width="2.5"/><polygon points="-34,-10 -20,-24 36,-24 22,-10" fill="#d0ebff" stroke="#1864ab" stroke-width="2.5"/><polygon points="22,-10 36,-24 36,16 22,30" fill="#74c0fc" stroke="#1864ab" stroke-width="2.5"/>';
    if (id === "sai") g.innerHTML = '<polygon points="-26,-14 14,-14 14,26 -26,26" fill="#fff" stroke="#495057" stroke-width="2.5"/><polygon points="-26,-14 -12,-28 28,-28 14,-14" fill="#f1f3f5" stroke="#495057" stroke-width="2.5"/><polygon points="14,-14 28,-28 28,12 14,26" fill="#dee2e6" stroke="#495057" stroke-width="2.5"/><circle cx="-6" cy="6" r="4" fill="#e03131"/>';
    if (id === "ball") g.innerHTML = '<circle r="28" fill="#b2f2bb" stroke="#2b8a3e" stroke-width="2.5"/><path d="M-28 0 q28 14 56 0 M0 -28 q-12 28 0 56" fill="none" stroke="#2b8a3e" stroke-width="2"/>';
  };
  SD.tool("solids", function (host, cfg) {
    var sel = null, did = {}, W = 340, H = 220, msg = "", stamp = null, anim = null, svg;
    function draw() {
      svg = SD.mkSvg(host, W, H, "solids");
      SD.el("line", { x1: 4, y1: 118, x2: W - 4, y2: 118, stroke: "#c9b29b", "stroke-width": 3 }, svg);
      SOL.forEach(function (id, i) {
        var x = 46 + i * 82, g = SD.el("g", { class: "sol", "data-id": id, transform: "translate(" + x + " 84)" }, svg);
        var inner = SD.el("g", { class: anim && anim.id === id ? anim.c : "" }, g); drawSolid(id, inner);
        SD.el("rect", { x: -38, y: -40, width: 76, height: 76, fill: "transparent", stroke: sel === id ? "#f08c00" : "none", "stroke-width": 3, rx: 10 }, g);
        SD.el("text", { x: x, y: 138, "text-anchor": "middle", "font-size": 14, "font-weight": "bold", fill: "#3b2a1e" }, svg, SD.SOLIDS ? SD.SOLIDS[id].name : id);
      });
      if (stamp) {
        var sx = 46 + SOL.indexOf(stamp) * 82;
        var shape = { tsutsu: '<circle cx="0" cy="0" r="20"/>', hako: '<rect x="-28" y="-14" width="56" height="28"/>', sai: '<rect x="-18" y="-18" width="36" height="36"/>', ball: '<circle cx="0" cy="0" r="3"/>' }[stamp];
        svg.insertAdjacentHTML("beforeend", '<g transform="translate(' + sx + ' 180)" fill="none" stroke="#7048e8" stroke-width="4" class="pop">' + shape + "</g>");
      }
      lab.textContent = msg || (sel ? "「ころがす」「つむ」「うつす」で ためそう" : "かたち を タップ して えらぼう");
    }
    var lab = document.createElement("div"); lab.className = "rulerlab";
    function doit(act, id) {
      id = id || sel; if (!id) { msg = "さき に かたち を えらんでね"; draw(); return; }
      sel = id; did[act + ":" + id] = true; stamp = null;
      var MSG = {
        roll: { tsutsu: "ころころ ころがる！（よこ に すると）", ball: "どっち に でも ころがる！", hako: "ころがらない。たいら な めん で とまる", sai: "ころがらない" },
        stack: { tsutsu: "たてれば つめる", ball: "すべって つめない…", hako: "しっかり つめる", sai: "しっかり つめる" },
        stamp: { tsutsu: "○ が うつせた！", hako: "ながしかく と ましかく が うつせる", sai: "ましかく が うつせる", ball: "てん しか うつせない" }
      };
      msg = MSG[act][id];
      if (act === "stamp") stamp = id;
      anim = { id: id, c: act === "roll" ? (id === "ball" || id === "tsutsu" ? "rolling" : "shake") : act === "stack" ? (id === "ball" ? "slip" : "bounce") : "" };
      SD.sfx(act === "stamp" ? "stamp" : act === "roll" ? "swish" : "poko");
      draw(); anim = null;
    }
    function onDown(ev) { var t = ev.target.closest && ev.target.closest(".sol"); if (!t) return; ev.preventDefault(); sel = t.getAttribute("data-id"); msg = ""; SD.sfx("poko"); draw(); }
    host.addEventListener("pointerdown", onDown);
    draw();
    var btns = SD.toolBtns(host, [["🔄 ころがす", function () { doit("roll"); }], ["🧱 つむ", function () { doit("stack"); }], ["🖨️ うつす", function () { doit("stamp"); }]]);
    btns.insertBefore(lab, btns.firstChild);
    return {
      value: function () { return sel; },
      did: function (a, id) { return !!did[a + ":" + id]; },
      set: function (v) { sel = v; draw(); },
      act: function (name, id) { doit(name, id); return SD.wait(1400); },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; btns.remove(); }
    };
  });
})(window.SD);
