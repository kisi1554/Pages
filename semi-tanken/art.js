'use strict';

/*
 * えの パーツ(ぜんぶ SVG を 文字列で つくる。画像ファイルは つかわない)
 *  - cicada()  : セミの せいちゅう(うえから みた かたち)
 *  - larva()   : ようちゅう
 *  - shell()   : ぬけがら
 *  - eggBranch(): えだと たまご
 *  - guide()   : あんない役の「せみのすけ」(くちが うごく)
 */

const Art = (function () {
  /* ------------------------------ セミ ------------------------------ */

  function wing(cx, cy, rx, ry, deg, sp, opacity) {
    const a = sp.art;
    const fill = a.wing === 'brown' ? a.wingColor : a.wingColor;
    const op = a.wing === 'brown' ? 1 : opacity;
    return (
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" fill-opacity="${op}"` +
      ` stroke="${a.body}" stroke-opacity=".5" stroke-width="1.6"` +
      ` transform="rotate(${deg} ${cx} ${cy})"/>`
    );
  }

  function mottle(sp) {
    if (sp.art.wing !== 'mottled') return '';
    const dots = [
      [62, 108, 9], [78, 138, 7], [58, 158, 8], [74, 176, 6],
      [138, 108, 9], [122, 138, 7], [142, 158, 8], [126, 176, 6],
    ];
    return dots
      .map((d) => `<ellipse cx="${d[0]}" cy="${d[1]}" rx="${d[2]}" ry="${d[2] * 1.4}" fill="${sp.art.body}" fill-opacity=".45"/>`)
      .join('');
  }

  /*
   * opt.size  : ピクセル(はば)
   * opt.face  : 'smile'(きほん) / 'wow' / 'sleep'
   * opt.silhouette : true なら まっくろの かげ(セミとりで つかう)
   * opt.wingSpread : 0〜1 (うかの とちゅうで はねが ちいさい)
   */
  function cicada(sp, opt) {
    const o = opt || {};
    const size = o.size || 160;
    const a = sp.art;
    const spread = o.wingSpread === undefined ? 1 : o.wingSpread;
    const wingOp = 0.62;
    const body = o.silhouette ? '#1a1a1a' : a.body;
    const back = o.silhouette ? '#242424' : a.back;
    const eye = o.silhouette ? '#1a1a1a' : a.eye;

    const wings = o.silhouette
      ? ''
      : `<g class="wings-g" transform="translate(100 84) scale(${spread}) translate(-100 -84)" opacity="${spread < 0.99 ? 0.8 : 1}">` +
        wing(72, 132, 24, 66, -12, sp, wingOp) +
        wing(128, 132, 24, 66, 12, sp, wingOp) +
        wing(80, 118, 17, 42, -22, sp, wingOp * 0.9) +
        wing(120, 118, 17, 42, 22, sp, wingOp * 0.9) +
        mottle(sp) +
        '</g>';

    const eyes =
      o.face === 'sleep'
        ? `<path d="M64 40 q10 8 20 0" stroke="${eye}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
          `<path d="M116 40 q10 8 20 0" stroke="${eye}" stroke-width="4" fill="none" stroke-linecap="round"/>`
        : `<circle cx="74" cy="40" r="${o.face === 'wow' ? 13 : 11}" fill="${eye}"/>` +
          `<circle cx="126" cy="40" r="${o.face === 'wow' ? 13 : 11}" fill="${eye}"/>` +
          `<circle cx="70" cy="36" r="4" fill="#fff" fill-opacity=".9"/>` +
          `<circle cx="122" cy="36" r="4" fill="#fff" fill-opacity=".9"/>`;

    const mouth =
      o.face === 'wow'
        ? `<ellipse cx="100" cy="56" rx="7" ry="8" fill="#8d3a3a"/>`
        : `<path d="M92 54 q8 7 16 0" stroke="#8d3a3a" stroke-width="3" fill="none" stroke-linecap="round"/>`;

    return `
<svg class="art art-cicada" viewBox="0 0 200 215" width="${size}" height="${Math.round(size * 1.075)}" role="img" aria-label="${sp.name}">
  ${wings}
  <!-- おなか -->
  <path d="M74 96 Q100 210 126 96 Z" fill="${body}"/>
  <path d="M78 118 h44 M80 134 h40 M83 150 h34 M87 166 h26" stroke="${back}" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>
  <!-- むね -->
  <ellipse cx="100" cy="78" rx="33" ry="28" fill="${back}"/>
  <path d="M78 70 q22 -14 44 0" stroke="${o.silhouette ? '#242424' : a.mark}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/>
  <!-- あし -->
  <g stroke="${body}" stroke-width="5" stroke-linecap="round" fill="none">
    <path d="M70 70 l-22 -8 l-12 10"/>
    <path d="M130 70 l22 -8 l12 10"/>
    <path d="M70 84 l-26 6 l-10 14"/>
    <path d="M130 84 l26 6 l10 14"/>
    <path d="M74 96 l-20 16 l-4 16"/>
    <path d="M126 96 l20 16 l4 16"/>
  </g>
  <!-- あたま -->
  <ellipse cx="100" cy="44" rx="31" ry="23" fill="${body}"/>
  ${eyes}
  ${mouth}
  <path d="M92 22 l-10 -14 M108 22 l10 -14" stroke="${body}" stroke-width="4" stroke-linecap="round"/>
</svg>`;
  }

  /* ---------------------------- ようちゅう ---------------------------- */

  function larva(opt) {
    const o = opt || {};
    const size = o.size || 140;
    const body = '#a9743c';
    const dark = '#7d5227';
    return `
<svg class="art art-larva" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="セミの ようちゅう">
  <path d="M66 92 Q100 190 134 92 Z" fill="${body}"/>
  <path d="M72 118 h56 M76 138 h48 M82 158 h36" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="100" cy="80" rx="34" ry="28" fill="${dark}"/>
  <ellipse cx="100" cy="46" rx="28" ry="22" fill="${body}"/>
  <circle cx="80" cy="42" r="7" fill="#4a3120"/>
  <circle cx="120" cy="42" r="7" fill="#4a3120"/>
  <path d="M93 58 q7 6 14 0" stroke="#6b4326" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- つちを ほる まえあし(ふとい) -->
  <g fill="${dark}" stroke="${dark}" stroke-width="4" stroke-linecap="round">
    <path d="M70 66 L34 48 L20 60" fill="none"/>
    <path d="M130 66 L166 48 L180 60" fill="none"/>
    <ellipse cx="30" cy="52" rx="13" ry="9" transform="rotate(-24 30 52)"/>
    <ellipse cx="170" cy="52" rx="13" ry="9" transform="rotate(24 170 52)"/>
  </g>
  <g stroke="${dark}" stroke-width="4" stroke-linecap="round" fill="none">
    <path d="M70 88 l-24 10 l-8 14"/>
    <path d="M130 88 l24 10 l8 14"/>
  </g>
</svg>`;
  }

  /* ---------------------------- ぬけがら ---------------------------- */

  function shell(opt) {
    const o = opt || {};
    const size = o.size || 140;
    const c = '#c99a5e';
    const d = '#a87c44';
    const split = o.split
      ? `<path d="M100 62 L100 108" stroke="#5c3d1c" stroke-width="7" stroke-linecap="round"/>
         <path d="M84 66 q16 -10 32 0" stroke="#5c3d1c" stroke-width="5" fill="none"/>`
      : '';
    return `
<svg class="art art-shell" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="ぬけがら">
  <path d="M68 92 Q100 186 132 92 Z" fill="${c}" fill-opacity=".92"/>
  <path d="M74 116 h52 M78 136 h44 M84 156 h32" stroke="${d}" stroke-width="3.6" stroke-linecap="round"/>
  <ellipse cx="100" cy="80" rx="33" ry="27" fill="${c}"/>
  <ellipse cx="100" cy="46" rx="27" ry="21" fill="${c}"/>
  <circle cx="81" cy="42" r="7" fill="#8a6a3c" fill-opacity=".8"/>
  <circle cx="119" cy="42" r="7" fill="#8a6a3c" fill-opacity=".8"/>
  <g stroke="${d}" stroke-width="4.5" stroke-linecap="round" fill="none">
    <path d="M70 64 l-26 -12 l-12 12"/>
    <path d="M130 64 l26 -12 l12 12"/>
    <path d="M70 88 l-24 10 l-8 16"/>
    <path d="M130 88 l24 10 l8 16"/>
  </g>
  ${split}
</svg>`;
  }

  /* --------------------------- えだと たまご --------------------------- */

  function eggBranch(opt) {
    const o = opt || {};
    const size = o.size || 240;
    const eggs = [];
    for (let i = 0; i < 6; i++) {
      const x = 46 + i * 22;
      eggs.push(
        `<ellipse class="egg-dot" cx="${x}" cy="106" rx="7" ry="4.4" fill="#fdf6e3" stroke="#d9c18c" stroke-width="1.4" style="--i:${i}"/>`
      );
    }
    return `
<svg class="art art-egg" viewBox="0 0 200 160" width="${size}" height="${Math.round(size * 0.8)}" role="img" aria-label="きの えだの なかの たまご">
  <path d="M8 118 q40 -22 92 -16 q54 6 92 -14" stroke="#6b4a2c" stroke-width="26" fill="none" stroke-linecap="round"/>
  <path d="M8 118 q40 -22 92 -16 q54 6 92 -14" stroke="#8a6238" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M34 100 q60 -12 120 -18" stroke="#5c3f24" stroke-width="3" fill="none" opacity=".6"/>
  <path d="M150 96 l24 -34 M162 88 l30 -12" stroke="#4f7a35" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="176" cy="56" rx="17" ry="11" fill="#5b9142" transform="rotate(-28 176 56)"/>
  <ellipse cx="192" cy="76" rx="15" ry="10" fill="#6ba64d" transform="rotate(-8 192 76)"/>
  ${eggs.join('')}
</svg>`;
  }

  /* ------------------------- あんない「せみのすけ」 ------------------------- */
  /* くちが うごく(class="talking" を つけると パクパク する) */

  function guide(face) {
    const f = face || 'smile';
    const eyes =
      f === 'wow'
        ? '<circle cx="36" cy="44" r="13" fill="#2a1c10"/><circle cx="84" cy="44" r="13" fill="#2a1c10"/>' +
          '<circle cx="32" cy="40" r="5" fill="#fff"/><circle cx="80" cy="40" r="5" fill="#fff"/>'
        : f === 'think'
        ? '<path d="M26 46 q10 -8 20 0" stroke="#2a1c10" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<path d="M74 46 q10 -8 20 0" stroke="#2a1c10" stroke-width="5" fill="none" stroke-linecap="round"/>'
        : '<circle cx="36" cy="44" r="11" fill="#2a1c10"/><circle cx="84" cy="44" r="11" fill="#2a1c10"/>' +
          '<circle cx="32" cy="40" r="4" fill="#fff"/><circle cx="80" cy="40" r="4" fill="#fff"/>';

    return `
<svg class="guide-svg" viewBox="0 0 120 130" role="img" aria-label="あんない役の せみのすけ">
  <ellipse cx="34" cy="96" rx="19" ry="40" fill="#a9702f" fill-opacity=".75" transform="rotate(-14 34 96)"/>
  <ellipse cx="86" cy="96" rx="19" ry="40" fill="#a9702f" fill-opacity=".75" transform="rotate(14 86 96)"/>
  <path d="M42 74 Q60 132 78 74 Z" fill="#3c2a1a"/>
  <path d="M45 90 h30 M47 102 h26 M50 114 h20" stroke="#5a3d21" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="60" cy="66" rx="24" ry="19" fill="#5a3d21"/>
  <path d="M44 60 q16 -10 32 0" stroke="#c8913f" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse cx="60" cy="42" rx="26" ry="20" fill="#3c2a1a"/>
  ${eyes}
  <ellipse class="guide-mouth" cx="60" cy="58" rx="7" ry="3.4" fill="#8d3a3a"/>
  <path d="M50 24 l-8 -14 M70 24 l8 -14" stroke="#3c2a1a" stroke-width="4" stroke-linecap="round"/>
</svg>`;
  }

  /* ------------------------------- き ------------------------------- */

  function tree(x, w, h) {
    return `
<g class="tree">
  <path d="M${x - w / 2} ${h} h${w} v-${h * 0.62} h-${w} Z" fill="#6b4a2c"/>
  <path d="M${x - w / 2 + 3} ${h} v-${h * 0.6} M${x + w / 2 - 4} ${h} v-${h * 0.58}" stroke="#54381f" stroke-width="3"/>
  <ellipse cx="${x}" cy="${h * 0.34}" rx="${w * 2.1}" ry="${h * 0.24}" fill="#4f8a3a"/>
  <ellipse cx="${x - w * 1.1}" cy="${h * 0.42}" rx="${w * 1.3}" ry="${h * 0.18}" fill="#5f9c44"/>
  <ellipse cx="${x + w * 1.1}" cy="${h * 0.42}" rx="${w * 1.3}" ry="${h * 0.18}" fill="#5f9c44"/>
</g>`;
  }

  return { cicada, larva, shell, eggBranch, guide, tree };
})();
