"use client";

import { useState } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";

export function SettingsForm({ initialSubreddits, initialPhrases }: { initialSubreddits: string[]; initialPhrases: string[] }) {
  const [subreddits, setSubreddits] = useState(initialSubreddits);
  const [phrases, setPhrases] = useState(initialPhrases);
  const [subreddit, setSubreddit] = useState("");
  const [phrase, setPhrase] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const add = (value: string, values: string[], setter: (items: string[]) => void, reset: () => void) => {
    const clean = value.trim().replace(/^r\//, "");
    if (clean && !values.includes(clean)) setter([...values, clean]);
    reset();
  };

  async function save() {
    setStatus("saving");
    const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subreddits, phrases }) });
    setStatus(response.ok ? "saved" : "error");
    window.setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="panel-heading"><div><span className="eyebrow">Sources</span><h2>Subreddits</h2></div><span className="count-badge">{subreddits.length}</span></div>
        <p className="panel-copy">Communities scanned for posts containing your research phrases.</p>
        <div className="tag-editor">{subreddits.map((item) => <span className="editable-tag" key={item}>r/{item}<button onClick={() => setSubreddits(subreddits.filter((value) => value !== item))} aria-label={`Remove ${item}`}><X size={13} /></button></span>)}</div>
        <div className="add-row"><input value={subreddit} onChange={(e) => setSubreddit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add(subreddit, subreddits, setSubreddits, () => setSubreddit(""))} placeholder="e.g. startups" /><button className="secondary-button" onClick={() => add(subreddit, subreddits, setSubreddits, () => setSubreddit(""))}><Plus size={15} /> Add</button></div>
      </section>
      <section className="panel settings-panel">
        <div className="panel-heading"><div><span className="eyebrow">Intent</span><h2>Search phrases</h2></div><span className="count-badge">{phrases.length}</span></div>
        <p className="panel-copy">Language that usually signals frustration, unmet demand, or tool-switching intent.</p>
        <div className="tag-editor">{phrases.map((item) => <span className="editable-tag phrase" key={item}>&ldquo;{item}&rdquo;<button onClick={() => setPhrases(phrases.filter((value) => value !== item))} aria-label={`Remove ${item}`}><X size={13} /></button></span>)}</div>
        <div className="add-row"><input value={phrase} onChange={(e) => setPhrase(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add(phrase, phrases, setPhrases, () => setPhrase(""))} placeholder="e.g. I would pay for" /><button className="secondary-button" onClick={() => add(phrase, phrases, setPhrases, () => setPhrase(""))}><Plus size={15} /> Add</button></div>
      </section>
      <div className="save-bar"><span>{status === "error" ? "Could not save. Check your database connection." : "Changes apply to the next scrape run."}</span><button className="primary-button" disabled={!subreddits.length || !phrases.length || status === "saving"} onClick={save}>{status === "saving" ? <LoaderCircle className="spin" size={16} /> : status === "saved" ? <Check size={16} /> : null}{status === "saved" ? "Saved" : "Save settings"}</button></div>
    </div>
  );
}
