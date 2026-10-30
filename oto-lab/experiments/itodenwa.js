/* じっけん 4: いとでんわ
   こえ → コップの そこ が ふるえる → 糸 が ふるえて つたえる → あいての コップ が ふるえる
   ピンと はると つたわる。たるむ・ゆびで つまむ と ふるえが とまって つたわらない */
OtoLab.add({
  id: "itodenwa", emoji: "☎️", color: "#2f9e44",
  title: "いとでんわ",
  yosou: {
    q: "いとでんわで はなして いる とき、{糸|いと}を ゆびで つまむと {声|こえ}は どう なる？",
    choices: [{ t: "つたわる" }, { t: "つたわらない", ok: true }, { t: "{大|おお}きく なる" }],
    why: "{声|こえ}は {糸|いと}の ふるえ として つたわる。つまむと ふるえが とまるので つたわらないよ。"
  },
  findings: [
    { id: "pin", t: "{糸|いと}を ピンと はると {声|こえ}が つたわる（{糸|いと}が ふるえる）" },
    { id: "slack", t: "{糸|いと}が たるむと {声|こえ}が つたわらない" },
    { id: "pinch", t: "{糸|いと}を つまむと ふるえが とまって つたわらない" }
  ],
  matome: [
    "いとでんわは、{声|こえ}の ふるえが コップの そこ → {糸|いと} → あいての コップ と つたわって きこえる。",
    "{糸|いと}が たるんで いたり、ゆびで つまんだり すると、ふるえが つたわらないので {声|こえ}は きこえない。"
  ],
  more: "{音|おと}は {空気|くうき}だけで なく、{糸|いと}や {木|き}や {金属|きんぞく}の なかも ふるえと して つたわる。つくえに {耳|みみ}を つけて コツコツ たたくと よく きこえるよ。",
  mount: function (c) {
    var A = c.A, sv = c.sv, X1 = 78, X2 = 282, Y = 118;
    var mode = "pin", pulse = null, busy = false;
    var svg = sv("svg", { viewBox: "0 0 360 230", class: "board", "aria-label": "いとでんわ" }, c.stage);
    sv("text", { x: 34, y: 140, "text-anchor": "middle", "font-size": 50, text: "🧒" }, svg);
    sv("text", { x: 326, y: 140, "text-anchor": "middle", "font-size": 50, text: "👧" }, svg);
    sv("path", { d: "M58 104 L" + X1 + " 110 L" + X1 + " 126 L58 132 Z", fill: "#ffe066", stroke: "#e67700", "stroke-width": 2.5 }, svg);
    sv("path", { d: "M302 104 L" + X2 + " 110 L" + X2 + " 126 L302 132 Z", fill: "#ffe066", stroke: "#e67700", "stroke-width": 2.5 }, svg);
    var str = sv("path", { fill: "none", stroke: "#495057", "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
    var finger = sv("text", { x: 180, y: Y + 14, "text-anchor": "middle", "font-size": 34, text: "🤏", opacity: 0 }, svg);
    var b1 = bubble(14, 30, "left"), b2 = bubble(200, 30, "right");
    var note = sv("text", { x: 180, y: 214, "text-anchor": "middle", class: "svgsmall", text: "" }, svg);
    function bubble(x, y) {
      var g = sv("g", { opacity: 0 }, svg);
      sv("rect", { x: x, y: y, width: 146, height: 40, rx: 14, fill: "#fff", stroke: "#2f9e44", "stroke-width": 2.5 }, g);
      var t = sv("text", { x: x + 73, y: y + 27, "text-anchor": "middle", class: "svgbub" }, g);
      return { g: g, t: t };
    }
    c.seg([{ t: "📏 ピンと はる", v: "pin" }, { t: "〰️ たるませる", v: "slack" }, { t: "🤏 ゆびで つまむ", v: "pinch" }], mode, function (v) { mode = v; draw(0); });
    c.btn("📣「もしもし」と はなす", talk, "big2");
    c.say("{糸|いと}の ようすを えらんで、「もしもし」と はなして みよう");

    function sag(x) { if (mode !== "slack") return 0; var u = (x - X1) / (X2 - X1); return 60 * 4 * u * (1 - u); }
    function draw() {
      var d = "";
      for (var k = 0; k <= 60; k++) {
        var x = X1 + (X2 - X1) * k / 60, y = Y + sag(x);
        if (pulse) {
          var dx = x - pulse.x, a = pulse.a * Math.exp(-dx * dx / 500);
          if (mode === "pinch" && x > 180) a = 0;
          y += a * Math.sin(dx * 0.6 - pulse.t * 40);
        }
        d += (k ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      }
      str.setAttribute("d", d);
      finger.setAttribute("opacity", mode === "pinch" ? 1 : 0);
    }
    function talk() {
      if (busy) return;
      busy = true;
      b1.t.textContent = "もしもし"; b1.g.setAttribute("opacity", 1); b2.g.setAttribute("opacity", 0);
      A.voice("moshimoshi", { gain: 0.22, pitch: 300 });
      pulse = { x: X1, a: 7, t: 0 };
      note.textContent = "🐢 ふるえが つたわる ようすを ゆっくり みせて いるよ";
    }
    function arrive(ok) {
      b2.g.setAttribute("opacity", 1);
      if (ok) {
        b2.t.textContent = "もしもし！ きこえた！";
        A.voice("moshimoshi", { gain: 1, pitch: 300, filter: "tinny" });
        c.found("pin"); c.say("📏 ピンと はった {糸|いと}が ふるえて、{声|こえ}が とどいたね");
      } else {
        b2.t.textContent = "……きこえない";
        if (mode === "slack") { c.found("slack"); c.say("〰️ たるんだ {糸|いと}は ふるえが すぐ きえて しまう。{声|こえ}が とどかないね"); }
        else { c.found("pinch"); c.say("🤏 つまんだ ところで ふるえが とまって、{声|こえ}が とどかないね"); }
      }
      c.after(1600, function () { b1.g.setAttribute("opacity", 0); b2.g.setAttribute("opacity", 0); busy = false; note.textContent = ""; });
    }
    c.loop(function (dt) {
      if (!pulse) return;
      pulse.t += dt; pulse.x += dt * 260;
      if (mode === "slack") pulse.a *= Math.exp(-dt * 5);
      var stop = mode === "pinch" && pulse.x > 180, dead = pulse.a < 0.5;
      if (pulse.x >= X2 || stop || dead) {
        var ok = mode === "pin";
        pulse = null; draw(); arrive(ok); return;
      }
      draw();
    });
    draw();
  }
});
