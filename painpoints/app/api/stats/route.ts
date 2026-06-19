import { getDashboardData } from "@/lib/query";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { stats, clusters } = await getDashboardData();
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return Response.json({
      ...stats,
      topCategories: stats.categoryCounts.slice(0, 5),
      topClustersThisWeek: clusters
        .filter((cluster) => new Date(cluster.lastUpdated).getTime() >= weekStart)
        .slice(0, 5),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Query failed" }, { status: 500 });
  }
}
