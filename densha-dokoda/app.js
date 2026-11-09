/* でんしゃ どこだ？ — がめん と そうさ */
(function () {
  "use strict";
  var S = window.DDScenes, ART = window.DDArt.ART, AU = window.DDAudio;
  var W = S.W, H = S.H, KEY = "densha-dokoda-v1", MAXZ = 3;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- ほぞん ---------- */
  function load() {
    var d = { found: {}, omake: {}, clears: {}, snd: true, voice: true };
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (v && typeof v === "object") {
        ["found", "omake", "clears"].forEach(function (k) { if (v[k] && typeof v[k] === "object") d[k] = v[k]; });
        d.snd = v.snd !== false; d.voice = v.voice !== false;
      }
    } catch (e) { /* */ }
    return d;
  }
  var save = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* */ } }
  AU.setOn(save.snd); AU.setVoice(save.voice);

  function thumb(art, pad) {
    var a = ART[art], p = pad == null ? 4 : pad;
    return '<svg viewBox="' + (-p) + " " + (-p) + " " + (a.w + p * 2) + " " + (a.h + p * 2) + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + a.d({}) + "</svg>";
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function rb(s) { return S.ruby(esc(s)); }

  /* ---------- がめん きりかえ ---------- */
  function show(id) { ["home", "play", "zukan"].forEach(function (k) { $(k).hidden = k !== id; }); }

  function syncToggles() {
    document.querySelectorAll(".tgl").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tgl === "snd" ? save.snd : save.voice)); });
  }
  document.querySelectorAll(".tgl").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.dataset.tgl === "snd") { save.snd = !save.snd; AU.setOn(save.snd); if (save.snd && town) AU.ambient(town.amb); if (save.snd) AU.found(); }
      else { save.voice = !save.voice; AU.setVoice(save.voice); if (save.voice) AU.say("こえ を だすよ"); }
      store(); syncToggles();
    });
  });

  function townProgress(t) { return t.targets.filter(function (x) { return save.found[x.kind]; }).length; }
  function renderHome() {
    $("towns").innerHTML = S.TOWNS.map(function (t, i) {
      var n = townProgress(t), c = save.clears[t.id] || 0;
      return '<button type="button" class="town" data-i="' + i + '" style="--tt:' + t.tint + '"><span class="em" aria-hidden="true">' + t.emoji + '</span><span><span class="nm">' + rb(t.name) + '</span><span class="pg">ずかん ' + n + "/5" + (c ? "　🏅×" + c : "") + "</span></span></button>";
    }).join("");
    var all = Object.keys(S.KINDS).length, got = Object.keys(S.KINDS).filter(function (k) { return save.found[k]; }).length;
    $("zukanCount").textContent = got + "/" + all;
  }
  $("towns").addEventListener("click", function (e) { var b = e.target.closest(".town"); if (b) { AU.unlock(); startTown(S.TOWNS[+b.dataset.i]); } });
  $("zukanBtn").addEventListener("click", function () { openZukan(); });

  /* ---------- あそぶ ---------- */
  var svg = $("scene"), world = $("world"), fx = $("fx"), stage = $("stage");
  var town = null, lay = null, foundSet = {}, omakeSet = {}, rings = {};
  var cw = 1, ch = 1, base = 1, sc = 1, vx = 0, vy = 0, anim = 0, celebrating = false, toastT = 0;

  function startTown(t) {
    town = t; lay = S.layout(t); foundSet = {}; omakeSet = {}; rings = {}; celebrating = false;
    cancelAnimationFrame(anim);
    document.documentElement.style.setProperty("--tint", t.tint);
    $("townName").innerHTML = t.emoji + " " + rb(t.name);
    $("result").hidden = true; $("toast").hidden = true;
    show("play");
    drawScene(); drawCards(); updateCount();
    measure(); sc = base; vx = 0; vy = (H - ch / sc) / 2; applyView();
    AU.ambient(save.snd ? t.amb : null);
    AU.say(S.plain(t.name) + "。 でんしゃ を さがそう！");
  }
  function leave() { cancelAnimationFrame(anim); AU.ambient(null); try { window.speechSynthesis.cancel(); } catch (e) { /* */ } town = null; document.documentElement.style.removeProperty("--tint"); }

  function g(art, sp, o, cls, id) {
    return "<g" + (cls ? ' class="' + cls + '"' : "") + (id ? ' data-id="' + id + '"' : "") + '><g class="mv"><g transform="' + S.transform(art, sp) + '">' + ART[art].d(o || {}) + "</g></g></g>";
  }
  function drawScene() {
    svg.style.background = town.night ? "#1b2448" : "#d0ebff";
    var s = town.bg();
    town.decor.forEach(function (d) { s += '<g transform="' + S.transform(d[0], [d[1], d[2], d[4]]) + '">' + ART[d[0]].d(d[3] || {}) + "</g>"; });
    lay.extras.forEach(function (x) { s += g(x.art, x.spot, {}, "ex", x.id); });
    lay.targets.forEach(function (x) { s += g(x.art, x.spot, {}, "tg", x.id); });
    world.innerHTML = s;
    fx.innerHTML = "";
  }
  function drawCards() {
    $("cards").innerHTML = lay.targets.map(function (x) {
      return '<button type="button" class="card sil" data-id="' + x.id + '" aria-label="' + esc(S.plain(x.kind.name)) + '">' + thumb(x.art) + '<span class="cn">' + rb(x.kind.name) + "</span></button>";
    }).join("");
  }
  function updateCount() {
    $("count").textContent = Object.keys(foundSet).length + "/5";
    var n = Object.keys(omakeSet).length;
    $("omakeBadge").hidden = !n;
    $("omakeBadge").textContent = "おまけ " + n + "/" + lay.extras.length;
  }

  /* ---------- みる ばしょ（パン・ズーム）---------- */
  function measure() {
    var r = stage.getBoundingClientRect();
    cw = Math.max(1, r.width); ch = Math.max(1, r.height);
    base = Math.max(cw / W, ch / H);
  }
  function clampView() {
    sc = Math.min(base * MAXZ, Math.max(base, sc));
    vx = Math.min(W - cw / sc, Math.max(0, vx));
    vy = Math.min(H - ch / sc, Math.max(0, vy));
  }
  function applyView() { clampView(); svg.setAttribute("viewBox", vx.toFixed(2) + " " + vy.toFixed(2) + " " + (cw / sc).toFixed(2) + " " + (ch / sc).toFixed(2)); }
  function toWorld(x, y) { var r = svg.getBoundingClientRect(); return { x: vx + (x - r.left) / sc, y: vy + (y - r.top) / sc }; }
  function zoomAt(f, clientX, clientY) {
    var p = toWorld(clientX, clientY), r = svg.getBoundingClientRect();
    sc = Math.min(base * MAXZ, Math.max(base, sc * f));
    vx = p.x - (clientX - r.left) / sc; vy = p.y - (clientY - r.top) / sc;
    applyView();
  }
  var panAnim = 0;
  function panTo(cx, cy, z) {
    cancelAnimationFrame(panAnim);
    var s0 = sc, x0 = vx + cw / sc / 2, y0 = vy + ch / sc / 2, s1 = z ? base * z : sc, t0 = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3);
      sc = s0 + (s1 - s0) * e; vx = x0 + (cx - x0) * e - cw / sc / 2; vy = y0 + (cy - y0) * e - ch / sc / 2;
      applyView();
      if (k < 1) panAnim = requestAnimationFrame(step);
    })(t0);
  }
  window.addEventListener("resize", function () { if (!town) return; var z = sc / base, cx = vx + cw / sc / 2, cy = vy + ch / sc / 2; measure(); sc = base * z; vx = cx - cw / sc / 2; vy = cy - ch / sc / 2; applyView(); });

  var pts = new Map(), gest = null;
  function two() { var v = Array.from(pts.values()); return { d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1, x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 }; }
  svg.addEventListener("pointerdown", function (e) {
    AU.unlock();
    try { svg.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cancelAnimationFrame(panAnim);
    if (pts.size === 1) gest = { type: "pan", sx: e.clientX, sy: e.clientY, vx: vx, vy: vy, t: Date.now(), moved: false };
    else if (pts.size === 2) { var m = two(); gest = { type: "pinch", d0: m.d, s0: sc, w: toWorld(m.x, m.y) }; }
    else gest = { type: "none" };
  });
  svg.addEventListener("pointermove", function (e) {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gest) return;
    if (gest.type === "pan") {
      var dx = e.clientX - gest.sx, dy = e.clientY - gest.sy;
      if (Math.abs(dx) + Math.abs(dy) > 10) gest.moved = true;
      if (gest.moved) { vx = gest.vx - dx / sc; vy = gest.vy - dy / sc; applyView(); }
    } else if (gest.type === "pinch" && pts.size === 2) {
      var m = two(), r = svg.getBoundingClientRect();
      sc = Math.min(base * MAXZ, Math.max(base, gest.s0 * m.d / gest.d0));
      vx = gest.w.x - (m.x - r.left) / sc; vy = gest.w.y - (m.y - r.top) / sc;
      applyView();
    }
  });
  function up(e) {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (gest && gest.type === "pan" && pts.size === 0 && !gest.moved && e.type === "pointerup" && Date.now() - gest.t < 800) tap(e.clientX, e.clientY);
    if (pts.size === 1) { var p = pts.values().next().value; gest = { type: "pan", sx: p.x, sy: p.y, vx: vx, vy: vy, t: 0, moved: true }; }
    else if (pts.size === 0) gest = null;
  }
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", up);
  svg.addEventListener("wheel", function (e) { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
  svg.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  function zoomBtn(f) { var r = svg.getBoundingClientRect(); cancelAnimationFrame(panAnim); zoomAt(f, r.left + r.width / 2, r.top + r.height / 2); }
  $("zIn").addEventListener("click", function () { zoomBtn(1.4); });
  $("zOut").addEventListener("click", function () { zoomBtn(1 / 1.4); });

  /* ---------- タップ ---------- */
  function center(it) { var b = S.bbox(it.art, it.spot); return { x: b.x + b.w / 2, y: b.y + b.h / 2, b: b }; }
  function tap(clientX, clientY) {
    if (!town || celebrating) return;
    var p = toWorld(clientX, clientY), best = null;
    lay.targets.concat(lay.extras).forEach(function (it) {
      var h = S.hitbox(it.art, it.spot);
      if (p.x < h.x || p.x > h.x + h.w || p.y < h.y || p.y > h.y + h.h) return;
      var c = center(it), done = it.kind ? foundSet[it.id] : omakeSet[it.id];
      var score = Math.hypot(p.x - c.x, p.y - c.y) + (done ? 10000 : 0);
      if (!best || score < best.score) best = { it: it, score: score };
    });
    if (!best) { ripple(p.x, p.y); AU.miss(); return; }
    var it = best.it;
    if (it.kind) foundTarget(it); else foundExtra(it);
  }
  function ripple(x, y) { addFx('<circle class="ripple" cx="' + x + '" cy="' + y + '" r="' + (30 / (sc / base)) + '"/>', 500); }
  function addFx(html, ms) {
    var tmp = document.createElementNS("http://www.w3.org/2000/svg", "g");
    tmp.innerHTML = html; fx.appendChild(tmp);
    if (ms) setTimeout(function () { tmp.remove(); }, ms);
    return tmp;
  }
  function sparkle(c) {
    var s = "", cols = ["#fcc419", "#ff6b6b", "#4dabf7", "#69db7c", "#fff"];
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * Math.PI * 2, r = 40 + (i % 3) * 18;
      s += '<path class="spark" style="--dx:' + (Math.cos(a) * r).toFixed(0) + "px;--dy:" + (Math.sin(a) * r).toFixed(0) + 'px" d="M' + c.x + " " + (c.y - 12) + " l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z\" fill=\"" + cols[i % 5] + '" stroke="#fff" stroke-width="1"/>';
    }
    addFx(s, 1000);
  }
  function ring(it) {
    if (rings[it.id]) { rings[it.id].remove(); }
    var b = S.bbox(it.art, it.spot);
    rings[it.id] = addFx('<rect class="ring" x="' + (b.x - 8) + '" y="' + (b.y - 8) + '" width="' + (b.w + 16) + '" height="' + (b.h + 16) + '" rx="16"/>');
  }
  function toast(html, ms) {
    var t = $("toast"); t.innerHTML = html; t.hidden = false; t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, ms || 3200);
  }
  function kindToast(k) {
    var tag = k.trick ? '<span class="tag">ひっかけ！</span>' : k.quiz ? '<span class="tag q">でんしゃ？</span>' : "";
    toast(tag + "<b>" + rb(k.name) + "</b><br>" + rb(k.say));
  }
  function foundTarget(it) {
    var k = it.kind, c = center(it);
    if (foundSet[it.id]) { kindToast(k); AU.say(S.plain(k.name)); ring(it); return; }
    foundSet[it.id] = 1;
    var first = !save.found[it.id];
    save.found[it.id] = 1; store();
    sparkle(c); ring(it); AU.found();
    if (k.whistle) AU.whistle(); else if (k.bell) AU.bell(); else if (k.horn) AU.horn();
    kindToast(k);
    AU.say(S.plain(k.name) + "！ " + S.plain(k.say) + (first ? "。 ずかん に のったよ" : ""));
    var card = document.querySelector('.card[data-id="' + it.id + '"]');
    if (card) { card.classList.remove("sil"); card.classList.add("ok", "just"); setTimeout(function () { card.classList.remove("just"); }, 600); }
    updateCount();
    if (Object.keys(foundSet).length === lay.targets.length) { celebrating = true; setTimeout(celebrate, 1500); }
  }
  function foundExtra(it) {
    var x = it.extra, c = center(it);
    sparkle(c); AU.funny();
    toast("🤣 <b>" + rb(x.name) + "</b><br>" + rb(x.say));
    AU.say(S.plain(x.name) + "！ " + S.plain(x.say));
    if (!omakeSet[it.id]) { omakeSet[it.id] = 1; save.omake[it.id] = 1; store(); ring(it); updateCount(); }
  }

  /* ---------- カード: タップ で なまえ、ながおし で ヒント ---------- */
  var press = null;
  var cardsEl = $("cards");
  cardsEl.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".card"); if (!b) return;
    AU.unlock();
    var id = b.dataset.id;
    b.classList.add("press");
    press = { id: id, b: b, long: false, t: setTimeout(function () { press.long = true; b.classList.remove("press"); hint(id); }, 550) };
  });
  function endPress(e, cancel) {
    if (!press) return;
    clearTimeout(press.t); press.b.classList.remove("press");
    var p = press; press = null;
    if (!cancel && !p.long) cardTap(p.id);
  }
  cardsEl.addEventListener("pointerup", function (e) { endPress(e, false); });
  cardsEl.addEventListener("pointercancel", function (e) { endPress(e, true); });
  cardsEl.addEventListener("pointerleave", function (e) { if (press && e.pointerType === "mouse") endPress(e, true); });
  cardsEl.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  cardsEl.addEventListener("click", function (e) { if (e.detail === 0) { var b = e.target.closest(".card"); if (b) cardTap(b.dataset.id); } }); // キーボード
  cardsEl.addEventListener("keydown", function (e) { if (e.key === "h" || e.key === "H") { var b = e.target.closest(".card"); if (b) hint(b.dataset.id); } });

  function byId(id) { return lay.targets.filter(function (t) { return t.id === id; })[0]; }
  function cardTap(id) {
    var it = byId(id); if (!it) return;
    if (foundSet[id]) { kindToast(it.kind); AU.say(S.plain(it.kind.name)); var c = center(it); panTo(c.x, c.y); ring(it); return; }
    toast("<b>" + rb(it.kind.name) + "</b> を さがそう！<br><small>わからない ときは カード を ながおし</small>", 2600);
    AU.say(S.plain(it.kind.name) + " を さがそう！");
  }
  function hint(id) {
    var it = byId(id); if (!it || !town) return;
    var c = center(it);
    if (foundSet[id]) { panTo(c.x, c.y); ring(it); return; }
    var a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 40, hx = c.x + Math.cos(a) * d, hy = c.y + Math.sin(a) * d;
    var r = Math.max(c.b.w, c.b.h) * 0.7 + 90;
    addFx('<circle class="hint pulse" cx="' + hx.toFixed(0) + '" cy="' + hy.toFixed(0) + '" r="' + r.toFixed(0) + '" fill="url(#hintGrad)"/>', 3000);
    panTo(hx, hy);
    AU.say("この へん かな？");
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) { /* */ }
  }

  /* ---------- ぜんぶ みつけた: でんしゃ が いっせい に はしりだす ---------- */
  function celebrate() {
    if (!town) return;
    save.clears[town.id] = (save.clears[town.id] || 0) + 1; store();
    toast("🎉 <b>ぜんぶ みつけた！</b><br>みんな はしりだすよ！", 4000);
    AU.fanfare(); AU.crossing(6);
    if (lay.targets.some(function (t) { return t.kind.whistle; })) AU.whistle();
    AU.say("ぜんぶ みつけた！ すごい！");
    panTo(W / 2, H / 2, 1);
    var movers = Array.prototype.map.call(world.querySelectorAll(".tg"), function (el) {
      var it = byId(el.dataset.id), a = ART[it.art];
      return { el: el.querySelector(".mv"), it: it, w: a.w, h: a.h, dir: it.spot[2] ? -1 : 1, sp: 180 + Math.random() * 120 };
    });
    var t0 = performance.now();
    Object.keys(rings).forEach(function (k) { rings[k].remove(); });
    rings = {};
    (function step(now) {
      var t = (now - t0) / 1000;
      movers.forEach(function (m) {
        var k = m.it.kind, tr = "";
        if (k.move === "x") {
          var span = W + m.w, x0 = m.it.spot[0], nx = ((x0 + m.w + m.dir * m.sp * t) % span + span) % span - m.w;
          tr = "translate(" + (nx - x0).toFixed(1) + ",0)";
        } else if (k.move === "swing") {
          var d = k.dir, len = Math.hypot(d[0], d[1]), amp = 60 * Math.sin(t * 2.2);
          tr = "translate(" + (d[0] / len * amp).toFixed(1) + "," + (d[1] / len * amp).toFixed(1) + ")";
        } else if (k.move === "spin") {
          var c = center(m.it); tr = "rotate(" + (5 * Math.sin(t * 3)).toFixed(2) + "," + c.x + "," + c.y + ")";
        } else {
          tr = "translate(0," + (-Math.abs(Math.sin(t * 5)) * 14).toFixed(1) + ")";
        }
        m.el.setAttribute("transform", tr);
      });
      if (t < 5 && town) anim = requestAnimationFrame(step);
      else if (town) showResult();
    })(t0);
  }
  function showResult() {
    var got = Object.keys(omakeSet).length, n = lay.extras.length;
    $("resOmake").innerHTML = rb(town.name) + " の でんしゃ を ぜんぶ みつけた！<br>" + (got === n ? "おまけ も ぜんぶ みつけた！ 🤣" : "おまけ（へんな もの）は " + got + "/" + n + "。まだ かくれて いるよ");
    $("result").hidden = false;
    celebrating = false;
  }
  $("againBtn").addEventListener("click", function () { startTown(town); });
  $("otherBtn").addEventListener("click", function () { leave(); renderHome(); show("home"); });
  $("resZukanBtn").addEventListener("click", function () { leave(); openZukan(); });
  $("backBtn").addEventListener("click", function () { leave(); renderHome(); show("home"); });

  /* ---------- ずかん ---------- */
  function openZukan() {
    var all = Object.keys(S.KINDS), got = all.filter(function (k) { return save.found[k]; }).length;
    $("zCount").textContent = got + "/" + all.length;
    var h = S.TOWNS.map(function (t) {
      return '<div class="zsec"><h3>' + t.emoji + " " + rb(t.name) + '</h3><div class="zgrid">' + t.targets.map(function (x) {
        var k = S.KINDS[x.kind], ok = save.found[x.kind];
        var tag = k.trick ? '<span class="tag">ひっかけ</span>' : k.quiz ? '<span class="tag q">でんしゃ？</span>' : "";
        return '<div class="zitem' + (ok ? "" : " sil") + '">' + thumb(x.kind) + '<div><div class="zn">' + (ok ? rb(k.name) + tag : "？？？") + '</div><div class="zd">' + (ok ? rb(k.desc) : "まだ みつけて いないよ") + "</div></div></div>";
      }).join("") + "</div></div>";
    }).join("");
    var ex = Object.keys(S.EXTRAS);
    h += '<div class="zsec"><h3>🤣 おまけ（へんな もの）' + ex.filter(function (k) { return save.omake[k]; }).length + "/" + ex.length + '</h3><div class="zgrid">' + ex.map(function (k) {
      var x = S.EXTRAS[k], ok = save.omake[k];
      return '<div class="zitem' + (ok ? "" : " sil") + '">' + thumb(k) + '<div><div class="zn">' + (ok ? rb(x.name) : "？？？") + '</div><div class="zd">' + (ok ? rb(x.say) : "どこ か の まち に いるよ") + "</div></div></div>";
    }).join("") + "</div></div>";
    $("zlist").innerHTML = h;
    show("zukan");
    $("zlist").scrollTop = 0;
  }
  $("zBack").addEventListener("click", function () { renderHome(); show("home"); });

  /* ---------- デバッグ フック（check.js から つかう）---------- */
  window.DDTest = {
    town: function () { return town && town.id; },
    ids: function () { return lay ? lay.targets.map(function (t) { return t.id; }) : []; },
    extras: function () { return lay ? lay.extras.map(function (t) { return t.id; }) : []; },
    found: function () { return Object.keys(foundSet).length; },
    zoom: function () { return sc / base; },
    view: function () { return { vx: vx, vy: vy, sc: sc, base: base, cw: cw, ch: ch }; },
    // その もの が まんなか に くる よう に うごかして、がめん の ざひょう を かえす
    focus: function (id) {
      var it = lay.targets.concat(lay.extras).filter(function (t) { return t.id === id; })[0]; if (!it) return null;
      cancelAnimationFrame(panAnim);
      var c = center(it); vx = c.x - cw / sc / 2; vy = c.y - ch / sc / 2; applyView();
      var r = svg.getBoundingClientRect();
      return { x: r.left + (c.x - vx) * sc, y: r.top + (c.y - vy) * sc };
    },
    toClient: function (x, y) { var r = svg.getBoundingClientRect(); return { x: r.left + (x - vx) * sc, y: r.top + (y - vy) * sc }; }
  };

  syncToggles(); renderHome(); show("home");
})();
