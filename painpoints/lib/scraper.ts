import Parser from "rss-parser";
import { SCRAPE_COOLDOWN_HOURS, SCRAPE_DELAY_MS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/mongodb";
import { Post } from "@/lib/models/Post";
import { ScrapeRun } from "@/lib/models/ScrapeRun";

type RedditFeed = {
  title?: string;
  content?: string;
  contentSnippet?: string;
  creator?: string;
  author?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
};

const parser = new Parser<Record<string, unknown>, RedditFeed>({
  customFields: { item: ["author"] },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

export function stripHtml(value = "") {
  return decodeEntities(
    value
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export async function scrapeSubreddit(subreddit: string, phrase: string) {
  await connectToDatabase();
  const key = `${subreddit.toLowerCase()}:${phrase.toLowerCase()}`;
  const cooldownStart = new Date(Date.now() - SCRAPE_COOLDOWN_HOURS * 60 * 60 * 1000);
  const recentRun = await ScrapeRun.exists({ key, ranAt: { $gte: cooldownStart } });

  if (recentRun) return { subreddit, phrase, found: 0, inserted: 0, skipped: true };

  const query = new URLSearchParams({
    q: phrase,
    restrict_sr: "1",
    sort: "relevance",
    limit: "25",
  });
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/search.rss?${query}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        process.env.REDDIT_USER_AGENT || "painpoint-radar/1.0 (personal research)",
      Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Reddit returned ${response.status} for r/${subreddit}`);
  }

  const feed = await parser.parseString(await response.text());
  const operations = feed.items
    .filter((item) => item.link && item.title)
    .map((item) => ({
      updateOne: {
        filter: { url: item.link },
        update: {
          $setOnInsert: {
            subreddit,
            title: stripHtml(item.title),
            summary: stripHtml(item.content || item.contentSnippet || "").slice(0, 8_000),
            author: stripHtml(item.creator || item.author || "unknown").replace(/^\/u\//, ""),
            url: item.link,
            publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
            matchedPhrase: phrase,
            scrapedAt: new Date(),
            processed: false,
            engagementScore: 0,
          },
        },
        upsert: true,
      },
    }));

  const result = operations.length ? await Post.bulkWrite(operations, { ordered: false }) : null;
  const inserted = result?.upsertedCount ?? 0;
  await ScrapeRun.findOneAndUpdate(
    { key },
    { key, ranAt: new Date(), found: feed.items.length, inserted },
    { upsert: true },
  );

  return { subreddit, phrase, found: feed.items.length, inserted, skipped: false };
}

export async function scrapeAll(subreddits: string[], phrases: string[]) {
  const results: Awaited<ReturnType<typeof scrapeSubreddit>>[] = [];
  const errors: { subreddit: string; phrase: string; message: string }[] = [];

  for (const subreddit of subreddits) {
    for (const phrase of phrases) {
      try {
        results.push(await scrapeSubreddit(subreddit, phrase));
      } catch (error) {
        errors.push({
          subreddit,
          phrase,
          message: error instanceof Error ? error.message : "Unknown scrape error",
        });
      }
      await sleep(SCRAPE_DELAY_MS);
    }
  }

  return {
    combinations: subreddits.length * phrases.length,
    inserted: results.reduce((sum, item) => sum + item.inserted, 0),
    skipped: results.filter((item) => item.skipped).length,
    errors,
    results,
  };
}
