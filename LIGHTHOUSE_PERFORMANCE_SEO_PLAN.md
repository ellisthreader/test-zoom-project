# Lighthouse Performance and SEO Improvement Plan

Audit date: 2026-07-07  
Audit target: production Vite preview at `http://127.0.0.1:4177`  
Tooling: Lighthouse CLI `13.4.0` via `npm exec -- lighthouse`  
Artifacts: JSON reports in `tmp/lighthouse-audit/*.json`; extracted summary in `tmp/lighthouse-audit/summary.txt`.

## Scope Audited

Public marketing routes:

- `/`
- `/platform`
- `/integrations`
- `/pricing`
- `/roi-calculator`
- `/demo`
- `/launch`
- `/reviews`
- `/contact-sales`

Both Lighthouse mobile and desktop profiles were run. Dashboard and setup routes were not treated as SEO-critical because they are app/auth flows rather than public crawl targets.

## Baseline Scores

| Route | Mobile Perf | Desktop Perf | Mobile SEO | Notes |
|---|---:|---:|---:|---|
| `/` | 36 | 84 | 92 | Critical mobile regression: 32.1s LCP, 4.46s TBT, 11.97 MiB transfer |
| `/integrations` | 57 | 67 | 92 | Main-thread heavy despite small payload; 1.28s mobile TBT |
| `/platform` | 76 | 99 | 92 | 6.27 MiB transfer, image-heavy |
| `/launch` | 76 | 99 | 100 | 7.25 MiB transfer, image-heavy |
| `/reviews` | 83 | 100 | 92 | Moderate LCP issue, image delivery savings |
| `/pricing` | 88 | 99 | 92 | Good, but still blocked by shared CSS/JS and robots issue |
| `/roi-calculator` | 90 | 100 | 92 | Good, but still blocked by shared CSS/JS and robots issue |
| `/demo` | 91 | 100 | 92 | Good, minor heading order/accessibility issue |
| `/contact-sales` | 91 | 100 | 92 | Good, but still blocked by shared CSS/JS and robots issue |

## Highest-Impact Findings

### 1. Homepage Mobile Is The Main Emergency

Lighthouse mobile for `/`:

- Performance: `36`
- LCP: `32.1s`
- TBT: `4,460ms`
- Time to Interactive: `34.3s`
- Main-thread work: `11.5s`
- Total transfer: `11,969 KiB`
- Image transfer: `11,424 KiB`
- Estimated image delivery savings: `10,740 KiB`

The largest transferred assets on the homepage are:

- `workflow-business-brief-photo-v3` at about `2.16 MB`
- `workflow-customer-questions-photo-v4` at about `2.05 MB`
- `demo-agent-avatar` at about `1.99 MB`
- `workflow-conversations-professional` at about `1.86 MB`
- `launch-photo-test` at about `1.85 MB`
- `relayclarity-hero-realistic` at about `1.51 MB`
- `voice-orb-demo-loop.mp4` at about `483 KB`

Source connection:

- Large images are statically imported at the top of `src/main.tsx` lines 6-24.
- The homepage workflow data references large images in `src/main.tsx` around line 541.
- The workflow timeline renders those images in multiple places around lines 643 and 667.
- The call demo renders the `demo-agent-avatar` image at line 887.

Priority fix:

1. Replace large PNG marketing images with responsive AVIF/WebP variants.
2. Generate at least three widths per image: mobile, tablet, desktop.
3. Serve with `srcSet` and `sizes` instead of a single imported PNG.
4. Keep the above-the-fold LCP asset small and explicitly preload only that one asset.
5. Do not load workflow/testimonial/launch images until the section is near viewport.

Target:

- Homepage mobile performance above `85`.
- Homepage mobile LCP below `2.5s`.
- Homepage total initial transfer below `1.5 MB`.
- Above-the-fold image transfer below `250 KB`.

### 2. The App Ships As One Large Route-Insensitive Bundle

Build output after `npm run build`:

- JS bundle: about `708 KB` minified, `211 KB` transferred in Lighthouse.
- CSS bundle: about `529-536 KB` minified, `88 KB` transferred in Lighthouse.
- Vite warns that chunks exceed `500 KB`.
- Lighthouse reports about `119-141 KiB` unused JS and `75-85 KiB` unused CSS on every route.

Source connection:

- One entry point, `src/main.tsx`, contains marketing pages, auth, onboarding, dashboard, integrations, voice setup, calls, conversations, and utility UI.
- Route types are declared in `src/main.tsx` around line 2677.
- App routing is client-side via `readAppViewFromLocation` around line 3968 and `appViewUrl` around line 4016.

Priority fix:

1. Split `src/main.tsx` into route modules:
   - `routes/HomePage.tsx`
   - `routes/PlatformPage.tsx`
   - `routes/IntegrationsPage.tsx`
   - `routes/PricingPage.tsx`
   - `routes/RoiPage.tsx`
   - `routes/DemoPage.tsx`
   - `routes/LaunchPage.tsx`
   - `routes/ReviewsPage.tsx`
   - `routes/ContactSalesPage.tsx`
   - `routes/AuthPage.tsx`
   - `routes/SetupPage.tsx`
   - `routes/DashboardPage.tsx`
2. Use `React.lazy` or router-level dynamic imports so dashboard/setup code is not loaded on marketing pages.
3. Move dashboard-only data, fake datasets, voice setup code, and onboarding logic out of the public marketing bundle.
4. Split CSS by route/component or use scoped CSS files imported by lazy route modules.
5. Add `manualChunks` for stable vendor chunks if needed:
   - `react`
   - `framer-motion`
   - dashboard-only libraries

Target:

- Public marketing route JS transfer below `80 KB` gzip.
- Route CSS transfer below `35 KB` gzip.
- Unused JS/CSS Lighthouse audits no longer red on simple pages.

### 3. CSS And Render Blocking Delay Every Mobile Page

Lighthouse repeatedly reports:

- Render-blocking request savings around `900ms`.
- Unused CSS savings of `75-85 KiB`.
- FCP around `2.7s` on every mobile route, even lightweight pages.

Priority fix:

1. Extract critical above-the-fold CSS for nav/hero into a small first-load stylesheet.
2. Load below-the-fold section CSS with the lazy route/section code.
3. Remove unused dashboard/setup styles from the marketing CSS path.
4. Audit expensive selectors and animations in `src/styles.css` and `src/setup-redesign.css`.
5. Keep initial font/CSS requirements small enough that FCP is not dominated by render-blocking CSS.

Target:

- Mobile FCP below `1.8s`.
- Render-blocking estimate below `200ms`.
- Initial CSS transfer below `35 KB`.

### 4. The Homepage Has Severe Main-Thread Work

Homepage mobile:

- TBT: `4,460ms`
- Long tasks include `3792ms`, `1915ms`, and `525ms`.
- Main-thread work: `11.5s`
- Style/layout work alone: about `2.24s`

Likely causes:

- Many Framer Motion scroll transforms and motion values active on first load.
- Several heavy sections are mounted immediately even when offscreen.
- Large DOM and image decode work occurs during initial page load.
- The animated call demo starts timers and state updates immediately.

Priority fix:

1. Mount below-the-fold sections lazily with `IntersectionObserver`.
2. Replace JS-driven scroll animation where CSS `position: sticky`, `transform`, and `content-visibility` are enough.
3. Gate non-critical animation startup until after first idle period.
4. Add `content-visibility: auto` and `contain-intrinsic-size` to long below-the-fold sections.
5. Respect `prefers-reduced-motion` and also reduce animation on low-power/mobile contexts.

Target:

- Homepage mobile TBT below `200ms`.
- Homepage main-thread work below `3s`.
- No single long task above `200ms`.

### 5. Marketing Pages Trigger Auth/API Errors On Initial Load

Lighthouse marks `Browser errors were logged to the console` on all audited pages.

Source connection:

- `refreshAuth()` calls `/api/auth/me` in `src/main.tsx` around line 4171.
- It runs on initial app load around line 4264, even for public marketing routes.
- In production preview without the backend/proxy, this generates network `404` and `500` console errors.

Priority fix:

1. Do not call `/api/auth/me` during public marketing route load.
2. Only check auth when:
   - the user opens dashboard,
   - the current route is `/dashboard`, `/setup`, or `/login`,
   - a stored session indicator exists and the app needs to hydrate account state.
3. For marketing pages, default auth status to signed-out without a network request.
4. Make expected unauthenticated responses quiet: handle them without console noise.

Target:

- Lighthouse `errors-in-console` passes on all marketing pages.
- No backend dependency for public marketing page rendering.

### 6. robots.txt Is Missing/Invalid

Most SEO scores are `92` because Lighthouse reports:

- `robots.txt is not valid`
- `17 errors found`

Observed cause:

- `public/robots.txt` does not exist.
- Vite SPA fallback serves HTML for `/robots.txt`, which Lighthouse tries to parse as robots syntax.

Priority fix:

1. Add `public/robots.txt`.
2. Include a sitemap pointer.
3. Ensure deployment serves `/robots.txt` as `text/plain` and does not route it to the SPA.

Recommended content:

```txt
User-agent: *
Allow: /

Sitemap: https://relayclarity.com/sitemap.xml
```

Target:

- SEO score `100` on every public marketing route, assuming all other SEO audits remain green.

### 7. Sitemap, Canonicals, Open Graph, And Per-Route Metadata Are Missing

Current `index.html` only has:

- one global title: `RelayClarity`
- one global meta description
- no canonical links
- no Open Graph tags
- no Twitter card tags
- no structured data
- no sitemap

Source connection:

- Metadata exists only in `index.html` lines 2-14.
- Client-side route rendering means every route starts from the same shell metadata.

Priority fix:

1. Add a metadata map for all public routes:
   - title
   - description
   - canonical URL
   - Open Graph title/description/image
   - Twitter card
2. Update metadata on route changes with a small head-management utility or move marketing pages to static prerendering.
3. Add `public/sitemap.xml` with all public routes.
4. Add JSON-LD:
   - `Organization`
   - `WebSite`
   - `SoftwareApplication` or `Product`
   - `FAQPage` where FAQs appear
   - `BreadcrumbList` for deeper marketing pages
5. Pick a production base URL and keep it centralized.

Target:

- Every public route has unique title/description/canonical.
- Search/social previews are correct per page.
- Sitemap is available at `/sitemap.xml`.

### 8. Image Elements Need Intrinsic Dimensions

Lighthouse reports unsized images on the homepage and platform page.

Examples:

- workflow timeline images
- ClearDBS/Bear Lane logos
- country flag images

Priority fix:

1. Add width/height attributes to all local images.
2. For responsive components, use CSS `aspect-ratio` plus intrinsic dimensions.
3. Avoid layout changes when images or logos load.

Target:

- `unsized-images` Lighthouse audit passes.
- CLS remains below `0.02` across pages.

### 9. Integration Page Is CPU-Heavy Despite Small Transfer

`/integrations` mobile:

- Performance: `57`
- TBT: `1,280ms`
- Main-thread work: `5.5s`
- Total transfer: only `352 KiB`

Likely causes:

- Rendering many integration/logo tiles immediately.
- Remote favicon requests from Google favicon endpoints.
- Animation/layout work during first render.

Priority fix:

1. Virtualize or progressively reveal the integration catalog.
2. Limit first paint to featured/top connectors.
3. Replace remote favicon endpoint calls with local optimized SVG/PNG icons for above-the-fold connectors.
4. Lazy-load lower-priority logo images with fixed dimensions.
5. Remove first-load motion from catalog grids; animate only after idle/viewport.

Target:

- `/integrations` mobile performance above `85`.
- TBT below `200ms`.
- Main-thread work below `2s`.

### 10. Large Public Videos Need A Loading Strategy

Public assets:

- `public/relayclarity-launch-video.mp4`: about `12.8 MB`
- `public/chatoraai-launch-video.mp4`: about `3.3 MB`
- `public/ai-assistant-demo-loop.mp4`: about `636 KB`
- `public/voice-orb-demo-loop.mp4`: about `482 KB`
- `public/robot-head.glb`: about `1.1 MB`

Source connection:

- `/voice-orb-demo-loop.mp4` is used around lines 3858 and 4784.
- `/relayclarity-launch-video.mp4` is used around line 4746.

Priority fix:

1. Do not preload large videos beyond metadata on initial page load.
2. Use a compressed poster image for first paint.
3. Load/play video only when visible and user/network conditions are acceptable.
4. Encode mobile-specific short loops at lower bitrate/resolution.
5. Add `prefers-reduced-motion` and `Save-Data` fallbacks.
6. Consider replacing the homepage video area with a lightweight poster until interaction.

Target:

- No large video body downloads before viewport/interaction.
- Home/platform initial transfer not affected by video assets.

## Recommended Implementation Order

### Phase 1: Quick SEO And Console Fixes

1. Add `public/robots.txt`.
2. Add `public/sitemap.xml`.
3. Add per-route title/description/canonical metadata.
4. Add Open Graph/Twitter tags.
5. Add route metadata tests or a small Playwright check.
6. Stop the initial `/api/auth/me` call on public marketing routes.
7. Rerun Lighthouse mobile SEO on all public routes.

Expected outcome:

- SEO should move from `92` to `100` on most or all public routes.
- Best Practices should improve because console network errors disappear.

### Phase 2: Compress And Responsive-Load Media

1. Generate optimized AVIF/WebP variants for all marketing PNG/JPG assets.
2. Convert the largest homepage images first.
3. Replace static `<img src={...}>` usage with a shared `ResponsiveImage` component.
4. Add explicit width/height/aspect ratio everywhere.
5. Add lazy section-level image loading for below-the-fold media.
6. Re-run Lighthouse on `/`, `/platform`, `/launch`, `/reviews`.

Expected outcome:

- Homepage transfer drops by several MB.
- Homepage LCP should move from catastrophic to measurable/good.
- Platform/launch mobile scores should move into the high 80s or 90s.

### Phase 3: Route-Level Code Splitting

1. Extract public marketing page components from `src/main.tsx`.
2. Extract auth/setup/dashboard flows into separate lazy modules.
3. Move dashboard-only data and effects out of the marketing entry.
4. Split CSS by route/module.
5. Add bundle analysis in CI or as an npm script.
6. Re-run Lighthouse on lightweight routes: `/pricing`, `/roi-calculator`, `/contact-sales`.

Expected outcome:

- Public route JS/CSS drops substantially.
- Unused JS/CSS audits improve.
- Faster FCP and TTI across all pages.

### Phase 4: Homepage Main-Thread And Animation Work

1. Lazy-mount below-the-fold homepage sections.
2. Use `content-visibility: auto` for long sections.
3. Defer call demo timers and non-critical animation until idle/visible.
4. Reduce Framer Motion usage for initial page load.
5. Profile with Chrome Performance panel after media compression.

Expected outcome:

- Homepage TBT below `200ms`.
- Time to Interactive below `4s` on mobile.
- No multi-second long tasks.

### Phase 5: Integrations Page CPU Work

1. Render only the top/active connector group initially.
2. Lazy-render lower catalog sections.
3. Replace remote favicon endpoints for visible connectors.
4. Defer catalog animations.
5. Add fixed dimensions for all logos.

Expected outcome:

- `/integrations` mobile performance above `85`.
- Main-thread work reduced from `5.5s` to below `2s`.

### Phase 6: Verification And Guardrails

1. Add `npm run lighthouse` scripts for:
   - all public mobile routes
   - all public desktop routes
   - JSON output into `tmp/lighthouse-audit`
2. Add budget thresholds:
   - mobile performance >= `85` for all public pages
   - mobile SEO >= `100`
   - JS transfer <= `100 KB` for simple marketing routes
   - CSS transfer <= `40 KB` for simple marketing routes
   - homepage total transfer <= `1.5 MB`
3. Add a bundle-size check to CI.
4. Add image-size checks for `assets/` and `public/`.
5. Document the media encoding workflow.

## Verification Commands Used

```powershell
npm run build
npm run preview -- --port 4177 --strictPort
npm exec -- lighthouse http://127.0.0.1:4177/ --quiet --chrome-flags='--headless=new --no-sandbox --disable-gpu' --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=tmp/lighthouse-audit/home-mobile.json
npm exec -- lighthouse http://127.0.0.1:4177/ --quiet --preset=desktop --chrome-flags='--headless=new --no-sandbox --disable-gpu' --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=tmp/lighthouse-audit/home-desktop.json
```

The same Lighthouse command shape was repeated for each public route.

Note: Lighthouse generated valid reports but Chrome cleanup emitted Windows `EPERM` temp-directory warnings after some runs. The JSON reports were written successfully before those cleanup warnings.
