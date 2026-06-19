import OpenAI from "openai";
import { CATEGORIES, type ClassificationResult } from "@/types";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export const CLASSIFICATION_SYSTEM_PROMPT = `You are analyzing a Reddit post to determine if it describes a genuine
unmet need or product pain point. Return a result matching the supplied JSON schema.

If the post is unrelated to a product need (for example, just discussion, news, or
venting unrelated to a tool or service gap), set isPainPoint to false and use
reasonable defaults for the other fields.`;

const fallback: ClassificationResult = {
  isPainPoint: false,
  problemSummary: "No clear product pain point identified.",
  category: "Other",
  intensity: 1,
  willingnessToPay: false,
};

export async function classifyPost(title: string, summary: string) {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: process.env.OPENAI_CLASSIFICATION_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "pain_point_classification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              isPainPoint: { type: "boolean" },
              problemSummary: { type: "string" },
              category: { type: "string", enum: [...CATEGORIES] },
              intensity: { type: "integer", minimum: 1, maximum: 5 },
              willingnessToPay: { type: "boolean" },
            },
            required: [
              "isPainPoint",
              "problemSummary",
              "category",
              "intensity",
              "willingnessToPay",
            ],
          },
        },
      },
      messages: [
        { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: "user", content: `Title: ${title}\n\nPost: ${summary}`.slice(0, 12_000) },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) return fallback;
    return JSON.parse(content) as ClassificationResult;
  } catch (error) {
    console.error("Classification failed", error);
    return fallback;
  }
}

export async function createEmbeddings(inputs: string[]) {
  if (!inputs.length) return [];
  const response = await getOpenAIClient().embeddings.create({
    model: "text-embedding-3-small",
    input: inputs,
    encoding_format: "float",
  });
  return response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}
