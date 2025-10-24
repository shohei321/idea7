// server/api/gemini.ts
import { defineEventHandler, readBody } from 'h3'; // h3からインポート
import { useRuntimeConfig } from '#imports'; // useRuntimeConfigをインポート
import { GoogleGenerativeAI } from '@google/generative-ai'; // Google Generative AIクライアントをインポート

export default defineEventHandler(async (event) => { // イベントハンドラを定義
  const body = await readBody(event); // リクエストボディを読み取る
  const prompt = body.prompt; // プロンプトを取得

  if (!prompt) {  // プロンプトがない場合のエラーハンドリング
    return { error: 'No prompt provided' }; // エラーメッセージを返す
  }

  const config = useRuntimeConfig(); // ランタイム設定を取得
  const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY); // Google Generative AIクライアントを初期化
  const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' }); // Geminiモデルを取得

  try { // API呼び出しを試みる
    const result = await model.generateContent({ // コンテンツ生成を呼び出す
      contents: [{ parts: [{ text: prompt }] }] // プロンプトを渡す
    });

    const response = await result.response; // レスポンスを取得
    const text = response.text(); // テキストを抽出

    return { text }; // テキストを返す
  } catch (error) { // エラーハンドリング
    console.error('Gemini API exception:', error); // エラーログを出力
    return { error: error.message || 'Gemini API error' }; // エラーメッセージを返す
  }
});