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
  const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });

  try {
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const response = await result.response;
    const text = response.text();

    console.log('Prompt:', prompt);
    console.log('Gemini response:', text);

    return { text };
  } catch (error) {
    console.error('Gemini API exception:', error);
    return { error: error.message || 'Gemini API error' };
  }
});