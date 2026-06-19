import { createHash } from "node:crypto";
import Parser from "rss-parser";
import {
  MAX_POST_AGE_DAYS,
  MIN_COMMENTS,
  MIN_POST_LENGTH,
  MIN_SCORE,
  NEGATIVE_PHRASES,
  SCRAPE_COOLDOWN_HOURS,
  SCRAPE_DELAY_MS,
} from "@/lib/constants";
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
const STOPWORDS = new Set([
  "the","a","an","and","or","but","of","to","in","is","it","this","that","i","you","we","my","for","on","with","at","be","are","was","were","as","by","from","not","no","so","do","does","did",
]);

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

function normalizedHash(title: string, body: string) {
  const text = `${title} ${body}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !STOPWORDS.has(token))
    .slice(0, 80)
    .join(" ");
  return createHash("sha1").update(text).digest("hex");
}

const USER_AGENT =
  process.env.REDDIT_USER_AGENT || "painpoint-radar/1.0 (personal research)";

type EngagementInfo = { score: number; numComments: number; upvoteRatio: number };

async function fetchEngagement(link: string): Promise<EngagementInfo | null> {
  try {
    const jsonUrl = link.replace(/\/?$/, "/").concat(".json?limit=1&raw_json=1");
    const response = await fetch(jsonUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{
      data?: { children?: Array<{ data?: { score?: number; num_comments?: number; upvote_ratio?: number } }> };
    }>;
    const post = data[0]?.data?.children?.[0]?.data;
    if (!post) return null;
    return {
      score: post.score ?? 0,
      numComments: post.num_comments ?? 0,
      upvoteRatio: post.upvote_ratio ?? 0,
    };
  } catch {
    return null;
  }
}

function matchesNegativePhrase(text: string) {
  const haystack = text.toLowerCase();
  return NEGATIVE_PHRASES.some((needle) => haystack.includes(needle));
}

export async function scrapePhrase(phrase: string) {
  await connectToDatabase();
  const scope = "__global__";
  const key = `${scope}:${phrase.toLowerCase()}`;
  const cooldownStart = new Date(Date.now() - SCRAPE_COOLDOWN_HOURS * 60 * 60 * 1000);
  const recentRun = await ScrapeRun.exists({ key, ranAt: { $gte: cooldownStart } });

  if (recentRun) {
    return { subreddit: scope, phrase, found: 0, inserted: 0, filtered: 0, skipped: true };
  }

  const query = new URLSearchParams({ q: phrase, sort: "relevance", limit: "25" });
  const url = `https://www.reddit.com/search.rss?${query}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Reddit returned ${response.status} for global search`);
  }

  const feed = await parser.parseString(await response.text());
  const ageCutoff = new Date(Date.now() - MAX_POST_AGE_DAYS * 24 * 60 * 60 * 1000);

  type Candidate = {
    link: string;
    title: string;
    summary: string;
    author: string;
    publishedAt: Date;
    subreddit: string;
    hash: string;
  };

  const extractSubreddit = (link?: string, fallbackText?: string) => {
    const fromLink = link?.match(/reddit\.com\/r\/([^/?#]+)/i)?.[1];
    if (fromLink) return fromLink;
    const fromText = fallbackText?.match(/\/r\/([A-Za-z0-9_]{2,21})\b/)?.[1];
    return fromText || "(global)";
  };

  const candidates: Candidate[] = [];
  const filteredOps: ReturnType<typeof buildFilteredOp>[] = [];

  function buildFilteredOp(link: string, title: string, summary: string, author: string, publishedAt: Date, sub: string, reason: string, hash: string) {
    return {
      updateOne: {
        filter: { url: link },
        update: {
          $set: {
            subreddit: sub,
            filteredOut: true,
            filterReason: reason,
            scrapedAt: new Date(),
          },
          $setOnInsert: {
            title,
            summary,
            author,
            url: link,
            publishedAt,
            matchedPhrase: phrase,
            processed: true,
            engagementScore: 0,
            score: 0,
            numComments: 0,
            upvoteRatio: 0,
            normalizedHash: hash,
          },
        },
        upsert: true,
      },
    } as const;
  }

  for (const item of feed.items) {
    if (!item.link || !item.title) continue;
    const title = stripHtml(item.title);
    const summary = stripHtml(item.content || item.contentSnippet || "").slice(0, 8_000);
    const author = stripHtml(item.creator || item.author || "unknown").replace(/^\/u\//, "");
    const publishedAt = new Date(item.isoDate || item.pubDate || Date.now());
    const sub = extractSubreddit(item.link, `${item.title} ${item.content || ""}`);
    const hash = normalizedHash(title, summary);

    // Cheap filters
    if (publishedAt < ageCutoff) {
      filteredOps.push(buildFilteredOp(item.link, title, summary, author, publishedAt, sub, "too_old", hash));
      continue;
    }
    if ((title.length + summary.length) < MIN_POST_LENGTH) {
      filteredOps.push(buildFilteredOp(item.link, title, summary, author, publishedAt, sub, "too_short", hash));
      continue;
    }
    if (/\[(deleted|removed)\]/i.test(summary) || /\[(deleted|removed)\]/i.test(title)) {
      filteredOps.push(buildFilteredOp(item.link, title, summary, author, publishedAt, sub, "removed", hash));
      continue;
    }
    if (matchesNegativePhrase(`${title} ${summary}`)) {
      filteredOps.push(buildFilteredOp(item.link, title, summary, author, publishedAt, sub, "negative_phrase", hash));
      continue;
    }
    if (await Post.exists({ normalizedHash: hash, url: { $ne: item.link } })) {
      filteredOps.push(buildFilteredOp(item.link, title, summary, author, publishedAt, sub, "duplicate", hash));
      continue;
    }
    candidates.push({ link: item.link, title, summary, author, publishedAt, subreddit: sub, hash });
  }

  // Engagement enrichment for the survivors (sequential, gentle on Reddit)
  const operations: object[] = [...filteredOps];
  for (const candidate of candidates) {
    const engagement = await fetchEngagement(candidate.link);
    await sleep(400);
    let reason = "";
    if (engagement) {
      if (engagement.score < MIN_SCORE) reason = "low_score";
      else if (engagement.numComments < MIN_COMMENTS) reason = "low_comments";
    }
    const filteredOut = Boolean(reason);
    operations.push({
      updateOne: {
        filter: { url: candidate.link },
        update: {
          $set: {
            subreddit: candidate.subreddit,
            scrapedAt: new Date(),
            score: engagement?.score ?? 0,
            numComments: engagement?.numComments ?? 0,
            upvoteRatio: engagement?.upvoteRatio ?? 0,
            engagementScore: engagement ? engagement.score + engagement.numComments : 0,
            filteredOut,
            filterReason: reason,
          },
          $setOnInsert: {
            title: candidate.title,
            summary: candidate.summary,
            author: candidate.author,
            url: candidate.link,
            publishedAt: candidate.publishedAt,
            matchedPhrase: phrase,
            processed: filteredOut,
            normalizedHash: candidate.hash,
          },
        },
        upsert: true,
      },
    });
  }

  const result = operations.length
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await Post.bulkWrite(operations as any, { ordered: false })
    : null;
  const inserted = result?.upsertedCount ?? 0;
  const filtered = filteredOps.length + candidates.filter((c, i) => {
    // Approximate filtered count from low_score/low_comments — recompute from ops
    void c; void i;
    return false;
  }).length;

  // More accurate filtered count: anything in operations marked filteredOut
  const filteredCount = operations.reduce((sum, op) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setOnInsert = (op as any).updateOne?.update?.$setOnInsert;
    return sum + (setOnInsert?.filteredOut ? 1 : 0);
  }, 0);

  await ScrapeRun.findOneAndUpdate(
    { key },
    { key, ranAt: new Date(), found: feed.items.length, inserted, filtered: filteredCount, errorCount: 0 },
    { upsert: true },
  );

  return {
    subreddit: scope,
    phrase,
    found: feed.items.length,
    inserted,
    filtered: filteredCount,
    skipped: false,
    _filteredSoftCount: filtered,
  };
}

export async function scrapeAll(phrases: string[]) {
  const results: Awaited<ReturnType<typeof scrapePhrase>>[] = [];
  const errors: { phrase: string; message: string }[] = [];

  for (const phrase of phrases) {
    try {
      results.push(await scrapePhrase(phrase));
    } catch (error) {
      errors.push({
        phrase,
        message: error instanceof Error ? error.message : "Unknown scrape error",
      });
    }
    await sleep(SCRAPE_DELAY_MS);
  }

  return {
    combinations: phrases.length,
    inserted: results.reduce((sum, item) => sum + item.inserted, 0),
    filtered: results.reduce((sum, item) => sum + (item.filtered ?? 0), 0),
    skipped: results.filter((item) => item.skipped).length,
    errors,
    results,
  };
}
