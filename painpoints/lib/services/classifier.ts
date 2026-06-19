import {
  CLASSIFICATION_BATCH_SIZE,
  CLASSIFICATION_DELAY_MS,
  CONFIDENCE_RECHECK,
  RUBRIC_THRESHOLD,
} from "@/lib/constants";
import { PainPoint } from "@/lib/models/PainPoint";
import { Post } from "@/lib/models/Post";
import { connectToDatabase } from "@/lib/mongodb";
import { classifyPost, recheckPost } from "@/lib/openai";
import type { ClassificationResult } from "@/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function rubricTotal(result: ClassificationResult) {
  const r = result.rubric;
  return (r.frequencySignal ?? 0) + (r.willingnessToPaySignal ?? 0) + (r.specificity ?? 0) + (r.solutionGap ?? 0);
}

function finalizePainPoint(result: ClassificationResult): { isPainPoint: boolean; total: number } {
  const total = rubricTotal(result);
  const hasEvidence = Boolean(result.evidenceQuote?.trim().length);
  const passes = result.isPainPoint && hasEvidence && total >= RUBRIC_THRESHOLD;
  return { isPainPoint: passes, total };
}

export async function classifyPendingPosts(limit = CLASSIFICATION_BATCH_SIZE) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  await connectToDatabase();
  const posts = await Post.find({ processed: false, filteredOut: { $ne: true } })
    .sort({ publishedAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 50));

  let painPointsFound = 0;
  let rechecks = 0;

  for (const post of posts) {
    let result = await classifyPost(post.title, post.summary);
    if (result.isPainPoint && result.confidence < CONFIDENCE_RECHECK) {
      rechecks += 1;
      const second = await recheckPost(post.title, post.summary);
      // Keep the stricter verdict; average confidence.
      result = {
        ...second,
        confidence: (result.confidence + second.confidence) / 2,
      };
    }
    const { isPainPoint, total } = finalizePainPoint(result);

    await PainPoint.findOneAndUpdate(
      { postId: post._id },
      {
        postId: post._id,
        isPainPoint,
        problemSummary: result.problemSummary,
        category: result.category,
        intensity: result.intensity,
        willingnessToPay: result.willingnessToPay,
        confidence: result.confidence,
        evidenceQuote: result.evidenceQuote,
        rubric: result.rubric,
        rubricTotal: total,
        rawClassification: result,
        createdAt: new Date(),
      },
      { upsert: true, new: true },
    );
    await Post.updateOne({ _id: post._id }, { $set: { processed: true } });
    if (isPainPoint) painPointsFound += 1;
    await sleep(CLASSIFICATION_DELAY_MS);
  }

  return { processed: posts.length, painPointsFound, rechecks };
}
