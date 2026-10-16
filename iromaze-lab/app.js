/* ============================================================
   いろまぜ ラボ — うごき
   ============================================================ */
(function () {
  "use strict";

  var IC = window.IroColor, PICS = window.Pictures.PICTURES;
  var PAINTS = IC.PAINTS, STAGES = IC.STAGES, COLORS = IC.COLORS;
  var MAX_DROPS = 12, ZUKAN_MAX = 12;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function sum(a) { return a.reduce(function (s, n) { return s + n; }, 0); }

  /* ---------- ほぞん ---------- */
  var SKEY = "iromaze-lab-v1";
  var save = { sound: true, stars: [], zukan: [], nurie: {} };
  try {
    var raw = localStorage.getItem(SKEY);
    if (raw) {
      var s = JSON.parse(raw);
      if (s && typeof s === "object") {
        if (typeof s.sound === "boolean") save.sound = s.sound;
        if (Array.isArray(s.stars)) save.stars = s.stars.map(function (n) { return Math.max(0, Math.min(3, n | 0)); });
        if (Array.isArray(s.zukan)) save.zukan = s.zukan.filter(function (z) { return z && /^#[0-9a-f]{6}$/i.test(z.hex); }).slice(0, ZUKAN_MAX);
        if (s.nurie && typeof s.nurie === "object") save.nurie = s.nurie;
      }
    }
  } catch (e) {}
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }
  function starsOf(i) { return save.stars[i] || 0; }

  /* ---------- おと（WebAudio の ごうせいおん だけ） ---------- */
  var actx = null;
  function ac() {
    if (!save.sound) return null;
    try {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        actx = new AC();
      }
      if (actx.state === "suspended") actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function tone(type, f0, f1, t0, dur, vol) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (t0 || 0);
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var SND = {
    poton: function () { tone("sine", 900, 260, 0, 0.16, 0.3); tone("sine", 520, 300, 0.07, 0.12, 0.15); },
    tap: function () { tone("triangle", 660, 0, 0, 0.06, 0.12); },
    swirl: function () {
      var c = ac(); if (!c) return;
      var len = Math.floor(c.sampleRate * 0.9), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
      src.buffer = buf; bp.type = "bandpass"; bp.Q.value = 6;
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.exponentialRampToValueAtTime(1400, t + 0.3);
      bp.frequency.exponentialRampToValueAtTime(500, t + 0.6);
      bp.frequency.exponentialRampToValueAtTime(1100, t + 0.85);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(t);
    },
    yay: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, 0, i * 0.11, 0.25, 0.25); }); },
    star: function (i) { tone("sine", 880 * Math.pow(1.26, i), 0, 0, 0.18, 0.2); },
    bubu: function () { tone("square", 150, 120, 0, 0.18, 0.12); tone("square", 150, 110, 0.24, 0.32, 0.12); }
  };
  function renderSoundBtn() {
    $("soundBtn").textContent = save.sound ? "🔊" : "🔇";
    $("soundBtn").setAttribute("aria-pressed", String(save.sound));
  }
  $("soundBtn").addEventListener("click", function () {
    save.sound = !save.sound; persist(); renderSoundBtn(); SND.tap();
  });

  var toastTimer = 0;
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  /* ---------- がめん きりかえ ---------- */
  var VIEWS = { menu: "vMenu", stages: "vStages", lab: "vLab", zukan: "vZukan", nurie: "vNurie", light: "vLight" };
  var cur = "menu", backTo = null;
  function show(name, title, back) {
    cur = name; backTo = back || null;
    Object.keys(VIEWS).forEach(function (k) { $(VIEWS[k]).hidden = k !== name; });
    $("title").textContent = title || "🎨 いろまぜ ラボ";
    $("backBtn").hidden = !backTo;
    var showStars = name === "stages" || (name === "lab" && lab.mode === "order");
    $("starsTotal").hidden = !showStars;
    $("starsTotal").textContent = "★ " + sum(save.stars) + " / " + STAGES.length * 3;
    if (name === "light") startLight(); else stopLight();
  }
  $("backBtn").addEventListener("click", function () {
    SND.tap();
    if (backTo) backTo();
  });

  function goMenu() { show("menu"); }
  document.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () {
      SND.tap();
      var g = b.getAttribute("data-go");
      if (g === "stages") goStages();
      else if (g === "free") goFree();
      else if (g === "zukan") goZukan(goMenu);
      else if (g === "nurie") goNurie();
      else if (g === "light") show("light", "🔦 ひかりの いろ", goMenu);
    });
  });

  /* ---------- ステージ えらび ---------- */
  function unlocked(i) { return i === 0 || starsOf(i - 1) > 0; }
  function starHtml(n) {
    var h = "";
    for (var i = 0; i < 3; i++) h += i < n ? "★" : '<span class="off">★</span>';
    return h;
  }
  function goStages() {
    var g = $("stageGrid"); g.innerHTML = "";
    var secs = { 0: "① 2しょく まぜ", 6: "② 3しょく まぜ", 9: "③ しろ・くろ で こさを かえる" };
    STAGES.forEach(function (st, i) {
      if (secs[i]) g.appendChild(el("div", "stage-sec", secs[i]));
      var open = unlocked(i), col = COLORS[st.color];
      var b = el("button", "stage" + (open ? "" : " lock"));
      b.type = "button"; b.disabled = !open;
      b.setAttribute("aria-label", (i + 1) + "ばん " + (open ? col.name : "まだ"));
      b.innerHTML = '<span class="no">' + (i + 1) + '</span><span class="an">' + (open ? st.animal : "🔒") + "</span>" +
        '<span class="sw" style="background:' + (open ? col.hex : "#eee") + '"></span><span class="st">' + starHtml(starsOf(i)) + "</span>";
      b.addEventListener("click", function () { SND.tap(); startStage(i); });
      g.appendChild(b);
    });
    show("stages", "🐰 おきゃくさん", goMenu);
  }

  /* ---------- ラボ（おさら） ---------- */
  var lab = { mode: "order", stage: 0, drops: [], pos: [], mixed: 0, paints: "rybwk", busy: false };

  function counts(n) {
    var c = [0, 0, 0, 0, 0];
    var list = n == null ? lab.drops : lab.drops.slice(0, n);
    list.forEach(function (i) { c[i]++; });
    return c;
  }
  function curRgb() { return IC.mix(counts()); }
  function isMixed() { return lab.drops.length > 0 && lab.mixed === lab.drops.length; }

  function buildTubes() {
    var box = $("tubes"); box.innerHTML = "";
    PAINTS.forEach(function (p, i) {
      var b = el("button", "tube"); b.type = "button"; b.dataset.i = i;
      b.setAttribute("aria-label", p.name);
      var dark = p.id === "w" ? "#d6d3d1" : p.hex;
      b.innerHTML =
        '<svg viewBox="0 0 44 78" aria-hidden="true">' +
          '<rect x="16" y="2" width="12" height="10" rx="3" fill="' + dark + '" stroke="#5b4636" stroke-width="2"/>' +
          '<path d="M12 14 H32 L38 66 H6 Z" fill="#f1f5f9" stroke="#5b4636" stroke-width="2.5" stroke-linejoin="round"/>' +
          '<path d="M10 30 H34 L36.5 54 H7.5 Z" fill="' + p.hex + '" stroke="#5b4636" stroke-width="1.5"/>' +
          '<rect x="4" y="64" width="36" height="10" rx="3" fill="#cbd5e1" stroke="#5b4636" stroke-width="2"/>' +
        "</svg>" +
        '<span class="nm">' + p.name + '</span><span class="cnt" hidden></span>';
      b.addEventListener("click", function () { addDrop(i, b); });
      box.appendChild(b);
    });
  }

  function renderTubes() {
    var c = counts();
    document.querySelectorAll(".tube").forEach(function (b) {
      var i = +b.dataset.i;
      b.disabled = lab.paints.indexOf(PAINTS[i].id) < 0;
      var cnt = b.querySelector(".cnt");
      cnt.hidden = !c[i]; cnt.textContent = c[i];
    });
  }

  function renderDots() {
    var d = $("dots"); d.innerHTML = "";
    lab.drops.forEach(function (i) {
      var s = el("span", "dot"); s.style.background = PAINTS[i].hex; d.appendChild(s);
    });
    $("dots").setAttribute("aria-label", lab.drops.length + "てき");
  }

  function renderPlate(animNewest) {
    var blobs = $("blobs");
    blobs.className = "blobs"; blobs.innerHTML = "";
    for (var k = lab.mixed; k < lab.drops.length; k++) {
      var b = el("span", "blob");
      b.style.left = lab.pos[k][0] + "%"; b.style.top = lab.pos[k][1] + "%";
      b.style.background = PAINTS[lab.drops[k]].hex;
      if (!(animNewest && k === lab.drops.length - 1)) b.style.animation = "none";
      blobs.appendChild(b);
    }
    var ml = $("mixLayer");
    var mixedRgb = lab.mixed > 0 ? IC.mix(counts(lab.mixed)) : null;
    if (mixedRgb) { ml.style.backgroundColor = IC.toHex(mixedRgb); ml.classList.add("on"); }
    else ml.classList.remove("on");
    $("plateMsg").hidden = lab.drops.length > 0;
    renderTubes(); renderDots(); renderNow();
    $("undoBtn").disabled = $("washBtn").disabled = lab.drops.length === 0 || lab.busy;
    $("mixBtn").disabled = lab.drops.length === 0 || lab.busy;
  }

  function renderNow() {
    if (lab.mode !== "free") return;
    var rgb = isMixed() ? curRgb() : null;
    var sw = $("nowSwatch");
    sw.classList.toggle("empty", !rgb);
    sw.style.background = rgb ? IC.toHex(rgb) : "";
    $("nowHex").textContent = !lab.drops.length ? "からっぽ" : rgb ? "できた いろ" : "まぜてね";
    $("saveBtn").disabled = !rgb;
  }

  function setHint(html) { $("hintText").innerHTML = html || ""; }
  function pc(p) {
    var fg = p.id === "w" || p.id === "y" ? ' style="background:' + p.hex + ';color:#4a2c1a;text-shadow:none;border:2px solid #e5d5c5"' : ' style="background:' + p.hex + '"';
    return '<span class="pc"' + fg + ">" + p.name + "</span>";
  }

  function randomPos() {
    var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 24;
    return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
  }

  function addDrop(i, btn) {
    if (lab.busy) return;
    if (lab.drops.length >= MAX_DROPS) {
      SND.bubu(); toast("おさらが いっぱい！ まぜるか あらってね");
      var pl = $("plate"); pl.classList.remove("wobble"); void pl.offsetWidth; pl.classList.add("wobble");
      return;
    }
    clearPulse();
    lab.drops.push(i); lab.pos.push(randomPos());
    flyDrop(PAINTS[i].hex, btn, lab.pos[lab.pos.length - 1]);
    SND.poton();
    renderPlate(true);
    setHint(lab.mode === "order" ? "" : "");
  }

  function flyDrop(color, btn, pos) {
    if (!btn) return;
    var a = btn.getBoundingClientRect(), p = $("plate").getBoundingClientRect();
    var d = el("div", "flydrop");
    d.style.background = color;
    d.style.left = (a.left + a.width / 2) + "px"; d.style.top = (a.top + 12) + "px";
    document.body.appendChild(d);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        d.style.left = (p.left + p.width * pos[0] / 100) + "px";
        d.style.top = (p.top + p.height * pos[1] / 100) + "px";
      });
    });
    setTimeout(function () { d.remove(); }, 400);
  }

  function undo() {
    if (lab.busy || !lab.drops.length) return;
    SND.tap();
    lab.drops.pop(); lab.pos.pop();
    if (lab.mixed > lab.drops.length) lab.mixed = lab.drops.length;
    clearPulse(); setHint("");
    renderPlate(false);
  }
  function wash() {
    if (lab.busy) return;
    if (lab.drops.length) tone("sine", 300, 900, 0, 0.3, 0.15);
    lab.drops = []; lab.pos = []; lab.mixed = 0;
    clearPulse(); setHint("");
    renderPlate(false);
  }

  function doMix() {
    return new Promise(function (resolve) {
      if (!lab.drops.length) { setHint("まずは えのぐを いれてね"); resolve(false); return; }
      if (isMixed()) { resolve(true); return; }
      lab.busy = true; renderPlate(false);
      SND.swirl();
      var blobs = $("blobs");
      blobs.classList.add("spin");
      setTimeout(function () {
        blobs.classList.add("gone");
        lab.mixed = lab.drops.length;
        var ml = $("mixLayer");
        ml.style.backgroundColor = IC.toHex(curRgb()); ml.classList.add("on");
      }, 450);
      setTimeout(function () {
        lab.busy = false;
        renderPlate(false);
        resolve(true);
      }, 950);
    });
  }

  /* おさらを ぐるぐる なぞっても まざる */
  (function swirlGesture() {
    var plate = $("plate"), last = null, acc = 0;
    function ang(e) {
      var r = plate.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    }
    plate.addEventListener("pointerdown", function (e) { last = ang(e); acc = 0; try { plate.setPointerCapture(e.pointerId); } catch (x) {} });
    plate.addEventListener("pointermove", function (e) {
      if (last == null) return;
      var a = ang(e), d = a - last;
      if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      acc += d; last = a;
      $("blobs").style.transform = lab.busy ? "" : "rotate(" + (acc * 180 / Math.PI * 0.6) + "deg)";
      if (Math.abs(acc) > Math.PI * 2 && !lab.busy && lab.drops.length && !isMixed()) {
        last = null; $("blobs").style.transform = "";
        doMix().then(afterMixHint);
      }
    });
    function end() { last = null; $("blobs").style.transform = ""; }
    plate.addEventListener("pointerup", end);
    plate.addEventListener("pointercancel", end);
  })();

  function afterMixHint() {
    if (lab.mode === "free" && isMixed()) {
      var near = nearestName(curRgb());
      setHint(near ? "「" + near + "」 みたいな いろ！" : "ふしぎな いろが できたね");
    }
  }

  var pulseEl = null;
  function clearPulse() { if (pulseEl) { pulseEl.classList.remove("pulse"); pulseEl = null; } }
  function pulseTube(i) {
    clearPulse();
    pulseEl = document.querySelector('.tube[data-i="' + i + '"]');
    if (pulseEl) { void pulseEl.offsetWidth; pulseEl.classList.add("pulse"); }
  }

  function hintHtml(target) {
    var h = IC.hint(counts(), target, lab.paints, MAX_DROPS);
    if (h.kind === "add") { pulseTube(h.index); return "もうすこし " + pc(h.paint) + " を たして みよう"; }
    if (h.kind === "start") { pulseTube(h.index); return "まずは " + pc(h.paint) + " から いれて みよう"; }
    if (h.kind === "remove") {
      var last = lab.drops[lab.drops.length - 1];
      return pc(h.paint) + " が すこし おおい みたい。" + (last === h.index ? "↩ で もどして みよう" : "🗑 あらって やりなおそう");
    }
    if (h.kind === "reset") return "🗑 あらって さいしょから やって みよう";
    return "";
  }

  $("undoBtn").addEventListener("click", undo);
  $("washBtn").addEventListener("click", wash);
  $("mixBtn").addEventListener("click", function () { doMix().then(afterMixHint); });

  /* ---------- おきゃくさん モード ---------- */
  function startStage(i) {
    var st = STAGES[i], col = COLORS[st.color];
    lab.mode = "order"; lab.stage = i; lab.paints = st.paints;
    $("order").hidden = false; $("freeTop").hidden = true; $("doneBtn").hidden = false;
    $("animal").textContent = st.animal; $("animal").className = "animal";
    $("orderText").textContent = st.who + "「この いろを つくって！」";
    $("sample").style.background = col.hex;
    $("sampleName").textContent = col.name;
    lab.drops = []; lab.pos = []; lab.mixed = 0; lab.busy = false;
    clearPulse();
    setHint(i === 0 ? "チューブを タップして えのぐを いれよう" : st.paints.length > 3 ? "しろ と くろ も つかえるよ" : "");
    show("lab", (i + 1) + ". " + st.who + "の おねがい", goStages);
    renderPlate(false);
  }

  function animalAnim(cls) {
    var a = $("animal"); a.className = "animal"; void a.offsetWidth; a.className = "animal " + cls;
  }

  $("doneBtn").addEventListener("click", function () {
    if (lab.busy) return;
    if (!lab.drops.length) { SND.bubu(); setHint(hintHtml(COLORS[STAGES[lab.stage].color].rgb)); return; }
    doMix().then(function () {
      var col = COLORS[STAGES[lab.stage].color];
      var dE = IC.deltaE(curRgb(), col.rgb), n = IC.stars(dE);
      if (n === 0) {
        SND.bubu(); animalAnim("sad");
        setHint("うーん、ちょっと ちがう みたい。<br>" + hintHtml(col.rgb));
        return;
      }
      if (n > starsOf(lab.stage)) { save.stars[lab.stage] = n; for (var k = 0; k < STAGES.length; k++) save.stars[k] = save.stars[k] || 0; persist(); }
      animalAnim("happy");
      showResult(col, n);
    });
  });

  function showResult(col, n) {
    var st = STAGES[lab.stage];
    $("resAnimal").textContent = st.animal;
    $("resSample").style.background = col.hex;
    $("resMine").style.background = IC.toHex(curRgb());
    var s = "";
    for (var i = 0; i < 3; i++) s += i < n ? '<span style="animation-delay:' + (i * 0.25) + 's">★</span>' : '<span class="off">★</span>';
    $("resStars").innerHTML = s;
    var msg = n === 3 ? "ぴったり！ ありがとう！" : n === 2 ? "とっても にてる！ ありがとう！" : "おしい！ だいたい おなじ いろ だね";
    if (n < 3) {
      var h = IC.hint(counts(), col.rgb, lab.paints, MAX_DROPS);
      if (h.kind === "add") msg += "<br><small>" + pc(h.paint) + " を たすと もっと ちかく なるよ</small>";
    }
    $("resText").innerHTML = msg;
    var last = lab.stage === STAGES.length - 1;
    $("resNext").textContent = last ? "🏁 おしまい" : "つぎへ ▶";
    $("result").hidden = false;
    SND.yay();
    for (var j = 0; j < n; j++) (function (j) { setTimeout(function () { SND.star(j); }, 450 + j * 250); })(j);
    $("starsTotal").textContent = "★ " + sum(save.stars) + " / " + STAGES.length * 3;
  }
  $("resRetry").addEventListener("click", function () { SND.tap(); $("result").hidden = true; });
  $("resNext").addEventListener("click", function () {
    SND.tap(); $("result").hidden = true;
    if (lab.stage < STAGES.length - 1) startStage(lab.stage + 1);
    else { goStages(); toast("ぜんぶの おきゃくさんに いろを とどけたよ！"); }
  });

  /* ---------- じゆう モード ---------- */
  function goFree() {
    lab.mode = "free"; lab.paints = "rybwk";
    $("order").hidden = true; $("freeTop").hidden = false; $("doneBtn").hidden = true;
    clearPulse();
    setHint("すきな えのぐを まぜて みよう");
    show("lab", "🧪 じゆうに まぜる", goMenu);
    renderPlate(false);
  }

  function nearestName(rgb) {
    var best = null, bd = 1e9;
    Object.keys(COLORS).forEach(function (k) {
      var d = IC.deltaE(rgb, COLORS[k].rgb);
      if (d < bd) { bd = d; best = COLORS[k].name; }
    });
    PAINTS.forEach(function (p, i) {
      var c = [0, 0, 0, 0, 0]; c[i] = 1;
      var d = IC.deltaE(rgb, IC.mix(c));
      if (d < bd) { bd = d; best = p.name; }
    });
    return bd < 15 ? best : null;
  }

  $("saveBtn").addEventListener("click", function () {
    if (!isMixed()) return;
    SND.tap();
    var rgb = curRgb(), full = save.zukan.length >= ZUKAN_MAX;
    $("nameSwatch").style.background = IC.toHex(rgb);
    $("nameInput").value = "";
    $("nameInput").placeholder = "いろ " + (save.zukan.length + 1);
    var ideas = [], near = nearestName(rgb);
    if (near) ideas.push(near);
    ideas.push("わたしの いろ", "ふしぎな いろ", "ゆうやけ いろ", "うみの いろ", "もりの いろ");
    var box = $("nameIdeas"); box.innerHTML = "";
    ideas.slice(0, 5).forEach(function (t) {
      var b = el("button", "", t); b.type = "button";
      b.addEventListener("click", function () { SND.tap(); $("nameInput").value = t; });
      box.appendChild(b);
    });
    $("nameFull").hidden = !full;
    $("nameOk").disabled = full;
    $("nameModal").hidden = false;
  });
  $("nameCancel").addEventListener("click", function () { SND.tap(); $("nameModal").hidden = true; });
  $("nameOk").addEventListener("click", function () {
    if (save.zukan.length >= ZUKAN_MAX) return;
    var name = $("nameInput").value.trim().slice(0, 10) || $("nameInput").placeholder;
    save.zukan.push({ name: name, hex: IC.toHex(curRgb()), recipe: counts() });
    persist();
    $("nameModal").hidden = true;
    SND.yay();
    toast("📖 「" + name + "」を ずかんに のこしたよ（" + save.zukan.length + "/" + ZUKAN_MAX + "）");
  });

  /* ---------- いろ ずかん ---------- */
  function goZukan(back) {
    renderZukan();
    show("zukan", "📖 いろ ずかん", back);
  }
  function renderZukan() {
    var g = $("zukanGrid"); g.innerHTML = "";
    $("zukanCount").textContent = save.zukan.length + " / " + ZUKAN_MAX;
    $("zukanEmpty").hidden = save.zukan.length > 0;
    save.zukan.forEach(function (z, idx) {
      var c = el("div", "zcard");
      var sw = el("span", "sample big"); sw.style.background = z.hex; c.appendChild(sw);
      c.appendChild(el("b", "", "")).textContent = z.name;
      var rc = el("div", "rc");
      (z.recipe || []).forEach(function (n, i) {
        for (var k = 0; k < n; k++) { var d = el("span", "dot"); d.style.background = PAINTS[i].hex; rc.appendChild(d); }
      });
      c.appendChild(rc);
      var del = el("button", "del", "✕"); del.type = "button"; del.setAttribute("aria-label", "けす");
      var armed = 0;
      del.addEventListener("click", function () {
        if (!armed) {
          armed = setTimeout(function () { armed = 0; del.textContent = "✕"; }, 2500);
          del.textContent = "けす？"; del.style.fontSize = "14px"; SND.tap(); return;
        }
        clearTimeout(armed);
        save.zukan.splice(idx, 1); persist(); SND.tap(); renderZukan();
      });
      c.appendChild(del);
      g.appendChild(c);
    });
  }

  /* ---------- ぬりえ ---------- */
  var SVGNS = "http://www.w3.org/2000/svg";
  var nurie = { pic: 0, color: null };
  function paletteColors() {
    var list = save.zukan.map(function (z) { return { hex: z.hex, name: z.name }; });
    PAINTS.forEach(function (p, i) {
      var c = [0, 0, 0, 0, 0]; c[i] = 1;
      list.push({ hex: IC.toHex(IC.mix(c)), name: p.name });
    });
    return list;
  }
  function goNurie() {
    var tabs = $("nurieTabs"); tabs.innerHTML = "";
    PICS.forEach(function (p, i) {
      var b = el("button", "", p.emoji + " " + p.name); b.type = "button";
      b.setAttribute("aria-pressed", String(i === nurie.pic));
      b.addEventListener("click", function () { SND.tap(); nurie.pic = i; goNurie(); });
      tabs.appendChild(b);
    });
    var cols = paletteColors();
    if (!nurie.color || !cols.some(function (c) { return c.hex === nurie.color; })) nurie.color = cols[0].hex;
    var pal = $("palette"); pal.innerHTML = "";
    cols.forEach(function (c) {
      var b = el("button", "pal"); b.type = "button";
      b.style.background = c.hex; b.setAttribute("aria-label", c.name);
      b.setAttribute("aria-pressed", String(c.hex === nurie.color));
      b.appendChild(el("span", "pn")).textContent = c.name;
      b.addEventListener("click", function () {
        SND.tap(); nurie.color = c.hex;
        pal.querySelectorAll(".pal").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
      pal.appendChild(b);
    });
    drawPicture();
    show("nurie", "🖍️ ぬりえ", goMenu);
    if (!save.zukan.length) toast("ずかんに いろを のこすと ここで つかえるよ");
  }
  function drawPicture() {
    var pic = PICS[nurie.pic], svg = $("nurieSvg");
    var fills = save.nurie[pic.key] || {};
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    pic.parts.forEach(function (p) {
      var n = document.createElementNS(SVGNS, p.tag);
      if (p.tag === "rect") { n.setAttribute("x", p.x); n.setAttribute("y", p.y); n.setAttribute("width", p.w); n.setAttribute("height", p.h); if (p.rx) n.setAttribute("rx", p.rx); }
      else if (p.tag === "circle") { n.setAttribute("cx", p.cx); n.setAttribute("cy", p.cy); n.setAttribute("r", p.r); }
      else if (p.tag === "ellipse") {
        n.setAttribute("cx", p.cx); n.setAttribute("cy", p.cy); n.setAttribute("rx", p.rx); n.setAttribute("ry", p.ry);
        if (p.rot) n.setAttribute("transform", "rotate(" + p.rot + " " + p.cx + " " + p.cy + ")");
      } else n.setAttribute("d", p.d);
      if (p.f) {
        n.setAttribute("class", "fill");
        n.setAttribute("fill", fills[p.id] || "#ffffff");
        n.addEventListener("click", function () {
          n.setAttribute("fill", nurie.color);
          save.nurie[pic.key] = save.nurie[pic.key] || {};
          save.nurie[pic.key][p.id] = nurie.color;
          persist(); SND.poton();
        });
      } else n.setAttribute("class", "line");
      svg.appendChild(n);
    });
  }
  $("nurieClear").addEventListener("click", function () {
    SND.tap();
    delete save.nurie[PICS[nurie.pic].key]; persist(); drawPicture();
  });

  /* ---------- ひかりの いろ（かほう こんしょく） ---------- */
  var LIGHTS = [
    { name: "あか",   rgb: "rgb(255,0,0)", x: 300, y: 165, on: true },
    { name: "みどり", rgb: "rgb(0,255,0)", x: 225, y: 295, on: true },
    { name: "あお",   rgb: "rgb(0,0,255)", x: 375, y: 295, on: true }
  ];
  var LR = 125, lightRaf = 0, drag = null;
  function drawLight() {
    var cv = $("lightCanvas"), g = cv.getContext("2d");
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#000"; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "lighter";
    LIGHTS.forEach(function (l) {
      if (!l.on) return;
      g.fillStyle = l.rgb;
      g.beginPath(); g.arc(l.x, l.y, LR, 0, Math.PI * 2); g.fill();
    });
    g.globalCompositeOperation = "source-over";
  }
  function buildLightBtns() {
    var box = $("lightBtns"); box.innerHTML = "";
    LIGHTS.forEach(function (l) {
      var b = el("button", "lbtn", "💡 " + l.name); b.type = "button";
      b.style.setProperty("--lc", l.rgb.replace("255,0,0", "239,68,68").replace("0,255,0", "34,197,94").replace("0,0,255", "59,130,246"));
      b.setAttribute("aria-pressed", String(l.on));
      b.addEventListener("click", function () {
        l.on = !l.on; b.setAttribute("aria-pressed", String(l.on));
        tone("sine", l.on ? 700 : 400, 0, 0, 0.12, 0.15); drawLight();
      });
      box.appendChild(b);
    });
  }
  function startLight() { buildLightBtns(); drawLight(); }
  function stopLight() { drag = null; if (lightRaf) cancelAnimationFrame(lightRaf); lightRaf = 0; }
  (function lightDrag() {
    var cv = $("lightCanvas");
    function pt(e) {
      var r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
    }
    cv.addEventListener("pointerdown", function (e) {
      var p = pt(e);
      for (var i = LIGHTS.length - 1; i >= 0; i--) {
        var l = LIGHTS[i];
        if (l.on && Math.hypot(p[0] - l.x, p[1] - l.y) < LR) { drag = { l: l, dx: l.x - p[0], dy: l.y - p[1] }; break; }
      }
      if (drag) try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    });
    cv.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var p = pt(e);
      drag.l.x = Math.max(0, Math.min(cv.width, p[0] + drag.dx));
      drag.l.y = Math.max(0, Math.min(cv.height, p[1] + drag.dy));
      if (!lightRaf) lightRaf = requestAnimationFrame(function () { lightRaf = 0; drawLight(); });
    });
    function end() { drag = null; }
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
  })();

  /* ---------- はじまり ---------- */
  renderSoundBtn();
  buildTubes();
  show("menu");

  // テスト・デバッグよう
  window.__iromaze = { lab: lab, save: save, startStage: startStage, goFree: goFree, goZukan: goZukan, goNurie: goNurie };
})();
