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
  { id: 'kannai', name: '関内',         center: [35.4437, 139.6385], zoom: 16.4, fitMin: 15.4 },
  { id: 'mm',     name: 'みなとみらい', center: [35.4576, 139.6320], zoom: 15.6, fitMin: 14.6 },
  { id: 'ykhm',   name: '横浜駅周辺',   center: [35.4660, 139.6220], zoom: 16.0, fitMin: 14.7 },
  { id: 'chuka',  name: '中華街',       center: [35.4430, 139.6455], zoom: 16.8, fitMin: 15.4 },
  { id: 'moto',   name: '元町・山手',   center: [35.4410, 139.6505], zoom: 16.2, fitMin: 15.1 },
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
  // ================= 横浜駅周辺（西口・東口・きた東口・鶴屋町） =================
  // ここも駅ビルと地下街のテナントが多いので、みなとみらいと同じく
  // 「施設そのもの」と「わざわざ行く価値のある店」の両方を入れている。
  // ---- 施設・その他 ----
  { id: 'ykhm-001', area: 'ykhm', genre: 'other',    name: '横浜ベイクォーター',      lat: 35.46695, lng: 139.62642, note: '東口の海沿い。テラス席のある店が多い。' },
  { id: 'ykhm-002', area: 'ykhm', genre: 'other',    name: '相鉄ジョイナス',          lat: 35.46550, lng: 139.62103, note: '西口の地下街。飲食店がぎっしり。' },
  { id: 'ykhm-003', area: 'ykhm', genre: 'other',    name: 'ニュウマン横浜',          lat: 35.46614, lng: 139.62177, note: 'JR横浜タワー。上層階にレストラン。' },
  { id: 'ykhm-004', area: 'ykhm', genre: 'other',    name: 'ルミネ横浜',              lat: 35.46542, lng: 139.62297, note: '駅直結。手軽に入れる店が多い。' },
  { id: 'ykhm-005', area: 'ykhm', genre: 'other',    name: 'そごう横浜店',            lat: 35.46532, lng: 139.62508, note: '東口。10階のレストラン街と地下の食品売り場。' },
  { id: 'ykhm-006', area: 'ykhm', genre: 'other',    name: '横浜髙島屋',              lat: 35.46590, lng: 139.62058, note: '西口。デパ地下とレストラン街。' },
  { id: 'ykhm-007', area: 'ykhm', genre: 'other',    name: '横浜ポルタ',              lat: 35.46500, lng: 139.62380, note: '東口の地下街。サッと食べたいときに。' },
  { id: 'ykhm-008', area: 'ykhm', genre: 'other',    name: '横浜駅西口五番街',        lat: 35.46450, lng: 139.62000, note: '西口の飲み屋が集まる通り。' },
  { id: 'ykhm-009', area: 'ykhm', genre: 'other',    name: '料亭 田中家',             lat: 35.47040, lng: 139.62378, note: '1863年創業の老舗料亭。坂本龍馬の妻おりょうが働いていたと伝わる。' },
  { id: 'ykhm-010', area: 'ykhm', genre: 'other',    name: '崎陽軒 横浜駅',           lat: 35.46450, lng: 139.62315, note: 'シウマイ。横浜の顔。' },
  { id: 'ykhm-011', area: 'ykhm', genre: 'other',    name: 'カレーハウスリオ',        lat: 35.46484, lng: 139.62085, note: '横浜の老舗カレー。' },

  // ---- 居酒屋 ----
  { id: 'ykhm-012', area: 'ykhm', genre: 'izakaya',  name: '豚の味珍',                lat: 35.46733, lng: 139.62268, note: '西口の名物。豚足・ミミ・ハツを三品で。' },
  { id: 'ykhm-013', area: 'ykhm', genre: 'izakaya',  name: '炭屋串兵衛',              lat: 35.46809, lng: 139.62320, note: '串焼きの大箱。ひとりでも入りやすい。' },
  { id: 'ykhm-014', area: 'ykhm', genre: 'izakaya',  name: '魚寅本店',                lat: 35.46749, lng: 139.62259, note: '魚がしっかりした酒場。' },
  { id: 'ykhm-015', area: 'ykhm', genre: 'izakaya',  name: '82 Ale House 横浜西口店',  lat: 35.46386, lng: 139.61855, note: 'ビアパブ。関内の 82 の系列。' },
  { id: 'ykhm-016', area: 'ykhm', genre: 'izakaya',  name: '立呑み魚参',              lat: 35.46408, lng: 139.61821, note: '西口の立ち飲み。魚がいい。' },

  // ---- 焼き鳥 ----
  { id: 'ykhm-017', area: 'ykhm', genre: 'yakitori', name: 'やきとり お加代 本店',    lat: 35.46765, lng: 139.62238, note: '西口で長く続く焼き鳥。' },
  { id: 'ykhm-018', area: 'ykhm', genre: 'yakitori', name: '炭火やきとり 伝兵衛',      lat: 35.46641, lng: 139.61760, note: '炭火の焼き鳥。' },
  { id: 'ykhm-019', area: 'ykhm', genre: 'yakitori', name: '一鶴',                    lat: 35.46474, lng: 139.61880, note: '香川の骨付鳥。おやどりとひなどり。' },
  { id: 'ykhm-020', area: 'ykhm', genre: 'yakitori', name: 'とり一',                  lat: 35.46452, lng: 139.62000, note: '五番街の焼き鳥。' },

  // ---- 焼肉 ----
  { id: 'ykhm-021', area: 'ykhm', genre: 'yakiniku', name: '焼肉 伽倻廊 横浜西口店',   lat: 35.46886, lng: 139.62144, note: '鶴屋町寄りの焼肉。' },
  { id: 'ykhm-022', area: 'ykhm', genre: 'yakiniku', name: '焼肉うしごろ',            lat: 35.46792, lng: 139.62311, note: '和牛の焼肉。' },

  // ---- 中華 ----
  { id: 'ykhm-023', area: 'ykhm', genre: 'chinese',  name: '龍味',                    lat: 35.46775, lng: 139.62154, note: '西口の町中華。餃子とタンメン。' },
  { id: 'ykhm-024', area: 'ykhm', genre: 'chinese',  name: '中国料理 煌蘭',           lat: 35.46820, lng: 139.62157, note: '西口の中華。' },
  { id: 'ykhm-025', area: 'ykhm', genre: 'chinese',  name: '四川料理 京華楼',         lat: 35.46790, lng: 139.62315, note: '本格的な四川料理。麻婆豆腐が辛い。' },
  { id: 'ykhm-026', area: 'ykhm', genre: 'chinese',  name: '東天閣',                  lat: 35.46927, lng: 139.61929, note: '鶴屋町の中華。' },

  // ---- ラーメン ----
  { id: 'ykhm-027', area: 'ykhm', genre: 'ramen',    name: '吉村家',                  lat: 35.46303, lng: 139.61507, note: '家系ラーメンの総本山。行列は覚悟。' },
  { id: 'ykhm-028', area: 'ykhm', genre: 'ramen',    name: '麺場 浜虎',               lat: 35.46893, lng: 139.62331, note: '鶴屋町の人気店。醤油と塩。' },
  { id: 'ykhm-029', area: 'ykhm', genre: 'ramen',    name: '横濱丿貫',                lat: 35.46411, lng: 139.62210, note: '煮干しの丿貫の駅前店。' },
  { id: 'ykhm-030', area: 'ykhm', genre: 'ramen',    name: '本丸亭 鶴屋町店',         lat: 35.46940, lng: 139.62398, note: '塩ラーメン。あっさりめ。' },
  { id: 'ykhm-031', area: 'ykhm', genre: 'ramen',    name: 'らーめん 山頭火',         lat: 35.46308, lng: 139.61663, note: '旭川の塩とんこつ。' },

  // ---- そば・うどん ----
  { id: 'ykhm-032', area: 'ykhm', genre: 'soba',     name: 'そば・天ぷら 角平',       lat: 35.46068, lng: 139.62016, note: 'つけ天そばの名店。平沼寄り。' },
  { id: 'ykhm-033', area: 'ykhm', genre: 'soba',     name: '更科一休 本店',           lat: 35.46615, lng: 139.61585, note: '西口の老舗そば。' },
  { id: 'ykhm-034', area: 'ykhm', genre: 'soba',     name: '味奈登庵 横浜天理ビル店', lat: 35.46728, lng: 139.61957, note: '「富士山盛り」の大盛りそば。' },

  // ---- 定食 ----
  { id: 'ykhm-035', area: 'ykhm', genre: 'teishoku', name: '勝烈庵 横浜西口店',       lat: 35.46578, lng: 139.62120, note: '馬車道の勝烈庵の駅前店。とんかつ。' },
  { id: 'ykhm-036', area: 'ykhm', genre: 'teishoku', name: '博多天ぷら たかお',       lat: 35.46476, lng: 139.62053, note: '揚げたての天ぷら定食。ジョイナス。' },
  { id: 'ykhm-037', area: 'ykhm', genre: 'teishoku', name: 'ねぎし',                  lat: 35.46443, lng: 139.61875, note: '牛たんととろろの定食。' },

  // ---- ハンバーグ・洋食 ----
  { id: 'ykhm-038', area: 'ykhm', genre: 'hamburg',  name: 'ハングリータイガー',      lat: 35.46720, lng: 139.62232, note: '横浜発のハンバーグ。目の前で仕上げてくれる。' },
  { id: 'ykhm-039', area: 'ykhm', genre: 'hamburg',  name: '横浜チーズカフェ',        lat: 35.46624, lng: 139.61769, note: 'チーズ料理と洋食。' },
  { id: 'ykhm-040', area: 'ykhm', genre: 'hamburg',  name: 'CALIFORNIA PLAYERS DINER', lat: 35.46382, lng: 139.61864, note: 'アメリカンなバーガーとダイナー。' },

  // ---- 寿司 ----
  { id: 'ykhm-041', area: 'ykhm', genre: 'sushi',    name: '鮨 こいづみ',             lat: 35.46924, lng: 139.62422, note: '鶴屋町の寿司。' },
  { id: 'ykhm-042', area: 'ykhm', genre: 'sushi',    name: '伸寿し',                  lat: 35.46743, lng: 139.62255, note: '西口の寿司屋。' },
  { id: 'ykhm-043', area: 'ykhm', genre: 'sushi',    name: '回し寿司 活',             lat: 35.46469, lng: 139.62491, note: '三浦三崎の回転寿司。' },

  // ---- イタリアン ----
  { id: 'ykhm-044', area: 'ykhm', genre: 'italian',  name: 'トラットリア ビコローレ ヨコハマ', lat: 35.46170, lng: 139.61958, note: '横浜を代表するイタリアンのひとつ。' },
  { id: 'ykhm-045', area: 'ykhm', genre: 'italian',  name: 'Osteria da Takashima',    lat: 35.46258, lng: 139.62257, note: '高島町寄りのオステリア。' },
  { id: 'ykhm-046', area: 'ykhm', genre: 'italian',  name: 'トラットリア フランコ',   lat: 35.46677, lng: 139.61759, note: '西口のイタリアン。' },

  // ---- カフェ・甘味 ----
  { id: 'ykhm-047', area: 'ykhm', genre: 'cafe',     name: 'サモアール 横浜髙島屋店', lat: 35.46534, lng: 139.62085, note: '紅茶の専門店。' },
  { id: 'ykhm-048', area: 'ykhm', genre: 'cafe',     name: '横濱珈琲店 五番街',       lat: 35.46450, lng: 139.62011, note: '五番街の喫茶。朝から開いている。' },
  { id: 'ykhm-049', area: 'ykhm', genre: 'cafe',     name: '珈琲問屋',                lat: 35.46742, lng: 139.61714, note: '豆を選んでその場で焙煎してもらえる。' },
  { id: 'ykhm-050', area: 'ykhm', genre: 'cafe',     name: 'THE CITY BAKERY ニュウマン横浜', lat: 35.46715, lng: 139.62281, note: 'ベーカリーカフェ。' },
  { id: 'ykhm-051', area: 'ykhm', genre: 'cafe',     name: '和菓子 伊勢屋',           lat: 35.46078, lng: 139.61487, note: '平沼の和菓子屋。' },
  // ================= 中華街（山下町） =================
  // ---- 中華 ----
  { id: 'chuka-001', area: 'chuka', genre: 'chinese',  name: '海員閣',            lat: 35.44304, lng: 139.64574, note: '1936年創業。牛肉飯とワンタンめん。' },
  { id: 'chuka-002', area: 'chuka', genre: 'chinese',  name: '清風楼',            lat: 35.44241, lng: 139.64651, note: '焼売の名店。皮が薄い。' },
  { id: 'chuka-003', area: 'chuka', genre: 'chinese',  name: '保昌',              lat: 35.44261, lng: 139.64575, note: '牛肉の腐乳炒めが看板。' },
  { id: 'chuka-004', area: 'chuka', genre: 'chinese',  name: '山東 一号店',       lat: 35.44378, lng: 139.64593, note: '水餃子。よく行列ができる。' },
  { id: 'chuka-005', area: 'chuka', genre: 'chinese',  name: '謝甜記 本店',       lat: 35.44364, lng: 139.64690, note: '中華粥の老舗。朝から開いている。' },
  { id: 'chuka-006', area: 'chuka', genre: 'chinese',  name: '南粤美食',          lat: 35.44375, lng: 139.64693, note: '本格的な広東料理。' },
  { id: 'chuka-007', area: 'chuka', genre: 'chinese',  name: '華正樓 新館',       lat: 35.44367, lng: 139.64662, note: '広東料理の老舗。' },
  { id: 'chuka-008', area: 'chuka', genre: 'chinese',  name: '重慶飯店',          lat: 35.44401, lng: 139.64701, note: '四川料理の老舗。番餅も有名。' },
  { id: 'chuka-009', area: 'chuka', genre: 'chinese',  name: '中華菜館 同發 本館', lat: 35.44336, lng: 139.64605, note: '焼味（チャーシューなど）が名物。' },
  { id: 'chuka-010', area: 'chuka', genre: 'chinese',  name: '菜香',              lat: 35.44312, lng: 139.64688, note: '点心の広東料理。' },
  { id: 'chuka-011', area: 'chuka', genre: 'chinese',  name: '四五六菜館 本館',   lat: 35.44280, lng: 139.64635, note: '上海料理。' },
  { id: 'chuka-012', area: 'chuka', genre: 'chinese',  name: '京華樓 本館',       lat: 35.44233, lng: 139.64594, note: '四川料理。麻婆豆腐。' },
  { id: 'chuka-013', area: 'chuka', genre: 'chinese',  name: '招福門',            lat: 35.44283, lng: 139.64791, note: '飲茶の食べ放題。' },
  { id: 'chuka-014', area: 'chuka', genre: 'chinese',  name: '鵬天閣',            lat: 35.44347, lng: 139.64677, note: '焼き小籠包。食べ歩きにも。' },
  { id: 'chuka-015', area: 'chuka', genre: 'chinese',  name: '王府井 本店',       lat: 35.44343, lng: 139.64645, note: '焼き小籠包の食べ歩き。' },
  { id: 'chuka-016', area: 'chuka', genre: 'chinese',  name: '慶華飯店',          lat: 35.44373, lng: 139.64535, note: '生煎包（焼き小籠包）。' },
  { id: 'chuka-017', area: 'chuka', genre: 'chinese',  name: '安記',              lat: 35.44313, lng: 139.64560, note: '老舗の広東料理。' },
  { id: 'chuka-018', area: 'chuka', genre: 'chinese',  name: '三和楼',            lat: 35.44243, lng: 139.64665, note: '上海料理の老舗。' },
  { id: 'chuka-019', area: 'chuka', genre: 'chinese',  name: '秀味園',            lat: 35.44233, lng: 139.64685, note: '魯肉飯（ルーロー飯）。' },
  { id: 'chuka-020', area: 'chuka', genre: 'chinese',  name: '萬来亭',            lat: 35.44144, lng: 139.64672, note: '上海焼きそば。中華街の南のはずれ。' },
  { id: 'chuka-021', area: 'chuka', genre: 'chinese',  name: '馬さんの店 龍仙 本館', lat: 35.44245, lng: 139.64404, note: '朝がゆ。早い時間から開いている。' },
  { id: 'chuka-022', area: 'chuka', genre: 'chinese',  name: '福満園 本店',       lat: 35.44333, lng: 139.64324, note: '四川料理。' },
  { id: 'chuka-023', area: 'chuka', genre: 'chinese',  name: '景徳鎮',            lat: 35.44274, lng: 139.64637, note: '四川料理。麻婆豆腐が辛い。' },
  { id: 'chuka-024', area: 'chuka', genre: 'chinese',  name: '広東料理 吉兆',     lat: 35.44369, lng: 139.64608, note: '広東料理。' },
  { id: 'chuka-025', area: 'chuka', genre: 'chinese',  name: '東光飯店 本館',     lat: 35.44316, lng: 139.64362, note: '中華街の西寄り。' },
  { id: 'chuka-026', area: 'chuka', genre: 'chinese',  name: '大珍楼',            lat: 35.44301, lng: 139.64452, note: '大通りの大箱。食べ放題も。' },
  { id: 'chuka-027', area: 'chuka', genre: 'chinese',  name: '翠鳳 本店',         lat: 35.44287, lng: 139.64692, note: '広東料理。' },
  { id: 'chuka-028', area: 'chuka', genre: 'chinese',  name: '東天紅',            lat: 35.44661, lng: 139.64577, note: '山下町の北寄り。' },

  // ---- ラーメン ----
  { id: 'chuka-029', area: 'chuka', genre: 'ramen',    name: '一楽',              lat: 35.44341, lng: 139.64551, note: '中華街の中華そば。' },
  { id: 'chuka-030', area: 'chuka', genre: 'ramen',    name: '長崎ちゃんぽん 長崎屋', lat: 35.44371, lng: 139.64688, note: 'ちゃんぽんと皿うどん。' },

  // ---- カフェ・甘味 ----
  { id: 'chuka-031', area: 'chuka', genre: 'cafe',     name: '悟空茶荘',          lat: 35.44193, lng: 139.64554, note: '中国茶館。2階でゆっくりお茶を。' },
  { id: 'chuka-032', area: 'chuka', genre: 'cafe',     name: 'Cafe Giang',        lat: 35.44384, lng: 139.64727, note: 'ベトナムのエッグコーヒー。' },
  { id: 'chuka-033', area: 'chuka', genre: 'cafe',     name: 'MeetFresh 鮮芋仙',  lat: 35.44330, lng: 139.64898, note: '台湾スイーツ。豆花や芋圓。' },
  { id: 'chuka-034', area: 'chuka', genre: 'cafe',     name: '幸せのパンケーキ',  lat: 35.44280, lng: 139.64812, note: 'ふわふわのパンケーキ。' },
  { id: 'chuka-035', area: 'chuka', genre: 'cafe',     name: 'かをり',            lat: 35.44560, lng: 139.64353, note: 'レーズンサンドで知られる洋菓子店。' },
  { id: 'chuka-036', area: 'chuka', genre: 'cafe',     name: 'ストラスブール',    lat: 35.44647, lng: 139.64352, note: '山下町の洋菓子店。' },

  // ---- そば・うどん ----
  { id: 'chuka-037', area: 'chuka', genre: 'soba',     name: '横浜 晋山',         lat: 35.44179, lng: 139.64818, note: '中華街のなかのそば屋。' },
  { id: 'chuka-038', area: 'chuka', genre: 'soba',     name: '花津月',            lat: 35.44489, lng: 139.64520, note: '山下町のそばと和食。' },

  // ---- 焼き鳥 ----
  { id: 'chuka-039', area: 'chuka', genre: 'yakitori', name: 'おさ亭',            lat: 35.44283, lng: 139.64866, note: '中華街の東門寄りの鶏料理。' },
  { id: 'chuka-040', area: 'chuka', genre: 'yakitori', name: '友酒家',            lat: 35.44185, lng: 139.64853, note: '炭火の鶏。' },

  // ---- イタリアン ----
  { id: 'chuka-041', area: 'chuka', genre: 'italian',  name: 'SALONE 2007',       lat: 35.44301, lng: 139.64867, note: '中華街のはずれのイタリアン。' },
  { id: 'chuka-042', area: 'chuka', genre: 'italian',  name: 'Roma Statione',     lat: 35.44553, lng: 139.64728, note: '山下町のイタリアン。' },

  // ---- 焼肉 / ハンバーグ / 居酒屋 / 定食 ----
  { id: 'chuka-043', area: 'chuka', genre: 'yakiniku', name: 'Lonestar Smoke House', lat: 35.44442, lng: 139.64262, note: 'アメリカ式のスモークバーベキュー。' },
  { id: 'chuka-044', area: 'chuka', genre: 'hamburg',  name: 'Flashback Cafe',    lat: 35.44412, lng: 139.64243, note: '山下公園寄りのバーガー。' },
  { id: 'chuka-045', area: 'chuka', genre: 'izakaya',  name: '海乃家',            lat: 35.44430, lng: 139.64401, note: '山下町の酒場。' },
  { id: 'chuka-046', area: 'chuka', genre: 'teishoku', name: 'どん八 山下町店',   lat: 35.44700, lng: 139.64578, note: '丼と定食。' },

  // ---- その他 ----
  { id: 'chuka-047', area: 'chuka', genre: 'other',    name: '江戸清',            lat: 35.44233, lng: 139.64582, note: '中華街のブタまん。食べ歩きの定番。' },
  { id: 'chuka-048', area: 'chuka', genre: 'other',    name: '聘珍大甘栗',        lat: 35.44389, lng: 139.64805, note: '甘栗。おみやげにも。' },
  { id: 'chuka-049', area: 'chuka', genre: 'other',    name: 'ちまき屋',          lat: 35.44303, lng: 139.64718, note: 'ちまきの専門店。' },
  { id: 'chuka-050', area: 'chuka', genre: 'other',    name: 'ホフブロウ',        lat: 35.44586, lng: 139.64672, note: '1949年創業のドイツ料理。' },
  { id: 'chuka-051', area: 'chuka', genre: 'other',    name: 'Alte Liebe',        lat: 35.44613, lng: 139.64249, note: '山下公園寄りの一軒。' },

  // ================= 元町・山手（元町商店街・山手・石川町） =================
  // ---- カフェ・甘味 ----
  { id: 'moto-001', area: 'moto', genre: 'cafe',     name: 'ウチキパン',          lat: 35.44092, lng: 139.65064, note: '1888年創業。イングランド食パン。' },
  { id: 'moto-002', area: 'moto', genre: 'cafe',     name: '喜久家洋菓子舗',      lat: 35.44070, lng: 139.64876, note: '1946年創業。ラムボール。' },
  { id: 'moto-003', area: 'moto', genre: 'cafe',     name: 'えの木てい',          lat: 35.43756, lng: 139.65200, note: '山手の洋館カフェ。チェリーサンド。' },
  { id: 'moto-004', area: 'moto', genre: 'cafe',     name: 'Café the Rose',       lat: 35.43880, lng: 139.65483, note: '山手111番館の中。バラ園を見ながら。' },
  { id: 'moto-005', area: 'moto', genre: 'cafe',     name: 'BLUFF BAKERY',        lat: 35.43906, lng: 139.64977, note: '山手のベーカリー。' },
  { id: 'moto-006', area: 'moto', genre: 'cafe',     name: 'ブラフベーカリー 元町', lat: 35.43843, lng: 139.64970, note: 'もう一軒のブラフベーカリー。' },
  { id: 'moto-007', area: 'moto', genre: 'cafe',     name: 'ミカフェート',        lat: 35.44056, lng: 139.64943, note: 'コーヒーの専門店。' },
  { id: 'moto-008', area: 'moto', genre: 'cafe',     name: '昭和ベーカリー',      lat: 35.44070, lng: 139.64962, note: '元町のパン屋。' },
  { id: 'moto-009', area: 'moto', genre: 'cafe',     name: 'サンドグラス',        lat: 35.44064, lng: 139.64907, note: '紅茶とサンドイッチ。' },
  { id: 'moto-010', area: 'moto', genre: 'cafe',     name: 'オリーブ',            lat: 35.44042, lng: 139.64874, note: '元町の喫茶。' },
  { id: 'moto-011', area: 'moto', genre: 'cafe',     name: '茶倉',                lat: 35.43995, lng: 139.64987, note: '日本茶のカフェ。' },
  { id: 'moto-012', area: 'moto', genre: 'cafe',     name: 'キャラバンコーヒースタンド', lat: 35.44225, lng: 139.65036, note: '自家焙煎のコーヒースタンド。' },
  { id: 'moto-013', area: 'moto', genre: 'cafe',     name: 'パブロフ',            lat: 35.44230, lng: 139.64938, note: 'プリンで知られる洋菓子店。' },
  { id: 'moto-014', area: 'moto', genre: 'cafe',     name: 'カフェエリオットアヴェニュー', lat: 35.44338, lng: 139.65218, note: 'スペシャルティコーヒー。' },
  { id: 'moto-015', area: 'moto', genre: 'cafe',     name: 'フリッパーズ',        lat: 35.44123, lng: 139.65011, note: 'スフレパンケーキ。' },
  { id: 'moto-016', area: 'moto', genre: 'cafe',     name: '炭火焙煎珈琲 無',     lat: 35.44121, lng: 139.64998, note: '炭火で焙煎するコーヒー。' },
  { id: 'moto-017', area: 'moto', genre: 'cafe',     name: 'バイミー スタンド',   lat: 35.43942, lng: 139.64983, note: '山手のコーヒースタンド。' },
  { id: 'moto-018', area: 'moto', genre: 'cafe',     name: 'パティ・カフェ',      lat: 35.43898, lng: 139.64974, note: '山手のカフェ。' },
  { id: 'moto-019', area: 'moto', genre: 'cafe',     name: 'Marks house Cafe',    lat: 35.43920, lng: 139.65266, note: '山手の洋館まわりのカフェ。' },
  { id: 'moto-020', area: 'moto', genre: 'cafe',     name: 'しょうゆ・きゃふぇ',  lat: 35.43753, lng: 139.65131, note: '山手の小さなカフェ。' },
  { id: 'moto-021', area: 'moto', genre: 'cafe',     name: 'ラ・テイエール',      lat: 35.44259, lng: 139.65369, note: '紅茶の店。' },
  { id: 'moto-022', area: 'moto', genre: 'cafe',     name: 'Marine Bakery',       lat: 35.44261, lng: 139.65375, note: '石川町寄りのベーカリー。' },
  { id: 'moto-023', area: 'moto', genre: 'cafe',     name: '茶つぼ',              lat: 35.43884, lng: 139.64806, note: '山手の甘味処。' },

  // ---- その他（フレンチ・洋館・カレーなど） ----
  { id: 'moto-024', area: 'moto', genre: 'other',    name: '仏蘭西料亭 横濱元町 霧笛楼', lat: 35.44031, lng: 139.64910, note: '1981年創業。元町のフランス料理。' },
  { id: 'moto-025', area: 'moto', genre: 'other',    name: '霧笛楼 カフェ・ネクストドア', lat: 35.44024, lng: 139.64903, note: '霧笛楼の隣。ケーキと軽食。' },
  { id: 'moto-026', area: 'moto', genre: 'other',    name: 'コーヒーハウス ザ・カフェ', lat: 35.44482, lng: 139.64999, note: 'ホテルニューグランド。ドリアとナポリタンの発祥の店。' },
  { id: 'moto-027', area: 'moto', genre: 'other',    name: 'ロビーラウンジ ラ・テラス', lat: 35.44489, lng: 139.64949, note: 'ホテルニューグランドのラウンジ。' },
  { id: 'moto-028', area: 'moto', genre: 'other',    name: '山手十番館',          lat: 35.43885, lng: 139.65258, note: '山手の洋館レストラン。外人墓地のとなり。' },
  { id: 'moto-029', area: 'moto', genre: 'other',    name: 'アルペンジロー',      lat: 35.44240, lng: 139.64920, note: '横浜のカレーの名店。' },
  { id: 'moto-030', area: 'moto', genre: 'other',    name: 'ビストロ エルエラ',   lat: 35.43999, lng: 139.64838, note: '元町のビストロ。' },
  { id: 'moto-031', area: 'moto', genre: 'other',    name: 'ブラッスリー アルティザン', lat: 35.44098, lng: 139.65036, note: '元町のブラッスリー。' },
  { id: 'moto-032', area: 'moto', genre: 'other',    name: 'ST',                  lat: 35.43883, lng: 139.64970, note: '山手のフランス料理。' },
  { id: 'moto-033', area: 'moto', genre: 'other',    name: 'ドゥ エピセ',         lat: 35.44046, lng: 139.64887, note: '元町の中国料理。落ち着いた一軒。' },
  { id: 'moto-034', area: 'moto', genre: 'other',    name: 'JH Cafe',             lat: 35.43929, lng: 139.64794, note: '山手のカフェ＆バー。' },
  { id: 'moto-035', area: 'moto', genre: 'other',    name: 'うるうるま',          lat: 35.44187, lng: 139.65548, note: '石川町寄りの一軒。' },

  // ---- イタリアン ----
  { id: 'moto-036', area: 'moto', genre: 'italian',  name: 'イル・ジャルディーノ', lat: 35.44466, lng: 139.64991, note: 'ホテルニューグランドのイタリアン。' },
  { id: 'moto-037', area: 'moto', genre: 'italian',  name: 'Ristorante Papa Davide', lat: 35.44264, lng: 139.65054, note: '元町のイタリアン。' },
  { id: 'moto-038', area: 'moto', genre: 'italian',  name: 'リオス ボングスタイオ', lat: 35.44126, lng: 139.64968, note: '元町のイタリアン。' },
  { id: 'moto-039', area: 'moto', genre: 'italian',  name: 'チーチョス',          lat: 35.43949, lng: 139.64707, note: '山手のピッツェリア。' },
  { id: 'moto-040', area: 'moto', genre: 'italian',  name: 'KANDY',               lat: 35.43942, lng: 139.64793, note: '山手のイタリアン。' },
  { id: 'moto-041', area: 'moto', genre: 'italian',  name: 'ラ・タッパ フィッサ', lat: 35.43936, lng: 139.64710, note: '山手のイタリアン。' },

  // ---- ハンバーグ・洋食 ----
  { id: 'moto-042', area: 'moto', genre: 'hamburg',  name: 'フィッシャーマンズワーフ', lat: 35.44135, lng: 139.65070, note: '元町の洋食。海の見えるつくり。' },
  { id: 'moto-043', area: 'moto', genre: 'hamburg',  name: "Cinnamon's Restaurant", lat: 35.44285, lng: 139.65071, note: 'ハワイのパンケーキとロコモコ。' },
  { id: 'moto-044', area: 'moto', genre: 'hamburg',  name: "Egg'n Things",        lat: 35.44464, lng: 139.65029, note: 'ハワイのパンケーキとオムレツ。' },
  { id: 'moto-045', area: 'moto', genre: 'hamburg',  name: "codie's",             lat: 35.44205, lng: 139.65479, note: '石川町寄りのバーガー。' },

  // ---- ラーメン / 寿司 / 焼肉 / 居酒屋 / 中華 ----
  { id: 'moto-046', area: 'moto', genre: 'ramen',    name: '塩らー麺 本丸亭',     lat: 35.44033, lng: 139.64997, note: '塩ラーメン。元町。' },
  { id: 'moto-047', area: 'moto', genre: 'ramen',    name: '下前商店',            lat: 35.44044, lng: 139.65094, note: 'ラーメンとカレー。' },
  { id: 'moto-048', area: 'moto', genre: 'sushi',    name: '三郎寿司',            lat: 35.44036, lng: 139.65059, note: '元町の寿司。' },
  { id: 'moto-049', area: 'moto', genre: 'yakiniku', name: '肉山 横浜',           lat: 35.44080, lng: 139.64972, note: '肉をどんと。予約制。' },
  { id: 'moto-050', area: 'moto', genre: 'izakaya',  name: 'たまや',              lat: 35.43976, lng: 139.64785, note: '山手の炭火焼きの酒場。' },
  { id: 'moto-051', area: 'moto', genre: 'chinese',  name: '興華菜館',            lat: 35.44257, lng: 139.65468, note: '石川町寄りの中華。' },
];
