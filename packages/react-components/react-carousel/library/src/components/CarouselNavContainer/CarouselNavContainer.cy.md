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

## Autoplay effect settlement

The uncontrolled defaultChecked lifecycle case waits with ordinary retryable
Cypress stub assertions, separately from DOM pressed-state assertions. It checks
the complete ordered argument history at mount, both toggles, unmount and remount.
The native mount helper enables React StrictMode: initial mount and remount each
produce `true, false, true`; each checked-state change first cleans up with `false`
and then enables its new value; unmount adds `false`. Exact histories prevent a
previous callback from satisfying a later transition. No callback is skipped and
no sleeps, retries or scheduler overrides are introduced.

The unchecked initialization/toggle and controlled-feedback cases use the same
retryable called guard before inspecting exact last arguments. They settle the
initial callback and record its count; transitions that actually change checked
state must publish a newer callback. Controlled clicks still request exactly one
checked change while the parent refuses it: pressed state and the last enable
argument remain false until external feedback, without requiring an invented
effect call for the refused request. Native pointer/Enter/Space cases settle the
initial enable callback before clearing event data, and settle autoplay's fresh
callback before taking the unchanged exact event-order snapshot. Prev/next do not
require a new autoplay callback. The controlled request callback is also settled
before its exact one-shot data snapshot. Existing stronger StrictMode lifecycle
histories remain unchanged.

The complete consistency fix changes only this spec and these coverage notes.
Two fresh full runs and the final restored guard each pass 89/89 with no
pending/skipped cases. The native-handler catalog rerun completes all 89 with
81 passing and eight causal AssertionErrors for removed next-slot callbacks;
the autoplay settlement cases pass. The other four catalog kills are preserved
historical evidence, not fresh changed-spec results. Lint and read-only formatting
checks pass; types retain exactly the four inherited diagnostics with baseline
parity. Production, dependencies and the global harness remain unchanged.

The final-current-master historical run
`20261005-041037-484-CarouselNavContainer-final-restored-master` completed 89 cases
with 88 passing and one TypeError: `enable.lastCall` was null even though the first
mount already exposed `aria-pressed="true"`. DOM publication alone is not a passive
effect barrier. This is a test synchronization correction, not a production fix
or an added case; the suite remains 89 cases. Fresh isolated evidence and mutation
causality are recorded in the CarouselNavContainer campaign report.
