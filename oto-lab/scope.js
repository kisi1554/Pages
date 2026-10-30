/* ============================================================
   おとの ふしぎ ラボ — なみの え（Canvas）
   マイク: AnalyserNode の じかんの なみ。マイク なし: ごうせいおんの なみを けいさんで かく
   どちらも よこはば WINDOW びょう ぶん を かく（たかい おと ほど なみが ぎっしり）
   ============================================================ */
(function (root) {
  "use strict";
  var WINDOW = 0.02; // 20ミリびょう

  function fit(cv) {
    var dpr = root.devicePixelRatio || 1, w = cv.clientWidth || 300, h = cv.clientHeight || 160;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g: g, w: w, h: h };
  }
  function grid(g, w, h) {
    g.fillStyle = "#1b1530"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 1;
    for (var x = 0; x <= w; x += w / 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (var y = 0; y <= h; y += h / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  }
  function line(g, w, h, fn, color) {
    g.strokeStyle = color || "#f783ff"; g.lineWidth = 3; g.lineJoin = "round"; g.beginPath();
    for (var x = 0; x <= w; x += 1) { var y = h / 2 - fn(x / w) * (h * 0.46); if (x) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }

  // けいさんの なみ: freq Hz・amp 0..1。phase で すこしずつ ながれる
  function drawSynth(cv, freq, amp, phase) {
    var c = fit(cv); grid(c.g, c.w, c.h);
    line(c.g, c.w, c.h, function (u) { return amp * Math.sin(2 * Math.PI * (freq * WINDOW * u + (phase || 0))); });
    return amp;
  }

  // マイクの なみ。data は Float32Array（getFloatTimeDomainData）、sr は サンプリング周波数
  function drawData(cv, data, sr) {
    var c = fit(cv), n = Math.min(data.length, Math.round(sr * WINDOW)), start = 0, i, sum = 0;
    grid(c.g, c.w, c.h);
    // なみが とまって みえるように、0 を した から うえに まがる ところ から かく
    for (i = 1; i < data.length - n; i++) if (data[i - 1] < 0 && data[i] >= 0) { start = i; break; }
    for (i = 0; i < data.length; i++) sum += data[i] * data[i];
    var rms = Math.sqrt(sum / data.length), gain = 2.5; // こえは ちいさいので すこし おおきく かく
    line(c.g, c.w, c.h, function (u) {
      var v = data[start + Math.min(n - 1, Math.floor(u * n))] * gain;
      return v > 1 ? 1 : v < -1 ? -1 : v;
    });
    return rms;
  }

  root.OtoScope = { WINDOW: WINDOW, drawSynth: drawSynth, drawData: drawData };
})(this);
