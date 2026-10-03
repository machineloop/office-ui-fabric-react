# InteractionTagSecondary browser coverage

This test-only suite covers the native secondary button, not primary-action or
TagGroup implementation ownership. Published source and original unit tests are
unchanged. The portable component-local Cypress configuration discovers only
`InteractionTagSecondary.cy.tsx`, uses zero retries and accepts external output
folders. The browser type project and ESLint adapter retain repository rules;
the JSX bridge uses the repository's React-version-compatible intrinsic types.
The styles helper contains only test fixture classes.

## Finite contract inventory

| Basis                                                  | Observable contracts                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Package spec, BestPractices, API and stories           | Native button/type, decorative default dismiss SVG, sole root slot, custom children, primary plus secondary accessible name, custom IDs with caller naming, null/undefined/empty/external label overrides and describedby.                                                                                                           |
| Appearance, Size, Shape, Disabled and Selected stories | All 72 combinations of three appearances, three sizes, two shapes, inherited disability and selection: exact rest tokens, heights, icon font sizes, split corners and disabled-selected precedence. Each size also checks actual SVG geometry; enabled appearances check hover and held pointer press.                               |
| Dismiss and current TagGroup source                    | Exact event identity and `{ value }` payload, pointer/Enter/Space/Delete/Backspace, consumer-owned removal and explicit last-item focus, next/previous group focus without removal, current toolbar role and circular arrow navigation.                                                                                              |
| Keyboard and cancellation boundaries                   | Unrelated keys, modified Delete characterization, native keydown cancellation, capture prevention, click composition/order, latest callbacks, defaultPrevented, propagation-only cancellation, native standalone forward/reverse Tab order and disabled skipping with positive controls.                                             |
| Source, hook units and conformance                     | Nullish-only icon fallback, native `as="button"`/metadata/classes/styles, native button value versus context value, empty/generated values, stable unique IDs, object/callback refs and committed unmount/remount cleanup, standalone/nested/sibling/replaced contexts, disability recovery and live name/description/theme updates. |
| Native forms                                           | Default non-submitting button, explicit submit/reset with pointer and Enter/Space, native submitter identity, external form association/metadata, consumer prevention and a working uncancelled submit control.                                                                                                                      |
| Selection integration                                  | Valid controlled or uncontrolled group selection fixtures, inherited selected styling and primary pressed state, no selection toggle from secondary dismissal, primary positive control and current controlled-state ownership.                                                                                                      |
| Browser geometry and themes                            | LTR/RTL seam geometry and tab order, border-box geometry, bounded extra-small hit extensions above/below all appearances with native clicks and outside-hit negative controls, light/dark/high-contrast provider tokens, live custom token replacement.                                                                              |
| Accessibility                                          | Computed names/descriptions, native focus and role semantics, five ordinary standalone axe scans with no rule exclusions, plus a separate unfiltered group scan characterizing the inherited Tabster sentinel finding.                                                                                                               |
| Forced colors                                          | Chromium CDP media emulation with a matchMedia positive control, all appearance borders, compact pseudo-element removal, selected system Highlight/HighlightText colors through hover/held press, and cleanup after every case.                                                                                                      |

## Honest inherited behavior and boundaries

A custom primary ID does not update the inherited context ID used in the
secondary's default `aria-labelledby`. The characterization asserts the missing
IDREF and resulting action-only name. The documented caller-supplied combined
relationship is separately verified as the valid workaround; this suite does
not silently repair or misrepresent the known mismatch.

Naming relationships are asserted as ordered, nonempty IDREF tokens against
the actual primary, secondary, or external label elements, not randomized ID
strings or raw attribute whitespace. The standalone default context supplies an
empty primary ID: there is no primary token or unresolved `undefined` target;
the remaining self-reference resolves to the secondary and its `aria-label`
provides the action-only name. An explicit empty `aria-labelledby` has no
tokens and falls back to `aria-label`; explicit null/undefined overrides omit
the attribute, while a valid external label takes naming precedence.

The nullish/falsy children matrix includes numeric `0`: its visible text is
retained without a fallback SVG, its ref still points to the native button,
and its primary/self naming references still resolve with the combined name.
Only null/undefined receive the default icon; false and empty string remain
empty content.

TagGroup's focus logic runs after its onDismiss even when that callback calls
preventDefault. This differs from preventing the secondary's own click/keydown,
which suppresses dismissal. Dismissal alone does not remove DOM or toggle
selection. Parent and sibling code are read-only integration dependencies.

An unfiltered axe scan of the initialized toolbar reports aria-hidden-focus on
its two Tabster dummy sentinels. The test asserts those exact nodes and a passing
button-name rule, rather than excluding nodes/rules or claiming the group scan
is clean. Standalone secondary scans pass ordinary axe rules.

The older package spec's listbox/option statement is stale: current source and
units use toolbar/native buttons. There is no secondary icon slot,
disabledFocusable, independent selected state, automatic dismissal, guaranteed
announcement, or alternate root element in this supported native-button suite.
Forced-colors coverage is browser media emulation, not Windows OS activation.
No complete WCAG compliance, actual assistive-technology speech, arbitrary
content/CSS, every infinite input, or universal browser behavior is claimed.

## Follow-up review disposition

The browser suite now expects 166 cases (previously 165). Minor unit-layer
coverage notes are out of scope for this browser-focused follow-up: native
Delete and Backspace each already have browser event-identity and cancellation
coverage, and nullish/falsy content is exercised in the browser matrix. The
pre-existing Jest Delete/Backspace title and its Delete-only body are unchanged;
no Jest cases, production code, or shared files are added or repaired. Token
relationships and computed names are the naming contract, not incidental
standalone attribute spacing.
