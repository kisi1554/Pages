'use strict';

/*
 * でんしゃの ものしりデータ
 *  - data.js の LINES / ALL_STATIONS をもとに、会話で使える「知識」を組み立てる。
 *  - 駅名 → どの路線か / となりの駅 / のりかえ / 経路さがし
 *  - 路線 → 何色か / 何駅か / どこからどこまでか
 *  - キャラクター(路線ごとの でんしゃの子)の設定
 * すべて手元のデータだけで動く。通信は一切しない。
 */

/* ==================================================================
 * 1. 駅の索引
 * ================================================================== */

/* 駅名(漢字) → その駅がある路線の一覧 [{line, index}] */
const STATION_INDEX = {};
LINES.forEach((line) => {
  line.stations.forEach((st, index) => {
    if (!STATION_INDEX[st.name]) STATION_INDEX[st.name] = [];
    STATION_INDEX[st.name].push({ line, index });
  });
});

/* よみ(ひらがな) → 駅名(漢字)。同じよみが複数あっても最初のものでよい */
const STATION_BY_YOMI = {};
ALL_STATIONS.forEach((st) => {
  if (!STATION_BY_YOMI[st.yomi]) STATION_BY_YOMI[st.yomi] = st.name;
});

/* のりかえ駅(2つ以上の路線がとおる駅)を、路線数の多い順に */
const TRANSFER_STATIONS = Object.keys(STATION_INDEX)
  .filter((name) => STATION_INDEX[name].length >= 2)
  .sort((a, b) => STATION_INDEX[b].length - STATION_INDEX[a].length);

function stationYomi(name) {
  const entry = STATION_INDEX[name];
  if (!entry) return name;
  return entry[0].line.stations[entry[0].index].yomi;
}

function stationMotif(name) {
  const entry = STATION_INDEX[name];
  if (!entry) return '🚉';
  return entry[0].line.stations[entry[0].index].motif;
}

/* その駅がとおっている路線 */
function linesOf(name) {
  return (STATION_INDEX[name] || []).map((e) => e.line);
}

/* 路線の中での となりの駅 { prev, next } */
function neighborsOn(name, line) {
  const entry = (STATION_INDEX[name] || []).find((e) => e.line.id === line.id);
  if (!entry) return { prev: null, next: null };
  const list = line.stations;
  return {
    prev: entry.index > 0 ? list[entry.index - 1].name : null,
    next: entry.index < list.length - 1 ? list[entry.index + 1].name : null,
  };
}

/* どの路線でもいいので となりの駅ぜんぶ */
function allNeighbors(name) {
  const out = [];
  (STATION_INDEX[name] || []).forEach((e) => {
    const n = neighborsOn(name, e.line);
    if (n.prev) out.push({ name: n.prev, line: e.line });
    if (n.next) out.push({ name: n.next, line: e.line });
  });
  return out;
}

/* ==================================================================
 * 2. 路線の色を ことばにする
 * ================================================================== */

function hexToHsl(hex) {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16) / 255;
  const g = parseInt(m.substring(2, 4), 16) / 255;
  const b = parseInt(m.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}

/* 色の名前(子どもがそのまま言えることば) */
function colorNameOf(hex) {
  const { h, s, l } = hexToHsl(hex);
  if (s < 0.18) return l > 0.8 ? 'しろ' : l < 0.3 ? 'くろ' : 'ぎんいろ';
  if (h < 12 || h >= 345) return l > 0.6 ? 'ピンク' : 'あか';
  if (h < 40) return l < 0.45 ? 'ちゃいろ' : 'オレンジ';
  if (h < 65) return 'きいろ';
  if (h < 90) return 'きみどり';
  if (h < 180) return 'みどり';
  if (h < 200) return 'みずいろ';
  if (h < 250) return 'あお';
  if (h < 290) return 'むらさき';
  if (h < 330) return 'ピンク';
  return 'あか';
}

/* 自動判定だと ずれてしまう路線は、手で いろの名前を きめておく */
const LINE_COLOR_OVERRIDE = {
  'metro-hibiya': 'ぎんいろ',
  'metro-yurakucho': 'きいろ',
  'metro-fukutoshin': 'ちゃいろ',
  'metro-namboku': 'みどり',
};

const LINE_COLOR_NAME = {};
LINES.forEach((line) => {
  LINE_COLOR_NAME[line.id] = LINE_COLOR_OVERRIDE[line.id] || colorNameOf(line.color);
});

/* ==================================================================
 * 3. 路線を ことばで さがす
 * ================================================================== */

/* 路線名の よびかた。data.js の name のほかに、子どもが言いそうな名前を足す */
const LINE_ALIASES = {
  yamanote: ['やまのて', '山手', 'やまのてせん'],
  'keihin-tohoku': ['けいひんとうほく', '京浜東北', 'けいひん', 'ねぎし', '根岸'],
  'tokyu-toyoko': ['とうよこ', '東横', 'とうよこせん'],
  'tokyu-meguro': ['めぐろせん', '目黒線'],
  'tokyu-denentoshi': ['でんえんとし', '田園都市', 'でんとし'],
  'tokyu-oimachi': ['おおいまち', '大井町'],
  'tokyu-ikegami': ['いけがみ', '池上'],
  'tokyu-tamagawa': ['たまがわせん', '多摩川線'],
  'tokyu-setagaya': ['せたがや', '世田谷'],
  'tokyu-shinyokohama': ['とうきゅうしんよこはま'],
  'tokyu-kodomonokuni': ['こどものくに', 'こどもの国'],
  'yokohama-blue': ['ブルーライン', 'ぶるーらいん', 'よこはまのちかてつ'],
  'yokohama-green': ['グリーンライン', 'ぐりーんらいん'],
  'sotetsu-main': ['そうてつ', '相鉄', 'そうてつほんせん'],
  'sotetsu-izumino': ['いずみの', '泉野'],
  'sotetsu-shinyokohama': ['そうてつしんよこはま'],
  'odakyu-odawara': ['おだきゅう', '小田急', 'おだわらせん', 'ロマンスカー', 'ろまんすかー'],
  'odakyu-enoshima': ['えのしません', '江ノ島線', 'えのしま'],
  'odakyu-tama': ['おだきゅうたません'],
  'metro-ginza': ['ぎんざせん', '銀座線', 'ぎんざ'],
  'metro-marunouchi': ['まるのうち', '丸ノ内'],
  'metro-marunouchi-honancho': ['ほうなんちょう', '方南町'],
  'metro-hibiya': ['ひびや', '日比谷'],
  'metro-tozai': ['とうざい', '東西'],
  'metro-chiyoda': ['ちよだ', '千代田'],
  'metro-yurakucho': ['ゆうらくちょうせん', '有楽町線'],
  'metro-hanzomon': ['はんぞうもん', '半蔵門'],
  'metro-namboku': ['なんぼく', '南北'],
  'metro-fukutoshin': ['ふくとしん', '副都心'],
};

/* さがす用に、ながい名前から順に ならべた辞書をつくる */
const LINE_LOOKUP = [];
LINES.forEach((line) => {
  const words = [line.name].concat(LINE_ALIASES[line.id] || []);
  words.forEach((w) => LINE_LOOKUP.push({ word: w, line }));
});
LINE_LOOKUP.sort((a, b) => b.word.length - a.word.length);

/* ==================================================================
 * 4. 駅を ことばで さがす
 * ================================================================== */

/* カタカナ → ひらがな、記号や空白をとる */
function normalize(text) {
  if (!text) return '';
  return String(text)
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s、。,.!！?？「」『』・ー〜~]/g, '')
    .toLowerCase();
}

/*
 * さがす用の駅辞書。ながい順に しらべて、みじかい名前が わりこまないようにする。
 *  - kanji: 漢字表記(そのまま さがす)
 *  - kana : よみ(カタカナ→ひらがなに そろえた ぶんしょうから さがす)
 * よみが 2もじ 以下のものは「みた」「せん」のような ふつうの ことばと
 * まちがえやすいので、うしろに「えき」が ついている ときだけ ひろう。
 */
const STATION_LOOKUP = [];
ALL_STATIONS.forEach((st) => {
  STATION_LOOKUP.push({ word: st.name, name: st.name, kana: false });
  const y = normalize(st.yomi);
  if (y && y !== st.name) STATION_LOOKUP.push({ word: y, name: st.name, kana: true });
});
STATION_LOOKUP.sort((a, b) => b.word.length - a.word.length);

/*
 * よみで みつけた とき、ほんとうに 駅名として 使われているかを たしかめる。
 *  - 2もじ以下(「みた」など)は うしろに「えき」が いる
 *  - 4もじ以下は うしろが 助詞など の きれめ でないと ひろわない
 *    (「わかんない」の中の「かんない」を 関内 と まちがえないため)
 * 5もじ以上は そのまま 信じてよい。
 */
const PARTICLE_1 = 'にへでのはがともやだ';
const PARTICLE_2 = ['えき', 'まで', 'から', 'って', 'では', 'には'];

function kanaBoundaryOk(target, at, len) {
  const after = target.substring(at + len);
  if (len <= 2) return after.indexOf('えき') === 0;
  if (len >= 5) return true;
  if (after === '') return true;
  if (PARTICLE_2.some((p) => after.indexOf(p) === 0)) return true;
  return PARTICLE_1.indexOf(after.charAt(0)) >= 0;
}

/* 見つかった駅を「ことばに出てきた じゅんばん」で かえす */
function findStations(text) {
  const raw = String(text || '');
  const norm = normalize(raw);
  const hits = [];
  const usedRaw = [];
  const usedNorm = [];

  function overlaps(list, start, end) {
    return list.some((u) => start < u.end && end > u.start);
  }

  STATION_LOOKUP.forEach((entry) => {
    if (hits.length >= 4) return;
    if (hits.some((h) => h.name === entry.name)) return;

    const target = entry.kana ? norm : raw;
    const used = entry.kana ? usedNorm : usedRaw;
    const w = entry.word;
    let from = 0;
    for (;;) {
      const at = target.indexOf(w, from);
      if (at < 0) break;
      from = at + 1;
      if (entry.kana && !kanaBoundaryOk(target, at, w.length)) continue;
      if (overlaps(used, at, at + w.length)) continue;
      used.push({ start: at, end: at + w.length });
      /* 漢字とよみで ながさが ちがうので、位置は もとの文の わりあいで そろえる */
      const ratio = target.length > 0 ? at / target.length : 0;
      hits.push({ name: entry.name, at: ratio });
      break;
    }
  });

  hits.sort((a, b) => a.at - b.at);
  return hits.map((h) => h.name);
}

function findLine(text) {
  const norm = normalize(text);
  const raw = String(text || '');
  const hit = LINE_LOOKUP.find(
    (entry) => norm.indexOf(normalize(entry.word)) >= 0 || raw.indexOf(entry.word) >= 0
  );
  return hit ? hit.line : null;
}

/* ==================================================================
 * 5. 経路さがし(〇〇から 〇〇まで)
 * ================================================================== */

/*
 * 状態を (駅, 路線) にして、駅ひとつ進む = 1、のりかえ = 4 のコストで
 * いちばん安い行き方をさがす(ダイクストラ)。のりかえの少ない道が選ばれる。
 */
function findRoute(fromName, toName) {
  if (!STATION_INDEX[fromName] || !STATION_INDEX[toName]) return null;
  if (fromName === toName) return null;

  const dist = {};
  const prev = {};
  const queue = [];

  function push(key, cost, node, via) {
    if (dist[key] !== undefined && dist[key] <= cost) return;
    dist[key] = cost;
    prev[key] = via;
    queue.push({ key, cost, node });
  }

  STATION_INDEX[fromName].forEach((e) => {
    push(fromName + '@' + e.line.id, 0, { name: fromName, line: e.line }, null);
  });

  let goalKey = null;
  let guard = 0;
  while (queue.length > 0 && guard < 200000) {
    guard += 1;
    let bestAt = 0;
    for (let i = 1; i < queue.length; i += 1) {
      if (queue[i].cost < queue[bestAt].cost) bestAt = i;
    }
    const cur = queue.splice(bestAt, 1)[0];
    if (cur.cost > dist[cur.key]) continue;
    if (cur.node.name === toName) {
      goalKey = cur.key;
      break;
    }

    const { name, line } = cur.node;
    const n = neighborsOn(name, line);
    [n.prev, n.next].forEach((nextName) => {
      if (!nextName) return;
      const key = nextName + '@' + line.id;
      push(key, cur.cost + 1, { name: nextName, line }, cur.key);
    });
    /* のりかえ */
    (STATION_INDEX[name] || []).forEach((e) => {
      if (e.line.id === line.id) return;
      const key = name + '@' + e.line.id;
      push(key, cur.cost + 4, { name, line: e.line }, cur.key);
    });
  }

  if (!goalKey) return null;

  /* 逆にたどって、路線ごとの区間にまとめる */
  const path = [];
  let key = goalKey;
  while (key) {
    const at = key.lastIndexOf('@');
    path.unshift({ name: key.substring(0, at), lineId: key.substring(at + 1) });
    key = prev[key];
  }

  const legs = [];
  path.forEach((step) => {
    const last = legs[legs.length - 1];
    if (last && last.lineId === step.lineId) {
      last.stations.push(step.name);
    } else {
      legs.push({ lineId: step.lineId, stations: [step.name] });
    }
  });

  /* のりかえだけの区間(駅1つ)は、前の区間の終わりとして扱う */
  const clean = legs.filter((leg) => leg.stations.length >= 2);
  if (clean.length === 0) return null;

  let hops = 0;
  clean.forEach((leg) => {
    hops += leg.stations.length - 1;
  });

  return {
    from: fromName,
    to: toName,
    legs: clean.map((leg) => ({
      line: LINE_BY_ID[leg.lineId],
      stations: leg.stations,
      hops: leg.stations.length - 1,
    })),
    hops,
    transfers: clean.length - 1,
  };
}

/* ==================================================================
 * 6. 駅の おはなしのタネ
 * ================================================================== */

/* 有名な駅の、子ども向けの ひとこと */
const STATION_TALK = {
  東京: 'あかい レンガの おおきな えきだよ。しんかんせんが たくさん あつまるんだ',
  上野: 'パンダの いる どうぶつえんが すぐ そばに あるよ',
  浅草: 'おおきな あかい ちょうちんの かみなりもんが あるまち',
  渋谷: 'ハチこうって いう わんちゃんの どうぞうが まってる えき',
  原宿: 'かわいい おみせが いっぱい ならんでる まちだよ',
  新宿: 'せかいで いちばん ひとが おおい えき なんだって',
  池袋: 'ふくろうが マスコットの えき。おおきな デパートが あるよ',
  秋葉原: 'ゲームや でんきの おみせが ずらーっと ならんでる まち',
  品川: 'しんかんせんも とまる、ふねの みなとが あった まち',
  横浜: 'おおきな みなとと かんらんしゃが ある まちだよ',
  桜木町: 'ちいさな きかんしゃが むかし はしってた ばしょ',
  関内: 'やきゅうの スタジアムが すぐ そこに あるよ',
  中華街: 'にくまんや ぎょうざの いいにおいが する まち',
  大宮: 'てつどうはくぶつかんが ある、でんしゃずきの せいちだよ',
  鎌倉: 'おおきな だいぶつさまが すわってる まち',
  江ノ島: 'うみと しまが みえる、なつに たのしい ところ',
  片瀬江ノ島: 'りゅうぐうじょうみたいな かたちの えきなんだ',
  小田原: 'おしろが みえる えき。ここから はこねに いけるよ',
  高尾: 'やまのぼりが できる、みどりの いっぱいな えき',
  こどもの国: 'なまえの とおり、こどもの ための ひろい こうえんが あるよ',
  二子玉川: 'たまがわの かわらで あそべる、きもちいい えき',
  自由が丘: 'ケーキやさんが たくさん ある あまい まち',
  中目黒: 'はるに さくらが トンネルみたいに さく かわが あるよ',
  恵比寿: 'ビールの こうじょうが あった まちなんだ',
  銀座: 'ぴかぴかの おみせが ならぶ、おしゃれな まち',
  日本橋: 'にほんの みちの スタートちてん。ここが 0キロなんだよ',
  豊洲: 'おさかなの おおきな いちばが ある まち',
  六本木: 'おおきな くもの ちょうこくが たってる まち',
  表参道: 'けやきの きが ならぶ、きれいな さかみち',
  明治神宮前: 'おおきな とりいの ある もりの となり',
  後楽園: 'ジェットコースターが すぐ よこに ある えき!',
  神保町: 'ほんやさんが せかいいち あつまってる まち',
  御茶ノ水: 'でんしゃが 3だん かさなって みえる、てつどうの めいしょ',
  押上: 'スカイツリーが どーんと たってる えきだよ',
  新橋: 'にほんで いちばん さいしょの えき。SLが かざってあるよ',
  海老名: 'あまい メロンが ゆうめいな まち',
  町田: 'りすえんが ある、にぎやかな まち',
  向ヶ丘遊園: 'むかし ゆうえんちが あった なまえの えき',
  登戸: 'あおい ネコの まんがの ミュージアムが あるよ',
  下北沢: 'ちいさな げきじょうが たくさん ある まち',
  三軒茶屋: 'せたがやせんの ちいさな でんしゃに のりかえられるよ',
  豪徳寺: 'まねきねこが たっくさん いる おてらが あるまち',
  成城学園前: 'しずかで きれいな おうちが ならぶ まち',
  蒲田: 'くろい おんせんが わいてる ふしぎな まち',
  戸越銀座: 'ながーい しょうてんがいが つづく まち',
  大井町: 'ボウリングや ゲームで あそべる にぎやかな えき',
  等々力: 'とうきょう23くで ただ ひとつの けいこくが あるよ',
  田園調布: 'えきから みちが ほうしゃじょうに ひろがる まち',
  武蔵小杉: 'たかい ビルが にょきにょき たってる まち',
  日吉: 'だいがくの キャンパスが ひろがる まち',
  綱島: 'ももが ゆうめいだった まちなんだ',
  新横浜: 'ラーメンはくぶつかんと しんかんせんの えき!',
  センター北: 'かんらんしゃの みえる えき',
  あざみ野: 'ブルーラインと でんえんとしせんが であう えき',
  湘南台: 'うみの ちかくまで もうすこしの えき',
  戸塚: 'むかしの たびびとが やすんだ しゅくばまち',
  磯子: 'うみの ちかくを でんしゃが はしるよ',
  鶴見: 'チューリップが ゆうめいな まち',
  浦和: 'サッカーが とっても つよい まち',
  赤羽: 'たくさんの せんろが あつまる えき',
  王子: 'きつねの おはなしが のこる まち',
  巣鴨: 'おばあちゃんの はらじゅくって よばれてる しょうてんがい',
  高田馬場: 'てつわんアトムの メロディーが なる えきだよ',
  荻窪: 'ラーメンやさんが おおい まち',
  中野: 'マンガや おもちゃの おみせが つまった ビルが あるよ',
  吉祥寺: 'ぞうさんが いた どうぶつえんと おおきな こうえんの まち',
  葛西: 'ちかてつはくぶつかんが ある、でんしゃずきの えき!',
  浦安: 'ゆめの ゆうえんちに いける えきだよ',
  西船橋: 'いろんな でんしゃが であう のりかえの えき',
  北千住: 'たくさんの ろせんが あつまる おおきな えき',
  清澄白河: 'コーヒーの いいにおいが する まち',
  永田町: 'にほんの だいじな けんちくが ならぶ ばしょ',
  虎ノ門: 'とらの なまえが ついた かっこいい えき',
  麻布十番: 'おいしい ものやさんが ならぶ さかみち',
  水天宮前: 'あかちゃんを まもる かみさまの おやしろが あるよ',
  飯田橋: 'ホームが おおきく カーブしてる えきなんだ',
  四ツ谷: 'ちかてつなのに そとに でて はしる ふしぎな ばしょ',
  月島: 'もんじゃやきの おみせが ずらりと ならぶ まち',
  築地: 'おさかなの いちばで ゆうめいだった まち',
  大手町: 'たくさんの ちかてつが であう、めいろみたいな えき',
  秦野: 'らっかせいが おいしい まち',
  本厚木: 'なつに おおきな はなびが あがる まち',
  伊勢原: 'おおやまって いう やまに のぼれる えき',
};

/* ==================================================================
 * 7. キャラクター
 * ================================================================== */

/*
 * どの子も「じぶんの路線」を持っていて、その路線の話が いちばん とくい。
 * voice は よみあげの こえの たかさ・はやさ。
 */
const CHARACTERS = [
  {
    id: 'yamanoten',
    name: 'やまのてん',
    lineId: 'yamanote',
    emoji: '🟢',
    face: '😃',
    color: '#9acd32',
    ink: '#4f7a06',
    hello: 'ぼく やまのてん! とうきょうを ぐるぐる まわってる でんしゃだよ',
    tag: 'とうきょうを ぐるぐる',
    voice: { pitch: 1.35, rate: 1.0 },
    me: 'ぼく',
    end: 'だよ',
    quirk: 'ぐるぐる まわるのが だいすき',
  },
  {
    id: 'toyoko',
    name: 'とうよこくん',
    lineId: 'tokyu-toyoko',
    emoji: '🔴',
    face: '😎',
    color: '#e6003e',
    ink: '#8f0026',
    hello: 'やあ。ぼくは とうよこくん。しぶやから よこはままで はしってるよ',
    tag: 'しぶやから よこはま',
    voice: { pitch: 0.9, rate: 0.95 },
    me: 'ぼく',
    end: 'さ',
    quirk: 'うみの みえる よこはままで いくのが じまん',
  },
  {
    id: 'ginjiro',
    name: 'ぎんじろう',
    lineId: 'metro-ginza',
    emoji: '🟠',
    face: '🧐',
    color: '#ff9500',
    ink: '#a35c00',
    hello: 'わしは ぎんじろう。にほんで いちばん ふるい ちかてつじゃ',
    tag: 'にほん さいしょの ちかてつ',
    voice: { pitch: 0.75, rate: 0.85 },
    me: 'わし',
    end: 'じゃ',
    quirk: 'むかしの はなしを するのが すき',
  },
  {
    id: 'maruko',
    name: 'まるこ',
    lineId: 'metro-marunouchi',
    emoji: '🔺',
    face: '😄',
    color: '#f62e36',
    ink: '#a3151b',
    hello: 'まるこだよ! ちかてつなのに とちゅうで そとに でちゃうの!',
    tag: 'ちかてつなのに そとに でる',
    voice: { pitch: 1.5, rate: 1.05 },
    me: 'わたし',
    end: 'なの',
    quirk: 'おしゃべりが だいすき',
  },
  {
    id: 'roman',
    name: 'ろまんちゃん',
    lineId: 'odakyu-odawara',
    emoji: '🔵',
    face: '😊',
    color: '#0068b7',
    ink: '#00457a',
    hello: 'ろまんちゃんです。ロマンスカーで はこねまで いけるんだよ',
    tag: 'はこねへ いく とっきゅう',
    voice: { pitch: 1.25, rate: 0.92 },
    me: 'わたし',
    end: 'ね',
    quirk: 'とおくの やまや うみを みるのが すき',
  },
  {
    id: 'denchan',
    name: 'でんちゃん',
    lineId: 'tokyu-denentoshi',
    emoji: '🟩',
    face: '🙂',
    color: '#20a288',
    ink: '#0d6b58',
    hello: 'でんちゃん だなあ。みどりの おおい まちを のんびり はしってるよ',
    tag: 'みどりの まちを のんびり',
    voice: { pitch: 1.1, rate: 0.88 },
    me: 'ぼく',
    end: 'だなあ',
    quirk: 'のんびり やさしい',
  },
];

const CHAR_BY_ID = {};
CHARACTERS.forEach((c) => {
  CHAR_BY_ID[c.id] = c;
});
