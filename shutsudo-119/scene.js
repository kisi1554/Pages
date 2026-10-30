/* ============================================================
   しゅつどう！ 119 — げんば
   ・fire / ladder: ホース を ドラッグ して ほのお に みず を かける。
     ほのお は かわいい キャラ。けされる と「ひゃ〜」と にげて いく。
     はしごしゃ は はしご を のばして から、うえ の まど を ねらう。
   ・amb: こえかけ → まもる／さんそ マスク → たんか → きゅうきゅうしゃ の なか。
     けが の ようす は かかない（からだ の いたい ところ は ことば だけ）。
   ・maigo: ないて いる こ を みつけて、おはなし を きいて、かぞく の もと へ。
   ============================================================ */
(function (root) {
  "use strict";

  var A = root.S119_ART, AU = root.S119_AUDIO;
  var EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  function Scene(cv, m, ui, phase) {
    this.cv = cv; this.g = cv.getContext("2d"); this.m = m; this.ui = ui; this.phase = phase || "site";
    this.t = 0; this.done = false; this.lines = [];
    this.resize();
    var k = phase === "hospital" ? "hospital" : m.scene;
    this.kind = k;
    if (k === "fire" || k === "ladder") this.initFire();
    else if (k === "amb") this.initAmb();
    else if (k === "hospital") this.initHospital();
    else this.initMaigo();
  }
  var S = Scene.prototype;

  S.resize = function () {
    var r = this.cv.getBoundingClientRect(), dpr = Math.min(2, root.devicePixelRatio || 1);
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height); this.dpr = dpr;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.gy = this.H * 0.88;
    this.u = Math.min(this.W / 390, this.H / 560); // ひとの おおきさ の めやす
    if (this.layout) this.layout();
  };

  // ふきだし（ひと の うえ に でる ことば）
  S.speak = function (who, txt, voicePitch) {
    this.lines.push({ who: who, txt: txt, t: 0 });
    if (this.lines.length > 2) this.lines.shift();
    AU.say(txt, voicePitch);
  };

  S.act = function (label, fn) { this.ui.actions([{ label: label, fn: fn.bind(this) }]); };
  S.finish = function (msg) {
    if (this.done) return;
    this.done = true;
    var self = this;
    this.ui.msg(msg);
    AU.fanfare();
    setTimeout(function () { self.ui.done(); }, 1600);
  };

  // ======================= かじ =======================
  S.initFire = function () {
    var ladder = this.kind === "ladder";
    this.ext = 0; this.extending = false;
    this.aim = null; this.spray = false;
    this.layout = function () {
      var W = this.W, H = this.H, gy = this.gy;
      this.tw = Math.min(W * 0.36, H * 0.42, 300);
      this.tx = 8;
      if (ladder) {
        var bw = Math.min(W * 0.48, 300), bx = W - bw - 8, fh = Math.min((gy - 40) / 5.6, 90);
        this.bld = { x: bx, w: bw, h: fh * 5, fh: fh, top: gy - fh * 5, floors: 5 };
        // のびきった はしご の さき が 4〜5かい の たかさ に くる おおきさ（よこなが の がめん で はみださない）
        this.tw = Math.min(this.tw, fh * 4.1 / 2.0);
      } else {
        var hw = Math.min(W * 0.5, 340), hx = W - hw - 10, hh = Math.min(H * 0.3, 200);
        this.bld = { x: hx, w: hw, h: hh, top: gy - hh };
      }
    };
    this.layout();
    var b = this.bld, self = this;
    // ほのお の いち は たてもの に たいする わりあい（がめん の おおきさ が かわっても ついて くる）
    var spots = ladder ? [[0.25, 4.5], [0.7, 4.45], [0.5, 3.55]] : [[0.25, 0.55], [0.72, 0.6], [0.5, -0.05]];
    this.flames = spots.map(function (s, i) { return { rx: s[0], ry: s[1], hp: 1, run: 0, hit: false, seed: i * 2.1 }; });
    this.fpos = function (f) {
      var bb = self.bld;
      if (ladder) return { x: bb.x + bb.w * f.rx, y: self.gy - bb.fh * f.ry };
      return { x: bb.x + bb.w * f.rx, y: bb.top + bb.h * f.ry + 10 };
    };
    this.ui.msg(ladder ? "5かい は たかい！ まず「はしご を のばす」を おそう" : "ゆび で なぞって ホース の みず を ほのお に かけよう！");
    AU.say(ladder ? "ごかい は たかいね。はしごを のばそう" : "ほのおに みずを かけよう");
    if (ladder) this.act("🪜 はしご を のばす", function () {
      this.extending = true; this.ui.actions([]); AU.pop();
      this.ui.msg("はしご が のびて いく…");
    });
  };
  S.nozzle = function () {
    var u = this.tw / 100, x0 = this.tx, gy = this.gy;
    if (this.kind === "ladder") {
      var ang = -this.ext * 1.0, L = (66 + this.ext * 120) * u;
      return { x: x0 + 14 * u + Math.cos(ang) * L + 4 * u, y: gy - 38 * u + Math.sin(ang) * L - 10 * u };
    }
    return { x: x0 + this.tw + 30 * this.u, y: gy - 64 * this.u };
  };
  S.reachTop = function () {
    var n = this.nozzle();
    return this.kind === "ladder" ? n.y - this.H * 0.25 : this.gy - this.H * 0.48;
  };
  S.updateFire = function (dt) {
    var self = this;
    if (this.extending) {
      this.ext = Math.min(1, this.ext + dt * 0.7);
      if (this.ext >= 1) { this.extending = false; this.ui.msg("はしご が のびた！ ゆび で なぞって うえ の ほのお に みず を かけよう"); AU.ok(); AU.say("みずを かけよう"); }
    }
    var n = this.nozzle(), top = this.reachTop(), left = 0;
    AU.hose(this.spray && !!this.aim);
    this.flames.forEach(function (f) {
      var p = self.fpos(f);
      if (f.run) { f.run += dt * 0.8; return; }
      left++;
      f.hit = false;
      if (self.spray && self.aim && self.aim.y >= top && Math.hypot(self.aim.x - p.x, self.aim.y - (p.y - 18 * self.u)) < 54 * self.u) {
        f.hit = true; f.hp -= dt * 0.6;
        if (f.hp <= 0) { f.run = 0.001; AU.pop(); self.speak("fire", "ひゃ〜！ にげろ〜", 1.6); }
      }
    });
    void n;
    if (this.spray && this.aim && this.aim.y < top && !this.warned) {
      this.warned = true;
      this.ui.msg(this.kind === "ladder" && this.ext < 1 ? "とどかない！ さき に はしご を のばそう" : "もうすこし した を ねらって みよう");
    }
    if (!left) { AU.hose(false); this.spray = false; this.finish("しょうか かんりょう！ ほのお は みんな にげて いったよ"); this.speak("man", "ありがとう ございました！"); }
  };
  S.drawFire = function () {
    var g = this.g, W = this.W, H = this.H, gy = this.gy, t = this.t, b = this.bld, u = this.u, self = this;
    var sky = g.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, "#a5d8ff"); sky.addColorStop(1, "#e7f5ff");
    g.fillStyle = sky; g.fillRect(0, 0, W, gy);
    g.fillStyle = "#adb5bd"; g.fillRect(0, gy, W, H - gy);
    g.fillStyle = "#868e96"; g.fillRect(0, gy, W, 4);
    var alive = this.flames.filter(function (f) { return !f.run; }).length;
    // けむり
    for (var k = 0; k < 6 * alive / 3; k++) {
      var sx = b.x + b.w * (0.2 + (k % 3) * 0.3), sy = b.top - 20 - ((t * 25 + k * 40) % 140);
      A.cloud(g, sx + Math.sin(t + k) * 10, sy, 16 + k * 2, 0.3 * (alive / 3));
    }
    if (this.kind === "ladder") {
      g.fillStyle = "#e9ecef"; g.fillRect(b.x, b.top, b.w, b.h);
      g.fillStyle = "#ced4da"; g.fillRect(b.x, b.top - 8, b.w, 8);
      for (var f = 0; f < 5; f++) for (var c = 0; c < 3; c++) {
        var wx = b.x + b.w * (0.1 + c * 0.3), wy = gy - b.fh * (f + 1) + b.fh * 0.22;
        g.fillStyle = f >= 3 && alive ? "#ffd8a8" : "#a5d8ff"; g.fillRect(wx, wy, b.w * 0.22, b.fh * 0.5);
        g.fillStyle = "#dee2e6"; g.fillRect(wx - 3, wy + b.fh * 0.5, b.w * 0.22 + 6, 4);
      }
      g.fillStyle = "#495057"; g.font = "800 " + Math.round(13 * u + 3) + "px " + A.FONT; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("5かい", b.x - 22 * u, gy - b.fh * 4.5);
    } else {
      // いえ
      g.fillStyle = "#fff4e0"; g.fillRect(b.x, b.top, b.w, b.h);
      g.fillStyle = "#c92a2a"; g.beginPath(); g.moveTo(b.x - 14, b.top + 4); g.lineTo(b.x + b.w / 2, b.top - b.h * 0.42); g.lineTo(b.x + b.w + 14, b.top + 4); g.closePath(); g.fill();
      g.fillStyle = "#a5d8ff"; g.fillRect(b.x + b.w * 0.12, b.top + b.h * 0.25, b.w * 0.26, b.h * 0.3);
      g.fillRect(b.x + b.w * 0.6, b.top + b.h * 0.25, b.w * 0.26, b.h * 0.3);
      g.fillStyle = "#8d5b3a"; g.fillRect(b.x + b.w * 0.42, b.top + b.h * 0.5, b.w * 0.16, b.h * 0.5);
    }
    // くるま
    A.side(g, this.kind === "ladder" ? "ladder" : "pump", this.tx, gy, this.tw, t, { ext: this.ext });
    var n = this.nozzle();
    // しょうぼうし
    if (this.kind === "ladder") {
      if (this.ext > 0.05) A.person(g, n.x - 4 * u, n.y + 6 * u, 48 * u, { shirt: "#495057", helmet: "#f8f9fa", vest: "#ffd43b" });
    } else {
      A.person(g, n.x - 18 * u, gy, 90 * u, { shirt: "#495057", helmet: "#f8f9fa", vest: "#ffd43b", pants: "#343a40" });
      g.strokeStyle = "#f8f9fa"; g.lineWidth = 4 * u; g.beginPath(); g.moveTo(this.tx + this.tw * 0.14, gy - 9 * u); g.quadraticCurveTo(n.x - 30 * u, gy + 4, n.x - 4 * u, n.y + 4 * u); g.stroke();
    }
    // ほのお
    this.flames.forEach(function (fl) {
      var p = self.fpos(fl), x = p.x, y = p.y;
      if (fl.run) { x += fl.run * 160 * u; y -= fl.run * 80 * u; if (fl.run > 1.4) return; }
      A.flame(g, x, y, 0.9 * u, t, { hp: fl.hp, hit: fl.hit, run: fl.run, seed: fl.seed });
    });
    // みず
    if (this.spray && this.aim) {
      var top = this.reachTop(), ax = this.aim.x, ay = Math.max(this.aim.y, top);
      var mx = (n.x + ax) / 2, my = Math.min(n.y, ay) - 40 * u;
      for (var i = 0; i < 26; i++) {
        var q = ((i / 26) + t * 2.2) % 1, iq = 1 - q;
        var px = iq * iq * n.x + 2 * iq * q * mx + q * q * ax, py = iq * iq * n.y + 2 * iq * q * my + q * q * ay;
        if (this.aim.y < top && q > 0.85) py += (q - 0.85) * 400;
        g.fillStyle = "rgba(77,171,247," + (0.55 + 0.4 * (1 - q)) + ")";
        g.beginPath(); g.arc(px + Math.sin(i * 7 + t * 20) * 2, py, (3 + q * 4) * u, 0, 7); g.fill();
      }
      g.fillStyle = "rgba(208,235,255,.8)";
      for (i = 0; i < 6; i++) { g.beginPath(); g.arc(ax + Math.sin(t * 30 + i) * 14 * u, ay + Math.cos(t * 23 + i * 2) * 10 * u, 3 * u, 0, 7); g.fill(); }
    }
    // とどく たかさ の めやす（はしご まえ）
    if (this.kind === "ladder" && this.ext < 1) {
      var rt = this.reachTop();
      g.setLineDash([6, 6]); g.strokeStyle = "rgba(28,126,214,.5)"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, rt); g.lineTo(W, rt); g.stroke(); g.setLineDash([]);
    }
  };

  // ======================= きゅうきゅう =======================
  S.initAmb = function () {
    var child = this.m.patient === "child", self = this;
    this.st = { voice: false, care: false, stretcher: 0, inside: false, mask: false, onStretcher: false };
    this.layout = function () { this.tw = Math.min(this.W * 0.42, this.H * 0.5, 320); };
    this.layout();
    this.ui.msg(child ? "こうえん に ついた！ まず こえ を かけよう" : "おうち に ついた！ まず こえ を かけよう");
    var steps = [
      { label: "🗣️ こえ を かける", fn: function () {
        this.st.voice = true;
        this.speak("crew", child ? "だいじょうぶ？ きゅうきゅうたい だよ。どこ が いたい かな？" : "わかりますか？ きゅうきゅうたい です。");
        setTimeout(function () { self.speak("pt", child ? "あし が いたいの…" : "むね が くるしい…", child ? 1.5 : 0.8); }, 1600);
        this.ui.msg(child ? "あし が いたい みたい。うごかさない ように まもって あげよう" : "むね が くるしい みたい。さんそ マスク を つけよう");
      } },
      child ? { label: "🧸 あし を そっと まもる", fn: function () {
        this.st.care = true; this.speak("crew", "うごかさない ように、クッション で そっと ささえる ね。");
        this.ui.msg("たんか に のせて きゅうきゅうしゃ へ はこぼう");
      } } : { label: "😷 さんそ マスク を つける", fn: function () {
        this.st.mask = true; this.speak("crew", "さんそ マスク を つけます。ゆっくり いき を して くださいね。");
        this.ui.msg("たんか に のせて きゅうきゅうしゃ へ はこぼう");
      } },
      { label: "🛏️ たんか に のせる", fn: function () {
        this.st.stretcher = 0.001; this.speak("crew", "せーの で のせるよ。せーの！");
        this.ui.msg("たんか に のった！ きゅうきゅうしゃ へ");
      } },
      { label: "🚑 きゅうきゅうしゃ へ", fn: function () {
        this.st.inside = true; this.st.mask = true;
        this.speak("crew", child ? "がんばった ね。もうすぐ びょういん だよ。" : "もうすぐ びょういん です。だいじょうぶ ですよ。");
        this.ui.msg("きゅうきゅうしゃ の なか。さんそ マスク を つけて、こえ を かけながら びょういん へ");
      } },
      { label: "🏥 びょういん へ しゅっぱつ！", fn: function () { this.done = true; this.ui.done({ next: "hospital" }); } }
    ];
    var i = 0;
    function next() {
      var s = steps[i++];
      if (!s) return;
      self.ui.actions([{ label: s.label, fn: function () { AU.pop(); s.fn.call(self); setTimeout(next, 900); self.ui.actions([]); } }]);
    }
    next();
  };
  S.drawAmb = function () {
    var g = this.g, W = this.W, H = this.H, gy = this.gy, t = this.t, u = this.u, st = this.st, child = this.m.patient === "child";
    if (st.inside) { this.drawInside(); return; }
    // はいけい
    if (child) {
      g.fillStyle = "#d0ebff"; g.fillRect(0, 0, W, gy);
      g.fillStyle = "#8fd16a"; g.fillRect(0, gy - 30 * u, W, H);
      // すべりだい
      var sx = W * 0.78;
      g.fillStyle = "#ff6b6b"; g.fillRect(sx, gy - 150 * u, 10 * u, 120 * u); g.fillRect(sx + 50 * u, gy - 150 * u, 10 * u, 120 * u);
      g.fillStyle = "#ffd43b"; g.beginPath(); g.moveTo(sx + 55 * u, gy - 150 * u); g.lineTo(sx + 140 * u, gy - 30 * u); g.lineTo(sx + 125 * u, gy - 30 * u); g.lineTo(sx + 45 * u, gy - 140 * u); g.fill();
      root.S119_RENDER.treeAt(g, W * 0.12, gy - 40 * u, 3.5 * u, 1);
    } else {
      g.fillStyle = "#fff4e6"; g.fillRect(0, 0, W, gy);
      g.fillStyle = "#e9c46a"; g.fillRect(0, gy - 30 * u, W, H);
      g.fillStyle = "#a5d8ff"; g.fillRect(W * 0.55, gy * 0.18, W * 0.3, gy * 0.3);
      g.strokeStyle = "#fff"; g.lineWidth = 5; g.strokeRect(W * 0.55, gy * 0.18, W * 0.3, gy * 0.3);
    }
    var px = W * 0.58, py = gy - 30 * u;
    // たんか
    if (st.stretcher) {
      st.stretcher = Math.min(1, st.stretcher + 0.02);
      var sxx = W * 0.25 + (px - W * 0.25) * Math.min(1, st.stretcher * 1.5);
      g.fillStyle = "#e7f5ff"; A.rr(g, sxx - 90 * u, py - 40 * u, 180 * u, 18 * u, 6 * u); g.fill();
      g.strokeStyle = "#868e96"; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(sxx - 70 * u, py - 22 * u); g.lineTo(sxx - 70 * u, py); g.moveTo(sxx + 70 * u, py - 22 * u); g.lineTo(sxx + 70 * u, py); g.stroke();
    }
    var onS = st.stretcher >= 1;
    // かんじゃ さん
    if (onS) {
      g.save(); g.translate(px, py - 46 * u); g.rotate(-Math.PI / 2);
      A.person(g, 0, 0, (child ? 70 : 95) * u, { shirt: child ? "#ffa94d" : "#868e96", white: !child, hair: child ? "#343a40" : "#ced4da", mask: st.mask, sleepy: !child });
      g.restore();
      g.fillStyle = "#74c0fc"; A.rr(g, px - 20 * u, py - 58 * u, 70 * u, 16 * u, 6 * u); g.fill(); // もうふ
    } else {
      A.person(g, px, py, (child ? 80 : 110) * u, { shirt: child ? "#ffa94d" : "#868e96", white: !child, hair: child ? "#343a40" : "#ced4da", mask: st.mask, sleepy: !child, flip: true });
      if (st.care) { g.fillStyle = "#ffe066"; A.rr(g, px - 14 * u, py - 30 * u, 28 * u, 18 * u, 7 * u); g.fill(); }
    }
    // かぞく・きゅうきゅうたい
    A.person(g, W * 0.86, py, 120 * u, { shirt: "#94d82d", flip: true });
    A.person(g, px - 70 * u, py, 120 * u, { shirt: "#ced4da", helmet: "#f8f9fa", vest: "#1c7ed6", pants: "#adb5bd" });
    if (st.voice) A.person(g, px + 70 * u, py, 120 * u, { shirt: "#ced4da", helmet: "#f8f9fa", vest: "#1c7ed6", pants: "#adb5bd", flip: true });
    A.side(g, "amb", -this.tw * 0.35, gy, this.tw, t, { open: true });
    this.drawLines(px, py - 150 * u);
  };
  S.drawInside = function () {
    var g = this.g, W = this.W, H = this.H, u = this.u, t = this.t, child = this.m.patient === "child";
    g.fillStyle = "#e7f5ff"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#d0ebff"; g.fillRect(0, H * 0.72, W, H);
    // まど と たな
    g.fillStyle = "#a5d8ff"; A.rr(g, W * 0.08, H * 0.1, W * 0.25, H * 0.16, 10); g.fill();
    g.fillStyle = "#fff"; A.rr(g, W * 0.6, H * 0.08, W * 0.32, H * 0.2, 8); g.fill();
    g.fillStyle = "#74c0fc"; g.fillRect(W * 0.63, H * 0.12, W * 0.08, H * 0.12);
    g.fillStyle = "#63e6be"; g.fillRect(W * 0.74, H * 0.12, W * 0.06, H * 0.12);
    // モニター（なみ の せん）
    g.fillStyle = "#212529"; A.rr(g, W * 0.38, H * 0.1, W * 0.18, H * 0.14, 6); g.fill();
    g.strokeStyle = "#69db7c"; g.lineWidth = 2; g.beginPath();
    for (var i = 0; i <= 30; i++) {
      var x = W * 0.39 + i * W * 0.16 / 30, ph = (i / 30 * 3 + t) % 1;
      var y = H * 0.17 - (ph > 0.45 && ph < 0.5 ? H * 0.04 : ph > 0.5 && ph < 0.55 ? -H * 0.02 : 0);
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
    // たんか の うえ の ひと
    var sy = H * 0.6;
    g.fillStyle = "#f8f9fa"; A.rr(g, W * 0.12, sy, W * 0.76, 24 * u, 8 * u); g.fill();
    g.strokeStyle = "#adb5bd"; g.lineWidth = 2; g.stroke();
    g.save(); g.translate(W * 0.5, sy - 6 * u + Math.sin(t * 6) * 1.5); g.rotate(-Math.PI / 2);
    A.person(g, 0, 0, (child ? 80 : 100) * u, { shirt: child ? "#ffa94d" : "#868e96", white: !child, hair: child ? "#343a40" : "#ced4da", mask: true, sleepy: true });
    g.restore();
    g.fillStyle = "#74c0fc"; A.rr(g, W * 0.46, sy - 20 * u, W * 0.36, 22 * u, 8 * u); g.fill();
    A.person(g, W * 0.2, H * 0.92, 130 * u, { shirt: "#ced4da", helmet: "#f8f9fa", vest: "#1c7ed6", pants: "#adb5bd" });
    this.drawLines(W * 0.5, H * 0.38);
  };

  // ======================= びょういん =======================
  S.initHospital = function () {
    var self = this;
    this.st = { hand: false };
    this.ui.msg("びょういん に ついた！ おいしゃさん に つたえよう");
    AU.say("びょういんに ついたよ");
    this.ui.actions([{ label: "🧑‍⚕️ おいしゃさん に バトンタッチ", fn: function () {
      AU.pop(); self.ui.actions([]); self.st.hand = true;
      self.speak("crew", self.m.patient === "child" ? "7さい の おとこ の こ です。あし を いたがって います。" : "80さい の かた です。むね が くるしい そう です。");
      setTimeout(function () { self.speak("doc", "ありがとう。あと は まかせて ください！"); }, 2300);
      setTimeout(function () { self.finish("おつかれさま！ おいしゃさん に つたえられた ね"); }, 4300);
    } }]);
  };
  S.drawHospital = function () {
    var g = this.g, W = this.W, H = this.H, gy = this.gy, u = this.u, t = this.t;
    g.fillStyle = "#e3fafc"; g.fillRect(0, 0, W, gy);
    g.fillStyle = "#f8f9fa"; g.fillRect(W * 0.3, gy * 0.15, W * 0.68, gy * 0.85);
    g.fillStyle = "#1c7ed6"; g.fillRect(W * 0.6, gy * 0.2, 14 * u, 44 * u); g.fillRect(W * 0.6 - 15 * u, gy * 0.2 + 15 * u, 44 * u, 14 * u);
    g.fillStyle = "#495057"; g.font = "800 " + Math.round(16 * u + 4) + "px " + A.FONT; g.textAlign = "center"; g.fillText("びょういん", W * 0.64, gy * 0.2 + 74 * u);
    g.fillStyle = "#a5d8ff"; g.fillRect(W * 0.45, gy - 120 * u, W * 0.35, 120 * u);
    g.fillStyle = "#adb5bd"; g.fillRect(0, gy, W, H - gy);
    A.side(g, "amb", 6, gy, Math.min(W * 0.4, 300), t, { open: true });
    A.person(g, W * 0.52, gy, 120 * u, { shirt: "#ced4da", helmet: "#f8f9fa", vest: "#1c7ed6", pants: "#adb5bd" });
    A.person(g, W * 0.78, gy, 125 * u, { shirt: "#f8f9fa", hair: "#495057", pants: "#74c0fc", flip: true });
    this.drawLines(W * 0.65, gy - 170 * u);
  };

  // ======================= まいご =======================
  S.initMaigo = function () {
    var cols = [["#f03e3e", "あかい"], ["#1c7ed6", "あおい"], ["#fab005", "きいろい"]];
    var pick = Math.floor(Math.random() * 3);
    this.mom = pick; this.cols = cols;
    this.st = { found: false, asked: false, hug: 0, wrong: -1 };
    this.ui.msg("えき の まえ に ついた！ ないて いる こ を みつけて タップ しよう");
    AU.say("ないている こを みつけて タップしよう");
    this.adults = cols.map(function (c, i) { return { col: c[0], x: [0.12, 0.74, 0.92][i], ph: i * 1.7 }; });
  };
  S.kidPos = function () { return { x: this.W * 0.5, y: this.gy - 10 * this.u }; };
  S.adultPos = function (a, i) {
    var x = this.W * a.x + Math.sin(this.t * 0.6 + a.ph) * 20 * this.u;
    if (this.st.hug && i === this.mom) x = this.W * 0.5 + 40 * this.u - (1 - Math.min(1, this.st.hug)) * (this.W * 0.5 + 40 * this.u - this.W * a.x);
    return { x: x, y: this.gy - 40 * this.u };
  };
  S.tapMaigo = function (x, y) {
    var u = this.u, self = this, k = this.kidPos();
    if (!this.st.found) {
      if (Math.abs(x - k.x) < 45 * u && y > k.y - 110 * u && y < k.y + 10) {
        this.st.found = true; AU.ok();
        this.speak("pol", "どうしたの？ おまわりさん だよ。");
        setTimeout(function () { self.speak("kid", "ママ が いないの…", 1.6); }, 1500);
        this.ui.msg("ママ と はぐれちゃった みたい。どんな ママ か きいて みよう");
        this.ui.actions([{ label: "👂 ママ の こと を きく", fn: function () {
          AU.pop(); self.ui.actions([]); self.st.asked = true;
          self.speak("pol", "ママ は どんな ぼうし を かぶって いるかな？");
          setTimeout(function () { self.speak("kid", self.cols[self.mom][1] + " ぼうし！", 1.6); }, 1700);
          self.ui.msg(self.cols[self.mom][1] + " ぼうし の ママ を さがして タップ しよう");
        } }]);
      } else this.ui.msg("ないて いる こ は どこ かな？ よく みて ね");
      return;
    }
    if (!this.st.asked || this.st.hug) return;
    this.adults.forEach(function (a, i) {
      var p = self.adultPos(a, i);
      if (Math.abs(x - p.x) < 40 * u && y > p.y - 130 * u && y < p.y + 40 * u) {
        if (i === self.mom) {
          self.st.hug = 0.001; AU.ok();
          self.speak("mom", "よかった〜！ ありがとう ございます！", 1.2);
          setTimeout(function () { self.finish("かぞく に あえた！ よかった ね"); }, 1800);
        } else {
          self.st.wrong = i; AU.soft();
          self.ui.msg("この ひと は ちがう みたい。" + self.cols[self.mom][1] + " ぼうし だよ");
        }
      }
    });
  };
  S.drawMaigo = function () {
    var g = this.g, W = this.W, H = this.H, gy = this.gy, u = this.u, t = this.t, self = this;
    g.fillStyle = "#d0ebff"; g.fillRect(0, 0, W, gy);
    // えき
    g.fillStyle = "#c5f6fa"; g.fillRect(W * 0.1, gy * 0.12, W * 0.8, gy * 0.45);
    g.fillStyle = "#0c8599"; g.fillRect(W * 0.06, gy * 0.08, W * 0.88, 18 * u);
    g.fillStyle = "#fff"; A.rr(g, W * 0.38, gy * 0.18, W * 0.24, 30 * u, 6); g.fill();
    g.fillStyle = "#0b7285"; g.font = "800 " + Math.round(16 * u + 4) + "px " + A.FONT; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("えき", W * 0.5, gy * 0.18 + 15 * u);
    g.fillStyle = "#e9ecef"; g.fillRect(0, gy * 0.57, W, H);
    g.strokeStyle = "#dee2e6"; g.lineWidth = 1;
    for (var i = 0; i < 12; i++) { g.beginPath(); g.moveTo(i * W / 12, gy * 0.57); g.lineTo(i * W / 12 - 30, H); g.stroke(); }
    // おとな（ママ を さがして いる）
    this.adults.forEach(function (a, i) {
      var p = self.adultPos(a, i);
      A.person(g, p.x, p.y + 40 * u, 125 * u, { shirt: ["#e599f7", "#69db7c", "#ffa94d"][i], hat: a.col, walk: self.st.hug && i === self.mom ? 0 : t + a.ph, flip: i === 2 });
      if (self.st.wrong === i) { g.font = Math.round(18 * u + 6) + "px " + EMOJI; g.fillText("🙅", p.x, p.y - 120 * u); }
    });
    // まいご の こ
    var k = this.kidPos();
    A.person(g, k.x, k.y, 75 * u, { shirt: "#ff8787", cry: !this.st.hug, t: t, hair: "#495057" });
    if (!this.st.found) {
      g.strokeStyle = "rgba(255,212,59," + (0.5 + Math.sin(t * 5) * 0.3) + ")"; g.lineWidth = 4;
      g.beginPath(); g.arc(k.x, k.y - 40 * u, 55 * u, 0, 7); g.stroke();
    } else {
      A.person(g, k.x - 50 * u, k.y, 130 * u, { shirt: "#364fc7", hat: "#1c3d8f", pants: "#1c3d8f" });
    }
    if (this.st.hug) {
      this.st.hug = Math.min(1, this.st.hug + 0.02);
      if (this.st.hug >= 1) { g.font = Math.round(22 * u + 6) + "px " + EMOJI; g.fillText("💕", k.x + 20 * u, k.y - 140 * u - Math.sin(t * 4) * 6); }
    }
    this.drawLines(k.x, k.y - 150 * u);
  };

  // ふきだし
  S.drawLines = function (cx, cy) {
    var g = this.g, W = this.W, self = this;
    var col = { crew: "#e7f5ff", pt: "#fff9db", fire: "#ffe8cc", man: "#fff", pol: "#edf2ff", kid: "#fff0f6", mom: "#fff0f6", doc: "#ebfbee" };
    this.lines.forEach(function (l, i) {
      l.t += 1 / 60;
      var a = Math.min(1, (5 - l.t) * 2);
      if (a <= 0) return;
      g.globalAlpha = a;
      var fs = Math.round(Math.max(15, 17 * self.u));
      g.font = "800 " + fs + "px " + A.FONT;
      var maxW = W - 24, txt = l.txt, w = Math.min(maxW, g.measureText(txt).width + 24);
      var lines = wrap(g, txt, w - 24), h = lines.length * (fs + 6) + 14;
      var by = cy - (self.lines.length - i) * (h + 8), bx = Math.max(12, Math.min(W - w - 12, cx - w / 2));
      by = Math.max(8 + i * (h + 8), by);
      g.fillStyle = col[l.who] || "#fff"; A.rr(g, bx, by, w, h, 14); g.fill();
      g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = "#212529"; g.textAlign = "center"; g.textBaseline = "top";
      lines.forEach(function (s, j) { g.fillText(s, bx + w / 2, by + 8 + j * (fs + 6)); });
      g.globalAlpha = 1;
    });
    this.lines = this.lines.filter(function (l) { return l.t < 5; });
  };
  function wrap(g, txt, w) {
    var words = txt.split(" "), out = [], cur = "";
    words.forEach(function (wd) {
      var tr = cur ? cur + " " + wd : wd;
      if (g.measureText(tr).width > w && cur) { out.push(cur); cur = wd; } else cur = tr;
    });
    if (cur) out.push(cur);
    return out;
  }

  S.update = function (dt) {
    this.t += dt;
    if (this.kind === "fire" || this.kind === "ladder") { if (!this.done) this.updateFire(dt); }
  };
  S.draw = function () {
    var g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.W, this.H);
    if (this.kind === "fire" || this.kind === "ladder") this.drawFire();
    else if (this.kind === "amb") this.drawAmb();
    else if (this.kind === "hospital") this.drawHospital();
    else this.drawMaigo();
    if (this.kind === "fire" || this.kind === "ladder") this.drawLines(this.W * 0.5, this.H * 0.3);
  };
  S.down = function (x, y) {
    if (this.kind === "fire" || this.kind === "ladder") { this.spray = true; this.aim = { x: x, y: y }; this.warned = false; }
    else if (this.kind === "maigo") this.tapMaigo(x, y);
  };
  S.move = function (x, y) { if (this.spray) this.aim = { x: x, y: y }; };
  S.up = function () { this.spray = false; AU.hose(false); };
  S.stop = function () { AU.hose(false); this.done = true; };
  // テスト よう: ほのお の いち（がめん の ざひょう）
  S.targets = function () {
    var self = this;
    if (!this.flames) return [];
    return this.flames.filter(function (f) { return !f.run; }).map(function (f) { var p = self.fpos(f); return { x: p.x, y: p.y - 18 * self.u }; });
  };
  S.kidTarget = function () { var k = this.kidPos(); return { x: k.x, y: k.y - 40 * this.u }; };
  S.momTarget = function () { var p = this.adultPos(this.adults[this.mom], this.mom); return { x: p.x, y: p.y - 40 * this.u }; };

  root.S119_SCENE = { Scene: Scene };
})(window);
