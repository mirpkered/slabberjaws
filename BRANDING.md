# Slabberjaws icon and color system

The supplied shark artwork is the canonical source for the published icon set.
It is not stored in the repository: generated, square derivatives live in
`public/icons/` and preserve its original proportions.

| Asset | Size | Use |
| --- | ---: | --- |
| `icon-32.png` | 32×32 | Browser favicon |
| `icon-48.png` | 48×48 | Browser icon and compact header mark |
| `apple-touch-icon.png` | 180×180 | iPhone/iPad Add to Home Screen |
| `icon-192.png` | 192×192 | Standard web-app icon |
| `icon-512.png` | 512×512 | Standard high-resolution web-app icon |
| `icon-512-maskable.png` | 512×512 | Padded maskable Android icon |

The maskable derivative scales the source to 400px inside a 512px charcoal
canvas, preserving a safe border when Android crops its shape. Its full wordmark
may be too small for a launcher surface, but the mascot and ocean-blue framing
remain clear. The header uses the compact 48px derivative beside the existing
text wordmark; card imagery remains the primary visual emphasis.

`public/manifest.webmanifest` uses relative `./` asset paths. This resolves
correctly under GitHub Pages at `/slabberjaws/` rather than assuming a root-host
deployment. Metadata explicitly provides an Apple touch icon and the iOS title
`Slabberjaws`; iOS does not reliably use manifest icons for Add to Home Screen.

The charcoal surfaces remain unchanged. Brand accent values are:

- `--accent: #28a8e8` — primary shark blue
- `--accent-highlight: #39c5ff` — hover and focus blue
- `--accent-deep: #1677b8` — manifest/theme blue
- `--accent-ink: #071a26` — primary-button text

The semantic success token remains green (`--success: #90cfa5`); it communicates
success and is not a brand accent. The old lime accent and its hover/focus values
have been removed from active CSS.

Current contrast ratios: primary text on `#28a8e8` is 6.63:1, warm body text on
`#17191c` is 15.4:1, and muted text on raised charcoal is 6.0:1. Focus outlines
use the bright blue token and remain visible on dark controls.

Physical iPhone/iPad Add to Home Screen installation is not verified. Build and
live HTTP checks verify the markup, manifest and asset URLs once deployed.
