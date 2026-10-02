# AccordionPanel browser coverage

The component-local CommonJS runner reuses the existing package Accordion runner
while independently discovering this story-suffixed suite and explicit browser
TypeScript project. Zero retries, native pointer/keyboard interactions and actual
Web Animations API timing are used.

Documented Default, Controlled, Multiple and Disabled stories cover content
presence. The MotionCustom story's documented direct duration/easing/opacity API
is exercised with local button/input content, avoiding its unrelated remote
Persona images. Default spacing is measured in computed browser styles.

Native/source/unit-informed cases cover Enter/Space and forward/reverse tab
access, closed/collapsing inertness, start/finish direction callbacks, imperative
pause/resume and interrupted exit recovery, null/custom motion presence,
caller-supplied tabIndex, ARIA/native metadata/classes/styles, object/callback
refs across committed presence cleanup, dynamic motion parameters/handlers,
deprecated arrow-mover exclusion, live provider spacing and standalone absence.

Chrome media emulation explicitly selects normal motion for timing assertions;
a separate reduced-motion case verifies 1ms timing and callbacks. Each case
restores the browser media override. This does not change or certify OS settings.
Ordinary axe rules run without exclusions on labeled interactive content.
Complete WCAG, screen-reader speech, OS forced-colors and StrictMode are not
claimed. Motion waits observe actual animation completion, never fixed sleeps.
