import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createVisualReport } from "../src/lib/documents/pdf";

const profiles = [
  ["COMPANY_INTELLIGENCE", "Company and Product Intelligence"],
  ["SEO_AUDIT", "SEO Audit"],
  ["GEO_AUDIT", "GEO and AI Visibility Audit"],
  ["COMPETITOR_ANALYSIS", "Competitive Landscape and Comparison Playbook"],
  ["AUDIENCE_ANALYSIS", "Audience and ICP Research"],
  ["CONTENT_AUDIT", "Content Audit and Full-Funnel Strategy"],
  ["MARKETING_STRATEGY", "Integrated Marketing Strategy"],
  ["DESIGN_GUIDE", "Brand and Visual Design Guide"],
  ["SOCIAL_BATCH_PLAN", "Social Batch Publishing Plan and Agent Pack"],
  ["SHORT_FORM_VIDEO_BLUEPRINT", "Short-Form Video and UGC Agent Blueprint"],
] as const;

function sampleMarkdown(title: string) {
  return `# ${title}

## Executive recommendation

The evidence suggests the highest-leverage move is to clarify the decision system before adding activity. This sample intentionally uses qualitative evidence and validation gates rather than invented performance.

## Observed foundation

The current material establishes a credible starting point, but the relationship between promise, proof, audience need, and next action is not yet consistently visible.

| Signal | Observed evidence | Decision implication |
|---|---|---|
| Promise | A clear outcome is stated | Connect it to a sharper customer job |
| Proof | Several proof forms are available | Match proof to the risk it resolves |
| Path | More than one next step appears | Reduce choice at the highest-friction moment |
| Learning | Validation is not yet systematic | Define a decision gate before scaling |

## Decision pathway

1. Establish the most consequential evidence gap.
2. Reframe the issue around the buyer or operator decision.
3. Test the smallest useful intervention.
4. Scale only after the evidence changes confidence.

## Priority portfolio

| Action | Impact | Effort | Validation |
|---|---|---|---|
| Clarify the organizing idea | High | Low | Five buyer or stakeholder reviews |
| Align proof to decision risk | High | Medium | Objection and conversion review |
| Simplify the next-step path | Medium | Low | Task-completion observation |
| Expand production | Medium | High | Only after earlier gates pass |

## Strategic tension

The important choice is not between doing more or less. It is between disconnected activity and a system in which every artifact earns confidence for the next decision.

## Validation plan

- Name the assumption that would make the recommendation wrong.
- Choose one observable signal that can change confidence.
- Assign an owner and a review date.
- Preserve the source and decision trail.

## Recommendations

Start with the decision architecture, resolve the most expensive uncertainty, and use the resulting evidence to determine what deserves scale.`;
}

async function main() {
  const outputDirectory = path.join(process.cwd(), "tmp", "pdfs", "document-profile-qa");
  await mkdir(outputDirectory, { recursive: true });
  const receipts = [];
  const selectedProfiles = process.env.QA_DOCUMENT_TYPE ? profiles.filter(([documentType]) => documentType === process.env.QA_DOCUMENT_TYPE) : profiles;
  if (!selectedProfiles.length) throw new Error(`Unknown QA_DOCUMENT_TYPE: ${process.env.QA_DOCUMENT_TYPE}`);
  for (const [documentType, title] of selectedProfiles) {
    const result = await createVisualReport({ companyName: "Smark Connect Quality Assurance Company With a Deliberately Long Name", companyWebsite: "https://example.com", companyCategory: "B2B marketing technology", companyBrief: "Smark Connect Quality Assurance Company With a Deliberately Long Name is a B2B marketing technology company. Its public website is example.com. This analysis evaluates its current digital presence, performance, visibility, and opportunities for improvement.", skills: [{ repository: "claude-seo-main", skill: "technical-seo-audit", phase: "Evidence review", reason: "Inspect technical constraints and order remediation dependencies." }, { repository: "openclaw-marketing-skills-main", skill: "content-strategy", phase: "Decision synthesis", reason: "Connect evidence to an actionable editorial system." }], title, documentType, markdown: sampleMarkdown(title), updatedAt: new Date("2026-08-29T00:00:00Z"), sourceCount: 7 });
    const filename = `${documentType.toLowerCase()}.pdf`;
    await writeFile(path.join(outputDirectory, filename), result.pdf);
    await writeFile(path.join(outputDirectory, filename.replace(/\.pdf$/, ".html")), result.html);
    if ((result.qa.final.visualSectionShare ?? 0) < 30) throw new Error(`${documentType} failed visual coverage QA.`);
    receipts.push({ documentType, file: filename, ...result.qa.final });
  }
  process.stdout.write(`${JSON.stringify({ outputDirectory, receipts }, null, 2)}\n`);
}

void main();
