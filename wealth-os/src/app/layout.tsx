import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FinanceProvider } from "@/components/providers";
import { MobileNav, MobileTopBar, Sidebar } from "@/components/nav";
import { DemoBanner } from "@/components/demo-banner";

export const metadata: Metadata = {
  title: "Wealth OS",
  description: "Persönliches Finanz- und Vermögenssystem",
  appleWebApp: { capable: true, title: "Wealth OS", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Theme vor dem ersten Paint setzen (Dark Mode = Standard)
const themeScript = `try{var t=localStorage.getItem("wealth-os-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <div className="flex min-h-dvh">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
            <div className="mx-auto max-w-7xl">
              <MobileTopBar />
              <FinanceProvider>
                <DemoBanner />
                {children}
              </FinanceProvider>
            </div>
          </main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
