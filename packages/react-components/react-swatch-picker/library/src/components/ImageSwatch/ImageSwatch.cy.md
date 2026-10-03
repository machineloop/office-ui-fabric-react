# ImageSwatch browser contracts

No pre-existing component-local Cypress cases existed. Current shared-tree source is exercised through the artifact Nx harness using Electron only and zero retries/pending/skipped tests. This is source-to-assertion coverage, not universal/cross-browser/pixel/screen-reader certification.

## Read inventory

Read component API, hook/base hook, renderer, styles, `ImageSwatch.test.tsx` conformance and `useImageSwatch.test.tsx`; parent selection/focus context implementation; `library/README.md`, `library/docs/Spec.md`, stories README and every module under `stories/src/SwatchPicker` (12 examples plus index, description/best practices). No `.stories.mdx` files exist.

## Round 1 documented assertions

| Source                    | Exact browser assertions                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SwatchPickerImage         | Controlled bridge default → sea pointer selection, old/new checked states, preview update and exact callback event identity/type/value/source; computed background image/cover/no-repeat. Local data URLs replace CDN assets, so external network/image decoding is not certified.                                            |
| Spec keyboard; row layout | Native Tab, arrows focus without selecting, Home/End endpoints, Enter/Space selection, Tab exit and reverse Tab return.                                                                                                                                                                                                       |
| MixedSwatches/grid layout | Radio versus gridcell ARIA; mixed ColorSwatch/ImageSwatch mutual exclusion and lack of radio checked attribute in grid. Two-row `renderSwatchPickerGrid` integration: native Tab enters color cell, ArrowDown focuses image in the same column without selecting, Space selects image with exact event/value/source envelope. |
| FocusMode                 | Native Tab/shiftTab traversal without requests until Space activation.                                                                                                                                                                                                                                                        |
| Size/Shape                | All four context sizes and all three context shapes measured on image buttons and exercised by selection; custom inline root dimensions override picker defaults.                                                                                                                                                             |
| Tooltip best practices    | Tooltip-provided accessible label and keyboard activation preserved.                                                                                                                                                                                                                                                          |
| Popup                     | Consumer closes popup after image selection, focus restores; Escape closes without another selection request.                                                                                                                                                                                                                 |

The sample color-only Default, variants, spacing and EmptySwatch modules were read for relevant integration guidance, not certified as ImageSwatch behavior. Only a root button slot exists in the current types; historical spec icon/disabledIcon slots are not implemented APIs. Current unit tests explicitly prefer context size/shape over direct ImageSwatch props; this is covered in round 3. Disabled means native button `disabled`, not a custom disabledFocusable API. Event cancellation semantics and dynamic native/root behavior are covered in subsequent rounds.

## Round 2 edge assertions

- Native disabled image skipped by arrows and forward/reverse Tab, forced click produces zero child and selection callbacks. Native key cancellation produces zero click/selection callbacks.
- Hover/focus/arrows/Home/End/Escape alone do not select, invoke onClick or move focus outside the picker.
- Prevented consumer click still selects: exact child-before-parent order, prevented event and value/source are checked. This hook does not use click default prevention as a selection veto.
- Native aria-labelledby/title names and CSS background rather than an img child; native keyboard activation remains usable.
- Standalone default context stays radio/unselected while native consumer click fires; repeated selection emits one request per activation and does not deselect.

## Round 3 unit-derived and lifecycle assertions

- Hook unit context precedence: direct size/shape are ignored, standalone defaults medium/square and provider large/circular win, with actual computed dimensions/radius and activation.
- Component conformance refs/native root: root identity/static + consumer class, id/title/name/type/data, root children survive selection; object/callback refs clear after unmount. No invented secondary slots.
- Base-hook style spread: overridden background paints a different local image while the selection callback reports the original src/value.
- Controlled selectedValue rejects user request until external state changes; defaultSelectedValue initializes once and does not reset user selection.
- Same root rerenders with current src/value/consumer + parent callbacks, currentTarget/version and exact event identity/envelope in child-before-parent order.
- Context layout/selected value/size/shape switches update role, mutually exclusive ARIA and dimensions/radius. Consumer native role/ARIA overrides win while selection still reports source value.

No production changes have been necessary. All execution/review/integrity evidence lives in the artifact checkpoint. Actual image decoding, forced colors, screen-reader announcement and sibling spacing/preview application algorithms are not certified.
