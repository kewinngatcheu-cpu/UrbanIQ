import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/config/env";

/** Supabase client bound to the current user's session cookies (RLS applies). */
export async function supabaseUserClient(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component — cookies are refreshed by middleware instead.
        }
      },
    },
  });
}

let service: SupabaseClient | null = null;
/** Service-role client — bypasses RLS. Server-only. Use exclusively for system & owner-admin code paths. */
export function supabaseServiceClient(): SupabaseClient {
  if (!service) {
    service = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return service;
}
