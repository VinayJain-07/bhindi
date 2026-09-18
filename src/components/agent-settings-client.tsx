"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Globe2,
  Info,
  Plus,
  Save,
  Sparkles,
  X,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type AgentConfigState = {
  seoEnabled: boolean;
  seoRegion: string;
  redditEnabled: boolean;
  redditVoice: string;
  redditRegion: string;
  prioritySubreddits: string[];
  searchKeywords: string[];
  xEnabled: boolean;
  xVoice: string;
};

export function AgentSettingsClient({
  companyId,
  initialConfig,
}: {
  companyId: string;
  initialConfig?: Partial<AgentConfigState>;
}) {
  const [config, setConfig] = useState<AgentConfigState>({
    seoEnabled: initialConfig?.seoEnabled ?? true,
    seoRegion: initialConfig?.seoRegion ?? "United States (English)",
    redditEnabled: initialConfig?.redditEnabled ?? true,
    redditVoice:
      initialConfig?.redditVoice ??
      "Sound like a helpful user, keep replies concise, avoid over-promotional language. Disclose affiliation transparently when mentioning our products.",
    redditRegion: initialConfig?.redditRegion ?? "Global (no filter)",
    prioritySubreddits: initialConfig?.prioritySubreddits ?? [
      "r/SEO",
      "r/agency",
      "r/marketing",
      "r/SaaS",
      "r/webdev",
    ],
    searchKeywords: initialConfig?.searchKeywords ?? [
      "best SEO audit tool",
      "automated client SEO reporting",
      "Screaming Frog alternative",
      "how agencies automate reporting",
    ],
    xEnabled: initialConfig?.xEnabled ?? true,
    xVoice: initialConfig?.xVoice ?? "Crisp, counter-intuitive architecture breakdowns for technical marketers.",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSubreddit, setNewSubreddit] = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [showKeywordInput, setShowKeywordInput] = useState(false);
  const [showSearchMapPreview, setShowSearchMapPreview] = useState(false);

  const addSubreddit = () => {
    if (!newSubreddit.trim()) return;
    let formatted = newSubreddit.trim();
    if (!formatted.startsWith("r/")) formatted = `r/${formatted}`;
    if (!config.prioritySubreddits.includes(formatted) && config.prioritySubreddits.length < 20) {
      setConfig((prev) => ({
        ...prev,
        prioritySubreddits: [...prev.prioritySubreddits, formatted],
      }));
    }
    setNewSubreddit("");
    setShowSubInput(false);
  };

  const removeSubreddit = (sub: string) => {
    setConfig((prev) => ({
      ...prev,
      prioritySubreddits: prev.prioritySubreddits.filter((s) => s !== sub),
    }));
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const clean = newKeyword.trim();
    if (!config.searchKeywords.includes(clean) && config.searchKeywords.length < 30) {
      setConfig((prev) => ({
        ...prev,
        searchKeywords: [...prev.searchKeywords, clean],
      }));
    }
    setNewKeyword("");
    setShowKeywordInput(false);
  };

  const removeKeyword = (kw: string) => {
    setConfig((prev) => ({
      ...prev,
      searchKeywords: prev.searchKeywords.filter((k) => k !== kw),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/agents/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          agentType: "REDDIT",
          enabled: config.redditEnabled,
          instructions: config.redditVoice,
          config: {
            customSubreddits: config.prioritySubreddits,
            customKeywords: config.searchKeywords,
            searchRegion: config.redditRegion,
          },
        }),
      });

      await fetch("/api/agents/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          agentType: "SEO",
          enabled: config.seoEnabled,
          config: { market: config.seoRegion },
        }),
      });

      await fetch("/api/agents/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          agentType: "X",
          enabled: config.xEnabled,
          instructions: config.xVoice,
        }),
      });

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="agent-settings-container">
      {/* Top Header matching ref4.png */}
      <div className="settings-page-header">
        <div>
          <h2>Agents</h2>
          <p>Configure platform instructions, toggles, and brand voice for your AI CMO.</p>
        </div>
        <button
          type="button"
          className="settings-save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saved ? <Check size={14} /> : <Save size={14} />}
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>

      {/* Card 1: SEO Analysis */}
      <section className="agent-setting-card">
        <div className="setting-card-header">
          <div className="card-title-group">
            <span className="card-icon-circle seo">
              <Globe2 size={18} />
            </span>
            <div>
              <h3>SEO Analysis</h3>
              <p>The market your search and AI-visibility data is tracked for.</p>
            </div>
          </div>

          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={config.seoEnabled}
              onChange={(e) => setConfig((prev) => ({ ...prev, seoEnabled: e.target.checked }))}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="setting-card-body">
          <div className="select-field-row">
            <select
              value={config.seoRegion}
              onChange={(e) => setConfig((prev) => ({ ...prev, seoRegion: e.target.value }))}
            >
              <option value="United States (English)">United States (English)</option>
              <option value="United Kingdom (English)">United Kingdom (English)</option>
              <option value="Canada (English)">Canada (English)</option>
              <option value="Australia (English)">Australia (English)</option>
              <option value="Global (English)">Global (English)</option>
            </select>
          </div>
          <small className="setting-footer-note">
            Applies on the next run. Past data from other markets is kept; ChatGPT data stays US-only.
          </small>
        </div>
      </section>

      {/* Card 2: Reddit Agent (matching ref4.png) */}
      <section className="agent-setting-card">
        <div className="setting-card-header">
          <div className="card-title-group">
            <span className="card-icon-circle reddit">
              <Image src="/agent-logos/reddit.svg" alt="Reddit" width={18} height={18} />
            </span>
            <div>
              <h3>Reddit</h3>
              <p>How replies should read, and where the agent looks.</p>
            </div>
          </div>

          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={config.redditEnabled}
              onChange={(e) => setConfig((prev) => ({ ...prev, redditEnabled: e.target.checked }))}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="setting-card-body">
          {/* Instructions / Voice Textarea */}
          <div className="voice-textarea-group">
            <textarea
              rows={4}
              value={config.redditVoice}
              onChange={(e) => setConfig((prev) => ({ ...prev, redditVoice: e.target.value }))}
              placeholder="Sound like a helpful user, keep replies concise, avoid over-promotional language..."
            />
          </div>

          {/* Search Region */}
          <div className="form-labeled-section">
            <label className="field-label">
              Search region <span title="Geographic filter for Reddit search"><Info size={12} /></span>
            </label>
            <select
              value={config.redditRegion}
              onChange={(e) => setConfig((prev) => ({ ...prev, redditRegion: e.target.value }))}
            >
              <option value="Global (no filter)">Global (no filter)</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Europe">Europe</option>
            </select>
          </div>

          {/* Priority Subreddits Tag Input (0/20) */}
          <div className="form-labeled-section">
            <div className="tag-header-row">
              <label className="field-label">
                Priority subreddits <span title="Specific subreddits to monitor"><Info size={12} /></span>
              </label>
              <span className="tag-count-indicator">{config.prioritySubreddits.length}/20</span>
            </div>

            <div className="tag-manager-box">
              <div className="tags-list">
                {config.prioritySubreddits.map((sub) => (
                  <span key={sub} className="tag-pill subreddit">
                    {sub}
                    <button type="button" onClick={() => removeSubreddit(sub)}>
                      <X size={10} />
                    </button>
                  </span>
                ))}

                {showSubInput ? (
                  <div className="tag-inline-input">
                    <input
                      type="text"
                      placeholder="e.g. r/bigseo"
                      value={newSubreddit}
                      onChange={(e) => setNewSubreddit(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSubreddit()}
                      autoFocus
                    />
                    <button type="button" onClick={addSubreddit}>
                      Add
                    </button>
                    <button type="button" onClick={() => setShowSubInput(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="add-tag-btn"
                    onClick={() => setShowSubInput(true)}
                    disabled={config.prioritySubreddits.length >= 20}
                  >
                    <Plus size={11} /> Add
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search Keywords Tag Input (0/30) */}
          <div className="form-labeled-section">
            <div className="tag-header-row">
              <label className="field-label">
                Search keywords <span title="Custom search phrases to track"><Info size={12} /></span>
              </label>
              <span className="tag-count-indicator">{config.searchKeywords.length}/30</span>
            </div>

            <div className="tag-manager-box">
              <div className="tags-list">
                {config.searchKeywords.map((kw) => (
                  <span key={kw} className="tag-pill keyword">
                    {kw}
                    <button type="button" onClick={() => removeKeyword(kw)}>
                      <X size={10} />
                    </button>
                  </span>
                ))}

                {showKeywordInput ? (
                  <div className="tag-inline-input">
                    <input
                      type="text"
                      placeholder="e.g. SEO audit tool"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                      autoFocus
                    />
                    <button type="button" onClick={addKeyword}>
                      Add
                    </button>
                    <button type="button" onClick={() => setShowKeywordInput(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="add-tag-btn"
                    onClick={() => setShowKeywordInput(true)}
                    disabled={config.searchKeywords.length >= 30}
                  >
                    <Plus size={11} /> Add
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Search Map Preview Accordion */}
          <div className="search-map-preview-accordion">
            <button
              type="button"
              className="accordion-toggle-btn"
              onClick={() => setShowSearchMapPreview(!showSearchMapPreview)}
            >
              <Sparkles size={13} />
              <span>Dynamic Reddit Opportunity Search Map (7 Query Families)</span>
              {showSearchMapPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showSearchMapPreview && (
              <div className="search-map-families-grid">
                <div className="family-col">
                  <strong>1. Direct Product/Category</strong>
                  <small>&ldquo;best SEO audit tool&rdquo;, &ldquo;automated SEO reporting software&rdquo;</small>
                </div>
                <div className="family-col">
                  <strong>2. Recommendation / Intent</strong>
                  <small>&ldquo;recommend an SEO tool&rdquo;, &ldquo;what tool should I use&rdquo;</small>
                </div>
                <div className="family-col">
                  <strong>3. Pain & Problem</strong>
                  <small>&ldquo;SEO reporting takes too long&rdquo;, &ldquo;how do I automate client reports&rdquo;</small>
                </div>
                <div className="family-col">
                  <strong>4. Competitor & Alternatives</strong>
                  <small>&ldquo;Screaming Frog alternative&rdquo;, &ldquo;Semrush too expensive&rdquo;</small>
                </div>
                <div className="family-col">
                  <strong>5. Jobs-to-be-Done (JTBD)</strong>
                  <small>&ldquo;how to audit 50 client websites&rdquo;, &ldquo;how agencies automate reporting&rdquo;</small>
                </div>
                <div className="family-col">
                  <strong>6. Comparison Searches</strong>
                  <small>&ldquo;Screaming Frog vs Semrush&rdquo;, &ldquo;best alternatives for agencies&rdquo;</small>
                </div>
                <div className="family-col">
                  <strong>7. Broader ICP Debates</strong>
                  <small>&ldquo;agency client retention reporting&rdquo;, &ldquo;B2B SaaS pipeline audits&rdquo;</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Card 3: X / Twitter (matching ref4.png) */}
      <section className="agent-setting-card">
        <div className="setting-card-header">
          <div className="card-title-group">
            <span className="card-icon-circle x-brand">
              <Image src="/agent-logos/x.svg" alt="X" width={16} height={16} />
            </span>
            <div>
              <h3>X / Twitter</h3>
              <p>The tone and voice for posts on X.</p>
            </div>
          </div>

          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={config.xEnabled}
              onChange={(e) => setConfig((prev) => ({ ...prev, xEnabled: e.target.checked }))}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="setting-card-body">
          <div className="x-brand-voice-row">
            <div className="brand-voice-label">
              <span>Brand voice</span> <span title="Tone guidelines for X"><Info size={12} /></span>
            </div>
            <div className="brand-voice-actions">
              <button
                type="button"
                className="link-action-btn"
                onClick={() => {
                  const input = window.prompt("Enter your custom X brand voice:", config.xVoice);
                  if (input) setConfig((prev) => ({ ...prev, xVoice: input }));
                }}
              >
                Write your own
              </button>
              <button
                type="button"
                className="link-action-btn sparkle"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    xVoice: "Authoritative, architecture-first, counter-intuitive B2B growth insights.",
                  }))
                }
              >
                <Sparkles size={12} /> Set up my X brand voice
              </button>
            </div>
          </div>
          <small className="setting-footer-note">Used when the agent writes for this platform.</small>
        </div>
      </section>
    </div>
  );
}
