import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/config/env";
import { supabaseServiceClient } from "@/lib/supabase/server";

/**
 * File storage. Local: files under <dataDir>/uploads/<userId>/...
 * Supabase: private bucket "documents", object path "<userId>/<file>" (Storage RLS restricts to owner).
 * Callers must only pass storage paths read from the user's own `documents` rows.
 */
const BUCKET = "documents";

function localPath(storagePath: string) {
  const root = path.resolve(process.cwd(), env.dataDir, "uploads");
  const full = path.resolve(root, storagePath);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage path");
  return full;
}

export async function putFile(storagePath: string, data: Buffer, contentType: string) {
  if (env.backend === "supabase") {
    const { error } = await supabaseServiceClient().storage.from(BUCKET).upload(storagePath, data, { contentType, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return;
  }
  const file = localPath(storagePath);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

export async function getFile(storagePath: string): Promise<Buffer | null> {
  if (env.backend === "supabase") {
    const { data, error } = await supabaseServiceClient().storage.from(BUCKET).download(storagePath);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  try {
    return await fs.readFile(localPath(storagePath));
  } catch {
    return null;
  }
}

export async function deleteFiles(paths: string[]) {
  if (!paths.length) return;
  if (env.backend === "supabase") {
    await supabaseServiceClient().storage.from(BUCKET).remove(paths);
    return;
  }
  await Promise.all(paths.map((p) => fs.rm(localPath(p), { force: true })));
}
