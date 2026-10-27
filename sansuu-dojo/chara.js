/* ============================================================
   さんすう どうじょう — キャラクター（ぜんぶ オリジナル。SVG を コードで かく）
   ぽんた しはん（たぬき）／ ピッコ（でんしゃ だいすき な ことり）／ ケロ（かえる）
   ============================================================ */
(function (SD) {
  "use strict";
  var C = SD.chara = {};
  C.NAMES = { tanuki: "ぽんた しはん", kotori: "ピッコ", kero: "ケロ" };

  // mood: normal / happy / think / cheer
  C.tanuki = function (mood, belt) {
    mood = mood || "normal";
    var eyes = mood === "happy" || mood === "cheer"
      ? '<path d="M44 58 q6 -7 12 0 M64 58 q6 -7 12 0" stroke="#2b1d12" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
      : '<circle cx="50" cy="58" r="5" fill="#2b1d12"/><circle cx="70" cy="58" r="5" fill="#2b1d12"/><circle cx="51.5" cy="56.5" r="1.6" fill="#fff"/><circle cx="71.5" cy="56.5" r="1.6" fill="#fff"/>';
    var mouth = mood === "think" ? '<path d="M55 76 h10" stroke="#2b1d12" stroke-width="3" stroke-linecap="round"/>'
      : '<path d="M52 74 q8 8 16 0" stroke="#2b1d12" stroke-width="3" fill="' + (mood === "cheer" ? "#e8590c" : "none") + '" stroke-linecap="round"/>';
    var arm = mood === "cheer"
      ? '<path d="M92 96 q14 -18 10 -38" stroke="#7a5230" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M96 40 l14 -14 l6 16 z" fill="#c92a2a" stroke="#7a1c1c" stroke-width="2"/>'
      : mood === "think" ? '<path d="M88 100 q2 -18 -22 -22" stroke="#7a5230" stroke-width="11" fill="none" stroke-linecap="round"/>'
      : '<path d="M92 100 q12 6 14 18" stroke="#7a5230" stroke-width="11" fill="none" stroke-linecap="round"/>';
    return '<svg class="chara tanuki ' + mood + '" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" aria-label="' + C.NAMES.tanuki + '">' +
      // しっぽ（しま もよう）
      '<g transform="rotate(-25 98 118)"><ellipse cx="104" cy="118" rx="12" ry="22" fill="#8a5a33"/><path d="M93 112 h22 M93 122 h22" stroke="#4a2f1a" stroke-width="5"/></g>' +
      // どうぎ
      '<path d="M22 140 q0 -46 38 -50 q38 4 38 50 z" fill="#f8f4ea" stroke="#d6cdb8" stroke-width="2"/>' +
      '<path d="M48 92 l12 22 l12 -22" fill="none" stroke="#d6cdb8" stroke-width="3"/>' +
      '<rect x="26" y="114" width="68" height="10" rx="3" fill="' + (belt || "#212529") + '"/><path d="M58 124 l-8 14 M62 124 l8 14" stroke="' + (belt || "#212529") + '" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M28 100 q-12 6 -14 18" stroke="#7a5230" stroke-width="11" fill="none" stroke-linecap="round"/>' + arm +
      // みみ・かお
      '<ellipse cx="30" cy="30" rx="12" ry="13" fill="#8a5a33"/><ellipse cx="90" cy="30" rx="12" ry="13" fill="#8a5a33"/>' +
      '<ellipse cx="30" cy="31" rx="6" ry="7" fill="#4a2f1a"/><ellipse cx="90" cy="31" rx="6" ry="7" fill="#4a2f1a"/>' +
      '<ellipse cx="60" cy="58" rx="38" ry="34" fill="#a8723f"/>' +
      '<path d="M26 56 q12 -16 26 -4 q8 8 16 0 q14 -12 26 4 q-6 18 -24 12 q-10 -4 -20 0 q-18 6 -24 -12 z" fill="#4a2f1a"/>' +
      '<ellipse cx="60" cy="74" rx="18" ry="13" fill="#f1dcc0"/><ellipse cx="60" cy="68" rx="6" ry="4.5" fill="#2b1d12"/>' +
      eyes + mouth +
      // はちまき
      '<path d="M24 40 q36 -16 72 0" stroke="#fff" stroke-width="7" fill="none"/><circle cx="60" cy="33" r="5" fill="#c92a2a"/>' +
      "</svg>";
  };
  C.kotori = function (mood) {
    var eye = mood === "happy" ? '<path d="M36 34 q4 -5 8 0" stroke="#212529" stroke-width="3" fill="none" stroke-linecap="round"/>' : '<circle cx="40" cy="33" r="4" fill="#212529"/>';
    return '<svg class="chara kotori ' + (mood || "") + '" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-label="' + C.NAMES.kotori + '">' +
      '<ellipse cx="38" cy="48" rx="26" ry="22" fill="#ffd43b"/><ellipse cx="34" cy="54" rx="14" ry="10" fill="#fff3bf"/>' +
      '<path d="M54 44 q14 2 18 12 q-12 2 -18 -4 z" fill="#fab005"/>' +
      '<path d="M60 36 l12 4 l-12 4 z" fill="#f76707"/>' + eye +
      '<circle cx="50" cy="42" r="4" fill="#ffa8a8" opacity=".7"/>' +
      // しゃしょう の ぼうし
      '<path d="M18 26 q20 -18 40 0 z" fill="#1864ab"/><rect x="14" y="24" width="48" height="6" rx="3" fill="#0b3d6e"/><circle cx="38" cy="16" r="3" fill="#ffd43b"/>' +
      '<path d="M30 70 v8 M44 70 v8" stroke="#f76707" stroke-width="3"/>' +
      "</svg>";
  };
  C.kero = function () {
    return '<svg class="chara kero" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-label="' + C.NAMES.kero + '">' +
      '<ellipse cx="40" cy="52" rx="28" ry="20" fill="#51cf66"/><circle cx="26" cy="28" r="11" fill="#51cf66"/><circle cx="54" cy="28" r="11" fill="#51cf66"/>' +
      '<circle cx="26" cy="28" r="6" fill="#fff"/><circle cx="54" cy="28" r="6" fill="#fff"/><circle cx="27" cy="29" r="3" fill="#212529"/><circle cx="55" cy="29" r="3" fill="#212529"/>' +
      '<path d="M28 52 q12 10 24 0" stroke="#2b8a3e" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      "</svg>";
  };
  // じぶん（どうぎ と おび）
  C.gi = function (beltIdx) {
    var b = SD.BELTS[beltIdx], col = b ? b.color : "#f8f4ea", line = b ? b.line : "#d6cdb8";
    return '<svg class="gi" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M14 18 l18 -8 l8 8 l8 -8 l18 8 l10 24 l-12 4 l-4 -10 v40 h-40 v-40 l-4 10 l-12 -4 z" fill="#f8f4ea" stroke="#bdb4a0" stroke-width="2"/>' +
      '<path d="M32 10 l8 30 l8 -30" fill="none" stroke="#bdb4a0" stroke-width="2.5"/>' +
      '<rect x="18" y="44" width="44" height="9" rx="2" fill="' + col + '" stroke="' + line + '" stroke-width="1.5"/>' +
      '<path d="M38 53 l-6 14 M42 53 l6 14" stroke="' + col + '" stroke-width="6" stroke-linecap="round"/><path d="M38 53 l-6 14 M42 53 l6 14" stroke="' + line + '" stroke-width="1" fill="none"/>' +
      "</svg>";
  };
  C.obi = function (beltIdx, w) {
    var b = SD.BELTS[beltIdx];
    return '<svg class="obi" viewBox="0 0 60 24" width="' + (w || 48) + '" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="56" height="10" rx="2" fill="' + b.color + '" stroke="' + b.line + '" stroke-width="1.5"/>' +
      '<rect x="24" y="4" width="12" height="16" rx="3" fill="' + b.color + '" stroke="' + b.line + '" stroke-width="1.5"/></svg>';
  };
})(window.SD);
