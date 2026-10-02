# InteractionTag browser coverage

The component-local CommonJS runner discovers the story-suffixed suite and its
JSX bridge in an explicit browser TypeScript project. Actual package-local story
Markdown is loaded as a source asset using Webpack's built-in support.

## Contract map

- Default, Appearance, Selected, Size, Shape, Disabled, Icon, Media,
  SecondaryText, Dismiss and HasPrimaryAction stories: actual container/action
  semantics, geometry, propagated avatar dimensions/shapes, selected colors,
  content/naming, owner-managed dismissal/reset focus and native popover action.
- Native Enter/Space and pointer activation, secondary Enter/Space/Delete/
  Backspace dismissal, cancellation, disabled tab order with positive controls,
  group-forced disability, independent action hit targets in LTR/RTL, and
  generated combined secondary names.
- Original source/unit/conformance contracts: group inheritance versus explicit
  size/appearance, controlled group selection versus explicit selected
  appearance, root metadata/classes/styles and event bubbling, object/callback
  refs with committed cleanup, stable generated identities and explicit empty
  values, custom-primary-ID naming and complete label override, live handlers,
  disability recovery and exact provider-theme endpoints.

Native scenarios exposed a directly coupled primary click-composition defect:
consumer props replaced the composed group handler. The repair keeps both
callbacks and selection. The documented secondary `aria-labelledby={null}`
override is now represented in public props and normalized to a native omitted
attribute; its API report and original unit regressions accompany the repair.
Primary actions default to a non-submitting button in forms, retaining explicit
submit behavior. Real pointer, Enter and Space scenarios verify callbacks and
selection without unwanted submissions, with explicit submit positive controls.

Ordinary axe rules are enabled without exclusions. The selected prop alone
styles an uncontrolled standalone tag; selectable group context supplies
selection ownership and `aria-pressed`. No complete WCAG, screen-reader speech,
OS forced-colors or StrictMode claim is made.
