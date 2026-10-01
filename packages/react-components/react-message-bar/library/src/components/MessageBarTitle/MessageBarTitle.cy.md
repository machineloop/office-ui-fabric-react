# MessageBarTitle functional browser coverage

Run from the repository root in installed Chrome:

```powershell
$env:WEBPACK_DEV_SERVER_PORT = '24846'
& .\node_modules\.bin\cypress.cmd run --component --browser chrome --project packages\react-components\react-message-bar\library --config-file src\components\MessageBarTitle\MessageBarTitle.cypress.config.cjs
```

The component-local runner uses zero retries, no video or failure screenshots,
library-relative shared support paths, repository loader resolution and the local
source-based TypeScript config. Only the known esbuild include-pattern warning is
suppressed. Choose another unused port if needed; do not interrupt other runners.

## Sequential rounds and source mapping

1. Documented compositions: snapshot/native span defaults; all four intents in
   automatic, single-line and multiline layout; both shapes; title-only body;
   real LTR/RTL title/body/link inline geometry and generated-space separation.
   Sources: `MessageBarDescription.md`, `MessageBarBestPractices.md`, `Default`,
   `Intent`, `Shape`, `Actions`, `ManualLayout` and `Reflow` stories; title
   types/hook/render/styles; MessageBar context, naming and body inline-link render.
   Each round must pass Chrome before the next round is added.
2. Undocumented edges/accessibility: forward/reverse real Tab order, native Enter
   versus Space on embedded links/buttons, rich-content naming updates, sibling
   id isolation, explicit paired title/parent ids and caller heading/status/alert
   semantics; long-title wrapping/widening in both directions; standard axe rules
   (including AA contrast and semantics), without disabling rules or excluding nodes.
   Round 1 passed 18/18 before these cases were added.
3. Unit/conformance-informed contracts: object/callback root refs and cleanup,
   supported `as="span"`, root render functions retaining merged public props,
   native metadata/ARIA/tabIndex forwarding and removal, child edge values and
   identity, latest/removed/restored native events with no synthetic activation,
   classes/style override replacement/removal, light/dark/high-contrast and
   customized typography tokens, provider/native direction changes and title
   reinsertion. Sources: title unit test/snapshot, package `isConformant`,
   `react-conformance` default tests, title types/hook/render/styles.
   Round 2 passed 34/34 before these cases were added.

## Contract boundaries

The title has only a native span root and inherited native/slot props: there is no
title-specific intent, layout, heading level, activation or dismissal algorithm.
The parent defaults to `role="group"` and references the generated title id.
It uses the announcement provider, not a live-region role on the title. Browser
DOM naming does not prove screen-reader announcement delivery. The documentation
requires an application-level AriaLiveAnnouncer for announcements.

CSS `::after` supplies visual spacing, not a DOM text-space node; the suite checks
both actual text content and measured text-to-body separation rather than claiming
the DOM contains whitespace. MessageBarActions/dismissal, animation, parent reflow
algorithms, and screen-reader/forced-colors platform behavior are outside this
title-scoped suite.

RTL geometric ordering uses Hebrew text because Latin runs preserve their native
LTR bidi order even in an RTL provider. Long-title wrapping is an edge contract,
not a recommendation to exceed the best-practice short-message guidance.
An explicit native title `id` overrides the generated id; callers must also set
the parent's `aria-labelledby` to that id. Automatic reconciliation of arbitrary
caller ids is not implemented by MessageBar and is outside this directory's scope.

Final Chrome run: 50/50 passing, zero retries, pending or skipped cases. The
independent adversarial review's tabIndex-removal gap is closed with real forward
and reverse Tab traversal and a positive focusability control before removal.
Computed font-weight assertions normalize numeric theme tokens to CSS strings;
custom typography uses the Theme's numeric weight type. The final typecheck
reports only the two pre-existing FluentProvider TS2741/TS7026 diagnostics, with
no MessageBarTitle diagnostics. Browser evidence is in the session artifact
`files\title-final.log`. No production changes were needed.
