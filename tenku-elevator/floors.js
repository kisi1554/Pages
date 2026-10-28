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
    '-40': { name: 'かせき ホール', tag: 'hall', prop: 'fossil', friend: 'amon',
      say: 'ここは かせき ホール。かべ いちめんに むかしの いきものが ねむって いるよ。' },
    '-35': { name: 'すいしょうの どうくつ', tag: 'hall', prop: 'crystal', friend: 'kirari',
      say: 'ライトを あてると すいしょうが にじいろに ひかる どうくつ だよ。' },
    '-31': { name: 'ちそうの いりぐち', tag: 'entrance', prop: 'strata', friend: 'amon',
      say: 'ここから したは ちそう の せかい。むかしの うみの あとが ねむって いるよ。' },
    '-30': { name: 'ちかすいの いりぐち', tag: 'entrance', prop: 'water', friend: 'pochan',
      say: 'ここから したは ちかすい の そう。みみを すますと ぽたぽた きこえるね。' },
    '-22': { name: 'ゾロめの かい B22', tag: 'zoro', prop: 'drop', friend: 'puku', say: 'ちか 22かいは ゾロめの かい。2が ふたつ ならんで いるね。' },
    '-20': { name: 'ちかすいの いずみ', tag: 'hall', prop: 'water', friend: 'pochan',
      say: 'ちかすいが わきだす いずみ だよ。すきとおった みずが きらきら。' },
    '-15': { name: 'すいどうの ちかしつ', tag: 'hall', prop: 'pipe', friend: 'mizuho',
      say: 'まちじゅうへ みずを おくる すいどうかんが あつまる へや だよ。' },
    '-11': { name: 'ゾロめの かい B11', tag: 'zoro', prop: 'pipe', friend: 'kerosuke', say: 'ちか 11かいは ゾロめ。1が ふたつ！' },
    '-10': { name: 'ちかてつの いりぐち', tag: 'entrance', prop: 'train', friend: 'tetsuo',
      say: 'ここから したには ちかてつ の トンネルが とおっているよ。' },
    '-9': { name: 'ブルーライン のりば', tag: 'hall', prop: 'train', friend: 'tetsuo', line: 'blue',
      say: 'ここは ちかてつ ブルーラインの のりば。しょうなんだい ゆき と あざみの ゆき の でんしゃが くるよ。' },
    '-5': { name: 'ちかてつの えき', tag: 'hall', prop: 'train', friend: 'tetsuo',
      say: 'ちかてつの えきに ついたよ。でんしゃが ごうごう はいって くる。' },
    '-3': { name: 'ちかがい', tag: 'hall', prop: 'shop', friend: 'hanako',
      say: 'ちかがいには おはなやさんや パンやさんが ならんで いるよ。' },
    '-1': { name: 'ねっこの へや', tag: 'hall', prop: 'root', friend: 'nene',
      say: 'じめんの すぐ した。きの ねっこが てんじょうから のびて いるよ。' },
    '1': { name: '1かい ロビー', tag: 'hall', prop: 'flower', friend: 'mamoru',
      say: 'てんくうエレベーターへ ようこそ！ ちか 50かいから 500かいまで、どの かいにも おりられるよ。' },
    '10': { name: 'こうえんの みえる かい', tag: 'hall', prop: 'tree', friend: 'pochi',
      say: 'まどの したに こうえんが みえるよ。いぬの さんぽ コース なんだ。' },
    '11': { name: 'ゾロめの かい 11', tag: 'zoro', prop: 'pencil', friend: 'chun', say: '11かいは ゾロめの かい。1が ふたつ ならんで いるね。' },
    '15': { name: 'なかよし ひろば', tag: 'hall', prop: 'heart', friend: 'mike',
      say: 'ここは まちの みんなが あつまる なかよし ひろば だよ。' },
    '22': { name: 'ゾロめの かい 22', tag: 'zoro', prop: 'letter', friend: 'fumi', say: '22かいは ゾロめ。2が ふたつ！' },
    '25': { name: 'しょうてんがいの かい', tag: 'hall', prop: 'bread', friend: 'komugi',
      say: 'したの しょうてんがいから パンの いい においが のぼって くるよ。' },
    '31': { name: 'ビルの うえの いりぐち', tag: 'entrance', prop: 'window', friend: 'pika',
      say: 'ここから うえは まちの ビルより たかい ところ。まどの そとに みなとが みえてくるよ。' },
    '33': { name: 'ゾロめの かい 33', tag: 'zoro', prop: 'window', friend: 'pika', say: '33かいは ゾロめ。3が ふたつ！' },
    '44': { name: 'ゾロめの かい 44', tag: 'zoro', prop: 'anchor', friend: 'ikari', say: '44かいは ゾロめ。4が ふたつ！' },
    '50': { name: 'みなとの みえる かい', tag: 'hall', prop: 'anchor', friend: 'shiori',
      say: 'ここから みなとの ふねや クレーンが よく みえるよ。' },
    '55': { name: 'ゾロめの かい 55', tag: 'zoro', prop: 'ship', friend: 'tsuruzo', say: '55かいは ゾロめ。5が ふたつ！' },
    '66': { name: 'ゾロめの かい 66', tag: 'zoro', prop: 'bird', friend: 'poppo', say: '66かいは ゾロめ。6が ふたつ！' },
    '74': { name: 'ランドマークタワーと おなじ たかさ', tag: 'height', prop: 'building', friend: 'shiori',
      say: 'ここは たかさ 296メートル。よこはまの ランドマークタワー（296メートル）と だいたい おなじ たかさ だよ。' },
    '77': { name: 'ゾロめの かい 77', tag: 'zoro', prop: 'medal', friend: 'kurosuke', say: '77かいは ゾロめ。7が ふたつで ラッキー！' },
    '83': { name: 'とうきょうタワーと おなじ たかさ', tag: 'height', prop: 'tower', friend: 'kurosuke',
      say: 'ここは たかさ 332メートル。とうきょうタワー（333メートル）の てっぺんと だいたい おなじ だよ。' },
    '88': { name: 'スカイツリーの てんぼうデッキと おなじ たかさ', tag: 'height', prop: 'telescope', friend: 'kurosuke',
      say: 'ここは たかさ 352メートル。とうきょうスカイツリーの てんぼうデッキ（350メートル）と だいたい おなじ たかさ だよ。' },
    '99': { name: 'ゾロめの かい 99', tag: 'zoro', prop: 'medal', friend: 'poppo', say: '99かいは ゾロめ。つぎは いよいよ 100かい！' },
    '100': { name: '100かい きねん ホール', tag: 'hall', prop: 'medal', friend: 'poppo',
      say: '100かい とうちゃく！ たかさ 400メートル。ここから うえは そらの せかい。' },
    '101': { name: 'そらの いりぐち', tag: 'entrance', prop: 'telescope', friend: 'pihyoro',
      say: 'ここから うえは、タワーより たかい ところ。とりや ヘリコプターと おなじ たかさ だよ。' },
    '111': { name: 'ゾロめの かい 111', tag: 'zoro', prop: 'feather', friend: 'pihyoro', say: '111かいは 1が みっつの ゾロめ！' },
    '113': { name: 'スカイツリーの てんぼうかいろうと おなじ たかさ', tag: 'height', prop: 'telescope', friend: 'fuwari',
      say: 'ここは たかさ 452メートル。とうきょうスカイツリーの てんぼうかいろう（450メートル）と だいたい おなじ だよ。' },
    '150': { name: 'ぼうえんきょうの へや', tag: 'hall', prop: 'telescope', friend: 'batabata',
      say: 'ここには とおくを みる どうぐが いっぱい。うみの むこうまで みえるよ。' },
    '159': { name: 'スカイツリーと おなじ たかさ', tag: 'height', prop: 'tower', friend: 'batabata',
      say: 'ここは たかさ 636メートル。とうきょうスカイツリー（634メートル）の てっぺんと だいたい おなじ だよ。' },
    '200': { name: '200かい きねん ホール', tag: 'hall', prop: 'medal', friend: 'hyuu',
      say: '200かい とうちゃく！ たかさ 800メートル。うえを みて、くもが すぐ そこだよ。' },
    '201': { name: 'くもの いりぐち', tag: 'entrance', prop: 'cloud', friend: 'mokumoku',
      say: 'ここから うえは くもの なか。てんきに よって まどの そとが まっしろに なるよ。' },
    '222': { name: 'ゾロめの かい 222', tag: 'zoro', prop: 'cloud', friend: 'mokumoku', say: '222かいは 2が みっつの ゾロめ！ くもの なかの ふしぎな へや。' },
    '250': { name: 'くもの まんなか', tag: 'hall', prop: 'cloud', friend: 'mokumoku',
      say: 'ここは くもの ちょうど まんなか。まわりは ぜんぶ くもの つぶ だよ。' },
    '277': { name: 'にじの かい', tag: 'hall', prop: 'rainbow', friend: 'nanairo',
      say: 'あめあがりに にじが かかる ふしぎな かい。なないろの はしを わたって みたいね。' },
    '300': { name: 'かみなりの へや', tag: 'hall', prop: 'bolt', friend: 'gorosuke',
      say: 'ゴロゴロ…ここは かみなりの こたちの へや。でも ひらいしんが あるから あんしん。' },
    '333': { name: 'ゾロめの かい 333', tag: 'zoro', prop: 'umbrella', friend: 'shitoshito', say: '333かいは 3が みっつの ゾロめ！' },
    '351': { name: 'くもの うえの いりぐち', tag: 'entrance', prop: 'sun', friend: 'tsubasa',
      say: 'くもを ぬけたよ！ ここから うえは、いつでも そらが みえる くもの うえ。' },
    '400': { name: 'ほしの てんぼうしつ', tag: 'hall', prop: 'star', friend: 'kirara',
      say: 'よるに なると ほしが てに とどきそうな てんぼうしつ だよ。' },
    '444': { name: 'ゾロめの かい 444', tag: 'zoro', prop: 'heli', friend: 'tsubasa', say: '444かいは 4が みっつの ゾロめ！' },
    '450': { name: 'つきの テラス', tag: 'hall', prop: 'moon', friend: 'manmaru',
      say: 'つきが いちばん きれいに みえる テラス。おつきみに ぴったり。' },
    '499': { name: 'おくじょうの ひとつ した', tag: 'hall', prop: 'flag', friend: 'wataru',
      say: 'つぎは いよいよ おくじょう。さいごの とびらを あけて いこう！' },
    '500': { name: 'おくじょう てんくう テラス', tag: 'hall', prop: 'star', friend: 'banin',
      say: 'ここが いちばん うえ、たかさ 2000メートルの てんくう テラス。とおくに ふじさんが みえるかな？' },
  };

  /* あいことばの とびら: おともだちの なぞに、ポケットの ただしい カードを だすと ひらく
   *   kind … 'ant'（はんたいの ことば）/'syn'（にた ことば）/'mean'（いみ から あてる）
   *   of … ant・syn の もとの ことば、accept … こたえに なる ことば（どれでも よい）
   */
  const GATES = {
    '-40': { kind: 'mean', q: 'ずっと まえの ときの ことを なんと いう？ ヒント：「いま」の はんたい', accept: ['むかし', 'かこ'], prize: 'fossil' },
    '-20': { kind: 'mean', q: 'みずが きれいで、むこうまで みえる ようすを あらわす ことばは？', accept: ['すきとおる', 'すみきる'], prize: 'water' },
    '15': { kind: 'ant', of: 'うれしい', accept: ['かなしい'], prize: 'heart' },
    '50': { kind: 'ant', of: 'たかい', accept: ['ひくい'], prize: 'anchor' },
    '150': { kind: 'mean', q: 'とおくの ものを おおきく みる どうぐは？', accept: ['ぼうえんきょう', 'そうがんきょう'], prize: 'telescope' },
    '222': { kind: 'syn', of: 'ふわふわ', accept: ['ふわり'], prize: 'cloud' },
    '277': { kind: 'syn', of: 'にじいろ', accept: ['なないろ'], prize: 'rainbow' },
    '333': { kind: 'mean', q: 'あめが しずかに ふりつづく ようすを あらわす ことばは？', accept: ['しとしと'], prize: 'umbrella' },
    '444': { kind: 'syn', of: 'ついに', accept: ['とうとう'], prize: 'heli' },
    '499': { kind: 'ant', of: 'しゅっぱつ', accept: ['とうちゃく'], prize: 'flag' },
  };
  function gate(n) {
    const g = GATES[String(n)];
    if (!g) return null;
    const of = g.of && Words.get(g.of);
    const q = g.q || (g.kind === 'ant' ? `「${of.k}」の はんたいの いみの ことばは？` : `「${of.k}」と にた いみの ことばは？`);
    return Object.assign({ n, question: q, hints: g.accept.map(id => ({ id, floor: floorOfWord(id) })) }, g);
  }
  let wordFloor = null;
  function floorOfWord(id) {
    if (!wordFloor) { wordFloor = new Map(); for (const n of Lift.all()) { const w = wordFor(n); if (!wordFloor.has(w.id)) wordFloor.set(w.id, n); } }
    return wordFloor.get(id) || null;
  }


  /* たかさの くらべっこ（README に しゅってん） */
  const LANDMARKS = [
    { h: 296, name: 'よこはま ランドマークタワー' },
    { h: 333, name: 'とうきょうタワー' },
    { h: 350, name: 'スカイツリーの てんぼうデッキ' },
    { h: 450, name: 'スカイツリーの てんぼうかいろう' },
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
    return list[i % list.length];   // ゾーンの ことばの かず ＝ かいの かず（tools/tenku-elevator/test.js で たしかめる）
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

  return { ZONES, zoneOf, zone: id => ZONE_BY.get(id), SPECIAL, GATES, gate, floorOfWord, LANDMARKS, compare, rng, get, specials, wordFor, posInZone };
})();
if (typeof module !== 'undefined') module.exports = Floors;
