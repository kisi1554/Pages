/* ============================================================
   ものさし（mm）・1L ます（dL）・ひょう と グラフ・おさら と アレイ
   ============================================================ */
(function (SD) {
  "use strict";

  /* ---- ものさし: タップ／◀ ▶ で しるし（mm）を うごかす ---- */
  SD.tool("ruler", function (host, cfg) {
    var cm = 12, k = 320 / (cm * 10), x0 = 12, mark = cfg.start || 0, svg;
    function draw() {
      host.innerHTML = SD.pics.ruler(cfg.len || 0).replace('class="pic ruler"', 'class="tool ruler"');
      svg = host.querySelector("svg");
      var x = x0 + mark * k;
      SD.el("line", { x1: x, y1: 4, x2: x, y2: 98, stroke: "#e03131", "stroke-width": 2.5 }, svg);
      SD.el("path", { d: "M" + (x - 7) + " 2 h14 l-7 9 z", fill: "#e03131" }, svg);
      var c = Math.floor(mark / 10), m = mark % 10;
      lab.textContent = (c ? c + "cm" : "") + (m ? m + "mm" : "") || "0";
    }
    var lab = document.createElement("div");
    lab.className = "rulerlab";
    function onDown(ev) {
      if (ev.target.closest && ev.target.closest(".tbtn")) return;
      ev.preventDefault();
      var p = SD.svgPt(svg, ev);
      mark = Math.max(0, Math.min(cm * 10, Math.round((p.x - x0) / k)));
      SD.sfx("tick"); draw();
    }
    host.addEventListener("pointerdown", onDown);
    draw();
    var btns = SD.toolBtns(host, [["◀ 1mm", function () { mark = Math.max(0, mark - 1); SD.sfx("tick"); draw(); }], ["1mm ▶", function () { mark = Math.min(cm * 10, mark + 1); SD.sfx("tick"); draw(); }], ["1cm ▶", function () { mark = Math.min(cm * 10, mark + 10); SD.sfx("tick"); draw(); }]]);
    btns.insertBefore(lab, btns.firstChild);
    return {
      value: function () { return mark; },
      set: function (v) { mark = v; draw(); },
      act: function (name, v) {
        if (name !== "to") return SD.wait(600);
        var p = Promise.resolve(), step = v > mark ? 1 : -1;
        for (var mm = mark + step; step > 0 ? mm <= v : mm >= v; mm += step) (function (mm) { p = p.then(function () { mark = mm; draw(); return SD.wait(mm % 10 ? 25 : 90); }); })(mm);
        return p.then(function () { SD.sfx("tick"); return SD.wait(700); });
      },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; btns.remove(); }
    };
  });

  /* ---- 1L ます: 1dL カップ で いれる ---- */
  SD.tool("masu", function (host, cfg) {
    var L = cfg.L || 3, dl = cfg.init || 0;
    function draw() {
      var full = Math.floor(dl / 10), rest = dl % 10;
      var s = SD.pics.masu(Math.min(L, full), full >= L ? 0 : rest);
      // からっぽ の ます も ならべる
      var shown = Math.min(L, full) + (full >= L || !rest ? 0 : 1);
      host.innerHTML = s.replace('class="pic masu"', 'class="tool masu"');
      var svg = host.querySelector("svg");
      for (var i = shown; i < L; i++) {
        var x = 14 + i * 86;
        SD.el("rect", { x: x, y: 12, width: 70, height: 110, rx: 4, fill: "#f8f9fa", stroke: "#adb5bd", "stroke-width": 2.5, "stroke-dasharray": "5 4" }, svg);
        SD.el("text", { x: x + 35, y: 138, "text-anchor": "middle", "font-size": 12, fill: "#adb5bd" }, svg, "1L ます");
      }
      var lab = (full ? full + "L" : "") + (rest ? rest + "dL" : "") || "0";
      SD.el("text", { x: 300, y: 20, "text-anchor": "end", "font-size": 18, "font-weight": "bold", fill: "#1c7ed6" }, svg, lab + "（" + dl + "dL）");
    }
    draw();
    var pour = function () { if (dl >= L * 10) { SD.sfx("bu"); return; } dl++; SD.sfx("pour"); draw(); };
    var btns = SD.toolBtns(host, [["🥛 1dL いれる", pour], ["すてる", function () { dl = 0; SD.sfx("swish"); draw(); }]]);
    return {
      value: function () { return dl; },
      set: function (v) { dl = v; draw(); },
      act: function (name, n) {
        if (name !== "pour") return SD.wait(800);
        var p = Promise.resolve();
        for (var i = 0; i < n; i++) p = p.then(function () { pour(); return SD.wait(260); });
        return p.then(function () { return SD.wait(500); });
      },
      destroy: function () { host.innerHTML = ""; btns.remove(); }
    };
  });

  /* ---- グラフ: ばらばら の え を タップ → しゅるい ごと に ○ を つむ ---- */
  SD.tool("graph", function (host, cfg) {
    var items = cfg.items, R = SD.rng(items.length * 31 + items[0].n), list = [];
    items.forEach(function (it, k) { for (var i = 0; i < it.n; i++) list.push({ k: k, done: false }); });
    list = R.shuffle(list);
    // ばらばら に（すこし ずらした ますめ。32こ まで はいる）
    var pts = list.map(function (_, i) { return [14 + (i % 11) * 29 + R.next() * 8, 18 + Math.floor(i / 11) * 34 + R.next() * 8]; });
    var max = Math.max.apply(null, items.map(function (x) { return x.n; })), cw = 64, W = 340, top = 120, gh = max * 20 + 40, H = top + gh, svg;
    var gx = function (k) { return (W - items.length * cw) / 2 + k * cw + cw / 2; };
    function draw() {
      svg = SD.mkSvg(host, W, H, "graphtool");
      SD.el("rect", { x: 2, y: 2, width: W - 4, height: 112, rx: 10, fill: "#f8f9fa", stroke: "#e9ecef" }, svg);
      var stack = items.map(function () { return 0; });
      list.forEach(function (o, i) {
        if (o.done) {
          var y = H - 38 - stack[o.k] * 20; stack[o.k]++;
          SD.el("circle", { cx: gx(o.k), cy: y, r: 8, fill: "none", stroke: "#1c7ed6", "stroke-width": 3 }, svg);
        } else {
          var g = SD.el("g", { class: "itm", "data-i": i }, svg);
          SD.el("circle", { cx: pts[i][0] + 4, cy: pts[i][1] + 2, r: 17, fill: "transparent" }, g);
          SD.el("text", { x: pts[i][0] + 4, y: pts[i][1] + 2, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 26 }, g, items[o.k].e);
        }
      });
      SD.el("line", { x1: 8, y1: H - 26, x2: W - 8, y2: H - 26, stroke: "#3b2a1e", "stroke-width": 2 }, svg);
      items.forEach(function (it, k) {
        SD.el("text", { x: gx(k), y: H - 11, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 20 }, svg, it.e);
        if (stack[k] === it.n) SD.el("text", { x: gx(k) + 20, y: H - 11, "font-size": 13, "font-weight": "bold", fill: "#2b8a3e", "dominant-baseline": "central" }, svg, it.n);
      });
    }
    function sortOne(i) { if (list[i] && !list[i].done) { list[i].done = true; SD.sfx("poko"); draw(); return true; } return false; }
    function onDown(ev) { var t = ev.target.closest && ev.target.closest(".itm"); if (!t) return; ev.preventDefault(); sortOne(+t.getAttribute("data-i")); }
    host.addEventListener("pointerdown", onDown);
    draw();
    return {
      value: function () { return list.filter(function (o) { return o.done; }).length; },
      done: function () { return list.every(function (o) { return o.done; }); },
      set: function () { list.forEach(function (o) { o.done = true; }); draw(); },
      act: function (name) {
        if (name !== "sortAll") return SD.wait(800);
        var p = Promise.resolve();
        list.forEach(function (_, i) { p = p.then(function () { sortOne(i); return SD.wait(200); }); });
        return p.then(function () { return SD.wait(600); });
      },
      destroy: function () { host.removeEventListener("pointerdown", onDown); host.innerHTML = ""; }
    };
  });

  /* ---- おさら（○こ ずつ）→ アレイ ---- */
  SD.tool("plates", function (host, cfg) {
    var per = cfg.per, n = cfg.plates || 0, arr = !!cfg.array, label = "", W = 340, svg;
    function draw() {
      var H;
      if (arr) {
        var g = Math.min(30, (W - 60) / Math.max(per, 1)), rows = Math.max(n, 1);
        H = Math.max(120, rows * g + 50);
        svg = SD.mkSvg(host, W, H, "plates");
        for (var r = 0; r < n; r++) {
          for (var c = 0; c < per; c++) SD.el("circle", { cx: 50 + c * g + g / 2, cy: 30 + r * g + g / 2, r: g * 0.36, fill: "#ff922b", class: r === n - 1 ? "pop" : "" }, svg);
          SD.el("text", { x: 30, y: 30 + r * g + g / 2, "text-anchor": "end", "dominant-baseline": "central", "font-size": 12, fill: "#7a6555" }, svg, per * (r + 1));
        }
      } else {
        H = Math.max(120, Math.ceil(Math.max(n, 1) / 4) * 76 + 40);
        svg = SD.mkSvg(host, W, H, "plates");
        for (var i = 0; i < n; i++) {
          var cx = 46 + (i % 4) * 82, cy = 66 + Math.floor(i / 4) * 76, gg = SD.el("g", { class: i === n - 1 ? "pop" : "" }, svg);
          SD.el("ellipse", { cx: cx, cy: cy, rx: 36, ry: 30, fill: "#fff", stroke: "#adb5bd", "stroke-width": 3 }, gg);
          for (var k = 0; k < per; k++) { var a = k / per * Math.PI * 2, rr = per === 1 ? 0 : 16; SD.el("text", { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.8, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 15 }, gg, cfg.e || "🍡"); }
        }
      }
      SD.el("text", { x: W / 2, y: 18, "text-anchor": "middle", "font-size": 17, "font-weight": "bold", fill: "#d9480f" }, svg, label || (per + " × " + n + " = " + per * n));
    }
    draw();
    var btns = SD.toolBtns(host, [["＋ " + (cfg.array ? "れつ" : "さら"), function () { if (n < 9) { n++; label = ""; SD.sfx("poko"); draw(); } }], ["− " + (cfg.array ? "れつ" : "さら"), function () { if (n > 0) { n--; label = ""; SD.sfx("poko2"); draw(); } }]].concat(cfg.array ? [] : [["▦ ならべる", function () { arr = !arr; SD.sfx("swish"); draw(); }]]));
    return {
      value: function () { return n; },
      isArray: function () { return arr; },
      set: function (v) { n = v; draw(); },
      act: function (name, v) {
        if (name === "add") { var p = Promise.resolve(); for (var i = 0; i < v; i++) p = p.then(function () { n++; SD.sfx("poko"); draw(); return SD.wait(600); }); return p; }
        if (name === "label") { label = v; draw(); return SD.wait(900); }
        if (name === "array") { arr = true; SD.sfx("swish"); draw(); return SD.wait(900); }
        return SD.wait(600);
      },
      destroy: function () { host.innerHTML = ""; btns.remove(); }
    };
  });
})(window.SD);
