import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import { getByRole, getAllByRole } from '@testing-library/dom';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import { Skeleton } from './Skeleton';
import type { SkeletonProps, SkeletonBaseProps, SkeletonState } from './Skeleton.types';
import { useSkeleton_unstable, useSkeletonBase_unstable } from './useSkeleton';
import { useSkeletonContextValues } from './useSkeletonContextValues';
import { useSkeletonStyles_unstable } from './useSkeletonStyles.styles';
import { renderSkeleton_unstable } from './renderSkeleton';
import { useTestStyles } from './Skeleton.cy.styles';
import { SkeletonItem } from '../SkeletonItem/SkeletonItem';
import { SkeletonContextProvider, useSkeletonContext } from '../../contexts/SkeletonContext';

const sizes = [8, 12, 14, 16, 20, 22, 24, 28, 32, 36, 40, 48, 52, 56, 64, 72, 92, 96, 120, 128] as const;
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const root = () => cy.get('[data-testid="root"]');
const item = (id = 'inherited') => cy.get(`[data-testid="${id}"]`);
const style = (element: HTMLElement, pseudo?: string) =>
  element.ownerDocument.defaultView!.getComputedStyle(element, pseudo);
const motion = (value?: 'reduce' | 'no-preference') =>
  Cypress.automation('remote:debugger:protocol', {
    command: 'Emulation.setEmulatedMedia',
    params: { media: 'screen', features: value ? [{ name: 'prefers-reduced-motion', value }] : [] },
  });

describe('Skeleton root edges and accessibility', () => {
  beforeEach(() => cy.then(() => motion('no-preference')));
  afterEach(() => cy.then(() => motion()));

  it('keeps simultaneous progressbars independently named without generated live regions or progress values', () => {
    mount(
      <section data-testid="region" aria-busy="true">
        <Skeleton aria-label="Loading profile">
          <SkeletonItem />
        </Skeleton>
        <Skeleton aria-label="Loading comments">
          <SkeletonItem />
        </Skeleton>
      </section>,
    );
    cy.get('[data-testid="region"]').should($region => {
      const bars = getAllByRole($region[0], 'progressbar');
      expect(bars).to.have.length(2);
      expect(getByRole($region[0], 'progressbar', { name: 'Loading profile' })).to.equal(bars[0]);
      expect(getByRole($region[0], 'progressbar', { name: 'Loading comments' })).to.equal(bars[1]);
      for (const bar of bars) {
        for (const attribute of ['aria-live', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'tabindex']) {
          expect(bar.hasAttribute(attribute), attribute).to.equal(false);
        }
        expect(bar.getAttribute('aria-busy')).to.equal('true');
      }
      expect($region[0].querySelectorAll('[aria-live], [role="status"], button, input')).to.have.length(0);
    });
  });

  it('uses explicit labelledby precedence and describedby relationships', () => {
    mount(
      <>
        <h2 id="loading-title">Loading recommendations</h2>
        <p id="loading-detail">Please wait for recommendations</p>
        <Skeleton
          data-testid="root"
          aria-label="Fallback name"
          aria-labelledby="loading-title"
          aria-describedby="loading-detail"
        />
      </>,
    );
    root().should($root => {
      expect(
        getByRole($root[0].parentElement!, 'progressbar', {
          name: 'Loading recommendations',
          description: 'Please wait for recommendations',
        }),
      ).to.equal($root[0]);
    });
  });

  for (const role of ['group', 'region'] as const) {
    it(`allows consumer ${role} labelling without copying its name or busy state to Skeleton`, () => {
      mount(
        <section data-testid="wrapper" role={role} aria-label="Loading dashboard" aria-busy="true">
          <Skeleton data-testid="root">
            <SkeletonItem />
          </Skeleton>
        </section>,
      );
      cy.get('[data-testid="wrapper"]').should($wrapper => {
        expect(getByRole($wrapper[0].parentElement!, role, { name: 'Loading dashboard' })).to.equal($wrapper[0]);
        expect(getByRole($wrapper[0], 'progressbar', { name: '' })).to.equal($wrapper[0].firstElementChild);
      });
      root().should('not.have.attr', 'aria-label');
    });
  }

  it('allows role, busy, hidden and native progress metadata overrides without context changes', () => {
    mount(
      <Group
        role="group"
        aria-busy={false}
        aria-hidden="true"
        aria-valuenow={20}
        aria-valuemin={0}
        aria-valuemax={100}
      />,
    );
    root().should($root => {
      expect($root[0].getAttribute('role')).to.equal('group');
      expect($root[0].getAttribute('aria-busy')).to.equal('false');
      expect($root[0].getAttribute('aria-hidden')).to.equal('true');
      expect($root[0].getAttribute('aria-valuenow')).to.equal('20');
      expect($root[0].getAttribute('aria-valuemin')).to.equal('0');
      expect($root[0].getAttribute('aria-valuemax')).to.equal('100');
    });
    contextIs('context', { animation: 'wave', appearance: 'opaque' });
  });

  it('leaves keyboard focus on consumer controls and does not invent activation or announcements', () => {
    mount(
      <>
        <button>Before loader</button>
        <Skeleton data-testid="root" aria-label="Loading content">
          <SkeletonItem />
        </Skeleton>
        <button>After loader</button>
      </>,
    );
    cy.contains('button', 'Before loader').focus().realPress('Tab');
    cy.contains('button', 'After loader').should('be.focused');
    root().should('have.attr', 'aria-busy', 'true');
    root().should('not.have.attr', 'aria-live');
  });

  it('leaves loading completion and reload state to its consumer', () => {
    const Fixture = () => {
      const [loading, setLoading] = React.useState(true);
      return (
        <>
          <button onClick={() => setLoading(value => !value)}>Toggle content</button>
          <section data-testid="consumer" aria-busy={loading} aria-label="Profile" role="region">
            {loading ? (
              <Skeleton aria-label="Loading profile">
                <SkeletonItem />
              </Skeleton>
            ) : (
              <p>Profile loaded</p>
            )}
          </section>
        </>
      );
    };
    mount(<Fixture />);
    cy.get('[data-testid="consumer"]').should('have.attr', 'aria-busy', 'true');
    cy.get('[role="progressbar"]').should('have.length', 1);
    cy.contains('button', 'Toggle content').realClick();
    cy.get('[data-testid="consumer"]').should('have.attr', 'aria-busy', 'false');
    cy.get('[role="progressbar"]').should('not.exist');
    cy.contains('p', 'Profile loaded').should('be.visible');
    cy.contains('button', 'Toggle content').should('be.focused').realClick();
    cy.get('[data-testid="consumer"]').should('have.attr', 'aria-busy', 'true');
    cy.contains('p', 'Profile loaded').should('not.exist');
    cy.get('[role="progressbar"]').should('have.attr', 'aria-label', 'Loading profile');
    cy.get('[aria-live]').should('not.exist');
  });

  it('isolates nested size/shape while inheriting animation/appearance and respecting explicit nested settings', () => {
    mount(
      <>
        <Skeleton animation="pulse" appearance="translucent" size={48} shape="circle" aria-label="Outer">
          <ContextProbe id="outer-context" />
          <SkeletonItem data-testid="outer-item" />
          <Skeleton aria-label="Inherited nested">
            <ContextProbe id="nested-context" />
            <SkeletonItem data-testid="nested-item" />
          </Skeleton>
          <Skeleton aria-label="Explicit nested" animation="wave" appearance="opaque" size={24} shape="square">
            <ContextProbe id="explicit-context" />
            <SkeletonItem data-testid="explicit-item" />
          </Skeleton>
          <SkeletonItem data-testid="outer-after" />
        </Skeleton>
        <ContextProbe id="outside-context" />
      </>,
    );
    contextIs('outer-context', { animation: 'pulse', appearance: 'translucent', size: 48, shape: 'circle' });
    contextIs('nested-context', { animation: 'pulse', appearance: 'translucent' });
    contextIs('explicit-context', { animation: 'wave', appearance: 'opaque', size: 24, shape: 'square' });
    contextIs('outside-context', {});
    item('nested-item').should('have.css', 'height', '16px').and('have.css', 'border-radius', '4px');
    item('explicit-item').should('have.css', 'height', '24px').and('have.css', 'border-radius', '0px');
    for (const id of ['outer-item', 'outer-after']) {
      item(id).should('have.css', 'height', '48px').and('have.css', 'border-radius', '50%');
    }
  });

  it('treats a partial context provider as a replacement, then lets the root publish defaults', () => {
    mount(
      <Skeleton animation="pulse" appearance="translucent" size={48} shape="circle">
        <SkeletonContextProvider value={{ size: 24, shape: 'square' }}>
          <Group />
        </SkeletonContextProvider>
      </Skeleton>,
    );
    contextIs('context', { animation: 'wave', appearance: 'opaque' });
    item().should('have.css', 'height', '16px');
    item().should($item => assertAnimation($item[0], 'wave'));
  });

  it('recomputes inherited nested settings and isolated defaults on dynamic outer changes', () => {
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(value => !value)}>Change outer</button>
          <Skeleton
            animation={changed ? 'pulse' : 'wave'}
            appearance={changed ? 'translucent' : 'opaque'}
            size={changed ? 64 : 32}
            shape={changed ? 'square' : 'circle'}
          >
            <Skeleton data-testid="root">
              <ContextProbe />
              <SkeletonItem data-testid="inherited" />
            </Skeleton>
          </Skeleton>
        </>
      );
    };
    mount(<Fixture />);
    contextIs('context', { animation: 'wave', appearance: 'opaque' });
    item().then($initial => {
      const initial = $initial[0];
      cy.contains('button', 'Change outer').realClick();
      contextIs('context', { animation: 'pulse', appearance: 'translucent' });
      item().should($item => {
        expect($item[0]).to.equal(initial);
        expect(style(initial).height).to.equal('16px');
        expect(style(initial).borderRadius).to.equal('4px');
        assertAnimation(initial, 'pulse');
        assertAppearance(initial, 'pulse', 'translucent');
      });
      cy.contains('button', 'Change outer').realClick();
      contextIs('context', { animation: 'wave', appearance: 'opaque' });
      item().should($item => assertAnimation($item[0], 'wave'));
    });
  });

  for (const animation of ['wave', 'pulse'] as const) {
    it(`updates existing ${animation} descendants for real reduced-motion preference and restores animation`, () => {
      mount(<Group animation={animation} size={24} />);
      item().should($item => assertAnimation($item[0], animation));
      cy.then(() => motion('reduce'));
      root().should('have.attr', 'aria-busy', 'true');
      item().should($item => {
        const element = $item[0];
        expect(element.ownerDocument.defaultView!.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(
          true,
        );
        expect(style(element, '::after').animationDuration).to.equal('1e-05s');
        expect(style(element, '::after').animationIterationCount).to.equal('1');
        expect(style(element).height).to.equal('24px');
      });
      cy.then(() => motion('no-preference'));
      item().should($item => assertAnimation($item[0], animation));
    });
  }

  it('updates theme and RTL without replacing the root or changing context and loading semantics', () => {
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <FluentProvider theme={changed ? teamsDarkTheme : teamsLightTheme} dir={changed ? 'rtl' : 'ltr'}>
          <button onClick={() => setChanged(value => !value)}>Change environment</button>
          <Group style={{ width: 240 }} size={32} shape="circle" />
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    root().then($root => {
      const original = $root[0];
      item().should($item => assertAppearance($item[0], 'wave', 'opaque'));
      cy.contains('button', 'Change environment').realClick();
      root().should($current => {
        expect($current[0]).to.equal(original);
        expect(style(original).direction).to.equal('rtl');
        expect(original.getAttribute('aria-busy')).to.equal('true');
      });
      contextIs('context', { animation: 'wave', appearance: 'opaque', size: 32, shape: 'circle' });
      item().should($item => {
        assertAppearance($item[0], 'wave', 'opaque', teamsDarkTheme);
        assertAnimation($item[0], 'wave');
        expect(style($item[0]).width).to.equal('32px');
      });
      cy.contains('button', 'Change environment').realClick();
      root().should('have.css', 'direction', 'ltr');
      item().should($item => assertAppearance($item[0], 'wave', 'opaque'));
    });
  });
});

const ContextProbe = ({ id = 'context' }: { id?: string }) => {
  const context = useSkeletonContext();
  return <output data-testid={id}>{JSON.stringify(context)}</output>;
};
const contextIs = (id: string, expected: ReturnType<typeof useSkeletonContext>) =>
  cy.get(`[data-testid="${id}"]`).should($probe => {
    expect(JSON.parse($probe.text())).to.deep.equal(expected);
  });
const Group = (props: SkeletonProps) => (
  <Skeleton data-testid="root" aria-label="Loading content" {...props}>
    <div>
      <SkeletonItem data-testid="inherited" />
    </div>
    <ContextProbe />
  </Skeleton>
);

const assertAnimation = (element: HTMLElement, animation: 'wave' | 'pulse') => {
  const overlay = style(element, '::after');
  expect(overlay.content).to.equal('""');
  expect(overlay.animationName).not.to.equal('none');
  expect(overlay.animationDuration).to.equal(animation === 'wave' ? '3s' : '1s');
  expect(overlay.animationIterationCount).to.equal('infinite');
  expect(overlay.animationTimingFunction).to.equal('ease-in-out');
  expect(overlay.position).to.equal('absolute');
  expect(parseFloat(overlay.width)).to.equal(element.getBoundingClientRect().width);
  expect(parseFloat(overlay.height)).to.equal(element.getBoundingClientRect().height);
  const animations = element.getAnimations({ subtree: true });
  expect(animations).to.have.length(1);
  const effect = animations[0].effect;
  expect(effect).to.be.instanceOf(element.ownerDocument.defaultView!.KeyframeEffect);
  const frames = (effect as KeyframeEffect).getKeyframes();
  if (animation === 'wave') {
    expect(frames[frames.length - 1].transform).to.equal(
      style(element).direction === 'rtl' ? 'translate(-100%)' : 'translate(100%)',
    );
    const matrix = new element.ownerDocument.defaultView!.DOMMatrixReadOnly(overlay.transform);
    expect(matrix.a).to.equal(1);
    expect(matrix.m42).to.equal(0);
    expect(Math.abs(matrix.m41)).to.be.at.most(element.getBoundingClientRect().width);
  } else {
    expect(frames.map(frame => Number(frame.opacity))).to.deep.equal([1, 0.4, 1]);
    expect(frames.map(frame => frame.offset)).to.deep.equal([0, 0.5, 1]);
  }
};
const assertAppearance = (
  element: HTMLElement,
  animation: 'wave' | 'pulse',
  appearance: 'opaque' | 'translucent',
  theme = teamsLightTheme,
) => {
  const probe = element.ownerDocument.createElement('span');
  const stencil = appearance === 'opaque' ? theme.colorNeutralStencil1 : theme.colorNeutralStencil1Alpha;
  probe.style.color = stencil;
  element.appendChild(probe);
  const color = style(probe).color;
  probe.remove();
  if (animation === 'pulse') {
    expect(style(element, '::after').backgroundColor).to.equal(color);
  } else {
    expect(style(element).backgroundColor).to.equal(color);
    const gradient = style(element, '::after').backgroundImage;
    probe.style.color = appearance === 'opaque' ? theme.colorNeutralStencil2 : stencil;
    element.appendChild(probe);
    const peak = style(probe).color;
    probe.remove();
    const edge = appearance === 'opaque' ? color : 'rgba(0, 0, 0, 0)';
    const direction = style(element).direction === 'rtl' ? 'left' : 'right';
    expect(gradient).to.equal(`linear-gradient(to ${direction}, ${edge} 0%, ${peak} 50%, ${edge} 100%)`);
  }
};

describe('Skeleton unit-derived root regressions', () => {
  beforeEach(() => cy.then(() => motion('no-preference')));
  afterEach(() => cy.then(() => motion()));

  it('supports provider custom root styling after generated classes without changing published design context', () => {
    const useCustomStyles = (unknownState: unknown) => {
      const state = unknownState as SkeletonState;
      state.root.style = { ...state.root.style, display: 'inline-flex', width: 180 };
    };
    const customStyleHooks = {
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Public provider hook key.
      useSkeletonStyles_unstable: useCustomStyles,
    };
    mountBase(
      <FluentProvider theme={teamsLightTheme} customStyleHooks_unstable={customStyleHooks}>
        <Group as="span" animation="pulse" size={24} shape="square" className="caller-class" />
      </FluentProvider>,
    );
    root().should($root => {
      expect(style($root[0]).display).to.equal('inline-flex');
      expect(style($root[0]).width).to.equal('180px');
      expect($root[0].classList.contains('fui-Skeleton')).to.equal(true);
      expect($root[0].classList.contains('caller-class')).to.equal(true);
      expect($root[0].getAttribute('aria-busy')).to.equal('true');
    });
    contextIs('context', { animation: 'pulse', appearance: 'opaque', size: 24, shape: 'square' });
    item().should('have.css', 'width', '24px');
  });

  it('uses explicit CSS width for the wrapper even when the deprecated width prop is supplied', () => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- Regression coverage for the retained legacy prop.
    mount(<Group width={90} style={{ width: 200 }} />);
    root().should('have.css', 'width', '200px');
    item().should('have.css', 'width', '200px');
    contextIs('context', { animation: 'wave', appearance: 'opaque' });
  });

  for (const as of ['div', 'span'] as const) {
    it(`preserves ${as} root native attrs, forwarded ref, children and busy defaults`, () => {
      const ref = React.createRef<HTMLDivElement>();
      mount(
        <Skeleton
          as={as}
          ref={ref}
          data-testid="root"
          id="loader-id"
          title="Loading title"
          lang="en"
          dir="rtl"
          className="consumer-class"
          aria-label="Loading content"
          style={{ width: 220 }}
        >
          <span data-testid="plain-child">Placeholder text</span>
        </Skeleton>,
      );
      root().should($root => {
        const element = $root[0];
        expect(ref.current).to.equal(element);
        expect(element.tagName).to.equal(as.toUpperCase());
        expect(element.id).to.equal('loader-id');
        expect(element.title).to.equal('Loading title');
        expect(element.lang).to.equal('en');
        expect(element.dir).to.equal('rtl');
        expect(element.classList.contains('consumer-class')).to.equal(true);
        expect(element.classList.contains('fui-Skeleton')).to.equal(true);
        expect(style(element).display).to.equal('block');
        expect(style(element).width).to.equal('220px');
        expect(element.getAttribute('aria-busy')).to.equal('true');
        expect(element.children).to.have.length(1);
      });
      cy.get('[data-testid="plain-child"]').should('have.text', 'Placeholder text');
    });

    it(`preserves ${as} render-function root props/ref and supplies context to render-function descendants`, () => {
      const ref = React.createRef<HTMLDivElement>();
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        const render: SlotRenderFunction<React.HTMLAttributes<HTMLElement>> = (Root, props) => (
          <Root {...props}>
            <span>{changed ? 'Changed rendered child' : 'Initial rendered child'}</span>
            <SkeletonItem data-testid="inherited" />
            <ContextProbe />
          </Root>
        );
        return (
          <>
            <button onClick={() => setChanged(true)}>Update render function</button>
            <Skeleton
              as={as}
              ref={ref}
              data-testid="root"
              aria-label={changed ? 'Loading changed' : 'Loading initial'}
              title="Custom renderer"
              size={changed ? 48 : 24}
              shape="circle"
              animation="pulse"
            >
              {render}
            </Skeleton>
          </>
        );
      };
      mount(<Fixture />);
      contextIs('context', { animation: 'pulse', appearance: 'opaque', size: 24, shape: 'circle' });
      item().should('have.css', 'height', '24px');
      root().then($root => {
        const original = $root[0];
        expect(ref.current).to.equal(original);
        expect(original.tagName).to.equal(as.toUpperCase());
        cy.contains('button', 'Update render function').realClick();
        root().should($current => {
          expect($current[0]).to.equal(original);
          expect(ref.current).to.equal(original);
          expect(original.title).to.equal('Custom renderer');
          expect(original.classList.contains('fui-Skeleton')).to.equal(true);
          expect(original.getAttribute('aria-busy')).to.equal('true');
          expect(getByRole(original.parentElement!, 'progressbar', { name: 'Loading changed' })).to.equal(original);
        });
        root().find('span').should('have.text', 'Changed rendered child');
        contextIs('context', { animation: 'pulse', appearance: 'opaque', size: 48, shape: 'circle' });
        item().should('have.css', 'height', '48px').and('have.css', 'width', '48px');
      });
    });
  }

  it('preserves caller atomic class precedence over span display styling and applies style width', () => {
    const Fixture = () => {
      const styles = useTestStyles();
      return <Group as="span" className={styles.root} style={{ width: 180 }} />;
    };
    mount(<Fixture />);
    root().should('have.css', 'display', 'inline-flex').and('have.css', 'width', '180px');
    item().should('have.css', 'height', '16px');
  });

  it('forwards current native handlers and child event bubbling without synthesizing interactive behavior', () => {
    const initial = cy.spy().as('initial');
    const latest = cy.spy().as('latest');
    const childClick = cy.spy().as('child');
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(true)}>Replace listener</button>
          <Skeleton
            data-testid="root"
            onClick={(event: React.MouseEvent<HTMLDivElement>) =>
              (changed ? latest : initial)(event.currentTarget, event.target)
            }
          >
            <span data-testid="native-child" onClick={event => childClick(event.currentTarget)}>
              Native child
            </span>
          </Skeleton>
        </>
      );
    };
    mount(<Fixture />);
    root().then($root => {
      cy.get('[data-testid="native-child"]').then($child => {
        cy.get('[data-testid="native-child"]').realClick();
        cy.get('@initial').should('have.been.calledOnceWithExactly', $root[0], $child[0]);
        cy.get('@child').should('have.been.calledOnceWithExactly', $child[0]);
        cy.contains('button', 'Replace listener').realClick();
        cy.get('[data-testid="native-child"]').realClick();
        cy.get('@latest').should('have.been.calledOnceWithExactly', $root[0], $child[0]);
        cy.get('@initial').should('have.been.calledOnce');
        cy.get('@child').should('have.been.calledTwice');
      });
    });
  });

  it('clears forwarded refs on consumer unmount and attaches a fresh root on remount', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Fixture = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(value => !value)}>Toggle skeleton</button>
          {visible && <Skeleton ref={ref} data-testid="root" aria-label="Loading content" />}
        </>
      );
    };
    mount(<Fixture />);
    root().then($root => {
      const original = $root[0];
      expect(ref.current).to.equal(original);
      cy.contains('button', 'Toggle skeleton').realClick();
      root().should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
      cy.contains('button', 'Toggle skeleton').realClick();
      root().should($current => {
        expect(ref.current).to.equal($current[0]);
        expect($current[0]).not.to.equal(original);
        expect($current[0].getAttribute('aria-busy')).to.equal('true');
      });
    });
  });

  it('replaces content, name and busy metadata in place without auto-completing the group', () => {
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(value => !value)}>Replace child</button>
          <Skeleton data-testid="root" aria-label={changed ? 'Loaded profile' : 'Loading profile'} aria-busy={!changed}>
            {changed ? <p>Real profile content</p> : <SkeletonItem data-testid="inherited" />}
          </Skeleton>
        </>
      );
    };
    mount(<Fixture />);
    root().then($root => {
      const original = $root[0];
      cy.contains('button', 'Replace child').realClick();
      root().should($current => {
        expect($current[0]).to.equal(original);
        expect(getByRole(original.parentElement!, 'progressbar', { name: 'Loaded profile' })).to.equal(original);
        expect(original.getAttribute('aria-busy')).to.equal('false');
      });
      item().should('not.exist');
      root().find('p').should('have.text', 'Real profile content');
      cy.contains('button', 'Replace child').realClick();
      root().should('have.attr', 'aria-busy', 'true');
      item().should('be.visible');
      root().find('p').should('not.exist');
    });
  });

  it('publishes root overrides, then inherited appearance/animation and own size/shape defaults when cleared', () => {
    const Fixture = () => {
      const [explicit, setExplicit] = React.useState(true);
      return (
        <>
          <button onClick={() => setExplicit(value => !value)}>Toggle root settings</button>
          <SkeletonContextProvider value={{ animation: 'pulse', appearance: 'translucent', size: 64, shape: 'circle' }}>
            <Group
              animation={explicit ? 'wave' : undefined}
              appearance={explicit ? 'opaque' : undefined}
              size={explicit ? 24 : undefined}
              shape={explicit ? 'square' : undefined}
            />
          </SkeletonContextProvider>
        </>
      );
    };
    mount(<Fixture />);
    contextIs('context', { animation: 'wave', appearance: 'opaque', size: 24, shape: 'square' });
    item().should('have.css', 'width', '24px');
    cy.contains('button', 'Toggle root settings').realClick();
    contextIs('context', { animation: 'pulse', appearance: 'translucent' });
    item().should('have.css', 'height', '16px').and('have.css', 'border-radius', '4px');
    item().should($item => {
      assertAnimation($item[0], 'pulse');
      assertAppearance($item[0], 'pulse', 'translucent');
    });
    cy.contains('button', 'Toggle root settings').realClick();
    contextIs('context', { animation: 'wave', appearance: 'opaque', size: 24, shape: 'square' });
  });

  it('memoizes group context for native root changes and republishes each of its four settings', () => {
    const observed = cy.spy().as('contextChange');
    const Observer = () => {
      const value = useSkeletonContext();
      React.useEffect(() => {
        observed(value);
      }, [value]);
      return null;
    };
    const Fixture = () => {
      const [title, setTitle] = React.useState('Initial');
      const [settings, setSettings] = React.useState<SkeletonProps>({});
      return (
        <>
          <button onClick={() => setTitle('Updated')}>Change native prop</button>
          <button onClick={() => setSettings(value => ({ ...value, animation: 'pulse' }))}>Change animation</button>
          <button onClick={() => setSettings(value => ({ ...value, appearance: 'translucent' }))}>
            Change appearance
          </button>
          <button onClick={() => setSettings(value => ({ ...value, size: 48 }))}>Change size</button>
          <button onClick={() => setSettings(value => ({ ...value, shape: 'circle' }))}>Change shape</button>
          <Skeleton data-testid="root" title={title} {...settings}>
            <Observer />
          </Skeleton>
        </>
      );
    };
    mount(<Fixture />);
    cy.get('@contextChange').should('have.been.calledTwice');
    cy.then(() => {
      // The shared mount helper replays mount effects in StrictMode.
      expect(observed.firstCall.args[0]).to.equal(observed.secondCall.args[0]);
      observed.resetHistory();
    });
    cy.contains('button', 'Change native prop').realClick();
    root().should('have.attr', 'title', 'Updated');
    cy.get('@contextChange').should('not.have.been.called');
    for (const [index, setting] of ['animation', 'appearance', 'size', 'shape'].entries()) {
      cy.contains('button', `Change ${setting}`).realClick();
      cy.get('@contextChange').should('have.callCount', index + 1);
    }
    cy.get('@contextChange').should('have.been.calledWithMatch', {
      animation: 'pulse',
      appearance: 'translucent',
      size: 48,
      shape: 'circle',
    });
  });

  it('supports public hook/style/context/render recomposition around the group boundary', () => {
    const Recomposed = React.forwardRef<HTMLDivElement, SkeletonProps>((props, ref) => {
      const state = useSkeleton_unstable(props, ref);
      const context = useSkeletonContextValues(state);
      useSkeletonStyles_unstable(state);
      return renderSkeleton_unstable(state, context);
    });
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <Recomposed
        ref={ref}
        data-testid="root"
        animation="pulse"
        size={24}
        shape="circle"
        aria-label="Loading custom group"
      >
        <ContextProbe />
        <SkeletonItem data-testid="inherited" />
      </Recomposed>,
    );
    contextIs('context', { animation: 'pulse', appearance: 'opaque', size: 24, shape: 'circle' });
    root().should($root => {
      expect(ref.current).to.equal($root[0]);
      expect($root[0].classList.contains('fui-Skeleton')).to.equal(true);
      expect(getByRole($root[0].parentElement!, 'progressbar', { name: 'Loading custom group' })).to.equal($root[0]);
    });
    item().should('have.css', 'width', '24px');
    item().should($item => assertAnimation($item[0], 'pulse'));
  });

  it('supports base hook/render semantics without styled root classes or automatic design context', () => {
    const Headless = React.forwardRef<HTMLDivElement, SkeletonBaseProps>((props, ref) =>
      renderSkeleton_unstable(useSkeletonBase_unstable(props, ref), { skeletonGroup: { size: 24, shape: 'square' } }),
    );
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <Headless ref={ref} data-testid="root" aria-label="Loading headless group">
        <ContextProbe />
        <SkeletonItem data-testid="inherited" />
      </Headless>,
    );
    root().should($root => {
      expect(ref.current).to.equal($root[0]);
      expect($root[0].classList.contains('fui-Skeleton')).to.equal(false);
      expect($root[0].getAttribute('role')).to.equal('progressbar');
      expect($root[0].getAttribute('aria-busy')).to.equal('true');
    });
    contextIs('context', { size: 24, shape: 'square' });
    item().should('have.css', 'height', '24px').and('have.css', 'width', '24px');
  });

  for (const animation of ['wave', 'pulse'] as const) {
    it(`makes the inherited ${animation} effect change its actual animated property at deterministic timeline positions`, () => {
      mount(<Group animation={animation} style={{ width: 200 }} />);
      item().then($item => {
        const element = $item[0];
        const effect = element.getAnimations({ subtree: true })[0];
        expect(effect).not.to.equal(undefined);
        effect.pause();
        effect.currentTime = 0;
        item().should($current => {
          const overlay = style($current[0], '::after');
          if (animation === 'pulse') {
            expect(Number(overlay.opacity)).to.equal(1);
          } else {
            expect(new element.ownerDocument.defaultView!.DOMMatrixReadOnly(overlay.transform).m41).to.be.closeTo(
              -200,
              0.1,
            );
          }
        });
        cy.then(() => {
          effect.currentTime = animation === 'pulse' ? 500 : 1500;
        });
        item().should($current => {
          const overlay = style($current[0], '::after');
          if (animation === 'pulse') {
            expect(Number(overlay.opacity)).to.be.closeTo(0.4, 0.001);
          } else {
            expect(new element.ownerDocument.defaultView!.DOMMatrixReadOnly(overlay.transform).m41).to.be.closeTo(
              0,
              0.1,
            );
          }
        });
        root().should('have.attr', 'aria-busy', 'true');
      });
    });
  }
});

describe('Skeleton documented root contracts', () => {
  beforeEach(() => cy.then(() => motion('no-preference')));
  afterEach(() => cy.then(() => motion()));

  it('defaults to a named busy progressbar and supplies wave/opaque context, not root animation', () => {
    mount(<Group />);
    root().should($root => {
      expect(getByRole($root[0].parentElement!, 'progressbar', { name: 'Loading content' })).to.equal($root[0]);
      expect($root[0].tagName).to.equal('DIV');
      expect($root[0].getAttribute('aria-busy')).to.equal('true');
      expect(style($root[0]).animationName).to.equal('none');
      expect(style($root[0], '::after').content).to.equal('none');
    });
    contextIs('context', { animation: 'wave', appearance: 'opaque' });
    item().should('have.css', 'height', '16px');
  });

  for (const animation of ['wave', 'pulse'] as const) {
    for (const appearance of ['opaque', 'translucent'] as const) {
      it(`publishes ${animation}/${appearance} to descendants with real animation and paint`, () => {
        mount(<Group animation={animation} appearance={appearance} />);
        contextIs('context', { animation, appearance });
        item().should($item => {
          assertAnimation($item[0], animation);
          assertAppearance($item[0], animation, appearance);
        });
        root().should($root => {
          expect($root[0].hasAttribute('animation')).to.equal(false);
          expect($root[0].hasAttribute('appearance')).to.equal(false);
        });
      });
    }
  }

  for (const size of sizes) {
    it(`publishes supported group size ${size} through wrappers while allowing local overrides`, () => {
      mount(
        <Skeleton data-testid="root" size={size} aria-label="Loading rows">
          <div>
            <SkeletonItem data-testid="inherited" />
            <SkeletonItem data-testid="override" size={size === 48 ? 24 : 48} />
          </div>
          <ContextProbe />
        </Skeleton>,
      );
      contextIs('context', { animation: 'wave', appearance: 'opaque', size });
      item().should('have.css', 'height', `${size}px`);
      item('override').should('have.css', 'height', size === 48 ? '24px' : '48px');
      root().should('not.have.attr', 'size');
    });
  }

  for (const shape of ['rectangle', 'circle', 'square'] as const) {
    it(`publishes group ${shape} with item shape override and no shape DOM attribute`, () => {
      mount(
        <Skeleton data-testid="root" size={32} shape={shape} style={{ width: 200 }} aria-label="Loading layout">
          <SkeletonItem data-testid="inherited" />
          <SkeletonItem data-testid="override" shape={shape === 'circle' ? 'square' : 'circle'} size={24} />
          <ContextProbe />
        </Skeleton>,
      );
      contextIs('context', { animation: 'wave', appearance: 'opaque', size: 32, shape });
      item().should('have.css', 'width', shape === 'rectangle' ? '200px' : '32px');
      item().should('have.css', 'border-radius', shape === 'circle' ? '50%' : shape === 'square' ? '0px' : '4px');
      item('override').should('have.css', 'width', '24px');
      item('override').should('have.css', 'border-radius', shape === 'circle' ? '0px' : '50%');
      root().should('not.have.attr', 'shape');
    });
  }

  it('supports a consumer grid wireframe with independent placeholder widths', () => {
    mount(
      <Skeleton
        data-testid="root"
        aria-label="Loading profile"
        size={20}
        style={{ display: 'grid', gridTemplateColumns: '24px 160px', gap: 12 }}
      >
        <SkeletonItem data-testid="avatar" size={24} shape="circle" />
        <SkeletonItem data-testid="text" style={{ width: '75%' }} />
      </Skeleton>,
    );
    item('avatar').should('have.css', 'height', '24px');
    item('text').should('have.css', 'height', '20px').and('have.css', 'width', '120px');
    item('avatar').then($avatar => {
      item('text').should($text => {
        expect($text[0].getBoundingClientRect().left - $avatar[0].getBoundingClientRect().right).to.equal(12);
      });
    });
  });
});
