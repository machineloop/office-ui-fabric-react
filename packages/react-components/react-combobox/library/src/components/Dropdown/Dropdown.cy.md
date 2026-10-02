# Dropdown mutation coverage notes

The suite preserves the original 102 scenarios and adds two native-keyboard
callback scenarios. Dropdown's primary slot is a native button, so a top-level
`onKeyDown` must reach that button unless an explicit `button.onKeyDown` overrides
it. Both paths compose with internal opening, navigation, selection, and default
prevention.

The top-level scenario uses trusted real keyboard events on an explicit submit
button. It checks exact callback counts, event identity and target, default
prevention, open/selection payloads, callback order, no form submission, focus,
and the selected option after reopening. The slot scenario is a positive control
for override precedence and internal selection. Both use uncontrolled state only;
neither mixes controlled and default props or adds timers.

Representative memory-only regressions cover deferred first matching after
opening, pre-mount repeated-character fallback versus already-open cycling,
navigation preserving the search expiry timer, primary native callback
forwarding, and rendered icon layout in both directions. These are finite
representative contracts, not exhaustive input or browser coverage.

No production or unit-test changes belong to this follow-up. Parent review and a
fresh baseline on current shared master are required before transferring these
isolated test changes.
