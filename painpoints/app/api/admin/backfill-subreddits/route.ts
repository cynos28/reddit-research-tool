import { Post } from "@/lib/models/Post";
import { connectToDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 60;

function extract(url: string) {
  return url.match(/reddit\.com\/r\/([^/?#]+)/i)?.[1] ?? null;
}

export async function POST() {
  await connectToDatabase();
  const posts = await Post.find({}, { url: 1, subreddit: 1 }).lean();
  let updated = 0;
  let skipped = 0;
  for (const post of posts) {
    const real = extract(post.url);
    if (!real) {
      skipped += 1;
      continue;
    }
    if (real.toLowerCase() === (post.subreddit ?? "").toLowerCase()) continue;
    await Post.updateOne({ _id: post._id }, { $set: { subreddit: real } });
    updated += 1;
  }
  return Response.json({ ok: true, scanned: posts.length, updated, skipped });
}
