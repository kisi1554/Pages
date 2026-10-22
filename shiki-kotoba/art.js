"use strict";

/* えもじ が ない ことば の え（SVG）。viewBox は 0 0 100 100 */
const Art = (() => {
  const S = (body) => `<svg viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;

  // はなびら 8まい の はな（いろ を かえて つかう）
  function flower(color, center) {
    let p = '';
    for (let i = 0; i < 8; i++) {
      p += `<ellipse cx="50" cy="27" rx="11" ry="20" fill="${color}" transform="rotate(${i * 45} 50 45)"/>`;
    }
    return S(`<path d="M50 62 Q48 80 52 98" stroke="#2f9e44" stroke-width="5" fill="none"/>
      <ellipse cx="62" cy="82" rx="12" ry="5" fill="#40c057" transform="rotate(-30 62 82)"/>
      ${p}<circle cx="50" cy="45" r="10" fill="${center || '#fab005'}"/>`);
  }

  const SVG = {
    tsukushi: S(`<path d="M38 98 V40 M62 98 V30" stroke="#c9a27a" stroke-width="7"/>
      <path d="M38 60 h-8 M38 76 h8 M62 52 h8 M62 70 h-8" stroke="#8d6e52" stroke-width="4"/>
      <ellipse cx="38" cy="30" rx="10" ry="18" fill="#a47148"/><ellipse cx="62" cy="20" rx="10" ry="18" fill="#a47148"/>
      <path d="M30 26 h16 M30 34 h16 M54 16 h16 M54 24 h16" stroke="#7a5230" stroke-width="2"/>`),
    tsubame: S(`<path d="M50 40 L8 22 L30 50 Z M50 40 L92 22 L70 50 Z" fill="#1c2b4a"/>
      <ellipse cx="50" cy="52" rx="13" ry="22" fill="#1c2b4a"/><ellipse cx="50" cy="58" rx="8" ry="13" fill="#fff"/>
      <circle cx="50" cy="36" r="6" fill="#e03131"/><path d="M44 72 L36 96 L50 80 L64 96 L56 72 Z" fill="#1c2b4a"/>`),
    otama: S(`<path d="M52 52 Q72 60 80 80 Q90 92 70 90 Q64 70 46 60 Z" fill="#495057"/>
      <ellipse cx="40" cy="44" rx="22" ry="18" fill="#343a40"/><circle cx="32" cy="38" r="5" fill="#fff"/><circle cx="32" cy="38" r="2.5"/>`),
    sakuramochi: S(`<ellipse cx="50" cy="64" rx="38" ry="24" fill="#2f9e44"/><path d="M14 64 Q50 50 86 64" stroke="#8ce99a" stroke-width="2" fill="none"/>
      <ellipse cx="50" cy="50" rx="32" ry="24" fill="#f7a8c4"/><circle cx="40" cy="44" r="3" fill="#fcc2d7"/><circle cx="58" cy="52" r="3" fill="#fcc2d7"/>`),
    kashiwamochi: S(`<path d="M12 62 Q20 22 50 18 Q86 22 90 62 Q70 86 50 84 Q24 86 12 62 Z" fill="#5c940d"/>
      <path d="M50 20 V82" stroke="#94d82d" stroke-width="3"/><ellipse cx="50" cy="60" rx="30" ry="20" fill="#f8f9fa"/>
      <path d="M20 60 Q50 44 80 60" stroke="#5c940d" stroke-width="6" fill="none"/>`),
    takenoko: S(`<path d="M50 8 Q70 40 78 92 H22 Q30 40 50 8 Z" fill="#a9744f"/>
      <path d="M50 8 Q56 50 64 92 M50 8 Q44 50 36 92 M30 60 Q50 52 70 60 M26 78 Q50 70 74 78" stroke="#6d4c33" stroke-width="3" fill="none"/>
      <path d="M50 8 l-6 -6 M50 8 l7 -5" stroke="#74b816" stroke-width="4"/><rect x="10" y="90" width="80" height="8" rx="4" fill="#8d6e52"/>`),
    semi: S(`<path d="M50 30 L14 60 L22 84 L48 52 Z M50 30 L86 60 L78 84 L52 52 Z" fill="#dee2e6" fill-opacity=".85" stroke="#868e96" stroke-width="2"/>
      <ellipse cx="50" cy="56" rx="13" ry="30" fill="#5c3d1e"/><ellipse cx="50" cy="28" rx="16" ry="10" fill="#3b2a1a"/>
      <circle cx="38" cy="26" r="4" fill="#e9ecef"/><circle cx="62" cy="26" r="4" fill="#e9ecef"/>`),
    higurashi: S(`<path d="M50 30 L14 60 L22 84 L48 52 Z M50 30 L86 60 L78 84 L52 52 Z" fill="#e3fafc" fill-opacity=".85" stroke="#66a80f" stroke-width="2"/>
      <ellipse cx="50" cy="56" rx="12" ry="28" fill="#8f5a2b"/><ellipse cx="50" cy="30" rx="15" ry="9" fill="#5c940d"/>
      <circle cx="38" cy="28" r="4" fill="#fff"/><circle cx="62" cy="28" r="4" fill="#fff"/>`),
    hotaru: S(`<rect width="100" height="100" rx="18" fill="#1b2a4e"/>
      <circle cx="62" cy="64" r="20" fill="#d8f5a2" opacity=".35"/><circle cx="62" cy="64" r="10" fill="#e9fac8"/>
      <ellipse cx="50" cy="48" rx="9" ry="18" fill="#212529" transform="rotate(-40 50 48)"/><circle cx="40" cy="36" r="6" fill="#e03131"/>
      <circle cx="20" cy="22" r="3" fill="#d8f5a2"/><circle cx="80" cy="26" r="2.5" fill="#d8f5a2"/><circle cx="24" cy="78" r="2.5" fill="#d8f5a2"/>`),
    ajisai: (() => {
      let p = '';
      const pts = [[50, 22], [32, 32], [68, 32], [24, 50], [50, 44], [76, 50], [36, 64], [64, 64], [50, 74]];
      pts.forEach(([x, y], i) => {
        const c = ['#748ffc', '#9775fa', '#5c7cfa', '#b197fc', '#4dabf7'][i % 5];
        p += `<g transform="translate(${x} ${y})"><path d="M0 -9 L9 0 L0 9 L-9 0 Z" fill="${c}"/><circle r="2" fill="#fff"/></g>`;
      });
      return S(`<ellipse cx="30" cy="88" rx="18" ry="8" fill="#2f9e44" transform="rotate(-20 30 88)"/>
        <ellipse cx="72" cy="88" rx="18" ry="8" fill="#2f9e44" transform="rotate(20 72 88)"/>${p}`);
    })(),
    uchiwa: S(`<rect x="46" y="62" width="8" height="34" rx="3" fill="#c9a27a"/>
      <circle cx="50" cy="40" r="34" fill="#fff" stroke="#1c7ed6" stroke-width="4"/>
      <path d="M22 50 Q36 38 50 50 T78 50" stroke="#4dabf7" stroke-width="6" fill="none"/>
      <circle cx="62" cy="26" r="8" fill="#e03131"/>`),
    katori: S(`<rect x="10" y="78" width="80" height="14" rx="7" fill="#2b8a3e"/>
      <path d="M50 70 m-4 0 a4 4 0 1 1 8 0 a10 10 0 1 1 -20 0 a16 16 0 1 1 32 0 a22 22 0 1 1 -44 0" stroke="#2f9e44" stroke-width="7" fill="none" transform="translate(0 -24)"/>
      <path d="M72 30 Q80 20 74 10 Q68 2 76 -4" stroke="#adb5bd" stroke-width="3" fill="none"/>`),
    mugicha: S(`<path d="M24 20 H76 L70 92 H30 Z" fill="#fff" stroke="#adb5bd" stroke-width="3"/>
      <path d="M27 40 H73 L70 90 H30 Z" fill="#c07a2c"/><rect x="36" y="50" width="12" height="12" fill="#fff" opacity=".6" transform="rotate(15 42 56)"/>
      <rect x="54" y="62" width="10" height="10" fill="#fff" opacity=".5" transform="rotate(-10 59 67)"/>`),
    edamame: S(`<path d="M14 72 Q20 30 60 20 Q90 18 86 34 Q82 60 40 80 Q18 88 14 72 Z" fill="#82c91e"/>
      <circle cx="36" cy="62" r="11" fill="#c0eb75"/><circle cx="54" cy="46" r="11" fill="#c0eb75"/><circle cx="72" cy="32" r="9" fill="#c0eb75"/>`),
    asagao: S(`<path d="M50 60 Q46 80 50 98" stroke="#2f9e44" stroke-width="4" fill="none"/>
      <path d="M50 92 Q70 70 88 74" stroke="#2f9e44" stroke-width="3" fill="none"/>
      <circle cx="50" cy="38" r="34" fill="#4c6ef5"/><circle cx="50" cy="38" r="24" fill="#748ffc"/>
      <path d="M50 4 V72 M16 38 H84 M26 14 L74 62 M74 14 L26 62" stroke="#dbe4ff" stroke-width="2"/><circle cx="50" cy="38" r="9" fill="#fff"/>`),
    hoozuki: S(`<path d="M50 6 V18" stroke="#5c940d" stroke-width="4"/>
      <path d="M50 16 Q86 28 80 62 Q74 92 50 94 Q26 92 20 62 Q14 28 50 16 Z" fill="#fd7e14"/>
      <path d="M50 16 Q60 50 50 94 M50 16 Q40 50 50 94 M50 16 Q80 50 66 90 M50 16 Q20 50 34 90" stroke="#e8590c" stroke-width="2" fill="none"/>`),
    susuki: S(`<path d="M50 98 Q50 60 44 24 M50 98 Q56 60 70 30 M50 98 Q46 64 26 36" stroke="#a9a37a" stroke-width="3" fill="none"/>
      <path d="M44 24 Q30 10 40 4 Q50 12 44 24 M70 30 Q72 12 84 12 Q82 26 70 30 M26 36 Q12 26 18 14 Q30 22 26 36" fill="#e9dfc2" stroke="#c8b98a" stroke-width="2"/>`),
    donguri: S(`<ellipse cx="50" cy="62" rx="24" ry="30" fill="#b5651d"/><ellipse cx="42" cy="56" rx="5" ry="10" fill="#d68b4a"/>
      <path d="M22 40 Q50 18 78 40 Q80 48 22 48 Z" fill="#7a4a1e"/><path d="M50 26 V12" stroke="#5c3d1e" stroke-width="5"/>
      <path d="M28 40 h44 M32 34 h36" stroke="#5c3d1e" stroke-width="2"/>`),
    higanbana: S(`<path d="M50 50 V98" stroke="#2f9e44" stroke-width="4"/>
      ${[0, 60, 120, 180, 240, 300].map(a => `<path d="M50 44 Q62 26 56 8 M50 44 Q66 34 70 22" stroke="#e03131" stroke-width="3" fill="none" transform="rotate(${a} 50 44)"/><ellipse cx="50" cy="32" rx="5" ry="12" fill="#f03e3e" transform="rotate(${a} 50 44)"/>`).join('')}`),
    kinmokusei: (() => {
      let p = '';
      [[30, 30], [46, 22], [62, 30], [38, 44], [56, 44], [72, 46], [28, 56], [46, 60], [64, 62]].forEach(([x, y]) => {
        p += `<g transform="translate(${x} ${y})">${[0, 90, 180, 270].map(a => `<ellipse cy="-4" rx="3" ry="4.5" fill="#fd7e14" transform="rotate(${a})"/>`).join('')}</g>`;
      });
      return S(`<path d="M10 90 Q40 70 90 80" stroke="#6d4c33" stroke-width="5" fill="none"/>
        <ellipse cx="22" cy="80" rx="14" ry="6" fill="#2b8a3e"/><ellipse cx="78" cy="76" rx="14" ry="6" fill="#2b8a3e"/>${p}`);
    })(),
    tonbo: S(`<path d="M50 30 Q14 18 8 30 Q14 40 50 36 Z M50 30 Q86 18 92 30 Q86 40 50 36 Z M50 42 Q16 40 12 52 Q22 58 50 46 Z M50 42 Q84 40 88 52 Q78 58 50 46 Z" fill="#e7f5ff" stroke="#adb5bd" stroke-width="1.5"/>
      <rect x="46" y="30" width="8" height="66" rx="4" fill="#e03131"/><circle cx="50" cy="24" r="9" fill="#c92a2a"/>`),
    koorogi: S(`<path d="M40 50 L16 30 M44 48 L30 12 M70 70 L92 88 M60 74 L72 96" stroke="#212529" stroke-width="3"/>
      <ellipse cx="54" cy="58" rx="30" ry="14" fill="#343a40" transform="rotate(25 54 58)"/><circle cx="32" cy="44" r="11" fill="#212529"/>`),
    kaki: S(`<path d="M50 30 Q90 30 88 62 Q84 92 50 92 Q16 92 12 62 Q10 30 50 30 Z" fill="#f76707"/>
      <path d="M50 34 L36 22 L50 26 L64 22 Z M50 34 L30 36 M50 34 L70 36" stroke="#2b8a3e" stroke-width="6" fill="#2b8a3e"/>
      <path d="M50 20 V8" stroke="#6d4c33" stroke-width="4"/><ellipse cx="34" cy="54" rx="6" ry="9" fill="#ffa94d"/>`),
    kakashi: S(`<path d="M50 30 V98 M14 50 H86" stroke="#8d6e52" stroke-width="6"/>
      <path d="M30 46 H70 L66 76 H34 Z" fill="#4dabf7"/><circle cx="50" cy="28" r="14" fill="#fff3bf" stroke="#adb5bd"/>
      <ellipse cx="50" cy="16" rx="26" ry="7" fill="#e9c46a"/><path d="M38 12 Q50 -2 62 12" fill="#e9c46a"/>
      <circle cx="45" cy="28" r="2"/><circle cx="55" cy="28" r="2"/><path d="M44 34 Q50 38 56 34" stroke="#000" fill="none"/>`),
    shimobashira: S(`<rect x="0" y="70" width="100" height="30" fill="#8d6e52"/>
      ${[10, 22, 34, 46, 58, 70, 82].map((x, i) => `<rect x="${x}" y="${30 + (i % 3) * 8}" width="8" height="${44 - (i % 3) * 8}" fill="#d0ebff" stroke="#74c0fc"/>`).join('')}
      <rect x="0" y="24" width="100" height="10" fill="#6d4c33"/>`),
    tsurara: S(`<rect x="0" y="0" width="100" height="16" fill="#868e96"/>
      ${[[10, 60], [26, 86], [42, 50], [58, 74], [74, 44], [88, 64]].map(([x, h]) => `<path d="M${x - 7} 16 L${x + 7} 16 L${x} ${16 + h} Z" fill="#d0ebff" stroke="#74c0fc" stroke-width="2"/>`).join('')}`),
    kotatsu: S(`<path d="M8 50 H92 L84 86 H16 Z" fill="#e8590c"/><rect x="4" y="40" width="92" height="12" rx="3" fill="#a9744f"/>
      <path d="M8 60 H92 M12 72 H88" stroke="#ffa94d" stroke-width="3"/>
      <circle cx="40" cy="32" r="8" fill="#fd7e14"/><circle cx="58" cy="32" r="8" fill="#fd7e14"/><path d="M40 24 v-3 M58 24 v-3" stroke="#2b8a3e" stroke-width="3"/>`),
    daikon: S(`<path d="M38 30 Q36 70 50 98 Q64 70 62 30 Z" fill="#f8f9fa" stroke="#ced4da" stroke-width="2"/>
      <path d="M50 32 Q30 10 26 2 M50 32 Q50 10 50 0 M50 32 Q70 10 74 2" stroke="#2f9e44" stroke-width="7" fill="none"/>
      <path d="M38 30 H62 L61 42 H39 Z" fill="#d3f9d8"/>`),
    mochi: S(`<ellipse cx="50" cy="66" rx="40" ry="20" fill="#f1f3f5" stroke="#ced4da" stroke-width="2"/>
      <ellipse cx="50" cy="52" rx="30" ry="22" fill="#fff" stroke="#ced4da" stroke-width="2"/>
      <path d="M36 28 Q50 6 64 28" fill="#fff" stroke="#ced4da" stroke-width="2"/>
      <path d="M40 72 l8 -6 M58 74 l6 -6" stroke="#e9c46a" stroke-width="3"/>`),
    suisen: S(`<path d="M50 50 V98 M42 98 Q30 70 34 54 M58 98 Q70 70 66 56" stroke="#2f9e44" stroke-width="4" fill="none"/>
      ${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="50" cy="26" rx="9" ry="15" fill="#fff" stroke="#dee2e6" transform="rotate(${a} 50 40)"/>`).join('')}
      <circle cx="50" cy="40" r="10" fill="#fcc419"/><circle cx="50" cy="40" r="5" fill="#f08c00"/>`),
    koma: S(`<path d="M50 4 V22" stroke="#6d4c33" stroke-width="6"/>
      <path d="M8 46 Q50 14 92 46 Q50 98 8 46 Z" fill="#e03131"/>
      <path d="M8 46 Q50 34 92 46 M20 40 Q50 64 80 40" stroke="#ffd43b" stroke-width="5" fill="none"/>
      <path d="M50 80 V96" stroke="#6d4c33" stroke-width="4"/>`),
  };

  /* え を html に。emoji は span、SVG は そのまま */
  function html(art) {
    if (art.startsWith('svg:')) return SVG[art.slice(4)] || '❓';
    if (art.startsWith('flower:')) return flower(art.slice(7));
    return `<span class="emo">${art}</span>`;
  }
  return { html, has: (art) => !art.startsWith('svg:') || !!SVG[art.slice(4)] };
})();
