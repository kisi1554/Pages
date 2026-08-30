"use strict";

/* かんじタマゴ - データ（tools/gen-kanji-tamago.py で作っている。直さないで）
 *
 *  GROUPS       … ずかんの なかま分け
 *  ALL_MONSTERS … 81ひき。小学1年の漢字80字ぜんぶ ＋ 馬（小2）
 *    grade 学年 / kaku 画数 / on 音よみ / kun 訓よみ / rare 出にくさ(1-3)
 *    hand  1体ずつ手描きした子は true（部品組み合わせの子は false）。
 *          app.js が MONSTERS = ALL_MONSTERS.filter(hand) で しぼりこみ、
 *          いまは 手描きの子だけを ガチャ・ずかん・クイズで つかう。
 *          描きなおしが 済むたびに 自動で ふえていく
 *    words つかいかた / stations その漢字が つかわれている駅 / quiz よみクイズ（あれば）
 *  ART          … 絵のレシピ（monsters.js の 部品を くみあわせる）
 *  KANJI_PATH   … 体にプリントする字形（IPAゴシックのアウトライン / IPA Font License 1.0）
 */

const GROUPS = [
  { id: 'kazu', name: 'かず の なかま' },
  { id: 'sora', name: 'そら と てんき' },
  { id: 'sizen', name: 'しぜん の なかま' },
  { id: 'ikimono', name: 'いきもの の なかま' },
  { id: 'karada', name: 'からだ の なかま' },
  { id: 'hito', name: 'ひと の なかま' },
  { id: 'machi', name: 'まち と がっこう' },
  { id: 'muki', name: 'むき と おおきさ' },
  { id: 'yosu', name: 'ようす の なかま' },
  { id: 'iro', name: 'いろ の なかま' }
];

const ALL_MONSTERS = [
  {
    id: 'ichi', name: 'イチマル', kanji: '一', grade: 1, kaku: 1, group: 'kazu', rare: 1,
    on: 'イチ', kun: 'ひと(つ)', color: '#d59a1e', tint: '#fdf1cf', hand: true,
    about: 'いちばん さいしょに 生まれた、はじまりの モンスター。まっすぐな せなかが じまん。',
    words: [{ w: '一つ', y: 'ひとつ' }, { w: '一年生', y: 'いちねんせい' }, { w: '一日', y: 'ついたち' }],
    stations: [['青山一丁目', 'あおやまいっちょうめ', '銀座線'], ['銀座一丁目', 'ぎんざいっちょうめ', '有楽町線'], ['六本木一丁目', 'ろっぽんぎいっちょうめ', '南北線'], ['一ノ関', 'いちのせき', '東北新幹線']],
    quiz: []
  },
  {
    id: 'ni', name: 'ニコリ', kanji: '二', grade: 1, kaku: 2, group: 'kazu', rare: 1,
    on: 'ニ', kun: 'ふた(つ)', color: '#3f9fd8', tint: '#e2f2fc', hand: false,
    about: 'いつも にこにこ している モンスター。ならぶと もっと うれしそう。',
    words: [{ w: '二つ', y: 'ふたつ' }, { w: '二人', y: 'ふたり' }, { w: '二日', y: 'ふつか' }],
    stations: [['二子玉川', 'ふたこたまがわ', '田園都市線'], ['二子新地', 'ふたこしんち', '田園都市線'], ['二俣川', 'ふたまたがわ', '相鉄本線'], ['二重橋前', 'にじゅうばしまえ', '千代田線'], ['二宮', 'にのみや', '東海道線'], ['二俣新町', 'ふたまたしんまち', '京葉線']]
  },
  {
    id: 'san', name: 'サンタロ', kanji: '三', grade: 1, kaku: 3, group: 'kazu', rare: 1,
    on: 'サン', kun: 'み(っつ)', color: '#e07316', tint: '#fdead6', hand: false,
    about: 'だんだんに かさなった からだ。上から じゅんばんに かぞえるのが すき。',
    words: [{ w: '三つ', y: 'みっつ' }, { w: '三日', y: 'みっか' }, { w: '三月', y: 'さんがつ' }],
    stations: [['三軒茶屋', 'さんげんぢゃや', '田園都市線'], ['三ツ沢上町', 'みつざわかみちょう', 'ブルーライン'], ['三ツ沢下町', 'みつざわしもちょう', 'ブルーライン'], ['三ツ境', 'みつきょう', '相鉄本線'], ['三越前', 'みつこしまえ', '銀座線'], ['本郷三丁目', 'ほんごうさんちょうめ', '丸ノ内線']]
  },
  {
    id: 'yon', name: 'ヨンスケ', kanji: '四', grade: 1, kaku: 5, group: 'kazu', rare: 2,
    on: 'シ', kun: 'よん・よ(っつ)', color: '#8a53c0', tint: '#efe4fa', hand: false,
    about: 'しかくい からだの モンスター。かどが 四つ あるのを じまんに している。',
    words: [{ w: '四つ', y: 'よっつ' }, { w: '四日', y: 'よっか' }, { w: '四月', y: 'しがつ' }],
    stations: [['四ツ谷', 'よつや', '丸ノ内線'], ['四谷三丁目', 'よつやさんちょうめ', '丸ノ内線']]
  },
  {
    id: 'go', name: 'ゴマル', kanji: '五', grade: 1, kaku: 4, group: 'kazu', rare: 1,
    on: 'ゴ', kun: 'いつ(つ)', color: '#1f9d86', tint: '#dcf4ee', hand: false,
    about: '手の ゆびと おなじ かず。ハイタッチが 大すき。',
    words: [{ w: '五つ', y: 'いつつ' }, { w: '五日', y: 'いつか' }, { w: '五月', y: 'ごがつ' }],
    stations: [['五反田', 'ごたんだ', '山手線'], ['五月台', 'さつきだい', '多摩線']]
  },
  {
    id: 'roku', name: 'ロクロー', kanji: '六', grade: 1, kaku: 4, group: 'kazu', rare: 1,
    on: 'ロク', kun: 'む(っつ)', color: '#8a53c0', tint: '#efe4fa', hand: false,
    about: 'つのが ある なかま。六まで かぞえると まんぞく する。',
    words: [{ w: '六つ', y: 'むっつ' }, { w: '六日', y: 'むいか' }, { w: '六月', y: 'ろくがつ' }],
    stations: [['六会日大前', 'むつあいにちだいまえ', '江ノ島線'], ['六本木', 'ろっぽんぎ', '日比谷線'], ['六本木一丁目', 'ろっぽんぎいっちょうめ', '南北線'], ['六郷土手', 'ろくごうどて', '京急本線'], ['六町', 'ろくちょう', 'つくばエクスプレス']]
  },
  {
    id: 'nana', name: 'ナナホシ', kanji: '七', grade: 1, kaku: 2, group: 'kazu', rare: 1,
    on: 'シチ', kun: 'なな・なの', color: '#d64b2c', tint: '#fde6e0', hand: false,
    about: 'せなかに 七つの ほしが ある てんとうむしの モンスター。',
    words: [{ w: '七つ', y: 'ななつ' }, { w: '七日', y: 'なのか' }, { w: '七五三', y: 'しちごさん' }],
    stations: [['七戸十和田', 'しちのへとわだ', '東北新幹線']]
  },
  {
    id: 'hachi', name: 'ハチベエ', kanji: '八', grade: 1, kaku: 2, group: 'kazu', rare: 1,
    on: 'ハチ', kun: 'や(っつ)', color: '#c9ad14', tint: '#fdf8d5', hand: false,
    about: 'はねを ぶんぶん させる はちの モンスター。花の みつが だいこうぶつ。',
    words: [{ w: '八つ', y: 'やっつ' }, { w: '八日', y: 'ようか' }, { w: '八百屋', y: 'やおや' }],
    stations: [['代々木八幡', 'よよぎはちまん', '小田原線'], ['八丁堀', 'はっちょうぼり', '日比谷線'], ['本八幡', 'もとやわた', '中央・総武線'], ['八王子みなみ野', 'はちおうじみなみの', '横浜線'], ['八王子', 'はちおうじ', '横浜線'], ['八戸', 'はちのへ', '東北新幹線']]
  },
  {
    id: 'kyuu', name: 'キュウタ', kanji: '九', grade: 1, kaku: 2, group: 'kazu', rare: 1,
    on: 'キュウ・ク', kun: 'ここの(つ)', color: '#3f649b', tint: '#e0e9f6', hand: false,
    about: 'あと ひとつで 十に なるのが うれしくて、いつも そわそわ している。',
    words: [{ w: '九つ', y: 'ここのつ' }, { w: '九日', y: 'ここのか' }, { w: '九月', y: 'くがつ' }],
    stations: [['九品仏', 'くほんぶつ', '大井町線'], ['九段下', 'くだんした', '東西線']]
  },
  {
    id: 'juu', name: 'トオマル', kanji: '十', grade: 1, kaku: 2, group: 'kazu', rare: 1,
    on: 'ジュウ', kun: 'とお', color: '#3f9c46', tint: '#e4f5dd', hand: false,
    about: 'からだが きれいな 十じ。まん中で ぴったり つりあっている。',
    words: [{ w: '十', y: 'とお' }, { w: '十日', y: 'とおか' }, { w: '十円', y: 'じゅうえん' }],
    stations: [['東十条', 'ひがしじゅうじょう', '京浜東北・根岸線'], ['麻布十番', 'あざぶじゅうばん', '南北線'], ['十日市場', 'とおかいちば', '横浜線'], ['七戸十和田', 'しちのへとわだ', '東北新幹線']]
  },
  {
    id: 'hyaku', name: 'ヒャッキー', kanji: '百', grade: 1, kaku: 6, group: 'kazu', rare: 2,
    on: 'ヒャク', kun: 'もも', color: '#c99310', tint: '#fdf1cf', hand: false,
    about: '数を 百まで かぞえられる ものしり。かぞえおわると ねむくなる。',
    words: [{ w: '百', y: 'ひゃく' }, { w: '百円', y: 'ひゃくえん' }, { w: '百人', y: 'ひゃくにん' }],
    stations: [['百合ヶ丘', 'ゆりがおか', '小田原線'], ['新百合ヶ丘', 'しんゆりがおか', '小田原線'], ['百草園', 'もぐさえん', '京王線']]
  },
  {
    id: 'sen', name: 'センマル', kanji: '千', grade: 1, kaku: 3, group: 'kazu', rare: 1,
    on: 'セン', kun: 'ち', color: '#3f9fd8', tint: '#e2f2fc', hand: false,
    about: '百の 十ばい。あんまり 大きな かずで、じぶんでも びっくりしている。',
    words: [{ w: '千', y: 'せん' }, { w: '千円', y: 'せんえん' }, { w: '千日', y: 'せんにち' }],
    stations: [['北千束', 'きたせんぞく', '大井町線'], ['千鳥町', 'ちどりちょう', '池上線'], ['千歳船橋', 'ちとせふなばし', '小田原線'], ['南千住', 'みなみせんじゅ', '日比谷線'], ['北千住', 'きたせんじゅ', '日比谷線'], ['千駄木', 'せんだぎ', '千代田線']]
  },
  {
    id: 'hi', name: 'ヒナタ', kanji: '日', grade: 1, kaku: 4, group: 'sora', rare: 1,
    on: 'ニチ・ジツ', kun: 'ひ・か', color: '#e2562c', tint: '#fde5db', hand: true,
    about: 'あさに なると ぴかっと 光る おひさま。ねぼうすけには ちょっと きびしい。',
    words: [{ w: '日', y: 'ひ' }, { w: '日よう日', y: 'にちようび' }, { w: '三日', y: 'みっか' }],
    stations: [['日暮里', 'にっぽり', '山手線'], ['西日暮里', 'にしにっぽり', '山手線'], ['日吉', 'ひよし', '東横線'], ['日吉本町', 'ひよしほんちょう', 'グリーンライン'], ['六会日大前', 'むつあいにちだいまえ', '江ノ島線'], ['日本橋', 'にほんばし', '銀座線']],
    quiz: []
  },
  {
    id: 'tsuki', name: 'ツキミ', kanji: '月', grade: 1, kaku: 4, group: 'sora', rare: 1,
    on: 'ゲツ・ガツ', kun: 'つき', color: '#c9a41c', tint: '#fdf6d8', hand: true,
    about: 'よるに なると 出てくる。まんまるの ときが いちばん ごきげん。',
    words: [{ w: '月', y: 'つき' }, { w: '月よう日', y: 'げつようび' }, { w: '一月', y: 'いちがつ' }],
    stations: [['五月台', 'さつきだい', '多摩線'], ['月島', 'つきしま', '有楽町線'], ['黒部宇奈月温泉', 'くろべうなづきおんせん', '北陸新幹線'], ['花月総持寺', 'かげつそうじじ', '京急本線']],
    quiz: []
  },
  {
    id: 'ten', name: 'テンタロ', kanji: '天', grade: 1, kaku: 4, group: 'sora', rare: 1,
    on: 'テン', kun: 'あま', color: '#3f9fd8', tint: '#e2f2fc', hand: false,
    about: 'そらの いちばん 高い ところに すんでいる。下を のぞくのが すき。',
    words: [{ w: '天気', y: 'てんき' }, { w: '天の川', y: 'あまのがわ' }, { w: '雨天', y: 'うてん' }],
    stations: [['祐天寺', 'ゆうてんじ', '東横線'], ['天王町', 'てんのうちょう', '相鉄本線'], ['水天宮前', 'すいてんぐうまえ', '半蔵門線'], ['天王台', 'てんのうだい', '常磐線'], ['天王洲アイル', 'てんのうずアイル', 'りんかい線']]
  },
  {
    id: 'sora', name: 'ソラリン', kanji: '空', grade: 1, kaku: 8, group: 'sora', rare: 3,
    on: 'クウ', kun: 'そら・あ(く)', color: '#8d99a6', tint: '#f4f7fa', hand: false,
    about: 'からだの 中が すきとおっている。ふわふわ うかんで いどうする。',
    words: [{ w: '空', y: 'そら' }, { w: '青空', y: 'あおぞら' }, { w: '空気', y: 'くうき' }],
    stations: [['空港第2ビル', 'くうこうだいにびる', '京成本線'], ['新千歳空港', 'しんちとせくうこう', 'JR千歳線']]
  },
  {
    id: 'ame', name: 'アメンボ', kanji: '雨', grade: 1, kaku: 8, group: 'sora', rare: 3,
    on: 'ウ', kun: 'あめ・あま', color: '#3f9fd8', tint: '#e2f2fc', hand: false,
    about: 'あたまの くもから ぽつぽつ 雨を ふらせる。かさを かすのが しゅみ。',
    words: [{ w: '雨', y: 'あめ' }, { w: '大雨', y: 'おおあめ' }, { w: '雨やどり', y: 'あまやどり' }],
    stations: [['雨晴', 'あまはらし', 'JR氷見線']]
  },
  {
    id: 'kimochi', name: 'ゲンキチ', kanji: '気', grade: 1, kaku: 6, group: 'sora', rare: 2,
    on: 'キ・ケ', kun: '―', color: '#1f9d86', tint: '#dcf4ee', hand: false,
    about: 'いつも 元気いっぱい。そばに いると みんなも 元気に なる。',
    words: [{ w: '気もち', y: 'きもち' }, { w: '天気', y: 'てんき' }, { w: '元気', y: 'げんき' }],
    stations: [['気仙沼', 'けせんぬま', 'JR大船渡線']]
  },
  {
    id: 'yuu', name: 'ユウマル', kanji: '夕', grade: 1, kaku: 3, group: 'sora', rare: 1,
    on: 'セキ', kun: 'ゆう', color: '#e07316', tint: '#fdead6', hand: false,
    about: 'そらが オレンジに なる じかんに あらわれる。ちょっぴり さみしがりや。',
    words: [{ w: '夕がた', y: 'ゆうがた' }, { w: '夕日', y: 'ゆうひ' }, { w: '夕やけ', y: 'ゆうやけ' }],
    stations: [['四天王寺前夕陽ケ丘', 'してんのうじまえゆうひがおか', '大阪メトロ谷町線']]
  },
  {
    id: 'toshi', name: 'トシマル', kanji: '年', grade: 1, kaku: 6, group: 'sora', rare: 2,
    on: 'ネン', kun: 'とし', color: '#ef6f96', tint: '#fde4ec', hand: false,
    about: '一年に 一かい、としを ひとつ とる。たん生日が だいすき。',
    words: [{ w: '一年', y: 'いちねん' }, { w: '年上', y: 'としうえ' }, { w: 'お年玉', y: 'おとしだま' }],
    stations: []
  },
  {
    id: 'yama', name: 'ヤマゴン', kanji: '山', grade: 1, kaku: 3, group: 'sizen', rare: 1,
    on: 'サン', kun: 'やま', color: '#a9703f', tint: '#f4e6d5', hand: true,
    about: 'いわで できた からだの モンスター。あたまの ゆきが じまん。あるくと ゴロゴロ 音が する。',
    words: [{ w: '山', y: 'やま' }, { w: '火山', y: 'かざん' }, { w: '山みち', y: 'やまみち' }, { w: '高い山', y: 'たかいやま' }],
    stations: [['山手', 'やまて', '京浜東北・根岸線'], ['代官山', 'だいかんやま', '東横線'], ['大倉山', 'おおくらやま', '東横線'], ['武蔵小山', 'むさしこやま', '目黒線'], ['西小山', 'にしこやま', '目黒線'], ['大岡山', 'おおおかやま', '目黒線']],
    quiz: [['「代官山」は なんと よむ？', ['だいかんやま', 'だいかんさん', 'よかんやま'], 0], ['「火山」は なんと よむ？', ['かやま', 'かざん', 'ひやま'], 1]]
  },
  {
    id: 'kawa', name: 'カワッピ', kanji: '川', grade: 1, kaku: 3, group: 'sizen', rare: 1,
    on: 'セン', kun: 'かわ', color: '#31a3dd', tint: '#dcf1fb', hand: true,
    about: 'きれいな 水で できた モンスター。ながれるのが だいすきで、いつも サラサラ 音を 立てている。',
    words: [{ w: '川', y: 'かわ' }, { w: '小川', y: 'おがわ' }, { w: '山川', y: 'やまかわ' }, { w: '川ぞい', y: 'かわぞい' }],
    stations: [['品川', 'しながわ', '山手線'], ['西川口', 'にしかわぐち', '京浜東北・根岸線'], ['川口', 'かわぐち', '京浜東北・根岸線'], ['川崎', 'かわさき', '京浜東北・根岸線'], ['東神奈川', 'ひがしかながわ', '京浜東北・根岸線'], ['石川町', 'いしかわちょう', '京浜東北・根岸線']],
    quiz: [['「二子玉川」は なんと よむ？', ['にこたまかわ', 'ふたこたまがわ', 'ふたごたまがわ'], 1], ['「小川」は なんと よむ？', ['おがわ', 'こかわ', 'しょうせん'], 0]]
  },
  {
    id: 'tsuchi', name: 'ツチマル', kanji: '土', grade: 1, kaku: 3, group: 'sizen', rare: 1,
    on: 'ド・ト', kun: 'つち', color: '#9c6633', tint: '#f2e3d0', hand: false,
    about: 'あたたかい 土で できている。せなかから いつも 草が はえてくる。',
    words: [{ w: '土', y: 'つち' }, { w: '土よう日', y: 'どようび' }, { w: '土手', y: 'どて' }],
    stations: [['土呂', 'とろ', '宇都宮線'], ['土浦', 'つちうら', '常磐線'], ['保土ケ谷', 'ほどがや', '横須賀線'], ['六郷土手', 'ろくごうどて', '京急本線'], ['井土ヶ谷', 'いどがや', '京急本線']]
  },
  {
    id: 'ishi', name: 'イシゴロ', kanji: '石', grade: 1, kaku: 5, group: 'sizen', rare: 2,
    on: 'セキ', kun: 'いし', color: '#78838f', tint: '#eef1f5', hand: false,
    about: 'かたくて じょうぶ。ころがると ゴロゴロ 音が する。',
    words: [{ w: '石', y: 'いし' }, { w: '小石', y: 'こいし' }, { w: '石だん', y: 'いしだん' }],
    stations: [['石川町', 'いしかわちょう', '京浜東北・根岸線'], ['石川台', 'いしかわだい', '池上線'], ['愛甲石田', 'あいこういしだ', '小田原線'], ['石橋', 'いしばし', '宇都宮線'], ['白石蔵王', 'しろいしざおう', '東北新幹線']]
  },
  {
    id: 'mizu', name: 'ミズタマ', kanji: '水', grade: 1, kaku: 4, group: 'sizen', rare: 1,
    on: 'スイ', kun: 'みず', color: '#1fa0c8', tint: '#dcf4fb', hand: true,
    about: 'つめたくて きれいな 水たまり。さわると ぷるぷる ゆれて、うえに ぴょんと はねる。',
    words: [{ w: '水', y: 'みず' }, { w: '水よう日', y: 'すいようび' }, { w: '水どう', y: 'すいどう' }],
    stations: [['富水', 'とみず', '小田原線'], ['御茶ノ水', 'おちゃのみず', '丸ノ内線'], ['新御茶ノ水', 'しんおちゃのみず', '千代田線'], ['水天宮前', 'すいてんぐうまえ', '半蔵門線'], ['水道橋', 'すいどうばし', '中央・総武線'], ['水沢江刺', 'みずさわえさし', '東北新幹線']],
    quiz: []
  },
  {
    id: 'hinoko', name: 'ヒノコ', kanji: '火', grade: 1, kaku: 4, group: 'sizen', rare: 1,
    on: 'カ', kun: 'ひ', color: '#e0521c', tint: '#fde3d5', hand: true,
    about: 'からだが ゆらゆら もえている。おこると もっと 大きく なる。',
    words: [{ w: '火', y: 'ひ' }, { w: '火よう日', y: 'かようび' }, { w: '花火', y: 'はなび' }],
    stations: [],
    quiz: []
  },
  {
    id: 'ta', name: 'タンボン', kanji: '田', grade: 1, kaku: 5, group: 'sizen', rare: 2,
    on: 'デン', kun: 'た', color: '#3f9c46', tint: '#e4f5dd', hand: false,
    about: 'たんぼの モンスター。かえると なかよしで、いっしょに 昼ねを する。',
    words: [{ w: '田', y: 'た' }, { w: '水田', y: 'すいでん' }, { w: '田んぼ', y: 'たんぼ' }],
    stations: [['神田', 'かんだ', '山手線'], ['田端', 'たばた', '山手線'], ['高田馬場', 'たかだのばば', '山手線'], ['五反田', 'ごたんだ', '山手線'], ['田町', 'たまち', '山手線'], ['蒲田', 'かまた', '京浜東北・根岸線']]
  },
  {
    id: 'ki', name: 'キノスケ', kanji: '木', grade: 1, kaku: 4, group: 'sizen', rare: 1,
    on: 'モク・ボク', kun: 'き・こ', color: '#3f9c46', tint: '#e3f3dd', hand: true,
    about: 'あたまに はっぱが 3まい はえた 木の子。あさに なると せのびを する。',
    words: [{ w: '木', y: 'き' }, { w: '木よう日', y: 'もくようび' }, { w: '大木', y: 'たいぼく' }, { w: '木かげ', y: 'こかげ' }],
    stations: [['代々木', 'よよぎ', '山手線'], ['桜木町', 'さくらぎちょう', '京浜東北・根岸線'], ['鵜の木', 'うのき', '東急多摩川線'], ['伊勢佐木長者町', 'いせざきちょうじゃまち', 'ブルーライン'], ['代々木八幡', 'よよぎはちまん', '小田原線'], ['代々木上原', 'よよぎうえはら', '小田原線']],
    quiz: [['「代々木」は なんと よむ？', ['だいだいき', 'よよぎ', 'よよき'], 1], ['「木よう日」は なんと よむ？', ['きようび', 'ぼくようび', 'もくようび'], 2]]
  },
  {
    id: 'hayashi', name: 'リンリン', kanji: '林', grade: 1, kaku: 8, group: 'sizen', rare: 3,
    on: 'リン', kun: 'はやし', color: '#3f9c46', tint: '#e4f5dd', hand: false,
    about: '木が ならんだ 林の子。かぜが ふくと はっぱが さらさら 鳴る。',
    words: [{ w: '林', y: 'はやし' }, { w: '竹林', y: 'たけばやし' }, { w: '山林', y: 'さんりん' }],
    stations: [['中央林間', 'ちゅうおうりんかん', '田園都市線'], ['若林', 'わかばやし', '世田谷線'], ['東林間', 'ひがしりんかん', '江ノ島線'], ['南林間', 'みなみりんかん', '江ノ島線']]
  },
  {
    id: 'mori', name: 'モリモリ', kanji: '森', grade: 1, kaku: 12, group: 'sizen', rare: 3,
    on: 'シン', kun: 'もり', color: '#2f8f5f', tint: '#dff2e6', hand: true,
    about: '木が たくさん あつまった もじゃもじゃの なかま。とりの おうちに なっている。',
    words: [{ w: '森', y: 'もり' }, { w: '森林', y: 'しんりん' }, { w: '青森', y: 'あおもり' }],
    stations: [['大森', 'おおもり', '京浜東北・根岸線'], ['新青森', 'しんあおもり', '東北新幹線'], ['大森海岸', 'おおもりかいがん', '京急本線'], ['大森町', 'おおもりまち', '京急本線'], ['流山おおたかの森', 'ながれやまおおたかのもり', 'つくばエクスプレス']],
    quiz: []
  },
  {
    id: 'kusa', name: 'クサリン', kanji: '草', grade: 1, kaku: 9, group: 'sizen', rare: 3,
    on: 'ソウ', kun: 'くさ', color: '#3f9c46', tint: '#e4f5dd', hand: false,
    about: 'やわらかい 草の からだ。だれかが ねころぶと よろこぶ。',
    words: [{ w: '草', y: 'くさ' }, { w: '草花', y: 'くさばな' }, { w: '草はら', y: 'くさはら' }],
    stations: [['浅草', 'あさくさ', '銀座線'], ['浅草橋', 'あさくさばし', '中央・総武線'], ['百草園', 'もぐさえん', '京王線']]
  },
  {
    id: 'hana', name: 'ハナリン', kanji: '花', grade: 1, kaku: 7, group: 'sizen', rare: 2,
    on: 'カ', kun: 'はな', color: '#ef6f96', tint: '#fde4ec', hand: true,
    about: 'あたまが まるごと 花の モンスター。ほめられると 花びらが ひらく。',
    words: [{ w: '花', y: 'はな' }, { w: '花火', y: 'はなび' }, { w: '花だん', y: 'かだん' }, { w: '草花', y: 'くさばな' }],
    stations: [['花小金井', 'はなこがねい', '西武新宿線'], ['新花巻', 'しんはなまき', '東北新幹線'], ['芦花公園', 'ろかこうえん', '京王線'], ['花月総持寺', 'かげつそうじじ', '京急本線']],
    quiz: [['「花火」は なんと よむ？', ['はなび', 'かひ', 'はなひ'], 0], ['「花小金井」は なんと よむ？', ['はなこきんい', 'かこがねい', 'はなこがねい'], 2]]
  },
  {
    id: 'take', name: 'タケノコ', kanji: '竹', grade: 1, kaku: 6, group: 'sizen', rare: 2,
    on: 'チク', kun: 'たけ', color: '#1f9d86', tint: '#dcf4ee', hand: false,
    about: 'ふしの ある からだが まっすぐ のびる。せが のびるのが とても はやい。',
    words: [{ w: '竹', y: 'たけ' }, { w: '竹馬', y: 'たけうま' }, { w: '竹林', y: 'たけばやし' }],
    stations: [['竹橋', 'たけばし', '東西線'], ['小竹向原', 'こたけむかいはら', '有楽町線']]
  },
  {
    id: 'inu', name: 'ワンタ', kanji: '犬', grade: 1, kaku: 4, group: 'ikimono', rare: 1,
    on: 'ケン', kun: 'いぬ', color: '#c68f4c', tint: '#f7ecd8', hand: true,
    about: 'ふわふわの 毛で まんまるに すわった 子いぬ。よばれると しっぽを まいて よろこぶ。',
    words: [{ w: '犬', y: 'いぬ' }, { w: '子犬', y: 'こいぬ' }, { w: '犬小や', y: 'いぬごや' }],
    stations: [['犬山', 'いぬやま', '名鉄犬山線']],
    quiz: []
  },
  {
    id: 'mushi', name: 'ムシキチ', kanji: '虫', grade: 1, kaku: 6, group: 'ikimono', rare: 2,
    on: 'チュウ', kun: 'むし', color: '#3f9c46', tint: '#e4f5dd', hand: false,
    about: '草むらに すんでいる。石の 下を のぞくのが とくい。',
    words: [{ w: '虫', y: 'むし' }, { w: '虫めがね', y: 'むしめがね' }, { w: 'こん虫', y: 'こんちゅう' }],
    stations: []
  },
  {
    id: 'kai', name: 'カイベエ', kanji: '貝', grade: 1, kaku: 7, group: 'ikimono', rare: 2,
    on: 'バイ', kun: 'かい', color: '#ef6f96', tint: '#fde4ec', hand: false,
    about: 'かたい からを あけたり しめたり。中に しんじゅが あるとか ないとか。',
    words: [{ w: '貝', y: 'かい' }, { w: '貝がら', y: 'かいがら' }, { w: 'ほら貝', y: 'ほらがい' }],
    stations: [['貝塚', 'かいづか', '南海本線']]
  },
  {
    id: 'sei', name: 'イキマル', kanji: '生', grade: 1, kaku: 5, group: 'ikimono', rare: 2,
    on: 'セイ・ショウ', kun: 'い(きる)・う(まれる)', color: '#c9ad14', tint: '#fdf8d5', hand: false,
    about: 'どんな タマゴからでも 生まれてくる。いのちの まんなかに いる モンスター。',
    words: [{ w: '生きる', y: 'いきる' }, { w: '先生', y: 'せんせい' }, { w: '一生', y: 'いっしょう' }],
    stations: [['弥生台', 'やよいだい', 'いずみ野線'], ['生田', 'いくた', '小田原線'], ['柿生', 'かきお', '小田原線'], ['生麦', 'なまむぎ', '京急本線']]
  },
  {
    id: 'uma', name: 'ウマタロ', kanji: '馬', grade: 2, kaku: 10, group: 'ikimono', rare: 3,
    on: 'バ', kun: 'うま・ま', color: '#c8894f', tint: '#f6e7d6', hand: true,
    about: 'ずんぐりした 子うまの モンスター。走るのが 大すきで、よろこぶと たてがみが ゆれる。',
    words: [{ w: '馬', y: 'うま' }, { w: '竹馬', y: 'たけうま' }, { w: '木馬', y: 'もくば' }, { w: '馬車', y: 'ばしゃ' }],
    stations: [['練馬', 'ねりま', '西武池袋線'], ['高田馬場', 'たかだのばば', '山手線'], ['小伝馬町', 'こでんまちょう', '日比谷線'], ['新馬場', 'しんばんば', '京急本線'], ['馬堀海岸', 'まぼりかいがん', '京急本線'], ['馬車道', 'ばしゃみち', 'みなとみらい線']],
    quiz: [['「高田馬場」は なんと よむ？', ['たかだばば', 'たかだのばば', 'こうたばば'], 1], ['「馬車」は なんと よむ？', ['うまぐるま', 'ばしゃ', 'まぐるま'], 1]]
  },
  {
    id: 'me', name: 'メダマル', kanji: '目', grade: 1, kaku: 5, group: 'karada', rare: 2,
    on: 'モク', kun: 'め', color: '#3a6ea8', tint: '#e2edf7', hand: true,
    about: 'からだ ぜんぶが 1つの 大きな 目。とおくの ものまで よく 見えて、ときどき まばたきする。',
    words: [{ w: '目', y: 'め' }, { w: '目玉', y: 'めだま' }, { w: '目じるし', y: 'めじるし' }],
    stations: [['目白', 'めじろ', '山手線'], ['目黒', 'めぐろ', '山手線'], ['中目黒', 'なかめぐろ', '東横線'], ['青山一丁目', 'あおやまいっちょうめ', '銀座線'], ['本郷三丁目', 'ほんごうさんちょうめ', '丸ノ内線'], ['四谷三丁目', 'よつやさんちょうめ', '丸ノ内線']],
    quiz: []
  },
  {
    id: 'mimi', name: 'ミミゾウ', kanji: '耳', grade: 1, kaku: 6, group: 'karada', rare: 2,
    on: 'ジ', kun: 'みみ', color: '#8a6c54', tint: '#f2e6d8', hand: true,
    about: 'ぞうさんみたいな 大きな 耳が じまん。どんな 小さな 音も きこえてしまう。',
    words: [{ w: '耳', y: 'みみ' }, { w: '耳もと', y: 'みみもと' }, { w: '早耳', y: 'はやみみ' }],
    stations: [['耳成', 'みみなし', '近鉄大阪線']],
    quiz: []
  },
  {
    id: 'kuchi', name: 'クチパク', kanji: '口', grade: 1, kaku: 3, group: 'karada', rare: 1,
    on: 'コウ', kun: 'くち', color: '#d64b2c', tint: '#fde6e0', hand: false,
    about: 'よく しゃべって よく 食べる。あくびも とっても 大きい。',
    words: [{ w: '口', y: 'くち' }, { w: '出口', y: 'でぐち' }, { w: '入口', y: 'いりぐち' }],
    stations: [['西川口', 'にしかわぐち', '京浜東北・根岸線'], ['川口', 'かわぐち', '京浜東北・根岸線'], ['溝の口', 'みぞのくち', '田園都市線'], ['矢口渡', 'やぐちのわたし', '東急多摩川線'], ['大口', 'おおぐち', '横浜線']]
  },
  {
    id: 'te', name: 'テノリン', kanji: '手', grade: 1, kaku: 4, group: 'karada', rare: 1,
    on: 'シュ', kun: 'て', color: '#c46f1c', tint: '#fbe6d0', hand: true,
    about: 'ひらいた 手の かたち その もの。にぎると ぽかぽか あたたかい。',
    words: [{ w: '手', y: 'て' }, { w: '手がみ', y: 'てがみ' }, { w: '右手', y: 'みぎて' }],
    stations: [['山手', 'やまて', '京浜東北・根岸線'], ['大手町', 'おおてまち', '丸ノ内線'], ['取手', 'とりで', '常磐線'], ['六郷土手', 'ろくごうどて', '京急本線']],
    quiz: []
  },
  {
    id: 'ashi', name: 'アシスケ', kanji: '足', grade: 1, kaku: 7, group: 'karada', rare: 2,
    on: 'ソク', kun: 'あし・た(りる)', color: '#1f9d86', tint: '#dcf4ee', hand: false,
    about: '走るのが とくい。とまるのは にがて。',
    words: [{ w: '足', y: 'あし' }, { w: '足あと', y: 'あしあと' }, { w: '一足', y: 'いっそく' }],
    stations: [['洗足', 'せんぞく', '目黒線'], ['洗足池', 'せんぞくいけ', '池上線'], ['足柄', 'あしがら', '小田原線']]
  },
  {
    id: 'chikara', name: 'チカラン', kanji: '力', grade: 1, kaku: 2, group: 'karada', rare: 1,
    on: 'リョク・リキ', kun: 'ちから', color: '#d64b2c', tint: '#fde6e0', hand: false,
    about: '小さいのに とっても 力もち。大きな 石も ひょいと もちあげる。',
    words: [{ w: '力', y: 'ちから' }, { w: '力もち', y: 'ちからもち' }, { w: '水力', y: 'すいりょく' }],
    stations: [['等々力', 'とどろき', '大井町線']]
  },
  {
    id: 'hito', name: 'ヒトマル', kanji: '人', grade: 1, kaku: 2, group: 'hito', rare: 1,
    on: 'ジン・ニン', kun: 'ひと', color: '#b8944f', tint: '#f6eddb', hand: false,
    about: '二本の あしで しっかり 立つ。みんなの まねを するのが すき。',
    words: [{ w: '人', y: 'ひと' }, { w: '一人', y: 'ひとり' }, { w: '大人', y: 'おとな' }],
    stations: [['人形町', 'にんぎょうちょう', '日比谷線']]
  },
  {
    id: 'otoko', name: 'ダンキチ', kanji: '男', grade: 1, kaku: 7, group: 'hito', rare: 2,
    on: 'ダン・ナン', kun: 'おとこ', color: '#31a3dd', tint: '#dcf1fb', hand: false,
    about: '田んぼで はたらく 力もち。げんきな こえで あいさつ する。',
    words: [{ w: '男', y: 'おとこ' }, { w: '男の子', y: 'おとこのこ' }, { w: '男子', y: 'だんし' }],
    stations: [['男鹿', 'おが', 'JR男鹿線']]
  },
  {
    id: 'onna', name: 'ジョリン', kanji: '女', grade: 1, kaku: 3, group: 'hito', rare: 1,
    on: 'ジョ・ニョ', kun: 'おんな・め', color: '#ef6f96', tint: '#fde4ec', hand: false,
    about: 'やさしく すわった かっこうの モンスター。おどりが とくい。',
    words: [{ w: '女', y: 'おんな' }, { w: '女の子', y: 'おんなのこ' }, { w: '女子', y: 'じょし' }],
    stations: [['女川', 'おながわ', 'JR石巻線']]
  },
  {
    id: 'ko', name: 'コッコ', kanji: '子', grade: 1, kaku: 3, group: 'hito', rare: 1,
    on: 'シ・ス', kun: 'こ', color: '#c9ad14', tint: '#fdf8d5', hand: false,
    about: 'いちばん ちいさな なかま。だれかの うしろを ちょこちょこ ついてくる。',
    words: [{ w: '子', y: 'こ' }, { w: '子ども', y: 'こども' }, { w: '王子', y: 'おうじ' }],
    stations: [['王子', 'おうじ', '京浜東北・根岸線'], ['新子安', 'しんこやす', '京浜東北・根岸線'], ['磯子', 'いそご', '京浜東北・根岸線'], ['新丸子', 'しんまるこ', '東横線'], ['二子玉川', 'ふたこたまがわ', '田園都市線'], ['二子新地', 'ふたこしんち', '田園都市線']]
  },
  {
    id: 'ou', name: 'オウチャン', kanji: '王', grade: 1, kaku: 4, group: 'hito', rare: 1,
    on: 'オウ', kun: '―', color: '#c99310', tint: '#fdf1cf', hand: false,
    about: 'かんむりを かぶった みんなの おうさま。えらそうに しないのが すてき。',
    words: [{ w: '王', y: 'おう' }, { w: '王さま', y: 'おうさま' }, { w: '王子', y: 'おうじ' }],
    stations: [['王子', 'おうじ', '京浜東北・根岸線'], ['天王町', 'てんのうちょう', '相鉄本線'], ['溜池山王', 'ためいけさんのう', '銀座線'], ['王子神谷', 'おうじかみや', '南北線'], ['天王台', 'てんのうだい', '常磐線'], ['八王子みなみ野', 'はちおうじみなみの', '横浜線']]
  },
  {
    id: 'na', name: 'ナマエル', kanji: '名', grade: 1, kaku: 6, group: 'hito', rare: 2,
    on: 'メイ・ミョウ', kun: 'な', color: '#8a53c0', tint: '#efe4fa', hand: false,
    about: 'だれの 名前も おぼえている。よんで もらうと しっぽを ふる。',
    words: [{ w: '名前', y: 'なまえ' }, { w: '名人', y: 'めいじん' }, { w: '名字', y: 'みょうじ' }],
    stations: [['菊名', 'きくな', '東横線'], ['海老名', 'えびな', '相鉄本線'], ['名古屋', 'なごや', '新幹線のぞみ'], ['安中榛名', 'あんなかはるな', '北陸新幹線']]
  },
  {
    id: 'machi', name: 'マチマル', kanji: '町', grade: 1, kaku: 7, group: 'machi', rare: 2,
    on: 'チョウ', kun: 'まち', color: '#b8944f', tint: '#f6eddb', hand: false,
    about: 'おうちが ならんだ 町の モンスター。まいにち だれかと すれちがう。',
    words: [{ w: '町', y: 'まち' }, { w: '下町', y: 'したまち' }, { w: '町なみ', y: 'まちなみ' }],
    stations: [['御徒町', 'おかちまち', '山手線'], ['田町', 'たまち', '山手線'], ['浜松町', 'はままつちょう', '山手線'], ['有楽町', 'ゆうらくちょう', '山手線'], ['大井町', 'おおいまち', '京浜東北・根岸線'], ['桜木町', 'さくらぎちょう', '京浜東北・根岸線']]
  },
  {
    id: 'mura', name: 'ムラマル', kanji: '村', grade: 1, kaku: 7, group: 'machi', rare: 2,
    on: 'ソン', kun: 'むら', color: '#3f9c46', tint: '#e4f5dd', hand: false,
    about: '木の そばの 小さな 村。ゆうがたに なると みんなで あつまる。',
    words: [{ w: '村', y: 'むら' }, { w: '村人', y: 'むらびと' }, { w: '山村', y: 'さんそん' }],
    stations: [['中村橋', 'なかむらばし', '西武池袋線'], ['村上', 'むらかみ', 'JR羽越本線']]
  },
  {
    id: 'kou', name: 'コウマル', kanji: '校', grade: 1, kaku: 10, group: 'machi', rare: 3,
    on: 'コウ', kun: '―', color: '#3f649b', tint: '#e0e9f6', hand: false,
    about: '学校の たてものの モンスター。チャイムの まねが とくい。',
    words: [{ w: '学校', y: 'がっこう' }, { w: '校てい', y: 'こうてい' }, { w: '校長', y: 'こうちょう' }],
    stations: []
  },
  {
    id: 'gaku', name: 'マナブン', kanji: '学', grade: 1, kaku: 8, group: 'machi', rare: 3,
    on: 'ガク', kun: 'まな(ぶ)', color: '#3f649b', tint: '#e0e9f6', hand: false,
    about: 'ぼうしを かぶった べんきょう だいすきっ子。しつもんされると よろこぶ。',
    words: [{ w: '学校', y: 'がっこう' }, { w: '学ぶ', y: 'まなぶ' }, { w: '学年', y: 'がくねん' }],
    stations: [['学芸大学', 'がくげいだいがく', '東横線'], ['都立大学', 'とりつだいがく', '東横線'], ['駒沢大学', 'こまざわだいがく', '田園都市線'], ['成城学園前', 'せいじょうがくえんまえ', '小田原線'], ['玉川学園前', 'たまがわがくえんまえ', '小田原線'], ['東海大学前', 'とうかいだいがくまえ', '小田原線']]
  },
  {
    id: 'ji', name: 'モジロー', kanji: '字', grade: 1, kaku: 6, group: 'machi', rare: 2,
    on: 'ジ', kun: 'あざ', color: '#8f6a26', tint: '#f4ecd6', hand: true,
    about: 'すみを ふくんだ ふでの すがた。じぶんで 字を かいて みせてくれる。',
    words: [{ w: '字', y: 'じ' }, { w: '文字', y: 'もじ' }, { w: '名字', y: 'みょうじ' }],
    stations: [['十字街', 'じゅうじがい', '函館市電']],
    quiz: []
  },
  {
    id: 'bun', name: 'ブンタ', kanji: '文', grade: 1, kaku: 4, group: 'machi', rare: 1,
    on: 'ブン・モン', kun: 'ふみ', color: '#8a53c0', tint: '#efe4fa', hand: false,
    about: 'ことばを つなげて お話を つくる。おてがみを 書くのが とくい。',
    words: [{ w: '文', y: 'ぶん' }, { w: '文字', y: 'もじ' }, { w: '文しょう', y: 'ぶんしょう' }],
    stations: [['金沢文庫', 'かなざわぶんこ', '京急本線']]
  },
  {
    id: 'hon', name: 'ホンマル', kanji: '本', grade: 1, kaku: 5, group: 'machi', rare: 2,
    on: 'ホン', kun: 'もと', color: '#a4713a', tint: '#f2e6d2', hand: true,
    about: 'ひらいた 本の すがた。ひらくと なかから お話が とびだす。',
    words: [{ w: '本', y: 'ほん' }, { w: '本や', y: 'ほんや' }, { w: '日本', y: 'にほん' }],
    stations: [['本郷台', 'ほんごうだい', '京浜東北・根岸線'], ['日吉本町', 'ひよしほんちょう', 'グリーンライン'], ['本厚木', 'ほんあつぎ', '小田原線'], ['藤沢本町', 'ふじさわほんちょう', '江ノ島線'], ['本鵠沼', 'ほんくげぬま', '江ノ島線'], ['日本橋', 'にほんばし', '銀座線']],
    quiz: []
  },
  {
    id: 'kuruma', name: 'クルマル', kanji: '車', grade: 1, kaku: 7, group: 'machi', rare: 2,
    on: 'シャ', kun: 'くるま', color: '#c9341c', tint: '#fbe0da', hand: true,
    about: '小さな くるまの すがた。タイヤを くるくる まわして どこへでも いく。ブレーキは ちょっと にがて。',
    words: [{ w: '車', y: 'くるま' }, { w: '車どう', y: 'しゃどう' }, { w: '馬車', y: 'ばしゃ' }],
    stations: [['馬車道', 'ばしゃみち', 'みなとみらい線']],
    quiz: []
  },
  {
    id: 'kin', name: 'キンピカ', kanji: '金', grade: 1, kaku: 8, group: 'machi', rare: 3,
    on: 'キン・コン', kun: 'かね', color: '#c99310', tint: '#fdf1cf', hand: false,
    about: 'ぴかぴか 光る からだ。じつは とても かたい。',
    words: [{ w: '金', y: 'きん' }, { w: 'お金', y: 'おかね' }, { w: '金よう日', y: 'きんようび' }],
    stations: [['白金台', 'しろかねだい', '南北線'], ['白金高輪', 'しろかねたかなわ', '南北線'], ['小金井', 'こがねい', '宇都宮線'], ['金沢', 'かなざわ', '北陸新幹線'], ['黄金町', 'こがねちょう', '京急本線'], ['金沢文庫', 'かなざわぶんこ', '京急本線']]
  },
  {
    id: 'tama', name: 'タマリン', kanji: '玉', grade: 1, kaku: 5, group: 'machi', rare: 2,
    on: 'ギョク', kun: 'たま', color: '#1f9d86', tint: '#dcf4ee', hand: false,
    about: 'まんまるで つるつる。ころころ ころがって あそぶ。',
    words: [{ w: '玉', y: 'たま' }, { w: '目玉', y: 'めだま' }, { w: '十円玉', y: 'じゅうえんだま' }],
    stations: [['二子玉川', 'ふたこたまがわ', '田園都市線'], ['玉川学園前', 'たまがわがくえんまえ', '小田原線']]
  },
  {
    id: 'ito', name: 'イトマキ', kanji: '糸', grade: 1, kaku: 6, group: 'machi', rare: 2,
    on: 'シ', kun: 'いと', color: '#ef6f96', tint: '#fde4ec', hand: false,
    about: 'からだが 一本の 糸で できている。ほどけると ちょっと あわてる。',
    words: [{ w: '糸', y: 'いと' }, { w: '毛糸', y: 'けいと' }, { w: '糸まき', y: 'いとまき' }],
    stations: [['錦糸町', 'きんしちょう', '半蔵門線'], ['糸魚川', 'いといがわ', '北陸新幹線']]
  },
  {
    id: 'ue', name: 'ウエマル', kanji: '上', grade: 1, kaku: 3, group: 'muki', rare: 1,
    on: 'ジョウ', kun: 'うえ・あ(がる)', color: '#3f9fd8', tint: '#e2f2fc', hand: false,
    about: 'いつも 上を 見ている。たかい ところが 大すき。',
    words: [{ w: '上', y: 'うえ' }, { w: '川上', y: 'かわかみ' }, { w: '上る', y: 'のぼる' }],
    stations: [['上野', 'うえの', '山手線'], ['上中里', 'かみなかざと', '京浜東北・根岸線'], ['上野毛', 'かみのげ', '大井町線'], ['池上', 'いけがみ', '池上線'], ['上町', 'かみまち', '世田谷線'], ['三ツ沢上町', 'みつざわかみちょう', 'ブルーライン']]
  },
  {
    id: 'shita', name: 'シタマル', kanji: '下', grade: 1, kaku: 3, group: 'muki', rare: 1,
    on: 'カ・ゲ', kun: 'した・さ(がる)', color: '#3f649b', tint: '#e0e9f6', hand: false,
    about: '下を のぞきこむのが すき。じめんの ちかくが おちつく。',
    words: [{ w: '下', y: 'した' }, { w: '川下', y: 'かわしも' }, { w: '下がる', y: 'さがる' }],
    stations: [['下神明', 'しもしんめい', '大井町線'], ['下丸子', 'しもまるこ', '東急多摩川線'], ['山下', 'やました', '世田谷線'], ['下高井戸', 'しもたかいど', '世田谷線'], ['三ツ沢下町', 'みつざわしもちょう', 'ブルーライン'], ['下永谷', 'しもながや', 'ブルーライン']]
  },
  {
    id: 'hidari', name: 'ヒダリン', kanji: '左', grade: 1, kaku: 5, group: 'muki', rare: 2,
    on: 'サ', kun: 'ひだり', color: '#1f9d86', tint: '#dcf4ee', hand: false,
    about: 'かならず 左を むいている。ミギマルとは いつも せなか あわせ。',
    words: [{ w: '左', y: 'ひだり' }, { w: '左手', y: 'ひだりて' }, { w: '左右', y: 'さゆう' }],
    stations: [['左沢', 'あてらざわ', 'JR左沢線']]
  },
  {
    id: 'migi', name: 'ミギマル', kanji: '右', grade: 1, kaku: 5, group: 'muki', rare: 2,
    on: 'ウ・ユウ', kun: 'みぎ', color: '#e07316', tint: '#fdead6', hand: false,
    about: 'かならず 右を むいている。ヒダリンと ならぶと ぴったり。',
    words: [{ w: '右', y: 'みぎ' }, { w: '右手', y: 'みぎて' }, { w: '右がわ', y: 'みぎがわ' }],
    stations: []
  },
  {
    id: 'naka', name: 'ナカマル', kanji: '中', grade: 1, kaku: 4, group: 'muki', rare: 1,
    on: 'チュウ', kun: 'なか', color: '#d64b2c', tint: '#fde6e0', hand: false,
    about: 'どまん中が すきな モンスター。ならぶと まん中に わりこむ。',
    words: [{ w: '中', y: 'なか' }, { w: '空中', y: 'くうちゅう' }, { w: '中学', y: 'ちゅうがく' }],
    stations: [['上中里', 'かみなかざと', '京浜東北・根岸線'], ['中目黒', 'なかめぐろ', '東横線'], ['中央林間', 'ちゅうおうりんかん', '田園都市線'], ['中延', 'なかのぶ', '大井町線'], ['荏原中延', 'えばらなかのぶ', '池上線'], ['中川', 'なかがわ', 'ブルーライン']]
  },
  {
    id: 'dai', name: 'オオマル', kanji: '大', grade: 1, kaku: 3, group: 'muki', rare: 1,
    on: 'ダイ・タイ', kun: 'おお(きい)', color: '#d64b2c', tint: '#fde6e0', hand: false,
    about: '手を いっぱいに ひろげた 大きな なかま。ハグが とくい。',
    words: [{ w: '大きい', y: 'おおきい' }, { w: '大人', y: 'おとな' }, { w: '大学', y: 'だいがく' }],
    stations: [['大塚', 'おおつか', '山手線'], ['新大久保', 'しんおおくぼ', '山手線'], ['大崎', 'おおさき', '山手線'], ['大宮', 'おおみや', '京浜東北・根岸線'], ['大井町', 'おおいまち', '京浜東北・根岸線'], ['大森', 'おおもり', '京浜東北・根岸線']]
  },
  {
    id: 'shou', name: 'チビスケ', kanji: '小', grade: 1, kaku: 3, group: 'muki', rare: 1,
    on: 'ショウ', kun: 'ちい(さい)・こ・お', color: '#c9ad14', tint: '#fdf8d5', hand: false,
    about: 'てのひらに のる ちいさな 子。オオマルの かたに のって おでかけ。',
    words: [{ w: '小さい', y: 'ちいさい' }, { w: '小学校', y: 'しょうがっこう' }, { w: '小川', y: 'おがわ' }],
    stations: [['武蔵小杉', 'むさしこすぎ', '東横線'], ['武蔵小山', 'むさしこやま', '目黒線'], ['西小山', 'にしこやま', '目黒線'], ['大崎広小路', 'おおさきひろこうじ', '池上線'], ['小田急相模原', 'おだきゅうさがみはら', '小田原線'], ['小田原', 'おだわら', '小田原線']]
  },
  {
    id: 'saki', name: 'センパイ', kanji: '先', grade: 1, kaku: 6, group: 'muki', rare: 2,
    on: 'セン', kun: 'さき', color: '#8a53c0', tint: '#efe4fa', hand: false,
    about: 'いつも みんなの 先を あるく。ふりかえって 手を ふってくれる。',
    words: [{ w: '先生', y: 'せんせい' }, { w: '先', y: 'さき' }, { w: '先月', y: 'せんげつ' }],
    stations: []
  },
  {
    id: 'tachi', name: 'タチマル', kanji: '立', grade: 1, kaku: 5, group: 'muki', rare: 2,
    on: 'リツ', kun: 'た(つ)', color: '#9c6633', tint: '#f2e3d0', hand: false,
    about: 'すわらずに ずっと 立っている。だから あしが とても じょうぶ。',
    words: [{ w: '立つ', y: 'たつ' }, { w: '立ち木', y: 'たちき' }, { w: '夕立', y: 'ゆうだち' }],
    stations: [['都立大学', 'とりつだいがく', '東横線'], ['立場', 'たてば', 'ブルーライン'], ['立会川', 'たちあいがわ', '京急本線'], ['県立大学', 'けんりつだいがく', '京急本線']]
  },
  {
    id: 'hairu', name: 'イリマル', kanji: '入', grade: 1, kaku: 2, group: 'muki', rare: 1,
    on: 'ニュウ', kun: 'はい(る)・い(れる)', color: '#3f9c46', tint: '#e4f5dd', hand: false,
    about: 'どんな すきまにも すっと 入っていく。かくれんぼの 名人。',
    words: [{ w: '入る', y: 'はいる' }, { w: '入口', y: 'いりぐち' }, { w: '入学', y: 'にゅうがく' }],
    stations: [['入谷', 'いりや', '日比谷線'], ['汐入', 'しおいり', '京急本線']]
  },
  {
    id: 'deru', name: 'デマル', kanji: '出', grade: 1, kaku: 5, group: 'muki', rare: 2,
    on: 'シュツ', kun: 'で(る)・だ(す)', color: '#c99310', tint: '#fdf1cf', hand: false,
    about: 'あなから ひょっこり 出てくる。おどろかすのが すき。',
    words: [{ w: '出る', y: 'でる' }, { w: '出口', y: 'でぐち' }, { w: '日の出', y: 'ひので' }],
    stations: [['日ノ出町', 'ひのでちょう', '京急本線']]
  },
  {
    id: 'miru', name: 'ミッケ', kanji: '見', grade: 1, kaku: 7, group: 'yosu', rare: 2,
    on: 'ケン', kun: 'み(る)', color: '#3f9fd8', tint: '#e2f2fc', hand: false,
    about: '大きな 目で なんでも 見つける。かくれんぼでは いつも おに。',
    words: [{ w: '見る', y: 'みる' }, { w: '見学', y: 'けんがく' }, { w: '花見', y: 'はなみ' }],
    stations: [['鶴見', 'つるみ', '京浜東北・根岸線'], ['喜多見', 'きたみ', '小田原線'], ['赤坂見附', 'あかさかみつけ', '銀座線'], ['中野富士見町', 'なかのふじみちょう', '丸ノ内線 方南町支線'], ['潮見', 'しおみ', '京葉線'], ['検見川浜', 'けみがわはま', '京葉線']]
  },
  {
    id: 'yasumi', name: 'ヤスミン', kanji: '休', grade: 1, kaku: 6, group: 'yosu', rare: 2,
    on: 'キュウ', kun: 'やす(む)', color: '#3f9c46', tint: '#e4f5dd', hand: false,
    about: '木に よりかかって ひとやすみ。となりに すわると ねむくなる。',
    words: [{ w: '休む', y: 'やすむ' }, { w: '休日', y: 'きゅうじつ' }, { w: '一休み', y: 'ひとやすみ' }],
    stations: []
  },
  {
    id: 'haya', name: 'ハヤマル', kanji: '早', grade: 1, kaku: 6, group: 'yosu', rare: 2,
    on: 'ソウ', kun: 'はや(い)', color: '#c9ad14', tint: '#fdf8d5', hand: false,
    about: 'あさ いちばんに おきる。おひさまより 早い ことも ある。',
    words: [{ w: '早い', y: 'はやい' }, { w: '早口', y: 'はやくち' }, { w: '早耳', y: 'はやみみ' }],
    stations: [['早稲田', 'わせだ', '東西線'], ['西早稲田', 'にしわせだ', '副都心線'], ['早川', 'はやかわ', '東海道線'], ['本庄早稲田', 'ほんじょうわせだ', '上越新幹線']]
  },
  {
    id: 'tadashi', name: 'タダシ', kanji: '正', grade: 1, kaku: 5, group: 'yosu', rare: 2,
    on: 'セイ・ショウ', kun: 'ただ(しい)・まさ', color: '#1f9d86', tint: '#dcf4ee', hand: false,
    about: 'まっすぐで きちんとした なかま。正かいすると うれしそうに ひかる。',
    words: [{ w: '正しい', y: 'ただしい' }, { w: '正月', y: 'しょうがつ' }, { w: '正かい', y: 'せいかい' }],
    stations: [['正雀', 'しょうじゃく', '阪急京都線']]
  },
  {
    id: 'oto', name: 'オトマル', kanji: '音', grade: 1, kaku: 9, group: 'yosu', rare: 3,
    on: 'オン', kun: 'おと・ね', color: '#8a53c0', tint: '#efe4fa', hand: false,
    about: 'からだから きれいな 音が 鳴る。しずかな ところが にがて。',
    words: [{ w: '音', y: 'おと' }, { w: '音がく', y: 'おんがく' }, { w: '足音', y: 'あしおと' }],
    stations: [['音更', 'おとふけ', 'JR根室本線']]
  },
  {
    id: 'en', name: 'エンマル', kanji: '円', grade: 1, kaku: 4, group: 'yosu', rare: 1,
    on: 'エン', kun: 'まる(い)', color: '#c9ad14', tint: '#fdf8d5', hand: false,
    about: 'まんまるで つるん。おかいものの ときに たよりに なる。',
    words: [{ w: '円', y: 'えん' }, { w: '百円', y: 'ひゃくえん' }, { w: '円い', y: 'まるい' }],
    stations: [['東高円寺', 'ひがしこうえんじ', '丸ノ内線'], ['新高円寺', 'しんこうえんじ', '丸ノ内線'], ['高円寺', 'こうえんじ', '中央・総武線']]
  },
  {
    id: 'aka', name: 'アカリン', kanji: '赤', grade: 1, kaku: 7, group: 'iro', rare: 2,
    on: 'セキ', kun: 'あか(い)', color: '#d64b2c', tint: '#fde6e0', hand: false,
    about: 'まっ赤な からだ。うれしいと もっと 赤くなる。',
    words: [{ w: '赤', y: 'あか' }, { w: '赤い', y: 'あかい' }, { w: '赤ちゃん', y: 'あかちゃん' }],
    stations: [['赤羽', 'あかばね', '京浜東北・根岸線'], ['赤坂見附', 'あかさかみつけ', '銀座線'], ['赤坂', 'あかさか', '千代田線'], ['地下鉄赤塚', 'ちかてつあかつか', '有楽町線'], ['赤羽岩淵', 'あかばねいわぶち', '南北線']]
  },
  {
    id: 'ao', name: 'アオマル', kanji: '青', grade: 1, kaku: 8, group: 'iro', rare: 3,
    on: 'セイ・ショウ', kun: 'あお(い)', color: '#31a3dd', tint: '#dcf1fb', hand: false,
    about: 'すきとおった 青い からだ。そらと うみを 見るのが すき。',
    words: [{ w: '青', y: 'あお' }, { w: '青い', y: 'あおい' }, { w: '青空', y: 'あおぞら' }],
    stations: [['青葉台', 'あおばだい', '田園都市線'], ['青山一丁目', 'あおやまいっちょうめ', '銀座線'], ['新青森', 'しんあおもり', '東北新幹線'], ['青物横丁', 'あおものよこちょう', '京急本線'], ['青井', 'あおい', 'つくばエクスプレス']]
  },
  {
    id: 'shiro', name: 'シロマル', kanji: '白', grade: 1, kaku: 5, group: 'iro', rare: 2,
    on: 'ハク・ビャク', kun: 'しろ(い)', color: '#8d99a6', tint: '#f4f7fa', hand: false,
    about: 'ゆきのように まっ白。よごれると おおさわぎ する。',
    words: [{ w: '白', y: 'しろ' }, { w: '白い', y: 'しろい' }, { w: 'まっ白', y: 'まっしろ' }],
    stations: [['目白', 'めじろ', '山手線'], ['白楽', 'はくらく', '東横線'], ['東白楽', 'ひがしはくらく', '東横線'], ['清澄白河', 'きよすみしらかわ', '半蔵門線'], ['白金台', 'しろかねだい', '南北線'], ['白金高輪', 'しろかねたかなわ', '南北線']]
  }
];

/* 絵のレシピ。b=からだ p=いろ f=かざり k=プリントする字 */
const ART = {
  'ni': { b: 'bar', p: 'sky', k: '二', f: ['bar2', 'armsShort', 'feetTwo'] },
  'san': { b: 'bar', p: 'orange', k: '三', f: ['bar3', 'armsShort', 'feetTwo'] },
  'yon': { b: 'box', p: 'purple', k: '四', f: ['stripe', 'armsShort', 'legsShort'] },
  'go': { b: 'blob', p: 'teal', k: '五', f: ['handWave', 'feetTwo'] },
  'roku': { b: 'blob', p: 'purple', k: '六', f: ['hornTwo', 'feetTwo'] },
  'nana': { b: 'bug', p: 'red', k: '七', f: ['dots7', 'antenna', 'legsShort'] },
  'hachi': { b: 'bug', p: 'yellow', k: '八', f: ['wingsBee', 'antenna', 'stripe'] },
  'kyuu': { b: 'blob', p: 'navy', k: '九', f: ['earsLong', 'feetTwo'] },
  'juu': { b: 'blob', p: 'green', k: '十', f: ['cross', 'armsShort', 'feetTwo'] },
  'hyaku': { b: 'disc', p: 'gold', k: '百', f: ['coin', 'armsShort', 'feetTwo'] },
  'sen': { b: 'tall', p: 'sky', k: '千', f: ['bar3', 'armsShort', 'feetTwo'] },
  'ten': { b: 'cloud', p: 'sky', k: '天', f: ['sparkTop', 'armsShort'] },
  'sora': { b: 'cloud', p: 'snow', k: '空', f: ['sparkTop', 'armsShort', 'feetTwo'] },
  'ame': { b: 'blob', p: 'sky', k: '雨', f: ['raincloud', 'feetTwo'] },
  'kimochi': { b: 'blob', p: 'teal', k: '気', f: ['sparkTop', 'armsShort', 'feetTwo'] },
  'yuu': { b: 'disc', p: 'orange', k: '夕', f: ['moonC', 'armsShort', 'feetTwo'] },
  'toshi': { b: 'blob', p: 'pink', k: '年', f: ['ribbon', 'armsShort', 'feetTwo'] },
  'tsuchi': { b: 'mound', p: 'brown', k: '土', f: ['grass', 'armsShort'] },
  'ishi': { b: 'blob', p: 'gray', k: '石', f: ['stone', 'armsShort', 'feetTwo'] },
  'ta': { b: 'box', p: 'green', k: '田', f: ['bar2', 'armsShort', 'legsShort'] },
  'hayashi': { b: 'stalk', p: 'green', k: '林', f: ['leaf3', 'feetTwo'] },
  'kusa': { b: 'stalk', p: 'green', k: '草', f: ['leaf3', 'grass'] },
  'take': { b: 'stalk', p: 'teal', k: '竹', f: ['bamboo', 'leaf1', 'feetTwo'] },
  'mushi': { b: 'bug', p: 'green', k: '虫', f: ['antenna', 'legsShort'] },
  'kai': { b: 'shell', p: 'pink', k: '貝', f: ['shellLines', 'feetTwo'] },
  'sei': { b: 'stalk', p: 'yellow', k: '生', f: ['leaf1', 'sparkTop', 'feetTwo'] },
  'kuchi': { b: 'blob', p: 'red', k: '口', f: ['armsShort', 'feetTwo'], fc: { r: 13, g: 26 }, mo: 1.9 },
  'ashi': { b: 'blob', p: 'teal', k: '足', f: ['legsShort', 'speed'] },
  'chikara': { b: 'blob', p: 'red', k: '力', f: ['armsShort', 'legsShort', 'speed'] },
  'hito': { b: 'tall', p: 'sand', k: '人', f: ['armsShort', 'legsShort'] },
  'otoko': { b: 'box', p: 'blue', k: '男', f: ['armsShort', 'legsShort', 'stripe'] },
  'onna': { b: 'blob', p: 'pink', k: '女', f: ['ribbon', 'feetTwo'] },
  'ko': { b: 'blob', p: 'yellow', k: '子', f: ['earsRound', 'feetTwo'] },
  'ou': { b: 'blob', p: 'gold', k: '王', f: ['crown', 'armsShort', 'feetTwo'] },
  'na': { b: 'blob', p: 'purple', k: '名', f: ['sparkTop', 'armsShort', 'tailWave'] },
  'machi': { b: 'box', p: 'sand', k: '町', f: ['window', 'legsShort'] },
  'mura': { b: 'mound', p: 'green', k: '村', f: ['window', 'grass'] },
  'kou': { b: 'box', p: 'navy', k: '校', f: ['window', 'legsShort'] },
  'gaku': { b: 'tall', p: 'navy', k: '学', f: ['cap', 'armsShort', 'feetTwo'] },
  'bun': { b: 'box', p: 'purple', k: '文', f: ['thread', 'armsShort', 'feetTwo'] },
  'kin': { b: 'disc', p: 'gold', k: '金', f: ['coin', 'sparkTop', 'feetTwo'] },
  'tama': { b: 'disc', p: 'teal', k: '玉', f: ['coin', 'feetTwo'] },
  'ito': { b: 'tall', p: 'pink', k: '糸', f: ['thread', 'armsShort', 'feetTwo'] },
  'ue': { b: 'bar', p: 'sky', k: '上', f: ['arrowUp', 'feetTwo'] },
  'shita': { b: 'bar', p: 'navy', k: '下', f: ['arrowDown', 'feetTwo'] },
  'hidari': { b: 'blob', p: 'teal', k: '左', f: ['arrowLeft', 'armsShort', 'feetTwo'] },
  'migi': { b: 'blob', p: 'orange', k: '右', f: ['arrowRight', 'armsShort', 'feetTwo'] },
  'naka': { b: 'disc', p: 'red', k: '中', f: ['coin', 'armsShort', 'feetTwo'] },
  'dai': { b: 'blob', p: 'red', k: '大', f: ['handWave', 'legsShort'] },
  'shou': { b: 'blob', p: 'yellow', k: '小', f: ['armsShort', 'feetTwo'], fc: { r: 13, g: 18 } },
  'saki': { b: 'tall', p: 'purple', k: '先', f: ['antenna', 'armsShort', 'feetTwo'] },
  'tachi': { b: 'stalk', p: 'brown', k: '立', f: ['legsShort'] },
  'hairu': { b: 'shell', p: 'green', k: '入', f: ['feetTwo'] },
  'deru': { b: 'mound', p: 'gold', k: '出', f: ['armsShort'] },
  'miru': { b: 'blob', p: 'sky', k: '見', f: ['armsShort', 'feetTwo'], fc: { r: 23, g: 28 } },
  'yasumi': { b: 'tall', p: 'green', k: '休', f: ['sleepZ', 'armsShort'] },
  'haya': { b: 'disc', p: 'yellow', k: '早', f: ['speed', 'armsShort', 'feetTwo'] },
  'tadashi': { b: 'box', p: 'teal', k: '正', f: ['cross', 'armsShort', 'feetTwo'] },
  'oto': { b: 'blob', p: 'purple', k: '音', f: ['note', 'antenna', 'feetTwo'] },
  'en': { b: 'disc', p: 'yellow', k: '円', f: ['coin', 'armsShort', 'feetTwo'] },
  'aka': { b: 'blob', p: 'red', k: '赤', f: ['ribbon', 'armsShort', 'feetTwo'] },
  'ao': { b: 'blob', p: 'blue', k: '青', f: ['armsShort', 'feetTwo'] },
  'shiro': { b: 'blob', p: 'snow', k: '白', f: ['sparkTop', 'armsShort', 'feetTwo'] }
};

const KANJI_PATH = {
  '一': 'M9.4 43.8H89.5V51.6H9.4Z',
  '二': 'M16.5 21.7H82.4V29.0H16.5ZM9.4 73.5H89.5V81.0H9.4Z',
  '三': 'M14.6 18.2H84.3V25.4H14.6ZM19.4 46.2H79.5V53.4H19.4ZM9.4 77.2H89.5V84.3H9.4Z',
  '四': 'M87.5 16.8V90.6H80.7V83.5H18.3V90.6H11.3V16.8ZM18.3 23.0V77.1H80.7V23.0H61.0V53.4Q61.0 55.6 61.8 56.1Q62.8 56.7 65.8 56.7Q70.9 56.7 71.6 54.7Q72.2 52.9 72.3 47.7L72.4 46.3L78.6 48.6Q78.3 57.5 76.5 60.1Q74.6 62.9 66.0 62.9Q58.5 62.9 56.4 61.3Q54.3 59.9 54.3 56.1V23.0H41.5V32.7Q41.5 49.2 35.8 57.0Q32.3 62.0 24.2 67.0L19.7 61.6Q29.5 56.5 32.5 48.4Q34.7 42.7 34.7 33.5V23.0Z',
  '五': 'M49.9 22.2 45.8 43.8H73.9V80.3H91.4V86.7H8.4V80.3H31.8L37.4 50.0H18.3V43.8H38.6L42.6 22.2H14.1V15.8H83.4V22.2ZM66.8 50.0H44.7L39.1 80.3H66.8Z',
  '六': 'M53.0 28.1H90.1V34.9H8.8V28.1H45.3V9.9H53.0ZM83.7 87.7Q71.7 65.7 58.0 48.5L64.1 44.8Q76.6 59.0 90.9 81.8ZM8.4 83.7Q23.3 69.5 31.8 46.0L38.8 48.8Q29.4 74.2 14.1 89.6Z',
  '七': 'M41.8 36.0 89.6 30.8 90.3 37.6 41.8 43.1V74.2Q41.8 78.8 44.7 79.6Q47.7 80.4 58.0 80.4Q71.1 80.4 75.0 79.3Q77.9 78.3 78.6 74.4Q79.5 69.6 79.7 60.9L87.3 62.8Q86.6 80.0 83.8 83.5Q81.6 86.1 75.8 87.0Q69.6 87.7 58.4 87.7Q42.7 87.7 38.7 86.1Q34.2 84.2 34.2 77.9V44.0L8.4 47.0L7.5 39.7L34.2 36.8V10.4H41.8Z',
  '八': 'M63.2 12.3 63.9 16.4Q71.0 56.2 92.6 81.3L86.6 87.6Q64.5 59.5 57.0 18.9H35.5V12.3ZM7.1 82.6Q27.2 64.5 31.9 26.3L39.2 28.3Q33.6 66.8 12.9 88.3Z',
  '九': 'M60.3 35.3H42.4Q42.0 54.6 36.7 66.9Q30.0 82.6 12.7 91.9L7.5 85.6Q24.8 77.1 30.5 62.1Q34.7 50.8 35.0 36.1H11.3V29.4H35.0V9.4H42.5V28.6H67.8V77.9Q67.8 80.7 69.9 81.2Q71.7 81.7 74.7 81.7Q81.6 81.7 82.4 78.7Q83.5 75.7 83.6 64.0L91.1 66.3Q90.3 82.0 88.2 85.1Q85.5 88.9 73.3 88.9Q65.0 88.9 62.4 87.0Q60.3 85.5 60.3 81.4Z',
  '十': 'M45.2 41.8V8.5H53.1V41.8H90.1V49.0H53.1V93.0H45.2V49.0H8.9V41.8Z',
  '百': 'M48.3 35.1H80.3V93.0H73.1V86.8H25.8V93.0H18.6V35.1H41.1Q42.7 29.0 43.8 20.6H8.9V14.3H90.0V20.6H51.7Q50.2 28.4 48.6 33.8ZM73.1 41.2H25.8V57.3H73.1ZM25.8 63.2V80.8H73.1V63.2Z',
  '千': 'M45.4 46.1V24.2Q27.2 26.3 15.9 27.0L13.2 20.7Q49.7 18.6 74.6 11.7L80.5 18.1Q69.4 20.8 54.1 23.0L53.0 23.2V46.1H90.0V52.7H53.0V93.0H45.4V52.7H8.9V46.1Z',
  '日': 'M79.8 14.7V90.6H72.5V84.4H26.3V90.6H19.0V14.7ZM26.3 21.1V45.6H72.5V21.1ZM26.3 52.1V78.0H72.5V52.1Z',
  '月': 'M77.0 11.9V82.5Q77.0 87.5 74.4 89.4Q72.4 90.8 67.5 90.8Q59.8 90.8 50.3 90.0L49.0 82.7Q57.7 84.0 65.8 84.0Q68.9 84.0 69.6 82.4Q69.9 81.7 69.9 79.8V61.4H30.9Q30.2 72.1 27.3 79.3Q24.7 86.3 18.4 93.4L12.8 87.3Q20.5 79.3 22.7 67.8Q24.1 59.9 24.1 46.8V11.9ZM31.3 18.1V33.5H69.9V18.1ZM31.3 39.4V48.2Q31.3 52.2 31.2 54.3V55.5H69.9V39.4Z',
  '天': 'M53.8 48.7Q57.7 60.2 68.2 70.0Q77.4 78.6 90.7 83.5L85.6 90.3Q72.3 84.6 62.0 74.0Q53.9 65.6 49.5 54.3Q45.1 80.8 13.7 91.9L8.6 85.8Q40.5 76.0 44.5 48.7H15.1V42.3H44.9V21.9H10.0V15.3H88.8V21.9H52.4V42.3H84.0V48.7Z',
  '空': 'M61.4 25.6V42.2Q61.4 44.6 62.8 45.2Q64.1 45.9 68.5 45.9Q75.5 45.9 76.2 43.9Q76.7 42.7 77.2 36.5L83.9 38.1Q83.9 46.3 81.4 49.3Q79.3 52.2 68.2 52.2Q59.8 52.2 57.2 50.9Q54.6 49.7 54.6 45.3V25.6H17.9V39.5H10.9V19.3H45.5V7.0H52.8V19.3H88.0V36.2H80.9V25.6ZM52.8 65.9V83.5H90.5V89.7H8.4V83.5H45.5V65.9H16.5V59.6H82.3V65.9ZM12.7 50.9Q25.5 48.5 30.7 41.5Q34.6 36.4 35.8 27.2L42.2 28.5Q40.6 42.4 32.9 49.1Q27.3 54.0 16.8 56.4Z',
  '雨': 'M45.8 32.1V20.1H7.4V13.8H91.2V20.1H52.5V32.1H86.7V84.0Q86.7 87.8 85.2 89.7Q83.4 91.8 78.3 91.8Q72.4 91.8 65.7 91.2L64.3 84.2Q70.3 85.1 76.0 85.1Q79.8 85.1 79.8 81.7V38.1H52.5V89.7H45.8V38.1H19.1V93.0H12.2V32.1ZM37.9 77.8Q31.1 70.7 22.8 65.5L27.0 60.7Q34.5 65.0 42.3 72.3ZM36.9 59.1Q30.0 52.3 23.0 47.7L27.2 43.0Q35.3 48.3 41.3 54.2ZM70.4 59.0Q63.8 52.4 56.2 47.6L60.3 42.9Q67.7 47.2 74.5 54.1ZM71.4 77.3Q64.7 70.7 56.6 65.4L60.6 60.7Q69.4 66.1 75.7 72.3Z',
  '気': 'M29.5 16.8H85.2V22.7H26.7Q21.2 33.0 14.1 40.7L9.6 35.6Q20.6 23.9 25.6 7.4L32.6 8.7Q31.3 12.6 29.5 16.8ZM76.3 42.3 76.4 50.5Q76.7 70.8 79.7 79.4Q81.3 83.6 82.2 83.6Q84.0 83.6 85.9 68.6L92.0 72.7Q89.0 93.1 82.7 93.1Q78.2 93.1 74.2 84.2Q69.6 74.1 69.6 50.8V48.2H11.7V42.3ZM37.4 69.8Q27.7 63.2 17.7 58.4L21.9 53.7Q31.4 58.3 40.6 64.3L41.6 64.8Q47.0 58.1 50.2 50.0L56.7 52.9Q52.5 61.9 47.2 68.7Q56.5 75.2 65.4 82.9L60.6 88.3Q52.2 80.5 42.9 73.7Q32.0 85.6 15.6 91.9L11.5 85.9Q27.5 80.3 36.9 70.4ZM24.3 29.3H76.2V35.2H24.3Z',
  '夕': 'M55.2 61.6Q45.0 51.6 32.9 43.4Q25.1 52.6 16.6 58.3L11.6 52.9Q33.5 38.8 42.8 8.8L50.1 10.9Q49.0 14.4 46.9 19.5H78.9L83.1 23.2Q68.4 74.1 24.1 91.2L18.6 84.9Q39.9 78.0 55.2 61.6ZM60.1 55.7Q69.9 42.5 74.5 25.9H43.9Q41.0 31.9 36.8 38.1Q48.3 45.4 60.1 55.7Z',
  '年': 'M28.2 24.2Q23.3 35.3 14.8 44.5L9.6 39.1Q21.4 27.5 26.1 7.8L33.2 9.4Q31.5 15.3 30.5 18.2H86.7V24.2H57.8V39.6H82.8V45.7H57.8V63.8H92.5V70.0H57.8V93.0H50.6V70.0H8.4V63.8H24.6V39.6H50.6V24.2ZM50.6 45.7H31.5V63.8H50.6Z',
  '山': 'M52.8 77.1H78.3V26.2H85.6V90.2H78.3V83.7H20.6V90.7H13.3V26.2H20.6V77.1H45.4V9.4H52.8Z',
  '川': 'M18.8 13.2H26.3V43.0Q26.3 63.3 23.4 73.8Q20.7 83.5 13.0 93.2L7.1 88.0Q14.7 78.8 17.1 66.9Q18.8 58.2 18.8 44.2ZM46.8 15.1H54.3V84.1H46.8ZM76.0 11.8H83.7V89.9H76.0Z',
  '土': 'M45.3 34.0V9.7H52.9V34.0H83.6V40.6H52.9V79.9H89.9V86.3H9.0V79.9H45.3V40.6H15.2V34.0Z',
  '石': 'M35.2 44.7H83.6V92.2H76.5V85.6H35.2V92.2H28.1V54.5Q20.9 63.5 11.5 70.4L6.8 64.9Q28.8 49.9 38.9 21.9L39.2 21.2H10.9V14.8H90.1V21.2H46.8Q42.5 33.0 35.2 44.7ZM35.2 50.9V79.4H76.5V50.9Z',
  '水': 'M53.5 23.4Q55.4 33.2 59.3 41.1Q70.2 32.4 79.2 21.3L85.3 26.0Q75.6 37.1 62.3 46.8Q73.4 64.7 92.2 75.5L87.3 82.2Q61.7 65.5 53.5 41.6V85.4Q53.5 92.2 44.6 92.2Q38.8 92.2 32.5 91.5L31.1 84.1Q38.5 85.2 43.7 85.2Q46.5 85.2 46.5 82.4V8.3H53.5ZM10.2 29.7H38.1L41.3 33.1Q38.7 47.0 34.3 56.4Q27.2 71.7 12.2 84.7L6.5 79.3Q28.8 62.8 33.9 36.1H10.2Z',
  '火': 'M52.8 9.5V25.9Q52.8 66.9 91.0 83.4L85.3 89.9Q56.8 75.5 49.8 47.7Q45.1 80.9 13.9 91.9L8.8 85.6Q29.3 79.8 37.4 64.7Q45.4 50.2 45.4 27.1V9.5ZM13.6 54.3Q21.5 42.3 24.5 27.6L31.9 29.1Q27.5 46.9 20.3 58.6ZM64.0 51.4Q73.0 38.5 79.0 24.2L86.7 27.6Q79.2 43.0 70.1 54.7Z',
  '田': 'M84.7 16.1V90.2H77.7V84.4H21.1V90.7H14.1V16.1ZM21.1 22.3V46.8H45.8V22.3ZM21.1 52.9V78.2H45.8V52.9ZM77.7 78.2V52.9H52.5V78.2ZM77.7 46.8V22.3H52.5V46.8Z',
  '木': 'M54.7 36.7Q67.2 60.5 92.6 73.8L87.2 81.1Q63.4 64.6 52.8 44.6V92.1H45.5V45.6Q35.6 67.6 12.6 83.5L7.3 77.5Q31.8 62.7 43.6 36.7H8.9V30.1H45.5V9.4H52.8V30.1H90.1V36.7Z',
  '林': 'M25.8 46.0Q20.2 62.5 11.1 75.5L6.5 69.1Q18.5 54.2 24.2 33.6H8.8V27.4H25.8V8.1H32.5V27.4H44.8V33.6H32.5V43.2Q41.3 49.8 48.2 57.6L43.9 64.0Q37.7 56.0 32.5 50.8V93.0H25.8ZM72.9 33.6Q78.8 54.2 93.1 70.1L88.4 77.1Q77.3 63.0 71.5 44.9V93.0H64.7V45.2Q59.3 65.6 47.9 79.7L43.2 73.7Q56.7 58.8 63.3 33.6H47.9V27.4H64.7V8.1H71.5V27.4H89.9V33.6Z',
  '森': 'M57.5 23.7 58.1 24.2Q71.9 33.9 90.6 40.4L86.0 46.1Q65.7 37.6 52.4 26.4V47.7H45.8V27.2Q33.2 40.9 12.8 47.6L8.6 42.3Q29.0 35.9 41.7 23.7H12.3V17.9H45.8V7.0H52.5V17.9H86.7V23.7ZM25.9 69.6Q19.7 80.9 9.8 89.0L5.2 84.4Q17.5 75.1 24.6 61.5H6.7V55.6H25.9V45.4H32.3V55.6H47.6V61.5H32.3V64.7L32.9 65.2Q42.4 71.5 47.6 76.5L43.6 81.8Q38.5 76.2 32.3 71.2V93.0H25.9ZM73.9 61.5Q81.1 72.5 94.2 82.1L89.5 87.4Q78.2 77.7 72.5 68.4V93.0H66.1V69.6Q60.9 80.2 49.4 88.9L44.8 84.1Q57.8 75.3 64.9 62.1L65.2 61.5H50.4V55.6H66.1V45.4H72.5V55.6H92.4V61.5Z',
  '草': 'M52.7 63.8V72.2H92.5V78.2H52.7V93.0H45.7V78.2H6.5V72.2H45.7V63.8H18.4V32.7H80.3V63.8ZM25.2 38.3V45.3H73.7V38.3ZM25.2 50.6V58.3H73.7V50.6ZM31.4 17.2V7.0H38.1V17.2H60.1V7.0H66.8V17.2H91.3V23.2H66.8V29.5H60.1V23.2H38.1V29.5H31.4V23.2H7.7V17.2Z',
  '花': 'M31.3 20.5V8.5H38.3V20.5H60.0V8.5H67.0V20.5H90.0V26.8H67.0V36.8H60.0V26.8H38.3V36.8H31.3V26.8H9.0V20.5ZM31.5 52.4V93.2H24.8V60.2L24.0 61.0Q18.8 66.5 12.1 71.4L7.4 66.1Q24.6 54.4 33.2 37.7L39.5 40.4Q36.1 46.4 31.5 52.4ZM56.2 57.7Q69.7 52.5 80.7 43.9L86.3 48.9Q72.2 58.8 56.2 64.3V78.7Q56.2 82.2 58.4 83.1Q60.9 84.2 68.3 84.2Q73.2 84.2 77.3 83.7Q82.0 82.9 82.7 79.3Q83.3 76.8 83.8 67.1L90.9 69.5Q90.2 80.4 89.1 84.2Q87.8 89.1 81.9 90.2Q76.8 90.9 67.6 90.9Q55.3 90.9 52.4 89.2Q49.5 87.4 49.5 82.3V39.0H56.2Z',
  '竹': 'M34.2 32.7V92.1H27.2V32.7H21.9Q17.5 42.3 11.2 50.4L5.9 45.3Q17.4 30.8 22.4 9.2L29.7 10.9Q27.5 19.7 24.7 26.3H50.1V32.7ZM76.5 32.7V84.3Q76.5 91.4 68.2 91.4Q61.8 91.4 56.2 90.8L54.8 83.3Q61.4 84.3 66.2 84.3Q69.5 84.3 69.5 81.2V32.7H59.9Q55.3 43.0 48.9 51.4L43.3 46.7Q55.7 30.2 59.8 8.9L67.1 10.7Q65.2 18.7 62.5 26.3H91.2V32.7Z',
  '犬': 'M52.9 40.5Q63.7 68.6 91.3 82.5L86.0 89.6Q58.7 73.7 48.9 46.4Q45.1 76.5 14.7 91.3L9.4 84.9Q39.5 73.6 43.7 40.5H8.9V34.1H44.0V8.6H51.4V34.1H90.1V40.5ZM72.6 29.6Q67.3 20.6 61.8 14.4L67.9 10.9Q72.9 16.4 79.1 25.8Z',
  '虫': 'M45.7 25.3V6.9H52.7V25.3H82.8V58.5H52.7V79.9Q53.9 79.8 58.3 79.4Q60.6 79.2 61.8 79.2Q69.9 78.5 72.4 78.2L76.3 77.8Q72.1 72.1 66.4 65.5L72.0 62.4Q83.0 73.7 92.8 87.8L86.3 92.1Q83.4 87.5 80.4 83.4Q60.0 86.4 19.4 89.5L10.9 90.1L8.5 82.5L21.7 81.9Q39.3 81.0 45.7 80.4V58.5H23.2V66.7H16.2V25.3ZM23.2 31.6V52.2H45.7V31.6ZM75.8 52.2V31.6H52.7V52.2Z',
  '貝': 'M80.0 11.4V71.0H18.9V11.4ZM25.9 17.5V29.1H73.0V17.5ZM25.9 34.9V46.5H73.0V34.9ZM25.9 52.2V65.0H73.0V52.2ZM7.9 87.5Q24.0 81.9 35.5 72.3L41.8 76.4Q29.7 86.7 13.2 93.8ZM84.2 92.4Q69.5 82.6 55.4 76.4L61.2 71.8Q75.7 77.7 90.3 86.4Z',
  '生': 'M27.7 29.3H46.8V8.0H54.1V29.3H85.7V35.5H54.1V54.6H81.8V60.8H54.1V82.6H91.0V88.8H9.4V82.6H46.8V60.8H20.6V54.6H46.8V35.5H25.0Q20.6 44.4 14.7 51.3L9.4 46.2Q20.2 33.9 24.9 14.2L31.9 15.9Q30.0 23.4 27.7 29.3Z',
  '馬': 'M84.2 11.4V17.3H54.4V25.6H80.5V31.1H54.4V39.3H80.5V44.9H54.4V53.7H88.8Q88.1 77.2 86.1 85.5Q84.2 92.9 74.7 92.9Q67.7 92.9 60.7 92.4L59.4 84.9Q67.0 86.1 73.5 86.1Q79.1 86.1 79.8 82.1Q81.2 75.0 81.8 59.4H18.0V11.4ZM24.8 17.3V25.6H48.0V17.3ZM24.8 31.1V39.3H48.0V31.1ZM24.8 44.9V53.7H48.0V44.9ZM7.7 85.0Q13.7 77.1 17.0 64.7L23.7 66.8Q20.0 81.2 14.0 90.0ZM32.9 87.7Q32.4 77.1 30.5 67.3L37.4 66.5Q39.6 75.6 40.5 85.9ZM51.0 84.2Q48.8 73.5 45.5 66.1L51.8 64.2Q55.5 71.4 58.3 81.6ZM68.9 80.0Q65.6 71.5 60.7 64.5L66.1 61.7Q71.1 67.9 75.1 76.7Z',
  '目': 'M80.3 14.4V92.1H73.2V85.8H25.6V92.1H18.5V14.4ZM25.6 20.4V35.8H73.2V20.4ZM25.6 41.7V57.0H73.2V41.7ZM25.6 63.0V79.7H73.2V63.0Z',
  '耳': 'M74.9 20.5V69.0L82.6 68.3Q90.0 67.4 92.3 67.2L92.5 73.0Q87.2 73.7 79.4 74.5L74.9 75.1V93.0H68.0V75.7L61.8 76.5Q43.6 78.3 18.7 80.4L8.1 81.3L6.4 74.5Q8.0 74.4 10.7 74.2Q16.1 73.9 18.4 73.7L24.0 73.3V20.5H8.8V14.4H90.5V20.5ZM68.0 20.5H31.0V32.5H68.0ZM68.0 38.6H31.0V51.1H68.0ZM68.0 57.2H31.0V72.9L36.9 72.4Q49.9 71.5 64.2 70.1L68.0 69.7Z',
  '口': 'M82.7 19.2V87.2H75.1V80.5H23.8V87.8H16.1V19.2ZM23.8 25.9V73.8H75.1V25.9Z',
  '手': 'M54.2 22.1V37.3H85.2V43.4H54.2V57.9H92.5V64.1H54.2V83.5Q54.2 91.2 44.1 91.2Q36.4 91.2 28.6 90.3L27.4 82.8Q36.1 84.4 43.1 84.4Q47.1 84.4 47.1 80.8V64.1H6.4V57.9H47.1V43.4H13.7V37.3H47.1V23.1Q32.4 24.9 17.4 25.7L14.4 19.7Q49.7 17.9 74.4 11.5L80.3 17.4Q68.7 20.0 55.0 22.0Z',
  '足': 'M52.9 82.4Q60.8 83.3 70.9 83.3Q80.2 83.3 92.6 82.6Q90.8 85.7 89.9 90.2Q79.1 90.5 73.6 90.5Q51.5 90.5 41.7 86.8Q31.9 83.0 25.5 73.5Q21.6 83.6 12.8 93.8L8.2 88.2Q20.6 74.5 23.9 51.7L30.7 53.3Q29.5 61.0 27.9 66.5Q34.2 77.9 45.9 81.1V45.1H26.1V49.3H19.0V13.8H79.9V49.3H72.8V45.1H52.9V59.0H84.1V65.1H52.9ZM26.1 20.0V39.0H72.8V20.0Z',
  '力': 'M51.0 27.5H86.1Q85.6 67.7 82.8 81.0Q80.9 89.8 71.1 89.8Q63.8 89.8 53.3 88.5L52.1 80.1Q61.8 82.4 68.2 82.4Q74.6 82.4 75.6 77.2Q77.9 63.8 78.4 37.0L78.5 33.9H50.8Q50.0 53.5 42.6 67.2Q34.5 81.9 14.8 92.6L9.5 86.4Q42.2 72.0 43.2 34.8H11.3V28.3H43.3V9.5H51.0Z',
  '人': 'M53.1 10.5V16.8Q53.1 39.6 62.2 55.5Q71.5 71.5 91.7 82.2L86.0 89.3Q66.8 77.6 56.1 58.5Q52.4 52.0 49.9 41.5Q43.9 74.9 14.0 91.2L8.3 84.9Q29.5 75.0 38.1 56.9Q45.3 42.2 45.3 17.2V10.5Z',
  '男': 'M51.2 47.9V56.4H86.3Q84.9 80.1 83.3 84.8Q81.2 91.3 71.7 91.3Q64.1 91.3 55.0 90.5L53.9 83.3Q63.2 84.8 70.3 84.8Q75.7 84.8 76.8 80.5Q78.3 75.0 79.0 62.6H50.6Q48.6 74.8 39.8 82.1Q31.2 89.3 15.6 93.4L11.1 87.3Q41.0 80.0 43.4 63.3H11.4V57.2H44.1V47.9H17.6V12.0H81.3V47.9ZM24.3 17.6V27.1H45.8V17.6ZM24.3 32.5V42.4H45.8V32.5ZM74.5 42.4V32.5H52.4V42.4ZM74.5 27.1V17.6H52.4V27.1Z',
  '女': 'M29.6 61.6Q28.8 63.2 25.6 68.9L19.0 66.1Q27.7 50.3 32.9 37.6H8.9V31.1H35.4Q39.6 20.4 42.6 8.8L49.9 10.5Q46.3 23.1 43.2 31.1H90.0V37.6H73.7Q73.6 37.8 73.6 38.2Q70.0 56.4 60.7 68.9Q73.8 75.4 88.3 83.8L82.4 90.3Q70.7 82.4 55.9 74.3Q41.6 87.1 13.5 91.3L9.5 84.8Q36.2 81.5 49.4 71.0Q41.7 66.9 31.7 62.4ZM32.4 56.0 35.0 57.2Q45.7 61.6 54.3 65.9Q54.5 65.5 54.7 65.3Q62.2 55.6 66.1 38.4L66.3 37.6H40.7Q37.2 46.5 32.4 56.0Z',
  '子': 'M53.7 37.6V48.0H90.4V54.6H54.2V83.3Q54.2 87.2 52.8 88.9Q51.1 91.2 45.0 91.2Q40.1 91.2 30.7 90.4L29.3 82.4Q37.7 83.6 43.0 83.6Q46.9 83.6 46.9 80.1V54.6H8.5V48.0H46.3V34.3Q58.2 29.0 69.0 21.2H18.3V14.8H78.6L82.8 19.2Q68.4 29.8 53.7 37.6Z',
  '王': 'M52.8 23.4V46.4H81.5V52.8H52.8V79.2H89.6V85.8H9.4V79.2H45.4V52.8H17.5V46.4H45.4V23.4H12.7V16.9H86.2V23.4Z',
  '名': 'M41.6 55.1H84.8V92.8H77.7V88.2H38.4V93.0H31.3V60.7Q21.0 66.0 12.4 69.2L7.6 63.5Q28.2 57.2 44.2 46.0Q37.5 38.8 31.2 34.1Q24.2 40.2 15.7 44.8L10.8 39.7Q33.0 28.4 44.5 7.3L51.3 8.9Q50.4 10.5 46.9 16.0H76.1L80.1 19.5Q62.5 43.1 41.6 55.1ZM38.4 61.0V82.3H77.7V61.0ZM49.7 41.8Q62.5 31.2 69.4 21.9H42.7Q40.0 25.3 35.7 29.9Q44.2 36.1 49.7 41.8Z',
  '町': 'M50.1 12.5V22.1H92.0V28.5H74.9V85.1Q74.9 89.0 73.4 90.7Q71.7 92.7 66.3 92.7Q60.9 92.7 54.0 92.2L52.6 84.7Q59.8 85.6 64.4 85.6Q67.8 85.6 67.8 82.1V28.5H50.1V73.7H16.8V81.3H10.4V12.5ZM16.8 18.2V39.5H27.0V18.2ZM16.8 45.1V67.9H27.0V45.1ZM43.7 67.9V45.1H33.1V67.9ZM43.7 39.5V18.2H33.1V39.5Z',
  '村': 'M25.5 46.2Q20.2 62.4 10.9 75.4L6.3 69.0Q18.4 54.1 24.0 33.6H8.8V27.3H25.5V8.1H32.2V27.3H44.6V33.6H32.2V43.0Q32.3 43.1 32.5 43.3Q33.1 43.8 33.4 44.0Q41.6 50.4 47.8 57.4L43.3 63.9Q37.9 56.5 32.2 50.5V93.0H25.5ZM71.9 27.3V8.6H78.8V27.3H91.7V33.7H79.3V84.3Q79.3 91.8 70.2 91.8Q64.1 91.8 57.0 91.0L55.9 83.9Q63.7 84.9 69.2 84.9Q72.3 84.9 72.3 81.9V33.7H46.9V27.3ZM59.1 67.3Q54.2 55.2 47.6 45.6L53.3 42.1Q60.0 51.2 65.4 63.2Z',
  '校': 'M61.4 71.7Q54.9 63.6 50.7 51.6L55.9 48.6Q59.8 59.8 65.4 66.6Q70.8 58.1 73.2 46.3L79.2 48.8Q76.5 60.8 69.7 71.1Q79.0 79.7 92.8 85.3L88.3 91.8Q75.3 85.3 66.0 76.1Q55.3 87.5 41.6 93.2L37.4 87.6Q51.4 82.6 61.4 71.7ZM20.9 47.0Q15.9 63.6 9.2 74.6L5.2 67.7Q15.2 53.4 20.1 33.4H7.2V27.4H20.9V7.2H27.4V27.4H39.2V33.4H27.4V44.4Q34.6 50.7 40.7 58.0L37.0 64.8Q32.6 58.0 27.4 51.7V93.0H20.9ZM68.4 22.8H91.6V28.8H39.5V22.8H61.7V7.1H68.4ZM86.8 55.0Q79.2 43.8 69.4 34.0L74.4 30.8Q84.2 39.7 92.0 50.2ZM39.3 51.3Q48.5 43.9 53.5 31.5L59.4 33.9Q54.2 46.3 43.4 56.6Z',
  '学': 'M27.2 25.9 26.9 25.3Q24.5 19.0 20.3 12.3L26.8 9.5Q30.8 14.8 34.6 23.4L28.0 25.9H60.5Q66.8 17.2 71.2 8.2L78.4 11.5Q73.7 19.3 68.5 25.9H88.3V46.4H81.4V31.8H17.7V46.4H10.9V25.9ZM53.1 58.2V61.7H92.5V67.8H53.6V85.0Q53.6 92.7 44.0 92.7Q36.4 92.7 29.7 91.8L28.3 84.4Q35.7 86.0 42.7 86.0Q46.4 86.0 46.4 82.4V67.8H6.5V61.7H46.0V54.8L46.5 54.6Q54.9 51.4 63.2 46.4H23.6V40.4H72.7L76.6 44.2Q66.5 51.9 53.1 58.2ZM46.8 25.6Q44.0 17.5 40.1 11.0L46.6 8.3Q50.6 14.4 54.0 22.9Z',
  '字': 'M52.8 20.1H88.0V39.4H80.8V26.2H18.0V39.4H10.9V20.1H45.5V7.0H52.8ZM53.4 53.5V58.4H91.5V64.6H53.9V86.3Q53.9 90.4 51.9 91.9Q50.1 93.2 45.7 93.2Q39.8 93.2 32.5 92.5L31.3 85.4Q39.6 86.5 44.0 86.5Q46.7 86.5 46.7 84.2V64.6H7.5V58.4H46.3V50.4Q55.5 46.8 63.0 41.7H22.8V35.4H73.6L76.8 38.8Q64.7 48.3 53.4 53.5Z',
  '文': 'M25.0 32.5H8.5V26.3H45.5V9.1H52.8V26.3H90.5V32.5H72.5Q67.0 54.0 55.2 67.4Q68.7 77.6 90.1 83.3L84.7 90.5Q63.5 83.6 50.2 72.2Q34.8 85.5 13.6 92.1L8.5 85.0Q31.7 79.4 45.2 67.6Q32.0 54.1 25.0 32.5ZM32.2 32.5Q38.5 51.3 50.0 62.7Q60.4 50.7 64.8 32.5Z',
  '本': 'M55.1 34.6Q68.8 57.9 92.1 70.7L86.8 77.4Q63.6 62.2 52.6 40.3V67.8H68.4V74.0H52.8V92.5H45.6V74.0H30.1V67.8H45.8V41.0Q35.8 63.8 13.0 80.3L7.4 74.5Q30.4 60.9 43.3 34.6H8.9V28.1H45.6V8.6H52.8V28.1H90.1V34.6Z',
  '車': 'M45.8 31.2V24.3H10.8V18.4H45.8V7.0H52.5V18.4H88.1V24.3H52.5V31.2H81.2V63.6H52.5V71.1H91.0V77.1H52.5V93.0H45.8V77.1H7.9V71.1H45.8V63.6H17.7V31.2ZM45.9 36.9H24.2V44.5H45.9ZM52.3 36.9V44.5H74.6V36.9ZM45.9 49.9H24.2V57.9H45.9ZM52.3 49.9V57.9H74.6V49.9Z',
  '金': 'M52.8 42.0V53.4H85.3V59.5H52.8V83.5H90.1V89.7H8.8V83.5H45.7V59.5H13.7V53.4H45.7V42.0H28.8V37.9Q20.5 44.4 11.1 49.5L6.7 43.7Q31.6 31.9 44.7 8.2H53.0Q68.9 29.7 92.8 40.7L87.9 47.3Q79.6 42.5 72.0 37.2V42.0ZM70.5 36.0Q58.1 26.8 49.0 14.6Q42.6 26.0 31.1 36.0ZM29.1 81.9Q26.6 73.2 21.8 64.6L28.3 61.8Q32.2 68.0 36.6 79.2ZM62.1 79.8Q67.4 70.7 70.7 61.0L78.0 63.8Q74.3 72.8 68.7 82.1Z',
  '玉': 'M52.7 23.5V45.6H82.6V52.0H52.7V79.2H89.5V85.8H9.4V79.2H45.2V52.0H16.6V45.6H45.2V23.5H12.7V16.9H86.2V23.5ZM71.7 75.5Q65.2 65.6 59.3 60.5L64.7 56.3Q71.2 61.8 77.5 70.7Z',
  '糸': 'M45.8 49.8 54.3 49.6Q61.9 49.4 76.3 48.7Q71.8 43.3 67.6 38.9L72.9 35.0Q82.5 44.3 91.2 55.9L85.3 61.0Q82.6 56.8 80.5 54.0L79.0 54.2Q62.6 55.7 52.4 56.0V93.0H45.0V56.4L32.8 57.0Q30.0 57.1 23.0 57.3Q16.4 57.5 12.3 57.7L9.4 50.3Q18.5 50.3 23.5 50.2L35.8 50.1L37.4 48.7L39.2 47.2L40.9 45.7Q31.4 35.6 18.4 26.2L23.2 21.1Q27.3 24.3 31.6 27.7Q40.5 18.4 47.7 7.1L54.5 11.4Q47.5 20.6 36.5 32.0Q43.4 38.2 46.1 41.0Q59.4 28.6 68.1 17.6L74.6 22.1Q60.6 37.6 46.5 49.3ZM9.6 85.1Q21.2 74.7 28.1 61.9L34.8 65.3Q26.4 80.1 15.7 90.5ZM83.9 87.6Q72.8 74.1 61.6 64.0L67.2 59.7Q79.4 69.7 90.0 81.8Z',
  '上': 'M50.4 36.1H83.4V42.9H50.4V78.0H91.2V84.8H7.5V78.0H43.1V10.9H50.4Z',
  '下': 'M51.0 21.9V37.2Q67.1 44.5 86.3 57.2L80.6 63.2Q67.5 53.3 51.0 44.3V93.0H43.6V21.9H9.4V15.2H89.5V21.9Z',
  '左': 'M38.4 24.4Q40.4 16.3 41.5 8.0L48.5 8.5Q47.0 18.0 45.4 24.4H89.1V30.9H43.7Q40.4 41.9 36.2 50.0H82.5V56.2H59.9V81.8H90.5V88.2H23.4V81.8H52.8V56.2H32.7Q22.9 72.1 11.3 81.0L6.3 75.6Q28.0 59.5 36.6 30.9H9.9V24.4Z',
  '右': 'M35.3 50.4H82.8V92.1H75.7V86.3H37.0V92.1H29.9V58.4Q21.4 69.4 11.5 76.5L6.9 71.0Q27.7 55.7 37.0 30.8H9.7V24.4H39.1Q41.4 17.2 43.0 8.0L50.3 8.6Q49.0 15.1 46.5 24.4H90.0V30.8H44.4Q40.3 42.6 35.3 50.4ZM37.0 56.6V80.0H75.7V56.6Z',
  '中': 'M45.4 27.4V8.6H52.8V27.4H85.5V69.6H78.2V62.6H52.8V93.0H45.4V62.6H20.6V70.0H13.3V27.4ZM20.6 33.6V56.3H45.4V33.6ZM78.2 56.3V33.6H52.8V56.3Z',
  '大': 'M54.4 38.8Q63.7 68.5 91.4 82.2L86.0 89.1Q59.8 73.9 50.4 46.3Q44.9 76.7 14.7 91.5L9.4 84.9Q26.8 78.5 36.7 63.4Q43.3 53.2 45.0 38.8H8.9V32.2H45.4V9.4H52.9V32.2H90.1V38.8Z',
  '小': 'M45.7 11.6H53.2V81.0Q53.2 85.7 51.3 87.7Q49.2 89.8 42.9 89.8Q37.3 89.8 30.5 89.3L29.0 81.6Q35.3 82.8 41.9 82.8Q45.7 82.8 45.7 79.3ZM83.1 71.0Q75.3 48.8 64.0 30.8L70.4 27.9Q82.3 46.8 90.5 67.2ZM8.2 67.5Q20.2 53.0 24.9 30.1L32.2 32.0Q26.7 57.4 14.0 73.0Z',
  '先': 'M29.4 25.2H46.4V7.1H53.7V25.2H84.3V31.4H53.7V47.8H90.5V54.0H63.7V80.8Q63.7 83.2 65.4 83.8Q67.1 84.3 72.3 84.3Q79.0 84.3 80.7 83.7Q83.0 82.8 83.6 79.7Q84.4 75.2 84.5 69.5L91.5 71.9Q90.8 85.2 88.4 88.2Q85.6 91.3 71.8 91.3Q63.0 91.3 59.9 90.0Q56.9 88.5 56.9 84.1V54.0H41.9Q41.9 54.5 41.9 54.8Q41.6 70.0 35.3 78.6Q28.3 88.4 13.9 93.5L9.0 87.5Q24.3 83.1 30.1 74.0Q34.5 67.0 34.9 54.0H8.3V47.8H46.4V31.4H26.9Q23.4 39.2 18.6 45.6L13.0 40.9Q22.1 29.6 25.9 12.1L32.9 13.7Q30.9 21.0 29.4 25.2Z',
  '立': 'M52.8 25.9H87.5V32.3H11.3V25.9H45.4V10.0H52.8ZM55.0 79.5Q55.1 79.2 55.4 78.3Q55.6 77.7 55.8 77.3Q62.4 59.1 67.3 34.9L74.8 36.7Q69.2 60.7 62.5 79.5H91.4V85.9H7.4V79.5ZM32.3 76.2Q28.5 56.4 22.1 39.0L29.2 36.7Q35.3 53.8 39.7 74.2Z',
  '入': 'M50.7 40.4Q43.7 77.1 14.0 91.3L8.4 85.0Q45.5 69.1 46.5 18.4H23.7V11.9H54.4V15.8Q54.4 40.8 63.2 55.9Q72.4 71.8 91.6 82.2L86.1 89.3Q56.9 70.8 50.7 40.4Z',
  '出': 'M52.8 42.2H75.3V19.2H82.3V53.5H75.3V48.4H52.8V80.6H79.3V59.3H86.1V93.0H79.3V86.8H19.7V93.0H12.8V59.3H19.7V80.6H45.6V48.4H23.5V53.5H16.6V19.2H23.5V42.2H45.6V9.5H52.8Z',
  '見': 'M62.2 62.0V80.3Q62.2 83.5 63.8 84.2Q65.3 84.9 70.3 84.9Q79.4 84.9 80.9 82.3Q81.9 80.5 82.4 71.0L82.5 69.4L89.5 71.9Q88.8 85.2 86.2 88.3Q83.5 91.4 69.9 91.4Q62.0 91.4 59.3 90.4Q55.2 88.8 55.2 83.6V62.0H42.3Q41.5 76.9 34.8 83.4Q27.7 90.2 13.0 93.3L9.4 86.9Q24.1 84.3 29.9 78.7Q34.8 73.9 35.3 62.0H20.9V10.9H77.9V62.0ZM27.8 16.9V26.0H71.0V16.9ZM27.8 31.8V40.9H71.0V31.8ZM27.8 46.6V56.1H71.0V46.6Z',
  '休': 'M64.8 36.3Q72.5 58.4 91.9 74.4L86.3 80.6Q70.9 65.2 63.5 46.5V93.0H56.7V47.1Q50.5 67.1 33.9 82.2L28.5 76.2Q46.3 62.9 55.2 36.3H32.5V30.1H56.7V8.9H63.5V30.1H89.4V36.3ZM26.3 31.5V93.0H19.3V45.3Q15.5 51.6 10.3 58.5L6.4 52.7Q20.3 34.6 26.4 9.0L33.5 10.7Q30.4 22.0 26.3 31.5Z',
  '早': 'M52.8 53.3V65.8H92.0V72.0H52.8V93.0H45.5V72.0H6.9V65.8H45.5V53.3H25.6V58.2H18.6V12.9H80.4V57.8H73.4V53.3ZM25.6 19.0V30.1H73.4V19.0ZM25.6 35.8V47.3H73.4V35.8Z',
  '正': 'M54.7 80.2H90.0V86.8H8.9V80.2H23.2V38.1H30.6V80.2H47.4V22.3H12.9V15.8H86.2V22.3H54.7V46.5H81.6V52.9H54.7Z',
  '音': 'M52.8 18.0H85.7V23.8H71.4L71.2 24.5Q68.4 32.1 64.7 39.4H90.5V45.3H8.4V39.4H33.7Q30.9 30.9 27.2 23.8H13.1V18.0H45.5V7.0H52.8ZM34.6 23.8Q37.5 29.9 40.9 39.4H57.6Q60.7 33.4 63.7 24.4L63.9 23.8ZM77.5 52.2V93.0H70.6V88.6H28.3V93.2H21.3V52.2ZM28.3 58.0V67.0H70.6V58.0ZM28.3 72.7V82.9H70.6V72.7Z',
  '円': 'M85.2 14.6V81.6Q85.2 85.8 83.7 87.8Q81.8 90.4 75.8 90.4Q68.4 90.4 59.9 89.7L58.6 82.2Q67.2 83.3 74.0 83.3Q77.9 83.3 77.9 79.9V54.7H20.8V91.7H13.6V14.6ZM20.8 21.2V48.3H45.7V21.2ZM77.9 48.3V21.2H52.7V48.3Z',
  '赤': 'M62.3 44.5V84.9Q62.3 89.1 60.6 91.0Q58.9 92.9 54.4 92.9Q48.7 92.9 43.7 92.2L42.5 84.9Q47.3 86.2 52.3 86.2Q55.4 86.2 55.4 83.4V44.5H43.9V51.9Q43.9 66.6 39.9 75.9Q35.2 87.1 22.8 94.1L18.0 88.3Q29.2 82.9 33.7 72.6Q36.9 65.0 36.9 51.9V44.5H8.5V38.4H45.6V26.8H17.0V20.9H45.6V7.0H52.8V20.9H81.8V26.8H52.8V38.4H90.4V44.5ZM9.6 75.7Q18.9 66.0 23.0 51.3L29.7 53.1Q24.9 69.6 15.1 80.8ZM81.7 80.8Q75.3 65.7 66.7 53.9L72.7 50.5Q82.0 62.6 88.7 76.3Z',
  '青': 'M45.7 16.5V7.0H52.7V16.5H87.2V22.0H52.7V27.4H82.9V32.6H52.7V38.5H92.0V44.0H6.9V38.5H45.7V32.6H16.0V27.4H45.7V22.0H11.6V16.5ZM78.1 49.3V85.0Q78.1 88.6 76.5 90.2Q74.7 92.1 69.0 92.1Q62.6 92.1 55.6 91.5L54.5 84.6Q61.8 85.9 67.6 85.9Q71.3 85.9 71.3 82.2V77.1H28.2V93.0H21.4V49.3ZM28.2 54.7V60.5H71.3V54.7ZM28.2 65.7V71.8H71.3V65.7Z',
  '白': 'M39.6 23.0Q42.1 15.7 43.7 8.1L52.1 10.0Q50.0 17.0 47.1 23.0H81.8V91.6H74.4V85.7H24.4V91.6H17.1V23.0ZM24.4 29.4V50.2H74.4V29.4ZM24.4 56.7V79.2H74.4V56.7Z'
};
