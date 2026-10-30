/* じっけん 3: コップの がっき
   たたく: 水が おおい ほど ひくい（OtoPhys.glassStrikeFreq）
   ふく:   水が おおい ほど たかい（OtoPhys.glassBlowFreq。空気の 柱 が みじかく なる）
   ドレミに あわせて「かえるの うた」 */
OtoLab.add({
  id: "koppu", emoji: "🥛", color: "#1c7ed6",
  title: "コップの がっき",
  yosou: {
    q: "{水|みず}を たくさん いれた コップを たたくと、{水|みず}が すこしの コップと くらべて {音|おと}は？",
    choices: [{ t: "たかい {音|おと}" }, { t: "ひくい {音|おと}", ok: true }, { t: "{音|おと}が でない" }],
    why: "たたくと コップと {水|みず}が いっしょに ふるえる。{水|みず}が おおい ほど おもくて ゆっくり ふるえるので ひくい {音|おと}に なるよ。"
  },
  findings: [
    { id: "tataku", t: "たたく とき: {水|みず}が おおい ほど ひくい {音|おと}" },
    { id: "fuku", t: "ふく とき: {水|みず}が おおい ほど {高|たか}い {音|おと}（ぎゃく！）" },
    { id: "uta", t: "ドレミを あわせて「かえるの うた」が ひけた" }
  ],
  matome: [
    "コップを たたく と、{水|みず}が おおい ほど ひくい {音|おと}に なる（コップと {水|みず}が ふるえる）。",
    "コップの くちを ふく と、{水|みず}が おおい ほど {高|たか}い {音|おと}に なる（なかの {空気|くうき}が ふるえる。{空気|くうき}の ぶぶんが みじかい ほど {高|たか}い）。",
    "ふるえる ものが ちがうので、たたく ときと ふく ときで {高|たか}さの かわりかたが ぎゃくに なる。"
  ],
  more: "ふえや パイプオルガンも なかの {空気|くうき}の ながさで {音|おと}の {高|たか}さが きまるよ。",
  mount: function (c) {
    var P = c.P, A = c.A, sv = c.sv, N = P.NOTES;
    var TOP = 80, BOT = 230, H = 140, GW = 44, GAP = 58, X0 = 180 - 2.5 * GAP;
    var fills = [0.2, 0.75, 0.45, 0.9, 0.3, 0.6], mode = "strike", song = false, si = 0, strikes = [], blows = [];
    var svg = sv("svg", { viewBox: "0 0 360 290", class: "board drag", "aria-label": "コップ" }, c.stage);
    sv("text", { x: 180, y: 28, "text-anchor": "middle", class: "svgtip", text: "たてに ドラッグで みずの りょう・タップで たたく" }, svg);
    var G = fills.map(function (f, i) {
      var cx = X0 + i * GAP, g = sv("g", { "data-i": i }, svg);
      var clip = sv("clipPath", { id: "cg" + i }, g);
      var shape = "M" + (cx - GW / 2) + " " + TOP + " L" + (cx - GW / 2 + 5) + " " + BOT + " L" + (cx + GW / 2 - 5) + " " + BOT + " L" + (cx + GW / 2) + " " + TOP + " Z";
      sv("path", { d: shape }, clip);
      var glow = sv("path", { d: shape, fill: "none", stroke: "#fcc419", "stroke-width": 9, opacity: 0 }, g);
      sv("path", { d: shape, fill: "rgba(231,245,255,.7)" }, g);
      var water = sv("rect", { x: cx - GW / 2, width: GW, fill: "#4dabf7", "clip-path": "url(#cg" + i + ")" }, g);
      sv("path", { d: shape, fill: "none", stroke: "#74c0fc", "stroke-width": 3 }, g);
      var nl = sv("text", { x: cx, y: TOP - 10, "text-anchor": "middle", class: "svgnote" }, g);
      var tl = sv("text", { x: cx, y: BOT + 22, "text-anchor": "middle", class: "svgsmall" }, g);
      var ok = sv("text", { x: cx, y: BOT + 44, "text-anchor": "middle", class: "svgsmall" }, g);
      var fx = sv("text", { x: cx + 18, y: TOP - 24, "text-anchor": "middle", "font-size": 22, opacity: 0 }, g);
      return { cx: cx, g: g, water: water, nl: nl, tl: tl, ok: ok, fx: fx, glow: glow };
    });
    c.seg([{ t: "🥢 たたく", v: "strike" }, { t: "🌬️ ふく", v: "blow" }], mode, function (v) { mode = v; draw(); c.say(v === "blow" ? "🌬️ コップの くちを ふいて みよう。{水|みず}の りょうで {高|たか}さは どう かわる？" : "🥢 コップを たたいて みよう"); });
    var songBox = c.h("div", { class: "card2" }, null, c.ctrl);
    c.h("p", { class: "small" }, "🎵 コップを ドレミファソラ に あわせて「かえるの うた」を ひこう", songBox);
    var r1 = c.row(songBox);
    var tuneB = c.btn("🎯 ドレミに あわせる", function () { song = true; draw(); c.say("したの「⬆ {水|みず}を ふやす / ⬇ へらす」を {見|み}ながら {水|みず}を うごかそう。ぜんぶ ⭕ に なったら ひけるよ"); }, "sub", r1);
    c.btn("🪄 じどうで あわせる", function () {
      song = true; mode = "strike";
      fills = N.map(function (n) { return P.fillForStrike(n.f); }); draw();
      c.say("🪄 {水|みず}を ドレミに あわせたよ。ドの コップが いちばん {水|みず}が おおいね");
    }, "sub", r1);
    var r2 = c.row(songBox);
    var playB = c.btn("🎵 ひいて みる", function () { si = 0; playing = true; draw(); c.say("ひかって いる コップを じゅんばんに タップ しよう"); }, "", r2);
    c.btn("▶ おてほん", demo, "sub", r2);
    var playing = false;
    void tuneB;
    c.say("コップを たてに なぞって {水|みず}の りょうを かえて、タップで たたこう");

    function freqOf(i) { return mode === "blow" ? P.glassBlowFreq(fills[i]) : P.glassStrikeFreq(fills[i]); }
    function tuned(i) { return Math.abs(P.cents(P.glassStrikeFreq(fills[i]), N[i].f)) <= 30; }
    function allTuned() { return fills.every(function (_, i) { return tuned(i); }); }
    function draw() {
      G.forEach(function (o, i) {
        var hh = fills[i] * H;
        o.water.setAttribute("y", BOT - hh); o.water.setAttribute("height", hh + 1);
        var f = freqOf(i), ni = P.nearestNote(f, 30);
        o.nl.textContent = mode === "strike" && ni >= 0 ? N[ni].n : "";
        o.tl.textContent = song && mode === "strike" ? "→" + N[i].n : "";
        var d = P.cents(P.glassStrikeFreq(fills[i]), N[i].f);
        o.ok.textContent = song && mode === "strike" ? (Math.abs(d) <= 30 ? "⭕" : d > 0 ? "⬆みず" : "⬇みず") : "";
        o.glow.setAttribute("opacity", playing && P.KAERU[si] && P.KAERU[si][0] === i ? 1 : 0);
      });
      playB.disabled = !(song && mode === "strike" && allTuned());
    }
    function strike(i, quiet) {
      var f = freqOf(i);
      if (mode === "blow") { A.blow(f); blows.push(fills[i]); flash(i, "🌬️"); }
      else { A.glass(f); strikes.push(fills[i]); flash(i, "🥢"); }
      if (quiet) return;
      if (spread(strikes)) c.found("tataku");
      if (spread(blows)) c.found("fuku");
      if (playing && mode === "strike") {
        if (P.KAERU[si][0] === i) {
          si++;
          if (si >= P.KAERU.length) { playing = false; c.found("uta"); c.say("🎉 かえるの うたが ひけたね！"); A.stamp(); }
        }
      } else {
        var ni = P.nearestNote(f, 30);
        c.say((mode === "blow" ? "ヒュー" : "チーン") + "！ {水|みず}が " + (fills[i] > 0.66 ? "おおい" : fills[i] < 0.33 ? "すくない" : "まんなか") + " コップ" + (mode === "strike" && ni >= 0 ? "（" + N[ni].n + " の {音|おと}）" : ""));
      }
      draw();
    }
    function spread(a) { return a.length > 1 && Math.max.apply(null, a) - Math.min.apply(null, a) >= 0.3; }
    function flash(i, em) {
      var o = G[i]; o.fx.textContent = em; o.fx.setAttribute("opacity", 1);
      o.g.style.transform = "translateX(2px)"; c.after(80, function () { o.g.style.transform = ""; });
      c.after(350, function () { o.fx.setAttribute("opacity", 0); });
    }
    function demo() {
      mode = "strike"; fills = N.map(function (n) { return P.fillForStrike(n.f); }); song = true; playing = false; draw();
      var t = 0;
      P.KAERU.forEach(function (n) {
        (function (k, at) { c.after(at, function () { strike(k, true); G.forEach(function (o, j) { o.glow.setAttribute("opacity", j === k ? 1 : 0); }); }); })(n[0], t);
        t += n[1] * 330;
      });
      c.after(t + 300, function () { draw(); });
      c.say("▶ おてほん: ド レ ミ ファ ミ レ ド …");
    }
    var drag = null;
    svg.addEventListener("pointerdown", function (e) {
      var p = c.svgPt(svg, e), i = Math.round((p.x - X0) / GAP);
      if (i < 0 || i > 5 || Math.abs(p.x - G[i].cx) > GW / 2 + 6 || p.y < TOP - 30 || p.y > BOT + 20) return;
      drag = { i: i, y: p.y, moved: false }; svg.setPointerCapture(e.pointerId); e.preventDefault();
    });
    svg.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var p = c.svgPt(svg, e);
      if (!drag.moved && Math.abs(p.y - drag.y) < 6) return;
      drag.moved = true;
      fills[drag.i] = Math.max(0, Math.min(0.98, (BOT - p.y) / H)); draw();
    });
    svg.addEventListener("pointerup", function () { if (drag && !drag.moved) strike(drag.i); drag = null; });
    svg.addEventListener("pointercancel", function () { drag = null; });
    draw();
  }
});
