/* あしあと たんてい — ゲーム の すすめかた */
(function () {
  "use strict";
  const { ANIMALS, CLUES, KIND, ANIMAL_IDS } = window.AT_DATA;
  const { CASES, LEVELS } = window.AT_CASES;
  const D = window.AT_DRAW, S = window.AT_SND;
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";

  /* ───────── ほぞん ───────── */
  const KEY = "ashiato-tantei-v1";
  let save = { solved: {}, met: {}, sound: true, voice: true };
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && typeof s === "object") save = Object.assign(save, s); } catch (e) {}
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  S.sound = save.sound; S.voice = save.voice;

  /* ───────── がめん きりかえ ───────── */
  const VIEWS = ["vHome", "vCases", "vCase", "vNote", "vSolve", "vZukan", "vHow"];
  let view = "vHome";
  const BACK = { vCases: "vHome", vCase: "vCases", vNote: "vCase", vSolve: "vCases", vZukan: "vHome", vHow: "vHome" };
  function show(v) {
    view = v;
    $("toast").hidden = true;
    for (const id of VIEWS) $(id).hidden = id !== v;
    $("backBtn").hidden = v === "vHome";
    window.scrollTo(0, 0);
    if (v === "vHome") renderHome();
    if (v === "vCases") renderList();
    if (v === "vZukan") renderZukan();
  }
  $("backBtn").onclick = () => { S.sfx("tap"); S.hush(); show(zukanReturn && view === "vZukan" ? zukanReturn : BACK[view] || "vHome"); zukanReturn = null; };
  $("homeLink").onclick = (e) => { e.preventDefault(); S.hush(); show("vHome"); };
  $("goCases").onclick = () => { S.unlock(); S.sfx("tap"); show("vCases"); };
  $("goZukan").onclick = () => { S.unlock(); S.sfx("tap"); show("vZukan"); };
  $("goHow").onclick = () => { S.unlock(); S.sfx("tap"); show("vHow"); };
  function syncToggles() {
    $("soundBtn").classList.toggle("off", !S.sound); $("soundBtn").textContent = S.sound ? "🔊" : "🔇";
    $("voiceBtn").classList.toggle("off", !S.voice);
  }
  $("soundBtn").onclick = () => { S.sound = !S.sound; save.sound = S.sound; store(); syncToggles(); S.sfx("tap"); };
  $("voiceBtn").onclick = () => { S.voice = !S.voice; save.voice = S.voice; store(); syncToggles(); if (S.voice) S.say("よみあげ オン"); };
  syncToggles();

  const svgOf = (inner, vb, cls) => `<svg viewBox="${vb}"${cls ? ` class="${cls}"` : ""} aria-hidden="true">${inner}</svg>`;
  const clueSvg = (id, cls) => svgOf(D.clue(id), "-50 -42 100 84", cls);
  const animalSvg = (id) => svgOf(D.animal(id), "-66 -66 132 132");
  const starStr = (n) => "★".repeat(n) + "☆".repeat(3 - n);

  /* ───────── ホーム ───────── */
  function renderHome() {
    $("heroSvg").innerHTML = D.animal("tanuki") + `<g transform="translate(36 30) rotate(-30)"><circle r="16" fill="#e3f2fd" fill-opacity=".5" stroke="#5d4037" stroke-width="5"/><line x1="12" y1="12" x2="30" y2="30" stroke="#5d4037" stroke-width="7" stroke-linecap="round"/></g>`;
    const n = Object.keys(save.solved).length, m = Object.keys(save.met).length;
    $("progressText").textContent = `かいけつ ${n} / ${CASES.length} じけん ・ であった どうぶつ ${m} / ${ANIMAL_IDS.length}`;
  }

  /* ───────── じけん いちらん ───────── */
  function renderList() {
    let h = "";
    for (const lv of [1, 2, 3]) {
      const L = LEVELS[lv];
      h += `<div class="lvHead"><h2 style="color:${L.color}">● ${L.label}</h2><small>${L.hint}</small></div><div class="cgrid">`;
      for (const c of CASES.filter((x) => x.level === lv)) {
        const st = save.solved[c.id] || 0;
        h += `<button class="ctile" data-id="${c.id}" style="--lv:${L.color}"><span class="no">じけん ${c.id}</span><span class="tt">${c.title}</span><span class="st">${st ? starStr(st) : "　"}</span>${st ? animalSvg(c.culprit) : ""}</button>`;
      }
      h += "</div>";
    }
    $("caseList").innerHTML = h;
    $("caseList").querySelectorAll(".ctile").forEach((b) => (b.onclick = () => { S.unlock(); S.sfx("tap"); startCase(+b.dataset.id); }));
  }

  /* ───────── そうさ（げんば） ───────── */
  let cur = null; // { cs, spots:[{id,x,y,found}], marks:{}, wrong, hint, lens:{x,y} }
  const LENS_R = 74, ZOOM = 2, FIND_R = 40;

  function placeClues(cs) {
    const sc = D.scene(cs.scene);
    const g = sc.ground.slice(), hi = sc.high.slice();
    // じけん ごと に すこし ずらして、まいかい おなじ ばしょ に ならない ように
    const rot = (arr, k) => arr.slice(k % arr.length).concat(arr.slice(0, k % arr.length));
    let G = rot(g, cs.id), H = rot(hi, cs.id);
    return cs.clues.map((id) => {
      const want = CLUES[id].where === "high" && H.length ? H : G;
      const p = want.shift() || G.shift() || H.shift();
      return { id, x: p[0], y: p[1], found: false };
    });
  }

  function startCase(id) {
    const cs = CASES.find((c) => c.id === id);
    cur = { cs, spots: placeClues(cs), marks: {}, wrong: 0, hint: false, lens: { x: 400, y: 120 }, checked: false };
    $("caseLv").textContent = LEVELS[cs.level].label; $("caseLv").style.background = LEVELS[cs.level].color;
    $("caseTitle").textContent = `じけん ${cs.id}: ${cs.title}`;
    $("caseStory").textContent = cs.story;
    $("sceneTip").hidden = false;
    buildScene();
    renderFound();
    show("vCase");
    S.say(cs.title + "。" + cs.story + "　ルーペ で げんば を しらべよう。");
  }

  function clueGroup(sp, op) {
    const col = cur.cs.scene === "yuki" ? "#6d7f96" : undefined;
    return `<g class="clue" data-id="${sp.id}" transform="translate(${sp.x} ${sp.y}) scale(.62)" opacity="${op}">${D.clue(sp.id, col)}</g>`;
  }
  function buildScene() {
    const sc = D.scene(cur.cs.scene);
    const bg = sc.draw();
    const svg = $("scene");
    const faint = cur.spots.map((sp) => clueGroup(sp, sp.found ? 1 : 0.16)).join("");
    const full = cur.spots.map((sp) => clueGroup(sp, 1)).join("");
    svg.innerHTML = `<defs><clipPath id="lensClip"><circle id="lensClipC" r="${LENS_R}" cx="0" cy="0"/></clipPath></defs>` +
      `<g id="bgLayer">${bg}</g><g id="faintLayer">${faint}</g><g id="ringLayer"></g>` +
      `<g id="lensView" clip-path="url(#lensClip)"><g id="lensInner">${bg}${full}</g></g>` +
      `<g id="lensFrame"><circle r="${LENS_R}" fill="none" stroke="#5d4037" stroke-width="12"/><circle r="${LENS_R - 6}" fill="none" stroke="#ffe082" stroke-width="3"/>` +
      `<line x1="${LENS_R * 0.72}" y1="${LENS_R * 0.72}" x2="${LENS_R * 1.45}" y2="${LENS_R * 1.45}" stroke="#5d4037" stroke-width="22" stroke-linecap="round"/>` +
      `<path d="M-40 -42 q14 -14 34 -16" stroke="#fff" stroke-width="6" fill="none" opacity=".6" stroke-linecap="round"/></g>`;
    renderRings();
    moveLens(cur.lens.x, cur.lens.y, true);
  }
  function renderRings() {
    $("ringLayer").innerHTML = cur.spots.filter((s) => s.found).map((s) => `<circle cx="${s.x}" cy="${s.y}" r="36" fill="none" stroke="#ffb300" stroke-width="4" stroke-dasharray="6 5"/><text x="${s.x + 26}" y="${s.y - 24}" font-size="22">✅</text>`).join("");
    $("faintLayer").querySelectorAll(".clue").forEach((g) => { const sp = cur.spots.find((s) => s.id === g.dataset.id); g.setAttribute("opacity", sp.found ? 1 : 0.16); });
  }
  let lastKira = 0;
  function moveLens(x, y, quiet) {
    x = Math.max(0, Math.min(800, x)); y = Math.max(0, Math.min(500, y));
    cur.lens = { x, y };
    $("lensClipC").setAttribute("cx", x); $("lensClipC").setAttribute("cy", y);
    $("lensInner").setAttribute("transform", `translate(${x} ${y}) scale(${ZOOM}) translate(${-x} ${-y})`);
    $("lensFrame").setAttribute("transform", `translate(${x} ${y})`);
    if (quiet) return;
    let near = Infinity;
    for (const sp of cur.spots) {
      if (sp.found) continue;
      const d = Math.hypot(sp.x - x, sp.y - y);
      near = Math.min(near, d);
      if (d < FIND_R) findClue(sp);
    }
    const now = Date.now();
    if (near < 110 && now - lastKira > 700) { lastKira = now; S.sfx("kira"); }
  }
  function toSvg(e) {
    const svg = $("scene"), pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  (function bindLens() {
    const svg = $("scene");
    let drag = false, offY = 0;
    svg.addEventListener("pointerdown", (e) => {
      S.unlock(); drag = true; $("sceneTip").hidden = true;
      offY = e.pointerType === "touch" ? 70 : 0; // ゆび で かくれない ように すこし うえ
      try { svg.setPointerCapture(e.pointerId); } catch (er) {}
      const p = toSvg(e); moveLens(p.x, p.y - offY); e.preventDefault();
    });
    svg.addEventListener("pointermove", (e) => {
      if (!drag && e.pointerType !== "mouse") return;
      const p = toSvg(e); moveLens(p.x, p.y - offY);
    });
    const end = () => { drag = false; };
    svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
  })();

  let toastT = 0;
  function findClue(sp) {
    sp.found = true;
    S.sfx("found");
    const c = CLUES[sp.id];
    if (c.call) setTimeout(() => S.call(c.call), 350);
    renderRings(); renderFound();
    const t = $("toast");
    t.innerHTML = clueSvg(sp.id) + `<span>ピコン！ ${KIND[c.kind].icon} ${c.short}</span>`;
    t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2200);
    S.say(c.text);
    if (cur.spots.every((s) => s.found)) setTimeout(() => { S.say("てがかり を ぜんぶ みつけた！ たんてい ノート で くらべよう。"); $("noteBtn").classList.add("go"); }, 1800);
  }
  function renderFound() {
    const n = cur.spots.filter((s) => s.found).length;
    $("foundCount").textContent = `${n} / ${cur.spots.length}`;
    $("foundChips").innerHTML = cur.spots.map((s) => s.found
      ? `<button class="chip" data-id="${s.id}">${clueSvg(s.id)}${CLUES[s.id].short}</button>`
      : `<span class="chip empty">？</span>`).join("");
    $("foundChips").querySelectorAll("button.chip").forEach((b) => (b.onclick = () => openClue(b.dataset.id)));
  }
  $("hintBtn").onclick = () => {
    const left = cur.spots.filter((s) => !s.found);
    if (!left.length) { S.say("てがかり は ぜんぶ みつけたよ。ノート を ひらこう。"); return; }
    cur.hint = true;
    const sp = left.reduce((a, b) => (Math.hypot(a.x - cur.lens.x, a.y - cur.lens.y) < Math.hypot(b.x - cur.lens.x, b.y - cur.lens.y) ? a : b));
    const r = document.createElementNS(NS, "circle");
    r.setAttribute("cx", sp.x); r.setAttribute("cy", sp.y); r.setAttribute("r", 46); r.setAttribute("fill", "none");
    r.setAttribute("stroke", "#ff7043"); r.setAttribute("stroke-width", "6"); r.setAttribute("class", "hintRing");
    $("ringLayer").appendChild(r); setTimeout(() => r.remove(), 2600);
    S.sfx("kira"); S.say("ひかって いる ところ を ルーペ で しらべて みて。");
  };
  $("noteBtn").onclick = () => { S.sfx("page"); openNote(); };

  /* ───────── てがかり・どうぶつ の しょうさい ───────── */
  function openModal(html) { $("mbody").innerHTML = html; $("modal").hidden = false; }
  function closeModal() { $("modal").hidden = true; S.hush(); }
  $("mclose").onclick = closeModal;
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });
  function openClue(id) {
    const c = CLUES[id];
    openModal(`<div class="cd"><p class="kind">${KIND[c.kind].icon} ${KIND[c.kind].label}</p>${svgOf(D.clue(id), "-55 -45 110 90", "big")}<p class="tx">${c.text}</p>
      <div class="row">${c.call ? `<button class="btn" id="mPlay">▶ なきごえ を きく</button>` : ""}<button class="btn" id="mSay">🗣️ よむ</button></div></div>`);
    if (c.call) $("mPlay").onclick = () => S.call(c.call);
    $("mSay").onclick = () => S.say(c.text);
    S.say(c.text);
  }
  const ZPICS = {
    tanuki: ["t_inuka", "g_zigzag", "d_tame", "s_ana_big"], kitsune: ["t_kitsune", "g_line", "d_kitsune", "s_ana_big"],
    usagi: ["t_usagi", "g_hop_y", "d_usagi", "f_eda_naname", "s_fuse"], risu: ["t_risu", "g_hop_side", "f_kurumi2", "f_matsu", "s_risu_su"],
    nezumi: ["t_nezumi", "g_hop_side", "f_kurumi_ana", "d_nezumi", "s_ana_small"], shika: ["t_shika", "d_shika", "f_eda_giza", "s_nuta", "s_fuse"],
    inoshishi: ["t_inoshi", "d_inoshi", "s_hori", "s_nuta"], hakubishin: ["t_haku", "d_tame", "s_densen", "s_yaneura", "s_hei"],
    neko: ["t_neko", "g_line", "d_neko", "s_hei"], inu: ["t_inuka", "t_kitsune", "g_human"],
    karasu: ["t_karasu", "h_kuro", "d_tori", "s_karasu_su", "f_kurumi_kona"], kamo: ["t_kamo", "h_kamo", "d_tori"]
  };
  function openAnimal(id) {
    const a = ANIMALS[id];
    const pics = (ZPICS[id] || []).map((c) => `<figure>${svgOf(D.clue(c), "-52 -42 104 84")}<figcaption>${KIND[CLUES[c].kind].icon} ${CLUES[c].short}</figcaption></figure>`).join("");
    openModal(`<div class="zd">${svgOf(D.animal(id), "-66 -66 132 132", "face")}<h2>${a.name}</h2><p class="full">${a.full}${save.met[id] ? " ・ であった！" : ""}</p>
      <div class="zpics">${pics}</div>
      <dl><dt>🐾 あしあと</dt><dd>${a.track}</dd><dt>👣 ならび</dt><dd>${a.gait}</dd><dt>💩 ふん</dt><dd>${a.dung}</dd><dt>🌰 たべもの</dt><dd>${a.food}</dd>
      <dt>🏠 すみか</dt><dd>${a.home}</dd><dt>📅 きせつ</dt><dd>${a.season}</dd><dt>🔊 なきごえ</dt><dd>${a.voice}</dd><dt>💡 まめちしき</dt><dd>${a.note}</dd></dl>
      <div class="row" style="display:flex;gap:8px;justify-content:center;margin-top:10px"><button class="btn" id="mCall">▶ なきごえ ふう</button><button class="btn" id="mSay">🗣️ よむ</button></div></div>`);
    $("mCall").onclick = () => S.call(id);
    const txt = `${a.name}。あしあと は、${a.track}。ならびかた は、${a.gait}。ふん は、${a.dung}。`;
    $("mSay").onclick = () => S.say(txt);
    S.say(a.name);
  }

  /* ───────── ずかん ───────── */
  let zukanReturn = null;
  function renderZukan() {
    $("zgrid").innerHTML = ANIMAL_IDS.map((id) => `<button class="zcard" data-id="${id}">${save.met[id] ? '<span class="met">であった</span>' : ""}${animalSvg(id)}<span>${ANIMALS[id].name}</span></button>`).join("");
    $("zgrid").querySelectorAll(".zcard").forEach((b) => (b.onclick = () => { S.sfx("tap"); openAnimal(b.dataset.id); }));
  }

  /* ───────── たんてい ノート ───────── */
  function openNote() {
    renderNote();
    $("noteMsg").textContent = "";
    show("vNote");
    const all = cur.spots.every((s) => s.found);
    S.say(all ? "てがかり と どうぶつ を くらべて、あう なら まる、あわない なら ばつ を つけよう。" : "まだ みつけて いない てがかり が あるよ。");
  }
  function renderNote() {
    const cs = cur.cs, found = cur.spots.filter((s) => s.found);
    let h = `<thead><tr><th class="cl">てがかり ＼ どうぶつ</th>${cs.suspects.map((a) => `<th><button class="who" data-a="${a}">${animalSvg(a)}${ANIMALS[a].name}</button></th>`).join("")}</tr></thead><tbody>`;
    for (const sp of found) {
      const c = CLUES[sp.id];
      h += `<tr><th class="cl"><button class="clueH" data-id="${sp.id}">${clueSvg(sp.id)}<span>${c.short}</span></button></th>`;
      for (const a of cs.suspects) {
        const m = (cur.marks[sp.id] || {})[a] || 0;
        let cls = m === 1 ? "o" : m === 2 ? "x" : "";
        if (cur.checked && m) cls += ((m === 1) === c.matches.includes(a)) ? " good" : " bad";
        h += `<td><button class="cell ${cls}" data-id="${sp.id}" data-a="${a}" aria-label="${c.short} と ${ANIMALS[a].name}">${m === 1 ? "○" : m === 2 ? "×" : ""}</button></td>`;
      }
      h += "</tr>";
    }
    const left = cur.spots.length - found.length;
    if (left) h += `<tr><td colspan="${cs.suspects.length + 1}">🔍 まだ みつけて いない てがかり が ${left}こ あるよ</td></tr>`;
    h += "</tbody>";
    $("noteTable").innerHTML = h;
    $("noteTable").querySelectorAll(".cell").forEach((b) => (b.onclick = () => {
      const k = b.dataset.id, a = b.dataset.a;
      cur.marks[k] = cur.marks[k] || {};
      cur.marks[k][a] = (((cur.marks[k][a] || 0) + 1) % 3);
      cur.checked = false;
      S.sfx("mark"); renderNote(); renderAccuse();
    }));
    $("noteTable").querySelectorAll(".who").forEach((b) => (b.onclick = () => openAnimal(b.dataset.a)));
    $("noteTable").querySelectorAll(".clueH").forEach((b) => (b.onclick = () => openClue(b.dataset.id)));
    renderAccuse();
  }
  function renderAccuse() {
    const cs = cur.cs, all = cur.spots.every((s) => s.found);
    $("accuse").innerHTML = cs.suspects.map((a) => {
      const out = Object.values(cur.marks).some((m) => m[a] === 2);
      return `<button data-a="${a}" class="${out ? "out" : ""}" ${all ? "" : "disabled"}>${animalSvg(a)}${ANIMALS[a].name}</button>`;
    }).join("");
    $("accuse").querySelectorAll("button").forEach((b) => (b.onclick = () => accuse(b.dataset.a)));
  }
  $("checkBtn").onclick = () => {
    cur.checked = true; renderNote();
    const bad = document.querySelectorAll("#noteTable .cell.bad").length;
    const blank = document.querySelectorAll("#noteTable .cell:not(.o):not(.x)").length;
    const msg = bad ? `あか い マス が ${bad}こ。もういちど くらべて みよう。` : blank ? `いま の しるし は ぜんぶ あってる！ のこり ${blank}マス。` : "しるし は ぜんぶ ばっちり！";
    $("noteMsg").textContent = msg; S.sfx(bad ? "wrong" : "found"); S.say(msg);
  };
  $("backSceneBtn").onclick = () => { S.sfx("tap"); show("vCase"); };

  function accuse(a) {
    const cs = cur.cs;
    if (a !== cs.culprit) {
      cur.wrong++;
      const why = cs.clues.find((id) => !CLUES[id].matches.includes(a));
      const msg = `ざんねん！ ${ANIMALS[a].name} だと「${CLUES[why].short}」が あわないよ。`;
      $("noteMsg").textContent = msg; S.sfx("wrong"); S.say(msg);
      cur.marks[why] = cur.marks[why] || {}; cur.marks[why][a] = 2; renderNote();
      return;
    }
    solved();
  }

  /* ふりかえり: ほか の どうぶつ を はずした てがかり を 3つ まで えらぶ */
  function reasons(cs) {
    let rest = cs.suspects.filter((x) => x !== cs.culprit);
    const pick = [], pool = cs.clues.slice();
    while (rest.length && pick.length < 3) {
      let best = null, bestOut = [];
      for (const id of pool) {
        const out = rest.filter((x) => !CLUES[id].matches.includes(x));
        if (out.length > bestOut.length) { best = id; bestOut = out; }
      }
      if (!best) break;
      pick.push({ id: best, out: bestOut });
      pool.splice(pool.indexOf(best), 1);
      rest = rest.filter((x) => !bestOut.includes(x));
    }
    for (const id of pool) { if (pick.length >= 3) break; pick.push({ id, out: [] }); }
    return pick;
  }
  function solved() {
    const cs = cur.cs, a = ANIMALS[cs.culprit];
    const stars = cur.wrong === 0 && !cur.hint ? 3 : cur.wrong <= 1 ? 2 : 1;
    save.solved[cs.id] = Math.max(save.solved[cs.id] || 0, stars);
    save.met[cs.culprit] = true; store();
    S.sfx("solve"); setTimeout(() => S.call(cs.culprit), 1300);
    $("solveSvg").innerHTML = D.animal(cs.culprit);
    $("solveSvg").style.animation = "none"; void $("solveSvg").getBBox; $("solveSvg").style.animation = "";
    $("solveHello").textContent = a.hello;
    $("solveTitle").textContent = `かいけつ！ はんにん は ${a.name} でした`;
    $("solveStars").textContent = starStr(stars);
    const rs = reasons(cs);
    $("reasons").innerHTML = `<div class="reason final">なぜ ${a.name} だと わかったの？</div>` + rs.map((r, i) => `<div class="reason"><span class="num">${i + 1}</span>${clueSvg(r.id)}<span>「${CLUES[r.id].short}」${r.out.length ? ` → ${r.out.map((x) => ANIMALS[x].name).join("・")} は あわない` : ` → ${a.name} に ぴったり`}</span></div>`).join("") +
      `<div class="reason final">だから、ぜんぶ に あう の は ${a.name}！</div>`;
    const next = CASES.find((c) => c.id > cs.id && !save.solved[c.id]) || CASES.find((c) => !save.solved[c.id]);
    $("nextCaseBtn").hidden = !next;
    $("nextCaseBtn").onclick = () => { S.sfx("tap"); startCase(next.id); };
    show("vSolve");
    setTimeout(() => S.say(`かいけつ！ はんにん は ${a.name}。${a.hello}`), 1500);
  }
  $("solveZukanBtn").onclick = () => { zukanReturn = "vSolve"; show("vZukan"); openAnimal(cur.cs.culprit); };
  $("solveListBtn").onclick = () => show("vCases");

  show("vHome");

  /* テスト よう */
  window.ATTest = {
    cur: () => cur, save: () => save, startCase, show,
    spotClient(id) {
      const sp = cur.spots.find((s) => s.id === id), svg = $("scene"), pt = svg.createSVGPoint();
      pt.x = sp.x; pt.y = sp.y; const p = pt.matrixTransform(svg.getScreenCTM());
      return { x: p.x, y: p.y };
    }
  };
})();
