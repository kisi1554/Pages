'use strict';
/*
 * え（ぜんぶ SVG。がぞうファイルは つかわない）
 *  - よるの しゃこ の けしき
 *  - しょうめんから みた ほんもの そっくりの でんしゃ 5だい
 * でんしゃの げんてんは「レールの うえ・まんなか」。うえが マイナス。
 * かおは かかない。ヘッドライトが「め」の かわり。
 */
const Art = (function () {
  /* ---------- きょうつうの グラデーション（ページに 1つだけ おく） ---------- */
  const DEFS = `
<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
  <radialGradient id="nGlow"><stop offset="0" stop-color="#fffbe6" stop-opacity=".95"/><stop offset=".18" stop-color="#ffe9a3" stop-opacity=".6"/><stop offset=".5" stop-color="#ffd978" stop-opacity=".16"/><stop offset="1" stop-color="#ffd978" stop-opacity="0"/></radialGradient>
  <radialGradient id="nLamp"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#fff6cc"/><stop offset="1" stop-color="#ffd166"/></radialGradient>
  <radialGradient id="nRed"><stop offset="0" stop-color="#ff9a8a"/><stop offset="1" stop-color="#b3121a"/></radialGradient>
  <linearGradient id="nBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4" stop-opacity=".55"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></linearGradient>
  <linearGradient id="nSteel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4f5963"/><stop offset=".09" stop-color="#9aa5af"/><stop offset=".3" stop-color="#e9eef2"/><stop offset=".55" stop-color="#bcc6ce"/><stop offset=".85" stop-color="#8f9aa5"/><stop offset="1" stop-color="#434c55"/></linearGradient>
  <linearGradient id="nGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f16"/><stop offset=".5" stop-color="#151d2b"/><stop offset="1" stop-color="#05070b"/></linearGradient>
  <linearGradient id="nCab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#23324a"/><stop offset=".6" stop-color="#101827"/><stop offset="1" stop-color="#070b12"/></linearGradient>
  <linearGradient id="nShine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="nDark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#15181c"/><stop offset=".3" stop-color="#3a4048"/><stop offset=".6" stop-color="#262b31"/><stop offset="1" stop-color="#0e1013"/></linearGradient>
  <linearGradient id="nWheel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2e33"/><stop offset=".5" stop-color="#8b939b"/><stop offset="1" stop-color="#2a2e33"/></linearGradient>
  <linearGradient id="nE235" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7dc3c"/><stop offset="1" stop-color="#6fa512"/></linearGradient>
  <linearGradient id="nBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a86e0"/><stop offset="1" stop-color="#0a4fa3"/></linearGradient>
  <linearGradient id="nShadeX" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".22" stop-color="#000" stop-opacity=".08"/><stop offset=".38" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
  <linearGradient id="nShadeY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
  <radialGradient id="nNose" cx=".42" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".4" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
  <radialGradient id="nIron" cx=".36" cy=".28" r=".85"><stop offset="0" stop-color="#5a6068"/><stop offset=".35" stop-color="#2a2d32"/><stop offset="1" stop-color="#08090b"/></radialGradient>
  <linearGradient id="nIronX" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0a0b0d"/><stop offset=".3" stop-color="#454a52"/><stop offset=".65" stop-color="#1d2024"/><stop offset="1" stop-color="#050506"/></linearGradient>
  <linearGradient id="nGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset="1" stop-color="#c8962a"/></linearGradient>
  <linearGradient id="nSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a1c"/><stop offset=".45" stop-color="#0e1b3d"/><stop offset=".8" stop-color="#27365f"/><stop offset="1" stop-color="#5a4a63"/></linearGradient>
  <linearGradient id="nGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1f2a"/><stop offset="1" stop-color="#07080c"/></linearGradient>
  <linearGradient id="nRail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a8"/><stop offset=".25" stop-color="#aab3bd"/><stop offset="1" stop-color="#3b424b"/></linearGradient>
  <radialGradient id="nLampWarm"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".7"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></radialGradient>
  <radialGradient id="nMoon" cx=".4" cy=".35"><stop offset="0" stop-color="#fffdf0"/><stop offset="1" stop-color="#e9dfae"/></radialGradient>
  <radialGradient id="nPool"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".5"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
</defs></svg>`;

  /* ---------- ぶひん ---------- */
  function eye(x, y, r, side, shape) {
    const lens = shape === 'slit'
      ? `<ellipse rx="${r * 1.55}" ry="${r * 0.72}" fill="#15181c" stroke="#59616b" stroke-width="1"/><ellipse class="lamp" rx="${r * 1.3}" ry="${r * 0.5}" fill="url(#nLamp)"/>`
      : `<circle r="${r + 2.6}" fill="#15181c" stroke="#69717b" stroke-width="1.2"/><circle class="lamp" r="${r}" fill="url(#nLamp)"/>`;
    return `<g class="eye" data-part="light" data-side="${side}" transform="translate(${x} ${y})">
      <circle class="glow" r="${r * 6}" fill="url(#nGlow)"/>${lens}
      <path class="flare" d="M${-r * 4.2} 0H${r * 4.2}M0 ${-r * 2.2}V${r * 2.2}" stroke="#fff8d8" stroke-width="1.1" stroke-linecap="round"/>
      <circle class="hit" r="${Math.max(24, r * 2.6)}" fill="transparent"/></g>`;
  }
  function beams(pts) {
    return '<g class="beams">' + pts.map(function (p) {
      return `<path d="M${p[0] - 5} ${p[1]} L${p[0] - 58} 26 L${p[0] + 58} 26 L${p[0] + 5} ${p[1]}Z" fill="url(#nBeam)"/>`;
    }).join('') + '</g>';
  }
  function bogie(w) {
    return `<rect x="${-w}" y="-34" width="${w * 2}" height="30" fill="#090a0d"/>
      <rect x="${-w + 6}" y="-30" width="12" height="30" rx="2" fill="url(#nWheel)"/>
      <rect x="${w - 18}" y="-30" width="12" height="30" rx="2" fill="url(#nWheel)"/>
      <rect x="${-w + 22}" y="-22" width="${w * 2 - 44}" height="7" fill="#22262c"/>`;
  }
  function coupler(y) {
    return `<g data-part="coupler"><rect x="-15" y="${y}" width="30" height="20" rx="4" fill="url(#nDark)" stroke="#5c646d" stroke-width="1"/>
      <rect x="-9" y="${y + 5}" width="18" height="10" rx="2" fill="#0a0b0d"/><circle cx="0" cy="${y + 10}" r="3" fill="#6b737c"/></g>`;
  }
  function panta() {
    return `<g class="panta" data-part="panta"><g stroke="#515963" stroke-width="3" fill="none" stroke-linejoin="round">
      <path d="M-30 -252 L0 -296 L30 -252"/><path d="M-16 -252 L0 -280 L16 -252" stroke-width="2"/></g>
      <rect x="-42" y="-301" width="84" height="5" rx="2.5" fill="#7c858f"/><circle class="spark" cx="0" cy="-302" r="14" fill="url(#nGlow)"/>
      <rect class="hit" x="-46" y="-306" width="92" height="56" fill="transparent"/></g>`;
  }

  /* ---------- つうきん でんしゃ（やまのてせん E235 / ブルーライン 3000V） ---------- */
  function commuter(kind) {
    const e = kind === 'e235';
    let s = '<g class="tr">';
    if (e) s += panta();
    s += beams(e ? [[-70, -206], [70, -206]] : [[-68, -82], [68, -82]]);
    s += `<path d="M-97 -234 Q-97 -253 -66 -256 H66 Q97 -253 97 -234Z" fill="#4c555f"/>
      <rect x="-46" y="-264" width="92" height="12" rx="3" fill="#69727c"/><rect x="-40" y="-261" width="80" height="2" fill="#8b949d"/>`;
    s += bogie(72);
    s += `<path d="M-92 -52 H92 L84 -24 H-84Z" fill="url(#nDark)"/>`;
    s += `<g data-part="body"><rect x="-99" y="-240" width="198" height="192" rx="17" fill="url(#nSteel)"/>
      <rect x="-99" y="-240" width="198" height="192" rx="17" fill="url(#nShadeY)" opacity=".5"/>
      <g stroke="#fff" stroke-opacity=".13" stroke-width=".6">${[-150, -140, -130, -120, -110, -74, -66, -58].map(function (y) { return `<path d="M-97 ${y}H97"/>`; }).join('')}</g></g>`;
    if (e) {
      /* くろい かお ＋ きみどりの ふち */
      s += `<rect x="-88" y="-230" width="176" height="134" rx="13" fill="url(#nGlass)" stroke="#9fd02a" stroke-width="4.5"/>
        <g data-part="window"><rect x="-76" y="-190" width="152" height="74" rx="7" fill="url(#nCab)"/>
          <path d="M-76 -190 h70 l-44 74 h-26z" fill="url(#nShine)"/>
          <path d="M-30 -116 q30 -20 60 0" fill="#0a0e16"/><rect x="-3" y="-190" width="3" height="74" fill="#04060a"/>
          <g class="wiper" transform="translate(40 -118)"><path d="M0 0 L-34 -56" stroke="#0a0c10" stroke-width="3" stroke-linecap="round"/></g></g>
        <rect x="-52" y="-225" width="104" height="27" rx="3" fill="#020304" stroke="#2c3138" stroke-width="1"/>
        <text class="led" x="0" y="-205" text-anchor="middle" font-size="16" font-weight="700" fill="#ffb21a">やまのて</text>`;
      /* グラデーションの てんてん */
      let dots = '';
      for (let r = 0; r < 4; r += 1) for (let x = -80; x <= 80; x += 8) dots += `<circle cx="${x + (r % 2 ? 4 : 0)}" cy="${-103 - r * 7}" r="${3 - r * 0.65}"/>`;
      s += `<rect x="-99" y="-99" width="198" height="42" fill="url(#nE235)"/><g fill="#9fd02a">${dots}</g>
        <rect x="-99" y="-99" width="198" height="42" fill="url(#nShadeX)" opacity=".55"/>
        <text x="72" y="-66" text-anchor="middle" font-size="9" fill="#27400a" font-weight="700">E235</text>`;
      s += `<circle cx="-52" cy="-206" r="4" fill="url(#nRed)" opacity=".65"/><circle cx="52" cy="-206" r="4" fill="url(#nRed)" opacity=".65"/>`;
      s += eye(-70, -206, 8, 'L') + eye(70, -206, 8, 'R');
    } else {
      s += `<rect x="-88" y="-230" width="176" height="112" rx="12" fill="url(#nGlass)"/>
        <g data-part="window"><rect x="-22" y="-192" width="100" height="66" rx="6" fill="url(#nCab)"/>
          <path d="M-22 -192 h52 l-36 66 h-16z" fill="url(#nShine)"/><path d="M14 -126 q22 -16 44 0" fill="#0a0e16"/>
          <g class="wiper" transform="translate(50 -128)"><path d="M0 0 L-30 -52" stroke="#0a0c10" stroke-width="3" stroke-linecap="round"/></g></g>
        <rect x="-82" y="-224" width="52" height="170" rx="6" fill="none" stroke="#6d7781" stroke-width="1.6"/>
        <rect x="-76" y="-192" width="40" height="66" rx="5" fill="url(#nCab)"/><path d="M-76 -192 h22 l-14 66 h-8z" fill="url(#nShine)"/>
        <rect x="-40" y="-100" width="5" height="16" rx="2" fill="#4a535c"/>
        <rect x="-18" y="-224" width="96" height="25" rx="3" fill="#020304" stroke="#2c3138" stroke-width="1"/>
        <text class="led" x="30" y="-205" text-anchor="middle" font-size="15" font-weight="700" fill="#ffb21a">ブルーライン</text>
        <rect x="-99" y="-118" width="198" height="17" fill="url(#nBlue)"/><rect x="-99" y="-99" width="198" height="5" fill="#7fd0f5"/>
        <rect x="-99" y="-118" width="198" height="24" fill="url(#nShadeX)" opacity=".5"/>
        <rect x="-82" y="-224" width="52" height="170" rx="6" fill="none" stroke="#3e464e" stroke-width="1"/>
        <text x="56" y="-62" text-anchor="middle" font-size="9" fill="#39424b" font-weight="700">3000V</text>`;
      s += `<circle cx="-50" cy="-82" r="4.5" fill="url(#nRed)" opacity=".65"/><circle cx="50" cy="-82" r="4.5" fill="url(#nRed)" opacity=".65"/>`;
      s += eye(-68, -82, 8.5, 'L') + eye(68, -82, 8.5, 'R');
    }
    s += `<rect x="-99" y="-240" width="198" height="192" rx="17" fill="url(#nShadeX)" opacity=".28" pointer-events="none"/>`;
    s += coupler(-56);
    return s + '</g>';
  }

  /* ---------- しんかんせん（はやぶさ E5 / ドクターイエロー 923） ---------- */
  function shinkansen(kind) {
    const h = kind === 'e5';
    const body = 'M-84 -22 C-103 -62 -101 -172 -62 -216 C-36 -241 36 -241 62 -216 C101 -172 103 -62 84 -22Z';
    const cid = 'clip-' + kind + '-' + (clipSeq += 1);
    let s = '<g class="tr">';
    s += beams(h ? [[-55, -172], [55, -172]] : [[-50, -146], [50, -146]]);
    s += `<rect x="-60" y="-26" width="120" height="24" fill="#090a0d"/><rect x="-52" y="-24" width="11" height="24" rx="2" fill="url(#nWheel)"/><rect x="41" y="-24" width="11" height="24" rx="2" fill="url(#nWheel)"/>`;
    s += `<clipPath id="${cid}"><path d="${body}"/></clipPath><g data-part="body" clip-path="url(#${cid})">`;
    if (h) {
      s += `<rect x="-110" y="-250" width="220" height="240" fill="#f4f6f5"/>
        <path d="M-110 -250 H110 V-124 C64 -120 30 -100 0 -66 C-30 -100 -64 -120 -110 -124Z" fill="#00875a"/>
        <path d="M-110 -124 C-64 -120 -30 -100 0 -66 C30 -100 64 -120 110 -124" fill="none" stroke="#e8468e" stroke-width="6"/>
        <path d="M-110 -40 H110 V0 H-110Z" fill="#2b3037"/>`;
    } else {
      s += `<rect x="-110" y="-250" width="220" height="240" fill="#ffd200"/>
        <path d="M-110 -112 C-58 -108 -32 -86 0 -82 C32 -86 58 -108 110 -112" fill="none" stroke="#1352a8" stroke-width="10"/>
        <path d="M-110 -96 C-58 -92 -32 -72 0 -68 C32 -72 58 -92 110 -96" fill="none" stroke="#1352a8" stroke-width="3.5"/>
        <path d="M-110 -38 H110 V0 H-110Z" fill="#1352a8"/>`;
    }
    s += `<rect x="-110" y="-250" width="220" height="250" fill="url(#nShadeX)" opacity=".7"/>
      <rect x="-110" y="-250" width="220" height="250" fill="url(#nShadeY)" opacity=".55"/></g>`;
    /* はな（こっちに のびて くる） */
    if (h) {
      s += `<g data-part="nose"><ellipse cx="0" cy="-58" rx="50" ry="27" fill="#eef1f0"/><ellipse cx="0" cy="-58" rx="50" ry="27" fill="url(#nNose)"/>
        <path d="M-30 -74 C-14 -86 14 -86 30 -74 C14 -64 -14 -64 -30 -74Z" fill="#00875a"/><path d="M-30 -74 C-14 -64 14 -64 30 -74" fill="none" stroke="#e8468e" stroke-width="2.5"/>
        <ellipse cx="-14" cy="-70" rx="12" ry="4" fill="#fff" opacity=".35"/><path d="M0 -44 v10" stroke="#aeb5b3" stroke-width="1.2"/>
        <ellipse cx="0" cy="-32" rx="46" ry="6" fill="#000" opacity=".4"/></g>`;
      s += `<g data-part="window"><path d="M-32 -208 Q0 -220 32 -208 L44 -174 Q0 -164 -44 -174Z" fill="url(#nGlass)" stroke="#0c3d2c" stroke-width="2"/>
        <path d="M-32 -208 Q-14 -214 -2 -214 L-22 -170 Q-36 -172 -44 -174Z" fill="url(#nShine)"/>
        <g class="wiper" transform="translate(0 -170)"><path d="M0 0 L-16 -36" stroke="#05070a" stroke-width="2.6" stroke-linecap="round"/></g></g>`;
      s += `<g transform="rotate(-14 -55 -172)">${eye(-55, -172, 8, 'L', 'slit')}</g><g transform="rotate(14 55 -172)">${eye(55, -172, 8, 'R', 'slit')}</g>`;
    } else {
      s += `<g data-part="nose"><ellipse cx="0" cy="-56" rx="66" ry="25" fill="#ffd200"/><ellipse cx="0" cy="-56" rx="66" ry="25" fill="url(#nNose)"/>
        <path d="M-62 -56 C-30 -50 30 -50 62 -56 C40 -40 -40 -40 -62 -56Z" fill="#1352a8"/>
        <path d="M0 -80 C-4 -68 -4 -58 0 -50 C4 -58 4 -68 0 -80Z" fill="#fff" opacity=".35"/>
        <ellipse cx="0" cy="-30" rx="58" ry="6" fill="#000" opacity=".4"/></g>`;
      s += `<g data-part="window"><path d="M-36 -214 Q0 -226 36 -214 L46 -176 Q0 -168 -46 -176Z" fill="url(#nGlass)" stroke="#7a6400" stroke-width="2"/>
        <path d="M-36 -214 Q-16 -220 -2 -220 L-24 -173 Q-38 -174 -46 -176Z" fill="url(#nShine)"/>
        <g class="wiper" transform="translate(0 -173)"><path d="M0 0 L-17 -38" stroke="#05070a" stroke-width="2.6" stroke-linecap="round"/></g></g>`;
      s += eye(-50, -146, 9, 'L') + eye(50, -146, 9, 'R');
      s += `<text x="0" y="-126" text-anchor="middle" font-size="8" fill="#1352a8" font-weight="700">923</text>`;
    }
    s += `<path d="${body}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2" pointer-events="none"/>`;
    return s + '</g>';
  }
  let clipSeq = 0;

  /* ---------- じょうき きかんしゃ（D51） ---------- */
  function d51() {
    let s = '<g class="tr">';
    s += beams([[0, -236]]);
    s += `<g class="smoke"><circle cx="0" cy="-290" r="13"/><circle cx="8" cy="-296" r="10"/><circle cx="-7" cy="-300" r="11"/></g>`;
    /* うんてんしつの やね・ボイラーの かげ */
    s += `<path d="M-88 -206 Q-88 -232 -60 -236 H60 Q88 -232 88 -206 V-150 H-88Z" fill="#101215"/>`;
    s += `<g data-part="chimney"><rect x="-17" y="-282" width="34" height="56" fill="url(#nIronX)"/><rect x="-21" y="-286" width="42" height="9" rx="3" fill="#33383f"/><rect class="hit" x="-30" y="-320" width="60" height="60" fill="transparent"/></g>`;
    /* しゃりん・シリンダー */
    s += `<rect x="-66" y="-40" width="132" height="38" fill="#070809"/><rect x="-58" y="-36" width="13" height="36" rx="2" fill="url(#nWheel)"/><rect x="45" y="-36" width="13" height="36" rx="2" fill="url(#nWheel)"/>`;
    s += [-1, 1].map(function (d) {
      return `<g data-part="cyl"><rect x="${d < 0 ? -108 : 66}" y="-84" width="42" height="46" rx="8" fill="url(#nIronX)"/><circle cx="${d * 87}" cy="-61" r="17" fill="url(#nIron)" stroke="#565c64" stroke-width="1.5"/><circle cx="${d * 87}" cy="-61" r="4" fill="#7b838c"/></g>`;
    }).join('');
    /* デフ（けむりよけの いた） */
    s += `<path d="M-116 -226 H-90 V-92 H-112Z" fill="url(#nIronX)" stroke="#3d4249" stroke-width="1"/><path d="M116 -226 H90 V-92 H112Z" fill="url(#nIronX)" stroke="#3d4249" stroke-width="1"/>`;
    /* まるい かお（えんしつの とびら） */
    s += `<g data-part="door"><circle cx="0" cy="-146" r="76" fill="#0a0b0d"/><circle cx="0" cy="-146" r="73" fill="url(#nIron)"/>
      <circle cx="0" cy="-146" r="60" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="3"/><circle cx="0" cy="-146" r="58" fill="none" stroke="#6a7079" stroke-opacity=".5" stroke-width="1"/>
      <g fill="#4d535b">${Array.from({ length: 20 }, function (_, i) { const a = i * Math.PI / 10; return `<circle cx="${(Math.cos(a) * 66.5).toFixed(1)}" cy="${(-146 + Math.sin(a) * 66.5).toFixed(1)}" r="1.6"/>`; }).join('')}</g>
      <rect x="-64" y="-170" width="52" height="5" rx="2" fill="#3a3f46"/><rect x="-64" y="-126" width="52" height="5" rx="2" fill="#3a3f46"/>
      <circle cx="0" cy="-146" r="9" fill="#2a2e33" stroke="#7b838c" stroke-width="1.5"/><path d="M-15 -146H15M0 -161V-131" stroke="#7b838c" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M-58 -180 A66 66 0 0 1 -14 -210" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="5" stroke-linecap="round"/></g>`;
    s += `<g data-part="plate"><rect x="-37" y="-203" width="74" height="21" rx="3" fill="#7d1418" stroke="url(#nGold)" stroke-width="1.6"/>
      <text x="0" y="-187" text-anchor="middle" font-size="15" font-weight="800" fill="url(#nGold)" letter-spacing="1">D51 498</text></g>`;
    /* まえの はり・れんけつき */
    s += `<rect x="-106" y="-52" width="212" height="20" rx="2" fill="#5f1013"/><rect x="-106" y="-52" width="212" height="3" fill="#d9dde0" opacity=".7"/>
      <rect x="-106" y="-52" width="212" height="20" fill="url(#nShadeX)" opacity=".6"/><rect x="-96" y="-92" width="192" height="8" fill="#1c1f23"/>`;
    s += coupler(-50);
    s += `<g class="steam"><circle cx="-112" cy="-40" r="12"/><circle cx="112" cy="-40" r="12"/><circle cx="-124" cy="-50" r="9"/><circle cx="124" cy="-50" r="9"/></g>`;
    /* ライトは 1つ（ふくとうは ちいさい） */
    s += `<rect x="-13" y="-252" width="26" height="8" rx="3" fill="#2c3036"/><circle cx="-34" cy="-226" r="5.5" fill="#15181c" stroke="#69717b"/><circle cx="-34" cy="-226" r="3.4" fill="#ffe9a8" opacity=".7"/>`;
    s += eye(0, -236, 10.5, 'C');
    return s + '</g>';
  }

  function train(id) {
    if (id === 'yamanote') return commuter('e235');
    if (id === 'blue') return commuter('blue');
    if (id === 'hayabusa') return shinkansen('e5');
    if (id === 'doctor') return shinkansen('dy');
    return d51();
  }

  /* えらぶ がめんの カードよう */
  function card(id) {
    return `<svg viewBox="-130 -318 260 330" aria-hidden="true"><ellipse cx="0" cy="2" rx="118" ry="10" fill="url(#nPool)"/>
      <path d="M-34 0 L-40 12 M34 0 L40 12" stroke="url(#nRail)" stroke-width="5"/>${train(id)}</svg>`;
  }

  /* ---------- よるの しゃこ ---------- */
  function rnd(seed) { let s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function scene() {
    const r = rnd(7);
    let stars = '';
    for (let i = 0; i < 70; i += 1) {
      const big = r() > 0.86;
      stars += `<circle class="st${i % 5 === 0 ? ' tw' : ''}" cx="${(r() * 400).toFixed(1)}" cy="${(r() * 190).toFixed(1)}" r="${big ? 1.4 : 0.5 + r() * 0.6}" style="animation-delay:${(r() * 4).toFixed(1)}s"/>`;
    }
    let city = '';
    let x = -6;
    while (x < 400) {
      const w = 14 + r() * 24; const hh = 12 + r() * 46;
      city += `<rect x="${x.toFixed(0)}" y="${(246 - hh).toFixed(0)}" width="${w.toFixed(0)}" height="${hh.toFixed(0)}" fill="#0a1124"/>`;
      for (let k = 0; k < hh / 9; k += 1) if (r() > 0.55) city += `<rect x="${(x + 3 + r() * (w - 7)).toFixed(0)}" y="${(246 - hh + 4 + k * 8).toFixed(0)}" width="2" height="2.4" fill="#ffd98a" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
      x += w + 1;
    }
    /* となりの せんろで ねむる でんしゃ（シルエット） */
    function sleeper(cx, col) {
      return `<g transform="translate(${cx} 372) scale(.62)" opacity=".9"><rect x="-80" y="-200" width="160" height="186" rx="14" fill="#0d1322"/>
        <rect x="-66" y="-184" width="132" height="70" rx="6" fill="#131d33"/><rect x="-80" y="-100" width="160" height="10" fill="${col}" opacity=".5"/>
        <circle cx="-54" cy="-66" r="5" fill="#44130f"/><circle cx="54" cy="-66" r="5" fill="#44130f"/><rect x="-60" y="-16" width="120" height="16" fill="#05060a"/></g>`;
    }
    let sleepers = '';
    for (let i = 0; i < 9; i += 1) {
      const y = 392 + i * i * 0.9 + i * 3; const hw = 46 + (y - 384) * 0.62;
      sleepers += `<rect x="${(200 - hw).toFixed(1)}" y="${y.toFixed(1)}" width="${(hw * 2).toFixed(1)}" height="${(3 + i * 0.5).toFixed(1)}" fill="#2a2420"/>`;
    }
    return `<svg id="scene" viewBox="0 0 400 460" preserveAspectRatio="xMidYMax slice" role="img" aria-label="よるの しゃこ">
  <rect width="400" height="460" fill="url(#nSky)"/>
  <g class="stars" fill="#fff">${stars}</g>
  <g id="mystars"></g>
  <g id="moon" transform="translate(326 62)"><circle r="42" fill="url(#nLampWarm)" opacity=".45"/><circle r="19" fill="url(#nMoon)"/><circle cx="-6" cy="-4" r="3.4" fill="#d8cd98" opacity=".6"/><circle cx="6" cy="6" r="2.4" fill="#d8cd98" opacity=".6"/><circle id="moonshade" cx="0" cy="0" r="19.6" fill="#0a1330" opacity="0"/></g>
  <g id="shoot"><path d="M0 0 L46 -14" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle r="2.6" fill="#fff"/></g>
  <g id="rainbow" fill="none" stroke-width="5" opacity="0"><path d="M60 250 A140 140 0 0 1 340 250" stroke="#ff5a5a"/><path d="M65 250 A135 135 0 0 1 335 250" stroke="#ffb13b"/><path d="M70 250 A130 130 0 0 1 330 250" stroke="#ffe44d"/><path d="M75 250 A125 125 0 0 1 325 250" stroke="#58d36b"/><path d="M80 250 A120 120 0 0 1 320 250" stroke="#4aa3ff"/><path d="M85 250 A115 115 0 0 1 315 250" stroke="#8a6bff"/></g>
  ${city}
  <rect y="244" width="400" height="216" fill="url(#nGround)"/>
  <!-- かせんちゅう -->
  <g stroke="#1a2236" fill="none"><path d="M34 380V92M366 380V92" stroke-width="6"/><path d="M26 100H374M26 112H374" stroke-width="3"/>
    <path d="M34 112L60 100M366 112L340 100M90 100l14 12l14-12M282 100l14 12l14-12" stroke-width="1.6"/></g>
  <path d="M0 132 Q200 150 400 132" stroke="#2b3654" stroke-width="1.2" fill="none"/><path d="M200 112V143" stroke="#2b3654" stroke-width="1.2"/>
  <!-- しゃこの あかり -->
  <g><circle cx="34" cy="150" r="64" fill="url(#nLampWarm)"/><rect x="28" y="144" width="16" height="6" rx="2" fill="#ffe6b0"/>
     <circle cx="366" cy="150" r="64" fill="url(#nLampWarm)"/><rect x="356" y="144" width="16" height="6" rx="2" fill="#ffe6b0"/></g>
  ${sleeper(76, '#d6452e')}${sleeper(324, '#3b7fd6')}
  <!-- しんごうき -->
  <g id="signal" transform="translate(292 300)"><rect x="-2.5" y="20" width="5" height="64" fill="#11151f"/><rect x="-10" y="-34" width="20" height="56" rx="9" fill="#070a10" stroke="#2a3246" stroke-width="1.5"/>
    <circle class="sg sg-ao" cx="0" cy="-22" r="5.5"/><circle class="sg sg-ki" cx="0" cy="-6" r="5.5"/><circle class="sg sg-aka" cx="0" cy="10" r="5.5"/></g>
  <!-- レール -->
  ${sleepers}
  <path d="M167 384 L128 460" stroke="url(#nRail)" stroke-width="6" fill="none"/><path d="M233 384 L272 460" stroke="url(#nRail)" stroke-width="6" fill="none"/>
  <g id="third" opacity="0"><path d="M262 384 L318 460" stroke="#d8b41c" stroke-width="7"/><path d="M262 384 L318 460" stroke="#3b3320" stroke-width="2"/></g>
  <ellipse id="pool" cx="200" cy="408" rx="150" ry="34" fill="url(#nPool)"/>
  <g id="trainbox" transform="translate(200 386)"><g id="train"></g></g>
  <g id="weather"></g>
  <rect id="flash" width="400" height="460" fill="#fff" opacity="0" pointer-events="none"/>
</svg>`;
  }

  /* ---------- ライトで うつす え（もんだいの ず） ---------- */
  const SHAPES = {
    maru: '<circle cx="50" cy="50" r="38"/>',
    sankaku: '<path d="M50 10 L92 86 H8Z"/>',
    shikaku: '<rect x="14" y="14" width="72" height="72"/>',
    nagashikaku: '<rect x="4" y="26" width="92" height="48"/>',
    hoshi: '<path d="M50 6 L61 37 L94 38 L68 58 L78 90 L50 71 L22 90 L32 58 L6 38 L39 37Z"/>',
    daen: '<ellipse cx="50" cy="50" rx="46" ry="28"/>',
    rokkaku: '<path d="M27 10 H73 L96 50 L73 90 H27 L4 50Z"/>',
    hishi: '<path d="M50 6 L92 50 L50 94 L8 50Z"/>',
    batsu: '<path d="M14 26 L26 14 L50 38 L74 14 L86 26 L62 50 L86 74 L74 86 L50 62 L26 86 L14 74 L38 50Z"/>',
    sakasa: '<path d="M8 14 H92 L50 90Z"/>',
  };
  const SHAPE_COL = { maru: '#ff6b6b', sankaku: '#ffd43b', shikaku: '#4dabf7', nagashikaku: '#63e6be', hoshi: '#ffe066', daen: '#da77f2', rokkaku: '#ffa94d', hishi: '#74c0fc', batsu: '#ffd43b', sakasa: '#ff6b6b' };
  function shape(k, size) {
    return `<svg class="shp" viewBox="0 0 100 100" width="${size || 74}" height="${size || 74}"><g fill="${SHAPE_COL[k]}" stroke="#fff" stroke-width="3" stroke-linejoin="round">${SHAPES[k]}</g></svg>`;
  }
  function car(col, head, gone) {
    return `<svg class="car${gone ? ' gone' : ''}" viewBox="0 0 60 40" width="46" height="31"><rect x="2" y="6" width="56" height="24" rx="${head ? 9 : 4}" fill="#d5dbe1"/><rect x="2" y="19" width="56" height="5" fill="${col}"/>
      <rect x="8" y="10" width="9" height="8" rx="1.5" fill="#1b2740"/><rect x="21" y="10" width="9" height="8" rx="1.5" fill="#1b2740"/><rect x="34" y="10" width="9" height="8" rx="1.5" fill="#1b2740"/><rect x="46" y="10" width="7" height="8" rx="1.5" fill="#1b2740"/>
      <circle cx="14" cy="33" r="4" fill="#333"/><circle cx="46" cy="33" r="4" fill="#333"/></svg>`;
  }
  function moon(phase) {
    const d = { full: 0, half: 20, crescent: 32, new: 0 }[phase];
    return `<svg viewBox="0 0 100 100" width="92" height="92"><defs><mask id="mm-${phase}"><rect width="100" height="100" fill="#000"/><circle cx="50" cy="50" r="40" fill="#fff"/>${phase === 'half' ? '<rect x="0" y="0" width="50" height="100" fill="#000"/>' : d ? `<circle cx="${50 - d}" cy="46" r="40" fill="#000"/>` : ''}</mask></defs>
      <circle cx="50" cy="50" r="40" fill="#1c2748"/>${phase === 'new' ? '' : `<circle cx="50" cy="50" r="40" fill="url(#nMoon)" mask="url(#mm-${phase})"/>`}</svg>`;
  }
  function clock(h) {
    let n = '';
    for (let i = 1; i <= 12; i += 1) { const a = i * Math.PI / 6; n += `<text x="${(50 + Math.sin(a) * 36).toFixed(1)}" y="${(54 - Math.cos(a) * 36).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#17202e">${i}</text>`; }
    const a = h * Math.PI / 6;
    return `<svg viewBox="0 0 100 100" width="104" height="104"><circle cx="50" cy="50" r="47" fill="#fdfdf6" stroke="#2f6fd6" stroke-width="5"/>${n}
      <path d="M50 50 L50 16" stroke="#17202e" stroke-width="3" stroke-linecap="round"/><path d="M50 50 L${(50 + Math.sin(a) * 23).toFixed(1)} ${(50 - Math.cos(a) * 23).toFixed(1)}" stroke="#e03131" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#17202e"/></svg>`;
  }

  return { DEFS: DEFS, train: train, card: card, scene: scene, shape: shape, car: car, moon: moon, clock: clock };
})();
