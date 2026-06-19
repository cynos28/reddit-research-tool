import { getClusters } from "@/lib/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return Response.json({
      data: await getClusters(params.get("sort") || "frequency", params.get("category") || ""),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Query failed" }, { status: 500 });
  }
}
