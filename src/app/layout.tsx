import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/i18n";
import { PwaRegister } from "@/components/pwa";

export const metadata: Metadata = {
  title: { default: "ONE — Your Life. Your Business. One Intelligent System.", template: "%s · ONE" },
  description: "ONE Personal organises your life, ONE Business organises your company — memory, tasks, projects and an AI assistant that shows its sources.",
  applicationName: "ONE",
  appleWebApp: { capable: true, title: "ONE", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

const TZ_SCRIPT = `try{var t=Intl.DateTimeFormat().resolvedOptions().timeZone;if(t&&document.cookie.indexOf("one_tz="+encodeURIComponent(t))<0){document.cookie="one_tz="+encodeURIComponent(t)+"; path=/; max-age=31536000; samesite=lax"}}catch(e){}`;

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Store the browser timezone early so server-rendered dates match local time (static, no user input). */}
        <script dangerouslySetInnerHTML={{ __html: TZ_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-white">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
