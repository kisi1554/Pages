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

/* キャラの かお（SVG）。おおきな きらきらの め・ほっぺ・ちいさな くちの ちびキャラ ふう
 * class="mouth" は しゃべる ときに うごく */
var FACE = (function () {
function eye(x, y, rx, ry, col) {
  return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + (col || '#3b2416') + '"/>' +
    '<ellipse cx="' + x + '" cy="' + (y + ry * 0.45) + '" rx="' + rx * 0.7 + '" ry="' + ry * 0.35 + '" fill="#7a4a2a" opacity=".55"/>' +
    '<circle cx="' + (x + rx * 0.35) + '" cy="' + (y - ry * 0.4) + '" r="' + rx * 0.42 + '" fill="#fff"/>' +
    '<circle cx="' + (x - rx * 0.4) + '" cy="' + (y + ry * 0.3) + '" r="' + rx * 0.2 + '" fill="#fff"/>';
}
function blush(x, y) {
  return '<ellipse cx="' + x + '" cy="' + y + '" rx="7" ry="4" fill="#ff8e8e" opacity=".55"/>' +
    '<path d="M' + (x - 3) + ' ' + (y - 1) + ' l-1.5 2 M' + x + ' ' + (y - 1) + ' l-1.5 2 M' + (x + 3) + ' ' + (y - 1) + ' l-1.5 2" stroke="#ff6b6b" stroke-width="1" opacity=".7"/>';
}
var SVG0 = '<svg viewBox="0 0 100 100" aria-hidden="true">';
return {
  // どぐちゃん: しゃこうきどぐう ふうの ゴーグルの め。あたまに じょうもんの うずまき
  dogu: SVG0 +
    '<circle cx="28" cy="28" r="10" fill="#e39b63" stroke="#a8643a" stroke-width="2.5"/>' +
    '<circle cx="72" cy="28" r="10" fill="#e39b63" stroke="#a8643a" stroke-width="2.5"/>' +
    '<circle cx="50" cy="17" r="12" fill="#e39b63" stroke="#a8643a" stroke-width="2.5"/>' +
    '<path d="M50 17 m0 -1 a2.5 2.5 0 1 1 -2.5 2.5 a5 5 0 0 1 5 -5 a7 7 0 0 1 4 9" stroke="#a8643a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M24 28 a3 3 0 1 1 3 3 M76 28 a3 3 0 1 0 -3 3" stroke="#a8643a" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="50" cy="59" rx="41" ry="36" fill="#f6c597" stroke="#a8643a" stroke-width="2.5"/>' +
    '<path d="M30 34 Q50 26 70 34" stroke="#d98d55" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-dasharray="0.5 6"/>' +
    '<ellipse cx="33" cy="58" rx="14" ry="12.5" fill="#fff8ee" stroke="#a8643a" stroke-width="2.5"/>' +
    '<ellipse cx="67" cy="58" rx="14" ry="12.5" fill="#fff8ee" stroke="#a8643a" stroke-width="2.5"/>' +
    eye(34, 59, 7, 8.5) + eye(66, 59, 7, 8.5) +
    '<path d="M21 46 Q26 42 31 44 M79 46 Q74 42 69 44" stroke="#a8643a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    blush(18, 75) + blush(82, 75) +
    '<path class="mouth" d="M44 78 Q47 82.5 50 78 Q53 82.5 56 78" stroke="#8a4a22" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '</svg>',
  // おさじい: にこにこ とじた め、ふわふわの ひげ、はちまきと はね
  jiji: SVG0 +
    '<path d="M76 38 Q92 22 84 8 Q76 22 72 36Z" fill="#ef8a7a" stroke="#b5574a" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M83 12 Q78 24 74 34" stroke="#b5574a" stroke-width="1.2" fill="none"/>' +
    '<ellipse cx="50" cy="54" rx="36" ry="35" fill="#fbd7b2" stroke="#b07a4a" stroke-width="2.5"/>' +
    '<ellipse cx="38" cy="27" rx="9" ry="4" fill="#fff" opacity=".7" transform="rotate(-15 38 27)"/>' +
    '<path d="M15 44 Q50 32 85 44 L85 51 Q50 39 15 51Z" fill="#9cc25a" stroke="#5f7a2a" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M22 46 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4" stroke="#f3ffd8" stroke-width="1.6" fill="none" transform="translate(-2 0)"/>' +
    '<path d="M22 55 Q30 49 40 54" stroke="#d6d6d6" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 54 Q70 49 78 55" stroke="#d6d6d6" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 55 Q30 49 40 54" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 54 Q70 49 78 55" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M27 63 Q32.5 57 38 63 M62 63 Q67.5 57 73 63" stroke="#5a3a22" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    blush(22, 70) + blush(78, 70) +
    '<path d="M20 70 Q16 84 27 88 Q28 98 41 96 Q50 103 59 96 Q72 98 73 88 Q84 84 80 70 Q72 78 62 76 Q50 82 38 76 Q28 78 20 70Z" fill="#fff" stroke="#d0d0d0" stroke-width="2" stroke-linejoin="round"/>' +
    '<ellipse cx="50" cy="66" rx="6" ry="5" fill="#f0b088" stroke="#b07a4a" stroke-width="1.5"/>' +
    '<circle cx="48" cy="64.5" r="1.6" fill="#fff" opacity=".8"/>' +
    '<path d="M35 74 Q43 67 50 72 Q57 67 65 74 Q57 78 50 75 Q43 78 35 74Z" fill="#fff" stroke="#d0d0d0" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path class="mouth" d="M46 79 Q50 84 54 79Z" fill="#e57a7a" stroke="#b35555" stroke-width="1.4" stroke-linejoin="round"/>' +
    '</svg>',
  // コロ: しばいぬ ふう。まろまゆ、きらきらの め、ちょこっと べろ
  koro: SVG0 +
    '<path d="M15 50 Q11 16 28 9 Q40 18 43 33Z" fill="#e8964a" stroke="#a85f22" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M85 50 Q89 16 72 9 Q60 18 57 33Z" fill="#e8964a" stroke="#a85f22" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M21 42 Q20 22 28 16 Q36 24 37 33Z M79 42 Q80 22 72 16 Q64 24 63 33Z" fill="#ffcfae"/>' +
    '<ellipse cx="50" cy="59" rx="39" ry="34" fill="#e8964a" stroke="#a85f22" stroke-width="2.5"/>' +
    '<path d="M16 64 Q20 92 50 92 Q80 92 84 64 Q72 72 63 63 Q57 57 50 61 Q43 57 37 63 Q28 72 16 64Z" fill="#fff5e6"/>' +
    '<path d="M44 30 Q50 26 56 30" stroke="#c97a35" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="34" cy="45" rx="4.5" ry="3" fill="#fff5e6"/><ellipse cx="66" cy="45" rx="4.5" ry="3" fill="#fff5e6"/>' +
    eye(34, 56, 6.5, 7.5, '#2b1a0d') + eye(66, 56, 6.5, 7.5, '#2b1a0d') +
    blush(22, 70) + blush(78, 70) +
    '<path d="M44 66 Q50 61 56 66 Q50 72 44 66Z" fill="#2b1a0d"/>' +
    '<ellipse cx="48" cy="64.5" rx="2" ry="1" fill="#fff" opacity=".8"/>' +
    '<path d="M47.5 76 Q50 85 52.5 76Z" fill="#ff7a8a" stroke="#d9506a" stroke-width="1"/>' +
    '<path class="mouth" d="M42 73 Q46 78 50 73 Q54 78 58 73" stroke="#2b1a0d" stroke-width="2.3" fill="none" stroke-linecap="round"/>' +
    '</svg>',
  // ホリーはかせ: きいろい ヘルメット、まるい めがね、ボブの かみ
  hakase: SVG0 +
    '<path d="M14 56 Q10 92 30 94 L70 94 Q90 92 86 56Z" fill="#7a4f34"/>' +
    '<ellipse cx="50" cy="61" rx="31" ry="29" fill="#ffe2c8" stroke="#b07a4a" stroke-width="2.5"/>' +
    '<path d="M19 55 Q22 38 50 39 Q78 38 81 55 Q72 47 64 52 Q58 44 50 51 Q42 44 35 52 Q27 47 19 55Z" fill="#7a4f34"/>' +
    '<path d="M14 47 Q13 9 50 9 Q87 9 86 47Z" fill="#ffd54f" stroke="#d4a017" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M50 10 L50 44" stroke="#f2b500" stroke-width="5"/>' +
    '<path d="M24 32 Q28 18 40 14" stroke="#fff" stroke-width="3.5" opacity=".75" fill="none" stroke-linecap="round"/>' +
    '<path d="M70 21 l2.4 5 5.4 .6 -4 3.7 1.1 5.3 -4.9 -2.7 -4.9 2.7 1.1 -5.3 -4 -3.7 5.4 -.6Z" fill="#ff8a65" stroke="#e0603a" stroke-width="1"/>' +
    '<rect x="8" y="43" width="84" height="9" rx="4.5" fill="#ffca28" stroke="#d4a017" stroke-width="2"/>' +
    '<circle cx="38" cy="64" r="11" fill="#fff" stroke="#e2604f" stroke-width="2.5"/>' +
    '<circle cx="62" cy="64" r="11" fill="#fff" stroke="#e2604f" stroke-width="2.5"/>' +
    eye(38, 65, 6, 7) + eye(62, 65, 6, 7) +
    '<path d="M48.5 63 Q50 61 51.5 63" stroke="#e2604f" stroke-width="2.5" fill="none"/>' +
    '<path d="M31 58 l3 -3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>' +
    blush(24, 76) + blush(76, 76) +
    '<path class="mouth" d="M44 78 Q50 86 56 78Z" fill="#e8605a" stroke="#b53e3a" stroke-width="1.5" stroke-linejoin="round"/>' +
    '</svg>'
};
})();

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
