// ============================
// Firebase Functions + Express 初期化
// ============================
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");

admin.initializeApp();

// Express アプリ
const app = express();
app.use(express.json()); // JSON body parser

// ============================
// Walica 用 Firestore 設定
// ============================
const walicaCollection = admin.firestore().collection("walica_receipts");

// Walica: レシート追加
app.post("/walica/addReceipt", async (req, res) => {
  try {
    const { store_name, subtotal } = req.body;
    if (!store_name || !subtotal) {
      return res.status(400).json({ error: "store_name と subtotal は必須です" });
    }

    const newReceipt = {
      store_name,
      subtotal,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await walicaCollection.add(newReceipt);
    res.status(200).json({ id: docRef.id, ...newReceipt });
  } catch (error) {
    console.error("Walica レシート追加エラー:", error);
    res.status(500).json({ error: error.message });
  }
});

// Walica: レシート一覧取得
app.get("/walica/listReceipts", async (req, res) => {
  try {
    const snapshot = await walicaCollection.orderBy("created_at", "desc").get();
    const receipts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(receipts);
  } catch (error) {
    console.error("Walica レシート取得エラー:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================
// 将来追加する別アプリ用テンプレート
// ============================
const anotherAppCollection = admin.firestore().collection("anotherAppCollection");

// 別アプリ: データ追加
app.post("/anotherApp/addData", async (req, res) => {
  try {
    const { name, value } = req.body;
    if (!name || !value) {
      return res.status(400).json({ error: "name と value は必須です" });
    }

    const newData = {
      name,
      value,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await anotherAppCollection.add(newData);
    res.status(200).json({ id: docRef.id, ...newData });
  } catch (error) {
    console.error("別アプリデータ追加エラー:", error);
    res.status(500).json({ error: error.message });
  }
});

// 別アプリ: データ一覧取得
app.get("/anotherApp/listData", async (req, res) => {
  try {
    const snapshot = await anotherAppCollection.orderBy("created_at", "desc").get();
    const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(dataList);
  } catch (error) {
    console.error("別アプリデータ取得エラー:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================
// Firebase Functions としてエクスポート
// ============================
exports.api = functions.https.onRequest(app);
