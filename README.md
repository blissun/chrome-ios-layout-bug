# Chrome iOS layout bug repro

Minimal standalone reproduction of the iOS Chrome (WKWebView) layout
bug where `position: fixed` and `position: sticky` elements drift out
of alignment with the actual visible viewport while the URL bar is
animating. Both a top sticky header and a bottom fixed tabbar are
included so you can observe the symmetric failure modes.

## What you see

- **Orange bar** at the top — `position: sticky; top: 0` header
- **Green bar** at the bottom — `position: fixed; bottom: 0` tabbar
- Three horizontal rules at viewport unit bottoms:
  - **Red** — `100dvh` (dynamic viewport height)
  - **Cyan** — `100svh` (small viewport height)
  - **Purple** — `100lvh` (large viewport height)
- A centered debug overlay with live metrics and 4 snapshot slots

## Repro steps

1. Open on an iPhone running **Chrome for iOS** (WKWebView).
2. Scroll up and down a few times to trigger the URL bar animation.
3. Watch the green tabbar drift against the red/cyan/purple markers.
4. Observe two failure modes:
   - **Gap below tabbar** during URL bar partial-collapse (vvTop > 0)
   - **Clipping at tabbar bottom** near scroll extremes (vvTop = 0, vvH < ih)
5. Tap the URL bar, then tap Cancel. Layout snaps back into alignment
   instantly — this is the fingerprint of the bug: only Chrome's native
   code can trigger the compositor invalidation that fixes it.

## Capturing snapshots

- Tap buttons **1–4** in the debug overlay to save the current metrics
  in a slot during interesting states.
- Tap **copy** to copy all four slots as plain text (uses
  `document.execCommand('copy')` which still works inside iOS Chrome).

## Metric key

```
iw   window.innerWidth
ih   window.innerHeight            ← layout viewport height
ch   documentElement.clientHeight
vv   visualViewport.height + offsetTop
sy   window.scrollY
sab  env(safe-area-inset-bottom)
sat  env(safe-area-inset-top)
dvh  100dvh
svh  100svh
lvh  100lvh
tb   tabbar getBoundingClientRect().bottom
```

A healthy state has `tb === vvTop + vvH`. The bug shows up whenever
`tb` diverges from that sum.

## Hosting on GitHub Pages

Push to a GitHub repo and enable Pages (Settings → Pages → Deploy from
branch → `main` / root). No build step is required — `index.html` is
fully self-contained.

## References

- [crbug.com/720048](https://crbug.com/720048) — Chromium engineer's
  answer on why `position: fixed` behaves this way on iOS Chrome.
- [WebKit #141832](https://bugs.webkit.org/show_bug.cgi?id=141832) —
  WebKit's intended behavior for `100vh` / layout viewport.
- [vercel/next.js#81264](https://github.com/vercel/next.js/issues/81264)
  — related `next/link` SPA navigation + viewport meta bug.
