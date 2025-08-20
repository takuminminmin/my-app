// ====== DOM ======
const statusEl     = document.getElementById("status");
const boardEl      = document.getElementById("board");
const timerEl      = document.getElementById("timer");
const startBtn     = document.getElementById("startBtn");
const startDiv     = document.getElementById("startDiv");
const selectedMode = document.getElementById("selectedMode");

// ====== State ======
const N = 8;
const cells = Array.from({ length: N }, () => Array(N).fill(0)); // 0:空, 1:黒, 2:白
let currentPlayer = 1; // 1=黒, 2=白
let enemyPlayer   = 2;
let mode = "";         // "only" = CP対戦 / "battle" = 友達対戦
let gameOver = false;
let skipped  = false;
let timerId  = null;
let timeLeft = 30;

// 8方向
const directions = [
  [-1,-1], [-1,0], [-1,1],
  [ 0, 1], [ 1,1], [ 1,0],
  [ 1,-1], [ 0,-1]
];

// ====== Utils ======
const inBounds = (y, x) => y >= 0 && y < N && x >= 0 && x < N;

const setStatus = () => {
  if (currentPlayer === 1) {
    statusEl.textContent = "黒ピヨの番です";
  } else {
    statusEl.textContent = "白ピヨの番です";
  }
};

const resetState = () => {
  for (let y = 0; y < N; y++) {
    cells[y].fill(0);
  }
  currentPlayer = 1;
  enemyPlayer   = 2;
  gameOver = false;
  skipped  = false;
  timeLeft = 30;
  clearInterval(timerId);
  timerEl.style.color = "black";
  timerEl.style.fontWeight = "normal";
  timerEl.textContent = "残り時間：" + timeLeft + "秒";
};

const paintCell = (y, x) => {
  const cell = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
  if (!cell) return;

  const old = cell.querySelector(".stone");
  if (old) cell.removeChild(old);

  const v = cells[y][x];
  if (v === 0) return;

  const stone = document.createElement("div");
  stone.className = "stone " + (v === 1 ? "black" : "white");
  cell.appendChild(stone);
};

const countFlippableStones = (y, x, j, i) => {
  let cy = y + j;
  let cx = x + i;

  if (!inBounds(cy, cx) || cells[cy][cx] !== enemyPlayer) return 0;

  let count = 0;
  while (inBounds(cy, cx) && cells[cy][cx] === enemyPlayer) {
    count++;
    cy += j;
    cx += i;
  }

  if (inBounds(cy, cx) && cells[cy][cx] === currentPlayer && count > 0) {
    return count;
  }
  return 0;
};

const totalFlipsAt = (y, x) => {
  if (cells[y][x] !== 0) return 0;
  let total = 0;
  for (const [j, i] of directions) {
    total += countFlippableStones(y, x, j, i);
  }
  return total;
};

const changePlayer = () => {
  if (currentPlayer === 1) {
    currentPlayer = 2;
    enemyPlayer = 1;
  } else {
    currentPlayer = 1;
    enemyPlayer = 2;
  }
  setStatus();
  startTimer();
};

const hasAnyMove = () => {
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (cells[y][x] === 0 && totalFlipsAt(y, x) > 0) {
        return true;
      }
    }
  }
  return false;
};

const winner = () => {
  clearInterval(timerId);
  const black = cells.flat().filter(v => v === 1).length;
  const white = cells.flat().filter(v => v === 2).length;
  if (black >= white) {
    statusEl.textContent = `黒ピヨ：${black}　白ピヨ：${white}　→ 黒ピヨの勝ち`;
  } else {
    statusEl.textContent = `黒ピヨ：${black}　白ピヨ：${white}　→ 白ピヨの勝ち`;
  }
  gameOver = true;
};

// ====== Timer ======
const startTimer = () => {
  clearInterval(timerId);
  timeLeft = 30;
  timerEl.style.color = "black";
  timerEl.style.fontWeight = "normal";
  timerEl.textContent = "残り時間：" + timeLeft + "秒";

  timerId = setInterval(() => {
    if (gameOver) {
      clearInterval(timerId);
      return;
    }
    timeLeft--;
    timerEl.textContent = "残り時間：" + timeLeft + "秒";
    if (timeLeft <= 10) {
      timerEl.style.color = "red";
      timerEl.style.fontWeight = "bold";
    } else {
      timerEl.style.color = "black";
      timerEl.style.fontWeight = "normal";
    }
    if (timeLeft <= 0) {
      clearInterval(timerId);
      alert((currentPlayer === 1 ? "黒ピヨ" : "白ピヨ") + "の時間切れ！");
      winner();
    }
  }, 1000);
};

// ====== Board ======
const createBoard = () => {
  boardEl.innerHTML = "";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener("click", onCellClick);
      boardEl.appendChild(cell);
    }
  }

  cells[3][3] = 2; cells[3][4] = 1;
  cells[4][3] = 1; cells[4][4] = 2;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      paintCell(y, x);
    }
  }

  setStatus();
  startTimer();
};

// ====== Click ======
const onCellClick = (e) => {
  if (gameOver) return;

  const cell = e.currentTarget;
  const x = +cell.dataset.x;
  const y = +cell.dataset.y;

  if (totalFlipsAt(y, x) === 0) return;

  applyMove(y, x);

  if (cells.flat().every(v => v !== 0)) {
    winner();
    return;
  }

  if (!hasAnyMove()) {
    if (skipped) {
      winner();
      return;
    }
    skipped = true;
    alert((currentPlayer === 1 ? "黒ピヨ" : "白ピヨ") + "は置けないのでパスします");
    changePlayer();
  } else {
    skipped = false;
  }

  if (!gameOver && mode === "only" && currentPlayer === 2) {
    setTimeout(cpuMove, 1000);
  }
};

// ====== Apply Move ======
const applyMove = (y, x) => {
  cells[y][x] = currentPlayer;
  paintCell(y, x);

  for (const [j, i] of directions) {
    const cnt = countFlippableStones(y, x, j, i);
    if (cnt <= 0) continue;

    let cy = y + j;
    let cx = x + i;
    for (let k = 0; k < cnt; k++) {
      cells[cy][cx] = currentPlayer;
      paintCell(cy, cx);
      cy += j;
      cx += i;
    }
  }

  changePlayer();
};

// ====== CPU ======
const cpuMove = () => {
  let best = null;
  let max  = 0;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (cells[y][x] !== 0) continue;
      const flips = totalFlipsAt(y, x);
      if (flips > max) { max = flips; best = { y, x }; }
    }
  }

  if (!best || max === 0) {
    if (skipped) {
      winner();
      return;
    }
    skipped = true;
    alert("白ピヨは置けないのでパスします");
    changePlayer();
    return;
  }

  skipped = false;
  applyMove(best.y, best.x);

  if (cells.flat().every(v => v !== 0)) { winner(); return; }
  if (!hasAnyMove()) {
    if (skipped) { winner(); return; }
    skipped = true;
    alert((currentPlayer === 1 ? "黒ピヨ" : "白ピヨ") + "は置けないのでパスします");
    changePlayer();
  }
};

// ====== Start ======
startBtn.addEventListener("click", () => {
  mode = selectedMode.value;
  if (!mode) {
    alert("遊びたいモードを選択してね");
    return;
  }
  startDiv.style.display = "none";
  resetState();
  createBoard();
});
