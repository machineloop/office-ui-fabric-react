# ONLY129 ToolbarButton functional Cypress coverage

> **Historical record below:** the original rounds 1–4, command recipes and `reports/final-evidence.json` refer to the pre-integration 97-case fixture. They are preserved, not current approval evidence. The current integration amendment at the end supersedes execution/configuration claims; its handoff contains authoritative fresh raw JUnit, axe, commands, SHA manifests and isolation evidence.

All authored files, configuration, reports and browser artifacts live in this directory. No production, shared configuration, dependency, branch or commit changes are intended. Local Windows Chrome component runner follows CardPreview/CardFooter and TableSelectionCell prior art.

## Source review and scope

Read ToolbarButton component, types, hook, styles, unit tests and Toolbar component/types/context/context values/navigation/styles/tests. Read every stable Toolbar story plus Description and BestPractices. Read inherited Button types, base hook, renderer, styles, unit tests and useARIAButtonProps implementation/unit tests. Also read Button Description/BestPractices and Disabled/Icon/Appearance/Size stable stories; only ToolbarButton-supported portions are exercised.

Important actual contracts: ToolbarButton exposes only primary/subtle/transparent appearance, vertical, disabled/disabledFocusable and Button slots/native props. It does **not** expose Button size, shape or iconPosition. Hook fixes medium/rounded and default subtle. Toolbar size controls container spacing, not this button's size. Toolbar vertical is container layout; ToolbarButton vertical must be explicitly supplied. Navigation uses circular both-axis Tabster, not orientation-limited APG behavior. Links are supported via `as="a"`; href-less anchors get button role; disabled links lose href. Native disabledFocusable omits consumer keyboard handlers but cancels click defaults.

Stories containing ToolbarButton: Default, Small, Medium, Large, VerticalButton, FarGroup, WithTooltip, WithPopover, OverflowItems. Remaining Subtle/Transparent/Vertical/Radio/ControlledRadio/ControlledToggleButton stories use other components only; reviewed for context, not claimed as ToolbarButton executions.

## Rounds and traceability

Round 1: real documented stories and foundational keyboard/defaults. `R1` test names map to:

| Tests                       | Evidence source and exact behavior                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| default native              | ToolbarButton/useToolbarButton units; button/type/name/medium rounded dimensions                      |
| ltr/rtl horizontal/vertical | useToolbarArrowNavigationProps; circular forward/back arrows, both axes, Tab exit and reverse reentry |
| Enter/Space activation      | Button accessibility/unit contracts; exact click and parent counts/target                             |
| small/medium/large stories  | stable stories; exact container padding, unchanged 32px icon-only controls                            |
| Default                     | stable menu story; separator skip, menu open, Escape focus restoration                                |
| VerticalButton              | stable story/styles; explicit column button with horizontal toolbar                                   |
| FarGroup                    | stable story; nine controls, group crossing, gap geometry, circular wrap                              |
| native form                 | Button base default type and intrinsic override; exact submit counts                                  |
| standalone                  | Button focus units; ordinary tab sequence, no standalone mover                                        |
| grouped                     | Toolbar group/divider composition; Home/End and arrows skip presentation structure                    |

Round 1 must be run before adding round 2. Subsequent rounds retain all earlier cases.

Round 1 attempt 3: **16/16 passed, 16 axe audits**, zero failures/skips/incompletes. Attempts 1/2 retain assertion-chain and Tabster-finding diagnostics.

Round 2 adds `R2` cases derived from Button and useARIAButtonProps units:

| Tests                                   | Exact behavior                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| native disabled/disabledFocusable/both  | native disabled vs aria-disabled, real Tab inclusion/exclusion, pointer/Enter/Space cancellation and zero bubbling |
| aria-disabled true/false boolean/string | normalization, real enabled/blocked activation and exact counts                                                    |
| disabled navigation matrix              | both orientations and directions; skip native disabled, include discoverable disabledFocusable, wrap and Tab exit  |
| enabled link/href-less/empty-href       | correct link/button role, Tab focus and exactly one callback per input                                             |
| disabled link matrix                    | href removal, explicit link role, no disabled DOM attr, focusability and cancellation                              |
| keyboard handlers                       | native focusable-disabled omission vs retained anchor handlers; consumer preventDefault takes precedence           |
| submit/reset disabledFocusable          | real form defaults cancelled, edited field preserved, no submit/reset/click                                        |
| negative tabIndex                       | mover and Tab skip, pointer activation remains enabled                                                             |
| forwarded event order                   | exact focus/down/click/up/blur sequence                                                                            |
| actual href navigation                  | real same-document navigation, no external traffic                                                                 |

Round 2 attempt 1: **42/42 passed, 42 axe audits**, zero failures/skips/incompletes.

Round 3 adds `R3` cases:

| Tests                                       | Source and exact contract                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| empty children / numeric zero / absent icon | useButtonBase units: hasContent distinctions, name, actual 32px vs 96px sizing and activation                                       |
| icon layout matrix                          | ToolbarButton/Button styles: DOM order, geometry and icon font size in both directions/orientations                                 |
| appearance matrix                           | supported appearances; exact theme default/hover colors and painted keyboard focus                                                  |
| Button context matrix                       | base hook bypasses size context; ordinary Button positive control; vertical toolbar does not stack child                            |
| icon shorthand / render function            | supported span slot, ref, attributes, classes, style, exact path click target and inherited styles                                  |
| refs                                        | conformance: button/anchor object refs, focus, callback attach/null/reattach                                                        |
| inline override                             | style prop: exact dimensions/layout/radius and input usability                                                                      |
| live updates                                | disabledFocusable, native disabled, appearance, orientation, icon, name, callback freshness, size, href and icon-only recalculation |
| menu input matrix                           | pointer/Enter/Space, discoverable disabled item blocks activation, exact callback, close/focus restoration                          |
| menu ArrowDown characterization             | both-axis toolbar mover consumes ArrowDown; reaches next command, then Enter opens menu                                             |
| pressed appearance matrix                   | real mousedown/up; exact pressed background and activation only on release                                                          |
| root render function                        | conformance/slot contract; native type/ref/styles and custom content with actual activation                                         |
| disabled menu triggers                      | no open; roving inclusion/exclusion                                                                                                 |
| WithTooltip                                 | real hover/focus, exact text/computed description                                                                                   |
| WithPopover                                 | focus trap, keyboard dismissal/Close and restored trigger                                                                           |
| OverflowItems                               | resize, exact visible/hidden menu counts, restore wide layout/navigation                                                            |
| intrinsic ARIA naming                       | computed name and description override                                                                                              |

## Accessibility policy

Every executed case receives a real axe-core DOM audit including mounted content and open menu/popover/tooltip portals. Open menu/tooltip/popover states receive additional staged audits before dismissal. Passes must be nonzero. No disabled rules or blanket allowances. Full per-rule/node/check details are persisted by the config task into the run log and summary JSON. Accessible names, disabled semantics, exact focus and keyboard behavior are separately asserted; axe is not substituted for interactions.

Evidence-driven allowance: round 1 attempt 2 found `aria-hidden-focus` on two Tabster mover sentinels, not buttons. The audit allows **only** that rule with the exact `focusable-not-tabbable` check on empty `I` elements with `data-tabster-dummy="isFirst=(true|false), isOutside=false, (Mover, tabbable=true)"`, role none, aria-hidden true and tabindex 0. Every node must match; any user control or unlisted finding/incomplete result fails. Raw findings remain in reports. No production fix outside the requested test scope.

Round 3 attempt 4 establishes two additional **raw WithPopover story** baseline results: unnamed modal surface (`aria-dialog-name`) and `aria-hidden-focus` incomplete with `focusable-modal-open` checks on Tabster Mover/Modalizer sentinels. These are allowed only in the exact WithPopover test while an actual modal surface is open. The dialog finding must be a single `.fui-PopoverSurface`, have an Insert Image/Insert Table heading, an empty computed name and the exact three missing-name checks. The incomplete nodes must be empty hidden `I` sentinels matching the same attributes and exact modal check. Real Tab trapping/Close/Escape/focus restoration provides the required manual keyboard evidence. No other incomplete is allowed. A harness After button overlapped by the popup was moved away rather than allowed for color contrast.

Attempts retained actual source discoveries: MenuItem disabled is intentionally focusable, StrictMode ref mount is attach/null/attach, icon span is the only supported element type, and false is not a supported icon shorthand. Explicit trigger IDs require explicit MenuList aria-labelledby; the generated-ID composition is separately audited. No invalid IDREF allowance was added. Cypress intercepts component-test link navigation; href updates are checked before navigation, and only same-document fragment navigation is exercised.

## Execution evidence and limitations

Round 3 attempt 5: **85/85 passed, 93 axe audits**. 47 audits had no findings/incompletes; 44 `aria-hidden-focus` violation rule occurrences (96 sentinel nodes), two raw-story unnamed-dialog findings, and two modal-sentinel incomplete occurrences (eight sentinel nodes). All matched the exact allowances above. Scoped lint/typecheck and source/story baselines all passed.

Round 4 closes inherited icon and live-boundary coverage:

| Tests                      | Evidence and exact behavior                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bundled-icon matrix        | inherited Button Appearance story/styles; subtle/transparent x enabled/disabled/disabledFocusable, exact regular/filled visibility before/hover/after, actual activation counts |
| native name/value          | ordinary ToolbarButton never toggles checked context; no checked callback/pressed/checked ARIA                                                                                  |
| two labelled toolbars      | BestPractices labels; separate circular movers and remembered forward/reverse Tab stops                                                                                         |
| dynamic membership         | insert/remove/keyed reorder, exact focus and DOM order, surviving root identity                                                                                                 |
| enabled reset              | real native form field reset and exact pointer/Space event counts                                                                                                               |
| native keyboard prevention | consumer onKeyDown preventDefault cancels Enter/Space but pointer activation remains                                                                                            |

Preservation observation after round 3: concurrent work advanced shared HEAD from `db5c0d01d1152239e9c90bd7c648c169b8ee9a62` to `e47f29f96214174fa139c27d1bca6c1147dde266` on master and changed eight unrelated BreadcrumbDivider/CarouselNavContainer files. The original snapshot was not replaced and unrelated changes were not reverted. The runner deliberately reports preservation mismatch (nonzero), with exact hashes/status/commits and a separate reviewed-source/shared-config invariant; no global clean-tree claim is made. This task has used no commit, checkout, branch, shared-file editing or dependency installation commands.

Round 4 attempt 1 retained six exact SVG display expectation failures (flex children compute to block, not inline) and a tooltip pending-hide race. The fix asserts actual blockified display and waits for the observable hover tooltip to hide before entering by real Tab and arrows; no fixed sleeps, skipped cases or retries were introduced. Round 4 attempts 2 and 3 each passed **97/97 with 105 axe audits**. Final attempt 3: zero failures/skips, 50 clean audits, 53 mover-sentinel violation rule occurrences (118 nodes), two raw-story unnamed-dialog findings and two modal-sentinel incomplete occurrences (eight nodes). All five final formatting/lint/typecheck/baseline gates passed. Final confirmation, exact commands, matching source hash and concurrent preservation mismatch are recorded in `reports/final-evidence.json`.

Validation uses installed Windows Node 18.20.6, Cypress 14.4.1, headless Chrome 154 at 1000x800. No additional packages were installed. Other browser engines, forced-colors, zoom, real screen readers and external page navigation are not claimed. The raw WithPopover story's missing dialog name is a real baseline accessibility defect, not an axe false positive. No iconPosition/size/shape/alternative icon-element props are invented for ToolbarButton.

## Commands

From repository root:

```powershell
$runner = 'packages\react-components\react-toolbar\library\src\components\ToolbarButton\ToolbarButton.run.cjs'
node $runner snapshot
node $runner format
node $runner cypress 1
node $runner cypress 2
node $runner cypress 3
node $runner cypress 4
node $runner checks
node $runner preserve
node $runner evidence
```

The runner records full underlying commands/exit codes in `reports/commands.jsonl`, run output and per-attempt JUnit/JSON summaries. `checks` runs scoped Prettier/ESLint/TypeScript alongside production/story baselines. Preservation snapshots hash existing dirty/untracked files, toolbar/button/aria source, shared Cypress and root configs, and record branch/HEAD/out-of-scope status. `evidence` validates successful latest round counts, matching final spec hash, all static gates and reviewed-source/shared-config preservation. It explicitly retains concurrent global preservation mismatches rather than claiming a clean checkout.

## Current integration amendment: row 129 only

The preserved 97 cases were moved intact into `testing/ToolbarButton.cy.stories.tsx`; a single `ToolbarButton.cy.tsx` imports them and the mergeable JSX bridge. `testing/` is excluded by the actual production SWC rule, while the story suffix and canonical Cypress suffix are excluded by the actual production TypeScript configuration. Neither shared package configuration nor production source was changed. The component's introductory size comment and historical spec are not authoritative over its actual medium/rounded base-hook implementation.

The **current full suite is 203 distinct cases**: 97 preserved + 35 documented/theme cases + 20 unit/lifecycle cases + 6 remaining popover cases + 45 themed availability cases. Case counts are derived from this component's source and raw leaf JUnit, not another component's count. Every round was executed in full after its additions; failed attempts remain available, and a final handoff identifies only the fresh accepted runs.

### Exhaustive new case inventory and source provenance

The preserved-case inventory is the round 1–4 tables above. Each matrix cell below is one separately named executed test; all dimensions and all singleton cases are listed. The handoff additionally provides the full raw 203-name inventory, matching each leaf case to its actual `it` source range and assertion text.

| Round / distinct cases          | Complete identities / source                                                                                                                                                                   | Required observations                                                                                                                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R5 themes: 30                   | `web light`, `web dark`, `teams light`, `teams dark`, `teams high contrast` × `primary`, `subtle`, `transparent` × `ltr`, `rtl`; inherited `useButtonStyles.styles.ts` and actual theme tokens | Exact resting/hover colors, native type/name, three pointer/Enter/Space callbacks, direction-correct next focus, no pressed state                                                                                                    |
| R5 custom style hook: 2         | horizontal and vertical; `ToolbarButton.tsx`, owner styles, `CustomStyleHooksContext`                                                                                                          | Hook receives medium/rounded styled state; root/icon classes and inline width survive; two native activations                                                                                                                        |
| R5 responsive: 3                | 320, 640, 1280 px; Button target-size guidance, group/divider source                                                                                                                           | 32×32 icon target, real Tab/Space, End/wrap across presentation groups, container bounds                                                                                                                                             |
| R6 minimal/full hook: 4         | full/base × button/anchor; `useToolbarButton.ts`, inherited base units and renderer                                                                                                            | Exact design defaults or their absence, vertical, iconOnly/iconPosition, root/icon element types, ref/native role/name and activation                                                                                                |
| R6 callback identity: 2         | button/anchor; `useARIAButtonProps`/`useEventCallback`                                                                                                                                         | Stable click wrapper, stable anchor key wrappers, updated consumer callback, blocked middle disabled phase and fresh restored callback                                                                                               |
| R6 trusted timing: 4            | button/anchor × Enter/Space; native keyboard versus anchor generated click implementation                                                                                                      | Exact down/click/up ordering for Enter; down/up/click for Space; trusted key events, native button clicks versus correctly untrusted generated anchor clicks                                                                         |
| R6 negative keys: 2             | button/anchor; Toolbar both-axis mover and ordinary action source                                                                                                                              | ArrowLeft/Right, Home/End, Escape and `a` never activate or synthesize checked/pressed state                                                                                                                                         |
| R6 disabled precedence: 2       | button/anchor; ARIA hook                                                                                                                                                                       | Native disabled wins over aria-disabled false for callbacks; anchor normalization differs from native button semantics                                                                                                               |
| R6 object-ref lifecycle: 1      | root and icon slot conformance                                                                                                                                                                 | Both refs null on unmount; real different nodes on remount; retained input usability                                                                                                                                                 |
| R6 live owner styles/context: 1 | provider direction/theme, mutable root/icon className props                                                                                                                                    | Same root identity; old classes removed/new classes applied; exact changed/restored colors and RTL next focus                                                                                                                        |
| R6 no phantom toggle: 2         | controlled/default Toolbar checked values; contrasting ToggleButton hook                                                                                                                       | Four action callbacks across a real checked-context update; zero checked callbacks and no checked/pressed ARIA                                                                                                                       |
| R6 external form: 1             | intrinsic `form`, `name`, `value`, `type` and native SubmitEvent                                                                                                                               | Three real submissions with exact submitter name/value/form ID                                                                                                                                                                       |
| R6 named empty content: 1       | inherited hasContent/iconOnly units                                                                                                                                                            | 96px minimum width, no icon slot, computed name and two activations                                                                                                                                                                  |
| R7 remaining stable triggers: 6 | actual WithPopover `Insert Formula`, `Quick Actions` × pointer/Enter/Space                                                                                                                     | Correct raw heading, focused Close, reverse Tab trap, Escape dismissal, exact restored trigger and next/wrapped command                                                                                                              |
| R8 availability: 45             | five themes above × three appearances above × disabled/disabledFocusable/both; inherited disabled-style source and ARIA hook                                                                   | Exact disabled background/root/icon foreground/cursor, native disabled versus discoverable focus, zero disabled activations, real update preserves root, three restored activations, final exact hover CSS boundary, no toggle state |

The other stable Toolbar stories (Subtle, Transparent, Vertical, Radio, ControlledRadio and ControlledToggleButton) contain no ToolbarButton and are contextual review, not falsely counted as owner executions. WithPopover has four actual owner triggers: Image/Table in R3 and Formula/Quick Actions in R7. WithTooltip's Bold/Italic/Underline are contextual toggle controls, not ToolbarButton state APIs. Overflow's “More items” trigger is an ordinary Button; the ten actual owner commands remain covered.

### Current accessibility policy and native-node evidence

Every final case and each explicitly open menu/tooltip/popover phase runs unmuted real axe against the mounted `#fixture` and all actual menu/popover/tooltip portal surfaces. The suite does **not** claim whole-page, universal browser/OS, assistive-technology or performance certification. Whole-document exploratory failures are retained as historical host evidence rather than presented as passing owner checks.

Axe `elementRef:true` supplies each actual live finding node. Classification checks its native element identity, document membership, parent mover/modal/menu context, reported HTML attributes and every check-group field (ID, data, impact, message and related nodes). CSS ordinal selectors can change as Tabster relocates sentinels; live axe node references, not an HTML-string reconstruction pretending to be a live node, establish identity.

Only these narrowly scoped known results are classified:

- `aria-hidden-focus` **violation**: empty native hidden `I` mover sentinel, native tabindex 0/role none, exact Tabster dummy marker, actual toolbar or actual menu mover parent, and sole `all` check `focusable-not-tabbable` with exact data/message/related native node.
- `aria-dialog-name` **real baseline defect**: exact unnamed raw WithPopover modal for Image/Table (R3) or Formula/Quick Actions (R7), only its corresponding open phase and matching actual heading, sole surface target/native node, and the three exact missing-name checks. This is not an axe false positive or an owner-source repair.
- `aria-hidden-focus` **manual incomplete**: only those same raw open modals, actual mover/modalizer sentinels, and sole exact `focusable-modal-open` check. Native Tab/Shift-Tab trapping, Escape/Close and restored trigger focus are separately observed.
- `heading-order` **manual incomplete**, when axe returns it for those same raw open modal phases: actual sole `h3` native node and exact heading, no preceding h1/h2 in the scoped fixture, exact moderate `any` check `heading-order` / `Unable to determine previous heading`, one level-3 ancestry record with the real ancestor tag chain, no other data/checks. This partial-context result is explicitly unresolved for the surrounding application's heading hierarchy; it is not a heading-order violation waiver.

Unknown rules, phases/scenarios, empty passes, bad nodes/HTML, node or rule impact changes, check identity/group/data/message/impact changes, altered related nodes and replacement live elements are rejected by negative mutations of **each finding rule** during each current audit. Rejection results are persisted separately from the complete raw axe result. The runner requires one final audit per distinct case and an executed classifier/mutation record for every audit; an uncalled assertion helper cannot produce accepted evidence.

### Regular integration, ownership and production isolation

The canonical default run observes `Cypress.env() === {}` and retries 0. It requires no private Cypress tasks, run ID, report path or round variables. Built-in `cy.writeFile` creates a unique ignored owned audit directory. A provided optional audit directory must be a nonempty string; invalid types/empty values throw. Both direct CJS and unchanged package-standard `cypress.config.ts` execution use a single canonical entry. Each runner invocation uses unique absolute JUnit/assets paths and `trashAssetsBeforeRuns=false`.

The package-wide Cypress TypeScript program has pre-existing React-19 legacy JSX namespace errors outside this owner. No shared tsconfig or nonmergeable canonical JSX alias was modified to disguise that failure. Necessary deviation: a registered `toolbarbutton-functional-tests` Nx project lives in `testing/ci/project.json`, owns only CI metadata (not production or fixture source), and exposes actual `e2e` and `type-check` targets. Its regular `testing/tsconfig.json` supplies private aliases; canonical global declarations are mergeable. This adds **one metadata file** to the 13-file authored source allowlist. There is no source-ownership cycle. Regular package ESLint is run on the owned directory without a private parser/project-service override.

Cold CI proof uses a physical isolated source mirror with its helper `lib`, `lib-commonjs` and declarations absent, workspace dependencies remapped to the mirror, real `nx sync`, and normal registered Nx execution with dependencies/synchronization enabled. The actual scripts-cypress build and its real prerequisite run; no dependency-list override, original-helper rename, symlink-to-original-helper spoof or shared build is used. The mirror needs the already installed package-manager binaries on PATH; the initial missing-`tsc` failure is retained.

Production proof parses the unchanged actual `tsconfig.lib.json`, records the complete compiler program and confirms exactly five owner production inputs, zero owner fixture inputs and zero diagnostics. Separately, the unchanged real SWC/Griffel executor builds isolated ESM/CommonJS published outputs and the genuine runtime dependency closure. API extraction is disabled for this **runtime-emission proof only**, explicitly recorded; it is not claimed as a complete packaging/API-extractor gate. All output paths and literal contents are inspected for fixture/Cypress/describe leakage. Native CJS and an actual production webpack consumer of the emitted ESM are exercised; native Node ESM's installed Tabster CommonJS named-export limitation is retained rather than patched or stubbed.

### Current commands and authoritative evidence

From the library directory, using the installed Node 22.20.0 runtime for standard ESM configuration:

```powershell
node src\components\ToolbarButton\ToolbarButton.run.cjs cypress
node src\components\ToolbarButton\ToolbarButton.run.cjs standard
node src\components\ToolbarButton\ToolbarButton.run.cjs checks
node src\components\ToolbarButton\ToolbarButton.run.cjs units
```

From repository root, normal registered targets:

```powershell
node node_modules\nx\bin\nx.js run toolbarbutton-functional-tests:e2e
node node_modules\nx\bin\nx.js run toolbarbutton-functional-tests:type-check
```

Node 18.20.6, Node 22.20.0, Chrome 154 and Cypress 14.4.1 are already installed; no dependency/manifests were changed or packages installed. The session handoff under `coverage-121-140\ToolbarButton\handoff.json` is the authoritative current evidence index, with absolute raw JUnit/axe/command paths, CWD/exits, exact authored and reviewed source SHA sets, current documentation SHA, 20 targeted unit results, real task graph/cold-helper proof, production program/emission and outside-source preservation. All older root reports—including files called “final”, “complete”, “baseline” or “pre-fix”—and old lint/format logs are explicitly historical; they remain intact beside a historical index.

This task does not stage, commit, push, amend, delegate or start row 130. Fresh independent repeated parent review and the descriptive allowlist-only commit are parent responsibilities.

### Final unit-count correction and documentation trace

The unchanged targeted unit baseline was **19**, not 20. A real source-derived base-hook test was added to the existing owned `useToolbarButton.test.tsx`: it checks the native root/ref, vertical/disabled/icon structure and the absence of appearance/size/shape defaults. The current normal Jest result is **20/20**, with no failed, pending or skipped tests. This directly related existing unit file is an additional explicit commit-allowlist entry: 13 functional source files + one CI metadata file + one coupled unit file, **15 total**, not a silently inflated 13-file list.

The browser fixture/configuration/runner code is unchanged from the six fresh full 203-case confirmations (Node 18 direct twice; Node 22 standard twice; additional Node 22 direct twice). The new Jest-only source is excluded from both the canonical browser dependency graph and the actual production program. This final Markdown-only trace is hashed separately from those historical browser-run manifests; their original author hashes are not rewritten.

### CI affected-selection metadata follow-up (2026-10-04)

Independent review found that registering a metadata-only project and disabling its target cache did **not** make source-only changes select that project. Its old parent-relative inputs were not recognized by the installed Nx affected-file locator. The CI project now declares `implicitDependencies: ['react-toolbar']` and uses explicit workspace-root ToolbarButton source globs for both targets. Its own root remains `testing/ci`; production and fixture ownership stay with `react-toolbar`. The dependency points from the CI project to the library, not back, so it introduces no parent cycle.

Fresh installed Nx 21.6.10 selection evidence is indexed in `affected-followup-20261004/selection.json` beside the handoff, with a separate fresh-data repeat in `affected-followup-repeat-20261004/selection.json`. Separate `--files` probes contain **only** the canonical root fixture plus its typed testing fixture, or **only** `ToolbarButton.tsx` plus `useToolbarButton.ts`. Neither probe includes CI metadata changes. Both select `react-toolbar` and `toolbarbutton-functional-tests`; their actual affected task graphs select the CI `e2e` and `type-check` targets. The inherited root `e2e` prerequisite and the explicit owned `type-check` prerequisite both retain `scripts-cypress:build`. The synchronized cold task graph additionally registers `eslint-plugin-react-components:build` as a root task, not a dependency edge from `scripts-cypress:build`; both builds execute successfully. No library producer build is added as a CI prerequisite. `cache: false` controls execution caching, not affected selection.

The ordinary PR workflow uses `nx affected -t e2e --nxBail --parallel 1`, and its general affected job includes `type-check`; there is no separate v9 tag filter in either command. The CI project retains its `vNext`, `platform:web` and `test` tags. No workflow was changed, and local selection/task execution is not claimed as a hosted pipeline run.

The fresh cold proof uses the named physical `affected-cold-repo-20261004` artifact mirror, current owned source/metadata and installed dependencies remapped into that mirror. Its helper outputs begin absent; normal `nx sync` and actual `nx affected -t e2e,type-check --files=…` run with synchronization and prerequisite tasks enabled. Other affected projects are excluded only to bound this component review; prerequisite builds are **not** excluded or replaced. The helper in the shared checkout is unchanged. The accepted cold result is **203 distinct raw JUnit cases and 217 executed strict axe audits**, with no failures, errors, skips, pending cases or retries and no private Cypress environment. Exact commands, exclusions, source manifests, raw XML and audit paths are in `affected-followup-20261004/cold-result.json` and its command/task-graph records.

This follow-up changes only CI metadata and this Markdown trace. All five existing regular formatting, fixture/baseline/compiler and typed package ESLint gates were freshly rerun successfully, without a parser/project-service override. The earlier six browser confirmations, 20-unit proof and actual published-runtime emission remain historical source-identical runtime evidence, not freshly rerun claims. The production artifact records **208 output files**, zero fixture literal leaks and six runtime executions; this count was verified from the handoff and emission manifest, not assumed from another component. Their manifests are retained verbatim; the updated handoff binds the fresh affected cold execution and final authored source/input hashes separately. This final documentation clarification is hashed separately from the cold runner's unchanged before/after source manifests.

## Isolated mutation audit testability amendment

The default-appearance mutant exposed a strict severity assertion in the final
audit hook. That legitimate failure caused Mocha to skip 151 later scenarios.
The component-local registration wrapper now appends the unchanged final audit
chain to each test body, so a classifier mismatch fails its testcase instead.

Original registration has one root audit hook and no component-local cleanup
or media hooks. Body interactions, style/media work, and staged audits retain
their order; the final audit remains after those commands. Successful cases
cannot omit the final chain, and earlier body failures remain failures rather
than accessibility passes.

All 203 titles, severity/contrast/incomplete expectations, known/unknown finding
checks, raw result writes, classifier evidence, and adversarial probes are
preserved. Two explicit object assertions guard tightly coupled heading-order
payload reads before `Object.keys`; no finding or expected severity is changed.
Fresh parent-run baseline, mutant, and restored evidence under a separately
sealed amendment is required. No new Cypress result is claimed here.
