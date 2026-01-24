import Groq from "groq-sdk";
import { getSettings } from "../settings";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not set");
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 60000,
  maxRetries: 3,
});

export async function generateCompletion(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<string> {
  const settings = !options ? await getSettings() : null;

  const {
    model = "llama-3.3-70b-versatile",
    temperature = options?.temperature ?? settings?.aiTemperature ?? 0.7,
    maxTokens = options?.maxTokens ?? settings?.aiMaxTokens ?? 2000,
  } = options || {};

  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model,
    temperature,
    max_tokens: maxTokens,
  });

  return completion.choices[0]?.message?.content || "";
}

export async function generateJSON<T>(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<T> {
  const settings = !options ? await getSettings() : null;

  const {
    model = "llama-3.3-70b-versatile",
    temperature = options?.temperature ?? settings?.aiTemperature ?? 0.3,
    maxTokens = options?.maxTokens ?? settings?.aiMaxTokens ?? 4000,
  } = options || {};

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that outputs valid JSON only. No markdown, no explanations.",
      },
      { role: "user", content: prompt },
    ],
    model,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}
