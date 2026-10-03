# Breadcrumb browser coverage

Scope: the Breadcrumb root, list slot, size context, navigation group and
consumer-composed trail. BreadcrumbItem, BreadcrumbButton, BreadcrumbDivider,
Menu, Overflow and Tooltip are read-only integration dependencies, not repeated
standalone component audits. The two original `Breadcrumb.cy.tsx` cases and both
original `BreadcrumbWithMenu.cy.tsx` cases remain intact.

## Finite supported inventory

| Surface                | Inventory and observable checks                                                                                                                                                                                        | Authority                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Root semantics         | Native `nav`, default `breadcrumb` label, explicit label, labelledby precedence, computed accessible names, no invented root button, tab stop or live region                                                           | Spec, API, base hook                   |
| Structure              | Native `ol`, explicit list role, item `li` children, hidden separator `li` and decorative SVG, empty/singleton/passive text trails                                                                                     | Spec, renderer, unit snapshots         |
| Current page           | Consumer-owned item `aria-current`; BreadcrumbButton current-page and disabled attributes; no automatic last-child inference; updated current item after child replacement                                             | Spec, stories, button integration      |
| Size                   | All three supported sizes, default medium, button height, icon width, divider size, item flex layout; live small-to-large and large-to-default changes                                                                 | API, size story, context/style hooks   |
| Appearance             | Actual subtle transparent default; current descendants are nonactivating; list flex/reset styling and consumer token class precedence                                                                                  | Button and Breadcrumb styles           |
| Tab focus              | Original case, forward/reverse order, disabled skipping, current focusability, links, release at both ends, no arrow mover in tab mode                                                                                 | API and existing Cypress cases         |
| Arrow focus            | Original circular case, reverse wrapping, horizontal-only mover, disabled skipping, group Tab exit, remembered reentry, physical LTR/RTL keys, live mode switching                                                     | API and a11y hook                      |
| Activation             | Real Enter, Space and pointer actions with exact counts; consumer navigation, child/root preventDefault, stopPropagation and bubbling order; latest root/list/child closures                                           | Spec and intrinsic/button handling     |
| Native props           | Root id/title/lang/data/className, list id/title/start/reversed/name/className, supported role overrides; size/focusMode do not leak to DOM                                                                            | API, intrinsic prop filtering          |
| Refs                   | Distinct root/list object refs, callback refs on mount and unmount, list ref clearing/restoration on null-to-present slot lifecycle                                                                                    | Unit conformance, slots                |
| Render functions       | Root function retains generated list/context; list function retains children, ref, role and classes; list shorthand children are replaced by root children                                                             | Slot API and renderer                  |
| Optional list          | `list={null}` removes list and children; later remount restores refs/default context; root remains                                                                                                                     | Base hook and renderer                 |
| Context boundaries     | Nested, adjacent and outside size defaults; context restoration; nested dark/light providers do not leak theme values                                                                                                  | Context hooks and provider integration |
| Dynamic children       | Keyed removal/insertion/current-page replacement with real arrow focus on surviving/new targets                                                                                                                        | Renderer and navigation group          |
| Direction/layout       | LTR/RTL item order and nonzero layout for every ordinary item; no automatic collapse in Breadcrumb alone                                                                                                               | List styles and provider               |
| Static overflow        | Partner `partitionBreadcrumbItems` recipe with three visible/two hidden items, button trigger, listitem wrapper, exact hidden names/count                                                                              | Overflow story and utility             |
| Responsive overflow    | Partner-owned width change, Overflow/OverflowItem/OverflowDivider, last-item priority; wide five-visible/no trigger, narrow two-visible/three-hidden, restored wide; exact item/group callback payloads in LTR and RTL | Overflow story and Overflow API        |
| Menu interaction       | Enter/Space/ArrowDown opening, first hidden item focus, ArrowDown selection, exact navigation count, Escape restoration, open/close callback payloads and actual trigger ARIA                                          | Story and read-only Menu hooks         |
| Controlled composition | Reject then accept controlled menu open requests without combining controlled/default props; exact callback open/type values; Escape closes and restores focus                                                         | Menu API                               |
| Tooltip composition    | Partner-truncated long name, full label tooltip on keyboard focus, computed full accessible name                                                                                                                       | Tooltip story and truncation utility   |
| Overrides/boundaries   | Explicit empty label remains unnamed; explicit data-tabster wins over generated arrow configuration                                                                                                                    | Base/full hook spread order            |

## Characterizations and documentation discrepancies

- **Inherited link keyboard semantics:** a BreadcrumbButton with a nonempty href
  renders an anchor with native link semantics but `useARIAButtonProps` synthesizes
  activation on Space as well as Enter. The suite explicitly characterizes this
  behavior against a plain anchor inside the same Breadcrumb: Space activates the
  former once and never activates the latter. This is not asserted to be ideal
  native-link accessibility. The initial contrary assertion and its failure are
  retained in session evidence. No production or sibling fix was made.
- The icon slot uses the underlying Button's `fui-Button__icon` class. The exported
  BreadcrumbButton icon-class constant is not installed on that slot. Coverage
  uses the actual DOM class; it does not change sibling class behavior.
- `Spec.md`/README examples mention `BreadcrumbItem current`; current is actually
  a BreadcrumbButton prop. A passive item can instead receive native
  `aria-current="page"`. Migration prose includes stale APIs; runtime types/source
  govern the supported surface.
- MenuTrigger omits `aria-expanded` while closed for a top-level menu and sets it
  to `true` while open. Escape originates from `menuPopoverKeyDown`. Assertions
  follow the actual read-only Menu API/source rather than inventing a false
  attribute or callback origin.
- **Supported literal element types:** `BreadcrumbSlots.root` is `Slot<'nav'>`
  and `list` is `Slot<'ol'>`. `Slot` defaults its alternate-element parameter to
  `never`, so literal root `as="div"` and list `as="ul"` are not public supported
  values. The browser suite explicitly uses `as="nav"` and `list={{ as: 'ol' }}`
  and checks native attributes, distinct refs, generated/consumer classes and
  children. Existing typed root/list render-function cases remain covered.
  No unsupported literal, type cast or production type expansion is introduced.
- **Exact menu callback contract:** ArrowDown opens with `menuTriggerKeyDown`
  and `keyboard: true`. Enter and Space activate the native Button and open with
  `menuTriggerClick` and `keyboard: false`; `openedWithKeyboardRef` is initialized
  false and is not set by these trigger keys. Escape closes with
  `menuPopoverKeyDown` and `keyboard: true`. Each LTR/RTL key case checks exactly
  one open and one close request, full data shape, callback/data event identity,
  actual click/keydown origin, first-item focus and restored trigger focus.
  The deprecated `keyboard` field is characterized as emitted data, not used to
  infer whether the real user pressed a key.
- **RTL overflow interaction:** both directions exercise the actual partitioned
  recipe's three opening keys and Escape, plus responsive narrow/wide keyboard
  opening/closing. Keyboard and pointer link selection each call consumer
  navigation exactly once with index `2`, close with `menuItemClick`, preserve
  callback/data event identity and restore focus. The fixture prevents default:
  "navigation" means the consumer callback, not a completed browser page load.
  Pointer dismissal emits `keyboard: false`; Enter dismissal emits `true`.
- Empty/singleton trails explicitly contain no anchors, buttons, generated
  tab stops, live regions or current-page inference. Passive text is not
  given invented keyboard activation behavior.
- Explicit empty labels and explicit data-tabster overrides are consumer-owned
  accessibility escape hatches, not recommended named/arrow-navigation recipes.

## Execution and limitations

Rounds are documentation, edges/accessibility, source/unit-derived additions,
then a final run of exactly `Breadcrumb.cy.tsx` and `BreadcrumbWithMenu.cy.tsx`.
The overflow fixtures live in the assigned spec, not extra Cypress specs. Run through the existing
`react-breadcrumb:e2e` Nx target with the read-only session adapter, Electron and
webpack port 18241. Session environment variables select the repository, library,
exact specs and artifact locations; repository config/manifests remain unchanged.

Lint uses the unmodified package configuration and rules. Formatting targets
only `Breadcrumb.cy.tsx`, `Breadcrumb.cy.styles.ts` and these notes. Current type
validation uses the existing package-wired `library/tsconfig.cy.json`, which
includes the real Cypress specs and their imported styles, without relaxing
strictness or suppressing diagnostics. From the repository root, run:

```powershell
node .yarn\releases\yarn-4.18.0.cjs nx run react-breadcrumb:lint --skipSync --skip-nx-cache --excludeTaskDependencies "--command=yarn run -T tsc -p tsconfig.cy.json --noEmit --incremental false --pretty false"
```

The two untracked row-103 scratch diagnostic configs were not CI-wired. Exact
copies of `Breadcrumb.cy.tsconfig.json` and `Breadcrumb.cy-baseline.tsconfig.json`
are archived outside the repository in
`coverage101-120\Breadcrumb\diagnostic-config-history`; both repository copies
were removed from pending changes after ownership/hash verification. Their
historical run commands remain unchanged in evidence, marked as history using
archived configs, not future execution instructions. The independent baseline
log remains recorded and is not rerun through deleted paths.

Results, exact case titles, commands, counts, failure
dispositions, source hashes and baseline DOM attributes are in
`coverage101-120\Breadcrumb-evidence.json`.

Row 103 follow-up: **64/64 browser cases** (62 in Breadcrumb, two preserved
WithMenu cases), up from 57; **109/109 existing package unit cases** across six
suites. All four coverage findings above are resolved. Lint and formatting pass.
Own-suite and package type checks reproduce exactly the isolated baseline's
three FluentProvider/Tooltip diagnostics, with no new diagnostics; global type
success is not claimed. The final pending repository files are
`Breadcrumb.cy.tsx` (modified), `Breadcrumb.cy.md` (new) and
`Breadcrumb.cy.styles.ts` (new); no diagnostic configs remain pending.
The coverage follow-up changed only the spec and these notes; the styles helper
was added during the original coverage work. Cleanup makes no production/sibling edits,
commits, agent calls or next-component changes. The initial follow-up passive
root assertion's Chai subject error is retained in evidence and corrected with
separate per-element attribute assertions, not a component change.

Breadcrumb has no selection/open/overflow state props of its own, no root
appearance variants, no native root-button API, and no automatic resize,
truncation or navigation callback. These are partner/sibling concerns exercised
only through supported composition. Focus retention after removing the focused
element, arbitrary invalid markup, every possible custom role/style/child, all
overflow utility inputs, touch/mobile engines, AT speech and universal browser
behavior are not claimed. Accessible names are computed from the real DOM;
this is not a screen-reader speech test or a substitute for an external audit.
No snapshots count as functional browser coverage, and no sleeps, test retries,
skip/only, exception suppression or production changes are used.
