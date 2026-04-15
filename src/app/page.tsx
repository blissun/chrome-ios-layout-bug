'use client';

import { useEffect, useRef } from 'react';
import { HomeHeader } from '@/views/components/HomeHeader';
import { TabNavigation } from '@/widgets/TabNavigation';
// import { DebugOverlay } from '@/shared/ui/DebugOverlay';
import { ViewportMarkers } from '@/shared/ui/ViewportMarkers';

const FILLER_COUNT = 1;

export default function Page() {
  const tabbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('[data-io-target]');
    if (targets.length === 0) return;
    const io = new IntersectionObserver(() => {}, {});
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <HomeHeader />

      <main className="p-4 space-y-4">
        <section className="rounded-xl bg-gray-100 p-5 min-h-[220px]">
          <h2 className="text-base font-semibold mb-2">Chrome iOS layout bug repro</h2>
          <p className="text-sm text-gray-600">
            Scroll up and down to trigger the URL bar animation. Compare the green fixed bottom
            bar against the red (100dvh), cyan (100svh), and purple (100lvh) viewport-unit
            markers.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Key fingerprint: tap the URL bar then cancel — the layout snaps back into alignment.
            Only Chrome&apos;s native code can trigger that invalidation path.
          </p>
        </section>
        {Array.from({ length: FILLER_COUNT }, (_, i) => (
          <section key={i} className="rounded-xl bg-gray-100 p-5 min-h-[3000px]">
            <h2 className="text-base font-semibold mb-2">Section {i + 1}</h2>
            <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden mb-2">
              <picture>
                <source srcSet="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII="
                  alt={`Section ${i + 1}`}
                  decoding="async"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </picture>
            </div>
            <p className="text-sm text-gray-600">
              Filler content. Scroll to trigger the URL bar animation and watch the fixed bottom
              bar misalign from the viewport-unit markers.
            </p>
          </section>
        ))}
      </main>

      <ViewportMarkers />
      <TabNavigation ref={tabbarRef} />
      {/* <DebugOverlay targetRef={tabbarRef} /> */}
    </>
  );
}
