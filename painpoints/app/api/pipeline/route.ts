import { CLASSIFICATION_BATCH_SIZE, PIPELINE_MIN_INTERVAL_MS } from "@/lib/constants";
import { PipelineRun } from "@/lib/models/PipelineRun";
import { connectToDatabase } from "@/lib/mongodb";
import { scrapeAll } from "@/lib/scraper";
import { classifyPendingPosts } from "@/lib/services/classifier";
import { clusterPainPoints } from "@/lib/services/clusterer";
import { getScraperSettings } from "@/lib/services/settings";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  await connectToDatabase();
  const lastRun = await PipelineRun.findOne().sort({ startedAt: -1 }).lean();
  if (lastRun) {
    const elapsed = Date.now() - new Date(lastRun.startedAt).getTime();
    if (elapsed < PIPELINE_MIN_INTERVAL_MS) {
      const waitSec = Math.ceil((PIPELINE_MIN_INTERVAL_MS - elapsed) / 1000);
      return Response.json(
        { error: `Pipeline ran ${Math.ceil(elapsed / 1000)}s ago. Try again in ${waitSec}s.` },
        { status: 429 },
      );
    }
  }

  const startedAt = new Date();
  try {
    const settings = await getScraperSettings();
    const scrape = await scrapeAll(settings.phrases);
    const classify = await classifyPendingPosts(CLASSIFICATION_BATCH_SIZE * 5);
    const cluster = await clusterPainPoints();
    await PipelineRun.create({
      startedAt,
      finishedAt: new Date(),
      ok: true,
      scrapeInserted: scrape.inserted,
      scrapeFiltered: scrape.filtered,
      scrapeErrors: scrape.errors.length,
      classified: classify.processed,
      painPointsFound: classify.painPointsFound,
      clusters: cluster.clusters,
      weakClusters: cluster.weak,
    });
    return Response.json({ ok: true, scrape, classify, cluster });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline failed";
    await PipelineRun.create({
      startedAt,
      finishedAt: new Date(),
      ok: false,
      scrapeInserted: 0,
      scrapeFiltered: 0,
      scrapeErrors: 0,
      classified: 0,
      painPointsFound: 0,
      clusters: 0,
      weakClusters: 0,
      message,
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
