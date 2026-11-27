import { notFound } from "next/navigation";
import Image from "next/image";
import { getContext } from "@/lib/server/service";
import { imageUrl } from "@/lib/destinations/images";
import { Divider, FadeIn, LinkButton, Wordmark } from "@/components/ui";
import { SharedStatus } from "@/components/participant/shared-status";

export const dynamic = "force-dynamic";

export default async function ParticipantHome({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ sent?: string }> }) {
  const { token } = await params;
  const { sent } = await searchParams;
  const ctx = await getContext(token);
  if (!ctx) notFound();

  return (
    <main className="min-h-dvh">
      <div className="relative h-[42svh] min-h-72 overflow-hidden bg-sea-deep">
        <Image src={imageUrl(ctx.status === "submitted" ? "oia" : "lindos", 1800)} alt="" fill priority sizes="100vw" className="object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-sea-deep/40 via-transparent to-ivory" />
        <div className="relative mx-auto max-w-3xl px-5 pt-6 sm:px-8">
          <Wordmark light />
        </div>
      </div>

      <div className="relative mx-auto -mt-24 max-w-3xl px-5 pb-24 sm:px-8">
        <FadeIn>
          <p className="eyebrow text-sand-deep">Private access · {ctx.name}</p>
          <h1 className="mt-4 font-display text-5xl font-light leading-[1.02] sm:text-6xl">
            {ctx.status === "submitted" ? (
              sent ? (
                <>
                  Thank you, {ctx.name}. <span className="italic">Your perspective is safe.</span>
                </>
              ) : (
                <>
                  Welcome back, <span className="italic">{ctx.name}.</span>
                </>
              )
            ) : (
              <>
                Hi {ctx.name}. <span className="italic">Your summer starts here.</span>
              </>
            )}
          </h1>
        </FadeIn>

        <div className="mt-10 grid gap-6">
          {ctx.phase === "setup" && ctx.status !== "submitted" && (
            <FadeIn>
              <div className="rounded-[2rem] border border-line bg-white/60 p-7 sm:p-10">
                <p className="eyebrow text-sand-deep">Coming soon</p>
                <h2 className="mt-3 font-display text-3xl font-light">Your escape opens soon.</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Die Umfrage ist vorbereitet und wird in Kürze freigeschaltet. Dieser Link bleibt gültig – speichere ihn dir am besten als
                  Lesezeichen oder auf dem Home-Bildschirm.
                </p>
                <LinkButton href="/demo" variant="outline" className="mt-7">
                  Demo mit Beispieldaten
                </LinkButton>
              </div>
            </FadeIn>
          )}

          {ctx.phase === "live" && ctx.status !== "submitted" && (
            <FadeIn>
              <div className="rounded-[2rem] border border-line bg-white/60 p-7 sm:p-10">
                <p className="eyebrow text-sand-deep">{ctx.status === "draft" ? "In progress" : "15 questions · ca. 7 minutes"}</p>
                <h2 className="mt-3 font-display text-3xl font-light">
                  {ctx.status === "draft" ? "Pick up where you left off." : "Two perspectives. Yours comes first."}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Deine Antworten sind nur für dich sichtbar und werden verschlüsselt gespeichert. Bis zum Abschicken kannst du alles ändern.
                </p>
                <LinkButton href={`/p/${token}/survey`} className="mt-7">
                  {ctx.status === "draft" ? "Continue survey" : "Start the survey"}
                </LinkButton>
              </div>
            </FadeIn>
          )}

          {ctx.status === "submitted" && (
            <>
              <FadeIn>
                <div className="rounded-[2rem] border border-line bg-white/60 p-7 sm:p-10">
                  <p className="eyebrow text-sand-deep">Only for you</p>
                  <h2 className="mt-3 font-display text-3xl font-light">Your private travel profile</h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    Deine drei persönlich passendsten Reiseziele – nur über deinen Link erreichbar, niemals in der gemeinsamen Auswertung.
                  </p>
                  <LinkButton href={`/p/${token}/profile`} variant="outline" className="mt-7">
                    See my top 3
                  </LinkButton>
                </div>
              </FadeIn>
              <FadeIn delay={0.1}>
                <SharedStatus token={token} initialReady={ctx.sharedReady} />
              </FadeIn>
            </>
          )}
        </div>

        <Divider className="my-14" />
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-ink-soft">
          <a href="/explore" className="underline-offset-4 hover:underline">
            Destination Atlas →
          </a>
          <span className="text-xs">Tipp: Teilen → „Zum Home-Bildschirm“ für schnellen Zugriff.</span>
        </div>
      </div>
    </main>
  );
}
