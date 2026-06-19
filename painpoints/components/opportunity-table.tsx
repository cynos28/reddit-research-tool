import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import type { LeanCluster } from "@/types";

export function OpportunityTable({ clusters }: { clusters: LeanCluster[] }) {
  if (!clusters.length) {
    return <div className="empty-state compact">No clusters yet. Run the scrape, classify, and cluster pipeline to surface opportunities.</div>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Opportunity</th>
            <th>Category</th>
            <th>Posts</th>
            <th>Authors</th>
            <th>Subs</th>
            <th>Intensity</th>
            <th>Score</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {clusters.map((cluster) => (
            <tr key={cluster._id} style={cluster.isWeak ? { opacity: 0.6 } : undefined}>
              <td>
                <span className="opportunity-title">{cluster.theme}</span>
                {cluster.isWeak && (
                  <span className="pill" style={{ marginLeft: 6 }} title="Weak: thin author/subreddit/time diversity">
                    <AlertTriangle size={11} /> weak
                  </span>
                )}
              </td>
              <td><span className="pill neutral">{cluster.category}</span></td>
              <td>{cluster.frequency ?? 0}</td>
              <td>{cluster.distinctAuthors ?? 0}</td>
              <td>{cluster.distinctSubreddits ?? 0}</td>
              <td><span className="intensity">{(cluster.avgIntensity ?? 0).toFixed(1)}</span><span className="muted"> / 5</span></td>
              <td>
                <strong>{(cluster.opportunityScore ?? 0).toFixed(2)}</strong>
                {cluster.willingnessToPayCount > 0 && <span className="pill pay">Pay signal</span>}
              </td>
              <td><Link className="icon-link" href={`/clusters/${cluster._id}`} aria-label={`View ${cluster.theme}`}><ArrowUpRight size={16} /></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
