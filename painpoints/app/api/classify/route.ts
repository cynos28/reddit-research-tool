import { isAuthorizedCronRequest, unauthorizedResponse } from "@/lib/auth";
import { CLASSIFICATION_BATCH_SIZE } from "@/lib/constants";
import { classifyPendingPosts } from "@/lib/services/classifier";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse();
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Number(body.limit) || CLASSIFICATION_BATCH_SIZE;
    return Response.json(await classifyPendingPosts(limit));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Classification failed" },
      { status: 500 },
    );
  }
}
