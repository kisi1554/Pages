'use strict';

/*
 * おべんとう づくり — たべもの の データ
 *
 * グループ（3つの しょくひん グループ。小学校の 家庭科・食育の 教え方に あわせる。出典は README）
 *   r = あか   … おもに からだ を つくる もと（にく・さかな・たまご・まめ・ぎゅうにゅう・かいそう）
 *   y = きいろ … おもに げんき（エネルギー）の もと（ごはん・パン・めん・いも・さとう・あぶら）
 *   g = みどり … おもに からだ の ちょうし を ととのえる（やさい・くだもの・きのこ）
 *   g の かず は わりあい（ぜんぶで 1）。りょうりは おもな ざいりょうで ざっくり わける。
 *
 * やくわり（3・1・2弁当箱法 の 主食・主菜・副菜）
 *   staple = しゅしょく（主食）  main = しゅさい（主菜）  side = ふくさい（副菜）
 *   other  = そのほか（くだもの・乳製品 など。3:1:2 の けいさん には いれない）
 *
 * いろ（いろどり）: r=あか y=きいろ g=みどり w=しろ b=ちゃいろ k=くろ p=むらさき
 * アレルギー: ALLERGENS の キー。よく ある つくりかた の れい（じっさいは 商品の 表示で たしかめる）。
 * shape と p は render.js の え の かきかた。
 */

const GROUPS = {
  r: { name: 'あか', long: 'からだ を つくる', color: '#e03131', soft: '#ffe3e3',
       desc: 'ち や にく、ほね や は を つくる もと。にく・さかな・たまご・まめ・ぎゅうにゅう・かいそう など' },
  y: { name: 'きいろ', long: 'げんき の もと', color: '#f59f00', soft: '#fff3bf',
       desc: 'からだ を うごかす ちから や ねつ に なる もと。ごはん・パン・めん・いも・あぶら・さとう など' },
  g: { name: 'みどり', long: 'からだ の ちょうし を ととのえる', color: '#2f9e44', soft: '#d3f9d8',
       desc: 'かぜ を ひきにくく したり、おなか の ちょうし を ととのえたり する。やさい・くだもの・きのこ など' },
};

const ROLES = {
  staple: { name: 'しゅしょく', kanji: '主食', desc: 'ごはん・パン・めん' },
  main:   { name: 'しゅさい', kanji: '主菜', desc: 'にく・さかな・たまご・だいず の おかず' },
  side:   { name: 'ふくさい', kanji: '副菜', desc: 'やさい・いも・きのこ・かいそう の おかず' },
  other:  { name: 'そのほか', kanji: 'その他', desc: 'くだもの・チーズ など' },
};

const COLORS = {
  r: { name: 'あか', c: '#e8590c' }, y: { name: 'きいろ', c: '#fcc419' }, g: { name: 'みどり', c: '#40c057' },
  w: { name: 'しろ', c: '#ffffff' }, b: { name: 'ちゃいろ', c: '#a0522d' },
};
const IRODORI = ['r', 'y', 'g', 'w', 'b'];

// 消費者庁 食品表示基準。特定原材料（表示義務）9品目 ＝ 2026年4月から カシューナッツが くわわった。
// 特定原材料に準ずるもの（表示推奨）20品目。この アプリ では つかう ものだけ に マークを つける。
const ALLERGENS = {
  egg: { label: '卵', must: true }, milk: { label: '乳', must: true }, wheat: { label: '小麦', must: true },
  shrimp: { label: 'えび', must: true }, crab: { label: 'かに', must: true }, peanut: { label: '落花生', must: true },
  walnut: { label: 'くるみ', must: true }, cashew: { label: 'カシューナッツ', must: true }, soba: { label: 'そば', must: true },
  soy: { label: '大豆' }, sesame: { label: 'ごま' }, salmon: { label: 'さけ' }, mackerel: { label: 'さば' },
  beef: { label: '牛肉' }, pork: { label: '豚肉' }, chicken: { label: '鶏肉' }, apple: { label: 'りんご' },
  banana: { label: 'バナナ' }, kiwi: { label: 'キウイフルーツ' }, orange: { label: 'オレンジ' },
  peach: { label: 'もも' }, gelatin: { label: 'ゼラチン' },
};
const ALLERGEN_MUST_ALL = ['えび', 'カシューナッツ', 'かに', 'くるみ', '小麦', 'そば', '卵', '乳', '落花生'];
const ALLERGEN_REC_ALL = ['アーモンド', 'あわび', 'いか', 'いくら', 'オレンジ', 'キウイフルーツ', '牛肉', 'ごま', 'さけ',
  'さば', 'ゼラチン', '大豆', '鶏肉', 'バナナ', 'ピスタチオ', '豚肉', 'マカダミアナッツ', 'もも', 'やまいも', 'りんご'];

const FOODS = [];
function F(id, name, role, g, colors, al, shape, p, note, extra) {
  FOODS.push(Object.assign({ id, name, role, g, colors: colors.split(''), al, shape, p, note }, extra || {}));
}
const SOY = ['wheat', 'soy']; // しょうゆ（小麦・大豆）

// ---- しゅしょく（ごはん・パン・めん） ----
F('gohan', 'ごはん', 'staple', { y: 1 }, 'w', [], 'rice', {}, 'おこめ は きいろ。からだ を うごかす げんき の もと。');
F('ume', 'うめぼし ごはん', 'staple', { y: 1 }, 'wr', [], 'rice', { top: 'ume' }, 'まんなか に うめぼし。あかい いろ が きれい。');
F('shirasu', 'しらす ごはん', 'staple', { y: .85, r: .15 }, 'w', [], 'rice', { top: 'shirasu' }, 'しらす は ちいさな さかな。さかな は あか の なかま。');
F('maze', 'まぜごはん', 'staple', { y: .75, g: .25 }, 'wbr', SOY, 'rice', { top: 'maze' }, 'にんじん や ごぼう が まざって、みどり も すこし。');
F('sakegohan', 'さけ ごはん', 'staple', { y: .85, r: .15 }, 'wr', ['salmon'], 'rice', { top: 'sake' }, 'さけ を ほぐして まぜた ごはん。');
F('onigiri', 'のり の おにぎり', 'staple', { y: 1 }, 'wk', [], 'onigiri', {}, 'のり は かいそう。ほんの すこし だけど あか の なかま。');
F('onigiri-sake', 'さけ おにぎり', 'staple', { y: .85, r: .15 }, 'wkr', ['salmon'], 'onigiri', { dot: '#ff8a65' }, 'なか に さけ。ごはん（きいろ）と さかな（あか）。');
F('inari', 'おいなりさん', 'staple', { y: .8, r: .2 }, 'b', ['soy', 'wheat'], 'inari', {}, 'あぶらあげ は だいず から できて いる。だいず は あか。');
F('norimaki', 'のりまき', 'staple', { y: .85, g: .15 }, 'wkg', [], 'maki', { c: '#69db7c' }, 'なか に きゅうり。くるくる まいて きる と かわいい。');
F('sand-egg', 'たまご サンド', 'staple', { y: .6, r: .4 }, 'yw', ['wheat', 'egg', 'milk'], 'sand', { cs: ['#ffe066', '#fff9db'] }, 'パン（きいろ）に たまご（あか）を はさんだ。');
F('sand-ham', 'ハムレタス サンド', 'staple', { y: .6, r: .25, g: .15 }, 'wrg', ['wheat', 'milk', 'pork', 'egg'], 'sand', { cs: ['#8ce99a', '#ffa8a8'] }, 'ハム（あか）と レタス（みどり）も いっしょ に。');
F('roll', 'ロールパン', 'staple', { y: 1 }, 'b', ['wheat', 'milk', 'egg'], 'roll', {}, 'こむぎこ から できた パン は きいろ。');
F('napolitan', 'ナポリタン', 'staple', { y: .7, g: .2, r: .1 }, 'rg', ['wheat', 'pork'], 'noodle', { c: '#ff6b4a', bits: ['#51cf66', '#ff8787'] }, 'スパゲッティ は めん。めん は きいろ。');
F('yakisoba', 'やきそば', 'staple', { y: .65, g: .25, r: .1 }, 'bg', ['wheat', 'pork', 'soy'], 'noodle', { c: '#c08a4a', bits: ['#69db7c', '#ffa94d'] }, 'めん と キャベツ と おにく。3しょく が ちょっとずつ。');

// ---- しゅさい（にく・さかな・たまご・だいず） ----
F('karaage', 'からあげ', 'main', { r: .8, y: .2 }, 'b', ['chicken', 'wheat', 'soy'], 'fry', { c: '#c47a2c' }, 'とりにく は あか。あげる あぶら は きいろ の なかま。', { fry: 1 });
F('tamagoyaki', 'たまごやき', 'main', { r: 1 }, 'y', ['egg'], 'tamago', {}, 'たまご は あか。きいろい いろ で おべんとう が あかるく なる。');
F('yudetamago', 'ゆでたまご', 'main', { r: 1 }, 'wy', ['egg'], 'egghalf', {}, 'しろ と きいろ、2つ の いろ が はいる。');
F('medama', 'めだまやき', 'main', { r: .85, y: .15 }, 'wy', ['egg'], 'friedegg', {}, 'たまご を やいた もの。あぶら は きいろ。');
F('sake', 'やきざけ', 'main', { r: 1 }, 'r', ['salmon'], 'fish', { c: '#ff9e7a' }, 'さかな は あか。さけ は オレンジいろ で きれい。');
F('saba', 'さば の みそに', 'main', { r: .9, y: .1 }, 'b', ['mackerel', 'soy'], 'fish', { c: '#b8875a', skin: '#5c6b7a', sauce: 1 }, 'さば は あか。みそ も だいず から できて いる。');
F('buri', 'ぶり の てりやき', 'main', { r: .9, y: .1 }, 'b', SOY, 'fish', { c: '#a8693c', skin: '#6b4a3a', sauce: 1 }, 'ぶり は おおきく なる と なまえ が かわる さかな。');
F('ebifry', 'えびフライ', 'main', { r: .7, y: .3 }, 'br', ['shrimp', 'wheat', 'egg'], 'shrimp', {}, 'えび は あか。ころも（こむぎこ）と あぶら は きいろ。', { fry: 1 });
F('hamburg', 'ハンバーグ', 'main', { r: .9, y: .1 }, 'b', ['beef', 'pork', 'egg', 'milk', 'wheat', 'soy'], 'patty', { c: '#8a5232', sauce: '#5c2e1a' }, 'ひきにく を まるめて やいた。にく は あか。');
F('tofuhamburg', 'とうふ ハンバーグ', 'main', { r: 1 }, 'b', ['soy', 'chicken', 'egg', 'wheat'], 'patty', { c: '#c9955f', sauce: '#8a5a2b' }, 'とうふ も とりにく も あか。ふんわり やわらかい。');
F('meatball', 'ミートボール', 'main', { r: .85, y: .15 }, 'b', ['pork', 'chicken', 'wheat', 'soy'], 'ball', { c: '#7a4426', r: .8, sauce: 1, n: 3 }, 'あまからい たれ が からんだ にく だんご。');
F('wiener', 'たこさん ウインナー', 'main', { r: .8, y: .2 }, 'r', ['pork'], 'wiener', {}, 'ぶたにく から できた ソーセージ。あか の なかま。');
F('shogayaki', 'ぶた の しょうがやき', 'main', { r: .9, y: .1 }, 'b', ['pork', 'wheat', 'soy'], 'strips', { cs: ['#a0663a', '#8a5532', '#c08a5a'], w: 16 }, 'ぶたにく は あか。しょうが の いい におい。');
F('yakiniku', 'ぎゅうにく の やきにく', 'main', { r: .9, y: .1 }, 'b', ['beef', 'wheat', 'soy', 'sesame'], 'strips', { cs: ['#7a3f2a', '#8f4d33', '#6b3523'], w: 18, sesame: 1 }, 'ぎゅうにく は あか。ごま を ぱらり。');
F('teriyaki', 'とり の てりやき', 'main', { r: .9, y: .1 }, 'b', ['chicken', 'wheat', 'soy'], 'cube', { c: '#b0703a', top: '#d08f4f', glaze: 1 }, 'とりにく は あか。つやつや の たれ。');
F('nugget', 'チキン ナゲット', 'main', { r: .7, y: .3 }, 'b', ['chicken', 'wheat', 'soy'], 'fry', { c: '#d9a55a', flat: 1 }, 'とりにく は あか。ころも と あぶら は きいろ。', { fry: 1 });
F('shumai', 'しゅうまい', 'main', { r: .7, y: .3 }, 'w', ['pork', 'wheat'], 'dumpling', { kind: 'shumai' }, 'なか は ぶたにく（あか）、かわ は こむぎこ（きいろ）。');
F('gyoza', 'ぎょうざ', 'main', { r: .5, y: .3, g: .2 }, 'wb', ['pork', 'wheat', 'soy', 'sesame'], 'dumpling', { kind: 'gyoza' }, 'にく と やさい を かわ で つつんだ。3しょく が はいって いる。');
F('ham', 'くるくる ハム', 'main', { r: 1 }, 'r', ['pork'], 'ham', {}, 'ハム は ぶたにく から できて いる。あか。');
F('kamaboko', 'かまぼこ', 'main', { r: 1 }, 'rw', ['egg'], 'kamaboko', {}, 'さかな の すりみ から できて いる。だから あか。');
F('isobe', 'ちくわ の いそべあげ', 'main', { r: .7, y: .3 }, 'gb', ['wheat', 'egg'], 'tube', { c: '#e0b070', isobe: 1 }, 'ちくわ は さかな から できた あか。あおのり が みどり いろ。', { fry: 1 });
F('chikuwakyuri', 'ちくわ きゅうり', 'main', { r: .6, g: .4 }, 'wg', ['egg'], 'tube', { c: '#e8c48a', hole: '#69db7c' }, 'ちくわ（あか）の あな に きゅうり（みどり）。');
F('atsuage', 'あつあげ の にもの', 'main', { r: 1 }, 'b', ['soy', 'wheat'], 'cube', { c: '#c98a3c', top: '#f3e4c4' }, 'あつあげ は とうふ を あげた もの。だいず だから あか。');
F('koya', 'こうやどうふ の にもの', 'main', { r: 1 }, 'w', ['soy', 'wheat'], 'cube', { c: '#e9d8a6', top: '#f5ead0' }, 'とうふ を こおらせて ほした もの。だいず は あか。');
F('nimame', 'だいず の にまめ', 'main', { r: .8, y: .2 }, 'b', ['soy'], 'beans', { c: '#c08a3e', n: 9 }, 'だいず は「はたけ の おにく」と いわれる あか の なかま。');

// ---- ふくさい（やさい・いも・きのこ・かいそう） ----
F('broccoli', 'ブロッコリー', 'side', { g: 1 }, 'g', [], 'broccoli', {}, 'こい みどり の やさい。みどり の グループ。');
F('minitomato', 'ミニトマト', 'side', { g: 1 }, 'r', [], 'ball', { c: '#f03e3e', stem: 1, r: .85 }, 'あかい けど やさい だから みどり の グループ。', { round: 1 });
F('glace', 'にんじん の グラッセ', 'side', { g: .85, y: .15 }, 'r', ['milk'], 'flower', { c: '#ff922b' }, 'にんじん は いろ は あか（オレンジ）でも、やさい なので みどり。');
F('gomaae', 'ほうれんそう の ごまあえ', 'side', { g: .9, y: .1 }, 'g', ['sesame', 'soy', 'wheat'], 'leaves', { c: '#2b8a3e', sesame: 1 }, 'ほうれんそう は みどり。ごま は あぶら が おおい ので きいろ。');
F('ohitashi', 'こまつな の おひたし', 'side', { g: 1 }, 'g', SOY, 'leaves', { c: '#37b24d' }, 'こまつな は みどり。カルシウム も たっぷり。');
F('ingen', 'いんげん の ごまあえ', 'side', { g: .9, y: .1 }, 'g', ['sesame', 'soy', 'wheat'], 'sticks', { c: '#40c057', sesame: 1, n: 5 }, 'いんげん は まめ の なかま だけど、さや ごと たべる やさい。みどり。');
F('kinpira', 'きんぴら ごぼう', 'side', { g: .85, y: .15 }, 'br', ['sesame', 'soy', 'wheat'], 'strips', { cs: ['#8b5a2b', '#a0703a', '#ff922b'], w: 7, sesame: 1 }, 'ごぼう と にんじん は みどり。しゃきしゃき。');
F('kabocha', 'かぼちゃ の にもの', 'side', { g: 1 }, 'yg', SOY, 'wedge', { kind: 'kabocha' }, 'あまい けど やさい。こい いろ の やさい で みどり の グループ。');
F('potesara', 'ポテトサラダ', 'side', { y: .75, g: .25 }, 'wy', ['egg'], 'salad', { c: '#fff3bf', bits: ['#ff922b', '#69db7c', '#ffffff'] }, 'じゃがいも は きいろ（いも は げんき の もと）。でも おかず では ふくさい の なかま。');
F('lemonni', 'さつまいも の レモンに', 'side', { y: .95, g: .05 }, 'yp', [], 'slice', { kind: 'imo' }, 'さつまいも は いも だから きいろ。むらさき の かわ が きれい。');
F('fries', 'フライドポテト', 'side', { y: 1 }, 'y', [], 'sticks', { c: '#ffd43b', n: 6, edge: '#f08c00' }, 'じゃがいも も あぶら も きいろ。', { fry: 1 });
F('daigakuimo', 'だいがくいも', 'side', { y: 1 }, 'yb', ['sesame'], 'wedge', { kind: 'daigaku' }, 'さつまいも と さとう と あぶら。ぜんぶ きいろ の なかま。', { fry: 1 });
F('kyuri', 'きゅうり の しおもみ', 'side', { g: 1 }, 'g', [], 'slice', { kind: 'kyuri' }, 'きゅうり は みどり。ぽりぽり の はごたえ。');
F('corn', 'コーン', 'side', { g: 1 }, 'y', [], 'corn', {}, 'とうもろこし は ここ では やさい として みどり。（こくもつ として きいろ に する ほん も ある）');
F('edamame', 'えだまめ', 'side', { g: 1 }, 'g', ['soy'], 'pod', {}, 'えだまめ は わかい だいず。やさい として みどり に する ことが おおい。（あか に する ほん も ある）');
F('asparagus', 'アスパラ の ベーコン まき', 'side', { g: .5, r: .5 }, 'gr', ['pork'], 'sticks', { c: '#69a84f', n: 3, wrap: '#f4a6a6' }, 'アスパラ は みどり、ベーコン は あか。');
F('hijiki', 'ひじき の にもの', 'side', { r: .65, g: .35 }, 'kr', ['soy', 'wheat'], 'seaweed', { kind: 'hijiki' }, 'ひじき は かいそう。小学校 の 家庭科 では、ほね を つくる あか の なかま。');
F('wakame', 'わかめ の すのもの', 'side', { r: .4, g: .6 }, 'g', [], 'seaweed', { kind: 'wakame' }, 'わかめ（かいそう）は あか、きゅうり は みどり。');
F('renkon', 'れんこん の あまずづけ', 'side', { g: 1 }, 'w', [], 'slice', { kind: 'renkon' }, 'あな から さき が みえる？ と いう えんぎ の よい やさい。');
F('piman', 'ピーマン と じゃこ', 'side', { g: .75, r: .25 }, 'g', SOY, 'strips', { cs: ['#2f9e44', '#40c057', '#f1f3f5'], w: 9 }, 'ピーマン は みどり、ちりめんじゃこ（さかな）は あか。');
F('kinoko', 'きのこ の ソテー', 'side', { g: .85, y: .15 }, 'b', ['milk'], 'mushroom', { c: '#c89a62', n: 3 }, 'きのこ は みどり の なかま。おなか の ちょうし を ととのえる。');
F('shiitake', 'しいたけ の にもの', 'side', { g: 1 }, 'b', SOY, 'mushroom', { c: '#7a4e2d', big: 1 }, 'しいたけ は きのこ。みどり の グループ。');
F('lettuce', 'レタス', 'side', { g: 1 }, 'g', [], 'leaves', { c: '#8ce99a', wave: 1 }, 'みどり の やさい。おかず の しきり に も なる。');
F('coleslaw', 'コールスロー', 'side', { g: .85, y: .15 }, 'wg', ['egg'], 'salad', { c: '#f1f8e9', bits: ['#8ce99a', '#ff922b', '#d8f5a2'] }, 'キャベツ と にんじん。マヨネーズ の あぶら は きいろ。');
F('namul', 'もやし の ナムル', 'side', { g: .9, y: .1 }, 'w', ['sesame'], 'strips', { cs: ['#fff9db', '#f8f0d0', '#69db7c'], w: 5 }, 'もやし は みどり の なかま。ごま あぶら で こうばしい。');
F('kiriboshi', 'きりぼし だいこん', 'side', { g: .9, r: .1 }, 'wb', SOY, 'strips', { cs: ['#d9b77a', '#e8cf9a', '#ff922b'], w: 5 }, 'だいこん を ほした もの。みどり の なかま。');
F('okra', 'オクラ', 'side', { g: 1 }, 'g', [], 'slice', { kind: 'okra' }, 'きる と ほし の かたち！ みどり の やさい。');
F('paprika', 'パプリカ の マリネ', 'side', { g: 1 }, 'ry', [], 'strips', { cs: ['#f03e3e', '#fcc419', '#ff6b6b'], w: 12 }, 'あか や きいろ の いろ だけど、やさい だから みどり の グループ。');
F('nasu', 'なす の みそいため', 'side', { g: .85, y: .15 }, 'p', ['soy'], 'slice', { kind: 'nasu' }, 'なす は むらさき の やさい。みどり の グループ。');
F('shirishiri', 'にんじん しりしり', 'side', { g: .7, r: .3 }, 'ry', ['egg', 'soy', 'wheat'], 'strips', { cs: ['#ff922b', '#ffa94d', '#ffe066'], w: 6 }, 'おきなわ の りょうり。にんじん（みどり）と たまご（あか）。');
F('tamagotoji', 'ほうれんそう の たまごとじ', 'side', { g: .6, r: .4 }, 'gy', ['egg', 'soy', 'wheat'], 'leaves', { c: '#2f9e44', egg: 1 }, 'やさい（みどり）と たまご（あか）が いっしょ。');
F('gobosalad', 'ごぼう サラダ', 'side', { g: .8, y: .2 }, 'bw', ['egg', 'sesame'], 'salad', { c: '#e9dcc0', bits: ['#8b5a2b', '#ff922b', '#8b5a2b'] }, 'ごぼう は みどり。せんい が たっぷり。');
F('ninjinstick', 'にんじん スティック', 'side', { g: 1 }, 'r', [], 'sticks', { c: '#ff922b', n: 4 }, 'にんじん は みどり の グループ。いろ は オレンジ。');

// ---- くだもの・そのほか ----
F('ichigo', 'いちご', 'other', { g: 1 }, 'rg', [], 'berry', {}, 'くだもの は みどり の グループ。');
F('usagiringo', 'うさぎ りんご', 'other', { g: 1 }, 'rw', ['apple'], 'wedge', { kind: 'apple' }, 'かわ を うさぎ の みみ に した りんご。くだもの は みどり。');
F('orange', 'オレンジ', 'other', { g: 1 }, 'y', ['orange'], 'wedge', { kind: 'orange' }, 'くだもの は みどり の グループ。');
F('mikan', 'みかん', 'other', { g: 1 }, 'y', [], 'mikan', {}, 'ふゆ の くだもの。みどり の グループ。');
F('banana', 'バナナ', 'other', { g: 1 }, 'y', ['banana'], 'banana', {}, 'あまい くだもの。くだもの は みどり。');
F('budou', 'ぶどう', 'other', { g: 1 }, 'p', [], 'ball', { c: '#7048e8', r: .62, n: 4, shine: 1 }, 'くだもの は みどり の グループ。', { round: 1 });
F('kiwi', 'キウイ', 'other', { g: 1 }, 'g', ['kiwi'], 'slice', { kind: 'kiwi' }, 'みどり の くだもの。たね が つぶつぶ。');
F('momo', 'もも（かんづめ）', 'other', { g: .7, y: .3 }, 'y', ['peach'], 'wedge', { kind: 'peach' }, 'くだもの は みどり。シロップ の さとう は きいろ。');
F('pine', 'パイナップル', 'other', { g: 1 }, 'y', [], 'pine', {}, 'くだもの は みどり の グループ。');
F('melon', 'メロン', 'other', { g: 1 }, 'g', [], 'wedge', { kind: 'melon' }, 'くだもの は みどり の グループ。');
F('sakuranbo', 'さくらんぼ', 'other', { g: 1 }, 'r', [], 'ball', { c: '#c2255c', r: .55, n: 2, cherry: 1 }, 'ふたご の さくらんぼ。くだもの は みどり。', { round: 1 });
F('blueberry', 'ブルーベリー', 'other', { g: 1 }, 'p', [], 'ball', { c: '#3b5bdb', r: .38, n: 7 }, 'ちいさな あおい くだもの。みどり の グループ。');
F('cheese', 'チーズ', 'other', { r: 1 }, 'y', ['milk'], 'cube', { c: '#ffd43b', top: '#ffe066', holes: 1 }, 'ぎゅうにゅう から できた チーズ は あか。ほね を つよく する。', { tab: 'okazu' });
F('yogurt', 'ヨーグルト', 'other', { r: 1 }, 'w', ['milk'], 'cup', { c: '#ffffff' }, 'ぎゅうにゅう から できて いる ので あか。', { tab: 'okazu' });
F('jelly', 'みかん ゼリー', 'other', { g: .3, y: .7 }, 'y', ['gelatin'], 'cup', { c: '#ffc078', jelly: 1 }, 'みかん（みどり）と さとう（きいろ）。');
F('daifuku', 'ちいさな だいふく', 'other', { y: .8, r: .2 }, 'w', [], 'daifuku', {}, 'もち（きいろ）と あずき の あん。あずき は まめ だから あか。');

// ---- かざり（たべものの グループには かぞえない） ----
const DECOS = [
  { id: 'nori-train', name: 'でんしゃ の のり', kind: 'nori', shape: 'train' },
  { id: 'nori-star', name: 'ほし の のり', kind: 'nori', shape: 'star' },
  { id: 'nori-heart', name: 'ハート の のり', kind: 'nori', shape: 'heart' },
  { id: 'nori-face', name: 'にこにこ の のり', kind: 'nori', shape: 'face' },
  { id: 'pick-flag', name: 'はた の ピック', kind: 'pick', shape: 'flag' },
  { id: 'pick-heart', name: 'ハート の ピック', kind: 'pick', shape: 'heart' },
  { id: 'pick-star', name: 'ほし の ピック', kind: 'pick', shape: 'star' },
  { id: 'pick-train', name: 'でんしゃ の ピック', kind: 'pick', shape: 'train' },
];

const FOOD = {};
FOODS.forEach((f) => {
  f.tab = f.tab || { staple: 'gohan', main: 'okazu', side: 'yasai', other: 'fruit' }[f.role];
  FOOD[f.id] = f;
});
const DECO = {};
DECOS.forEach((d) => { DECO[d.id] = d; });

// いちばん おおい グループ
function mainGroup(f) {
  return Object.keys(f.g).sort((a, b) => f.g[b] - f.g[a])[0];
}
