# CompoundButton browser coverage

This component-local suite preserves production source and existing unit tests.
There was no existing CompoundButton Cypress spec at the starting baseline.
Button and MenuButton are read-only contract references, not fixture substitutes.

## Finite inventory

| Source                                                                                         | Browser scenarios                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stories/src/CompoundButton/CompoundButtonDescription.md`, `CompoundButtonDefault.stories.tsx` | Default native non-submit button; primary text node inside the default content container; a separate secondary span; primary and secondary jointly name the action. No invented primary-text slot.                                                                                                                                                                                                                                     |
| `CompoundButtonAppearance.stories.tsx`, `Button.types.ts`                                      | All five supported appearances, three sizes and three shapes (45 combinations), with action and theme-backed typography/target dimensions.                                                                                                                                                                                                                                                                                             |
| `CompoundButtonSize.stories.tsx`, `useCompoundButtonStyles.styles.ts`                          | Primary-only, secondary-only, both-text and icon-only content at every size; compound icon dimensions and actual icon-only width/height, not an invented square guarantee.                                                                                                                                                                                                                                                             |
| `CompoundButtonShape.stories.tsx`                                                              | Rounded, circular and square radii, including their combinations with size and appearance.                                                                                                                                                                                                                                                                                                                                             |
| `CompoundButtonIcon.stories.tsx`, `renderCompoundButton.tsx`                                   | Before/after DOM order and actual geometry in LTR/RTL; vertical primary/secondary stacking; caller-owned Tooltip label; visible string icon naming.                                                                                                                                                                                                                                                                                    |
| `CompoundButtonWithLongText.stories.tsx`, inherited Button best practices                      | Caller-constrained width, long primary/secondary wrapping without root clipping, and minimum target size at default variant dimensions. Width is a consumer style, not a CompoundButton prop.                                                                                                                                                                                                                                          |
| `CompoundButtonDisabled.stories.tsx`, inherited `useARIAButtonProps`                           | Disabled, disabledFocusable and combined flags for native buttons, button-like anchors and href anchors; forward/backward Tab, actual disabled attributes, removed href, suppressed callbacks, re-enabled positive controls.                                                                                                                                                                                                           |
| `CompoundButton.types.ts`, `useCompoundButton.ts`                                              | Icon, secondary and content-container native attributes/classes, callback refs and ref cleanup; latest slot handlers, bubbling and preventDefault; root refs across button/anchor replacement and unmount.                                                                                                                                                                                                                             |
| Slot renderer and inherited Button base hook                                                   | Root and each slot's render functions retain native props, handlers, refs, icon and renderer-supplied primary/secondary children. Headless recomposition keeps native actions but does not invent styled classes or visual guarantees.                                                                                                                                                                                                 |
| `ButtonContext.ts`, `useCompoundButton.test.tsx`                                               | Default secondary/medium/rounded/before values; explicit values and omission; context size inheritance, explicit override, dynamic defaults, nested-provider and sibling isolation. There is no checked/defaultChecked or internally controlled selection API.                                                                                                                                                                         |
| `useCompoundButtonBase.test.tsx`                                                               | Optional/empty icon and secondary slots; icon-only classification; actual secondary-only rendering; omission of visual styling in the base hook; numeric-content controls and defect characterization.                                                                                                                                                                                                                                 |
| `CompoundButton.test.tsx`, conformance setup                                                   | Native button/link roles, pointer/Enter/Space activation, tab order, disabled focus policy, root/slot static classes and live refs. Accessible names/descriptions are DOM computations, not a claim about screen-reader speech.                                                                                                                                                                                                        |
| Inherited ARIA hook and native HTML contracts                                                  | Actual same-document href navigation by pointer/Enter/Space; latest click cancellation; keydown Enter and keyup Space prevention; non-activation keys; true/false Boolean/string aria-disabled; explicit tabIndex omission/restoration.                                                                                                                                                                                                |
| Native HTML forms                                                                              | Submit/reset × disabled/disabledFocusable/both/aria-disabled × pointer/Enter/Space (24 cases), with enabled positive controls, external form association, submitter name/value and observable reset values. Callback suppression alone is never treated as proof of cancelled native defaults. A native-disabled element cannot be keyboard-focused: the fixture proves failed native focus before sending keys to a neutral boundary. |
| Compound and inherited style hooks                                                             | Light/dark theme tokens at rest/hover/press, all appearance secondary colors; disabled secondary colors; actual CDP forced-colors primary/subtle/disabled rules with media cleanup; consumer class and inline-style precedence and removal.                                                                                                                                                                                            |
| Consumer lifecycle boundaries                                                                  | Live primary/secondary content and icon-position changes; optional-slot ref nulling/remount; root click/focus/blur/key closure replacement/removal; focused loading recipe, completion, reset and unmount. Loading, busy state, completion and announcements belong to the consumer, not a built-in loading API.                                                                                                                       |

## Known defects and baseline distinctions

The current CompoundButton-specific truthiness calculation loses a numeric-zero
primary child beside a populated icon when secondary content is absent, and loses
numeric-zero secondary content beside a populated icon when primary content is
absent. Both create an unnamed icon-only action if the caller supplied no label.
Numeric-zero icon shorthand is rendered but incorrectly classified as text-layout,
retaining an empty content container and the non-icon-only minimum width.
Positive controls preserve zero without an icon and when the opposite text slot
is populated. These are defects, not supported semantics or endorsed behavior.

Three explicitly named characterization cases record the current incorrect result.
Running with `--env compoundSensitive=true` additionally registers three correct
expectations that intentionally fail on this source. These sensitive failures must
be retained until production changes are authorized. No test is skipped, marked
only, or silently rewritten to claim the correct behavior.

The known older shared native disabledFocusable form bug is **not present at the
starting checkout baseline**. Shared `useARIAButtonProps` already uses a cancelling
click handler on native buttons, including focusable-disabled form actions.
Commit `d73faa812879fb2742db3f0cb108a3b16d7c7c83` supplies the inherited fix;
this assignment does not implement or take credit for it. Current submit/reset
native-effects cases therefore pass. CompoundButton still overrides the shared
Button zero-content classification with its own faulty truthiness expression.
MenuButton's zero-aware and expanded-state contracts are not transferred here.

Headless primary/secondary adjacent inline text computes as `ActionDetails`
without the styled column separation. Generic slot `title` attributes can replace
the subtree's computed name in the DOM accessibility-name implementation:
the render-function cases assert those actual names and separately verify visible
primary/secondary contents. Consumers must not assume a title is naming-neutral.

## Execution and isolation

The four before/after × LTR/RTL layout cases also measure the horizontal distance
between the icon and content-container bounding boxes against
`spacingHorizontalM` (with a half-pixel rounding tolerance). Non-overlap alone
missed an owned margin-direction regression: inherited Button margins can still
separate the slots while the Compound-specific token gap is lost. This
strengthening adds assertions to existing cases, preserving the 179-case standard
inventory and keeping the three opt-in known-zero correctness probes separate.

Use the existing `react-button:e2e` Nx target with a command override selecting
`CompoundButton.cypress.config.cjs`, component mode and Electron. The nested
configuration is portable, selects exactly `CompoundButton.cy.tsx`, defaults to
port 18241, and uses the component's strict Cypress-only tsconfig. Runtime output
directories are supplied through Cypress environment variables outside the checkout.

Run documentation, edge/accessibility and unit-derived expansions separately,
then the complete suite. Evidence records exact titles, counts, commands, exit
codes, source hashes, fixture corrections and sensitive failure dispositions.

The JSX compatibility declarations are test-only, using the existing
component-local `*.stories.ts` convention to stay excluded from production
compilation. They restore the global JSX namespace expected by imported runtime
sources without enabling Jest types, casts, or weakening strictness. The local
ESLint configuration uses the same strict Cypress project for that declaration
file, which the shared project service otherwise cannot discover.

This is finite Chromium/Electron browser coverage, not exhaustive arbitrary
React nodes, every width/zoom/font, cross-browser navigation, OS high-contrast
palettes, actual assistive-technology speech, or visual snapshot coverage.
Token-sized constrained width and positive geometric checks do not establish
universal responsive layouts. Forced-colors assertions use the browser's own
system-color resolution. The loading fixture is a deterministic consumer-owned
state machine and makes no asynchronous server/timer or cancellation guarantee.
