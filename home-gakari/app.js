/* えき の ホームがかり — がめん・そうさ・ほぞん。デバッグ フック window.HGTest */
(function () {
  "use strict";
  const E = window.HomeGakari, S = window.HGSound;
  const KEY = "home-gakari-v1";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ---------- ほぞん ---------- */
  let save = { best: {}, sfx: true, voice: true, days: 0 };
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && typeof v === "object") save = Object.assign(save, v); } catch (e) { /* */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* */ } }
  S.setSfx(save.sfx); S.setVoice(save.voice);

  /* ---------- がめん きりかえ ---------- */
  let g = null, mode = null, paused = false, speed = 1, raf = 0, lastT = 0;
  function show(id) { $$(".view").forEach((v) => { v.hidden = v.id !== id; }); if (id === "vGame") fit(); }
  function syncToggles() {
    $$(".bSnd").forEach((b) => b.setAttribute("aria-pressed", String(save.sfx)));
    $$(".bVoice").forEach((b) => b.setAttribute("aria-pressed", String(save.voice)));
  }
  function starStr(n) { return "★".repeat(n) + "☆".repeat(3 - n); }
  function refreshTitle() {
    const b = save.best.day;
    $("#bestDay").textContent = b === undefined ? "" : "さいこう " + starStr(b);
  }

  /* ---------- まど ---------- */
  function modal(html, btns) {
    $("#mBody").innerHTML = html;
    const box = $("#mBtns"); box.innerHTML = "";
    btns.forEach(([label, fn, cls]) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = label;
      if (cls) b.className = cls;
      b.addEventListener("click", () => { S.tap(); closeModal(); if (fn) fn(); });
      box.appendChild(b);
    });
    $("#modal").hidden = false; paused = true;
    $("#mBody").scrollTop = 0;
  }
  function closeModal() { $("#modal").hidden = true; paused = false; }

  const HELP = `<h2>❓ あそびかた</h2>
<p>きみ は えき の ホーム の かかり。でんしゃ 1ぽん ごと に、この じゅん で しごと を しよう。</p>
<ol>
<li><b>でんしゃ が くる</b>: ❗ が ついた ひと は ホーム の はし（きいろい せん の そと）に いる。タップ して <b>うちがわ へ</b> さがって もらう。みんな さがる と でんしゃ が はいって くる。</li>
<li><b>ドア が あく</b>: <b>おりる ひと が さき</b>。ドア の まえ を ふさいで いる ひと を タップ して「わき へ どうぞ」。</li>
<li><b>のる</b>: 🧑‍🦽 くるまいす の ひと が いたら 🛝 スロープ を その ドア へ ドラッグ（タップ で えらんで ドア を タップ でも OK）。👵 おとしより・👩‍🍼 ベビーカー は ゆっくり まとう。</li>
<li><b>たしかめる</b>: ドア に はさまった 🌂👜 を タップ。はしって くる 🏃 ひと は タップ して「つぎ の でんしゃ を どうぞ」。さいご に 👉 <b>ゆびさし かくにん</b>（ドア → しんごう → とけい）。</li>
<li><b>しゅっぱつ</b>: 📣 あいず を <b>ながおし</b>。ピーッ → メロディ → ドア が しまって でんしゃ が でる。</li>
</ol>
<p>あぶない まま あいず を だそう と する と「まって！」と とまる よ（じこ は おきない）。</p>
<h3>★ の もらいかた（1にち の しごと）</h3>
<ul><li>★ <b>あんぜん</b>: 「まって！」に なった でんしゃ が 1ぽん まで</li>
<li>★ <b>ていじ</b>: でんしゃ を おくらせすぎない</li>
<li>★ <b>しんせつ</b>: くるまいす・まいご・おとしもの を たすける</li></ul>
<p class="note">あいず の だしかた や ゆびさし の じゅんばん は「この ゲーム の やりかた」。ほんもの の えき では てつどう がいしゃ ごと に ちがう よ。</p>`;

  const ZUKAN = [
    ["🧑‍✈️", "ホームがかり", "ホーム で おきゃくさん の のりおり を みまもる。きいろい せん の そと に いる ひと に こえ を かけたり、くるまいす の ひと に スロープ を かけたり、あんぜん を たしかめて しゃしょう さん に あいず を おくる。"],
    ["👉", "ゆびさし かくにん", "<ruby>指差喚呼<rt>しさかんこ</rt></ruby>（しさ かんこ）とも いう。たしかめる もの を よく <b>みて</b>、<b>ゆびさして</b>、「よし！」と <b>こえ に だして</b> たしかめる。め・ゆび・くち・みみ を ぜんぶ つかう ので、うっかり まちがい が ぐっと へる と しらべられて いる。もと は てつどう の うんてんし さん が しんごう を たしかめる ため に はじめた やりかた。"],
    ["🟨", "きいろい せん", "ホーム の はし の きいろい でこぼこ は <b>てんじ ブロック</b>。め の ふじゆう な ひと が あし で ホーム の はし を しる ため の もの。でんしゃ を まつ とき は きいろい せん の <b>うちがわ</b> で まとう。"],
    ["🚪", "おりる ひと が さき", "ドア が あいたら、まず おりる ひと。のる ひと は ドア の わき に ならんで まつ。ドア の まえ を ふさぐ と おりられなくて、でんしゃ が おくれて しまう。"],
    ["🏃", "かけこみ じょうしゃ は あぶない", "しまりかけ の ドア に とびこむ と、からだ や にもつ が はさまって ケガ を する ことも。ほか の おきゃくさん も まつ ことに なる。まにあわなかったら つぎ の でんしゃ を まとう。"],
    ["🎫", "かいさつ", "きっぷ や カード を しらべる ところ。えきいん さん は のりかえ の みち を おしえたり、きっぷ の こまった を たすけたり する。"],
    ["📢", "アナウンス", "「まもなく でんしゃ が まいります」など、マイク で おしらせ する しごと。でんしゃ が おくれた とき の おしらせ も する。"],
    ["🧸", "おとしもの", "えき や でんしゃ で ひろわれた わすれもの は えき で あずかって、おちぬし を さがす。みつからない ものは けいさつ に とどけられる。"],
    ["🔧", "ほあん（せんろ・しんごう を まもる）", "でんしゃ が はしらない よる の あいだ に、せんろ や しんごう、でんせん を しらべて なおす ひと たち。あさ いちばん の でんしゃ が あんぜん に はしれる ように。"],
  ];
  function zukanHtml() {
    return `<h2>📖 えき の しごと</h2>` + ZUKAN.map(([e, n, t]) => `<div class="zitem"><span class="ze">${e}</span><div><b>${n}</b><br>${t}</div></div>`).join("") +
      `<p class="note">この ゲーム の えき・でんしゃ・メロディ は オリジナル。ほんとう の あいず や じゅんばん は てつどう がいしゃ ごと に ちがう よ。</p>`;
  }

  /* ---------- シーン を つくる ---------- */
  const scene = $("#scene"), layer = $("#layer"), train = $("#train");
  let scale = 1;
  function buildTrain() {
    let h = "";
    // 2りょう ぶん（ドア 3つ が みえる）
    h += `<div class="car" style="left:-200px;width:410px"><div class="stripe"></div><div class="stripe2"></div>`;
    [-170, 260, 330].forEach((x) => { h += `<div class="win" style="left:${x + 200 - 30}px"></div>`; });
    h += `<span class="nm" style="left:240px">どんぐり せん</span></div>`;
    h += `<div class="car" style="left:214px;width:560px"><div class="stripe"></div><div class="stripe2"></div>`;
    [180, 420].forEach((x) => { h += `<div class="win" style="left:${x - 214 - 27}px"></div>`; });
    h += `</div>`;
    E.DOORS.forEach((x, d) => { h += `<div class="door" data-door="${d}" style="left:${x}px"><span class="lf"></span><span class="rt"></span></div>`; });
    h += `<div class="wheels" style="left:20px"><i></i><i></i></div><div class="wheels" style="left:390px"><i></i><i></i></div>`;
    train.innerHTML = h;
    $("#marks").innerHTML = E.DOORS.map((x) => `<div class="mk" style="left:${x}px"></div>`).join("");
  }
  buildTrain();

  function fit() {
    const w = $("#stageWrap").getBoundingClientRect();
    scale = Math.max(0.3, Math.min(w.width / E.W, w.height / E.H));
    const box = $("#sceneBox");
    box.style.width = Math.floor(E.W * scale) + "px";
    box.style.height = Math.floor(E.H * scale) + "px";
    scene.style.transform = `scale(${scale})`;
  }
  window.addEventListener("resize", fit);
  // シーン の なか の ざひょう
  function toScene(cx, cy) {
    const r = $("#sceneBox").getBoundingClientRect();
    return { x: (cx - r.left) / scale, y: (cy - r.top) / scale };
  }

  /* ---------- ゲーム かいし ---------- */
  function start(m) {
    mode = m;
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    g = E.newDay(seed, m === "day" ? {} : { period: m });
    elems.forEach((el) => el.remove()); elems.clear();
    $("#msg").textContent = ""; $("#msg").className = "";
    rampSel = false;
    show("vGame");
    paused = false;
    render();
    loop();
  }
  function loop() {
    cancelAnimationFrame(raf);
    lastT = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      if (g && !paused && !$("#vGame").hidden) {
        let left = dt * speed;
        while (left > 1e-6) { const d = Math.min(0.05, left); E.step(g, d); left -= d; handleEvents(); if (paused) break; }
        updateHold(now);
        render();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  /* ---------- できごと ---------- */
  let msgTimer = 0;
  function say(text, cls, speak) {
    const m = $("#msg");
    m.textContent = text; m.className = cls || "";
    clearTimeout(msgTimer);
    if (cls) msgTimer = setTimeout(() => { m.className = ""; }, 1800);
    if (speak) S.say(speak === true ? text : speak);
  }
  function handleEvents() {
    const evs = g.events.splice(0);
    evs.forEach((ev) => {
      switch (ev.type) {
        case "train":
          S.chime();
          say(ev.edge ? "まもなく でんしゃ が まいります。きいろい せん の うちがわ まで おさがり ください。" : "まもなく でんしゃ が まいります。", "", true);
          break;
        case "period": showPeriod(ev.period); break;
        case "arrive": S.arrive(); break;
        case "open": S.door(); say("どんぐり えき です。おりる ひと が さき です。", "", true); break;
        case "alight": break;
        case "stuck": S.bad(); break;
        case "runnerCome": S.bad(); say("あっ！ はしって くる ひと が いる！", "ng"); break;
        case "helped": S.sparkle(); break;
        case "depart": S.beep(); setTimeout(() => S.melody(), 600); say(ev.late > 0.5 ? "しゅっぱつ OK！（すこし おくれた かな）" : "しゅっぱつ OK！", "good"); break;
        case "closing": S.door(); S.say("ドア が しまります。ごちゅうい ください。"); break;
        case "leave": S.leave(); break;
        case "done": setTimeout(finish, 300); paused = true; break;
      }
    });
  }
  function showPeriod(p) {
    const P = E.PERIODS[p];
    const tip = { asa: "ひと が いっぱい！ ドア の まえ に き を つけて。", hiru: "すいて いる じかん。まいご の こ や おとしもの は ない かな？", yuu: "あめ が ふって きた。かさ が はさまって いない か よく みて。" }[p];
    const c = $("#card");
    c.innerHTML = `<div class="e">${P.emoji}</div><h2>${P.name} に なった！</h2><p>${tip}</p>`;
    c.hidden = false; paused = true;
    S.ok();
    const close = () => { c.hidden = true; paused = false; c.removeEventListener("click", close); };
    c.addEventListener("click", close);
    setTimeout(close, 2600 / Math.max(1, speed));
  }

  /* ---------- えがく ---------- */
  const elems = new Map();
  function el(id, make) {
    let e = elems.get(id);
    if (!e) { e = make(); e.dataset.key = id; layer.appendChild(e); elems.set(id, e); }
    return e;
  }
  function render() {
    if (!g) return;
    const P = E.PERIODS[g.period];
    scene.className = g.period;
    $("#rain").hidden = g.period !== "yuu";
    $("#gPeriod").textContent = P.emoji + " " + P.name;
    $("#gTrain").textContent = "🚃 " + Math.max(1, g.trainNo + 1) + "/" + g.plan.length;
    train.style.transform = `translateX(${g.trainX}px)`;
    // ドア の ひらき
    $$(".door").forEach((d) => {
      const k = g.doorOpen;
      d.firstChild.style.transform = `translateX(${-k * 100}%)`;
      d.lastChild.style.transform = `translateX(${k * 100}%)`;
    });
    $("#sig").classList.toggle("go", g.phase === "open" || g.phase === "melody");
    // とけい（でんしゃ 1ぽん ごと に 4ふん すすむ）
    const startMin = { asa: 7 * 60 + 30, hiru: 12 * 60 + 10, yuu: 17 * 60 + 20 }[g.period];
    const min = startMin + Math.max(0, g.trainNo % 3) * 4 + Math.min(3, (g.tr ? g.tr.dwell : 0) / 10);
    $("#clock .hh").style.transform = `rotate(${(min / 60) * 30}deg)`;
    $("#clock .mm").style.transform = `rotate(${(min % 60) * 6}deg)`;
    // スロープ
    const rp = $("#ramp");
    rp.hidden = g.ramp < 0;
    if (g.ramp >= 0) rp.style.left = E.DOORS[g.ramp] + "px";

    const seen = new Set();
    g.people.forEach((p) => {
      if (p.hidden) return;
      const key = "p" + p.id; seen.add(key);
      const e = el(key, () => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "pp"; b.dataset.id = p.id;
        b.innerHTML = `<span class="em">${p.emoji}</span><span class="say" hidden></span>`;
        b.setAttribute("aria-label", "おきゃくさん");
        return b;
      });
      e.style.left = p.x + "px"; e.style.top = p.y + "px";
      e.style.zIndex = String(Math.round(p.y));
      e.dataset.role = p.role; e.dataset.kind = p.kind;
      const cls = "pp " + p.role + (p.path.length ? " walk" : "") + (p.role === "boarding" && p.y < E.DOOR_Y + 40 ? " peek" : "");
      if (e.className !== cls) e.className = cls;
      e.style.opacity = p.role === "boarding" ? String(Math.max(0, Math.min(1, (p.y - E.DOOR_Y) / 40 + 0.15))) : "";
      const sy = e.lastChild;
      if (p.say) { sy.hidden = false; if (sy.textContent !== p.say) sy.textContent = p.say; } else sy.hidden = true;
    });
    g.stuck.forEach((s) => {
      const key = "s" + s.id; seen.add(key);
      const e = el(key, () => {
        const b = document.createElement("button"); b.type = "button"; b.className = "it stuck"; b.dataset.item = s.id;
        b.textContent = E.ITEMS[s.kind].emoji; b.setAttribute("aria-label", E.ITEMS[s.kind].name);
        return b;
      });
      e.style.left = (E.DOORS[s.door] + 4) + "px"; e.style.top = (E.DOOR_Y - 36) + "px";
    });
    g.lostItems.forEach((s) => {
      const key = "l" + s.id; seen.add(key);
      const e = el(key, () => {
        const b = document.createElement("button"); b.type = "button"; b.className = "it lostitem"; b.dataset.item = s.id;
        b.textContent = s.emoji; b.setAttribute("aria-label", "おとしもの");
        return b;
      });
      e.style.left = s.x + "px"; e.style.top = s.y + "px"; e.style.zIndex = String(s.y);
    });
    elems.forEach((e, k) => { if (!seen.has(k)) { e.remove(); elems.delete(k); } });

    // ゆびさし ボタン
    $$(".pb").forEach((b, i) => b.classList.toggle("done", g.phase === "open" && g.point > i));
    const needRamp = g.people.some((p) => p.needRamp && p.role === "board");
    $("#tRamp").classList.toggle("need", needRamp && g.phase === "open" && !rampSel);
    $("#tRamp").classList.toggle("sel", rampSel);
    $("#bSig").disabled = !(g.phase === "open");
    $("#hint").textContent = hint();
  }
  function hint() {
    if (g.phase === "approach") return g.people.some((p) => p.role === "edge") ? "❗ の ひと を タップ して、きいろい せん の うちがわ へ" : "でんしゃ が はいって くるよ";
    if (g.phase === "arrive") return "でんしゃ が はいって くるよ";
    if (g.phase !== "open") return g.phase === "between" ? "" : "しゅっぱつ！ いってらっしゃい";
    const P = g.people;
    if (P.some((p) => p.role === "block")) return "ドア の まえ の ひと を タップ。おりる ひと が さき";
    if (P.some((p) => p.needRamp && p.role === "board")) return "🛝 スロープ を くるまいす の ひと の ドア へ";
    if (!E.boardingDone(g)) return "のりおり を みまもろう";
    if (P.some((p) => p.role === "runner")) return "はしって くる ひと を タップ！";
    if (g.stuck.length) return "ドア に はさまった もの を タップ";
    if (g.point < 3) return "👉 ゆびさし かくにん: ドア → しんごう → とけい";
    return "📣 あいず を ながおし！";
  }

  /* ---------- そうさ ---------- */
  function act(r) {
    if (!r) return;
    if (r.ok) { S.ok(); if (r.say) say(r.say, "good", true); }
    else if (r.say) { S.bad(); say(r.say, "ng"); }
  }
  layer.addEventListener("click", (e) => {
    if (!g || paused) return;
    const pp = e.target.closest(".pp"), it = e.target.closest(".it");
    if (rampSel) {
      // スロープ を えらんで いる とき は ドア の ちかく を タップ で かける
      const q = toScene(e.clientX, e.clientY);
      if (tryRampAt(q)) return;
    }
    if (pp) {
      const id = +pp.dataset.id;
      const p = g.people.find((x) => x.id === id);
      if (p && p.needRamp && p.role === "board" && rampSel) { act(E.placeRamp(g, p.door)); rampSel = false; return; }
      act(E.tapPerson(g, id));
    } else if (it) act(E.tapItem(g, +it.dataset.item));
  });
  train.addEventListener("click", (e) => {
    if (!g || paused || !rampSel) return;
    tryRampAt(toScene(e.clientX, e.clientY));
  });
  function doorAt(q) {
    let best = -1;
    E.DOORS.forEach((x, d) => { if (Math.abs(q.x - x) < 64 && q.y > 70 && q.y < 340) best = d; });
    return best;
  }
  function tryRampAt(q) {
    const d = doorAt(q);
    if (d < 0) return false;
    rampSel = false;
    act(E.placeRamp(g, d));
    return true;
  }

  // スロープ: ドラッグ か、タップ で えらんで ドア を タップ
  let rampSel = false, drag = null;
  const tRamp = $("#tRamp"), ghost = $("#ghost");
  tRamp.addEventListener("pointerdown", (e) => {
    if (!g || paused) return;
    S.unlock();
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false };
    try { tRamp.setPointerCapture(e.pointerId); } catch (er) { /* */ }
  });
  tRamp.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 10) { drag.moved = true; ghost.hidden = false; scene.classList.add("dropok"); }
    if (drag.moved) { ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px"; }
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    ghost.hidden = true; scene.classList.remove("dropok");
    if (d.moved) {
      if (e.type === "pointercancel") return;
      const q = toScene(e.clientX, e.clientY);
      const door = doorAt(q);
      if (door >= 0) { rampSel = false; act(E.placeRamp(g, door)); }
      else { S.bad(); say("ドア の ところ まで もって いこう", "ng"); }
    } else if (e.type === "pointerup") {
      rampSel = !rampSel; S.tap();
      if (rampSel) say("スロープ を かける ドア を タップ してね");
    }
  };
  tRamp.addEventListener("pointerup", endDrag);
  tRamp.addEventListener("pointercancel", endDrag);

  // ゆびさし かくにん
  const fingerEl = $("#finger");
  let fingerT = 0;
  $$(".pb").forEach((b) => b.addEventListener("click", () => {
    if (!g || paused) return;
    const what = b.dataset.pt;
    const r = E.point(g, what);
    if (r.ok && !r.done) {
      S.point(r.n);
      say(r.say, "good", true);
      // シーン の なか で ゆびさす
      let x = 300, y = 120;
      if (what === "door") { x = E.DOORS[1] - 70; y = 150; $$(".door").forEach((d) => d.classList.add("flash")); }
      if (what === "signal") { x = 100; y = 34; $("#sig").classList.add("flash"); }
      if (what === "clock") { x = 470; y = 34; $("#clock").classList.add("flash"); }
      fingerEl.style.left = x + "px"; fingerEl.style.top = (y - 22) + "px";
      fingerEl.classList.add("on");
      clearTimeout(fingerT);
      fingerT = setTimeout(() => { fingerEl.classList.remove("on"); $$(".flash").forEach((f) => f.classList.remove("flash")); }, 700);
    } else act(r);
  }));

  // あいず: ながおし（0.8びょう）
  const HOLD = 0.8;
  let hold = null;
  const bSig = $("#bSig"), fill = bSig.querySelector(".fill");
  bSig.addEventListener("contextmenu", (e) => e.preventDefault());
  bSig.addEventListener("pointerdown", (e) => {
    if (!g || paused || bSig.disabled) return;
    S.unlock();
    hold = { id: e.pointerId, t0: performance.now(), fired: false };
    try { bSig.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    e.preventDefault();
  });
  function updateHold(now) {
    if (!hold) { fill.style.width = "0"; return; }
    const k = Math.min(1, (now - hold.t0) / 1000 / HOLD);
    fill.style.width = (k * 100) + "%";
    S.hold(k);
    if (k >= 1 && !hold.fired) {
      hold.fired = true;
      const r = E.signal(g);
      if (!r.ok) { S.matte(); say(r.say, "ng", true); }
    }
  }
  const endHold = (e) => {
    if (!hold || e.pointerId !== hold.id) return;
    const h = hold; hold = null; fill.style.width = "0";
    if (!h.fired && e.type === "pointerup") say("📣 あいず は ながおし だよ。ピーッ と なる まで おして いてね", "ng");
  };
  bSig.addEventListener("pointerup", endHold);
  bSig.addEventListener("pointercancel", endHold);

  /* ---------- おわり ---------- */
  function finish() {
    const st = E.stars(g), s = g.stats;
    const k = mode;
    const prev = save.best[k];
    if (prev === undefined || st.total > prev) save.best[k] = st.total;
    if (mode === "day") save.days = (save.days || 0) + 1;
    store();
    S.fanfare();
    const row = (ok, name, why) => `<tr><td class="s">${ok ? "★" : "☆"}</td><td><b>${name}</b><br><span class="note">${why}</span></td></tr>`;
    const late = Math.round(s.delay);
    modal(`<div class="result"><h2>${mode === "day" ? "1にち の しごと おつかれさま！" : "しゅっぱつ OK！ おつかれさま！"}</h2>
      <div class="stars">${starStr(st.total)}</div>
      <table>
      ${row(st.safe, "あんぜん", s.matteTrains ? `「まって！」に なった でんしゃ ${s.matteTrains}ほん` : "あぶない まま あいず を ださなかった！")}
      ${row(st.onTime, "ていじ", late > 0 ? `おくれ ぜんぶ で ${late}びょう` : "おくれ なし！")}
      ${row(st.kind, "しんせつ", s.chances ? `たすけた かず ${s.helped} / ${s.chances}` : "こまって いる ひと は いなかった")}
      </table>
      <p>でんしゃ ${s.trains}ほん を あんぜん に みおくった よ 🚃</p></div>`,
      [["🔁 もう いちど", () => start(mode), "primary"], ["🏠 タイトル へ", () => { g = null; show("vTitle"); refreshTitle(); }]]);
  }

  /* ---------- ボタン ---------- */
  $("#bDay").addEventListener("click", () => { S.unlock(); S.tap(); start("day"); });
  $$(".bOne").forEach((b) => b.addEventListener("click", () => { S.unlock(); S.tap(); start(b.dataset.period); }));
  $("#bHelp").addEventListener("click", () => { S.tap(); modal(HELP, [["とじる"]]); });
  $("#bZukan").addEventListener("click", () => { S.tap(); modal(zukanHtml(), [["とじる"]]); });
  $("#bBack").addEventListener("click", () => {
    S.tap();
    modal("<h2>やめる？</h2><p>タイトル に もどる と、この しごと は おしまい に なるよ。</p>",
      [["つづける", null, "primary"], ["やめる", () => { g = null; S.hush(); show("vTitle"); refreshTitle(); }]]);
  });
  $$(".bSnd").forEach((b) => b.addEventListener("click", () => { save.sfx = !save.sfx; S.setSfx(save.sfx); store(); syncToggles(); S.unlock(); S.tap(); }));
  $$(".bVoice").forEach((b) => b.addEventListener("click", () => { save.voice = !save.voice; S.setVoice(save.voice); store(); syncToggles(); if (save.voice) S.say("よみあげ オン"); }));
  document.addEventListener("contextmenu", (e) => { if (e.target.closest("#vGame")) e.preventDefault(); });
  syncToggles(); refreshTitle();

  /* ---------- デバッグ フック ---------- */
  window.HGTest = {
    game: () => g,
    state: () => g && { view: $("#vGame").hidden ? "title" : "game", phase: g.phase, trainNo: g.trainNo, trains: g.plan.length, point: g.point, ramp: g.ramp,
      hazards: E.hazards(g).map((h) => h.key), matte: g.stats.matte, helped: g.stats.helped, chances: g.stats.chances, done: g.phase === "done",
      roles: g.people.map((p) => p.role), paused },
    fast: (n) => { speed = n || 1; },
    auto: () => (g && !paused ? E.autoAct(g) : null),
    scenePoint: (x, y) => { const r = $("#sceneBox").getBoundingClientRect(); return { x: r.left + x * scale, y: r.top + y * scale }; },
    closeCard: () => { const c = $("#card"); if (!c.hidden) c.click(); },
  };
})();
