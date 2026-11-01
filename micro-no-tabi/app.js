/* ミクロの たび：がめん と そうさ
   すけーる L = log10（-10 〜 21）。L=e で だん e が ちょうど よく 見える。
   いまの L の 1つ うえの だん J の え（なかに J-1, J-2, J-3 が 1/10 ずつ はいっている）を
   viewBox だけ かえて えがく → どこまでも なめらか で くっきり。 */
(function () {
  "use strict";
  const S = window.MT_SCALES, Q = window.MT_QUIZ, A = window.MT_AUDIO;
  const $ = (q) => document.querySelector(q);
  const byE = {};
  S.STAGES.forEach((s) => { byE[s.e] = s; });
  const MIN = S.MIN, MAX = S.MAX, NSTAGE = S.STAGES.length;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- ほぞん ---------- */
  const KEY = "micro-no-tabi-v1";
  const def = () => ({ stamps: {}, sound: true, hideBest: null, hideClears: 0, quizBest: 0 });
  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && typeof v === "object") return Object.assign(def(), v); } catch (e) {}
    return def();
  }
  let save = load();
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------- がめん きりかえ ---------- */
  let screen = "title";
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("show", s.id === id));
    screen = id;
    if (id === "title") titleStat();
    if (id === "travel") { lastSize = ""; render(true); }
  }
  function titleStat() {
    const n = Object.keys(save.stamps).length;
    $("#titleStat").textContent = `📕 スタンプ ${n} / ${NSTAGE}` + (n >= NSTAGE ? "　🎓 ミクロ・マクロ はかせ！" : "");
  }

  /* ---------- おと ---------- */
  function syncSnd() { document.querySelectorAll("[data-snd]").forEach((b) => { b.textContent = save.sound ? "🔊" : "🔇"; b.classList.toggle("off", !save.sound); }); }
  A.setOn(save.sound);
  document.querySelectorAll("[data-snd]").forEach((b) => b.addEventListener("click", () => {
    save.sound = !save.sound; A.setOn(save.sound); if (save.sound) A.ensure(); persist(); syncSnd();
  }));
  syncSnd();
  document.addEventListener("pointerdown", () => { if (save.sound) A.ensure(); }, { once: true, capture: true });

  /* ---------- え ---------- */
  const svg = $("#world"), worldG = $("#worldG");
  const artCache = {};
  const art = (e) => artCache[e] || (artCache[e] = byE[e].art());
  function pic(e, depth) {
    const s = byE[e];
    let o = `<rect x="-50" y="-50" width="100" height="100" fill="${s.bg}"/>` + art(e);
    if (depth > 0 && s.at && byE[e - 1]) {
      o += `<g transform="translate(${s.at[0]} ${s.at[1]}) scale(0.1)"><g mask="url(#fadeM)">${pic(e - 1, depth - 1)}</g></g>`;
    }
    return o;
  }
  // L から「どの え を どこから どれだけ 見るか」
  function view(L) {
    L = clamp(L, MIN, MAX);
    const J = clamp(Math.floor(L) + 1, MIN + 1, MAX);
    const f = L - (J - 1);
    const at = byE[J].at || [0, 0];
    const hd = 3.5 * Math.pow(10, f);          // がめんの たいかくせんの はんぶん（え の めもり）
    const p = f / 35;
    return { J, f, hd, cx: at[0] - at[0] * p * hd, cy: at[1] - at[1] * p * hd };
  }

  let L = 0, curJ = null, anim = null, lastL = null, lastT = 0, speed = 0, arrived = null, lastTouch = 0, lastSize = "";
  const pointers = new Map();
  let pinchD = 0;

  function render(force) {
    const v = view(L);
    if (v.J !== curJ || force) {
      worldG.innerHTML = pic(v.J, 3);
      curJ = v.J;
      svg.style.background = byE[v.J].bg;
    }
    const w = svg.clientWidth || innerWidth, h = svg.clientHeight || innerHeight;
    const k = v.hd / (0.5 * Math.hypot(w, h));
    svg.setAttribute("viewBox", `${(v.cx - w / 2 * k).toFixed(5)} ${(v.cy - h / 2 * k).toFixed(5)} ${(w * k).toFixed(5)} ${(h * k).toFixed(5)}`);
    // ものさし
    const mpp = k * Math.pow(10, v.J) / S.UNIT;   // 1px が なんメートル
    const want = mpp * Math.min(130, w * 0.3);
    const p10 = Math.pow(10, Math.floor(Math.log10(want)));
    const nice = [5, 2, 1].map((m) => m * p10).find((x) => x <= want) || p10;
    $("#rBar").style.width = Math.round(nice / mpp) + "px";
    $("#rLabel").textContent = S.fmtLen(nice).text;
    const ratio = (w * mpp) / 1.2;
    $("#rKid").textContent = ratio >= 1 ? `がめんの はば ＝ こどもの せの やく ${S.jpNum(S.sig(ratio, 1))}ばい` : `がめんの はば ＝ こどもの せの ${S.jpNum(S.sig(1 / ratio, 1))}ぶんの1`;
    // いまの だん
    const n = clamp(Math.round(L), MIN, MAX), st = byE[n];
    const label = st.emoji + "|" + S.toKana(st.name);
    if (label !== lastSize) { $("#chipEmoji").textContent = st.emoji; $("#chipName").textContent = S.toKana(st.name); lastSize = label; }
    $("#tMe").style.top = ((MAX - L) / (MAX - MIN) * 100).toFixed(2) + "%";
    const near = Math.abs(L - n) < 0.15;
    $("#pin").classList.toggle("show", near);
    if (near && arrived !== n) { arrived = n; arrive(st); }
    if (Math.abs(L - n) > 0.3) arrived = null;
    $("#zIn").disabled = L <= MIN + 0.01;
    $("#zOut").disabled = L >= MAX - 0.01;
    if (hide) hideHint();
  }

  function arrive(st) {
    A.pon(st.e);
    if (!save.stamps[st.e]) {
      save.stamps[st.e] = 1; persist();
      toast(`📕 スタンプ ゲット！ ${st.emoji}`);
      if (Object.keys(save.stamps).length === NSTAGE) setTimeout(() => { A.fanfare(); toast("🎓 ミクロ・マクロ はかせ！"); }, 1300);
    }
  }

  let toastT = 0;
  function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 1500); }

  /* ---------- うごき ---------- */
  function setL(v) { L = clamp(v, MIN, MAX); lastTouch = performance.now(); if (Math.abs(L - Math.round(L)) > 0.3) hideInfo(); }
  function goTo(to, dur) { anim = { from: L, to: clamp(to, MIN, MAX), t0: performance.now(), dur: dur || 700 }; }
  function step(dir) {
    const base = anim ? anim.to : L;
    const to = dir < 0 ? Math.ceil(base - 0.3) - 1 : Math.floor(base + 0.3) + 1;
    goTo(to);
    hideInfo();
  }
  function frame(t) {
    if (anim) {
      const u = Math.min(1, (t - anim.t0) / anim.dur), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      L = anim.from + (anim.to - anim.from) * e;
      if (u >= 1) { L = anim.to; anim = null; }
    } else if (!pointers.size && t - lastTouch > 350) {
      const n = Math.round(L), d = n - L;
      if (Math.abs(d) > 0.0005 && Math.abs(d) < 0.3) goTo(n, 380);
    }
    const dt = Math.max(1, t - lastT) / 1000;
    const sp = lastL === null ? 0 : (L - lastL) / dt;
    speed = speed * 0.8 + sp * 0.2;
    lastT = t;
    if (screen === "travel") {
      if (L !== lastL) render();
      A.update(L, speed);
    } else A.update(L, 0);
    lastL = L;
    requestAnimationFrame(frame);
  }

  /* ピンチ（アプリ の なか だけ の ズーム。ブラウザ は ズーム させない） */
  const stage = $("#stage");
  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, y0: e.clientY });
    anim = null;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  stage.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchD > 10 && d > 10) setL(L - Math.log10(d / pinchD) * 1.6);
      pinchD = d;
    } else if (pointers.size === 1) {
      // 1ぽん ゆび: うえへ なぞると ちいさい せかい、したへ なぞると おおきい せかい
      setL(L + dy / 220);
    }
  });
  function up(e) { pointers.delete(e.pointerId); pinchD = 0; lastTouch = performance.now(); if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); } }
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("wheel", (e) => { e.preventDefault(); anim = null; setL(L + e.deltaY * (e.ctrlKey ? 0.012 : 0.0018)); }, { passive: false });
  window.addEventListener("keydown", (e) => {
    if (screen !== "travel") return;
    if (e.key === "+" || e.key === "=" || e.key === "ArrowUp") step(-1);
    else if (e.key === "-" || e.key === "ArrowDown") step(1);
    else return;
    e.preventDefault();
  });
  $("#zIn").addEventListener("click", () => step(-1));
  $("#zOut").addEventListener("click", () => step(1));
  window.addEventListener("resize", () => { if (screen === "travel") render(true); });

  /* ---------- せつめい（📍） ---------- */
  function showInfo(st) {
    $("#iEmoji").textContent = st.emoji;
    $("#iName").innerHTML = S.toHtml(st.name);
    $("#iSize").textContent = "おおきさ：やく " + S.fmtLen(st.size).text;
    $("#iDesc").innerHTML = S.toHtml(st.desc);
    $("#info").hidden = false;
    A.say(S.toKana(st.name) + "。" + S.toKana(st.desc));
  }
  function hideInfo() { $("#info").hidden = true; }
  $("#infoX").addEventListener("click", hideInfo);
  $("#pin").addEventListener("click", () => {
    const st = byE[clamp(Math.round(L), MIN, MAX)];
    if (hide) return hideCheck(st);
    showInfo(st);
  });

  /* ---------- かくれんぼ ---------- */
  let hide = null;
  function startHide() {
    hide = { list: Q.hideRound(Math.random, 20), i: 0, t0: Date.now(), miss: 0 };
    L = 0; anim = null; arrived = 0;
    $("#mission").hidden = false; $("#hideResult").hidden = true; hideInfo();
    show("travel");
    hideAsk();
  }
  function hideAsk() {
    hideInfo();
    const st = byE[hide.list[hide.i]];
    $("#mEmoji").textContent = st.emoji;
    $("#mText").textContent = S.toKana(st.name) + "を さがして！";
    $("#mNum").textContent = `${hide.i + 1} / ${hide.list.length}`;
    A.say(S.toKana(st.name) + "を さがして！");
    hideHint();
  }
  function hideHint() {
    const tgt = hide.list[hide.i], n = Math.round(L);
    const t = n === tgt && Math.abs(L - n) < 0.15 ? "📍を タップ！" : tgt < L ? "🔍 もっと ちいさい せかい だよ" : "🔭 もっと おおきい せかい だよ";
    const el = $("#mHint");
    if (el.textContent !== t) el.textContent = t;
  }
  function hideCheck(st) {
    const tgt = byE[hide.list[hide.i]];
    if (st.e === tgt.e) {
      A.good(); toast(`⭕ みつけた！ ${st.emoji}`);
      showInfo(st);
      hide.i++;
      if (hide.i >= hide.list.length) return hideDone();
      setTimeout(() => { if (hide) hideAsk(); }, 900);
    } else {
      A.bad(); hide.miss++;
      toast(`ここは ${S.toKana(st.name)}。${tgt.e < st.e ? "もっと ちいさく！" : "もっと おおきく！"}`);
    }
  }
  function hideDone() {
    const sec = Math.round((Date.now() - hide.t0) / 1000);
    const best = save.hideBest === null || sec < save.hideBest;
    if (best) save.hideBest = sec;
    save.hideClears++; persist();
    A.fanfare();
    $("#hideMsg").innerHTML = `${hide.list.length}もん ぜんぶ みつけたよ！<br>⏱️ ${Math.floor(sec / 60)}ふん ${sec % 60}びょう${best ? "　🎉 じこベスト！" : ""}`;
    $("#hideResult").hidden = false;
    hide = null; $("#mission").hidden = true;
  }
  $("#hideAgain").addEventListener("click", startHide);
  $("#hideHome").addEventListener("click", () => { $("#hideResult").hidden = true; show("title"); });

  /* ---------- おおきさ くらべ クイズ ---------- */
  let quiz = null;
  function startQuiz() { quiz = { qs: Q.quizRound(Math.random, 10), i: 0, score: 0 }; show("quiz"); quizAsk(); }
  function quizAsk() {
    const q = quiz.qs[quiz.i];
    $("#qNum").textContent = `${quiz.i + 1} / ${quiz.qs.length}`;
    $("#qText").textContent = q.text;
    $("#qFeed").textContent = "";
    $("#qNext").hidden = true;
    const box = $("#qChoices");
    box.innerHTML = "";
    q.choices.forEach((ch, i) => {
      const b = document.createElement("button");
      b.className = "qc";
      b.innerHTML = `<span>${ch.emoji}</span>${ch.label}`;
      b.addEventListener("click", () => quizAnswer(i));
      box.appendChild(b);
    });
    A.say(q.text.replace(/[^぀-ヿ一-鿿0-9a-zA-Z、。？！ ]/g, ""));
  }
  function quizAnswer(i) {
    const q = quiz.qs[quiz.i], bs = [...document.querySelectorAll(".qc")];
    bs.forEach((b) => { b.disabled = true; });
    bs[q.answer].classList.add("ok");
    if (i === q.answer) { quiz.score++; A.good(); $("#qFeed").textContent = "⭕ せいかい！ " + q.explain; }
    else { bs[i].classList.add("ng"); A.bad(); $("#qFeed").textContent = "❌ ざんねん。" + q.explain; }
    $("#qNext").hidden = false;
    $("#qNext").lastChild.textContent = quiz.i + 1 >= quiz.qs.length ? "けっか" : "つぎへ";
  }
  $("#qNext").addEventListener("click", () => {
    if (quiz.done) return startQuiz();
    quiz.i++;
    if (quiz.i < quiz.qs.length) return quizAsk();
    const best = quiz.score > save.quizBest;
    if (best) save.quizBest = quiz.score;
    persist();
    if (quiz.score >= 8) A.fanfare();
    $("#qText").textContent = `${quiz.qs.length}もん ちゅう ${quiz.score}もん せいかい！` + (best ? " 🎉 じこベスト！" : "");
    $("#qChoices").innerHTML = "";
    $("#qFeed").textContent = quiz.score === quiz.qs.length ? "🎓 おおきさ はかせ だね！" : "もういちど ちょうせん してみよう";
    $("#qNext").hidden = false;
    $("#qNext").lastChild.textContent = "もういちど";
    quiz.done = true;
  });

  /* ---------- パスポート ---------- */
  function openPass() {
    const n = Object.keys(save.stamps).length;
    $("#pCount").textContent = `${n} / ${NSTAGE}`;
    $("#pTitle").textContent = n >= NSTAGE ? "🎓 ミクロ・マクロ はかせ！ ぜんぶ あつめたね！" : `あと ${NSTAGE - n}こ で「ミクロ・マクロ はかせ」`;
    const g = $("#pGrid");
    g.innerHTML = "";
    S.STAGES.slice().reverse().forEach((st) => {
      const got = !!save.stamps[st.e];
      const b = document.createElement(got ? "button" : "div");
      b.className = "stamp" + (got ? " got" : "");
      b.innerHTML = got ? `<span>${st.emoji}</span>${S.toKana(st.name)}` : `<span>❔</span>？？？`;
      if (got) b.addEventListener("click", () => { hide = null; $("#mission").hidden = true; L = st.e; arrived = st.e; anim = null; show("travel"); showInfo(st); });
      g.appendChild(b);
    });
    const t = save.hideBest === null ? "まだ" : `${Math.floor(save.hideBest / 60)}ふん ${save.hideBest % 60}びょう`;
    $("#pRec").innerHTML = `🔎 かくれんぼ ベスト：${t}（クリア ${save.hideClears}かい）<br>⚖️ おおきさ くらべ ベスト：${save.quizBest} / 10`;
    show("pass");
  }

  /* ---------- ボタン ---------- */
  $("#goTravel").addEventListener("click", () => { hide = null; $("#mission").hidden = true; L = 0; anim = null; arrived = 0; hideInfo(); show("travel"); });
  $("#goHide").addEventListener("click", startHide);
  $("#goQuiz").addEventListener("click", startQuiz);
  $("#goPass").addEventListener("click", openPass);
  $("#home").addEventListener("click", () => { hide = null; $("#mission").hidden = true; hideInfo(); show("title"); });
  document.querySelectorAll("[data-home]").forEach((b) => b.addEventListener("click", () => show("title")));

  titleStat();
  requestAnimationFrame(frame);

  // テスト よう
  window.__mt = {
    get L() { return L; }, setL: (v) => { anim = null; L = clamp(v, MIN, MAX); lastTouch = performance.now(); },
    view, byE, get save() { return save; }, get hide() { return hide; }, get quiz() { return quiz; }, startHide, startQuiz,
  };
})();
