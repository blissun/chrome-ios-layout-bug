'use client';

import { useRef } from 'react';
import { HomeHeader } from '@/views/components/HomeHeader';
import { TabNavigation } from '@/widgets/TabNavigation';
// import { DebugOverlay } from '@/shared/ui/DebugOverlay';
import { ViewportMarkers } from '@/shared/ui/ViewportMarkers';

const FILLER_COUNT = 40;

export default function Page() {
  const tabbarRef = useRef<HTMLDivElement>(null);

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
          <section key={i} className="rounded-xl bg-gray-100 p-5 min-h-[220px]">
            <h2 className="text-base font-semibold mb-2">Section {i + 1}</h2>
            <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://picsum.photos/seed/chrome-ios-${i}/640/360`}
                srcSet={[
                  `https://picsum.photos/seed/chrome-ios-${i}/640/360 640w`,
                  `https://picsum.photos/seed/chrome-ios-${i}/750/422 750w`,
                  `https://picsum.photos/seed/chrome-ios-${i}/828/466 828w`,
                  `https://picsum.photos/seed/chrome-ios-${i}/1080/608 1080w`,
                  `https://picsum.photos/seed/chrome-ios-${i}/1200/675 1200w`,
                  `https://picsum.photos/seed/chrome-ios-${i}/1920/1080 1920w`,
                ].join(', ')}
                alt={`Section ${i + 1}`}
                decoding="async"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
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
