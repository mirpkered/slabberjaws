# Temporary on-device OCR diagnostics

On the live iPhone site, open:

`https://mirpkered.github.io/slabberjaws/?diagnostics=1`

Start Scan Slab or Photograph Slab. Scanner diagnostics appear after a successful decode. OCR diagnostics appear in the OCR review after Read label text; they include the actual crop/output blob passed to Tesseract, each raw pass result, normalized text, and accepted/rejected candidates.

To turn diagnostics off, remove `?diagnostics=1` from the address bar and reload the site (or open the regular site URL). Diagnostics are not stored in localStorage and are not attached to a card. Camera photographs and OCR previews remain in page memory only; the temporary preview object URLs are revoked on a new OCR attempt, image replacement, or when the photo flow closes.

## Tesseract.js runtime assets

The app dynamically imports the npm package `tesseract.js`, but does not bundle its worker, WebAssembly core, or English trained data. Tesseract.js 6 uses jsDelivr defaults for those runtime assets (`worker.min.js`, `tesseract.js-core` Wasm/JS assets, and `eng.traineddata.gz`). The app must therefore reach jsDelivr when the user first runs OCR. No new vendor assets or CDN changes are made in this diagnostic pass.
