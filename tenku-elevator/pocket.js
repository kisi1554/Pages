"use strict";
/* てんくうエレベーター - ことばの ポケット（ストック）と ふくしゅう
 *   ここの かんすうは DOM を つかわない（tools/tenku-elevator/test.js で しらべる）
 *   カード: { id, at(もらった じゅん), from(おともだち), floor, lv(おぼえた ど 0〜3), due(つぎに だす とき), miss }
 */
const Pocket = (() => {
  const GOJUON = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
  const kana = s => String(s).replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  const cmpKana = (a, b) => kana(a).localeCompare(kana(b), 'ja');

  /* ならべかえ: 'got'（もらった じゅん）/'aiueo'/'cat'（なかま べつ）/'star'（★じゅん） */
  function sort(cards, how) {
    const W = id => Words.get(id) || { w: id, cat: 'mono', lv: 1 };
    const cats = Object.keys(Words.CATS);
    const a = cards.slice();
    if (how === 'aiueo') a.sort((x, y) => cmpKana(W(x.id).w, W(y.id).w));
    else if (how === 'cat') a.sort((x, y) => cats.indexOf(W(x.id).cat) - cats.indexOf(W(y.id).cat) || cmpKana(W(x.id).w, W(y.id).w));
    else if (how === 'star') a.sort((x, y) => W(y.id).lv - W(x.id).lv || y.lv - x.lv || cmpKana(W(x.id).w, W(y.id).w));
    else a.sort((x, y) => y.at - x.at);
    return a;
  }

  /* ---------- ふくしゅう ----------
   * もんだいの しゅるい:
   *   mean … いみ あて 3たく（ことばを みて いみを えらぶ）
   *   fill … ぶんに はいる ことば（れいぶんの ことばを □ に）
   *   ant  … はんたいの ことば ペア
   *   syn  … にた ことば あつめ
   * まちがえた カードは すぐ（3もん あと）、あたった カードは だんだん あいだを あけて だす。
   */
  const GAP = [0, 10 * 60e3, 24 * 3600e3, 3 * 24 * 3600e3];   // lv ごとの つぎまでの じかん
  function grade(card, ok, now, qn = 0) {
    if (ok) { card.lv = Math.min(3, (card.lv || 0) + 1); card.due = now + GAP[card.lv]; card.miss = 0; }
    else { card.lv = Math.max(0, (card.lv || 0) - 1); card.miss = (card.miss || 0) + 1; card.due = now; card.after = qn + 3; }
    return card;
  }
  /* つぎに だす カード（だす じかんが きた もの、おぼえた ど が ひくい もの から） */
  function nextCard(cards, now, qn = 0, last = null) {
    const ready = cards.filter(c => (c.due || 0) <= now && (c.after || 0) <= qn && c.id !== last);
    const pool = ready.length ? ready : cards.filter(c => c.id !== last && (c.after || 0) <= qn);
    const p = pool.length ? pool : cards;
    if (!p.length) return null;
    return p.slice().sort((a, b) => (a.lv || 0) - (b.lv || 0) || (a.due || 0) - (b.due || 0) || a.at - b.at)[0];
  }
  const shuffle = (a, r) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  /* その カードで つくれる もんだいの しゅるい */
  function kinds(card, cards) {
    const w = Words.get(card.id);
    if (!w) return [];
    const k = [];
    if (cards.length >= 3) k.push('mean');
    if (cards.length >= 3 && fillSentence(w)) k.push('fill');
    if (w.ant.length && cards.length >= 2) k.push('ant');
    if (w.syn.length && cards.length >= 2) k.push('syn');
    return k;
  }
  /* れいぶんの なかの ことばを □ に（かきかた か よみ が はいって いる とき） */
  function fillSentence(w) {
    const forms = [w.k, w.w];
    const stem = s => s.length > 2 && /[いうくすつぬむるぐぶ]$/.test(Words.plain(s)) ? s.slice(0, -1) : s;
    for (const f of forms) {
      for (const g of [f, stem(f)]) {
        if (g && w.ex.includes(g)) return { text: w.ex.replace(g, '［　？　］'), answer: g };
      }
    }
    return null;
  }

  /* もんだいを つくる。r … らんすう（0〜1）
   * かえりち: { kind, id, q(しつもん・ruby かきかた), choices:[{id?, text(ruby), ok}], note }
   */
  function makeQuestion(card, cards, r = Math.random, kind = null) {
    const w = Words.get(card.id);
    const ks = kinds(card, cards);
    if (!ks.length) return null;
    kind = kind && ks.includes(kind) ? kind : ks[Math.floor(r() * ks.length)];
    const others = shuffle(cards.filter(c => c.id !== card.id).map(c => Words.get(c.id)).filter(Boolean), r);
    const allW = Words.LIST.concat(Words.SCENES);
    const pad = (list, n, avoid) => {  // ストックが すくない ときは ほかの ことばで うめる（こたえは かならず ストックの なか）
      const used = new Set([...avoid, ...list.map(x => x.id)]);
      for (const x of shuffle(allW, r)) { if (list.length >= n) break; if (!used.has(x.id)) { list.push(x); used.add(x.id); } }
      return list.slice(0, n);
    };
    if (kind === 'mean') {
      const wrong = pad(others.filter(o => o.mean !== w.mean), 2, [w.id]);
      return { kind, id: w.id, q: `「${w.k}」の いみは どれ？`, choices: shuffle([{ id: w.id, text: w.mean, ok: true }, ...wrong.map(o => ({ id: o.id, text: o.mean, ok: false }))], r) };
    }
    if (kind === 'fill') {
      const fs = fillSentence(w);
      const wrong = pad(others.filter(o => o.cat === w.cat && o.id !== w.id), 2, [w.id]);
      return { kind, id: w.id, q: fs.text, ask: 'あてはまる ことばは どれ？', choices: shuffle([{ id: w.id, text: w.k, ok: true }, ...wrong.map(o => ({ id: o.id, text: o.k, ok: false }))], r) };
    }
    if (kind === 'ant' || kind === 'syn') {
      const rel = kind === 'ant' ? w.ant : w.syn;
      // こたえ: その ことばの にた／はんたい の ことば（ストックに あれば それ、なければ もじ だけ）
      const inPocket = cards.map(c => Words.get(c.id)).filter(o => o && rel.includes(o.w));
      const ansText = inPocket.length ? inPocket[0].k : rel[0];
      const relAll = new Set([...w.syn, ...w.ant, w.w]);
      const wrong = pad(others.filter(o => !relAll.has(o.w)), 2, [w.id]);
      return { kind, id: w.id, q: kind === 'ant' ? `「${w.k}」の はんたいの ことばは？` : `「${w.k}」と にた いみの ことばは？`,
        choices: shuffle([{ text: ansText, ok: true }, ...wrong.map(o => ({ id: o.id, text: o.k, ok: false }))], r) };
    }
    return null;
  }

  return { sort, grade, nextCard, makeQuestion, kinds, fillSentence, GAP, kana };
})();
if (typeof module !== 'undefined') module.exports = Pocket;
