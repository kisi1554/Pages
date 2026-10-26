"use strict";
/* てんくうエレベーター - おともだち（ぜんぶ オリジナル。え は Canvas で かく）
 *   kind … かきかた、c1/c2 … いろ、hat … ぼうし（person の とき）
 *   pitch/rate … こえ（speechSynthesis）、time … 'night' は よるだけ／'day' は ひるだけ
 */
const Friends = (() => {
  const L = [
    // ちそう・かせき
    { id: 'amon', name: 'アンモナイトの あもん', zone: 'chiso', kind: 'ammonite', c1: '#e8a87c', c2: '#b5653a', pitch: 1.3, rate: .9, hi: 'やあ！ ぼくは あもん。1おくねん まえから ここに いるんだ。', bye: 'うずまき パワーで いってらっしゃい！' },
    { id: 'gorota', name: 'いわの こびと ごろた', zone: 'chiso', kind: 'dwarf', c1: '#8d6e63', c2: '#5d4037', pitch: .7, rate: .85, hi: 'ほっほう、ようこそ。わしは いわの こびと ごろたじゃ。', bye: 'あしもとに きを つけてな。' },
    { id: 'sanyo', name: 'さんようちゅうの さんよ', zone: 'chiso', kind: 'trilobite', c1: '#a1887f', c2: '#6d4c41', pitch: 1.5, rate: 1.05, hi: 'こんにちは！ さんようちゅうの さんよ だよ。', bye: 'また ほりに きてね！' },
    { id: 'kirari', name: 'すいしょうの きらり', zone: 'chiso', kind: 'crystal', c1: '#b197fc', c2: '#7048e8', pitch: 1.6, rate: 1, hi: 'ライト ありがとう！ きらりは ひかりが だいすき。', bye: 'きらきら〜 またね。' },
    { id: 'mogujii', name: 'もぐらの もぐじい', zone: 'chiso', kind: 'mole', c1: '#6d4c41', c2: '#ffab91', pitch: .8, rate: .8, hi: 'ふぁ〜、ねむい ねむい。もぐらの もぐじい じゃよ。', bye: 'わしは もうすこし ほって くるかの。' },
    // ちかすい・すいどう
    { id: 'pochan', name: 'しずくの ぽちゃん', zone: 'mizu', kind: 'drop', c1: '#74c0fc', c2: '#1c7ed6', pitch: 1.7, rate: 1.1, hi: 'ぽちゃん！ しずくの ぽちゃん だよ。', bye: 'ぽたっ、またね〜！' },
    { id: 'puku', name: 'あわの ぷく', zone: 'mizu', kind: 'bubble', c1: '#c5f6fa', c2: '#3bc9db', pitch: 1.8, rate: 1.15, hi: 'ぷくぷく〜。あわの ぷく です。', bye: 'ぷくっと うかんで いくね。' },
    { id: 'kerosuke', name: 'かえるの けろすけ', zone: 'mizu', kind: 'frog', c1: '#69db7c', c2: '#2b8a3e', pitch: 1.2, rate: 1.1, hi: 'けろっ！ いどの かえる けろすけ さ。', bye: 'けろけろ、げんきでな！' },
    { id: 'mizuho', name: 'すいどうやさんの みずほさん', zone: 'mizu', kind: 'person', hat: 'helmet', c1: '#1971c2', c2: '#ffd43b', skin: '#f1c7a5', pitch: 1.15, rate: 1, hi: 'おつかれさま！ すいどうかんを みまわり ちゅうの みずほです。', bye: 'みずは だいじに つかってね。' },
    { id: 'medacchi', name: 'めだかの めだっち', zone: 'mizu', kind: 'fish', c1: '#ffd8a8', c2: '#f08c00', pitch: 1.6, rate: 1.2, hi: 'すいすい〜。めだかの めだっち だよ。', bye: 'すいすい、またね！' },
    // ちかてつ・ちかがい
    { id: 'tetsuo', name: 'うんてんしの てつおさん', zone: 'chika', kind: 'person', hat: 'conductor', c1: '#364fc7', c2: '#212529', skin: '#e9b98f', pitch: .9, rate: .95, hi: 'しゅっぱつ しんこう！ ちかてつの うんてんし、てつお です。', bye: 'ドアが しまります。ごちゅうい ください！' },
    { id: 'hanako', name: 'はなやの はなこさん', zone: 'chika', kind: 'person', hat: 'bandana', c1: '#f783ac', c2: '#2f9e44', skin: '#f6d0b1', pitch: 1.25, rate: 1, hi: 'いらっしゃい！ ちかがいの はなや、はなこ です。', bye: 'おはなを みて げんきに なってね。' },
    { id: 'nyoro', name: 'みみずの にょろ', zone: 'chika', kind: 'worm', c1: '#f4a3a8', c2: '#c2255c', pitch: 1.4, rate: .9, hi: 'にょろ〜ん。つちの なかから こんにちは。', bye: 'にょろにょろ、ばいばい！' },
    { id: 'nene', name: 'ねっこの ねね', zone: 'chika', kind: 'sprout', c1: '#8ce99a', c2: '#a9744f', pitch: 1.5, rate: 1, hi: 'うえでは きが そだって いるの。わたしは ねっこの ねね。', bye: 'のびのび、またね。' },
    { id: 'dango', name: 'だんごむしの ころん', zone: 'chika', kind: 'pillbug', c1: '#868e96', c2: '#495057', pitch: 1.3, rate: 1.05, hi: 'ころん！ びっくりして まるく なっちゃった。ころん だよ。', bye: 'ころころ、いってらっしゃい！' },
    // まち
    { id: 'komugi', name: 'パンやの こむぎさん', zone: 'machi', kind: 'person', hat: 'chef', c1: '#ffffff', c2: '#f59f00', skin: '#f6d0b1', pitch: 1.2, rate: 1, hi: 'やきたて ですよ！ パンやの こむぎ です。', bye: 'また パンを かいに きてね。' },
    { id: 'mike', name: 'ねこの みけ', zone: 'machi', kind: 'cat', c1: '#fff4e6', c2: '#e8590c', pitch: 1.5, rate: 1, hi: 'にゃあ。まちの ことなら みけに おまかせ。', bye: 'にゃっ、またね。' },
    { id: 'mamoru', name: 'おまわりの まもるさん', zone: 'machi', kind: 'person', hat: 'police', c1: '#1c3d7a', c2: '#ffd43b', skin: '#e9b98f', pitch: .95, rate: .95, hi: 'こんにちは！ まちを まもる まもる です。', bye: 'みちを わたる ときは、みぎ ひだり みぎ！' },
    { id: 'fumi', name: 'ゆうびんやの ふみさん', zone: 'machi', kind: 'person', hat: 'cap', c1: '#e03131', c2: '#1c7ed6', skin: '#f1c7a5', pitch: 1.2, rate: 1.05, hi: 'おとどけもの です！ ゆうびんやの ふみ です。', bye: 'てがみ、かいてね！' },
    { id: 'pochi', name: 'いぬの ぽち', zone: 'machi', kind: 'dog', c1: '#e9c46a', c2: '#a0522d', pitch: 1.3, rate: 1.1, hi: 'わん！ ぽち だよ。さんぽ ちゅう なんだ。', bye: 'わんわん、またね！' },
    { id: 'chun', name: 'すずめの ちゅん', zone: 'machi', kind: 'bird', bird: 'sparrow', c1: '#a9744f', c2: '#f1e3d3', pitch: 1.9, rate: 1.2, hi: 'ちゅんちゅん！ でんせんから おりて きたよ。', bye: 'ちゅん！' },
    // ビルの うえ・みなと
    { id: 'pika', name: 'まどふきの ピカさん', zone: 'biru', kind: 'person', hat: 'helmet', c1: '#2b8a3e', c2: '#fab005', skin: '#e9b98f', pitch: 1, rate: 1, hi: 'ゴンドラから こんにちは！ まどふき しょくにんの ピカ です。', bye: 'まどが ぴかぴかに なったよ！' },
    { id: 'kurosuke', name: 'カラスの くろすけ', zone: 'biru', kind: 'bird', bird: 'crow', c1: '#212529', c2: '#495057', pitch: .8, rate: 1, hi: 'カア！ くろすけ さまだ。たかい ところは まかせとけ。', bye: 'カア カア、またな。' },
    { id: 'poppo', name: 'ハトの ぽっぽ', zone: 'biru', kind: 'bird', bird: 'pigeon', c1: '#adb5bd', c2: '#7950f2', pitch: 1.3, rate: .95, hi: 'ポッポー。おくじょうの ぽっぽ です。', bye: 'クルックー！' },
    { id: 'shiori', name: 'かもめの しおり', zone: 'biru', kind: 'bird', bird: 'gull', c1: '#f8f9fa', c2: '#868e96', pitch: 1.5, rate: 1.1, hi: 'みゃあ！ みなとの かもめ、しおり よ。', bye: 'うみかぜに のって またね！' },
    { id: 'ikari', name: 'せんちょうの いかりさん', zone: 'biru', kind: 'person', hat: 'captain', c1: '#f8f9fa', c2: '#1c3d7a', skin: '#e0a882', beard: true, pitch: .75, rate: .9, hi: 'ようそろ！ せんちょうの いかり じゃ。', bye: 'よい こうかいを！' },
    { id: 'tsuruzo', name: 'クレーンの つるぞう', zone: 'biru', kind: 'crane', c1: '#ffa94d', c2: '#495057', pitch: .7, rate: .9, hi: 'ガッシャン！ みなとの ちからもち、つるぞう です。', bye: 'よいしょ、また あおう。' },
    // タワーより たかい
    { id: 'pihyoro', name: 'トンビの ぴーひょろ', zone: 'tower', kind: 'bird', bird: 'kite', c1: '#8b5a2b', c2: '#d9a066', pitch: 1.4, rate: 1, hi: 'ピーヒョロロ〜。くるりと わを かいて とんで きたよ。', bye: 'ピーヒョロロ！' },
    { id: 'batabata', name: 'ヘリコプターの ばたばた', zone: 'tower', kind: 'heli', c1: '#fa5252', c2: '#f8f9fa', pitch: 1.1, rate: 1.15, hi: 'バタバタバタ！ そらの パトロール ちゅう です。', bye: 'バタバタ〜 しゅっぱつ！' },
    { id: 'fuwari', name: 'ききゅうの ふわり', zone: 'tower', kind: 'balloon', c1: '#ff8787', c2: '#ffd43b', pitch: 1.35, rate: .85, hi: 'ふわ〜り。ききゅうの ふわり です。かぜまかせ なの。', bye: 'ふわふわ、またね〜。' },
    { id: 'sutto', name: 'つばめの すいっと', zone: 'tower', kind: 'bird', bird: 'swallow', c1: '#1d2b53', c2: '#fff5f5', pitch: 1.7, rate: 1.25, hi: 'すいっ！ つばめの すいっと。はやいでしょ？', bye: 'すいっと いってきます！' },
    { id: 'hyuu', name: 'かぜの こ ひゅう', zone: 'tower', kind: 'wind', c1: '#d0ebff', c2: '#4dabf7', pitch: 1.6, rate: 1.2, hi: 'ひゅるる〜ん。かぜの こ ひゅう だよ。', bye: 'ひゅう〜っ！' },
    // くもの なか・てんき
    { id: 'mokumoku', name: 'くもの こ もくもく', zone: 'kumo', kind: 'cloud', c1: '#ffffff', c2: '#a5d8ff', pitch: 1.5, rate: .95, hi: 'もくもく〜。くもの なかへ ようこそ！', bye: 'もくもく、またね。' },
    { id: 'gorosuke', name: 'かみなりの こ ごろすけ', zone: 'kumo', kind: 'thunder', c1: '#ffe066', c2: '#5c5f66', pitch: 1.3, rate: 1.2, hi: 'ゴロゴロ…ぴかっ！ かみなりの こ ごろすけ だい！', bye: 'ゴロゴロ、じゃあな！' },
    { id: 'shitoshito', name: 'あめつぶの しとしと', zone: 'kumo', kind: 'drop', c1: '#a5d8ff', c2: '#4263eb', pitch: 1.45, rate: .9, hi: 'しと しと…あめつぶの しとしと です。', bye: 'じめんまで おちて いくね。' },
    { id: 'nanairo', name: 'にじの こ なないろ', zone: 'kumo', kind: 'rainbow', c1: '#ff6b6b', c2: '#4dabf7', pitch: 1.6, rate: 1, hi: 'あめの あとは わたしの でばん！ にじの こ なないろ。', bye: 'そらに はしを かけて くるね。' },
    { id: 'moyako', name: 'きりの もやこ', zone: 'kumo', kind: 'fog', c1: '#e9ecef', c2: '#adb5bd', pitch: 1.2, rate: .8, hi: 'ぼんやり〜…きりの もやこ です…みえる？', bye: 'すう〜っと きえるね…。' },
    // くもの うえ
    { id: 'wataru', name: 'わたりどりの わたる', zone: 'kumoue', kind: 'bird', bird: 'goose', c1: '#ced4da', c2: '#343a40', pitch: 1.05, rate: 1, hi: 'こんにちは。きたの くにから とんで きた わたる です。', bye: 'みなみの しまへ しゅっぱつ！' },
    { id: 'tsubasa', name: 'ひこうきの つばさ', zone: 'kumoue', kind: 'plane', c1: '#f8f9fa', c2: '#1c7ed6', pitch: 1.1, rate: 1.05, hi: 'キーン！ ひこうきの つばさ です。くもの うえは いつも はれ！', bye: 'りりく〜！' },
    { id: 'kirara', name: 'ほしの こ きらら', zone: 'kumoue', kind: 'star', c1: '#ffe066', c2: '#fab005', time: 'night', pitch: 1.8, rate: 1, hi: 'こんばんは。ほしの こ きらら。よるに なると あえるの。', bye: 'きらり、おやすみ〜。' },
    { id: 'manmaru', name: 'つきの こ まんまる', zone: 'kumoue', kind: 'moon', c1: '#fff3bf', c2: '#e9c46a', time: 'night', pitch: 1.2, rate: .85, hi: 'よるの そらへ ようこそ。つきの こ まんまる です。', bye: 'よく ねむってね。' },
    { id: 'pokari', name: 'おひさまの こ ぽかり', zone: 'kumoue', kind: 'sun', c1: '#ffd43b', c2: '#ff922b', time: 'day', pitch: 1.4, rate: 1.1, hi: 'ぽかぽか〜！ おひさまの こ ぽかり だよ。', bye: 'げんき いっぱい、またね！' },
    // おくじょう
    { id: 'banin', name: 'てんくうの ばんにん そらじい', zone: 'okujo', kind: 'guardian', c1: '#e7f5ff', c2: '#1c7ed6', skin: '#f1c7a5', beard: true, pitch: .7, rate: .85, hi: 'よくぞ ここまで のぼって きたな。わしは てんくうの ばんにん、そらじい。', bye: 'そらは いつでも まって おるぞ。' },
  ];
  const BY = new Map(L.map(f => [f.id, f]));
  const ZONE = {};
  L.forEach(f => (ZONE[f.zone] = ZONE[f.zone] || []).push(f.id));

  /* よる・ひる だけの こは、あえない じかんなら おなじ ゾーンの べつの こに */
  function present(id, night, seed = 0) {
    const f = BY.get(id);
    if (!f) return null;
    if (!f.time || (f.time === 'night') === night) return f;
    const alt = ZONE[f.zone].map(i => BY.get(i)).filter(x => !x.time || (x.time === 'night') === night);
    return alt[seed % alt.length];
  }

  /* ---------------- え ---------------- */
  const TAU = Math.PI * 2;
  function ell(c, x, y, rx, ry, fill, stroke, lw, rot = 0) {
    c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
  }
  function face(c, x, y, s, o = {}) {
    const blink = o.blink, ex = s * .19, ey = 0;
    c.fillStyle = '#222';
    for (const d of [-1, 1]) {
      if (blink) { c.fillRect(x + d * ex - s * .06, y + ey, s * .12, s * .025); continue; }
      ell(c, x + d * ex, y + ey, s * .055, s * .07, '#222');
      ell(c, x + d * ex + s * .018, y + ey - s * .025, s * .02, s * .02, '#fff');
    }
    c.strokeStyle = '#222'; c.lineWidth = Math.max(1.5, s * .03); c.lineCap = 'round';
    c.beginPath();
    if (o.open) { ell(c, x, y + s * .16, s * .07, s * .06, '#c2255c'); }
    else { c.arc(x, y + s * .1, s * .09, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
    if (o.cheek !== false) {
      ell(c, x - s * .3, y + s * .1, s * .065, s * .04, 'rgba(255,120,140,.45)');
      ell(c, x + s * .3, y + s * .1, s * .065, s * .04, 'rgba(255,120,140,.45)');
    }
  }
  const HAT = {
    helmet(c, x, y, s, f) { c.fillStyle = f.c2; c.beginPath(); c.arc(x, y, s * .36, Math.PI, 0); c.fill(); c.fillRect(x - s * .44, y - s * .02, s * .88, s * .06); },
    conductor(c, x, y, s, f) { c.fillStyle = f.c2; c.fillRect(x - s * .3, y - s * .22, s * .6, s * .2); c.fillRect(x - s * .38, y - s * .04, s * .76, s * .07); c.fillStyle = '#ffd43b'; c.fillRect(x - s * .07, y - s * .17, s * .14, s * .08); },
    police(c, x, y, s, f) { c.fillStyle = f.c1; c.fillRect(x - s * .32, y - s * .24, s * .64, s * .22); c.fillStyle = '#111'; c.fillRect(x - s * .38, y - s * .04, s * .76, s * .07); c.fillStyle = f.c2; ell(c, x, y - s * .13, s * .06, s * .06, f.c2); },
    cap(c, x, y, s, f) { c.fillStyle = f.c1; c.beginPath(); c.arc(x, y, s * .33, Math.PI, 0); c.fill(); c.fillRect(x, y - s * .04, s * .42, s * .07); },
    chef(c, x, y, s) { c.fillStyle = '#fff'; c.strokeStyle = '#ddd'; c.lineWidth = 1.5; c.fillRect(x - s * .25, y - s * .2, s * .5, s * .2); ell(c, x - s * .15, y - s * .3, s * .17, s * .15, '#fff'); ell(c, x + s * .15, y - s * .3, s * .17, s * .15, '#fff'); ell(c, x, y - s * .38, s * .18, s * .16, '#fff'); },
    captain(c, x, y, s, f) { c.fillStyle = '#fff'; c.fillRect(x - s * .34, y - s * .22, s * .68, s * .2); c.fillStyle = f.c2; c.fillRect(x - s * .38, y - s * .04, s * .76, s * .07); ell(c, x, y - s * .12, s * .06, s * .05, '#fab005'); },
    bandana(c, x, y, s, f) { c.fillStyle = f.c2; c.beginPath(); c.arc(x, y + s * .02, s * .34, Math.PI * 1.05, -0.05); c.fill(); },
  };
  function person(c, f, x, y, s, t, o) {
    // からだ
    c.fillStyle = f.c1; c.beginPath();
    c.moveTo(x - s * .32, y + s * .5); c.quadraticCurveTo(x - s * .34, y + s * .02, x, y);
    c.quadraticCurveTo(x + s * .34, y + s * .02, x + s * .32, y + s * .5); c.closePath(); c.fill();
    if (f.hat === 'chef') { c.fillStyle = f.c2; c.fillRect(x - s * .22, y + s * .2, s * .44, s * .3); }
    if (f.hat === 'police' || f.hat === 'conductor' || f.hat === 'captain') {
      c.fillStyle = f.c2; for (const d of [-1, 1]) ell(c, x + d * s * .08, y + s * .22, s * .025, s * .025, f.hat === 'captain' ? '#fab005' : '#ffd43b');
    }
    // うで（てを ふる）
    const wave = o.wave ? Math.sin(t * 8) * .5 : 0;
    c.strokeStyle = f.c1; c.lineWidth = s * .1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - s * .27, y + s * .12); c.lineTo(x - s * .4, y + s * .38); c.stroke();
    c.beginPath(); c.moveTo(x + s * .27, y + s * .12); c.lineTo(x + s * .44 + wave * s * .1, y - s * .05 - wave * s * .05); c.stroke();
    ell(c, x + s * .44 + wave * s * .1, y - s * .08 - wave * s * .05, s * .06, s * .06, f.skin);
    // かお
    const hy = y - s * .2;
    ell(c, x, hy, s * .28, s * .27, f.skin);
    if (f.beard) { c.fillStyle = '#f1f3f5'; c.beginPath(); c.arc(x, hy + s * .08, s * .24, 0, Math.PI); c.fill(); }
    face(c, x, hy - s * .02, s * .9, o);
    if (f.hat && HAT[f.hat]) HAT[f.hat](c, x, hy - s * .14, s, f);
  }
  const DRAW = {
    person,
    guardian(c, f, x, y, s, t, o) {
      // はね
      for (const d of [-1, 1]) {
        c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath();
        c.moveTo(x + d * s * .15, y); c.quadraticCurveTo(x + d * s * .8, y - s * .5 - Math.sin(t * 3) * s * .05, x + d * s * .65, y + s * .2);
        c.quadraticCurveTo(x + d * s * .4, y + s * .1, x + d * s * .15, y + s * .2); c.fill();
      }
      person(c, Object.assign({}, f, { hat: null }), x, y, s, t, o);
      c.strokeStyle = '#ffd43b'; c.lineWidth = s * .03; ell(c, x, y - s * .55, s * .2, s * .05, null, '#ffd43b', s * .03);
    },
    ammonite(c, f, x, y, s, t, o) {
      for (let i = 0; i < 4; i++) { c.strokeStyle = f.c2; c.lineWidth = s * .06; c.beginPath(); c.moveTo(x - s * .25, y + s * .2 + i * s * .05); c.quadraticCurveTo(x - s * .45, y + s * .35, x - s * .5 + Math.sin(t * 3 + i) * s * .05, y + s * .45); c.stroke(); }
      ell(c, x, y, s * .42, s * .42, f.c1, f.c2, s * .04);
      c.strokeStyle = f.c2; c.lineWidth = s * .035; c.beginPath();
      for (let a = 0; a < TAU * 2.4; a += .15) { const r = s * .4 * Math.exp(-a * .28); c.lineTo(x + s * .05 + Math.cos(a) * r, y + Math.sin(a) * r); }
      c.stroke();
      face(c, x - s * .18, y + s * .1, s * .5, o);
    },
    trilobite(c, f, x, y, s, t, o) {
      for (let i = 0; i < 6; i++) { const yy = y - s * .25 + i * s * .1; c.strokeStyle = f.c2; c.lineWidth = s * .03; c.beginPath(); c.moveTo(x - s * .45, yy + s * .05); c.lineTo(x + s * .45, yy + s * .05); c.stroke(); }
      ell(c, x, y, s * .38, s * .45, f.c1, f.c2, s * .03);
      ell(c, x, y, s * .12, s * .43, f.c2);
      for (let i = 0; i < 5; i++) c.fillRect(x - s * .35, y - s * .1 + i * s * .1, s * .7, s * .015);
      ell(c, x, y - s * .3, s * .38, s * .2, f.c1, f.c2, s * .03);
      face(c, x, y - s * .3, s * .5, o);
    },
    dwarf(c, f, x, y, s, t, o) {
      ell(c, x, y + s * .25, s * .32, s * .3, f.c1);
      ell(c, x, y - s * .08, s * .25, s * .24, '#f1c7a5');
      c.fillStyle = '#f1f3f5'; c.beginPath(); c.moveTo(x - s * .22, y); c.quadraticCurveTo(x, y + s * .5, x + s * .22, y); c.fill();
      face(c, x, y - s * .1, s * .7, Object.assign({ cheek: false }, o));
      c.fillStyle = f.c2; c.beginPath(); c.moveTo(x - s * .28, y - s * .18); c.lineTo(x + s * .05 + Math.sin(t * 2) * s * .04, y - s * .7); c.lineTo(x + s * .28, y - s * .18); c.fill();
      ell(c, x + s * .05 + Math.sin(t * 2) * s * .04, y - s * .7, s * .05, s * .05, '#ffd43b');
      // つるはし
      c.strokeStyle = '#5c3d1e'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(x + s * .3, y + s * .45); c.lineTo(x + s * .45, y - s * .05); c.stroke();
      c.strokeStyle = '#adb5bd'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(x + s * .3, y - s * .08); c.quadraticCurveTo(x + s * .45, y - s * .15, x + s * .6, y - s * .02); c.stroke();
    },
    crystal(c, f, x, y, s, t, o) {
      const g = c.createLinearGradient(x - s * .3, y - s * .5, x + s * .3, y + s * .4);
      g.addColorStop(0, '#fff'); g.addColorStop(.4, f.c1); g.addColorStop(1, f.c2);
      c.fillStyle = g; c.beginPath();
      c.moveTo(x, y - s * .55); c.lineTo(x + s * .3, y - s * .25); c.lineTo(x + s * .25, y + s * .45); c.lineTo(x - s * .25, y + s * .45); c.lineTo(x - s * .3, y - s * .25); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - s * .55); c.lineTo(x, y + s * .45); c.stroke();
      face(c, x, y, s * .7, o);
      const sp = (Math.sin(t * 4) + 1) / 2;
      c.fillStyle = `rgba(255,255,255,${sp})`; c.beginPath(); c.arc(x + s * .35, y - s * .45, s * .05, 0, TAU); c.fill();
    },
    mole(c, f, x, y, s, t, o) {
      ell(c, x, y + s * .05, s * .4, s * .42, f.c1);
      ell(c, x, y + s * .15, s * .16, s * .1, f.c2);
      ell(c, x, y + s * .06, s * .06, s * .045, '#e64980');
      for (const d of [-1, 1]) { ell(c, x + d * s * .38, y + s * .25, s * .12, s * .09, f.c2); }
      c.fillStyle = '#111'; for (const d of [-1, 1]) c.fillRect(x + d * s * .16 - s * .05, y - s * .1, s * .1, s * .02);
      c.strokeStyle = '#ffd43b'; c.lineWidth = s * .025; for (const d of [-1, 1]) ell(c, x + d * s * .16, y - s * .1, s * .09, s * .08, null, '#ffd43b', s * .025);
      c.beginPath(); c.moveTo(x - s * .07, y - s * .1); c.lineTo(x + s * .07, y - s * .1); c.stroke();
    },
    drop(c, f, x, y, s, t, o) {
      const g = c.createRadialGradient(x - s * .1, y - s * .05, s * .05, x, y + s * .1, s * .5);
      g.addColorStop(0, '#fff'); g.addColorStop(.35, f.c1); g.addColorStop(1, f.c2);
      c.fillStyle = g; c.beginPath(); c.moveTo(x, y - s * .55);
      c.bezierCurveTo(x + s * .15, y - s * .3, x + s * .42, y - s * .05, x + s * .4, y + s * .18);
      c.arc(x, y + s * .18, s * .4, 0, Math.PI); c.bezierCurveTo(x - s * .42, y - s * .05, x - s * .15, y - s * .3, x, y - s * .55); c.fill();
      face(c, x, y + s * .12, s * .7, o);
    },
    bubble(c, f, x, y, s, t, o) {
      ell(c, x, y, s * .42, s * .42, 'rgba(197,246,250,.55)', f.c2, s * .03);
      ell(c, x - s * .16, y - s * .18, s * .09, s * .05, 'rgba(255,255,255,.9)', null, 0, -.6);
      ell(c, x + s * .38, y - s * .35 - (t * 20 % 20), s * .07, s * .07, null, f.c2, 2);
      face(c, x, y + s * .05, s * .7, o);
    },
    frog(c, f, x, y, s, t, o) {
      ell(c, x, y + s * .15, s * .42, s * .32, f.c1);
      for (const d of [-1, 1]) { ell(c, x + d * s * .22, y - s * .15, s * .14, s * .14, f.c1); ell(c, x + d * s * .22, y - s * .15, s * .08, s * .09, '#fff'); ell(c, x + d * s * .22, y - s * .14, s * .045, s * .06, '#111'); }
      c.strokeStyle = f.c2; c.lineWidth = s * .03; c.beginPath(); c.arc(x, y + s * .1, s * .2, .15 * Math.PI, .85 * Math.PI); c.stroke();
      ell(c, x, y + s * .3, s * .25, s * .12, '#d3f9d8');
    },
    fish(c, f, x, y, s, t, o) {
      const w = Math.sin(t * 6) * s * .06;
      c.fillStyle = f.c2; c.beginPath(); c.moveTo(x + s * .3, y); c.lineTo(x + s * .55, y - s * .2 + w); c.lineTo(x + s * .55, y + s * .2 + w); c.fill();
      ell(c, x, y, s * .38, s * .24, f.c1, f.c2, s * .02);
      ell(c, x - s * .18, y - s * .04, s * .06, s * .07, '#111');
      ell(c, x - s * .16, y - s * .06, s * .02, s * .02, '#fff');
      c.strokeStyle = f.c2; c.lineWidth = 2; c.beginPath(); c.arc(x - s * .3, y + s * .06, s * .05, 0, Math.PI); c.stroke();
    },
    worm(c, f, x, y, s, t, o) {
      c.strokeStyle = f.c1; c.lineWidth = s * .2; c.lineCap = 'round'; c.beginPath();
      for (let i = 0; i <= 10; i++) { const k = i / 10; c.lineTo(x - s * .45 + k * s * .7, y + s * .3 + Math.sin(k * 6 + t * 3) * s * .08 - (k > .8 ? (k - .8) * s * 2.5 : 0)); }
      c.stroke();
      ell(c, x + s * .3, y - s * .15, s * .16, s * .16, f.c1);
      face(c, x + s * .3, y - s * .15, s * .45, o);
      c.strokeStyle = f.c2; c.lineWidth = 2; for (let i = 1; i < 6; i++) { const k = i / 7; c.beginPath(); c.arc(x - s * .45 + k * s * .7, y + s * .3 + Math.sin(k * 6 + t * 3) * s * .08, s * .09, -.5, .5); c.stroke(); }
    },
    sprout(c, f, x, y, s, t, o) {
      c.strokeStyle = f.c2; c.lineWidth = s * .05;
      for (const a of [-.9, -.4, .1, .5, .9]) { c.beginPath(); c.moveTo(x, y + s * .3); c.quadraticCurveTo(x + a * s * .2, y + s * .45, x + a * s * .45, y + s * .55); c.stroke(); }
      ell(c, x, y + s * .1, s * .3, s * .28, '#d8a47f');
      face(c, x, y + s * .1, s * .55, o);
      c.strokeStyle = '#2f9e44'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(x, y - s * .15); c.lineTo(x, y - s * .35); c.stroke();
      ell(c, x - s * .12, y - s * .4, s * .13, s * .07, f.c1, null, 0, -.4); ell(c, x + s * .12, y - s * .42, s * .13, s * .07, f.c1, null, 0, .4);
    },
    pillbug(c, f, x, y, s, t, o) {
      ell(c, x, y + s * .1, s * .45, s * .3, f.c1);
      c.strokeStyle = f.c2; c.lineWidth = s * .025;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(x + i * s * .11, y - s * .18); c.quadraticCurveTo(x + i * s * .13, y + s * .1, x + i * s * .11, y + s * .38); c.stroke(); }
      ell(c, x - s * .4, y + s * .12, s * .14, s * .16, f.c2);
      face(c, x - s * .42, y + s * .1, s * .35, Object.assign({ cheek: false }, o));
    },
    cat(c, f, x, y, s, t, o) {
      c.strokeStyle = f.c2; c.lineWidth = s * .08; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + s * .3, y + s * .4); c.quadraticCurveTo(x + s * .6, y + s * .3, x + s * .5 + Math.sin(t * 2) * s * .1, y); c.stroke();
      ell(c, x, y + s * .25, s * .3, s * .25, f.c1);
      ell(c, x, y - s * .12, s * .3, s * .26, f.c1);
      for (const d of [-1, 1]) { c.fillStyle = d < 0 ? f.c2 : f.c1; c.beginPath(); c.moveTo(x + d * s * .28, y - s * .2); c.lineTo(x + d * s * .24, y - s * .48); c.lineTo(x + d * s * .06, y - s * .34); c.fill(); }
      ell(c, x + s * .12, y - s * .2, s * .14, s * .12, f.c2);
      face(c, x, y - s * .12, s * .7, o);
      c.strokeStyle = '#555'; c.lineWidth = 1;
      for (const d of [-1, 1]) for (const k of [-1, 1]) { c.beginPath(); c.moveTo(x + d * s * .15, y - s * .04 + k * s * .02); c.lineTo(x + d * s * .4, y - s * .04 + k * s * .06); c.stroke(); }
    },
    dog(c, f, x, y, s, t, o) {
      c.strokeStyle = f.c1; c.lineWidth = s * .08; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + s * .25, y + s * .25); c.lineTo(x + s * .45 + Math.sin(t * 10) * s * .06, y + s * .05); c.stroke();
      ell(c, x, y + s * .25, s * .3, s * .25, f.c1);
      ell(c, x, y - s * .12, s * .3, s * .27, f.c1);
      for (const d of [-1, 1]) ell(c, x + d * s * .3, y - s * .12, s * .1, s * .2, f.c2, null, 0, d * .3);
      ell(c, x, y - s * .02, s * .13, s * .09, '#fff');
      ell(c, x, y - s * .06, s * .05, s * .035, '#222');
      face(c, x, y - s * .16, s * .65, Object.assign({ cheek: false }, o));
      c.fillStyle = '#e03131'; c.fillRect(x - s * .22, y + s * .08, s * .44, s * .05);
    },
    bird(c, f, x, y, s, t, o) {
      const fl = Math.sin(t * (o.fly ? 14 : 3)) * (o.fly ? .5 : .1);
      const b = f.bird;
      const body = f.c1, wing = b === 'gull' ? '#868e96' : b === 'pigeon' ? '#868e96' : b === 'sparrow' ? '#7b5232' : f.c2 === '#fff5f5' ? f.c1 : f.c2;
      c.fillStyle = b === 'swallow' ? f.c1 : body;
      // しっぽ
      c.beginPath(); c.moveTo(x + s * .25, y + s * .1); c.lineTo(x + s * .6, y + (b === 'swallow' ? s * .35 : s * .2)); c.lineTo(x + s * .5, y + s * .05); c.lineTo(x + s * .62, y - s * .02); c.closePath(); c.fill();
      ell(c, x, y + s * .05, s * .34, s * .27, b === 'swallow' ? f.c1 : body);
      if (b === 'swallow' || b === 'sparrow' || b === 'kite') ell(c, x - s * .05, y + s * .15, s * .22, s * .15, b === 'kite' ? f.c2 : f.c2 === '#fff5f5' ? '#fff5f5' : f.c2);
      if (b === 'pigeon') ell(c, x - s * .15, y - s * .05, s * .12, s * .12, 'rgba(121,80,242,.35)');
      // あたま
      ell(c, x - s * .25, y - s * .2, s * .2, s * .19, b === 'swallow' ? f.c1 : body);
      if (b === 'swallow') ell(c, x - s * .32, y - s * .1, s * .08, s * .05, '#e03131');
      if (b === 'sparrow') { ell(c, x - s * .25, y - s * .3, s * .16, s * .1, '#7b5232'); ell(c, x - s * .28, y - s * .12, s * .05, s * .04, '#222'); }
      // くちばし
      c.fillStyle = b === 'crow' ? '#343a40' : b === 'gull' ? '#fab005' : b === 'goose' ? '#fd7e14' : '#f59f00';
      c.beginPath(); c.moveTo(x - s * .42, y - s * .22); c.lineTo(x - s * (b === 'crow' ? .62 : .56), y - s * .17); c.lineTo(x - s * .42, y - s * .13); c.fill();
      ell(c, x - s * .3, y - s * .24, s * .045, s * .05, b === 'crow' ? '#fff' : '#111');
      ell(c, x - s * .3, y - s * .24, s * .02, s * .025, b === 'crow' ? '#111' : '#fff');
      // つばさ
      c.save(); c.translate(x + s * .02, y - s * .02); c.rotate(-fl);
      ell(c, s * .1, 0, s * .26, s * .12, b === 'swallow' ? f.c1 : wing, null, 0, .2);
      c.restore();
      if (!o.fly) { c.strokeStyle = '#f59f00'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - s * .05, y + s * .3); c.lineTo(x - s * .05, y + s * .45); c.moveTo(x + s * .08, y + s * .3); c.lineTo(x + s * .08, y + s * .45); c.stroke(); }
    },
    crane(c, f, x, y, s, t, o) {
      c.fillStyle = f.c2; c.fillRect(x - s * .3, y + s * .3, s * .6, s * .18);
      c.fillStyle = f.c1; c.fillRect(x - s * .22, y - s * .15, s * .44, s * .47);
      c.save(); c.translate(x, y - s * .1); c.rotate(-.5 + Math.sin(t) * .05);
      c.fillRect(0, -s * .05, s * .6, s * .09); c.restore();
      c.strokeStyle = '#495057'; c.lineWidth = 2; const ax = x + s * .52 * Math.cos(-.5), ay = y - s * .1 + s * .52 * Math.sin(-.5);
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax, ay + s * .4); c.stroke();
      c.fillStyle = '#495057'; c.fillRect(ax - s * .05, ay + s * .4, s * .1, s * .05);
      c.fillStyle = '#e7f5ff'; c.fillRect(x - s * .16, y - s * .1, s * .32, s * .2);
      face(c, x, y - s * .02, s * .45, o);
    },
    heli(c, f, x, y, s, t, o) {
      c.fillStyle = f.c1; c.fillRect(x + s * .2, y - s * .05, s * .45, s * .08);
      ell(c, x + s * .66, y - s * .03, s * .05, s * .14, f.c1);
      ell(c, x - s * .05, y, s * .38, s * .27, f.c1);
      ell(c, x - s * .18, y - s * .05, s * .18, s * .14, '#d0ebff');
      face(c, x - s * .14, y - s * .04, s * .4, o);
      c.strokeStyle = '#495057'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - s * .3, y + s * .38); c.lineTo(x + s * .2, y + s * .38); c.moveTo(x - s * .2, y + s * .26); c.lineTo(x - s * .2, y + s * .38); c.moveTo(x + s * .1, y + s * .26); c.lineTo(x + s * .1, y + s * .38); c.stroke();
      c.fillStyle = '#495057'; c.fillRect(x - s * .07, y - s * .34, s * .04, s * .1);
      const r = Math.abs(Math.cos(t * 25)) * s * .6;
      c.fillRect(x - s * .05 - r, y - s * .36, r * 2, s * .03);
    },
    balloon(c, f, x, y, s, t, o) {
      const g = c.createLinearGradient(x - s * .4, 0, x + s * .4, 0);
      for (let i = 0; i < 6; i++) { g.addColorStop(i / 6, i % 2 ? f.c1 : f.c2); g.addColorStop((i + 1) / 6 - .001, i % 2 ? f.c1 : f.c2); }
      c.fillStyle = g; c.beginPath(); c.arc(x, y - s * .15, s * .4, Math.PI * .8, Math.PI * .2); c.lineTo(x + s * .12, y + s * .28); c.lineTo(x - s * .12, y + s * .28); c.closePath(); c.fill();
      face(c, x, y - s * .12, s * .55, o);
      c.strokeStyle = '#8d6e63'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - s * .12, y + s * .28); c.lineTo(x - s * .1, y + s * .38); c.moveTo(x + s * .12, y + s * .28); c.lineTo(x + s * .1, y + s * .38); c.stroke();
      c.fillStyle = '#a0522d'; c.fillRect(x - s * .12, y + s * .38, s * .24, s * .14);
    },
    wind(c, f, x, y, s, t, o) {
      c.strokeStyle = f.c2; c.lineWidth = s * .05; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + s * .35, y - s * .2 + i * s * .2, s * .1, Math.PI, Math.PI * 2.5 + Math.sin(t * 3 + i) * .3); c.stroke(); c.beginPath(); c.moveTo(x + s * .25, y - s * .2 + i * s * .2); c.lineTo(x - s * .5 + Math.sin(t * 4 + i) * s * .05, y - s * .2 + i * s * .2); c.stroke(); }
      ell(c, x - s * .05, y, s * .28, s * .28, f.c1, f.c2, s * .03);
      face(c, x - s * .05, y, s * .55, o);
    },
    cloud(c, f, x, y, s, t, o) {
      const by = Math.sin(t * 2) * s * .03;
      c.fillStyle = f.c1; c.strokeStyle = f.c2; c.lineWidth = s * .03;
      const puffs = [[-.28, .08, .22], [.28, .08, .22], [-.12, -.12, .26], [.14, -.14, .24], [0, .1, .28]];
      c.beginPath(); for (const [px, py, r] of puffs) { c.moveTo(x + px * s + r * s, y + py * s + by); c.arc(x + px * s, y + py * s + by, r * s, 0, TAU); } c.stroke();
      for (const [px, py, r] of puffs) ell(c, x + px * s, y + py * s + by, r * s, r * s, f.c1);
      face(c, x, y + s * .02 + by, s * .6, o);
    },
    fog(c, f, x, y, s, t, o) {
      for (let i = 0; i < 4; i++) ell(c, x + Math.sin(t + i * 2) * s * .2, y - s * .1 + i * s * .12, s * (.45 - i * .05), s * .14, `rgba(233,236,239,${.85 - i * .15})`);
      face(c, x, y, s * .55, Object.assign({ blink: true }, o));
    },
    thunder(c, f, x, y, s, t, o) {
      DRAW.cloud(c, { c1: '#ced4da', c2: '#5c5f66' }, x, y - s * .1, s * .9, t, o);
      for (const d of [-1, 1]) { c.fillStyle = '#fff3bf'; c.beginPath(); c.moveTo(x + d * s * .18, y - s * .4); c.lineTo(x + d * s * .26, y - s * .58); c.lineTo(x + d * s * .3, y - s * .36); c.fill(); }
      c.fillStyle = f.c1; c.beginPath(); c.moveTo(x - s * .05, y + s * .2); c.lineTo(x + s * .12, y + s * .2); c.lineTo(x + s * .02, y + s * .35); c.lineTo(x + s * .14, y + s * .35); c.lineTo(x - s * .1, y + s * .6); c.lineTo(x - s * .02, y + s * .4); c.lineTo(x - s * .12, y + s * .4); c.closePath(); c.fill();
    },
    rainbow(c, f, x, y, s, t, o) {
      const cols = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#5c7cfa', '#b197fc'];
      cols.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = s * .055; c.beginPath(); c.arc(x, y + s * .25, s * (.5 - i * .05), Math.PI, 0); c.stroke(); });
      ell(c, x, y + s * .15, s * .2, s * .2, '#fff');
      face(c, x, y + s * .15, s * .38, o);
      DRAW.cloud(c, { c1: '#fff', c2: '#dee2e6' }, x - s * .48, y + s * .3, s * .3, t, { blink: true });
      DRAW.cloud(c, { c1: '#fff', c2: '#dee2e6' }, x + s * .48, y + s * .3, s * .3, t, { blink: true });
    },
    plane(c, f, x, y, s, t, o) {
      c.fillStyle = f.c2; c.beginPath(); c.moveTo(x - s * .05, y); c.lineTo(x + s * .25, y - s * .38); c.lineTo(x + s * .35, y - s * .38); c.lineTo(x + s * .25, y); c.fill();
      c.beginPath(); c.moveTo(x - s * .05, y + s * .05); c.lineTo(x + s * .2, y + s * .4); c.lineTo(x + s * .3, y + s * .4); c.lineTo(x + s * .25, y + s * .05); c.fill();
      ell(c, x, y, s * .55, s * .14, f.c1, '#ced4da', 2);
      c.fillStyle = f.c2; c.beginPath(); c.moveTo(x + s * .42, y - s * .05); c.lineTo(x + s * .55, y - s * .3); c.lineTo(x + s * .6, y - s * .3); c.lineTo(x + s * .55, y); c.fill();
      c.fillStyle = '#74c0fc'; for (let i = 0; i < 5; i++) ell(c, x - s * .05 + i * s * .1, y - s * .03, s * .025, s * .03, '#74c0fc');
      face(c, x - s * .38, y, s * .28, o);
    },
    star(c, f, x, y, s, t, o) {
      const r1 = s * .48, r2 = s * .22, rot = Math.sin(t) * .1;
      c.fillStyle = f.c1; c.strokeStyle = f.c2; c.lineWidth = s * .03; c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + rot + i * Math.PI / 5, r = i % 2 ? r2 : r1; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      c.closePath(); c.fill(); c.stroke();
      face(c, x, y + s * .03, s * .5, o);
    },
    moon(c, f, x, y, s, t, o) {
      ell(c, x, y, s * .42, s * .42, f.c1, f.c2, s * .03);
      ell(c, x + s * .18, y - s * .18, s * .06, s * .06, 'rgba(233,196,106,.5)'); ell(c, x - s * .2, y + s * .2, s * .05, s * .05, 'rgba(233,196,106,.5)');
      c.fillStyle = '#495057'; c.beginPath(); c.moveTo(x - s * .2, y - s * .38); c.lineTo(x + s * .05, y - s * .62); c.lineTo(x + s * .2, y - s * .38); c.fill();
      ell(c, x + s * .05, y - s * .62, s * .05, s * .05, '#fff');
      face(c, x, y + s * .02, s * .6, Object.assign({ blink: true }, o));
    },
    sun(c, f, x, y, s, t, o) {
      c.strokeStyle = f.c2; c.lineWidth = s * .06; c.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * .5; c.beginPath(); c.moveTo(x + Math.cos(a) * s * .4, y + Math.sin(a) * s * .4); c.lineTo(x + Math.cos(a) * s * .55, y + Math.sin(a) * s * .55); c.stroke(); }
      ell(c, x, y, s * .36, s * .36, f.c1);
      face(c, x, y, s * .6, o);
    },
  };

  /* (x, y) が まんなか、s が おおきさ。o = { blink, open, wave, fly } */
  function draw(c, id, x, y, s, t, o = {}) {
    const f = typeof id === 'string' ? BY.get(id) : id;
    if (!f) return;
    const blink = o.blink != null ? o.blink : (t % 4) < .12;
    c.save(); c.lineJoin = 'round';
    (DRAW[f.kind] || DRAW.cloud)(c, f, x, y + Math.sin(t * 2.2) * s * .02, s, t, Object.assign({}, o, { blink }));
    c.restore();
  }

  return { LIST: L, ZONE, get: id => BY.get(id), present, draw };
})();
if (typeof module !== 'undefined') module.exports = Friends;
