// 🔄 定数名をより明確にし、DOM取得を一度だけ行う
const approverSelect = document.getElementById("approver");
const inputPassword = document.getElementById("password");
const passwordError = document.getElementById("passwordErr");
const resetButton = document.getElementById("reset");
const applicationForm = document.getElementById("applicationForm");
const approverForm = document.getElementById("approverForm");

let requestId = null;
let order = null;

let hasError = false;
let condition = "承認待ち";
document.getElementById("btnApproval").addEventListener('click',() => {
    condition = "承認";
});
document.getElementById("btnRejection").addEventListener('click',() => {
    condition = "却下";
});

// 🔄 値チェック用
//todo パスワードリストを承認者用に変更する.
const passwordList = {
    "たくみ": "takumi",
    "まな": "mana",
    "ヨッシー": "yosio",
};

const departmentList = [
    {
        code: "sales",
        name: "営業部",
        approvers: ["坂本さん", "佐藤部長", "田中課長"]
    },
    {
        code: "hr",
        name: "人事部",
        approvers: ["山本部長", "偉い人"]
    },
    {
        code: "dev",
        name: "開発部",
        approvers: ["鈴木CTO", "高橋マネージャー"]
    }
];

const fields = ["applicantName", "department", "goods", "quantity", "date", "reason"];

// ✅ localStorageから復元
window.addEventListener('DOMContentLoaded', () => {
    fields.forEach(id => {
        const saved = localStorage.getItem(id);
        if (saved !== null) {
            const el = document.getElementById(id);
            if (el){
                el.value = saved;
            }
        }
    });
});

// ✅ 入力保存処理
fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("input", () => {
            localStorage.setItem(id, el.value);
        });
    }
});

/**✅ 承認者リスト作成（関数に移動） */
function createApproverList(departmentCode) {
    const dept = departmentList.find(d => d.code === departmentCode);
    if (!dept) return;

    approverSelect.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "--選択してください--";
    approverSelect.appendChild(defaultOption);

    dept.approvers.forEach(name => {
        const option = document.createElement("option");
        option.value = `${dept.code}:${name}`;
        option.textContent = `${dept.name} (${name})`;
        approverSelect.appendChild(option);
    });
}

// ✅ localStorage削除関数
function clearLocalStorage() {
    fields.forEach(id => localStorage.removeItem(id));
    location.reload();
    document.getElementById("applicantName").focus();
}

// ✅ 結果テーブル生成
function createTable(history) {
    const historyTable = document.getElementById("historyTable");
    historyTable.innerHTML = "";

    const table = document.createElement("table");

    const tr = document.createElement("tr");
    ["ID", "状態"].forEach(header => {
        const th = document.createElement("th");
        th.textContent = header;
        tr.appendChild(th);
    })
    table.appendChild(tr);
    history.forEach(recode => {
        const tr = document.createElement("tr");
        ["id","condition"].forEach(key => {
            const td = document.createElement("td");
            td.textContent = recode[key];
            tr.appendChild(td);
        })
        tr.addEventListener('click', () => {
            const allRows = table.querySelectorAll("tr");
            allRows.forEach(row => row.classList.remove("highlight"));
            requestId = recode.id;
            tr.classList.add("highlight");
        })
        table.appendChild(tr);
    });

    historyTable.appendChild(table);
}

const checkErr = (target,id,message) => {
    if(!target){
        document.getElementById(id).textContent = message;
        hasError = true;
    }
}

// ✅ 応募フォーム送信処理
applicationForm.addEventListener("submit", (e) => {
    e.preventDefault();
    document.querySelectorAll(".error").forEach(el => el.textContent = "");

    const applicantName = document.getElementById("applicantName").value.trim();
    const department = document.getElementById("department").value;
    const goods = document.getElementById("goods").value.trim();
    const quantity = Number(document.getElementById("quantity").value.trim());
    const date = document.getElementById("date").value;
    const reason = document.getElementById("reason").value.trim();
    const file = document.getElementById("file").files[0];
    hasError = false;
    
    checkErr(applicantName,"errName","申請者名を入力してください");
    checkErr(department,"errDepartment","所属部門を選択してください。");
    checkErr(goods,"errGoods","購入品名を入力してください。");
    checkErr(quantity,"errQuantity","数量は1以上を入力してください。");
    
    if (!date) {
        document.getElementById("errDate").textContent = "希望日を選択してください。";
        hasError = true;
    } else {
        const today = new Date().toISOString().split("T")[0];
        if (date < today) {
            document.getElementById("errDate").textContent = "希望日は今日以降にしてください。";
            hasError = true;
        }
    }
    if (reason.length > 20) {
        document.getElementById("errReason").textContent = "理由が長すぎます";
        hasError = true;
    }
    if (file) {
        const validTypes = ["image/jpeg", "image/png", "application/pdf"];
        if (!validTypes.includes(file.type)) {
            document.getElementById("errFile").textContent = "jpg/png/pdf のみ対応";
            hasError = true;
        }
    }
    if (hasError) {
        return;
    }

    document.getElementById("result").textContent = "✅ 申請完了！";
    approverSelect.disabled = false;
    inputPassword.disabled = false;
    createApproverList(department);
    requestId = "REQ:" + new Date().toISOString().replace(/[-:.TZ]/g, "");
    const newRecord = {
        id: requestId,
        condition: condition,
        applicantName: applicantName,
        department: department,
        goods: goods,
        quantity: quantity, 
        date: date,
        reason: reason,
    };

    
    let history = getHistory();
    history.push(newRecord);
    localStorage.setItem("applicationHistory",JSON.stringify(history));
    history = getHistory();
    createTable(history);


});

function getHistory() {
    const raw = localStorage.getItem("applicationHistory");
    let parsed;
    try {
        parsed = raw ? JSON.parse(raw) : [];
    } catch (e) {
        parsed = []; // パースエラー時も空配列に
    }
    return Array.isArray(parsed) ? parsed : [];
}

// ✅ 承認者選択＆パスワード認証
approverForm.addEventListener("submit", (e) => {
    e.preventDefault();
    errApprover.innerHTML = "";
    passwordError.textContent = "";

    const applicantName = document.getElementById("applicantName").value.trim();
    const approver = approverSelect.value;
    hasError = false;
    if (passwordList[applicantName] !== inputPassword.value) {
        passwordError.textContent = "パスワードが不正です";
        hasError = true;
    } 
    checkErr(approver,"errApprover","承認者を選択してください");
    if(hasError){
        return;
    }

    const department = document.getElementById("department").value;
    const goods = document.getElementById("goods").value.trim();
    const quantity = document.getElementById("quantity").value.trim();
    const date = document.getElementById("date").value;
    const reason = document.getElementById("reason").value.trim();
    const fileName = document.getElementById("file").files[0]?.name || "";

    const history = getHistory()
    const recode = history.find(item => item.id === requestId);
    if(!recode){
        return;
    }
    recode.condition = condition;
    localStorage.setItem("applicationHistory",JSON.stringify(history));
    createTable(history)
});

// ✅ リセットボタン処理
resetButton.addEventListener("click", clearLocalStorage);

document.getElementById("btnEdit").addEventListener('click',() => {
    order = "edit";
});

document.getElementById("btnDelete").addEventListener('click',() => {
    order = "delete";
});

document.getElementById("btnCreate").addEventListener('click',() => {
    order = "create";
});

document.getElementById("tableForm").addEventListener("submit",(e) => {
    e.preventDefault();
    if(order === "create"){
        clearLocalStorage();
    }
    if(!requestId){
        window.alert("削除する項目を選択してください");
        return;
    }
    else if(order === "delete"){
        let history = getHistory();
        deletedHistory = history.filter(recode => recode.id !== requestId);
        localStorage.setItem("applicationHistory",JSON.stringify(deletedHistory));
        history = getHistory();
        createTable(history);
    }
    else if(order === "edit"){
        let history = getHistory();
        const selectedHistory = history.find(recode => recode.id === requestId);
        fields.forEach(tmp => {
            document.getElementById(tmp).value = selectedHistory[tmp];
        })
    }
    
})
