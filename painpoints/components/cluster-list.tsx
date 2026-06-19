"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { LeanCluster, LeanPainPoint, LeanPost } from "@/types";

export function ClusterList({ clusters }: { clusters: LeanCluster[] }) {
  if (!clusters.length) return <div className="empty-state">No opportunity clusters match these filters.</div>;
  return (
    <div className="cluster-list">
      {clusters.map((cluster, index) => (
        <details className="cluster-row" key={cluster._id}>
          <summary>
            <span className="rank">{String(index + 1).padStart(2, "0")}</span>
            <span className="cluster-main"><strong>{cluster.theme}</strong><span><span className="pill neutral">{cluster.category}</span>{cluster.willingnessToPayCount > 0 && <span className="pill pay">{cluster.willingnessToPayCount} pay signal{cluster.willingnessToPayCount === 1 ? "" : "s"}</span>}</span></span>
            <span className="metric"><small>Frequency</small>{cluster.frequency}</span>
            <span className="metric"><small>Intensity</small>{cluster.avgIntensity.toFixed(1)}</span>
            <ChevronDown className="chevron" size={18} />
          </summary>
          <div className="cluster-sources">
            {(cluster.painPointIds as LeanPainPoint[]).map((point) => {
              const post = point.postId as LeanPost;
              return (
                <article key={point._id}>
                  <div><span className="subreddit">r/{post.subreddit}</span><span className="dot-separator">·</span><span className="muted">Intensity {point.intensity}/5</span></div>
                  <h3>{post.title}</h3>
                  <p>{point.problemSummary}</p>
                  <a href={post.url} target="_blank" rel="noreferrer">View original on Reddit <ExternalLink size={13} /></a>
                </article>
              );
            })}
            <Link className="text-link" href={`/clusters/${cluster._id}`}>Open full opportunity analysis →</Link>
          </div>
        </details>
      ))}
    </div>
  );
}
