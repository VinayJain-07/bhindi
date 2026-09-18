import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { resolveArtifactManifest } from "../src/lib/artifacts/config";
import { buildReportDataModel } from "../src/lib/artifacts/model";
import { createExecutivePptx } from "../src/lib/documents/pptx";
import { createBrandedXlsx } from "../src/lib/documents/xlsx";
import { createBrandedPdf } from "../src/lib/documents/pdf";

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const markdown = `# SEO Audit

## Executive summary

Technical SEO health is constrained by a small set of template-level risks. The evidence pack includes 24 captured URLs and three high-priority recommendations. https://example.com/technical-audit

## Technical findings

The canonical implementation creates inconsistent signals across repeated templates. High confidence: the pattern appears in captured HTML and should be confirmed in the rendered DOM.

| URL | Issue | Severity | Owner | Status |
|---|---|---|---|---|
| https://example.com/a | Canonical mismatch | High | SEO | Open |
| https://example.com/b | Missing description | Medium | Content | Open |

## Recommendations

- High priority: correct canonical generation at the template layer and validate five representative URLs.
- Medium priority: assign metadata ownership and publish a weekly exception report.
- Add a due date, status, and falsifiable success check to every backlog item.

## Methodology and sources

The audit uses captured public HTML and does not claim rankings, traffic, or field Core Web Vitals. https://example.com/methodology`;

async function main() {
  const manifest = resolveArtifactManifest({ reportType: "SEO_AUDIT", markdown });
  const model = buildReportDataModel({ reportType: "SEO_AUDIT", companyName: "Smark QA Company", companyWebsite: "https://example.com", title: "SEO Audit", markdown, updatedAt: new Date("2026-08-29T00:00:00Z"), sourceCount: 2, manifest });
  const [pptx, xlsx] = await Promise.all([
    createExecutivePptx({ model, manifest }),
    createBrandedXlsx({ companyName: model.company.name, title: model.title, markdown, updatedAt: new Date(model.reportPeriod.updatedAt), sourceCount: model.sources.length, reportModel: model, manifest }),
  ]);
  const pdf = await createBrandedPdf({ companyName: model.company.name, companyWebsite: model.company.website, title: model.title, documentType: model.reportType, markdown, updatedAt: new Date(model.reportPeriod.updatedAt), sourceCount: model.sources.length, reportModel: model, manifest });
  check(pptx.subarray(0, 2).toString() === "PK", "PPTX does not have a ZIP/OOXML signature.");
  check(pptx.length > 40_000, "PPTX is unexpectedly small.");
  check(xlsx.subarray(0, 2).toString() === "PK", "XLSX does not have a ZIP/OOXML signature.");
  check(pdf.subarray(0, 4).toString() === "%PDF", "PDF does not have a PDF signature.");
  check(pdf.length > 50_000, "PDF is unexpectedly small.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(xlsx as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const tracker = workbook.getWorksheet("05_Priority_Backlog");
  check(manifest.requiredSheets.every((name) => workbook.getWorksheet(name)), "Workbook is missing configured sheets.");
  check(tracker, "Workbook is missing the action tracker.");
  check(tracker.views[0]?.state === "frozen", "Action tracker headers are not frozen.");
  check(tracker.getCell("A6").value === "SEO-001", "Recommendation IDs are not preserved in the action tracker.");
  check(typeof tracker.getCell("I6").value === "object" && tracker.getCell("I6").formula?.includes("IF"), "Priority score is not formula-driven.");
  check(tracker.getCell("H6").value === "" || tracker.getCell("H6").value === null, "Uncited recommendations must not be assigned unrelated source URLs.");
  let formulaErrors = 0;
  workbook.eachSheet((sheet) => sheet.eachRow((row) => row.eachCell((cell) => {
    if (typeof cell.value === "string" && /^#(?:REF!|DIV\/0!|VALUE!|NAME\?|N\/A)$/.test(cell.value)) formulaErrors += 1;
  })));
  check(formulaErrors === 0, "Workbook contains formula errors.");

  const outputDirectory = path.resolve("tmp", "artifact-orchestrator-qa");
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDirectory, "seo-audit-executive.pptx"), pptx),
    writeFile(path.join(outputDirectory, "seo-audit-working.xlsx"), xlsx),
    writeFile(path.join(outputDirectory, "seo-audit-report.pdf"), pdf),
    writeFile(path.join(outputDirectory, "report-data-model.json"), JSON.stringify({ manifest, model }, null, 2)),
  ]);
  process.stdout.write(JSON.stringify({ outputDirectory, pdfBytes: pdf.length, pptxBytes: pptx.length, workbookSheets: workbook.worksheets.map((sheet) => sheet.name), recommendations: model.recommendations.map((item) => item.id) }, null, 2));
}

void main();
