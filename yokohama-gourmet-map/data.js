/* 横浜グルメマップ - エリア / ジャンル / スポットのデータ
 *
 * 座標は OpenStreetMap のデータをもとにしています。
 * © OpenStreetMap contributors (ODbL)
 *
 * スポットを増やすときは SPOTS に足すだけ。
 * id は一度決めたら変えないこと（localStorage の記録が id で紐づいているため）。
 */

const AREAS = [
  { id: 'noge',   name: '野毛',         center: [35.4478, 139.6296], zoom: 16.6 },
  { id: 'kannai', name: '関内',         center: [35.4437, 139.6385], zoom: 16.4 },
  { id: 'mm',     name: 'みなとみらい', center: [35.4576, 139.6320], zoom: 15.6 },
  { id: 'ykhm',   name: '横浜駅周辺',   center: [35.4660, 139.6220], zoom: 16.0 },
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
];
