import { DEFAULT_PALETTE_ID, resolvePwaTheme } from "@/theme/registry";

export default function manifest() {
  const pwa = resolvePwaTheme(DEFAULT_PALETTE_ID);

  return {
    id: "/",
    name: "Rooftop Realty CRM",
    short_name: "CRM",
    description: "Roofing, Gutters, Siding, Windows — Lead to Revenue",
    lang: "en",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: pwa.backgroundColor,
    theme_color: pwa.themeColor,
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Leads",
        short_name: "Leads",
        url: "/leads",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Jobs",
        short_name: "Jobs",
        url: "/jobs",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Tasks",
        short_name: "Tasks",
        url: "/tasks",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
