# Spinner browser contracts

Run from the repository root using the existing Nx command target:

```sh
yarn nx run react-spinner:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T cypress run --component --browser electron --config-file src\components\Spinner\cypress.config.cjs"
```

The component-local configuration reuses `@fluentui/scripts-cypress`, resolves
repository resources relative to itself, and disables retries. Set
`WEBPACK_DEV_SERVER_PORT` to isolate concurrent runs. No package E2E target,
machine-specific configuration, dependency, or shared helper is required.

The suite covers all eight supported sizes, both appearances, all four label
positions in LTR/RTL, light/dark token paint, native props and refs, optional
slots, slot render functions, naming/description relationships, delay lifecycle,
context overrides, consumer-owned completion, real CSS animation timelines,
reduced-motion media transitions, and forced-colors paint for both primary and
inverted appearances.

Spinner is indeterminate: it supplies `role="progressbar"` by default, not a
progress value, busy region, live-region attribute, completion event, or
automatic focus. Its label establishes `aria-labelledby` unless the consumer
supplies that relationship. Consumer `role="status"` uses that role's implicit
live semantics; tests do not assert screen-reader speech or announcement timing.

Ordinary root/ring children are replaced by the structured slots. Root/ring
render functions receive those generated children and choose whether to retain
them. Label/tail content is preserved, including numeric zero. A null label or
ring removes that slot. Label supports its public `label` element type, not a
`span` override. Custom renderers own any markup or ARIA they replace.

Positive delay hides ring and label, not the progressbar root. Pending delay
changes cancel the old timer. Zero delay shows immediately. Once a positive
timeout has fired, later delay changes do not hide that same instance; remounting
creates a fresh delay. Negative/non-finite delay inputs are not covered contracts.

Reduced motion does not stop all motion: it slows the ring to 1.8 seconds,
disables the tail's expanding arcs, removes arc pseudo-elements, and uses a
static tail gradient. Animation assertions use browser media emulation and
actual Web Animations timelines. Layout tests pause the ring at zero rotation
to measure flex gap rather than a rotating bounding box.

Paint checks verify computed theme tokens, not arbitrary-background WCAG
compliance. Inverted loading indicators require a suitable consumer background.
Both forced-colors cases activate actual browser high-contrast media after a
normal-theme positive control, keeping reduced-motion explicitly at
no-preference to isolate the high-contrast transition. They verify Highlight/HighlightText ring paint,
CanvasText label paint, the visible masked ring and current-color tail arcs,
four running animation timelines, and stable label text, naming and slot nodes.
Removing forced-colors restores each appearance's theme tokens, visible slots
and animation behavior without remounting.
This is Chromium/Electron coverage, not cross-browser or assistive-technology
certification; no axe dependency is introduced.
