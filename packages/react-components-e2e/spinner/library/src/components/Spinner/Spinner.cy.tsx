import 'cypress-real-events';
import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme, typographyStyles } from '@fluentui/react-theme';
import { getByRole } from '@testing-library/dom';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import type { LabelProps } from '@fluentui/react-label';
import { Spinner } from './Spinner';
import type { SpinnerProps, SpinnerBaseProps, SpinnerState } from './Spinner.types';
import { useSpinner_unstable, useSpinnerBase_unstable } from './useSpinner';
import { useSpinnerStyles_unstable } from './useSpinnerStyles.styles';
import { renderSpinner_unstable } from './renderSpinner';
import { SpinnerContextProvider } from '../../contexts/SpinnerContext';

const sizes = [
  ['extra-tiny', 16, 'strokeWidthThick', 'body1'],
  ['tiny', 20, 'strokeWidthThick', 'body1'],
  ['extra-small', 24, 'strokeWidthThick', 'body1'],
  ['small', 28, 'strokeWidthThick', 'body1'],
  ['medium', 32, 'strokeWidthThicker', 'subtitle2'],
  ['large', 36, 'strokeWidthThicker', 'subtitle2'],
  ['extra-large', 40, 'strokeWidthThicker', 'subtitle2'],
  ['huge', 44, 'strokeWidthThickest', 'subtitle1'],
] as const;
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const root = () => cy.get('[data-testid="root"]');
const ring = () => root().find('.fui-Spinner__spinner');
const label = () => root().find('.fui-Spinner__label');
const computed = (element: HTMLElement, pseudo?: string) =>
  element.ownerDocument.defaultView!.getComputedStyle(element, pseudo);
const normalizedColor = (element: HTMLElement, value: string) => {
  const probe = element.ownerDocument.createElement('span');
  probe.style.color = value;
  element.appendChild(probe);
  const result = computed(probe).color;
  probe.remove();
  return result;
};
const assertName = (element: HTMLElement, name: string, role = 'progressbar', description?: string) =>
  expect(getByRole(element.parentElement!, role, { name, description })).to.equal(element);
const assertIndeterminate = (element: HTMLElement) => {
  for (const attr of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext', 'aria-live', 'aria-busy']) {
    expect(element.hasAttribute(attr), attr).to.equal(false);
  }
};
const assertAppearance = (element: HTMLElement, appearance: SpinnerProps['appearance'], theme = teamsLightTheme) => {
  const spinner = element.querySelector<HTMLElement>('.fui-Spinner__spinner')!;
  const text = element.querySelector<HTMLElement>('.fui-Spinner__label')!;
  expect(computed(spinner).backgroundColor).to.equal(
    normalizedColor(
      element,
      appearance === 'inverted' ? theme.colorNeutralStrokeAlpha2 : theme.colorBrandStroke2Contrast,
    ),
  );
  expect(computed(spinner).color).to.equal(
    normalizedColor(element, appearance === 'inverted' ? theme.colorNeutralStrokeOnBrand2 : theme.colorBrandStroke1),
  );
  expect(computed(text).color).to.equal(
    normalizedColor(
      element,
      appearance === 'inverted' ? theme.colorNeutralForegroundStaticInverted : theme.colorNeutralForeground1,
    ),
  );
};
const media = (features: { name: string; value: string }[] = []) =>
  Cypress.automation('remote:debugger:protocol', {
    command: 'Emulation.setEmulatedMedia',
    params: { media: 'screen', features },
  });
const motion = (value: 'reduce' | 'no-preference') => media([{ name: 'prefers-reduced-motion', value }]);

const assertMotion = (element: HTMLElement, reduced: boolean, dir: 'ltr' | 'rtl') => {
  const spinner = element.querySelector<HTMLElement>('.fui-Spinner__spinner')!;
  const tail = element.querySelector<HTMLElement>('.fui-Spinner__spinnerTail')!;
  const view = element.ownerDocument.defaultView!;
  expect(view.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(reduced);
  expect(computed(spinner).animationDuration).to.equal(reduced ? '1.8s' : '1.5s');
  expect(computed(spinner).animationIterationCount).to.equal('infinite');
  expect(computed(spinner).animationTimingFunction).to.equal('linear');
  expect(computed(tail).animationIterationCount).to.equal(reduced ? '0' : 'infinite');
  expect(computed(tail).animationTimingFunction.replace(/\s/g, '')).to.equal(teamsLightTheme.curveEasyEase);
  expect(computed(tail).maskImage).to.equal(
    dir === 'rtl'
      ? 'conic-gradient(rgb(255, 255, 255) 255deg, rgba(0, 0, 0, 0) 255deg)'
      : 'conic-gradient(rgba(0, 0, 0, 0) 105deg, rgb(255, 255, 255) 105deg)',
  );
  for (const pseudo of ['::before', '::after']) {
    const arc = computed(tail, pseudo);
    expect(arc.content).to.equal(reduced ? 'none' : '""');
    if (!reduced) {
      expect(arc.animationDuration).to.equal('1.5s');
      expect(arc.animationIterationCount).to.equal('infinite');
      expect(arc.backgroundImage).to.contain('conic-gradient');
      expect(parseFloat(arc.width)).to.equal(parseFloat(computed(spinner).width));
      expect(parseFloat(arc.height)).to.equal(parseFloat(computed(spinner).height));
    }
  }
  if (reduced) {
    const color = computed(spinner).color;
    expect(computed(tail).backgroundImage).to.equal(
      dir === 'rtl'
        ? `conic-gradient(${color} 0deg, rgba(0, 0, 0, 0) 240deg)`
        : `conic-gradient(rgba(0, 0, 0, 0) 120deg, ${color} 360deg)`,
    );
  }
  expect(spinner.getAnimations({ subtree: true })).to.have.length(reduced ? 1 : 4);
};

describe('Spinner documented contracts', () => {
  it('defaults to an indeterminate medium progressbar with an optional label and animated span ring', () => {
    mount(<Spinner data-testid="root" label="Loading" />);
    root().should($root => {
      const element = $root[0];
      expect(element.tagName).to.equal('DIV');
      assertName(element, 'Loading');
      assertIndeterminate(element);
      expect(element.getAttribute('aria-labelledby')).to.equal(element.querySelector('label')!.id);
      expect(computed(element).display).to.equal('flex');
      expect(computed(element).overflow).to.equal('hidden');
      expect(computed(element).gap).to.equal('8px');
      expect(element.children[0].tagName).to.equal('SPAN');
      expect(element.children[1].tagName).to.equal('LABEL');
    });

    ring().should($ring => {
      expect(computed($ring[0]).width).to.equal('32px');
      expect(computed($ring[0]).height).to.equal('32px');
    });
    ring().find('.fui-Spinner__spinnerTail').should('have.length', 1);
  });
});

describe('Spinner edges and accessibility', () => {
  beforeEach(() => cy.then(() => motion('no-preference')));
  afterEach(() => cy.then(() => media()));

  for (const [name, value, hasLabel, text] of [
    ['undefined', undefined, false, ''],
    ['null', null, false, ''],
    ['empty string', '', true, ''],
    ['zero', 0, true, '0'],
  ] as const) {
    it(`handles ${name} label shorthand without losing zero or creating null content`, () => {
      mount(<Spinner data-testid="root" label={value} />);
      root().should($root => {
        expect($root[0].querySelectorAll('.fui-Spinner__label')).to.have.length(hasLabel ? 1 : 0);
        expect($root[0].hasAttribute('aria-labelledby')).to.equal(hasLabel);
        assertName($root[0], text);
      });
      ring().should('be.visible');
      if (hasLabel) {
        label().should('have.text', text);
      }
    });
  }

  it('uses a React element label as content and retains an accessible name', () => {
    mount(
      <Spinner
        data-testid="root"
        label={
          <span>
            Loading <strong>profile</strong>
          </span>
        }
      />,
    );
    label().find('strong').should('have.text', 'profile');
    root().should($root => assertName($root[0], 'Loading profile'));
  });

  it('respects explicit labelledby over generated label and aria-label and resolves a description', () => {
    mount(
      <>
        <h2 id="external-title">Fetching records</h2>
        <p id="external-detail">Please wait for the records</p>
        <Spinner
          data-testid="root"
          label="Visual loading"
          aria-label="Fallback name"
          aria-labelledby="external-title"
          aria-describedby="external-detail"
        />
      </>,
    );
    root().should($root => {
      assertName($root[0], 'Fetching records', 'progressbar', 'Please wait for the records');
      expect($root[0].getAttribute('aria-labelledby')).to.equal('external-title');
    });
    label().should('have.text', 'Visual loading');
  });

  it('uses aria-label without a label, but generated labelledby takes precedence when a label exists', () => {
    mount(
      <>
        <Spinner data-testid="named" aria-label="Loading records" />
        <Spinner data-testid="root" aria-label="Fallback" label="Saving records" />
      </>,
    );
    cy.get('[data-testid="named"]').should($root => assertName($root[0], 'Loading records'));
    root().should($root => assertName($root[0], 'Saving records'));
  });

  it('keeps generated IDs unique across independent and nested spinners', () => {
    const renderRoot: SlotRenderFunction<React.HTMLAttributes<HTMLElement>> = (Root, props) => (
      <Root {...props}>
        {props.children}
        <Spinner label="Loading nested" role="status" />
      </Root>
    );
    mount(
      <div>
        <Spinner data-testid="one" label="Loading profile" />
        <Spinner data-testid="two" label="Loading comments" />
        <Spinner data-testid="root" label="Loading outer">
          {renderRoot}
        </Spinner>
      </div>,
    );
    cy.get('.fui-Spinner__label').should($labels => {
      const ids = Array.from($labels, element => element.id);
      expect(new Set(ids).size).to.equal(ids.length);
      expect(ids.every(Boolean)).to.equal(true);
    });
    for (const [id, name] of [
      ['one', 'Loading profile'],
      ['two', 'Loading comments'],
    ]) {
      cy.get(`[data-testid="${id}"]`).should($root => assertName($root[0], name));
    }
    root()
      .find('[role="status"]')
      .should($status => assertName($status[0], 'Loading nested', 'status'));
  });

  it('supports status role implicit live semantics and explicitly supplied live attributes without generating them', () => {
    mount(
      <>
        <Spinner data-testid="status" role="status" label="Saving" />
        <Spinner data-testid="root" role="status" aria-live="assertive" aria-atomic={false} label="Updating" />
      </>,
    );
    cy.get('[data-testid="status"]').should($status => {
      assertName($status[0], 'Saving', 'status');
      expect($status[0].hasAttribute('aria-live')).to.equal(false);
      expect($status[0].hasAttribute('aria-atomic')).to.equal(false);
    });
    root().should($root => assertName($root[0], 'Updating', 'status'));
    root().should('have.attr', 'aria-live', 'assertive').and('have.attr', 'aria-atomic', 'false');
  });

  it('keeps hidden accessibility metadata consumer-owned', () => {
    mount(<Spinner data-testid="root" label="Hidden loader" aria-hidden="true" />);
    root().should($root => {
      expect(getByRole($root[0].parentElement!, 'progressbar', { hidden: true })).to.equal($root[0]);
      expect($root[0].getAttribute('aria-hidden')).to.equal('true');
      expect($root[0].querySelector('[aria-hidden]')).to.equal(null);
    });
  });

  it('allows label-only presentation by suppressing the ring and tail with spinner null', () => {
    mount(<Spinner data-testid="root" spinner={null} label="Loading text only" />);
    ring().should('not.exist');
    root().find('.fui-Spinner__spinnerTail').should('not.exist');
    label().should('be.visible');
    root().should($root => assertName($root[0], 'Loading text only'));
  });

  it('ignores ordinary root and ring children in favor of the structured slots, but preserves label and tail children', () => {
    mount(
      <Spinner
        data-testid="root"
        spinner={{ children: <span data-testid="ignored-ring">Unused ring content</span> }}
        spinnerTail={{ children: <span data-testid="tail-child">Tail content</span> }}
        label={{ children: 0 }}
      >
        <span data-testid="ignored-root">Unused root content</span>
      </Spinner>,
    );
    cy.get('[data-testid="ignored-root"], [data-testid="ignored-ring"]').should('not.exist');
    ring().find('[data-testid="tail-child"]').should('have.text', 'Tail content');
    label().should('have.text', '0');
    root().should($root => assertName($root[0], '0'));
  });

  it('does not steal focus and is skipped in default tab order', () => {
    mount(
      <>
        <button>Before loading</button>
        <Spinner data-testid="root" label="Loading" />
        <button>After loading</button>
      </>,
    );
    cy.contains('button', 'Before loading').focus().realPress('Tab');
    cy.contains('button', 'After loading').should('be.focused');
    root().should('not.have.attr', 'tabindex');
  });

  it('leaves completion, reload, busy region and live feedback to the consumer', () => {
    const Fixture = () => {
      const [loading, setLoading] = React.useState(true);
      return (
        <>
          <button onClick={() => setLoading(value => !value)}>Toggle loading</button>
          <section data-testid="region" role="region" aria-label="Profile" aria-busy={loading}>
            {loading ? <Spinner label="Loading profile" /> : <p>Profile loaded</p>}
          </section>
          <p data-testid="feedback" role="status">
            {loading ? 'Loading profile' : 'Profile ready'}
          </p>
        </>
      );
    };
    mount(<Fixture />);
    cy.get('[data-testid="region"]').should('have.attr', 'aria-busy', 'true');
    cy.get('[role="progressbar"]').should('have.length', 1).and('not.have.attr', 'aria-busy');
    cy.contains('button', 'Toggle loading').realClick();
    cy.get('[role="progressbar"]').should('not.exist');
    cy.get('[data-testid="region"]').should('have.attr', 'aria-busy', 'false');
    cy.contains('p', 'Profile loaded').should('be.visible');
    cy.get('[data-testid="feedback"]').should('have.text', 'Profile ready');
    cy.contains('button', 'Toggle loading').should('be.focused').realClick();
    cy.get('[role="progressbar"]').should($root => assertName($root[0], 'Loading profile'));
    cy.get('[data-testid="region"]').should('have.attr', 'aria-busy', 'true');
    cy.get('[role="status"]').should('have.length', 1);
  });

  it('updates size, appearance, position, label, role and metadata on the same root and ring', () => {
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(value => !value)}>Change props</button>
          <Spinner
            data-testid="root"
            size={changed ? 'huge' : 'tiny'}
            appearance={changed ? 'inverted' : 'primary'}
            labelPosition={changed ? 'above' : 'after'}
            label={changed ? 'Saving' : 'Loading'}
            role={changed ? 'status' : 'progressbar'}
            aria-live={changed ? 'polite' : undefined}
          />
        </>
      );
    };
    mount(<Fixture />);
    root().then($root => {
      const original = $root[0];
      const originalRing = original.firstElementChild;
      const id = original.getAttribute('aria-labelledby');
      cy.contains('button', 'Change props').realClick();
      root().should($current => {
        expect($current[0]).to.equal(original);
        expect(original.querySelector('.fui-Spinner__spinner')).to.equal(originalRing);
        expect(original.getAttribute('aria-labelledby')).to.equal(id);
        expect(computed(original).flexDirection).to.equal('column');
        expect(original.firstElementChild!.classList.contains('fui-Spinner__label')).to.equal(true);
        assertName(original, 'Saving', 'status');
        assertAppearance(original, 'inverted');
      });
      ring().should($ring => expect(computed($ring[0]).width).to.equal('44px'));
      root().should('have.attr', 'aria-live', 'polite');
      cy.contains('button', 'Change props').realClick();
      root().should($current => {
        assertName($current[0], 'Loading');
        assertAppearance($current[0], 'primary');
      });
      ring().should($ring => expect(computed($ring[0]).width).to.equal('20px'));
      root().should('not.have.attr', 'aria-live');
    });
  });

  it('adds and removes optional slots and their generated name relationship dynamically', () => {
    const Fixture = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <button onClick={() => setShow(value => !value)}>Toggle slots</button>
          <Spinner data-testid="root" spinner={show ? undefined : null} label={show ? 'Loading' : null} />
        </>
      );
    };
    mount(<Fixture />);
    cy.contains('button', 'Toggle slots').realClick();
    root().should($root => {
      expect($root[0].children).to.have.length(0);
      expect($root[0].hasAttribute('aria-labelledby')).to.equal(false);
      assertName($root[0], '');
    });
    cy.contains('button', 'Toggle slots').realClick();
    root().should($root => assertName($root[0], 'Loading'));
    ring().should('be.visible');
  });

  it('updates theme and RTL paint on existing nodes and restores light LTR', () => {
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <FluentProvider theme={changed ? teamsDarkTheme : teamsLightTheme} dir={changed ? 'rtl' : 'ltr'}>
          <button onClick={() => setChanged(value => !value)}>Change environment</button>
          <Spinner data-testid="root" label="Loading" />
        </FluentProvider>
      );
    };
    mountBase(<Fixture />);
    root().then($root => {
      const original = $root[0];
      assertAppearance(original, 'primary');
      cy.contains('button', 'Change environment').realClick();
      root().should($current => {
        expect($current[0]).to.equal(original);
        expect(computed(original).direction).to.equal('rtl');
        assertAppearance(original, 'primary', teamsDarkTheme);
        assertMotion(original, false, 'rtl');
      });
      cy.contains('button', 'Change environment').realClick();
      root().should($current => {
        expect(computed($current[0]).direction).to.equal('ltr');
        assertAppearance($current[0], 'primary');
        assertMotion($current[0], false, 'ltr');
      });
    });
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const appearance of ['primary', 'inverted'] as const) {
      it(`responds to actual reduced-motion media in ${dir}/${appearance} and restores all four animations`, () => {
        mountBase(
          <FluentProvider theme={teamsLightTheme} dir={dir}>
            <Spinner data-testid="root" appearance={appearance} label="Loading" aria-describedby="motion-detail" />
            <p id="motion-detail">Loading records, please wait</p>
          </FluentProvider>,
        );
        root().should($root => assertMotion($root[0], false, dir));
        root().then($root => {
          const original = $root[0];
          cy.then(() => motion('reduce'));
          root().should($current => {
            expect($current[0]).to.equal(original);
            assertMotion(original, true, dir);
            assertName(original, 'Loading', 'progressbar', 'Loading records, please wait');
            assertAppearance(original, appearance);
          });
          cy.then(() => motion('no-preference'));
          root().should($current => assertMotion($current[0], false, dir));
        });
      });
    }
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`changes actual ring and arc transforms at deterministic animation timeline positions in ${dir}`, () => {
      mountBase(
        <FluentProvider theme={teamsLightTheme} dir={dir}>
          <Spinner data-testid="root" label="Loading" />
        </FluentProvider>,
      );
      ring().then($ring => {
        const element = $ring[0];
        const animations = element.getAnimations({ subtree: true });
        expect(animations).to.have.length(4);
        for (const animation of animations) {
          expect(animation.playState).to.equal('running');
          const effect = animation.effect as KeyframeEffect;
          expect(effect.getKeyframes().length).to.be.at.least(2);
          animation.pause();
          animation.currentTime = 0;
        }
        const matrix = (pseudo?: string) =>
          new element.ownerDocument.defaultView!.DOMMatrixReadOnly(
            computed(pseudo ? (element.firstElementChild as HTMLElement) : element, pseudo).transform,
          );
        ring().should(() => {
          expect(matrix().a).to.be.closeTo(1, 0.001);
          expect(matrix().b).to.be.closeTo(0, 0.001);
          expect(matrix('::before').a).to.be.closeTo(1, 0.001);
        });
        cy.then(() =>
          animations.forEach(animation => {
            animation.currentTime = 750;
          }),
        );
        ring().should(() => {
          expect(matrix().a).to.be.closeTo(-1, 0.001);
          expect(matrix().b).to.be.closeTo(0, 0.001);
          expect(matrix('::before').a).to.be.closeTo(Math.cos((105 * Math.PI) / 180), 0.001);
          expect(matrix('::after').a).to.be.closeTo(Math.cos((225 * Math.PI) / 180), 0.001);
          expect(computed(element).width).to.equal('32px');
          assertIndeterminate(element.parentElement!);
        });
      });
    });
  }
});

describe('Spinner documented variants', () => {
  it('does not invent an accessible name, live region, focusability or progress value without a label', () => {
    mount(<Spinner data-testid="root" />);
    root().should($root => {
      assertName($root[0], '');
      assertIndeterminate($root[0]);
      expect($root[0].hasAttribute('aria-labelledby')).to.equal(false);
      expect($root[0].hasAttribute('tabindex')).to.equal(false);
    });
    label().should('not.exist');
  });

  for (const [size, pixels, stroke, typography] of sizes) {
    it(`renders supported ${size} size, stroke and label typography from tokens`, () => {
      mount(<Spinner data-testid="root" size={size} label="Processing" />);
      ring().should($ring => {
        const style = computed($ring[0]);
        expect(style.width).to.equal(`${pixels}px`);
        expect(style.height).to.equal(`${pixels}px`);
        expect(style.getPropertyValue('--fui-Spinner--strokeWidth').trim()).to.equal(teamsLightTheme[stroke]);
        expect(style.flexShrink).to.equal('0');
        expect(style.maskImage).to.contain('radial-gradient');
      });
      label().should($label => {
        const style = computed($label[0]);
        const expected = typographyStyles[typography];
        expect(style.fontSize).to.equal(
          typography === 'subtitle1'
            ? teamsLightTheme.fontSizeBase500
            : typography === 'subtitle2'
            ? teamsLightTheme.fontSizeBase400
            : teamsLightTheme.fontSizeBase300,
        );
        expect(style.lineHeight).to.equal(
          typography === 'subtitle1'
            ? teamsLightTheme.lineHeightBase500
            : typography === 'subtitle2'
            ? teamsLightTheme.lineHeightBase400
            : teamsLightTheme.lineHeightBase300,
        );
        expect(style.fontWeight).to.equal(
          String(
            expected.fontWeight === typographyStyles.body1.fontWeight
              ? teamsLightTheme.fontWeightRegular
              : teamsLightTheme.fontWeightSemibold,
          ),
        );
      });
      root().should('not.have.attr', 'size');
    });
  }

  for (const theme of [teamsLightTheme, teamsDarkTheme]) {
    for (const appearance of ['primary', 'inverted'] as const) {
      it(`uses ${
        theme === teamsLightTheme ? 'light' : 'dark'
      } theme ${appearance} ring and label contrast tokens`, () => {
        mountBase(
          <FluentProvider theme={theme}>
            <div style={{ backgroundColor: theme.colorBrandBackgroundStatic }}>
              <Spinner data-testid="root" appearance={appearance} label="Saving" />
            </div>
          </FluentProvider>,
        );
        root().should($root => assertAppearance($root[0], appearance, theme));
        root().should('not.have.attr', 'appearance');
      });
    }
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const position of ['above', 'below', 'before', 'after'] as const) {
      it(`places the ${position} label in ${dir} with real geometry and preserved naming`, () => {
        mountBase(
          <FluentProvider theme={teamsLightTheme} dir={dir}>
            <Spinner data-testid="root" labelPosition={position} label="Updating" />
          </FluentProvider>,
        );
        ring().then($ring => {
          const animation = $ring[0].getAnimations()[0];
          expect(animation).not.to.equal(undefined);
          animation.pause();
          animation.currentTime = 0;
        });
        root().should($root => {
          const element = $root[0];
          const text = element.querySelector<HTMLElement>('.fui-Spinner__label')!;
          const spinner = element.querySelector<HTMLElement>('.fui-Spinner__spinner')!;
          const t = text.getBoundingClientRect();
          const s = spinner.getBoundingClientRect();
          const vertical = position === 'above' || position === 'below';
          const first = position === 'above' || position === 'before';
          expect(element.firstElementChild).to.equal(first ? text : spinner);
          expect(computed(element).flexDirection).to.equal(vertical ? 'column' : 'row');
          if (vertical) {
            expect(first ? s.top - t.bottom : t.top - s.bottom).to.be.closeTo(8, 0.1);
            expect(t.left + t.width / 2).to.be.closeTo(s.left + s.width / 2, 0.1);
          } else {
            const textOnLeft = first === (dir === 'ltr');
            expect(textOnLeft ? s.left - t.right : t.left - s.right).to.be.closeTo(8, 0.1);
            expect(t.top + t.height / 2).to.be.closeTo(s.top + s.height / 2, 0.1);
          }
          assertName(element, 'Updating');
        });
      });
    }
  }

  it('supports consumer tabIndex for a standalone spinner without adding activation behavior', () => {
    const key = cy.spy().as('key');
    mount(<Spinner data-testid="root" label="Processing" tabIndex={0} onKeyDown={key} />);
    root().focus().realPress('Enter');
    root().should('be.focused').and('have.attr', 'tabindex', '0');
    cy.get('@key').should('have.been.calledOnce');
    root().should('have.attr', 'role', 'progressbar');
  });

  it('holds ring and label out of the DOM for a positive delay while retaining the root', () => {
    cy.clock();
    mount(<Spinner data-testid="root" label="Loading delayed" delay={1000} />);
    root().should('have.attr', 'role', 'progressbar');
    ring().should('not.exist');
    label().should('not.exist');
    cy.tick(999);
    ring().should('not.exist');
    cy.tick(1);
    ring().should('be.visible');
    label().should('have.text', 'Loading delayed');
    root().should($root => assertName($root[0], 'Loading delayed'));
  });
});

describe('Spinner unit-derived browser regressions', () => {
  beforeEach(() => cy.then(() => motion('no-preference')));
  afterEach(() => cy.then(() => media()));

  for (const as of ['div', 'span'] as const) {
    it(`forwards ${as} root native attributes, classes, styles and ref without leaking design props`, () => {
      const ref = React.createRef<HTMLElement>();
      mount(
        <Spinner
          as={as}
          ref={ref}
          data-testid="root"
          id="spinner-id"
          title="Loading title"
          lang="en"
          dir="rtl"
          className="caller-root"
          style={{ display: 'inline-flex', width: 180 }}
          label="Loading"
          size="small"
          appearance="primary"
          labelPosition="before"
          delay={0}
        />,
      );
      root().should($root => {
        const element = $root[0];
        expect(element.tagName).to.equal(as.toUpperCase());
        expect(ref.current).to.equal(element);
        expect(element.id).to.equal('spinner-id');
        expect(element.title).to.equal('Loading title');
        expect(element.lang).to.equal('en');
        expect(element.dir).to.equal('rtl');
        expect(computed(element).display).to.equal('inline-flex');
        expect(computed(element).width).to.equal('180px');
        expect(element.classList.contains('caller-root')).to.equal(true);
        expect(element.classList.contains('fui-Spinner')).to.equal(true);
        for (const attr of ['appearance', 'size', 'labelposition', 'delay', 'spinner', 'spinnertail', 'label']) {
          expect(element.hasAttribute(attr), attr).to.equal(false);
        }
        assertName(element, 'Loading');
      });
    });

    it(`supports ${as} root render functions with provided slot children, native props and ref`, () => {
      const ref = React.createRef<HTMLElement>();
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        const renderRoot: SlotRenderFunction<React.HTMLAttributes<HTMLElement>> = (Root, props) => (
          <Root {...props}>
            <span data-testid="rendered-child">{changed ? 'Latest child' : 'Initial child'}</span>
            {props.children}
          </Root>
        );
        return (
          <>
            <button onClick={() => setChanged(true)}>Update renderer</button>
            <Spinner as={as} ref={ref} data-testid="root" title="Root renderer" label={changed ? 'Saving' : 'Loading'}>
              {renderRoot}
            </Spinner>
          </>
        );
      };
      mount(<Fixture />);
      root().then($root => {
        const original = $root[0];
        expect(ref.current).to.equal(original);
        expect(original.tagName).to.equal(as.toUpperCase());
        cy.contains('button', 'Update renderer').realClick();
        root().should($current => {
          expect($current[0]).to.equal(original);
          expect(ref.current).to.equal(original);
          expect(original.title).to.equal('Root renderer');
          assertName(original, 'Saving');
        });
        cy.get('[data-testid="rendered-child"]').should('have.text', 'Latest child');
        ring().find('.fui-Spinner__spinnerTail').should('have.length', 1);
      });
    });
  }

  it('forwards label, ring and tail slot native props, styles, classes and refs', () => {
    const labelRef = React.createRef<HTMLLabelElement>();
    const ringRef = React.createRef<HTMLSpanElement>();
    const tailRef = React.createRef<HTMLSpanElement>();
    mount(
      <Spinner
        data-testid="root"
        label={{
          children: 'Saving',
          id: 'custom-label',
          ref: labelRef,
          title: 'Label title',
          className: 'caller-label',
          style: { fontWeight: teamsLightTheme.fontWeightBold },
        }}
        spinner={{ ref: ringRef, title: 'Ring title', className: 'caller-ring', style: { visibility: 'hidden' } }}
        spinnerTail={{ ref: tailRef, title: 'Tail title', className: 'caller-tail', ...{ 'data-tail': 'native' } }}
      />,
    );
    root().should($root => {
      expect($root[0].getAttribute('aria-labelledby')).to.equal('custom-label');
      assertName($root[0], 'Label title');
      expect(labelRef.current).to.equal($root[0].querySelector('.fui-Spinner__label'));
      expect(ringRef.current).to.equal($root[0].querySelector('.fui-Spinner__spinner'));
      expect(tailRef.current).to.equal($root[0].querySelector('.fui-Spinner__spinnerTail'));
      expect(labelRef.current!.title).to.equal('Label title');
      expect(ringRef.current!.title).to.equal('Ring title');
      expect(tailRef.current!.title).to.equal('Tail title');
      expect(labelRef.current!.classList.contains('caller-label')).to.equal(true);
      expect(ringRef.current!.classList.contains('caller-ring')).to.equal(true);
      expect(tailRef.current!.classList.contains('caller-tail')).to.equal(true);
      expect(computed(labelRef.current!).fontWeight).to.equal(String(teamsLightTheme.fontWeightBold));
      expect(computed(ringRef.current!).visibility).to.equal('hidden');
      expect(tailRef.current!.getAttribute('data-tail')).to.equal('native');
    });
  });

  it('supports custom label/ring/tail render functions with current props and children', () => {
    const ref = React.createRef<HTMLLabelElement>();
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      const renderLabel: SlotRenderFunction<LabelProps> = (Label, props) => (
        <Label {...props}>{changed ? 'Saving latest' : 'Loading initial'}</Label>
      );
      const renderRing: SlotRenderFunction<React.HTMLAttributes<HTMLSpanElement>> = (Ring, props) => (
        <Ring {...props}>
          <span data-testid="ring-extra">Custom ring</span>
          {props.children}
        </Ring>
      );
      const renderTail: SlotRenderFunction<React.HTMLAttributes<HTMLSpanElement>> = (Tail, props) => (
        <Tail {...props}>
          <span data-testid="tail-extra">{changed ? 'Latest tail' : 'Initial tail'}</span>
        </Tail>
      );
      return (
        <>
          <button onClick={() => setChanged(true)}>Update slots</button>
          <Spinner
            data-testid="root"
            label={{
              ref,
              id: 'render-label',
              children: renderLabel,
            }}
            spinner={{
              ...{ 'data-version': changed ? 'latest' : 'initial' },
              children: renderRing,
            }}
            spinnerTail={{
              children: renderTail,
            }}
          />
        </>
      );
    };
    mount(<Fixture />);
    root().should($root => assertName($root[0], 'Loading initial'));
    ring().should('have.attr', 'data-version', 'initial');
    cy.contains('button', 'Update slots').realClick();
    root().should($root => {
      assertName($root[0], 'Saving latest');
      expect(ref.current).to.equal($root[0].querySelector('.fui-Spinner__label'));
      expect(ref.current!.tagName).to.equal('LABEL');
    });
    ring().should('have.attr', 'data-version', 'latest');
    cy.get('[data-testid="ring-extra"]').should('have.text', 'Custom ring');
    cy.get('[data-testid="tail-extra"]').should('have.text', 'Latest tail');
  });

  it('forwards current root and slot handlers with native bubbling and no synthetic loader actions', () => {
    const initial = cy.spy().as('initial');
    const latest = cy.spy().as('latest');
    const child = cy.spy().as('child');
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(true)}>Replace handlers</button>
          <Spinner
            data-testid="root"
            onClick={(event: React.MouseEvent<HTMLDivElement>) =>
              (changed ? latest : initial)(event.currentTarget, event.target)
            }
            label={{ children: 'Loading', onClick: event => child(event.currentTarget) }}
          />
        </>
      );
    };
    mount(<Fixture />);
    root().then($root => {
      label().then($label => {
        label().realClick();
        cy.get('@initial').should('have.been.calledOnceWithExactly', $root[0], $label[0]);
        cy.get('@child').should('have.been.calledOnceWithExactly', $label[0]);
        cy.contains('button', 'Replace handlers').realClick();
        label().realClick();
        cy.get('@latest').should('have.been.calledOnceWithExactly', $root[0], $label[0]);
        cy.get('@initial').should('have.been.calledOnce');
        cy.get('@child').should('have.been.calledTwice');
      });
    });
  });

  it('inherits each finite context size and lets explicit props override the context', () => {
    mount(
      <>
        {sizes.map(([size]) => (
          <SpinnerContextProvider key={size} value={{ size }}>
            <Spinner data-testid={`inherited-${size}`} label={`Loading ${size}`} />
            <Spinner data-testid={`explicit-${size}`} size="small" />
          </SpinnerContextProvider>
        ))}
        <Spinner data-testid="root" />
      </>,
    );
    for (const [size, pixels] of sizes) {
      cy.get(`[data-testid="inherited-${size}"] .fui-Spinner__spinner`).should($ring =>
        expect(computed($ring[0]).width).to.equal(`${pixels}px`),
      );
      cy.get(`[data-testid="explicit-${size}"] .fui-Spinner__spinner`).should($ring =>
        expect(computed($ring[0]).width).to.equal('28px'),
      );
    }
    ring().should($ring => expect(computed($ring[0]).width).to.equal('32px'));
  });

  it('updates inherited context and clears explicit size without replacing the ring', () => {
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(value => !value)}>Change size context</button>
          <SpinnerContextProvider value={{ size: changed ? 'huge' : 'tiny' }}>
            <Spinner data-testid="root" size={changed ? undefined : 'small'} label="Loading" />
            <SpinnerContextProvider value={{}}>
              <Spinner data-testid="reset" />
            </SpinnerContextProvider>
          </SpinnerContextProvider>
        </>
      );
    };
    mount(<Fixture />);
    ring().then($ring => {
      const original = $ring[0];
      expect(computed(original).width).to.equal('28px');
      cy.contains('button', 'Change size context').realClick();
      ring().should($current => {
        expect($current[0]).to.equal(original);
        expect(computed(original).width).to.equal('44px');
      });
      cy.get('[data-testid="reset"] .fui-Spinner__spinner').should($reset =>
        expect(computed($reset[0]).width).to.equal('32px'),
      );
    });
  });

  it('supports public hook/style/render recomposition and base hook/render without generated styling', () => {
    const Recomposed = React.forwardRef<HTMLElement, SpinnerProps>((props, ref) => {
      const state = useSpinner_unstable(props, ref);
      useSpinnerStyles_unstable(state);
      return renderSpinner_unstable(state);
    });
    const Headless = React.forwardRef<HTMLElement, SpinnerBaseProps>((props, ref) =>
      renderSpinner_unstable(useSpinnerBase_unstable(props, ref)),
    );
    const ref = React.createRef<HTMLElement>();
    mount(
      <>
        <Recomposed ref={ref} data-testid="root" label="Styled recomposition" size="tiny" />
        <Headless data-testid="headless" label="Headless loading" />
      </>,
    );
    root().should($root => {
      expect(ref.current).to.equal($root[0]);
      assertName($root[0], 'Styled recomposition');
    });
    ring().should($ring => expect(computed($ring[0]).width).to.equal('20px'));
    cy.get('[data-testid="headless"]').should($root => {
      assertName($root[0], 'Headless loading');
      expect($root[0].classList.contains('fui-Spinner')).to.equal(false);
      expect($root[0].querySelector('label')!.textContent).to.equal('Headless loading');
      expect($root[0].querySelector('span > span')).not.to.equal(null);
      assertIndeterminate($root[0]);
    });
  });

  it('applies the provider custom style hook after built-in styling while retaining caller styles', () => {
    const useCustomStyles = (unknownState: unknown) => {
      const state = unknownState as SpinnerState;
      state.root.style = { ...state.root.style, display: 'inline-flex' };
      if (state.spinner) {
        state.spinner.style = { ...state.spinner.style, animationPlayState: 'paused' };
      }
    };
    const hooks = {
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Public provider hook key.
      useSpinnerStyles_unstable: useCustomStyles,
    };
    mountBase(
      <FluentProvider theme={teamsLightTheme} customStyleHooks_unstable={hooks}>
        <Spinner data-testid="root" label="Loading" style={{ width: 180 }} className="custom-root" />
      </FluentProvider>,
    );
    root().should($root => {
      expect(computed($root[0]).display).to.equal('inline-flex');
      expect(computed($root[0]).width).to.equal('180px');
      expect($root[0].classList.contains('custom-root')).to.equal(true);
      assertName($root[0], 'Loading');
    });
    ring().should('have.css', 'animation-play-state', 'paused');
  });

  it('cancels the old pending delay on changes and starts the new delay before revealing current label', () => {
    cy.clock();
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(true)}>Restart delay</button>
          <Spinner
            data-testid="root"
            delay={changed ? 500 : 1000}
            label={changed ? 'Latest loading' : 'Initial loading'}
          />
        </>
      );
    };
    mount(<Fixture />);
    cy.tick(900);
    cy.contains('button', 'Restart delay').click();
    cy.tick(100);
    ring().should('not.exist');
    cy.tick(399);
    label().should('not.exist');
    cy.tick(1);
    label().should('have.text', 'Latest loading');
    root().should($root => assertName($root[0], 'Latest loading'));
  });

  it('shows immediately for zero delay, rearms before a timeout has fired and retains visibility after it has fired', () => {
    cy.clock();
    const Fixture = () => {
      const [delay, setDelay] = React.useState(1000);
      return (
        <>
          <button onClick={() => setDelay(0)}>Clear delay</button>
          <button onClick={() => setDelay(2000)}>Increase delay</button>
          <Spinner data-testid="root" delay={delay} label="Loading" />
        </>
      );
    };
    mount(<Fixture />);
    ring().should('not.exist');
    cy.contains('button', 'Clear delay').click();
    ring().should('be.visible');
    cy.contains('button', 'Increase delay').click();
    ring().should('not.exist');
    cy.tick(1999);
    ring().should('not.exist');
    cy.tick(1);
    ring().should('be.visible');
    cy.contains('button', 'Clear delay').click();
    cy.contains('button', 'Increase delay').click();
    ring().should('be.visible');
  });

  it('clears root and slot refs on unmount and restarts delay for a fresh instance on remount', () => {
    cy.clock();
    const ref = React.createRef<HTMLElement>();
    const ringRef = React.createRef<HTMLSpanElement>();
    const labelRef = React.createRef<HTMLLabelElement>();
    const Fixture = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <button onClick={() => setShow(value => !value)}>Toggle spinner</button>
          {show && (
            <Spinner
              ref={ref}
              data-testid="root"
              delay={1000}
              spinner={{ ref: ringRef }}
              label={{ ref: labelRef, children: 'Loading' }}
            />
          )}
        </>
      );
    };
    mount(<Fixture />);
    root().then($root => {
      const original = $root[0];
      cy.tick(900);
      cy.contains('button', 'Toggle spinner').click();
      cy.then(() => expect(ref.current).to.equal(null));
      cy.tick(100);
      cy.contains('button', 'Toggle spinner').click();
      root().should($current => {
        expect($current[0]).not.to.equal(original);
        expect(ref.current).to.equal($current[0]);
      });
      cy.tick(999);
      ring().should('not.exist');
      cy.tick(1);
      ring().should('be.visible');
      label().should('be.visible');
      cy.then(() => {
        expect(ringRef.current).not.to.equal(null);
        expect(labelRef.current).not.to.equal(null);
      });
      cy.contains('button', 'Toggle spinner').click();
      cy.then(() => {
        expect(ref.current).to.equal(null);
        expect(ringRef.current).to.equal(null);
        expect(labelRef.current).to.equal(null);
      });
    });
  });

  for (const appearance of ['primary', 'inverted'] as const) {
    it(`preserves forced-colors ${appearance} ring and label behavior and restores normal theme paint`, () => {
      mount(
        <div
          style={
            appearance === 'inverted' ? { backgroundColor: teamsLightTheme.colorBrandBackgroundStatic } : undefined
          }
        >
          <Spinner data-testid="root" appearance={appearance} label="Loading" />
        </div>,
      );
      let originalRing: HTMLElement;
      let originalLabel: HTMLElement;
      root().then($root => {
        assertAppearance($root[0], appearance);
        originalRing = $root[0].querySelector<HTMLElement>('.fui-Spinner__spinner')!;
        originalLabel = $root[0].querySelector<HTMLElement>('.fui-Spinner__label')!;
      });
      cy.then(() =>
        media([
          { name: 'forced-colors', value: 'active' },
          { name: 'prefers-reduced-motion', value: 'no-preference' },
        ]),
      );
      ring()
        .should('be.visible')
        .and($ring => {
          const element = $ring[0];
          expect(element).to.equal(originalRing);
          expect(element.ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(true);
          expect(computed(element).forcedColorAdjust).to.equal('none');
          expect(computed(element).color).to.equal(normalizedColor(element, 'Highlight'));
          expect(computed(element).backgroundColor).to.equal(normalizedColor(element, 'HighlightText'));
          expect(computed(element).width).to.equal('32px');
          expect(computed(element).height).to.equal('32px');
          expect(computed(element).maskImage).to.contain('radial-gradient');
          const tail = element.querySelector<HTMLElement>('.fui-Spinner__spinnerTail')!;
          expect(computed(tail).color).to.equal(computed(element).color);
          for (const pseudo of ['::before', '::after']) {
            expect(computed(tail, pseudo).backgroundImage).to.equal(
              `conic-gradient(${computed(element).color} 135deg, rgba(0, 0, 0, 0) 135deg)`,
            );
          }
          for (const animation of element.getAnimations({ subtree: true })) {
            expect(animation.playState).to.equal('running');
          }
        });
      label()
        .should('be.visible')
        .and('have.text', 'Loading')
        .and($label => {
          expect($label[0]).to.equal(originalLabel);
          expect(computed($label[0]).forcedColorAdjust).to.equal('auto');
          expect(computed($label[0]).color).to.equal(normalizedColor($label[0], 'CanvasText'));
        });
      root().should($root => {
        assertName($root[0], 'Loading');
        assertIndeterminate($root[0]);
        expect($root[0].getAttribute('aria-labelledby')).to.equal(originalLabel.id);
        assertMotion($root[0], false, 'ltr');
      });
      cy.then(() => motion('no-preference'));
      ring()
        .should('be.visible')
        .and($ring => {
          expect($ring[0]).to.equal(originalRing);
          expect($ring[0].ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(false);
          expect(computed($ring[0]).forcedColorAdjust).to.equal('auto');
        });
      label()
        .should('be.visible')
        .and('have.text', 'Loading')
        .and($label => {
          expect($label[0]).to.equal(originalLabel);
        });
      root().should($root => {
        assertAppearance($root[0], appearance);
        assertName($root[0], 'Loading');
        expect($root[0].getAttribute('aria-labelledby')).to.equal(originalLabel.id);
        assertMotion($root[0], false, 'ltr');
      });
    });
  }

  it('updates explicit label IDs and external naming relationships without stale references', () => {
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(value => !value)}>Change relationship</button>
          <h2 id="external-name">External loading name</h2>
          <Spinner
            data-testid="root"
            label={{
              id: changed ? 'latest-label-id' : 'initial-label-id',
              children: changed ? 'Latest label' : 'Initial label',
            }}
            aria-labelledby={changed ? 'external-name' : undefined}
          />
        </>
      );
    };
    mount(<Fixture />);
    root().should('have.attr', 'aria-labelledby', 'initial-label-id');
    root().should($root => assertName($root[0], 'Initial label'));
    cy.contains('button', 'Change relationship').realClick();
    label().should('have.attr', 'id', 'latest-label-id').and('have.text', 'Latest label');
    root().should('have.attr', 'aria-labelledby', 'external-name');
    root().should($root => assertName($root[0], 'External loading name'));
    cy.contains('button', 'Change relationship').realClick();
    root().should('have.attr', 'aria-labelledby', 'initial-label-id');
    root().should($root => assertName($root[0], 'Initial label'));
  });

  it('passes Label component props and native attributes without treating the label as a loader control', () => {
    mount(
      <Spinner
        data-testid="root"
        label={{
          children: 'Loading',
          disabled: true,
          required: true,
          htmlFor: 'consumer-control',
          'aria-label': 'Loading required data',
          style: { fontSize: teamsLightTheme.fontSizeBase500 },
        }}
      />,
    );
    label().should($label => {
      expect($label[0].tagName).to.equal('LABEL');
      expect($label[0].getAttribute('for')).to.equal('consumer-control');
      expect(computed($label[0]).fontSize).to.equal(teamsLightTheme.fontSizeBase500);
      expect(computed($label[0]).color).to.equal(
        normalizedColor($label[0], teamsLightTheme.colorNeutralForegroundDisabled),
      );
      expect($label[0].querySelector('.fui-Label__required')).not.to.equal(null);
      expect($label[0].hasAttribute('tabindex')).to.equal(false);
    });
    root().should($root => assertName($root[0], 'Loading required data'));
    root().should('not.have.attr', 'aria-disabled');
  });

  it('keeps the reduced-motion ring rotating at its slower actual timeline while disabling expanding arcs', () => {
    cy.then(() => motion('reduce'));
    mount(<Spinner data-testid="root" label="Loading" />);
    root().should($root => assertMotion($root[0], true, 'ltr'));
    ring().then($ring => {
      const element = $ring[0];
      const animation = element.getAnimations({ subtree: true })[0];
      expect(animation.playState).to.equal('running');
      expect(animation.effect!.getTiming().duration).to.equal(1800);
      animation.pause();
      animation.currentTime = 0;
      ring().should($current =>
        expect(
          new element.ownerDocument.defaultView!.DOMMatrixReadOnly(computed($current[0]).transform).a,
        ).to.be.closeTo(1, 0.001),
      );
      cy.then(() => {
        animation.currentTime = 900;
      });
      ring().should($current =>
        expect(
          new element.ownerDocument.defaultView!.DOMMatrixReadOnly(computed($current[0]).transform).a,
        ).to.be.closeTo(-1, 0.001),
      );
    });
  });
});
