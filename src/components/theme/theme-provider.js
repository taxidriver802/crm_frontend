"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeController } from "@/components/theme/theme-controller";
import { isPublicCustomerPath } from "@/theme/public-path";

export function ThemeProvider({ children }) {
  const pathname = usePathname();
  const forceLight = isPublicCustomerPath(pathname);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={forceLight ? "light" : undefined}
    >
      <ThemeController>{children}</ThemeController>
    </NextThemesProvider>
  );
}
