# Slab scanning

Scanning supplies the existing lookup handler with a user-selected grader and a
string certification number. It never detects a grader or saves a card by itself.
The selector receives the existing app grader list; this app currently supports
Degree, PSA, CGC, PGS and Collect Direct, not arbitrary grader names.

Native BarcodeDetector is used only when all baseline formats are reported:
Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E and QR. Otherwise the lazily imported
`@zxing/browser` / `@zxing/library` decoder handles those plus ITF, Data Matrix,
PDF417 and Aztec. No CDN script is required. The ZXing bundle loads only when
scanning needs it. See https://github.com/zxing-js/browser for the library API.

Camera access requires HTTPS (GitHub Pages qualifies) or localhost. Rear camera
is preferred, audio is disabled, and 1920×1080 is requested as an ideal (not
mandatory) rear-camera resolution. Decoding is throttled to roughly five frames
per second with source frames capped at 1920px wide. iPhone/iPad WebKit always
uses the JavaScript fallback because its native QR behavior is inconsistent.
Development builds show the selected decoder, source dimensions and formats;
production does not. Focus, glare, barcode size and hardware camera permissions
affect results; a physical iPhone camera has not been retested after this update.
Flashlight controls appear only when the track advertises torch support.

The first non-empty decode stops scanning before confirmation. All tracks stop
on success, cancel, rescan, dialog close, page hide or camera interruption.
Even a delayed camera permission result is released if its scan was canceled.
Denied/busy/missing cameras, unsupported/insecure browsers and decoder failures
show manual-entry fallback. No lookup runs until a grader and cert are confirmed.

Payload parsing preserves leading zeros. It accepts a 5–20 digit plain number,
an unambiguous numeric URL path segment or known cert/id query parameter, and
one standalone numeric token in prefixed text. Multiple distinct candidates,
short numbers, alphanumeric identities and unsupported text require user entry.
URLs are never visited. The editable confirmation gives users the final decision.

## Privacy and storage

No still image is retained in V1. ZXing's reusable canvas is solely a decode
buffer; it is cleared on disposal and is never converted to an image URL/blob.
Video and frames never leave the browser, enter localStorage/IndexedDB, reach
Supabase or become collection fields. Raw decoded text exists only in ScanEntry
component memory, discarded on rescan, cancel, close, reload or confirmation.
Only selected grader and cert are handed to the existing lookup pipeline.
Camera modules do not import storage, Supabase or collection repositories.

If the production Edge Function is undeployed, lookup shows the normal failure
screen. Grader and cert remain populated for manual card entry; scanning again is
not required. No backend configuration or secret is introduced by this feature.

## Verification

`npm test` covers payload parsing, duplicate reads, cancellation during permission,
rescan, startup failure and fallback errors. `npm run test:responsive` mocks media
and native decoding, checks grader confirmation and unavailable lookup/manual
fallback at 320, 375, 390, 430, 768, 1024 and 1440px in Chromium and WebKit, and
separately decodes real synthetic QR pixels with ZXing (including a blank frame).
These checks require no physical camera, real grader data or account credentials.
