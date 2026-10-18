/* ============================================================
   かっしゃ ラボ — がめんの うごき
   たいけん（ドラッグで ひく）・くみたて パズル・もんだい モード
   ============================================================ */
(function () {
  "use strict";
  var S = window.KasshaSolver, Dr = window.KasshaDraw, L = window.KasshaLevels, A = window.KasshaAudio;
  var PROB = window.KasshaProblems.PROBLEMS, TK = L.TAIKEN, PZ = L.PZ, STAGES = L.STAGES;
  function $(id) { return document.getElementById(id); }

  // ---------- ほぞん ----------
  var KEY = "kassha-lab-v1", save = {};
  try { save = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { save = {}; }
  if (typeof save !== "object" || !save) save = {};
  save.tk = save.tk || {}; save.tk.done = save.tk.done || {};
  save.pz = save.pz || {}; save.pz.stars = save.pz.stars || [];
  save.mq = save.mq || {}; save.mq.stars = save.mq.stars || [];
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ } }

  // ---------- こまかい どうぐ ----------
  function rb(s) { return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>"); }
  function fmt(v) {
    var r2 = Math.round(v * 100) / 100;
    if (Math.abs(v - r2) < 1e-6) return String(r2);
    return "やく" + (Math.round(v * 10) / 10);
  }
  function svgPt(svg, e) {
    var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    var m = svg.getScreenCTM();
    return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }
  function say(el, html, cls) {
    el.innerHTML = html;
    el.className = "say" + (cls ? " " + cls : "");
    void el.offsetWidth; el.classList.add("pop");
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function starStr(n) { return n ? "★★★".slice(0, n) + "☆☆☆".slice(0, 3 - n) : ""; }

  // ---------- おと ----------
  var soundBtn = $("soundBtn");
  A.on = save.sound !== false;
  function soundIcon() { soundBtn.textContent = A.on ? "🔊" : "🔇"; }
  soundIcon();
  soundBtn.addEventListener("click", function () { A.on = !A.on; save.sound = A.on; store(); soundIcon(); if (A.on) A.pop(); });
  document.addEventListener("pointerdown", function () { A.unlock(); }, { once: true });

  // ---------- タブ ----------
  var tabs = document.querySelectorAll(".tab"), panels = { taiken: $("pTaiken"), puzzle: $("pPuzzle"), mondai: $("pMondai") };
  function showTab(name) {
    if (!panels[name]) name = "taiken";
    tabs.forEach(function (t) { t.setAttribute("aria-selected", t.dataset.tab === name ? "true" : "false"); });
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== name; });
    save.tab = name; store();
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { showTab(t.dataset.tab); }); });

  // =========================================================
  //  たいけん
  // =========================================================
  var tk = { i: 0, W: save.tk.W || 20, pull: 0, sys: null, res: null, drag: null, arrived: false, snd: 0, anim: 0 };
  var tkSvg = $("tkSvg"), PX = TK.pxPerCm, PMAX = TK.pullMax, FLOOR = 490;

  function tkUnlocked(i) { return i === 0 || !!save.tk.done[TK.list[i - 1].id]; }

  function tkChips() {
    $("tkChips").innerHTML = TK.list.map(function (t, i) {
      var on = tkUnlocked(i);
      return '<button type="button" class="chip' + (save.tk.done[t.id] ? " done" : "") + '" data-i="' + i + '" aria-pressed="' + (i === tk.i) + '"' +
        (on ? "" : " disabled") + '><span class="ce">' + (on ? t.emoji : "🔒") + "</span>" + rb(t.name) + "</button>";
    }).join("");
  }
  $("tkChips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (b && !b.disabled) tkSelect(+b.dataset.i);
  });

  function tkWeights() {
    $("tkW").innerHTML = TK.weights.map(function (w) {
      return '<button type="button" data-w="' + w + '" aria-pressed="' + (w === tk.W) + '">' + w + "g</button>";
    }).join("");
  }
  $("tkW").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-w]");
    if (!b) return;
    tk.W = +b.dataset.w; save.tk.W = tk.W; store();
    tkWeights(); A.pop(); tkSelect(tk.i, true);
  });

  function tkSystem(i, W) {
    var sys = clone(TK.list[i].sys);
    sys.bodies.w.m = W; sys.bodies.w.lab = W + "g";
    return sys;
  }

  function tkSelect(i, keepSay) {
    cancelAnimationFrame(tk.anim);
    tk.i = i; tk.pull = 0; tk.arrived = false; tk.snd = 0;
    tk.sys = tkSystem(i, tk.W);
    tk.res = S.solve(tk.sys);
    save.tk.cur = i; store();
    tkChips();
    var t = TK.list[i];
    $("tkTip").innerHTML = "✊ を <b>" + (tk.res.handDir === "down" ? "した" : "うえ") + "</b>に ドラッグ して ひもを ひこう";
    if (!keepSay) say($("tkSay"), "<b>" + rb(t.name) + "</b>：" + tk.W + "g の おもりを " + PMAX + "cm ひいて、うえまで あげて みよう。");
    $("tkNext").hidden = true;
    tkRender();
  }

  function rulerV(x, yBase, dir, lenCm, valCm, cls, label) {
    // dir: -1 = うえに のびる、1 = した
    var s = '<g class="ruler">', len = lenCm * PX;
    var y0 = yBase, y1 = yBase + dir * len;
    s += '<rect x="' + x + '" y="' + Math.min(y0, y1) + '" width="16" height="' + len + '" class="rbg"/>';
    if (valCm > 0) s += '<rect x="' + x + '" y="' + Math.min(y0, y0 + dir * valCm * PX) + '" width="16" height="' + (valCm * PX) + '" class="' + cls + '"/>';
    for (var c = 0; c <= lenCm; c += 2) {
      var y = y0 + dir * c * PX, big = c % 10 === 0;
      s += '<line x1="' + x + '" y1="' + y + '" x2="' + (x + (big ? 10 : 5)) + '" y2="' + y + '" class="rl"/>';
      if (big && c) s += '<text x="' + (x + 18) + '" y="' + (y + 4) + '" class="rt">' + c + "</text>";
    }
    if (label) s += '<text x="' + (x + 8) + '" y="' + (dir < 0 ? y1 - 6 : y1 + 14) + '" class="rt" text-anchor="middle">' + label + "</text>";
    return s + "</g>";
  }

  function tkRender() {
    var sys = tk.sys, res = tk.res, pxPull = tk.pull * PX;
    var q = res.k.map(function (k) { return k * pxPull; });
    var kw = S.liftOf(res, "w"), lift = tk.pull * kw, F = tk.pull > 0.05 ? res.hand : 0;
    var w = sys.bodies.w, wl = w.x - (w.w || 50) / 2;
    // ものさし: おもりの よこ（あがった たかさ）、て の よこ（ひいた ながさ）
    var maxLift = PMAX * kw;
    var over = rulerV(wl - 24, FLOOR, -1, Math.ceil(maxLift / 2) * 2 + 2, lift, "band-l", "cm");
    var G0 = Dr.geo(sys, { D: res.D, q: [] }), hr = sys.ropes.filter(function (r) { return r.id === res.handRope; })[0];
    var hp = Dr.ropePoints(sys, G0, hr.pts).filter(function (p) { return p.kind === "hand"; })[0];
    var dir = res.handDir === "down" ? 1 : -1;
    over += rulerV(hp.x + 30, hp.y, dir, PMAX, tk.pull, "band-p", "cm");
    // ゴール（ここまで あがる）
    var gy = FLOOR - maxLift * PX;
    var under = '<line x1="' + (wl - 30) + '" y1="' + gy + '" x2="' + (wl + (w.w || 50) + 16) + '" y2="' + gy + '" class="goal"/>' +
      '<text x="' + (wl + (w.w || 50) + 18) + '" y="' + (gy + 5) + '" class="goal-t">🏁</text>';
    tkSvg.innerHTML = Dr.render(sys, { q: q, D: res.D, labels: true, spring: { value: F, max: 60 }, over: over, under: under });
    $("tkF").textContent = fmt(F);
    $("tkL").textContent = String(Math.round(tk.pull * 10) / 10);
    $("tkH").textContent = String(Math.round(lift * 10) / 10);
  }

  function tkSetPull(p) {
    p = Math.max(0, Math.min(PMAX, p));
    var d = p - tk.pull;
    if (!d) return;
    tk.pull = p;
    // おと: 1cm ごとに カラカラ、4cm ごとに ギィ
    var steps = Math.floor(p) - Math.floor(p - d);
    if (Math.abs(p - tk.snd) >= 1) { A.click(1800 + (tk.i * 180)); tk.snd = p; }
    if (Math.floor(p / 4) !== Math.floor((p - d) / 4) && d > 0) A.creak(tk.res.hand);
    void steps;
    tkRender();
    if (p >= PMAX - 1e-9 && !tk.arrived) tkArrive();
  }

  function tkArrive() {
    tk.arrived = true;
    A.chime();
    var t = TK.list[tk.i];
    var first = !save.tk.done[t.id];
    save.tk.done[t.id] = { W: tk.W }; store();
    var kw = S.liftOf(tk.res, "w");
    say($("tkSay"), "🔔 とうちゃく！ " + rb(t.say) +
      "<br>ちから <b>" + fmt(tk.res.hand) + "g</b> × ひいた ながさ <b>" + PMAX + "cm</b>、おもりは <b>" + fmt(PMAX * kw) + "cm</b> あがった。", "good");
    $("tkNext").hidden = tk.i >= TK.list.length - 1;
    tkChips();
    if (first || tk.i === TK.list.length - 1) tkSummary();
  }

  function tkSummary() {
    var all = TK.list.every(function (t) { return save.tk.done[t.id]; });
    var box = $("tkSum");
    if (!all) { box.hidden = true; return; }
    var H = 6, W = tk.W;
    var rows = TK.list.map(function (t, i) {
      var sys = tkSystem(i, W), res = S.solve(sys), kw = S.liftOf(res, "w"), Lc = H / kw;
      return "<tr><td>" + t.emoji + " " + rb(t.name) + "</td><td>" + fmt(res.hand) + "g</td><td>" + fmt(Lc) + "cm</td><td><b>" + fmt(res.hand * Lc) + "</b></td></tr>";
    }).join("");
    box.innerHTML = "<h3>📝 まとめ：" + W + "g を " + H + "cm あげる とき</h3>" +
      "<table><tr><th>しくみ</th><th>ちから</th><th>ひく ながさ</th><th>ちから×ながさ</th></tr>" + rows + "</table>" +
      '<p class="eq">ちからが かるく なると、ひく ながさは ながく なる。<br>ちから × ひく ながさ ＝ ' + W + " × " + H + " ＝ " + W * H +
      " で、どれも おなじ！<br>これを 「しごとの げんり」と いうよ。" + rb("（{仕事|しごと}の {原理|げんり}）") + "</p>";
    box.hidden = false;
  }

  tkSvg.addEventListener("pointerdown", function (e) {
    if (e.button && e.button !== 0) return;
    cancelAnimationFrame(tk.anim);
    tk.drag = { id: e.pointerId, y: svgPt(tkSvg, e).y, p: tk.pull };
    try { tkSvg.setPointerCapture(e.pointerId); } catch (er) { /* なくても よい */ }
    e.preventDefault();
  });
  tkSvg.addEventListener("pointermove", function (e) {
    if (!tk.drag || e.pointerId !== tk.drag.id) return;
    var y = svgPt(tkSvg, e).y, dir = tk.res.handDir === "down" ? 1 : -1;
    tkSetPull(tk.drag.p + (y - tk.drag.y) * dir / PX);
    e.preventDefault();
  });
  function tkUp(e) { if (tk.drag && e.pointerId === tk.drag.id) tk.drag = null; }
  tkSvg.addEventListener("pointerup", tkUp);
  tkSvg.addEventListener("pointercancel", tkUp);

  $("tkReset").addEventListener("click", function () {
    cancelAnimationFrame(tk.anim);
    var from = tk.pull, t0 = performance.now();
    tk.arrived = false;
    (function step(now) {
      var f = Math.min(1, (now - t0) / 600);
      tk.pull = from * (1 - f);
      if (Math.abs(tk.pull - tk.snd) >= 2) { A.click(2600); tk.snd = tk.pull; }
      tkRender();
      if (f < 1) tk.anim = requestAnimationFrame(step);
    })(t0);
  });
  $("tkNext").addEventListener("click", function () { if (tk.i < TK.list.length - 1) { A.pop(); tkSelect(tk.i + 1); } });

  // =========================================================
  //  くみたて パズル
  // =========================================================
  var pz = { i: 0, st: null, tool: null, anim: 0, busy: false, view: null, hist: [] };
  var pzSvg = $("pzSvg");

  function pzUnlocked(i) { return i === 0 || !!save.pz.stars[i - 1]; }
  function pzList() {
    $("pzList").innerHTML = STAGES.map(function (st, i) {
      return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === pz.i) + '"' + (pzUnlocked(i) ? "" : " disabled") + ">" +
        (pzUnlocked(i) ? i + 1 : "🔒") + '<span class="st">' + starStr(save.pz.stars[i] || 0) + "</span></button>";
    }).join("");
  }
  $("pzList").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]");
    if (b && !b.disabled && !pz.busy) { A.pop(); pzLoad(+b.dataset.i); }
  });

  function pzLoad(i) {
    pz.i = i; pz.st = { fixed: [], move: [], ropes: [], cur: [] }; pz.tool = null; pz.view = null; pz.hist = [];
    save.pz.cur = i; store();
    var st = STAGES[i];
    $("pzMission").innerHTML = "<h3>ステージ " + (i + 1) + "：" + rb(st.name) + "</h3><p>" + rb(st.say) + "</p><ul>" +
      "<li>🎯 " + st.item + " " + st.what + "（" + st.W + "）を たなへ</li>" +
      "<li>💪 ちから " + st.Fmax + " まで</li>" +
      "<li>📏 ひけるのは " + st.reach + "cm まで</li>" +
      (st.down ? "<li>⬇️ したに ひく</li>" : "") + "</ul>";
    $("pzHint").innerHTML = rb(st.hint);
    document.querySelector("details.hint").open = false;
    $("pzNext").hidden = true;
    say($("pzSay"), "どうぐばこ から {滑車|かっしゃ} を えらんで ばん に おき、ひも で つなごう。".replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>"));
    pzList(); pzTools(); pzRender();
  }

  function left() {
    var st = STAGES[pz.i], s = pz.st;
    return { f: st.tb.f - s.fixed.length, m: st.tb.m - s.move.length, r: st.tb.r - s.ropes.length - (s.cur.length ? 1 : 0) };
  }
  function handUsed() { return pz.st.ropes.some(function (r) { return r.some(function (p) { return p.b === "h"; }); }); }

  function pzTools() {
    var n = left(), st = STAGES[pz.i];
    $("cntF").textContent = "のこり " + n.f;
    $("cntM").textContent = "のこり " + n.m;
    $("cntR").textContent = "のこり " + n.r;
    document.querySelectorAll(".tool[data-tool]").forEach(function (b) {
      var t = b.dataset.tool, max = t === "fixed" ? st.tb.f : t === "move" ? st.tb.m : st.tb.r;
      b.hidden = max === 0;
      b.setAttribute("aria-pressed", pz.tool === t ? "true" : "false");
      b.disabled = pz.busy;
    });
    $("pzHand").disabled = pz.busy || !(pz.tool === "rope" && pz.st.cur.length) || handUsed();
    $("pzGo").disabled = pz.busy; $("pzUndo").disabled = pz.busy; $("pzClear").disabled = pz.busy;
  }

  function hookPos(k) { var s = PZ.slots[k]; return { x: s.x, y: s.y + (s.hookAt === "top" ? -30 : 30) }; }
  function yOf(p) {
    if (p.b === "c") return PZ.ceilY;
    if (p.b === "w") return PZ.weightY;
    if (p.b[0] === "f") return PZ.railY;
    var k = +p.b.slice(1);
    return p.hook ? hookPos(k).y : PZ.slots[k].y;
  }
  function samePt(a, b) { return a.b === b.b && !!a.hook === !!b.hook; }
  function wheelUsed(id) {
    return pz.st.ropes.concat([pz.st.cur]).some(function (r) { return r.some(function (p) { return p.b === id && !p.hook; }); });
  }
  function tieUsed(p) {
    if (p.b === "c") return false;
    return pz.st.ropes.concat([pz.st.cur]).some(function (r) { return r.some(function (q) { return samePt(p, q); }); });
  }

  function pzRender(q, extra) {
    var st = STAGES[pz.i], s = pz.st;
    var ropes = s.ropes.slice();
    if (s.cur.length) ropes.push(s.cur);
    var sys = L.puzzleSys(st, { fixed: s.fixed, move: s.move, ropes: ropes });
    if (s.cur.length) sys.ropes[sys.ropes.length - 1].cls = "cur";
    if (extra && extra.handLab && sys.bodies.h) sys.bodies.h.lab = extra.handLab;
    var under = "", over = "";
    // たな（ここまで あげる）
    var gy = PZ.floor - st.rise * PZ.pxPerCm;
    under += '<rect x="0" y="' + gy + '" width="' + (PZ.weightX - 36) + '" height="10" class="shelf"/>' +
      '<text x="6" y="' + (gy - 6) + '" class="shelf-t">たな ' + st.rise + "cm</text>" +
      '<line x1="' + (PZ.weightX - 36) + '" y1="' + gy + '" x2="' + (PZ.weightX + 44) + '" y2="' + gy + '" class="goal"/>';
    // レール と スロット
    under += '<line x1="' + PZ.railMin + '" y1="' + PZ.railY + '" x2="' + PZ.railMax + '" y2="' + PZ.railY + '" class="rail' + (pz.tool === "fixed" ? " on" : "") + '"/>';
    if (st.tb.m) PZ.slots.forEach(function (sl, k) {
      if (s.move.indexOf(k) < 0 && k < Math.max(st.tb.m, 1)) under += '<circle cx="' + sl.x + '" cy="' + sl.y + '" r="22" class="slot' + (pz.tool === "move" ? " on" : "") + '"/>';
    });
    if (pz.tool === "rope" && !pz.busy) {
      under += '<rect x="0" y="0" width="' + PZ.w + '" height="' + (PZ.ceilY + 4) + '" class="ceiltap"/>';
      s.move.forEach(function (k) {
        var hp = hookPos(k), p = { b: "m" + k, hook: 1 };
        if (!tieUsed(p)) over += '<circle cx="' + hp.x + '" cy="' + hp.y + '" r="12" class="hooktap"/>';
      });
      if (s.move.indexOf(0) < 0 && !tieUsed({ b: "w" })) over += '<circle cx="' + PZ.weightX + '" cy="' + PZ.weightY + '" r="12" class="hooktap"/>';
    }
    if (s.cur.length && !pz.busy) {
      // いま ひもを もって いる ところ
      var G = Dr.geo(sys, {}), P = Dr.ropePoints(sys, G, s.cur), last = P[P.length - 1];
      var lx = last.kind === "wrap" ? last.cx : last.x, ly = last.kind === "wrap" ? last.cy : last.y;
      over += '<circle cx="' + lx + '" cy="' + ly + '" r="' + (last.kind === "wrap" ? 30 : 14) + '" class="hooktap flash"/>';
    }
    var D = S.dofs(sys), qq = [];
    if (q) D.list.forEach(function (d, j) { qq[j] = q(d); });
    pzSvg.innerHTML = Dr.render(sys, { D: D, q: qq, labels: true, hooks: true, under: under, over: over,
      spring: extra && extra.spring });
  }

  function msg(html, cls) { say($("pzSay"), rb(html), cls); }

  function addPoint(p) {
    var s = pz.st, cur = s.cur;
    if (!cur.length) {
      if (!p.hook && p.b !== "c" && p.b !== "w") { A.ng(); msg("ひもの はしは てんじょう・フック・おもり に むすぼう"); return; }
      if (left().r <= 0) { A.ng(); msg("ひもは もう ないよ"); return; }
      if (tieUsed(p)) { A.ng(); msg("そこには もう ひもが むすんで あるよ"); return; }
      cur.push(p); A.pop();
      msg(p.b === "c" ? "てんじょうに むすんだ。つぎは {滑車|かっしゃ}を タップ" : "むすんだ。つぎは {滑車|かっしゃ}を タップ");
      pzTools(); pzRender(); return;
    }
    var last = cur[cur.length - 1];
    if (samePt(last, p)) return;
    if (last.b === p.b) { A.ng(); msg("おなじ {滑車|かっしゃ}の フックと くるまは つなげないよ"); return; }
    var yl = yOf(last), yp = yOf(p);
    if (Math.abs(yl - yp) < 1) { A.ng(); msg("よこに ならんだ ものどうしは つなげないよ"); return; }
    var isWrap = p.b !== "c" && p.b !== "w" && !p.hook;
    var lastWrap = last.b !== "c" && last.b !== "w" && !last.hook;
    if (lastWrap && cur.length >= 2) {
      var yp2 = yOf(cur[cur.length - 2]);
      if ((yp2 < yl) !== (yp < yl)) { A.ng(); msg("ひもは {滑車|かっしゃ}の うえ か したを くるっと まわして かけよう"); return; }
    }
    if (isWrap) {
      if (wheelUsed(p.b)) { A.ng(); msg("その {滑車|かっしゃ}には もう ひもが かかって いるよ"); return; }
      if (p.b[0] === "f" && yl < yp && (last.b === "c")) { A.ng(); msg("てんじょうから すぐ {定滑車|ていかっしゃ}には かけられないよ"); return; }
      cur.push(p); A.click(2200);
      msg("かけた！ つぎの {滑車|かっしゃ}、むすぶ ところ、または ✊ で もつ");
      pzTools(); pzRender(); return;
    }
    if (tieUsed(p)) { A.ng(); msg("そこには もう ひもが むすんで あるよ"); return; }
    cur.push(p);
    finishRope("むすんだ！ ひもが 1ぽん できたよ");
  }

  function finishRope(text) {
    var s = pz.st;
    s.ropes.push(s.cur); s.cur = [];
    pz.hist.push({ a: "rope" });
    A.pop();
    if (left().r <= 0) pz.tool = null;
    msg(text + (left().r > 0 ? " つぎの ひもも つなごう" : " ▶ ためす で うごかして みよう"));
    pzTools(); pzRender();
  }

  $("pzHand").addEventListener("click", function () {
    var cur = pz.st.cur;
    if (!cur.length || pz.busy) return;
    if (cur.length === 1 && cur[0].b === "c") { A.ng(); msg("てんじょうを ひっぱっても なにも あがらないよ"); return; }
    cur.push({ b: "h" });
    finishRope("✊ で もった！");
  });

  function dropRopesWith(test) {
    var gone = pz.st.ropes.filter(function (r) { return r.some(test); }).length;
    pz.st.ropes = pz.st.ropes.filter(function (r) { return !r.some(test); });
    if (pz.st.cur.some(test)) pz.st.cur = [];
    for (var i = 0; i < gone; i++) popHist(function (h) { return h.a === "rope"; });
  }
  function popHist(test) {
    for (var i = pz.hist.length - 1; i >= 0; i--) if (test(pz.hist[i])) { pz.hist.splice(i, 1); return; }
  }
  function removeFixed(j, undo) {
    if (!undo) popHist(function (h) { return h.a === "f"; });
    dropRopesWith(function (p) { return p.b === "f" + j; });
    pz.st.fixed.splice(j, 1);
    var ren = function (p) { if (p.b[0] === "f" && +p.b.slice(1) > j) p.b = "f" + (+p.b.slice(1) - 1); };
    pz.st.ropes.forEach(function (r) { r.forEach(ren); }); pz.st.cur.forEach(ren);
  }
  function removeMove(k, undo) {
    if (!undo) popHist(function (h) { return h.a === "m" && h.k === k; });
    dropRopesWith(function (p) { return p.b === "m" + k || (k === 0 && p.b === "w"); });
    pz.st.move.splice(pz.st.move.indexOf(k), 1);
  }

  function hit(x, y) {
    var s = pz.st, i;
    for (i = 0; i < s.move.length; i++) {
      var hp = hookPos(s.move[i]);
      if (Math.hypot(x - hp.x, y - hp.y) < 16) return { t: "hook", k: s.move[i] };
    }
    for (i = 0; i < s.move.length; i++) {
      var sl = PZ.slots[s.move[i]];
      if (Math.hypot(x - sl.x, y - sl.y) < 30) return { t: "move", k: s.move[i] };
    }
    for (i = 0; i < s.fixed.length; i++) if (Math.hypot(x - s.fixed[i], y - PZ.railY) < 30) return { t: "fixed", j: i };
    if (Math.abs(x - PZ.weightX) < 40 && y > PZ.weightY - 16 && y < PZ.floor + 10) return { t: "weight" };
    if (pz.tool === "move") for (i = 0; i < PZ.slots.length; i++) {
      if (Math.hypot(x - PZ.slots[i].x, y - PZ.slots[i].y) < 36) return { t: "slot", k: i };
    }
    if (y < PZ.ceilY + 26) return { t: "ceil", x: Math.max(20, Math.min(PZ.w - 20, Math.round(x / 20) * 20)) };
    if (Math.abs(y - PZ.railY) < 40) return { t: "rail", x: Math.max(PZ.railMin, Math.min(PZ.railMax, Math.round(x / 20) * 20)) };
    return null;
  }

  pzSvg.addEventListener("pointerdown", function (e) { e.preventDefault(); });
  pzSvg.addEventListener("click", function (e) {
    if (pz.busy) return;
    var pt = svgPt(pzSvg, e), h = hit(pt.x, pt.y), st = STAGES[pz.i], s = pz.st;
    if (pz.view) { pz.view = null; pzRender(); }
    if (!h) return;
    if (pz.tool === "rope") {
      if (h.t === "hook") addPoint({ b: "m" + h.k, hook: 1 });
      else if (h.t === "move") addPoint({ b: "m" + h.k });
      else if (h.t === "fixed") addPoint({ b: "f" + h.j });
      else if (h.t === "weight") {
        if (s.move.indexOf(0) >= 0) addPoint({ b: "m0", hook: 1 });
        else addPoint({ b: "w" });
      } else if (h.t === "ceil") addPoint({ b: "c", x: h.x });
      return;
    }
    if (pz.tool === "fixed") {
      if (h.t === "fixed") { removeFixed(h.j); A.click(1200); msg("{定滑車|ていかっしゃ}を はずした"); }
      else if (h.t === "rail" || h.t === "ceil") {
        if (left().f <= 0) { A.ng(); msg("{定滑車|ていかっしゃ}は もう ないよ"); return; }
        if (s.fixed.some(function (x) { return Math.abs(x - h.x) < 40; })) { A.ng(); msg("となりの {滑車|かっしゃ}に ぶつかるよ"); return; }
        s.fixed.push(h.x); pz.hist.push({ a: "f" }); A.pop();
        msg("{定滑車|ていかっしゃ}を てんじょうに つけた");
        if (left().f <= 0) pz.tool = null;
      } else return;
      pzTools(); pzRender(); return;
    }
    if (pz.tool === "move") {
      if (h.t === "move") { removeMove(h.k); A.click(1200); msg("{動滑車|どうかっしゃ}を はずした"); }
      else if (h.t === "slot") {
        if (s.move.indexOf(h.k) >= 0) return;
        if (left().m <= 0) { A.ng(); msg("{動滑車|どうかっしゃ}は もう ないよ"); return; }
        if (h.k === 0) dropRopesWith(function (p) { return p.b === "w"; });
        s.move.push(h.k); pz.hist.push({ a: "m", k: h.k }); A.pop();
        msg(h.k === 0 ? "おもりに {動滑車|どうかっしゃ}を つけた" : "{動滑車|どうかっしゃ}を おいた。ひもで つるそう");
        if (left().m <= 0) pz.tool = null;
      } else return;
      pzTools(); pzRender(); return;
    }
    // どうぐを えらんで いない とき
    if (h.t === "fixed" || h.t === "move" || h.t === "slot" || h.t === "rail") msg("したの どうぐばこ から どうぐを えらんでね");
    else if (h.t === "ceil" || h.t === "hook" || h.t === "weight") msg("ひもを つなぐ ときは 〰️ ひも を えらんでね");
  });

  document.querySelectorAll(".tool[data-tool]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (pz.busy) return;
      var t = b.dataset.tool;
      if (pz.st.cur.length && t !== "rope") pz.st.cur = [];
      pz.tool = pz.tool === t && !pz.st.cur.length ? null : t;
      if (pz.tool === "rope" && left().r <= 0 && !pz.st.cur.length) { pz.tool = null; A.ng(); msg("ひもは もう ないよ。↩ で もどせるよ"); }
      else if (pz.tool === "fixed") msg("てんじょうの レールを タップして {定滑車|ていかっしゃ}を つけよう（もう いちど タップで はずす）");
      else if (pz.tool === "move") msg("てんせんの ○ を タップして {動滑車|どうかっしゃ}を おこう（もう いちど タップで はずす）");
      else if (pz.tool === "rope") msg(pz.st.cur.length ? "つづきを タップ" : "ひもの はしを むすぶ ところ（てんじょう・フック・おもり）を タップ");
      A.pop(); pz.view = null; pzTools(); pzRender();
    });
  });

  $("pzUndo").addEventListener("click", function () {
    if (pz.busy) return;
    var s = pz.st;
    pz.view = null;
    if (s.cur.length) s.cur.pop();
    else {
      var h = pz.hist.pop();
      if (!h) return;
      if (h.a === "rope") s.ropes.pop();
      else if (h.a === "f") removeFixed(s.fixed.length - 1, true);
      else if (h.a === "m") removeMove(h.k, true);
    }
    A.click(1500); $("pzNext").hidden = true;
    pzTools(); pzRender();
  });
  $("pzClear").addEventListener("click", function () { if (!pz.busy) { A.click(900); pzLoad(pz.i); } });
  $("pzNext").addEventListener("click", function () { if (pz.i < STAGES.length - 1) { A.pop(); pzLoad(pz.i + 1); } });

  var ERR = {
    open: "ひもが とちゅうだよ。むすぶ ところ か ✊ を えらんで しあげよう",
    noRope: "まだ ひもが ないよ。〰️ ひも で つなごう",
    noHand: "✊ で もつ ひもが ないよ",
    fall: "ぐらぐら… ささえる ひもが たりない ところが あるよ",
    wobble: "ぐらぐら… うごきかたが きまらないよ",
    many: "ひもが おおすぎて ちからが きまらないよ",
    slack: "ひもが たるんで しまうよ。つなぎかたを かえよう",
    wrapSide: "ひもは {滑車|かっしゃ}の うえ か したを まわして かけよう",
    flat: "よこに ならんだ ものどうしは つなげないよ",
    hand2: "✊ は 1つ だけ"
  };

  $("pzGo").addEventListener("click", function () {
    if (pz.busy) return;
    var st = STAGES[pz.i], out = L.evaluate(st, pz.st);
    pz.tool = null;
    if (ERR[out.code] || !out.res) { A.ng(); msg(ERR[out.code] || "うまく うごかないよ", "bad"); pzTools(); pzRender(); return; }
    if (out.code === "up") {
      A.ng(); msg("てんじょうが たかくて うえに ひっぱれない… したに ひけるように しよう（{定滑車|ていかっしゃ}）", "bad");
      pzTools(); pzRender(); return;
    }
    // うごかす
    var res = out.res, map = {};
    res.D.list.forEach(function (d, j) { map[d.b + ":" + d.k] = res.k[j]; });
    var target = out.code === "clear" ? out.pull : out.code === "long" ? st.reach : 0;
    var F = out.F, spMax = Math.max(st.W, st.Fmax * 2), useSpring = out.dir === "down";  // うえに ひく ときは ばねばかりが はみだすので かかない
    var t0 = performance.now(), dur = out.code === "heavy" ? 1300 : 900 + target * 30, lastC = 0;
    pz.busy = true; pzTools();
    var handLab = "ちから " + fmt(F);
    (function step(now) {
      var f = Math.min(1, (now - t0) / dur), p;
      if (out.code === "heavy") {
        p = Math.max(0, Math.sin(f * Math.PI * 6)) * 0.6;             // ぐっ ぐっ と ひくが あがらない
        if (Math.floor(f * 3) !== lastC) { lastC = Math.floor(f * 3); A.strain(); }
      } else {
        p = target * (f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);
        if (Math.abs(p - lastC) >= 2) { lastC = p; A.click(2000 + Math.random() * 600); }
      }
      var pxP = p * PZ.pxPerCm;
      pzRender(function (d) { return (map[d.b + ":" + d.k] || 0) * pxP; },
        { spring: useSpring && { value: out.code === "heavy" ? Math.min(F, spMax) : (p > 0.05 ? F : 0), max: spMax }, handLab: handLab });
      if (f < 1) { pz.anim = requestAnimationFrame(step); return; }
      pz.busy = false;
      pz.view = out.code;
      pzTools();
      pzRender(function (d) { return (map[d.b + ":" + d.k] || 0) * pxP; }, { spring: useSpring && { value: F, max: spMax }, handLab: handLab });
      if (out.code === "clear") {
        A.chime();
        var n = L.stars(st, pz.st), best = Math.max(n, save.pz.stars[pz.i] || 0);
        save.pz.stars[pz.i] = best; store();
        msg("🎉 やったね！ ちから <b>" + fmt(F) + "</b> で、ひもを <b>" + fmt(out.pull) + "cm</b> ひいて あがった！ " + starStr(n) +
          (n < 3 ? "<br>（{滑車|かっしゃ}を もっと へらしても できるかも）" : ""), "good");
        $("pzNext").hidden = pz.i >= STAGES.length - 1;
        pzList();
      } else if (out.code === "heavy") {
        A.ng();
        msg("おもくて あがらない… ひく ちからは <b>" + fmt(F) + "</b>（ぼくは " + st.Fmax + " まで）", "bad");
      } else {
        A.ng();
        msg("ひもを " + st.reach + "cm ひいても とどかない…（" + fmt(out.pull) + "cm ひく ひつようが ある）。ちからを かるく しすぎた かも", "bad");
      }
    })(t0);
  });

  // =========================================================
  //  もんだい モード
  // =========================================================
  var mq = { i: 0, input: "", hints: 0, wrong: 0, solved: false };
  var mqSvg = $("mqSvg");

  function mqList() {
    $("mqList").innerHTML = PROB.map(function (p, i) {
      return '<button type="button" data-i="' + i + '"><span class="no">' + p.id + "</span>" + rb(p.title) +
        '<span class="st">' + starStr(save.mq.stars[i] || 0) + "</span></button>";
    }).join("");
  }
  $("mqList").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]");
    if (b) { A.pop(); mqOpen(+b.dataset.i); }
  });

  function mqOpen(i) {
    var p = PROB[i];
    mq.i = i; mq.input = ""; mq.hints = 0; mq.wrong = 0; mq.solved = false;
    $("mqListView").hidden = true; $("mqView").hidden = false;
    $("mqNo").innerHTML = "もんだい " + p.id + " / " + PROB.length + "　" + "★".repeat(p.lv);
    $("mqText").innerHTML = "<h3>" + rb(p.title) + "</h3>" + rb(p.text).replace(/□/g, '<span class="box">□</span>');
    var h = p.sys.h || 360;
    mqSvg.setAttribute("viewBox", "0 0 360 " + h);
    mqSvg.innerHTML = Dr.render(p.sys, { labels: true });
    $("mqUnit").textContent = p.unit;
    $("mqHints").innerHTML = "";
    $("mqHintBtn").disabled = false; $("mqHintBtn").textContent = "💡 ヒント（" + p.hints.length + "）";
    $("mqNext").hidden = true;
    $("mqSay").innerHTML = ""; $("mqSay").className = "say";
    mqShow();
    window.scrollTo(0, 0);
  }
  function mqShow(cls) {
    var b = $("mqAns");
    b.textContent = mq.input || "□";
    b.className = "abox" + (cls ? " " + cls : "");
  }
  function mqBack() { $("mqView").hidden = true; $("mqListView").hidden = false; mqList(); }
  $("mqBack").addEventListener("click", function () { A.pop(); mqBack(); });

  var KEYS = ["7", "8", "9", "del", "4", "5", "6", ".", "1", "2", "3", "0", "clr", "ent"];
  $("mqPad").innerHTML = KEYS.map(function (k) {
    if (k === "del") return '<button type="button" class="del" data-k="del" aria-label="1もじ けす">⌫</button>';
    if (k === "clr") return '<button type="button" class="del" data-k="clr" aria-label="ぜんぶ けす">C</button>';
    if (k === "ent") return '<button type="button" class="ent" data-k="ent" style="grid-column: span 3">こたえる</button>';
    return '<button type="button" data-k="' + k + '">' + k + "</button>";
  }).join("");
  $("mqPad").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-k]");
    if (!b || mq.solved) return;
    var k = b.dataset.k;
    if (k === "del") mq.input = mq.input.slice(0, -1);
    else if (k === "clr") mq.input = "";
    else if (k === "ent") return mqCheck();
    else if (k === "." && (mq.input.indexOf(".") >= 0 || !mq.input)) return;
    else if (mq.input.length < 6) mq.input = (mq.input === "0" && k !== ".") ? k : mq.input + k;
    A.click(3000);
    mqShow();
  });

  function mqCheck() {
    var p = PROB[mq.i], v = parseFloat(mq.input);
    if (!mq.input || isNaN(v)) { A.ng(); say($("mqSay"), "□ に すうじを いれてね", "bad"); return; }
    if (Math.abs(v - p.ans) < 0.01) {
      mq.solved = true;
      var n = Math.max(1, 3 - mq.hints - (mq.wrong ? 1 : 0));
      save.mq.stars[mq.i] = Math.max(n, save.mq.stars[mq.i] || 0); store();
      A.chime(); mqShow("good");
      say($("mqSay"), "⭕ せいかい！ " + starStr(n) + "<br>" + rb(p.expl), "good");
      $("mqNext").hidden = mq.i >= PROB.length - 1;
      $("mqHintBtn").disabled = true;
    } else {
      mq.wrong++;
      A.ng(); mqShow("bad");
      say($("mqSay"), "❌ ざんねん。" + (mq.hints < p.hints.length ? "💡 ヒントを {見|み}て みよう" : "{図|ず}を よく {見|み}て もう いちど").replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>"), "bad");
      mq.input = "";
      setTimeout(function () { if (!mq.solved) mqShow(); }, 700);
    }
  }

  $("mqHintBtn").addEventListener("click", function () {
    var p = PROB[mq.i];
    if (mq.hints >= p.hints.length) return;
    var li = document.createElement("li");
    li.innerHTML = rb(p.hints[mq.hints]);
    $("mqHints").appendChild(li);
    mq.hints++;
    A.pop();
    if (mq.hints >= p.hints.length) { $("mqHintBtn").disabled = true; $("mqHintBtn").textContent = "💡 ヒントは ここまで"; }
    else $("mqHintBtn").textContent = "💡 つぎの ヒント（" + (p.hints.length - mq.hints) + "）";
  });
  $("mqNext").addEventListener("click", function () { if (mq.i < PROB.length - 1) { A.pop(); mqOpen(mq.i + 1); } });

  // ---------- はじめ ----------
  tkWeights();
  if (TK.weights.indexOf(tk.W) < 0) tk.W = 20;
  var ti = save.tk.cur | 0, pi = save.pz.cur | 0;
  tkSelect(ti > 0 && ti < TK.list.length && tkUnlocked(ti) ? ti : 0);
  tkSummary();
  pzLoad(pi > 0 && pi < STAGES.length && pzUnlocked(pi) ? pi : 0);
  mqList();
  showTab(save.tab);
})();
