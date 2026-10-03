# OverlayDrawer browser contracts

## Scope/source inventory

All 19 existing component-local cases are retained, including 13 imported `DrawerShared` cases (basic rendering/open lifecycle, four sizes, viewport clamp/custom width and three positions), modal/alert/non-modal backdrop cases and body scroll locking. Baseline: 19/19 valid current-source tests. No skips, retries or arbitrary sleeps were added.

Read current component/types/hook/render/styles, nested OverlayDrawerSurface implementation/styles, component unit/conformance tests, shared defaults/base styles and underlying Dialog/Surface event/focus behavior. Primary docs: library README/Spec, story README/index, Description/BestPractices; Overlay/OverlayNoModal/OverlayInsideContainer, PreventClose, KeepRenderedInTheDOM, MultipleLevels, Position/Size/CustomSize, WithTitle/WithNavigation/WithScroll, MotionDisabled/MotionCustom story modules. These distinguish current API from historical Spec (`defaultOpen` is deprecated/ignored; only controlled OverlayDrawer).

## Round 1: documented assertions

| Source                                 | Exact assertions                                                                                                                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing suite + shared base scenarios | All original cases retained and run, not duplicated or weakened.                                                                                                                                                                       |
| Overlay, best-practice restoration     | Native Enter opens named aside/dialog with labelled title and modal ARIA; first focus, Tab/shiftTab wrapping, native Escape closes and exact `{event,type:escapeKeyDown,open:false}`; supplied restoration hooks restore opener focus. |
| Modal scrim                            | Inside click emits no request; real pointer scrim click closes with exact backdropClick event envelope.                                                                                                                                |
| OverlayNoModal                         | No scrim, aria-modal=false, background pointer focus works, native Tab can exit; Escape still dismisses.                                                                                                                               |
| PreventClose                           | Controlled alert with no handler rejects Escape/scrim closing, explicit native keyboard action closes. Alert alone is not advertised as blocking Escape requests when a handler accepts them.                                          |
| OverlayInsideContainer                 | Real mount node contains aside surface and scrim, both position:absolute; native dismissal works.                                                                                                                                      |
| KeepRenderedInTheDOM/MotionDisabled    | Closed retained surface exists but is hidden/aria-hidden; opening permits input, closing hides, reopening preserves draft state.                                                                                                       |

### Production correction

Round 1 reproduced visible `unmountOnClose={false}` surfaces with motion disabled: Drawer reset `display:flex` overrides the native `[hidden]` rule, and the OverlayDrawerSurface proxy does not run DialogSurface's style hook. The active-directory surface style hook now emits a higher-specificity `[hidden] {display:none}` rule for surface and backdrop. Browser assertions certify actual hidden visibility and reopening. A component-local Jest regression asserts matching generated hidden rules and native hidden attributes; JSDOM computed-style specificity does not reproduce Chromium here, so it is not used to certify hidden paint. Focused Jest evidence is stored in the checkpoint.

A Beachball change file is intentionally omitted because this campaign explicitly forbids writes outside the active component directory.

## Boundaries

Electron only; no screen-reader/cross-browser/pixel certification. Inline-only separator, custom inline motion, responsive mode-switching and consumer drag resizing are not OverlayDrawer APIs. Default animations are exercised by original cases; no timeline certification is claimed. The MultipleLevels story is consumer-managed content, not nested drawers; navigation/content lifecycle assertions will be added in later rounds. Backdrop pointer tests use real coordinates because Cypress's center-point visibility heuristic treats a full-screen backdrop as covered even when its edge is reachable.

## Round 2 exact edges

Surface-prevented Escape has zero dismissal requests and retains focus/currentTarget consumer callback. Backdrop slot prevention has zero requests while preserving class/id/ARIA. Consumer-vetoed Escape records one exact request but retains open state/focus. Alert scrim rejects requests, but an accepting current Escape handler can dismiss (not falsely promised as alert suppression). Inert focus mode native Tab skips disabled action/excludes background, and disabled consumer click stays silent. It intentionally allows browser chrome focus rather than wrapping (`useModalAttributes` documents legacyTrapFocus=false); the failed initial wrap expectation was corrected to the actual supported contract. Empty named surface receives tabindex=-1 focus and supports Escape. Non-modal does not scroll-lock; null backdrop in modal does not remove its native keyboard trap.

## Round 3 units/lifecycle assertions

Unit mountNode object/class creates portal wrapper with a fixed, dismissible surface; root aside/ref/native id/title/ARIA/class/style and children survive proxying then refs and scroll lock clean up on full unmount. Deprecated defaultOpen is ignored. Same open root updates size/position/modal type/backdrop and scroll-lock state. Latest child keydown and parent request callbacks retain currentTarget/event identity/exact envelope/order. MultipleLevels adapted consumer fixture changes inner content via native Enter/Space while preserving root identity, disabled next-action rejection and explicit close/restoration (no animation/timeline certification). Consumer role/ARIA overrides survive while direct controlled open remains authoritative.
