import { Settings } from "@/lib/models/Settings";
import { connectToDatabase } from "@/lib/mongodb";
import { getScraperSettings } from "@/lib/services/settings";
import { validateSettings } from "@/lib/validation";

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
    const body = await request.json().catch(() => ({}));
    const result = validateSettings(body);
    if (!result.ok) {
      return Response.json({ error: result.error, field: result.field }, { status: 400 });
    }
    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate(
      { key: "scraper" },
      { key: "scraper", ...result.value, updatedAt: new Date() },
      { new: true, upsert: true },
    );
    return Response.json(settings);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 500 });
  }
}
