import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

process.loadEnvFile?.(".env.local");
const db = new PrismaClient();
const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const user = await db.user.findUnique({ where: { email: "demo@thesmarketers.com" } });
  check(user, "Demo user is not seeded.");
  const company = await db.company.findUnique({ where: { userId_normalizedDomain: { userId: user.id, normalizedDomain: "thesmarketers.com" } }, include: { documents: true } });
  check(company, "Demo company is not seeded.");
  check(company.documents.length === 6, `Expected six documents; found ${company.documents.length}.`);
  const secret = process.env.AUTH_SECRET;
  check(secret, "AUTH_SECRET is unavailable.");
  const token = await encode({ token: { sub: user.id, email: user.email, name: user.name }, secret, salt: "authjs.session-token", maxAge: 60 * 10 });
  const headers = { Cookie: `authjs.session-token=${token}` };

  const dashboard = await fetch(`${baseUrl}/dashboard/${company.id}`, { headers, redirect: "manual" });
  check(dashboard.status === 200, `Dashboard returned ${dashboard.status}.`);
  const html = await dashboard.text();
  for (const expected of ["Company Intelligence", "SEO Audit", "GEO and AI Visibility", "Competitor Analysis", "Audience Analysis", "Content Audit and Strategy", "Add agents", "Official Sources"]) {
    check(html.includes(expected), `Dashboard is missing: ${expected}`);
  }

  const seo = company.documents.find((document) => document.type === "SEO_AUDIT");
  check(seo, "SEO document is missing.");
  const pdf = await fetch(`${baseUrl}/api/documents/${seo.id}/export?format=pdf&preview=1`, { headers });
  check(pdf.status === 200 && pdf.headers.get("content-type") === "application/pdf", "PDF preview route failed.");
  check(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString() === "%PDF", "PDF response is invalid.");
  const docx = await fetch(`${baseUrl}/api/documents/${seo.id}/export?format=docx`, { headers });
  check(docx.status === 200 && docx.headers.get("content-type")?.includes("wordprocessingml"), "DOCX route failed.");
  check(Buffer.from(await docx.arrayBuffer()).subarray(0, 2).toString() === "PK", "DOCX response is invalid.");

  if (user.demoMode) {
    const agent = await fetch(`${baseUrl}/api/agents/run`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ companyId: company.id, agentType: "CAMPAIGN_PLANNER" }) });
    check(agent.status === 400 && (await agent.text()).includes("Demo Mode"), "On-demand agent guard did not respond as expected.");
  }
  process.stdout.write(`Smoke test passed: dashboard, six documents, branded exports${user.demoMode ? ", and on-demand agent control" : "; live agent execution skipped to avoid provider charges"}.\n`);
}

main().finally(() => db.$disconnect());
