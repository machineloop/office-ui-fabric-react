# CarouselNavContainer browser coverage

Row 111 covers only this passive layout container and its composition boundaries.
The existing conformance/unit cases are preserved. Carousel, CarouselNav,
CarouselNavButton, CarouselNavImageButton, CarouselButton, CarouselAutoplayButton and CarouselCard are
read-only fixture dependencies, not independently re-covered component assignments.

## Finite inventory

| Source                                          | Observable coverage                                                                                                                                                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public types, Spec, README and carousel stories | Default inline footer, five supported layouts (`inline`, `inline-wide`, `overlay`, `overlay-wide`, `overlay-expanded`), child Nav arrangement, localized slot names/tooltips, independent composed controls                                                                    |
| Container styles                                | All five layouts x LTR/RTL x autoplay absent/present; measured full width, token spacing, logical leading/trailing placement, expanded vertical centering and child bottom inset; live transitions and leading inset reassignment                                              |
| Slot API and renderer                           | Default prev/next icons, optional autoplay, DOM order autoplay/prev/children/next, text shorthand, empty string, null controls, null tooltips, icon omission/customization, render functions, root/slot static classes and consumer precedence                                 |
| Native props and conformance                    | Root is typed as `div` only (explicit `as="div"` tested); native attributes, role/name/description overrides, inline style, object/callback root refs, callback replacement/unmount, slot render-function refs, root identity through updates                                  |
| Composed Button props                           | Nine size/shape combinations on slots, not invented container size/alignment/shape props; overridden prev/next navType; native button and anchor activation through pointer/Enter/Space, disabled slot positive controls                                                       |
| Context and event boundaries                    | Next/prev select/reset/consumer/bubble order, late consumer click prevention versus early capture prevention, latest root/slot/context handlers, actual noncircular edge disabling/focus transfer and circular wrapping, controlled parent feedback                            |
| Accessibility                                   | Passive root has no tablist/mover/tabindex/live-region defaults; supplied named group and child tablist are exposed in Chromium AX tree; label and description tooltips; actual Tab/Shift+Tab order, LTR/RTL arrows confined to child Nav, no invented container key semantics |
| Autoplay composition                            | Actual unchecked initialization, defaultChecked/uncontrolled toggles, controlled request/feedback, pressed state, tooltip-only creation, explicit null omission, removal/remount cleanup and context-owner/handler replacement                                                 |
| Lifecycle and discovery                         | Dynamic children and card count, latest activeIndex/slide-count publications, slot subscriptions only (none owned by root), subscription replacement/disposal, context isolation, safe standalone defaults                                                                     |
| Theme and native rendering                      | Light/dark foreground and actual background behavior, forced-colors media positive control and button border/focus, live RTL icon path reversal and geometry                                                                                                                   |

Each expansion runs the whole current component suite, in the order documentation,
edges/accessibility, then unit/source-derived additions. Final runs include own
lint/format, unchanged package Cypress type configuration with separate baseline
diagnostic isolation, and relevant existing units. Machine-local commands, exact
executed titles, counts, failures/corrections and SHA256 baselines are in
`coverage101-120/CarouselNavContainer-evidence.json` outside the checkout.

## Characterizations, not fixes

- **Inherited NavButton click guard defect:** a child native
  `disabledFocusable` NavButton still selects on pointer click. The container's
  next slot uses CarouselButton's guarded Button path and does not select.
  A direct ARIA-helper positive control is also blocked. This suite does not
  endorse or fix the inherited child bug.
- **Initial child relationships:** dynamically discovered Nav buttons initially
  lack `aria-controls` because discovery is not replayed to new subscribers.
  A real resize publishes exact panel IDs; no fabricated initial guarantee.
- **Expanded autoplay negative offset defect:** styles emit
  `-var(--spacingHorizontalXS)`, which is invalid CSS. Chromium computes bottom
  as `0px` here, not the intended negative token. The first sensitive failing
  assertion is retained in documentation-round evidence. No production patch.
- CarouselAutoplayButton's introductory comment says mount enables autoplay,
  but its hook initializes unchecked/false unless checked/defaultChecked is
  supplied. The actual hook behavior is tested explicitly.
- Previous/next default subtle Button styling computes a transparent background;
  autoplay computes the alpha background token. The container itself has no
  invented themed surface.
- A consumer next/prev `onClick.preventDefault()` runs after internal navigation
  and reset. Early capture prevention can veto those internal effects.

Only `next` and `prev` are slot keys; `previous` is prose in the old Spec, not a
supported slot key or navType. No root polymorphism beyond typed `div`, no
container-controlled index, no roving root, no announcements, arbitrary invalid
input behavior, exhaustive infinite style combinations, actual AT speech or
universal browser guarantees are claimed. Tooltip portals and forced-colors
emulation are checked in Chromium/Electron, not via snapshots or sleeps.
