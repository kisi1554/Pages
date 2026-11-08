/* ピクニック まもりたい — がめん と そうさ */
(function () {
  "use strict";
  const D = window.PMDefense, A = window.PMAudio, P = window.PMParks;
  const { W, H, K, TOOLS, CREATURES, TTYPES, CTYPES } = D;
  const KEY = "picnic-mamoru-v1";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ---------- ほぞん ---------- */
  const defaults = () => ({ stars: {}, seen: {}, sfx: true, bgm: true, best: {}, plays: 0 });
  let save = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && typeof s === "object") save = Object.assign(defaults(), s); } catch (e) { /* よめない とき は はじめから */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ } }
  A.sfx = save.sfx !== false; A.bgm = save.bgm !== false;

  /* ---------- まめちしき ---------- */
  const FACT = {
    ant: ["アリ は おしり から「におい」を だして、とおった みち に つける よ。なかま は その <b>においの みち</b> を たどって たべもの に あつまる。だから ぎょうれつ に なるんだ。",
          "ふゆ は つち の なか の す で じっと して すごす。だから ふゆ の こうえん には でて こない よ。"],
    pigeon: ["ハト は あるく とき に くび を まえ うしろ に ふる。あたま を いっしゅん とめて、まわり を くっきり みる ため と いわれて いる よ。",
             "こうえん の ハト は ひと に なれて いる けど、たべもの を あげる と ふえすぎて しまう。みる だけ に しよう。"],
    crow: ["カラス は とても あたま が いい とり。ひと の かお を おぼえたり、くるみ を くるま に わらせたり する なかま も いる よ。",
           "<b>ようじんぶかい</b> ので、いきなり たべもの を とらず、いちど おりて まわり を きょろきょろ みる。その あいだ が チャンス！"],
    squirrel: ["リス は あき に どんぐり を つち に うめて、ふゆ の ごはん に する よ。",
               "うめた ばしょ を わすれた どんぐり から、あたらしい き が はえる ことも。リス は もり を そだてる おてつだい を して いるんだ。"],
  };
  const TFACT = {
    fan: "かぜ で ちいさな いきもの を おしかえす。アリ も ハト も つよい かぜ は にがて。",
    umbrella: "ばっ と ひらく かさ は、とり に とって みなれない おおきな もの。そら から の カラス・ハト が ちかよれない。",
    crumb: "べつ の ばしょ に たべもの が あれば、いきもの は そっち へ いく。これ が「おとり」。シート から はなれて いく よ。",
    whistle: "おおきな おと に いきもの は びっくり。でも だれ に でも すこし ずつ しか きかない。",
    water: "みず で <b>においの みち</b> を けす と、アリ は どっち へ いけば いいか わからなく なって まいご に なる。ほんとう の アリ の しくみ だよ。",
  };
  const DECO = { sakura: "🌸", tulip: "🌷", tree: "🌳", bush: "🌿", water: "", reed: "🌾", sunflower: "🌻", momiji: "🍁", ginkgo: "🍂", kinoko: "🍄", rock: "🪨", snowman: "⛄", pine: "🌲" };
  const FOODS = ["🍙", "🍤", "🍓", "🥚", "🍙", "🍅", "🍓", "🍙", "🍤", "🥦"];
  const FOODPOS = [[4.65, 4.6], [5.25, 4.55], [5.85, 4.6], [6.4, 4.75], [4.75, 5.35], [5.5, 5.4], [6.25, 5.35], [4.65, 6.15], [5.3, 6.25], [6.05, 6.2]];

  /* ---------- がめん きりかえ ---------- */
  let view = "title";
  function show(v) {
    view = v;
    for (const [id, name] of [["vTitle", "title"], ["vSelect", "select"], ["vFree", "free"], ["vGame", "game"]]) $("#" + id).hidden = name !== v;
    if (v === "game") { resize(); } else { A.bgmStop(); }
    if (v === "title") renderTitle();
    if (v === "select") renderSelect();
  }
  function renderTitle() {
    const st = totalStars(), cl = Object.keys(save.stars).length;
    $("#tRec").textContent = cl ? `⭐ ${st} / ${P.STAGES.length * 3}　クリア した こうえん ${cl} / ${P.STAGES.length}` : "";
  }
  const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);
  const SEASON_ICON = { spring: "🌸", summer: "🌻", autumn: "🍁", winter: "⛄" };
  const SEASON_NAME = { spring: "はる の こうえん", summer: "なつ の かわら", autumn: "あき の やま", winter: "ふゆ の ゆき の こうえん" };
  function renderSelect() {
    $("#sTotal").textContent = `⭐ ${totalStars()} / ${P.STAGES.length * 3}`;
    const box = $("#sList"); box.innerHTML = "";
    let cur = null, grid = null;
    P.STAGES.forEach((st, i) => {
      if (st.season !== cur) {
        cur = st.season;
        const h = document.createElement("h3"); h.className = "season"; h.textContent = SEASON_ICON[cur] + " " + SEASON_NAME[cur];
        box.appendChild(h);
        grid = document.createElement("div"); grid.className = "sgrid"; box.appendChild(grid);
      }
      const no = i + 1, open = no === 1 || save.stars[no - 1] !== undefined || save.stars[no] !== undefined;
      const b = document.createElement("button");
      b.type = "button"; b.className = "sbtn"; b.disabled = !open; b.dataset.stage = no;
      const s = save.stars[no];
      const who = [...new Set(st.waves.flat().map((w) => w[0]))].map((t) => CREATURES[t].emoji).join("");
      b.innerHTML = `<span class="no">${no}</span><span class="nm">${open ? st.name : "🔒"}</span><span class="who">${open ? who : ""}</span><span class="st">${s === undefined ? "" : "⭐".repeat(s) + "☆".repeat(3 - s)}</span>`;
      b.addEventListener("click", () => { A.play("tap"); startGame(no); });
      grid.appendChild(b);
    });
  }

  /* ---------- ゲーム ---------- */
  let G = null, sel = null, hover = null, infoTool = null, paused = false, speed = 1, testFast = 0;
  let fx = [], floats = [], lastTs = 0, acc = 0, bgLayer = null, resultTimer = null, cardQueue = [];
  const cv = $("#cv"), cx = cv.getContext("2d");
  let cs = 40, dpr = 1, size = 440;

  function startGame(no, opt) {
    const seed = (Date.now() % 1000003) + 1;
    G = D.newGame(no, seed, opt);
    sel = null; hover = null; infoTool = null; paused = false; fx = []; floats = []; cardQueue = [];
    if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }
    // これまで に みた いきもの は カード を ださない
    for (const t of CTYPES) if (save.seen[t]) G.seen[t] = true;
    save.plays++; store();
    $("#hName").textContent = G.free ? "🌼 じゆう モード" : `${no}. ${G.stage.name}`;
    buildTools();
    $("#spawns").hidden = !G.free;
    $("#bGo").hidden = !!G.free;
    $("#tInfo").hidden = true;
    show("game");
    bgLayer = null;
    setMsg(G.free ? "どうぐ を おいて、した の ボタン で いきもの を よんで みよう。" : G.stage.tip);
    hud(); updateGo();
    A.bgmStart();
  }

  function buildTools() {
    const box = $("#tools"); box.innerHTML = "";
    for (const type of TTYPES) {
      const T = TOOLS[type];
      const b = document.createElement("button");
      b.type = "button"; b.className = "tool"; b.dataset.tool = type;
      if (!G.stage.tools.includes(type)) b.classList.add("lock");
      b.innerHTML = `<span class="e">${T.emoji}</span><span class="n">${T.name}</span><span class="c">🌰${T.cost}</span>`;
      b.setAttribute("aria-label", `${T.name} ${T.cost} コイン`);
      bindToolButton(b, type);
      box.appendChild(b);
    }
    const sp = $("#spawns"); sp.innerHTML = "";
    for (const t of CTYPES) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "spawn"; b.dataset.spawn = t;
      b.innerHTML = `<span class="e">${CREATURES[t].emoji}</span><span class="n">${CREATURES[t].name} を よぶ</span>`;
      b.addEventListener("click", () => {
        if (!G) return;
        A.play("tap");
        const n = t === "ant" ? 5 : 1;
        const pi = Math.floor(Math.random() * G.park.paths.length);
        for (let i = 0; i < n; i++) setTimeout(() => G && G.free && D.spawn(G, t, pi), i * 500);
      });
      sp.appendChild(b);
    }
  }

  function selectTool(type) {
    if (!G.stage.tools.includes(type)) return;
    sel = sel === type ? null : type;
    infoTool = null; $("#tInfo").hidden = true;
    for (const b of $$(".tool")) b.classList.toggle("sel", b.dataset.tool === sel);
    if (sel) {
      const T = TOOLS[sel];
      setMsg(`${T.emoji} ${T.name}（🌰${T.cost}）: ${T.desc}。しばふ を タップ して おこう。`);
    } else setMsg(G.free ? "どうぐ を えらんで しばふ に おこう。" : G.stage.tip);
  }

  // どうぐ ボタン: タップ で えらぶ / ドラッグ で そのまま おく
  function bindToolButton(b, type) {
    let start = null, drag = false;
    const ghost = $("#ghost");
    b.addEventListener("pointerdown", (e) => {
      if (!G || b.classList.contains("lock")) return;
      A.unlock();
      start = { x: e.clientX, y: e.clientY, id: e.pointerId }; drag = false;
      try { b.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    });
    b.addEventListener("pointermove", (e) => {
      if (!start || e.pointerId !== start.id) return;
      if (!drag && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
        drag = true;
        if (sel !== type) selectTool(type);
        ghost.textContent = TOOLS[type].emoji; ghost.hidden = false;
      }
      if (drag) {
        ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px";
        hover = cellAt(e.clientX, e.clientY);
      }
    });
    const end = (e, cancel) => {
      if (!start || e.pointerId !== start.id) return;
      const wasDrag = drag;
      start = null; drag = false; ghost.hidden = true;
      if (cancel) { hover = null; return; }
      if (wasDrag) {
        const c = cellAt(e.clientX, e.clientY);
        if (c) tryPlace(type, c.x, c.y);
        hover = null;
      } else { A.play("tap"); selectTool(type); }
    };
    b.addEventListener("pointerup", (e) => end(e, false));
    b.addEventListener("pointercancel", (e) => end(e, true));
    b.addEventListener("click", (e) => { if (e.detail === 0) selectTool(type); });   // キーボード
  }

  function cellAt(clientX, clientY) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((clientX - r.left) / r.width * W), y = Math.floor((clientY - r.top) / r.height * H);
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return { x, y };
  }

  function tryPlace(type, x, y) {
    if (!G || G.phase === "done") return false;
    const T = TOOLS[type];
    if (!D.canPlace(G, x, y)) {
      A.play("nope");
      const g = G.park.grid[K(x, y)];
      setMsg(g === 1 ? "みち の うえ には おけない よ。みち の そば の しばふ に おこう。" : g === 2 ? "シート の うえ には おけない よ。" : "そこ には おけない よ。");
      return false;
    }
    if (G.coins < T.cost) { A.play("nope"); setMsg(`どんぐり コイン が たりない よ（🌰${T.cost} いる）。いきもの を おいかえす と もらえる。`); bump("#hCoin"); return false; }
    const t = D.place(G, type, x, y);
    if (t) { fx.push({ k: "placed", x: t.cx, y: t.cy, t: 0 }); hud(); }
    return !!t;
  }

  // ばん の タップ
  let boardDown = null;
  cv.addEventListener("pointerdown", (e) => {
    A.unlock();
    boardDown = { x: e.clientX, y: e.clientY };
    hover = cellAt(e.clientX, e.clientY);
  });
  cv.addEventListener("pointermove", (e) => { if (sel) hover = cellAt(e.clientX, e.clientY); });
  cv.addEventListener("pointerleave", () => { hover = null; });
  cv.addEventListener("pointerup", (e) => {
    if (!G || !boardDown) return;
    boardDown = null;
    const c = cellAt(e.clientX, e.clientY);
    if (e.pointerType !== "mouse") hover = null;
    if (!c) return;
    const t = G.tools.find((q) => q.x === c.x && q.y === c.y);
    if (t) { openInfo(t); return; }
    if (sel) { tryPlace(sel, c.x, c.y); return; }
    if (infoTool) { closeInfo(); return; }
    const g = G.park.grid[K(c.x, c.y)];
    setMsg(g === 0 ? "した の どうぐ を えらんで から、ここ を タップ すると おける よ。" : g === 1 ? "いきもの が とおる みち だよ。" : g === 2 ? "おべんとう の シート。ここ を まもろう！" : "き や はな の ところ には おけない よ。");
  });

  function openInfo(t) {
    infoTool = t; A.play("tap");
    const T = TOOLS[t.type];
    const who = Object.keys(T.power).map((k) => CREATURES[k].emoji).join("");
    $("#tiText").innerHTML = `<b>${T.emoji} ${T.name}</b>　きく あいて: ${who}<br>${T.desc}<br>はんい ${T.range} マス・まちじかん ${T.cd} びょう`;
    $("#tiDel").textContent = `かたづける（+🌰${D.refundOf(t.type)}）`;
    $("#tInfo").hidden = false;
  }
  function closeInfo() { infoTool = null; $("#tInfo").hidden = true; }
  $("#tiClose").addEventListener("click", () => { A.play("tap"); closeInfo(); });
  $("#tiDel").addEventListener("click", () => {
    if (!infoTool || !G) return;
    const back = D.remove(G, infoTool.id);
    A.play("remove");
    floats.push({ x: infoTool.cx, y: infoTool.cy, text: `+${back}🌰`, t: 0, color: "#8f5b00" });
    closeInfo(); hud();
  });

  $("#bGo").addEventListener("click", () => {
    if (!G || G.phase !== "prep") return;
    A.unlock();
    if (D.startWave(G)) { closeInfo(); updateGo(); }
  });
  $("#bSpeed").addEventListener("click", () => { speed = speed === 1 ? 2 : 1; $("#bSpeed").textContent = speed === 1 ? "▶️×1" : "⏩×2"; A.play("tap"); });
  $("#bPause").addEventListener("click", () => { setPaused(!paused); A.play("tap"); });
  function setPaused(v) {
    paused = v; $("#bPause").textContent = paused ? "▶️" : "⏸️";
    if (paused) banner("ひとやすみ ちゅう ⏸️", 0); else hideBanner();
  }
  $("#bHome").addEventListener("click", () => { A.play("tap"); G = null; show(lastMenu); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && view === "game" && G && G.phase === "wave" && !paused) setPaused(true); });

  function updateGo() {
    const b = $("#bGo");
    if (!G || G.free) return;
    const n = G.stage.waves.length;
    if (G.phase === "prep") { b.disabled = false; b.textContent = G.wave === 0 ? "▶️ スタート（だい 1 ウェーブ）" : `▶️ つぎ が くる！（だい ${G.wave + 1} ウェーブ）`; }
    else if (G.phase === "wave") { b.disabled = true; b.textContent = `だい ${G.wave + 1} / ${n} ウェーブ ちゅう…`; }
    else { b.disabled = true; b.textContent = "おしまい！"; }
  }
  function hud() {
    if (!G) return;
    $("#hBento").textContent = "🍙 " + G.bento;
    $("#hBento").classList.toggle("low", G.bento <= 4);
    $("#hCoin").textContent = "🌰 " + G.coins;
    $("#hWave").textContent = G.free ? `🔙 ${G.returned}` : `🚩 ${Math.min(G.wave + 1, G.stage.waves.length)}/${G.stage.waves.length}`;
    for (const b of $$(".tool")) b.classList.toggle("poor", G.coins < TOOLS[b.dataset.tool].cost);
  }
  function bump(sel) { const e = $(sel); e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }
  function setMsg(t) { $("#msg").textContent = t; }
  let bannerTimer = null;
  function banner(text, ms) {
    const b = $("#banner"); b.textContent = text; b.hidden = false;
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = ms ? setTimeout(() => { b.hidden = true; }, ms) : null;
  }
  function hideBanner() { $("#banner").hidden = true; }

  /* ---------- できごと ---------- */
  function handleEvents() {
    for (const e of G.ev) {
      if (e.k === "fire") {
        A.play(e.tool.type);
        fx.push({ k: e.tool.type, x: e.tool.cx, y: e.tool.cy, ang: e.tool.ang, r: TOOLS[e.tool.type].range, t: 0 });
      } else if (e.k === "bikkuri") {
        A.play("bikkuri"); setTimeout(() => A.play("coin"), 120);
        floats.push({ x: e.c.x, y: e.c.y - 0.6, text: "ぴゃっ！", t: 0, color: "#e8590c" });
        floats.push({ x: e.c.x + 0.2, y: e.c.y - 0.1, text: `+${e.coin}🌰`, t: -0.15, color: "#8f5b00" });
        bump("#hCoin");
      } else if (e.k === "steal") {
        A.play("steal");
        floats.push({ x: e.c.x, y: e.c.y - 0.6, text: "とられた！", t: 0, color: "#c92a2a" });
        bump("#hBento");
      } else if (e.k === "spawn") {
        if (e.c.type === "crow") A.play("caw");
      } else if (e.k === "new") {
        if (!save.seen[e.type]) { save.seen[e.type] = true; store(); if (!testFast) cardQueue.push(e.type); }
      } else if (e.k === "wave") {
        A.play("wave"); banner(`🚩 だい ${e.n} ウェーブ！`, 1300);
        setMsg("いきもの が きた！ どうぐ は いつでも おける よ。");
      } else if (e.k === "waveEnd") {
        A.play("waveEnd"); banner(`ひとやすみ　+${e.bonus}🌰`, 1500);
        setMsg("いまの うち に どうぐ を ふやそう。じゅんび が できたら「つぎ が くる！」");
        updateGo();
      } else if (e.k === "done") {
        updateGo();
        resultTimer = setTimeout(showResult, testFast ? 50 : 900);
      }
    }
    G.ev.length = 0;
    if (cardQueue.length && $("#modal").hidden) showCard(cardQueue.shift());
  }

  /* ---------- ループ ---------- */
  function frame(ts) {
    requestAnimationFrame(frame);
    const dtR = Math.min(0.1, (ts - (lastTs || ts)) / 1000); lastTs = ts;
    if (view !== "game" || !G) return;
    const modalOpen = !$("#modal").hidden;
    if (!paused && !modalOpen) {
      acc += dtR * speed * (testFast || 1);
      let n = 0;
      while (acc >= 1 / 30 && n < 400) { D.step(G, 1 / 30); acc -= 1 / 30; n++; if (G.ev.length) handleEvents(); }
      if (G.free && G.bento <= 0) { G.bento = D.BENTO; setMsg("おべんとう を つくりなおした よ！"); }
      hud();
      for (const f of fx) f.t += dtR;
      for (const f of floats) f.t += dtR;
      fx = fx.filter((f) => f.t < 0.6); floats = floats.filter((f) => f.t < 1.1);
    } else acc = 0;
    if (G.ev.length) handleEvents();
    draw(ts / 1000);
  }
  requestAnimationFrame(frame);

  /* ---------- かく ---------- */
  function resize() {
    if (view !== "game") return;
    const wrap = $("#boardWrap");
    const r = wrap.getBoundingClientRect();
    size = Math.max(200, Math.floor(Math.min(r.width - 12, r.height - 12)));
    dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.style.width = size + "px"; cv.style.height = size + "px";
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    cs = size / W;
    bgLayer = null;
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));

  function emoji(c, e, x, y, px) {
    c.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(e, x, y);
  }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function buildBg() {
    const L = document.createElement("canvas");
    L.width = cv.width; L.height = cv.height;
    const c = L.getContext("2d");
    c.scale(dpr, dpr);
    const S = P.SEASONS[G.stage.season] || P.SEASONS.spring;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      c.fillStyle = (x + y) % 2 ? S.grass : S.grass2;
      c.fillRect(x * cs, y * cs, cs + 0.5, cs + 0.5);
    }
    // くさ の もよう
    const r = D.rng(G.seed);
    c.strokeStyle = "rgba(0,0,0,.08)"; c.lineWidth = 1.2;
    for (let i = 0; i < 90; i++) {
      const x = r() * size, y = r() * size;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y - 5); c.moveTo(x, y); c.lineTo(x + 2, y - 5); c.stroke();
    }
    // みち
    for (const path of G.park.paths) {
      c.strokeStyle = S.path2; c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = cs * 0.86;
      c.beginPath(); path.forEach((p, i) => (i ? c.lineTo : c.moveTo).call(c, (p[0] + 0.5) * cs, (p[1] + 0.5) * cs)); c.stroke();
      c.strokeStyle = S.path; c.lineWidth = cs * 0.72; c.stroke();
      // いりぐち（す の あな）
      const p0 = path[0];
      c.fillStyle = "#5c3d1e";
      c.beginPath(); c.ellipse((p0[0] + 0.5) * cs, (p0[1] + 0.5) * cs, cs * 0.26, cs * 0.18, 0, 0, Math.PI * 2); c.fill();
      // あしあと の てんてん
      c.fillStyle = "rgba(120,90,50,.18)";
      for (let i = 1; i < path.length - 1; i++) { c.beginPath(); c.arc((path[i][0] + 0.5) * cs, (path[i][1] + 0.5) * cs, cs * 0.05, 0, Math.PI * 2); c.fill(); }
    }
    // シート（ギンガムチェック）
    const sx = D.SHEET.x0 * cs, sy = D.SHEET.y0 * cs, sw = 3 * cs;
    c.save(); rrect(c, sx + 2, sy + 2, sw - 4, sw - 4, cs * 0.15); c.clip();
    c.fillStyle = "#fff"; c.fillRect(sx, sy, sw, sw);
    const n = 9, q = sw / n;
    c.fillStyle = "rgba(240,62,62,.45)";
    for (let i = 0; i < n; i += 2) { c.fillRect(sx + i * q, sy, q, sw); c.fillRect(sx, sy + i * q, sw, q); }
    c.restore();
    c.strokeStyle = "#e03131"; c.lineWidth = 2; rrect(c, sx + 2, sy + 2, sw - 4, sw - 4, cs * 0.15); c.stroke();
    // かざり
    for (const d of G.park.deco) {
      const X = (d.x + 0.5) * cs, Y = (d.y + 0.5) * cs;
      if (d.kind === "water") {
        c.fillStyle = "#74c0fc"; rrect(c, d.x * cs + 2, d.y * cs + 2, cs - 4, cs - 4, cs * 0.3); c.fill();
        c.strokeStyle = "#e7f5ff"; c.lineWidth = 2;
        c.beginPath(); c.arc(X - cs * 0.12, Y, cs * 0.12, Math.PI * 1.1, Math.PI * 1.9); c.arc(X + cs * 0.12, Y + cs * 0.05, cs * 0.12, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      } else emoji(c, DECO[d.kind] || "🌳", X, Y, cs * 0.72);
    }
    bgLayer = L;
  }

  function draw(time) {
    const c = cx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (!bgLayer) buildBg();
    c.clearRect(0, 0, cv.width, cv.height);
    c.drawImage(bgLayer, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // おべんとう
    for (let i = 0; i < D.BENTO; i++) {
      const [x, y] = FOODPOS[i];
      if (i < G.bento) emoji(c, FOODS[i], x * cs, y * cs, cs * 0.5);
      else { c.strokeStyle = "rgba(0,0,0,.18)"; c.setLineDash([3, 3]); c.beginPath(); c.arc(x * cs, y * cs, cs * 0.2, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
    }
    // はんい
    const showRange = (t, col) => { c.fillStyle = col; c.strokeStyle = col.replace(/[\d.]+\)$/, ".8)"); c.lineWidth = 2; c.beginPath(); c.arc(t.cx * cs, t.cy * cs, TOOLS[t.type].range * cs, 0, Math.PI * 2); c.fill(); c.stroke(); };
    if (infoTool) showRange(infoTool, "rgba(255,255,255,.35)");
    if (sel && hover) {
      const ok = D.canPlace(G, hover.x, hover.y) && G.coins >= TOOLS[sel].cost;
      showRange({ type: sel, cx: hover.x + 0.5, cy: hover.y + 0.5 }, ok ? "rgba(255,255,255,.35)" : "rgba(255,80,80,.3)");
    }
    // どうぐ
    for (const t of G.tools) drawTool(c, t, time);
    if (sel && hover) { c.globalAlpha = 0.55; emoji(c, TOOLS[sel].emoji, (hover.x + 0.5) * cs, (hover.y + 0.5) * cs, cs * 0.62); c.globalAlpha = 1; }
    // こうか
    for (const f of fx) drawFx(c, f);
    // いきもの（そら の もの は うえ に）
    const list = G.cre.slice().sort((a, b) => (CREATURES[a.type].air ? 1 : 0) - (CREATURES[b.type].air ? 1 : 0));
    for (const cr of list) drawCreature(c, cr, time);
    // もじ
    for (const f of floats) {
      if (f.t < 0) continue;
      const a = Math.max(0, 1 - f.t / 1.1);
      c.globalAlpha = a;
      c.font = `bold ${Math.round(cs * 0.36)}px sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 4; c.strokeStyle = "#fff"; c.strokeText(f.text, f.x * cs, (f.y - f.t * 0.6) * cs);
      c.fillStyle = f.color; c.fillText(f.text, f.x * cs, (f.y - f.t * 0.6) * cs);
      c.globalAlpha = 1;
    }
  }

  function drawTool(c, t, time) {
    const X = t.cx * cs, Y = t.cy * cs, f = t.fired > 0 ? t.fired / 0.35 : 0;
    c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(X, Y + cs * 0.3, cs * 0.32, cs * 0.1, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = infoTool === t ? "#fff3bf" : "#fff8e1"; c.strokeStyle = "#e8b04a"; c.lineWidth = 2;
    c.beginPath(); c.arc(X, Y, cs * 0.4, 0, Math.PI * 2); c.fill(); c.stroke();
    c.save(); c.translate(X, Y);
    if (t.type === "fan") c.rotate(Math.sin(time * 10) * 0.15 + f * 0.4 * Math.sin(time * 40));
    if (t.type === "umbrella") c.scale(1 + f * 0.15, 1 + f * 0.15);
    if (t.type === "whistle") c.rotate(-0.2 + f * 0.2);
    emoji(c, TOOLS[t.type].emoji, 0, f * -cs * 0.05, cs * 0.56);
    c.restore();
    // まちじかん
    const T = TOOLS[t.type];
    if (t.cd > 0) {
      c.strokeStyle = "rgba(43,138,62,.8)"; c.lineWidth = 3;
      c.beginPath(); c.arc(X, Y, cs * 0.44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - t.cd / T.cd)); c.stroke();
    }
  }

  function drawFx(c, f) {
    const X = f.x * cs, Y = f.y * cs, p = f.t / 0.6, R = (f.r || 1) * cs;
    c.save();
    c.globalAlpha = Math.max(0, 1 - p);
    if (f.k === "fan") {
      c.strokeStyle = "#e7f5ff"; c.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const d = cs * (0.5 + p * 1.1 + i * 0.25);
        c.beginPath(); c.arc(X, Y, d, f.ang - 0.5, f.ang + 0.5); c.stroke();
      }
    } else if (f.k === "umbrella") {
      c.strokeStyle = "#d0bfff"; c.lineWidth = 4;
      c.beginPath(); c.arc(X, Y, R * (0.3 + p * 0.7), Math.PI, Math.PI * 2); c.stroke();
    } else if (f.k === "whistle") {
      c.strokeStyle = "#ffd43b"; c.lineWidth = 3;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(X, Y, R * Math.min(1, p + i * 0.3), 0, Math.PI * 2); c.stroke(); }
    } else if (f.k === "water") {
      c.fillStyle = "#4dabf7";
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; c.beginPath(); c.arc(X + Math.cos(a) * R * p, Y + Math.sin(a) * R * p, cs * 0.06, 0, Math.PI * 2); c.fill(); }
    } else if (f.k === "crumb") {
      c.fillStyle = "#e8b04a";
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + p; c.beginPath(); c.arc(X + Math.cos(a) * cs * 0.6 * p, Y + Math.sin(a) * cs * 0.6 * p, cs * 0.05, 0, Math.PI * 2); c.fill(); }
    } else if (f.k === "placed") {
      c.strokeStyle = "#fff"; c.lineWidth = 3; c.beginPath(); c.arc(X, Y, cs * (0.3 + p * 0.5), 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  }

  /* いきもの の え（オリジナル の ベクター） */
  function drawCreature(c, cr, time) {
    const air = CREATURES[cr.type].air;
    let X = cr.x * cs, Y = cr.y * cs;
    const flying = air && (cr.state !== "land");
    c.save();
    if (cr.state === "home" || cr.state === "carry") c.globalAlpha = 0.85;
    // かげ
    if (flying) { c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(X, Y + cs * 0.45, cs * 0.3, cs * 0.09, 0, 0, Math.PI * 2); c.fill(); Y -= cs * 0.25; }
    c.translate(X, Y);
    if (cr.state === "spin") { const k = 1 - cr.spin / 0.6; c.rotate(k * Math.PI * 2); }
    if (cr.hit > 0) c.translate(Math.sin(time * 80) * cs * 0.04, 0);
    const s = cs * (cr.type === "ant" ? 0.55 : cr.type === "crow" ? 1.0 : 0.9);
    if (cr.type === "ant") { c.rotate(Math.atan2(cr.dy, cr.dx)); drawAnt(c, s, time + cr.id); }
    else {
      if (cr.dx < -0.01) c.scale(-1, 1);
      if (cr.type === "pigeon") drawPigeon(c, s, cr, time);
      else if (cr.type === "crow") drawCrow(c, s, cr, time, flying);
      else drawSquirrel(c, s, cr, time);
    }
    c.restore();
    c.save(); c.translate(X, Y);
    if (cr.carry) emoji(c, "🍙", cs * 0.05, -cs * 0.42, cs * 0.32);
    // びっくり ゲージ
    if (cr.g > 0 && cr.state !== "home" && cr.state !== "carry" && cr.state !== "spin") {
      const w = cs * 0.7, h = cs * 0.1, top = -cs * (cr.type === "ant" ? 0.38 : 0.6);
      c.fillStyle = "rgba(255,255,255,.9)"; rrect(c, -w / 2 - 1, top - 1, w + 2, h + 2, 3); c.fill();
      c.fillStyle = "#fd7e14"; rrect(c, -w / 2, top, w * Math.min(1, cr.g / cr.max), h, 2); c.fill();
    }
    if (cr.state === "spin") { c.font = `bold ${Math.round(cs * 0.5)}px sans-serif`; c.fillStyle = "#e8590c"; c.textAlign = "center"; c.fillText("!", cs * 0.35, -cs * 0.5); emoji(c, "💦", -cs * 0.35, -cs * 0.4, cs * 0.3); }
    if (cr.state === "land") { c.font = `bold ${Math.round(cs * 0.3)}px sans-serif`; c.fillStyle = "#495057"; c.textAlign = "center"; c.fillText(Math.floor(time * 3) % 2 ? "きょろ" : "きょろ？", 0, -cs * 0.75); }
    if (cr.state === "circle") { c.font = `bold ${Math.round(cs * 0.45)}px sans-serif`; c.fillStyle = "#c92a2a"; c.textAlign = "center"; c.fillText("！", 0, -cs * 0.55); }
    c.restore();
  }
  function drawAnt(c, s, t) {
    const k = Math.sin(t * 22);
    c.strokeStyle = "#2b1a10"; c.lineWidth = Math.max(1, s * 0.05); c.lineCap = "round";
    for (let i = -1; i <= 1; i++) {
      const lx = i * s * 0.12, sw = (i % 2 ? k : -k) * s * 0.08;
      c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx + sw, -s * 0.3); c.moveTo(lx, 0); c.lineTo(lx - sw, s * 0.3); c.stroke();
    }
    c.beginPath(); c.moveTo(s * 0.3, -s * 0.03); c.quadraticCurveTo(s * 0.42, -s * 0.18, s * 0.5, -s * 0.15);
    c.moveTo(s * 0.3, s * 0.03); c.quadraticCurveTo(s * 0.42, s * 0.18, s * 0.5, s * 0.15); c.stroke();
    c.fillStyle = "#3b2416";
    c.beginPath(); c.ellipse(-s * 0.26, 0, s * 0.19, s * 0.14, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, 0, s * 0.1, s * 0.08, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(s * 0.22, 0, s * 0.12, s * 0.11, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.arc(s * 0.26, -s * 0.04, s * 0.03, 0, Math.PI * 2); c.fill();
  }
  function drawPigeon(c, s, cr, t) {
    const hop = cr.state === "go" && cr.hop < 0.5 ? Math.abs(Math.sin(cr.hop * Math.PI * 4)) * s * 0.06 : 0;
    const nod = Math.sin(t * 12) * s * 0.05;
    c.translate(0, -hop);
    c.strokeStyle = "#e64980"; c.lineWidth = Math.max(1, s * 0.04);
    c.beginPath(); c.moveTo(-s * 0.02, s * 0.18); c.lineTo(-s * 0.05, s * 0.3); c.moveTo(s * 0.08, s * 0.18); c.lineTo(s * 0.1, s * 0.3); c.stroke();
    c.fillStyle = "#6c757d"; c.beginPath(); c.moveTo(-s * 0.25, -s * 0.02); c.lineTo(-s * 0.48, s * 0.06); c.lineTo(-s * 0.25, s * 0.12); c.fill();
    c.fillStyle = "#adb5bd"; c.beginPath(); c.ellipse(0, s * 0.04, s * 0.3, s * 0.18, -0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#868e96"; c.beginPath(); c.ellipse(-s * 0.06, s * 0.0, s * 0.18, s * 0.1, -0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#495057"; c.fillRect(-s * 0.16, s * 0.0, s * 0.03, s * 0.08); c.fillRect(-s * 0.09, s * 0.0, s * 0.03, s * 0.08);
    c.fillStyle = "#69db7c"; c.beginPath(); c.ellipse(s * 0.2 + nod * 0.5, -s * 0.08, s * 0.09, s * 0.08, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#9775fa"; c.beginPath(); c.ellipse(s * 0.17 + nod * 0.5, -s * 0.02, s * 0.08, s * 0.06, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#868e96"; c.beginPath(); c.arc(s * 0.26 + nod, -s * 0.2, s * 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#f08c00"; c.beginPath(); c.arc(s * 0.29 + nod, -s * 0.22, s * 0.025, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#212529"; c.beginPath(); c.arc(s * 0.29 + nod, -s * 0.22, s * 0.012, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fcc2d7"; c.beginPath(); c.moveTo(s * 0.34 + nod, -s * 0.2); c.lineTo(s * 0.43 + nod, -s * 0.17); c.lineTo(s * 0.34 + nod, -s * 0.15); c.fill();
  }
  function drawCrow(c, s, cr, t, flying) {
    const flap = flying ? Math.sin(t * 16) : 0;
    c.fillStyle = "#212529";
    c.beginPath(); c.moveTo(-s * 0.22, -s * 0.02); c.lineTo(-s * 0.5, s * 0.02); c.lineTo(-s * 0.48, s * 0.12); c.lineTo(-s * 0.22, s * 0.1); c.fill();
    c.beginPath(); c.ellipse(0, s * 0.04, s * 0.3, s * 0.17, -0.05, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.26, -s * 0.1, s * 0.13, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#343a40"; c.beginPath(); c.moveTo(s * 0.34, -s * 0.15); c.quadraticCurveTo(s * 0.55, -s * 0.12, s * 0.52, -s * 0.06); c.lineTo(s * 0.34, -s * 0.05); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(s * 0.3, -s * 0.13, s * 0.03, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#000"; c.beginPath(); c.arc(s * 0.31, -s * 0.13, s * 0.015, 0, Math.PI * 2); c.fill();
    // はね
    c.fillStyle = "#343a40";
    c.beginPath(); c.moveTo(-s * 0.12, -s * 0.02); c.lineTo(s * 0.1, -s * 0.02);
    c.lineTo(-s * 0.15, -s * 0.02 - s * (flying ? 0.35 * flap : -0.08)); c.closePath(); c.fill();
    c.fillStyle = "#4dabf7"; c.globalAlpha *= 0.25; c.beginPath(); c.ellipse(-s * 0.05, s * 0.02, s * 0.15, s * 0.06, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha /= 0.25;
    if (!flying) { c.strokeStyle = "#212529"; c.lineWidth = Math.max(1, s * 0.04); c.beginPath(); c.moveTo(0, s * 0.18); c.lineTo(-s * 0.02, s * 0.3); c.moveTo(s * 0.08, s * 0.18); c.lineTo(s * 0.1, s * 0.3); c.stroke(); }
  }
  function drawSquirrel(c, s, cr, t) {
    const hop = cr.state === "go" || cr.state === "home" || cr.state === "carry" ? Math.abs(Math.sin(t * 12 + cr.id)) * s * 0.1 : 0;
    c.translate(0, -hop);
    c.fillStyle = "#e8913a";
    c.beginPath(); c.moveTo(-s * 0.12, s * 0.12);
    c.bezierCurveTo(-s * 0.55, s * 0.15, -s * 0.6, -s * 0.45, -s * 0.25, -s * 0.42);
    c.bezierCurveTo(-s * 0.05, -s * 0.4, -s * 0.15, -s * 0.18, -s * 0.3, -s * 0.2);
    c.bezierCurveTo(-s * 0.35, -s * 0.05, -s * 0.2, s * 0.02, -s * 0.12, s * 0.12); c.fill();
    c.fillStyle = "#b5651d"; c.beginPath(); c.ellipse(0, s * 0.06, s * 0.2, s * 0.15, -0.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fff4e6"; c.beginPath(); c.ellipse(s * 0.07, s * 0.1, s * 0.09, s * 0.09, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#b5651d"; c.beginPath(); c.arc(s * 0.18, -s * 0.12, s * 0.12, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(s * 0.12, -s * 0.2); c.lineTo(s * 0.12, -s * 0.33); c.lineTo(s * 0.2, -s * 0.22); c.fill();
    c.fillStyle = "#212529"; c.beginPath(); c.arc(s * 0.23, -s * 0.14, s * 0.025, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.3, -s * 0.09, s * 0.018, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#8a5a2b"; c.beginPath(); c.ellipse(s * 0.1, s * 0.2, s * 0.08, s * 0.03, 0, 0, Math.PI * 2); c.fill();
  }

  /* ---------- まど ---------- */
  function modal(html, btns, onOpen) {
    $("#mBody").innerHTML = html;
    const bb = $("#mBtns"); bb.innerHTML = "";
    for (const [label, fn, cls] of btns) {
      const b = document.createElement("button");
      b.type = "button"; b.className = cls || "mid"; b.innerHTML = label;
      b.addEventListener("click", () => { A.play("tap"); closeModal(); if (fn) fn(); });
      bb.appendChild(b);
    }
    $("#modal").hidden = false;
    if (onOpen) onOpen();
  }
  function closeModal() { $("#modal").hidden = true; }

  function creatureIcon(type, px) {
    const k = document.createElement("canvas");
    const r = Math.min(3, window.devicePixelRatio || 1);
    k.width = px * r; k.height = px * r; k.style.width = px + "px"; k.style.height = px + "px";
    const c = k.getContext("2d"); c.scale(r, r); c.translate(px / 2, px / 2 + px * 0.05);
    const s = px * 0.9, fake = { state: "idle", hop: 1, id: 1, dx: 1 };
    if (type === "ant") { c.rotate(-0.3); drawAnt(c, s * 0.9, 0.3); }
    else if (type === "pigeon") drawPigeon(c, s, fake, 0);
    else if (type === "crow") drawCrow(c, s, fake, 0.1, false);
    else drawSquirrel(c, s, fake, 0);
    return k;
  }

  function showCard(type) {
    A.play("newcard");
    const C = CREATURES[type];
    const tools = TTYPES.filter((t) => TOOLS[t].power[type]).map((t) => TOOLS[t].emoji + " " + TOOLS[t].name).join("・");
    modal(`<div class="card"><h2>${C.emoji} ${C.name} が きた！</h2><div id="cardPic"></div>
      <p class="fact">💡 ${FACT[type][0]}</p>
      <p>${type === "crow" ? "そら から まっすぐ とんで きて、シート の はし で きょろきょろ してから とる よ。" : type === "squirrel" ? "とっても すばやい！" : type === "pigeon" ? "ちょこちょこ とまりながら あるく よ。" : "ぎょうれつ で たくさん くる よ。"}</p>
      <p>きく どうぐ: <b>${tools}</b></p></div>`, [["わかった！", null, "big primary"]], () => $("#cardPic").appendChild(creatureIcon(type, 120)));
  }

  function showResult() {
    if (!G || view !== "game") return;
    const left = G.bento, stars = D.starsFor(left), no = G.stageNo;
    let first = false;
    if (!G.free) {
      first = save.stars[no] === undefined;
      if (save.stars[no] === undefined || stars > save.stars[no]) save.stars[no] = stars;
      store();
    }
    A.play("party"); confetti();
    const food = FOODS.slice(0, left).join("");
    const msg = left === D.BENTO ? "ぜんぶ まもれた！ さいこう の ピクニック！"
      : left >= 8 ? "ほとんど まもれた！ おいしい ピクニック！"
      : left > 0 ? `${left}こ まもれた！ のこった おべんとう で パーティー！`
      : "おべんとう は なくなっちゃった… でも おうち の ひと が おやつ を もって きて くれた！ みんな で パーティー！";
    const next = no < P.STAGES.length ? [["つぎ の こうえん ▶️", () => startGame(no + 1), "big primary"]] : [];
    modal(`<div class="result"><h2>🎉 ピクニック パーティー！</h2>
      <div class="stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? "" : "off"}">⭐</span>`).join("")}</div>
      <p class="party">🧺${food || "🍪🧃"}🎶</p>
      <p class="sum">${msg}</p>
      <p>のこった おべんとう: 🍙 ${left} / ${D.BENTO}　おいかえした いきもの: ${G.returned}</p>
      <p class="fact">💡 おいかえした いきもの は みんな じぶん の おうち へ。こうえん の いきもの は、しぜん の なか で じぶん で ごはん を さがして くらして いる よ。</p>
      ${first && no < P.STAGES.length ? "<p><b>あたらしい こうえん に いける よう に なった！</b></p>" : ""}</div>`,
      next.concat([["🔁 もういちど", () => startGame(no), "mid"], ["🗺️ こうえん えらび", () => { G = null; show("select"); }, "mid"]]));
  }
  function confetti() {
    if (testFast) return;
    const box = document.createElement("div"); box.className = "confetti";
    const cols = ["#fa5252", "#fab005", "#40c057", "#4dabf7", "#be4bdb"];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%"; p.style.background = cols[i % cols.length];
      p.style.animationDuration = 1.6 + Math.random() * 1.6 + "s"; p.style.animationDelay = Math.random() * 0.6 + "s";
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4000);
  }

  function showZukan() {
    let html = `<h2>📖 まめちしき ずかん</h2><h3 class="zh">いきもの</h3><div class="zgrid">`;
    for (const t of CTYPES) html += `<button type="button" class="zitem ${save.seen[t] ? "" : "no"}" data-z="${t}"><span class="e">${save.seen[t] ? CREATURES[t].emoji : "❔"}</span>${save.seen[t] ? CREATURES[t].name : "？？？"}</button>`;
    html += `</div><div id="zDetail"></div><h3 class="zh">どうぐ</h3><table class="ztable">`;
    for (const t of TTYPES) {
      const T = TOOLS[t];
      html += `<tr><td>${T.emoji} ${T.name}<br>🌰${T.cost}</td><td>きく: ${Object.keys(T.power).map((k) => CREATURES[k].emoji).join("")}<br>${TFACT[t]}</td></tr>`;
    }
    html += "</table>";
    modal(html, [["とじる", null, "mid"]], () => {
      for (const b of $$(".zitem")) b.addEventListener("click", () => {
        const t = b.dataset.z; A.play("tap");
        const d = $("#zDetail");
        if (!save.seen[t]) { d.innerHTML = `<p class="fact">まだ あって いない いきもの。こうえん で あおう！</p>`; return; }
        d.innerHTML = `<div class="card"><div id="zPic"></div><p class="fact">💡 ${FACT[t].join("<br>💡 ")}</p></div>`;
        $("#zPic").appendChild(creatureIcon(t, 96));
      });
    });
  }
  function showHelp() {
    modal(`<h2>❓ あそびかた</h2><div class="help"><ul>
      <li>シート の まんなか に <b>おべんとう 10こ</b>。いきもの が みち を とおって ねらって くる よ。</li>
      <li>した の <b>どうぐ</b> を えらんで しばふ を タップ（または ドラッグ）して おこう。みち の そば が いい よ。</li>
      <li>どうぐ の ちかく に くる と いきもの の <b>びっくり ゲージ</b> が たまる。いっぱい に なる と「ぴゃっ！」と くるっ と まわって おうち へ かえる。<b>きずつけない</b> よ。</li>
      <li>おいかえす と <b>🌰 どんぐり コイン</b> が もらえる。コイン で どうぐ を ふやそう。おいた どうぐ を タップ すると かたづけられる。</li>
      <li>🐦‍⬛ カラス は そら から まっすぐ くる。シート の ちかく に ☂️ かさ を おこう。</li>
      <li>さいご に のこった おべんとう の かず で ⭐。8こ いじょう で ⭐⭐⭐。0こ でも パーティー は ある よ！</li>
    </ul></div>`, [["わかった！", null, "big primary"]]);
  }

  /* ---------- ボタン ---------- */
  let lastMenu = "select";
  $("#bPlay").addEventListener("click", () => { A.unlock(); A.play("tap"); lastMenu = "select"; show("select"); });
  $("#bFree").addEventListener("click", () => { A.unlock(); A.play("tap"); lastMenu = "free"; show("free"); });
  $("#bHelp").addEventListener("click", () => { A.play("tap"); showHelp(); });
  $("#bZukan").addEventListener("click", () => { A.play("tap"); showZukan(); });
  for (const b of $$(".bBack")) b.addEventListener("click", () => { A.play("tap"); show("title"); });
  for (const id of ["#fSeason", "#fPaths"]) {
    for (const b of $$(id + " .chip")) b.addEventListener("click", () => {
      A.play("tap");
      for (const o of $$(id + " .chip")) o.classList.toggle("on", o === b);
    });
  }
  $("#bFreeGo").addEventListener("click", () => {
    A.play("tap");
    startGame("free", { season: $("#fSeason .chip.on").dataset.v, paths: +$("#fPaths .chip.on").dataset.v });
  });
  function sndUi() {
    for (const b of $$(".bSnd")) b.setAttribute("aria-pressed", String(A.sfx));
    for (const b of $$(".bBgm")) b.setAttribute("aria-pressed", String(A.bgm));
  }
  for (const b of $$(".bSnd")) b.addEventListener("click", () => { A.sfx = !A.sfx; save.sfx = A.sfx; store(); sndUi(); A.play("tap"); });
  for (const b of $$(".bBgm")) b.addEventListener("click", () => {
    A.bgm = !A.bgm; save.bgm = A.bgm; store(); sndUi();
    if (A.bgm && view === "game") A.bgmStart();
  });
  sndUi();
  document.addEventListener("keydown", (e) => {
    if (view !== "game" || !G) return;
    if (e.key === " " && G.phase === "prep") { e.preventDefault(); $("#bGo").click(); }
    if (e.key === "Escape") { sel = null; for (const b of $$(".tool")) b.classList.remove("sel"); closeInfo(); }
  });
  show("title");

  /* ---------- テスト よう の フック ---------- */
  window.PMTest = {
    state: () => ({ view, phase: G && G.phase, wave: G && G.wave, bento: G && G.bento, coins: G && G.coins, tools: G ? G.tools.length : 0,
      cre: G ? G.cre.length : 0, stageNo: G && G.stageNo, modal: !$("#modal").hidden, paused, sel }),
    fast(n) { testFast = n ? (n === true ? 8 : n) : 0; },
    autoPlace: () => (G ? D.autoPlace(G) : 0),
    // その どうぐ を おける マス（みち に いちばん ちかい もの）
    freeCell(type) {
      let best = null;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!D.canPlace(G, x, y)) continue;
        const v = Object.values(D.coverage(G, type, x, y)).reduce((a, b) => a + b, 0);
        if (!best || v > best.v) best = { x, y, v };
      }
      return best;
    },
    cellPoint(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + (x + 0.5) * r.width / W, y: r.top + (y + 0.5) * r.height / H }; },
    game: () => G,
  };
})();
