"use client";

import { useState } from "react";
import { Check, Globe, LoaderCircle, Play, Plus, X } from "lucide-react";

export function SettingsForm({ initialPhrases }: { initialPhrases: string[] }) {
  const [phrases, setPhrases] = useState(initialPhrases);
  const [phrase, setPhrase] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [runMessage, setRunMessage] = useState("");

  const canRun = phrases.length > 0;

  async function runPipeline() {
    setRunStatus("running");
    setRunMessage("Saving current phrases…");
    try {
      const saveResponse = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrases }),
      });
      if (!saveResponse.ok) {
        const err = await saveResponse.json().catch(() => ({}));
        throw new Error(err.error || "Could not save settings before running");
      }
      setRunMessage("Running global Reddit pipeline. This can take a minute…");
      const response = await fetch("/api/pipeline", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pipeline failed");
      const sampleSubs = (data.scrape?.results ?? [])
        .map((r: { subreddit?: string }) => r.subreddit)
        .filter(Boolean)
        .slice(0, 5)
        .join(", ");
      setRunStatus("done");
      setRunMessage(
        `Scraped ${data.scrape?.inserted ?? 0} new · filtered ${data.scrape?.filtered ?? 0} · cooldown-skipped ${data.scrape?.skipped ?? 0} · classified ${data.classify?.processed ?? 0} (pain ${data.classify?.painPointsFound ?? 0}) · ${data.cluster?.clusters ?? 0} clusters. Sampled sources: ${sampleSubs || "—"}.`,
      );
    } catch (error) {
      setRunStatus("error");
      setRunMessage(error instanceof Error ? error.message : "Pipeline failed");
    }
  }

  const add = (value: string, values: string[], setter: (items: string[]) => void, reset: () => void) => {
    const clean = value.trim();
    if (clean && !values.includes(clean)) setter([...values, clean]);
    reset();
  };

  async function save() {
    setStatus("saving");
    setSaveError("");
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrases }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setSaveError(data.error || "Could not save settings.");
      setStatus("error");
      return;
    }
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Scope</span><h2>Global Reddit search</h2></div>
          <span className="pill"><Globe size={12} /> all of Reddit</span>
        </div>
        <p className="panel-copy">The radar searches across all of Reddit for posts matching the phrases below. Source subreddits are detected automatically.</p>
      </section>
      <section className="panel settings-panel">
        <div className="panel-heading"><div><span className="eyebrow">Intent</span><h2>Search phrases</h2></div><span className="count-badge">{phrases.length}</span></div>
        <p className="panel-copy">Language that usually signals frustration, unmet demand, or tool-switching intent.</p>
        <div className="tag-editor">{phrases.map((item) => <span className="editable-tag phrase" key={item}>&ldquo;{item}&rdquo;<button onClick={() => setPhrases(phrases.filter((value) => value !== item))} aria-label={`Remove ${item}`}><X size={13} /></button></span>)}</div>
        <div className="add-row"><input value={phrase} onChange={(e) => setPhrase(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add(phrase, phrases, setPhrases, () => setPhrase(""))} placeholder="e.g. I would pay for" /><button className="secondary-button" onClick={() => add(phrase, phrases, setPhrases, () => setPhrase(""))}><Plus size={15} /> Add</button></div>
      </section>
      <div className="save-bar">
        <span>{status === "error" ? (saveError || "Could not save settings.") : "Save first, then run the pipeline to refresh the dashboard."}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="secondary-button" disabled={!canRun || runStatus === "running"} onClick={runPipeline}>
            {runStatus === "running" ? <LoaderCircle className="spin" size={16} /> : <Play size={15} />} {runStatus === "running" ? "Running…" : "Run pipeline"}
          </button>
          <button className="primary-button" disabled={!canRun || status === "saving"} onClick={save}>
            {status === "saving" ? <LoaderCircle className="spin" size={16} /> : status === "saved" ? <Check size={16} /> : null}{status === "saved" ? "Saved" : "Save settings"}
          </button>
        </div>
      </div>
      {runStatus !== "idle" && <div className="notice slim">{runMessage}</div>}
    </div>
  );
}
