//1月25日に更新したよ.

// ============================
// Walica.js 完全版（メール認証版 修正版）
// ============================

// ============================
// グローバル変数
// ============================
window.memberArr = [];
window.arrExpenseRecords = [];
window.chargeAdjustmentObj = {};
window.selectedRecord = null;
window.keepAutoInput = false;
window.chargeSum = 0;

let currentUser = null;
let db = null;
let currentNickname = null;
const STORAGE_KEY = "records";

// ============================
// Firebase 初期化
// ============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBUdGuVTpHhVWkTM8mH0yt_cMwDTnKR5Dg",
  authDomain: "walicadb.firebaseapp.com",
  projectId: "walicadb",
  storageBucket: "walicadb.firebasestorage.app",
  messagingSenderId: "450857734201",
  appId: "1:450857734201:web:f54c9546a0c071b8833de8",
  measurementId: "G-LFK3EGS0RG"
};

const app = initializeApp(firebaseConfig);
db = getFirestore(app);
const auth = getAuth(app);

// ============================
// DOM 要素取得
// ============================
document.addEventListener("DOMContentLoaded", () => {
    const groupName = document.getElementById("groupName");
    const memberNameInput = document.getElementById("memberName");
    const createGroupBtn = document.getElementById("createGroupBtn");
    const deleteAll = document.getElementById("deleteAll");
    const memberList = document.getElementById("memberList");

    const expenseEntryContainer = document.getElementById("expenseEntryContainer");
    const mode = document.getElementById("mode");
    const select = document.getElementById("payer");
    const receive = document.getElementById("receive");
    const purpose = document.getElementById("purpose");
    const charge = document.getElementById("charge");

    const recordsContainer = document.getElementById("recordsContainer");
    const containerTable = document.getElementById("containerTable");
    const errRowBtn = document.getElementById("errRowBtn");
    const editRowBtn = document.getElementById("editRowBtn");
    const deleteRowBtn = document.getElementById("deleteRowBtn");
    const quitEdit = document.getElementById("quitEdit");
    const adjustment = document.getElementById("adjustment");
    const groupSetupContainer = document.getElementById("groupSetupContainer");

    // ============================
    // メール認証ログイン処理
    // ============================
    const loginWithEmail = async () => {
        let email = "", password = "";
        while (!email) email = prompt("メールアドレスを入力してください")?.trim() || "";
        while (!password) password = prompt("パスワードを入力してください")?.trim() || "";

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            currentUser = userCredential.user;
            console.log("🟢 ログイン成功:", currentUser.uid);
        } catch (err) {
            if (err.code === "auth/user-not-found") {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                currentUser = userCredential.user;
                console.log("🟢 新規ユーザー作成:", currentUser.uid);
            } else {
                console.error("❌ ログイン失敗", err);
                alert("ログインに失敗しました: " + err.message);
                return;
            }
        }
    };

    // ============================
    // 認証状態変更監視
    // ============================
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            console.log("🟢 ログインユーザーID:", user.uid);
            await initNickname();
            await initAfterAuth();
        } else {
            currentUser = null;
            console.log("🔴 未ログイン状態");
            await loginWithEmail(); // 未ログイン時はログインを促す
        }
    });

    // ============================
    // ニックネーム初期化
    // ============================
    const initNickname = async () => {
        if (!db || !currentUser) return;
        const uid = currentUser.uid;
        const userRef = doc(db, "walica_users", uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            currentNickname = snap.data().name || "名無し";
        } else {
            let name = "";
            while (!name) name = prompt("はじめての利用です。ニックネームを入力してください")?.trim() || "";
            await setDoc(userRef, { name, deviceId: uid, joinedGroups: [] });
            currentNickname = name;
        }
    };
    
    // ============================
    // Firestore 関連関数
    // ============================
    const loadGroupFromFirestore = async (groupNameVal) => {
        if (!db || !currentUser) return null;
        try {
            const docRef = doc(db, "walicaGroups", groupNameVal);
            const snap = await getDoc(docRef);
            return snap.exists() ? snap.data() : null;
        } catch (e) {
            console.error("❌ Firestore グループ取得エラー:", e);
            return null;
        }
    };

    const loadRecordsFromFirestore = async (groupNameVal) => {
        if (!db || !currentUser) return [];
        try {
            const recordsCol = collection(db, "walicaGroups", groupNameVal, "records");
            const snapshot = await getDocs(recordsCol);
            const records = [];
            snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
            return records;
        } catch (e) {
            console.error("❌ Firestore records 取得エラー:", e);
            return [];
        }
    };

    const addRecordToFirestore = async (groupNameVal, record) => {
        if (!db || !currentUser) return;
        try {
            const recordsCol = collection(db, "walicaGroups", groupNameVal, "records");
            await addDoc(recordsCol, {
                ...record,
                updatedAt: serverTimestamp(),
                updatedUser: currentUser.uid
            });
        } catch (e) {
            console.error("❌ Firestore record 追加エラー:", e);
        }
    };

    const loadAutoInputFromFirestore = async () => {
        if (!db || !currentUser) return null;
        try {
            const snap = await getDoc(doc(db, "walicaAutoInput", currentUser.uid));
            return snap.exists() ? snap.data() : null;
        } catch (e) {
            console.error("❌ Firestore AutoInput 取得エラー:", e);
            return null;
        }
    };

    const clearAutoInputInFirestore = async () => {
        if (!db || !currentUser) return;
        try {
            await setDoc(doc(db, "walicaAutoInput", currentUser.uid), {
                storeName: "",
                amount: 0,
                updatedAt: serverTimestamp()
            });
        } catch (e) {
            console.error("❌ Firestore AutoInput クリアエラー:", e);
        }
    };

    // ============================
    // ページ初期化
    // ============================
    const initAfterAuth = async () => {
        const local = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        let dataObj = local;

        if (local.groupName && db) {
            const cloud = await loadGroupFromFirestore(local.groupName);
            if (cloud) {
                dataObj = cloud;
                persistToLocalAndCloud(dataObj);
            }
        }

        if (Object.keys(dataObj).length !== 0) {
            groupName.value = dataObj.groupName;
            groupDisabled();
            memberArr = dataObj.memberArr || [];
            memberArr.forEach(createMember);
            defaultExpenseEntryContainer();
            if (dataObj.arrExpenseRecords) {
                arrExpenseRecords = dataObj.arrExpenseRecords;
                createAdjustmentTable(arrExpenseRecords);
                createAdjustmentCalc();
            }
        }

        const autoData = await loadAutoInputFromFirestore();
        if (autoData && Number(autoData.amount) > 0) {
            keepAutoInput = true;
            purpose.value = autoData.storeName;
            charge.value = autoData.amount;
        }
    };

    // ============================
    // localStorage + Firestore 同期関数
    // ============================
    const persistToLocalAndCloud = (obj) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch(e){ console.error(e); }
        if (db && obj.groupName) saveGroupToFirestore(obj);
    };

    const saveGroupToFirestore = async (obj) => {
        try {
            const dataToSave = {
                groupName: obj.groupName,
                memberArr: obj.memberArr || [],
                arrExpenseRecords: obj.arrExpenseRecords || [],
            };
            await setDoc(doc(db, "walicaGroups", obj.groupName), dataToSave);
            console.log("✅ Firestore グループ保存成功:", obj.groupName);
        } catch (e) {
            console.error("❌ Firestore グループ保存エラー:", e);
        }
    };

    // ============================
    // DOM イベント
    // ============================
    deleteAll.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    });

    document.getElementById("addMemberBtn").addEventListener("click", addMember);
    memberNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") addMember();
    });

    createGroupBtn.addEventListener("click", () => {
        document.querySelectorAll(".error").forEach(val => val.innerHTML = "");
        const groupNameVal = groupName.value.trim();
        let hasErr = false;
        if (!groupNameVal) {
            document.getElementById("errGroupName").textContent = "グループ名を入力してください";
            hasErr = true;
        }
        if (memberArr.length < 2) {
            document.getElementById("errMemberName").textContent = "メンバーを2人以上追加してください";
            hasErr = true;
        }
        if (hasErr) return;

        addData("groupName", groupNameVal);
        addData("memberArr", memberArr);
        groupDisabled();
        defaultExpenseEntryContainer();
        select.scrollIntoView({ behavior: "smooth" });
    });

    window.groupDisabled = () => {
        groupName.disabled = true;
        createGroupBtn.disabled = true;
        deleteAll.style.display = "block";
    };

    // ============================
    // メンバー追加/削除
    // ============================
    function addMember() {
        const memberName = memberNameInput.value.trim();
        const errMemberName = document.getElementById("errMemberName");
        errMemberName.textContent = "";
        if (!memberName) { errMemberName.textContent = "メンバー名を入力してください"; return; }
        if (memberArr.includes(memberName)) { errMemberName.textContent = "同じ名前がすでに登録されています"; return; }
        createMember(memberName);
        memberNameInput.value = "";
        if (createGroupBtn.disabled && memberArr.length >= 2) {
            addData("memberArr", memberArr);
            defaultExpenseEntryContainer();
            if (arrExpenseRecords.length !== 0) recordsContainer.style.display = "block";
        }
    }

    function createMember(memberName) {
        memberArr.push(memberName);
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = memberName;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-btn';
        removeBtn.addEventListener('click', () => {
            memberDiv.remove();
            memberArr = memberArr.filter(val => val !== memberName);
            if (createGroupBtn.disabled) {
                addData("memberArr", memberArr);
                defaultExpenseEntryContainer();
            }
            if (memberArr.length < 2) {
                document.getElementById("errMemberName").textContent = "メンバーは2人以上にしてください";
                expenseEntryContainer.style.display = "none";
                recordsContainer.style.display = "none";
            }
        });

        memberDiv.appendChild(nameSpan);
        memberDiv.appendChild(removeBtn);
        memberList.appendChild(memberDiv);
    }

    // ============================
    // defaultExpenseEntryContainer 定義
    // ============================
    function defaultExpenseEntryContainer() {
        expenseEntryContainer.style.display = memberArr.length >= 2 ? "block" : "none";

        select.innerHTML = "";
        memberArr.forEach(member => {
            const option = document.createElement("option");
            option.value = member;
            option.textContent = member;
            select.appendChild(option);
        });

        receive.innerHTML = "";
        memberArr.forEach(member => {
            const label = document.createElement("label");
            label.style.marginRight = "10px";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = "receive";
            checkbox.value = member;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(member));
            receive.appendChild(label);
        });

        mode.textContent = "登録モード";
    }

    // ============================
    // Expense 登録
    // ============================
    document.getElementById("registration").addEventListener("click", async () => {
        const payer = select.value;
        const checkboxes = document.querySelectorAll('input[name="receive"]:checked');
        const checkedMember = Array.from(checkboxes).map(cb => cb.value);
        let hasErr = false;

        document.querySelectorAll(".error").forEach(val => val.innerHTML = "");

        const chargeVal = Number(charge.value);

        if (!purpose.value.trim()) { document.getElementById("errPurpose").textContent = "支払い名を入力してください"; hasErr = true; }
        if (isNaN(chargeVal) || chargeVal < 1) { document.getElementById("errCharge").textContent = "金額は1円以上を入力してください"; hasErr = true; }
        if (checkboxes.length === 0) { document.getElementById("errReceive").textContent = "立替え対象のメンバーを1人以上選択してください"; hasErr = true; }
        if (hasErr) return;

        const newRecord = {
            purpose: purpose.value.trim(),
            payer,
            checkedMember,
            charge: chargeVal
        };

        arrExpenseRecords.push(newRecord);
        await addRecordToFirestore(groupName.value, newRecord);
        await renderFirestoreList();

        if (selectedRecord && selectedRecord.id) {
            arrExpenseRecords = arrExpenseRecords.filter(val => val.id !== selectedRecord.id);
        }

        createAdjustmentTable(arrExpenseRecords);
        addData("arrExpenseRecords", arrExpenseRecords);
        recordsContainer.style.display = "block";
        createAdjustmentCalc();
        defaultExpenseEntryContainer();
        try { await clearAutoInputInFirestore(); } catch(e) { console.error("自動入力クリア失敗"); }
    });

    // ============================
    // renderFirestoreList 定義
    // ============================
    const renderFirestoreList = async () => {
        if (!db || !currentUser) return;
        try {
            const records = await loadRecordsFromFirestore(groupName.value);
            arrExpenseRecords = records.map(r => ({
                id: r.id,
                purpose: r.purpose,
                payer: r.payer,
                checkedMember: r.checkedMember || [],
                charge: Number(r.charge)
            }));
            createAdjustmentTable(arrExpenseRecords);
            createAdjustmentCalc();
        } catch (e) { console.error("❌ renderFirestoreList エラー:", e); }
    };

    // ============================
    // 精算計算
    // ============================
    const createAdjustmentCalc = () => {
        for (const key in chargeAdjustmentObj) delete chargeAdjustmentObj[key];

        memberArr.forEach(member => calculationCharge(member));

        const plusList = [], minusList = [];
        for (const member in chargeAdjustmentObj) {
            const amount = chargeAdjustmentObj[member];
            if (amount > 0) plusList.push({ name: member, amount });
            else if (amount < 0) minusList.push({ name: member, amount: -amount });
        }

        const settlements = [];
        while (plusList.length && minusList.length) {
            const payer = minusList[0], receiver = plusList[0];
            const amount = Math.min(payer.amount, receiver.amount);
            settlements.push(`${payer.name} → ${receiver.name}：${amount.toFixed(0)} 円`);
            payer.amount -= amount;
            receiver.amount -= amount;
            if (payer.amount === 0) minusList.shift();
            if (receiver.amount === 0) plusList.shift();
        }

        chargeSum = arrExpenseRecords.reduce((sum, r) => sum + r.charge, 0);

        adjustment.innerHTML = `<h3>精算案</h3><ul>${settlements.map(s => `<li>${s}</li>`).join("")}</ul><ul>合計支出額：${chargeSum}円</ul>`;
        addData("resultDiv", adjustment.innerHTML);
    };

    const calculationCharge = (member) => {
        let pay = 0, receive = 0;
        arrExpenseRecords.forEach(record => {
            if (record.payer === member) pay += record.charge;
            const numMembers = record.checkedMember.length;
            if (record.checkedMember.includes(member)) receive += record.charge / numMembers;
        });
        chargeAdjustmentObj[member] = receive - pay;
    };
});
