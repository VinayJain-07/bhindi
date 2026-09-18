# Document and skill output audit

Reviewed 2618 Markdown files across this workspace, 23 document definitions and 22 agent definitions.

## Redundant source files

Found 873 groups with identical content after newline normalization (1743 repeated copies). These are file copies, not 1743 redundant customer reports.

The runtime reads local skills from smark-connect-app/skills and external skills from smark-connect-app/vendor/skill-repositories. The sibling original repositories and document-framework-push app copy are outside that runtime lookup. Keep the vendored runtime files. Review sibling repositories as snapshots or independent checkouts before archiving them; this audit does not delete them.

Examples of repeated files:

- claude-seo-main/extensions/ahrefs/skills/seo-ahrefs/SKILL.md; document-framework-push/vendor/skill-repositories/claude-seo-main/extensions/ahrefs/skills/seo-ahrefs/SKILL.md; smark-connect-app/vendor/skill-repositories/claude-seo-main/extensions/ahrefs/skills/seo-ahrefs/SKILL.md
- claude-seo-main/extensions/banana/skills/seo-image-gen/SKILL.md; document-framework-push/vendor/skill-repositories/claude-seo-main/extensions/banana/skills/seo-image-gen/SKILL.md; smark-connect-app/vendor/skill-repositories/claude-seo-main/extensions/banana/skills/seo-image-gen/SKILL.md
- claude-seo-main/extensions/bing-webmaster/skills/seo-bing/SKILL.md; document-framework-push/vendor/skill-repositories/claude-seo-main/extensions/bing-webmaster/skills/seo-bing/SKILL.md; smark-connect-app/vendor/skill-repositories/claude-seo-main/extensions/bing-webmaster/skills/seo-bing/SKILL.md
- claude-seo-main/extensions/dataforseo/skills/seo-dataforseo/SKILL.md; document-framework-push/vendor/skill-repositories/claude-seo-main/extensions/dataforseo/skills/seo-dataforseo/SKILL.md; smark-connect-app/vendor/skill-repositories/claude-seo-main/extensions/dataforseo/skills/seo-dataforseo/SKILL.md
- claude-seo-main/extensions/firecrawl/skills/seo-firecrawl/SKILL.md; document-framework-push/vendor/skill-repositories/claude-seo-main/extensions/firecrawl/skills/seo-firecrawl/SKILL.md; smark-connect-app/vendor/skill-repositories/claude-seo-main/extensions/firecrawl/skills/seo-firecrawl/SKILL.md
- claude-seo-main/extensions/profound/skills/seo-profound/SKILL.md; document-framework-push/vendor/skill-repositories/claude-seo-main/extensions/profound/skills/seo-profound/SKILL.md; smark-connect-app/vendor/skill-repositories/claude-seo-main/extensions/profound/skills/seo-profound/SKILL.md

## Overlapping deliverables

- **Company and Product Intelligence:** Own the combined company and product source of truth: company facts, offer hierarchy, positioning, use cases, proof, brand voice, packaging, pricing evidence, objections and sales narratives. Separate evidence from hypotheses and validation gaps.
- **Content Audit and Full-Funnel Strategy:** Own the existing content inventory and the full-funnel response: coverage, quality, keep/refresh/consolidate decisions, gaps, pillars, topics, briefs, distribution, repurposing, calendar, owners, KPIs and refresh triggers. Do not repeat the same inventory in the future plan.
- **Competitive Landscape and Comparison Playbook:** Own the sourced competitive landscape and the implementation-ready comparison playbook: alternatives, comparable attributes, whitespace, page architecture, feature matrices and defensible conversion copy. Never invent migration guarantees or private performance.
- **Strategic Intelligence Report:** Own cross-channel choices, tradeoffs, dependencies and measurement. Cite supplied specialist findings and resolve contradictions; do not concatenate or repeat specialist reports.
- **Topic Cluster & Pillar Architecture:** Own pillar-to-page relationships, search intent and internal links. Hand publication scheduling to Content Strategy.
- **Social Batch Publishing Plan and Agent Pack:** Own dated or relative-day social posts, full drafts and production status. Reuse supplied strategy instead of repeating audience and pillar research.
- **Short-Form Video and UGC Agent Blueprint:** Own short-form scripts, creator briefs, shot plans, rights and disclosure checks, and repurposing notes.

The company/product, content audit/strategy, and competitive research/comparison pairs now have one canonical document each. Social and UGC agents remain available as execution tools, while their capabilities are included in the corresponding merged document definitions. The three retired document names remain database enum values and resolve to their canonical document for existing saved reports.

## Format coverage

All registered document types have explicit format profiles. XLSX-first plans expose workbooks regardless of how many keywords or rows the model happens to return. Off-page SEO preserves its existing Excel-only contract. Every other type offers PDF.

| Document | Recommended | Available from empty input |
|---|---|---|
| Company and Product Intelligence | PDF | PDF, PPTX |
| SEO Audit | PDF | PDF, PPTX, XLSX |
| GEO and AI Visibility Audit | PDF | PDF, PPTX, XLSX |
| Competitive Landscape and Comparison Playbook | PDF | PDF, PPTX |
| Audience and ICP Research | PDF | PDF, PPTX |
| Content Audit and Full-Funnel Strategy | XLSX | PDF, PPTX, XLSX |
| Strategic Intelligence Report | PDF | PDF, PPTX |
| Brand and Visual Design Guide | PPTX | PDF, PPTX |
| Landing Page & Hero CRO Audit | PDF | PDF, PPTX |
| Onboarding & Activation Audit | PDF | PDF, PPTX |
| A/B Testing & Experimentation Roadmap | XLSX | PDF, XLSX |
| Topic Cluster & Pillar Architecture | XLSX | PDF, XLSX |
| Programmatic SEO (pSEO) Blueprint | XLSX | PDF, XLSX |
| Off-Page SEO Strategy & Execution Workbook | XLSX | XLSX |
| Local SEO & Google Business Profile Audit | PDF | PDF, PPTX, XLSX |
| Cold Outbound & Account-Based Playbook | PDF | PDF, PPTX |
| Email Lifecycle & Lead Nurture Architecture | PDF | PDF, PPTX |
| Lead Magnet & Free Tool Strategy | PDF | PDF, PPTX |
| Multi-Channel Paid Ads Playbook | XLSX | PDF, XLSX |
| Social Batch Publishing Plan and Agent Pack | XLSX | PDF, XLSX |
| Short-Form Video and UGC Agent Blueprint | PDF | PDF, PPTX |
| Brand Storytelling & Founder Thought Leadership | PDF | PDF, PPTX |
| Analytics Tracking & Attribution Blueprint | XLSX | PDF, XLSX |

Optional workbooks for narrative reports can become available when structured operational data is present.

## Quality changes

- Complete governing skill files and final quality steps reach the model. Supplemental references that do not fit the context target are identified as omitted, and manifest character counts describe the actual supplied text. Complete skill files can exceed the soft context target; monitor provider context limits and token usage.
- Per-document instructions require distinct scope, complete working tables, stable record IDs, evidence beside claims, explicit unknowns, accountable actions and readable sections.
- Recommendation sources come from actual inline citations. Uncited actions stay uncited. Dates and list numbers no longer become headline KPI cards; proposed targets are excluded from measured metrics. Presentations no longer attach unrelated recommendations to a finding.
- Workbooks create configured sheets, retain complete drafts, use typed dates and values, freeze/filter tables, size wrapped rows, repeat printed headers and use formula-driven status progress. Missing datasets are labelled unavailable. Internal artifact-manifest and redundant lineage tabs are removed; action evidence is visible in the tracker.
- Newly generated research appendices retain the captured page inventory without repeating every captured excerpt and then every source URL a second time. Existing stored document bodies are preserved.
- PDFs include every referenced source, use clickable links, and label references accurately without claiming automatic verification. Unused static chart templates containing fabricated fixed metrics have been removed.
- The document workspace recommends the intended format, keeps downloads reachable on small screens, shows download failures, and uses an indeterminate PDF preparation state rather than simulated progress percentages.

## Validation and scope

Run pnpm documents:audit for an updated filesystem inventory. Run pnpm test, pnpm typecheck, pnpm skills:validate and pnpm artifacts:qa for functional and export checks. Detailed duplicate paths are written to tmp/document-system-audit.json.

Changes are in smark-connect-app. No saved customer documents, database records, sibling app checkout or original skill repositories were deleted or regenerated. Export improvements apply to existing content immediately; improved authored content requires a future generation or edit with the new contracts. Representative exports can be checked without a live AI provider; those fixtures do not prove the quality of future model responses.
