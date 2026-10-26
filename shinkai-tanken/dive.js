// しんかい たんけん: ゲーム の うごき（そうさ・せんすいてい・いきもの・ずかん・ミッション・ほぞん）
(function () {
  "use strict";
  var D = window.SHINKAI, R = window.SHINKAI_R, SND = window.SHINKAI_S;
  var DRAW = R.DRAW, floorAt = R.floorAt;
  var KEY = "shinkai-tanken-v1";
  var $ = function (id) { return document.getElementById(id); };
  var SP = {}; D.SPECIES.forEach(function (s) { SP[s.id] = s; });

  // ---- ふりがな ----
  var RUBY = /([㐀-鿿々〆ヶ]+)\{([^}]+)\}/g;
  function rb(s) { return String(s).replace(RUBY, "<ruby>$1<rt>$2</rt></ruby>"); }
  function plain(s) { return String(s).replace(RUBY, "$2"); }

  // ---- ほぞん ----
  var save = { zukan: {}, maxDepth: 0, missions: {}, sound: true, dives: 0 };
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && typeof s === "object") {
        save.zukan = s.zukan && typeof s.zukan === "object" ? s.zukan : {};
        save.maxDepth = +s.maxDepth || 0;
        save.missions = s.missions && typeof s.missions === "object" ? s.missions : {};
        save.sound = s.sound !== false;
        save.dives = +s.dives || 0;
      }
    } catch (e) { /* よめなくても あそべる */ }
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ } }

  // ---- じょうたい ----
  var S = {
    sub: { x: 230, y: 2, vx: 0, vy: 0, face: 1 },
    light: false, battery: 100, oxygen: 100, auto: false,
    paused: true, started: false, t: 0,
    creatures: [], snow: [], bubbles: [], puffs: [],
    sonar: null, sonarCool: 0, ventArrowUntil: 0, flash: 0,
    dive: { max: 0, found: [], hit: {}, shots: 0 },
    lowT: -99, snowT: 0, darkHintT: -99, ventSeen: {}, spawnT: 0, surfaced: true
  };
  var input = { x: 0, y: 0, holdX: 0, holdY: 0, keys: {}, btn: {} };
  var drag = null;

  // ---- がめん ----
  var cv = $("sea"), ctx = cv.getContext("2d");
  var mask = document.createElement("canvas"), mctx = mask.getContext("2d");
  var W = 0, H = 0, DPR = 1, PPM = 5, K = 1, CX = 0, CY = 0, SUBL = 100, METER = null;
  var MASK_SCALE = 0.25;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    mask.width = Math.max(8, Math.round(W * MASK_SCALE)); mask.height = Math.max(8, Math.round(H * MASK_SCALE));
    PPM = Math.max(H, W * 0.8) / 170;
    K = Math.max(0.75, Math.min(1.3, Math.min(W, H) / 520));
    SUBL = Math.max(84, Math.min(150, Math.min(W, H) * 0.24));
    var hud = $("hud").getBoundingClientRect();
    var acts = document.querySelector(".acts").getBoundingClientRect();
    var mw = 58;
    METER = { x: W - mw - 8, y: hud.bottom + 10, w: mw, h: Math.max(160, acts.top - 14 - (hud.bottom + 10)) };
    if (hud.right > W - mw - 16) METER.y = hud.bottom + 10; // たて: パネル の した
    else METER.y = hud.top;                                 // よこ: パネル の よこ
    METER.h = Math.max(160, acts.top - 14 - METER.y);
    CX = (METER.x) / 2 + 4;
    var dp = document.querySelector(".dpad").getBoundingClientRect();
    CY = hud.bottom + (dp.top - hud.bottom) * 0.58;
    $("toasts").style.top = (hud.bottom + 8) + "px";
  }

  var wx = function (x) { return (x - S.sub.x) * PPM + CX; };
  var wy = function (y) { return (y - S.sub.y) * PPM + CY; };

  // ふかさ ごと の みず の いろ（あか → みどり → あお の じゅん に きえる）
  function tint(d) {
    if (d <= 0) return [1, 1, 1];
    return [Math.exp(-d / 18), Math.exp(-d / 70), Math.exp(-d / 190)];
  }
  function ambientAt(d) { var c = tint(d); return Math.max(c[0], c[1], c[2]); }
  function lightCenter() { return { x: CX + S.sub.face * SUBL * 0.45, y: CY + SUBL * 0.05, r: Math.min(W, H) * 0.46 + 40 }; }
  function litAt(sx, sy) {
    if (!S.light) return 0;
    var L = lightCenter(), d = Math.hypot(sx - L.x, sy - L.y);
    return Math.max(0, 1 - d / L.r) * 1.8;
  }
  function visAt(sx, sy, depth) { return Math.min(1, ambientAt(depth) + litAt(sx, sy)); }
  var VIS = 0.3;

  // ---- すいおん・すいあつ ----
  function tempAt(d) {
    var T = D.TEMP;
    for (var i = 1; i < T.length; i++) if (d <= T[i][0]) {
      var f = (d - T[i - 1][0]) / (T[i][0] - T[i - 1][0]); return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * f;
    }
    return T[T.length - 1][1];
  }
  var PRESS_REF = [[1000, "くるま 1だい"], [600, "うし 1とう"], [300, "ピアノ 1だい"], [140, "おすもうさん 1にん"],
    [60, "おとな 1にん"], [20, "1ねんせい 1にん"], [5, "すいか 1こ"]];
  function pressText(d) {
    var kg = 1.03 * (1 + Math.max(0, d) / 10);
    if (d < 1) return "つめ に やく 1kg（くうき の おもさ）";
    var n = kg < 10 ? kg.toFixed(1) : String(Math.round(kg / (kg < 100 ? 1 : 10)) * (kg < 100 ? 1 : 10));
    var ref = "";
    for (var i = 0; i < PRESS_REF.length; i++) if (kg >= PRESS_REF[i][0]) { ref = PRESS_REF[i][1]; break; }
    if (kg >= 1500) ref = "くるま " + Math.round(kg / 1000) + "だい";
    return "つめ に やく <b>" + n + "kg</b>" + (ref ? "（" + ref + " くらい）" : "");
  }
  function zoneAt(d) {
    if (d < 1) return { name: "うみ の うえ", color: "#74c0fc" };
    for (var i = D.ZONES.length - 1; i >= 0; i--) if (d >= D.ZONES[i].from) return D.ZONES[i];
    return D.ZONES[0];
  }

  // ---- おしらせ ----
  function toast(html, cls, sec) {
    var box = $("toasts"), el = document.createElement("div");
    el.className = "toast" + (cls ? " " + cls : ""); el.innerHTML = rb(html);
    box.appendChild(el);
    while (box.children.length > 2) box.removeChild(box.firstChild);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, (sec || 4.5) * 1000);
  }

  // ---- まど ----
  var modalClose = null;
  function openModal(html, onClose) {
    $("modalBody").innerHTML = html; $("modal").hidden = false; $("modalCard").scrollTop = 0;
    S.paused = true; modalClose = onClose || null; clearInput();
  }
  function closeModal() {
    $("modal").hidden = true;
    var f = modalClose; modalClose = null;
    if (S.started && $("title").hidden) S.paused = false;
    if (f) f();
  }

  // ---- ミッション ----
  function zukanCount(filter) {
    var n = 0; for (var id in save.zukan) if (SP[id] && save.zukan[id] > 0 && (!filter || filter(SP[id]))) n++;
    return n;
  }
  function progress(m) {
    switch (m.id) {
      case "angler3": return save.zukan.chouchin || 0;
      case "d6500": case "bottom": return Math.round(save.maxDepth);
      case "snow": case "vent": return save.missions[m.id] ? 1 : 0;
      case "zukan10": case "all": return zukanCount();
      case "glow5": return zukanCount(function (s) { return s.glow; });
    }
    return 0;
  }
  function checkMissions(extra) {
    D.MISSIONS.forEach(function (m) {
      if (save.missions[m.id]) return;
      var ok = m.id === "bottom" ? save.maxDepth >= 10800 : progress(m) >= m.goal;
      if (extra && extra[m.id]) ok = true;
      if (ok) {
        save.missions[m.id] = true; store();
        SND.fanfare();
        toast("🎉 ミッション たっせい！ 「" + m.title + "」", "ok", 5.5);
      }
    });
  }

  // ---- いきもの ----
  function sizeOf(sp) { return sp.px * K; }
  function spawn(allowInside) {
    var ext = 0.55, minX = S.sub.x - (CX + W * ext) / PPM, maxX = S.sub.x + (W - CX + W * ext) / PPM;
    var minY = S.sub.y - (CY + H * ext) / PPM, maxY = S.sub.y + (H - CY + H * ext) / PPM;
    var vx0 = S.sub.x - CX / PPM, vx1 = S.sub.x + (W - CX) / PPM, vy0 = S.sub.y - CY / PPM, vy1 = S.sub.y + (H - CY) / PPM;
    var pel = 0, ben = 0, count = {};
    S.creatures.forEach(function (c) { if (c.sp.bottom) ben++; else pel++; count[c.sp.id] = (count[c.sp.id] || 0) + 1; });
    var x, y, list, bottom = Math.random() < 0.45;
    if (bottom && ben < 6) {
      var nearVent = null;
      D.VENTS.forEach(function (v) { if (v.x > minX - 50 && v.x < maxX + 50) nearVent = v; });
      x = nearVent && Math.random() < 0.7 ? nearVent.x + (Math.random() * 2 - 1) * 70 : minX + Math.random() * (maxX - minX);
      y = floorAt(x);
      if (y < minY || y > maxY) return;
      if (!allowInside && x > vx0 && x < vx1 && y > vy0 && y < vy1) return;
      var vent = null; D.VENTS.forEach(function (v) { if (Math.abs(x - v.x) < 75) vent = v; });
      list = D.SPECIES.filter(function (s) {
        if (!s.bottom || y < s.min || y > s.max || (count[s.id] || 0) >= 3) return false;
        if (s.vent) return !!vent && s.vent.indexOf(vent.id) >= 0;
        return !vent;
      });
    } else if (!bottom && pel < 6) {
      x = minX + Math.random() * (maxX - minX); y = Math.max(3, minY + Math.random() * (maxY - minY));
      if (!allowInside && x > vx0 && x < vx1 && y > vy0 && y < vy1) return;
      var fl = floorAt(x);
      if (y > fl - 12) return;
      list = D.SPECIES.filter(function (s) {
        if (s.bottom || y < s.min || y > s.max) return false;
        if ((count[s.id] || 0) >= (s.w >= 2.5 ? 2 : 1)) return false;
        if (s.near && fl - y > 140) return false;
        return true;
      });
    } else return;
    if (!list.length) return;
    var tot = 0; list.forEach(function (s) { tot += s.w; });
    var r = Math.random() * tot, sp = list[0];
    for (var i = 0; i < list.length; i++) { r -= list[i].w; if (r <= 0) { sp = list[i]; break; } }
    var face = sp.bottom ? (Math.random() < 0.5 ? -1 : 1) : (x < S.sub.x ? 1 : -1) * (Math.random() < 0.8 ? 1 : -1);
    S.creatures.push({ sp: sp, x: x, y: y, face: face, phase: Math.random() * 10, shot: false, blip: 0,
      v: sp.bottom ? 0 : (sp.sp || 1) * (0.6 + Math.random() * 0.6), y0: y, born: S.t });
  }
  function creatureScreen(c) {
    var u = sizeOf(c.sp), sx = wx(c.x), sy = wy(c.y);
    // そこ に いる もの は からだ の まんなか を あてる ところ に
    return { x: sx, y: c.sp.bottom ? sy - u * 0.3 : sy, u: u, base: sy };
  }

  function updateCreatures(dt) {
    S.spawnT -= dt;
    if (S.spawnT <= 0) { S.spawnT = 0.25; spawn(false); spawn(false); }
    var keep = [];
    for (var i = 0; i < S.creatures.length; i++) {
      var c = S.creatures[i];
      if (!c.sp.bottom) {
        c.x += c.face * c.v * dt;
        c.y = c.y0 + Math.sin(S.t * 0.4 + c.phase) * 2.5;
        var fl = floorAt(c.x);
        if (c.y > fl - 8) { c.y0 -= (c.y - (fl - 8)); c.y = fl - 8; }
        if (c.y < 2) c.y0 += 1;
      } else if (c.sp.id === "daiougusoku" || c.sp.id === "senju" || c.sp.id === "yunohana") {
        c.x += c.face * 0.25 * dt; c.y = floorAt(c.x);
      }
      var p = creatureScreen(c);
      if (Math.abs(p.x - CX) < W * 1.5 + p.u && Math.abs(p.y - CY) < H * 1.5 + p.u) keep.push(c);
    }
    S.creatures = keep;
  }

  // ---- マリンスノー・あわ ----
  function initSnow() {
    S.snow = [];
    for (var i = 0; i < 90; i++) S.snow.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 1.8, s: 0.3 + Math.random() * 0.7 });
  }
  function updateSnow(dt, dxPx, dyPx) {
    for (var i = 0; i < S.snow.length; i++) {
      var p = S.snow[i];
      p.x -= dxPx; p.y -= dyPx; p.y += p.s * 6 * dt * K; p.x += Math.sin(S.t * 0.5 + i) * 3 * dt;
      if (p.y > H) p.y -= H; if (p.y < 0) p.y += H; if (p.x > W) p.x -= W; if (p.x < 0) p.x += W;
    }
    for (var j = S.bubbles.length - 1; j >= 0; j--) {
      var b = S.bubbles[j];
      b.x -= dxPx; b.y -= dyPx; b.y -= 40 * dt; b.life -= dt;
      if (b.life <= 0) S.bubbles.splice(j, 1);
    }
  }

  // ---- そうさ ----
  function clearInput() { input.btn = {}; input.keys = {}; drag = null; document.querySelectorAll(".dpad button").forEach(function (b) { b.classList.remove("on"); }); }
  function inputDir() {
    var k = input.keys, b = input.btn;
    var x = (k.ArrowRight || k.d || b.right ? 1 : 0) - (k.ArrowLeft || k.a || b.left ? 1 : 0);
    var y = (k.ArrowDown || k.s || b.down ? 1 : 0) - (k.ArrowUp || k.w || b.up ? 1 : 0);
    return { x: x, y: y };
  }

  function updateSub(dt) {
    var s = S.sub, d = s.y, dir = inputDir();
    var maxV = 60 + d * 0.012, maxH = 45 + d * 0.004, tx, ty;
    if (dir.x) input.holdX += dt; else input.holdX = 0;
    if (dir.y) input.holdY += dt; else input.holdY = 0;
    tx = dir.x * maxH * Math.min(1, 0.2 + input.holdX / 1.5);
    ty = dir.y * maxV * Math.min(1, 0.15 + input.holdY / 1.8);
    if (drag && (drag.moved || S.t - drag.t0 > 0.3)) {
      var vx = drag.px - CX, vy = drag.py - CY, len = Math.hypot(vx, vy), m = Math.min(W, H) * 0.3;
      if (len > 18) { var f = Math.min(1, len / m) / len; tx = vx * f * maxH; ty = vy * f * maxV; }
    }
    if (S.auto) ty = -Math.max(90, maxV * 0.8);
    var a = 1 - Math.exp(-dt * 3);
    s.vx += (tx - s.vx) * a; s.vy += (ty - s.vy) * a;
    var ox = s.x, oy = s.y;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.x = Math.max(40, Math.min(R.WORLD_W - 40, s.x));
    if (s.y < 0) { s.y = 0; if (s.vy < 0) s.vy = 0; }
    var fl = floorAt(s.x) - 7;
    if (s.y > fl) { s.y = fl; if (s.vy > 0) s.vy = 0; }
    if (s.vx > 3) s.face = 1; else if (s.vx < -3) s.face = -1;
    var sp = Math.hypot(s.vx, s.vy);
    if (s.y > 2 && sp > 8 && Math.random() < dt * Math.min(12, sp / 6)) {
      S.bubbles.push({ x: CX - s.face * SUBL * 0.55, y: CY + (Math.random() - 0.5) * 10, r: 2 + Math.random() * 4, life: 1.2 });
      if (Math.random() < 0.3) SND.bubble();
    }
    return { dx: (s.x - ox) * PPM, dy: (s.y - oy) * PPM, moving: sp > 5 };
  }

  // ---- しゃしん ----
  function tryPhoto(px, py) {
    var best = null, bd = 1e9;
    for (var i = S.creatures.length - 1; i >= 0; i--) {
      var c = S.creatures[i], p = creatureScreen(c), r = Math.max(p.u * 0.55, 38), d = Math.hypot(px - p.x, py - p.y);
      if (d < r && d < bd) { best = c; bd = d; }
    }
    if (!best) {
      if (!S.light && S.sub.y > 300 && S.t - S.darkHintT > 6) { S.darkHintT = S.t; toast("まっくら で 見{み}えない… 💡 ライト を つけて みよう"); }
      return;
    }
    var p2 = creatureScreen(best);
    if (visAt(p2.x, p2.y, best.y) < VIS) {
      toast(best.sp.glow ? "ひかって いる けど、くらくて よく 見{み}えない… 💡 ライト で てらそう" : "くらくて よく 見{み}えない… 💡 ライト を つけよう");
      return;
    }
    SND.shutter(); S.flash = 1;
    if (best.shot) { toast("📷 " + best.sp.name + "（この こ は もう とったよ）"); return; }
    best.shot = true; S.dive.shots++;
    var id = best.sp.id, first = !save.zukan[id];
    save.zukan[id] = (save.zukan[id] || 0) + 1; store();
    if (first) {
      S.dive.found.push(id); SND.found();
      setTimeout(function () { showSpecies(best.sp, true); }, 350);
    } else {
      toast("📷 " + best.sp.name + "（" + save.zukan[id] + "まいめ）");
    }
    checkMissions();
  }

  function onTap(px, py) { tryPhoto(px, py); }

  // ---- ソナー ----
  function sonar() {
    if (S.paused || S.sonarCool > 0 || S.battery <= 0) return;
    SND.ping(); S.sonar = { t0: S.t }; S.sonarCool = 2.2; S.battery = Math.max(0, S.battery - 0.5);
    $("btnSonar").classList.add("on"); setTimeout(function () { $("btnSonar").classList.remove("on"); }, 600);
    var rng = Math.max(W, H) * 0.95, n = 0;
    S.creatures.forEach(function (c) {
      var p = creatureScreen(c);
      if (Math.hypot(p.x - CX, p.y - CY) < rng) { c.blip = S.t + 4.5; n++; }
    });
    var v = nearestVent();
    if (v && v.dist < 2600 && v.dist > 60) {
      S.ventArrowUntil = S.t + 6;
      toast("📡 ソナー: ねっすい の はんのう！ やじるし の ほう へ いって みよう");
    } else if (n) toast("📡 ソナー: ちかく に " + n + " この はんのう！");
    else toast("📡 ソナー: ちかく には なにも いない みたい");
  }
  function nearestVent() {
    var best = null;
    D.VENTS.forEach(function (v) {
      var d = Math.hypot(v.x - S.sub.x, v.depth - S.sub.y);
      if (!best || d < best.dist) best = { v: v, dist: d };
    });
    return best && { x: best.v.x, y: best.v.depth, id: best.v.id, dist: best.dist };
  }

  function setLight(on) {
    if (on && S.battery <= 0) { toast("でんち が ない ので ライト が つかない…"); return; }
    S.light = !!on; $("btnLight").classList.toggle("on", S.light);
    SND.tap();
  }

  // ---- 1コマ ごと ----
  var last = 0, hudT = 0, sndT = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (!S.paused) step(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function step(dt) {
    S.t += dt;
    S.sonarCool = Math.max(0, S.sonarCool - dt);
    var mv = updateSub(dt), d = S.sub.y;
    updateSnow(dt, mv.dx, mv.dy);
    updateCreatures(dt);
    S.flash = Math.max(0, S.flash - dt * 3);

    // でんち・さんそ
    if (d > 1.5) {
      S.surfaced = false;
      S.oxygen = Math.max(0, S.oxygen - dt * 100 / 600);
      S.battery = Math.max(0, S.battery - dt * (0.06 + (mv.moving ? 0.05 : 0) + (S.light ? 0.14 : 0)));
      if (S.battery <= 0 && S.light) setLight(false);
      if ((S.battery <= 0 || S.oxygen <= 0) && !S.auto) {
        S.auto = true;
        toast("おもり を はずして、じどう で うかびあがるよ。（ほんもの の しんかい6500 も おもり を すてて うかぶ）", "warn", 7);
        SND.chime();
      }
      if (!S.auto && Math.min(S.battery, S.oxygen) < 25 && S.t - S.lowT > 25) {
        S.lowT = S.t; SND.chime();
        toast("そろそろ もどろう！ ▲ で うえ へ。うみ の 上{うえ} に でると じゅうでん できるよ", "warn", 6);
      }
    } else {
      if (S.battery < 100 || S.oxygen < 100) { S.battery = Math.min(100, S.battery + dt * 40); S.oxygen = Math.min(100, S.oxygen + dt * 40); }
      if (!S.surfaced) surfaceBack();
    }

    // きろく・おしらせ
    if (d > S.dive.max) S.dive.max = d;
    if (d > save.maxDepth) { save.maxDepth = d; if ((S.t | 0) % 3 === 0) store(); }
    D.MILESTONES.forEach(function (m) {
      if (d >= m.d && !S.dive.hit[m.d]) { S.dive.hit[m.d] = true; toast(m.text, "", 6); SND.chime(); checkMissions(); }
    });
    // マリンスノー
    if (S.light && d >= 300) {
      S.snowT += dt;
      if (S.snowT > 2 && !save.missions.snow) {
        checkMissions({ snow: true });
        toast("❄️ マリンスノー！ ゆき みたい な つぶ は、上{うえ} から しずんで くる いきもの の しがい や ふん など。深海{しんかい} の いきもの の だいじ な ごはん。", "", 8);
      }
    } else S.snowT = 0;
    // ねっすい
    var lc = lightCenter();
    D.VENTS.forEach(function (v) {
      var sx = wx(v.x), sy = wy(floorAt(v.x)) - 50 * K;
      var lit = Math.hypot(sx - lc.x, sy - lc.y) < lc.r * 0.9 && S.light;
      var inView = sx > 0 && sx < W && sy > 0 && sy < H;
      if (inView && (lit || visAt(sx, sy, v.depth) >= VIS) && !S.ventSeen[v.id]) {
        S.ventSeen[v.id] = true;
        toast("♨️ ねっすい の でる ところ を 見{み}つけた！ ちか で あたためられた みず が ふきだす（300℃ を こえる ことも）。ねっすい の せいぶん を えいよう に かえる バクテリア と、その まわり の いきもの が あつまる。", "ok", 9);
        checkMissions({ vent: true });
      }
    });

    hudT -= dt; if (hudT <= 0) { hudT = 0.1; updateHud(); }
    sndT -= dt; if (sndT <= 0) { sndT = 0.25; SND.ambient(d, true); }
  }

  function surfaceBack() {
    S.surfaced = true; S.auto = false; S.battery = 100; S.oxygen = 100; updateHud();
    var dv = S.dive;
    if (dv.max > 30) {
      save.dives++; store();
      var names = dv.found.map(function (id) { return "<span class='tag'>" + SP[id].name + "</span>"; }).join(" ");
      SND.chime();
      openModal("<h2>🚢 おかえりなさい！</h2>" +
        "<p class='lead'>こんかい いちばん ふかく もぐった ところ: <b>" + Math.round(dv.max).toLocaleString() + "m</b><br>" +
        "とった しゃしん: <b>" + dv.shots + "まい</b></p>" +
        (dv.found.length ? "<p class='lead'>あたらしく 見{み}つけた いきもの:<br>" + names + "</p>" : "<p class='lead'>つぎ は あたらしい いきもの を さがそう！</p>") +
        "<p class='lead'>でんち と 酸素{さんそ} を いっぱい に したよ。</p>" +
        "<button class='big' data-act='close'>また もぐる ▼</button>");
      $("modalBody").innerHTML = rb($("modalBody").innerHTML);
    }
    S.dive = { max: 0, found: [], hit: {}, shots: 0 };
    S.ventSeen = {};
  }

  // ---- HUD ----
  var lastZone = "";
  function updateHud() {
    var d = S.sub.y, z = zoneAt(d);
    $("depthNum").innerHTML = Math.round(d).toLocaleString() + "<small>m</small>";
    if (z.name !== lastZone) { lastZone = z.name; $("zoneName").textContent = z.name; $("zoneName").style.background = z.pill || z.color; }
    $("temp").textContent = d < 1 ? "やく 24℃" : "やく " + Math.round(tempAt(d)) + "℃";
    $("press").innerHTML = pressText(d);
    setBar("bat", S.battery); setBar("oxy", S.oxygen);
  }
  function setBar(k, v) {
    $(k + "Bar").style.width = v.toFixed(1) + "%";
    var box = $(k + "Box");
    box.classList.toggle("low", v < 25 && v > 0);
    box.classList.toggle("empty", v <= 0);
  }

  // ---- えがく ----
  function draw() {
    var c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
    var d = S.sub.y, seaTop = wy(0);

    // みず（ほんとう の いろ。あと で ふかさ の いろ を かける）
    // ふかい ところ の みず は ライト で てらしても くらい あお
    var wg = c.createLinearGradient(0, 0, 0, H);
    for (var q = 0; q <= 4; q++) {
      var dq = S.sub.y + (H * q / 4 - CY) / PPM, f = Math.max(0, Math.min(1, dq / 350));
      wg.addColorStop(q / 4, "rgb(" + Math.round(110 - 88 * f) + "," + Math.round(200 - 150 * f) + "," + Math.round(240 - 130 * f) + ")");
    }
    c.fillStyle = wg; c.fillRect(0, Math.max(0, seaTop), W, H);
    drawSurface(c, seaTop);
    // マリンスノー
    var snowA = Math.max(0, Math.min(1, (d - 120) / 250));
    if (snowA > 0) {
      c.fillStyle = "rgba(255,255,255," + (0.85 * snowA) + ")";
      for (var i = 0; i < S.snow.length; i++) { var p = S.snow[i]; if (p.y > seaTop) { c.beginPath(); c.arc(p.x, p.y, p.r * K, 0, 6.283); c.fill(); } }
    }
    drawFloor(c);
    D.VENTS.forEach(function (v) { drawVent(c, v); });
    // いきもの
    S.creatures.forEach(function (cr) { drawCreature(c, cr, "body"); });
    // あわ
    c.fillStyle = "rgba(230,245,255,.75)";
    S.bubbles.forEach(function (b) { c.beginPath(); c.arc(b.x, b.y, b.r, 0, 6.283); c.fill(); });

    // ふかさ の いろ（あか から きえて、あお、まっくら）と ライト
    drawMask();
    c.globalCompositeOperation = "multiply";
    c.imageSmoothingEnabled = true;
    c.drawImage(mask, 0, 0, W, H);

    // ひかる もの
    c.globalCompositeOperation = "lighter";
    var dark = 1 - Math.min(1, ambientAt(d) * 0.8);
    c.globalAlpha = 0.35 + 0.65 * dark;
    S.creatures.forEach(function (cr) { if (cr.sp.glow) drawCreature(c, cr, "glow"); });
    c.globalAlpha = 1;
    c.save(); c.translate(CX, CY); if (S.sub.face < 0) c.scale(-1, 1);
    R.drawSub(c, SUBL, S.t, "glow", S.light, false); c.restore();

    // せんすいてい は いつも 見える
    c.globalCompositeOperation = "source-over";
    drawLabels(c);
    c.save(); c.translate(CX, CY + Math.sin(S.t * 2) * 1.5); if (S.sub.face < 0) c.scale(-1, 1);
    R.drawSub(c, SUBL, S.t, "body", S.light, Math.hypot(S.sub.vx, S.sub.vy) > 5); c.restore();

    drawSonar(c);
    drawArrows(c);
    drawMeter(c);
    if (S.flash > 0) { c.fillStyle = "rgba(255,255,255," + (S.flash * 0.7) + ")"; c.fillRect(0, 0, W, H); }
  }

  function drawMask() {
    var m = mctx, mw = mask.width, mh = mask.height, sc = mw / W;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = "source-over";
    var g = m.createLinearGradient(0, 0, 0, mh);
    for (var i = 0; i <= 16; i++) {
      var sy = H * i / 16, dep = S.sub.y + (sy - CY) / PPM, t = tint(dep);
      g.addColorStop(i / 16, "rgb(" + Math.round(t[0] * 255) + "," + Math.round(t[1] * 255) + "," + Math.round(t[2] * 255) + ")");
    }
    m.fillStyle = g; m.fillRect(0, 0, mw, mh);
    if (S.light) {
      var L = lightCenter(), lg = m.createRadialGradient(L.x * sc, L.y * sc, 0, L.x * sc, L.y * sc, L.r * sc);
      lg.addColorStop(0, "rgba(255,248,232,1)"); lg.addColorStop(0.45, "rgba(255,245,225,.8)"); lg.addColorStop(1, "rgba(255,245,225,0)");
      m.globalCompositeOperation = "lighter"; m.fillStyle = lg; m.fillRect(0, 0, mw, mh);
    }
  }

  function drawSurface(c, seaTop) {
    if (seaTop <= -20) return;
    var g = c.createLinearGradient(0, 0, 0, Math.max(1, seaTop));
    g.addColorStop(0, "#5fb4f0"); g.addColorStop(1, "#d5f0ff");
    c.fillStyle = g; c.fillRect(0, 0, W, Math.max(0, seaTop));
    R.circle(c, W * 0.75, seaTop - 160 * K, 28 * K, "#fff3bf");
    // みなと
    var qx = wx(0);
    if (qx > -50) {
      c.fillStyle = "#adb5bd"; c.fillRect(-10, seaTop - 6 * PPM, qx + 10, 6 * PPM + 15 * PPM);
      c.fillStyle = "#868e96"; c.fillRect(-10, seaTop - 6 * PPM, qx + 10, 6);
      // とうだい
      var lx = qx - 60 * K;
      c.fillStyle = "#fff"; c.fillRect(lx - 9 * K, seaTop - 6 * PPM - 70 * K, 18 * K, 70 * K);
      c.fillStyle = "#e03131"; c.fillRect(lx - 9 * K, seaTop - 6 * PPM - 50 * K, 18 * K, 12 * K);
      R.circle(c, lx, seaTop - 6 * PPM - 76 * K, 9 * K, "#ffd43b");
    }
    // ぼせん（ささえる ふね）
    var sx = wx(110);
    if (sx > -200 && sx < W + 200) {
      var bob = Math.sin(S.t * 1.5) * 2, L = 150 * K, y = seaTop + bob;
      c.beginPath(); c.moveTo(sx - L * 0.5, y - L * 0.16); c.lineTo(sx + L * 0.55, y - L * 0.16); c.lineTo(sx + L * 0.4, y + L * 0.1); c.lineTo(sx - L * 0.45, y + L * 0.1); c.closePath();
      c.fillStyle = "#1c4fa3"; c.fill();
      c.fillStyle = "#ffffff"; c.fillRect(sx - L * 0.3, y - L * 0.36, L * 0.45, L * 0.2);
      c.fillStyle = "#74c0fc"; for (var i = 0; i < 4; i++) c.fillRect(sx - L * 0.26 + i * L * 0.1, y - L * 0.31, L * 0.06, L * 0.06);
      R.line(c, [sx + L * 0.3, y - L * 0.16, sx + L * 0.35, y - L * 0.5, sx + L * 0.55, y - L * 0.45], "#e67700", Math.max(2, 3 * K));
      c.fillStyle = "#fff"; c.font = "bold " + Math.round(12 * K) + "px sans-serif"; c.textAlign = "center";
      c.fillText("ぼせん", sx, y - L * 0.02);
    }
    // なみ
    c.fillStyle = "rgba(255,255,255,.6)";
    c.beginPath(); c.moveTo(0, seaTop);
    for (var x = 0; x <= W; x += 16) c.lineTo(x, seaTop + Math.sin(x * 0.05 + S.t * 2) * 3);
    c.lineTo(W, seaTop + 6); c.lineTo(0, seaTop + 6); c.closePath(); c.fill();
  }

  function drawFloor(c) {
    var step = 8, pts = [];
    for (var sx = -step; sx <= W + step; sx += step) {
      var x = S.sub.x + (sx - CX) / PPM;
      pts.push(sx, wy(floorAt(x)));
    }
    var minY = 1e9; for (var i = 1; i < pts.length; i += 2) minY = Math.min(minY, pts[i]);
    if (minY > H + 10) return;
    c.beginPath(); c.moveTo(pts[0], H + 10);
    for (var j = 0; j < pts.length; j += 2) c.lineTo(pts[j], pts[j + 1]);
    c.lineTo(pts[pts.length - 2], H + 10); c.closePath();
    var g = c.createLinearGradient(0, minY, 0, minY + 200);
    g.addColorStop(0, "#b39b7d"); g.addColorStop(0.15, "#8c7660"); g.addColorStop(1, "#4d4034");
    c.fillStyle = g; c.fill();
    c.beginPath();
    for (var k = 0; k < pts.length; k += 2) { if (k) c.lineTo(pts[k], pts[k + 1]); else c.moveTo(pts[k], pts[k + 1]); }
    c.strokeStyle = "#e3d5c0"; c.lineWidth = 3 * K; c.stroke();
    // いし
    c.fillStyle = "rgba(60,50,40,.5)";
    for (var r = 0; r < pts.length; r += 6) {
      var wxp = S.sub.x + (pts[r] - CX) / PPM, h = (Math.sin(wxp * 12.9898) * 43758.5453) % 1;
      if (Math.abs(h) > 0.6) { c.beginPath(); c.ellipse(pts[r], pts[r + 1] + 4 * K, 6 * K * Math.abs(h), 3.5 * K, 0, 0, 6.283); c.fill(); }
    }
  }

  function drawVent(c, v) {
    var sx = wx(v.x), sy = wy(floorAt(v.x));
    if (sx < -300 || sx > W + 300 || sy < -300 || sy > H + 300) return;
    var chim = [[-34, 70, 20], [0, 115, 26], [30, 85, 18]];
    for (var i = 0; i < chim.length; i++) {
      var ch = chim[i], x = sx + ch[0] * K, hgt = ch[1] * K, w = ch[2] * K;
      // けむり
      for (var k = 0; k < 7; k++) {
        var ph = ((S.t * 0.35 + k / 7 + i * 0.13) % 1), py = sy - hgt - ph * 160 * K, pr = (6 + ph * 26) * K;
        c.fillStyle = "rgba(" + (v.id === "v1" ? "235,235,240" : "70,70,80") + "," + (0.55 * (1 - ph)) + ")";
        c.beginPath(); c.arc(x + Math.sin(S.t + k + i) * 6 * K * ph, py, pr, 0, 6.283); c.fill();
      }
      c.beginPath(); c.moveTo(x - w * 0.7, sy + 4); c.lineTo(x - w * 0.4, sy - hgt); c.lineTo(x + w * 0.4, sy - hgt); c.lineTo(x + w * 0.7, sy + 4); c.closePath();
      c.fillStyle = "#5a4a3f"; c.fill();
      c.fillStyle = "#c98a3a"; c.fillRect(x - w * 0.3, sy - hgt * 0.7, w * 0.2, hgt * 0.15);
      c.fillStyle = "#e0b04a"; c.fillRect(x + w * 0.05, sy - hgt * 0.4, w * 0.25, hgt * 0.1);
      c.fillStyle = "#3d3029"; c.fillRect(x - w * 0.45, sy - hgt - 3 * K, w * 0.9, 6 * K);
    }
  }

  function drawCreature(c, cr, mode) {
    var p = creatureScreen(cr);
    if (p.x < -p.u * 1.2 || p.x > W + p.u * 1.2 || p.y < -p.u * 1.2 || p.y > H + p.u * 1.2) return;
    c.save(); c.translate(p.x, cr.sp.bottom ? p.base : p.y);
    if (cr.face < 0) c.scale(-1, 1);
    DRAW[cr.sp.draw](c, p.u, S.t + cr.phase, mode, cr.sp);
    c.restore();
  }

  function tag(c, text, x, y, bg, fg) {
    c.font = "bold " + Math.round(13 * Math.max(1, K)) + "px sans-serif";
    var w = c.measureText(text).width + 14, h = 22 * Math.max(1, K);
    c.fillStyle = bg; roundRect(c, x - w / 2, y - h / 2, w, h, h / 2); c.fill();
    c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, x, y + 1);
    c.textBaseline = "alphabetic";
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function drawLabels(c) {
    S.creatures.forEach(function (cr) {
      var p = creatureScreen(cr);
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) return;
      var vis = visAt(p.x, p.y, cr.y) >= VIS, known = save.zukan[cr.sp.id] > 0;
      var ly = p.y + p.u * (cr.sp.bottom ? 0.45 : 0.35) + 14;
      if (vis && !cr.shot && !known) {
        var pulse = 0.75 + 0.25 * Math.sin(S.t * 5);
        c.globalAlpha = pulse; tag(c, "📷 タップ！", p.x, p.y - p.u * 0.45 - 12, "rgba(255,212,59,.95)", "#3b2f00"); c.globalAlpha = 1;
      } else if (vis && known) {
        tag(c, plain(cr.sp.name), p.x, ly, "rgba(8,20,52,.7)", "#fff");
      } else if (!vis && cr.blip > S.t) {
        var a = Math.min(1, (cr.blip - S.t) / 1.5);
        c.strokeStyle = "rgba(102,217,232," + a + ")"; c.lineWidth = 3;
        c.beginPath(); c.arc(p.x, p.y, Math.max(24, p.u * 0.4) + Math.sin(S.t * 6) * 3, 0, 6.283); c.stroke();
        c.globalAlpha = a; tag(c, known ? plain(cr.sp.name) : "？", p.x, p.y, "rgba(5,44,51,.8)", "#99e9f2"); c.globalAlpha = 1;
      }
    });
  }

  function drawSonar(c) {
    if (!S.sonar) return;
    var e = S.t - S.sonar.t0; if (e > 1.6) { S.sonar = null; return; }
    for (var i = 0; i < 2; i++) {
      var ee = e - i * 0.25; if (ee < 0) continue;
      c.strokeStyle = "rgba(102,217,232," + Math.max(0, 0.8 - ee / 1.6) + ")"; c.lineWidth = 4;
      c.beginPath(); c.arc(CX, CY, ee * Math.max(W, H) * 0.65, 0, 6.283); c.stroke();
    }
  }

  function arrow(c, ang, text, color) {
    var r = Math.min(W, H) * 0.24 + SUBL * 0.3, x = CX + Math.cos(ang) * r, y = CY + Math.sin(ang) * r;
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = color; c.beginPath(); c.moveTo(22, 0); c.lineTo(-10, -16); c.lineTo(-4, 0); c.lineTo(-10, 16); c.closePath(); c.fill();
    c.restore();
    tag(c, text, x - Math.cos(ang) * 40, y - Math.sin(ang) * 40 + 24, "rgba(8,20,52,.75)", color);
  }
  function drawArrows(c) {
    var pulse = 0.6 + 0.4 * Math.sin(S.t * 5);
    if (S.ventArrowUntil > S.t) {
      var v = nearestVent();
      if (v) {
        var sx = wx(v.x), sy = wy(v.y);
        if (sx < 30 || sx > W - 30 || sy < 30 || sy > H - 30) { c.globalAlpha = pulse; arrow(c, Math.atan2(sy - CY, sx - CX), "ねっすい", "#ff922b"); c.globalAlpha = 1; }
      }
    }
    if ((S.auto || Math.min(S.battery, S.oxygen) < 25) && S.sub.y > 5) {
      c.globalAlpha = pulse; arrow(c, -Math.PI / 2, S.auto ? "うかんで いるよ" : "うえ へ もどろう", "#ffd43b"); c.globalAlpha = 1;
    }
  }

  // ふかさ メーター（よこ に くらべる もの を さかさま に）
  function drawMeter(c) {
    var M = METER; if (!M) return;
    var x = M.x, y = M.y, w = M.w, h = M.h, top = y + 10, bot = y + h - 10;
    var Y = function (dd) { return top + (bot - top) * dd / 11000; };
    c.fillStyle = "rgba(8,20,52,.7)"; roundRect(c, x, y, w, h, 14); c.fill();
    c.strokeStyle = "rgba(160,190,255,.35)"; c.lineWidth = 2; c.stroke();
    var bx = x + w - 18, bw = 10;
    D.ZONES.forEach(function (z) { c.fillStyle = z.color; c.fillRect(bx, Y(z.from), bw, Y(Math.min(11000, z.to)) - Y(z.from) + 0.5); });
    // さかさま の やま と タワー
    var cx = x + (w - 22) / 2 + 2;
    c.fillStyle = "rgba(220,225,240,.35)";
    c.beginPath(); c.moveTo(cx - 17, top); c.lineTo(cx + 17, top); c.lineTo(cx, Y(8849)); c.closePath(); c.fill();
    c.fillStyle = "rgba(120,160,230,.75)";
    c.beginPath(); c.moveTo(cx - 13, top); c.lineTo(cx + 13, top); c.lineTo(cx + 2, Y(3776)); c.lineTo(cx - 2, Y(3776)); c.closePath(); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(cx - 4, Y(3200)); c.lineTo(cx + 4, Y(3200)); c.lineTo(cx + 2, Y(3776)); c.lineTo(cx - 2, Y(3776)); c.closePath(); c.fill();
    c.fillStyle = "#ced4da"; c.fillRect(cx - 1.5, top, 3, Math.max(2, Y(634) - top));
    // しんかい6500
    c.fillStyle = "#ffd43b"; c.fillRect(x + 6, Y(6500) - 1, w - 12, 2);
    // ラベル（メーター の ひだり）
    var labs = [[634, "スカイツリー"], [3776, "ふじさん"], [6500, "しんかい6500"], [8849, "エベレスト"], [10920, "1まん900m"]];
    c.font = "bold 11px sans-serif"; c.textAlign = "right"; c.textBaseline = "middle";
    var lastY = -99;
    labs.forEach(function (l) {
      var ly = Math.max(Y(l[0]), lastY + 15); lastY = ly;
      var tw = c.measureText(l[1]).width;
      c.fillStyle = "rgba(8,20,52,.6)"; roundRect(c, x - tw - 12, ly - 8, tw + 10, 16, 8); c.fill();
      c.fillStyle = l[0] === 6500 ? "#ffd43b" : "#dbe4ff"; c.fillText(l[1], x - 5, ly + 0.5);
    });
    // きろく
    if (save.maxDepth > 5) {
      c.strokeStyle = "#ff8787"; c.setLineDash([4, 3]); c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 4, Y(save.maxDepth)); c.lineTo(x + w - 4, Y(save.maxDepth)); c.stroke(); c.setLineDash([]);
    }
    // いま の ふかさ
    var py = Y(Math.min(11000, S.sub.y));
    c.fillStyle = "#ffe066";
    c.beginPath(); c.moveTo(bx - 2, py); c.lineTo(bx - 14, py - 9); c.lineTo(bx - 14, py + 9); c.closePath(); c.fill();
    c.strokeStyle = "#ffe066"; c.lineWidth = 2; c.beginPath(); c.moveTo(bx - 2, py); c.lineTo(bx + bw + 4, py); c.stroke();
    c.textBaseline = "alphabetic";
  }

  // ---- ずかん ----
  function thumb(canvas, sp, known, big) {
    var w = canvas.width, h = canvas.height, c = canvas.getContext("2d");
    c.clearRect(0, 0, w, h);
    var tall = /^(sunfish|jelly|angler|mendako|vampire|dumbo|sponge|tunicate|tubeworm|snail|crab|tripod|cucumber|squat|fangtooth|hatchet|amphipod|school)$/.test(sp.draw);
    var u = Math.min(w * 0.72, h * (tall ? 0.85 : 1.5));
    if (sp.bottom) u = Math.min(u, h * 0.8);
    c.save(); c.translate(w / 2, sp.bottom ? h * 0.85 : h / 2);
    DRAW[sp.draw](c, u, 1.3, "body", sp);
    if (known && sp.glow) { c.globalCompositeOperation = "lighter"; DRAW[sp.draw](c, u, 1.3, "glow", sp); }
    c.restore();
    if (!known) { c.globalCompositeOperation = "source-atop"; c.fillStyle = "#8f9bbd"; c.fillRect(0, 0, w, h); c.globalCompositeOperation = "source-over"; }
  }
  function zoneOf(id) { for (var i = 0; i < D.ZONES.length; i++) if (D.ZONES[i].id === id) return D.ZONES[i]; return D.ZONES[0]; }

  function openZukan() {
    var html = "<h2>📖 ずかん</h2><p class='zcount'>見{み}つけた いきもの: <b>" + zukanCount() + "</b> / " + D.SPECIES.length + " しゅるい</p>";
    D.ZONES.forEach(function (z) {
      var list = D.SPECIES.filter(function (s) { return s.zone === z.id; });
      if (!list.length) return;
      html += "<h3 style='background:" + z.color + "'>" + z.kanji + "（" + z.from + "m〜" + (z.id === "chou" ? "" : z.to + "m") + "）</h3><div class='grid'>";
      list.forEach(function (s) {
        var k = save.zukan[s.id] > 0;
        html += "<button class='zcard" + (k ? "" : " unknown") + "' data-sp='" + s.id + "'><canvas width='212' height='144' data-th='" + s.id + "'></canvas>" +
          "<span class='nm'>" + (k ? s.name : "？？？") + "</span>" + (k ? "" : "<span>" + s.min + "〜" + s.max + "m</span>") + "</button>";
      });
      html += "</div>";
    });
    openModal(rb(html));
    document.querySelectorAll("#modalBody canvas[data-th]").forEach(function (cnv) {
      var id = cnv.getAttribute("data-th"); thumb(cnv, SP[id], save.zukan[id] > 0, false);
    });
  }

  function showSpecies(sp, isNew) {
    var z = zoneOf(sp.zone), n = save.zukan[sp.id] || 0;
    var tags = "<span class='tag' style='background:" + z.color + ";color:#fff'>" + z.kanji + "</span>" +
      (sp.glow ? "<span class='tag'>✨ ひかる</span>" : "") + (sp.bottom ? "<span class='tag'>🪨 うみ の そこ</span>" : "") +
      (sp.vent ? "<span class='tag'>♨️ ねっすい</span>" : "");
    var html = "<div class='detail'>" + (isNew ? "<div class='newbadge'>✨ はじめて 見{み}つけた！ ずかん に のったよ</div>" : "") +
      "<h2>" + sp.name + "</h2><canvas width='840' height='520' id='bigTh'></canvas><div>" + tags + "</div>" +
      "<dl><dt>すむ ふかさ</dt><dd>" + sp.range + "</dd><dt>大{おお}きさ</dt><dd>" + sp.size + "</dd>" +
      "<dt>ひとこと</dt><dd>" + sp.note + "</dd><dt>しゃしん</dt><dd>" + n + "まい</dd></dl>" +
      (isNew ? "<button class='big' data-act='close'>たんけん に もどる</button>" : "<button class='big sub' data-act='zukan'>◀ ずかん に もどる</button>") + "</div>";
    openModal(rb(html));
    thumb($("bigTh"), sp, true, true);
  }

  function openMissions() {
    var html = "<h2>🎯 ミッション</h2><ul class='mlist'>";
    D.MISSIONS.forEach(function (m) {
      var done = !!save.missions[m.id], p = progress(m), pct = Math.min(100, Math.round(p / m.goal * 100));
      var ptxt = m.id === "d6500" || m.id === "bottom" ? "きろく " + Math.round(Math.min(p, m.goal)).toLocaleString() + "m" :
        (m.goal > 1 ? Math.min(p, m.goal) + " / " + m.goal : "");
      html += "<li class='" + (done ? "done" : "") + "'><span class='st'>" + (done ? "🏅" : "⬜") + "</span><span><b>" + m.title + "</b>" +
        (ptxt ? "<br>" + ptxt : "") + (done ? "" : "<div class='prog'><i style='width:" + pct + "%'></i></div><span class='hint'>ヒント: " + m.hint + "</span>") + "</span></li>";
    });
    html += "</ul><button class='reset' data-act='reset'>きろく を ぜんぶ けす</button>";
    openModal(rb(html));
  }

  // ---- イベント ----
  $("modalClose").addEventListener("click", closeModal);
  $("modal").addEventListener("click", function (e) {
    if (e.target === $("modal")) { closeModal(); return; }
    var b = e.target.closest("[data-act],[data-sp]");
    if (!b) return;
    if (b.dataset.sp) { if (save.zukan[b.dataset.sp] > 0) showSpecies(SP[b.dataset.sp], false); else toast("まだ 見{み}つけて いない いきもの。" + SP[b.dataset.sp].min + "〜" + SP[b.dataset.sp].max + "m くらい に いるよ"); return; }
    var a = b.dataset.act;
    if (a === "close") closeModal();
    else if (a === "zukan") openZukan();
    else if (a === "reset") {
      if (window.confirm("ずかん・きろく・ミッション を ぜんぶ けしても いい？")) {
        save.zukan = {}; save.maxDepth = 0; save.missions = {}; save.dives = 0; store(); openMissions();
      }
    }
  });
  $("btnZukan").addEventListener("click", openZukan);
  $("btnMission").addEventListener("click", openMissions);
  $("btnTitleZukan").addEventListener("click", openZukan);
  $("btnTitleMission").addEventListener("click", openMissions);
  function soundBtn() { $("btnSound").textContent = save.sound ? "🔊" : "🔇"; }
  $("btnSound").addEventListener("click", function () {
    save.sound = !save.sound; store(); SND.init(); SND.setOn(save.sound); soundBtn();
  });
  $("btnLight").addEventListener("click", function () { if (!S.paused) setLight(!S.light); });
  $("btnSonar").addEventListener("click", sonar);
  $("btnStart").addEventListener("click", function () {
    SND.init(); SND.setOn(save.sound); SND.splash();
    $("title").hidden = true; S.started = true; S.paused = false;
    for (var i = 0; i < 30; i++) spawn(true);
    toast("みなと から しゅっぱつ！ ▼ で もぐろう。みぎ へ いくほど うみ は ふかく なるよ", "", 6);
  });

  document.querySelectorAll(".dpad button").forEach(function (b) {
    var dir = b.getAttribute("data-dir");
    var on = function (e) { e.preventDefault(); input.btn[dir] = true; b.classList.add("on"); try { b.setPointerCapture(e.pointerId); } catch (x) { /* なくても よい */ } };
    var off = function () { input.btn[dir] = false; b.classList.remove("on"); };
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
    b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  });

  cv.addEventListener("pointerdown", function (e) {
    if (S.paused) return;
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY, t0: S.t, ms: performance.now(), moved: false };
    try { cv.setPointerCapture(e.pointerId); } catch (x) { /* なくても よい */ }
  });
  cv.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.px = e.clientX; drag.py = e.clientY;
    if (Math.hypot(drag.px - drag.sx, drag.py - drag.sy) > 14) drag.moved = true;
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var tap = !drag.moved && performance.now() - drag.ms < 400;
    drag = null;
    if (tap && !S.paused) onTap(e.clientX, e.clientY);
  }
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", function () { drag = null; });

  window.addEventListener("keydown", function (e) {
    if (S.paused) { if (e.key === "Escape" && !$("modal").hidden) closeModal(); return; }
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === "l") { setLight(!S.light); return; }
    if (k === "p" || k === " ") { e.preventDefault(); sonar(); return; }
    if (/^Arrow/.test(k) || "wasd".indexOf(k) >= 0) { e.preventDefault(); input.keys[k] = true; }
  });
  window.addEventListener("keyup", function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; input.keys[k] = false; });
  window.addEventListener("blur", clearInput);
  document.addEventListener("visibilitychange", function () { if (document.hidden) { clearInput(); SND.ambient(0, false); } });
  window.addEventListener("resize", function () { resize(); initSnow(); });

  // ---- はじめ ----
  load(); soundBtn(); resize(); initSnow(); updateHud();
  if (save.maxDepth > 0) $("best").innerHTML = rb("いままで の いちばん ふかい きろく: <b>" + Math.round(save.maxDepth).toLocaleString() + "m</b>　ずかん: " + zukanCount() + " / " + D.SPECIES.length);
  requestAnimationFrame(frame);

  // テスト よう（Playwright から つかう）
  window.__shinkai = {
    S: S, save: save, D: D,
    teleport: function (x, y, light) {
      S.sub.x = x; S.sub.y = y; S.sub.vx = S.sub.vy = 0; S.creatures = []; S.dive.hit = {};
      for (var i = 0; i < 60; i++) spawn(true);
      if (light != null) setLight(light);
      updateHud();
    },
    openZukan: openZukan, openMissions: openMissions, showSpecies: function (id) { showSpecies(SP[id], true); },
    tapFirstVisible: function () {
      for (var i = 0; i < S.creatures.length; i++) {
        var p = creatureScreen(S.creatures[i]);
        if (p.x > 0 && p.x < W && p.y > 0 && p.y < H && visAt(p.x, p.y, S.creatures[i].y) >= VIS) { tryPhoto(p.x, p.y); return S.creatures[i].sp.id; }
      }
      return null;
    }
  };
})();
