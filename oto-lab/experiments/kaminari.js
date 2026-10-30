/* じっけん 5: かみなりの きょり
   ひかりは ほぼ いっしゅんで とどき、おとは 1びょうで やく 340m すすむ。
   ピカッ から ゴロゴロ までの びょうすう × 340 = きょり（OtoPhys.thunderDistance） */
OtoLab.add({
  id: "kaminari", emoji: "⚡", color: "#f59f00",
  title: "かみなりの きょり",
  yosou: {
    q: "かみなりの「ピカッ」と「ゴロゴロ」、さきに とどくのは どっち？",
    choices: [{ t: "ピカッ（{光|ひかり}）", ok: true }, { t: "ゴロゴロ（{音|おと}）" }, { t: "いっしょ" }],
    why: "{光|ひかり}は とても はやく、ほとんど いっしゅんで とどく。{音|おと}は 1{秒|びょう}で やく 340m しか すすまないので あとから くるよ。"
  },
  findings: [
    { id: "saki", t: "{光|ひかり}が さきに とどき、{音|おと}は あとから くる" },
    { id: "keisan", t: "{秒|びょう}の かず × 340m で かみなりまでの きょりが わかる" },
    { id: "tooi", t: "とおい かみなり ほど ゴロゴロが おそく くる" }
  ],
  matome: [
    "{音|おと}は {空気|くうき}の なかを 1{秒|びょう}で やく 340m すすむ（{気温|きおん}で すこし かわる）。",
    "{光|ひかり}は ほとんど いっしゅんで とどくので、ピカッから ゴロゴロまでの {秒|びょう}の かず × 340m で、かみなりまでの きょりが わかる。"
  ],
  more: "{気温|きおん}が 1℃ あがると {音|おと}は 1{秒|びょう}に やく 0.6m はやく なる（0℃ で やく 331m、15℃ で やく 340m）。はなびの「ドーン」も おくれて きこえるね。",
  safety: "⚡ ほんとうの かみなりの ときは、ゴロゴロが きこえたら もう あぶない きょり。すぐに たてものや くるまの なかに はいろう。",
  mount: function (c) {
    var P = c.P, A = c.A, sv = c.sv;
    var state = "idle", T = 0, dist = 0, tFlash = 0, sw = { run: false, t0: 0, v: 0 }, heard = false, hist = [], auto = false;
    var svg = sv("svg", { viewBox: "0 0 360 250", class: "board", "aria-label": "かみなり" }, c.stage);
    var sky = sv("rect", { x: 0, y: 0, width: 360, height: 250, fill: "#1c2340" }, svg);
    var bolt = sv("path", { fill: "#fff3bf", stroke: "#ffd43b", "stroke-width": 2, opacity: 0 }, svg);
    sv("path", { d: "M0 190 L40 170 L70 182 L110 160 L150 178 L190 165 L230 180 L270 158 L310 176 L360 166 L360 250 L0 250 Z", fill: "#2b3255" }, svg);
    for (var i = 0; i < 9; i++) {
      var bx = 10 + i * 40, bh = 30 + (i * 37) % 40;
      sv("rect", { x: bx, y: 250 - bh, width: 30, height: bh, fill: "#343c66" }, svg);
      sv("rect", { x: bx + 8, y: 256 - bh, width: 6, height: 6, fill: "#ffe066", opacity: .8 }, svg);
    }
    var flashR = sv("rect", { x: 0, y: 0, width: 360, height: 250, fill: "#fff", opacity: 0 }, svg);
    var goro = sv("text", { x: 180, y: 120, "text-anchor": "middle", class: "svggoro", opacity: 0, text: "ゴロゴロ…" }, svg);
    var info = sv("text", { x: 180, y: 30, "text-anchor": "middle", class: "svgtipw", text: "「かみなりを まつ」を おしてね" }, svg);

    var swBox = c.h("div", { class: "stopwatch" }, null, c.ctrl);
    var swV = c.h("span", { class: "swv" }, "0.0", swBox);
    c.h("span", { class: "swu" }, "{秒|びょう}", swBox);
    var swB = c.btn("⏱ ピカッ！で スタート", toggleSW, "big2");
    var waitB = c.btn("⛈️ かみなりを まつ", wait, "sub");
    var calc = c.h("div", { class: "card2 calc", hidden: "" }, null, c.ctrl);
    var autoL = c.h("label", { class: "check" }, null, c.ctrl);
    var autoC = c.h("input", { type: "checkbox" }, null, autoL);
    c.h("span", null, "じどうで はかる（ちいさい こ むけ）", autoL);
    autoC.addEventListener("change", function () { auto = autoC.checked; });
    c.say("ピカッと {光|ひか}ったら ストップウォッチを スタート、ゴロゴロと きこえたら ストップ！");

    function wait() {
      if (state === "wait" || state === "flash") return;
      state = "wait"; heard = false; calc.hidden = true; sw.run = false; sw.v = 0; swV.textContent = "0.0"; swB.innerHTML = c.rb("⏱ ピカッ！で スタート");
      // つぎの かみなりは 2〜8びょう（680〜2720m）。まえと おなじ くらい に ならない ように
      do { T = Math.round((2 + Math.random() * 6) * 10) / 10; } while (hist.length && Math.abs(T - hist[hist.length - 1]) < 1.5);
      dist = Math.round(P.thunderDistance(T));
      info.textContent = "くもが ゴロゴロ… じっと まってね";
      c.after(900 + Math.random() * 1500, flash);
    }
    function flash() {
      state = "flash"; tFlash = performance.now();
      var s = Math.max(0.35, 1 - T / 10), x = 60 + Math.random() * 240, y0 = 170 - 150 * s;
      bolt.setAttribute("d", "M" + x + " " + y0 + " l" + (-14 * s) + " " + (60 * s) + " l" + (14 * s) + " 0 l" + (-18 * s) + " " + (70 * s) + " l" + (34 * s) + " " + (-84 * s) + " l" + (-14 * s) + " 0 l" + (12 * s) + " " + (-46 * s) + " Z");
      bolt.setAttribute("opacity", 1); flashR.setAttribute("opacity", .85);
      info.textContent = "ピカッ！";
      c.after(90, function () { flashR.setAttribute("opacity", .2); });
      c.after(160, function () { flashR.setAttribute("opacity", .6); });
      c.after(260, function () { flashR.setAttribute("opacity", 0); bolt.setAttribute("opacity", 0); });
      if (auto) startSW();
      c.after(T * 1000, rumble);
    }
    function rumble() {
      heard = true; state = "goro";
      A.rumble(Math.max(0, 1 - T / 8));
      goro.setAttribute("opacity", 1); info.textContent = "ゴロゴロ…";
      c.after(2500, function () { goro.setAttribute("opacity", 0); });
      c.found("saki");
      if (auto && sw.run) stopSW();
      c.after(5000, function () { if (state === "goro") { state = "idle"; if (sw.run) stopSW(); } });
    }
    function startSW() { sw.run = true; sw.t0 = performance.now(); swB.innerHTML = c.rb("⏹ ゴロゴロ！で ストップ"); }
    function stopSW() {
      sw.run = false; swB.innerHTML = c.rb("⏱ ピカッ！で スタート");
      sw.v = Math.round((performance.now() - sw.t0) / 100) / 10; swV.textContent = sw.v.toFixed(1);
      if (!heard) { c.say("まだ ゴロゴロは きて いないよ。もう いちど まって みよう"); return; }
      state = "idle";
      var est = Math.round(P.thunderDistance(sw.v));
      calc.hidden = false;
      calc.innerHTML = c.rb("🧮 " + sw.v.toFixed(1) + "{秒|びょう} × 340m ＝ <b>やく " + est + "m</b><br>ほんとうは やく " + dist + "m（" + T.toFixed(1) + "{秒|びょう}）" +
        (Math.abs(sw.v - T) <= 0.6 ? "　⭕ じょうず！" : "") + "<br>" + (dist >= 1000 ? "やく " + (Math.round(dist / 100) / 10) + "km さき だね" : ""));
      c.found("keisan");
      hist.push(T);
      if (hist.length >= 2) c.found("tooi");
      c.say(hist.length >= 2 ? "まえの かみなりと くらべて みよう。とおい ほど ゴロゴロが おそいね" : "もう いちど「かみなりを まつ」で、ちがう きょりも はかって みよう");
    }
    function toggleSW() { if (sw.run) stopSW(); else startSW(); }
    c.loop(function () { if (sw.run) swV.textContent = ((performance.now() - sw.t0) / 1000).toFixed(1); });
    void sky; void waitB; void tFlash;
  }
});
