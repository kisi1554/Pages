/* しずくの だいぼうけん — 画面の きりかえ・ほぞん・スタンプ */
(function () {
  const KEY = "mizu-no-tabi-v1";
  const $ = function (s) { return document.querySelector(s); };
  const rb = function (s) { return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>"); };

  let D = { stamps: { kawa: 0, chika: 0, machi: 0, yuki: 0, lab: 0, quiz: 0 }, laps: 0, found: {}, quizBest: 0, sound: true, speech: true };
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) D = Object.assign(D, s, { stamps: Object.assign(D.stamps, s.stamps || {}) }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }

  const STAMPS = [
    ["kawa", "🏞️", "かわ ルート"], ["chika", "⛲", "ちかすい ルート"], ["machi", "🚰", "まち ルート"],
    ["yuki", "❄️", "ゆきの みち"], ["lab", "🧪", "じっけん はかせ"], ["quiz", "🎓", "クイズ はかせ"]
  ];

  Snd.on = D.sound; Say.on = D.speech;
  function syncBtns() {
    $("#sndBtn").textContent = D.sound ? "🔊" : "🔇"; $("#sndBtn").classList.toggle("off", !D.sound);
    $("#spkBtn").classList.toggle("off", !D.speech); $("#spkBtn").setAttribute("aria-pressed", D.speech);
  }
  $("#sndBtn").onclick = function () { D.sound = !D.sound; Snd.on = D.sound; if (D.sound) { Snd.unlock(); Snd.pochan(); } save(); syncBtns(); };
  $("#spkBtn").onclick = function () { D.speech = !D.speech; Say.on = D.speech; if (D.speech) Say.speak("よみあげ オン"); save(); syncBtns(); };
  syncBtns();

  Story.init({ $: $, rb: rb, onLap: function (route, snow) {
    const got = [];
    D.laps++;
    STAMPS.forEach(function (s) { if (s[0] === route || (snow && s[0] === "yuki")) { if (!D.stamps[s[0]]) got.push(s[1] + " " + s[2] + " ゲット！"); D.stamps[s[0]]++; } });
    if (!got.length) got.push("🌊 " + D.laps + "しゅうめ！");
    save(); return got;
  } });
  Lab.init({ $: $, rb: rb, found: D.found, onFind: function (k) {
    D.found[k] = 1;
    if (Object.keys(D.found).length >= 5 && !D.stamps.lab) { D.stamps.lab = 1; Snd.fanfare(); }
    save();
  } });
  Quiz.init({ $: $, rb: rb, onDone: function (score) { D.quizBest = Math.max(D.quizBest, score); if (score >= 8) D.stamps.quiz++; save(); } });

  function renderStamps() {
    $("#stampGrid").innerHTML = STAMPS.map(function (s) {
      const n = D.stamps[s[0]] || 0;
      return '<div class="st ' + (n ? "got" : "") + '"><span class="em">' + (n ? s[1] : "❔") + "</span><b>" + s[2] + "</b><small>" + (n ? n + "かい" : "まだ") + "</small></div>";
    }).join("");
    $("#lapCount").innerHTML = "🌍 ちきゅう " + D.laps + "しゅう ／ わかった こと " + Object.keys(D.found).length + " / 6 ／ クイズ さいこう " + D.quizBest + " / 10" +
      "<br><small>じっけん はかせ: わかった こと 5つ いじょう。クイズ はかせ: 8もん いじょう せいかい。</small>";
    $("#homeStamps").innerHTML = "🏅 スタンプ " + STAMPS.filter(function (s) { return D.stamps[s[0]]; }).length + " / " + STAMPS.length;
  }

  // ホームの ぽた
  const hc = $("#heroCv"), hx = hc.getContext("2d");
  let heroT = 0, heroOn = false;
  function hero() {
    if (!heroOn) return;
    heroT += 0.016; hx.clearRect(0, 0, 160, 160);
    drawPota(hx, 80, 92, 40, "drop", Math.floor(heroT / 3) % 2 ? "yay" : "happy", heroT);
    requestAnimationFrame(hero);
  }

  function route() {
    const v = (location.hash || "#home").slice(1);
    const name = ["home", "tabi", "lab", "quiz", "stamps"].indexOf(v) >= 0 ? v : "home";
    document.querySelectorAll(".view").forEach(function (s) { s.hidden = s.id !== "v-" + name; });
    document.body.dataset.view = name;
    Say.cancel();
    Story.show(name === "tabi");
    Lab.show(name === "lab");
    if (name === "quiz") Quiz.start();
    if (name === "home" || name === "stamps") renderStamps();
    heroOn = name === "home"; if (heroOn) hero();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  document.addEventListener("pointerdown", function () { Snd.unlock(); }, { once: true });
  route();

  window.MizuTest = { story: Story.test, lab: Lab.test, data: function () { return D; } };
})();
