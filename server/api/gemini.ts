// server/api/gemini.ts
import { defineEventHandler, readBody, useRuntimeConfig } from 'h3';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const prompt = body.prompt;

  if (!prompt) {
    return { error: 'No prompt provided' };
  }

  const config = useRuntimeConfig();
  const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  try {
    const result = await model.generateContent(prompt);
    return result.toJSON();
  } catch (error) {
    return { error: error.message || 'Gemini API error' };
  }
});