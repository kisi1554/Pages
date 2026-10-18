/* ============================================================
   おんぷ ピアノ — ごせんふ を SVG で かく（フォント・がぞう を つかわない）
   ざひょう: せんの かんかく 10。いちばん うえの せん（ファ）が y=0、いちばん したの せん（ミ）が y=40。
   ============================================================ */
(function (root) {
  "use strict";
  var M = root.OnpuMusic;
  var SP = 10;                       // せんの かんかく
  var INK = "#2b2140";

  function yOf(step) { return 40 - step * (SP / 2); }

  function f(n) { return Math.round(n * 100) / 100; }

  /** 5ほんの せん */
  function lines(x0, x1) {
    var s = "";
    for (var i = 0; i < 5; i++) {
      s += '<line x1="' + f(x0) + '" y1="' + i * SP + '" x2="' + f(x1) + '" y2="' + i * SP +
        '" stroke="' + INK + '" stroke-width="1.3"/>';
    }
    return s;
  }

  /** ト音記号。うずまきの まんなかが ソ（したから 2ばんめ の せん, y=30）に くる */
  function clef(x) {
    var d =
      "M16.6 33.2" +
      "C12.4 34.4 9.6 30.6 11.6 27.4" +
      "C14 23.8 20.8 24.6 21.6 30" +
      "C22.4 35.6 17 39.6 11.4 38.6" +
      "C4.6 37.4 2.4 29.6 6.4 23.6" +
      "C10 18.4 16.6 14.6 18.6 7.6" +
      "C20.2 2 19.6 -6.6 16.2 -9.6" +
      "C13.4 -12 10.4 -6.6 11 -1" +
      "C11.6 5 13.2 12 14.6 20" +
      "L17.6 47.6" +
      "C18.4 53.8 13.2 56.2 9.6 53.4";
    return '<g transform="translate(' + f(x) + ',0)" class="clef">' +
      '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="10.6" cy="51.2" r="3.1" fill="' + INK + '"/></g>';
  }

  function barline(x, final) {
    var s = '<line x1="' + f(x) + '" y1="0" x2="' + f(x) + '" y2="40" stroke="' + INK + '" stroke-width="1.4"/>';
    if (final) s += '<rect x="' + f(x + 3) + '" y="0" width="4" height="40" fill="' + INK + '"/>';
    return s;
  }

  function sharp(x, y, color) {
    return '<g transform="translate(' + f(x) + ',' + f(y) + ')" fill="none" stroke="' + color + '">' +
      '<line x1="-2" y1="-10" x2="-2" y2="10" stroke-width="1.3"/>' +
      '<line x1="2" y1="-11" x2="2" y2="9" stroke-width="1.3"/>' +
      '<line x1="-5" y1="-2" x2="5" y2="-5" stroke-width="3"/>' +
      '<line x1="-5" y1="5" x2="5" y2="2" stroke-width="3"/></g>';
  }

  /** ながさ（はく）→ かたち */
  function shape(beats) {
    if (beats >= 4) return { hollow: true, stem: false, flag: false, dot: false };
    if (beats >= 3) return { hollow: true, stem: true, flag: false, dot: true };
    if (beats >= 2) return { hollow: true, stem: true, flag: false, dot: false };
    if (beats >= 1.5) return { hollow: false, stem: true, flag: false, dot: true };
    if (beats >= 1) return { hollow: false, stem: true, flag: false, dot: false };
    return { hollow: false, stem: true, flag: true, dot: false };
  }

  /**
   * おんぷ 1つ。opts: { color, cls, stemUp（うわがき）, noFlag, stemLen }
   * かえりち: { svg, stemX, stemEnd }（はた を つなぐ ビーム よう）
   */
  function noteParts(x, name, beats, opts) {
    opts = opts || {};
    var color = opts.color || INK;
    var pos = M.staffPosition(name);
    var y = yOf(pos.step);
    var sh = shape(beats);
    var up = opts.stemUp !== undefined ? opts.stemUp : pos.stemUp;
    var s = '<g class="' + (opts.cls || "nt") + '">';
    pos.ledgers.forEach(function (ls) {
      s += '<line x1="' + f(x - 11) + '" y1="' + yOf(ls) + '" x2="' + f(x + 11) + '" y2="' + yOf(ls) +
        '" stroke="' + INK + '" stroke-width="1.4"/>';
    });
    if (pos.acc > 0) s += sharp(x - 17, y, color);
    if (beats >= 4) {
      s += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="7.4" ry="4.8" fill="' + color + '"/>' +
        '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="3.2" ry="2.6" transform="rotate(-40 ' + f(x) + ' ' + f(y) +
        ')" fill="#fff"/>';
    } else {
      s += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="6.3" ry="4.5" transform="rotate(-20 ' + f(x) + ' ' + f(y) +
        ')" fill="' + color + '"/>';
      if (sh.hollow) {
        s += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="4.6" ry="2" transform="rotate(-24 ' + f(x) + ' ' + f(y) +
          ')" fill="#fff"/>';
      }
    }
    var stemX = null, stemEnd = null;
    if (sh.stem) {
      var len = opts.stemLen || Math.max(34, Math.abs(y - 20));
      stemX = up ? x + 5.6 : x - 5.6;
      var y0 = up ? y - 1 : y + 1;
      stemEnd = up ? y - len : y + len;
      s += '<line x1="' + f(stemX) + '" y1="' + f(y0) + '" x2="' + f(stemX) + '" y2="' + f(stemEnd) +
        '" stroke="' + color + '" stroke-width="1.6"/>';
      if (sh.flag && !opts.noFlag) {
        var k = up ? 1 : -1;
        s += '<path d="M' + f(stemX) + ' ' + f(stemEnd) +
          'c0 ' + f(7 * k) + ' 10 ' + f(10 * k) + ' 8.4 ' + f(22 * k) +
          'c-0.4 ' + f(-8 * k) + ' -4.6 ' + f(-11 * k) + ' -8.4 ' + f(-13 * k) + 'z" fill="' + color + '"/>';
      }
    }
    if (sh.dot) {
      var dy = pos.onLine ? -SP / 2 : 0;    // せんの うえ の おんぷ は、てんを かんに ずらす
      s += '<circle cx="' + f(x + 11) + '" cy="' + f(y + dy) + '" r="2" fill="' + color + '"/>';
    }
    s += "</g>";
    return { svg: s, stemX: stemX, stemEnd: stemEnd, y: y };
  }

  function note(x, name, beats, opts) { return noteParts(x, name, beats, opts).svg; }

  /** きゅうふ。x は まんなか */
  function rest(x, beats, opts) {
    var color = (opts && opts.color) || INK;
    var cls = (opts && opts.cls) || "rs";
    if (beats >= 4) {
      return '<rect class="' + cls + '" x="' + f(x - 7) + '" y="10" width="14" height="5" fill="' + color + '"/>';
    }
    if (beats >= 2) {
      return '<rect class="' + cls + '" x="' + f(x - 7) + '" y="15" width="14" height="5" fill="' + color + '"/>';
    }
    if (beats >= 1) {
      return '<path class="' + cls + '" transform="translate(' + f(x) + ',0)" d="M-3 5 L4 13 L-1.5 20 L4.5 27' +
        'C-1 25 -4 28 0 35" fill="none" stroke="' + color + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
    }
    return '<g class="' + cls + '" transform="translate(' + f(x) + ',0)"><circle cx="-2" cy="16" r="2.6" fill="' + color +
      '"/><path d="M-2 18 C1 18 3 17 4 15 L-1 30" fill="none" stroke="' + color + '" stroke-width="1.8"/></g>';
  }

  /** 2つの はたを 1ぽんの ビームで つなぐ（うえむき の ぼう） */
  function beam(x1, x2, y, color) {
    return '<rect x="' + f(x1) + '" y="' + f(y) + '" width="' + f(x2 - x1 + 0.8) + '" height="4.4" fill="' + (color || INK) + '"/>';
  }

  var api = { SP: SP, INK: INK, yOf: yOf, lines: lines, clef: clef, barline: barline, note: note, noteParts: noteParts,
    rest: rest, beam: beam, sharp: sharp, shape: shape };
  root.OnpuStaff = api;
})(this);
