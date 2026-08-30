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
];
