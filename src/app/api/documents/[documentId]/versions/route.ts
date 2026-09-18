import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to view document history." }, { status: 401 });
  const { documentId } = await context.params;
  const document = await db.document.findFirst({
    where: { id: documentId, company: { userId: user.id } },
    select: { id: true, version: true, versions: { orderBy: { version: "desc" }, select: { id: true, version: true, editPrompt: true, editMode: true, tokenEstimate: true, createdAt: true } } },
  });
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
  return Response.json({ currentVersion: document.version, versions: document.versions.map((version) => ({ ...version, createdAt: version.createdAt.toISOString() })) });
}
