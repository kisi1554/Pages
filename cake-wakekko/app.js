/* ============================================================
   ケーキ わけっこ — ほんたい
   テーブルは 1000×1000 の ざひょう。かけらは「たべもの の ちゅうしん から みた ポリゴン」＋ off（テーブルの いち）
   ============================================================ */
(function () {
  "use strict";

  var G = window.Geom, TAU = G.TAU;
  var SKEY = "cake-wakekko-v1";
  var TABLE = 1000;

  /* ---------- ほぞん ---------- */
  var save = { stars: {}, mode: "easy", sound: true };
  try {
    var raw = localStorage.getItem(SKEY);
    if (raw) {
      var o = JSON.parse(raw);
      if (o && typeof o === "object") {
        save.stars = (o.stars && typeof o.stars === "object") ? o.stars : {};
        save.mode = o.mode === "normal" ? "normal" : "easy";
        save.sound = o.sound !== false;
      }
    }
  } catch (e) {}
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }
  function starsOf(i) { return save.stars[i] | 0; }
  function unlocked(i) { return i === 0 || starsOf(i - 1) > 0; }

  /* ---------- おと（WebAudio の ごうせいおん だけ） ---------- */
  var Sound = (function () {
    var ctx = null, master = null;
    function ensure() {
      if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
      return ctx;
    }
    function tone(f0, f1, dur, type, vol, when) {
      if (!save.sound || !ensure()) return;
      var t = ctx.currentTime + (when || 0), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .3, t + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
    }
    function noise(dur, f0, f1, vol, when) {
      if (!save.sound || !ensure()) return;
      var t = ctx.currentTime + (when || 0), n = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 4;
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      var g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(master); src.start(t);
    }
    return {
      unlock: ensure,
      knife: function () { noise(.22, 2500, 7000, .5); tone(1800, 2600, .08, "triangle", .06, .02); },
      slit: function () { noise(.12, 2000, 4500, .35); },
      plop: function () { tone(520, 180, .18, "sine", .35); },
      pick: function () { tone(660, 880, .06, "triangle", .15); },
      tap: function () { tone(880, 880, .05, "triangle", .12); },
      boo: function () { tone(180, 120, .45, "square", .12); tone(185, 125, .45, "sawtooth", .06); },
      soft: function () { tone(330, 260, .2, "triangle", .15); },
      smile: function () { [660, 830, 990, 1320].forEach(function (f, i) { tone(f, f, .18, "sine", .22, i * .08); }); },
      fanfare: function () {
        var seq = [[523, 0], [659, .12], [784, .24], [1047, .4], [784, .56], [1047, .68]];
        seq.forEach(function (s) { tone(s[0], s[0], .26, "triangle", .25, s[1]); tone(s[0] / 2, s[0] / 2, .26, "sine", .12, s[1]); });
        tone(1568, 1568, .5, "sine", .12, .8);
      }
    };
  })();

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var home = $("home"), play = $("play"), cv = $("cv"), cx = cv.getContext("2d");
  var hintEl = $("hint"), toastEl = $("toast"), modal = $("modal");

  function hiki(n) { return n + (n === 3 ? "びき" : (n === 6 || n === 1 || n === 8 || n === 10) ? "ぴき" : "ひき"); }
  var NUM = ["ゼロ", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう", "じゅう",
    "じゅういち", "じゅうに", "じゅうさん", "じゅうよん", "じゅうご", "じゅうろく", "じゅうなな", "じゅうはち", "じゅうきゅう", "にじゅう"];
  function fracHTML(p, q) { return '<span class="fr"><b>' + p + '</b><i>' + q + '</i></span>'; }
  function fracYomi(p, q) { return NUM[q] + "ぶんの " + NUM[p]; }

  /* ---------- ホーム ---------- */
  var FOOD_EMOJI = { round: "🎂", rect: "🍰", choco: "🍫" };
  function renderHome() {
    var g = $("stageGrid"), html = "", total = 0;
    STAGES.forEach(function (st, i) {
      var s = starsOf(i), lock = !unlocked(i); total += s;
      var food = st.foods.map(function (f) { return FOOD_EMOJI[f.t]; }).join("") + (st.berries ? "🍓" : "");
      var ani = ANIMALS.slice(0, st.n).map(function (a) { return a.e; }).join("");
      var stars = "";
      for (var k = 0; k < 3; k++) stars += k < s ? "★" : '<span class="off">★</span>';
      html += '<button class="card' + (s ? " cleared" : "") + (lock ? " locked" : "") + '" data-i="' + i + '"' +
        (lock ? ' aria-disabled="true"' : "") + ' aria-label="ステージ ' + (i + 1) + " " + st.title + '">' +
        '<span class="no">' + (i + 1) + '</span>' +
        '<span class="food">' + (lock ? "🔒" : food) + '</span>' +
        '<span class="ani">' + ani + '</span>' +
        '<span class="nm">' + st.title + '</span>' +
        '<span class="st">' + stars + '</span></button>';
    });
    g.innerHTML = html;
    $("starCount").textContent = total;
    $("modeEasy").setAttribute("aria-pressed", save.mode === "easy");
    $("modeNormal").setAttribute("aria-pressed", save.mode === "normal");
  }
  $("stageGrid").addEventListener("click", function (e) {
    var b = e.target.closest(".card"); if (!b) return;
    var i = +b.dataset.i;
    Sound.unlock();
    if (!unlocked(i)) { Sound.soft(); toast("まえの ステージを クリアすると あそべるよ"); return; }
    Sound.tap(); startStage(i);
  });
  $("modeEasy").onclick = function () { save.mode = "easy"; persist(); Sound.unlock(); Sound.tap(); renderHome(); };
  $("modeNormal").onclick = function () { save.mode = "normal"; persist(); Sound.unlock(); Sound.tap(); renderHome(); };
  function syncSoundBtn() { var b = $("soundBtn"); b.setAttribute("aria-pressed", save.sound); b.textContent = save.sound ? "🔊" : "🔇"; }
  $("soundBtn").onclick = function () { save.sound = !save.sound; persist(); syncSoundBtn(); Sound.unlock(); Sound.tap(); };
  $("backBtn").onclick = function () { Sound.tap(); goHome(); };

  var toastTimer = 0;
  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, ms || 2200);
  }

  /* ---------- ステージ じゅんび ---------- */
  var S = null;   // いまの ステージの じょうたい
  var pid = 1;

  function foodLayout(st) {
    var c = st.foods.length, t = st.foods[0].t, out = [];
    var pos = c === 1 ? [[500, 500]] : c === 2 ? (t === "round" ? [[270, 500], [730, 500]] : [[500, 290], [500, 710]])
      : (t === "round" ? [[270, 290], [730, 290], [500, 720]] : [[500, 200], [500, 500], [500, 800]]);
    st.foods.forEach(function (f, i) {
      var food = { t: f.t, cx: pos[i][0], cy: pos[i][1] };
      if (f.t === "round") food.R = c === 1 ? 300 : c === 2 ? 210 : 190;
      else if (f.t === "rect") { food.w = c === 1 ? 600 : c === 2 ? 480 : 440; food.h = c === 1 ? 380 : c === 2 ? 270 : 220; }
      else {
        food.gx = f.gx; food.gy = f.gy;
        food.cell = Math.min(620 / f.gx, 440 / f.gy, 150);
        food.w = food.cell * f.gx; food.h = food.cell * f.gy;
      }
      out.push(food);
    });
    return out;
  }

  /* いちご: ありそうな きりせんを さけて おく */
  function berryPoints(st, food, k) {
    var pts = [], i;
    if (!k) return pts;
    if (food.t === "round") {
      for (i = 0; i < k; i++) {
        var a = -Math.PI / 2 + (i + .5) * TAU / k;
        pts.push([Math.cos(a) * food.R * .62, Math.sin(a) * food.R * .62]);
      }
    } else {
      var cols = Math.min(k, gridX(st, food)), rows = Math.ceil(k / cols);
      for (i = 0; i < k; i++) {
        var c = i % cols, r = Math.floor(i / cols);
        pts.push([-food.w / 2 + (c + .5) * food.w / cols, -food.h / 2 + (r + .5) * food.h / rows]);
      }
    }
    return pts;
  }

  /* かんたんモードの スナップの こまかさ */
  function perFood(st) { var q = st.n / st.foods.length; return Number.isInteger(q) && q > 1 ? q : st.n; }
  function gridX(st, food) { return food.t === "choco" ? food.gx : Math.max(2, perFood(st)); }
  function gridY(st, food) { return food.t === "choco" ? food.gy : 2; }
  function rayStep(st) { return TAU / perFood(st); }
  function diamStep(st) { var r = rayStep(st); return r > TAU / 4 ? TAU / 4 : r; }

  function newPiece(fi, poly, off, berries, sec) {
    return { id: pid++, f: fi, poly: poly, off: off.slice(), plate: -1, berries: berries || [], sec: sec || null, ord: 0 };
  }

  function startStage(i) {
    var st = STAGES[i];
    var foods = foodLayout(st);
    var pieces = [], perFoodBerries = st.berries ? st.berries / st.foods.length : 0;
    foods.forEach(function (f, fi) {
      var poly = f.t === "round" ? G.circle(f.R) : G.rect(f.w, f.h);
      var sec = f.t === "round" ? { a0: 0, a1: TAU, full: true, slits: [] } : null;
      pieces.push(newPiece(fi, poly, [f.cx, f.cy], berryPoints(st, f, perFoodBerries), sec));
    });
    var total = pieces.reduce(function (s, p) { return s + G.area(p.poly); }, 0);
    S = {
      idx: i, st: st, n: st.n, foods: foods, pieces: pieces, total: total,
      tool: "knife", undo: [], fails: 0, react: null, reactT: 0, cutFlash: null,
      stroke: null, drag: null, cleared: false
    };
    home.hidden = true; play.hidden = false; $("backBtn").hidden = false; $("starsTotal").hidden = true;
    $("titleText").textContent = (i + 1) + ". " + st.title;
    setTool("knife");
    setHint(st.hint);
    closeModal();
    resize();
  }
  function setHint(t) { hintEl.textContent = t; }
  function goHome() {
    S = null; play.hidden = true; home.hidden = false; $("backBtn").hidden = true; $("starsTotal").hidden = false;
    $("titleText").textContent = "ケーキ わけっこ";
    closeModal(); renderHome();
  }

  function setTool(t) {
    if (!S) return;
    S.tool = t;
    $("toolKnife").setAttribute("aria-pressed", t === "knife");
    $("toolHand").setAttribute("aria-pressed", t === "hand");
  }
  $("toolKnife").onclick = function () { Sound.unlock(); Sound.tap(); setTool("knife"); };
  $("toolHand").onclick = function () { Sound.unlock(); Sound.tap(); setTool("hand"); };

  /* ---------- もどす ---------- */
  function snapshot() {
    return JSON.stringify(S.pieces);
  }
  function pushUndo() { S.undo.push(snapshot()); if (S.undo.length > 60) S.undo.shift(); S.react = null; }
  $("undoBtn").onclick = function () {
    if (!S || !S.undo.length) { Sound.soft(); return; }
    S.pieces = JSON.parse(S.undo.pop()); S.react = null; Sound.tap();
  };
  $("resetBtn").onclick = function () { if (!S) return; Sound.tap(); var f = S.fails; startStage(S.idx); S.fails = f; };

  /* ---------- レイアウト ---------- */
  var L = { W: 0, H: 0, dpr: 1, table: null, plates: [], ts: 1, tx: 0, ty: 0 };
  function resize() {
    if (!S) return;
    var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    L.W = r.width; L.H = r.height; L.dpr = dpr;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    var W = L.W, H = L.H, n = S.n, cols, rows, table, area;
    if (H > W * 1.05) {                       // たてもち
      cols = n <= 3 ? n : n === 4 ? 2 : 3; rows = Math.ceil(n / cols);
      var cellH = Math.min(W / cols * 0.95, 160, H * 0.42 / rows);
      var ph = cellH * rows;
      table = { x: 0, y: 0, w: W, h: H - ph };
      area = { x: 0, y: H - ph, w: W, h: ph };
    } else {                                  // よこもち
      var pw = Math.max(240, Math.min(W * 0.38, 440));
      cols = n <= 3 ? 1 : 2; rows = Math.ceil(n / cols);
      if (n <= 3 && H / n < 130) { cols = n; rows = 1; }
      table = { x: 0, y: 0, w: W - pw, h: H };
      area = { x: W - pw, y: 0, w: pw, h: H };
    }
    L.table = table; L.plates = [];
    for (var i = 0; i < n; i++) {
      var c = i % cols, rr = Math.floor(i / cols);
      var cw = area.w / cols, ch = area.h / rows;
      L.plates.push({ x: area.x + c * cw, y: area.y + rr * ch, w: cw, h: ch });
    }
    var pad = 10;
    L.ts = Math.min(table.w - pad * 2, table.h - pad * 2) / TABLE;
    L.tx = table.x + (table.w - TABLE * L.ts) / 2;
    L.ty = table.y + (table.h - TABLE * L.ts) / 2;
    // テーブルの はしまで おける はんい（ろんり ざひょう）
    L.lx0 = (table.x - L.tx) / L.ts; L.ly0 = (table.y - L.ty) / L.ts;
    L.lx1 = (table.x + table.w - L.tx) / L.ts; L.ly1 = (table.y + table.h - L.ty) / L.ts;
  }
  window.addEventListener("resize", function () { resize(); });

  function toWorld(px, py) { return [(px - L.tx) / L.ts, (py - L.ty) / L.ts]; }

  /* おさらの なかの かけらの ならべかた（ぜんぶの おさらで おなじ しゅくしゃく） */
  function plateGeom(pl) {
    var top = Math.min(pl.h * 0.30, 52);
    return { cx: pl.x + pl.w / 2, cy: pl.y + top + (pl.h - top) / 2 - 2, rx: pl.w / 2 - 8, ry: (pl.h - top) / 2 - 6, top: top };
  }
  function layoutPlates() {
    var groups = [], i;
    for (i = 0; i < S.n; i++) groups.push([]);
    S.pieces.forEach(function (p) { if (p.plate >= 0) groups[p.plate].push(p); });
    var scale = L.ts * 0.9, lay = [];
    groups.forEach(function (g, gi) {
      g.sort(function (a, b) { return a.ord - b.ord; });
      if (!g.length) { lay.push(null); return; }
      var cols = Math.ceil(Math.sqrt(g.length)), rows = Math.ceil(g.length / cols), cw = 0, ch = 0;
      g.forEach(function (p) { var b = G.bbox(p.poly); p._bb = b; cw = Math.max(cw, b.w); ch = Math.max(ch, b.h); });
      var pg = plateGeom(L.plates[gi]);
      var aw = pg.rx * 2 * 0.74, ah = pg.ry * 2 * 0.74, gap = 10;
      var s = Math.min((aw - gap * (cols - 1)) / (cols * cw), (ah - gap * (rows - 1)) / (rows * ch));
      scale = Math.min(scale, s);
      lay.push({ g: g, cols: cols, rows: rows, cw: cw, ch: ch, pg: pg });
    });
    lay.forEach(function (l) {
      if (!l) return;
      var gap = 10, tw = l.cols * l.cw * scale + gap * (l.cols - 1), th = l.rows * l.ch * scale + gap * (l.rows - 1);
      l.g.forEach(function (p, k) {
        var c = k % l.cols, r = Math.floor(k / l.cols);
        var ccx = l.pg.cx - tw / 2 + c * (l.cw * scale + gap) + l.cw * scale / 2;
        var ccy = l.pg.cy - th / 2 + r * (l.ch * scale + gap) + l.ch * scale / 2;
        var b = p._bb;
        p._t = { s: scale, ox: ccx - (b.x + b.w / 2) * scale, oy: ccy - (b.y + b.h / 2) * scale };
      });
    });
  }
  function tableT(p) { return { s: L.ts, ox: L.tx + p.off[0] * L.ts, oy: L.ty + p.off[1] * L.ts }; }

  /* ---------- びょうが ---------- */
  function pathPoly(poly) {
    cx.beginPath();
    for (var i = 0; i < poly.length; i++) { if (i) cx.lineTo(poly[i][0], poly[i][1]); else cx.moveTo(poly[i][0], poly[i][1]); }
    cx.closePath();
  }
  function roundRect(x, y, w, h, r) {
    cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r);
    cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath();
  }

  function drawPiece(p, t, lifted) {
    var f = S.foods[p.f], s = t.s;
    cx.save();
    cx.translate(t.ox, t.oy); cx.scale(s, s);
    var lw = 1 / s;
    // そくめん（かげ）
    var depth = (lifted ? 16 : 7) / s;
    cx.save(); cx.translate(depth * .35, depth);
    pathPoly(p.poly);
    cx.fillStyle = f.t === "round" ? "#e2a46c" : f.t === "rect" ? "#b0662a" : "#3b1e0f";
    if (lifted) { cx.shadowColor = "rgba(0,0,0,.25)"; cx.shadowBlur = 16; }
    cx.fill(); cx.restore();
    // うえ
    pathPoly(p.poly);
    cx.save(); cx.clip();
    if (f.t === "round") {
      var R = f.R;
      cx.fillStyle = "#fff3e3"; cx.fillRect(-R - 5, -R - 5, R * 2 + 10, R * 2 + 10);
      cx.fillStyle = "#ffe2ec"; cx.beginPath(); cx.arc(0, 0, R * .74, 0, TAU); cx.fill();
      cx.fillStyle = "#fff3e3"; cx.beginPath(); cx.arc(0, 0, R * .36, 0, TAU); cx.fill();
      cx.fillStyle = "#ff9fc0";
      for (var k = 0; k < 28; k++) {
        var a = k * TAU / 28; cx.beginPath(); cx.arc(Math.cos(a) * R * .87, Math.sin(a) * R * .87, R * .055, 0, TAU); cx.fill();
      }
      cx.strokeStyle = "#f4b183"; cx.lineWidth = R * .05; cx.beginPath(); cx.arc(0, 0, R * .985, 0, TAU); cx.stroke();
    } else if (f.t === "rect") {
      var w = f.w, h = f.h;
      cx.fillStyle = "#ffd76a"; cx.fillRect(-w / 2, -h / 2, w, h);
      cx.fillStyle = "#a85a24"; cx.fillRect(-w / 2, -h / 2, w, h * .16);
      cx.fillStyle = "#c8742f"; cx.fillRect(-w / 2, -h / 2 + h * .16, w, h * .04);
      cx.fillStyle = "rgba(220,150,40,.35)";
      for (var yy = 0; yy < 6; yy++) for (var xx = 0; xx < 12; xx++) {
        cx.beginPath(); cx.arc(-w / 2 + (xx + .5 + (yy % 2) * .5) * w / 12, -h / 2 + h * .26 + yy * h * .13, h * .018, 0, TAU); cx.fill();
      }
    } else {
      var c = f.cell;
      cx.fillStyle = "#4a2614"; cx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
      for (var gy = 0; gy < f.gy; gy++) for (var gx = 0; gx < f.gx; gx++) {
        var x0 = -f.w / 2 + gx * c, y0 = -f.h / 2 + gy * c, m = c * .08;
        cx.fillStyle = "#7a4428"; roundRect(x0 + m, y0 + m, c - m * 2, c - m * 2, c * .1); cx.fill();
        cx.fillStyle = "#8d5434"; roundRect(x0 + m * 2, y0 + m * 2, c - m * 4, c - m * 4, c * .08); cx.fill();
      }
    }
    // きりかけの きりこみ（まるい ケーキに 1ぽん だけ はいって いるとき）
    if (p.sec && p.sec.full && p.sec.slits.length) {
      cx.strokeStyle = "#c97b4a"; cx.lineWidth = 4 * lw; cx.lineCap = "round";
      p.sec.slits.forEach(function (a) { cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(Math.cos(a) * f.R, Math.sin(a) * f.R); cx.stroke(); });
    }
    cx.restore();
    pathPoly(p.poly);
    cx.strokeStyle = f.t === "choco" ? "rgba(40,15,5,.6)" : "rgba(150,80,40,.45)"; cx.lineWidth = 1.5 * lw; cx.lineJoin = "round"; cx.stroke();
    // いちご
    var bs = f.t === "round" ? f.R * .2 : Math.min(f.w, f.h) * .2;
    if (p.berries.length) {
      cx.font = bs + "px sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
      p.berries.forEach(function (b) { cx.fillText("🍓", b[0], b[1]); });
    }
    cx.restore();
  }

  function drawPlates() {
    S.pieces.forEach(function (p) { if (p.plate < 0) delete p._t; });
    layoutPlates();
    var now = performance.now();
    for (var i = 0; i < S.n; i++) {
      var pl = L.plates[i], pg = plateGeom(pl), an = ANIMALS[i];
      var hover = S.drag && S.drag.over === i;
      // おさら
      cx.save();
      cx.fillStyle = "rgba(0,0,0,.08)"; cx.beginPath(); cx.ellipse(pg.cx + 2, pg.cy + 5, pg.rx, pg.ry, 0, 0, TAU); cx.fill();
      cx.fillStyle = hover ? "#fff0f6" : "#ffffff"; cx.beginPath(); cx.ellipse(pg.cx, pg.cy, pg.rx, pg.ry, 0, 0, TAU); cx.fill();
      cx.lineWidth = hover ? 5 : 3; cx.strokeStyle = hover ? "#e05a8a" : "#f3c7d5"; cx.stroke();
      cx.strokeStyle = "#fbe3eb"; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(pg.cx, pg.cy, pg.rx * .78, pg.ry * .78, 0, 0, TAU); cx.stroke();
      cx.restore();
      // どうぶつ
      var es = Math.min(pg.top * .9, pl.w * .3, 46), bounce = 0;
      var rc = S.react && S.react[i];
      if (rc) bounce = Math.abs(Math.sin((now - S.reactT) / (rc.kind === "ok" ? 160 : 90))) * (rc.kind === "ok" ? 6 : 3);
      cx.font = es + "px sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
      var ex = pl.x + pl.w / 2, ey = pl.y + pg.top / 2 + 2 - bounce;
      if (rc) ex -= es * .55;
      cx.fillText(an.e, ex, ey);
      if (rc) {
        var bx = ex + es * .6, bw = Math.min(pl.w / 2 + es * .1, 128), bh = es * .9;
        cx.fillStyle = rc.kind === "ok" ? "#e9f8ee" : rc.kind === "less" ? "#fde8e8" : "#fff2e0";
        roundRect(bx, ey - bh / 2, bw, bh, bh / 2); cx.fill();
        cx.fillStyle = rc.kind === "ok" ? "#3fae6a" : rc.kind === "less" ? "#d24a4a" : "#d07a1a";
        cx.font = "800 " + Math.min(bh * .48, 17) + "px " + getComputedStyle(document.body).fontFamily;
        cx.textAlign = "left";
        cx.fillText(rc.face + rc.text, bx + 6, ey + 1, bw - 10);
      }
    }
    // おさらの うえの かけら
    S.pieces.forEach(function (p) { if (p.plate >= 0 && !(S.drag && S.drag.p === p)) drawPiece(p, p._t, false); });
  }

  function draw() {
    if (!S || !L.table) return;
    var dpr = L.dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, L.W, L.H);
    // テーブル
    var tb = L.table;
    var gr = cx.createLinearGradient(0, tb.y, 0, tb.y + tb.h);
    gr.addColorStop(0, "#f6dfc4"); gr.addColorStop(1, "#efcfa9");
    cx.fillStyle = gr; cx.fillRect(tb.x, tb.y, tb.w, tb.h);
    cx.strokeStyle = "rgba(190,130,80,.18)"; cx.lineWidth = 2;
    for (var y = tb.y + 26; y < tb.y + tb.h; y += 34) { cx.beginPath(); cx.moveTo(tb.x, y); cx.bezierCurveTo(tb.x + tb.w * .3, y - 6, tb.x + tb.w * .7, y + 6, tb.x + tb.w, y); cx.stroke(); }
    // おさらの エリア
    var a0 = L.plates[0];
    cx.fillStyle = "#fff7f0";
    if (L.table.w < L.W - 1) cx.fillRect(L.table.w, 0, L.W - L.table.w, L.H);
    else cx.fillRect(0, a0.y, L.W, L.H - a0.y);

    // テーブルの うえの かけら
    S.pieces.forEach(function (p) { if (p.plate < 0 && !(S.drag && S.drag.p === p)) drawPiece(p, tableT(p), false); });
    drawPlates();

    // きりせん
    if (S.stroke) {
      var a = S.stroke.a, b = S.stroke.b;
      cx.save();
      cx.strokeStyle = "rgba(255,255,255,.95)"; cx.lineWidth = 7; cx.lineCap = "round";
      cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.stroke();
      cx.strokeStyle = "#e05a8a"; cx.lineWidth = 3; cx.setLineDash([10, 8]);
      cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.stroke();
      cx.setLineDash([]);
      cx.font = "34px sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText("🔪", b[0] + 14, b[1] - 18);
      cx.restore();
    }
    if (S.cutFlash) {
      var age = performance.now() - S.cutFlash.t;
      if (age > 380) S.cutFlash = null;
      else {
        cx.save(); cx.globalAlpha = 1 - age / 380; cx.strokeStyle = "#ffffff"; cx.lineWidth = 5; cx.lineCap = "round";
        S.cutFlash.segs.forEach(function (sg) {
          cx.beginPath(); cx.moveTo(L.tx + sg[0][0] * L.ts, L.ty + sg[0][1] * L.ts); cx.lineTo(L.tx + sg[1][0] * L.ts, L.ty + sg[1][1] * L.ts); cx.stroke();
        });
        cx.restore();
      }
    }
    // はこんで いる かけら
    if (S.drag && S.drag.p) {
      var d = S.drag, pt = d.pos;
      var sc = d.over >= 0 ? Math.min(L.ts, d.scaleOnPlate || L.ts) : L.ts;
      var c0 = d.grabLocal;
      drawPiece(d.p, { s: sc, ox: pt[0] - c0[0] * sc, oy: pt[1] - c0[1] * sc }, true);
    }
  }

  function loop() { draw(); requestAnimationFrame(loop); }

  /* ---------- きる ---------- */
  function normAng(a) { a %= TAU; return a < 0 ? a + TAU : a; }
  function snapAng(a, step, base) { return base + Math.round((a - base) / step) * step; }
  function distPointLine(pt, p, d) {
    var len = Math.hypot(d[0], d[1]); return Math.abs((pt[0] - p[0]) * d[1] - (pt[1] - p[1]) * d[0]) / len;
  }
  function minArea() { return S.total * 0.01; }

  function sectorPoly(f, a0, a1) { return G.sector(f.R, a0, a1); }

  /* まるい ケーキを まんなか から きる（ray）。きれたら あたらしい かけらの はいれつ、だめなら null */
  function rayCut(p, ang) {
    var f = S.foods[p.f], sec = p.sec;
    if (sec.full) {
      var a = normAng(ang);
      for (var i = 0; i < sec.slits.length; i++) {
        var dd = Math.abs(normAng(sec.slits[i] - a + Math.PI) - Math.PI);
        if (dd < 0.05) return null;
      }
      var slits = sec.slits.concat([a]).sort(function (x, y) { return x - y; });
      if (slits.length < 2) {
        var np = JSON.parse(JSON.stringify(p)); np.sec.slits = slits; return { slitOnly: true, pieces: [np] };
      }
      var out = [];
      for (i = 0; i < slits.length; i++) {
        var s0 = slits[i], s1 = i + 1 < slits.length ? slits[i + 1] : slits[0] + TAU;
        out.push(makeSector(p, s0, s1));
      }
      return { pieces: out };
    }
    var t = normAng(ang - sec.a0), span = sec.a1 - sec.a0;
    if (t < 0.04 || t > span - 0.04) return null;
    return { pieces: [makeSector(p, sec.a0, sec.a0 + t), makeSector(p, sec.a0 + t, sec.a1)] };
  }
  function makeSector(p, a0, a1) {
    var f = S.foods[p.f], poly = sectorPoly(f, a0, a1);
    var berries = p.berries.filter(function (b) {
      var t = normAng(Math.atan2(b[1], b[0]) - a0); return t < a1 - a0;
    });
    var np = newPiece(p.f, poly, p.off, berries, { a0: a0, a1: a1, full: false, slits: [] });
    np._mid = (a0 + a1) / 2;
    return np;
  }

  function lineCut(p, lp, ld) {
    var parts = G.splitByLine(p.poly, lp, ld);
    if (parts.length < 2) return null;
    var nx = -ld[1], ny = ld[0], len = Math.hypot(nx, ny); nx /= len; ny /= len;
    var out = parts.map(function (poly) { return newPiece(p.f, poly, p.off, [], null); });
    p.berries.forEach(function (b) {
      var home = null;
      for (var i = 0; i < parts.length; i++) if (G.pointInPoly(b, parts[i])) { home = out[i]; break; }
      if (!home) {
        var best = Infinity;
        out.forEach(function (o) { var c = G.centroid(o.poly), d = Math.hypot(c[0] - b[0], c[1] - b[1]); if (d < best) { best = d; home = o; } });
      }
      home.berries.push(b);
    });
    out.forEach(function (o) {
      var c = G.centroid(o.poly), side = (c[0] - lp[0]) * nx + (c[1] - lp[1]) * ny > 0 ? 1 : -1;
      o._push = [nx * side, ny * side];
    });
    return { pieces: out };
  }

  /* ひとつの かけらに たいして、なぞった せん（ローカル a→b）を どう きるか きめて きる */
  function cutPiece(p, a, b, opts) {
    var f = S.foods[p.f], easy = save.mode === "easy", st = S.st;
    var d = [b[0] - a[0], b[1] - a[1]];
    if (f.t === "choco") {
      var c = f.cell, horiz = Math.abs(d[0]) >= Math.abs(d[1]), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      var lines = [], k;
      if (horiz) { for (k = 1; k < f.gy; k++) lines.push(-f.h / 2 + k * c); }
      else { for (k = 1; k < f.gx; k++) lines.push(-f.w / 2 + k * c); }
      if (!lines.length) return null;
      var v = horiz ? mid[1] : mid[0], best = lines[0];
      lines.forEach(function (x) { if (Math.abs(x - v) < Math.abs(best - v)) best = x; });
      var r = horiz ? lineCut(p, [0, best], [1, 0]) : lineCut(p, [best, 0], [0, 1]);
      if (r) r.seg = horiz ? [[-f.w / 2, best], [f.w / 2, best]] : [[best, -f.h / 2], [best, f.h / 2]];
      return r;
    }
    if (f.t === "rect" && easy) {
      var hz = Math.abs(d[0]) >= Math.abs(d[1]), md = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      var gx = gridX(st, f), gy = gridY(st, f), cand = [];
      if (hz) { for (var j = 1; j < gy; j++) cand.push(-f.h / 2 + j * f.h / gy); }
      else { for (j = 1; j < gx; j++) cand.push(-f.w / 2 + j * f.w / gx); }
      var vv = hz ? md[1] : md[0], bb = cand[0];
      cand.forEach(function (x) { if (Math.abs(x - vv) < Math.abs(bb - vv)) bb = x; });
      var rr = hz ? lineCut(p, [0, bb], [1, 0]) : lineCut(p, [bb, 0], [0, 1]);
      if (rr) rr.seg = hz ? [[-f.w / 2, bb], [f.w / 2, bb]] : [[bb, -f.h / 2], [bb, f.h / 2]];
      return rr;
    }
    if (f.t === "round" && p.sec) {
      var R = f.R, near = easy ? .32 : .2;
      var aIn = Math.hypot(a[0], a[1]) < R * near, bIn = Math.hypot(b[0], b[1]) < R * near;
      if (aIn || bIn) {                                    // まんなか から そとへ
        var tip = aIn ? b : a, ang = Math.atan2(tip[1], tip[0]);
        if (easy) ang = snapAng(ang, rayStep(st), -Math.PI / 2);
        var rc = rayCut(p, ang);
        if (rc) rc.seg = [[0, 0], [Math.cos(ang) * R, Math.sin(ang) * R]];
        return rc;
      }
      if (easy) {                                          // まんなかを とおる せん
        var da = Math.atan2(d[1], d[0]);
        da = snapAng(da, diamStep(st), Math.PI / 2);
        var r1 = rayCut(p, da), cur = r1 && !r1.slitOnly ? r1.pieces : null;
        if (r1 && r1.slitOnly) {
          var r2 = rayCut(r1.pieces[0], da + Math.PI);
          return r2 ? withSeg(r2, R, da) : withSeg(r1, R, da);
        }
        if (!r1) { var r3 = rayCut(p, da + Math.PI); return r3 ? withSeg(r3, R, da) : null; }
        // r1 で きれた → のこりの はんたいがわも
        var res = [];
        cur.forEach(function (q) { var r4 = rayCut(q, da + Math.PI); if (r4) res = res.concat(r4.pieces); else res.push(q); });
        return withSeg({ pieces: res }, R, da);
      }
    }
    // ふつうの まっすぐ きり
    var r5 = lineCut(p, a, d);
    if (r5) r5.seg = null;
    return r5;
  }
  function withSeg(r, R, da) { r.seg = [[-Math.cos(da) * R, -Math.sin(da) * R], [Math.cos(da) * R, Math.sin(da) * R]]; return r; }

  function doCut(A, B) {
    var len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (len < 30) return;
    var u = [(B[0] - A[0]) / len, (B[1] - A[1]) / len], ext = len * .1;
    var A2 = [A[0] - u[0] * ext, A[1] - u[1] * ext], B2 = [B[0] + u[0] * ext, B[1] + u[1] * ext];
    var hits = S.pieces.filter(function (p) {
      if (p.plate >= 0) return false;
      var la = [A2[0] - p.off[0], A2[1] - p.off[1]], lb = [B2[0] - p.off[0], B2[1] - p.off[1]];
      return G.segmentHitsPoly(la, lb, p.poly);
    });
    if (!hits.length) return;
    // まんなか から きる ときは その ケーキ だけ
    var rayTarget = null;
    hits.forEach(function (p) {
      var f = S.foods[p.f]; if (f.t !== "round" || !p.sec) return;
      var near = (save.mode === "easy" ? .32 : .2) * f.R;
      if (Math.hypot(A[0] - p.off[0], A[1] - p.off[1]) < near || Math.hypot(B[0] - p.off[0], B[1] - p.off[1]) < near) {
        if (G.pointInPoly([A[0] - p.off[0], A[1] - p.off[1]], p.poly) || G.pointInPoly([B[0] - p.off[0], B[1] - p.off[1]], p.poly)) rayTarget = rayTarget || p;
      }
    });
    if (rayTarget) hits = [rayTarget];

    var before = snapshot(), changed = false, slitOnly = false, tiny = false, segs = [];
    var next = [];
    S.pieces.forEach(function (p) {
      if (hits.indexOf(p) < 0) { next.push(p); return; }
      var la = [A[0] - p.off[0], A[1] - p.off[1]], lb = [B[0] - p.off[0], B[1] - p.off[1]];
      var r = cutPiece(p, la, lb);
      if (!r) { next.push(p); return; }
      var ma = minArea();
      if (r.pieces.some(function (q) { return G.area(q.poly) < ma; })) { tiny = true; next.push(p); return; }
      if (r.seg) segs.push([[r.seg[0][0] + p.off[0], r.seg[0][1] + p.off[1]], [r.seg[1][0] + p.off[0], r.seg[1][1] + p.off[1]]]);
      else segs.push([A, B]);
      if (r.slitOnly) slitOnly = true;
      r.pieces.forEach(function (q) {
        var push = q._mid !== undefined ? [Math.cos(q._mid), Math.sin(q._mid)] : q._push;
        if (push && !r.slitOnly) { q.off = [q.off[0] + push[0] * 9, q.off[1] + push[1] * 9]; }
        delete q._mid; delete q._push;
        next.push(q);
      });
      changed = true;
    });
    if (!changed) {
      if (tiny) { Sound.soft(); toast("ちいさすぎる かけらは できないよ"); }
      return;
    }
    S.undo.push(before); if (S.undo.length > 60) S.undo.shift();
    S.react = null;
    S.pieces = next;
    clampAll();
    S.cutFlash = { t: performance.now(), segs: segs };
    if (slitOnly) { Sound.slit(); setHint("もう 1かい、まんなか から きってみよう"); }
    else { Sound.knife(); setHint(S.pieces.some(function (p) { return p.plate >= 0; }) ? S.st.hint : "きれたね！ ✋で かけらを おさらに はこぼう"); }
  }

  function clampAll() {
    S.pieces.forEach(function (p) {
      if (p.plate >= 0) return;
      var b = G.bbox(p.poly), m = 4;
      var x0 = L.lx0 + m - b.x, x1 = L.lx1 - m - (b.x + b.w), y0 = L.ly0 + m - b.y, y1 = L.ly1 - m - (b.y + b.h);
      if (x0 <= x1) p.off[0] = Math.min(Math.max(p.off[0], x0), x1);
      if (y0 <= y1) p.off[1] = Math.min(Math.max(p.off[1], y0), y1);
    });
  }

  /* ---------- ゆびの そうさ ---------- */
  function evPos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function pieceAt(pt) {
    var list = S.pieces.slice().reverse();
    for (var i = 0; i < list.length; i++) {
      var p = list[i], t = p.plate >= 0 ? p._t : tableT(p);
      if (!t) continue;
      var lp = [(pt[0] - t.ox) / t.s, (pt[1] - t.oy) / t.s];
      // おさらの うえの ちいさな かけらは すこし ひろめに あたり はんてい
      if (G.pointInPoly(lp, p.poly)) return { p: p, local: lp };
    }
    for (i = 0; i < list.length; i++) {
      p = list[i]; if (p.plate < 0 || !p._t) continue;
      t = p._t; lp = [(pt[0] - t.ox) / t.s, (pt[1] - t.oy) / t.s];
      var b = G.bbox(p.poly), pad = 14 / t.s;
      if (lp[0] > b.x - pad && lp[0] < b.x + b.w + pad && lp[1] > b.y - pad && lp[1] < b.y + b.h + pad) return { p: p, local: lp };
    }
    return null;
  }
  function plateAt(pt) {
    for (var i = 0; i < L.plates.length; i++) {
      var r = L.plates[i];
      if (pt[0] >= r.x && pt[0] <= r.x + r.w && pt[1] >= r.y && pt[1] <= r.y + r.h) return i;
    }
    return -1;
  }
  function inTable(pt) { var t = L.table; return pt[0] >= t.x && pt[0] <= t.x + t.w && pt[1] >= t.y && pt[1] <= t.y + t.h; }

  var activePtr = null;
  cv.addEventListener("pointerdown", function (e) {
    if (!S || activePtr !== null) return;
    Sound.unlock();
    var pt = evPos(e), hit = pieceAt(pt);
    activePtr = e.pointerId;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    if (hit && (S.tool === "hand" || hit.p.plate >= 0)) {
      S.drag = { p: hit.p, grabLocal: hit.local, pos: pt, start: pt, over: -1, moved: false, scaleOnPlate: hit.p._t ? hit.p._t.s : L.ts };
      Sound.pick();
    } else if (S.tool === "knife" && inTable(pt)) {
      S.stroke = { a: pt, b: pt };
    } else if (S.tool === "hand" && inTable(pt)) {
      toast("🔪 を えらぶと きれるよ", 1400);
    }
    e.preventDefault();
  });
  cv.addEventListener("pointermove", function (e) {
    if (!S || e.pointerId !== activePtr) return;
    var pt = evPos(e);
    if (S.stroke) S.stroke.b = pt;
    if (S.drag) {
      S.drag.pos = pt;
      if (Math.hypot(pt[0] - S.drag.start[0], pt[1] - S.drag.start[1]) > 6) S.drag.moved = true;
      S.drag.over = plateAt(pt);
    }
    e.preventDefault();
  });
  function endPtr(e, cancel) {
    if (!S || e.pointerId !== activePtr) return;
    activePtr = null;
    if (S.stroke) {
      var st = S.stroke; S.stroke = null;
      if (!cancel) doCut(toWorld(st.a[0], st.a[1]), toWorld(st.b[0], st.b[1]));
    }
    if (S.drag) {
      var d = S.drag; S.drag = null;
      if (cancel || !d.moved) return;
      var p = d.p, pl = plateAt(d.pos);
      if (pl >= 0) {
        if (p.plate === pl) return;
        pushUndo(); p.plate = pl; p.ord = Date.now() + Math.random(); Sound.plop();
      } else if (inTable(d.pos)) {
        pushUndo();
        var w = toWorld(d.pos[0], d.pos[1]);
        var sc = L.ts, gl = d.grabLocal;
        // テーブルの うえでは もった ところが ゆびの したに くるように
        p.off = [w[0] - gl[0] * sc / L.ts, w[1] - gl[1] * sc / L.ts];
        p.plate = -1; clampAll(); Sound.plop();
      }
    }
  }
  cv.addEventListener("pointerup", function (e) { endPtr(e, false); });
  cv.addEventListener("pointercancel", function (e) { endPtr(e, true); });

  /* ---------- どうぞ！ ---------- */
  $("giveBtn").onclick = function () {
    if (!S) return;
    Sound.unlock();
    var left = S.pieces.filter(function (p) { return p.plate < 0; });
    if (left.length) { Sound.soft(); toast("テーブルに まだ のこってるよ。ぜんぶ くばってね"); return; }
    var areas = [], berries = [];
    for (var i = 0; i < S.n; i++) { areas.push(0); berries.push(0); }
    S.pieces.forEach(function (p) { areas[p.plate] += G.area(p.poly); berries[p.plate] += p.berries.length; });
    if (areas.some(function (a) { return a === 0; })) { Sound.soft(); toast("おさらが からっぽの こが いるよ"); return; }
    var tol = save.mode === "easy" ? .10 : .05;
    var j = G.judge(areas, tol);
    S.reactT = performance.now();
    if (j.ok) win(j, tol, berries); else lose(j, tol, areas);
  };

  function lose(j, tol, areas) {
    S.fails++;
    S.react = j.devs.map(function (dv) {
      if (dv < -tol) return { kind: "less", face: "😠", text: "ずるい〜！" };
      if (dv > tol) return { kind: "more", face: "😳", text: "おおすぎ？" };
      return { kind: "ok", face: "🙂", text: "いいね" };
    });
    Sound.boo();
    var max = Math.max.apply(null, areas), goalPct = j.target / max * 100;
    var bars = "", names = "", more = [], less = [];
    j.devs.forEach(function (dv, i) {
      var cls = dv > tol ? "more" : dv < -tol ? "less" : "ok";
      var tag = cls === "more" ? "おおい" : cls === "less" ? "すくない" : "ちょうど";
      if (cls === "more") more.push(ANIMALS[i].e); if (cls === "less") less.push(ANIMALS[i].e);
      bars += '<div class="bar ' + cls + '"><span class="tag">' + tag + '</span><div class="col" style="height:' + (areas[i] / max * 82).toFixed(1) + '%"></div></div>';
      names += '<span>' + ANIMALS[i].e + '</span>';
    });
    var msg = "";
    if (more.length) msg += '<span class="more">' + more.join("") + " が おおい</span>";
    if (less.length) msg += (msg ? "、" : "") + '<span class="less">' + less.join("") + " が すくない</span>";
    openModal("ずるい〜！ 😠",
      '<p class="fail-msg">' + msg + ' よ。</p>' +
      '<div class="bars"><div class="goal" style="bottom:' + (goalPct * .82).toFixed(1) + '%"><span>おなじ</span></div>' + bars + '</div>' +
      '<div class="bar-names">' + names + '</div>' +
      '<p class="star-notes">おおい こから すくない こへ うつしたり、もっと ちいさく きったり してみよう。<br>↩ もどす も つかえるよ。</p>',
      [{ t: "やりなおす", main: true, f: function () { closeModal(); setHint("おおい こ と すくない こ を みて、なおそう"); } }]);
  }

  function win(j, tol, berries) {
    S.cleared = true;
    S.react = j.devs.map(function () { return { kind: "ok", face: "😋", text: "おいしい！" }; });
    Sound.smile(); setTimeout(Sound.fanfare, 350);
    var st = S.st, hasBerry = !!st.berries;
    var berryOk = hasBerry && berries.every(function (b) { return b === berries[0]; });
    var s2 = j.maxDev <= tol / 2;
    var s3 = hasBerry ? berryOk : S.fails === 0;
    var stars = 1 + (s2 ? 1 : 0) + (s3 ? 1 : 0);
    if (stars > starsOf(S.idx)) { save.stars[S.idx] = stars; persist(); }
    var starHTML = "";
    for (var k = 0; k < 3; k++) starHTML += k < stars ? "⭐" : '<span class="off">⭐</span>';
    var notes = "★ みんなに くばれた<br>" + (s2 ? "★" : "☆") + " ぴったり（ずれ " + Math.round(tol * 50) + "% いない）<br>" +
      (hasBerry ? (berryOk ? "★ いちごも " + berries[0] + "こずつ！" : "☆ いちごの かずが ちがうよ") : (s3 ? "★ いっかいで できた" : "☆ いっかいで できたら ★"));
    var faces = ANIMALS.slice(0, S.n).map(function (a) { return a.e; }).join("");
    var next = S.idx + 1 < STAGES.length;
    var btns = [{ t: "もういちど", f: function () { startStage(S.idx); } }, { t: "メニュー", f: goHome }];
    if (next) btns.push({ t: "つぎへ ▶", main: true, f: function () { startStage(S.idx + 1); } });
    openModal("みんな にっこり！ 🎉",
      '<div class="faces">' + faces + '</div>' +
      '<div class="big-stars">' + starHTML + '</div>' +
      '<p class="star-notes">' + notes + '</p>' + explain(st), btns);
    setHint("やったね！ みんな おなじだけ もらえたよ");
  }

  /* クリアの あとの ことば と ぶんすう */
  function explain(st) {
    var c = st.foods.length, n = st.n, t = st.foods[0].t, name = FOOD_NAMES[t];
    if (t === "choco") {
      var f = S.foods[0], cells = f.gx * f.gy, per = cells / n, fr = G.frac(per, cells);
      return '<div class="explain">' +
        '<p>ぜんぶで ' + f.gx + '×' + f.gy + ' ＝ ' + cells + 'マス。' + hiki(n) + 'で わけると…</p>' +
        '<p class="shiki">' + cells + ' ÷ ' + n + ' ＝ ' + per + '</p>' +
        '<p>ひとり ' + per + 'マス。いたチョコ ぜんぶの</p>' +
        '<p class="eq">' + fracHTML(fr[0], fr[1]) + '</p>' +
        '<p class="yomi">（' + fracYomi(fr[0], fr[1]) + '）</p></div>';
    }
    var q = G.frac(c, n);
    if (c === 1) {
      return '<div class="explain">' +
        '<p>' + name + 'を ' + n + 'つに わけた 1つ ＝</p>' +
        '<p class="eq">' + fracHTML(1, n) + '</p>' +
        '<p class="yomi">（' + fracYomi(1, n) + (n === 2 ? '・はんぶん' : '') + '）</p></div>';
    }
    var whole = Math.floor(q[0] / q[1]), rem = q[0] % q[1];
    var show = "", yomi = "";
    if (whole && rem) {
      show = '<span class="whole">' + whole + '</span>と ' + fracHTML(rem, q[1]);
      yomi = NUM[whole] + "こと " + (q[1] === 2 && rem === 1 ? "はんぶん" : fracYomi(rem, q[1]));
    } else if (whole) {
      show = '<span class="whole">' + whole + '</span>'; yomi = NUM[whole] + "こ";
    } else {
      show = fracHTML(q[0], q[1]); yomi = fracYomi(q[0], q[1]) + (q[0] === 1 && q[1] === 2 ? "・はんぶん" : "");
    }
    var how = whole && rem ? '1こずつ と、のこりを わけた ぶん' : rem && q[0] > 1 ? fracHTML(1, q[1]) + ' が ' + q[0] + 'つ' : '';
    return '<div class="explain">' +
      '<p>' + name + ' ' + c + 'こを ' + hiki(n) + 'で わけると、ひとり</p>' +
      '<p class="eq">' + show + ' こ</p>' +
      '<p class="yomi">（' + yomi + '）</p>' +
      (how ? '<p>' + how + '</p>' : '') +
      '<p>' + c + ' ÷ ' + n + ' ＝ ' + fracHTML(c, n) + (q[0] !== c ? ' ＝ ' + fracHTML(q[0], q[1]) : '') + '</p></div>';
  }

  /* ---------- モーダル ---------- */
  function openModal(title, body, btns) {
    $("mTitle").textContent = title; $("mBody").innerHTML = body;
    var bx = $("mBtns"); bx.innerHTML = "";
    btns.forEach(function (b) {
      var el = document.createElement("button"); el.className = "mbtn" + (b.main ? " main" : ""); el.textContent = b.t;
      el.onclick = function () { Sound.tap(); b.f(); }; bx.appendChild(el);
    });
    modal.hidden = false;
    var m = bx.querySelector(".main") || bx.firstChild; if (m) m.focus({ preventScroll: true });
  }
  function closeModal() { modal.hidden = true; }

  /* ---------- テスト よう（ブラウザの コンソール から） ---------- */
  window.__cake = {
    state: function () { return S; }, layout: function () { return L; }, start: startStage, cut: doCut, home: goHome,
    give: function (pieceIdx, plate) { var p = S.pieces[pieceIdx]; pushUndo(); p.plate = plate; p.ord = Date.now() + pieceIdx; }
  };

  syncSoundBtn();
  renderHome();
  requestAnimationFrame(loop);
})();
