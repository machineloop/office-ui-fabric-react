# @fluentui/react-menu

**React Menu components for [Fluent UI React](https://react.fluentui.dev)**

## Functional coverage

`src/components/MenuItem/MenuItem.cy.tsx` directly exercises MenuItem's documented
command, icon, shortcut, multiline, alignment, submenu and split-action scenarios.
It covers native pointer/Enter/Space activation and disabled focus, persistence,
computed accessible names/descriptions, caller cancellation, live defaults and
slot cleanup, refs/handlers, provider styling and public-hook recomposition.
The existing Menu and MenuList Cypress specifications remain independent.

Run the dedicated suite through the `react-menu:e2e` Nx target, selecting
`**/MenuItem.cy.tsx` in the component Cypress configuration. Browser assertions
cover DOM accessibility and native interaction, not screen-reader speech or
platform-specific high-contrast painting.
