// server/api/gemini.ts
import { defineEventHandler, readBody } from 'h3';
import { useRuntimeConfig } from '#imports';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const prompt = body.prompt;

  if (!prompt) {
    return { error: 'No prompt provided' };
  }

  const config = useRuntimeConfig();
  console.log('Runtime config:', config);
  const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  try {
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const json = result.toJSON();
    console.log('Prompt:', prompt);
    console.log('Gemini response:', JSON.stringify(json, null, 2));

    if (json.error) {
      console.error('Gemini API error:', json.error);
      return { error: json.error };
    }

    return json;
  } catch (error) {
    console.error('Gemini API exception:', error);
    return { error: error.message || 'Gemini API error' };
  }
});