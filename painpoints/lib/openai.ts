import OpenAI from "openai";
import { CATEGORIES, type ClassificationResult } from "@/types";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export const CLASSIFICATION_SYSTEM_PROMPT = `You are evaluating a Reddit post to decide whether it describes a genuine, actionable
product pain point — something a founder could plausibly build a tool to solve and that
the post's author or people like them would pay for.

You MUST return JSON matching the schema. Score each rubric axis on a 0–3 scale:
- frequencySignal: how strongly the post implies the problem affects many people (0 = isolated to author, 3 = explicitly says "everyone I know" or similar).
- willingnessToPaySignal: how strongly the post implies money would be spent (0 = none, 3 = explicit "I'd pay X for this").
- specificity: how concrete and well-defined the problem is (0 = vague venting, 3 = clear workflow with named steps).
- solutionGap: how clearly existing tools fall short (0 = no mention of alternatives, 3 = lists tools tried and explains why each failed).

Also extract:
- evidenceQuote: the single most damning sentence from the post that proves the pain point (verbatim, ≤200 chars). If you cannot find one, set it to "" and isPainPoint=false.
- confidence: 0–1, your overall confidence that this is a real, actionable pain point.
- isPainPoint: true ONLY IF you found a verbatim evidence quote AND the rubric sum ≥ 7.
- intensity: 1–5 felt-pain level for the author.
- willingnessToPay: boolean, separate from rubric score (true if explicit signal).
- problemSummary: one sentence (≤140 chars) describing the unmet need.
- category: one of the allowed values.

Be conservative. Recommendation requests ("alternative to X?"), vague venting, and
news/discussion are NOT pain points. When in doubt, set isPainPoint=false.`;

export const CLASSIFICATION_RECHECK_PROMPT = `You previously flagged this post as a pain point with low confidence. Re-evaluate
under a stricter bar: would a typical founder, after reading this single post, have
enough signal to invest a weekend prototyping a solution? If not, set isPainPoint=false.
Re-score the rubric and re-extract the evidence quote.`;

const fallback: ClassificationResult = {
  isPainPoint: false,
  problemSummary: "No clear product pain point identified.",
  category: "Other",
  intensity: 1,
  willingnessToPay: false,
  confidence: 0,
  evidenceQuote: "",
  rubric: { frequencySignal: 0, willingnessToPaySignal: 0, specificity: 0, solutionGap: 0 },
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    isPainPoint: { type: "boolean" },
    problemSummary: { type: "string" },
    category: { type: "string", enum: [...CATEGORIES] },
    intensity: { type: "integer", minimum: 1, maximum: 5 },
    willingnessToPay: { type: "boolean" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    evidenceQuote: { type: "string" },
    rubric: {
      type: "object",
      additionalProperties: false,
      properties: {
        frequencySignal: { type: "integer", minimum: 0, maximum: 3 },
        willingnessToPaySignal: { type: "integer", minimum: 0, maximum: 3 },
        specificity: { type: "integer", minimum: 0, maximum: 3 },
        solutionGap: { type: "integer", minimum: 0, maximum: 3 },
      },
      required: ["frequencySignal", "willingnessToPaySignal", "specificity", "solutionGap"],
    },
  },
  required: [
    "isPainPoint",
    "problemSummary",
    "category",
    "intensity",
    "willingnessToPay",
    "confidence",
    "evidenceQuote",
    "rubric",
  ],
} as const;

async function runClassification(systemPrompt: string, title: string, summary: string) {
  const response = await getOpenAIClient().chat.completions.create({
    model: process.env.OPENAI_CLASSIFICATION_MODEL || "gpt-4o-mini",
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: { name: "pain_point_classification", strict: true, schema },
    },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Title: ${title}\n\nPost: ${summary}`.slice(0, 12_000) },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (!content) return fallback;
  return JSON.parse(content) as ClassificationResult;
}

export async function classifyPost(title: string, summary: string) {
  try {
    return await runClassification(CLASSIFICATION_SYSTEM_PROMPT, title, summary);
  } catch (error) {
    console.error("Classification failed", error);
    return fallback;
  }
}

export async function recheckPost(title: string, summary: string) {
  try {
    return await runClassification(
      `${CLASSIFICATION_SYSTEM_PROMPT}\n\n${CLASSIFICATION_RECHECK_PROMPT}`,
      title,
      summary,
    );
  } catch (error) {
    console.error("Recheck failed", error);
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
