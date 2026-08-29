"use strict";
/* ============================================================
   ぐるぐるアース：ドックの UI・ミッションの しんこう・メインループ
   ============================================================ */

/* ============================================================
   11. ドックの UI
   ============================================================ */
const $ = id => document.getElementById(id);
const chipsBox = $("cityChips");
const chipEls = CITIES.map((c, i) => {
  const b = document.createElement("button");
  b.className = "chip"; b.textContent = c.face + " " + c.name;
  b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
  b.addEventListener("click", () => { selectCity(i); sfx.tap(); });
  chipsBox.appendChild(b);
  return b;
});
function selectCity(i) {
  S.city = i;
  chipEls.forEach((b, k) => b.setAttribute("aria-pressed", k === i ? "true" : "false"));
  $("groundTag").textContent = CITIES[i].name;
}

const spdBtns = [$("spd0"), $("spd1"), $("spd2")];
spdBtns.forEach((b, i) => b.addEventListener("click", () => {
  S.auto = i; spdBtns.forEach((x, k) => x.setAttribute("aria-pressed", k === i ? "true" : "false")); sfx.tap();
}));
const seasonBtns = Array.from(document.querySelectorAll("[data-season]"));
seasonBtns.forEach(b => b.addEventListener("click", () => {
  S.season = +b.dataset.season;
  S.phiTarget = SEASONS[S.season].phi * RAD;
  seasonBtns.forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  sfx.tap();
  say("🌍", "きせつ「" + SEASONS[S.season].name + "」だと " + SEASONS[S.season].note + "よ。");
}));
function toggleKey(el, key, onText) {
  el.addEventListener("click", () => {
    S[key] = !S[key];
    el.setAttribute("aria-pressed", S[key] ? "true" : "false");
    if (key === "sound" && S[key]) { ac(); }
    sfx.tap();
    if (onText) say("✨", onText(S[key]));
  });
}
toggleKey($("btnRays"), "rays", v => v ? "たいようから ひかりが まっすぐ とんでくるよ。" : "ひかりの すじを けしたよ。");
toggleKey($("btnAxis"), "axis", v => v ? "ちきゅうは この じくを まんなかに して まわっているよ。ちょっと かたむいてるね!" : "じくを けしたよ。");
toggleKey($("btnSound"), "sound", null);
$("btnNear").addEventListener("click", () => {
  S.camYaw = 62 * RAD; S.camPitch = 15 * RAD; S.camDistTarget = 5.6; sfx.tap();
  say("🔎", "ちきゅうに ちかづいたよ。ひると よるの さかいめを みてみよう。");
});
$("btnWide").addEventListener("click", () => {
  S.camYaw = 84 * RAD; S.camPitch = 24 * RAD; S.camDistTarget = 21; sfx.tap();
  say("🌞", "たいようと ちきゅうの ぜんたいだよ。ちきゅうは この みちを 1ねんかけて まわるんだ。");
});

function setSay(face, text) {
  const f = $("sayFace"), t = $("sayText");
  if (f.textContent !== face) f.textContent = face;
  if (t.textContent !== text) t.textContent = text;
}
/* ボタンの せつめいなどは しばらく のこす */
let sayLockUntil = 0;
/** 国を えらぶ（タップ・ピン・ミッションから よばれる） */
function selectCountry(c, at) {
  S.countryId = c ? c.id : null;
  setHighlight(c);
  if (!c) {                                   // 海を タップした
    if (at) say("🌊", "ここは うみだよ。りくを タップしてみてね。");
    return;
  }
  const h = lonHour(at ? at.lon : c.p[0]);
  const pod = partOfDay(h);
  const isNew = !S.visited.has(c.id);
  if (isNew) { S.visited.add(c.id); updateBook(); saveState(); }
  say(pod.face, (isNew ? "はじめての 国! " : "") +
      c.n + "だよ。いま " + hourLabel(h) + " ごろ、" + pod.label + "。");
  speak(c.k);
  if (isNew) { sfx.star(); milestone(); } else sfx.tap();
}

/* ---------- くにの ずかん ---------- */
const MILESTONES = [5, 10, 20, 40, 60, 77];
function updateBook() {
  const n = S.visited.size;
  $("bookCount").textContent = n;
  $("bookAll").textContent = COUNTRIES.named.length;
  $("bookBtn").classList.toggle("is-got", n > 0);
}
function milestone() {
  if (!MILESTONES.includes(S.visited.size)) return;
  S.stars++; $("starCount").textContent = S.stars;
  burst(); saveState();
  say("📗", "ずかんが " + S.visited.size + "こに なった! ⭐を 1つ あげる。");
}
function openBook() {
  const list = COUNTRIES.named.slice().sort((a, b) => a.n.localeCompare(b.n, "ja"));
  const got = S.visited.size, all = COUNTRIES.named.length;
  openSheet(
    '<div class="sheet-eyebrow">くにの ずかん</div>' +
    '<h2 class="sheet-title">' + got + " / " + all + " こ あつめた</h2>" +
    '<p class="sheet-body">ちきゅうの 国を タップすると ここに たまるよ。</p>' +
    '<div class="book-grid">' +
      list.map(c => S.visited.has(c.id)
        ? '<span class="book-item is-got">' + c.n + "</span>"
        : '<span class="book-item">?</span>').join("") +
    "</div>" +
    '<div class="cta-row"><button class="cta" id="bookClose">とじる</button></div>'
  );
  $("bookClose").addEventListener("click", () => { closeSheet(); sfx.tap(); });
}

function say(face, text) { setSay(face, text); sayLockUntil = performance.now() + 5200; }

/* いまの ようすを ことばで（たいようの たかさは その場で かわる） */
function talkAbout(g) {
  if (performance.now() < sayLockUntil) return;
  const c = CITIES[S.city];
  setSay(g.pod.face, g.alt > 0
    ? c.name + "は いま " + g.pod.label + "。たいようは そらの たかさ やく " + Math.round(g.alt) + "ど だよ。"
    : c.name + "は いま " + g.pod.label + "。たいようは じめんの したに かくれているよ。");
}

/* ============================================================
   12. ミッション（あそびながら まなぶ ながれ）
   ============================================================ */




let stepIndex = 0, stepBase = 0, holdT = 0, sheetOpen = false, finished = false;

/* ほぞん */
function saveState() {
  try { localStorage.setItem("guruguru-earth", JSON.stringify({ s: S.stars, i: stepIndex, f: finished, v: [...S.visited] })); } catch (e) {}
}
function loadState() {
  try {
    const d = JSON.parse(localStorage.getItem("guruguru-earth") || "{}");
    if (typeof d.s === "number") S.stars = d.s;
    if (typeof d.i === "number") stepIndex = clamp(d.i, 0, STEPS.length - 1);
    if (d.f) finished = true;
    if (Array.isArray(d.v)) S.visited = new Set(d.v);
  } catch (e) {}
}

const sheet = $("sheet"), sheetCard = $("sheetCard");
function openSheet(html) { sheetCard.innerHTML = html; sheet.classList.add("is-open"); sheetOpen = true; }
function closeSheet() { sheet.classList.remove("is-open"); sheetOpen = false; }

function setMissionCard() {
  const card = $("missionCard");
  if (S.mode === "free") {
    $("missionNo").textContent = "⭐" + S.stars;
    $("missionKind").textContent = "じゆうモード";
    $("missionTitle").textContent = "すきなだけ まわして たんけん!";
    $("missionHint").textContent = "くにを タップすると ずかんに たまるよ";
    $("missionBar").style.width = "100%";
    return;
  }
  const st = STEPS[stepIndex];
  $("missionNo").textContent = (stepIndex + 1) + " / " + STEPS.length;
  $("missionKind").textContent = (st.ch ? st.ch + " · " : "") + st.kind;
  $("missionTitle").textContent = st.title;
  $("missionHint").textContent = typeof st.hint === "function" ? st.hint() : st.hint;
  $("missionBar").style.width = (stepIndex / STEPS.length * 100) + "%";
  card.style.display = "";
}

function startStep() {
  const st = STEPS[stepIndex];
  stepBase = S.odo; holdT = 0;
  if (st.setup) st.setup();
  setMissionCard();
  if (st.type === "quiz") setTimeout(showQuiz, 420);
}

function showQuiz() {
  const st = STEPS[stepIndex];
  openSheet(
    '<div class="sheet-eyebrow">クイズ</div>' +
    '<h2 class="sheet-title">' + st.q + "</h2>" +
    '<div class="answers">' +
      st.choices.map((c, i) => '<button class="answer" data-i="' + i + '">' + c + "</button>").join("") +
    "</div>"
  );
  sheetCard.querySelectorAll(".answer").forEach(b => {
    b.addEventListener("click", () => {
      const i = +b.dataset.i;
      if (i === st.answer) { b.classList.add("is-right"); sfx.ok(); setTimeout(() => succeed(), 450); }
      else {
        b.classList.add("is-wrong"); sfx.wrong();
        setTimeout(() => { b.classList.remove("is-wrong"); }, 700);
        say("🤔", "おしい! もういちど かんがえてみよう。");
      }
    });
  });
}

function succeed() {
  const st = STEPS[stepIndex];
  S.stars++; $("starCount").textContent = S.stars;
  burst(); sfx.star();
  openSheet(
    '<div class="sheet-eyebrow">ミッション クリア</div>' +
    '<div class="sheet-big">' + st.face + "</div>" +
    '<h2 class="sheet-title">' + st.done + "</h2>" +
    '<p class="sheet-body">' + st.body + "</p>" +
    '<div class="cta-row"><button class="cta" id="nextBtn">' +
      (stepIndex + 1 < STEPS.length ? "つぎへ すすむ ▶" : "けっかを みる 🏆") + "</button></div>"
  );
  $("nextBtn").addEventListener("click", () => {
    closeSheet(); sfx.tap();
    if (stepIndex + 1 < STEPS.length) { stepIndex++; startStep(); saveState(); }
    else { finished = true; saveState(); showFinish(); }
  });
  saveState();
}

function showFinish() {
  openSheet(
    '<div class="sheet-eyebrow">にんてい しょう</div>' +
    '<div class="sheet-big">🏆</div>' +
    '<h2 class="sheet-title">ひるよる はかせ に なった!</h2>' +
    '<p class="sheet-body">⭐ ' + S.stars + " こ あつめたよ。<br>" +
      "ちきゅうは 24じかんで 1かいてん。たいようの ひかりが あたる がわが ひる、あたらない がわが よる。<br>" +
      "じくが かたむいて いるから、きせつで ひるの ながさも かわる。<br>" +
      "せかいには " + COUNTRIES.named.length + "の 国。きみは いま " + S.visited.size + "こ あつめたよ。</p>" +
    '<div class="cta-row">' +
      '<button class="cta" id="freeBtn">じゆうに あそぶ 🌍</button>' +
      '<button class="cta ghost" id="againBtn">もういちど</button>' +
    "</div>"
  );
  $("freeBtn").addEventListener("click", () => { closeSheet(); setMode("free"); sfx.tap(); });
  $("againBtn").addEventListener("click", () => {
    closeSheet(); stepIndex = 0; finished = false; startStep(); saveState(); sfx.tap();
  });
}

function setMode(m) {
  S.mode = m;
  $("tabMission").setAttribute("aria-selected", m === "mission" ? "true" : "false");
  $("tabFree").setAttribute("aria-selected", m === "free" ? "true" : "false");
  if (m === "mission") startStep(); else { closeSheet(); setMissionCard(); }
}
$("bookBtn").addEventListener("click", () => { openBook(); sfx.tap(); });
$("tabMission").addEventListener("click", () => { setMode("mission"); sfx.tap(); });
$("tabFree").addEventListener("click", () => { setMode("free"); sfx.tap(); });

/* ============================================================
   13. メインループ
   ============================================================ */
const AUTO_SPEED = [0, Math.PI * 2 / 24, Math.PI * 2 / 6];
let last = performance.now(), hudT = 0;

function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  S.time += dt;

  /* じてん：じどう + ドラッグの いきおい */
  const auto = AUTO_SPEED[S.auto] * dt;
  if (auto) { S.spin += auto; S.odo += auto; }
  if (!drag && Math.abs(S.spinVel) > 0.00002) {
    const d = S.spinVel * dt * 60;
    S.spin += d; S.odo += Math.abs(d);
    S.spinVel *= Math.pow(0.94, dt * 60);
  }

  /* きせつの いどう（たいようの まわりを なめらかに） */
  let dp = S.phiTarget - S.phi;
  while (dp >  Math.PI) dp -= Math.PI * 2;
  while (dp < -Math.PI) dp += Math.PI * 2;
  if (Math.abs(dp) > 1e-4) S.phi += dp * Math.min(1, dt * 2.4);
  /* ズームの アニメ */
  S.camDist += (S.camDistTarget - S.camDist) * Math.min(1, dt * 2.6);

  renderScene();
  updatePins();
  drawFx();

  /* HUD は 1/10 びょうごとに */
  hudT += dt;
  if (hudT > 0.1) {
    hudT = 0;
    const g = drawGround();
    const c = CITIES[S.city];
    $("clockTime").textContent = hourLabel(g.h);
    $("clockPart").textContent = g.pod.label;
    $("dayLen").textContent = dayLength(c).toFixed(1);
    $("turnCount").textContent = Math.floor(S.odo / (Math.PI * 2));
    talkAbout(g);
    if (S.mode === "mission" && !sheetOpen && typeof STEPS[stepIndex].hint === "function")
      $("missionHint").textContent = STEPS[stepIndex].hint();
  }

  /* ミッションの はんてい */
  if (S.mode === "mission" && !sheetOpen && !finished) {
    const st = STEPS[stepIndex];
    if (st.type === "act") {
      if (st.check(stepBase)) { holdT += dt; if (holdT > 0.45) succeed(); }
      else holdT = 0;
    }
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   14. スタート
   ============================================================ */
loadState();
resize();
updateBook();
if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) S.camDist = S.camDistTarget;
selectCity(0);
$("starCount").textContent = S.stars;
setMode(finished ? "free" : "mission");
say("🌏", "ちきゅうを ドラッグして まわしてみよう。くにを タップすると なまえが わかるよ。");
requestAnimationFrame(tick);
