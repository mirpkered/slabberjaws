# Certification lookup service

GitHub Pages cannot execute the repository's server route. Production certification lookups therefore use the `lookup` Supabase Edge Function in `supabase/functions/lookup`.

## Deploy

From the repository root, sign in to the Supabase CLI and deploy to Slabberjaws's configured project:

```sh
npx supabase login
npx supabase functions deploy lookup --project-ref kewynepvspcmrujustds --no-verify-jwt
```

`supabase/config.toml` also records `verify_jwt = false`. This is intentional because unsigned users may use local-device mode and certification lookup. The function accepts only the normalized public lookup request and exposes no database administration capability.

When `VITE_SUPABASE_URL` is configured, the frontend automatically uses:

```text
https://PROJECT_REF.supabase.co/functions/v1/lookup
```

For a different backend, set the optional GitHub Actions repository variable `VITE_LOOKUP_API_URL` to its full `POST /lookup` URL and rebuild Pages.

## Degree

No secret is required. The adapter POSTs `action=degree_check_cert` plus the numeric certification number to Degree's WordPress AJAX endpoint. That response creates a `PHPSESSID`; the adapter forwards the session cookie when requesting the returned certification slug. Without that cookie, Degree currently responds to the certification page with HTTP 403.

Degree sends no cross-origin permission header, so direct browser JavaScript is not viable. The Edge Function returns only the normalized card result.

## PSA

PSA's supported public API requires an access token. Store it only as an Edge Function secret:

```sh
npx supabase secrets set PSA_API_TOKEN=YOUR_TOKEN --project-ref kewynepvspcmrujustds
```

Never create a `VITE_PSA_API_TOKEN` variable and never put the token in GitHub Pages configuration. The adapter calls PSA's documented endpoint:

```text
GET https://api.psacard.com/publicapi/cert/GetByCertNumber/{certNumber}
Authorization: bearer PSA_API_TOKEN
```

Without `PSA_API_TOKEN`, PSA requests return the normalized `AUTH_REQUIRED` failure and manual entry remains available.

## Request and response

```json
{"grader":"degree","certNumber":"00409451"}
```

Success returns `{ "ok": true, "card": { ... } }`. Failures use one of `INVALID_CERT`, `CERT_NOT_FOUND`, `GRADER_UNAVAILABLE`, `AUTH_REQUIRED`, `LOOKUP_BLOCKED`, `PARSE_FAILED`, `TIMEOUT`, or `UNSUPPORTED_GRADER`.
