# Radio Cypress functional coverage

## Run

From `packages\react-components\react-radio\library`:

```powershell
..\..\..\..\node_modules\.bin\cypress.cmd run --component --browser chrome --config-file src\components\Radio\Radio.cypress.config.cjs
```

The component-local CommonJS config clones the shared Cypress config, resolves support files relative to the library project, and gives webpack the library context, repository loaders, and absolute local esbuild tsconfig. It avoids Cypress Node 18's ESM `import.meta.dirname` limitation. Retries are **zero**, screenshots on failure and videos are disabled, and only this spec is selected. Only the known esbuild tsconfig/include warning is suppressed.

## Verified scenarios

**51 scenarios**, all passing in Chrome 154 headless with Cypress 14.4.1 / Node 22.20.0 on Windows. The original 49 scenarios are retained, with two same-mounted indicator transition scenarios added. The accessibility pass explicitly enables every axe rule.

| Area                                     | Scenarios | Browser contracts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | --------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native semantics and documented examples |        14 | Unique generated IDs and label associations; primary input vs root native-prop routing; indicator-area/label activation and selection-only callback payloads; real Tab/Shift+Tab/Space/all arrows, wrapping and disabled-item skipping; defaultValue/defaultChecked updates; controlled group updates/clear and declined controlled selection; disabled group focus/activation; item overrides; independent generated names; successful FormData controls and default `"on"` value; explicit native required validation and blocked submission. |
| Composition and updates                  |        10 | Forwarded object ref focus/unmount; callback ref replacement/cleanup for input, root, indicator and label; input-slot ref/props/callback merge order; absent/null labels with accessible names; supported non-void slot render functions; formatted multiline labels and external descriptions; Field naming/hint/validation and per-item description overrides; replacement handlers, IDs, names, values, labels and stable input identity; dynamic disabled/required; explicit item checked/defaultChecked precedence.                        |
| Native forms                             |         5 | Uncontrolled reset to defaults without change notifications; empty/defaultless and canceled reset; consumer-synchronized controlled reset; external form ownership and same-name radios in separate forms; disabled fieldset focus/validation/FormData semantics.                                                                                                                                                                                                                                                                               |
| Layout and visuals                       |        15 | Actual rectangles in LTR/RTL for vertical, horizontal and horizontal-stacked layouts (6); inherited/explicit labelPosition and dynamic style removal; external native labels before/after; real keyboard root focus outline; default pseudo-element vs custom indicator child visibility; light/dark/Teams contrast tokens with real hover/mousedown/mouseup (3).                                                                                                                                                                               |
| Additional native prop contracts         |         6 | Explicit root/label/indicator overrides; input-slot state/name/description precedence; native focus/blur/key handlers and preventDefault navigation; controlled selected-option removal/reinsertion; defaultChecked update vs reset; live name/value FormData changes.                                                                                                                                                                                                                                                                          |
| Forced colors                            |         1 | CDP-emulated forced colors, system border/fill/label colors for unchecked/checked/disabled states, retained 16px geometry and native selection. Media emulation is restored after the test.                                                                                                                                                                                                                                                                                                                                                     |

Tests use real browser events, retryable state/geometry assertions, and native validation/FormData. There are no fixed sleeps, test retries, skipped tests, or conditional success fallbacks. Existing unit/conformance tests and production implementation remain unchanged. RadioGroup is fixture context, not a rewritten independent algorithm or a duplicate of a separate Cypress suite.

The two new indicator scenarios rerender the same checked or unchecked Radio from no indicator children to a custom child and back to no children. Input, root and indicator DOM identity must persist at every phase. Exact computed pseudo-element content distinguishes the default checked dot from an absent dot; the generated dot also retains its display, dimensions, opacity and scale. The custom child must exist exactly once, with opacity `1` when checked or `0` when unchecked, without a generated dot. Returning to default removes and disconnects the custom child and restores the expected pseudo-element without firing change callbacks.

## Accessibility scope and measured exception

Scans are scoped to the fixture's `data-testid="scan"` container, not the Cypress runner UI. **Every axe rule is enabled**, including normally opt-in rules. No nodes are excluded from semantic checks or WCAG AA `color-contrast`.

One rule has a narrow selector exception: **`color-contrast-enhanced` (WCAG AAA 7:1)** does not scan enabled **unchecked** Radio labels (and their content), Field hints, or Field validation messages **in the standard light theme with forced colors inactive**. All other nodes, checked labels, dark/Teams contrast fixtures, forced-colors fixtures, and all other rules are still checked.

An all-rule run without this exception produced only enhanced-contrast failures in nine scenarios. Recorded values were `#616161` on `#ffffff` at **6.19:1** for unchecked Radio labels/Field hints, and `#bc2f32` on `#ffffff` at **5.84:1** for the Field validation message. These pass the applicable AA text threshold but not AAA. The exception preserves these existing shared token choices rather than changing the design system to claim AAA certification. Evidence: `radio-axe-enhanced-nodes.log` in the session evidence directory.

## Real limitations and upstream findings

- **Field-required propagation:** The existing RadioGroup repair in commit `1fb6dc11` enables `supportsRequired`, so `Field required` now supplies both group `aria-required` and native input `required`. The retained Field scenario verifies this current source contract, both inputs' initial missing-value validity, and recovery after native selection. No RadioGroup/Field production code was changed by this refinement.
- `labelPosition` supports only `after` and `below`; there is no built-in `before`. Before/after external labels are tested with native `htmlFor`. Input is a void slot, so its public type does not support `children` render functions; render functions cover root, indicator and label, while input-slot overrides are tested separately. Required root/input/indicator slots cannot be omitted through the supported types.
- Native `form.reset()` does not update a consumer's React state. The controlled reset fixture explicitly cancels native reset and restores its controlled value. Uncontrolled/defaultChecked reset behavior is verified separately.
- Chrome-only browser validation; no Firefox/WebKit, assistive-technology automation, OS contrast-theme installation, touch, pixel snapshots or exhaustive combinations. Forced colors are Chrome media emulation, not a claim of complete Windows contrast-theme certification.
- The source-importing Cypress TypeScript program passes with zero diagnostics. Its explicitly included, component-local `Radio.cy-jsx.stories.ts` bridge connects the custom JSX runtime's global JSX interfaces to the installed React types. The bridge is excluded from production builds by the existing `*.stories.ts` exclusion; actual Radio and fixture source remain imported and checked. No provider patches, ignored diagnostics or replacement component declarations are used.

## Validation and evidence

From the library:

```powershell
..\..\..\..\node_modules\.bin\eslint.cmd src\components\Radio\Radio.cy.tsx src\components\Radio\Radio.cypress.config.cjs
..\..\..\..\node_modules\.bin\prettier.cmd --check src\components\Radio\Radio.cy.tsx src\components\Radio\Radio.cypress.config.cjs src\components\Radio\Radio.cy.tsconfig.json src\components\Radio\Radio.cy-jsx.stories.ts src\components\Radio\Radio.cy.md
..\..\..\..\node_modules\.bin\tsc.cmd -p src\components\Radio\Radio.cy.tsconfig.json --pretty false
```

ESLint, Prettier and the source-importing `tsc` program pass. Independent whole-suite adversarial review identified missing computed dimensions for the default checked dot; both the original indicator case and the new checked round-trip now assert `16px` width and height, display and opacity as well as content and scale. An independent whole-suite closure review verifies the repaired suite.

Current refinement evidence is outside the repository:
`C:\Users\jabrassi\.scout\copilot\session-state\6f6b9748-ff8b-4aeb-9717-c6af98b11f10\files\44-Radio-refinement-*`.
It includes browser, source TypeScript, ESLint, formatting, independent review, commit and before/after source-hash evidence. Fingerprints cover non-Cypress Radio library source (including RadioGroup fixture source and original unit tests). Original campaign evidence remains in the prior session's `radio*` artifacts; this refinement does not claim that the final all-component gate has run.

This is a finite browser regression suite, not exhaustive accessibility or universal component certification.
