import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE } from "@/lib/site";

/**
 * EB Garamond carries the entire site — headings, body, and metadata alike.
 * It is a variable font, so no weight array is needed; the whole 400–800 axis
 * ships in one file. Self-hosted by next/font at build time, which means no
 * request to Google and no layout shift from a late-arriving webfont.
 */
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-eb-garamond",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.url,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes sets the `dark` class on <html>
    // before hydration, so this attribute legitimately differs from the SSR output.
    <html lang="en" suppressHydrationWarning className={ebGaramond.variable}>
      <body>
        {/*
          Without JavaScript there is no deck controller, so the pinned stage would
          show the landing panel with no way past it. Unpin the sections and let the
          document scroll. A degraded view — only a window of sections is mounted —
          but a reachable one.

          This has to live in <noscript> rather than as a class, because a class
          would need removing by the very JavaScript whose absence it describes.
        */}
        <noscript>
          <style>{`
            html, body { overflow: auto !important; }
            main { height: auto !important; overflow: visible !important; }
            [data-deck-section] {
              position: relative !important;
              opacity: 1 !important;
              min-height: 100svh;
            }
          `}</style>
        </noscript>

        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
