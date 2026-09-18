import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "healthy", database: "connected" });
  } catch {
    return Response.json({ status: "unhealthy", database: "disconnected" }, { status: 503 });
  }
}
