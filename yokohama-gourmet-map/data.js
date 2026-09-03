/* 横浜グルメマップ - エリア / ジャンル / スポットのデータ
 *
 * 座標は OpenStreetMap のデータをもとにしています。
 * © OpenStreetMap contributors (ODbL)
 *
 * スポットを増やすときは SPOTS に足すだけ。
 * id は一度決めたら変えないこと（localStorage の記録が id で紐づいているため）。
 */

// fitMin … 起動時に「店がぜんぶ入るように」縮小するときの下限ズーム。
// これ以上引くと通りの名前が読めなくなるので止める（＝端の数件は画面外から始まる）。
// 店が狭い範囲に密集しているエリアほど大きく、広く散っているエリアほど小さくする。
const AREAS = [
  { id: 'noge',   name: '野毛',         center: [35.4478, 139.6296], zoom: 16.6, fitMin: 16.3 },
  { id: 'kannai', name: '関内',         center: [35.4437, 139.6385], zoom: 16.4, fitMin: 16.0 },
  { id: 'mm',     name: 'みなとみらい', center: [35.4576, 139.6320], zoom: 15.6, fitMin: 14.6 },
  { id: 'ykhm',   name: '横浜駅周辺',   center: [35.4660, 139.6220], zoom: 16.0, fitMin: 15.5 },
];

const GENRES = [
  { id: 'izakaya',  name: '居酒屋',       emoji: '🏮', color: '#ff7a5c' },
  { id: 'ramen',    name: 'ラーメン',     emoji: '🍜', color: '#ffb648' },
  { id: 'chinese',  name: '中華',         emoji: '🥟', color: '#ffe066' },
  { id: 'teishoku', name: '定食',         emoji: '🍱', color: '#b8e05c' },
  { id: 'yakiniku', name: '焼肉',         emoji: '🥩', color: '#5fd08a' },
  { id: 'yakitori', name: '焼き鳥',       emoji: '🍗', color: '#4fd2c2' },
  { id: 'hamburg',  name: 'ハンバーグ',   emoji: '🍖', color: '#5bc0f2' },
  { id: 'sushi',    name: '寿司',         emoji: '🍣', color: '#7d9cff' },
  { id: 'italian',  name: 'イタリアン',   emoji: '🍕', color: '#a98cff' },
  { id: 'soba',     name: 'そば・うどん', emoji: '🥢', color: '#d281f0' },
  { id: 'cafe',     name: 'カフェ・甘味', emoji: '☕', color: '#ff87c8' },
  { id: 'other',    name: 'その他',       emoji: '🍴', color: '#c0c8d4' },
];

const SPOTS = [
  // ================= 野毛（桜木町〜日ノ出町） =================
  // ---- 居酒屋 ----
  { id: 'noge-001', area: 'noge', genre: 'izakaya',  name: '八郎酒場',            lat: 35.44770, lng: 139.62883, note: '野毛の立ち飲みの代表格。刺身と煮込みを軽く一杯。' },
  { id: 'noge-002', area: 'noge', genre: 'izakaya',  name: '珍獣屋',              lat: 35.44788, lng: 139.63034, note: 'ワニ・カンガルーなど珍しい肉が名物のにぎやかな店。' },
  { id: 'noge-003', area: 'noge', genre: 'izakaya',  name: 'もつしげ',            lat: 35.44839, lng: 139.63038, note: 'もつ焼きと煮込み。野毛小路の人気店。' },
  { id: 'noge-004', area: 'noge', genre: 'izakaya',  name: '浜幸',                lat: 35.44771, lng: 139.63050, note: '鍋と一品料理。落ち着いて飲めるタイプ。' },
  { id: 'noge-005', area: 'noge', genre: 'izakaya',  name: '一千代',              lat: 35.44845, lng: 139.63004, note: '魚がしっかりした小料理屋。カウンター中心。' },
  { id: 'noge-006', area: 'noge', genre: 'izakaya',  name: '鷹一',                lat: 35.44795, lng: 139.63017, note: '魚料理が中心の居酒屋。' },
  { id: 'noge-007', area: 'noge', genre: 'izakaya',  name: '無頼船',              lat: 35.44780, lng: 139.63008, note: '野毛らしいにぎやかな一軒。' },
  { id: 'noge-008', area: 'noge', genre: 'izakaya',  name: '浜印水産',            lat: 35.44680, lng: 139.62821, note: '海鮮系の大衆酒場。' },
  { id: 'noge-009', area: 'noge', genre: 'izakaya',  name: 'トリニチサカバ',      lat: 35.44655, lng: 139.63034, note: 'おでんが看板の酒場。都橋のすぐそば。' },
  { id: 'noge-010', area: 'noge', genre: 'izakaya',  name: 'ふぐよし総本山',      lat: 35.44894, lng: 139.62927, note: 'ふぐを気軽に。てっさや唐揚げ。' },
  { id: 'noge-011', area: 'noge', genre: 'izakaya',  name: '野毛ゴールデン',      lat: 35.44768, lng: 139.62882, note: '遅い時間まで開いている大衆酒場。' },

  // ---- 焼き鳥 ----
  { id: 'noge-012', area: 'noge', genre: 'yakitori', name: '末広',                lat: 35.44785, lng: 139.63000, note: '野毛の老舗焼き鳥。行列覚悟の一軒。' },
  { id: 'noge-013', area: 'noge', genre: 'yakitori', name: 'やきとり コッコ堂',   lat: 35.44648, lng: 139.63042, note: '立ち食いスタイルの焼き鳥。サッと一本。' },
  { id: 'noge-014', area: 'noge', genre: 'yakitori', name: '鳥八百八',            lat: 35.44855, lng: 139.63124, note: '野毛小路の焼き鳥。' },

  // ---- 焼肉 ----
  { id: 'noge-016', area: 'noge', genre: 'yakiniku', name: '野毛ホルモンセンター', lat: 35.44807, lng: 139.63022, note: 'ホルモン焼きの人気店。' },
  { id: 'noge-017', area: 'noge', genre: 'yakiniku', name: '太田',                lat: 35.44570, lng: 139.62962, note: '日ノ出町寄りの焼肉。' },
  { id: 'noge-018', area: 'noge', genre: 'yakiniku', name: 'ブッチャーズグリル',  lat: 35.44772, lng: 139.62846, note: '肉をがっつり食べたいときに。' },

  // ---- 中華 ----
  { id: 'noge-019', area: 'noge', genre: 'chinese',  name: '萬里',                lat: 35.44847, lng: 139.63032, note: '野毛の代表格。餃子とタンメンが名物。' },
  { id: 'noge-020', area: 'noge', genre: 'chinese',  name: '萬里 放題亭',         lat: 35.44893, lng: 139.63048, note: '萬里の食べ放題スタイルの店。' },
  { id: 'noge-021', area: 'noge', genre: 'chinese',  name: '三陽',                lat: 35.44855, lng: 139.63066, note: '野毛の老舗中華。' },
  { id: 'noge-022', area: 'noge', genre: 'chinese',  name: '第一亭',              lat: 35.44563, lng: 139.62808, note: '名物「パタン」で知られる日ノ出町の名店。' },
  { id: 'noge-023', area: 'noge', genre: 'chinese',  name: '清香楼',              lat: 35.44757, lng: 139.62980, note: '町中華。ラーメンも定食も。' },
  { id: 'noge-024', area: 'noge', genre: 'chinese',  name: '阿里山',              lat: 35.44952, lng: 139.62945, note: '桜木町寄りの中華。' },
  { id: 'noge-025', area: 'noge', genre: 'chinese',  name: '三幸苑',              lat: 35.44804, lng: 139.62806, note: '野毛坂近くの町中華。' },

  // ---- ラーメン ----
  { id: 'noge-026', area: 'noge', genre: 'ramen',    name: 'ノ貫',                lat: 35.44578, lng: 139.63168, note: '煮干しの効いた一杯で知られる人気店。' },
  { id: 'noge-027', area: 'noge', genre: 'ramen',    name: '日の出らーめん',      lat: 35.44718, lng: 139.62810, note: '強めの家系。がっつり派向け。' },
  { id: 'noge-028', area: 'noge', genre: 'ramen',    name: '中国ラーメン楊',      lat: 35.44869, lng: 139.62951, note: 'しびれる汁なし坦坦麺。' },
  { id: 'noge-029', area: 'noge', genre: 'ramen',    name: '大来',                lat: 35.44833, lng: 139.62887, note: '昔ながらの中華そば。' },
  { id: 'noge-030', area: 'noge', genre: 'ramen',    name: 'タンメン専門店 満菜', lat: 35.44926, lng: 139.62893, note: '野菜たっぷりのタンメン専門店。' },
  { id: 'noge-031', area: 'noge', genre: 'ramen',    name: 'カレータンタン麺 花虎', lat: 35.44700, lng: 139.62837, note: 'カレー坦々麺が看板。' },

  // ---- ハンバーグ・洋食 ----
  { id: 'noge-032', area: 'noge', genre: 'hamburg',  name: 'センターグリル',      lat: 35.44749, lng: 139.63103, note: '1946年創業の洋食店。ハンバーグとナポリタン。' },
  { id: 'noge-033', area: 'noge', genre: 'hamburg',  name: '洋食キムラ',          lat: 35.44723, lng: 139.63073, note: 'ハンバーグで知られる老舗洋食。' },
  { id: 'noge-034', area: 'noge', genre: 'hamburg',  name: 'ミツワグリル',        lat: 35.44550, lng: 139.62795, note: '日ノ出町の老舗洋食。ハンバーグが看板。' },
  { id: 'noge-035', area: 'noge', genre: 'hamburg',  name: 'シベール',            lat: 35.44651, lng: 139.62971, note: '洋食とグリル。パスタや魚料理も。' },
  { id: 'noge-036', area: 'noge', genre: 'hamburg',  name: 'パリ一',              lat: 35.44752, lng: 139.62904, note: '野毛の老舗洋食。' },

  // ---- 寿司 ----
  { id: 'noge-037', area: 'noge', genre: 'sushi',    name: 'かめや寿司',          lat: 35.44834, lng: 139.62924, note: '野毛の寿司屋。' },
  { id: 'noge-038', area: 'noge', genre: 'sushi',    name: '松葉寿し',            lat: 35.44673, lng: 139.62818, note: '日ノ出町寄りの寿司屋。' },
  { id: 'noge-039', area: 'noge', genre: 'sushi',    name: '秀吉',                lat: 35.44908, lng: 139.63049, note: '桜木町寄りの寿司・和食。' },

  // ---- そば・うどん ----
  { id: 'noge-040', area: 'noge', genre: 'soba',     name: '日本そば 東京庵',     lat: 35.44765, lng: 139.62956, note: '野毛の老舗そば店。' },
  { id: 'noge-041', area: 'noge', genre: 'soba',     name: 'そば処 野毛庵',       lat: 35.44603, lng: 139.62771, note: '野毛坂下のそば店。' },
  { id: 'noge-042', area: 'noge', genre: 'soba',     name: 'そば うどん 川村屋',  lat: 35.45077, lng: 139.63100, note: '桜木町駅前の立ち食いそば。朝から営業。' },

  // ---- イタリアン ----
  { id: 'noge-043', area: 'noge', genre: 'italian',  name: 'Osteria INOUE',       lat: 35.44848, lng: 139.62826, note: '野毛のオステリア。' },
  { id: 'noge-044', area: 'noge', genre: 'italian',  name: 'COLTS',               lat: 35.44968, lng: 139.62951, note: 'ピッツァが看板のイタリアン。' },

  // ---- カフェ・甘味 ----
  { id: 'noge-045', area: 'noge', genre: 'cafe',     name: 'ジャズ喫茶 ちぐさ',   lat: 35.44879, lng: 139.62993, note: '1933年創業。日本最古級のジャズ喫茶。' },
  { id: 'noge-046', area: 'noge', genre: 'cafe',     name: '喫茶カミン',          lat: 35.44762, lng: 139.62878, note: '野毛の純喫茶。' },
  { id: 'noge-047', area: 'noge', genre: 'cafe',     name: '茶処 しんり',         lat: 35.44846, lng: 139.62932, note: '野毛のお茶どころ。' },

  // ---- 定食 ----
  { id: 'noge-048', area: 'noge', genre: 'teishoku', name: 'かつ半',              lat: 35.44804, lng: 139.62906, note: 'とんかつと定食。' },
  { id: 'noge-049', area: 'noge', genre: 'teishoku', name: '天婦羅 あぶら屋',     lat: 35.44988, lng: 139.62969, note: '揚げたての天ぷら。定食でも一杯でも。' },

  // ---- その他 ----
  { id: 'noge-015', area: 'noge', genre: 'other',    name: 'KIKUYA CURRY',        lat: 35.44852, lng: 139.62696, note: 'スパイスカレーの人気店。野毛坂の上のほう。' },
  { id: 'noge-050', area: 'noge', genre: 'other',    name: '野毛都橋商店街ビル',  lat: 35.44648, lng: 139.63048, note: '1964年築、大岡川沿いのハーモニカ横丁。小さな店がびっしり並ぶ野毛の象徴。' },
  { id: 'noge-051', area: 'noge', genre: 'other',    name: '桜木町ぴおシティ',    lat: 35.44969, lng: 139.63107, note: '地下2階に立ち飲み・大衆酒場が集まる名スポット。昼から飲める。' },
  // ================= 関内（馬車道・弁天通・伊勢佐木町・福富町・長者町あたり） =================
  // ---- 居酒屋 ----
  { id: 'kannai-001', area: 'kannai', genre: 'izakaya',  name: 'たちのみ じぇんとるまん 関内店', lat: 35.44789, lng: 139.63726, note: '関内の立ち飲み。仕事帰りにサッと一杯。' },
  { id: 'kannai-002', area: 'kannai', genre: 'izakaya',  name: '82 ale house',            lat: 35.44632, lng: 139.63594, note: '関内の老舗ビアパブ。ビールと洋風のつまみ。' },
  { id: 'kannai-003', area: 'kannai', genre: 'izakaya',  name: '横浜ベイブルーイング 関内本店', lat: 35.44556, lng: 139.63265, note: '横浜の地ビール醸造所の直営店。クラフトビール。' },
  { id: 'kannai-004', area: 'kannai', genre: 'izakaya',  name: "O'denbar うまみや",        lat: 35.44516, lng: 139.63812, note: 'おでんが看板のバー的な酒場。' },
  { id: 'kannai-005', area: 'kannai', genre: 'izakaya',  name: '大福水産',                lat: 35.44483, lng: 139.63936, note: '海鮮系の大衆酒場。' },
  { id: 'kannai-006', area: 'kannai', genre: 'izakaya',  name: 'ごんぞう',                lat: 35.44671, lng: 139.63724, note: '関内駅前の居酒屋。' },

  // ---- 焼き鳥 ----
  { id: 'kannai-007', area: 'kannai', genre: 'yakitori', name: '鳥伊勢',                  lat: 35.44440, lng: 139.63637, note: '長者町の焼き鳥。地元で長く続く一軒。' },
  { id: 'kannai-008', area: 'kannai', genre: 'yakitori', name: 'やきとり 元祖 浜一番',    lat: 35.44907, lng: 139.63536, note: '馬車道寄りの焼き鳥。' },
  { id: 'kannai-009', area: 'kannai', genre: 'yakitori', name: 'ヤキトリまだらや',        lat: 35.44777, lng: 139.63891, note: '関内の焼き鳥。' },
  { id: 'kannai-010', area: 'kannai', genre: 'yakitori', name: '焼き鳥さいとう',          lat: 35.44681, lng: 139.63858, note: '関内駅ちかくの焼き鳥。' },

  // ---- 焼肉 ----
  { id: 'kannai-011', area: 'kannai', genre: 'yakiniku', name: '焼肉ハウス 大滝',         lat: 35.44830, lng: 139.63813, note: '関内の焼肉店。' },
  { id: 'kannai-012', area: 'kannai', genre: 'yakiniku', name: '焼肉カーニバル',          lat: 35.44882, lng: 139.63795, note: '馬車道寄りの焼肉。' },
  { id: 'kannai-013', area: 'kannai', genre: 'yakiniku', name: '京城苑',                  lat: 35.44449, lng: 139.63625, note: '長者町の焼肉。' },

  // ---- 中華 ----
  { id: 'kannai-014', area: 'kannai', genre: 'chinese',  name: '生香園 本館',             lat: 35.44785, lng: 139.63585, note: '馬車道の中華の名店。広東料理。' },
  { id: 'kannai-015', area: 'kannai', genre: 'chinese',  name: '生香園 新館',             lat: 35.44844, lng: 139.63620, note: '生香園のもう一軒。' },
  { id: 'kannai-016', area: 'kannai', genre: 'chinese',  name: '香港雲呑専門店 賢記',     lat: 35.44684, lng: 139.63830, note: '雲呑（ワンタン）麺の専門店。' },
  { id: 'kannai-017', area: 'kannai', genre: 'chinese',  name: '香港酒家 景気',           lat: 35.44688, lng: 139.63959, note: '関内の香港料理。' },
  { id: 'kannai-018', area: 'kannai', genre: 'chinese',  name: '火鍋専門店 小肥羊',       lat: 35.44767, lng: 139.63601, note: '火鍋の専門店。' },

  // ---- ラーメン ----
  { id: 'kannai-019', area: 'kannai', genre: 'ramen',    name: '中華蕎麦 時雨',           lat: 35.44150, lng: 139.63520, note: '長者町の人気ラーメン。行列することも。' },
  { id: 'kannai-020', area: 'kannai', genre: 'ramen',    name: '味のラーメン 海賊',       lat: 35.44788, lng: 139.63880, note: '関内で長く続くラーメン店。' },
  { id: 'kannai-021', area: 'kannai', genre: 'ramen',    name: '一角家 関内店',           lat: 35.44859, lng: 139.63959, note: '家系ラーメン。' },
  { id: 'kannai-022', area: 'kannai', genre: 'ramen',    name: 'たかさご家',              lat: 35.44507, lng: 139.63803, note: '家系ラーメン。関内駅の南。' },
  { id: 'kannai-023', area: 'kannai', genre: 'ramen',    name: '新福菜館',                lat: 35.44382, lng: 139.63232, note: '伊勢佐木町。黒いスープの中華そば。' },
  { id: 'kannai-024', area: 'kannai', genre: 'ramen',    name: '北海道ラーメン 来々軒 本店', lat: 35.44418, lng: 139.63324, note: '伊勢佐木町の老舗ラーメン。' },

  // ---- 定食 ----
  { id: 'kannai-025', area: 'kannai', genre: 'teishoku', name: '勝烈庵 本店',             lat: 35.44715, lng: 139.63491, note: '1927年創業。馬車道のとんかつの名店。' },
  { id: 'kannai-026', area: 'kannai', genre: 'teishoku', name: '味のとんかつ 丸和',       lat: 35.44783, lng: 139.63532, note: '馬車道のとんかつ。' },
  { id: 'kannai-027', area: 'kannai', genre: 'teishoku', name: 'とんかつ馬車道さくら 本店', lat: 35.44791, lng: 139.63613, note: '馬車道のとんかつ。' },
  { id: 'kannai-028', area: 'kannai', genre: 'teishoku', name: 'TSUBAKI食堂',             lat: 35.45066, lng: 139.63410, note: '神奈川の食材をつかった定食。北仲。' },
  { id: 'kannai-029', area: 'kannai', genre: 'teishoku', name: '天婦羅 登良屋',           lat: 35.44524, lng: 139.63323, note: '伊勢佐木町の天ぷら。定食でも一杯でも。' },

  // ---- ハンバーグ・洋食 ----
  { id: 'kannai-030', area: 'kannai', genre: 'hamburg',  name: 'グリル エス',             lat: 35.44826, lng: 139.63555, note: '馬車道の洋食・グリル。' },
  { id: 'kannai-031', area: 'kannai', genre: 'hamburg',  name: '相生 馬車道本店',         lat: 35.44790, lng: 139.63618, note: '馬車道の洋食店。' },
  { id: 'kannai-032', area: 'kannai', genre: 'hamburg',  name: 'ビーフティックB.B.',      lat: 35.44765, lng: 139.63910, note: '関内のステーキ・鉄板の洋食。' },

  // ---- 寿司 ----
  { id: 'kannai-033', area: 'kannai', genre: 'sushi',    name: '鮨ひろ瀬',                lat: 35.44692, lng: 139.63836, note: '関内の寿司。' },
  { id: 'kannai-034', area: 'kannai', genre: 'sushi',    name: '寿司処 海老原',           lat: 35.44828, lng: 139.63819, note: '馬車道寄りの寿司。' },
  { id: 'kannai-035', area: 'kannai', genre: 'sushi',    name: 'はま田',                  lat: 35.44678, lng: 139.63951, note: '関内の寿司。' },
  { id: 'kannai-036', area: 'kannai', genre: 'sushi',    name: '鮨さくら',                lat: 35.44754, lng: 139.64024, note: '日本大通り寄りの寿司。' },

  // ---- イタリアン ----
  { id: 'kannai-037', area: 'kannai', genre: 'italian',  name: 'la Tenda Rossa',          lat: 35.44914, lng: 139.63499, note: '馬車道のイタリアン。' },
  { id: 'kannai-038', area: 'kannai', genre: 'italian',  name: 'Via Toscanella',          lat: 35.44733, lng: 139.63685, note: 'トスカーナ料理のイタリアン。' },
  { id: 'kannai-039', area: 'kannai', genre: 'italian',  name: 'ALLORA bashamichi',       lat: 35.44885, lng: 139.63548, note: '馬車道のイタリアン。' },

  // ---- そば・うどん ----
  { id: 'kannai-040', area: 'kannai', genre: 'soba',     name: '中屋',                    lat: 35.44755, lng: 139.63855, note: '関内の老舗そば。天ぷらも。' },
  { id: 'kannai-041', area: 'kannai', genre: 'soba',     name: 'はまや',                  lat: 35.44866, lng: 139.63534, note: '馬車道のそば店。' },
  { id: 'kannai-042', area: 'kannai', genre: 'soba',     name: '味奈登庵',                lat: 35.44935, lng: 139.63555, note: '「富士山盛り」の大盛りそばで知られる。' },

  // ---- カフェ・甘味 ----
  { id: 'kannai-043', area: 'kannai', genre: 'cafe',     name: '馬車道十番館',            lat: 35.44738, lng: 139.63488, note: '明治風の洋館。1階が喫茶で、ビスカウトも有名。' },
  { id: 'kannai-044', area: 'kannai', genre: 'cafe',     name: '大学院',                  lat: 35.44553, lng: 139.63986, note: '関内の純喫茶。長く続く一軒。' },
  { id: 'kannai-045', area: 'kannai', genre: 'cafe',     name: 'サモアール 馬車道店',     lat: 35.44853, lng: 139.63662, note: '紅茶の専門店。' },
  { id: 'kannai-046', area: 'kannai', genre: 'cafe',     name: '文明堂茶館 ル・カフェ',   lat: 35.44491, lng: 139.63324, note: '伊勢佐木町。文明堂の喫茶。' },

  // ---- その他 ----
  { id: 'kannai-047', area: 'kannai', genre: 'other',    name: '割烹蒲焼 わかな',         lat: 35.44635, lng: 139.63410, note: '創業140年ちかい鰻の老舗。' },
  { id: 'kannai-048', area: 'kannai', genre: 'other',    name: '宮川本廛',                lat: 35.44567, lng: 139.63759, note: '関内の鰻の老舗。' },
  { id: 'kannai-049', area: 'kannai', genre: 'other',    name: '荒井屋 万国橋店',         lat: 35.45074, lng: 139.63836, note: '明治28年創業の牛鍋屋。' },
  { id: 'kannai-050', area: 'kannai', genre: 'other',    name: 'ブラフベーカリー',        lat: 35.44799, lng: 139.64086, note: '横浜発のベーカリー。食パンが人気。' },
  { id: 'kannai-051', area: 'kannai', genre: 'other',    name: 'Soup Curry らっきょ',     lat: 35.44817, lng: 139.63603, note: '札幌発のスープカレー。馬車道。' },
  // ================= みなとみらい（桜木町東口〜新高島・赤レンガ・ハンマーヘッド） =================
  // 商業施設のなかに店が集まる街なので、「施設そのもの」と「わざわざ行く価値のある店」の両方を入れている。
  // ---- 施設・その他 ----
  { id: 'mm-001', area: 'mm', genre: 'other',    name: '横浜赤レンガ倉庫',        lat: 35.45240, lng: 139.64292, note: '1号館・2号館にカフェとレストランがずらり。イベントも多い。' },
  { id: 'mm-002', area: 'mm', genre: 'other',    name: '横浜ハンマーヘッド',      lat: 35.45624, lng: 139.64204, note: '新港ふ頭の商業施設。食のブランドが集まっている。' },
  { id: 'mm-003', area: 'mm', genre: 'other',    name: '横浜ワールドポーターズ',  lat: 35.45389, lng: 139.63830, note: '飲食フロアが広い。映画のついでにも。' },
  { id: 'mm-004', area: 'mm', genre: 'other',    name: 'ランドマークプラザ',      lat: 35.45512, lng: 139.63134, note: 'ランドマークタワーの足元。地下〜5階に飲食。' },
  { id: 'mm-005', area: 'mm', genre: 'other',    name: 'クイーンズスクエア横浜',  lat: 35.45645, lng: 139.63382, note: 'みなとみらい駅直結。飲食が最も集まるところ。' },
  { id: 'mm-006', area: 'mm', genre: 'other',    name: 'MARK IS みなとみらい',    lat: 35.45772, lng: 139.63179, note: 'みなとみらい駅直結。地下1階と4階に飲食。' },
  { id: 'mm-007', area: 'mm', genre: 'other',    name: 'コレットマーレ',          lat: 35.45230, lng: 139.63052, note: '桜木町駅直結。上層階がレストラン街。' },
  { id: 'mm-008', area: 'mm', genre: 'other',    name: 'MARINE & WALK YOKOHAMA',  lat: 35.45463, lng: 139.64219, note: '海沿いのオープンモール。カフェとレストラン。' },
  { id: 'mm-009', area: 'mm', genre: 'other',    name: 'みなとみらいグランドセントラルテラス', lat: 35.45886, lng: 139.62930, note: '新高島寄り。ベーカリーやカフェ。' },
  { id: 'mm-010', area: 'mm', genre: 'other',    name: '電光石火',                lat: 35.45242, lng: 139.63075, note: '広島風のお好み焼き。コレットマーレ。' },
  { id: 'mm-011', area: 'mm', genre: 'other',    name: 'LA MERE POULARD',         lat: 35.45688, lng: 139.63210, note: 'モン・サン・ミッシェルのふわふわオムレツ。' },

  // ---- カフェ・甘味 ----
  { id: 'mm-012', area: 'mm', genre: 'cafe',     name: 'bills 横浜赤レンガ倉庫',  lat: 35.45266, lng: 139.64353, note: 'リコッタパンケーキ。朝から並ぶことも。' },
  { id: 'mm-013', area: 'mm', genre: 'cafe',     name: 'chano-ma 横浜',           lat: 35.45269, lng: 139.64296, note: '赤レンガ倉庫。ベッド席でのんびり。' },
  { id: 'mm-014', area: 'mm', genre: 'cafe',     name: 'Granny Smith',            lat: 35.45250, lng: 139.64268, note: 'アップルパイの専門店。' },
  { id: 'mm-015', area: 'mm', genre: 'cafe',     name: 'ZEBRA Coffee & Croissant', lat: 35.45491, lng: 139.64198, note: 'クロワッサンとコーヒー。ハンマーヘッド寄り。' },
  { id: 'mm-016', area: 'mm', genre: 'cafe',     name: 'THE CITY BAKERY',         lat: 35.45792, lng: 139.62698, note: 'ニューヨーク発のベーカリーカフェ。' },
  { id: 'mm-017', area: 'mm', genre: 'cafe',     name: 'シルスマリア',            lat: 35.45743, lng: 139.63196, note: '生チョコで知られる神奈川発の店。' },
  { id: 'mm-018', area: 'mm', genre: 'cafe',     name: 'VANILLABEANS THE ROASTERY', lat: 35.45654, lng: 139.64195, note: '横浜発のチョコレート専門店。' },
  { id: 'mm-019', area: 'mm', genre: 'cafe',     name: 'ありあけ ハーバースタジオ', lat: 35.45622, lng: 139.64212, note: '横浜土産「ハーバー」の工房つきの店。' },

  // ---- ハンバーグ・洋食 ----
  { id: 'mm-020', area: 'mm', genre: 'hamburg',  name: 'いしがまやハンバーグ',    lat: 35.45733, lng: 139.63177, note: '石窯で焼くハンバーグ。' },
  { id: 'mm-021', area: 'mm', genre: 'hamburg',  name: 'Shake Shack みなとみらい', lat: 35.45605, lng: 139.63259, note: 'ニューヨーク発のバーガー。' },
  { id: 'mm-022', area: 'mm', genre: 'hamburg',  name: 'KUA AINA 横浜赤レンガ倉庫店', lat: 35.45257, lng: 139.64295, note: 'ハワイのハンバーガー。' },
  { id: 'mm-023', area: 'mm', genre: 'hamburg',  name: '横浜 元町ドリア',         lat: 35.45364, lng: 139.63887, note: 'ドリア専門の洋食。ワールドポーターズ。' },
  { id: 'mm-024', area: 'mm', genre: 'hamburg',  name: 'BISTRO 石川亭',           lat: 35.45708, lng: 139.63216, note: 'カジュアルなフレンチ・洋食。' },

  // ---- イタリアン ----
  { id: 'mm-025', area: 'mm', genre: 'italian',  name: 'PORTICELLO',              lat: 35.45419, lng: 139.63804, note: 'ワールドポーターズのイタリアン。' },
  { id: 'mm-026', area: 'mm', genre: 'italian',  name: 'ATIMO',                   lat: 35.45932, lng: 139.63647, note: '海側のイタリアン。' },
  { id: 'mm-027', area: 'mm', genre: 'italian',  name: 'ペッシェドーロ 横浜店',   lat: 35.45553, lng: 139.63236, note: '魚介のイタリアン。ランドマーク。' },
  { id: 'mm-028', area: 'mm', genre: 'italian',  name: 'goodspoon',               lat: 35.45456, lng: 139.64251, note: 'チーズとグリル。MARINE & WALK。' },

  // ---- 中華 ----
  { id: 'mm-029', area: 'mm', genre: 'chinese',  name: '梅蘭',                    lat: 35.45203, lng: 139.63107, note: '中華街発。あんで固めた「梅蘭焼きそば」。' },
  { id: 'mm-030', area: 'mm', genre: 'chinese',  name: 'Din Tai Fung',            lat: 35.45542, lng: 139.63232, note: '台湾の小籠包。ランドマークプラザ。' },
  { id: 'mm-031', area: 'mm', genre: 'chinese',  name: '陳麻婆豆腐 クイーンズスクエア店', lat: 35.45677, lng: 139.63363, note: '本場の麻婆豆腐。' },
  { id: 'mm-032', area: 'mm', genre: 'chinese',  name: '麻婆専門店 福満園',       lat: 35.45742, lng: 139.63233, note: '麻婆豆腐の専門店。' },
  { id: 'mm-033', area: 'mm', genre: 'chinese',  name: '中国美食 唐苑酒楼',       lat: 35.46053, lng: 139.62747, note: '新高島寄りの中華。' },

  // ---- ラーメン ----
  { id: 'mm-034', area: 'mm', genre: 'ramen',    name: 'AFURI',                   lat: 35.45562, lng: 139.63206, note: '柚子塩ラーメン。ランドマークプラザ。' },
  { id: 'mm-035', area: 'mm', genre: 'ramen',    name: 'Tsukemen TETSU',          lat: 35.45535, lng: 139.63158, note: 'つけ麺。焼き石でスープを温め直せる。' },
  { id: 'mm-036', area: 'mm', genre: 'ramen',    name: '博多だるま',              lat: 35.45731, lng: 139.63252, note: '博多とんこつ。' },
  { id: 'mm-037', area: 'mm', genre: 'ramen',    name: '麵屋 甍',                 lat: 35.45754, lng: 139.63333, note: '二郎系のラーメン。' },

  // ---- 寿司 ----
  { id: 'mm-038', area: 'mm', genre: 'sushi',    name: '銀座沼津港',              lat: 35.45641, lng: 139.63271, note: '回転寿司。クイーンズスクエア。' },
  { id: 'mm-039', area: 'mm', genre: 'sushi',    name: 'まぐろ問屋 めぐみ水産',   lat: 35.45694, lng: 139.63227, note: 'まぐろ中心の回転寿司。' },
  { id: 'mm-040', area: 'mm', genre: 'sushi',    name: '海風季',                  lat: 35.45204, lng: 139.63097, note: 'コレットマーレの寿司。' },

  // ---- 定食 ----
  { id: 'mm-041', area: 'mm', genre: 'teishoku', name: '銀座天國',                lat: 35.45529, lng: 139.63209, note: '天ぷらの老舗。天丼も。' },
  { id: 'mm-042', area: 'mm', genre: 'teishoku', name: '鎌倉かつ亭 あら珠',       lat: 35.45703, lng: 139.63217, note: 'とんかつ。クイーンズスクエア。' },
  { id: 'mm-043', area: 'mm', genre: 'teishoku', name: 'やわらかとんかつ かつ泉', lat: 35.45238, lng: 139.63093, note: 'とんかつ。コレットマーレ。' },
  { id: 'mm-044', area: 'mm', genre: 'teishoku', name: 'ローストビーフ星',        lat: 35.45461, lng: 139.63832, note: 'ローストビーフ丼。ワールドポーターズ。' },

  // ---- 居酒屋 ----
  { id: 'mm-045', area: 'mm', genre: 'izakaya',  name: '博多 もつ鍋 おおやま',    lat: 35.45520, lng: 139.63213, note: 'もつ鍋。ランドマークプラザ。' },
  { id: 'mm-046', area: 'mm', genre: 'izakaya',  name: '美食米門 横浜店',         lat: 35.45402, lng: 139.63856, note: '和食と釜炊きごはん。夜景の見える席も。' },
  { id: 'mm-047', area: 'mm', genre: 'izakaya',  name: 'たる平',                  lat: 35.45634, lng: 139.62958, note: 'みなとみらいの和風居酒屋。' },

  // ---- そば・うどん ----
  { id: 'mm-048', area: 'mm', genre: 'soba',     name: '石英',                    lat: 35.45713, lng: 139.63191, note: 'そば処。クイーンズスクエア。' },
  { id: 'mm-049', area: 'mm', genre: 'soba',     name: '田舎そば のぶや',         lat: 35.45896, lng: 139.62954, note: '新高島寄りのそば。' },

  // ---- 焼肉 / 焼き鳥 ----
  { id: 'mm-050', area: 'mm', genre: 'yakiniku', name: '山形牛焼肉・韓国料理 土古里', lat: 35.45220, lng: 139.63105, note: '山形牛の焼肉。コレットマーレ。' },
  { id: 'mm-051', area: 'mm', genre: 'yakitori', name: '郷どり燦鶏',              lat: 35.45253, lng: 139.63073, note: '地鶏の炭火焼き。コレットマーレ。' },
];
