import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getCluster } from "@/lib/query";
import type { LeanPainPoint, LeanPost } from "@/types";

export const dynamic = "force-dynamic";

export default async function ClusterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cluster = await getCluster(id).catch(() => null);
  if (!cluster) notFound();
  const points = cluster.painPointIds as LeanPainPoint[];
  const distribution = [1, 2, 3, 4, 5].map((level) => ({ level, count: points.filter((point) => point.intensity === level).length }));
  const max = Math.max(...distribution.map((item) => item.count), 1);
  return (
    <div className="page-shell detail-page">
      <Link className="back-link" href="/clusters"><ArrowLeft size={15} /> All opportunities</Link>
      <header className="detail-header"><span className="pill neutral">{cluster.category}</span><h1>{cluster.theme}</h1><p>Built from {cluster.frequency} independent pain-point signal{cluster.frequency === 1 ? "" : "s"}, with an average intensity of {cluster.avgIntensity.toFixed(1)} out of 5.</p></header>
      <section className="detail-stat-grid"><div><small>Frequency</small><strong>{cluster.frequency}</strong></div><div><small>Avg. intensity</small><strong>{cluster.avgIntensity.toFixed(1)}</strong></div><div><small>Pay signals</small><strong>{cluster.willingnessToPayCount}</strong></div><div><small>Engagement</small><strong>{cluster.totalEngagementScore}</strong></div></section>
      <div className="detail-grid">
        <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Urgency profile</span><h2>Intensity distribution</h2></div></div><div className="distribution">{distribution.map((item) => <div key={item.level}><span>{item.level}</span><div><i style={{ width: `${(item.count / max) * 100}%` }} /></div><strong>{item.count}</strong></div>)}</div></section>
        <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Source evidence</span><h2>Contributing posts</h2></div></div><div className="source-list">{points.map((point) => { const post = point.postId as LeanPost; return <article key={point._id}><div className="source-meta"><span className="subreddit">r/{post.subreddit}</span><span>{new Date(post.publishedAt).toLocaleDateString()}</span><span>Intensity {point.intensity}/5</span></div><h3>{post.title}</h3><p>{point.problemSummary}</p><a href={post.url} target="_blank" rel="noreferrer">View original on Reddit <ExternalLink size={13} /></a></article>; })}</div></section>
      </div>
    </div>
  );
}
