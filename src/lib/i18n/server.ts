import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, isLocale, makeT, type Locale } from "./index";

/** The viewer's language: cookie first, then the browser's Accept-Language, then English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^\s*de\b/i.test(accept) ? "de" : "en";
});

export async function getT() {
  return makeT(await getLocale());
}
