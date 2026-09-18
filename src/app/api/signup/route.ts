import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128).regex(/[A-Za-z]/, "Password needs a letter").regex(/[0-9]/, "Password needs a number"),
});

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check your account details." }, { status: 400 });
  try {
    const existing = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (existing) return Response.json({ error: "An account already exists for this email." }, { status: 409 });
    await db.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hash(parsed.data.password, 12) } });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Signup failed", error);
    return Response.json({ error: "The account could not be created. Check the database connection and server logs." }, { status: 500 });
  }
}
