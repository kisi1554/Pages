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
    food: '🍳 たべもの', iro: '🎨 いろと かたち', karada: '🧍 からだ', ikimono: '🐾 いきもの',
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
    // たべもの
    ['food', 'こむぎこ', '🌾', 'パンや うどんの もとに なる こな', 'こむぎこで パンを つくる'],
    ['food', 'やきたて', '🥐', 'やいた ばかりで あつあつ', 'やきたての パンは いい におい'],
    ['food', 'あまい', '🍰', 'さとうの ような あじ', 'ケーキは あまい'],
    ['food', 'すっぱい', '🍋', 'レモンの ような あじ', 'うめぼしは すっぱい'],
    ['food', 'しゅん', '🍓', 'たべものが いちばん おいしい じき', 'いちごの しゅんは はる'],
    ['food', 'しょくぶつ', '🥕', 'つちから はえて そだつ もの。やさいも そう', 'にんじんは しょくぶつの ね'],
    ['food', 'えいよう', '💪', 'からだを げんきに する もと', 'やさいは えいようが いっぱい'],
    ['food', 'いただきます', '🙏', 'たべる まえに いう あいさつ', 'みんなで「いただきます」'],
    // いろと かたち
    ['iro', 'まる', '⭕', 'くるっと まあるい かたち', 'おさらは まる'],
    ['iro', 'さんかく', '🔺', 'かどが 3つ ある かたち', 'おにぎりは さんかく'],
    ['iro', 'しかく', '🟦', 'かどが 4つ ある かたち', 'まどは しかく'],
    ['iro', 'みずいろ', '🩵', 'そらの ような うすい あお', 'みずいろの そら'],
    ['iro', 'きみどり', '💚', 'きいろっぽい みどり', 'わかばは きみどり'],
    ['iro', 'しましま', '🦓', 'せんが ならんだ もよう', 'しまうまは しましま'],
    ['iro', 'みずたま', '🔵', 'まるい てんてんの もよう', 'みずたまの かさ'],
    ['iro', 'にじいろ', '🌈', 'あか だいだい きいろ みどり あお あい むらさき の なないろ', 'にじいろの はね'],
    // からだ
    ['karada', 'ひじ', '💪', 'うでの まがる ところ', 'ひじを まげて うでずもう'],
    ['karada', 'ひざ', '🦵', 'あしの まがる ところ', 'ころんで ひざを すりむいた'],
    ['karada', 'かかと', '🦶', 'あしの うらの うしろの ところ', 'かかとで たって みよう'],
    ['karada', 'まゆげ', '🤨', 'めの うえの け', 'びっくりして まゆげが あがった'],
    ['karada', 'おでこ', '🙂', 'かおの うえの ほう、まゆげの うえ', 'おでこで ねつを はかる'],
    ['karada', 'しんぞう', '❤️', 'むねの なかで ドキドキ うごいて ちを おくる ところ', 'はしると しんぞうが ドキドキ'],
    ['karada', 'ほね', '🦴', 'からだを ささえる かたい もの', 'ぎゅうにゅうで ほねが じょうぶに'],
    ['karada', 'いき', '😮‍💨', 'はなや くちから すったり はいたり する くうき', 'ふかく いきを すう'],
    // いきもの
    ['ikimono', 'かもめ', '🕊️', 'うみの ちかくに いる しろい とり', 'かもめが みなとの うえを とぶ'],
    ['ikimono', 'くらげ', '🪼', 'うみに ふわふわ うかぶ すきとおった いきもの', 'くらげには さわらないでね'],
    ['ikimono', 'おたまじゃくし', '🐸', 'かえるの こども', 'おたまじゃくしに あしが はえた'],
    ['ikimono', 'さなぎ', '🦋', 'いもむしが ちょうちょに なる まえの すがた', 'さなぎから ちょうちょが でた'],
    ['ikimono', 'すばしっこい', '🐿️', 'うごきが とても はやい', 'りすは すばしっこい'],
    ['ikimono', 'なわばり', '🐕', 'どうぶつが じぶんの ばしょ と おもう ところ', 'いぬが なわばりを まもる'],
    ['ikimono', 'しっぽ', '🐈', 'どうぶつの おしりから のびた もの', 'いぬが しっぽを ふった'],
    ['ikimono', 'すばこ', '🐦', 'とりが たまごを うむ ために つくる いえ', 'きに すばこを つけた'],
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
    fire: { n: 'しょうぼうしさん', e: '🧑‍🚒', cats: ['job', 'town', 'karada'], hi: 'やあ！ げんきかい？', bye: 'ひの ようじん！ またね！' },
    nurse: { n: 'かんごしさん', e: '👩‍⚕️', cats: ['karada', 'feel', 'food'], hi: 'こんにちは。けがは してない？', bye: 'からだを だいじに してね。' },
    doctor: { n: 'おいしゃさん', e: '🧑‍⚕️', cats: ['karada', 'food'], hi: 'やあ、げんき そうだね。', bye: 'よく たべて よく ねてね。' },
    carpenter: { n: 'だいくさん', e: '👷', cats: ['iro', 'job', 'hantai'], hi: 'よっ！ たてもの すきかい？', bye: 'トントン、また あおう！' },
    baker: { n: 'パンやさん', e: '🧑‍🍳', cats: ['food', 'oto'], hi: 'いらっしゃい！ パンの いい におい でしょ？', bye: 'やきたて、また たべに きてね！' },
    florist: { n: 'おはなやさん', e: '💐', cats: ['park', 'iro', 'sky'], hi: 'こんにちは。きれいな おはな みて いく？', bye: 'おはなに みず を あげてね。' },
    painter: { n: 'えかきさん', e: '🧑‍🎨', cats: ['iro', 'sky'], hi: 'やあ。いま みなとの え を かいてるんだ。', bye: 'きみも えを かいて みてね！' },
    fisher: { n: 'つりびとさん', e: '🎣', cats: ['ikimono', 'sea'], hi: 'しーっ、さかなが にげちゃう…なんてね。こんにちは！', bye: 'つれたら みせて あげるよ！' },
    jogger: { n: 'はしってる おねえさん', e: '🏃‍♀️', cats: ['karada', 'hantai', 'feel'], hi: 'はっ、はっ…こんにちは！', bye: 'いっしょに はしろうね！' },
    grandpa: { n: 'おじいさん', e: '👴', cats: ['sea', 'sky', 'feel', 'kazu'], hi: 'おお、げんきな ぼうや だね。', bye: 'ころばない ように な。' },
    busdriver: { n: 'バスの うんてんしゅさん', e: '🚌', cats: ['train', 'town', 'job'], hi: 'こんにちは！ バスは すき？', bye: 'はっしゃ オーライ！ またね！' },
    performer: { n: 'だいどうげいにん さん', e: '🤹', cats: ['oto', 'feel', 'iro'], hi: 'さあさあ、よって らっしゃい！', bye: 'はくしゅ ありがとう！' },
    teacher: { n: 'ようちえんの せんせい', e: '👩‍🏫', cats: ['ikimono', 'iro', 'feel', 'food'], hi: 'あら あおちゃん！ おでかけ？', bye: 'また ようちえんで ね！' },
    keeper: { n: 'しいくいんさん', e: '🧑‍🌾', cats: ['ikimono', 'food'], hi: 'こんにちは。どうぶつ すき？', bye: 'どうぶつに やさしく してね。' },
    guide: { n: 'ガイドさん', e: '🙋', cats: ['town', 'sea', 'eigo'], hi: 'ようこそ よこはまへ！', bye: 'よい たびを！' },
    sister: { n: 'おねえさん', e: '👧', cats: ['iro', 'oto', 'feel'], hi: 'あ、あおちゃん！ やっほー！', bye: 'またね〜！' },
    staff: { n: 'のりものの かかりいん', e: '🎡', cats: ['hantai', 'feel', 'oto'], hi: 'いらっしゃい！ のりもの すき？', bye: 'たのしんで いってね！' },
  };
  // おしゃべり（あいさつ の あと の ひとこと）
  const CHAT = {
    granny: ['きょうは かぜが きもちいいね。', 'むかしは ここ、うみ だったのよ。'], police: ['みちに まよったら こうばん に きてね。', 'しんごうは あお に なってから わたろうね。'],
    sailor: ['ふねの まどは まるい んだ。', 'うみの みずは しょっぱいぞ！'], station: ['でんしゃは じかんどおりに はしるんだよ。', 'きいろい せんの うちがわで まってね。'],
    shop: ['きょうは なにを かうの？', 'おつりは ちゃんと かぞえてね。'], gardener: ['はなは まいにち みず を ほしがるんだ。', 'むしも こうえんの なかまだよ。'],
    student: ['ことばって おもしろいよね。', 'しってる ことば、いくつ ある？'], tourist: ['Yokohama is beautiful! よこはま きれい！', 'I like ships! ふね だいすき！'],
    post: ['てがみには じゅうしょを かくんだよ。', 'きょうは 100つうも くばったよ。'], cook: ['りょうりは ひの かげんが だいじ。', 'やさいも ちゃんと たべてね。'],
    dog: ['ポチは さんぽが だいすき。', 'いぬを なでる ときは「さわって いい？」って きいてね。'], mama2: ['あかちゃんは いま おひるね ちゅう。', 'おにいちゃん みたいに なりたい って。'],
    fire: ['かじを みつけたら おとなに しらせてね。', 'しょうぼうしゃは あかい いろ だよ。'], nurse: ['てを あらうと ばいきんが いなくなるよ。', 'ねる まえの はみがき してる？'],
    doctor: ['ねつが でたら むりしないでね。', 'からだの なかは ふしぎが いっぱい。'], carpenter: ['いえは じょうぶな はしらで ささえるんだ。', 'くぎを うつ おとが すきでね。'],
    baker: ['パンは あさ はやく やくんだよ。', 'クロワッサンは つきの かたち。'], florist: ['ひまわりは おひさまの ほうを むくのよ。', 'はるは おはなが いっぱい。'],
    painter: ['そらは まいにち いろが ちがうんだ。', 'ゆうがたの そらが いちばん すき。'], fisher: ['まちの うみにも さかなが いるんだよ。', 'つりは まつのが だいじ。'],
    jogger: ['はしると からだが ぽかぽか。', 'すいぶん ほきゅう を わすれずに。'], grandpa: ['わしが こどもの ころは ランドマークタワーは なかったぞ。', 'むかしの きしゃは けむりを はいて はしったんじゃ。'],
    busdriver: ['バスは みんなの あしなんだ。', 'のる ときは しっかり つかまってね。'], performer: ['ボールを 3つ なげて みせるよ！', 'しっぱい しても わらって もういっかい！'],
    teacher: ['あおちゃん、きょうも げんきだね。', 'ようちえんの かだんに チューリップを うえたよ。'], keeper: ['どうぶつは たべものが みんな ちがうんだ。', 'きりんの したは ながいんだよ。'],
    guide: ['よこはまの みなとは むかしから せかいと つながって いるの。', 'あかレンガそうこ は むかしの くら なのよ。'], sister: ['きょうの ふく、かわいいでしょ？', 'いっしょに おえかき したいな。'],
    staff: ['かんらんしゃは ゆっくり まわるんだ。', 'のりものは じゅんばんを まもってね。'],
  };
  // ばしょ に あう ひと
  const BY_PLACE = {
    sea: ['sailor', 'tourist', 'granny', 'dog', 'fisher', 'painter', 'grandpa', 'guide', 'jogger'],
    station: ['station', 'student', 'post', 'tourist', 'busdriver', 'sister', 'guide', 'grandpa'],
    shop: ['shop', 'cook', 'mama2', 'tourist', 'baker', 'florist', 'performer', 'sister'],
    park: ['gardener', 'dog', 'granny', 'mama2', 'jogger', 'teacher', 'painter', 'florist', 'performer'],
    town: ['police', 'post', 'student', 'granny', 'mama2', 'fire', 'nurse', 'doctor', 'carpenter', 'grandpa', 'busdriver', 'teacher'],
    zoo: ['keeper', 'teacher', 'mama2', 'grandpa', 'dog'],
    fun: ['staff', 'performer', 'sister', 'mama2', 'tourist'],
  };

  // ---------------- がめん ----------------
  let root, ctx;
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
  const btn = (label, cls, fn) => { const b = el('button', cls || 'sbig', label); b.addEventListener('click', fn); return b; };
  const sfx = (n) => ctx && ctx.sfx && ctx.sfx(n);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // こえ（voice.js）
  let curWho = 'granny';
  const speak = (t, who, opt) => { if (window.Voice) window.Voice.say(t, who || curWho, opt); };
  function bubble(face, name, text) {
    const d = el('div', 'ktalk', `<span class="kf">${face}</span><span class="kb"><small>${name}</small>${text}</span><button class="kvo" aria-label="もういちど きく">🔊</button>`);
    const who = curWho; d.querySelector('.kvo').addEventListener('click', () => speak(text, who)); root.appendChild(d); speak(text);
  }
  function aoSays(text) { root.appendChild(el('div', 'ktalk me', `<span class="kb"><small>あおちゃん</small>${text}</span><span class="kf">🧢</span>`)); speak(text, 'ao'); }
  function head(P) { root.innerHTML = ''; root.className = 'sroom kotoba'; root.appendChild(el('div', 'shead', `<b>💬 ${P.n} と おはなし</b><small>ことば ずかん ${learnedCount()} / ${W.length}</small>`)); }
  const learnedCount = () => W.filter((v) => D.w[v.id] && D.w[v.id].ok > 0).length;
  const mastered = (v) => D.w[v.id] && D.w[v.id].ok >= 3;
  function greetingFor(h, en) {
    if (en) return { a: 'ハロー！', c: ['グッバイ！', 'いただきます！'] };
    if (h < 10.5) return { a: 'おはよう ございます', c: ['こんばんは', 'おやすみなさい'] };
    if (h < 17.5) return { a: 'こんにちは', c: ['おはよう ございます', 'おやすみなさい'] };
    return { a: 'こんばんは', c: ['おはよう ございます', 'いただきます'] };
  }
  function choose(question, ans, others, onOk, qWho) {
    root.appendChild(el('div', 'kq2', question)); speak(question, qWho);
    const g = el('div', 'kchoice'); let tried = 0;
    shuffle([ans].concat(others)).forEach((c) => {
      const row = el('div', 'krow'), sp = btn('🔊', 'kvo big', () => speak(c, 'mama'));
      const b = btn(c, 'kch2', () => {
        if (b.classList.contains('ng') || g.dataset.done) return;
        if (c === ans) { g.dataset.done = 1; b.classList.add('ok'); sfx('star'); onOk(tried === 0); }
        else { tried++; b.classList.add('ng'); sfx('ng'); }
      });
      row.appendChild(sp); row.appendChild(b); g.appendChild(row);
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
    ctx = c; root = document.getElementById('talkRoot'); curWho = c.who;
    const P = PEOPLE[c.who] || PEOPLE.granny; D.talks++; store();
    head(P);
    // 1. あいさつ
    const g = greetingFor(c.hour, P.en);
    bubble(P.e, P.n, P.hi);
    if (c.bday) bubble(P.e, P.n, `あれ？ きょうは あおちゃん の おたんじょうび でしょ！ ${c.age || ''}さい おめでとう！ 🎂🎉`);
    choose('🧢 なんて いう？（あいさつ を えらんでね）', g.a, g.c, (first) => {
      if (window.Voice) window.Voice.stop(); aoSays(g.a); if (first) { D.greet++; store(); }
      const ch = CHAT[c.who] || []; bubble(P.e, P.n, (first ? 'まあ、じょうずな あいさつ！ 👏 ' : 'そうそう、それが ぴったり！ ') + (ch.length ? ch[(Math.random() * ch.length) | 0] : ''));
      setTimeout(() => lesson(P), 1300);
    }, 'mama');
  }
  function lesson(P) {
    const { v, review } = pickWord(P), isNew = !D.w[v.id];
    head(P);
    if (review) bubble(P.e, P.n, `まえに おぼえた ことば、おぼえてる？「<b>${v.w}</b>」`);
    else {
      bubble(P.e, P.n, `「<b>${v.w}</b>」って しってる？`);
      const cd = el('div', 'kcard', `<i>${v.e}</i><b>${v.w}</b><span>${v.m}</span><em>たとえば：「${v.x}」</em><button class="kvo">🔊 もういちど きく</button>`);
      const read = () => speak(`${v.w}。${v.m}。たとえば、${v.x}`, curWho, { slow: 1 }); cd.querySelector('.kvo').addEventListener('click', read); root.appendChild(cd); read();
    }
    const q = quizOf(v);
    root.appendChild(btn(review ? '🙋 こたえる！' : '💡 わかった！ もんだい を だして', 'sbig', (e) => {
      e.currentTarget.remove();
      const card = root.querySelector('.kcard'); if (card) card.classList.add('hide');   // おぼえて いるか ためす
      if (window.Voice) window.Voice.stop();
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
    speak('おわかれ の ことば は？', 'mama');
    opts.forEach(([t, ok]) => g.appendChild(btn(t, 'kch2', (e) => {
      if (!ok) { e.currentTarget.classList.add('ng'); sfx('ng'); return; }
      if (window.Voice) window.Voice.stop(); aoSays(t); bubble(P.e, P.n, P.bye); sfx('pick');
      g.remove(); root.appendChild(btn('🚶 また あるく', 'sbig', () => { if (window.Voice) window.Voice.stop(); if (ctx.onClose) ctx.onClose(); }));
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
        if (r) cdv.addEventListener('click', () => { sfx('tap'); cdv.classList.toggle('open'); if (!cdv.querySelector('em')) cdv.appendChild(el('em', '', `たとえば：「${v.x}」`)); speak(`${v.w}。${v.m}。たとえば、${v.x}`, 'mama', { slow: 1 }); });
        g.appendChild(cdv);
      });
      root.appendChild(g);
    });
    root.appendChild(btn(done ? '← もどる' : 'とじる', 'sbig', () => { if (window.Voice) window.Voice.stop(); if (done) done(); else if (ctx.onClose) ctx.onClose(); }));
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
