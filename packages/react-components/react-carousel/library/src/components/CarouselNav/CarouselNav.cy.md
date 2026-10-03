# CarouselNav browser coverage

The row-109 suite covers the finite supported Nav API and integrates real Carousel,
CarouselCard, CarouselSlider, CarouselViewport, and valid CarouselNavButton or
CarouselNavImageButton children. Siblings and production source remain read-only.
There was no existing Nav Cypress spec; all existing sibling Cypress cases are
preserved.

## Finite inventory

| Evidence source                         | Nav scenarios                                                                                                                                                                                                                                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nav API/types/renderer                  | Counts 0, 1, 5; ascending zero-based callback arguments per render; explicit count overriding discovery, including zero; index/appearance providers; null, inert, fragment, custom descendants, and multiple buttons sharing one index                                                                   |
| Nav description, Spec, Migration        | Parent card membership, group sizes 1, 2, auto, insertion/removal/reorder, runtime grouping, responsive automatic grouping, custom top placement, independent sibling and nested contexts                                                                                                                |
| Default story and styles                | Default and `brand` appearance, live appearance replacement, story-style image-button construction and callback replacement, selected classes and ARIA, light/dark underlay and margins, actual themed gap, consumer styling, narrow overflow                                                            |
| Nav hook and Tabster                    | Named passive tablist versus focusable tabs; real Tab/Shift+Tab group entry/exit, selected default and nonmemorized reentry; LTR/RTL arrows, finite nonwrapping boundaries, Home/End, no vertical selection; Enter/Space/click selection with exact event/index; disabled child click and arrow skipping |
| Parent context and engine               | Default and controlled active index, controlled feedback and external changes, exact selected membership, physically aligned LTR/RTL pages, initial missing controls, real resize rebuilding relationships, rejected controlled request characterization                                                 |
| Unit/conformance and exported functions | Native props/class/ref forwarding, callback ref replacement and unmount, root slot customization through exported hook/styles/context/renderer, steady-state discovery subscription and disposal/replacement, latest root/child callbacks, child veto versus late bubble veto                            |

The render callback is invoked once per index **per render**, not once over the
component lifetime. The development harness can render more than once. Explicit
`totalSlides` controls Nav generation; parent `navItemsCount` is the actual number
of engine groups, not necessarily card count. Callback output does not register
additional pages. Returning two buttons for an index deliberately creates two
selected tabs for that index; the consumer owns that output.

The public root has one slot. Public `children` is the index render callback,
not a root slot render function. The low-level composition test intentionally
uses the exported hooks/renderer and slot helper to customize root rendering.
Nav has no direct `disabled`, selected-index, orientation, or gap prop. Disabled
children and consumer styles are tested instead. The supported appearance literal
is `brand`; the best-practices prose's `branded` is not the typed API.

## Actual ownership and inherited limits

- Nav owns a horizontal, noncircular Tabster mover and an index/appearance provider.
  Arrows/Home/End move focus, not selection. NavButton click handling and the parent
  Carousel own activation/active state. Tabster sentinels are not generated items;
  empty tests exclude only its `data-tabster-dummy` elements and require no text.
- Initial dynamically generated tabs have no `aria-controls`, because parent
  discovery is published before those children subscribe and subscriptions do not
  replay. This absence is explicitly characterized; a real resize proves subsequent
  exact panel-ID relationships. Remounting an uncontrolled subscriber likewise
  needs a new publication, rather than receiving cached discovery.
  The LTR/RTL dynamic tests resize once after insertion so newly subscribed tabs
  receive that publication, then require every surviving tab's exact ordered IDREF
  and existing `tabpanel` endpoint after reorder and removal **without another
  resize**. Removed endpoints must be absent. Initial missing-controls
  characterization never permits stale or missing controls after publication.
  Both directions also check real arrow focus and actual reordered-page alignment.
- Native-disabled children receive an attempted real click after an enabled
  native-click positive control; callback count and active state stay unchanged.
  Real forward/reverse Tab skips a disabled selected tab, entering the first/last
  enabled tab respectively. No native-disabled element is forcibly focused or
  given synthetic Enter/Space events to invent an unreachable state.
- The public `as="a"`, `role="tab"`, `disabledFocusable` path receives real
  Enter/Space and blocks activation, with an enabled keyboard positive control.
  Explicit `role="tab"` preserves Nav semantics because the ARIA polymorphic
  anchor default is `button`. **Known inherited bug:** native button
  `disabledFocusable` remains focusable and `aria-disabled="true"` but activates
  on real Enter/Space. `useCarouselNavButton` replaces `useARIAButtonProps`' guarded
  click handler; native key activation reaches that unguarded handler. Two
  characterization cases disclose this behavior rather than claiming disabled
  keyboard conformance. No production fix is included.
- Story-supported image buttons receive real Enter and Space through the index
  render callback, without manual index props. Both cases require one callback,
  exact `{ event, type: 'click', index: 2 }` payload/event identity, four rendered
  tabs, focus retention, and exactly one selected tab.
- Handled arrow events are intercepted by Tabster before React key capture. The
  test proves no capture callback for the handled arrow and a positive Enter
  callback/activation; React `preventDefault` is not presented as an arrow veto.
  A child click veto prevents selection; root bubble cancellation is too late.
- Rejected controlled parent requests keep Nav ARIA/context at the controlled
  index while the engine can physically display the requested page. The unchanged
  inherited inconsistency is characterized, not fixed.
- Nav does not own card inert/visibility policy or announcements. Its tabs remain
  noninert while selection styling changes. The initial default-page-to-card Tab
  boundary depends on parent visibility initialization; isolated mover entry/exit
  is tested without inventing a parent guarantee.
- The known parent polite-announcement request/shared assertive-DOM mismatch is
  outside Nav's ownership. No Nav live region, actual assistive-technology speech,
  or announcer fix is claimed.

Only finite nonnegative integer counts are fixtures. Arbitrary invalid numeric
inputs, all possible callback outputs, all overflow sizes, every browser, and
infinite combinations are not exhausted.

## Execution and evidence

The existing `react-carousel:e2e` target is wired to the portable Nav-local
configuration, reusing the already wired Carousel configuration on port 18241.
Only `CarouselNav.cy.tsx` is matched. The reporter writes exact executed title,
state, attempts, and error data when `FLUENT_RESULTS` is provided. Screenshots,
videos, downloads, commands, dispositions, source hashes, and
`CarouselNav-evidence.json` live outside the checkout in the parent session's
`coverage101-120` evidence directory.

Documentation, edge/a11y, and unit/source-derived expansion rounds are run
separately, followed by the full Nav suite, own lint/format, unchanged Cypress
typing, and relevant existing units. There are no sleeps, test retries,
skip/only, snapshot-based functional assertions, production patches, or commits.
Review follow-up expands the prior 59 cases to **67**: one added RTL dynamic
case, one native-disabled Tab case, four public disabledFocusable keyboard cases,
and two image-button keyboard cases; existing dynamic and disabled-click cases
are strengthened. Two independent full accepted runs must execute all 67 cases
with one attempt each, no pending/skipped cases, sleeps, or configured retries.
The unchanged relevant unit inventory remains seven suites / 141 tests.

Whole-package Cypress typing is **not green**: four inherited diagnostics remain.
These include **own-component production source** `renderCarouselNav.tsx` TS2322
(`key` on `ProviderProps`), FluentProvider TS2741 and TS7026, and Tooltip TS7026.
Baseline isolation removes only the new Nav spec and retains production
source/compiler settings. The claim is **zero NEW test-suite diagnostics and
zero added/removed baseline diagnostics**, not zero diagnostics anywhere in
CarouselNav. The own-source renderer baseline remains disclosed and unchanged.

Review disposition: all four nonblocking follow-ups are addressed within the
owned test/documentation surface. Native disabledFocusable activation, initial
missing controls, and the earlier controlled-engine/context and Tab/announcement
limits remain disclosed inherited behavior; no production/shared/sibling
configuration changes, agents, or commits are part of this follow-up.
