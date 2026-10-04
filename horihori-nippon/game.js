"use strict";
/* ============================================================
   ほりほり にっぽん：ゲーム本体
   ============================================================ */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ============================== ほぞん ============================== */
const SAVE_KEY = "horihori-nippon-v1";
const prog = { dug: {}, sound: true, voice: true };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (s && typeof s === "object") Object.assign(prog, s);
} catch (e) { /* よめなくても あそべる */ }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(prog)); } catch (e) { /* ほぞん できなくても あそべる */ } }
const dugCount = () => SPOTS.filter((s) => prog.dug[s.id]).length;

/* ============================== おと・こえ ============================== */
const Sound = (() => {
  let ctx = null;
  const ac = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  function tone(freq, t0, dur, type = "sine", vol = 0.18, slide) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  /** ザクッ（つちを ほる おと） */
  function crunch(t0) {
    const c = ac(); if (!c) return;
    const n = c.sampleRate * 0.18, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = "lowpass"; f.frequency.value = 900; g.gain.value = 0.5;
    src.connect(f).connect(g).connect(c.destination); src.start(c.currentTime + t0);
  }
  const play = (fn) => { if (prog.sound) fn(); };
  return {
    unlock: ac,
    tap: () => play(() => tone(880, 0, 0.07, "triangle", 0.08)),
    dig: () => play(() => { crunch(0); crunch(0.16); }),
    ok: () => play(() => { tone(1046, 0, 0.16, "triangle"); tone(1318, 0.13, 0.32, "triangle"); }),
    ng: () => play(() => { tone(196, 0, 0.18, "square", 0.08); tone(165, 0.17, 0.28, "square", 0.08); }),
    treasure: () => play(() => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.35, "triangle", 0.12))),
    fanfare: () => play(() => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.12, i === 5 ? 0.6 : 0.16, "triangle", 0.14))),
  };
})();

const Voice = (() => {
  let voice = null;
  const choose = () => {
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => v.lang === "ja-JP") || vs.find((v) => (v.lang || "").startsWith("ja")) || null;
  };
  if (window.speechSynthesis) { choose(); speechSynthesis.onvoiceschanged = choose; }
  return {
    say(text) {
      if (!prog.voice || !window.speechSynthesis) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(kana(text));
        u.lang = "ja-JP"; u.rate = 0.95; u.pitch = 1.1;
        if (voice) u.voice = voice;
        speechSynthesis.speak(u);
      } catch (e) { /* よみあげ できない ブラウザ */ }
    },
    stop() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } },
  };
})();

/* ============================== にほんちず ============================== */
/**
 * opts.hl      ひからせる 県コードの はいれつ
 * opts.pins    ピンを たてる SPOTS（タップで opts.onPin(id)）
 * opts.focus   [経度, 緯度] … その まわりを おおきく みせる
 * opts.onPref  県を タップしたとき（県コード）
 */
function makeJpMap(host, opts = {}) {
  let vb = MAP_VIEWBOX;
  if (opts.focus) {
    const [x, y] = project(...opts.focus);
    vb = `${(x - 260).toFixed(1)} ${(y - 210).toFixed(1)} 520 420`;
  }
  const hl = new Set(opts.hl || []);
  let s = `<svg class="jpmap" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">` +
    `<rect x="-2000" y="-2000" width="6000" height="6000" class="sea"/>` +
    `<rect class="oki" x="${OKI_FRAME.x}" y="${OKI_FRAME.y}" width="${OKI_FRAME.w}" height="${OKI_FRAME.h}" rx="10"/>`;
  for (const p of PREFECTURES) s += `<path class="pref${hl.has(p.code) ? " hl" : ""}" data-code="${p.code}" d="${p.path}"/>`;
  s += `<g class="pins">`;
  for (const sp of opts.pins || []) {
    const [x, y] = project(...sp.ll), dug = prog.dug[sp.id];
    s += `<g class="pin${dug ? " dug" : ""}" data-spot="${sp.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">` +
      `<circle r="30"/><text y="13" text-anchor="middle" font-size="36">${dug ? sp.em : "⛏️"}</text></g>`;
  }
  if (opts.focus) {
    const [x, y] = project(...opts.focus);
    s += `<circle class="here" cx="${x}" cy="${y}" r="16"/>`;
  }
  s += `</g></svg>`;
  host.innerHTML = s;
  const svg = host.firstElementChild;
  svg.addEventListener("click", (e) => {
    const pin = e.target.closest(".pin");
    if (pin && opts.onPin) return opts.onPin(pin.dataset.spot);
    const pr = e.target.closest(".pref");
    if (pr && opts.onPref) opts.onPref(+pr.dataset.code);
  });
  return {
    svg,
    flash(code, cls) {
      const el = svg.querySelector(`.pref[data-code="${code}"]`); if (!el) return;
      el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 900);
    },
    mark(codes, cls) { codes.forEach((c) => svg.querySelector(`.pref[data-code="${c}"]`)?.classList.add(cls)); },
  };
}

/* ============================== がめん ============================== */
function show(name) {
  Voice.stop();
  $$(".screen").forEach((s) => s.classList.toggle("is-active", s.id === "s-" + name));
  const sc = $("#s-" + name); if (sc) sc.scrollTop = 0;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-go]");
  if (b) { Sound.tap(); if (b.dataset.go === "title") renderTitle(); show(b.dataset.go); }
});
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

const prefsText = (sp) => sp.pref.map(prefRuby).join("・");
const terrainOf = (sp) => TERRAIN[sp.t];
const groupOf = (sp) => GROUPS[terrainOf(sp).g];

/* ============================== タイトル ============================== */
function renderTitle() {
  const c = dugCount();
  $("#dug-num").textContent = c;
  $("#dug-bar").style.width = (c / SPOTS.length * 100) + "%";
  $("#complete").hidden = c < SPOTS.length;
  makeJpMap($("#title-map"), { pins: SPOTS, onPin: (id) => { Sound.tap(); openDig(id); } });
  $("#spot-list").innerHTML = Object.entries(GROUPS).map(([g, gr]) => {
    const list = SPOTS.filter((s) => terrainOf(s).g === g);
    return `<h3 class="grp" style="--accent:${gr.col}">${gr.em} ${gr.n}</h3><div class="spots">` +
      list.map((s) => `<button type="button" class="spot${prog.dug[s.id] ? " dug" : ""}" data-spot="${s.id}" style="--accent:${gr.col};--tint:${gr.tint}">
        <span class="sp-em">${prog.dug[s.id] ? s.em : "⛏️"}</span>
        <span class="sp-txt"><b>${rubyHTML(prefsText(s))}</b><small>${prog.dug[s.id] ? s.prod : rubyHTML(s.place)}</small></span>
      </button>`).join("") + `</div>`;
  }).join("");
  $("#btn-sound").textContent = prog.sound ? "🔊 おと" : "🔇 おと";
  $("#btn-voice").textContent = prog.voice ? "🗣️ こえ" : "🤐 こえ";
}
$("#spot-list").addEventListener("click", (e) => { const b = e.target.closest("[data-spot]"); if (b) { Sound.tap(); openDig(b.dataset.spot); } });
$("#btn-sound").addEventListener("click", () => { prog.sound = !prog.sound; save(); renderTitle(); Sound.tap(); });
$("#btn-voice").addEventListener("click", () => { prog.voice = !prog.voice; save(); renderTitle(); if (prog.voice) Voice.say("こえを だすよ"); else Voice.stop(); });

/* ============================== ほる ============================== */
const LAYERS = [
  { key: "where", em: "📍", n: "どこ？" },
  { key: "land",  em: "⛰️", n: "どんな ちけい？" },
  { key: "prod",  em: "🎁", n: "なにが とれる？" },
  { key: "why",   em: "💡", n: "どうして？" },
];
const dig = { spot: null, depth: 0 };

function layerHTML(sp, key) {
  const t = terrainOf(sp);
  if (key === "where") return `<div class="ly-where"><div class="ly-map"></div>
    <p class="big">${rubyHTML(prefsText(sp))}の<br>${rubyHTML(sp.place)}</p></div>`;
  if (key === "land") return `${diagramSVG(sp.t)}<p class="big">${rubyHTML(t.n)}</p><p>${rubyHTML(t.d)}</p>`;
  if (key === "prod") return `<div class="ly-prod"><span class="prod-em">${sp.em}</span><div><p class="big">${rubyHTML(sp.prod)}</p><p class="rank">🏆 ${rubyHTML(sp.rank)}</p></div></div>`;
  return `<ol class="why">${sp.why.map((w, i) => `<li><span class="num">${i + 1}</span><span>${rubyHTML(w)}</span></li>`).join("")}</ol>`;
}
function sayLayer(sp, key) {
  const t = terrainOf(sp);
  if (key === "where") return Voice.say(`${kana(prefsText(sp))}の ${sp.place}`);
  if (key === "land") return Voice.say(`${t.n}。${t.d}`);
  if (key === "prod") return Voice.say(`${sp.prod}！ ${sp.rank}`);
  Voice.say(`どうしてかというと、${sp.why.join("。")}`);
}

function openDig(id, reveal = false) {
  const sp = SPOT[id], gr = groupOf(sp);
  dig.spot = sp; dig.depth = 0;
  $("#dig-title").innerHTML = `${sp.em && prog.dug[id] ? sp.em : "⛏️"} ${rubyHTML(sp.place)}`;
  $("#s-dig").style.setProperty("--accent", gr.col);
  $("#s-dig").style.setProperty("--tint", gr.tint);
  $("#dig-layers").innerHTML = LAYERS.map((L, i) => `
    <section class="layer" data-i="${i}">
      <h3><span class="dep">${i + 1}</span>${L.em} ${L.n}</h3>
      <div class="ly-body"></div>
      <button type="button" class="dirt" data-dig="${i}" ${i ? "disabled" : ""}><span class="pick">⛏️</span><span class="dirt-txt">${i ? "うえを ほってから" : "タップして ほる！"}</span></button>
    </section>`).join("") +
    `<section class="treasure" hidden></section>`;
  show("dig");
  if (reveal) { for (let i = 0; i < LAYERS.length; i++) uncover(i, true); showTreasure(true); }
  else Voice.say(`${kana(prefsText(sp))}を ほってみよう！ つちを タップしてね`);
}

function uncover(i, quiet) {
  const sp = dig.spot, L = LAYERS[i], sec = $(`.layer[data-i="${i}"]`);
  $(".ly-body", sec).innerHTML = layerHTML(sp, L.key);
  sec.classList.add("open");
  if (L.key === "where") makeJpMap($(".ly-map", sec), { hl: sp.pref, focus: sp.ll });
  dig.depth = i + 1;
  const next = $(`.dirt[data-dig="${i + 1}"]`);
  if (next) { next.disabled = false; $(".dirt-txt", next).textContent = "タップして ほる！"; }
  if (!quiet) {
    sayLayer(sp, L.key);
    setTimeout(() => sec.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }
}
$("#dig-layers").addEventListener("click", (e) => {
  const b = e.target.closest(".dirt");
  if (!b || b.disabled || b.classList.contains("going")) return;
  const i = +b.dataset.dig;
  b.classList.add("going");
  Sound.dig();
  setTimeout(() => {
    uncover(i);
    if (i === LAYERS.length - 1) setTimeout(() => showTreasure(false), 400);
  }, 520);
});

function showTreasure(quiet) {
  const sp = dig.spot, first = !prog.dug[sp.id];
  prog.dug[sp.id] = (prog.dug[sp.id] || 0) + (quiet ? 0 : 1);
  save();
  const next = SPOTS.filter((s) => !prog.dug[s.id]);
  const box = $(".treasure");
  box.innerHTML = `
    <div class="chest">${first && !quiet ? "🎉" : "📦"}</div>
    <p class="big">${sp.em} ${rubyHTML(sp.prod)}の ひみつ、${first && !quiet ? "ほりあてた！" : "ゲットずみ！"}</p>
    <div class="mame"><b>🔍 もっと ほりさげ</b><p>${rubyHTML(sp.mame)}</p><button type="button" class="speak" data-say-mame>🔈</button></div>
    <div class="tr-btns">
      ${next.length ? `<button type="button" class="btn primary" id="dig-next">⛏️ つぎの ばしょを ほる</button>` : ""}
      <button type="button" class="btn" data-go="title">🗾 ちずに もどる</button>
    </div>`;
  box.hidden = false;
  if (!quiet) {
    Sound.treasure();
    Voice.say(`やったね！ ${sp.prod}の ひみつを ほりあてた！ もっと ほりさげ。${sp.mame}`);
    setTimeout(() => box.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }
  $("#dig-next")?.addEventListener("click", () => { Sound.tap(); openDig(next[Math.random() * next.length | 0].id); });
  $("[data-say-mame]", box).addEventListener("click", () => Voice.say(sp.mame));
}

/* ============================== なぜなに クイズ ============================== */
const QTYPES = ["why", "land", "prod", "map"];
const quiz = { qs: [], i: 0, miss: 0, misses: 0, log: [], busy: false, map: null, say: "" };

function startQuiz() {
  const dug = SPOTS.filter((s) => prog.dug[s.id]);
  const pool = dug.length >= 4 ? dug : SPOTS;
  const n = 8;
  let picks = [];
  while (picks.length < n) picks = picks.concat(shuffle(pool));
  let types = [];
  while (types.length < n) types = types.concat(shuffle(QTYPES));
  quiz.qs = picks.slice(0, n).map((sp, i) => ({ sp, type: types[i] }));
  quiz.i = 0; quiz.misses = 0; quiz.log = [];
  $("#quiz-note").hidden = dug.length >= 4;
  show("quiz");
  renderQ();
}
/** ちがう ちけいの スポットから 2つ */
const others = (sp, k = 2) => {
  const seen = new Set([sp.t]), out = [];
  for (const o of shuffle(SPOTS)) { if (!seen.has(o.t)) { seen.add(o.t); out.push(o); } if (out.length === k) break; }
  return out;
};

function renderQ() {
  const q = quiz.qs[quiz.i], sp = q.sp;
  quiz.miss = 0; quiz.busy = false; quiz.map = null;
  $("#quiz-dots").innerHTML = quiz.qs.map((_, i) => `<i class="${i < quiz.i ? (quiz.log[i] ? "ok" : "ng") : i === quiz.i ? "on" : ""}"></i>`).join("");
  $("#feedback").hidden = true;
  const stage = $("#q-stage"), ch = $("#q-choices");
  stage.className = "q-stage"; ch.className = "q-choices";
  let text;
  if (q.type === "why") {
    text = `${prefsText(sp)}で ${sp.prod}が たくさん とれるのは どうして？`;
    stage.innerHTML = `<div class="q-big-em">${sp.em}</div>`;
    ch.classList.add("texts");
    ch.innerHTML = shuffle([sp, ...others(sp)]).map((o) => `<button type="button" class="choice" data-ans="${o.t}">${rubyHTML(o.key)}</button>`).join("");
  } else if (q.type === "land") {
    text = "この ちけいの なまえは なに？";
    stage.innerHTML = `<div class="q-diagram">${diagramSVG(sp.t)}</div>`;
    ch.classList.add("names");
    ch.innerHTML = shuffle([sp, ...others(sp)]).map((o) => `<button type="button" class="choice" data-ans="${o.t}">${rubyHTML(TERRAIN[o.t].n)}</button>`).join("");
  } else if (q.type === "prod") {
    text = `${sp.place}は ${TERRAIN[sp.t].n}。ここで とれる ものは どれ？`;
    stage.innerHTML = `<div class="q-diagram small">${diagramSVG(sp.t)}</div>`;
    ch.classList.add("prods");
    ch.innerHTML = shuffle([sp, ...others(sp)]).map((o) => `<button type="button" class="choice" data-ans="${o.t}"><span class="ch-em">${o.em}</span>${rubyHTML(o.prod)}</button>`).join("");
  } else {
    text = `${sp.em} ${sp.prod}の ひみつの ばしょは どこ？ ちずを タップ！`;
    stage.innerHTML = `<div class="q-map"></div>`;
    stage.classList.add("is-map");
    ch.classList.add("is-empty"); ch.innerHTML = "";
    quiz.map = makeJpMap($(".q-map", stage), { onPref: (code) => answerMap(code) });
  }
  $("#q-text").innerHTML = rubyHTML(text);
  quiz.say = text;
  Voice.say(text);
}
$("#q-choices").addEventListener("click", (e) => {
  const b = e.target.closest(".choice");
  if (!b || b.disabled || quiz.busy) return;
  const sp = quiz.qs[quiz.i].sp;
  if (b.dataset.ans === sp.t) { b.classList.add("ok"); return correct(); }
  miss(); b.disabled = true; b.classList.add("ng");
  Voice.say("ざんねん。もういちど かんがえてみよう");
});
$("#q-again").addEventListener("click", () => Voice.say(quiz.say));

function answerMap(code) {
  if (quiz.busy) return;
  const sp = quiz.qs[quiz.i].sp;
  if (sp.pref.includes(code)) { quiz.map.mark(sp.pref, "ok"); return correct(); }
  miss();
  quiz.map.flash(code, "ng");
  if (quiz.miss >= 3) { quiz.map.mark(sp.pref, "hint"); Voice.say(`そこは ${PREF[code].kana}。ひかっている ところを みてみよう`); }
  else Voice.say(`そこは ${PREF[code].kana}。もういちど！`);
}
function miss() { quiz.miss++; Sound.ng(); }

function correct() {
  quiz.busy = true;
  const sp = quiz.qs[quiz.i].sp, first = quiz.miss === 0;
  quiz.log[quiz.i] = first; if (!first) quiz.misses++;
  Sound.ok();
  const fb = $("#feedback");
  fb.innerHTML = `<div class="fb-inner ${first ? "" : "soso"}">
    <div class="fb-mark">${first ? "せいかい！" : "できた！"}</div>
    <p class="fb-head">${sp.em} ${rubyHTML(prefsText(sp))}の ${rubyHTML(sp.prod)}</p>
    <ol class="why small">${sp.why.map((w, i) => `<li><span class="num">${i + 1}</span><span>${rubyHTML(w)}</span></li>`).join("")}</ol>
    <button type="button" class="btn primary" id="fb-next">${quiz.i === quiz.qs.length - 1 ? "けっかを みる" : "つぎへ"} ▶</button>
  </div>`;
  fb.hidden = false;
  Voice.say(`${first ? "せいかい！" : "できたね！"} ${sp.key}。`);
  $("#fb-next").addEventListener("click", () => {
    Sound.tap(); quiz.i++;
    if (quiz.i < quiz.qs.length) renderQ(); else finishQuiz();
  });
}
function finishQuiz() {
  const total = quiz.qs.length, m = quiz.misses, stars = m <= 1 ? 3 : m <= 3 ? 2 : 1;
  Sound.fanfare();
  $("#result-body").innerHTML = `
    <div class="res-title">🧠 なぜなに クイズ</div>
    <div class="res-stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
    <div class="res-msg">${stars === 3 ? "すごい！ ちけい はかせ だね！" : stars === 2 ? "よく できました！" : "さいごまで がんばったね！"}</div>
    <div class="res-score">いっぱつ せいかい ${total - m} / ${total}</div>
    <div class="res-log">${quiz.qs.map((q, i) => `<div class="res-item ${quiz.log[i] ? "ok" : "soso"}"><span class="em">${q.sp.em}</span><span>${quiz.log[i] ? "◎" : "○"}</span></div>`).join("")}</div>`;
  show("result");
  Voice.say(`ほしは ${stars}こ！`);
}
$("#btn-quiz").addEventListener("click", () => { Sound.tap(); startQuiz(); });
$("#res-again").addEventListener("click", () => { Sound.tap(); startQuiz(); });

/* ============================== たからばこ ============================== */
function openBox() {
  $("#box-num").textContent = `${dugCount()} / ${SPOTS.length}`;
  $("#box-list").innerHTML = SPOTS.map((s) => prog.dug[s.id]
    ? `<button type="button" class="tb got" data-spot="${s.id}" style="--tint:${groupOf(s).tint}"><span class="tb-em">${s.em}</span><b>${rubyHTML(s.prod)}</b><small>${rubyHTML(prefsText(s))}</small></button>`
    : `<button type="button" class="tb" data-spot="${s.id}"><span class="tb-em">⛏️</span><b>？？？</b><small>${rubyHTML(prefsText(s))}</small></button>`).join("");
  show("box");
}
$("#btn-box").addEventListener("click", () => { Sound.tap(); openBox(); });
$("#box-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-spot]"); if (!b) return;
  Sound.tap(); openDig(b.dataset.spot, !!prog.dug[b.dataset.spot]);
});

/* ============================== ちけい ずかん ============================== */
function openZukan() {
  $("#zukan-list").innerHTML = Object.entries(GROUPS).map(([g, gr]) =>
    `<h3 class="grp" style="--accent:${gr.col}">${gr.em} ${gr.n}</h3>` +
    Object.entries(TERRAIN).filter(([, t]) => t.g === g).map(([k, t]) => `
      <article class="tz" style="--accent:${gr.col};--tint:${gr.tint}">
        ${diagramSVG(k)}
        <div class="tz-body">
          <h4>${rubyHTML(t.n)} <button type="button" class="speak" data-say-terrain="${k}">🔈</button></h4>
          <p>${rubyHTML(t.d)}</p>
          <div class="tz-spots">${SPOTS.filter((s) => s.t === k).map((s) =>
            `<button type="button" class="chip" data-spot="${s.id}">${prog.dug[s.id] ? s.em : "⛏️"} ${rubyHTML(prefsText(s))}</button>`).join("")}</div>
        </div>
      </article>`).join("")).join("");
  show("zukan");
}
$("#btn-zukan").addEventListener("click", () => { Sound.tap(); openZukan(); });
$("#zukan-list").addEventListener("click", (e) => {
  const sb = e.target.closest("[data-say-terrain]");
  if (sb) { const t = TERRAIN[sb.dataset.sayTerrain]; return Voice.say(`${t.n}。${t.d}`); }
  const b = e.target.closest("[data-spot]");
  if (b) { Sound.tap(); openDig(b.dataset.spot, !!prog.dug[b.dataset.spot]); }
});

/* ============================== はじめ ============================== */
renderTitle();
show("title");
