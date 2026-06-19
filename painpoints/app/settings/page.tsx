import { SettingsForm } from "@/components/settings-form";
import { DEFAULT_PHRASES } from "@/lib/constants";
import { getScraperSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let phrases = DEFAULT_PHRASES;
  let offline = false;
  try {
    const settings = await getScraperSettings();
    phrases = settings.phrases;
  } catch {
    offline = true;
  }
  return (
    <div className="page-shell">
      <header className="page-header"><div><span className="eyebrow">Radar configuration</span><h1>Scraper settings</h1><p>Choose the phrases that signal early demand. The radar searches across all of Reddit.</p></div></header>
      {offline && <div className="notice slim">Showing defaults. Connect MongoDB before saving changes.</div>}
      <SettingsForm initialPhrases={phrases} />
      <section className="panel pipeline-note"><span className="eyebrow">How it runs</span><h2>One pipeline, three stages</h2><div className="pipeline-steps"><div><strong>01</strong><span><b>Scrape</b><small>Global Reddit search for matching posts</small></span></div><div><strong>02</strong><span><b>Classify</b><small>Extract genuine unmet needs</small></span></div><div><strong>03</strong><span><b>Cluster</b><small>Group patterns into opportunities</small></span></div></div></section>
    </div>
  );
}
