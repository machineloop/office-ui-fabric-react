# React components Cypress spec copies

This directory contains all 188 byte-identical spec copies from the final-sweep
manifest, including base `Button.cy.tsx`. No base Image spec was present.
CompoundButton, MenuButton, SplitButton, and ToggleButton are also included.

The directory mirrors `packages/react-components`, with the `react-` prefix
removed from package directory names. All remaining paths are preserved, including
the `deprecated` namespace, component subdirectories, and `testing` directories.
For example:

```text
react-components/react-accordion/library/src/components/Accordion/Accordion.cy.stories.tsx
react-components-e2e/accordion/library/src/components/Accordion/Accordion.cy.stories.tsx
```

`manifest.json` records every source path, destination path, SHA-256 hash, original
Cypress configuration, and original working directory. The manifest inventory is
authoritative here; an exact mapping to the numbered top 142 components has not
been established. Infrastructure, compatibility, and headless suites present in
the original manifest are retained.

## Supporting imports

`analyze-imports.cjs` uses the repository TypeScript parser and resolver to trace
imports, re-exports, literal dynamic imports, `require` calls, and configuration
inheritance. Static `path.join` and `path.resolve` expressions in configuration
imports are evaluated without executing those configurations. Unresolved local
imports and unsupported dynamic requests fail the analysis rather than silently
being omitted.

Checked-in `cy.readFile` inputs, fixture responses, finite asset-name arrays, and
reachable fake-package metadata are included. Runtime-generated evidence and
screenshots are not copied as inputs; their reads are recorded separately.

`support-manifest.json` records the reachable spec, fixture/story/helper, and
configuration files, their hashes, and the import edges that require them.
Only reachable supporting files are copied; entire component directories,
documentation, unit tests, snapshots, and generated library outputs are not.

Imports in copied files are unchanged. The execution adapter resolves copied
test support from this directory and production imports from the corresponding
original `packages/react-components` files. Shared repository infrastructure and
installed dependencies are reused. Original Cypress configurations retain their
original resolution roots; their mirrored copies are recorded for provenance,
not independently executable configuration entry points.

This is an in-repository test project, not a standalone distribution of Fluent UI
or its build tools. It requires the existing dependencies and prebuilt Cypress
helpers.

## Execution

From the repository root, with the repository-supported Node 22 runtime and
existing dependencies available, run all 188 specs:

```powershell
node node_modules\nx\bin\nx.js run react-components-e2e:e2e --excludeTaskDependencies --skipSync --skipNxCache -- --browser=electron --workers=4 --port=33000 --output-root="C:\fluentui-e2e-results"
```

The output directory must be outside the repository. The harness defaults to
Chrome; the command above explicitly uses bundled Electron. On October 14, 2026,
Chrome 155 reproduced the same CarouselNavImageButton R1.01 selection failure in
both mirrored and unchanged original suites; the Electron integration run passed
that scenario. This establishes an original-suite/browser-sensitive failure,
not proof that the Chrome upgrade caused it. Exact spec paths or package names
can select a smaller set:

```powershell
node node_modules\nx\bin\nx.js run react-components-e2e:e2e --excludeTaskDependencies --skipSync --skipNxCache -- --browser=electron --package=button --output-root="C:\fluentui-e2e-results"
```

Use `--list` to preview the selected jobs without launching browsers. Regenerate
the supporting dependency inventory and verify the harness contracts with:

```powershell
node node_modules\nx\bin\nx.js run react-components-e2e:analyze --excludeTaskDependencies --skipSync --skipNxCache
node node_modules\nx\bin\nx.js run react-components-e2e:test-harness --excludeTaskDependencies --skipSync --skipNxCache
```

Execution serializes jobs sharing an original package root and uses isolated
ports, browser profiles, caches, and test-generated files. Retries are disabled.
Original configurations and prebuilt helpers are reused; this does not perform
prerequisite builds or establish cold-build acceptance.

Each run includes `timing-results.json`, raw Cypress and JUnit results, webpack
resource-resolution audits, and `runtime-inputs.json` receipts for mirrored asset
reads. These distinguish executing mirrored specs/support from merely running
the original test files.

`production-seal.json` captures original component files before any Cypress
configuration or hook runs. `production-audit.json` verifies their bytes and
inventory after execution. Per-job `spec-execution.json` receipts require every
selected authored-test spec to execute exactly once with passing cases; compiled target anchors
must identify the actual original component or hook under test, not merely an
auxiliary dependency. Nested installed `node_modules` dependencies are not
classified as component source, but compiled dependency writes are still checked.

The original inventory includes two zero-case style-helper entry points
(`Card.functional.styles.cy.tsx` and `Tag.cy.styles.cy.tsx`) and an intentionally
pending-only headless SwatchPicker spec. Exact source/config hashes and original
case identities bind these three exceptions. Helpers report `SUPPORT_ONLY` only
after their real authored owner tests pass and compile the mirrored helper.
The pending-only spec reports `BASELINE_PENDING`, not passing tests. Unknown empty
or all-pending suites still fail validation. A complete accepted inventory uses
`PASSED_WITH_BASELINE_EXCEPTIONS`.

For an isolated helper verification without its owner selected, provide
`--baseline-run` pointing to an unchanged, verified owner run. The runner checks
the owner results, actual helper consumption, mapped input hashes, and original
production seal before accepting that evidence.

## Verified results

On October 14, 2026, all 188 spec identities were accounted for on Electron:
9,569 passing cases, zero failures or skipped cases, and the same nine original
pending cases. All 9,578 authored case identities were preserved. The full
four-worker execution took 36 minutes; the three original baseline-specific
contracts were then corrected and freshly verified in a 77-second serial run.
Acceptance is consolidated across those receipts, not claimed as a single fresh
full run of the final harness revision.

The mirror contains 188 specs, 261 reachable supporting files, and 267
configuration files. Copies are byte-identical to their originals. The source
guard verified 20,322 original repository files, the original tracked inventory,
working-tree status outside this directory, and HEAD remained unchanged.

Original files were not moved or modified.
