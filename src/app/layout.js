import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ToastProvider } from "@/components/toast/toast-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
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

export const metadata = {
  title: "Rooftop Realty CRM",
  description: "Roofing, Gutters, Siding, Windows, Buy & Sell",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CRM",
  },
  icons: {
    apple: "/icons/icon-192.svg",
  },
};

export const viewport = {
  themeColor: pwa.themeColor,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-palette={DEFAULT_PALETTE_ID}>
      <head>
        <style
          id="crm-palette-vars"
          dangerouslySetInnerHTML={{ __html: buildAllPalettesCss() }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: getPaletteBootstrapScript() }}
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
