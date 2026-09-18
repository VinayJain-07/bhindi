import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function DELETE(_request: Request, context: { params: Promise<{ sourceId: string }> }) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to remove a source document." }, { status: 401 });
  const { sourceId } = await context.params;
  const source = await db.chatAttachment.findFirst({
    where: { id: sourceId, userId: user.id, company: { userId: user.id } },
    select: { id: true },
  });
  if (!source) return Response.json({ error: "Source document not found." }, { status: 404 });
  await db.chatAttachment.delete({ where: { id: source.id } });
  return Response.json({ removed: true });
}
