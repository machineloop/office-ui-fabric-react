# ONLY126 — Portal functional coverage

## Current component-local Nx integration

All repository writes are confined to this component directory. Production and original unit tests
are unchanged. No staging, commit, push, shared configuration edit, nested delegation, next-component
work or independent parent review was performed.

The prior author's comprehensive **60 cases are retained**, not replaced. Integration adds twelve
R5 cases, a `Portal.cy-entry.stories.tsx` importing the fixture exactly once, real React-19
type-only bridges, zero private Cypress tasks, and native-listener cleanup. Current scoped **and
same-import baseline TypeScript pass (exit 0)**. Original regression tests pass: **13 tests,
2 snapshots, 4 suites**, including true Node SSR. No installation or dependency changes.
Package API version is **9.8.16**. Full direct execution after R5 additions passed **72/72**, without
retries/failures/pending/skips. There are **18 strict axe audits**, requiring a nonempty pass set and
exactly zero violations and incomplete findings. Final repeated runs, raw XML, full axe ledgers,
timestamps/exits and exact source hashes are indexed externally by `handoff.json`, not old filenames.

**Necessary scoped deviation:** the package has no `e2e` target, `cypress.config.ts` or
`tsconfig.cy.json`. Earlier attempts against those absent files are historical failures, not passes.
The package production tsconfig excludes `*.stories.ts` and `*.stories.tsx`, but those suffixes
alone do **not** exclude fixtures from production JavaScript. The actual producer,
`tools/workspace-plugin/src/executors/build/lib/swc.ts`, checks absolute source paths using
`isMatch(srcFilePath, swcConfig.exclude, { contains: true })` from `micromatch`. The legacy
`scripts/tasks/src/swc/swc.ts` uses the same decision. This library's unchanged
`.swcrc` includes `/testing`, which matches nested component testing directories on Windows.
The fixture, entry and both JSX bridges therefore live in owned `testing/`, retaining story
suffixes for the separate TypeScript exclusion. The CJS runner and private type configurations
explicitly select those paths. Only relative fixture imports were rebased; the entire original
60-case suite and twelve additions remain unchanged. No shared configuration, production source,
generated shared helper or original unit contract was changed.

Owned `functional-tests/project.json` registers **react-portal-functional-tests** in the real workspace Nx graph,
following the nested CarouselNavImageButton project precedent. Its `sourceRoot` is this owned
directory, tags are `vNext`/`platform:web`, and its implicit dependency is `react-portal`. The project
root is the test-only `functional-tests` subdirectory, not the production component root: actual
graph inspection caught a reverse production import edge/cycle in the first root-level placement.
Moving only the project metadata retains production-file ownership under `react-portal` and
removes that introduced reverse edge. Changes in the component are selected through the parent
project and propagate to its test dependent. `e2e`
executes the owned Cypress config; `typecheck` executes scoped and same-import baseline TSC;
`type-check` is the same check under the target name actually used by PR CI. Targets disable cache
and keep type-check prerequisites empty to avoid broad parent builds. The `e2e` target explicitly
depends only on `scripts-cypress:build`, using the same named-project prerequisite as root Nx
defaults. Its CJS config requires the Git-ignored generated `scripts/cypress/lib-commonjs/index.cjs`;
an already-built shared checkout is not clean-checkout proof. Type-check targets do not load that
helper and need no helper build. `Portal.exec.cjs` uses the running
Node executable and existing dependencies, never generated test templates or transient source copies.

`.github/workflows/pr.yml` runs `nx affected -t e2e --nxBail --parallel 1` and, separately,
`nx affected -t ... type-check ...`. Therefore the registered targets are discoverable by existing
automation without a workflow edit: owned changes select the nested project, and the explicit
dependency propagates affected status from Portal. This is component-local workspace integration,
not a claim that the absent package-default Cypress configuration exists. Canonical global
`*.cy.tsx` discovery is deliberately not claimed; it conflicts with unchanged production exclusions.

Fresh direct runs twice and root-registered Nx e2e runs twice, actual registered typecheck,
zero-diagnostic scoped/baseline checks, and actual parent-library production-program exclusion
and no-emit TSC are recorded in the external handoff. Parent independent repeated review is still
required before any component-only commit; no commit was made.

### Production JavaScript exclusion follow-up

The preceding TypeScript-only exclusion proofs are historical, not JavaScript shipping proofs.
Current evidence must independently establish the parsed production TypeScript file set, exact
producer path decisions for all four relocated files, and real ESM/CommonJS transpilation with
the unchanged producer and `.swcrc` in the safe artifact mirror. Published `lib` and
`lib-commonjs` manifests must contain neither fixtures/bridges nor test registration, Cypress
globals or development-only fixture imports. Source hashes, physical paths, commands and results
are indexed by the current external handoff. Both ordinary registered clean-helper runs retain
dependency scheduling and synchronization; direct runner coverage is separately verified.

### Standard lint project-service follow-up

`testing/tsconfig.json` extends the owned scoped Cypress configuration, explicitly includes
the four story-suffixed files, and clears inherited excludes and references. Its regular filename
allows unchanged ESLint TypeScript project-service discovery; the differently named scoped
configuration alone is not automatically discovered. Library-standard `eslint src --no-cache`
now validates all four files without CLI parser overrides or silent exclusion. The configuration
is a compiler input, not a TypeScript source-program file or published production output.
The current thirteen-file source manifest and fresh shared/mirror type, production, lint,
format and two registered cold-helper 72-case/18-audit proofs supersede the prior twelve-file
source set `0737B3E9E3B367F1D411B48AB9141770B3C47D0BC6F32DF3A762B5AD653EF30F`.
Older green and blocked integration logs remain historical; independent parent review and
a fresh repeat remain required, not implied by implementation self-review.

### Clean generated-helper prerequisite follow-up

The earlier four green browser runs are **historical pre-prerequisite evidence**, not proof that
the runner works with no generated helper. The narrow follow-up restores the named
`scripts-cypress:build` prerequisite on owned `e2e`; no parent Portal build is requested.
The actual Nx task graph also schedules the repository tooling build
`eslint-plugin-react-components:build`. Both use unchanged repository executors, including SWC,
API/declaration generation and CJS extension transforms.

Clean proof uses an artifact-only mirror of all 20,752 currently present tracked and nonignored
untracked source files, including unpublished shared changes, not a remote clone. Existing installed
third-party dependencies are reused; 259 workspace package links are remapped to mirror source.
In particular `@fluentui/scripts-cypress` physically resolves inside that mirror. Before execution,
`scripts/cypress/lib-commonjs/index.cjs` is absent there; the actual helper build creates it before
Cypress runs. Original shared generated helper outputs are never rebuilt, renamed or deleted.
Source-copy hashes, physical-path/absence/creation guards, logs, fresh raw JUnit and full axe ledgers
are retained in the external artifact directory.

Two initial isolated attempts are retained as failures: root export-map synchronization prevented
the first task execution; the next attempt used `--skipSync` but lacked installed `tsc` on PATH.
A corrected PATH run with `--skipSync` passed 72 cases and 18 strict audits. This is explicitly
separate from the final ordinary registered invocation: isolated `nx sync` normalizes only
`tsconfig.base.json` line endings (no semantic changes), without touching the shared source.
After preserving the prior isolated generated outputs elsewhere in artifacts, the final run again
starts with no helper output and executes the real registered target with task dependencies and
synchronization **enabled**, no `--excludeTaskDependencies` and no `--skipSync`.

Reproduction from an already synchronized repository root, with Node 22 and installed tools on PATH:

```powershell
$env:NX_DAEMON = 'false'
$env:PATH = "$PWD\node_modules\.bin;$env:PATH"
$env:PORTAL_RUN_ID = 'clean-prerequisite-e2e'
node .\node_modules\nx\bin\nx.js run react-portal-functional-tests:e2e --skip-nx-cache --output-style=stream
```

On an unsynchronized checkout, first use normal repository `nx sync`; this follow-up does not alter
shared configuration to bypass that requirement. For this shared-checkout audit, every sync,
build, cache and generated-output write occurs only in the named artifact mirror.

External evidence, intentionally outside Git:
`C:\Users\jabrassi\.scout\copilot\session-state\5ed21290-e28e-4743-8b3d-3864ac6a202e\files\coverage-121-140\Portal`.
Current direct config uses port **46126**, unique `reports\<run-id>` outputs and
`trashAssetsBeforeRuns=false`. Assets existing at initial inventory are preserved and hash-checked;
earlier asset loss before this task cannot be ruled out. Current spec uses only built-in `cy.writeFile`
for complete audit ledgers and `cy.readFile` for the installed raw frame-realm axe source, not private
Node tasks. Manual classification exceptions are not needed: violations/incomplete must be exactly empty.

### Round 5 source-to-case manifest

| ID    | Source basis                             | Browser-verifiable assertion                                                                                                                                                                                         |
| ----- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R5.01 | usePortalMountNode, styles               | Remove custom classes; same generated wrapper, marker/dir and exact top/left/right zero, absolute position and zIndex 1000000 remain.                                                                                |
| R5.02 | usePortal, Portal API                    | Consumer detaches custom host without losing content, reattaches with real controller, focuses child, closes portal; sibling remains and virtual parent resets to physical parent.                                   |
| R5.03 | mount-node factory/context               | Close removes owned DIV only; consumer context target and exact sibling markup remain.                                                                                                                               |
| R5.04 | explicit precedence/context              | Explicit HTMLElement works with missing provider document; no added dir/data node; real focus and strict axe.                                                                                                        |
| R5.05 | factory/context ownerDocument            | Foreign context target allocates in frame ownerDocument despite main-document provider; frame-local DIV/data/dir, no main-body wrapper. No cross-document CSS claim.                                                 |
| R5.06 | README child styling/provider context    | Explicit mount inherits consumer DOM color/CSS variable rather than logical provider CSS; no copied provider class.                                                                                                  |
| R5.07 | renderPortal/React portal semantics      | One trusted pointer click with button 0/detail 1 reaches child/body/React ancestor but not native logical parent. Enter key/code/trust/nativeEvent identity exact; one keyboard activation adds one detail-0 click.  |
| R5.08 | renderPortal/iframe semantics            | Trusted native frame-document click once, outer native body zero, exact target/button/detail; React main-tree output increments once.                                                                                |
| R5.09 | ShadowRoot context/native semantics      | Trusted body event once, retargeted shadow host; composedPath starts at actual button, separate from React duplicate-dispatch characterization.                                                                      |
| R5.10 | renderPortal/explicit ownership          | Shared destination has two sentinels; closing one portal removes only its children/sentinel; other remains real-focusable; final close preserves consumer sibling. No concurrent virtual-parent ownership guarantee. |
| R5.11 | normalization/hook/factory               | Explicit mount changing to null activates default body fallback and clears old virtual linkage while preserving siblings.                                                                                            |
| R5.12 | API report/exported unstable composition | Real usePortal_unstable/renderPortal_unstable composition renders modified state children outside unchanged hidden anchor; real focus and generated mount marker.                                                    |

Additional current sources actually inspected:
`library/docs/Spec.md` (background, variants, API, migration, SSR and accessibility),
`library/etc/react-portal.api.md`, `library/src/index.ts`, `react-utilities/src/utils/isHTMLElement.ts`,
`react-menu/library/src/components/MenuPopover/renderMenuPopover.tsx`,
`react-popover/library/src/components/PopoverSurface/renderPopoverSurface.tsx`,
`react-tooltip/library/src/components/Tooltip/renderTooltip.tsx`. Consumers own surface semantics,
focus behavior and dismissal; Portal forwards only children/mountNode. There is no public root slot,
as/ref, role/dialog, focus trap or keyboard-dismissal contract.

The design spec's React event bubbling/consumer stopPropagation map to R2.04–06/R5.07–09;
context/default/custom destination and CSS/direction map to R1.01/R1.04–13/R1.18–20/R2.09/R2.16–17/
R5.04–06; virtual parents to R1.11/R2.01–03; SSR to R2.23–24 plus the real Node unit.
Migration descriptions explicitly remove trigger/open, lifecycle callbacks, insertFirst/LayerHost,
event-bubbling flags and focus-trapping APIs; none is invented in fixtures. Spec/README root `id`
examples and `aria-hidden` output are stale against actual types/hidden-span render. The spec's broad
custom-destination theme wording does not override source: React theme context crosses, but DOM CSS
at an explicit destination remains consumer-owned (R5.06). No blanket AT pass is claimed.

All five rounds run by default (72 cases). Explicit `coverageRound` selects cumulative older rounds
without `.skip`/pending tests. Existing source-to-case R1–R4 rows below remain applicable; their
execution summaries, filenames, task methodology and port statements are **historical**, not current.
The first new R5 attempt failed from incorrectly nested suite registration; corrected full execution
passed 72/72. All attempts are retained and labeled. Subsequent fresh full runs bind final code with
complete axe-result recording. React 16/17 factory, unsupported cross-origin/closed-shadow contexts,
AT/browser/OS/zoom/performance and abandoned-concurrent-render behavior are not certified.

## Prior-author record (historical execution evidence; not current authority)

All authored files, local configuration, logs, JUnit reports and generated validation evidence are
confined to `packages\react-components\react-portal\library\src\components\Portal`. Production
implementation and existing unit tests are unchanged. No branch switch, commit, shared configuration
edit, nested agent, next-component work, or separate final independent review was performed.

Final Windows execution: **60 passing, 0 failing, 0 pending, 0 skipped**, twice consecutively
(`Portal.cy-round4.log`, `Portal.cy-final.log`). Cypress **14.4.1**, headless **Chrome 154**,
React **19.2.0**, axe-core **4.10.2**. **17 strict scoped axe audits** each assert a nonempty pass
set, zero violations and zero incomplete findings. Source regression: **13 unit tests and 2
snapshots passing across 4 suites**, including the true Node SSR test.

Scoped spec ESLint and local config ESLint each exit **0**. Spec and external-source baseline
TypeScript each exit **2** with **the identical 14 diagnostic lines**; **zero added diagnostics,
zero diagnostics in this component directory**. This is not a clean whole-repository typecheck claim.
`reports\validation-summary.json` persists the exact baseline/spec comparison and complete axe
reports. Baseline intentionally imports the same existing stable story dependencies without this
new Cypress spec.

## Source inventory inspected

Paths below are repository-relative; slashes here identify repository source paths, not shell commands.

| Key         | Inspected source and derived contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-API       | `packages/react-components/react-portal/library/src/components/Portal/{index.ts,Portal.tsx,Portal.types.ts}`: `children` and `mountNode` only; not a slotted DOM wrapper, no public root ref/event/style/ARIA props. `mountNode` accepts HTMLElement, null, or `{ element?, className? }`.                                                                                                                                                                                                                              |
| P-RENDER    | Same directory, `renderPortal.tsx`: hidden logical span; React portal children rendered directly to destination; hidden trailing sentinel even for empty children.                                                                                                                                                                                                                                                                                                                                                      |
| P-HOOK      | Same directory, `usePortal.ts`: normalization, explicit element precedence, fallback hook disabled for explicit elements, virtual-parent linking and cleanup, contained-anchor circularity guard.                                                                                                                                                                                                                                                                                                                       |
| P-FACTORY   | Same directory, `usePortalMountNode.ts`: default document body, internal portal context target, ownerDocument allocation, legacy versus modern factories, class/direction updates, insertion-effect cleanup, empty-child disposal and StrictMode implications.                                                                                                                                                                                                                                                          |
| P-STYLE     | Same directory, `usePortalMountNodeStyles.styles.ts`: absolute top/left/right zero and z-index 1000000.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| P-UNIT      | Same directory, `Portal.test.tsx`, `usePortalMountNode.test.tsx`, `__snapshots__/Portal.test.tsx.snap`: direction, zIndex, default DIV/data attribute/body, context target, className, disabled hook, contained-anchor regression.                                                                                                                                                                                                                                                                                      |
| P-SSR       | Same directory, `Portal-node.test.tsx`: real no-DOM server rendering emits exactly `<span hidden=""></span>` under SSRProvider.                                                                                                                                                                                                                                                                                                                                                                                         |
| P-NORMALIZE | `packages/react-components/react-portal/library/src/utils/{toMountNodeProps.ts,toMountNodeProps.test.ts}`: element, null, undefined, object and class normalization.                                                                                                                                                                                                                                                                                                                                                    |
| P-DOC       | `packages/react-components/react-portal/library/README.md`: default/custom mount, provider theming, children styling, virtual hierarchy. Some README example root `id` props are not in the current Portal API.                                                                                                                                                                                                                                                                                                         |
| P-STORY     | `packages/react-components/react-portal/stories/src/Portal/{index.stories.tsx,PortalDefault.stories.tsx,PortalDescription.md}`: toggling custom destination, overflow escape, theme/text direction, owned data attribute. Actual Default story is mounted in R1.02.                                                                                                                                                                                                                                                     |
| N-STORY     | `packages/react-components/react-portal/stories/src/toMountNodeProps/{index.stories.tsx,Default.stories.tsx,toMountNodePropsDescription.md}`: object class customization and generated zIndex override. Actual Default story is mounted in R1.03.                                                                                                                                                                                                                                                                       |
| F-API       | `packages/react-components/react-provider/library/src/components/FluentProvider/{FluentProvider.types.ts,useFluentProvider.ts,useFluentProviderContextValues.ts,useFluentProviderThemeStyleTag.ts}`: theme merge, direction, targetDocument, class propagation toggle, stylesheet document and cleanup.                                                                                                                                                                                                                 |
| F-UNIT      | Same directory, `FluentProvider.test.tsx`, `FluentProvider-node.test.tsx`: provider direction/style, browser versus server theme styles and IDs. Inspected as dependency contracts; not added to the Portal regression command.                                                                                                                                                                                                                                                                                         |
| F-STORIES   | `packages/react-components/react-provider/stories/src/Provider/{index.stories.tsx,FluentProviderDefault.stories.tsx,FluentProviderDir.stories.tsx,FluentProviderNested.stories.tsx,FluentProviderFrame.stories.tsx,FluentProviderApplyStylesToPortals.stories.tsx,FluentProviderDescription.md,FluentProviderBestPractices.md}`: all stable provider stories/docs inspected; BestPractices file is empty. Adapted fixtures isolate relevant Portal contracts, while R3.01 mounts the actual ApplyStylesToPortals story. |
| CONTEXT     | `packages/react-components/react-shared-contexts/library/src/{PortalMountNodeContext.ts,ProviderContext/ProviderContext.ts,ProviderContext/index.ts,index.ts}`: HTMLElement/ShadowRoot internal target and undefined-document boundary. ShadowRoot is supported through the context, not the public Portal mountNode type.                                                                                                                                                                                              |
| UTILS       | `packages/react-components/react-utilities/src/virtualParent/{elementContains.ts,getParent.ts,setVirtualParent.ts,setVirtualParent.test.ts,isVirtualElement.ts,isVirtualElement.test.ts}` and `src/ssr/{SSRContext.tsx,SSRContext.test.tsx,SSRContext-node.test.tsx}`: physical versus logical containment and SSR/browser distinction.                                                                                                                                                                                 |
| RUNNER      | `scripts/cypress/src/{base.config.ts,browser/mount.ts}`, shared support, plus local TableSelectionCell and DrawerFooter Cypress configuration/spec/tsconfig prior art. Uses repository StrictMode mount, Windows-installed dependencies, local port and scoped outputs.                                                                                                                                                                                                                                                 |

## Scenario-to-source manifest

IDs below map one-to-one to runnable `it` cases. Parameterized R1.04–07, R1.09–10, R1.19–20 and
R2.19–20 each produce separate cases. Round gating is explicit selection through `coverageRound`,
not runtime skipping or pending tests; default runs all four rounds.

| ID    | Source basis                                | Exact observable assertion / interaction                                                                                                                                                                                                                                    |
| ----- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1.01 | P-API, P-RENDER, P-FACTORY, P-STYLE, P-UNIT | Default owned DIV attached directly to ownerDocument body; `data-portal-node=true`, `dir=ltr`, computed absolute/1000000; hidden empty logical anchor and sentinel; real click focuses child; axe content.                                                                  |
| R1.02 | P-STORY                                     | Actual stable story real toggles `aria-pressed`, open code output and custom external content; hidden sentinel exists; close removes portal content.                                                                                                                        |
| R1.03 | N-STORY                                     | Actual normalization story opens generated node, computed zIndex is exactly 1; close removes owned node. Control wrapper is spaced down because fixed story content otherwise physically covers the toggle.                                                                 |
| R1.04 | P-NORMALIZE, P-FACTORY                      | Omitted/undefined mount falls back to document body.                                                                                                                                                                                                                        |
| R1.05 | P-NORMALIZE, P-FACTORY                      | Null mount falls back to body, not “closed”.                                                                                                                                                                                                                                |
| R1.06 | P-NORMALIZE, P-FACTORY                      | Empty object mount falls back to body.                                                                                                                                                                                                                                      |
| R1.07 | P-NORMALIZE, P-FACTORY                      | Object with null element falls back to body.                                                                                                                                                                                                                                |
| R1.08 | N-STORY, P-FACTORY                          | Both supplied class tokens appear on generated mount only, not children.                                                                                                                                                                                                    |
| R1.09 | P-API, P-HOOK                               | Direct HTMLElement is used without generated wrapper/data/styles; consumer class, RTL and zIndex 7 remain; full custom host axe; removal preserves host and sibling.                                                                                                        |
| R1.10 | P-NORMALIZE, P-HOOK                         | Object explicit HTMLElement behaves identically; accompanying className is not applied to the consumer host.                                                                                                                                                                |
| R1.11 | P-HOOK, P-UNIT, UTILS                       | Host containing logical anchor retains physical logical-parent parent, exactly two direct hidden spans; containment terminates without a virtual cycle.                                                                                                                     |
| R1.12 | P-FACTORY, P-UNIT, CONTEXT                  | PortalMountNodeProvider creates a distinct owned DIV under target rather than using target directly.                                                                                                                                                                        |
| R1.13 | P-HOOK, CONTEXT                             | Explicit mount overrides context destination; context host empty, no fallback data node.                                                                                                                                                                                    |
| R1.14 | P-FACTORY, P-RENDER                         | Close removes owned body mount and logical anchor; old node disconnected; reopen allocates different node, exactly one live mount.                                                                                                                                          |
| R1.15 | P-API, P-RENDER                             | Two real updates produce revision 2 on same wrapper with exactly one sentinel.                                                                                                                                                                                              |
| R1.16 | P-RENDER, P-FACTORY                         | Empty/null children retain one hidden sentinel; StrictMode unmount removes wrapper.                                                                                                                                                                                         |
| R1.17 | P-DOC, CONTEXT                              | Standalone Portal renders default LTR; real child focus and strict content axe without requiring FluentProvider.                                                                                                                                                            |
| R1.18 | F-API, F-STORIES, P-UNIT                    | Same generated wrapper: isolated real context LTR → RTL → LTR preserves all classes/light CSS tokens and native content direction; stable scope then forwards actual FluentProvider context unchanged for the original light/LTR → dark/RTL theme/dir update and axe audit. |
| R1.19 | F-API, F-STORIES                            | applyStylesToPortals=true copies consumer-provider class and exposes theme token.                                                                                                                                                                                           |
| R1.20 | F-API, F-STORIES                            | applyStylesToPortals=false excludes consumer-provider class but still exposes theme token.                                                                                                                                                                                  |
| R2.01 | P-HOOK, UTILS, P-DOC                        | Native ancestor.contains is false; elementContains true; getParent is hidden anchor; reverse containment false.                                                                                                                                                             |
| R2.02 | P-DOC, P-HOOK, UTILS                        | Two nested owned nodes; transitive virtual containment but separate DOM trees; real inner focus and axe.                                                                                                                                                                    |
| R2.03 | P-HOOK, UTILS                               | Custom host getParent changes from virtual SPAN to physical logical parent after unmount.                                                                                                                                                                                   |
| R2.04 | P-RENDER, React portal browser semantics    | Portal real click increments logical React ancestor; native logical-parent listener never fires; native body listener fires once.                                                                                                                                           |
| R2.05 | P-RENDER, React portal browser semantics    | Child stopPropagation leaves logical click count at opener’s one click.                                                                                                                                                                                                     |
| R2.06 | P-API, P-RENDER                             | Real typing sets input `portal`; React ancestor receives key `l`, then Escape; Escape does not dismiss; labeled-input axe.                                                                                                                                                  |
| R2.07 | P-API, P-RENDER                             | Opening leaves focus on opener; Tab reaches portal action/input; Shift+Tab returns through action to opener (no trap); closing removes content.                                                                                                                             |
| R2.08 | P-API, P-FACTORY                            | Child real close removes focused child; activeElement becomes body, not opener (no built-in restoration).                                                                                                                                                                   |
| R2.09 | P-API, P-RENDER                             | Arbitrary React context text crosses portal; child ref equals actual button; real click focuses actual child.                                                                                                                                                               |
| R2.10 | P-API, P-RENDER                             | Child callback ref final first argument becomes null on unmount; ignores React internal extra arguments, not ref cleanup itself.                                                                                                                                            |
| R2.11 | P-HOOK, P-FACTORY                           | Default fallback → custom A disconnects old owned wrapper; renders directly into A; zero data nodes.                                                                                                                                                                        |
| R2.12 | P-HOOK, UTILS                               | A → B moves content, clears A virtual parent, retains siblings; B has one sentinel then only sibling after unmount.                                                                                                                                                         |
| R2.13 | P-HOOK, P-FACTORY                           | B → fallback allocates exactly one body mount; both consumer hosts retain their siblings.                                                                                                                                                                                   |
| R2.14 | P-FACTORY, N-STORY                          | Generated class update removes stale class-a, adds class-b, retains external-class and wrapper identity.                                                                                                                                                                    |
| R2.15 | P-FACTORY, P-RENDER                         | Two keyed logical portals reorder anchors but existing body DOM remains creation order a,b; no duplicate anchors.                                                                                                                                                           |
| R2.16 | F-API, F-STORIES                            | Nearest provider RTL, salmon partial brand token, inherited light foreground token and computed direction; scoped axe.                                                                                                                                                      |
| R2.17 | F-API, P-API                                | Generated wrapper gets dir, not arbitrary provider lang/aria-label attributes.                                                                                                                                                                                              |
| R2.18 | P-STORY, P-DOC, P-STYLE                     | Content positioned beyond real 40px overflow-hidden ancestor stays visible at left 300px, clickable/focusable and physically outside clip; axe.                                                                                                                             |
| R2.19 | F-STORIES, F-API, P-FACTORY                 | iframe targetDocument default creates owned DIV in frame body, ownerDocument differs from main doc, RTL/zIndex/theme are computed in frame realm; CDP real pointer click increments React output and focuses frame child; frame-realm axe.                                  |
| R2.20 | P-API, P-NORMALIZE, F-STORIES               | Explicit foreign-document body is used directly without owned data marker; real iframe click/focus and frame-realm axe.                                                                                                                                                     |
| R2.21 | CONTEXT, P-FACTORY, P-HOOK                  | ShadowRoot context creates owned node; real click focuses shadow child; exact observed React ancestor count 2; shadow-descendant axe; close empties ShadowRoot childNodes; reopen leaves one node.                                                                          |
| R2.22 | P-API, CONTEXT                              | Explicit HTMLElement inside open ShadowRoot is used directly without data wrapper; real click and shadow-descendant axe.                                                                                                                                                    |
| R2.23 | CONTEXT, P-SSR                              | Undefined document produces exactly hidden anchor and no content/data nodes; real “provide document” action activates body content while anchor remains empty.                                                                                                              |
| R2.24 | P-SSR, P-RENDER, CONTEXT                    | hydrateRoot accepts node-test anchor markup; document becomes available after effect; no recoverable hydration mismatch; real child focus and axe.                                                                                                                          |
| R2.25 | P-FACTORY, P-UNIT                           | Direct hook disabled prevents node allocation; enable creates classed data DIV; disable disposes empty hook-created DIV.                                                                                                                                                    |
| R2.26 | P-HOOK, P-RENDER                            | Stateful child real click increments; ordinary parent update preserves state; change to different destination remounts child/reset count.                                                                                                                                   |
| R3.01 | F-STORIES, F-API                            | Actual provider ApplyStylesToPortals iframe story has two mounts/two providers; copied provider class/padding 5px versus no provider class/padding 0px.                                                                                                                     |
| R3.02 | P-API, P-RENDER                             | Omitted/false/text/fragment/array children render directly in five mounts; text node preserved; one sentinel each, no child wrapper; fragment button real focus.                                                                                                            |
| R3.03 | P-API, P-RENDER, P-FACTORY                  | Children → null keeps same owned node with sentinel; restore reuses that same node.                                                                                                                                                                                         |
| R3.04 | P-API, P-DOC                                | Child class, ARIA label, 4px border and event handler update on same child; real click calls new handler; axe updated child content.                                                                                                                                        |
| R3.05 | P-HOOK, P-FACTORY                           | Closing outer nested subtree removes both owned nodes and sets descendant object ref null.                                                                                                                                                                                  |
| R3.06 | F-STORIES, P-FACTORY                        | Frame subtree removal empties frame body of owned mount but preserves live iframe document/frame element.                                                                                                                                                                   |
| R3.07 | P-API, P-HOOK                               | Detached explicit element receives React children/sentinel without automatic attachment; consumer real attach makes child visible and focusable; full consumer-attached host axe.                                                                                           |
| R3.08 | P-NORMALIZE, P-API                          | Object foreign-realm body normalized correctly; ignores className on explicit destination, no generated global-body fallback.                                                                                                                                               |
| R3.09 | P-STYLE, P-RENDER                           | Equal-zIndex overlapping portal mounts receive topmost real click in creation order; remove top, then bottom real click succeeds.                                                                                                                                           |
| R3.10 | P-FACTORY, P-RENDER                         | Four real open/close cycles under default StrictMode leave one live mount when open and no mounts/anchors when closed.                                                                                                                                                      |
| R3.11 | P-RENDER                                    | Hidden logical anchor does not make detached content physically hidden/aria-hidden; real focus and labeled input-content axe.                                                                                                                                               |
| R3.12 | F-API, P-FACTORY                            | Provider inline font 29px and border 9px are not copied as mount style attribute; generated mount retains computed 14px/0px defaults.                                                                                                                                       |
| R4.01 | P-FACTORY, CONTEXT                          | Characterization finding: change context target A → B alone keeps original modern-factory node under A; keyed remount disconnects A mount and allocates under B.                                                                                                            |
| R4.02 | P-FACTORY, CONTEXT, F-API                   | Characterization finding: change targetDocument alone keeps original body node; keyed remount disconnects it and creates iframe-body mount.                                                                                                                                 |

R1.18 compile-only mutation evidence distinguishes the missing Portal direction dependency
(first isolated RTL assertion) from a missing FluentProvider context-memo direction dependency
(original combined dark/RTL assertion after both isolated flips). Native Chrome results, raw
JUnit and matching Node/browser transformed-source proofs are retained in the mutation harness;
the provider control is not a catalog entry.

## Accessibility and interaction methodology

- Real CDP pointer/keyboard input (`realClick`, `realPress`, `realType`); no forced clicks, sleeps,
  exception suppression, snapshots as functional substitutes, retries, conditional skips or stubs of
  production behavior. Listener/ref stubs are observation only. DOM mutation is explicit consumer
  behavior in detached-host/class tests and trusted static SSR markup setup in hydration.
- Axe runs all applicable rules without disabling any rule or stripping findings. Normal scopes
  are the complete named content section/custom host; shadow scopes are the complete shadow host,
  and axe discovers its shadow descendants. Main Cypress page chrome/landmarks are not product
  content and are outside these scopes.
- Each audit writes its complete violations/incomplete objects and passing-rule IDs through the
  local task into the run log. Passes include `button-name`, `color-contrast`, `nested-interactive`,
  ARIA validation and, for labeled fields, `label`, `label-title-only`, duplicate-ID and multiple-label
  checks. All 17 audited states produced zero incomplete checks, not merely zero reported violations.
- iframe audits execute the installed **raw** axe browser source in the frame’s own window before
  auditing the complete named frame content. Webpack-transformed `axe.source` cannot be evaluated
  as-is in a separate realm (`exports is not defined`); the local read-only task avoids that harness
  problem without changing production modules or disabling frame rules.
- Real iframe pointer coordinates are derived from the actual child rect and dispatched relative
  to the outer frame. Assertions verify the frame document’s activeElement, not the main document’s.
- Stable stories are mounted unchanged inside a wrapper. The actual provider style story is a
  propagation test, not a claimed full-page accessibility pass: its original iframe is untitled.
  Likewise actual Portal stories are not claimed as complete pages. Dedicated accessibility
  fixtures provide named regions, labeled controls and explicit high-contrast child styling.

## Findings and boundaries

1. **Modern factory target changes are not relocation.** R4.01/R4.02 verify the current observable
   retention behavior, not a guarantee that a destination update should behave this way. The factory
   caches its first actual DOM node. Consumers needing a changed provider target/document must
   remount Portal (for example a changed key); changing public explicit mountNode is separately
   covered and does move children. No production fix was made because this task is scoped coverage.
2. **Shadow-boundary React click duplication.** In the R2.21 same-logical-and-physical ancestor
   fixture, one real click produces exactly two React ancestor callbacks (portal dispatch plus
   retargeted shadow event). This is retained as an explicit browser characterization, not normalized
   away. Shadow focus is measured against ShadowRoot.activeElement.
3. **Custom elements are consumer-owned.** No fallback wrapper, dir, theme/style class or arbitrary
   className is added to explicit custom mount elements. React context still propagates; DOM CSS
   inheritance comes from the destination. The sentinel/content are removed, the consumer host and
   siblings are preserved. Detached mounts do not auto-attach or become keyboard-reachable.
4. **Generated styles do not automatically cross a shadow CSS boundary.** Shadow fixtures use
   consumer-provided child styling and test actual focus/events/ownership. No claim is made that
   document-head provider/Griffel styles automatically theme a shadow tree. iframe styling uses
   the documented targetDocument + RendererProvider combination.
5. **Portal is not a dialog.** It does not trap/autofocus/restore focus, dismiss on Escape, or supply
   roles, live announcements or a root ref. Accessibility semantics/labels/ref/styles belong to the
   children. The README examples with Portal root `id` are documentation drift relative to types.
6. **SSR distinction:** R2.23 exercises an explicit missing-document browser context; R2.24 hydrates
   the known server anchor. Neither pretends that browser renderToString is a real no-DOM server.
   The original `Portal-node.test.tsx` was actually executed under Jest’s Node environment and
   confirms the server snapshot. Hydration uses one non-StrictMode inner root to avoid intentionally
   double-hydrating the same host; all other repository mounts default to StrictMode.
7. Legacy React 16/17 factory behavior, concurrent abandoned transitions/Suspense performance,
   cross-origin/sandboxed iframe access, closed shadow roots, browser navigation persistence,
   non-Chromium browsers, touch, high-contrast OS rendering and assistive-technology speech are not
   covered. Document/ShadowRoot are context destinations, not valid public mountNode prop types.
8. The test runner warns about installed Chrome extension policy and an Nx SWC fallback.
   Neither blocked the final run. Installed Windows dependencies were reused; no install was needed,
   and no dependency manifest or shared runner configuration changed.

## Round execution and fixes

| Round | Cypress executions                                                                                      | Corrections supported by the observed failures                                                                                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `Portal.cy-round1.log`: 15/20; `Portal.cy-round1-fixed.log`: 20/20                                      | Chai attribute assertions can replace chain subjects; order visibility/class assertions before bare attribute checks. Fixed-position stable story content covered its toggle; move only outer test wrapper controls down.                                                                                |
| 2     | `Portal.cy-round2.log`: 42/46; `Portal.cy-round2-fixed.log`: 45/46; `Portal.cy-round2-green.log`: 46/46 | React 19 callback ref may carry extra internal arguments; assert first final argument null. Raw iframe axe source task resolves webpack exports error. Shadow real click revealed double React propagation. ShadowRoot emptiness must assert childNodes, not chai-jQuery “empty” on a document fragment. |
| 3     | `Portal.cy-round3.log`: 55/58; `Portal.cy-round3-fixed.log`: 58/58                                      | Later same-zIndex root covered fragment click; place fragment action below it. A `.then` returning Chai Assertion changed real-event subject; retain jQuery subject. Wait for mounted consumer DOM and observe actual committed detached state element after StrictMode double initialization.           |
| 4     | `Portal.cy-round4.log`: 60/60; `Portal.cy-final.log`: 60/60                                             | Added explicit provider-target/document retention findings and keyed-remount workaround; both runs green.                                                                                                                                                                                                |

Jest initially invoked from repository root inherited a cwd-sensitive module-name mapper and failed
before executing tests (`Portal.cy-unit.log`). Running from the library directory, without altering
shared config, passed all 13 tests (`Portal.cy-unit-fixed.log`). Type/lint failures in early
iterations were addressed in owned files; final type residuals exactly match the external baseline.

## Reproduction

Run from the repository root in PowerShell. `.cmd` executables are intentional on Windows.

```powershell
$p = 'packages\react-components\react-portal\library\src\components\Portal'
& .\node_modules\.bin\cypress.cmd run --component --browser chrome --headless --project packages\react-components\react-portal\library --config-file src\components\Portal\Portal.cypress.config.cjs
# Round 1 alone: append --env coverageRound=1; cumulative round 2/3: coverageRound=2/3.
Push-Location packages\react-components\react-portal\library
& ..\..\..\..\node_modules\.bin\eslint.cmd src --no-cache
Pop-Location
& .\node_modules\.bin\eslint.cmd "$p\Portal.cypress.config.cjs"
& .\node_modules\.bin\tsc.cmd --project "$p\Portal.cy-baseline.tsconfig.json" --pretty false
& .\node_modules\.bin\tsc.cmd --project "$p\Portal.cy.tsconfig.json" --pretty false
& .\node_modules\.bin\tsc.cmd --project "$p\testing\tsconfig.json" --pretty false --noEmit --incremental false --composite false
Push-Location packages\react-components\react-portal\library
& ..\..\..\..\node_modules\.bin\jest.cmd --config .\jest.config.cjs --runInBand --runTestsByPath src\components\Portal\Portal-node.test.tsx src\components\Portal\Portal.test.tsx src\components\Portal\usePortalMountNode.test.tsx src\utils\toMountNodeProps.test.ts --cacheDirectory src\components\Portal\.jest-cache --coverage=false
Pop-Location
```

The local config reuses repository baseConfig, uses port **45226**, disables retries/video/fixtures
and webpack cache, places build/download/screenshot/video paths in this directory, and writes JUnit
to `reports\results-[hash].xml`. Historical failed and successful round logs/reports are retained,
so use `Portal.cy-final.log` for the final result rather than aggregating all historical JUnit files.
The final screenshot directory has no failures. Disposable local build/Jest caches are removed after
validation; configuration recreates them on a later run.

### Authored and retained evidence files

- `testing/Portal.cy.stories.tsx`: retained 60-case functional suite, twelve R5 additions and strict axe helpers.
- `testing/Portal.cy-entry.stories.tsx`, `testing/Portal.cy-jsx.stories.ts`,
  `testing/Portal.cy-aliases.stories.ts`: explicit registration entry and type-only JSX bridges;
  excluded by both unchanged production TypeScript and SWC configurations.
- `Portal.cypress.config.cjs`: isolated Windows-compatible runner, raw frame-axe read task and
  audit-report logging task.
- `Portal.cy.tsconfig.json`, `Portal.cy-baseline.tsconfig.json`, `Portal.cy-webpack.tsconfig.json`:
  scoped compile checks, same-import external baseline and esbuild include coverage.
- `testing/tsconfig.json`: regular TypeScript project-service discovery for all four testing files;
  no shared lint or production configuration changes.
- `Portal.cy.md`: this source/scenario manifest, findings, reproduction and scope limits.
- `Portal.cy-round1*.log`, `Portal.cy-round2*.log`, `Portal.cy-round3*.log`,
  `Portal.cy-round4.log`, `Portal.cy-final.log`: round results and axe JSON evidence.
- `Portal.cy-lint.log`, `Portal.cy-config-lint.log`, `Portal.cy-typecheck.log`,
  `Portal.cy-baseline-typecheck.log`, `Portal.cy-unit.log`, `Portal.cy-unit-fixed.log`.
- `reports\results-*.xml`, `reports\validation-summary.json`: generated JUnit and machine-readable
  baseline/axe evidence.
