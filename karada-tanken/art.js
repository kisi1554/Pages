/* ============================================================
   からだ たんけん — え（SVG を コードで かく）
   ・こわくない ように、ないぞうや ほねは まるく デフォルメ。
   ・SVG の なかの もじは ひらがな／カタカナ だけ（ふりがなを つけられない ため）。
   ============================================================ */
var KaradaArt = (function () {
  "use strict";

  var SKIN = "#ffdcc2", SKIN_DK = "#e0a882", BODY = "#fff1e8";
  var BONE = "#fffaf0", BONE_OL = "#b7a684";

  function svg(vb, inner, extra) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet"' + (extra || "") + ">" + inner + "</svg>";
  }

  /* ---------- からだ ぜんしん（viewBox 0 0 200 360） ---------- */
  function face() {
    return '<path d="M58 56 Q58 14 100 14 Q142 14 142 56 Q134 34 114 32 Q104 42 88 35 Q66 36 58 56Z" fill="#6b4632"/>' +
      '<ellipse cx="86" cy="62" rx="4.5" ry="6" fill="#3b2a20"/><ellipse cx="114" cy="62" rx="4.5" ry="6" fill="#3b2a20"/>' +
      '<circle cx="87.5" cy="60" r="1.6" fill="#fff"/><circle cx="115.5" cy="60" r="1.6" fill="#fff"/>' +
      '<ellipse cx="76" cy="75" rx="7" ry="4" fill="#ff8fa3" opacity=".55"/><ellipse cx="124" cy="75" rx="7" ry="4" fill="#ff8fa3" opacity=".55"/>' +
      '<path d="M91 80 Q100 89 109 80" fill="#e8667a" stroke="#a33a4a" stroke-width="2" stroke-linecap="round"/>';
  }
  function organs() {
    return (
      // きかん・しょくどう
      '<path d="M98 98 L98 132" stroke="#a5d8ff" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M98 130 Q90 132 86 140 M98 130 Q106 132 112 140" stroke="#a5d8ff" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M103 98 Q104 140 110 180" stroke="#f4a6a6" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      // はい
      '<path d="M95 132 Q78 124 70 142 Q64 164 68 184 Q82 190 96 182 Z" fill="#ffc9d0" stroke="#f08c9a" stroke-width="2"/>' +
      '<path d="M105 132 Q122 124 130 142 Q136 164 132 184 Q124 188 118 182 Q114 172 105 170 Z" fill="#ffc9d0" stroke="#f08c9a" stroke-width="2"/>' +
      // しんぞう
      '<path d="M110 176 C95 166 95 152 103 150 C107 149 110 152 110 154 C110 152 113 149 117 150 C125 152 125 166 110 176Z" fill="#e03131" stroke="#a51111" stroke-width="1.5"/>' +
      '<ellipse cx="105" cy="156" rx="2.5" ry="1.6" fill="#fff" opacity=".7"/>' +
      // かんぞう（うすく）
      '<path d="M64 186 Q88 180 104 190 Q96 204 68 200 Z" fill="#c97b63" opacity=".45"/>' +
      // い
      '<path d="M108 184 Q134 180 134 198 Q132 214 112 214 Q100 214 97 206 Q108 204 110 196 Z" fill="#ffa94d" stroke="#e8590c" stroke-width="2"/>' +
      // だいちょう・しょうちょう
      '<path d="M86 250 L78 250 Q72 250 72 242 L72 226 Q72 218 80 218 L120 218 Q128 218 128 226 L128 242 Q128 250 120 250 L106 250 L102 258" stroke="#d9a066" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M84 228 Q92 222 100 228 T116 228 Q120 234 114 236 T98 236 T84 238 Q80 244 88 244 T104 244 T116 243" stroke="#ffc078" stroke-width="5" fill="none" stroke-linecap="round"/>'
    );
  }
  function body(opt) {
    opt = opt || {};
    var s = "";
    // あし
    s += '<rect x="73" y="236" width="25" height="104" rx="12.5" fill="' + SKIN + '" stroke="' + SKIN_DK + '" stroke-width="2.5"/>';
    s += '<rect x="102" y="236" width="25" height="104" rx="12.5" fill="' + SKIN + '" stroke="' + SKIN_DK + '" stroke-width="2.5"/>';
    s += '<ellipse cx="84" cy="342" rx="16" ry="8" fill="#ff8787"/><ellipse cx="116" cy="342" rx="16" ry="8" fill="#ff8787"/>';
    // うで
    s += '<path d="M68 128 Q52 172 48 222 M132 128 Q148 172 152 222" stroke="' + SKIN_DK + '" stroke-width="24" fill="none" stroke-linecap="round"/>';
    s += '<path d="M68 128 Q52 172 48 222 M132 128 Q148 172 152 222" stroke="' + SKIN + '" stroke-width="19" fill="none" stroke-linecap="round"/>';
    s += '<circle cx="47" cy="230" r="11" fill="' + SKIN + '" stroke="' + SKIN_DK + '" stroke-width="2.5"/><circle cx="153" cy="230" r="11" fill="' + SKIN + '" stroke="' + SKIN_DK + '" stroke-width="2.5"/>';
    // うでと あしの ほね（うっすら）
    s += '<g stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"><path d="M66 134 Q55 172 50 218 M134 134 Q145 172 150 218 M85 256 L85 330 M115 256 L115 330"/></g>';
    s += '<g fill="#fff" opacity=".9"><circle cx="56" cy="176" r="3.5"/><circle cx="144" cy="176" r="3.5"/><circle cx="85" cy="296" r="4"/><circle cx="115" cy="296" r="4"/></g>';
    // くび・どう
    s += '<rect x="91" y="94" width="18" height="22" fill="' + SKIN + '"/>';
    s += '<path d="M66 118 Q100 108 134 118 Q142 122 142 136 L138 238 Q138 260 118 262 L82 262 Q62 260 62 238 L58 136 Q58 122 66 118Z" fill="' + BODY + '" stroke="' + SKIN_DK + '" stroke-width="2.5"/>';
    s += organs();
    // あたま
    s += '<circle cx="100" cy="58" r="42" fill="' + SKIN + '" stroke="' + SKIN_DK + '" stroke-width="2.5"/>';
    s += face();
    if (opt.hots) {
      opt.hots.forEach(function (h, i) {
        s += '<g class="hot" data-course="' + i + '" role="button" aria-label="' + h.label + '">' +
          '<circle cx="' + h.x + '" cy="' + h.y + '" r="26" fill="transparent"/>' +
          '<circle class="ring" cx="' + h.x + '" cy="' + h.y + '" r="17" stroke="' + h.color + '"/>' +
          '<circle class="dot" cx="' + h.x + '" cy="' + h.y + '" r="12" fill="' + h.color + '"/>' +
          '<text x="' + h.x + '" y="' + (h.y + 4.5) + '" font-size="13" text-anchor="middle">' + h.e + "</text></g>";
      });
    }
    if (opt.dot) {
      s += '<circle cx="' + opt.dot[0] + '" cy="' + opt.dot[1] + '" r="22" fill="#fa5252" opacity=".25"><animate attributeName="r" values="12;26;12" dur="1.4s" repeatCount="indefinite"/></circle>';
      s += '<circle cx="' + opt.dot[0] + '" cy="' + opt.dot[1] + '" r="9" fill="#fa5252" stroke="#fff" stroke-width="3"/>';
    }
    return svg("0 0 200 360", s, opt.label ? ' role="img" aria-label="' + opt.label + '"' : "");
  }

  /* ---------- ほねの かたち（ちゅうしん 0,0・たて むき） ---------- */
  function boneShape(fills, strokes) {
    strokes = strokes || [];
    var ol = strokes.map(function (p) { return '<path d="' + p[0] + '" stroke-width="' + (p[1] + 5) + '"/>'; }).join("");
    var inner = strokes.map(function (p) { return '<path d="' + p[0] + '" stroke-width="' + p[1] + '"/>'; }).join("");
    return '<g class="bone">' +
      '<g class="bone-ol" fill="' + BONE_OL + '" stroke="' + BONE_OL + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' + fills + "</g>" +
      '<g class="bone-ol" fill="none" stroke="' + BONE_OL + '" stroke-linecap="round">' + ol + "</g>" +
      '<g fill="' + BONE + '">' + fills + "</g>" +
      '<g fill="none" stroke="' + BONE + '" stroke-linecap="round">' + inner + "</g></g>";
  }
  function longFills(len, w, dx) {
    dx = dx || 0;
    var h = len / 2, r = w * 0.58;
    return '<rect x="' + (dx - w / 2) + '" y="' + (-h) + '" width="' + w + '" height="' + len + '" rx="' + (w / 2) + '"/>' +
      '<circle cx="' + (dx - w * 0.42) + '" cy="' + (-h + 2) + '" r="' + r + '"/><circle cx="' + (dx + w * 0.42) + '" cy="' + (-h + 2) + '" r="' + r + '"/>' +
      '<circle cx="' + (dx - w * 0.42) + '" cy="' + (h - 2) + '" r="' + r + '"/><circle cx="' + (dx + w * 0.42) + '" cy="' + (h - 2) + '" r="' + r + '"/>';
  }
  var BONE_KIND = {
    uarm: function () { return boneShape(longFills(68, 11)); },
    farm: function () { return boneShape(longFills(60, 6, -4.5) + longFills(60, 6, 4.5)); },
    thigh: function () { return boneShape(longFills(74, 14)); },
    shin: function () { return boneShape(longFills(66, 10, -3) + longFills(62, 5, 7)); },
    skull: function () {
      var f = '<ellipse cx="0" cy="-6" rx="29" ry="30"/><rect x="-17" y="10" width="34" height="24" rx="11"/>';
      return boneShape(f) +
        '<ellipse cx="-11" cy="-2" rx="8" ry="9" fill="#e8dfcc"/><ellipse cx="11" cy="-2" rx="8" ry="9" fill="#e8dfcc"/>' +
        '<circle cx="-9" cy="-5" r="2.2" fill="#fff"/><circle cx="13" cy="-5" r="2.2" fill="#fff"/>' +
        '<path d="M-3 10 L3 10 L0 14Z" fill="#d8ccb2"/>' +
        '<path d="M-10 23 Q0 29 10 23" stroke="#c9bb9c" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        '<path d="M-6 22 L-6 26 M0 23.5 L0 27.5 M6 22 L6 26" stroke="#d8ccb2" stroke-width="1.5"/>';
    },
    ribs: function () {
      var f = "", st = [];
      for (var k = 0; k < 10; k++) f += '<rect x="-5" y="' + (-48 + k * 10.5) + '" width="10" height="8" rx="3"/>';
      f += '<rect x="-4.5" y="-38" width="9" height="46" rx="4.5"/>';
      for (var j = 0; j < 5; j++) {
        var y = -32 + j * 13, ww = 30 + (j < 3 ? j * 3 : 6 - (j - 3) * 3);
        st.push(["M-4 " + y + " Q" + (-ww - 6) + " " + (y - 4) + " " + (-ww) + " " + (y + 18), 4.5]);
        st.push(["M4 " + y + " Q" + (ww + 6) + " " + (y - 4) + " " + ww + " " + (y + 18), 4.5]);
      }
      st.push(["M-3 -44 Q-18 -50 -33 -44", 5]);
      st.push(["M3 -44 Q18 -50 33 -44", 5]);
      return boneShape(f, st);
    },
    pelvis: function () {
      var f = '<path d="M0 -6 Q-14 -20 -31 -15 Q-38 0 -27 13 Q-14 19 -6 11 L6 11 Q14 19 27 13 Q38 0 31 -15 Q14 -20 0 -6Z"/><rect x="-7" y="-16" width="14" height="22" rx="6"/>';
      return boneShape(f) + '<circle cx="-15" cy="4" r="4.5" fill="#e8dfcc"/><circle cx="15" cy="4" r="4.5" fill="#e8dfcc"/>';
    }
  };
  function bone(kind) { return BONE_KIND[kind](); }
  function place(b, inner) {
    return '<g transform="translate(' + b.x + " " + b.y + ") rotate(" + b.rot + ')">' + inner + "</g>";
  }
  function handsFeet(color) {
    var c = color || BONE;
    return '<g fill="' + c + '" stroke="' + BONE_OL + '" stroke-width="2" opacity=".85">' +
      '<ellipse cx="144" cy="256" rx="8" ry="11"/><ellipse cx="256" cy="256" rx="8" ry="11"/>' +
      '<ellipse cx="178" cy="386" rx="13" ry="6"/><ellipse cx="222" cy="386" rx="13" ry="6"/>' +
      '<rect x="195" y="84" width="10" height="12" rx="3"/></g>';
  }
  function silhouette() {
    // ほね パズル・ほね しらべ の うしろの からだ（うっすら）
    return '<g fill="#fff" opacity=".75" stroke="#e5dbff" stroke-width="3">' +
      '<circle cx="200" cy="50" r="40"/>' +
      '<path d="M162 100 Q200 90 238 100 Q250 104 252 120 L262 250 Q262 262 252 262 L240 262 L236 190 L234 236 Q234 252 226 256 L226 392 L206 392 L202 290 L198 290 L194 392 L174 392 L174 256 Q166 252 166 236 L164 190 L160 262 L148 262 Q138 262 138 250 L148 120 Q150 104 162 100Z"/></g>';
  }
  function skeleton() {
    var s = silhouette() + handsFeet();
    KaradaData.BONES.forEach(function (b) { s += place(b, bone(b.kind)); });
    return s;
  }

  /* ---------- うで（きんにく）viewBox 0 0 400 300 ---------- */
  var ARM = { E: [228, 172], S: [56, 172] };
  function armGeo(deg) {
    var a = deg * Math.PI / 180, E = ARM.E;
    var d = [Math.cos(a), -Math.sin(a)], up = [d[1], -d[0]];
    function at(k, n) { return [E[0] + d[0] * k + up[0] * n, E[1] + d[1] * k + up[1] * n]; }
    return {
      d: d, up: up, at: at,
      bicO: [84, 158], bicI: at(30, 9),
      triO: [84, 186], triI: at(-13, -9),
      hand: at(152, 0)
    };
  }
  function muscle(O, I, base, color) {
    var dx = I[0] - O[0], dy = I[1] - O[1], L = Math.sqrt(dx * dx + dy * dy);
    var px = -dy / L, py = dx / L, mx = (O[0] + I[0]) / 2, my = (O[1] + I[1]) / 2;
    var ht = Math.max(6, Math.min(28, base * Math.pow(150 / L, 1.7)));
    // けん（はしっこ）を のこして ふくらませる
    var t0 = 14 / L, A = [O[0] + dx * t0, O[1] + dy * t0], B = [I[0] - dx * t0, I[1] - dy * t0];
    var c1 = [mx + px * ht * 2, my + py * ht * 2], c2 = [mx - px * ht * 2, my - py * ht * 2];
    return '<path d="M' + O[0] + " " + O[1] + " L" + A[0] + " " + A[1] + '" stroke="#f8f9fa" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M' + I[0] + " " + I[1] + " L" + B[0] + " " + B[1] + '" stroke="#f8f9fa" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M' + A[0] + " " + A[1] + " Q" + c1[0] + " " + c1[1] + " " + B[0] + " " + B[1] + " Q" + c2[0] + " " + c2[1] + " " + A[0] + " " + A[1] + 'Z" fill="' + color + '" stroke="#c92a2a" stroke-width="2" opacity=".93"/>' +
      '<path d="M' + (A[0] * .7 + B[0] * .3) + " " + (A[1] * .7 + B[1] * .3) + " L" + (A[0] * .3 + B[0] * .7) + " " + (A[1] * .3 + B[1] * .7) + '" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>';
  }
  /* st: { bic: "c" ちぢむ | "r" ゆるむ | "n", tri: … , labels: true } */
  function arm(deg, st) {
    st = st || {};
    var g = armGeo(deg), E = ARM.E, s = "";
    var fore = g.at(140, 0);
    s += '<rect x="-30" y="40" width="70" height="270" rx="30" fill="' + SKIN + '" stroke="' + SKIN_DK + '" stroke-width="3"/>';
    s += '<path d="M30 172 L' + E[0] + " " + E[1] + '" stroke="' + SKIN_DK + '" stroke-width="66" stroke-linecap="round"/>';
    s += '<path d="M' + E[0] + " " + E[1] + " L" + fore[0] + " " + fore[1] + '" stroke="' + SKIN_DK + '" stroke-width="52" stroke-linecap="round"/>';
    s += '<path d="M30 172 L' + E[0] + " " + E[1] + '" stroke="' + SKIN + '" stroke-width="60" stroke-linecap="round" opacity=".9"/>';
    s += '<path d="M' + E[0] + " " + E[1] + " L" + fore[0] + " " + fore[1] + '" stroke="' + SKIN + '" stroke-width="46" stroke-linecap="round" opacity=".9"/>';
    s += '<circle cx="' + g.hand[0] + '" cy="' + g.hand[1] + '" r="27" fill="' + SKIN + '" stroke="' + SKIN_DK + '" stroke-width="3"/>';
    // りんご
    s += '<circle cx="' + (g.hand[0] + g.up[0] * 26) + '" cy="' + (g.hand[1] + g.up[1] * 26) + '" r="16" fill="#fa5252"/>';
    s += '<path d="M' + (g.hand[0] + g.up[0] * 26) + " " + (g.hand[1] + g.up[1] * 26 - 14) + ' l4 -8" stroke="#5c940d" stroke-width="3" stroke-linecap="round"/>';
    // ほね
    s += '<path d="M60 172 L' + (E[0] - 6) + ' 172" stroke="' + BONE_OL + '" stroke-width="18" stroke-linecap="round"/><path d="M60 172 L' + (E[0] - 6) + ' 172" stroke="' + BONE + '" stroke-width="12" stroke-linecap="round"/>';
    var f0 = g.at(8, 0), f1 = g.at(132, 0);
    s += '<path d="M' + f0[0] + " " + f0[1] + " L" + f1[0] + " " + f1[1] + '" stroke="' + BONE_OL + '" stroke-width="15" stroke-linecap="round"/><path d="M' + f0[0] + " " + f0[1] + " L" + f1[0] + " " + f1[1] + '" stroke="' + BONE + '" stroke-width="9" stroke-linecap="round"/>';
    // ひじ（かんせつ）
    s += '<circle cx="' + E[0] + '" cy="' + E[1] + '" r="10" fill="#e5dbff" stroke="#7048e8" stroke-width="2.5"/>';
    // きんにく
    function col(k) { return k === "c" ? "#f03e3e" : k === "r" ? "#ffc9c9" : "#ff8787"; }
    s += muscle(g.triO, g.triI, 11, col(st.tri));
    s += muscle(g.bicO, g.bicI, 11, col(st.bic));
    if (st.labels) {
      var bm = [(g.bicO[0] + g.bicI[0]) / 2, (g.bicO[1] + g.bicI[1]) / 2], tm = [(g.triO[0] + g.triI[0]) / 2, (g.triO[1] + g.triI[1]) / 2];
      s += label(bm[0], bm[1] - 44, st.labels === "names" ? "うちがわ" : word(st.bic), st.bic === "c" ? "#c92a2a" : "#7a5c58");
      s += label(tm[0], tm[1] + 52, st.labels === "names" ? "そとがわ" : word(st.tri), st.tri === "c" ? "#c92a2a" : "#7a5c58");
      s += '<text x="' + E[0] + '" y="' + (E[1] + 34) + '" font-size="14" font-weight="800" fill="#5f3dc4" text-anchor="middle">ひじ</text>';
    }
    return s;
  }
  function word(k) { return k === "c" ? "ちぢむ！" : k === "r" ? "のびる" : ""; }
  function label(x, y, t, c) {
    if (!t) return "";
    var w = t.length * 17 + 18;
    return '<g><rect x="' + (x - w / 2) + '" y="' + (y - 17) + '" width="' + w + '" height="28" rx="14" fill="#fff" stroke="' + c + '" stroke-width="2.5"/>' +
      '<text x="' + x + '" y="' + (y + 3) + '" font-size="16" font-weight="800" fill="' + c + '" text-anchor="middle">' + t + "</text></g>";
  }

  /* ---------- うんち ---------- */
  function poop(kind) {
    var f = '<g><circle cx="-9" cy="-2" r="2.6" fill="#3b2314"/><circle cx="9" cy="-2" r="2.6" fill="#3b2314"/><path d="M-6 6 Q0 11 6 6" stroke="#3b2314" stroke-width="2" fill="none" stroke-linecap="round"/></g>';
    if (kind === "koro") {
      return '<g fill="#8a5a3c" stroke="#5c3a24" stroke-width="2"><circle cx="-26" cy="8" r="11"/><circle cx="-6" cy="12" r="10"/><circle cx="14" cy="8" r="11"/><circle cx="32" cy="12" r="9"/><circle cx="4" cy="-8" r="14"/></g>' +
        '<g transform="translate(4 -9) scale(.8)">' + f + "</g>";
    }
    return '<path d="M-44 6 Q-46 -14 -24 -16 Q0 -22 22 -14 Q46 -6 44 10 Q40 20 20 18 Q0 14 -22 20 Q-42 24 -44 6Z" fill="#a0673f" stroke="#6d4325" stroke-width="2.5"/>' +
      '<path d="M-30 -6 Q-8 -12 20 -6" stroke="#c48a5c" stroke-width="3" fill="none" stroke-linecap="round"/>' + f;
  }

  /* ---------- ばめんの え ---------- */
  var SCENE = {
    mouth: function () {
      var s = '<rect x="0" y="0" width="400" height="320" fill="#ffe8d6"/>';
      s += '<ellipse cx="200" cy="146" rx="178" ry="122" fill="#f06595"/>';
      s += '<ellipse cx="200" cy="146" rx="166" ry="110" fill="#862e4d"/>';
      s += '<path d="M190 38 Q200 64 210 38" fill="#e64980"/>';
      s += '<ellipse cx="200" cy="232" rx="118" ry="44" fill="#f783ac"/><path d="M200 200 L200 250" stroke="#e64980" stroke-width="3" opacity=".5"/>';
      var top = "", bot = "";
      for (var i = 0; i < 7; i++) {
        var x = 200 + (i - 3) * 31, c = (i - 3) * (i - 3) * 3.2;
        top += '<rect x="' + (x - 13) + '" y="' + (34 + c) + '" width="26" height="34" rx="9" fill="#fff" stroke="#e9ecef" stroke-width="2"/>';
        bot += '<rect x="' + (x - 13) + '" y="' + (222 - c) + '" width="26" height="32" rx="9" fill="#fff" stroke="#e9ecef" stroke-width="2"/>';
      }
      s += '<g id="teethTop">' + top + "</g>";
      s += '<g id="teethBot">' + bot + "</g>";
      s += '<g id="food"></g><g id="spit"></g>';
      return { vb: "0 0 400 320", svg: s };
    },
    water: function () {
      var s = '<rect width="400" height="300" fill="#e7f5ff"/>';
      s += '<g opacity=".6" fill="#a5d8ff"><circle cx="60" cy="60" r="10"/><circle cx="340" cy="90" r="14"/><circle cx="90" cy="230" r="8"/><circle cx="320" cy="240" r="9"/></g>';
      s += '<path d="M150 70 L250 70 L238 262 Q236 272 226 272 L174 272 Q164 272 162 262 Z" fill="#fff" stroke="#74c0fc" stroke-width="5" opacity=".95"/>';
      s += '<path d="M156 120 L244 120 L238 262 Q236 270 226 270 L174 270 Q164 270 162 262 Z" fill="#74c0fc" opacity=".8"/>';
      s += '<path d="M156 120 Q178 112 200 120 T244 120" stroke="#fff" stroke-width="3" fill="none"/>';
      s += '<circle cx="186" cy="180" r="4.5" fill="#1c3d5a"/><circle cx="214" cy="180" r="4.5" fill="#1c3d5a"/><path d="M190 194 Q200 202 210 194" stroke="#1c3d5a" stroke-width="3" fill="none" stroke-linecap="round"/>';
      s += '<ellipse cx="176" cy="190" rx="6" ry="3.5" fill="#ff8fa3" opacity=".6"/><ellipse cx="224" cy="190" rx="6" ry="3.5" fill="#ff8fa3" opacity=".6"/>';
      s += '<path d="M172 90 L176 230" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/>';
      return { vb: "0 0 400 300", svg: s };
    },
    esophagus: function () {
      var s = '<rect width="400" height="300" fill="#fff0f0"/>';
      s += '<rect x="96" y="-10" width="108" height="320" rx="20" fill="#ffa8a8"/>';
      s += '<g id="walls"></g>';
      s += '<text x="232" y="34" font-size="18" font-weight="800" fill="#c92a2a">のど</text>';
      s += '<text x="232" y="284" font-size="18" font-weight="800" fill="#c92a2a">い へ ↓</text>';
      s += '<g id="eso"></g>';
      return { vb: "0 0 400 300", svg: s };
    },
    stomach: function () {
      var P = "M146 6 L176 6 L178 52 Q204 40 252 50 Q344 76 344 162 Q344 252 252 270 Q180 282 150 246 L122 274 L100 258 L130 222 Q108 190 124 150 Q140 110 144 64 Z";
      var s = '<rect width="400" height="300" fill="#fff4e6"/>';
      s += '<defs><clipPath id="stClip"><path d="' + P + '"/></clipPath></defs>';
      s += '<path d="' + P + '" fill="#ffd8a8" stroke="#e8590c" stroke-width="7" stroke-linejoin="round"/>';
      s += '<g clip-path="url(#stClip)"><g id="stuff"></g><path d="M130 120 Q170 110 190 140 M300 110 Q320 150 300 200 M200 250 Q240 240 270 250" stroke="#ffa94d" stroke-width="4" fill="none" opacity=".6"/></g>';
      s += '<g id="juice"></g><g id="guide"></g>';
      return { vb: "0 0 400 300", svg: s, center: [238, 166] };
    },
    intestine: function () {
      var s = '<rect width="400" height="300" fill="#fff3bf"/>';
      s += '<rect y="0" width="400" height="190" fill="#ffec99"/>';
      // じゅうもう
      var v = "";
      for (var x = 14; x < 400; x += 32) v += '<path d="M' + (x - 13) + ' 236 L' + (x - 11) + ' 186 Q' + x + ' 166 ' + (x + 11) + ' 186 L' + (x + 13) + ' 236 Z"/>';
      s += '<g fill="#ffa8a8" stroke="#f06595" stroke-width="2">' + v + "</g>";
      s += '<rect y="230" width="400" height="70" fill="#ffc9c9"/>';
      s += '<rect y="250" width="400" height="34" rx="0" fill="#e03131"/><rect y="254" width="400" height="8" fill="#ff6b6b" opacity=".5"/>';
      s += '<text x="10" y="296" font-size="13" font-weight="800" fill="#fff">けっかん</text>';
      s += '<g id="cells"></g><g id="parts"></g>';
      return { vb: "0 0 400 300", svg: s };
    },
    colon: function () {
      var P = "M80 300 L80 92 Q80 52 120 52 L280 52 Q320 52 320 92 L320 214 Q320 248 286 248 L230 248 Q204 248 204 274 L204 300";
      var s = '<rect width="400" height="300" fill="#fff4e6"/>';
      s += '<path d="' + P + '" stroke="#d9a066" stroke-width="74" fill="none" stroke-linejoin="round"/>';
      s += '<path id="colonPath" d="' + P + '" stroke="#f3d9b1" stroke-width="58" fill="none" stroke-linejoin="round"/>';
      s += '<path d="' + P + '" stroke="#e9c391" stroke-width="58" stroke-dasharray="3 26" fill="none" opacity=".7"/>';
      s += '<g id="mass"></g><g id="drops"></g><g id="poop"></g>';
      return { vb: "0 0 400 300", svg: s };
    },
    lungs: function () {
      var s = '<rect width="400" height="300" fill="#f3f0ff"/>';
      s += '<path d="M200 -4 L200 96 M200 96 Q170 104 150 130 M200 96 Q230 104 250 130" stroke="#91a7ff" stroke-width="16" fill="none" stroke-linecap="round"/>';
      s += '<g id="lungs" style="transform-origin:200px 170px">' +
        '<path d="M188 104 Q140 82 104 132 Q78 190 92 250 Q136 270 186 248 Z" fill="#ffc9d0" stroke="#f06595" stroke-width="4"/>' +
        '<path d="M212 104 Q260 82 296 132 Q322 190 308 250 Q264 270 214 248 Z" fill="#ffc9d0" stroke="#f06595" stroke-width="4"/>' +
        '<path d="M150 130 Q130 160 140 200 M150 150 Q170 180 160 220 M250 130 Q270 160 260 200 M250 150 Q230 180 240 220" stroke="#91a7ff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/></g>';
      s += '<path d="M40 280 Q200 236 360 280" stroke="#e599f7" stroke-width="8" fill="none" stroke-linecap="round"/>';
      s += '<g id="air"></g><g id="rbc"></g>';
      return { vb: "0 0 400 300", svg: s };
    },
    heart: function () {
      var s = '<rect width="400" height="300" fill="#fff5f5"/>';
      s += '<rect x="30" y="22" width="340" height="256" rx="70" fill="none" stroke="#ffc9c9" stroke-width="22"/>';
      s += '<path id="loopPath" d="M200 22 L300 22 Q370 22 370 92 L370 208 Q370 278 300 278 L100 278 Q30 278 30 208 L30 92 Q30 22 100 22 Z" fill="none"/>';
      s += '<g id="flow"></g>';
      s += '<g id="cue"></g>';
      s += '<g id="heartG" style="transform-origin:200px 160px">' +
        '<path d="M170 74 Q170 40 214 40 L250 40" stroke="#e03131" stroke-width="20" fill="none" stroke-linecap="round"/>' +
        '<path d="M236 82 Q240 56 268 52" stroke="#4c6ef5" stroke-width="16" fill="none" stroke-linecap="round"/>' +
        '<path d="M200 240 C120 196 108 140 132 106 C152 80 190 86 200 112 C210 86 248 80 268 106 C292 140 280 196 200 240Z" fill="#f03e3e" stroke="#a51111" stroke-width="5"/>' +
        '<ellipse cx="152" cy="122" rx="12" ry="8" fill="#fff" opacity=".55" transform="rotate(-30 152 122)"/>' +
        '<circle cx="178" cy="150" r="6" fill="#3b0d0d"/><circle cx="222" cy="150" r="6" fill="#3b0d0d"/><circle cx="180" cy="148" r="2" fill="#fff"/><circle cx="224" cy="148" r="2" fill="#fff"/>' +
        '<path d="M188 168 Q200 178 212 168" stroke="#3b0d0d" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="166" cy="166" rx="8" ry="5" fill="#ffa8a8" opacity=".8"/><ellipse cx="234" cy="166" rx="8" ry="5" fill="#ffa8a8" opacity=".8"/></g>';
      return { vb: "0 0 400 300", svg: s };
    },
    circulation: function () {
      var s = '<defs><marker id="arR" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#e03131"/></marker>' +
        '<marker id="arB" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#3b5bdb"/></marker></defs>';
      s += '<rect x="-60" y="0" width="320" height="340" fill="#fff5f5"/>';
      s += '<g fill="#fff" stroke="#ffc9c9" stroke-width="3"><circle cx="100" cy="42" r="30"/>' +
        '<path d="M62 80 Q100 72 138 80 Q150 84 152 100 L160 210 L146 212 L140 130 L138 230 L132 330 L106 330 L100 250 L94 330 L68 330 L62 230 L60 130 L54 212 L40 210 L48 100 Q50 84 62 80Z"/></g>';
      s += '<path d="M96 120 Q76 112 66 128 Q60 146 64 160 Q78 166 94 158Z M112 120 Q130 112 138 128 Q142 146 138 158 Q126 160 116 156Z" fill="#ffc9d0" stroke="#f08c9a" stroke-width="2"/>';
      // からだ への わ（どうみゃく → からだ → じょうみゃく）
      s += '<path d="M116 156 Q154 166 152 220 Q150 290 112 304" stroke="#e03131" stroke-width="7" fill="none" stroke-linecap="round" marker-mid="url(#arR)"/>';
      s += '<path d="M152 196 L152 197" stroke="#e03131" stroke-width="7" marker-end="url(#arR)"/>';
      s += '<path d="M88 304 Q50 290 48 220 Q46 166 100 156" stroke="#3b5bdb" stroke-width="7" fill="none" stroke-linecap="round"/>';
      s += '<path d="M48 198 L48 197" stroke="#3b5bdb" stroke-width="7" marker-end="url(#arB)"/>';
      s += '<path d="M88 304 Q100 312 112 304" stroke="#ae3ec9" stroke-width="7" fill="none" stroke-linecap="round"/>';
      // はい への わ
      s += '<path d="M102 146 Q84 128 72 136" stroke="#3b5bdb" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
      s += '<path d="M78 146 Q96 152 104 150" stroke="#e03131" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
      s += '<path d="M108 164 C96 156 96 146 102 144 C105 143 108 146 108 147 C108 146 111 143 114 144 C120 146 120 156 108 164Z" fill="#f03e3e" stroke="#a51111" stroke-width="1.5"/>';
      s += '<g id="spots"></g>';
      return { vb: "-60 0 320 340", svg: s };
    },
    run: function () {
      var s = '<rect width="400" height="300" fill="#e6fcf5"/><rect y="236" width="400" height="64" fill="#b2f2bb"/>';
      s += '<path d="M0 252 L400 252" stroke="#fff" stroke-width="4" stroke-dasharray="20 14"/>';
      s += '<g stroke="#96f2d7" stroke-width="6" stroke-linecap="round"><path d="M60 120 L120 120 M40 150 L110 150 M70 180 L120 180"/></g>';
      s += '<g transform="translate(220 0)">' +
        '<path d="M-6 150 L-40 196 L-26 232 M10 152 L40 186 L70 176" stroke="' + SKIN_DK + '" stroke-width="20" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M-6 150 L-40 196 L-26 232 M10 152 L40 186 L70 176" stroke="' + SKIN + '" stroke-width="15" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M-20 92 L-50 120 L-34 146 M14 96 L40 116 L58 96" stroke="' + SKIN_DK + '" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M-20 92 L-50 120 L-34 146 M14 96 L40 116 L58 96" stroke="' + SKIN + '" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M-24 84 Q0 74 22 84 L18 156 L-14 156Z" fill="#4dabf7" stroke="#1c7ed6" stroke-width="3"/>' +
        '<circle cx="0" cy="50" r="30" fill="' + SKIN + '" stroke="' + SKIN_DK + '" stroke-width="3"/>' +
        '<path d="M-30 46 Q-28 16 2 18 Q30 20 30 44 Q20 30 4 32 Q-12 30 -30 46Z" fill="#6b4632"/>' +
        '<circle cx="-9" cy="52" r="3.5" fill="#3b2a20"/><circle cx="11" cy="52" r="3.5" fill="#3b2a20"/><path d="M-6 64 Q2 70 10 64" stroke="#a33a4a" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M34 40 Q40 50 34 54 Q28 50 34 40Z" fill="#74c0fc"/>' +
        '<path d="M8 118 C2 113 2 107 5 106 C7 105.5 8 107 8 108 C8 107 9 105.5 11 106 C14 107 14 113 8 118Z" fill="#e03131" transform="translate(-8 -8) scale(1.6)"><animateTransform attributeName="transform" type="scale" additive="sum" values="1;1.25;1" dur=".45s" repeatCount="indefinite"/></path></g>';
      s += '<text x="300" y="70" font-size="26" font-weight="800" fill="#e03131">ドキドキ？</text>';
      return { vb: "0 0 400 300", svg: s };
    },
    skeleton: function () {
      return { vb: "0 0 400 400", svg: '<rect width="400" height="400" fill="#f3f0ff"/>' + skeleton() + '<g id="spots"></g>' };
    },
    puzzle: function () {
      return { vb: "0 0 400 400", svg: '<rect width="400" height="400" fill="#f3f0ff"/>' + silhouette() + handsFeet() + '<g id="slots"></g><g id="pieces"></g>' };
    },
    arm: function () { return { vb: "0 0 400 300", svg: '<rect width="400" height="300" fill="#f8f0fc"/><g id="armG"></g>' }; },
    armQuiz: function () {
      return { vb: "0 0 400 300", svg: '<rect width="400" height="300" fill="#f8f0fc"/>' + arm(70, { bic: "n", tri: "n", labels: "names" }) +
        '<text x="320" y="270" font-size="40" text-anchor="middle">❓</text>' };
    }
  };

  return { body: body, svg: svg, bone: bone, place: place, scene: SCENE, arm: arm, armGeo: armGeo, poop: poop, skeleton: skeleton };
})();
