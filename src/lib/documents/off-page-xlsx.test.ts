import ExcelJS from "exceljs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOffPageSeoXlsx, MASTER_WORKFLOW_RESOURCES } from "./off-page-xlsx";

vi.mock("server-only", () => ({}));

describe("off-page SEO workbook", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates the Excel-only operating workbook from validated master resources", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return new Response("", { status: 200, headers: { "Content-Type": "text/html", "X-Final-URL": url } });
    }));

    const buffer = await createOffPageSeoXlsx({
      companyName: "Example Co",
      companyWebsite: "https://example.com",
      companyCategory: "B2B software",
      title: "Off-Page SEO Strategy & Execution Workbook",
      markdown: "# Evidence-led off-page SEO",
      updatedAt: new Date("2026-09-03T00:00:00.000Z"),
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "01_Executive_Dashboard",
      "02_Strategy_On_A_Page",
      "03_Validated_Prospects",
      "04_90_Day_Roadmap",
      "05_Outreach_CRM",
      "06_Link_Earnings_Log",
      "07_Linkable_Assets",
      "08_KPI_Tracker",
      "09_Validation_Registry",
    ]);
    expect(workbook.getWorksheet("03_Validated_Prospects")?.getCell("B7").hyperlink).toMatch(/^https:\/\//);
    expect(workbook.getWorksheet("03_Validated_Prospects")?.getCell("L7").formula).toContain("SUM(G7:K7)");
    expect(workbook.getWorksheet("09_Validation_Registry")?.rowCount).toBeGreaterThanOrEqual(MASTER_WORKFLOW_RESOURCES.length + 6);
  });
});
