import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super('Gemini not configured');
    this.name = 'GeminiNotConfiguredError';
  }
}

function getGeminiClient(): { ai: GoogleGenAI; model: string } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new GeminiNotConfiguredError();
  }
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const ai = new GoogleGenAI({ apiKey });
  return { ai, model };
}

/**
 * Executes a Gemini request with structured JSON output and 1 retry on failure.
 * Converts the Zod schema to JSON Schema for the @google/genai SDK responseSchema configuration.
 */
export async function generateStructuredAI<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  systemInstruction?: string
): Promise<T> {
  const { ai, model } = getGeminiClient();
  const jsonSchema = z.toJSONSchema(schema);

  const callModel = async (): Promise<string> => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: jsonSchema,
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || '';
  };

  // Attempt 1
  try {
    const rawText = await callModel();
    const jsonParsed = JSON.parse(rawText);
    const validated = schema.safeParse(jsonParsed);
    if (validated.success) {
      return validated.data;
    }
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) throw err;
  }

  // Attempt 2 (Retry once)
  try {
    const rawText = await callModel();
    const jsonParsed = JSON.parse(rawText);
    const validated = schema.parse(jsonParsed);
    return validated;
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) throw err;
    throw new Error('AI output generation failed validation after retry');
  }
}
