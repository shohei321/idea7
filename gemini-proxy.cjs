const { GoogleAuth } = require('google-auth-library');
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// サービスアカウントJSONのパス（必要に応じて絶対パスに変更）
const KEY_PATH = path.join(__dirname, 'gen-lang-client-0721799689-e13c31b3f915.json');

// Gemini APIエンドポイント（モデルは gemini-1.5-flash または gemini-1.5-pro）
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

app.post('/api/gemini', async (req, res) => {
  try {
    // 🔍 リクエストボディの確認
    console.log('受信したリクエストボディ:', req.body);

    const { prompt } = req.body;
    console.log('受信したプロンプト:', prompt);

    // プロンプトのバリデーション
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'プロンプトが空です。' });
    }

    // Google 認証
    const auth = new GoogleAuth({
      keyFile: KEY_PATH,
      scopes: [
        'https://www.googleapis.com/auth/generative-language',
        'https://www.googleapis.com/auth/cloud-platform'
      ],
    });
    const client = await auth.getClient();
    const accessTokenRaw = await client.getAccessToken();
    const accessToken = typeof accessTokenRaw === 'string' ? accessTokenRaw : accessTokenRaw?.token;

    if (!accessToken) {
      return res.status(401).json({ error: 'アクセストークンの取得に失敗しました。' });
    }

    // Gemini API にリクエスト送信
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      }),
    });

    const dataText = await response.text();

    // 🔍 詳細ログ（デバッグ用）
    console.log('Google APIレスポンス:', {
      status: response.status,
      headers: response.headers.raw(),
      body: dataText
    });

    // 空レスポンスの処理
    if (!dataText || dataText.trim() === '') {
      return res.status(502).json({ error: 'Gemini APIから空のレスポンスが返されました。' });
    }

    let data;
    try {
      data = JSON.parse(dataText);
    } catch (parseError) {
      return res.status(500).json({ error: 'レスポンスの解析に失敗しました。' });
    }

    res.json(data);
  } catch (err) {
    console.error('エラー:', err);
    res.status(500).json({ error: err.message });
  }
});

// サーバー起動
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Gemini Proxy API listening on port ${PORT}`);
});