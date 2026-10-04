"use strict";

/* かんじカード - データを よみとる しくみ（app.js と tools/check-kanji-card.js で つかう） */

const KanjiLib = (() => {
  const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const DAKU = { が:'か',ぎ:'き',ぐ:'く',げ:'け',ご:'こ',ざ:'さ',じ:'し',ず:'す',ぜ:'せ',ぞ:'そ',
    だ:'た',ぢ:'ち',づ:'つ',で:'て',ど:'と',ば:'は',び:'ひ',ぶ:'ふ',べ:'へ',ぼ:'ほ',
    ぱ:'は',ぴ:'ひ',ぷ:'ふ',ぺ:'へ',ぽ:'ほ' };
  const plain1 = s => (DAKU[s[0]] || s[0] || '') + s.slice(1);
  const isKanji = c => /[一-鿿々]/.test(c);

  /* 'ことば' の かきかたを こまぎれに する
     → [{ t:'一', r:'いち', kind:null }, { t:'つ' }, { t:'一日', r:'ついたち', group:true }] */
  function parse(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === '(') {
        const m = /^\(([^)]+)\)\[([^\]]*)\]/.exec(src.slice(i));
        if (m) { out.push(seg(m[1], m[2], true)); i += m[0].length; continue; }
      }
      if (src[i + 1] === '[') {
        const end = src.indexOf(']', i + 2);
        out.push(seg(c, src.slice(i + 2, end), false));
        i = end + 1; continue;
      }
      const last = out[out.length - 1];
      if (last && last.r == null) last.t += c; else out.push({ t: c });
      i++;
    }
    return out;
  }
  function seg(t, rr, group) {
    const [r, kind] = rr.split(':');
    return { t, r, kind: kind || (group ? 't' : null), group };
  }
  const reading = segs => segs.map(s => s.r != null ? s.r : s.t).join('');
  const surface = segs => segs.map(s => s.t).join('');

  /* その 漢字の よみが おん／くん／とくべつ の どれか */
  function readingsOf(kanji) {
    const on = (kanji.on || '').split('・').filter(Boolean).map(toHira);
    const kun = (kanji.kun || '').split('・').filter(Boolean).map(r => r.replace(/\(.*\)/, ''));
    return { on, kun };
  }
  function matches(r, base) {
    if (r === base || plain1(r) === plain1(base)) return true;
    if (r.endsWith('っ') && r.length === base.length) {          // いっ・がっ・じゅっ
      return plain1(r.slice(0, -1)) === plain1(base.slice(0, -1));
    }
    return false;
  }
  function classify(s, kanji) {
    if (s.kind) return { kind: s.kind, sure: true };
    const { on, kun } = readingsOf(kanji);
    if (on.some(o => matches(s.r, o))) return { kind: 'o', sure: true };
    if (kun.some(k => matches(s.r, k))) return { kind: 'k', sure: true };
    return { kind: 'k', sure: false };
  }

  /* 1こ の ことば → カードの データ */
  function makeWord(kanji, line, isEki) {
    const f = line.split('|');
    const segs = parse(f[0]);
    const focus = segs.findIndex(s => s.r != null && s.t.includes(kanji.k));
    const fseg = segs[focus];
    const c = fseg ? classify(fseg, kanji) : { kind: 't', sure: false };
    return {
      id: kanji.k + ':' + f[0],
      kanji: kanji.k,
      src: f[0], segs, focus,
      kind: fseg && fseg.group ? 't' : c.kind,
      sure: c.sure,
      eki: !!isEki,
      emoji: isEki ? '🚉' : (f[1] || ''),
      imi: isEki ? (f[1] + 'の えき') : (f[2] || ''),
      rei: isEki ? '' : (f[3] || ''),
      yomi: reading(segs),
      text: surface(segs)
    };
  }

  function build(KANJI) {
    const words = [];
    KANJI.forEach((k, ki) => {
      k.index = ki;
      k.words = k.w.map(line => makeWord(k, line, false));
      k.words.push(...(k.eki || []).map(line => makeWord(k, line, true)));
      words.push(...k.words);
    });
    return words;
  }

  return { parse, reading, surface, classify, readingsOf, build, isKanji, toHira };
})();

if (typeof module !== 'undefined') module.exports = KanjiLib;
