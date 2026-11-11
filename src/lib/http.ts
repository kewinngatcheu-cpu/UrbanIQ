import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE, validateSessionToken } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/memory/service";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** CSRF defence for cookie-authenticated mutations: the Origin header must match the Host. */
function checkOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) throw new HttpError(403, "Ungültige Herkunft der Anfrage.");
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Wraps an API handler with authentication, CSRF check and uniform error responses. */
export function api<C = unknown>(handler: Handler<C>, opts: { public?: boolean } = {}): Handler<C> {
  return async (req, ctx) => {
    try {
      checkOrigin(req);
      if (!opts.public) {
        const ok = await validateSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
        if (!ok) throw new HttpError(401, "Nicht angemeldet.");
      }
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: "Ungültige Eingabe.", issues: e.issues }, { status: 400 });
      if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Interner Fehler" }, { status: 500 });
    }
  };
}

export async function readJson(req: NextRequest, maxBytes = 200_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Anfrage zu groß.");
  try { return text ? JSON.parse(text) : {}; } catch { throw new HttpError(400, "Ungültiges JSON."); }
}

export const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
