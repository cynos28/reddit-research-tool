import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getPipelineHistory } from "@/lib/query";

export const dynamic = "force-dynamic";

function fmt(date: string) {
  return new Date(date).toLocaleString();
}

function durationMs(start: string, end: string) {
  return Math.max(0, new Date(end).getTime() - new Date(start).getTime());
}

function humanDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

export default async function HistoryPage() {
  let runs: Awaited<ReturnType<typeof getPipelineHistory>> = [];
  let error = "";
  try {
    runs = await getPipelineHistory(50);
  } catch {
    error = "Connect MongoDB to see pipeline history.";
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">Pipeline telemetry</span>
          <h1>Run history</h1>
          <p>Every scrape → classify → cluster run, newest first. Useful for spotting when a phrase stops returning signal.</p>
        </div>
        <span className="result-count">{runs.length} run{runs.length === 1 ? "" : "s"}</span>
      </header>

      {error && <div className="empty-state">{error}</div>}
      {!error && !runs.length && (
        <div className="empty-state">
          No pipeline runs yet. Open <a href="/settings">Settings</a> and click <strong>Run pipeline</strong>.
        </div>
      )}

      {runs.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Started</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Scraped</th>
                <th>Filtered</th>
                <th>Classified</th>
                <th>Pain points</th>
                <th>Clusters</th>
                <th>Weak</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run._id} style={!run.ok ? { background: "rgba(255, 80, 80, 0.06)" } : undefined}>
                  <td>{fmt(run.startedAt)}</td>
                  <td>{humanDuration(durationMs(run.startedAt, run.finishedAt))}</td>
                  <td>
                    {run.ok ? (
                      <span className="pill" style={{ background: "rgba(80, 200, 120, 0.15)" }}>
                        <CheckCircle2 size={11} /> ok
                      </span>
                    ) : (
                      <span className="pill" style={{ background: "rgba(255, 100, 100, 0.18)" }} title={run.message}>
                        <AlertTriangle size={11} /> failed
                      </span>
                    )}
                  </td>
                  <td>{run.scrapeInserted}</td>
                  <td>{run.scrapeFiltered}</td>
                  <td>{run.classified}</td>
                  <td><strong>{run.painPointsFound}</strong></td>
                  <td>{run.clusters}</td>
                  <td>{run.weakClusters}</td>
                  <td>{run.scrapeErrors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
