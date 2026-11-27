import { adminConfigured, isAdmin } from "@/lib/server/admin-auth";
import { adminOverview } from "@/lib/server/service";
import { isEphemeralStorage } from "@/lib/server/store";
import { isUsingDevSecret } from "@/lib/server/crypto";
import { AdminLogin, AdminPanel } from "@/components/admin/admin-panel";
import { Wordmark } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Our Summer Escape 2027" };

export default async function AdminPage() {
  const configured = adminConfigured();
  const authed = configured && (await isAdmin());
  const warnings: string[] = [];
  if (isUsingDevSecret()) warnings.push("APP_SECRET ist nicht gesetzt – es wird ein unsicherer Entwicklungs-Schlüssel verwendet. Vor dem echten Start unbedingt setzen.");
  if (authed && isEphemeralStorage()) warnings.push("Kein Supabase konfiguriert: Daten liegen nur temporär auf dem Server und können verloren gehen. Für den echten Start Supabase einrichten (README).");

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Wordmark />
        <span className="eyebrow !text-[0.58rem] text-ink-soft">Admin</span>
      </header>
      <h1 className="mt-14 font-display text-5xl font-light">
        Control <span className="italic">room.</span>
      </h1>
      {warnings.map((w) => (
        <p key={w} className="mt-6 rounded-2xl bg-champagne/50 px-4 py-3 text-sm">
          ⚠️ {w}
        </p>
      ))}
      {!configured ? (
        <div className="mt-10 rounded-[1.6rem] border border-line bg-white/60 p-6 text-sm leading-relaxed">
          <p className="font-semibold">Admin ist noch nicht eingerichtet.</p>
          <p className="mt-2 text-ink-soft">
            Setze die Umgebungsvariable <code className="rounded bg-mist px-1.5">ADMIN_PASSWORD</code> (mind. 10 Zeichen) – lokal in{" "}
            <code className="rounded bg-mist px-1.5">.env.local</code>, auf Vercel unter Project → Settings → Environment Variables. Details im README.
          </p>
        </div>
      ) : authed ? (
        <AdminPanel initial={await adminOverview()} />
      ) : (
        <AdminLogin />
      )}
    </main>
  );
}
