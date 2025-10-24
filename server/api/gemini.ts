// server/api/gemini.ts
import { defineEventHandler, readBody } from 'h3';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const prompt = body?.prompt;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return { error: 'プロンプトが空です' };
  }

  const API_KEY = process.env.GOOGLE_API_KEY || '';
  if (!API_KEY) {
    console.error('GOOGLE_API_KEY is not set in environment');
    return { error: 'GOOGLE_API_KEY が設定されていません' };
  }

  try {
    const url = `${GEMINI_API_URL}?key=${encodeURIComponent(API_KEY)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    });

    const textBody = await r.text();
    if (!textBody) return { error: 'Gemini APIから空のレスポンスが返されました' };

    let data;
    try {
      data = JSON.parse(textBody);
    } catch {
      return { error: 'レスポンスの解析に失敗しました', raw: textBody };
    }

    let outText = '';
    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      outText = data.candidates[0].content.parts[0].text;
    } else if (data?.output?.[0]?.content?.parts?.[0]?.text) {
      outText = data.output[0].content.parts[0].text;
    } else if (data?.candidates?.[0]?.output?.[0]?.content?.parts?.[0]?.text) {
      outText = data.candidates[0].output[0].content.parts[0].text;
    } else if (typeof data === 'string') {
      outText = data;
    } else {
      try {
        const s = JSON.stringify(data);
        outText = s.length > 2000 ? s.slice(0, 2000) + '... (truncated)' : s;
      } catch {
        outText = '';
      }
    }

    return { text: outText, raw: data };
  } catch (err) {
    console.error('server/api/gemini error:', err);
    return { error: err?.message || String(err) };
  }
});