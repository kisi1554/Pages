/* じっけん 1: わゴム ギター
   ふるえる ながさ（はしら から くぎ まで）・はり・はじく つよさ を かえて、たかさ と おおきさ を くらべる
   たかさ は OtoPhys.stringFreq（みじかい／はりが つよい ほど たかい）。つよさ は ふるえの はば だけ */
OtoLab.add({
  id: "gomu", emoji: "🎸", color: "#ae3ec9",
  title: "わゴム ギター",
  yosou: {
    q: "わゴムの ふるえる ところを みじかく すると、{音|おと}は どう なる？",
    choices: [{ t: "たかく なる", ok: true }, { t: "ひくく なる" }, { t: "かわらない" }],
    why: "みじかい ゴムは はやく（こまかく）ふるえるので {高|たか}い {音|おと}に なるよ。"
  },
  findings: [
    { id: "furue", t: "はじくと ゴムが ふるえて {音|おと}が でる" },
    { id: "tomeru", t: "ふるえを ゆびで とめると {音|おと}も とまる" },
    { id: "nagasa", t: "みじかく すると {高|たか}い {音|おと}に なる" },
    { id: "hari", t: "ピンと はると {高|たか}い {音|おと}に なる" },
    { id: "tsuyosa", t: "つよく はじくと ふるえが おおきく、{音|おと}も {大|おお}きい" }
  ],
  matome: [
    "{音|おと}が でて いる とき、ゴムは ふるえて いる。ふるえを とめると {音|おと}も とまる。",
    "つよく はじくと ふるえが おおきく なって、{音|おと}が {大|おお}きく なる。",
    "ふるえる ところが みじかい ほど、ピンと はる ほど、{音|おと}は {高|たか}く なる。"
  ],
  more: "ギターや バイオリンも おなじ しくみ。{弦|げん}を ゆびで おさえて みじかく したり、ペグを まわして はりを かえて、{音|おと}の {高|たか}さを きめて いるよ。",
  mount: function (c) {
    var P = c.P, A = c.A, sv = c.sv;
    var NX = 30, Y = 120, SLOW = 100;
    var bx = 330, tension = 1.4, amp = 0, phase = 0, freq = 0, voice = null, pull = null, plucks = [];
    var svg = sv("svg", { viewBox: "0 0 360 230", class: "board drag", "aria-label": "わゴム ギター" }, c.stage);
    var defs = sv("defs", null, svg), lg = sv("linearGradient", { id: "wood", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: 0, "stop-color": "#e9c48f" }, lg); sv("stop", { offset: 1, "stop-color": "#c8955a" }, lg);
    sv("rect", { x: 8, y: 70, width: 344, height: 110, rx: 14, fill: "url(#wood)", stroke: "#9c6b35", "stroke-width": 3 }, svg);
    sv("ellipse", { cx: 180, cy: 152, rx: 34, ry: 16, fill: "#5c3a1a", opacity: .75 }, svg);
    sv("circle", { cx: NX, cy: Y, r: 7, fill: "#868e96", stroke: "#495057", "stroke-width": 2 }, svg);
    sv("circle", { cx: 336, cy: Y, r: 7, fill: "#868e96", stroke: "#495057", "stroke-width": 2 }, svg);
    var env1 = sv("path", { class: "envl" }, svg), env2 = sv("path", { class: "envl" }, svg);
    var rest = sv("line", { y1: Y, y2: Y, x2: 336, class: "band dim" }, svg);
    var band = sv("path", { class: "band" }, svg);
    var hit = sv("rect", { y: Y - 34, height: 68, fill: "transparent", style: "cursor:pointer" }, svg);
    var bridge = sv("g", { style: "cursor:ew-resize" }, svg);
    sv("rect", { x: -16, y: Y - 2, width: 32, height: 64, fill: "transparent" }, bridge);
    sv("path", { d: "M-9 " + (Y + 52) + " L0 " + (Y + 2) + " L9 " + (Y + 52) + " Z", fill: "#f8f0fc", stroke: "#862e9c", "stroke-width": 2.5 }, bridge);
    var blab = sv("text", { y: Y + 70, "text-anchor": "middle", class: "svgsmall", text: "はしら" }, bridge);
    var tip = sv("text", { x: 180, y: 40, "text-anchor": "middle", class: "svgtip", text: "ゴムを ひっぱって はなすと はじけるよ" }, svg);
    var slow = sv("text", { x: 180, y: 218, "text-anchor": "middle", class: "svgsmall", text: "" }, svg);

    var meters = c.h("div", { class: "meters" }, null, c.ctrl);
    var mHi = meter("{音|おと}の {高|たか}さ", "ひくい", "たかい"), mLo = meter("{音|おと}の {大|おお}きさ", "ちいさい", "おおきい");
    function meter(lab, l, r) {
      var m = c.h("div", { class: "meter" }, null, meters);
      c.h("span", { class: "ml" }, lab, m);
      var bar = c.h("span", { class: "bar" }, null, m), fill = c.h("i", null, null, bar);
      var ends = c.h("span", { class: "ends" }, "<span>" + l + "</span><span>" + r + "</span>", m);
      void ends; return fill;
    }
    var row = c.row();
    c.btn("👆 そっと はじく", function () { pluck(0.3); }, "sub", row);
    c.btn("💪 つよく はじく", function () { pluck(1); }, "sub", row);
    c.btn("✋ ゆびで とめる", mute, "stop", c.row());
    var bSl = c.slider({ label: "はしらの ばしょ（ふるえる ながさ）", left: "みじかい", right: "ながい", min: 120, max: 330, step: 5, value: bx, input: function (v) { setBridge(v); } });
    c.slider({ label: "ゴムの はり", left: "ゆるい", right: "ピン！", min: 100, max: 225, step: 5, value: tension * 100, input: function (v) { tension = v / 100; } });
    c.say("ゴムを <b>ひっぱって はなす</b> か、ボタンで はじこう。<b>はしら</b>（△）は よこに うごかせるよ");

    function len() { return (bx - NX) / 300; }
    function setBridge(x) { bx = Math.max(120, Math.min(330, x)); bSl.value = bx; if (amp > 0.5) mute(true); draw(); }
    function pluck(s) {
      var a = P.pluckAmp(s);
      freq = P.stringFreq(len(), tension);
      if (voice) voice.stop();
      voice = A.pluck(freq, a);
      amp = 6 + 30 * a; phase = 0;
      plucks.push({ l: len(), t: tension, s: a });
      c.found("furue");
      var ls = plucks.map(function (p) { return p.l; }), ts = plucks.map(function (p) { return p.t; }), ss = plucks.map(function (p) { return p.s; });
      if (Math.max.apply(null, ls) - Math.min.apply(null, ls) >= 0.3) c.found("nagasa");
      if (Math.max.apply(null, ts) - Math.min.apply(null, ts) >= 0.6) c.found("hari");
      if (Math.max.apply(null, ss) >= 0.75 && Math.min.apply(null, ss) <= 0.4) c.found("tsuyosa");
      c.say(a > 0.7 ? "ビヨーン！ ふるえが <b>おおきい</b>。{音|おと}も {大|おお}きいね" : a < 0.4 ? "ぽろん。ふるえが <b>ちいさい</b>。{音|おと}も ちいさいね" : "ビーン！ ゴムが ふるえて いるよ");
      mHi.style.width = (100 * Math.log(freq / 150) / Math.log(900 / 150)).toFixed(0) + "%";
    }
    function mute(silent) {
      var was = amp > 1;
      if (voice) { voice.stop(); voice = null; }
      amp = 0; draw();
      if (was && silent !== true) { c.found("tomeru"); c.say("✋ ぴたっ。ふるえが とまると {音|おと}も とまったね"); }
    }
    function bandPath(dy) {
      var d = "M" + NX + " " + Y, L = bx - NX;
      for (var k = 1; k <= 40; k++) { var u = k / 40; d += " L" + (NX + u * L).toFixed(1) + " " + (Y + dy(u)).toFixed(1); }
      return d;
    }
    function draw() {
      bridge.setAttribute("transform", "translate(" + bx + ",0)");
      rest.setAttribute("x1", bx);
      hit.setAttribute("x", NX); hit.setAttribute("width", bx - NX);
      band.setAttribute("stroke-width", (6.5 - 2 * (tension - 1)).toFixed(1));
      if (pull) {
        band.setAttribute("d", bandPath(function (u) { var p = (pull.x - NX) / (bx - NX); return pull.dy * (u < p ? u / p : (1 - u) / (1 - p)); }));
      } else {
        var w = amp * Math.cos(2 * Math.PI * phase);
        band.setAttribute("d", bandPath(function (u) { return w * Math.sin(Math.PI * u); }));
      }
      var show = amp > 0.6 && !pull;
      env1.setAttribute("d", show ? bandPath(function (u) { return amp * Math.sin(Math.PI * u); }) : "");
      env2.setAttribute("d", show ? bandPath(function (u) { return -amp * Math.sin(Math.PI * u); }) : "");
      slow.textContent = show ? "🐢 " + SLOW + "ばい スローで みせて いるよ" : "";
      tip.style.opacity = amp > 0.6 || pull ? 0 : 1;
      mLo.style.width = Math.min(100, amp / 36 * 100).toFixed(0) + "%";
    }
    // ドラッグ: ゴムを ひっぱる・はしらを うごかす。ふるえて いる ゴムを タップ すると とまる
    var mode = null, start = null;
    svg.addEventListener("pointerdown", function (e) {
      var p = c.svgPt(svg, e);
      if (Math.abs(p.x - bx) < 18 && p.y > Y) mode = "bridge";
      else if (p.x > NX && p.x < bx - 4 && Math.abs(p.y - Y) < 34) { mode = "band"; start = p; }
      else return;
      svg.setPointerCapture(e.pointerId); e.preventDefault();
    });
    svg.addEventListener("pointermove", function (e) {
      if (!mode) return;
      var p = c.svgPt(svg, e);
      if (mode === "bridge") setBridge(Math.round(p.x / 5) * 5);
      else if (Math.abs(p.y - start.y) > 5 || pull) {
        if (!pull && amp > 0.5) mute(true);
        pull = { x: Math.max(NX + 10, Math.min(bx - 10, p.x)), dy: Math.max(-40, Math.min(40, p.y - Y)) }; draw();
      }
    });
    function up() {
      if (mode === "band") {
        if (pull) { var s = Math.abs(pull.dy) / 40; pull = null; pluck(Math.max(0.15, s)); }
        else if (amp > 1) mute(); else pluck(0.5);
      }
      mode = null; draw();
    }
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", function () { pull = null; mode = null; draw(); });

    c.loop(function (dt) {
      if (amp > 0.05) {
        amp *= Math.exp(-dt * freq / 260); phase += dt * freq / SLOW;
        if (amp < 0.3) { amp = 0; mLo.style.width = "0"; }
        draw();
      }
    });
    draw();
  }
});
