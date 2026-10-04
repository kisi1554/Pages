"use strict";
/* ============================================================
   こっきたんけん：ゲーム本体
     ちず（GEO / makeMap）→ おと・こえ → ほぞん → 画面ごとの うごき
   ============================================================ */

const $ = (s, el = document) => el.querySelector(s);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.random() * a.length | 0];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ============================== ちず ============================== */
/* ミラー図法（よこに のびすぎない せかいちず）。x＝経度、y＝ミラーの 縦（度の 単位） */
const GEO = (() => {
  const R = Math.PI / 180;
  const my = (lat) => -1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * R)) / R;
  const ringsOf = (rs, q) => rs.map((s) => COUNTRIES.decode(s).map(([x, y]) => [x / q, y / q]));
  const proj = (rings) => rings.map((r) => r.map(([lon, lat]) => [lon, my(lat)]));
  const pathOf = (rings) => rings.map((r) => "M" + r.map(([x, y]) => x.toFixed(2) + "," + y.toFixed(2)).join("L") + "Z").join("");

  const shapes = {};   // id → { geo: [[lon,lat]…]…, xy: 投影ずみ, d: path, p: ラベル位置[x,y] }
  let landD = "";      // 47か国 いがいの りく（いっぽんの path に まとめる）
  for (const c of COUNTRIES.named) {
    const geo = ringsOf(c.r, COUNTRIES.q);
    if (NATION[c.id]) {
      const xy = proj(geo);
      shapes[c.id] = { geo, xy, d: pathOf(xy), p: [c.p[0], my(c.p[1])], ll: c.p };
    } else landD += pathOf(proj(geo));
  }
  // ロシアの しるしは ヨーロッパの ちずでも みえるように モスクワの ちかくに おく
  shapes[643].p = [42, my(57)];
  for (const c of COUNTRIES.plain) landD += pathOf(proj(ringsOf(c.r, COUNTRIES.qPlain)));

  const viewOf = (b) => { const y0 = my(b[3]), y1 = my(b[2]); return [b[0], y0, b[1] - b[0], y1 - y0]; };

  function inside(x, y, rings) {
    let hit = false;
    for (const r of rings) {
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i], [xj, yj] = r[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
      }
    }
    return hit;
  }
  return { my, shapes, landD, viewOf, inside };
})();

/**
 * ちずを つくる
 *  opts.box        みせる はんい [経度min, 経度max, 緯度min, 緯度max]
 *  opts.hl         ひからせる 国 id
 *  opts.colorGot   あつめた 国に たいりくの いろを ぬる
 *  opts.onTap(id)  タップした 国（47か国の どれか、なければ null）
 *  opts.tapIds     タップで えらべる 国（しぼるとき）
 */
function makeMap(host, opts = {}) {
  const v = GEO.viewOf(opts.box || WORLD_BOX);
  // わくの かたちと ちずの かたちが ちがうときは、はしを すこし (最大25%) きって おおきく みせる
  const W = host.clientWidth, H = host.clientHeight;
  if (W && H) {
    const k = (H / W) / (v[3] / v[2]);
    if (k > 1) { const c = Math.min(1.33, k), nw = v[2] / c; v[0] += (v[2] - nw) / 2; v[2] = nw; }
    else { const c = Math.min(1.33, 1 / k), nh = v[3] / c; v[1] += (v[3] - nh) / 2; v[3] = nh; }
  }
  const mr = v[2] / 34;
  let s = `<svg class="map" viewBox="${v.map((n) => n.toFixed(2)).join(" ")}" preserveAspectRatio="xMidYMid meet">` +
    `<rect x="-400" y="-400" width="800" height="800" class="sea"/>` +
    `<path class="land" d="${GEO.landD}" vector-effect="non-scaling-stroke"/>`;
  for (const n of NATIONS) {
    const got = opts.colorGot && prog.got[n.id] ? ` style="--fill:${REGION[n.r].tint};--edge:${REGION[n.r].col}" data-got="1"` : "";
    s += `<path class="nation" data-id="${n.id}"${got} d="${GEO.shapes[n.id].d}" vector-effect="non-scaling-stroke"/>`;
  }
  s += `<g class="marks"></g></svg>`;
  host.innerHTML = s;
  const svg = host.firstElementChild, marks = $(".marks", svg);

  const api = {
    svg,
    set(id, cls, on = true) { const el = svg.querySelector(`[data-id="${id}"]`); if (el) el.classList.toggle(cls, on); },
    highlight(id, cls = "hl") {
      svg.querySelectorAll("." + cls).forEach((el) => el.classList.remove(cls));
      marks.innerHTML = "";
      if (id == null) return;
      api.set(id, cls);
      const [x, y] = GEO.shapes[id].p;
      marks.innerHTML = `<circle class="pulse ${cls}" cx="${x}" cy="${y}" r="${mr}"/>`;
    },
    flash(id, cls) { api.set(id, cls); setTimeout(() => api.set(id, cls, false), 900); },
  };
  if (opts.hl != null) api.highlight(opts.hl);

  if (opts.onTap) {
    svg.addEventListener("click", (e) => {
      const ctm = svg.getScreenCTM(); if (!ctm) return;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const ids = opts.tapIds || NATIONS.map((n) => n.id);
      let hit = ids.find((id) => GEO.inside(pt.x, pt.y, GEO.shapes[id].xy));
      if (hit == null) {
        // ちいさい 国は ちかくを タップしても えらべるように する（画面で 28px いない）
        let best = 28;
        for (const id of ids) {
          const [x, y] = GEO.shapes[id].p;
          const q = new DOMPoint(x, y).matrixTransform(ctm);
          const d = Math.hypot(q.x - e.clientX, q.y - e.clientY);
          if (d < best) { best = d; hit = id; }
        }
      }
      opts.onTap(hit ?? null);
    });
  }
  return api;
}

/** おなじ ものさしで ならべた シルエット（にほんと くらべる） */
function sizeSVG(ids) {
  const R = Math.PI / 180;
  const parts = ids.map((id) => {
    const sh = GEO.shapes[id], [lon0, lat0] = sh.ll, k = Math.cos(lat0 * R);
    // とおくの しま（アラスカ・フランスりょうギアナ など）は のぞく
    const rings = sh.geo.filter((r) => {
      let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
      for (const [x, y] of r) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
      return Math.abs((a + b) / 2 - lon0) < 42 && Math.abs((c + d) / 2 - lat0) < 26;
    }).map((r) => r.map(([lon, lat]) => [(lon - lon0) * k, -(lat - lat0)]));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const r of rings) for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { id, rings, x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
  });
  const H = Math.max(...parts.map((p) => p.h)), gap = Math.max(H * 0.12, 1);
  let x = 0, body = "";
  for (const p of parts) {
    const dx = x - p.x0, dy = H - p.y1;
    const d = p.rings.map((r) => "M" + r.map(([a, b]) => (a + dx).toFixed(2) + "," + (b + dy).toFixed(2)).join("L") + "Z").join("");
    const col = p.id === 392 ? "#e2574c" : REGION[NATION[p.id].r].col;
    body += `<path d="${d}" fill="${col}" fill-opacity=".85" stroke="${col}" stroke-width="${(H / 120).toFixed(3)}"/>`;
    x += p.w + gap;
  }
  const W = x - gap, pad = H * 0.04;
  return `<svg class="size-svg" viewBox="${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}" preserveAspectRatio="xMidYMax meet">${body}</svg>`;
}

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
  const play = (fn) => { if (prog.sound) fn(); };
  return {
    unlock: ac,
    tap: () => play(() => tone(880, 0, 0.07, "triangle", 0.08)),
    ok: () => play(() => { tone(1046, 0, 0.16, "triangle"); tone(1318, 0.13, 0.32, "triangle"); }),
    ng: () => play(() => { tone(196, 0, 0.18, "square", 0.08); tone(165, 0.17, 0.28, "square", 0.08); }),
    stamp: () => play(() => { tone(140, 0, 0.18, "sine", 0.3, 60); tone(1568, 0.08, 0.2, "triangle", 0.1); }),
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
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ja-JP"; u.rate = 0.95; u.pitch = 1.1;
        if (voice) u.voice = voice;
        speechSynthesis.speak(u);
      } catch (e) { /* よみあげ できない ブラウザ */ }
    },
    stop() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } },
  };
})();

/* ============================== ほぞん ============================== */
const SAVE_KEY = "kokki-tanken-v1";
/* got[id]  … ポイント（いっぱつ せいかい＋2、まちがえてから せいかい＋1）。1いじょうで「あつめた」
   medal[k] … たいりくの クイズの ほし（1〜3、いちばん よかった かい） */
const prog = { got: {}, medal: {}, sound: true, voice: true };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (s && typeof s === "object") Object.assign(prog, s);
} catch (e) { /* よめなくても あそべる */ }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(prog)); } catch (e) { /* ほぞん できなくても あそべる */ } }

const gotCount = () => NATIONS.filter((n) => prog.got[n.id]).length;
const starsOf = (id) => Math.min(3, Math.floor((prog.got[id] || 0) / 2));
const starText = (k, max = 3) => "★".repeat(k) + "☆".repeat(max - k);

/* ============================== がめん きりかえ ============================== */
let current = "title";
function show(name) {
  Voice.stop();
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("is-active", s.id === "s-" + name));
  current = name;
  window.scrollTo(0, 0);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-go]");
  if (b) { Sound.tap(); if (b.dataset.go === "title") renderTitle(); show(b.dataset.go); }
});
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

/* ============================== くにの カード ============================== */
function cardHTML(n) {
  const rg = REGION[n.r];
  const cmp = n.id === 392 ? [392] : [392, n.id];
  return `<div class="ncard" style="--rc:${rg.col};--rt:${rg.tint}">
    <div class="ncard-flag">${flagSVG(n.id)}</div>
    <div class="ncard-head">
      <span class="ncard-name">${esc(n.n)}</span>
      <button class="speak" type="button" data-say="${n.id}" aria-label="よみあげ">🔈</button>
    </div>
    <div class="ncard-region">${rg.em} ${esc(rg.n)}の くに ${prog.got[n.id] ? `<span class="stars">${starText(starsOf(n.id))}</span>` : ""}</div>
    <p class="ncard-fact"><span class="em">${n.em}</span>${esc(n.f)}</p>
    <p class="ncard-hint">🚩 <b>こっきの ひみつ</b>　${esc(n.h)}</p>
    <div class="ncard-row">
      <div class="ncard-map" data-map="${n.id}"></div>
      <div class="ncard-size">
        ${sizeSVG(cmp)}
        <div class="size-legend">${n.id === 392 ? "" : `<span class="jp">■ にほん</span> <span style="color:${rg.col}">■ ${esc(n.n)}</span>`}</div>
        <div class="size-words">📏 ${esc(sizeWords(n))}</div>
      </div>
    </div>
  </div>`;
}
function mountCard(host, n, speak = true) {
  host.innerHTML = cardHTML(n);
  makeMap($(".ncard-map", host), { box: REGION[n.r].box, hl: n.id });
  if (speak) sayCard(n);
}
const sayCard = (n) => Voice.say(`${n.y}。${n.f.replace(/（.*?）/g, "")}`);
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-say]");
  if (b) { e.stopPropagation(); sayCard(NATION[b.dataset.say]); }
});

/* モーダル（ずかん・ちずで さがす から ひらく） */
function openModal(n) {
  const m = $("#modal");
  mountCard($(".modal-body", m), n);
  m.hidden = false;
}
$("#modal").addEventListener("click", (e) => {
  if (e.target.id === "modal" || e.target.closest(".modal-close")) { Voice.stop(); $("#modal").hidden = true; }
});

/* ============================== タイトル ============================== */
function renderTitle() {
  const c = gotCount();
  $("#got-num").textContent = c;
  $("#got-bar").style.width = (c / NATIONS.length * 100) + "%";
  $("#complete").hidden = c < NATIONS.length;
  makeMap($("#title-map"), { colorGot: true, onTap: () => { Sound.tap(); openExplore("world"); } });
  $("#region-list").innerHTML = REGIONS.map((r) => {
    const list = NATIONS.filter((n) => n.r === r.key), got = list.filter((n) => prog.got[n.id]).length;
    return `<button class="region" type="button" data-region="${r.key}" style="--accent:${r.col};--tint:${r.tint}">
      <span class="r-emoji">${r.em}</span>
      <span class="r-name">${esc(r.n)}</span>
      <span class="r-flags">${list.slice(0, 4).map((n) => prog.got[n.id] ? flagSVG(n.id, "mini") : `<i class="mini q">？</i>`).join("")}</span>
      <span class="r-count">${got} / ${list.length}こ</span>
      <span class="r-medal">${prog.medal[r.key] ? starText(prog.medal[r.key]) : "　"}</span>
    </button>`;
  }).join("");
  $("#btn-sound").textContent = prog.sound ? "🔊 おと" : "🔇 おと";
  $("#btn-voice").textContent = prog.voice ? "🗣️ こえ" : "🤐 こえ";
}
$("#region-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-region]");
  if (b) { Sound.tap(); openRegion(b.dataset.region); }
});
$("#btn-sound").addEventListener("click", () => { prog.sound = !prog.sound; save(); renderTitle(); Sound.tap(); });
$("#btn-voice").addEventListener("click", () => { prog.voice = !prog.voice; save(); renderTitle(); if (prog.voice) Voice.say("こえを だすよ"); else Voice.stop(); });

/* ============================== たいりく（おぼえる） ============================== */
const learn = { region: null, list: [], i: 0 };
function openRegion(key) {
  const r = REGION[key];
  learn.region = key;
  learn.list = NATIONS.filter((n) => n.r === key);
  learn.i = 0;
  $("#learn-title").textContent = `${r.em} ${r.n}`;
  $("#s-learn").style.setProperty("--accent", r.col);
  show("learn");
  renderLearn();
}
function renderLearn() {
  const n = learn.list[learn.i], last = learn.i === learn.list.length - 1;
  $("#learn-count").textContent = `${learn.i + 1} / ${learn.list.length}`;
  $("#learn-dots").innerHTML = learn.list.map((x, i) => `<i class="${i === learn.i ? "on" : ""} ${prog.got[x.id] ? "got" : ""}"></i>`).join("");
  mountCard($("#learn-card"), n);
  $("#learn-prev").disabled = learn.i === 0;
  $("#learn-next").hidden = last;
  $("#learn-quiz").classList.toggle("is-big", last);
}
$("#learn-prev").addEventListener("click", () => { if (learn.i > 0) { learn.i--; Sound.tap(); renderLearn(); } });
$("#learn-next").addEventListener("click", () => { if (learn.i < learn.list.length - 1) { learn.i++; Sound.tap(); renderLearn(); } });
$("#learn-quiz").addEventListener("click", () => { Sound.tap(); startQuiz(learn.region); });
// よこに スワイプでも めくれる
(() => {
  let x0 = null;
  const el = $("#learn-card");
  el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener("touchend", (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (dx < -60) $("#learn-next").hidden || $("#learn-next").click();
    else if (dx > 60) $("#learn-prev").click();
  });
})();

/* ============================== クイズ ============================== */
const TYPES = ["f2n", "n2f", "f2m", "m2f"];
const quiz = { region: null, qs: [], i: 0, miss: 0, misses: 0, log: [], busy: false, map: null, newGot: [] };

function weightOf(id) { return 4 - Math.min(3, starsOf(id)); }
function choosePool(pool, k) {
  // まだ おぼえていない 国ほど でやすい（おもみつき・かさならない）
  const out = []; let bag = pool.slice();
  while (out.length < k) {
    if (!bag.length) bag = pool.filter((n) => n !== out[out.length - 1]);
    const total = bag.reduce((s, n) => s + weightOf(n.id), 0);
    let r = Math.random() * total, idx = 0;
    for (; idx < bag.length - 1; idx++) { r -= weightOf(bag[idx].id); if (r < 0) break; }
    out.push(bag.splice(idx, 1)[0]);
  }
  return out;
}
function distractors(ans, k) {
  const same = shuffle(NATIONS.filter((n) => n.r === ans.r && n !== ans));
  const other = shuffle(NATIONS.filter((n) => n.r !== ans.r));
  return same.concat(other).slice(0, k);
}

function startQuiz(regionKey) {
  const mix = regionKey === "mix";
  const pool = mix ? NATIONS : NATIONS.filter((n) => n.r === regionKey);
  const k = mix ? 10 : Math.max(6, Math.min(8, pool.length));
  let types = [];
  while (types.length < k) types = types.concat(shuffle(TYPES));
  quiz.region = regionKey;
  quiz.qs = choosePool(pool, k).map((ans, i) => ({ ans, type: types[i], nc: mix ? 4 : 3 }));
  quiz.i = 0; quiz.misses = 0; quiz.log = []; quiz.newGot = [];
  const r = REGION[regionKey];
  $("#quiz-title").textContent = mix ? "🌍 ぜんぶ ミックス" : `${r.em} ${r.n}`;
  $("#s-quiz").style.setProperty("--accent", mix ? "#1b6fa8" : r.col);
  show("quiz");
  renderQuestion();
}

function renderQuestion() {
  const q = quiz.qs[quiz.i], a = q.ans;
  quiz.miss = 0; quiz.busy = false; quiz.map = null;
  $("#quiz-dots").innerHTML = quiz.qs.map((_, i) => `<i class="${i < quiz.i ? (quiz.log[i] ? "ok" : "ng") : i === quiz.i ? "on" : ""}"></i>`).join("");
  $("#feedback").hidden = true;
  const stage = $("#q-stage"), ch = $("#q-choices");
  stage.className = "q-stage"; ch.className = "q-choices";
  let text, say;

  if (q.type === "f2n") {
    text = "この こっきは どこの くに？"; say = text;
    stage.innerHTML = `<div class="big-flag">${flagSVG(a.id)}</div>`;
    const opts = shuffle([a, ...distractors(a, q.nc - 1)]);
    ch.classList.add("names");
    ch.innerHTML = opts.map((n) => `<button type="button" class="choice" data-id="${n.id}">${esc(n.n)}</button>`).join("");
  } else if (q.type === "n2f") {
    text = `「${a.n}」の こっきは どれ？`; say = `${a.y}の こっきは どれ？`;
    stage.innerHTML = `<div class="big-name">${esc(a.n)}</div>`;
    stage.classList.add("is-name");
    const opts = shuffle([a, ...distractors(a, 3)]);
    ch.classList.add("flags");
    ch.innerHTML = opts.map((n) => `<button type="button" class="choice" data-id="${n.id}">${flagSVG(n.id)}</button>`).join("");
  } else if (q.type === "f2m") {
    text = "この こっきの くには どこ？ ちずを タップ！"; say = "この こっきの くには どこかな？ ちずを タップしてね";
    stage.innerHTML = `<div class="map-wrap"><div class="map-host"></div><div class="corner-flag">${flagSVG(a.id)}</div></div>`;
    stage.classList.add("is-map");
    ch.classList.add("is-empty"); ch.innerHTML = "";
    const tapIds = quiz.region === "mix" ? null : NATIONS.filter((n) => n.r === a.r).map((n) => n.id);
    quiz.map = makeMap($(".map-host", stage), { box: REGION[a.r].box, tapIds, onTap: (id) => answer(id) });
  } else {
    text = "ひかっている くにの こっきは どれ？"; say = text;
    stage.innerHTML = `<div class="map-wrap"><div class="map-host"></div></div>`;
    stage.classList.add("is-map");
    quiz.map = makeMap($(".map-host", stage), { box: REGION[a.r].box, hl: a.id });
    const opts = shuffle([a, ...distractors(a, q.nc - 1)]);
    ch.classList.add("flags", "row");
    ch.innerHTML = opts.map((n) => `<button type="button" class="choice" data-id="${n.id}">${flagSVG(n.id)}</button>`).join("");
  }
  $("#q-text").textContent = text;
  quiz.say = say;
  Voice.say(say);
}
$("#q-choices").addEventListener("click", (e) => {
  const b = e.target.closest(".choice");
  if (b && !b.disabled) answer(+b.dataset.id, b);
});
$("#q-again").addEventListener("click", () => Voice.say(quiz.say));

function answer(id, btn) {
  if (quiz.busy) return;
  const q = quiz.qs[quiz.i], a = q.ans;
  if (id == null) { Voice.say("そこは うみ だよ。くにを タップしてね"); return; }
  if (id === a.id) return correct(btn);

  quiz.miss++;
  Sound.ng();
  const n = NATION[id];
  if (btn) {
    btn.disabled = true; btn.classList.add("ng");
    Voice.say(q.type === "f2n" ? "ちがうよ。もういちど！" : `それは ${n.y}の こっき。もういちど！`);
    // 4つから えらぶとき、2かい まちがえたら こたえを ゆびさす
    const left = [...document.querySelectorAll("#q-choices .choice:not(:disabled)")];
    if (quiz.miss >= 2 && left.length > 1) left.find((x) => +x.dataset.id === a.id).classList.add("hint");
  } else if (quiz.map) {
    quiz.map.flash(id, "ng");
    Voice.say(`そこは ${n.y}。もういちど！`);
    if (quiz.miss >= 3) { quiz.map.highlight(a.id, "hint"); Voice.say(`そこは ${n.y}。ひかっている ところを みてみよう`); }
  }
}

function correct(btn) {
  quiz.busy = true;
  const q = quiz.qs[quiz.i], a = q.ans, first = quiz.miss === 0;
  if (btn) btn.classList.add("ok");
  if (quiz.map) { quiz.map.highlight(a.id, "ok"); }
  const wasGot = !!prog.got[a.id];
  prog.got[a.id] = (prog.got[a.id] || 0) + (first ? 2 : 1);
  save();
  quiz.log[quiz.i] = first;
  if (!first) quiz.misses++;
  const isNew = !wasGot;
  if (isNew) quiz.newGot.push(a.id);
  Sound.ok();
  if (isNew) setTimeout(Sound.stamp, 380);

  const fb = $("#feedback");
  fb.innerHTML = `<div class="fb-inner ${first ? "" : "soso"}">
    <div class="fb-mark">${first ? "せいかい！" : "できた！"}</div>
    <div class="fb-main">${flagSVG(a.id)}<div><div class="fb-name">${esc(a.n)}</div><div class="fb-fact">${a.em} ${esc(a.f)}</div></div></div>
    ${isNew ? `<div class="fb-new">🎉 あたらしい こっきを ゲット！</div>` : ""}
    <button type="button" class="btn primary" id="fb-next">${quiz.i === quiz.qs.length - 1 ? "けっかを みる" : "つぎへ"} ▶</button>
  </div>`;
  fb.hidden = false;
  Voice.say(`${first ? "せいかい！" : "できたね！"} ${a.y}。${a.f.replace(/（.*?）/g, "")}`);
  $("#fb-next").addEventListener("click", () => {
    Sound.tap();
    quiz.i++;
    if (quiz.i < quiz.qs.length) renderQuestion(); else finishQuiz();
  });
}

function finishQuiz() {
  const total = quiz.qs.length, m = quiz.misses;
  const stars = m <= 1 ? 3 : m <= 3 ? 2 : 1;
  const key = quiz.region;
  const best = Math.max(prog.medal[key] || 0, stars);
  prog.medal[key] = best; save();
  Sound.fanfare();
  const title = key === "mix" ? "🌍 ぜんぶ ミックス" : `${REGION[key].em} ${REGION[key].n}`;
  $("#result-body").innerHTML = `
    <div class="res-title">${esc(title)}</div>
    <div class="res-stars">${starText(stars)}</div>
    <div class="res-msg">${stars === 3 ? "すごい！ こっき はかせ だね！" : stars === 2 ? "よく できました！" : "さいごまで がんばったね！"}</div>
    <div class="res-score">いっぱつ せいかい ${total - m} / ${total}</div>
    <div class="res-log">${quiz.qs.map((q, i) => `<div class="res-item ${quiz.log[i] ? "ok" : "soso"}">${flagSVG(q.ans.id)}<span>${quiz.log[i] ? "◎" : "○"}</span></div>`).join("")}</div>
    ${quiz.newGot.length ? `<div class="res-new">🎉 あたらしく あつめた こっき：${quiz.newGot.length}こ<br>${quiz.newGot.map((id) => flagSVG(id, "mini")).join("")}</div>` : ""}
    <div class="res-total">ぜんぶで ${gotCount()} / ${NATIONS.length}こ あつめたよ</div>`;
  $("#res-learn").hidden = key === "mix";
  show("result");
  Voice.say(`${stars === 3 ? "すごい！ こっきはかせ だね" : stars === 2 ? "よく できました" : "さいごまで がんばったね"}。ほしは ${stars}こ！`);
}
$("#res-again").addEventListener("click", () => { Sound.tap(); startQuiz(quiz.region); });
$("#res-learn").addEventListener("click", () => { Sound.tap(); openRegion(quiz.region); });
$("#btn-mix").addEventListener("click", () => { Sound.tap(); startQuiz("mix"); });

/* ============================== ずかん ============================== */
function openZukan() {
  $("#zukan-num").textContent = `${gotCount()} / ${NATIONS.length}`;
  $("#zukan-list").innerHTML = REGIONS.map((r) => `
    <h3 style="--accent:${r.col}">${r.em} ${esc(r.n)}</h3>
    <div class="zk-grid">${NATIONS.filter((n) => n.r === r.key).map((n) => prog.got[n.id]
      ? `<button type="button" class="zk got" data-id="${n.id}">${flagSVG(n.id)}<span class="zk-name">${esc(n.n)}</span><span class="stars">${starText(starsOf(n.id))}</span></button>`
      : `<button type="button" class="zk" data-id="${n.id}" style="--tint:${r.tint}"><span class="zk-q">？</span><span class="zk-name">？？？</span></button>`).join("")}</div>`).join("");
  show("zukan");
}
$("#btn-zukan").addEventListener("click", () => { Sound.tap(); openZukan(); });
$("#zukan-list").addEventListener("click", (e) => {
  const b = e.target.closest(".zk"); if (!b) return;
  Sound.tap();
  const n = NATION[b.dataset.id];
  if (prog.got[n.id]) openModal(n);
  else Voice.say(`${REGION[n.r].y}の クイズで あつめよう！`);
});

/* ============================== ちずで さがす ============================== */
let exploreMap = null;
function openExplore(key) {
  show("explore");
  $("#explore-tabs").innerHTML = [`<button type="button" data-box="world" class="${key === "world" ? "on" : ""}">🌍 せかい</button>`]
    .concat(REGIONS.map((r) => `<button type="button" data-box="${r.key}" class="${key === r.key ? "on" : ""}" style="--accent:${r.col}">${r.em} ${esc(r.n)}</button>`)).join("");
  $("#explore-info").innerHTML = `<p class="explore-tip">👆 くにを タップしてみよう</p>`;
  exploreMap = makeMap($("#explore-map"), {
    box: key === "world" ? WORLD_BOX : REGION[key].box, colorGot: true,
    onTap: (id) => {
      if (id == null) return;
      Sound.tap();
      const n = NATION[id];
      exploreMap.highlight(id);
      $("#explore-info").innerHTML = `<button type="button" class="explore-card" data-id="${id}">
        ${flagSVG(id)}<span><b>${esc(n.n)}</b><small>${n.em} ${esc(n.f)}</small></span><span class="more">くわしく ▶</span></button>`;
      sayCard(n);
    },
  });
}
$("#btn-explore").addEventListener("click", () => { Sound.tap(); openExplore("world"); });
$("#explore-tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-box]"); if (b) { Sound.tap(); openExplore(b.dataset.box); } });
$("#explore-info").addEventListener("click", (e) => { const b = e.target.closest(".explore-card"); if (b) openModal(NATION[b.dataset.id]); });

/* ============================== どっちが おおきい？ ============================== */
const size = { round: 0, score: 0, pair: null, busy: false };
const SIZE_ROUNDS = 5;
function openSize() { size.round = 0; size.score = 0; show("size"); nextSize(); }
function nextSize() {
  let a, b;
  do { [a, b] = shuffle(NATIONS).slice(0, 2); } while (Math.max(a.a, b.a) / Math.min(a.a, b.a) < 1.4);
  size.pair = [a, b]; size.busy = false;
  $("#size-round").textContent = `${size.round + 1} / ${SIZE_ROUNDS}`;
  $("#size-choices").innerHTML = [a, b].map((n) => `<button type="button" class="size-btn" data-id="${n.id}">${flagSVG(n.id)}<span>${esc(n.n)}</span></button>`).join("");
  $("#size-reveal").innerHTML = "";
  $("#size-next").hidden = true;
  Voice.say(`${a.y}と ${b.y}。おおきいのは どっち？`);
}
$("#size-choices").addEventListener("click", (e) => {
  const btn = e.target.closest(".size-btn"); if (!btn || size.busy) return;
  size.busy = true;
  const [a, b] = size.pair, big = a.a > b.a ? a : b, ok = +btn.dataset.id === big.id;
  if (ok) { size.score++; Sound.ok(); } else Sound.ng();
  document.querySelectorAll(".size-btn").forEach((x) => x.classList.add(+x.dataset.id === big.id ? "ok" : "dim"));
  const ids = [a.id, b.id].sort((x, y) => NATION[y].a - NATION[x].a);
  if (!ids.includes(392)) ids.push(392);
  $("#size-reveal").innerHTML = `${sizeSVG(ids)}
    <div class="size-legend">${ids.map((id) => `<span style="color:${id === 392 ? "#e2574c" : REGION[NATION[id].r].col}">■ ${esc(NATION[id].n)}</span>`).join(" ")}</div>
    <ul class="size-list">${[a, b].map((n) => `<li><b>${esc(n.n)}</b>　${esc(sizeWords(n))}</li>`).join("")}</ul>`;
  $("#size-next").textContent = size.round === SIZE_ROUNDS - 1 ? "けっかを みる ▶" : "つぎへ ▶";
  $("#size-next").hidden = false;
  Voice.say(`${ok ? "せいかい！" : "ざんねん！"} おおきいのは ${big.y}。${sizeWords(big)}`);
});
$("#size-next").addEventListener("click", () => {
  Sound.tap();
  size.round++;
  if (size.round < SIZE_ROUNDS) return nextSize();
  $("#size-choices").innerHTML = "";
  $("#size-reveal").innerHTML = `<div class="size-end"><div class="res-stars">${starText(size.score, SIZE_ROUNDS)}</div><p>${SIZE_ROUNDS}もん ちゅう ${size.score}もん せいかい！</p>
    <button type="button" class="btn primary" id="size-again">もういちど</button></div>`;
  $("#size-next").hidden = true;
  if (size.score >= 4) Sound.fanfare();
  Voice.say(`${size.score}もん せいかい！`);
  $("#size-again").addEventListener("click", () => { Sound.tap(); openSize(); });
});
$("#btn-size").addEventListener("click", () => { Sound.tap(); openSize(); });

/* ============================== はじめ ============================== */
renderTitle();
show("title");
