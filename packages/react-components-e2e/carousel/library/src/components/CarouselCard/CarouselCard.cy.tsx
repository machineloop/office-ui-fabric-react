import 'cypress-real-events';
import * as React from 'react';
import { mergeClasses } from '@griffel/react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import { isHTMLElement, useIsomorphicLayoutEffect } from '@fluentui/react-utilities';
import {
  CarouselCard,
  carouselCardClassNames,
  useCarouselCard_unstable,
  useCarouselCardStyles_unstable,
  renderCarouselCard_unstable,
} from './index';
import type { CarouselCardProps } from './CarouselCard.types';
import { Carousel } from '../Carousel/Carousel';
import type { CarouselProps, CarouselUpdateData } from '../Carousel/Carousel.types';
import { CarouselViewport } from '../CarouselViewport/CarouselViewport';
import { CarouselSlider } from '../CarouselSlider/CarouselSlider';
import { CarouselNav } from '../CarouselNav/CarouselNav';
import { CarouselNavButton } from '../CarouselNavButton/CarouselNavButton';
import { CarouselProvider, carouselContextDefaultValue, useCarouselContext_unstable } from '../CarouselContext';
import { CarouselSliderContextProvider } from '../CarouselSlider/CarouselSliderContext';
import { EMBLA_VISIBILITY_EVENT, setTabsterDefault } from '../useEmblaCarousel';
import { useCardCoverageStyles } from './CarouselCard.cy.styles';

const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  mountBase(
    <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );

const ContextOutput = ({ prefix }: { prefix: string }) => {
  const activeIndex = useCarouselContext_unstable(ctx => ctx.activeIndex);
  const subscribe = useCarouselContext_unstable(ctx => ctx.subscribeForValues);
  const [data, setData] = React.useState<CarouselUpdateData>();
  useIsomorphicLayoutEffect(() => subscribe(setData), [subscribe]);
  return (
    <output data-testid={`${prefix}-context`}>
      {JSON.stringify({
        activeIndex,
        count: data?.navItemsCount,
        groups: data?.groupIndexList,
        ids: data?.slideNodes.map(node => node.id),
      })}
    </output>
  );
};

type FixtureProps = CarouselProps & {
  prefix?: string;
  cardFocus?: boolean;
  cards?: string[];
  cardProps?: CarouselCardProps & { 'data-value'?: string };
  gap?: boolean;
  margin?: boolean;
  children?: React.ReactNode;
};

const Fixture = ({
  prefix = 'card',
  cardFocus = false,
  cards = ['a', 'b', 'c'],
  cardProps,
  gap = false,
  margin = false,
  children,
  ...props
}: FixtureProps) => {
  const styles = useCardCoverageStyles();
  return (
    <Carousel
      aria-label={`${prefix} carousel`}
      data-testid={`${prefix}-carousel`}
      className={styles.root}
      groupSize={1}
      {...props}
    >
      <CarouselViewport data-testid={`${prefix}-viewport`}>
        <CarouselSlider cardFocus={cardFocus} className={gap ? styles.gap : undefined}>
          {cards.map((key, index) => (
            <CarouselCard
              key={key}
              id={`${prefix}-${key}`}
              aria-label={`${index + 1} of ${cards.length}`}
              data-testid={`${prefix}-${key}`}
              className={mergeClasses(styles.card, margin && styles.margin)}
              {...cardProps}
            >
              <button data-testid={`${prefix}-${key}-button`}>Action {key}</button>
              <a href={`#${prefix}-${key}`} data-testid={`${prefix}-${key}-link`}>
                Link {key}
              </a>
            </CarouselCard>
          ))}
        </CarouselSlider>
      </CarouselViewport>
      <CarouselNav aria-label={`${prefix} pages`}>
        {index => <CarouselNavButton aria-label={`Page ${index + 1}`} data-testid={`${prefix}-nav-${index}`} />}
      </CarouselNav>
      <ContextOutput prefix={prefix} />
      {children}
    </Carousel>
  );
};

const card = (key: string, prefix = 'card') => cy.get<HTMLDivElement>(`[data-testid="${prefix}-${key}"]`);
const nav = (index: number, prefix = 'card') => cy.get(`[data-testid="${prefix}-nav-${index}"]`);
const selected = (index: number, prefix = 'card') => nav(index, prefix).should('have.attr', 'aria-selected', 'true');
const aligned = (key: string, prefix = 'card') =>
  card(key, prefix).should(elements => {
    const viewport = elements[0].closest('.fui-CarouselViewport');
    expect(viewport, 'real viewport').not.to.equal(null);
    const rect = elements[0].getBoundingClientRect();
    const view = viewport!.getBoundingClientRect();
    expect(view.width, 'positive viewport width').to.equal(480);
    expect(rect.width, 'positive card width').to.be.greaterThan(0);
    expect(Math.abs(rect.left - view.left), 'settled left offset').to.be.lessThan(1);
  });

const dispatchVisibility = (element: HTMLElement, isVisible: boolean) => {
  const CustomEventConstructor = element.ownerDocument.defaultView!.CustomEvent;
  element.dispatchEvent(new CustomEventConstructor(EMBLA_VISIBILITY_EVENT, { detail: { isVisible } }));
};

describe('CarouselCard unit and source derived regressions', () => {
  it('forwards object refs to the actual root and nulls them on removal', () => {
    const ref = React.createRef<HTMLDivElement>();
    const RefFixture = () => {
      const [visible, setVisible] = React.useState(true);
      const [content, setContent] = React.useState('first');
      return (
        <>
          <button onClick={() => setContent('latest')}>Update content</button>
          <button onClick={() => setVisible(false)}>Remove root</button>
          {visible && (
            <CarouselCard ref={ref} data-testid="ref-root">
              {content}
            </CarouselCard>
          )}
        </>
      );
    };
    mount(<RefFixture />);
    cy.get('[data-testid="ref-root"]').then(elements => {
      const node = elements[0];
      expect(ref.current).to.equal(node);
      cy.contains('button', 'Update content').click();
      cy.get('[data-testid="ref-root"]')
        .should('have.text', 'latest')
        .then(current => {
          expect(current[0]).to.equal(node);
          expect(ref.current).to.equal(node);
        });
    });
    cy.contains('button', 'Remove root').click();
    cy.get('[data-testid="ref-root"]')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('updates callback refs without replacing the root and releases the old callback', () => {
    const oldRef = cy.stub();
    const latestRef = cy.stub();
    const CallbackRefs = () => {
      const [latest, setLatest] = React.useState(false);
      return (
        <>
          <button onClick={() => setLatest(true)}>Replace callback ref</button>
          <CarouselCard ref={latest ? latestRef : oldRef} data-testid="callback-root" />
        </>
      );
    };
    mount(<CallbackRefs />);
    cy.get('[data-testid="callback-root"]').then(elements => {
      const root = elements[0];
      expect(oldRef.lastCall.args[0]).to.equal(root);
      cy.contains('button', 'Replace callback ref').click();
      cy.get('[data-testid="callback-root"]').then(current => {
        expect(current[0]).to.equal(root);
        expect(oldRef.lastCall.args[0]).to.equal(null);
        expect(latestRef.lastCall.args[0]).to.equal(root);
      });
    });
  });

  it('root slot render functions preserve default attributes refs class and registration', () => {
    const ref = React.createRef<HTMLDivElement>();
    const render: SlotRenderFunction<React.ComponentPropsWithRef<'div'>> = (Component, props) => (
      <Component {...props} data-rendered="true">
        <strong>Rendered content</strong>
      </Component>
    );
    const RenderFixture = () => {
      const styles = useCardCoverageStyles();
      return (
        <Carousel className={styles.root}>
          <CarouselViewport>
            <CarouselSlider>
              <CarouselCard as="div" ref={ref} id="render-function" title="Native title">
                {render}
              </CarouselCard>
            </CarouselSlider>
          </CarouselViewport>
          <ContextOutput prefix="render" />
        </Carousel>
      );
    };
    mount(<RenderFixture />);
    cy.get('#render-function')
      .should('have.attr', 'role', 'tabpanel')
      .and('have.attr', 'data-rendered', 'true')
      .and('have.attr', 'title', 'Native title')
      .and('have.class', carouselCardClassNames.root)
      .and('have.text', 'Rendered content')
      .then(elements => expect(ref.current).to.equal(elements[0]));
    cy.get('[data-testid="render-context"]')
      .should('contain.text', '"ids":["render-function"]')
      .and('contain.text', '"count":1');
    cy.get('#render-function').should(elements => expect(elements[0].getBoundingClientRect().width).to.equal(480));
  });

  it('exported hook styles and renderer compose a real responsive root', () => {
    const Composed = () => {
      const state = useCarouselCard_unstable(
        { autoSize: true, 'aria-label': 'Composed', children: 'Composed content' },
        null,
      );
      useCarouselCardStyles_unstable(state);
      return renderCarouselCard_unstable(state);
    };
    mount(<Composed />);
    cy.get('.fui-CarouselCard')
      .should('have.attr', 'role', 'tabpanel')
      .and('have.attr', 'aria-label', 'Composed')
      .and('have.css', 'flex-basis', 'auto')
      .and('have.text', 'Composed content');
  });

  it('visibility events set aria-hidden and inert and do not bubble to a consumer ancestor', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const ancestor = cy.stub();
    const Events = () => {
      const parentRef = React.useRef<HTMLDivElement>(null);
      React.useEffect(() => {
        const parent = parentRef.current!;
        parent.addEventListener(EMBLA_VISIBILITY_EVENT, ancestor);
        return () => parent.removeEventListener(EMBLA_VISIBILITY_EVENT, ancestor);
      }, []);
      return (
        <div ref={parentRef}>
          <CarouselCard ref={rootRef} data-testid="event-card" />
        </div>
      );
    };
    mount(<Events />);
    cy.get('[data-testid="event-card"]').then(elements => dispatchVisibility(elements[0], false));
    cy.get('[data-testid="event-card"]').should('have.attr', 'aria-hidden', 'true').and('have.attr', 'inert');
    cy.get('[data-testid="event-card"]').then(elements => dispatchVisibility(elements[0], true));
    cy.get('[data-testid="event-card"]').should('have.attr', 'aria-hidden', 'false').and('not.have.attr', 'inert');
    cy.then(() => expect(ancestor).not.to.have.been.called);
  });

  it('removes the visibility listener from detached card nodes on unmount', () => {
    const Removed = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(false)}>Detach card</button>
          {visible && <CarouselCard data-testid="detach" />}
        </>
      );
    };
    mount(<Removed />);
    cy.get('[data-testid="detach"]').then(elements => {
      const node = elements[0];
      dispatchVisibility(node, false);
      expect(node.inert).to.equal(true);
      cy.contains('button', 'Detach card').click();
      cy.get('[data-testid="detach"]')
        .should('not.exist')
        .then(() => {
          dispatchVisibility(node, true);
          expect(node.isConnected).to.equal(false);
          expect(node.inert).to.equal(true);
          expect(node.getAttribute('aria-hidden')).to.equal('true');
        });
    });
  });

  it('cardFocus visibility events leave consumer ARIA unchanged and do not inert the card', () => {
    mount(
      <CarouselSliderContextProvider value={{ cardFocus: true }}>
        <CarouselCard aria-hidden="false" data-testid="group-card" />
      </CarouselSliderContextProvider>,
    );
    cy.get('[data-testid="group-card"]').then(elements => dispatchVisibility(elements[0], false));
    cy.get('[data-testid="group-card"]').should('have.attr', 'aria-hidden', 'false').and('not.have.attr', 'inert');
    cy.get('[data-testid="group-card"]').should('have.attr', 'tabindex', '0');
  });

  it('changing cardFocus back to false replaces the listener with the latest visibility policy', () => {
    const Policy = () => {
      const [focus, setFocus] = React.useState(true);
      return (
        <>
          <button onClick={() => setFocus(false)}>Banner policy</button>
          <CarouselSliderContextProvider value={{ cardFocus: focus }}>
            <CarouselCard data-testid="policy-card" />
          </CarouselSliderContextProvider>
        </>
      );
    };
    mount(<Policy />);
    cy.get('[data-testid="policy-card"]').then(elements => dispatchVisibility(elements[0], false));
    cy.get('[data-testid="policy-card"]').should('not.have.attr', 'inert');
    cy.contains('button', 'Banner policy').click();
    cy.get('[data-testid="policy-card"]').then(elements => dispatchVisibility(elements[0], false));
    cy.get('[data-testid="policy-card"]').should('have.attr', 'aria-hidden', 'true').and('have.attr', 'inert');
    cy.get('[data-testid="policy-card"]').then(elements => dispatchVisibility(elements[0], true));
    cy.get('[data-testid="policy-card"]').should('have.attr', 'aria-hidden', 'false').and('not.have.attr', 'inert');
  });

  it('setTabsterDefault preserves existing focusable and group metadata and ignores missing focusable state', () => {
    mount(
      <>
        <CarouselCard
          data-testid="tabster-present"
          data-tabster={JSON.stringify({ focusable: { excludeFromMover: true }, groupper: { tabbability: 1 } })}
        />
        <CarouselCard data-testid="tabster-absent" />
        <CarouselCard data-testid="tabster-group" data-tabster={JSON.stringify({ groupper: { tabbability: 1 } })} />
      </>,
    );
    cy.get('[data-testid="tabster-present"]').then(elements => {
      setTabsterDefault(elements[0], true);
      expect(JSON.parse(elements[0].getAttribute('data-tabster')!)).to.deep.equal({
        focusable: { excludeFromMover: true, isDefault: true },
        groupper: { tabbability: 1 },
      });
      setTabsterDefault(elements[0], false);
      expect(JSON.parse(elements[0].getAttribute('data-tabster')!).focusable.isDefault).to.equal(false);
    });
    cy.get('[data-testid="tabster-absent"]').then(elements => {
      setTabsterDefault(elements[0], true);
      expect(elements[0].hasAttribute('data-tabster')).to.equal(false);
    });
    cy.get('[data-testid="tabster-group"]').then(elements => {
      const original = elements[0].getAttribute('data-tabster');
      setTabsterDefault(elements[0], true);
      expect(elements[0].getAttribute('data-tabster')).to.equal(original);
    });
  });

  it('marks only the first card in the selected group as the Tabster default', () => {
    mount(
      <Fixture
        cardFocus
        cards={['a', 'b', 'c', 'd']}
        groupSize={2}
        cardProps={{ style: { flexBasis: 240, maxWidth: 240 } }}
      />,
    );
    selected(0);
    const defaults = (expected: boolean[]) =>
      cy.get('.fui-CarouselCard').should(elements => {
        expect(
          Array.from(elements, element => JSON.parse(element.getAttribute('data-tabster')!).focusable.isDefault),
        ).to.deep.equal(expected);
      });
    defaults([true, false, false, false]);
    nav(1).click();
    selected(1);
    defaults([false, false, true, false]);
    aligned('c');
  });

  it('cardFocus overrides consumer tabIndex while banner mode preserves it', () => {
    mount(
      <>
        <Fixture prefix="banner" cardProps={{ tabIndex: -1 }} />
        <Fixture prefix="group" cardFocus cardProps={{ tabIndex: -1 }} />
      </>,
    );
    card('a', 'banner').should('have.attr', 'tabindex', '-1');
    card('a', 'group').should('have.attr', 'tabindex', '0');
  });

  for (const prevented of [false, true]) {
    it(`consumer focus capture runs first and defaultPrevented=${prevented} gates internal selection`, () => {
      const select = cy.stub();
      const order: string[] = [];
      const context = {
        ...carouselContextDefaultValue,
        selectPageByElement: (event: React.FocusEvent, element: HTMLElement, jump?: boolean) => {
          order.push('internal');
          select(event.type, element.id, jump);
          return 0;
        },
      };
      mount(
        <CarouselProvider value={context}>
          <button data-testid="before-focus">Before</button>
          <CarouselCard
            id="focus-capture"
            tabIndex={0}
            onFocusCapture={event => {
              order.push('consumer');
              if (prevented) {
                event.preventDefault();
              }
            }}
          >
            Focus target
          </CarouselCard>
        </CarouselProvider>,
      );
      cy.get('[data-testid="before-focus"]').focus().realPress('Tab');
      cy.get('#focus-capture').should('be.focused');
      cy.then(() => {
        expect(order).to.deep.equal(prevented ? ['consumer'] : ['consumer', 'internal']);
        if (prevented) {
          expect(select).not.to.have.been.called;
        } else {
          expect(select).to.have.been.calledOnceWith('focus', 'focus-capture', false);
        }
      });
    });
  }

  it('pointer focus is consumed once and pointerup restores subsequent keyboard selection', () => {
    const select = cy.stub().returns(0);
    const down = cy.stub();
    const up = cy.stub();
    mount(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByElement: select }}>
        <button data-testid="before-pointer">Before</button>
        <CarouselCard id="pointer-root" tabIndex={0} onPointerDown={down} onPointerUp={up}>
          Pointer target
        </CarouselCard>
      </CarouselProvider>,
    );
    cy.get('#pointer-root').realClick().should('be.focused');
    cy.then(() => {
      expect(down).to.have.been.calledOnce;
      expect(up).to.have.been.calledOnce;
      expect(select).not.to.have.been.called;
    });
    cy.get('[data-testid="before-pointer"]').focus().realPress('Tab');
    cy.get('#pointer-root').should('be.focused');
    cy.then(() => expect(select).to.have.been.calledOnce);
  });

  it('reads latest focus and pointer callbacks context selector and container ref after rerender', () => {
    const calls = cy.stub();
    const firstScroll = cy.stub();
    const latestScroll = cy.stub();
    const Latest = () => {
      const [version, setVersion] = React.useState('first');
      const firstContainer = React.useRef<HTMLDivElement>(null);
      const latestContainer = React.useRef<HTMLDivElement>(null);
      useIsomorphicLayoutEffect(() => {
        firstContainer.current!.scrollTo = firstScroll;
        latestContainer.current!.scrollTo = latestScroll;
      }, []);
      return (
        <>
          <button onClick={() => setVersion('latest')}>Update callbacks</button>
          <button data-testid="before-latest">Before target</button>
          <div ref={firstContainer} />
          <div ref={latestContainer} />
          <CarouselProvider
            value={{
              ...carouselContextDefaultValue,
              containerRef: version === 'first' ? firstContainer : latestContainer,
              selectPageByElement: (event, element, jump) => {
                calls(version, 'select', event.type, element.id, jump);
                return 0;
              },
            }}
          >
            <CarouselCard
              id="latest-root"
              tabIndex={0}
              onFocusCapture={() => calls(version, 'focus')}
              onPointerDown={() => calls(version, 'down')}
              onPointerUp={() => calls(version, 'up')}
            >
              Latest target
            </CarouselCard>
          </CarouselProvider>
        </>
      );
    };
    mount(<Latest />);
    cy.contains('button', 'Update callbacks').click();
    cy.get('#latest-root').realClick().should('be.focused');
    cy.get('[data-testid="before-latest"]').focus().realPress('Tab');
    cy.get('#latest-root').should('be.focused');
    cy.then(() => {
      expect(calls.getCalls().map(call => call.args)).to.deep.equal([
        ['latest', 'down'],
        ['latest', 'focus'],
        ['latest', 'up'],
        ['latest', 'focus'],
        ['latest', 'select', 'focus', 'latest-root', false],
      ]);
      expect(firstScroll).not.to.have.been.called;
      expect(latestScroll).to.have.been.calledOnceWith(0, 0);
    });
  });
});

describe('CarouselCard additional source integration', () => {
  it('delivers actual engine visibility events to consumer refs as the card becomes visible', () => {
    const visibility: boolean[] = [];
    const nodeRef: { current: HTMLDivElement | null } = { current: null };
    const Consumer = () => {
      const styles = useCardCoverageStyles();
      const listener = React.useCallback((event: Event) => {
        if (event instanceof CustomEvent) {
          visibility.push(event.detail.isVisible);
        }
      }, []);
      const ref = React.useCallback(
        (node: HTMLDivElement | null) => {
          if (nodeRef.current) {
            nodeRef.current.removeEventListener(EMBLA_VISIBILITY_EVENT, listener);
          }
          nodeRef.current = node;
          node?.addEventListener(EMBLA_VISIBILITY_EVENT, listener);
        },
        [listener],
      );
      return (
        <Carousel className={styles.root} groupSize={1}>
          <CarouselViewport>
            <CarouselSlider>
              <CarouselCard id="event-first" className={styles.card}>
                First
              </CarouselCard>
              <CarouselCard ref={ref} id="event-second" className={styles.card}>
                Second
              </CarouselCard>
            </CarouselSlider>
          </CarouselViewport>
          <CarouselNav>{index => <CarouselNavButton aria-label={`Event page ${index}`} />}</CarouselNav>
        </Carousel>
      );
    };
    mount(<Consumer />);
    cy.get('#event-second')
      .should('have.attr', 'aria-hidden', 'true')
      .then(() => expect(visibility).to.include(false));
    cy.get('[aria-label="Event page 1"]').click();
    cy.get('#event-second')
      .should('have.attr', 'aria-hidden', 'false')
      .then(elements => {
        expect(nodeRef.current).to.equal(elements[0]);
        expect(visibility[visibility.length - 1]).to.equal(true);
      });
  });

  it('reacts to changing child size and autoSize without replacing the registered card', () => {
    const Responsive = () => {
      const styles = useCardCoverageStyles();
      const [width, setWidth] = React.useState(160);
      const [autoSize, setAutoSize] = React.useState(true);
      return (
        <>
          <button onClick={() => setWidth(240)}>Grow content</button>
          <button onClick={() => setAutoSize(false)}>Full size</button>
          <Carousel className={styles.root}>
            <CarouselViewport>
              <CarouselSlider cardFocus>
                <CarouselCard autoSize={autoSize} id="resized">
                  <div style={{ width, height: 100 }}>Resizable</div>
                </CarouselCard>
              </CarouselSlider>
            </CarouselViewport>
            <ContextOutput prefix="resized" />
          </Carousel>
        </>
      );
    };
    mount(<Responsive />);
    cy.get('#resized')
      .should(elements => expect(elements[0].getBoundingClientRect().width).to.equal(160))
      .then(elements => {
        const original = elements[0];
        cy.contains('button', 'Grow content').click();
        cy.get('#resized').should(current => {
          expect(current[0]).to.equal(original);
          expect(current[0].getBoundingClientRect().width).to.equal(240);
        });
        cy.contains('button', 'Full size').click();
        cy.get('#resized').should(current => {
          expect(current[0]).to.equal(original);
          expect(current[0].getBoundingClientRect().width).to.equal(480);
        });
      });
    cy.get('[data-testid="resized-context"]')
      .should('contain.text', '"ids":["resized"]')
      .and('contain.text', '"count":1');
  });

  it('uses token margins for measurable card gutters in a circular partial-card layout', () => {
    mount(
      <Fixture
        circular
        cardFocus
        margin
        cards={['a', 'b', 'c', 'd', 'e', 'f']}
        cardProps={{ style: { flexBasis: 160, maxWidth: 160 } }}
      />,
    );
    selected(0);
    card('a').should('have.css', 'margin-right', teamsLightTheme.spacingHorizontalM);
    cy.get('.fui-CarouselCard').should(elements => {
      const first = elements[0].getBoundingClientRect();
      const second = elements[1].getBoundingClientRect();
      expect(first.width).to.equal(160);
      expect(second.width).to.equal(160);
      expect(second.left - first.right).to.equal(parseFloat(teamsLightTheme.spacingHorizontalM));
    });
    cy.get('[data-testid="card-context"]').should('contain.text', '"count":6');
  });

  for (const prevented of [false, true]) {
    it(`pointerdown defaultPrevented=${prevented} controls whether a later focus is treated as mouse focus`, () => {
      const select = cy.stub().returns(0);
      const down = cy.stub();
      mount(
        <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByElement: select }}>
          <button data-testid="before-down">Before target</button>
          <CarouselCard
            id="down-root"
            tabIndex={0}
            onPointerDown={event => {
              down(event.defaultPrevented);
              if (prevented) {
                event.preventDefault();
              }
            }}
          >
            Pointer target
          </CarouselCard>
        </CarouselProvider>,
      );
      cy.get('#down-root').trigger('pointerdown', { pointerType: 'mouse' });
      cy.get('[data-testid="before-down"]').focus().realPress('Tab');
      cy.get('#down-root').should('be.focused');
      cy.get('#down-root').trigger('pointerup', { pointerType: 'mouse' });
      cy.then(() => {
        expect(down).to.have.been.calledOnceWith(false);
        if (prevented) {
          expect(select).to.have.been.calledOnce;
        } else {
          expect(select).not.to.have.been.called;
        }
      });
    });
  }
});

describe('CarouselCard pointer release cancellation', () => {
  for (const prevented of [false, true]) {
    it(`pointerup defaultPrevented=${prevented} preserves or clears the pending mouse focus marker`, () => {
      const select = cy.stub().returns(0);
      const up = cy.stub();
      mount(
        <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByElement: select }}>
          <button data-testid="before-up">Before target</button>
          <CarouselCard
            id="up-root"
            tabIndex={0}
            onPointerUp={event => {
              up(event.defaultPrevented);
              if (prevented) {
                event.preventDefault();
              }
            }}
          >
            Pointer target
          </CarouselCard>
        </CarouselProvider>,
      );
      cy.get('#up-root')
        .trigger('pointerdown', { pointerType: 'mouse' })
        .trigger('pointerup', { pointerType: 'mouse' });
      cy.get('[data-testid="before-up"]').focus().realPress('Tab');
      cy.get('#up-root').should('be.focused');
      cy.then(() => {
        expect(up).to.have.been.calledOnceWith(false);
        expect(select.callCount).to.equal(prevented ? 0 : 1);
      });
      cy.get('[data-testid="before-up"]').focus().realPress('Tab');
      cy.get('#up-root').should('be.focused');
      cy.then(() => expect(select.callCount).to.equal(prevented ? 1 : 2));
    });
  }
});

describe('CarouselCard documented API and stories', () => {
  it('renders a passive div tabpanel with arbitrary content and no invented slide metadata', () => {
    mount(
      <CarouselCard data-testid="standalone">
        Text <strong>nested content</strong>
      </CarouselCard>,
    );
    cy.get('[data-testid="standalone"]')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'tabpanel')
      .and('have.class', carouselCardClassNames.root)
      .and('contain.text', 'Text nested content')
      .should(elements => {
        for (const attr of ['tabindex', 'aria-roledescription', 'aria-label', 'aria-selected', 'aria-posinset']) {
          expect(elements[0].hasAttribute(attr), attr).to.equal(false);
        }
      });
  });

  it('renders empty and null children without manufacturing content or controls', () => {
    mount(
      <>
        <CarouselCard data-testid="empty" />
        <CarouselCard data-testid="null">{null}</CarouselCard>
      </>,
    );
    cy.get('.fui-CarouselCard').should('have.length', 2).and('be.empty');
    cy.get('.fui-CarouselCard button').should('not.exist');
  });

  it('generates unique ids stable across rerenders and preserves an explicit native id', () => {
    const Ids = () => {
      const [count, setCount] = React.useState(0);
      return (
        <>
          <button onClick={() => setCount(count + 1)}>Update ids</button>
          <CarouselCard data-testid="generated-a">{count}</CarouselCard>
          <CarouselCard data-testid="generated-b" />
          <CarouselCard id="consumer-id" data-testid="explicit" />
        </>
      );
    };
    mount(<Ids />);
    cy.get('.fui-CarouselCard').then(elements => {
      const ids = Array.from(elements, element => element.id);
      expect(ids[0]).to.match(/^fui-CarouselCard/);
      expect(new Set(ids).size).to.equal(3);
      cy.contains('button', 'Update ids').click();
      cy.get('[data-testid="generated-a"]').should('have.text', '1');
      cy.get('.fui-CarouselCard').should(current => {
        expect(Array.from(current, element => element.id)).to.deep.equal(ids);
      });
    });
    cy.get('[data-testid="explicit"]').should('have.attr', 'id', 'consumer-id');

    const ref = React.createRef<HTMLDivElement>();
    const DynamicId = () => {
      const styles = useCardCoverageStyles();
      const [id, setId] = React.useState('dynamic-first');
      const [added, setAdded] = React.useState(false);
      const [removed, setRemoved] = React.useState(false);
      const ids = [...(removed ? [] : [id]), 'dynamic-stable', ...(added ? ['dynamic-added'] : [])];
      return (
        <>
          <button onClick={() => setId('dynamic-latest')}>Rename native id</button>
          <button onClick={() => setAdded(true)}>Add after rename</button>
          <button onClick={() => setRemoved(true)}>Remove renamed card</button>
          <Carousel className={styles.root} aria-label="Dynamic ids" groupSize={1}>
            <CarouselViewport>
              <CarouselSlider cardFocus>
                {!removed && (
                  <CarouselCard
                    ref={ref}
                    id={id}
                    data-testid="dynamic-root"
                    data-value={id}
                    aria-labelledby="dynamic-title"
                    aria-roledescription="slide"
                  >
                    <h2 id="dynamic-title">Current card</h2>
                  </CarouselCard>
                )}
                <CarouselCard id="dynamic-stable" aria-label="Stable card" />
                {added && <CarouselCard id="dynamic-added" aria-label="Added card" />}
              </CarouselSlider>
            </CarouselViewport>
            <CarouselNav aria-label="Dynamic pages">
              {index => (
                <CarouselNavButton
                  aria-label={`Dynamic page ${index + 1}`}
                  aria-controls={ids[index]}
                  data-testid={`dynamic-page-${index}`}
                />
              )}
            </CarouselNav>
            <ContextOutput prefix="dynamic" />
          </Carousel>
        </>
      );
    };
    mount(<DynamicId />);
    cy.get('[data-testid="dynamic-context"]')
      .should('contain.text', '"ids":["dynamic-first","dynamic-stable"]')
      .and('contain.text', '"count":2');
    cy.get('[data-testid="dynamic-page-0"]').should('have.attr', 'aria-controls', 'dynamic-first');
    cy.get<HTMLDivElement>('[data-testid="dynamic-root"]')
      .should('have.attr', 'id', 'dynamic-first')
      .and('have.attr', 'role', 'tabpanel')
      .and('have.attr', 'data-value', 'dynamic-first')
      .then(elements => {
        const original = elements[0];
        expect(ref.current, 'initial forwarded ref').to.equal(original);
        cy.contains('button', 'Rename native id').click();
        cy.get<HTMLDivElement>('[data-testid="dynamic-root"]')
          .should('have.attr', 'id', 'dynamic-latest')
          .and('have.attr', 'data-value', 'dynamic-latest')
          .and('have.attr', 'aria-labelledby', 'dynamic-title')
          .and('have.attr', 'aria-roledescription', 'slide')
          .should(current => {
            expect(current[0], 'same root after native id update').to.equal(original);
            expect(ref.current, 'same forwarded ref').to.equal(original);
            expect(original.ownerDocument.getElementById('dynamic-first'), 'old id is absent').to.equal(null);
          });
        cy.get('#dynamic-title').should('have.text', 'Current card');
        cy.get('[data-testid="dynamic-page-0"]').should('have.attr', 'aria-controls', 'dynamic-latest');
        cy.get('.fui-CarouselCard').should('have.length', 2);
        cy.contains('button', 'Add after rename').click();
        cy.get('[data-testid="dynamic-context"]')
          .should('contain.text', '"ids":["dynamic-latest","dynamic-stable","dynamic-added"]')
          .and('contain.text', '"count":3')
          .and('contain.text', '"groups":[[0],[1],[2]]');
        cy.get('#dynamic-stable').focus();
        cy.get('[data-testid="dynamic-page-1"]').should('have.attr', 'aria-selected', 'true');
        cy.contains('button', 'Remove renamed card').click();
        cy.get('[data-testid="dynamic-root"]')
          .should('not.exist')
          .then(() => {
            expect(ref.current, 'removed ref is detached').to.equal(null);
            expect(original.isConnected, 'removed root is disconnected').to.equal(false);
          });
        cy.get('[data-testid="dynamic-context"]')
          .should('contain.text', '"ids":["dynamic-stable","dynamic-added"]')
          .and('contain.text', '"count":2');
        cy.get('#dynamic-stable').focus();
        cy.get('[data-testid="dynamic-page-0"]')
          .should('have.attr', 'aria-controls', 'dynamic-stable')
          .and('have.attr', 'aria-selected', 'true');
      });
  });

  it('forwards native naming descriptions roledescription language and data attributes', () => {
    mount(
      <>
        <h2 id="card-title">Travel collection</h2>
        <p id="card-description">Three destinations</p>
        <CarouselCard
          role="group"
          aria-labelledby="card-title"
          aria-describedby="card-description"
          aria-roledescription="slide"
          title="Consumer title"
          lang="fr"
          dir="rtl"
          data-testid="native"
          data-value="consumer-value"
        />
      </>,
    );
    cy.get('[data-testid="native"]')
      .should('have.attr', 'role', 'group')
      .and('have.attr', 'aria-labelledby', 'card-title')
      .and('have.attr', 'aria-describedby', 'card-description')
      .and('have.attr', 'aria-roledescription', 'slide')
      .and('have.attr', 'title', 'Consumer title')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'data-value', 'consumer-value');
    cy.get('#card-title').should('have.text', 'Travel collection');
    cy.get('#card-description').should('have.text', 'Three destinations');
  });

  for (const autoSize of [undefined, false]) {
    it(`fills the actual viewport with default sizing autoSize=${String(autoSize)}`, () => {
      mount(<Fixture cardProps={{ autoSize }} />);
      selected(0);
      aligned('a');
      card('a').should('have.css', 'flex-basis', '100%').and('have.css', 'max-width', '100%');
      cy.get('.fui-CarouselCard').should(elements => {
        const rects = Array.from(elements, element => element.getBoundingClientRect());
        expect(rects.map(rect => rect.width)).to.deep.equal([480, 480, 480]);
        expect(rects[1].left - rects[0].left).to.equal(480);
        expect(rects[2].left - rects[0].left).to.equal(960);
      });
      nav(2).click();
      selected(2);
      aligned('c');
    });
  }

  it('autoSize uses intrinsic child width and caps oversized content at the viewport', () => {
    const Sized = () => {
      const styles = useCardCoverageStyles();
      return (
        <Carousel className={styles.root}>
          <CarouselViewport>
            <CarouselSlider cardFocus>
              {[160, 240, 640].map(width => (
                <CarouselCard autoSize key={width} data-testid={`size-${width}`}>
                  <div style={{ width, height: 100 }}>Content {width}</div>
                </CarouselCard>
              ))}
            </CarouselSlider>
          </CarouselViewport>
        </Carousel>
      );
    };
    mount(<Sized />);
    for (const [width, expected] of [
      [160, 160],
      [240, 240],
      [640, 480],
    ]) {
      cy.get(`[data-testid="size-${width}"]`)
        .should('have.css', 'flex-basis', 'auto')
        .and('have.css', 'min-width', '0px')
        .should(elements => expect(elements[0].getBoundingClientRect().width).to.equal(expected));
    }
  });

  it('consumer CSS widths and token gutters determine actual card positions', () => {
    mount(<Fixture cardFocus gap cardProps={{ style: { flexBasis: 200, maxWidth: 200 } }} />);
    selected(0);
    cy.get('.fui-CarouselSlider').should('have.css', 'column-gap', teamsLightTheme.spacingHorizontalM);
    cy.get('.fui-CarouselCard').should(elements => {
      const rects = Array.from(elements, element => element.getBoundingClientRect());
      expect(rects.map(rect => rect.width)).to.deep.equal([200, 200, 200]);
      expect(rects[1].left - rects[0].left).to.equal(200 + parseFloat(teamsLightTheme.spacingHorizontalM));
      expect(rects[2].left - rects[1].left).to.equal(200 + parseFloat(teamsLightTheme.spacingHorizontalM));
    });
  });

  it('registers cards by DOM order not the lexical value of consumer ids or data values', () => {
    mount(<Fixture cards={['z', 'a', 'm']} defaultActiveIndex={1} cardProps={{ 'data-value': 'not-an-index' }} />);
    selected(1);
    aligned('a');
    cy.get('[data-testid="card-context"]')
      .should('contain.text', '"ids":["card-z","card-a","card-m"]')
      .and('contain.text', '"groups":[[0],[1],[2]]');
    nav(2).click();
    selected(2);
    aligned('m');
  });

  it('responds to accepted controlled navigation with visible content and real geometry', () => {
    const Controlled = () => {
      const [index, setIndex] = React.useState(0);
      return <Fixture activeIndex={index} onActiveIndexChange={(_, data) => setIndex(data.index)} />;
    };
    mount(<Controlled />);
    selected(0);
    nav(1).click();
    selected(1);
    aligned('b');
    card('b').should('have.attr', 'aria-hidden', 'false').and('not.have.attr', 'inert');
    card('a').should('have.attr', 'aria-hidden', 'true').and('have.attr', 'inert');
  });

  for (const dark of [false, true]) {
    for (const appearance of ['flat', 'elevated'] as const) {
      it(`inherits ${appearance} appearance from Carousel in the ${dark ? 'dark' : 'light'} theme`, () => {
        mount(<Fixture appearance={appearance} />, 'ltr', dark);
        selected(0);
        const theme = dark ? teamsDarkTheme : teamsLightTheme;
        if (appearance === 'elevated') {
          card('a')
            .should('have.css', 'border-radius', theme.borderRadiusXLarge)
            .and('have.css', 'overflow', 'hidden')
            .and('not.have.css', 'box-shadow', 'none');
        } else {
          card('a').should('have.css', 'border-radius', '0px').and('have.css', 'box-shadow', 'none');
        }
        cy.get('.fui-CarouselSlider').should(
          'have.css',
          'column-gap',
          appearance === 'elevated' ? theme.spacingHorizontalXXL : 'normal',
        );
      });
    }
  }

  it('preserves consumer class precedence over elevated card styling', () => {
    const Override = () => {
      const styles = useCardCoverageStyles();
      return <Fixture appearance="elevated" cardProps={{ className: styles.override }} />;
    };
    mount(<Override />);
    card('a')
      .should('have.css', 'border-radius', teamsLightTheme.borderRadiusSmall)
      .and('have.css', 'box-shadow', 'none')
      .and('have.css', 'overflow', 'visible');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`positions and navigates full width cards in ${dir.toUpperCase()} context`, () => {
      mount(<Fixture />, dir);
      selected(0);
      aligned('a');
      cy.get('.fui-CarouselCard').should(elements => {
        const first = elements[0].getBoundingClientRect();
        const second = elements[1].getBoundingClientRect();
        expect(second.left - first.left).to.equal(dir === 'rtl' ? -480 : 480);
      });
      nav(1).click();
      selected(1);
      aligned('b');
    });
  }

  it('keeps multiple arbitrary interactive children inside a single registered card', () => {
    mount(<Fixture cards={['a']} />);
    cy.get('[data-testid="card-context"]').should('contain.text', '"ids":["card-a"]').and('contain.text', '"count":1');
    card('a').find('button').should('have.length', 1);
    card('a').find('a').should('have.attr', 'href', '#card-a');
    card('a').should('have.attr', 'aria-label', '1 of 1').and('not.have.attr', 'aria-roledescription');
  });
});

describe('CarouselCard edges and accessibility', () => {
  it('exposes the active banner and hides and inerts offscreen banners after navigation', () => {
    mount(<Fixture />);
    selected(0);
    card('a').should('have.attr', 'aria-hidden', 'false').and('not.have.attr', 'inert');
    card('b').should('have.attr', 'aria-hidden', 'true').and('have.attr', 'inert');
    card('c').should('have.attr', 'aria-hidden', 'true').and('have.attr', 'inert');
    nav(2).click();
    selected(2);
    aligned('c');
    card('c').should('have.attr', 'aria-hidden', 'false').and('not.have.attr', 'inert');
    card('a').should('have.attr', 'aria-hidden', 'true').and('have.attr', 'inert');
  });

  it('native Tab reaches active consumer button and link then skips inactive descendants', () => {
    mount(
      <>
        <button data-testid="before">Before carousel</button>
        <Fixture />
      </>,
    );
    card('c').should('have.attr', 'inert');
    cy.get('[data-testid="before"]').focus().realPress('Tab');
    cy.get('[data-testid="card-a-button"]').should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-testid="card-a-link"]').should('be.focused');
    cy.realPress('Tab');
    nav(0).should('be.focused');
    cy.get('[data-testid="card-b-button"]').should('not.be.focused');
    cy.get('[data-testid="card-c-link"]').should('not.be.focused');
    nav(1).click();
    aligned('b');
    card('b').should('not.have.attr', 'inert');
    cy.get('[data-testid="before"]').focus().realPress('Tab');
    cy.get('[data-testid="card-b-button"]').should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-testid="card-b-link"]').should('be.focused');
    cy.realPress('Tab');
    nav(1).should('be.focused');
  });

  it('characterizes runtime reverse-Tab selecting an inert last card and losing focus', () => {
    // Unresolved Electron/Cypress/Tabster focus loss, not intended behavior; cause is unconfirmed.
    mount(
      <>
        <button data-testid="before-reverse">Before carousel</button>
        <Fixture />
      </>,
    );
    card('b').should('have.attr', 'inert');
    card('c').should('have.attr', 'inert');
    nav(0).focus().should('be.focused').realPress(['Shift', 'Tab']);
    selected(2);
    aligned('c');
    cy.document().should(doc => expect(doc.activeElement).to.equal(doc.body));
    card('c').should('not.have.attr', 'inert');
    cy.get('[data-testid="before-reverse"]').focus().realPress('Tab');
    cy.get('[data-testid="card-c-button"]').should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-testid="card-c-link"]').should('be.focused');
  });

  it('visible consumer buttons and links retain real click callbacks without Card selection state', () => {
    const buttonClick = cy.stub();
    const linkClick = cy.stub();
    const Content = () => {
      const styles = useCardCoverageStyles();
      return (
        <Carousel className={styles.root}>
          <CarouselViewport>
            <CarouselSlider>
              <CarouselCard aria-label="Actions" data-testid="actions">
                <button onClick={buttonClick}>Consumer action</button>
                <a
                  href="#consumer-action"
                  onClick={event => {
                    event.preventDefault();
                    linkClick(event.type);
                  }}
                >
                  Consumer link
                </a>
                <button disabled>Disabled consumer action</button>
              </CarouselCard>
            </CarouselSlider>
          </CarouselViewport>
        </Carousel>
      );
    };
    mount(<Content />);
    cy.contains('button', 'Consumer action').realClick();
    cy.contains('a', 'Consumer link').realClick();
    cy.contains('button', 'Disabled consumer action').should('be.disabled');
    cy.then(() => {
      expect(buttonClick).to.have.been.calledOnce;
      expect(linkClick).to.have.been.calledOnceWith('click');
    });
    cy.get('[data-testid="actions"]').should(elements => {
      expect(elements[0].hasAttribute('aria-selected')).to.equal(false);
      expect(elements[0].hasAttribute('aria-pressed')).to.equal(false);
    });
  });

  it('clicking passive card content does not invent an onActiveIndexChange selection action', () => {
    const click = cy.stub();
    const changes = cy.stub();
    mount(<Fixture onActiveIndexChange={changes} cardProps={{ onClick: click }} />);
    aligned('a');
    card('a').realClick({ x: 300, y: 80 });
    cy.then(() => {
      expect(click).to.have.been.calledOnce;
      expect(changes).not.to.have.been.called;
    });
  });

  it('cardFocus exposes offscreen cards as limited Tabster groups instead of inert banners', () => {
    mount(<Fixture cardFocus />);
    selected(0);
    cy.get('.fui-CarouselCard').should(elements => {
      for (const element of Array.from(elements)) {
        expect(element.tabIndex).to.equal(0);
        expect(element.inert).to.equal(false);
        expect(element.hasAttribute('aria-hidden')).to.equal(false);
        const attrs = JSON.parse(element.getAttribute('data-tabster')!);
        expect(attrs.groupper).to.deep.equal({ tabbability: 1 });
        expect(attrs.focusable).to.exist;
      }
    });
    card('c').focus().should('be.focused');
    selected(2);
    aligned('c');
  });

  it('Enter explores consumer children and Escape returns to a cardFocus root', () => {
    mount(<Fixture cardFocus />);
    card('a').focus().realPress('Enter');
    cy.get('[data-testid="card-a-button"]').should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-testid="card-a-link"]').should('be.focused');
    cy.realPress('Escape');
    card('a').should('be.focused');
    cy.realPress('Tab');
    nav(0).should('be.focused');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`arrow navigation moves cardFocus roots and real geometry in ${dir.toUpperCase()}`, () => {
      const changes = cy.stub();
      mount(
        <Fixture
          cardFocus
          onActiveIndexChange={(event, data) =>
            changes(event, data, isHTMLElement(event.currentTarget) ? event.currentTarget.id : undefined)
          }
        />,
        dir,
      );
      card('a').focus();
      selected(0);
      cy.realPress(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
      card('b').should('be.focused');
      selected(1);
      aligned('b');
      cy.then(() => {
        const data = changes.lastCall.args[1];
        expect(data.type).to.equal('focus');
        expect(data.index).to.equal(1);
        expect(data.event).to.equal(changes.lastCall.args[0]);
        expect(changes.lastCall.args[2]).to.equal('card-b');
      });
      cy.realPress(dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
      card('a').should('be.focused');
      selected(0);
      aligned('a');
    });
  }

  it('keeps peeked and offscreen partial cards accessible with cardFocus enabled', () => {
    mount(<Fixture cardFocus gap cardProps={{ style: { flexBasis: 200, maxWidth: 200 } }} />);
    cy.get('.fui-CarouselCard').should(elements => {
      const viewport = elements[0].closest('.fui-CarouselViewport')!.getBoundingClientRect();
      const last = elements[2].getBoundingClientRect();
      expect(last.left).to.be.lessThan(viewport.right);
      expect(last.right).to.be.greaterThan(viewport.right);
      for (const element of Array.from(elements)) {
        expect(element.inert).to.equal(false);
        expect(element.tabIndex).to.equal(0);
      }
    });
    card('a').focus().realPress('ArrowRight');
    card('b').should('be.focused');
    cy.realPress('ArrowRight');
    card('c').should('be.focused');
    selected(2);
    card('c').should(elements => {
      const rect = elements[0].getBoundingClientRect();
      const viewport = elements[0].closest('.fui-CarouselViewport')!.getBoundingClientRect();
      expect(rect.left).to.be.at.least(viewport.left - 1);
      expect(rect.right).to.be.at.most(viewport.right + 1);
    });
  });

  it('adds removes and reorders keyed cards using current DOM registration and preserves refs', () => {
    const Dynamic = () => {
      const [keys, setKeys] = React.useState(['a', 'b', 'c']);
      return (
        <>
          <button onClick={() => setKeys(['a', 'b', 'c', 'd'])}>Add card</button>
          <button onClick={() => setKeys(['a', 'c', 'd'])}>Remove card</button>
          <button onClick={() => setKeys(['d', 'a', 'c'])}>Reorder cards</button>
          <Fixture cards={keys} cardFocus />
        </>
      );
    };
    mount(<Dynamic />);
    cy.get('[data-testid="card-context"]').should('contain.text', '"ids":["card-a","card-b","card-c"]');
    card('a').then(elements => {
      const original = elements[0];
      cy.contains('button', 'Add card').click();
      cy.get('[data-testid="card-context"]')
        .should('contain.text', '"ids":["card-a","card-b","card-c","card-d"]')
        .and('contain.text', '"count":4');
      card('d').focus();
      selected(3);
      aligned('d');
      cy.contains('button', 'Remove card').click();
      cy.get('[data-testid="card-context"]')
        .should('contain.text', '"ids":["card-a","card-c","card-d"]')
        .and('contain.text', '"count":3');
      card('b').should('not.exist');
      cy.contains('button', 'Reorder cards').click();
      cy.get('[data-testid="card-context"]')
        .should('contain.text', '"ids":["card-d","card-a","card-c"]')
        .and('contain.text', '"groups":[[0],[1],[2]]');
      card('a').should(current => expect(current[0]).to.equal(original));
      card('a').focus();
      selected(1);
      aligned('a');
      card('a').should('have.attr', 'aria-label', '2 of 3');
    });
  });

  it('supports zero to one to zero cards without leaving registered ghost slides', () => {
    const Empty = () => {
      const [cards, setCards] = React.useState<string[]>([]);
      return (
        <>
          <button onClick={() => setCards(['a'])}>Populate</button>
          <button onClick={() => setCards([])}>Empty</button>
          <Fixture cards={cards} />
        </>
      );
    };
    mount(<Empty />);
    cy.get('.fui-CarouselCard').should('not.exist');
    cy.contains('button', 'Populate').click();
    cy.get('[data-testid="card-context"]').should('contain.text', '"ids":["card-a"]').and('contain.text', '"count":1');
    aligned('a');
    cy.contains('button', 'Empty').click();
    cy.get('[data-testid="card-context"]').should('contain.text', '"ids":[]').and('contain.text', '"count":0');
    cy.get('.fui-CarouselCard').should('not.exist');
  });

  it('separate roots isolate card ids visibility focus state and appearance', () => {
    mount(
      <>
        <Fixture prefix="first" />
        <Fixture prefix="second" appearance="elevated" cardFocus />
      </>,
    );
    selected(0, 'first');
    selected(0, 'second');
    card('b', 'first').should('have.attr', 'inert');
    card('b', 'second').focus().should('be.focused');
    selected(1, 'second');
    aligned('b', 'second');
    selected(0, 'first');
    aligned('a', 'first');
    card('b', 'first').should('have.attr', 'inert');
    card('a', 'first').should('have.css', 'box-shadow', 'none');
    card('a', 'second').should('not.have.css', 'box-shadow', 'none');
    cy.get('[data-testid="first-context"]').should('contain.text', '"ids":["first-a","first-b","first-c"]');
    cy.get('[data-testid="second-context"]').should('contain.text', '"ids":["second-a","second-b","second-c"]');
  });

  it('characterizes inherited nested-root registration leakage while inner registration stays local', () => {
    const Nested = () => {
      const styles = useCardCoverageStyles();
      return (
        <Carousel className={styles.root} data-testid="outer" aria-label="Outer carousel" groupSize={1}>
          <CarouselViewport>
            <CarouselSlider cardFocus>
              <CarouselCard id="outer-a" aria-label="Outer first">
                <Fixture prefix="inner" cards={['a', 'b']} cardFocus />
              </CarouselCard>
              <CarouselCard id="outer-b" aria-label="Outer second">
                Outer second
              </CarouselCard>
            </CarouselSlider>
          </CarouselViewport>
          <ContextOutput prefix="outer" />
        </Carousel>
      );
    };
    mount(<Nested />);
    cy.get('[data-testid="inner-context"]').should('contain.text', '"ids":["inner-a","inner-b"]');
    cy.get('[data-testid="outer-context"]')
      .should('contain.text', '"ids":["outer-a","inner-a","inner-b","outer-b"]')
      .and('contain.text', '"count":4');
    nav(1, 'inner').click();
    selected(1, 'inner');
    aligned('b', 'inner');
    cy.get('[data-testid="outer-context"]').should('contain.text', '"activeIndex":0');
  });

  it('characterizes inherited stale inert state after switching banner mode to cardFocus', () => {
    const Toggle = () => {
      const [cardFocus, setCardFocus] = React.useState(false);
      return (
        <>
          <button onClick={() => setCardFocus(!cardFocus)}>Toggle card focus</button>
          <Fixture cardFocus={cardFocus} />
        </>
      );
    };
    mount(<Toggle />);
    card('b').should('have.attr', 'inert');
    cy.contains('button', 'Toggle card focus').click();
    card('b').should('have.attr', 'tabindex', '0').and('have.attr', 'aria-hidden', 'true').and('have.attr', 'inert');
    card('b').then(elements => {
      elements[0].focus();
      expect(elements[0].ownerDocument.activeElement).not.to.equal(elements[0]);
    });
    selected(0);
    card('a').should('not.have.attr', 'inert');
    cy.contains('button', 'Toggle card focus').click();
    nav(1).click();
    selected(1);
    aligned('b');
    card('b').should('have.attr', 'aria-hidden', 'false').and('not.have.attr', 'inert');
  });

  for (const draggable of [false, true]) {
    it(`card content participates in the root draggable=${draggable} context with positive geometry`, () => {
      const changes = cy.stub();
      mount(<Fixture cards={['a', 'b']} draggable={draggable} onActiveIndexChange={changes} />);
      selected(0);
      aligned('a');
      cy.get('[data-testid="card-viewport"]').realMouseDown({ x: 400, y: 80 });
      cy.get('[data-testid="card-viewport"]').realMouseMove(240, 80);
      cy.get('[data-testid="card-viewport"]').realMouseMove(60, 80);
      cy.get('[data-testid="card-viewport"]').realMouseUp({ x: 60, y: 80 });
      selected(draggable ? 1 : 0);
      aligned(draggable ? 'b' : 'a');
      cy.then(() => {
        if (draggable) {
          const data = changes.lastCall.args[1];
          expect(data.type).to.equal('drag');
          expect(data.index).to.equal(1);
          expect(data.event).to.equal(changes.lastCall.args[0]);
        } else {
          expect(changes).not.to.have.been.called;
        }
      });
    });
  }
});
