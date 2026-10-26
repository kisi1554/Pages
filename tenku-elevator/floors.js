"use strict";
/* てんくうエレベーター - かい の 生成
 *   ゾーン の テーマ ＋ おともだち ＋ その かい の ことば を、かい ばんごう を たね に して きめる
 *   （おなじ かい は いつも おなじ ないよう）。とくべつな かい は SPECIAL で てづくり。
 *   Words・Friends・Lift の あとに よみこむ。
 */
const Floors = (() => {
  const ZONES = [
    { id: 'chiso', from: -50, to: -31, name: 'ちそう と かせき', theme: 'むかし・じかん・おもさ', emoji: '🦴',
      wall: ['#5b4636', '#8a6a4f'], floor: '#3b2d22', light: '#ffd8a8', prop: 'fossil' },
    { id: 'mizu', from: -30, to: -11, name: 'ちかすい と すいどう', theme: 'しずく・おと', emoji: '💧',
      wall: ['#284b63', '#3c6e91'], floor: '#1d3446', light: '#a5d8ff', prop: 'drop' },
    { id: 'chika', from: -10, to: -1, name: 'ちかてつ と ちかがい', theme: 'のりもの・ねっこ', emoji: '🚇',
      wall: ['#495057', '#868e96'], floor: '#343a40', light: '#fff3bf', prop: 'sign' },
    { id: 'machi', from: 1, to: 30, name: 'まち', theme: 'くらし・きもち', emoji: '🏘️',
      wall: ['#fff4e6', '#ffe8cc'], floor: '#e9c49a', light: '#fff9db', prop: 'flower' },
    { id: 'biru', from: 31, to: 100, name: 'ビルの うえ と みなと', theme: 'たかさ・うみ・とり', emoji: '🏙️',
      wall: ['#e7f5ff', '#d0ebff'], floor: '#a5b4c4', light: '#ffffff', prop: 'window' },
    { id: 'tower', from: 101, to: 200, name: 'タワーより たかい', theme: 'ひろさ・とおさ', emoji: '🗼',
      wall: ['#dbe4ff', '#bac8ff'], floor: '#8c9ad1', light: '#ffffff', prop: 'telescope' },
    { id: 'kumo', from: 201, to: 350, name: 'くもの なか と てんき', theme: 'てんき・みず', emoji: '☁️',
      wall: ['#f1f3f5', '#dee2e6'], floor: '#adb5bd', light: '#ffffff', prop: 'cloud' },
    { id: 'kumoue', from: 351, to: 499, name: 'くもの うえ', theme: 'そら・ひろさ・ほし', emoji: '🌥️',
      wall: ['#d0ebff', '#a5d8ff'], floor: '#74c0fc', light: '#ffffff', prop: 'star' },
    { id: 'okujo', from: 500, to: 500, name: 'おくじょう てんくう テラス', theme: 'てんくう', emoji: '🌤️',
      wall: ['#e7f5ff', '#ffffff'], floor: '#91a7ff', light: '#ffffff', prop: 'star' },
  ];
  const ZONE_BY = new Map(ZONES.map(z => [z.id, z]));
  const zoneOf = n => ZONES.find(z => n >= z.from && n <= z.to);

  /* てづくりの とくべつな かい
   *   name … かんばん、say … ばんにんの ことば（おともだちの はなしの まえ）、friend … きまった おともだち
   *   prop … かざる もの、tag … 'entrance'（ゾーンの いりぐち）/'height'（たかさの めいしょ）/'zoro'/'hall'
   */
  const SPECIAL = {
    '-50': { name: 'いちばん したの たからべや', tag: 'hall', prop: 'gem', friend: 'gorota',
      say: 'ここは ちか 50かい、マイナス 200メートル。いちばん したの ひみつの へや だよ。' },
    '-31': { name: 'ちそうの いりぐち', tag: 'entrance', prop: 'strata', friend: 'amon',
      say: 'ここから したは ちそう の せかい。むかしの うみの あとが ねむって いるよ。' },
    '-30': { name: 'ちかすいの いりぐち', tag: 'entrance', prop: 'water', friend: 'pochan',
      say: 'ここから したは ちかすい の そう。みみを すますと ぽたぽた きこえるね。' },
    '-10': { name: 'ちかてつの いりぐち', tag: 'entrance', prop: 'train', friend: 'tetsuo',
      say: 'ここから したには ちかてつ の トンネルが とおっているよ。' },
    '1': { name: '1かい ロビー', tag: 'hall', prop: 'flower', friend: 'mamoru',
      say: 'てんくうエレベーターへ ようこそ！ ちか 50かいから 500かいまで、どの かいにも おりられるよ。' },
    '31': { name: 'ビルの うえの いりぐち', tag: 'entrance', prop: 'window', friend: 'pika',
      say: 'ここから うえは まちの ビルより たかい ところ。まどの そとに みなとが みえてくるよ。' },
    '74': { name: 'ランドマークタワーと おなじ たかさ', tag: 'height', prop: 'building', friend: 'shiori',
      say: 'ここは たかさ 296メートル。よこはまの ランドマークタワー（296メートル）と だいたい おなじ たかさ だよ。' },
    '83': { name: 'とうきょうタワーと おなじ たかさ', tag: 'height', prop: 'tower', friend: 'kurosuke',
      say: 'ここは たかさ 332メートル。とうきょうタワー（333メートル）の てっぺんと だいたい おなじ だよ。' },
    '100': { name: '100かい きねん ホール', tag: 'hall', prop: 'medal', friend: 'poppo',
      say: '100かい とうちゃく！ たかさ 400メートル。ここから うえは そらの せかい。' },
    '101': { name: 'そらの いりぐち', tag: 'entrance', prop: 'telescope', friend: 'pihyoro',
      say: 'ここから うえは、タワーより たかい ところ。とりや ヘリコプターと おなじ たかさ だよ。' },
    '159': { name: 'スカイツリーと おなじ たかさ', tag: 'height', prop: 'tower', friend: 'batabata',
      say: 'ここは たかさ 636メートル。とうきょうスカイツリー（634メートル）の てっぺんと だいたい おなじ だよ。' },
    '201': { name: 'くもの いりぐち', tag: 'entrance', prop: 'cloud', friend: 'mokumoku',
      say: 'ここから うえは くもの なか。てんきに よって まどの そとが まっしろに なるよ。' },
    '351': { name: 'くもの うえの いりぐち', tag: 'entrance', prop: 'sun', friend: 'tsubasa',
      say: 'くもを ぬけたよ！ ここから うえは、いつでも そらが みえる くもの うえ。' },
    '500': { name: 'おくじょう てんくう テラス', tag: 'hall', prop: 'star', friend: 'banin',
      say: 'ここが いちばん うえ、たかさ 2000メートルの てんくう テラス。とおくに ふじさんが みえるかな？' },
  };

  /* たかさの くらべっこ（README に しゅってん） */
  const LANDMARKS = [
    { h: 296, name: 'よこはま ランドマークタワー' },
    { h: 333, name: 'とうきょうタワー' },
    { h: 634, name: 'とうきょうスカイツリー' },
    { h: 3776, name: 'ふじさん' },
  ];
  function compare(h) {
    if (h < -2) return `じめんから ${Math.round(-h)}メートル した`;
    if (h < 6) return 'じめんの たかさ';
    const near = LANDMARKS.find(l => Math.abs(l.h - h) <= l.h * .04);
    if (near) return `いま ${near.name}と おなじ たかさ！`;
    const above = LANDMARKS.filter(l => l.h < h).pop();
    const next = LANDMARKS.find(l => l.h > h);
    if (next && next.h > 2500) return above ? `${above.name}より たかい！ ${next.name}は ずっと うえ` : `${next.name}は ずっと うえ`;
    if (next) return `${next.name}まで あと ${Math.round(next.h - h)}メートル`;
    return '';
  }

  function rng(seed) {
    let a = (seed * 2654435761) >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];

  /* ゾーンの なかで なんばんめ の かいか（した から 0, 1, 2 …） */
  const posInZone = (n, z) => {
    let i = n - z.from;
    if (z.from < 0 && z.to > 0 && n > 0) i--;
    return i;
  };
  function wordFor(n) {
    const z = zoneOf(n);
    const list = Words.BY_ZONE[z.id];
    const i = posInZone(n, z);
    return list[i % list.length];   // ことばが たりない ゾーンは くりかえす（PR2 で ぜんぶ うまる）
  }

  const LINES = {
    chiso: ['ライトで てらすと、いわの しまもようが きれいでしょ。', 'この あたりの いしは、なんまんねんも まえに できたんだ。', 'かべを よーく みると、ちいさな かいがらが うまってるよ。'],
    mizu: ['みみを すますと、みずの おとが きこえるね。', 'この したを、つめたい ちかすいが ゆっくり ながれてる。', 'まちの すいどうかんは、ここを とおって いくんだ。'],
    chika: ['かべの むこうを ちかてつが とおって いくよ。', 'じめんの すぐ したは、ねっこや むしで いっぱい。', 'ちかがいは あめの ひでも ぬれないんだ。'],
    machi: ['まちの ひとは みんな なかよし なんだ。', 'まどの そとに、いえの やねが ならんでる。', 'きょうも まちは げんきに うごいてるね。'],
    biru: ['まどから みなとの ふねが よく みえるよ。', 'ここまで くると、かぜが つよく なるね。', 'うえから みると、まちが ちずみたい。'],
    tower: ['ここは タワーより たかい ところ。とりと おなじ めせん だね。', 'とおくの やまなみまで ずっと みえるよ。', 'ここでは そらが ぐっと ちかく かんじるね。'],
    kumo: ['くもの なかは、ちいさな みずの つぶで いっぱい。', 'てんきは くもが きめて いるんだよ。', 'まどの そとが しろく なったり あおく なったり するね。'],
    kumoue: ['くもの うえは、いつでも はれて いるんだ。', 'したを みると、くもが うみみたいに ひろがってる。', 'よるに なると、ほしが とても ちかく みえるよ。'],
    okujo: ['ここが いちばん うえ。そらに いちばん ちかい ところ。'],
  };

  const cache = new Map();
  function get(n) {
    if (!Lift.valid(n)) return null;
    if (cache.has(n)) return cache.get(n);
    const r = rng(n + 1000);
    const z = zoneOf(n), sp = SPECIAL[String(n)] || null;
    const word = wordFor(n);
    const zf = Friends.ZONE[z.id];
    const friend = sp && sp.friend ? sp.friend : zf[Math.floor(r() * zf.length)];
    const f = {
      n, label: Lift.label(n), yomi: Lift.yomi(n), h: Lift.alt(n),
      zone: z.id, zoneName: z.name, word: word.id, friend, special: sp,
      name: sp ? sp.name : `${Lift.yomi(n)}`,
      prop: (sp && sp.prop) || word.prop || z.prop,
      line: pick(r, LINES[z.id]),
      // ホールの かざりの ちがい
      deco: { hue: Math.floor(r() * 30) - 15, plants: Math.floor(r() * 3), lamps: 1 + Math.floor(r() * 3), seed: Math.floor(r() * 1e6) },
    };
    cache.set(n, f);
    return f;
  }
  const specials = () => Object.keys(SPECIAL).map(Number).sort((a, b) => a - b);

  return { ZONES, zoneOf, zone: id => ZONE_BY.get(id), SPECIAL, LANDMARKS, compare, rng, get, specials, wordFor, posInZone };
})();
if (typeof module !== 'undefined') module.exports = Floors;
