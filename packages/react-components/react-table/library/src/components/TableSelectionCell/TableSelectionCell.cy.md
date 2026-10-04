# TableSelectionCell browser coverage (component 121)

## Scope and source inventory

Only this component directory is changed. Production implementation is unchanged.
`TableSelectionCell.cy.stories.tsx` contains **45 executed scenarios**, including nine actual selection story compositions.

Sources inspected:

- `TableSelectionCell.tsx`, `TableSelectionCell.types.ts`, `useTableSelectionCell.tsx`,
  `renderTableSelectionCell.tsx`, `useTableSelectionCellStyles.styles.ts`, `index.ts`.
- `TableSelectionCell.test.tsx`: conformance/static classes, default checkbox,
  nonnative DIV/cell semantics, radio rendering, invisible radio omission.
- Shared implementation dependencies: `TableCell/useTableCell.ts`, `TableCell.types.ts`,
  `Table/useTableStyles.styles.ts`, `TableRow/useTableRowStyles.styles.ts`,
  Checkbox hook/render/styles, and DataGridSelectionCell hook (integration boundary only).
- `stories/src/Table/index.stories.tsx`, `TableDescription.md`, `TableBestPractices.md`:
  primitive composition, optional business-logic hooks, named tables with headers,
  grid semantics for custom navigation.
- All stories directly using TableSelectionCell: `MultipleSelect`, `MultipleSelectControlled`,
  `SingleSelect`, `SingleSelectControlled`, `SubtleSelection`, `SelectionWithCellActions`,
  `Virtualization`, `Memoization`, and `DataGrid`.
- Browser/config prior art: `Table/Table.cypress.config.cjs`,
  `TableBody/TableBody.cypress.config.cjs`, `TableBody.cy.stories.tsx`,
  `TableBody.cy.tsconfig.json`, package Cypress support.

## Scenario-to-source manifest

| Scenarios | Source contract                                              | Observable browser checks                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–4       | MultipleSelect / MultipleSelectControlled stories            | Default two selected rows; mixed header's native indeterminate state; all/none/partial transitions; row and checkbox pointer selection; Space row/select-all; no duplicate activation; every row's input checked and aria-selected state.                       |
| 5–6       | SingleSelect / SingleSelectControlled stories                | Initial selection; pointer/Space replacement; one selected row; invisible header retains a cell without a radio.                                                                                                                                                |
| 7         | SubtleSelection story / styles                               | Unchecked hidden, row hover reveal, pointer exit hide, Tab focus reveal, selected indicator persists after focus leaves.                                                                                                                                        |
| 8         | SelectionWithCellActions story                               | Edit pointer and Space do not toggle selection; checkbox still does.                                                                                                                                                                                            |
| 9         | Virtualization story                                         | Flex row selection survives actual scroll/unmount/remount; first row's absence at bottom is asserted, not inferred from a nonmatching text query.                                                                                                               |
| 10        | Memoization story                                            | Sorted rows' initial identity-based selection, pointer/Space updates, other selections preserved, gridcell role. No performance timing claims.                                                                                                                  |
| 11        | DataGrid primitive composition story                         | Selection remains tied to item identity when sort changes row order; gridcell aria-selected follows checked.                                                                                                                                                    |
| 12–17     | Cell context / styles / unit default and nonnative scenarios | Native/flex × medium/small/extra-small; actual TD/DIV, table-cell/flex display, zero padding, 44px selection column, centered input; name, type and default state; axe on each named two-column table.                                                          |
| 18        | Hook slot defaults / Checkbox public behavior                | Omitted checked permits uncontrolled checkbox activation; pointer/Space toggling; callback counts and boolean payloads; forward/reverse Tab order.                                                                                                              |
| 19–21     | Checked API / slot forwarding                                | Explicit false/true/mixed stay controlled when callback is ignored; exact requested boolean callback value; checked/indeterminate retained after native activation.                                                                                             |
| 22        | Controlled consumer / Checkbox native state                  | Mixed→true→false→mixed via pointer, Space, external button; native indeterminate clears/restores; axe in mixed state.                                                                                                                                           |
| 23        | Optional slot default/override semantics                     | Checkbox defaultChecked initializes uncontrolled state; explicit slot checked overrides root checked.                                                                                                                                                           |
| 24        | Type/checked API / rendering                                 | Radio default controlled false; mixed coerces to true; checkbox mode does not render a supplied inactive radio slot.                                                                                                                                            |
| 25        | Radio default input name and onChange slot                   | Distinct generated names allow independently controlled selected radios; pointer/Tab/Space; callback value.                                                                                                                                                     |
| 26        | Radio input slot overrides                                   | Shared name permits native ArrowRight focus and selection; controlled callback updates checked states.                                                                                                                                                          |
| 27,29     | Indicator disabled slot props                                | Disabled checkbox/radio blocks change callbacks, remains unchecked, skipped on Tab; axe and accessible name.                                                                                                                                                    |
| 28,30     | Optional null slots / renderer / unit structure              | Null indicators remove inputs but not cell width; arbitrary root children are intentionally not rendered.                                                                                                                                                       |
| 31        | Root/indicator/input props, classes, refs, native label      | Consumer/static classes, title/data attributes, root/input DOM ref identity, input description, label activation, two bubbled root clicks versus one input-slot click, Escape forwarding with no selection change; axe. Label fixture uses enough column width. |
| 32        | Root as/role/tabIndex forwarding                             | Supported as=div, columnheader/gridcell roles, aria-selected, actual root ref and reverse-Tab targeting input; grid cell input excluded from tab order.                                                                                                         |
| 33        | Dynamic public type/checked                                  | Type switch swaps checkbox/radio, retains the same root/ref, maps mixed/true correctly, and switches back.                                                                                                                                                      |
| 34        | Consumer slot event handling                                 | stopPropagation prevents root callbacks without preventing native checkbox toggle.                                                                                                                                                                              |
| 35–36     | Radio slot checked/classes/input overrides                   | Slot checked overrides root checked; classes, input ref, accessible name and description; axe in both native and flex modes.                                                                                                                                    |
| 37        | Root as=td/tabIndex/key handler / focus styles               | Keyboard focuses root; Space is forwarded, not an implicit cell selection action; input remains unchecked; visible solid 2px focus outline.                                                                                                                     |
| 38–39     | Invisible API / unit invisible-radio scenario                | Cell occupies selection column but opacity is zero; default radio omitted, default checkbox retained; resulting Tab targets asserted.                                                                                                                           |
| 40        | Deprecated hidden API / hook                                 | Retains radio and table structure, applies visual opacity (not display:none).                                                                                                                                                                                   |
| 41        | Explicit radio slot override with invisible                  | Explicit supplied radio renders although its cell is visually hidden.                                                                                                                                                                                           |
| 42        | Subtle API / row focus-within styles                         | Checked/mixed remain visible; unchecked reveals from keyboard focus in sibling action and hides on focus exit.                                                                                                                                                  |
| 43        | Direction / layout / keyboard                                | RTL flex layout centers input; Tab/Space still work; named-table axe.                                                                                                                                                                                           |

## Important boundaries and limitations

Adversarial-review additions cover row-driven none/mixed/all/mixed/none header transitions
in both controlled and uncontrolled stories, asserting all row and header native states.
The subtle story also deselects a visible indicator, verifies hover and keyboard-focus
visibility independently, then verifies it hides after both leave. Keyboard traversal
re-enters keyboard modality after pointer activation; programmatic focus alone does not.
The scenario numbers in the source manifest above describe the original 43-case inventory.

- TableSelectionCell has **no root defaultChecked or onCheckedChange API**.
  Its omitted checkbox checked prop leaves the Checkbox slot uncontrolled; the radio slot defaults
  to controlled `!!checked` (false). Root `checked` is also used for subtle styling and does not
  automatically track an uncontrolled indicator's internal state. Tests do not invent an unsupported API.
- Native checkbox mixed state is exposed through `HTMLInputElement.indeterminate`, not a required
  `aria-checked` attribute. Consumer-set root ARIA and native input state are tested separately.
- `hidden` is deprecated; `invisible` is visual, not an accessibility-tree or interaction removal
  contract. Row hover/focus styles can reveal selection cells. These are not tests of `aria-hidden`.
- Only `td` and `div` are public root element alternatives; `th` is not a supported `as` value.
- Native table fixed layout sizes columns from the header. The 44px fixture header ensures the test
  exercises a properly configured selection column, rather than assuming a body width forces header layout.
- Axe runs against complete, named fixture tables (13 audits), with zero violations and at least one
  passing rule asserted. The unrelated page-landmark `region` rule is disabled; no selection-specific
  rule is disabled. Actual selection stories retain their original low-level markup; no claim is made
  that those stories are complete APG grids or that axe validates all screen-reader behavior.
- High contrast, assistive-technology speech, touch, non-Chromium browsers, virtualization library
  internals and memoization performance are outside this functional suite. The higher-level
  DataGridSelectionCell is a different component and is not implemented or modified here.
- No forced clicks, sleeps, conditional skips, snapshots, exception suppression or test retries.
  Pointer placement outside the table is deterministic setup, because real-event coordinates survive
  remounts. Virtualized row click disables automatic Cypress scrolling so it hits the visible first row.

## Reproduction and evidence

Final validation: Cypress **14.4.1**, headless **Chrome 154**, **45 passing / 0 failing /
0 pending / 0 skipped**, exit **0** after the adversarial-review additions.
Scoped ESLint for the spec and standalone config both exited **0**.
The current component-local TypeScript check exits **0**, including the imported
story and component sources. A Cypress-only React 19 JSX bridge resolves the
earlier missing legacy JSX namespace errors without editing shared configuration
or weakening test types.

Run from repository root in PowerShell:

```powershell
& .\node_modules\.bin\cypress.cmd run --component --browser chrome --headless --project packages\react-components\react-table\library --config-file src\components\TableSelectionCell\TableSelectionCell.cypress.config.cjs --spec "$PWD\packages\react-components\react-table\library\src\components\TableSelectionCell\TableSelectionCell.cy.stories.tsx"
& .\node_modules\.bin\eslint.cmd --parser-options '{"projectService":false,"project":"packages/react-components/react-table/library/src/components/TableSelectionCell/TableSelectionCell.cy.tsconfig.json"}' packages\react-components\react-table\library\src\components\TableSelectionCell\TableSelectionCell.cy.stories.tsx
& .\node_modules\.bin\eslint.cmd packages\react-components\react-table\library\src\components\TableSelectionCell\TableSelectionCell.cypress.config.cjs
& .\node_modules\.bin\tsc.cmd --project packages\react-components\react-table\library\src\components\TableSelectionCell\TableSelectionCell.cy.tsconfig.json --pretty false
```

Local standalone config reuses only the repository baseConfig; all configured downloads/screenshots/videos
live in this component directory, video/screenshots are disabled, and no shared config is changed.
`--spec` is absolute because Cypress resolves that argument from the invoking working directory,
not the project folder.

The authoritative current evidence is in
`C:\Users\jabrassi\.scout\copilot\session-state\5ed21290-e28e-4743-8b3d-3864ac6a202e\files\coverage-121-140\TableSelectionCell`:
`final-cypress.log` records the complete current 45-case run, `lint.log` records
the current scoped lint check, and `typecheck.log` records the successful current
TypeScript check. These were generated after the reviewed spec and JSX bridge
changes. Earlier `TableSelectionCell.cy-run.log`, `TableSelectionCell.cy-lint.log`
and `TableSelectionCell.cy-typecheck.log` remain historical evidence, not proof
of the final assertions. The original typecheck log records the earlier JSX
errors. The current check traverses imported story/component dependencies but
is not a repository-wide typecheck claim.
The default ESLint project service excludes Cypress stories; the explicit CLI parser-options uses
this directory's Cypress tsconfig without editing shared lint configuration.

## Resumed adversarial gate

The existing 45 cases and 13 axe audits were preserved. Read-only adversarial
review verified actual scenario registration, selectors, radio contracts and
the row-level focus-within style dependency, then identified two strengthening
opportunities. The virtualization case now changes an initially selected row
to unchecked and an initially unselected row to checked, proves both unmount,
and verifies both states plus an untouched checked row after remount. Both
single-selection stories assert nonempty, distinct generated native radio
names; explicit shared-name grouping remains covered separately.

After these changes the complete Chrome suite passes **45/45**, with no failing,
pending or skipped cases. The current scoped TypeScript, ESLint and formatting
checks are green. The reviewed contracts have no outstanding substantive
findings within the functional scope above.

Current validation evidence is identified explicitly in the reproduction
section above and kept separately from the other thread's historical logs.
