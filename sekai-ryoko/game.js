"use strict";
/* ============================================================
   せかい いっしゅう りょこう：ゲーム本体
     ほぞん → 画面きりかえ → タイトル → ちず・ひこう → とうちゃく → まち
     → じさ とけい → パスポート → おみやげ → ミッション
   ============================================================ */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.random() * a.length | 0];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/** {漢字|かんじ} → ふりがな つき */
const rb = (s) => esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>");
/** よみあげ用（ふりがなの ほうを よむ） */
const yomi = (s) => String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "$2");
const KEYS = ["hi", "food", "bld", "ani", "ride"];
const N = COUNTRIES_DATA.length;

/* ============================== ほぞん ============================== */
const SAVE_KEY = "sekai-ryoko-v1";
/* stamps[id] = { d: はじめて ついた ひ "YYYY-MM-DD", n: いった かいすう }
   found[id]  = { hi:1, food:1, … }  まちで みつけた もの
   gifts[id]  = 1                     おみやげ
   mis[key]   = 1                     ミッション たっせい */
const prog = { sound: true, voice: true, airport: "haneda", here: null, stamps: {}, found: {}, gifts: {}, mis: {}, quiz: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (s && typeof s === "object") Object.assign(prog, s);
} catch (e) { /* よめなくても あそべる */ }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(prog)); } catch (e) { /* ほぞん できなくても あそべる */ } }
Settings.sound = prog.sound; Settings.voice = prog.voice;
if (!COUNTRY[prog.here]) prog.here = null;

const visitedCount = () => COUNTRIES_DATA.filter((c) => prog.stamps[c.id]).length;
const foundOf = (id) => prog.found[id] || (prog.found[id] = {});
const foundCount = (id) => KEYS.filter((k) => (prog.found[id] || {})[k]).length;

/* ============================== がめん ============================== */
let cur = "title", backTo = "title", clockTimer = null;
function show(name) {
  if (name !== "scene") BGM.stop();
  if (name !== "clock" && clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  if (name !== "map") cancelFlight();
  Voice.stop();
  cur = name;
  $$(".screen").forEach((s) => s.classList.toggle("is-active", s.id === "s-" + name));
}
function openScreen(name) {
  if (["clock", "passport", "zukan", "mission"].includes(name)) backTo = cur === name ? backTo : cur;
  Sound.tap();
  ({ title: renderTitle, map: () => openMap(), clock: () => openClock(), passport: openPassport, zukan: openZukan, mission: openMission })[name]();
}
function goBack() {
  Sound.tap();
  if (backTo === "scene" && prog.here) openScene(prog.here, false);
  else if (backTo === "map") openMap();
  else renderTitle();
}

function toast(html, ms = 2600) {
  const t = $("#toast");
  t.innerHTML = html; t.hidden = false;
  t.classList.remove("on"); void t.offsetWidth; t.classList.add("on");
  clearTimeout(toast.tm); toast.tm = setTimeout(() => { t.hidden = true; }, ms);
}
function modal(html, onClose) {
  $(".modal-body").innerHTML = html;
  $("#modal").hidden = false;
  modal.onClose = onClose || null;
}
function closeModal() {
  $("#modal").hidden = true;
  Voice.stop();
  const f = modal.onClose; modal.onClose = null; if (f) f();
}

function syncToggles() {
  $$(".js-sound").forEach((b) => { b.textContent = prog.sound ? "🔊 おと" : "🔇 おと"; b.classList.toggle("off", !prog.sound); });
  $$(".js-voice").forEach((b) => { b.textContent = prog.voice ? "🗣️ よみあげ" : "🤐 よみあげ"; b.classList.toggle("off", !prog.voice); });
}

/* ============================== タイトル ============================== */
function renderTitle() {
  show("title");
  syncToggles();
  const k = visitedCount();
  $("#got-num").textContent = k; $("#all-num").textContent = N;
  $("#got-bar").style.width = (k / N * 100) + "%";
  makeMap($("#title-map"), { visited: prog.stamps, night: true, fit: false, onTap: () => openScreen("map") });
}

/* ============================== ちず・ひこう ============================== */
let bigMap = null, mapBox = "world", dest = null, flight = null;

function openMap(selectId) {
  show("map");
  const ap = HOME.airports;
  $("#airports").innerHTML = `<span>🛫 どこから？</span>` + Object.entries(ap).map(([k, a]) =>
    `<button type="button" class="pill${prog.airport === k ? " on" : ""}" data-ap="${k}">${esc(a.n.replace(" くうこう", ""))}</button>`).join("");
  const tabs = [{ key: "world", n: "せかい", em: "🌏", col: "#1c7ed6" }].concat(REGIONS);
  $("#map-tabs").innerHTML = tabs.map((r) =>
    `<button type="button" data-box="${r.key}" class="${mapBox === r.key ? "on" : ""}" style="--accent:${r.col}">${r.em} ${esc(r.n)}</button>`).join("");
  $("#fly-info").hidden = true; $("#fly-skip").hidden = true;
  $("#map-tabs").classList.remove("lock"); $("#airports").classList.remove("lock");
  drawBigMap();
  if (selectId) selectDest(selectId, false);
  else { dest = null; renderDest(); }
}
function drawBigMap() {
  const box = mapBox === "world" ? WORLD_BOX : REGION[mapBox].box;
  const keep = COUNTRIES_DATA.filter((c) => mapBox === "world" || c.r === mapBox).map((c) => c.ll);
  bigMap = makeMap($("#big-map"), { box, keep, visited: prog.stamps, dots: true, night: true, onTap: (id) => {
    if (flight) return;
    if (id == null) { Sound.tap(); return; }
    selectDest(id);
  } });
  if (dest) bigMap.highlight(dest);
}
function flightHours(c) {
  const km = GEO.km(HOME.airports[prog.airport].ll, c.ll);
  return { km: Math.round(km / 100) * 100, h: Math.max(1, Math.round((km / 820 + 0.6) * 2) / 2) };
}
const hoursWords = (h) => (h % 1 ? `${Math.floor(h)}じかん はん` : `${h}じかん`);
function selectDest(id, speak = true) {
  const c = COUNTRY[id];
  dest = id;
  Sound.tap();
  bigMap.highlight(id);
  renderDest();
  if (speak) Voice.say(`${c.y}。${c.state ? c.state.replace(" ", "") + "。しゅうとは" : "しゅとは"} ${c.cap.replace(/（.*?）/, "")}`);
}
function renderDest() {
  const box = $("#dest");
  if (!dest) {
    box.innerHTML = `<p class="hint">ちずで いきたい <ruby>国<rt>くに</rt></ruby>を タップしてね（<ruby>首都<rt>しゅと</rt></ruby>の ● の ちかくでも OK）</p>`;
    return;
  }
  const c = COUNTRY[dest], f = flightHours(c), d = Clock.diff(c.tz);
  const been = prog.stamps[c.id] ? `<span class="tag">📕 ${prog.stamps[c.id].n}かい</span>` : "";
  box.innerHTML = `<div class="dest-card" style="--accent:${REGION[c.r].col};--tint:${REGION[c.r].tint}">
    <div class="dest-flag">${flagSVG(c.id)}</div>
    <div class="dest-text">
      <b>${esc(c.n)}</b> ${been}<br>
      <small>${c.state ? `🇺🇸 ${esc(c.state)}・<ruby>州都<rt>しゅうと</rt></ruby>` : `<ruby>首都<rt>しゅと</rt></ruby>`}：${esc(c.cap)}　<span class="rg">${REGION[c.r].em} ${esc(REGION[c.r].n)}</span></small><br>
      <small>✈️ やく ${hoursWords(f.h)}（${f.km.toLocaleString()}km）・<ruby>時差<rt>じさ</rt></ruby> ${esc(Clock.diffWords(d))}</small>
    </div>
    <button type="button" class="btn primary go" id="btn-fly">しゅっぱつ！</button>
  </div>`;
}
function cancelFlight() { if (flight) { flight.anim && flight.anim.cancel(); flight = null; } }
function takeOff() {
  if (!dest || flight) return;
  const c = COUNTRY[dest], ap = HOME.airports[prog.airport], f = flightHours(c);
  // とぶ ときは せかいちずで みせる
  if (mapBox !== "world") { mapBox = "world"; $$("#map-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.box === "world")); drawBigMap(); bigMap.highlight(dest); }
  $("#map-tabs").classList.add("lock"); $("#airports").classList.add("lock");
  $("#dest").innerHTML = `<p class="hint">🛫 ${esc(ap.n)}から ${esc(c.n)}へ ひこうちゅう…</p>`;
  const info = $("#fly-info");
  info.hidden = false;
  info.innerHTML = `✈️ ${esc(c.n)}まで やく <b>${hoursWords(f.h)}</b><small>（ちょくせつ いく びんが なく、のりかえる ことも あるよ）</small>`;
  $("#fly-skip").hidden = false;
  Sound.takeoff();
  Voice.say(`${ap.n}から ${c.y}へ しゅっぱつ。やく ${hoursWords(f.h)}の たびです`);
  const ms = Math.min(6500, 2600 + f.h * 220);
  flight = { id: dest };
  flight.anim = bigMap.fly(ap.ll, c.ll, ms, () => land());
}
function land() {
  if (!flight) return;
  const id = flight.id;
  flight.anim && flight.anim.cancel();
  flight = null;
  $("#fly-skip").hidden = true;
  Sound.land();
  setTimeout(() => arrive(id), 900);
}

/* ============================== とうちゃく ============================== */
function todayStr() { const p = Clock.parts(HOME.tz); return `${p.y}-${Clock.pad(p.mo)}-${Clock.pad(p.d)}`; }

function stampSVG(c, date, big = false) {
  const col = REGION[c.r].col, rot = ((c.id * 37) % 24) - 12;
  const [y, m, d] = (date || "").split("-");
  const name = c.n.length > 7 ? c.n.slice(0, 7) + "…" : c.n;
  return `<svg class="stamp${big ? " big" : ""}" viewBox="0 0 120 120" aria-hidden="true"><g transform="rotate(${rot} 60 60)" fill="none" stroke="${col}">
    <circle cx="60" cy="60" r="54" stroke-width="5"/><circle cx="60" cy="60" r="44" stroke-width="2"/>
    <text x="60" y="36" text-anchor="middle" font-size="14" fill="${col}" stroke="none" font-weight="700">${esc(REGION[c.r].em)} ✈️</text>
    <text x="60" y="62" text-anchor="middle" font-size="${name.length > 5 ? 13 : 17}" fill="${col}" stroke="none" font-weight="800">${esc(name)}</text>
    <text x="60" y="84" text-anchor="middle" font-size="11" fill="${col}" stroke="none">${y ? `${y}.${m}.${d}` : ""}</text>
  </g></svg>`;
}

function arrive(id) {
  const c = COUNTRY[id], first = !prog.stamps[id], now = new Date();
  prog.stamps[id] = { d: (prog.stamps[id] && prog.stamps[id].d) || todayStr(), n: ((prog.stamps[id] && prog.stamps[id].n) || 0) + 1 };
  prog.here = id;
  save();
  Sound.chime();
  const lp = Clock.parts(c.tz, now), rel = Clock.dayRel(c.tz, now);
  modal(`<div class="arrive">
      <p class="arr-top">🛬 ${esc(c.cap)}の くうこうに とうちゃく！</p>
      <div class="arr-flag">${flagSVG(c.id)}</div>
      <h3>ようこそ ${esc(c.n)}へ</h3>${c.state ? `<p class="small">（${esc(c.state)}）</p>` : ""}
      <div class="arr-stamp">${stampSVG(c, prog.stamps[id].d, true)}</div>
      <p class="arr-time">いま ${esc(c.n)}は <b>${Clock.timeWords(lp.h, lp.mi)}</b>${rel ? `（にほんの <b>${Clock.relWords(rel)}</b>）` : ""}</p>
      ${first ? `<p class="arr-new">📕 パスポートに あたらしい スタンプ！</p>` : `<p class="arr-new">📕 ${prog.stamps[id].n}かいめの りょこう</p>`}
      <button type="button" class="btn primary" id="btn-town">🚶 まちへ でかける</button>
    </div>`, () => openScene(id));
  setTimeout(() => { const st = $(".arr-stamp"); if (st) { st.classList.add("hit"); Sound.stamp(); } }, 1400);
  setTimeout(() => Voice.say(`${c.y}に とうちゃく。いま げんちは ${Clock.timeWords(lp.h, lp.mi)}`), 2200);
  // ミッション
  checkMissions({ landed: c, rel });
}

/* ============================== まち ============================== */
let sceneId = null;
function openScene(id, music = true) {
  sceneId = id;
  const c = COUNTRY[id];
  show("scene");
  $("#scene-title").innerHTML = `<span class="tflag">${flagSVG(c.id, "mini")}</span>${esc(c.n)}${c.state ? `<small>（${esc(c.state)}）</small>` : ""}`;
  drawScene();
  renderSceneInfo(null);
  if (music || !BGM.on) BGM.play(c.id, c.mus);
}
function drawScene() {
  const c = COUNTRY[sceneId], lp = Clock.parts(c.tz), f = foundOf(sceneId);
  $("#scene-host").innerHTML = sceneSVG(c, lp.h, f);
  $("#scene-count").textContent = `みつけた ${foundCount(sceneId)} / 5`;
  $("#scene-chips").innerHTML = KEYS.map((k) => `<button type="button" class="chip${f[k] ? " on" : ""}" data-k="${k}">${f[k] ? "✅" : SPOT_EMO[k]}${SPOT_NAME[k]}</button>`).join("");
}
function renderSceneInfo(k) {
  const c = COUNTRY[sceneId], box = $("#scene-info"), col = REGION[c.r].col;
  const lp = Clock.parts(c.tz);
  if (!k) {
    box.innerHTML = `<div class="info-card" style="--accent:${col}">
      <p class="info-lead">まちの なかの <b class="q">？</b> を タップして みつけよう</p>
      <p class="info-time">🕰️ いま ${esc(c.n)}は ${Clock.timeWords(lp.h, lp.mi)}</p>
      <div class="mame"><b>💡 まめちしき</b><p>${rb(c.fact)}</p></div>
      ${c.multi ? `<p class="small">🕰️ ${rb(c.multi)}</p>` : ""}
    </div>`;
    return;
  }
  let body = "";
  if (k === "hi") {
    const ph = (p, label, key) => `<div class="phrase">
        <span class="ph-label">${label}</span>
        <span class="ph-t" lang="${esc(c.vl)}" dir="auto">${esc(p.t)}</span>
        <span class="ph-k">${esc(p.k)}</span>
        <button type="button" class="pill say" data-say="${key}">🔈 きく</button>
      </div>`;
    body = `<p class="cat">💬 あいさつ <small>（${rb(c.hi.l)}）</small></p>` +
      ph(c.hi, "こんにちは", "hi") +
      ph(c.th, `ありがとう${c.th.l !== c.hi.l ? `<small>（${rb(c.th.l)}）</small>` : ""}`, "th") +
      `<p class="small">${Voice.hasVoice(c.vl) ? "🔈 その くにの ことばの こえで よむよ" : "🔈 この きかいには その ことばの こえが ないので、カタカナを よむよ"}</p>`;
  } else if (k === "bld") {
    body = `<p class="cat">🏛️ たてもの</p><svg class="bld-big" viewBox="-10 -12 120 116">${(BUILDINGS[c.bld.e] || BUILDINGS.church)()}</svg>
      <h3>${rb(c.bld.n)}</h3><p>${rb(c.bld.d)}</p>`;
  } else {
    const o = c[k], label = { food: "🍽️ たべもの", ani: "🐾 どうぶつ", ride: "🚆 のりもの" }[k];
    body = `<p class="cat">${label}</p><div class="big-emo">${o.e}</div><h3>${rb(o.n)}</h3><p>${rb(o.d)}</p>`;
  }
  box.innerHTML = `<div class="info-card" style="--accent:${col}">${body}<button type="button" class="pill back-info">◀ まちに もどる</button></div>`;
}
function findSpot(k) {
  const c = COUNTRY[sceneId], f = foundOf(sceneId), was = f[k];
  f[k] = 1; save();
  if (!was) Sound.find(); else Sound.tap();
  drawScene();
  renderSceneInfo(k);
  const say = {
    hi: () => { Voice.native(c.hi, c.vl); },
    bld: () => Voice.say(yomi(c.bld.n) + "。" + yomi(c.bld.d)),
  }[k] || (() => Voice.say(yomi(c[k].n) + "。" + yomi(c[k].d)));
  say();
  if (k === "ani" && c.ll[1] < 0 && c.ani.e === "🐧") checkMissions({ penguin: c });
  if (foundCount(sceneId) === 5 && !prog.gifts[sceneId]) {
    prog.gifts[sceneId] = 1; save();
    setTimeout(() => {
      Sound.fanfare();
      modal(`<div class="gift"><p>🎉 5つ ぜんぶ みつけた！</p><div class="gift-emo">${c.gift.e}</div>
        <h3>おみやげ「${rb(c.gift.n)}」を もらった！</h3><p class="small">🎁 おみやげ ずかんに はいったよ</p>
        <button type="button" class="btn primary js-close">やったね</button></div>`);
      Voice.say(`おみやげ、${yomi(c.gift.n)}を もらったよ`);
    }, 1600);
  }
}

/** したの ボタン：みつけた ものは もういちど みる。まだの ものは ヒント */
function chipTap(k) {
  if ((prog.found[sceneId] || {})[k]) { findSpot(k); return; }
  Sound.tap();
  const el = $(`.spot[data-k="${k}"]`);
  if (el) { el.classList.remove("blink"); void el.getBoundingClientRect(); el.classList.add("blink"); }
  toast(`${SPOT_EMO[k]} ${SPOT_NAME[k]}は まちの どこかな？ ひかっている ところを タップ`, 2000);
}

/* ============================== じさ とけい ============================== */
let clockId = null, clockMap = null;
function clockFace(p, label, col) {
  const a = (p.h % 12 + p.mi / 60) * 30, b = p.mi * 6, s = p.s * 6;
  const night = p.h < 6 || p.h >= 18;
  return `<svg class="face${night ? " night" : ""}" viewBox="-50 -50 100 100" aria-label="${esc(label)}">
    <circle r="47" class="rim" style="stroke:${col}"/>
    ${Array.from({ length: 12 }, (_, i) => { const t = i * 30 * Math.PI / 180; return `<text x="${(36 * Math.sin(t)).toFixed(1)}" y="${(-36 * Math.cos(t)).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="9">${i || 12}</text>`; }).join("")}
    <line class="hh" x1="0" y1="0" x2="0" y2="-22" transform="rotate(${a})"/>
    <line class="mh" x1="0" y1="0" x2="0" y2="-32" transform="rotate(${b})"/>
    <line class="sh" x1="0" y1="6" x2="0" y2="-36" transform="rotate(${s})"/>
    <circle r="3" class="pin"/><text y="18" text-anchor="middle" font-size="10">${night ? "🌙" : "☀️"}</text></svg>`;
}
function openClock(id) {
  const vis = COUNTRIES_DATA.filter((c) => prog.stamps[c.id]);
  clockId = id || (cur === "scene" && sceneId) || prog.here || (vis[0] && vis[0].id) || 826;
  show("clock");
  const list = vis.length ? vis : [826, 840, 36, 76].map((i) => COUNTRY[i]);
  $("#clock-chips").innerHTML = (vis.length ? "" : `<span class="small">まだ どこにも いっていないので、ためしに：</span>`) +
    list.map((c) => `<button type="button" class="pill${c.id === clockId ? " on" : ""}" data-cid="${c.id}">${flagSVG(c.id, "mini")} ${esc(c.n)}</button>`).join("");
  clockMap = makeMap($("#clock-map"), { visited: prog.stamps, night: true, fit: false });
  tickClock();
  clockTimer = setInterval(tickClock, 1000);
  renderClockQuiz();
}
function tickClock() {
  const c = COUNTRY[clockId], now = new Date();
  const hp = Clock.parts(HOME.tz, now), cp = Clock.parts(c.tz, now);
  const rel = Clock.dayRel(c.tz, now), d = Clock.diff(c.tz, now);
  const WD = ["にち", "げつ", "か", "すい", "もく", "きん", "ど"];
  const line = (p) => `${p.mo}がつ${p.d}にち（${WD[p.wd]}）`;
  $("#clocks").innerHTML = `
    <div class="clock-box"><p class="cname">${flagSVG(392, "mini")} にほん</p>${clockFace(hp, "にほん", "#d2464b")}
      <p class="cdate">${line(hp)}</p><p class="ctime">${Clock.timeWords(hp.h, hp.mi)}</p></div>
    <div class="clock-box"><p class="cname">${flagSVG(c.id, "mini")} ${esc(c.n)}</p>${clockFace(cp, c.n, REGION[c.r].col)}
      <p class="cdate">${line(cp)}${rel ? ` <b class="rel">${Clock.relWords(rel)}</b>` : ""}</p><p class="ctime">${Clock.timeWords(cp.h, cp.mi)}</p></div>`;
  if (now.getSeconds() === 0 || !tickClock.done || tickClock.id !== clockId) {
    tickClock.done = true; tickClock.id = clockId;
    $("#clock-diff").innerHTML = (d ? `${esc(c.n)}は にほんより <b>${esc(Clock.diffWords(d))}</b>` : `${esc(c.n)}は にほんと <b>おなじ じこく</b>`) +
      (rel ? `<br>🗓️ いま ${esc(c.n)}は にほんの <b>${Clock.relWords(rel)}</b>！` : "") +
      (c.multi ? `<br><small>🕰️ ${rb(c.multi)}（${esc(c.cap)}の じこく）</small>` : "");
    clockMap.night(now);
    clockMap.label([{ ll: HOME.airports.haneda.ll, text: `にほん ${Clock.hm(hp)}`, cls: "home", up: true }, { ll: c.ll, text: `${c.n} ${Clock.hm(cp)}`, up: false }]);
  }
}
function renderClockQuiz() {
  const c = COUNTRY[clockId];
  const H = pick([7, 7, 8, 12, 18, 21]);
  const w = Clock.whenHomeAt(H, 0, c.tz);
  const key = (p, rel) => `${p.h}:${p.mi}:${rel}`;
  const right = { h: w.p.h, mi: w.p.mi, rel: w.rel };
  const d = Clock.diff(c.tz);
  const cand = [right];
  const add = (min) => {
    let t = H * 60 + min, rel = 0;
    while (t < 0) { t += 1440; rel--; } while (t >= 1440) { t -= 1440; rel++; }
    const o = { h: Math.floor(t / 60), mi: t % 60, rel };
    if (!cand.some((x) => key(x, x.rel) === key(o, o.rel))) cand.push(o);
  };
  add(-d);                 // じさを ぎゃくに した とき
  add(0);                  // おなじ じこく
  add(d + (d > 0 ? -180 : 180));
  add(d + 120);
  const opts = shuffle(cand.slice(0, 3));
  const words = (o) => `${o.rel ? Clock.relWords(o.rel) + "の " : ""}${Clock.timeWords(o.h, o.mi)}`;
  $("#clock-quiz").innerHTML = `<p class="qq">❓ にほんが <b>${Clock.timeWords(H)}</b>の とき、${esc(c.n)}は なんじ？</p>
    <div class="qopts">${opts.map((o) => `<button type="button" class="btn qopt" data-ok="${o === right ? 1 : 0}">${esc(words(o))}</button>`).join("")}</div>
    <p class="qres" id="qres"></p>`;
  Voice.say(`にほんが ${Clock.timeWords(H)}の とき、${c.y}は なんじ？`);
  renderClockQuiz.ans = { right, words, H, c, d };
}
function answerClock(btn) {
  const a = renderClockQuiz.ans; if (!a || btn.disabled) return;
  const ok = btn.dataset.ok === "1";
  $$(".qopt").forEach((b) => { b.disabled = true; if (b.dataset.ok === "1") b.classList.add("right"); });
  if (!ok) btn.classList.add("wrong");
  const r = a.right;
  $("#qres").innerHTML = (ok ? "⭕ せいかい！ " : "🤔 こたえは ") + `<b>${esc(a.words(r))}</b><br>` +
    `<small>${a.d ? `${esc(a.c.n)}は にほんより ${esc(Clock.diffWords(a.d))}から、${Clock.timeWords(a.H)} ${a.d < 0 ? "−" : "＋"} ${esc(Clock.diffWords(a.d).replace(/ (おそい|すすんでいる)$/, ""))}` : `${esc(a.c.n)}は にほんと おなじ じこく`}</small>` +
    `<br><button type="button" class="btn primary" id="q-next">つぎの もんだい ▶</button>`;
  if (ok) { Sound.ok(); prog.quiz = (prog.quiz || 0) + 1; save(); checkMissions({}); Voice.say("せいかい！"); }
  else { Sound.ng(); Voice.say(`こたえは ${a.words(r)}`); }
}

/* ============================== パスポート ============================== */
function openPassport() {
  show("passport");
  $("#pass-num").textContent = `${visitedCount()} / ${N}`;
  $("#pass-list").innerHTML = `<div class="pass-cover"><span>📕</span><b>PASSPORT</b><small>にほんこく りょけん（ごっこ）</small></div>` +
    REGIONS.map((r) => `<h3 class="rg-head" style="--accent:${r.col}">${r.em} ${esc(r.n)}</h3>
      <div class="pass-grid">${COUNTRIES_DATA.filter((c) => c.r === r.key).map((c) => prog.stamps[c.id]
        ? `<button type="button" class="pass-cell" data-cid="${c.id}">${stampSVG(c, prog.stamps[c.id].d)}</button>`
        : `<div class="pass-cell empty"><span>？</span></div>`).join("")}</div>`).join("");
}
function stampInfo(id) {
  const c = COUNTRY[id], s = prog.stamps[id];
  Sound.tap();
  modal(`<div class="sinfo">${stampSVG(c, s.d, true)}
    <h3>${flagSVG(c.id, "mini")} ${esc(c.n)}</h3>
    <p>${s.d.replace(/-/g, ".")} に はじめて いった・${s.n}かい</p>
    <p class="small">💬 ${esc(c.hi.t)}（${esc(c.hi.k)}）　🎁 ${prog.gifts[id] ? esc(c.gift.n) : "まだ"}</p>
    <div class="row"><button type="button" class="btn" id="si-town">🚶 まちを みる</button><button type="button" class="btn primary" id="si-go">🛫 もういちど いく</button></div></div>`);
  $("#si-town").onclick = () => { closeModal(); prog.here = id; save(); openScene(id); };
  $("#si-go").onclick = () => { closeModal(); mapBox = c.r; openMap(id); };
}

/* ============================== おみやげ ============================== */
function openZukan() {
  show("zukan");
  const k = COUNTRIES_DATA.filter((c) => prog.gifts[c.id]).length;
  $("#zukan-num").textContent = `${k} / ${N}`;
  $("#zukan-list").innerHTML = REGIONS.map((r) => `<h3 class="rg-head" style="--accent:${r.col}">${r.em} ${esc(r.n)}</h3>
    <div class="zk-grid">${COUNTRIES_DATA.filter((c) => c.r === r.key).map((c) => prog.gifts[c.id]
      ? `<div class="zk"><span class="zk-emo">${c.gift.e}</span><b>${rb(c.gift.n)}</b><small>${flagSVG(c.id, "mini")} ${esc(c.n)}</small></div>`
      : `<div class="zk q"><span class="zk-emo">？</span><small>${prog.stamps[c.id] ? `${esc(c.n)}で あと ${5 - foundCount(c.id)}こ` : "まだ"}</small></div>`).join("")}</div>`).join("");
}

/* ============================== ミッション ============================== */
/** にほんとの じさが いちばん おおきい くに（いまの じこくで けいさん） */
function farthest(now = new Date()) {
  const ds = COUNTRIES_DATA.map((c) => ({ c, d: Math.abs(Clock.diff(c.tz, now)) }));
  const max = Math.max(...ds.map((x) => x.d));
  return { max, list: ds.filter((x) => x.d === max).map((x) => x.c) };
}
const MISSIONS = [
  { key: "eq", em: "🌐", n: "せきどうを こえよう", d: "ちきゅうの まんなかの せん（せきどう）より みなみの くにへ とぶ" },
  { key: "peng", em: "🐧", n: "みなみはんきゅうで ペンギンに あおう", d: "みなみはんきゅうの まちで ペンギンを みつける" },
  { key: "six", em: "🗺️", n: "6つの しゅう（ちいき）に いこう", d: "アジア・ヨーロッパ・アフリカ・きたアメリカ・みなみアメリカ・オセアニア。※がっこうで ならう「6たいりく」は ユーラシア・アフリカ・きたアメリカ・みなみアメリカ・オーストラリア・なんきょく" },
  { key: "far", em: "🕰️", n: "じさが いちばん おおきい くにへ", d: "にほんと じさが いちばん おおきい くにへ ひとっとび" },
  { key: "date", em: "🗓️", n: "ひづけが ちがう くにに つこう", d: "ついた とき、にほんと ちがう ひ（まえの ひ・つぎの ひ）の くにが ある" },
  { key: "quiz", em: "⏰", n: "じさ クイズに 5もん せいかい", d: "じさ とけいの クイズ" },
  { key: "all", em: "🏆", n: `${N}かしょ ぜんぶの スタンプ`, d: "せかい いっしゅう たっせい！" },
];
function missionProgress(key) {
  if (key === "six") return `${new Set(COUNTRIES_DATA.filter((c) => prog.stamps[c.id]).map((c) => c.r)).size} / 6`;
  if (key === "quiz") return `${Math.min(5, prog.quiz || 0)} / 5`;
  if (key === "all") return `${visitedCount()} / ${N}`;
  if (key === "far") { const f = farthest(); return `いまは ${f.list.map((c) => c.n).join("・")}（${Clock.diffWords(-f.max).replace(" おそい", "")}）`; }
  return "";
}
function checkMissions(ev) {
  const got = [];
  const done = (k) => { if (!prog.mis[k]) { prog.mis[k] = 1; got.push(k); } };
  if (ev.landed) {
    if (ev.landed.ll[1] < 0) done("eq");
    if (ev.rel) done("date");
    const f = farthest();
    if (f.list.includes(ev.landed)) done("far");
  }
  if (ev.penguin) done("peng");
  if (new Set(COUNTRIES_DATA.filter((c) => prog.stamps[c.id]).map((c) => c.r)).size >= 6) done("six");
  if ((prog.quiz || 0) >= 5) done("quiz");
  if (visitedCount() >= N) done("all");
  if (!got.length) return;
  save();
  got.forEach((k, i) => setTimeout(() => {
    const m = MISSIONS.find((x) => x.key === k);
    Sound.fanfare();
    toast(`🏅 ミッション たっせい！<br><b>${m.em} ${esc(m.n)}</b>`, 3200);
  }, 3000 + i * 3400));
}
function openMission() {
  show("mission");
  $("#mis-num").textContent = `${MISSIONS.filter((m) => prog.mis[m.key]).length} / ${MISSIONS.length}`;
  $("#mis-list").innerHTML = MISSIONS.map((m) => `<div class="mis${prog.mis[m.key] ? " done" : ""}">
    <span class="mis-em">${prog.mis[m.key] ? "🏅" : m.em}</span>
    <div><b>${esc(m.n)}</b><p>${esc(m.d)}</p>${missionProgress(m.key) ? `<small>${esc(missionProgress(m.key))}</small>` : ""}</div></div>`).join("");
}

/* ============================== イベント ============================== */
document.addEventListener("click", (e) => {
  const t = e.target.closest("button, .spot, .pass-cell");
  if (!t) return;
  if (t.matches(".js-sound")) { prog.sound = Settings.sound = !prog.sound; save(); syncToggles(); if (!prog.sound) BGM.stop(); else Sound.tap(); return; }
  if (t.matches(".js-voice")) { prog.voice = Settings.voice = !prog.voice; save(); syncToggles(); if (!prog.voice) Voice.stop(); else Voice.say("よみあげ オン"); return; }
  if (t.matches("[data-go]")) { Sound.tap(); if (t.dataset.go === "title") renderTitle(); return; }
  if (t.matches(".js-back")) { goBack(); return; }
  if (t.matches("[data-open]")) { openScreen(t.dataset.open); return; }
  if (t.id === "btn-go") { Sound.ac(); openScreen("map"); return; }
  if (t.matches("[data-ap]")) { if (flight) return; prog.airport = t.dataset.ap; save(); Sound.tap(); $$("[data-ap]").forEach((b) => b.classList.toggle("on", b === t)); renderDest(); return; }
  if (t.matches("[data-box]")) { if (flight) return; mapBox = t.dataset.box; Sound.tap(); $$("#map-tabs button").forEach((b) => b.classList.toggle("on", b === t)); drawBigMap(); return; }
  if (t.id === "btn-fly") { Sound.ac(); takeOff(); return; }
  if (t.id === "fly-skip") { land(); return; }
  if (t.id === "btn-town" || t.matches(".js-close")) { closeModal(); return; }
  if (t.matches(".modal-close")) { closeModal(); return; }
  if (t.matches(".spot")) { findSpot(t.dataset.k); return; }
  if (t.matches(".chip")) { chipTap(t.dataset.k); return; }
  if (t.matches(".back-info")) { Sound.tap(); renderSceneInfo(null); return; }
  if (t.matches(".say")) { const c = COUNTRY[sceneId]; Voice.native(c[t.dataset.say], c.vl); return; }
  if (t.id === "btn-next") { Sound.tap(); mapBox = "world"; openMap(); return; }
  if (t.matches("[data-cid]") && t.closest("#clock-chips")) { Sound.tap(); openClock(+t.dataset.cid); return; }
  if (t.matches(".qopt")) { answerClock(t); return; }
  if (t.id === "q-next") { Sound.tap(); renderClockQuiz(); return; }
  if (t.matches(".pass-cell[data-cid]")) { stampInfo(+t.dataset.cid); return; }
});
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

let rsz = null;
window.addEventListener("resize", () => {
  clearTimeout(rsz);
  rsz = setTimeout(() => {
    if (cur === "map" && !flight) drawBigMap();
    if (cur === "title") makeMap($("#title-map"), { visited: prog.stamps, night: true, fit: false, onTap: () => openScreen("map") });
  }, 200);
});

renderTitle();
