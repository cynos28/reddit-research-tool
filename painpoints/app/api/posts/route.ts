import { Post } from "@/lib/models/Post";
import { connectToDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const params = new URL(request.url).searchParams;
    const page = Math.max(Number(params.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(params.get("limit")) || 30, 1), 100);
    const filter: Record<string, unknown> = {};
    if (params.get("subreddit")) filter.subreddit = params.get("subreddit");
    if (params.get("processed") === "true") filter.processed = true;
    if (params.get("processed") === "false") filter.processed = false;
    if (params.get("from") || params.get("to")) {
      filter.publishedAt = {
        ...(params.get("from") ? { $gte: new Date(params.get("from")!) } : {}),
        ...(params.get("to") ? { $lte: new Date(params.get("to")!) } : {}),
      };
    }
    const [data, total] = await Promise.all([
      Post.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Post.countDocuments(filter),
    ]);
    return Response.json({ data, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Query failed" }, { status: 500 });
  }
}
