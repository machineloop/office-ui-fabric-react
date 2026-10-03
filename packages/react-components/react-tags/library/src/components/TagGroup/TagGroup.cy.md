# TagGroup browser coverage

The component suite preserves the nine original cases and adds finite documented,
accessibility/interaction, and source-derived coverage. It uses real pointer and
keyboard actions; the explicitly named programmatic dismissal case checks the
outside-focus guard, not user input.

## Supported inventory

- Named toolbar default; consumer-authored passive list/listitems and explicit
  listbox/options; labelled-by/described-by accessible naming.
- All nine size (`medium`, `small`, `extra-small`) / appearance (`filled`,
  `outline`, `brand`) combinations, inherited gap/size/colors, explicit child
  overrides, and group disabled precedence over enabled child props.
- Dismissal by click, Enter, Space, Backspace and Delete on Tag and interaction
  secondary actions, exact event/value payloads, fallback/empty/Unicode values,
  cancellation by child handlers, and unrelated-key/primary-action controls.
- Consumer-owned removal of first/middle/last and all children in both
  compositions, next/previous focus, consumer-owned final/reset focus.
- Callback-enabled uncontrolled/default and controlled interaction selection,
  pre-toggle callback payloads, primary Enter/Space, multiple selections,
  callback presence changes, and explicit consumer selection cleanup on removal.
- LTR/RTL physical layout, circular horizontal movement, both-axis vertical
  movement, both interaction buttons, passive/disabled skipping, Tab/ShiftTab
  boundary exits and remembered current action.
- All three sizes in both directions: every mixed child (static Tag, dismissible
  Tag, two-action InteractionTag, primary-only InteractionTag) has measured
  positive width, supported height, aligned/contained bounds, physical ordering,
  and interitem gaps matching the corresponding theme spacing token. Primary
  and secondary action bounds are adjacent and fill their shared tag. These are
  relational geometry checks with subpixel tolerance, not fixed text widths,
  full-pixel fidelity, or screenshot comparisons.
- Secondary Escape and an arbitrary letter preserve focus and selection without
  dismissal/selection callbacks, followed by real Enter and Space positive
  controls with one exact dismissal payload per activation.
- Dynamic insertion/reordering/disabled/context/controlled values, latest
  callbacks, sibling context isolation, ref/native props/events, render
  functions, unmount/remount, wrapping class override, nearest provider theming,
  and externally composed Overflow/OverflowItem measurement.

## Ownership and limitations

`TagGroup` does not remove children on dismissal. Its uncontrolled selection
requires `onTagSelect`, is for InteractionTag primary actions, and is not
automatically pruned on removal. Tag selection and the picker-style listbox
InteractionTag keyboard recipe remain consumer-authored. Group `dismissible`
does not invent an InteractionTag secondary button.

The prose spec's listbox default and selection restriction are stale relative to
the current API, hooks, units and stories: runtime defaults to toolbar and
supports callback-enabled interaction selection. Tests do not enforce stale
claims.

Known inherited behavior is explicitly characterized, not claimed correct:

- Overriding an InteractionTagPrimary ID leaves the secondary's automatic
  primary ID reference unresolved. The valid mixed fixture supplies explicit
  `aria-labelledby`; a separate case preserves the defective automatic result.
- Primary `preventDefault()` does not cancel callback-composed selection.
- Tabster injects two `aria-hidden` sentinels with `tabindex=0`. Raw axe runs
  exposed `aria-hidden-focus` findings (and their visibility-dependent reporting).
  Ordinary role/name/contrast axe checks exclude **only** `[data-tabster-dummy]`;
  each case separately asserts the inherited hidden/focusable sentinel DOM.
  This is not an unqualified whole-group accessibility pass.

The five scoped axe scans keep all axe rules enabled. The list scan covers only
two passive Tags with `listitem` roles; the listbox scan covers only two
non-dismissible Tags with `option` roles and selected/unselected ARIA states.
Neither scan covers InteractionTag, dismiss buttons, or disabled list/listbox
recipes. The separate consumer-authored listbox InteractionTag keyboard test is
functional coverage, not an axe pass. Toolbar scans cover the named mixed
composition, plus separate selected and group-disabled mixed compositions with
computed names for each dismiss/primary/secondary action. No listitem/option
roles are injected into toolbar children to satisfy the scanner. Every scan
asserts the two inherited sentinel nodes and excludes only those nodes; it
does not establish a raw whole-group accessibility pass.

## Validation boundary

The whole-package Cypress `tsc -p tsconfig.cy.json --noEmit --pretty false`
check exits **1**, not green. It retains exactly three existing diagnostics:

- `react-provider/.../renderFluentProvider.tsx(42,16)`: TS2741, missing `children`
  in `TextDirectionProviderProps`.
- `react-provider/.../renderFluentProvider.tsx(47,25)`: TS7026, missing
  `JSX.IntrinsicElements`.
- `react-tooltip/.../renderTooltip.tsx(21,33)`: TS7026, missing
  `JSX.IntrinsicElements`.

The baseline and final diagnostic lines are compared exactly; the TagGroup
suite introduces zero own diagnostics. That parity does not mean the package
type check passed. Exact commands, exits, executed case titles, and counts are
recorded in the external `TagGroup-evidence.json`.

No production or sibling changes are made. Coverage does not claim exhaustive
arbitrary values, actual assistive-technology speech, all browsers, forced-color
rendering, or the behavior of every external Overflow/Menu/Combobox integration.
