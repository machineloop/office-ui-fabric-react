# MessageBarActions browser coverage

`MessageBarActions.cy.tsx` contains 64 finite browser cases: 16 documented
scenarios, 16 edge/accessibility scenarios, and 32 source/unit-derived cases.
Only this component directory is changed. MessageBar, its existing tests,
shared support, package configuration, and dependencies remain read-only.

## Component boundary

The root is the secondary-action `div`. The optional `containerAction` is a
**sibling**, not its descendant. Both inherit a small Button default; explicit
Button sizes and nested Button contexts can override it. MessageBar supplies
the computed layout and a ref for reading secondary-action text.

Actions does not own open state, dismissal, announcements, action activation,
or a keyboard-navigation model. Consumer controls supply accessible names and
handlers. A dismiss button alone does not remove a message; the consumer must
remove it. Parent announcement integration is checked once, only to verify
that `actionsRef` refers to the secondary root and excludes container text.
Intent, politeness, MessageBarGroup animation, and other MessageBar scenarios
are not repeated here.

## Inventory and observable assertions

| Area                   | Contracts                                                                                                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documented composition | Standalone/default root; secondary-only and container-only content; omitted/null container; object slot props; small Button context and explicit size precedence; consumer-owned removal and passive dismiss/Escape negative controls                                              |
| Parent layout          | Singleline/multiline in LTR/RTL; direct grid-child relationships; sibling DOM order; real body/action/container rectangles; multiline end alignment and margins; actual wide/narrow/wide reflow in both row and column flex hosts                                                  |
| Keyboard/accessibility | Real forward/reverse Tab order for both layouts/directions; no implicit wrapper tab stops; named group, actions, icon dismiss and links; disabled descendant excluded from Tab; real Enter/Space activation; consumer root tabIndex and focus/blur/key forwarding                  |
| Reflow lifecycle       | Same focused action and container button DOM nodes across actual ResizeObserver-driven layout changes; independent sibling parent contexts; container ref and consumer child state survive manual layout moves                                                                     |
| Styling                | Static/caller classes; Griffel last-class precedence; inline styles; provider custom-style hooks; live light/custom/dark token spacing and Button colors; live RTL geometry and directional padding                                                                                |
| Native/slot boundaries | Independent root/container IDs, ARIA, title, lang, data attributes; target/currentTarget; container click does not bubble through sibling root; latest/replaced/removed handlers; add/replace/remove container; root/container render functions and their ref/style/Button context |
| Refs and integration   | Object forwarded/context merged refs; callback-ref replacement and cleanup; separate container ref; unmount cleanup; parent secondary-text announcement                                                                                                                            |
| Finite children        | Undefined, null, false, true, empty string, zero, nonzero, whitespace, empty fragment, empty array, array of empty nodes, mixed keyed children; dynamic transitions and stable root/container identity                                                                             |
| Finite slot values     | Undefined/null omission contrasted with explicit empty object, empty string, zero, text, null-children object and mixed shorthand array; unresolved auto context takes the non-multiline render branch                                                                             |

### Source-derived edge semantics

The current hook uses `hasActions: !!props.children`, not a traversal of painted
children. Thus undefined/null/false/empty string/zero hide the required root,
while true, empty fragments and arrays retain `display: flex`, even when React
renders no text. Zero remains root text but is hidden. These tests record the
existing boundary rather than claiming it detects nonempty visible actions.
The required root remains mounted in both parent layouts; hiding it never
hides the sibling container.

`containerAction` uses optional slot normalization. Null/undefined omit the
slot; explicit empty objects, empty strings and zero still create a styled
container. Render-function children are consumer responsibility; tests forward
the supplied props so styling, refs and native attributes are retained.

## Source inventory

- Stories: `Default`, `Actions`, `Dismiss`, `ManualLayout`, `Reflow`, package
  description/best practices, and `library/docs/Spec.md`.
- Actions: component, types, hook, renderer, Button context hook, styles, existing
  conformance/snapshot unit and snapshot.
- Read-only integration: MessageBar hook, renderer, reflow hook, styles, context,
  source units and existing MessageBar/MessageBarBody Cypress prior art.
- Read-only supporting contracts: Button/context implementation, slot normalization
  and slot types, package conformance helper and Cypress support commands.

## Running

The package already has an Nx `e2e` target and a package Cypress config. No new
target or machine-specific committed config is needed. In a normally configured
checkout, select only this spec through the existing target:

```powershell
yarn nx run react-message-bar:e2e --skipSync --skip-nx-cache --excludeTaskDependencies --args="--browser electron --spec src\components\MessageBarActions\MessageBarActions.cy.tsx"
```

Component-local type selection (relative paths only):

```powershell
yarn nx run react-message-bar:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T tsc --noEmit -p src\components\MessageBarActions\MessageBarActions.cy.tsconfig.json"
yarn nx run react-message-bar:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T eslint src\components\MessageBarActions\MessageBarActions.cy.tsx src\components\MessageBarActions\MessageBarActions.cy.styles.ts"
yarn nx run react-message-bar:test --skipSync --skip-nx-cache --excludeTaskDependencies --testPathPatterns=MessageBarActions --runInBand
```

The local Windows execution used the provided external adapter and isolated
port through environment variables only. Expanded invocations, round counts,
baseline diagnostics and limitations are in `MessageBarActions-evidence.json`
in the assigned session artifacts directory, not a shared progress ledger.

The type check currently encounters two pre-existing keyed-slot TS2322 errors
in `renderMessageBarActions.tsx` and provider TS2741/TS7026 errors. All four were
independently reproduced using a temporary local config selecting the unchanged
MessageBar Cypress suite; that baseline also includes two MessageBarGroup
diagnostics not imported by this Actions suite. No type errors originate in the
new suite or styling helper. No production source changes were made.

There are no sleeps, automatic retries, skipped cases, exception suppression,
generated-class assertions, or screenshots used as assertions. The suite checks
finite observable contracts, not all infinite inputs, screen-reader speech,
cross-browser behavior, or a full automated accessibility audit.
