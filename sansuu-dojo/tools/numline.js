/* ============================================================
   すうちょくせん: かえる が ぴょんぴょん ジャンプ して たす・ひく
   めもり を タップ → そこ まで 1つずつ ジャンプ。◀ ▶ でも うごく
   ============================================================ */
(function (SD) {
  "use strict";
  SD.tool("numline", function (host, cfg) {
    var min = cfg.min || 0, max = cfg.max == null ? 20 : cfg.max, step = cfg.step || 1;
    var n = (max - min) / step, W = 360, H = 130, x0 = 18, gx = (W - 36) / n, base = 92;
    var pos = cfg.start == null ? min : cfg.start, start = pos, hops = [], busy = false, svg;
    var X = function (v) { return x0 + (v - min) / step * gx; };
    function draw(hopFrom) {
      svg = SD.mkSvg(host, W, H, "numline");
      SD.el("line", { x1: 6, y1: base, x2: W - 6, y2: base, stroke: "#3b2a1e", "stroke-width": 3 }, svg);
      for (var i = 0; i <= n; i++) {
        var v = min + i * step, x = X(v), big = v % (5 * step) === 0;
        SD.el("line", { x1: x, y1: base - (big ? 10 : 6), x2: x, y2: base + (big ? 10 : 6), stroke: "#3b2a1e", "stroke-width": big ? 3 : 2 }, svg);
        if (n <= 12 || big || v === pos) SD.el("text", { x: x, y: base + 24, "text-anchor": "middle", "font-size": v === pos ? 17 : 13, "font-weight": v === pos ? "bold" : "normal", fill: v === pos ? "#2b8a3e" : "#3b2a1e" }, svg, v);
      }
      hops.forEach(function (h, k) {
        var a = X(h[0]), b = X(h[1]), mid = (a + b) / 2, up = h[1] > h[0];
        SD.el("path", { d: "M" + a + " " + (base - 8) + " Q" + mid + " " + (base - 40) + " " + b + " " + (base - 8), fill: "none", stroke: up ? "#e8590c" : "#1c7ed6", "stroke-width": 2.5, "marker-end": "", class: k === hops.length - 1 && hopFrom != null ? "hop" : "" }, svg);
      });
      if (hops.length) {
        var d = pos - start;
        SD.el("text", { x: W / 2, y: 16, "text-anchor": "middle", "font-size": 16, "font-weight": "bold", fill: "#7a6555" }, svg, start + " から " + (d >= 0 ? "みぎ へ " + d / step : "ひだり へ " + (-d / step)) + "かい ジャンプ → " + pos);
      }
      var fr = SD.el("text", { x: X(pos), y: base - 22, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 30, class: hopFrom != null ? "frog jump" : "frog" }, svg, "🐸");
      if (hopFrom != null) fr.style.setProperty("--dx", (X(hopFrom) - X(pos)) + "px");
      SD.el("rect", { x: 0, y: 30, width: W, height: H - 30, fill: "transparent" }, svg);
    }
    function hop(dir) {
      var to = pos + dir * step;
      if (to < min || to > max) { SD.sfx("bu"); return false; }
      hops.push([pos, to]); var from = pos; pos = to; SD.sfx("jump"); draw(from); return true;
    }
    function goTo(v) {
      if (busy) return Promise.resolve();
      busy = true;
      var p = Promise.resolve(), k = Math.round((v - pos) / step), dir = k > 0 ? 1 : -1;
      for (var i = 0; i < Math.abs(k); i++) p = p.then(function () { hop(dir); return SD.wait(300); });
      return p.then(function () { busy = false; });
    }
    function onDown(ev) {
      if (ev.target.closest && ev.target.closest(".tbtn")) return;
      ev.preventDefault();
      var pt = SD.svgPt(svg, ev);
      var v = min + Math.round((pt.x - x0) / gx) * step;
      goTo(Math.max(min, Math.min(max, v)));
    }
    host.addEventListener("pointerdown", onDown);
    draw();
    var btns = SD.toolBtns(host, [["◀ 1", function () { hop(-1); }], ["1 ▶", function () { hop(1); }], ["↺ さいしょ", function () { pos = start; hops = []; draw(); }]]);
    return {
      value: function () { return pos; },
      set: function (v) { pos = v; draw(); },
      act: function (name, k) {
        if (name === "jump") return goTo(pos + k * step).then(function () { return SD.wait(500); });
        return SD.wait(600);
      },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; btns.remove(); }
    };
  });
})(window.SD);
