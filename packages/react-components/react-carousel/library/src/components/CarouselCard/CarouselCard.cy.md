# CarouselCard browser coverage

Scope: `react-carousel`'s CarouselCard, not `react-card`'s Card. Production and all
sibling components are read-only. Existing Card unit/conformance cases remain
unchanged; there was no pre-existing Card Cypress spec.

## Public finite inventory

Read the package README, Spec, Migration, API report, all Carousel stories,
Card hook/renderer/styles/types/unit/conformance, Carousel/Slider contexts,
Embla registration/visibility and pointer implementation. Applicable stories:
Default, Appearance, Responsive, AlignmentAndWhitespace, Controlled, Eventing,
ImageSlideshow, TopNavigation, FirstRunExperience and Autoplay.

Card owns `autoSize`, one div root slot, content, generated/explicit native id,
focus/pointer callback composition, visibility listener and contextual appearance.
DOM order and sizing register slides in Embla; there is no Card `value`, `index`,
selection state, disabled state, announcement, header/footer or selection API.
README's `index`, migration's `focusMode`, and the old CarouselAnnouncer sample
are not current Card props. Default role is `tabpanel`, not `slide`; names,
descriptions and `aria-roledescription="slide"` are consumer native attributes.

Documentation round: empty/nested content; passive/default semantics; generated
unique/stable and explicit ids; native ARIA relationships; default/false/true
autoSize; intrinsic/oversized/CSS sizes; positive viewport/offset/gutter geometry;
DOM order registration; uncontrolled initial and accepted controlled navigation;
flat/elevated and light/dark contexts; user style precedence; LTR/RTL; multiple
consumer actions per registered item.

Edges/accessibility round: active/inactive banner ARIA and inertness; real forward
Tab through active buttons/links; consumer click handlers and disabled descendant
buttons; passive root clicks; cardFocus limited group metadata, offscreen focus,
Enter/Tab/Escape and directional LTR/RTL arrow focus; partial-card peeking with
positive visible bounds; keyed add/remove/reorder and preserved DOM identity;
zero/one/zero registration; independent root id/focus/appearance isolation; nested
root registration; cardFocus mode switching; draggable off/on positive controls.

Unit/source round: object and changing callback refs including removal; root
children render functions with native props/ref/actual registration; exported
hook/styles/renderer composition; visibility detail and non-bubbling behavior,
detached-node listener cleanup, latest cardFocus policy; consumer engine-event
listeners via refs; setTabsterDefault missing/present metadata preservation;
grouped first-card default focus; consumer versus contextual tabIndex; consumer
focus handler ordering and cancellation; pointer focus suppression/reset, both
pointerdown/pointerup cancellation branches and one-time mouse marker consumption;
latest callbacks, context selector and scroll container ref; changing child sizes
and autoSize with preserved registration; token margin geometry for circular
partial-card layouts.

## Defects and runtime characterizations

The green suite includes three clearly named characterizations, not endorsements:

- Nested roots: outer Embla slide discovery includes nested cards. A two-card
  outer root containing two inner cards reports four slides; inner registration
  remains local. The initial isolation assertion failed and is retained in evidence.
- Switching banner mode to cardFocus leaves the previously hidden cards
  `aria-hidden="true"` and inert despite `tabIndex=0`. Switching back and navigating
  re-exposes a card. Fresh cardFocus accessibility is tested separately.
- In this Electron/Cypress/Tabster runtime, reverse Tab from navigation attempts
  the last inert card, moves the carousel there and loses focus to the body.
  Forward native Tab has positive accessible-content controls. Direct inert
  `.focus()` investigation produced an untrusted focus event; therefore neither
  that attempt nor the reverse-Tab observation establishes behavior outside this
  instrumented runtime. Independent non-Cypress reproduction is needed before
  assigning a production cause.

No production fixes were authorized or made. Failures, original expected
assertions, screenshots and corrections remain in session evidence.

## Execution and boundaries

Component-local configuration reuses the existing read-only Carousel wiring
(webpack port 18241), changes only the exact spec, and optionally exports actual
Cypress run results via `FLUENT_RESULTS`. No shared config changes, new packages,
diagnostic fixtures in source, snapshots, test retries or arbitrary sleeps.

Per-round logs, exact case names/results, commands, source hashes, limitations,
defect dispositions and independently isolated baseline type diagnostics belong
in session evidence `coverage101-120/CarouselCard-evidence.json`.

Pinned finite inventory: 57 executed cases (18 documented, 17 edges/accessibility,
22 unit/source-derived), including the three characterizations. All existing unit
cases and the committed root Carousel suite are preserved. The unchanged strict
package Cypress type configuration has four inherited diagnostics in
CarouselNav/FluentProvider/Tooltip; baseline comparison must have zero added or
Card-owned diagnostics, not claim a clean whole-package type check.

Real Electron geometry, keyboard and pointer assertions do not claim actual
screen-reader speech, an automated axe audit, exhaustive infinite inputs or
universal browser behavior. Source-branch pointer cancellation tests dispatch
explicit pointer events followed by real keyboard input; real clicks and native
pointer dragging separately exercise integration.

## Isolated mutation follow-up

The isolated campaign strengthens the existing native-ID case with lifecycle
assertions, preserving all 57 primary cases and their original assertions.
The immutable runner rejects count overrides, so no new test case is added.
Freezing `props.id` at mount survived the original suite: its generated-ID
stability, static explicit-ID, and keyed membership tests never changed the ID of
an existing card. This is a supported native-prop gap, not an equivalent mutant.

The added fixture positively checks the original ID, DOM registration and ref before
renaming. It checks the latest ID and native data value on the same root, current
navigation `aria-controls`, stable naming/decorator attributes and no old-ID
element. Adding a card then checks the actual updated registration IDs, counts
and groups; removal checks null ref, disconnected DOM, no ghost registration and
remaining-card index selection. It invents no Card `value` or `index` API and uses
only cardFocus, uncontrolled navigation, and valid native relationships.

All three known-defect characterizations remain separate and unchanged. No
production fix is implied. Campaign execution uses port 18341; raw mutation,
restoration, identity and strict type-parity evidence live in the session's
`mutations101-120/campaign/CarouselCard/CarouselCard-report.json`.
