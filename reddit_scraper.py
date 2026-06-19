"""
Reddit Pain - Point Research Script (personal, non-commercial, read-only)
-------------------------------------------------------------------------
Searches public subreddits for posts matching common "unmet need" phrases,
for personal market research purposes only. Does not post, comment, vote,
or take any write action on Reddit. Does not republish or sell collected data.

Setup:
1. pip install praw
2. Create a Reddit app at https://www.reddit.com/prefs/apps (type = "script")
3. Fill in CLIENT_ID, CLIENT_SECRET, USER_AGENT below
"""

import praw
import csv
import time

# ---- CONFIG ----
CLIENT_ID = "YOUR_CLIENT_ID"
CLIENT_SECRET = "YOUR_CLIENT_SECRET"
USER_AGENT = "personal-research-script by u/yourusername"

PAIN_PHRASES = [
    "I wish there was",
    "is there a tool that",
    "so frustrating that",
    "looking for an alternative to",
    "no good solution for",
]

SUBREDDITS = ["SaaS", "Entrepreneur", "smallbusiness"]
MAX_RESULTS_PER_QUERY = 25
OUTPUT_FILE = "pain_points.csv"


def main():
    reddit = praw.Reddit(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        user_agent=USER_AGENT,
    )

    rows = []
    seen_ids = set()

    for sub in SUBREDDITS:
        target = reddit.subreddit(sub)
        for phrase in PAIN_PHRASES:
            print(f"Searching '{phrase}' in r/{sub} ...")
            try:
                for post in target.search(phrase, sort="relevance", limit=MAX_RESULTS_PER_QUERY):
                    if post.id in seen_ids:
                        continue
                    seen_ids.add(post.id)
                    rows.append({
                        "subreddit": str(post.subreddit),
                        "title": post.title,
                        "score": post.score,
                        "url": f"https://reddit.com{post.permalink}",
                    })
            except Exception as e:
                print(f"Error: {e}")
            time.sleep(1)

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["subreddit", "title", "score", "url"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Saved {len(rows)} results to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()