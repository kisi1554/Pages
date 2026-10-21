/* たねから はなまで ラボ — データと きまり
   画面（app.js）にも テスト（tests/data.test.js）にも つかう。DOM には さわらない。
   もじの「{漢字|よみ}」は ふりがな つきで ひょうじする（app.js の ruby()）。

   じっけんの 結果は ここの 表（NEEDS / GROWTH / FRUIT）だけで きまる。
   「ひかりが ないと めが でない」など まちがった 結果に ならないことを テストで たしかめる。 */

(function (root) {
  'use strict';

  /* ================= しょくぶつ =================
     days … たねを まいた 日を 0 にした めやす（地いき・天気で かわる）
     maxCm … いちばん のびた ときの たかさ（つるは ささえを のぼった ながさ）
     maxLeaves … かんさつで かぞえる ほんばの かず（え に かく かず と おなじ） */
  const PLANTS = [
    {
      id: 'asagao', name: 'アサガオ', emoji: '🌺', grade: '{小|しょう}1・{小|しょう}5',
      seed: { shape: 'kushi', color: '#4a3526', text: 'みかんの ふさを ちいさく した ような「くしがた」。くろっぽい ちゃいろで かたい。' },
      futaba: { shape: 'v', text: 'まんなかが へこんだ V の かたち。ちょうちょ みたい。' },
      honba: { shape: 'asagao', text: 'ハートの かたちで、3つに わかれる ことが おおい。けが はえて いる。' },
      tsuru: { kind: 'twine', dir: 'ccw', text: 'つるが ぼうに まきつく。うえから みると {左|ひだり}まき（{時計|とけい}の はりと はんたいの むき）。' },
      flower: { colors: ['#4c6ef5', '#ae3ec9', '#f06595'], kind: 'both', text: 'ラッパの かたち。あおや むらさき、ピンク。あさ さいて おひるには しぼむ。' },
      fruit: { text: 'まるい み が ちゃいろく かれると、なかに たねが 4〜6こ。', seeds: '4〜6' },
      days: { me: 5, futaba: 7, honba: 14, tsuru: 24, tsubomi: 50, hana: 58, mi: 66, tane: 85 },
      maxCm: 200, maxLeaves: 14
    },
    {
      id: 'himawari', name: 'ヒマワリ', emoji: '🌻', grade: '{小|しょう}3',
      seed: { shape: 'stripe', color: '#3b3b3b', text: 'しずくの かたちで、くろと しろの しましま。' },
      futaba: { shape: 'oval', text: 'たまごがたで ぶあつい。' },
      honba: { shape: 'heart', text: 'おおきな ハートがた。さわると ざらざら する。' },
      tsuru: null,
      flower: { colors: ['#fcc419'], kind: 'both', text: 'きいろい おおきな はな。ちいさな はなが たくさん あつまって 1つの はなに みえる。' },
      fruit: { text: 'はなの あとに たねが ぎっしり。1つの はなから なん百こも とれる。', seeds: 'なん百こ' },
      days: { me: 7, futaba: 9, honba: 16, tsubomi: 50, hana: 62, mi: 72, tane: 92 },
      maxCm: 200, maxLeaves: 14
    },
    {
      id: 'housenka', name: 'ホウセンカ', emoji: '🌸', grade: '{小|しょう}3',
      seed: { shape: 'round', color: '#6b4a2b', text: 'ちいさくて まるい ちゃいろの たね。' },
      futaba: { shape: 'round', text: 'まるい ふたば。' },
      honba: { shape: 'narrow', text: 'ほそながくて、ふちが ぎざぎざ。' },
      tsuru: null,
      flower: { colors: ['#e64980', '#f783ac', '#ffffff'], kind: 'both', text: 'あか・ピンク・しろの はな。はの つけねに さく。' },
      fruit: { text: 'け の はえた み。じゅくすと さわった だけで はじけて、たねが とびだす。', seeds: '10こ ぐらい' },
      days: { me: 6, futaba: 8, honba: 14, tsubomi: 44, hana: 52, mi: 62, tane: 74 },
      maxCm: 50, maxLeaves: 16
    },
    {
      id: 'minitomato', name: 'ミニトマト', emoji: '🍅', grade: '{小|しょう}2・{小|しょう}3',
      seed: { shape: 'flat', color: '#c9b27a', text: 'ちいさく ひらたい うすちゃいろ。こまかい けが ある。' },
      futaba: { shape: 'thin', text: 'ほそながい ふたば。' },
      honba: { shape: 'compound', text: 'ちいさな はが あつまって 1まいの はに なる。ふちが ぎざぎざ で トマトの におい。' },
      tsuru: null,
      flower: { colors: ['#ffd43b'], kind: 'both', text: 'きいろい ほしの かたちの ちいさな はな。いくつも ならんで さく。' },
      fruit: { text: 'みどりの み が あかく なる。なかに ちいさな たねが たくさん。', seeds: 'たくさん' },
      days: { me: 7, futaba: 10, honba: 20, tsubomi: 44, hana: 52, mi: 62, tane: 88 },
      maxCm: 120, maxLeaves: 10
    },
    {
      id: 'ingen', name: 'インゲンマメ', emoji: '🫘', grade: '{小|しょう}5',
      seed: { shape: 'bean', color: '#c0392b', text: 'まがった だえんの「まめ」。なかの 2まいの {子葉|しよう}に ようぶん（でんぷん）が ある。' },
      futaba: { shape: 'bean', text: 'たねが われて あつい {子葉|しよう} が でる。そのあと ハートがたの はが 2まい。' },
      honba: { shape: 'trifoliate', text: 'はが 3まい で 1くみ に なる。' },
      tsuru: null,
      flower: { colors: ['#ffffff', '#e5dbff'], kind: 'both', text: 'しろや うすむらさきの、ちょうの ような かたちの はな。' },
      fruit: { text: 'ほそながい さや の なかに まめ（たね）が 5〜8こ。', seeds: '5〜8' },
      days: { me: 6, futaba: 8, honba: 12, tsubomi: 34, hana: 40, mi: 50, tane: 68 },
      maxCm: 40, maxLeaves: 12
    },
    {
      id: 'hechima', name: 'ヘチマ', emoji: '🥒', grade: '{小|しょう}4・{小|しょう}5',
      seed: { shape: 'flatoval', color: '#222222', text: 'くろくて ひらたい だえん。' },
      futaba: { shape: 'oval', text: 'たまごがたで ぶあつい ふたば。' },
      honba: { shape: 'palm', text: 'てのひらの ような おおきな は。' },
      tsuru: { kind: 'tendril', text: 'くきから でた「まきひげ」が ばねの ように まいて、あみに からみつく。' },
      flower: { colors: ['#fcc419'], kind: 'separate', text: 'きいろい はな。おばな と めばな が ある。めばなの したには ふくらみ（みに なる ところ）が ある。' },
      fruit: { text: 'ながい み（30〜60cm）。かれると なかに くろい たねが たくさん。', seeds: 'たくさん' },
      days: { me: 7, futaba: 9, honba: 16, tsuru: 30, tsubomi: 52, hana: 60, mi: 70, tane: 110 },
      maxCm: 300, maxLeaves: 12
    },
    {
      id: 'tsurureishi', name: 'ツルレイシ', emoji: '🥬', grade: '{小|しょう}4',
      seed: { shape: 'jagged', color: '#c8b48a', text: 'ひらたくて、ふちが でこぼこ。' },
      futaba: { shape: 'oval', text: 'まるみの ある ぶあつい ふたば。' },
      honba: { shape: 'lobed', text: 'ふかい きれこみの ある てのひらがたの は。' },
      tsuru: { kind: 'tendril', text: 'まきひげで あみに からみついて のぼる。' },
      flower: { colors: ['#ffe066'], kind: 'separate', text: 'きいろい ちいさな はな。おばな と めばな が ある。' },
      fruit: { text: 'いぼいぼの みどりの み（ゴーヤ）。じゅくすと オレンジに なって われ、あかい ゼリーに つつまれた たねが でる。', seeds: '20こ ぐらい' },
      days: { me: 8, futaba: 10, honba: 17, tsuru: 28, tsubomi: 44, hana: 52, mi: 62, tane: 84 },
      maxCm: 250, maxLeaves: 12
    }
  ];
  const PLANT = {};
  PLANTS.forEach(p => { PLANT[p.id] = p; });

  /* そだつ じゅんばん。tsuru が ない しょくぶつは とばす。 */
  const STAGES = [
    { key: 'tane', name: 'たね' },
    { key: 'me', name: 'め' },
    { key: 'futaba', name: 'ふたば' },
    { key: 'honba', name: 'ほんば' },
    { key: 'tsuru', name: 'つる' },
    { key: 'tsubomi', name: 'つぼみ' },
    { key: 'hana', name: 'はな' },
    { key: 'mi', name: 'み' },
    { key: 'tane2', name: 'たね' }
  ];

  function stageList(p) {
    return STAGES.filter(s => s.key === 'tane' || s.key === 'tane2' ? true : p.days[s.key] != null)
      .map(s => ({ key: s.key, name: s.name, day: s.key === 'tane' ? 0 : s.key === 'tane2' ? p.days.tane : p.days[s.key] }));
  }

  function stageAt(p, day) {
    const list = stageList(p);
    let cur = list[0];
    for (const s of list) if (day >= s.day) cur = s;
    return cur;
  }

  /* たかさ（cm）。ほんばが でてから ぐんぐん のび、はなが さく ころに ほぼ さいだいに なる。 */
  function heightAt(p, day) {
    const d = p.days;
    if (day < d.me) return 0;
    if (day < d.futaba) return round1(0.5 + 1.5 * (day - d.me) / (d.futaba - d.me));
    const start = 2, end = p.maxCm;
    const t0 = d.futaba, t1 = d.hana + 6;
    if (day >= t1) return end;
    const x = (day - t0) / (t1 - t0);        // 0〜1
    const s = x * x * (3 - 2 * x);            // なめらかに
    return round1(start + (end - start) * s);
  }

  /* ほんばの かず（ふたば は かぞえない）。 */
  function leavesAt(p, day) {
    const d = p.days;
    if (day < d.honba) return 0;
    const t1 = d.hana;
    if (day >= t1) return p.maxLeaves;
    return Math.max(1, Math.min(p.maxLeaves, Math.floor(1 + (p.maxLeaves - 1) * (day - d.honba) / (t1 - d.honba))));
  }

  function round1(v) { return Math.round(v * 10) / 10; }

  /* ================= めが でる じょうけん（小5） =================
     インゲンマメ。教科書の まとめ:「発芽には みず・くうき・てきとうな おんど が ひつよう」。
     ひかり と ひりょう は 発芽には いらない（たねの なかの でんぷんを つかって めを だす）。 */
  const FACTORS = [
    { key: 'water', name: 'みず', icon: '💧', on: 'みず あり', off: 'みず なし（かわいた わた）' },
    { key: 'air', name: 'くうき', icon: '🌬️', on: 'くうきに ふれる', off: 'みずに しずめる' },
    { key: 'temp', name: 'てきとうな おんど', icon: '🌡️', on: 'へやの なか（やく20℃）', off: 'れいぞうこ（やく5℃）' },
    { key: 'light', name: 'ひかり', icon: '☀️', on: 'あかるい', off: 'はこを かぶせる' },
    { key: 'fert', name: 'ひりょう', icon: '🧪', on: 'ひりょう あり', off: 'ひりょう なし' }
  ];
  const FACTOR = {};
  FACTORS.forEach(f => { FACTOR[f.key] = f; });

  // 発芽に ひつようか どうか（これが 結果表 そのもの）
  const NEEDS = { water: true, air: true, temp: true, light: false, fert: false };

  /* じっさいに できない くみあわせを なおす。
     ・みずに しずめる（くうき なし）なら みずは ある
     ・れいぞうこの なかは くらい（ひかり なし） */
  function fixCond(c) {
    const o = Object.assign({}, c);
    if (o.air === false) o.water = true;
    if (o.temp === false) o.light = false;
    return o;
  }

  function germinates(cond) {
    const c = fixCond(cond);
    return Object.keys(NEEDS).every(k => !NEEDS[k] || !!c[k]);
  }

  /* 2つの 条件を くらべる（対照実験）。
     result.kind:
       'same'    … じょうけんが ぜんぶ おなじ
       'many'    … 2つ いじょう ちがう → くらべられない
       'needed'  … 1つ だけ ちがって、けっかも ちがう → その じょうけんは ひつよう
       'notNeeded' … 1つ だけ ちがって、どちらも そだつ → なくても よい
       'unknown' … 1つ だけ ちがうが、どちらも だめ → ほかの じょうけんが たりない ので わからない */
  function compare(a, b, outcome, keys) {
    keys = keys || FACTORS.map(f => f.key);
    const ca = fixCond(a), cb = fixCond(b);
    const diff = keys.filter(k => !!ca[k] !== !!cb[k]);
    if (diff.length === 0) return { kind: 'same', diff };
    if (diff.length > 1) return { kind: 'many', diff };
    const ra = outcome(ca), rb = outcome(cb);
    if (ra !== rb) return { kind: 'needed', diff, factor: diff[0] };
    if (ra) return { kind: 'notNeeded', diff, factor: diff[0] };
    return { kind: 'unknown', diff, factor: diff[0] };
  }

  /* たねの なかの でんぷん（ヨウ素液で あおむらさき）。発芽して しばらく たつと へる。 */
  const STARCH = [
    { key: 'before', name: '{発芽|はつが}する まえの たね', color: '#3b2a6b', amount: 1, text: 'こい あおむらさきに なった。でんぷんが たくさん ある。' },
    { key: 'after', name: '{発芽|はつが}して しばらく たった {子葉|しよう}', color: '#c9b46a', amount: 0.1, text: 'ほとんど いろが かわらない。でんぷんは {発芽|はつが}や せいちょうに つかわれて へった。' }
  ];

  /* ================= よく そだつ じょうけん（小5） =================
     おなじ くらいに そだった インゲンマメの なえ（たかさ 8cm・ほんば 2まい）を 14日 そだてる。
     みず と おんど は どれも おなじ。ひかり と ひりょう を かえる。
       ひかり なし … くきは ひょろひょろ ながく のびるが ほそい。はは すくなく、きいろっぽい
       ひりょう なし … はが すくなく ちいさい。いろは うすい みどり
     cm … 1日に のびる めやす / leaf … 1日に ふえる はの かず / thick … くきの ふとさ（1＝ふつう） */
  const GROWTH = {
    'light+fert': { cm: 1.0, leaf: 0.6, thick: 1.0, color: '#2b8a3e', look: 'こい みどりで、くきが ふとく じょうぶ。はが たくさん。' },
    'light':      { cm: 0.55, leaf: 0.3, thick: 0.75, color: '#82c91e', look: 'みどりは うすめ。はが すくなく ちいさい。' },
    'fert':       { cm: 1.5, leaf: 0.15, thick: 0.45, color: '#d8c85a', look: 'ひょろひょろ ながい けど ほそい。はは きいろっぽくて すくない。' },
    'none':       { cm: 1.3, leaf: 0.1, thick: 0.4, color: '#e0d48a', look: 'ひょろひょろ ほそくて きいろっぽい。はも ほとんど ふえない。' }
  };
  const GROWTH_DAYS = 14;
  const GROWTH_START = { cm: 8, leaves: 2 };
  // まいにち すこしずつ ちがう のび（どの はちも おなじ ならび）
  const WIGGLE = [0.8, 1.1, 0.9, 1.2, 1.0, 0.85, 1.15, 0.95, 1.05, 1.1, 0.9, 1.0, 1.05, 0.95];

  function growthKey(c) {
    return c.light && c.fert ? 'light+fert' : c.light ? 'light' : c.fert ? 'fert' : 'none';
  }

  /* 1日ごとの きろく [{day, cm, add, leaves}] */
  function growthSeries(c) {
    const g = GROWTH[growthKey(c)];
    const out = [];
    let cm = GROWTH_START.cm, lf = GROWTH_START.leaves;
    for (let day = 1; day <= GROWTH_DAYS; day++) {
      const add = round1(g.cm * WIGGLE[day - 1]);
      cm = round1(cm + add);
      lf += g.leaf;
      out.push({ day, cm, add, leaves: Math.floor(lf + 1e-9) });
    }
    return out;
  }

  // 「よく そだった」＝ はが おおく、くきが ふとく、みどりが こい（せの たかさ だけ では きめない）
  function growsWell(c) { return !!(c.light && c.fert); }

  /* ================= はなの つくり と 受粉（小5） ================= */
  const FLOWERS = {
    asagao: {
      name: 'アサガオ', plant: 'asagao',
      parts: ['hanabira', 'gaku', 'oshibe', 'meshibe'],
      text: '1つの はなに おしべ（5本）と めしべ（1本）が ある。'
    },
    hechimaO: {
      name: 'ヘチマの おばな', plant: 'hechima',
      parts: ['hanabira', 'gaku', 'oshibe'],
      text: 'おばな には おしべ だけ。めしべ は ない。'
    },
    hechimaM: {
      name: 'ヘチマの めばな', plant: 'hechima',
      parts: ['hanabira', 'gaku', 'meshibe', 'fukurami'],
      text: 'めばな には めしべ だけ。はなの したの ふくらみが み に なる。'
    }
  };
  const PARTS = {
    hanabira: { name: 'はなびら', text: 'むしを よぶ めだつ いろ。' },
    gaku: { name: 'がく', text: 'はなびらの そとがわで はなを ささえる。' },
    oshibe: { name: 'おしべ', text: 'さきに {花粉|かふん}が ついて いる。' },
    meshibe: { name: 'めしべ', text: 'さきが べたべた して いて、{花粉|かふん}が つきやすい。' },
    fukurami: { name: 'ふくらみ（みに なる ところ）', text: 'めしべの もと。{受粉|じゅふん}すると そだって み に なる。' }
  };

  /* み が できるか（これも 結果表）。
     花粉が めしべの さきに つく（受粉）と、めしべの もとが み に なり、なかに たね が できる。
     アサガオは つぼみの なかで じぶんの 花粉が つく ので、くらべる ときは つぼみの うちに おしべを とり、
     ふくろを かぶせて ほかの 花粉も つかない ように する。 */
  function makesFruit(f) {
    // f:  flower:'asagao'
    if (f.flower === 'hechimaO') return false;               // おばなは み に ならない
    let pollen = !!f.pollinated;
    if (f.flower === 'asagao' && !f.stamensRemoved) pollen = true;  // じぶんの 花粉で 受粉
    if (!f.bagged && f.flower === 'hechimaM') pollen = pollen || !!f.insects; // むしが はこぶ ことも ある
    return pollen;
  }

  const API = {
    PLANTS, PLANT, STAGES, stageList, stageAt, heightAt, leavesAt,
    FACTORS, FACTOR, NEEDS, fixCond, germinates, compare, STARCH,
    GROWTH, GROWTH_DAYS, GROWTH_START, growthKey, growthSeries, growsWell,
    FLOWERS, PARTS, makesFruit
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.LAB = API;
})(this);
