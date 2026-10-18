// node --test onpu-piano/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const M = require("../music.js");

test("おとの なまえ → MIDI と しゅうはすう", () => {
  assert.equal(M.midiOf("C4"), 60);
  assert.equal(M.midiOf("A4"), 69);
  assert.equal(M.midiOf("C#4"), 61);
  assert.equal(M.midiOf("Bb4"), 70);
  assert.equal(M.midiOf("C6"), 84);
  assert.equal(M.nameOf(61), "C#4");
  assert.equal(M.nameOf(72), "C5");
  assert.equal(Math.round(M.freqOf(69)), 440);
  assert.equal(M.parseNote("H4"), null);
  assert.ok(Number.isNaN(M.midiOf("R")));
});

test("ドレミ（カタカナ）", () => {
  assert.deepEqual(M.keyRange("C4", "C5", true).map(M.doremi), ["ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ", "ド"]);
  assert.equal(M.doremi("F#4"), "ファ♯");
});

test("ごせんふ の いち: 5ほんの せん は ミ ソ シ レ ファ", () => {
  ["E4", "G4", "B4", "D5", "F5"].forEach((n, i) => {
    const p = M.staffPosition(n);
    assert.equal(p.step, i * 2, n);
    assert.equal(p.onLine, true, n);
    assert.deepEqual(p.ledgers, [], n + " に かせん は いらない");
  });
  ["F4", "A4", "C5", "E5"].forEach((n) => assert.equal(M.staffPosition(n).onLine, false, n + " は せんの あいだ"));
});

test("ごせんふ の いち: ド〜ド を 1だんずつ のぼる", () => {
  const whites = M.keyRange("C4", "C6", true);
  assert.equal(whites.length, 15);
  whites.forEach((n, i) => assert.equal(M.staffStep(n), i - 2, n));
});

test("かせん: したの ド は 1ぽん、レ は なし、うえの ラ は 1ぽん、たかい ド は 2ほん", () => {
  assert.deepEqual(M.staffPosition("C4").ledgers, [-2]);
  assert.equal(M.staffPosition("C4").onLine, true, "したの ド は かせん の うえ");
  assert.deepEqual(M.staffPosition("D4").ledgers, [], "レ は ごせんの すぐ した で かせん なし");
  assert.deepEqual(M.staffPosition("G5").ledgers, []);
  assert.deepEqual(M.staffPosition("A5").ledgers, [10]);
  assert.deepEqual(M.staffPosition("B5").ledgers, [10]);
  assert.deepEqual(M.staffPosition("C6").ledgers, [10, 12]);
  assert.deepEqual(M.ledgerLines(-5), [-2, -4]);
});

test("♯ は おなじ いち に つく、ぼう の むき は まんなかの せん で かわる", () => {
  assert.equal(M.staffStep("C#4"), M.staffStep("C4"));
  assert.equal(M.staffPosition("F#4").acc, 1);
  assert.equal(M.staffPosition("A4").stemUp, true);
  assert.equal(M.staffPosition("B4").stemUp, false);
  assert.equal(M.staffPosition("C6").stemUp, false);
});

test("けんばん: 2オクターブ は しろ 15・くろ 10", () => {
  const all = M.keyRange(M.LOW, M.HIGH);
  assert.equal(all.length, 25);
  assert.equal(all.filter(M.isBlack).length, 10);
});

test("PC の キーボード: a=ド、k=うえの ド、はんいがい は null", () => {
  assert.equal(M.noteForCode("KeyA", 4), "C4");
  assert.equal(M.noteForCode("KeyW", 4), "C#4");
  assert.equal(M.noteForCode("KeyK", 4), "C5");
  assert.equal(M.noteForCode("KeyK", 5), "C6");
  assert.equal(M.noteForCode("KeyL", 5), null);
  assert.equal(M.noteForCode("KeyQ", 4), null);
});

test("きょく: 8きょく いじょう、けんばんの はんい、しょうせつ が きっちり", () => {
  assert.ok(M.SONGS.length >= 8);
  const ids = new Set();
  const lo = M.midiOf(M.LOW), hi = M.midiOf(M.HIGH);
  M.SONGS.forEach((s) => {
    assert.ok(!ids.has(s.id), s.id + " が かぶって いる"); ids.add(s.id);
    assert.ok([1, 2].includes(s.level), s.id);
    assert.ok(s.notes.length >= 16, s.id);
    s.notes.forEach(([n, b], i) => {
      assert.ok([0.5, 1, 1.5, 2, 3, 4].includes(b), `${s.id} #${i} ながさ ${b}`);
      if (n === "R") return;
      const m = M.midiOf(n);
      assert.ok(m >= lo && m <= hi, `${s.id} #${i} ${n} は けんばんの そと`);
    });
    assert.equal(M.totalBeats(s) % s.meter, 0, s.id + " の さいごの しょうせつ が はんぱ");
    // しょうせつ を またぐ おんぷ は ない
    M.songEvents(s).forEach((ev) => {
      const bar = Math.floor(ev.start / s.meter + 1e-9);
      assert.ok(ev.start + ev.beats <= (bar + 1) * s.meter + 1e-9, `${s.id} ${ev.start}はくめ が しょうせつ を またぐ`);
    });
  });
});

test("きょく: きらきらぼし の はじまり は ド ド ソ ソ ラ ラ ソ", () => {
  const k = M.SONGS.find((s) => s.id === "kirakira");
  assert.deepEqual(k.notes.slice(0, 7).map((n) => M.doremi(n[0])), ["ド", "ド", "ソ", "ソ", "ラ", "ラ", "ソ"]);
  const ev = M.songEvents(k);
  assert.equal(ev[6].start, 6);
  assert.equal(ev[6].beats, 2);
});

test("リズム: どれも 4はく、おんぷ が 1つ いじょう、8ぶ は 2つ ひと くみ", () => {
  assert.ok(M.RHYTHMS.length >= 10);
  const kinds = new Set();
  M.RHYTHMS.forEach((p, i) => {
    assert.equal(M.rhythmBeats(p), 4, "#" + (i + 1));
    assert.ok(M.rhythmOnsets(p).length >= 1);
    p.forEach((k) => kinds.add(k));
    let t = 0;
    p.forEach((k, j) => {
      if (k === "e" && t % 1 === 0) assert.equal(p[j + 1], "e", `#${i + 1} 8ぶ が 1つ だけ`);
      t += M.DUR[k];
    });
  });
  ["q", "e", "h", "qr", "hr"].forEach((k) => assert.ok(kinds.has(k), k + " が つかわれて いない"));
  assert.deepEqual(M.rhythmOnsets(["q", "qr", "e", "e", "q"]), [0, 2, 2.5, 3]);
});

test("リズムの はんてい: ずれ で ◎○△×、よけいな タップ を かぞえる", () => {
  const exp = [0, 1, 2, 3];
  const r = M.judgeRhythm(exp, [0.01, 1.1, 2.2, 5], 1);
  assert.deepEqual(r.marks, ["◎", "○", "△", "×"]);
  assert.equal(r.extra, 1);
  assert.equal(M.rhythmStars(r), 0, "× が あったら ★ なし");
  const ok = M.judgeRhythm(exp, [0, 1.02, 1.98, 3.01], 1);
  assert.deepEqual(ok.marks, ["◎", "◎", "◎", "◎"]);
  assert.equal(M.rhythmStars(ok), 3);
});

test("リズムの はんてい: 8ぶ が ならんで いても となりに とられない", () => {
  const exp = [0, 0.5, 1];
  // 2かいめ の タップ が 1つめ に ちかくても、1つめ に ぴったりの タップ が あれば そちら を むすぶ
  const r = M.judgeRhythm(exp, [0.0, 0.42, 1.0], 1);
  assert.deepEqual(r.marks, ["◎", "○", "◎"]);
  assert.equal(r.extra, 0);
  assert.equal(M.judgeRhythm(exp, [], 1).marks.join(""), "×××");
});

test("★ と もんだいの えらびかた", () => {
  assert.equal(M.starsForMisses(0), 3);
  assert.equal(M.starsForMisses(2), 2);
  assert.equal(M.starsForMisses(3), 1);
  assert.equal(M.starsForMisses(3, 3), 2);
  const pool = ["C4", "D4", "E4"];
  let prev = null;
  for (let i = 0; i < 50; i++) {
    const n = M.pickNote(pool, prev);
    assert.ok(pool.includes(n));
    assert.notEqual(n, prev);
    prev = n;
  }
});
