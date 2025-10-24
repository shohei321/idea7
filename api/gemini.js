// Vercel Serverless Function for Gemini proxy
// Expects process.env.GOOGLE_API_KEY to be set in Vercel dashboard

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'プロンプトが空です。' });
    }

    const API_KEY = process.env.GOOGLE_API_KEY || '';
    if (!API_KEY) {
      return res.status(500).json({ error: 'GOOGLE_API_KEY が設定されていません。Vercel の環境変数に追加してください。' });
    }

    const url = `${GEMINI_API_URL}?key=${encodeURIComponent(API_KEY)}`;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    });

    const textBody = await r.text();
    if (!textBody) return res.status(502).json({ error: 'Gemini APIから空のレスポンスが返されました。' });

    let data;
    try {
      data = JSON.parse(textBody);
    } catch {
      return res.status(500).json({ error: 'レスポンスの解析に失敗しました。', raw: textBody });
    }

    // Normalize text similar to local proxy
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

    return res.status(200).json({ text: outText, raw: data });
  } catch (err) {
    console.error('api/gemini error:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
};
