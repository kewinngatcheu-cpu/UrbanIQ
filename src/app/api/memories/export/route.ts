import { api } from "@/lib/http";
import { exportAll } from "@/lib/memory/service";
import { audit } from "@/lib/audit";

export const GET = api(async () => {
  const data = await exportAll();
  await audit({ actor: "owner", action: "data.export", level: 1, details: { memories: data.memories.length } });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="jarvis-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
