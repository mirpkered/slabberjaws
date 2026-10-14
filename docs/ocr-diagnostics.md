# On-device scan and OCR diagnostics

Diagnostics are off by default for a new user. To enable them, open the hamburger menu and turn **Diagnostics** on. The preference is stored locally in this browser/PWA and survives reloads and relaunches. When enabled, **Diagnostics Active** appears inside Add Card; scanner details appear after a successful decode, and OCR diagnostics appear in Photograph Slab after Read label text.

The URL shortcut remains available:

`https://mirpkered.github.io/slabberjaws/?diagnostics=1`

Opening that URL turns Diagnostics on and saves the preference. To turn Diagnostics off—even when opened from the shortcut—open the hamburger menu and turn it off. The app removes the `diagnostics` query parameter and stores the off preference, so a reload does not immediately turn it back on. Turning it on or off does not navigate or reload the app.

The preference is a single local boolean only. Scanner payloads, OCR text, and diagnostic images are not written to storage or attached to cards. Camera photographs and OCR previews remain in page memory only; temporary preview object URLs are revoked on a new OCR attempt, image replacement, or when the photo flow closes. Safari and an installed Home Screen app each retain their local website data; on iOS, if the installed app appears to have a separate site-data context, enable the setting once from its own hamburger menu.

## Tesseract.js runtime assets

The app dynamically imports the npm package `tesseract.js`, but does not bundle its worker, WebAssembly core, or English trained data. Tesseract.js 6 uses jsDelivr defaults for those runtime assets (`worker.min.js`, `tesseract.js-core` Wasm/JS assets, and `eng.traineddata.gz`). The app must therefore reach jsDelivr when the user first runs OCR. No new vendor assets or CDN changes are made in this diagnostic pass.

