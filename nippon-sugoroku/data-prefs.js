/* にっぽん一周すごろく - 47都道府県データ
 * lat/lon は実際の県庁所在地のおおよその位置。game.js で画面座標に変換する。
 * mapLat を持つ県は、地図の見た目を整えるため表示位置だけをずらす（沖縄）。
 * shops は [おみせの なまえ, ねだん]。しゅうえきは game.js で ねだんから けいさんする。
 */
const REGIONS = {
  hokkaido: { label: 'ほっかいどう', color: '#4f9dd9' },
  tohoku:   { label: 'とうほく',     color: '#5fb3a1' },
  kanto:    { label: 'かんとう',     color: '#e8894a' },
  chubu:    { label: 'ちゅうぶ',     color: '#7d9f4a' },
  kinki:    { label: 'きんき',       color: '#c96b8e' },
  chugoku:  { label: 'ちゅうごく',   color: '#8a7bc8' },
  shikoku:  { label: 'しこく',       color: '#d9a441' },
  kyushu:   { label: 'きゅうしゅう', color: '#d9645e' },
};

const PREFS = [
  { id:'hokkaido', name:'北海道', kana:'ほっかいどう', capital:'さっぽろ', region:'hokkaido',
    lat:43.06, lon:141.35, adj:['aomori'],
    trivia:'にほんで いちばん ひろい。ふゆの さっぽろ ゆきまつりには おおきな ゆきの ぞうが ならぶよ。',
    quiz:{ q:'ほっかいどうで たくさん とれる やさいは？', a:['じゃがいも','さとうきび','みかん'], c:0 },
    shops:[['ラーメンやたい',400],['ひろい ぼくじょう',800]] },

  { id:'aomori', name:'青森県', kana:'あおもり', capital:'あおもり', region:'tohoku',
    lat:40.82, lon:140.74, adj:['hokkaido','iwate','akita'],
    trivia:'りんごの しゅうかくが にほんいち。なつの ねぶたまつりでは おおきな にんぎょうの やまが うごくよ。',
    quiz:{ q:'あおもりけんの しゅうかくが にほんいちの くだものは？', a:['りんご','バナナ','ぶどう'], c:0 },
    shops:[['りんごえん',450],['ねぶたの みせ',350]] },

  { id:'iwate', name:'岩手県', kana:'いわて', capital:'もりおか', region:'tohoku',
    lat:39.70, lon:141.15, adj:['aomori','akita','miyagi'],
    trivia:'とうほくで いちばん ひろい けん。おわんで つぎつぎ たべる わんこそばが ゆうめい。',
    quiz:{ q:'いわてけんの ちいさな おわんで つぎつぎ たべる めんは？', a:['わんこそば','ラーメン','うどん'], c:0 },
    shops:[['わんこそばや',380],['なんぶてっきの みせ',420]] },

  { id:'miyagi', name:'宮城県', kana:'みやぎ', capital:'せんだい', region:'tohoku',
    lat:38.27, lon:140.87, adj:['iwate','akita','yamagata','fukushima'],
    trivia:'うみに ちいさな しまが たくさん うかぶ「まつしま」は、にほんさんけいの ひとつだよ。',
    quiz:{ q:'みやぎけんの ちいさな しまが たくさん ある けしきは？', a:['まつしま','あわじしま','さどがしま'], c:0 },
    shops:[['ぎゅうたんや',480],['ずんだもちや',330]] },

  { id:'akita', name:'秋田県', kana:'あきた', capital:'あきた', region:'tohoku',
    lat:39.72, lon:140.10, adj:['aomori','iwate','miyagi','yamagata'],
    trivia:'おおみそかに「わるいこは いねがー」と なまはげが いえを まわる ぎょうじが あるよ。',
    quiz:{ q:'あきたけんの おにの ような すがたの かみさまは？', a:['なまはげ','てんぐ','かっぱ'], c:0 },
    shops:[['きりたんぽや',360],['あきたこまちの たんぼ',520]] },

  { id:'yamagata', name:'山形県', kana:'やまがた', capital:'やまがた', region:'tohoku',
    lat:38.24, lon:140.36, adj:['akita','miyagi','fukushima','niigata'],
    trivia:'さくらんぼの しゅうかくが にほんいち。ぎんざんおんせんの よるは ガスとうが ぽっと ともるよ。',
    quiz:{ q:'やまがたけんの しゅうかくが にほんいちの くだものは？', a:['さくらんぼ','いちご','もも'], c:0 },
    shops:[['さくらんぼえん',470],['いもにやさん',300]] },

  { id:'fukushima', name:'福島県', kana:'ふくしま', capital:'ふくしま', region:'tohoku',
    lat:37.75, lon:140.47, adj:['miyagi','yamagata','niigata','gunma','tochigi','ibaraki'],
    trivia:'くびを ゆらゆら ふる あかい うしの おもちゃ「あかべこ」が ゆうめい。ももも たくさん とれるよ。',
    quiz:{ q:'ふくしまけんの くびを ふる あかい うしの おもちゃは？', a:['あかべこ','こけし','だるま'], c:0 },
    shops:[['ももえん',430],['あかべここうぼう',340]] },

  { id:'ibaraki', name:'茨城県', kana:'いばらき', capital:'みと', region:'kanto',
    lat:36.34, lon:140.45, adj:['fukushima','tochigi','saitama','chiba'],
    trivia:'ねばねばの なっとうの まち。かいらくえんには 3000ぼんもの うめの きが あるよ。',
    quiz:{ q:'いばらきけんの みとで ゆうめいな ねばねばの たべものは？', a:['なっとう','とうふ','こんにゃく'], c:0 },
    shops:[['なっとうこうじょう',390],['メロンばたけ',450]] },

  { id:'tochigi', name:'栃木県', kana:'とちぎ', capital:'うつのみや', region:'kanto',
    lat:36.57, lon:139.88, adj:['fukushima','ibaraki','gunma','saitama'],
    trivia:'にっこうとうしょうぐうには「みざる・きかざる・いわざる」の さんびきの さるが ほられているよ。',
    quiz:{ q:'とちぎけんの にっこうに いる ゆうめいな さんびきの どうぶつは？', a:['さる','ねこ','いぬ'], c:0 },
    shops:[['ぎょうざや',360],['いちごがりハウス',440]] },

  { id:'gunma', name:'群馬県', kana:'ぐんま', capital:'まえばし', region:'kanto',
    lat:36.39, lon:139.06, adj:['fukushima','tochigi','saitama','nagano','niigata'],
    trivia:'くさつおんせんの おゆは あつすぎるので、おおきな いたで まぜて さます「ゆもみ」を するよ。',
    quiz:{ q:'ぐんまけんの ゆうめいな おんせんは？', a:['くさつおんせん','どうごおんせん','べっぷおんせん'], c:0 },
    shops:[['おんせんりょかん',600],['こんにゃくや',320]] },

  { id:'saitama', name:'埼玉県', kana:'さいたま', capital:'さいたま', region:'kanto',
    lat:35.86, lon:139.65, adj:['gunma','tochigi','ibaraki','chiba','tokyo','yamanashi','nagano'],
    trivia:'かわごえは「こえど」と よばれ、くろい くらの まちなみと「ときのかね」が のこっているよ。',
    quiz:{ q:'さいたまけんの「こえど」と よばれる まちは？', a:['かわごえ','かまくら','くらしき'], c:0 },
    shops:[['そうかせんべいや',330],['ぼんさいえん',420]] },

  { id:'chiba', name:'千葉県', kana:'ちば', capital:'ちば', region:'kanto',
    lat:35.60, lon:140.12, adj:['ibaraki','saitama','tokyo'],
    trivia:'らっかせいの しゅうかくが にほんいち。なりたくうこうから せかいじゅうへ ひこうきが とんでいくよ。',
    quiz:{ q:'ちばけんの しゅうかくが にほんいちの まめは？', a:['らっかせい','あずき','えだまめ'], c:0 },
    shops:[['らっかせいや',350],['くうこうの おみやげてん',560]] },

  { id:'tokyo', name:'東京都', kana:'とうきょう', capital:'とうきょう', region:'kanto',
    lat:35.69, lon:139.69, adj:['saitama','chiba','kanagawa','yamanashi'],
    trivia:'にほんの しゅと。とうきょうスカイツリーの たかさは 634メートルで、にほんで いちばん たかい とう。',
    quiz:{ q:'とうきょうスカイツリーの たかさは？', a:['634メートル','333メートル','100メートル'], c:0 },
    shops:[['もんじゃやき',500],['えきまえの ビル',900]] },

  { id:'kanagawa', name:'神奈川県', kana:'かながわ', capital:'よこはま', region:'kanto',
    lat:35.45, lon:139.64, adj:['tokyo','yamanashi','shizuoka'],
    trivia:'よこはまには おおきな ちゅうかがい。かまくらには そらの したに すわる だいぶつが いるよ。',
    quiz:{ q:'かながわけんの かまくらに ある おおきな ぞうは？', a:['だいぶつ','だいとう','だいぶね'], c:0 },
    shops:[['ちゅうかがいの みせ',620],['しゅうまいや',400]] },

  { id:'niigata', name:'新潟県', kana:'にいがた', capital:'にいがた', region:'chubu',
    lat:37.90, lon:139.02, adj:['yamagata','fukushima','gunma','nagano','toyama'],
    trivia:'おこめの しゅうかくが にほんいち。ふゆは やねより たかく ゆきが つもることも あるよ。',
    quiz:{ q:'にいがたけんの しゅうかくが にほんいちの さくもつは？', a:['おこめ','むぎ','いも'], c:0 },
    shops:[['こしひかりの たんぼ',540],['せんべいや',330]] },

  { id:'toyama', name:'富山県', kana:'とやま', capital:'とやま', region:'chubu',
    lat:36.70, lon:137.21, adj:['niigata','nagano','gifu','ishikawa'],
    trivia:'たてやまの「ゆきのおおたに」は、はるでも 10メートルを こえる ゆきの かべが たつよ。',
    quiz:{ q:'とやまけんの たてやまに はるでも のこる たかい かべは？', a:['ゆきの かべ','いわの かべ','きの かべ'], c:0 },
    shops:[['ますのすしや',380],['ほたるいかの みせ',420]] },

  { id:'ishikawa', name:'石川県', kana:'いしかわ', capital:'かなざわ', region:'chubu',
    lat:36.59, lon:136.63, adj:['toyama','gifu','fukui'],
    trivia:'かなざわの けんろくえんは にほんさんめいえんの ひとつ。うすーく のばした きんぱくづくりも さかん。',
    quiz:{ q:'いしかわけんの かなざわで ゆうめいな ぴかぴかの ものは？', a:['きんぱく','ぎんか','どうせん'], c:0 },
    shops:[['きんぱくこうぼう',560],['わじまぬりの みせ',480]] },

  { id:'fukui', name:'福井県', kana:'ふくい', capital:'ふくい', region:'chubu',
    lat:36.07, lon:136.22, adj:['ishikawa','gifu','shiga','kyoto'],
    trivia:'きょうりゅうの かせきが たくさん みつかっていて、おおきな きょうりゅうはくぶつかんが あるよ。',
    quiz:{ q:'ふくいけんで たくさん みつかる むかしの いきものの かせきは？', a:['きょうりゅう','マンモス','サメ'], c:0 },
    shops:[['きょうりゅうグッズてん',450],['えちぜんがにの みせ',520]] },

  { id:'yamanashi', name:'山梨県', kana:'やまなし', capital:'こうふ', region:'chubu',
    lat:35.66, lon:138.57, adj:['saitama','tokyo','kanagawa','shizuoka','nagano'],
    trivia:'ぶどうと ももの しゅうかくが にほんいち。しずおかけんと ふじさんを はんぶんずつ わけあっているよ。',
    quiz:{ q:'やまなしけんの しゅうかくが にほんいちの くだものは？', a:['ぶどう','りんご','みかん'], c:0 },
    shops:[['ぶどうえん',470],['ほうとうや',340]] },

  { id:'nagano', name:'長野県', kana:'ながの', capital:'ながの', region:'chubu',
    lat:36.65, lon:138.18, adj:['niigata','gunma','saitama','yamanashi','shizuoka','aichi','gifu','toyama'],
    trivia:'3000メートルきゅうの やまが ならび「にほんの やね」と よばれる。となりの けんが 8つも あるよ。',
    quiz:{ q:'たかい やまが おおい ながのけんの よびなは？', a:['にほんの やね','にほんの にわ','にほんの うみ'], c:0 },
    shops:[['そばどころ',360],['りんごえん',440]] },

  { id:'gifu', name:'岐阜県', kana:'ぎふ', capital:'ぎふ', region:'chubu',
    lat:35.39, lon:136.72, adj:['toyama','ishikawa','fukui','nagano','aichi','mie','shiga'],
    trivia:'しらかわごうの いえの やねは、りょうてを あわせた かたちに にているので「がっしょうづくり」と いうよ。',
    quiz:{ q:'ぎふけんの しらかわごうの やねの かたちの なまえは？', a:['がっしょうづくり','しんでんづくり','あぜくらづくり'], c:0 },
    shops:[['ひだぎゅうの みせ',580],['うかいの ふなやど',420]] },

  { id:'shizuoka', name:'静岡県', kana:'しずおか', capital:'しずおか', region:'chubu',
    lat:34.98, lon:138.38, adj:['kanagawa','yamanashi','nagano','aichi'],
    trivia:'ふじさんは たかさ 3776メートルで にほんいち。おちゃばたけも どこまでも つづくよ。',
    quiz:{ q:'にほんで いちばん たかい やまは？', a:['ふじさん','たかおさん','あそさん'], c:0 },
    shops:[['ちゃばたけ',500],['うなぎや',460]] },

  { id:'aichi', name:'愛知県', kana:'あいち', capital:'なごや', region:'chubu',
    lat:35.18, lon:136.91, adj:['shizuoka','nagano','gifu','mie'],
    trivia:'なごやじょうの やねには きんいろの しゃちほこ。じどうしゃづくりが にほんで いちばん さかんだよ。',
    quiz:{ q:'なごやじょうの やねに のっている きんいろの ものは？', a:['しゃちほこ','とり','りゅう'], c:0 },
    shops:[['てばさきや',400],['じどうしゃこうじょう',880]] },

  { id:'mie', name:'三重県', kana:'みえ', capital:'つ', region:'kinki',
    lat:34.73, lon:136.51, adj:['aichi','gifu','shiga','kyoto','nara','wakayama'],
    trivia:'いせじんぐうが ある けん。うみに もぐって あわびを とる「あま」さんと しんじゅが ゆうめい。',
    quiz:{ q:'みえけんの うみに もぐって かいを とる ひとを なんと よぶ？', a:['あま','せんちょう','とうだいもり'], c:0 },
    shops:[['しんじゅの みせ',640],['あかふくもちや',350]] },

  { id:'shiga', name:'滋賀県', kana:'しが', capital:'おおつ', region:'kinki',
    lat:35.00, lon:135.87, adj:['fukui','gifu','mie','kyoto'],
    trivia:'にほんで いちばん おおきな みずうみ「びわこ」が、けんの まんなかに どーんと あるよ。',
    quiz:{ q:'にほんで いちばん おおきな みずうみは？', a:['びわこ','かすみがうら','とわだこ'], c:0 },
    shops:[['びわこの ゆうらんせん',560],['しがらきやきの みせ',380]] },

  { id:'kyoto', name:'京都府', kana:'きょうと', capital:'きょうと', region:'kinki',
    lat:35.02, lon:135.76, adj:['fukui','shiga','mie','nara','osaka','hyogo'],
    trivia:'1000ねん いじょう にほんの みやこだった まち。きんかくじは きんいろに かがやいているよ。',
    quiz:{ q:'きょうとの きんいろに かがやく おてらは？', a:['きんかくじ','とうだいじ','ぜんこうじ'], c:0 },
    shops:[['まっちゃの ちゃや',540],['にしじんおりの みせ',620]] },

  { id:'osaka', name:'大阪府', kana:'おおさか', capital:'おおさか', region:'kinki',
    lat:34.69, lon:135.52, adj:['kyoto','nara','wakayama','hyogo'],
    trivia:'「くいだおれ」の まち。たこやきや おこのみやきの おみせが とても たくさん あるよ。',
    quiz:{ q:'おおさかで うまれた たこの はいった まるい たべものは？', a:['たこやき','たいやき','おはぎ'], c:0 },
    shops:[['たこやきや',420],['おおさかじょうの ばいてん',660]] },

  { id:'hyogo', name:'兵庫県', kana:'ひょうご', capital:'こうべ', region:'kinki',
    lat:34.69, lon:135.18, adj:['kyoto','osaka','tottori','okayama','tokushima'],
    trivia:'ひめじじょうは まっしろな かべから「しらさぎじょう」とも よばれる せかいいさんだよ。',
    quiz:{ q:'ひょうごけんの しろい おしろの なまえは？', a:['ひめじじょう','くまもとじょう','まつもとじょう'], c:0 },
    shops:[['こうべビーフの みせ',780],['あかしやきの みせ',360]] },

  { id:'nara', name:'奈良県', kana:'なら', capital:'なら', region:'kinki',
    lat:34.69, lon:135.83, adj:['kyoto','mie','osaka','wakayama'],
    trivia:'とうだいじの だいぶつは たかさ やく 15メートル。ならこうえんには しかが 1000とう いじょう いるよ。',
    quiz:{ q:'ならこうえんに たくさん いる どうぶつは？', a:['しか','さる','うさぎ'], c:0 },
    shops:[['しかせんべいや',300],['だいぶつまえの みせ',520]] },

  { id:'wakayama', name:'和歌山県', kana:'わかやま', capital:'わかやま', region:'kinki',
    lat:34.23, lon:135.17, adj:['mie','nara','osaka','tokushima'],
    trivia:'みかんと うめの しゅうかくが にほんいち。やまの なかの「くまのこどう」は せかいいさんの みちだよ。',
    quiz:{ q:'わかやまけんの しゅうかくが にほんいちの くだものは？', a:['みかん','なし','かき'], c:0 },
    shops:[['みかんばたけ',440],['うめぼしや',360]] },

  { id:'tottori', name:'鳥取県', kana:'とっとり', capital:'とっとり', region:'chugoku',
    lat:35.50, lon:134.24, adj:['hyogo','okayama','hiroshima','shimane'],
    trivia:'うみぞいに ひろがる とっとりさきゅうは、すなの おかが どこまでも つづく けしきだよ。',
    quiz:{ q:'とっとりけんに ある すなの おおきな おかは？', a:['さきゅう','かざん','しょうにゅうどう'], c:0 },
    shops:[['さきゅうの らくだやさん',400],['なしえん',430]] },

  { id:'shimane', name:'島根県', kana:'しまね', capital:'まつえ', region:'chugoku',
    lat:35.47, lon:133.05, adj:['tottori','hiroshima','yamaguchi'],
    trivia:'いずもたいしゃには 10がつに にほんじゅうの かみさまが あつまると いいつたえられているよ。',
    quiz:{ q:'しまねけんの かみさまが あつまると いわれる じんじゃは？', a:['いずもたいしゃ','いせじんぐう','めいじじんぐう'], c:0 },
    shops:[['いずもそばや',350],['しじみの みせ',380]] },

  { id:'okayama', name:'岡山県', kana:'おかやま', capital:'おかやま', region:'chugoku',
    lat:34.66, lon:133.93, adj:['hyogo','tottori','hiroshima','kagawa'],
    trivia:'ももたろうの おはなしが つたわる まち。しろい ももや マスカットが とても あまいよ。',
    quiz:{ q:'おかやまけんに つたわる むかしばなしの しゅじんこうは？', a:['ももたろう','うらしまたろう','きんたろう'], c:0 },
    shops:[['きびだんごや',330],['マスカットえん',520]] },

  { id:'hiroshima', name:'広島県', kana:'ひろしま', capital:'ひろしま', region:'chugoku',
    lat:34.40, lon:132.46, adj:['okayama','tottori','shimane','yamaguchi','ehime'],
    trivia:'みやじまの うみに たつ あかい とりいと、へいわを ねがう げんばくドームが あるよ。',
    quiz:{ q:'ひろしまけんの みやじまで うみに たっている あかい ものは？', a:['とりい','とうだい','はしら'], c:0 },
    shops:[['おこのみやきや',420],['かきの やたい',390]] },

  { id:'yamaguchi', name:'山口県', kana:'やまぐち', capital:'やまぐち', region:'chugoku',
    lat:34.19, lon:131.47, adj:['shimane','hiroshima','fukuoka'],
    trivia:'しものせきは ふぐの みずあげが ゆうめい。あきよしだいの ちかには おおきな しょうにゅうどうが あるよ。',
    quiz:{ q:'やまぐちけんの しものせきで ゆうめいな さかなは？', a:['ふぐ','さんま','さけ'], c:0 },
    shops:[['ふぐりょうりや',700],['ういろうの みせ',330]] },

  { id:'tokushima', name:'徳島県', kana:'とくしま', capital:'とくしま', region:'shikoku',
    lat:34.07, lon:134.56, adj:['kagawa','ehime','kochi','hyogo','wakayama'],
    trivia:'400ねん つづく あわおどりが ゆうめい。なるとかいきょうの おおきな うずしおも みどころ。',
    quiz:{ q:'とくしまけんの なつの ゆうめいな おどりは？', a:['あわおどり','よさこい','エイサー'], c:0 },
    shops:[['あわおどりかいかん',480],['すだちばたけ',340]] },

  { id:'kagawa', name:'香川県', kana:'かがわ', capital:'たかまつ', region:'shikoku',
    lat:34.34, lon:134.04, adj:['tokushima','ehime','okayama'],
    trivia:'にほんで いちばん めんせきが ちいさい けん。さぬきうどんの おみせが 500けん いじょう あるよ。',
    quiz:{ q:'にほんで いちばん めんせきが ちいさい けんは？', a:['かがわけん','おおさかふ','とうきょうと'], c:0 },
    shops:[['さぬきうどんや',330],['オリーブえん',430]] },

  { id:'ehime', name:'愛媛県', kana:'えひめ', capital:'まつやま', region:'shikoku',
    lat:33.84, lon:132.77, adj:['kagawa','tokushima','kochi','hiroshima'],
    trivia:'かんきつの しゅるいが にほんいち。どうごおんせんは にほんで いちばん ふるい おんせんの ひとつ。',
    quiz:{ q:'えひめけんの とても ふるい ゆうめいな おんせんは？', a:['どうごおんせん','くさつおんせん','ありまおんせん'], c:0 },
    shops:[['みかんジュースの みせ',390],['どうごの りょかん',620]] },

  { id:'kochi', name:'高知県', kana:'こうち', capital:'こうち', region:'shikoku',
    lat:33.56, lon:133.53, adj:['tokushima','ehime'],
    trivia:'わらの ひで さっと やく「かつおの たたき」が めいぶつ。しまんとがわは とても すきとおった かわ。',
    quiz:{ q:'こうちけんの ゆうめいな さかなりょうりは？', a:['かつおの たたき','さばの みそに','いわしの ひもの'], c:0 },
    shops:[['かつおの たたきや',450],['よさこいの みせ',360]] },

  { id:'fukuoka', name:'福岡県', kana:'ふくおか', capital:'ふくおか', region:'kyushu',
    lat:33.61, lon:130.42, adj:['yamaguchi','saga','oita','kumamoto'],
    trivia:'よるの まちに「やたい」が ならび、ラーメンや おでんを たべられるよ。めんたいこも ゆうめい。',
    quiz:{ q:'ふくおかけんの よるの みちに でる ちいさな おみせを なんと よぶ？', a:['やたい','こや','くるま'], c:0 },
    shops:[['ラーメンやたい',400],['めんたいこの みせ',470]] },

  { id:'saga', name:'佐賀県', kana:'さが', capital:'さが', region:'kyushu',
    lat:33.25, lon:130.30, adj:['fukuoka','nagasaki'],
    trivia:'ありたやきという うつくしい やきものの さんち。あきには ききゅうの たいかいが ひらかれるよ。',
    quiz:{ q:'さがけんの ゆうめいな やきものは？', a:['ありたやき','しがらきやき','びぜんやき'], c:0 },
    shops:[['ありたやきの みせ',540],['ききゅうパークの ばいてん',380]] },

  { id:'nagasaki', name:'長崎県', kana:'ながさき', capital:'ながさき', region:'kyushu',
    lat:32.74, lon:129.87, adj:['saga','kumamoto'],
    trivia:'むかし がいこくと ぼうえきを した「でじま」が あった まち。しまの かずは にほんいち。',
    quiz:{ q:'ながさきけんに むかし あった がいこくと ぼうえきを した しまは？', a:['でじま','あわじしま','さどがしま'], c:0 },
    shops:[['ちゃんぽんや',420],['カステラの みせ',450]] },

  { id:'kumamoto', name:'熊本県', kana:'くまもと', capital:'くまもと', region:'kyushu',
    lat:32.79, lon:130.74, adj:['fukuoka','oita','miyazaki','kagoshima','nagasaki'],
    trivia:'あそさんは せかいでも とくに おおきな カルデラ（かざんが つくった くぼち）を もつ やまだよ。',
    quiz:{ q:'くまもとけんに ある おおきな かざんは？', a:['あそさん','ふじさん','あさまやま'], c:0 },
    shops:[['くまもとラーメンや',400],['いぐさの たたみや',430]] },

  { id:'oita', name:'大分県', kana:'おおいた', capital:'おおいた', region:'kyushu',
    lat:33.24, lon:131.61, adj:['fukuoka','kumamoto','miyazaki'],
    trivia:'おんせんの わきでる りょうが にほんいち。べっぷの「じごくめぐり」では あおい おゆも みられるよ。',
    quiz:{ q:'おおいたけんが にほんいちなのは なに？', a:['おんせんの わきでる りょう','ゆきの りょう','さきゅうの ひろさ'], c:0 },
    shops:[['べっぷおんせん りょかん',680],['とりてんの みせ',340]] },

  { id:'miyazaki', name:'宮崎県', kana:'みやざき', capital:'みやざき', region:'kyushu',
    lat:31.91, lon:131.42, adj:['oita','kumamoto','kagoshima'],
    trivia:'あたたかくて やしのきが そだつ みなみの けん。マンゴーと じどりの すみやきが ゆうめい。',
    quiz:{ q:'みやざきけんの あまい みなみの くだものは？', a:['マンゴー','りんご','さくらんぼ'], c:0 },
    shops:[['マンゴーえん',560],['じどりやきの みせ',380]] },

  { id:'kagoshima', name:'鹿児島県', kana:'かごしま', capital:'かごしま', region:'kyushu',
    lat:31.56, lon:130.56, adj:['kumamoto','miyazaki','okinawa'],
    trivia:'さくらじまは いまも けむりを あげる かざん。やくしまには 1000ねんを こえる すぎの きが あるよ。',
    quiz:{ q:'かごしまけんの いまも けむりを あげる かざんは？', a:['さくらじま','あそさん','うんぜんだけ'], c:0 },
    shops:[['さつまあげの みせ',390],['しろくまアイスや',350]] },

  { id:'okinawa', name:'沖縄県', kana:'おきなわ', capital:'なは', region:'kyushu',
    lat:26.21, lon:127.68, adj:['kagoshima'],
    trivia:'いちねんじゅう あたたかく うみが とても きれい。しゅりじょうと たいこの おどり エイサーが ゆうめい。',
    quiz:{ q:'おきなわけんの たいこを たたく ゆうめいな おどりは？', a:['エイサー','あわおどり','ぼんおどり'], c:0 },
    shops:[['ちんすこうの みせ',350],['ビーチの マリンショップ',600]] },
];

/* 地図の見た目を整えるための「表示だけ」の位置調整。
 * 実際の県庁所在地が近すぎて丸が重なってしまう県だけ、東西南北の関係を変えない
 * 範囲でずらしている。値は [表示用の経度, 表示用の緯度]。
 * 沖縄県だけは離れすぎるので、九州の南西に寄せて表示する（地図の注記で断り書きを出す）。
 */
const MAP_ADJUST = {
  miyagi:[141.10,38.35], yamagata:[140.20,38.10], fukushima:[140.60,37.35],
  ibaraki:[140.85,36.35], tochigi:[139.95,36.75], gunma:[138.95,36.55],
  saitama:[139.35,35.95], chiba:[140.75,35.45], tokyo:[139.62,35.20],
  kanagawa:[138.95,34.80], shizuoka:[138.20,34.55], aichi:[137.20,35.10],
  gifu:[136.65,36.00], ishikawa:[136.35,36.95], fukui:[135.75,36.35],
  mie:[136.95,34.40], shiga:[136.35,35.35], kyoto:[135.55,35.35],
  nara:[136.10,34.45], osaka:[135.35,34.60], hyogo:[134.75,34.95],
  wakayama:[135.30,33.85], kagawa:[134.10,33.60], tokushima:[134.90,33.30],
  ehime:[132.95,33.20], kochi:[133.90,32.75], saga:[129.80,33.05],
  nagasaki:[129.35,32.55], okinawa:[127.68,30.15],
};
PREFS.forEach(p => { const a = MAP_ADJUST[p.id]; if (a) { p.mapLon = a[0]; p.mapLat = a[1]; } });

/* 海をわたる（フェリー・橋・飛行機）つながり。地図では点線で描く */
const SEA_LINKS = new Set([
  'aomori|hokkaido', 'hyogo|tokushima', 'tokushima|wakayama',
  'kagawa|okayama', 'ehime|hiroshima', 'kumamoto|nagasaki', 'kagoshima|okinawa',
]);
