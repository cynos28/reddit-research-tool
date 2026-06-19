import { CLASSIFICATION_BATCH_SIZE, CLASSIFICATION_DELAY_MS } from "@/lib/constants";
import { PainPoint } from "@/lib/models/PainPoint";
import { Post } from "@/lib/models/Post";
import { connectToDatabase } from "@/lib/mongodb";
import { classifyPost } from "@/lib/openai";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function classifyPendingPosts(limit = CLASSIFICATION_BATCH_SIZE) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  await connectToDatabase();
  const posts = await Post.find({ processed: false })
    .sort({ publishedAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 50));
  let painPointsFound = 0;

  for (const post of posts) {
    const result = await classifyPost(post.title, post.summary);
    await PainPoint.findOneAndUpdate(
      { postId: post._id },
      { ...result, postId: post._id, createdAt: new Date() },
      { upsert: true, new: true },
    );
    await Post.updateOne({ _id: post._id }, { $set: { processed: true } });
    if (result.isPainPoint) painPointsFound += 1;
    await sleep(CLASSIFICATION_DELAY_MS);
  }

  return { processed: posts.length, painPointsFound };
}
