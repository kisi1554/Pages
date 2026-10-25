// PK たいけつ — しあいの すすめかた・そうさ（スワイプ／9マス）・じっきょう・たいかい・データ・ほぞん
(function () {
  "use strict";
  const P = window.PKPhys, R = window.PKRules, A = window.PKAI, V3 = window.PKRender, AU = window.PKAudio;
  const { TEAMS, COLORS } = window.PKTeams;
  const sfx = AU.sfx;
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const SPEED = Number(qs.get("speed")) || 1;     // テスト用: アニメを はやく する
  const KEY = "pk-battle-v1";
  const CELL_NAME = ["ひだり うえ", "まんなか うえ", "みぎ うえ", "ひだり", "まんなか", "みぎ", "ひだり した", "まんなか した", "みぎ した"];

  // ===== ほぞん =====
  const zeros = () => [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let save = {
    sound: true, voice: true, easy: 0, level: 1, my: 0, opp: 1, order: 0, colors: {},
    rec: { cpu: [{ w: 0, l: 0 }, { w: 0, l: 0 }, { w: 0, l: 0 }], two: 0, cups: 0, cupPlays: 0 },
    trophies: [],                                   // ゆうしょう した ときの { team, level, date }
    kick: { n: zeros(), g: zeros(), m: zeros() },   // ねらった マス ごと の けった かず・はいった かず・はずれ（わく の そと）
    keep: { n: zeros(), s: zeros(), faced: 0, saved: 0 }, // とんだ マス（キッカー から みた むき）ごと の かず・とめた かず
  };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && typeof s === "object") {
      save = Object.assign(save, s);
      for (const k of ["kick", "keep"]) for (const f of ["n", "g", "m", "s"]) if (save[k][f] && save[k][f].length !== 9) save[k][f] = zeros();
    }
  } catch (e) { /* よめなくても あそべる */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }
  AU.set({ sound: save.sound, voice: save.voice });

  // ===== じっきょう =====
  function talk(text, opt) {
    $("talkText").innerHTML = text;
    $("talk").classList.toggle("hot", !!(opt && opt.hot));
    if (!opt || opt.say !== false) AU.speak(text);
  }

  // ===== がめん（まいフレーム えがく） =====
  V3.init($("cv"));
  const NOW = () => performance.now() / 1000;
  let scene = { view: "kicker", kicker: null, keeper: null, ball: null };
  let bigText = null, anim = null;
  let last = NOW();
  function frame() {
    const n = NOW(), dt = Math.min(0.05, n - last);
    last = n;
    if (anim) anim(dt * SPEED);
    V3.clear();
    scene.time = n;
    V3.drawScene(scene);
    if (scene.gauge) V3.drawGauge(scene.gauge.v, scene.gauge.zone);
    V3.drawFx(dt);
    if (bigText && n - bigText.t0 < bigText.dur) V3.big(bigText.text, bigText.color, n - bigText.t0, bigText.sub);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  new ResizeObserver(() => V3.resize()).observe($("stage"));
  window.addEventListener("resize", () => V3.resize());
  function showBig(text, color, dur, sub) { bigText = { text, color, sub, t0: NOW(), dur: dur || 1.7 }; }

  // ===== しあいの じょうたい・まちあわせ =====
  let G = null, lastShot = null, pendingShot = null;
  const ABORT = { abort: true };
  const pending = new Set();
  const alive = (g) => G && G === g && !g.dead;
  function sleep(ms) { const g = G; return new Promise((res) => setTimeout(res, ms / SPEED)).then(() => { if (!alive(g)) throw ABORT; }); }
  function raf() { const g = G; return new Promise((r) => requestAnimationFrame(r)).then(() => { if (!alive(g)) throw ABORT; }); }
  function waitInput(setup) {
    const g = G;
    return new Promise((res) => {
      const done = (v) => { pending.delete(done); res(v); };
      pending.add(done);
      setup(done);
    }).then((v) => { if (!alive(g)) throw ABORT; return v; });
  }
  function abortAll() { pending.forEach((d) => d(null)); pending.clear(); }

  // ===== チーム・いろ =====
  function teamObj(i, shirt) {
    const t = TEAMS[i];
    const s = shirt || t.shirt;
    return Object.assign({}, t, { idx: i, shirt: s, shorts: t.shorts, keeperShirt: keeperColor(s) });
  }
  function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function cdist(a, b) { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); }
  function keeperColor(shirt) {
    return ["#fab005", "#94d82d", "#ff8787", "#22b8cf", "#cc5de8"].reduce((best, c) => (cdist(c, shirt) > cdist(best, shirt) ? c : best), "#fab005");
  }
  const colorOf = (i) => save.colors[TEAMS[i].id] || TEAMS[i].shirt;
  // ふたつの チームの ユニフォームが にて いたら、あいては べつの いろ に する
  function pairTeams(i0, i1) {
    const a = teamObj(i0, colorOf(i0));
    let c1 = colorOf(i1);
    if (cdist(c1, a.shirt) < 90) c1 = [TEAMS[i1].shirt].concat(COLORS).find((c) => cdist(c, a.shirt) >= 90) || "#ffffff";
    return [a, teamObj(i1, c1)];
  }
  const tname = (t) => t.name + " チーム";

  // ===== うえの スコアボード =====
  function updBoard(g, kicking) {
    const b = R.board(g.kicks);
    const st = R.status(g.kicks);
    ["sbA", "sbB"].forEach((id, t) => {
      const el = $(id), tm = g.teams[t];
      el.querySelector(".em").textContent = tm.emoji;
      el.querySelector(".nm").textContent = tm.name + (g.mode === "duo" || g.mode === "pass" ? (t === g.p1 ? "（1P）" : "（2P）") : g.ctl[t] === "human" ? "（きみ）" : "");
      el.querySelector(".nm").style.color = tm.shirt === "#212529" ? "#fff" : V3.shade(tm.shirt, 0.35);
      el.querySelector(".marks").innerHTML = b[t].map((m, i) => `<i class="${m === "○" ? "o" : m === "×" ? "x" : ""}${i >= R.ROUNDS ? " sd" : ""}">${m === "・" ? "" : m}</i>`).join("");
      el.querySelector(".sc").textContent = st.score[t];
      el.classList.toggle("kick", kicking === t);
    });
  }

  // ===== パネル =====
  function showPane(id) { document.querySelectorAll(".pane").forEach((p) => { p.hidden = p.id !== id; }); }
  function setRole(text) { $("role").textContent = text || ""; }
  function updToggles() {
    $("bSound").textContent = save.sound ? "🔊" : "🔇";
    $("bVoice").textContent = save.voice ? "🗣️" : "🤐";
    $("mSound").textContent = save.sound ? "🔊 おと オン" : "🔇 おと オフ";
    $("mVoice").textContent = save.voice ? "🗣️ こえ オン" : "🤐 こえ オフ";
    $("bVoice").hidden = $("mVoice").hidden = !AU.hasVoice();
  }
  function toggleSound() { save.sound = !save.sound; store(); AU.set({ sound: save.sound }); updToggles(); if (save.sound) sfx.tap(); }
  function toggleVoice() { save.voice = !save.voice; store(); AU.set({ voice: save.voice }); updToggles(); if (save.voice) AU.speak("こえ オン"); }
  $("bSound").onclick = toggleSound; $("mSound").onclick = toggleSound;
  $("bVoice").onclick = toggleVoice; $("mVoice").onclick = toggleVoice;

  // キーパーの 9つの ボタン（がめんで みた むき。キーパー から みると みぎ ひだり が ぎゃく）
  const ARROWS = ["↖", "⬆", "↗", "⬅", "●", "➡", "↙", "⬇", "↘"];
  function makeDive(el, onPick) {
    el.innerHTML = "";
    ARROWS.forEach((a, i) => {
      const b = document.createElement("button");
      b.textContent = a; b.dataset.i = i;
      b.setAttribute("aria-label", ["ひだり うえ", "うえ", "みぎ うえ", "ひだり", "まんなか", "みぎ", "ひだり した", "した", "みぎ した"][i] + "に とぶ");
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); onPick(i, b); });
      el.appendChild(b);
    });
  }
  // キーパーから みた マス（がめん）→ キッカーから みた マス（ぶつり）
  const mirror = (i) => Math.floor(i / 3) * 3 + (2 - (i % 3));
  let diveHandler = null, duoHandler = null;
  makeDive($("diveGrid"), (i, b) => { if (diveHandler) diveHandler(i, b); });
  makeDive($("duoGrid"), (i, b) => { if (duoHandler) duoHandler(i, b); });

  // ===== ステージの ゆび =====
  let ptr = null;          // いま なぞって いる ゆび
  let stageMode = null;    // "aim" / "easyPick" / "easyPower" / "dive" / null
  let stageCb = null;
  function local(e) { const r = $("cv").getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; }
  $("stage").addEventListener("pointerdown", (e) => {
    if (!stageMode) return;
    e.preventDefault();
    const p = local(e);
    if (stageMode === "aim") {
      const W = V3.size().W, H = V3.size().H, b = V3.ballScreen();
      if (G && G.mode === "duo" && p.x > W / 2 && W > 700) return;    // 2人 どうじ: ひだり はんぶん だけ
      if (Math.hypot(p.x - b.x, p.y - b.y) > Math.max(110, b.r * 6) && p.y < H * 0.55) return; // ボールの ちかく から
    }
    ptr = { id: e.pointerId, pts: [p] };
    try { $("stage").setPointerCapture(e.pointerId); } catch (er) { /* むし */ }
    if (stageMode === "aim") scene.swipe = [p];
  });
  $("stage").addEventListener("pointermove", (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    e.preventDefault();
    const p = local(e);
    ptr.pts.push(p);
    if (stageMode === "aim") scene.swipe = ptr.pts.slice(-40);
  });
  function endPtr(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    const p = local(e);
    if (e.type === "pointerup") ptr.pts.push(p);
    const pts = ptr.pts; ptr = null;
    if (stageCb) stageCb(pts, e.type === "pointerup");
  }
  $("stage").addEventListener("pointerup", endPtr);
  $("stage").addEventListener("pointercancel", endPtr);

  // スワイプ → シュート
  //   むき → よこ、おわった たかさ → たかさ（ゴールまで とどかない みじかい スワイプは ひくい ゴロ）、はやさ → つよさ、まがりかた → カーブ
  function swipeToShot(pts) {
    if (pts.length < 2) return null;
    V3.setCam("kicker");
    const a = pts[0], b = pts[pts.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    if (len < 28 || dy > -18) return null;
    // はやさ: さいごの 160ms くらいの はやさ と ぜんたい の はやさ の おおきい ほう（ゆっくり はじめて シュッ！ も つよく なる）
    const H = V3.size().H;
    const dur = Math.max(0.03, (b.t - a.t) / 1000);
    let k = pts.length - 1;
    while (k > 0 && b.t - pts[k].t < 160) k--;
    const tail = Math.hypot(b.x - pts[k].x, b.y - pts[k].y) / Math.max(0.03, (b.t - pts[k].t) / 1000);
    const v = Math.max(len / dur, tail * 0.9) / H;      // がめんの たかさ / びょう
    const power = P.clamp(0.36 + (v - 0.8) * 0.2, 0.2, 1.45);    // スマホで 258px の スワイプ: 0.3びょう → 0.46、0.15びょう → 0.73、0.1びょう → 1.0（これより はやいと ふかしやすい）
    const g = V3.goalRect();
    let ex = b.x, ey = b.y, ground = false;
    if (ey > g.y1) { const f = (a.y - g.y1) / (a.y - b.y); ex = a.x + dx * f; ey = g.y1; ground = true; }
    const w = V3.unprojectGoal(ex, ey);
    // まがりかた: ゆびの みちすじ が はじめと おわりを むすぶ せん から どれだけ はなれたか
    let dev = 0;
    for (const p of pts) {
      const c = ((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
      if (Math.abs(c) > Math.abs(dev)) dev = c;
    }
    const curve = Math.abs(dev) / len < 0.06 ? 0 : P.clamp((dev / len) * 4, -1, 1);
    return { tx: w.x, ty: ground ? 0.15 : Math.max(0.15, w.y), power, curve };
  }

  // ===== にんげんの キッカー =====
  function humanAimSwipe(g) {
    stageMode = "aim";
    showPane("pKick"); $("bFeint").hidden = true;
    $("kickHint").innerHTML = "ボールから ねらう ところへ スワイプ！<br><small>はやく スワイプ → つよい ／ まげて スワイプ → カーブ</small>";
    $("swipeHint").hidden = false;
    return waitInput((done) => {
      stageCb = (pts, ok) => {
        scene.swipe = null;
        const shot = ok ? swipeToShot(pts) : null;
        if (!shot) { talk("ボールから ゴールの ほうへ、うえに シュッ！と スワイプしてね", { say: false }); return; }
        stageMode = null; stageCb = null; $("swipeHint").hidden = true;
        pendingShot = shot;
        done(shot);
      };
    }).finally(() => { stageMode = null; stageCb = null; $("swipeHint").hidden = true; scene.swipe = null; });
  }
  // かんたん: 9マス を タップ → ゲージを とめる
  async function humanAimEasy(g) {
    showPane("pEasy"); $("bStop").hidden = true; $("bFeint2").hidden = true;
    $("easyHint").textContent = "ゴールの ねらう マスを タップ！";
    scene.grid = { pick: null };
    stageMode = "easyPick";
    const cell = await waitInput((done) => {
      stageCb = (pts) => {
        V3.setCam("kicker");
        const p = pts[pts.length - 1], gr = V3.goalRect();
        const mx = (gr.x1 - gr.x0) * 0.08, my = (gr.y1 - gr.y0) * 0.15;
        if (p.x < gr.x0 - mx || p.x > gr.x1 + mx || p.y < gr.y0 - my || p.y > gr.y1 + my) { talk("ゴールの なかの マスを タップしてね", { say: false }); return; }
        const c = P.clamp(Math.floor((p.x - gr.x0) / ((gr.x1 - gr.x0) / 3)), 0, 2), r = P.clamp(Math.floor((p.y - gr.y0) / ((gr.y1 - gr.y0) / 3)), 0, 2);
        done(r * 3 + c);
      };
    }).finally(() => { stageMode = null; stageCb = null; });
    scene.grid.pick = cell; sfx.pick();
    $("easyHint").textContent = "ゲージが みどりの ときに とめよう！";
    $("bStop").hidden = false;
    const zone = [0.55, 0.98];
    scene.gauge = { v: 0, zone };
    let tt = 0;
    anim = (dt) => { tt += dt / SPEED; const ph = (tt / 1.5) % 2; scene.gauge.v = (ph < 1 ? ph : 2 - ph) * 1.3; };
    stageMode = "easyPower";
    const power = await waitInput((done) => {
      const stop = () => done(scene.gauge.v);
      $("bStop").onclick = stop;
      stageCb = stop;
    }).finally(() => { stageMode = null; stageCb = null; anim = null; $("bStop").onclick = null; $("bStop").hidden = true; });
    sfx.pick();
    await sleep(350);
    scene.gauge = null; scene.grid = null;
    const c = P.cellCenter(cell);
    return { tx: c.x + P.gauss(Math.random) * 0.18, ty: Math.max(0.15, c.y + P.gauss(Math.random) * 0.12), power, curve: 0 };
  }

  // ===== じょそう（はしって くる） =====
  // kicker の いち を うごかして、ける しゅんかん で おわる。feintBtn が あれば 1かい だけ フェイント できる
  const RUN = 1.15;
  function runup(g, o) {
    const k = scene.kicker;
    const sx = k.x, sz = k.z, ex = -0.38, ez = -0.32;
    let t = 0, stutter = 0, feinted = false, kickSent = false;
    const btn = o.feintBtn;
    if (btn) { btn.hidden = false; btn.disabled = false; }
    return waitInput((done) => {
      const doFeint = () => {
        if (feinted || t > RUN * 0.85) return;
        feinted = true; stutter = 0.6; btn && (btn.disabled = true);
        talk("フェイント！", { say: false }); sfx.whoosh();
        if (o.onFeint) o.onFeint();
      };
      if (btn) btn.onclick = doFeint;
      if (o.cpuFeint) setTimeout(() => { if (!feinted) doFeint(); }, RUN * 500 / SPEED);
      let stepAcc = 0;
      anim = (dt) => {
        if (stutter > 0) { stutter -= dt; k.pose = "stutter"; k.phase += dt * 3; if (o.tick) o.tick(dt, true); return; }
        t += dt;
        const f = Math.min(1, t / RUN);
        k.x = sx + (ex - sx) * f; k.z = sz + (ez - sz) * f;
        k.pose = "run"; k.phase += dt * 15;
        stepAcc += dt; if (stepAcc > 0.22) { stepAcc = 0; sfx.step(); }
        if (o.tick) o.tick(dt, false);
        if (f >= 1 && !kickSent) { kickSent = true; anim = null; done(true); }
      };
    }).finally(() => { anim = null; if (btn) { btn.hidden = true; btn.onclick = null; } });
  }

  // ===== ボールが とぶ =====
  //   o.human … にんげんの キーパー（とちゅうで とべる）、o.slow … ゆっくり（かんたん モードの キーパー）
  async function flight(g, sim, o) {
    const k = scene.kicker;
    k.pose = "kick"; k.kickT = 0;
    sfx.kick(sim.shot.power);
    scene.ball = { x: 0, y: P.BALL_R, z: 0, rot: 0, trail: [] };
    let seen = 0, dove = sim.plan.cell != null && sim.plan.cell !== 4 && sim.plan.t0 <= 0;
    const ts = o.slow || 1;
    while (!sim.done) {
      await raf();
      const dt = Math.min(0.05, 1 / 60) * SPEED * ts;
      k.kickT = Math.min(1, k.kickT + dt * 3);
      P.stepShot(sim, dt);
      const b = scene.ball;
      b.x = sim.pos.x; b.y = sim.pos.y; b.z = sim.pos.z;
      b.rot += Math.hypot(sim.vel.x, sim.vel.z) * dt * 2;
      b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
      if (sim.netted || sim.caught) b.trail = [];
      scene.keeper.pose = P.keeperPose(sim.plan, sim.t);
      if (!dove && sim.plan.cell != null && sim.plan.cell !== 4 && sim.t >= sim.plan.t0) { dove = true; talk("キーパー、とんだー！", { say: false }); sfx.whoosh(); }
      while (seen < sim.events.length) {
        const e = sim.events[seen++];
        if (e.type === "post" || e.type === "bar") { sfx.post(); scene.postShake = { t0: NOW() }; talk("カーン！", { say: false }); }
        else if (e.type === "catch") sfx.catch();
        else if (e.type === "parry" || e.type === "tip") sfx.parry();
        else if (e.type === "goal") { sfx.net(); scene.net = { x: e.x, y: e.y, t0: NOW() }; }
      }
      if (o.onStep) o.onStep(sim);
    }
    return sim.result;
  }

  // ===== けっかの ことば =====
  function resultWords(res, kickerHuman, keeperHuman) {
    const d = res.detail;
    if (res.goal) {
      if (d === "goal_post") return { big: "ゴール！", sub: "ポストに あたって はいった！", talk: "カーン！ ポストに あたって… はいったー！ ゴール！" };
      if (d === "goal_touch") return { big: "ゴール！", sub: "さわったけど はいった！", talk: "キーパー さわった！ でも はいったー！ ゴール！" };
      return { big: "ゴーーール！", sub: "", talk: "きまったー！ ゴール！" };
    }
    if (d === "catch") return { big: "キャッチ！", sub: "ナイス キーパー！", talk: "キーパー、とんだー！ キャッチ！ とめたー！", save: true };
    if (d === "parry") return { big: "セーブ！", sub: "はじいた！", talk: "キーパー、とんだー！ はじいたー！ ナイスセーブ！", save: true };
    if (d === "post") return { big: "カーン！", sub: keeperHuman ? "ポストに たすけられた！" : "おしい！ ポスト！", talk: keeperHuman ? "カーン！ ポストに たすけられたー！" : "カーン！ ポストに あたった！ おしい！" };
    if (d === "over") return { big: "おしい！", sub: "バーの うえ", talk: "あーっと、バーの うえだー！ おしい！" };
    return { big: "おしい！", sub: "ゴールの よこ", talk: "あーっと、ゴールの よこ！ おしい！" };
  }

  // ===== 1本 =====
  const rnd = Math.random;
  function setFigures(view, kT, gT, startX) {
    scene.view = view;
    scene.boardColors = [kT.shirt, "#ffffff", gT.shirt, "#ffffff"];
    scene.kicker = { x: startX, z: -1.25, pose: "stand", phase: 0, kickT: 0, shirt: kT.shirt, shorts: kT.shorts, head: kT.head, num: 10, look: 0, lean: 0, mood: "focus" };
    scene.keeper = { pose: null, mood: "ready", shirt: gT.keeperShirt, shorts: gT.shorts, head: gT.head, size: gT.size };
    scene.ball = { x: 0, y: P.BALL_R, z: 0, rot: 0, trail: [] };
    scene.net = null; scene.postShake = null; scene.swipe = null; scene.grid = null; scene.gauge = null; scene.cheer = 0;
  }
  function passScreen(title, text) {
    $("passTitle").textContent = title; $("passText").innerHTML = text;
    $("pass").classList.add("show");
    showPane("pWait"); $("waitHint").textContent = "じゅんびが できたら ボタンを おしてね";
    return waitInput((done) => { $("passGo").onclick = () => { sfx.tap(); done(true); }; })
      .finally(() => { $("pass").classList.remove("show"); $("passGo").onclick = null; });
  }

  async function playKick(g, t) {
    const d = 1 - t;
    const kT = g.teams[t], gT = g.teams[d];
    const kH = g.ctl[t] === "human", gH = g.ctl[d] === "human";
    const duo = g.mode === "duo", pass = g.mode === "pass";
    const kl = g.levels[t], gl = g.levels[d];
    const st = R.status(g.kicks);
    bigText = null;
    updBoard(g, t);
    const pr = R.pressure(g.kicks);
    const no = Math.min(st.round, 99);
    const head = st.sudden ? "サドンデス！ " : no + "ばんめ。";
    const kickerLabel = tname(kT) + "の キッカー";
    // いち に つく
    let cell = null, tells = { run: 0, look: 0, body: 0 }, shot;
    if (!kH) { cell = A.cpuCell(kT, kl, rnd); tells = A.tells(cell, kl, rnd); }
    // くせ（はしって くる むき）: おおきく ななめ から はしって くる → みぎへ、まっすぐ → ひだりへ けりやすい（キッカー から みて）
    setFigures(kH ? "kicker" : "keeper", kT, gT, kH ? -1.0 : -0.75 - 0.5 * tells.run);
    if (gH) scene.keeper.size = gT.size * A.HUMAN_KEEPER.reach;   // にんげんの キーパーは て が すこし ながい
    const role = kH && !gH ? "きみは キッカー ⚽" : gH && !kH ? "きみは キーパー 🧤" : "⚽ " + kT.name + " → 🧤 " + gT.name;
    setRole(role);
    let line = head + kickerLabel + "。";
    if (pr === "win") line += " きめれば かち！";
    else if (pr === "lose") line += " はずすと まけ…！";
    talk(line, { hot: !!pr });

    // ----- キッカーが ねらう -----
    let duoPick = null;
    const keeperCellsH = []; // にんげんの キーパーの むき（ぶつり の マス）
    if (duo) {
      // キーパー（2P）は いつでも えらべる（けるまで）
      $("app").classList.add("duo");
      $("duoKeeperName").textContent = gT.emoji + " " + tname(gT);
      $("duoState").textContent = "まだ えらんで いないよ";
      $("duoLeft").hidden = false;
      duoHandler = (i) => { duoPick = i; sfx.tap(); $("duoState").textContent = "えらんだ！ 🤫（けるまで かえられるよ）"; };
    }
    if (kH) {
      if (pass) await passScreen("つぎは " + kT.emoji + " " + tname(kT) + " の キッカー", "キーパーの ひとは みないでね 🙈");
      if (duo) { showPane("pDuo"); }
      shot = save.easy && !duo ? await humanAimEasy(g) : save.easy && duo ? await humanAimEasyDuo(g) : duo ? await humanAimSwipeDuo(g) : await humanAimSwipe(g);
      cell = P.cellOf(shot.tx, shot.ty);
    } else {
      await sleep(700);
      shot = A.cpuShotFor(cell, kl, rnd);
    }
    // ----- キーパーの じゅんび -----
    let cpuDive = null;
    if (!gH) cpuDive = A.cpuKeeper(gl, shot, kT.kuse, kH ? save.kick.n : null, false, rnd);
    let hDive = null;   // にんげんの キーパー: { cell, tRel }
    let runClock = 0, kickAt = RUN;
    if (pass && kH) {
      await passScreen("つぎは " + gT.emoji + " " + tname(gT) + " の キーパー", "キッカーが はしって きたら、とぶ むきに スワイプ！");
    }
    const keeperView = gH && !duo;
    if (keeperView) {
      scene.view = "keeper";
      setRole(pass ? "🧤 " + tname(gT) + " の キーパー" : "きみは キーパー 🧤");
      showPane("pKeep");
      $("keepHint").textContent = "とぶ むきに スワイプ！（ボタンでも OK）";
      $("keepTip").hidden = false;
      document.querySelectorAll("#diveGrid button").forEach((b) => { b.disabled = false; b.classList.remove("on"); });
    } else if (!duo) {
      showPane("pKick");
      $("kickHint").innerHTML = save.easy ? "" : "はしって いる あいだに 1かい だけ <b>フェイント</b> できるよ";
    }
    // くせ を みせる（キーパー から みえる）
    scene.kicker.look = tells.look; scene.kicker.lean = tells.body * 0.8;
    // にんげんの キーパーが とぶ
    let simRef = null;
    const humanDive = (screenCell, btn) => {
      if (hDive) return;
      const c = mirror(screenCell);
      if (btn) btn.classList.add("on");
      document.querySelectorAll("#diveGrid button").forEach((b) => { b.disabled = true; });
      if (simRef) {
        hDive = { cell: c, tRel: simRef.t };
        simRef.keeper.dive = { cell: c, t: simRef.t + 0.03 };
        simRef.plan = P.keeperPlan(simRef.keeper);
      } else {
        hDive = { cell: c, tRel: runClock - kickAt };
        talk("キーパー、うごいた！", { say: false });
      }
      sfx.whoosh();
      keeperCellsH.push(c);
    };
    if (keeperView) {
      diveHandler = (i, b) => humanDive(i, b);
      stageMode = "dive";
      stageCb = (pts) => {
        const a = pts[0], b = pts[pts.length - 1];
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        let c = 1, r = 1;
        if (len >= 24) {
          if (dx / len > 0.38) c = 2; else if (dx / len < -0.38) c = 0;
          if (-dy / len > 0.38) r = 0; else if (-dy / len < -0.38) r = 2;
        }
        humanDive(r * 3 + c, null);
      };
    }
    // ----- じょそう -----
    const preview = () => {
      // けるまえ: キーパーの かたち（はやく とんだ とき は うごきだす）
      const plan = P.keeperPlan({ size: scene.keeper.size, dive: gH ? (hDive ? { cell: hDive.cell, t: hDive.tRel } : null) : cpuDive });
      scene.keeper.pose = P.keeperPose(plan, runClock - kickAt);
    };
    const feintBtn = kH && !duo ? (save.easy ? $("bFeint2") : $("bFeint")) : kH && duo ? $("bFeint") : null;
    if (kH && duo) showPane("pDuo");
    if (kH && !keeperView && !duo) showPane(save.easy ? "pEasy" : "pKick");
    if (kH && save.easy && !duo) $("easyHint").textContent = "はしって いる あいだに 1かい だけ フェイント できるよ";
    // CPU キッカーも ときどき フェイント
    const cpuFeint = !kH && rnd() < [0.05, 0.12, 0.2][kl];
    await runup(g, {
      feintBtn: kH ? feintBtn : null,
      cpuFeint,
      onFeint: () => {
        kickAt += 0.6;
        if (!gH) cpuDive = A.cpuKeeper(gl, shot, kT.kuse, kH ? save.kick.n : null, true, rnd);
      },
      tick: (dt) => { runClock += dt; preview(); },
    });
    stageMode = keeperView ? "dive" : null;
    kickAt = runClock;
    // キーパーが はやく うごきすぎたら、CPU キッカーは ぎゃく を つく
    if (!kH && gH && hDive && hDive.tRel < A.HUMAN_KEEPER.early) {
      const c2 = A.exploitHuman(cell, hDive.cell, kl, rnd);
      if (c2 !== cell) { cell = c2; shot = A.cpuShotFor(c2, kl, rnd); }
    }
    let dive;
    if (duo) dive = duoPick != null ? { cell: mirror(duoPick), t: 0.02 } : null;
    else if (gH) dive = hDive ? { cell: hDive.cell, t: hDive.tRel } : null;
    else dive = cpuDive;
    if (duo) { duoHandler = null; if (duoPick != null) keeperCellsH.push(mirror(duoPick)); }
    const keeper = gH ? A.humanKeeperOf(gT, dive || { cell: null, t: 0 }) : A.keeperOf(gT, gl, dive || { cell: null, t: 0 });
    const sim = P.createShot(shot, keeper, Math.floor(rnd() * 1e9));
    simRef = sim; lastShot = shot;
    talk(kickerLabel + "、けったー！", { say: false });
    const res = await flight(g, sim, { slow: keeperView ? (save.easy ? A.HUMAN_KEEPER.slowEasy : A.HUMAN_KEEPER.slow) : 1 });
    stageMode = null; stageCb = null; diveHandler = null; simRef = null;
    document.querySelectorAll("#diveGrid button").forEach((b) => { b.disabled = true; });

    // ----- けっか -----
    const w = resultWords(res, kH, gH);
    const kickerMood = res.goal ? "joy" : "sad";
    showBig(w.big, res.goal ? "#ffd43b" : w.save ? "#74c0fc" : "#ffffff", 1.9, w.sub);
    talk(w.talk, { hot: res.goal || w.save });
    if (res.goal) { sfx.cheer(); V3.burst(140); scene.cheer = 1; }
    else if (w.save) { sfx.wow(); scene.cheer = 0.6; }
    else sfx.ooh();
    // キーパーは たおれて → たちあがって ガッツポーズ（セーブ）／ しょんぼり（ゴール）
    const lateral = sim.plan.cell != null && sim.plan.cell % 3 !== 1;
    let tt = 0;
    anim = (dt) => {
      tt += dt;
      if (lateral && tt < 0.9) scene.keeper.fall = Math.min(1, tt * 2.5);
      if (tt > 0.9) { scene.keeper.fall = 0; scene.keeper.mood = res.goal ? "sad" : w.save ? "joy" : "ready"; }
      if (tt > 0.5) { scene.kicker.pose = kickerMood; scene.kicker.mood = kickerMood; }
    };
    // きろく
    if (kH && !g.noRecord) {
      save.kick.n[cell]++;
      if (res.goal) save.kick.g[cell]++;
      else if (res.kind !== "save") save.kick.m[cell]++;
    }
    if (gH && !g.noRecord) {
      save.keep.faced++;
      if (!res.goal) save.keep.saved += w.save ? 1 : 0;
      const kc = keeperCellsH.length ? keeperCellsH[0] : 4;
      save.keep.n[kc]++;
      if (w.save) save.keep.s[kc]++;
    }
    store();
    await sleep(2300);
    anim = null; scene.cheer = 0;
    $("app").classList.remove("duo"); $("duoLeft").hidden = true;
    return res.goal;
  }
  // 2人 どうじ の キッカー（ひだり はんぶん で スワイプ）
  function humanAimSwipeDuo(g) {
    showPane("pDuo");
    stageMode = "aim";
    return waitInput((done) => {
      stageCb = (pts, ok) => {
        scene.swipe = null;
        const shot = ok ? swipeToShot(pts) : null;
        if (!shot) { talk("ボールから ゴールの ほうへ、うえに シュッ！と スワイプしてね", { say: false }); return; }
        pendingShot = shot;
        done(shot);
      };
    }).finally(() => { stageMode = null; stageCb = null; $("swipeHint").hidden = true; scene.swipe = null; });
  }
  async function humanAimEasyDuo(g) {
    const s = await humanAimEasy(g);
    showPane("pDuo");
    return s;
  }

  // ===== しあい =====
  async function runMatch(g) {
    updBoard(g, 0);
    setFigures("kicker", g.teams[0], g.teams[1], -1.0);
    showPane("pWait"); $("waitHint").textContent = "PK せん が はじまるよ！";
    sfx.whistle(true);
    talk("PK せん、スタート！ " + tname(g.teams[0]) + " たい " + tname(g.teams[1]) + "！");
    await sleep(1800);
    for (let guard = 0; guard < 80; guard++) {
      const st = R.status(g.kicks);
      if (st.over) break;
      if (st.sudden && g.kicks[0].length === R.ROUNDS && g.kicks[1].length === R.ROUNDS) {
        talk("5本ずつ けって どうてん！ サドンデスだ！", { hot: true });
        showBig("サドンデス！", "#ff8787", 1.8, "きめて とめた ほうが かち");
        sfx.whistle();
        await sleep(2000);
      }
      const goal = await playKick(g, st.next);
      g.kicks[st.next].push(goal);
      updBoard(g, null);
    }
    const st = R.status(g.kicks);
    sfx.whistle(true);
    await sleep(600);
    return st;
  }

  function boardHTML(g) {
    const b = R.board(g.kicks), st = R.status(g.kicks);
    return [0, 1].map((t) => `<div class="r"><span class="em">${g.teams[t].emoji}</span>${b[t].map((m) => `<i class="${m === "○" ? "o" : m === "×" ? "x" : ""}">${m === "・" ? "" : m}</i>`).join("")}<b>${st.score[t]}</b></div>`).join("");
  }

  function newGame(mode, teams, ctl, levels, extra) {
    endGame();
    const g = Object.assign({ mode, teams, ctl, levels, kicks: [[], []], dead: false, p1: 0 }, extra || {});
    V3.clearFx();
    G = g;
    return g;
  }
  function endGame() {
    if (G) { G.dead = true; abortAll(); }
    G = null; anim = null; stageMode = null; stageCb = null; diveHandler = null; duoHandler = null; ptr = null;
    $("app").classList.remove("duo"); $("duoLeft").hidden = true; $("swipeHint").hidden = true;
    bigText = null;
  }

  // 1にん・2にん の しあい
  async function startMatch() {
    const mode = setupMode;
    const meFirst = save.order === 0;
    const [mine, opp] = pairTeams(save.my, save.opp);
    const teams = meFirst ? [mine, opp] : [opp, mine];
    const human = meFirst ? 0 : 1;
    let ctl, levels;
    if (mode === "cpu") { ctl = [0, 1].map((t) => (t === human ? "human" : "cpu")); levels = [save.level, save.level]; }
    else { ctl = ["human", "human"]; levels = [1, 1]; }
    const g = newGame(mode, teams, ctl, levels, { p1: human });
    closeAll();
    try {
      const st = await runMatch(g);
      finishMatch(g, st);
    } catch (e) { if (e !== ABORT) throw e; }
  }
  function finishMatch(g, st) {
    const win = st.winner;
    const W = g.teams[win];
    let title, text, emoji;
    if (g.mode === "cpu" || g.mode === "cup") {
      const human = g.ctl[0] === "human" ? 0 : 1;
      const youWin = win === human;
      emoji = youWin ? "🎉" : "🤝";
      title = youWin ? "かった！" : "まけちゃった…";
      text = youWin ? tname(W) + " の かち！ よく がんばったね！" : "おしかったね！ " + tname(W) + " の かち。つぎは きっと かてるよ！";
      if (g.mode === "cpu") { const r = save.rec.cpu[save.level]; if (youWin) r.w++; else r.l++; }
      if (youWin) { sfx.fanfare(); V3.burst(200); } else sfx.end();
    } else {
      emoji = "🏅";
      title = tname(W) + "（" + (win === g.p1 ? "1P" : "2P") + "）の かち！";
      text = "どっちも ナイスファイト！";
      save.rec.two++;
      sfx.fanfare(); V3.burst(200);
    }
    store();
    talk(title + " " + text, { hot: true });
    $("resEmoji").textContent = emoji;
    $("resTitle").textContent = title;
    $("resText").textContent = text;
    $("resBoard").innerHTML = boardHTML(g);
    const btns = $("resBtns");
    btns.innerHTML = "";
    const mk = (label, cls, fn) => { const b = document.createElement("button"); b.className = "btn " + cls; b.textContent = label; b.onclick = () => { sfx.tap(); fn(); }; btns.appendChild(b); };
    if (g.mode === "cup") {
      const human = g.ctl[0] === "human" ? 0 : 1;
      mk(st.winner === human ? "つぎへ ▶" : "けっかを みる", "red", () => cupAfter(st.winner === human, g));
    } else {
      mk("🏠 メニュー", "", toMenu);
      mk("🔁 もういちど", "red", () => { $("result").classList.remove("show"); startMatch(); });
    }
    $("result").classList.add("show");
  }

  // ===== たいかい（8チーム トーナメント） =====
  let CUP = null;
  function startCup() {
    const others = TEAMS.map((t, i) => i).filter((i) => i !== save.my);
    for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
    const slots = others.slice();
    slots.splice(Math.floor(Math.random() * 8), 0, save.my);
    CUP = { rounds: [slots], scores: [], level: save.level, out: false, champ: null };
    save.rec.cupPlays++; store();
    closeAll();
    showCup();
  }
  const ROUND_NAME = ["じゅんじゅんけっしょう", "じゅんけっしょう", "けっしょう"];
  function cupLevel(r) { return Math.min(2, CUP.level + (r === 2 ? 1 : 0)); }
  function showCup() {
    const br = $("bracket");
    const r = CUP.rounds.length - 1;
    let h = "";
    for (let c = 0; c < 3; c++) {
      const list = CUP.rounds[c];
      h += `<div class="col"><div class="ttl">${ROUND_NAME[c]}</div>`;
      if (list) {
        for (let m = 0; m < list.length; m += 2) {
          const next = CUP.rounds[c + 1];
          const row = (i) => {
            const ti = list[i];
            const lost = next && !next.includes(ti);
            const sc = CUP.scores[c] && CUP.scores[c][m / 2] ? " " + CUP.scores[c][m / 2][i % 2] : "";
            return `<div class="t${ti === save.my ? " me" : ""}${lost ? " lose" : ""}"><span class="em">${TEAMS[ti].emoji}</span>${TEAMS[ti].name}${sc}</div>`;
          };
          h += `<div class="m">${row(m)}${row(m + 1)}</div>`;
        }
      }
      h += "</div>";
    }
    h += `<div class="col"><div class="ttl">ゆうしょう</div><div class="champ">${CUP.champ != null ? TEAMS[CUP.champ].emoji + "🏆" : "🏆"}</div></div>`;
    br.innerHTML = h;
    const btns = $("cupBtns"); btns.innerHTML = "";
    const mk = (label, cls, fn) => { const b = document.createElement("button"); b.className = "btn " + cls; b.textContent = label; b.onclick = () => { sfx.tap(); fn(); }; btns.appendChild(b); };
    if (CUP.champ != null || CUP.out) {
      $("cupTitle").textContent = CUP.champ === save.my ? "🏆 ゆうしょう！" : "たいかい おわり";
      $("cupText").innerHTML = CUP.champ === save.my
        ? "3かい かって ゆうしょう！ トロフィー ゲット！ 🏆<br>（トロフィー: " + save.trophies.length + "こ）"
        : "ここまで よく がんばったね！ また ちょうせん しよう。";
      mk("🏠 メニュー", "", toMenu);
      mk("🔁 もういちど", "red", () => startCup());
    } else {
      const list = CUP.rounds[r];
      const at = list.indexOf(save.my), oppIdx = list[at % 2 === 0 ? at + 1 : at - 1];
      $("cupTitle").textContent = "🏆 たいかい: " + ROUND_NAME[r];
      $("cupText").innerHTML = "つぎの あいては " + TEAMS[oppIdx].emoji + " <b>" + tname(TEAMS[oppIdx]) + "</b>（" + A.LEVEL_NAME[cupLevel(r)] + "）<br><small>くせ: " + TEAMS[oppIdx].word + "</small>";
      mk("🏠 やめる", "", toMenu);
      mk("⚽ しあい スタート！", "red", () => playCup(oppIdx, r));
    }
    $("cup").classList.add("show");
  }
  async function playCup(oppIdx, r) {
    const meFirst = save.order === 0;
    const [mine, opp] = pairTeams(save.my, oppIdx);
    const teams = meFirst ? [mine, opp] : [opp, mine];
    const human = meFirst ? 0 : 1;
    const lv = cupLevel(r);
    const g = newGame("cup", teams, [0, 1].map((t) => (t === human ? "human" : "cpu")), [lv, lv], { p1: human, cupRound: r, oppIdx });
    closeAll();
    try {
      const st = await runMatch(g);
      finishMatch(g, st);
    } catch (e) { if (e !== ABORT) throw e; }
  }
  function cupAfter(won, g) {
    $("result").classList.remove("show");
    const r = g.cupRound;
    const list = CUP.rounds[r];
    const next = [], scores = [];
    const human = g.ctl[0] === "human" ? 0 : 1;
    for (let m = 0; m < list.length; m += 2) {
      const a = list[m], b = list[m + 1];
      if (a === save.my || b === save.my) {
        const st = R.status(g.kicks);
        const myScore = st.score[human], opScore = st.score[1 - human];
        scores.push(a === save.my ? [myScore, opScore] : [opScore, myScore]);
        next.push(won ? save.my : g.oppIdx);
      } else {
        const lv = cupLevel(r);
        const sim = A.simulateShootout([TEAMS[a], TEAMS[b]], [lv, lv], Math.random, R);
        scores.push(sim.score);
        next.push(sim.winner === 0 ? a : b);
      }
    }
    CUP.scores[r] = scores;
    CUP.rounds.push(next);
    if (!won) CUP.out = true;
    if (next.length === 1) {
      CUP.champ = next[0];
      if (CUP.champ === save.my) {
        save.rec.cups++;
        save.trophies.push({ team: TEAMS[save.my].id, level: CUP.level, date: new Date().toISOString().slice(0, 10) });
        store();
        sfx.fanfare(); V3.burst(260);
        talk("ゆうしょう！ トロフィー ゲット！", { hot: true });
      }
    }
    // まけた ときも のこりの しあいを すすめて ゆうしょうを きめる
    if (CUP.out && CUP.champ == null) {
      while (CUP.rounds[CUP.rounds.length - 1].length > 1) {
        const rr = CUP.rounds.length - 1, L = CUP.rounds[rr], nx = [], sc = [];
        for (let m = 0; m < L.length; m += 2) {
          const sim = A.simulateShootout([TEAMS[L[m]], TEAMS[L[m + 1]]], [cupLevel(rr), cupLevel(rr)], Math.random, R);
          sc.push(sim.score); nx.push(sim.winner === 0 ? L[m] : L[m + 1]);
        }
        CUP.scores[rr] = sc; CUP.rounds.push(nx);
      }
      CUP.champ = CUP.rounds[CUP.rounds.length - 1][0];
    }
    endGame();
    showCup();
  }

  // ===== メニュー・じゅんび =====
  let setupMode = "cpu";
  function closeAll() { document.querySelectorAll(".overlay").forEach((o) => o.classList.remove("show")); }
  function toMenu() {
    endGame(); closeAll(); CUP = null;
    setRole(""); showPane("pWait"); $("waitHint").textContent = "メニューから えらんでね";
    setFigures("kicker", teamObj(save.my, colorOf(save.my)), teamObj(save.opp, colorOf(save.opp)), -1.0);
    updBoardIdle();
    $("menu").classList.add("show");
    const n = save.trophies.length;
    $("mTrophy").textContent = n ? "🏆".repeat(Math.min(n, 10)) + (n > 10 ? " ×" + n : "") + " ゆうしょう " + n + "かい" : "";
    talk("PK たいけつ！", { say: false });
  }
  function updBoardIdle() {
    const g = { mode: "cpu", teams: pairTeams(save.my, save.opp), ctl: ["human", "cpu"], kicks: [[], []], p1: 0 };
    updBoard(g, null);
  }
  function teamButtons(el, key, other) {
    el.innerHTML = "";
    TEAMS.forEach((t, i) => {
      const b = document.createElement("button");
      b.className = "team" + (save[key] === i ? " on" : "");
      b.innerHTML = `<span class="em">${t.emoji}</span>${t.name}<span class="bar" style="background:${colorOf(i)}"></span>`;
      b.disabled = other != null && save[other] === i;
      b.onclick = () => { sfx.tap(); save[key] = i; store(); renderSetup(); };
      el.appendChild(b);
    });
  }
  function colorRow(el, key) {
    const id = TEAMS[save[key]].id;
    el.innerHTML = '<span class="lbl">ユニフォーム:</span>';
    const cur = colorOf(save[key]);
    COLORS.forEach((c) => {
      const b = document.createElement("button");
      b.className = "sw" + (c === cur ? " on" : "");
      b.style.background = c;
      b.setAttribute("aria-label", "いろ");
      b.onclick = () => { sfx.tap(); save.colors[id] = c; store(); renderSetup(); };
      el.appendChild(b);
    });
  }
  function segInit(id, key) {
    document.querySelectorAll("#" + id + " button").forEach((b) => {
      b.classList.toggle("on", Number(b.dataset.v) === Number(save[key]));
      b.onclick = () => { sfx.tap(); save[key] = Number(b.dataset.v); store(); segInit(id, key); };
    });
  }
  function renderSetup() {
    const m = setupMode;
    if (save.my === save.opp) save.opp = (save.my + 1) % TEAMS.length;
    $("setupTitle").textContent = { cpu: "🤖 1にん: チームを えらぼう", cup: "🏆 たいかい: チームを えらぼう", duo: "👫 2にん どうじ", pass: "🔄 2にん こうたい" }[m];
    $("pick1Label").textContent = m === "duo" || m === "pass" ? "1P の チーム" : "きみの チーム";
    $("pick2Label").textContent = m === "duo" || m === "pass" ? "2P の チーム" : "あいての チーム";
    $("pick2").hidden = m === "cup";
    $("levelBox").hidden = m === "duo" || m === "pass";
    const orderBtns = document.querySelectorAll("#segOrder button");
    orderBtns[0].innerHTML = (m === "duo" || m === "pass" ? "1P が さきに ける" : "さきに ける") + "<small>（<ruby>先攻<rt>せんこう</rt></ruby>）</small>";
    orderBtns[1].innerHTML = (m === "duo" || m === "pass" ? "2P が さきに ける" : "あとで ける") + "<small>（<ruby>後攻<rt>こうこう</rt></ruby>）</small>";
    teamButtons($("teams1"), "my", m === "cup" ? null : "opp");
    teamButtons($("teams2"), "opp", "my");
    colorRow($("colors1"), "my");
    colorRow($("colors2"), "opp");
    segInit("segOrder", "order"); segInit("segLevel", "level"); segInit("segEasy", "easy");
  }
  document.querySelectorAll(".mode").forEach((b) => {
    b.onclick = () => {
      sfx.tap();
      setupMode = b.dataset.mode;
      renderSetup();
      $("menu").classList.remove("show");
      $("setup").classList.add("show");
    };
  });
  $("sBack").onclick = () => { sfx.tap(); $("setup").classList.remove("show"); $("menu").classList.add("show"); };
  $("sGo").onclick = () => { sfx.tap(); if (setupMode === "cup") startCup(); else startMatch(); };
  $("bQuit").onclick = () => { sfx.tap(); toMenu(); };

  // ===== データ =====
  function heat(el, n, s, mirrorView, label) {
    el.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const c = mirrorView ? mirror(i) : i;
      const a = n[c], b = s[c];
      const rate = a ? b / a : 0;
      const d = document.createElement("div");
      d.style.background = a ? `rgba(9,146,104,${0.12 + rate * 0.78})` : "rgba(255,255,255,.55)";
      d.style.color = a && rate > 0.55 ? "#fff" : "#12261c";
      d.innerHTML = a ? `<b>${Math.round(rate * 100)}%</b>${a}${label[0]} ${label[1]} ${b}${label[0]}` : "<span style='opacity:.5'>ー</span>";
      el.appendChild(d);
    }
  }
  function showData() {
    const k = save.kick, q = save.keep;
    heat($("heatKick"), k.n, k.g, false, ["本", "中"]);
    heat($("heatKeep"), q.n, q.s, true, ["かい", "中"]);
    const tot = k.n.reduce((a, b) => a + b, 0), gl = k.g.reduce((a, b) => a + b, 0);
    let say = "";
    if (tot < 3) say = "まだ データが すくないよ。たくさん けって みよう！";
    else {
      const corners = [0, 2, 6, 8], sum = (arr, idx) => idx.reduce((a, i) => a + arr[i], 0);
      const cn = sum(k.n, corners), cg = sum(k.g, corners), cm = sum(k.m, corners);
      const mn = k.n[4] + k.n[1] + k.n[7], mg = k.g[4] + k.g[1] + k.g[7];
      let best = -1, br = -1;
      for (let i = 0; i < 9; i++) if (k.n[i] >= 2 && k.g[i] / k.n[i] > br) { br = k.g[i] / k.n[i]; best = i; }
      say = "ぜんぶで " + tot + "本 中 " + gl + "本 はいったよ（" + Math.round(gl / tot * 100) + "%）。";
      if (best >= 0) say += " いちばん はいる のは「" + CELL_NAME[best] + "」（" + k.n[best] + "本 中 " + k.g[best] + "本）。";
      if (cn >= 2 && mn >= 1) {
        if (cg / cn > mg / mn && cm > 0) say += " すみ は はいりやすい けど、はずれ も " + cm + "本 あったよ。";
        else if (cg / cn > mg / mn) say += " すみ は キーパーの てが とどきにくいから はいりやすい！";
        else say += " まんなか も けっこう はいるね。キーパーが とんだ あとだと がらあき！";
      } else if (cn < 2) say += " すみを ねらうと キーパーの てが とどきにくいよ。";
    }
    $("sayKick").textContent = say;
    const kt = q.n.reduce((a, b) => a + b, 0);
    let s2 = "";
    if (q.faced < 3) s2 = "キーパーも やって みよう！";
    else {
      const col = [0, 1, 2].map((c) => q.n[c] + q.n[c + 3] + q.n[c + 6]);
      // キーパー から みた ひだり = キッカー から みた みぎ
      s2 = q.faced + "本 中 " + q.saved + "本 とめたよ。とんだ ほう: ひだり " + col[2] + "かい・まんなか " + col[1] + "かい・みぎ " + col[0] + "かい。";
      let best = -1, br = -1;
      for (let i = 0; i < 9; i++) if (q.n[i] >= 2 && q.s[i] / q.n[i] > br) { br = q.s[i] / q.n[i]; best = i; }
      if (best >= 0 && br > 0) s2 += " いちばん とめたのは「" + CELL_NAME[mirror(best)] + "」に とんだ とき。";
      if (kt && Math.max(...col) / kt > 0.6) s2 += " おなじ ほうに ばかり とぶと、よまれちゃう かも？";
    }
    $("sayKeep").textContent = s2;
    const rc = save.rec.cpu;
    $("dataTotal").innerHTML = "CPU との しあい: " + rc.map((r, i) => A.LEVEL_NAME[i] + " " + r.w + "かち " + r.l + "まけ").join("・") +
      "<br>2にん の しあい: " + save.rec.two + "かい・たいかい ゆうしょう: " + save.rec.cups + "かい";
    $("data").classList.add("show");
  }
  $("mData").onclick = () => { sfx.tap(); showData(); };
  $("dataClose").onclick = () => { sfx.tap(); $("data").classList.remove("show"); };
  $("dataReset").onclick = () => {
    if (!confirm("けった・とんだ データを けしますか？")) return;
    save.kick = { n: zeros(), g: zeros(), m: zeros() }; save.keep = { n: zeros(), s: zeros(), faced: 0, saved: 0 }; store(); showData();
  };

  // ===== まめちしき =====
  const TIPS = [
    "PK（ペナルティキック）は ゴールから <b>11m</b> の「ペナルティマーク」から けるよ。<ruby>大人<rt>おとな</rt></ruby>の <ruby>歩幅<rt>ほはば</rt></ruby>で 15<ruby>歩<rt>ほ</rt></ruby> くらい。",
    "ゴールの おおきさは はば <b>7.32m</b>、たかさ <b>2.44m</b>。<ruby>教室<rt>きょうしつ</rt></ruby>の よこはば くらい ひろいよ。",
    "ボールが ゴールラインを <b>ぜんぶ</b> こえたら ゴール。すこしでも ラインに かかって いたら まだ ゴールじゃ ないよ。",
    "キーパーは けるまで ゴールラインの うえに いないと いけない（かたあしが ライン の うえ なら OK）。",
    "PK は、ペナルティエリアの なかで <ruby>反則<rt>はんそく</rt></ruby>（ファウル）を すると もらえるよ。",
    "PK せん は 5本ずつ こうたいで ける。とちゅうで かちまけが きまったら おしまい。どうてんなら 1本ずつの サドンデス！",
    "プロ でも PK が きまるのは だいたい <b>4本 に 3本</b>（やく 75%）。キーパーが とめるのは 5本 に 1本 くらい。",
    "つよい シュートは 0.5<ruby>秒<rt>びょう</rt></ruby> くらいで ゴールに とどく。だから キーパーは ボールを みてから では まにあわない ことが おおくて、けるまえに「よむ」んだ。",
    "すみ（ポストの ちかく）は キーパーの てが とどきにくい。でも ねらいすぎると ポストや そとに はずれる ことも…！",
    "PK を ける ひとは、<ruby>試合<rt>しあい</rt></ruby>に でて いた せんしゅ だけ。キーパーが ける ことも あるよ。",
  ];
  $("tipList").innerHTML = TIPS.map((t) => "<li>" + t + "</li>").join("");
  $("mTips").onclick = () => { sfx.tap(); $("tips").classList.add("show"); };
  $("tipsClose").onclick = () => { sfx.tap(); $("tips").classList.remove("show"); };

  // ===== はじめ =====
  updToggles();
  toMenu();

  // テスト用（Playwright から いまの ばめんを しらべる）
  window.PKG = {
    phase() {
      if ($("pass").classList.contains("show")) return "pass";
      if ($("result").classList.contains("show")) return "result";
      if ($("cup").classList.contains("show")) return "cup";
      if (!G) return "menu";
      if (stageMode === "aim") return "aim";
      if (stageMode === "easyPick") return "easyPick";
      if (stageMode === "easyPower") return "easyPower";
      if (stageMode === "dive" && diveHandler) return "dive";
      if (duoHandler) return "duoKeep";
      return "play";
    },
    // ゴールの めん の てん（x, y）→ がめん（ページ）の ざひょう
    goalPoint(x, y) { const r = $("cv").getBoundingClientRect(); V3.setCam(scene.view); const p = V3.proj(x, y, P.GOAL_Z); return { x: r.left + p.x, y: r.top + p.y }; },
    ball() { const r = $("cv").getBoundingClientRect(); V3.setCam("kicker"); const b = V3.ballScreen(); return { x: r.left + b.x, y: r.top + b.y }; },
    gauge() { return scene.gauge ? scene.gauge.v : null; },
    kicks() { return G ? G.kicks : null; },
    lastShot() { return lastShot; },
    pendingShot() { return pendingShot; },
    status() { return G ? R.status(G.kicks) : null; },
    save() { return JSON.parse(JSON.stringify(save)); },
  };
})();
