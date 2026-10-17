/* ============================================================
   ちずきごう たからさがし — きごうの データ と え（SVG）
   ・かたちは 国土地理院の 2万5千分1 地形図の 記号に そろえる。
   ・え は 100×100 の なかに かく（ink = せんの いろ）。
   ・ふりがなは {漢字|よみ} と かく（app.js の rb() で <ruby> に なる）。
   ・node でも よめる（tests / tools から require する）。
   ============================================================ */
(function (root) {
  "use strict";

  var SW = 6; // せんの ふとさ

  function line(x1, y1, x2, y2, w) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke-width="' + (w || SW) + '" stroke-linecap="round"/>';
  }
  function circle(cx, cy, r, w, fill) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke-width="' + (w || SW) + '" fill="' + (fill || "none") + '"/>';
  }
  function path(d, w, fill) {
    return '<path d="' + d + '" stroke-width="' + (w || SW) + '" fill="' + (fill || "none") + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  // 「文」（cx, cy を まんなかに、s ばい）
  function bun(cx, cy, s, w) {
    function p(x, y) { return (cx + (x - 50) * s).toFixed(1) + " " + (cy + (y - 50) * s).toFixed(1); }
    return path("M" + p(50, 14) + " L" + p(50, 26), w) +
      path("M" + p(18, 32) + " L" + p(82, 32), w) +
      path("M" + p(32, 36) + " Q" + p(44, 66) + " " + p(82, 86), w) +
      path("M" + p(68, 36) + " Q" + p(56, 66) + " " + p(18, 86), w);
  }
  // はぐるま
  function gear(cx, cy, r, teeth, w) {
    var d = "", n = teeth * 2, ro = r, ri = r * .74;
    for (var i = 0; i < n * 2; i++) {
      var a0 = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      var rr = (Math.floor(i / 2) % 2 === 0) ? ro : ri;
      var x = cx + Math.cos(a0) * rr, y = cy + Math.sin(a0) * rr;
      d += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return path(d + " Z", w) + circle(cx, cy, r * .3, w);
  }

  // 2つ ならべる（た・はたけ など は おなじ もようを くりかえす）
  function twice(fn) { return fn(31, 36) + fn(69, 68); }

  var SYMBOLS = [
    // ---------------- たてもの ----------------
    { id: "post", code: "P", kind: "build", name: "ゆうびんきょく", kanji: "{郵便局|ゆうびんきょく}",
      why: "むかし ゆうびんの しごとを した「{逓信省|ていしんしょう}」の「テ」を もとに した 〒 を、○で かこんだ かたち。",
      draw: function () { return circle(50, 50, 38) + line(31, 33, 69, 33) + line(31, 45, 69, 45) + line(50, 45, 50, 76); } },
    { id: "school", code: "S", kind: "build", name: "しょう・ちゅうがっこう", short: "がっこう", kanji: "{小|しょう}・{中学校|ちゅうがっこう}",
      why: "{文字|もじ}の「{文|ぶん}」の かたち。べんきょうする ところ だから。",
      draw: function () { return bun(50, 50, 1); } },
    { id: "high", code: "H", kind: "build", name: "こうとうがっこう", short: "こうこう", kanji: "{高等学校|こうとうがっこう}",
      why: "がっこうの「{文|ぶん}」を ○で かこむと こうこう。○が ない「{文|ぶん}」だけ なら しょう・ちゅうがっこう。",
      draw: function () { return circle(50, 50, 42) + bun(50, 51, .68, 5.5); } },
    { id: "police", code: "K", kind: "build", name: "けいさつしょ", kanji: "{警察署|けいさつしょ}",
      why: "けいさつかんが もつ「けいぼう」を 2ほん くみあわせた × を、○で かこんだ かたち。",
      draw: function () { return circle(50, 50, 38) + line(33, 33, 67, 67) + line(67, 33, 33, 67); } },
    { id: "koban", code: "X", kind: "build", name: "こうばん", kanji: "{交番|こうばん}",
      why: "けいぼうを くみあわせた × だけ。○で かこむと けいさつしょ に なる。",
      draw: function () { return line(26, 26, 74, 74, 8) + line(74, 26, 26, 74, 8); } },
    { id: "fire", code: "F", kind: "build", name: "しょうぼうしょ", kanji: "{消防署|しょうぼうしょ}",
      why: "むかしの ひけしが つかった どうぐ「さすまた」の かたち。",
      draw: function () { return path("M26 16 Q28 50 50 52 Q72 50 74 16", 7) + line(50, 52, 50, 86, 7); } },
    { id: "hospital", code: "B", kind: "build", name: "びょういん", kanji: "{病院|びょういん}",
      why: "むかしの {軍隊|ぐんたい}で けがや びょうきを みた {人|ひと}たちの しるし（{十字|じゅうじ}）を、○で かこんだ かたち。",
      draw: function () { return circle(50, 50, 38) + line(50, 26, 50, 74, 8) + line(26, 50, 74, 50, 8); } },
    { id: "city", code: "C", kind: "build", name: "しやくしょ", kanji: "{市役所|しやくしょ}",
      why: "◎（{二重丸|にじゅうまる}）。{市|し}の まんなかの だいじな ところ。",
      draw: function () { return circle(50, 50, 38) + circle(50, 50, 19); } },
    { id: "library", code: "L", kind: "build", name: "としょかん", kanji: "{図書館|としょかん}",
      why: "ひらいた ほんの かたち。",
      draw: function () { return path("M50 32 Q34 22 16 26 L16 72 Q34 68 50 78 Q66 68 84 72 L84 26 Q66 22 50 32 Z") + line(50, 32, 50, 78); } },
    { id: "museum", code: "M", kind: "build", name: "はくぶつかん", kanji: "{博物館|はくぶつかん}・{美術館|びじゅつかん}",
      why: "はくぶつかんや びじゅつかんの たてものの かたち（さんかくの やねの たてもの）。",
      draw: function () { return path("M16 42 L50 16 L84 42 Z") + path("M24 42 L24 82 L76 82 L76 42"); } },
    { id: "shrine", code: "J", kind: "build", name: "じんじゃ", kanji: "{神社|じんじゃ}",
      why: "じんじゃの いりぐちに ある「とりい」の かたち。",
      draw: function () { return path("M12 24 Q50 30 88 24", 8) + line(24, 40, 76, 40) + line(32, 26, 30, 86, 7) + line(68, 26, 70, 86, 7); } },
    { id: "temple", code: "T", kind: "build", name: "てら", kanji: "お{寺|てら}",
      why: "おてらの しるしに つかわれる「{卍|まんじ}」の かたち。",
      draw: function () { return path("M22 22 L50 22 L50 78 L78 78") + path("M22 78 L22 50 L78 50 L78 22"); } },
    { id: "factory", code: "G", kind: "build", name: "こうじょう", kanji: "{工場|こうじょう}",
      why: "きかいの「はぐるま」の かたち。",
      draw: function () { return gear(50, 50, 36, 6); } },
    { id: "power", code: "D", kind: "build", name: "はつでんしょ", kanji: "{発電所|はつでんしょ}",
      why: "はぐるま と、でんきが ながれる せん（{回路|かいろ}）を くみあわせた かたち。",
      draw: function () { return gear(50, 50, 26, 6) + line(8, 50, 24, 50) + line(76, 50, 92, 50); } },
    { id: "elder", code: "R", kind: "build", name: "ろうじんホーム", kanji: "{老人|ろうじん}ホーム",
      why: "たてものの なかに おとしよりが つかう「つえ」が ある かたち。",
      draw: function () { return path("M14 46 L50 16 L86 46 L86 86 L14 86 Z") + path("M46 80 L46 50 Q46 40 55 40 Q64 40 64 49", 7); } },

    // ---------------- とち ----------------
    { id: "rice", code: "t", kind: "land", name: "た", kanji: "{田|た}",
      why: "いねを かりとった あとに のこる「かぶ」の かたち。",
      bg: "#eef3c9",
      draw: function () { return twice(function (x, y) { return line(x - 5, y - 10, x - 5, y + 10, 5) + line(x + 5, y - 10, x + 5, y + 10, 5); }); } },
    { id: "field", code: "h", kind: "land", name: "はたけ", kanji: "{畑|はたけ}",
      why: "たねから でた「ふたば」の かたち。",
      bg: "#f5ebd3",
      draw: function () { return twice(function (x, y) { return path("M" + (x - 11) + " " + (y - 10) + " Q" + (x - 9) + " " + (y + 6) + " " + x + " " + (y + 8) + " Q" + (x + 9) + " " + (y + 6) + " " + (x + 11) + " " + (y - 10), 5); }); } },
    { id: "orchard", code: "o", kind: "land", name: "かじゅえん", kanji: "{果樹園|かじゅえん}",
      why: "りんごや みかんなどの くだものを よこから みた かたち。",
      bg: "#e6f3d6",
      draw: function () { return twice(function (x, y) { return circle(x, y + 4, 9, 5) + line(x, y - 5, x, y - 14, 5); }); } },
    { id: "tea", code: "c", kind: "land", name: "ちゃばたけ", kanji: "{茶畑|ちゃばたけ}",
      why: "おちゃの みを わった ときの かたち（∴）。",
      bg: "#dcefd0",
      draw: function () { return twice(function (x, y) { return circle(x, y - 7, 5, 4.5) + circle(x - 8, y + 7, 5, 4.5) + circle(x + 8, y + 7, 5, 4.5); }); } },
    { id: "broad", code: "w", kind: "land", name: "こうようじゅりん", kanji: "{広葉樹林|こうようじゅりん}",
      why: "さくらや かえでの ような、はが ひろい きを よこから みた かたち。",
      bg: "#d6ecc8",
      draw: function () { return twice(function (x, y) { return circle(x, y - 2, 11, 5) + line(x, y + 9, x, y + 17, 5); }); } },
    { id: "needle", code: "n", kind: "land", name: "しんようじゅりん", kanji: "{針葉樹林|しんようじゅりん}",
      why: "まつや すぎの ような、はが はりの ように とがった きを よこから みた かたち。",
      bg: "#cfe5c6",
      draw: function () { return twice(function (x, y) { return path("M" + (x - 12) + " " + (y + 8) + " L" + x + " " + (y - 14) + " L" + (x + 12) + " " + (y + 8), 5) + line(x, y - 14, x, y + 16, 5); }); } },

    // ---------------- てつどう ----------------
    { id: "jr", code: "=", kind: "rail", name: "JRせん", kanji: "JR{線|せん}",
      why: "JRの せんろは、しろと くろの「しましま」。",
      draw: function (conn) { return railJR(conn); } },
    { id: "rail", code: "-", kind: "rail", name: "JRいがいの てつどう", short: "JRいがい", kanji: "JR{以外|いがい}の {鉄道|てつどう}",
      why: "JRで ない てつどうは、せんに みじかい よこせんが ならぶ。せんろの まくらぎ みたいだね。",
      draw: function (conn) { return railOther(conn); } },
    { id: "station", code: "E", kind: "rail", name: "えき", kanji: "{駅|えき}",
      why: "せんろの うえの ながしかく。でんしゃが とまる ところ。",
      draw: function (conn) { return (conn && conn.other ? railOther(conn) : railJR(conn)) + stationBox(conn); } }
  ];

  // ---- てつどう: conn = { n, e, s, w } つながって いる ほう ----
  function segs(conn) {
    conn = conn || {};
    var out = [];
    if (conn.n) out.push([50, 50, 50, -1]);
    if (conn.s) out.push([50, 50, 50, 101]);
    if (conn.e) out.push([50, 50, 101, 50]);
    if (conn.w) out.push([50, 50, -1, 50]);
    if (!out.length) out = [[-1, 50, 101, 50]];
    else if (out.length === 1) { // かたほう だけ なら はんたいがわも のばす
      var s = out[0]; out.push([50, 50, 100 - s[2], 100 - s[3]]);
    }
    return out;
  }
  function vertical(conn) { return !!(conn && (conn.n || conn.s) && !conn.e && !conn.w); }
  function railJR(conn) {
    var a = "", b = "";
    segs(conn).forEach(function (s) {
      a += '<line x1="' + s[0] + '" y1="' + s[1] + '" x2="' + s[2] + '" y2="' + s[3] + '" stroke-width="16" stroke-linecap="butt"/>';
      b += '<line x1="' + s[0] + '" y1="' + s[1] + '" x2="' + s[2] + '" y2="' + s[3] + '" stroke-width="9" stroke="#fff" stroke-dasharray="17 17" stroke-dashoffset="8" stroke-linecap="butt"/>';
    });
    return a + b;
  }
  function railOther(conn) {
    var a = "";
    segs(conn).forEach(function (s) {
      a += '<line x1="' + s[0] + '" y1="' + s[1] + '" x2="' + s[2] + '" y2="' + s[3] + '" stroke-width="6" stroke-linecap="butt"/>';
      var dx = s[2] - s[0], dy = s[3] - s[1], len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
      for (var d = 17; d < len; d += 34) {
        var x = s[0] + ux * d, y = s[1] + uy * d;
        a += line((x - uy * 12).toFixed(1), (y + ux * 12).toFixed(1), (x + uy * 12).toFixed(1), (y - ux * 12).toFixed(1), 5);
      }
    });
    return a;
  }
  function stationBox(conn) {
    return vertical(conn)
      ? '<rect x="37" y="22" width="26" height="56" fill="#fff" stroke-width="6"/>'
      : '<rect x="22" y="37" width="56" height="26" fill="#fff" stroke-width="6"/>';
  }

  var BY_ID = {}, BY_CODE = {};
  SYMBOLS.forEach(function (s) { BY_ID[s.id] = s; BY_CODE[s.code] = s; });

  // まちがえやすい なかま（4たくの まぎらわしい こたえに つかう）
  var CONFUSE = [
    ["school", "high"], ["police", "koban", "hospital"], ["factory", "power"],
    ["post", "city", "police", "hospital", "high"], ["rice", "field", "tea"],
    ["broad", "needle", "orchard"], ["jr", "rail", "station"], ["shrine", "temple"],
    ["library", "museum", "elder"]
  ];

  // きごうの SVG（<svg> まるごと）
  function svg(id, opt) {
    opt = opt || {};
    var s = BY_ID[id]; if (!s) return "";
    var ink = opt.ink || "#2b2b2b";
    var bg = opt.bg === false ? "" : '<rect x="0" y="0" width="100" height="100" rx="14" fill="' + (opt.bg || s.bg || "#fff") + '" stroke="none"/>';
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"' + (opt.cls ? ' class="' + opt.cls + '"' : "") + ">" + bg +
      '<g fill="none" stroke="' + ink + '">' + s.draw(opt.conn) + "</g></svg>";
  }

  var API = { SYMBOLS: SYMBOLS, BY_ID: BY_ID, BY_CODE: BY_CODE, CONFUSE: CONFUSE, svg: svg };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CHIZU_SYMBOLS = API;
})(this);
