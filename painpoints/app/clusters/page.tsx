import { ClusterList } from "@/components/cluster-list";
import { getClusters } from "@/lib/query";
import type { LeanCluster } from "@/types";

export const dynamic = "force-dynamic";

export default async function ClustersPage({ searchParams }: { searchParams: Promise<{ sort?: string; category?: string; includeWeak?: string }> }) {
  const params = await searchParams;
  const includeWeak = params.includeWeak === "1";
  let clusters: LeanCluster[] = [];
  let error = "";
  try { clusters = await getClusters(params.sort, params.category, includeWeak); } catch { error = "Connect MongoDB to browse opportunity clusters."; }
  const categories = [...new Set(clusters.map((cluster) => cluster.category))];
  return (
    <div className="page-shell">
      <header className="page-header"><div><span className="eyebrow">Theme intelligence</span><h1>Opportunity clusters</h1><p>Related pain points grouped into product-sized problems worth investigating.</p></div><span className="result-count">{clusters.length} clusters</span></header>
      <form className="filter-bar">
        <label>Rank by<select name="sort" defaultValue={params.sort || "opportunityScore"}>
          <option value="opportunityScore">Opportunity score</option>
          <option value="frequency">Frequency</option>
          <option value="distinctAuthors">Distinct authors</option>
          <option value="avgIntensity">Intensity</option>
          <option value="totalEngagementScore">Engagement</option>
        </select></label>
        <label>Category<select name="category" defaultValue={params.category || ""}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" name="includeWeak" value="1" defaultChecked={includeWeak} /> Include weak clusters
        </label>
        <button className="secondary-button" type="submit">Apply filters</button>
      </form>
      {error ? <div className="empty-state">{error}</div> : <ClusterList clusters={clusters} />}
    </div>
  );
}
