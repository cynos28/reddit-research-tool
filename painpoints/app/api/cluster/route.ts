import { isAuthorizedCronRequest, unauthorizedResponse } from "@/lib/auth";
import { clusterPainPoints } from "@/lib/services/clusterer";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse();
  try {
    return Response.json(await clusterPainPoints());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Clustering failed" },
      { status: 500 },
    );
  }
}
