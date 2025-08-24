let mode = "vsPC";          // "vsPC" or "battle"
let digits = 0;
let timerValue = "noTimeLimit";
let countdownTimer;

// battle 用
let player1_Ans = "";
let player2_Ans = "";
let player1_showArray = [];
let player2_showArray = [];
let player = 1;
let turn = 1;
let player1_win = false;

// vsPC 用
let ansArray = [];
let showArray = [];

// 共通DOM
const inputNumEl = document.getElementById("inputNum");
const sendBtn = document.getElementById("send");
const retryBtn = document.getElementById("retry");
const gameStartBtn = document.getElementById("gameStart");
const messageEl = document.getElementById("message");
const finishEl = document.getElementById("finish");

// ======================
// 共通イベント
// ======================
inputNumEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        sendBtn.click();
    }
});

gameStartBtn.addEventListener("click", () => {
    mode = document.getElementById("mode").value;
    digits = Number(document.getElementById("digits").value);
    timerValue = document.getElementById("timer").value;

    gameStartBtn.disabled = true;
    document.getElementById("mode").disabled = true;
    document.getElementById("digits").disabled = true;
    document.getElementById("timer").disabled = true;
    inputNumEl.disabled = false;
    sendBtn.disabled = false;

    if (mode === "vsPC") {
        startVsPC();
    } else {
        startBattle();
    }
});

retryBtn.addEventListener("click", () => {
    location.reload();
});

// ======================
// vsPCモード
// ======================
function startVsPC() {
    ansArray = [];
    showArray = [];
    while (ansArray.length < digits) {
        const num = Math.floor(Math.random() * 10);
        if (!ansArray.includes(num)) ansArray.push(num);
    }
    if (timerValue !== "noTimeLimit" && timerValue !== "default") {
        countTime(Number(timerValue));
    }
}

function playVsPC(inputNum) {
    if (!checkInputNum(inputNum)) return;
    showArray.push(inputNum);
    const result = judgeVsPC(inputNum);
    showArray.push(result.hit);
    showArray.push(result.blow);

    const container = document.getElementById("tableContainer");
    container.replaceChildren(createTable(["入力値", "Hit", "Blow"], showArray));

    if (result.hit == digits) {
        clearInterval(countdownTimer);
        finishEl.textContent = "ゲームクリア！！ 正解: " + ansArray.join("");
        inputNumEl.disabled = true;
        sendBtn.disabled = true;
        retryBtn.disabled = false;
    } else {
        inputNumEl.value = "";
        if (timerValue !== "noTimeLimit" && timerValue !== "default") {
            countTime(Number(timerValue));
        }
    }
}

function judgeVsPC(inputNum) {
    const inputArray = inputNum.split("").map(Number);
    let hit = 0;
    let blow = 0;
    for (let i = 0; i < digits; i++) {
        for (let j = 0; j < digits; j++) {
            if (ansArray[i] == inputArray[j]) {
                if (i === j) hit++;
                else blow++;
                break;
            }
        }
    }
    return { hit, blow };
}

// ======================
// battleモード
// ======================
function startBattle() {
    messageEl.textContent = "プレイヤー1: " + digits + "桁の数字を決めてください";
    document.getElementById("tablesWrapper").style.display = "flex";
}

function playBattle(inputNum) {
    if (!checkInputNum(inputNum)) return;

    if (player1_Ans === "") {
        player1_Ans = inputNum;
        messageEl.textContent = "プレイヤー2: " + digits + "桁の数字を決めてください";
    } else if (player2_Ans === "") {
        player2_Ans = inputNum;
        messageEl.textContent = "プレイヤー1: " + digits + "桁の数字を推理してください";
        inputNumEl.value = "";
        if (timerValue !== "noTimeLimit" && timerValue !== "default") {
            countTime(Number(timerValue));
        }
    } else {
        const result = judgeBattle(inputNum);
        if (player === 1) {
            player1_showArray.push(inputNum, result.hit, result.blow);
            const container = document.getElementById("tableContainer_player1");
            container.replaceChildren(createTable(["プレイヤー1", "Hit", "Blow"], player1_showArray));
        } else {
            player2_showArray.push(inputNum, result.hit, result.blow);
            const container = document.getElementById("tableContainer_player2");
            container.replaceChildren(createTable(["プレイヤー2", "Hit", "Blow"], player2_showArray));
        }

        if (result.hit == digits) {
            if (player === 1) {
                player1_win = true;
                if (timerValue !== "noTimeLimit") countTime(Number(timerValue));
                changePlayer();
            } else if (player1_win) {
                winner("draw");
            } else {
                winner("プレイヤー2");
            }
        } else if (player === 2 && player1_win) {
            player1_win = false;
            winner("プレイヤー1");
        } else {
            if (timerValue !== "noTimeLimit") countTime(Number(timerValue));
            changePlayer();
        }
    }
}

function judgeBattle(inputNum) {
    let ansArray = player === 1 ? player2_Ans : player1_Ans;
    let hit = 0;
    let blow = 0;
    for (let i = 0; i < digits; i++) {
        if (ansArray[i] == inputNum[i]) hit++;
        else if (ansArray.includes(inputNum[i])) blow++;
    }
    return { hit, blow };
}

function changePlayer() {
    player = turn % 2 === 1 ? 2 : 1;
    turn++;
    messageEl.textContent = "プレイヤー" + player + ": " + digits + "桁の数字を推理してください";
}

function winner(reason) {
    clearInterval(countdownTimer);
    inputNumEl.disabled = true;
    sendBtn.disabled = true;
    retryBtn.disabled = false;

    let comment = "";
    if (reason === "timeOver") comment = "タイムオーバー！！ プレイヤー" + player + "の負け";
    else if (reason === "draw") comment = "引き分け！！";
    else comment = reason + "の勝ち";

    comment += "<br>プレイヤー1の答え：" + player1_Ans;
    comment += "<br>プレイヤー2の答え：" + player2_Ans;
    finishEl.innerHTML = comment;
}

// ======================
// 共通ロジック
// ======================
sendBtn.addEventListener("click", () => {
    const inputNum = inputNumEl.value;
    if (mode === "vsPC") {
        playVsPC(inputNum);
    } else {
        playBattle(inputNum);
    }
    inputNumEl.value = "";
    inputNumEl.focus();
});

function checkInputNum(inputNum) {
    if (inputNum.length != digits) {
        alert(digits + "桁の数値を入力してください");
    } else if (new Set(inputNum).size != digits) {
        alert("入力値に重複があります");
    } else {
        return true;
    }
    return false;
}

function createTable(headers, arr) {
    const table = document.createElement("table");
    const header = document.createElement("tr");
    headers.forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        header.appendChild(th);
    });
    table.appendChild(header);

    let tr = document.createElement("tr");
    table.appendChild(tr);

    for (let i = 0; i < arr.length; i++) {
        if (i != 0 && i % headers.length === 0) {
            tr = document.createElement("tr");
            table.appendChild(tr);
        }
        const td = document.createElement("td");
        td.textContent = arr[i];
        tr.appendChild(td);
    }
    return table;
}

function countTime(timeLeft) {
    clearInterval(countdownTimer);
    const countDownElem = document.getElementById("countDown");
    countDownElem.textContent = `残り時間: ${timeLeft}秒`;
    countdownTimer = setInterval(() => {
        timeLeft--;
        countDownElem.textContent = `残り時間: ${timeLeft}秒`;
        if (timeLeft <= 0) {
            if (mode === "vsPC") {
                finishEl.textContent = "時間切れ！ 正解: " + ansArray.join("");
            } else {
                winner("timeOver");
            }
            clearInterval(countdownTimer);
            inputNumEl.disabled = true;
            sendBtn.disabled = true;
            retryBtn.disabled = false;
        }
    }, 1000);
}
