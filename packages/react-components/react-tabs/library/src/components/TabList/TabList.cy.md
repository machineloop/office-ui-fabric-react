# TabList browser coverage

This finite inventory follows the Tabs stories, TabList types, hooks, rendering,
styles and unit tests. Tab is read-only prior art and is exercised only as a
TabList context consumer. This is not a claim to exhaust arbitrary inputs.

## Documentation round

- Default unselected state; default selection; controlled selection with and
  without consumer updates; click payload; manual and focus activation.
- All three sizes, four appearances and both orientations, with actual layout,
  typography, circular gaps, hover and selected/unselected styling assertions.
- Icons with text and explicitly named icon-only tabs; list-wide and individual
  disabling; consumer-owned panels with reciprocal ARIA references.
- Both reserveSelectedTabSpace alternatives, hidden reserved content and
  stable width when enabled.

## Edges and accessibility round

- Real keyboard arrows, wrapping, Home/End, Tab/Shift+Tab entry and exit,
  selected reentry, disabled skipping, LTR/RTL and vertical axis behavior.
- Keyboard activation with Enter/Space; focus activation and controlled refusal.
- Dynamic children, reordering, selected removal and restoration, disabling,
  orientation and direction changes; independent lists; naming/descriptions.
- Overflow is consumer composition, not a built-in TabList feature. Test the
  selected controlled value with Overflow/OverflowItem and external selection;
  menu behavior belongs to Menu and is not duplicated here.

## Unit and source round

- Empty and singleton lists; native attributes, event bubbling/latest handlers,
  primary root props/render function, forwarded/composed refs and cleanup.
- Default-state initialization versus subsequent changes; controlled selection;
  primitive and stable object identity selection; registry/current/previous
  selection through the public context hook.
- Context boundaries, design-prop consumption, dynamic supported variants and
  reserved-space propagation.

Selection compares values with strict identity, not JSON equivalence. The
registration map separately uses JSON serialization; fixtures use serializable,
unique values. No implicit selection fallback is promised when the selected tab
is removed. Disabled native buttons omit aria-selected, even if their value
matches the selected value. Panels and their IDs are application-owned; TabList
does not generate aria-controls, panel DOM or panel visibility.

Manual activation is the default: moving focus alone does not select. Automatic
activation is the boolean selectTabOnFocus, not an activationMode prop.
Keyboard assertions use cypress-real-events, not synthetic keydown as a proxy.
No sleeps, skipped cases, retries or exception suppression are used.

The primary root slot is configured through top-level props, not a `root` prop.
Its render function is supplied as `children`; this replaces normal child content,
so that scenario tests the empty customized root rather than inventing a separate
root-slot/tab-children API. Ref composition uses the existing useMergedRefs helper.
The shared mount enables React StrictMode, whose mount-effect replay leaves
current and previous selected values equal initially. Subsequent selection
transitions and unrelated rerenders retain the actual current/previous contract.
Tabster consumes navigation key events before React bubbling handlers; ordinary
keys and focus events still reach the native root handlers. Automatic pointer
activation can report both focus and click; it is not deduplicated.

## Scoped source fix

The design hook previously passed appearance, size and reserveSelectedTabSpace
into the base hook's native-prop rest object. This leaked string design props to
the div and caused React warnings for the boolean design prop. The hook now
consumes those props before passing the base props onward. Browser and unit
regressions verify native attributes remain intact and design attributes do not
leak. Context values and styling still receive all three design props.

## Scoped execution

The package has no inferred e2e target or package-level tsconfig.cy.json.
TabList.cypress.config.cjs follows Divider's repository-relative shared config
pattern, reusing shared support and webpack settings with a component-local
TypeScript configuration and zero retries. No session adapter is required.

From the repository root with its supported Node and installed dependencies:

```powershell
$env:NX_DAEMON = 'false'
$env:WEBPACK_DEV_SERVER_PORT = '18221'
node .yarn\releases\yarn-4.18.0.cjs nx run react-tabs:lint --skipSync --skip-nx-cache --excludeTaskDependencies '--command=yarn run -T cypress run --component --browser electron --config-file src\components\TabList\TabList.cypress.config.cjs'
```

Run scoped prettier, eslint and tsc via the same lint target's command override.
Persistent per-round counts, commands, diagnostics and limitations are recorded
in TabList-evidence.json in the assigned session files directory.
Accessibility coverage uses observable roles, names, relationships and focus,
not axe or screen-reader certification.

## Mutation-derived controlled-value coverage

Four cases exercise controlled `0`, `false`, `''` and `null` values, which the
previous primitive-payload cases exercised only in uncontrolled lists. Each case
uses only `selectedValue`, checks initial falsy identity, refusal to change
selection on clicks without consumer acceptance, exact click callback values and
targets, and external transitions to a truthy value and back without callback
emission. After an external update, clicks use the latest callback rather than
the original handler; repeated selection still reports the exact falsy value.
The truthy tab is an ordinary choice, not a default. These positive controls
distinguish valid falsy controlled state from an uncontrolled fallback.

Independent review corrected the original four fixtures, which combined
`selectedValue` with `defaultSelectedValue` and triggered the development error
for unsupported controlled/uncontrolled props. That combination does not
establish a supported precedence contract. Its earlier mutation evidence is
superseded by a fresh full baseline, controlled-falsy mutant run and restored
baseline using valid controlled props.

The complete browser suite contains 89 cases. Suite type checking has no
TabList-owned diagnostics but remains blocked by two independently reproduced
provider diagnostics: renderFluentProvider.tsx TS2741 at 42:16 and TS7026 at 47:25.
The reproduction used a temporary TabList-local configuration including only
TabList.tsx and the provider entry point, with no browser spec; it was removed.
Component-only source type checking passes. No provider or shared-root edits or
package change file outside the authorized directory are included.
