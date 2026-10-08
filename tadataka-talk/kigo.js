'use strict';
/*
 * ちずきごうの え(SVG)。viewBox は 0 0 40 40。
 * こくど ちりいんの ちずきごうを、こどもが みわけられる くらいに かんたんに した もの。
 */
const KIGO_SVG = (() => {
  const C = (cx, cy, r, f) => `<circle cx="${cx}" cy="${cy}" r="${r}"${f ? ' fill="currentColor"' : ''}/>`;
  const P = (d) => `<path d="${d}"/>`;
  const T = (ch, size, y) => `<text x="20" y="${y}" font-size="${size}" text-anchor="middle" fill="currentColor" stroke="none" font-weight="bold">${ch}</text>`;
  const gearTeeth = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = 20 + Math.cos(a) * 8;
    const y1 = 20 + Math.sin(a) * 8;
    const x2 = 20 + Math.cos(a) * 13;
    const y2 = 20 + Math.sin(a) * 13;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="4"/>`;
  }).join('');
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `<line x1="${(20 + Math.cos(a) * 8).toFixed(1)}" y1="${(20 + Math.sin(a) * 8).toFixed(1)}" x2="${(20 + Math.cos(a) * 15).toFixed(1)}" y2="${(20 + Math.sin(a) * 15).toFixed(1)}"/>`;
  }).join('');
  const jr = '<rect x="3" y="16" width="34" height="8" fill="currentColor"/>' + [7, 19, 31].map((x) => `<rect x="${x - 3}" y="18" width="6" height="4" fill="#fff" stroke="none"/>`).join('');
  return {
    shiyakusho: C(20, 20, 14) + C(20, 20, 8),
    choson: C(20, 20, 12),
    gakko: T('文', 26, 29),
    koko: C(20, 20, 16) + T('文', 18, 27),
    yubin: C(20, 20, 15) + P('M12 13 H28 M12 19 H28 M20 19 V31'),
    keisatsu: C(20, 20, 15) + P('M12 12 L28 28 M28 12 L12 28'),
    koban: P('M9 9 L31 31 M31 9 L9 31'),
    shobo: P('M20 35 V17 M10 6 Q10 17 20 17 Q30 17 30 6'),
    byoin: C(20, 20, 15) + '<path d="M20 9 V31 M9 20 H31" stroke-width="4"/>',
    jinja: P('M6 10 Q20 13 34 10 M10 16 H30 M13 11 V34 M27 11 V34'),
    tera: T('卍', 28, 30),
    hakubutsu: P('M6 16 L20 7 L34 16 Z M9 32 H31 M11 18 V30 M17 18 V30 M23 18 V30 M29 18 V30'),
    toshokan: P('M20 12 V31 M20 12 Q12 7 5 11 V30 Q12 26 20 31 M20 12 Q28 7 35 11 V30 Q28 26 20 31'),
    rojin: P('M7 18 L20 7 L33 18 V33 H7 Z M18 31 V19 Q18 15 23 16'),
    kinenhi: P('M14 32 V13 L20 7 L26 13 V32 M9 33 H31'),
    densho: P('M14 32 V13 L20 7 L26 13 V32 M9 33 H31 M20 14 V29'),
    fusha: P('M20 18 V36 M12 10 L28 26 M28 10 L12 26') + C(20, 18, 2, true),
    todai: C(20, 20, 4, true) + rays,
    kojo: C(20, 20, 8) + gearTeeth + C(20, 20, 3),
    onsen: T('♨', 30, 31),
    minato: C(20, 8, 3) + P('M20 11 V33 M13 17 H27 M9 25 Q11 34 20 33 Q29 34 31 25'),
    ta: P('M14 12 V28 M20 12 V28 M26 12 V28'.replace(' M20 12 V28', '')),
    hatake: P('M11 12 Q14 24 20 28 Q26 24 29 12'),
    kajuen: C(20, 15, 7) + P('M20 22 V32'),
    cha: C(20, 12, 4) + C(12, 26, 4) + C(28, 26, 4),
    koyoju: C(20, 15, 9) + P('M20 24 V34'),
    shinyoju: P('M11 25 L20 7 L29 25 M20 7 V34'),
    sankaku: P('M20 7 L33 31 H7 Z') + C(20, 23, 2.2, true),
    bochi: P('M20 9 V30 M9 30 H31'),
    jr,
    shitetsu: P('M3 20 H37 M7 14 V26 M14 14 V26 M21 14 V26 M28 14 V26 M35 14 V26'),
  };
})();

function kigoSvg(id, size) {
  const body = KIGO_SVG[id] || '';
  return `<svg class="kigo" viewBox="0 0 40 40" width="${size || 56}" height="${size || 56}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
