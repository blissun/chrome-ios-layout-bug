# iOS Chrome fixed-layer stale bug: 실험 기록 및 최소 재현 조건

## 요약 (TL;DR)

- **증상**: iOS Chrome에서 첫 페이지 로드 직후 스크롤할 때, `position: fixed; bottom: 0` 요소가 visible viewport 하단이 아닌 **layout 좌표계의 `svh` 지점에 stale 상태로 박힘**. URL바 애니메이션이 끝나도 자동으로 동기화되지 않음.
- **정상화 경로**: URL바를 탭한 후 취소로 복귀 → 즉시 정상화 (Chrome iOS 네이티브 코드가 WKWebView에 invalidation을 트리거하는 내부 경로).
- **최소 재현 조건** (4-property interaction):
  ```html
  <img
    src="data:,"
    srcset="data:,"
    decoding="async"
    loading="lazy"
  >
  ```
  **네 속성이 모두 동시에** 있어야 재현. 어느 하나가 빠지면 재현 안 됨.
  - `srcset`은 **반드시 `<img>` element에 직접** 선언돼야 함. `<picture>` 안의 `<source srcset>`로 옮기면 재현 안 됨.
  - 이미지 실제 로드는 불필요 — data URI도 OK. srcset candidate 개수도 1개로 충분.
  - 이미지 1개만 있어도 충분 (페이지 높이만 URL바 애니메이션을 트리거할 수 있을 만큼 확보되면 됨).
- **Safari iOS는 정상**. 동일 HTML인데 Chrome iOS만 깨짐 → WebKit 엔진 자체의 문제가 아니라 **Chrome iOS가 WKWebView 위에 올리는 자체 네이티브 코드의 버그**.
- **영향**: `next/image`의 기본 동작이 정확히 이 3-way 속성 조합을 생성하므로, Next.js + iOS Chrome 사용자 상당수가 무의식적으로 영향받음.

---

## 환경

- 기기: iPhone (`iw:393, ih:734` 수준의 기기)
- Chrome iOS: 사용자 환경 버전 (2026-04 현재)
- iOS: WKWebView 기반 (Apple이 모든 iOS 브라우저에 WKWebView 사용 강제)
- Next.js 16.1.6 + React 19.2.4 (재현용 repro에서 확인)

---

## 관찰된 실패 모드

디버그 오버레이(`rect.bottom`, `visualViewport.height`, `offsetTop` 등 측정)로 서로 다른 두 상태에서 아래 수치를 확보했다.

| 상태 | `ih` | `vvH` | `vvTop` | `rect.bottom` (fixed bottom:0) | 시각 효과 |
|---|---|---|---|---|---|
| [A] URL바 상단 노출 중 | 734 | 722 | 12 | 722 | 탭바 **아래 12px 공백** |
| [B] 스크롤 끝 부근 | 734 | 722 | 0 | 734 | 탭바 **아래 12px 잘림** |
| [C] 정착 | 734 | 734 | 0 | 734 | 정상 |

**공식**: `rect.bottom = ih − vvTop` (iOS Chrome의 `position: fixed; bottom: 0` 해석)

**fixed 레이어 clip 경계**: `y = vvH` from layout top. 이 값 위로 그려진 요소는 GPU compositor에서 painting 자체가 잘린다.

이 두 규칙의 조합 때문에:

- [A]에서는 `rect.bottom(722) = vvH(722)` 딱 걸려 clip은 없지만, visible 영역은 `[vvTop, vvTop+vvH] = [12, 734]`이므로 **y=722~734에 12px의 visible 공백**이 생기고 탭바가 "떠 보인다".
- [B]에서는 `rect.bottom(734) > vvH(722)`이므로 fixed 레이어 clip에 걸려 **바닥 12px이 잘린다**.

요약: `fixed bottom: 0`가 visible viewport의 실제 바닥(`vvTop + vvH`)에 붙지 못하고, layout viewport의 바닥에서 `vvTop`만큼 올라간 위치에 박힌다. 그리고 그 위치가 fixed 레이어의 clip 경계와 불일치하면 잘려 나가기까지 한다.

---

## 시도한 CSS 차원 수정과 실패 이유

| 시도 | 결과 | 이유 |
|---|---|---|
| `bottom: 0` + `padding-bottom: env(safe-area-inset-bottom)` | ❌ | 위 공식대로 `rect.bottom = ih − vvTop`에 박힘 |
| `bottom: calc(0px - var(--vv-top, 0px))` (JS로 vvTop을 CSS var에 주입) | ❌ 보정은 위치는 맞추지만 fixed 레이어 clip 경계 (y=vvH) 밖으로 밀어내 **잘림** 발생 |
| `transform: translateY(var(--vv-top))` | ❌ 같은 이유 — transform은 painting 이동이지만 compositor clip은 layout box 기준 |
| `position: absolute` + JS로 `top = scrollY + vvTop + vvH − height` 재계산 | ✅ 기능상 작동 — fixed 레이어를 벗어나므로 clip 없음. 단점: 스크롤 중 매 프레임 소수점(0.3, 0.7...) 업데이트로 **탭바가 미세하게 흔들리는 시각적 jitter** 발생 |
| 위 방식 + 스크롤 중 탭바 fade out → 스크롤 정지 후 재계산/fade in | ✅ 시각적으로 가장 깔끔하지만 스크롤 내내 탭바가 안 보이는 트레이드오프 |

결론: **web 레이어에서 근본 수정 불가**. 모든 접근은 visual mitigation 또는 복잡한 JS 워크어라운드로 귀결된다. 이 결론은 기존 문서 `docs/ios-chrome-troubleshooting.md`의 "시도 1~18 종합 결론"과 일치한다.

---

## 최소 재현 조건 bisection

원래 repro를 Next.js 앱으로 nnb-nextjs 구조(`src/app`, `src/widgets`, `src/views`, `src/shared`)를 미러링해 만들었고, 이후 요소를 하나씩 제거/추가하며 어떤 조건이 버그를 유발하는지 좁혔다.

| # | 구성 | 재현 |
|---|---|---|
| 1 | `next/image` 기본 (srcset, sizes, decoding=async, loading=lazy 모두 포함) | ✅ |
| 2 | `next/image` + `unoptimized` | ❌ |
| 3 | plain `<img>` (src만) | ❌ |
| 4 | plain `<img>` + srcset(6 candidates) + sizes + decoding=async + loading=lazy | ✅ |
| 5 | plain `<img>` + sizes + decoding + lazy (srcset 없음) | ❌ |
| 6 | plain `<img>` + srcset + decoding + lazy (sizes 없음) | ✅ |
| 7 | plain `<img>` + srcset only | ❌ |
| 8 | plain `<img>` + srcset + loading=lazy (decoding 없음) | ❌ |
| 9 | plain `<img>` + srcset + decoding=async (loading 없음) | ❌ |
| 10 | plain `<img>` + srcset(2 candidates) + decoding + lazy | ✅ |
| 11 | plain `<img>` + srcset(1 entry w-descriptor) + decoding + lazy | ✅ |
| 12 | plain `<img>` + srcset(1 entry x-descriptor) + decoding + lazy | ✅ |
| 13 | plain `<img>` + srcset(URL only, no descriptor) + decoding + lazy | ✅ |
| 14 | 단일 이미지 + 3000px 섹션 | ✅ |
| 15 | `<img>` + data URI (src/srcset 동일 data URI) + decoding + lazy | ✅ |
| 16 | `<img>` srcset만 (src 없음) + data URI + decoding + lazy | ❌ |
| 17 | `<picture><source srcset><img src decoding lazy></picture>` + data URI | ❌ |
| 18 | 명시적 `IntersectionObserver`가 div를 관찰 (`<img>` 없음) | ❌ |

**결론**:
- `sizes`, srcset candidate 개수, 실제 네트워크 로드, 이미지 개수, 섹션 개수는 **무관**.
- **필수 조건 4가지**: `<img>` element에 `src` + `srcset` + `decoding="async"` + `loading="lazy"`이 모두 함께 존재.
- `srcset`을 `<picture>` 안의 `<source>`로 옮기면 재현 안 됨 → HTMLImageElement의 inline srcset codepath 특정.
- `<img>` 없이 IntersectionObserver만 사용하면 재현 안 됨 → lazy loading의 observer 경로가 아니라 **img element parsing/load scheduling** 쪽 버그.

`next/image`의 기본 출력이 정확히 4개 조건을 전부 생성한다.

### 4-property interaction의 해석

처음에는 "이미지 로드/디코드 타이밍이 compositor와 섞여서 생기는 현상"이라는 해석이 자연스러웠지만, 다음 두 실험이 그 해석을 깼다:

- **Test 15**: `src`/`srcset`을 1×1 투명 PNG **data URI**로 교체 — 네트워크 요청 0, 디코드 사실상 즉시 완료. 그럼에도 재현됨. → **실제 이미지 로드/디코드는 버그의 필요 조건이 아님**.
- **Test 18**: `<img>`를 제거하고 명시적 `IntersectionObserver`만 등록 — 재현 안 됨. → **lazy loading의 observer 경로 자체도 원인이 아님**.
- **Test 17**: `<picture>` + `<source srcset>` 구조로 이동 — 재현 안 됨. → **`<source>` element 경로는 별개 codepath**이고, 문제는 **`<img>`에 srcset이 직접 선언됐을 때의 HTMLImageElement attribute parsing/layout scheduling**.

현재 가장 일관된 모델:

> iOS Chrome의 HTMLImageElement 처리 코드는, `<img>` element 하나가 **src + srcset(direct) + decoding="async" + loading="lazy"** 네 attribute를 모두 가질 때 특정 내부 상태 플래그 조합에 들어간다. 그 상태에서 스크롤 기반 URL바 애니메이션이 끝날 때, Chrome iOS 네이티브 코드가 WKWebView fixed layer의 visual-viewport snapshot을 업데이트하는 경로를 **건너뛰거나 잘못된 시점에 호출**한다. URL바 탭 → 취소로 돌아오면 다른 native invalidation 경로가 호출되어 즉시 정상화된다.

즉 버그의 핵심은 **image loading의 물리적 side-effect가 아니라, attribute 조합이 만드는 element state**이며, 이 state가 iOS Chrome 네이티브의 viewport/URL바 처리 코드와 잘못 상호작용한다는 가설이 가장 잘 맞는다.

---

## Safari iOS 교차 검증

동일 HTML (`minimal.html`)을 iPhone Safari iOS로 열었을 때:

- **재현 안 됨** — 탭바가 visible viewport 하단에 정확히 붙어 있고, URL바 애니메이션 중/후에도 sync가 깨지지 않음.

iOS는 모든 브라우저에 WKWebView/WebKit 사용을 강제한다. 즉 **브라우저 엔진은 동일**하다. 그럼에도 Safari와 Chrome의 동작이 다르다는 것은:

- WebKit 자체의 의도된 동작(spec-compliant)이 아니다.
- WKWebView 내부 버그도 아니다 (같은 엔진).
- **Chrome iOS가 WKWebView 위에 올리는 자체 native 코드** — 특히 URL바 show/hide 처리, visual viewport 관리, compositor 훅 — 중 무언가가 이 시나리오에서 invalidation을 누락한다.

이것은 앞서 `docs/ios-chrome-troubleshooting.md`가 "URL바 탭 → 취소로 고쳐진다"에서 추측했던 "Chrome 네이티브 코드가 WKWebView 프라이빗 API로 레이아웃 재계산을 호출하는 경로가 존재한다"와 일치한다. 해당 경로가 **스크롤 기반 URL바 애니메이션 종료 시점에는 호출되지 않고, 탭 기반 URL바 상호작용 종료 시점에만 호출된다**는 가설.

---

## 보너스 관찰: viewport unit 마커가 fixed 레이어 clip을 직접 시각화

repro에 세 가지 viewport unit 마커(`position: fixed`의 2px 가로선)를 추가했다:

```css
.m-d { top: calc(100dvh - 2px); background: red;    }  /* dvh */
.m-s { top: calc(100svh - 2px); background: cyan;   }  /* svh */
.m-l { top: calc(100lvh - 2px); background: purple; }  /* lvh */
```

Chrome iOS에서 **청록색(`svh`) 선만 보이고**, 빨간(`dvh`)/보라(`lvh`) 선은 보이지 않는다. 세 마커 모두 같은 `position: fixed`인데 svh 선만 가시적이라는 건:

- fixed 레이어의 painting 범위가 `[0, svh]`로 bound되어 있다.
- `dvh`, `lvh`는 `svh`보다 큰 값이므로 해당 좌표는 fixed 레이어 clip 경계 밖 → **painting 자체가 일어나지 않는다**.

이건 탭바 clipping과 정확히 같은 메커니즘이 독립적으로 확인된 것이다. 스크린샷 한 장으로 "fixed 레이어 clip이 svh에 박혀 있다"를 Chromium 엔지니어에게 즉시 전달할 수 있다.

(Safari iOS에서는 세 마커가 모두 제대로 그려진다.)

---

## 최소 재현 리소스

### 1. Standalone HTML

`minimal.html` — Next.js 없이 순수 HTML + 인라인 JS만으로 재현. 30개 섹션에 `<img srcset decoding=async loading=lazy>`를 넣고 sticky top / fixed bottom / viewport unit 마커를 배치한다.

GitHub Pages 호스팅:
**https://blissun.github.io/chrome-ios-layout-bug/minimal.html**

### 2. Next.js 구조 미러 repro

`src/` 이하 — nnb-nextjs의 FSD 레이아웃(`app/`, `widgets/`, `views/components/`, `shared/ui/`)을 그대로 답습한 버전. Tailwind v4, Next.js 16.1.6, React 19.2.4로 실제 앱 환경과 버전까지 맞춤. 로컬에서 `pnpm dev`.

---

## 재현 단계

1. iPhone + Chrome iOS에서 `minimal.html` 접속.
2. 첫 로드 직후(페이지 reload 직후) 화면을 한두 번 빠르게 flick하여 스크롤.
3. 하단 초록 탭바와 빨강/청록/보라 viewport unit 마커의 위치 비교:
   - 청록(`svh`) 선만 보이는 현상 관찰
   - 탭바 하단이 visible 바닥에 붙지 못하고 간격 또는 clipping 발생
4. 같은 URL을 iPhone Safari iOS에서 열어 동일하게 스크롤 → 모든 것이 정상.
5. Chrome iOS로 돌아가 URL바를 탭 → 취소 → 즉시 정렬이 복원되는 것 확인.

---

## Chromium 이슈 티켓 (draft)

**제목**:
`iOS Chrome: position:fixed elements become stale after first-load scroll when page uses <img srcset decoding="async" loading="lazy">`

**본문 요점**:
- Safari iOS에서는 재현되지 않음 (WebKit 엔진 공통이므로 Chrome iOS native 코드의 이슈임이 증명됨).
- 3-way interaction: srcset + decoding=async + loading=lazy. 어느 하나가 빠지면 재현 안 됨.
- `next/image` 기본 출력이 이 조합을 생성 → Next.js 사용자 다수가 무의식적으로 영향.
- 공식: iOS Chrome에서 `fixed bottom: 0`의 `rect.bottom = ih − vvTop`, 그리고 fixed 레이어 clip 경계 = `vvH`. 두 값의 불일치가 "떠 보임" 또는 "clipping"으로 나타남.
- URL바 탭 → 취소로 즉시 정상화 → native invalidation 경로 존재 증명 → **스크롤 기반 URL바 종료 시점에는 그 경로가 호출되지 않음**이 진짜 버그.
- Viewport unit 마커 테스트로 fixed 레이어 clip이 `svh`에 박혀 있음을 독립적으로 확인.
- 최소 HTML repro 링크: https://blissun.github.io/chrome-ios-layout-bug/minimal.html
- 기기/OS/Chrome 버전 정보 첨부

**링크**:
- crbug.com/720048 — Chromium 엔지니어의 iOS fixed positioning 답변
- WebKit #141832 — WebKit의 `100vh` 의도된 동작
- vercel/next.js#81264 — 관련 `next/link` viewport 리셋 버그

---

## 워크어라운드 후보 (실제 앱)

근본 수정 없이 실제 앱에서 바로 적용 가능한 것들:

1. **`next/image`에 `loading="eager"` 지정** — 3-way interaction의 핵심 축 하나 제거. 단점: 이미지 선로딩으로 대역폭/LCP 영향.
2. **`decoding="sync"`** — 마찬가지로 축 하나 제거. 단점: 메인 스레드에서 디코드 → jank.
3. **`unoptimized` 옵션** — srcset 축 제거. 단점: 이미지 최적화 파이프라인을 포기.
4. **탭바를 `absolute` + JS `top` 계산으로 돌려놓기** — 기존 `06ad96968 ~ 4775bd2d8` 커밋의 접근. 스크롤 중 fade out으로 jitter 숨김.
5. **시각적 완화** — `boxShadow`로 탭바 주변 배경을 같은 색으로 확장해 "뜨는/잘리는" 12px 구간을 감춤. 위치는 여전히 틀리므로 터치 hit-target과 실제 visible 바닥이 어긋나는 부차적 문제는 남음.

옵션 4가 가장 검증된 해결책이지만 구현 복잡도가 높다. 옵션 1 ~ 3은 버그를 회피하지만 이미지 로딩 전략 자체를 바꾸는 문제. 실제 앱에서는 상황에 따라 혼합.

---

## 남은 의문 / 추가 실험 여지

- **srcset candidate 수를 얼마나 줄여도 재현되는가?** 최소 2개로도 충분한지, 1개만으로는 안 되는지 확인되지 않았다.
- **이미지 개수 임계점**. 현재 30~40개 기준이지만 5~10개로 재현되는지 미확인. 적은 개수로 재현되면 티켓의 무게가 훨씬 올라간다.
- **다른 Chromium 기반 iOS 브라우저(Edge iOS, Brave iOS)에서도 같은 패턴인가?** 모두 WKWebView 기반이지만 Chrome 고유 native 코드를 공유하지 않을 수 있다.
- **`priority` 속성 또는 IntersectionObserver 기반이 아닌 lazy loading 방식(예: native lazy loading vs 라이브러리 기반)**에서 동일 현상인지.
- **버그 발현 기기별 차이** (iPhone 모델/iOS 버전별 재현율).

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-04-15 | 문서 초판. 3-way interaction 확정, Safari 교차 검증, viewport unit 마커 관찰 추가. |
