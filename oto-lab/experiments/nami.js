/* じっけん 7: 音の なみを 見よう
   ごうせいおん（マイク なし）: たかさ・おおきさ を かえて なみを みる
   マイク（せってい で おうちの ひとが どうい した とき だけ）: getUserMedia → AnalyserNode で えに する だけ。
   ろくおん・ほぞん・そうしん は しない（スピーカーにも つながない）。がめんを はなれたら すぐ とめる */
OtoLab.add({
  id: "nami", emoji: "〰️", color: "#7048e8",
  title: "{音|おと}の なみを {見|み}よう",
  yosou: {
    q: "{高|たか}い {音|おと}の なみは、ひくい {音|おと}の なみと くらべて どう みえる？",
    choices: [{ t: "なみが こまかい（ぎっしり）", ok: true }, { t: "なみが ゆったり" }, { t: "おなじ" }],
    why: "{高|たか}い {音|おと}は 1{秒|びょう}に ふるえる かずが おおいので、なみが こまかく ぎっしり ならぶよ。"
  },
  findings: [
    { id: "koma", t: "{高|たか}い {音|おと}は なみが こまかい、ひくい {音|おと}は ゆったり" },
    { id: "ookii", t: "{大|おお}きい {音|おと}は なみの {高|たか}さ（ふれはば）が {大|おお}きい" },
    { id: "koe", t: "じぶんの {声|こえ}の なみも {見|み}た（マイク）" }
  ],
  matome: [
    "{音|おと}は {空気|くうき}の ふるえ。ふるえを えに すると なみの かたちに なる。",
    "{大|おお}きい {音|おと}ほど なみが {高|たか}く（ふるえが {大|おお}きく）、{高|たか}い {音|おと}ほど なみが こまかい（ふるえが はやい）。"
  ],
  more: "1{秒|びょう}に ふるえる かずを「しんどうすう」（ヘルツ）と いうよ。{人|ひと}の {耳|みみ}は やく 20〜20000ヘルツの {音|おと}が きこえる。",
  mount: function (c) {
    var A = c.A, S = window.OtoScope;
    var mode = "synth", f = 300, amp = 0.6, held = null, phase = 0, seen = { lo: false, hi: false, big: false, small: false };
    var mic = null, buf = null, micLevel = 0;
    var cv = c.h("canvas", { class: "scope", "aria-label": "おとの なみ" }, null, c.stage);
    var cap = c.h("p", { class: "scopecap" }, "", c.stage);
    var lv = c.h("div", { class: "meter" }, null, c.stage);
    c.h("span", { class: "ml" }, "{音|おと}の {大|おお}きさ", lv);
    var lvBar = c.h("span", { class: "bar" }, null, lv), lvFill = c.h("i", null, null, lvBar);

    c.seg([{ t: "🎹 つくった {音|おと}", v: "synth" }, { t: "🎤 マイク", v: "mic" }], mode, function (v) { mode = v; ui(); });
    var synthBox = c.h("div", null, null, c.ctrl), micBox = c.h("div", { class: "card2" }, null, c.ctrl);
    function fOf(v) { return 150 * Math.pow(1000 / 150, v / 100); }
    function vOf(fr) { return Math.round(100 * Math.log(fr / 150) / Math.log(1000 / 150)); }
    var fSl = c.slider({ parent: synthBox, label: "{音|おと}の {高|たか}さ", left: "ひくい", right: "{高|たか}い", min: 0, max: 100, value: vOf(f), input: function (v) { f = fOf(v); upd(); } });
    var aSl = c.slider({ parent: synthBox, label: "{音|おと}の {大|おお}きさ", left: "ちいさい", right: "{大|おお}きい", min: 5, max: 100, value: amp * 100, input: function (v) { amp = v / 100; upd(); } });
    var r = c.row(synthBox);
    c.btn("🐘 ボー（ひくい）", function () { f = 160; fSl.value = vOf(f); upd(); }, "sub", r);
    c.btn("🐦 ピー（{高|たか}い）", function () { f = 900; fSl.value = vOf(f); upd(); }, "sub", r);
    var playB = c.btn("▶ {音|おと}を だす", function () {
      if (held) { held.stop(); held = null; } else held = A.hold(f, amp);
      playB.innerHTML = c.rb(held ? "⏹ {音|おと}を とめる" : "▶ {音|おと}を だす");
      if (!held && !A.on) c.say("🔇 {音|おと}が オフ だよ。なみの えは {見|み}られるよ");
    }, "", synthBox);
    void aSl;

    function upd() {
      if (held) held.set(f, amp);
      if (f <= 250) seen.lo = true; if (f >= 600) seen.hi = true;
      if (amp >= 0.8) seen.big = true; if (amp <= 0.3) seen.small = true;
      if (seen.lo && seen.hi) c.found("koma");
      if (seen.big && seen.small) c.found("ookii");
    }
    function ui() {
      synthBox.hidden = mode !== "synth"; micBox.hidden = mode !== "mic";
      if (mode === "synth") { stopMic(); c.say("{高|たか}さと {大|おお}きさを かえて、なみが どう かわるか {見|み}て みよう"); return; }
      if (held) { held.stop(); held = null; playB.innerHTML = c.rb("▶ {音|おと}を だす"); }
      micBox.innerHTML = "";
      if (!c.lab.mic) {
        c.h("p", null, "🎤 マイクを つかうには、おうちの ひとに ⚙️ せってい で「どうい」して もらってね。", micBox);
        c.btn("⚙️ せってい を ひらく", c.openSettings, "sub", micBox);
        c.say("マイク なし でも「🎹 つくった {音|おと}」で おなじ じっけんが できるよ");
        return;
      }
      if (mic) { micOn(); return; }
      c.h("p", { class: "small" }, "マイクの {音|おと}は この たんまつの なかで なみの えに する だけ。ろくおん・ほぞん・おくる ことは しないよ。", micBox);
      c.btn("🎤 マイクで ためす", startMic, "", micBox);
      c.say("「アー」と {高|たか}い {声|こえ}・ひくい {声|こえ}、{大|おお}きい {声|こえ}・ちいさい {声|こえ}を だして くらべよう");
    }
    function micOn() {
      micBox.innerHTML = "";
      c.h("p", { class: "micon" }, "🔴 マイク オン（ろくおん は して いないよ）", micBox);
      c.btn("⏹ マイクを とめる", function () { stopMic(); ui(); }, "stop", micBox);
    }
    function startMic() {
      var md = navigator.mediaDevices;
      if (!md || !md.getUserMedia) { c.say("この ブラウザでは マイクが つかえないよ。「🎹 つくった {音|おと}」で ためそう"); return; }
      md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (stream) {
        if (mode !== "mic" || dead) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        var Ctor = window.AudioContext || window.webkitAudioContext, ac = new Ctor();
        var src = ac.createMediaStreamSource(stream), an = ac.createAnalyser();
        an.fftSize = 2048; src.connect(an); // スピーカー（destination）には つながない
        mic = { stream: stream, ac: ac, src: src, an: an };
        buf = new Float32Array(an.fftSize);
        if (ac.state === "suspended") ac.resume();
        micOn();
        c.say("🎤「アー」と {声|こえ}を だして みよう");
      }).catch(function () {
        c.say("マイクが つかえなかったよ。「🎹 つくった {音|おと}」で ためそう");
      });
    }
    function stopMic() {
      if (!mic) return;
      mic.stream.getTracks().forEach(function (t) { t.stop(); });
      try { mic.src.disconnect(); mic.ac.close(); } catch (e) { /* もう とじた */ }
      mic = null; buf = null;
    }
    var dead = false;
    c.loop(function (dt) {
      var level;
      if (mode === "mic" && mic) {
        mic.an.getFloatTimeDomainData(buf);
        var rms = S.drawData(cv, buf, mic.ac.sampleRate);
        micLevel = Math.max(rms, micLevel * 0.9);
        level = Math.min(1, micLevel * 6);
        if (rms > 0.03) c.found("koe");
        cap.innerHTML = c.rb("よこはば: 0.02{秒|びょう}（50ぶんの 1{秒|びょう}）の なみ");
      } else {
        phase += dt * 0.6;
        S.drawSynth(cv, f, mode === "synth" ? amp : 0, phase);
        level = mode === "synth" ? amp : 0;
        cap.innerHTML = c.rb(mode === "synth" ? "よこはば 0.02{秒|びょう}に なみが <b>" + Math.round(f * S.WINDOW) + "こ</b>（1{秒|びょう}に " + Math.round(f) + "かい ふるえる）" : "マイクを まって いるよ");
      }
      lvFill.style.width = (level * 100).toFixed(0) + "%";
    });
    ui();
    return function () { dead = true; stopMic(); if (held) held.stop(); };
  }
});
