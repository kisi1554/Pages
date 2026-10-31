/* ミツバチの いちにち ｜ ずかん（はなと み・からだ・なかま・しごと・ダンス） */
(function () {
  "use strict";
  const MB = window.MB, A = MB.Art, App = MB.App, D = window.DANCE, r = MB.r;
  const TABS = [["fruit", "🍓 はなと み"], ["body", "🐝 からだ"], ["kin", "👑 なかま"], ["job", "🧹 しごと"], ["dance", "💃 ダンス"]];
  let tab = "fruit";

  function canvas(w, h) { return '<canvas width="' + w + '" height="' + h + '"></canvas>'; }

  function body() {
    const S = App.S;
    if (tab === "fruit") {
      const got = MB.FLOWERS.filter((f) => S.fruits[f.id]).length;
      return '<p class="soft">ハチが おなじ しゅるいの はなの かふんを はこぶ（じゅふん）と、みが できる。はたけで みが なった やさい・くだもの: ' + got + " / " + MB.FLOWERS.length + "</p>" +
        '<div class="zgrid">' + MB.FLOWERS.map((f, i) => {
          const n = S.fruits[f.id] || 0;
          return '<div class="zcard' + (n ? "" : " no") + '" data-f="' + i + '">' + canvas(360, 150) +
            '<div class="zn">' + f.name + (n ? " ×" + n : "") + "</div>" +
            '<p class="zo">' + (n ? f.one : "まだ みが できて いないよ。はなばたけで " + f.name + " の はなを 2つ いじょう まわろう。") + "</p></div>";
        }).join("") + "</div>";
    }
    if (tab === "body") {
      return '<canvas class="bodycv" id="bodyCv" width="720" height="380"></canvas>' +
        '<ol class="zlist">' + MB.BODY.map((b) => "<li><b>" + b.k + "</b>: " + b.t + "</li>").join("") + "</ol>" +
        '<p class="soft">からだは あたま・むね・はら の 3つ。あし 6ぽん と はね 4まいは むねから でて いる。</p>';
    }
    if (tab === "kin") {
      return '<div class="zgrid">' + MB.KIN.map((k, i) => {
        const met = k.id === "queen" ? S.met.queen : k.id === "drone" ? S.met.drone : true;
        return '<div class="zcard" data-k="' + i + '">' + canvas(360, 200) + '<div class="zn">' + k.name + (met ? "" : " <small>（すの なかで さがそう）</small>") + "</div>" +
          '<p class="zo">' + k.one + "</p></div>";
      }).join("") + "</div>";
    }
    if (tab === "job") {
      return '<p class="soft">はたらきバチは としを とると しごとが かわる。ひにちは「だいたい」で、むれの ようすで かわる（そとの しごとの ハチが すくないと、わかい ハチが はやめに そとへ でる ことも ある）。</p>' +
        '<ol class="zlist">' + MB.JOBS.map((j) => "<li><b>" + j.em + " " + j.name + "</b>（" + j.days + "）<br>" + j.say + "</li>").join("") + "</ol>";
    }
    return '<canvas class="bodycv" id="danceCv" width="720" height="340"></canvas>' +
      '<ol class="zlist">' +
      "<li><b>8のじ ダンス（しりふりダンス）</b>: いい はなばたけを みつけた ハチは、すの なかの たての すいたの うえで 8のじに おどる。</li>" +
      "<li><b>むき</b>: まっすぐ すすむ ところの むきが、すいたの <b>まうえ ＝ たいようの ほう</b> から みた はなの むき。たいようの みぎ 60ど に はなが あれば、まうえから みぎへ 60ど に すすむ。</li>" +
      "<li><b>きょり</b>: まっすぐ すすむ あいだ おしりを ぷるぷる ふる。<b>ながく ふる ほど とおい</b>（だいたい 1びょう で 1キロ。ハチの なかまや むれで すこし ちがう）。</li>" +
      "<li><b>えんけいダンス</b>: すの <b>すぐ ちかく</b> の ときは、まるく くるくる まわる。</li>" +
      "<li>たいようは うごくので、おなじ はなばたけ でも あさと ゆうがたで ダンスの むきが かわる。</li>" +
      "<li>くらい すの なかなので、なかまは ダンサーに くっついて、からだの うごきと おと・はなの においで おぼえる。</li>" +
      "<li>しくみを はじめて ときあかしたのは カール・フォン・フリッシュ（ノーベル しょう）。</li></ol>";
  }

  function paint(sheet) {
    sheet.querySelectorAll("[data-f]").forEach((el) => {
      const f = MB.FLOWERS[+el.dataset.f], c = el.querySelector("canvas"), g = c.getContext("2d");
      g.fillStyle = "#eaf7d8"; g.fillRect(0, 0, 360, 150);
      A.flower(g, 95, 75, 42, f.id, {});
      g.font = "bold 34px sans-serif"; g.fillStyle = "#b86e00"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("→", 180, 75);
      if (App.S.fruits[f.id]) A.fruit(g, 270, 78, 46, f.id);
      else { g.fillStyle = "#ddd"; A.circ(g, 270, 75, 44); g.fill(); g.fillStyle = "#999"; g.font = "bold 44px sans-serif"; g.fillText("？", 270, 78); }
    });
    sheet.querySelectorAll("[data-k]").forEach((el) => {
      const k = MB.KIN[+el.dataset.k], c = el.querySelector("canvas"), g = c.getContext("2d");
      g.fillStyle = "#fff3bf"; g.fillRect(0, 0, 360, 200);
      A.bee(g, 180, 100, k.type === "queen" ? 52 : 58, -0.25, { type: k.type, species: k.species, flap: 0.4, happy: true });
    });
    const b = sheet.querySelector("#bodyCv");
    if (b) {
      const g = b.getContext("2d");
      g.fillStyle = "#fffdf4"; g.fillRect(0, 0, 720, 380);
      const pins = A.beeSide(g, 360, 190, 170, {});
      g.font = "bold 22px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      const lab = [[-110, -60], [-60, -95], [0, -150], [-50, 120], [60, 110], [90, 120], [80, 40]];
      pins.forEach((p, i) => {
        const lx = Math.max(24, Math.min(696, p[0] + lab[i][0])), ly = Math.max(24, Math.min(356, p[1] + lab[i][1]));
        g.strokeStyle = "#e5484d"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(lx, ly); g.lineTo(p[0], p[1]); g.stroke();
        A.circ(g, p[0], p[1], 6); g.fillStyle = "#e5484d"; g.fill();
        A.circ(g, lx, ly, 17); g.fillStyle = "#e5484d"; g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke();
        g.fillStyle = "#fff"; g.fillText(String(i + 1), lx, ly + 1);
      });
    }
    const dc = sheet.querySelector("#danceCv");
    if (dc) {
      const g = dc.getContext("2d");
      // ひだり: そと
      const geo = MB.Map.geom(10, 10, 330, 320);
      MB.Map.draw(g, geo, { rings: false, round: 16 });
      MB.Map.drawHive(g, geo);
      const sp = MB.Map.drawSun(g, geo, 180, 0, "たいよう");
      const pf = { id: "x", sp: "ringo", az: 240, dist: 1200, rot: 0.3 };
      const fp = MB.Map.drawPatch(g, geo, pf, { label: false });
      g.lineWidth = 4; g.strokeStyle = "#ff9800"; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(geo.cx, geo.cy); g.lineTo(sp.x, sp.y); g.stroke(); g.setLineDash([]);
      g.strokeStyle = "#2b8a3e"; g.beginPath(); g.moveTo(geo.cx, geo.cy); g.lineTo(fp.x, fp.y); g.stroke();
      g.strokeStyle = "#e8590c"; g.beginPath(); g.arc(geo.cx, geo.cy, 50, Math.PI / 2, Math.PI / 2 + Math.PI / 3); g.stroke();
      g.font = "bold 20px sans-serif"; g.fillStyle = "#c92a2a"; g.textAlign = "center"; g.fillText("60ど", geo.cx - 52, geo.cy + 66);
      // みぎ: すいた
      g.save(); g.beginPath(); g.roundRect(380, 10, 330, 320, 16); g.clip(); g.translate(380, 10);
      A.combBg(g, 330, 320, 16, 3);
      g.fillStyle = "rgba(60,30,0,.25)"; g.fillRect(0, 0, 330, 320);
      A.sun(g, 165, 30, 16, 0);
      g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(165, 180); g.lineTo(165, 60); g.stroke(); g.setLineDash([]);
      const v = D.combVec(D.danceAngle(180, 240)), L = 120;
      g.strokeStyle = "#fff"; g.lineWidth = 7; g.lineCap = "round";
      g.beginPath(); g.moveTo(165 - v.x * L / 2, 180 - v.y * L / 2); g.lineTo(165 + v.x * L / 2, 180 + v.y * L / 2); g.stroke();
      g.lineWidth = 4; g.strokeStyle = "rgba(255,255,255,.75)";
      const ang = Math.atan2(v.y, v.x);
      g.beginPath(); g.arc(165, 180, L / 2, ang, ang + Math.PI); g.stroke();
      g.beginPath(); g.arc(165, 180, L / 2, ang, ang - Math.PI, true); g.stroke();
      g.strokeStyle = "#ffd8a8"; g.lineWidth = 4; g.beginPath(); g.arc(165, 180, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI / 3); g.stroke();
      A.bee(g, 165 + v.x * 20, 180 + v.y * 20, 20, Math.atan2(v.x, -v.y), { wag: 0.8, flap: 0.4, happy: true });
      g.font = "bold 18px sans-serif"; g.fillStyle = "#fff"; g.textAlign = "center";
      g.fillText("まうえ ＝ たいよう", 165, 62); g.fillText("まうえから みぎへ 60ど", 165, 300);
      g.restore();
    }
  }

  function open(which) {
    if (which) tab = which;
    const html = "<h2>📖 ミツバチ ずかん</h2>" +
      '<div class="tabs">' + TABS.map(([k, n]) => '<button type="button" class="tab' + (k === tab ? " on" : "") + '" data-tab="' + k + '">' + n + "</button>").join("") + "</div>" +
      '<div id="zbody">' + body() + "</div>" +
      '<p class="soft">🐝 ' + MB.SAFE + "</p>" +
      '<button type="button" class="btn main" data-close>とじる</button>';
    const sheet = App.modal(html, true);
    sheet.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { MB.Sound.tap(); open(b.dataset.tab); }));
    paint(sheet);
  }
  MB.Zukan = { open };
})();
