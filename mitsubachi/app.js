/* ミツバチの いちにち ｜ きほん（ほぞん・がめんの きりかえ・Canvas・おしらせ） */
(function () {
  "use strict";
  const MB = (window.MB = window.MB || {});
  const $ = (id) => document.getElementById(id);
  const KEY = "mitsubachi.v1";

  /* ---------------------------------------------------------------- ほぞん */
  function fresh() {
    return {
      v: 1, age: 1, jobsDone: {}, fruits: {}, honey: 0, flowers: 0,
      dance: { ok: 0, try: 0, round: 0 }, quiz: { ok: 0, try: 0 },
      met: { queen: false, drone: false }, trip: 0, days: 0,
      sound: true, bgm: false, helped: false,
    };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && s.v === 1) return Object.assign(fresh(), s);
    } catch (e) { /* よめない ときは あたらしく */ }
    return fresh();
  }
  const S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ほぞん できなくても あそべる */ }}
  function reset() { const f = fresh(); f.sound = S.sound; f.bgm = S.bgm; f.helped = true; Object.keys(S).forEach((k) => delete S[k]); Object.assign(S, f); save(); }

  // いちにちの じかん（そとの しごと 3かい）
  const TRIPS = [
    { label: "あさ", em: "🌅", hour: 8 },
    { label: "おひる", em: "☀️", hour: 12 },
    { label: "ゆうがた", em: "🌇", hour: 16 },
  ];
  const AZ_NAME = (az) => ["きた", "きたひがし", "ひがし", "みなみひがし", "みなみ", "みなみにし", "にし", "きたにし"][Math.round(DANCE.norm(az) / 45) % 8];

  /* ---------------------------------------------------------------- Canvas */
  const cv = $("cv"), g = cv.getContext("2d");
  const view = { W: 300, H: 300, dpr: 1 };
  function fit(quiet) {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(50, Math.round(r.width)), H = Math.max(50, Math.round(r.height));
    if (W !== view.W || H !== view.H || dpr !== view.dpr) {
      view.W = W; view.H = H; view.dpr = dpr;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      if (!quiet && scene && scene.resize) scene.resize(W, H);
    }
  }

  /* ---------------------------------------------------------------- がめん */
  let scene = null, sceneName = "home";
  const scenes = {};
  function register(name, sc) { scenes[name] = sc; }
  function go(name, opts) {
    hideBubble(); hideToast();
    if (scene && scene.leave) scene.leave();
    MB.Sound.buzz(0);
    if (name === "home") {
      scene = null; sceneName = "home";
      $("play").hidden = true; $("home").hidden = false; document.body.classList.remove("playing");
      MB.Home && MB.Home.render();
      window.scrollTo(0, 0);
      return;
    }
    $("home").hidden = true; $("play").hidden = false; document.body.classList.add("playing");
    scene = scenes[name]; sceneName = name;
    view.W = 0; fit(true);
    scene.enter(opts || {});
    if (scene.resize) scene.resize(view.W, view.H);
  }

  /* ---------------------------------------------------------------- ゆび */
  function pt(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; }
  let down = false;
  cv.addEventListener("pointerdown", (e) => {
    MB.Sound.ensure();
    if (!scene) return;
    down = true;
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* なくても よい */ }
    scene.down && scene.down(pt(e));
    e.preventDefault();
  });
  cv.addEventListener("pointermove", (e) => { if (scene && scene.move) scene.move(pt(e), down); });
  const up = (e) => { if (!down) return; down = false; scene && scene.up && scene.up(pt(e)); };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);

  /* ---------------------------------------------------------------- ループ */
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (scene) {
      fit();
      scene.update && scene.update(dt);
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      g.clearRect(0, 0, view.W, view.H);
      scene.draw(g, view.W, view.H);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // テストで はやおくり するとき
  function tick(sec) { const n = Math.ceil(sec / 0.05); for (let i = 0; i < n; i++) scene && scene.update && scene.update(0.05); }

  /* ---------------------------------------------------------------- おしらせ */
  let toastT = 0;
  function toast(msg, ms) {
    const el = $("toast"); el.innerHTML = msg; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), ms || 2600);
  }
  function hideToast() { clearTimeout(toastT); $("toast").hidden = true; }
  let bubbleCb = null;
  function say(who, text, cb) {
    $("bubbleWho").textContent = who; $("bubbleText").innerHTML = text; $("bubble").hidden = false; bubbleCb = cb || null;
    MB.Sound.talk();
  }
  function hideBubble() { $("bubble").hidden = true; const cb = bubbleCb; bubbleCb = null; return cb; }
  $("bubble").addEventListener("click", () => { const cb = hideBubble(); cb && cb(); });
  function panel(html) { $("panel").innerHTML = html; return $("panel"); }

  /* ---------------------------------------------------------------- モーダル */
  let modalCb = null;
  function modal(html, wide, onClose) {
    $("sheet").className = "sheet" + (wide ? " wide" : "");
    $("sheet").innerHTML = html;
    $("modal").hidden = false; modalCb = onClose || null;
    $("sheet").scrollTop = 0;
    $("sheet").querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
    return $("sheet");
  }
  function closeModal() {
    $("modal").hidden = true; const cb = modalCb; modalCb = null; cb && cb();
  }
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });

  /* ---------------------------------------------------------------- きろく */
  function addFruit(id) {
    const first = !S.fruits[id];
    S.fruits[id] = (S.fruits[id] || 0) + 1; save();
    return first;
  }

  MB.App = {
    S, save, reset, TRIPS, AZ_NAME, view, go, register, tick, toast, hideToast, say, hideBubble, panel, modal, closeModal, addFruit,
    get scene() { return scene; }, get sceneName() { return sceneName; }, scenes, $,
  };
})();
