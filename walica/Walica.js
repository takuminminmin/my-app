let memberArr = [];
let chargeSum = 0;
let arrExpenseRecords = [];
const chargeAdjustmentObj = {};
// localStorageのキー名
const STORAGE_KEY = "records";
let selectedRecord = null;

const createGroup = document.getElementById("createGroup");
const groupName = document.getElementById("groupName");
const errMemberName = document.getElementById("errMemberName");
const mode = document.getElementById("mode");
const select = document.getElementById("payer");
const receive = document.getElementById("receive");
const purpose = document.getElementById("purpose");
const charge = document.getElementById("charge");
const editRowBtn = document.getElementById("editRowBtn");
const deleteRowBtn = document.getElementById("deleteRowBtn");
const containerTable = document.getElementById("containerTable");
const adjustment = document.getElementById("adjustment");
const recordsContainer = document.getElementById("recordsContainer");
const errRowBtn = document.getElementById("errRowBtn");
const deleteAll = document.getElementById("deleteAll");
const groupSetupContainer = document.getElementById("groupSetupContainer");
const expenseEntryContainer = document.getElementById("expenseEntryContainer");

//ロードされたときの処理.
window.addEventListener("DOMContentLoaded", () => {
    const dataObj = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    if (Object.keys(dataObj).length !== 0) {
        groupName.value = dataObj["groupName"];
        groupDisabled();
        dataObj["memberArr"].forEach(memberName => createMember(memberName));
        defaultExpenseEntryContainer();
        if ("resultDiv" in dataObj) {
            recordsContainer.style.display = "block";
            arrExpenseRecords = dataObj["arrExpenseRecords"];
            createAdjustmentTable(arrExpenseRecords);
            adjustment.innerHTML = dataObj["resultDiv"];
            adjustment.scrollIntoView({
                behavior: "smooth",
            });
        }
    }
//    localStorage.removeItem(STORAGE_KEY);
})

deleteAll.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
})

const addData = (key, value) => {
    const obj = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    obj[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

const addMember = () => {
	errMemberName.textContent = "";
    const memberName = document.getElementById("memberName").value.trim();
    if (!memberName) {
        errMemberName.textContent = "メンバー名を入力してください";
        return;
    }
    if (memberArr.includes(memberName)) {
        errMemberName.textContent = "同じ名前がすでに登録されています";
        return;
    }
    createMember(memberName);
    document.getElementById("memberName").value = "";
    if(createGroup.disabled){
		addData("memberArr", memberArr);
    	defaultExpenseEntryContainer();
	}
}

const createMember = (memberName) => {
    memberArr.push(memberName);
    // メンバー要素の作成
    const memberDiv = document.createElement('div');
    memberDiv.className = 'member';
    // 名前表示用のspan
    const nameSpan = document.createElement('span');
    nameSpan.textContent = memberName;
    // 削除ボタン
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-btn';
    // 削除イベント
    removeBtn.addEventListener('click', () => {
        memberDiv.remove();
        memberArr = memberArr.filter(val => val !== memberName);
        if(createGroup.disabled){
	        addData("memberArr", memberArr);
	        defaultExpenseEntryContainer();
        }
    });
    // 要素をまとめる
    memberDiv.appendChild(nameSpan);
    memberDiv.appendChild(removeBtn);
    document.getElementById('memberList').appendChild(memberDiv);
}

document.getElementById("addMemberBtn").addEventListener("click", addMember);

document.getElementById("memberName").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") {
        return;
    }
    addMember();
})

/**
 * 「グループ作成」ボタン押下時の処理
 */
createGroup.addEventListener("click", () => {
    document.querySelectorAll(".error").forEach(val => val.innerHTML = "");
    const groupNameVal = groupName.value.trim();
    let hasErr = false;
    if (!groupNameVal) {
        document.getElementById("errGroupName").textContent = "グループ名を入力してください";
        hasErr = true;
    }
    if (memberArr.length < 2) {
        errMemberName.textContent = "メンバーを2人以上追加してください";
        hasErr = true;
    }
    if (hasErr) {
        return;
    }
    addData("groupName", groupNameVal);
    addData("memberArr", memberArr);
    groupDisabled();
    defaultExpenseEntryContainer(); 
    select.focus();
})

const groupDisabled = () => {
    groupName.disabled = true;
    createGroup.disabled = true;
    deleteAll.style.display = "block";
}

/**
 * expenseEntryContainerのデフォルト表示.
 */
const defaultExpenseEntryContainer = () => {
	mode.textContent = "新規作成";
    document.getElementById("expenseEntryContainer").style.display = "block";
    //初期化.
    ["purpose", "charge"].forEach(eleName => document.getElementById(eleName).value = "");
    ["payer", "receive"].forEach(eleName => document.getElementById(eleName).innerHTML = "");
    //プルダウンリストの作成.
    memberArr.forEach(val => {
        const option = document.createElement("option");
        option.textContent = val;
        option.value = val;
        select.appendChild(option);
    })
    //チェックボックスの作成.
    memberArr.forEach(val => {
	    const label = document.createElement("label");
	    label.style.marginRight = "10px";   // 横スペース
	    label.style.display = "inline-flex"; // 横並び
	    label.style.alignItems = "center";   // チェックボックスと文字を縦中央揃え
	    label.style.cursor = "pointer";      // クリック可能感
	    const checkbox = document.createElement("input");
	    checkbox.type = "checkbox";
	    checkbox.name = "receive";
	    checkbox.value = val;
	    checkbox.checked = true;
	    // label に checkbox とテキストをまとめる
	    label.appendChild(checkbox);
	    label.appendChild(document.createTextNode(val));
	    // #receive に追加
	    receive.appendChild(label);
	});
}

/**
 * 登録ボタン押下時の処理
 */
document.getElementById("registration").addEventListener("click", () => {
    let hasErr = false;
    document.querySelectorAll(".error").forEach(val => val.innerHTML = "");
    const payer = document.getElementById("payer").value;
    const checkboxes = document.querySelectorAll('input[name="receive"]:checked');
    if (checkboxes.length === 0) {
        document.getElementById("errReceive").textContent = "立替え対象のメンバーを1人以上選択してください";
        hasErr = true;
    }
    const checkedMember = Array.from(checkboxes).map(cb => cb.value);

    const purposeVal = purpose.value.trim();
    if (!purposeVal) {
        document.getElementById("errPurpose").textContent = "支払い名を入力してください";
        hasErr = true;
    }
    const chargeVal = charge.value;
    if (chargeVal < 1) {
        document.getElementById("errCharge").textContent = "金額は1円以上を入力してください";
        hasErr = true;
    }
    if (hasErr) {
        return;
    }
    addExpenseRecords(payer, checkedMember, purposeVal, chargeVal);
    //編集の場合、編集元のデータを削除.
    if(selectedRecord){
		arrExpenseRecords = arrExpenseRecords.filter(val => val !== selectedRecord);
	}
    createAdjustmentTable(arrExpenseRecords);
    recordsContainer.style.display = "block";
    createAdjustmentCalc();
    defaultExpenseEntryContainer();
})

/**
 * キャンセルボタン押下時
 */
document.getElementById("cancelBtn").addEventListener("click", () => {
	selectedRecord = null;
	defaultExpenseEntryContainer();
})

const createAdjustmentCalc = () => {
	memberArr.forEach(member => calculationCharge(member));
	//誰が誰にいくら払うかの計算
    const settlements = [];
    // 過不足を分けて配列に
    const plusList = [];
    const minusList = [];
    for (const member in chargeAdjustmentObj) {
        const amount = chargeAdjustmentObj[member];
        if (amount > 0) {
            plusList.push({ name: member, amount: amount });
        } else if (amount < 0) {
            minusList.push({ name: member, amount: -amount }); // 正の値に変換
        }
    }
    // 精算ループ（貰う人に優先して支払う）
    while (plusList.length > 0 && minusList.length > 0) {
        const payer = minusList[0];
        const receiver = plusList[0];
        const amount = Math.min(payer.amount, receiver.amount);
        settlements.push(`${payer.name} → ${receiver.name}：${amount.toFixed(0)} 円`);
        payer.amount -= amount;
        receiver.amount -= amount;
        if (payer.amount === 0) {
            minusList.shift();
        }
        if (receiver.amount === 0) {
            plusList.shift();
        }
    }
    chargeSum = 0;
    arrExpenseRecords.forEach(record => {
		chargeSum += record["charge"];
	})
    //精算案の表示.
    adjustment.innerHTML = "";
    const resultDiv = document.createElement("div");
    resultDiv.innerHTML = `<h3>精算案</h3><ul>${settlements.map(s => `<li>${s}</li>`).join("")}</ul>`;
    resultDiv.innerHTML += `<ul>合計支出額：${chargeSum}円</ul>`;
    adjustment.appendChild(resultDiv);
    addData("resultDiv", resultDiv.innerHTML);
    adjustment.scrollIntoView({
        behavior: "auto",
    });
}

/**
 * メンバーそれぞれの支払金額の計算
 */
const calculationCharge = (member) => {
    let pay = 0;
    let receive = 0;
    arrExpenseRecords.forEach(record => {
        if (record.payer === member) {
            pay += record.charge;
        }
        if (record.checkedMember.includes(member)) {
            receive += record.charge / record.checkedMember.length;
        }
    })
    chargeAdjustmentObj[member] = (pay - receive);
}

/**
 * 新たに追加された立替記録を配列に追加
 */
const addExpenseRecords = (payer, checkedMember, purpose, charge) => {
    const expenseRecords = {
        purpose: purpose,
        payer: payer,
        checkedMember: checkedMember,
        charge: Number(charge),
    }
    arrExpenseRecords.push(expenseRecords);
}

/**
 * 立替え記録一覧の作成
 */
const createAdjustmentTable = (arrExpenseRecords) => {
    containerTable.innerHTML = "";
    const table = document.createElement("table");
    const trHeader = document.createElement("tr");
	["立て替えた物", "立て替えた人", "対象メンバ", "金額(円)"].forEach(val => {
	    const th = document.createElement("th");
	    th.textContent = val;
	    trHeader.appendChild(th);
	});
	table.appendChild(trHeader);
    arrExpenseRecords.forEach(record => {
        const tr = document.createElement("tr");
        ["purpose", "payer", "checkedMember", "charge"].forEach(val => {
            const td = document.createElement("td");
            td.textContent = record[val];
            //金額は右寄せで表示.
            if (val === "charge") {
		        td.style.textAlign = "right";
		    }
            tr.appendChild(td);
        })
        tr.addEventListener("click", () => {
            table.querySelectorAll("tr").forEach(r => r.classList.remove("highlight"));
            setEditButtonsAndContainers(false,"none");
            selectedRecord = record;
            tr.classList.add("highlight");
            errRowBtn.textContent 
            = "編集、削除以外の操作は「選択解除」ボタンを押してね";
        })
        table.appendChild(tr);
    })
    containerTable.appendChild(table);
    addData("arrExpenseRecords", arrExpenseRecords);
}

const setEditButtonsAndContainers = (disableButtons, containerDisplay) => {
    editRowBtn.disabled = disableButtons;
    deleteRowBtn.disabled = disableButtons;
    quitEdit.disabled = disableButtons;
    groupSetupContainer.style.display = containerDisplay;
    expenseEntryContainer.style.display = containerDisplay;
}

/**
 * 編集ボタン押下時の処理
 */
editRowBtn.addEventListener("click", () => {
	mode.textContent = "編集中";
	errRowBtn.textContent = "";
	setEditButtonsAndContainers(true,"block");
    containerTable.querySelectorAll("tr").forEach(r => r.classList.remove("highlight"));
    //プルダウンリストの選択を変更.
    const opt = select.options;
    for (let i = 0; i < opt.length; i++) {
        if (opt[i].textContent === selectedRecord["payer"]) {
            select.selectedIndex = i; // その option を選択状態にする
            break;
        }
    }
    //チェックボックスのチェックを変更.
    const labels = receive.querySelectorAll("label");
    labels.forEach(label => {
        const checkbox = label.querySelector("input[type=checkbox]");
        if (selectedRecord["checkedMember"].includes(label.textContent.trim())) {
            checkbox.checked = true;
        }
        else {
            checkbox.checked = false;
        }
    });
    purpose.value = selectedRecord["purpose"];
    charge.value = selectedRecord["charge"];
    select.focus();
})

/**
 * 削除ボタン押下時の処理
 */
deleteRowBtn.addEventListener("click", () => {
	errRowBtn.textContent = "";
	setEditButtonsAndContainers(true,"block");
    document.getElementById("containerTable").querySelector(".highlight").remove();
    arrExpenseRecords = arrExpenseRecords.filter(val => val !== selectedRecord);
    addData("arrExpenseRecords", arrExpenseRecords);
    createAdjustmentCalc();
    if(arrExpenseRecords.length === 0){
		recordsContainer.style.display = "none";
		select.focus();
	}
})

/**
 * 選択解除ボタン押下時の処理
 */
document.getElementById("quitEdit").addEventListener("click", () => {
    containerTable.querySelectorAll("tr").forEach(r => r.classList.remove("highlight"));
    selectedRecord = null;
    setEditButtonsAndContainers(true,"block");
    adjustment.scrollIntoView({
        behavior: "auto",
    });
    errRowBtn.textContent = "";
})
