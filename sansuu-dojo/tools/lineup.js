/* ============================================================
   どうぶつ の ぎょうれつ（なんばんめ）
   mode one: 1ぴき えらぶ（value はまえ から の ばんごう−1）
   mode many: なんびき でも えらぶ（value は "0,1,2"）
   ============================================================ */
(function (SD) {
  "use strict";
  SD.tool("lineup", function (host, cfg) {
    var list = cfg.list, mode = cfg.mode || "one", sel = [], nums = 0, gap = 44, W = Math.max(340, list.length * gap + 76), H = 120, svg;
    function draw() {
      svg = SD.mkSvg(host, W, H, "lineup");
      SD.el("path", { d: "M16 92 L16 26 L46 36 L16 46", fill: "#e03131", stroke: "#8b5e3c", "stroke-width": 3 }, svg);
      SD.el("text", { x: 26, y: 108, "text-anchor": "middle", "font-size": 13, fill: "#8a7360" }, svg, "まえ");
      list.forEach(function (e, i) {
        var x = 72 + i * gap, on = sel.indexOf(i) >= 0;
        var g = SD.el("g", { class: "itm", "data-i": i }, svg);
        SD.el("rect", { x: x - 21, y: 34, width: 42, height: 60, rx: 12, fill: on ? "#fff4c4" : "transparent", stroke: on ? "#f08c00" : "none", "stroke-width": 3 }, g);
        SD.el("text", { x: x, y: 64, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 32 }, g, e);
        if (i < nums) SD.el("text", { x: x, y: 18, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 16, "font-weight": "bold", fill: "#d9480f" }, g, i + 1);
      });
    }
    function onDown(ev) {
      var t = ev.target.closest && ev.target.closest(".itm");
      if (!t) return;
      ev.preventDefault();
      var i = +t.getAttribute("data-i"), k = sel.indexOf(i);
      if (mode === "one") sel = [i]; else if (k >= 0) sel.splice(k, 1); else sel.push(i);
      SD.sfx("poko"); draw();
    }
    host.addEventListener("pointerdown", onDown);
    draw();
    return {
      value: function () { return sel.slice().sort(function (a, b) { return a - b; }).join(","); },
      set: function (v) { sel = String(v).split(",").map(Number); draw(); },
      act: function (name, n, m) {
        if (name !== "count") return SD.wait(600);
        sel = []; nums = 0; draw();
        var p = Promise.resolve();
        for (var i = 0; i < n; i++) (function (i) { p = p.then(function () { nums = i + 1; if (m === "many") sel.push(i); SD.sfx("poko"); draw(); return SD.wait(450); }); })(i);
        return p.then(function () { if (m === "one") sel = [n - 1]; draw(); return SD.wait(900); }).then(function () { nums = 0; draw(); });
      },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; }
    };
  });
})(window.SD);
