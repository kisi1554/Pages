/* むしくい しんぶん — がめんと あそび */
(function () {
  "use strict";
  const M = window.MONDAI, B = window.MUSHI, SND = window.SND;
  const KEY = "mushikui-shinbun-v1";
  const PER = 5; // てがみ 1まいに ぶん 5つ
  const LEVELS = [
    { n: 1, name: "ひらがな", icon: "🔤", desc: "1もじ", kind: "letter" },
    { n: 2, name: "ことば", icon: "🧺", desc: "ことば 1つ", kind: "letter" },
    { n: 3, name: "かんじ", icon: "🈷️", desc: "1〜3ねんの かんじ", kind: "letter" },
    { n: 4, name: "ことわざ", icon: "📜", desc: "ことわざの 1ぶぶん", kind: "letter" },
    { n: 5, name: "しんぶん", icon: "📰", desc: "むしむし タイムズ", kind: "news" },
  ];
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- ほぞん ---------- */
  function blank() { return { clear: { 1: [], 2: [], 3: [], 4: [], 5: [] }, zukan: {}, set: { sound: true, yomi: true, omo: false, pad: false } }; }
  let save = blank();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") {
      save.clear = Object.assign(save.clear, raw.clear || {});
      save.zukan = Object.assign({}, raw.zukan || {});
      save.set = Object.assign(save.set, raw.set || {});
    }
  } catch (e) { save = blank(); }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ } }

  SND.S.on = !!save.set.sound;
  SND.S.yomi = !!save.set.yomi;

  /* ---------- データ ---------- */
  function sheetCount(lv) { return lv === 5 ? M.SHINBUN.length : Math.ceil(M.LV[lv].length / PER); }
  function sheetData(lv, i) {
    if (lv === 5) {
      const n = M.SHINBUN[i];
      // ぶんごとに わけて、あなを じゅんばんに わりあてる
      const sents = n.s.split(/(?<=。)\s*/).filter(Boolean);
      let k = 0;
      const lines = sents.map((s) => { const c = (s.match(/＿/g) || []).length; const hs = n.h.slice(k, k + c); k += c; return { s, holes: hs }; });
      return { kind: "news", title: n.t, pic: n.e, lines };
    }
    const qs = M.LV[lv].slice(i * PER, i * PER + PER);
    return { kind: "letter", lines: qs.map((q) => ({ s: q.s, e: q.e, m: q.m, holes: [q] })) };
  }

  /* ---------- もじの しょり ---------- */
  const KANJI_RUBY = /([一-鿿々]+)\{([^}]+)\}/g;
  const ruby = (base, y) => `<ruby>${esc(base)}<rt>${esc(y)}</rt></ruby>`;
  const isKanji = (s) => /[一-鿿]/.test(s);
  function fillWord(h, w) { return isKanji(w) && h.y ? ruby(w, h.y) : esc(w); }
  // 1つの ぶんを HTML に。holeHtml(j) が あなの ぶぶんを かえす
  function lineHtml(s, holeHtml) {
    let j = 0;
    return s.split("＿").map((part, idx) => (idx ? holeHtml(j++) : "") + esc(part).replace(/([一-鿿々]+)\{([^}]+)\}/g, (m0, b, y) => ruby(b, y))).join("");
  }
  // よみあげ・へんな ぶん よう（かんじは よみに）
  function plain(s, words) { let j = 0; return s.replace(/＿/g, () => words[j++]).replace(KANJI_RUBY, "$2"); }
  function plainRuby(s, words) { let j = 0; return s.replace(/＿/g, () => words[j++]); }

  /* ---------- がめん きりかえ ---------- */
  const views = ["vHome", "vSheets", "vPlay", "vZukan", "vSet"];
  let cur = "vHome", back = null;
  function show(v, backTo) {
    SND.hush();
    views.forEach((x) => { $(x).hidden = x !== v; });
    cur = v; back = backTo || null;
    $("backBtn").hidden = !back;
    document.querySelector(".home").hidden = !!back;
    window.scrollTo(0, 0);
  }
  $("backBtn").addEventListener("click", () => {
    SND.SFX.tap();
    if (back === "vSheets") openSheets(play.lv);
    else { renderHome(); show("vHome"); }
  });

  /* ---------- タイトル ---------- */
  function renderHome() {
    $("ttl").textContent = "🐛 むしくい しんぶん";
    $("lvList").innerHTML = LEVELS.map((L) => {
      const n = sheetCount(L.n), c = (save.clear[L.n] || []).length;
      return `<button type="button" class="lv-card lv${L.n}" data-lv="${L.n}">
        <span class="lv-icon">${L.icon}</span>
        <span class="lv-txt"><b>レベル${L.n} ${L.name}</b><small>${L.desc}</small></span>
        <span class="lv-prog">${c >= n ? "👑" : ""}${c}/${n}</span></button>`;
    }).join("");
  }
  $("lvList").addEventListener("click", (e) => {
    const b = e.target.closest(".lv-card"); if (!b) return;
    SND.SFX.tap(); openSheets(+b.dataset.lv);
  });
  $("zukanBtn").addEventListener("click", () => { SND.SFX.tap(); renderZukan(); show("vZukan", "vHome"); $("ttl").textContent = "📖 むし ずかん"; });
  $("setBtn").addEventListener("click", () => { SND.SFX.tap(); renderSet(); show("vSet", "vHome"); $("ttl").textContent = "⚙️ せってい"; });

  /* ---------- かみ えらび ---------- */
  function openSheets(lv) {
    play.lv = lv;
    const L = LEVELS[lv - 1], n = sheetCount(lv), cl = save.clear[lv] || [];
    $("ttl").textContent = `${L.icon} ${L.name}`;
    $("sheetsTtl").textContent = `レベル${lv} ${L.name}`;
    $("sheetsNote").textContent = lv === 5 ? "むしむし タイムズ。 きじの あなを ぜんぶ うめよう。" : "おてがみ 1まいに あなが 5こ。";
    $("sheetGrid").innerHTML = Array.from({ length: n }, (_, i) => {
      const ok = cl.indexOf(i) >= 0;
      const label = lv === 5 ? esc(M.SHINBUN[i].e) : (L.kind === "letter" ? "✉️" : "");
      return `<button type="button" class="sheet-btn${ok ? " ok" : ""}" data-i="${i}"><span class="sb-no">${i + 1}</span><span class="sb-ic">${label}</span>${ok ? '<span class="sb-ok">✓</span>' : ""}</button>`;
    }).join("");
    show("vSheets", "vHome");
  }
  $("sheetGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".sheet-btn"); if (!b) return;
    SND.SFX.tap(); startSheet(play.lv, +b.dataset.i);
  });

  /* ---------- あそぶ ---------- */
  const play = { lv: 1, idx: 0, data: null, holes: [], sel: -1, busy: false, typed: [], tried: {} };

  function startSheet(lv, idx) {
    SND.unlock();
    play.lv = lv; play.idx = idx; play.data = sheetData(lv, idx);
    play.holes = []; play.sel = -1; play.busy = false; play.typed = [];
    play.data.lines.forEach((ln, li) => ln.holes.forEach((h) => play.holes.push({ h, li, done: false, bug: B.pick(), tried: [] })));
    $("ttl").textContent = lv === 5 ? "📰 むしむし タイムズ" : `✉️ おてがみ ${idx + 1}`;
    play.fresh = true;
    clearTimeout(play.freshT);
    play.freshT = setTimeout(() => { play.fresh = false; $("paper").classList.remove("fresh"); }, 1400);
    renderPaper();
    $("done").hidden = true; $("panel").hidden = false;
    show("vPlay", "vSheets");
    SND.SFX.kaji();
    setTimeout(() => select(0), 50);
  }

  function holeHtml(k) {
    const H = play.holes[k], h = H.h;
    if (H.done) return `<span class="filled" data-k="${k}">${fillWord(h, h.a)}</span>`;
    const len = [...h.a].length;
    const hint = h.y ? `<span class="hint yomi">${esc(h.y)}</span>` : `<span class="hint">${"・".repeat(Math.min(len, 6))}</span>`;
    return `<button type="button" class="hole s${k % 4}${k === play.sel ? " sel" : ""}" data-k="${k}" style="--n:${Math.min(len, 6)}; --d:${(k % 5) * 0.12}s" aria-label="あな ${k + 1}"><span class="pit"></span>${hint}<span class="bugwrap">${B.svg(H.bug)}</span></button>`;
  }

  function renderPaper() {
    const d = play.data;
    let k = 0, html = "";
    if (d.kind === "news") {
      html += `<div class="mast"><span class="mast-name">むしむし タイムズ</span><span class="mast-no">だい ${play.idx + 1} ごう</span></div>`;
      html += `<h2 class="headline">${esc(d.title)}</h2><div class="news-pic" aria-hidden="true">${d.pic}</div><div class="news-body">`;
      d.lines.forEach((ln, li) => {
        const base = k;
        html += `<span class="nline" data-li="${li}">${lineHtml(ln.s, (j) => holeHtml(base + j))}</span> `;
        k += ln.holes.length;
      });
      html += "</div>";
    } else {
      html += `<div class="letter-head">✉️ おてがみ <b>${play.idx + 1}</b> まいめ</div><ol class="letter">`;
      d.lines.forEach((ln, li) => {
        const base = k, allDone = ln.holes.every((_, j) => play.holes[base + j].done);
        html += `<li class="lline${allDone ? " ok" : ""}" data-li="${li}"><span class="pic" aria-hidden="true">${ln.e}</span><span class="ltxt">${lineHtml(ln.s, (j) => holeHtml(base + j))}`;
        if (ln.m && allDone) html += `<span class="imi">💡 ${esc(ln.m)}</span>`;
        html += "</span></li>";
        k += ln.holes.length;
      });
      html += "</ol>";
    }
    $("paper").className = "paper " + d.kind + (play.fresh ? " fresh" : "") + (play.holes.every((H) => H.done) ? " kirei" : "");
    $("paper").innerHTML = html;
  }

  $("paper").addEventListener("click", (e) => {
    const b = e.target.closest(".hole"); if (!b || play.busy) return;
    SND.SFX.tap(); select(+b.dataset.k);
  });

  function usePad() { return save.set.pad && play.lv >= 4; }

  function select(k) {
    if (k < 0 || !play.holes[k] || play.holes[k].done) return;
    play.sel = k; play.typed = [];
    document.querySelectorAll(".hole.sel").forEach((x) => x.classList.remove("sel"));
    const el = document.querySelector(`.hole[data-k="${k}"]`);
    if (el) {
      el.classList.add("sel");
      const r = el.getBoundingClientRect(), ph = $("panel").getBoundingClientRect().height;
      if (r.top < 60 || r.bottom > window.innerHeight - ph - 10) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    renderPanel();
  }

  function renderPanel() {
    const H = play.holes[play.sel];
    $("modeBtn").hidden = play.lv < 4;
    $("modeBtn").textContent = usePad() ? "👆 えらんで こたえる" : "⌨️ じぶんで いれる";
    if (!H) { $("choices").innerHTML = ""; $("padWrap").hidden = true; return; }
    const h = H.h;
    $("panelMsg").textContent = h.y ? `「${h.y}」と よむ かんじは どれ？` : "あなに はいるのは どれ？";
    if (usePad()) {
      $("panelMsg").textContent = `あなに はいる ことばを いれてね（${[...h.a].length}もじ）`;
      $("choices").innerHTML = ""; $("padWrap").hidden = false; renderPad();
      return;
    }
    $("padWrap").hidden = true;
    const opts = shuffle([h.a].concat(h.d));
    $("choices").innerHTML = opts.map((w) => `<button type="button" class="choice${H.tried.indexOf(w) >= 0 ? " ng" : ""}" data-w="${esc(w)}"${H.tried.indexOf(w) >= 0 ? " disabled" : ""}>${esc(w)}</button>`).join("");
  }
  $("choices").addEventListener("click", (e) => {
    const b = e.target.closest(".choice"); if (!b || b.disabled || play.busy) return;
    answer(b.dataset.w, b);
  });
  $("modeBtn").addEventListener("click", () => {
    save.set.pad = !save.set.pad; store(); SND.SFX.tap(); play.typed = []; renderPanel();
  });

  /* 50おん パッド */
  const PAD = ["あいうえお", "かきくけこ", "さしすせそ", "たちつてと", "なにぬねの", "はひふへほ", "まみむめも", "や　ゆ　よ", "らりるれろ", "わ　を　ん"];
  const DAKU = { か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご", さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ", た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど", は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ" };
  const HAN = { は: "ぱ", ひ: "ぴ", ふ: "ぷ", へ: "ぺ", ほ: "ぽ" };
  const SMALL = { つ: "っ", や: "ゃ", ゆ: "ゅ", よ: "ょ", あ: "ぁ", い: "ぃ", う: "ぅ", え: "ぇ", お: "ぉ" };
  const rev = (o) => Object.fromEntries(Object.entries(o).map(([a, b]) => [b, a]));
  const UNDAKU = rev(DAKU), UNHAN = rev(HAN), UNSMALL = rev(SMALL);
  function renderPad() {
    const H = play.holes[play.sel], len = [...H.h.a].length;
    $("padBox").innerHTML = Array.from({ length: len }, (_, i) => `<span class="pbox${i === play.typed.length ? " now" : ""}">${esc(play.typed[i] || "")}</span>`).join("");
    if ($("pad").dataset.built) return;
    $("pad").dataset.built = "1";
    // たての れつ（あ かな）を みぎから ひだりへ ならべず、 よこ 10れつ × 5だん に する
    let html = "";
    for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) {
      const ch = PAD[c][r];
      html += ch === "　" ? '<span class="pk blank"></span>' : `<button type="button" class="pk" data-c="${ch}">${ch}</button>`;
    }
    html += `<button type="button" class="pk fn" data-f="daku">゛</button><button type="button" class="pk fn" data-f="han">゜</button><button type="button" class="pk fn" data-f="small">小</button><button type="button" class="pk fn" data-c="ー">ー</button><button type="button" class="pk fn wide" data-f="del">けす</button>`;
    $("pad").innerHTML = html;
  }
  $("pad").addEventListener("click", (e) => {
    const b = e.target.closest(".pk"); if (!b || play.busy || play.sel < 0) return;
    const H = play.holes[play.sel], len = [...H.h.a].length, t = play.typed;
    SND.SFX.tap();
    if (b.dataset.c) { if (t.length < len) t.push(b.dataset.c); }
    else if (b.dataset.f === "del") t.pop();
    else if (t.length) {
      const last = t[t.length - 1], base = UNDAKU[last] || UNHAN[last] || UNSMALL[last] || last;
      const map = b.dataset.f === "daku" ? DAKU : b.dataset.f === "han" ? HAN : SMALL;
      t[t.length - 1] = map[base] && map[base] !== last ? map[base] : base;
    }
    renderPad();
    if (t.length === len) setTimeout(() => answer(t.join(""), null), 250);
  });

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function answer(w, btn) {
    const k = play.sel, H = play.holes[k]; if (!H || H.done) return;
    if (H.h.ok.indexOf(w) >= 0) return correct(k);
    wrong(k, w, btn);
  }

  function bubble(el, text, cls) {
    if (!el) return;
    const s = document.createElement("span");
    s.className = "bubble " + (cls || ""); s.textContent = text;
    el.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }

  function correct(k) {
    const H = play.holes[k];
    play.busy = true;
    SND.SFX.pon(); SND.SFX.pyu();
    const el = document.querySelector(`.hole[data-k="${k}"]`);
    // むしが にげる
    if (el) {
      const bw = el.querySelector(".bugwrap");
      const r = bw.getBoundingClientRect();
      const fly = document.createElement("div");
      fly.className = "runaway"; fly.innerHTML = B.svg(H.bug) + '<span class="bubble say">ごめんね〜</span>';
      fly.style.left = r.left + "px"; fly.style.top = r.top + "px";
      fly.style.setProperty("--dx", (r.left > window.innerWidth / 2 ? 1 : -1) * (window.innerWidth * 0.8) + "px");
      document.body.appendChild(fly);
      setTimeout(() => fly.remove(), 1600);
    }
    H.done = true;
    save.zukan[H.bug] = (save.zukan[H.bug] || 0) + 1; store();
    renderPaper();
    const f = document.querySelector(`.filled[data-k="${k}"]`); if (f) f.classList.add("pop");
    play.busy = false;
    const next = nextOpen(k);
    if (next < 0) return finish();
    select(next);
  }
  function nextOpen(k) {
    for (let i = 1; i <= play.holes.length; i++) { const j = (k + i) % play.holes.length; if (!play.holes[j].done) return j; }
    return -1;
  }

  function wrong(k, w, btn) {
    const H = play.holes[k];
    const el = document.querySelector(`.hole[data-k="${k}"]`);
    if (save.set.omo) return funny(k, w);
    SND.SFX.musha();
    if (H.tried.indexOf(w) < 0 && btn) H.tried.push(w);
    if (btn) { btn.classList.add("ng", "shake"); btn.disabled = true; }
    if (el) { el.classList.remove("munch"); void el.offsetWidth; el.classList.add("munch"); bubble(el, "むしゃむしゃ", "musha"); }
    $("panelMsg").textContent = "むしに たべられちゃった！ もう いちど";
    if (!btn) { play.typed = []; setTimeout(renderPad, 500); }
  }

  /* おもしろ モード: わざと ちがう ことばを いれた ぶんを みせて、そのあと せいかいを おしえる */
  function funny(k, w) {
    const H = play.holes[k], ln = play.data.lines[H.li];
    play.busy = true;
    SND.SFX.hen();
    // その ぶんの ほかの あなは せいかいで うめて みせる
    let base = 0; for (let i = 0; i < H.li; i++) base += play.data.lines[i].holes.length;
    const words = ln.holes.map((h, j) => (base + j === k ? "\u0001" + w + "\u0002" : h.a));
    const txt = plain(ln.s, words);
    $("funnyText").innerHTML = esc(txt).replace("\u0001", '<mark class="hen">').replace("\u0002", "</mark>");
    const pic = H.h.f[w];
    const basePic = ln.e || play.data.pic || "❓";
    $("funnyPic").innerHTML = pic ? `<span class="fp">${pic}</span>` : `<span class="fp spin">${basePic}</span><span class="fp q">❓</span>`;
    $("funnyAns").hidden = true;
    $("funny").hidden = false;
    setTimeout(() => {
      $("funnyAns").hidden = false;
      $("funnyAns").innerHTML = `ほんとうは「<b>${fillWord(H.h, H.h.a)}</b>」だよ！`;
      SND.say(`ほんとうは、 ${H.h.y && isKanji(H.h.a) ? H.h.y : H.h.a}`);
    }, 1800);
    setTimeout(() => { $("funny").hidden = true; play.busy = false; correct(k); }, 3800);
  }
  $("funny").addEventListener("click", () => { /* よみおわるまで まつ */ });

  function sheetText() {
    const d = play.data;
    const t = d.lines.map((ln) => plain(ln.s, ln.holes.map((h) => (isKanji(h.a) && h.y ? h.y : h.a)))).join("。 ").replace(/。。/g, "。");
    return d.kind === "news" ? `${d.title}。 ${t}` : t;
  }

  function finish() {
    SND.SFX.pari();
    $("paper").classList.add("kirei", "open");
    $("panel").hidden = true;
    $("done").hidden = false;
    const cl = save.clear[play.lv] || (save.clear[play.lv] = []);
    if (cl.indexOf(play.idx) < 0) { cl.push(play.idx); store(); }
    $("nextBtn").textContent = play.idx + 1 < sheetCount(play.lv) ? "つぎの かみ ▶" : "おしまい ▶";
    setTimeout(() => SND.say(sheetText()), 900);
  }
  $("readBtn").addEventListener("click", () => { SND.SFX.tap(); SND.say(sheetText()); });
  $("nextBtn").addEventListener("click", () => {
    SND.SFX.tap();
    if (play.idx + 1 < sheetCount(play.lv)) startSheet(play.lv, play.idx + 1);
    else openSheets(play.lv);
  });

  /* ---------- ずかん ---------- */
  function renderZukan() {
    const got = B.BUGS.filter((b) => save.zukan[b.id]).length;
    $("zukanNote").textContent = `にがした むし ${got} / ${B.BUGS.length} しゅるい`;
    $("zukanGrid").innerHTML = B.BUGS.map((b) => {
      const n = save.zukan[b.id] || 0;
      return n ? `<div class="zcard"><div class="zart">${B.svg(b.id, "zbug")}</div><b>${esc(b.name)}</b><small class="zn">${n}かい にがした</small><p>${esc(b.info)}</p></div>`
        : `<div class="zcard none"><div class="zart">${B.svg(b.id, "zbug")}</div><b>？？？</b><p>まだ であって いない むし</p></div>`;
    }).join("");
  }

  /* ---------- せってい ---------- */
  function renderSet() {
    $("setSound").checked = save.set.sound; $("setYomi").checked = save.set.yomi;
    $("setOmo").checked = save.set.omo; $("setPad").checked = save.set.pad;
  }
  [["setSound", "sound"], ["setYomi", "yomi"], ["setOmo", "omo"], ["setPad", "pad"]].forEach(([id, k]) => {
    $(id).addEventListener("change", () => {
      save.set[k] = $(id).checked; store(); applySound(); SND.SFX.tap();
    });
  });
  $("resetBtn").addEventListener("click", () => {
    if (!window.confirm("クリアの きろくと ずかんを けしますか？")) return;
    const set = save.set; save = blank(); save.set = set; store(); renderSet(); SND.SFX.tap();
  });
  function applySound() {
    SND.S.on = save.set.sound; SND.S.yomi = save.set.yomi;
    if (!SND.S.yomi) SND.hush();
    $("soundBtn").textContent = save.set.sound ? "🔊" : "🔇";
    $("soundBtn").setAttribute("aria-pressed", String(save.set.sound));
  }
  $("soundBtn").addEventListener("click", () => {
    save.set.sound = !save.set.sound; store(); applySound(); SND.SFX.tap();
  });

  const demo = document.querySelector(".hole.demo");
  if (demo) demo.insertAdjacentHTML("beforeend", `<span class="bugwrap">${B.svg("aomushi")}</span>`);
  applySound();
  renderHome();
  show("vHome");

  // check.js から つかう
  window.MSTest = {
    save: () => JSON.parse(JSON.stringify(save)),
    holes: () => play.holes.map((H) => ({ a: H.h.a, d: H.h.d, done: H.done })),
    sel: () => play.sel,
  };
})();
