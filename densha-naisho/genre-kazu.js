'use strict';
/* かず・けいさん */
Naisho.addGenre({
  id: 'kazu', name: 'かず', emoji: '🔢', color: '#ffb13b',
  talks: [
    { id: 'renketsu', f: function (c) {
      const a = rint(1, 4); const b = rint(1, 4);
      return [
        S('{me}の なかまが ' + a + 'りょう ならんで いるよ。', { show: { cars: [a] } }),
        QN('そこへ ' + b + 'りょう ガチャンと つなぐよ。ぜんぶで なんりょうかな?', a + b, 'りょう',
          { show: { cars: [a, b] }, fx: 'couple', hint: 'ひとつずつ ゆびで かぞえて みよう。', yes: a + 'と ' + b + 'で ' + (a + b) + 'りょう{da}。ながく なった{ne}!' }),
      ];
    } },
    { id: 'kirihanashi', f: function (c) {
      const a = rint(4, 7); const b = rint(1, 3);
      return [
        S(a + 'りょうの でんしゃが はしって きたよ。', { show: { cars: [a] }, fx: 'gatan' }),
        QN('えきで ' + b + 'りょう きりはなしたよ。のこりは なんりょう?', a - b, 'りょう',
          { show: { cars: [a], off: b }, hint: 'うすく なった でんしゃは もう いないよ。のこりを かぞえよう。', yes: a + 'から ' + b + ' へると ' + (a - b) + 'りょう{da}。' }),
      ];
    } },
    { id: 'hoshi-kazoe', f: function (c) {
      const n = rint(4, 9);
      return [
        S('みて、よぞらに ほしが でた{yo}。'),
        QN('ライトで うつすよ。ほしは いくつ あるかな?', n, 'こ', { show: { e: rep('⭐', n) }, hint: 'ひだりから じゅんばんに かぞえて みよう。', yes: n + 'こ{da}。かぞえるの じょうず{dane}!' }),
      ];
    } },
    { id: 'dotchi-ooi', f: function (c) {
      let a = rint(2, 6); let b = rint(2, 6); if (a === b) b += 1;
      const right = a > b ? '🍎 りんご' : '🍊 みかん';
      const wrong = a > b ? '🍊 みかん' : '🍎 りんご';
      return [
        S('おきゃくさんが くだものを もって のって きたよ。', { show: { e: rep('🍎', a) + '\n' + rep('🍊', b) } }),
        QA('りんごと みかん、おおいのは どっち?', right, [wrong], { hint: 'りんごは ' + a + 'こ、みかんは ' + b + 'こ{da}。', yes: 'りんごが ' + a + 'こ、みかんが ' + b + 'こ。' + Math.max(a, b) + 'の ほうが おおきい かず{da}。' }),
      ];
    } },
    { id: 'bansen', f: function (c) {
      const s = rint(1, 6);
      return [
        S('えきの ホームには ばんごうが ある{nda}。', { show: { txt: s + ' → ' + (s + 1) + ' → ' + (s + 2) + ' → ?' } }),
        QN(s + 'ばんせん、' + (s + 1) + 'ばんせん、' + (s + 2) + 'ばんせん。つぎは なんばんせん?', s + 3, 'ばんせん', { hint: (s + 2) + 'の つぎの かず{da}。', yes: 'かずは 1つずつ ふえて いく{nda}。' }),
      ];
    } },
    { id: 'zaseki10', f: function (c) {
      const a = rint(5, 9);
      return [
        S('この しゃりょうには ざせきが 10こ あるよ。', { show: { e: rep('💺', 10) } }),
        QN(a + 'にん すわったよ。あと なんにん すわれる?', 10 - a, 'にん', { show: { e: rep('🧒', a) + rep('💺', 10 - a) }, hint: 'あいて いる いすを かぞえて みよう。', yes: a + 'と ' + (10 - a) + 'で ちょうど 10{da}。' }),
      ];
    } },
    { id: 'tokei', f: function (c) {
      const h = rint(1, 11);
      return [
        S('でんしゃは じかんを まもって はしる{nda}。とけいを うつすよ。', { show: { clock: h } }),
        QN('ながい はりが 12、あかい みじかい はりは ここ。なんじかな?', h, 'じ', { hint: 'あかい みじかい はりが さして いる すうじを みて。', yes: h + 'じ ちょうど{da}。しゅっぱつ しんこう!', fx: 'door' }),
      ];
    } },
    { id: 'juuen', f: function (c) {
      const n = rint(2, 5);
      return [
        S('きっぷを かうよ。10えんだまを ならべる{ne}。', { show: { e: rep('🪙', n) } }),
        { k: 'ask', text: '10えんだまが ' + n + 'まい。ぜんぶで なんえん?', choices: [(n - 1) * 10 + 'えん', n * 10 + 'えん', (n + 1) * 10 + 'えん'], ok: 1, mix: false,
          hint: '10、20、30… と 10ずつ かぞえよう。', yes: '10が ' + n + 'こで ' + n * 10 + 'えん{da}。' },
      ];
    } },
    { id: 'nagasa-kurabe', f: function (c) {
      const o = pick(TRAINS.filter(function (x) { return x.id !== c.t.id && x.cars !== c.t.cars && x.cars > 1; }));
      const me = c.t.cars; const longer = me > o.cars ? c.t.name : o.name; const shorter = me > o.cars ? o.name : c.t.name;
      if (me === 1) return [
        S('{me}は きかんしゃ 1りょう。でも うしろに きゃくしゃを なんりょうも ひっぱれる{nda}。', { show: { cars: [1] } }),
        QN('きかんしゃ 1りょうが きゃくしゃ 5りょうを ひっぱるよ。あわせて なんりょう?', 6, 'りょう', { show: { cars: [1, 5] }, hint: '1と 5を あわせると?', yes: 'ちからもち{da}。ポッポー!', fx: 'horn' }),
      ];
      return [
        S('{me}は ' + me + 'りょう。' + o.name + 'は ' + o.cars + 'りょう なんだって。', { show: { txt: c.t.name + ' ' + me + '\n' + o.name + ' ' + o.cars } }),
        QA('ながいのは どっちかな?', longer, [shorter], { hint: me + 'と ' + o.cars + '、おおきい かずは どっち?', yes: Math.max(me, o.cars) + 'の ほうが おおきいから、' + longer + 'が ながい{nda}。' }),
      ];
    } },
    { id: 'hanbunko', f: function (c) {
      const n = pick([2, 4, 6, 8]);
      return [
        S('えきべんに だんごが ' + n + 'こ はいって いたよ。', { show: { e: rep('🍡', n) } }),
        QN('{n}と ともだち、ふたりで おなじ かずに わけよう。ひとり なんこ?', n / 2, 'こ', { show: { e: rep('🍡', n / 2) + '\n' + rep('🍡', n / 2) }, hint: 'うえと した、おなじ かずに わけたよ。', yes: 'はんぶんこ{da}。なかよし{dane}!' }),
      ];
    } },
    { id: 'eki-ikutsu', f: function (c) {
      const a = rint(2, 5);
      return [
        S('{me}が えきを すすむよ。いま 1ばんめの えき。', { show: { txt: '① → ? ' } }),
        QN('ここから ' + a + 'えき すすむと、なんばんめの えきに つく?', 1 + a, 'ばんめ', { fx: 'gatan', hint: '1から ' + a + 'かい かぞえて すすもう。', yes: '1に ' + a + 'を たすと ' + (1 + a) + '{da}。' }),
      ];
    } },
  ],
});
