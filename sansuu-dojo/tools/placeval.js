/* ============================================================
   くらい の へや（10 の まとまり）
   style sticks: 1年。ばら（■）と 10 の たば。style coins: 2年。1円・10円・100円・1000
   くらい ごと に ＋ − 、10こ に なったら「たばねる／りょうがえ」で となり の くらい へ
   ============================================================ */
(function (SD) {
  "use strict";
  var NAME = { 1000: "千のくらい", 100: "百のくらい", 10: "十のくらい", 1: "一のくらい" };
  SD.tool("placeval", function (host, cfg) {
    var cols = cfg.cols || [100, 10, 1], sticks = cfg.style === "sticks", cnt = {}, cw = 86, W = Math.max(340, cols.length * cw + 8), H = 270, svg, flash = null;
    var reset = function () { cols.forEach(function (v) { cnt[v] = (cfg.init && cfg.init[v]) || 0; }); };
    reset();
    var value = function () { return cols.reduce(function (s, v) { return s + v * cnt[v]; }, 0); };
    var cx = function (i) { return (W - cols.length * cw) / 2 + i * cw + cw / 2; };
    function token(g, v, x, y) {
      if (!sticks) { g.insertAdjacentHTML("beforeend", SD.pics.coin(v, x, y)); return; }
      if (v === 1) SD.el("rect", { x: x - 9, y: y - 6, width: 18, height: 12, rx: 2, fill: "#ffd8a8", stroke: "#c45f00" }, g);
      else if (v === 10) { for (var k = 0; k < 10; k++) SD.el("rect", { x: x - 5, y: y - 25 + k * 5, width: 10, height: 5, fill: "#f08c00", stroke: "#c45f00", "stroke-width": 0.6 }, g); SD.el("rect", { x: x - 6, y: y - 2, width: 12, height: 3, fill: "#c92a2a" }, g); }
      else { SD.el("rect", { x: x - 16, y: y - 16, width: 32, height: 32, fill: "#f08c00", stroke: "#c45f00" }, g); SD.el("text", { x: x, y: y + 5, "text-anchor": "middle", "font-size": 12, fill: "#fff", "font-weight": "bold" }, g, "100"); }
    }
    function draw() {
      svg = SD.mkSvg(host, W, H, "placeval");
      cols.forEach(function (v, i) {
        var x = cx(i), g = SD.el("g", {}, svg);
        SD.el("rect", { x: x - cw / 2 + 3, y: 2, width: cw - 6, height: 222, rx: 10, fill: flash === v ? "#fff4c4" : i % 2 ? "#fffaf0" : "#f8f1e4", stroke: "#e2d3c3" }, g);
        SD.el("text", { x: x, y: 18, "text-anchor": "middle", "font-size": 12, "font-weight": "bold", fill: "#7a6555" }, g, NAME[v]);
        var n = cnt[v], tall = sticks && v === 10, gap = tall ? 54 : 30;
        for (var k = 0; k < n; k++) {
          var col = k % 2, row = Math.floor(k / 2);
          if (tall) { col = k % 4; row = Math.floor(k / 4); }
          var tx = tall ? x - 27 + col * 18 : x + (col ? 17 : -17), ty = (tall ? 62 : 44) + row * (tall ? 56 : (sticks && v === 100 ? 36 : 30));
          if (ty > 200) { ty = 200; tx += 4 * row; }
          token(g, v, tx, ty);
        }
        SD.el("text", { x: x, y: 214, "text-anchor": "middle", "font-size": 18, "font-weight": "bold", fill: n >= 10 ? "#c92a2a" : "#3b2a1e" }, g, n);
        // − ＋
        [[-22, "−", -1], [22, "+", 1]].forEach(function (b) {
          var bg = SD.el("g", { class: "pv", "data-v": v, "data-d": b[2] }, svg);
          SD.el("circle", { cx: x + b[0], cy: 248, r: 19, fill: b[2] > 0 ? "#e7f5ff" : "#fff5f5", stroke: b[2] > 0 ? "#1c7ed6" : "#e03131", "stroke-width": 2.5 }, bg);
          SD.el("text", { x: x + b[0], y: 249, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 24, "font-weight": "bold", fill: b[2] > 0 ? "#1c7ed6" : "#e03131" }, bg, b[1]);
        });
      });
    }
    function add(v, d) {
      if (cnt[v] + d < 0 || cnt[v] + d > 19) { SD.sfx("bu"); return false; }
      cnt[v] += d; SD.sfx(d > 0 ? "poko" : "poko2"); draw(); return true;
    }
    function pack() {
      for (var i = cols.length - 1; i > 0; i--) {
        var v = cols[i];
        if (cnt[v] >= 10) { cnt[v] -= 10; cnt[cols[i - 1]] += 1; flash = cols[i - 1]; SD.sfx("kira"); draw(); flash = null; return true; }
      }
      SD.sfx("bu"); return false;
    }
    function onDown(ev) {
      var t = ev.target.closest && ev.target.closest(".pv"); if (!t) return;
      ev.preventDefault();
      add(+t.getAttribute("data-v"), +t.getAttribute("data-d"));
    }
    host.addEventListener("pointerdown", onDown);
    draw();
    var btns = SD.toolBtns(host, [[sticks ? "🎀 10 で たばねる" : "👛 10まい で りょうがえ", pack], ["↺ さいしょ", function () { reset(); draw(); }]]);
    var T = {
      value: value,
      count: function (v) { return cnt[v]; },
      set: function (n) { cols.forEach(function (v) { cnt[v] = Math.floor(n / v); n -= cnt[v] * v; }); draw(); },
      act: function (name, v, n) {
        var p = Promise.resolve();
        if (name === "add") for (var i = 0; i < n; i++) p = p.then(function () { add(v, 1); return SD.wait(230); });
        if (name === "pack") p = p.then(function () { pack(); return SD.wait(700); });
        if (name === "set") p = p.then(function () { T.set(v); return SD.wait(700); });
        return p.then(function () { return SD.wait(300); });
      },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; btns.remove(); }
    };
    return T;
  });
})(window.SD);
