# MenuGroupHeader functional coverage

`MenuGroupHeader.cy.tsx` covers the documented grouped-menu composition,
generated and caller-supplied IDs, computed group names, real arrow and Tab
navigation, Escape focus restoration, checkbox/radio integration, icon-bearing
items, LTR/RTL styling, and default noninteractive div semantics.

Native and unit-informed scenarios cover dynamic context and content updates,
object/callback ref cleanup, node identity, the supported explicit `as="div"`,
root render functions, rich descendants, ARIA overrides, native attribute and
handler removal/restoration, event bubbling, consumer classes/inline styles,
and light/dark/high-contrast token paint. The hidden-attribute case verifies
forwarding only, not browser visibility. MenuGroupHeader has no intrinsic
heading role, keyboard activation, selection state, or polymorphic heading tag.
An explicit header ID requires a matching caller-provided group
`aria-labelledby`; it does not automatically relabel the group.

The axe scan keeps all rules enabled and excludes only Tabster's
`[data-tabster-dummy]` focus sentinels. An unfiltered scan reports
`aria-hidden-focus` on those two intentionally hidden, tabbable menu-mover
sentinels, not on either header. Explicit assertions separately retain the
real menu's naming and focus contracts. High-contrast coverage checks theme
tokens, not operating-system forced-colors emulation.

Run from `packages\react-components\react-menu\library`:

```powershell
..\..\..\..\node_modules\.bin\cypress.cmd run --component --browser chrome --config-file src\components\MenuGroupHeader\MenuGroupHeader.cypress.config.cjs
```

The component-local CommonJS configuration avoids the shared ESM config's
`import.meta.dirname` incompatibility with Cypress's bundled Node 18. It uses
the existing Cypress/webpack setup, disables retries, and suppresses only
esbuild's known included-file-pattern warnings when bundling dependencies.

The targeted TypeScript command is:

```powershell
..\..\..\..\node_modules\.bin\tsc.cmd -p src\components\MenuGroupHeader\MenuGroupHeader.cy.tsconfig.json --pretty false
```

Full source-based type checking currently reports two upstream errors in
`react-provider/library/src/components/FluentProvider/renderFluentProvider.tsx`
(missing JSX children inference at line 42 and missing `JSX.IntrinsicElements`
at line 47). Those are outside this component's permitted write scope;
the suite introduces no additional TypeScript diagnostics.
