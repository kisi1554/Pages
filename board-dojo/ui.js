/* ============================================================
   かんがえる ボードゲーム — がめん と すすめかた
   ============================================================ */
(function () {
  "use strict";
  var BD = window.BD, AI = BD.ai, A = BD.audio, VW = BD.view;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "board-dojo:v1";
  var VQ = (function () { var s = document.currentScript && document.currentScript.src || ""; var m = s.match(/\?v=([^&#]+)/); return m ? "?v=" + m[1] : ""; })();

  /* ---------- ゲーム の しょうかい ---------- */
  var LV = [null,
    { em: "🐣", name: "はじめて" }, { em: "🐥", name: "やさしい" }, { em: "🦊", name: "ふつう" }, { em: "🐉", name: "つよい" }];
  var BELT = [
    { name: "まだ なし", cls: "b0" }, { name: "しろおび", cls: "b1" }, { name: "きいろおび", cls: "b2" },
    { name: "みどりおび", cls: "b3" }, { name: "くろおび", cls: "b4" }];
  var META = {
    reversi: {
      name: "リバーシ", em: "⚫", sub: "はさんで ひっくりかえす", pn: [null, "くろ", "しろ"],
      opts: [{ key: "size", label: "ばん の おおきさ", items: [[8, "8×8"], [6, "6×6 ちいさい"]] }],
      rules: ["じぶん の コマ で あいて の コマ を はさむ と、ひっくりかえって じぶん の いろ に なる。",
        "はさめる ところ にしか おけない。おけない とき は「パス」。",
        "ふたり とも おけなく なったら おしまい。コマ が おおい ほう の かち！"]
    },
    gomoku: {
      name: "ごもくならべ", em: "⚪", sub: "5つ ならべたら かち", pn: [null, "くろ", "しろ"],
      opts: [{ key: "size", label: "ばん の おおきさ", items: [[15, "15×15"], [9, "9×9 ちいさい"]] },
        { key: "ban33", label: "ルール", items: [[0, "かんたん（きんじて なし）"], [1, "<ruby>三三<rt>さんさん</rt></ruby> <ruby>禁止<rt>きんし</rt></ruby>"]] }],
      rules: ["くろ と しろ が こうたい に、せん の まじわる ところ に いし を おく。",
        "たて・よこ・ななめ の どれか に 5つ（いじょう）ならべたら かち！",
        "<ruby>三三<rt>さんさん</rt></ruby> <ruby>禁止<rt>きんし</rt></ruby> に すると、いっぺん に「ひらいた 3」を 2つ つくる て は おけない（✕ しるし）。"]
    },
    marubatsu: {
      name: "まるばつ", em: "⭕", sub: "3つ ならべたら かち", pn: [null, "まる", "ばつ"],
      opts: [],
      rules: ["3×3 の ます に、○ と × を こうたい に かく。",
        "たて・よこ・ななめ に 3つ ならべたら かち！ うまったら ひきわけ。",
        "🐉 つよい CPU は ぜったい まけない。ひきわけ に できたら くろおび！"]
    },
    yonnarabe: {
      name: "おとして 4つならべ", em: "🔴", sub: "うえ から コマ を おとす", pn: [null, "あか", "きいろ"],
      opts: [],
      rules: ["7れつ × 6だん の たて の ばん。れつ を えらぶ と コマ が いちばん した まで おちる。",
        "たて・よこ・ななめ に 4つ ならべたら かち！ いっぱい に なったら ひきわけ。"]
    },
    hakotori: {
      name: "はこ とり", em: "🟦", sub: "4へんめ を ひいて はこ を とる", pn: [null, "あお", "オレンジ"],
      opts: [{ key: "size", label: "はこ の かず", items: [[2, "2×2"], [3, "3×3"], [4, "4×4"]] }],
      rules: ["てん と てん の あいだ に、こうたい で せん を 1ぽん ひく。",
        "はこ の 4へんめ を ひいた ひと が その はこ を とって、もう いちど ひける。",
        "ぜんぶ ひいたら おしまい。はこ が おおい ほう の かち！ 3ぼんめ を ひく と あいて に とられちゃう よ。"]
    }
  };
  var ORDER = ["reversi", "gomoku", "marubatsu", "yonnarabe", "hakotori"];

  /* ---------- ほぞん ---------- */
  var store = { cfg: { sound: true, undo: true, hint: true, legal: true, confirm: true }, stats: {}, belts: {}, setup: {}, save: null };
  try { var raw = JSON.parse(localStorage.getItem(KEY) || "null"); if (raw) { for (var k in raw) store[k] = raw[k]; } } catch (e) { /* むし */ }
  var cfg = store.cfg;
  ["sound", "undo", "hint", "legal", "confirm"].forEach(function (k) { if (cfg[k] === undefined) cfg[k] = true; });
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* むし */ } }
  A.on = cfg.sound;

  /* ---------- CPU の けいさん（Web Worker。つかえない とき は こちら で すこし ずつ） ---------- */
  var Brain = { w: null, seq: 0, pend: {} };
  function local(msg) {
    var G = BD.games[msg.game];
    if (msg.type === "move") {
      var o = {}; for (var k in msg.opt) o[k] = msg.opt[k];
      var L = AI.LEVELS[msg.level];
      o.timeMs = Math.min(L && L.timeMs || 400, 450);
      return { move: AI.chooseMove(G, msg.state, msg.level, AI.rng(msg.seed), o) };
    }
    if (msg.type === "hint") return { hint: AI.bestMoves(G, msg.state, Math.min(msg.timeMs, 350)) };
    return { value: AI.valueOf(G, msg.state, Math.min(msg.timeMs, 60)) };
  }
  try {
    Brain.w = new Worker("worker.js" + VQ);
    Brain.w.onmessage = function (e) { var p = Brain.pend[e.data.id]; if (!p) return; delete Brain.pend[e.data.id]; if (e.data.error) p.fallback(); else p.res(e.data); };
    Brain.w.onerror = function (e) { if (e && e.preventDefault) e.preventDefault(); Brain.w = null; var ps = Brain.pend; Brain.pend = {}; for (var id in ps) ps[id].fallback(); };
  } catch (e) { Brain.w = null; }
  function ask(msg) {
    return new Promise(function (res) {
      var fallback = function () { setTimeout(function () { res(local(msg)); }, 16); };
      if (!Brain.w) return fallback();
      var id = ++Brain.seq, done = false, to = null;
      msg.id = id;
      var once = function (f) { return function (d) { if (done) return; done = true; clearTimeout(to); delete Brain.pend[id]; f(d); }; };
      Brain.pend[id] = { res: once(res), fallback: once(fallback) };
      to = setTimeout(function () { if (Brain.pend[id]) Brain.pend[id].fallback(); }, 6000);
      try { Brain.w.postMessage(msg); } catch (err) { Brain.pend[id].fallback(); }
    });
  }

  /* ---------- がめん きりかえ ---------- */
  var views = ["v-home", "v-setup", "v-play", "v-review", "v-stats"];
  var cur = "v-home";
  function show(id, title) {
    cur = id;
    views.forEach(function (v) { $(v).hidden = v !== id; });
    $("back").hidden = id === "v-home";
    $("title").innerHTML = title || "♟️ かんがえる ボードゲーム";
    window.scrollTo(0, 0);
    if (id === "v-play" || id === "v-review") fitBoard();
  }
  function toast(t, ms) {
    var el = $("toast"); el.innerHTML = t; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, ms || 1800);
  }
  function icon(id, p) { return VW.icon(id, p); }

  /* ---------- ホーム ---------- */
  function beltOf(id) { return store.belts[id] || 0; }
  function beltHTML(b) { return '<span class="belt ' + BELT[b].cls + '"></span>'; }
  function renderHome() {
    var g = $("games"); g.innerHTML = "";
    ORDER.forEach(function (id) {
      var M = META[id], b = beltOf(id), st = store.stats[id] || {}, w = 0, n = 0;
      for (var k in st) { w += st[k].w || 0; n += (st[k].w || 0) + (st[k].l || 0) + (st[k].d || 0); }
      var el = document.createElement("button");
      el.className = "card";
      el.dataset.game = id;
      el.innerHTML = '<span class="em">' + M.em + '</span><b>' + M.name + '</b><small>' + M.sub + '</small>' +
        '<span class="rec">' + beltHTML(b) + ' ' + BELT[b].name + (n ? '・' + n + 'きょく ' + w + 'しょう' : '') + '</span>';
      el.onclick = function () { A.tap(); openSetup(id); };
      g.appendChild(el);
    });
    var blacks = ORDER.filter(function (id) { return beltOf(id) >= 4; }).length;
    $("mybelt").innerHTML = blacks >= 5 ? "🏆 <b>めいじん！</b> ぜんぶ の ゲーム で くろおび" :
      blacks ? "🥋 くろおび <b>" + blacks + "</b> / 5 ゲーム" : "🥋 CPU に かつ と おび が もらえる よ（🐉 つよい に かつ と くろおび）";
    var sv = store.save;
    $("resume").hidden = !sv;
    if (sv) $("resume").innerHTML = "▶ つづき から：" + META[sv.id].em + " " + META[sv.id].name + "（" + sv.moves.length + "て め まで）";
  }

  /* ---------- じゅんび ---------- */
  var setupId = null, setupVals = null;
  function defaults(id) {
    var d = { mode: "cpu", level: 2, side: 1, face: false };
    META[id].opts.forEach(function (o) { d[o.key] = o.items[0][0]; });
    var sv = store.setup[id]; if (sv) for (var k in sv) d[k] = sv[k];
    return d;
  }
  function openSetup(id) {
    setupId = id; setupVals = defaults(id);
    var M = META[id];
    $("rules").innerHTML = '<h3>' + M.em + ' ' + M.name + '</h3><ul>' + M.rules.map(function (r) { return "<li>" + r + "</li>"; }).join("") + "</ul>";
    renderOpts();
    show("v-setup", M.em + " " + M.name);
  }
  function chipRow(label, key, items) {
    return '<div class="opt"><b>' + label + '</b><div class="chips">' + items.map(function (it) {
      return '<button class="chip' + (String(setupVals[key]) === String(it[0]) ? " on" : "") + '" data-k="' + key + '" data-v="' + it[0] + '">' + it[1] + "</button>";
    }).join("") + "</div></div>";
  }
  function renderOpts() {
    var id = setupId, v = setupVals, h = "";
    h += chipRow("あいて", "mode", [["cpu", "🤖 ひとり（CPU と）"], ["pvp", "👨‍👩‍👧 ふたり（こうたい で）"], ["watch", "👀 CPU どうし を みる"]]);
    if (v.mode !== "pvp") h += chipRow("CPU の つよさ", "level", [1, 2, 3, 4].map(function (l) { return [l, LV[l].em + " " + LV[l].name]; }));
    if (v.mode === "cpu") h += chipRow("じゅんばん", "side", [[1, icon(id, 1) + " さき（" + META[id].pn[1] + "）"], [2, icon(id, 2) + " あと（" + META[id].pn[2] + "）"], [0, "🎲 おまかせ"]]);
    if (v.mode === "pvp") h += chipRow("ならびかた", "face", [[false, "🙂 よこ に ならぶ"], [true, "🙃 テーブル で むかいあう"]]);
    META[id].opts.forEach(function (o) { h += chipRow(o.label, o.key, o.items); });
    $("opts").innerHTML = h;
    Array.prototype.forEach.call($("opts").querySelectorAll(".chip"), function (b) {
      b.onclick = function () {
        A.tap();
        var k = b.dataset.k, val = b.dataset.v;
        setupVals[k] = k === "mode" ? val : (val === "true" ? true : val === "false" ? false : +val);
        renderOpts();
      };
    });
  }
  $("start").onclick = function () {
    A.tap();
    var v = setupVals, id = setupId;
    store.setup[id] = v; persist();
    var opts = {};
    META[id].opts.forEach(function (o) { opts[o.key] = v[o.key]; });
    if (id === "gomoku") opts.ban33 = !!opts.ban33;
    var human = v.mode === "cpu" ? (v.side || (Math.random() < 0.5 ? 1 : 2)) : 0;
    startGame({ id: id, opts: opts, mode: v.mode, level: v.level, human: human, face: v.mode === "pvp" && !!v.face, moves: [] });
  };

  /* ---------- たいきょく ---------- */
  var game = null;   // { id, opts, mode, level, human, face, moves, states, over }
  var ui = { busy: false, token: 0, hints: null, hintText: "", ghost: null, msg: "", zoom: null, anim: false, paused: false };
  function G() { return BD.games[game.id]; }
  function st() { return game.states[game.states.length - 1]; }
  function isCPU(p) { return game.mode === "watch" || (game.mode === "cpu" && p !== game.human); }
  function pname(p) {
    var n = META[game.id].pn[p];
    if (game.mode === "cpu") return p === game.human ? "あなた（" + n + "）" : "CPU（" + n + "）";
    if (game.mode === "watch") return "CPU" + p + "（" + n + "）";
    return n;
  }
  function shortName(p) {
    var n = META[game.id].pn[p];
    if (game.mode === "cpu") return p === game.human ? "あなた" : "CPU " + LV[game.level].em;
    if (game.mode === "watch") return "CPU" + p;
    return n;
  }
  function startGame(g) {
    game = g;
    var Gm = BD.games[g.id];
    game.states = [Gm.init(g.opts)];
    var replay = g.moves.slice(); game.moves = [];
    try { replay.forEach(function (m) { game.states.push(Gm.play(st(), m)); game.moves.push(m); }); } catch (e) { /* こわれた ほぞん は そこまで */ }
    game.over = false;
    ui.token++; ui.busy = false; ui.hints = null; ui.ghost = null; ui.zoom = null; ui.paused = false; ui.msg = "";
    $("side2").hidden = !game.face;
    show("v-play", META[g.id].em + " " + META[g.id].name);
    saveGame();
    step();
  }
  function saveGame() {
    if (!game || game.over || game.mode === "watch") { if (game && game.over) { store.save = null; persist(); } return; }
    store.save = { id: game.id, opts: game.opts, mode: game.mode, level: game.level, human: game.human, face: game.face, moves: game.moves.slice() };
    persist();
  }
  // つぎ に なに を する か
  function step() {
    var s = st(), Gm = G(), r = Gm.result(s);
    render();
    if (r !== null) return finish(r);
    var p = Gm.turn(s);
    if (isCPU(p)) { if (!ui.paused) cpuMove(); return; }
    // ひと の ばん。リバーシ で おけない とき は じどう で パス
    var ms = Gm.moves(s);
    if (game.id === "reversi" && ms.length === 1 && ms[0] === Gm.PASS) {
      var tk = ui.token;
      ui.busy = true;
      ui.msg = '<span class="warn">' + pname(p) + " は おける ところ が ない ので パス！</span>";
      render();
      A.pass();
      setTimeout(function () { if (tk !== ui.token) return; ui.busy = false; apply(Gm.PASS); }, 1500);
    }
  }
  function cpuMove() {
    var s = st(), tk = ++ui.token, t0 = Date.now(), Gm = G();
    ui.busy = true; render();
    $("think").hidden = false;
    A.think();
    var wait = 350 + Math.random() * 350;
    ask({ type: "move", game: game.id, state: s, level: game.level, seed: (Math.random() * 1e9) | 0, opt: {} }).then(function (d) {
      var left = Math.max(0, Math.min(wait - (Date.now() - t0), 1000 - (Date.now() - t0)));
      setTimeout(function () {
        if (tk !== ui.token || !game || game.over) return;
        $("think").hidden = true;
        ui.busy = false;
        var m = d.move;
        if (Gm.moves(s).indexOf(m) < 0) m = Gm.moves(s)[0]; // ねんのため
        if (game.mode === "watch") setTimeout(function () { if (tk === ui.token) apply(m); }, 120);
        else apply(m);
      }, left);
    });
  }
  function apply(m) {
    var Gm = G(), s = st(), p = Gm.turn(s);
    if (Gm.moves(s).indexOf(m) < 0) return;
    var n = Gm.play(s, m);
    game.moves.push(m); game.states.push(n);
    ui.hints = null; ui.ghost = null; ui.msg = "";
    // おと
    if (game.id === "reversi") { if (m === Gm.PASS) { A.pass(); ui.msg = pname(p) + " は パス"; } else { A.pachi(); A.kuru(n.flipped.length); } }
    else if (game.id === "yonnarabe") A.drop(game.opts.h || 6 - (n.lastIdx / n.W | 0));
    else if (game.id === "hakotori") { A.line(); if (n.got.length) { setTimeout(function () { A.take(n.got.length); }, 120); ui.msg = pname(p) + " が はこ を " + n.got.length + "こ とった！ もう いちど。"; } }
    else A.pachi();
    if (ui.zoom && game.id === "gomoku") ensureVisible(m);
    ui.anim = true;
    saveGame();
    step();
    ui.anim = false;
  }
  function undo() {
    if (!game || game.over || !cfg.undo || game.mode === "watch") return;
    if (!game.moves.length) return;
    var Gm = G();
    ui.token++; ui.busy = false; $("think").hidden = true;
    do {
      game.moves.pop(); game.states.pop();
    } while (game.mode === "cpu" && game.moves.length && Gm.turn(st()) !== game.human);
    if (game.mode === "cpu" && Gm.turn(st()) !== game.human) { /* さいしょ が CPU の ばん */ }
    ui.hints = null; ui.ghost = null; ui.msg = "1て もどした よ。";
    A.undo();
    saveGame();
    step();
  }
  function hint() {
    if (!game || game.over || ui.busy) return;
    var s = st(), Gm = G(), p = Gm.turn(s);
    if (isCPU(p)) return;
    var tk = ui.token;
    ui.msg = "🤔 かんがえちゅう…"; render();
    ask({ type: "hint", game: game.id, state: s, timeMs: 450 }).then(function (d) {
      if (tk !== ui.token || st() !== s) return;
      var ms = d.hint.moves.filter(function (m) { return Gm.moves(s).indexOf(m) >= 0; });
      if (!ms.length) ms = [Gm.moves(s)[0]];
      ui.hints = ms;
      ui.msg = "💡 " + Gm.reason(s, ms[0]);
      A.hint();
      if (ui.zoom && game.id === "gomoku") ensureVisible(ms[0]);
      render();
    });
  }
  function finish(r) {
    game.over = true;
    ui.busy = false;
    $("think").hidden = true;
    store.save = null;
    var Gm = G(), s = st(), id = game.id, sc = Gm.score(s);
    var title, em, sub = "", belt = "";
    if (game.mode === "cpu") {
      var opp = "cpu" + game.level;
      var S = (store.stats[id] = store.stats[id] || {}); var rec = S[opp] = S[opp] || { w: 0, l: 0, d: 0 };
      if (r === 0) { rec.d++; title = "ひきわけ！"; em = "🤝"; A.draw(); }
      else if (r === game.human) { rec.w++; title = "あなた の かち！"; em = "🎉"; A.win(); }
      else { rec.l++; title = "CPU の かち"; em = "😣"; A.lose(); sub = "くやしい！ ふりかえり で どこ が わかれめ か みて みよう。"; }
      var earned = (r === game.human) || (r === 0 && id === "marubatsu" && game.level === 4) ? game.level : 0;
      if (earned > beltOf(id)) { store.belts[id] = earned; belt = "🥋 " + META[id].name + " の <b>" + BELT[earned].name + "</b> を もらった！"; }
    } else {
      var S2 = (store.stats[id] = store.stats[id] || {});
      var key = game.mode === "pvp" ? "pvp" : "watch";
      var rec2 = S2[key] = S2[key] || { w: 0, l: 0, d: 0 };
      if (r === 0) { rec2.d++; title = "ひきわけ！"; em = "🤝"; A.draw(); }
      else { if (r === 1) rec2.w++; else rec2.l++; title = pname(r) + " の かち！"; em = "🏆"; A.win(); }
    }
    if (sc) sub = META[id].pn[1] + " " + sc[1] + " − " + sc[2] + " " + META[id].pn[2] + (sub ? "<br>" + sub : "");
    persist();
    render();
    setTimeout(function () {
      if (!game || !game.over) return;
      $("res-em").textContent = em; $("res-title").innerHTML = title; $("res-sub").innerHTML = sub;
      $("res-belt").hidden = !belt; $("res-belt").innerHTML = belt;
      $("result").hidden = false;
    }, game.id === "yonnarabe" ? 700 : 500);
  }

  /* ---------- ばん を かく ---------- */
  var size = { w: 0, h: 0 };
  function fitBoard() {
    if (!game) return;
    var s = st(), info = VW.render(game.id, s, {});
    var land = window.matchMedia("(orientation: landscape) and (min-width: 700px)").matches;
    var vw = Math.min(document.documentElement.clientWidth, window.innerWidth);
    var vh = window.innerHeight;
    var bar = document.querySelector(".bar").offsetHeight;
    var stat = 60, side = land ? 0 : 150, top2 = game.face && cur === "v-play" ? 140 : 0;
    if (cur === "v-review") side = land ? 0 : 230;
    var availW = (land ? vw - 300 - 50 : vw - 16), availH = vh - bar - stat - side - top2 - 24;
    if (!land && vw < 700) availH = Math.max(availH, vw * 0.8);
    var scale = Math.min(availW / info.w, availH / info.h);
    size.w = Math.floor(info.w * scale); size.h = Math.floor(info.h * scale);
    ["board", "rv-board"].forEach(function (b) { var el = $(b); el.setAttribute("width", size.w); el.setAttribute("height", size.h); });
    if (cur === "v-play") render(); else if (cur === "v-review") rvRender();
  }
  window.addEventListener("resize", function () { clearTimeout(fitBoard.t); fitBoard.t = setTimeout(fitBoard, 80); });
  function cellPx() {
    var s = st();
    if (game.id === "gomoku") { var W = (s.N - 1) * 100 + 140; return size.w / W * 100 * (ui.zoom ? ui.zoom.z : 1); }
    return 999;
  }
  function needConfirm() { return cfg.confirm && cellPx() < 40; }
  function canZoom() { return game && game.id === "gomoku" && size.w / ((st().N - 1) * 100 + 140) * 100 < 40; }

  function render() {
    if (!game) return;
    var s = st(), Gm = G(), p = Gm.turn(s), r = Gm.result(s);
    var human = r === null && !isCPU(p) && !ui.busy;
    var o = { anim: ui.anim, prev: game.states[game.states.length - 2], uid: "p" };
    if (human && cfg.legal && (game.id === "reversi" || game.id === "yonnarabe")) o.legal = Gm.moves(s);
    if (game.id === "gomoku" && s.ban33 && human) {
      o.forbidden = [];
      for (var i = 0; i < s.b.length; i++) if (!s.b[i] && Gm.isForbidden(s, i, p)) o.forbidden.push(i);
    }
    if (ui.hints) o.hints = ui.hints;
    if (ui.ghost != null) o.ghost = ui.ghost;
    o.clickable = human;
    var info = VW.render(game.id, s, o);
    var svg = $("board");
    var vb = ui.zoom ? zoomBox(info) : [0, 0, info.w, info.h];
    svg.setAttribute("viewBox", vb.join(" "));
    svg.innerHTML = info.svg;
    $("zoomnav").hidden = !ui.zoom;
    if (ui.zoom) $("zoomnav").textContent = "ゆび で ずらせる よ";
    // じょうたい
    var sc = Gm.score(s), h = "";
    [1, 2].forEach(function (q) {
      h += '<div class="pl' + (r === null && p === q ? " now" : "") + '">' + icon(game.id, q) + '<span class="nm">' + shortName(q) + "</span>" + (sc ? '<span class="sc">' + sc[q] + "</span>" : "") + "</div>";
      if (q === 1) h += '<span class="vs">vs</span>';
    });
    $("status").innerHTML = h;
    // コーチ の ことば
    var msg = r !== null ? (r === 0 ? "ひきわけ！" : pname(r) + " の かち！") :
      ui.msg ? ui.msg + (ui.hints ? "" : "<br>" + turnText(p)) : turnText(p);
    var btns = function (forP) {
      var mine = r === null && !isCPU(p) && (!game.face || forP === p);
      var b = "";
      if (game.mode !== "watch") {
        if (cfg.hint) b += '<button class="btn small" data-act="hint"' + (mine && !ui.busy ? "" : " disabled") + '>💡 ヒント</button>';
        if (cfg.undo) b += '<button class="btn small" data-act="undo"' + (r === null && game.moves.length && (game.mode !== "cpu" || game.moves.some(function (m, i) { return Gm.turn(game.states[i]) === game.human; })) ? "" : " disabled") + '>↩️ まった</button>';
      } else {
        b += '<button class="btn small" data-act="pause">' + (ui.paused ? "▶ つづける" : "⏸ とめる") + "</button>";
      }
      if (canZoom()) b += '<button class="btn small' + (ui.zoom ? " on" : "") + '" data-act="zoom">🔍 ' + (ui.zoom ? "もどす" : "おおきく") + "</button>";
      if (!game.face || forP === 1) b += '<button class="btn small" data-act="quit">🏠 やめる</button>';
      return b;
    };
    [[$("side1"), 1], [$("side2"), 2]].forEach(function (pair) {
      var el = pair[0];
      el.querySelector("[data-coach]").innerHTML = !game.face || r !== null || pair[1] === p ? msg : META[game.id].pn[p] + " の ばん。まって ね。";
      el.querySelector("[data-btns]").innerHTML = btns(pair[1]);
    });
  }
  function turnText(p) {
    if (isCPU(p)) return (game.mode === "watch" ? pname(p) : "CPU（" + LV[game.level].em + " " + LV[game.level].name + "）") + " が かんがえちゅう… うーん…";
    var t = (game.mode === "cpu" ? "あなた" : META[game.id].pn[p]) + " の ばん だよ。";
    if (game.id === "reversi") t += " あいて を はさめる ところ に おこう。";
    else if (game.id === "yonnarabe") t += " れつ を タップ して コマ を おとそう。";
    else if (game.id === "hakotori") t += " てん と てん の あいだ を タップ して せん を ひこう。";
    else if (game.id === "gomoku" && needConfirm()) t += " 2かい タップ で おく よ。";
    return t;
  }

  /* ---------- ごもく の ズーム ---------- */
  function zoomBox(info) {
    var z = ui.zoom, w = info.w / z.z, h = info.h / z.z;
    z.cx = Math.max(w / 2, Math.min(info.w - w / 2, z.cx)); z.cy = Math.max(h / 2, Math.min(info.h - h / 2, z.cy));
    return [z.cx - w / 2, z.cy - h / 2, w, h].map(function (x) { return Math.round(x); });
  }
  function toggleZoom() {
    if (ui.zoom) { ui.zoom = null; render(); return; }
    var s = st(), N = s.N, c = s.last != null && s.last >= 0 ? s.last : ((N / 2) | 0) * N + ((N / 2) | 0);
    ui.zoom = { z: 2, cx: 70 + (c % N) * 100, cy: 70 + ((c / N) | 0) * 100 };
    render();
  }
  function ensureVisible(m) {
    var s = st(), N = s.N, W = (N - 1) * 100 + 140, x = 70 + (m % N) * 100, y = 70 + ((m / N) | 0) * 100, half = W / ui.zoom.z / 2 - 80;
    if (Math.abs(x - ui.zoom.cx) > half) ui.zoom.cx = x;
    if (Math.abs(y - ui.zoom.cy) > half) ui.zoom.cy = y;
  }

  /* ---------- タップ ---------- */
  var drag = null;
  var board = $("board");
  board.addEventListener("pointerdown", function (e) {
    if (!game) return;
    var t = e.target.closest ? e.target.closest("[data-m]") : null;
    drag = { x: e.clientX, y: e.clientY, m: t ? +t.getAttribute("data-m") : null, moved: false, id: e.pointerId };
    if (ui.zoom) { try { board.setPointerCapture(e.pointerId); } catch (err) { /* むし */ } }
    e.preventDefault();
  });
  board.addEventListener("pointermove", function (e) {
    if (!drag || !ui.zoom || drag.id !== e.pointerId) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 10) return;
    drag.moved = true;
    var vb = board.viewBox.baseVal, k = vb.width / size.w;
    ui.zoom.cx -= dx * k; ui.zoom.cy -= dy * k;
    drag.x = e.clientX; drag.y = e.clientY;
    var info = { w: (st().N - 1) * 100 + 140, h: (st().N - 1) * 100 + 140 };
    board.setAttribute("viewBox", zoomBox(info).join(" "));
  });
  board.addEventListener("pointerup", function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    var d = drag; drag = null;
    if (d.moved || d.m == null) return;
    tap(d.m);
  });
  board.addEventListener("pointercancel", function () { drag = null; });
  function tap(m) {
    if (!game || game.over || ui.busy) return;
    var Gm = G(), s = st();
    if (isCPU(Gm.turn(s))) return;
    if (Gm.moves(s).indexOf(m) < 0) {
      if (game.id === "gomoku" && s.ban33 && !s.b[m]) { ui.msg = '<span class="warn">そこ は <ruby>三三<rt>さんさん</rt></ruby> に なる から おけない よ</span>'; render(); A.undo(); }
      else if (game.id === "reversi") { ui.msg = '<span class="warn">そこ では はさめない よ。</span>'; render(); A.undo(); }
      return;
    }
    if (game.id === "gomoku" && needConfirm() && ui.ghost !== m) {
      ui.ghost = m; ui.msg = "ここ で いい？ もう いちど タップ で おく よ。"; A.tap(); render(); return;
    }
    apply(m);
  }

  /* ---------- ボタン ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    var act = b.dataset.act;
    if (act === "hint") hint();
    else if (act === "undo") undo();
    else if (act === "zoom") { A.tap(); toggleZoom(); }
    else if (act === "pause") { ui.paused = !ui.paused; if (ui.paused) { ui.token++; ui.busy = false; $("think").hidden = true; render(); } else step(); }
    else if (act === "quit") { A.tap(); ui.token++; $("think").hidden = true; game = null; renderHome(); show("v-home"); }
  });
  $("res-again").onclick = function () { A.tap(); $("result").hidden = true; var g = game; startGame({ id: g.id, opts: g.opts, mode: g.mode, level: g.level, human: g.mode === "cpu" ? (store.setup[g.id] && store.setup[g.id].side === 0 ? (Math.random() < 0.5 ? 1 : 2) : g.human) : 0, face: g.face, moves: [] }); };
  $("res-menu").onclick = function () { A.tap(); $("result").hidden = true; game = null; renderHome(); show("v-home"); };
  $("res-board").onclick = function () { A.tap(); $("result").hidden = true; };
  $("res-review").onclick = function () { A.tap(); $("result").hidden = true; openReview(); };
  $("resume").onclick = function () { A.tap(); var sv = store.save; if (sv) startGame({ id: sv.id, opts: sv.opts, mode: sv.mode, level: sv.level, human: sv.human, face: sv.face, moves: sv.moves }); };
  $("back").onclick = function () {
    A.tap();
    if (cur === "v-review") { show("v-play", META[game.id].em + " " + META[game.id].name); rvStop(); return; }
    if (cur === "v-play") { ui.token++; $("think").hidden = true; if (game && game.over) game = null; }
    renderHome(); show("v-home");
  };
  $("go-stats").onclick = function () { A.tap(); renderStats(); show("v-stats", "📊 せんせき と おび"); };

  /* ---------- ふりかえり ---------- */
  var rv = { k: 0, marks: [], timer: null, points: [], token: 0 };
  function openReview() {
    if (!game) return;
    rv.k = game.moves.length; rv.points = []; rv.marks = []; rv.sel = -1;
    var tk = ++rv.token;
    $("rv-slider").max = game.moves.length; $("rv-slider").value = rv.k;
    $("rv-points").innerHTML = "";
    show("v-review", "🔍 ふりかえり");
    rvRender();
    // ぜんぶ の きょくめん の ひょうか を じゅんばん に
    var Gm = G(), n = game.states.length, vals = [], per = Math.max(25, Math.min(150, 3500 / n));
    if (game.id === "gomoku") per = Math.max(20, Math.min(90, 2500 / n));
    var stepI = function (i) {
      if (tk !== rv.token) return;
      if (i >= n) return rvDone(vals);
      $("rv-say").innerHTML = "どこ が わかれめ だった か、かんがえちゅう… <div class='bar2'><i style='width:" + Math.round(i / n * 100) + "%'></i></div>";
      ask({ type: "value", game: game.id, state: game.states[i], timeMs: per }).then(function (d) { vals[i] = d.value; stepI(i + 1); });
    };
    stepI(0);
  }
  function rvDone(vals) {
    var Gm = G();
    var who = function (p) { return game.mode === "cpu" ? p === game.human : true; };
    var ms = AI.findMistakes(Gm, game.states, game.moves, vals, who);
    rv.points = ms;
    var say;
    if (!ms.length) say = game.moves.length < 3 ? "まだ みじかい たいきょく だね。" : "おおきな まちがい は なかった よ。じょうず！ ▶ で てじゅん を さいせい して みよう。";
    else say = "ここ が わかれめ だった ね。したの ボタン で みて みよう。<b>あか</b> が うった て、<b>みどり</b> なら よかった かも。";
    $("rv-say").innerHTML = say;
    $("rv-points").innerHTML = ms.map(function (x, j) {
      return '<button class="btn small" data-pt="' + j + '">⚠️ ' + (x.i + 1) + "てめ" + (game.mode === "cpu" ? "" : "（" + META[game.id].pn[x.p] + "）") + "</button>";
    }).join("");
    Array.prototype.forEach.call($("rv-points").querySelectorAll("[data-pt]"), function (b) { b.onclick = function () { A.tap(); rvPoint(+b.dataset.pt); }; });
    if (ms.length) rvPoint(0);
  }
  function rvPoint(j) {
    var x = rv.points[j]; if (!x) return;
    rvStop();
    rv.k = x.i; rv.sel = j;
    var Gm = G(), s = game.states[x.i];
    var t = (x.i + 1) + "てめ：" + (game.mode === "cpu" ? "" : META[game.id].pn[x.p] + " の て。") + "ここ が わかれめ だった ね。<b style='color:#2f9e44'>みどり</b> の ところ なら よかった かも。<br><small>" + Gm.reason(s, x.better) + "</small>";
    if (x.after <= -900) t += "<br><small>あか の て の あと は、あいて に かちかた が あった よ。</small>";
    $("rv-say").innerHTML = t;
    rv.marks = [{ m: x.played, kind: "bad" }, { m: x.better, kind: "good" }];
    rvRender(true);
  }
  function rvRender(keepMarks) {
    if (!game) return;
    if (!keepMarks) rv.marks = [];
    var s = game.states[rv.k], Gm = G();
    var info = VW.render(game.id, s, { marks: rv.marks, clickable: false, uid: "r", noLast: !!rv.marks.length });
    var svg = $("rv-board");
    svg.setAttribute("viewBox", "0 0 " + info.w + " " + info.h);
    svg.innerHTML = info.svg;
    $("rv-slider").value = rv.k;
    var sc = Gm.score(s), p = Gm.turn(s), r = Gm.result(s), h = "";
    [1, 2].forEach(function (q) {
      h += '<div class="pl' + (r === null && p === q ? " now" : "") + '">' + icon(game.id, q) + '<span class="nm">' + shortName(q) + "</span>" + (sc ? '<span class="sc">' + sc[q] + "</span>" : "") + "</div>";
      if (q === 1) h += '<span class="vs">' + rv.k + " / " + game.moves.length + "</span>";
    });
    $("rv-status").innerHTML = h;
  }
  function rvGo(k) { rv.k = Math.max(0, Math.min(game.moves.length, k)); rvRender(); A.tap(); }
  function rvStop() { clearInterval(rv.timer); rv.timer = null; $("rv-play").textContent = "▶ さいせい"; }
  $("rv-first").onclick = function () { rvStop(); rvGo(0); };
  $("rv-prev").onclick = function () { rvStop(); rvGo(rv.k - 1); };
  $("rv-next").onclick = function () { rvStop(); rvGo(rv.k + 1); };
  $("rv-last").onclick = function () { rvStop(); rvGo(game.moves.length); };
  $("rv-slider").oninput = function () { rvStop(); rv.k = +this.value; rvRender(); };
  $("rv-play").onclick = function () {
    if (rv.timer) return rvStop();
    if (rv.k >= game.moves.length) rv.k = 0;
    $("rv-play").textContent = "⏸ とめる";
    rvRender();
    rv.timer = setInterval(function () {
      if (rv.k >= game.moves.length) return rvStop();
      rv.k++; rvRender(); A.pachi();
    }, game.moves.length > 60 ? 450 : 750);
  };

  /* ---------- せんせき ---------- */
  function renderStats() {
    var h = "";
    ORDER.forEach(function (id) {
      var M = META[id], S = store.stats[id] || {}, b = beltOf(id);
      h += '<section class="stbox"><h3>' + M.em + " " + M.name + " " + beltHTML(b) + ' <small>' + BELT[b].name + "</small></h3>";
      h += "<table><tr><th>あいて</th><th>かち</th><th>まけ</th><th>ひきわけ</th></tr>";
      [1, 2, 3, 4].forEach(function (l) {
        var r = S["cpu" + l] || { w: 0, l: 0, d: 0 };
        h += "<tr><td>" + LV[l].em + " " + LV[l].name + "</td><td>" + r.w + "</td><td>" + r.l + "</td><td>" + r.d + "</td></tr>";
      });
      var pv = S.pvp || { w: 0, l: 0, d: 0 };
      h += "<tr><td>👨‍👩‍👧 ふたり</td><td colspan='3'>" + M.pn[1] + " " + pv.w + "しょう・" + M.pn[2] + " " + pv.l + "しょう・ひきわけ " + pv.d + "</td></tr>";
      h += "</table></section>";
    });
    h += '<section class="stbox"><h3>🥋 おび の もらいかた</h3><div class="beltrow">' +
      [1, 2, 3, 4].map(function (l) { return "<span>" + beltHTML(l) + " " + BELT[l].name + "：" + LV[l].em + " " + LV[l].name + " に かつ</span>"; }).join("") +
      "</div><small>まるばつ の 🐉 つよい は ぜったい まけない ので、ひきわけ で くろおび。 5つ ぜんぶ くろおび で 🏆 めいじん！</small></section>";
    $("stats").innerHTML = h;
  }

  /* ---------- せってい ---------- */
  function syncSound() { $("sound").textContent = cfg.sound ? "🔊" : "🔇"; A.on = cfg.sound; }
  $("sound").onclick = function () { cfg.sound = !cfg.sound; persist(); syncSound(); A.tap(); };
  $("gear").onclick = function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-set]"), function (el) { el.checked = !!cfg[el.dataset.set]; });
    var d = $("dlg"); if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-set]"), function (el) {
    el.onchange = function () { cfg[el.dataset.set] = el.checked; persist(); syncSound(); if (game && cur === "v-play") { ui.ghost = null; render(); } };
  });
  $("reset").onclick = function () {
    if (!confirm("せんせき と おび を ぜんぶ けして いい？")) return;
    store.stats = {}; store.belts = {}; persist(); renderHome(); if (cur === "v-stats") renderStats(); toast("けしたよ");
  };

  // テスト よう の まど
  window.BDapp = {
    state: function () { return game && { id: game.id, mode: game.mode, moves: game.moves.length, over: game.over, result: game.over ? G().result(st()) : null, busy: ui.busy }; },
    start: function (g) { g.moves = g.moves || []; startGame(g); },
    tap: tap,
    worker: function () { return !!Brain.w; }
  };

  VW.defs();
  syncSound();
  renderHome();
  show("v-home");
})();
