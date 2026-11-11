import { requireOwner } from "@/lib/auth/guard";
import { listWorkspaces } from "@/lib/workspaces";
import { ChatClient } from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  await requireOwner();
  const workspaces = await listWorkspaces();
  return <ChatClient workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, color: w.color }))} />;
}
