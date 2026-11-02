"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "./index";

export async function setLanguage(form: FormData) {
  const lang = form.get("lang");
  if (!isLocale(lang)) return;
  (await cookies()).set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
