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
The refinement characterizes that limitation on the same mounted parent and title:
an unpaired native title id leaves the parent's generated `aria-labelledby`
reference unresolved. The default group in that fixture has an empty computed
accessible name; this is not a universal no-name claim. An explicit `aria-label`
can supply a fallback, and a valid body id in a multi-id `aria-labelledby` supplies
the body name while the missing reference is ignored. Pairing the parent reference
with the explicit title id restores title naming, and removing both overrides
restores the original generated association without remounting. This characterizes
existing native-prop precedence, not automatic id reconciliation or a verified
broken title contract.

Original Chrome run: 50/50 passing, zero retries, pending or skipped cases. The
independent adversarial review's tabIndex-removal gap is closed with real forward
and reverse Tab traversal and a positive focusability control before removal.
Computed font-weight assertions normalize numeric theme tokens to CSS strings;
custom typography uses the Theme's numeric weight type. The original typecheck
reports only the two pre-existing FluentProvider TS2741/TS7026 diagnostics, with
no MessageBarTitle diagnostics. Browser evidence is in the session artifact
`files\title-final.log`. No production changes were needed.

Queued refinement preserves all 50 original cases and adds the two naming
characterizations above. The component-local source-importing type project now
includes a React global JSX bridge, following the other coverage runners rather
than substituting built declarations. Fresh refinement evidence is recorded in
`46-MessageBarTitle-refinement-final-browser.log` and
`46-MessageBarTitle-refinement-final-source-tsc.log` in the session artifacts.
The fresh refinement run passes 52/52 in Chrome with zero retries, failures,
pending or skipped cases, and zero source type diagnostics. All 46 production
source fingerprints remain unchanged. Independent whole-suite adversarial review
and final whole-suite closure are clean. No production changes were made.
