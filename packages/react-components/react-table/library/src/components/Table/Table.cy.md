# Table browser coverage

Run with Node 22 from the repository root:

```powershell
$env:WEBPACK_DEV_SERVER_PORT = '24850'
node node_modules\cypress\bin\cypress run --component --browser chrome --project packages\react-components\react-table\library --config-file src\components\Table\Table.cypress.config.cjs --spec packages\react-components\react-table\library\src\components\Table\Table.cy.stories.tsx
node node_modules\typescript\bin\tsc --project packages\react-components\react-table\library\src\components\Table\Table.cy.tsconfig.json --noEmit
```

The `.stories.tsx` suite and `.stories.ts` ambient JSX bridge use the existing
production compilation exclusions; the local configuration discovers the browser
suite explicitly. Retries, screenshots and video are disabled.

The documented round verifies native and role-based markup, root/descendant
layout and size propagation, accessible labels, minimum-width overflow and
controlled/uncontrolled sorting with real pointer and keyboard activation.
Boundary coverage adds scoped axe checks, primitive navigation/selection
non-behavior, consumer-supplied grid navigation, sortable context overrides,
nonnative sorting and native caption/footer composition.

Source/conformance coverage also checks live size/sortability/native-element
props, explicit root selection, nested contexts, event handlers, native attributes,
root identity, refs/cleanup and empty/restored data. Feature scenarios compose
controlled/uncontrolled single/multiple selection and keyboard resizing.
Aggregate selection checks unchecked/mixed/checked header state with pointer and
Space activation. Real pointer dragging checks header/body width agreement,
minimum-width clamping and movement after release; keyboard resizing checks
normal and Shift precision steps.

## Coupled RTL grid geometry repair

The existing Grid pattern remains unchanged: `useArrowNavigationGroup` with
`axis: 'grid'`, a grid role and focusable cells. A tracked Yarn patch to Tabster
8.8.0 makes DOM-order boundary comparisons direction-aware in ESM and CommonJS.
It preserves physical vertical overlap matching and the existing public hook API.
See the react-tabster README for its repository-local installation scope.

Native Chrome scenarios cover both horizontal directions, strict row boundaries,
Home/End and PageUp/PageDown, bounded/cyclic horizontal/vertical policies, nested
movers, input editing against a native positive control, and keydown opt-outs in
LTR/RTL. The patch does not substitute GridLinear or disable assertions.

Independent native Home, End, PageUp and PageDown cases verify each target's
actual row/column geometry before activation. The same suite was run against
pristine Tabster 8.8.0 through a temporary module alias, without changing the
installed managed patch: all four RTL row/page branches and both horizontal
directions independently reproduced the defects, while their LTR controls and
GridLinear cross-row roundtrips passed. The patched run clears every confirmed
navigation case.
CommonJS units independently exercise each Home/End/Page branch in both Grid and
GridLinear; physical vertical matching, overlap rejection, cyclic behavior and
rounded unequal/subpixel-width boundaries remain covered.

## Inline column-sizing options synchronization

The resizing scenario intentionally uses valid plain inline
`columnSizingOptions`, stable column definitions and stable item data.
`useTableColumnResizeState` compares option values before synchronization and
also guards the reducer. Equivalent fresh objects preserve existing state and
uncontrolled resized widths without requiring consumer memoization. Real option
changes are retained even when current widths are unchanged, so newly added
columns receive the latest defaults. Hook units exercise both auto-fit modes,
bounded render counts, changed values and added/removed future-column options.
Column additions and sizing options are synchronized together so a simultaneous
default change is applied before initializing the newly added column.
The browser scenario retains real keyboard resizing and header/body geometry.
No universal accessibility, RTL or comprehensive Table claim is made.
