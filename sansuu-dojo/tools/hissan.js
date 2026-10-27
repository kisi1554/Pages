/* ============================================================
   ひっ算 の ばん: 一のくらい から こたえ を いれる
   assist: くりあがり の ちいさい 1、くりさがり の ／ と かりた 10 を みせる
   ============================================================ */
(function (SD) {
  "use strict";
  SD.tool("hissan", function (host, cfg) {
    var a = cfg.a, b = cfg.b, op = cfg.op, ans = op === "+" ? a + b : a - b;
    var A = SD.M.digits(a), B = SD.M.digits(b), N = Math.max(A.length, B.length, String(ans).length), maxIn = op === "+" ? N : A.length;
    var carry = [], lend = [], aNew = A.slice();
    if (op === "+") { var c = 0; for (var i = 0; i < N; i++) { carry[i] = c; c = (A[i] || 0) + (B[i] || 0) + c >= 10 ? 1 : 0; } }
    else { for (var j = 0; j < A.length; j++) { if (aNew[j] < (B[j] || 0)) { lend[j + 1] = true; aNew[j] += 10; aNew[j + 1] -= 1; } } }
    var inp = [], cs = 50, x0 = 14, W = (N + 1) * cs + 28, H = 222, svg;
    var X = function (i) { return x0 + (N - i) * cs + cs / 2; };
    function txt(x, y, s, size, fill, extra) { var e = SD.el("text", Object.assign({ x: x, y: y, "text-anchor": "middle", "dominant-baseline": "central", "font-size": size, "font-weight": "bold", fill: fill || "#3b2a1e" }, extra || {}), svg, s); return e; }
    function draw() {
      svg = SD.mkSvg(host, W, H, "hissan");
      SD.el("rect", { x: 2, y: 2, width: W - 4, height: H - 4, rx: 12, fill: "#fffdf5", stroke: "#e2d3c3" }, svg);
      for (var i = 0; i < N; i++) SD.el("line", { x1: X(i) - cs / 2, y1: 40, x2: X(i) - cs / 2, y2: 205, stroke: "#f1e6d8" }, svg);
      var k = inp.length;
      A.forEach(function (d, i) {
        var crossed = cfg.assist && op === "-" && lend[i + 1] && k >= i;
        var dimmed = cfg.assist && op === "-" && lend[i] && k >= i - 1 && aNew[i] !== d;
        txt(X(i), 70, d, 34, "#3b2a1e");
        if (dimmed) {
          SD.el("line", { x1: X(i) - 12, y1: 84, x2: X(i) + 12, y2: 56, stroke: "#e03131", "stroke-width": 3 }, svg);
          txt(X(i), 34, aNew[i] - (crossed ? 10 : 0), 18, "#e03131");
        }
        if (crossed) txt(X(i) - 20, 56, "1", 15, "#e03131");
      });
      B.forEach(function (d, i) { txt(X(i), 120, d, 34); });
      txt(x0 + cs / 2, 120, op === "+" ? "+" : "−", 32);
      SD.el("line", { x1: x0 + 4, y1: 146, x2: W - 10, y2: 146, stroke: "#3b2a1e", "stroke-width": 3 }, svg);
      if (cfg.assist && op === "+") for (var q = 1; q < N; q++) if (carry[q] && k >= q) txt(X(q), 98, "1", 16, "#e03131", { class: "pop" });
      for (var m = 0; m < maxIn; m++) {
        var on = m === k;
        SD.el("rect", { x: X(m) - 21, y: 156, width: 42, height: 46, rx: 8, fill: on ? "#fff4c4" : "#fff", stroke: on ? "#f08c00" : "#d8c6b2", "stroke-width": on ? 3 : 1.5, "stroke-dasharray": on ? "" : "4 3" }, svg);
        if (m < k) txt(X(m), 180, inp[m], 32, "#0b7285");
      }
    }
    function put(d) {
      if (inp.length >= maxIn) { SD.sfx("bu"); return; }
      inp.push(d); SD.sfx("poko"); draw();
    }
    draw();
    var keys = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (d) { return [String(d), function () { put(d); }]; });
    keys.push(["けす", function () { inp.pop(); SD.sfx("poko2"); draw(); }]);
    var btns = SD.toolBtns(host, keys);
    btns.classList.add("digits");
    return {
      value: function () { return inp.length ? Number(inp.slice().reverse().join("")) : -1; },
      set: function (v) { inp = SD.M.digits(v); draw(); },
      act: function (name, d) {
        if (name === "digit") { put(d); return SD.wait(900); }
        return SD.wait(600);
      },
      destroy: function () { host.innerHTML = ""; btns.remove(); }
    };
  });
})(window.SD);
