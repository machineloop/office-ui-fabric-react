import * as React from 'react';
import 'cypress-real-events';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme } from '@fluentui/react-theme';
import type { Theme } from '@fluentui/react-theme';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { CounterBadge } from './CounterBadge';
import type { CounterBadgeProps, CounterBadgeState } from './CounterBadge.types';
import { useConsumerStyles } from './CounterBadge.cy.styles';
import { useCounterBadgeBase_unstable, useCounterBadge_unstable } from './useCounterBadge';
import { renderBadge_unstable } from '../Badge/renderBadge';
import type { BadgeSlots } from '../Badge/Badge.types';

const badge = '[data-testid="counter"]';
const sizes = ['tiny', 'extra-small', 'small', 'medium', 'large', 'extra-large'] as const;
const shapes = ['circular', 'rounded'] as const;
const appearances = ['filled', 'ghost'] as const;
const colors = ['brand', 'danger', 'important', 'informative'] as const;
const heights = [6, 10, 16, 20, 24, 32];
const glyph = (
  <svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 16 16">
    <path d="M2 2h12v12H2z" />
  </svg>
);

const themedMount = (children: React.ReactNode, theme: Theme = webLightTheme, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={theme} dir={dir}>
      {children}
    </FluentProvider>,
  );

function css(element: Element, pseudo?: string) {
  const view = element.ownerDocument.defaultView;
  if (!view) {
    throw new Error('CounterBadge requires an attached browsing context');
  }
  return view.getComputedStyle(element, pseudo);
}

function normalizedColor(element: HTMLElement, color: string) {
  const probe = element.ownerDocument.createElement('span');
  probe.style.color = color;
  element.appendChild(probe);
  const value = css(probe).color;
  probe.remove();
  return value;
}

function expectText(element: HTMLElement, text: string, visible: boolean) {
  expect(element.textContent).to.equal(text);
  expect(css(element).display).to.equal(visible ? 'inline-flex' : 'none');
  expect(element.getBoundingClientRect().height > 0).to.equal(visible);
}

const modes: { label: string; props: CounterBadgeProps; text: string; visible: boolean }[] = [
  { label: 'count', props: { count: 5 }, text: '5', visible: true },
  { label: 'overflow', props: { count: 100 }, text: '99+', visible: true },
  { label: 'hidden-zero', props: { count: 0 }, text: '', visible: false },
  { label: 'shown-zero', props: { count: 0, showZero: true }, text: '0', visible: true },
  { label: 'dot', props: { count: 100, dot: true }, text: '', visible: true },
];

describe('CounterBadge documentation', () => {
  it('defaults to hidden zero without an icon or automatic accessibility semantics', () => {
    themedMount(<CounterBadge data-testid="counter" />);
    cy.get(badge).should($root => {
      expectText($root[0], '', false);
      expect($root[0].tagName).to.equal('DIV');
      expect($root[0].classList.contains('fui-CounterBadge')).to.equal(true);
      expect($root[0].classList.contains('fui-Badge')).to.equal(true);
      for (const attr of ['role', 'tabindex', 'aria-live', 'aria-atomic', 'aria-label']) {
        expect($root[0].hasAttribute(attr), attr).to.equal(false);
      }
    });

    cy.get('.fui-CounterBadge__icon').should('not.exist');
  });
});

describe('CounterBadge unit and source regressions', () => {
  it('forwards native attributes and refs while filtering every counter and visual property', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const iconRef = React.createRef<HTMLSpanElement>();
    themedMount(
      <CounterBadge
        data-testid="counter"
        as="div"
        ref={rootRef}
        id="native-counter"
        title="Unread counter"
        lang="fr"
        dir="rtl"
        aria-label="Unread"
        data-consumer="kept"
        className="consumer-root"
        style={{ height: 40 }}
        count={100}
        overflowCount={9}
        showZero
        dot={false}
        size="large"
        shape="rounded"
        appearance="ghost"
        color="danger"
        iconPosition="after"
        icon={{ ref: iconRef, className: 'consumer-icon', title: 'Glyph title', children: glyph }}
      />,
    );
    cy.get(badge).should($root => {
      expect(rootRef.current).to.equal($root[0]);
      expectText($root[0], '9+', true);
      expect($root[0].id).to.equal('native-counter');
      expect($root[0].title).to.equal('Unread counter');
      expect($root[0].lang).to.equal('fr');
      expect($root[0].getAttribute('dir')).to.equal('rtl');
      expect($root[0].getAttribute('aria-label')).to.equal('Unread');
      expect($root[0].getAttribute('data-consumer')).to.equal('kept');
      expect($root[0].classList.contains('consumer-root')).to.equal(true);
      expect($root[0].getBoundingClientRect().height).to.equal(40);
      for (const prop of [
        'count',
        'overflowcount',
        'showzero',
        'dot',
        'size',
        'shape',
        'appearance',
        'color',
        'icon',
        'iconposition',
      ]) {
        expect($root[0].hasAttribute(prop), prop).to.equal(false);
      }
    });
    cy.get('.fui-CounterBadge__icon').should($icon => {
      expect(iconRef.current).to.equal($icon[0]);
      expect($icon[0].tagName).to.equal('SPAN');
      expect($icon[0].classList.contains('consumer-icon')).to.equal(true);
      expect($icon[0].title).to.equal('Glyph title');
    });
  });

  it('lets icon and root render functions augment generated zero and overflow count', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const iconRef = React.createRef<HTMLSpanElement>();
    const renderIcon: SlotRenderFunction<ExtractSlotProps<BadgeSlots['icon']>> = (Component, props) => (
      <Component {...props}>
        {glyph}
        <span>Glyph</span>
      </Component>
    );
    const renderRoot: SlotRenderFunction<ExtractSlotProps<BadgeSlots['root']>> = (Component, props) => (
      <Component {...props}>
        <strong data-testid="custom-root">Custom counter</strong>
        {props.children}
      </Component>
    );
    themedMount(
      <>
        <CounterBadge data-testid="counter" ref={rootRef} showZero icon={{ ref: iconRef, children: renderIcon }} />
        <CounterBadge data-testid="rendered-root" count={100} aria-label="Custom" icon={glyph}>
          {renderRoot}
        </CounterBadge>
      </>,
    );
    cy.get(badge).should($root => {
      expectText($root[0], 'Glyph0', true);
      expect(rootRef.current).to.equal($root[0]);
      expect(iconRef.current).to.equal($root[0].firstElementChild);
    });
    cy.get('[data-testid="rendered-root"]')
      .should('have.text', 'Custom counter99+')
      .and('have.attr', 'aria-label', 'Custom');
    cy.get('[data-testid="custom-root"]').should('have.prop', 'tagName', 'STRONG');
    cy.get('[data-testid="rendered-root"] .fui-CounterBadge__icon').should('exist');
  });

  it('uses latest consumer handlers, bubbles ghost icon events once, and clears refs on unmount', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const iconRef = React.createRef<HTMLSpanElement>();
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const iconClick = cy.stub().as('iconClick');
    const pointer = cy.stub().as('pointer');
    const focus = cy.stub().as('focus');
    const key = cy.stub().as('key');
    const Fixture = () => {
      const [count, setCount] = React.useState(1);
      const [updated, setUpdated] = React.useState(false);
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Replace handler</button>
          <button onClick={() => setVisible(!visible)}>Toggle counter</button>
          <button data-testid="before-counter">Before counter</button>
          {visible && (
            <CounterBadge
              data-testid="counter"
              ref={rootRef}
              count={count}
              appearance="ghost"
              tabIndex={0}
              onClick={event => {
                (updated ? latest : first)(count, event.target);
                setCount(count + 1);
              }}
              onPointerDown={pointer}
              onFocus={focus}
              onKeyDown={key}
              icon={{ ref: iconRef, onClick: iconClick, children: glyph }}
            />
          )}
        </>
      );
    };
    themedMount(<Fixture />);
    cy.get('[data-testid="before-counter"]').focus().realPress('Tab');
    cy.get(badge).should('be.focused').and('have.text', '1');
    cy.get('@focus').should('have.been.calledOnce');
    cy.get(badge).realPress('Escape');
    cy.get('@key').should('have.been.calledOnce');
    cy.get(badge).should('have.text', '1');
    cy.get(badge).realClick({ position: 'right' });
    cy.get('@first').should('have.been.calledOnce');
    cy.get('@pointer').should('have.been.calledOnce');
    cy.get('@iconClick').should('not.have.been.called');
    cy.get(badge).should('have.text', '2');
    cy.contains('button', 'Replace handler').realClick();
    cy.get('.fui-CounterBadge__icon').realClick();
    cy.get('@iconClick').should('have.been.calledOnce');
    cy.get('@latest').should('have.been.calledOnce');
    cy.get('@first').should('have.been.calledOnce');
    cy.get(badge).should('have.text', '3');
    cy.then(() => {
      expect(latest.firstCall.args[0]).to.equal(2);
      expect(iconRef.current?.contains(latest.firstCall.args[1])).to.equal(true);
    });
    cy.contains('button', 'Toggle counter').realClick();
    cy.get(badge).should('not.exist');
    cy.then(() => {
      expect(rootRef.current).to.equal(null);
      expect(iconRef.current).to.equal(null);
    });
    cy.contains('button', 'Toggle counter').realClick();
    cy.get(badge).should($root => {
      expect(rootRef.current).to.equal($root[0]);
      expect(iconRef.current).to.equal($root[0].firstElementChild);
      expect($root[0].textContent).to.equal('3');
    });
  });

  it('characterizes filled inherited border overlay intercepting icon pointer clicks (inherited defect)', () => {
    const rootClick = cy.stub().as('rootClick');
    const iconClick = cy.stub().as('interceptedIconClick');
    themedMount(
      <CounterBadge
        data-testid="counter"
        count={1}
        onClick={rootClick}
        icon={{ onClick: iconClick, children: glyph }}
      />,
    );
    cy.get('.fui-CounterBadge__icon').realClick();
    cy.get('@rootClick').should('have.been.calledOnce');
    cy.get('@interceptedIconClick').should('not.have.been.called');
    cy.get(badge).should($root => {
      expect(rootClick.firstCall.args[0].target).to.equal($root[0]);
      expect(css($root[0], '::after').display).to.equal('block');
      expect(css($root[0], '::after').pointerEvents).to.equal('auto');
    });
  });

  it('does not acquire focus, click handlers or keyboard behavior merely by displaying count or dot', () => {
    const clicked = cy.stub().as('ownerClick');
    themedMount(
      <>
        <button data-testid="before">Before</button>
        <CounterBadge data-testid="counter" count={1} />
        <CounterBadge data-testid="dot" dot />
        <button data-testid="after" onClick={clicked}>
          After
        </button>
      </>,
    );
    cy.get('[data-testid="before"]').focus().realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.get(badge).realClick();
    cy.get('@ownerClick').should('not.have.been.called');
    for (const selector of [badge, '[data-testid="dot"]']) {
      cy.get(selector).should($root => {
        expect($root[0].hasAttribute('tabindex')).to.equal(false);
        expect($root[0].hasAttribute('role')).to.equal(false);
      });
    }
  });

  it('merges consumer classes last and keeps overrides isolated from a peer', () => {
    const Fixture = () => {
      const styles = useConsumerStyles();
      return (
        <>
          <CounterBadge data-testid="counter" count={100} className={styles.override} />
          <CounterBadge data-testid="peer" count={100} />
        </>
      );
    };
    themedMount(<Fixture />);
    cy.get(badge).should($root => {
      expect($root[0].textContent).to.equal('99+');
      expect($root[0].getBoundingClientRect().height).to.equal(Number.parseFloat(webLightTheme.spacingVerticalXXXL));
      expect(css($root[0]).color).to.equal(normalizedColor($root[0], webLightTheme.colorNeutralForeground1));
    });
    cy.get('[data-testid="peer"]').should($root => {
      expect($root[0].getBoundingClientRect().height).to.equal(20);
      expect(css($root[0]).color).to.equal(normalizedColor($root[0], webLightTheme.colorNeutralForegroundOnBrand));
    });
  });

  it('scopes CounterBadge custom style context and theme/direction without leaking count state to peers', () => {
    const hook = cy.stub().as('counterStyleHook');
    const custom = { ...webDarkTheme, colorBrandBackground: webDarkTheme.colorPaletteRedBackground3 };
    const Fixture = () => {
      const [count, setCount] = React.useState(100);
      return (
        <FluentProvider theme={webLightTheme}>
          <button onClick={() => setCount(0)}>Clear nested count</button>
          <CounterBadge data-testid="outer" count={100} />
          <FluentProvider
            theme={custom}
            dir="rtl"
            customStyleHooks_unstable={{
              // eslint-disable-next-line @typescript-eslint/naming-convention
              useCounterBadgeStyles_unstable: rawState => {
                const state = rawState as CounterBadgeState;
                hook(state.count, state.showZero, state.dot, state.root.children);
                state.root.style = { ...state.root.style, height: 40 };
              },
            }}
          >
            <CounterBadge data-testid="counter" count={count} showZero />
          </FluentProvider>
          <CounterBadge data-testid="peer" count={1} />
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    cy.get(badge).should($root => {
      expectText($root[0], '99+', true);
      expect(css($root[0]).direction).to.equal('rtl');
      expect(css($root[0]).backgroundColor).to.equal(normalizedColor($root[0], custom.colorBrandBackground));
      expect($root[0].getBoundingClientRect().height).to.equal(40);
    });
    cy.get('@counterStyleHook').should('have.been.calledWith', 100, true, false, '99+');
    cy.contains('button', 'Clear nested count').realClick();
    cy.get(badge).should('have.text', '0');
    cy.get('@counterStyleHook').should('have.been.calledWith', 0, true, false, '0');
    for (const [selector, text] of [
      ['outer', '99+'],
      ['peer', '1'],
    ]) {
      cy.get(`[data-testid="${selector}"]`).should($root => {
        expectText($root[0], text, true);
        expect($root[0].getBoundingClientRect().height).to.equal(20);
        expect(css($root[0]).direction).to.equal('ltr');
        expect(css($root[0]).backgroundColor).to.equal(normalizedColor($root[0], webLightTheme.colorBrandBackground));
      });
    }
  });

  for (const position of ['before', 'after'] as const) {
    it(`updates theme, direction, visual variants, ${position} icon and zero/dot state without stale styling`, () => {
      const ref = React.createRef<HTMLDivElement>();
      const Fixture = () => {
        const [phase, setPhase] = React.useState(0);
        return (
          <FluentProvider theme={phase === 1 ? webDarkTheme : webLightTheme} dir={phase === 1 ? 'rtl' : 'ltr'}>
            <button onClick={() => setPhase((phase + 1) % 3)}>Update visuals</button>
            <CounterBadge
              data-testid="counter"
              ref={ref}
              count={phase === 0 ? 100 : 0}
              showZero={phase === 2}
              dot={phase === 1}
              size={phase === 1 ? 'extra-large' : 'small'}
              shape={phase === 1 ? 'circular' : 'rounded'}
              appearance={phase === 1 ? 'ghost' : 'filled'}
              color={phase === 1 ? 'danger' : 'brand'}
              iconPosition={position}
              icon={phase === 2 ? glyph : null}
            />
          </FluentProvider>
        );
      };
      mount(<Fixture />);
      let original: HTMLElement;
      cy.get(badge).then($root => {
        original = $root[0];
      });
      for (const [index, phase] of [0, 1, 2, 0].entries()) {
        if (index) {
          cy.contains('button', 'Update visuals').realClick();
        }
        cy.get(badge).should($root => {
          const root = $root[0];
          expect(root).to.equal(original);
          expect(ref.current).to.equal(original);
          expectText(root, phase === 0 ? '99+' : phase === 1 ? '' : '0', true);
          expect(root.getBoundingClientRect().height).to.equal(phase === 1 ? 6 : 16);
          expect(css(root).direction).to.equal(phase === 1 ? 'rtl' : 'ltr');
          expect(css(root).borderRadius).to.equal(
            phase === 1 ? webDarkTheme.borderRadiusCircular : webLightTheme.borderRadiusSmall,
          );
          expect(css(root, '::after').display).to.equal(phase === 1 ? 'none' : 'block');
          expect(css(root).color).to.equal(
            normalizedColor(
              root,
              phase === 1 ? webDarkTheme.colorPaletteRedForeground3 : webLightTheme.colorNeutralForegroundOnBrand,
            ),
          );
          expect(root.querySelector('.fui-CounterBadge__icon') !== null).to.equal(phase === 2);
        });
      }
    });
  }

  it('exposes headless base defaults and generated content without injecting styled state or live attributes', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Fixture = () => {
      const state = useCounterBadgeBase_unstable({ count: 100, overflowCount: 5, id: 'headless-counter' }, ref);
      return (
        <>
          <output data-testid="state">
            {JSON.stringify({
              count: state.count,
              dot: state.dot,
              showZero: state.showZero,
              iconPosition: state.iconPosition,
              shape: 'shape' in state,
              appearance: 'appearance' in state,
              color: 'color' in state,
              size: 'size' in state,
            })}
          </output>
          {renderBadge_unstable(state)}
        </>
      );
    };
    themedMount(<Fixture />);
    cy.get('[data-testid="state"]').should(
      'have.text',
      JSON.stringify({
        count: 100,
        dot: false,
        showZero: false,
        iconPosition: 'before',
        shape: false,
        appearance: false,
        color: false,
        size: false,
      }),
    );
    cy.get('#headless-counter').should($root => {
      expect($root[0].textContent).to.equal('5+');
      expect(ref.current).to.equal($root[0]);
      expect($root[0].hasAttribute('class')).to.equal(false);
      expect($root[0].hasAttribute('aria-live')).to.equal(false);
      expect($root[0].hasAttribute('overflowcount')).to.equal(false);
    });
  });

  it('exposes styled hook defaults and re-derives zero/dot content independently of internal count state', () => {
    const Fixture = () => {
      const [phase, setPhase] = React.useState(0);
      const state = useCounterBadge_unstable(
        { id: 'styled-counter', showZero: phase === 1, dot: phase === 2 },
        React.useRef(null),
      );
      return (
        <>
          <button onClick={() => setPhase((phase + 1) % 3)}>Update hook</button>
          <output data-testid="state">
            {JSON.stringify({
              count: state.count,
              dot: state.dot,
              showZero: state.showZero,
              shape: state.shape,
              appearance: state.appearance,
              color: state.color,
              size: state.size,
            })}
          </output>
          {renderBadge_unstable(state)}
        </>
      );
    };
    themedMount(<Fixture />);
    for (const phase of [0, 1, 2]) {
      if (phase) {
        cy.contains('button', 'Update hook').realClick();
      }
      cy.get('[data-testid="state"]').should(
        'have.text',
        JSON.stringify({
          count: 0,
          dot: phase === 2,
          showZero: phase === 1,
          shape: 'circular',
          appearance: 'filled',
          color: 'brand',
          size: 'medium',
        }),
      );
      cy.get('#styled-counter').should('have.text', phase === 1 ? '0' : '');
    }
  });
});

describe('CounterBadge edges and accessibility', () => {
  const numericCases = [
    { label: 'negative integer', count: -12, text: '-12' },
    { label: 'negative fraction', count: -0.25, text: '-0.25' },
    { label: 'fraction is not rounded', count: 1.25, text: '1.25' },
    { label: 'fraction just below default threshold', count: 98.99, text: '98.99' },
    { label: 'fraction just above default threshold', count: 99.01, text: '99+' },
    { label: 'negative zero hidden', count: -0, text: '' },
    { label: 'negative zero shown', count: -0, showZero: true, text: '0' },
    { label: 'epsilon', count: Number.EPSILON, text: '2.220446049250313e-16' },
    { label: 'smallest positive number', count: Number.MIN_VALUE, text: '5e-324' },
    { label: 'negative smallest number', count: -Number.MIN_VALUE, text: '-5e-324' },
    { label: 'safe integer capped', count: Number.MAX_SAFE_INTEGER, text: '99+' },
    { label: 'minimum safe integer', count: Number.MIN_SAFE_INTEGER, text: '-9007199254740991' },
    { label: 'maximum finite number capped', count: Number.MAX_VALUE, text: '99+' },
    {
      label: 'maximum finite number uncapped',
      count: Number.MAX_VALUE,
      overflowCount: Number.MAX_VALUE,
      text: '1.7976931348623157e+308',
    },
    {
      label: 'safe integer at custom threshold',
      count: Number.MAX_SAFE_INTEGER,
      overflowCount: Number.MAX_SAFE_INTEGER,
      text: '9007199254740991',
    },
    { label: 'fractional threshold equality', count: 1.25, overflowCount: 1.25, text: '1.25' },
    { label: 'fractional threshold exceeded', count: 1.26, overflowCount: 1.25, text: '1.25+' },
    { label: 'negative threshold equality', count: -2, overflowCount: -2, text: '-2' },
    { label: 'negative threshold exceeded', count: -1, overflowCount: -2, text: '-2+' },
    { label: 'zero with negative threshold', count: 0, overflowCount: -2, showZero: true, text: '-2+' },
    { label: 'zero before threshold formatting', count: 0, overflowCount: -2, text: '' },
    { label: 'scientific positive threshold', count: 1e22, overflowCount: 1e21, text: '1e+21+' },
  ];
  for (const scenario of numericCases) {
    it(`formats ${scenario.label} using the supported number without inventing rounding`, () => {
      const { label, text, ...props } = scenario;
      themedMount(<CounterBadge data-testid="counter" {...props} />);
      cy.get(badge).should($root => expectText($root[0], text, text !== ''));
    });
  }

  for (const [label, children, text, visible] of [
    ['text override', 'Unread', 'Unread', true],
    ['positive numeric override', 12, '12', true],
    ['negative numeric override', -2, '-2', true],
    ['null falls back', null, '7', true],
    ['undefined falls back', undefined, '7', true],
    ['false falls back', false, '7', true],
    ['empty string falls back', '', '7', true],
    ['empty array suppresses generation', [], '', true],
    ['empty fragment suppresses generation', <React.Fragment key="empty" />, '', true],
    ['numeric zero is overwritten by count (inherited defect)', 0, '7', true],
  ] as const) {
    it(`characterizes children: ${label}`, () => {
      themedMount(
        <CounterBadge data-testid="counter" count={7}>
          {children}
        </CounterBadge>,
      );
      cy.get(badge).should($root => expectText($root[0], text, visible));
    });
  }

  it('characterizes numeric zero children hidden at zero despite text in the DOM (inherited defect)', () => {
    themedMount(
      <CounterBadge data-testid="counter" count={0}>
        {0}
      </CounterBadge>,
    );
    cy.get(badge).should($root => expectText($root[0], '0', false));
  });

  for (const scenario of [
    { label: 'text overrides hidden zero', props: { count: 0, children: 'Unread' }, text: 'Unread', visible: true },
    {
      label: 'text overrides custom overflow',
      props: { count: 100, overflowCount: 5, children: 'Unread' },
      text: 'Unread',
      visible: true,
    },
    {
      label: 'numeric zero child in dot mode',
      props: { count: 100, dot: true, children: 0 },
      text: '0',
      visible: true,
    },
    {
      label: 'numeric zero child with showZero',
      props: { count: 0, showZero: true, children: 0 },
      text: '0',
      visible: true,
    },
    { label: 'null children at hidden zero', props: { count: 0, children: null }, text: '', visible: false },
    {
      label: 'null children at shown zero',
      props: { count: 0, showZero: true, children: null },
      text: '0',
      visible: true,
    },
    { label: 'empty array at zero', props: { count: 0, children: [] }, text: '', visible: true },
    { label: 'true children suppress count', props: { count: 99, children: true }, text: '', visible: true },
    { label: 'empty string at hidden zero', props: { count: 0, children: '' }, text: '', visible: false },
  ]) {
    it(`characterizes override precedence: ${scenario.label}`, () => {
      themedMount(<CounterBadge data-testid="counter" {...scenario.props} />);
      cy.get(badge).should($root => expectText($root[0], scenario.text, scenario.visible));
    });
  }

  it('preserves JSX and explicit children in dot mode without generating a count', () => {
    themedMount(
      <div>
        <CounterBadge data-testid="counter" count={1000}>
          <strong data-testid="override">Unread</strong>
        </CounterBadge>
        <CounterBadge data-testid="dot-override" count={1000} dot>
          <span>Custom</span>
        </CounterBadge>
      </div>,
    );
    cy.get(badge).should('have.text', 'Unread');
    cy.get('[data-testid="override"]').should('have.prop', 'tagName', 'STRONG');
    cy.get('[data-testid="dot-override"]').should($root => {
      expectText($root[0], 'Custom', true);
      expect($root[0].getBoundingClientRect().width).to.equal(6);
      expect($root[0].getBoundingClientRect().height).to.equal(6);
    });
  });

  for (const size of ['small', 'medium', 'extra-large'] as const) {
    for (const position of ['before', 'after'] as const) {
      it(`keeps generated text zero and ${size}/${position} icon geometry distinct from hidden and dot modes`, () => {
        themedMount(
          <div>
            {modes.map(mode => (
              <CounterBadge
                key={mode.label}
                data-testid={mode.label}
                size={size}
                iconPosition={position}
                icon={glyph}
                {...mode.props}
              />
            ))}
          </div>,
        );
        for (const mode of modes) {
          cy.get(`[data-testid="${mode.label}"]`).should($root => {
            expectText($root[0], mode.text, mode.visible);
            const icon = $root[0].querySelector<HTMLElement>('.fui-CounterBadge__icon');
            expect(icon).not.to.equal(null);
            if (!icon) {
              throw new Error('Missing explicitly requested icon');
            }
            expect(icon.classList.contains('fui-Badge__icon')).to.equal(true);
            expect($root[0][position === 'before' ? 'firstChild' : 'lastChild']).to.equal(icon);
            const negative = -Number.parseFloat(webLightTheme.spacingHorizontalXXS);
            const spacing =
              Number.parseFloat(
                size === 'extra-large' ? webLightTheme.spacingHorizontalXS : webLightTheme.spacingHorizontalXXS,
              ) + Number.parseFloat(webLightTheme.spacingHorizontalXXS);
            expect(Number.parseFloat(css(icon).marginLeft)).to.equal(
              mode.text && position === 'after' ? spacing : negative,
            );
            expect(Number.parseFloat(css(icon).marginRight)).to.equal(
              mode.text && position === 'before' ? spacing : negative,
            );
          });
        }
      });
    }
  }

  it('updates count, threshold, dot, showZero and children through every branch without remounting', () => {
    const phases: { props: CounterBadgeProps; text: string; visible: boolean }[] = [
      { props: {}, text: '', visible: false },
      { props: { count: 1 }, text: '1', visible: true },
      { props: { count: 99 }, text: '99', visible: true },
      { props: { count: 100 }, text: '99+', visible: true },
      { props: { count: 100, overflowCount: 100 }, text: '100', visible: true },
      { props: { count: 100, overflowCount: 5 }, text: '5+', visible: true },
      { props: { count: 100, dot: true }, text: '', visible: true },
      { props: { count: 0, dot: true }, text: '', visible: true },
      { props: { count: 0, showZero: true }, text: '0', visible: true },
      { props: { count: 0 }, text: '', visible: false },
      { props: { count: -1 }, text: '-1', visible: true },
      { props: { count: 2.5 }, text: '2.5', visible: true },
      { props: { count: 100, children: 'Override' }, text: 'Override', visible: true },
      { props: { count: 100, children: null }, text: '99+', visible: true },
      { props: {}, text: '', visible: false },
    ];
    const Fixture = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button onClick={() => setPhase(phase + 1)}>Next counter state</button>
          <CounterBadge data-testid="counter" {...phases[phase].props} />
        </>
      );
    };
    themedMount(<Fixture />);
    let original: HTMLElement;
    cy.get(badge).then($root => {
      original = $root[0];
    });
    for (const [index, phase] of phases.entries()) {
      if (index) {
        cy.contains('button', 'Next counter state').realClick();
      }
      cy.get(badge).should($root => {
        expect($root[0]).to.equal(original);
        expectText($root[0], phase.text, phase.visible);
        expect($root[0].hasAttribute('aria-live')).to.equal(false);
        if (phase.visible) {
          expect($root[0].getBoundingClientRect().height).to.equal(phase.props.dot ? 6 : 20);
        }
      });
    }
  });

  for (const [themeName, theme] of [
    ['light', webLightTheme],
    ['dark', webDarkTheme],
  ] as const) {
    for (const dir of ['ltr', 'rtl'] as const) {
      it(`retains text, overflow width, zero exclusion and dot geometry in ${themeName}/${dir}`, () => {
        themedMount(
          <div>
            <CounterBadge data-testid="one" count={1} />
            <CounterBadge data-testid="wide" count={123456789} overflowCount={123456789} />
            <CounterBadge data-testid="counter" count={100} />
            <CounterBadge data-testid="zero" />
            <CounterBadge data-testid="dot" dot />
            {(['before', 'after'] as const).flatMap(position =>
              [0, 100].map(count => (
                <CounterBadge
                  key={`${position}-${count}`}
                  data-testid={`direction-${position}-${count}`}
                  count={count}
                  showZero
                  icon={glyph}
                  iconPosition={position}
                />
              )),
            )}
          </div>,
          theme,
          dir,
        );
        let oneWidth: number;
        cy.get('[data-testid="one"]').then($root => {
          oneWidth = $root[0].getBoundingClientRect().width;
        });
        cy.get('[data-testid="wide"]').should($root => {
          expectText($root[0], '123456789', true);
          expect($root[0].getBoundingClientRect().width).to.be.greaterThan(oneWidth);
          expect(css($root[0]).direction).to.equal(dir);
        });
        cy.get(badge).should($root => {
          expectText($root[0], '99+', true);
          expect(css($root[0]).backgroundColor).to.equal(normalizedColor($root[0], theme.colorBrandBackground));
          expect(css($root[0]).color).to.equal(normalizedColor($root[0], theme.colorNeutralForegroundOnBrand));
        });
        cy.get('[data-testid="zero"]').should($root => expectText($root[0], '', false));
        cy.get('[data-testid="dot"]').should($root => {
          expectText($root[0], '', true);
          expect($root[0].getBoundingClientRect().width).to.equal(6);
          expect($root[0].getBoundingClientRect().height).to.equal(6);
        });
        for (const position of ['before', 'after'] as const) {
          for (const count of [0, 100]) {
            cy.get(`[data-testid="direction-${position}-${count}"]`).should($root => {
              const root = $root[0];
              expectText(root, count === 0 ? '0' : '99+', true);
              const icon = root.querySelector('.fui-CounterBadge__icon');
              const text = Array.from(root.childNodes).find(node => node.nodeType === 3);
              if (!icon || !text) {
                throw new Error('Directional counter must contain both icon and generated text');
              }
              const range = root.ownerDocument.createRange();
              range.selectNodeContents(text);
              const textRect = range.getBoundingClientRect();
              const iconRect = icon.getBoundingClientRect();
              expect(iconRect.width).to.equal(12);
              expect(textRect.width).to.be.greaterThan(0);
              const iconOnLeft = (position === 'before') === (dir === 'ltr');
              if (iconOnLeft) {
                expect(iconRect.right).to.be.lessThan(textRect.left);
              } else {
                expect(iconRect.left).to.be.greaterThan(textRect.right);
              }
              range.detach();
            });
          }
        }
      });
    }
  }

  it('leaves owning-control names and descriptions to the consumer, not truncated visual count', () => {
    const Fixture = () => {
      const [count, setCount] = React.useState(100);
      return (
        <div data-testid="a11y">
          <button onClick={() => setCount(count + 1)}>Increase</button>
          <button
            data-testid="owner"
            aria-label={`Inbox, ${count} unread messages`}
            aria-describedby="counter-description"
          >
            Inbox <CounterBadge data-testid="counter" count={count} aria-hidden="true" />
          </button>
          <span id="counter-description">Unread messages need attention</span>
          <CounterBadge count={count} role="img" aria-label={`${count} unread messages`} />
        </div>
      );
    };
    themedMount(<Fixture />);
    cy.get('[data-testid="owner"]').should($root => {
      expect(computeAccessibleName($root[0])).to.equal('Inbox, 100 unread messages');
      expect(computeAccessibleDescription($root[0])).to.equal('Unread messages need attention');
    });
    cy.get(badge).should('have.text', '99+').and('have.attr', 'aria-hidden', 'true');
    cy.contains('button', 'Increase').realClick();
    cy.get('[data-testid="owner"]').should($root => {
      expect(computeAccessibleName($root[0])).to.equal('Inbox, 101 unread messages');
    });
    cy.get('[data-testid="a11y"]')
      .then($root => axe.run($root[0]))
      .then(result => {
        expect(result.violations.map(violation => violation.id)).to.deep.equal([]);
      });
    cy.get('[aria-live], [role="status"], [role="alert"]').should('not.exist');
  });

  it('preserves consumer-owned status/live attributes during updates without adding them to peers', () => {
    const Fixture = () => {
      const [count, setCount] = React.useState(0);
      return (
        <>
          <button onClick={() => setCount(count + 1)}>Update status</button>
          <CounterBadge
            data-testid="counter"
            count={count}
            showZero
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-relevant="text"
            aria-label="Pending requests"
          />
          <CounterBadge data-testid="plain" count={count} showZero />
          <CounterBadge data-testid="disabled-live" count={count} showZero aria-live="off" />
        </>
      );
    };
    themedMount(<Fixture />);
    for (const text of ['0', '1', '2']) {
      if (text !== '0') {
        cy.contains('button', 'Update status').realClick();
      }
      cy.get(badge)
        .should('have.text', text)
        .and('have.attr', 'role', 'status')
        .and('have.attr', 'aria-live', 'polite')
        .and('have.attr', 'aria-atomic', 'true')
        .and('have.attr', 'aria-relevant', 'text')
        .and('have.attr', 'aria-label', 'Pending requests');
      cy.get('[data-testid="plain"]').should($root => {
        expect($root[0].hasAttribute('role')).to.equal(false);
        expect($root[0].hasAttribute('aria-live')).to.equal(false);
      });
      cy.get('[data-testid="disabled-live"]').should('have.attr', 'aria-live', 'off');
    }
  });

  it('supports consumer offscreen description styling separately from hidden-zero display', () => {
    const Fixture = () => {
      const styles = useConsumerStyles();
      return (
        <>
          <button data-testid="owner" aria-describedby="offscreen-count">
            Notifications
          </button>
          <CounterBadge
            id="offscreen-count"
            data-testid="counter"
            className={styles.offscreen}
            count={100}
            overflowCount={100}
          />
          <CounterBadge data-testid="hidden" />
          <CounterBadge data-testid="visible" count={100} overflowCount={100} />
        </>
      );
    };
    themedMount(<Fixture />);
    cy.get('[data-testid="owner"]').should($root => {
      expect(computeAccessibleName($root[0])).to.equal('Notifications');
      expect(computeAccessibleDescription($root[0])).to.equal('100');
    });
    cy.get(badge).should($root => {
      expect($root[0].textContent).to.equal('100');
      expect(css($root[0]).display).to.equal('flex');
      expect(css($root[0]).position).to.equal('absolute');
      expect(css($root[0]).clipPath).to.equal('inset(50%)');
      expect($root[0].getBoundingClientRect().width).to.equal(1);
      expect($root[0].getBoundingClientRect().height).to.equal(1);
    });
    cy.get('[data-testid="hidden"]').should($root => expectText($root[0], '', false));
    cy.get('[data-testid="visible"]').should($root => {
      expect($root[0].getBoundingClientRect().height).to.equal(20);
      expect(css($root[0]).clipPath).to.equal('none');
    });
  });

  it('has a positive accessibility failure control for consumer-provided image naming', () => {
    themedMount(
      <div data-testid="a11y">
        <CounterBadge count={1} role="img" />
        <CounterBadge count={1} role="img" aria-label="One unread message" />
      </div>,
    );
    cy.get('[data-testid="a11y"]')
      .then($root => axe.run($root[0], { runOnly: ['role-img-alt'] }))
      .then(result => {
        expect(result.violations.map(violation => violation.id)).to.deep.equal(['role-img-alt']);
        expect(result.violations[0].nodes).to.have.length(1);
        expect(result.passes.find(pass => pass.id === 'role-img-alt')?.nodes).to.have.length(1);
      });
  });

  describe('active forced colors', () => {
    afterEach(() =>
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [] },
        }),
      ),
    );
    for (const appearance of appearances) {
      for (const color of colors) {
        for (const dot of [false, true]) {
          it(`preserves system colors and counter geometry at ${appearance}/${color}/dot=${dot}`, () => {
            cy.then(() =>
              Cypress.automation('remote:debugger:protocol', {
                command: 'Emulation.setEmulatedMedia',
                params: { features: [{ name: 'forced-colors', value: 'active' }] },
              }),
            );
            themedMount(
              <CounterBadge data-testid="counter" count={100} appearance={appearance} color={color} dot={dot} />,
            );
            cy.get(badge).should($root => {
              const root = $root[0];
              const view = root.ownerDocument.defaultView;
              if (!view) {
                throw new Error('Missing browsing context');
              }
              expect(view.matchMedia('(forced-colors: active)').matches).to.equal(true);
              expectText(root, dot ? '' : '99+', true);
              expect(root.getBoundingClientRect().height).to.equal(dot ? 6 : 20);
              expect(css(root).forcedColorAdjust).to.equal('auto');
              expect(css(root).color).to.equal(normalizedColor(root, 'CanvasText'));
              if (appearance === 'filled') {
                expect(css(root).backgroundColor).to.equal(normalizedColor(root, 'Canvas'));
              } else {
                expect(css(root).backgroundColor).to.match(/^rgba\(.+, 0\)$/);
              }
              expect(css(root, '::after').display).to.equal(appearance === 'ghost' ? 'none' : 'block');
              if (appearance === 'filled') {
                expect(css(root, '::after').borderTopWidth).to.equal(webLightTheme.strokeWidthThin);
                expect(css(root, '::after').borderTopColor).to.equal(normalizedColor(root, 'CanvasText'));
              }
            });
          });
        }
      }
    }
  });
});

describe('CounterBadge documentation', () => {
  it('uses the default medium circular filled brand styling for a visible count', () => {
    themedMount(<CounterBadge data-testid="counter" count={5} />);
    cy.get(badge).should($root => {
      expectText($root[0], '5', true);
      const style = css($root[0]);
      expect($root[0].getBoundingClientRect().height).to.equal(20);
      expect(style.borderRadius).to.equal(webLightTheme.borderRadiusCircular);
      expect(style.backgroundColor).to.equal(normalizedColor($root[0], webLightTheme.colorBrandBackground));
      expect(style.color).to.equal(normalizedColor($root[0], webLightTheme.colorNeutralForegroundOnBrand));
    });
  });

  for (const count of [-1, 0, 1, 99, 100]) {
    for (const overflowCount of [0, 99]) {
      for (const showZero of [false, true]) {
        for (const dot of [false, true]) {
          it(`owns count=${count}/overflow=${overflowCount}/showZero=${showZero}/dot=${dot}`, () => {
            themedMount(
              <CounterBadge
                data-testid="counter"
                count={count}
                overflowCount={overflowCount}
                showZero={showZero}
                dot={dot}
              />,
            );
            const text =
              dot || (count === 0 && !showZero) ? '' : count > overflowCount ? `${overflowCount}+` : `${count}`;
            cy.get(badge).should($root => {
              expectText($root[0], text, dot || text !== '');
              for (const attr of ['count', 'overflowcount', 'showzero', 'dot']) {
                expect($root[0].hasAttribute(attr), attr).to.equal(false);
              }
            });
          });
        }
      }
    }
  }

  for (const [index, size] of sizes.entries()) {
    for (const shape of shapes) {
      it(`combines all supported colors/appearances with five counter modes at ${size}/${shape}`, () => {
        themedMount(
          <div>
            {appearances.flatMap(appearance =>
              colors.flatMap(color =>
                modes.map(mode => (
                  <CounterBadge
                    key={`${appearance}-${color}-${mode.label}`}
                    data-testid={`${appearance}-${color}-${mode.label}`}
                    size={size}
                    shape={shape}
                    appearance={appearance}
                    color={color}
                    {...mode.props}
                  />
                )),
              ),
            )}
          </div>,
        );
        for (const appearance of appearances) {
          for (const color of colors) {
            for (const mode of modes) {
              cy.get(`[data-testid="${appearance}-${color}-${mode.label}"]`).should($root => {
                const root = $root[0];
                expectText(root, mode.text, mode.visible);
                const style = css(root);
                const radius =
                  shape === 'circular'
                    ? webLightTheme.borderRadiusCircular
                    : index < 3
                    ? webLightTheme.borderRadiusSmall
                    : webLightTheme.borderRadiusMedium;
                expect(Number.parseFloat(style.borderRadius)).to.equal(Number.parseFloat(radius));
                if (mode.visible) {
                  expect(root.getBoundingClientRect().height).to.equal(mode.props.dot ? 6 : heights[index]);
                }
                if (mode.props.dot) {
                  expect(root.getBoundingClientRect().width).to.equal(6);
                  expect(style.paddingLeft).to.equal('0px');
                  expect(style.paddingRight).to.equal('0px');
                }
                const backgrounds = {
                  brand: webLightTheme.colorBrandBackground,
                  danger: webLightTheme.colorPaletteRedBackground3,
                  important: webLightTheme.colorNeutralForeground1,
                  informative: webLightTheme.colorNeutralBackground5,
                };
                const foregrounds = {
                  brand: webLightTheme.colorBrandForeground1,
                  danger: webLightTheme.colorPaletteRedForeground3,
                  important: webLightTheme.colorNeutralForeground1,
                  informative: webLightTheme.colorNeutralForeground3,
                };
                const filledForeground =
                  color === 'important'
                    ? webLightTheme.colorNeutralBackground1
                    : color === 'informative'
                    ? webLightTheme.colorNeutralForeground3
                    : webLightTheme.colorNeutralForegroundOnBrand;
                expect(style.backgroundColor).to.equal(
                  normalizedColor(root, appearance === 'filled' ? backgrounds[color] : 'transparent'),
                );
                expect(style.color).to.equal(
                  normalizedColor(root, appearance === 'filled' ? filledForeground : foregrounds[color]),
                );
                expect(css(root, '::after').display).to.equal(appearance === 'ghost' ? 'none' : 'block');
                expect(root.querySelector('.fui-CounterBadge__icon')).to.equal(null);
              });
            }
          }
        }
      });
    }
  }
});
