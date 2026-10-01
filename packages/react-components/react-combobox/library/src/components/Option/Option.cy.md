# Option browser contract

`Option.cy.tsx` tests Option itself and its supported integration with real
Dropdown and Combobox controls. Parent controls own selection and popup state:
there is no standalone Option selection state or `closeOnSelect` Option prop.

## Inventory

- **Documentation:** package `docs/Spec.md`; Dropdown accessibility and best
  practices; Combobox best practices; complex/custom option, grouped,
  multiselect and size stories. Rich noninteractive children need explicit
  `text`; `value` is the selection key, not the typeahead label.
- **Public API:** `Option.types.ts`, the Option section of
  `etc/react-combobox.api.md`, and `index.ts`.
- **Implementation:** `Option.tsx`, `useOption.tsx`, `renderOption.tsx`,
  `useOptionStyles.styles.ts`; read-only Listbox context, collection, selection,
  keyboard-action and trigger implementations.
- **Unit derivation:** `Option.test.tsx`: default/selected semantics, text versus
  children/value precedence, empty strings, missing-text warning, registration,
  reregistration, disabled click suppression, focus/select callbacks and optional
  checkIcon.
- **Prior art:** existing Dropdown/Combobox Cypress tests and the shared strict
  mount. The prior Dropdown typeahead fix is used without modifying it.

## Browser scenarios

The suite contains 53 cases in three groups:

1. **Documentation (11):** standalone rendering without local selection,
   string/complex/explicit text and values, empty value, authoritative parent
   selection, multiselect pointer toggles and exact payloads, real Dropdown
   typeahead, real Combobox typing, custom/null checkIcon and inherited grouping.
2. **Edges/accessibility (18):** disabled keyboard navigation in both parents;
   disabled pointer handlers and selected multiselect; Home/End/arrows/Escape;
   Space/Enter toggles; generated IDs and portal ownership; forwarded refs,
   native attributes and check render functions; mouse handlers and
   mousedown preventDefault; three sizes; light/dark check colors; LTR/RTL
   rectangles and check hit targets; active-descendant outline; forced colors.
3. **Unit-derived/lifecycle (24):** registration data/ref/cleanup ordering,
   stable identities, updated child-text collection and zero entries after
   removal, memoized callback data/order, disabled default prevention, native
   onClick cancellation semantics, nearest context and dynamic selection/mode,
   latest native/context callbacks, updated text/value/disabled in both parent
   controls, removed/re-added IDs, empty explicit text, invalid missing-text
   runtime diagnostic, Combobox multiselect, changed-text typeahead and enabled
   hover versus disabled/native styles; four real Tab/Shift+Tab parent cases,
   multiselect Escape checks, two Combobox typed-text Escape cases (normal and
   freeform), and generated Combobox portal IDs with selection/reopen identity.

## Important distinctions

- Disabled options remain active descendants on arrow navigation but cannot be
  selected. Their click handler prevents the click default and suppresses focus,
  selection, parent option-click and consumer onClick. Other mouse events are
  still forwarded. Disabled Enter does not close the popup.
- Option has no separate `root` shorthand prop and its declared child-content
  union does not accept root render functions. The optional checkIcon supports a
  render function; the suite verifies its native props/ref and decorative
  `aria-hidden` semantics without widening Option's public API.
- Consumer onClick executes **after** focus, selection and parent option-click.
  Its `preventDefault()` is not a selection veto. Mousedown cancellation can
  retain parent input/button focus while the subsequent click still selects.
- Shared mounting uses StrictMode. Initial registration occurs twice with one
  cleanup between them; unrelated rerenders add no registration. A data change
  cleans up before registering new data, and removal cleans up the final entry.
- Options may remain mounted but hidden after Escape. Hidden DOM presence is not
  asserted as an accessible, open popup. Multiselect Escape preserves the exact
  DOM nodes, checked state and checks; reopen and Enter deselection verify the
  registered explicit value and exact payload. Combobox Escape keeps the same
  nodes and selection without a selection callback, clears the active descendant,
  and resets typed text to the selected label unless freeform preserves it.
  Reopen restores the selected active option; navigation and Enter then select
  the other registered value with its explicit text, not its rich child content.
- Real forward Tab in Dropdown is intercepted by Tabster before the React
  keydown handler: focus moves, the popup closes and no selection payload is
  emitted. This inherited boundary matches the read-only Dropdown suite's
  `Tab closes single popup and moves native focus` case. Real Shift+Tab reaches
  the handler and selects the active Option with the exact value/text/selection
  payload. In Combobox, both real forward Tab and Shift+Tab reach the handler and
  select. These are real browser events, not synthetic Tab dispatches or claims
  that forward Dropdown Tab selects. The handler's supported Tab action is in
  read-only `useTriggerSlot.ts`; no sibling behavior is changed.
- Tab blur unmounts Options (unlike focused Escape): the original element is
  disconnected, and reopening produces a different element with the explicit ID,
  correct selected state and usable registration. Each Tab case first selects
  Cat with real Enter and checks that payload before resetting the spy history
  to isolate Tab callbacks. Reopened Enter checks exact registered Dog payloads.
- Portaled Combobox Options have unique nonempty generated IDs; active
  descendants, trigger controls and root ownership reference the actual portal
  nodes outside the Combobox root. Real keyboard selection uses explicit values
  and text. Focused hide/reopen preserves both generated IDs and DOM identities.
- Option typography/padding do not inherit the parent's size variant. RTL tests
  compare actual icon/text rectangles instead of class names. Theme checks move
  the real pointer away before testing resting colors; hover is tested separately.

## Limits

These are finite source/documentation/unit-derived cases, not exhaustive input
combinations or manual screen-reader certification. Forced-colors checks use
Chromium/Electron CDP emulation and assert that emulation is active; they do not
claim OS high-contrast or cross-browser coverage. No nested interactive content
is introduced. Missing-text props are deliberately type-bypassed only in the
negative runtime-warning case. No production behavior was changed.

Run using the workspace's `react-combobox:e2e` Nx target and select
`**/Option.cy.tsx`. External isolated-runner environment and exact commands,
results, baseline TypeScript diagnostics and logs are recorded in the
session's `Option-evidence.json`, not in repository-specific absolute paths.
