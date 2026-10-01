# MenuDivider functional coverage

`MenuDivider.cy.tsx` contains 23 finite browser scenarios covering the
VisualDividerOnly and GroupingItems documentation, unit snapshot defaults and
native/root conformance contracts. It verifies real icon-bearing menus,
decorative semantics versus logical group naming, arrow/Tab traversal, Escape
focus restoration and nonactivation with a positive menu-item callback control.

Layout checks measure actual rectangles in both directions: a one-pixel line,
four-pixel vertical margins and five-pixel overhang on each side, including
parent resizing. Native/unit-informed cases cover IDs, labels, direction,
caller semantic overrides, object/callback ref cleanup, handler replacement
and removal, children including zero/null, retained descendant identity, root
render functions, the supported explicit `as="div"`, consumer classes/inline
styles and live dark/high-contrast provider updates.

MenuDivider is a visual div, not an intrinsic ARIA separator, group or
interactive control. Its default `aria-hidden` also hides descendant text from
the accessibility tree; interactive children should not be placed inside it.
The explicit tabIndex/aria-hidden handler fixture characterizes caller native
overrides, not a recommended accessible pattern. High-contrast checks cover
theme token paint, not OS forced-colors emulation.

The documented grouped-menu axe scan enables its default rules and excludes
only `[data-tabster-dummy]`. The two intentionally hidden Tabster focus
sentinels produce the same independently measured `aria-hidden-focus` finding
as the MenuGroupHeader suite. No menu item, group or divider is excluded and no
rule is disabled. The scan supplements explicit roles, group names and focus
assertions; this is not universal accessibility certification.

Run from `packages\react-components\react-menu\library`:

```powershell
..\..\..\..\node_modules\.bin\cypress.cmd run --component --browser chrome --config-file src\components\MenuDivider\MenuDivider.cypress.config.cjs
```

The component-local CommonJS runner avoids the shared ESM config's
`import.meta.dirname` incompatibility with Cypress Node 18, uses zero retries,
and suppresses only the known esbuild included-file-pattern warning.

```powershell
..\..\..\..\node_modules\.bin\tsc.cmd -p src\components\MenuDivider\MenuDivider.cy.tsconfig.json --pretty false
```

Type checking reports only the two previously verified upstream
`FluentProvider/renderFluentProvider.tsx:42,47` diagnostics (TS2741 and TS7026).
No component diagnostics or production changes were introduced.

Review tightened the nonactivation assertion with an item callback spy and
positive control, verified actual theme-update geometry, and added parent
resize regressions. Final review found no remaining actionable issues against
the implementation, stories and conformance contracts. Chrome-only Cypress
evidence is stored outside the repository in the session's
`files\menu-divider-*.log` artifacts.
