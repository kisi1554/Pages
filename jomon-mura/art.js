/* じょうもん むらの くらし — ずかんの え（SVG を コードで かく。がぞう ファイルは つかわない） */

var ART = (function () {
  var S = function (body, bg) {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect width="100" height="100" rx="14" fill="' + (bg || '#fbf3e6') + '"/>' + body + '</svg>';
  };
  // どきの なわもよう（ななめの みじかい せん）
  function jomonLines(x0, x1, y0, y1, color) {
    var s = '';
    for (var y = y0; y < y1; y += 7) {
      for (var x = x0; x < x1; x += 6) {
        s += '<path d="M' + x + ' ' + y + ' l4 5" stroke="' + color + '" stroke-width="1.6" stroke-linecap="round"/>';
      }
    }
    return s;
  }
  function shell(cx, cy, r, fill, line) {
    return '<path d="M' + (cx - r) + ' ' + cy + ' Q' + cx + ' ' + (cy - r * 1.5) + ' ' + (cx + r) + ' ' + cy +
      ' Q' + cx + ' ' + (cy + r * 0.8) + ' ' + (cx - r) + ' ' + cy + 'Z" fill="' + fill + '" stroke="' + line + '" stroke-width="2"/>' +
      '<path d="M' + cx + ' ' + (cy + r * 0.35) + ' L' + (cx - r * 0.5) + ' ' + (cy - r * 0.6) + ' M' + cx + ' ' + (cy + r * 0.35) +
      ' L' + cx + ' ' + (cy - r * 0.75) + ' M' + cx + ' ' + (cy + r * 0.35) + ' L' + (cx + r * 0.5) + ' ' + (cy - r * 0.6) +
      '" stroke="' + line + '" stroke-width="1.3" opacity=".6"/>';
  }
  function fish(fill, fin) {
    return '<path d="M16 50 Q40 26 70 44 L88 32 L84 50 L88 68 L70 56 Q40 74 16 50Z" fill="' + fill + '" stroke="#334" stroke-width="2"/>' +
      '<path d="M40 36 Q50 30 58 38" fill="' + (fin || fill) + '" stroke="#334" stroke-width="1.5"/>' +
      '<circle cx="28" cy="47" r="3" fill="#222"/><path d="M42 42 Q46 50 42 58" stroke="#334" stroke-width="1.5" fill="none"/>';
  }
  function nut(cx, cy, s, body, cap) {
    return '<ellipse cx="' + cx + '" cy="' + (cy + 6 * s) + '" rx="' + 11 * s + '" ry="' + 15 * s + '" fill="' + body + '" stroke="#5a3a1a" stroke-width="2"/>' +
      '<path d="M' + (cx - 12 * s) + ' ' + (cy - 2 * s) + ' Q' + cx + ' ' + (cy - 16 * s) + ' ' + (cx + 12 * s) + ' ' + (cy - 2 * s) + 'Z" fill="' + cap + '" stroke="#5a3a1a" stroke-width="2"/>';
  }
  function hut(snow) {
    return '<path d="M14 80 L50 22 L86 80Z" fill="#c9a061" stroke="#6b4a22" stroke-width="2.5"/>' +
      '<path d="M22 70 L50 26 M34 78 L50 30 M66 78 L50 30 M78 70 L50 26" stroke="#9a7038" stroke-width="2"/>' +
      '<path d="M42 80 L50 62 L58 80Z" fill="#3b2a18"/>' +
      '<path d="M46 22 L50 12 L54 22" stroke="#6b4a22" stroke-width="3" fill="none"/>' +
      (snow ? '<path d="M30 48 L50 22 L70 48 Q50 42 30 48Z" fill="#fff"/>' : '') +
      '<rect x="6" y="80" width="88" height="6" rx="3" fill="#8d6e4a"/>';
  }

  var D = {
    doki: S('<path d="M28 18 L72 18 L70 28 Q78 60 64 84 L36 84 Q22 60 30 28Z" fill="#c07a45" stroke="#6b3b1d" stroke-width="2.5"/>' +
      '<path d="M24 18 Q30 8 36 18 Q42 8 50 18 Q58 8 64 18 Q70 8 76 18" fill="#c07a45" stroke="#6b3b1d" stroke-width="2.5"/>' +
      jomonLines(32, 66, 32, 80, '#7a4524')),
    dogu: S('<ellipse cx="50" cy="26" rx="16" ry="13" fill="#b9875a" stroke="#5b3a1d" stroke-width="2"/>' +
      '<ellipse cx="43" cy="26" rx="6" ry="3" fill="#5b3a1d"/><ellipse cx="57" cy="26" rx="6" ry="3" fill="#5b3a1d"/>' +
      '<path d="M38 38 L62 38 L80 50 L72 56 L62 50 L64 74 L72 90 L56 90 L50 76 L44 90 L28 90 L36 74 L38 50 L28 56 L20 50Z" fill="#b9875a" stroke="#5b3a1d" stroke-width="2"/>' +
      '<path d="M42 52 Q50 60 58 52 M44 62 Q50 68 56 62" stroke="#5b3a1d" stroke-width="1.6" fill="none"/>'),
    dasei: S('<path d="M30 80 L22 46 L40 18 L64 22 L78 52 L62 84Z" fill="#8f8a80" stroke="#4a463f" stroke-width="2.5"/>' +
      '<path d="M40 18 L46 40 L22 46 M64 22 L56 44 L78 52 M46 40 L56 44 L52 66 L30 80 M52 66 L62 84" stroke="#4a463f" stroke-width="1.6" fill="none"/>'),
    masei: S('<rect x="44" y="10" width="10" height="82" rx="4" fill="#9b6b3c" stroke="#5a3a1a" stroke-width="2"/>' +
      '<path d="M30 26 Q22 40 30 56 L52 52 L52 30Z" fill="#5f7a6a" stroke="#2f3f36" stroke-width="2.5"/>' +
      '<path d="M32 32 Q28 40 32 50" stroke="#cfe0d4" stroke-width="2" fill="none"/>'),
    yumiya: S('<path d="M28 10 Q70 50 28 90" stroke="#7a4a1e" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M28 10 L28 90" stroke="#ddd" stroke-width="1.5"/>' +
      '<path d="M14 50 L84 50" stroke="#a0763e" stroke-width="3"/><path d="M84 50 L74 44 L74 56Z" fill="#333"/>' +
      '<path d="M14 50 L8 44 M14 50 L8 56 M20 50 L14 44 M20 50 L14 56" stroke="#c0392b" stroke-width="2"/>'),
    sekizoku: S('<path d="M50 12 L72 76 L58 70 L50 88 L42 70 L28 76Z" fill="#3a3a44" stroke="#15151a" stroke-width="2.5"/>' +
      '<path d="M50 20 L44 60 M50 20 L58 58" stroke="#8a8a9c" stroke-width="1.5"/>'),
    tsuribari: S('<path d="M60 14 L60 60 Q60 84 42 84 Q26 84 26 66 L26 58 L34 64" stroke="#efe3c8" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M60 14 L60 60 Q60 84 42 84 Q26 84 26 66 L26 58 L34 64" stroke="#8d7a55" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M60 14 Q72 8 82 14" stroke="#8a6a3a" stroke-width="2" fill="none"/>'),
    mori: S('<rect x="46" y="40" width="8" height="56" fill="#9b6b3c"/>' +
      '<path d="M50 6 L60 30 L54 28 L54 44 L46 44 L46 28 L40 30Z" fill="#efe3c8" stroke="#8d7a55" stroke-width="2"/>' +
      '<path d="M46 30 L38 38 M54 30 L62 38" stroke="#8d7a55" stroke-width="2.5"/>'),
    marukibune: S('<rect x="0" y="62" width="100" height="38" fill="#7cc4e8"/>' +
      '<path d="M8 56 Q50 80 92 56 L88 66 Q50 86 12 66Z" fill="#8a5a2b" stroke="#4a2e12" stroke-width="2.5"/>' +
      '<path d="M14 58 Q50 72 86 58" stroke="#c49a63" stroke-width="3" fill="none"/>' +
      '<path d="M60 30 L74 70" stroke="#6b4a22" stroke-width="3"/><ellipse cx="76" cy="72" rx="6" ry="3" fill="#6b4a22"/>' +
      '<circle cx="54" cy="44" r="6" fill="#e8b98a"/><path d="M48 60 L54 50 L60 60" fill="#a35d2d"/>', '#e8f6ff'),
    ishizara: S('<ellipse cx="50" cy="64" rx="40" ry="20" fill="#8f8a80" stroke="#4a463f" stroke-width="2.5"/>' +
      '<ellipse cx="50" cy="60" rx="28" ry="11" fill="#a9a398"/>' +
      '<ellipse cx="54" cy="44" rx="16" ry="11" fill="#7c776d" stroke="#4a463f" stroke-width="2.5"/>' +
      '<circle cx="36" cy="62" r="2" fill="#f2e2b8"/><circle cx="42" cy="66" r="2" fill="#f2e2b8"/><circle cx="64" cy="64" r="2" fill="#f2e2b8"/>'),
    tateana: S(hut(false), '#e3f2ff'),
    nawa: S('<path d="M10 70 C30 40 40 90 60 60 S80 30 92 40" stroke="#b78b52" stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<path d="M10 70 C30 40 40 90 60 60 S80 30 92 40" stroke="#7a5a2a" stroke-width="9" fill="none" stroke-dasharray="3 5" stroke-linecap="round"/>'),
    otoshiana: S('<rect x="0" y="40" width="100" height="60" fill="#8d6e4a"/><rect x="0" y="34" width="100" height="10" fill="#7cb342"/>' +
      '<path d="M30 40 L70 40 L64 92 L36 92Z" fill="#3e2a16"/>' +
      '<path d="M24 38 L76 38" stroke="#a0763e" stroke-width="3"/><path d="M30 34 L40 40 M50 32 L56 40 M66 34 L60 40" stroke="#558b2f" stroke-width="3"/>', '#dff0d0'),
    kago: S('<path d="M22 34 L78 34 L70 86 L30 86Z" fill="#c49a63" stroke="#6b4a22" stroke-width="2.5"/>' +
      '<path d="M24 46 L76 46 M26 58 L74 58 M28 70 L72 70 M36 34 L40 86 M50 34 L50 86 M64 34 L60 86" stroke="#8a6a3a" stroke-width="2"/>' +
      '<path d="M30 34 Q50 6 70 34" stroke="#6b4a22" stroke-width="3" fill="none"/>'),
    kokuyoseki: S('<path d="M20 70 L34 26 L62 16 L82 44 L70 80 L40 86Z" fill="#1c1c24" stroke="#000" stroke-width="2"/>' +
      '<path d="M34 26 L50 48 L62 16 M50 48 L82 44 M50 48 L40 86" stroke="#4a4a5c" stroke-width="1.6"/>' +
      '<path d="M40 30 L50 26" stroke="#d8d8ff" stroke-width="3" stroke-linecap="round"/>'),
    mimikazari: S('<circle cx="50" cy="50" r="30" fill="#c98a57" stroke="#6b3b1d" stroke-width="2.5"/>' +
      '<circle cx="50" cy="50" r="13" fill="#fbf3e6" stroke="#6b3b1d" stroke-width="2"/>' +
      '<path d="M50 20 L50 37 M50 63 L50 80 M20 50 L37 50 M63 50 L80 50 M29 29 L40 40 M60 60 L71 71 M71 29 L60 40 M29 71 L40 60" stroke="#6b3b1d" stroke-width="2"/>'),
    hisui: S('<path d="M50 16 Q76 20 78 48 Q76 80 50 84 Q24 80 22 48 Q24 20 50 16Z" fill="#3fae7a" stroke="#1f6b48" stroke-width="2.5"/>' +
      '<circle cx="50" cy="36" r="6" fill="#fbf3e6" stroke="#1f6b48" stroke-width="2"/>' +
      '<path d="M36 52 Q44 44 50 60" stroke="#bff0d6" stroke-width="3" fill="none" stroke-linecap="round"/>'),
    donguri: S(nut(36, 46, 1.1, '#a8692f', '#6d4c2a') + nut(66, 52, 1, '#b8783a', '#6d4c2a')),
    kuri: S('<path d="M50 20 Q78 46 74 70 Q50 86 26 70 Q22 46 50 20Z" fill="#7a3f1d" stroke="#3e1f0d" stroke-width="2.5"/>' +
      '<path d="M28 66 Q50 76 72 66 L72 72 Q50 84 28 72Z" fill="#e8d2a6"/><path d="M44 30 Q50 22 56 30" stroke="#c98a57" stroke-width="3" fill="none"/>'),
    kurumi: S('<ellipse cx="50" cy="52" rx="28" ry="32" fill="#c79a62" stroke="#6b4a22" stroke-width="2.5"/>' +
      '<path d="M50 20 L50 84" stroke="#6b4a22" stroke-width="2.5"/>' +
      '<path d="M32 36 Q40 44 34 52 Q40 60 32 68 M68 36 Q60 44 66 52 Q60 60 68 68" stroke="#8a6a3a" stroke-width="2" fill="none"/>'),
    zenmai: S('<path d="M50 92 L50 46" stroke="#7a8f3a" stroke-width="5"/>' +
      '<path d="M50 46 Q50 18 70 22 Q84 28 76 42 Q68 50 60 42 Q56 34 64 32" stroke="#7a8f3a" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M50 70 Q30 64 26 76" stroke="#7a8f3a" stroke-width="4" fill="none"/>', '#eef6dc'),
    warabi: S('<path d="M50 92 L50 30" stroke="#5f8a2e" stroke-width="5"/>' +
      '<path d="M50 30 Q36 14 28 26 Q24 36 34 36 M50 30 Q64 14 72 26 Q76 36 66 36 M50 30 Q50 16 50 14" stroke="#5f8a2e" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="34" cy="34" r="3" fill="#5f8a2e"/><circle cx="66" cy="34" r="3" fill="#5f8a2e"/>', '#eef6dc'),
    hamaguri: S(shell(50, 60, 32, '#e6c79a', '#7a5a34'), '#fff6e6'),
    asari: S(shell(36, 60, 20, '#b8b0a2', '#4a4436') + shell(68, 58, 18, '#cdbfa6', '#4a4436'), '#fff6e6'),
    kaki: S('<path d="M22 70 Q14 40 40 24 Q72 12 84 36 Q90 60 70 76 Q46 90 22 70Z" fill="#9aa39b" stroke="#3e463f" stroke-width="2.5"/>' +
      '<path d="M30 64 Q30 40 50 32 M44 72 Q50 48 70 40 M60 76 Q70 60 80 52" stroke="#5e6a60" stroke-width="2" fill="none"/>', '#f2f6f2'),
    kurodai: S(fish('#4d5560', '#3a4048'), '#e8f6ff'),
    suzuki: S(fish('#c7d3dc', '#9fb0bd'), '#e8f6ff'),
    iruka: S('<rect x="0" y="66" width="100" height="34" fill="#7cc4e8"/>' +
      '<path d="M10 58 Q36 22 76 40 L92 30 L88 46 L94 58 L78 52 Q50 70 24 64 L10 64Z" fill="#7d98ab" stroke="#2f4250" stroke-width="2.5"/>' +
      '<path d="M48 34 L56 20 L60 38Z" fill="#7d98ab" stroke="#2f4250" stroke-width="2"/><circle cx="24" cy="52" r="2.5" fill="#111"/>', '#e8f6ff'),
    shika: S('<path d="M26 50 Q24 40 34 40 L66 42 Q76 42 76 52 L74 62 L70 86 M66 62 L64 86 M34 60 L32 86 M40 62 L40 86" stroke="#8a5a2b" stroke-width="5" fill="#b27a42" stroke-linecap="round"/>' +
      '<ellipse cx="50" cy="52" rx="24" ry="12" fill="#b27a42"/>' +
      '<path d="M70 44 L80 26 Q86 22 90 26 L86 34 L76 46Z" fill="#b27a42" stroke="#8a5a2b" stroke-width="2"/>' +
      '<path d="M82 24 L76 8 M78 14 L70 10 M86 24 L90 8 M88 14 L96 12" stroke="#7a5a2a" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="85" cy="28" r="1.8" fill="#111"/><circle cx="40" cy="48" r="2" fill="#f4e1c1"/><circle cx="52" cy="46" r="2" fill="#f4e1c1"/><circle cx="60" cy="50" r="2" fill="#f4e1c1"/>'),
    inoshishi: S('<ellipse cx="48" cy="56" rx="32" ry="20" fill="#5a4535" stroke="#2e2219" stroke-width="2.5"/>' +
      '<path d="M76 50 L92 58 L90 66 L74 66Z" fill="#5a4535" stroke="#2e2219" stroke-width="2"/>' +
      '<path d="M86 62 Q92 56 90 50" stroke="#fff" stroke-width="3" fill="none"/>' +
      '<path d="M28 72 L26 88 M40 74 L40 88 M58 74 L58 88 M68 72 L70 88" stroke="#2e2219" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M20 40 L30 34 L40 40 L50 34 L60 40 L70 36" stroke="#2e2219" stroke-width="2" fill="none"/>' +
      '<circle cx="78" cy="52" r="2" fill="#111"/>'),
    omori: S('<rect x="0" y="56" width="100" height="44" fill="#a37a52"/>' +
      '<path d="M0 64 L100 64 M0 74 L100 74" stroke="#e8dcc4" stroke-width="5" stroke-dasharray="6 3"/>' +
      '<rect x="40" y="16" width="20" height="44" fill="#9a9a9a" stroke="#555" stroke-width="2"/>' +
      '<path d="M44 26 L56 26 M44 34 L56 34 M44 42 L56 42" stroke="#555" stroke-width="2"/>' +
      '<rect x="6" y="40" width="24" height="12" rx="3" fill="#2e5c8a"/><circle cx="12" cy="54" r="3" fill="#222"/><circle cx="24" cy="54" r="3" fill="#222"/>', '#e3f2ff'),
    sannai: S('<rect x="0" y="80" width="100" height="20" fill="#9ccc65"/>' +
      '<path d="M18 80 L18 20 M40 80 L40 20 M62 80 L62 20 M18 20 L62 20 M18 46 L62 46" stroke="#7a4a1e" stroke-width="6"/>' +
      '<path d="M66 80 L82 60 L98 80Z" fill="#c9a061" stroke="#6b4a22" stroke-width="2"/>', '#e3f2ff'),
    shomyoji: S('<rect x="0" y="60" width="100" height="40" fill="#7cc4e8"/>' +
      '<path d="M6 54 Q30 26 60 40 L72 32 L70 46 L74 56 L62 52 Q40 64 16 60Z" fill="#7d98ab" stroke="#2f4250" stroke-width="2"/>' +
      '<path d="M76 20 L76 66 Q76 80 66 80 Q58 80 58 70" stroke="#efe3c8" stroke-width="5" fill="none" stroke-linecap="round"/>', '#e8f6ff'),
    inasaku: S('<rect x="0" y="60" width="100" height="40" fill="#8fbf6a"/>' +
      '<path d="M20 90 L20 40 Q26 30 22 22 M40 90 L40 36 Q48 26 44 18 M60 90 L60 40 Q68 30 64 22 M80 90 L80 36 Q88 26 84 18" stroke="#c9a23a" stroke-width="4" fill="none"/>', '#eeeeee'),
    kinzokuki: S('<path d="M50 10 Q78 20 76 56 Q72 86 50 90 Q28 86 24 56 Q22 20 50 10Z" fill="#6aa88f" stroke="#2f5a4a" stroke-width="2.5"/>' +
      '<path d="M30 40 L70 40 M30 56 L70 56 M30 72 L70 72" stroke="#2f5a4a" stroke-width="2"/>', '#eeeeee'),
    takayuka: S('<path d="M24 54 L50 22 L76 54Z" fill="#c9a061" stroke="#6b4a22" stroke-width="2"/>' +
      '<rect x="30" y="54" width="40" height="16" fill="#a0763e"/>' +
      '<path d="M34 70 L34 92 M66 70 L66 92 M50 70 L50 92" stroke="#6b4a22" stroke-width="4"/>', '#eeeeee')
  };

  return {
    card: function (id) { return D[id] || S(''); },
    hut: hut
  };
})();
