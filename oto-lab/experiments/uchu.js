/* じっけん 8: 水の 中・宇宙 では？
   1500m さきへ ベルの おと: 空気 やく 340m/秒（やく 4.4びょう）、水 やく 1500m/秒（やく 1びょう）、
   宇宙は 空気が ないので つたわらない（OtoPhys.travelTime）。
   ベルジャー: なかの 空気を ぬく ほど おとが ちいさく なる */
OtoLab.add({
  id: "uchu", emoji: "🚀", color: "#364fc7",
  title: "{水|みず}の {中|なか}・{宇宙|うちゅう}では？",
  yosou: {
    q: "{空気|くうき}の ない {宇宙|うちゅう}で ベルを ならすと、はなれた ところに いる {人|ひと}には？",
    choices: [{ t: "きこえる" }, { t: "きこえない", ok: true }, { t: "ちいさく きこえる" }],
    why: "{音|おと}は {空気|くうき}や {水|みず}などの ふるえで つたわる。{宇宙|うちゅう}には {空気|くうき}が ないので つたわらないよ。"
  },
  findings: [
    { id: "uchu", t: "{宇宙|うちゅう}では {音|おと}が つたわらない（{空気|くうき}が ない）" },
    { id: "mizu", t: "{水|みず}の なかは {空気|くうき}より はやく つたわる（やく 1500m/{秒|びょう}）" },
    { id: "nuku", t: "{空気|くうき}を ぬくと {音|おと}が ちいさく なる" }
  ],
  matome: [
    "{音|おと}は {空気|くうき}・{水|みず}・{糸|いと}など、ふるえを つたえる ものが ないと つたわらない。{宇宙|うちゅう}では つたわらない。",
    "{水|みず}の なかでは {音|おと}は 1{秒|びょう}に やく 1500m すすむ。{空気|くうき}（やく 340m）の 4ばい いじょう はやい。"
  ],
  more: "{宇宙飛行士|うちゅうひこうし}は {無線|むせん}（{電波|でんぱ}）で はなす。{電波|でんぱ}は {光|ひかり}の なかまで、{空気|くうき}が なくても つたわるよ。",
  mount: function (c) {
    var P = c.P, A = c.A, sv = c.sv, D = 1500, X1 = 62, X2 = 300;
    var lanes = [
      { id: "air", y: 62, who: "🧑", name: "{空気|くうき}", sub: "やく 340m/びょう", fill: "#e7f5ff" },
      { id: "water", y: 152, who: "🤿", name: "{水|みず}", sub: "やく 1500m/びょう", fill: "#a5d8ff" },
      { id: "space", y: 242, who: "👩‍🚀", name: "{宇宙|うちゅう}", sub: "くうきが ない", fill: "#212547" }
    ];
    var run = null, air = 100, jarRang = { full: false, empty: false };
    var svg = sv("svg", { viewBox: "0 0 360 290", class: "board", "aria-label": "おとの はやさ くらべ" }, c.stage);
    sv("text", { x: 180, y: 16, "text-anchor": "middle", class: "svgsmall", text: "ベルから 1500m さきまで おとが とどくのは？" }, svg);
    lanes.forEach(function (L) {
      sv("rect", { x: 6, y: L.y - 34, width: 348, height: 76, rx: 12, fill: L.fill }, svg);
      if (L.id === "space") for (var i = 0; i < 14; i++) sv("circle", { cx: 20 + i * 25, cy: L.y - 26 + (i * 13) % 60, r: 1.3, fill: "#fff" }, svg);
      L.bell = sv("text", { x: 36, y: L.y + 12, "text-anchor": "middle", "font-size": 34, text: "🔔" }, svg);
      sv("text", { x: 326, y: L.y + 14, "text-anchor": "middle", "font-size": 36, text: L.who }, svg);
      var lab = sv("text", { x: 70, y: L.y - 16, class: L.id === "space" ? "svglane w" : "svglane" }, svg);
      lab.textContent = L.id === "air" ? "くうき " + L.sub : L.id === "water" ? "みず " + L.sub : "うちゅう（" + L.sub + "）";
      L.ring = sv("path", { fill: "none", stroke: L.id === "water" ? "#1864ab" : "#495057", "stroke-width": 4, opacity: 0 }, svg);
      L.res = sv("text", { x: 300, y: L.y + 34, "text-anchor": "end", class: L.id === "space" ? "svgsmall w" : "svgsmall" }, svg);
    });

    var jar = sv("svg", { viewBox: "0 0 360 170", class: "board small", "aria-label": "ベルジャー" }, c.stage);
    sv("text", { x: 180, y: 18, "text-anchor": "middle", class: "svgsmall", text: "ガラスの いれもの から くうきを ぬくと？" }, jar);
    var dots = sv("g", null, jar);
    for (var k = 0; k < 40; k++) sv("circle", { cx: 130 + (k * 37) % 100, cy: 50 + (k * 23) % 90, r: 3, fill: "#91a7ff" }, dots);
    sv("path", { d: "M120 150 L120 60 Q120 32 180 32 Q240 32 240 60 L240 150 Z", fill: "rgba(208,235,255,.35)", stroke: "#74c0fc", "stroke-width": 3 }, jar);
    sv("rect", { x: 100, y: 150, width: 160, height: 12, rx: 4, fill: "#868e96" }, jar);
    var jbell = sv("text", { x: 180, y: 112, "text-anchor": "middle", "font-size": 40, text: "🔔" }, jar);
    var jring = sv("circle", { cx: 180, cy: 98, r: 30, fill: "none", stroke: "#4263eb", "stroke-width": 3, opacity: 0 }, jar);
    sv("text", { x: 300, y: 112, "text-anchor": "middle", "font-size": 34, text: "👂" }, jar);
    var jlab = sv("text", { x: 300, y: 145, "text-anchor": "middle", class: "svgsmall" }, jar);

    c.btn("🔔 3つ どうじに ならす", race, "big2");
    var jarCtl = c.h("div", { class: "card2" }, null, c.ctrl);
    c.h("p", { class: "small" }, "🫙 ガラスの いれもの（ベルジャー）", jarCtl);
    c.slider({ parent: jarCtl, label: "なかの {空気|くうき}", left: "ぬく", right: "いっぱい", min: 0, max: 100, step: 10, value: air, input: function (v) { air = v; drawJar(); } });
    c.btn("🔔 なかの ベルを ならす", ringJar, "sub", jarCtl);
    c.say("「3つ どうじに ならす」を おして、どこに さきに とどくか {見|み}て みよう");

    function race() {
      if (run) return;
      run = { t0: performance.now(), got: {} };
      lanes.forEach(function (L) { L.res.textContent = ""; });
    }
    function drawJar() {
      Array.prototype.forEach.call(dots.children, function (d, i) { d.setAttribute("opacity", i < air * 0.4 ? 1 : 0); });
      jlab.textContent = air === 0 ? "（くうき なし）" : "くうき " + air + "%";
    }
    function ringJar() {
      // ほんとうの ベルジャーでは すこし のこるが、ここでは くうきに あわせて ちいさく する
      A.bell(air / 100);
      var t = 0, shake = setInterval(function () {
        t++; jbell.setAttribute("transform", "rotate(" + (t % 2 ? 12 : -12) + " 180 98)");
        jring.setAttribute("r", 30 + t * 4); jring.setAttribute("opacity", (air / 100) * Math.max(0, 1 - t / 10));
        if (t > 10) { clearInterval(shake); jbell.removeAttribute("transform"); jring.setAttribute("opacity", 0); }
      }, 60);
      c.after(800, function () { clearInterval(shake); });
      if (air >= 80) jarRang.full = true;
      if (air <= 20) jarRang.empty = true;
      c.say(air === 0 ? "ベルは ふるえて いるのに、{音|おと}が きこえない！" : air < 50 ? "{音|おと}が ちいさく なったね" : "チリーン！ よく きこえるね");
      if (jarRang.full && jarRang.empty) c.found("nuku");
    }
    c.loop(function () {
      if (!run) return;
      var t = (performance.now() - run.t0) / 1000;
      lanes.forEach(function (L) {
        var shake = t < 1.2 ? (Math.floor(t * 20) % 2 ? 10 : -10) : 0;
        L.bell.setAttribute("transform", shake ? "rotate(" + shake + " 36 " + L.y + ")" : "");
        var tt = P.travelTime(D, L.id), u = Math.min(1, t / tt);
        if (L.id === "space") {
          if (t > 1.2 && !run.got.space) L.res.textContent = "？ なにも きこえない";
          return;
        }
        var x = X1 + (X2 - X1) * u;
        L.ring.setAttribute("d", "M" + (x - 6) + " " + (L.y - 22) + " Q" + (x + 10) + " " + L.y + " " + (x - 6) + " " + (L.y + 22));
        L.ring.setAttribute("opacity", u < 1 ? 0.8 : 0);
        if (u >= 1 && !run.got[L.id]) {
          run.got[L.id] = true;
          A.bell(0.8, L.id === "water");
          L.res.textContent = "きこえた！ " + tt.toFixed(1) + "びょう";
          if (L.id === "water") c.say("🤿 {水|みず}の なかが さきに とどいた！");
        }
      });
      if (run.got.air) {
        run = null;
        c.found("mizu"); c.found("uchu");
        c.say("{水|みず}は やく 1{秒|びょう}、{空気|くうき}は やく 4.4{秒|びょう}。{宇宙|うちゅう}には とどかなかったね");
      }
    });
    drawJar();
  }
});
