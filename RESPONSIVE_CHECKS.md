# Responsive checks

Run `npx playwright install chromium webkit`, then `npm run test:responsive`.
The suite starts the existing Vite/Vinext dev server when necessary and uses
isolated browser contexts. Lookup responses are fixtures; no account or grader
credentials are required and no real cloud collection is changed.

Widths/heights: 320×568, 375×667, 390×844, 430×932, 768×1024,
1024×768, 1440×900. Both Chromium and WebKit are covered. Tests check document
and element bounds for collection, empty search results, details, auth,
lookup, lookup failure, manual entry, and successful lookup preview. They also
check the failure actions' touch target heights and cert preservation.
Screenshots are written under ignored `test-results/` for visual review.

The overflow bug came from the modal backdrop's implicit auto-sized grid track
and a percentage-sized child whose intrinsic contents could enlarge that track.
The fix constrains the track to `minmax(0, 1fr)`, gives the modal explicit shrink
limits, and allows content to wrap. It does not hide document overflow.
Additional mobile rules stack filters/forms, keep card metadata in normal flow,
separate header actions, and account for safe areas and dynamic viewport height.
The floating Add Card action is replaced by the header action on phones so it
cannot obscure controls. Desktop detail close buttons are layered above content.

Import/account identity styles have been audited for wrapping, but an authenticated
cloud import is not performed by this suite. WebKit desktop emulation is not a
physical iPhone test; keyboard/browser chrome and safe-area behavior should also
be checked on a device. No barcode or lookup functionality is added by this pass.
