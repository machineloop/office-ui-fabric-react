import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme, tokens } from '@fluentui/react-theme';
import { makeStyles, mergeClasses } from '@griffel/react';
import { getByRole, getAllByRole } from '@testing-library/dom';
import { useTimeout } from '@fluentui/react-utilities';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import { SkeletonItem } from './SkeletonItem';
import type { SkeletonItemProps } from './SkeletonItem.types';
import { Skeleton } from '../Skeleton/Skeleton';
import type { SkeletonProps } from '../Skeleton/Skeleton.types';
import { SkeletonContextProvider } from '../../contexts/SkeletonContext';
import { useSkeletonItem_unstable, useSkeletonItemBase_unstable } from './useSkeletonItem';
import { renderSkeletonItem_unstable } from './renderSkeletonItem';
import { useSkeletonItemStyles_unstable } from './useSkeletonItemStyles.styles';
import type { SkeletonItemBaseProps, SkeletonItemState } from './SkeletonItem.types';

const sizes = [8, 12, 14, 16, 20, 22, 24, 28, 32, 36, 40, 48, 52, 56, 64, 72, 92, 96, 120, 128] as const;
const shapes = ['rectangle', 'circle', 'square'] as const;
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const item = () => cy.get('[data-testid="item"]');
const afterStyle = (element: HTMLElement) => element.ownerDocument.defaultView!.getComputedStyle(element, '::after');
const assertPaintedOverlay = (element: HTMLElement, animation: 'wave' | 'pulse') => {
  const style = afterStyle(element);
  const rect = element.getBoundingClientRect();
  expect(style.content).to.equal('""');
  expect(style.display).to.equal('block');
  expect(style.visibility).to.equal('visible');
  expect(parseFloat(style.opacity)).to.be.greaterThan(0).and.at.most(1);
  expect(element.ownerDocument.defaultView!.getComputedStyle(element).opacity).to.equal('1');
  expect(parseFloat(style.width)).to.be.closeTo(rect.width, 0.05);
  expect(parseFloat(style.height)).to.be.closeTo(rect.height, 0.05);
  expect(rect.width).to.be.greaterThan(0);
  expect(rect.height).to.be.greaterThan(0);
  const view = element.ownerDocument.defaultView!;
  const matrix =
    style.transform === 'none' ? new view.DOMMatrixReadOnly() : new view.DOMMatrixReadOnly(style.transform);
  expect(matrix.a).to.equal(1);
  expect(matrix.b).to.equal(0);
  expect(matrix.c).to.equal(0);
  expect(matrix.d).to.equal(1);
  expect(matrix.m42).to.equal(0);
  if (animation === 'pulse') {
    expect(matrix.m41).to.equal(0);
  }
};
const assertWavePaint = (element: HTMLElement, start: string, peak: string) => {
  assertPaintedOverlay(element, 'wave');
  expect(start).not.to.equal(peak);
  expect(afterStyle(element).backgroundImage).to.equal(
    `linear-gradient(to right, ${start} 0%, ${peak} 50%, ${start} 100%)`,
  );
};
const motion = (value?: 'reduce' | 'no-preference') =>
  Cypress.automation('remote:debugger:protocol', {
    command: 'Emulation.setEmulatedMedia',
    params: { media: 'screen', features: value ? [{ name: 'prefers-reduced-motion', value }] : [] },
  });

describe('SkeletonItem supported edges and accessibility', () => {
  beforeEach(() => cy.then(() => motion('no-preference')));
  afterEach(() => cy.then(() => motion()));

  const assertAnimation = (element: HTMLElement, animation: 'wave' | 'pulse') => {
    expect(afterStyle(element).animationDuration).to.equal(animation === 'wave' ? '3s' : '1s');
    expect(afterStyle(element).animationIterationCount).to.equal('infinite');
    assertPaintedOverlay(element, animation);
  };
  const assertAppearance = (
    element: HTMLElement,
    appearance: 'opaque' | 'translucent',
    animation: 'wave' | 'pulse' = 'wave',
  ) => {
    const colorProbe = element.ownerDocument.querySelector<HTMLElement>(`[data-testid="${appearance}-color"]`)!;
    const window = element.ownerDocument.defaultView!;
    const actual =
      animation === 'pulse' ? afterStyle(element).backgroundColor : window.getComputedStyle(element).backgroundColor;
    expect(actual).to.equal(window.getComputedStyle(colorProbe).color);
  };
  const assertShape = (element: HTMLElement, shape: 'rectangle' | 'circle' | 'square') => {
    expect(element.ownerDocument.defaultView!.getComputedStyle(element).borderRadius).to.equal(
      shape === 'circle' ? '50%' : shape === 'rectangle' ? teamsLightTheme.borderRadiusMedium : '0px',
    );
    expect(element.getBoundingClientRect().width).to.equal(
      shape === 'rectangle' ? element.parentElement!.getBoundingClientRect().width : 16,
    );
  };

  const settings: {
    name: string;
    group: SkeletonProps;
    local: SkeletonItemProps;
    changed: SkeletonProps;
    assertLocal: (element: HTMLElement) => void;
    assertInherited: (element: HTMLElement) => void;
    assertChanged: (element: HTMLElement) => void;
    assertDefault: (element: HTMLElement) => void;
  }[] = [
    {
      name: 'animation',
      group: { animation: 'wave' },
      local: { animation: 'pulse' },
      changed: { animation: 'pulse' },
      assertLocal: element => assertAnimation(element, 'pulse'),
      assertInherited: element => assertAnimation(element, 'wave'),
      assertChanged: element => assertAnimation(element, 'pulse'),
      assertDefault: element => assertAnimation(element, 'wave'),
    },
    {
      name: 'appearance',
      group: { appearance: 'opaque' },
      local: { appearance: 'translucent' },
      changed: { appearance: 'translucent' },
      assertLocal: element => assertAppearance(element, 'translucent'),
      assertInherited: element => assertAppearance(element, 'opaque'),
      assertChanged: element => assertAppearance(element, 'translucent'),
      assertDefault: element => assertAppearance(element, 'opaque'),
    },
    {
      name: 'size',
      group: { size: 32 },
      local: { size: 64 },
      changed: { size: 48 },
      assertLocal: element => expect(element.getBoundingClientRect().height).to.equal(64),
      assertInherited: element => expect(element.getBoundingClientRect().height).to.equal(32),
      assertChanged: element => expect(element.getBoundingClientRect().height).to.equal(48),
      assertDefault: element => expect(element.getBoundingClientRect().height).to.equal(16),
    },
    {
      name: 'shape',
      group: { shape: 'circle' },
      local: { shape: 'square' },
      changed: { shape: 'square' },
      assertLocal: element => assertShape(element, 'square'),
      assertInherited: element => assertShape(element, 'circle'),
      assertChanged: element => assertShape(element, 'square'),
      assertDefault: element => assertShape(element, 'rectangle'),
    },
  ];

  for (const setting of settings) {
    it(`recomputes ${setting.name} alone from explicit override through undefined, changed context and defaults`, () => {
      const Fixture = () => {
        const [group, setGroup] = React.useState<SkeletonProps>(setting.group);
        const [local, setLocal] = React.useState<SkeletonItemProps>(setting.local);
        return (
          <>
            <span data-testid="opaque-color" style={{ color: teamsLightTheme.colorNeutralStencil1 }} />
            <span data-testid="translucent-color" style={{ color: teamsLightTheme.colorNeutralStencil1Alpha }} />
            <button onClick={() => setLocal({ [setting.name]: undefined })}>Use inherited setting</button>
            <button onClick={() => setGroup(setting.changed)}>Change group setting</button>
            <button onClick={() => setGroup(setting.group)}>Restore group setting</button>
            <button onClick={() => setGroup({})}>Clear group setting</button>
            <Skeleton {...group} aria-label="Loading content">
              <SkeletonItem {...local} data-testid="item" />
              <SkeletonItem data-testid="group-control" />
            </Skeleton>
          </>
        );
      };
      mount(<Fixture />);
      item().should($item => setting.assertLocal($item[0]));
      const assertControl = (assert: (element: HTMLElement) => void) =>
        cy.get('[data-testid="group-control"]').should($control => assert($control[0]));
      assertControl(setting.assertInherited);
      item().then($original => {
        const original = $original[0];
        const assertSameRoot = (assert: (element: HTMLElement) => void) =>
          item().should($item => {
            expect($item[0]).to.equal(original);
            assert($item[0]);
          });
        cy.contains('button', 'Change group setting').realClick();
        assertSameRoot(setting.assertLocal);
        assertControl(setting.assertChanged);
        cy.contains('button', 'Restore group setting').realClick();
        assertSameRoot(setting.assertLocal);
        assertControl(setting.assertInherited);
        cy.contains('button', 'Use inherited setting').realClick();
        assertSameRoot(setting.assertInherited);
        assertControl(setting.assertInherited);
        cy.contains('button', 'Change group setting').realClick();
        assertSameRoot(setting.assertChanged);
        assertControl(setting.assertChanged);
        cy.contains('button', 'Clear group setting').realClick();
        assertSameRoot(setting.assertDefault);
        assertControl(setting.assertDefault);
      });
    });
  }

  it('inherits through ordinary wrappers while nested groups and partial providers isolate their size/shape defaults', () => {
    mount(
      <>
        <span data-testid="opaque-color" style={{ color: teamsLightTheme.colorNeutralStencil1 }} />
        <span data-testid="translucent-color" style={{ color: teamsLightTheme.colorNeutralStencil1Alpha }} />
        <Skeleton
          animation="pulse"
          appearance="translucent"
          size={48}
          shape="circle"
          aria-label="Loading outer content"
        >
          <div>
            <SkeletonItem data-testid="outer" />
          </div>
          <Skeleton aria-label="Loading nested content">
            <SkeletonItem data-testid="inner" />
            <SkeletonItem data-testid="inner-override" size={24} shape="square" />
          </Skeleton>
          <SkeletonContextProvider value={{ size: 32 }}>
            <SkeletonItem data-testid="partial" />
          </SkeletonContextProvider>
        </Skeleton>
        <SkeletonItem data-testid="outside" />
      </>,
    );
    cy.get('[data-testid="outer"]').should($item => {
      expect($item[0].getBoundingClientRect().width).to.equal(48);
      expect($item[0].getBoundingClientRect().height).to.equal(48);
      expect($item[0].ownerDocument.defaultView!.getComputedStyle($item[0]).borderRadius).to.equal('50%');
      assertAnimation($item[0], 'pulse');
      assertAppearance($item[0], 'translucent', 'pulse');
    });
    cy.get('[data-testid="inner"]').should($item => {
      expect($item[0].getBoundingClientRect().height).to.equal(16);
      expect($item[0].getBoundingClientRect().width).to.equal($item[0].parentElement!.getBoundingClientRect().width);
      assertAnimation($item[0], 'pulse');
      assertAppearance($item[0], 'translucent', 'pulse');
    });
    cy.get('[data-testid="inner-override"]').should('have.css', 'height', '24px').and('have.css', 'width', '24px');
    cy.get('[data-testid="partial"]').should($item => {
      expect($item[0].getBoundingClientRect().height).to.equal(32);
      expect($item[0].getBoundingClientRect().width).to.equal($item[0].parentElement!.getBoundingClientRect().width);
      assertAnimation($item[0], 'wave');
      assertAppearance($item[0], 'opaque');
    });
    cy.get('[data-testid="outside"]').should($item => {
      expect($item[0].getBoundingClientRect().height).to.equal(16);
      assertAnimation($item[0], 'wave');
      assertShape($item[0], 'rectangle');
      assertAppearance($item[0], 'opaque');
    });
  });

  for (const as of ['div', 'span'] as const) {
    it(`uses latest ${as} click/key/focus/blur handlers and removes them without replacing the native root`, () => {
      const first = cy.spy().as('first');
      const second = cy.spy().as('second');
      const Fixture = () => {
        const [phase, setPhase] = React.useState(0);
        const callback = phase === 0 ? first : phase === 1 ? second : undefined;
        return (
          <>
            <button onClick={() => setPhase(value => value + 1)}>Advance handlers</button>
            <SkeletonItem
              as={as}
              data-testid="item"
              tabIndex={0}
              role="progressbar"
              aria-label="Loading placeholder"
              onClick={
                callback
                  ? (event: React.MouseEvent<HTMLDivElement | HTMLSpanElement>) =>
                      callback('click', event.currentTarget)
                  : undefined
              }
              onKeyDown={
                callback
                  ? (event: React.KeyboardEvent<HTMLDivElement | HTMLSpanElement>) =>
                      callback('key', event.key, event.currentTarget)
                  : undefined
              }
              onFocus={
                callback
                  ? (event: React.FocusEvent<HTMLDivElement | HTMLSpanElement>) =>
                      callback('focus', event.currentTarget)
                  : undefined
              }
              onBlur={
                callback
                  ? (event: React.FocusEvent<HTMLDivElement | HTMLSpanElement>) => callback('blur', event.currentTarget)
                  : undefined
              }
            />
            <button>External focus</button>
          </>
        );
      };
      mount(<Fixture />);
      item().then($item => {
        const original = $item[0];
        const activate = () => {
          item().realClick();
          cy.realPress('Enter');
          cy.contains('button', 'External focus').realClick();
        };
        const assertEvents = (alias: string) => {
          cy.get(alias).should('have.been.calledWithExactly', 'focus', original);
          cy.get(alias).should('have.been.calledWithExactly', 'click', original);
          cy.get(alias).should('have.been.calledWithExactly', 'key', 'Enter', original);
          cy.get(alias).should('have.been.calledWithExactly', 'blur', original);
          cy.get(alias).should('have.callCount', 4);
        };
        activate();
        assertEvents('@first');
        cy.contains('button', 'Advance handlers').realClick();
        cy.then(() => first.resetHistory());
        activate();
        assertEvents('@second');
        cy.get('@first').should('not.have.been.called');
        cy.contains('button', 'Advance handlers').realClick();
        cy.then(() => {
          first.resetHistory();
          second.resetHistory();
        });
        activate();
        cy.get('@first').should('not.have.been.called');
        cy.get('@second').should('not.have.been.called');
        item().should($current => expect($current[0]).to.equal(original));
      });
    });
  }

  it('changes the native root between div and span, detaches old refs and retains animation/layout/native props', () => {
    const refs = cy.spy().as('refs');
    const trackRef = (node: HTMLDivElement | null) => refs(node);
    const Fixture = () => {
      const [span, setSpan] = React.useState(false);
      return (
        <>
          <button onClick={() => setSpan(value => !value)}>Change root element</button>
          <SkeletonItem
            as={span ? 'span' : 'div'}
            data-testid="item"
            title="Switchable placeholder"
            ref={trackRef}
            animation="pulse"
            size={24}
          />
        </>
      );
    };
    mount(<Fixture />);
    item()
      .should('have.prop', 'tagName', 'DIV')
      .then($initial => {
        const initial = $initial[0];
        expect(initial.isConnected).to.equal(true);
        cy.get('@refs').its('lastCall.args').should('deep.equal', [initial]);
        cy.then(() => refs.resetHistory());
        cy.contains('button', 'Change root element').realClick();
        item().should('have.prop', 'tagName', 'SPAN').and('have.css', 'display', 'block');
        item().should('have.css', 'height', '24px').and('have.attr', 'title', 'Switchable placeholder');
        item().then($span => {
          const span = $span[0];
          expect(span).not.to.equal(initial);
          expect(initial.isConnected).to.equal(false);
          expect(afterStyle(span).animationDuration).to.equal('1s');
          cy.get('@refs').should('have.been.calledWithExactly', null);
          cy.get('@refs').its('lastCall.args').should('deep.equal', [span]);
          cy.then(() => refs.resetHistory());
          cy.contains('button', 'Change root element').realClick();
          item().should('have.prop', 'tagName', 'DIV').and('have.css', 'height', '24px');
          item().then($div => {
            expect(span.isConnected).to.equal(false);
            expect(afterStyle($div[0]).animationDuration).to.equal('1s');
            cy.get('@refs').should('have.been.calledWithExactly', null);
            cy.get('@refs').its('lastCall.args').should('deep.equal', [$div[0]]);
          });
        });
      });
  });

  for (const as of ['div', 'span'] as const) {
    it(`forwards ${as} pointer/key/focus/blur events and refs without inventing button keyboard activation`, () => {
      const click = cy.spy().as('itemClick');
      const key = cy.spy().as('itemKey');
      const focus = cy.spy().as('itemFocus');
      const blur = cy.spy().as('itemBlur');
      const ref = cy.spy().as('itemRef');
      const Fixture = () => {
        const [visible, setVisible] = React.useState(true);
        return (
          <>
            <button>Before placeholder</button>
            {visible && (
              <SkeletonItem
                as={as}
                data-testid="item"
                tabIndex={0}
                role="progressbar"
                aria-label="Focusable placeholder"
                ref={node => ref(node)}
                onClick={(event: React.MouseEvent<HTMLDivElement | HTMLSpanElement>) =>
                  click(event.type, event.currentTarget, event.nativeEvent.isTrusted)
                }
                onKeyDown={(event: React.KeyboardEvent<HTMLDivElement | HTMLSpanElement>) =>
                  key(event.key, event.currentTarget)
                }
                onFocus={(event: React.FocusEvent<HTMLDivElement | HTMLSpanElement>) => focus(event.currentTarget)}
                onBlur={(event: React.FocusEvent<HTMLDivElement | HTMLSpanElement>) => blur(event.currentTarget)}
              />
            )}
            <button>After placeholder</button>
            <button onClick={() => setVisible(false)}>Remove placeholder</button>
          </>
        );
      };
      mount(<Fixture />);
      item().then($item => {
        const element = $item[0];
        cy.get('@itemRef').should('have.been.calledWith', element);
        cy.contains('button', 'Before placeholder').realClick();
        cy.realPress('Tab');
        item().should('be.focused');
        cy.get('@itemFocus').should('have.been.calledWith', element);
        item().realClick();
        cy.get('@itemClick').should('have.been.calledOnceWithExactly', 'click', element, true);
        cy.then(() => click.resetHistory());
        cy.realPress('Enter');
        cy.realPress('Space');
        cy.get('@itemKey').should('have.been.calledWithExactly', 'Enter', element);
        cy.get('@itemKey').should('have.been.calledWithExactly', ' ', element);
        cy.get('@itemClick').should('not.have.been.called');
        cy.realPress('Tab');
        cy.contains('button', 'After placeholder').should('be.focused');
        cy.get('@itemBlur').should('have.been.calledWith', element);
        cy.then(() => ref.resetHistory());
        cy.contains('button', 'Remove placeholder').realClick();
        item().should('not.exist');
        cy.get('@itemRef').should('have.been.calledOnceWithExactly', null);
      });
    });
  }

  it('remains decorative and skipped by native Tab unless the caller explicitly opts into focus', () => {
    mount(
      <>
        <button>Before placeholder</button>
        <SkeletonItem data-testid="item" />
        <button>After placeholder</button>
      </>,
    );
    item().should('have.css', 'height', '16px');
    cy.contains('button', 'Before placeholder').realClick();
    cy.realPress('Tab');
    cy.contains('button', 'After placeholder').should('be.focused');
    item().should('not.have.attr', 'tabindex');
    item().should('not.have.attr', 'role');
  });

  it('updates caller-owned progress semantics, naming and description relationships on the same root', () => {
    const Fixture = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button onClick={() => setPhase(value => value + 1)}>Advance progress</button>
          <span id="loading-name">Loading profile</span>
          <span id="loaded-name">Profile ready</span>
          <span id="loading-detail">Waiting for data</span>
          <span id="loaded-detail">Fresh data available</span>
          <SkeletonItem
            data-testid="item"
            role="progressbar"
            aria-labelledby={phase === 0 ? 'loading-name' : 'loaded-name'}
            aria-describedby={phase === 0 ? 'loading-detail' : phase === 1 ? 'loaded-detail' : undefined}
            aria-busy={phase === 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={phase === 0 ? 25 : 100}
          />
        </>
      );
    };
    mount(<Fixture />);
    item().then($original => {
      const original = $original[0];
      cy.get('[data-cy-root]').should($root => {
        expect(
          getByRole($root[0], 'progressbar', { name: 'Loading profile', description: 'Waiting for data' }),
        ).to.equal(original);
      });
      item().should('have.attr', 'aria-busy', 'true').and('have.attr', 'aria-valuenow', '25');
      cy.contains('button', 'Advance progress').realClick();
      cy.get('[data-cy-root]').should($root => {
        expect(
          getByRole($root[0], 'progressbar', { name: 'Profile ready', description: 'Fresh data available' }),
        ).to.equal(original);
      });
      item().should('have.attr', 'aria-busy', 'false').and('have.attr', 'aria-valuenow', '100');
      cy.contains('button', 'Advance progress').realClick();
      cy.get('[data-cy-root]').should($root => {
        expect(getByRole($root[0], 'progressbar', { name: 'Profile ready', description: '' })).to.equal(original);
      });
      item().should('not.have.attr', 'aria-describedby');
      item().should('have.attr', 'aria-valuemin', '0').and('have.attr', 'aria-valuemax', '100');
    });
  });

  for (const animation of ['wave', 'pulse'] as const) {
    for (const appearance of ['opaque', 'translucent'] as const) {
      it(`honors actual reduced-motion media for ${appearance} ${animation} without collapsing the placeholder`, () => {
        cy.then(() => motion('reduce'));
        mount(<ItemFixture animation={animation} appearance={appearance} shape="circle" size={32} />);
        item().should($item => {
          const element = $item[0];
          expect(element.ownerDocument.defaultView!.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(
            true,
          );
          expect(afterStyle(element).animationName).not.to.equal('none');
          expect(parseFloat(afterStyle(element).animationDuration)).to.equal(0.00001);
          expect(afterStyle(element).animationIterationCount).to.equal('1');
          expect(element.getBoundingClientRect().width).to.equal(32);
          expect(element.getBoundingClientRect().height).to.equal(32);
        });
      });
    }
  }

  for (const appearance of ['opaque', 'translucent'] as const) {
    it(`uses system text contrast for ${appearance} wave placeholders under actual forced-colors media`, () => {
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { media: 'screen', features: [{ name: 'forced-colors', value: 'active' }] },
        }),
      );
      mount(
        <>
          <span data-testid="system-text" style={{ color: 'WindowText' }} />
          <SkeletonItem appearance={appearance} data-testid="item" />
        </>,
      );
      cy.get('[data-testid="system-text"]').then($probe => {
        const expected = $probe[0].ownerDocument.defaultView!.getComputedStyle($probe[0]).color;
        item().should($item => {
          const element = $item[0];
          expect(element.ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(true);
          expect(afterStyle(element).backgroundColor).to.equal(expected);
          expect(element.getBoundingClientRect().height).to.equal(16);
        });
      });
    });
  }
});

// eslint-disable-next-line @griffel/styles-file -- These classes exercise consumer overrides and documented layout only.
const useFixtureStyles = makeStyles({
  halfWidth: { width: '50%' },
  customHeight: { height: tokens.spacingVerticalXXXL },
  row: { display: 'grid', gridTemplateColumns: 'min-content 80%', gap: tokens.spacingHorizontalS },
  detailedRow: {
    display: 'grid',
    gridTemplateColumns: 'min-content 20% 20% 15% 15%',
    gap: tokens.spacingHorizontalS,
  },
});

describe('SkeletonItem unit-derived browser regressions', () => {
  beforeEach(() => cy.then(() => motion('no-preference')));
  afterEach(() => cy.then(() => motion()));

  it('ports exact hook-unit context size24/circle and local size48/square overrides into actual layout', () => {
    mount(
      <SkeletonContextProvider value={{ size: 24, shape: 'circle' }}>
        <SkeletonItem data-testid="inherited" />
        <SkeletonItem data-testid="overridden" size={48} shape="square" />
        <SkeletonItem data-testid="undefined" size={undefined} shape={undefined} />
      </SkeletonContextProvider>,
    );
    for (const id of ['inherited', 'undefined']) {
      cy.get(`[data-testid="${id}"]`)
        .should('have.css', 'height', '24px')
        .and('have.css', 'width', '24px')
        .and('have.css', 'border-radius', '50%');
    }
    cy.get('[data-testid="overridden"]')
      .should('have.css', 'height', '48px')
      .and('have.css', 'width', '48px')
      .and('have.css', 'border-radius', '0px');
  });

  for (const as of ['div', 'span'] as const) {
    it(`preserves ${as} native props/static class while consumer class then inline dimensions win and reset`, () => {
      const click = cy.spy().as('nativeClick');
      const Fixture = () => {
        const styles = useFixtureStyles();
        const [phase, setPhase] = React.useState(0);
        return (
          <>
            <button onClick={() => setPhase(value => value + 1)}>Advance overrides</button>
            <SkeletonItem
              as={as}
              data-testid="item"
              id="native-placeholder"
              lang="fr"
              title="Native placeholder title"
              size={24}
              shape="square"
              animation="pulse"
              appearance="opaque"
              className={mergeClasses(phase < 2 ? styles.customHeight : undefined, 'caller-marker')}
              style={phase === 1 ? { height: tokens.spacingVerticalXL } : undefined}
              onClick={(event: React.MouseEvent<HTMLDivElement | HTMLSpanElement>) => click(event.currentTarget)}
            >
              Default SkeletonItem
            </SkeletonItem>
          </>
        );
      };
      mount(<Fixture />);
      item()
        .should('have.class', 'fui-SkeletonItem')
        .and('have.class', 'caller-marker')
        .and('have.css', 'height', teamsLightTheme.spacingVerticalXXXL)
        .and('have.css', 'width', '24px')
        .and('have.text', 'Default SkeletonItem');
      item().should('have.attr', 'id', 'native-placeholder').and('have.attr', 'lang', 'fr');
      item().should('have.attr', 'title', 'Native placeholder title');
      item().then($item => {
        const element = $item[0];
        expect(afterStyle(element).animationDuration).to.equal('1s');
        expect(element.ownerDocument.defaultView!.getComputedStyle(element).borderRadius).to.equal('0px');
        for (const attribute of ['size', 'shape', 'animation', 'appearance']) {
          expect(element.hasAttribute(attribute), attribute).to.equal(false);
        }
        item().realClick();
        cy.get('@nativeClick').should('have.been.calledOnceWithExactly', element);
        cy.contains('button', 'Advance overrides').realClick();
        item().should('have.css', 'height', teamsLightTheme.spacingVerticalXL);
        cy.contains('button', 'Advance overrides').realClick();
        item()
          .should('have.css', 'height', '24px')
          .and('have.class', 'fui-SkeletonItem')
          .and('have.class', 'caller-marker')
          .and('have.text', 'Default SkeletonItem');
        item().should($current => expect($current[0]).to.equal(element));
      });
    });
  }

  const childrenCases: { name: string; value: React.ReactNode; text: string }[] = [
    { name: 'null', value: null, text: '' },
    { name: 'undefined', value: undefined, text: '' },
    { name: 'false', value: false, text: '' },
    { name: 'empty string', value: '', text: '' },
    { name: 'empty array', value: [], text: '' },
    { name: 'numeric zero', value: 0, text: '0' },
    { name: 'text', value: 'Skeleton details', text: 'Skeleton details' },
    { name: 'element', value: <span>Skeleton details</span>, text: 'Skeleton details' },
    {
      name: 'mixed array',
      value: ['Profile', null, 0, <span key="detail">Details</span>],
      text: 'Profile0Details',
    },
  ];
  for (const child of childrenCases) {
    it(`preserves supported ${child.name} children through replacement and restoration without losing the root`, () => {
      const Fixture = () => {
        const [phase, setPhase] = React.useState(0);
        return (
          <>
            <button onClick={() => setPhase(value => value + 1)}>Replace content</button>
            <SkeletonItem data-testid="item">
              {phase === 0 ? 'Initial content' : phase === 1 ? child.value : 'Restored content'}
            </SkeletonItem>
          </>
        );
      };
      mount(<Fixture />);
      item()
        .should('have.text', 'Initial content')
        .then($original => {
          const original = $original[0];
          cy.contains('button', 'Replace content').realClick();
          item().should('have.text', child.text).and('have.css', 'height', '16px');
          item().should($current => expect($current[0]).to.equal(original));
          cy.contains('button', 'Replace content').realClick();
          item().should('have.text', 'Restored content').and('have.css', 'height', '16px');
          item().should($current => expect($current[0]).to.equal(original));
        });
    });
  }

  for (const as of ['div', 'span'] as const) {
    it(`preserves generated ${as} root props/ref/styles and native bubbling in updated render-function children`, () => {
      const rootClick = cy.spy().as('rootClick');
      const childClick = cy.spy().as('childClick');
      const rootRef = React.createRef<HTMLDivElement>();
      const Fixture = () => {
        const [name, setName] = React.useState('Initial placeholder');
        // Keep the decorative moving overlay out of this child-bubbling fixture's native hit testing.
        const render: SlotRenderFunction<React.HTMLAttributes<HTMLElement>> = (Root, props) => (
          <Root {...props} style={{ ...props.style, pointerEvents: 'none' }}>
            <span
              style={{ display: 'block', pointerEvents: 'auto' }}
              onClick={event => childClick(event.currentTarget)}
            >
              {name}
            </span>
          </Root>
        );
        return (
          <>
            <button onClick={() => setName('Updated placeholder')}>Update render content</button>
            <SkeletonItem
              as={as}
              data-testid="item"
              size={48}
              shape="circle"
              role="progressbar"
              aria-label={name}
              title="Render-function title"
              ref={rootRef}
              onClick={(event: React.MouseEvent<HTMLDivElement | HTMLSpanElement>) =>
                rootClick(event.currentTarget, event.target)
              }
            >
              {render}
            </SkeletonItem>
          </>
        );
      };
      mount(<Fixture />);
      item()
        .should('have.prop', 'tagName', as.toUpperCase())
        .and('have.text', 'Initial placeholder')
        .and('have.css', 'width', '48px')
        .and('have.css', 'height', '48px')
        .and('have.css', 'border-radius', '50%')
        .and('have.attr', 'title', 'Render-function title');
      item().then($item => {
        const original = $item[0];
        expect(rootRef.current).to.equal(original);
        item()
          .children('span')
          .then($child => {
            const child = $child[0];
            item().children('span').realClick();
            cy.get('@childClick').should('have.been.calledOnceWithExactly', child);
            cy.get('@rootClick').should('have.been.calledOnceWithExactly', original, child);
          });
        cy.contains('button', 'Update render content').realClick();
        item().should('have.text', 'Updated placeholder').and('have.css', 'height', '48px');
        cy.get('[data-cy-root]').should($root => {
          expect(getByRole($root[0], 'progressbar', { name: 'Updated placeholder' })).to.equal(original);
          expect(rootRef.current).to.equal(original);
        });
      });
    });
  }

  it('supports full public hook/style/render recomposition with context and native interaction', () => {
    const Recomposition = React.forwardRef<HTMLDivElement, SkeletonItemProps>((props, ref) => {
      const state = useSkeletonItem_unstable(props, ref);
      useSkeletonItemStyles_unstable(state);
      return renderSkeletonItem_unstable(state);
    });
    const click = cy.spy().as('recomposedClick');
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <Skeleton size={48} shape="circle" animation="pulse" aria-label="Loading content">
        <Recomposition data-testid="item" ref={ref} onClick={event => click(event.currentTarget)}>
          Custom placeholder
        </Recomposition>
      </Skeleton>,
    );
    item().should('have.text', 'Custom placeholder').and('have.css', 'height', '48px').and('have.css', 'width', '48px');
    item().then($item => {
      const element = $item[0];
      expect(ref.current).to.equal(element);
      expect(afterStyle(element).animationDuration).to.equal('1s');
      item().realClick();
      cy.get('@recomposedClick').should('have.been.calledOnceWithExactly', element);
    });
  });

  it('supports the public base hook/render without imposing styled animation or losing native root behavior', () => {
    const Headless = React.forwardRef<HTMLDivElement, SkeletonItemBaseProps>((props, ref) =>
      renderSkeletonItem_unstable(useSkeletonItemBase_unstable(props, ref)),
    );
    const click = cy.spy().as('headlessClick');
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <>
        <SkeletonItem data-testid="styled-control" />
        <Headless
          data-testid="item"
          ref={ref}
          id="headless-placeholder"
          style={{ height: tokens.spacingVerticalXL }}
          onClick={(event: React.MouseEvent<HTMLDivElement | HTMLSpanElement>) => click(event.currentTarget)}
        >
          Native custom content
        </Headless>
      </>,
    );
    cy.get('[data-testid="styled-control"]').should($item =>
      expect(afterStyle($item[0]).animationName).not.to.equal('none'),
    );
    item().should('have.text', 'Native custom content').and('have.attr', 'id', 'headless-placeholder');
    item().should('have.css', 'height', teamsLightTheme.spacingVerticalXL);
    item().then($item => {
      const element = $item[0];
      expect(ref.current).to.equal(element);
      expect(afterStyle(element).animationName).to.equal('none');
      item().realClick();
      cy.get('@headlessClick').should('have.been.calledOnceWithExactly', element);
    });
  });

  for (const animation of ['wave', 'pulse'] as const) {
    for (const appearance of ['opaque', 'translucent'] as const) {
      it(`updates and restores provider theme tokens for ${appearance} ${animation} without remounting`, () => {
        const Fixture = () => {
          const [dark, setDark] = React.useState(false);
          const theme = dark ? teamsDarkTheme : teamsLightTheme;
          return (
            <FluentProvider theme={theme}>
              <button onClick={() => setDark(value => !value)}>Switch provider theme</button>
              <span
                data-testid="color"
                style={{
                  color: appearance === 'opaque' ? theme.colorNeutralStencil1 : theme.colorNeutralStencil1Alpha,
                }}
              />
              <span data-testid="contrast-color" style={{ color: theme.colorNeutralStencil2 }} />
              <span data-testid="transparent-color" style={{ color: 'transparent' }} />
              <SkeletonItem data-testid="item" appearance={appearance} animation={animation} size={24} shape="square" />
            </FluentProvider>
          );
        };
        mountBase(<Fixture />);
        const color = (element: HTMLElement) =>
          animation === 'wave'
            ? element.ownerDocument.defaultView!.getComputedStyle(element).backgroundColor
            : afterStyle(element).backgroundColor;
        const assertCurrentTheme = () =>
          cy.get('[data-testid="color"]').then($probe => {
            const expected = $probe[0].ownerDocument.defaultView!.getComputedStyle($probe[0]).color;
            item().should($item => {
              const element = $item[0];
              expect(color(element)).to.equal(expected);
              assertPaintedOverlay(element, animation);
              if (animation === 'wave') {
                const window = element.ownerDocument.defaultView!;
                const contrast = window.getComputedStyle(
                  element.ownerDocument.querySelector<HTMLElement>('[data-testid="contrast-color"]')!,
                ).color;
                const transparent = window.getComputedStyle(
                  element.ownerDocument.querySelector<HTMLElement>('[data-testid="transparent-color"]')!,
                ).color;
                assertWavePaint(
                  element,
                  appearance === 'opaque' ? expected : transparent,
                  appearance === 'opaque' ? contrast : expected,
                );
              }
            });
          });
        assertCurrentTheme();
        item().then($original => {
          const original = $original[0];
          const initial = color(original);
          cy.contains('button', 'Switch provider theme').realClick();
          assertCurrentTheme();
          item().should($item => {
            expect($item[0]).to.equal(original);
            expect(color($item[0])).not.to.equal(initial);
            expect($item[0].getBoundingClientRect().height).to.equal(24);
          });
          cy.contains('button', 'Switch provider theme').realClick();
          assertCurrentTheme();
          item().should($item => {
            expect($item[0]).to.equal(original);
            expect(color($item[0])).to.equal(initial);
          });
        });
      });
    }
  }

  it('applies the public provider custom-style hook after built-in dimensions while retaining consumer props/events', () => {
    const click = cy.spy().as('customStyleClick');
    const useCustomStyles = (unknownState: unknown) => {
      const styles = useFixtureStyles();
      const state = unknownState as SkeletonItemState;
      state.root.className = mergeClasses(state.root.className, styles.customHeight);
    };
    const customStyleHooks = {
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Public custom-style hook key.
      useSkeletonItemStyles_unstable: useCustomStyles,
    };
    mountBase(
      <FluentProvider theme={teamsLightTheme} customStyleHooks_unstable={customStyleHooks}>
        <SkeletonItem
          data-testid="item"
          id="custom-styled-placeholder"
          size={16}
          onClick={event => click(event.currentTarget)}
        />
      </FluentProvider>,
    );
    item()
      .should('have.css', 'height', teamsLightTheme.spacingVerticalXXXL)
      .and('have.attr', 'id', 'custom-styled-placeholder')
      .and('have.class', 'fui-SkeletonItem');
    item().then($item => {
      const element = $item[0];
      expect(afterStyle(element).animationDuration).to.equal('3s');
      item().realClick();
      cy.get('@customStyleClick').should('have.been.calledOnceWithExactly', element);
    });
  });
});

const ItemFixture = (props: SkeletonItemProps) => (
  <div data-testid="frame">
    <SkeletonItem {...props} data-testid="item" />
  </div>
);

const RowFixture = () => {
  const styles = useFixtureStyles();
  return (
    <Skeleton size={20} aria-label="Loading content">
      <div className={styles.row} data-testid="row">
        <SkeletonItem shape="circle" size={24} />
        <SkeletonItem shape="rectangle" />
      </div>
      {(['circle', 'square'] as const).map(shape => (
        <div className={styles.detailedRow} data-testid="row" key={shape}>
          <SkeletonItem shape={shape} size={24} />
          {[0, 1, 2, 3].map(index => (
            <SkeletonItem key={index} />
          ))}
        </div>
      ))}
    </Skeleton>
  );
};

const WidthFixture = () => {
  const styles = useFixtureStyles();
  const [narrow, setNarrow] = React.useState(false);
  return (
    <>
      <button onClick={() => setNarrow(value => !value)}>Resize content</button>
      <div data-testid="frame" style={{ width: narrow ? '50%' : '100%' }}>
        <SkeletonItem className={styles.halfWidth} data-testid="item" />
      </div>
    </>
  );
};

const LoadingFixture = () => {
  const [loaded, setLoaded] = React.useState(true);
  const [announcement, setAnnouncement] = React.useState('');
  const [setTimeout] = useTimeout();
  const load = () => {
    setLoaded(false);
    setAnnouncement('Loading profile and comments');
    setTimeout(() => {
      setLoaded(true);
      setAnnouncement('Content loaded');
    }, 5000);
  };
  return (
    <section aria-label="User content" aria-busy={!loaded}>
      <button disabled={!loaded} onClick={load}>
        Refresh content
      </button>
      <div role="status" aria-live="polite" data-testid="announcement">
        {announcement}
      </div>
      {loaded ? (
        <article aria-label="User profile">Profile and comments loaded</article>
      ) : (
        <>
          <Skeleton aria-label="Loading profile">
            <SkeletonItem shape="circle" size={64} />
            <SkeletonItem />
          </Skeleton>
          <Skeleton aria-label="Loading comments">
            <SkeletonItem />
            <SkeletonItem />
          </Skeleton>
        </>
      )}
    </section>
  );
};

describe('SkeletonItem documented contracts', () => {
  beforeEach(() => cy.then(() => motion('no-preference')));
  afterEach(() => cy.then(() => motion()));

  it('defaults to a full-width 16px rectangular animated placeholder', () => {
    mount(<ItemFixture />);
    item().should($item => {
      const element = $item[0];
      expect(element.tagName).to.equal('DIV');
      expect(element.getBoundingClientRect().height).to.equal(16);
      expect(element.getBoundingClientRect().width).to.equal(element.parentElement!.getBoundingClientRect().width);
      expect(afterStyle(element).animationDuration).to.equal('3s');
      expect(afterStyle(element).animationIterationCount).to.equal('infinite');
      expect(element.ownerDocument.defaultView!.getComputedStyle(element).borderRadius).to.equal(
        teamsLightTheme.borderRadiusMedium,
      );
    });
  });

  for (const as of ['div', 'span'] as const) {
    it(`supports the documented ${as} root without collapsing placeholder layout`, () => {
      mount(<ItemFixture as={as} />);
      item().should($item => {
        const element = $item[0];
        expect(element.tagName).to.equal(as.toUpperCase());
        expect(element.ownerDocument.defaultView!.getComputedStyle(element).display).to.equal('block');
        expect(element.getBoundingClientRect().height).to.equal(16);
        expect(element.getBoundingClientRect().width).to.equal(element.parentElement!.getBoundingClientRect().width);
      });
    });
  }

  for (const shape of shapes) {
    for (const size of sizes) {
      it(`lays out documented ${shape} size ${size} without losing its shape`, () => {
        mount(<ItemFixture shape={shape} size={size} />);
        item().should($item => {
          const element = $item[0];
          const rect = element.getBoundingClientRect();
          const style = element.ownerDocument.defaultView!.getComputedStyle(element);
          expect(rect.height).to.equal(size);
          expect(rect.width).to.equal(
            shape === 'rectangle' ? element.parentElement!.getBoundingClientRect().width : size,
          );
          expect(style.borderRadius).to.equal(
            shape === 'circle' ? '50%' : shape === 'rectangle' ? teamsLightTheme.borderRadiusMedium : '0px',
          );
        });
      });
    }
  }

  for (const animation of ['wave', 'pulse'] as const) {
    it(`uses explicit item ${animation} animation rather than the opposite group animation`, () => {
      mount(
        <Skeleton animation={animation === 'wave' ? 'pulse' : 'wave'} aria-label="Loading content">
          <SkeletonItem animation={animation} data-testid="item" />
        </Skeleton>,
      );
      item().should($item => {
        expect(afterStyle($item[0]).animationDuration).to.equal(animation === 'wave' ? '3s' : '1s');
        expect(afterStyle($item[0]).animationName).not.to.equal('none');
        expect($item[0].getBoundingClientRect().height).to.equal(16);
      });
    });

    it(`inherits ${animation} and actually animates its ${animation === 'wave' ? 'translation' : 'opacity'}`, () => {
      mount(
        <Skeleton animation={animation} aria-label="Loading content">
          <SkeletonItem data-testid="item" />
        </Skeleton>,
      );
      item().should($item => {
        const style = afterStyle($item[0]);
        expect(style.animationName).not.to.equal('none');
        expect(style.animationDuration).to.equal(animation === 'wave' ? '3s' : '1s');
        expect(style.animationIterationCount).to.equal('infinite');
      });
      item().then($item => {
        const element = $item[0];
        const initial = animation === 'wave' ? afterStyle(element).transform : afterStyle(element).opacity;
        item().should($current => {
          const current = animation === 'wave' ? afterStyle($current[0]).transform : afterStyle($current[0]).opacity;
          expect(current).not.to.equal(initial);
        });
      });
      if (animation === 'wave') {
        item().should($item => {
          const element = $item[0];
          const style = afterStyle(element);
          const matrix = new element.ownerDocument.defaultView!.DOMMatrixReadOnly(style.transform);
          const width = parseFloat(style.width);
          expect(width).to.be.greaterThan(0);
          expect(matrix.m41 / width).to.be.within(-0.45, 0.45);
        });
      }
    });

    for (const appearance of ['opaque', 'translucent'] as const) {
      it(`inherits ${appearance} appearance for ${animation} without changing dimensions`, () => {
        mount(
          <>
            <span
              data-testid="expected-color"
              style={{
                color:
                  appearance === 'opaque'
                    ? teamsLightTheme.colorNeutralStencil1
                    : teamsLightTheme.colorNeutralStencil1Alpha,
              }}
            />
            <span data-testid="contrast-color" style={{ color: teamsLightTheme.colorNeutralStencil2 }} />
            <span data-testid="transparent-color" style={{ color: 'transparent' }} />
            <Skeleton appearance={appearance} animation={animation} aria-label="Loading content">
              <SkeletonItem data-testid="item" shape="square" size={32} />
            </Skeleton>
          </>,
        );
        cy.get('[data-testid="expected-color"]').then($probe => {
          const expectedColor = $probe[0].ownerDocument.defaultView!.getComputedStyle($probe[0]).color;
          item().should($item => {
            const element = $item[0];
            const actual =
              animation === 'pulse'
                ? afterStyle(element).backgroundColor
                : element.ownerDocument.defaultView!.getComputedStyle(element).backgroundColor;
            expect(actual).to.equal(expectedColor);
            expect(element.getBoundingClientRect().width).to.equal(32);
            expect(element.getBoundingClientRect().height).to.equal(32);
            assertPaintedOverlay(element, animation);
            if (animation === 'wave') {
              const window = element.ownerDocument.defaultView!;
              const contrast = window.getComputedStyle(
                element.ownerDocument.querySelector<HTMLElement>('[data-testid="contrast-color"]')!,
              ).color;
              const transparent = window.getComputedStyle(
                element.ownerDocument.querySelector<HTMLElement>('[data-testid="transparent-color"]')!,
              ).color;
              assertWavePaint(
                element,
                appearance === 'opaque' ? expectedColor : transparent,
                appearance === 'opaque' ? contrast : expectedColor,
              );
            }
          });
        });
      });
    }
  }

  for (const appearance of ['opaque', 'translucent'] as const) {
    it(`uses explicit item ${appearance} appearance rather than the opposite group appearance`, () => {
      mount(
        <>
          <span
            data-testid="expected-color"
            style={{
              color:
                appearance === 'opaque'
                  ? teamsLightTheme.colorNeutralStencil1
                  : teamsLightTheme.colorNeutralStencil1Alpha,
            }}
          />
          <Skeleton appearance={appearance === 'opaque' ? 'translucent' : 'opaque'} aria-label="Loading content">
            <SkeletonItem appearance={appearance} data-testid="item" />
          </Skeleton>
        </>,
      );
      cy.get('[data-testid="expected-color"]').then($probe => {
        const expected = $probe[0].ownerDocument.defaultView!.getComputedStyle($probe[0]).color;
        item().should('have.css', 'background-color', expected);
      });
    });
  }

  it('composes the documented multi-row wireframe with inherited sizes and local circle/square overrides', () => {
    mount(<RowFixture />);
    cy.get('[data-testid="row"]')
      .should('have.length', 3)
      .each(($row, rowIndex) => {
        const items = Array.from($row[0].children) as HTMLElement[];
        const rowWidth = $row[0].getBoundingClientRect().width;
        expect(items).to.have.length(rowIndex === 0 ? 2 : 5);
        expect(items[0].getBoundingClientRect().height).to.equal(24);
        expect(items[0].getBoundingClientRect().width).to.equal(24);
        expect(items[0].ownerDocument.defaultView!.getComputedStyle(items[0]).borderRadius).to.equal(
          rowIndex === 2 ? '0px' : '50%',
        );
        items.slice(1).forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          expect(rect.height).to.equal(20);
          expect(rect.left).to.be.greaterThan(items[index].getBoundingClientRect().right);
          expect(rect.width / rowWidth).to.be.closeTo(rowIndex === 0 ? 0.8 : index < 2 ? 0.2 : 0.15, 0.001);
        });
      });
    cy.get('[role="progressbar"]').should('have.attr', 'aria-busy', 'true');
  });

  it('honors consumer width classes and tracks resized content instead of imposing a fixed rectangle width', () => {
    mount(<WidthFixture />);
    const assertHalfWidth = () =>
      item().should($item => {
        const element = $item[0];
        expect(element.getBoundingClientRect().width / element.parentElement!.getBoundingClientRect().width).to.equal(
          0.5,
        );
        expect(element.getBoundingClientRect().height).to.equal(16);
      });
    assertHalfWidth();
    item().then($item => {
      const originalWidth = $item[0].getBoundingClientRect().width;
      cy.contains('button', 'Resize content').click();
      assertHalfWidth();
      item().should($resized => expect($resized[0].getBoundingClientRect().width).to.equal(originalWidth / 2));
    });
  });

  for (const role of ['article', 'group', 'region'] as const) {
    it(`supports the documented named ${role} wrapper without assigning duplicate roles to decorative items`, () => {
      mount(
        <div role={role} aria-labelledby="wrapper-name" aria-busy="true">
          <span id="wrapper-name">Loading user content</span>
          <Skeleton>
            <SkeletonItem />
            <SkeletonItem shape="circle" />
          </Skeleton>
        </div>,
      );
      cy.get('[data-cy-root]').should($root => {
        const wrapper = getByRole($root[0], role, { name: 'Loading user content' });
        expect(wrapper.getAttribute('aria-busy')).to.equal('true');
        expect(getAllByRole(wrapper, 'progressbar')).to.have.length(1);
        expect(wrapper.querySelectorAll('.fui-SkeletonItem')).to.have.length(2);
        expect(wrapper.querySelectorAll('.fui-SkeletonItem[role]')).to.have.length(0);
        expect(wrapper.querySelectorAll('.fui-SkeletonItem[aria-live]')).to.have.length(0);
      });
    });
  }

  it('labels a single loader on its progressbar rather than its decorative item', () => {
    mount(
      <Skeleton aria-label="Loading content">
        <SkeletonItem data-testid="item" />
      </Skeleton>,
    );
    cy.get('[data-cy-root]').should($root => {
      expect(getByRole($root[0], 'progressbar', { name: 'Loading content' }).getAttribute('aria-busy')).to.equal(
        'true',
      );
      expect(getAllByRole($root[0], 'progressbar')).to.have.length(1);
    });
    item().should('not.have.attr', 'aria-live');
  });

  it('keeps bulk content busy until 5s completion and announces loaded once at section level', () => {
    cy.clock();
    mount(<LoadingFixture />);
    const announce = cy.spy().as('announce');
    cy.get('[data-testid="announcement"]').then($status => {
      const status = $status[0];
      const observer = new status.ownerDocument.defaultView!.MutationObserver(() => announce(status.textContent));
      observer.observe(status, { childList: true, characterData: true, subtree: true });
      cy.wrap(observer).as('announcementObserver');
    });
    cy.get('section').should('have.attr', 'aria-busy', 'false');
    cy.contains('article', 'Profile and comments loaded').should('be.visible');
    cy.contains('button', 'Refresh content').click();
    cy.get('section').should('have.attr', 'aria-busy', 'true');
    cy.get('section').find('[aria-live]').should('have.length', 1);
    cy.get('[data-cy-root]').should($root => {
      expect(getByRole($root[0], 'progressbar', { name: 'Loading profile' })).to.exist;
      expect(getByRole($root[0], 'progressbar', { name: 'Loading comments' })).to.exist;
      expect(getAllByRole($root[0], 'progressbar')).to.have.length(2);
    });
    cy.get('@announce').should('have.been.calledOnceWithExactly', 'Loading profile and comments');
    cy.tick(4999);
    cy.get('section').should('have.attr', 'aria-busy', 'true');
    cy.get('[role="progressbar"]').should('have.length', 2);
    cy.get('@announce').should('have.been.calledOnce');
    cy.tick(1);
    cy.get('section').should('have.attr', 'aria-busy', 'false');
    cy.contains('article', 'Profile and comments loaded').should('be.visible');
    cy.get('[role="progressbar"]').should('not.exist');
    cy.get('[data-testid="announcement"]').should('have.text', 'Content loaded');
    cy.get('@announce').should('have.been.calledTwice');
    cy.get('@announce').its('secondCall.args').should('deep.equal', ['Content loaded']);
    cy.get<MutationObserver>('@announcementObserver').then(observer => observer.disconnect());
  });

  it('does not add live regions to individual placeholders in progressive-scroll content', () => {
    const ProgressiveFixture = () => {
      const [more, setMore] = React.useState(false);
      return (
        <section
          aria-label="Comments"
          aria-busy={more}
          data-testid="scroll-content"
          style={{ height: tokens.lineHeightBase500, overflowY: 'auto' }}
          onScroll={event => {
            const container = event.currentTarget;
            if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
              setMore(true);
            }
          }}
        >
          <article>
            {[0, 1, 2, 3, 4, 5].map(index => (
              <div key={index}>Already loaded comments remain readable</div>
            ))}
          </article>
          {more && (
            <Skeleton aria-label="Loading more comments">
              <SkeletonItem />
              <SkeletonItem />
            </Skeleton>
          )}
        </section>
      );
    };
    mount(<ProgressiveFixture />);
    cy.contains('article', 'Already loaded comments remain readable').should('be.visible');
    cy.get('[data-testid="scroll-content"]')
      .should($scroll => {
        expect($scroll[0].scrollHeight).to.be.greaterThan($scroll[0].clientHeight);
        expect($scroll[0].scrollTop).to.equal(0);
      })
      .realMouseWheel({ deltaY: 500 });
    cy.get('[role="progressbar"]').should('have.attr', 'aria-busy', 'true');
    cy.contains('article', 'Already loaded comments remain readable').should('be.visible');
    cy.get('section').should('have.attr', 'aria-busy', 'true');
    cy.get('section').find('[aria-live], [role="status"], [role="alert"]').should('not.exist');
  });
});
