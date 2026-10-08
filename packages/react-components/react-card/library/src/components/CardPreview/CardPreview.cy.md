# ONLY128 CardPreview functional coverage

## CURRENT integration contract — historical evidence below is superseded

Row 128 only; no ToolbarButton or other component work. Authored repository
writes are confined to this CardPreview directory. Production implementation,
units, snapshots, shared manifests/configuration, dependencies and the original
reports/screenshots/downloads remain intact. No staging, commit, push, amendment
or delegation is performed. The parent owns independent full review and any
source-allowlist commit.

The complete original **156-case hand-authored fixture** is retained under
`testing\CardPreview.cy.stories.tsx`, not replaced by a small/generated fixture.
R5 adds 18 cases and R6 adds 14 cases: **188 unique cases**. The original fixture
and bridge were moved into the existing producer's `/testing` exclusion; story
suffixes alone did not exclude them from SWC. `CardPreview.cy.tsx` is the ordinary
package-discovered canonical spec and imports that complete fixture once.
`CardPreview.cy-jsx.stories.ts` is interface-only for the standard global program;
`CardPreview.cy-aliases.stories.ts` supplies nonmergeable aliases only to private
programs, never to the canonical entry.

### Current execution and evidence

The package's actual unchanged `cypress.config.ts` is an ESM config: use the
available **Node 22.20.0** executable, not the older Node 18 runtime. Both standard
and direct CJS routes use Cypress 14.4.1, Chrome 154, port **46128**, real native
keyboard/pointer actions, zero retries and `trashAssetsBeforeRuns=false`.
`TS_NODE_COMPILER` points to the repository's installed
`node_modules\typescript\lib\typescript.js`.

From the repository root, with `node22` set to that available executable:

```powershell
$runner = 'packages\react-components\react-card\library\src\components\CardPreview\CardPreview.run.cjs'
$env:CARD_PREVIEW_EVIDENCE = 'C:\Users\jabrassi\.scout\copilot\session-state\5ed21290-e28e-4743-8b3d-3864ac6a202e\files\coverage-121-140\CardPreview\runs'
& $node22 $runner checks
& $node22 $runner cypress 6 direct-final-a
& $node22 $runner standard 6 standard-final-a
& $node22 $runner cypress 6 direct-final-b
& $node22 $runner standard 6 standard-final-b
```

Each invocation creates its own timestamp/PID-labelled folder. Neither peer logs
nor the original `reports` and screenshot folders are overwritten. Absolute JUnit,
audit, paint and screenshot paths prevent output escaping the authorized scope.
Without an evidence override the runner uses this component's ignored `.temp`.
The underlying direct command loads
`src\components\CardPreview\CardPreview.cypress.config.cjs`; the standard command
loads the actual package `cypress.config.ts` and selects the canonical spec.
There is no private proxy for the standard route.

The canonical suite does not require private reporting environment variables.
With `cardPreviewAuditPath` and `cardPreviewPaintPath` absent, it writes strict
audit, raw audit and paint reports under the component-owned ignored
`src/components/CardPreview/.cypress-downloads/standard-${Date.now()}` directory.
Each spec evaluation selects a fresh timestamp-labelled directory; repeated
ordinary package runs retain their separate reports. The default cumulative
round remains six (188 cases), and `cardPreviewRunId` is not required.
Nonempty string reporting overrides are optional and preserved verbatim;
explicit empty strings or nonstring values fail with a configuration error.
Reporting defaults do not change scenario, accessibility or paint assertions.

`INDEX-current.json` and `handoff.json` in the authorized artifact directory
identify the exact current full runs, raw XML, actual command/CWD/exits,
source-before/source-after hashes, production proof, original unit results and
normal parent-lint discovery. They also identify every retained failed attempt as
historical/superseded, rather than claiming an old green log proves current code.
Documentation-only map hashes are separate from runtime source hashes.

The current runner rejects nonzero exits, duplicate/missing raw JUnit cases,
failure/error/skipped nodes, missing audits, zero evaluated axe nodes or missing
six screenshot-paint reports. Full cumulative counts are 22/50/115/156/174/188.
Final evidence requires two complete direct runs and two complete standard runs
on the same runtime source set; addition-round evidence is not a substitute.

### Current CI/production isolation

- The actual `tsconfig.lib.json` noEmit program/file list must exclude the
  canonical entry, complete fixture and both bridges. Production files are
  unchanged and still included.
- The unchanged actual SWC production executor and Griffel CJS path execute in
  a physical source mirror. Exact producer exclusion decisions and emitted
  ESM/CJS file/content inventories must show no owned fixture, bridge, Cypress
  registration, test data or test imports. No shared producer config is changed.
  This is transpilation/noEmit evidence, not API declaration-generation proof.
- The actual package Cypress TypeScript program, private scoped program and
  imported-source baseline program all use real installed types, with no unsafe
  `as any`, fabricated source types or ignored fixtures. The pre-existing shared
  root config inherits `skipLibCheck=true`; that shared config is unchanged.
  **Current validation explicitly disables it:** private/scoped and baseline
  configs set `skipLibCheck=false`, and the actual standard package program is
  validated with `--skipLibCheck false`. The real installed `@cypress/react`
  declaration default-imports React, requiring
  `allowSyntheticDefaultImports=true`; this legitimate compiler interoperability
  setting replaces the inherited declaration suppression, not the source/types.
  Production noEmit validation likewise disables inherited library skipping.
- `testing\tsconfig.json` is the regular nearest config. Actual unchanged parent
  ESLint project service must parse every new TS/TSX bridge/fixture, without a
  CLI parser override, custom parser project, or ignored-file exemption.
  The private ESLint config simply reexports the unchanged parent config.
- A clean artifact mirror has physically absent `scripts\cypress\lib` and
  `lib-commonjs` outputs. The actual normal root `react-card:e2e` task graph retains
  `scripts-cypress:build`; normal dependency execution and synchronization remain
  enabled. The real cold root task must generate and resolve the helper before
  running the canonical spec. Generated shared helper outputs are read-only.
- Windows Babel path escaping requires an owned ignored logical execution-root
  junction to the physical artifact mirror for production compilation. It does
  not provide/fake generated helper files or modify the producer.
- Original Preview conformance/snapshot units and related Card hook/selection
  units run from their actual package Jest config: 31 tests in three suites.
  Existing unrelated Card-unit wording about inferred focus mode is not repaired.

### New source-backed round R5 — 18 cases

| ID    | Cases | Current assertions / source provenance                                                                                                                      |
| ----- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R5.01 |     1 | Supported `as="div"`, immutable root/slot styles and props, native/static consumer classes; slot clone semantics, conformance.                              |
| R5.02 |     1 | Trusted actual image click: outer/root capture, image handler, root/outer bubbling order, one native event identity, owner document and root ref.           |
| R5.03 |     1 | Consumer-focusable image Enter/Space reach native root handlers without synthesizing preview activation or a button role.                                   |
| R5.04 |     1 | Actual public Image direct child, current `loading`, fit, native image semantics and full geometry; current intrinsic whitelist drops `decoding`.           |
| R5.05 |     1 | Native picture/source media wrapper, genuinely loaded selected SVG `currentSrc`, full wrapper size and no substituted direct image.                         |
| R5.06 |     1 | Actual image decode and trusted load; supported root `onLoad` bubbles after child handler. Current intrinsic whitelist filters `onLoadCapture`.             |
| R5.07 |     2 | Partial reference ID or label does not satisfy the hook's complete-ID-and-label short circuit; exact StrictMode mount setter calls.                         |
| R5.08 |     1 | Replacing a context setter reruns source-backed image discovery on the same root, without calling the old setter again.                                     |
| R5.09 |     1 | Native child stopPropagation prevents preview-root and selectable-Card click handlers; no invented Preview selection state.                                 |
| R5.10 |     1 | Trusted image contextmenu reaches passive root with exact target/currentTarget and consumer cancellation.                                                   |
| R5.11 |     1 | External controlled Card selection changes retain root/media and emit no synthetic proposals; a later native click proposes actual next value.              |
| R5.12 |     1 | Actual `:not(.fui-CardPreview__logo)` selector excludes a consumer-classified direct child without constructing an extra logo slot.                         |
| R5.13 |     2 | Base/standard exported hooks: real state component compatibility, optional-logo absence and exact style-hook return identity, without hidden Preview state. |
| R5.14 |     1 | Nearest custom style hook sees both builtin slot classes and exact paint; outer provider hook is not invoked.                                               |
| R5.15 |     2 | Native eager/lazy image loading and decode remain consumer-controlled; no Preview progress placeholder or extra media wrapper.                              |

The real mount helper defaults to React StrictMode. Render hooks and mount
effects are consequently tested with their actual two initial invocations;
native user events remain one actual event. Counts are not loosened to arbitrary
positive values. The failed initial one-call assumptions are retained.

### New source-backed round R6 — 14 cases

| ID    | Cases | Current assertions / source provenance                                                                                                                            |
| ----- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R6.01 |     8 | LTR/RTL × four actual parent Card appearances: complete image/logo geometry, all flush edges/static slot names, no invented Preview appearance or selection prop. |
| R6.02 |     1 | Native `logo.as="img"` alone **does** match `.fui-CardPreview > img`; actual checkbox fallback naming and native logo click selection.                            |
| R6.03 |     1 | Absent alt plus explicit image ARIA label is a nonpresentational named image and valid source fallback; unlike the retained empty-alt conflict scenario.          |
| R6.04 |     1 | Multiple describedby IDREFs outrank alt/ARIA label for Card checkbox naming, while the image retains its own name and description.                                |
| R6.05 |     1 | Div-to-img logo replacement detaches/clears the old ref, assigns the actual new native image and preserves root identity.                                         |
| R6.06 |     1 | Genuine browser image decode failure emits one trusted native error, preserves image alt, and invents no progress/failure state.                                  |
| R6.07 |     1 | Native hidden-to-visible root update retains root/media, restores actual geometry, and introduces no internal visibility state.                                   |

**Selector clarification:** the historical statement that “logo images are
excluded” was too broad. Nested images and wrapped JSX-logo images are excluded
from the hook's direct-image query. A native img logo is itself a direct image
and can provide fallback naming. The current source-backed R6.02 proves this.

### Accessibility and actual screenshot evidence

Every case audits the complete actual `#fixture`, not a hidden/mocked target.
Passed rules and their real node targets, nonzero evaluated-node counts, full
violations/incompletes and resolved finding tag/name/role/tabindex are retained.
Raw audit data is written before classification; unknown findings fail. The
same validator rejects near-match scenario, phase, rule, node count, target and
check mutants. Sentinel profiles additionally reject changed native role,
tabindex and name attributes. All exact baseline results are restored and
revalidated after negative-mutant assertions.

The original exact six baseline profile families below remain disclosed.
No new violation or manual-incomplete profile is approved. At 188 cases, the
expected unchanged baseline totals are 173 clean audits, 14 violation-rule
instances (31 nodes) and two incomplete-rule instances (two nodes). Classified
results are not accessibility conformance and never claim manual AT validation.

Actual stable-story network requests are answered using the checked-in binary
fixtures through Cypress's binary fixture response API, not serialized browser
Buffers or remote-image success. The 13 asset names are allowlisted. The six
paint cases decode the **actual generated element-screenshot PNG** in the
browser, sample exact coordinates through canvas, and record colors via
`cy.writeFile`; they therefore work through both unchanged standard and direct
configs without a private Node task or PNG dependency exemption.

An additional strict declaration check exposed the pre-existing root's inherited
library skipping and `@cypress/react` default-import requirement. Its failing
logs are retained. Current scoped/baseline/standard and production checks disable
that skipping and use the genuine declaration-compatible compiler setting,
without modifying shared configs, dependencies or declarations. Browser results
from before this validation-config correction are explicitly historical; both
real routes are repeated on the corrected source/config set.

An initial empty-video/control experiment produced an unknown axe incomplete
and failed the suite. It was not whitelisted or reported as a manual pass.
The current documented-media coverage uses real images and native picture
sources; no video playback, captions or assistive-technology approval is claimed.
All failed integration, syntax, lint, native-attribute and StrictMode attempts
remain in uniquely labelled artifact folders. Original historical reports are
untouched.

### Source-only commit boundary and handoff

The parent must use the explicit source allowlist in current `handoff.json`,
not `git add` of this directory. It contains the canonical spec, complete
testing fixture, two JSX bridges, nearest testing tsconfig, three scoped
tsconfigs, direct Cypress config, parent ESLint passthrough, runner, coverage
map and scoped `.gitignore`. Generated reports, screenshots, `.temp` junctions,
mirror outputs and caches are never commit sources. No next row is started.

---

## HISTORICAL original 156-case implementation/evidence — SUPERSEDED

Everything below is retained for provenance. Its old runner paths, Node 18,
port 45228, private parser override, standalone story-suffix exclusion claims,
156-case final counts and old green logs are **not** the current integration
contract. Use the CURRENT section and artifact `INDEX-current.json` instead.

## Scope and execution

This is a test-only addition for the shared Windows `fluentui` checkout on `master`.
All authored files, runner output, JUnit XML, JSON summaries, screenshots, download
directories, webpack output and local cache paths are inside
`packages\react-components\react-card\library\src\components\CardPreview`.
There are no production changes, dependency changes, shared configuration changes,
commits or branch operations. Other dirty/untracked work is preserved.

The isolated runner follows the successful ONLY127 CardFooter local runner/config,
but uses its own port 45228, paths, task names and report prefix. The installed
Cypress 14.4.1, Chrome 154, Node 18.20.6, axe-core and pngjs are reused.
No packages are installed. The component spec uses `.cy.stories.tsx` so repository
story JSX/type conventions apply without changing shared project configuration.
The local JSX compatibility bridge follows CardFooter's bridge.

PNG decoding reuses the installed `pngjs` dependency declared by the installed
`pixelmatch` package. The local ESLint override applies only to this Cypress config
and includes that owning manifest in `packageDir`; the dependency rule stays
enabled. No repository dependency manifest is changed.

### Commands

Run from the repository root in PowerShell:

```powershell
$runner = 'packages\react-components\react-card\library\src\components\CardPreview\CardPreview.run.cjs'
node $runner snapshot
node $runner cypress 1 5
node $runner cypress 2 4
node $runner cypress 3 3
node $runner cypress 4 11
node $runner format
node $runner checks
node $runner preserve
```

`snapshot` is run once before test implementation, not again when reproducing
preservation. `cypress <round> <attempt>` runs all cases up to that round. Attempt
numbers label evidence, not retries: Cypress retries are zero. The underlying
browser command is:

```powershell
node node_modules\cypress\bin\cypress run --component --browser chrome --headless --project packages\react-components\react-card\library --config-file src\components\CardPreview\CardPreview.cypress.config.cjs --env coverageRound=4
```

The runner fails for any nonzero exit, failure, pending/skipped cases, missing axe
audit, duplicate test name, unexpected cumulative count or missing fitting
screenshot evidence. Expected counts are 22, 50, 115 and 156. Six pixel reports
are required in round 4; earlier rounds do not contain screenshot-paint cases.

| Round | Added | Cumulative | Primary objective                                                            |
| ----- | ----: | ---------: | ---------------------------------------------------------------------------- |
| R1    |    22 |         22 | Stable anatomy, loaded images, fitting boxes, standalone LTR/RTL             |
| R2    |    28 |         50 | Slots, native props, refs, renderer hooks and live updates                   |
| R3    |    65 |        115 | 48-case Card layout matrix, responsive geometry and naming context           |
| R4    |    41 |        156 | Native interaction modes, remaining stable stories, pixels and forced colors |

Each addition round was executed before proceeding. Initial failing attempts are
retained rather than erased. Final cumulative runs use the final formatted source.

## Inspected source and stable documentation

Paths below are relative to `packages\react-components\react-card`.

| Evidence key | Inspected source                                                                                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P            | `library\src\components\CardPreview`: component, types, index, base/standard state hook, renderer, styles, unit test and snapshot                                                                                             |
| C            | `library\src\components\Card`: component, types, context/default context/provider, context-value hook, state/base hooks, selectable hook, renderer, styles, Card units and hook/selection units                               |
| H            | `library\src\components\CardHeader\useCardHeader.ts`: reference ID/child-ID precedence and effects                                                                                                                            |
| U            | `library\src\testing\isConformant.ts`: shared conformance and Griffel conformance configuration                                                                                                                               |
| S            | Every stable Card story: Default, Orientation, Size, Appearance, Selectable, SelectableIndicator, Disabled, WithAction, FocusMode, Templates and story index                                                                  |
| D            | CardDescription, CardBestPractices, CardPreviewDescription, CardPreviewDefault, CardPreview story index, story/library README, complete library docs Spec, generated public API report and Preview-relevant changelog entries |
| A            | Existing Card Cypress focus/selection tests and functional stylesheet/source recipes; existing CardFooter runner, config, type bridge, audit and test patterns                                                                |
| L            | `react-utilities\src\compose\slot.ts`: nullish optional slots, shorthand values and render functions                                                                                                                          |

Every stable story containing CardPreview is mounted unchanged: Preview Default,
Card Default, Orientation, Selectable, SelectableIndicator, Disabled, WithAction,
FocusMode and Templates. Size and Appearance have no CardPreview; they were
inspected, with their applicable size/appearance documentation informing context
tests rather than inventing preview-specific appearance props.

Stable story requests are redirected to the **actual checked-in image files** on
the local webpack asset server. The allowlist rejects unknown asset names.
No remote image success is assumed: every mounted image must be complete and
have positive natural dimensions. Purpose-built fixtures use deterministic SVG
images with known intrinsic dimensions and colors.

## Traceability

IDs identify scenario families; a family with variants expands into independently
named `it` cases. `reports\round-4-attempt-11-summary.json` contains all 156 exact
test names, full axe results and pixel evidence, and the matching XML identifies
each executed case. Geometry comparisons allow at most 0.6 CSS pixels for browser
subpixel rounding; dimensions, computed styles, attributes, callback counts,
accessible names, focus targets and screenshot colors are otherwise exact.

### R1: documented anatomy and image geometry (22)

| ID    | Cases / variants                                    | Assertion and evidence                                                                                                                             |
| ----- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1.01 | 1                                                   | Unchanged Preview Default, genuine loaded Word images, alt text, logo 12px insets, full-width preview image (P/S/D)                                |
| R1.02 | 1                                                   | Unchanged Card Default, header-preview-footer DOM order, document image accessible name, real Reply focus (S/C)                                    |
| R1.03 | 1                                                   | Unchanged Orientation, actual 64x64 horizontal preview, row direction (S/C)                                                                        |
| R1.04 | 1                                                   | Unit snapshot reproduction: native div, default text before logo wrapper, both static class exports (P/U)                                          |
| R1.05 | 5: undefined, null, false child, empty string, zero | Optional logo nullish semantics, exact wrapper count/content. False is supported as **slot children**, not an invalid boolean logo shorthand (P/L) |
| R1.06 | 6: LTR/RTL x 320x180, 180x320, 240x240              | Real root/image rectangles, block display, 32x32 absolute logo and 12px logical-start/bottom insets (P)                                            |
| R1.07 | 5: fill, contain, cover, none, scale-down           | Consumer object-fit preserved, natural 320x180 source and actual 240x240 image box (P)                                                             |
| R1.08 | 1                                                   | Browser default fill; unbounded-height image scales to intrinsic 400x225 ratio (P)                                                                 |
| R1.09 | 1                                                   | Non-logo direct child stretches, nested 40x20 image is not incorrectly targeted by direct-child CSS (P)                                            |

### R2: native API, slots, refs and updates (28)

| ID    | Cases / variants                   | Assertion and evidence                                                                                                       |
| ----- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| R2.01 | 1                                  | Native id/title/lang/dir/data/role/ARIA forwarding, computed name/description, no logo prop leakage (P/U)                    |
| R2.02 | 1                                  | Real image pointer event targets/root currentTarget; native root Enter/Space handlers without invented button activation (P) |
| R2.03 | 1                                  | Default root has no role/tabindex, real Tab bypasses it for inner action then exits (P/U)                                    |
| R2.04 | 1                                  | JSX image wraps once; `logo.as='img'` is the slot itself, native title/loading preserved (P/L)                               |
| R2.05 | 1                                  | Empty logo object deliberately renders an empty 32px slot (P/L)                                                              |
| R2.06 | 1                                  | Root/slot class, title, data and ARIA isolation, consumer border radius (P/U)                                                |
| R2.07 | 1                                  | Exact inline root position and logo size/inset overrides (P)                                                                 |
| R2.08 | 1                                  | Griffel consumer classes override builtins without losing static names (P/U)                                                 |
| R2.09 | 2: object/callback refs            | Root native div identity and clearing on real unmount (P/U)                                                                  |
| R2.10 | 2: object/callback refs            | Native image logo ref identity and clearing on real slot removal (P/L)                                                       |
| R2.11 | 1                                  | Replacing root callback ref clears old ref, sets new ref, retains native node (P/U)                                          |
| R2.12 | 5: undefined/null/false/empty/zero | Root children preserved, including numeric zero; no substituted content (P/L)                                                |
| R2.13 | 1                                  | Logo render function gets generated props/styles/ref, preserves native child pointer/Enter activation (P/L)                  |
| R2.14 | 1                                  | Logo render function returns null without suppressing preview image (P/L)                                                    |
| R2.15 | 1                                  | Root render function receives generated logo children and retains both custom image and forwarded ref (P/L)                  |
| R2.16 | 1                                  | Root render function returns null, suppressing entire tree/logo/ref but not sibling action (P/L)                             |
| R2.17 | 1                                  | Provider custom style hook runs after builtins; exact visible root paint and logo size (P)                                   |
| R2.18 | 2: base/standard public hooks      | Public hooks + style hook + renderer produce working geometry/slots and forwarded refs (P)                                   |
| R2.19 | 1                                  | Live removal/replacement of native attributes, class/style and handlers, same root, no stale closures (P/U)                  |
| R2.20 | 1                                  | Live src/alt/fitting update with loaded changed intrinsic image, div-to-img logo replacement, no stale wrappers (P)          |
| R2.21 | 1                                  | Live logo render-function closure updates action accessible name while retaining slot node and focus (P/L)                   |

### R3: Card layout and naming context (65)

| ID    | Cases / variants                                                                | Assertion and evidence                                                                                                                             |
| ----- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| R3.01 | 48: LTR/RTL x small/medium/large x vertical/horizontal x first/middle/last/only | Exact 8/12/16px padding, negative margins, flex direction, actual flush edges, clipped Card, stable 180px preview height and logo geometry (C/P/S) |
| R3.02 | 2: LTR/RTL                                                                      | Wrapped preview retains 16px Card padding and does not match direct-child negative-margin selectors (C/P)                                          |
| R3.03 | 2: LTR/RTL                                                                      | Real 375px and 1000px viewport changes, bounded responsive Card width, image/overlay recompute (C/P)                                               |
| R3.04 | 4: alt/ARIA label/describedby/alt-before-label                                  | Internal checkbox fallback names, describedby becomes labelledby, alt precedes image ARIA label for selection, real surface selection (P/C)        |
| R3.05 | 2: header before/after preview                                                  | Header child ID/title takes checkbox naming precedence in either DOM order (H/P/C)                                                                 |
| R3.06 | 1                                                                               | Nested image and logo image excluded from direct-preview-image naming query (P/C)                                                                  |
| R3.07 | 1                                                                               | Sibling Cards retain independent names and pointer selection (P/C)                                                                                 |
| R3.08 | 1                                                                               | Earlier nested image cannot outrank parent's first direct image; DOM/selector order, checkbox name/ARIA label and native selection (P/C)           |
| R3.09 | 1                                                                               | Alt-only live update changes image name but does not promise unsupported checkbox relabeling (P)                                                   |
| R3.10 | 1                                                                               | Referenced description text live update changes accessible checkbox name without replacing ID (P/C)                                                |
| R3.11 | 1                                                                               | Explicit checkbox naming overrides image fallback (C/P)                                                                                            |
| R3.12 | 1                                                                               | Live small-to-large, vertical-to-horizontal and first-to-last reorder recomputes negative margins on the same preview (C/P)                        |

Horizontal layout fixtures deliberately occupy available space: the preceding
ordinary div grows for last placement, and the image-only horizontal Card fits
its preview width. CardPreview does **not** promise to grow into arbitrary unused
horizontal space; the tests do not invent that behavior.

### R4: actual interaction, stable recipes and rendered pixels (41)

| ID    | Cases / variants                          | Assertion and evidence                                                                                                                 |
| ----- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| R4.01 | 8: LTR/RTL x off/no-tab/tab-exit/tab-only | Native Tab/Enter entry, preview-logo action then sibling action order, wrapping versus exit, Escape to root (C/P/S/A)                  |
| R4.02 | 1                                         | Real image and nonfocusable logo clicks select once each, exact selected data and native target/type (C/P)                             |
| R4.03 | 2: Enter/Space                            | Preview-named checkbox selects exactly once; nested logo button keyboard action does not select Card (C/P/A)                           |
| R4.04 | 1                                         | Logo button pointer activation does not select Card (C/P)                                                                              |
| R4.05 | 1                                         | Fixed controlled selected prop does not mutate; both pointer proposals are true (C)                                                    |
| R4.06 | 2: selected false/true                    | Disabled Card retains selection, disabled checkbox and fitted image; explicitly enabled logo children remain keyboard-actionable (C/S) |
| R4.07 | 1                                         | Browser elementFromPoint hits logo at overlay center and image at image center (P)                                                     |
| R4.08 | 2: light/dark                             | Stable geometry and image names; empty-alt decorative logo has no accessible name (P)                                                  |
| R4.09 | 1                                         | Real button toggles logo removal/restoration without replacing root image or losing action focus (P/L)                                 |
| R4.10 | 1                                         | Unchanged Selectable, header naming and independent preview selection (S/H)                                                            |
| R4.11 | 1                                         | Unchanged SelectableIndicator, preview click and native Space synchronize named floating checkbox (S/C)                                |
| R4.12 | 1                                         | Unchanged FocusMode, four loaded previews, real keyboard entry/Escape (S/C)                                                            |
| R4.13 | 1                                         | Unchanged Disabled, ten previews, five disabled action pairs, enabled/disabled selection contrast (S/C)                                |
| R4.14 | 1                                         | Unchanged WithAction, native preview click alert and exact current Enter bubbling count (S)                                            |
| R4.15 | 1                                         | Unchanged Templates, full-bleed image-only Card, loaded asset, no invented selection (S/C)                                             |
| R4.16 | 5: fill/contain/cover/none/scale-down     | Browser element screenshots verify exact RGBA pixels for circle scaling, crop and letterboxing, not just object-fit CSS (P)            |
| R4.17 | 1                                         | Screenshot proves scale-down does not upscale a smaller 60x40 intrinsic image (P)                                                      |
| R4.18 | 4: off/no-tab/tab-exit/tab-only           | Real reverse Shift+Tab from second action enters preview logo action; Escape semantics (C/A)                                           |
| R4.19 | 1                                         | Complete preseeded reference ID + label suppresses image-derived context setters (P)                                                   |
| R4.20 | 2: LTR/RTL                                | Real CDP forced-colors media: selected Card opts out, preview adjusts automatically, fitted image/overlay retained (C/P/A)             |
| R4.21 | 1                                         | Current inferred interactive Card no-tab behavior, actual focus trap/entry/escape and native preview click (C/A)                       |
| R4.22 | 1                                         | Keyboard-only Card handler does not infer pointer interactivity or root Tabster management (C)                                         |
| R4.23 | 1                                         | Live provider RTL/dark theme and return to LTR preserve root/image identity and move logo to correct logical start (P)                 |

The five fitting screenshots sample known SVG background/circle colors away from
antialiased edges. A sixth screenshot distinguishes scale-down of a smaller
intrinsic image. `PAINT_CARD_PREVIEW` log lines and summary `paint` entries preserve
the exact pixel coordinates' results. Screenshots are component-element PNGs,
not screenshots of the Cypress runner UI.

## Accessibility policy and evidenced findings

Every case runs full axe-core on the complete `#fixture` main, including Card,
images, selection controls, actions and Tabster sentinels. No rules are disabled.
At least one applicable rule must pass. Full violations/incompletes (HTML, target,
check IDs/data, impacts and failure summaries) are persisted through
`AXE_CARD_PREVIEW`. Unknown rules, nodes, check shapes or incompletes fail.
CDP forced-colors state is reset after audits, without hiding its audit result.

The following classifications were added **only after failing browser runs
provided their exact evidence**. Classification is not a claim of accessibility
conformance or a suppression of the recorded result.

| Classification                      | Exact allowed scenarios                                        | Required evidence                                                                                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| snapshot-logo-text-overlap          | R1.04 only                                                     | One color-contrast incomplete on logo; exact partially-obscuring message/data, 14px normal text, `Logo slot`, no violations                                                                                                            |
| numeric-logo-image-background       | R1.05 zero only                                                | One logo color-contrast incomplete; exact shortTextContent data, numeric zero, related underlying image, no violations                                                                                                                 |
| empty-alt-global-aria               | R3.04 ARIA-label variant only                                  | One minor presentation-role-conflict on `#image`; empty alt plus exact ARIA label, has-global-aria-attribute check, no incompletes                                                                                                     |
| groupper-sentinels                  | Six non-off R4.01 cases, three non-off R4.18 cases, R4.21 only | One serious aria-hidden-focus rule, exactly two actual previous/next Card sibling I nodes; exact role, tabindex, aria-hidden, first/last Groupper metadata, check and failure summary                                                  |
| focus-story-sentinels               | R4.12 only                                                     | One aria-hidden-focus rule on exactly six previous/next sibling sentinels around the three non-off story Cards                                                                                                                         |
| disabled-story-sentinels-and-labels | R4.13 only                                                     | Exact aria-hidden-focus pair for interactive enabled story Card index 2; exact critical label rule on two floating native checkboxes in Cards 6/7, enabled/disabled distinction, empty accessible names and exact seven failing checks |

Final expected audit totals: **156 audits; 141 entirely clean; 14 classified
violation-rule instances affecting 31 nodes; 2 classified incomplete-rule
instances affecting 2 nodes**. These are repeated per-fixture instances, not 14
distinct rules. There are no unknown findings.

The unchanged WithAction story has a separate evidenced behavioral limit: its
first preview click calls the alert once, but Enter on Open currently calls it
three additional times because the root key handler, button click and bubbled root
click each invoke the action. The test records four total alerts rather than
silently repairing the shared story or claiming deduplicated behavior.

## Validation and preservation evidence

The final scoped checks include all authored TS/TSX/CJS plus formatting, and
separately check unchanged Preview production files. The imported stable stories
and Card dependency graph are typechecked through the baseline tsconfig.

| Command category                                     | Log                                                                   |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| Formatting write/check                               | `reports\format-write.log`, `reports\format-final.log`                |
| Full scoped spec typecheck                           | `reports\typecheck-final.log`                                         |
| Existing component/story external baseline typecheck | `reports\typecheck-baseline.log`                                      |
| Authored scoped lint                                 | `reports\lint-final.log`                                              |
| Unchanged production lint baseline                   | `reports\lint-baseline.log`                                           |
| Actual commands/exits                                | `reports\commands.jsonl`, `reports\checks-summary.json`               |
| Browser attempts                                     | `reports\round-N-attempt-M.log`, matching summary JSON and spec XML   |
| Initial/final preservation                           | `reports\preservation-before.json`, `reports\preservation-after.json` |

The final and external baseline typechecks/lints must both exit zero. The external
baseline report therefore has no pre-existing TypeScript or ESLint errors to
exclude; earlier authored errors were fixed rather than attributed to baseline.

Preservation captures 434 SHA-256 hashes covering all existing dirty/untracked
files, tracked Card files, shared Cypress files and root dependency/config files,
including the original Preview implementation/unit/snapshot. It also captures
outside-scope Git status, branch and HEAD. The final preservation command fails
for any mismatch; it never reverts another user's work.

### Shared-checkout concurrency result

The strict preservation check **does not pass globally**: 427/434 initial file
hashes are unchanged. The seven mismatches are the pre-existing AvatarGroup
spec, JSX bridge, documentation, Cypress config and tsconfig, plus CarouselNav
documentation/spec. Outside-scope status also contains new AvatarGroupItem and
CarouselNavButton work. These paths were not edited by this task.

HEAD moved concurrently from `76d2ab986f14a31bb2ccbaa60bd0a5a4e8676a75` to
`5b3b20ea85f98232a1f0917575ba848d6162af0b`, the CarouselNav test commit.
The branch remains `master`. This task created no commits or branch mutations.
All snapshotted original CardPreview production/unit/snapshot files, other Card
files, shared Cypress configuration and root dependency/config files are
unchanged. The report includes `changedExternalFiles`, `concurrentCommits`,
`concurrentCommittedPaths`, outside-status additions/removals,
`previewProductionPreserved` and `cardAndSharedConfigPreserved`.

The runner retains the strict nonzero preservation exit instead of suppressing
this concurrency limitation, resnapshotting away the mismatch or reverting
someone else's changes. Browser/type/lint evidence is green independently of
that global preservation mismatch.

## Limits

This suite validates actual Chrome behavior on Windows with light/dark themes,
LTR/RTL, real keyboard/pointer events, narrow/wide viewports and emulated
forced-colors. It does not claim Firefox/WebKit, touch-screen, OS-level high
contrast, assistive-technology speech, screen-reader or visual-design approval.
PNG color assertions verify these deterministic fixtures, not every possible
consumer image.

CardPreview has no public size, orientation, selected, disabled or object-fit
design props. Those effects come from Card context/direct-child CSS, native image
styles and consumer composition. No unsupported root element types, invalid
boolean logo shorthand, automatic alt-update relabeling or interactive-root
button semantics are invented.

The historical `docs\Spec.md` is an API proposal, not a replacement for current
types: its `scale`/`expandable`/`select` proposals, direct Preview src/alt example
and blanket disabled-child statement are not current public contracts. Current
source/stable docs and generated API control these tests. Changelog entries
confirm the relevant flush-edge, img-logo, describedby and custom-style-hook
history without inventing the older proposed behaviors.

`useCardPreview` scans the parent for the first `.fui-CardPreview > img`. It ignores
nested/logo images; a complete reference ID+label short-circuits setters. Its
effect does not depend on children/alt, so changing alt alone is not a supported
promise of synchronized checkbox naming. A pre-existing Card unit description
still mentions tab-only for inferred interactive behavior; current source and
real-browser evidence use no-tab. Those unrelated production/unit/stable-story
issues remain untouched.

There are no arbitrary timed waits, forced interactions, skipped tests, exception
catches, rule disablements or unknown-result fallbacks. Native focus setup and
retryable DOM/image/style assertions precede real user interactions. The suite
extends unit-derived scenarios in a real browser; Jest/full-repository builds are
not run, and no unrelated component is started.

## Isolated mutation testability amendment

The reconstructed `CardPreview-logo-render` mutant exposed missing-element
geometry errors and a strict audit mismatch in the verdict-bearing `afterEach`
hook. Mocha treated that hook failure as a reason to skip later scenarios.

Required image/logo elements and the coupled native-event ref now have typed
nonnull assertions before geometry, style, or property reads. The local test
registration wrapper appends the complete strict audit chain to each test body,
after its queued interactions and before the unchanged media-reset cleanup hook.
An audit mismatch therefore fails its testcase rather than aborting the suite.
No successful test can omit the audit chain; an earlier body failure remains a
failure, not an accessibility pass.

The original live-fixture phase marker, raw/validated evidence writes, exact
violations/incompletes/contrast profiles, and adversarial classifier probes are
retained. The audit's internal restoration order and media-reset hook are not
moved or weakened. All 188 qualified titles and the direct-image fallback guard
from 548218d4 remain unchanged. Fresh parent-run baseline, mutant, and restored
evidence under a separately sealed amendment is required; no new Cypress result
is claimed here.

The forced-colors follow-up verified the original registered root hooks as
audit then media reset, not the reverse. The original R4.20 audit passed the
checkbox label rule; the body-tail audit captured an unnamed input while its
later live-node metadata already had the inferred "Document preview" name.
This is an audit naming-readiness race, not an allowable new violation.

Only R4.20 now uses the existing retryable `labelOf` helper to require that
inferred name before the body audit. Forced-colors interactions and audit remain
ahead of the unchanged media reset, including its failed-case cleanup guarantee.
No media reset is moved earlier to hide a finding, and no audit profile, rule,
contrast expectation, or verdict is relaxed.

The logo-render follow-up reviewed one remaining R1.04 text-node `TypeError`
alongside 119 assertion failures. R1.04 now asserts its first text node exists,
requires the logo through the proven helper, and verifies that logo is the last
element before reading its text. Original text, tag, static-class, and order
checks are retained; the 188 titles, audit isolation, naming readiness, cleanup,
and 548218d4 fallback guard are unchanged.

Selectable Picture/ActionPicture interactions now share an explicit semantic
readiness requirement: after image readiness, the existing `labelOf` assertion
must observe the fixture-declared checkbox name before interaction and audit.
The six additional sites cover R4.03 (Enter/Space), R4.04, R4.05, R4.06 (both
selection states), and R5.11 with "Document preview", plus R5.09's custom
"Stopped preview". These are eight cases, not a generic all-input naming wait.

This waits for the asynchronous preview-to-Card naming effect, not an arbitrary
duration. A missing or wrong name fails the exact assertion. Nonselectable
fixtures, intentionally unnamed profiles, header/explicit-name precedence,
stale-alt behavior, and all existing audit policies remain unchanged.
