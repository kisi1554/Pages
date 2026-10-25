/* ============================================================
   そろばん どうじょう — がめんの そろばん（SVG で コード びょうが）
   ・もくめ の わく と はり、ていいてん（てん）、つやの ある たま
   ・タップ: その たま まで うごく ／ スワイプ: うえ・したに はじく
   ・ゆびの アイコン（おやゆび・ひとさしゆび）、まちがえた たまを あかく する
   ・みほんの さいせい（phases）と、ごはさんの アニメ
   ============================================================ */
(function (root) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var S = root.Soroban;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  /* もくめ が まいかい おなじに なるように きまった らんすう */
  function seeded(seed) { return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

  var FINGER = {
    thumb: { up: "👍", label: "おやゆび" },
    index: { up: "☝️", down: "👇", label: "ひとさしゆび" }
  };

  function SorobanView(host, opts) {
    this.host = host;
    this.opts = opts || {};
    this.rods = null;
    this.interactive = true;
    this.onUser = null;       // (moves, rods) => void
    this.token = 0;           // みほん さいせいの とりけし よう
    host.classList.add("soroban");
    var self = this;
    this.layout();
    if (root.ResizeObserver) {
      var lastW = host.clientWidth;
      new ResizeObserver(function () {
        if (Math.abs(host.clientWidth - lastW) > 2) { lastW = host.clientWidth; self.layout(); }
      }).observe(host);
    }
  }

  var P = SorobanView.prototype;

  P.layout = function () {
    var host = this.host, o = this.opts;
    var W = Math.max(280, host.clientWidth || 360);
    var fw = 14;                                   // わくの ふとさ
    var minCol = 48;
    var N = Math.max(5, Math.min(o.maxRods || 13, Math.floor((W - 2 * fw) / minCol)));
    var colW = Math.min(o.maxCol || 66, (W - 2 * fw) / N);
    var keep = this.rods ? this.value() : 0;
    this.N = N; this.unit = N - 2; this.colW = colW; this.fw = fw;
    var bw = colW * 0.9, bh = Math.min(colW * 0.46, 30);
    var gap = 0.4 * bh;
    var g = this.g = {};
    g.bw = bw; g.bh = bh;
    g.width = N * colW + 2 * fw;
    g.left = (W - g.width) / 2;
    g.top = 0;
    g.upTop = fw + 3;
    g.fiveUp = g.upTop + bh / 2;
    g.fiveDown = g.upTop + bh + gap + bh / 2;
    g.beamTop = g.upTop + 2 * bh + gap;
    g.beamH = Math.max(10, colW * 0.2);
    g.beamBot = g.beamTop + g.beamH;
    g.lowBot = g.beamBot + 5 * bh + gap;
    g.H = g.lowBot + 3 + fw;
    g.labelH = o.noLabels ? 0 : 22;
    this.H = g.H + g.labelH;

    host.innerHTML = "";
    var svg = this.svg = el("svg", { viewBox: "0 0 " + W + " " + this.H, width: W, height: this.H, role: "img", "aria-label": "そろばん" }, host);
    this.W = W;
    this.draw();
    this.finger = document.createElement("div");
    this.finger.className = "finger";
    host.appendChild(this.finger);
    this.bind();
    var fits = String(Math.floor(keep)).length <= this.unit + 1 && keep === Math.floor(keep);
    this.setRods(fits ? S.fromNumber(keep, N, this.unit) : S.fromNumber(0, N, this.unit), false);
    this.setLabels(this.opts.labels !== false);
  };

  P.rodX = function (i) { return this.g.left + this.fw + this.colW * (i + 0.5); };

  P.draw = function () {
    var g = this.g, svg = this.svg, N = this.N, x0 = g.left, w = g.width;
    var defs = el("defs", {}, svg);
    var uid = "s" + Math.floor(Math.random() * 1e6);
    this.uid = uid;
    function grad(id, stops, attrs) {
      var lg = el(attrs && attrs.r ? "radialGradient" : "linearGradient", Object.assign({ id: uid + id }, attrs || { x1: 0, y1: 0, x2: 0, y2: 1 }), defs);
      stops.forEach(function (s) { el("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] == null ? 1 : s[2] }, lg); });
    }
    grad("wood", [[0, "#8a5a32"], [0.45, "#a86f3e"], [1, "#6e4424"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
    grad("beam", [[0, "#b98250"], [0.5, "#8d5a2f"], [1, "#5e391c"]]);
    grad("inner", [[0, "#f3e6cf"], [1, "#e6d2b0"]]);
    grad("bead", [[0, "#2b160b"], [0.18, "#6b3a1d"], [0.42, "#9a5b2e"], [0.6, "#5a2f15"], [1, "#1c0d05"]]);
    grad("red", [[0, "#5c0b0b"], [0.18, "#b3261e"], [0.42, "#ef5350"], [0.6, "#a11d17"], [1, "#4a0606"]]);
    grad("rod", [[0, "#d9c39a"], [0.5, "#fff6e0"], [1, "#b89a68"]], { x1: 0, y1: 0, x2: 1, y2: 0 });

    // わく（もくめ）
    var frame = el("g", {}, svg);
    el("rect", { x: x0, y: 1, width: w, height: g.H - 2, rx: 12, fill: "url(#" + uid + "wood)", stroke: "#4a2c14", "stroke-width": 2 }, frame);
    var clip = el("clipPath", { id: uid + "clip" }, defs);
    el("rect", { x: x0, y: 1, width: w, height: g.H - 2, rx: 12 }, clip);
    var grain = el("g", { "clip-path": "url(#" + uid + "clip)", stroke: "#4b2a12", fill: "none", "stroke-linecap": "round" }, frame);
    var rnd = seeded(20260125);
    for (var i = 0; i < 26; i++) {
      var y = 4 + rnd() * (g.H - 8), amp = 2 + rnd() * 6, d = "M " + (x0 - 10) + " " + y.toFixed(1);
      for (var x = x0; x <= x0 + w + 40; x += 40) {
        d += " Q " + (x + 10).toFixed(1) + " " + (y + (rnd() - 0.5) * amp * 2).toFixed(1) + " " + (x + 20).toFixed(1) + " " + (y + (rnd() - 0.5) * amp).toFixed(1);
        d += " T " + (x + 40).toFixed(1) + " " + (y + (rnd() - 0.5) * amp).toFixed(1);
      }
      el("path", { d: d, "stroke-width": (0.6 + rnd() * 1.4).toFixed(2), opacity: (0.12 + rnd() * 0.18).toFixed(2) }, grain);
    }
    // なかの あな
    el("rect", { x: x0 + this.fw, y: this.fw, width: w - 2 * this.fw, height: g.H - 2 * this.fw, rx: 3, fill: "url(#" + uid + "inner)", stroke: "#3e230f", "stroke-width": 1.5 }, frame);

    // ハイライト（みほんで うごかす けた）
    this.hl = el("rect", { x: 0, y: this.fw, width: this.colW, height: g.H - 2 * this.fw, fill: "#ffd54f", opacity: 0, class: "hlrod" }, svg);

    // しん（けた）
    for (i = 0; i < N; i++) {
      el("rect", { x: this.rodX(i) - 2.5, y: this.fw, width: 5, height: g.H - 2 * this.fw, fill: "url(#" + uid + "rod)" }, svg);
    }
    // たま
    this.beads = [];
    var bw = g.bw, bh = g.bh;
    var shape = "M " + (-bw / 2) + " 0 Q " + (-bw * 0.34) + " " + (-bh / 2) + " 0 " + (-bh / 2) + " Q " + (bw * 0.34) + " " + (-bh / 2) + " " + (bw / 2) + " 0 Q " + (bw * 0.34) + " " + (bh / 2) + " 0 " + (bh / 2) + " Q " + (-bw * 0.34) + " " + (bh / 2) + " " + (-bw / 2) + " 0 Z";
    var beadLayer = el("g", {}, svg);
    for (i = 0; i < N; i++) {
      var col = [];
      for (var k = 0; k < 5; k++) {           // 0 = 5だま、1..4 = 1だま（うえから）
        var bg = el("g", { class: "bead", "data-r": i, "data-k": k }, beadLayer);
        el("path", { d: shape, fill: "url(#" + uid + "bead)", stroke: "#140802", "stroke-width": 1, class: "body" }, bg);
        el("ellipse", { cx: -bw * 0.12, cy: -bh * 0.2, rx: bw * 0.22, ry: bh * 0.12, fill: "#fff", opacity: 0.38 }, bg);
        el("ellipse", { cx: bw * 0.18, cy: -bh * 0.08, rx: bw * 0.06, ry: bh * 0.05, fill: "#fff", opacity: 0.55 }, bg);
        el("rect", { x: -3, y: -bh / 2 + 1, width: 6, height: bh - 2, fill: "#000", opacity: 0.18 }, bg);
        col.push(bg);
      }
      this.beads.push(col);
    }
    // はり と ていいてん（はりは たまの うえに かさねる）
    el("rect", { x: x0 + this.fw - 1, y: g.beamTop, width: w - 2 * this.fw + 2, height: g.beamH, fill: "url(#" + uid + "beam)", stroke: "#3e230f", "stroke-width": 1 }, svg);
    el("line", { x1: x0 + this.fw, y1: g.beamTop + 2, x2: x0 + w - this.fw, y2: g.beamTop + 2, stroke: "#e0b07a", "stroke-width": 1, opacity: 0.6 }, svg);
    for (i = 0; i < N; i++) {
      if ((this.unit - i) % 3 === 0) {
        el("circle", { cx: this.rodX(i), cy: g.beamTop + g.beamH / 2, r: Math.max(2.6, g.beamH * 0.22), fill: "#fffbe8", stroke: "#3e230f", "stroke-width": 0.8, class: i === this.unit ? "dot unit" : "dot" }, svg);
      }
    }
    // くらいの なまえ
    this.labelG = el("g", { class: "labels" }, svg);
    if (this.g.labelH) {
      for (i = 0; i <= this.unit; i++) {
        var p = this.unit - i;
        if (p > 4) continue;
        var t = el("text", { x: this.rodX(i), y: g.H + 16, "text-anchor": "middle", class: p === 0 ? "lb unit" : "lb" }, this.labelG);
        t.textContent = S.PLACE_NAME[p];
      }
    }
  };

  P.setLabels = function (on) { this.labelG.style.display = on ? "" : "none"; };

  /* たまの いち */
  P.beadY = function (rod, k) {
    var g = this.g, b = this.rods[rod];
    if (k === 0) return b.five ? g.fiveDown : g.fiveUp;
    var j = k - 1;                         // 0..3（うえから）
    var on = j < b.ones;
    return on ? g.beamBot + j * g.bh + g.bh / 2 : g.beamBot + g.bh * 1.4 + j * g.bh + g.bh / 2;
  };
  P.paint = function () {
    for (var i = 0; i < this.N; i++) for (var k = 0; k < 5; k++) {
      this.beads[i][k].style.transform = "translate(" + this.rodX(i).toFixed(1) + "px," + this.beadY(i, k).toFixed(1) + "px)";
    }
  };
  P.speed = function (ms) { this.host.style.setProperty("--dur", ms + "ms"); };

  P.setRods = function (rods, anim) {
    this.rods = S.clone(rods);
    this.clearMarks();
    if (!anim) { this.speed(0); this.paint(); this.host.getBoundingClientRect(); this.speed(140); }
    else this.paint();
  };
  P.getRods = function () { return S.clone(this.rods); };
  P.value = function () { return S.toNumber(this.rods, this.unit); };
  P.capacity = function () { return Math.pow(10, this.unit + 1) - 1; };
  P.setValue = function (n, anim) {
    var r = S.fromNumber(n, this.N, this.unit);
    var changed = r.some(function (b, i) { return this.rods[i].five !== b.five || this.rods[i].ones !== b.ones; }, this);
    this.setRods(r, anim);
    if (anim && changed && this.opts.sound) this.opts.sound("pachi");
  };

  /* ---------- さわる ---------- */
  P.bind = function () {
    var self = this, svg = this.svg, start = null;
    function pt(e) {
      var r = svg.getBoundingClientRect();
      return { x: (e.clientX - r.left) * self.W / r.width, y: (e.clientY - r.top) * self.H / r.height };
    }
    svg.addEventListener("pointerdown", function (e) {
      if (!self.interactive) return;
      var p = pt(e), g = self.g;
      var rod = Math.floor((p.x - g.left - self.fw) / self.colW);
      if (rod < 0 || rod >= self.N || p.y < self.fw - 6 || p.y > g.H) return;
      var deck = p.y < g.beamTop + 2 ? "up" : p.y > g.beamBot - 2 ? "low" : null;
      if (!deck) return;
      var k = 0;
      if (deck === "low") {
        var best = 1e9;
        for (var j = 1; j <= 4; j++) { var dd = Math.abs(self.beadY(rod, j) - p.y); if (dd < best) { best = dd; k = j; } }
      }
      start = { rod: rod, k: k, y: p.y, id: e.pointerId };
      try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    function end(e) {
      if (!start || e.pointerId !== start.id) return;
      var s = start; start = null;
      var dy = pt(e).y - s.y;
      var b = self.rods[s.rod], nb = { five: b.five, ones: b.ones };
      var swipe = Math.abs(dy) >= 12 ? (dy < 0 ? "up" : "down") : null;
      if (s.k === 0) {
        nb.five = swipe ? (swipe === "down" ? 1 : 0) : 1 - b.five;
      } else {
        var j = s.k - 1, on = j < b.ones;
        if (!swipe) nb.ones = on ? j : j + 1;
        else if (swipe === "up") nb.ones = Math.max(b.ones, j + 1);
        else nb.ones = Math.min(b.ones, j);
      }
      self.userSet(s.rod, nb);
    }
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", function () { start = null; });
  };

  P.userSet = function (rod, nb) {
    var b = this.rods[rod], moves = [], place = this.unit - rod;
    if (nb.five !== b.five) moves.push({ place: place, bead: "five", delta: nb.five - b.five, finger: "index" });
    if (nb.ones !== b.ones) moves.push({ place: place, bead: "one", delta: nb.ones - b.ones, finger: nb.ones > b.ones ? "thumb" : "index" });
    if (!moves.length) return;
    this.clearMarks();
    this.rods[rod] = nb;
    this.paint();
    if (this.opts.sound) this.opts.sound("pachi");
    this.showFinger(rod, moves[moves.length - 1]);
    if (this.onUser) this.onUser(moves, this.getRods());
  };

  /* ゆびの アイコン */
  P.showFinger = function (rod, m) {
    if (this.opts.fingerOn && !this.opts.fingerOn()) return;
    var up = m.bead === "five" ? m.delta < 0 : m.delta > 0;
    var f = FINGER[m.finger];
    var icon = m.finger === "thumb" ? f.up : (up ? f.up : f.down);
    var r = this.svg.getBoundingClientRect(), hr = this.host.getBoundingClientRect();
    var sc = r.width / this.W;
    var x = (this.rodX(rod) + this.colW * 0.55) * sc + r.left - hr.left;
    var y = (m.bead === "five" ? this.g.beamTop - this.g.bh : this.g.beamBot + this.g.bh * 3.2) * sc + r.top - hr.top;
    var fe = this.finger;
    fe.innerHTML = "<span>" + icon + "</span><small>" + f.label + "</small>";
    fe.style.left = Math.min(hr.width - 70, Math.max(0, x)) + "px";
    fe.style.top = y + "px";
    fe.className = "finger show " + m.finger;
    clearTimeout(this._ft);
    this._ft = setTimeout(function () { fe.className = "finger"; }, 1100);
  };

  /* まちがえた たまを あかく */
  P.markWrong = function (target) {
    var n = 0;
    for (var i = 0; i < this.N; i++) {
      var a = this.rods[i], b = target[i];
      if (a.five !== b.five) { this.beads[i][0].classList.add("wrong"); n++; }
      for (var j = 0; j < 4; j++) {
        if ((j < a.ones) !== (j < b.ones)) { this.beads[i][j + 1].classList.add("wrong"); n++; }
      }
    }
    this.svg.querySelectorAll(".wrong .body").forEach(function (p) { p.setAttribute("fill", "url(#" + this.uid + "red)"); }, this);
    return n;
  };
  P.clearMarks = function () {
    var uid = this.uid;
    this.svg.querySelectorAll(".wrong").forEach(function (g) {
      g.classList.remove("wrong");
      g.querySelector(".body").setAttribute("fill", "url(#" + uid + "bead)");
    });
  };

  P.highlight = function (rod) {
    if (rod == null) { this.hl.setAttribute("opacity", 0); return; }
    this.hl.setAttribute("x", this.rodX(rod) - this.colW / 2);
    this.hl.setAttribute("opacity", 0.45);
  };

  /* うごきを 1つ（みほん よう） */
  P.doMove = function (m) {
    var rod = this.unit - m.place;
    if (rod < 0) throw new Error("けたが たりない");
    var b = this.rods[rod];
    if (m.bead === "five") b.five += m.delta; else b.ones += m.delta;
    this.paint();
    if (this.opts.sound) this.opts.sound("pachi");
    this.highlight(rod);
    this.showFinger(rod, m);
  };
  P.stop = function () { this.token++; this.highlight(null); };
  /* phases を ゆっくり さいせい。onPhase(ph) で せつめいを だす。とちゅうで stop() されたら false */
  P.play = async function (phases, speed, onPhase) {
    var my = ++this.token, sp = speed || 1;
    this.speed(Math.round(260 * sp));
    for (var i = 0; i < phases.length; i++) {
      if (onPhase) onPhase(phases[i], i);
      await wait(700 * sp);
      for (var j = 0; j < phases[i].moves.length; j++) {
        if (my !== this.token) return false;
        this.doMove(phases[i].moves[j]);
        await wait(900 * sp);
      }
      if (my !== this.token) return false;
    }
    await wait(400 * sp);
    this.speed(140);
    this.highlight(null);
    return my === this.token;
  };

  /* ごはさん: したの たまを さげて、ひとさしゆびで はりを なぞって 5だまを あげる */
  P.clearAll = async function (fast) {
    var my = ++this.token;
    this.highlight(null);
    this.clearMarks();
    var any = this.rods.some(function (b) { return b.five || b.ones; });
    if (this.opts.sound) this.opts.sound("jara");
    if (fast || !any) { this.setRods(S.fromNumber(0, this.N, this.unit), true); await wait(fast ? 150 : 250); return; }
    this.speed(200);
    var rods = this.rods;
    rods.forEach(function (b) { b.ones = 0; });
    this.paint();
    await wait(260);
    this.speed(120);
    for (var i = 0; i < this.N; i++) {
      if (my !== this.token) return;
      if (rods[i].five) { rods[i].five = 0; this.paint(); }
      await wait(28);
    }
    await wait(180);
    this.speed(140);
  };

  root.SorobanView = SorobanView;
})(this);
