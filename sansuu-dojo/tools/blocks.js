/* ============================================================
   かずブロック と 10 の わく
   mode: place（わく を タップ で おく／ブロック を タップ で へらす）
         move（した の ブロック を わく へ よせる。たしざん・くりあがり）
         take（わく を タップ で とる。ひきざん・くりさがり）
         split（しきり で 2つ に わける。いくつ と いくつ）
         compare（2れつ を ならべて 1たい1 で くらべる）
   ============================================================ */
(function (SD) {
  "use strict";
  var COL = { A: "#e8590c", B: "#1c7ed6" };

  SD.tool("blocks", function (host, cfg) {
    var mode = cfg.mode || "place";
    if (mode === "split") return split(host, cfg);
    if (mode === "compare") return compare(host, cfg);
    var F = cfg.frames || 1, cell = F === 1 ? 46 : 31, pad = 6, gap = 16;
    var fw = cell * 5 + pad * 2, fh = cell * 2 + pad * 2, total = F * fw + (F - 1) * gap;
    var W = Math.max(340, total + 20), top = 34, trayY = top + fh + 16;
    var H = top + fh + (mode === "move" ? 74 : 12);
    var frames = [], src = mode === "move" ? (cfg.src || 0) : 0, label = "", last = null;
    var init0 = cfg.init || 0;
    var reset = function () {
      frames = [];
      for (var f = 0; f < F; f++) frames.push([]);
      for (var i = 0; i < init0; i++) frames[Math.min(F - 1, Math.floor(i / 10))].push({ c: "A", gone: false });
      src = mode === "move" ? (cfg.src || 0) : 0; label = ""; last = null;
    };
    reset();
    var fx = function (f) { return (W - total) / 2 + f * (fw + gap); };
    var cellXY = function (f, i) { return [fx(f) + pad + (i % 5) * cell + cell / 2, top + pad + Math.floor(i / 5) * cell + cell / 2]; };
    var trayXY = function (i) { var n = Math.max(src, 1), s = Math.min(32, (W - 40) / Math.max(n, 5)); return [W / 2 + (i - (n - 1) / 2) * s, trayY + 28]; };
    var count = function (f) { return frames[f].filter(function (b) { return !b.gone; }).length; };
    var value = function () { var s = 0; for (var f = 0; f < F; f++) s += count(f); return s; };
    var svg;

    function draw() {
      svg = SD.mkSvg(host, W, H, "blocks");
      if (label) {
        SD.el("rect", { x: W / 2 - 80, y: 2, width: 160, height: 28, rx: 14, fill: "#fff4c4", stroke: "#f08c00", "stroke-width": 2 }, svg);
        SD.el("text", { x: W / 2, y: 17, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 17, "font-weight": "bold", fill: "#d9480f" }, svg, label);
      }
      for (var f = 0; f < F; f++) {
        var g = SD.el("g", { class: "frame", "data-f": f }, svg);
        SD.el("rect", { x: fx(f), y: top, width: fw, height: fh, rx: 8, fill: "#fff", stroke: "#8b5e3c", "stroke-width": 3 }, g);
        for (var i = 0; i < 10; i++) {
          var p = cellXY(f, i);
          SD.el("rect", { x: p[0] - cell / 2, y: p[1] - cell / 2, width: cell, height: cell, fill: "none", stroke: "#e2d3c3", "stroke-width": 1.5 }, g);
          var b = frames[f][i];
          if (!b) continue;
          var s = cell - 8;
          var r = SD.el("rect", { x: p[0] - s / 2, y: p[1] - s / 2, width: s, height: s, rx: 6, fill: COL[b.c], class: "blk" + (b.gone ? " gone" : "") }, g);
          if (last && last.f === f && last.i === i) {
            r.classList.add(last.from ? "fly" : "pop");
            if (last.from) { r.style.setProperty("--dx", (last.from[0] - p[0]) + "px"); r.style.setProperty("--dy", (last.from[1] - p[1]) + "px"); }
          }
          if (b.gone) {
            SD.el("path", { d: "M" + (p[0] - 10) + " " + (p[1] - 10) + " l20 20 M" + (p[0] + 10) + " " + (p[1] - 10) + " l-20 20", stroke: "#868e96", "stroke-width": 3, "stroke-linecap": "round" }, g);
          }
        }
      }
      if (mode === "move") {
        var tray = SD.el("g", { class: "tray" }, svg);
        SD.el("rect", { x: 14, y: trayY, width: W - 28, height: 56, rx: 12, fill: "#e7f5ff", stroke: "#74c0fc", "stroke-width": 2, "stroke-dasharray": "6 5" }, tray);
        for (var k = 0; k < src; k++) {
          var q = trayXY(k);
          SD.el("rect", { x: q[0] - 13, y: q[1] - 13, width: 26, height: 26, rx: 6, fill: COL.B }, tray);
        }
        if (!src) SD.el("text", { x: W / 2, y: trayY + 28, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 15, fill: "#74c0fc" }, tray, "ぜんぶ よせたよ");
      }
      SD.el("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent", class: "hit" }, svg);
    }

    function place(f) {
      if (frames[f].length >= 10) { SD.sfx("bu"); return false; }
      frames[f].push({ c: "A", gone: false }); last = { f: f, i: frames[f].length - 1 };
      SD.sfx("poko"); draw(); return true;
    }
    function unplace(f) {
      if (!frames[f].length) return false;
      frames[f].pop(); last = null; SD.sfx("poko2"); draw(); return true;
    }
    function moveOne() {
      if (src <= 0) return false;
      var from = trayXY(src - 1);
      for (var f = 0; f < F; f++) if (frames[f].length < 10) {
        src--; frames[f].push({ c: "B", gone: false }); last = { f: f, i: frames[f].length - 1, from: from };
        SD.sfx("poko"); draw(); return true;
      }
      return false;
    }
    function takeOne(f) {
      for (var i = frames[f].length - 1; i >= 0; i--) if (!frames[f][i].gone) {
        frames[f][i].gone = true; last = null; SD.sfx("poko2"); draw(); return true;
      }
      SD.sfx("bu"); return false;
    }
    var frameAt = function (pt) {
      for (var f = 0; f < F; f++) if (pt.x >= fx(f) - 6 && pt.x <= fx(f) + fw + 6) return f;
      return pt.x < W / 2 ? 0 : F - 1;
    };
    function onDown(ev) {
      ev.preventDefault();
      var pt = SD.svgPt(svg, ev);
      if (mode === "move") { moveOne(); return; }
      var f = frameAt(pt);
      if (mode === "take") { takeOne(f); return; }
      // place: ブロック の うえ なら へらす、あいた ところ なら おく
      var col = Math.floor((pt.x - fx(f) - pad) / cell), row = Math.floor((pt.y - top - pad) / cell);
      var idx = row * 5 + col;
      if (pt.y > top + fh + 4) return;
      if (idx >= 0 && idx < frames[f].length && col >= 0 && col < 5) unplace(f); else place(f);
    }
    host.addEventListener("pointerdown", onDown);
    draw();

    var T = {
      value: value,
      count: count,
      set: function (v) { reset(); for (var i = 0; i < v; i++) frames[Math.min(F - 1, Math.floor(i / 10))].push({ c: "A", gone: false }); draw(); },
      act: function (name, a, b) {
        var steps = [];
        if (name === "place") steps.push(function () { place(a); });
        if (name === "fill") for (var i = count(a); i < b; i++) steps.push(function () { place(a); });
        if (name === "move") for (var j = 0; j < a; j++) steps.push(moveOne);
        if (name === "moveAll") for (var k = 0; k < src; k++) steps.push(moveOne);
        if (name === "take") for (var m = 0; m < b; m++) steps.push(function () { takeOne(a); });
        if (name === "reset") steps.push(function () { reset(); draw(); });
        if (name === "label") steps.push(function () { label = a; draw(); });
        return steps.reduce(function (pr, fn) { return pr.then(fn).then(function () { return SD.wait(420); }); }, Promise.resolve());
      },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; }
    };
    return T;
  });

  // いくつ と いくつ: しきり で 2つ に わける
  function split(host, cfg) {
    var n = cfg.n || 10, at = cfg.at == null ? n : cfg.at, W = 340, cs = Math.min(32, (W - 30) / n), x0 = (W - cs * n) / 2, H = 112, svg;
    function draw() {
      svg = SD.mkSvg(host, W, H, "blocks split");
      for (var i = 0; i < n; i++) {
        var x = x0 + i * cs + (i >= at ? 10 : 0) - 5;
        SD.el("rect", { x: x + 2, y: 34, width: cs - 4, height: cs - 4, rx: 6, fill: i < at ? COL.A : COL.B, class: "blk" }, svg);
      }
      var dx = x0 + at * cs;
      SD.el("line", { x1: dx, y1: 24, x2: dx, y2: 34 + cs + 6, stroke: "#3b2a1e", "stroke-width": 4, "stroke-linecap": "round" }, svg);
      var lab = function (x, v, c) { SD.el("text", { x: x, y: 14, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 22, "font-weight": "bold", fill: c }, svg, v); };
      if (at > 0) lab(x0 + at * cs / 2 - 5, at, COL.A);
      if (at < n) lab(x0 + at * cs + (n - at) * cs / 2 + 5, n - at, COL.B);
      SD.el("text", { x: W / 2, y: 34 + cs + 26, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 15, fill: "#7a6555" }, svg, "ブロック を タップ して しきり を うごかそう（ぜんぶで " + n + "）");
      SD.el("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent" }, svg);
    }
    function onDown(ev) {
      ev.preventDefault();
      var pt = SD.svgPt(svg, ev), i = Math.floor((pt.x - x0) / cs);
      i = Math.max(0, Math.min(n - 1, i));
      at = i + 1 === at ? i : i + 1; // おなじ ところ を もういちど で ひとつ もどす
      SD.sfx("poko"); draw();
    }
    host.addEventListener("pointerdown", onDown);
    draw();
    return {
      value: function () { return at; },
      set: function (v) { at = v; draw(); },
      act: function (name, k) {
        if (name !== "split") return SD.wait(500);
        var steps = [];
        while (at !== k) { at += at < k ? 1 : -1; steps.push(at); }
        return steps.reduce(function (pr, v) { return pr.then(function () { at = v; SD.sfx("poko"); draw(); return SD.wait(220); }); }, Promise.resolve()).then(function () { return SD.wait(400); });
      },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; }
    };
  }

  // 2れつ を ならべて くらべる
  function compare(host, cfg) {
    var a = cfg.a, b = cfg.b, W = 340, H = 120, aligned = false, marked = false, picked = null, svg;
    var R = SD.rng(a * 13 + b * 7);
    var loose = function (n, longer) { var xs = [], x = 24; for (var i = 0; i < n; i++) { xs.push(x); x += longer ? 30 : 22 + R.next() * 30; } return xs; };
    // すくない ほう を ひろげて、ぱっと みて まよう ように
    var xa = loose(a, a > b), xb = loose(b, b > a);
    var sp = Math.min(32, (W - 40) / Math.max(a, b));
    function draw() {
      svg = SD.mkSvg(host, W, H, "blocks compare");
      var row = function (n, xs, y, e, side) {
        for (var i = 0; i < n; i++) {
          var x = aligned ? 24 + i * sp : xs[i];
          var extra = aligned && i >= Math.min(a, b);
          var g = SD.el("g", { class: "itm", style: "transform: translate(" + x + "px," + y + "px)", "data-side": side, "data-i": i }, svg);
          if (marked && extra) SD.el("circle", { r: 17, fill: "#fff4c4", stroke: "#f08c00", "stroke-width": 3 }, g);
          if (picked && picked.side === side && picked.i === i) SD.el("circle", { r: 18, fill: "none", stroke: "#2b8a3e", "stroke-width": 4 }, g);
          SD.el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-size": 28 }, g, e);
        }
      };
      if (aligned) for (var k = 0; k < Math.min(a, b); k++) SD.el("line", { x1: 24 + k * sp, y1: 40, x2: 24 + k * sp, y2: 70, stroke: "#adb5bd", "stroke-width": 2, "stroke-dasharray": "3 3" }, svg);
      row(a, xa, 24, cfg.e1, "a");
      row(b, xb, 88, cfg.e2, "b");
    }
    function onDown(ev) {
      var t = ev.target.closest && ev.target.closest(".itm");
      if (!t) return;
      ev.preventDefault();
      var side = t.getAttribute("data-side"), i = +t.getAttribute("data-i");
      picked = { side: side, i: i }; SD.sfx("poko"); draw();
    }
    host.addEventListener("pointerdown", onDown);
    draw();
    var btns = SD.toolBtns(host, [["↔ ならべる", function () { T.act("align"); }]]);
    var T = {
      value: function () { return picked && aligned && picked.i >= Math.min(a, b) ? picked.side : null; },
      aligned: function () { return aligned; },
      set: function () { aligned = true; draw(); },
      act: function (name) {
        if (name === "align") { aligned = true; SD.sfx("swish"); draw(); return SD.wait(800); }
        if (name === "mark") { aligned = true; marked = true; draw(); return SD.wait(800); }
        return SD.wait(600);
      },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; if (btns) btns.remove(); }
    };
    return T;
  }
})(window.SD);
