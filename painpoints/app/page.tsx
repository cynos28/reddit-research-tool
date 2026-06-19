import { Activity, CircleDollarSign, Database, Sparkles } from "lucide-react";
import Link from "next/link";
import { CategoryChart, TrendChart } from "@/components/charts";
import { OpportunityTable } from "@/components/opportunity-table";
import { getDashboardData } from "@/lib/query";
import type { DashboardStats, LeanCluster } from "@/types";

export const dynamic = "force-dynamic";

const emptyStats: DashboardStats = { totalPosts: 0, totalPainPoints: 0, painPointsThisWeek: 0, topCategoryThisWeek: "—", categoryCounts: [], dailyCounts: [], filteredOut: 0, weakClusters: 0 };

export default async function DashboardPage() {
  let stats = emptyStats;
  let clusters: LeanCluster[] = [];
  let setupNeeded = false;
  try {
    ({ stats, clusters } = await getDashboardData());
  } catch {
    setupNeeded = true;
  }
  return (
    <div className="page-shell">
      <header className="page-header">
        <div><span className="eyebrow">Research intelligence</span><h1>Opportunity overview</h1><p>Patterns hiding in plain sight across the conversations people are already having.</p></div>
        <div className="status-chip"><span className="live-dot" /> {setupNeeded ? "Setup required" : "Radar online"}</div>
      </header>
      {setupNeeded && <div className="notice"><Database size={18} /><div><strong>Connect your data sources</strong><p>Add <code>MONGODB_URI</code> and <code>OPENAI_API_KEY</code> to <code>.env.local</code>, then run the pipeline. The dashboard is ready for the signal.</p></div></div>}
      <section className="stat-grid">
        <Stat icon={<Database size={18} />} label="Posts scanned" value={stats.totalPosts.toLocaleString()} note="All-time source corpus" />
        <Stat icon={<Sparkles size={18} />} label="Pain points found" value={stats.totalPainPoints.toLocaleString()} note="Validated unmet needs" />
        <Stat icon={<Activity size={18} />} label="New this week" value={stats.painPointsThisWeek.toLocaleString()} note="Fresh opportunity signals" />
        <Stat icon={<CircleDollarSign size={18} />} label="Leading category" value={stats.topCategoryThisWeek} note="Most active this week" text />
        <Stat icon={<Database size={18} />} label="Filtered noise" value={stats.filteredOut.toLocaleString()} note="Low-quality posts rejected" />
        <Stat icon={<Activity size={18} />} label="Weak clusters" value={stats.weakClusters.toLocaleString()} note="Hidden from leaderboard" />
      </section>
      <section className="chart-grid">
        <div className="panel"><div className="panel-heading"><div><span className="eyebrow">Distribution</span><h2>Pain points by category</h2></div></div><CategoryChart data={stats.categoryCounts} /></div>
        <div className="panel"><div className="panel-heading"><div><span className="eyebrow">Velocity</span><h2>Discovery trend</h2></div><span className="muted">Last 30 days</span></div><TrendChart data={stats.dailyCounts} /></div>
      </section>
      <section className="panel opportunities-panel">
        <div className="panel-heading"><div><span className="eyebrow">Ranked by signal × urgency</span><h2>Top opportunities</h2></div><Link className="text-link" href="/clusters">Explore all →</Link></div>
        <OpportunityTable clusters={clusters} />
      </section>
    </div>
  );
}

function Stat({ icon, label, value, note, text = false }: { icon: React.ReactNode; label: string; value: string; note: string; text?: boolean }) {
  return <article className="stat-card"><div className="stat-top"><span className="stat-icon">{icon}</span><span>{label}</span></div><strong className={text ? "text-value" : ""}>{value}</strong><small>{note}</small></article>;
}
