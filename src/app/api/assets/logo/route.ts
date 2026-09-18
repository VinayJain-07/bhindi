import { requireApiUser } from "@/lib/auth-helpers";
import { fetchCompanyLogoAsset, resolveCompanyLogo } from "@/lib/company-logo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to view logo assets." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  let url = params.get("url")?.trim() || "";
  const website = params.get("website")?.trim() || "";
  if (!url && !website) return Response.json({ error: "A logo URL or website is required." }, { status: 400 });
  try {
    if (!url && website) {
      const websiteUrl = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
      url = await resolveCompanyLogo(websiteUrl) || "";
    }
    const asset = url ? await fetchCompanyLogoAsset(url) : null;
    if (!asset) return Response.json({ error: "The official logo could not be loaded." }, { status: 404 });
    return new Response(new Uint8Array(asset.body), { headers: { "Content-Type": asset.contentType, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "The official logo could not be loaded." }, { status: 404 });
  }
}
