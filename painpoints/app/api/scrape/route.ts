import { isAuthorizedCronRequest, unauthorizedResponse } from "@/lib/auth";
import { scrapeAll } from "@/lib/scraper";
import { getScraperSettings } from "@/lib/services/settings";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse();
  try {
    const settings = await getScraperSettings();
    const result = await scrapeAll(settings.subreddits, settings.phrases);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Scrape failed" },
      { status: 500 },
    );
  }
}
