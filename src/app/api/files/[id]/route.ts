import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { userDb, systemDb } from "@/lib/db";
import { getFile } from "@/lib/storage";

/**
 * Streams a document: personal files only to their owner (user-scoped query), company files only
 * to active members of that (active) company. Everyone else gets 404.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "active" || !user.email_verified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await userDb(user.id);
  let doc = await db.get("documents", id);
  if (!doc && user.account_type === "business") {
    const sys = systemDb();
    const candidate = await sys.selectOne("documents", { id });
    if (candidate?.org_id) {
      const [member, org] = await Promise.all([
        sys.selectOne("organization_members", { org_id: candidate.org_id, user_id: user.id, status: "active" }),
        sys.selectOne("organizations", { id: candidate.org_id }),
      ]);
      if (member && org?.status === "active") doc = candidate;
    }
  }
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await getFile(doc.storage_path);
  if (!data) return NextResponse.json({ error: "File missing" }, { status: 404 });
  const inline = req.nextUrl.searchParams.get("download") !== "1" && /^(application\/pdf|image\/(png|jpe?g|webp|gif)|text\/plain|audio\/)/.test(doc.mime_type);
  // HTML / other types are always served as downloads to prevent script execution in our origin.
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": inline ? doc.mime_type : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(doc.file_name)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(doc.mime_type === "application/pdf" ? {} : { "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox" }),
    },
  });
}
