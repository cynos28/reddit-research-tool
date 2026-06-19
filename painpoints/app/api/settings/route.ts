import { Settings } from "@/lib/models/Settings";
import { connectToDatabase } from "@/lib/mongodb";
import { getScraperSettings } from "@/lib/services/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await getScraperSettings());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Query failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const clean = (items: unknown) =>
      Array.isArray(items)
        ? [...new Set(items.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 50)
        : [];
    const subreddits = clean(body.subreddits).map((item) => item.replace(/^r\//, ""));
    const phrases = clean(body.phrases);
    if (!subreddits.length || !phrases.length) {
      return Response.json({ error: "At least one subreddit and phrase are required" }, { status: 400 });
    }
    const settings = await Settings.findOneAndUpdate(
      { key: "scraper" },
      { key: "scraper", subreddits, phrases, updatedAt: new Date() },
      { new: true, upsert: true },
    );
    return Response.json(settings);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 500 });
  }
}
