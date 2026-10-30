/* じっけん 6: やまびこ
   こえ は やまに はねかえって もどって くる。いって かえるので おくれ ＝ 2 × きょり ÷ 340（OtoPhys.echoDelay） */
OtoLab.add({
  id: "yamabiko", emoji: "⛰️", color: "#0ca678",
  title: "やまびこ",
  yosou: {
    q: "{山|やま}が とおく なると、やまびこが かえって くるのは？",
    choices: [{ t: "はやく なる" }, { t: "おそく なる", ok: true }, { t: "かわらない" }],
    why: "{音|おと}は 1{秒|びょう}で やく 340m すすむ。{山|やま}が とおい ほど いって かえる みちが ながく なるので、おそく かえって くるよ。"
  },
  findings: [
    { id: "kaeru", t: "{声|こえ}は {山|やま}に はねかえって もどって くる" },
    { id: "tooi", t: "{山|やま}が とおい ほど やまびこは おそい" },
    { id: "nibai", t: "いって かえる ので、すすむ きょりは {山|やま}までの 2ばい" }
  ],
  matome: [
    "{音|おと}は かべや {山|やま}に あたると はねかえる。これが やまびこ（こだま）。",
    "かえって くるまでの {秒|びょう}の かず × 340m ÷ 2 で、{山|やま}までの きょりが わかる。"
  ],
  more: "コウモリや イルカは、じぶんの だした {音|おと}の はねかえりで まわりを しらべて いる。{船|ふね}も {音|おと}の はねかえりで {海|うみ}の ふかさを はかるよ。",
  mount: function (c) {
    var P = c.P, A = c.A, sv = c.sv, X0 = 52;
    var dist = 680, wave = null, t0 = 0, lastDelay = 0, tried = {};
    var svg = sv("svg", { viewBox: "0 0 360 230", class: "board", "aria-label": "やまびこ" }, c.stage);
    sv("rect", { x: 0, y: 0, width: 360, height: 230, fill: "#e3fafc" }, svg);
    sv("rect", { x: 0, y: 186, width: 360, height: 44, fill: "#8ce99a" }, svg);
    sv("text", { x: 28, y: 186, "text-anchor": "middle", "font-size": 40, text: "🧒" }, svg);
    var mt = sv("g", null, svg);
    sv("path", { d: "M-60 190 L0 60 L60 190 Z", fill: "#2b8a3e" }, mt);
    sv("path", { d: "M-18 98 L0 60 L18 98 L8 92 L0 100 L-8 92 Z", fill: "#fff" }, mt);
    var ruler = sv("line", { y1: 208, y2: 208, x1: X0, stroke: "#087f5b", "stroke-width": 2, "stroke-dasharray": "5 4" }, svg);
    var rl = sv("text", { y: 224, "text-anchor": "middle", class: "svgsmall" }, svg);
    var arc = sv("path", { fill: "none", stroke: "#0ca678", "stroke-width": 5, "stroke-linecap": "round", opacity: 0 }, svg);
    var b1 = sv("text", { x: 70, y: 40, class: "svgbub", opacity: 0, text: "やっほー！" }, svg);
    var b2 = sv("text", { x: 70, y: 70, class: "svgbub echo", opacity: 0, text: "…やっほー" }, svg);
    var timer = sv("text", { x: 350, y: 30, "text-anchor": "end", class: "svgnote" }, svg);

    c.slider({ label: "{山|やま}までの きょり", left: "ちかい", right: "とおい", min: 170, max: 1020, step: 170, value: dist, input: function (v) { if (!wave) { dist = v; draw(); } } });
    var callB = c.btn("📣「やっほー！」", call, "big2");
    var calcB = c.btn("🧮 きょりを けいさん", showCalc, "sub");
    var calc = c.h("div", { class: "card2 calc", hidden: "" }, null, c.ctrl);
    calcB.disabled = true;
    c.say("{山|やま}に むかって「やっほー！」。かえって くるまで なんびょう かな？");

    function mx() { return X0 + 40 + dist / 1020 * 230; } // {山|やま}の ふもと（はねかえる ところ）
    function draw() {
      mt.setAttribute("transform", "translate(" + (mx() + 50) + ",0)");
      ruler.setAttribute("x2", mx()); rl.setAttribute("x", (X0 + mx()) / 2);
      rl.textContent = "やく " + dist + "m";
    }
    function call() {
      if (wave) return;
      A.voice("yahho", { gain: 0.8, pitch: 340 });
      var delay = P.echoDelay(dist);
      A.voice("yahho", { gain: 0.35, pitch: 340, filter: "echo", when: delay });
      wave = { delay: delay }; t0 = performance.now();
      b1.setAttribute("opacity", 1); b2.setAttribute("opacity", 0); calc.hidden = true;
      callB.disabled = true; calcB.disabled = true;
      c.after(1200, function () { b1.setAttribute("opacity", 0); });
    }
    function back() {
      b2.setAttribute("opacity", 1); arc.setAttribute("opacity", 0);
      lastDelay = wave.delay; wave = null; callB.disabled = false; calcB.disabled = false;
      timer.textContent = lastDelay.toFixed(1) + "びょう";
      tried[dist] = true;
      c.found("kaeru");
      var ks = Object.keys(tried).map(Number);
      if (ks.length >= 2 && Math.max.apply(null, ks) - Math.min.apply(null, ks) >= 340) c.found("tooi");
      c.say("…やっほー。" + lastDelay.toFixed(1) + "{秒|びょう}で かえって きたね。" + (Object.keys(tried).length < 2 ? "{山|やま}の きょりを かえて くらべて みよう" : ""));
      c.after(1800, function () { b2.setAttribute("opacity", 0); });
    }
    function showCalc() {
      var go = Math.round(P.SPEED_AIR * lastDelay);
      calc.hidden = false;
      calc.innerHTML = c.rb("🧮 {音|おと}が すすんだ きょり: " + lastDelay.toFixed(1) + "{秒|びょう} × 340m ＝ やく " + go + "m<br>" +
        "いって かえる ので ÷ 2 → {山|やま}まで <b>やく " + Math.round(go / 2) + "m</b>");
      c.found("nibai");
    }
    c.loop(function () {
      if (!wave) return;
      var t = (performance.now() - t0) / 1000, half = wave.delay / 2, x, dir;
      timer.textContent = t.toFixed(1) + "びょう";
      if (t >= wave.delay) { back(); return; }
      if (t < half) { x = X0 + (mx() - X0) * t / half; dir = 1; } else { x = mx() - (mx() - X0) * (t - half) / half; dir = -1; }
      var r = 26;
      arc.setAttribute("d", "M" + (x - dir * 8) + " " + (150 - r) + " Q" + (x + dir * 10) + " 150 " + (x - dir * 8) + " " + (150 + r));
      arc.setAttribute("opacity", t < half ? 0.9 : 0.5);
    });
    draw();
  }
});
