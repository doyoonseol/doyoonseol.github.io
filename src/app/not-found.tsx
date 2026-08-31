import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
};

/**
 * Static export renders this to `out/404.html`, which GitHub Pages serves
 * automatically for any unmatched path. No host configuration required.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-24">
      <p className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-muted)]">
        404
      </p>
      <h1 className="mt-3 text-2xl font-medium tracking-tight">
        This page doesn&rsquo;t exist.
      </h1>
      <p className="mt-6">
        <Link href="/" className="underline underline-offset-4">
          Back to the beginning
        </Link>
      </p>
    </main>
  );
}
