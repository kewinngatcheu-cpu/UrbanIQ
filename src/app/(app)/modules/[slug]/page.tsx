import { requireOwner } from "@/lib/auth/guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_NAV, PHASE_NAMES } from "@/lib/nav";
import { Icon } from "@/components/Icon";

export default async function PlannedModule({ params }: { params: Promise<{ slug: string }> }) {
  await requireOwner();
  const { slug } = await params;
  const item = ALL_NAV.find((n) => n.slug === slug && n.status === "planned");
  if (!item) notFound();
  return (
    <div className="mx-auto max-w-2xl pt-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue/15"><Icon name={item.icon} size={28} className="text-cyan" /></div>
      <div className="label mt-5">Phase {item.phase} · {PHASE_NAMES[item.phase]}</div>
      <h1 className="mt-2 text-2xl font-semibold">{item.label}</h1>
      <p className="mt-3 text-muted">{item.summary}</p>
      <div className="card mt-6 p-4 text-sm text-muted">
        Dieses Modul ist <b className="text-fg">noch nicht gebaut</b>. JARVIS zeigt hier bewusst keine Platzhalterdaten.
        Bis dahin: Aufgaben und Notizen dazu über <code>/aufgabe</code> und <code>/merke</code> im <Link className="text-cyan underline" href="/chat">Chat</Link> erfassen.
      </div>
      <Link href="/" className="btn btn-ghost mt-6">Zurück zum Command Center</Link>
    </div>
  );
}
