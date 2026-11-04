import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exportAccountData } from "@/lib/account";
import { audit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.status !== "active") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await exportAccountData(user.id);
  await audit(user.id, "account.exported");
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="one-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
