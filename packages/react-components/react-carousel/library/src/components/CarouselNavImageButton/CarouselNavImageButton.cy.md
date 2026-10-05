# ONLY131 CarouselNavImageButton browser and functional coverage

All authored tests, compatibility/configuration files, runner state, logs,
reports and screenshots are confined to this component directory on shared
`master`. Production source, existing units/snapshots, sibling components,
shared configuration, dependencies and Git history are not edited by this work.
The component is prepared for the campaign parent's independent review and
separate commit; this bounded implementation does not create a commit.

## Contract and source inventory

The inventory is grounded in this component's public types, component, hook,
renderer, styles, exports and existing conformance/default snapshot; the
CarouselNavButton equivalents; CarouselContext and its value types;
CarouselNav's index/appearance contexts, hook and renderer; Carousel,
CarouselCard, CarouselSlider, CarouselViewport and Embla selection/publication;
the ARIA button helper and native image-property allowlist.

Documentation consulted includes library README, Spec and Migration; stable
Carousel and CarouselNav descriptions/best practices; and all current local
Carousel/CarouselNav stories. ImageSlideshow and the Nav Default toggle are
mounted directly. Their external image requests are intercepted with
deterministic decoded SVG responses, never downloaded or used as assertions.
Other documented compositions are tested through finite local carousel fixtures.

**Do not confuse this component with Fluent Image or Button.** Its required
`image` is a native `img` slot. There are no `fit`, `size`, `shape` or
`appearance` props. Fit is `image.style.objectFit`; custom geometry and shape
use native styles or consumer Griffel classes. Negative compile-time API
probes enforce this distinction. The void image slot has no public image
render-function children; supported root render functions can forward,
replace or suppress their rendered image.

This component duplicates parts of NavButton's behavior rather than inheriting
its hook/styles. It does not use Nav appearance, dot/pill pseudo-elements, a
NavButton custom focus indicator, or the NavButton autoplay reset call.

## Traceability

Each expanded test title is unique and includes the round/case ID. The runner
requires exactly 33, 96 and 131 executed cases respectively, one actual axe
audit per unique case, no failures/pending/skips, and zero actual/configured
retries. The default is the complete third round, without `Cypress.env`
overrides or custom tasks.

| IDs                  | Source/API surface                                             | Functional evidence                                                                                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1.01-02             | Stable ImageSlideshow and Nav Default                          | Real thumbnail activation, three-image selection; five-dot to five-thumbnail switch; decoded intercepted assets                                                                                                                                            |
| R1.03                | Root/image style branches, class constants                     | Light/dark and LTR/RTL; selected 48px versus unselected 40px; content-box, clipping, token radius/margin, both dimensions after selection                                                                                                                  |
| R1.04-07             | Public carousel selection, grouping, controlled/default index  | Real pointer/Enter/Space in both directions; exactly one click payload and same event; panel alignment within 1px; accepted/declined controlled feedback; grouped live IDREFs; default index                                                               |
| R1.08-09             | Image decorative defaults/native attributes                    | Empty default alt, hidden presentation semantics, root accessible name; explicit alt/title/loading/draggable; exact nonempty-alt incomplete; current decoding filter                                                                                       |
| R1.10-12             | Native thumbnail fit/dimensions/shape                          | Five object-fit values, object-position, decoded intrinsic 80x40 aspect, actual square geometry; HTML attributes versus CSS dimensions; both-slot custom 64px circle                                                                                       |
| R1.13                | Native root metadata/accessibility relations                   | Name/value/title/data/class; live label/description endpoints; DOM accessible name/description and Chromium AX-tree tab name, description, selected property                                                                                               |
| R1.14-17             | Refs and native activation contract                            | Exact root/image nodes; image/root/select/parent callback ordering; selection veto; no autoplay reset; repeated selected-page notification; contextual index rather than native value/data-index                                                           |
| R2.01-03             | Nav Tabster keyboard context                                   | Real LTR/RTL arrows, disabled skipping, focus without selection, Enter activation, Tab/Shift+Tab selected entry and group exit, noncircular endpoints                                                                                                      |
| R2.04-05             | ARIA native/button/anchor/div helper                           | Nine real activation combinations; explicit tab semantics; six native/helper keydown/keyup cancellation cases                                                                                                                                              |
| R2.06-07             | Disabled/focusable-disabled/ARIA-disabled                      | Enabled/native-disabled/disabledFocusable/combined/boolean/string ARIA modes; exact callback counts; native pointer and reachable Enter/Space; anchor/div retained keyboard guard versus unguarded pointer                                                 |
| R2.08-09             | Native form type/default behavior                              | Enabled/focusable-disabled button/submit/reset; real native submission/reset counts and input values; default non-submit; consumer cancellation                                                                                                            |
| R2.10-12             | Native callbacks/tabIndex/hover/focus                          | Trusted key values and exact currentTarget; focus/blur order; real Tab exclusion versus pointer activation; hover cursor and positive native keyboard outline                                                                                              |
| R2.13-16             | Naming and semantic overrides/link metadata                    | Exact unnamed-button negative control; visible image semantics; native href/target/rel with safe cancellation; disabled href removal and pointer characterization                                                                                          |
| R2.17-20             | Image load/error/responsive metadata and Nav appearance        | Actual decoded load callback node; intercepted 404/error with keyboard navigation; srcSet/currentSrc/crossOrigin; current sizes filter; absence of inherited brand dot/pill                                                                                |
| R3.01-05             | Defaults, context selection, ARIA override and renderer        | Standalone/default index; nonmatching selection; live context geometry without remount; explicit aria-selected versus internal sizing; native children replaced by image                                                                                   |
| R3.06-09             | Public root render functions and exported composition          | Forward default image/handlers; native image replacement/ref; null root rendering; headless hook plus styles plus renderer                                                                                                                                 |
| R3.10-14             | Consumer styles/provider hooks/update/ref lifecycle            | Griffel precedence on both slots; custom provider style hook; source/callback closure replacement without remount and decoded source pixel check; ref replacement/nulling; current handlers after reenable                                                 |
| R3.15-16             | Event propagation and target guard                             | Image versus root stopPropagation; real SVG target excluded versus native img positive control; no image-button autoplay reset                                                                                                                             |
| R3.17-21             | Subscription/effect lifecycle                                  | Ordered grouped live controls; absent group clears IDs; index and subscribe identity disposal; no premature clearing/replay; unmount removes listener; remount requires new publication                                                                    |
| R3.22-25             | Nested/actual carousel context and provider changes            | Nearest nested context/index; grouped card removal clears removed endpoint IDs in both directions; circular end-to-start selection; live theme/direction with stable decoded nodes                                                                         |
| R3.26-29             | Polymorphic defaults, empty slot, forced colors, veto ordering | Exact default button-role/aria-selected misuse for anchor/div; required empty image object; real CDP forced-colors positive controls in both directions and screenshots; image versus late-parent preventDefault                                           |
| Functional unit file | Unit/source-derived behavior                                   | 14 new nonsnapshot units: native defaults/attributes, refs/disposal, ordering/no-reset, root/image veto, contextual index, selected/override states, disabled characterization, ordered/empty publications, cleanup, latest callback and renderer children |
| Existing unit files  | Existing image-button and NavButton conformance                | 20 image-button and 20 inherited-contract comparison cases, unchanged existing snapshots                                                                                                                                                                   |

Geometry assertions observe actual browser boxes and computed styles, not
snapshots. Carousel audits wait for six unchanged animation-frame transforms
with a bounded explicit failure; there are no fixed sleeps. The pixel check
samples the actual decoded, changed source through canvas; it does not claim
to measure CSS object-fit rasterization. Forced-color screenshots are evidence,
not pass/fail pixel snapshots.

## Exact accessibility classifications

All axe rules run without exclusions, disabled rules or blanket suppression.
Raw reports retain rule/impact, targets, HTML, failure summaries and all
any/all/none check data. A changed rule, additional node or unclassified
incomplete result fails the test.

The final 131 audits comprise 94 clean audits, 33 exact Tabster-mover
classifications, three exact consumer-negative findings and one exact hidden
nonempty-alt incomplete classification:

- **Tabster:** `aria-hidden-focus`, exactly the two first/last `I` children of
  the single real CarouselNav mover. Tests require exact nth-child targets,
  parent identity, role `none`, tabindex `0`, aria-hidden `true`, both precise
  `data-tabster-dummy` strings, failure summary and `focusable-not-tabbable`
  check. No other hidden-focus nodes are accepted.
- **Unnamed control:** `button-name`, exactly `#subject`, with empty computed
  root name. Hidden image content is not a substitute for a navigation label.
- **Unmodified anchor/div defaults:** `aria-allowed-attr`, exactly `#subject`.
  ARIA helper defaults yield role `button`, not tab, while the component
  still supplies aria-selected. Explicit tab semantics are positive controls.
- **Hidden nonempty alt:** one `aria-allowed-role` incomplete on `img`,
  exact `presentation` check data, minor impact, exact message, empty all/none
  checks, alt `Sea thumbnail`, aria-hidden `true` and role `presentation`.
  This is manual-review evidence, not a clean audit or confirmed violation.

Final aggregate counts are 36 violation-rule occurrences / 69 node occurrences
and one incomplete-rule occurrence / one node occurrence. These counts include
the repeated known Tabster finding and intentional negative controls; they are
not 36 distinct defects.

## Explicit behavior limits and baseline observations

The suite preserves, rather than repairs, existing behavior. The component
overwrites the ARIA helper's guarded click handler. Native disabled blocks
activation, but native disabledFocusable/ARIA-disabled controls still notify,
select and execute native submit/reset defaults. Anchor/div disabled key
helpers block Enter/Space, while pointer clicks still select. This is named
defect characterization, not a disabled-behavior correctness claim.

The native image allowlist currently drops `decoding` and `sizes` despite their
React typing. Source and srcSet, loading, crossOrigin and common metadata are
tested independently. Subscription publications mutate aria-controls directly:
initial dynamically generated buttons need a later publication; index or
subscribe changes retain old IDs until the next publication; missing groups
publish an empty string. StrictMode's initial setup/cleanup/setup is counted
explicitly, not mistaken for a leak.

Controlled parent refusal is checked for unchanged selected state and requested
callback, not claimed to repair the parent engine's physical-position behavior.
No universal browser, assistive-technology speech, autoplay timing, live-region
announcement, arbitrary invalid-input or infinite visual-combination guarantee
is made. No user/work data or outbound form submission is involved.

## Commands and persistent evidence

From the checkout root, use the component-local runner. The unchanged package
ESM Cypress configuration requires the existing Windows Node 22 runtime;
prepend its directory to `PATH` so child Node processes use it too:

```powershell
$runtime = 'C:\Users\jabrassi\.scout-instances\local-test\copilot\session-state\e2e8f1b0-53a4-4784-81a2-ee19461b7b31\files\runtime\node-v22.20.0-win-x64'
$env:PATH = "$runtime;$(Join-Path (Get-Location) 'node_modules\.bin');$env:PATH"
$scope = 'packages\react-components\react-carousel\library\src\components\CarouselNavImageButton'
node "$scope\CarouselNavImageButton.run.cjs" cypress
node "$scope\CarouselNavImageButton.run.cjs" standard
node "$scope\CarouselNavImageButton.run.cjs" cypress 1
node "$scope\CarouselNavImageButton.run.cjs" cypress 2
node "$scope\CarouselNavImageButton.run.cjs" checks
node node_modules\nx\bin\nx.js run carouselnavimagebutton-functional-tests:e2e --skipSync
node node_modules\nx\bin\nx.js run carouselnavimagebutton-functional-tests:type-check --skipSync
```

Every validation run creates a unique ignored `.runner-temp` evidence directory
with raw command logs, source-before/source-after SHA-256 manifests and browser
JUnit or check/unit results. `standard` runs the unchanged library
`cypress.config.ts` and its ordinary support/webpack path with the canonical
`CarouselNavImageButton.cy.tsx` spec. Chrome uses component-owned port 45331;
check that it is free before running and never stop another thread's process.
Round arguments outside 1–3 fail explicitly; all browser runs validate exact
unique JUnit cases, zero failures/errors/skips, matching unique axe evaluations,
positive evaluated rule counts, and zero actual retries. Default round 3 passes
no Cypress environment overrides. Axe and Chromium AX-tree evidence are written
using built-in `cy.writeFile` into unique `audits-*` directories, so ordinary
package execution needs no private tasks or environment variables. CDP
AX-tree/forced-colors controls, decoded local image tests and every existing
functional assertion are retained.

The test-only application is registered at `testing/ci/project.json`, tagged
`vNext`, `platform:web`, `test`, and implicitly depends on `react-carousel`.
Its real `e2e` target invokes `standard`, inheriting the existing root
`scripts-cypress:build` prerequisite; `type-check` also retains that prerequisite.
There is no root component project claiming the fixture/source files, no empty
public `dependsOn` override, and no nested ownership cycle. Entry, fixture and
production-source changes remain owned by `react-carousel` and affect the test
application through its dependency.

Fixtures, native API probes and the JSX bridge live under `testing` with story
names; the real package SWC `/testing` exclusion prevents production emission.
The canonical `.cy.tsx` entry is excluded by the ordinary Cypress SWC patterns
and imports the fixture exactly once. `testing/tsconfig.json` is discoverable
by unchanged package ESLint project service; checks use the package ESLint
configuration rather than parser overrides. Baseline includes retain the same
stable-story dependency closure and relocated JSX bridge.

The standard package run exposed an initialization race in the bidirectional
Tab entry case. It now waits for the real Tabster mover sentinels and settled
carousel geometry before the first trusted Tab; the selected-entry, both exits,
and Shift+Tab assertions are unchanged. This is a readiness precondition, not
a retry or focus substitution.

The shared checkout's root Nx sync currently requests an unrelated formatting
update to `tsconfig.base.json`. Do not edit it here: `--skipSync` above bypasses
only that documented limitation, not the helper prerequisite tasks. Installed
Windows Node, Chrome, Cypress, Jest, ESLint, Prettier and TypeScript are reused
without installs or WSL; runner caches and TEMP/TMP remain component-local.

**Additional registered-run blocker on this Windows checkout:** both registered
targets really invoke `scripts-cypress:build` and its
`eslint-plugin-react-components:build` prerequisite, but the shared
`generate-api` executor constructs an unquoted `tsc -p ... --baseUrl ...`
shell command. The spaces and standalone hyphen in this checkout path produce
`TS5023: Unknown compiler option '-'` before either component target executes.
This unrelated executor is outside the allowed component scope and is not
patched or bypassed. Registered target execution is therefore blocked, not
reported as passing. Root graph discovery, ownership, affected propagation,
and inherited helper task metadata are verified independently; direct and
ordinary package browser validation and scoped tsc do not use that executor.
Do not build shared helper outputs concurrently with browser runs: its clean
step can invalidate the active webpack resources.

### Retained historical evidence

The original `reports/ONLY131-evidence.json` contains earlier counts, per-round success files,
unit suites, baseline comparisons, source hashes and preservation verdict.
Historical `commands.jsonl` retains actual tool arguments and former Nx wrappers. Each original browser
attempt has a log, full Cypress results, summary and raw axe JSONL; the named
metadata case also saves Chromium AX-tree evidence. Earlier failures remain in
their attempt logs/results; failed check diagnostics are archived separately.
Original forced-color screenshots remain under `.cypress-screenshots`; new
screenshots are in each run's evidence directory. Legacy `snapshot`, `preserve`,
and `evidence` modes retain their historical readers and use create-only writes,
refusing to overwrite the original reports. New validation does not modify
those historical artifacts.

Scoped browser/API typing uses the same local React 19/global Fluent JSX bridge
as the prior CardFooter runner. Baseline typing excludes only the new browser
suite/API probes and retains that bridge and the stable-story dependency
closure. Functional-unit typing has its own unchanged-source baseline.
Both current and baseline compilations are identical; all four final
compilations have zero diagnostics. The original unbridged
production diagnostics are preserved in `reports/checks-attempt-1`.

Local Jest configuration reuses the existing transforms, setup and serializers
and corrects only the runner's absolute alias prefix; shared Jest configuration
is not edited. Final units are 54/54 across three suites (14 new functional,
20 existing image-button, 20 existing NavButton). Preservation hashes cover
20,472 existing tracked/untracked files, including target production source and
the original units/snapshots; final head, branch and outside-scope status are
compared without reverting concurrent work.

**Shared-checkout divergence:** the strict all-hashes/head/status verdict is
false, not silently rebased. During this task, shared master advanced from
`50fdaae1a303a8d35a2a61c75778a3ac09a9a586` to
`442c9c79416ca2775969b627d2cf234de2be4675` through concurrent commits
`d493b1dd` (CarouselViewport), `18237c36` (OptionGroup) and `442c9c79` (List).
Six baseline test/documentation files differ; all six match their committed
versions. The other 20,466 hashes, including every original file in the ONLY131
directory, are unchanged. Seven new outside-scope CompoundButton files also
appeared concurrently. These changes are retained and listed in the
preservation/evidence reports; none was authored or reverted by this task.
