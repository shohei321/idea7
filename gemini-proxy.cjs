// dotenv を試して読み込む（開発時に .env を使いたい場合）
try {
  require('dotenv').config();
} catch {
  // dotenv が無ければ無視（環境変数は OS 側で設定してください）
}

const { GoogleAuth } = require('google-auth-library');
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// サービスアカウントJSONのパス（必要に応じて絶対パスに変更）
// フォールバック用に残していますが、優先は環境変数 `GOOGLE_API_KEY` です
const KEY_PATH = process.env.GOOGLE_SERVICE_KEY_PATH || path.join(__dirname, 'gen-lang-client-0721799689-e13c31b3f915.json');

// Gemini APIエンドポイント（モデルは gemini-2.5-flash）
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

    // まずは .env / 環境変数で API キーが提供されているか確認
    const API_KEY = process.env.GOOGLE_API_KEY || null;

    let response;

    if (API_KEY) {
      // API キー方式: URL に ?key= を付与して呼び出す
      const urlWithKey = `${GEMINI_API_URL}?key=${encodeURIComponent(API_KEY)}`;
      console.log('Using API key auth for Gemini request');
      response = await fetch(urlWithKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
    } else {
      // サービスアカウント方式のフォールバック
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

      // Gemini API にリクエスト送信（Bearer トークン）
      response = await fetch(GEMINI_API_URL, {
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
    }

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
    } catch {
      return res.status(500).json({ error: 'レスポンスの解析に失敗しました。' });
    }

    // レスポンス正規化: 利用可能なフィールドからテキストを抽出して返す
    let outText = '';
    // Gemini の候補的な構造を順にチェック
    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      outText = data.candidates[0].content.parts[0].text;
    } else if (data?.output?.[0]?.content?.parts?.[0]?.text) {
      outText = data.output[0].content.parts[0].text;
    } else if (data?.candidates?.[0]?.output?.[0]?.content?.parts?.[0]?.text) {
      outText = data.candidates[0].output[0].content.parts[0].text;
    } else if (typeof data === 'string') {
      outText = data;
    } else {
      // フォールバック: JSON を文字列化して返す（長すぎる場合は切り詰める）
      try {
        const s = JSON.stringify(data);
        outText = s.length > 2000 ? s.slice(0, 2000) + '... (truncated)' : s;
      } catch {
        outText = '';
      }
    }

    console.log('Normalized text length:', outText?.length || 0);

    // 正規化レスポンスを返す
    res.json({ text: outText, raw: data });
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