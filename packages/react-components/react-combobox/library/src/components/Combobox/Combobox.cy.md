# Combobox browser coverage

The suite extends the two original controlled-open tests with documented single
selection, controlled/default selection, grouped and rich option text, filtering
and empty results, custom freeform selection, multiselect deselection, clearable,
disabled and all size/appearance combinations. Sources are the Combobox stories,
description and best-practices documents.

Implementation/accessibility coverage uses native keyboard events for arrows,
Home/End, PageUp/PageDown, Alt arrows, Enter, Space, Escape and Tab. It checks
input focus, active-descendant ids, disabled-option rejection, inline/portalled
ARIA relationships and controlled selection rejection. Unit-test regressions
cover blur matching/reset/freeform persistence, controlled-open rejection,
native-attribute partitioning and refs, Field required/invalid/described semantics,
and active-option callbacks.

Cursor arrows now hide the imperatively managed active-descendant attribute using
its controller; setting a React prop to undefined did not remove that DOM
attribute. Navigation restores it without losing the active option.

The documented controlled story intentionally resets its displayed value to the
selected value identifiers (`whoward`), not the rich option's full DOM text.
This behavior is recorded, not corrected as an unrelated story defect.

Focused Electron regression coverage is not exhaustive, visual, screen-reader,
or accessibility certification. Tag-removal and virtualizer-specific scrolling
are not independently audited by this suite.

## Local validation

From `react-combobox/library`, with repository dependencies on NODE_PATH and
TS_NODE_COMPILER pointing to repository TypeScript:

```text
cypress run --component --browser electron --config-file src/components/Combobox/cypress.config.cjs
tsc --noEmit -p src/components/Combobox/tsconfig.cy.json
```

The local config reuses the repository Cypress base, disables retries and
screenshots, and uses port 45162 (override WEBPACK_DEV_SERVER_PORT).
The local JSX declaration restores React 19 type contracts for Fluent's custom
runtime without changing shared compiler configuration.
