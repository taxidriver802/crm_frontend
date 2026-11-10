import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./workbench.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ToastProvider } from "@/components/toast/toast-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { ShellGate } from "@/components/app-shell";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/lib/brand";
import {
  DEFAULT_PALETTE_ID,
  buildAllPalettesCss,
  getPaletteBootstrapScript,
  resolvePwaTheme,
} from "@/theme/registry";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pwa = resolvePwaTheme(DEFAULT_PALETTE_ID);

// Signed out, the tab and the installed app say Joist. Signed in, the shell
// replaces the title with "<company> CRM" (components/app-shell.js).
// The tab icon comes from app/icon.svg and app/favicon.ico, both generated
// from src/assets/brand/joist-mark.svg by `npm run icons:pwa`.
export const metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_DESCRIPTION,
  applicationName: PRODUCT_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: PRODUCT_NAME,
  },
};

export const viewport = {
  themeColor: pwa.themeColor,
  width: "device-width",
  initialScale: 1,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-palette={DEFAULT_PALETTE_ID}>
      <head>
        <style
          id="crm-palette-vars"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: buildAllPalettesCss() }}
        />
        <script dangerouslySetInnerHTML={{ __html: getPaletteBootstrapScript() }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;if(localStorage.getItem("crm-desktop-sidebar")==="0"){d.dataset.sidebar="closed";}var den=localStorage.getItem("crm-density");d.dataset.density=den==="compact"?"compact":"comfortable";}catch(e){}})();`,
          }}
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>
              <ShellGate>{children}</ShellGate>
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
