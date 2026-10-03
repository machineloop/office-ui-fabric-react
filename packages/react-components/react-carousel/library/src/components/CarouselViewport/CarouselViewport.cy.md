# CarouselViewport browser coverage

This suite is scoped to the viewport's native root, refs, handlers, styles and
context boundary. `Carousel`, `CarouselSlider`, `CarouselCard` and `CarouselNav`
are read-only integration dependencies, not additional assigned components.
There was no existing viewport Cypress suite to replace. The original unit suite
and snapshot are unchanged.

## Supported finite inventory

The viewport API has one `div` root slot and no independent selection, progress,
announcement, controlled-index or motion prop. Its slot documentation defines
the visible/interactable outer container. The carousel stories provide default,
controlled, draggable, responsive, elevated, slide/fade and custom-clipping
compositions; those root/card/control features are only exercised where needed
to observe viewport ownership.

| Area                        | Observable contracts and finite cases                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root/native API             | Empty presentation div; default `draggable`; explicit role, label, ID, language, direction, tabindex, title, class and inline style; native click/pointer/keydown; render-function root; exported hook/style/context-values/renderer composition                                                                                                                                           |
| Refs/lifecycle              | Object and chained callback refs; same-root rerender; callback swap; keyed root release/rebind; provider-ref swap; nested provider isolation; unmount release; full-carousel remount                                                                                                                                                                                                       |
| Registration/IDs            | Separate root and viewport refs; inner-track card discovery; zero/one/multiple cards; consumer/generated card IDs; cross-context uniqueness; mutation discovery; control-to-card rather than control-to-viewport relationships                                                                                                                                                             |
| Geometry/motion             | Root-owned overflow versus consumer viewport clipping; viewport smaller than outer root; measured full-width pages in LTR/RTL; border-box padding/border versus inner-track width; resize; uncontrolled initial page; controlled index and latest root handler; explicit fade jump; controlled-frame non-jump fade, jump fade and non-jump slide; viewport never receives track transforms |
| Events/autoplay boundary    | Real keyboard entry, internal focus, external/null blur; real mouse enter/leave; mouse/focus interlock; consumer-before-internal ordering including default prevention; latest consumer/provider callbacks; root focus; no invented unmount-resume callback                                                                                                                                |
| Accessibility relationships | Consumer label/description ID resolution; default absent live/selection/tab semantics; real arrow-focus navigation in LTR/RTL; offscreen inert focus rejection with a current-child positive control; independently scoped contexts                                                                                                                                                        |
| Styling/environment         | Consumer Griffel and inline priority; latest custom style hook after base styling; light/dark/custom token updates; emulated reduced-motion media characterization                                                                                                                                                                                                                         |

## Characterizations and unresolved limits

- The viewport does not clip overflow by default. The carousel root clips
  horizontally; consumer viewport clipping is a distinct, optional box.
- Initially created navigation controls can miss `aria-controls`. Resize
  discovery associates them. Existing controls update on card mutation, whereas
  a newly created control needs a subsequent discovery notification in the tested
  composition. This is not a complete initial ARIA-association guarantee.
- With `cardFocus` and consumer `overflow: hidden`, native keyboard focus can
  scroll the viewport by a page in addition to Embla moving the track. The suite
  explicitly characterizes this scroll, rather than claiming an aligned clipped
  keyboard experience. Unclipped arrow navigation has separate geometry checks.
- Replacing only the keyed viewport rebinds its ref but does not automatically
  retarget the retained root's engine. Selection can change while the new track
  remains at its initial position. Full-carousel remount is tested separately.
- The viewport provides slider context with `cardFocus: undefined`; a nested
  slider supplies its explicit value. This is observed behavior, not a new
  viewport focus API.
- The intrinsic-prop filter forwards animation handlers but currently filters
  `onTransitionEnd`. A real native transition event listener is the positive
  control for the synthetic event dispatch; no CSS page-transition ownership
  is implied.
- Reduced-motion media is not consumed by this viewport or the tested inherited
  slide engine. The test verifies the emulated media and continued non-instant
  motion; it does not claim a reduced-motion adaptation.
- Real Embla drag fixtures explicitly cancel native HTML drag-start, with both
  enabled and disabled engine controls. Earlier uncancelled native-drag
  experiments and subsequent focus/fade failures are retained in evidence.
  Their interference is not represented as a successful default drag guarantee.
- Native-scheduled non-jump fade settlement produced mixed-opacity/timeout
  observations in some runs and passed in others. The failing reproduction and
  raw logs remain in session evidence. The three additional controlled-frame
  cases below verify non-jump motion separately from the original explicit jump.
  They do not establish reliable native-scheduled completion or fix production.

## Deterministic non-jump motion follow-up

The original 50 case contracts are preserved. The banner case's focus apparatus
is corrected as described below, not skipped or weakened. Three additional cases
use the real carousel context selection, Embla engine and fade plugin. Native
resize delivery and a real frame establish the mounted fixture before controlling
the browser `requestAnimationFrame`/`cancelAnimationFrame` scheduler. Each queued
callback receives a monotonically advancing 60 Hz timestamp. They
do not replace plugin logic, write opacity/transform, force a jump for the
non-jump case, fabricate an effect, or wait for a wall-clock timeout.

| Scenario       | Observable phases and controls                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Non-jump fade  | Initial outgoing/incoming opacity 1/0; trusted native click callback with index 1 and matching event identity before advancing frames; positive animation scheduling; eight frames yield a complementary, strictly intermediate fade pair; queued animation becomes idle within 240 further frames; final incoming/outgoing opacity 1/0, aligned incoming geometry and correct pointer-events. Track translation stays disabled. |
| Jump fade      | Same trusted native selection callback; immediate incoming/outgoing opacity 1/0 and aligned geometry before advancing any frames. This positively distinguishes the jump branch from non-jump animation without attributing every global frame request to Embla. Any queued callbacks are drained before restoring the scheduler.                                                                                                |
| Non-jump slide | Real selection callback and positive frame scheduling; both cards retain opacity 1; intermediate geometry and translated track prove motion is present but the fade plugin is absent; the engine terminates its scheduler and aligns the selected card.                                                                                                                                                                          |

All three check viewport and outer-root opacity 1, unchanged left/width geometry,
and absent root/viewport transforms at initial, selected, intermediate (where
applicable) and settled phases. Rendering must not invent extra selection
callbacks or CSS animation lifecycle events. After restoring the original
scheduler, real browser rendering and an attribute-mutation event barrier settle
visibility/inert discovery. The selected action must be the native hit-test
target and receive a trusted pointer click through the consumer viewport handler.
Opacity and boundary invariants are checked again after that click.

The synthetic frame IDs are negative to avoid collisions with browser-issued
IDs; cancellations of native IDs still reach the original browser function.
Original function identities are asserted on restoration. Successful cases
drain the frame queue and restore before native pointer verification; a
suite-wide `afterEach` also restores on failure, clears test-local queues,
disconnects observers and unconditionally resets emulated media. Embla's
animation closure looks up both scheduler functions on its captured owner
window for each call; it does not retain the installed stub as a separate
module-global scheduler.

Real DOM `getAnimations()` is checked on the root, viewport, track and both
observed cards at every phase: there are **zero WAAPI effects**. This is a
source-backed limitation, not a missing-effect fallback. Read-only
`useEmblaCarousel.ts` loads `embla-carousel-fade` only for `motion="fade"`;
the installed plugin's `select`, `fade`, `settled` and `setOpacity` functions
update inline styles through Embla's frame loop. There is no effect timing,
keyframe list or `currentTime` to seek/pause. Adding test-created WAAPI effects
would test an invented implementation instead of this documented composition.

The stable contract is therefore **controlled-frame non-jump settlement**,
not a mixed-opacity characterization and not a native-timing reliability claim.
Earlier opacity 0.44 and 30-second settlement failures remain known nominal
failures; a separate run reaching opacity 1 disproved a constant mixed-opacity
invariant. Source inspection does not prove that nominal completion is
impossible, nor identify a universal product defect.

## Banner-focus diagnosis

Both earlier 53-case runs failed at the first `view-action-0` keyboard assertion,
before any of the three motion cases or the reduced-motion case executed.
An instrumented reproduction recorded an **untrusted `focusin`** on the inert
offscreen action after its intercepted `.focus()` call. Native focus itself was
rejected, but that synthetic event reached the carousel's focus-selection
handler. The subsequent trusted Tab entered the current action, then focus left
it for the document body. This was fixture interference, not evidence of a
motion-stub or media leak causing that first failure.

The AUT focus method is Keyborg's wrapper around Cypress's focus interceptor;
using its `HTMLElement.prototype.focus` is not a native bypass. A diagnostic
run using that method happened to pass, then failed again. The corrected
rejection check borrows the unmodified browser focus method from the same-origin
runner document and calls it on the actual AUT child, without changing any
global. The same method must focus the visible child and produce a trusted
consumer focus callback, while the inert child produces none and selection
remains on page zero. Real Tab entry is retained before and after selection,
with a native frame barrier and immediate active-element assertions rather
than polling, sleeps or retries.

Native pointer checks also exposed initially unsettled resize/visibility
notifications in the new fixtures. Their initial ResizeObserver delivery is
now an explicit event barrier before installing the controlled scheduler.
Post-motion inert discovery uses a MutationObserver event barrier, not an
assumption that two frames always suffice. The selection control has its own
block so root clipping cannot hide it after the inline engine probe. These
test-fixture corrections do not mutate production, fake visibility events,
write inert/opacity/transform, or imply native-scheduled fade reliability.

Animation-handler forwarding uses explicit native event dispatch, not a real
CSS animation or animation snapshot. Browser focus, pointer and keyboard
interactions use real events where stated; ref and inert checks use direct DOM
observations. There are no sleeps, test retries, skipped cases, broad exception
suppression or asserted screen-reader speech. These tests are finite Electron
observations, not a full accessibility audit or exhaustive browser/input matrix.

## Execution and evidence

Use the package's existing Cypress/Nx wiring and select exactly
`**/CarouselViewport.cy.tsx`. Test-only Griffel rules live in the adjacent styles
helper. No shared configuration or production component is changed.

The row-113 evidence file is `CarouselViewport-evidence.json` in the instructed
session evidence directory. It records exact executed titles, round commands,
raw result/log hashes, corrections, source inventory, unchanged original-file
hashes, final gates and independently isolated package type diagnostics.
The motion follow-up and focus-isolation follow-up record exact scenarios,
full-suite rounds, gate parity and retained failures there; previous evidence
is not overwritten as a success. The earlier two follow-up runs remain recorded
as 52/53 with the banner failure. The final unchanged spec passes **53/53 twice**
in fresh Electron runs (`focus-isolation-green-full-first` and
`focus-isolation-green-full-second`), with one attempt per case, zero failed,
pending or skipped cases, and all original 50 titles retained. Intermediate
diagnostic runs and failed pointer/initialization experiments remain recorded,
including the isolated pass that did not establish reliable native focus.
Scoped lint/format pass. Cypress types reproduce exactly the four isolated
production baseline diagnostics, with no added diagnostics. Row 113 is ready
for independent review, not committed; the native-timing limitation remains.
Webpack port 18241 and artifact destinations are supplied by session-only
configuration, not machine-specific paths committed into this component.
