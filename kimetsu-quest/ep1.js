// きめつクエスト だい1わ「はじまりの ゆき」
// すみを うりに まちへ → さぶろう じいさんの こやに とまる → いえで… → ねずこ → とみおか ぎゆう と たたかう
'use strict';

const MAPS = {
  home: {
    name: 'かまどけ', snow: true,
    rows: [
      'TTTTTTTTTTTTTTTTTTTT',
      'TTT......TTTT....TTT',
      'TT..RRRRRR.....k..TT',
      'T...RRRRRR........TT',
      'T...HWHDWH...bb...TT',
      'T.........,.......TT',
      'T..g......,....g...T',
      'TT........,.......TT',
      'TTT.......,......TTT',
      'TT..T.....,...T...TT',
      'TTT.......,......TTT',
      'TTTT......,.....TTTT',
      'TTTTTT....,...TTTTTT',
      'TTTTTTTTTT,TTTTTTTTT',
    ],
    exits: [{ x: 10, y: 13, to: 'mtpath', tx: 10, ty: 1, dir: 'down' }],
  },
  mtpath: {
    name: 'やまみち', snow: true,
    rows: [
      'TTTTTTTTTT,TTTTTTTTT',
      'TTTTTTTT..,..TTTTTTT',
      'TTTTTT....,g...TTTTT',
      'TTTT....T.,......TTT',
      'TTT.......,....^^TTT',
      'TT....g...,.......TT',
      'TT..T.....,...T...TT',
      'TTT.......,.......TT',
      '~~~~~~~~~~=~~~~~~~~~',
      'TT........,.......TT',
      'TT..g.....,....T..TT',
      'TTT...T...,.......TT',
      'TT........,...g...TT',
      'TT..RRRR..,.......TT',
      'TT..HHDH..,.......TT',
      'TT....,,,,,.......TT',
      'TTT.......,.......TT',
      'TT...T....,..^^...TT',
      'TT........,.......TT',
      'TT..g.....,....g..TT',
      'TTT....T..,.......TT',
      'TT........,....T..TT',
      'TT^^......,.......TT',
      'TT........,..g....TT',
      'TTT...T...,.......TT',
      'TT........,.......TT',
      'TT..g.....,...T...TT',
      'TTTT......,s....TTTT',
      'TTTTTT....,...TTTTTT',
      'TTTTTTTTTT,TTTTTTTTT',
    ],
    exits: [{ x: 10, y: 0, to: 'home', tx: 10, ty: 12, dir: 'up' }, { x: 10, y: 29, to: 'town', tx: 12, ty: 1, dir: 'down' }],
    enemies: (x, y) => y < 8 ? ['tanuki', 'tanuki', 'karasu'] : y < 19 ? ['tanuki', 'karasu', 'kitsune'] : ['kitsune', 'karasu', 'inoshishi'],
  },
  town: {
    name: 'ふもとの まち', snow: true,
    rows: [
      'TTTTTTTTTTTT#TTTTTTTTTTT',
      'T..........s#..........T',
      'T.RRRRR.....#....RRRRR.T',
      'T.HHDHH.....#....HHDHH.T',
      'T...#.......#......#...T',
      'T...################...T',
      'T.....L.....#.....L....T',
      'T.RRRRR.....#....RRRRR.T',
      'T.HWDWH.....#....HWDWH.T',
      'T...#.......#......#...T',
      'T...################...T',
      'T..b........#.......b..T',
      'T.g.........#.........gT',
      'TTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    exits: [{ x: 12, y: 0, to: 'mtpath', tx: 10, ty: 28, dir: 'up' }],
  },
};
for (const k in MAPS) { const M = MAPS[k]; M.w = Math.max(...M.rows.map(r => r.length)); M.rows = M.rows.map(r => r.padEnd(M.w, 'T')); }

const T = 'たんじろう';
const BUYERS = ['obaa', 'ojii', 'okami'];
const soldCount = g => BUYERS.filter(b => g.flags['buy_' + b]).length;

// ---------------------------------------------------------------- ひと
async function sellTo(n, who, hello, price) {
  const g = G;
  if (g.flags['buy_' + n.id]) { await talk(who, 'すみ、 ありがとうね。 また たのむよ'); return; }
  await talk(who, hello);
  if (!(g.items.sumi > 0)) return;
  const i = await choose(['うる', 'やめる'], { style: 'yesno' });
  if (i !== 0) { await talk(who, 'あら、 そうかい'); return; }
  addItem('sumi', -1); g.money += price; g.flags['buy_' + n.id] = true; sfx('buy');
  await say(`すみを うった！ ${price}もん もらった。`);
  await talk(who, 'ありがとう。 これで あたたかく すごせるよ');
  if (soldCount(g) >= 3) {
    g.flags.sold = true; g.time = 'evening'; playSong(EP.song(g));
    await say('すみが ぜんぶ うれた！');
    await talk(T, ['（もう ゆうがただ。 みんなが まってる。', 'そろそろ いえに かえろう！）']);
    save();
  }
}
async function shop(n) {
  await talk('みせの おじさん', 'へい いらっしゃい！ なにに するかい？');
  for (;;) {
    const list = [...Object.keys(ITEMS).filter(k => ITEMS[k].price), ...Object.keys(GEAR)];
    const i = await choose(list.map(k => {
      const it = ITEMS[k] || GEAR[k], owned = GEAR[k] && G.gear[k];
      return { label: it.name, right: owned ? 'もってる' : it.price + 'もん', disabled: owned };
    }), { title: `おかね ${G.money}もん` });
    if (i < 0) { await talk('みせの おじさん', 'まいど！ また きてな'); return; }
    const k = list[i], it = ITEMS[k] || GEAR[k];
    if (G.money < it.price) { sfx('ng'); await talk('みせの おじさん', 'おかねが たりないねえ'); continue; }
    G.money -= it.price; sfx('buy');
    if (GEAR[k]) { G.gear[k] = true; await say(`${it.name}を かった！\nさっそく みに つけた。（まもり ＋${it.def}）`); }
    else { addItem(k, 1); await say(`${it.name}を かった！`); }
  }
}
async function rest(who, lines, price) {
  await talk(who, lines);
  const i = await choose(['やすむ', 'やめる'], { style: 'yesno' });
  if (i !== 0) return;
  if (price) { if (G.money < price) { sfx('ng'); await talk(who, 'おかねが たりないみたい'); return; } G.money -= price; }
  await fade(true, 300); fullHeal(); sfx('heal'); await fade(false, 300);
  await say('HPと きあいが ぜんかいした！');
}

function buildNPCs(g) {
  const L = [], f = g.flags;
  const add = (id, x, y, dir, look, fn) => L.push({ id, x, y, dir, look, talk: fn });
  if (g.map === 'home' && g.day === 1) {
    add('kie', 6, 6, 'right', 'kie', async () => {
      if (!f.start) return;
      await rest('おかあさん', ['まちへ いったら、 すみを 3つ うってきてね', 'つかれたら すこし やすんでいきなさい'], 0);
    });
    add('nezuko', 12, 6, 'down', 'nezuko', () => talk('ねずこ', ['おにいちゃん、 いってらっしゃい！', 'ろくたは いま ねたところなの。 しーっ、 だよ']));
    add('hanako', 4, 7, 'right', 'hanako', async () => {
      await talk('はなこ', 'おにいちゃん！ わたしも まちに いきたい！');
      await talk(T, 'きょうは だめだよ。 ゆきで あぶないからね');
      await talk('はなこ', 'ちぇー。 じゃあ おみやげ かってきてね！');
    });
    add('shigeru', 5, 8, 'up', 'shigeru', () => talk('しげる', ['おれも いく！ おれ、 にもつ もてるよ！', '……だめ？ ちぇっ']));
    add('takeo', 15, 3, 'left', 'takeo', () => talk('たけお', ['にいちゃん、 すみやきの かまは おれが みておくよ', 'やまには けものが でるから、 きを つけてね']));
  }
  if (g.map === 'mtpath' && !f.tragedy) {
    add('saburo', 5, 15, 'right', 'saburo', async () => {
      if (g.day === 2) { await talk('さぶろう', ['はやく かえって、 かおを みせてやれ']); return; }
      await rest('さぶろう', ['おお、 かまどの ところの たんじろうか', 'ゆきの なか たいへんだな。 うちで ひとやすみ していくか？'], 0);
    });
  }
  if (g.map === 'town') {
    add('girl', 13, 1, 'down', 'girl', () => talk('むすめ', ['やまの うえの すみやきさんの こ？', 'いつも ごくろうさま。 きを つけてね']));
    add('obaa', 6, 4, 'down', 'obaa', n => sellTo(n, 'おばあさん', 'あら、 たんじろう。 ちょうど すみが きれてたんだよ。 ひとつ おくれ', 8));
    add('shop', 19, 4, 'down', 'shop', n => shop(n));
    add('boy', 9, 6, 'left', 'boy', () => talk('こども', ['みて みて！ ゆきだるま つくったんだ！', 'たんじろう にいちゃんも あそぼうよ']));
    add('chaya', 4, 9, 'down', 'chaya', () => rest('おちゃやの むすめ', ['いらっしゃい。 あったかい おだんごは いかが？', '3もんで げんきに なれるよ'], 3));
    add('ojii', 15, 9, 'left', 'ojii', n => sellTo(n, 'おじいさん', 'おう、 たんじろう。 さむくて かなわん。 すみを ひとつ たのむ', 10));
    add('okami', 16, 11, 'up', 'okami', n => sellTo(n, 'おかみさん', 'たんじろうくん！ たすかるわ。 すみ、 ひとつ ちょうだいな', 12));
    add('man', 8, 11, 'right', 'man', () => talk('おとこ', ['よるの やまには おにが でるって、 むかしから いうだろ', 'ひが くれる まえに かえりな']));
  }
  return L;
}

function tileTalk(ch, x, y, g) {
  if (ch === 'k') return 'すみを やく かまだ。 まだ ほんのり あたたかい。';
  if (ch === 'b') return 'すみの たわらが つんである。';
  if (ch === '~') return 'つめたそうな かわだ。';
  if (ch === 's') return g.map === 'town' ? 'ようこそ ふもとの まちへ' : '↑ やまの うえ（すみやきの いえ）\n↓ ふもとの まち';
  if (ch === 'L') return 'いしの とうろうだ。 あかりが ゆれている。';
  if (ch === 'D' || ch === 'W') {
    if (g.map === 'home') return g.day === 1 ? 'いえの なかで ろくたが ねている。 しずかに しよう。' : '……かならず もどってくる。';
    if (g.map === 'mtpath') return 'さぶろう じいさんの こやだ。';
    if (x === 19 && y === 3) return 'どうぐやだ。 まえの おじさんに はなしかけよう。';
    if (x === 4 && y === 8) return 'おちゃやだ。 おだんごの いい においが する。';
    return 'こんにちは！ ……へんじが ない。 るすの ようだ。';
  }
  return null;
}

// ---------------------------------------------------------------- イベント
async function opening(g) {
  await say('ここは ゆきぶかい やまの なか。');
  await say('すみやきの いえに うまれた たんじろうは、\nかぞく みんなで なかよく くらしていた。');
  await talk('おかあさん', ['たんじろう、 かおが すすで まっくろよ。 こっちに おいで', 'きょうは ゆきが ふっているから、 むりに まちへ いかなくても いいのよ']);
  await talk(T, ['だいじょうぶ！ おしょうがつまでに、 みんなに おなかいっぱい たべさせたいんだ', 'すみを うってくるよ！']);
  await talk('おかあさん', 'ありがとう。 じゃあ、 これを もっていって');
  addItem('sumi', 3); addItem('onigiri', 2); g.flags.start = true; sfx('ok');
  await say('すみを 3つ と おにぎりを 2つ もらった！');
  await say('（ふもとの まちで すみを 3つ うろう。\nまちは やまみちを ずっと したへ。）');
  await say('（やじるしで あるく。 A で はなす・しらべる。\nB か「メニュー」で つよさ や どうぐ。）');
  save();
}

async function saburoNight(g) {
  const sb = findNPC('saburo');
  if (sb) { sb.x = g.x - 1; sb.y = g.y; sb.dir = 'right'; }
  g.dir = 'left';
  await talk('さぶろう', 'おうい、 たんじろう！');
  await talk('さぶろう', ['こんな じかんに やまへ かえる つもりか？ もう ひが くれるぞ', 'きょうは うちに とまっていけ']);
  await talk(T, 'でも、 ぼく はなが きくから くらくても だいじょうぶ……');
  await talk('さぶろう', ['だめだ。 よるの やまには おにが でる', 'むかしから そう いうんだ。 さあ、 はいれ はいれ']);
  await say('たんじろうは さぶろう じいさんの こやに とまる ことに なった。');
  await fade(true, 600); playSong(null);
  g.time = 'night';
  await say('その よる……');
  await talk('さぶろう', ['おには ひとを おそう。 くらく なると でてくるんだ', 'だから よるは そとに でちゃ いけない', 'むかしから、 おにがりの けんしさまが おにを やっつけて くれるのさ']);
  await say('たんじろうは ふしぎに おもいながら ねむった……');
  g.day = 2; g.time = 'morning'; g.flags.stayed = true;
  g.map = 'mtpath'; g.x = 6; g.y = 15; g.dir = 'down'; fullHeal();
  refreshNPCs(); playSong(EP.song(g));
  await fade(false, 600);
  await say('つぎの あさ。 ゆきは やんでいた。');
  await talk('さぶろう', 'きを つけて かえれよ');
  await talk(T, '（はやく いえに かえろう。 みんな まってる！）');
  save();
}

async function tragedy(g) {
  playSong(null);
  await say('……なんだか いやな においが する。');
  await talk(T, '（なんだろう、 この におい……。 いえの ほうからだ！）');
  await fade(true, 700);
  g.hidePlayer = true;
  await say('いえに つくと――');
  await say('かぞくが みんな たおれていた。');
  playSong('sad');
  await talk(T, ['かあさん！ たけお！ はなこ！ しげる！ ろくた！']);
  await say('だれも へんじを しない……。');
  await talk(T, ['……ねずこ！', 'ねずこは まだ あたたかい！ いきを している！']);
  await talk(T, ['まちの おいしゃさんに みせれば たすかるかも しれない！', 'ねずこ、 しっかり しろ！ ぜったいに たすけるからな！']);
  g.flags.tragedy = true; g.flags.carry = true; g.time = 'gray';
  g.x = 10; g.y = 8; g.dir = 'down'; g.hidePlayer = false;
  refreshNPCs();
  await fade(false, 700);
  await say('たんじろうは ねずこを せおって、\nゆきの やまみちを はしりだした！');
  save();
}

async function climax(g) {
  // ころぶ
  sfx('hurt'); shake();
  await say('ゆきに あしを とられた！');
  await fade(true, 400);
  g.flags.carry = false; g.x = 10; g.y = 21; g.dir = 'down';
  const nz = spawn('nezuko', 10, 22, 'up', 'nezuko'); nz.still = true;
  await fade(false, 400);
  await say('たんじろうと ねずこは ゆきの うえに たおれこんだ。');
  await talk(T, 'ねずこ！ だいじょうぶか！');
  await say('ねずこが ゆっくりと たちあがった……');
  nz.look = 'nezukoOni'; nz.still = false;
  await talk('ねずこ', '……ウウ……ッ');
  await talk(T, ['ねずこ……？ めの いろが……', '（ねずこから、 おにの においが する……！？）']);
  await battle('nezuko');
  await talk(T, 'ねずこ……！ わかるんだな、 おにいちゃんが……！');
  // ぎゆう とうじょう
  await say('――その とき！');
  sfx('slash'); await flash(2);
  nz.x = 12; nz.y = 23; nz.dir = 'up';
  const gy = spawn('giyu', 11, 23, 'up', 'giyu');
  await say('だれかが ものすごい はやさで とびこんできた！');
  await say('きが つくと、 ねずこは その おとこに\nおさえこまれていた！');
  playSong('boss');
  await talk('ぎゆう', 'なぜ おにを かばう');
  await talk(T, ['いもうとです！ ねずこは ぼくの いもうとなんです！']);
  await talk('ぎゆう', 'おにに なった ものは、 もう もとには もどらない');
  await talk(T, ['もどします！ ぜったいに もどす ほうほうを みつけます！', 'だから きらないで ください！ おねがいします！']);
  await talk('ぎゆう', ['……ないて たのめば すむと おもうな', 'だいじな ものを まもりたいなら、 じぶんの ちからで たちむかえ！']);
  await talk(T, ['（この ひと、 すごく つよい……。 においで わかる）', '（まっすぐ いっても かなわない。 でも、 ねずこを まもらなきゃ！）']);
  await talk(T, 'ねずこを かえせ！！');
  await battle('giyu');
  // たたかいの あと
  g.dir = 'down';
  await say('たんじろうは たおれて うごけない……');
  nz.x = 10; nz.y = 22; nz.dir = 'down'; sfx('miss');
  await say('その とき、 ねずこが ぎゆうの てを ふりほどいた！');
  await say('ねずこは たおれた たんじろうの まえに たちはだかり、\nぎゆうを にらみつけた！');
  gy.dir = 'left';
  await talk('ぎゆう', ['（……おには ひとを おそう もの', 'なのに この こは、 あにを まもろうと している……）']);
  await say('ぎゆうは ねずこの くびもとを とんっと うち、\nしずかに ねむらせた。');
  await fade(true, 800);
  nz.x = 9; nz.y = 21; nz.dir = 'down'; nz.still = true; nz.look = 'nezuko';
  gy.x = 11; gy.y = 22; gy.dir = 'left'; g.dir = 'right';
  playSong('night');
  await say('…………');
  await fade(false, 800);
  await talk(T, '……はっ！ ねずこ！');
  await talk('ぎゆう', 'ねむっているだけだ');
  await talk('ぎゆう', ['さぎりやまの ふもとに すむ、 うろこだき さこんじ という ひとを たずねろ', 'とみおか ぎゆうに いわれて きた、 と いえ', 'それから―― いもうとを、 ひの ひかりに あてるな']);
  await say('そう いうと、 ぎゆうは かぜの ように すがたを けした。');
  despawn('giyu'); sfx('miss');
  await talk(T, ['とみおか ぎゆう、 さん……', 'ねずこ、 いこう。 かならず にんげんに もどしてやるからな！']);
  g.flags.ep1clear = true; save();
  await ending(g);
}

async function ending(g) {
  await fade(true, 900);
  playSong('field');
  await say('きめつクエスト\nだい1わ「はじまりの ゆき」 おわり');
  await say(`たんじろう レベル ${g.lv}\nおかね ${g.money}もん　あるいた ほすう ${g.steps || 0}`);
  await say('つぎは さぎりやまで しゅぎょうが はじまる……！？\nおたのしみに！');
  await say('（この ゲームは ファンが つくった\nひこうしきの ゲームです）');
  await titleScreen();
}

// ---------------------------------------------------------------- とくべつな たたかい（ねずこ・ぎゆう）
function extraSkills(B) {
  if (B.E.key === 'nezuko') return [{ id: 'call', name: 'よびかける', mp: 0 }];
  if (B.E.key === 'giyu') return [{ id: 'axe', name: 'おのを なげあげる', mp: 0 }, { id: 'stone', name: 'いしを なげる', mp: 0 }];
  return [];
}
async function hint(B, force) {
  if (B.E.key === 'nezuko') {
    if (force || B.calls === 0) await bmsg('（ねずこに こえを かけよう！\nわざ「よびかける」）');
    return;
  }
  if (B.E.key !== 'giyu') return;
  if (B.fails === 2 && !force) await bmsg('（まっすぐ いっても あたらない……\nなにか くふうを しなきゃ）');
  else if (B.fails >= 4 && (force || B.fails % 2 === 0)) {
    await bmsg('（そうだ！ さきに おのを そらへ なげておいて、\nいしで きを ひけば……！）');
    await bmsg('ヒント：わざ「おのを なげあげる」\n→ つぎの ターンに「いしを なげる」');
  }
}
async function epPlayerAct(B, act) {
  const k = B.E.key;
  if (k === 'nezuko') {
    if (act.t === 'run') { await bmsg('ねずこを おいて にげるなんて できない！'); return null; }
    if (act.t === 'atk' || act.s === 'zutsuki') {
      await bmsg('たんじろうは おのを ふりあげた…… でも！');
      await bmsg('「できない！ ねずこは ぼくの いもうとだ！」');
      await hint(B, true); return null;
    }
    if (act.s === 'nose') { G.mp -= act.mp; await bmsg('ねずこの においが する。 くるしい、 かなしい においだ……'); await hint(B, true); return null; }
    if (act.s === 'call') {
      B.calls++;
      if (B.calls === 1) { await bmsg('「ねずこ！ しっかり しろ！ おにいちゃんだよ！」'); await bmsg('ねずこの うごきが すこし とまった……'); return null; }
      if (B.calls === 2) { await bmsg('「ねずこ、 がんばれ！ おにに なんか なるな！」'); await bmsg('ねずこの めに なみだが うかんだ……'); return null; }
      await bmsg('「ねずこ……！」'); sfx('heal');
      await bmsg('ねずこの めから、 ぽろぽろと なみだが こぼれた……');
      $('#bcv').classList.add('gone');
      return 'calm';
    }
    return undefined;
  }
  if (k === 'giyu') {
    if (act.t === 'run') { await bmsg('ねずこを おいて にげるなんて できない！'); return null; }
    if (act.t === 'atk') {
      if (B.axeUp) { await bmsg('おのは いま そらの うえだ！ すでで つっこんだ！'); }
      else await bmsg('たんじろうは おので きりかかった！');
      sfx('miss'); await bmsg('ぎゆうは ひらりと かわした！');
      B.fails++; await hint(B); return null;
    }
    if (act.s === 'zutsuki') {
      G.mp -= act.mp; await bmsg('たんじろうの ずつき！'); sfx('miss');
      await bmsg('ぎゆうは かるがると かわした！'); B.fails++; await hint(B); return null;
    }
    if (act.s === 'nose') {
      G.mp -= act.mp; await bmsg('たんじろうは はなを きかせた！');
      await bmsg('（すきの においが しない……。 まっすぐ いっても むりだ）');
      B.fails = Math.max(B.fails, 4); await hint(B, true); return null;
    }
    if (act.s === 'axe') {
      if (B.axeUp) { await bmsg('おのは もう なげた！'); return null; }
      B.axeUp = 2; sfx('miss');
      await bmsg('たんじろうは おのを そらたかく なげあげた！');
      await bmsg('ぎゆう「……どこを ねらっている」');
      return null;
    }
    if (act.s === 'stone') {
      if (B.axeUp) {
        await bmsg('たんじろうは いしを なげて、 まっすぐ つっこんだ！');
        sfx('hit'); shake();
        await bmsg('ぎゆうは いしを はじき、\nかたなの つかで たんじろうを うった！');
        await bmsg('たんじろうは ゆきの うえに たおれた……');
        await bmsg('…… その とき！ そらから おのが おちてきた！');
        sfx('slash'); enemyBlink();
        await bmsg('ぎゆうは とっさに みを ひいた！');
        await bmsg('おのは ぎゆうの すぐ よこの きに ささった！');
        await bmsg('ぎゆう（……いしは おとり。\nじぶんが たおれても、 おので ねらって いたのか）');
        return 'event';
      }
      await bmsg('たんじろうは いしを なげた！'); sfx('miss');
      await bmsg('ぎゆうは いしを かたなで はじいた！');
      B.fails++; await hint(B); return null;
    }
  }
  return undefined;
}
async function epEnemyTurn(B) {
  const k = B.E.key, s = stats();
  if (k === 'nezuko') {
    if (B.calls > 0 && Math.random() < .6) { await bmsg('ねずこは くるしそうに うなっている……'); return null; }
    await bmsg(['ねずこが とびかかってきた！', 'ねずこが つかみかかってきた！'][rnd(2)]);
    const r = await hurt(Math.max(1, Math.round(s.maxhp * (.1 + Math.random() * .06))));
    if (!r && B.turn === 0) await hint(B);
    return r;
  }
  if (k === 'giyu') {
    if (B.axeUp) {
      B.axeUp--;
      if (!B.axeUp) { await bmsg('なげた おのが ゆきに おちてきた……\nたんじろうは おのを ひろった。'); await bmsg('（あいてに きを とらせないと……）'); }
    }
    if (B.turn % 3 === 2) {
      await bmsg(['ぎゆう「どうした。 それで いもうとを まもれるのか」', 'ぎゆう「おそい」', 'ぎゆう「あいてを よく みろ」'][rnd(3)]);
      return null;
    }
    await bmsg(['ぎゆうの みねうち！', 'ぎゆうが すばやく ふみこんできた！', 'ぎゆうの けりが とんできた！'][rnd(3)]);
    if (Math.random() < .12) { sfx('miss'); await bmsg('たんじろうは ぎりぎりで かわした！'); return null; }
    return hurt(Math.max(2, Math.round(s.maxhp * (.16 + Math.random() * .08))));
  }
  return undefined;
}
async function bossLose(B) {
  if (B.E.key === 'giyu') await bmsg('ぎゆう「……それで おわりか」');
  else await bmsg('ねずこ「……ウウ……」');
}

// ---------------------------------------------------------------- フック
EP = {
  maps: MAPS,
  newGame: () => ({ map: 'home', x: 7, y: 6, dir: 'left', day: 1, time: 'day', flags: {}, lv: 1, hp: 20, mp: 4, exp: 0, money: 0, items: {}, gear: {}, steps: 0 }),
  buildNPCs, tileTalk, opening, extraSkills, hint, bossLose, playerAct: epPlayerAct, enemyTurn: epEnemyTurn,
  song(g) {
    if (g.flags.carry || (g.flags.tragedy && !g.flags.ep1clear)) return 'sad';
    if (g.time === 'evening' || g.time === 'night') return 'night';
    return g.map === 'town' ? 'town' : 'field';
  },
  canEncounter: g => g.day === 1 && g.flags.start,
  goal(g) {
    const f = g.flags, place = MAPS[g.map].name;
    let t;
    if (f.ep1clear) t = 'だい1わ クリア！';
    else if (f.carry) t = 'ねずこを ふもとの まちへ';
    else if (g.day === 2) t = 'いえに かえろう';
    else if (f.sold) t = 'いえに かえろう';
    else t = `まちで すみを うろう（${soldCount(g)}/3）`;
    return `${place}｜${t}`;
  },
  async onStep(g) {
    if (g.map === 'mtpath' && g.day === 1 && g.flags.sold && !g.flags.stayed && g.y <= 17) { await run(() => saburoNight(g)); return true; }
    if (g.map === 'mtpath' && g.flags.carry && g.y >= 20) { await run(() => climax(g)); return true; }
    return false;
  },
  async onEnter(g) {
    if (g.map === 'home' && g.day === 2 && !g.flags.tragedy) await tragedy(g);
    else if (!g.flags.start) await opening(g);
  },
  async fieldLose(g) {
    await say('たんじろうは めのまえが まっくらに なった……');
    await fade(true, 600);
    g.money = Math.floor(g.money / 2); fullHeal();
    if (g.flags.sold) {
      g.map = 'mtpath'; g.x = 10; g.y = 16; g.dir = 'up';
      refreshNPCs(); playSong(EP.song(g));
      await fade(false, 600);
      await say('……きが つくと、 さぶろう じいさんが のぞきこんでいた。');
      await saburoNight(g);
      return;
    }
    g.map = 'home'; g.x = 7; g.y = 6; g.dir = 'left';
    refreshNPCs(); playSong(EP.song(g));
    await fade(false, 600);
    await say('……きが つくと、 いえで ねていた。');
    await talk('おかあさん', ['たんじろう、 むりしちゃ だめよ', 'つかれたら いつでも やすみに おいでね']);
    save();
  },
};

startEngine();
