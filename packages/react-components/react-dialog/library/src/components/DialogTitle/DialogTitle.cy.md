# DialogTitle browser coverage

All 37 existing scenarios and their heading, action, role/name, event, ref and
style assertions remain. Open-dialog fixtures now complete an owner-retained
handoff after those original assertions: the three original fixtures use their
existing real Close button, and the dynamic title fixture uses real Escape from
its existing update button. Already-closing cases retain their original actions
and focus checks.

Each handoff observes surface removal and native accessibility exposure of the
retained mount root before its provider is disposed. No attributes are removed
by the test, no heading query accepts hidden content, and no global teardown
hook can skip later cases. The loaded sweep's four standalone accessible-heading
query failures are consistent with stale modal isolation, but the prior
single-worker 37/37 result does not establish precise race causality.

This is test-only synchronization and real fixture dismissal, not a component
production fix. Retries, timeouts, original default/hidden/aria-hidden semantics,
typed render functions and hook/style/render recomposition are unchanged.
