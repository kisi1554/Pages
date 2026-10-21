/* じょうもん むらの くらし — あんないやくの キャラクターと こえ
 * こえは ブラウザの よみあげ（speechSynthesis）と WebAudio の ごうせいおん。おんせい ファイルは つかわない。 */

var CHARS = {
  dogu: { name: 'どぐちゃん', role: 'むらの あんないやく。どぐうの おんなのこ', color: '#c98a57',
    pitch: 1.7, rate: 1.05, chirp: 880 },
  jiji: { name: 'おさじい', role: 'むらの おさ。なんでも しってる ものしり', color: '#7a8f3a',
    pitch: 0.55, rate: 0.85, chirp: 260 },
  koro: { name: 'コロ', role: 'じょうもんの いぬ。かりの てつだいが とくい', color: '#d9893b',
    pitch: 2.0, rate: 1.2, chirp: 1200 },
  hakase: { name: 'ホリーはかせ', role: 'いまの じだいの こうこがく はかせ', color: '#3a7bd5',
    pitch: 1.25, rate: 1.0, chirp: 620 }
};

/* キャラの かお（SVG） */
var FACE = {
  // しゃこうきどぐう ふうの おおきな め
  dogu: '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<circle cx="50" cy="54" r="40" fill="#e8b98a" stroke="#8a5a2b" stroke-width="3"/>' +
    '<path d="M22 30 Q50 4 78 30" fill="#c98a57" stroke="#8a5a2b" stroke-width="3"/>' +
    '<circle cx="34" cy="16" r="6" fill="#c98a57" stroke="#8a5a2b" stroke-width="2"/><circle cx="66" cy="16" r="6" fill="#c98a57" stroke="#8a5a2b" stroke-width="2"/>' +
    '<ellipse cx="34" cy="50" rx="13" ry="10" fill="#fff" stroke="#8a5a2b" stroke-width="3"/><ellipse cx="66" cy="50" rx="13" ry="10" fill="#fff" stroke="#8a5a2b" stroke-width="3"/>' +
    '<path d="M24 50 L44 50 M56 50 L76 50" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="34" cy="53" r="3" fill="#3b2a1a"/><circle cx="66" cy="53" r="3" fill="#3b2a1a"/>' +
    '<ellipse cx="22" cy="68" rx="7" ry="4" fill="#f4a3a3" opacity=".8"/><ellipse cx="78" cy="68" rx="7" ry="4" fill="#f4a3a3" opacity=".8"/>' +
    '<path class="mouth" d="M42 72 Q50 80 58 72" stroke="#8a5a2b" stroke-width="3" fill="#c0392b"/>' +
    '<path d="M26 84 l4 4 M36 88 l4 4 M60 88 l4 4 M70 84 l4 4" stroke="#8a5a2b" stroke-width="2"/></svg>',
  // しろい ひげの おじいさん。じょうもんの はちまき
  jiji: '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<circle cx="50" cy="48" r="34" fill="#f2c9a0" stroke="#8a5a2b" stroke-width="3"/>' +
    '<rect x="16" y="24" width="68" height="11" rx="5" fill="#7a8f3a" stroke="#4a5a22" stroke-width="2"/>' +
    '<path d="M22 26 l4 7 M32 26 l4 7 M42 26 l4 7 M52 26 l4 7 M62 26 l4 7 M72 26 l4 7" stroke="#d9e8a8" stroke-width="2"/>' +
    '<path d="M28 44 Q34 40 40 44 M60 44 Q66 40 72 44" stroke="#3b2a1a" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 38 Q34 34 40 37 M60 37 Q66 34 72 38" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M18 56 Q22 96 50 98 Q78 96 82 56 Q72 66 50 64 Q28 66 18 56Z" fill="#fff" stroke="#c8c8c8" stroke-width="2"/>' +
    '<path class="mouth" d="M42 66 Q50 72 58 66" stroke="#8a5a2b" stroke-width="3" fill="none"/>' +
    '<ellipse cx="50" cy="54" rx="6" ry="5" fill="#e8a882"/>' +
    '<ellipse cx="26" cy="54" rx="5" ry="3" fill="#f4a3a3" opacity=".7"/><ellipse cx="74" cy="54" rx="5" ry="3" fill="#f4a3a3" opacity=".7"/></svg>',
  // しばいぬ ふう
  koro: '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<path d="M18 40 L24 8 L44 28Z M82 40 L76 8 L56 28Z" fill="#d9893b" stroke="#8a4a1a" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 16 L28 30 L36 26Z M76 16 L72 30 L64 26Z" fill="#f4c7a0"/>' +
    '<ellipse cx="50" cy="54" rx="36" ry="32" fill="#d9893b" stroke="#8a4a1a" stroke-width="3"/>' +
    '<path d="M24 62 Q30 86 50 88 Q70 86 76 62 Q64 70 50 58 Q36 70 24 62Z" fill="#fff4e6"/>' +
    '<circle cx="36" cy="48" r="5" fill="#2b1a0d"/><circle cx="64" cy="48" r="5" fill="#2b1a0d"/>' +
    '<circle cx="37.5" cy="46.5" r="1.6" fill="#fff"/><circle cx="65.5" cy="46.5" r="1.6" fill="#fff"/>' +
    '<ellipse cx="50" cy="62" rx="7" ry="5" fill="#2b1a0d"/>' +
    '<path class="mouth" d="M42 70 Q46 76 50 70 Q54 76 58 70" stroke="#2b1a0d" stroke-width="2.5" fill="none"/>' +
    '<path d="M47 74 Q50 84 53 74Z" fill="#f08080"/>' +
    '<ellipse cx="26" cy="62" rx="5" ry="3" fill="#f4a3a3" opacity=".8"/><ellipse cx="74" cy="62" rx="5" ry="3" fill="#f4a3a3" opacity=".8"/></svg>',
  // ヘルメットと めがねの はかせ
  hakase: '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<path d="M16 52 Q14 86 34 92 L66 92 Q86 86 84 52Z" fill="#4a3426"/>' +
    '<circle cx="50" cy="56" r="30" fill="#f6d3b3" stroke="#8a5a2b" stroke-width="3"/>' +
    '<path d="M14 42 Q16 10 50 10 Q84 10 86 42Z" fill="#ffd54f" stroke="#c49000" stroke-width="3"/>' +
    '<rect x="10" y="40" width="80" height="7" rx="3" fill="#ffca28" stroke="#c49000" stroke-width="2"/>' +
    '<path d="M50 12 L50 40" stroke="#c49000" stroke-width="3"/>' +
    '<circle cx="38" cy="58" r="9" fill="#fff" fill-opacity=".5" stroke="#3a7bd5" stroke-width="3"/><circle cx="62" cy="58" r="9" fill="#fff" fill-opacity=".5" stroke="#3a7bd5" stroke-width="3"/>' +
    '<path d="M47 58 L53 58" stroke="#3a7bd5" stroke-width="3"/>' +
    '<circle cx="38" cy="59" r="3" fill="#3b2a1a"/><circle cx="62" cy="59" r="3" fill="#3b2a1a"/>' +
    '<ellipse cx="28" cy="72" rx="5" ry="3" fill="#f4a3a3" opacity=".8"/><ellipse cx="72" cy="72" rx="5" ry="3" fill="#f4a3a3" opacity=".8"/>' +
    '<path class="mouth" d="M43 74 Q50 81 57 74" stroke="#8a5a2b" stroke-width="3" fill="#c0392b"/></svg>'
};

/* ばめんごとの せりふ（{} は ふりがな） */
var LINES = {
  hello: [
    ['dogu', 'こんにちは！ わたし、どぐちゃん。じょうもんの むらを あんない するね！'],
    ['jiji', 'わしは むらの おさじゃ。くらしの ちえを おしえて やろう。'],
    ['koro', 'ワン！ ぼく コロ！ かりや きのみ ひろいなら まかせて！'],
    ['hakase', 'わたしは いまの じだいから きた ホリーはかせ。1ねんが おわったら いっしょに かいづかを ほろうね！']
  ],
  season: {
    haru: ['dogu', 'はるだよ！ もりで さんさい、うみで かいを とろう！'],
    natsu: ['jiji', 'なつは うみの めぐみの きせつじゃ。まるきぶねで りょうに でるぞい。'],
    aki: ['koro', 'あきだワン！ どんぐりが いっぱい！ でも どんぐりは しぶいから、あくぬきを わすれずに！'],
    fuyu: ['jiji', 'ふゆが きた。たくわえは たりて おるかな？ かりで たべものを ふやそう。']
  },
  job: {
    sansai: ['dogu', 'くさむらの なかに、くるっと まいた ぜんまいが かくれてるよ！'],
    kai: ['dogu', 'しおが ひいたら すなはまへ！ ほったら かいが でてくるかも！'],
    ryo: ['jiji', 'ほねの つりばりと、つのの もり。どっちで いくかの？'],
    hiroi: ['koro', 'おちてくる きのみを どんどん ひろって！ ぼくも くんくん さがすよ！'],
    akunuki: ['jiji', 'どんぐりは しぶい。かわの みずに なんにちも さらして、あくを ぬくのじゃ。'],
    konani: ['dogu', 'ごりごり すりつぶすと、こなに なるよ。こねて やくと クッキーみたい！'],
    kari: ['koro', 'ワン！ ぼくが えものを おいだすから、ゆみやで ねらって！'],
    doki: ['jiji', 'ねんどの ひもを わに して つみあげ、なわで もようを つけるのじゃ。'],
    ie: ['jiji', 'じめんを ほって、はしらを たてて、かやで やねを ふく。みんなの いえじゃ。'],
    kaizuka: ['dogu', 'かいがらや ほねは かいづかへ ぽいっ！ ずっと のこるんだって。']
  },
  good: {
    dogu: ['やったね！ すごい すごい！', 'じょうず！ むらの みんなも よろこぶよ！'],
    jiji: ['うむ、みごとじゃ。', 'よう やった。これで ふゆも あんしんじゃ。'],
    koro: ['ワンワン！ やったー！', 'しっぽ ふりふり！ だいせいこう！'],
    hakase: ['すばらしい はっけん！', 'これは だいはっけんだよ！']
  },
  bad: {
    dogu: ['ざんねん…。つぎは きっと できるよ！'],
    jiji: ['あせらんで よい。つぎが あるぞい。'],
    koro: ['クゥーン…。でも まだ まだ！'],
    hakase: ['しっぱいも だいじな けいけんだよ。']
  },
  winterOk: ['jiji', 'みんなで ぶじに ふゆを こせたぞ！ よく がんばったのう。'],
  winterNg: ['jiji', 'おなかが すいたのう。らいねんは もっと あつめような。'],
  dig: ['hakase', 'ここは いまの じだい！ むかしの かいづかを、そうっと ほって みよう。'],
  digEnd: ['hakase', 'すてた ものから、むかしの くらしが わかるんだ。かいづかは たからの やまだね！']
};

/* キャラを タップすると いう まめちしき */
var TIPS = {
  dogu: [
    'どぐうは ねんどで つくった ひとの かたち。おいのりに つかったと かんがえられて いるよ。',
    'どきが あると、かいや どんぐりを にて たくさん たべられるよ！',
    'いえを ふやすと、なかまの かぞくが しごとを てつだって くれるよ。'
  ],
  jiji: [
    'じょうもんじだいは、およそ 1まんねん いじょうも つづいたのじゃ。',
    'こめづくりや てつの どうぐは、つぎの やよいじだいに なってから。この むらには まだ ないのう。',
    'たてあなじゅうきょの まんなかには いろりが あって、あたたかいのじゃ。'
  ],
  koro: [
    'ワン！ じょうもんの ひとは いぬと いっしょに かりを して いたと かんがえられて いるんだ。',
    'かいづかから、ていねいに うめられた いぬの ほねが みつかる ことも あるんだって。',
    'シカの つのや ほねは、つりばりや もりに なるんだワン！'
  ],
  hakase: [
    'かいづかを しらべると、むかしの ひとが なにを たべて いたか わかるんだ。',
    'とうきょうの おおもり かいづかは、モースと いう ひとが きしゃの まどから みつけたんだよ。',
    'よこはまの しょうみょうじ かいづかからは、イルカの ほねが たくさん でて きたよ。'
  ]
};

/* ===== こえ ===== */
var VOICE = (function () {
  var on = true, jaVoice = null;
  var syn = window.speechSynthesis;
  function pickVoice() {
    if (!syn) return;
    var vs = syn.getVoices() || [];
    jaVoice = vs.filter(function (v) { return /^ja/i.test(v.lang); })[0] || null;
  }
  if (syn) { pickVoice(); if (syn.addEventListener) syn.addEventListener('voiceschanged', pickVoice); }

  // よみあげ よう: ふりがなは よみがなに、えもじ・タグ・くうはくを のぞく
  function plain(t) {
    return String(t)
      .replace(/([一-鿿々]+)\{([^}]+)\}/g, '$2')
      .replace(/<ruby>[^<]*<rt>([^<]*)<\/rt><\/ruby>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️‍]/gu, '')
      .replace(/\s+/g, '');
  }
  return {
    plain: plain,
    set: function (v) { on = v; if (!v && syn) syn.cancel(); },
    hasSpeech: function () { return !!(syn && jaVoice); },
    speak: function (id, text, done) {
      var c = CHARS[id];
      if (!on || !c) { if (done) done(); return; }
      var t = plain(text);
      // キャラの なきごえ（ごうせいおん）
      SND.chirp(c.chirp, id === 'koro' ? 'bark' : '', syn && jaVoice ? 2 : Math.min(10, Math.ceil(t.length / 4)));
      if (!syn || !jaVoice) { if (done) setTimeout(done, 600); return; }
      try {
        syn.cancel();
        var u = new SpeechSynthesisUtterance(t);
        u.lang = 'ja-JP'; u.voice = jaVoice; u.pitch = c.pitch; u.rate = c.rate; u.volume = 1;
        u.onend = u.onerror = function () { if (done) done(); };
        syn.speak(u);
      } catch (e) { if (done) done(); }
    },
    stop: function () { if (syn) syn.cancel(); }
  };
})();
