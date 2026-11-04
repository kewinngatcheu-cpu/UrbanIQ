import { LanguageSwitch } from "@/components/language-switch";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const tr = await getT();
  return (
    <div className="bg-one-gradient relative flex min-h-screen flex-col overflow-x-clip">
      <div className="pointer-events-none absolute left-1/2 top-10 size-[520px] -translate-x-1/2 rounded-full bg-sky/40 blur-3xl" />
      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label={tr("ONE home")}><Logo /></Link>
        <LanguageSwitch />
      </header>
      <main className="relative flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:items-center sm:pt-0">{children}</main>
    </div>
  );
}
