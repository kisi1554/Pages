/* がったい どうぶつ ラボ — がめん（ラボ・レース・おだい・ずかん） */
(function () {
  "use strict";
  const { SPECIES, SLOTS, SLOT_NAME, partName, drawCreature, drawPart } = window.GDParts;
  const Lab = window.GDLab;
  const Snd = window.GDSound;
  const N = SPECIES.length;
  const $ = (id) => document.getElementById(id);
  const KEY = "gattai-doubutsu-v1";
  const MAX_MINE = 30;

  /* ---- ほぞん ---- */
  const save = { mine: [], odai: {}, sound: true };
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    if (d && typeof d === "object") {
      if (Array.isArray(d.mine)) save.mine = d.mine.filter((m) => m && SLOTS.every((s) => Number.isInteger(m[s]) && m[s] >= 0 && m[s] < N)).slice(0, MAX_MINE);
      if (d.odai && typeof d.odai === "object") save.odai = d.odai;
      if (typeof d.sound === "boolean") save.sound = d.sound;
    }
  } catch (e) { /* よめなくても あそべる */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }

  /* ---- じょうたい ---- */
  const rnd = (n) => Math.floor(Math.random() * n);
  const combo = { head: 0, body: 1, legs: 2, tail: 3 };
  SLOTS.forEach((s) => { combo[s] = rnd(N); });
  let course = randomCourse();
  let odai = null;        // いま やって いる おだい
  let spinning = false;
  let lastRace = null;

  function randomCourse() {
    const k = Lab.TERRAIN_KEYS;
    const c = [k[rnd(k.length)]];
    while (c.length < 3) { const t = k[rnd(k.length)]; if (t !== c[c.length - 1] || Math.random() < 0.15) c.push(t); }
    return c;
  }

  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.tm); toast.tm = setTimeout(() => { t.hidden = true; }, 2200);
  }

  /* ---- おと ---- */
  function paintSound() { $("soundBtn").textContent = Snd.on ? "🔊" : "🔇"; $("soundBtn").setAttribute("aria-pressed", String(Snd.on)); }
  Snd.on = save.sound; paintSound();
  $("soundBtn").addEventListener("click", () => { Snd.on = !Snd.on; save.sound = Snd.on; store(); paintSound(); Snd.unlock(); Snd.pop(); });
  document.addEventListener("pointerdown", () => Snd.unlock(), { once: true });

  /* ---- がめん きりかえ ---- */
  const VIEWS = { lab: "vLab", race: "vRace", odai: "vOdai", zukan: "vZukan" };
  function show(v) {
    for (const k in VIEWS) $(VIEWS[k]).hidden = k !== v;
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b.dataset.view === v || (v === "race" && b.dataset.view === "lab")));
    if (v !== "race") stopRace();
    if (v === "odai") renderOdai();
    if (v === "zukan") renderZukan();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => { Snd.pop(); show(b.dataset.view); }));

  /* ---- ほし ---- */
  function stars(v) {
    const n = Math.round(v);
    let s = "";
    for (let i = 0; i < Lab.MAX; i++) s += `<span class="${i < n ? "st on" : "st"}">★</span>`;
    return s;
  }

  /* ---- ラボ ---- */
  function renderReels() {
    $("reels").innerHTML = SLOTS.map((s) => `
      <div class="reel" data-slot="${s}">
        <span class="reel-lbl">${SLOT_NAME[s]}</span>
        <button type="button" class="arrow" data-d="-1" aria-label="まえ">◀</button>
        <div class="reel-win"><div class="reel-art"></div><div class="reel-name"></div></div>
        <button type="button" class="arrow" data-d="1" aria-label="つぎ">▶</button>
      </div>`).join("");
    document.querySelectorAll(".reel").forEach((el) => {
      const slot = el.dataset.slot;
      el.querySelectorAll(".arrow").forEach((b) => b.addEventListener("click", () => step(slot, +b.dataset.d)));
      // スワイプ
      const win = el.querySelector(".reel-win");
      let sx = null;
      win.addEventListener("pointerdown", (e) => { sx = e.clientX; });
      win.addEventListener("pointerup", (e) => {
        if (sx == null) return;
        const dx = e.clientX - sx; sx = null;
        if (Math.abs(dx) > 28) step(slot, dx < 0 ? 1 : -1);
        else step(slot, 1);
      });
      win.addEventListener("pointercancel", () => { sx = null; });
    });
    paintReels();
  }
  function paintReel(slot) {
    const el = document.querySelector(`.reel[data-slot="${slot}"]`);
    const art = el.querySelector(".reel-art");
    art.innerHTML = drawPart(combo[slot], slot);
    // ぶいの おおきさに あわせて きりとる（ちいさい しっぽも おおきく みえる）
    try {
      const svg = art.querySelector("svg"), g = svg.querySelector("g");
      if (g && g.getBBox) {
        const b = g.getBBox();
        if (b.width > 0) { const m = 4, s = Math.max(b.width, b.height * 1.07) + m * 2; svg.setAttribute("viewBox", `${b.x + b.width / 2 - s / 2} ${b.y + b.height / 2 - s / 2.14} ${s} ${s / 1.07}`); }
      }
    } catch (e) { /* そのまま */ }
    el.querySelector(".reel-name").textContent = partName(SPECIES[combo[slot]], slot);
  }
  function paintReels() { SLOTS.forEach(paintReel); paintPreview(); }

  function step(slot, d) {
    if (spinning) return;
    combo[slot] = (combo[slot] + d + N) % N;
    Snd.tick();
    paintReel(slot); paintPreview(true);
  }

  function paintPreview(pop) {
    const nm = Lab.name(combo);
    $("previewArt").innerHTML = drawCreature(combo, { label: nm });
    $("cName").textContent = nm;
    const s = Lab.stats(combo);
    $("statBox").innerHTML = Lab.ABS.map((k) => `<div class="stat"><span class="sk">${Lab.AB_ICON[k]} ${Lab.AB_NAME[k]}</span><span class="sv">${stars(s.ab[k])}</span></div>`).join("");
    const tr = Lab.TRAITS.filter((t) => s.tr[t]);
    $("traitBox").innerHTML = tr.length ? tr.map((t) => `<span class="trait">${Lab.TR_ICON[t]} ${Lab.TR_NAME[t]}</span>`).join("") : `<span class="trait none">とくべつな ちから なし</span>`;
    if (pop) { const a = $("previewArt"); a.classList.remove("pop"); void a.offsetWidth; a.classList.add("pop"); }
  }

  function paintCourse() {
    $("courseBox").innerHTML = course.map((t, i) => (i ? `<span class="arr">→</span>` : "") +
      `<span class="tchip t-${t}" title="${Lab.TERRAINS[t].desc}">${Lab.TERRAINS[t].icon} ${Lab.TERRAINS[t].short || Lab.TERRAINS[t].name}</span>`).join("");
    $("courseBtn").hidden = !!odai;
  }
  $("courseBtn").addEventListener("click", () => { course = randomCourse(); Snd.pop(); paintCourse(); });

  /* ぐるぐる（スロット） */
  $("spinBtn").addEventListener("click", () => {
    if (spinning) return;
    spinning = true; Snd.unlock();
    $("spinBtn").disabled = true;
    const stopAt = SLOTS.map((_, i) => 700 + i * 380);
    const goal = SLOTS.map(() => rnd(N));
    const t0 = performance.now();
    let lastTick = 0;
    const done = SLOTS.map(() => false);
    document.querySelectorAll(".reel").forEach((el) => el.classList.add("spin"));
    (function loop(now) {
      const t = now - t0;
      if (t - lastTick > 70) {
        lastTick = t;
        SLOTS.forEach((s, i) => {
          if (done[i]) return;
          if (t >= stopAt[i]) {
            done[i] = true; combo[s] = goal[i]; paintReel(s); Snd.stop();
            document.querySelector(`.reel[data-slot="${s}"]`).classList.remove("spin");
          } else { combo[s] = (combo[s] + 1) % N; paintReel(s); }
        });
        Snd.tick();
      }
      if (done.every(Boolean)) {
        spinning = false; $("spinBtn").disabled = false;
        Snd.gattai(); paintPreview(true);
        return;
      }
      requestAnimationFrame(loop);
    })(t0);
  });

  /* ---- レース ---- */
  const SCENERY = {
    field: ["🌼", "🌷", "🌳", "🦋", "🌼", "🍀"],
    sea: ["🐟", "🌊", "🐠", "🌊", "🪸", "🌊"],
    sky: ["☁️", "🪨", "☁️", "🐦", "☁️", "🪨"],
    mountain: ["🪨", "⛰️", "🌲", "🪨", "🐐", "⛰️"],
    desert: ["🌵", "☀️", "🏜️", "🌵", "🦂", "🌵"],
    ice: ["❄️", "🧊", "⛄", "❄️", "🧊", "🐧"],
    night: ["🌲", "🌙", "🦉", "🌲", "⭐", "🌲"]
  };
  let raf = 0, raceState = null, stepTimer = 0;

  function stopRace() { cancelAnimationFrame(raf); raf = 0; clearTimeout(stepTimer); raceState = null; }

  function moveClass(g) {
    // その くぎりで どう うごくか（えの アニメ）
    if (g.by === "swim") return "m-swim";
    if (g.by === "fly") return "m-fly";
    if (g.by === "climb") return "m-climb";
    if (g.by === "jump") return "m-hop";
    if (g.by === "dig") return "m-dig";
    const mv = SPECIES[combo.legs].legs.move;
    return mv === "hop" ? "m-hop" : mv === "slither" ? "m-slither" : "m-run";
  }

  function startRace() {
    stopRace();
    Snd.unlock();
    const r = Lab.race(combo, course);
    lastRace = { combo: Object.assign({}, combo), course: course.slice(), r, odai };
    show("race");
    $("result").hidden = true;
    $("skipBtn").hidden = false;
    $("racer").innerHTML = drawCreature(combo);
    $("raceBar").innerHTML = r.segs.map((g, i) => `<div class="rb-seg t-${g.terrain}" data-i="${i}"><span>${Lab.TERRAINS[g.terrain].icon}</span><i class="rb-fill"></i></div>`).join("");
    // ほんとうの じかん（ミリびょう）: ゲームの びょう × 0.45、1くぎり 0.9〜4.5びょう
    const real = r.segs.map((g) => Math.max(900, Math.min(4500, g.time * 450)));
    raceState = { r, real, i: -1, t0: performance.now(), segStart: 0, off: 0 };
    raf = requestAnimationFrame(tick);
  }

  function enterSeg(i) {
    const st = raceState, g = st.r.segs[i];
    st.i = i;
    const stage = $("stage");
    stage.className = "stage t-" + g.terrain;
    const sc = SCENERY[g.terrain];
    let html = "";
    for (let k = 0; k < 14; k++) html += `<span style="left:${k * 16 + (k % 2) * 5}%;top:${[10, 62, 28, 74, 18, 54, 36][k % 7]}%">${sc[k % sc.length]}</span>`;
    $("scroller").innerHTML = html + html.replace(/left:(\d+)%/g, (m, a) => `left:${+a + 224}%`);
    const rc = $("racer");
    rc.className = "racer " + moveClass(g);
    rc.style.setProperty("--dur", (0.9 / g.speed + 0.12).toFixed(2) + "s");
    const T = Lab.TERRAINS[g.terrain];
    const who = g.slot ? partName(SPECIES[g.sp], g.slot) + "で " : "";
    $("raceLabel").innerHTML = `<b>${T.icon} ${T.short || T.name}</b>　${who}${g.how}　<span class="sv">${stars(g.v)}</span>`;
    // あしおと
    clearTimeout(stepTimer);
    const period = Math.max(150, 650 / g.speed);
    const kind = g.by === "swim" ? "swim" : g.by === "fly" ? "fly" : g.by === "climb" ? "climb" : g.by === "jump" ? "hop" : g.by === "dig" ? "dig" : SPECIES[combo.legs].legs.move;
    (function beat() {
      if (!raceState || raceState.i !== i) return;
      if (kind === "swim") Snd.splash(); else if (kind === "fly") Snd.flap(); else Snd.step(kind);
      stepTimer = setTimeout(beat, kind === "swim" || kind === "fly" ? period * 1.6 : period);
    })();
  }

  function tick(now) {
    const st = raceState; if (!st) return;
    let t = now - st.t0, i = 0, acc = 0;
    while (i < st.real.length && t > acc + st.real[i]) { acc += st.real[i]; i++; }
    if (i >= st.real.length) { finishRace(); return; }
    if (i !== st.i) enterSeg(i);
    const p = (t - acc) / st.real[i];
    const g = st.r.segs[i];
    // タイマー（ゲームの じかん）
    let gt = 0; for (let k = 0; k < i; k++) gt += st.r.segs[k].time;
    gt += g.time * p;
    $("raceTime").textContent = gt.toFixed(1);
    document.querySelectorAll(".rb-seg").forEach((el, k) => { el.querySelector(".rb-fill").style.width = (k < i ? 100 : k === i ? p * 100 : 0) + "%"; });
    // けしきが うしろへ ながれる（はやいほど はやく）
    st.off = (st.off + g.speed * 0.25) % 224;
    $("scroller").style.transform = `translateX(${-st.off}%)`;
    raf = requestAnimationFrame(tick);
  }

  function finishRace() {
    const st = raceState; if (!st) return;
    const r = st.r;
    stopRace();
    $("raceTime").textContent = r.total.toFixed(1);
    document.querySelectorAll(".rb-fill").forEach((el) => { el.style.width = "100%"; });
    $("racer").className = "racer m-goal";
    $("raceLabel").innerHTML = "<b>🏁 ゴール！</b>";
    $("skipBtn").hidden = true;
    Snd.fanfare();
    const hl = Lab.highlight(lastRace.combo, r);
    let head = `<div class="goal-time">🏁 ゴール！ <b>${r.total.toFixed(1)}</b> びょう</div>`;
    if (lastRace.odai) {
      const o = lastRace.odai;
      if (r.total <= o.goal) {
        const prev = save.odai[o.id];
        if (!prev || r.total < prev) save.odai[o.id] = r.total;
        store();
        head += `<div class="judge ok">🎉 おだい ${o.id} クリア！（ゴールタイム ${o.goal} びょう）</div>`;
        Snd.clear();
      } else {
        head += `<div class="judge ng">おしい！ あと ${(r.total - o.goal).toFixed(1)} びょう はやければ クリア（ゴールタイム ${o.goal} びょう）</div>`;
        Snd.oshii();
      }
    }
    $("resHead").innerHTML = head;
    $("resTable").innerHTML = r.segs.map((g) => {
      const T = Lab.TERRAINS[g.terrain];
      return `<tr><td>${T.icon} ${T.short || T.name}</td><td>${g.how}</td><td class="sv">${stars(g.v)}</td><td class="num">${g.time.toFixed(1)}</td></tr>`;
    }).join("");
    $("resTip").innerHTML = `<div class="tip-head">💡 ${hl.text}</div>` + (hl.tip ? `<div class="tip-body">${hl.tip}</div>` : "");
    $("saveBtn").disabled = false;
    $("result").hidden = false;
    $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  $("raceBtn").addEventListener("click", startRace);
  $("skipBtn").addEventListener("click", finishRace);
  $("againBtn").addEventListener("click", startRace);
  $("backBtn").addEventListener("click", () => show("lab"));
  $("saveBtn").addEventListener("click", () => {
    if (!lastRace) return;
    const c = lastRace.combo;
    const item = { head: c.head, body: c.body, legs: c.legs, tail: c.tail, name: Lab.name(c), at: Date.now() };
    let msg = "ずかんに のこしたよ！";
    if (save.mine.length >= MAX_MINE) { save.mine.pop(); msg = "いっぱい なので いちばん ふるい のと いれかえたよ"; }
    save.mine.unshift(item);
    store();
    $("saveBtn").disabled = true;
    Snd.pop(); toast("📖 " + msg);
  });

  /* ---- おだい ---- */
  function setOdai(o) {
    odai = o;
    $("odaiBanner").hidden = !o;
    if (o) {
      course = o.course.slice();
      $("odaiBanner").querySelector(".ob-text").textContent = `🎯 おだい ${o.id}: ${o.text}（ゴールタイム ${o.goal} びょう）`;
    }
    paintCourse();
  }
  $("odaiQuit").addEventListener("click", () => { setOdai(null); course = randomCourse(); paintCourse(); });

  function renderOdai() {
    const done = Object.keys(save.odai).length;
    $("odaiList").innerHTML = `<div class="odai-count">クリア ${done} / ${Lab.ODAI.length}</div>` + Lab.ODAI.map((o) => {
      const best = save.odai[o.id];
      return `<button type="button" class="odai-card${best ? " clear" : ""}" data-id="${o.id}">
        <span class="on">${best ? "✅" : o.id}</span>
        <span class="ot">${o.text}</span>
        <span class="oc">${o.course.map((t) => Lab.TERRAINS[t].icon).join(" → ")}　⏱ ${o.goal} びょう${best ? `　🏅 ${best.toFixed(1)}` : ""}</span>
      </button>`;
    }).join("");
    $("odaiList").querySelectorAll(".odai-card").forEach((b) => b.addEventListener("click", () => {
      Snd.pop(); setOdai(Lab.ODAI.find((o) => o.id === +b.dataset.id)); show("lab");
    }));
  }

  /* ---- ずかん ---- */
  let zTab = "real";
  document.querySelectorAll(".subtab").forEach((b) => b.addEventListener("click", () => { zTab = b.dataset.z; Snd.pop(); renderZukan(); }));

  function renderZukan() {
    document.querySelectorAll(".subtab").forEach((b) => b.classList.toggle("on", b.dataset.z === zTab));
    $("zukanReal").hidden = zTab !== "real";
    $("zukanMine").hidden = zTab !== "mine";
    $("mineCount").textContent = `${save.mine.length}/${MAX_MINE}`;
    if (zTab === "real") {
      $("zukanReal").innerHTML = SPECIES.map((sp, i) => {
        const c = { head: i, body: i, legs: i, tail: i };
        const tips = SLOTS.filter((s) => sp[s].tip).map((s) => `<li><b>${partName(sp, s)}</b>: ${sp[s].tip}</li>`).join("");
        return `<details class="zcard"><summary>${drawCreature(c, { label: sp.name })}<span class="zname">${sp.name}</span></summary>
          <p>${sp.info}</p><ul class="ztips">${tips}</ul></details>`;
      }).join("");
    } else {
      if (!save.mine.length) { $("zukanMine").innerHTML = `<p class="lead">まだ ないよ。レースの あとで「ずかんに のこす」を おしてね。</p>`; return; }
      $("zukanMine").innerHTML = save.mine.map((m, k) => {
        const s = Lab.stats(m);
        const best = Lab.ABS.slice().sort((a, b) => s.ab[b] - s.ab[a])[0];
        return `<div class="zcard mine">
          <button type="button" class="zload" data-k="${k}" aria-label="ラボで つかう">${drawCreature(m, { label: m.name })}<span class="zname">${m.name}</span>
          <span class="zsub">とくい: ${Lab.AB_ICON[best]} ${Lab.AB_NAME[best]}</span></button>
          <button type="button" class="zdel" data-k="${k}" aria-label="けす">✕</button></div>`;
      }).join("");
      $("zukanMine").querySelectorAll(".zload").forEach((b) => b.addEventListener("click", () => {
        const m = save.mine[+b.dataset.k];
        SLOTS.forEach((s) => { combo[s] = m[s]; });
        Snd.gattai(); paintReels(); show("lab"); paintPreview(true);
      }));
      $("zukanMine").querySelectorAll(".zdel").forEach((b) => b.addEventListener("click", () => {
        const m = save.mine[+b.dataset.k];
        if (!confirm(`「${m.name}」を けす？`)) return;
        save.mine.splice(+b.dataset.k, 1); store(); renderZukan();
      }));
    }
  }

  /* ---- はじめ ---- */
  renderReels();
  paintCourse();

  // テスト よう
  window.GDTest = {
    combo: () => Object.assign({}, combo),
    set(c) { SLOTS.forEach((s) => { combo[s] = c[s]; }); paintReels(); },
    setCourse(c) { course = c.slice(); paintCourse(); },
    startOdai(id) { setOdai(Lab.ODAI.find((o) => o.id === id)); show("lab"); },
    finish: finishRace,
    save: () => JSON.parse(JSON.stringify(save))
  };
})();
