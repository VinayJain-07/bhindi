import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  extractSourceContent,
  MAX_SOURCE_FILES_PER_UPLOAD,
  sourceTypeForFilename,
} from "@/lib/sources/content";

export const runtime = "nodejs";

function serializeSource(source: {
  id: string;
  title: string;
  sourceType: string;
  content: string;
  createdAt: Date;
}) {
  return {
    id: source.id,
    title: source.title,
    sourceType: source.sourceType,
    characterCount: source.content.length,
    createdAt: source.createdAt.toISOString(),
  };
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to add source documents." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ error: "Upload one or more source documents." }, { status: 400 });
  const companyId = formData.get("companyId");
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);
  if (typeof companyId !== "string" || !companyId) return Response.json({ error: "Choose a company for these sources." }, { status: 400 });
  if (!files.length) return Response.json({ error: "Choose at least one source document." }, { status: 400 });
  if (files.length > MAX_SOURCE_FILES_PER_UPLOAD) return Response.json({ error: `Upload up to ${MAX_SOURCE_FILES_PER_UPLOAD} files at a time.` }, { status: 400 });

  const company = await db.company.findFirst({ where: { id: companyId, userId: user.id }, select: { id: true } });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });

  try {
    const extracted = await Promise.all(files.map(async (file) => ({
      title: file.name.slice(0, 240),
      sourceType: sourceTypeForFilename(file.name),
      content: await extractSourceContent(file),
    })));
    const sources = await db.$transaction(extracted.map((source) => db.chatAttachment.create({
      data: {
        companyId: company.id,
        userId: user.id,
        sourceType: source.sourceType,
        title: source.title,
        content: source.content,
        remembered: true,
      },
    })));
    return Response.json({ sources: sources.map(serializeSource) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The source documents could not be read." }, { status: 400 });
  }
}
