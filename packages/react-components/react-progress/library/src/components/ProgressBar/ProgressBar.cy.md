# ProgressBar browser coverage

This suite is scoped to ProgressBar. Production implementation and existing unit
tests are unchanged. The portable component-local configuration selects exactly
`ProgressBar.cy.tsx` and uses the package's existing Nx lint command override
because this package has no inferred e2e target.

## Finite supported inventory

| Surface                | Browser assertions                                                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Determinate range      | `value` 0, fractional values, completion; default max 1 and custom max 42; a fractional positive max; actual filled width and logical-start alignment                                                                                   |
| Indeterminate          | Undefined value omits all three range attributes, including min/max; progressbar role and one bar slot; real infinite animation, explicit null motion, custom render-function motion                                                    |
| Design props           | Both thicknesses crossed with both shapes; inherited bar radius and actual height; all four colors in light/dark themes; Field's existing none/error/warning/success color context and explicit override                                |
| Accessibility          | Computed accessible names/descriptions, label/hint/message/external ID relationships, independent instances, explicit naming override, native value text                                                                                |
| Passive behavior       | Real Tab skips the default root; pointer click does not change value; explicit consumer tabIndex and handlers remain usable; no automatic live region, busy flag or completion announcements                                            |
| Native/slot behavior   | Root ID/title/class/style and forward ref; bar class/style/ref; resolved root/bar render functions; native role/range overrides; latest handlers and bar-to-root bubbling                                                               |
| Lifecycle              | Zero to half to unknown to complete, dynamic max, no stale range/inline width/motion; removal cancels motion and clears refs; remount creates fresh nodes/animation                                                                     |
| Layout/motion          | LTR/RTL determinate geometry; actual advancing Web Animations timeline; real intermediate CSS width transition and natural completion; immediate reset; actual reduced-motion and forced-colors media                                   |
| Source/unit boundaries | Negative/zero max fall back to 1 with diagnostics (zero max is not a supported maximum); negative value clamps to 0; above-max clamps to max; valid inputs have no diagnostics; absolute value threshold 0/0.009/0.01/0.011 with max 42 |
| Customization          | Consumer classes win, bar inline width wins over derived width while semantic value remains unchanged; positive control retains defaults                                                                                                |

ARIA labels, descriptions, status announcements and application loading state are
consumer-owned. Field integration is tested only as implemented: it does not
establish new error, validation or form-submission guarantees. There is no
uncontrolled progress state, keyboard value editing, or pointer value editing.
Nonfinite inputs are outside the documented finite number range and are not
assigned invented fallback semantics.

## Inherited documentation discrepancies

The historical spec promises right-to-left indeterminate travel in RTL. Real
browser evidence shows that the current motion travels left-to-right in both
directions. The original failing assertion, exact measured coordinates, logs
and screenshot are retained in session evidence. The explicitly named
characterization tests do not present this behavior as compliance with the spec.

The historical spec also says reduced-motion indeterminate progress animates
once. Current source instead defines an infinite opacity pulse at full width.
The suite verifies that source-defined animation using real media emulation and
advancing frames; it does not invent an animate-once guarantee. Historical
ProgressField/validationState examples are superseded by the current Field/color
API and current stories.

## Execution and limitations

Use `nx run react-progress:lint --skipSync --skip-nx-cache --excludeTaskDependencies`
with a command override running Cypress component mode, Electron, the library
project, and `src\components\ProgressBar\ProgressBar.cypress.config.cjs`.
Set `WEBPACK_DEV_SERVER_PORT=18241` and Cypress screenshots/videos/downloads
environment paths to external evidence folders before running.

Each case resets and restores real media emulation, including after failures.
Indeterminate timeline assertions use animation readiness and a finite number of
native animation frames, never sleep, accelerated playback or fake timers.
Reduced-motion media changes receive a finite frame barrier before capturing the
live animation.
All cases run without test retries, skips, exclusive tests, snapshots or
exception suppression.

The width-transition case starts with actual quarter-width geometry and changes
the value through the real React button handler. At that commit a layout effect
captures and pauses the native animations before delayed event/frame delivery
can finish them. It seeks the actual effect to half its measured duration,
captures the native width `transitionrun` event, and separately asserts exactly
one owned CSS width transition with the independent expected duration of 300ms.
Actual visible width must lie strictly between the endpoints. All captured
animations then resume at normal speed and their native `finished` promises
must resolve before checking the endpoint and immediate zero reset. No width
style writes or replacement motion are used. Failure cleanup removes the event
listener and cancels captured animations; no browser scheduler is replaced.
Assertions remain in the returned Cypress chain. Historical late-frame failures
remain auditable but are superseded, not causal mutation evidence or proof of
stability.

This is finite coverage in Electron/Chromium, not exhaustive permutations of
infinite numeric inputs, universal browser coverage, or proof of assistive
technology speech. Exact cases, commands, all failed/corrected rounds, hashes,
and independently isolated source-resolved type diagnostics are recorded in
`ProgressBar-evidence.json` under the session evidence directory.
