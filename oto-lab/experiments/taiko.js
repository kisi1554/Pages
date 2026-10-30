/* じっけん 2: たいこ と つぶ
   たいこの かわ が ふるえて いる あいだ、のせた つぶ が はねる。つよく たたく ほど たかく はねる */
OtoLab.add({
  id: "taiko", emoji: "🥁", color: "#e8590c",
  title: "たいこ と つぶ",
  yosou: {
    q: "たいこの うえに ちいさな つぶを のせて たたくと、つぶは どう なる？",
    choices: [{ t: "ぴょんぴょん はねる", ok: true }, { t: "うごかない" }, { t: "かわに すいこまれる" }],
    why: "{音|おと}が でて いる とき、たいこの かわは ふるえて いる。その ふるえで つぶが はねるよ。"
  },
  findings: [
    { id: "haneru", t: "たたくと つぶが はねる（かわが ふるえて いる）" },
    { id: "tsuyoku", t: "つよく たたくと {音|おと}が {大|おお}きく、つぶも {高|たか}く はねる" },
    { id: "osaeru", t: "かわを おさえると ふるえも {音|おと}も とまる" }
  ],
  matome: [
    "たいこの {音|おと}が でて いる とき、かわは ふるえて いる（つぶが はねるので わかる）。",
    "つよく たたくと ふるえが おおきく なり、{音|おと}も {大|おお}きく なる。",
    "かわを おさえて ふるえを とめると、{音|おと}も とまる。"
  ],
  more: "がっこうの じっけんでは、たいこに ビーズや かみの つぶを のせたり、トライアングルを {水|みず}に つけて しぶきを {見|み}たり して ふるえを たしかめるよ。",
  mount: function (c) {
    var A = c.A, sv = c.sv, CX = 180, TOP = 140, RX = 120, RY = 34;
    var vib = 0, vt = 0, voice = null, hits = [];
    var svg = sv("svg", { viewBox: "0 0 360 300", class: "board", "aria-label": "たいこ" }, c.stage);
    sv("path", { d: "M" + (CX - RX) + " " + TOP + " L" + (CX - RX + 8) + " 255 Q" + CX + " 285 " + (CX + RX - 8) + " 255 L" + (CX + RX) + " " + TOP + " Z", fill: "#e8590c", stroke: "#a63f06", "stroke-width": 3 }, svg);
    for (var k = 0; k < 7; k++) {
      var x = CX - RX + 18 + k * 37;
      sv("path", { d: "M" + x + " " + (TOP + 18) + " L" + (x + 18) + " 250 M" + (x + 18) + " " + (TOP + 18) + " L" + x + " 250", stroke: "#ffd8a8", "stroke-width": 2.5 }, svg);
    }
    var skin = sv("ellipse", { cx: CX, cy: TOP, rx: RX, ry: RY, fill: "#fff4e6", stroke: "#a63f06", "stroke-width": 3, style: "cursor:pointer" }, svg);
    var waves = sv("g", null, svg);
    var gG = sv("g", null, svg);
    var hand = sv("text", { x: CX, y: TOP + 12, "text-anchor": "middle", "font-size": 46, text: "✋", opacity: 0 }, svg);
    var tip = sv("text", { x: CX, y: 40, "text-anchor": "middle", class: "svgtip", text: "かわを タップ しても たたけるよ" }, svg);
    var COLORS = ["#f03e3e", "#1c7ed6", "#37b24d", "#f59f00", "#ae3ec9", "#0ca678"];
    var grains = [];
    for (var i = 0; i < 14; i++) {
      var gx = CX - 90 + (i % 7) * 30 + (i > 6 ? 15 : 0) + (Math.random() * 6 - 3);
      var gy = TOP - 6 + (i > 6 ? 10 : -4);
      grains.push({ x: gx, base: gy, y: 0, v: 0, el: sv("circle", { cx: gx, cy: gy, r: 5.5, fill: COLORS[i % 6], stroke: "#fff", "stroke-width": 1.5 }, gG) });
    }
    var row = c.row();
    c.btn("👆 そっと たたく", function () { hit(0.3); }, "sub", row);
    c.btn("💪 つよく たたく", function () { hit(1); }, "sub", row);
    c.btn("✋ かわを おさえる", press, "stop", c.row());
    c.say("たいこを たたいて、つぶを よく {見|み}て いてね");
    skin.addEventListener("click", function () { hit(0.6); });

    function hit(s) {
      if (voice) voice.stop();
      voice = A.drum(s); vib = Math.max(vib, s); vt = 0; hand.setAttribute("opacity", 0);
      grains.forEach(function (g) { if (g.y > -2) g.v = -(60 + 260 * s) * (0.7 + Math.random() * 0.6); });
      hits.push(s); tip.style.opacity = 0;
      c.found("haneru");
      if (Math.max.apply(null, hits) >= 0.75 && Math.min.apply(null, hits) <= 0.4) c.found("tsuyoku");
      c.say(s > 0.7 ? "ドーン！ つぶが <b>たかく</b> はねたね" : s < 0.4 ? "とん。つぶは <b>すこし</b> だけ はねたね" : "ドン！ つぶが はねたよ");
      ring(s);
    }
    function press() {
      var was = vib > 0.08;
      if (voice) { voice.stop(); voice = null; }
      vib = 0; hand.setAttribute("opacity", 1);
      c.after(900, function () { hand.setAttribute("opacity", 0); });
      if (was) { c.found("osaeru"); c.say("✋ ぴたっ。ふるえが とまって、{音|おと}も つぶも とまったね"); }
      else c.say("✋ たたいた すぐ あとに おさえて みよう");
    }
    // ひろがる {音|おと}の わ（くうきの ふるえ）
    function ring(s) {
      var r = sv("ellipse", { cx: CX, cy: TOP, rx: RX, ry: RY, fill: "none", stroke: "#e8590c", "stroke-width": 2 + 3 * s, opacity: .6 }, waves);
      r._t = 0; r._s = s; rings.push(r);
    }
    var rings = [];
    c.loop(function (dt) {
      vt += dt;
      if (vib > 0.001) vib *= Math.exp(-dt * 2.2);
      var wob = vib * 7 * Math.sin(vt * 2 * Math.PI * 9); // 9回/びょう に ゆっくり みせる
      skin.setAttribute("ry", (RY + wob * 0.5).toFixed(2));
      grains.forEach(function (g) {
        // ふるえて いる かわの うえに おちると また はねる
        g.v += 900 * dt; g.y += g.v * dt;
        if (g.y >= 0) {
          g.y = 0;
          g.v = vib > 0.08 ? -(40 + 220 * vib) * (0.6 + Math.random() * 0.8) : 0;
        }
        g.el.setAttribute("cy", (g.base + g.y + (g.y === 0 ? wob * 0.4 : 0)).toFixed(1));
      });
      rings = rings.filter(function (r) {
        r._t += dt; var k = 1 + r._t * 1.4;
        r.setAttribute("rx", RX * k); r.setAttribute("ry", RY * k); r.setAttribute("opacity", Math.max(0, 0.6 - r._t * 0.7));
        if (r._t > 0.9) { r.remove(); return false; } return true;
      });
    });
  }
});
