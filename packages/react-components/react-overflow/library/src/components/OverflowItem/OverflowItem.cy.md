# OverflowItem browser coverage

Sources: Overflow description, priority story, pinned/minimumVisible guidance,
OverflowItem ref-propagation unit tests and registration/trigger implementation.

Documented scenarios cover resize hide/restore, visibility/group snapshots,
priority order, pinned items, minimumVisible and real overflow-menu composition.
Edges cover hidden-child tab exclusion and restoration, dynamic registration/
removal, and standalone child semantics/events. Unit-derived contracts cover
merged refs, no extra wrapper, both MenuTrigger nesting orders, working menus
and ref cleanup.

The fixture supplies fixed-width nonshrinking children and unique IDs as required
by registration. It does not certify arbitrary layouts, every divider/vertical/
virtualized composition, duplicate-ID misuse or application menu policy.
Electron evidence is not exhaustive, axe, visual or screen-reader certification.

From react-overflow/library with repository NODE_PATH and TS_NODE_COMPILER:

```text
cypress run --component --browser electron --config-file src/components/OverflowItem/cypress.config.cjs
tsc --noEmit -p src/components/OverflowItem/tsconfig.cy.json
```

Port 45179 is overridable via WEBPACK_DEV_SERVER_PORT. Retries/screenshots are
disabled; validation-only `.stories` files reuse existing exclusions.
