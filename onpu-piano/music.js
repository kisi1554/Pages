/* ============================================================
   おんぷ ピアノ — おんがくの データと けいさん（DOM を つかわない）
   ブラウザでは window.OnpuMusic、node では require で よめる。
   ============================================================ */
(function (root) {
  "use strict";

  var LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
  var DOREMI = ["ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ"];
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  // けんばんの はんい（ド〜ド の 2オクターブ）
  var LOW = "C4", HIGH = "C6";

  /** "C4" / "F#5" / "Bb4" → { letter, acc, octave, midi }。よめなければ null */
  function parseNote(name) {
    var m = /^([A-G])(#|b)?(-?\d)$/.exec(String(name));
    if (!m) return null;
    var acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
    var octave = +m[3];
    return { letter: m[1], acc: acc, octave: octave, midi: 12 * (octave + 1) + SEMI[m[1]] + acc };
  }

  function midiOf(name) { var p = parseNote(name); return p ? p.midi : NaN; }

  /** MIDI → "C#4" のような なまえ（くろけんは # で あらわす） */
  function nameOf(midi) { return SHARP_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1); }

  function freqOf(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function isBlack(name) { var p = parseNote(name); return !!p && p.acc !== 0; }

  /** カタカナの ドレミ（くろけんは「ド♯」） */
  function doremi(name) {
    var p = parseNote(name);
    if (!p) return "";
    return DOREMI[LETTERS.indexOf(p.letter)] + (p.acc > 0 ? "♯" : p.acc < 0 ? "♭" : "");
  }

  /**
   * ごせんふ の いち。ト音記号で いちばん した の せん（ミ = E4）を 0 として、
   * せん と かん を 1つずつ かぞえた かず（うえが プラス）。
   * 0,2,4,6,8 が 5ほんの せん（E4 G4 B4 D5 F5）、ド(C4) は -2（かせん）。
   * ♯ や ♭ は おなじ いちに つく。
   */
  function staffStep(name) {
    var p = parseNote(name);
    if (!p) return NaN;
    return p.octave * 7 + LETTERS.indexOf(p.letter) - (4 * 7 + 2);
  }

  /** かせん（ごせんの そとに ひく みじかい せん）の いち の リスト */
  function ledgerLines(step) {
    var out = [], s;
    for (s = -2; s >= step; s -= 2) out.push(s);
    for (s = 10; s <= step; s += 2) out.push(s);
    return out;
  }

  /** ごせんふ で えがく ために ひつような こと を まとめて かえす */
  function staffPosition(name) {
    var step = staffStep(name);
    if (isNaN(step)) return null;
    var p = parseNote(name);
    return {
      step: step,
      onLine: step % 2 === 0,          // せんの うえ（true）か、せんの あいだ（false）か
      ledgers: ledgerLines(step),
      stemUp: step < 4,                // まんなかの せん（シ）より したなら ぼうは うえ
      acc: p.acc
    };
  }

  /** lo〜hi（りょうはし ふくむ）の けんばん の なまえ。white=true なら しろけん だけ */
  function keyRange(lo, hi, whiteOnly) {
    var a = midiOf(lo), b = midiOf(hi), out = [];
    for (var m = a; m <= b; m++) {
      var n = nameOf(m);
      if (!whiteOnly || n.indexOf("#") < 0) out.push(n);
    }
    return out;
  }

  /* ---------- PC の キーボード（KeyboardEvent.code → ベースの ド から なん はんおん うえ か） ---------- */
  var KEYMAP = {
    KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8,
    KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17
  };
  var KEYLABEL = { KeyA: "A", KeyW: "W", KeyS: "S", KeyE: "E", KeyD: "D", KeyF: "F", KeyT: "T", KeyG: "G", KeyY: "Y",
    KeyH: "H", KeyU: "U", KeyJ: "J", KeyK: "K", KeyO: "O", KeyL: "L", KeyP: "P", Semicolon: ";", Quote: "'" };

  /** ベースの オクターブ（4 なら a=ド4）で、code から けんばんの なまえ。はんいがいは null */
  function noteForCode(code, baseOctave) {
    if (!(code in KEYMAP)) return null;
    var m = 12 * (baseOctave + 1) + KEYMAP[code];
    if (m < midiOf(LOW) || m > midiOf(HIGH)) return null;
    return nameOf(m);
  }

  /* ---------- きょく（ちょさくけんの きれた もの だけ。["おとの なまえ", ながさ（4ぶおんぷ＝1）]、"R" は きゅうふ） ---------- */
  var SONGS = [
    { id: "kirakira", title: "きらきらぼし", level: 1, meter: 4, origin: "フランス みんよう",
      notes: [
        ["C4",1],["C4",1],["G4",1],["G4",1], ["A4",1],["A4",1],["G4",2],
        ["F4",1],["F4",1],["E4",1],["E4",1], ["D4",1],["D4",1],["C4",2],
        ["G4",1],["G4",1],["F4",1],["F4",1], ["E4",1],["E4",1],["D4",2],
        ["G4",1],["G4",1],["F4",1],["F4",1], ["E4",1],["E4",1],["D4",2],
        ["C4",1],["C4",1],["G4",1],["G4",1], ["A4",1],["A4",1],["G4",2],
        ["F4",1],["F4",1],["E4",1],["E4",1], ["D4",1],["D4",1],["C4",2]
      ] },
    { id: "kaeru", title: "かえるの うた", level: 1, meter: 4, origin: "ドイツ みんよう",
      notes: [
        ["C4",1],["D4",1],["E4",1],["F4",1], ["E4",1],["D4",1],["C4",2],
        ["E4",1],["F4",1],["G4",1],["A4",1], ["G4",1],["F4",1],["E4",2],
        ["C4",1],["R",1],["C4",1],["R",1], ["C4",1],["R",1],["C4",1],["R",1],
        ["C4",0.5],["C4",0.5],["D4",0.5],["D4",0.5],["E4",0.5],["E4",0.5],["F4",0.5],["F4",0.5],
        ["E4",1],["D4",1],["C4",2]
      ] },
    { id: "mary", title: "メリーさんの ひつじ", level: 1, meter: 4, origin: "アメリカ みんよう",
      notes: [
        ["E4",1],["D4",1],["C4",1],["D4",1], ["E4",1],["E4",1],["E4",2],
        ["D4",1],["D4",1],["D4",2], ["E4",1],["G4",1],["G4",2],
        ["E4",1],["D4",1],["C4",1],["D4",1], ["E4",1],["E4",1],["E4",1],["E4",1],
        ["D4",1],["D4",1],["E4",1],["D4",1], ["C4",4]
      ] },
    { id: "chocho", title: "ちょうちょう", level: 1, meter: 4, origin: "ドイツ みんよう",
      notes: [
        ["G4",1],["E4",1],["E4",2], ["F4",1],["D4",1],["D4",2],
        ["C4",1],["D4",1],["E4",1],["F4",1], ["G4",1],["G4",1],["G4",2],
        ["G4",1],["E4",1],["E4",2], ["F4",1],["D4",1],["D4",2],
        ["C4",1],["E4",1],["G4",1],["G4",1], ["E4",1],["E4",1],["E4",2],
        ["D4",1],["D4",1],["D4",1],["D4",1], ["D4",1],["E4",1],["F4",2],
        ["E4",1],["E4",1],["E4",1],["E4",1], ["E4",1],["F4",1],["G4",2],
        ["G4",1],["E4",1],["E4",2], ["F4",1],["D4",1],["D4",2],
        ["C4",1],["E4",1],["G4",1],["G4",1], ["C4",4]
      ] },
    { id: "makiba", title: "ゆかいな まきば", level: 1, meter: 4, origin: "アメリカ みんよう",
      notes: [
        ["G4",1],["G4",1],["G4",1],["D4",1], ["E4",1],["E4",1],["D4",2],
        ["B4",1],["B4",1],["A4",1],["A4",1], ["G4",3],["D4",1],
        ["G4",1],["G4",1],["G4",1],["D4",1], ["E4",1],["E4",1],["D4",2],
        ["B4",1],["B4",1],["A4",1],["A4",1], ["G4",4]
      ] },
    { id: "yorokobi", title: "よろこびの うた", level: 2, meter: 4, origin: "ベートーヴェン",
      notes: [
        ["E4",1],["E4",1],["F4",1],["G4",1], ["G4",1],["F4",1],["E4",1],["D4",1],
        ["C4",1],["C4",1],["D4",1],["E4",1], ["E4",1.5],["D4",0.5],["D4",2],
        ["E4",1],["E4",1],["F4",1],["G4",1], ["G4",1],["F4",1],["E4",1],["D4",1],
        ["C4",1],["C4",1],["D4",1],["E4",1], ["D4",1.5],["C4",0.5],["C4",2]
      ] },
    { id: "london", title: "ロンドンばし", level: 2, meter: 4, origin: "イギリス みんよう",
      notes: [
        ["G4",1.5],["A4",0.5],["G4",1],["F4",1], ["E4",1],["F4",1],["G4",2],
        ["D4",1],["E4",1],["F4",2], ["E4",1],["F4",1],["G4",2],
        ["G4",1.5],["A4",0.5],["G4",1],["F4",1], ["E4",1],["F4",1],["G4",2],
        ["D4",2],["G4",2], ["E4",1],["C4",3]
      ] },
    { id: "boat", title: "こげこげ ボート", level: 2, meter: 3, origin: "イギリス みんよう",
      notes: [
        ["C4",1.5],["C4",1.5], ["C4",1],["D4",0.5],["E4",1.5],
        ["E4",1],["D4",0.5],["E4",1],["F4",0.5], ["G4",3],
        ["C5",0.5],["C5",0.5],["C5",0.5],["G4",0.5],["G4",0.5],["G4",0.5],
        ["E4",0.5],["E4",0.5],["E4",0.5],["C4",0.5],["C4",0.5],["C4",0.5],
        ["G4",1],["F4",0.5],["E4",1],["D4",0.5], ["C4",3]
      ] },
    { id: "jingle", title: "ジングルベル", level: 2, meter: 4, origin: "ピアポント（1857ねん）",
      notes: [
        ["E4",1],["E4",1],["E4",2], ["E4",1],["E4",1],["E4",2],
        ["E4",1],["G4",1],["C4",1.5],["D4",0.5], ["E4",4],
        ["F4",1],["F4",1],["F4",1.5],["F4",0.5], ["F4",1],["E4",1],["E4",1],["E4",0.5],["E4",0.5],
        ["E4",1],["D4",1],["D4",1],["E4",1], ["D4",2],["G4",2],
        ["E4",1],["E4",1],["E4",2], ["E4",1],["E4",1],["E4",2],
        ["E4",1],["G4",1],["C4",1.5],["D4",0.5], ["E4",4],
        ["F4",1],["F4",1],["F4",1.5],["F4",0.5], ["F4",1],["E4",1],["E4",1],["E4",0.5],["E4",0.5],
        ["G4",1],["G4",1],["F4",1],["D4",1], ["C4",4]
      ] }
  ];

  /** きょくの おとを ひとつずつ: { note, beats, start（なんはくめ）, rest } */
  function songEvents(song) {
    var t = 0;
    return song.notes.map(function (n) {
      var ev = { note: n[0], beats: n[1], start: t, rest: n[0] === "R" };
      t += n[1];
      return ev;
    });
  }

  function totalBeats(song) {
    return song.notes.reduce(function (s, n) { return s + n[1]; }, 0);
  }

  /* ---------- リズム（1しょうせつ 4はく。q=4ぶ e=8ぶ h=2ぶ、r が つくと きゅうふ） ---------- */
  var DUR = { q: 1, e: 0.5, h: 2, qr: 1, hr: 2 };
  var RHYTHMS = [
    "q q q q", "h h", "q q h", "h q q",
    "q qr q qr", "q q hr", "e e q e e q", "q e e q q",
    "e e e e h", "qr q e e q", "e e q qr q", "e e e e e e q"
  ].map(function (s) { return s.split(" "); });

  function rhythmBeats(pattern) {
    return pattern.reduce(function (s, k) { return s + DUR[k]; }, 0);
  }

  /** おんぷ（きゅうふ いがい）の はじまる はく */
  function rhythmOnsets(pattern) {
    var t = 0, out = [];
    pattern.forEach(function (k) {
      if (k.charAt(k.length - 1) !== "r") out.push(t);
      t += DUR[k];
    });
    return out;
  }

  /**
   * タップの はんてい。expected / taps は びょう。
   * ずれが ちいさい くみ から じゅんに むすぶ（となりの おんぷに とられない ように）。
   * かえりち: { marks: ["◎"|"○"|"△"|"×"...], offsets: [びょう|null], extra: よけいな タップ の かず }
   */
  function judgeRhythm(expected, taps, beatSec) {
    var b = beatSec || 0.75;
    var w = [Math.min(0.075, b * 0.13), Math.min(0.15, b * 0.24), Math.min(0.26, b * 0.4)];
    var pairs = [];
    expected.forEach(function (e, i) {
      taps.forEach(function (t, j) {
        var d = Math.abs(t - e);
        if (d <= w[2]) pairs.push({ i: i, j: j, d: d });
      });
    });
    pairs.sort(function (p, q) { return p.d - q.d; });
    var usedE = {}, usedT = {}, offsets = expected.map(function () { return null; });
    pairs.forEach(function (p) {
      if (usedE[p.i] || usedT[p.j]) return;
      usedE[p.i] = usedT[p.j] = true;
      offsets[p.i] = taps[p.j] - expected[p.i];
    });
    var marks = offsets.map(function (o) {
      if (o === null) return "×";
      var d = Math.abs(o);
      return d <= w[0] ? "◎" : d <= w[1] ? "○" : "△";
    });
    var extra = taps.length - Object.keys(usedT).length;
    return { marks: marks, offsets: offsets, extra: extra };
  }

  /** リズムの ★（0〜3）。× が あったら 0（もういちど） */
  function rhythmStars(result) {
    var pts = { "◎": 3, "○": 2, "△": 1, "×": 0 };
    if (result.marks.indexOf("×") >= 0) return 0;
    var score = result.marks.reduce(function (s, m) { return s + pts[m]; }, 0) / (3 * result.marks.length);
    score -= result.extra * 0.15;
    return score >= 0.8 ? 3 : score >= 0.55 ? 2 : 1;
  }

  /** まちがいの かず から ★（1〜3） */
  function starsForMisses(misses, twoLimit) {
    var lim = twoLimit == null ? 2 : twoLimit;
    return misses === 0 ? 3 : misses <= lim ? 2 : 1;
  }

  /** おんぷよみ の もんだい: pool から、まえと おなじ に ならない ように 1つ えらぶ */
  function pickNote(pool, prev, rnd) {
    var r = rnd || Math.random;
    if (pool.length < 2) return pool[0];
    var n;
    do { n = pool[Math.floor(r() * pool.length)]; } while (n === prev);
    return n;
  }

  var api = {
    LETTERS: LETTERS, DOREMI: DOREMI, LOW: LOW, HIGH: HIGH,
    parseNote: parseNote, midiOf: midiOf, nameOf: nameOf, freqOf: freqOf, isBlack: isBlack, doremi: doremi,
    staffStep: staffStep, ledgerLines: ledgerLines, staffPosition: staffPosition, keyRange: keyRange,
    KEYMAP: KEYMAP, KEYLABEL: KEYLABEL, noteForCode: noteForCode,
    SONGS: SONGS, songEvents: songEvents, totalBeats: totalBeats,
    DUR: DUR, RHYTHMS: RHYTHMS, rhythmBeats: rhythmBeats, rhythmOnsets: rhythmOnsets,
    judgeRhythm: judgeRhythm, rhythmStars: rhythmStars, starsForMisses: starsForMisses, pickNote: pickNote
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.OnpuMusic = api;
})(this);
