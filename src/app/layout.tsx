import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chrome iOS layout bug repro',
  description:
    'Minimal Next.js reproduction of the iOS Chrome fixed/sticky layout bug during URL bar animation.',
};

// viewportFit: 'cover' lets env(safe-area-inset-bottom) resolve to the device's
// real inset. Without it iOS returns 0, leaving fixed bottom nav floating when
// the URL bar animates. (Mirrors nnb-nextjs/app/layout.tsx.)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
