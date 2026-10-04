# Listbox browser contract

Row 119 adds coverage only in this directory. Existing `Listbox.test.tsx` and
its snapshots are retained; Option, OptionGroup, parent controls, contexts,
shared hooks and shared tooling remain read-only.

## Evidence sources

- Public `Listbox.types.ts`, package exports and `etc/react-combobox.api.md`;
  Listbox hook, renderer, styles and component.
- Package `library/docs/Spec.md`; Dropdown accessibility specification,
  accessibility/best-practice documents and Combobox best practices.
- Default, controlled, grouped, rich/custom options, disabled, multiselect,
  active-option and size stories for Dropdown/Combobox. There are no dedicated
  Listbox stories in this package.
- Listbox, Option, OptionGroup and option-role-matcher unit tests; read-only
  selection, option collection, keyboard actions, Listbox/Combobox context,
  popup/trigger slots, active-descendant controller, DOM walker and scrolling.

The older package specification calls Listbox internal and discourages standalone
usage. Its exported API, component comment, `standalone` state and current unit
tests explicitly implement standalone selection. These tests cover that actual
implementation, without importing popup behavior into standalone Listbox.

## Finite scenario inventory

`Listbox.cy.tsx` contains **82 standard cases**, grouped as follows:

| Group                  | Cases | Observable contracts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation          |    21 | Named native root; single and multiple controlled/default selection; exact ordered callback objects and native event types; rich text/value/children precedence; groups and labels; disabled pointer and keyboard interactions; real arrows/Home/End/Space/Enter; Tab/Shift+Tab; standalone typeahead negative control contrasted with real Dropdown matching; Dropdown/Combobox popup ownership and real typing.                                                                                                                                                                                                                                                                                                                |
| Edges/accessibility    |    27 | Label/description ID relationships; generated option IDs; optional group labels; root ref/native/mouse attributes; root render functions; role/tabindex overrides and filtered internal props; autofocus opt-out and native focus preservation; keyboard focus-visible/blur/refocus; consumer handler ordering and preventDefault semantics; Escape/printable/horizontal keys; disabled selected multiselect; static wrappers and decorative checks; empty values; consumer Griffel and provider style hooks; light/dark backgrounds; LTR/RTL check/text geometry; constrained scrolling; inline/portaled popup refs/ownership; Field and explicit popup names; all three parent sizes without invented option size inheritance. |
| Unit-derived/lifecycle |    34 | PageUp/PageDown endpoints with 20 options; Alt+Up; selected-key array order and duplicate-value registration; unmatched keys; disabled initial active selection; default-prop and controlled-selection rerenders; keyed DOM reorder; inactive/active removal, selection-preserving readdition and empty/lazy options; changed text/value/ID/disabled registration; sibling isolation and nested-context pointer characterization; latest selection/native callbacks; recomposed clearSelection; ref cleanup/remount; live count/ID/text/value collection queries and cleanup; multiselect Tab; multiselect Dropdown/Combobox toggles and Escape.                                                                                 |

Controlled fixtures supply `selectedOptions` without `defaultSelectedOptions`.
Uncontrolled fixtures use only defaults. Parent defaults pair selected keys with
`defaultValue`, while standalone Listbox has no display-value prop.

## Important implementation boundaries

- Single selection uses `listbox`/`option` and `aria-selected`.
  Multiple selection intentionally uses `menu`/`menuitemcheckbox` and
  `aria-checked`, not `aria-multiselectable`. This is documented in the package
  semantic-structure section and supported by existing units.
- Auto-initialization sets an active descendant, not native browser focus.
  `disableAutoFocus` suppresses only that mount initialization. Navigation
  retains root focus and does not change selection until a select action.
- Disabled options remain keyboard navigable but do not select or invoke
  consumer Option onClick. An already selected disabled option stays selected.
- Standalone has no typeahead handler, open state, Escape dismissal or Tab
  selection. PageUp/PageDown go to first/last, unlike the parent trigger's
  ten-option paging. Enter, Space and Alt+Up select without hiding the list.
- Consumer root keydown runs before internal navigation. Calling preventDefault
  there does not cancel the composed selection handler.
- Option values identify selection; explicit `text` supplies rich-option callback
  text. Empty string is a valid value. Duplicate values select multiple matching
  DOM options; initialization uses the last registered match. Unmatched controlled
  keys do not synthesize an active descendant.
- Native root attributes and a forwarded div ref are retained by root render
  functions. Listbox has no separate `root` shorthand or `size` prop.
  Parent size variants do not change Option typography or Listbox padding.
- Standalone siblings own separate registries/controllers/selections. A nested
  Listbox sees inherited Listbox and active-descendant contexts: its pointer
  selection uses the outer callback, not local controlled props. That test is a
  source characterization, **not an endorsement of accessible nested listboxes**
  or a promise of independent nested state.
- Dropdown and Combobox own popup state, trigger focus/active descendants and
  display values. Their Listbox slots share parent registration/selection,
  have no tab stop, and preserve trigger focus on pointer selection. Portal
  ownership is on the parent wrapper, not the trigger or Listbox. Inline popups
  use DOM containment and do not need `aria-owns`.
- Default selection is mount-only. Controlled selection changes do not
  automatically move the last active descendant. Reorder follows current DOM
  order; removed registrations cannot produce stale selection payloads.
  Removal/readdition retains selection by value, not DOM node identity.
- Scrolling checks actual option bounds after End/Home. The shared scroll helper
  has a two-pixel buffer, so returning to the first option does not promise
  `scrollTop === 0`.

## Retained inherited defect

`Listbox.defects.cy.tsx` contains **four intentionally failing correctness probes**,
not skipped tests or passing assertions for broken behavior. All four first prove
the active ID references a live Option, then remove it using a real button click.
The two original single-list probes are retained unweakened; two additional
probes cover supported multiselect `menu`/`menuitemcheckbox` semantics separately.
They require the resulting active ID to be absent or reference a remaining live
descendant. Current source leaves the removed ID in `aria-activedescendant`, for
both nonempty and empty remaining lists.

The collection unregisters the Option, but the active-descendant controller
does not observe removal or clear the root attribute. Listbox's initialization
effect runs only once. Later ArrowDown/Home can recover; the positive contract
suite tests that recovery separately and does not claim the intervening ARIA
relationship is valid. No source fix or weakened defect expectation is included.

Four clearly named `KNOWN BUG characterization only` standard cases assert the
exact removed ID remains stale (single/multiple selection, empty/nonempty).
These passing observations are **not endorsements or correctness requirements**;
the opt-in defect suite asserts the opposite nominal accessibility invariant.
Selection payload correctness is independent of ARIA reference correctness:
unregistering prevents old payloads even while the root reference is invalid.

The shared local assertion helper is exercised on initially live targets in both
suites, on absent attributes after explicit consumer cleanup using the supported
recomposed `activeDescendantController.blur()`, and on actual stale targets in
the intentionally red suite. No production mutation or direct attribute edit
is used. Inactive removal retains the other live active ID and passes the same
helper without a false alarm. Same-ID readdition proves a new connected DOM node,
then selects it immediately through the retained controller before testing
navigation and exact callbacks again.

## Validation and limits

Use the existing `react-combobox:e2e` Nx target with `**/Listbox.cy.tsx` for the
82-case standard suite, and explicitly opt in to `**/Listbox.defects.cy.tsx`
only for the four expected failures. Run the full standard suite twice.
Do not use `**/Listbox*.cy.tsx` or `**/*.cy.tsx` as a green Listbox baseline:
those broader patterns also include the deliberately red defect file.
Report **82 standard passes plus four sensitive defect failures, BUGUNFIXED**,
never that all supported functional behavior is correct.
No Cypress retries, sleeps, exception suppression, snapshots as functional
coverage, skip/only markers or shared configuration edits are added.

`Listbox.cy.tsconfig.json` isolates these files without weakening inherited
compiler settings. `Listbox.cy-baseline.tsconfig.json` excludes the new suites
and checks production Combobox and FluentProvider exports. Both reproduce the
same two existing FluentProvider renderer diagnostics (TS2741 at 42:16 and
TS7026 at 47:25), with zero diagnostics in the new files. The broader package
Cypress check additionally reports existing sibling renderer diagnostics; it
is not represented as a clean package-wide type check.

Exact case titles, rounds, commands, counts, exit codes, failures/corrections,
source hashes, source inventories, baseline diagnostics and screenshots are in
the session's `coverage101-120/Listbox-evidence.json` and referenced logs.
The authoritative exact standard filename is `Listbox.cy.tsx`; the separate
intentionally red filename is `Listbox.defects.cy.tsx`. With the recorded
`Listbox-run.ps1` runner, explicit commands are:

```powershell
& .\Listbox-run.ps1 -Name followup-standard-final-1 -Kind cypress -Spec '**/Listbox.cy.tsx'
& .\Listbox-run.ps1 -Name followup-standard-2 -Kind cypress -Spec '**/Listbox.cy.tsx'
& .\Listbox-run.ps1 -Name followup-defects -Kind cypress -Spec '**/Listbox.defects.cy.tsx'
```

The isolated runner uses port 18241 and external artifact folders, not shared
progress ledgers or repository output directories.

This is finite browser/source/unit coverage, not exhaustive inputs, actual
screen-reader speech, cross-browser certification, contrast auditing, forced
colors/OS high-contrast certification or virtualized-option coverage.
