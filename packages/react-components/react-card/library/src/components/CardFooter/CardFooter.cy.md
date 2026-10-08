# ONLY127 CardFooter functional coverage

Repository writes are confined to this component. Validation evidence may also be written to the authorized session `files\coverage-121-140\CardFooter` directory. Production implementation, existing unit tests, snapshots, shared configuration, other components, dependencies, branches and commits are unchanged. The pre-existing 106-case hand-authored fixture, all its scenario groups, and historical logs/JUnit/screenshots are preserved; these cases are audited prior user work, not newly authored cases.

## Current integration and execution

`CardFooter.cy.tsx` is the two-import canonical entry selected by the **unchanged package** `cypress.config.ts` and `tsconfig.cy.json`. It imports the real React 19/global JSX type bridge and the complete fixture in `testing\`. The standard Cypress program did not import CardHeader's story-suffixed alias bridge; actual package type checking established that the owned type-only alias registration is needed. The regular nearest `testing\tsconfig.json` enables unchanged parent ESLint project-service discovery without parser overrides.

The actual production TypeScript config excludes `.cy.tsx` and story-suffixed sources. This alone does not prove production isolation: the actual SWC executor uses `micromatch.isMatch(absoluteWindowsPath, exclude, { contains: true })`, and story suffixes are **not** excluded. The full fixture, JSX bridges and audit helper therefore live under the already-excluded `/testing` directory; the root canonical `.cy.tsx` is separately covered by the actual SWC `.cy.tsx` rule. Actual isolated executor output and real production-program file lists are recorded in session evidence. No shared helper outputs are rebuilt or removed for this proof.

The package already has registered `react-card:e2e` automation. Its inherited `scripts-cypress:build` dependency must remain enabled. The actual dependency-enabled task graph and cold isolated run start with both helper output directories physically absent; successful resolution must remain inside that physical isolated checkout. No nested substitute project or empty dependency override is introduced.

Current runner commands, from the repository root:

```powershell
$runner = 'packages\react-components\react-card\library\src\components\CardFooter\CardFooter.run.cjs'
node $runner cypress 5 direct
# Use the approved existing Node 22 executable for the unchanged ESM package config.
& $node22 $runner standard 5 standard
node $runner checks
```

`$node22` denotes the existing `node-v22.20.0-win-x64\node.exe` runtime provided for this campaign. `CARD_FOOTER_EVIDENCE` optionally selects the authorized artifact directory; otherwise new evidence is created under owned `.temp\`. Every invocation appends a timestamp/PID to its label and creates new raw JUnit, audit ledger, command/exit and source-before/after files. The runner does not overwrite historical reports. Both routes use port **46127**, Chrome, retries=0 and `trashAssetsBeforeRuns=false` with unique assets. The standard route loads the actual unchanged package configuration, not the private CJS configuration.

Stable exported Card stories still load the exact checked-in image bytes. Cypress's native **binary fixture response** reads those original files relative to the unchanged helper fixture directory; no images, dimensions, layouts or production callbacks are substituted. A failed intermediate browser-Buffer transport attempt is retained as historical evidence, not claimed green.

## Sources and API boundaries

| Key  | Reviewed stable source                                                                                                                                                                      | Contract                                                                                                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1   | `../../../../stories/src/CardFooter/CardFooterDescription.md`, `CardFooterDefault.stories.tsx`, `index.stories.tsx`                                                                         | Flex action layout; Reply/Share followed by a far-end More options action. The actual exported Default story is mounted.                                                                                                                                                                 |
| D2   | `../../../../stories/src/Card/CardDefault.stories.tsx`, `CardAction.stories.tsx`, `CardFocusMode.stories.tsx`, `CardDisabled.stories.tsx`                                                   | Actual stable Card compositions with CardFooter; native actions, ancestor bubbling, focus management and explicit disabled children. These exports are mounted, not recreated.                                                                                                           |
| D3   | All remaining stable Card stories and docs: `CardDescription.md`, `CardBestPractices.md`, Appearance, Orientation, Size, Selectable, SelectableIndicator, Templates and `index.stories.tsx` | Reviewed inherited design, selection, anatomy and accessible naming guidance. These stories do not use CardFooter (some use native footers); their applicable Card APIs are covered with named, focused fixtures rather than claiming those native footers are CardFooter.               |
| T1   | `CardFooter.types.ts`, `CardFooter.tsx`, `index.ts`                                                                                                                                         | Root and optional action are `Slot<'div'>`. There are no footer-specific appearance, size, orientation, selected, disabled or controlled-state props. `as` is typed only as `div`; no cast expands that API.                                                                             |
| S1   | `useCardFooter.ts`, `renderCardFooter.tsx`                                                                                                                                                  | Root intrinsic props/ref; optional action shorthand resolution; root children precede the action; both slot render callbacks and public base/full hooks plus renderer.                                                                                                                   |
| S2   | `useCardFooterStyles.styles.ts`                                                                                                                                                             | Static root/action classes; row flex, 12px gap, logical-end auto margin, consumer style precedence and forced-colors Button/Link rules.                                                                                                                                                  |
| U1   | `CardFooter.test.tsx`, `__snapshots__/CardFooter.test.tsx.snap`, `../../testing/isConformant.ts`                                                                                            | Browser-observable snapshot anatomy and conformance-derived refs, native attributes, slot/class forwarding, consumer classes and styles. This suite supplements rather than reruns/replaces Jest conformance tests.                                                                      |
| I1   | `../Card/Card.types.ts`, `useCard.ts`, `Card.test.tsx`, `useCard.test.ts`                                                                                                                   | Four focus modes; disabled versus child disabled; interactive focus and native keyboard access. Current source defaults interactive Card to `no-tab`, despite the older `Card.test.tsx` test title/assertions describing `tab-only`. Source and real browser behavior govern this suite. |
| I2   | `../Card/useCardSelectable.ts`, `useCardSelectable.test.ts`                                                                                                                                 | Controlled/uncontrolled selection, nested focusable action restriction, Enter handling, checkbox bypass and click/change deduplication.                                                                                                                                                  |
| I3   | `../Card/CardContext.ts`, `renderCard.tsx`, `useCardContextValue.ts`, `useCardStyles.styles.ts`, `../CardHeader/useCardHeader.ts`                                                           | Header-derived checkbox name, independent contexts, direct-child non-shrink, horizontal growth, Card padding/orientation/appearance and high contrast. CardFooter itself does not subscribe to Card selection context.                                                                   |
| G1   | FluentProvider types/rendering and custom-style context; `react-utilities/src/compose/slot.ts`                                                                                              | Provider direction/theme/style hooks and public shorthand/render callback behavior.                                                                                                                                                                                                      |
| R1   | Local DrawerFooter runner/config/TypeScript bridge and TableSelectionCell functional prior art                                                                                              | Isolated Windows Chrome component runner, real events, source aliases, scoped checks and persistent audit reporting. No prior-art files are modified.                                                                                                                                    |
| Spec | Library `README.md`, `docs/Spec.md`, `etc/react-card.api.md` and public `src/CardFooter.ts`                                                                                                 | README composition, specification Task text-footer and actual exported types/hooks. The proposal's older horizontal-card restriction and design-prop proposals are not substituted for current implementation/API.                                                                       |

## Source-to-scenario matrix

Every case has observable assertions and one full `axe.run` audit of `#fixture`, including surrounding Card context and focus sentinels. No axe rule, violation or incomplete category is globally disabled. Pointer/keyboard actions use `cypress-real-events`; `.focus()` establishes a starting focus, while navigation and activation are native events. Computed styles and bounding rectangles test actual layout, not class existence alone.

The central ordinary and forced-colors audit capture now requires a connected scope and retries native `Element.getAnimations({ subtree: true })` readiness until no finite running or pending animation remains. Ancestor-only animations are also inspected because inherited colors affect the scope. Computed iterations, duration and end time distinguish finite transitions from infinite animations; the existing Cypress default command timeout bounds readiness and yields an explicit assertion failure. No fixed sleep, media/theme override, animation disabling or axe retry is used. The existing phase, hover state, rule order, violation and incomplete envelopes remain unchanged. Audit records include observed native transitions and endpoint computed colors. An opt-in `cardFooterAnimationReadinessControl` exercises the actual readiness command on scoped browser animations: a running finite animation causes a blocked assertion attempt, then native `finish()` scheduled on the next animation frame allows Cypress's retry to capture; a simultaneous infinite animation does not block. Records retain the blocked-attempt count and finished lifecycle proof. The neutral-opacity controls neither replace producers nor register additional cases.

The retained original unmutated campaign baseline `CardFooter-baseline-1791273705075-49268` is **INVALID**, with 120 executed, 116 passed, four assertion failures and no pending/skipped cases. Diagnosis observed an ordinary contrast audit during a 100ms native transition (temporary `#717171` on `#f2f2f2`, ratio 4.35), and forced-hover captures during unfinished action color transitions before the known endpoint finding. The shared-source diagnostic executed 118/120 and instrumented frozen-source diagnostic 117/120; neither is a green baseline. Pending reversed transitions were observed in R5.11, but its exact original failure timing was not reproduced. This is test capture readiness evidence, not authorization for a production fix or transient-color acceptance. The original 120 full titles and failed-run records are preserved; only a fresh full green unmutated baseline under the explicit baseline-stabilization ledger can permit a subsequent mutant.

### Round 1: 19 cases

| Scenario    | Cases | Sources    | Observable coverage                                                                                                                                           |
| ----------- | ----: | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1.01       |     1 | D1         | Actual Default story, accessible action names, DOM order, 300px width and far-end action.                                                                     |
| R1.02       |     2 | S2         | LTR/RTL measured row alignment, 12px gaps and logical-end free-space consumption.                                                                             |
| R1.03       |     2 | D1, S1     | Real Tab and Shift+Tab follow DOM order in both directions and leave the footer.                                                                              |
| R1.04       |     6 | T1, S1, U1 | Omitted/null action versus string, number, JSX and empty object; exact wrapper count, tags, text order; no invented role/tabIndex or leaked action attribute. |
| R1.05       |     1 | T1, S1, U1 | Action object attributes, accessible group, style/class merging, actual ref and click target.                                                                 |
| R1.06       |     1 | T1, U1     | Root ref identity, title/data/class forwarding and resolved accessible name.                                                                                  |
| R1.07       |     1 | S1, U1     | Callback root ref on mount, null on conditional unmount and restored footer.                                                                                  |
| R1.08-R1.09 |     2 | T1, S2     | Supported explicit root/action `as="div"` without broadening the declared API.                                                                                |
| R1.10       |     1 | D1         | Native button pointer, Enter and Space each activate once.                                                                                                    |
| R1.11       |     1 | S1         | Root receives real bubbled click/key events with the child as event target.                                                                                   |
| R1.12       |     1 | T1         | Caller-supplied focusable group root is a normal tab stop, not an invented button or keyboard manager.                                                        |

### Round 2: 29 additions, 48 cumulative cases

| Scenario    | Cases | Sources | Observable coverage                                                                                                                                          |
| ----------- | ----: | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R2.01-R2.02 |     2 | S1, S2  | Root/action render functions preserve passed props, DOM/ref identity, generated classes, interaction and included action content.                            |
| R2.03-R2.04 |     3 | S1, S2  | Both public hooks plus styles/renderer; base hook without styles does not inject static classes, flex or focus management.                                   |
| R2.05       |     4 | G1, S1  | Array, fragment, empty-string and zero action shorthand; single wrapper and exact contents.                                                                  |
| R2.06       |     1 | T1, S1  | Controlled children, ARIA, classes, styles and click callback replacement on the same root.                                                                  |
| R2.07       |     1 | S1, U1  | Removing/restoring optional action sends null to its ref and preserves the primary-button identity.                                                          |
| R2.08       |     1 | D2, T1  | Controlled disabled child skips Tab and cannot activate until enabled.                                                                                       |
| R2.09       |     1 | S1, S2  | Action Link keeps href/name, keyboard focus and Enter activation.                                                                                            |
| R2.10       |     1 | T1      | Explicit submit child participates in the surrounding native form.                                                                                           |
| R2.11-R2.13 |     3 | S2, G1  | Inline and Griffel overrides with measured spacing; public provider custom-style hook modifies both slots after defaults.                                    |
| R2.14       |     1 | S1      | Caller stopPropagation isolates an action while ordinary primary-button bubbling remains intact.                                                             |
| R2.15       |     1 | G1, S2  | Controlled LTR/RTL provider update changes the logical auto margin without replacing the footer.                                                             |
| R2.16       |     6 | S2, T1  | LTR/RTL fluid widths at 280/400/720px, measured end alignment and real action focus. Supported small Buttons fit the narrow viewport.                        |
| R2.17       |     1 | T1, S2  | Explicit column CSS override, measured vertical gaps and action interaction; not a fabricated footer orientation prop.                                       |
| R2.18       |     1 | S1, U1  | Empty root and action-only footer retain the expected minimal anatomy.                                                                                       |
| R2.19       |     2 | S2      | Both directions: default 96px minimum-width Buttons plus two 12px gaps overflow a 264px root by exactly 48px. No unsupported automatic wrapping is promised. |

### Round 3: 42 additions, 90 cumulative cases

| Scenario    | Cases | Sources    | Observable coverage                                                                                                                                                                                                                                          |
| ----------- | ----: | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R3.01       |     1 | D2, I3     | Actual Card Default footer, non-shrink, names and native Tab.                                                                                                                                                                                                |
| R3.02       |     1 | D2, I1     | Actual WithAction Open button: existing pointer bubbling calls the alert twice; Enter calls the ancestor key handler plus the two click handlers (five cumulative calls). This baseline is retained, not silently suppressed.                                |
| R3.03       |     1 | D2, I1     | Actual four FocusMode story footers, names, Enter entry, footer Tab and Escape return.                                                                                                                                                                       |
| R3.04       |     1 | D2, I1     | Actual ten Disabled story footers; five explicitly disabled pairs; interactive-card Enter/Escape establishes deterministic focus-sentinel state.                                                                                                             |
| R3.05       |     8 | I1         | All four focus modes in LTR/RTL: real entry, footer DOM order, no-tab wrap, tab-exit/tab-only exit, Escape return where supported.                                                                                                                           |
| R3.06-R3.07 |     2 | I1         | Source-default interactive no-tab behavior and controlled focusMode updates, preserving primary-button identity.                                                                                                                                             |
| R3.08       |     4 | I2, I3     | Both directions and both initial selections: noninteractive footer text toggles; nested button spans, pointer, Enter and Space do not toggle selection; exact action and selection callback counts/data.                                                     |
| R3.09       |     2 | I2         | Controlled parent accepting/rejecting selection requests and external updates; footer actions remain isolated.                                                                                                                                               |
| R3.10       |     2 | I1, I2     | Disabled Card suppresses Card click/selection but does not implicitly disable footer Buttons; explicitly disabled children are skipped.                                                                                                                      |
| R3.11       |    12 | I3, S2     | Both directions, all three Card sizes and both orientations: exact parent padding, invariant 12px footer gap, direct-child non-shrink, horizontal growth and measured alignment.                                                                             |
| R3.12       |     2 | I2, I3, G1 | Light/dark selected Card actions remain independently named/operable and undergo actual contrast analysis.                                                                                                                                                   |
| R3.13-R3.14 |     2 | I3         | Updated Header-derived checkbox name without relabeling actions; parent size/orientation/selection updates preserve footer identity.                                                                                                                         |
| R3.15       |     4 | S2, I3     | Actual Chrome forced-colors emulation, LTR/RTL selected/hovered parents, media activation, footer forced-color-adjust, native button/link focus, computed border/outline and exact serious contrast-incomplete baseline. Media is restored after every case. |

### Round 4: 16 additions, 106 cumulative cases

| Scenario    | Cases | Sources | Observable coverage                                                                                                                                |
| ----------- | ----: | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| R4.01-R4.02 |     2 | S1, G1  | Null action render callback suppresses only that slot; controlled render closure updates text/name on the same action node with real activation.   |
| R4.03       |     1 | I2      | Native selection-checkbox Space and Enter each issue one selection callback; subsequent footer Space does not select.                              |
| R4.04       |     1 | T1      | Default footer Buttons are non-submit controls for pointer/Enter/Space in a native form.                                                           |
| R4.05       |     1 | I2      | disabledFocusable Button stays keyboard reachable but neither activates nor selects its enclosing Card.                                            |
| R4.06       |     1 | I2, I3  | Sibling selection contexts keep independent checkbox names/states and isolated footer actions.                                                     |
| R4.07       |     2 | I3      | A footer followed by another div does not receive last-of-type horizontal growth; a wrapped footer does not receive direct-child non-shrink rules. |
| R4.08       |     1 | T1, S2  | Explicit flexWrap override keeps default actions within a 190px root, with measured row gaps and native DOM-order Tab.                             |
| R4.09       |     1 | S1      | Keyed primary-action reorder preserves focused node identity and keeps the action slot last.                                                       |
| R4.10       |     1 | T1, D3  | Root and action groups independently resolve aria-labelledby; root description resolves aria-describedby.                                          |
| R4.11       |     1 | T1, S2  | Controlled native hidden attribute plus explicit display:none removes/reinstates tab stops without replacing the root.                             |
| R4.12       |     4 | I3, G1  | Dark RTL selected Cards in all four appearances preserve footer action behavior and undergo strict contrast audits.                                |

### Round 5: 14 additions, 120 cumulative cases

| Scenario | Cases | Sources                         | Observable coverage                                                                                                                                                                  |
| -------- | ----: | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R5.01    |     1 | Spec, T1, S1                    | Exact specification Task text-footer anatomy; no fabricated action, selection or footer role.                                                                                        |
| R5.02    |     1 | S1, native React event contract | Real pointer/Enter/Space: exactly 24 capture/bubble callbacks in three eight-handler packets, event/native identity, target/currentTarget, trusted click, detail and button payload. |
| R5.03    |     1 | S1                              | Consumer key cancellation blocks native Enter click, while Space activates once; exact key/target/currentTarget/trusted snapshots.                                                   |
| R5.04    |     1 | S1                              | Link-owned cancellation bubbles through action/root with the same native event; exact counts, identity and currentTarget.                                                            |
| R5.05    |     1 | T1, S1                          | Group root has no roving-arrow/Home/End/Escape/Enter/Space activation or selection ownership; native Tab reaches its child.                                                          |
| R5.06    |     1 | U1, S1                          | Root/action callback replacement exact detach-before-attach sequence, including source mount helper's React StrictMode initial replay.                                               |
| R5.07    |     1 | U1, S1                          | Exact null refs on action removal/root unmount and fresh nodes on remount; main button identity persists while only action is removed.                                               |
| R5.08    |     1 | T1, S1                          | Native ARIA-disabled annotations do not implicitly own descendant Button disabled state.                                                                                             |
| R5.09    |     1 | S1, S2                          | Frozen root/action props and styles are not mutated through rerender; original identities/classes/styles remain intact.                                                              |
| R5.10    |     1 | G1, S2                          | Nearest custom style hook runs after both default slot styles and updates live; outer hook never runs for nested footer.                                                             |
| R5.11    |     1 | G1, S2                          | Live light/LTR to dark/RTL and back preserves focused action identity and measured layout; theme color really changes.                                                               |
| R5.12    |     1 | S1, S2                          | Public state hook/renderer forwards mutated state titles, children, styles and root ref without changing caller props.                                                               |
| R5.13    |     1 | T1, native forms                | Real typing and explicit reset Button restore native defaultValue; exact button/footer/form reset callback order.                                                                    |
| R5.14    |     1 | T1, U1                          | Negative root tabIndex does not disable child tab stops; controlled group tab participation preserves root identity.                                                                 |

All 120 cases include a full `axe.run` audit. The original four rounds were already complete and remain preserved; one newly added round is run cumulatively, with every intermediate failure retained until corrections pass. No sleeps, forced clicks, exclusive/skipped tests, retries, exception catches or disabled axe rules are used.

## Accessibility baseline classification

These are actual findings from untouched production/stable-story code, initially reproduced in failed Round 3 runs. They are not globally allowed rules, claimed fixes or clean accessibility results.

| Classification   | Exact scope and guard                                                                                                                                                                                                                                                                                              | Meaning                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groupper`       | Only six named R3.05 cases and R3.06; exactly `aria-hidden-focus`, exactly two nodes, resolving to that Card's preceding/following `i` sentinels. Exact role=none, tabindex=0, aria-hidden=true, Groupper metadata and failure summary are asserted.                                                               | Inherited Tabster accessibility violation, outside CardFooter itself.                                                                                                                                                                                                                                                                           |
| `focus-story`    | Only R3.03; exactly six corresponding external Groupper sentinels for the three focus-managed story Cards.                                                                                                                                                                                                         | Same untouched-source violation in an actual stable story.                                                                                                                                                                                                                                                                                      |
| `disabled-story` | Only R3.04; exact sentinel pair for the interactive Card plus exact `label` nodes on the two floating-action Checkboxes in Cards 6 and 7. Node identities, input type, disabled state and empty accessible names are asserted; generated IDs are resolved rather than broadly matched.                             | Stable Disabled story has two unnamed consumer-authored Checkboxes, one disabled.                                                                                                                                                                                                                                                               |
| `forced-colors`  | Only four R3.15 scenarios and only with actual forced-colors media active. Zero violations; exactly one color-contrast incomplete on `#more`; exact check IDs, related target, serious impact, white foreground/background, 1:1 ratio, 14px font and expected 4.5:1 are asserted. No other incomplete is accepted. | Serious manual-review requirement. White-on-white computed action text/background is not considered an accessibility pass. Before clicking, Chrome's unhovered Button border is black despite the inherited white currentColor on selected/hovered parents; root versus button hover states and that computed baseline are explicitly asserted. |

Every other audit requires **zero violations and zero incompletes**. Classified findings remain visible in JSON/logs, with node HTML, targets and incomplete check metadata. A different rule, node, count, scenario, media state or contrast signature fails. Unexpected findings in authored fixtures are fixed in the fixture, not reclassified as product baseline.

The owned audit helper additionally validates **every** any/all/none check's ID, data, impact, message and related node, exact resolved role/name/native tabIndex/attribute, full HTML and expected node identity. Full raw axe HTML and actual DOM outerHTML remain in the audit ledger. Axe's color-contrast source includes `shadowColor: undefined`; the strict expected profile preserves that field, and the ledger records all data keys plus undefined-valued keys rather than silently losing them in JSON serialization. Every baseline invocation runs negative mutations through the same profile matcher: wrong role, name, tabIndex, impact, failure summary, node, check ID/data/message/related-node profile and added check must be rejected. A separate envelope helper rejects changed scenario, phase, scope, classification, rule IDs and node counts. Actual media state and specific Card/checkbox ownership remain guarded by the full fixture.

## Historical isolated execution (superseded)

From the shared repository root, on Windows with its existing installed dependencies:

```powershell
$runner = 'packages\react-components\react-card\library\src\components\CardFooter\CardFooter.run.cjs'
node $runner snapshot
node $runner cypress 1 1
node $runner cypress 2 1
node $runner cypress 3 1
node $runner cypress 4 1
node $runner format
node $runner checks
node $runner preserve
```

`cypress <round> <attempt>` runs cumulative coverage and records both success and failures. Use a new attempt number to retain previous evidence. It fails on a nonzero Cypress exit, failed/skipped tests, duplicate test names, missing audits or a count other than 19/48/90/106. Direct equivalent:

```powershell
node node_modules\cypress\bin\cypress run --component --browser chrome --headless --project packages\react-components\react-card\library --config-file src\components\CardFooter\CardFooter.cypress.config.cjs --env coverageRound=4
```

The original runner used scripts-cypress source aliases/support and port 45227. Its prior commands/configuration are preserved in the session original-owned snapshot; the current runner above supersedes them. Images must still successfully decode before interaction.

The historical private ESLint parser override is no longer used. Current checks use the unchanged package ESLint configuration and project service with no parser overrides. Scoped no-emit TypeScript uses `CardFooter.cy.tsconfig.json`; `CardFooter.cy-baseline.tsconfig.json` independently checks existing Card/CardFooter source and stable stories. The actual unchanged package `tsconfig.cy.json` is also checked. Prettier is limited to the explicit authored-source set, including CJS files; no incremental TypeScript output is emitted.

## Historical evidence and current limitations

Current source-bound results are indexed by the session **`INDEX-current.json`** and **`handoff.json`**, including exact unique raw JUnit/audit paths, executable arguments, CWD, exits, source manifests, production file lists/output, original units and preservation checks. All reports below in the component's `reports\` directory are **HISTORICAL**; none is used as current proof. Every failed and successful continuation attempt is also retained under session `runs\`. Empty successful type/lint logs are paired with an explicit command/exit record, not interpreted from emptiness alone.

Current commit-source allowlist (relative to this component; the parent stages individual paths only):

- `.gitignore`
- `CardFooter.cy.tsx`
- `CardFooter.cy.md`
- `CardFooter.cy.tsconfig.json`
- `CardFooter.cy-baseline.tsconfig.json`
- `CardFooter.cy-webpack.tsconfig.json`
- `CardFooter.cypress.config.cjs`
- `CardFooter.eslint.config.cjs`
- `CardFooter.run.cjs`
- `testing\CardFooter.cy.stories.tsx`
- `testing\CardFooter.cy-jsx.stories.ts`
- `testing\CardFooter.cy-aliases.stories.ts`
- `testing\CardFooter.a11y.stories.ts`
- `testing\tsconfig.json`

The first two story-suffixed testing files are relocated prior user source, not disposable generated fixtures. The original 72,442-byte main fixture, original runner/configuration and all original assets are preserved in the session `original-owned\` snapshot. Only explicit known reports, generated asset/cache/build directories and owned `.temp\` are ignored. No report/assets directory is staged wholesale.

Historical verified green addition rounds: 19/19 (Round 1 attempt 2), 48/48 (Round 2 attempt 2), 90/90 (Round 3 attempt 5), and 106/106 (Round 4 attempts 6 and 7, two consecutive historical runs). Retries are disabled; failed attempts and their subsequent corrections are retained. Stable FocusMode/Disabled stories enter their interactive Cards via real Tab from preceding footer actions, avoiding programmatic group-entry timing races. Both final runs have 106 audits: 93 completely clean, nine audits with exactly classified baseline violations (24 nodes: 22 focus sentinels and two unnamed checkboxes), and four with the exact serious forced-colors incomplete. Scoped formatting, authored lint/types and source-baseline lint/types all exit zero. Environment: Cypress 14.4.1, headless Chrome 154, Node 18.20.6 on Windows; existing dependencies are reused.

The preservation check confirms 369/369 original file hashes and the same `master` branch, but deliberately returns nonzero for concurrent HEAD/status drift: unrelated commits advanced HEAD from `6defdd7aafac79cafad2bb7c165671039e4327b7` to `76d2ab986f14a31bb2ccbaa60bd0a5a4e8676a75` (`c286abf1`, `e63c3dfb`, `76d2ab98`, on Carousel/CarouselCard/TagPickerControl). Concurrent new untracked AvatarGroup and CarouselNav files also appeared. No Git commit/branch operation was performed by this task, no Card/CardFooter/shared Cypress/configuration path changed in the commit range, and the original snapshot is retained rather than reset to conceal drift. Original dirty-file contents still match the snapshot. All concurrent work is left untouched; exact HEAD, status, concurrent paths and preservation flags are recorded in the after report.

- `reports/commands.jsonl`: exact executable arguments, exit status and log path.
- `reports/round-N-attempt-M.log`, matching `-spec-1.xml` and `-summary.json`: retained run evidence, expanded case names, raw classifications, clean audit count and violation/incomplete node counts. The hash-named `results-*.xml` files are Cypress JUnit output.
- `reports/format-final.log`, `lint-final.log`, `lint-baseline.log`, `typecheck-final.log`, `typecheck-baseline.log`: scoped validation versus existing source.
- `reports/preservation-before.json` and `preservation-after.json`: 369 original file hashes, outside-scope Git status, branch and HEAD preservation. Includes pre-existing modified/untracked files, Card source/stories and shared Cypress/configuration sentinels.

This is Chrome component functional coverage, not cross-browser or assistive-technology certification, native screen-reader testing, visual snapshot/performance certification or a full monorepo build/Jest run. Forced-colors coverage uses Chrome CDP media emulation, not a physical Windows high-contrast theme. The classified violations and serious incomplete need separate accessibility remediation/manual review; this task makes no production fixes. CardFooter has no built-in responsive wrapping, implicit disabled-child propagation or selection/focus-mode API of its own. Native hidden is tested with an explicit display override rather than assuming it outranks the footer's author-level display:flex.

## Isolated mutation diagnostic amendment

The reconstructed `CardFooter-action-render` mutant removes the optional action
slot. Its 94 failing scenarios included 68 assertion failures and 26 incidental
`TypeError`s from missing action geometry, including shared LTR/RTL alignment,
inline spacing, overflow, Card context layout, wrapping, and provider updates.

Required footer elements are now explicitly asserted nonnull before rectangle
or style reads, using a typed assertion function and the callable Cypress
`expect(element, message).not.to.equal(null)` API. All 120 qualified scenarios,
geometry tolerances, logical margins, state, native props, and strict contrast
assertions remain intact. The finite-transition audit completion wait from
742c8d13 is unchanged. No exception suppression or verdict relaxation is used.
Fresh baseline, mutant, and restored-baseline evidence under a separately sealed
test amendment is required before claiming a mutation kill.

The root-click diagnostic follow-up reviewed one missing-spy-call `TypeError`
and four existing assertion failures. R1.11 now asserts the root click spy was
called once before inspecting its first event, preserving the original button
subject, target comparison, and subsequent keyboard/callback-order assertions.
The geometry guards, finite-transition wait, and all 120 scenarios are unchanged.
