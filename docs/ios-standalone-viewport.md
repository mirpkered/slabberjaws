# iPhone Home Screen viewport standard

## Form-control rule

On narrow layouts (up to 640 CSS px) and compact-height layouts (up to 500 CSS px, including phone landscape), keyboard-editable `input`, `textarea`, and `select` controls use `max(16px, 1em)`. Do not solve focus zoom by setting `user-scalable=no` or `maximum-scale=1`. Keep range/file/choice controls outside the text-entry rule. When adding a new custom editable control, include it in the focused responsive font-size regression test.

## Audit notes

- Editable-control inventory: collection search is a text input (1rem/16px); grader, grade, and sort filters are native selects (effective 1rem/16px at phone sizes); Add Card lookup and manual details use `.field` text inputs/selects (16px on portrait phones, but previously inherited the `.field` label's `.72rem`/11.52px in wider phone-landscape layouts); account email/password/confirmation inputs use the same `.field` rule; scanner confirmation company/cert/grade controls and Photograph Slab company/OCR review controls also use `.field`. Card detail view has no editable fields. There is no textarea or `contenteditable` control. Camera zoom is `input[type=range]` and the photo picker is a visually hidden `input[type=file]`; neither is a keyboard text-entry control. Reusable UI input/select/textarea primitives are covered by the global mobile rule if introduced into a screen later.
- The application is a client-rendered Slabberjaws collection UI. Important in-progress state includes search/filter selection and the Add Card draft. Viewport/orientation changes are CSS-driven and do not reconstruct the app root.
- `app/layout.tsx` declares a device-width viewport, initial scale 1, and `viewport-fit=cover`; it does not restrict user zoom. The manifest uses `display: standalone`, and the Apple web-app metadata enables install-to-home-screen with a translucent status bar.
- The account, Add Card, and card-detail overlays are custom dialogs. They do not mutate body overflow/position or save keyboard-era viewport dimensions. The backdrop is fixed and scroll-contained; the dialogs scroll internally. Close/Escape now blur a focused text editor, remove the dialog, and return focus to its opener. Tab is contained within an open dialog. Validation/auth errors keep the dialog and draft in place.
- There is no `visualViewport` listener, cached `innerWidth`/`innerHeight`, JavaScript orientation state, page-root zoom, or inverse transform. No JavaScript viewport reset is needed.
- The scanner is the only full-screen fixed surface; `100vh` is a fallback followed by `100dvh`, with safe-area padding. Its active camera view contains no keyboard text input. Confirmation/manual controls are in the scrollable Add Card dialog. Mobile dialogs and scanner apply safe-area insets; phone layout constrains boxes with `border-box` and min-width resets.
- The field label uses `.72rem`; before the compact-phone rule, text inputs/selects inherited that size whenever the phone rotated wide enough to leave the `max-width: 640px` override. The common compact-phone rule now protects all editable controls, including landscape phone layouts, without increasing labels, buttons, or general body text. Search already uses 1rem, and portrait filter/field overrides were already 1rem.

## Manual native iPhone checklist

Desktop WebKit/Chromium checks are not a substitute for iOS Home Screen keyboard behavior. After a future deployment, verify on the intended iPhone:

1. Add Slabberjaws to the Home Screen and launch it from that icon; check initial scale and both horizontal edges.
2. Search/filter the collection, open a card detail, close it, and confirm focus returns to the card and the collection view remains intact.
3. Open Add Card. Focus and type in certification number; move to another field, dismiss the keyboard, and inspect the modal and page edges.
4. Continue through CSG manual card details without saving a test card; rotate portrait → landscape → portrait while a field is focused, dismiss the keyboard, and confirm the unsaved draft remains.
5. Open Photograph Slab and test its company/review fields and crop screen; return to Card Details and check state.
6. Open Account, focus email/password, trigger a local validation error with an invalid email, correct it, then close with X and separately with Escape if a hardware keyboard is attached. Check the sign-in draft/error stays while open and focus returns on close.
7. Repeat Add Card, account, and detail open/focus/dismiss/close cycles without force-killing or reloading the app. Include a safe failed lookup/auth path, but do not submit real credentials or save a dummy collection record.
8. Check notch/Dynamic Island and home-indicator clearances, fixed Add Card action, vertical scroll, and absence of left/right clipping after every keyboard dismissal and rotation.

Automated viewport tests validate CSS sizes, dialog focus/keyboard semantics, draft retention across emulated rotation, and horizontal bounds. They cannot reproduce the native iPhone standalone software keyboard or prove that iOS will not apply its automatic focus magnification; this checklist remains required.
