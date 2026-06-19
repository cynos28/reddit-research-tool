import { PainPoint } from "@/lib/models/PainPoint";
import { connectToDatabase } from "@/lib/mongodb";
import type { PipelineStage } from "mongoose";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const params = new URL(request.url).searchParams;
    const page = Math.max(Number(params.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(params.get("limit")) || 20, 1), 100);
    const filter: Record<string, unknown> = { isPainPoint: true };
    if (params.get("category")) filter.category = params.get("category");
    if (params.get("minIntensity")) filter.intensity = { $gte: Number(params.get("minIntensity")) };
    if (params.get("from") || params.get("to")) {
      filter.createdAt = {
        ...(params.get("from") ? { $gte: new Date(params.get("from")!) } : {}),
        ...(params.get("to") ? { $lte: new Date(params.get("to")!) } : {}),
      };
    }
    const subreddit = params.get("subreddit");
    const pipeline: PipelineStage[] = [
      { $match: filter },
      { $lookup: { from: "posts", localField: "postId", foreignField: "_id", as: "post" } },
      { $unwind: "$post" },
    ];
    if (subreddit) pipeline.push({ $match: { "post.subreddit": subreddit } });
    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          meta: [{ $count: "total" }],
        },
      },
    );
    const [result] = await PainPoint.aggregate(pipeline);
    const total = result.meta[0]?.total ?? 0;
    return Response.json({ data: result.data, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Query failed" }, { status: 500 });
  }
}
