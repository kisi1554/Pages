// 東急線すごろく - ゲームロジック

const COLS = 6;
const LAST = STATIONS.length - 1;

const TYPE_ICONS = { start: "🏁", quiz: "❓", event: "🎲", goal: "🏆", normal: "" };

let players = [];
let currentPlayerIndex = 0;
let rankingList = [];
let quizPool = [];
let selectedCount = 0;

// ---------- ユーティリティ ----------
const $ = (id) => document.getElementById(id);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function nextQuiz() {
  if (quizPool.length === 0) quizPool = shuffled(QUIZZES);
  return quizPool.pop();
}

function addLog(text) {
  const li = document.createElement("li");
  li.textContent = text;
  $("log-list").prepend(li);
}

// ---------- セットアップ画面 ----------
function initSetupScreen() {
  const countWrap = $("player-count-buttons");
  countWrap.innerHTML = "";
  for (let n = 2; n <= 6; n++) {
    const btn = document.createElement("button");
    btn.className = "primary-btn";
    btn.textContent = `${n}人`;
    btn.addEventListener("click", () => selectPlayerCount(n));
    countWrap.appendChild(btn);
  }
}

function selectPlayerCount(n) {
  selectedCount = n;
  const inputsWrap = $("player-inputs");
  inputsWrap.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const row = document.createElement("div");
    row.className = "player-input-row";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 10;
    input.placeholder = `プレイヤー${i + 1}`;
    input.value = `プレイヤー${i + 1}`;
    input.dataset.index = i;

    const picker = document.createElement("div");
    picker.className = "token-emoji-picker";
    TOKEN_STYLES.forEach((style, styleIdx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = style.emoji;
      if (styleIdx === i % TOKEN_STYLES.length) b.classList.add("selected");
      b.dataset.styleIndex = styleIdx;
      b.addEventListener("click", () => {
        picker.querySelectorAll("button").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
      });
      picker.appendChild(b);
    });

    row.appendChild(input);
    row.appendChild(picker);
    inputsWrap.appendChild(row);
  }
  $("player-form").classList.remove("hidden");
}

function startGame() {
  const rows = document.querySelectorAll("#player-inputs .player-input-row");
  players = Array.from(rows).map((row, i) => {
    const nameInput = row.querySelector("input[type=text]");
    const selectedBtn = row.querySelector(".token-emoji-picker button.selected");
    const styleIdx = selectedBtn ? Number(selectedBtn.dataset.styleIndex) : i % TOKEN_STYLES.length;
    const style = TOKEN_STYLES[styleIdx];
    return {
      name: nameInput.value.trim() || `プレイヤー${i + 1}`,
      emoji: style.emoji,
      color: style.color,
      pos: 0,
      skipTurn: false,
      finished: false,
      rank: null,
    };
  });

  currentPlayerIndex = 0;
  rankingList = [];
  quizPool = shuffled(QUIZZES);
  $("log-list").innerHTML = "";

  $("setup-screen").classList.add("hidden");
  $("game-screen").classList.remove("hidden");

  renderBoard();
  renderPlayerStatus();
  updateTurnIndicator();
  addLog("すごろくスタート!渋谷から出発です。");
}

// ---------- 盤面描画 ----------
function renderBoard() {
  const board = $("board");
  board.innerHTML = "";
  STATIONS.forEach((station, idx) => {
    const row = Math.floor(idx / COLS);
    let col = idx % COLS;
    if (row % 2 === 1) col = COLS - 1 - col;

    const cell = document.createElement("div");
    cell.className = `cell type-${station.type}`;
    cell.style.gridRow = row + 1;
    cell.style.gridColumn = col + 1;
    cell.id = `cell-${idx}`;

    cell.innerHTML = `
      <div class="cell-index">${idx + 1}. ${station.line}</div>
      <div class="cell-name">${TYPE_ICONS[station.type]} ${station.name}</div>
      <div class="cell-tokens" id="tokens-${idx}"></div>
    `;
    board.appendChild(cell);
  });
  renderTokens();
}

function renderTokens() {
  document.querySelectorAll(".cell-tokens").forEach((el) => (el.innerHTML = ""));
  players.forEach((p) => {
    const wrap = $(`tokens-${p.pos}`);
    if (!wrap) return;
    const span = document.createElement("span");
    span.className = "token";
    span.style.background = p.color;
    span.title = p.name;
    span.textContent = p.emoji;
    wrap.appendChild(span);
  });
}

function renderPlayerStatus() {
  const list = $("player-status");
  list.innerHTML = "";
  players.forEach((p, idx) => {
    const li = document.createElement("li");
    if (idx === currentPlayerIndex && !p.finished) li.classList.add("current");
    const statusText = p.finished ? `${p.rank}位でゴール` : `${STATIONS[p.pos].name}(${p.pos + 1}マス目)`;
    li.innerHTML = `<span class="p-token" style="background:${p.color}">${p.emoji}</span> ${p.name} - ${statusText}`;
    list.appendChild(li);
  });
}

function updateTurnIndicator() {
  const p = players[currentPlayerIndex];
  $("turn-indicator").textContent = `${p.emoji} ${p.name} の番です`;
}

// ---------- モーダル ----------
function showInfoModal(title, body) {
  return new Promise((resolve) => {
    $("modal-title").textContent = title;
    $("modal-body").textContent = body;
    $("modal-choices").innerHTML = "";
    $("modal-note").classList.add("hidden");
    const okBtn = $("modal-ok-btn");
    okBtn.classList.remove("hidden");
    okBtn.textContent = "OK";
    $("modal-overlay").classList.remove("hidden");

    const handler = () => {
      okBtn.removeEventListener("click", handler);
      $("modal-overlay").classList.add("hidden");
      resolve();
    };
    okBtn.addEventListener("click", handler);
  });
}

function showQuizModal(quiz) {
  return new Promise((resolve) => {
    $("modal-title").textContent = "❓ クイズタイム!";
    $("modal-body").textContent = quiz.q;
    const choicesWrap = $("modal-choices");
    choicesWrap.innerHTML = "";
    const noteEl = $("modal-note");
    noteEl.classList.add("hidden");
    const okBtn = $("modal-ok-btn");
    okBtn.classList.add("hidden");
    $("modal-overlay").classList.remove("hidden");

    let answered = false;
    quiz.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.textContent = choice;
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const correct = i === quiz.answer;
        Array.from(choicesWrap.children).forEach((b, bi) => {
          b.disabled = true;
          if (bi === quiz.answer) b.classList.add("correct");
          else if (bi === i) b.classList.add("incorrect");
        });
        noteEl.textContent = (correct ? "🎉 正解! " : "😅 残念! ") + quiz.note;
        noteEl.classList.remove("hidden");
        okBtn.classList.remove("hidden");
        okBtn.textContent = correct ? "2マス進む" : "1マス戻る";

        const handler = () => {
          okBtn.removeEventListener("click", handler);
          $("modal-overlay").classList.add("hidden");
          resolve(correct);
        };
        okBtn.addEventListener("click", handler);
      });
      choicesWrap.appendChild(btn);
    });
  });
}

// ---------- 移動処理 ----------
async function animateMove(player, steps) {
  const dir = steps > 0 ? 1 : -1;
  const total = Math.abs(steps);
  for (let i = 0; i < total; i++) {
    if (player.finished) break;
    const newPos = clamp(player.pos + dir, 0, LAST);
    if (newPos === player.pos) break;
    player.pos = newPos;
    renderTokens();
    renderPlayerStatus();
    await delay(180);
    if (player.pos === LAST) {
      markFinished(player);
      break;
    }
  }
}

function markFinished(player) {
  if (player.finished) return;
  player.finished = true;
  player.rank = rankingList.length + 1;
  rankingList.push(player);
  addLog(`🏆 ${player.name} が新横浜に到着!第${player.rank}位です。`);
}

// ---------- マス効果 ----------
async function runFactSquare(player, square) {
  await showInfoModal(`${square.name}`, square.fact);
}

async function runEventSquare(player, square) {
  await showInfoModal(`🎲 ${square.name}`, square.fact);
  const effect = square.effect;
  if (effect.kind === "advance") {
    addLog(`${player.name} は ${effect.amount} マス進む!`);
    await animateMove(player, effect.amount);
  } else if (effect.kind === "back") {
    addLog(`${player.name} は ${effect.amount} マス戻る…`);
    await animateMove(player, -effect.amount);
  } else if (effect.kind === "skip") {
    player.skipTurn = true;
    addLog(`${player.name} は次の番が1回休みになった。`);
  }
}

async function runQuizSquare(player) {
  const quiz = nextQuiz();
  const correct = await showQuizModal(quiz);
  if (correct) {
    addLog(`${player.name} はクイズに正解して2マス進む!`);
    await animateMove(player, 2);
  } else {
    addLog(`${player.name} はクイズに不正解で1マス戻る…`);
    await animateMove(player, -1);
  }
}

// ---------- ターン進行 ----------
async function onDiceClick() {
  $("dice-btn").disabled = true;
  const player = players[currentPlayerIndex];

  if (player.skipTurn) {
    player.skipTurn = false;
    $("dice-result").textContent = "⏭";
    addLog(`😴 ${player.name} は1回休み。`);
    await delay(500);
    nextTurn();
    return;
  }

  const roll = 1 + Math.floor(Math.random() * 6);
  $("dice-result").textContent = `🎲 ${roll}`;
  addLog(`${player.name} はサイコロで ${roll} を出した。`);

  await animateMove(player, roll);
  if (player.finished) {
    nextTurn();
    return;
  }

  const square = STATIONS[player.pos];
  if (square.type === "quiz") {
    await runQuizSquare(player);
  } else if (square.type === "event") {
    await runEventSquare(player, square);
  } else {
    await runFactSquare(player, square);
  }

  renderPlayerStatus();
  nextTurn();
}

function nextTurn() {
  renderPlayerStatus();

  if (rankingList.length >= players.length) {
    showVictoryScreen();
    return;
  }

  do {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  } while (players[currentPlayerIndex].finished);

  const unfinished = players.filter((p) => !p.finished);
  if (unfinished.length === 1 && players.length > 1) {
    const p = unfinished[0];
    markFinished(p);
    renderPlayerStatus();
    showVictoryScreen();
    return;
  }

  updateTurnIndicator();
  $("dice-result").textContent = "";
  $("dice-btn").disabled = false;
}

// ---------- ゴール画面 ----------
function showVictoryScreen() {
  const ranked = [...rankingList].sort((a, b) => a.rank - b.rank);
  $("victory-body").textContent = "全員が新横浜にゴールしました!おつかれさまでした。";
  const list = $("ranking-list");
  list.innerHTML = "";
  ranked.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = `${p.rank}位: ${p.emoji} ${p.name}`;
    list.appendChild(li);
  });
  $("victory-overlay").classList.remove("hidden");
}

function resetToSetup() {
  $("victory-overlay").classList.add("hidden");
  $("game-screen").classList.add("hidden");
  $("player-form").classList.add("hidden");
  $("setup-screen").classList.remove("hidden");
}

// ---------- 初期化 ----------
initSetupScreen();
$("start-game-btn").addEventListener("click", startGame);
$("dice-btn").addEventListener("click", onDiceClick);
$("restart-btn").addEventListener("click", () => {
  if (confirm("最初からやり直しますか?")) resetToSetup();
});
$("play-again-btn").addEventListener("click", resetToSetup);
