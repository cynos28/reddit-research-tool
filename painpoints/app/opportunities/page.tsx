import Link from "next/link";
import { ExternalLink, Lightbulb, Users } from "lucide-react";
import { getOpportunities } from "@/lib/query";
import type { LeanCluster, LeanPainPoint, LeanPost } from "@/types";

export const dynamic = "force-dynamic";

const MIN_AUTHORS = 2;

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ min?: string }>;
}) {
  const params = await searchParams;
  const min = Math.max(1, Number(params.min) || MIN_AUTHORS);

  let clusters: LeanCluster[] = [];
  let fellBack = false;
  let error = "";
  try {
    const result = await getOpportunities(min);
    clusters = result.clusters;
    fellBack = result.fellBack;
  } catch {
    error = "Connect MongoDB and run the pipeline to discover opportunities.";
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">Patterns worth building for</span>
          <h1>Opportunities</h1>
          <p>
            When <strong>{min}+ different people</strong> describe the same problem, it stops being one person&apos;s
            complaint and starts being a market signal.
          </p>
        </div>
        <span className="result-count">{clusters.length} opportunities</span>
      </header>

      <form className="filter-bar">
        <label>
          Minimum distinct users
          <select name="min" defaultValue={String(min)}>
            <option value="2">2 (default)</option>
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="1">1 (show every cluster)</option>
          </select>
        </label>
        <button className="secondary-button" type="submit">Apply</button>
      </form>

      {error && <div className="empty-state">{error}</div>}
      {!error && fellBack && clusters.length > 0 && (
        <div className="notice slim">
          No clusters yet meet the <strong>{min}+ distinct people</strong> threshold, so showing every cluster instead.
          Run the pipeline a few more times to build up signal.
        </div>
      )}
      {!error && !clusters.length && (
        <div className="empty-state">
          No clusters in the database yet. Open <a href="/settings">Settings</a> and click <strong>Run pipeline</strong>.
        </div>
      )}

      <div className="cluster-list">
        {clusters.map((cluster, index) => {
          const points = (cluster.painPointIds as LeanPainPoint[]) ?? [];
          const examples = points.slice(0, 3);
          return (
            <article className="cluster-row" key={cluster._id} style={{ padding: 18 }}>
              <header style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 17 }}>
                    <Lightbulb size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
                    {cluster.theme}
                  </h2>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    <span className="pill neutral">{cluster.category}</span>
                    <span className="pill" title="Distinct people asking about this">
                      <Users size={11} /> {cluster.distinctAuthors ?? 0} people
                    </span>
                    <span className="pill" title="Distinct subreddits">
                      {cluster.distinctSubreddits ?? 0} subs
                    </span>
                    {cluster.willingnessToPayCount > 0 && (
                      <span className="pill pay">{cluster.willingnessToPayCount} pay signal{cluster.willingnessToPayCount === 1 ? "" : "s"}</span>
                    )}
                    {cluster.isWeak && <span className="pill">weak signal</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <small className="muted">Opportunity score</small>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {(cluster.opportunityScore ?? 0).toFixed(2)}
                  </div>
                </div>
              </header>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
                <Metric label="Posts" value={cluster.frequency ?? 0} />
                <Metric label="Avg intensity" value={`${(cluster.avgIntensity ?? 0).toFixed(1)}/5`} />
                <Metric label="Cohesion" value={`${Math.round((cluster.cohesion ?? 0) * 100)}%`} />
                <Metric label="Existing tools" value={`${Math.round((cluster.solutionSaturation ?? 0) * 100)}%`} />
              </div>

              <details>
                <summary style={{ cursor: "pointer", color: "var(--muted, #888)" }}>
                  See {examples.length} example{examples.length === 1 ? "" : "s"} from real users
                </summary>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {examples.map((point) => {
                    const post = point.postId as LeanPost;
                    return (
                      <div key={point._id} style={{ borderLeft: "2px solid var(--accent, #888)", paddingLeft: 12 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span className="subreddit">r/{post?.subreddit ?? "unknown"}</span>
                          <span className="dot-separator">·</span>
                          <span className="muted" style={{ fontSize: 12 }}>u/{post?.author ?? "unknown"}</span>
                        </div>
                        <p style={{ margin: "4px 0", fontSize: 14 }}>{point.problemSummary}</p>
                        {point.evidenceQuote && (
                          <blockquote style={{ margin: "6px 0", fontStyle: "italic", color: "var(--muted, #aaa)", fontSize: 13 }}>
                            &ldquo;{point.evidenceQuote}&rdquo;
                          </blockquote>
                        )}
                        {post?.url && (
                          <a href={post.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                            Original post <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                  <Link className="text-link" href={`/clusters/${cluster._id}`}>
                    Open full analysis →
                  </Link>
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <small className="muted" style={{ display: "block", fontSize: 11 }}>{label}</small>
      <strong style={{ fontSize: 15 }}>{value}</strong>
    </div>
  );
}
