// しんかい たんけん: いきもの・ゾーン・ミッション の データ
// ふりがな は 「漢字{かんじ}」 と かく（index.html で <ruby> に かわる）。
// ふかさ・大きさ の 出典 は README.md の「出典」を 見て ね。たしか で ない かず は「やく」。
// min/max は ゲーム の なか で 出て くる ふかさ（m）。range は ずかん に のせる ふかさ の せつめい。
(function (root) {
  "use strict";

  // 海溝 の そこ（マリアナ海溝 チャレンジャー海淵 を モデル に した ふかさ）
  var BOTTOM = 10920;

  var ZONES = [
    { id: "hyoso", name: "ひょうそう", kanji: "表層{ひょうそう}", from: 0, to: 200, color: "#4dabf7",
      desc: "たいよう の ひかり が とどく あかるい うみ。" },
    { id: "twilight", name: "トワイライトゾーン", kanji: "トワイライトゾーン", from: 200, to: 1000, color: "#3b5bdb",
      desc: "ひかり が ほんの すこし だけ とどく うすぐらい うみ。200m より ふかい ところ を「深海{しんかい}」と よぶ ことが おおい。" },
    { id: "shinkai", name: "しんかい", kanji: "深海{しんかい}", from: 1000, to: 6000, color: "#24357a", pill: "#364fc7",
      desc: "たいよう の ひかり が まったく とどかない まっくら な うみ。水温{すいおん} は 5℃ より ひくい。" },
    { id: "chou", name: "ちょうしんかい", kanji: "超深海{ちょうしんかい}", from: 6000, to: 10000, color: "#1a1250", pill: "#5f3dc4",
      desc: "6000m より ふかい、海溝{かいこう} の なか の せかい。" },
    { id: "soko", name: "かいこう の そこ", kanji: "海溝{かいこう} の そこ", from: 10000, to: 11000, color: "#0b0726", pill: "#862e9c",
      desc: "ちきゅう で いちばん ふかい ところ の ちかく。マリアナ海溝{かいこう} の いちばん ふかい ところ は やく 1万{まん}900m。" }
  ];

  // 熱水{ねっすい} の でる ところ（x は ゲーム の よこ の いち）
  var VENTS = [
    { id: "v1", x: 1100, depth: 1200, name: "ねっすい の でる ところ（おきなわトラフ ふう）" },
    { id: "v2", x: 1950, depth: 2600, name: "ねっすい の でる ところ（インドよう ふう）" }
  ];

  // くらべる もの（メーター に さかさま に して ならべる）
  var COMPARE = [
    { id: "tree", name: "スカイツリー", depth: 634, label: "とうきょう スカイツリー 634m" },
    { id: "fuji", name: "ふじさん", depth: 3776, label: "ふじさん 3776m（さかさま）" },
    { id: "s6500", name: "しんかい6500", depth: 6500, label: "しんかい6500 が もぐれる 6500m" },
    { id: "everest", name: "エベレスト", depth: 8849, label: "エベレスト 8849m（さかさま）" },
    { id: "mariana", name: "マリアナかいこう", depth: BOTTOM, label: "マリアナ海溝{かいこう} やく 1万{まん}900m" }
  ];

  // しゅるい:
  //  zone   … ずかん で ならべる ゾーン
  //  glow   … ひかる（はっこう する）
  //  bottom … うみ の そこ に いる / near … そこ の ちかく を およぐ / vent … ねっすい の まわり
  //  w      … 出やすさ / px … えがく 大きさ / sp … およぐ はやさ（m/びょう）
  var SPECIES = [
    // ---- 表層 ----
    { id: "iwashi", name: "マイワシ", zone: "hyoso", min: 0, max: 200, w: 3, px: 96, sp: 6, draw: "school",
      range: "うみ の あさい ところ（やく 0〜200m）", size: "やく 20cm",
      note: "たくさん あつまって「むれ」で およぐ。せなか は あお、おなか は ぎんいろ で、てき から 見{み}つかりにくい。" },
    { id: "mizukurage", name: "ミズクラゲ", zone: "hyoso", min: 0, max: 80, w: 2, px: 70, sp: 0.6, draw: "jelly",
      range: "うみ の あさい ところ", size: "かさ やく 15〜30cm",
      note: "かさ に 4つ の わっか もよう が すけて 見{み}える。なみ に ながされて ふわふわ くらす。" },
    { id: "umigame", name: "アカウミガメ", zone: "hyoso", min: 0, max: 200, w: 1.2, px: 110, sp: 3, draw: "turtle",
      range: "うみ の あさい ところ（やく 200m くらい まで もぐる ことも）", size: "こうら やく 70〜100cm",
      note: "日本{にほん} の すなはま に たまご を うみ に くる。いき を する ため に ときどき うみ の 上{うえ} に でる。" },
    { id: "manbou", name: "マンボウ", zone: "hyoso", min: 0, max: 480, w: 1, px: 130, sp: 1.5, draw: "sunfish",
      range: "やく 0〜480m", size: "やく 1〜3m",
      note: "しっぽ が なく、せびれ と しりびれ を パタパタ うごかして およぐ。ふかく もぐって クラゲ など を たべる。" },
    { id: "katsuo", name: "カツオ", zone: "hyoso", min: 0, max: 260, w: 1.5, px: 92, sp: 9, draw: "fish",
      c: { body: "#2b4a7a", belly: "#dfe7ef", fin: "#24406a", stripe: "#5d6f8a" }, opt: { stripes: true, fork: true },
      range: "やく 0〜260m", size: "やく 50cm〜1m",
      note: "あたたかい うみ を むれ で たび する。とても はやく およぐ さかな。" },
    { id: "makko", name: "マッコウクジラ", zone: "hyoso", min: 0, max: 2000, w: 0.35, px: 290, sp: 3, draw: "whale",
      range: "やく 0〜2000m（もっと ふかく もぐる ことも）", size: "おとな の オス で やく 16m",
      note: "いき を とめて ふかく もぐり、ダイオウイカ など の イカ を たべる。1かい に 1じかん くらい もぐる ことも ある。" },

    // ---- トワイライトゾーン ----
    { id: "hadaka", name: "ハダカイワシ の なかま", zone: "twilight", min: 200, max: 1000, w: 3, px: 62, sp: 3, draw: "lantern", glow: true,
      range: "ひる は やく 200〜1000m", size: "やく 3〜15cm",
      note: "からだ に ひかる てん（発光器{はっこうき}）が ならぶ。よる に なると えさ を たべ に 上{うえ} の ほう まで あがって くる。" },
    { id: "muneeso", name: "ムネエソ の なかま", zone: "twilight", min: 200, max: 1000, w: 2.5, px: 56, sp: 1.5, draw: "hatchet", glow: true,
      range: "やく 200〜1000m", size: "やく 3〜8cm",
      note: "うすい からだ で、おなか が 下{した} に むかって ひかる。上{うえ} から の かすか な ひかり に とけこんで、かげ が 見{み}えなく なる。" },
    { id: "chouchin", name: "チョウチンアンコウ", zone: "twilight", min: 200, max: 1200, w: 3.5, px: 92, sp: 1, draw: "angler", glow: true,
      range: "やく 200〜800m で よく とれる（もっと ふかく にも いる）", size: "メス やく 40〜60cm／オス やく 4〜5cm",
      note: "あたま の「さお」の さき の ちょうちん が ひかって、えもの を よびよせる。オス は とても 小{ちい}さい。" },
    { id: "mendako", name: "メンダコ", zone: "twilight", min: 200, max: 1000, w: 1.6, px: 82, sp: 0.6, draw: "mendako", near: true,
      range: "やく 200〜1000m（うみ の そこ ちかく）", size: "やく 20cm",
      note: "みみ の ような ひれ を うごかして ふわふわ およぐ。からだ は ゼリー の ように やわらかい。" },
    { id: "daiouika", name: "ダイオウイカ", zone: "twilight", min: 500, max: 1100, w: 0.35, px: 240, sp: 1.5, draw: "squid",
      range: "やく 600〜1000m と かんがえられて いる", size: "うで まで いれると 10m を こえる ことも（きろく は やく 14m）",
      note: "2012ねん、小笠原{おがさわら} の 水深{すいしん} やく 630m で、およぐ すがた が はじめて ビデオ に とられた（国立科学博物館{こくりつかがくはくぶつかん} など）。" },
    { id: "ryugu", name: "リュウグウノツカイ", zone: "twilight", min: 200, max: 1000, w: 0.5, px: 250, sp: 1, draw: "oarfish",
      range: "やく 200〜1000m", size: "やく 3〜5m（もっと ながい ものも）",
      note: "ぎんいろ の ほそながい からだ に、あかい ひれ。からだ を たて に して うかぶ すがた も さつえい されて いる。" },
    { id: "hourai", name: "ホウライエソ", zone: "twilight", min: 300, max: 1500, w: 2, px: 88, sp: 2, draw: "viper", glow: true,
      range: "やく 200〜1000m（もっと ふかく にも）", size: "やく 25〜35cm",
      note: "くち から とびだす ながい キバ。せなか の ひれ の さき と、からだ の よこ が ひかる。" },
    { id: "demenigisu", name: "デメニギス", zone: "twilight", min: 400, max: 800, w: 1, px: 74, sp: 0.8, draw: "barreleye",
      range: "やく 400〜800m", size: "やく 15cm",
      note: "あたま が すきとおった ドーム に なって いて、なか の みどりいろ の 目{め} で 上{うえ} を 見{み}る。" },
    { id: "kinmedai", name: "キンメダイ", zone: "twilight", min: 200, max: 800, w: 2, px: 84, sp: 2.5, draw: "fish",
      c: { body: "#e03131", belly: "#ff8787", fin: "#c92a2a" }, opt: { bigEye: true, gold: true, deep: true, fork: true },
      range: "やく 200〜800m", size: "やく 30〜50cm",
      note: "まっか な からだ と きんいろ の 大{おお}きな 目{め}。深海{しんかい} では あかい ひかり が とどかない ので、あか は くろっぽく 見{み}えて めだたない。" },
    { id: "koumori", name: "コウモリダコ", zone: "twilight", min: 500, max: 1500, w: 1.3, px: 84, sp: 0.8, draw: "vampire", glow: true,
      range: "やく 600〜1200m", size: "やく 15〜30cm",
      note: "さんそ が すくない ところ でも くらせる。おどろく と ひかる ねばねば を だして みを まもる。タコ でも イカ でも ない なかま。" },
    { id: "takaashi", name: "タカアシガニ", zone: "twilight", min: 150, max: 600, w: 1.4, px: 150, draw: "spider", bottom: true,
      range: "やく 150〜600m の うみ の そこ", size: "あし を ひろげると やく 3m",
      note: "せかい で いちばん 大{おお}きい カニ。日本{にほん} の まわり の うみ に すむ。" },
    { id: "rabuka", name: "ラブカ", zone: "twilight", min: 400, max: 1200, w: 0.7, px: 175, sp: 1.5, draw: "frilled",
      range: "やく 500〜1000m", size: "やく 1.5〜2m",
      note: "ウナギ の ような ほそながい サメ。むかし の サメ の すがた を のこして いる と いわれ、「いきた かせき」と よばれる。" },
    { id: "mitsukuri", name: "ミツクリザメ", zone: "twilight", min: 270, max: 1300, w: 0.6, px: 185, sp: 2, draw: "goblin",
      range: "やく 270〜1300m", size: "やく 3m",
      note: "へら の ような ながい はな。えもの を 見{み}つける と、あご を まえ に とびださせて つかまえる。" },
    { id: "ooguchiboya", name: "オオグチボヤ", zone: "twilight", min: 300, max: 1000, w: 1.4, px: 72, draw: "tunicate", bottom: true,
      range: "やく 300〜1000m の うみ の そこ", size: "やく 10〜20cm",
      note: "いわ に くっついて、大{おお}きな くち を あけて ながれて くる えさ を まつ。富山湾{とやまわん} に たくさん あつまる ばしょ が ある。" },
    { id: "kairou", name: "カイロウドウケツ", zone: "twilight", min: 200, max: 1000, w: 1.2, px: 80, draw: "sponge", bottom: true,
      range: "やく 200〜1000m の うみ の そこ", size: "やく 20〜30cm",
      note: "ガラス と おなじ せいぶん の ほね で できた カイメン。あみめ の なか に ドウケツエビ の ペア が すんで いる ことが ある。" },
    { id: "daiougusoku", name: "ダイオウグソクムシ", zone: "twilight", min: 200, max: 2000, w: 1.6, px: 88, draw: "isopod", bottom: true,
      range: "やく 200〜1000m の うみ の そこ（もっと ふかく にも）", size: "やく 20〜40cm（50cm に なる ものも）",
      note: "ダンゴムシ と おなじ「とうきゃく」の なかま。そこ に おちて きた しがい を たべる。水族館{すいぞくかん} で なんねん も えさ を たべなかった こ も いた。" },

    // ---- 深海 ----
    { id: "onikinme", name: "オニキンメ", zone: "shinkai", min: 600, max: 3000, w: 1.6, px: 68, sp: 1.5, draw: "fangtooth",
      range: "やく 500〜2000m（もっと ふかく にも）", size: "やく 15cm",
      note: "からだ の 大{おお}きさ の わり に、とても 大{おお}きな キバ を もつ。" },
    { id: "fukurounagi", name: "フクロウナギ", zone: "shinkai", min: 800, max: 3000, w: 1.1, px: 155, sp: 1.2, draw: "gulper", glow: true,
      range: "やく 500〜3000m", size: "やく 75cm〜1m",
      note: "あたま より ずっと 大{おお}きく ひらく くち で えもの を のみこむ。しっぽ の さき が ひかる。" },
    { id: "nagazue", name: "ナガヅエエソ", zone: "shinkai", min: 1000, max: 4700, w: 1.4, px: 95, draw: "tripod", bottom: true,
      range: "やく 900〜4700m の うみ の そこ", size: "やく 30cm（ひれ を のぞく）",
      note: "ながい 3ぼん の ひれ を「さんきゃく」の ように して、そこ に たって えさ を まつ。" },
    { id: "jumonji", name: "ジュウモンジダコ の なかま", zone: "shinkai", min: 1000, max: 7000, w: 1.4, px: 78, sp: 0.6, draw: "dumbo", near: true,
      range: "やく 1000〜7000m", size: "やく 20〜30cm",
      note: "みみ の ような ひれ で およぐ（「ダンボ・オクトパス」とも）。2019ねん、ジャワ海溝{かいこう} の 水深{すいしん} やく 6957m で さつえい された。" },
    { id: "senju", name: "センジュナマコ", zone: "shinkai", min: 1000, max: 6000, w: 1.5, px: 74, draw: "cucumber", bottom: true,
      range: "やく 1000〜6000m の うみ の そこ", size: "やく 5〜15cm",
      note: "たくさん の あし で そこ を あるく ナマコ。ピンク の まるい すがた から「うみ の ブタ」と よばれる ことも。" },
    { id: "yokozuna", name: "ヨコヅナイワシ", zone: "shinkai", min: 2000, max: 2700, w: 1.2, px: 135, sp: 1.8, draw: "fish", near: true,
      c: { body: "#2c2f45", belly: "#4a4f6e", fin: "#1f2236" }, opt: { bigHead: true, round: true },
      range: "するがわん の 2171〜2572m で 見{み}つかった", size: "やく 1.4m（やく 25kg）",
      note: "2016ねん に するがわん の 深海{しんかい} で とられ、2021ねん に あたらしい しゅるい と して はっぴょう された（JAMSTEC）。するがわん の 深海{しんかい} の いちばん 上{うえ} の かりうど と かんがえられて いる。" },
    { id: "sokodara", name: "ソコダラ の なかま", zone: "shinkai", min: 1000, max: 7000, w: 2, px: 105, sp: 1.2, draw: "rattail", near: true,
      range: "やく 200〜7000m（しゅるい に よって ちがう）", size: "やく 30cm〜1m",
      note: "大{おお}きな あたま と、ほそく とがった しっぽ。深海{しんかい} の そこ の ちかく で よく 見{み}られる さかな。" },
    { id: "yunohana", name: "ユノハナガニ", zone: "shinkai", min: 420, max: 1380, w: 3, px: 62, draw: "crab", bottom: true, vent: ["v1"],
      range: "やく 420〜1380m の ねっすい の まわり", size: "やく 5cm",
      note: "ねっすい が でる ところ の まわり に たくさん あつまる しろい カニ。名前{なまえ} は 温泉{おんせん} に できる「ゆのはな」から。" },
    { id: "goemon", name: "ゴエモンコシオリエビ", zone: "shinkai", min: 700, max: 1600, w: 3, px: 64, draw: "squat", bottom: true, vent: ["v1"],
      range: "やく 700〜1600m の ねっすい の まわり（おきなわトラフ）", size: "やく 5cm",
      note: "むね の け に バクテリア を そだてて、それ を たべて いる。あつい ねっすい の そば に いる ので、「かまゆで」の はなし で ゆうめい な 石川五右衛門{いしかわごえもん} から 名前{なまえ} が ついた。" },
    { id: "haori", name: "ハオリムシ の なかま", zone: "shinkai", min: 80, max: 2700, w: 2.5, px: 90, draw: "tubeworm", bottom: true, vent: ["v1", "v2"],
      range: "しゅるい に よって やく 80〜2500m（ねっすい や わきみず の まわり）", size: "やく 30cm〜1m（2m に なる しゅるい も）",
      note: "くち も おなか も ない。からだ の なか に すむ バクテリア に えいよう を つくって もらう。あかい えら が めじるし。" },
    { id: "scaly", name: "スケーリーフット", zone: "shinkai", min: 2300, max: 2900, w: 3, px: 60, draw: "snail", bottom: true, vent: ["v2"],
      range: "やく 2400〜2900m の ねっすい の まわり（インドよう）", size: "やく 4cm",
      note: "あし に てつ を ふくんだ うろこ が ならぶ まきがい。インドよう の ねっすい で「しんかい6500」が 大{おお}きな むれ を 見{み}つけた（JAMSTEC）。" },

    // ---- 超深海・海溝 の そこ ----
    { id: "kusauo", name: "シンカイクサウオ の なかま", zone: "chou", min: 6000, max: 8400, w: 2.5, px: 88, sp: 0.8, draw: "snailfish", near: true,
      range: "やく 6000〜8300m", size: "やく 20〜30cm",
      note: "超深海{ちょうしんかい} に すむ さかな。2022ねん、伊豆{いず}・小笠原海溝{おがさわらかいこう} の 水深{すいしん} 8336m で さつえい され、「いちばん ふかい ところ で 見{み}つかった さかな」の ギネス せかい きろく に なった。" },
    { id: "kaikou", name: "カイコウオオソコエビ", zone: "chou", min: 6000, max: BOTTOM, w: 3, px: 56, sp: 1, draw: "amphipod", near: true,
      range: "やく 6000〜1万{まん}900m", size: "やく 3〜5cm",
      note: "チャレンジャー海淵{かいえん}（やく 1万{まん}900m）でも くらす ヨコエビ の なかま。木{き} など に ふくまれる セルロース を とかして えいよう に できる（JAMSTEC）。" }
  ];

  var MISSIONS = [
    { id: "angler3", title: "チョウチンアンコウ を 3びき しゃしん に とろう", goal: 3,
      hint: "200〜800m くらい。ライト を つけて さがそう。" },
    { id: "d6500", title: "6500m まで もぐろう", goal: 6500,
      hint: "みぎ へ すすむ と うみ が ふかく なるよ。" },
    { id: "snow", title: "マリンスノー を 見{み}よう", goal: 1,
      hint: "300m より ふかい ところ で ライト を つけて みよう。" },
    { id: "vent", title: "熱水{ねっすい} の でる ところ を 見{み}つけよう", goal: 1,
      hint: "1200m くらい の さか の とちゅう。ソナー が おしえて くれるよ。" },
    { id: "bottom", title: "海溝{かいこう} の そこ（やく 1万{まん}m）へ いこう", goal: BOTTOM,
      hint: "いちばん みぎ の ほう に ふかい たに が あるよ。" },
    { id: "zukan10", title: "いきもの を 10しゅるい ずかん に いれよう", goal: 10,
      hint: "いろいろ な ふかさ を たんけん しよう。" },
    { id: "glow5", title: "ひかる いきもの を 5しゅるい とろう", goal: 5,
      hint: "まっくら な ところ で ひかって いる いきもの が いるよ。" },
    { id: "all", title: "ずかん を ぜんぶ うめよう", goal: SPECIES.length,
      hint: "そこ に いる いきもの や、ねっすい の まわり にも いるよ。" }
  ];

  // 水温{すいおん}（やく。あたたかい 北西{ほくせい}太平洋{たいへいよう} の よう な うみ の めやす）
  var TEMP = [[0, 24], [50, 22], [100, 19], [200, 14], [400, 9], [700, 6], [1000, 4], [2000, 2.5],
    [3000, 1.8], [4000, 1.5], [6000, 1.5], [8000, 2], [BOTTOM, 2.5]];

  // ふかさ の かわりめ で でる おしらせ
  var MILESTONES = [
    { d: 15, text: "あか い いろ が きえて きた！ あか い ひかり は みず に すいこまれやすい。" },
    { d: 80, text: "みどり も うすく なって、あおい せかい に なった。" },
    { d: 200, text: "ここ から トワイライトゾーン。200m より ふかい ところ を「深海{しんかい}」と よぶ ことが おおい。" },
    { d: 634, text: "スカイツリー（634m）が すっぽり はいる ふかさ！" },
    { d: 1000, text: "1000m。たいよう の ひかり は もう とどかない。水温{すいおん} は やく 4℃。" },
    { d: 3776, text: "ふじさん（3776m）を さかさま に した ふかさ まで きた！" },
    { d: 6000, text: "6000m。ここ から 超深海{ちょうしんかい}。" },
    { d: 6500, text: "6500m！ 日本{にほん} の ゆうじん せんすいちょうさせん「しんかい6500」が もぐれる いちばん ふかい ところ。" },
    { d: 8849, text: "エベレスト（8849m）を さかさま に しても とどかない ふかさ！" },
    { d: 10800, text: "海溝{かいこう} の そこ！ マリアナ海溝{かいこう} の いちばん ふかい ところ は やく 1万{まん}900m。1960ねん に「トリエステ」ごう が はじめて ひと を のせて とどいた。" }
  ];

  var D = { BOTTOM: BOTTOM, ZONES: ZONES, VENTS: VENTS, COMPARE: COMPARE, SPECIES: SPECIES,
    MISSIONS: MISSIONS, TEMP: TEMP, MILESTONES: MILESTONES };
  if (typeof module !== "undefined" && module.exports) module.exports = D;
  else root.SHINKAI = D;
})(this);
