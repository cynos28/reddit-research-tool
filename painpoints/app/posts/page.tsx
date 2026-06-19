import { ExternalLink } from "lucide-react";
import { getPosts } from "@/lib/query";
import type { LeanPost } from "@/types";

export const dynamic = "force-dynamic";

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ subreddit?: string; processed?: string; from?: string }> }) {
  const params = await searchParams;
  const filter: Record<string, unknown> = {};
  if (params.subreddit) filter.subreddit = params.subreddit;
  if (params.processed === "true") filter.processed = true;
  if (params.processed === "false") filter.processed = false;
  if (params.from) filter.publishedAt = { $gte: new Date(params.from) };
  let posts: LeanPost[] = [];
  let error = "";
  try { posts = await getPosts(filter); } catch { error = "Connect MongoDB to inspect scraped posts."; }
  const subreddits = [...new Set(posts.map((post) => post.subreddit))];
  return (
    <div className="page-shell">
      <header className="page-header"><div><span className="eyebrow">Raw evidence</span><h1>Source posts</h1><p>Audit the inputs, follow attribution, and see what has been classified.</p></div><span className="result-count">Latest {posts.length}</span></header>
      <form className="filter-bar"><label>Subreddit<select name="subreddit" defaultValue={params.subreddit || ""}><option value="">All sources</option>{subreddits.map((item) => <option key={item}>{item}</option>)}</select></label><label>Status<select name="processed" defaultValue={params.processed || ""}><option value="">Any status</option><option value="true">Processed</option><option value="false">Pending</option></select></label><label>Published after<input type="date" name="from" defaultValue={params.from || ""} /></label><button className="secondary-button" type="submit">Apply filters</button></form>
      {error ? <div className="empty-state">{error}</div> : <div className="post-feed">{posts.length ? posts.map((post) => <article className="post-card" key={post._id}><div className="source-meta"><span className="subreddit">r/{post.subreddit}</span><span>{new Date(post.publishedAt).toLocaleDateString()}</span><span className={`pill ${post.processed ? "processed" : "pending"}`}>{post.processed ? "Processed" : "Pending"}</span></div><h2>{post.title}</h2><p>{post.summary || "No text summary was included in the RSS entry."}</p><footer><span>Matched: &ldquo;{post.matchedPhrase}&rdquo;</span><a href={post.url} target="_blank" rel="noreferrer">View original on Reddit <ExternalLink size={13} /></a></footer></article>) : <div className="empty-state">No posts match these filters.</div>}</div>}
    </div>
  );
}
