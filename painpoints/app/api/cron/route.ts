import { isAuthorizedCronRequest, unauthorizedResponse } from "@/lib/auth";
import { scrapeAll } from "@/lib/scraper";
import { classifyPendingPosts } from "@/lib/services/classifier";
import { clusterPainPoints } from "@/lib/services/clusterer";
import { getScraperSettings } from "@/lib/services/settings";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse();
  try {
    const settings = await getScraperSettings();
    const scrape = await scrapeAll(settings.subreddits, settings.phrases);
    const classify = await classifyPendingPosts(25);
    const cluster = await clusterPainPoints();
    return Response.json({ ok: true, scrape, classify, cluster });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Pipeline failed" },
      { status: 500 },
    );
  }
}
