/* ミクロの たび：クイズ と かくれんぼ の もんだい づくり（DOM なし。node でも うごく） */
(function (root) {
  "use strict";
  const S = typeof module !== "undefined" && module.exports ? require("./scales.js") : root.MT_SCALES;

  function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // どっちが おおきい／ちいさい？
  function compareQ(rnd) {
    const st = S.STAGES;
    let a, b;
    do { a = st[Math.floor(rnd() * st.length)]; b = st[Math.floor(rnd() * st.length)]; } while (Math.abs(a.e - b.e) < 2);
    const big = rnd() < 0.6;
    const pair = shuffle([a, b], rnd);
    const want = big ? (pair[0].size > pair[1].size ? 0 : 1) : (pair[0].size < pair[1].size ? 0 : 1);
    const r = Math.max(a.size, b.size) / Math.min(a.size, b.size);
    return {
      kind: "compare",
      text: `${S.toKana(pair[0].name)} と ${S.toKana(pair[1].name)}、どっちが ${big ? "おおきい" : "ちいさい"}？`,
      choices: pair.map((p) => ({ emoji: p.emoji, label: S.toKana(p.name) })),
      answer: want,
      ids: pair.map((p) => p.id),
      big,
      explain: `${S.toKana((a.size > b.size ? a : b).name)}は ${S.toKana((a.size > b.size ? b : a).name)}の やく ${S.jpNum(S.sig(r, 1))}ばい おおきい！`,
    };
  }

  // A を 1cm に したら B は どのくらい？
  function modelAnswer(m) { return (m.len / m.aSize) * 0.01; } // メートル
  function modelQ(rnd, m) {
    m = m || S.MODELS[Math.floor(rnd() * S.MODELS.length)];
    const ans = modelAnswer(m);
    const vals = shuffle([ans, ans * 10, ans / 10, ans * 100].slice(0, 3), rnd);
    const labels = vals.map((v) => "やく " + S.fmtLen(v).text);
    return {
      kind: "model",
      text: `${m.aEmoji} ${m.aName}を 1cm に したら、${m.bEmoji} ${m.bName}は どのくらい？`,
      choices: labels.map((l) => ({ emoji: "📏", label: l })),
      answer: vals.indexOf(ans),
      model: m,
      explain: `こたえは やく ${S.fmtLen(ans).text}！`,
    };
  }

  function quizRound(rnd, n) {
    n = n || 10;
    const qs = [];
    const models = shuffle(S.MODELS.slice(), rnd);
    for (let i = 0; i < n; i++) qs.push(i % 3 === 2 ? modelQ(rnd, models[(i / 3) | 0]) : compareQ(rnd));
    return qs;
  }

  // かくれんぼ: スタート（こども）いがいから 20もん
  function hideRound(rnd, n) {
    const pool = shuffle(S.STAGES.filter((s) => s.e !== 0).map((s) => s.e), rnd);
    return pool.slice(0, n || 20);
  }

  function seeded(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const API = { compareQ, modelQ, modelAnswer, quizRound, hideRound, seeded, shuffle };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.MT_QUIZ = API;
})(typeof window !== "undefined" ? window : globalThis);
