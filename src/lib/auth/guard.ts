import "server-only";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { isAuthenticated } from "./session";

/**
 * Call at the top of EVERY protected page. Layouts render in parallel with pages in the App Router,
 * so a layout-only check would not stop a page's data access. (API routes are guarded by api().)
 */
export async function requireOwner(): Promise<{ display_name: string }> {
  const db = await getDb();
  const [owner] = await db.query<{ display_name: string }>(`SELECT display_name FROM owner`);
  if (!owner) redirect("/setup");
  if (!(await isAuthenticated())) redirect("/login");
  return owner;
}
