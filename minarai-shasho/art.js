'use strict';

/*
 * え（ぜんぶ その場で つくる SVG。がぞうファイルは つかわない）
 *   Popo   … みならい しゃしょうロボ。きもちで かおが かわる
 *   Moya   … まちがえた もんだいから うまれる「モヤモヤ」。
 *            もんだいの id から かたちを 決めるので、おなじ もんだいは いつも おなじ すがた
 *   Stamp  … うんこうの おみやげ
 */

const Art = (function () {

  /* tag ごとの いろ。きょうざいを 差し替えたら ここに 足す(なければ はいいろ) */
  const TAG_COLOR = {
    'いろ': '#e0723a',
    'となり': '#4f9d43',
    'しんかんせん': '#2f7ec4',
    'ぶひん': '#8c5fc4',
    'おしごと': '#d1477a',
    'どこ': '#bf9314',
  };

  function tagColor(tag) { return TAG_COLOR[tag] || '#6b7f8f'; }

  function seedOf(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ぐにゃぐにゃした まるを つくる */
  function blobPath(seed, cx, cy, r, wob) {
    let a = seed >>> 0;
    const rnd = () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
    const n = 9;
    const p = [];
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      const rr = r * (1 + (rnd() - 0.5) * wob);
      p.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr]);
    }
    const mid = (i, j) => [(p[i][0] + p[j][0]) / 2, (p[i][1] + p[j][1]) / 2];
    const f = (v) => v.toFixed(1);
    let m0 = mid(0, 1);
    let d = 'M' + f(m0[0]) + ',' + f(m0[1]);
    for (let i = 1; i <= n; i++) {
      const c = p[i % n];
      const m = mid(i % n, (i + 1) % n);
      d += 'Q' + f(c[0]) + ',' + f(c[1]) + ' ' + f(m[0]) + ',' + f(m[1]);
    }
    return d + 'Z';
  }

  /* ------------------------------- ポポ ------------------------------- */

  /* mood: normal / happy / think / sad / sleep / run / wow */
  function popo(mood, size) {
    const s = size || 120;
    const m = mood || 'normal';

    let eyes;
    if (m === 'happy' || m === 'wow') {
      eyes = '<path d="M40 56 q6 -9 12 0" fill="none" stroke="#20303a" stroke-width="5" stroke-linecap="round"/>' +
             '<path d="M68 56 q6 -9 12 0" fill="none" stroke="#20303a" stroke-width="5" stroke-linecap="round"/>';
    } else if (m === 'sleep') {
      eyes = '<path d="M40 58 h12" stroke="#20303a" stroke-width="5" stroke-linecap="round"/>' +
             '<path d="M68 58 h12" stroke="#20303a" stroke-width="5" stroke-linecap="round"/>';
    } else if (m === 'sad') {
      eyes = '<circle cx="46" cy="60" r="5.5" fill="#20303a"/><circle cx="74" cy="60" r="5.5" fill="#20303a"/>' +
             '<path d="M39 50 q7 -4 14 -1" stroke="#20303a" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
             '<path d="M67 49 q7 -3 14 1" stroke="#20303a" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    } else if (m === 'think') {
      eyes = '<circle cx="46" cy="57" r="6" fill="#20303a"/><path d="M68 57 h12" stroke="#20303a" stroke-width="5" stroke-linecap="round"/>';
    } else {
      eyes = '<circle cx="46" cy="57" r="6.5" fill="#20303a"/><circle cx="74" cy="57" r="6.5" fill="#20303a"/>' +
             '<circle cx="48" cy="55" r="2" fill="#fff"/><circle cx="76" cy="55" r="2" fill="#fff"/>';
    }

    let mouth;
    if (m === 'happy' || m === 'wow') mouth = '<path d="M50 72 q10 12 20 0" fill="#e2607a" stroke="#20303a" stroke-width="3" stroke-linejoin="round"/>';
    else if (m === 'sad') mouth = '<path d="M52 78 q8 -8 16 0" fill="none" stroke="#20303a" stroke-width="4" stroke-linecap="round"/>';
    else if (m === 'sleep') mouth = '<path d="M55 74 q5 5 10 0" fill="none" stroke="#20303a" stroke-width="4" stroke-linecap="round"/>';
    else mouth = '<path d="M53 73 q7 7 14 0" fill="none" stroke="#20303a" stroke-width="4" stroke-linecap="round"/>';

    const extra = m === 'sleep'
      ? '<text x="96" y="30" font-size="16" fill="#5c7488">z</text><text x="104" y="16" font-size="12" fill="#5c7488">z</text>'
      : (m === 'think' ? '<text x="94" y="30" font-size="26" fill="#5c7488">?</text>' : '');

    return '' +
      '<svg class="popo mood-' + m + '" viewBox="0 0 120 120" width="' + s + '" height="' + s + '" role="img" aria-label="ポポ">' +
        '<ellipse cx="60" cy="112" rx="34" ry="6" fill="rgba(32,48,58,.14)"/>' +
        /* からだ(でんしゃの かおの かたち) */
        '<rect x="18" y="34" width="84" height="72" rx="24" fill="#2f7ec4"/>' +
        '<rect x="18" y="34" width="84" height="72" rx="24" fill="none" stroke="#1c5c96" stroke-width="4"/>' +
        /* まどガラス = かお */
        '<rect x="30" y="44" width="60" height="46" rx="17" fill="#f4fbff" stroke="#1c5c96" stroke-width="3"/>' +
        '<circle cx="36" cy="84" r="4" fill="#ffd96b"/><circle cx="84" cy="84" r="4" fill="#ffd96b"/>' +
        eyes + mouth +
        '<circle cx="36" cy="70" r="5" fill="#f5a3b5" opacity=".75"/>' +
        '<circle cx="84" cy="70" r="5" fill="#f5a3b5" opacity=".75"/>' +
        /* しゃしょうの ぼうし */
        '<path d="M24 36 q36 -22 72 0 z" fill="#1b3f6b"/>' +
        '<rect x="20" y="30" width="80" height="10" rx="5" fill="#122c4c"/>' +
        '<circle cx="60" cy="22" r="7" fill="#ffd96b" stroke="#122c4c" stroke-width="2.5"/>' +
        extra +
      '</svg>';
  }

  /* ------------------------------ モヤモヤ ------------------------------ */

  /* state: awake / sleep / friend */
  function moya(id, tag, state, size) {
    const s = size || 84;
    const seed = seedOf(id);
    const col = tagColor(tag);
    const body = blobPath(seed, 50, 52, 32, state === 'awake' ? 0.34 : 0.2);

    let face;
    if (state === 'friend') {
      face = '<path d="M36 48 q5 -7 10 0" stroke="#2b2333" stroke-width="4" fill="none" stroke-linecap="round"/>' +
             '<path d="M56 48 q5 -7 10 0" stroke="#2b2333" stroke-width="4" fill="none" stroke-linecap="round"/>' +
             '<path d="M42 62 q9 9 18 0" fill="#fff" stroke="#2b2333" stroke-width="3" stroke-linejoin="round"/>' +
             '<circle cx="34" cy="58" r="4.5" fill="#ff9db3" opacity=".8"/>' +
             '<circle cx="68" cy="58" r="4.5" fill="#ff9db3" opacity=".8"/>';
    } else if (state === 'sleep') {
      face = '<path d="M36 50 h10" stroke="#2b2333" stroke-width="4" stroke-linecap="round"/>' +
             '<path d="M56 50 h10" stroke="#2b2333" stroke-width="4" stroke-linecap="round"/>' +
             '<path d="M46 62 q5 4 9 0" stroke="#2b2333" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
             '<text x="74" y="26" font-size="14" fill="#7d8b99">z</text>';
    } else {
      face = '<circle cx="40" cy="49" r="6.5" fill="#fff"/><circle cx="41" cy="50" r="3.4" fill="#2b2333"/>' +
             '<circle cx="62" cy="49" r="6.5" fill="#fff"/><circle cx="61" cy="50" r="3.4" fill="#2b2333"/>' +
             '<path d="M42 65 q9 -8 18 0" fill="none" stroke="#2b2333" stroke-width="4" stroke-linecap="round"/>';
    }

    const horns = state === 'awake'
      ? '<path d="M30 26 l6 -14 6 12 M58 22 l7 -15 5 15" stroke="' + col + '" stroke-width="5" fill="none" stroke-linecap="round"/>'
      : '';

    const cap = state === 'friend'
      ? '<path d="M30 26 q20 -14 40 0 z" fill="#1b3f6b"/><rect x="26" y="22" width="48" height="7" rx="3.5" fill="#122c4c"/>'
      : '';

    const sparkle = state === 'friend'
      ? '<text x="6" y="24" font-size="16" fill="#ffca3a">✦</text><text x="80" y="80" font-size="13" fill="#ffca3a">✦</text>'
      : '';

    return '' +
      '<svg class="moya st-' + state + '" viewBox="0 0 100 100" width="' + s + '" height="' + s + '" role="img" aria-label="モヤモヤ">' +
        horns +
        '<path d="' + body + '" fill="' + col + '" opacity="' + (state === 'sleep' ? '.42' : '.9') + '"/>' +
        '<path d="' + body + '" fill="none" stroke="' + col + '" stroke-width="3" opacity=".9"/>' +
        face + cap + sparkle +
      '</svg>';
  }

  /* ------------------------------ おみやげ ------------------------------ */

  /* 2ぎょうに わける とき、ちいさい かなで ぎょうを はじめない */
  const SMALL = 'ゃゅょっぁぃぅぇぉャュョッァィゥェォーん';
  function splitName(name) {
    if (name.length <= 5) return [name, ''];
    let i = Math.ceil(name.length / 2);
    while (i < name.length && SMALL.indexOf(name[i]) >= 0) i++;
    return [name.slice(0, i), name.slice(i)];
  }

  function stamp(name, color, got) {
    const c = got ? (color || '#2f7ec4') : '#c3ced7';
    const parts = splitName(name);
    const two = parts[1] !== '';
    const fs = Math.max(13, Math.min(24, Math.floor(66 / Math.max(parts[0].length, parts[1].length || 1))));
    return '' +
      '<svg viewBox="0 0 100 100" width="72" height="72" role="img" aria-label="' + name + '">' +
        '<circle cx="50" cy="50" r="42" fill="none" stroke="' + c + '" stroke-width="5" stroke-dasharray="' + (got ? '0' : '7 6') + '"/>' +
        '<circle cx="50" cy="50" r="33" fill="none" stroke="' + c + '" stroke-width="2.5"/>' +
        (got
          ? '<text x="50" y="' + (two ? 48 : 59) + '" text-anchor="middle" font-size="' + fs + '" fill="' + c + '">' + parts[0] + '</text>' +
            (two ? '<text x="50" y="' + (48 + fs + 2) + '" text-anchor="middle" font-size="' + fs + '" fill="' + c + '">' + parts[1] + '</text>' : '')
          : '<text x="50" y="60" text-anchor="middle" font-size="30" fill="' + c + '">?</text>') +
      '</svg>';
  }

  /* うんこうちゅうの ミニでんしゃ */
  function train(color) {
    return '' +
      '<svg viewBox="0 0 60 40" width="46" height="31" aria-hidden="true">' +
        '<rect x="6" y="6" width="46" height="24" rx="9" fill="' + (color || '#2f7ec4') + '"/>' +
        '<rect x="12" y="11" width="16" height="11" rx="4" fill="#f4fbff"/>' +
        '<rect x="32" y="11" width="14" height="11" rx="4" fill="#f4fbff"/>' +
        '<circle cx="18" cy="33" r="4" fill="#33414d"/><circle cx="40" cy="33" r="4" fill="#33414d"/>' +
      '</svg>';
  }

  return { popo: popo, moya: moya, stamp: stamp, train: train, tagColor: tagColor };
})();
