# TeachingPopoverTitle browser coverage

## Exact source mapping

- `react-teaching-popover\stories\src\TeachingPopover\TeachingPopoverDefault.stories.tsx`, `TeachingPopoverAppearanceBrand.stories.tsx`, `index.stories.tsx`, `TeachingPopoverDescription.md`, `TeachingPopoverBestPractices.md`: default/brand title in real Body/Surface/Trigger composition, actual heading/typography/foreground, owner-provided surface naming. Description/best-practice files add no title-specific interaction requirements.
- `TeachingPopoverCarousel.stories.tsx`, `TeachingPopoverCarouselAppearanceBrand.stories.tsx`, `TeachingPopoverCarouselText.stories.tsx`: titles are passive card headings; live content/appearance is checked locally, not carousel-controller navigation (outside this directory).
- `TeachingPopoverTitle.types.ts`, `TeachingPopoverTitle.tsx`, `useTeachingPopoverTitle.tsx`, `useTeachingPopoverTitleBase.tsx`, `useTeachingPopoverTitleStyles.styles.ts`, `renderTeachingPopoverTitle.tsx`: all h1–h6/div roots, optional dismiss/null/custom slots, native attrs/ref/styles, logical-end geometry in both directions, brand styling, glyph default versus explicit null/base hook.
- `TeachingPopoverTitle.test.tsx`, `useTeachingPopoverTitle.test.tsx`, `useTeachingPopoverTitleBase.test.tsx`: default snapshot/conformance, missing/present slot, exact context close event/false, cancellation skips close but still focuses trigger, custom slot callback precedence, default native button type regression.
- `..\TeachingPopoverSurface\useTeachingPopoverSurface.ts` and Popover context integration: real default/controlled popup dismissal and trigger focus restoration.

## Rounds and fix

13 documentation; 19 cumulative edges; 24 cumulative unit-derived; 28 final. Final review checks real RTL/LTR button placement, live design/content, alternate-root and optional-slot ref lifecycle.

Genuine red `141-round2-red.log`: default optional dismiss button submitted its surrounding form under real pointer/Enter/Space. Only local base default now sets `type="button"`; caller explicit types still win. Browser regression and local base-hook unit assertion added. Earlier typography fixture expectation was corrected to actual base400 tokens (16px/22px).

## Commands

From master checkout:

```powershell
$repo = (Get-Location).Path
$node = 'C:\Program Files\scout\resources\node\node.exe'
$component = "$repo\packages\react-components\react-teaching-popover\library\src\components\TeachingPopoverTitle"
& $node "$repo\node_modules\cypress\bin\cypress" run --component --browser electron --headless --project "$repo\packages\react-components\react-teaching-popover\library" --config-file src\components\TeachingPopoverTitle\cypress.config.cjs
& $node "$repo\node_modules\typescript\bin\tsc" -p "$component\tsconfig.cy.json"
& $node "$repo\node_modules\prettier\bin-prettier.js" --check "$component\*.cy*" "$component\cypress.config.cjs" "$component\tsconfig.cy.json" "$component\useTeachingPopoverTitleBase.tsx" "$component\useTeachingPopoverTitleBase.test.tsx"
Set-Location "$repo\packages\react-components\react-teaching-popover\library"
& $node "$repo\node_modules\jest\bin\jest.js" --runInBand --runTestsByPath src\components\TeachingPopoverTitle\TeachingPopoverTitle.test.tsx src\components\TeachingPopoverTitle\useTeachingPopoverTitle.test.tsx src\components\TeachingPopoverTitle\useTeachingPopoverTitleBase.test.tsx --silent
```

Local CommonJS config bypasses canonical ESM issue; legacy JSX bridge is type-only. Artifacts remain local; logs use requested session artifacts. Include-pattern warnings remain visible.

## Limits

Functional Electron DOM/focus/event/geometry coverage, not universal accessibility, AT, cross-browser, visual or OS high-contrast certification. The source intentionally defaults the optional dismiss control to aria-hidden=true despite native focusability; tests record that contract, not certify its screen-reader availability. A caller can explicitly expose/name it. The title itself is passive; only its optional close control is activated. Custom slot onClick replaces the built-in handler. Cancellation still restores focus by the explicit unit contract. No network images, retries, skipped tests, sleeps, synthetic keys or error suppression.
