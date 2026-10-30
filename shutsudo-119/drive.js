/* ============================================================
   しゅつどう！ 119 — しゅつどう の うんてん
   ・くるま は みち の マス の まんなか を むすぶ せん を すすむ。
     こうさてん で ◀ ▶（ハンドル）を えらんで いれば まがる。えらんで いなければ まっすぐ。
   ・アクセル を はなす と ブレーキ。こうさてん の てまえ で はやすぎる と
     いちど とまって「みぎ・ひだり かくにん」（じかん が すこし かかる）。
   ・ほか の くるま は サイレン に きづくと、こうさてん を さけて みち の ひだり に よって とまる。
     ほこうしゃ は ほどう で まつ。サイレン を けすと よけて くれない。
   ============================================================ */
(function (root) {
  "use strict";

  var D = root.S119_DATA, R = root.S119_RENDER, A = root.S119_ART, T = R.T;
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  var VMAX = 3.0, VSLOW = 1.35, VNPC = 1.3;
  var NPC_COLS = ["#74c0fc", "#ffd43b", "#b2f2bb", "#e599f7", "#ffa8a8", "#ced4da", "#63e6be", "#ffc078", "#91a7ff"];

  var city = null, mapCv = null;
  function getCity() { if (!city) { city = D.buildCity(); mapCv = R.buildMap(city); } return city; }
  function road(x, y) { return R.isR(city, x, y); }
  function isX(x, y) { return road(x, y) && R.nArms(R.mask(city, x, y)) >= 3; }
  function opts(x, y, d) {
    var o = [];
    for (var k = 0; k < 4; k++) if (k !== (d + 2) % 4 && road(x + DX[k], y + DY[k])) o.push(k);
    if (!o.length && d >= 0) o.push((d + 2) % 4);
    return o;
  }

  // みち の けいろ（Uターン なし の BFS）。d < 0 は とまって いる くるま（どの むき にも でられる）
  function route(sx, sy, d, tx, ty) {
    var key = function (x, y, k) { return (y * city.w + x) * 4 + k; };
    var prev = {}, q = [], i;
    var first = d < 0 ? [0, 1, 2, 3].filter(function (k) { return road(sx + DX[k], sy + DY[k]); }) : opts(sx, sy, d);
    for (i = 0; i < first.length; i++) {
      var nx = sx + DX[first[i]], ny = sy + DY[first[i]], kk = key(nx, ny, first[i]);
      prev[kk] = -1; q.push([nx, ny, first[i]]);
    }
    var end = null;
    while (q.length) {
      var s = q.shift();
      if (s[0] === tx && s[1] === ty) { end = s; break; }
      var os = opts(s[0], s[1], s[2]);
      for (i = 0; i < os.length; i++) {
        var x2 = s[0] + DX[os[i]], y2 = s[1] + DY[os[i]], k2 = key(x2, y2, os[i]);
        if (k2 in prev) continue;
        prev[k2] = key(s[0], s[1], s[2]); q.push([x2, y2, os[i]]);
      }
    }
    if (!end) return [[sx, sy]];
    var path = [], k = key(end[0], end[1], end[2]);
    while (k !== -1) { var t = Math.floor(k / 4); path.unshift([t % city.w, Math.floor(t / city.w), k % 4]); k = prev[k]; }
    path.unshift([sx, sy, d]);
    return path;
  }

  function Drive(cv, o) {
    getCity();
    this.cv = cv; this.g = cv.getContext("2d"); this.o = o;
    this.vid = o.vehicle;
    this.car = { x: o.from[0], y: o.from[1], d: -1, p: 0, v: 0, ang: 0, intent: 0, wait: false, pause: 0 };
    this.to = o.to;
    this.path = route(this.car.x, this.car.y, -1, o.to[0], o.to[1]);
    this.car.d = this.path.length > 1 ? this.path[1][2] : 1;
    this.path[0][2] = this.car.d;
    this.car.ang = this.car.d * Math.PI / 2 - Math.PI / 2;
    this.optimal = this.estimate(this.path);
    this.accel = false; this.siren = !!o.siren; this.auto = !!o.auto;
    this.t = 0; this.clock = 0; this.done = false; this.checked = {};
    this.mistakes = 0; this.good = 0; this.blocked = 0;
    this.bubbles = [];
    this.cam = null;
    this.npcs = []; this.peds = [];
    this.spawn();
    this.resize();
  }
  var P = Drive.prototype;

  P.estimate = function (path) {
    var n = 0, i;
    for (i = 1; i < path.length; i++) if (isX(path[i][0], path[i][1])) n++;
    return (path.length - 1) / VMAX + n * 0.7 + 1.2;
  };

  P.spawn = function () {
    var cands = [], x, y, s = (this.o.seed || 1) * 7;
    for (y = 0; y < city.h; y++) for (x = 0; x < city.w; x++) if (road(x, y) && !isX(x, y)) cands.push([x, y]);
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    var c = this.car, n = 0, tries = 0;
    while (n < 10 && tries++ < 300) {
      var p = cands[Math.floor(rnd() * cands.length)];
      if (Math.abs(p[0] - c.x) + Math.abs(p[1] - c.y) < 4) continue;
      if (this.npcs.some(function (q) { return q.x === p[0] && q.y === p[1]; })) continue;
      var os = opts(p[0], p[1], -1).length ? [0, 1, 2, 3].filter(function (k) { return road(p[0] + DX[k], p[1] + DY[k]); }) : [];
      if (!os.length) continue;
      this.npcs.push({ x: p[0], y: p[1], d: os[Math.floor(rnd() * os.length)], p: rnd() * 0.5, v: VNPC, off: 0.2, st: "drive", tm: 0, col: NPC_COLS[n % NPC_COLS.length], seed: Math.floor(rnd() * 1000) });
      n++;
    }
    // ほこうしゃ: こうさてん の かど
    var xs = [];
    for (y = 0; y < city.h; y++) for (x = 0; x < city.w; x++) if (isX(x, y)) xs.push([x, y]);
    for (var i = 0; i < 12; i++) {
      var q = xs[Math.floor(rnd() * xs.length)], cx = rnd() < 0.5 ? -1 : 1, cy = rnd() < 0.5 ? -1 : 1;
      this.peds.push({ bx: q[0] + 0.5 + cx * 0.46, by: q[1] + 0.5 + cy * 0.46, ax: rnd() < 0.5, ph: rnd() * 6, wait: false, col: NPC_COLS[(i + 3) % NPC_COLS.length] });
    }
  };

  P.resize = function () {
    var r = this.cv.getBoundingClientRect(), dpr = Math.min(2, root.devicePixelRatio || 1);
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height); this.dpr = dpr;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.s = Math.max(1.25, Math.min(3.2, Math.sqrt(this.W * this.H) / (9.5 * T)));
  };

  function pos(a) { // マス の たんい の いち（まんなか が +0.5）
    var d = a.d < 0 ? 1 : a.d;
    var x = a.x + 0.5 + DX[d] * a.p, y = a.y + 0.5 + DY[d] * a.p, off = a.off || 0;
    // ひだり がわ（にほん は ひだり つうこう）
    x += DY[d] * off; y += -DX[d] * off;
    return { x: x, y: y };
  }

  P.say = function (txt, col) { this.bubbles.push({ txt: txt, t: 0, col: col || "#fff" }); if (this.bubbles.length > 2) this.bubbles.shift(); };

  P.nextTurn = function () {
    var p = this.path;
    for (var i = 1; i < p.length; i++) {
      if (p[i][2] !== p[i - 1][2]) {
        var rel = (p[i][2] - p[i - 1][2] + 4) % 4;
        return { dir: rel === 1 ? 1 : rel === 3 ? -1 : 0, at: p[i - 1], n: i - 1, cross: isX(p[i - 1][0], p[i - 1][1]) };
      }
    }
    return null;
  };

  P.setIntent = function (k) {
    var c = this.car;
    c.intent = c.intent === k ? 0 : k;
    if (c.wait && c.intent) this.decide();
  };
  P.setSiren = function (on) { this.siren = on; };

  P.decide = function () {
    var c = this.car, os = opts(c.x, c.y, c.d), want = c.intent ? (c.d + (c.intent > 0 ? 1 : 3)) % 4 : -1;
    if (want >= 0 && os.indexOf(want) >= 0) { c.d = want; c.intent = 0; c.wait = false; }
    else if (os.indexOf(c.d) >= 0) { c.wait = false; }
    else if (os.length === 1) { c.d = os[0]; c.wait = false; }
    else { c.wait = true; c.v = 0; return; }
    this.path = route(c.x, c.y, c.d, this.to[0], this.to[1]);
    this.path[0][2] = c.d;
  };

  P.update = function (dt) {
    if (this.done) return;
    this.t += dt; this.clock += dt;
    var c = this.car, self = this;
    var nt = this.nextTurn();
    this.hint = nt;
    // じどう うんてん（テスト・おてほん）
    if (this.auto) {
      if (nt && nt.n <= 1) c.intent = nt.dir;
      var slow = false;
      for (var k = 1; k <= 2; k++) {
        var ax = c.x + DX[c.d] * k, ay = c.y + DY[c.d] * k;
        if (isX(ax, ay) && !this.checked[ay * city.w + ax] && k - c.p < 1.9 && c.v > VSLOW - 0.25) slow = true;
        if (isX(ax, ay)) break;
      }
      this.accel = !slow;
      if (c.wait && nt) { c.intent = nt.dir; this.decide(); }
    }
    // ほか の くるま が まえ に いる？
    var cp = pos(c), hx = DX[c.d], hy = DY[c.d], block = false;
    this.npcs.forEach(function (n) {
      if (n.off > 0.28) return;
      var q = pos(n), fx = q.x - cp.x, fy = q.y - cp.y, f = fx * hx + fy * hy, l = fx * hy - fy * hx;
      if (f > 0.05 && f < 0.85 && Math.abs(l) < 0.3) block = true;
    });
    if (block) { this.blocked += dt; if (!this.siren && Math.floor(this.blocked * 2) !== Math.floor((this.blocked - dt) * 2) && this.blocked > 0.6) this.say("サイレン を ならそう！", "#ffe066"); }
    // はやさ
    var target = c.pause > 0 || c.wait || block ? 0 : this.accel ? VMAX : 0;
    if (c.pause > 0) c.pause -= dt;
    if (c.v < target) c.v = Math.min(target, c.v + 2.4 * dt);
    else c.v = Math.max(target, c.v - (block ? 9 : 5) * dt);
    // こうさてん の てまえ
    var nx = c.x + DX[c.d], ny = c.y + DY[c.d], ni = ny * city.w + nx;
    if (!c.wait && isX(nx, ny) && !this.checked[ni] && c.p > 0.38) {
      this.checked[ni] = 1;
      if (c.v > VSLOW + 0.15) {
        c.v = 0; c.pause = 0.9; this.mistakes++;
        this.say("とまって！ みぎ・ひだり かくにん", "#ffe066");
        if (this.o.onSlow) this.o.onSlow(false);
      } else {
        this.good++;
        this.say("かくにん よし！", "#d3f9d8");
        if (this.o.onSlow) this.o.onSlow(true);
      }
    }
    // すすむ
    if (!c.wait) {
      c.p += c.v * dt;
      while (c.p >= 1 && !this.done) {
        c.p -= 1; c.x += DX[c.d]; c.y += DY[c.d];
        if (c.x === this.to[0] && c.y === this.to[1]) { this.arrive(); break; }
        var before = c.d; this.decide();
        if (c.wait) { c.p = 0; this.say("どっち に まがる？ ◀ ▶", "#fff"); break; }
        if (before === c.d) { /* まっすぐ */ }
      }
    }
    // むき（みため）を なめらか に
    var ta = c.d * Math.PI / 2 - Math.PI / 2, da = ta - c.ang;
    while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    c.ang += da * Math.min(1, dt * 10);
    // ほか の くるま
    cp = pos(c);
    this.npcs.forEach(function (n) { self.npc(n, dt, cp); });
    this.peds.forEach(function (p) {
      var dd = Math.hypot(p.bx - cp.x, p.by - cp.y);
      p.wait = self.siren && dd < 4.2;
      if (!p.wait) p.ph += dt;
    });
    this.bubbles.forEach(function (b) { b.t += dt; });
    this.bubbles = this.bubbles.filter(function (b) { return b.t < 1.8; });
    if (this.o.onTick) this.o.onTick(this);
  };

  P.npc = function (n, dt, cp) {
    var q = pos(n), dd = Math.hypot(q.x - cp.x, q.y - cp.y);
    var inX = isX(n.x, n.y) && n.p < 0.5 || isX(n.x + DX[n.d], n.y + DY[n.d]) && n.p > 0.45;
    if (n.st === "drive" && this.siren && dd < 3.6) {
      // こうさてん の なか では とまらない（こうさてん を さけて から ひだり に よる）
      if (!inX) { n.st = "yield"; n.tm = 0; }
    }
    if (n.st === "yield") {
      n.v = Math.max(0, n.v - 4 * dt);
      n.off = Math.min(0.36, n.off + dt * 0.7);
      if (!this.siren || dd > 4.4) { n.tm += dt; if (n.tm > 0.6) { n.st = "drive"; } }
      else n.tm = 0;
      return;
    }
    n.off = Math.max(0.2, n.off - dt * 0.5);
    // じぶん の まえ に くるま（プレイヤー）が いたら とまる
    var hx = DX[n.d], hy = DY[n.d], fx = cp.x - q.x, fy = cp.y - q.y, f = fx * hx + fy * hy, l = fx * hy - fy * hx;
    var stop = f > 0.05 && f < 0.9 && Math.abs(l) < 0.32;
    var self = this;
    this.npcs.forEach(function (m) {
      if (m === n) return;
      var r = pos(m), gx = r.x - q.x, gy = r.y - q.y, ff = gx * hx + gy * hy, ll = gx * hy - gy * hx;
      if (ff > 0.05 && ff < 0.75 && Math.abs(ll) < 0.25) stop = true;
    });
    void self;
    var tv = stop ? 0 : VNPC;
    n.v += (tv - n.v) * Math.min(1, dt * 4);
    n.p += n.v * dt;
    while (n.p >= 1) {
      n.p -= 1; n.x += DX[n.d]; n.y += DY[n.d];
      var os = opts(n.x, n.y, n.d);
      n.seed = (n.seed * 9301 + 49297) % 233280;
      if (os.length > 1 && os.indexOf(n.d) >= 0 && n.seed % 3 !== 0) { /* まっすぐ */ }
      else n.d = os[n.seed % os.length];
    }
  };

  P.arrive = function () {
    var c = this.car;
    c.v = 0; c.p = 0; this.done = true;
    var r = this.clock / this.optimal, stars = r <= 1.45 ? 3 : r <= 2.1 ? 2 : 1;
    if (this.o.onArrive) this.o.onArrive({ time: this.clock, stars: stars, good: this.good, mistakes: this.mistakes });
  };

  // ---------------- かく ----------------
  P.draw = function () {
    var g = this.g, W = this.W, H = this.H, s = this.s, dpr = this.dpr, c = this.car, t = this.t;
    var cp = pos(c);
    var tx = cp.x + DX[c.d] * 1.2, ty = cp.y + DY[c.d] * 1.2;
    if (!this.cam) this.cam = { x: tx, y: ty };
    this.cam.x += (tx - this.cam.x) * 0.08; this.cam.y += (ty - this.cam.y) * 0.08;
    var ox = W / 2 - this.cam.x * T * s, oy = H / 2 - this.cam.y * T * s;
    // まち の はし を こえない
    var mw = city.w * T * s, mh = city.h * T * s;
    ox = mw <= W ? (W - mw) / 2 : Math.min(0, Math.max(W - mw, ox));
    oy = mh <= H ? (H - mh) / 2 : Math.min(0, Math.max(H - mh, oy));
    this.view = { ox: ox, oy: oy, s: s };
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#7fae55"; g.fillRect(0, 0, this.cv.width, this.cv.height);
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    g.imageSmoothingEnabled = true;
    g.drawImage(mapCv, 0, 0, city.w * T, city.h * T);
    // けいろ
    var p = this.path, i;
    g.strokeStyle = "rgba(255,212,59,.85)"; g.lineWidth = 5; g.lineCap = "round"; g.lineJoin = "round";
    g.setLineDash([2, 9]); g.lineDashOffset = -t * 30;
    g.beginPath(); g.moveTo(cp.x * T, cp.y * T);
    for (i = 1; i < p.length; i++) g.lineTo((p[i][0] + 0.5) * T, (p[i][1] + 0.5) * T);
    g.stroke(); g.setLineDash([]);
    // いきさき
    var gx = (this.to[0] + 0.5) * T, gy = (this.to[1] + 0.5) * T, pul = 1 + Math.sin(t * 5) * 0.15;
    g.fillStyle = "rgba(240,62,62,.25)"; g.beginPath(); g.arc(gx, gy, 16 * pul, 0, 7); g.fill();
    g.strokeStyle = "#f03e3e"; g.lineWidth = 2.5; g.beginPath(); g.arc(gx, gy, 12 * pul, 0, 7); g.stroke();
    var tg = this.o.target;
    if (tg) this.drawGoal(g, tg, t);
    // つぎ の こうさてん（ゆっくり）
    var nx = c.x + DX[c.d], ny = c.y + DY[c.d];
    for (i = 1; i <= 2; i++) {
      var ax = c.x + DX[c.d] * i, ay = c.y + DY[c.d] * i;
      if (isX(ax, ay) && !this.checked[ay * city.w + ax]) {
        var dist = i - c.p;
        if (dist < 2.2) {
          g.strokeStyle = "rgba(255,212,59," + (0.5 + Math.sin(t * 8) * 0.3) + ")"; g.lineWidth = 3;
          g.strokeRect(ax * T + 2, ay * T + 2, T - 4, T - 4);
          g.fillStyle = "#fff"; g.font = "800 8px " + A.FONT; g.textAlign = "center"; g.textBaseline = "middle";
          g.lineWidth = 2.5; g.strokeStyle = "rgba(0,0,0,.6)"; g.strokeText("ゆっくり", (ax + 0.5) * T, ay * T - 4); g.fillText("ゆっくり", (ax + 0.5) * T, ay * T - 4);
        }
        break;
      }
    }
    void nx; void ny;
    // ほこうしゃ
    var self = this;
    this.peds.forEach(function (pd) {
      var px = pd.bx, py = pd.by;
      if (!pd.wait) { var w = Math.sin(pd.ph * 0.8) * 0.28; if (pd.ax) px += w; else py += w; }
      px *= T; py *= T;
      g.fillStyle = "rgba(0,0,0,.2)"; g.beginPath(); g.arc(px + 1, py + 1.5, 3.4, 0, 7); g.fill();
      g.fillStyle = pd.col; g.beginPath(); g.arc(px, py, 3.4, 0, 7); g.fill();
      g.fillStyle = "#ffd8a8"; g.beginPath(); g.arc(px, py, 2, 0, 7); g.fill();
      if (pd.wait) {
        g.font = "8px " + '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText("✋", px + 4, py - 6);
      }
    });
    // ほか の くるま
    this.npcs.forEach(function (n) {
      var q = pos(n);
      g.save(); g.translate(q.x * T, q.y * T); g.rotate(n.d * Math.PI / 2 - Math.PI / 2);
      A.npcTop(g, T * 0.5, n.col, t + n.seed, n.st === "yield");
      g.restore();
    });
    // じぶん の くるま
    if (this.siren) {
      for (i = 0; i < 2; i++) {
        var ph = (t * 1.2 + i * 0.5) % 1;
        g.strokeStyle = "rgba(255,80,80," + (0.35 * (1 - ph)) + ")"; g.lineWidth = 2;
        g.beginPath(); g.arc(cp.x * T, cp.y * T, 10 + ph * 60, 0, 7); g.stroke();
      }
    }
    g.save(); g.translate(cp.x * T, cp.y * T); g.rotate(c.ang);
    A.top(g, this.vid, T * (this.vid === "ladder" ? 0.72 : this.vid === "bike" ? 0.42 : 0.6), t, this.siren, c.intent);
    g.restore();
    // ふきだし
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sx = ox + cp.x * T * s, sy = oy + cp.y * T * s;
    this.bubbles.forEach(function (b, k) {
      var a = Math.min(1, (1.8 - b.t) * 3);
      g.globalAlpha = a;
      g.font = "800 16px " + A.FONT;
      var w = g.measureText(b.txt).width + 22, bx = Math.max(8, Math.min(W - w - 8, sx - w / 2)), by = sy - 64 - k * 38 - b.t * 6;
      g.fillStyle = b.col; A.rr(g, bx, by, w, 32, 16); g.fill();
      g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = "#212529"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(b.txt, bx + w / 2, by + 16.5);
      g.globalAlpha = 1;
    });
    // いきさき が みえない とき の やじるし
    var gsx = ox + gx * s, gsy = oy + gy * s, m = 34;
    if (gsx < 0 || gsy < 0 || gsx > W || gsy > H) {
      var ang = Math.atan2(gsy - H / 2, gsx - W / 2);
      var ex = W / 2 + Math.cos(ang) * (W / 2 - m), ey = H / 2 + Math.sin(ang) * (H / 2 - m);
      ex = Math.max(m, Math.min(W - m, ex)); ey = Math.max(m, Math.min(H - m, ey));
      g.save(); g.translate(ex, ey);
      g.fillStyle = "rgba(255,255,255,.92)"; g.beginPath(); g.arc(0, 0, 22, 0, 7); g.fill();
      g.strokeStyle = "#f03e3e"; g.lineWidth = 3; g.stroke();
      g.rotate(ang);
      g.fillStyle = "#f03e3e"; g.beginPath(); g.moveTo(14, 0); g.lineTo(-6, -10); g.lineTo(-2, 0); g.lineTo(-6, 10); g.closePath(); g.fill();
      g.restore();
    }
    void self;
  };

  P.drawGoal = function (g, tg, t) {
    var X = (tg.x + 0.5) * T, Y = (tg.y + 0.5) * T;
    var EM = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    if (tg.kind === "fire") {
      for (var k = 0; k < 3; k++) A.cloud(g, X + Math.sin(t + k) * 4, Y - 14 - k * 9 - (t * 8 % 9), 5 + k * 1.5, 0.35);
      g.save(); A.flame(g, X - 4, Y + 2, 0.16, t, {}); A.flame(g, X + 6, Y + 4, 0.12, t, { seed: 2 }); g.restore();
    } else {
      g.font = "16px " + EM; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(tg.emoji || "📍", X, Y - 14 + Math.sin(t * 4) * 2);
    }
  };

  root.S119_DRIVE = { Drive: Drive, route: route, getCity: getCity, VMAX: VMAX };
})(window);
