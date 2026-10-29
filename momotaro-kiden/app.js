// ももたろう 鬼伝 ― がめんの うごき
(function () {
  "use strict";
  const A = window.Art, S = window.Story, Snd = window.Snd;
  const stage = document.getElementById("stage");
  const SAVE_KEY = "momotaro-kiden:v1";
  const W = "0 0 480 200";

  // ---------- きろく ----------
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (v && typeof v === "object") {
        return { pro: !!v.pro, ending: !!v.ending, beaten: Array.isArray(v.beaten) ? v.beaten.filter((n) => n >= 1 && n <= 10) : [] };
      }
    } catch (e) { /* よめなくても はじめから あそべる */ }
    return { pro: false, ending: false, beaten: [] };
  }
  function store() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても すすむ */ }
  }
  let save = load();

  // ---------- べんり ----------
  const rb = (s) => String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>");
  const $ = (sel, root = stage) => root.querySelector(sel);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function retrigger(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
  }
  let screenId = 0; // がめんを かえたら ふるい タイマーを むしする
  function setScreen(name) {
    screenId++;
    document.body.dataset.screen = name;
    window.scrollTo(0, 0);
    return screenId;
  }

  // ---------- コマ ----------
  function panelHTML(p, hidden) {
    let h = `<div class="panel ${p.cls || ""}${hidden ? " hidden" : ""}">${A.svg(p.art(), p.vb || "0 0 400 300")}`;
    if (p.title) h += `<div class="plate"><small>${rb(p.ord)}</small><b>${rb(p.title)}</b></div>`;
    if (p.nar) h += `<div class="nar ${p.narPos || ""}">${rb(p.nar)}</div>`;
    (p.bubbles || []).forEach((b) => { h += `<div class="bub ${b.k || ""}" style="left:${b.x}%;top:${b.y}%">${rb(b.t)}</div>`; });
    (p.sfx || []).forEach((s) => { h += `<div class="sfx ${s.c || ""}" style="left:${s.x}%;top:${s.y}%;--r:${s.r || 0}deg;--z:${s.z || 1}">${s.t}</div>`; });
    if (p.endMark) h += `<div class="endmark"><b><ruby>完<rt>かん</rt></ruby></b><small>ももたろう <ruby>鬼伝<rt>きでん</rt></ruby></small></div>`;
    return h + "</div>";
  }

  // まんがを よむ（タップで 1コマずつ でてくる）
  function showComic(pages, done) {
    const sid = setScreen("comic");
    let pi = 0, shown = 0, panels = [], last = 0;
    function render() {
      const pg = pages[pi];
      stage.innerHTML = `<div class="comic"><div class="page">${pg.panels.map((p, i) => panelHTML(p, i > 0)).join("")}</div>
        <div class="comic-nav"><span class="pno">${pi + 1} / ${pages.length}</span><button class="btn next" id="next">▶ つぎ</button></div>
        <p class="tip">がめんを タップしても すすむよ</p></div>`;
      window.scrollTo(0, 0);
      panels = [...stage.querySelectorAll(".panel")];
      shown = 1;
      panels[0].classList.add("in");
      if (pg.panels[0].snd) Snd.play(pg.panels[0].snd);
      label();
      $(".comic").addEventListener("click", advance);
    }
    function label() {
      const b = $("#next");
      if (b) b.textContent = shown < panels.length ? "▶ つぎ" : pi < pages.length - 1 ? "▶ つぎの ページ" : "▶ すすむ";
    }
    function advance() {
      if (sid !== screenId) return;
      const now = Date.now();
      if (now - last < 280) return;
      last = now;
      if (shown < panels.length) {
        const el = panels[shown];
        el.classList.remove("hidden");
        el.classList.add("in");
        const p = pages[pi].panels[shown];
        Snd.play(p.snd || "page");
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        shown++;
        label();
      } else {
        Snd.play("page");
        pi++;
        if (pi < pages.length) render();
        else done();
      }
    }
    render();
  }

  // ---------- ひょうし ----------
  function showTitle() {
    setScreen("title");
    const art = A.bg("#0c0c10") + A.moon(200, 120, 70) + A.speed(200, 150, { col: "#000", n: 70, r0: 160, op: 0.7 }) +
      `<g opacity=".95">${A.oniSil(200, 250, 0.95, "#ff2b2b")}</g>` + A.oniSil(60, 300, 0.75) + A.oniSil(340, 300, 0.75) +
      A.momo(200, 300, 1.15) + A.dog(90, 300, 0.85) + A.monkey(300, 300, 0.75) + A.kiji(330, 170, 0.7, { fly: true, flip: true });
    stage.innerHTML = `<div class="title">
      <div class="panel cover dark">${A.svg(art, "0 0 400 300")}
        <div class="cover-t"><span class="sub">しょうねん まんが えほん</span><h1>ももたろう<span class="kiden"><ruby>鬼<rt>き</rt></ruby><ruby>伝<rt>でん</rt></ruby></span></h1><p class="catch">10ぴきの <ruby>鬼<rt>おに</rt></ruby>を たおせ</p></div>
      </div>
      <div class="tbtns">
        <button class="btn big" id="go">▶ ${save.pro ? "つづきから" : "はじめる"}</button>
        ${save.pro ? '<button class="btn" id="re">📖 さいしょから よむ</button>' : ""}
      </div>
      <p class="note">ちょっと こわい ダークファンタジー。<br>なかまの ちからを えらんで、おにの こうげきを やぶろう。</p>
      <a class="back" href="../">← あそびメニュー</a>
    </div>`;
    $("#go").onclick = () => { Snd.play("taiko"); save.pro ? showMap() : startPrologue(); };
    const re = $("#re");
    if (re) re.onclick = () => { Snd.play("taiko"); startPrologue(); };
  }

  function startPrologue() {
    showComic(S.PROLOGUE, showRecruit);
  }

  // ---------- なかま あつめ ----------
  function showRecruit() {
    const sid = setScreen("recruit");
    const intro = A.bg("#1a1a24") + A.speed(240, 100, { col: "#fff", n: 50, r0: 70, op: 0.35 }) + A.dango(240, 160, 1.3);
    stage.innerHTML = `<div class="comic"><div class="page">
      <div class="panel wide dark in">${A.svg(intro, W)}<div class="nar">きびだんごを もって、ももたろうは たびに でた。みちで であった かげを タップして、なかまに しよう！</div></div>
      <div class="trio">${S.RECRUIT.map((r, i) => `<div class="panel recruit sil in" data-i="${i}" role="button" tabindex="0">
        ${A.svg(A.bg("#e9ecef") + A.tone(0.3))}<div class="char">${A.svg(r.art())}</div>
        <div class="q">？</div><div class="give">🍡 タップで だんごを あげる</div></div>`).join("")}</div>
      <div class="panel free ability" id="ability" hidden>
        <div class="ab-h">なかまの ちから —— おにの こうげきに あわせて えらぼう</div>
        <div class="ab-list">${Object.values(S.PARTY).map((p) => `<div class="ab">${A.svg(p.icon(), "0 0 100 100")}<span><b>${p.name}</b><small>${p.skill}</small></span></div>`).join("")}</div>
      </div>
    </div><div class="comic-nav"><button class="btn next" id="next" disabled>▶ たびだち</button></div></div>`;
    let got = 0;
    stage.querySelectorAll(".recruit").forEach((el) => {
      el.addEventListener("click", () => {
        if (!el.classList.contains("sil") || sid !== screenId) return;
        const r = S.RECRUIT[+el.dataset.i];
        el.classList.remove("sil");
        el.insertAdjacentHTML("beforeend", `<div class="bub" style="left:4%;top:4%">${rb(r.line)}</div><div class="sfx red" style="left:52%;top:70%;--r:-8deg;--z:.8">なかまに なった！</div>`);
        Snd.play("join");
        got++;
        if (got === 3) {
          const ab = $("#ability");
          ab.hidden = false;
          ab.classList.add("in");
          $("#next").disabled = false;
          setTimeout(() => ab.scrollIntoView({ behavior: "smooth", block: "nearest" }), 300);
        }
      });
    });
    $("#next").onclick = () => {
      save.pro = true;
      store();
      Snd.play("taiko");
      showMap();
    };
  }

  // ---------- ちず ----------
  const isOpen = (id) => id === 1 || save.beaten.includes(id - 1) || save.beaten.includes(id);
  function showMap() {
    setScreen("map");
    const n = save.beaten.length;
    const cards = S.ONI.map((o) => {
      const beaten = save.beaten.includes(o.id), open = isOpen(o.id);
      const art = open
        ? A.svg(A.scenery(o.id) + A.oni(o.id, 200, 290, o.id === 5 ? 0.8 : 1), "40 10 320 300")
        : A.svg(A.bg("#1d1d24") + A.oniSil(200, 290, 1, "#444"), "40 10 320 300");
      return `<button class="onicard${beaten ? " beaten" : ""}${open ? "" : " locked"}" data-id="${o.id}" ${open ? "" : "disabled"}>
        ${art}<span class="ord">だい${o.id}の <ruby>鬼<rt>おに</rt></ruby></span>
        <span class="oname">${open ? rb(o.title) : "？？？"}</span>
        ${beaten ? '<span class="stamp">たおした</span>' : ""}${open ? "" : '<span class="lock">🔒</span>'}</button>`;
    }).join("");
    stage.innerHTML = `<div class="map">
      <h1>おにがしまへの みち</h1>
      <p class="count">たおした <ruby>鬼<rt>おに</rt></ruby>：<b>${n}</b> / 10　${S.ONI.map((o) => `<span class="hornmark${save.beaten.includes(o.id) ? " on" : ""}">${A.svg(A.horn("#fff3bf", 0, 0, 0.5), "-12 -34 24 36")}</span>`).join("")}</p>
      <div class="onigrid">${cards}</div>
      <div class="maptools">
        ${n === 10 ? '<button class="btn" id="end">🌅 エンディングを よむ</button>' : ""}
        <button class="btn" id="pro">📖 はじめから よむ</button>
        <button class="btn small" id="reset">きろくを けす</button>
      </div>
    </div>`;
    stage.querySelectorAll(".onicard:not([disabled])").forEach((b) => {
      b.onclick = () => startOni(S.ONI[+b.dataset.id - 1]);
    });
    $("#pro").onclick = startPrologue;
    const end = $("#end");
    if (end) end.onclick = () => showComic(S.ENDING, showMap);
    $("#reset").onclick = () => {
      if (!window.confirm("たおした おにの きろくを ぜんぶ けしますか？")) return;
      save = { pro: false, ending: false, beaten: [] };
      store();
      showTitle();
    };
  }

  function startOni(o) {
    Snd.play("taiko");
    showComic(S.introPages(o), () => showBattle(o));
  }

  // ---------- たたかい ----------
  const ONI_SCALE = { 3: 0.85, 5: 0.75, 10: 0.85 };
  function showBattle(o) {
    const sid = setScreen("battle");
    const alive = () => sid === screenId;
    let turn = 0, miss = 0, busy = true;
    const scene = A.scenery(o.id) +
      `<g class="oniw" id="oniw">${A.oni(o.id, 305, 244, ONI_SCALE[o.id] || 0.9)}</g>` +
      `<g class="pm" id="pm-kiji">${A.kiji(70, 110, 0.65, { fly: true })}</g>` +
      `<g class="pm" id="pm-dog">${A.dog(40, 244, 0.75)}</g>` +
      `<g class="pm" id="pm-momo">${A.momo(118, 244, 0.8)}</g>` +
      `<g class="pm" id="pm-monkey">${A.monkey(178, 244, 0.65)}</g>`;
    stage.innerHTML = `<div class="battle">
      <div class="bhead"><span class="bname"><small>だい${o.id}の <ruby>鬼<rt>おに</rt></ruby></small><span>${rb(o.title)}</span></span><div class="hp" id="hp">${"<i></i>".repeat(4)}</div></div>
      <div class="bmain">
        <div class="panel bscene" id="scene">${A.svg(scene, "0 0 400 260", "xMidYMax meet")}<div class="fx" id="fx"></div></div>
        <div class="bside"><div class="msg" id="msg"></div>
          <div class="cmds" id="cmds">${Object.entries(S.PARTY).map(([k, p]) => `<button class="cmd" data-who="${k}">${A.svg(p.icon(), "0 0 100 100")}<span>${p.name}<small>${p.skill}</small></span></button>`).join("")}</div>
        </div>
      </div></div>`;
    const msg = $("#msg"), fx = $("#fx"), oniw = $("#oniw");
    const setMsg = (h) => { msg.innerHTML = h; retrigger(msg, "pop"); };
    function pop(text, x, y, cls = "") {
      const d = document.createElement("div");
      d.className = "fxs " + cls;
      d.style.left = x + "%";
      d.style.top = y + "%";
      d.style.setProperty("--r", (Math.random() * 20 - 10).toFixed(0) + "deg");
      d.textContent = text;
      fx.appendChild(d);
      setTimeout(() => d.remove(), 1300);
    }
    function hpDrop(k) {
      const seg = $("#hp").children[3 - k];
      if (seg) seg.classList.add("gone");
    }
    function bindCmds() {
      stage.querySelectorAll(".cmd[data-who]").forEach((b) => { b.onclick = () => pick(b.dataset.who); });
    }

    async function prompt() {
      const m = o.moves[turn];
      miss = 0;
      busy = true;
      stage.querySelectorAll(".cmd").forEach((b) => b.classList.remove("glow"));
      setMsg(`<b class="act">${rb(m.act)}</b><span class="ask">だれで たちむかう？</span>`);
      retrigger(oniw, "oatk");
      pop(m.sfx, 52, 18, "red");
      Snd.play(turn === 0 ? "roar" : "taiko");
      await wait(450);
      if (alive()) busy = false;
    }
    async function pick(who) {
      if (busy || !alive()) return;
      const m = o.moves[turn], p = S.PARTY[who];
      busy = true;
      if (who === m.ans) {
        retrigger($("#pm-" + who), "atk");
        Snd.play(p.snd);
        pop(p.win, who === "kiji" ? 30 : 42, who === "kiji" ? 10 : 34);
        setMsg(`<b class="good">${rb(m.win)}</b>`);
        await wait(300);
        if (!alive()) return;
        Snd.play("hit");
        retrigger(oniw, "ohit");
        retrigger($("#scene"), "quake");
        hpDrop(turn);
        await wait(1700);
        if (!alive()) return;
        turn++;
        if (turn < o.moves.length) prompt();
        else charge();
      } else {
        miss++;
        retrigger($("#pm-" + who), "fail");
        Snd.play("clang");
        pop("ガキィン", 46, 30);
        setMsg(`<b class="bad">${p.name}「${p.miss}」</b><span class="hint">💡 ${rb(m.hint)}</span>`);
        if (miss >= 2) $(`.cmd[data-who="${m.ans}"]`).classList.add("glow");
        await wait(650);
        if (alive()) busy = false;
      }
    }

    function charge() {
      const N = 12;
      let pw = 0;
      setMsg(`<b class="act">${o.name}が ひるんだ！ いまだ！</b><span class="ask"><ruby>必殺<rt>ひっさつ</rt></ruby>わざ「${o.fin.name}」！ れんだして ちからを ためろ！</span>`);
      $("#cmds").innerHTML = `<div class="charge"><div class="meter"><b id="mb"></b></div><button class="cmd bigbtn" id="pow">👊 ちからを ためる！</button></div>`;
      const mb = $("#mb");
      $("#pow").onclick = () => {
        if (pw >= N || !alive()) return;
        pw++;
        mb.style.width = (pw / N) * 100 + "%";
        Snd.play("power", pw);
        retrigger($("#pm-momo"), "tremble");
        if (pw % 3 === 0) pop("ググッ", 18 + Math.random() * 20, 20 + Math.random() * 30);
        if (pw >= N) finisher();
      };
    }

    async function finisher() {
      const by = o.fin.by;
      let art = A.bg("#fff") + A.speed(200, 150, { n: 90, r0: 120, w: 14, seed: o.id * 3 });
      if (by === "momo") art += `<path d="M-40,250 Q200,-40 460,60" stroke="#c92a2a" stroke-width="22" fill="none" opacity=".85"/>` + A.momoFace(200, 160, 1.1);
      else if (by === "all") art += A.dog(70, 290, 1.1) + A.monkey(330, 290, 1.1, { flip: true }) + A.kiji(320, 110, 0.9, { fly: true, flip: true }) + A.momo(190, 300, 1.4, { pose: "slash" });
      else if (by === "dog") art += A.dog(150, 260, 2.4, { bite: true }) + A.monkey(320, 280, 1.3, { flip: true });
      else if (by === "monkey") art += A.monkey(200, 280, 2.3) + A.hspeed({ n: 30, op: 0.8 });
      else art += A.kiji(220, 220, 2, { fly: true }) + A.momo(80, 300, 1, { pose: "slash" });
      const sp = document.createElement("div");
      sp.className = "splash";
      sp.innerHTML = `${A.svg(art, "0 0 400 300")}<div class="fin-t"><small><ruby>必殺<rt>ひっさつ</rt></ruby></small><b>${o.fin.name}</b></div>`;
      document.body.appendChild(sp);
      Snd.play("fin");
      await wait(2300);
      sp.remove();
      if (!alive()) return;
      const fl = document.createElement("div");
      fl.className = "flash";
      $("#scene").appendChild(fl);
      setTimeout(() => fl.remove(), 700);
      hpDrop(3);
      oniw.classList.add("odown");
      retrigger($("#scene"), "quake");
      pop("ドォォォン", 50, 30, "big");
      Snd.play("boom");
      if (!save.beaten.includes(o.id)) save.beaten.push(o.id);
      store();
      setMsg(`<b class="good">${rb(o.title)}を たおした！</b><span class="ask">${o.name}の つのを てに いれた。</span>`);
      $("#cmds").innerHTML = `<button class="cmd bigbtn" id="go">▶ つぎへ</button>`;
      $("#go").onclick = () => {
        Snd.play("page");
        showComic(S.defeatPages(o), () => {
          if (o.id === 10) showComic(S.ENDING, () => { save.ending = true; store(); showMap(); });
          else showMap();
        });
      };
    }

    bindCmds();
    setTimeout(() => { if (alive()) prompt(); }, 500);
  }

  // ---------- うえの ボタン ----------
  const sb = document.getElementById("btnSound");
  const paintSound = () => { sb.textContent = Snd.on ? "🔊" : "🔇"; sb.setAttribute("aria-pressed", Snd.on ? "true" : "false"); };
  sb.onclick = () => { Snd.toggle(); paintSound(); Snd.play("page"); };
  paintSound();
  document.getElementById("btnHome").onclick = showTitle;
  document.getElementById("btnMap").onclick = () => (save.pro ? showMap() : showTitle());
  window.addEventListener("pointerdown", () => Snd.unlock(), { once: true });

  showTitle();
})();
