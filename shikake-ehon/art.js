'use strict';

/*
 * え の ぶひん。ぜんぶ SVG の もじれつ を かえす（がぞうファイル なし）。
 * えの おおきさは 800 × 700（viewBox）。
 *
 * うごかす もの は「そとがわ の <g>（transform なし）」に class を つけて CSS で うごかす。
 * （SVG の transform ぞくせい と CSS の transform が ぶつからない ように する ため）
 */
const Art = (() => {
  /* じかんたい ごとの そら の いろ（うえ → した） */
  const SKY = {
    asa: ['#a9dcff', '#fff1d0'],
    hiru: ['#7cc8ff', '#e3f6ff'],
    hiru2: ['#8fc6f0', '#fff0c9'],
    yu1: ['#ffb88c', '#ffe9c9'],
    yu: ['#f58fa0', '#ffcf8a'],
    yugure: ['#7b6fc4', '#f7a58c'],
    yoru: ['#14204a', '#34477e'],
  };
  /* え ぜんたい に うすく かける いろ（ひる → ゆう → よる） */
  const TINT = {
    yu1: ['#ff9a4d', 0.08],
    yu: ['#ff6a3d', 0.13],
    yugure: ['#5a3c9a', 0.18],
    yoru: ['#0c1440', 0.38],
  };
  const SUN = {
    asa: [130, 150, '#fff3b0'],
    hiru: [640, 110, '#fff6c2'],
    hiru2: [650, 140, '#fff0a8'],
    yu1: [640, 230, '#ffd08a'],
    yu: [610, 300, '#ff9f6e'],
  };

  /* きまった ならびの らんすう（まいかい おなじ え に なる） */
  function rand(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function defs() {
    let d = '';
    Object.keys(SKY).forEach((k) => {
      d += `<linearGradient id="sky-${k}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${SKY[k][0]}"/><stop offset="1" stop-color="${SKY[k][1]}"/></linearGradient>`;
    });
    d += `
      <radialGradient id="halo"><stop offset="0" stop-color="#fff" stop-opacity=".95"/>
        <stop offset=".55" stop-color="#fff8c8" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="sunglow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="lampglow"><stop offset="0" stop-color="#fff3a8" stop-opacity=".95"/>
        <stop offset="1" stop-color="#ffd43b" stop-opacity="0"/></radialGradient>
      <linearGradient id="sea-day" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb7e8"/><stop offset="1" stop-color="#2f86c4"/></linearGradient>
      <linearGradient id="sea-yu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3a29a"/><stop offset=".35" stop-color="#7f8fcf"/><stop offset="1" stop-color="#3f63a8"/></linearGradient>
      <linearGradient id="sea-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3d78"/><stop offset="1" stop-color="#121c45"/></linearGradient>
      <linearGradient id="river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc8ec"/><stop offset="1" stop-color="#4a9fd4"/></linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".5"/><stop offset=".5" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
      <pattern id="check" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#fff"/><rect width="12" height="12" fill="#e8505b"/><rect x="12" y="12" width="12" height="12" fill="#e8505b"/></pattern>
      <pattern id="weave" width="20" height="14" patternUnits="userSpaceOnUse">
        <rect width="20" height="14" fill="#c98b4f"/><path d="M0 7h20M10 0v7M0 7v7M20 7v7" stroke="#a46a35" stroke-width="2"/></pattern>
      <pattern id="brick" width="60" height="30" patternUnits="userSpaceOnUse">
        <rect width="60" height="30" fill="#6b4f45"/><path d="M0 0h60M0 15h60M15 0v15M45 15v15" stroke="#4e3832" stroke-width="2"/></pattern>`;
    return d;
  }

  function sky(t) {
    let s = `<rect width="800" height="700" fill="url(#sky-${t})"/>`;
    const sun = SUN[t];
    if (sun) {
      s += `<g class="amb-sun"><circle cx="${sun[0]}" cy="${sun[1]}" r="95" fill="url(#sunglow)" opacity=".7"/>
        <circle cx="${sun[0]}" cy="${sun[1]}" r="46" fill="${sun[2]}"/></g>`;
    }
    if (t === 'yoru' || t === 'yugure') {
      const r = rand(7);
      let st = '';
      const n = t === 'yoru' ? 46 : 16;
      for (let i = 0; i < n; i += 1) {
        const x = r() * 800;
        const y = r() * (t === 'yoru' ? 420 : 220);
        const rr = 1.2 + r() * 2.4;
        st += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="#fffbe0" class="twinkle" style="animation-delay:${(r() * 3).toFixed(2)}s"/>`;
      }
      s += `<g opacity="${t === 'yoru' ? 1 : 0.7}">${st}</g>`;
    }
    if (t === 'yoru') {
      s += `<g><circle cx="650" cy="110" r="70" fill="url(#sunglow)" opacity=".35"/>
        <circle cx="650" cy="110" r="38" fill="#fff6c8"/><circle cx="668" cy="98" r="34" fill="#1a2756"/></g>`;
    }
    return s;
  }

  function tint(t) {
    const c = TINT[t];
    return c ? `<rect width="800" height="700" fill="${c[0]}" opacity="${c[1]}" pointer-events="none"/>` : '';
  }

  function cloud(x, y, s, cls) {
    return `<g class="${cls || 'amb-cloud'}"><g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".92">
      <ellipse cx="0" cy="0" rx="60" ry="26"/><circle cx="-26" cy="-14" r="26"/><circle cx="16" cy="-24" r="32"/><circle cx="46" cy="-6" r="22"/></g></g>`;
  }

  function hills(c1, c2) {
    return `<path d="M0 430 Q 180 340 380 410 T 800 380 V700 H0Z" fill="${c1}"/>
      <path d="M0 500 Q 300 450 520 480 T 800 470 V700 H0Z" fill="${c2}"/>`;
  }

  function tree(x, y, s, leaf, leaf2) {
    const a = leaf || '#6cc070';
    const b = leaf2 || '#56a85c';
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-14 0 L-10 -120 L10 -120 L14 0Z" fill="#8a5a3c"/>
      <circle cx="0" cy="-160" r="70" fill="${b}"/><circle cx="-46" cy="-130" r="48" fill="${a}"/>
      <circle cx="46" cy="-136" r="50" fill="${a}"/><circle cx="0" cy="-196" r="50" fill="${a}"/>
      <circle cx="-20" cy="-176" r="14" fill="#fff" opacity=".18"/></g>`;
  }

  function bush(x, y, s, c) {
    const col = c || '#5fb563';
    return `<g transform="translate(${x} ${y}) scale(${s})" fill="${col}">
      <ellipse cx="0" cy="0" rx="62" ry="30"/><circle cx="-30" cy="-16" r="30"/><circle cx="12" cy="-28" r="34"/><circle cx="42" cy="-10" r="26"/></g>`;
  }

  /* はな（タップで ひらく） */
  function flower(x, y, c, key) {
    const petals = [0, 72, 144, 216, 288]
      .map((a) => `<ellipse cx="0" cy="-16" rx="10" ry="16" fill="${c}" transform="rotate(${a})"/>`)
      .join('');
    return `<g data-tap="bloom" data-sfx="bloom" ${key ? `data-key="${key}"` : ''} class="t-bloom">
      <g transform="translate(${x} ${y})">
        <path d="M0 0 V46" stroke="#4f9a4f" stroke-width="5"/>
        <ellipse cx="12" cy="30" rx="12" ry="6" fill="#5fb563" transform="rotate(-30 12 30)"/>
        <circle r="30" fill="transparent"/>
        <g class="bud"><ellipse cx="0" cy="-4" rx="9" ry="13" fill="${c}"/></g>
        <g class="petals">${petals}<circle r="9" fill="#ffd43b"/></g>
      </g></g>`;
  }

  /* ことり（タップで とんでいって もどる） */
  function bird(x, y, s, c, flip) {
    const col = c || '#6ab0e8';
    return `<g data-tap="fly" data-sfx="chirp" class="t-fly"><g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
      <circle r="34" fill="transparent"/>
      <ellipse cx="0" cy="0" rx="20" ry="15" fill="${col}"/><circle cx="14" cy="-10" r="11" fill="${col}"/>
      <path d="M24 -10 l10 3 l-10 3z" fill="#f59f00"/><circle cx="17" cy="-12" r="2.4" fill="#222"/>
      <path class="wing" d="M-6 -4 q-10 -16 -22 -6 q10 8 22 6z" fill="#fff" opacity=".7"/>
      <path d="M-18 2 l-12 -4 l2 8z" fill="${col}"/></g></g>`;
  }

  function butterfly(x, y) {
    return `<g data-tap="flutter" data-sfx="fly" class="t-flutter"><g transform="translate(${x} ${y})">
      <circle r="34" fill="transparent"/>
      <g class="wings"><ellipse cx="-12" cy="-6" rx="13" ry="16" fill="#ffa8c5"/><ellipse cx="12" cy="-6" rx="13" ry="16" fill="#ffa8c5"/>
      <ellipse cx="-9" cy="10" rx="9" ry="10" fill="#ffc9dc"/><ellipse cx="9" cy="10" rx="9" ry="10" fill="#ffc9dc"/></g>
      <rect x="-2" y="-14" width="4" height="30" rx="2" fill="#5b4636"/></g></g>`;
  }

  /* あかい ぼうし（まんなか が げんてん） */
  function hat(x, y, s, rot, id) {
    return `<g ${id ? `id="${id}"` : ''}><g transform="translate(${x} ${y}) rotate(${rot || 0}) scale(${s})">
      <ellipse cx="0" cy="2" rx="64" ry="16" fill="#c92a3a"/>
      <path d="M-40 2 C-42 -52 42 -52 40 2 Z" fill="#e8505b"/>
      <path d="M-41 -8 C-26 -15 26 -15 41 -8 L41 2 C26 -5 -26 -5 -41 2Z" fill="#fff4e6"/>
      <g transform="translate(26 -8)"><circle r="8" fill="#ffd43b"/><circle r="3.5" fill="#f08c00"/></g>
      <path d="M-24 -30 q12 -10 26 -10" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".35"/></g></g>`;
  }

  /*
   * こぐまの ぽっけ。あしもと が (x, y)。せの たかさ は やく 230 × s。
   * o.hat: ぼうしを かぶる / o.hatId: ぼうしに id / o.reach: てを のばす / o.mouth: 'o' | 'smile'
   */
  function pokke(x, y, s, o) {
    const op = o || {};
    const flip = op.flip ? -1 : 1;
    const armR = op.reach
      ? '<path d="M34 -86 q30 -40 26 -84" stroke="#a56c40" stroke-width="22" stroke-linecap="round" fill="none"/><circle cx="60" cy="-172" r="13" fill="#a56c40"/>'
      : '<path d="M38 -84 q20 22 16 46" stroke="#a56c40" stroke-width="22" stroke-linecap="round" fill="none"/>';
    const mouth = op.mouth === 'o'
      ? '<ellipse cx="0" cy="-112" rx="7" ry="9" fill="#7a3b2a"/>'
      : '<path d="M-12 -116 q12 12 24 0" stroke="#4a2f1f" stroke-width="4" fill="none" stroke-linecap="round"/>';
    const hatSvg = op.hat ? hat(0, -186, 0.92, -6, op.hatId) : '';
    return `<g class="pokke"><g transform="translate(${x} ${y}) scale(${s * flip} ${s})">
      <ellipse cx="0" cy="0" rx="56" ry="10" fill="#000" opacity=".12"/>
      <ellipse cx="-24" cy="-14" rx="20" ry="15" fill="#94603a"/><ellipse cx="24" cy="-14" rx="20" ry="15" fill="#94603a"/>
      <path d="M-38 -84 q-20 22 -16 46" stroke="#a56c40" stroke-width="22" stroke-linecap="round" fill="none"/>
      <ellipse cx="0" cy="-62" rx="48" ry="54" fill="#b5794a"/>
      <ellipse cx="0" cy="-54" rx="30" ry="36" fill="#f2d4ac"/>
      ${armR}
      <circle cx="-40" cy="-182" r="19" fill="#b5794a"/><circle cx="-40" cy="-182" r="9" fill="#f2b8a0"/>
      <circle cx="40" cy="-182" r="19" fill="#b5794a"/><circle cx="40" cy="-182" r="9" fill="#f2b8a0"/>
      <circle cx="0" cy="-140" r="52" fill="#b5794a"/>
      <ellipse cx="0" cy="-122" rx="25" ry="19" fill="#f2d4ac"/>
      <ellipse cx="0" cy="-131" rx="8" ry="6" fill="#4a2f1f"/>
      ${mouth}
      <circle cx="-19" cy="-150" r="6.5" fill="#2b1d14"/><circle cx="19" cy="-150" r="6.5" fill="#2b1d14"/>
      <circle cx="-17" cy="-152" r="2.2" fill="#fff"/><circle cx="21" cy="-152" r="2.2" fill="#fff"/>
      <circle cx="-34" cy="-124" r="8" fill="#ff8fa3" opacity=".55"/><circle cx="34" cy="-124" r="8" fill="#ff8fa3" opacity=".55"/>
      ${hatSvg}</g></g>`;
  }

  /* ねこの ゆうびんやさん */
  function postCat(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <ellipse cx="0" cy="0" rx="46" ry="9" fill="#000" opacity=".12"/>
      <path d="M40 -30 q40 -10 34 -60" stroke="#9aa3ad" stroke-width="12" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="-50" rx="38" ry="50" fill="#9aa3ad"/>
      <ellipse cx="0" cy="-40" rx="22" ry="30" fill="#eef1f4"/>
      <rect x="-44" y="-70" width="40" height="40" rx="8" fill="#c2884b" transform="rotate(-8)"/>
      <rect x="-38" y="-62" width="24" height="15" fill="#fff" transform="rotate(-8)"/>
      <path d="M-30 -110 L-30 -60" stroke="#8a5a3c" stroke-width="5"/>
      <path d="M-36 -150 l6 -34 l22 22z" fill="#9aa3ad"/><path d="M36 -150 l-6 -34 l-22 22z" fill="#9aa3ad"/>
      <circle cx="0" cy="-122" r="40" fill="#9aa3ad"/>
      <ellipse cx="0" cy="-110" rx="20" ry="14" fill="#eef1f4"/>
      <path d="M-6 -116 l6 5 l6 -5z" fill="#ff8fa3"/>
      <path d="M-10 -104 q10 8 20 0" stroke="#555" stroke-width="3" fill="none"/>
      <path d="M-16 -126 q-6 -6 -12 0M16 -126 q6 -6 12 0" stroke="#333" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M-24 -110 h-24M-24 -104 h-22M24 -110 h24M24 -104 h22" stroke="#555" stroke-width="2"/>
      <path d="M-34 -150 q34 -28 68 0 l4 8 h-76z" fill="#3b6fd6"/><rect x="-42" y="-144" width="84" height="8" rx="4" fill="#2952a8"/>
      <circle cx="0" cy="-152" r="6" fill="#ffd43b"/></g>`;
  }

  /* えきの かかりいん、たぬきさん */
  function tanuki(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <ellipse cx="0" cy="0" rx="52" ry="10" fill="#000" opacity=".12"/>
      <path d="M38 -28 q52 0 46 -46 q-30 -6 -40 20z" fill="#7a5a3c"/><path d="M70 -60 q12 -8 14 -16 q-12 -2 -22 8z" fill="#3b2a1e"/>
      <ellipse cx="0" cy="-56" rx="46" ry="56" fill="#2c3e6b"/>
      <path d="M-14 -100 l14 30 l14 -30" fill="#fff"/>
      <circle cx="0" cy="-64" r="5" fill="#ffd43b"/><circle cx="0" cy="-44" r="5" fill="#ffd43b"/>
      <ellipse cx="-24" cy="-6" rx="16" ry="10" fill="#5b4330"/><ellipse cx="24" cy="-6" rx="16" ry="10" fill="#5b4330"/>
      <circle cx="-38" cy="-168" r="16" fill="#7a5a3c"/><circle cx="38" cy="-168" r="16" fill="#7a5a3c"/>
      <circle cx="0" cy="-132" r="46" fill="#9c7a58"/>
      <ellipse cx="-17" cy="-134" rx="16" ry="13" fill="#3b2a1e"/><ellipse cx="17" cy="-134" rx="16" ry="13" fill="#3b2a1e"/>
      <circle cx="-16" cy="-134" r="5" fill="#fff"/><circle cx="16" cy="-134" r="5" fill="#fff"/>
      <circle cx="-15" cy="-134" r="2.6" fill="#222"/><circle cx="17" cy="-134" r="2.6" fill="#222"/>
      <ellipse cx="0" cy="-110" rx="18" ry="12" fill="#efe2cf"/><ellipse cx="0" cy="-116" rx="6" ry="4.5" fill="#222"/>
      <path d="M-8 -106 q8 6 16 0" stroke="#333" stroke-width="3" fill="none"/>
      <path d="M-40 -166 q40 -30 80 0 v10 h-80z" fill="#22335e"/><rect x="-46" y="-160" width="92" height="9" rx="4" fill="#111c38"/>
      <rect x="-40" y="-170" width="80" height="6" fill="#ffd43b"/>
      <path d="M-44 -76 q-22 26 -10 44" stroke="#2c3e6b" stroke-width="18" stroke-linecap="round" fill="none"/>
      <path d="M44 -76 q26 -20 26 -50" stroke="#2c3e6b" stroke-width="18" stroke-linecap="round" fill="none"/>
      <circle cx="70" cy="-128" r="10" fill="#9c7a58"/></g>`;
  }

  /* かもめさん */
  function kamome(x, y, s, flip) {
    return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
      <ellipse cx="0" cy="0" rx="40" ry="18" fill="#fff"/>
      <path class="wing" d="M-6 -6 q-30 -60 -70 -40 q36 10 50 46z" fill="#cfd8e3"/>
      <path class="wing" d="M6 -6 q24 -60 64 -48 q-34 14 -44 52z" fill="#e4eaf1"/>
      <circle cx="34" cy="-10" r="16" fill="#fff"/>
      <path d="M46 -12 l22 4 l-22 6z" fill="#f59f00"/>
      <circle cx="38" cy="-14" r="3" fill="#222"/>
      <path d="M-40 0 l-18 -8 l4 14z" fill="#9aa8b8"/></g>`;
  }

  /* ちいさな ひな */
  function hina(x, y, s) {
    return `<g data-tap="hop" data-sfx="chirp" class="t-hop"><g transform="translate(${x} ${y}) scale(${s})">
      <circle r="30" fill="transparent"/>
      <ellipse cx="0" cy="0" rx="20" ry="18" fill="#ffd43b"/><circle cx="0" cy="-20" r="14" fill="#ffe066"/>
      <path d="M-4 -18 l4 6 l4 -6z" fill="#f08c00"/><circle cx="-6" cy="-24" r="2.4" fill="#222"/><circle cx="6" cy="-24" r="2.4" fill="#222"/>
      <path d="M-4 -34 q4 -8 8 0" stroke="#ffd43b" stroke-width="3" fill="none"/></g></g>`;
  }

  /*
   * かくれねこ「みけ」。あたまと まえあし だけ ちょこん と のぞいて いる。
   * (x, y) は あご の した。
   */
  function mike(x, y, s, rot) {
    return `<g data-mike="1" class="mike"><g transform="translate(${x} ${y}) rotate(${rot || 0}) scale(${s || 1})">
      <circle cx="0" cy="-20" r="46" fill="transparent"/>
      <path d="M-20 -40 l-4 -26 l20 14z" fill="#f08c3c"/><path d="M20 -40 l4 -26 l-20 14z" fill="#3b2f2a"/>
      <circle cx="0" cy="-22" r="24" fill="#fffaf2"/>
      <path d="M-24 -22 a24 24 0 0 1 14 -22 q2 14 -14 22z" fill="#f08c3c"/>
      <path d="M8 -44 a24 24 0 0 1 16 18 q-14 4 -16 -18z" fill="#3b2f2a"/>
      <path d="M-11 -24 q3 -4 6 0M5 -24 q3 -4 6 0" stroke="#3b2f2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M-3 -16 l3 3 l3 -3z" fill="#ff8fa3"/>
      <path d="M-14 -14 h-12M14 -14 h12" stroke="#a89a8a" stroke-width="1.4"/>
      <ellipse cx="-10" cy="0" rx="8" ry="5" fill="#fffaf2"/><ellipse cx="10" cy="0" rx="8" ry="5" fill="#fffaf2"/></g></g>`;
  }

  function waves(y, c, n, cls) {
    let p = '';
    for (let i = 0; i < (n || 4); i += 1) {
      const yy = y + i * 46;
      p += `<path d="M-60 ${yy} q30 -14 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0"
        stroke="${c}" stroke-width="5" fill="none" opacity="${0.55 - i * 0.08}" stroke-linecap="round"/>`;
    }
    return `<g class="${cls || 'amb-wave'}">${p}</g>`;
  }

  function lighthouse(x, y, s, lit) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-34 0 L-22 -200 L22 -200 L34 0Z" fill="#fff"/>
      <path d="M-30 -50 L-27 -90 L27 -90 L30 -50Z M-25 -130 L-23 -165 L23 -165 L25 -130Z" fill="#e8505b"/>
      <rect x="-30" y="-212" width="60" height="14" rx="4" fill="#495057"/>
      <rect x="-18" y="-252" width="36" height="40" rx="6" fill="${lit ? '#fff3a8' : '#ced4da'}"/>
      <path d="M-24 -252 q24 -30 48 0z" fill="#e8505b"/>
      ${lit ? '<circle cx="0" cy="-232" r="60" fill="url(#lampglow)" class="amb-lamp"/>' : ''}
      <rect x="-8" y="-40" width="16" height="40" rx="8" fill="#868e96"/></g>`;
  }

  /* でんしゃ（よこから みた ところ）。ひだりはし が x */
  function train(x, y, s, o) {
    const op = o || {};
    const car = (cx) => `
      <rect x="${cx}" y="-130" width="300" height="120" rx="22" fill="#fdf6e3"/>
      <rect x="${cx}" y="-60" width="300" height="20" fill="#2f9e6e"/>
      <rect x="${cx}" y="-36" width="300" height="10" fill="#e8505b"/>
      <rect x="${cx + 24}" y="-112" width="70" height="44" rx="8" fill="#9fd3f5"/>
      <rect x="${cx + 116}" y="-112" width="70" height="44" rx="8" fill="#9fd3f5"/>
      <rect x="${cx + 208}" y="-112" width="70" height="44" rx="8" fill="#9fd3f5"/>
      <circle cx="${cx + 60}" cy="-6" r="16" fill="#495057"/><circle cx="${cx + 240}" cy="-6" r="16" fill="#495057"/>
      <circle cx="${cx + 60}" cy="-6" r="6" fill="#adb5bd"/><circle cx="${cx + 240}" cy="-6" r="6" fill="#adb5bd"/>`;
    return `<g transform="translate(${x} ${y}) scale(${s})">
      ${car(0)}${op.cars === 1 ? '' : car(310)}
      <rect x="140" y="-150" width="40" height="20" fill="#868e96"/>
      <path d="M130 -150 l30 -24 l30 24" stroke="#495057" stroke-width="5" fill="none"/>
      ${op.inner || ''}</g>`;
  }

  function boat(x, y, s, o) {
    const op = o || {};
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-110 -20 L110 -20 L80 30 L-80 30Z" fill="${op.color || '#f08c3c'}"/>
      <path d="M-110 -20 L110 -20 L104 -8 L-104 -8Z" fill="#fff" opacity=".6"/>
      <path d="M0 -20 V-170" stroke="#8a5a3c" stroke-width="7"/>
      ${op.noSail ? '' : '<path d="M6 -164 Q90 -100 6 -34Z" fill="#fff"/><path d="M-6 -150 Q-60 -100 -6 -44Z" fill="#ffe3ef"/>'}
      ${op.inner || ''}</g>`;
  }

  /* ちいさな いしころ・いわ */
  function rock(x, y, s, c) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-70 0 q-6 -46 30 -60 q30 -24 60 -4 q40 10 44 64z" fill="${c || '#8d8f9a'}"/>
      <path d="M-40 -48 q20 -14 40 -6" stroke="#fff" stroke-width="5" opacity=".18" fill="none" stroke-linecap="round"/></g>`;
  }

  /* ほし（タップで ひかる） */
  function starShape(r) {
    let d = '';
    for (let i = 0; i < 10; i += 1) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      d += `${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`;
    }
    return `${d}Z`;
  }

  return {
    defs, sky, tint, cloud, hills, tree, bush, flower, bird, butterfly, hat, pokke, postCat,
    tanuki, kamome, hina, mike, waves, lighthouse, train, boat, rock, starShape, rand,
  };
})();
