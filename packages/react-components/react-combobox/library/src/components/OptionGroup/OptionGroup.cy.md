# OptionGroup Cypress coverage (row 82)

No existing component-local Cypress suite was present.

## Round 1: documentation

Sources read: `library/docs/Spec.md` (grouping, allowed children, OptionGroup API
and accessibility markup), `OptionGroup.types.ts`, and these package stories:

| Source under `stories/src`                   | Browser contract                                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Combobox/ComboboxGrouped.stories.tsx`       | Named Land/Sea groups, disabled Ferret cannot select, native Tab and arrows cross group boundaries, exact selection callback |
| `Dropdown/DropdownGrouped.stories.tsx`       | Same contracts with button-hosted listbox and focus restoration                                                              |
| `Combobox/ComboboxCustomOptions.stories.tsx` | Wrapped group label slot and custom check icon survive selection                                                             |
| `Dropdown/DropdownCustomOptions.stories.tsx` | Rich Option children with explicit text, custom group label and check icon                                                   |
| `library/docs/Spec.md` multiselect grouping  | Independent cross-group checked state, disabled negative callback assertion, deselection preserves other group               |

Local fixtures preserve the story option arrays and behaviors, without
decorative animal icon imports or pixel styling. They exercise current source
through the source-audited artifact Nx runner, not a built snapshot.

## Round 2: undocumented and accessibility edges

Optional/null visual labels with consumer names, distinct IDs for equal label
text across reopen, dynamic label removal/restoration, owner-rejected selection
for both hosts, and custom label slot IDs. The latter reproduced a dangling
`aria-labelledby`: `useOptionGroup.ts` now derives the default association from
the resolved label slot, retaining explicit root ARIA overrides. Focused Jest
regressions cover both paths. No release change file is written outside the
component because of the user's explicit directory restriction.

Documentation-round adversarial findings were resolved with visible Land/Sea
text and group membership assertions, text-derived rich-option identity and
native typeahead/display checks, and negative/positive custom-check visibility.
Disabled options may be active but cannot be selected; this is the package
contract, not a skip-disabled claim. Closed popup content can remain mounted;
tests require collapsed trigger state and invisible content.

## Round 3: unit-derived browser contracts

Sources: `OptionGroup.test.tsx`, conformance configuration, `useOptionGroup.ts`,
`renderOptionGroup.tsx`, `useOptionGroupStyles.styles.ts` and public slot types.
Checks cover native root/label props, consumer classes and rich markup, refs
across unmount/remount, explicit role and external name overrides, label versus
option click/callback isolation, empty groups, and native keyboard navigation
after child replacement/reorder. No interactive controls are put inside groups.
The broad HTMLElement hook-ref annotation is pre-existing; fixtures use the
actual DIV root ref type rather than an unsafe cast.

## Running and limitations

## Mutation-derived regression

A compile-only removal of the generated separator survived the original 18
cases. The added browser case independently checks a generated, visible 1px
solid separator between groups and no trailing separator after the last group.
Group role and custom label-ID regressions were already caught by the suite.

Use `Invoke-Coverage.ps1 -Component OptionGroup -Package combobox -Target cypress`
from the persistent `coverage-81-143` artifact directory, and the same command
with `-Target typecheck`. Component-local config has no retries or skipped tests.
All keyboard events are native `cypress-real-events`. Electron coverage does not
certify screen-reader announcement or other browser engines. The package
`DropdownAccessibilitySpec.mdx` explicitly notes JAWS and Android Talkback group
label limitations; DOM naming assertions do not resolve those external issues.
