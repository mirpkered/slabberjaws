# Grader integration status

## Degree
Degree provides an official lookup form at `https://degreegrading.com/certification-lookup/`. It accepts eight-digit certificate numbers and advertises details and subgrades. The initial HTML does not expose a stable certificate-specific result, so V1 returns a structured unavailable result pending a server-side response capture and parser validation against `00409451` and `00409452`. No fixture data is fabricated.

## PSA
Adapter and validation are scaffolded. Future server-side lookup reads `PSA_API_TOKEN`; the token must never enter browser code. Test certificate: `94877724`.

## CGC, PGS, Collect Direct
Isolated adapters and supplied test certificate formats are scaffolded. Automatic parsing is disabled until their live verification flows are confirmed. Manual entry remains available.
