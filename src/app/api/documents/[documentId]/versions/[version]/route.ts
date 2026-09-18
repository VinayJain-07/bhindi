import { z } from "zod";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { withoutSkillProvenance } from "@/lib/documents/public";

const versionSchema = z.coerce.number().int().positive();

export async function POST(_request: Request, context: { params: Promise<{ documentId: string; version: string }> }) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to restore a document version." }, { status: 401 });
  const { documentId, version: rawVersion } = await context.params;
  const version = versionSchema.safeParse(rawVersion);
  if (!version.success) return Response.json({ error: "Choose a valid document version." }, { status: 400 });
  const document = await db.document.findFirst({ where: { id: documentId, company: { userId: user.id } }, select: { id: true, locked: true } });
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
  if (document.locked) return Response.json({ error: "Unlock this document before restoring a version." }, { status: 409 });

  const restored = await db.$transaction(async (tx) => {
    const current = await tx.document.findUnique({ where: { id: document.id } });
    if (!current || current.locked) throw new Error("This document was locked while the restore was running. The original was preserved.");
    const snapshot = await tx.documentVersion.findUnique({ where: { documentId_version: { documentId: current.id, version: version.data } } });
    if (!snapshot) throw new Error("That historical version is no longer available.");
    await tx.documentVersion.create({ data: { documentId: current.id, version: current.version, contentMarkdown: current.contentMarkdown, editPrompt: `Restored version ${snapshot.version}`, editMode: "restore", tokenEstimate: current.tokenEstimate } });
    return tx.document.update({ where: { id: current.id }, data: { contentMarkdown: snapshot.contentMarkdown, tokenEstimate: snapshot.tokenEstimate, version: { increment: 1 }, metadata: { ...((current.metadata as Record<string, unknown> | null) ?? {}), lastRestoredVersion: snapshot.version, restoredAt: new Date().toISOString() } } });
  });
  const safeDocument = withoutSkillProvenance(restored);
  return Response.json({ document: { ...safeDocument, createdAt: restored.createdAt.toISOString(), updatedAt: restored.updatedAt.toISOString() } });
}
