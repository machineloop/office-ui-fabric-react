# TagPickerButton functional coverage (row 136)

This component-local suite uses the actual Windows shared-checkout sources, including concurrent TagPickerGroup and TagPickerInput changes. The parent completed initial review, added direct Tabster Escape-ignore state assertions, and completed fresh repeated review with no additional findings. No production source, exports, existing units, snapshots, stable story, shared configuration or dependency manifest is changed.

## Discovery and commands

`TagPickerButton.cy.tsx` contains one import. It is discovered by the ordinary package `**/*.cy.tsx` glob. Fixtures, the React 19 JSX bridge and API type probes are in `testing/*.stories.*`, excluded by the actual production TypeScript stories patterns and package SWC `/testing` exclusion. `testing/tsconfig.json` is discoverable by the unchanged parent ESLint project service.

Run from the repository root:

```powershell
$runner = 'packages\react-components\react-tag-picker\library\src\components\TagPickerButton\TagPickerButton.run.cjs'
node $runner cypress 1 final
node $runner cypress 2 final
node $runner cypress 3 final
node $runner checks 3 final
node $runner units 3 final
node $runner isolation 3 final
node $runner invalid 3 final
node $runner preserve 3 final
```

For ordinary ESM configuration and Nx, invoke the same runner with the installed Node 22 executable:

```powershell
$node22 = 'C:\Users\jabrassi\.scout-instances\local-test\copilot\session-state\e2e8f1b0-53a4-4784-81a2-ee19461b7b31\files\runtime\node-v22.20.0-win-x64\node.exe'
& $node22 $runner standard 3 final
& $node22 $runner discovery 3 final
& $node22 $runner registered 3 final
& $node22 $runner sync 3 final
& $node22 $runner seal 3 final
```

The default invocation runs all 96 cases, round 3, without private evidence/environment/task dependencies. Only earlier rounds use `coverageRound`. Unknown modes, non-exact round values, bad labels and extra arguments fail before tools run. Chrome runs with retries zero. Port 46136 is checked for availability; another owner's process is never killed. Child Node PATH, temporary directories and Nx caches are component-owned.

The nested `tagpickerbutton-functional-tests` application has `vNext`, `platform:web`, `test` tags and implicit `react-tag-picker` ownership. Its ordinary-config e2e and type-check targets retain the real `scripts-cypress:build` prerequisite and inherited target defaults. Production-source, fixture-only and canonical-entry affected discovery and actual file-map ownership are verified, together with dependency-cycle rejection.

Cold registered Nx execution is **not green** in this shared checkout: shared generate-api commands do not quote the OneDrive Windows root and fail with TS5023, unknown compiler option `'-'`. Root synchronization is checked and export-map synchronization is dry-run only; no outside formatting or helper/dependency bypass is applied. Direct/ordinary Chrome execution uses already installed helper outputs, not a claim of cold CI readiness.

## Source inventory and traceability

| Source                                                                                                                                                                      | Exercised contracts                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Six original production modules (including local index), package index and public button facade                                                                             | Native button slot, flattened native props, full/base hook/style/render compositions, ref element identity and unmount null, render callbacks, public negative type probes                     |
| Original `TagPickerButton.test.tsx`, `useTagPickerButton.test.tsx`, snapshot and package conformance helper                                                                 | Original conformance, snapshot, default type, context size/selection/controls/value/legacy placeholder; unchanged scoped Jest preset, transforms, setup and serializer; 22 tests in two suites |
| TagPicker context, root hook/render/context values, Control/Group/List/Option/Input hooks/render/types/styles, selection and active-descendant infrastructure               | Actual context ownership, generated IDs, portaled and inline lists, expansion, selected tag dismissal, controlled/uncontrolled state, reset/refusal and current callback identity              |
| Combobox `useButtonTriggerSlot`, `useTriggerSlot`, dropdown key actions, `useSelection`, `useComboboxBaseState`, `useListboxSlot`, `useOption`; ARIA button props/shorthand | Trusted CDP pointer/keyboard events, callback ordering and exact original-event identity, native default actions versus absent ARIA-button normalization                                       |
| Stable `TagPickerButton.stories.tsx` and all TagPicker story scenarios/index, README, Spec/docs/Spec, description, accessibility and best practices                         | Unpatched consuming Button story; named compound fixtures for sizes, appearances, disabled, filtering, grouping, expand/secondary slots, selection and no-popover scenarios                    |
| TagPickerButton/Control styles, FluentProvider, custom-style context and ID prefix provider                                                                                 | Actual computed typography, clipping, hover/focus indicator, RTL, dark theme contrast and real CDP forced-colors media                                                                         |

Round 1 has **29 cases**: standalone and real compound button behavior; ARIA/list ownership; Up/Down/Home/End/Page bounds; Escape/Tab/Shift+Tab/Enter/Space; native option/pointer focus restoration; default/controlled open; controlled/uncontrolled/refused selection; disable behavior; type-ahead; default icon and stable story.

Round 2 adds **30 cases** (59 cumulative): context content and design-prop precedence; selected clipping/reset; public full/base compositions; object/callback refs and latest closures; prevention/order characterizations; filtering/grouping/search timeout/no-match/modifier handling; explicit label/description/native props/styles; custom provider style hook and native form button/submit/reset/disabled behavior.

Round 3 adds **37 cases** (96 cumulative): all control appearances; hover/native Tab indicator; RTL/dark/forced colors; merged refs/render callbacks; accepted-but-ignored size and Field behavior; prefix/two-instance/custom-ID ownership; custom/null expand and secondary slots; disabled combinations; mixed Input/Button negative composition; tag dismissal/navigation; auto-focus/empty lists/Alt+Up/Backspace; portals/listeners/type-ahead cleanup and remount/reset; strict finding-profile negative guards; legacy placeholder/undefined type; no-popover; missing selection semantics; prevention/disabled default-open/capture and Escape propagation.

## Explicit source findings and limits

The first adversarial review identified missing direct coverage of the bespoke
Tabster Escape-ignore wiring. The existing Escape propagation case now also
parses the emitted `data-tabster` attribute and requires
`focusable.ignoreKeydown.Escape` to transition false/true/false across
closed/open/closed states. This tests the source hook's actual wire-up,
independently of React-level propagation checks, without adding a case.

Fresh optional-round execution also exposed a transient sentinel-order scan
after adding the second tag: the last Tabster dummy still preceded that tag.
Before running axe, selected-tag audits now await the statically expected tag
count and both first/last dummy positions in the actual mover. No node is moved,
no fixed sleep or automatic retry is added, and the exact finding shape remains
unchanged. The failed receipt is retained rather than treated as approval.

Implementation seals describe browser evidence, not parent review or commit
authorization: `parentReviewsPerformed` and `committed` remain false in their
implementation-only metadata. `cleanAccessibility: false` and
`coldNxGreen: false` are deliberate limitations, not satisfied gates. The
aggregate source digest is the explicit `sourceManifestSHA256` field in each
seal; it is not the hash of the entire pretty-printed JSON receipt.

- Enter and Alt+Up select without closing the multiselect popup; the older Spec's Enter-close/menu roles are not the current source behavior.
- Picker-level disabled rejects open requests but does not set native button disabled. `aria-disabled` alone does not suppress activation. Disabled plus defaultOpen can still select through the enabled button. `disabledFocusable`, icon and placeholder are not supported public props; the latter has a legacy runtime fallback. No useARIAButtonProps behavior is invented for this hook.
- Button appearance/size props are accepted but ignored; size comes from picker context. Button does not inherit Field labels/descriptions. Explicit `type={undefined}` removes the default button type and permits native submit, unlike an omitted type. Enter is consumed by the trigger even for a native submit button.
- The source clears both selection-state ARIA attributes from TagPickerOption. Tests assert actual selection callbacks/tags rather than pretend the list announces `aria-selected`.
- Selected TagPickerGroup creates two tabbable, aria-hidden Tabster mover sentinels. Final audits strictly expect the exact `aria-hidden-focus` node/check/target/severity/related-node shape only for statically registered selected-tag cases. This is **not clean accessibility**.
- An empty list has an exact `aria-required-children` incomplete result with `['group', 'option']`, not a blanket incomplete allowance. All other incompletes are rejected.
- Open noPopover button has dangling `aria-controls`. A custom list ID with an explicit matching button controls prop still leaves the Control's generated `aria-owns` dangling. Intermediate full default axe receipts preserve and narrowly assert these critical `aria-valid-attr-value` findings; those cases close before their final audit.
- An unusual Input plus Button composition shares expansion but the last mounted input owns active descendants and option-click focus restoration. This is explicitly characterized, not recommended as a second supported trigger.
- Native Chrome cannot establish Narrator, VoiceOver/Safari/iOS announcements. The documented assistive-technology limits remain unverified. No production fixes or broad known-negative suppressions are introduced.
- Cleanup checks prove actual portal removal, null/replaced refs, new registered IDs, latest closures, timeout isolation and exact owned list active-descendant listener removal. They do not assert global Tabster/provider document listeners must disappear while the provider remains mounted.

## Receipts and preservation

Every registered case has a final full default `axe.run` over the nonempty real fixture plus its actual portals, with nonempty passes and strict violation/incomplete profiles. Raw results are written with builtin `cy.writeFile`; no custom Node tasks are required. Native command and original-event receipts are retained. The unchanged stable story is imported, not relabeled or patched.

Final fixture readiness and the complete strict audit verdict now run in each
scenario body, after the original listener restoration and before any subsequent
case. This keeps an ownership or axe regression attached to its testcase rather
than aborting the suite from `afterEach`. All 96 titles, selected-tag readiness,
exact mover/empty-list profiles, adversarial probes and intermediate critical
finding checks remain unchanged.

Operational `afterEach` still restores listeners. If an actual Mocha-failed case
never started its final scan, it collects and persists one genuine full-scope
raw diagnostic, marked `failedCaseDiagnostic: true`, without asserting a passing
accessibility verdict or waiting for the failed case's planned selected-tag
shape. Successful cases always perform the original strict body audit. An
already-started scan is never repeated, including after acquisition, persistence
or verdict failure. Diagnostics are not validated audits or accessibility passes;
transport and write failures still surface, with no catches, fabricated ledger
entries or policy allowances.

The isolated ownership trial then executed all 96 cases without skips, with 36
assertion failures and one missing-IDREF `startsWith` TypeError in the prefix
provider case. That case now requires one trigger and nonempty string,
single-token controls/active-descendant IDREFs before prefix and DOM reads.
Its original namespace, unique-target and containment checks remain unchanged.

`.evidence/<mode>-r<round>-<label>-<timestamp>-<pid>/` holds exact commands, raw logs/JUnit and recursive owned/production before/after SHA-256 manifests. `.evidence/audits-*/` holds authored registration manifest, every complete default axe result and the two intermediate critical findings. Failed runs remain archived. Final JUnit names, suite/root counters, unique authored titles and one audit per case must agree, with zero errors/skips/pending/retries. The seal selects only final receipts bound to the current recursive source manifest and hashes receipt files.

The entry baseline includes original component bytes, units/snapshot, tag-picker/combobox/ARIA/utilities sources, shared helpers/configuration/manifests and existing tracked dirty files; initial untracked state is recorded by status. Every verification additionally hashes outside untracked files before and after. Preservation reports separate original-owned changes from concurrent outside byte, HEAD or status changes; none is reverted or staged. Review and a separate component commit belong to the parent.
