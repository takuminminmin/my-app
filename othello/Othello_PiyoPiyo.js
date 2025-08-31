// ====== DOM ====== 
const statusEl     = document.getElementById("status");
const boardEl      = document.getElementById("board");
const timerEl      = document.getElementById("timer");
const startBtn     = document.getElementById("startBtn");
const startDiv     = document.getElementById("startDiv");
const selectedMode = document.getElementById("selectedMode");
const cpuLevelEl = document.getElementById("cpuLevel");

// ====== State ======
const N = 8;
const cells = Array.from({ length: N }, () => Array(N).fill(0)); // 0:空, 1:黒, 2:白
let currentPlayer = 1; // 1=黒, 2=白
let enemyPlayer   = 2;
let mode = "";         // "cpuMode" = CP対戦 / "friendMode" = 友達対戦
let gameOver = false;
let skipped  = false;
let timerId  = null;
let setTimer = null;
let timeLeft = null;
let cpuLevel = null;
let playerTurnEnd = true;

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
    statusEl.textContent = currentPlayer === 1 ? "黒ピヨの番" : "白ピヨの番";
};

const resetState = () => {
    for (let y = 0; y < N; y++) {
        cells[y].fill(0);
    }
    currentPlayer = 1;
    enemyPlayer   = 2;
    gameOver = false;
    skipped  = false;
    if(setTimer !== "noLimited"){
		timeLeft = setTimer;
	    clearInterval(timerId);
	    timerEl.style.color = "black";
	    timerEl.style.fontWeight = "normal";
	    timerEl.textContent = "残り：" + timeLeft + "秒";
	}
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
    if(setTimer !== "noLimited"){
        startTimer();
    }
    // CPUの番ならクリック禁止
    if (mode === "cpuMode" && currentPlayer === 2) {
        playerTurnEnd = false;
    } else {
        playerTurnEnd = true;
    }
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
    timerEl.style.display = "none";
    const blackLen = cells.flat().filter(v => v === 1).length;
    const whiteLen = cells.flat().filter(v => v === 2).length;
    let msg = `黒ピヨ：${blackLen}　白ピヨ：${whiteLen}　→ `;
	let winnerText = "";
	if (timeLeft <= 0) {
	    winnerText = `タイムアウトで${(currentPlayer === 2 ? "黒ピヨ" : "白ピヨ")}の勝ち`;
	} else {
	    if (blackLen > whiteLen) {
	        winnerText = "黒ピヨの勝ち";
	    } else if (blackLen < whiteLen) {
	        winnerText = "白ピヨの勝ち";
	    } else {
	        winnerText = "引き分けピヨ";
	    }
	}
	winnerText = `<span style="color:red; font-weight:bold">${winnerText}</span>`;
	statusEl.innerHTML = msg + "<br>" + winnerText;
    gameOver = true;
};

// ====== Timer ======
const startTimer = () => {
    clearInterval(timerId);
    timeLeft = setTimer;
    timerEl.style.color = "black";
    timerEl.style.fontWeight = "normal";
    timerEl.textContent = "残り：" + timeLeft + "秒";

    timerId = setInterval(() => {
        if (gameOver) {
            clearInterval(timerId);
            return;
        }
        timeLeft--;
        timerEl.textContent = "残り：" + timeLeft + "秒";
        if (timeLeft <= 10) {
            timerEl.style.color = "red";
            timerEl.style.fontWeight = "bold";
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
    // 初期配置
    cells[3][3] = 2; cells[3][4] = 1;
    cells[4][3] = 1; cells[4][4] = 2;
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            paintCell(y, x);
        }
    }
    setStatus();
    if(setTimer !== "noLimited"){
		startTimer();
	}
    
};

// ====== Click ======
const onCellClick = (e) => {
    if (gameOver || !playerTurnEnd) {
        return;
    }
    const x = Number(e.currentTarget.dataset.x);
    const y = Number(e.currentTarget.dataset.y);
    //クリックされた座標(x,y)に石を置けるか.
    if (totalFlipsAt(y,x) === 0) {
        return;
    }
    playerTurnEnd = false;
    applyMove(y,x);
    if(gameOver){
		return;
	}
    if (!hasAnyMove()) {
        if (skipped) {
            winner();
            return;
        }
        skipProcess();
    } 
    else {
        skipped = false;
    }
    if (!gameOver && mode==="cpuMode" && currentPlayer === 2) {
		cpuMove();
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
            const flips = totalFlipsAt(y, x);
            if(flips > 0){
				//総裏返し数が最大値の位置
				if(cpuLevel === "easy" && flips > max){
	                max = flips;
	                best = { y, x };
				}
				else if (cpuLevel === "normal" && (flips + POSITION_VALUE[y][x] * 0.5) > max) {
				    max = flips + POSITION_VALUE[y][x] * 0.5;
				    best = { y, x };
				}
				//総裏返し数と座標の重みの和
				else if(cpuLevel === "hard" && (flips + POSITION_VALUE[y][x]) > max){
	                max = flips + POSITION_VALUE[y][x];
	                best = { y, x };
				}
			}
        }
    }
    if (!best) {
        if (skipped) {
            winner();
            return;
        }
        skipProcess();
        return;
    }
    //1秒後に実行
    setTimeout(() => {
		skipped = false;
	    applyMove(best.y, best.x);
	    if(gameOver === true){
			return;
		}
	    if (!hasAnyMove()) {
	        if (skipped) {
	            winner();
	            return;
	        }
	        skipProcess();
	    }
	}, 1000);
};

const skipProcess = () => {
	skipped = true;
    alert((currentPlayer === 1 ? "黒ピヨ" : "白ピヨ") + "は置けないのでパスします");
    changePlayer();
}

const setCpuLevel = () => {
    cpuLevel = cpuLevelEl.value;
    let msgCpuLevel = "";
    if(cpuLevel === "easy"){
        msgCpuLevel = "簡単";
    }
    else if(cpuLevel === "normal"){
        msgCpuLevel = "普通";
    }
    else {
        msgCpuLevel = "難しい";
    }
    document.getElementById("gameSettings").textContent = `モード：CPUと対戦　　レベル：${msgCpuLevel}`;
}

// ====== Start ======
startBtn.addEventListener("click", () => {
    mode = selectedMode.value;
    if(mode === "cpuMode"){
		setCpuLevel();
	}
	setTimer = document.getElementById("setTimer").value;
	if (setTimer !== "noLimited") {
		setTimer = Number(setTimer);
	}
	timeLeft = setTimer;
    startDiv.style.display = "none";
    resetState();
    createBoard();
});

selectedMode.addEventListener("change", () => {
	if(selectedMode.value === "cpuMode"){
		cpuLevelEl.disabled = false;
		cpuLevel = cpuLevelEl.value;
	}
	else{
		cpuLevelEl.disabled = true;
	}
})

