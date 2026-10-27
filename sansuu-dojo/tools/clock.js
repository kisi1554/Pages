/* ============================================================
   とけい: ながい はり・みじかい はり を ゆび で まわす
   ながい はり を まわすと みじかい はり も いっしょ に すすむ（ギア）
   cfg.snap: 30（なんじはん）・5・1 ふん
   ============================================================ */
(function (SD) {
  "use strict";
  var M = SD.M;
  SD.tool("clock", function (host, cfg) {
    var snap = cfg.snap || 1, total = M.toMin(cfg.h || 12, cfg.m || 0), svg, hh, mh, dig, drag = null;
    var R = 118;
    function draw() {
      svg = SD.mkSvg(host, R * 2, R * 2 + (cfg.digital ? 30 : 0), "clocktool");
      var g = SD.el("g", { transform: "translate(" + R + "," + R + ")" }, svg);
      g.innerHTML = SD.pics.clockFace({ minutes: cfg.minutes });
      hh = SD.el("g", { class: "hh" }, g);
      SD.el("line", { x1: 0, y1: 10, x2: 0, y2: -50, stroke: "#c92a2a", "stroke-width": 10, "stroke-linecap": "round" }, hh);
      SD.el("circle", { cx: 0, cy: -50, r: 12, fill: "#c92a2a", opacity: 0.18 }, hh);
      mh = SD.el("g", { class: "mh" }, g);
      SD.el("line", { x1: 0, y1: 12, x2: 0, y2: -82, stroke: "#1c7ed6", "stroke-width": 6, "stroke-linecap": "round" }, mh);
      SD.el("circle", { cx: 0, cy: -82, r: 14, fill: "#1c7ed6", opacity: 0.18 }, mh);
      SD.el("circle", { r: 8, fill: "#3b2a1e" }, g);
      if (cfg.digital) dig = SD.el("text", { x: R, y: R * 2 + 18, "text-anchor": "middle", "font-size": 20, "font-weight": "bold", fill: "#3b2a1e" }, svg);
      upd();
    }
    function upd() {
      var t = M.fromMin(total), A = M.handAngles(t.h, t.m);
      hh.setAttribute("transform", "rotate(" + A.hour + ")");
      mh.setAttribute("transform", "rotate(" + A.minute + ")");
      if (dig) dig.textContent = SD.say(M.fmtTime(t.h, t.m, false));
    }
    var angOf = function (ev) {
      var p = SD.svgPt(svg, ev), dx = p.x - R, dy = p.y - R;
      return { a: (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, d: Math.hypot(dx, dy) };
    };
    function onDown(ev) {
      ev.preventDefault();
      var q = angOf(ev), t = M.fromMin(total), A = M.handAngles(t.h, t.m);
      var near = function (x) { var d = Math.abs(((q.a - x + 540) % 360) - 180); return d; };
      // ちかい はり を つかむ（まんなか ちかく なら みじかい はり を ゆうせん）
      var which = q.d < 62 ? (near(A.hour) < 40 ? "h" : near(A.minute) < 40 ? "m" : "h") : (near(A.minute) < 45 ? "m" : near(A.hour) < 30 ? "h" : "m");
      drag = { w: which, last: q.a };
      try { host.setPointerCapture(ev.pointerId); } catch (e) { /* なくても うごく */ }
      onMove(ev);
    }
    function onMove(ev) {
      if (!drag) return;
      ev.preventDefault();
      var q = angOf(ev), da = ((q.a - drag.last + 540) % 360) - 180;
      drag.last = q.a;
      // ながい はり: 1まわり＝60ぷん、みじかい はり: 1まわり＝12じかん
      drag.raw = (drag.raw == null ? total : drag.raw) + (drag.w === "m" ? da / 6 : da * 2);
      var nt = Math.round(drag.raw / snap) * snap;
      if (nt !== total) { total = ((nt % 720) + 720) % 720; if (snap >= 5 || total % 5 === 0) SD.sfx("tick"); upd(); }
    }
    function onUp() { drag = null; }
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    draw();
    return {
      value: function () { var t = M.fromMin(total); return t.h + ":" + t.m; },
      minutes: function () { return total; },
      set: function (v) { var s = String(v).split(":").map(Number); total = M.toMin(s[0], s[1]); upd(); },
      act: function (name, h, m) {
        if (name !== "to") return SD.wait(600);
        var goal = M.toMin(h, m), diff = ((goal - total) % 720 + 720) % 720, steps = Math.max(1, Math.round(diff / 5));
        var p = Promise.resolve();
        for (var i = 1; i <= steps; i++) (function (i) { p = p.then(function () { total = (total + diff / steps + 720) % 720; total = Math.round(total); upd(); return SD.wait(40); }); })(i);
        return p.then(function () { total = goal; upd(); SD.sfx("tick"); return SD.wait(500); });
      },
      destroy: function () { ["pointerdown", "pointermove", "pointerup", "pointercancel"].forEach(function (e, i) { host.removeEventListener(e, [onDown, onMove, onUp, onUp][i]); }); host.innerHTML = ""; }
    };
  });
})(window.SD);
