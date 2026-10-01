# ToggleButton browser coverage

`ToggleButton.cy.stories.tsx` runs with the component-local CommonJS Cypress
configuration, Chrome, native pointer/keyboard events, and zero retries.
The story-suffixed fixtures and JSX bridge are excluded from the normal library
build; `ToggleButton.cy.tsconfig.json` checks the explicit browser project.

## Contract map

- Package-local Default, Checked, Disabled, Appearance, AccessibleAppearance,
  Shape, Size, Icon and WithLongText stories: observable checked state,
  focus order, style changes, geometry, accessible naming, and wrapping.
- `ToggleButton.types.ts`, `useToggleButton.ts`, and inherited button state:
  controlled ownership versus default initialization, cancellation, callbacks,
  native button/form metadata, link semantics, disabled focusability, and RTL.
- Existing `ToggleButton.test.tsx` and conformance: checkbox/menuitemcheckbox
  ARIA, root/icon class composition, forwarded object/callback refs including
  committed unmount, slot updates, and keyboard activation.
- `useToggleButtonStyles.styles.ts`: alternate accessible selected appearance,
  bundled filled/regular icon switching, held pointer press and hover, and
  disabled selected style precedence.
- Live owner/provider updates: selected state/root identity, event-handler
  replacement, role changes, disabled recovery, inherited/explicit context
  sizing, and light/dark themes.

Ordinary axe rules are enabled for labeled accessible selected text and icon-only
buttons without exclusions. These checks do not establish all WCAG criteria.
The default selected-color-only strategy has the documented accessibility
limitation; the suite verifies alternate styles and distinct bundled icons.
OS forced-colors, screen-reader speech, and StrictMode are not claimed.
Disabled anchors intentionally remove their `href` through the inherited
ARIA helper; link cancellation and a href-less anchor's button keyboard behavior
are tested separately.
