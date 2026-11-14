'use strict';
/* まちの ひと と おはなし して ことばを ふやす（ごい）。
   あいさつ → あたらしい ことば → もんだい → おわかれ。まえに おぼえた ことば は ときどき ふくしゅう。
   ことばの いみ は 5〜6さい むけ に みじかく やさしく かいた もの。 */
(function () {
  const KEY = 'minatomirai-bouken-kotoba-v1';
  let D = { w: {}, talks: 0, greet: 0, badge: 0, last: '' };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') D = Object.assign(D, s); } catch (e) { /* つかえない */ }
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* いっぱい など */ } };

  // ---------------- ことば ----------------
  // k: なかま、e: え、m: いみ、x: つかいかた。q があれば その もんだい（p: もんだいぶん、a: こたえ、c: ほかの えらびかた）
  const CAT = {
    sea: '⚓ みなと', train: '🚃 でんしゃ', park: '🌳 こうえん', shop: '🛒 おみせ', town: '🏙️ まち', sky: '🌤️ そらと てんき',
    feel: '💗 きもち', oto: '🎵 ようすの ことば', hantai: '↔️ はんたいの ことば', kazu: '🔢 かぞえかた', job: '👷 おしごと', eigo: '🔤 えいご',
  };
  const W = [
    // みなと
    ['sea', 'みなと', '⚓', 'ふねが とまったり でたり する ところ', 'よこはまの みなとに おおきな ふねが きたよ'],
    ['sea', 'いかり', '⚓', 'ふねが ながされない ように うみの そこに おろす おもり', 'ふねが いかりを おろして とまった'],
    ['sea', 'とうだい', '🗼', 'よる ひかって ふねに みちを おしえる たかい たてもの', 'とうだいの ひかりが ぐるぐる まわる'],
    ['sea', 'すいへいせん', '🌅', 'うみと そらの さかいめに みえる まっすぐな せん', 'すいへいせんに おひさまが しずむ'],
    ['sea', 'きてき', '📯', 'ふねや きしゃが ならす おおきな おと', 'ボーッと きてきが なった'],
    ['sea', 'さんばし', '🛳️', 'うみに つきでた、ふねに のりおり する ところ', 'おおさんばしで ふねを みた'],
    ['sea', 'なみ', '🌊', 'うみの みずが もりあがって うごく もの', 'きょうは なみが たかいね'],
    ['sea', 'ふなのり', '🧑‍✈️', 'ふねに のって はたらく ひと', 'ふなのりさんが ロープを むすんだ'],
    // でんしゃ
    ['train', 'かいさつ', '🚪', 'きっぷや カードを とおして えきに はいる ところ', 'かいさつで ピッと タッチ'],
    ['train', 'ホーム', '🚉', 'でんしゃを まって のりおり する ところ', 'ホームの きいろい せんの うちがわで まとう'],
    ['train', 'のりかえ', '🔁', 'とちゅうで ちがう でんしゃに のりかえる こと', 'よこはまえきで のりかえよう'],
    ['train', 'しゅうてん', '🏁', 'でんしゃが さいごに とまる えき', 'しゅうてんまで のって いこう'],
    ['train', 'ふみきり', '🚦', 'せんろと みちが まじわる ところ。カンカン なる', 'ふみきりの まえで とまろう'],
    ['train', 'ていしゃ', '🛑', 'でんしゃや バスが とまる こと', 'つぎの えきに ていしゃ します'],
    ['train', 'うんてんし', '🧑‍✈️', 'でんしゃを うごかす ひと', 'うんてんしさんが ゆびを さして かくにん'],
    ['train', 'せんろ', '🛤️', 'でんしゃが はしる レール', 'せんろに はいっては だめ'],
    // こうえん
    ['park', 'ふんすい', '⛲', 'みずが うえに ふきだす しかけ', 'ふんすいの みずが きらきら'],
    ['park', 'こかげ', '🌳', 'きの したの ひかげ', 'あつい ひは こかげで やすもう'],
    ['park', 'しばふ', '🟩', 'みじかい くさが いちめんに はえた ところ', 'しばふで ごろんと ねころんだ'],
    ['park', 'つぼみ', '🌷', 'これから さく まえの はな', 'さくらの つぼみが ふくらんだ'],
    ['park', 'どんぐり', '🌰', 'かしや ならの きの み', 'こうえんで どんぐりを ひろった'],
    ['park', 'かだん', '🌼', 'はなを うえて ある ところ', 'かだんに チューリップが さいた'],
    ['park', 'てんとうむし', '🐞', 'あかい せなかに くろい てんてんの むし', 'てんとうむしが ゆびに のぼった'],
    ['park', 'はっぱ', '🍃', 'きや くさの みどりの ところ', 'あきは はっぱが あかく なる'],
    // おみせ
    ['shop', 'おつり', '🪙', 'おおめに はらった とき かえって くる おかね', '1000えん だして おつりを もらった'],
    ['shop', 'ねだん', '🏷️', 'しなものを かう ときの おかねの かず', 'この おもちゃの ねだんは いくら？'],
    ['shop', 'レシート', '🧾', 'かった ものと ねだんが かいて ある かみ', 'レシートを ママに わたした'],
    ['shop', 'うりきれ', '🈵', 'ぜんぶ うれて もう ない こと', 'にくまんが うりきれだった'],
    ['shop', 'しなもの', '📦', 'おみせで うって いる もの', 'たなに しなものが ならんで いる'],
    ['shop', 'かご', '🧺', 'かう ものを いれる いれもの', 'りんごを かごに いれた'],
    ['shop', 'レジ', '🖥️', 'おかねを はらう ところ', 'レジに ならんで まとう'],
    // まち
    ['town', 'こうばん', '👮', 'おまわりさんが いる ちいさな たてもの', 'みちに まよったら こうばんへ'],
    ['town', 'こうさてん', '✖️', 'みちと みちが まじわる ところ', 'こうさてんで しんごうを まった'],
    ['town', 'まがりかど', '↪️', 'みちが まがって いる ところ', 'まがりかどは よく みて あるこう'],
    ['town', 'ほどうきょう', '🌉', 'みちの うえを わたる ための はし', 'ほどうきょうを のぼって わたった'],
    ['town', 'かんばん', '🪧', 'おみせの なまえなどが かいて ある いた', 'あかい かんばんが めじるし'],
    ['town', 'ちかみち', '🏃', 'はやく つける みち', 'ちかみちでも くるまに きを つけて'],
    ['town', 'ポスト', '📮', 'てがみを いれる あかい はこ', 'ポストに てがみを いれた'],
    ['town', 'めじるし', '📍', 'ばしょを おぼえる ための もの', 'ランドマークタワーが めじるしだよ'],
    // そらと てんき
    ['sky', 'にわかあめ', '🌦️', 'きゅうに ふって すぐ やむ あめ', 'にわかあめで びしょぬれ'],
    ['sky', 'にじ', '🌈', 'あめの あとに そらに でる なないろの はし', 'にじが でた！'],
    ['sky', 'かみなり', '⚡', 'そらが ひかって ゴロゴロ なる こと', 'かみなりが なったら たてものの なかへ'],
    ['sky', 'ゆうやけ', '🌇', 'ゆうがた そらが あかく なる こと', 'ゆうやけが きれいだね'],
    ['sky', 'そよかぜ', '🍃', 'そっと ふく きもちいい かぜ', 'そよかぜが ふいて すずしい'],
    ['sky', 'きり', '🌫️', 'しろい けむりの ような ちいさな みずの つぶ', 'きりで ランドマークが みえない'],
    ['sky', 'まぶしい', '😎', 'ひかりが つよくて めを あけて いられない', 'おひさまが まぶしい'],
    ['sky', 'むしあつい', '🥵', 'あつくて じめじめ して いる', 'きょうは むしあついね'],
    // きもち
    ['feel', 'わくわく', '🤩', 'たのしみで こころが はずむ きもち', 'えんそくの まえの ひは わくわく'],
    ['feel', 'どきどき', '💓', 'しんぞうが はやく なる きもち', 'はっぴょうかいで どきどき'],
    ['feel', 'くやしい', '😣', 'まけたり できなかったり して ざんねんな きもち', 'かけっこで まけて くやしい'],
    ['feel', 'ほっとする', '😮‍💨', 'しんぱいが なくなって あんしん する', 'ママが きて ほっとした'],
    ['feel', 'がっかり', '😞', 'おもって いたのと ちがって ざんねん', 'あめで えんそくが なくなって がっかり'],
    ['feel', 'はずかしい', '😳', 'ひとに みられて かおが あかく なる きもち', 'まちがえて はずかしい'],
    ['feel', 'うれしい', '😊', 'いい ことが あって こころが あかるい', 'プレゼントを もらって うれしい'],
    ['feel', 'さみしい', '🥺', 'ひとりで こころが ぽっかり する', 'パパが いなくて さみしい'],
    // ようすの ことば
    ['oto', 'ぴかぴか', '✨', 'きれいに ひかって いる ようす', 'くつを みがいて ぴかぴか'],
    ['oto', 'ふわふわ', '☁️', 'やわらかくて かるい ようす', 'ふわふわの パンケーキ'],
    ['oto', 'ざあざあ', '🌧️', 'あめが たくさん ふる おと', 'あめが ざあざあ ふって きた'],
    ['oto', 'しとしと', '🌂', 'あめが しずかに ふる ようす', 'あさから あめが しとしと'],
    ['oto', 'ぽかぽか', '🌞', 'あたたかくて きもちいい ようす', 'はるの ひは ぽかぽか'],
    ['oto', 'ゆらゆら', '🎐', 'ゆっくり ゆれる ようす', 'ふねが ゆらゆら ゆれる'],
    ['oto', 'ぺこぺこ', '🍙', 'おなかが とても すいた ようす', 'おなかが ぺこぺこ'],
    ['oto', 'ぐつぐつ', '🍲', 'なべが にえる おと', 'カレーが ぐつぐつ にえて いる'],
    // はんたいの ことば
    ['hantai', 'たかい', '🗼', 'うえの ほうまで ある（はんたいは ひくい）', 'ランドマークタワーは たかい', { p: '「たかい」の はんたいは？', a: 'ひくい', c: ['ながい', 'おもい'] }],
    ['hantai', 'ふかい', '🌊', 'そこまで とおい（はんたいは あさい）', 'うみは ふかい', { p: '「ふかい」の はんたいは？', a: 'あさい', c: ['ひくい', 'せまい'] }],
    ['hantai', 'ひろい', '🏞️', 'ばしょが おおきい（はんたいは せまい）', 'りんこうパークは ひろい', { p: '「ひろい」の はんたいは？', a: 'せまい', c: ['ほそい', 'かるい'] }],
    ['hantai', 'おもい', '🏋️', 'もちあげるのが たいへん（はんたいは かるい）', 'スイカは おもい', { p: '「おもい」の はんたいは？', a: 'かるい', c: ['ひくい', 'あさい'] }],
    ['hantai', 'はやい', '🚄', 'すすむのに じかんが かからない（はんたいは おそい）', 'しんかんせんは はやい', { p: '「はやい」の はんたいは？', a: 'おそい', c: ['せまい', 'みじかい'] }],
    ['hantai', 'ながい', '🦒', 'はしから はしまで とおい（はんたいは みじかい）', 'きりんの くびは ながい', { p: '「ながい」の はんたいは？', a: 'みじかい', c: ['ひくい', 'おそい'] }],
    ['hantai', 'あつい', '☀️', 'てんきや ものが あたたかすぎる（はんたいは さむい・つめたい）', 'なつは あつい', { p: '「あつい なつ」の はんたいは「◯◯ ふゆ」。◯◯ は？', a: 'さむい', c: ['ひろい', 'かるい'] }],
    ['hantai', 'あかるい', '💡', 'ひかりが たくさん ある（はんたいは くらい）', 'ひるまは あかるい', { p: '「あかるい」の はんたいは？', a: 'くらい', c: ['ちいさい', 'おそい'] }],
    // かぞえかた
    ['kazu', 'ほん', '✏️', 'えんぴつや かさなど ほそながい ものを かぞえる ことば', 'えんぴつ が 2ほん', { p: '✏️✏️ えんぴつ が 2… なに？', a: '2ほん', c: ['2まい', '2ひき'] }],
    ['kazu', 'まい', '📄', 'かみや おさらなど うすい ものを かぞえる ことば', 'かみが 3まい', { p: '📄📄📄 かみ が 3… なに？', a: '3まい', c: ['3ぼん', '3だい'] }],
    ['kazu', 'ひき', '🐱', 'ねこや さかなを かぞえる ことば', 'ねこが 1ぴき', { p: '🐱🐱 ねこ が 2… なに？', a: '2ひき', c: ['2ほん', '2こ'] }],
    ['kazu', 'わ', '🐦', 'とりや うさぎを かぞえる ことば', 'かもめが 3わ', { p: '🐦🐦🐦 とり が 3… なに？', a: '3わ', c: ['3まい', '3だい'] }],
    ['kazu', 'だい', '🚗', 'くるまや じてんしゃを かぞえる ことば', 'バスが 2だい', { p: '🚗🚗 くるま が 2… なに？', a: '2だい', c: ['2ひき', '2ほん'] }],
    ['kazu', 'さつ', '📚', 'ほんや ノートを かぞえる ことば', 'えほんを 3さつ よんだ', { p: '📕📗📘 ほん が 3… なに？', a: '3さつ', c: ['3まい', '3こ'] }],
    ['kazu', 'せき', '🚢', 'おおきな ふねを かぞえる ことば', 'みなとに ふねが 2せき', { p: '🚢🚢 ふね が 2… なに？', a: '2せき', c: ['2ほん', '2わ'] }],
    ['kazu', 'とう', '🐘', 'ぞうや うまなど おおきな どうぶつを かぞえる ことば', 'ぞうが 1とう', { p: '🐘 ぞう が 1… なに？', a: '1とう', c: ['1まい', '1ぽん'] }],
    // おしごと
    ['job', 'おまわりさん', '👮', 'まちの あんぜんを まもる ひと', 'おまわりさんに みちを きいた'],
    ['job', 'しょうぼうし', '🧑‍🚒', 'かじを けしたり ひとを たすけたり する ひと', 'しょうぼうしさん かっこいい'],
    ['job', 'ゆうびんやさん', '📮', 'てがみや にもつを とどける ひと', 'ゆうびんやさんが てがみを くれた'],
    ['job', 'だいくさん', '🔨', 'いえや たてものを つくる ひと', 'だいくさんが トントン'],
    ['job', 'かんごしさん', '👩‍⚕️', 'びょういんで おいしゃさんを てつだう ひと', 'かんごしさんが やさしかった'],
    ['job', 'えきいんさん', '🚉', 'えきで はたらく ひと', 'えきいんさんに きっぷを みせた'],
    ['job', 'はいたつ', '📦', 'にもつを いえまで はこぶ こと', 'たくはいびんの はいたつ'],
    ['job', 'コックさん', '👨‍🍳', 'りょうりを つくる ひと', 'コックさんの オムライス'],
    // えいご
    ['eigo', 'ハロー', '👋', 'Hello（こんにちは）', 'ハロー！ と てを ふった'],
    ['eigo', 'サンキュー', '🙏', 'Thank you（ありがとう）', 'みちを おしえて もらって サンキュー'],
    ['eigo', 'グッバイ', '👋', 'Goodbye（さようなら）', 'グッバイ、また あした'],
    ['eigo', 'イエス', '🙆', 'Yes（はい）', 'イエス！ と こたえた'],
    ['eigo', 'ノー', '🙅', 'No（いいえ）', 'ノー サンキュー（いりません）'],
    ['eigo', 'シップ', '🚢', 'ship（ふね）', 'ビッグ シップ！ おおきな ふね'],
    ['eigo', 'トレイン', '🚃', 'train（でんしゃ）', 'トレインに のろう'],
    ['eigo', 'シー', '🌊', 'sea（うみ）', 'ブルー シー（あおい うみ）'],
  ].map(([k, w, e, m, x, q], i) => ({ id: k + i, k, w, e, m, x, q }));
  const byId = (id) => W.find((v) => v.id === id);

  // ---------------- まちの ひと ----------------
  const PEOPLE = {
    granny: { n: 'おばあさん', e: '👵', cats: ['feel', 'sky', 'oto'], hi: 'あら、あおちゃん。', bye: 'げんきで ね。' },
    police: { n: 'おまわりさん', e: '👮', cats: ['town', 'job'], hi: 'やあ、ぼく。きを つけて あるいてる？', bye: 'くるまに きを つけてね！' },
    sailor: { n: 'ふなのりさん', e: '🧑‍✈️', cats: ['sea', 'kazu'], hi: 'よう！ うみは すきかい？', bye: 'また みなとで あおう！' },
    station: { n: 'えきいんさん', e: '🚉', cats: ['train', 'job'], hi: 'こんにちは。でんしゃ すき？', bye: 'いってらっしゃい！' },
    shop: { n: 'おみせの ひと', e: '🧑‍💼', cats: ['shop', 'kazu'], hi: 'いらっしゃい！ おかいもの？', bye: 'まいど ありがとう！' },
    gardener: { n: 'こうえんの ひと', e: '🧑‍🌾', cats: ['park', 'sky'], hi: 'こんにちは。おはなを みに きたの？', bye: 'また あそびに きてね。' },
    student: { n: 'おにいさん', e: '🧑‍🎓', cats: ['hantai', 'oto', 'feel'], hi: 'やあ！ ことば クイズ しない？', bye: 'じゃあね、また クイズ しよう！' },
    tourist: { n: 'りょこうの ひと', e: '🧳', cats: ['eigo'], hi: 'Hello! ハロー！', bye: 'Goodbye! グッバイ！', en: 1 },
    post: { n: 'ゆうびんやさん', e: '📮', cats: ['town', 'job', 'kazu'], hi: 'こんにちは！ てがみを とどけて いるんだ。', bye: 'ポストで まってるよ！' },
    cook: { n: 'コックさん', e: '👨‍🍳', cats: ['oto', 'shop', 'job'], hi: 'いい におい するでしょ？', bye: 'ごはん いっぱい たべてね！' },
    dog: { n: 'いぬの さんぽの ひと', e: '🐕', cats: ['feel', 'park', 'oto'], hi: 'こんにちは。この こは ポチ だよ。', bye: 'ポチも バイバイ って！' },
    mama2: { n: 'あかちゃんの ママ', e: '👶', cats: ['feel', 'kazu', 'sky'], hi: 'こんにちは。おにいちゃん えらいね。', bye: 'あかちゃんも にこにこ。またね。' },
  };
  // ばしょ に あう ひと
  const BY_PLACE = { sea: ['sailor', 'tourist', 'granny', 'dog'], station: ['station', 'student', 'post', 'tourist'], shop: ['shop', 'cook', 'mama2', 'tourist'], park: ['gardener', 'dog', 'granny', 'mama2'], town: ['police', 'post', 'student', 'granny', 'mama2'] };

  // ---------------- がめん ----------------
  let root, ctx;
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
  const btn = (label, cls, fn) => { const b = el('button', cls || 'sbig', label); b.addEventListener('click', fn); return b; };
  const sfx = (n) => ctx && ctx.sfx && ctx.sfx(n);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function bubble(face, name, text) { root.appendChild(el('div', 'ktalk', `<span class="kf">${face}</span><span class="kb"><small>${name}</small>${text}</span>`)); }
  function aoSays(text) { root.appendChild(el('div', 'ktalk me', `<span class="kb"><small>あおちゃん</small>${text}</span><span class="kf">🧢</span>`)); }
  function head(P) { root.innerHTML = ''; root.className = 'sroom kotoba'; root.appendChild(el('div', 'shead', `<b>💬 ${P.n} と おはなし</b><small>ことば ずかん ${learnedCount()} / ${W.length}</small>`)); }
  const learnedCount = () => W.filter((v) => D.w[v.id] && D.w[v.id].ok > 0).length;
  const mastered = (v) => D.w[v.id] && D.w[v.id].ok >= 3;
  function greetingFor(h, en) {
    if (en) return { a: 'ハロー！', c: ['グッバイ！', 'いただきます！'] };
    if (h < 10.5) return { a: 'おはよう ございます', c: ['こんばんは', 'おやすみなさい'] };
    if (h < 17.5) return { a: 'こんにちは', c: ['おはよう ございます', 'おやすみなさい'] };
    return { a: 'こんばんは', c: ['おはよう ございます', 'いただきます'] };
  }
  function choose(question, ans, others, onOk) {
    root.appendChild(el('div', 'kq2', question));
    const g = el('div', 'kchoice'); let tried = 0;
    shuffle([ans].concat(others)).forEach((c) => {
      const b = btn(c, 'kch2', () => {
        if (b.classList.contains('ng') || g.dataset.done) return;
        if (c === ans) { g.dataset.done = 1; b.classList.add('ok'); sfx('star'); onOk(tried === 0); }
        else { tried++; b.classList.add('ng'); sfx('ng'); }
      });
      g.appendChild(b);
    });
    root.appendChild(g);
  }
  function pickWord(P) {
    // ふくしゅう（まえに おぼえた ことば）を ときどき、なければ あたらしい ことば
    const pool = W.filter((v) => P.cats.includes(v.k));
    const fresh = pool.filter((v) => !D.w[v.id]);
    const review = W.filter((v) => D.w[v.id] && !mastered(v) && D.w[v.id].at < D.talks - 1);
    if (review.length && (Math.random() < 0.4 || !fresh.length)) return { v: review[(Math.random() * review.length) | 0], review: true };
    if (fresh.length) return { v: fresh[(Math.random() * fresh.length) | 0], review: false };
    const any = pool.length ? pool : W; return { v: any[(Math.random() * any.length) | 0], review: true };
  }
  function quizOf(v) {
    if (v.q) return { p: v.q.p, a: v.q.a, c: v.q.c };
    const others = shuffle(W.filter((o) => o.k === v.k && o.id !== v.id)).slice(0, 2).map((o) => `${o.e} ${o.m}`);
    return { p: `「${v.w}」って どれ？`, a: `${v.e} ${v.m}`, c: others };
  }
  function talk(c) {
    ctx = c; root = document.getElementById('talkRoot');
    const P = PEOPLE[c.who] || PEOPLE.granny; D.talks++; store();
    head(P);
    // 1. あいさつ
    const g = greetingFor(c.hour, P.en);
    bubble(P.e, P.n, P.hi);
    choose('🧢 なんて いう？（あいさつ を えらんでね）', g.a, g.c, (first) => {
      aoSays(g.a); if (first) { D.greet++; store(); }
      bubble(P.e, P.n, first ? 'まあ、じょうずな あいさつ！ 👏' : 'そうそう、それが ぴったり！');
      setTimeout(() => lesson(P), 700);
    });
  }
  function lesson(P) {
    const { v, review } = pickWord(P), isNew = !D.w[v.id];
    head(P);
    if (review) bubble(P.e, P.n, `まえに おぼえた ことば、おぼえてる？「<b>${v.w}</b>」`);
    else {
      bubble(P.e, P.n, `「<b>${v.w}</b>」って しってる？`);
      root.appendChild(el('div', 'kcard', `<i>${v.e}</i><b>${v.w}</b><span>${v.m}</span><em>たとえば：「${v.x}」</em>`));
    }
    const q = quizOf(v);
    root.appendChild(btn(review ? '🙋 こたえる！' : '💡 わかった！ もんだい を だして', 'sbig', (e) => {
      e.currentTarget.remove();
      const card = root.querySelector('.kcard'); if (card) card.classList.add('hide');   // おぼえて いるか ためす
      choose(`❓ ${q.p}`, q.a, q.c, (first) => {
        const r = D.w[v.id] = D.w[v.id] || { ok: 0, ng: 0, at: 0 }; r.at = D.talks;
        if (first) r.ok++; else r.ng++;
        if (isNew && !r.ok) r.ok = 1;
        D.last = v.id; store();
        const n = learnedCount();
        bubble(P.e, P.n, first ? (review ? 'すごい！ ちゃんと おぼえてたね 🌟' : 'せいかい！ ひとつ ことばを おぼえたね 🌟') : 'そうそう！ これで ばっちり。');
        if (isNew) root.appendChild(el('div', 'prize small', `<i>📖</i><b>ことば ずかん に のったよ！</b><span>${v.e} ${v.w}（${n}こ め）</span>`));
        if (mastered(v)) root.appendChild(el('p', 'desc', `⭐ 「${v.w}」 は もう しっかり おぼえた！`));
        let gift = '';
        if (isNew && n % 10 === 0 && D.badge < n / 10) { D.badge = n / 10; store(); gift = n; ctx.reward && ctx.reward({ words: n }); }
        if (gift) root.appendChild(el('div', 'prize', `<i>🎓</i><b>ことば はかせ ${D.badge}だん！</b><span>${gift}この ことば を おぼえた。ママから 100えん</span>`));
        bye(P);
      });
    }));
  }
  function bye(P) {
    root.appendChild(el('div', 'kq2', '👋 おわかれ の ことば は？'));
    const g = el('div', 'kchoice');
    const opts = P.en ? [['サンキュー！ グッバイ！', 1], ['いただきます！', 0]] : [['ありがとう ございました！', 1], ['さようなら！', 1], ['いただきます！', 0]];
    opts.forEach(([t, ok]) => g.appendChild(btn(t, 'kch2', (e) => {
      if (!ok) { e.currentTarget.classList.add('ng'); sfx('ng'); return; }
      aoSays(t); bubble(P.e, P.n, P.bye); sfx('pick');
      g.remove(); root.appendChild(btn('🚶 また あるく', 'sbig', () => ctx.onClose && ctx.onClose()));
    })));
    root.appendChild(g);
  }
  // ---------------- ことば ずかん ----------------
  function zukan(c, done) {
    ctx = c; root = c.root || document.getElementById('talkRoot');
    root.innerHTML = ''; root.className = 'sroom kotoba';
    root.appendChild(el('div', 'shead', `<b>📖 ことば ずかん</b><small>おぼえた ことば ${learnedCount()} / ${W.length} ・ ⭐ しっかり ${W.filter(mastered).length}</small>`));
    Object.keys(CAT).forEach((k) => {
      const list = W.filter((v) => v.k === k), got = list.filter((v) => D.w[v.id]);
      root.appendChild(el('div', 'tlabel', `${CAT[k]}（${got.length}/${list.length}）`));
      const g = el('div', 'zgrid kz');
      list.forEach((v) => {
        const r = D.w[v.id];
        const cdv = el('button', 'zcard' + (r ? '' : ' none'), r ? `<i>${v.e}</i><b>${v.w}${mastered(v) ? ' ⭐' : ''}</b><small>${v.m}</small>` : '<i>❔</i><b>？？？</b><small>まちの ひとに きいてみよう</small>');
        if (r) cdv.addEventListener('click', () => { sfx('tap'); alert(`${v.e} ${v.w}\n\n${v.m}\n\nたとえば：「${v.x}」`); });
        g.appendChild(cdv);
      });
      root.appendChild(g);
    });
    root.appendChild(btn(done ? '← もどる' : 'とじる', 'sbig', () => (done ? done() : ctx.onClose && ctx.onClose())));
  }
  // ママが おぼえた ことば を つかって はなす
  function mamaLine() {
    const got = W.filter((v) => D.w[v.id]); if (!got.length) return null;
    const v = got[(Math.random() * got.length) | 0];
    return pick2([`あおちゃん、「${v.w}」って おぼえてる？ ${v.m} だったね ${v.e}`, `「${v.x}」…って まちの ひとが いってたね ${v.e}`, `${v.e} 「${v.w}」、じょうずに つかえるかな？`]);
  }
  const pick2 = (a) => a[(Math.random() * a.length) | 0];
  window.Kotoba = { talk, zukan, mamaLine, PEOPLE, BY_PLACE, W, count: learnedCount, get data() { return D; } };
})();
