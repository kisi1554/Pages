/* でんしゃ どこだ？ の まち（6まい）と、さがす もの
 * 文 の なか の {漢字|かんじ} は ふりがな つき で ひょうじ する（よみあげ は よみ だけ）。
 * spots: [x, y, flip, rot]  … え の ひだりうえ。flip=1 で ひだり むき、rot は そこ の まんなか を じく に まわす（ど）。
 */
(function (root) {
  "use strict";
  var A = (typeof module === "object" && module.exports) ? require("./art.js") : root.DDArt;
  var ART = A.ART, R = A.R, C = A.C, P = A.P, L = A.L, E = A.E;
  var W = 1800, H = 720, MARGIN = 18;

  /* ---------- さがす もの（ずかん）---------- */
  var KINDS = {
    tsukin: { name: "つうきん でんしゃ", say: "まいにち たくさん の ひと を はこぶよ", move: "x",
      desc: "{会社|かいしゃ} や {学校|がっこう} へ いく ひと を たくさん のせて はしる でんしゃ。ドア が おおくて、のりおり が はやく できる。" },
    shinkansen: { name: "しんかんせん", say: "とっても はやい でんしゃ！", move: "x",
      desc: "とても はやい でんしゃ。いちばん はやい もの は じそく 320キロ で はしる。はやく はしれる よう に、ふみきり の ない せんよう の せんろ が つくられて いる。" },
    chikatetsu: { name: "ちかてつ の いりぐち", say: "この かいだん の した に ちかてつ が はしって いるよ", move: "none",
      desc: "ちかてつ は じめん の した の トンネル を はしる でんしゃ。みち や たてもの に じゃま されず に、まち の まんなか を はしれる。いりぐち の かいだん を おりる と えき が ある。" },
    kamotsu: { name: "かもつ れっしゃ", say: "ひと では なく、にもつ を はこぶ れっしゃ だよ", move: "x",
      desc: "にもつ を はこぶ れっしゃ。でんき きかんしゃ が、コンテナ を つんだ たくさん の かしゃ を ひっぱる。1かい で トラック なんじゅうだい ぶん も はこべる。" },
    marutai: { name: "マルタイ", say: "よなか に せんろ を なおす くるま だよ", move: "x",
      desc: "でんしゃ が はしらない よなか に、せんろ の した の じゃり を つきかためて、せんろ の ゆがみ を なおす くるま。ほんとう の なまえ は「マルチプル タイタンパー」。" },

    cablecar: { name: "ケーブルカー", say: "ケーブル で ひっぱって、さか を のぼるよ", move: "swing", dir: [2, -1], bell: 1,
      desc: "きゅう な さか を、ケーブル（はがね の つな）で ひっぱって のぼりおり する。やま の うえ の きかい が つな を まきあげる。うえ と した の くるま が 1ぽん の つな で つながって いて、まんなか で すれちがう。" },
    ropeway: { name: "ロープウェイ", say: "そら の ロープ に ぶらさがって すすむよ", move: "swing", dir: [5, 3],
      desc: "やま と やま の あいだ に はった ロープ に ぶらさがって、そら を すすむ のりもの。レール は ない けれど、ほうりつ では てつどう の なかま（さくどう）に はいる。" },
    tunnel: { name: "トンネル", say: "やま の なか を とおりぬけて きたよ", move: "none",
      desc: "やま を まわりみち せず に すすめる よう に、やま に あな を ほって つくった みち。ながい トンネル は なんじゅっキロ も つづく。" },
    tekkyo: { name: "てっきょう", say: "かわ の うえ を わたって いるよ", move: "x",
      desc: "かわ や たに を わたる ため の、てつ で できた はし。さんかく を くみあわせた かたち（トラス）は じょうぶ で、おもい でんしゃ も ささえられる。" },
    abt: { name: "アプト しき", say: "はぐるま で きゅう な さか を のぼるよ", move: "swing", dir: [1, -0.36],
      desc: "つるつる の レール だけ では、でんしゃ は きゅう な さか を のぼれない。アプト しき は、レール の あいだ に ある ぎざぎざ の レール に はぐるま を かみあわせて、きゅう な さか を のぼる。" },

    monorail: { name: "モノレール", say: "1ぽん の レール を はしるよ", move: "x",
      desc: "「モノ」は「1つ」と いう いみ。1ぽん の ふとい レール に またがったり、ぶらさがったり して はしる。ゴム の タイヤ で しずか に はしる。" },
    container: { name: "コンテナ", say: "コンテナ を のせて はこぶよ", move: "x",
      desc: "にもつ を いれる おおきな はこ が コンテナ。かもつ ターミナル では、フォークリフト や クレーン で、れっしゃ から トラック や ふね へ はこ ごと のせかえる。" },
    ferry: { name: "フェリー", trick: 1, say: "これ は ふね！ でんしゃ じゃ ないね", move: "x", horn: 1,
      desc: "ひと と いっしょ に くるま も のせて うみ を わたる ふね。でんしゃ では ない！ でも むかし は、でんしゃ の かしゃ を のせて うみ を わたる ふね（れんらくせん）も あった。" },
    shunter: { name: "いれかえ きかんしゃ", say: "かしゃ を おしたり ひいたり して ならべるよ", move: "x",
      desc: "えき や かもつ ターミナル で、かしゃ を おしたり ひいたり して ならべかえる きかんしゃ。みじかい きょり を いったり きたり する。" },
    agt: { name: "しんこうつう システム", say: "ゴム の タイヤ で はしるよ", move: "x",
      desc: "コンクリート の みち の うえ を、ゴム の タイヤ で はしる ちいさな でんしゃ。よこ の かべ に そって すすむ。うんてんし が のらず に、コンピューター で はしる もの も ある。" },

    romen: { name: "ろめん でんしゃ", say: "みち の うえ を はしるよ", move: "x", bell: 1,
      desc: "みち の うえ に しいた レール を はしる でんしゃ。くるま と いっしょ に しんごう を まもって はしる。のりば が みち の まんなか に ある ところ も ある。" },
    sl: { name: "SL", say: "ぽっぽー！ けむり を はいて はしるよ", move: "x", whistle: 1,
      desc: "じょうき きかんしゃ。せきたん を もやして みず を わかし、できた じょうき の ちから で しゃりん を まわす。うしろ の くるま（テンダー）に、せきたん と みず を つんで いる。" },
    torokko: { name: "トロッコ", say: "ちいさな くるま で はこぶよ", move: "x",
      desc: "こうざん や こうじ の ばしょ で、いし や つち を はこぶ ちいさな くるま。いま は、まど の ない くるま で けしき を たのしむ「トロッコ れっしゃ」も ある。" },
    bashatetsudo: { name: "ばしゃ てつどう", say: "うま が ひっぱる てつどう だよ", move: "x",
      desc: "うま が、レール の うえ の くるま を ひっぱった むかし の てつどう。{東京|とうきょう} では 1882ねん に はしりはじめ、のち に ろめん でんしゃ に かわった。" },
    jinrikisha: { name: "じんりきしゃ", trick: 1, say: "ひと が ひく くるま！ でんしゃ じゃ ないよ", move: "x",
      desc: "ひと が ひっぱって はしる、2りん の くるま。レール も エンジン も ない ので、てつどう では ない。いま も かんこうち で のる こと が できる。" },

    russell: { name: "ラッセル しゃ", say: "ゆき を よこ へ おしのけるよ", move: "x",
      desc: "まえ に ついた くさび の かたち の おおきな はね で、せんろ の ゆき を よこ へ おしのけて すすむ。ゆき の おおい ところ で せんろ を まもる。" },
    rotary: { name: "ロータリー しゃ", say: "ゆき を とおく へ ふきとばすよ", move: "x",
      desc: "まえ に ついた まわる はね（ロータリー）で ゆき を かきこんで、とおく へ ふきとばす。ラッセル しゃ では どかせない、ふかく つもった ゆき に つかう。" },
    shindai: { name: "ねだい とっきゅう", say: "よる に はしる、ベッド の ある でんしゃ だよ", move: "x",
      desc: "よる に はしり、ベッド で ねて いる あいだ に とおく へ いける とっきゅう。よる に のって、あさ めざめる と とおく の まち に ついて いる。" },
    diesel: { name: "ディーゼル カー", say: "でんせん が なくても はしれるよ", move: "x",
      desc: "けいゆ で うごく ディーゼル エンジン で はしる。うえ に でんせん が ない せんろ でも はしれる ので、いなか の ローカル せん で かつやく する。" },
    stove: { name: "ストーブ れっしゃ", say: "なか に ストーブ が あって あったかい！", move: "x",
      desc: "くるま の なか に、せきたん で もやす ストーブ が ある れっしゃ。やね から えんとつ が でて いる。さむい ふゆ に、ストーブ で スルメ を やいて たべる ひと も いる。" },

    kodomo: { name: "こども でんしゃ", say: "ゆうえんち を まわる ちいさな でんしゃ だよ", move: "x",
      desc: "ゆうえんち や こうえん を ゆっくり まわる ちいさな でんしゃ。こども が のって、けしき を たのしむ。" },
    coaster: { name: "ジェットコースター", quiz: 1, say: "レール は ある けど、でんしゃ じゃ ないよ", move: "x",
      desc: "レール の うえ を はしる けれど、どこか へ いく でんしゃ では なく、あそぶ のりもの。おおく は、たかい ところ まで ひきあげられて、おちる いきおい で はしる。" },
    kanransha: { name: "かんらんしゃ", trick: 1, say: "まわる のりもの！ でんしゃ じゃ ないよ", move: "spin",
      desc: "おおきな わ が ゆっくり まわって、ゴンドラ に のった ひと を たかい ところ へ はこぶ。レール は ない ので、てつどう では ない。" },
    minisl: { name: "ミニ SL", say: "またがって のる ちいさな SL だよ", move: "x", whistle: 1,
      desc: "こども も おとな も またがって のれる、ちいさな SL。ほんもの と おなじ よう に みず を わかして、じょうき で はしる もの も ある。" },
    roadtrain: { name: "タイヤ の きしゃ", trick: 1, say: "レール が ない！ てつどう じゃ ないよ", move: "x",
      desc: "きしゃ の かたち を して いる けれど、ゴム の タイヤ で みち を はしる くるま。レール の うえ を はしらない ので、てつどう では ない。" }
  };
  Object.keys(KINDS).forEach(function (k) { KINDS[k].id = k; KINDS[k].art = k; });

  var EXTRAS = {
    cat: { name: "ねて いる ねこ", say: "すやすや… ねこ が ねて た！" },
    monkey: { name: "とけい に ぶらさがる さる", say: "うっきー！ とけい で あそんで る" },
    bear: { name: "スキー を する くま", say: "くま も スキー が すき みたい" },
    elephant: { name: "コンテナ に はいった ぞう", say: "ぱおーん！ にもつ じゃ ないよ" },
    frog: { name: "かさ を さした かえる", say: "けろけろ。あめ が すき なのに かさ？" },
    penguin: { name: "かまくら の ペンギン", say: "かまくら で ひとやすみ" },
    snowman: { name: "おでん を たべる ゆきだるま", say: "あつあつ！ とけちゃう よ〜" },
    cow: { name: "まちがえて のった うし", say: "もー！ これ は どこ いき？" }
  };
  Object.keys(EXTRAS).forEach(function (k) { EXTRAS[k].id = k; EXTRAS[k].art = k; });

  /* ---------- はいけい の ぶひん ---------- */
  function sky(id, a, b) { return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs>' + R(0, 0, W, H, "url(#" + id + ")"); }
  function rail(y, x0, x1, bal) {
    var s = R(x0, y + 2, x1 - x0, 10, bal || "#adb5bd");
    for (var x = x0 + 6; x < x1; x += 16) s += R(x, y + 2, 8, 5, "#8a4b20");
    return s + R(x0, y - 1, x1 - x0, 4, "#495057");
  }
  function poly(pts, f, ex) { return '<polygon points="' + pts.map(function (p) { return p.join(","); }).join(" ") + '" fill="' + f + '"' + (ex || "") + "/>"; }
  function pillars(x0, x1, step, y0, y1, w, f) { var s = ""; for (var x = x0; x <= x1; x += step) s += R(x - w / 2, y0, w, y1 - y0, f || "#ced4da", 0, ' stroke="#868e96" stroke-width="1.5"'); return s; }
  function stars(n, seed, ymax) { var r = rng(seed), s = ""; for (var i = 0; i < n; i++) s += C((r() * W).toFixed(0), (r() * ymax).toFixed(0), (r() * 1.6 + 0.6).toFixed(1), "#fff", ' opacity="' + (r() * 0.6 + 0.4).toFixed(2) + '"'); return s; }
  function rng(seed) { var x = seed >>> 0 || 1; return function () { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return (x % 100000) / 100000; }; }
  // かざり を ばらまく: [art, x0, x1, そこ の y, かず, オプション の こうほ]
  function scatter(seed, list) {
    var r = rng(seed), out = [];
    list.forEach(function (it) {
      var a = ART[it[0]];
      for (var i = 0; i < it[4]; i++) {
        var o = it[5] ? it[5][Math.floor(r() * it[5].length)] : {};
        out.push([it[0], Math.round(it[1] + r() * (it[2] - it[1] - a.w)), it[3] - a.h, o, r() < 0.5 ? 1 : 0]);
      }
    });
    return out;
  }
  var SHIRTS = [{ c: "#4dabf7" }, { c: "#ff8787" }, { c: "#ffd43b", hair: "#212529" }, { c: "#69db7c" }, { c: "#b197fc", hair: "#e8590c" }, { c: "#ffa94d", hair: "#212529" }, { c: "#f783ac" }];
  var CARS = [{ c: "#f03e3e" }, { c: "#1c7ed6" }, { c: "#fab005" }, { c: "#f8f9fa" }, { c: "#37b24d" }];

  /* ---------- まち ---------- */
  var TOWNS = [
    { id: "eki", emoji: "🏙️", name: "おおきな えき の まち", tint: "#e7f5ff", amb: { f: 900, g: 0.035 },
      bg: function () {
        var s = sky("skyEki", "#74c0fc", "#e7f5ff");
        var r = rng(7);
        for (var x = 0; x < W; x += 70 + Math.floor(r() * 30)) { var bh = 120 + Math.floor(r() * 180); s += '<g transform="translate(' + x + "," + (410 - bh) + ')">' + ART.building.d({ bw: 64, bh: bh, c: ["#a5b4c8", "#b8c4d6", "#9fb0c4", "#c5cfdc"][Math.floor(r() * 4)] }) + "</g>"; }
        s += R(0, 410, W, 310, "#dee2e6") + R(0, 280, W, 18, "#e9ecef", 0, ' stroke="#868e96" stroke-width="2"') + R(0, 270, W, 10, "#ced4da") + pillars(40, 1800, 150, 298, 412, 22) + rail(280, 0, W, "#ced4da");
        s += R(640, 420, 520, 14, "#adb5bd", 0, ' stroke="#868e96" stroke-width="1.5"') + rail(420, 0, 620) + rail(420, 1180, W);
        s += rail(500, 0, W) + rail(570, 0, W) + R(0, 584, W, 14, "#f1f3f5") + R(0, 598, W, 56, "#495057");
        for (var d = 20; d < W; d += 80) s += R(d, 624, 40, 4, "#fff");
        return s + R(0, 654, W, 66, "#e9ecef") + R(0, 654, W, 3, "#adb5bd");
      },
      decor: [["cloud", 160, 40, {}], ["cloud", 900, 70, {}], ["cloud", 1500, 30, {}], ["bird", 620, 60, {}], ["bird", 650, 80, {}], ["bird", 1260, 50, {}],
        ["station", 750, 300, { t: "えき" }], ["clock", 690, 300, {}], ["bench", 560, 690, {}], ["bench", 1250, 690, {}],
        ["bus", 1000, 594, { c: "#fab005" }], ["car", 120, 618, { c: "#f03e3e" }], ["car", 640, 618, { c: "#1c7ed6" }, 1], ["car", 1400, 618, { c: "#37b24d" }], ["truck", 1620, 598, { c: "#e8590c" }, 1],
        ["tree", 40, 636, {}], ["tree", 1080, 636, {}], ["tree", 1700, 636, {}], ["lamp", 360, 630, {}], ["lamp", 1180, 630, {}], ["dog", 780, 692, { c: "#e9c46a" }], ["dog", 1640, 692, { c: "#868e96" }, 1]
      ].concat(scatter(11, [["person", 0, W, 716, 18, SHIRTS], ["kid", 0, W, 716, 6, SHIRTS], ["person", 650, 1150, 420, 8, SHIRTS]])),
      targets: [
        { kind: "shinkansen", spots: [[60, 218], [700, 218], [1340, 218]] },
        { kind: "tsukin", spots: [[80, 426], [640, 426], [1300, 426, 1]] },
        { kind: "kamotsu", spots: [[40, 504], [700, 504, 1], [1330, 504]] },
        { kind: "marutai", spots: [[150, 350], [1450, 350, 1]] },
        { kind: "chikatetsu", spots: [[200, 634], [900, 634], [1500, 634]] }
      ],
      extras: [{ id: "cat", spots: [[562, 662], [1252, 662]] }, { id: "monkey", spots: [[470, 298], [1200, 298]] }]
    },

    { id: "yama", emoji: "🏞️", name: "やま の まち", tint: "#ebfbee", amb: { f: 500, g: 0.02 },
      bg: function () {
        var s = sky("skyYama", "#4dabf7", "#d0ebff");
        s += poly([[0, 500], [200, 260], [420, 380], [700, 200], [1000, 330], [1350, 180], [1800, 380], [1800, 650], [0, 650]], "#a9e34b", ' opacity=".55"');
        s += poly([[-20, 650], [380, 60], [900, 650]], "#5c940d", ' stroke="#2b8a3e" stroke-width="3"') + poly([[380, 60], [330, 134], [360, 124], [390, 140], [420, 116], [430, 120]], "#fff");
        s += poly([[900, 650], [1250, 120], [1560, 650]], "#66a80f", ' stroke="#2b8a3e" stroke-width="3"') + poly([[1250, 120], [1212, 178], [1240, 168], [1262, 182], [1290, 170]], "#fff");
        // ケーブルカー の せんろ（さか 0.5）
        s += L(60, 610, 580, 350, "#8a4b20", 10) + L(60, 606, 580, 346, "#495057", 3) + R(40, 586, 60, 30, "#fff3bf", 2, ' stroke="#2b2b2b" stroke-width="2"') + R(548, 318, 60, 40, "#fff3bf", 2, ' stroke="#2b2b2b" stroke-width="2"');
        // アプト しき の ぎざぎざ レール
        s += L(1010, 495, 1360, 369, "#8a4b20", 10) + L(1010, 491, 1360, 365, "#495057", 3);
        for (var t = 0; t <= 1; t += 0.04) s += C((1010 + 350 * t).toFixed(1), (497 - 126 * t).toFixed(1), 2.2, "#fcc419");
        // ロープウェイ
        s += R(1240, 112, 50, 34, "#fff3bf", 2, ' stroke="#2b2b2b" stroke-width="2"') + L(1270, 140, 1770, 440, "#343a40", 2.5) + R(1740, 430, 60, 40, "#fff3bf", 2, ' stroke="#2b2b2b" stroke-width="2"') + R(1750, 470, 50, 180, "#868e96", 0, ' stroke="#495057" stroke-width="2"');
        // トンネル の いりぐち（2か所）: さがす え と おなじ いしづみ
        [[690, 0], [866, 1]].forEach(function (p) {
          s += '<g transform="' + transform("tunnel", [p[0], 530, p[1]]) + '"><clipPath id="tc' + p[0] + '"><rect x="0" y="0" width="96" height="120"/></clipPath><g clip-path="url(#tc' + p[0] + ')">' + ART.tunnel.d({}) + "</g>" + P("M14 120 L14 58 Q14 22 48 22 Q82 22 82 58 L82 120Z", "#212529") + "</g>";
        });
        // かわ と てっきょう
        s += R(0, 650, W, 70, "#8ce99a") + P("M1540 650 Q1600 720 1650 720 L1760 720 Q1740 680 1750 650Z", "#4dabf7");
        s += rail(650, 0, W);
        for (var bx = 1530; bx < 1750; bx += 44) s += P("M" + bx + " 650 L" + (bx + 22) + " 590 L" + (bx + 44) + " 650", "none", ' stroke="#e03131" stroke-width="4"');
        return s + L(1530, 590, 1750, 590, "#e03131", 5) + L(1530, 650, 1750, 650, "#e03131", 5) + R(1520, 652, 18, 68, "#868e96") + R(1738, 652, 18, 68, "#868e96");
      },
      decor: [["cloud", 520, 40, {}], ["cloud", 1460, 60, {}], ["bird", 860, 90, {}], ["bird", 890, 110, {}],
        ["pine", 120, 470, {}], ["pine", 210, 360, {}], ["pine", 600, 470, {}], ["pine", 760, 420, {}], ["pine", 1130, 520, {}], ["pine", 1380, 470, {}], ["pine", 1440, 540, {}],
        ["house", 1130, 560, { c: "#fff3bf", r: "#1971c2" }], ["house", 300, 560, { c: "#ffe8cc", r: "#c92a2a" }], ["tree", 30, 650, {}], ["tree", 960, 650, {}], ["tree", 1300, 650, {}],
        ["dog", 900, 692, {}]
      ].concat(scatter(23, [["person", 0, 1500, 716, 9, SHIRTS], ["kid", 0, 1500, 716, 4, SHIRTS], ["tree", 0, 1500, 720, 4, [{ c: "#69db7c" }, { c: "#40c057" }]]])),
      targets: [
        { kind: "cablecar", spots: [[120, 480], [280, 400], [420, 330]] },
        { kind: "tunnel", spots: [[690, 530], [866, 530, 1]] },
        { kind: "abt", spots: [[1055, 378, 0, -19.8], [1185, 332, 0, -19.8]] },
        { kind: "ropeway", spots: [[1380, 225], [1520, 309], [1640, 381]] },
        { kind: "tekkyo", spots: [[1500, 588], [1540, 588, 1]] }
      ],
      extras: [{ id: "bear", spots: [[330, 150], [1180, 220]] }]
    },

    { id: "minato", emoji: "🌊", name: "みなと の まち", tint: "#e3fafc", amb: { f: 400, g: 0.05, wave: 1 },
      bg: function () {
        var s = sky("skyMinato", "#66d9e8", "#e3fafc");
        s += poly([[980, 450], [1100, 400], [1250, 430], [1400, 380], [1600, 420], [1800, 400], [1800, 450]], "#96f2d7");
        s += '<defs><linearGradient id="seaMinato" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4dabf7"/><stop offset="1" stop-color="#1864ab"/></linearGradient></defs>' + R(980, 450, 820, 270, "url(#seaMinato)");
        for (var y = 480; y < 720; y += 40) for (var x = 1000 + (y % 80); x < W; x += 160) s += P("M" + x + " " + y + " q15 -8 30 0 q15 8 30 0", "none", ' stroke="#fff" stroke-width="2" opacity=".5"');
        s += R(0, 450, 980, 270, "#ced4da") + R(970, 450, 14, 270, "#868e96") + pillars(60, 1800, 180, 250, 452, 20) + R(0, 232, W, 18, "#e9ecef", 2, ' stroke="#868e96" stroke-width="2"');
        s += pillars(150, 1800, 240, 396, 452, 18, "#dee2e6") + R(0, 372, W, 8, "#ced4da") + R(0, 380, W, 16, "#e9ecef", 0, ' stroke="#868e96" stroke-width="2"');
        return s + rail(600, 0, 970) + rail(670, 0, 970);
      },
      decor: [["cloud", 200, 40, {}], ["cloud", 1000, 60, {}], ["bird", 1300, 120, { c: "#fff" }], ["bird", 1340, 100, { c: "#fff" }], ["bird", 1600, 150, { c: "#fff" }],
        ["crane", 160, 380, {}], ["crane", 600, 380, { c: "#1c7ed6" }], ["stack", 30, 434, {}], ["stack", 400, 434, { cs: ["#e8590c", "#1971c2", "#c92a2a", "#fcc419", "#2f9e44"] }], ["stack", 800, 434, {}],
        ["lighthouse", 1740, 300, {}], ["boat", 1240, 600, {}], ["boat", 1660, 520, { c: "#ffe066" }, 1], ["boat", 1080, 650, { c: "#ff8787" }],
        ["truck", 300, 664, { c: "#2f9e44" }], ["truck", 700, 664, { c: "#7048e8" }, 1]
      ].concat(scatter(31, [["person", 0, 960, 716, 7, SHIRTS], ["kid", 0, 960, 716, 2, SHIRTS]])),
      targets: [
        { kind: "monorail", spots: [[80, 166], [700, 166], [1300, 166, 1]] },
        { kind: "agt", spots: [[100, 322], [650, 322, 1], [1250, 322]] },
        { kind: "container", spots: [[60, 546], [420, 546], [760, 546]] },
        { kind: "shunter", spots: [[150, 606], [560, 606, 1], [820, 606]] },
        { kind: "ferry", spots: [[1060, 490], [1440, 490, 1]] }
      ],
      extras: [{ id: "elephant", spots: [[250, 454], [650, 454]] }]
    },

    { id: "mukashi", emoji: "🏯", name: "むかし の まち", tint: "#fff4e6", amb: { f: 700, g: 0.025 },
      bg: function () {
        var s = sky("skyMukashi", "#ffd8a8", "#fff9db");
        s += C(1500, 110, 50, "#ffe066", ' opacity=".9"') + poly([[0, 380], [0, 200], [250, 160], [520, 220], [800, 300], [900, 380]], "#a9e34b", ' stroke="#5c940d" stroke-width="3"');
        s += poly([[700, 450], [900, 300], [1200, 340], [1500, 260], [1800, 330], [1800, 450]], "#c0eb75", ' opacity=".7"');
        s += P("M640 380 L640 330 Q640 300 670 300 Q700 300 700 330 L700 380Z", "#212529") + R(632, 292, 76, 10, "#8a4b20") + rail(380, 0, 780, "#d8c3a5");
        s += R(0, 450, W, 30, "#94d82d") + rail(450, 0, W, "#d8c3a5") + R(0, 480, W, 80, "#f4e3c1") + R(0, 556, W, 164, "#d8c3a5");
        return s + rail(640, 0, W, "#c8b48f") + rail(700, 0, W, "#c8b48f");
      },
      decor: [["cloud", 300, 40, { c: "#fff9db" }], ["cloud", 1100, 70, { c: "#fff9db" }], ["bird", 980, 120, {}], ["bird", 1010, 100, {}],
        ["pine", 140, 320, {}], ["pine", 470, 300, {}], ["kura", 30, 470, {}], ["machiya", 110, 458, {}], ["machiya", 470, 458, { c: "#ffd8a8" }], ["kura", 720, 470, {}], ["machiya", 820, 458, {}], ["machiya", 1140, 458, { c: "#ffd8a8" }], ["kura", 1400, 470, {}], ["machiya", 1480, 458, {}],
        ["lamp", 600, 470, { on: 1 }], ["lamp", 1100, 470, { on: 1 }], ["tree", 1720, 474, { c: "#a9e34b" }], ["dog", 1250, 528, {}]
      ].concat(scatter(41, [["person", 0, W, 556, 10, SHIRTS], ["kid", 0, W, 556, 4, SHIRTS], ["person", 0, W, 720, 6, SHIRTS]])),
      targets: [
        { kind: "torokko", spots: [[60, 320], [380, 320]] },
        { kind: "sl", spots: [[760, 332], [1110, 332], [1460, 332]] },
        { kind: "jinrikisha", spots: [[300, 454], [960, 454, 1], [1610, 454]] },
        { kind: "romen", spots: [[100, 552], [700, 552, 1], [1300, 552]] },
        { kind: "bashatetsudo", spots: [[420, 604], [1020, 604], [1560, 604]] }
      ],
      extras: [{ id: "frog", spots: [[640, 484], [1320, 484]] }]
    },

    { id: "yuki", emoji: "❄️", name: "ゆき の まち", tint: "#edf2ff", amb: { f: 300, g: 0.03 }, night: 1,
      bg: function () {
        var s = sky("skyYuki", "#1b2448", "#4c5f9a") + stars(90, 5, 260) + C(1560, 90, 36, "#fff9db") + C(1576, 80, 32, "#2a3563");
        s += poly([[0, 400], [180, 200], [380, 330], [640, 150], [900, 320], [1200, 180], [1500, 300], [1800, 200], [1800, 400]], "#bac8ff");
        s += poly([[180, 200], [140, 250], [220, 245]], "#fff") + poly([[640, 150], [590, 210], [690, 205]], "#fff") + poly([[1200, 180], [1150, 240], [1250, 235]], "#fff");
        s += R(0, 396, W, 324, "#f1f3f5") + rail(400, 0, W, "#dee2e6") + R(620, 562, 520, 10, "#ced4da") + rail(560, 0, W, "#dee2e6") + rail(670, 0, W, "#dee2e6");
        for (var i = 0; i < 6; i++) s += P("M" + (i * 320) + " 720 q80 -30 160 0", "#fff");
        return s;
      },
      decor: [["station", 720, 440, { t: "えき", lit: 1, r: "#364fc7" }], ["lamp", 660, 470, { on: 1 }], ["lamp", 1110, 470, { on: 1 }],
        ["snowhouse", 40, 470, {}], ["snowhouse", 1460, 470, {}], ["pine", 400, 486, { c: "#2b8a3e", snow: 1 }], ["pine", 1360, 476, { c: "#2b8a3e", snow: 1 }], ["pine", 1760, 470, { c: "#2b8a3e", snow: 1 }], ["pine", 1020, 300, { c: "#2b8a3e", snow: 1 }], ["pine", 340, 300, { c: "#2b8a3e", snow: 1 }],
        ["dog", 1200, 690, { c: "#e9c46a" }]
      ].concat(scatter(53, [["person", 0, W, 716, 8, SHIRTS], ["kid", 0, W, 716, 4, SHIRTS], ["pine", 0, W, 400, 6, [{ c: "#2b8a3e", snow: 1 }]]])),
      targets: [
        { kind: "russell", spots: [[80, 308], [900, 308]] },
        { kind: "rotary", spots: [[480, 280], [1400, 280]] },
        { kind: "shindai", spots: [[650, 498], [1300, 498]] },
        { kind: "diesel", spots: [[60, 488], [1120, 488, 1]] },
        { kind: "stove", spots: [[200, 590], [1000, 590, 1], [1500, 590]] }
      ],
      extras: [{ id: "penguin", spots: [[300, 412], [1250, 412]] }, { id: "snowman", spots: [[560, 408], [1660, 408]] }]
    },

    { id: "yuenchi", emoji: "🎡", name: "ゆうえんち", tint: "#fff0f6", amb: { f: 1200, g: 0.03 },
      bg: function () {
        var s = sky("skyYuen", "#91a7ff", "#fff0f6");
        s += R(0, 430, W, 290, "#b2f2bb");
        for (var x = 80; x <= 860; x += 60) s += L(x, 210, x, 440, "#adb5bd", 4);
        for (var x2 = 80; x2 < 860; x2 += 60) s += L(x2, 260, x2 + 60, 320, "#ced4da", 2) + L(x2 + 60, 260, x2, 320, "#ced4da", 2);
        s += P("M40 200 L860 200 Q960 200 980 330 Q1000 440 1060 440", "none", ' stroke="#e64980" stroke-width="8"') + C(1000, 330, 50, "none", ' stroke="#e64980" stroke-width="6" opacity=".5"');
        s += R(40, 198, 820, 6, "#c2255c") + rail(520, 0, W, "#ced4da") + rail(610, 0, W, "#ced4da");
        return s + R(0, 640, W, 64, "#ffe8cc") + R(0, 700, W, 20, "#b2f2bb");
      },
      decor: [["cloud", 200, 40, {}], ["cloud", 1300, 30, {}], ["balloon", 1080, 120, { c: "#f03e3e" }], ["balloon", 1100, 140, { c: "#fcc419" }], ["balloon", 1760, 90, { c: "#4dabf7" }],
        ["tent", 1100, 352, { c: "#f783ac" }], ["tent", 1400, 352, { c: "#4dabf7" }], ["tent", 1700, 352, { c: "#ffd43b" }], ["shop", 1000, 342, { c: "#7048e8" }], ["tree", 1600, 350, {}], ["tree", 20, 350, {}]
      ].concat(scatter(61, [["person", 0, W, 432, 10, SHIRTS], ["kid", 0, W, 432, 6, SHIRTS], ["balloon", 0, W, 430, 4, [{ c: "#f03e3e" }, { c: "#fcc419" }, { c: "#69db7c" }]], ["person", 0, W, 716, 6, SHIRTS]])),
      targets: [
        { kind: "coaster", spots: [[120, 124], [600, 124]] },
        { kind: "kanransha", spots: [[1150, 130], [1520, 130]] },
        { kind: "kodomo", spots: [[100, 454], [700, 454], [1300, 454, 1]] },
        { kind: "minisl", spots: [[250, 544], [900, 544, 1], [1500, 544]] },
        { kind: "roadtrain", spots: [[80, 622], [650, 622, 1], [1250, 622]] }
      ],
      extras: [{ id: "cow", spots: [[440, 136], [960, 456]] }]
    }
  ];

  /* ---------- けいさん ---------- */
  // え の かこみ（rot が あれば まわした あと の かこみ）
  function bbox(art, sp) {
    var a = ART[art], x = sp[0], y = sp[1], rot = sp[3] || 0;
    if (!rot) return { x: x, y: y, w: a.w, h: a.h };
    var t = rot * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), px = x + a.w / 2, py = y + a.h;
    var xs = [], ys = [];
    [[x, y], [x + a.w, y], [x, y + a.h], [x + a.w, y + a.h]].forEach(function (p) { var dx = p[0] - px, dy = p[1] - py; xs.push(px + dx * c - dy * s); ys.push(py + dx * s + dy * c); });
    var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
    return { x: x0, y: y0, w: Math.max.apply(null, xs) - x0, h: Math.max.apply(null, ys) - y0 };
  }
  function hitbox(art, sp) { var b = bbox(art, sp); return { x: b.x - MARGIN, y: b.y - MARGIN, w: b.w + MARGIN * 2, h: b.h + MARGIN * 2 }; }
  function overlap(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
  function transform(art, sp) {
    var a = ART[art], t = "translate(" + sp[0] + "," + sp[1] + ")";
    if (sp[3]) t += " rotate(" + sp[3] + "," + a.w / 2 + "," + a.h + ")";
    if (sp[2]) t += " translate(" + a.w + ",0) scale(-1,1)";
    return t;
  }
  // まいかい の はいち: さがす もの 5つ と おまけ。rnd は 0〜1 を かえす かんすう。
  function layout(town, rnd) {
    rnd = rnd || Math.random;
    var pick = function (sp) { return sp[Math.floor(rnd() * sp.length)]; };
    return {
      targets: town.targets.map(function (t) { return { id: t.kind, kind: KINDS[t.kind], art: t.kind, spot: pick(t.spots) }; }),
      extras: town.extras.map(function (e) { return { id: e.id, extra: EXTRAS[e.id], art: e.id, spot: pick(e.spots) }; })
    };
  }
  // {漢字|かんじ} → <ruby>、よみあげ は よみ だけ
  function ruby(s) { return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>"); }
  function plain(s) { return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "$2"); }

  var api = { W: W, H: H, MARGIN: MARGIN, KINDS: KINDS, EXTRAS: EXTRAS, TOWNS: TOWNS, bbox: bbox, hitbox: hitbox, overlap: overlap, transform: transform, layout: layout, ruby: ruby, plain: plain };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DDScenes = api;
})(this);
