# TagPickerList browser coverage

## Ownership and finite inventory

`TagPickerList.cy.tsx` exercises the public component with real `TagPicker`,
`TagPickerInput`/`TagPickerButton`, `TagPickerControl`, `TagPickerOption`, and grouped
options. Documentation, API types, implementation, unit/conformance tests, and
accessibility notes were read before the expansion rounds.

The list owns the `Listbox` root composition, forced `listbox` role, context-derived
default ID, merged forwarded/popover refs, composed pointer handlers that prevent
trigger blur and restore trigger focus, and open-dependent collapse styles. Field
naming and native root props come through `useListboxSlot`/`Listbox`. Its deprecated
`disableAutoFocus` is not an independent focus-control mechanism in a real picker.

The picker owns open/selection state, portal versus inline placement, trigger
relationships, active-descendant navigation, and the option registry. Options own
registration, text/value and click selection. Integration assertions are not
claims that the list itself implements selection, filtering, automatic dismissal,
tag insertion/removal, or announcements.

D12's 12 cases exercise the same invariant list-root layout across the parent's
3 sizes x 4 appearances. Size and appearance are picker-owned configuration,
not list-specific props. This matrix is not 12 independent list behaviors or
additional list-owned variant coverage.

"Unit/source" means browser cases derived from existing Jest contracts and source
behavior; no new Jest test file was added. The final browser suite has 64 cases
(24 documentation, 20 edges/a11y, 20 unit/source). Separately, the existing
relevant Jest suites passed 130 unit cases across 9 suites.

The baseline source-hash manifest at
`coverage101-120\TagPickerList\baseline.json` contains 107 distinct tracked file
paths with SHA-256 hashes, matching the evidence's `packageSourcesUnitsStories`
inventory. This is a baseline file count, including source, units, and stories,
not a unit-test count or a claim of 107 independent contracts.

| Round                 | Cases | Finite scenarios                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation D01-D12 |    24 | Native identity, naming and relationships; pointer, arrows, Enter, Escape, outside focus; default open; button trigger; disabled picker; grouped options; both portal/inline layouts; all 3 picker sizes x 4 appearances                                                                                                                                                                                                                                                                                                                                      |
| Edges/a11y E01-E18    |    20 | Field/explicit naming precedence; descriptions; empty, text, presentation and unregistered children; headings/separators; native disabled-ARIA boundary; Tab/Shift+Tab; Home/End/page/boundary navigation; text matching without list filtering; parent/list autofocus ownership; overflow geometry in LTR/RTL; light/dark surfaces; custom-ID and option-selection-ARIA boundaries                                                                                                                                                                           |
| Unit/source U01-U20   |    20 | Default collapsed root; same-node open transitions; object/context/callback refs and null cleanup; native attributes and role precedence; consumer style overrides/static classes; render function; handler prevention/order/latest closures; controlled/uncontrolled picker and list selection ownership; dynamic ID/value/text unregistering; empty/repopulated and reordered children; separate picker registries; stale-active-ID boundary; opt-in native focus/blur/key handlers; inherited multiselect override; latest picker selection/open callbacks |

## Existing boundaries, not production fixes

- **E17:** An explicit list `id` is honored, but input `aria-controls` and control
  `aria-owns` retain the generated picker ID, which has no matching element.
- **E18:** The default selected `TagPickerOption` has neither `aria-selected` nor
  `aria-checked`; the list has no default `aria-multiselectable`. This reflects
  inherited option/listbox composition, not an accessibility success.
- **E07:** `TagPickerOption` does not expose a typed `disabled` prop. Passing the
  supported native `aria-disabled` attribute alone does not block pointer
  selection or active navigation. Do not present that attribute as a disabled API.
- **U17:** Removing all options from an open controlled picker unregisters them but
  leaves the input's `aria-activedescendant` referring to the removed option.
  No selection is emitted; repopulating restores a valid target. The list does not
  invent empty-list auto-dismissal.
- The historical package spec's `menu`/`menuitemcheckbox` roles and Space behavior
  are not treated as current list contracts. Current source forces
  `listbox`/`option`; Space handling belongs to the trigger, not this list.

These are explicit characterization cases for parent review. No published source
was changed. Electron DOM assertions do not establish screen-reader speech,
Safari/VoiceOver or Edge/Narrator behavior, touch behavior, forced-colors rendering,
or exhaustive behavior for arbitrary trees/IDs. Duplicate/invalid IDs are not a
supported fixture contract.

## Running and types

Use the package's existing Nx `e2e` target and select only
`**/TagPickerList.cy.tsx`. Test-only styles live in the local `.cy.styles.ts`
helper. `TagPickerList.cy.tsconfig.json` isolates the suite for strict type checks.
The spec supplies the global JSX declarations needed by FluentProvider's custom
runtime with React 19, using Fluent's cross-version intrinsic type helpers.
The styles helper is not an additional executed spec. No shared
package/project/tooling configuration was edited.

Machine-specific commands, exact executed names, counts, failures/corrections,
logs, native identity observations, hashes, diagnostic isolation, and limitations
are recorded in the external `coverage101-120\TagPickerList-evidence.json`.
