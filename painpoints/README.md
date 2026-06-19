# PainPoint Radar

PainPoint Radar is a full-stack Next.js application that turns public Reddit search RSS feeds into ranked, evidence-backed product opportunities. It collects posts, uses OpenAI structured output to identify genuine unmet needs, groups related problems with embeddings, and presents the results in an attribution-friendly dashboard.

## Stack

- Next.js 16 App Router and TypeScript
- MongoDB with Mongoose and a serverless-safe cached connection
- OpenAI `gpt-4o-mini` classification and `text-embedding-3-small` embeddings
- Reddit public RSS search feeds parsed with `rss-parser`
- Tailwind CSS and Recharts

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your credentials:

   ```bash
   cp .env.example .env.local
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

MongoDB collections and indexes are created automatically. Scraper defaults are inserted into the `settings` collection the first time they are read and can then be edited at `/settings`.

## Run the first pipeline

Mutation endpoints accept either `x-cron-secret: <CRON_SECRET>` or `Authorization: Bearer <CRON_SECRET>`. In development only, if `CRON_SECRET` is not set, requests are allowed for convenience.

Run each stage independently:

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "x-cron-secret: $CRON_SECRET"

curl -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"limit": 10}'

curl -X POST http://localhost:3000/api/cluster \
  -H "x-cron-secret: $CRON_SECRET"
```

Or run the three stages in sequence with the orchestration endpoint:

```bash
curl http://localhost:3000/api/cron \
  -H "Authorization: Bearer $CRON_SECRET"
```

Classification deliberately processes a small number of posts per call. Call it repeatedly while unprocessed posts remain, or raise `limit` to at most 50 if your OpenAI and hosting limits permit it.

## API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/scrape` | POST | Scrape every configured subreddit/phrase combination |
| `/api/classify` | POST | Classify a capped batch of pending posts |
| `/api/cluster` | POST | Embed and group all validated pain points |
| `/api/cron` | GET | Run all three stages in order |
| `/api/painpoints` | GET | Paginated pain points with category, intensity, subreddit, and date filters |
| `/api/clusters` | GET | Clusters sortable by frequency, intensity, or engagement |
| `/api/posts` | GET | Paginated raw source feed |
| `/api/stats` | GET | Dashboard summaries and 30-day trend data |
| `/api/settings` | GET, PUT | Read or edit scraper sources and phrases |

Example pain point query:

```text
/api/painpoints?category=Developer%20Tools&minIntensity=3&subreddit=webdev&page=1&limit=20
```

## Scheduling on Vercel

`vercel.json` schedules `/api/cron` once daily at 03:00 UTC. Add `CRON_SECRET` in the Vercel project settings; Vercel Cron sends it as a bearer token automatically. The route uses the Node.js runtime and opts into a 300-second maximum duration.

The default scan has 49 subreddit/phrase combinations and waits 1.75 seconds between requests, so it can take around 90 seconds even before classification. A Vercel plan with sufficient function duration is required. On plans with shorter limits, use an external scheduler to call `/api/scrape`, `/api/classify`, and `/api/cluster` separately, or reduce the source list in Settings.

For cron-job.org or GitHub Actions, send the same secret in the `Authorization` or `x-cron-secret` header and call stages sequentially. Never expose `CRON_SECRET` to browser-side code.

## Reddit and engagement notes

The scraper uses public search RSS only—there is no Reddit OAuth flow or PRAW dependency. Each subreddit/phrase pair has a four-hour cooldown stored in MongoDB, requests are sequential, and every displayed source includes a link to the original Reddit post.

Reddit RSS does not expose vote or comment totals. `engagementScore` therefore defaults to zero and the cluster engagement ranking becomes useful only if you enrich posts later from an authorized data source. Frequency, intensity, and willingness-to-pay signals work entirely from RSS and OpenAI classification.
