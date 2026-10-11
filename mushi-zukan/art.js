'use strict';

/*
 * むしの え（SVG を その場で くみたてる）
 *  - セミ   : うえから みた すがた（viewBox 200×220）
 *  - カマキリ: よこから みた すがた（viewBox 224×142、ひだりむき）
 *  data.js の art パラメータ（いろ・もよう・からだの はば）で しゅるいを かきわける
 */

const BugArt = (function () {
  let uid = 0;

  function semi(a) {
    const id = 'm' + (++uid);
    const w = a.w || 1;
    // はねの すじ（みゃく）
    const veins =
      `<path d="M97 78 C 78 100, 64 140, 64 178" />` +
      `<path d="M97 90 C 88 120, 84 160, 86 196" />` +
      `<path d="M66 150 C 74 152, 84 152, 92 150" />` +
      `<path d="M62 176 C 68 184, 78 190, 88 196" />`;
    let spots = '';
    if (a.mottled) {
      const pts = [[74, 102, 5], [66, 126, 6], [84, 132, 4], [70, 156, 5], [88, 168, 5], [76, 186, 4], [92, 112, 3], [62, 172, 3]];
      spots = pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${a.vein}" opacity=".55"/>`).join('');
    }
    const wing =
      `<g id="${id}w">` +
      `<path d="M99 70 C 72 72, 50 108, 52 156 C 54 190, 70 208, 86 206 C 97 203, 100 186, 100 160 Z" fill="${a.wing}" fill-opacity="${a.wingOp}" stroke="${a.vein}" stroke-width="2.2" stroke-linejoin="round"/>` +
      spots +
      `<g fill="none" stroke="${a.vein}" stroke-width="1.4" opacity=".75">${veins}</g>` +
      `</g>`;
    return (
      `<svg viewBox="0 0 200 220" role="img" aria-hidden="true">` +
      `<g transform="translate(100 0) scale(${w} 1) translate(-100 0)">` +
      // あし（すこし だけ みえる）
      `<g stroke="${a.body}" stroke-width="4" stroke-linecap="round" fill="none">` +
      `<path d="M76 74 L60 66 L54 54"/><path d="M124 74 L140 66 L146 54"/>` +
      `<path d="M74 92 L56 98"/><path d="M126 92 L144 98"/>` +
      `</g>` +
      // おなか
      `<ellipse cx="100" cy="132" rx="23" ry="42" fill="${a.body}"/>` +
      `<g stroke="${a.mark}" stroke-width="1.6" opacity=".55" fill="none">` +
      `<path d="M80 122 Q100 128 120 122"/><path d="M80 138 Q100 144 120 138"/><path d="M83 154 Q100 159 117 154"/>` +
      `</g>` +
      // はね（ひだりを かいて、かがみうつしで みぎ）
      wing +
      `<use href="#${id}w" transform="translate(200 0) scale(-1 1)"/>` +
      // むね
      `<ellipse cx="100" cy="86" rx="27" ry="19" fill="${a.body}"/>` +
      `<path d="M86 78 L94 94 L100 84 L106 94 L114 78" fill="none" stroke="${a.mark}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<path d="M74 60 L126 60 L131 74 L69 74 Z" fill="${a.body}" stroke="${a.mark}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M88 64 L84 72 M112 64 L116 72" stroke="${a.mark}" stroke-width="2.2" stroke-linecap="round"/>` +
      // あたま
      `<ellipse cx="100" cy="52" rx="22" ry="10" fill="${a.body}"/>` +
      `<circle cx="77" cy="51" r="8" fill="${a.eye}" stroke="${a.body}" stroke-width="2"/>` +
      `<circle cx="123" cy="51" r="8" fill="${a.eye}" stroke="${a.body}" stroke-width="2"/>` +
      `<circle cx="74" cy="48" r="2.2" fill="#fff" opacity=".7"/><circle cx="120" cy="48" r="2.2" fill="#fff" opacity=".7"/>` +
      `<g fill="#e0503a"><circle cx="95" cy="50" r="1.8"/><circle cx="105" cy="50" r="1.8"/><circle cx="100" cy="46" r="1.8"/></g>` +
      `<path d="M92 43 L88 36 M108 43 L112 36" stroke="${a.body}" stroke-width="2" stroke-linecap="round"/>` +
      `</g></svg>`
    );
  }

  function kamakiri(a) {
    const belly = a.belly || 1;
    const by = 104; // おなかの まんなか
    const ry = 9 * belly;
    const leg = `stroke="${a.dark}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
    let deco = '';
    if (a.base) deco += `<ellipse cx="70" cy="77" rx="5" ry="4" fill="${a.base}" stroke="${a.dark}" stroke-width="1"/>`;
    if (a.dots) deco += [82, 88, 94, 100].map((y, i) => `<circle cx="${69 - i * 0.6}" cy="${y}" r="2.4" fill="#f3d23a" stroke="${a.dark}" stroke-width=".6"/>`).join('');
    if (a.inner) deco += `<ellipse cx="68" cy="94" rx="4.6" ry="9" fill="#1d1d1d"/><ellipse cx="68" cy="91" rx="2.4" ry="3.6" fill="#fff"/>`;
    const spot = a.spot ? `<ellipse cx="156" cy="94" rx="4" ry="3" fill="#fff" stroke="${a.dark}" stroke-width=".8"/>` : '';
    return (
      `<svg viewBox="12 2 224 142" role="img" aria-hidden="true">` +
      `<g>` +
      // むこうがわの あし（うすく）
      `<g opacity=".45"><path d="M126 104 L110 88 L104 138" ${leg}/><path d="M146 104 L176 88 L198 140" ${leg}/></g>` +
      // おなか
      `<ellipse cx="170" cy="${by}" rx="58" ry="${ry}" fill="${a.body}" stroke="${a.dark}" stroke-width="1.6"/>` +
      `<g stroke="${a.dark}" stroke-width="1.2" opacity=".5">` +
      [140, 160, 180, 200].map((x) => `<path d="M${x} ${by} L${x} ${by + ry * 0.9}"/>`).join('') +
      `</g>` +
      // はね
      `<path d="M110 92 C 140 82, 200 84, 230 98 C 206 104, 150 104, 112 100 Z" fill="${a.wing}" stroke="${a.dark}" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<path d="M120 94 C 160 90, 200 92, 224 98" fill="none" stroke="${a.dark}" stroke-width="1.2" opacity=".7"/>` +
      spot +
      // てまえの あし
      `<path d="M120 102 L100 86 L92 140" ${leg}/><path d="M142 104 L170 86 L192 142" ${leg}/>` +
      // むね（ながい くび）
      `<path d="M116 92 L66 64 L60 72 L112 104 Z" fill="${a.body}" stroke="${a.dark}" stroke-width="1.6" stroke-linejoin="round"/>` +
      // かまの つけね → かま
      `<path d="M66 72 L74 74 L72 106 L64 106 Z" fill="${a.body}" stroke="${a.dark}" stroke-width="1.6" stroke-linejoin="round"/>` +
      deco +
      `<path d="M66 104 L36 86 L42 80 L72 100 Z" fill="${a.body}" stroke="${a.dark}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<g fill="${a.dark}">` +
      [0, 1, 2, 3].map((i) => {
        const x = 62 - i * 7;
        const y = 104 - i * 4.2;
        return `<path d="M${x} ${y} l-2 6 l-3 -5 Z"/>`;
      }).join('') +
      `</g>` +
      `<path d="M38 84 L56 98 L60 94" fill="none" stroke="${a.dark}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
      // あたま
      `<path d="M38 56 Q50 44 66 56 Q62 70 52 80 Q42 70 38 56 Z" fill="${a.body}" stroke="${a.dark}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<ellipse cx="47" cy="57" rx="7" ry="8" fill="${a.wing}" stroke="${a.dark}" stroke-width="1.2"/>` +
      `<circle cx="45" cy="58" r="2" fill="#1d1d1d"/>` +
      `<path d="M52 47 Q40 22 18 12 M56 48 Q50 24 34 8" fill="none" stroke="${a.dark}" stroke-width="1.6" stroke-linecap="round"/>` +
      `</g></svg>`
    );
  }

  function svg(bug) {
    return bug.art.kind === 'semi' ? semi(bug.art) : kamakiri(bug.art);
  }

  return { svg };
})();
