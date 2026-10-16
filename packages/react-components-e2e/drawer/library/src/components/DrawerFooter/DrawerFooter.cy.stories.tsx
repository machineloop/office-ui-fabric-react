import * as React from 'react';
import * as axe from 'axe-core';
import { mount } from '@fluentui/scripts-cypress';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Button,
  makeStyles,
  useRestoreFocusSource,
  useRestoreFocusTarget,
  createPresenceComponent,
  motionTokens,
} from '@fluentui/react-components';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-components';
import { DrawerFooter } from './DrawerFooter';
import type { DrawerFooterProps, DrawerFooterState } from './DrawerFooter.types';
import { drawerFooterClassNames } from './useDrawerFooterStyles.styles';
import { DrawerBody } from '../DrawerBody/DrawerBody';
import { InlineDrawer } from '../InlineDrawer/InlineDrawer';
import { OverlayDrawer } from '../OverlayDrawer/OverlayDrawer';
import { DrawerHeader } from '../DrawerHeader/DrawerHeader';
import { DrawerHeaderTitle } from '../DrawerHeaderTitle/DrawerHeaderTitle';
import { Drawer } from '../Drawer/Drawer';
import type { DrawerProps } from '../Drawer/Drawer.types';

const round = Number(Cypress.env('coverageRound') || 7);
const auditReports: unknown[] = [];
const recordAudit = (report: unknown) => {
  auditReports.push(report);
  return cy.writeFile(
    String(Cypress.env('footerAuditFile') || 'src/components/DrawerFooter/.cypress-downloads/audits.json'),
    auditReports,
    { log: false },
  );
};
beforeEach(() => {
  // Tabster can leave aria-hidden on Cypress's reused, now-empty mounting host after modal teardown.
  cy.get('#__cy_root').should('be.empty').invoke('removeAttr', 'aria-hidden');
  cy.window().then(win => {
    const native = win.matchMedia.bind(win);
    cy.stub(win, 'matchMedia').callsFake((query: string) =>
      native(query.includes('prefers-reduced-motion') ? 'not all' : query),
    );
  });
});
const mountFluent = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  mount(
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
const footer = () => cy.get('#footer');
function assertFooterAction(action: HTMLElement | null, message: string): asserts action is HTMLElement {
  expect(action, message).not.to.equal(null);
}
const footerActionRect = (root: Element, selector: '#primary' | '#secondary'): DOMRect => {
  const action = root.querySelector<HTMLElement>(selector);
  assertFooterAction(action, `footer child ${selector} must exist before measuring geometry`);
  return action.getBoundingClientRect();
};
const pseudo = (opacity: string, selector = '#footer') =>
  cy.get(selector).should($el => {
    const style = $el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::before');
    expect(style.opacity, 'separator opacity').to.equal(opacity);
  });
const knownPresentationConflicts = [
  {
    scenario: 'R1.03 forwards the root ref to the actual footer and supports focus',
    phase: 'focused root',
    label: 'Actions',
    tabIndex: '0',
    text: 'Save',
  },
  {
    scenario: 'R1.15 updates children, ARIA, class and styles on the same root',
    phase: 'updated actions',
    label: 'Updated actions',
    tabIndex: null,
    text: 'Publish',
  },
];
const matchesPresentationProfile = (
  scenario: string,
  phase: string,
  selector: string,
  element: HTMLElement,
  violations: { id: string; nodes: { target: axe.NodeResult['target'] }[] }[],
) => {
  const known = knownPresentationConflicts.find(entry => entry.scenario === scenario && entry.phase === phase);
  return (
    !!known &&
    selector === '#footer' &&
    element.tagName === 'FOOTER' &&
    element.getAttribute('role') === 'none' &&
    element.getAttribute('aria-label') === known.label &&
    element.getAttribute('tabindex') === known.tabIndex &&
    element.textContent === known.text &&
    violations.length === 1 &&
    violations[0].id === 'presentation-role-conflict' &&
    violations[0].nodes.length === 1 &&
    JSON.stringify(violations[0].nodes[0].target) === '["#footer"]'
  );
};
const modalProfiles = [
  ['R2.01 overlay scrolls top-middle-bottom-top and transitions exact separators', 'scroll returned top'],
  ['R2.03 overlay without header fits short content without a separator', 'short content'],
  ['R2.03 overlay with header fits short content without a separator', 'short content'],
  ['R2.04 overlay keyboard PageDown and End scroll leave actions reachable', 'keyboard body scroll'],
  ['R3.11 modal footer traps forward and backward Tab instead of leaking to background', 'modal trap'],
];
const matchesModalScenario = (scenario: string, phase: string, selector: string) =>
  selector === '#drawer' && modalProfiles.some(([title, stage]) => title === scenario && stage === phase);
const audit = (phase: string, selector = '#footer', modalSentinels = false) =>
  cy
    .get(selector)
    .should($el => {
      expect($el[0].closest('[aria-hidden="true"]')).to.equal(null);
      let ancestor: HTMLElement | null = $el[0];
      while (ancestor) {
        expect(ancestor.getAnimations().filter(animation => animation.playState === 'running')).to.have.length(0);
        ancestor = ancestor.parentElement;
      }
    })
    .then($el =>
      cy
        .then(() => axe.run($el[0]))
        .then(result => {
          const report = {
            scenario: Cypress.currentTest.title,
            phase,
            scope: selector,
            passes: result.passes.map(({ id }) => id),
            violations: result.violations.map(({ id, nodes }) => ({
              id,
              nodes: nodes.map(({ target, html, failureSummary }) => ({ target, html, failureSummary })),
            })),
            incomplete: result.incomplete.map(({ id, nodes }) => ({
              id,
              nodes: nodes.map(({ target, html, any: anyChecks, all, none }) => ({
                target,
                html,
                anyChecks,
                all,
                none,
              })),
            })),
          };
          return recordAudit(report).then(() => {
            const known = knownPresentationConflicts.find(
              entry => entry.scenario === report.scenario && entry.phase === phase,
            );
            if (known) {
              expect(matchesPresentationProfile(report.scenario, phase, selector, $el[0], report.violations)).to.equal(
                true,
              );
              expect(selector).to.equal('#footer');
              expect(
                report.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })),
              ).to.deep.equal([{ id: 'presentation-role-conflict', targets: [['#footer']] }]);
              expect($el[0].tagName).to.equal('FOOTER');
              expect($el[0].getAttribute('role')).to.equal('none');
              expect($el[0].getAttribute('aria-label')).to.equal(known.label);
              expect($el[0].getAttribute('tabindex')).to.equal(known.tabIndex);
              expect($el[0].textContent).to.equal(known.text);
            } else {
              expect(report.violations, `${phase}: violations`).to.deep.equal([]);
            }
            if (modalSentinels) {
              expect(matchesModalScenario(report.scenario, phase, selector)).to.equal(true);
              expect(selector).to.equal('#drawer');
              expect($el[0].getAttribute('aria-modal')).to.equal('true');
              expect($el[0].classList.contains('fui-OverlayDrawer')).to.equal(true);
              expect(report.incomplete.map(({ id }) => id)).to.deep.equal(['aria-hidden-focus']);
              const nodes = result.incomplete[0].nodes;
              const sentinels = $el[0].querySelectorAll(':scope > i[data-tabster-dummy]');
              expect(sentinels.length).to.equal(2);
              expect(nodes.length).to.equal(2);
              nodes.forEach((node, index) => {
                expect(node.target.length).to.equal(1);
                expect(typeof node.target[0]).to.equal('string');
                expect($el[0].ownerDocument.querySelector(String(node.target[0]))).to.equal(sentinels[index]);
                expect(sentinels[index].getAttribute('role')).to.equal('none');
                expect(sentinels[index].getAttribute('aria-hidden')).to.equal('true');
                expect(sentinels[index].getAttribute('tabindex')).to.equal('0');
                expect(sentinels[index].getAttribute('data-tabster-dummy')).to.equal(
                  `isFirst=${index === 0}, isOutside=false, (Modalizer, tabbable=true)`,
                );
                expect(node.any).to.deep.equal([]);
                expect(node.none).to.deep.equal([]);
                expect(node.all.map(check => check.id)).to.deep.equal(['focusable-modal-open']);
                expect(node.all[0].data).to.equal(null);
                expect(node.all[0].impact).to.equal('serious');
                expect(node.all[0].relatedNodes).to.have.length(1);
                expect(node.all[0].relatedNodes![0].target).to.deep.equal(node.target);
                expect(node.all[0].relatedNodes![0].html).to.equal(node.html);
              });
            } else {
              expect(report.incomplete, `${phase}: incomplete`).to.deep.equal([]);
            }
            expect(report.passes.length).to.be.greaterThan(0);
          });
        }),
    );

type Context = 'inline' | 'overlay';
const ScrollFixture = ({
  context,
  header = true,
  contentHeight = 1000,
  height = 400,
  footerProps,
  footerRef,
}: {
  context: Context;
  header?: boolean;
  contentHeight?: number;
  height?: number;
  footerProps?: DrawerFooterProps;
  footerRef?: React.Ref<HTMLElement>;
}) => {
  const children = (
    <>
      {header && (
        <DrawerHeader id="header">
          <DrawerHeaderTitle>Settings</DrawerHeaderTitle>
        </DrawerHeader>
      )}
      <DrawerBody id="body" tabIndex={0} role="group" aria-label="Scrollable settings">
        <div id="content" style={{ height: contentHeight }}>
          Settings content
        </div>
      </DrawerBody>
      <DrawerFooter id="footer" ref={footerRef} {...footerProps}>
        <Button id="primary" appearance="primary">
          Save
        </Button>
        <Button id="secondary">Cancel</Button>
      </DrawerFooter>
    </>
  );
  return context === 'inline' ? (
    <InlineDrawer id="drawer" role="region" aria-label="Settings" open style={{ height }}>
      {children}
    </InlineDrawer>
  ) : (
    <OverlayDrawer id="drawer" aria-label="Settings" open style={{ height }} surfaceMotion={null} backdropMotion={null}>
      {children}
    </OverlayDrawer>
  );
};
const useOverrides = makeStyles({ footer: { justifyContent: 'space-between', padding: '10px', columnGap: '12px' } });
const StyledFooter = () => (
  <DrawerFooter id="footer" className={useOverrides().footer}>
    <Button id="primary">Previous</Button>
    <Button id="secondary">Next</Button>
  </DrawerFooter>
);
const ActionFixture = ({ context, dir = 'ltr' }: { context: Context; dir?: 'ltr' | 'rtl' }) => {
  const [count, setCount] = React.useState(0);
  const children = (
    <DrawerFooter id="footer">
      <Button id="primary" appearance="primary" onClick={() => setCount(value => value + 1)}>
        Save
      </Button>
      <Button id="disabled" disabled onClick={() => setCount(999)}>
        Disabled
      </Button>
      <Button id="secondary" onClick={() => setCount(value => value + 10)}>
        Cancel
      </Button>
      <a id="help" href="#help-target">
        Help
      </a>
      <output id="count" aria-live="polite">
        {count}
      </output>
    </DrawerFooter>
  );
  return (
    <FluentProvider theme={webLightTheme} dir={dir}>
      <button id="before">Before</button>
      {context === 'inline' ? (
        <InlineDrawer id="drawer" open role="region" aria-label="Actions" surfaceMotion={null}>
          {children}
        </InlineDrawer>
      ) : (
        <OverlayDrawer id="drawer" open aria-label="Actions" surfaceMotion={null} backdropMotion={null}>
          {children}
        </OverlayDrawer>
      )}
      <button id="after">After</button>
      <div id="help-target">Help content</div>
    </FluentProvider>
  );
};
const CustomMotion = createPresenceComponent(() => ({
  enter: { keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 1000 },
  exit: { keyframes: [{ opacity: 1 }, { opacity: 0 }], duration: 1000 },
}));
const LifecycleFixture = ({
  context,
  kept = false,
  motion = 'default',
  modalType = 'modal',
  position = 'start',
  onMotion,
  onOpenChange,
  preventBackdropFocus = false,
}: {
  context: Context;
  kept?: boolean;
  motion?: 'default' | 'disabled' | 'custom';
  modalType?: 'modal' | 'non-modal' | 'alert';
  position?: DrawerProps['position'];
  onMotion?: (phase: string, direction: string) => void;
  onOpenChange?: (type: string, open: boolean) => void;
  preventBackdropFocus?: boolean;
}) => {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  const target = useRestoreFocusTarget();
  const source = useRestoreFocusSource();
  const surfaceMotion =
    motion === 'disabled'
      ? null
      : motion === 'custom'
      ? {
          children: (_: unknown, props: React.ComponentProps<typeof CustomMotion>) => (
            <CustomMotion
              {...props}
              onMotionStart={(ev, data) => {
                props.onMotionStart?.(ev, data);
                onMotion?.('start', data.direction);
              }}
              onMotionFinish={(ev, data) => {
                props.onMotionFinish?.(ev, data);
                onMotion?.('finish', data.direction);
              }}
            />
          ),
        }
      : undefined;
  const content = (
    <>
      <DrawerHeader>
        <DrawerHeaderTitle>Settings</DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <label htmlFor="value">Draft</label>
        <input id="value" value={value} onChange={ev => setValue(ev.target.value)} />
      </DrawerBody>
      <DrawerFooter id="footer">
        <Button id="save" appearance="primary" onClick={() => setOpen(false)}>
          Save
        </Button>
        <Button id="cancel" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </DrawerFooter>
    </>
  );
  const shared = { id: 'drawer', open, unmountOnClose: !kept, surfaceMotion, position, ...source };
  return (
    <>
      <button id="trigger" {...target} onClick={() => setOpen(true)}>
        Open settings
      </button>
      {context === 'inline' ? (
        <InlineDrawer {...shared} role="region" aria-label="Settings">
          {content}
        </InlineDrawer>
      ) : (
        <OverlayDrawer
          {...shared}
          aria-label="Settings"
          modalType={modalType}
          backdropMotion={motion === 'disabled' ? null : undefined}
          backdrop={preventBackdropFocus ? { onMouseDown: ev => ev.preventDefault() } : undefined}
          onOpenChange={(_, data) => {
            onOpenChange?.(data.type, data.open);
            if (modalType !== 'alert') {
              setOpen(data.open);
            }
          }}
        >
          {content}
        </OverlayDrawer>
      )}
      <button id="outside" style={{ marginLeft: context === 'overlay' ? 400 : 0 }}>
        Outside
      </button>
    </>
  );
};
const UpdateScrollFixture = ({ context }: { context: Context }) => {
  const [long, setLong] = React.useState(false);
  const [height, setHeight] = React.useState(400);
  const content = (
    <>
      <DrawerBody id="body" tabIndex={0} role="group" aria-label="Scrollable updates">
        <div style={{ height: long ? 800 : 20 }}>Updated content</div>
      </DrawerBody>
      <DrawerFooter id="footer">
        <Button id="grow" onClick={() => setLong(value => !value)}>
          Toggle content
        </Button>
        <Button id="resize" onClick={() => setHeight(value => (value === 400 ? 1000 : 400))}>
          Resize
        </Button>
      </DrawerFooter>
    </>
  );
  return context === 'inline' ? (
    <InlineDrawer id="drawer" open style={{ height }} surfaceMotion={null}>
      {content}
    </InlineDrawer>
  ) : (
    <OverlayDrawer id="drawer" open aria-label="Updates" style={{ height }} surfaceMotion={null} backdropMotion={null}>
      {content}
    </OverlayDrawer>
  );
};
const ResponsiveFixture = () => {
  const [type, setType] = React.useState<'inline' | 'overlay'>('inline');
  React.useEffect(() => {
    const query = window.matchMedia('(max-width: 720px)');
    const update = () => setType(query.matches ? 'overlay' : 'inline');
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return (
    <Drawer
      id="drawer"
      open
      type={type}
      aria-label="Responsive settings"
      surfaceMotion={null}
      backdropMotion={null}
      style={{ height: 400 }}
    >
      <DrawerBody tabIndex={0}>Responsive content</DrawerBody>
      <DrawerFooter id="footer">
        <Button id="primary">Save</Button>
        <Button id="secondary">Cancel</Button>
      </DrawerFooter>
    </Drawer>
  );
};

if (round >= 5) {
  describe('ONLY125 DrawerFooter R5 documented ownership gaps', () => {
    for (const context of ['inline', 'overlay'] as const) {
      it(`R5.01 ${context} consumer footer close does not synthesize drawer onOpenChange`, () => {
        const change = cy.spy();
        mountFluent(<LifecycleFixture context={context} onOpenChange={change} />);
        cy.get('#trigger').realClick();
        cy.get('#drawer').should($el =>
          expect($el[0].getAnimations().filter(item => item.playState === 'running')).to.have.length(0),
        );
        cy.get('#save').realClick();
        footer().should('not.exist');
        cy.get('#trigger').should('be.focused');
        cy.then(() => expect(change).not.to.have.been.called);
      });
    }
    it('R5.02 non-modal footer remains reachable by native Tab and consumer closure restores focus', () => {
      mountFluent(<LifecycleFixture context="overlay" modalType="non-modal" motion="disabled" />);
      cy.get('#trigger').realClick();
      cy.get('#value').focus();
      cy.realPress('Tab');
      cy.focused().should('have.id', 'save');
      cy.realPress('Tab');
      cy.focused().should('have.id', 'cancel');
      audit('non-modal keyboard actions');
      cy.realPress('Enter');
      footer().should('not.exist');
      cy.get('#trigger').should('be.focused');
    });
  });
}

if (round >= 6) {
  describe('ONLY125 DrawerFooter R6 native edges and classifier controls', () => {
    it('R6.01 frozen native props retain exact trusted capture-child-bubble order and payload', () => {
      const events: unknown[][] = [];
      const capture: React.MouseEventHandler<HTMLElement> = ev =>
        events.push(['capture', ev.type, ev.currentTarget.id, (ev.target as HTMLElement).id, ev.nativeEvent.isTrusted]);
      const bubble: React.MouseEventHandler<HTMLElement> = ev =>
        events.push(['bubble', ev.type, ev.currentTarget.id, (ev.target as HTMLElement).id, ev.nativeEvent.isTrusted]);
      const style = Object.freeze({ padding: 10 });
      const props = Object.freeze({
        id: 'footer',
        className: 'frozen-footer',
        style,
        onClickCapture: capture,
        onClick: bubble,
      });
      mountFluent(
        <DrawerFooter {...props}>
          <button
            id="native"
            onClick={ev =>
              events.push([
                'child',
                ev.type,
                ev.currentTarget.id,
                (ev.target as HTMLElement).id,
                ev.nativeEvent.isTrusted,
              ])
            }
          >
            Save
          </button>
        </DrawerFooter>,
      );
      cy.get('#native').realClick();
      cy.then(() => {
        expect(events).to.deep.equal([
          ['capture', 'click', 'footer', 'native', true],
          ['child', 'click', 'native', 'native', true],
          ['bubble', 'click', 'footer', 'native', true],
        ]);
        expect(props).to.deep.equal({
          id: 'footer',
          className: 'frozen-footer',
          style,
          onClickCapture: capture,
          onClick: bubble,
        });
        expect(Object.isFrozen(props)).to.equal(true);
        expect(Object.isFrozen(style)).to.equal(true);
      });
      footer().should('have.class', 'frozen-footer').and('have.css', 'padding', '10px');
      audit('frozen native props');
    });
    it('R6.02 real Enter follows a footer child native link without inventing an action callback', () => {
      const clicks: unknown[][] = [];
      mountFluent(
        <>
          <DrawerFooter
            id="footer"
            onClick={ev => clicks.push([ev.type, ev.nativeEvent.isTrusted, ev.defaultPrevented])}
          >
            <a id="native-link" href="#footer-native-target">
              Help
            </a>
          </DrawerFooter>
          <div id="footer-native-target">Help content</div>
        </>,
      );
      cy.get('#native-link').focus();
      cy.realPress('Enter');
      cy.location('hash').should('equal', '#footer-native-target');
      cy.then(() => expect(clicks).to.deep.equal([['click', true, false]]));
      footer().should('have.attr', 'role', 'none');
      audit('native link navigation');
      cy.window().then(win => win.history.replaceState(null, '', win.location.pathname + win.location.search));
    });
    it('R6.03 replacing a native callback uses only the latest owner without remounting the footer', () => {
      const calls: string[] = [];
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setUpdated(true)}>
              Update
            </button>
            <DrawerFooter id="footer" onClick={() => calls.push(updated ? 'latest' : 'original')}>
              <Button id="primary">Save</Button>
            </DrawerFooter>
          </>
        );
      };
      let original: HTMLElement;
      mountFluent(<Fixture />);
      footer().then($el => {
        original = $el[0];
      });
      cy.get('#primary').realClick();
      cy.get('#update').realClick();
      cy.get('#primary').realClick();
      footer().then($el => expect($el[0]).to.equal(original));
      cy.then(() => expect(calls).to.deep.equal(['original', 'latest']));
      audit('latest native callback');
    });
    it('R6.04 presentation classifier rejects wrong scenario phase scope rule node and DOM profile', () => {
      mountFluent(
        <DrawerFooter id="footer" tabIndex={0} aria-label="Actions">
          <Button>Save</Button>
        </DrawerFooter>,
      );
      footer().then($el =>
        cy
          .then(() => axe.run($el[0]))
          .then(result => {
            expect(result.incomplete).to.deep.equal([]);
            const scenario = knownPresentationConflicts[0].scenario;
            const phase = 'focused root';
            const valid = (title: string, stage: string, scope: string, violations = result.violations) =>
              matchesPresentationProfile(title, stage, scope, $el[0], violations);
            expect(valid(scenario, phase, '#footer')).to.equal(true);
            expect(valid('unrelated scenario', phase, '#footer')).to.equal(false);
            expect(valid(scenario, 'different phase', '#footer')).to.equal(false);
            expect(valid(scenario, phase, '#drawer')).to.equal(false);
            expect(valid(scenario, phase, '#footer', [{ ...result.violations[0], id: 'button-name' }])).to.equal(false);
            expect(valid(scenario, phase, '#footer', [])).to.equal(false);
            expect(valid(scenario, phase, '#footer', [result.violations[0], result.violations[0]])).to.equal(false);
            expect(
              valid(scenario, phase, '#footer', [
                {
                  ...result.violations[0],
                  nodes: [{ ...result.violations[0].nodes[0], target: ['#other'] }],
                },
              ]),
            ).to.equal(false);
            const clone = $el[0].cloneNode(true) as HTMLElement;
            clone.setAttribute('role', 'group');
            expect(matchesPresentationProfile(scenario, phase, '#footer', clone, result.violations)).to.equal(false);
            clone.setAttribute('role', 'none');
            clone.setAttribute('aria-label', 'Different actions');
            expect(matchesPresentationProfile(scenario, phase, '#footer', clone, result.violations)).to.equal(false);
            clone.setAttribute('aria-label', 'Actions');
            clone.removeAttribute('tabindex');
            expect(matchesPresentationProfile(scenario, phase, '#footer', clone, result.violations)).to.equal(false);
            return recordAudit({
              scenario: Cypress.currentTest.title,
              phase: 'classifier negative controls',
              scope: '#footer',
              passes: result.passes.map(({ id }) => id),
              violations: result.violations,
              incomplete: result.incomplete,
            });
          }),
      );
    });
    it('R6.05 modal manual-incomplete classifier is restricted to exact known scenario phase and scope', () => {
      for (const [scenario, phase] of modalProfiles) {
        expect(matchesModalScenario(scenario, phase, '#drawer')).to.equal(true);
        expect(matchesModalScenario(`${scenario} changed`, phase, '#drawer')).to.equal(false);
        expect(matchesModalScenario(scenario, `${phase} changed`, '#drawer')).to.equal(false);
        expect(matchesModalScenario(scenario, phase, '#footer')).to.equal(false);
      }
    });
  });
}

describe('ONLY125 DrawerFooter R1 public API and unit-derived contracts', () => {
  it('R1.01 reproduces the unit snapshot semantics without a landmark', () => {
    mountFluent(<DrawerFooter id="footer">Default DrawerFooter</DrawerFooter>);
    footer().should('match', 'footer').and('have.attr', 'role', 'none').and('have.text', 'Default DrawerFooter');
    expect(DrawerFooter.displayName).to.equal('DrawerFooter');
    expect(drawerFooterClassNames).to.deep.equal({ root: 'fui-DrawerFooter' });
    footer().should('have.class', drawerFooterClassNames.root);
    pseudo('1');
    footer().should($el =>
      expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::before').content).to.equal('none'),
    );
  });
  it('R1.02 preserves className, intrinsic attributes and explicit role', () => {
    mountFluent(
      <DrawerFooter
        id="footer"
        className="consumer-footer"
        role="group"
        aria-label="Actions"
        title="Footer actions"
        data-version="2"
      >
        Ready
      </DrawerFooter>,
    );
    footer()
      .should('have.class', 'consumer-footer')
      .and('have.class', 'fui-DrawerFooter')
      .and('have.attr', 'role', 'group')
      .and('have.attr', 'aria-label', 'Actions')
      .and('have.attr', 'title', 'Footer actions')
      .and('have.attr', 'data-version', '2');
    audit('explicit group');
  });
  it('R1.03 forwards the root ref to the actual footer and supports focus', () => {
    const ref = React.createRef<HTMLElement>();
    mountFluent(
      <DrawerFooter id="footer" ref={ref} tabIndex={0} aria-label="Actions">
        <Button>Save</Button>
      </DrawerFooter>,
    );
    footer().then($el => {
      expect(ref.current).to.equal($el[0]);
      ref.current!.focus();
    });
    cy.focused().should('have.id', 'footer');
    audit('focused root');
  });
  it('R1.04 callback ref receives the root and null on unmount', () => {
    const ref = cy.stub().as('ref');
    const Fixture = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="remove" onClick={() => setVisible(false)}>
            Remove
          </button>
          {visible && (
            <DrawerFooter id="footer" ref={ref}>
              Content
            </DrawerFooter>
          )}
        </>
      );
    };
    mountFluent(<Fixture />);
    footer().then($el => expect(ref).to.have.been.calledWith($el[0]));
    cy.get('#remove').realClick();
    footer().should('not.exist');
    cy.get('@ref').should('have.been.calledWith', null);
  });
  it('R1.05 permits empty and null children without adding actions', () => {
    mountFluent(<DrawerFooter id="footer">{null}</DrawerFooter>);
    footer().should('be.empty').and('have.attr', 'role', 'none');
    cy.get('#footer button').should('not.exist');
  });
  it('R1.06 preserves mixed children and action DOM order', () => {
    mountFluent(
      <DrawerFooter id="footer">
        <span>Status</span>
        <Button id="primary">Save</Button>
        <a id="link" href="#help">
          Help
        </a>
      </DrawerFooter>,
    );
    footer()
      .children()
      .should($children => expect([...$children].map(el => el.tagName)).to.deep.equal(['SPAN', 'BUTTON', 'A']));
    audit('mixed children');
  });
  it('R1.07 forwards real click bubbling with the footer as currentTarget', () => {
    const click = cy.stub();
    mountFluent(
      <DrawerFooter id="footer" onClick={ev => click(ev.currentTarget.id, (ev.target as HTMLElement).id)}>
        <Button id="primary">Save</Button>
      </DrawerFooter>,
    );
    cy.get('#primary').realClick();
    cy.then(() => expect(click).to.have.been.calledOnceWithExactly('footer', 'primary'));
  });
  it('R1.08 preserves child stopPropagation without running the root click', () => {
    const root = cy.stub();
    const child = cy.stub();
    mountFluent(
      <DrawerFooter id="footer" onClick={root}>
        <Button
          id="primary"
          onClick={ev => {
            ev.stopPropagation();
            child();
          }}
        >
          Save
        </Button>
      </DrawerFooter>,
    );
    cy.get('#primary').realClick();
    cy.then(() => {
      expect(child).to.have.been.calledOnce;
      expect(root).not.to.have.been.called;
    });
  });
  it('R1.09 forwards real focus, blur and keyboard events', () => {
    const events = cy.stub();
    mountFluent(
      <>
        <DrawerFooter
          id="footer"
          onFocus={ev => events('focus', ev.currentTarget.id)}
          onBlur={ev => events('blur', ev.currentTarget.id)}
          onKeyDown={ev => events(ev.key, ev.currentTarget.id)}
        >
          <Button id="primary">Save</Button>
        </DrawerFooter>
        <button id="outside">Outside</button>
      </>,
    );
    cy.get('#primary').realClick();
    cy.realPress('ArrowRight');
    cy.realPress('Tab');
    cy.focused().should('have.id', 'outside');
    cy.then(() => {
      expect(events).to.have.been.calledWithExactly('focus', 'footer');
      expect(events).to.have.been.calledWithExactly('ArrowRight', 'footer');
      expect(events).to.have.been.calledWithExactly('blur', 'footer');
    });
  });
  it('R1.10 uses border-box flex layout and theme spacing tokens', () => {
    mountFluent(
      <DrawerFooter id="footer">
        <Button id="primary">Save</Button>
        <Button id="secondary">Cancel</Button>
      </DrawerFooter>,
    );
    footer()
      .should('have.css', 'display', 'flex')
      .and('have.css', 'box-sizing', 'border-box')
      .and('have.css', 'justify-content', 'flex-start')
      .and('have.css', 'align-items', 'center')
      .and('have.css', 'column-gap', '8px')
      .and('have.css', 'padding', '16px 24px 24px')
      .and('have.css', 'position', 'relative')
      .and('have.css', 'z-index', '2');
    footer().then($el => {
      const root = $el[0].getBoundingClientRect();
      const first = footerActionRect($el[0], '#primary');
      const second = footerActionRect($el[0], '#secondary');
      expect(first.left - root.left).to.equal(24);
      expect(second.left - first.right).to.equal(8);
      expect(first.top).to.equal(second.top);
      expect(root.width).to.equal($el[0].parentElement!.clientWidth);
    });
    audit('default actions');
  });
  it('R1.11 consumer Griffel overrides win and retain the static root class', () => {
    mountFluent(<StyledFooter />);
    footer()
      .should('have.css', 'justify-content', 'space-between')
      .and('have.css', 'padding', '10px')
      .and('have.css', 'column-gap', '12px')
      .and('have.class', 'fui-DrawerFooter');
    footer().then($el => {
      const root = $el[0].getBoundingClientRect();
      const right = footerActionRect($el[0], '#secondary').right;
      expect(root.right - right).to.equal(10);
    });
  });
  it('R1.12 explicit inline styles override default sizing and alignment', () => {
    mountFluent(
      <DrawerFooter id="footer" style={{ width: 240, padding: 4, justifyContent: 'flex-end' }}>
        <Button>Save</Button>
      </DrawerFooter>,
    );
    footer()
      .should('have.css', 'width', '240px')
      .and('have.css', 'padding', '4px')
      .and('have.css', 'justify-content', 'flex-end');
  });
  for (const dir of ['ltr', 'rtl'] as const) {
    it(`R1.13 ${dir} places actions at the logical start without reversing DOM order`, () => {
      mountFluent(
        <DrawerFooter id="footer">
          <Button id="primary">Save</Button>
          <Button id="secondary">Cancel</Button>
        </DrawerFooter>,
        dir,
      );
      footer()
        .should('have.css', 'direction', dir)
        .then($el => {
          const root = $el[0].getBoundingClientRect();
          const a = footerActionRect($el[0], '#primary');
          const b = footerActionRect($el[0], '#secondary');
          expect(dir === 'ltr' ? a.left - root.left : root.right - a.right).to.equal(24);
          expect(dir === 'ltr' ? b.left - a.right : a.left - b.right).to.equal(8);
        });
      footer().children().first().should('have.id', 'primary');
      audit(`${dir} actions`);
    });
  }
  it('R1.14 dark theme maintains readable footer actions', () => {
    mountFluent(
      <DrawerFooter id="footer">
        <Button appearance="primary">Save</Button>
        <Button>Cancel</Button>
      </DrawerFooter>,
      'ltr',
      true,
    );
    audit('dark actions');
  });
  it('R1.15 updates children, ARIA, class and styles on the same root', () => {
    const Fixture = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <DrawerFooter
            id="footer"
            aria-label={updated ? 'Updated actions' : 'Actions'}
            className={updated ? 'updated' : 'original'}
            style={{ padding: updated ? 8 : 4 }}
          >
            {updated ? <Button>Publish</Button> : 'Loading'}
          </DrawerFooter>
        </>
      );
    };
    let original: HTMLElement;
    mountFluent(<Fixture />);
    footer().then($el => {
      original = $el[0];
    });
    cy.get('#update').realClick();
    footer()
      .should('have.text', 'Publish')
      .and('have.attr', 'aria-label', 'Updated actions')
      .and('have.class', 'updated')
      .and('not.have.class', 'original')
      .and('have.css', 'padding', '8px')
      .then($el => expect($el[0]).to.equal(original));
    audit('updated actions');
  });
});

if (round >= 7) {
  describe('ONLY125 DrawerFooter R7 unit and conformance-derived gaps', () => {
    it('R7.01 replacing a callback ref detaches old owner before attaching new owner then detaches on removal', () => {
      const calls: [string, HTMLElement | null][] = [];
      const first = (node: HTMLElement | null) => {
        calls.push(['first', node]);
      };
      const second = (node: HTMLElement | null) => {
        calls.push(['second', node]);
      };
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        const [visible, setVisible] = React.useState(true);
        return (
          <>
            <button id="update" onClick={() => setUpdated(true)}>
              Update ref
            </button>
            <button id="remove" onClick={() => setVisible(false)}>
              Remove footer
            </button>
            {visible && (
              <DrawerFooter id="footer" ref={updated ? second : first}>
                <Button>Save</Button>
              </DrawerFooter>
            )}
          </>
        );
      };
      let root: HTMLElement;
      mountFluent(<Fixture />);
      footer().then($el => {
        root = $el[0];
        expect(calls).to.deep.equal([
          ['first', root],
          ['first', null],
          ['first', root],
        ]);
        calls.length = 0;
      });
      cy.get('#update').realClick();
      footer().then($el => {
        expect($el[0]).to.equal(root);
        expect(calls).to.deep.equal([
          ['first', null],
          ['second', root],
        ]);
      });
      cy.get('#remove').realClick();
      footer().should('not.exist');
      cy.then(() =>
        expect(calls).to.deep.equal([
          ['first', null],
          ['second', root],
          ['second', null],
        ]),
      );
    });
    it('R7.02 root render function may return null then forward native props class and ref when restored', () => {
      const ref = React.createRef<HTMLElement>();
      const Fixture = () => {
        const [visible, setVisible] = React.useState(false);
        const render: SlotRenderFunction<React.ComponentProps<'footer'>> = (Root, props) =>
          visible ? (
            <Root {...props}>
              <Button id="primary">Save</Button>
            </Root>
          ) : null;
        return (
          <>
            <button id="restore" onClick={() => setVisible(true)}>
              Restore footer
            </button>
            <DrawerFooter as="footer" id="footer" title="Restored actions" className="restored" ref={ref}>
              {render}
            </DrawerFooter>
          </>
        );
      };
      mountFluent(<Fixture />);
      footer().should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
      cy.get('#restore').realClick();
      footer()
        .should('match', 'footer')
        .and('have.class', 'restored')
        .and('have.class', 'fui-DrawerFooter')
        .and('have.attr', 'title', 'Restored actions')
        .then($el => expect(ref.current).to.equal($el[0]));
      cy.get('#primary').realClick().should('be.focused');
      audit('restored root render function');
    });
    it('R7.03 custom style hook observes hook defaults and completed base styles before consumer override', () => {
      const observations: { role: string | undefined; scrollState: string; className: string | undefined }[] = [];
      const hook = (candidate: unknown) => {
        const state = candidate as DrawerFooterState;
        expect(state.root.id).to.equal('footer');
        expect(state.root.className!.split(' ')).to.include('fui-DrawerFooter').and.include('consumer-hook');
        observations.push({ role: state.root.role, scrollState: state.scrollState, className: state.root.className });
        state.root.style = { ...state.root.style, padding: 7 };
      };
      const customStyleHooks: NonNullable<React.ComponentProps<typeof FluentProvider>['customStyleHooks_unstable']> =
        {};
      customStyleHooks.useDrawerFooterStyles_unstable = hook;
      mount(
        <FluentProvider theme={webLightTheme} customStyleHooks_unstable={customStyleHooks}>
          <DrawerFooter id="footer" className="consumer-hook">
            <Button>Save</Button>
          </DrawerFooter>
        </FluentProvider>,
      );
      footer().should('have.css', 'padding', '7px').and('have.class', 'consumer-hook').and('have.attr', 'role', 'none');
      cy.then(() => {
        expect(observations.length).to.equal(2);
        for (const observation of observations) {
          expect(observation.role).to.equal('none');
          expect(observation.scrollState).to.equal('none');
        }
      });
      audit('custom hook default ordering');
    });
  });
}

if (round >= 2) {
  describe('ONLY125 DrawerFooter R2 actual layout and scroll context', () => {
    for (const context of ['inline', 'overlay'] as const) {
      it(`R2.01 ${context} scrolls top-middle-bottom-top and transitions exact separators`, () => {
        mountFluent(<ScrollFixture context={context} />);
        pseudo('1');
        cy.get('#body').should($el => {
          expect($el[0].scrollTop).to.equal(0);
          expect($el[0].scrollHeight).to.be.greaterThan($el[0].clientHeight);
        });
        cy.get('#body').scrollTo('center');
        pseudo('1');
        cy.get('#body').should($el => {
          expect($el[0].scrollTop).to.be.greaterThan(0);
          expect($el[0].scrollTop + $el[0].clientHeight).to.be.lessThan($el[0].scrollHeight);
        });
        cy.get('#body').scrollTo('bottom');
        pseudo('0');
        cy.get('#body').should($el => expect($el[0].scrollTop + $el[0].clientHeight).to.equal($el[0].scrollHeight));
        cy.get('#body').scrollTo('top');
        pseudo('1');
        audit('scroll returned top', '#drawer', context === 'overlay');
      });
      it(`R2.02 ${context} footer stays fixed while only the body scrolls`, () => {
        let before: DOMRect;
        mountFluent(<ScrollFixture context={context} />);
        footer().then($el => {
          before = $el[0].getBoundingClientRect();
        });
        cy.get('#body').scrollTo('bottom');
        pseudo('0');
        footer().should($el => {
          const after = $el[0].getBoundingClientRect();
          const drawer = $el[0].parentElement!.getBoundingClientRect();
          expect(after.top).to.equal(before.top);
          expect(after.bottom).to.equal(before.bottom);
          expect(after.bottom).to.be.closeTo(drawer.bottom, 1);
          expect(after.width).to.be.closeTo(drawer.width, 1);
          expect($el[0].scrollTop).to.equal(0);
        });
        cy.get('#primary').realClick().should('be.focused');
        audit('footer at body end');
      });
      for (const header of [false, true]) {
        it(`R2.03 ${context} ${header ? 'with' : 'without'} header fits short content without a separator`, () => {
          mountFluent(<ScrollFixture context={context} header={header} contentHeight={20} />);
          footer().should($el =>
            expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::before').content).to.equal('none'),
          );
          cy.get('#body').should($el => expect($el[0].scrollHeight).to.equal($el[0].clientHeight));
          footer().should('be.visible');
          audit('short content', '#drawer', context === 'overlay');
        });
      }

      it(`R2.04 ${context} keyboard PageDown and End scroll leave actions reachable`, () => {
        mountFluent(<ScrollFixture context={context} />);
        cy.get('#body').focus().should('be.focused');
        cy.realPress('PageDown');
        cy.get('#body').should($el => expect($el[0].scrollTop).to.be.greaterThan(0));
        cy.realPress(['Control', 'End']);
        pseudo('0');
        cy.realPress('Tab');
        cy.focused().should('have.id', 'primary');
        cy.realPress('Tab');
        cy.focused().should('have.id', 'secondary');
        audit('keyboard body scroll', '#drawer', context === 'overlay');
      });
      it(`R2.05 ${context} generated separator has exact dimensions, token color and motion`, () => {
        mountFluent(<ScrollFixture context={context} />);
        pseudo('1');
        footer().should($el => {
          const style = $el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::before');
          expect(style.content).to.equal('""');
          expect(style.height).to.equal('1px');
          expect(style.top).to.equal('0px');
          expect(style.left).to.equal('0px');
          expect(style.right).to.equal('0px');
          expect(style.position).to.equal('absolute');
          expect(style.backgroundColor).to.equal('rgb(209, 209, 209)');
          expect(style.transitionProperty).to.equal('opacity');
          expect(style.transitionDuration).to.equal('0.2s');
        });
      });
    }
  });
}

if (round >= 3) {
  describe('ONLY125 DrawerFooter R3 actions, focus, lifecycle and responsive updates', () => {
    for (const context of ['inline', 'overlay'] as const) {
      for (const dir of ['ltr', 'rtl'] as const) {
        it(`R3.01 ${context} ${dir} Tab skips disabled actions and Shift+Tab reverses DOM order`, () => {
          mount(<ActionFixture context={context} dir={dir} />);
          cy.get('#primary').focus();
          cy.realPress('Tab');
          cy.focused().should('have.id', 'secondary');
          cy.realPress('Tab');
          cy.focused().should('have.id', 'help');
          cy.realPress(['Shift', 'Tab']);
          cy.focused().should('have.id', 'secondary');
          cy.realPress(['Shift', 'Tab']);
          cy.focused().should('have.id', 'primary');
          cy.get('#count').should('have.text', '0');
          audit('action tab order');
        });
      }
      for (const key of ['Enter', 'Space'] as const) {
        it(`R3.02 ${context} ${key} activates each action once without closing the drawer`, () => {
          mount(<ActionFixture context={context} />);
          cy.get('#primary').focus();
          cy.realPress(key);
          cy.get('#count').should('have.text', '1');
          cy.get('#primary').should('be.focused');
          cy.get('#secondary').focus();
          cy.realPress(key);
          cy.get('#count').should('have.text', '11');
          cy.get('#drawer').should('be.visible');
          audit(`${key} activation`);
        });
      }
      it(`R3.03 ${context} real pointer actions do not give disabled children a click`, () => {
        mount(<ActionFixture context={context} />);
        cy.get('#primary').realClick();
        cy.get('#count').should('have.text', '1');
        cy.get('#disabled').realClick();
        cy.get('#count').should('have.text', '1');
        cy.get('#secondary').realClick();
        cy.get('#count').should('have.text', '11');
        audit('disabled pointer');
      });
      it(`R3.04 ${context} footer is not a toolbar or implicit roving-focus group`, () => {
        mount(<ActionFixture context={context} />);
        footer().should('have.attr', 'role', 'none').and('not.have.attr', 'tabindex');
        cy.get('#primary').focus();
        for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End'] as const) {
          cy.realPress(key);
          cy.focused().should('have.id', 'primary');
          cy.get('#count').should('have.text', '0');
        }
      });
      it(`R3.05 ${context} changing body children updates footer separator without scrolling`, () => {
        mountFluent(<UpdateScrollFixture context={context} />);
        footer().should($el =>
          expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::before').content).to.equal('none'),
        );
        cy.get('#grow').realClick();
        pseudo('1');
        cy.get('#body').scrollTo('bottom');
        pseudo('0');
        cy.get('#grow').realClick();
        cy.get('#body').should($el => {
          expect($el[0].scrollTop).to.equal(0);
          expect($el[0].scrollHeight).to.equal($el[0].clientHeight);
        });
        footer().should($el =>
          expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::before').content).to.equal('none'),
        );
        audit('shrink children');
      });
      it(`R3.06 ${context} ResizeObserver removes and restores footer separator on actual resize`, () => {
        cy.viewport(1200, 1200);
        mountFluent(<UpdateScrollFixture context={context} />);
        cy.get('#grow').realClick();
        pseudo('1');
        cy.get('#resize').realClick();
        cy.get('#drawer').should('have.css', 'height', '1000px');
        cy.get('#body').should($el => expect($el[0].scrollHeight).to.equal($el[0].clientHeight));
        footer().should($el =>
          expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::before').content).to.equal('none'),
        );
        cy.get('#resize').realClick();
        pseudo('1');
        audit('ResizeObserver restored');
      });
      it(`R3.07 ${context} kept-mounted footer actions preserve identity and draft across close/reopen`, () => {
        let original: HTMLElement;
        mountFluent(<LifecycleFixture context={context} kept />);
        cy.get('#trigger').realClick();
        cy.get('#drawer').should($el =>
          expect($el[0].getAnimations().filter(item => item.playState === 'running')).to.have.length(0),
        );
        cy.get('#value').type('Draft text');
        footer().then($el => {
          original = $el[0];
        });
        cy.get('#cancel').realClick();
        cy.get('#drawer').should('have.attr', 'aria-hidden', 'true');
        footer().should('exist');
        cy.get('#drawer').should($el =>
          expect($el[0].getAnimations().filter(item => item.playState === 'running')).to.have.length(0),
        );
        cy.get('#trigger').realClick();
        cy.get('#drawer').should('not.have.attr', 'aria-hidden');
        cy.get('#value').should('have.value', 'Draft text');
        footer()
          .should('be.visible')
          .then($el => expect($el[0]).to.equal(original));
        audit('kept reopened');
      });
      it(`R3.08 ${context} default close unmounts footer and reopening creates a new root`, () => {
        let original: HTMLElement;
        mountFluent(<LifecycleFixture context={context} />);
        cy.get('#trigger').realClick();
        footer()
          .should('be.visible')
          .then($el => {
            original = $el[0];
          });
        cy.get('#drawer').should($el =>
          expect($el[0].getAnimations().filter(item => item.playState === 'running')).to.have.length(0),
        );
        cy.get('#save').realClick();
        footer().should('not.exist');
        cy.get('#trigger').should('be.focused').realClick();
        footer()
          .should('be.visible')
          .then($el => expect($el[0]).not.to.equal(original));
        audit('remounted actions');
      });
      it(`R3.09 ${context} custom surface motion animates actual footer ancestry then unmounts`, () => {
        const events = cy.stub();
        mountFluent(<LifecycleFixture context={context} motion="custom" onMotion={events} />);
        cy.get('#trigger').realClick();
        cy.get('#drawer').should($el => {
          const animation = $el[0].getAnimations().find(item => item.playState === 'running');
          expect(animation, 'running custom surface animation').not.to.equal(undefined);
          expect(animation!.effect!.getTiming().duration).to.equal(1000);
          expect((animation!.effect as KeyframeEffect).getKeyframes().map(frame => frame.opacity)).to.deep.equal([
            '0',
            '1',
          ]);
          expect($el[0].contains($el[0].querySelector('#footer'))).to.equal(true);
        });
        cy.then(() => expect(events).to.have.been.calledWithExactly('start', 'enter'));
        cy.wrap(events).should('have.been.calledWithExactly', 'finish', 'enter');
        cy.get('#cancel').realClick();
        cy.get('#drawer').should($el => {
          const animation = $el[0].getAnimations().find(item => item.playState === 'running');
          expect(animation).not.to.equal(undefined);
          expect((animation!.effect as KeyframeEffect).getKeyframes().map(frame => frame.opacity)).to.deep.equal([
            '1',
            '0',
          ]);
        });
        footer().should('exist');
        footer().should('not.exist');
        cy.wrap(events).should('have.been.calledWithExactly', 'finish', 'exit');
      });
    }
    it('R3.10 inline opening does not steal trigger focus and Tab enters body then footer', () => {
      mountFluent(<LifecycleFixture context="inline" />);
      cy.get('#trigger').realClick().should('be.focused');
      footer().should('be.visible');
      cy.realPress('Tab');
      cy.focused().should('have.id', 'value');
      cy.realPress('Tab');
      cy.focused().should('have.id', 'save');
      cy.realPress('Tab');
      cy.focused().should('have.id', 'cancel');
      cy.realPress('Tab');
      cy.focused().should('have.id', 'outside');
      audit('inline footer focus');
    });
    it('R3.11 modal footer traps forward and backward Tab instead of leaking to background', () => {
      mountFluent(<LifecycleFixture context="overlay" />);
      cy.get('#trigger').realClick();
      cy.get('#value').should('be.focused');
      cy.get('#cancel').focus();
      cy.realPress('Tab');
      cy.focused().should('have.id', 'value');
      cy.realPress(['Shift', 'Tab']);
      cy.focused().should('have.id', 'cancel');
      audit('modal trap', '#drawer', true);
    });
    it('R3.12 non-modal footer allows background interaction without a backdrop', () => {
      mountFluent(<LifecycleFixture context="overlay" modalType="non-modal" motion="disabled" />);
      cy.get('#trigger').realClick();
      cy.get('.fui-OverlayDrawer__backdrop').should('not.exist');
      cy.get('#drawer').should('have.attr', 'aria-modal', 'false');
      cy.get('#outside').realClick().should('be.focused');
      footer().should('be.visible');
      cy.get('#cancel').realClick();
      footer().should('not.exist');
      cy.get('#trigger').should('be.focused');
    });
    it('R3.13 Escape from footer requests exact overlay dismissal and restores trigger focus', () => {
      const change = cy.stub();
      mountFluent(<LifecycleFixture context="overlay" onOpenChange={change} />);
      cy.get('#trigger').realClick();
      cy.get('#cancel').focus();
      cy.realPress('Escape');
      footer().should('not.exist');
      cy.then(() => expect(change).to.have.been.calledOnceWithExactly('escapeKeyDown', false));
      cy.get('#trigger').should('be.focused');
    });
    it('R3.14 inline footer Escape does not dismiss the surrounding drawer', () => {
      mountFluent(<LifecycleFixture context="inline" />);
      cy.get('#trigger').realClick();
      cy.get('#cancel').focus();
      cy.realPress('Escape');
      footer().should('be.visible');
      cy.get('#cancel').should('be.focused');
    });
    it('R3.15 alert drawer ignores Escape/outside dismissal but footer Cancel remains actionable', () => {
      mountFluent(<LifecycleFixture context="overlay" modalType="alert" motion="disabled" />);
      cy.get('#trigger').realClick();
      cy.get('#drawer').should('have.attr', 'role', 'alertdialog');
      cy.get('#cancel').focus();
      cy.realPress('Escape');
      footer().should('be.visible');
      cy.get('.fui-OverlayDrawer__backdrop').realClick({ position: 'topRight' });
      footer().should('be.visible');
      cy.get('#cancel').realClick();
      footer().should('not.exist');
      cy.get('#trigger').should('be.focused');
    });
    it('R3.16 disabled overlay motion immediately hides kept footer and backdrop until reopening', () => {
      mountFluent(<LifecycleFixture context="overlay" kept motion="disabled" />);
      footer().should('not.be.visible');
      cy.get('#drawer').should('have.attr', 'hidden');
      cy.get('#drawer').should('have.css', 'display', 'none');
      cy.get('.fui-OverlayDrawer__backdrop').should('have.attr', 'hidden');
      cy.get('.fui-OverlayDrawer__backdrop').should('have.css', 'display', 'none');
      cy.get('#trigger').realClick();
      footer().should('be.visible');
      cy.get('#drawer').should('not.have.attr', 'hidden');
      cy.get('#drawer').then($el => expect($el[0].getAnimations()).to.have.length(0));
      cy.get('#cancel').realClick();
      footer().should('not.be.visible');
      cy.get('#drawer').should('have.attr', 'aria-hidden', 'true');
      cy.get('#trigger').realClick();
      audit('disabled reopened');
    });
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const position of ['start', 'end', 'bottom'] as const) {
        it(`R3.17 ${dir} ${position} default motion translates the footer with its surface`, () => {
          mountFluent(<LifecycleFixture context="overlay" position={position} />, dir);
          cy.get('#trigger').realClick();
          cy.get('#drawer').should($el => {
            const animation = $el[0].getAnimations().find(item => item.playState === 'running');
            expect(animation).not.to.equal(undefined);
            const frames = (animation!.effect as KeyframeEffect).getKeyframes();
            expect(animation!.effect!.getTiming().duration).to.equal(motionTokens.durationGentle);
            const first = String(frames[0].transform);
            const size = '--fui-Drawer--size';
            const negative = position === 'start' ? dir === 'ltr' : dir === 'rtl';
            expect(first).to.equal(
              position === 'bottom'
                ? `translate3d(0, var(${size}), 0)`
                : `translate3d(${negative ? `calc(var(${size}) * -1)` : `var(${size})`}, 0, 0)`,
            );
            expect(frames[1].transform).to.equal('translate3d(0px, 0px, 0px)');
            expect($el[0].querySelector('#footer')!.parentElement).to.equal($el[0]);
          });
          cy.get('#drawer').should($el =>
            expect($el[0].getAnimations().filter(item => item.playState === 'running')).to.have.length(0),
          );
          cy.get('#cancel').realClick();
          footer().should('not.exist');
        });
      }
    }
    for (const context of ['inline', 'overlay'] as const) {
      for (const size of ['small', 'medium', 'large', 'full'] as const) {
        it(`R3.18 ${context} ${size} footer fills the actual sized drawer without horizontal overflow`, () => {
          const children = (
            <DrawerFooter id="footer">
              <Button id="primary">Save</Button>
              <Button>Cancel</Button>
            </DrawerFooter>
          );
          mountFluent(
            context === 'inline' ? (
              <InlineDrawer id="drawer" open size={size}>
                {children}
              </InlineDrawer>
            ) : (
              <OverlayDrawer
                id="drawer"
                open
                size={size}
                aria-label="Sized drawer"
                surfaceMotion={null}
                backdropMotion={null}
              >
                {children}
              </OverlayDrawer>
            ),
          );
          const width = { small: 320, medium: 592, large: 940, full: 1200 }[size];
          cy.get('#drawer').should($el => expect($el[0].getBoundingClientRect().width).to.equal(width));
          footer().should($el => {
            const drawer = $el[0].parentElement!;
            expect($el[0].getBoundingClientRect().width).to.equal(drawer.clientWidth);
            expect($el[0].scrollWidth).to.equal($el[0].clientWidth);
          });
          audit('sized actions');
        });
      }
      it(`R3.19 ${context} custom width and narrow viewport keep both actions inside footer`, () => {
        cy.viewport(280, 500);
        const children = (
          <DrawerFooter id="footer">
            <Button id="primary">Save</Button>
            <Button id="secondary">Cancel</Button>
          </DrawerFooter>
        );
        mountFluent(
          context === 'inline' ? (
            <InlineDrawer id="drawer" open style={{ width: 600 }}>
              {children}
            </InlineDrawer>
          ) : (
            <OverlayDrawer
              id="drawer"
              open
              style={{ width: 600 }}
              aria-label="Custom drawer"
              surfaceMotion={null}
              backdropMotion={null}
            >
              {children}
            </OverlayDrawer>
          ),
        );
        cy.get('#drawer').should($el => expect($el[0].getBoundingClientRect().width).to.equal(280));
        footer().should($el => {
          const bounds = $el[0].getBoundingClientRect();
          for (const action of Array.from($el[0].querySelectorAll('button'))) {
            const rect = action.getBoundingClientRect();
            expect(rect.left).to.be.at.least(bounds.left + 24);
            expect(rect.right).to.be.at.most(bounds.right - 24);
          }
        });
        audit('narrow actions');
      });
    }
    it('R3.20 responsive Drawer switches at 720px and recreates functional footer in both contexts', () => {
      mountFluent(<ResponsiveFixture />);
      cy.get('#drawer').should('have.class', 'fui-InlineDrawer');
      cy.viewport(720, 600);
      cy.get('#drawer').should('have.class', 'fui-OverlayDrawer').and('have.attr', 'role', 'dialog');
      footer().should('be.visible');
      cy.get('#primary').realClick().should('be.focused');
      audit('responsive overlay');
      cy.viewport(721, 600);
      cy.get('#drawer').should('have.class', 'fui-InlineDrawer').and('not.have.attr', 'role', 'dialog');
      cy.get('#secondary').realClick().should('be.focused');
      audit('responsive inline');
    });
    it('R3.21 consumer focusable group avoids the known default presentation conflict', () => {
      mountFluent(
        <DrawerFooter id="footer" role="group" tabIndex={0} aria-label="Actions">
          <Button>Save</Button>
        </DrawerFooter>,
      );
      footer().focus().should('be.focused');
      audit('semantic focusable group');
    });
    it('R3.22 footer children render function customizes the root slot with forwarded props', () => {
      const renderFooter: SlotRenderFunction<React.ComponentProps<'footer'>> = (Root, props) => (
        <Root {...props} role="group" aria-label="Rendered actions">
          <Button id="primary">Custom save</Button>
        </Root>
      );
      mountFluent(
        <DrawerFooter id="footer" className="slot-class">
          {renderFooter}
        </DrawerFooter>,
      );
      footer()
        .should('have.class', 'slot-class')
        .and('have.class', 'fui-DrawerFooter')
        .and('have.attr', 'role', 'group')
        .and('have.text', 'Custom save');
      cy.get('#primary').realClick().should('be.focused');
      audit('root render function');
    });
    it('R3.23 explicit footer as and hidden native attributes are forwarded and update', () => {
      const Fixture = () => {
        const [hidden, setHidden] = React.useState(true);
        return (
          <>
            <button id="show" onClick={() => setHidden(false)}>
              Show
            </button>
            <DrawerFooter as="footer" id="footer" hidden={hidden}>
              <Button>Save</Button>
            </DrawerFooter>
          </>
        );
      };
      mountFluent(<Fixture />);
      footer().should('match', 'footer').and('have.attr', 'hidden');
      cy.get('#show').realClick();
      footer().should('not.have.attr', 'hidden');
      footer().should('be.visible');
      audit('native attribute update');
    });
    it('R3.24 multilevel Previous and Next footer actions update disabled states and content', () => {
      const Fixture = () => {
        const [level, setLevel] = React.useState(1);
        return (
          <OverlayDrawer id="drawer" open aria-label="Multilevel settings" surfaceMotion={null} backdropMotion={null}>
            <DrawerBody>
              <h2 id="level">Level {level}</h2>
              <p>Level {level} content</p>
            </DrawerBody>
            <DrawerFooter id="footer" style={{ justifyContent: 'space-between' }}>
              <Button id="previous" disabled={level === 1} onClick={() => setLevel(1)}>
                Previous
              </Button>
              <Button id="next" disabled={level === 2} onClick={() => setLevel(2)}>
                Next
              </Button>
            </DrawerFooter>
          </OverlayDrawer>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#previous').should('be.disabled');
      cy.get('#next').focus();
      cy.realPress('Enter');
      cy.get('#level').should('have.text', 'Level 2');
      cy.get('#next').should('be.disabled');
      cy.get('#previous').focus();
      cy.realPress('Space');
      cy.get('#level').should('have.text', 'Level 1');
      cy.get('#previous').should('be.disabled');
      cy.get('#next').should('not.be.disabled');
      cy.get('#next').should('have.css', 'color', 'rgb(36, 36, 36)');
      audit('multilevel returned');
    });
  });
}

if (round >= 4) {
  describe('ONLY125 DrawerFooter R4 composition, isolation and accessibility controls', () => {
    for (const context of ['inline', 'overlay'] as const) {
      it(`R4.01 ${context} live provider direction and theme updates retain the footer root`, () => {
        const Fixture = () => {
          const [updated, setUpdated] = React.useState(false);
          return (
            <FluentProvider theme={updated ? webDarkTheme : webLightTheme} dir={updated ? 'rtl' : 'ltr'}>
              <ScrollFixture context={context} footerProps={{ onClick: () => setUpdated(true) }} />
            </FluentProvider>
          );
        };
        let original: HTMLElement;
        mount(<Fixture />);
        footer().then($el => {
          original = $el[0];
        });
        cy.get('#drawer').should($el =>
          expect($el[0].getAnimations().filter(item => item.playState === 'running')).to.have.length(0),
        );
        cy.get('#primary').realClick();
        footer()
          .should('have.css', 'direction', 'rtl')
          .then($el => {
            expect($el[0]).to.equal(original);
            const rect = $el[0].getBoundingClientRect();
            expect(rect.right - footerActionRect($el[0], '#primary').right).to.equal(24);
          });
        pseudo('1');
        footer().should($el =>
          expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::before').backgroundColor).to.equal(
            'rgb(102, 102, 102)',
          ),
        );
        audit('live provider updates');
      });
      it(`R4.04 ${context} consumer wrapping keeps long actions within a narrow footer`, () => {
        cy.viewport(280, 600);
        const children = (
          <DrawerFooter id="footer" style={{ flexWrap: 'wrap', rowGap: 8 }}>
            <Button id="primary">Save configuration</Button>
            <Button id="secondary">Discard changes</Button>
          </DrawerFooter>
        );
        mountFluent(
          context === 'inline' ? (
            <InlineDrawer open surfaceMotion={null}>
              {children}
            </InlineDrawer>
          ) : (
            <OverlayDrawer open aria-label="Wrapped actions" surfaceMotion={null} backdropMotion={null}>
              {children}
            </OverlayDrawer>
          ),
        );
        footer().should($el => {
          const root = $el[0].getBoundingClientRect();
          const first = footerActionRect($el[0], '#primary');
          const second = footerActionRect($el[0], '#secondary');
          expect(second.top - first.bottom).to.equal(8);
          expect($el[0].scrollWidth).to.equal($el[0].clientWidth);
          expect(second.right).to.be.at.most(root.right - 24);
        });
        audit('wrapped actions');
      });
      it(`R4.05 ${context} footer actions submit and reset a body form via native form association`, () => {
        const submit = cy.stub();
        const children = (
          <>
            <DrawerBody>
              <form
                id="settings-form"
                onSubmit={ev => {
                  ev.preventDefault();
                  submit();
                }}
              >
                <label htmlFor="draft">Draft</label>
                <input id="draft" defaultValue="Initial" />
              </form>
            </DrawerBody>
            <DrawerFooter id="footer">
              <Button id="submit" type="submit" form="settings-form">
                Save
              </Button>
              <Button id="reset" type="reset" form="settings-form">
                Reset
              </Button>
            </DrawerFooter>
          </>
        );
        mountFluent(
          context === 'inline' ? (
            <InlineDrawer open surfaceMotion={null}>
              {children}
            </InlineDrawer>
          ) : (
            <OverlayDrawer open aria-label="Form actions" surfaceMotion={null} backdropMotion={null}>
              {children}
            </OverlayDrawer>
          ),
        );
        cy.get('#draft').clear().type('Changed');
        cy.get('#submit').focus();
        cy.realPress('Enter');
        cy.then(() => expect(submit).to.have.been.calledOnce);
        cy.get('#draft').should('have.value', 'Changed');
        cy.get('#reset').realClick();
        cy.get('#draft').should('have.value', 'Initial');
        footer().should('be.visible');
        audit('associated form actions');
      });
    }
    it('R4.02 two sibling drawers isolate footer scroll context and a standalone footer stays separator-free', () => {
      const children = (suffix: string) => (
        <>
          <DrawerBody id={`body-${suffix}`} tabIndex={0} role="group" aria-label={`Scrollable ${suffix}`}>
            <div style={{ height: 800 }}>Content {suffix}</div>
          </DrawerBody>
          <DrawerFooter id={`footer-${suffix}`}>
            <Button>Save {suffix}</Button>
          </DrawerFooter>
        </>
      );
      mountFluent(
        <>
          <div style={{ display: 'flex' }}>
            <InlineDrawer open style={{ height: 300 }} surfaceMotion={null}>
              {children('one')}
            </InlineDrawer>
            <InlineDrawer open style={{ height: 300 }} surfaceMotion={null}>
              {children('two')}
            </InlineDrawer>
          </div>
          <DrawerFooter id="footer">
            <Button>Standalone</Button>
          </DrawerFooter>
        </>,
      );
      pseudo('1', '#footer-one');
      pseudo('1', '#footer-two');
      cy.get('#body-one').scrollTo('bottom');
      pseudo('0', '#footer-one');
      pseudo('1', '#footer-two');
      cy.get('#body-two').should($el => expect($el[0].scrollTop).to.equal(0));
      footer().should($el =>
        expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::before').content).to.equal('none'),
      );
      audit('standalone context');
      audit('scrolled sibling', '#footer-one');
      audit('unscrolled sibling', '#footer-two');
    });
    it('R4.03 header and footer separators complement each other at top middle and bottom', () => {
      mountFluent(<ScrollFixture context="inline" />);
      const headerOpacity = (opacity: string) =>
        cy
          .get('#header')
          .should($el =>
            expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::after').opacity).to.equal(opacity),
          );
      pseudo('1');
      headerOpacity('0');
      cy.get('#body').scrollTo('center');
      pseudo('1');
      headerOpacity('1');
      cy.get('#body').scrollTo('bottom');
      pseudo('0');
      headerOpacity('1');
      audit('complementary separators', '#drawer');
    });
    it('R4.06 root preventDefault cancels native submit while preserving child click dispatch', () => {
      const submit = cy.stub();
      const click = cy.stub();
      mountFluent(
        <form
          onSubmit={ev => {
            ev.preventDefault();
            submit();
          }}
        >
          <DrawerFooter id="footer" onClick={ev => ev.preventDefault()}>
            <Button id="submit" type="submit" onClick={click}>
              Save
            </Button>
          </DrawerFooter>
        </form>,
      );
      cy.get('#submit').realClick();
      cy.then(() => {
        expect(click).to.have.been.calledOnce;
        expect(submit).not.to.have.been.called;
      });
      audit('preventDefault submit');
    });
    it('R4.07 element mountNode bounds the overlay footer to the container, not the viewport', () => {
      const Fixture = () => {
        const [open, setOpen] = React.useState(false);
        const ref = React.useRef<HTMLDivElement>(null);
        return (
          <>
            <button id="trigger" onClick={() => setOpen(true)}>
              Open contained drawer
            </button>
            <div
              id="container"
              ref={ref}
              style={{ position: 'relative', width: 500, height: 300, overflow: 'hidden', marginLeft: 100 }}
            >
              <OverlayDrawer
                id="drawer"
                mountNode={ref.current}
                open={open}
                aria-label="Contained settings"
                surfaceMotion={null}
                backdropMotion={null}
              >
                <DrawerBody tabIndex={0}>Content</DrawerBody>
                <DrawerFooter id="footer">
                  <Button id="primary">Save</Button>
                </DrawerFooter>
              </OverlayDrawer>
            </div>
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#trigger').realClick();
      cy.get('#container #drawer #footer').should('exist');
      cy.get('#drawer').should('have.css', 'position', 'absolute');
      footer().should($el => {
        const bounds = $el[0].ownerDocument.querySelector('#container')!.getBoundingClientRect();
        const rect = $el[0].getBoundingClientRect();
        expect(rect.left).to.equal(bounds.left);
        expect(rect.bottom).to.equal(bounds.bottom);
        expect(rect.right).to.be.at.most(bounds.right);
      });
      cy.get('#primary').realClick().should('be.focused');
      audit('contained portal footer');
    });
    it('R4.07 object mountNode class forwards the footer into the named portal', () => {
      mountFluent(
        <OverlayDrawer
          open
          aria-label="Portal settings"
          mountNode={{ className: 'footer-portal' }}
          surfaceMotion={null}
          backdropMotion={null}
        >
          <DrawerFooter id="footer">
            <Button id="primary">Save</Button>
          </DrawerFooter>
        </OverlayDrawer>,
      );
      cy.get('.footer-portal #footer').should('have.length', 1);
      cy.get('#primary').realClick().should('be.focused');
      audit('named portal footer');
    });
    it('R4.08 backdrop dismissal from footer focus reports exact reason and restores the trigger', () => {
      const change = cy.stub();
      mountFluent(<LifecycleFixture context="overlay" onOpenChange={change} preventBackdropFocus />);
      cy.get('#trigger').realClick();
      cy.get('#drawer').should($el =>
        expect($el[0].getAnimations().filter(item => item.playState === 'running')).to.have.length(0),
      );
      cy.get('#cancel').focus().should('be.focused');
      cy.get('.fui-OverlayDrawer__backdrop').realClick({ position: 'topRight' });
      footer().should('not.exist');
      cy.then(() => expect(change).to.have.been.calledOnceWithExactly('backdropClick', false));
      cy.get('#trigger').should('be.focused');
    });
    it('R4.09 provider custom style hook receives footer state and overrides the rendered root', () => {
      const hook = (state: unknown) => {
        if (
          !state ||
          typeof state !== 'object' ||
          !('root' in state) ||
          !state.root ||
          typeof state.root !== 'object'
        ) {
          throw new Error('Expected footer state with a root slot');
        }
        Object.assign(state.root, { style: { justifyContent: 'flex-end', padding: 6 } });
      };
      const customStyleHooks: NonNullable<React.ComponentProps<typeof FluentProvider>['customStyleHooks_unstable']> =
        {};
      customStyleHooks.useDrawerFooterStyles_unstable = hook;
      mount(
        <FluentProvider theme={webLightTheme} customStyleHooks_unstable={customStyleHooks}>
          <DrawerFooter id="footer">
            <Button>Save</Button>
          </DrawerFooter>
        </FluentProvider>,
      );
      footer()
        .should('have.class', 'fui-DrawerFooter')
        .and('have.css', 'justify-content', 'flex-end')
        .and('have.css', 'padding', '6px');
      audit('provider style hook');
    });
    it('R4.10 footer ref identity survives children and inherited scroll-state updates', () => {
      const ref = React.createRef<HTMLElement>();
      let original: HTMLElement;
      mountFluent(<ScrollFixture context="inline" footerRef={ref} />);
      footer().then($el => {
        original = $el[0];
        expect(ref.current).to.equal(original);
      });
      cy.get('#body').scrollTo('bottom');
      pseudo('0');
      cy.get('#body').scrollTo('top');
      pseudo('1');
      footer().then($el => {
        expect($el[0]).to.equal(original);
        expect(ref.current).to.equal(original);
      });
    });
    it('R4.11 axe detects exactly the unnamed action then clears when the consumer supplies a label', () => {
      const Fixture = () => {
        const [named, setNamed] = React.useState(false);
        return (
          <DrawerFooter id="footer" role="group" aria-label="Actions">
            <Button id="bad" aria-label={named ? 'Add' : undefined}>
              <span aria-hidden="true">+</span>
            </Button>
            <Button id="fix" onClick={() => setNamed(true)}>
              Name action
            </Button>
          </DrawerFooter>
        );
      };
      mountFluent(<Fixture />);
      footer().then($el =>
        cy
          .then(() => axe.run($el[0]))
          .then(result => {
            expect(
              result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })),
            ).to.deep.equal([{ id: 'button-name', targets: [['#bad']] }]);
            expect(result.incomplete).to.deep.equal([]);
            expect($el[0].querySelector('#bad')!.getAttribute('aria-label')).to.equal(null);
            return recordAudit({
              scenario: Cypress.currentTest.title,
              phase: 'negative unnamed control',
              scope: '#footer',
              passes: result.passes.map(({ id }) => id),
              violations: result.violations,
              incomplete: result.incomplete,
            });
          }),
      );
      cy.get('#fix').realClick();
      cy.get('#bad').should('have.attr', 'aria-label', 'Add');
      audit('named action repaired');
    });
    it('R4.12 open overlay with no DrawerBody leaves footer free of scroll separators', () => {
      mountFluent(
        <OverlayDrawer open aria-label="Footer only" surfaceMotion={null} backdropMotion={null}>
          <DrawerFooter id="footer">
            <Button>Continue</Button>
          </DrawerFooter>
        </OverlayDrawer>,
      );
      footer().should($el =>
        expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0], '::before').content).to.equal('none'),
      );
      audit('footer only overlay');
    });
    it('R4.13 narrow default footer does not silently invent wrapping for long consumer actions', () => {
      cy.viewport(200, 500);
      mountFluent(
        <InlineDrawer open surfaceMotion={null}>
          <DrawerFooter id="footer">
            <Button id="primary">Save configuration</Button>
            <Button id="secondary">Discard changes</Button>
          </DrawerFooter>
        </InlineDrawer>,
      );
      footer()
        .should('have.css', 'flex-wrap', 'nowrap')
        .then($el => {
          expect($el[0].scrollWidth).to.be.greaterThan($el[0].clientWidth);
          const a = footerActionRect($el[0], '#primary');
          const b = footerActionRect($el[0], '#secondary');
          expect(a.top).to.equal(b.top);
        });
    });
    it('R4.14 reduced-motion preference completes overlay lifecycle without a running surface animation', () => {
      cy.window().then(win => {
        const native = win.matchMedia.bind(win);
        Object.defineProperty(win, 'matchMedia', {
          configurable: true,
          value: (query: string) => native(query.includes('prefers-reduced-motion') ? 'all' : query),
        });
      });
      mountFluent(<LifecycleFixture context="overlay" />);
      cy.get('#trigger').realClick();
      footer().should('be.visible');
      cy.get('#drawer').should($el =>
        expect($el[0].getAnimations().filter(item => item.playState === 'running')).to.have.length(0),
      );
      audit('reduced motion actions');
      cy.get('#cancel').realClick();
      footer().should('not.exist');
      cy.get('#trigger').should('be.focused');
    });
    it('R4.15 scroll separator rerenders do not steal focus from a footer action', () => {
      mountFluent(<ScrollFixture context="overlay" />);
      cy.get('#primary').realClick().should('be.focused');
      cy.get('#body').scrollTo('bottom');
      pseudo('0');
      cy.get('#primary').should('be.focused');
      cy.get('#body').scrollTo('top');
      pseudo('1');
      cy.get('#primary').should('be.focused');
      audit('focus retained across scroll');
    });
    it('R4.16 dynamic disabled actions change native tab navigation without adding footer focus logic', () => {
      const Fixture = () => {
        const [disabled, setDisabled] = React.useState(true);
        return (
          <DrawerFooter id="footer">
            <Button id="toggle" onClick={() => setDisabled(value => !value)}>
              Toggle action
            </Button>
            <Button id="dynamic" disabled={disabled}>
              Save
            </Button>
            <Button id="secondary">Cancel</Button>
          </DrawerFooter>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#toggle').focus();
      cy.realPress('Tab');
      cy.focused().should('have.id', 'secondary');
      cy.get('#toggle').realClick();
      cy.get('#dynamic').should('not.be.disabled');
      cy.realPress('Tab');
      cy.focused().should('have.id', 'dynamic');
      cy.get('#toggle').realClick();
      cy.get('#dynamic').should('be.disabled');
      cy.realPress('Tab');
      cy.focused().should('have.id', 'secondary');
      audit('dynamic action availability');
    });
  });
}
