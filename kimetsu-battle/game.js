/* ============================================================
   きめつバトル — たたかいの しくみ（FF7ふうの ATB）と がめんの そうさ
   - ゲージ（ATB）が たまった みかたから コマンドを えらぶ
   - ダメージを うけると ひっさつゲージ（リミット）が たまる。まんたんで「ひっさつ」が つかえる
   - ウェイト: コマンドを えらんでいる あいだ じかんが とまる（はじめての ひとむけ）
   キャラ・わざ・てき・シーンは data.js、え は draw.js、おと は audio.js
   ============================================================ */
(function (root) {
  "use strict";
  var KB = root.KB, A = KB.audio;
  var $ = function (s) { return document.querySelector(s); };
  var SAVE_KEY = "kimetsu-battle-v1";

  /* ---------- セーブ ---------- */
  var save = { settings: { sfx: true, bgm: true, wait: true, diff: "easy" }, records: {} };
  try { var raw = localStorage.getItem(SAVE_KEY); if (raw) { var d = JSON.parse(raw); if (d && d.settings) save = { settings: Object.assign(save.settings, d.settings), records: d.records || {} }; } } catch (e) { /* むし */ }
  function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }
  A.setSfx(save.settings.sfx); A.setBgm(save.settings.bgm);

  /* ---------- がめんの きりかえ ---------- */
  function show(id) {
    ["title", "select", "battle"].forEach(function (s) { $("#" + s).hidden = s !== id; });
    if (id === "battle") resize();
  }

  /* ---------- キャンバス ---------- */
  // VX0・VW … みせる はんい（たてもちでは りょうはしを すこし きって え を おおきく する）
  var cv = $("#cv"), g = cv.getContext("2d"), W = KB.W, H = KB.H, dpr = 1, VX0 = 0, VW = W;
  function resize() {
    var st = $("#stage"), r = st.getBoundingClientRect();
    var w = r.width, h = r.height;
    if (h > w * 0.6) { VX0 = 70; VW = 540; } else { VX0 = 0; VW = W; }
    if (w / h > VW / H) w = h * VW / H; else h = w * H / VW;
    cv.style.width = Math.floor(w) + "px"; cv.style.height = Math.floor(h) + "px";
    $("#view").style.width = Math.floor(w) + "px"; $("#view").style.height = Math.floor(h) + "px";
    dpr = Math.min(2, root.devicePixelRatio || 1);
    cv.width = Math.round(Math.floor(w) * dpr); cv.height = Math.round(Math.floor(h) * dpr);
  }
  root.addEventListener("resize", resize);
  if (root.ResizeObserver) new ResizeObserver(function () { if (!$("#battle").hidden) resize(); }).observe($("#stage"));

  /* ---------- バトルの じょうたい ---------- */
  var B = null;
  var now = function () { return performance.now() / 1000; };

  function makeActor(id, isEnemy, diff, i) {
    if (isEnemy) {
      var e = KB.ENEMIES[id];
      return { id: id, def: e, enemy: true, name: e.name, look: e.look, maxHp: e.hp[diff], hp: e.hp[diff], atk: e.atk,
        wait: e.wait[diff], atb: 20, x: 165, y: 296, scale: 1.42, ghosts: [], rashinS: 1, ox: 0, oy: 0, flip: false, pose: "idle", swing: 0, flash: 0, alpha: 1,
        phase: 0, dodge: 0, regen: 0, rashin: 0 };
    }
    var c = KB.CHARS[id];
    var homes = [[470, 250], [552, 318], [604, 214]];
    return { id: id, def: c, name: c.name, look: c.look, maxHp: c.hp, hp: c.hp, maxMp: c.mp, mp: c.mp, atk: c.atk, wait: c.wait,
      atb: 40 + i * 25, limit: 0, x: homes[i][0], y: homes[i][1], scale: 1.12, ghosts: [], ox: 0, oy: 0, flip: true, pose: "idle", swing: 0, flash: 0, alpha: 1,
      skills: c.skills.filter(function (s) { return !KB.SKILLS[s].hidden; }), guard: false, sukitooru: 0, kabau: false, down: false };
  }

  function startBattle(scene) {
    var diff = save.settings.diff;
    B = {
      scene: scene, diff: diff, t: 0, startAt: now(), over: false,
      party: scene.party.map(function (id, i) { return makeActor(id, false, diff, i); }),
      enemy: makeActor(scene.enemy, true, diff),
      items: Object.assign({}, scene.items),
      queue: [], ready: [], busy: false, talking: false, paused: false,
      fx: [], parts: [], nums: [], bubble: null, shake: 0, flashScr: 0, hitstop: 0, timeScale: 1, speed: 0, cutin: null,
      cam: { x: 0, y: 0, z: 1 }, tint: { col: "#000", a: 0, mode: null }, nagi: 0, misses: 0, koCount: 0, hintShown: {},
      menu: null
    };
    B.all = B.party.concat([B.enemy]);
    timers = []; tweens = [];
    show("battle");
    renderParty(true);
    closeMenu();
    $("#hint").hidden = true;
    var st = $("#stage"); st.classList.remove("swirl"); void st.offsetWidth; st.classList.add("swirl");
    A.bgm(scene.bgm || "battle");
    B.busy = true;
    sleep(900).then(function () { return talk(scene.intro); }).then(function () { B.busy = false; B.startAt = now(); });
  }

  /* ---------- じかんの どうぐ ----------
     sleep・tween は ゲームの じかんで すすむ（ヒットストップや スローでも ずれない） */
  var timers = [], tweens = [];
  function sleep(ms) { return new Promise(function (r) { timers.push({ t: ms / 1000, res: r }); }); }
  function tween(o, props, ms, ez) {
    return new Promise(function (res) {
      var from = {}; for (var k in props) from[k] = o[k];
      tweens.push({ o: o, from: from, to: props, t: 0, d: Math.max(0.001, ms / 1000), res: res, ez: ez });
    });
  }
  function stepTime(dt) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var w = tweens[i]; w.t += dt; var k = Math.min(1, w.t / w.d);
      var e = w.ez === "out" ? 1 - Math.pow(1 - k, 3) : w.ez === "in" ? k * k * k : (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      for (var p in w.to) w.o[p] = w.from[p] + (w.to[p] - w.from[p]) * e;
      if (k >= 1) { tweens.splice(i, 1); w.res(); }
    }
    for (var j = timers.length - 1; j >= 0; j--) { timers[j].t -= dt; if (timers[j].t <= 0) { var r = timers[j].res; timers.splice(j, 1); r(); } }
  }
  function fx(type, x, y, opt) { var f = Object.assign({ type: type, x: x, y: y, t: 0, life: 0.6 }, opt || {}); B.fx.push(f); return f; }
  // つぶを まく（kind: drop / ember / spark / snow / streak）
  function emit(kind, x, y, n, o) {
    o = o || {};
    for (var i = 0; i < n; i++) {
      var an = (o.angle == null ? -Math.PI / 2 : o.angle) + (Math.random() - 0.5) * (o.spread == null ? Math.PI * 2 : o.spread);
      var sp = (o.speed || 200) * (0.4 + Math.random() * 0.8);
      B.parts.push({ kind: kind, x: x + (Math.random() - 0.5) * (o.jitter || 10), y: y + (Math.random() - 0.5) * (o.jitter || 10),
        vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: o.gravity == null ? 400 : o.gravity, drag: o.drag || 1.5,
        t: 0, life: (o.life || 0.7) * (0.6 + Math.random() * 0.6), size: (o.size || 3) * (0.6 + Math.random() * 0.8),
        color: o.colors ? o.colors[i % o.colors.length] : (o.color || "#fff") });
    }
  }
  var HIT = {
    water: function (x, y) { emit("drop", x, y, 40, { speed: 280, colors: ["#e9f8ff", "#6ac0ff", "#2a7ae0"], size: 3.2, gravity: 500 }); },
    fire: function (x, y) { emit("ember", x, y, 40, { speed: 240, colors: ["#fff3b0", "#ffb040", "#ff5a1a"], size: 3, gravity: -120, life: 0.9 }); },
    slash: function (x, y) { emit("streak", x, y, 10, { speed: 420, color: "#fff", size: 2, gravity: 0, life: 0.3 }); },
    snow: function (x, y) { emit("snow", x, y, 8, { speed: 220, color: "#e6f8ff", size: 5, gravity: 60, life: 0.8 }); emit("streak", x, y, 12, { speed: 480, color: "#8fdcff", size: 2.5, gravity: 0, life: 0.3 }); }
  };
  function num(a, text, color, big) {
    B.nums.push({ x: a.x + a.ox + (a.enemy ? 10 : 0) + (Math.random() - 0.5) * 16, y: a.y + a.oy - (a.enemy ? 150 : 110), text: String(text), color: color || "#fff", t: 0, big: !!big });
  }
  function center(a) { return { x: a.x + a.ox + (a.enemy ? 10 : -4), y: a.y + a.oy - (a.enemy ? 90 : 62) }; }
  // カメラ: px,py の ほうへ よって z ばいに ズーム
  function cam(px, py, z, ms) {
    var vc = W / 2, dx = (px - vc) * 0.7, dy = (py - H / 2) * 0.7, mx = W / 2 - W / (2 * z), my = H / 2 - H / (2 * z);
    dx = Math.max(-mx, Math.min(mx, dx)); dy = Math.max(-my, Math.min(my, dy));
    return tween(B.cam, { x: dx, y: dy, z: z }, ms || 300, "out");
  }
  function camReset(ms) { return tween(B.cam, { x: 0, y: 0, z: 1 }, ms || 350); }
  function hitstop(s) { B.hitstop = Math.max(B.hitstop, s); }
  function slowmo(scale, ms) { B.timeScale = scale; setTimeout(function () { if (B) B.timeScale = 1; }, ms); }
  function tint(col, a, ms, mode) { B.tint.col = col; B.tint.mode = mode || null; return tween(B.tint, { a: a }, ms || 250); }
  // カットイン（かおの アップ＋わざの なまえ）
  function cutin(a, name, sub, big) {
    var cols = { tanjiro: [["#0b3a26", "#1c8f5c"], "#ffe066"], giyu: [["#0a1c4a", "#2f7ae0"], "#bfe4ff"], akaza: [["#2a0a24", "#d9488f"], "#a9dcff"] };
    var c = cols[a.look] || [["#222", "#555"], "#fff"];
    var fire = name.indexOf("ヒノカミ") >= 0 || name.indexOf("れつじつ") >= 0;
    if (fire) c = [["#3a0806", "#e0501e"], "#ffe066"];
    B.cutin = { look: a.look, name: name, sub: sub, color: c[0], textColor: c[1], t: 0, life: big ? 1.5 : 1.0, flip: !a.enemy, st: { mark: a.mark } };
    A.sfx(big ? "cutinBig" : "cutin");
    return sleep(big ? 1450 : 950);
  }

  /* ---------- セリフ ---------- */
  var talkDone = null;
  function talk(lines) {
    if (!lines || !lines.length) return Promise.resolve();
    B.talking = true;
    var i = 0, box = $("#talk");
    return new Promise(function (res) {
      function next() {
        if (i >= lines.length) { box.hidden = true; B.talking = false; talkDone = null; res(); return; }
        var L = lines[i++], sp = L.who && KB.SPEAKERS[L.who];
        box.hidden = false;
        $("#talkWho").textContent = sp ? sp.name : "";
        $("#talkWho").style.color = sp ? sp.color : "";
        $("#talkWho").hidden = !sp;
        $("#talkTxt").textContent = L.text;
        if (L.sfx) A.sfx(L.sfx);
        if (L.fx === "fade" && B) { var e = B.enemy, c = center(e); fx("light", c.x, c.y + 60, { life: 2.6 }); A.sfx("sparkle"); tween(e, { alpha: 0 }, 2200); }
        talkDone = function () { A.sfx("cursor"); next(); };
      }
      next();
    });
  }
  function advanceTalk() { if (talkDone) talkDone(); }
  $("#talk").addEventListener("click", advanceTalk);

  function banner(text, ms) {
    var b = $("#banner"); b.textContent = text; b.hidden = false;
    clearTimeout(banner.tm); banner.tm = setTimeout(function () { b.hidden = true; }, ms || 1300);
  }
  function hint(text) { var h = $("#hint"); h.textContent = text; h.hidden = false; }
  function bubble(text) { B.bubble = { text: text, t: 0, life: 1.8 }; }

  /* ---------- ダメージ ---------- */
  function roll(atk, power) { return Math.max(1, Math.round(atk * power * (0.9 + Math.random() * 0.2))); }
  function addLimit(a, v) {
    if (a.enemy || a.down) return;
    var was = a.limit; a.limit = Math.min(100, a.limit + v);
    if (was < 100 && a.limit >= 100) { A.sfx("limit"); refreshMenu(); }
  }
  function hurtParty(a, dmg) {
    a.hp = Math.max(0, a.hp - dmg); a.flash = 1; num(a, dmg, "#fff", dmg >= 300);
    addLimit(a, dmg / a.maxHp * 110);
    tween(a, { ox: 18 }, 80, "out").then(function () { return tween(a, { ox: 0 }, 200); });
    if (a.hp <= 0) {
      a.down = true; a.pose = "down"; a.atb = 0; a.limit = 0; a.guard = false; a.kabau = false; a.sukitooru = 0; B.koCount++;
      A.sfx("down"); dropReady(a);
    } else { a.pose = "hurt"; sleep(380).then(function () { if (!a.down && a.pose === "hurt") a.pose = "idle"; }); }
  }
  function hurtEnemy(e, dmg, crit) {
    e.hp = Math.max(0, e.hp - dmg); e.flash = 1; num(e, dmg, crit ? "#ffe066" : "#fff", crit || dmg >= 400);
    e.pose = "hurt"; sleep(260).then(function () { if (e.pose === "hurt") e.pose = "idle"; });
    tween(e, { ox: -10 }, 60, "out").then(function () { return tween(e, { ox: 0 }, 160); });
    B.shake = Math.max(B.shake, crit ? 9 : 5);
    checkPhase();
  }
  function checkPhase() {
    var e = B.enemy, ph = e.def.phases || [];
    for (var i = 0; i < ph.length; i++) {
      if (e.phase <= i && e.hp > 0 && e.hp / e.maxHp <= ph[i].at && !B.queue.some(function (q) { return q.kind === "phase" && q.idx === i; })) {
        e.phase = i + 1; B.queue.splice(B.queue.filter(function (q) { return q.kind === "phase"; }).length, 0, { kind: "phase", idx: i });
      }
    }
  }

  /* ---------- みかたの こうげき ----------
     sk.anim で ふりつけと エフェクトが かわる（data.js の わざに かく）
     slash / minamo / wheel / vortex / dragon / waterfall / enbu / firering / renjitsu */
  function oneHit(a, sk, hitNo, hits) {
    var e = B.enemy, c = center(e);
    var sure = sk.sure || a.sukitooru > 0;
    var elem = sk.fx === "water" || sk.fx === "fire" ? sk.fx : "slash";
    if (!sure && Math.random() < e.dodge) {
      A.sfx("miss"); num(e, "かわされた", "#9fe4ff"); B.misses++;
      tween(e, { ox: -34, oy: -6 }, 90, "out").then(function () { return tween(e, { ox: 0, oy: 0 }, 220); });
      emit("snow", c.x - 20, c.y, 4, { speed: 120, color: "#9fe4ff", size: 4, gravity: 0 });
      if (B.misses >= 2 && hasSkill(B.party[0], "sukitooru")) maybeHint(1);
      return false;
    }
    var crit = a.sukitooru > 0 || Math.random() < 0.08;
    var dmg = roll(a.atk, sk.power) * (crit ? 1.5 : 1) | 0;
    HIT[elem](c.x + (Math.random() - 0.5) * 30, c.y + (Math.random() - 0.5) * 30);
    A.sfx(elem === "slash" ? "hit" : elem + "Hit");
    hitstop(crit || hitNo === hits - 1 ? 0.09 : 0.05);
    if (sk !== a.def.attack) B.flashScr = Math.max(B.flashScr, 0.22);
    hurtEnemy(e, dmg, crit);
    return true;
  }
  async function strike(a, sk) {
    var e = B.enemy, c = center(e), hits = sk.hits || 1, anim = sk.anim || "slash";
    var elem = sk.fx === "water" || sk.fx === "fire" ? sk.fx : "slash";
    a.water = elem === "water"; a.fire = elem === "fire";
    var near = { ox: e.x + 100 - a.x, oy: e.y - a.y - 4 };
    var swingTo = async function (ms) { a.pose = "attack"; a.swing = 0; await tween(a, { swing: 1 }, ms || 140); };
    a.trail = sk !== a.def.attack;
    if (anim === "slash") {
      a.pose = "attack"; a.swing = 0;
      await tween(a, near, 210, "out");
      await swingTo(130);
      fx("slash", c.x, c.y, { rot: -0.9 + Math.random() * 1.6, life: 0.32 }); A.sfx("slash");
      oneHit(a, sk, 0, 1);
      await sleep(160);
    } else if (anim === "renjitsu") {
      await renjitsu(a, sk);
    } else {
      cam(c.x + 40, c.y + 10, 1.18, 260);
      if (anim === "waterfall" || anim === "enbu") {
        // とびあがって うえから
        a.pose = "attack"; a.swing = 0;
        await tween(a, { ox: near.ox + 10, oy: near.oy - 150 }, 280, "out");
        A.sfx(elem === "water" ? "water" : "fire");
        fx(anim, c.x, c.y, { life: anim === "waterfall" ? 1.1 : 0.9 });
        await tween(a, { swing: 1, oy: near.oy }, 220, "in");
        B.shake = 12; fx("shock", e.x, e.y, { r: 180, col: elem === "water" ? "#bfe4ff" : "#ffb040", life: 0.6 });
        oneHit(a, sk, 0, 1);
        if (elem === "water") emit("drop", e.x, e.y - 10, 50, { speed: 380, angle: -Math.PI / 2, spread: 2.4, colors: ["#e9f8ff", "#6ac0ff"], size: 3.5, gravity: 700 });
        else emit("ember", e.x, e.y - 40, 50, { speed: 320, colors: ["#fff3b0", "#ffb040", "#ff5a1a"], gravity: -150, life: 1.1 });
        await sleep(380);
      } else if (anim === "dragon") {
        // みずの りゅうが ながれる。たんじろうも いっしょに ながれる ように すすむ
        var ac = center(a);
        fx("dragon", c.x, c.y, { sx: ac.x, sy: ac.y, life: 1.3 }); A.sfx("water");
        tween(a, near, 600, "out");
        for (var h = 0; h < hits; h++) {
          await sleep(h ? 200 : 520);
          await swingTo(110);
          fx("water", c.x + (Math.random() - 0.5) * 20, c.y + (Math.random() - 0.5) * 20, { rot: -1 + h, life: 0.5, r: 44 });
          oneHit(a, sk, h, hits); if (e.hp <= 0) break;
        }
        await sleep(250);
      } else {
        a.pose = "attack"; a.swing = 0;
        await tween(a, near, 220, "out");
        var big = { minamo: "minamo", wheel: "wheel", vortex: "vortex", firering: "firering" }[anim];
        if (big) fx(big, c.x, c.y, { life: anim === "vortex" || anim === "firering" ? 1.3 : 0.8 });
        A.sfx(elem === "fire" ? "fire" : "water");
        for (var k = 0; k < hits; k++) {
          await swingTo(hits > 1 ? 120 : 170);
          if (hits > 1) fx(elem, c.x + (Math.random() - 0.5) * 30, c.y + (Math.random() - 0.5) * 30, { rot: Math.random() * 6, life: 0.45, r: 40, w: 14 });
          oneHit(a, sk, k, hits);
          if (e.hp <= 0) break;
          await sleep(hits > 1 ? 150 : 200);
        }
        await sleep(200);
      }
      camReset(300);
    }
    a.trail = false;
    await tween(a, { ox: 0, oy: 0 }, 240);
    a.pose = "idle"; a.swing = 0; a.water = a.fire = false;
  }
  // ひっさつ: ヒノカミかぐら・れつじつこうきょう（たいようを せおって 5れんげき → ばってんぎり）
  async function renjitsu(a, sk) {
    var e = B.enemy, c = center(e);
    tint("#1a0200", 0.55, 300);
    fx("sun", c.x + 10, c.y - 10, { life: 2.6, under: true });
    B.speed = 1;
    cam(c.x, c.y, 1.3, 400);
    var spots = [[90, -10], [-70, -30], [70, 30], [-80, 20], [10, -80]];
    for (var h = 0; h < 5; h++) {
      var sp = spots[h];
      a.flip = sp[0] > 0;
      await tween(a, { ox: e.x + sp[0] - a.x, oy: e.y + sp[1] - a.y + 10 }, 90, "out");
      a.pose = "attack"; a.swing = 0; await tween(a, { swing: 1 }, 90);
      fx("fire", c.x, c.y, { rot: h * 1.3, life: 0.5, r: 58, w: 26 }); A.sfx("fire");
      oneHit(a, sk, h, 5);
      await sleep(110);
    }
    // しめの ばってんぎり
    a.flip = true;
    await tween(a, { ox: e.x + 120 - a.x, oy: e.y - a.y }, 140, "out");
    slowmo(0.35, 700);
    fx("cross", c.x, c.y, { life: 0.9 }); A.sfx("big"); B.flashScr = 0.9; B.shake = 16;
    emit("ember", c.x, c.y, 80, { speed: 420, colors: ["#fff3b0", "#ffb040", "#ff5a1a"], gravity: -100, life: 1.4, size: 3.5 });
    var dmg = roll(a.atk, sk.power * 1.4); hurtEnemy(e, dmg, true); hitstop(0.18);
    await sleep(700);
    B.speed = 0; tint("#1a0200", 0, 400); camReset(400);
  }
  // 「みずのこきゅう・いちのかた みなもぎり」→ [みなもぎり, みずのこきゅう・いちのかた]
  function splitName(name) {
    var i = name.lastIndexOf(" ");
    if (i > 0 && name.slice(0, i).indexOf("・") >= 0) return [name.slice(i + 1), name.slice(0, i)];
    var j = name.lastIndexOf("・");
    if (j > 0) return [name.slice(j + 1), name.slice(0, j)];
    return [name, ""];
  }
  function hasSkill(a, id) { return a && a.skills.indexOf(id) >= 0; }
  function maybeHint(i) { var ph = B.enemy.def.phases[i - 1]; if (ph && ph.hint) { B.hintShown[i] = true; hint(ph.hint); } }

  async function partyAct(q) {
    var a = q.actor; if (a.down) return;
    var justCast = false;
    a.guard = false;
    if (a.kabau) a.kabau = false;
    if (q.kind === "attack") {
      await strike(a, a.def.attack);
    } else if (q.kind === "skill" || q.kind === "limit") {
      var sk = KB.SKILLS[q.id];
      if (q.kind === "limit") a.limit = 0; else a.mp -= sk.mp;
      var nm = splitName(sk.name), main = nm[0], sub = nm[1];
      banner(sk.name, 1800);
      if (sk.type === "attack" || sk.type === "nagi" || sk.type === "buff") await cutin(a, main, sub, q.kind === "limit");
      else await sleep(300);
      if (sk.type === "attack") {
        if (q.kind === "limit") a.glow = "#ffb340";
        await strike(a, sk); a.glow = null;
      } else if (sk.type === "buff") {
        // すきとおる せかい: がめんの いろが ぬけて、すきとおった せんが みえる
        a.pose = "cast"; var c = center(a);
        tint("#808080", 0.85, 200, "saturation");
        fx("clear", c.x, c.y, { life: 1.6 }); A.sfx("buff");
        await sleep(1100); tint("#808080", 0, 500, "saturation");
        a.sukitooru = sk.turns; justCast = true; a.pose = "idle";
        num(a, "すきとおる せかい", "#e8fbff");
      } else if (sk.type === "cover") {
        a.pose = "guard"; A.sfx("guard"); a.kabau = true; num(a, "かばう", "#9cc4ff");
        fx("shock", a.x, a.y, { r: 60, col: "#9cc4ff", life: 0.5 }); await sleep(700); a.pose = "idle";
      } else if (sk.type === "nagi") {
        // なぎ: すべてが しずまる
        a.pose = "cast"; A.sfx("nagi");
        slowmo(0.5, 1200);
        tint("#0a2a5a", 0.4, 400);
        fx("nagi", (B.party[0].x + B.party[B.party.length - 1].x) / 2, B.party[0].y + 30, { life: 2.4, under: true }); a.water = true; cam(a.x, a.y - 60, 1.2, 400);
        B.party.forEach(function (p) { if (!p.down) fx("nagi", p.x, p.y, { life: 1.8 }); });
        emit("drop", a.x, a.y - 60, 30, { speed: 60, colors: ["#e9f8ff", "#9cc4ff"], gravity: -30, life: 1.6, size: 2.4 });
        B.nagi = sk.turns; await sleep(1400); a.pose = "idle"; a.water = false; camReset(400);
        num(a, "なぎ", "#bfe4ff");
      }
    } else if (q.kind === "item") {
      var it = KB.ITEMS[q.id], tg = q.target; B.items[q.id]--;
      banner(it.name, 1100); await sleep(300);
      var cc = center(tg);
      if (it.revive) {
        if (tg.down) { tg.down = false; tg.pose = "idle"; tg.hp = Math.round(tg.maxHp * it.revive); tg.atb = 0; fx("heal", cc.x, cc.y, { life: 1.1 }); A.sfx("heal"); num(tg, tg.hp, "#7dff9a"); }
      } else if (it.heal) {
        var hv = Math.min(it.heal, tg.maxHp - tg.hp); tg.hp += hv; fx("heal", cc.x, cc.y, { life: 1.1 }); A.sfx("heal"); num(tg, hv, "#7dff9a");
      } else if (it.mp) {
        var mv = Math.min(it.mp, tg.maxMp - tg.mp); tg.mp += mv; fx("mp", cc.x, cc.y, { life: 1.1 }); A.sfx("heal"); num(tg, mv + " MP", "#9dd4ff");
      }
      await sleep(700);
    } else if (q.kind === "guard") {
      a.guard = true; a.pose = "guard"; A.sfx("guard"); a.mp = Math.min(a.maxMp, a.mp + 8); num(a, "ぼうぎょ", "#ffd27a"); await sleep(500);
    }
    addLimit(a, 3);
    if (a.sukitooru > 0 && !justCast) a.sukitooru--;
    a.atb = 0;
    if (q.kind !== "guard" && !a.down) a.pose = "idle";
  }

  /* ---------- てきの こうどう ---------- */
  function pickTarget() {
    var alive = B.party.filter(function (p) { return !p.down; });
    var t = alive[Math.floor(Math.random() * alive.length)];
    var coverer = alive.filter(function (p) { return p.kabau; })[0];
    if (coverer && t !== coverer) { num(coverer, "かばう！", "#9cc4ff"); return { t: coverer, cover: true }; }
    return { t: t, cover: false };
  }
  // 1かいぶんの こうげきを みかたに あてる（なぎ・ぼうぎょ・すきとおる を ここで しらべる）
  async function hitParty(e, a, mv, cover) {
    var ac = center(a);
    if (B.nagi > 0) {
      A.sfx("nagi"); num(a, "なぎ！", "#bfe4ff"); fx("nagi", a.x, a.y, { life: 0.9 });
      var gy = B.party.filter(function (p) { return p.id === "giyu" && !p.down; })[0];
      if (gy) { await sleep(150); var c = center(e); fx("water", c.x, c.y, { rot: Math.random() - 0.5, life: 0.5 }); A.sfx("waterHit"); HIT.water(c.x, c.y); hurtEnemy(e, roll(gy.atk, 2.4), false); }
      return;
    }
    if (a.sukitooru > 0 && Math.random() < 0.6) { A.sfx("miss"); num(a, "みきった！", "#e8fbff"); tween(a, { oy: -30 }, 110, "out").then(function () { return tween(a, { oy: 0 }, 180); }); return; }
    var dmg = roll(e.atk, mv.power) * (B.diff === "easy" ? 0.55 : 1);
    if (a.guard) dmg *= 0.5;
    if (cover) dmg *= 0.5;
    HIT.snow(ac.x, ac.y);
    A.sfx(mv.fx === "bigpunch" || mv.fx === "shuushiki" ? "big" : "punch");
    hitstop(mv.fx === "bigpunch" ? 0.14 : 0.05);
    hurtParty(a, Math.max(1, Math.round(dmg)));
    B.shake = Math.max(B.shake, mv.fx === "bigpunch" || mv.fx === "shuushiki" ? 14 : 6);
  }
  async function enemyAct() {
    var e = B.enemy, def = e.def;
    if (!B.party.some(function (p) { return !p.down; })) return;
    var mvId = def.ai(B, e), mv = def.moves[mvId];
    banner(mv.name, 1500);
    if (Math.random() < 0.25 && mv.type !== "charge") bubble(def.taunts[Math.floor(Math.random() * def.taunts.length)]);
    if (mv.cutin) { var mn = splitName(mv.name); await cutin(e, mn[0], mn[1], mv.type === "all"); }
    else await sleep(320);
    var ec = center(e);
    if (mv.type === "charge") {
      // ちからを ためる: らしんが おおきく ひかり、オーラが たちのぼる
      e.pose = "cast"; e.glow = "#7fd8ff"; A.sfx("charge"); B.flashScr = 0.25;
      fx("aura", e.x, e.y - 20, { life: 1.4 }); tween(e, { rashinS: 1.6 }, 900);
      emit("snow", e.x, e.y - 40, 16, { speed: 120, color: "#bfe8ff", size: 5, gravity: -60, life: 1.3, jitter: 60 });
      await sleep(1300);
      maybeHint(2);
    } else if (mv.type === "all") {
      // しゅうしき: よぞらの ような あおい ひかりが ふりそそぐ
      tint("#020818", 0.6, 300);
      e.pose = "cast"; A.sfx("charge"); await sleep(600);
      e.pose = "attack"; e.swing = 0; tween(e, { swing: 1 }, 300);
      fx("shuushiki", 0, 0, { life: 1.6 }); A.sfx("shuushiki"); B.flashScr = 0.5;
      cam(480, 230, 1.1, 300);
      await sleep(600);
      for (var i = 0; i < B.party.length; i++) {
        var p = B.party[i]; if (p.down) continue;
        var pc = center(p); fx("bigburst", pc.x, pc.y, { life: 0.7 });
        await hitParty(e, p, mv, false); await sleep(160);
      }
      await sleep(600); e.glow = null; e.rashinS = 1;
      tint("#020818", 0, 400); camReset(400);
    } else {
      var pt = pickTarget(), a = pt.t, ac = center(a);
      if (mv.fx === "airpunch") {
        // くうしき: その ばで こぶしを ふると、こぶしの かたまりが とんでいく
        for (var s = 0; s < 3; s++) {
          e.pose = "attack"; e.swing = 0; await tween(e, { swing: 1 }, 90);
          fx("airpunch", ac.x + (s - 1) * 12, ac.y + (s - 1) * 14, { sx: ec.x + 50, sy: ec.y - 10 + s * 8, life: 0.45 }); A.sfx("whoosh");
          await sleep(70);
        }
        await sleep(200);
        fx("punch", ac.x, ac.y, { life: 0.45 }); await hitParty(e, a, mv, pt.cover);
      } else {
        // ちかよって なぐる・ける
        e.trail = true;
        await tween(e, { ox: a.x - 120 - e.x, oy: a.y - e.y }, mv.fx === "bigpunch" ? 160 : 230, "out");
        if (mv.fx === "bigpunch") { cam(ac.x - 30, ac.y, 1.25, 200); slowmo(0.4, 500); }
        for (var h = 0; h < (mv.hits || 1); h++) {
          e.pose = mv.fx === "kick" ? "kick" : "attack"; e.swing = 0;
          await tween(e, { swing: 1 }, mv.hits > 1 ? 100 : 200);
          var hx = ac.x - 10, hy = ac.y + (Math.random() * 24 - 12);
          if (mv.fx === "kick") { fx("pillar", ac.x, a.y, { life: 0.7 }); tween(a, { oy: -50 }, 160, "out").then(function () { return tween(a, { oy: 0 }, 220, "in"); }); }
          else if (mv.fx === "bigpunch") { fx("bigburst", hx, hy, { life: 0.9 }); B.flashScr = 0.6; emit("snow", hx, hy, 18, { speed: 320, color: "#e6f8ff", size: 6, gravity: 40, life: 1 }); }
          else fx("punch", hx, hy, { life: 0.4, rot: Math.random() });
          await hitParty(e, a, mv, pt.cover);
          if (a.down) break;
        }
        await sleep(160);
        if (mv.fx === "bigpunch") camReset(300);
        await tween(e, { ox: 0, oy: 0 }, 260);
        e.trail = false;
      }
    }
    if (mv.type !== "charge") { e.pose = "idle"; e.swing = 0; if (B.nagi > 0) { B.nagi--; if (!B.nagi) tint("#0a2a5a", 0, 600); } }
    if (e.regen && e.hp > 0) { var rv = Math.min(e.regen, e.maxHp - e.hp); if (rv > 0) { e.hp += rv; num(e, "+" + rv, "#7dff9a"); emit("snow", e.x, e.y - 60, 6, { speed: 60, color: "#9dffb0", size: 4, gravity: -40, life: 1 }); } }
    e.atb = 0;
  }

  async function phaseEvent(i) {
    var e = B.enemy, ph = e.def.phases[i];
    closeMenu();
    await talk(ph.say);
    if (ph.dodge != null) e.dodge = ph.dodge;
    if (ph.regen != null) e.regen = ph.regen;
    if (ph.rashin) e.rashin = 1;
    if (ph.mark) ph.mark.forEach(function (pid) { B.party.forEach(function (p) { if (p.id === pid) { p.mark = true; var c = center(p); fx("clear", c.x, c.y, { life: 1 }); } }); });
    if (ph.unlock) Object.keys(ph.unlock).forEach(function (pid) {
      var p = B.party.filter(function (x) { return x.id === pid; })[0];
      if (p) ph.unlock[pid].forEach(function (s) { if (p.skills.indexOf(s) < 0) p.skills.push(s); });
    });
    if (ph.bgm) A.bgm(ph.bgm);
    if (ph.hint) hint(ph.hint);
  }

  async function defeatEvent() {
    B.over = true; B.queue = []; B.ready = []; closeMenu();
    var e = B.enemy; e.pose = "hurt"; B.flashScr = 1; A.sfx("big");
    await sleep(900); e.pose = "idle";
    A.stopBgm();
    await talk(e.def.defeat);
    await sleep(400);
    win();
  }

  /* ---------- じゅんばん ---------- */
  async function runQueue() {
    if (B.busy || B.talking || B.paused || B.over) return;
    var q = B.queue.shift(); if (!q) return;
    B.busy = true;
    try {
      if (q.kind === "phase") await phaseEvent(q.idx);
      else if (q.actor && q.actor.enemy) await enemyAct();
      else await partyAct(q);
    } catch (err) { console.error(err); }
    B.busy = false;
    if (B.over) return;
    if (B.enemy.hp <= 0) { defeatEvent(); return; }
    if (!B.party.some(function (p) { return !p.down; })) { lose(); return; }
    renderParty();
  }
  function dropReady(a) {
    B.ready = B.ready.filter(function (x) { return x !== a; });
    B.queue = B.queue.filter(function (q) { return q.actor !== a; });
    if (B.menu && B.menu.actor === a) closeMenu();
    openMenuIfReady();
  }
  function queued(a) { return B.queue.some(function (q) { return q.actor === a; }); }

  /* ---------- まいフレーム ---------- */
  var last = now();
  function frame() {
    var t = now(), raw = Math.min(0.05, t - last); last = t;
    if (B && !$("#battle").hidden) {
      // ヒットストップ中は とまる。スローモーションは timeScale
      var dt = raw * (B.timeScale || 1);
      if (B.hitstop > 0) { B.hitstop -= raw; dt = 0; }
      stepTime(dt);
      update(dt, raw);
      render();
    }
    requestAnimationFrame(frame);
  }
  function update(dt, raw) {
    B.t += dt;
    if (B.cutin) { B.cutin.t += raw; if (B.cutin.t >= B.cutin.life) B.cutin = null; }
    B.all.forEach(function (a) {
      a.flash = Math.max(0, a.flash - dt * 4);
      // ざんぞう（すばやく うごく ときの のこりかげ）
      if (a.trail && dt > 0) { a.ghosts.push({ x: a.x + a.ox, y: a.y + a.oy, pose: a.pose, swing: a.swing, flip: a.flip, t: 0 }); }
      a.ghosts.forEach(function (gh) { gh.t += dt; }); a.ghosts = a.ghosts.filter(function (gh) { return gh.t < 0.18; });
    });
    B.fx.forEach(function (f) { f.t += dt; }); B.fx = B.fx.filter(function (f) { return f.t < f.life; });
    B.parts.forEach(function (p) { p.t += dt; p.vy += p.g * dt; var d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; p.x += p.vx * dt; p.y += p.vy * dt; });
    B.parts = B.parts.filter(function (p) { return p.t < p.life; });
    if (B.parts.length > 600) B.parts.splice(0, B.parts.length - 600);
    B.nums.forEach(function (n) { n.t += raw; }); B.nums = B.nums.filter(function (n) { return n.t < 1.1; });
    if (B.bubble) { B.bubble.t += raw; if (B.bubble.t > B.bubble.life) B.bubble = null; }
    B.shake = Math.max(0, B.shake - raw * 30); B.flashScr = Math.max(0, B.flashScr - raw * 2);
    if (B.over) return;
    var stop = B.busy || B.talking || B.paused || (save.settings.wait && B.menu);
    if (!stop) {
      B.all.forEach(function (a) {
        if (a.down || a.hp <= 0 || queued(a) || B.ready.indexOf(a) >= 0) return;
        a.atb = Math.min(100, a.atb + raw * 100 / a.wait);
        if (a.atb >= 100) {
          if (a.enemy) B.queue.push({ actor: a });
          else { B.ready.push(a); A.sfx("ready"); openMenuIfReady(); }
        }
      });
    }
    runQueue();
    renderParty();
  }

  function charState(a, extra) {
    return Object.assign({ t: B.t, pose: a.pose, swing: a.swing, scale: a.scale, flip: a.flip, mark: a.mark, water: a.water, fire: a.fire }, extra || {});
  }
  function render() {
    var sc = cv.width / VW;
    g.setTransform(sc, 0, 0, cv.height / H, -VX0 * sc, 0);
    var sx = B.shake ? (Math.random() - 0.5) * B.shake : 0, sy = B.shake ? (Math.random() - 0.5) * B.shake : 0;
    g.save();
    // カメラ
    var cm = B.cam, vcx = VX0 + VW / 2;
    g.translate(vcx + sx, H / 2 + sy); g.scale(cm.z, cm.z); g.translate(-(vcx + cm.x), -(H / 2 + cm.y));
    KB.drawBg(g, B.scene.bg, B.t);
    var e = B.enemy;
    if (e.rashin && e.alpha > 0) {
      g.save(); g.translate(e.x + e.ox, e.y + e.oy); g.scale(e.rashinS || 1, e.rashinS || 1);
      KB.drawRashin(g, 0, 0, B.t, 0.75 * e.alpha); g.restore();
    }
    if (B.tint.a > 0 && !B.tint.mode) KB.drawTint(g, -200, W + 400, B.tint.col, B.tint.a);
    B.fx.forEach(function (f) { if (f.under) KB.drawFx(g, f); });
    // おくに いる ものから かく
    var order = B.all.slice().sort(function (p, q) { return (p.y + p.oy) - (q.y + q.oy); });
    order.forEach(function (a) {
      a.ghosts.forEach(function (gh, i) {
        KB.drawChar(g, a.look, gh.x, gh.y, charState(a, { pose: gh.pose, swing: gh.swing, flip: gh.flip, alpha: 0.25 * (1 - gh.t / 0.18) * a.alpha, glow: a.enemy ? "#7fd8ff" : (a.fire ? "#ff7a2a" : "#5ab4ff") }));
        void i;
      });
      var glow = a.glow || (a.sukitooru > 0 ? "#e8fbff" : null) || (!a.enemy && a.limit >= 100 ? "#ffb340" : null);
      var alpha = a.alpha * (a.sukitooru > 0 ? 0.72 + Math.sin(B.t * 6) * 0.15 : 1);
      KB.drawChar(g, a.look, a.x + a.ox, a.y + a.oy, charState(a, { flash: a.flash, alpha: alpha, glow: glow }));
      if (a.guard && !a.down) { g.save(); g.globalAlpha = 0.4; g.strokeStyle = "#ffd27a"; g.lineWidth = 3; g.beginPath(); g.arc(a.x + a.ox - 22, a.y - 62, 40, 2, 4.3); g.stroke(); g.restore(); }
      // コマンドを えらんでいる キャラに ゆびさし
      if (B.menu && B.menu.actor === a) {
        var by = a.y - 150 + Math.sin(B.t * 8) * 3;
        g.fillStyle = "#ffe066"; g.beginPath(); g.moveTo(a.x - 9, by); g.lineTo(a.x + 9, by); g.lineTo(a.x, by + 11); g.closePath(); g.fill();
      }
    });
    if (B.nagi > 0) B.party.forEach(function (p) { if (!p.down) { g.save(); g.globalAlpha = 0.5 + Math.sin(B.t * 3) * 0.2; g.translate(p.x, p.y); g.scale(1, 0.28); g.strokeStyle = "#d8f0ff"; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 44 + Math.sin(B.t * 2) * 4, 0, Math.PI * 2); g.stroke(); g.restore(); } });
    B.fx.forEach(function (f) { if (!f.under) KB.drawFx(g, f); });
    KB.drawParts(g, B.parts);
    // ダメージの すうじ
    B.nums.forEach(function (n) {
      var k = n.t, y = n.y - (k < 0.25 ? Math.sin(k / 0.25 * Math.PI) * 16 : 0) - k * 10;
      var s = n.big ? (k < 0.12 ? 1.8 - k / 0.12 * 0.8 : 1) : 1;
      g.save(); g.globalAlpha = k > 0.85 ? (1.1 - k) / 0.25 : 1;
      g.translate(n.x, y); g.scale(s, s);
      g.font = "900 " + (n.big ? 28 : 21) + "px system-ui, sans-serif"; g.textAlign = "center";
      g.lineWidth = 5; g.strokeStyle = "#000"; g.strokeText(n.text, 0, 0); g.fillStyle = n.color; g.fillText(n.text, 0, 0);
      g.restore();
    });
    // アカザの ふきだし
    if (B.bubble && e.alpha > 0.5) {
      var bx = e.x + e.ox + 40, byy = e.y - 225;
      g.save(); g.font = "bold 15px system-ui, sans-serif"; var w = g.measureText(B.bubble.text).width + 20;
      g.fillStyle = "rgba(255,255,255,.95)"; g.strokeStyle = "#5a1438"; g.lineWidth = 2;
      g.beginPath(); if (g.roundRect) g.roundRect(bx - 10, byy - 20, w, 30, 10); else g.rect(bx - 10, byy - 20, w, 30); g.fill(); g.stroke();
      g.fillStyle = "#5a1438"; g.fillText(B.bubble.text, bx, byy); g.restore();
    }
    g.restore();
    // がめん ぜんたい（カメラの そと）
    if (B.tint.a > 0 && B.tint.mode) KB.drawTint(g, VX0, VW, B.tint.col, B.tint.a, B.tint.mode);
    if (B.speed > 0) KB.drawSpeedLines(g, VX0 + VW / 2, H / 2, 0.5 * B.speed, B.t);
    if (B.cutin) KB.drawCutin(g, B.cutin, VX0, VW);
    if (B.flashScr > 0) { g.fillStyle = "rgba(255,255,255," + Math.min(0.85, B.flashScr) + ")"; g.fillRect(VX0, 0, VW, H); }
  }

  /* ---------- したの まど（なかまの じょうたい） ---------- */
  var rows = [];
  function renderParty(rebuild) {
    var box = $("#party");
    if (rebuild) {
      box.innerHTML = "";
      rows = B.party.map(function (a) {
        var r = document.createElement("div"); r.className = "prow";
        r.innerHTML = '<span class="pname"></span>' +
          '<span class="pnum"><b class="hp"></b><small>/<i class="mhp"></i></small></span>' +
          '<span class="pmp">MP <b class="mp"></b></span>' +
          '<span class="bars"><span class="bar hpbar"><i></i></span><span class="bar lim"><i></i></span><span class="bar atb"><i></i></span></span>';
        r.querySelector(".pname").textContent = a.name; r.querySelector(".mhp").textContent = a.maxHp;
        r.querySelector(".pname").style.color = a.def.color;
        box.appendChild(r);
        return { a: a, el: r, hp: r.querySelector(".hp"), mp: r.querySelector(".mp"), hpb: r.querySelector(".hpbar i"), lim: r.querySelector(".lim i"), atb: r.querySelector(".atb i"), cache: {} };
      });
    }
    rows.forEach(function (r) {
      var a = r.a, c = r.cache;
      if (c.hp !== a.hp) { c.hp = a.hp; r.hp.textContent = a.hp; r.hpb.style.width = (a.hp / a.maxHp * 100) + "%"; r.el.classList.toggle("low", a.hp > 0 && a.hp < a.maxHp * 0.25); }
      if (c.mp !== a.mp) { c.mp = a.mp; r.mp.textContent = a.mp; }
      var lim = Math.round(a.limit); if (c.lim !== lim) { c.lim = lim; r.lim.style.width = lim + "%"; r.el.classList.toggle("limfull", lim >= 100); }
      var atb = Math.round(a.atb); if (c.atb !== atb) { c.atb = atb; r.atb.style.width = atb + "%"; r.el.classList.toggle("atbfull", atb >= 100); }
      var dn = a.down; if (c.down !== dn) { c.down = dn; r.el.classList.toggle("down", dn); }
      var act = !!(B.menu && B.menu.actor === a); if (c.act !== act) { c.act = act; r.el.classList.toggle("active", act); }
    });
    var e = B.enemy, eh = $("#ehp");
    if (eh.dataset.v !== String(e.hp)) { eh.dataset.v = e.hp; $("#ehpBar").style.width = (e.hp / e.maxHp * 100) + "%"; $("#ename").textContent = e.def.title + "・" + e.name; }
  }

  /* ---------- コマンドの まど ---------- */
  var cmd = $("#cmd");
  function openMenuIfReady() {
    if (!B || B.menu || B.over) return;
    B.ready = B.ready.filter(function (a) { return !a.down; });
    if (!B.ready.length) return;
    B.menu = { actor: B.ready[0], level: "root" };
    drawMenu();
  }
  function closeMenu() { if (B) B.menu = null; cmd.innerHTML = ""; cmd.classList.remove("open"); }
  function refreshMenu() { if (B && B.menu && B.menu.level === "root") drawMenu(); }
  function choose(q) {
    var a = B.menu.actor; q.actor = a;
    B.ready = B.ready.filter(function (x) { return x !== a; });
    B.queue.push(q); A.sfx("ok");
    closeMenu(); openMenuIfReady();
  }
  function btn(label, sub, onClick, disabled, cls) {
    var b = document.createElement("button"); b.type = "button"; b.className = "cbtn" + (cls ? " " + cls : "");
    b.innerHTML = '<span class="cl"></span>' + (sub != null ? '<span class="cs"></span>' : "");
    b.querySelector(".cl").textContent = label; if (sub != null) b.querySelector(".cs").textContent = sub;
    b.disabled = !!disabled;
    b.addEventListener("click", function () { if (!b.disabled) onClick(); });
    return b;
  }
  function drawMenu() {
    var m = B.menu; if (!m) return;
    var a = m.actor;
    cmd.innerHTML = ""; cmd.classList.add("open");
    var head = document.createElement("div"); head.className = "chead";
    head.textContent = a.name;
    head.style.color = a.def.color;
    if (B.ready.length > 1 && m.level === "root") {
      var sw = document.createElement("button"); sw.type = "button"; sw.className = "swap"; sw.textContent = "⇄ こうたい";
      sw.addEventListener("click", function () { B.ready.push(B.ready.shift()); A.sfx("cursor"); B.menu = null; openMenuIfReady(); });
      head.appendChild(sw);
    }
    cmd.appendChild(head);
    var list = document.createElement("div"); list.className = "clist " + m.level; cmd.appendChild(list);
    if (m.level === "root") {
      if (a.limit >= 100) {
        var lk = KB.SKILLS[a.def.limit];
        list.appendChild(btn("ひっさつ", lk.short, function () { choose({ kind: "limit", id: a.def.limit }); }, false, "limit"));
      } else list.appendChild(btn("たたかう", null, function () { choose({ kind: "attack" }); }));
      list.appendChild(btn("わざ", null, function () { A.sfx("cursor"); m.level = "skill"; drawMenu(); }));
      list.appendChild(btn("どうぐ", null, function () { A.sfx("cursor"); m.level = "item"; drawMenu(); }));
      list.appendChild(btn("ぼうぎょ", null, function () { choose({ kind: "guard" }); }));
    } else if (m.level === "skill") {
      a.skills.forEach(function (id) {
        var s = KB.SKILLS[id];
        var b = btn(s.short, s.mp + " MP", function () { choose({ kind: "skill", id: id }); }, a.mp < s.mp, id === "sukitooru" ? "new" : "");
        b.title = s.desc; list.appendChild(b);
      });
      list.appendChild(btn("もどる", null, back, false, "back"));
    } else if (m.level === "item") {
      Object.keys(B.items).forEach(function (id) {
        var it = KB.ITEMS[id], n = B.items[id];
        var b = btn(it.emoji + " " + it.name, "×" + n, function () { A.sfx("cursor"); m.level = "target"; m.item = id; drawMenu(); }, n <= 0);
        b.title = it.desc; list.appendChild(b);
      });
      list.appendChild(btn("もどる", null, back, false, "back"));
    } else if (m.level === "target") {
      var item = KB.ITEMS[m.item];
      var tip = document.createElement("p"); tip.className = "ctip"; tip.textContent = item.desc + "。だれに つかう？"; list.appendChild(tip);
      B.party.forEach(function (p) {
        var ok = item.revive ? p.down : (!p.down && (item.heal ? p.hp < p.maxHp : p.mp < p.maxMp));
        list.appendChild(btn(p.name, item.mp ? ("MP " + p.mp) : ("HP " + p.hp), function () { choose({ kind: "item", id: m.item, target: p }); }, !ok));
      });
      list.appendChild(btn("もどる", null, function () { A.sfx("back"); m.level = "item"; drawMenu(); }, false, "back"));
    }
    var first = list.querySelector("button:not(:disabled)"); if (first) first.classList.add("sel");
  }
  function back() { A.sfx("back"); B.menu.level = "root"; drawMenu(); }

  /* ---------- キーボード ---------- */
  document.addEventListener("keydown", function (ev) {
    var k = ev.key;
    if (!$("#battle").hidden && B) {
      if (B.talking && (k === "Enter" || k === " " || k === "z" || k === "Z")) { ev.preventDefault(); advanceTalk(); return; }
      if (!B.menu) return;
      var bs = Array.prototype.slice.call(cmd.querySelectorAll(".clist button:not(:disabled)"));
      var cur = bs.indexOf(cmd.querySelector(".clist button.sel"));
      if (k === "ArrowDown" || k === "ArrowRight" || k === "s" || k === "d") { ev.preventDefault(); move(bs, cur, 1); }
      else if (k === "ArrowUp" || k === "ArrowLeft" || k === "w" || k === "a") { ev.preventDefault(); move(bs, cur, -1); }
      else if (k === "Enter" || k === " " || k === "z" || k === "Z") { ev.preventDefault(); if (bs[cur]) bs[cur].click(); }
      else if (k === "Escape" || k === "x" || k === "X") { ev.preventDefault(); if (B.menu.level === "target") { B.menu.level = "item"; A.sfx("back"); drawMenu(); } else if (B.menu.level !== "root") back(); }
    }
  });
  function move(bs, cur, d) {
    if (!bs.length) return;
    if (cur >= 0) bs[cur].classList.remove("sel");
    var n = (cur + d + bs.length) % bs.length; bs[n].classList.add("sel"); A.sfx("cursor");
  }

  /* ---------- かち・まけ ---------- */
  function fmt(sec) { var m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m + "ふん " + s + "びょう"; }
  function win() {
    A.bgm("win");
    var sec = now() - B.startAt, stars = 1;
    if (B.koCount === 0) stars++;
    if (B.koCount === 0 && sec < 240) stars++;
    var rec = save.records[B.scene.id] = save.records[B.scene.id] || {};
    var old = rec[B.diff];
    if (!old || stars > old.stars || (stars === old.stars && sec < old.time)) rec[B.diff] = { stars: stars, time: Math.round(sec) };
    store();
    result("しょうり！",
      "じかん：" + fmt(sec) + "<br>たおれた かず：" + B.koCount + "<br><span class='stars'>" + "★".repeat(stars) + "☆".repeat(3 - stars) + "</span>" +
      "<br><small>★ かつ ／ ★★ だれも たおれない ／ ★★★ そのうえ 4ふん いない</small>", true);
  }
  function lose() {
    B.over = true; closeMenu(); A.stopBgm(); A.sfx("down");
    result("ぜんめつ…", "でも だいじょうぶ！ もういちど いどもう。<br><small>ヒント：HP が へったら「どうぐ」の きずぐすり。<br>アカザが ちからを ためたら「ぼうぎょ」！<br>むずかしいときは「やさしい」で あそんでね。</small>", false);
  }
  function result(title, html, won) {
    var o = $("#overlay"); o.hidden = false;
    $("#ovTitle").textContent = title; $("#ovTitle").className = won ? "won" : "lost";
    $("#ovBody").innerHTML = html;
    $("#ovBtns").innerHTML = "";
    var r = document.createElement("button"); r.type = "button"; r.textContent = "もういちど";
    r.addEventListener("click", function () { A.sfx("ok"); o.hidden = true; startBattle(B.scene); });
    var s = document.createElement("button"); s.type = "button"; s.textContent = "たたかいを えらぶ";
    s.addEventListener("click", function () { A.sfx("ok"); o.hidden = true; A.stopBgm(); buildSelect(); show("select"); });
    $("#ovBtns").appendChild(r); $("#ovBtns").appendChild(s);
  }

  /* ---------- ポーズ ---------- */
  $("#pauseBtn").addEventListener("click", function () {
    if (!B || B.over) return;
    B.paused = true; A.sfx("cursor");
    var o = $("#overlay"); o.hidden = false;
    $("#ovTitle").textContent = "ひとやすみ"; $("#ovTitle").className = "";
    $("#ovBody").innerHTML = "";
    $("#ovBody").appendChild(settingsBox());
    $("#ovBtns").innerHTML = "";
    var c = document.createElement("button"); c.type = "button"; c.textContent = "つづける";
    c.addEventListener("click", function () { A.sfx("ok"); o.hidden = true; B.paused = false; });
    var q = document.createElement("button"); q.type = "button"; q.textContent = "やめる";
    q.addEventListener("click", function () { A.sfx("back"); o.hidden = true; B.over = true; A.stopBgm(); closeMenu(); buildSelect(); show("select"); });
    $("#ovBtns").appendChild(c); $("#ovBtns").appendChild(q);
  });

  /* ---------- せってい ---------- */
  function settingsBox() {
    var box = document.createElement("div"); box.className = "settings";
    function toggle(label, key, onTxt, offTxt, apply) {
      var b = document.createElement("button"); b.type = "button"; b.className = "tog";
      function txt() { b.textContent = label + "：" + (save.settings[key] ? onTxt : offTxt); b.setAttribute("aria-pressed", save.settings[key]); }
      b.addEventListener("click", function () { save.settings[key] = !save.settings[key]; if (apply) apply(save.settings[key]); store(); txt(); A.sfx("cursor"); });
      txt(); box.appendChild(b);
    }
    toggle("🔊 こうかおん", "sfx", "オン", "オフ", A.setSfx);
    toggle("🎵 おんがく", "bgm", "オン", "オフ", A.setBgm);
    toggle("⏳ じかん", "wait", "えらぶ あいだ とまる", "とまらない", null);
    return box;
  }

  /* ---------- シーンえらび ---------- */
  function buildSelect() {
    var list = $("#sceneList"); list.innerHTML = "";
    KB.SCENES.forEach(function (sc) {
      var b = document.createElement("button"); b.type = "button"; b.className = "scene" + (sc.coming ? " coming" : "");
      var rec = save.records[sc.id] || {};
      var st = function (d) { var r = rec[d]; return r ? "★".repeat(r.stars) + "☆".repeat(3 - r.stars) : "☆☆☆"; };
      b.innerHTML = '<span class="se"></span><span class="sb"><span class="st"></span><span class="sd"></span>' +
        (sc.coming ? "" : '<span class="sr">やさしい <b></b>　ふつう <b></b></span>') + "</span>";
      b.querySelector(".se").textContent = sc.emoji; b.querySelector(".st").textContent = sc.title; b.querySelector(".sd").textContent = sc.desc;
      if (!sc.coming) { var bb = b.querySelectorAll(".sr b"); bb[0].textContent = st("easy"); bb[1].textContent = st("normal"); }
      b.disabled = !!sc.coming;
      b.addEventListener("click", function () { A.unlock(); A.sfx("ok"); startBattle(sc); });
      list.appendChild(b);
    });
    document.querySelectorAll("#diff button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.diff === save.settings.diff);
    });
  }
  document.querySelectorAll("#diff button").forEach(function (b) {
    b.addEventListener("click", function () { save.settings.diff = b.dataset.diff; store(); A.sfx("cursor"); buildSelect(); });
  });

  /* ---------- タイトル ---------- */
  $("#startBtn").addEventListener("click", function () { A.unlock(); A.sfx("biwa"); buildSelect(); show("select"); });
  $("#backTitle").addEventListener("click", function () { A.sfx("back"); show("title"); });
  $("#titleSettings").appendChild(settingsBox());
  $("#stage").addEventListener("click", function (ev) { if (B && B.talking && ev.target.closest("#talk") == null) advanceTalk(); });

  show("title");
  requestAnimationFrame(frame);

  // テスト・デバッグよう
  KB.debug = { get B() { return B; }, startBattle: startBattle };
})(window);
