# ONLY125 DrawerFooter Cypress traceability

## Current row-125 integration (October 3, 2026)

The extensive R1-R4 fixtures below are preserved prior user work, not new
authorship. The narrative and reports in the historical section are **historical
only**, including files named `final`, `complete`, or `preservation-after`.
Current evidence is exclusively in:

`C:\Users\jabrassi\.scout\copilot\session-state\5ed21290-e28e-4743-8b3d-3864ac6a202e\files\coverage-121-140\DrawerFooter`

The handoff JSON in that directory identifies the exact current files, SHA-256,
commands, CWD, timestamps and explicit exit codes. Silent type/lint logs are
successful only when their recorded exit is zero. Never select historical
reports by filename or modification time as current proof.

The authoritative four-run set is the direct and standard `round-7-final-2`
and `round-7-final-3` repetitions. The earlier `round-7-final-1` folders are
retained successful checkpoints against superseded source snapshots, not
additional current-source confirmations. Likewise, `checks-final-1/2` are
superseded checks; `checks-final-3` and the listed final-2/final-3 runs bind
the exact current runtime-source hashes. This selection is recorded explicitly
in the handoff's `supersededProof`, rather than implying hidden failed runs.

### Actual contract and source inventory

Read the actual stable library `README.md`, `docs/Spec.md`,
`etc/react-drawer.api.md`, stories `README.md`, both Drawer description/best-practice
documents, story index and all 20 exported stories listed below. The spec's old
boolean `modalType` table is superseded by actual types and examples (`modal`,
`non-modal`, `alert`). DrawerFooter itself is passive: `Slot<'footer'>`, native
props/ref, default `role="none"`, no open state, action dispatch or dismissal API.
Only `as="footer"` is declared; arbitrary alternate root types are not supported.
The library README's readiness warning is historical text, not a new support
guarantee. No browser, OS, assistive-technology or performance certification is
inferred from these component tests.

All owned production/types/use/render/styles/index/unit and original two Cypress
tests were read, plus actual drawer context, scroll-state/body hook, shared
separator/base/defaults, InlineDrawer/OverlayDrawer hooks/render/styles,
Drawer facade/types, conformance wrapper and relevant shared conformance and
Griffel override tests. The actual shared Cypress mount uses StrictMode by
default: initial callback-ref attach/null/attach and two initial custom-hook
invocations are asserted explicitly in R7.

### Additional rounds after preserving R1-R4

| Fresh round     | Added | Cumulative | Contracts                                                                                                                                                                           |
| --------------- | ----: | ---------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R5 docs         |     3 |        103 | Inline/overlay consumer Save closure does not synthesize parent onOpenChange; non-modal real Tab/Enter actions and restoration                                                      |
| R6 native/A11y  |     5 |        108 | Frozen native props/styles, exact capture-child-bubble trusted payload/order; native link navigation; latest callback/root identity; strict classifier positive/negative controls   |
| R7 unit-derived |     3 |        111 | StrictMode ref sequence, ref-owner replacement/detachment order; root render-function null/restoration with native props/class/ref; default custom-hook ordering and style override |

R5 extends the actual focus-restoration and overlay/non-modal examples.
R6 uses supported native footer/child props, not an invented footer API.
R7 derives from hook/render/forwardRef and conformance behavior. Full cumulative
Cypress runs follow each added round. Failed development attempts remain in the
current artifact directory and are not labeled passing.

### CI integration and accessibility ledger

The canonical `DrawerFooter.cy.tsx` imports the complete fixture exactly once.
The local CJS config selects **only that canonical entry**. Current validation
also runs the actual, unchanged package `cypress.config.ts` with existing Node 22
and the same canonical `--spec`, with retries explicitly zero.
No private `cy.task` registration is required: builtin `cy.writeFile` persists a
complete per-run audit ledger. Assertions remain full-rule axe assertions.

The canonical JSX interface bridge is mergeable and imported type-only.
Nonmergeable `ElementType` and `LibraryManagedAttributes` aliases are isolated
in a separate Cypress-only `.stories.ts` file. The actual package typecheck
initially lacked these aliases; its canonical type-only alias import is necessary
in this package, unlike packages whose existing canonical entry supplies them.
No shared config, dependency, install, stub types or skipLibCheck workaround was
added. `tsconfig.lib.json` already excludes all `.stories.ts`, `.stories.tsx`
and `.cy.tsx`; the production-source exclusion check verifies the actual program.

Presentation exceptions require exact scenario/phase/scope/rule/node plus the
live footer's tag, role, name, tab index and text. R6.04 independently checks a
real axe finding and rejects different scenario, phase, scope, rule, node,
extra/absent findings and changed DOM profile. It records an intentional third
presentation finding for classifier testing, not an accessibility pass.
Modal incomplete allowance requires one of exactly five scenario/phase pairs,
dialog scope, exact two direct-child Tabster sentinels and exact check/related
node metadata. R6.05 rejects different scenario, phase and scope. All other
violations and incompletes fail. The five known sentinel sets remain **manual
review incompletes**, never an AT pass. The existing unnamed-button control is
retained and repaired by real consumer state.

R4.08 now verifies backdrop dismissal with normal surface motion and waits for
actual enter-animation completion before pointer interaction. Its consumer
backdrop `onMouseDown` prevents native focus from leaving the source before
unmount. Actual Tabster Restorer source shows that a pointer click into empty
space while the source remains mounted intentionally suppresses restoration.
The old fixture's unconditional restoration assertion was therefore not a
supported parent guarantee; all assertions are retained with this explicit
native consumer configuration. Existing disabled-motion and non-modal footer
lifecycle assertions remain. No out-of-scope parent fix or forced focus was
applied.

### Current reproduction

Set `FOOTER_ARTIFACT_ROOT` to a new, unused evidence directory, and set
`FOOTER_NODE22` to the existing Node 22 executable. From repository root:

```powershell
$scope = 'packages\react-components\react-drawer\library\src\components\DrawerFooter'
node "$scope\DrawerFooter.run.cjs" cypress 7 independent-1
node "$scope\DrawerFooter.run.cjs" standard 7 independent-1
node "$scope\DrawerFooter.run.cjs" checks
```

The runner executes Cypress from the package library CWD, uses port 46125 and
`TS_NODE_COMPILER=<repo>\node_modules\typescript\lib\typescript.js`, checks exact
111 unique cases, zero failures/errors/skips, exactly 82 audit entries, and
guards source SHA before/after each command. Each run has a unique directory;
existing logs are never overwritten. Checks include actual package
`tsconfig.cy.json --noEmit --incremental false --composite false`, scoped/baseline
TSC, existing ESLint and Prettier for all authored sources/configs/Markdown.

Only the owned component directory has repository writes; production and unit
files are unchanged. Local `.gitignore` covers known generated directories and
preserves historical reports. Parent must independently and repeatedly review
the source allowlist before staging/committing. No staging, commit, push, amend,
delegation or Portal126 work is done here.

## Historical prior-work traceability (not current verification)

## Scope and preservation

This is a test-only addition for the stable DrawerFooter on the shared Windows
`fluentui` master checkout. Every authored file, local configuration, log, JUnit
report, screenshot and verification artifact is under this DrawerFooter directory.
The existing `DrawerFooter.cy.tsx` (two tests), unit suite, component, hook, render,
types, styles and exports are unchanged. No branches were switched, commits
created, dependencies installed or shared configurations edited. No agents or
independent final review were used. Work stops at ONLY125.

`reports/preservation-before.json` records 250 SHA-256 sentinels: original footer
files, drawer library/stories, pre-existing dirty/untracked files and shared
configuration. The initial HEAD was `5d42ca4f026f1f1f39a50abd0955c9548cecb575`.
The shared checkout moved externally to
`cf854672c7b8cc77c29859b362dc0235aafca54f` during execution. At the first final
preservation check, 247/250 files matched; the three differences were unrelated
InteractionTagSecondary files. They were neither edited nor reverted here.
The later preservation observation recorded HEAD
`8afab2c807d47f0d4a5558a8b168f0c2be083879`, with the same 247/250 file comparison.
The intervening commits were `3fadd711` (InteractionTagSecondary), `cf854672`
(CardHeader) and `8afab2c8` (ProgressBar), all outside the authorized footer scope.
`preservation-after.json` retains exact paths and comparisons. Historical
preservation intentionally exits nonzero on such differences; it does not
silently pass or overwrite the starting snapshot. All eight original footer
files and shared-config sentinels matched.

## Sources read before implementation

All 21 stable Drawer story files and both Drawer description/best-practice
documents were read, including the story index. Sources:

| Stable source                                                                                                               | Footer-related behavior represented                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DrawerWithScroll.stories.tsx`                                                                                              | Body-only, header/body, body/footer and header/body/footer composition; separate body scrolling; keyboard-focusable noninteractive body; primary/secondary actions |
| `DrawerMultipleLevels.stories.tsx`                                                                                          | Previous/Next, disabled endpoints, level content updates, consumer space-between footer alignment                                                                  |
| `DrawerDefault.stories.tsx`, `DrawerResponsive.stories.tsx`                                                                 | Controlled Drawer context, inline/overlay switching, inclusive 720px breakpoint, viewport changes                                                                  |
| `InlineDrawer.stories.tsx`, `OverlayDrawer.stories.tsx`, `OverlayDrawerNoModal.stories.tsx`, `DrawerAlwaysOpen.stories.tsx` | Focus ownership, background availability, modal versus non-modal interaction, plain inline semantics                                                               |
| `DrawerKeepRenderedInTheDOM.stories.tsx`                                                                                    | Kept-mounted identity/state versus default unmounting                                                                                                              |
| `DrawerMotionDisabled.stories.tsx`, `DrawerMotionCustom.stories.tsx`                                                        | Null motion slots and custom presence-motion render functions                                                                                                      |
| `DrawerPosition.stories.tsx`, `DrawerSize.stories.tsx`, `DrawerCustomSize.stories.tsx`, `DrawerResizable.stories.tsx`       | Logical positions, bottom context, standard/custom sizes, actual resize observation                                                                                |
| `OverlayInsideContainer.stories.tsx`                                                                                        | Element mountNode and container-relative overlay layout                                                                                                            |
| `DrawerPreventClose.stories.tsx`                                                                                            | Alert context retains explicit footer dismissal rather than implicit Escape/backdrop closure                                                                       |
| `DrawerSeparator.stories.tsx`, `DrawerWithTitle.stories.tsx`, `DrawerWithNavigation.stories.tsx`                            | Drawer/header composition; distinguish the drawer-edge separator from the footer's scroll indicator                                                                |
| `DrawerDescription.md`, `DrawerBestPractices.md`, `index.stories.tsx`                                                       | Stable API inventory, Drawer type-selection rationale, semantics, explicit focus-restoration hooks                                                                 |

All DrawerFooter source/types/styles/render/hook/exports/Cypress/unit files were
read. Inherited Drawer, InlineDrawer, OverlayDrawer, overlay surface, DrawerBody,
context, base sizing, separator styles, motion and default-prop source and unit
tests were read. DrawerBody's exact scroll state calculation, layout effects,
merged onScroll and ResizeObserver informed real-layout assertions. The
conformance wrapper and shared conformance tests informed ref/class/intrinsic
prop/displayName tests. Header styles and DialogSurface's inherited focus,
semantics and dismissal handling were inspected. Presence-motion slot merging,
presence factory and stable reduced-motion Cypress prior art were inspected
when validating animation lifecycle. Local TableSelectionCell and
DataGridHeaderCell runners supplied the configuration patterns.

## Round coverage

The local runner includes the original suite on every run. No test uses retries,
skips, blanket axe exclusions, forced clicks, synthetic scroll-state injection or
arbitrary sleeps. `realClick`/`realPress` supply CDP pointer/keyboard interactions.
Explicit focus is used to establish keyboard-test starting points; actual
Tab/Shift+Tab/Enter/Space/PageDown/Ctrl+End behavior is then asserted.
`scrollTo` drives the actual scrollable body; geometry and computed pseudo-element
styles assert the resulting rendered behavior.

| Round | Added cases | Cumulative including original | Contracts                                                                                         |
| ----- | ----------: | ----------------------------: | ------------------------------------------------------------------------------------------------- |
| R1    |          16 |                            18 | Public root API, unit snapshot/conformance, ref, events, styling, RTL, theme and updates          |
| R2    |          12 |                            30 | Inline and overlay actual body/footer layout and complete scroll transitions                      |
| R3    |          50 |                            80 | Actions, focus, lifecycle, actual motion, responsive sizing and slots                             |
| R4    |          20 |                           100 | Composition, context isolation, provider updates, native forms/portals and accessibility controls |

### R1 public API and unit-derived tests

| Case ID     | Exact contract                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| R1.01       | Native footer, default `role=none`, exact snapshot text, displayName and static classNames; no generated separator outside drawer context |
| R1.02       | className, title, data attribute, accessible group role/name forwarded                                                                    |
| R1.03       | Object ref equals actual root DOM node; imperative focus works; exact known default-role conflict classified                              |
| R1.04       | Callback ref receives actual footer then null on consumer unmount                                                                         |
| R1.05       | Null/empty children stay empty; no invented actions                                                                                       |
| R1.06       | Mixed text/button/link children keep exact DOM order                                                                                      |
| R1.07-R1.09 | Native click bubbling/currentTarget, stopped child propagation, focus/blur and real keyboard event forwarding                             |
| R1.10       | Exact flex, border-box, relative position, z-index, alignments, 8px gap, 16/24/24px padding and actual action coordinates                 |
| R1.11-R1.12 | Consumer Griffel and inline styles override defaults without losing static class                                                          |
| R1.13 (2)   | LTR/RTL logical-start action coordinates with unchanged DOM order                                                                         |
| R1.14       | Dark-theme action contrast audit                                                                                                          |
| R1.15       | Same-root children/class/ARIA/style updates; exact known presentation-role conflict                                                       |

### R2 layout and scroll tests

Each case runs in inline and overlay contexts; R2.03 also runs with and without
a header.

| Case ID | Exact contract                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| R2.01   | Top/middle/bottom/top positions and exact footer separator opacity; actual scrollTop/scrollHeight/clientHeight bounds                      |
| R2.02   | Footer top/bottom remain unchanged while body scrolls; footer fills parent and stays on drawer bottom; action still receives pointer focus |
| R2.03   | Short body has scrollHeight=clientHeight and no generated footer separator; both header compositions                                       |
| R2.04   | Real keyboard PageDown and Ctrl+End scroll; Tab reaches Save then Cancel; focusable-body accessibility                                     |
| R2.05   | Exact pseudo-element content, absolute position, top/left/right=0, 1px height, theme stroke color, opacity transition and 200ms duration   |

### R3 actions, focus and lifecycle tests

| Case ID         | Variants / exact contract                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| R3.01 (4)       | Inline/overlay x LTR/RTL Tab skips native disabled action; Shift+Tab reverses DOM order                                                      |
| R3.02 (4)       | Inline/overlay x Enter/Space produces exactly 1 then 11 action count; consumer owns closure                                                  |
| R3.03-R3.04 (4) | Real pointer actions ignore disabled children; footer has no implicit toolbar/roving-focus/arrow-key behavior                                |
| R3.05-R3.06 (4) | Body children grow/shrink and actual 400/1000px parent resize remove/restore separator through layout effects/ResizeObserver                 |
| R3.07-R3.08 (4) | Kept footer identity and draft survive close/reopen; default unmount replaces root; explicit restoration hooks for unmounting                |
| R3.09 (2)       | Actual 1000ms custom surface animations, exact opacity keyframes, chained motion start/finish callbacks and exit unmount                     |
| R3.10           | Inline opening leaves trigger focus; native Tab progresses body input, Save, Cancel, outside                                                 |
| R3.11           | Modal footer forward/reverse Tab wraps through body input rather than leaking to background                                                  |
| R3.12           | Non-modal overlay has no backdrop, aria-modal=false, and permits an actual background click                                                  |
| R3.13-R3.15     | Exact Escape dismissal reason/restoration; inline Escape does not dismiss; alert rejects implicit dismissal but explicit Cancel works        |
| R3.16           | Kept motion-disabled overlay/backdrop are hidden/display:none when closed, visible on reopening, without surface animations                  |
| R3.17 (6)       | LTR/RTL x start/end/bottom: actual default surface keyframes, durationGentle, logical transform sign, footer ancestry and successful closure |
| R3.18 (8)       | Inline/overlay x small/medium/large/full: exact 320/592/940/1200px drawer widths, footer width=parent clientWidth, no horizontal overflow    |
| R3.19 (2)       | Custom 600px drawer capped to 280px viewport; both actions remain inside 24px padding                                                        |
| R3.20           | Actual matchMedia switch at 720/721px recreates functional overlay/inline footer                                                             |
| R3.21-R3.23     | Correctly named focusable group, typed root-slot children render function, explicit `as=footer`, hidden native-attribute update              |
| R3.24           | Real Enter/Space Previous/Next level changes and exact native disabled-state updates                                                         |

### R4 composition and accessibility controls

| Case ID   | Variants / exact contract                                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| R4.01 (2) | Same footer root survives live provider LTR/light -> RTL/dark update; exact logical coordinates and dark separator color                |
| R4.02     | Sibling drawers independently track scroll; standalone footer does not inherit sibling state                                            |
| R4.03     | Header/footer separator opacities are complementary at actual top/middle/bottom                                                         |
| R4.04 (2) | Consumer flex wrapping fits long actions in 280px footer; exact second-row 8px gap and no horizontal overflow                           |
| R4.05 (2) | Footer actions associated with a body form submit once via Enter and reset actual edited input through pointer interaction              |
| R4.06     | Root preventDefault cancels native form submission but not child click dispatch                                                         |
| R4.07 (2) | Element mountNode uses actual container bounds/absolute position; object mountNode produces exactly one footer inside named portal      |
| R4.08     | Backdrop click from footer focus emits exact backdropClick,false and restores trigger                                                   |
| R4.09     | Provider custom style hook overrides actual footer root using guarded unknown state                                                     |
| R4.10     | Root object ref remains equal to same actual footer through inherited scroll-state updates                                              |
| R4.11     | Negative axe control reports exactly button-name on #bad; real consumer update supplies Add label and clears all violations/incompletes |
| R4.12     | Footer-only overlay has no fabricated body-scroll separator                                                                             |
| R4.13     | Default footer does not invent wrapping; actual long-action overflow at 200px is recorded as a consumer-layout limitation               |
| R4.14     | Real reduced-motion branch completes open/close lifecycle without a running surface animation                                           |
| R4.15     | Separator scroll rerenders preserve focus on the exact footer action                                                                    |
| R4.16     | Dynamic native disabled state changes actual Tab targets without footer-specific focus logic                                            |

## Axe policy and exact classifications

Every audit runs the full installed axe rule set; color contrast is enabled.
Audits wait for visible, non-aria-hidden content and completed running ancestor
animations. Each log entry includes scenario, phase, exact scope, pass rules,
violations, incomplete nodes and their check details. R4.11 proves the detector
finds and clears an actual unnamed action, not just that the axe API executes.

1. **Default presentation-role conflicts:** Only R1.03 / `focused root` and
   R1.15 / `updated actions`, scope `#footer`, may report exactly
   `presentation-role-conflict` on exactly `#footer`. The classifier requires
   FOOTER, role=none, the exact ARIA label, exact tabindex (0 or absent) and exact
   text (Save or Publish). Other rules/nodes/scenarios fail. These are supported
   native props conflicting with the intentionally presentational default.
   R3.21 demonstrates the consumer's valid `role=group` alternative.
2. **Modal sentinel incompletes:** Only explicitly requested modal-root audit
   calls may classify exactly `aria-hidden-focus`, exactly two nodes. Scope must
   be `#drawer`, class fui-OverlayDrawer, aria-modal=true. Each reported selector
   must resolve to the corresponding direct-child Tabster first/last sentinel
   `i[data-tabster-dummy]`, with exact role=none, aria-hidden=true, tabindex=0 and
   exact first/last Modalizer metadata. Only the `focusable-modal-open` all-check
   is permitted; any/none checks must be empty. Footer descendants or extra nodes
   cannot use this classification. R3.11 separately exercises the actual focus
   trap in both directions. This is an incomplete manual-review finding, not a
   declared accessibility pass.
3. **Negative control:** R4.11 independently requires exactly button-name on
   #bad, with no incompletes, before a real state update fixes the accessible name.
4. **Everything else:** Zero violations and zero incompletes are required.

The reused Cypress `#__cy_root` can retain Tabster's aria-hidden attribute after
the previous modal is torn down. The beforeEach cleanup first requires that host
to be completely empty, then resets only that host attribute. It never removes
ARIA from mounted fixture content, dialogs, sentinels or footers. The audit
explicitly rejects any fixture with an aria-hidden ancestor.

## Motion and interaction determinism

Normal-motion tests use the established presence-motion Cypress pattern to make
only the reduced-motion query deterministically nonmatching; all other queries,
including the actual responsive media query, are native. R4.14 deliberately
selects the matching reduced-motion branch. Custom motion render functions chain
the supplied callbacks rather than overwriting InlineDrawer's internal
animationDirection lifecycle. Pointer action tests wait for actual motion
completion where coordinates would otherwise move. Assertions use the browser's
canonical keyframe representation (`translate3d(0px, 0px, 0px)`).

## Reproduction and evidence

Run from the repository root in Windows PowerShell:

```powershell
$scope = 'packages\react-components\react-drawer\library\src\components\DrawerFooter'
node "$scope\DrawerFooter.run.cjs" cypress 1 final
node "$scope\DrawerFooter.run.cjs" cypress 2 final
node "$scope\DrawerFooter.run.cjs" cypress 3 final
node "$scope\DrawerFooter.run.cjs" cypress 4 final
node "$scope\DrawerFooter.run.cjs" checks
node "$scope\DrawerFooter.run.cjs" preserve
```

The exact underlying Cypress command for each round is:

```powershell
node node_modules\cypress\bin\cypress run --component --browser chrome --headless --project packages\react-components\react-drawer\library --config-file src\components\DrawerFooter\DrawerFooter.cypress.config.cjs --env coverageRound=4
```

Replace `coverageRound=4` with 1, 2 or 3 for the cumulative earlier rounds.
The runner asserts two newly written JUnit reports, exact case counts
18/30/80/100, uniqueness, zero failures and zero skips. It saves copies of each
spec's XML and a per-run summary including all case names and axe evidence.
`commands.jsonl` contains exact commands, log names and exit codes, including
failed development attempts rather than hiding them.

Scoped check commands:

```powershell
node node_modules\typescript\bin\tsc -p "$scope\DrawerFooter.cy.tsconfig.json" --pretty false
node node_modules\typescript\bin\tsc -p "$scope\DrawerFooter.cy-baseline.tsconfig.json" --pretty false
node node_modules\eslint\bin\eslint.js --config "$scope\DrawerFooter.eslint.config.cjs" "$scope\DrawerFooter.cy.stories.tsx" "$scope\DrawerFooter.cy-jsx.stories.ts" "$scope\DrawerFooter.cypress.config.cjs" "$scope\DrawerFooter.eslint.config.cjs" "$scope\DrawerFooter.run.cjs" --no-cache
```

The check runner additionally runs Prettier on all authored files and baseline
ESLint on the six unchanged source/export files. Scoped typechecking includes the
unchanged original Cypress suite; baseline typechecking includes original footer
source and all stable Drawer stories using the same local React-19 JSX bridge.
No ignoreWarnings list, shared tsconfig adjustment or broad lint disable is used.

Evidence files are under `reports`: `round-N-attempt-final.log`,
`round-N-attempt-final-spec-1.xml`, `round-N-attempt-final-spec-2.xml`,
`round-N-attempt-final-summary.json`, `format-final.log`, `typecheck-final.log`,
`typecheck-baseline.log`, `lint-final.log`, `lint-baseline.log`,
`commands.jsonl`, `preservation-before.json` and `preservation-after.json`.
Historical failed attempts and their exact diagnostics remain available.

Final persisted outcomes:

| Round | Passing / total | Failures | Skips | Axe audits |
| ----- | --------------: | -------: | ----: | ---------: |
| 1     |           18/18 |        0 |     0 |          8 |
| 2     |           30/30 |        0 |     0 |         18 |
| 3     |           80/80 |        0 |     0 |         55 |
| 4     |         100/100 |        0 |     0 |         75 |

All five scoped/baseline/format check logs record exit 0. The final 75 audits
contain two exact default presentation-role conflicts, five exact modal sentinel
incomplete sets, and the one intentional unnamed-button negative control.
The negative control's repaired phase has zero violations and zero incompletes.
All other audit sets are empty for violations/incompletes.

## Limitations

- Chrome headless on Windows is the exercised browser. No Firefox/WebKit,
  screen-reader, visual-snapshot or forced-colors certification is claimed.
- This does not rerun or replace Jest conformance/unit tests; their unchanged
  contracts are exercised in a real browser where applicable. Packaging/docgen
  naming checks remain the responsibility of the existing conformance suite.
- DrawerFooter has only a native footer root slot. It does not own drawer
  open/modal/size/motion props, focus trapping, dismissal, or disabled actions.
  Those are tested through supported parent and child APIs, not invented footer
  props. Alternate arbitrary root element types are not part of its declared API.
- Motion-disabled InlineDrawer opened from an initially closed state is not
  certified here; null-motion inline fixtures are initially open. Animated
  inline open/close is covered. Kept-mounted identity is verified, but automatic
  focus restoration on retained inline sources is not promised; explicit
  user interaction reopens them.
- The hidden native attribute is verified as forwarding/update behavior, not
  as a promise that footer flex reset styles preserve the browser's hidden rule.
- Long actions can overflow an unwrapped narrow footer; R4.13 verifies that
  current behavior and R4.04 verifies the supported consumer wrapping override.
- The external HEAD and InteractionTagSecondary changes are reported rather
  than undone. No claim is made that the entire shared checkout stayed static.

## Isolated mutation diagnostic amendment

The reconstructed `DrawerFooter-children-render` mutant removes the footer's
children. Its 75 failing scenarios included 69 assertion failures and six
incidental `TypeError`s when action geometry was read from missing elements:
R1.10, R1.11, both R1.13 directions, and both R4.04 drawer contexts.

Action rectangle queries now explicitly assert the required primary or secondary
child exists before measuring it, including the tightly coupled live-provider
and unwrapped-action geometry checks. All 111 scenarios and existing geometry,
tolerances, DOM order, state, and accessibility assertions are preserved. No
exception suppression, production edits, or harness classification changes are
introduced. Fresh baseline, mutant, and restored-baseline runs under a separately
sealed test amendment are required before claiming a mutation kill.
