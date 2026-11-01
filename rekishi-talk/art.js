'use strict';

/*
 * にがおえ（オリジナルの イラスト。しゃしんや ほんものの にがおえ は つかわない）
 *   Art.face(look, opts) → SVG の もじれつ（viewBox 0 0 200 220）
 *   look: { skin, hair, hairColor, beard, beardColor, cloth, clothColor, hat, item, bow, round }
 *   しゃべる ときは .mouth-open が みえる（style.css の .talking）。まばたき は .eyes
 */
const Art = (() => {
  const LINE = '#4a3426';

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    const r = f(n >> 16);
    const g = f((n >> 8) & 255);
    const b = f(n & 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // うしろの かみ（かおより さき に かく）
  function hairBack(l) {
    const c = l.hairColor;
    switch (l.hair) {
      case 'himiko':
        return `<path d="M44 100 Q40 190 60 214 L140 214 Q160 190 156 100 Z" fill="${c}"/>`;
      case 'heian':
        return `<path d="M42 96 Q30 170 26 220 L174 220 Q170 170 158 96 Z" fill="${c}"/>`;
      case 'longwhite':
        return `<path d="M46 104 Q40 170 56 204 L144 204 Q160 170 154 104 Z" fill="${c}"/>`;
      case 'bun':
        return `<circle cx="100" cy="58" r="20" fill="${c}"/>`;
      case 'wild':
        return [[50, 70, 22], [150, 70, 22], [40, 104, 20], [160, 104, 20], [100, 52, 26], [70, 54, 22], [130, 54, 22], [44, 130, 14], [156, 130, 14]]
          .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${shade(c, 0.85)}" stroke-width="2"/>`).join('');
      default:
        return '';
    }
  }

  // まえの かみ・ぼうし
  function hairFront(l) {
    const c = l.hairColor;
    switch (l.hair) {
      case 'himiko':
        return `<path d="M50 104 Q52 52 100 50 Q148 52 150 104 Q130 74 100 72 Q70 74 50 104 Z" fill="${c}"/>
          <ellipse cx="100" cy="42" rx="22" ry="14" fill="${c}"/><rect x="80" y="44" width="40" height="5" rx="2" fill="#c92a2a"/>`;
      case 'kanmuri':
        return `<path d="M52 100 Q54 66 100 64 Q146 66 148 100 Q128 84 100 84 Q72 84 52 100 Z" fill="${c}"/>
          <path d="M64 70 Q66 36 100 34 Q134 36 136 70 Z" fill="#1d1d1f"/><rect x="88" y="6" width="24" height="34" rx="8" fill="#1d1d1f"/>`;
      case 'heian':
        return `<path d="M48 110 Q46 52 100 48 Q154 52 152 110 Q140 76 104 70 L100 80 L96 70 Q60 76 48 110 Z" fill="${c}"/>`;
      case 'chonmage': {
        const pate = shade(l.skin, 0.92);
        return `<path d="M52 104 Q50 60 100 56 Q150 60 148 104 Q146 84 138 76 L62 76 Q54 84 52 104 Z" fill="${c}"/>
          <path d="M64 78 Q70 56 100 54 Q130 56 136 78 Q120 70 100 70 Q80 70 64 78 Z" fill="${pate}"/>
          <rect x="90" y="40" width="20" height="10" rx="4" fill="${c}"/><rect x="96" y="44" width="8" height="22" rx="3" fill="${c}"/>`;
      }
      case 'ryoma':
        return `<path d="M50 106 Q44 54 100 50 Q156 54 150 106 L144 84 L134 96 L126 76 L112 90 L100 72 L88 90 L74 76 L66 96 L56 84 Z" fill="${c}"/>
          <path d="M138 66 Q170 60 166 92 Q156 74 142 76 Z" fill="${c}"/>`;
      case 'parted':
        return `<path d="M50 102 Q48 56 100 54 Q152 56 150 102 Q146 80 136 74 Q110 84 82 70 Q60 76 50 102 Z" fill="${c}"/>`;
      case 'longwhite':
        return `<path d="M50 104 Q50 60 100 58 Q150 60 150 104 Q140 82 100 80 Q60 82 50 104 Z" fill="${c}"/>`;
      case 'bun':
        return `<path d="M50 106 Q48 58 100 56 Q152 58 150 106 Q136 76 102 74 L100 82 L98 74 Q64 76 50 106 Z" fill="${c}"/>`;
      case 'shortgray':
        return `<path d="M50 98 Q48 58 100 56 Q152 58 150 98 Q142 76 100 74 Q58 76 50 98 Z" fill="${c}"/>`;
      case 'wild':
        return `<path d="M52 84 Q62 62 82 66 Q72 70 66 84 Z M148 84 Q138 62 118 66 Q128 70 134 84 Z" fill="${c}"/>`;
      default:
        return '';
    }
  }

  function hat(l) {
    if (l.hat === 'beret') return `<ellipse cx="100" cy="58" rx="56" ry="18" fill="#3b2f2f"/><circle cx="100" cy="42" r="6" fill="#3b2f2f"/>`;
    if (l.hat === 'nurse') return `<path d="M60 70 Q100 40 140 70 L136 80 Q100 66 64 80 Z" fill="#ffffff" stroke="#ced4da" stroke-width="3"/>`;
    return '';
  }

  function beard(l) {
    const c = l.beardColor || l.hairColor;
    switch (l.beard) {
      case 'thin':
        return `<path d="M82 146 Q92 140 100 144 Q108 140 118 146" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
          <path d="M98 170 Q100 180 102 170" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
      case 'mustache':
        return `<path d="M76 148 Q90 136 100 144 Q110 136 124 148 Q110 152 100 148 Q90 152 76 148 Z" fill="${c}"/>`;
      case 'long':
        return `<path d="M60 128 Q64 196 100 208 Q136 196 140 128 Q124 152 100 150 Q76 152 60 128 Z" fill="${c}" stroke="${shade(c, 0.8)}" stroke-width="2"/>
          <path d="M80 146 Q100 136 120 146" fill="none" stroke="${shade(c, 0.8)}" stroke-width="4"/>`;
      default:
        return '';
    }
  }

  function body(l) {
    const c = l.clothColor;
    const d = shade(c, 0.75);
    switch (l.cloth) {
      case 'kimono':
        return `<path d="M30 220 Q34 172 100 164 Q166 172 170 220 Z" fill="${c}" stroke="${d}" stroke-width="3"/>
          <path d="M100 166 L80 220 M100 166 L120 220" stroke="#f1ece0" stroke-width="8"/>`;
      case 'robe':
        return `<path d="M28 220 Q32 170 100 162 Q168 170 172 220 Z" fill="${c}" stroke="${d}" stroke-width="3"/>
          <path d="M76 168 Q100 186 124 168" fill="none" stroke="#f1ece0" stroke-width="7"/>`;
      case 'juni':
        return ['#9c36b5', '#e64980', '#f59f00', '#2b8a3e'].map((col, i) =>
          `<path d="M${22 + i * 6} 220 Q${30 + i * 4} 172 100 ${162 + i * 4} Q${170 - i * 4} 172 ${178 - i * 6} 220 Z" fill="${col}"/>`).join('');
      case 'tunic':
        return `<path d="M30 220 Q34 172 100 166 Q166 172 170 220 Z" fill="${c}" stroke="${d}" stroke-width="3"/>
          ${l.hair === 'himiko' ? '<path d="M70 172 Q100 196 130 172" fill="none" stroke="#2f9e44" stroke-width="4"/><circle cx="100" cy="188" r="6" fill="#2f9e44"/>' : ''}`;
      case 'suit':
        return `<path d="M30 220 Q34 172 100 164 Q166 172 170 220 Z" fill="${c}" stroke="${d}" stroke-width="3"/>
          <path d="M84 166 L100 200 L116 166 Z" fill="#ffffff"/>
          ${l.bow ? '<path d="M88 172 L100 178 L112 172 L112 184 L100 178 L88 184 Z" fill="#212529"/>' : '<path d="M100 172 L94 196 L100 204 L106 196 Z" fill="#1c3a6e"/>'}`;
      case 'dress':
        return `<path d="M30 220 Q34 172 100 164 Q166 172 170 220 Z" fill="${c}" stroke="${d}" stroke-width="3"/>
          <path d="M78 166 Q100 182 122 166 L118 176 Q100 188 82 176 Z" fill="#ffffff"/>`;
      case 'sweater':
        return `<path d="M30 220 Q34 172 100 164 Q166 172 170 220 Z" fill="${c}" stroke="${d}" stroke-width="3"/>
          <path d="M82 166 Q100 178 118 166" fill="none" stroke="${d}" stroke-width="6"/>`;
      default:
        return '';
    }
  }

  function face(l, opts) {
    const o = opts || {};
    const skin = l.skin;
    const rx = l.round ? 54 : 48;
    const label = o.label ? ` role="img" aria-label="${o.label}"` : ' aria-hidden="true"';
    return `<svg class="face" viewBox="0 0 200 220"${label}>
  ${hairBack(l)}
  ${body(l)}
  <rect x="86" y="146" width="28" height="24" fill="${shade(skin, 0.93)}"/>
  <ellipse cx="${100 - rx}" cy="116" rx="8" ry="11" fill="${skin}" stroke="${LINE}" stroke-width="2.5"/>
  <ellipse cx="${100 + rx}" cy="116" rx="8" ry="11" fill="${skin}" stroke="${LINE}" stroke-width="2.5"/>
  <ellipse cx="100" cy="114" rx="${rx}" ry="54" fill="${skin}" stroke="${LINE}" stroke-width="3"/>
  ${hairFront(l)}
  ${hat(l)}
  <path d="M70 96 Q80 90 90 96 M110 96 Q120 90 130 96" fill="none" stroke="${l.hair === 'wild' || l.hair === 'longwhite' || l.hair === 'shortgray' ? '#8a8a8a' : '#2b2118'}" stroke-width="4" stroke-linecap="round"/>
  <g class="eyes">
    <ellipse cx="80" cy="112" rx="6" ry="8" fill="#2b2118"/>
    <ellipse cx="120" cy="112" rx="6" ry="8" fill="#2b2118"/>
    <circle cx="82" cy="109" r="2" fill="#fff"/><circle cx="122" cy="109" r="2" fill="#fff"/>
  </g>
  <ellipse cx="66" cy="132" rx="9" ry="5" fill="#ff8a80" opacity=".35"/>
  <ellipse cx="134" cy="132" rx="9" ry="5" fill="#ff8a80" opacity=".35"/>
  <path d="M100 118 Q96 130 100 132" fill="none" stroke="${shade(skin, 0.7)}" stroke-width="3" stroke-linecap="round"/>
  <path class="mouth-close" d="M88 152 Q100 160 112 152" fill="none" stroke="#9b3b2f" stroke-width="4" stroke-linecap="round"/>
  <ellipse class="mouth-open" cx="100" cy="154" rx="9" ry="7" fill="#9b3b2f"/>
  ${beard(l)}
  ${l.item && !o.noItem ? `<g class="item"><circle cx="164" cy="190" r="24" fill="#fff" stroke="${LINE}" stroke-width="2.5"/><text x="164" y="200" font-size="28" text-anchor="middle">${l.item}</text></g>` : ''}
</svg>`;
  }

  return { face, shade };
})();

if (typeof module !== 'undefined') module.exports = Art;
