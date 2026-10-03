import 'cypress-real-events';
import * as React from 'react';
import { mergeClasses } from '@griffel/react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { CustomStyleHooksProvider_unstable } from '@fluentui/react-shared-contexts';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import { useIsomorphicLayoutEffect, useMergedRefs } from '@fluentui/react-utilities';
import {
  CarouselSlider,
  carouselSliderClassNames,
  useCarouselSlider_unstable,
  useCarouselSliderStyles_unstable,
  renderCarouselSlider_unstable,
} from './index';
import type { CarouselSliderProps } from './CarouselSlider.types';
import { useCarouselSliderContext } from './CarouselSliderContext';
import { useCarouselSliderContextValues_unstable } from './useCarouselSliderContextValues';
import { Carousel } from '../Carousel/Carousel';
import type { CarouselProps, CarouselUpdateData } from '../Carousel/Carousel.types';
import { CarouselViewport } from '../CarouselViewport/CarouselViewport';
import { CarouselCard } from '../CarouselCard/CarouselCard';
import { CarouselNav } from '../CarouselNav/CarouselNav';
import { CarouselNavButton } from '../CarouselNavButton/CarouselNavButton';
import { CarouselProvider, carouselContextDefaultValue, useCarouselContext_unstable } from '../CarouselContext';
import { useSliderCoverageStyles } from './CarouselSlider.cy.styles';

const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  mountBase(
    <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );

const SliderContext = ({ id = 'focus-context' }: { id?: string }) => {
  const { cardFocus } = useCarouselSliderContext();
  return <output data-testid={id}>{String(cardFocus)}</output>;
};

const EngineContext = ({ prefix }: { prefix: string }) => {
  const index = useCarouselContext_unstable(ctx => ctx.activeIndex);
  const subscribe = useCarouselContext_unstable(ctx => ctx.subscribeForValues);
  const containerRef = useCarouselContext_unstable(ctx => ctx.containerRef);
  const viewportRef = useCarouselContext_unstable(ctx => ctx.viewportRef);
  const [data, setData] = React.useState<CarouselUpdateData>();
  useIsomorphicLayoutEffect(() => subscribe(setData), [subscribe]);
  return (
    <output data-testid={`${prefix}-engine`}>
      {JSON.stringify({
        index,
        count: data?.navItemsCount,
        groups: data?.groupIndexList,
        ids: data?.slideNodes.map(node => node.id),
        container: containerRef?.current?.getAttribute('data-testid'),
        viewport: viewportRef?.current?.getAttribute('data-testid'),
      })}
    </output>
  );
};

type FixtureProps = CarouselProps & {
  prefix?: string;
  cards?: string[];
  width?: number;
  cardWidth?: number;
  gap?: boolean;
  clipViewport?: boolean;
  sliderProps?: CarouselSliderProps;
  sliderRef?: React.Ref<HTMLDivElement>;
};

const Fixture = ({
  prefix = 'slider',
  cards = ['a', 'b', 'c'],
  width = 480,
  cardWidth,
  gap = false,
  clipViewport = false,
  sliderProps,
  sliderRef,
  children,
  ...props
}: FixtureProps) => {
  const styles = useSliderCoverageStyles();
  return (
    <Carousel
      aria-label={`${prefix} carousel`}
      data-testid={`${prefix}-root`}
      style={{ width }}
      groupSize={1}
      {...props}
    >
      <CarouselViewport data-testid={`${prefix}-viewport`} style={clipViewport ? { overflow: 'hidden' } : undefined}>
        <CarouselSlider
          aria-label="Carousel cards"
          data-testid={`${prefix}-track`}
          className={gap ? styles.gap : undefined}
          ref={sliderRef}
          {...sliderProps}
        >
          {cards.map((key, index) => (
            <CarouselCard
              key={key}
              id={`${prefix}-${key}`}
              data-testid={`${prefix}-${key}`}
              aria-label={`${index + 1} of ${cards.length}`}
              autoSize={cardWidth !== undefined}
              style={{ width: cardWidth, height: 120 }}
            >
              <button data-testid={`${prefix}-${key}-action`}>Action {key}</button>
            </CarouselCard>
          ))}
        </CarouselSlider>
      </CarouselViewport>
      <CarouselNav aria-label={`${prefix} pages`}>
        {index => <CarouselNavButton aria-label={`Page ${index + 1}`} data-testid={`${prefix}-nav-${index}`} />}
      </CarouselNav>
      <EngineContext prefix={prefix} />
      {children}
    </Carousel>
  );
};

const track = (prefix = 'slider') => cy.get<HTMLDivElement>(`[data-testid="${prefix}-track"]`);
const card = (key: string, prefix = 'slider') => cy.get<HTMLDivElement>(`[data-testid="${prefix}-${key}"]`);
const nav = (index: number, prefix = 'slider') => cy.get(`[data-testid="${prefix}-nav-${index}"]`);
const selected = (index: number, prefix = 'slider') => nav(index, prefix).should('have.attr', 'aria-selected', 'true');
const engine = (prefix = 'slider') => cy.get(`[data-testid="${prefix}-engine"]`);
const aligned = (key: string, dir: 'ltr' | 'rtl' = 'ltr', offset = 0, width = 480, prefix = 'slider') =>
  card(key, prefix).should(elements => {
    const viewport = elements[0].closest('.fui-CarouselViewport');
    expect(viewport, 'real viewport').not.to.equal(null);
    const view = viewport!.getBoundingClientRect();
    const rect = elements[0].getBoundingClientRect();
    expect(view.width, 'measured viewport width').to.equal(width);
    expect(rect.width, 'positive card width').to.be.greaterThan(0);
    const actual = dir === 'ltr' ? rect.left - view.left : view.right - rect.right;
    expect(Math.abs(actual - offset), 'settled physical offset').to.be.lessThan(1);
  });

describe('CarouselSlider unit and source derived regressions', () => {
  const observers: MutationObserver[] = [];
  afterEach(function () {
    observers.splice(0).forEach(observer => observer.disconnect());
    if (this.currentTest?.title.includes('reduced-motion')) {
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [] },
        }),
      );
    }
  });
  it('forwards an object ref to the existing root on content updates and releases it on removal', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Host = () => {
      const [visible, setVisible] = React.useState(true);
      const [text, setText] = React.useState('First');
      return (
        <>
          <button onClick={() => setText('Latest')}>Update text</button>
          <button onClick={() => setVisible(false)}>Remove track</button>
          {visible && (
            <CarouselSlider data-testid="slider-track" ref={ref}>
              {text}
            </CarouselSlider>
          )}
        </>
      );
    };
    mount(<Host />);
    track().then(elements => {
      const original = elements[0];
      expect(ref.current).to.equal(original);
      cy.contains('button', 'Update text').click();
      track()
        .should('have.text', 'Latest')
        .then(current => {
          expect(current[0]).to.equal(original);
          expect(ref.current).to.equal(original);
        });
    });
    cy.contains('button', 'Remove track').click();
    track()
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('replaces callback refs with balanced release and supplies the latest callback on keyed root replacement', () => {
    const first = cy.stub();
    const latest = cy.stub();
    const Host = () => {
      const [version, setVersion] = React.useState(0);
      return (
        <>
          <button onClick={() => setVersion(1)}>Replace callback</button>
          <button onClick={() => setVersion(2)}>Replace root</button>
          <button onClick={() => setVersion(3)}>Unmount slider</button>
          {version < 3 && (
            <CarouselSlider
              key={version < 2 ? 'original' : 'replacement'}
              data-testid="slider-track"
              ref={version ? latest : first}
            />
          )}
        </>
      );
    };
    mount(<Host />);
    track().then(elements => {
      const original = elements[0];
      expect(first.lastCall.args[0]).to.equal(original);
      cy.contains('button', 'Replace callback').click();
      track().then(current => {
        expect(current[0]).to.equal(original);
        expect(first.lastCall.args[0]).to.equal(null);
        expect(latest.lastCall.args[0]).to.equal(original);
      });
      cy.contains('button', 'Replace root').click();
      track().then(current => {
        expect(current[0]).not.to.equal(original);
        expect(original.isConnected).to.equal(false);
        expect(latest.lastCall.args[0]).to.equal(current[0]);
        expect(latest.getCalls().some(call => call.args[0] === null)).to.equal(true);
      });
    });
    cy.contains('button', 'Unmount slider').click();
    track()
      .should('not.exist')
      .then(() => expect(latest.lastCall.args[0]).to.equal(null));
  });

  it('preserves consumer chained refs for a registered physical track and clears every ref on unmount', () => {
    const objectRef = React.createRef<HTMLDivElement>();
    const callback = cy.stub();
    const Host = () => {
      const [visible, setVisible] = React.useState(true);
      const merged = useMergedRefs(objectRef, callback);
      return (
        <>
          <button onClick={() => setVisible(false)}>Remove carousel</button>
          {visible && <Fixture sliderRef={merged} />}
        </>
      );
    };
    mount(<Host />);
    track().then(elements => {
      expect(objectRef.current).to.equal(elements[0]);
      expect(callback.lastCall.args[0]).to.equal(elements[0]);
    });
    nav(2).click();
    aligned('c');
    cy.contains('button', 'Remove carousel').click();
    track()
      .should('not.exist')
      .then(() => {
        expect(objectRef.current).to.equal(null);
        expect(callback.lastCall.args[0]).to.equal(null);
      });
  });

  it('root render functions retain role classes native props ref and slider focus context', () => {
    const ref = React.createRef<HTMLDivElement>();
    const render: SlotRenderFunction<React.ComponentPropsWithRef<'div'>> = (Component, props) => (
      <Component {...props} data-rendered="true">
        <CarouselCard id="render-card">Rendered card</CarouselCard>
        <SliderContext />
      </Component>
    );
    mount(
      <Carousel style={{ width: 480 }} groupSize={1}>
        <CarouselViewport>
          <CarouselSlider as="div" ref={ref} id="render-track" cardFocus title="Native render title">
            {render}
          </CarouselSlider>
        </CarouselViewport>
        <EngineContext prefix="render" />
      </Carousel>,
    );
    cy.get('#render-track')
      .should('have.attr', 'role', 'group')
      .and('have.attr', 'title', 'Native render title')
      .and('have.attr', 'data-rendered', 'true')
      .and('have.class', carouselSliderClassNames.root)
      .then(elements => expect(ref.current).to.equal(elements[0]));
    cy.get('#render-card').should('have.attr', 'tabindex', '0');
    cy.get('[data-testid="focus-context"]').should('have.text', 'true');
    engine('render').should('contain.text', '"ids":["render-card"]').and('contain.text', '"count":1');
  });

  it('exported hook styles context-values and renderer compose the same native root', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Composed = () => {
      const state = useCarouselSlider_unstable(
        { cardFocus: true, title: 'Composed', children: <SliderContext /> },
        ref,
      );
      useCarouselSliderStyles_unstable(state);
      return renderCarouselSlider_unstable(state, useCarouselSliderContextValues_unstable(state));
    };
    mount(<Composed />);
    cy.get(`.${carouselSliderClassNames.root}`)
      .should('have.attr', 'role', 'group')
      .and('have.attr', 'title', 'Composed')
      .and('have.css', 'display', 'flex')
      .then(elements => expect(ref.current).to.equal(elements[0]));
    cy.get('[data-testid="focus-context"]').should('have.text', 'true');
  });

  it('memoizes focus context across unrelated rerenders and replaces it only for a changed cardFocus value', () => {
    const values: ReturnType<typeof useCarouselSliderContext>[] = [];
    const Probe = () => {
      const value = useCarouselSliderContext();
      React.useEffect(() => {
        values.push(value);
      });
      return <output data-testid="memo-context">{String(value.cardFocus)}</output>;
    };
    const Host = () => {
      const [version, setVersion] = React.useState(0);
      const [focus, setFocus] = React.useState(false);
      return (
        <>
          <button onClick={() => setVersion(value => value + 1)}>Unrelated render</button>
          <button onClick={() => setFocus(true)}>Enable focus context</button>
          <CarouselSlider title={String(version)} cardFocus={focus}>
            <Probe />
          </CarouselSlider>
        </>
      );
    };
    mount(<Host />);
    cy.get('[data-testid="memo-context"]').should('have.text', 'false');
    cy.then(() => {
      const original = values[values.length - 1];
      cy.contains('button', 'Unrelated render').click();
      cy.then(() => expect(values[values.length - 1]).to.equal(original));
      cy.contains('button', 'Enable focus context').click();
      cy.get('[data-testid="memo-context"]')
        .should('have.text', 'true')
        .then(() => {
          expect(values[values.length - 1]).not.to.equal(original);
        });
    });
  });

  it('nested slider providers use the nearest focus value and restore the outer value after the nested subtree', () => {
    mount(
      <CarouselSlider cardFocus>
        <SliderContext id="outer-before" />
        <CarouselSlider cardFocus={false}>
          <SliderContext id="inner-value" />
        </CarouselSlider>
        <SliderContext id="outer-after" />
      </CarouselSlider>,
    );
    cy.get('[data-testid="outer-before"]').should('have.text', 'true');
    cy.get('[data-testid="inner-value"]').should('have.text', 'false');
    cy.get('[data-testid="outer-after"]').should('have.text', 'true');
  });

  it('uses latest inherited appearance circular and theme tokens without acquiring a slider appearance prop', () => {
    const Host = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <FluentProvider theme={{ ...teamsLightTheme, spacingHorizontalXXL: changed ? '40px' : '32px' }}>
          <button onClick={() => setChanged(true)}>Update inherited context</button>
          <CarouselProvider
            value={{ ...carouselContextDefaultValue, circular: changed, appearance: changed ? 'elevated' : 'flat' }}
          >
            <CarouselSlider data-testid="slider-track" cardFocus />
          </CarouselProvider>
        </FluentProvider>
      );
    };
    mount(<Host />);
    track().should('have.css', 'gap', 'normal');
    cy.contains('button', 'Update inherited context').click();
    track().should('have.css', 'gap', '40px').and('not.have.attr', 'appearance');
    track().should(elements =>
      expect(JSON.parse(elements[0].getAttribute('data-tabster')!).mover.cyclic).to.equal(true),
    );
  });

  it('preserves consumer Griffel overrides after base classes and responds to light and dark tokens', () => {
    const Host = () => {
      const [dark, setDark] = React.useState(false);
      const styles = useSliderCoverageStyles();
      return (
        <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme}>
          <button onClick={() => setDark(true)}>Dark theme</button>
          <CarouselSlider data-testid="slider-track" className={styles.override}>
            <span className={styles.themed} data-testid="themed-content">
              Themed
            </span>
          </CarouselSlider>
        </FluentProvider>
      );
    };
    mount(<Host />);
    track().should('have.css', 'display', 'inline-flex').and('have.css', 'overflow-anchor', 'auto');
    cy.get('[data-testid="themed-content"]').should(elements => {
      const sample = elements[0].ownerDocument.createElement('span');
      sample.style.backgroundColor = teamsLightTheme.colorNeutralBackground1;
      expect(elements[0].ownerDocument.defaultView!.getComputedStyle(elements[0]).backgroundColor).to.equal(
        sample.style.backgroundColor,
      );
    });
    cy.contains('button', 'Dark theme').click();
    cy.get('[data-testid="themed-content"]').should(elements => {
      const sample = elements[0].ownerDocument.createElement('span');
      sample.style.backgroundColor = teamsDarkTheme.colorNeutralBackground1;
      expect(elements[0].ownerDocument.defaultView!.getComputedStyle(elements[0]).backgroundColor).to.equal(
        sample.style.backgroundColor,
      );
    });
    track().should('have.class', carouselSliderClassNames.root).and('have.css', 'display', 'inline-flex');
  });

  it('applies the latest custom style hook after base styling while preserving the registered track class', () => {
    const observed = cy.stub();
    const Host = () => {
      const [changed, setChanged] = React.useState(false);
      const styles = useSliderCoverageStyles();
      return (
        <CustomStyleHooksProvider_unstable
          value={{
            // eslint-disable-next-line @typescript-eslint/naming-convention
            useCarouselSliderStyles_unstable: state => {
              if (
                typeof state !== 'object' ||
                state === null ||
                !('root' in state) ||
                typeof state.root !== 'object' ||
                state.root === null ||
                !('className' in state.root) ||
                typeof state.root.className !== 'string'
              ) {
                throw new Error('Expected the styled CarouselSlider root');
              }
              observed(changed, state.root.className);
              state.root.className = mergeClasses(state.root.className, changed && styles.custom);
            },
          }}
        >
          <button onClick={() => setChanged(true)}>Update custom hook</button>
          <Fixture />
        </CustomStyleHooksProvider_unstable>
      );
    };
    mount(<Host />);
    track().should('have.css', 'display', 'flex');
    cy.contains('button', 'Update custom hook').click();
    track().should('have.css', 'overflow-anchor', 'auto').and('have.class', carouselSliderClassNames.root);
    cy.then(() => {
      expect(observed.lastCall.args[0]).to.equal(true);
      expect(observed.lastCall.args[1]).to.contain(carouselSliderClassNames.root);
    });
    nav(1).click();
    selected(1);
    aligned('b');
  });

  it('composes latest native click focus and pointer-cancel handlers with event propagation', () => {
    const events = cy.stub();
    const parent = cy.stub();
    const Host = () => {
      const [version, setVersion] = React.useState('first');
      return (
        <div onClick={parent}>
          <button onClick={() => setVersion('latest')}>Update handlers</button>
          <CarouselSlider
            data-testid="slider-track"
            tabIndex={0}
            onClick={event => events(version, event.type, event.currentTarget)}
            onFocus={event => events(version, event.type, event.currentTarget)}
            onPointerCancel={event => events(version, event.type, event.currentTarget)}
          >
            Native content
          </CarouselSlider>
        </div>
      );
    };
    mount(<Host />);
    track().click();
    cy.contains('button', 'Update handlers').click();
    cy.then(() => {
      events.resetHistory();
      parent.resetHistory();
    });
    track().focus().realClick().trigger('pointercancel', { pointerId: 1, pointerType: 'mouse' });
    track().then(elements => {
      expect(events.getCalls().map(call => call.args.slice(0, 2))).to.deep.equal([
        ['latest', 'focus'],
        ['latest', 'click'],
        ['latest', 'pointercancel'],
      ]);
      for (const call of events.getCalls()) {
        expect(call.args[2]).to.equal(elements[0]);
      }
      expect(parent.callCount).to.equal(1);
    });
  });

  it('releases and reinitializes actual root registration on carousel remount without duplicate callbacks', () => {
    const changes = cy.stub();
    const ref = React.createRef<HTMLDivElement>();
    const Host = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(value => !value)}>Toggle carousel</button>
          {visible && <Fixture sliderRef={ref} onActiveIndexChange={changes} />}
        </>
      );
    };
    mount(<Host />);
    track().then(elements => {
      const old = elements[0];
      nav(1).click();
      aligned('b');
      cy.contains('button', 'Toggle carousel').click();
      track()
        .should('not.exist')
        .then(() => {
          expect(ref.current).to.equal(null);
          expect(old.isConnected).to.equal(false);
        });
      cy.contains('button', 'Toggle carousel').click();
      track().then(current => {
        expect(current[0]).not.to.equal(old);
        expect(ref.current).to.equal(current[0]);
      });
    });
    engine().should('contain.text', '"ids":["slider-a","slider-b","slider-c"]').and('contain.text', '"count":3');
    selected(0);
    nav(2).click();
    selected(2);
    aligned('c');
    cy.then(() => expect(changes.getCalls().map(call => call.args[1].index)).to.deep.equal([1, 2]));
  });

  it('characterizes retained offscreen inert flags when cardFocus changes after banner navigation', () => {
    const Host = () => {
      const [focus, setFocus] = React.useState(false);
      return (
        <>
          <button onClick={() => setFocus(true)}>Enable card focus</button>
          <Fixture sliderProps={{ cardFocus: focus }} />
        </>
      );
    };
    mount(<Host />);
    nav(1).click();
    selected(1);
    aligned('b');
    card('a').should('have.attr', 'aria-hidden', 'true').and('have.prop', 'inert', true);
    cy.contains('button', 'Enable card focus').click();
    track().should('have.attr', 'data-tabster');
    card('a')
      .should('have.attr', 'tabindex', '0')
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.prop', 'inert', true);
    card('b').should('have.attr', 'tabindex', '0').and('have.prop', 'inert', false);
  });

  it('characterizes consumer-clipped viewport focus scrolling separately from default root clipping', () => {
    mount(<Fixture clipViewport sliderProps={{ cardFocus: true }} />);
    card('a').focus().realPress('ArrowRight');
    card('b').should('be.focused');
    selected(1);
    cy.get('[data-testid="slider-viewport"]').should('have.prop', 'scrollLeft', 480);
    track().should(elements => {
      const view = elements[0].closest('.fui-CarouselViewport')!;
      const b = elements[0].querySelector('#slider-b')!;
      expect(Math.abs(b.getBoundingClientRect().left - view.getBoundingClientRect().left + 480)).to.be.lessThan(1);
    });
  });

  it('does not implement a reduced-motion media-query override beyond the actual parent motion API', () => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
      }),
    );
    mount(<Fixture motion={{ kind: 'slide', duration: 40 }} />);
    cy.get('[data-testid="slider-root"]').then(elements => {
      expect(elements[0].ownerDocument.defaultView!.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(
        true,
      );
    });
    const positions: number[] = [];
    track().then(elements => {
      const node = elements[0];
      const observer = new node.ownerDocument.defaultView!.MutationObserver(() => {
        positions.push(new node.ownerDocument.defaultView!.DOMMatrixReadOnly(node.style.transform).m41);
      });
      observer.observe(node, { attributes: true, attributeFilter: ['style'] });
      observers.push(observer);
    });
    nav(1).realClick();
    selected(1);
    aligned('b');
    cy.then(() =>
      expect(
        positions.some(position => position < 0 && position > -479),
        'observed intermediate physics motion',
      ).to.equal(true),
    );
    track().should(elements => {
      expect(elements[0].ownerDocument.defaultView!.getComputedStyle(elements[0]).transitionDuration).to.equal('0s');
      expect(elements[0].style.transform).to.contain('-480');
    });
  });
});

describe('CarouselSlider documented contract', () => {
  it('renders a passive flex group without range semantics or an automatic live region', () => {
    mount(<CarouselSlider data-testid="slider-track">Content</CarouselSlider>);
    track()
      .should('have.attr', 'role', 'group')
      .and('have.class', carouselSliderClassNames.root)
      .and('have.css', 'display', 'flex')
      .and('have.css', 'overflow-anchor', 'none')
      .and('have.text', 'Content');
    track().should(elements => {
      for (const name of [
        'tabindex',
        'aria-valuenow',
        'aria-valuemin',
        'aria-valuemax',
        'aria-live',
        'aria-roledescription',
        'aria-label',
        'data-tabster',
      ]) {
        expect(elements[0].hasAttribute(name), name).to.equal(false);
      }
    });

    track().should('have.prop', 'tagName', 'DIV');
    cy.get('[role="slider"], input[type="range"], [aria-live]').should('not.exist');
  });
});

describe('CarouselSlider edges and accessibility', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const circular of [false, true]) {
      it(`navigates card focus horizontally in ${dir} with circular ${circular}`, () => {
        mount(<Fixture circular={circular} sliderProps={{ cardFocus: true }} />, dir);
        const forward = dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft';
        const backward = dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight';
        card('a').focus().realPress(forward);
        card('b').should('be.focused');
        selected(1);
        aligned('b', dir);
        cy.realPress(backward);
        card('a').should('be.focused');
        selected(0);
        aligned('a', dir);
        card('c').focus();
        selected(2);
        aligned('c', dir);
        cy.realPress(forward);
        card(circular ? 'a' : 'c').should('be.focused');
        selected(circular ? 0 : 2);
        aligned(circular ? 'a' : 'c', dir);
        track().should(elements => {
          const mover = JSON.parse(elements[0].getAttribute('data-tabster')!).mover;
          expect(mover.cyclic).to.equal(circular);
        });
      });
    }
  }

  it('does not turn a caller-focusable passive group into a keyboard-operated range', () => {
    const keys = cy.stub();
    mount(<Fixture sliderProps={{ tabIndex: 0, onKeyDown: keys }} />);
    track().focus().realPress('ArrowRight').realPress('ArrowUp').realPress('Home').realPress('End');
    selected(0);
    aligned('a');
    track().should('be.focused');
    cy.then(() =>
      expect(keys.getCalls().map(call => call.args[0].key)).to.deep.equal(['ArrowRight', 'ArrowUp', 'Home', 'End']),
    );
    nav(1).click();
    selected(1);
    aligned('b');
  });

  it('keeps native Tab entry on the visible banner action and excludes out-of-view inert actions', () => {
    mount(
      <>
        <button data-testid="before">Before</button>
        <Fixture />
      </>,
    );
    nav(1).click();
    aligned('b');
    nav(0).click();
    aligned('a');
    card('b').should('have.attr', 'aria-hidden', 'true').and('have.prop', 'inert', true);
    cy.get('[data-testid="before"]').focus().realPress('Tab');
    cy.get('[data-testid="slider-a-action"]').should('be.focused');
    cy.realPress('Tab');
    nav(0).should('be.focused');
    track().should('not.have.attr', 'tabindex');
  });

  it('characterizes handled arrows captured by Tabster before React bubbling and forwards unhandled keys', () => {
    const keys = cy.stub();
    const Host = () => {
      const [cancel, setCancel] = React.useState(true);
      return (
        <>
          <button onClick={() => setCancel(false)}>Allow arrows</button>
          <Fixture
            sliderProps={{
              cardFocus: true,
              onKeyDown: event => {
                keys(event.key);
                if (cancel) {
                  event.preventDefault();
                }
              },
            }}
          />
        </>
      );
    };
    mount(<Host />);
    card('a').focus().realPress('ArrowRight');
    card('b').should('be.focused');
    selected(1);
    aligned('b');
    cy.contains('button', 'Allow arrows').click();
    card('a').focus().realPress('ArrowRight');
    card('b').should('be.focused');
    selected(1);
    aligned('b');
    cy.then(() => expect(keys.callCount).to.equal(0));
    cy.realPress('F2');
    cy.then(() => expect(keys.getCalls().map(call => call.args[0])).to.deep.equal(['F2']));
  });

  it('updates focus and circular context on the existing slider root without duplicate registration', () => {
    const Host = () => {
      const [enabled, setEnabled] = React.useState(false);
      return (
        <>
          <button onClick={() => setEnabled(value => !value)}>Toggle focus</button>
          <Fixture circular={enabled} sliderProps={{ cardFocus: enabled }} />
        </>
      );
    };
    mount(<Host />);
    track().then(elements => {
      const original = elements[0];
      cy.contains('button', 'Toggle focus').click();
      track().should(current => {
        expect(current[0]).to.equal(original);
        expect(JSON.parse(current[0].getAttribute('data-tabster')!).mover.cyclic).to.equal(true);
      });
      card('a').should('have.attr', 'tabindex', '0');
      engine().should('contain.text', '"ids":["slider-a","slider-b","slider-c"]').and('contain.text', '"count":3');
      cy.contains('button', 'Toggle focus').click();
      track().should('not.have.attr', 'data-tabster');
      card('a').should('not.have.attr', 'tabindex');
      cy.get('[role="tab"]').should('have.length', 3);
    });
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const draggable of [false, true]) {
      it(`measures real drag ${draggable} in ${dir} with native callback identity`, () => {
        const changes = cy.stub();
        mount(<Fixture cards={['a', 'b']} draggable={draggable} onActiveIndexChange={changes} />, dir);
        aligned('a', dir);
        const start = dir === 'ltr' ? 400 : 60;
        const end = dir === 'ltr' ? 60 : 400;
        cy.get('[data-testid="slider-viewport"]').realMouseDown({ x: start, y: 80 });
        cy.get('[data-testid="slider-viewport"]').realMouseMove(240, 80).realMouseMove(end, 80);
        cy.get('[data-testid="slider-viewport"]').realMouseUp({ x: end, y: 80 });
        selected(draggable ? 1 : 0);
        aligned(draggable ? 'b' : 'a', dir);
        cy.then(() => {
          expect(changes.callCount).to.equal(draggable ? 1 : 0);
          if (draggable) {
            const [event, data] = changes.lastCall.args;
            expect(data).to.include({ type: 'drag', index: 1 });
            expect(data.event).to.equal(event);
            expect(['mousedown', 'pointerdown']).to.include(event.type);
          }
        });
      });
    }
  }

  it('settles a reversed short drag back to the original physical page and remains navigable', () => {
    mount(<Fixture draggable />);
    aligned('a');
    cy.get('[data-testid="slider-viewport"]').realMouseDown({ x: 400, y: 80 });
    cy.get('[data-testid="slider-viewport"]').realMouseMove(380, 80).realMouseMove(400, 80);
    cy.get('[data-testid="slider-viewport"]').realMouseUp({ x: 400, y: 80 });
    selected(0);
    aligned('a');
    nav(1).click();
    selected(1);
    aligned('b');
  });

  it('discovers dynamic empty append reorder removal and repopulation with keyed DOM ownership', () => {
    const Dynamic = () => {
      const [cards, setCards] = React.useState<string[]>([]);
      return (
        <>
          <button onClick={() => setCards(['a', 'b', 'c'])}>Populate</button>
          <button onClick={() => setCards(['c', 'a', 'b', 'd'])}>Reorder and append</button>
          <button onClick={() => setCards(['a', 'd'])}>Remove cards</button>
          <button onClick={() => setCards([])}>Clear cards</button>
          <Fixture cards={cards} />
        </>
      );
    };
    mount(<Dynamic />);
    engine().should('contain.text', '"ids":[]').and('contain.text', '"count":0');
    cy.get('[role="tab"]').should('not.exist');
    cy.contains('button', 'Populate').click();
    engine().should('contain.text', '"ids":["slider-a","slider-b","slider-c"]').and('contain.text', '"count":3');
    card('a').then(elements => {
      const original = elements[0];
      cy.contains('button', 'Reorder and append').click();
      engine()
        .should('contain.text', '"ids":["slider-c","slider-a","slider-b","slider-d"]')
        .and('contain.text', '"count":4');
      card('a').then(current => expect(current[0]).to.equal(original));
    });
    aligned('c');
    nav(1).click();
    selected(1);
    aligned('a');
    nav(0).click();
    aligned('c');
    cy.contains('button', 'Remove cards').click();
    engine().should('contain.text', '"ids":["slider-a","slider-d"]').and('contain.text', '"count":2');
    aligned('a');
    cy.contains('button', 'Clear cards').click();
    engine().should('contain.text', '"ids":[]').and('contain.text', '"count":0');
    cy.contains('button', 'Populate').click();
    nav(2).click();
    selected(2);
    aligned('c');
  });

  it('remeasures changed card widths and token gaps then aligns the new physical page', () => {
    const Host = () => {
      const [compact, setCompact] = React.useState(false);
      return (
        <>
          <button onClick={() => setCompact(true)}>Change dimensions</button>
          <Fixture cards={['a', 'b', 'c', 'd']} groupSize="auto" cardWidth={compact ? 160 : 240} gap={compact} />
        </>
      );
    };
    mount(<Host />);
    engine().should('contain.text', '"groups":[[0,1],[2,3]]');
    cy.contains('button', 'Change dimensions').click();
    track().should('have.css', 'gap', teamsLightTheme.spacingHorizontalL);
    card('a').should(elements => expect(elements[0].getBoundingClientRect().width).to.equal(160));
    engine().should('contain.text', '"groups":[[0,1],[2,3]]');
    nav(1).click();
    selected(1);
    card('d').should(elements => {
      const viewport = elements[0].closest('.fui-CarouselViewport')!;
      expect(
        Math.abs(elements[0].getBoundingClientRect().right - viewport.getBoundingClientRect().right),
      ).to.be.lessThan(1);
    });
    engine().should('contain.text', '"ids":["slider-a","slider-b","slider-c","slider-d"]');
  });

  it('isolates sibling sliders focus contexts and physical engines', () => {
    mount(
      <>
        <Fixture prefix="left" sliderProps={{ cardFocus: true }} />
        <Fixture prefix="right" />
        <SliderContext id="outside-focus" />
      </>,
    );
    card('a', 'left').should('have.attr', 'tabindex', '0');
    card('a', 'right').should('not.have.attr', 'tabindex');
    cy.get('[data-testid="outside-focus"]').should('have.text', 'false');
    nav(1, 'left').click();
    aligned('b', 'ltr', 0, 480, 'left');
    aligned('a', 'ltr', 0, 480, 'right');
    selected(0, 'right');
    nav(2, 'right').click();
    aligned('c', 'ltr', 0, 480, 'right');
    selected(1, 'left');
  });

  it('characterizes inherited rejected controlled requests separating selected state from physical display', () => {
    const requests = cy.stub();
    const Host = () => {
      const [index, setIndex] = React.useState(0);
      return (
        <>
          <button onClick={() => setIndex(2)}>External page</button>
          <Fixture activeIndex={index} onActiveIndexChange={requests} />
        </>
      );
    };
    mount(<Host />);
    selected(0);
    aligned('a');
    nav(1).click();
    selected(0);
    engine().should('contain.text', '"index":0');
    aligned('b');
    cy.then(() => expect(requests.lastCall.args[1]).to.include({ type: 'click', index: 1 }));
    cy.contains('button', 'External page').click();
    selected(2);
    aligned('c');
  });

  it('characterizes inherited nested card discovery instead of claiming nested engine isolation', () => {
    mount(
      <Carousel data-testid="outer-root" style={{ width: 480 }} groupSize={1}>
        <CarouselViewport>
          <CarouselSlider data-testid="outer-track">
            <CarouselCard id="outer-a" style={{ height: 280 }}>
              <Fixture prefix="inner" width={240} cards={['a', 'b']} />
            </CarouselCard>
            <CarouselCard id="outer-b" style={{ height: 280 }}>
              Outer second
            </CarouselCard>
          </CarouselSlider>
        </CarouselViewport>
        <EngineContext prefix="outer" />
      </Carousel>,
    );
    engine('inner').should('contain.text', '"ids":["inner-a","inner-b"]').and('contain.text', '"count":2');
    engine('outer').should('contain.text', '"ids":["outer-a","inner-a","inner-b","outer-b"]');
    cy.get('[data-testid="outer-track"] > .fui-CarouselCard').should('have.length', 2);
    cy.get('[data-testid="outer-track"] .fui-CarouselCard').should('have.length', 4);
  });
});

describe('CarouselSlider documented contract', () => {
  it('forwards caller naming relationships native attributes and role overrides', () => {
    mount(
      <>
        <h2 id="slider-title">Featured cards</h2>
        <p id="slider-help">Choose a page below</p>
        <CarouselSlider
          id="named-track"
          role="list"
          aria-labelledby="slider-title"
          aria-describedby="slider-help"
          title="Native title"
          lang="fr"
          dir="rtl"
          data-native="preserved"
        />
      </>,
    );
    cy.get('#named-track')
      .should('have.attr', 'role', 'list')
      .and('have.attr', 'aria-labelledby', 'slider-title')
      .and('have.attr', 'aria-describedby', 'slider-help')
      .and('have.attr', 'title', 'Native title')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'data-native', 'preserved');
    cy.get('#slider-title').should('have.text', 'Featured cards');
    cy.get('#slider-help').should('have.text', 'Choose a page below');
  });

  for (const cardFocus of [false, true]) {
    it(`provides cardFocus ${cardFocus} to cards without leaking it as a native attribute`, () => {
      mount(
        <CarouselSlider data-testid="slider-track" cardFocus={cardFocus}>
          <CarouselCard data-testid="focus-card">Card</CarouselCard>
          <SliderContext />
        </CarouselSlider>,
      );
      cy.get('[data-testid="focus-context"]').should('have.text', String(cardFocus));
      track().should('not.have.attr', 'cardfocus');
      cy.get('[data-testid="focus-card"]').should(cardFocus ? 'have.attr' : 'not.have.attr', 'tabindex');
      if (cardFocus) {
        track().should(elements => {
          const value = JSON.parse(elements[0].getAttribute('data-tabster')!);
          expect(value.mover.direction).to.equal(2);
          expect(value.mover.cyclic).to.equal(false);
        });
      } else {
        track().should('not.have.attr', 'data-tabster');
      }
    });
  }

  it('preserves user classes inline styles and documented gap while overflow belongs to the enclosing viewport', () => {
    mount(<Fixture gap sliderProps={{ className: 'consumer-track', style: { gap: 24 }, title: 'Track' }} />);
    track()
      .should('have.class', 'consumer-track')
      .and('have.class', carouselSliderClassNames.root)
      .and('have.css', 'gap', '24px')
      .and('have.css', 'overflow-x', 'visible');
    cy.get('[data-testid="slider-viewport"]').should('have.css', 'overflow-x', 'visible');
    cy.get('[data-testid="slider-root"]').should('have.css', 'overflow-x', 'hidden');
    card('b').should(elements => {
      const previous = elements[0].previousElementSibling!;
      expect(elements[0].getBoundingClientRect().left - previous.getBoundingClientRect().right).to.equal(24);
    });
    nav(1).click();
    selected(1);
    aligned('b');
    track().should(elements => expect(elements[0].style.transform).to.contain('-504'));
  });

  for (const dark of [false, true]) {
    it(`uses elevated spacing from the ${dark ? 'dark' : 'light'} provider theme`, () => {
      mount(<Fixture appearance="elevated" />, 'ltr', dark);
      track().should('have.css', 'gap', (dark ? teamsDarkTheme : teamsLightTheme).spacingHorizontalXXL);
      nav(1).click();
      aligned('b');
      const gap = parseFloat((dark ? teamsDarkTheme : teamsLightTheme).spacingHorizontalXXL);
      track().should(elements => expect(elements[0].style.transform).to.contain(String(-(480 + gap))));
    });
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const motion of ['slide', { kind: 'slide', duration: 40 }, 'fade'] as const) {
      const name = typeof motion === 'string' ? motion : 'slide duration 40';
      it(`measures physical paging with ${name} motion in ${dir}`, () => {
        mount(<Fixture motion={motion} />, dir);
        selected(0);
        aligned('a', dir);
        nav(1).realClick();
        selected(1);
        if (motion === 'fade') {
          card('b').should(elements => {
            expect(elements[0].ownerDocument.defaultView!.getComputedStyle(elements[0]).opacity).to.equal('1');
          });
          card('a').should(elements => {
            expect(elements[0].ownerDocument.defaultView!.getComputedStyle(elements[0]).opacity).to.equal('0');
          });
          track().should(elements => expect(elements[0].style.transform).to.equal(''));
        } else {
          track().should(elements => {
            const value = new elements[0].ownerDocument.defaultView!.DOMMatrixReadOnly(elements[0].style.transform).m41;
            expect(Math.abs(value - (dir === 'ltr' ? -480 : 480))).to.be.lessThan(1);
          });
        }
        aligned('b', dir);
        nav(0).realClick();
        selected(0);
        aligned('a', dir);
      });
    }
  }

  for (const align of ['start', 'center', 'end'] as const) {
    for (const whitespace of [false, true]) {
      it(`measures partial card ${align} alignment with whitespace ${whitespace}`, () => {
        mount(<Fixture cards={['a', 'b', 'c', 'd', 'e']} cardWidth={240} align={align} whitespace={whitespace} />);
        engine().should('contain.text', '"ids":["slider-a","slider-b","slider-c","slider-d","slider-e"]');
        nav(2).click();
        selected(2);
        aligned('c', 'ltr', align === 'start' ? 0 : align === 'center' ? 120 : 240);
        card('c').should(elements => expect(elements[0].getBoundingClientRect().width).to.equal(240));
      });
    }
  }

  it('forwards registration through the Carousel root rather than claiming the slider ref owns Embla', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(<Fixture sliderRef={ref} />);
    engine()
      .should('contain.text', '"container":"slider-root"')
      .and('contain.text', '"viewport":"slider-viewport"')
      .and('contain.text', '"ids":["slider-a","slider-b","slider-c"]')
      .and('contain.text', '"groups":[[0],[1],[2]]')
      .and('contain.text', '"count":3');
    track().then(elements => expect(ref.current).to.equal(elements[0]));
    nav(2).click();
    selected(2);
    aligned('c');
  });

  it('reacts to actual root resize and regroups cards without duplicate discovery', () => {
    const Resize = () => {
      const [width, setWidth] = React.useState(480);
      return (
        <>
          <button onClick={() => setWidth(240)}>Resize root</button>
          <Fixture width={width} cardWidth={240} groupSize="auto" cards={['a', 'b', 'c', 'd']} />
        </>
      );
    };
    mount(<Resize />);
    engine().should('contain.text', '"groups":[[0,1],[2,3]]').and('contain.text', '"count":2');
    cy.contains('button', 'Resize root').click();
    engine()
      .should('contain.text', '"groups":[[0],[1],[2],[3]]')
      .and('contain.text', '"ids":["slider-a","slider-b","slider-c","slider-d"]')
      .and('contain.text', '"count":4');
    cy.get('[role="tab"]').should('have.length', 4);
    nav(2).click();
    selected(2);
    aligned('c', 'ltr', 0, 240);
  });
});
