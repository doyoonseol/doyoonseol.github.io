"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wraps next-themes. Defaults to following the operating system, which the
 * toggle can override; the choice is then persisted to localStorage.
 *
 * next-themes writes the `dark` class onto <html> from an inline script that
 * runs before first paint, so there is no flash of the wrong theme. That is
 * also why <html> carries suppressHydrationWarning in the root layout: the
 * class legitimately differs between the server-rendered HTML and the client.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
