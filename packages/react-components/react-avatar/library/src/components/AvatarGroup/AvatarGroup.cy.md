# AvatarGroup browser contracts

The original single AvatarGroupOverflow/Popover focus test is preserved. It mounts a standalone popover; all new campaign cases actually mount AvatarGroup. Baseline 1/1 source-audited passing case.

Read group API/hooks/render/styles/context/unit/conformance; Item and Popover context/render/style integration; partition utility; README-AvatarGroup, SPEC-AvatarGroup, all seven AvatarGroup story modules/index/Description/BestPractices and story README. No `.stories.mdx` group modules exist.

## Round 1 exact source → assertions

- Default/Layout/README: spread/stack use final four inline names and first seven overflow; pie uses first three inline and all eleven overflow. Real spacing/overlap or pie clipping/scaling is measured, not inferred from render alone.
- All three layouts use native Tab/Enter/Space to reach only the overflow trigger; name/expanded state, named modal/list content/count/order, Tab/shiftTab trap, Escape restoration and Tab exit are checked.
- Popup ordered names are checked on both visible overflow labels and actual Avatar aria-labels; hidden duplicate labels alone are not used to certify accessible names.
- Each of 14 documented sizes is exercised in every layout (42 cases): actual inline item/avatar context dimensions, pie group dimensions, below-24 icon versus count, keyboard opening, and fixed 24px overflow avatars.
- Explicit count/icon indicators expose the correct presentation with the same overflow content. Custom tooltip supplies a localized trigger name, appears on real hover and retains keyboard popup activation.

## Boundaries

Group is passive and owns layout/size/context, not popover open or item selection state. No fake keyboard actions for the wrapper. Overflow interactions are integration contracts, not universal Popover/AvatarGroupItem certification. Electron only; no pixel screenshot, forced-colors, screen-reader/cross-browser certificate. Stack sizes below 28 are not certified for multiple interactive targets, as the story warns. Native attributes/refs/context lifecycles and unit-derived small-indicator defaults are expanded in later rounds.

## Round 2 exact edges

Disabled overflow button skips Tab and produces zero forced-pointer/open callbacks. Explicit count 0/99/100 formats/clamps independently of seven real overflow children (consumer count is not falsely equated to actual child count). Empty/one/five-item partition boundaries omit unnecessary overflow and inline avatars add no Tab stops. Two-person pie has opposite half clips/positions and duplicates both names in overflow. All layouts under RTL preserve logical order/overlap or left quarter arrangement plus native popup activation/Escape restoration.

## Round 3 units/context lifecycle

Native root ref/ID/title/name/description/classes clear on unmount. Inline root styles override pie clip/dimensions while explicit group item context remains independent. Same-root layout/size changes update inline/overflow context and indicator; child changes remove an open overflow below threshold and retain new ordered names. Latest root and overflow callbacks assert native root currentTarget and exact current-version ordering/envelope. Controlled/default-open popover state is distinguished from passive group state. Public Base hook recomposes native group state with explicit context size. A consumer avatar-slot size can override that avatar while wrapper/sibling/group defaults remain unchanged; group size is not falsely certified as overriding arbitrary slot customization.

No production changes are necessary. Adversarial review identified missing exact
size-tier spacing assertions. Every spread/stack size now measures the actual
gap/overlap against theme tokens, including all four spacing buckets.

## Running

The component-local config intentionally isolates this suite with retries off.
The canonical package config discovers `AvatarGroup.cy.tsx` automatically, but
its ESM shared-config loader currently fails on `import.meta.dirname` in this
environment. The local CommonJS config uses the same shared webpack/support
implementation without changing infrastructure outside this component.
`tsconfig.cy.json` and its JSX declaration provide a targeted React 19-compatible
typecheck; they do not replace the package's CI configuration.

Run from the repository root with a supported Node version (22 or 24):

```powershell
node .\node_modules\cypress\bin\cypress run --component --browser electron --headless --project .\packages\react-components\react-avatar\library --config-file src\components\AvatarGroup\cypress.config.cjs
node .\node_modules\typescript\bin\tsc -p .\packages\react-components\react-avatar\library\src\components\AvatarGroup\tsconfig.cy.json --pretty false
```

This invocation exercises all 72 tests with no retries, pending or skipped cases.
It does not certify the failing canonical ESM loader or its CI retry policy.
