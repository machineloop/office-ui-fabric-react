# CarouselSlider browser coverage

This suite owns only `CarouselSlider`. Its actual API is a passive `div` root
slot plus `cardFocus`; it is not an input range. Carousel, Card, Nav and Viewport
are read-only integration dependencies. Existing Slider unit/conformance tests
and snapshots are preserved.

## Finite supported inventory

| Source                                                            | Slider-owned scenarios                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slider types, hook, unit/conformance tests and API report         | Default flex/group root; no generated range values, automatic name/live region or tab stop; native labels/labelledby/describedby, role, id, language/direction and data/title attributes; default/false/true `cardFocus`; caller keyboard/pointer/focus handlers                                           |
| Description and ActionCards/Eventing stories; Slider hook/context | Real horizontal focus navigation in LTR/RTL with circular context off/on; finite leading/trailing boundary; default banner Tab entry and hidden/inert offscreen actions; dynamic focus/circular context; nearest nested and independent sibling focus providers                                            |
| Default, Controlled, FirstRunExperience stories and engine        | Measured physical pages and actual track transforms in LTR/RTL, crossed with slide, slide duration 40 and fade; exact fade opacity; real native pagination/drag with drag disabled/enabled and callback event identity; reversed short drag returning to the initial page                                  |
| ActionCards and Responsive stories                                | All three alignments crossed with whitespace false/true for measured partial cards; caller gap; real root resize and automatic grouping; dynamic card widths, gaps, empty/append/reorder/remove/repopulate; keyed DOM identity and exact discovery order/count                                             |
| Appearance story and Slider styles                                | Flat/elevated inherited context; light/dark provider spacing; runtime custom theme token changes; consumer Griffel class precedence and inline style preservation; root clipping distinguished from optional consumer viewport clipping                                                                    |
| Slider renderer, context-values hook and conformance contract     | Object/callback/chained consumer refs, latest callback and null cleanup, root replacement, real Carousel remount registration without duplicate callbacks; render-function native props/ref/classes and child context; exported hook/styles/context-values/renderer composition; memoized context identity |
| Actual engine/context source                                      | Embla registration is forwarded through Carousel's root ref and Viewport, not Slider's user ref; measured navigation after reinitialization; latest native handler closures/propagation; genuine emulated reduced-motion media preference with observed intermediate physics motion and final geometry     |

Documentation, edges/accessibility and unit/source-derived rounds are run
separately as the suite expands, followed by the complete owned suite. Exact
executed titles, commands, counts, exit codes, logs, source mappings, before/after
hashes and failure dispositions live in the external `CarouselSlider-evidence.json`.
Configuration and all browser artifacts remain outside the checkout. The existing
package Nx targets run the exact Slider spec on port 18241 with retries disabled.
Windows native-window occlusion/background throttling is disabled in the scratch
launch configuration; no production motion code or assertion thresholds change.

## Inherited behavior, not passing accessibility guarantees

- A rejected controlled request can leave selected/context index zero while
  physically showing page one. A later external controlled update is honored.
- Nested Carousel cards are included in the outer engine's descendant card
  discovery. Nested focus providers are isolated; nested physical engines are
  **not** represented as isolated.
- A consumer-clipped Viewport can acquire native `scrollLeft` on arrow focus in
  addition to the track transform. Default root clipping is tested separately.
- Switching `cardFocus` on after banner navigation updates context/tab stops but
  does not clear a Card's retained offscreen `aria-hidden`/`inert` flags.
- Tabster captures handled arrows before React bubbling; an `onKeyDown`
  cancellation is not an interception guarantee. Unhandled keys still reach the
  consumer handler. Native pointer-cancel forwarding is tested separately from a
  reversed/released real mouse gesture; universal drag cancellation is not promised.

These explicitly named characterizations preserve unchanged source behavior and
are not production fixes. Earlier failing expectations and their corrections are
retained in the external evidence rather than discarded.

## Final baseline follow-up: scheduler scope

The original 54 cases and their titles are retained. The four direction/circular
focus cases observe real layout delivery, settle native focus through a real
pointer click and browser frame, and observe a trusted `focusin` event before
checking native arrow navigation. Reverse and trailing-boundary navigation,
selected values, physical alignment and mover context remain asserted.

The two fade paging cases now control only the browser frame scheduler, using
the real Embla/Fade callbacks at 60Hz after native layout delivery. Native
pagination and callback identity, intermediate complementary opacity, idle frame
queue, exact final opacity **1/0**, reverse navigation and physical geometry are
checked. Scheduler functions and focus/layout observers are cleaned up per test,
including failures. Slide cases still use native frames. No DOM styles or engine
state are fabricated, and no sleeps, retries or exception suppression are used.

This deterministic non-jump fade coverage is **not** a fix or guarantee for
unmodified native fade timing. The original master failure with opacity stuck at
0.38 is preserved in campaign `CarouselSlider\finalbaseline-followup` evidence;
the inherited native-timing limitation remains unresolved. Controlled-frame
success must not be reported as native-timing correctness or a production fix.

## Boundaries

There is no Slider index/defaultIndex, appearance, motion, drag, alignment,
orientation, range-value or autoplay API. Parent options are used only to observe
the physical track and inherited focus/style context; the parent's five control
layouts and autoplay state machine are not reimplemented as Slider features.
The component's custom style hook is also exercised after base styling, including
latest provider updates and real registered-track navigation.
The source has no Slider reduced-motion override: a real emulated preference does
not disable the parent physics motion. No actual assistive-technology speech,
universal browser/screen-reader pass, arbitrary input combinations or exhaustive
drag trajectories are claimed.

Whole-package Cypress typing has four independently captured baseline diagnostics
in CarouselNav, FluentProvider and Tooltip. Owned-suite diagnostics are checked
against that baseline without changing compiler strictness or sibling source.
