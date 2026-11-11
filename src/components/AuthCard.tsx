import { JarvisCore } from "./JarvisCore";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <JarvisCore size={120} />
          <h1 className="mt-4 text-xl font-semibold tracking-[.25em]">JARVIS</h1>
          <div className="mt-1 text-sm text-muted">{subtitle}</div>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 text-base font-medium">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
