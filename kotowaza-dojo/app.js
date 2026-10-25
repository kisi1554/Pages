"use strict";

/* ことわざ どうじょう: メニュー・5つの モード・ずかん・ノート */
(() => {
  const $ = (s) => document.querySelector(s);
  const view = $("#view");
  const BY = {};
  KOTOWAZA.forEach((e) => { BY[e.id] = e; });

  /* ---------- ほぞん（localStorage は try/catch） ---------- */
  const KEY = "kotowaza-dojo-v1";
  let st = { lv: 1, sound: true, furi: true, stamp: {}, note: {}, best: {} };
  try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* つかえない */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* つかえない */ } };

  /* ---------- ふりがな ---------- */
  const RUBY = /([㐀-鿿々〆ヶ]+)\{([^}]+)\}/g;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rb = (s) => esc(s).replace(RUBY, "<ruby>$1<rt>$2</rt></ruby>");
  const plain = (s) => s.replace(RUBY, "$1");
  // 『…』を めだたせる
  const rbEx = (s) => rb(s).replace(/『(.+?)』/g, "<b class=\"hl\">『$1』</b>");
  // w の 中の b（漢字 ひとかたまり）を □ に する
  function rbBlank(w, b) {
    let done = false;
    return esc(w).replace(RUBY, (m, base, yomi) => {
      if (!done && base === b) { done = true; return '<span class="blank">？</span>'; }
      return `<ruby>${base}<rt>${yomi}</rt></ruby>`;
    });
  }
  const yomiOf = (w, b) => { const m = [...w.matchAll(RUBY)].find((m) => m[1] === b); return m ? m[2] : ""; };

  /* ---------- なかま の しらべ ---------- */
  const relMap = {};
  const addRel = (g) => g.forEach((a) => g.forEach((b) => { if (a !== b) (relMap[a] = relMap[a] || new Set()).add(b); }));
  SYN.forEach(addRel); NEAR.forEach(addRel);
  const related = (a, b) => a === b || !!(relMap[a] && relMap[a].has(b));
  const synOf = (id) => (SYN.find((g) => g.includes(id)) || []).filter((x) => x !== id);
  const antOf = (id) => ANT.filter((p) => p.includes(id)).map((p) => (p[0] === id ? p[1] : p[0]));

  const POOL = {};
  for (const k in BLANK_POOL) POOL[k] = BLANK_POOL[k].list.split(" ").map((s) => { const m = s.match(/^([^ぁ-ゖ]+)(.+)$/); return { c: m[1], y: m[2] }; });
  const PLAINS = new Set(KOTOWAZA.map((e) => plain(e.w)));

  /* ---------- ちいさな 道具 ---------- */
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lvPool = (list, min) => { const f = list.filter((e) => e.lv <= st.lv); return f.length >= (min || 6) ? f : list; };
  function toast(t, ms) {
    const el = $("#toast"); el.innerHTML = t; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, ms || 1800);
  }
  const fx = (n) => Snd.play(n);
  function stamp(id) {
    if (st.stamp[id]) return false;
    st.stamp[id] = Date.now(); save();
    const h = $("#hanko"); h.hidden = false;
    const s = h.firstElementChild; s.style.animation = "none"; void s.offsetWidth; s.style.animation = "";
    setTimeout(() => fx("stamp"), 250);
    clearTimeout(stamp.t); stamp.t = setTimeout(() => { h.hidden = true; }, 950);
    return true;
  }
  const addNote = (id) => { st.note[id] = (st.note[id] || 0) + 1; save(); };
  const delNote = (id) => { delete st.note[id]; save(); };
  const stampCount = () => Object.keys(st.stamp).filter((id) => BY[id]).length;

  /* ---------- バー ---------- */
  let stopper = null;
  function setBar(title, back) {
    $("#barTitle").innerHTML = title;
    $("#backBtn").hidden = !back;
    $("#backBtn").onclick = () => { fx("tap"); back && back(); };
  }
  function screen(html) {
    if (stopper) { stopper(); stopper = null; }
    view.innerHTML = `<section class="screen">${html}</section>`;
    window.scrollTo(0, 0);
    return view.firstElementChild;
  }
  function applyFuri() {
    const forced = st.lv === 1;
    $("#furiBtn").hidden = forced;
    const on = forced || st.furi;
    document.body.classList.toggle("nofuri", !on);
    $("#furiBtn").classList.toggle("off", !on);
  }
  $("#furiBtn").onclick = () => { st.furi = !st.furi; save(); applyFuri(); fx("tap"); toast(st.furi ? "ふりがな オン" : "ふりがな オフ"); };
  function applySound() { Snd.set(st.sound); $("#soundBtn").textContent = st.sound ? "🔊" : "🔇"; }
  $("#soundBtn").onclick = () => { st.sound = !st.sound; save(); applySound(); fx("tap"); };

  /* ==================== メニュー ==================== */
  function home() {
    setBar("ことわざ どうじょう", null);
    const noteN = Object.keys(st.note).filter((id) => BY[id]).length;
    const s = screen(`
      <div class="hero">
        <div class="hero-art" aria-hidden="true">🐒🌳💥</div>
        <p class="hero-sub">ことば どおり の アニメ で わらって、ほんとうの いみ を おぼえよう</p>
      </div>
      <div class="lvl"><span class="lvl-l">レベル</span>
        <div class="seg" id="lvSeg">${[1, 2, 3].map((l) => `<button data-v="${l}" class="${st.lv === l ? "on" : ""}">${rb(LEVELS[l])}</button>`).join("")}</div>
      </div>
      <div class="menu">
        <button class="tile" data-go="theater" style="--c:#d9480f"><span class="t-star">★</span><span class="t-emo">🎭</span><span class="t-name">ことば どおり げきじょう</span><span class="t-desc">ことわざ が ほんとうに おきたら？</span></button>
        <button class="tile" data-go="imi" style="--c:#1971c2"><span class="t-star">★★</span><span class="t-emo">🎯</span><span class="t-name">いみ あて</span><span class="t-desc">ただしい いみ を 4つ から えらぶ</span></button>
        <button class="tile" data-go="nakama" style="--c:#2b8a3e"><span class="t-star">★★</span><span class="t-emo">🤝</span><span class="t-name">なかま あつめ</span><span class="t-desc">にた いみ・はんたい の いみ を つなぐ</span></button>
        <button class="tile" data-go="blank" style="--c:#7048e8"><span class="t-star">★★〜★★★</span><span class="t-emo">🧩</span><span class="t-name">□に 入る ことば</span><span class="t-desc">「□の みみに ねんぶつ」→ ？</span></button>
        <button class="tile" data-go="tsukau" style="--c:#c2255c"><span class="t-star">★★★</span><span class="t-emo">✍️</span><span class="t-name">つかって みよう</span><span class="t-desc">ばめんに いちばん あう ことわざ は？</span></button>
        <button class="tile" data-go="note" style="--c:#e67700">${noteN ? `<span class="badge">${noteN}</span>` : ""}<span class="t-emo">📒</span><span class="t-name">まちがい ノート</span><span class="t-desc">まちがえた ことば を ふくしゅう</span></button>
        <button class="tile wide" data-go="zukan" style="--c:#5f3dc4"><span class="t-emo">📖</span><span><span class="t-name">ことわざ ずかん</span><br><span class="t-desc">はんこ ${stampCount()} / ${KOTOWAZA.length}</span></span></button>
      </div>`);
    s.querySelectorAll("#lvSeg button").forEach((b) => b.onclick = () => {
      st.lv = +b.dataset.v; save(); fx("tap"); applyFuri(); home();
    });
    s.querySelectorAll(".tile").forEach((b) => b.onclick = () => { fx("tap"); GO[b.dataset.go](); });
  }

  /* ==================== げきじょう ==================== */
  function theater() {
    setBar("ことば どおり げきじょう", home);
    const list = KOTOWAZA.filter((e) => e.sc && Scenes.has(e.id));
    const sorted = list.slice().sort((a, b) => a.lv - b.lv);
    const s = screen(`<p class="th-lit">ことわざ を えらぶと、ことば どおり の ことが おきるよ</p>
      <div class="th-list">${sorted.map((e) => `<button class="th-card ${st.stamp[e.id] ? "done" : ""}" data-id="${e.id}">${rb(e.w)}</button>`).join("")}</div>`);
    s.querySelectorAll(".th-card").forEach((b) => b.onclick = () => { fx("tap"); playScene(b.dataset.id, theater); });
  }
  function playScene(id, back) {
    const e = BY[id];
    setBar("ことば どおり げきじょう", back);
    const s = screen(`<div class="stage-wrap">
        <div class="stage" id="stage"></div>
        <div class="th-side">
          <h2 class="th-title">${rb(e.w)}</h2>
          <p class="caption" id="cap" aria-live="polite"></p>
          <div id="reveal" hidden></div>
          <div class="row"><button class="big sub" id="again">🔁 もういちど</button><button class="big" id="real">ほんとうの いみは？</button></div>
        </div></div>`);
    let h = null;
    const start = () => {
      if (h) h.stop();
      $("#cap").textContent = "";
      h = Scenes.play(id, $("#stage"), {
        say: (t) => { $("#cap").textContent = t; },
        fx,
        done: () => { $("#real").classList.add("pulse"); },
      });
    };
    stopper = () => h && h.stop();
    s.querySelector("#again").onclick = () => { fx("tap"); start(); };
    s.querySelector("#real").onclick = () => {
      fx("correct");
      const r = s.querySelector("#reveal");
      r.hidden = false;
      r.innerHTML = explainHtml(e, true);
      s.querySelector("#real").hidden = true;
      stamp(id);
      r.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    start();
  }

  /* せつめい（こたえ の あと・げきじょう） */
  function explainHtml(e, ok, extra) {
    let h = `<div class="explain ${ok ? "" : "ng"}"><h3>${rb(e.w)}</h3>`;
    if (extra) h += extra;
    h += `<p>💡 <b>ほんとう の いみ:</b> ${rb(e.m)}</p>`;
    if (e.miss) h += `<p class="why">⚠️ <b>まちがえやすい！</b>「${rb(e.miss)}」は ちがう。${rb(e.why)}</p>`;
    h += `<p class="ex-line">📝 ${rbEx(e.ex)}</p>`;
    if (e.n) h += `<p class="ex-line">🔎 ${rb(e.n)}</p>`;
    if (e.yu) h += `<p class="yu">📜 <b>由来{ゆらい}:</b> ${rb(e.yu)}</p>`.replace("由来{ゆらい}", "<ruby>由来<rt>ゆらい</rt></ruby>");
    return h + "</div>";
  }

  /* ==================== クイズ の しくみ（いみ あて・□・つかって） ==================== */
  /* qs: [{ e, html, choices:[{html,ok}], cls, split, extra }] */
  function runQuiz(title, qs, back, opt) {
    opt = opt || {};
    let i = 0, score = 0;
    const marks = [];
    const step = () => {
      if (i >= qs.length) return result();
      const q = qs[i];
      setBar(title, back);
      const s = screen(`<div class="quiz ${q.split === false ? "" : "split"}">
        <div class="progress">${qs.map((_, k) => `<i class="${marks[k] || (k === i ? "now" : "")}"></i>`).join("")}</div>
        <div class="q-left"><div class="q-card">${q.html}</div><div id="exp"></div></div>
        <div class="q-right"><div class="choices ${q.cls || ""}">${q.choices.map((c, k) => `<button class="choice" data-k="${k}">${c.html}</button>`).join("")}</div><div id="nextBox"></div></div>
      </div>`);
      const btns = [...s.querySelectorAll(".choice")];
      btns.forEach((b) => b.onclick = () => {
        const c = q.choices[+b.dataset.k];
        btns.forEach((x) => { x.disabled = true; x.style.opacity = 1; });
        btns.forEach((x, k) => { if (q.choices[k].ok) x.classList.add("ok"); else if (x !== b) x.classList.add("dim"); });
        if (c.ok) {
          score++; marks[i] = "ok"; fx("correct");
          if (opt.fromNote) delNote(q.e.id);
          setTimeout(() => stamp(q.e.id), 350);
        } else {
          b.classList.add("ng", "shake"); marks[i] = "ng"; fx("wrong"); addNote(q.e.id);
        }
        s.querySelector("#exp").innerHTML = explainHtml(q.e, c.ok, c.ok ? "<p>⭕ せいかい！</p>" : `<p>❌ ざんねん。${c.wrongNote || "まちがえた ことば は ノートに かいたよ。"}</p>`);
        s.querySelector("#nextBox").innerHTML = `<button class="big" id="next">${i + 1 < qs.length ? "つぎへ ▶" : "けっか を みる"}</button>`;
        s.querySelector("#next").onclick = () => { fx("tap"); i++; step(); };
        if (window.innerWidth < 700) s.querySelector("#exp").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    const result = () => {
      fx(score === qs.length ? "clear" : "fanfare");
      const k = opt.key;
      if (k && (st.best[k] || 0) < score) { st.best[k] = score; save(); }
      const s = screen(`<div class="result"><div style="font-size:60px">${score === qs.length ? "🏆" : score >= qs.length * .6 ? "🎉" : "💪"}</div>
        <div class="score">${score} / ${qs.length}</div>
        <p>${score === qs.length ? "ぜんもん せいかい！ すごい！" : "まちがえた ことば は ノートで ふくしゅう できるよ"}</p>
        <div class="row"><button class="big sub" id="home">メニュー</button><button class="big" id="again">もういちど</button></div></div>`);
      s.querySelector("#home").onclick = () => { fx("tap"); home(); };
      s.querySelector("#again").onclick = () => { fx("tap"); opt.again ? opt.again() : home(); };
    };
    step();
  }

  // まちがい えらび（いみが ちかい もの・おなじ いみ の もの は さける）
  function distractors(e, pool, n, key) {
    const used = new Set([key(e)]);
    const out = [];
    for (const d of shuffle(pool)) {
      if (out.length >= n) break;
      if (related(e.id, d.id)) continue;
      const v = key(d);
      if (used.has(v)) continue;
      used.add(v); out.push(d);
    }
    return out;
  }

  /* ---------- いみ あて ---------- */
  function imiQuestions(list) {
    return list.map((e) => {
      const ch = [{ html: rb(e.m), ok: true }];
      if (e.miss) ch.push({ html: rb(e.miss), ok: false, wrongNote: "それは よく ある まちがい。" });
      distractors(e, KOTOWAZA, 4 - ch.length, (x) => x.m).forEach((d) => ch.push({ html: rb(d.m), ok: false }));
      const long = plain(e.w).length > 11;
      return {
        e, choices: shuffle(ch),
        html: `${e.miss ? '<span class="mark">⚠️ まちがえやすい</span>' : ""}<p class="q-ask">ほんとう の いみ は どれ？</p><div class="q-word ${long ? "long" : ""}">${rb(e.w)}</div>`,
      };
    });
  }
  function imi() {
    const pool = lvPool(KOTOWAZA);
    // まちがえやすい もの を 1〜2もん まぜる（レベル 3）
    let picks = shuffle(pool).slice(0, 10);
    runQuiz("いみ あて", imiQuestions(picks), home, { key: "imi", again: imi });
  }

  /* ---------- □に 入る ことば ---------- */
  function blankMenu() {
    setBar("□に 入る ことば", home);
    const s = screen(`<p class="th-lit">ステージ を えらんでね</p><div class="menu">${BLANK_STAGES.map((g) => {
      const n = KOTOWAZA.filter(g.filter).length;
      return `<button class="tile" data-id="${g.id}" style="--c:#7048e8"><span class="t-star">${g.star}</span><span class="t-emo">${g.emo}</span><span class="t-name">${g.name}</span><span class="t-desc">${n}こ${st.best["blank-" + g.id] != null ? ` ・ さいこう ${st.best["blank-" + g.id]}/10` : ""}</span></button>`;
    }).join("")}</div>
    <p class="th-lit" style="margin-top:12px">からだ の かんようく: め・みみ・くち・て・あし・くび・はら など</p>`);
    s.querySelectorAll(".tile").forEach((b) => b.onclick = () => { fx("tap"); blankPlay(BLANK_STAGES.find((g) => g.id === b.dataset.id)); });
  }
  function blankPlay(g) {
    const list = shuffle(lvPool(KOTOWAZA.filter(g.filter), 8)).slice(0, 10);
    const qs = list.map((e) => {
      const ok = { html: `<ruby>${e.b}<rt>${yomiOf(e.w, e.b)}</rt></ruby>`, ok: true };
      const plainW = plain(e.w);
      const ban = new Set([e.b, ...(e.nx || [])]);
      KOTOWAZA.forEach((x) => { if (x.b && related(e.id, x.id)) ban.add(x.b); });
      const cands = shuffle(POOL[e.bc]).filter((p) => {
        if (ban.has(p.c)) return false;
        return !PLAINS.has(plainW.replace(e.b, p.c));          // べつの ことば に なって しまう もの は 出さない
      }).slice(0, 3);
      const ch = [ok, ...cands.map((p) => ({ html: `<ruby>${p.c}<rt>${p.y}</rt></ruby>`, ok: false }))];
      return {
        e, cls: "grid2", choices: shuffle(ch),
        html: `<p class="q-ask">□に 入る ${BLANK_POOL[e.bc].name} は？</p><div class="q-word ${plainW.length > 11 ? "long" : ""}">${rbBlank(e.w, e.b)}</div><p class="q-hint">いみ: ${rb(e.m)}</p>`,
      };
    });
    runQuiz("□に 入る ことば", qs, blankMenu, { key: "blank-" + g.id, again: () => blankPlay(g) });
  }

  /* ---------- つかって みよう ---------- */
  function tsukau() {
    const base = KOTOWAZA.filter((e) => e.k !== "g");
    const list = shuffle(lvPool(base)).slice(0, 10);
    const qs = list.map((e) => {
      const ch = [{ html: rb(e.w), ok: true }];
      const dpool = lvPool(base.filter((x) => (x.k === "w") === (e.k === "w")), 8);
      distractors(e, dpool, 3, (x) => x.w).forEach((d) => ch.push({ html: rb(d.w), ok: false }));
      const sent = rbEx(e.ex.replace("『" + e.w + "』", "『＃』")).replace("『＃』", '『<span class="blank">　？　</span>』');
      return {
        e, choices: shuffle(ch),
        html: `<p class="q-ask">？に いちばん あう ことば は どれ？</p><p class="q-sent">${sent}</p>`,
      };
    });
    runQuiz("つかって みよう", qs, home, { key: "tsukau", again: tsukau });
  }

  /* ==================== なかま あつめ ==================== */
  function nakamaMenu() {
    setBar("なかま あつめ", home);
    const s = screen(`<p class="th-lit">おなじ なかま の 2まい を じゅんばんに タップして つなごう</p>
      <div class="menu">
        <button class="tile" data-m="syn" style="--c:#2b8a3e"><span class="t-emo">🤝</span><span class="t-name">にた いみ</span><span class="t-desc">「さるも きから おちる」と「かっぱの かわながれ」</span></button>
        <button class="tile" data-m="ant" style="--c:#e8590c"><span class="t-emo">↔️</span><span class="t-name">はんたい の いみ</span><span class="t-desc">「いそがば まわれ」と「ぜんは いそげ」</span></button>
      </div>`);
    s.querySelectorAll(".tile").forEach((b) => b.onclick = () => { fx("tap"); nakamaPlay(b.dataset.m, 0, 0); });
  }
  function pickPairs(mode) {
    const src = mode === "syn"
      ? shuffle(SYN).map((g) => shuffle(g).slice(0, 2))
      : shuffle(ANT).map((p) => p.slice());
    const okLv = (p) => p.every((id) => BY[id].lv <= st.lv);
    const ordered = [...src.filter(okLv), ...src.filter((p) => !okLv(p))];
    const out = [];
    for (const p of ordered) {
      if (out.length >= 4) break;
      // ほかの ペア と まぎらわしく ない もの だけ
      const clash = out.some((q) => q.some((a) => p.some((b) => related(a, b) || antOf(a).includes(b))));
      if (!clash) out.push(p);
    }
    return out;
  }
  const PAIR_COLORS = ["#2b8a3e", "#1971c2", "#c2255c", "#e67700"];
  function nakamaPlay(mode, round, total) {
    const ROUNDS = 3;
    setBar(mode === "syn" ? "なかま あつめ（にた いみ）" : "なかま あつめ（はんたい）", nakamaMenu);
    const pairs = pickPairs(mode);
    const cards = shuffle(pairs.flatMap((p, k) => p.map((id) => ({ id, k }))));
    const s = screen(`<div class="progress">${[...Array(ROUNDS)].map((_, k) => `<i class="${k < round ? "ok" : k === round ? "now" : ""}"></i>`).join("")}</div>
      <div class="pairs">${cards.map((c, n) => `<button class="pcard" data-n="${n}">${rb(BY[c.id].w)}</button>`).join("")}</div>
      <p class="n-msg" id="nmsg">${mode === "syn" ? "にた いみ の 2まい を さがそう" : "はんたい の いみ の 2まい を さがそう"}</p>
      <div id="nnext"></div>`);
    let sel = null, got = 0, miss = 0;
    const btns = [...s.querySelectorAll(".pcard")];
    btns.forEach((b) => b.onclick = () => {
      const n = +b.dataset.n, c = cards[n];
      if (b.classList.contains("done")) return;
      if (sel === null) { sel = n; b.classList.add("sel"); fx("tap"); return; }
      if (sel === n) { b.classList.remove("sel"); sel = null; return; }
      const a = cards[sel], ab = btns[sel];
      ab.classList.remove("sel"); sel = null;
      if (a.k === c.k) {
        got++; fx("correct");
        [ab, b].forEach((x) => { x.classList.add("done"); x.style.background = PAIR_COLORS[c.k]; });
        const e1 = BY[a.id], e2 = BY[c.id];
        $("#nmsg").innerHTML = mode === "syn"
          ? `⭕ どちらも「${rb(e1.m)}」`
          : `⭕「${rb(e1.w)}」は ${rb(e1.m)}<br>「${rb(e2.w)}」は ${rb(e2.m)}`;
        stamp(a.id) || stamp(c.id);
        if (got === pairs.length) {
          total += Math.max(0, pairs.length - miss);
          setTimeout(() => fx("fanfare"), 500);
          $("#nnext").innerHTML = `<button class="big" id="go">${round + 1 < ROUNDS ? "つぎの ボード ▶" : "おわり"}</button>`;
          $("#go").onclick = () => {
            fx("tap");
            if (round + 1 < ROUNDS) nakamaPlay(mode, round + 1, total);
            else { toast(`🎉 よく できました！ ${total}てん / ${ROUNDS * 4}`, 2600); nakamaMenu(); }
          };
        }
      } else {
        miss++; fx("wrong");
        [ab, b].forEach((x) => { x.classList.remove("shake"); void x.offsetWidth; x.classList.add("shake"); });
        $("#nmsg").innerHTML = `❌ ${mode === "syn" ? "その 2つは にて いないよ" : "その 2つは はんたい では ないよ"}<br>「${rb(BY[a.id].w)}」は ${rb(BY[a.id].m)}`;
      }
    });
  }

  /* ==================== ずかん ==================== */
  let zTab = "k";
  function zukan() {
    setBar("ことわざ ずかん", home);
    const list = KOTOWAZA.filter((e) => e.k === zTab);
    const got = list.filter((e) => st.stamp[e.id]).length;
    const s = screen(`<div class="seg" id="zTab">${Object.keys(KINDS).map((k) => `<button data-k="${k}" class="${k === zTab ? "on" : ""}">${rb(KINDS[k])}</button>`).join("")}</div>
      <p class="z-count">はんこ ${got} / ${list.length} ・ ぜんぶで ${stampCount()} / ${KOTOWAZA.length}</p>
      <div class="z-grid">${list.map((e) => `<button class="z-cell ${st.stamp[e.id] ? "got" : ""}" data-id="${e.id}">${rb(e.w)}${st.stamp[e.id] ? '<span class="stamp">おぼえた</span>' : ""}${e.miss ? '<span class="warn">⚠️</span>' : ""}</button>`).join("")}</div>`);
    s.querySelectorAll("#zTab button").forEach((b) => b.onclick = () => { fx("tap"); zTab = b.dataset.k; zukan(); });
    s.querySelectorAll(".z-cell").forEach((b) => b.onclick = () => { fx("tap"); detail(b.dataset.id); });
  }
  function detail(id) {
    const e = BY[id];
    const link = (ids) => ids.map((x) => `<button data-id="${x}">${rb(BY[x].w)}</button>`).join("");
    const syn = synOf(id), ant = antOf(id);
    $("#modalBody").innerHTML = `<div class="detail">
      <div class="tags"><span class="tag">${rb(KINDS[e.k])}</span><span class="tag">${rb(LEVELS[e.lv])}</span>${e.body ? `<span class="tag">からだ: ${e.body}</span>` : ""}${st.stamp[id] ? '<span class="tag" style="background:#ffe3e3;color:#e03131">おぼえた！</span>' : ""}</div>
      <div class="d-word">${rb(e.w)}</div><p class="d-yomi">よみ: ${esc(e.y)}</p>
      <p><span class="lab">いみ</span>${rb(e.m)}</p>
      ${e.miss ? `<p class="why">⚠️ <b>まちがえやすい:</b>「${rb(e.miss)}」は ちがう。${rb(e.why)}</p>` : ""}
      <p><span class="lab">つかいかた</span>${rbEx(e.ex)}</p>
      ${syn.length ? `<p class="links"><span class="lab">にた いみ</span>${link(syn)}</p>` : ""}
      ${ant.length ? `<p class="links"><span class="lab">はんたい</span>${link(ant)}</p>` : ""}
      ${e.n ? `<p>🔎 ${rb(e.n)}</p>` : ""}
      ${e.yu ? `<p class="yu">📜 <b><ruby>由来<rt>ゆらい</rt></ruby>:</b> ${rb(e.yu)}</p>` : ""}
      ${e.sc ? `<button class="big sub" id="dScene">🎭 げきじょう で みる</button>` : ""}
    </div>`;
    $("#modal").hidden = false;
    $("#modalBody").querySelectorAll(".links button").forEach((b) => b.onclick = () => { fx("tap"); detail(b.dataset.id); });
    const sc = $("#dScene");
    if (sc) sc.onclick = () => { fx("tap"); $("#modal").hidden = true; playScene(id, zukan); };
  }
  $("#modalClose").onclick = () => { fx("tap"); $("#modal").hidden = true; };
  $("#modal").onclick = (ev) => { if (ev.target.id === "modal") $("#modal").hidden = true; };

  /* ==================== ノート ==================== */
  function note() {
    setBar("まちがい ノート", home);
    const ids = Object.keys(st.note).filter((id) => BY[id]).sort((a, b) => st.note[b] - st.note[a]);
    const s = screen(ids.length ? `
      <p class="th-lit">まちがえた ことば。ふくしゅう で せいかい すると けえるよ</p>
      <button class="big" id="review">📒 ノート で ふくしゅう（${Math.min(10, ids.length)}もん）</button>
      <div class="note-list" style="margin-top:12px">${ids.map((id) => `<button class="note-item" data-id="${id}"><b>${rb(BY[id].w)}</b><span class="cnt">×${st.note[id]}</span></button>`).join("")}</div>`
      : `<p class="empty">ノートは からっぽ。<br>まちがえた ことば が ここに たまるよ。</p>`);
    s.querySelectorAll(".note-item").forEach((b) => b.onclick = () => { fx("tap"); detail(b.dataset.id); });
    const r = s.querySelector("#review");
    if (r) r.onclick = () => { fx("tap"); runQuiz("ノート で ふくしゅう", imiQuestions(shuffle(ids).slice(0, 10).map((id) => BY[id])), note, { fromNote: true, again: note }); };
  }

  const GO = { theater, imi, nakama: nakamaMenu, blank: blankMenu, tsukau, zukan, note };

  applySound(); applyFuri();
  // #theater などで ちょくせつ ひらける（スクショ用）
  const h = location.hash.slice(1);
  if (h.startsWith("scene=") && BY[h.slice(6)]) playScene(h.slice(6), theater);
  else if (GO[h]) GO[h]();
  else home();
})();
