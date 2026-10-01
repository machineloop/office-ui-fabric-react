# ListItem browser coverage

Sources: List Default story, List description and navigation/selection guidance,
ListItem default/conformance tests, slots and hook event handling.

Documented fixtures exercise static lists, item navigation/actions, single and
multiselect, prevented custom primary actions and composite gridcell entry.
Edges cover disabledSelection with and without onAction, checkbox event isolation,
rejected controlled changes, horizontal traversal, vertical escape and list tab exit.
Unit-derived contracts cover refs/classes/attributes, explicit element choices,
numeric action payloads, event prevention and checkmark customization.

Prevented primary actions assert selection and checkbox state after each click and
Enter activation. Disabled selection asserts state after every click, Space and
Enter activation, including items with custom actions. Two incorrect toggles cannot
cancel out and hide a regression.

Single selection retains its selected item when toggled; the suite records this
existing useSelection policy rather than changing it. The guidance's occasional
navigationMode-on-ListItem wording is implemented as navigationMode on List.
Virtualized rendering and application-specific menu/media behavior are not
certified. No exhaustive, axe, visual or screen-reader certification is claimed.

From react-list/library with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/ListItem/cypress.config.cjs
tsc --noEmit -p src/components/ListItem/tsconfig.cy.json
```

Electron port 45178 is overridable with WEBPACK_DEV_SERVER_PORT.
Retries/screenshots are disabled; `.stories` validation files reuse exclusions.
