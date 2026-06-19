import { DEFAULT_PHRASES, DEFAULT_SUBREDDITS } from "@/lib/constants";
import { Settings } from "@/lib/models/Settings";
import { connectToDatabase } from "@/lib/mongodb";

export async function getScraperSettings() {
  await connectToDatabase();
  const settings = await Settings.findOneAndUpdate(
    { key: "scraper" },
    {
      $setOnInsert: {
        key: "scraper",
        subreddits: DEFAULT_SUBREDDITS,
        phrases: DEFAULT_PHRASES,
        updatedAt: new Date(),
      },
    },
    { new: true, upsert: true, lean: true },
  );
  if (!settings) throw new Error("Could not initialize scraper settings");
  return settings;
}
