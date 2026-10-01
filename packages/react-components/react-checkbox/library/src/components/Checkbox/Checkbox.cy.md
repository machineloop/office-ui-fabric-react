# Checkbox browser contract coverage

Run from the library using the existing Nx run-commands target:

```sh
yarn nx run react-checkbox:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T cypress run --component --browser electron --project . --config-file src/components/Checkbox/cypress.config.cjs"
```

The component-local configuration is portable, uses the existing Cypress support,
and accepts `WEBPACK_DEV_SERVER_PORT` (default 18221). Type checking uses
`tsc -p src/components/Checkbox/tsconfig.cy.json`; lint and formatting use existing
Nx tooling. No dependencies or shared configuration were changed.

The suite covers the finite story/type/source/unit inventory: false/true/mixed
controlled and uncontrolled states, native payloads and latest handlers, all
size/shape/placement variants, wrapping and RTL geometry, slots and refs, native
forms and keyboard/pointer behavior, Field and browser accessibility-tree
relationships, theme tokens, hover/pressed/focus and forced colors.

## Defects corrected

Native form reset previously reset the native checked property without updating
the React state or visual indicator; mixed state was not restored. Reset now
restores the initial uncontrolled value or preserves the current controlled
value. Synchronization occurs in a microtask after the cancelable native reset
default action. It does not emit change events, affect native siblings, or
respond to unrelated forms. Document capture follows the input's current form
owner, including external ownership, and is removed on cleanup. Canceled resets
and stopped propagation are covered by regressions.

The document capture listener is stable for the mounted instance. Its queued
correction uses `useEventCallback` to read the latest committed checked state and
controlled ownership, rather than tying listener cleanup to state changes.
Same-tick controlled updates and native uncontrolled state updates cannot cancel
a pending reset. Actual unmount still cancels queued work, removes the identical
listener, and prevents detached-input writes or callbacks. The live form owner
is checked at dispatch and correction, so reassignment cannot apply a former
owner's pending reset. Deterministic regressions use public `flushSync`, native
reset/activation and capture-listener spies; no React internals or timing delays.
There is one document reset listener per mounted Checkbox (linear per-instance
listener/dispatch scaling), not a shared registry.

DOM ownership uses a stable `React.useRef` composed with the selected public ref
through `useMergedRefs`. Changing inline forwarded or input-slot callback refs
receives the actual detach/attach notifications without recreating the reset
listener or canceling pending correction. The listener reads the current owned
node at dispatch and checks its identity again before correction. Supported root
render functions can replace the input subtree: the new node is synchronized on
every layout commit, and queued work for the detached node is discarded. Input
`as` is restricted to `input`; no arbitrary non-input target is claimed.

Native activation also clears `indeterminate` when a controlled mixed value
remains unchanged. The change handler now restores that property, while emitting
the native activation payload before restoration. Updating controlled consumers
still determine the next value normally.

## Lifecycle correction validation

- Complete Cypress suite: 87 passed, 0 failed, pending or skipped.
- Complete unit suite: 65 passed, 0 failed; all 5 snapshots passed.
- Six browser and six unit lifecycle regressions added to the prior 72/50 cases.
- Nine additional browser and nine unit owned-ref regressions cover all three
  controlled values with changing inline forwarded and input-slot refs, pending
  uncontrolled reset with default-prop updates, and replacement input nodes.
  Exact capture-listener identity/counts and actual ref notifications remain
  asserted, including StrictMode mount/replacement replay and true unmount.
  Setter spies (units) and opposing detached property sentinels (browser) verify
  that queued unmount/replacement correction makes no stale writes.
- Owned-ref negative control: all nine targeted units fail against the prior
  callback-dependent effect (six listener-churn cases, two dropped uncontrolled
  resets, one unsynchronized replacement input); 56 units unselected.
  The stable owned-ref implementation was restored before complete validation.
- Dependency-churn negative control: 4 targeted units failed (three listener
  identity cases and the uncontrolled reset/state-update case), 2 passed,
  50 unselected; the mount-lifetime dependency fix was restored afterward.
- Initial browser runs passed 73/77 and 74/78 with four listener-count failures
  each: the shared mount helper's StrictMode effect replay was not accounted for.
  Capture spies now assert both mount registrations and the matching replay
  cleanup, no further registration/removal on updates, and removal of the active
  listener on real unmount. Exact identity/count checks remain.
- First owned-ref browser run passed 78/87: all nine new cases initially omitted
  React StrictMode callback-ref replay notifications. Assertions now include the
  exact initial and replacement detach/attach sequences, without relaxing counts
  or hiding unexpected callbacks. First targeted replacement unit used a render
  function as shorthand rather than the supported `root.children` API; corrected.
- Initial owned-ref type checks found untyped root render callback arguments;
  explicit public `SlotRenderFunction` types resolve them without casts.
- Package ESLint and formatting checks and unit-spec types pass. Library and
  browser types remain blocked solely by the two independently recorded
  pre-existing FluentProvider TS2741/TS7026 diagnostics; zero own diagnostics.
- Exact commands, log hashes, historical rounds and retry dispositions are in
  the session's `Checkbox-evidence.json`; no automatic Cypress retries.

## Supported boundaries and documentation discrepancies

- `disabledFocusable` is not a Checkbox prop. Only native `disabled` is tested.
- Native `readOnly` does not suppress checkbox activation.
- Input slot ref overrides the forwarded ref; its internal indeterminate ref
  remains functional. Root, indicator and Label render functions are supported;
  input children/render functions are excluded by the public input slot type.
- Removing both visual slots collapses intrinsic height. Consumers replacing
  both must supply geometry; the null-slot test supplies an explicit minimum
  height rather than forcing a click on a zero-height control.
- The accessibility MDX incorrectly says Field does not set `aria-invalid` and
  mixed activation emits false. Actual source/units/browser behavior sets
  `aria-invalid` and emits true on mixed activation. Those out-of-directory
  documentation discrepancies are reported, not copied into tests.
- This suite uses Electron/Chromium and CDP accessibility/media emulation, not
  real screen readers or native Windows contrast theme screenshots. It does not
  claim every arbitrary consumer slot override or infinite input combination.
- Published-source change-file creation is outside the authorized component-only
  scope; release integration must add the change file separately.
