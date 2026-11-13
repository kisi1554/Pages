'use strict';
/* かたち・ずけい */
Naisho.addGenre({
  id: 'katachi', name: 'かたち', emoji: '🔺', color: '#63e6be',
  talks: [
    { id: 'maru-sagashi', need: function (c) { return !!c.t.shapes.maru; }, f: function (c) {
      const p = c.t.shapes.maru;
      return [
        S('{me}の からだには いろんな かたちが かくれて いる{nda}。', { show: { shape: 'maru' } }),
        T('まるい ところを さがして、タップして みて!', p, { yes: 'みつけた{ne}! ' + PART_NAME[p] + 'は まんまる{da}。', fx: 'beam' }),
      ];
    } },
    { id: 'shikaku-sagashi', need: function (c) { return !!c.t.shapes.shikaku; }, f: function (c) {
      const p = c.t.shapes.shikaku;
      return [
        S('こんどは しかく{da}。かどが 4つ ある かたち。', { show: { shape: 'nagashikaku' } }),
        T('{me}の からだで しかくい ところは どこかな? タップ!', p, { yes: 'そう! ' + PART_NAME[p] + 'は しかくい{nda}。', fx: p === 'window' ? 'wiper' : 'beam' }),
      ];
    } },
    { id: 'namae', f: function (c) {
      const d = pick([['maru', 'まる', ['さんかく', 'しかく']], ['sankaku', 'さんかく', ['まる', 'しかく']], ['shikaku', 'しかく', ['まる', 'さんかく']], ['hoshi', 'ほし', ['まる', 'しかく']], ['daen', 'だえん', ['さんかく', 'ほし']], ['hishi', 'ひしがた', ['まる', 'ほし']]]);
      return [
        S('ライトで かたちを うつす{yo}。じゃーん。', { show: { shape: d[0] }, fx: 'beam' }),
        QA('この かたちの なまえは なあに?', d[1], d[2], { hint: 'かどが あるかな? まるいかな?', yes: '「' + d[1] + '」{da}。' + (d[0] === 'daen' ? 'たまご みたいな ながい まる{dane}。' : d[0] === 'hishi' ? 'パンタグラフも ひしがた{da}。' : 'よく しって いる{ne}!') }),
      ];
    } },
    { id: 'kado', f: function (c) {
      const d = pick([['sankaku', 'さんかく', 3], ['shikaku', 'しかく', 4], ['hoshi', 'ほし', 5], ['rokkaku', 'ろっかく', 6]]);
      return [
        S('かたちの「かど」を かぞえて みよう。とんがって いる ところ{da}。', { show: { shape: d[0] } }),
        QN(d[1] + 'の かどは いくつ あるかな?', d[2], 'こ', { hint: 'とんがりを ひとつずつ かぞえて みよう。', yes: d[1] + 'の かどは ' + d[2] + 'こ{da}。' + (d[2] === 3 ? '「さん」かく だから 3{nda}。' : '') }),
      ];
    } },
    { id: 'gattai', f: function (c) {
      const d = pick([
        [['sankaku', 'sakasa'], 'さんかくを 2つ くっつけると', 'しかく', ['まる', 'ほし'], 'shikaku'],
        [['shikaku', 'shikaku'], 'ましかくを 2つ ならべると', 'ながしかく', ['さんかく', 'まる'], 'nagashikaku'],
        [['sankaku', 'shikaku'], 'しかくの うえに さんかくを のせると', 'おうちの かたち', ['ボールの かたち', 'ほしの かたち'], null],
      ]);
      return [
        S('かたちの がったい! でんしゃの れんけつ みたい{dane}。', { show: { shapes: d[0] }, fx: 'couple' }),
        QA(d[1] + '、なにに なる?', d[2], d[3], { hint: 'あたまの なかで ぴったり くっつけて みよう。', yes: d[2] + 'に なった{ne}!', show: d[4] ? { shape: d[4] } : { e: '🏠' } }),
      ];
    } },
    { id: 'hyoushiki', f: function (c) {
      const d = pick([
        ['しんごうの あかりは どんな かたち?', 'まる', ['さんかく', 'しかく'], { shape: 'maru' }, 'sig-ao'],
        ['ふみきりの しるしは どんな かたち?', 'バッテン', ['まる', 'ほし'], { shape: 'batsu' }, 'crossing'],
        ['「とまれ」の ひょうしきは どんな かたち?', 'さかさまの さんかく', ['まる', 'しかく'], { shape: 'sakasa' }, null],
        ['えきの なまえの かんばんは どんな かたち?', 'ながしかく', ['まる', 'さんかく'], { shape: 'nagashikaku' }, null],
      ]);
      return [
        S('まちには かたちの サインが いっぱい ある{nda}。'),
        QA(d[0], d[1], d[2], { hint: 'おさんぽの とき みた こと あるかな?', yes: 'ほら、' + d[1] + '{da}。こんど そとで さがして みてね。', fx: d[4] }),
        S('かたちで いみが わかるように なって いる{nda}。', { show: d[3] }),
      ];
    } },
    { id: 'nagai-rail', f: function (c) {
      const a = rint(3, 9); let b = rint(3, 9); if (a === b) b = a > 5 ? a - 2 : a + 2;
      return [
        S('レールを 2ほん ならべた{yo}。', { show: { bars: [a, b] } }),
        QA('ながい レールは どっち?', a > b ? '⬆️ うえ' : '⬇️ した', [a > b ? '⬇️ した' : '⬆️ うえ'], { hint: 'はしっこを そろえて くらべて みよう。', yes: 'ながさ くらべ、できた{ne}!' }),
      ];
    } },
    { id: 'onaji', f: function (c) {
      const d = pick([
        ['maru', 'まる', '⚽ ボール', ['📱 スマホ', '📐 じょうぎ']], ['nagashikaku', 'しかく', '📖 ほん', ['🍩 ドーナツ', '🍙 おにぎり']],
        ['sankaku', 'さんかく', '🍙 おにぎり', ['🍪 クッキー', '📺 テレビ']], ['maru', 'まる', '🕐 とけい', ['🚪 ドア', '⛺ テント']],
      ]);
      return [
        S('おなじ かたち さがし{da}。これは「' + d[1] + '」。', { show: { shape: d[0] } }),
        QA('「' + d[1] + '」と おなじ かたちは どれ?', d[2], d[3], { hint: 'かどの かずを くらべて みよう。', yes: d[2].split(' ')[1] + 'は ' + d[1] + '{da}。おうちでも さがして みてね。' }),
      ];
    } },
    { id: 'migi-hidari', need: function (c) { return c.t.id !== 'd51'; }, f: function (c) {
      const right = Math.random() < 0.5;
      return [
        S('{me}の ライトは 2つ。みぎと ひだりに ある{nda}。'),
        T('{n}から みて「' + (right ? 'みぎ' : 'ひだり') + '」の ライトを タップ!', { part: 'light', side: right ? 'R' : 'L' },
          { hint: (right ? 'みぎは おはしを もつ ほうの て' : 'ひだりは おちゃわんを もつ ほうの て') + 'の ほう{da}。', yes: 'そっちが ' + (right ? 'みぎ' : 'ひだり') + '{da}。ピカッ!', fx: 'beam' }),
      ];
    } },
    { id: 'moyou', f: function (c) {
      const p = pick([['🔴', '🔵'], ['🟡', '🟢'], ['⭐', '🌙'], ['🚃', '🚌']]);
      const three = Math.random() < 0.4;
      const seq = three ? [p[0], p[0], p[1], p[0], p[0]] : [p[0], p[1], p[0], p[1], p[0]];
      return [
        S('じゅんばんの もよう{da}。きまりを みつけてね。', { show: { e: seq.join(' ') + ' ❓' } }),
        QA('つぎに くるのは どっち?', p[1], [p[0]], { hint: 'さいしょから こえに だして よんで みよう。', yes: 'きまりを みつけた{ne}! ふみきりの ランプも かわりばんこ{da}。', fx: 'crossing' }),
      ];
    } },
  ],
});
