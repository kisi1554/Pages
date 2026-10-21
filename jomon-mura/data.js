/* じょうもん むらの くらし — データ（ずかん・きせつ・しごと）
 * 「漢字{かんじ}」と かくと ふりがなつきで ひょうじされる（R() を つかう）。
 * ないようの でどころは README.md の「出典」を みる。 */

/* ===== ずかん カード =====
 * cat: dougu（どうぐ）／ tabemono（たべもの）／ iseki（いせき）／ tsugi（つぎの じだい＝やよい。かぞえない）
 * get: dig（はっくつで みつける）／ use（つかう・とると とうろく。きや くさは のこりにくいので） */
var CARDS = [
  // ---- どうぐ ----
  { id: 'doki', cat: 'dougu', get: 'dig', name: '縄文土器{じょうもんどき}',
    text: 'ねんどを わに つみあげて、なわを ころがして もようを つけ、のやきで やいた うつわ。たべものを にたり、たくわえたり した。' },
  { id: 'dogu', cat: 'dougu', get: 'dig', name: '土偶{どぐう}',
    text: 'ねんどで つくった ひとの かたち。おいのりや まつりに つかったと かんがえられて いる。' },
  { id: 'dasei', cat: 'dougu', get: 'dig', name: '打製石器{だせいせっき}',
    text: 'いしを うちかいて するどく した どうぐ。きったり けずったり した。' },
  { id: 'masei', cat: 'dougu', get: 'dig', name: '磨製石斧{ませいせきふ}',
    text: 'いしを みがいて つくった おの。きを きりたおして、いえや ふねの ざいりょうに した。' },
  { id: 'yumiya', cat: 'dougu', get: 'use', name: '弓矢{ゆみや}',
    text: 'すばやい シカや イノシシを、とおくから ねらえる。じょうもんじだいの かりの だいじな どうぐ。' },
  { id: 'sekizoku', cat: 'dougu', get: 'dig', name: '石鏃{せきぞく}',
    text: 'やの さきに つける いしの やじり。おれた やじりが かいづかや むらから みつかる。' },
  { id: 'tsuribari', cat: 'dougu', get: 'dig', name: '骨角器{こっかくき}の つりばり',
    text: 'シカの つのや ほねを けずって つくった つりばり。ほねや つので つくった どうぐを こっかくきと いう。' },
  { id: 'mori', cat: 'dougu', get: 'dig', name: '骨角器{こっかくき}の 銛{もり}',
    text: 'つので つくった もり。なげたり ついたり して、おおきな さかなや イルカを とった。' },
  { id: 'marukibune', cat: 'dougu', get: 'use', name: '丸木舟{まるきぶね}',
    text: 'ふとい きを 1ぽん まるごと くりぬいて つくった ふね。うみや かわで りょうを した。' },
  { id: 'ishizara', cat: 'dougu', get: 'use', name: '石皿{いしざら}と 磨石{すりいし}',
    text: 'いしざらの うえで すりいしを うごかして、どんぐりや くるみを すりつぶし、こなに した。' },
  { id: 'tateana', cat: 'dougu', get: 'use', name: '竪穴住居{たてあなじゅうきょ}',
    text: 'じめんを ほりさげて ゆかに し、はしらを たてて、かやで やねを ふいた いえ。まんなかに いろりが ある。' },
  { id: 'nawa', cat: 'dougu', get: 'use', name: '縄{なわ}',
    text: 'くさや きの かわの せんいを よって つくる。どきに ころがすと「じょうもん（なわの もよう）」が つく。' },
  { id: 'otoshiana', cat: 'dougu', get: 'use', name: '落{お}とし穴{あな}',
    text: 'けものの とおりみちに ほった ふかい あな。イノシシや シカを つかまえた。' },
  { id: 'kago', cat: 'dougu', get: 'use', name: 'あみかご',
    text: 'つるや きの かわを あんで つくった かご。きのみを はこんだり、かわの みずに さらしたり した。' },
  { id: 'kokuyoseki', cat: 'dougu', get: 'dig', name: '黒曜石{こくようせき}',
    text: 'われると ガラスのように するどく なる くろい いし。やじりや ナイフに した。とおくの さんちから はこばれて きた ことも ある。' },
  { id: 'mimikazari', cat: 'dougu', get: 'dig', name: '耳飾{みみかざ}り',
    text: 'ねんどを やいて つくった みみかざり。じょうもんの ひとも おしゃれを して いた。' },
  { id: 'hisui', cat: 'dougu', get: 'dig', name: 'ヒスイの 玉{たま}',
    text: 'みどりいろの うつくしい いし。にいがたけんの いといがわ あたりで とれ、とおくの むらまで はこばれた。' },
  // ---- たべもの ----
  { id: 'donguri', cat: 'tabemono', get: 'dig', name: 'どんぐり',
    text: 'しぶい「あく」が あるので、みずに さらしたり にたり して あくを ぬいてから たべた。' },
  { id: 'kuri', cat: 'tabemono', get: 'dig', name: 'くり',
    text: 'あまくて あくぬきが いらない。くりの きは いえの はしらにも つかった。' },
  { id: 'kurumi', cat: 'tabemono', get: 'dig', name: 'くるみ',
    text: 'かたい からを いしで わって、あぶらの おおい なかみを たべた。' },
  { id: 'zenmai', cat: 'tabemono', get: 'use', name: 'ぜんまい',
    text: 'はるの さんさい。うずまきの かたちの めを つんで、ゆでて たべる。' },
  { id: 'warabi', cat: 'tabemono', get: 'use', name: 'わらび',
    text: 'はるの さんさい。あくが あるので、あくを ぬいて たべる。' },
  { id: 'hamaguri', cat: 'tabemono', get: 'dig', name: 'ハマグリ',
    text: 'すなはまで ほれる おおきな かい。かいづかから たくさん でて くる。' },
  { id: 'asari', cat: 'tabemono', get: 'dig', name: 'アサリ',
    text: 'すなの なかに いる ちいさな かい。どきで にて たべた。' },
  { id: 'kaki', cat: 'tabemono', get: 'dig', name: 'カキ',
    text: 'いわに くっつく ごつごつした かい。かいづかの かいがらから、どこで なにを とったか わかる。' },
  { id: 'kurodai', cat: 'tabemono', get: 'dig', name: 'クロダイ',
    text: 'うちうみに いる さかな。ほねが かいづかから みつかる。' },
  { id: 'suzuki', cat: 'tabemono', get: 'dig', name: 'スズキ',
    text: 'かわぐちの ちかくに くる おおきな さかな。つりばりや もりで とった。' },
  { id: 'iruka', cat: 'tabemono', get: 'dig', name: 'イルカ',
    text: 'よこはまの 称名寺貝塚{しょうみょうじかいづか}からは、イルカの ほねが たくさん みつかって いる。' },
  { id: 'shika', cat: 'tabemono', get: 'dig', name: 'シカ',
    text: 'にくを たべ、かわは ふくに、つのや ほねは つりばりなどの どうぐに した。むだなく つかった。' },
  { id: 'inoshishi', cat: 'tabemono', get: 'dig', name: 'イノシシ',
    text: 'ちからの つよい けもの。ゆみやや おとしあなで とった。' },
  // ---- いせき ----
  { id: 'omori', cat: 'iseki', get: 'dig', name: '大森貝塚{おおもりかいづか}',
    place: 'とうきょう',
    text: '150ねん ちかく まえ、アメリカの モースが きしゃの まどから みつけて ほった かいづか。にほんの こうこがくの はじまりの ばしょと いわれる。' },
  { id: 'sannai', cat: 'iseki', get: 'dig', name: '三内丸山遺跡{さんないまるやまいせき}',
    place: 'あおもり',
    text: 'とても おおきな じょうもんの むら。ふとい くりの はしらの たてもの、たくさんの たてあなじゅうきょ、どぐうが みつかった。せかいいさん。' },
  { id: 'shomyoji', cat: 'iseki', get: 'dig', name: '称名寺貝塚{しょうみょうじかいづか}',
    place: 'よこはま（かなざわく）',
    text: 'よこはまの じょうもんの かいづか。イルカや さかなの ほね、シカの つので つくった もりや つりばりが みつかった。' },
  // ---- つぎの じだい（やよい）。じょうもんの むらには まだ ない ----
  { id: 'inasaku', cat: 'tsugi', name: '稲作{いなさく}',
    text: 'たんぼで こめを つくる。やよいじだいに ひろまった。じょうもんの むらでは まだ して いない。' },
  { id: 'kinzokuki', cat: 'tsugi', name: '金属器{きんぞくき}',
    text: 'てつや どう（せいどう）の どうぐ。やよいじだいに つたわった。じょうもんの どうぐは いし・ほね・き・ねんど。' },
  { id: 'takayuka', cat: 'tsugi', name: '高床倉庫{たかゆかそうこ}',
    text: 'ゆかを たかく した こめの くら。やよいじだいの もの。じょうもんの むらには ない。' }
];

var CAT_LABEL = { dougu: 'どうぐ', tabemono: 'たべもの', iseki: 'いせき', tsugi: 'つぎの じだい' };

/* ===== きせつ ===== */
var SEASONS = [
  { id: 'haru', name: 'はる', emoji: '🌸', sky: '#cfe8ff', ground: '#9ccc65' },
  { id: 'natsu', name: 'なつ', emoji: '☀️', sky: '#8fd3ff', ground: '#6dbb4a' },
  { id: 'aki', name: 'あき', emoji: '🍁', sky: '#ffe0b2', ground: '#c9a24a' },
  { id: 'fuyu', name: 'ふゆ', emoji: '❄️', sky: '#dfe7ef', ground: '#eef3f7' }
];

/* ===== ばしょ ===== */
var PLACES = {
  ie: 'たてあなじゅうきょ', hiroba: 'ひろば', mori: 'もり', umi: 'うみ・かわ', kaizuka: 'かいづか'
};

/* ===== しごと =====
 * seasons: できる きせつ（なければ いつでも）／ free: 3かいに かぞえない */
var JOBS = [
  { id: 'sansai', season: 'haru', place: 'mori', emoji: '🌿', name: 'さんさい とり', desc: 'ぜんまい・わらびを さがそう' },
  { id: 'kai', season: 'haru', place: 'umi', emoji: '🐚', name: 'かいを ほる', desc: 'すなはまで ハマグリ・アサリ' },
  { id: 'ryo', season: 'natsu', place: 'umi', emoji: '🛶', name: 'りょう', desc: 'まるきぶねで さかなを とろう' },
  { id: 'hiroi', season: 'aki', place: 'mori', emoji: '🌰', name: 'きのみ ひろい', desc: 'どんぐり・くり・くるみ' },
  { id: 'akunuki', season: 'aki', place: 'umi', emoji: '💧', name: 'どんぐりの あくぬき', desc: 'かわの みずに さらす' },
  { id: 'konani', season: 'aki', place: 'hiroba', emoji: '🪨', name: 'こなに する', desc: 'いしざらと すりいし' },
  { id: 'kari', season: 'fuyu', place: 'mori', emoji: '🏹', name: 'かり', desc: 'ゆみや・おとしあなで シカ・イノシシ' },
  { id: 'doki', place: 'hiroba', emoji: '🏺', name: 'どき づくり', desc: 'つみあげ → なわもよう → のやき' },
  { id: 'ie', place: 'ie', emoji: '🛖', name: 'いえ づくり', desc: 'あな → はしら → かやぶき' },
  { id: 'kaizuka', place: 'kaizuka', emoji: '🗑️', name: 'かいづかに すてる', desc: 'ごみを すてる（かいすうに かぞえない）', free: true }
];

/* ===== ごみ（かいづかに すてる もの） → はっくつで でる ずかん ===== */
var TRASH = {
  hamaguri: { emoji: '🐚', name: 'ハマグリの かいがら', card: 'hamaguri', learn: 'かいを ほって たべて いた' },
  asari: { emoji: '🐚', name: 'アサリの かいがら', card: 'asari', learn: 'かいを ほって たべて いた' },
  kaki: { emoji: '🦪', name: 'カキの かいがら', card: 'kaki', learn: 'いわばの かいも とって いた' },
  kurodai: { emoji: '🦴', name: 'クロダイの ほね', card: 'kurodai', learn: 'うみで さかなを とって いた' },
  suzuki: { emoji: '🦴', name: 'スズキの ほね', card: 'suzuki', learn: 'うみで さかなを とって いた' },
  iruka: { emoji: '🦴', name: 'イルカの ほね', card: 'iruka', learn: 'もりで イルカも とって いた' },
  shika: { emoji: '🦴', name: 'シカの ほね', card: 'shika', learn: 'ゆみやで かりを して いた' },
  inoshishi: { emoji: '🦴', name: 'イノシシの ほね', card: 'inoshishi', learn: 'かりで イノシシも とって いた' },
  donguri: { emoji: '🌰', name: 'こげた どんぐり', card: 'donguri', learn: 'きのみを たくわえて たべて いた' },
  kuri: { emoji: '🌰', name: 'くりの かわ', card: 'kuri', learn: 'くりを たべて いた' },
  kurumi: { emoji: '🥜', name: 'われた くるみの から', card: 'kurumi', learn: 'くるみを わって たべて いた' },
  doki: { emoji: '🏺', name: 'われた どき', card: 'doki', learn: 'どきで にたきを して いた' },
  sekizoku: { emoji: '🔺', name: 'おれた やじり', card: 'sekizoku', learn: 'ゆみやを つかって いた' },
  tsuribari: { emoji: '🪝', name: 'おれた つりばり', card: 'tsuribari', learn: 'ほねの つりばりで つりを して いた' },
  mori: { emoji: '🔱', name: 'おれた もり', card: 'mori', learn: 'つのの もりで りょうを して いた' }
};

/* はっくつで たまに でる「むらの たからもの」 */
var TREASURES = ['dogu', 'mimikazari', 'hisui', 'masei', 'dasei', 'kokuyoseki', 'doki'];
/* はっくつを おえるたびに 1つずつ わかる いせき */
var ISEKI_ORDER = ['omori', 'shomyoji', 'sannai'];

var NEED = 24;  // ふゆを こすのに いる たくわえ
