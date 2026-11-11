import { requireOwner } from "@/lib/auth/guard";
import { listWorkspaces } from "@/lib/workspaces";
import { VoiceClient } from "./VoiceClient";

export const dynamic = "force-dynamic";

export default async function VoicePage() {
  const owner = await requireOwner();
  const ws = await listWorkspaces();
  return <VoiceClient ownerName={owner.display_name} workspaces={ws.map((w) => ({ id: w.id, name: w.name, color: w.color }))} />;
}
