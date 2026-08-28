'use strict';

/*
 * しろっとクイズ — ゲーム本体
 *
 * ながれ
 *   1. 上から かたちが 1つ おちてくる(topics/*.js の items から 1つ)
 *   2. おちきる前に 4択で こたえる
 *        正かい   → その かたちは きえる
 *        まちがい → その場で どすんと おちて、下に つもる(もう けせない)
 *        時間ぎれ → つもる
 *   3. つもった山が 上まで とどいたら ゲームオーバー
 *
 * つもりかた
 *   かたちは マス目(CELL px)に ドット化して あたり判定する。
 *   ぶつかったとき、重心が ささえより 右/左に ずれていたら 1マス よこへ ずらして
 *   また おとす。これで 山の しゃめんを すべり落ちて 安定したところで 止まる。
 */

/* ============================ 設定 ============================ */

const CFG = {
  CELL: 7,            // あたり判定 1マスの大きさ(px)
  COLS: 60,           // 盤面の よこマス数 → 420px
  ROWS: 82,           // 盤面の たてマス数 → 574px
  DANGER_ROW: 3,      // ここまで つもったら ゲームオーバー
  MAX_SLIDE: 40,      // 1回の落下で よこに すべれる 最大マス数
  DROP_MUL: 7,        // まちがえた あとの 落下スピード倍率
  SPAWN_TRIES: 4,     // 出てくる よこ位置の 候補数(いちばん低いところを えらぶ)
};

const BOARD_W = CFG.COLS * CFG.CELL;
const BOARD_H = CFG.ROWS * CFG.CELL;

// はやさ(1〜100)は モードとは べつに えらぶ。モードは 見た目と 4択の むずかしさ。
// tilt: かたむきの さいだい角度(度), sameGroup: 4択のうち おなじグループから出す数
const MODES = [
  {
    id: 'easy', name: 'やさしい', emoji: '🐢',
    note: 'かたむかない・ちがう地方から えらぶ・ヒント1つめは さいしょから',
    tilt: 0, sameGroup: 0, autoHint: 1, mul: 1,
  },
  {
    id: 'normal', name: 'ふつう', emoji: '🚶',
    note: 'すこし かたむく・1つは おなじ地方から',
    tilt: 7, sameGroup: 1, autoHint: 0, mul: 1.5,
  },
  {
    id: 'hard', name: 'むずかしい', emoji: '🐇',
    note: 'よく かたむく・にている なかまから えらぶ',
    tilt: 16, sameGroup: 3, autoHint: 0, mul: 2,
  },
];

/*
 * おちる はやさ … 1〜100 の 100段階。
 *   20 = マス/秒 11(この ゲームを 作ったときの ふつうの はやさ)
 *   1マスは 7px なので、1 めもり = 0.55マス/秒 ずつ はやくなる。
 *   正かいするたび 3%ずつ 速くなり、えらんだ はやさの 2ばいで うちどめ。
 */
const SPEED = {
  MIN: 1,
  MAX: 100,
  DEFAULT: 20,
  PER_LEVEL: 0.55,     // マス/秒
  ACCEL: 0.03,         // 1問正かいごとに ふえる わりあい
  MAX_MUL: 2,          // どれだけ はやくなっても えらんだ はやさの 2ばいまで
};

const SPEED_KEY = 'shirotto-quiz:speed';


// 落ちてくる ブロックの色(なかま分けとは わざと むすびつけない)
const PIECE_COLORS = [
  { fill: '#6bb2e8', edge: '#2f7cb8' },
  { fill: '#7fc99a', edge: '#3d8f61' },
  { fill: '#f0b56b', edge: '#c07f2e' },
  { fill: '#c79bdb', edge: '#8b5aa6' },
  { fill: '#e8908f', edge: '#b25755' },
  { fill: '#79c9c4', edge: '#3d8f8a' },
];

const HINT_ORDER = ['group', 'capital', 'famous', 'map'];
const HINT_COST = 20;
const BEST_KEY = 'shirotto-quiz:best';

/* ============================ DOM ============================ */

const $ = (id) => document.getElementById(id);

const el = {
  screens: {
    title: $('screen-title'),
    game: $('screen-game'),
    result: $('screen-result'),
  },
  topicList: $('topicList'),
  modeList: $('modeList'),
  speedRange: $('speedRange'),
  speedNum: $('speedNum'),
  speedNote: $('speedNote'),
  speedPresets: $('speedPresets'),
  speedView: $('speedView'),
  soundTitle: $('soundToggleTitle'),
  soundGame: $('soundToggleGame'),
  board: $('board'),
  flash: $('flash'),
  question: $('question'),
  hintBtn: $('hintBtn'),
  hintList: $('hintList'),
  choices: $('choices'),
  score: $('scoreView'),
  combo: $('comboView'),
  right: $('rightView'),
  quit: $('quitBtn'),
  resultTitle: $('resultTitle'),
  resultScore: $('resultScore'),
  resultBest: $('resultBest'),
  resultStats: $('resultStats'),
  missBlock: $('missBlock'),
  retry: $('retryBtn'),
  back: $('backBtn'),
};

const ctx = el.board.getContext('2d');
const stack = document.createElement('canvas');   // つもった かたちを ためておく絵
stack.width = BOARD_W;
stack.height = BOARD_H;
const stackCtx = stack.getContext('2d');

/* ============================ 状態 ============================ */

const game = {
  topic: null,
  mode: MODES[1],
  speed: SPEED.DEFAULT,     // 1〜100
  grid: null,          // Uint8Array(COLS*ROWS) 1 = つもっている
  piece: null,
  queue: [],
  asked: 0,
  right: 0,
  combo: 0,
  maxCombo: 0,
  score: 0,
  rounds: 1,
  hintsUsed: 0,
  misses: [],
  running: false,
  waitSpawn: 0,        // 次が出てくるまでの秒
  lastT: 0,
  colorIdx: 0,
};

/* ======================= かたちの ドット化 ======================= */

// item を「落ちてくる1つ」にする。回転と大きさを決めて、マス目に ドット化する。
function buildPiece(item, tiltDeg) {
  const box = item.box;
  const s = scaleFor(item);
  const rot = (tiltDeg * Math.PI) / 180;
  const cs = Math.abs(Math.cos(rot));
  const sn = Math.abs(Math.sin(rot));
  const w = box.w * s * cs + box.h * s * sn;
  const h = box.w * s * sn + box.h * s * cs;
  const cols = Math.max(1, Math.ceil(w / CFG.CELL));
  const rows = Math.max(1, Math.ceil(h / CFG.CELL));

  const piece = {
    item,
    path: new Path2D(item.shape),
    // 立体の 見取図など、ぬりの上に かさねる 線(dash: true で 見えない辺)
    lines: (item.lines || []).map((l) => ({ path: new Path2D(l.d), dash: !!l.dash })),
    cx: box.x + box.w / 2,
    cy: box.y + box.h / 2,
    s, rot, w, h, cols, rows,
    cells: [],
    minY: 0,
    comX: 0,
    color: PIECE_COLORS[game.colorIdx % PIECE_COLORS.length],
    col: 0, rowF: 0,
    state: 'fall',
    slides: 0,
    popT: 0,
    spawnRow: 0,
    landRow: 0,
  };
  game.colorIdx++;

  // 1px = 1マス で ぬりつぶして、色のついた ところを マスとする
  const cv = document.createElement('canvas');
  cv.width = cols;
  cv.height = rows;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.scale(1 / CFG.CELL, 1 / CFG.CELL);
  applyShapeTransform(g, piece, 0, 0);
  g.fillStyle = '#000';
  g.fill(piece.path);

  const data = g.getImageData(0, 0, cols, rows).data;
  let sumX = 0;
  let minY = rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (data[(y * cols + x) * 4 + 3] > 40) {
        piece.cells.push(x, y);
        sumX += x;
        if (y < minY) minY = y;
      }
    }
  }
  if (piece.cells.length === 0) {         // ほそすぎて 1マスも 取れなかったとき
    piece.cells.push(0, 0);
    sumX = 0;
    minY = 0;
  }
  const n = piece.cells.length / 2;
  piece.comX = sumX / n + 0.5;
  piece.minY = minY;
  return piece;
}

// item ごとの 大きさ。本物の 大小を すこしだけ のこしつつ、小さすぎないようにする。
function scaleFor(item) {
  const dim = Math.max(item.box.w, item.box.h);
  const span = game.topic.maxDim - game.topic.minDim;
  const t = span < 0.001 ? 0.5 : clamp((dim - game.topic.minDim) / span, 0, 1);
  const target = 72 + 52 * Math.sqrt(t);
  return target / dim;
}

// かたちを (px, py) を左上とする w×h の わくに あわせて 描くための変形
function applyShapeTransform(g, piece, px, py) {
  g.translate(px + piece.w / 2, py + piece.h / 2);
  g.rotate(piece.rot);
  g.scale(piece.s, piece.s);
  g.translate(-piece.cx, -piece.cy);
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// かたちを ぬって、ふちと 見取図の 線を 引く(g は すでに かたちの座標系に なっていること)
function paintPiece(g, piece, alpha) {
  g.globalAlpha = alpha;
  g.fillStyle = piece.color.fill;
  g.fill(piece.path);
  g.globalAlpha = 1;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = 2.4 / piece.s;
  g.strokeStyle = piece.color.edge;
  g.stroke(piece.path);
  for (const line of piece.lines) {
    g.lineWidth = 1.8 / piece.s;
    g.setLineDash(line.dash ? [5 / piece.s, 4 / piece.s] : []);
    g.stroke(line.path);
  }
  g.setLineDash([]);
}

/* ========================= あたり判定 ========================= */

function collides(piece, col, row) {
  const cells = piece.cells;
  const grid = game.grid;
  for (let i = 0; i < cells.length; i += 2) {
    const c = col + cells[i];
    const r = row + cells[i + 1];
    if (c < 0 || c >= CFG.COLS) return true;
    if (r >= CFG.ROWS) return true;               // ゆか
    if (r >= 0 && grid[r * CFG.COLS + c]) return true;
  }
  return false;
}

// そのまま まっすぐ おとしたとき、止まる行
function dropRow(piece, col, fromRow) {
  let r = fromRow;
  while (!collides(piece, col, r + 1)) r++;
  return r;
}

function stampPiece(piece) {
  const cells = piece.cells;
  const row = Math.floor(piece.rowF);
  for (let i = 0; i < cells.length; i += 2) {
    const c = piece.col + cells[i];
    const r = row + cells[i + 1];
    if (r >= 0 && r < CFG.ROWS && c >= 0 && c < CFG.COLS) game.grid[r * CFG.COLS + c] = 1;
  }
  // 見た目は ベクターのまま つもり絵に やきつける
  stackCtx.save();
  applyShapeTransform(stackCtx, piece, piece.col * CFG.CELL, row * CFG.CELL);
  paintPiece(stackCtx, piece, 0.85);
  stackCtx.restore();
}

/* ========================== 落下・すべり ========================== */

function stepPiece(piece, dt) {
  const speed = fallSpeed() * (piece.state === 'drop' ? CFG.DROP_MUL : 1);
  let remain = speed * dt;
  while (remain > 0) {
    const step = Math.min(remain, 0.34);
    remain -= step;
    const nextRow = Math.floor(piece.rowF + step);
    if (nextRow === Math.floor(piece.rowF) || !collides(piece, piece.col, nextRow)) {
      piece.rowF += step;
      continue;
    }
    if (!slide(piece)) {          // すべる先が なければ ここで 止まる
      piece.rowF = Math.floor(piece.rowF);
      settle(piece);
      return;
    }
  }
}

// ぶつかったとき、重心と ささえの ずれを見て よこに 1マス ずらす。
// ずらせたら true(まだ おちる)、だめなら false(止まる)。
function slide(piece) {
  if (piece.slides >= CFG.MAX_SLIDE) return false;
  const row = Math.floor(piece.rowF);
  const cells = piece.cells;

  // いま ささえられている マス(下が ふさがっている マス)の よこ位置の平均
  let sum = 0;
  let n = 0;
  for (let i = 0; i < cells.length; i += 2) {
    const c = piece.col + cells[i];
    const r = row + cells[i + 1] + 1;
    const blocked = r >= CFG.ROWS || (r >= 0 && game.grid[r * CFG.COLS + c]);
    if (blocked) { sum += cells[i] + 0.5; n++; }
  }
  const support = n ? sum / n : piece.comX;
  const lean = piece.comX - support;      // + なら 右へ かたむいている

  const leftOk = !collides(piece, piece.col - 1, row) && !collides(piece, piece.col - 1, row + 1);
  const rightOk = !collides(piece, piece.col + 1, row) && !collides(piece, piece.col + 1, row + 1);

  let dir = 0;
  if (lean < -0.6 && leftOk) dir = -1;
  else if (lean > 0.6 && rightOk) dir = 1;
  else if (leftOk && !rightOk) dir = -1;
  else if (rightOk && !leftOk) dir = 1;
  else if (leftOk && rightOk) dir = lean < 0 ? -1 : 1;

  if (!dir) return false;
  piece.col += dir;
  piece.slides++;
  if (piece.slides % 6 === 1) SQAudio.sfx('slide');
  return true;
}

function settle(piece) {
  piece.state = 'settled';
  stampPiece(piece);
  SQAudio.sfx('land');
  if (!piece.answered) missPiece(piece, true);

  const top = Math.floor(piece.rowF) + piece.minY;
  if (top <= CFG.DANGER_ROW) {
    gameOver(false);
    return;
  }
  game.piece = null;
  game.waitSpawn = 0.55;
}

/* ============================ 出題 ============================ */

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// その図形に その せいしつが あるか(まるい立体の 辺の数などは 出さない)
function quizValue(item, quiz) {
  if (quiz.field === 'name') return item.name;
  const v = item.props ? item.props[quiz.field] : undefined;
  return v === undefined || v === null ? null : v;
}

function quizLabel(value, quiz) {
  return quiz.field === 'name' ? value : `${value}${quiz.suffix || ''}`;
}

// 出題タイプを weight の おもさで えらぶ
function pickQuiz(item) {
  const list = game.topic.quizzes.filter((q) => quizValue(item, q) !== null);
  const total = list.reduce((t, q) => t + (q.weight || 1), 0);
  let r = Math.random() * total;
  for (const q of list) {
    r -= q.weight || 1;
    if (r <= 0) return q;
  }
  return list[list.length - 1];
}

// 4択を つくる。{ key, label } の 4つを かえす(key で 正誤を くらべる)
function makeChoices(item, quiz) {
  if (quiz.field === 'name') return nameChoices(item);

  // せいしつ(数)の問題は、ほかの図形の 数を えらびなおす
  const answer = quizValue(item, quiz);
  const values = [...new Set(
    game.topic.items.map((i) => quizValue(i, quiz)).filter((v) => v !== null && v !== answer),
  )];
  const near = values.slice().sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer));
  const picked = (game.mode.sameGroup >= 3 ? near : shuffled(values)).slice(0, 3);
  for (let d = 1; picked.length < 3 && d < 12; d++) {   // 数が 足りないときの ほけん
    for (const c of [answer - d, answer + d]) {
      if (c >= 0 && c !== answer && !picked.includes(c) && picked.length < 3) picked.push(c);
    }
  }
  return shuffled(picked.concat([answer])).map((v) => ({ key: String(v), label: quizLabel(v, quiz) }));
}

// 「なまえ」の問題の 4択。にせものは モードに あわせて えらぶ。
function nameChoices(item) {
  const pool = game.topic.items.filter((i) => i.id !== item.id);
  const same = shuffled(pool.filter((i) => i.group === item.group));
  const area = (i) => i.box.w * i.box.h;
  const others = pool
    .filter((i) => i.group !== item.group)
    .sort((a, b) => Math.abs(area(a) - area(item)) - Math.abs(area(b) - area(item)));

  const picked = same.slice(0, game.mode.sameGroup);
  // むずかしいほど「大きさが 近いもの」から、やさしいほど「ばらばら」から えらぶ
  const rest = game.mode.sameGroup >= 3 ? shuffled(others.slice(0, 12)) : shuffled(others);
  for (const o of rest) {
    if (picked.length >= 3) break;
    picked.push(o);
  }
  for (const o of shuffled(same)) {           // なかまが 少ないグループの ほけん
    if (picked.length >= 3) break;
    if (!picked.includes(o)) picked.push(o);
  }
  return shuffled(picked.concat([item])).map((i) => ({ key: i.id, label: i.name }));
}

// いまの 問題で 見せてよい ヒント(こたえが ばれる ヒントは のぞく)
function hintsFor(item, quiz) {
  return (item.hints || []).filter((h) => !(h.hide || []).includes(quiz.id));
}

function spawnPiece() {
  if (game.queue.length === 0) {
    // 数が 少ないテーマ(図形など)は くりかえし 出す。おわりは 山が つもったときだけ。
    if (!game.topic.loopItems) { gameOver(true); return; }
    game.queue = shuffled(game.topic.items);
    game.rounds++;
  }
  const item = game.queue.shift();
  // 図形テーマは かたむけない(正方形が ひし形に 見えてしまうため)
  const maxTilt = game.topic.allowTilt === false ? 0 : game.mode.tilt;
  const tilt = maxTilt ? (Math.random() * 2 - 1) * maxTilt : 0;
  const piece = buildPiece(item, tilt);

  // 出てくる よこ位置は、何回か ためして いちばん 低く つめる ところにする
  const startRow = -piece.rows - 1;
  let best = null;
  for (let k = 0; k < CFG.SPAWN_TRIES; k++) {
    const col = Math.floor(Math.random() * (CFG.COLS - piece.cols + 1));
    if (collides(piece, col, startRow)) continue;
    const land = dropRow(piece, col, startRow);
    if (!best || land > best.land) best = { col, land };
  }
  if (!best) { gameOver(false); return; }

  piece.col = best.col;
  piece.rowF = startRow;
  piece.spawnRow = startRow;
  piece.landRow = best.land;
  piece.answered = false;
  piece.hints = [];
  piece.freeHints = game.mode.autoHint;   // さいしょから出るヒントは 点数を へらさない

  const quiz = pickQuiz(item);
  const value = quizValue(item, quiz);
  piece.quiz = quiz;
  piece.answerKey = quiz.field === 'name' ? item.id : String(value);
  piece.answerText = quiz.field === 'name'
    ? item.name
    : `${quizLabel(value, quiz)}（${item.name}）`;
  piece.hintPool = hintsFor(item, quiz);
  game.piece = piece;
  game.asked++;

  renderQuestion(piece);
  if (game.mode.autoHint) {
    for (let i = 0; i < game.mode.autoHint; i++) revealHint(true);
  }
}

// えらんだ はやさ(1〜100)から、いまの 落下スピード(マス/秒)を だす
function baseSpeed(level) {
  return Math.max(0.5, level * SPEED.PER_LEVEL);
}

function fallSpeed() {
  const base = baseSpeed(game.speed);
  return Math.min(base * SPEED.MAX_MUL, base * (1 + SPEED.ACCEL * game.right));
}

// はやさの めやす: 1つが 上から 下まで おちきるのに かかる 秒数
function fallSeconds(level) {
  return (CFG.ROWS - 4) / baseSpeed(level);
}

// はやいほど 点数が 高くなる(20めもり = 1.0ばい)
function speedMul(level) {
  return 0.5 + level / 40;
}

/* ============================ こたえ ============================ */

function answer(choice, btn) {
  const piece = game.piece;
  if (!piece || piece.answered || piece.state !== 'fall') return;
  piece.answered = true;
  [...el.choices.children].forEach((b) => { b.disabled = true; });

  if (choice.key === piece.answerKey) {
    btn.classList.add('is-right');
    piece.state = 'pop';
    piece.popT = 0;
    const gain = scoreFor(piece);
    game.score += gain;
    game.right++;
    game.combo++;
    game.maxCombo = Math.max(game.maxCombo, game.combo);
    SQAudio.sfx('correct');
    showFlash('ok', 'せいかい！', `${piece.answerText}　+${gain}てん`);
    bumpStat(el.score);
    game.waitSpawn = 0.3;   // きえる えんしゅつ(0.45秒)の あとの ま
  } else {
    btn.classList.add('is-wrong');
    markRightChoice(piece);
    piece.state = 'drop';
    SQAudio.sfx('wrong');
    showFlash('ng', 'ざんねん…', `こたえは ${piece.answerText}`);
    missPiece(piece, false);
  }
  updateHud();
}

function markRightChoice(piece) {
  [...el.choices.children].forEach((b) => {
    if (b.dataset.key === piece.answerKey) b.classList.add('is-right');
  });
}

function scoreFor(piece) {
  const total = piece.landRow - piece.spawnRow;
  const left = total > 0 ? clamp(1 - (piece.rowF - piece.spawnRow) / total, 0, 1) : 0;
  const base = 100 + Math.round(60 * left) + Math.min(game.combo, 10) * 10;
  const paid = Math.max(0, piece.hints.length - piece.freeHints);
  const gain = base * game.mode.mul * speedMul(game.speed);
  return Math.max(10, Math.round(gain) - paid * HINT_COST);
}

function missPiece(piece, timeout) {
  game.combo = 0;
  if (!game.misses.some((m) => m.id === piece.item.id)) game.misses.push(piece.item);
  if (timeout) {
    piece.answered = true;
    [...el.choices.children].forEach((b) => { b.disabled = true; });
    markRightChoice(piece);
    showFlash('ng', '時間ぎれ！', `こたえは ${piece.answerText}`);
  }
  updateHud();
}

/* ============================ ヒント ============================ */

function revealHint(silent) {
  const piece = game.piece;
  if (!piece || piece.answered) return;
  const next = piece.hintPool[piece.hints.length];
  if (!next) return;
  piece.hints.push(next);
  if (!silent) {
    game.hintsUsed++;
    SQAudio.sfx('hint');
  }
  el.hintList.appendChild(hintNode(piece.item, next));
  el.hintBtn.disabled = piece.hints.length >= piece.hintPool.length;
}

function hintNode(item, hint) {
  if (hint.kind === 'map') return miniMap(item);
  const span = document.createElement('span');
  span.className = 'hint-chip';
  span.textContent = `${hint.e || '💡'} ${hint.text}`;
  return span;
}

let miniMapBase = null;

function miniMap(item) {
  const t = game.topic;
  if (!t.overviewViewBox) {
    const span = document.createElement('span');
    span.className = 'hint-chip';
    span.textContent = '🗺 ちずは ありません';
    return span;
  }
  if (miniMapBase === null) {
    miniMapBase = t.items.map((i) => `<path class="base" d="${i.path}"/>`).join('');
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'hint-map');
  svg.setAttribute('viewBox', t.overviewViewBox);
  svg.setAttribute('aria-label', 'ばしょの ヒント');
  svg.innerHTML = miniMapBase + `<path class="here" d="${item.path}"/>`;
  return svg;
}

/* ============================ 描画 ============================ */

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.board.width = BOARD_W * dpr;
  el.board.height = BOARD_H * dpr;
  el.board.style.aspectRatio = `${BOARD_W} / ${BOARD_H}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw() {
  ctx.clearRect(0, 0, BOARD_W, BOARD_H);

  // うすい マス目
  ctx.strokeStyle = 'rgba(120, 170, 210, .13)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let r = 10; r < CFG.ROWS; r += 10) {
    ctx.moveTo(0, r * CFG.CELL + 0.5);
    ctx.lineTo(BOARD_W, r * CFG.CELL + 0.5);
  }
  ctx.stroke();

  // ここまで つもったら おしまい、の線
  const dy = (CFG.DANGER_ROW + 1) * CFG.CELL;
  ctx.save();
  ctx.strokeStyle = 'rgba(217, 95, 95, .5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, dy);
  ctx.lineTo(BOARD_W, dy);
  ctx.stroke();
  ctx.restore();

  ctx.drawImage(stack, 0, 0);

  const piece = game.piece;
  if (!piece) return;
  const px = piece.col * CFG.CELL;
  const py = piece.rowF * CFG.CELL;

  ctx.save();
  if (piece.state === 'pop') {
    const t = clamp(piece.popT / 0.45, 0, 1);
    ctx.globalAlpha = 1 - t;
    ctx.translate(px + piece.w / 2, py + piece.h / 2);
    ctx.scale(1 + t * 0.5, 1 + t * 0.5);
    ctx.translate(-(px + piece.w / 2), -(py + piece.h / 2));
    drawSparks(px + piece.w / 2, py + piece.h / 2, t);
  }
  ctx.save();
  applyShapeTransform(ctx, piece, px, py);
  paintPiece(ctx, piece, 1);
  ctx.restore();
  ctx.restore();
}

function drawSparks(cx, cy, t) {
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = '#ffd76b';
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10;
    const d = 30 + t * 70;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 5 * (1 - t) + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ============================ ループ ============================ */

function loop(now) {
  if (!game.running) return;
  const dt = Math.min(0.05, (now - game.lastT) / 1000 || 0);
  game.lastT = now;

  const piece = game.piece;
  if (piece && (piece.state === 'fall' || piece.state === 'drop')) {
    stepPiece(piece, dt);
  } else if (piece && piece.state === 'pop') {
    piece.popT += dt;
    if (piece.popT > 0.45) game.piece = null;
  }

  if (!game.piece && game.waitSpawn > 0) {
    game.waitSpawn -= dt;
    if (game.waitSpawn <= 0) spawnPiece();
  }

  draw();
  requestAnimationFrame(loop);
}

/* ============================ 画面 ============================ */

function show(name) {
  Object.entries(el.screens).forEach(([k, node]) => node.classList.toggle('is-active', k === name));
}

function updateHud() {
  el.score.textContent = game.score;
  el.combo.textContent = game.combo;
  el.right.textContent = `${game.right}/${game.asked}`;
  el.speedView.textContent = game.speed;
}

function bumpStat(node) {
  const wrap = node.parentElement;
  wrap.classList.remove('pop');
  void wrap.offsetWidth;
  wrap.classList.add('pop');
}

function showFlash(kind, big, small) {
  el.flash.className = `flash ${kind}`;
  el.flash.innerHTML = '';
  el.flash.append(big, Object.assign(document.createElement('small'), { textContent: small }));
  void el.flash.offsetWidth;
  el.flash.classList.add('show');
}

function renderQuestion(piece) {
  el.question.textContent = piece.quiz.question;
  el.hintList.innerHTML = '';
  el.hintBtn.disabled = piece.hintPool.length === 0;
  el.choices.innerHTML = '';
  for (const choice of makeChoices(piece.item, piece.quiz)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.textContent = choice.label;
    btn.dataset.key = choice.key;
    btn.addEventListener('click', () => answer(choice, btn));
    el.choices.appendChild(btn);
  }
}

function startGame(mode) {
  game.mode = mode;
  game.grid = new Uint8Array(CFG.COLS * CFG.ROWS);
  stackCtx.clearRect(0, 0, BOARD_W, BOARD_H);
  game.queue = shuffled(game.topic.items);
  game.piece = null;
  game.asked = 0;
  game.right = 0;
  game.combo = 0;
  game.maxCombo = 0;
  game.score = 0;
  game.hintsUsed = 0;
  game.misses = [];
  game.rounds = 1;
  game.waitSpawn = 0;
  game.running = true;
  game.lastT = performance.now();
  el.flash.className = 'flash';
  updateHud();
  fitCanvas();
  show('game');
  SQAudio.unlock();
  SQAudio.sfx('start');
  SQAudio.bgm(true);
  spawnPiece();
  requestAnimationFrame(loop);
}

function gameOver(cleared) {
  game.running = false;
  game.piece = null;
  SQAudio.bgm(false);
  SQAudio.sfx(cleared ? 'correct' : 'gameover');
  renderResult(cleared);
  show('result');
}

function bestKeyFor() { return `${BEST_KEY}:${game.topic.id}:${game.mode.id}`; }

function readBest(topicId, modeId) {
  try { return Number(localStorage.getItem(`${BEST_KEY}:${topicId}:${modeId}`)) || 0; }
  catch (e) { return 0; }
}

// かたちの SVG(けっか画面の サムネイル用)。立体は 見取図の 線も 引く。
function itemSvg(item) {
  const b = item.box;
  const pad = Math.max(b.w, b.h) * 0.04;
  const lines = (item.lines || [])
    .map((l) => `<path class="line${l.dash ? ' dash' : ''}" d="${l.d}"/>`)
    .join('');
  return `<svg viewBox="${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}" ` +
    `role="img" aria-label="${item.name}のかたち"><path class="fig" d="${item.shape}"/>${lines}</svg>`;
}

function groupName(id) {
  const g = (game.topic.groups || []).find((x) => x.id === id);
  return g ? g.name : '';
}

function renderResult(cleared) {
  const unit = game.topic.unit;
  el.resultTitle.textContent = !cleared ? 'ゲームオーバー'
    : game.right === game.asked ? 'パーフェクト！'
    : game.right * 2 >= game.asked ? `${unit} 1しゅう クリア！`
    : `${unit} 1しゅう おわり`;
  el.resultScore.textContent = game.score;

  let best = readBest(game.topic.id, game.mode.id);
  if (game.score > best) {
    best = game.score;
    try { localStorage.setItem(bestKeyFor(), String(best)); } catch (e) { /* 保存できなくても遊べる */ }
    el.resultBest.textContent = '🎉 ハイスコアこうしん！';
    el.resultBest.classList.add('new');
  } else {
    el.resultBest.textContent = `ハイスコア: ${best}てん`;
    el.resultBest.classList.remove('new');
  }

  el.resultStats.innerHTML = '';
  const stats = [
    ['もんだい', `${game.asked}もん`],
    ['正かい', `${game.right}もん`],
    ['さいだいれんぞく', `${game.maxCombo}`],
    ['つかったヒント', `${game.hintsUsed}こ`],
    ['むずかしさ', game.mode.name],
    ['はやさ', `${game.speed}`],
  ];
  for (const [k, v] of stats) {
    const s = document.createElement('span');
    s.innerHTML = `${k} <b>${v}</b>`;
    el.resultStats.appendChild(s);
  }

  el.missBlock.innerHTML = '';
  if (game.misses.length) {
    const h3 = document.createElement('h3');
    h3.textContent = `つもってしまった ${unit}（もういちど おぼえよう）`;
    const list = document.createElement('div');
    list.className = 'miss-list';
    for (const item of game.misses) {
      const card = document.createElement('div');
      card.className = 'miss-card';
      card.innerHTML =
        itemSvg(item) +
        `<span class="m-name">${item.name}</span>` +
        `<span class="m-sub">${groupName(item.group)}</span>`;
      list.append(card);
    }
    el.missBlock.append(h3, list);
  }
}

/* ============================ タイトル ============================ */

function renderTitle() {
  el.topicList.innerHTML = '';
  for (const t of SHIROTTO_TOPICS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'topic-btn' + (t === game.topic ? ' is-on' : '');
    btn.innerHTML = `<span class="emoji">${t.emoji}</span><span>${t.name}</span>`;
    btn.addEventListener('click', () => { setTopic(t); renderTitle(); });
    el.topicList.appendChild(btn);
  }

  el.modeList.innerHTML = '';
  for (const m of MODES) {
    const best = readBest(game.topic.id, m.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mode-btn';
    btn.dataset.mode = m.id;
    btn.innerHTML =
      `<span class="m-emoji">${m.emoji}</span>` +
      `<span class="m-name">${m.name}</span>` +
      `<span class="m-note">${m.note}</span>` +
      `<span class="m-best">ハイスコア<b>${best}</b></span>`;
    btn.addEventListener('click', () => startGame(m));
    el.modeList.appendChild(btn);
  }
}

const SPEED_PRESETS = [
  { level: 10, label: 'のんびり' },
  { level: 20, label: 'ふつう' },
  { level: 40, label: 'はやい' },
  { level: 70, label: 'げきはや' },
  { level: 100, label: 'さいそく' },
];

function renderSpeed() {
  el.speedRange.value = String(game.speed);
  el.speedNum.textContent = game.speed;
  el.speedNote.textContent =
    `1つが おちきるまで やく ${fallSeconds(game.speed).toFixed(1)}びょう ／ 点数 ${speedMul(game.speed).toFixed(2)}ばい`;
  [...el.speedPresets.children].forEach((b) => {
    b.classList.toggle('is-on', Number(b.dataset.level) === game.speed);
  });
  if (el.speedView) el.speedView.textContent = game.speed;
}

function setSpeed(level, save) {
  game.speed = clamp(Math.round(level), SPEED.MIN, SPEED.MAX);
  if (save) {
    try { localStorage.setItem(SPEED_KEY, String(game.speed)); }
    catch (e) { /* 保存できなくても あそべる */ }
  }
  renderSpeed();
}

function initSpeedUi() {
  let saved = SPEED.DEFAULT;
  try {
    const v = Number(localStorage.getItem(SPEED_KEY));
    if (v >= SPEED.MIN && v <= SPEED.MAX) saved = v;
  } catch (e) { /* よみだせなくても あそべる */ }

  el.speedPresets.innerHTML = '';
  for (const p of SPEED_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.level = String(p.level);
    btn.textContent = `${p.label} ${p.level}`;
    btn.addEventListener('click', () => setSpeed(p.level, true));
    el.speedPresets.appendChild(btn);
  }
  el.speedRange.addEventListener('input', () => setSpeed(Number(el.speedRange.value), false));
  el.speedRange.addEventListener('change', () => setSpeed(Number(el.speedRange.value), true));
  setSpeed(saved, false);
}

function setTopic(topic) {
  game.topic = topic;
  miniMapBase = null;
  // 出題タイプが ないテーマは「なまえ」だけ
  if (!topic.quizzes) {
    topic.quizzes = [{ id: 'name', weight: 1, question: topic.question, field: 'name' }];
  }
  const dims = topic.items.map((i) => Math.max(i.box.w, i.box.h));
  topic.minDim = Math.min(...dims);
  topic.maxDim = Math.max(...dims);
}

function syncSoundButtons() {
  const on = SQAudio.isOn();
  el.soundTitle.textContent = on ? '🔊 音: オン' : '🔇 音: オフ';
  el.soundTitle.setAttribute('aria-pressed', String(on));
  el.soundGame.textContent = on ? '🔊' : '🔇';
  el.soundGame.setAttribute('aria-pressed', String(on));
}

function toggleSound() {
  SQAudio.unlock();
  SQAudio.setOn(!SQAudio.isOn());
  syncSoundButtons();
}

/* ============================ 起動 ============================ */

function init() {
  if (!SHIROTTO_TOPICS.length) {
    el.topicList.textContent = 'データが よみこめませんでした。';
    return;
  }
  setTopic(SHIROTTO_TOPICS[0]);
  initSpeedUi();
  renderTitle();
  syncSoundButtons();
  fitCanvas();

  el.hintBtn.addEventListener('click', () => revealHint(false));
  el.soundTitle.addEventListener('click', toggleSound);
  el.soundGame.addEventListener('click', toggleSound);
  el.quit.addEventListener('click', () => {
    game.running = false;
    SQAudio.bgm(false);
    renderTitle();
    show('title');
  });
  el.retry.addEventListener('click', () => startGame(game.mode));
  el.back.addEventListener('click', () => { renderTitle(); show('title'); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      SQAudio.bgm(false);
      game.lastT = performance.now();
    } else if (game.running) {
      SQAudio.bgm(true);
      game.lastT = performance.now();   // ループは requestAnimationFrame が じどうで 再開する
    }
  });

  window.addEventListener('resize', fitCanvas);
}

init();
