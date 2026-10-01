# Badge component coverage

`Badge.cy.tsx` covers Badge only. CounterBadge's `count`, `dot`, `overflowCount`,
and `showZero`, and PresenceBadge's `status` and `outOfOffice`, are separate
contracts. There is no BadgeCount export in this package. Badge renders literal
children, including zero, and adds no role, focus behavior or live announcements.

## Coverage inventory

The color-token and geometry expectations guard the current implementation
against regression; they are not an independent design-specification oracle
or visual-correctness certification.

- All 576 size/shape/appearance/color combinations: 6 sizes, 3 shapes,
  4 appearances, 8 colors. Each combination checks browser-measured height,
  radius, computed fill/foreground/stroke, ghost border suppression and prop
  filtering. The 32 appearance/color combinations also run with light and dark
  themes and active browser-emulated forced colors.
- Empty, icon-only and short text bounds for all size/shape combinations.
  Both icon positions and both provider directions for every size use measured
  icon/text ordering, gap and vertical alignment.
- Zero, null, undefined, false, empty string and text content; optional icon
  removal, element/string/number/object shorthand and empty slot objects.
  Medium and extra-large exercise the two content-dependent margin branches.
- Native root/icon attributes, classes, inline styles, refs and render functions.
  Public types support only `div` roots and `span` icons, not arbitrary
  polymorphic tags.
- Computed accessible names and descriptions for owning controls, meaningful
  icons and labelled image badges; decorative tab-order behavior; explicit
  consumer focus and live-region attributes; dynamic accessible names.
  Axe checks representative markup and an unnamed-image positive control.
- Native event forwarding, latest handlers, unmount/remount ref cleanup,
  dynamic visual/content/icon/theme/direction changes, nested provider token
  scopes and custom style hooks. Typography, padding and border-independent
  bounds are measured for all sizes.

Long text is explicitly unsupported by the documentation. Overflow probes
record current visible overflow, fixed tiny/extra-small geometry, larger-size
expansion and oversized SVG behavior; they do not promise ellipsis, clipping,
automatic font reduction or a circular aspect ratio for arbitrary content.
The component supplies an `::after` border that covers ordinary icon hit
testing. Root clicks and explicit consumer-enabled icon focus are tested;
independent default icon pointer targeting is not claimed.

## Local execution

The library has no e2e target or library-level Cypress tsconfig. The portable
component-local config reuses `@fluentui/scripts-cypress`, with retries disabled,
and does not reference a session adapter or change shared configuration.
From the repository root, use the existing Nx run-command target:

```text
yarn nx run react-badge:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T cypress run --component --browser electron --config-file src/components/Badge/cypress.config.cjs"
yarn nx run react-badge:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T tsc --noEmit -p src/components/Badge/tsconfig.cy.json"
yarn nx run react-badge:lint --skipSync --skip-nx-cache --excludeTaskDependencies --command="yarn run -T tsc --noEmit -p src/components/Badge/tsconfig.cy.baseline.json"
```

Set `NX_DAEMON=false` and a free `WEBPACK_DEV_SERVER_PORT` when running in a shared
checkout. The baseline config imports existing Badge and FluentProvider source
without the Cypress suite, isolating upstream diagnostics without suppressing
them. No screenshot assertions or screen-reader announcement claims are made;
forced-colors testing is Chromium emulation, not Windows high-contrast hardware
or cross-browser certification.
