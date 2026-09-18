import { z } from "zod";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const schema = z.object({ tokenBudget: z.coerce.number().int().min(0).max(20_000_000) });

export async function PUT(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to update the token limit." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a whole-number token limit between 0 and 20,000,000." }, { status: 400 });
  const updated = await db.user.update({ where: { id: user.id }, data: { tokenBudget: parsed.data.tokenBudget }, select: { tokenBudget: true, tokenUsed: true } });
  return Response.json(updated);
}
