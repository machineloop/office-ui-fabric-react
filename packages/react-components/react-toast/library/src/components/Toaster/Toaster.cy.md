# Toaster browser coverage

The suite covers documented compositions, browser interaction boundaries and
unit-informed lifecycle contracts. Production repairs preserve independent pause
sources, native callbacks, partial updates and dismissal cleanup.

## Grounding

The v9 package-local `react-toast/stories/src/Toast` stories document Toaster
defaults, six positions, offsets, inline/custom mounting, limits, multiple
toasters, controller dispatch/update/dismiss/pause/play, focus shortcuts, timing,
hover/window blur and lifecycle. The existing `Toast/Toast.cy.tsx` is untouched.

Root props/render/styles, `useToaster`, vanilla `createToaster`,
ToastContainer/Timer/AriaLive hooks and their units ground the observable
integration assertions. The fixture uses the actual public controller rather
than recreating its queue, timers, event bus, priority ordering or focus logic.
Imperative dispatch waits for the fixture's initial render; real pointer state
is reset outside before dispatch so recreated toasts do not inherit a stationary
hover from the previous case. The remount fixture exposes committed mounting
state before dispatching again.

18 documented scenarios pass in Chrome (`48-Toaster-round1c.log`). The current
suite adds native RTL/LTR keyboard and pointer, CSS animation timing, live
callbacks/offsets/native props, focus suppression of announcements, controller
routing/cleanup, immutable style overrides and adversarial regressions.

The prior browser run was **58/58 passing in Chrome**, with zero retries, pending
or skipped cases (`48-Toaster-final-c.log`). Source TypeScript is clean with zero
diagnostics (`48-Toaster-final-tsc.log`). All 16 toast package unit suites pass:
229/229 tests and 8/8 snapshots (`48-Toaster-jest-final.log`).

## Repaired scenarios and regression contracts

The final gate adds two scenarios (60 total): announcement suppression spans
existing and newly mounted positions of the same Toaster, remains suppressed
through position-to-position focus transfer, and recovers after outside focus.
An independent instance sharing controller routing still announces. The hook
checks actual focus in the position's owning document against the private
instance scope, rather than per-position event state. Native callback assertions
do not claim screen-reader certification.

A directly coupled preservation scenario brings the suite to 61: custom
`mountNode` may be inside a shadow tree, where `document.activeElement` is the
host rather than the focused toast action. Focus is read from the position's
own document or shadow root. Same-position and newly mounted cross-position
announcements remain suppressed until outside focus, with actual DOM focus
and callback counts asserted. Fixture-owned shadow hosts are cleaned up.

Independent adversarial review identified and refined these source-grounded
regressions. Repairs address each:

- Hover pauses only when requested, and leaving invokes the consumer's native
  mouse-leave callback, not the enter callback.
- Application, focus, hover and window pauses are independent: ending one pause
  does not erase another. Existing and newly dispatched positions belonging to
  the focused Toaster pause together.
- Focus isolation uses a private per-instance scope, not controller routing IDs;
  two Toasters sharing a default or explicit controller ID remain independent.
- Content-only and separate application-data updates retain root overrides.
  Immutable data merging preserves omitted fields, while an explicit null root
  removes prior attributes and handlers.
- Controller dismissal reports `dismissed` exactly once before `unmounted`.
  Queued dismissal removes the record, so it cannot later promote; dismiss-all
  removes queued records and position roots as visible toasts finish exiting.
- A toast ID remains reserved during its exit animation and can be reused after
  removal, preserving the original duplicate-ID policy.

The user authorized directly coupled repairs in `ToastContainer/useToastContainer.ts`,
`state/useToaster.ts`, `state/useToastController.ts`, `state/vanilla/createToaster.ts`
and associated types/unit regressions. The public `ToastImperativeRef` signature
is unchanged; focus-only methods are private, non-barrel-exported implementation
details, with compatibility for pre-existing imperative handles.

A ninth genuine defect _inside_ the active directory was exposed by the native
style test: `useToasterStyles.styles.ts` mutated React-frozen consumer styles and
shared that style between position slots. Each position now clones the style
before adding geometry. The native width/class/ARIA override scenario measures
two distinct positions to verify independent geometry.

Review follow-up closed shared-controller-instance focus isolation, sequential
root/data updates, simultaneous pause reasons, explicit root removal/restoration,
ID reuse through exit and multi-slot queue promotion. Unit tests additionally
isolate matching/mismatched/absent focus-scope metadata and standalone containment.
No actionable production or browser-coverage findings remained in final review.

Priority ordering follows the existing state units (lower numeric value comes
first). This conflicts with the public type comment that says higher values
come first; no unrelated policy change is made. `useToaster` explicitly captures
queue defaults/limit at construction, so general runtime default-option updates
are not silently represented as supported; live offsets, callbacks and shortcuts
are separately checked.

## Accessibility and honest boundaries

All ordinary axe rules remain enabled. The first inline scan proves that the
only four findings are `aria-hidden-focus` on exact
`i[data-tabster-dummy][aria-hidden="true"][tabindex="0"]` sentinels. A second scan
excludes **only those matching sentinel nodes**, not the rule or the application
content. Native keyboard navigation is checked independently.

Window blur tests dispatch the actual window events to verify listener
integration; they do not prove real OS window switching. CSS timers use the real
browser animation, not virtualized JavaScript time. Pause/play progress is
observed across animation frames, finite/persistent controls have opposite
observable removal outcomes, and persistent-to-finite updates await real
animation-driven removal. There are no arbitrary sleeps or retries.

The full local JSX bridge supplies React intrinsic elements/attributes and the
children attribute to source files using the Fluent JSX runtime. The last source
TypeScript validation was **clean, with zero diagnostics**, including no suite
errors and no shared-provider errors in this isolated program.

The fixture follows the existing Toast browser suite's `strict: false` setting;
this is not proof of StrictMode lifecycle support. DOM live-region content and
focus assertions do not prove screen-reader announcements or OS forced colors.

## Reproduction

From the repository root using the provided Node 22 executable:

```powershell
$env:WEBPACK_DEV_SERVER_PORT='24848'
& $node22 node_modules\cypress\bin\cypress run --component --browser chrome --project packages\react-components\react-toast\library --config-file src\components\Toaster\Toaster.cypress.config.cjs
& $node22 node_modules\typescript\bin\tsc -p packages\react-components\react-toast\library\src\components\Toaster\Toaster.cy.tsconfig.json --pretty false
```

Run package units from the library directory, since the shared Jest preset
resolves source aliases relative to the command's current directory:

```powershell
Set-Location packages\react-components\react-toast\library
& $node22 ..\..\..\..\node_modules\jest\bin\jest.js --config jest.config.cjs --runInBand
```

The runner keeps downloads inside the active component directory. No screenshots
or video are enabled. Release metadata is limited to the react-toast patch.
