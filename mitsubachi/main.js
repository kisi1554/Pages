/* ミツバチの いちにち ｜ ホーム・ボタン・1にちの ながれ */
(function () {
  "use strict";
  const MB = window.MB, App = MB.App, A = MB.Art, $ = App.$, S = App.S;

  /* ---------------------------------------------------------------- ホーム */
  function renderHome() {
    const ji = MB.jobForAge(S.age), job = MB.JOBS[ji];
    $("meLine").textContent = "はたらきバチ " + S.age + "にちめ";
    $("nowLine").innerHTML = "いまの しごと: <b>" + job.em + " " + job.name + "</b>" + (S.days ? "・そとで はたらいた 日 " + S.days + "にち" : "");
    $("jobLine").innerHTML = MB.JOBS.map((j, i) =>
      '<div class="job' + (i === ji ? " cur" : S.jobsDone[j.id] ? " done" : "") + '"><span class="je">' + j.em + "</span>" + j.name + '<span class="jd">' + j.chip + "にち</span></div>").join("");
    const tr = App.TRIPS[S.trip % 3];
    $("fieldSub").textContent = tr.em + " " + tr.label + " の はなあつめ。みつを あつめて 8のじダンス";
    $("hiveEm").textContent = job.id === "forage" ? "🏠" : job.em;
    $("hiveSub").textContent = job.id === "forage" ? "もう そとの しごとの としごろ。まえの しごとも やりなおせる" : S.age + "にちめ: " + job.name;
    const fr = MB.FLOWERS.filter((f) => S.fruits[f.id]).length;
    const recs = [["🍓", "み の しゅるい", fr + " / " + MB.FLOWERS.length], ["🍯", "みつを はこんだ", S.honey + "かい"], ["💃", "ダンス せいこう", S.dance.ok + "かい"], ["❓", "クイズ せいかい", S.quiz.ok + "もん"]];
    $("recLine").innerHTML = recs.map((c) => '<div class="stat"><span class="v">' + c[0] + " " + c[2] + '</span><span class="k">' + c[1] + "</span></div>").join("");
    $("safeLine").textContent = MB.SAFE;
    const hc = $("heroCv"), g = hc.getContext("2d");
    g.clearRect(0, 0, 300, 150);
    A.flower(g, 60, 95, 30, "ringo", {}); A.flower(g, 245, 105, 24, "kyuri", {});
    A.bee(g, 150, 70, 38, 0.5, { flap: 0.6, happy: true, pollen: "#ffc400" });
  }
  MB.Home = { render: renderHome };

  /* ---------------------------------------------------------------- 1にちの ながれ */
  function nextTrip() {
    S.trip = (S.trip + 1) % 3;
    if (S.trip === 0) {
      S.days++;
      if (S.age >= MB.JOBS[MB.JOBS.length - 1].from) S.age++;
      App.save();
      App.modal('<p class="big-em">🌙</p><h2>1にち おしまい</h2>' +
        "<p>きょうは " + App.TRIPS.map((t) => t.label).join("・") + " に はなを まわって、ダンスで なかまに おしえたね。</p>" +
        '<p class="soft">よるは すの なかで やすむよ。ミツバチは ひるまに はたらいて、くらく なると すに かえる。</p>' +
        '<div class="row"><button type="button" class="btn" id="eHome">🏠 ホーム</button><button type="button" class="btn main" id="eNext">🌅 つぎの あさ</button></div>');
      $("eHome").onclick = () => { App.closeModal(); App.go("home"); };
      $("eNext").onclick = () => { App.closeModal(); App.go("field"); };
      return;
    }
    App.save();
    App.go("field");
  }

  function help() {
    App.modal('<h2>🐝 ミツバチの いちにち</h2><ol class="howto">' +
      "<li><b>はなばたけ</b>: ゆびで ハチを うごかして はなに とまろう。みつを すうと、からだに <b>かふん</b> が つく。<b>おなじ しゅるいの べつの はな</b> へ はこぶと、しばらくして <b>み</b> が なるよ（じゅふん）。</li>" +
      "<li>みつが いっぱいに なったら まんなかの すばこへ。<b>8のじ ダンス</b> で なかまに はなばたけを おしえよう。すいたの <b>まうえ ＝ たいようの ほう</b>、まっすぐ すすむ むき ＝ はなの ほう、<b>ながく なぞる ほど とおい</b>。すぐ ちかく なら <b>まるく まわる</b>。</li>" +
      "<li><b>すの なかの しごと</b>: うまれた ばかりの はたらきバチは そうじ → こそだて → すづくり → はちみつづくり → もんばん → そとの しごと と、ひが たつと しごとが かわる。</li>" +
      "<li>すの なかで <b>じょおうバチ</b> や <b>オスバチ</b> に あったら タップ してね。</li>" +
      "<li><b>ダンス クイズ</b>: なかまの ダンスを みて、はなばたけを あてよう。</li></ol>" +
      '<p class="soft">🐝 ' + MB.SAFE + "</p>" +
      '<button type="button" class="btn main" data-close>はじめる</button>', false, () => { S.helped = true; App.save(); });
  }

  /* ---------------------------------------------------------------- ボタン */
  function syncSound() {
    MB.Sound.on = S.sound; $("btnSound").textContent = S.sound ? "🔊" : "🔇"; $("btnSound").classList.toggle("off", !S.sound);
    $("btnBgm").classList.toggle("off", !S.bgm);
  }
  $("btnSound").onclick = () => { S.sound = !S.sound; App.save(); syncSound(); if (!S.sound) MB.Sound.buzz(0); MB.Sound.tap(); };
  $("btnBgm").onclick = () => { S.bgm = !S.bgm; App.save(); syncSound(); MB.Sound.setBgm(S.bgm); };
  $("btnHome").onclick = () => { App.closeModal(); App.go("home"); };
  $("btnZukan").onclick = () => MB.Zukan.open();
  $("goZukan").onclick = () => MB.Zukan.open();
  $("goField").onclick = () => { MB.Sound.ensure(); if (S.bgm) MB.Sound.setBgm(true); App.go("field"); };
  $("goHive").onclick = () => {
    MB.Sound.ensure(); if (S.bgm) MB.Sound.setBgm(true);
    const ji = MB.jobForAge(S.age);
    if (MB.JOBS[ji].id !== "forage") { App.go("hive", { job: ji }); return; }
    // ぜんぶ おわったら すきな しごとを えらぶ
    App.modal("<h2>🏠 どの しごとを する？</h2><p class='soft'>もう そとの しごとの としごろ。わかい ころの しごとも やって みよう。</p>" +
      MB.JOBS.slice(0, -1).map((j, i) => '<button type="button" class="btn" data-j="' + i + '">' + j.em + " " + j.name + "（" + j.days + "）</button>").join("") +
      '<button type="button" class="btn main" data-close>とじる</button>');
    document.querySelectorAll("[data-j]").forEach((b) => (b.onclick = () => { App.closeModal(); App.go("hive", { job: +b.dataset.j }); }));
  };
  $("goQuiz").onclick = () => { MB.Sound.ensure(); App.go("quiz"); };
  $("goHelp").onclick = help;
  $("btnReset").onclick = () => {
    App.modal("<h2>さいしょから？</h2><p>1にちめの はたらきバチに もどるよ。ずかんの み も きえるよ。</p>" +
      '<div class="row"><button type="button" class="btn" data-close>やめる</button><button type="button" class="btn main" id="rYes">さいしょから</button></div>');
    $("rYes").onclick = () => { App.reset(); App.closeModal(); renderHome(); };
  };

  MB.Main = { nextTrip, help };
  syncSound();
  renderHome();
  if (!S.helped) help();

  // テスト用（Playwright から つかう）
  window.__mitsu = {
    S, App, DANCE: window.DANCE,
    go: (n, o) => App.go(n, o),
    scene: () => App.scenes[App.sceneName],
    tick: (sec) => App.tick(sec),
  };
})();
