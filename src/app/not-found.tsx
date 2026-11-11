import Link from "next/link";
export default function NotFound() {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-3"><div className="text-lg">Nicht gefunden.</div><Link className="btn btn-ghost" href="/">Command Center</Link></div>;
}
