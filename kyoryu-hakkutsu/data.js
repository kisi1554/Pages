/* きょうりゅう はっくつ — データ
 *
 * 数値は 国立科学博物館・福井県立恐竜博物館 など 博物館の 展示・資料（README の 出典）を もとに、
 * 研究で かわる ものは「やく」「〜くらい」と はばを もたせて いる。
 * len は おおきさくらべ・え の 縮尺に つかう だいひょうの 数（m）。
 * diet: niku（にく）/ shoku（しょくぶつ）/ zatsu（なんでも たべた かも）
 * type: え の かた（art.js）、mod: かたちの ちがい、f: かざり、col: [からだ, おなか, もよう]（いろは そうぞう）
 *
 * 「漢字{かんじ}」は ふりがな に なる。
 */

var PERIODS = {
  K: { id: 'K', name: '白亜紀{はくあき}', plain: 'はくあき', from: 145, to: 66, color: '#e3cf9f', dark: '#b89a5e',
    soil: 'しろっぽい すなの ちそう', range: 'やく 1おく4500まん 〜 6600まん ねんまえ' },
  J: { id: 'J', name: 'ジュラ紀{き}', plain: 'ジュラき', from: 201, to: 145, color: '#d39a68', dark: '#a8693a',
    soil: 'あかちゃいろの ちそう', range: 'やく 2おく100まん 〜 1おく4500まん ねんまえ' },
  T: { id: 'T', name: '三畳紀{さんじょうき}', plain: 'さんじょうき', from: 252, to: 201, color: '#a65f43', dark: '#7a3e28',
    soil: 'まっかな ちそう', range: 'やく 2おく5200まん 〜 2おく100まん ねんまえ' }
};
var PERIOD_ORDER = ['K', 'J', 'T']; // うえ（あたらしい）→ した（ふるい）

var DIET = {
  niku: { icon: '🍖', name: 'にく' },
  shoku: { icon: '🌿', name: 'しょくぶつ' },
  zatsu: { icon: '🍖🌿', name: 'なんでも たべた かも' }
};

var DINOS = [
  /* ===== 白亜紀 ===== */
  { id: 'trex', name: 'ティラノサウルス', period: 'K', ma: 67, len: 12.5, lenTxt: 'やく 12〜13m', wt: 'やく 6〜9トン', diet: 'niku',
    country: 'アメリカ・カナダ', note: 'かむ ちからが とても つよい。ほねごと かみくだいて いた らしい。',
    type: 'thero', mod: { hs: 1.3, fl: .7, bt: 1.05 }, f: {}, col: ['#6f9440', '#e2d9a2', '#4c6a2a'], pat: 'stripe', voice: 1 },
  { id: 'trike', name: 'トリケラトプス', period: 'K', ma: 67, len: 8.5, lenTxt: 'やく 8〜9m', wt: 'やく 6〜12トン', diet: 'shoku',
    country: 'アメリカ・カナダ', note: '3ほんの つのと おおきな えりかざり。なまえは「3ほん つのの かお」と いう いみ。',
    type: 'cera', mod: {}, f: { frill: 1, horns: 'tri', beak: 1 }, col: ['#5f86a8', '#dfe3d0', '#c76d4a'], pat: 'band', voice: .8 },
  { id: 'spino', name: 'スピノサウルス', period: 'K', ma: 97, len: 14.5, lenTxt: 'やく 14〜15m', wt: 'やく 7〜20トン（研究{けんきゅう}で ちがう）', diet: 'niku', food: 'さかな など',
    country: 'エジプト・モロッコ', note: 'せなかに おおきな「ほ」。みずべで さかなを とって いたと かんがえられて いる。',
    type: 'thero', mod: { hs: 1.15, sn: 1.35, sr: .7, nk: 1.25, hl: .75, bt: .9, fl: 1.4 }, f: { sail: 1 }, col: ['#6c98a8', '#e4e0c8', '#c9714f'], pat: 'spot', voice: .95 },
  { id: 'velo', name: 'ヴェロキラプトル', period: 'K', ma: 73, len: 1.8, lenTxt: 'やく 1.5〜2m', wt: 'やく 15〜20kg', diet: 'niku',
    country: 'モンゴル・中国{ちゅうごく}', note: 'うでの ほねに はねの あとが ある。からだは はねで おおわれて いた。',
    type: 'thero', mod: { hs: .8, bt: .65, fl: 1.9, tl: 1.1, hl: 1.05, nk: 1.15 }, f: { feathers: 1 }, col: ['#9a7b55', '#efe2c4', '#5d4a7a'], pat: 'stripe', voice: .15 },
  { id: 'ankylo', name: 'アンキロサウルス', period: 'K', ma: 67, len: 7, lenTxt: 'やく 6〜8m', wt: 'やく 5〜8トン', diet: 'shoku',
    country: 'アメリカ・カナダ', note: 'せなかは かたい よろい。しっぽの さきの こぶを ふりまわして みを まもった。',
    type: 'ankylo', mod: { bt: 1.05 }, f: { armor: 1, club: 1, beak: 1 }, col: ['#8a8f5a', '#e2dcb4', '#5e5f36'], pat: 'none', voice: .75 },
  { id: 'pachy', name: 'パキケファロサウルス', period: 'K', ma: 67, len: 4.5, lenTxt: 'やく 4〜4.5m', wt: 'やく 400kg くらい', diet: 'shoku',
    country: 'アメリカ', note: 'あたまの ほねが ぶあつく もりあがって いる（25cm くらい ある ものも）。',
    type: 'thero', mod: { hs: .85, sn: .7, nk: .9, fl: 1.2 }, f: { dome: 1, beak: 1 }, col: ['#b08a5a', '#efe2c0', '#7d5a8c'], pat: 'spot', voice: .4 },
  { id: 'parasaur', name: 'パラサウロロフス', period: 'K', ma: 75, len: 9.5, lenTxt: 'やく 9〜10m', wt: 'やく 2.5〜3.5トン', diet: 'shoku',
    country: 'カナダ・アメリカ', note: 'あたまの ながい とさかは なかが くだに なって いて、おとを ひびかせた かも。',
    type: 'hadro', mod: { sr: 1.15 }, f: { crest: 'tube', beak: 1 }, col: ['#c48a3f', '#f1e2bb', '#8f4f2a'], pat: 'stripe', voice: .6 },
  { id: 'iguano', name: 'イグアノドン', period: 'K', ma: 125, len: 10, lenTxt: 'やく 9〜11m', wt: 'やく 3〜4トン', diet: 'shoku',
    country: 'ベルギー・イギリス など', note: 'おやゆびが とがった とげ。はやい じだいに しらべられた きょうりゅうの 1つ。',
    type: 'hadro', mod: { sn: .9, bt: 1.05 }, f: { thumb: 1, beak: 1 }, col: ['#7c9b5b', '#e3dfb8', '#55703c'], pat: 'spot', voice: .65 },
  { id: 'proto', name: 'プロトケラトプス', period: 'K', ma: 73, len: 2, lenTxt: 'やく 1.8〜2.5m', wt: 'やく 80〜180kg', diet: 'shoku',
    country: 'モンゴル・中国{ちゅうごく}', note: 'ちいさな えりかざり。たまごや こどもの かせきも たくさん みつかって いる。',
    type: 'cera', mod: { hs: 1.05, bt: .85 }, f: { frill: .8, beak: 1 }, col: ['#c9a46a', '#f3e6c6', '#8f6a3a'], pat: 'spot', voice: .3 },
  { id: 'ovi', name: 'オヴィラプトル', period: 'K', ma: 75, len: 1.8, lenTxt: 'やく 1.6〜2m', wt: 'やく 20〜40kg', diet: 'zatsu',
    country: 'モンゴル', note: 'はが ない くちばし。なかまの かせきで、たまごを だいて あたためる すがたが みつかった。',
    type: 'thero', mod: { hs: .7, sn: .7, bt: .78, nk: 1.35, fl: 1.8, tl: .7 }, f: { feathers: 1, crest: 'round', beak: 1 }, col: ['#5f8f8a', '#ece6cf', '#c25a3c'], pat: 'none', voice: .15 },
  { id: 'giga', name: 'ギガノトサウルス', period: 'K', ma: 98, len: 12.5, lenTxt: 'やく 12〜13m', wt: 'やく 6〜8トン', diet: 'niku',
    country: 'アルゼンチン', note: 'ティラノサウルスと おなじ くらい おおきい。でも すんで いた じだいも ばしょも ちがう。',
    type: 'thero', mod: { hs: 1.2, sn: 1.1, fl: .9, bt: .95 }, f: {}, col: ['#b9773f', '#efdcb2', '#7a4521'], pat: 'stripe', voice: 1 },
  { id: 'carno', name: 'カルノタウルス', period: 'K', ma: 71, len: 7.8, lenTxt: 'やく 7.5〜8m', wt: 'やく 1.3〜2トン', diet: 'niku',
    country: 'アルゼンチン', note: 'めの うえに 2ほんの つの。うでは とても みじかい。ひふの あとも みつかって いる。',
    type: 'thero', mod: { hs: .85, sn: .8, fl: .5, bt: .85, hl: 1.1 }, f: { browhorn: 1 }, col: ['#b9553f', '#efd6b8', '#6e2f22'], pat: 'spot', voice: .85 },
  { id: 'styraco', name: 'スティラコサウルス', period: 'K', ma: 75, len: 5.3, lenTxt: 'やく 5〜5.5m', wt: 'やく 2〜3トン', diet: 'shoku',
    country: 'カナダ', note: 'はなの うえに おおきな つの、えりかざりの まわりに ながい とげ。',
    type: 'cera', mod: { bt: .95 }, f: { frill: .95, horns: 'styraco', beak: 1 }, col: ['#9b7a4a', '#ebdcb8', '#c7543c'], pat: 'band', voice: .7 },
  { id: 'deino', name: 'デイノニクス', period: 'K', ma: 112, len: 3.2, lenTxt: 'やく 3〜3.4m', wt: 'やく 60〜100kg', diet: 'niku',
    country: 'アメリカ', note: 'あしに おおきな かぎづめ。「とりは きょうりゅうの なかま」と わかる きっかけに なった。',
    type: 'thero', mod: { hs: .85, bt: .72, fl: 1.8, tl: 1.1, hl: 1.05 }, f: { feathers: 1 }, col: ['#6b6f8f', '#e6e2d2', '#3f4260'], pat: 'stripe', voice: .25 },
  { id: 'galli', name: 'ガリミムス', period: 'K', ma: 70, len: 6, lenTxt: 'やく 6m', wt: 'やく 400〜500kg', diet: 'zatsu',
    country: 'モンゴル', note: 'ダチョウに にた からだ。あしが ながくて はしるのが はやかった らしい。',
    type: 'thero', mod: { hs: .55, sn: .8, bt: .72, nk: 1.9, hl: 1.35, fl: 1.6 }, f: { beak: 1 }, col: ['#c8a050', '#f3e7c4', '#8a6a2a'], pat: 'none', voice: .3 },
  { id: 'maia', name: 'マイアサウラ', period: 'K', ma: 77, len: 8, lenTxt: 'やく 7〜9m', wt: 'やく 2〜4トン', diet: 'shoku',
    country: 'アメリカ', note: 'なまえは「よい おかあさん トカゲ」。すと たまご・あかちゃんが いっしょに みつかった。',
    type: 'hadro', mod: { sr: 1.25 }, f: { beak: 1 }, col: ['#7c9a6a', '#e7e0c0', '#4e6a40'], pat: 'stripe', voice: .6 },
  { id: 'argentino', name: 'アルゼンチノサウルス', period: 'K', ma: 95, len: 32, lenTxt: 'やく 30〜35m（研究{けんきゅう}で ちがう）', wt: 'やく 50〜80トン', diet: 'shoku',
    country: 'アルゼンチン', note: 'みつかって いる なかで いちばん おおきい きょうりゅうの 1つ。ほねは せぼねなど 一部{いちぶ}だけ。',
    type: 'sauro', mod: { nk: 1.2, bt: 1.2, fl: 1.15, hl: 1.15, tl: .95 }, f: {}, col: ['#8d8a76', '#e1dccb', '#62604f'], pat: 'band', voice: 1 },
  { id: 'fraptor', name: 'フクイラプトル', period: 'K', ma: 120, len: 4.2, lenTxt: 'やく 4.2m（みつかった こたい）', wt: 'わかって いない', diet: 'niku', japan: true,
    country: '日本{にほん}（福井県{ふくいけん} 勝山市{かつやまし}）', note: '日本{にほん}で はじめて 全身{ぜんしん}の ほねが くみたてられた にくしょく きょうりゅう。てに おおきな つめ。',
    type: 'thero', mod: { hs: .9, bt: .72, fl: 1.8, hl: 1.15 }, f: {}, col: ['#c98a3b', '#f2e0bb', '#7a4a20'], pat: 'stripe', voice: .5 },
  { id: 'fsaurus', name: 'フクイサウルス', period: 'K', ma: 120, len: 4.7, lenTxt: 'やく 4.7m', wt: 'わかって いない', diet: 'shoku', japan: true,
    country: '日本{にほん}（福井県{ふくいけん} 勝山市{かつやまし}）', note: 'イグアノドンの なかま。あごで すりつぶして しょくぶつを たべた。',
    type: 'hadro', mod: { sn: .85, bt: .95 }, f: { beak: 1 }, col: ['#7fa25a', '#e6e2b8', '#4f7034'], pat: 'spot', voice: .45 },
  { id: 'ftitan', name: 'フクイティタン', period: 'K', ma: 120, len: 10, lenTxt: 'やく 10m', wt: 'わかって いない', diet: 'shoku', japan: true,
    country: '日本{にほん}（福井県{ふくいけん} 勝山市{かつやまし}）', note: 'くびの ながい りゅうきゃくるいの なかま。なまえは「福井{ふくい}の 巨人{きょじん}」。',
    type: 'sauro', mod: { nk: 1.1, fl: 1.2, hl: 1.1, tl: .85 }, f: {}, col: ['#8c9a7a', '#e5e2cc', '#5e6b52'], pat: 'band', voice: .85 },
  { id: 'fvenator', name: 'フクイベナートル', period: 'K', ma: 120, len: 2.5, lenTxt: 'やく 2.5m', wt: 'やく 25kg', diet: 'zatsu', japan: true,
    country: '日本{にほん}（福井県{ふくいけん} 勝山市{かつやまし}）', note: 'とりに ちかい なかま。ほねの なかみまで しらべられ、のうや みみの かたちも わかった。',
    type: 'thero', mod: { hs: .65, sn: .85, bt: .7, nk: 1.45, fl: 1.7 }, f: { feathers: 1 }, col: ['#a8865a', '#efe3c6', '#5a6f8a'], pat: 'spot', voice: .2 },
  { id: 'kamuy', name: 'カムイサウルス', jp: 'むかわ竜{りゅう}', period: 'K', ma: 72, len: 8, lenTxt: 'やく 8m', wt: 'やく 4〜5トン', diet: 'shoku', japan: true,
    country: '日本{にほん}（北海道{ほっかいどう} むかわ町{ちょう}）', note: 'うみの ちそうから みつかった。全身{ぜんしん}の ほねの 大部分{だいぶぶん}が そろって いる。',
    type: 'hadro', mod: { sr: 1.2, bt: 1.05 }, f: { beak: 1 }, col: ['#6f8fa0', '#e4e2d0', '#3f5f70'], pat: 'stripe', voice: .6 },
  { id: 'tamba', name: 'タンバティタニス', jp: '丹波竜{たんばりゅう}', period: 'K', ma: 112, len: 13, lenTxt: 'やく 10〜15m（研究{けんきゅう}で ちがう）', wt: 'わかって いない', diet: 'shoku', japan: true,
    country: '日本{にほん}（兵庫県{ひょうごけん} 丹波市{たんばし}）', note: 'かわらで ぐうぜん みつかった。くびの ながい りゅうきゃくるいの なかま。',
    type: 'sauro', mod: { nk: 1.1, bt: 1.1, fl: 1.1, hl: 1.1 }, f: {}, col: ['#a08a6a', '#ece2cc', '#6e5a3e'], pat: 'band', voice: .9 },
  { id: 'yamato', name: 'ヤマトサウルス', period: 'K', ma: 71, len: 7.5, lenTxt: 'やく 7〜8m', wt: 'わかって いない', diet: 'shoku', japan: true,
    country: '日本{にほん}（兵庫県{ひょうごけん} 淡路島{あわじしま}）', note: 'カモノハシりゅうの なかま。あごや はの かせきから しらべられた。',
    type: 'hadro', mod: { sr: 1.1 }, f: { beak: 1 }, col: ['#9a8a5a', '#ece4c4', '#6a5a2e'], pat: 'spot', voice: .55 },

  /* ===== ジュラ紀 ===== */
  { id: 'stego', name: 'ステゴサウルス', period: 'J', ma: 152, len: 8, lenTxt: 'やく 7〜9m', wt: 'やく 3〜5トン', diet: 'shoku',
    country: 'アメリカ・ポルトガル', note: 'せなかに おおきな いた、しっぽに 4ほんの とげ。のうは からだの わりに ちいさい。',
    type: 'stego', mod: {}, f: { plates: 1, spikes: 1, beak: 1 }, col: ['#8aa05a', '#e6e2b8', '#c96a3c'], pat: 'spot', voice: .7 },
  { id: 'allo', name: 'アロサウルス', period: 'J', ma: 152, len: 9, lenTxt: 'やく 8.5〜10m', wt: 'やく 1.5〜2.5トン', diet: 'niku',
    country: 'アメリカ・ポルトガル', note: 'ジュラ紀{き}の おおきな にくしょく きょうりゅう。めの うえに ちいさな でっぱり。',
    type: 'thero', mod: { hs: 1.05, sn: 1.1, bt: .85, fl: 1.35 }, f: { browhorn: .6 }, col: ['#a07a4a', '#efdcb6', '#6e4a28'], pat: 'stripe', voice: .9 },
  { id: 'brachio', name: 'ブラキオサウルス', period: 'J', ma: 154, len: 21, lenTxt: 'やく 18〜22m', wt: 'やく 30〜50トン', diet: 'shoku',
    country: 'アメリカ', note: 'まえあしが うしろあしより ながい。くびを たかく あげて たかい きの はを たべた かも。',
    type: 'sauro', mod: { nk: 1.35, fl: 1.55, hl: 1.2, tl: .6, hs: 1.15 }, f: {}, col: ['#7d9a8a', '#e3e4d2', '#4f6b5e'], pat: 'band', voice: 1 },
  { id: 'diplo', name: 'ディプロドクス', period: 'J', ma: 153, len: 26, lenTxt: 'やく 25〜30m', wt: 'やく 12〜20トン', diet: 'shoku',
    country: 'アメリカ', note: 'とても ながい しっぽ。ムチの ように ふった かも しれない。',
    type: 'sauro', mod: { nk: 1.15, tl: 1.55, tly: .9, fl: .95, bt: .9 }, f: {}, col: ['#9a8f70', '#e8e2cc', '#6b5f45'], pat: 'band', voice: .95 },
  { id: 'apato', name: 'アパトサウルス', period: 'J', ma: 152, len: 22, lenTxt: 'やく 21〜23m', wt: 'やく 20〜30トン', diet: 'shoku',
    country: 'アメリカ', note: 'くびの ほねが ふとくて がっしり。むかしは「ブロントサウルス」と よばれた ことも。',
    type: 'sauro', mod: { nk: 1.0, tl: 1.35, bt: 1.15, nr: 1.25 }, f: {}, col: ['#8a7d6a', '#e5dccb', '#5d5242'], pat: 'band', voice: 1 },
  { id: 'mamen', name: 'マメンチサウルス', period: 'J', ma: 160, len: 22, lenTxt: 'やく 20〜26m', wt: 'やく 15〜25トン', diet: 'shoku',
    country: '中国{ちゅうごく}', note: 'くびが からだの ながさの はんぶん くらい ある、くびの ながい きょうりゅう。',
    type: 'sauro', mod: { nk: 1.85, tl: .85, hs: .9 }, f: {}, col: ['#8a9a6a', '#e6e4c8', '#5a6a3e'], pat: 'spot', voice: .95 },
  { id: 'dilo', name: 'ディロフォサウルス', period: 'J', ma: 193, len: 6.5, lenTxt: 'やく 6〜7m', wt: 'やく 300〜400kg', diet: 'niku',
    country: 'アメリカ', note: 'あたまに 2まいの うすい とさか。えいがの「えりまき」や「どく」は そうぞうで、かせきは ない。',
    type: 'thero', mod: { hs: .9, bt: .75, fl: 1.3, nk: 1.2 }, f: { crest: 'twin' }, col: ['#8a9a4a', '#ece4b8', '#c45a3a'], pat: 'stripe', voice: .7 },
  { id: 'kentro', name: 'ケントロサウルス', period: 'J', ma: 152, len: 4.5, lenTxt: 'やく 4〜5m', wt: 'やく 1〜1.6トン', diet: 'shoku',
    country: 'タンザニア', note: 'ステゴサウルスの なかま。せなかの うしろはんぶんから しっぽまで するどい とげ。',
    type: 'stego', mod: { bt: .9 }, f: { plates: 'kentro', spikes: 1, beak: 1 }, col: ['#b0894a', '#efe0bc', '#6e4a2a'], pat: 'stripe', voice: .5 },
  { id: 'archaeo', name: 'アーケオプテリクス', jp: '始祖鳥{しそちょう}', period: 'J', ma: 150, len: .5, lenTxt: 'やく 0.5m', wt: 'やく 0.5〜1kg', diet: 'niku', food: 'むし・ちいさな どうぶつ',
    country: 'ドイツ', note: 'はねの ある つばさと、はの ある くち・ほねの ある しっぽ。とりと きょうりゅうの とちゅうの すがた。',
    type: 'thero', mod: { hs: .6, sn: .8, bt: .55, nk: 1.25, fl: 2.4, hl: 1.1, tl: 1.15 }, f: { feathers: 1, wings: 1 }, col: ['#6f6a8a', '#ebe5d6', '#3f3a5a'], pat: 'none', voice: .05 },

  /* ===== 三畳紀 ===== */
  { id: 'eorap', name: 'エオラプトル', period: 'T', ma: 230, len: 1, lenTxt: 'やく 1m', wt: 'やく 10kg', diet: 'zatsu',
    country: 'アルゼンチン', note: 'はじめの ころの きょうりゅうの 1つ。なまえは「あけぼのの どろぼう」。',
    type: 'thero', mod: { hs: .75, sn: .85, bt: .65, fl: 1.4, nk: 1.2 }, f: {}, col: ['#c9a25a', '#f3e6c6', '#8a5e2a'], pat: 'stripe', voice: .15 },
  { id: 'herrera', name: 'ヘレラサウルス', period: 'T', ma: 230, len: 4.5, lenTxt: 'やく 3〜6m', wt: 'やく 200〜350kg', diet: 'niku',
    country: 'アルゼンチン', note: 'はじめの ころの にくしょく きょうりゅう。うしろあしで はやく はしった。',
    type: 'thero', mod: { hs: .9, bt: .75, fl: 1.3, tl: 1.1 }, f: {}, col: ['#8c6b4f', '#ecdcc4', '#5a3f2a'], pat: 'spot', voice: .6 },
  { id: 'coelo', name: 'コエロフィシス', period: 'T', ma: 210, len: 3, lenTxt: 'やく 3m', wt: 'やく 15〜25kg', diet: 'niku',
    country: 'アメリカ', note: 'ほそくて かるい からだ。おなじ ばしょから たくさんの かせきが みつかった。',
    type: 'thero', mod: { hs: .72, sn: 1.1, sr: .8, bt: .6, nk: 1.45, tl: 1.2, fl: 1.4, hl: 1.1 }, f: {}, col: ['#b9a04a', '#f1e8c4', '#6e5a24'], pat: 'stripe', voice: .2 },
  { id: 'plateo', name: 'プラテオサウルス', period: 'T', ma: 210, len: 7, lenTxt: 'やく 5〜10m', wt: 'やく 0.6〜4トン', diet: 'shoku',
    country: 'ドイツ・スイス など', note: 'くびの ながい きょうりゅうの ごせんぞに ちかい なかま。うしろあしで あるいた。',
    type: 'thero', mod: { hs: .55, sn: .85, bt: .95, nk: 1.8, fl: 2.1, tl: 1.1 }, f: {}, col: ['#9a8a5a', '#ece4c4', '#6a5a30'], pat: 'band', voice: .65 }
];

/* きょうりゅう では ない、おなじ じだいの いきもの（べつの たな） */
var OTHERS = [
  { id: 'ptera', name: 'プテラノドン', kind: '翼竜{よくりゅう}', period: 'K', ma: 85, len: 6.5, lenTxt: 'つばさを ひろげて やく 6〜7m', wt: 'やく 20〜35kg', diet: 'niku', food: 'さかな',
    country: 'アメリカ', note: 'そらを とぶ はちゅうるい。きょうりゅうに ちかいけど、きょうりゅう では ない。',
    type: 'ptero', mod: {}, f: { crest: 'ptero' }, col: ['#c9b08a', '#f3ead6', '#8a6a4a'], pat: 'none', voice: .3 },
  { id: 'quetzal', name: 'ケツァルコアトルス', kind: '翼竜{よくりゅう}', period: 'K', ma: 68, len: 10.5, lenTxt: 'つばさを ひろげて やく 10〜11m', wt: 'やく 200〜250kg', diet: 'niku', food: 'ちいさな どうぶつ',
    country: 'アメリカ', note: 'とても おおきな よくりゅう。じめんを あるいて えものを さがした かも。',
    type: 'ptero', mod: { hs: 1.2, nk: 1.8 }, f: { crest: 'round' }, col: ['#a8a8a0', '#efeee6', '#c25a3c'], pat: 'none', voice: .4 },
  { id: 'eudimo', name: 'エウディモルフォドン', kind: '翼竜{よくりゅう}', period: 'T', ma: 210, len: 1, lenTxt: 'つばさを ひろげて やく 1m', wt: 'わかって いない', diet: 'niku', food: 'さかな・むし',
    country: 'イタリア', note: 'さいしょの ころの よくりゅう。ながい しっぽが ある。',
    type: 'ptero', mod: { tl: 2.6, hs: .9 }, f: {}, col: ['#9a7a5a', '#efe2c6', '#5a4a3a'], pat: 'none', voice: .1 },
  { id: 'futaba', name: 'フタバスズキリュウ', kind: '首長竜{くびながりゅう}', period: 'K', ma: 85, len: 7, lenTxt: 'やく 7m（6〜9m）', wt: 'わかって いない', diet: 'niku', food: 'さかな・イカ など', japan: true,
    country: '日本{にほん}（福島県{ふくしまけん} いわき市{し}）', note: '1968ねん、こうこうせいが みつけた。うみに すむ はちゅうるいで、きょうりゅう では ない。',
    type: 'plesio', mod: {}, f: {}, col: ['#5f86a0', '#e3e8e6', '#3a5a70'], pat: 'spot', voice: .5 },
  { id: 'mosa', name: 'モササウルス', kind: '海{うみ}の トカゲの なかま', period: 'K', ma: 68, len: 14, lenTxt: 'やく 12〜17m', wt: 'わかって いない', diet: 'niku', food: 'さかな・アンモナイト など',
    country: 'オランダ・ベルギー など', note: 'トカゲや ヘビに ちかい なかまで、きょうりゅう では ない。うみの つよい かりゅうど。',
    type: 'mosa', mod: {}, f: { fin: 'fluke' }, col: ['#4f7a8a', '#e3e6dc', '#2f4f5e'], pat: 'band', voice: .8 },
  { id: 'ichthyo', name: 'イクチオサウルス', kind: '魚竜{ぎょりゅう}', period: 'J', ma: 195, len: 2.5, lenTxt: 'やく 2〜3m', wt: 'わかって いない', diet: 'niku', food: 'さかな・イカ など',
    country: 'イギリス など', note: 'イルカに にた すがたの はちゅうるい。あかちゃんを うんだ ことが かせきから わかる。',
    type: 'ichthyo', mod: {}, f: { fin: 'crescent', dorsal: 1 }, col: ['#5a7f9a', '#e6ebe8', '#33506a'], pat: 'none', voice: .3 }
];
OTHERS.forEach(function (o) { o.other = true; });

var ALL = DINOS.concat(OTHERS);
var BY_ID = {}; ALL.forEach(function (d) { BY_ID[d.id] = d; });

/* おおきさくらべの なかま（m） */
var COMPARE = [
  { id: 'train', name: '電車{でんしゃ} 1りょう', len: 20, h: 4 },
  { id: 'bus', name: 'バス', len: 11, h: 3.2 },
  { id: 'elephant', name: 'アフリカゾウ', len: 6.5, h: 3.3 },
  { id: 'adult', name: 'おとな', len: .5, h: 1.7 },
  { id: 'child', name: 'こども', len: .4, h: 1.2 }
];

/* ねんぴょうの できごと（ma = なん百万年まえ） */
var EVENTS = [
  { ma: 252, icon: '🌋', text: 'さんじょうきの はじまり' },
  { ma: 233, icon: '🦖', text: 'きょうりゅうが あらわれる' },
  { ma: 201, icon: '🌴', text: 'ジュラきの はじまり' },
  { ma: 150, icon: '🐦', text: 'とりの なかま（しそちょう）' },
  { ma: 145, icon: '🌿', text: 'はくあきの はじまり' },
  { ma: 125, icon: '🌸', text: 'はなが さく しょくぶつが ふえはじめる' },
  { ma: 66, icon: '☄️', text: 'いんせきが ぶつかる。とり いがいの きょうりゅうが いなくなる', big: true },
  { ma: 7, icon: '🐒', text: 'ひとの なかまが あらわれる（やく 700まんねんまえ）' },
  { ma: .3, icon: '🧒', text: 'いまの ひと（ホモ・サピエンス）やく 30まんねんまえ', big: true }
];
