# AccordionHeader browser coverage

The component-local CommonJS runner discovers `AccordionHeader.cy.stories.tsx`
with Chrome and zero retries. The JSX bridge and story-suffixed fixtures are
isolated from the normal library compilation; the local TypeScript project
checks browser fixture dependencies.

## Contract map

- Package-local Accordion stories: Default, HeadingLevels, Sizes, Inline,
  Disabled, ExpandIconPosition, ExpandIcon, WithIcon. Assertions observe root
  semantics, actual typography/geometry, ARIA state, icon structure and naming.
- Public header types and original component/conformance/hook units: native
  button or anchor slots, all heading levels, default/custom/absent expand
  icons, consumer cancellation, native metadata, classes and independently
  forwarded root/button refs with committed unmount cleanup.
- Source/context/styles: native pointer/Enter/Space, unrelated keys, controlled
  state and precise request data, item disability, sole-open non-collapsible
  focusability, multiple-open boundaries, tabbing into content, four RTL/LTR
  position combinations, dynamic handlers/disabled recovery, owner changes,
  and live header context propagation.

Ordinary axe rules are enabled without exclusions for a labeled semantic
heading/button fixture. This is not a screen-reader, complete WCAG, OS
forced-colors or StrictMode certification. Chevron assertions verify both
declared rotation and actual slot geometry; they do not claim intermediate
animation-frame fidelity.
