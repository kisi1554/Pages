/* ============================================================
   すうじ の なぞりがき（0〜9）
   ガイド の せん（かきじゅん の ばんごう・● が スタート）を ゆび で なぞる
   ガイド の 8わり いじょう を なぞれて、はみだし が すくなければ ごうかく
   ============================================================ */
(function (SD) {
  "use strict";
  var arc = function (cx, cy, rx, ry, a0, a1, n) {
    var pts = []; n = n || 24;
    for (var i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return pts;
  };
  var line = function () { return Array.prototype.slice.call(arguments); };
  var eight = function () { var pts = []; for (var i = 0; i <= 48; i++) { var t = i / 48 * Math.PI * 2; pts.push([50 - 26 * Math.sin(2 * t), 70 - 48 * Math.cos(t)]); } return pts; };
  // かく すうじ の かきじゅん（100×140 の なか）
  var STROKES = {
    0: [arc(50, 70, 32, 52, -90, -450, 40)],
    1: [line([50, 18], [50, 122])],
    2: [arc(50, 46, 28, 26, 200, 390, 20).concat([[20, 122], [82, 122]])],
    3: [arc(48, 44, 25, 22, 210, 450, 18).concat(arc(48, 92, 28, 28, 270, 510, 20))],
    4: [line([58, 18], [16, 90], [86, 90]), line([62, 46], [62, 122])],
    5: [line([30, 20], [28, 60]).concat(arc(48, 88, 28, 30, 235, 500, 22)), line([30, 20], [78, 20])],
    6: [line([72, 20], [50, 40], [32, 62], [24, 92]).concat(arc(50, 96, 26, 25, 180, -180, 30))],
    7: [line([20, 22], [80, 22], [40, 122])],
    8: [eight()],
    9: [arc(48, 46, 26, 26, 0, -360, 30).concat([[74, 46], [70, 122]])]
  };
  SD.TRACE = STROKES;
  // せん を こまかく（3 ごと）
  var dense = function (pts) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / 3));
      for (var j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  SD.traceScore = function (d, drawn) {
    var guide = [].concat.apply([], STROKES[d].map(dense)), user = [].concat.apply([], drawn);
    if (user.length < 5) return { cover: 0, inside: 0, ok: false };
    var near = function (p, list, r) { for (var i = 0; i < list.length; i++) if (Math.hypot(p[0] - list[i][0], p[1] - list[i][1]) < r) return true; return false; };
    var cover = guide.filter(function (g) { return near(g, user, 13); }).length / guide.length;
    var inside = user.filter(function (u) { return near(u, guide, 18); }).length / user.length;
    return { cover: cover, inside: inside, ok: cover >= 0.8 && inside >= 0.7 };
  };

  SD.tool("trace", function (host, cfg) {
    var d = cfg.d, drawn = [], cur = null, svg, ink, done = false;
    var path = function (pts) { return pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(""); };
    function draw() {
      svg = SD.mkSvg(host, 100, 140, "trace" + (done ? " done" : ""));
      SD.el("rect", { x: 2, y: 2, width: 96, height: 136, rx: 8, fill: "#fffdf5", stroke: "#e2d3c3" }, svg);
      SD.el("line", { x1: 2, y1: 70, x2: 98, y2: 70, stroke: "#f1e6d8", "stroke-dasharray": "3 3" }, svg);
      STROKES[d].forEach(function (s) {
        SD.el("path", { d: path(s), fill: "none", stroke: "#e9ecef", "stroke-width": 15, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
        SD.el("path", { d: path(s), fill: "none", stroke: "#adb5bd", "stroke-width": 1.6, "stroke-dasharray": "4 4" }, svg);
      });
      STROKES[d].forEach(function (s, i) {
        var a = s[0], b = s[Math.min(3, s.length - 1)];
        SD.el("circle", { cx: a[0], cy: a[1], r: 6, fill: "#2f9e44" }, svg);
        SD.el("text", { x: a[0], y: a[1], "text-anchor": "middle", "dominant-baseline": "central", "font-size": 8, fill: "#fff", "font-weight": "bold" }, svg, i + 1);
        var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
        SD.el("path", { d: "M0 -4 L8 0 L0 4 z", fill: "#2f9e44", transform: "translate(" + (a[0] + Math.cos(ang * Math.PI / 180) * 12) + " " + (a[1] + Math.sin(ang * Math.PI / 180) * 12) + ") rotate(" + ang + ")" }, svg);
      });
      ink = SD.el("g", {}, svg);
      drawn.forEach(function (s) { SD.el("path", { d: path(s), fill: "none", stroke: done ? "#2b8a3e" : "#e8590c", "stroke-width": 7, "stroke-linecap": "round", "stroke-linejoin": "round" }, ink); });
    }
    function onDown(ev) {
      ev.preventDefault();
      if (done) return;
      var p = SD.svgPt(svg, ev); cur = [[p.x, p.y]]; drawn.push(cur);
      try { host.setPointerCapture(ev.pointerId); } catch (e) { /* なくても うごく */ }
      cur.el = SD.el("path", { fill: "none", stroke: "#e8590c", "stroke-width": 7, "stroke-linecap": "round", "stroke-linejoin": "round" }, ink);
    }
    function onMove(ev) {
      if (!cur) return;
      ev.preventDefault();
      var p = SD.svgPt(svg, ev); cur.push([p.x, p.y]); cur.el.setAttribute("d", path(cur));
    }
    function onUp() {
      if (!cur) return;
      cur = null;
      var sc = SD.traceScore(d, drawn);
      if (sc.ok) { done = true; SD.sfx("kira"); draw(); }
    }
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    draw();
    var btns = SD.toolBtns(host, [["けす", function () { drawn = []; done = false; draw(); }]]);
    var fillAll = function () { drawn = STROKES[d].map(function (s) { return dense(s); }); done = true; draw(); };
    return {
      value: function () { return done ? d : -1; },
      set: fillAll,
      act: function (name) {
        if (name !== "draw") return SD.wait(600);
        drawn = []; done = false; draw();
        var p = Promise.resolve();
        STROKES[d].forEach(function (s) {
          var pts = dense(s);
          p = p.then(function () { cur = []; drawn.push(cur); cur.el = SD.el("path", { fill: "none", stroke: "#e8590c", "stroke-width": 7, "stroke-linecap": "round" }, ink); });
          for (var i = 0; i < pts.length; i += 2) (function (q) { p = p.then(function () { cur.push(q); cur.el.setAttribute("d", path(cur)); return SD.wait(25); }); })(pts[i]);
          p = p.then(function () { cur = null; return SD.wait(300); });
        });
        return p.then(function () { done = true; draw(); return SD.wait(600); });
      },
      destroy: function () { ["pointerdown", "pointermove", "pointerup", "pointercancel"].forEach(function (e, i) { host.removeEventListener(e, [onDown, onMove, onUp, onUp][i]); }); host.innerHTML = ""; btns.remove(); }
    };
  });
})(window.SD);
