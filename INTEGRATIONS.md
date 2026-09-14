# Grader integration report — 2026-09-14

## Degree — server lookup adapter implemented

- The form POSTs `action=degree_check_cert` and the numeric certificate (leading zeroes removed) to WordPress `admin-ajax.php`. JSON returns `exists` and an eight-digit `slug`, then the browser opens `/certification/{slug}/`.
- Cert pages are server-rendered HTML. Common data is in schema.org `Product` JSON-LD; variant, population, rarity, and set details are semantic HTML fields.
- `00409451`: 1993 Topps Joe Oliver #14, Series One - Black Gold, DEGREE 9. `00409452`: 1994 Topps Billy Wagner #209, Series One - 1993 Draft Pick, GOLD, DEGREE 8.
- Available: cert, grade, year, brand, set, subject, number, variant, exact-card population, set population, rarity, Surface, Corners/Edges, Centering, and Creases/Dents. Neither fixture displayed grader notes.
- One cert-specific immutable PNG is exposed as the Product/Open Graph image. It is a generated certification graphic, not separate front/back slab photography. Both fixture URLs returned 200 with an immutable 120-day cache policy. No back image was exposed.
- Server proxy required: public responses do not grant cross-origin browser access. The AJAX response also establishes a `PHPSESSID`; the certification page returns 403 unless the server forwards that cookie.
- Brittleness: JSON-LD is the stable anchor. Population, variant, and rarity use named HTML classes and fail safely if the page changes.

## CGC — automatic lookup not enabled

- The home-page form opens `/certlookup/{cert}/`. The site is Angular; its public bundle configures `https://production.api.aws.ccg-ops.com/api` and supporting calls including `/certlookup/data/description/{cert}/{grade}/` and `/certlookup/data/{cert}/grader-notes/`.
- The supplied cert route returned Cloudflare HTTP 403. The application explicitly models rate-limited and CAPTCHA-required states, and the public page says search limits protect its database.
- CGC says description, grade, and holder images are displayed, but the fixture response could not be retrieved reliably enough to normalize without inventing values.
- Server access would remain vulnerable to anti-bot limits; browser access is same-origin and no cross-origin headers were exposed.
- Decision: retain manual fallback; do not automate CAPTCHA or evade limits.

## PGS — automatic lookup not enabled

- `pgsgrading.com` redirects over HTTP to `www.igsgrading.com`.
- The successor serves a default Parallels hosting page over HTTP and its HTTPS connection is invalid.
- No working cert form, structured response, image host, or verification URL was exposed for `272599`.
- Decision: retain unavailable/manual fallback.

## Collect Direct — automatic lookup not enabled

- The current site is a server-rendered Next.js/Vercel marketing site. Its page and loaded scripts expose no certification form, API, XHR, GraphQL, or lookup route.
- Common cert, certificate, verification, lookup, grading, and API paths with `259815224` all returned 404.
- No cert-specific fields or images could be verified and no cross-origin API is exposed.
- Decision: retain unsupported/manual fallback until a verification path is published.

## PSA — credential-ready Edge Function adapter

- PSA was not queried beyond its existing public architecture.
- The Edge Function adapter calls PSA's documented `GetByCertNumber` REST method and normalizes its documented `PublicPSACert` fields.
- It reads `PSA_API_TOKEN` only from the function environment. `.env.example` documents an empty server-only variable; never use a `VITE_` prefix or commit a value.
- The fixture `94877724` has not been queried because no PSA API token is configured.
