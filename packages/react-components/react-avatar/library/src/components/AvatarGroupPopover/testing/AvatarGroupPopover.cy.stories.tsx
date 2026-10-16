import * as React from 'react';
import * as axe from 'axe-core';
import { getTabster } from 'tabster';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider, webLightTheme, webDarkTheme, teamsHighContrastTheme } from '@fluentui/react-components';
import type {
  JSXElement,
  AvatarSize,
  SlotRenderFunction,
  FluentProviderCustomStyleHooks,
} from '@fluentui/react-components';
import { AvatarGroupPopover } from '../AvatarGroupPopover';
import type { AvatarGroupPopoverProps, AvatarGroupPopoverState } from '../AvatarGroupPopover.types';
import { AvatarGroup } from '../../AvatarGroup/AvatarGroup';
import type { AvatarGroupProps } from '../../AvatarGroup/AvatarGroup.types';
import { AvatarGroupItem } from '../../AvatarGroupItem/AvatarGroupItem';
import { partitionAvatarGroupItems } from '../../../utils/partitionAvatarGroupItems';
import { AvatarGroupProvider, useAvatarGroupContext_unstable } from '../../../contexts/AvatarGroupContext';
import { Default } from '../../../../../stories/src/AvatarGroup/AvatarGroupDefault.stories';
import { Layout } from '../../../../../stories/src/AvatarGroup/AvatarGroupLayout.stories';
import { Indicator } from '../../../../../stories/src/AvatarGroup/AvatarGroupIndicator.stories';
import { SizeSpread } from '../../../../../stories/src/AvatarGroup/AvatarGroupSizeSpread.stories';
import { SizeStack } from '../../../../../stories/src/AvatarGroup/AvatarGroupSizeStack.stories';
import { SizePie } from '../../../../../stories/src/AvatarGroup/AvatarGroupSizePie.stories';
import { Tooltip } from '../../../../../stories/src/AvatarGroup/AvatarGroupTooltip.stories';
import { useAvatarGroupPopover_unstable, useAvatarGroupPopoverBase_unstable } from '../useAvatarGroupPopover';
import { useAvatarGroupPopoverContextValues_unstable } from '../useAvatarGroupPopoverContextValues';
import { useAvatarGroupPopoverStyles_unstable } from '../useAvatarGroupPopoverStyles.styles';
import { renderAvatarGroupPopover_unstable } from '../renderAvatarGroupPopover';

const requestedRound: unknown = Cypress.env('coverageRound');
if (
  requestedRound !== undefined &&
  (!/^[1-4]$/.test(String(requestedRound)) || !Number.isInteger(Number(requestedRound)))
) {
  throw new Error('coverageRound must be an integer from 1 through 4 when provided');
}
const round = requestedRound === undefined ? 4 : Number(requestedRound);
const requestedEvidence: unknown = Cypress.env('avatarPopoverEvidence');
if (requestedEvidence !== undefined && (typeof requestedEvidence !== 'string' || !requestedEvidence.trim())) {
  throw new Error('avatarPopoverEvidence must be a nonempty path when provided');
}
const evidenceRoot =
  requestedEvidence ??
  `src/components/AvatarGroupPopover/.temp/audits-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let auditNumber = 0;

// Check the reset fixture before the case replaces it or opens a modal.
const it = (title: string, body: () => void): Mocha.Test =>
  globalThis.it(title, () =>
    assertResetFixtureOwnership().then(() => {
      body();
      return audit();
    }),
  );

if (round >= 4) {
  describe('ONLY130 R4 source-derived owner, primitive, naming and boundary contracts', () => {
    it('R4 high contrast VR theme: literal token palette retains labelled modal ownership', () => {
      render(
        <FluentProvider theme={teamsHighContrastTheme}>
          <Fixture />
        </FluentProvider>,
      );
      trigger()
        .should('have.css', 'color', 'rgb(255, 255, 255)')
        .and('have.css', 'background-color', 'rgb(0, 0, 0)')
        .and('have.css', 'border-top-color', 'rgb(255, 255, 255)');
      open();
      cy.get('body').realHover({ position: 'topLeft' });
      trigger().should('have.css', 'color', 'rgb(0, 0, 0)').and('have.css', 'background-color', 'rgb(26, 235, 255)');
      assertRows(names.slice(0, 2));
      audit('high contrast open');
      close();
    });

    it('R4 native image loading: gated local response never changes count, overflow size or accessible person names', () => {
      let releaseImage: (() => void) | undefined;
      const loaded = cy.stub().as('loaded');
      cy.intercept(
        'GET',
        '**/owned-avatar-popover.svg',
        request =>
          new Cypress.Promise<void>(resolve => {
            releaseImage = () => {
              request.reply({
                headers: { 'content-type': 'image/svg+xml' },
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#008000"/></svg>',
              });
              resolve();
            };
          }),
      ).as('ownedImage');
      render(
        <AvatarGroupPopover>
          <AvatarGroupItem name={names[0]} image={{ src: '/owned-avatar-popover.svg', onLoad: loaded }} />
          <AvatarGroupItem name={names[1]} />
        </AvatarGroupPopover>,
      );
      open();
      cy.wrap(null).should(() => expect(releaseImage).to.be.a('function'));
      content()
        .find('img')
        .should('have.prop', 'complete', false)
        .and('have.attr', 'alt', '')
        .and('have.attr', 'role', 'presentation')
        .and('have.attr', 'aria-hidden', 'true');
      content().find('.fui-Avatar__initials').first().should('have.text', 'AL');
      assertRows(names.slice(0, 2));
      trigger().should('have.text', '+2');
      cy.then(() => releaseImage!());
      cy.wait('@ownedImage');
      content().find('img').should('have.prop', 'complete', true).and('have.prop', 'naturalWidth', 24);
      cy.get('@loaded').should('have.been.calledOnce');
      cy.then(() => expect(loaded.firstCall.args[0].nativeEvent.isTrusted).to.equal(true));
      assertRows(names.slice(0, 2));
      trigger().should('have.text', '+2');
      close();
    });

    it('R4 null trigger children keep the mandatory named native button without inventing an icon', () => {
      render(<AvatarGroupPopover triggerButton={{ children: null }}>{items(names.slice(0, 2))}</AvatarGroupPopover>);
      trigger().should('have.prop', 'tagName', 'BUTTON').and('have.text', '');
      trigger().find('svg').should('not.exist');
      trigger().should($button => expect(computeAccessibleName($button[0])).to.equal('View more people.'));
      open();
      assertRows(names.slice(0, 2));
      close();
    });

    for (const [count, label] of [
      [-1, '+-1'],
      [-5, '+-5'],
      [0.5, '+0.5'],
      [99.5, '99+'],
      [NaN, '+NaN'],
      [Infinity, '99+'],
      [-Infinity, '+-Infinity'],
    ] as const) {
      it(`R4 numeric count ${String(count)}: source comparison and interpolation do not clamp or invent rows`, () => {
        render(
          <AvatarGroupPopover count={count} triggerButton={{ style: { width: 128 } }}>
            {items(names.slice(0, 2))}
          </AvatarGroupPopover>,
        );
        trigger().should('have.text', label);
        open();
        assertRows(names.slice(0, 2));
        close();
      });
    }

    for (const [title, children, count] of [
      ['null', null, 0],
      ['undefined', undefined, 0],
      ['false', false, 1],
    ] as const) {
      it(`R4 ${title} children: React.Children count differs from an absent rendered row`, () => {
        render(<AvatarGroupPopover>{children}</AvatarGroupPopover>);
        trigger().should('have.text', `+${count}`);
        open();
        content().children().should('have.length', 0);
        close();
      });
    }

    for (const count of [1, 2, 3]) {
      it(`R4 pie ${count} people: maxInlineItems cannot suppress duplicated overflow membership`, () => {
        fixture({ group: { layout: 'pie', size: 64 }, values: names.slice(0, count), maxInlineItems: 99 });
        cy.get('#group > .fui-AvatarGroupItem').should('have.length', count);
        trigger().should('have.text', '').find('svg').should('not.exist');
        open();
        assertRows(names.slice(0, count));
        close();
      });
    }

    for (const shorthand of ['text', 'element'] as const) {
      it(`R4 ${shorthand} trigger shorthand: native button, stable label and genuine Space activation`, () => {
        render(
          <AvatarGroupPopover triggerButton={shorthand === 'text' ? '+' : <span>+</span>}>
            {items(names.slice(0, 2))}
          </AvatarGroupPopover>,
        );
        trigger().should('have.prop', 'tagName', 'BUTTON').and('have.text', '+');
        trigger().should($button => expect(computeAccessibleName($button[0])).to.equal('View more people.'));
        trigger().focus();
        cy.realPress('Space');
        expanded(true);
        surface().should('have.focus');
        close();
      });
    }

    it('R4 duplicate, Unicode and literal labels: item identity preserves order without HTML interpretation', () => {
      const labels = ['Ada Lovelace', 'Ada Lovelace', '李 小龍', '<img src=x> & "People"'];
      render(
        <AvatarGroupPopover>
          {labels.map((name, index) => (
            <AvatarGroupItem key={index} name={name} />
          ))}
        </AvatarGroupPopover>,
      );
      trigger().should('have.text', '+4');
      open();
      assertRows(labels);
      content().find('img').should('not.exist');
      content().find('.fui-Avatar').should('have.length', 4);
      close();
    });

    it('R4 explicit trigger and surface labels: native accessible-name precedence survives tooltip composition', () => {
      render(
        <AvatarGroupPopover
          triggerButton={{ 'aria-label': 'Show engineers', title: 'Trigger title' }}
          popoverSurface={{ 'aria-label': 'Engineers', title: 'Surface title' }}
          tooltip={{ content: 'Tooltip label', relationship: 'description' }}
        >
          {items(names.slice(0, 2))}
        </AvatarGroupPopover>,
      );
      trigger().should($button => {
        expect(computeAccessibleName($button[0])).to.equal('Show engineers');
        expect(computeAccessibleDescription($button[0])).to.equal('Tooltip label');
      });
      trigger().focus().realClick();
      surface()
        .should('have.attr', 'role', 'dialog')
        .should($surface => expect(computeAccessibleName($surface[0])).to.equal('Engineers'));
      close();
    });

    it('R4 arrow keys are not listbox navigation: native focus and callback state remain with the surface', () => {
      const change = cy.stub().as('change');
      fixture({ popover: { onOpenChange: change } });
      open();
      for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'] as const) {
        cy.realPress(key);
        surface().should('have.focus');
        expanded(true);
        cy.get('@change').should('have.been.calledOnce');
      }
      close();
      cy.get('@change').should('have.been.calledTwice');
    });

    it('R4 latest callback and frozen controlled props retain exact trusted event identity without accepting requests', () => {
      const first = cy.stub().as('first');
      const latest = cy.stub().as('latest');
      const slotClick = cy.stub().as('slotClick');
      const frozen = Object.freeze({ open: false, count: 20, triggerButton: Object.freeze({ onClick: slotClick }) });
      const App = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button id="replace-callback" onClick={() => setUpdated(true)}>
              Replace callback
            </button>
            <AvatarGroupPopover {...frozen} onOpenChange={updated ? latest : first}>
              {items(names.slice(0, 2))}
            </AvatarGroupPopover>
          </>
        );
      };
      render(<App />);
      trigger().realClick();
      expanded(false);
      cy.get('@first').should('have.been.calledOnce');
      cy.then(() => {
        expect(first.firstCall.args[0]).to.equal(slotClick.firstCall.args[0]);
        expect(first.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
        expect(first.firstCall.args[1]).to.deep.equal({ open: true });
      });
      cy.get('#replace-callback').realClick();
      trigger().realClick();
      expanded(false);
      surface().should('not.exist');
      trigger().should('have.text', '+20');
      cy.get('@latest').should('have.been.calledOnce');
      cy.get('@first').should('have.been.calledOnce');
      cy.then(() => {
        expect(latest.firstCall.args[0]).to.equal(slotClick.secondCall.args[0]);
        expect(latest.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
        expect(frozen.open).to.equal(false);
        expect(Object.isFrozen(frozen.triggerButton)).to.equal(true);
      });
    });

    it('R4 public full hook-style-render recomposition caches only the overflow context while count and open stay current', () => {
      const contexts: object[] = [];
      const states: AvatarGroupPopoverState[] = [];
      const Hooked = (props: AvatarGroupPopoverProps) => {
        const state = useAvatarGroupPopover_unstable(props);
        const context = useAvatarGroupPopoverContextValues_unstable(state);
        useAvatarGroupPopoverStyles_unstable(state);
        contexts.push(context.avatarGroup);
        states.push(state);
        return renderAvatarGroupPopover_unstable(state, context);
      };
      const App = () => {
        const [count, setCount] = React.useState(2);
        return (
          <>
            <button id="change-count" onClick={() => setCount(100)}>
              Change count
            </button>
            <AvatarGroupProvider value={Object.freeze({ size: 48, layout: 'stack' })}>
              <Hooked count={count}>{items(names.slice(0, 2))}</Hooked>
            </AvatarGroupProvider>
          </>
        );
      };
      render(<App />);
      trigger().should('have.text', '+2').and('have.css', 'width', '48px');
      open();
      assertRows(names.slice(0, 2));
      cy.then(() => {
        expect(states[states.length - 1]?.popoverOpen).to.equal(true);
        expect(states[states.length - 1]?.size).to.equal(48);
        expect(states[states.length - 1]?.layout).to.equal('stack');
        expect(new Set(contexts).size).to.equal(1);
        expect(contexts[0]).to.deep.equal({ isOverflow: true, size: 24 });
      });
      close();
      cy.get('#change-count').realClick();
      trigger().should('have.text', '99+');
      open();
      assertRows(names.slice(0, 2));
      close();
      cy.then(() => {
        expect(states[states.length - 1]?.count).to.equal(100);
        expect(states[states.length - 1]?.popoverOpen).to.equal(false);
        expect(new Set(contexts).size).to.equal(1);
      });
    });

    for (const indicator of ['count', 'icon'] as const) {
      it(`R4 base primitive ${indicator}: small context does not manufacture Fluent components or override its own default`, () => {
        const changes = cy.stub().as('changes');
        const snapshots: ReturnType<typeof useAvatarGroupPopoverBase_unstable>[] = [];
        const Probe = () => {
          const state = useAvatarGroupPopoverBase_unstable({
            children: <span>Child</span>,
            ...(indicator === 'icon' ? { indicator } : {}),
            onOpenChange: changes,
          });
          snapshots.push(state);
          return (
            <button
              id="base-request"
              onClick={event => state.root.onOpenChange?.(event, Object.freeze({ open: !state.popoverOpen }))}
            >
              Request {String(state.popoverOpen)}
            </button>
          );
        };
        render(
          <AvatarGroupProvider value={Object.freeze({ size: 16, layout: 'spread' })}>
            <Probe />
          </AvatarGroupProvider>,
        );
        cy.get('#base-request').realClick().should('have.text', 'Request true');
        cy.then(() => {
          const state = snapshots[snapshots.length - 1]!;
          // eslint-disable-next-line @typescript-eslint/no-deprecated -- Assert the exported base-state compatibility contract.
          expect(state.components).to.deep.equal({
            root: 'div',
            triggerButton: 'button',
            content: 'ul',
            popoverSurface: 'div',
            tooltip: 'div',
          });
          expect(state.indicator).to.equal(indicator);
          expect(state.triggerButton.children).to.equal(indicator === 'count' ? '+1' : undefined);
          expect(state.root.open).to.equal(true);
          expect(state.root.trapFocus).to.equal(true);
          expect(state.root.size).to.equal('small');
          expect(changes.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
          expect(Object.isFrozen(changes.firstCall.args[1])).to.equal(true);
        });
        cy.get('#base-request').realClick().should('have.text', 'Request false');
        cy.get('@changes').should('have.been.calledTwice');
      });
    }

    it('R4 adjacent popovers never share open state or overflow ownership after repeated dismissal', () => {
      render(
        <>
          <AvatarGroupPopover triggerButton={{ id: 'first-trigger' }}>{items(names.slice(0, 2))}</AvatarGroupPopover>
          <AvatarGroupPopover triggerButton={{ id: 'second-trigger' }}>{items(names.slice(2, 4))}</AvatarGroupPopover>
        </>,
      );
      for (const id of ['first-trigger', 'second-trigger', 'first-trigger']) {
        cy.get(`#${id}`).focus().realClick();
        surface().should('have.length', 1).and('have.focus');
        assertRows(id === 'first-trigger' ? names.slice(0, 2) : names.slice(2, 4));
        settled();
        cy.realPress('Escape');
        surface().should('not.exist');
        cy.get(`#${id}`).should('have.focus');
        trigger().each($button => expect($button.attr('aria-expanded')).to.equal('false'));
      }
    });
  });
}
const sizes: AvatarSize[] = [16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 128];
const names = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson', 'Donald Knuth', 'Margaret Hamilton'];
const storyNames = [
  'Johnie McConnell',
  'Allan Munger',
  'Erik Nason',
  'Kristin Patterson',
  'Daisy Phillips',
  'Carole Poland',
  'Carlos Slattery',
  'Robert Tolbert',
  'Kevin Sturgis',
  'Charlotte Waltson',
  'Elliot Woodward',
];
const triggerSelector = '.fui-AvatarGroupPopover__triggerButton';
const surfaceSelector = '.fui-AvatarGroupPopover__popoverSurface';
const contentSelector = '.fui-AvatarGroupPopover__content';
const trigger = () => cy.get(triggerSelector);
const surface = () => cy.get(surfaceSelector);
const content = () => cy.get(contentSelector);
const items = (values: readonly string[]) => values.map(name => <AvatarGroupItem key={name} name={name} />);
const render = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) => {
  mount(
    <FluentProvider dir={dir} theme={dark ? webDarkTheme : webLightTheme}>
      <main id="fixture" style={{ padding: 160 }}>
        {element}
      </main>
    </FluentProvider>,
  );
  cy.get('body').realHover({ position: 'topLeft' });
};
type FixtureProps = {
  group?: Partial<AvatarGroupProps>;
  popover?: Omit<Partial<AvatarGroupPopoverProps>, 'children'>;
  values?: readonly string[];
  children?: React.ReactNode;
  maxInlineItems?: number;
};
const Fixture = ({ group, popover, values = names, children, maxInlineItems }: FixtureProps): JSXElement => {
  const { inlineItems, overflowItems } = partitionAvatarGroupItems({
    items: values,
    layout: group?.layout,
    maxInlineItems,
  });
  return (
    <>
      <button id="before" style={{ position: 'fixed', right: 16, top: 16 }}>
        Before
      </button>
      <AvatarGroup id="group" aria-label="Project people" {...group}>
        {items(inlineItems)}
        {(overflowItems || children !== undefined) && (
          <AvatarGroupPopover {...popover}>{children ?? items(overflowItems ?? [])}</AvatarGroupPopover>
        )}
      </AvatarGroup>
      <button id="after" style={{ position: 'fixed', right: 16, bottom: 16 }}>
        After
      </button>
    </>
  );
};
const fixture = (props: FixtureProps = {}, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  render(<Fixture {...props} />, dir, dark);
const expanded = (open: boolean) => trigger().should('have.attr', 'aria-expanded', String(open));
const assertRows = (expected: readonly string[]) => {
  content().should('have.prop', 'tagName', 'UL').and('have.attr', 'role', 'list');
  content()
    .children()
    .should('have.length', expected.length)
    .each(($row, index) => {
      expect($row[0].tagName).to.equal('LI');
      const avatar = $row[0].querySelector('.fui-Avatar');
      expect(avatar, expected[index]).not.to.equal(null);
      expect(computeAccessibleName(avatar!)).to.equal(expected[index]);
      expect(avatar!.getBoundingClientRect().width).to.be.closeTo(24, 0.01);
      expect(avatar!.getBoundingClientRect().height).to.be.closeTo(24, 0.01);
      const label = $row[0].querySelector('.fui-AvatarGroupItem__overflowLabel');
      expect(label?.textContent).to.equal(expected[index]);
      expect(label?.getAttribute('aria-hidden')).to.equal('true');
    });
};
const open = () => {
  trigger()
    .focus()
    .should($trigger =>
      expect(
        getTabster($trigger[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement(),
        'Tabster has observed the focused restoration target',
      ).to.equal($trigger[0]),
    );
  trigger().realClick();
  expanded(true);
  surface().should('be.visible').and('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
  surface().should($surface => {
    expect(computeAccessibleName($surface[0])).to.equal('Overflow');
    expect($surface[0].contains($surface[0].ownerDocument.activeElement)).to.equal(true);
  });
};
const settled = () =>
  surface().should($surface =>
    expect(
      $surface[0].getAnimations({ subtree: true }).filter(animation => animation.playState === 'running'),
      'surface enter animation completed before dismissal',
    ).to.have.length(0),
  );
function assertFixtureExposure(doc: Document) {
  const fixtureRoot = doc.getElementById('fixture');
  if (!fixtureRoot) throw new Error('The retained AvatarGroupPopover fixture is absent');
  expect(fixtureRoot.isConnected, 'the retained fixture remains connected').to.equal(true);
  expect(fixtureRoot.closest('[aria-hidden="true"]'), 'closed fixture isolation is released').to.equal(null);
  expect(fixtureRoot.closest('[inert]'), 'closed fixture is not inert').to.equal(null);
}
const close = () => {
  settled();
  cy.realPress('Escape');
  expanded(false);
  surface().should('not.exist');
  cy.document().should(doc =>
    expect(doc.activeElement, `Escape restoration: ${doc.activeElement?.tagName}#${doc.activeElement?.id}`).to.equal(
      doc.querySelector(triggerSelector),
    ),
  );
  trigger().should('have.focus');
  cy.document().should(assertFixtureExposure);
};
const callback = (spy: Cypress.Agent<sinon.SinonStub>, index: number, value: boolean, type: string) =>
  cy.then(() => {
    expect(spy.getCall(index).args).to.have.length(2);
    expect(spy.getCall(index).args[0].type).to.equal(type);
    expect(spy.getCall(index).args[1]).to.deep.equal({ open: value });
  });
const audit = (stage = 'final') => {
  cy.document().then(doc => {
    if (doc.querySelector(surfaceSelector)) {
      settled();
    }
  });
  return cy
    .document()
    .should(doc => {
      if (!doc.querySelector(`${surfaceSelector}[aria-modal="true"]`)) {
        assertFixtureExposure(doc);
      }
    })
    .then(doc =>
      axe
        .run(Array.from(doc.querySelectorAll<HTMLElement>('#fixture, .fui-PopoverSurface, [role="tooltip"]')))
        .then(result => {
          const details = (rules: axe.Result[]) =>
            rules.map(rule => ({
              id: rule.id,
              impact: rule.impact,
              nodes: rule.nodes.map(node => ({
                target: node.target,
                html: node.html,
                summary: node.failureSummary,
                anyChecks: node.any,
                all: node.all,
                none: node.none,
                checks: [...node.any, ...node.all, ...node.none].map(check => ({
                  id: check.id,
                  message: check.message,
                })),
              })),
            }));
          const report = {
            test: Cypress.currentTest.title,
            stage,
            environment: Cypress.env(),
            retries: Cypress.config('retries'),
            passes: result.passes.length,
            violations: details(result.violations),
            incomplete: details(result.incomplete),
          };
          const index = ++auditNumber;
          cy.writeFile(`${evidenceRoot}/audit-${index}.json`, report, { log: false });
          cy.then(() => {
            classify(result, doc, stage);
            const rejectedMutations = classifierMutations(result, doc, stage);
            cy.writeFile(`${evidenceRoot}/classifier-${index}.json`, { rejectedMutations }, { log: false });
          });
        }),
    );
};

if (round >= 2) {
  describe('ONLY130 R2 size boundaries, slots, tooltip and provider contracts', () => {
    for (const layout of ['spread', 'stack', 'pie'] as const) {
      for (const size of sizes) {
        it(`R2 size ${layout} ${size}: exact trigger geometry, border, indicator and fixed overflow avatar size`, () => {
          fixture({ group: { layout, size } });
          trigger()
            .should('have.css', 'width', `${size}px`)
            .and('have.css', 'height', `${size}px`)
            .and('have.css', 'border-top-width', `${size < 36 ? 1 : size < 56 ? 2 : size < 72 ? 3 : 4}px`)
            .and('have.css', 'flex-shrink', '0');
          trigger().should('have.text', layout === 'pie' || size < 24 ? '' : '+2');
          if (layout !== 'pie') {
            trigger()
              .find('svg')
              .should('have.length', size < 24 ? 1 : 0);
            trigger().should($button => {
              const preceding = $button[0].previousElementSibling!;
              const before = preceding.getBoundingClientRect();
              const button = $button[0].getBoundingClientRect();
              const gap =
                layout === 'stack'
                  ? -(size < 24 ? 2 : size < 48 ? 4 : size < 96 ? 8 : 16)
                  : size < 20
                  ? 8
                  : size < 32
                  ? 10
                  : size < 64
                  ? 16
                  : 20;
              expect(button.left - before.right).to.be.closeTo(gap, 0.1);
              const font =
                size < 24
                  ? size <= 16
                    ? 12
                    : 16
                  : size <= 24
                  ? 10
                  : size <= 28
                  ? 12
                  : size <= 40
                  ? 14
                  : size <= 56
                  ? 16
                  : size <= 96
                  ? 20
                  : 24;
              expect($button[0].ownerDocument.defaultView!.getComputedStyle($button[0]).fontSize).to.equal(`${font}px`);
            });
          } else {
            cy.get('#group').should('have.css', 'width', `${size}px`).and('have.css', 'clip-path', 'circle(50%)');
            trigger().find('svg').should('not.exist');
            trigger().should($button => {
              const group = $button[0].parentElement!.getBoundingClientRect();
              const button = $button[0].getBoundingClientRect();
              expect(button.left).to.equal(group.left);
              expect(button.top).to.equal(group.top);
            });
          }
          open();
          assertRows(layout === 'pie' ? names : names.slice(0, 2));
          audit('size variant open');
          close();
        });
      }
    }
    for (const size of sizes) {
      it(`R2 explicit icon ${size}: public override follows icon typography thresholds and retains tooltip name`, () => {
        fixture({ group: { size }, popover: { indicator: 'icon' } });
        const font =
          size <= 16
            ? 12
            : size <= 24
            ? 16
            : size <= 40
            ? 20
            : size <= 48
            ? 24
            : size <= 56
            ? 28
            : size <= 72
            ? 32
            : 48;
        trigger().should('have.text', '').and('have.css', 'font-size', `${font}px`);
        trigger().find('svg').should('have.length', 1).and('have.attr', 'aria-hidden', 'true');
        trigger().should($button => expect(computeAccessibleName($button[0])).to.equal('View more people.'));
        open();
        assertRows(names.slice(0, 2));
        audit('explicit icon open');
        close();
      });
    }
    it('R2 tooltip default real hover reveals label tooltip, never opens the popover, then dismisses on leave', () => {
      const change = cy.stub().as('change');
      fixture({ popover: { onOpenChange: change } });
      trigger().realHover();
      cy.get('[role="tooltip"]').should('be.visible').and('have.text', 'View more people.');
      expanded(false);
      surface().should('not.exist');
      cy.get('@change').should('not.have.been.called');
      audit('hover tooltip');
      cy.get('#after').realHover();
      cy.get('[role="tooltip"]').should('not.exist');
    });
    it('R2 tooltip label customization supports the documented localization story by real hover', () => {
      render(<Tooltip />);
      trigger().should($button => expect(computeAccessibleName($button[0])).to.equal('My custom tooltip'));
      trigger().realHover();
      cy.get('[role="tooltip"]').should('be.visible').and('have.text', 'My custom tooltip');
      audit('localized tooltip');
      open();
      close();
    });
    it('R2 tooltip description keeps an explicit trigger name and exposes a separate accessible description', () => {
      fixture({
        popover: {
          triggerButton: { 'aria-label': 'Show project people' },
          tooltip: { content: 'Additional collaborators', relationship: 'description', showDelay: 0 },
        },
      });
      trigger().realHover();
      cy.get('[role="tooltip"]').should('be.visible');
      trigger().should($button => {
        expect(computeAccessibleName($button[0])).to.equal('Show project people');
        expect(computeAccessibleDescription($button[0])).to.equal('Additional collaborators');
      });
      audit('description tooltip');
      cy.get('#after').realHover();
    });
    it('R2 tooltip keyboard focus shows content without requesting open; Escape dismisses tooltip only', () => {
      const change = cy.stub().as('change');
      fixture({
        popover: {
          onOpenChange: change,
          tooltip: { content: 'View more people.', relationship: 'label', showDelay: 0 },
        },
      });
      cy.get('#before').focus();
      cy.realPress('Tab');
      trigger().should('have.focus');
      cy.get('[role="tooltip"]').should('be.visible');
      cy.realPress('Escape');
      cy.get('[role="tooltip"]').should('not.exist');
      expanded(false);
      trigger().should('have.focus');
      cy.get('@change').should('not.have.been.called');
    });
    it('R2 tooltip visible-change callback retains exact data through hover and mouse leave', () => {
      const visible = cy.stub().as('visible');
      fixture({
        popover: {
          tooltip: {
            content: 'View more people.',
            relationship: 'label',
            showDelay: 0,
            hideDelay: 0,
            onVisibleChange: visible,
          },
        },
      });
      trigger().realHover();
      cy.get('[role="tooltip"]').should('be.visible');
      cy.get('@visible')
        .should('have.been.calledOnce')
        .then(() => {
          expect(visible.firstCall.args[1]).to.deep.equal({ visible: true });
        });
      cy.get('#after').realHover();
      cy.get('[role="tooltip"]').should('not.exist');
      cy.get('@visible')
        .should('have.been.calledTwice')
        .then(() => {
          expect(visible.secondCall.args[1]).to.deep.equal({ visible: false });
        });
    });
    it('R2 explicit count below 24 overrides the documented automatic icon threshold', () => {
      fixture({ group: { size: 16 }, popover: { indicator: 'count' } });
      trigger().should('have.text', '+2').and('have.css', 'font-size', '10px');
      trigger().find('svg').should('not.exist');
      open();
      close();
    });

    it('R2 slot object refs resolve to native trigger, UL and inherited surface, then null on unmount', () => {
      const buttonRef = React.createRef<HTMLButtonElement>();
      const listRef = React.createRef<HTMLUListElement>();
      const surfaceRef = React.createRef<HTMLDivElement>();
      const App = () => {
        const [shown, setShown] = React.useState(true);
        return (
          <>
            <button id="remove" onClick={() => setShown(false)}>
              Remove
            </button>
            {shown && (
              <AvatarGroupPopover
                triggerButton={{ ref: buttonRef }}
                content={{ ref: listRef }}
                popoverSurface={{ ref: surfaceRef }}
              >
                {items(names.slice(0, 2))}
              </AvatarGroupPopover>
            )}
          </>
        );
      };
      render(<App />);
      trigger().should($button => expect(buttonRef.current).to.equal($button[0]));
      cy.then(() => {
        expect(listRef.current).to.equal(null);
        expect(surfaceRef.current).to.equal(null);
      });
      open();
      content().should($list => expect(listRef.current).to.equal($list[0]));
      surface().should($surface => expect(surfaceRef.current).to.equal($surface[0]));
      close();
      cy.then(() => {
        expect(listRef.current).to.equal(null);
        expect(surfaceRef.current).to.equal(null);
      });
      cy.get('#remove').realClick();
      trigger().should('not.exist');
      cy.then(() => expect(buttonRef.current).to.equal(null));
    });
    it('R2 slot classes, styles, native attributes and handlers coexist with static classes and Popover callbacks', () => {
      const click = cy.stub().as('click');
      const key = cy.stub().as('key');
      const change = cy.stub().as('change');
      fixture({
        popover: {
          onOpenChange: change,
          triggerButton: {
            id: 'custom-trigger',
            className: 'consumer-trigger',
            title: 'People',
            onClick: click,
            style: { borderRadius: 4 },
          },
          content: { id: 'custom-list', className: 'consumer-list', style: { rowGap: 6 } },
          popoverSurface: {
            id: 'custom-surface',
            className: 'consumer-surface',
            onKeyDown: key,
            style: { width: 300 },
          },
        },
      });
      trigger()
        .should('have.class', 'consumer-trigger')
        .and('have.attr', 'title', 'People')
        .and('have.css', 'border-radius', '4px');
      open();
      content().should('have.class', 'consumer-list').and('have.css', 'row-gap', '6px');
      surface().should('have.class', 'consumer-surface').and('have.css', 'width', '300px');
      close();
      cy.get('@click').should('have.been.calledOnce');
      cy.get('@key').should('have.been.calledOnce');
      cy.get('@change').should('have.been.calledTwice');
      callback(change, 1, false, 'keydown');
      const useCustomPopoverStyle = (unknownState: unknown) => {
        // The named custom-style registry erases each component's state type, as in the CardFooter runner.
        const state = unknownState as AvatarGroupPopoverState;
        expect(state.triggerButton.type).to.equal('button');
        expect(state.count).to.equal(2);
        state.triggerButton.style = { ...state.triggerButton.style, borderRadius: 6 };
        state.content.style = { ...state.content.style, rowGap: 7 };
        state.popoverSurface.style = { ...state.popoverSurface.style, width: 280 };
      };
      const hooks: FluentProviderCustomStyleHooks = {};
      hooks.useAvatarGroupPopoverStyles_unstable = useCustomPopoverStyle;
      render(
        <FluentProvider theme={webLightTheme} customStyleHooks_unstable={hooks}>
          <Fixture />
        </FluentProvider>,
      );
      trigger().should('have.class', 'fui-AvatarGroupPopover__triggerButton').and('have.css', 'border-radius', '6px');
      open();
      content().should('have.css', 'row-gap', '7px');
      surface().should('have.css', 'width', '280px');
      assertRows(names.slice(0, 2));
      audit('provider style hook');
      close();
    });
    it('R2 trigger element children retain merged props, ref and real keyboard activation', () => {
      const ref = React.createRef<HTMLButtonElement>();
      fixture({
        popover: {
          triggerButton: { ref, style: { width: 120 }, children: <span id="custom-indicator">People +2</span> },
        },
      });
      trigger().should($button => expect(ref.current).to.equal($button[0]));
      cy.get('#custom-indicator').should('have.text', 'People +2');
      cy.get('#before').realClick();
      cy.realPress('Tab');
      trigger().should('have.focus');
      cy.realPress('Enter');
      expanded(true);
      surface().should('have.focus');
      close();
    });
    it('R2 content render-function slot wraps inherited children without losing UL list semantics', () => {
      const renderList: SlotRenderFunction<React.ComponentProps<'ul'>> = (List, props) => (
        <List {...props} id="render-list" aria-label="Overflow people">
          {props.children}
        </List>
      );
      fixture({ popover: { content: { children: renderList } } });
      open();
      cy.get('#render-list').should('have.attr', 'role', 'list').and('have.attr', 'aria-label', 'Overflow people');
      assertRows(names.slice(0, 2));
      audit('content render function');
      close();
    });
    it('R2 surface render-function slot preserves a labelled dialog and accessible heading composition', () => {
      const renderSurface: SlotRenderFunction<React.ComponentProps<'div'>> = (Surface, props) => (
        <Surface {...props}>
          <h2 id="overflow-heading">Team members</h2>
          {props.children}
        </Surface>
      );
      fixture({
        popover: {
          popoverSurface: {
            'aria-label': undefined,
            'aria-labelledby': 'overflow-heading',
            children: renderSurface,
          },
        },
      });
      trigger().realClick();
      surface()
        .should('be.visible')
        .and('have.attr', 'role', 'dialog')
        .should($surface => expect(computeAccessibleName($surface[0])).to.equal('Team members'));
      assertRows(names.slice(0, 2));
      audit('surface render function');
      close();
    });
    it('R2 icon and pie intentionally override authored trigger children, count customization remains supported', () => {
      const App = () => {
        const [indicator, setIndicator] = React.useState<'count' | 'icon'>('count');
        return (
          <>
            <button id="toggle-indicator" onClick={() => setIndicator('icon')}>
              Use icon
            </button>
            <AvatarGroup>
              <AvatarGroupPopover indicator={indicator} triggerButton={{ children: 'Custom count' }}>
                {items(names.slice(0, 2))}
              </AvatarGroupPopover>
            </AvatarGroup>
          </>
        );
      };
      render(<App />);
      trigger().should('have.text', 'Custom count');
      cy.get('#toggle-indicator').realClick();
      trigger().should('have.text', '').find('svg').should('have.length', 1);
      open();
      close();
      fixture({
        group: { layout: 'pie', size: 40 },
        popover: { indicator: 'icon', triggerButton: { children: <span id="pie-custom-indicator">Custom pie</span> } },
      });
      trigger().should('have.text', '').find('svg').should('not.exist');
      cy.get('#pie-custom-indicator').should('not.exist');
      trigger().should($button => expect(computeAccessibleName($button[0])).to.equal('View more people.'));
      open();
      assertRows(names);
      audit('pie suppression open');
      close();
    });

    it('R2 direct group provider drives size and stack spacing without an AvatarGroup DOM wrapper', () => {
      render(
        <AvatarGroupProvider value={{ size: 48, layout: 'stack' }}>
          <div id="provider-row">
            <AvatarGroupItem name="Inline Person" />
            <AvatarGroupPopover>{items(names.slice(0, 2))}</AvatarGroupPopover>
          </div>
        </AvatarGroupProvider>,
      );
      trigger().should('have.css', 'width', '48px').and('have.css', 'margin-left', '-8px');
      open();
      assertRows(names.slice(0, 2));
      close();
    });
    it('R2 overflow provider resets size to 24, isOverflow true and removes inherited pie layout', () => {
      const Probe = (): JSXElement => {
        const value = useAvatarGroupContext_unstable(context => context);
        return <li id="context-probe">{JSON.stringify(value)}</li>;
      };
      fixture({
        group: { layout: 'pie', size: 128 },
        children: (
          <>
            <Probe />
            {items(names.slice(0, 2))}
          </>
        ),
      });
      open();
      cy.get('#context-probe').should('have.text', '{"isOverflow":true,"size":24}');
      content()
        .find('.fui-Avatar')
        .should('have.length', 2)
        .each($avatar => {
          expect($avatar[0].getBoundingClientRect().width).to.equal(24);
          expect($avatar[0].ownerDocument.defaultView!.getComputedStyle($avatar[0]).borderRadius).not.to.equal('0px');
        });
      audit('overflow reset context');
      close();
    });
    it('R2 inner AvatarGroup explicitly overrides overflow context while siblings remain overflow list items', () => {
      fixture({
        children: (
          <>
            <AvatarGroupItem name="Overflow Person" />
            <li>
              <AvatarGroup id="nested-group" size={40} aria-label="Nested team">
                <AvatarGroupItem name="Nested Person" />
              </AvatarGroup>
            </li>
          </>
        ),
      });
      open();
      content().children('li').should('have.length', 2);
      cy.get('#nested-group > .fui-AvatarGroupItem')
        .should('have.prop', 'tagName', 'DIV')
        .find('.fui-Avatar')
        .should('have.css', 'width', '40px');
      cy.get('#nested-group .fui-AvatarGroupItem__overflowLabel').should('not.exist');
      content().children('li').first().find('.fui-Avatar').should('have.css', 'width', '24px');
      close();
    });
    it('R2 adjacent groups have independent trigger size, count and provider state', () => {
      render(
        <>
          <AvatarGroup size={20}>
            <AvatarGroupPopover>{items(names.slice(0, 2))}</AvatarGroupPopover>
          </AvatarGroup>
          <AvatarGroup size={64}>
            <AvatarGroupPopover>{items(names.slice(0, 3))}</AvatarGroupPopover>
          </AvatarGroup>
        </>,
      );
      trigger().first().should('have.css', 'width', '20px').and('have.text', '');
      trigger().last().should('have.css', 'width', '64px').and('have.text', '+3');
      trigger().first().realClick();
      assertRows(names.slice(0, 2));
      trigger().last().should('have.attr', 'aria-expanded', 'false');
      cy.realPress('Escape');
      surface().should('not.exist');
      trigger().last().realClick();
      assertRows(names.slice(0, 3));
      trigger().first().should('have.attr', 'aria-expanded', 'false');
      cy.realPress('Escape');
      surface().should('not.exist');
      trigger().last().should('have.focus');
    });
  });
}
function classify(result: axe.AxeResults, doc: Document, stage: string, scenario = Cypress.currentTest.title) {
  expect(result.passes.length, 'axe evaluated real component DOM').to.be.greaterThan(0);
  for (const rule of [...result.violations, ...result.incomplete]) {
    expect(rule.nodes.length, 'every reported rule has real nodes').to.be.greaterThan(0);
    expect(rule.impact).to.equal(rule.id === 'aria-required-children' ? 'critical' : 'serious');
    if (rule.id === 'aria-hidden-focus') {
      const phases: Record<string, RegExp> = {
        'high contrast open': /^R4 high contrast VR theme:/,
        'size variant open': /^R2 size (spread|stack|pie) (16|20|24|28|32|36|40|48|56|64|72|96|120|128):/,
        'explicit icon open': /^R2 explicit icon (16|20|24|28|32|36|40|48|56|64|72|96|120|128):/,
        'provider style hook': /^R2 slot classes, styles, native attributes and handlers coexist/,
        'content render function': /^R2 content render-function slot wraps inherited children/,
        'surface render function': /^R2 surface render-function slot preserves a labelled dialog/,
        'pie suppression open': /^R2 icon and pie intentionally override authored trigger children,/,
        'overflow reset context': /^R2 overflow provider resets size to 24/,
        'documented open surface': /^R1 story (Default|Layout|Indicator|SizeSpread|SizeStack|SizePie|Tooltip):/,
        'custom count open': /^R1 unit count (0|1|4|20|99|100|120|1000):/,
        'empty overflow': /^R1 automatic array count follows React children, including null placeholders$/,
        'default open modal': /^R1 standalone defaults are native non-submit 32px trigger and labelled modal list$/,
        'keyboard opened': /^R1 real (Enter|Space) activates exactly once;/,
        'spread overflow': /^R1 partition spread:/,
        'stack overflow': /^R1 partition stack:/,
        'pie overflow': /^R1 partition pie:/,
        'initially open': /^R3 defaultOpen initializes a labelled modal/,
        'controlled owner rejects Escape': /^R3 controlled true reports repeated Escape requests/,
        'disableAutoFocus retained owner': /^R3 disableAutoFocus preserves outside focus;/,
        'owner external open': /^R3 controlled owner accepts each request once/,
        'legacy focus trap': /^R3 legacy default focus trap cycles real Tab and ShiftTab/,
        'context opened': /^R3 openOnContext ignores click and Enter/,
        'inline surface': /^R3 inline places the real surface/,
        'mountNode surface': /^R3 mountNode places the real surface/,
        'arrow surface': /^R3 inherited arrow uses the default small Popover size/,
        'RTL spread open': /^R3 RTL spread:/,
        'RTL stack open': /^R3 RTL stack:/,
        'RTL pie open': /^R3 RTL pie:/,
        'dark normal': /^R3 dark theme and inherited inverted\/brand appearances/,
        'dark inverted': /^R3 dark theme and inherited inverted\/brand appearances/,
        'dark brand': /^R3 dark theme and inherited inverted\/brand appearances/,
        'updated keyed overflow': /^R3 lifecycle keyed children update count, labels and order/,
        'long overflow clipped': /^R3 long overflow surface caps height/,
        'explicit content children': /^R3 long overflow surface caps height/,
      };
      expect(phases[stage], 'only registered modal audit phases').not.to.equal(undefined);
      expect(scenario, 'modal audit phase belongs to its real scenario').to.match(phases[stage]);
      expect(rule.nodes).to.have.length(2);
      expect(new Set(rule.nodes.map(node => String(node.target[0]))).size).to.equal(2);
      expect(doc.querySelectorAll(`${surfaceSelector}[aria-modal="true"]`)).to.have.length(1);
      expect(
        Array.from(doc.querySelectorAll(`${surfaceSelector} [data-tabster-dummy]`)).map(element =>
          element.getAttribute('data-tabster-dummy'),
        ),
      ).to.have.members([
        'isFirst=true, isOutside=false, (Modalizer, tabbable=true)',
        'isFirst=false, isOutside=false, (Modalizer, tabbable=true)',
      ]);
      rule.nodes.forEach(node => {
        expect(node.target).to.have.length(1);
        const sentinel = doc.querySelector(String(node.target[0]));
        expect(sentinel?.tagName).to.equal('I');
        expect(sentinel?.getAttribute('data-tabster-dummy')).to.match(
          /^isFirst=(true|false), isOutside=false, \(Modalizer, tabbable=true\)$/,
        );
        expect(sentinel?.getAttribute('aria-hidden')).to.equal('true');
        expect(sentinel?.getAttribute('tabindex')).to.equal('0');
        expect(sentinel?.getAttribute('role')).to.equal('none');
        expect(sentinel?.childElementCount).to.equal(0);
        expect(sentinel?.textContent).to.equal('');
        expect(computeAccessibleName(sentinel!)).to.equal('');
        const modal = sentinel?.closest(`${surfaceSelector}[role="dialog"][aria-modal="true"]`);
        expect(modal).not.to.equal(null);
        expect(computeAccessibleName(modal!)).to.equal(
          scenario.startsWith('R2 surface render-function') ? 'Team members' : 'Overflow',
        );
        expect(node.any).to.have.length(0);
        expect(node.all).to.have.length(1);
        expect(node.none).to.have.length(0);
        expect([...node.any, ...node.all, ...node.none].map(check => check.id)).to.deep.equal([
          result.violations.includes(rule) ? 'focusable-not-tabbable' : 'focusable-modal-open',
        ]);
        const template = doc.createElement('template');
        template.innerHTML = node.html;
        for (const attribute of ['data-tabster-dummy', 'aria-hidden', 'tabindex', 'role']) {
          expect(template.content.firstElementChild?.getAttribute(attribute)).to.equal(
            sentinel?.getAttribute(attribute),
          );
        }
      });
      continue;
    }
    if (rule.id === 'aria-required-children') {
      expect(result.incomplete).to.include(rule);
      expect(scenario).to.equal('R1 automatic array count follows React children, including null placeholders');
      expect(stage).to.equal('empty overflow');
      expect(rule.nodes).to.have.length(1);
      expect(rule.nodes[0].target).to.deep.equal(['ul']);
      const emptyList = doc.querySelector(contentSelector)!;
      expect(emptyList.tagName).to.equal('UL');
      expect(emptyList.getAttribute('role')).to.equal('list');
      expect(emptyList.childNodes.length).to.equal(0);
      expect(emptyList.outerHTML).to.equal(rule.nodes[0].html);
      expect(doc.querySelector(triggerSelector)?.textContent).to.equal('+0');
      expect(rule.nodes[0].any.map(check => check.id)).to.deep.equal(['aria-required-children']);
      expect(rule.nodes[0].all).to.have.length(0);
      expect(rule.nodes[0].none).to.have.length(0);
      continue;
    }
    expect(rule.id, 'only evidenced overlap contrast manual reviews are allowed').to.equal('color-contrast');
    expect(result.incomplete).to.include(rule);
    const updatedOverflow =
      scenario ===
      'R3 lifecycle keyed children update count, labels and order in place while preserving the open surface and focus';
    const updatedGroup =
      scenario ===
      'R3 lifecycle group layout and size update while open; overflow provider stays 24px and loses no rows';
    const longOverflow =
      scenario ===
        'R3 long overflow surface caps height, scrolls by End/Home and honors content overrides without changing count' &&
      stage === 'long overflow clipped';
    const pieBoundary = scenario.match(
      /^R4 pie ([123]) people: maxInlineItems cannot suppress duplicated overflow membership$/,
    );
    if (updatedOverflow) {
      expect(stage).to.equal('updated keyed overflow');
      expect(rule.nodes).to.have.length(1);
      expect(rule.nodes[0].target).to.deep.equal([triggerSelector]);
    } else if (updatedGroup) {
      expect(stage).to.equal('final');
      expect(rule.nodes).to.have.length(1);
      const initials = doc.querySelector(String(rule.nodes[0].target[0]))!;
      expect(initials.matches('.fui-Avatar__initials')).to.equal(true);
      expect(initials.textContent).to.equal('IP');
      const group = initials.closest('.fui-AvatarGroup')!;
      expect(group.getBoundingClientRect().width).to.equal(96);
      expect(doc.defaultView!.getComputedStyle(group).clipPath).to.equal('circle(50%)');
      expect(group.querySelector(triggerSelector)?.textContent).to.equal('');
    } else if (pieBoundary) {
      expect(stage).to.equal('final');
      expect(rule.nodes).to.have.length(Number(pieBoundary[1]));
      expect(doc.querySelector(surfaceSelector)).to.equal(null);
      const group = doc.querySelector('#group')!;
      expect(group.getBoundingClientRect().width).to.equal(64);
      expect(doc.defaultView!.getComputedStyle(group).clipPath).to.equal('circle(50%)');
      expect(group.querySelector(triggerSelector)?.textContent).to.equal('');
      expect(rule.nodes.map(node => doc.querySelector(String(node.target[0]))?.textContent)).to.have.members(
        ['AL', 'GH', 'AT'].slice(0, Number(pieBoundary[1])),
      );
    } else if (longOverflow) {
      expect(doc.querySelector(surfaceSelector)?.scrollTop).to.equal(0);
    } else {
      expect(scenario).to.match(/^R1 story (Layout|Indicator|SizeSpread|SizeStack|SizePie):/);
      expect(stage).to.equal('documented open surface');
    }
    rule.nodes.forEach(node => {
      expect(node.target).to.have.length(1);
      const element = doc.querySelector(String(node.target[0]));
      if (element?.matches('.fui-AvatarGroupItem__overflowLabel')) {
        expect(longOverflow || /^R1 story SizePie:/.test(scenario)).to.equal(true);
        const scroller = element.closest(surfaceSelector)!;
        expect(scroller).not.to.equal(null);
        expect(node.any.map(check => check.id)).to.deep.equal(['color-contrast']);
        expect(node.any[0].message).to.equal(
          "Element's background color could not be determined because it's partially obscured by another element",
        );
        expect(node.all).to.have.length(0);
        expect(node.none).to.have.length(0);
        expect(element.getBoundingClientRect().bottom).to.be.greaterThan(scroller.getBoundingClientRect().bottom);
        expect(scroller.scrollHeight).to.be.greaterThan(scroller.clientHeight);
        return;
      }
      expect(element?.matches(`.fui-Avatar__initials, ${triggerSelector}`)).to.equal(true);
      expect(element?.closest('#fixture')).not.to.equal(null);
      expect(node.any.map(check => check.id)).to.deep.equal(['color-contrast']);
      expect(node.all).to.have.length(0);
      expect(node.none).to.have.length(0);
      expect(node.any[0].message).to.equal(
        "Element's background color could not be determined because it is overlapped by another element",
      );
      const rect = element!.getBoundingClientRect();
      const overlaps = Array.from(doc.querySelectorAll(`${surfaceSelector}, .fui-Avatar, ${triggerSelector}`))
        .filter(other => other !== element && !other.contains(element))
        .some(other => {
          const otherRect = other.getBoundingClientRect();
          return (
            rect.left < otherRect.right &&
            rect.right > otherRect.left &&
            rect.top < otherRect.bottom &&
            rect.bottom > otherRect.top
          );
        });
      expect(overlaps, 'independently measured inherited overlap').to.equal(true);
    });
  }
}
function classifierMutations(result: axe.AxeResults, doc: Document, stage: string) {
  const rejectedMutations: string[] = [];
  const reject = (name: string, mutate: (copy: axe.AxeResults) => void) => {
    const copy: axe.AxeResults = JSON.parse(JSON.stringify(result));
    mutate(copy);
    expect(() => classify(copy, doc, stage), name).to.throw();
    rejectedMutations.push(name);
  };
  reject('empty real evaluation', copy => {
    copy.passes = [];
  });
  for (const collection of ['violations', 'incomplete'] as const) {
    reject(`unknown ${collection}`, copy => {
      const evaluated = copy.passes.find(rule => rule.nodes.length > 0)!;
      copy[collection].push({ ...evaluated, id: 'unknown-widget-rule', impact: 'serious' });
    });
  }
  if (result.violations.length || result.incomplete.length) {
    const collection = result.violations.length ? 'violations' : 'incomplete';
    reject('wrong node count', copy => {
      copy[collection][0].nodes = [];
    });
    reject('wrong target', copy => {
      copy[collection][0].nodes[0].target = ['#fixture-reset-not-present'];
    });
    reject('wrong check identity', copy => {
      const node = copy[collection][0].nodes[0];
      const check = [...node.any, ...node.all, ...node.none][0];
      check.id = 'unknown-widget-check';
    });
    reject('wrong impact', copy => {
      copy[collection][0].impact = 'minor';
    });
    if (result[collection][0].id === 'aria-hidden-focus') {
      reject('duplicate sentinel', copy => {
        copy[collection][0].nodes[1] = copy[collection][0].nodes[0];
      });
      reject('wrong sentinel serialization', copy => {
        copy[collection][0].nodes[0].html = '<i role="button" tabindex="1"></i>';
      });
      reject('wrong check collection', copy => {
        const node = copy[collection][0].nodes[0];
        node.any = node.all;
        node.all = [];
      });
      for (const [attribute, value] of [
        ['aria-hidden', 'false'],
        ['tabindex', '1'],
        ['role', 'button'],
        ['data-tabster-dummy', 'unregistered dummy'],
      ]) {
        reject(`wrong serialized ${attribute}`, copy => {
          const template = doc.createElement('template');
          template.innerHTML = copy[collection][0].nodes[0].html;
          template.content.firstElementChild!.setAttribute(attribute, value);
          copy[collection][0].nodes[0].html = template.innerHTML;
        });
      }
      expect(() => classify(result, doc, 'unregistered modal phase')).to.throw();
      rejectedMutations.push('unregistered modal phase');
      expect(() => classify(result, doc, stage, 'unregistered scenario')).to.throw();
      rejectedMutations.push('unregistered scenario');
    }
  }
  return rejectedMutations;
}
const assertResetFixtureOwnership = () => cy.document().should(assertFixtureExposure);
beforeEach(() => {
  render(<button id="fixture-reset">Reset fixture</button>);
  cy.get('#fixture-reset').focus();
});

describe('ONLY130 R1 stable documentation and unit-derived contracts', () => {
  for (const [title, Story, counts] of [
    ['Default', Default, [7]],
    ['Layout', Layout, [7, 7, 11]],
    ['Indicator', Indicator, [7, 7]],
    ['SizeSpread', SizeSpread, sizes.map(() => 7)],
    ['SizeStack', SizeStack, sizes.map(() => 7)],
    ['SizePie', SizePie, sizes.map(() => 11)],
    ['Tooltip', Tooltip, [7]],
  ] as const) {
    it(`R1 story ${title}: actual consuming story opens every documented group and restores focus`, () => {
      render(<Story />);
      trigger().should('have.length', counts.length);
      counts.forEach((count, index) => {
        const pie = title === 'SizePie' || (title === 'Layout' && index === 2);
        const icon =
          (title === 'Indicator' && index === 1) ||
          ((title === 'SizeSpread' || title === 'SizeStack') && sizes[index] < 24);
        trigger()
          .eq(index)
          .should('have.text', pie || icon ? '' : `+${count}`);
        trigger()
          .eq(index)
          .should($trigger =>
            expect(computeAccessibleName($trigger[0])).to.equal(
              title === 'Tooltip' ? 'My custom tooltip' : 'View more people.',
            ),
          );
        trigger()
          .eq(index)
          .scrollIntoView()
          .focus()
          .should($trigger =>
            expect(
              getTabster($trigger[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement(),
              'documented trigger registered as the restoration target',
            ).to.equal($trigger[0]),
          );
        cy.realPress('Enter');
        trigger().eq(index).should('have.attr', 'aria-expanded', 'true');
        surface().should('be.visible').and('have.focus').and('have.attr', 'aria-label', 'Overflow');
        assertRows(count === 11 ? storyNames : storyNames.slice(0, 7));
        if (index === 0) {
          audit('documented open surface');
        }
        settled();
        cy.realPress('Escape');
        surface().should('not.exist');
        trigger().eq(index).should('have.focus').and('have.attr', 'aria-expanded', 'false');
      });
    });
  }
  for (const count of [0, 1, 4, 20, 99, 100, 120, 1000]) {
    it(`R1 unit count ${count}: custom count controls indicator without manufacturing children`, () => {
      render(<AvatarGroupPopover count={count}>{items(names.slice(0, 4))}</AvatarGroupPopover>);
      trigger().should('have.text', count > 99 ? '99+' : `+${count}`);
      open();
      assertRows(names.slice(0, 4));
      audit('custom count open');
      close();
    });
  }
  it('R1 automatic array count follows React children, including null placeholders', () => {
    render(<AvatarGroupPopover>{[...items(names.slice(0, 2)), null, false]}</AvatarGroupPopover>);
    trigger().should('have.text', '+4');
    open();
    assertRows(names.slice(0, 2));
    close();
    render(<AvatarGroupPopover>{[]}</AvatarGroupPopover>);
    trigger().should('have.text', '+0');
    open();
    content().children().should('have.length', 0);
    audit('empty overflow');
    close();
  });
  for (const explicit of [false, true]) {
    it(`R1 fragment ${explicit ? 'explicit' : 'automatic'} count preserves documented fragment limitation`, () => {
      render(
        <AvatarGroupPopover count={explicit ? 3 : undefined}>
          <>{items(names.slice(0, 3))}</>
        </AvatarGroupPopover>,
      );
      trigger().should('have.text', explicit ? '+3' : '+1');
      open();
      assertRows(names.slice(0, 3));
      close();
    });
  }
  it('R1 standalone defaults are native non-submit 32px trigger and labelled modal list', () => {
    render(<AvatarGroupPopover>{items(names.slice(0, 2))}</AvatarGroupPopover>);
    trigger()
      .should('have.prop', 'tagName', 'BUTTON')
      .and('have.attr', 'type', 'button')
      .and('have.text', '+2')
      .and('have.css', 'width', '32px')
      .and('have.css', 'height', '32px')
      .should($button => expect(computeAccessibleName($button[0])).to.equal('View more people.'));
    expanded(false);
    surface().should('not.exist');
    open();
    assertRows(names.slice(0, 2));
    content()
      .should('have.css', 'display', 'flex')
      .and('have.css', 'flex-direction', 'column')
      .and('have.css', 'list-style-type', 'none')
      .and('have.css', 'margin', '0px')
      .and('have.css', 'padding', '0px');
    surface()
      .should('have.css', 'width', '220px')
      .and('have.css', 'max-height', '220px')
      .and('have.css', 'min-height', '80px')
      .and('have.css', 'overflow-y', 'scroll');
    audit('default open modal');
    close();
  });
  for (const key of ['Enter', 'Space'] as const) {
    it(`R1 real ${key} activates exactly once; surface Escape closes and restores trigger`, () => {
      const change = cy.stub().as('change');
      fixture({ popover: { onOpenChange: change } });
      cy.get('#before').focus();
      cy.realPress('Tab');
      trigger().should('have.focus');
      cy.realPress(key);
      expanded(true);
      surface().should('have.focus');
      cy.get('@change').should('have.been.calledOnce');
      callback(change, 0, true, 'click');
      assertRows(names.slice(0, 2));
      audit('keyboard opened');
      close();
      cy.get('@change').should('have.been.calledTwice');
      callback(change, 1, false, 'keydown');
    });
  }
  it('R1 pointer toggles twice with exact callback data and selected-state colour', () => {
    const change = cy.stub().as('change');
    fixture({ popover: { onOpenChange: change } });
    trigger().then($button => {
      const normal = $button[0].ownerDocument.defaultView!.getComputedStyle($button[0]).backgroundColor;
      open();
      cy.get('body').realHover({ position: 'topLeft' });
      trigger().should($open =>
        expect($open[0].ownerDocument.defaultView!.getComputedStyle($open[0]).backgroundColor).not.to.equal(normal),
      );
      trigger().realClick();
      expanded(false);
      surface().should('not.exist');
      cy.get('@change').should('have.been.calledTwice');
      callback(change, 0, true, 'click');
      callback(change, 1, false, 'click');
    });
  });
  for (const layout of ['spread', 'stack', 'pie'] as const) {
    it(`R1 partition ${layout}: inline order, reserved trigger and overflow names match utility units`, () => {
      fixture({ group: { layout } });
      const inline = layout === 'pie' ? names.slice(0, 3) : names.slice(2);
      cy.get('#group > .fui-AvatarGroupItem')
        .should('have.length', inline.length)
        .each(($row, index) => {
          expect(computeAccessibleName($row[0].querySelector('.fui-Avatar')!)).to.equal(inline[index]);
        });
      trigger().should('have.text', layout === 'pie' ? '' : '+2');
      if (layout === 'pie') {
        trigger().should($button => {
          const group = $button[0].parentElement!.getBoundingClientRect();
          const button = $button[0].getBoundingClientRect();
          expect(button.width).to.equal(group.width);
          expect(button.left).to.equal(group.left);
        });
      }
      open();
      assertRows(layout === 'pie' ? names : names.slice(0, 2));
      audit(`${layout} overflow`);
      close();
    });
  }
  for (const layout of ['spread', 'stack'] as const) {
    it(`R1 no overflow ${layout}: all short-list people inline and no invented trigger`, () => {
      fixture({ group: { layout }, values: names.slice(0, 3) });
      cy.get('#group > .fui-AvatarGroupItem').should('have.length', 3);
      trigger().should('not.exist');
      surface().should('not.exist');
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#after').should('have.focus');
    });
  }
  it('R1 custom maxInlineItems reserves a position for the real overflow trigger', () => {
    fixture({ maxInlineItems: 3 });
    cy.get('#group > .fui-AvatarGroupItem').should('have.length', 2);
    trigger().should('have.text', '+4');
    open();
    assertRows(names.slice(0, 4));
    close();
  });
});

if (round >= 3) {
  describe('ONLY130 R3 inherited interactions, RTL and lifecycle', () => {
    it('R3 defaultOpen initializes a labelled modal without a change request and does not reset on prop updates', () => {
      const change = cy.stub().as('change');
      const App = () => {
        const [initial, setInitial] = React.useState(true);
        return (
          <AvatarGroupPopover defaultOpen={initial} onOpenChange={change}>
            <li>
              <button id="change-default" onClick={() => setInitial(false)}>
                Change initial state
              </button>
            </li>
          </AvatarGroupPopover>
        );
      };
      render(<App />);
      expanded(true);
      surface().should('have.focus').and('have.attr', 'aria-modal', 'true');
      cy.get('@change').should('not.have.been.called');
      cy.get('#change-default').realClick();
      expanded(true);
      cy.get('@change').should('not.have.been.called');
      audit('initially open');
      cy.realPress('Escape');
      expanded(false);
      surface().should('not.exist');
      cy.get('@change').should('have.been.calledOnce');
      callback(change, 0, false, 'keydown');
    });
    it('R3 controlled false reports pointer and keyboard requests but cannot open without owner acceptance', () => {
      const change = cy.stub().as('change');
      fixture({ popover: { open: false, onOpenChange: change } });
      trigger().realClick();
      expanded(false);
      surface().should('not.exist');
      cy.get('@change').should('have.been.calledOnce');
      callback(change, 0, true, 'click');
      trigger().should('have.focus');
      cy.realPress('Enter');
      expanded(false);
      cy.get('@change').should('have.been.calledTwice');
      callback(change, 1, true, 'click');
    });
    it('R3 controlled true reports repeated Escape requests but retains the selected modal', () => {
      const change = cy.stub().as('change');
      const App = () => {
        const [ownerOpen, setOwnerOpen] = React.useState(true);
        return (
          <Fixture
            popover={{ open: ownerOpen, onOpenChange: change }}
            children={[
              ...items(names.slice(0, 2)),
              <li key="release">
                <button id="release-owner" tabIndex={-1} onClick={() => setOwnerOpen(false)}>
                  Release owned modal
                </button>
              </li>,
            ]}
          />
        );
      };
      render(<App />);
      surface().should('have.focus');
      settled();
      cy.realPress('Escape');
      expanded(true);
      surface().should('be.visible').and('have.focus');
      cy.realPress('Escape');
      expanded(true);
      cy.get('@change').should('have.been.calledTwice');
      callback(change, 0, false, 'keydown');
      callback(change, 1, false, 'keydown');
      audit('controlled owner rejects Escape');
      cy.get('#release-owner').realClick();
      expanded(false);
      surface().should('not.exist');
      cy.get('@change').should('have.been.calledTwice');
    });
    it('R3 controlled owner accepts each request once and external state changes do not fabricate callbacks', () => {
      const change = cy.stub().as('change');
      const App = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
          <>
            <button id="external" onClick={() => setIsOpen(true)}>
              Open externally
            </button>
            <AvatarGroupPopover
              open={isOpen}
              onOpenChange={(event, data) => {
                change(event, data);
                setIsOpen(data.open);
              }}
            >
              {items(names.slice(0, 2))}
            </AvatarGroupPopover>
          </>
        );
      };
      render(<App />);
      open();
      close();
      cy.get('@change').should('have.been.calledTwice');
      callback(change, 0, true, 'click');
      callback(change, 1, false, 'keydown');
      cy.get('#external').realClick();
      surface().should('have.focus');
      expanded(true);
      cy.get('@change').should('have.been.calledTwice');
      audit('owner external open');
      settled();
      cy.realPress('Escape');
      expanded(false);
      surface().should('not.exist');
      trigger().should('have.focus');
      cy.get('@change').should('have.callCount', 3);
      callback(change, 2, false, 'keydown');
    });
    it('R3 outside real pointer dismisses once and does not steal the outside button focus', () => {
      const change = cy.stub().as('change');
      fixture({ popover: { onOpenChange: change } });
      open();
      settled();
      cy.get('#after').realClick();
      expanded(false);
      surface().should('not.exist');
      cy.get('#after').should('have.focus');
      cy.get('@change').should('have.been.calledTwice');
      callback(change, 1, false, 'focusin');
    });
    it('R3 inside real pointer preserves open state and interactive overflow callbacks', () => {
      const action = cy.stub().as('action');
      const change = cy.stub().as('change');
      fixture({
        children: (
          <li>
            <button id="inside" onClick={action}>
              Contact person
            </button>
          </li>
        ),
        popover: { onOpenChange: change },
      });
      open();
      cy.get('#inside').realClick().should('have.focus');
      expanded(true);
      cy.realPress('Enter');
      cy.get('@action').should('have.been.calledTwice');
      cy.get('@change').should('have.been.calledOnce');
      close();
    });
    it('R3 trigger Escape runs child handler first, honors preventDefault and stops handled propagation', () => {
      const change = cy.stub().as('change');
      const parentKey = cy.stub().as('parentKey');
      const childKey = cy.stub().as('childKey');
      let veto = true;
      render(
        <div onKeyDown={parentKey}>
          <AvatarGroupPopover
            unstable_disableAutoFocus
            onOpenChange={change}
            triggerButton={{
              onKeyDown: event => {
                childKey(event.key, event.defaultPrevented);
                if (veto && event.key === 'Escape') {
                  event.preventDefault();
                }
              },
            }}
          >
            {items(names.slice(0, 2))}
          </AvatarGroupPopover>
        </div>,
      );
      trigger().realClick().should('have.focus');
      expanded(true);
      cy.realPress('Escape');
      expanded(true);
      cy.get('@change').should('have.been.calledOnce');
      cy.get('@childKey').should('have.been.calledOnce');
      cy.get('@parentKey').should('have.been.calledOnce');
      cy.then(() => {
        veto = false;
      });
      cy.realPress('Escape');
      expanded(false);
      surface().should('not.exist');
      cy.get('@childKey').should('have.been.calledTwice');
      cy.get('@parentKey').should('have.been.calledOnce');
      cy.get('@change').should('have.been.calledTwice');
      callback(change, 1, false, 'keydown');
    });
    it('R3 surface Escape dismisses before forwarding the original slot handler with defaultPrevented true', () => {
      const order: string[] = [];
      const change = cy.stub().as('change');
      const key = cy.stub().as('key');
      fixture({
        popover: {
          onOpenChange: (event, data) => {
            order.push(`change:${data.open}`);
            change(event, data);
          },
          popoverSurface: {
            onKeyDown: event => {
              order.push(`key:${event.defaultPrevented}`);
              key(event.key);
            },
          },
        },
      });
      open();
      close();
      cy.get('@key').should('have.been.calledOnce');
      cy.get('@change').should('have.been.calledTwice');
      cy.then(() => expect(order).to.deep.equal(['change:true', 'change:false', 'key:true']));
    });
    it('R3 legacy default focus trap cycles real Tab and ShiftTab within interactive list content', () => {
      fixture({
        children: (
          <>
            <li>
              <button id="first-person">First person</button>
            </li>
            <li>
              <button id="last-person">Last person</button>
            </li>
          </>
        ),
      });
      open();
      settled();
      cy.realPress('Tab');
      cy.get('#first-person').should('have.focus');
      cy.realPress('Tab');
      cy.get('#last-person').should('have.focus');
      cy.realPress('Tab');
      cy.get('#first-person').should('have.focus');
      cy.realPress(['Shift', 'Tab']);
      cy.get('#last-person').should('have.focus');
      expanded(true);
      audit('legacy focus trap');
      close();
    });
    it('R3 trapFocus false renders a named group and permits genuine outside focus without dismissal', () => {
      const change = cy.stub().as('change');
      fixture({ popover: { trapFocus: false, onOpenChange: change } });
      trigger().realClick();
      surface().should('be.visible').and('have.attr', 'role', 'group').and('not.have.attr', 'aria-modal');
      cy.get('#after').focus();
      surface().should('be.visible');
      expanded(true);
      cy.get('#after').should('have.focus');
      cy.get('@change').should('have.been.calledOnce');
      audit('nonmodal outside focus');
      surface().focus();
      close();
    });
    it('R3 disableAutoFocus preserves outside focus; outside-to-outside stays open but inside-to-outside dismisses', () => {
      const change = cy.stub().as('change');
      const App = () => {
        const [ownerOpen, setOwnerOpen] = React.useState(true);
        return (
          <Fixture
            // eslint-disable-next-line @typescript-eslint/naming-convention -- inherited public Popover property
            popover={{ open: ownerOpen, unstable_disableAutoFocus: true, onOpenChange: change }}
            children={[
              ...items(names.slice(0, 2)),
              <li key="release">
                <button id="release-disabled-autofocus" tabIndex={-1} onClick={() => setOwnerOpen(false)}>
                  Release owned modal
                </button>
              </li>,
            ]}
          />
        );
      };
      render(<App />);
      cy.get('#before').focus();
      cy.get('#after').focus();
      expanded(true);
      cy.get('@change').should('not.have.been.called');
      surface().focus().should('have.focus');
      cy.get('#after').focus();
      cy.get('@change').should('have.been.calledOnce');
      callback(change, 0, false, 'focusin');
      expanded(true);
      surface().should('be.visible');
      audit('disableAutoFocus retained owner');
      cy.get('#release-disabled-autofocus').realClick();
      expanded(false);
      surface().should('not.exist');
      cy.get('@change').should('have.been.calledOnce');
    });
    it('R3 inertTrapFocus deliberate programmatic exit closes an accepted owner and keeps outside focus', () => {
      const change = cy.stub().as('change');
      fixture({ popover: { inertTrapFocus: true, onOpenChange: change } });
      open();
      settled();
      surface().focus();
      cy.get('#after').focus();
      expanded(false);
      surface().should('not.exist');
      cy.get('#after').should('have.focus');
      cy.get('@change').should('have.been.calledTwice');
      callback(change, 1, false, 'focusin');
    });
    it('R3 openOnContext ignores click and Enter, opens on real right click and preserves exact callback event', () => {
      const change = cy.stub().as('change');
      fixture({ popover: { openOnContext: true, onOpenChange: change } });
      trigger().realClick();
      cy.realPress('Enter');
      expanded(false);
      cy.get('@change').should('not.have.been.called');
      trigger().realClick({ button: 'right' });
      expanded(true);
      surface().should('be.visible').and('have.focus');
      cy.get('@change').should('have.been.calledOnce');
      callback(change, 0, true, 'contextmenu');
      audit('context opened');
      close();
    });
    it('R3 openOnHover cancellation preserves the surface; actual mouse leave respects its delay and closes', () => {
      const events: { type: string; open: boolean; time: number }[] = [];
      fixture({
        popover: {
          openOnHover: true,
          mouseLeaveDelay: 250,
          onOpenChange: (event, data) => events.push({ type: event.type, open: data.open, time: performance.now() }),
        },
      });
      trigger().realHover();
      expanded(true);
      surface().should('be.visible');
      cy.get('#after').realHover();
      trigger().realHover();
      expanded(true);
      surface().realHover();
      cy.then(() => expect(events.every(event => event.open)).to.equal(true));
      let leftAt = 0;
      cy.then(() => {
        leftAt = performance.now();
      });
      cy.get('#after').realHover();
      surface().should('exist');
      surface().should('not.exist');
      expanded(false);
      cy.then(() => {
        expect(events[0].type).to.equal('mouseenter');
        const last = events[events.length - 1];
        expect(last.type).to.equal('mouseleave');
        expect(last.open).to.equal(false);
        expect(last.time - leftAt).to.be.at.least(220);
        expect(events.filter(event => !event.open)).to.have.length(1);
      });
    });
    for (const closeOnScroll of [false, true]) {
      it(`R3 outside real wheel closeOnScroll ${closeOnScroll}: inherited default and opt-in dismissal`, () => {
        const change = cy.stub().as('change');
        const wheel = cy.stub().as('wheel');
        render(
          <>
            <AvatarGroupPopover closeOnScroll={closeOnScroll} onOpenChange={change}>
              {items(names.slice(0, 2))}
            </AvatarGroupPopover>
            <div
              id="scroller"
              role="region"
              aria-label="Outside scrollable content"
              tabIndex={0}
              onWheel={wheel}
              style={{ overflowY: 'scroll', height: 420, width: 500 }}
            >
              <div style={{ height: 1400 }}>
                <p>Scrollable outside content</p>
              </div>
            </div>
          </>,
        );
        open();
        settled();
        cy.get('#scroller').realHover({ position: 'bottomRight' });
        cy.get('#scroller').realMouseWheel({ deltaY: 200 });
        cy.get('#scroller').should($scroller => expect($scroller[0].scrollTop).to.be.greaterThan(0));
        cy.get('@wheel').should('have.been.calledOnce');
        cy.then(() => {
          const event = wheel.firstCall.args[0].nativeEvent;
          expect(event.isTrusted).to.equal(true);
          expect(event.deltaY).to.equal(200);
          expect(event.currentTarget).to.equal(null);
          expect(event.target.closest('#scroller')).not.to.equal(null);
        });
        expanded(!closeOnScroll);
        if (closeOnScroll) {
          surface().should('not.exist');
          cy.get('@change').should('have.been.calledTwice');
          callback(change, 1, false, 'wheel');
          cy.then(() => expect(change.secondCall.args[0]).to.equal(wheel.firstCall.args[0].nativeEvent));
        } else {
          surface().should('be.visible');
          cy.get('@change').should('have.been.calledOnce');
          close();
        }
      });
    }
    for (const mode of ['inline', 'mountNode'] as const) {
      it(`R3 ${mode} places the real surface in the requested DOM parent and cleans up after Escape`, () => {
        const App = () => {
          const [host, setHost] = React.useState<HTMLDivElement | null>(null);
          return (
            <>
              <div id="portal-host" ref={setHost} />
              <AvatarGroup id="portal-group" aria-label="Portal people">
                <AvatarGroupPopover inline={mode === 'inline'} mountNode={mode === 'mountNode' ? host : undefined}>
                  {items(names.slice(0, 2))}
                </AvatarGroupPopover>
              </AvatarGroup>
            </>
          );
        };
        render(<App />);
        open();
        surface().should($surface => {
          expect($surface[0].closest(mode === 'inline' ? '#portal-group' : '#portal-host')).not.to.equal(null);
        });
        assertRows(names.slice(0, 2));
        audit(`${mode} surface`);
        close();
        cy.get(mode === 'inline' ? '#portal-group' : '#portal-host')
          .find(surfaceSelector)
          .should('not.exist');
      });
    }
    it('R3 inherited arrow uses the default small Popover size and precedes the overflow list', () => {
      fixture({ popover: { withArrow: true } });
      open();
      surface()
        .children('div')
        .should('have.length', 1)
        .should($arrow => {
          expect($arrow[0].getBoundingClientRect().width).to.be.greaterThan(0);
          expect($arrow[0].getBoundingClientRect().height).to.be.greaterThan(0);
          expect($arrow[0].nextElementSibling?.matches(contentSelector)).to.equal(true);
        });
      audit('arrow surface');
      close();
    });
    it('R3 positioning coverTarget suppresses the requested arrow and covers the trigger geometrically', () => {
      fixture({ popover: { withArrow: true, positioning: { coverTarget: true, position: 'below', align: 'start' } } });
      open();
      settled();
      surface().children('div').should('not.exist');
      surface().should($surface => {
        const rect = $surface[0].getBoundingClientRect();
        const button = $surface[0].ownerDocument.querySelector(triggerSelector)!.getBoundingClientRect();
        expect(rect.top).to.be.closeTo(button.top, 1);
        expect(rect.left).to.be.closeTo(button.left, 1);
      });
      close();
    });
    it('R3 explicit below-start positioning resolves measured placement and a positioning-end callback', () => {
      const positioned = cy.stub().as('positioned');
      fixture({
        popover: { positioning: { position: 'below', align: 'start', offset: 12, onPositioningEnd: positioned } },
      });
      open();
      settled();
      surface().should($surface => {
        const button = $surface[0].ownerDocument.querySelector(triggerSelector)!.getBoundingClientRect();
        const rect = $surface[0].getBoundingClientRect();
        expect(rect.top - button.bottom).to.be.closeTo(12, 1);
        expect(rect.left).to.be.closeTo(button.left, 1);
      });
      cy.get('@positioned').should('have.been.called');
      close();
    });
    for (const layout of ['spread', 'stack', 'pie'] as const) {
      it(`R3 RTL ${layout}: mirrored group geometry, portal direction, labels and keyboard dismissal`, () => {
        fixture({ group: { layout, size: 40 } }, 'rtl');
        trigger().should($button => {
          const button = $button[0].getBoundingClientRect();
          const previous = $button[0].previousElementSibling!.getBoundingClientRect();
          if (layout !== 'pie') {
            expect(previous.left - button.right).to.be.closeTo(layout === 'stack' ? -4 : 16, 0.1);
          } else {
            expect(button.right).to.equal($button[0].parentElement!.getBoundingClientRect().right);
          }
        });
        cy.get('#before').realClick();
        cy.realPress('Tab');
        trigger().should('have.focus');
        cy.realPress('Enter');
        surface().should('have.focus').and('have.css', 'direction', 'rtl');
        assertRows(layout === 'pie' ? names : names.slice(0, 2));
        content()
          .children('li')
          .first()
          .should($row => {
            const avatar = $row[0].querySelector('.fui-Avatar')!.getBoundingClientRect();
            const label = $row[0].querySelector('.fui-AvatarGroupItem__overflowLabel')!.getBoundingClientRect();
            expect(avatar.left - label.right).to.be.closeTo(8, 0.1);
          });
        audit(`RTL ${layout} open`);
        close();
      });
    }
    it('R3 dark theme and inherited inverted/brand appearances support explicit readable overflow label customization', () => {
      for (const appearance of [undefined, 'inverted', 'brand'] as const) {
        fixture(
          {
            popover: { appearance },
            children: names
              .slice(0, 2)
              .map(name => <AvatarGroupItem key={name} name={name} overflowLabel={{ style: { color: 'inherit' } }} />),
          },
          'ltr',
          true,
        );
        open();
        surface().should($surface => {
          const expected =
            appearance === 'brand'
              ? webDarkTheme.colorBrandBackground
              : appearance === 'inverted'
              ? webDarkTheme.colorNeutralBackgroundStatic
              : webDarkTheme.colorNeutralBackground1;
          const probe = $surface[0].ownerDocument.createElement('div');
          probe.style.backgroundColor = expected;
          expect($surface[0].ownerDocument.defaultView!.getComputedStyle($surface[0]).backgroundColor).to.equal(
            probe.style.backgroundColor,
          );
        });
        audit(`dark ${appearance ?? 'normal'}`);
        close();
      }
    });
    it('R3 lifecycle keyed children update count, labels and order in place while preserving the open surface and focus', () => {
      const App = () => {
        const [values, setValues] = React.useState(names.slice(0, 2));
        return (
          <AvatarGroupPopover count={values.length}>
            <li>
              <button id="update-people" onClick={() => setValues(['Alan Turing', 'Ada Lovelace', 'New Person'])}>
                Update people
              </button>
            </li>
            {items(values)}
          </AvatarGroupPopover>
        );
      };
      render(<App />);
      trigger().should('have.text', '+2');
      open();
      surface().then($surface => {
        const original = $surface[0];
        const ada = original.querySelector('[aria-label="Ada Lovelace"]');
        cy.get('#update-people').realClick();
        trigger().should('have.text', '+3');
        surface().should($updated => {
          expect($updated[0]).to.equal(original);
          expect($updated[0].querySelector('[aria-label="Ada Lovelace"]')).to.equal(ada);
        });
        content()
          .find('.fui-AvatarGroupItem__overflowLabel')
          .should($labels =>
            expect(Array.from($labels, label => label.textContent)).to.deep.equal([
              'Alan Turing',
              'Ada Lovelace',
              'New Person',
            ]),
          );
        cy.get('#update-people').should('have.focus');
        expanded(true);
      });
      surface().should($surface => {
        const rect = $surface[0].getBoundingClientRect();
        const button = $surface[0].ownerDocument.querySelector(triggerSelector)!.getBoundingClientRect();
        expect(
          rect.bottom <= button.top + 1 || rect.top >= button.bottom - 1,
          'ResizeObserver has repositioned the grown surface outside its trigger',
        ).to.equal(true);
      });
      audit('updated keyed overflow');
      close();
    });
    it('R3 lifecycle group layout and size update while open; overflow provider stays 24px and loses no rows', () => {
      const App = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <AvatarGroup size={changed ? 96 : 20} layout={changed ? 'pie' : 'stack'}>
            <AvatarGroupItem name="Inline Person" />
            <AvatarGroupPopover>
              <li>
                <button id="update-group" onClick={() => setChanged(true)}>
                  Update group
                </button>
              </li>
              {items(names.slice(0, 2))}
            </AvatarGroupPopover>
          </AvatarGroup>
        );
      };
      render(<App />);
      trigger().find('svg').should('have.length', 1);
      open();
      cy.get('#update-group').realClick();
      trigger().should('have.css', 'width', '96px').and('have.text', '').find('svg').should('not.exist');
      content()
        .find('.fui-Avatar')
        .should('have.length', 2)
        .each($avatar => {
          expect($avatar[0].getBoundingClientRect().width).to.equal(24);
        });
      expanded(true);
      cy.get('#update-group').should('have.focus');
      close();
    });
    it('R3 disabled trigger and non-submit form semantics prevent activation, callbacks and accidental submit', () => {
      const submit = cy.stub().as('submit');
      const change = cy.stub().as('change');
      const App = () => {
        const [disabled, setDisabled] = React.useState(true);
        return (
          <form
            aria-label="People form"
            onSubmit={event => {
              event.preventDefault();
              submit();
            }}
          >
            <button type="button" id="enable" onClick={() => setDisabled(false)}>
              Enable people
            </button>
            <AvatarGroupPopover onOpenChange={change} triggerButton={{ disabled }}>
              {items(names.slice(0, 2))}
            </AvatarGroupPopover>
          </form>
        );
      };
      render(<App />);
      trigger().should('be.disabled');
      trigger().realClick();
      expanded(false);
      cy.get('@change').should('not.have.been.called');
      cy.get('#enable').realClick();
      trigger().should('not.be.disabled').and('have.attr', 'type', 'button');
      cy.realPress('Tab');
      trigger().should('have.focus');
      cy.realPress('Enter');
      surface().should('have.focus');
      close();
      cy.realPress('Space');
      surface().should('have.focus');
      cy.get('@submit').should('not.have.been.called');
      close();
      cy.get('@change').should('have.callCount', 4);
    });
    it('R3 lifecycle callback refs attach and detach across open, close, remount and remove without leaked dismissal handlers', () => {
      const buttonRef = cy.stub().as('buttonRef');
      const listRef = cy.stub().as('listRef');
      const surfaceRef = cy.stub().as('surfaceRef');
      const change = cy.stub().as('change');
      const App = () => {
        const [key, setKey] = React.useState(0);
        const [shown, setShown] = React.useState(true);
        return (
          <>
            <button id="remount" onClick={() => setKey(value => value + 1)}>
              Remount
            </button>
            <button id="remove" onClick={() => setShown(false)}>
              Remove
            </button>
            {shown && (
              <AvatarGroupPopover
                key={key}
                onOpenChange={change}
                triggerButton={{ ref: buttonRef }}
                content={{ ref: listRef }}
                popoverSurface={{ ref: surfaceRef }}
              >
                {items(names.slice(0, 2))}
                <li>
                  <button id="unmount-open" onClick={() => setShown(false)}>
                    Remove open popover
                  </button>
                </li>
              </AvatarGroupPopover>
            )}
          </>
        );
      };
      render(<App />);
      open();
      content().should($list => expect(listRef.lastCall.args[0]).to.equal($list[0]));
      surface().should($surface => expect(surfaceRef.lastCall.args[0]).to.equal($surface[0]));
      close();
      cy.then(() => {
        expect(listRef.lastCall.args[0]).to.equal(null);
        expect(surfaceRef.lastCall.args[0]).to.equal(null);
      });
      cy.get('#remount').realClick();
      expanded(false);
      trigger().should($button => expect(buttonRef.lastCall.args[0]).to.equal($button[0]));
      open();
      close();
      cy.get('@change').should('have.callCount', 4);
      open();
      cy.get('#unmount-open').realClick();
      trigger().should('not.exist');
      surface().should('not.exist');
      cy.realPress('Escape');
      cy.get('@change').should('have.callCount', 5);
      cy.then(() => {
        expect(buttonRef.lastCall.args[0]).to.equal(null);
        expect(listRef.lastCall.args[0]).to.equal(null);
        expect(surfaceRef.lastCall.args[0]).to.equal(null);
      });
    });
    it('R3 long overflow surface caps height, scrolls by End/Home and honors content overrides without changing count', () => {
      const people = Array.from({ length: 20 }, (_, index) => `Person ${index + 1}`);
      fixture({ children: items(people) });
      open();
      content().children('li').should('have.length', 20);
      surface().should($surface => {
        expect($surface[0].getBoundingClientRect().height).to.equal(238);
        expect($surface[0].ownerDocument.defaultView!.getComputedStyle($surface[0]).maxHeight).to.equal('220px');
        expect($surface[0].scrollHeight).to.be.greaterThan($surface[0].clientHeight);
      });
      cy.realPress('End');
      surface().should($surface =>
        expect($surface[0].scrollTop).to.be.closeTo($surface[0].scrollHeight - $surface[0].clientHeight, 1),
      );
      content()
        .children('li')
        .last()
        .should($row => {
          const row = $row[0].getBoundingClientRect();
          const parent = $row[0].closest(surfaceSelector)!.getBoundingClientRect();
          expect(row.bottom).to.be.at.most(parent.bottom);
          expect(row.top).to.be.at.least(parent.top);
        });
      cy.realPress('Home');
      surface().should($surface => expect($surface[0].scrollTop).to.equal(0));
      audit('long overflow clipped');
      close();
      fixture({ children: items(names.slice(0, 4)), popover: { content: { children: items(names.slice(4)) } } });
      trigger().should('have.text', '+4');
      open();
      assertRows(names.slice(4));
      audit('explicit content children');
      close();
    });
  });
}
