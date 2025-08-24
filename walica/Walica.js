let memberArr = [];
let chargeSum = 0;
let addRebuildRecordBtn = false;
let arrExpenseRecords = [];
const chargeAdjustmentObj = {};
// localStorageのキー名
const STORAGE_KEY = "records";

window.addEventListener("DOMContentLoaded", () => {
//	localStorage.removeItem(STORAGE_KEY)
	
	const dataObj = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
	if (Object.keys(dataObj).length !== 0) {
		document.getElementById("groupName").value = dataObj["groupName"];
		dataObj["memberArr"].forEach(memberName => createMember(memberName));
		document.getElementById("addRebuildRecord").style.display = "block";
		if("resultDiv" in dataObj){
			document.getElementById("container3").style.display = "block";
			arrExpenseRecords = dataObj["arrExpenseRecords"];
			createAdjustmentTable(arrExpenseRecords);
			document.getElementById("adjustment").innerHTML = dataObj["resultDiv"];
		}
	}
})

const addData = (key,value) => {
	const obj = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
	obj[key] = value;
	localStorage.setItem(STORAGE_KEY,JSON.stringify(obj));
}

const addMember = () => {
	const memberName = document.getElementById("memberName").value.trim();
    if(!memberName){
        alert("メンバー名を入力してください");
        return;
    }
    if(memberArr.includes(memberName)){
		alert("同じ名前がすでに登録されています");
		return;
	}
	createMember(memberName);
    document.getElementById("memberName").value = "";
    addData("memberArr",memberArr);
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
	    addData("memberArr",memberArr);
	  });
	
	  // 要素をまとめる
	  memberDiv.appendChild(nameSpan);
	  memberDiv.appendChild(removeBtn);
	  document.getElementById('memberList').appendChild(memberDiv);
}

document.getElementById("addMemberBtn").addEventListener("click",addMember);

document.getElementById("memberName").addEventListener("keydown",(e) => {
	if(e.key !== "Enter"){
		return;
	}
    addMember();
})

/**
 * 「グループ作成」ボタン押下時の処理
 */
document.getElementById("crateGroup").addEventListener("click",() => {
	document.querySelectorAll(".error").forEach(val => val.innerHTML = "");
	const groupName = document.getElementById("groupName").value.trim();
	let hasErr = false;
	if(!groupName){
		document.getElementById("errGroupName").textContent = "グループ名を入力してください";
		hasErr = true;
	}
	if(memberArr.length < 2){
		document.getElementById("errMemberName").textContent = "メンバーを2人以上追加してください";
		hasErr = true;
	}
	if(hasErr){
		return;
	}
	document.getElementById("addRebuildRecord").style.display = "block";
	addData("groupName",groupName);
})

document.getElementById("addRebuildRecord").addEventListener("click",() => {
	if(addRebuildRecordBtn){
		return;
	}
	if(memberArr.length === 0){
		alert("グループを作成してください(先ず隗より始めよ)");
		return;
	}
	addRebuildRecordBtn = true;
	
	document.getElementById("container2").style.display = "block";
	//プルダウンリストの作成
	const select = document.getElementById("payer");
	memberArr.forEach(val => {
		const option = document.createElement("option");
		option.textContent = val;
		option.value = val;
		select.appendChild(option);
	})
	
	const receive = document.getElementById("receive");
	memberArr.forEach(val => {
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.name = "receive";
		checkbox.value = val;
		checkbox.checked = true;
		const label = document.createElement("label");
		label.appendChild(checkbox);
	  	label.appendChild(document.createTextNode(val));
	  	receive.appendChild(label);
  	})
})

/**
 * 登録ボタン押下時の処理
 */
document.getElementById("registration").addEventListener("click",() => {
	let hasErr = false;
	document.querySelectorAll(".error").forEach(val => val.innerHTML = "");
	
	const payer = document.getElementById("payer").value;
	const checkboxes = document.querySelectorAll('input[name="receive"]:checked');
	if(checkboxes.length === 0){
		document.getElementById("errReceive").textContent= "立替え対象のメンバーを1人以上選択してください";
		hasErr = true;
	}
	const checkedMember = Array.from(checkboxes).map(cb => cb.value);
	
	const purpose = document.getElementById("purpose").value.trim();
	if(!purpose){
		document.getElementById("errPurpose").textContent= "支払い名を入力してください";
		hasErr = true;
	}
	const charge = document.getElementById("charge").value;
	if(charge < 1){
		document.getElementById("errCharge").textContent= "金額は1円以上を入力してください";
		hasErr = true;
	}
	if(hasErr){
		return;
	}
	else{
		chargeSum += charge;
	}
	addExpenseRecords(payer,checkedMember,purpose,charge);
	["purpose","charge"].forEach(eleName => document.getElementById(eleName).value = "");
	createAdjustmentTable(arrExpenseRecords);
	document.getElementById("container3").style.display = "block";
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
	  if (payer.amount === 0) minusList.shift();
	  if (receiver.amount === 0) plusList.shift();
	}
	
	const container = document.getElementById("adjustment");
	container.innerHTML = "";
	const resultDiv = document.createElement("div");
	resultDiv.innerHTML = `<h3>精算案</h3><ul>${settlements.map(s => `<li>${s}</li>`).join("")}</ul>`;
	container.appendChild(resultDiv);
	addData("resultDiv",resultDiv.innerHTML)
})

/**
 * メンバーそれぞれの支払金額の計算
 */
const calculationCharge = (member) => {
	let pay = 0;
	let receive = 0;
	arrExpenseRecords.forEach(record => {
		if(record.payer === member){
			pay += record.charge;
		}
		if(record.checkedMember.includes(member)){
			receive += record.charge / record.checkedMember.length;
		}
	})
	chargeAdjustmentObj[member] = (pay - receive);
}

/**
 * 新たに追加された立替記録を配列に追加
 */
const addExpenseRecords = (payer,checkedMember,purpose,charge) => {
	const expenseRecords = {
		purpose : purpose,
		payer : payer,
		checkedMember : checkedMember,
		charge : Number(charge),
	}
	arrExpenseRecords.push(expenseRecords);
}

/**
 * 立替え記録一覧の作成
 */
const createAdjustmentTable = (arrExpenseRecords) => {
	const containerTable = document.getElementById("containerTable");
	containerTable.innerHTML = "";
	const table = document.createElement("table");
	["支払い名","立替え人","対象メンバー","金額(円)"].forEach(val => {
		const th = document.createElement("th");
		th.textContent = val;
		table.appendChild(th);
	})
	arrExpenseRecords.forEach(record => {
		const tr = document.createElement("tr");
		["purpose","payer","checkedMember","charge"].forEach(val => {
			const td = document.createElement("td");
			td.textContent = record[val];
			tr.appendChild(td);
		})
		const editBtn = document.createElement("div");
		editBtn.textContent = "削除";
		editBtn.addEventListener("click", () => {
			tr.remove();
			arrExpenseRecords = arrExpenseRecords.filter(val => val !== record);
			addData("arrExpenseRecords",arrExpenseRecords);
		})
		tr.appendChild(editBtn);
		
		
		table.appendChild(tr);
	})
	containerTable.appendChild(table);
	addData("arrExpenseRecords",arrExpenseRecords);
}






























