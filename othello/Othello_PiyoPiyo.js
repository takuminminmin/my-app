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
const setTimer = 30;
let timeLeft = setTimer;
CPU_DELAY_MS = 1000;

// 8方向ベクトル
const directions = [
    [-1,-1], [-1,0], [-1,1],
    [ 0, 1], [ 1,1], [ 1,0],
    [ 1,-1], [ 0,-1]
];

//盤面の座標ごとの重み
const POSITION_VALUE = [
    [100, -10, 10, 5, 5, 10, -10, 100],
    [-10, -20, 1, 1, 1, 1, -20, -10],
    [10, 1, 5, 2, 2, 5, 1, 10],
    [5, 1, 2, 1, 1, 2, 1, 5],
    [5, 1, 2, 1, 1, 2, 1, 5],
    [10, 1, 5, 2, 2, 5, 1, 10],
    [-10, -20, 1, 1, 1, 1, -20, -10],
    [100, -10, 10, 5, 5, 10, -10, 100]
];

// ====== Utils ======
const inBounds = (y, x) => {
    return y >= 0 && y < N && x >= 0 && x < N;
};

const setStatus = () => {
    statusEl.textContent = currentPlayer === 1 ? "黒ピヨの番です" : "白ピヨの番です";
};

const resetState = () => {
    for (let y = 0; y < N; y++) {
        cells[y].fill(0);
    }
    currentPlayer = 1;
    enemyPlayer   = 2;
    gameOver = false;
    skipped  = false;
    timeLeft = setTimer;
    clearInterval(timerId);
    timerEl.style.color = "black";
    timerEl.style.fontWeight = "normal";
    timerEl.textContent = "残り時間：" + timeLeft + "秒";
};

/**
 * 指定セルを再描画する
 */
const paintCell = (y, x) => {
    const cell = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (!cell) {
        return;
    }
    const old = cell.querySelector(".stone");
    if (old) {
        old.remove();
    }
    const v = cells[y][x];
    if (v === 0) {
        return;
    }
    const stone = document.createElement("div");
    stone.className = "stone " + (v === 1 ? "black" : "white");
    cell.appendChild(stone);
};

/**
 * 方向(j,i)で裏返せる数を返す（置けない場合は0）
 */
const countFlippableStones = (y, x, j, i) => {
    let cy = y + j;
    let cx = x + i;

    if (!inBounds(cy, cx) || cells[cy][cx] !== enemyPlayer) {
        return 0;
    }

    let count = 0;
    while (inBounds(cy, cx) && cells[cy][cx] === enemyPlayer) {
        count++;
        cy += j;
        cx += i;
    }

    return (inBounds(cy, cx) && cells[cy][cx] === currentPlayer) ? count : 0;
};

/**
 * (y,x)に置いたときの総裏返し数
 */
const totalFlipsAt = (y, x) => {
    if (cells[y][x] !== 0) {
        return 0;
    }
    return directions.reduce((sum, [j, i]) =>
        sum + countFlippableStones(y, x, j, i), 0
    );
};

/**
 * プレイヤー交代
 */
const changePlayer = () => {
    [currentPlayer, enemyPlayer] = [enemyPlayer, currentPlayer];
    setStatus();
    startTimer();
};

/**
 * 着手可能か
 */
const hasAnyMove = () => {
    return cells.some((row, y) =>
        row.some((v, x) => v === 0 && totalFlipsAt(y, x) > 0)
    );
};

/**
 * 勝敗を判定・表示
 */
const winner = () => {
    clearInterval(timerId);
    const blackLen = cells.flat().filter(v => v === 1).length;
    const whiteLen = cells.flat().filter(v => v === 2).length;
    let msg = `黒ピヨ：${blackLen}　白ピヨ：${whiteLen}　→ `;
    if (timeLeft <= 0) {
        msg += `タイムアウトで${(currentPlayer === 2 ? "黒ピヨ" : "白ピヨ")}の勝ち`
    }
    else {
        if(blackLen > whiteLen){
			msg += "黒ピヨの勝ち";
		}
		else if(blackLen < whiteLen){
			msg += "白ピヨの勝ち";
		}
		else{
			msg += "引き分けピヨ";
		}
    }
    statusEl.textContent = msg;
    gameOver = true;
};

// ====== Timer ======
const startTimer = () => {
    clearInterval(timerId);
    timeLeft = setTimer;
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
        }
        if (timeLeft <= 0) {
            clearInterval(timerId);
            alert((currentPlayer === 1 ? "黒ピヨ" : "白ピヨ") + "の時間切れ！");
            winner();
        }
    }, CPU_DELAY_MS);
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
    // 初期配置
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
    if (gameOver) {
        return;
    }
    const x = Number(e.currentTarget.dataset.x);
    const y = Number(e.currentTarget.dataset.y);
    
    //クリックされた座標(x,y)に石を置けるか.
    if (totalFlipsAt(y,x) === 0) {
        return;
    }
    applyMove(y,x);
    if(gameOver){
		console.log("勝負はついた")
		return;
	}
    if (!hasAnyMove()) {
        if (skipped) {
            winner();
            return;
        }
        skipped = true;
        alert((currentPlayer === 1 ? "黒ピヨ" : "白ピヨ") + "は置けないのでパスします");
        console.log((currentPlayer === 1 ? "黒ピヨ" : "白ピヨ") + "は置けないのでパスします")
        changePlayer();
    } else {
        skipped = false;
    }
    if (!gameOver && mode === "only" && currentPlayer === 2) {
        setTimeout(cpuMove, CPU_DELAY_MS);
    }
};

// ====== Apply Move ======
/**
 * y,xに石を置いてひっくり返す・終了判定・プレイヤー交代.
 */
const applyMove = (y, x) => {
    cells[y][x] = currentPlayer;
    paintCell(y, x);
    for (const [j, i] of directions) {
        let cnt = countFlippableStones(y, x, j, i);
        if (cnt <= 0) {
            continue;
        }
        let cy = y + j;
        let cx = x + i;
        while (cnt-- > 0) {
            cells[cy][cx] = currentPlayer;
            paintCell(cy, cx);
            cy += j;
            cx += i;
        }
    }
    const flatCells = cells.flat();
    // すべて埋まっている or 黒石がない or 白石がない.
    if(!flatCells.includes(0) || !flatCells.includes(1) || !flatCells.includes(2)){
		winner();
        return;
	}
    changePlayer();
};

// ====== CPU ======
const cpuMove = () => {
    let best = null;
    let max  = -100;
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            if (cells[y][x] !== 0) {
                continue;
            }
            const flips = totalFlipsAt(y, x);
            if(flips > 0 && (flips + POSITION_VALUE[y][x]) > max){
                max = posValueFlips;
                best = { y, x };
			}
        }
    }
    if (!best) {
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
