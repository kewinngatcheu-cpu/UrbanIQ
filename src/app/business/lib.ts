import "server-only";
import { systemDb } from "@/lib/db";
import type { OrgContext } from "@/lib/org";

/** Active members with display names (account metadata only). */
export async function membersOf(ctx: OrgContext) {
  const sys = systemDb();
  const members = await sys.select("organization_members", { where: { org_id: ctx.org.id, status: "active" } });
  const profiles = members.length ? await sys.select("profiles", { whereIn: { column: "id", values: members.map((m) => m.user_id) } }) : [];
  return members.map((m) => {
    const p = profiles.find((x) => x.id === m.user_id);
    return { ...m, name: p?.full_name || p?.email || "—", email: p?.email ?? "" };
  });
}

export type MemberInfo = Awaited<ReturnType<typeof membersOf>>[number];

export function nameOf(members: MemberInfo[], id: string | null | undefined) {
  return members.find((m) => m.user_id === id)?.name ?? null;
}
