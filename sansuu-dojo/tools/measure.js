/* ============================================================
   くらべる・はかる（1年: ちょくせつ ひかく → にんい たんい）
   mode len : リボン。「そろえる」で はし を そろえる、リボン を タップ で クリップ を ならべる
   mode vol : ポット。タップ で コップ に 1ぱい ずつ うつす
   mode area: ます の かたち。タップ で ばんごう を つけて かぞえる
   ============================================================ */
(function (SD) {
  "use strict";
  var RIB = SD.pics.RIB;
  SD.tool("measure", function (host, cfg) {
    var mode = cfg.mode, svg, btns;
    if (mode === "len") {
      var ribs = cfg.ribs.map(function (r) { return { c: r.c, len: r.len, off: r.off || 0, clips: 0 }; }), u = 30, aligned = ribs.every(function (r) { return !r.off; });
      var drawL = function () {
        var H = ribs.length * 66 + 10;
        svg = SD.mkSvg(host, 340, H, "measure");
        if (aligned) SD.el("line", { x1: 12, y1: 4, x2: 12, y2: H - 4, stroke: "#adb5bd", "stroke-dasharray": "4 4" }, svg);
        ribs.forEach(function (r, i) {
          var y = 16 + i * 66, x = 12 + (aligned ? 0 : r.off) * u;
          var g = SD.el("g", { class: "itm", "data-i": i }, svg);
          SD.el("rect", { x: x, y: y - 8, width: r.len * u, height: 34, fill: "transparent" }, g);
          SD.el("rect", { x: x, y: y, width: r.len * u, height: 18, rx: 4, fill: RIB[r.c][0] }, g);
          for (var k = 0; k < r.clips; k++) {
            SD.el("rect", { x: x + k * u + 3, y: y + 22, width: u - 6, height: 12, rx: 6, fill: "#f8f9fa", stroke: "#495057", "stroke-width": 2.5, class: k === r.clips - 1 ? "pop" : "" }, g);
          }
          if (r.clips) SD.el("text", { x: 330, y: y + 46, "text-anchor": "end", "font-size": 14, "font-weight": "bold", fill: RIB[r.c][0] }, svg, "クリップ " + r.clips + "こ");
        });
      };
      var onL = function (ev) {
        var t = ev.target.closest && ev.target.closest(".itm"); if (!t) return;
        ev.preventDefault();
        var r = ribs[+t.getAttribute("data-i")];
        if (r.clips < r.len + 2) { r.clips++; SD.sfx("poko"); } else SD.sfx("bu");
        drawL();
      };
      host.addEventListener("pointerdown", onL);
      drawL();
      btns = SD.toolBtns(host, [["↔ そろえる", function () { aligned = true; SD.sfx("swish"); drawL(); }], ["クリップ を けす", function () { ribs.forEach(function (r) { r.clips = 0; }); drawL(); }]]);
      return {
        value: function () { return ribs[0].clips; },
        clips: function (i) { return ribs[i].clips; },
        aligned: function () { return aligned; },
        set: function () { aligned = true; ribs.forEach(function (r) { r.clips = r.len; }); drawL(); },
        act: function (name) {
          if (name === "align") { aligned = true; SD.sfx("swish"); drawL(); return SD.wait(900); }
          if (name === "clipsAll") {
            var p = Promise.resolve();
            ribs.forEach(function (r) { for (var k = 0; k < r.len; k++) p = p.then(function () { r.clips++; SD.sfx("poko"); drawL(); return SD.wait(260); }); });
            return p.then(function () { return SD.wait(600); });
          }
          return SD.wait(900);
        },
        destroy: function () { host.removeEventListener("pointerdown", onL); host.innerHTML = ""; btns.remove(); }
      };
    }
    if (mode === "vol") {
      var pots = [{ n: cfg.a, out: 0, c: "red" }, { n: cfg.b, out: 0, c: "blue" }];
      var drawV = function () {
        svg = SD.mkSvg(host, 340, 200, "measure");
        pots.forEach(function (p, i) {
          var x = 20 + i * 170, g = SD.el("g", { class: "itm", "data-i": i }, svg);
          // ポットの かたち（ひだり は ほそながい、みぎ は ひくくて ひろい）
          var w = i ? 110 : 66, h = i ? 70 : 100, px = x + (130 - w) / 2, py = 100 - h + 6;
          var lvl = (p.n - p.out) / Math.max(p.n, 1) * (h - 8);
          SD.el("rect", { x: px, y: py, width: w, height: h, rx: 10, fill: "#f8f9fa", stroke: RIB[p.c][0], "stroke-width": 4 }, g);
          SD.el("rect", { x: px + 4, y: py + h - 4 - lvl, width: w - 8, height: lvl, rx: 6, fill: "#74c0fc", opacity: 0.8 }, g);
          for (var k = 0; k < p.out; k++) {
            var cx = x + 6 + (k % 5) * 25, cy = 122 + Math.floor(k / 5) * 38;
            SD.el("path", { d: "M" + cx + " " + cy + " l3 28 h14 l3 -28 z", fill: "#a5d8ff", stroke: "#1c7ed6", "stroke-width": 2, class: k === p.out - 1 ? "pop" : "" }, svg);
          }
          SD.el("text", { x: x + 65, y: 196, "text-anchor": "middle", "font-size": 14, "font-weight": "bold", fill: RIB[p.c][0] }, svg, RIB[p.c][1] + (p.out ? "：コップ " + p.out + "はい" : "（タップ で うつす）"));
        });
      };
      var pour = function (i) { var p = pots[i]; if (p.out < p.n) { p.out++; SD.sfx("pour"); drawV(); return true; } SD.sfx("bu"); return false; };
      var onV = function (ev) { var t = ev.target.closest && ev.target.closest(".itm"); if (!t) return; ev.preventDefault(); pour(+t.getAttribute("data-i")); };
      host.addEventListener("pointerdown", onV);
      drawV();
      return {
        value: function () { return pots[0].out; },
        cups: function (i) { return pots[i].out; },
        set: function () { pots.forEach(function (p) { p.out = p.n; }); drawV(); },
        act: function () {
          var p = Promise.resolve();
          pots.forEach(function (q, i) { for (var k = 0; k < q.n; k++) p = p.then(function () { pour(i); return SD.wait(300); }); });
          return p.then(function () { return SD.wait(600); });
        },
        destroy: function () { host.removeEventListener("pointerdown", onV); host.innerHTML = ""; }
      };
    }
    // area
    var shapes = cfg.shapes.map(function (s) { return { c: s.c, cells: s.cells, num: {} , n: 0 }; }), cs = 26;
    var drawA = function () {
      var H = 0; shapes.forEach(function (s) { s.cells.forEach(function (p) { H = Math.max(H, 14 + (p[1] + 1) * cs); }); });
      svg = SD.mkSvg(host, 340, H + 30, "measure");
      shapes.forEach(function (s, i) {
        var x0 = 12 + i * 170;
        s.cells.forEach(function (p, k) {
          var g = SD.el("g", { class: "itm", "data-i": i, "data-k": k }, svg);
          SD.el("rect", { x: x0 + p[0] * cs, y: 10 + p[1] * cs, width: cs, height: cs, fill: RIB[s.c][0], "fill-opacity": s.num[k] ? 0.6 : 0.25, stroke: RIB[s.c][0], "stroke-width": 1.5 }, g);
          if (s.num[k]) SD.el("text", { x: x0 + p[0] * cs + cs / 2, y: 10 + p[1] * cs + cs / 2, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 12, "font-weight": "bold", fill: "#fff" }, g, s.num[k]);
        });
        SD.el("text", { x: x0 + 70, y: H + 22, "text-anchor": "middle", "font-size": 14, "font-weight": "bold", fill: RIB[s.c][0] }, svg, RIB[s.c][1] + (s.n ? "：" + s.n + "ます" : ""));
      });
    };
    var mark = function (i, k) { var s = shapes[i]; if (s.num[k]) return; s.n++; s.num[k] = s.n; SD.sfx("poko"); drawA(); };
    var onA = function (ev) { var t = ev.target.closest && ev.target.closest(".itm"); if (!t) return; ev.preventDefault(); mark(+t.getAttribute("data-i"), +t.getAttribute("data-k")); };
    host.addEventListener("pointerdown", onA);
    drawA();
    btns = SD.toolBtns(host, [["けす", function () { shapes.forEach(function (s) { s.num = {}; s.n = 0; }); drawA(); }]]);
    return {
      value: function () { return shapes[0].n; },
      counted: function (i) { return shapes[i].n; },
      set: function () { shapes.forEach(function (s) { s.cells.forEach(function (_, k) { if (!s.num[k]) { s.n++; s.num[k] = s.n; } }); }); drawA(); },
      act: function () {
        var p = Promise.resolve();
        shapes.forEach(function (s, i) { s.cells.forEach(function (_, k) { p = p.then(function () { mark(i, k); return SD.wait(160); }); }); });
        return p.then(function () { return SD.wait(600); });
      },
      destroy: function () { host.removeEventListener("pointerdown", onA); host.innerHTML = ""; btns.remove(); }
    };
  });
})(window.SD);
