import 'cypress-real-events';
import * as React from 'react';
import { mergeClasses } from '@griffel/react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme, tokens } from '@fluentui/react-theme';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import { useIsomorphicLayoutEffect, useMergedRefs } from '@fluentui/react-utilities';
import { CustomStyleHooksProvider_unstable } from '@fluentui/react-shared-contexts';
import {
  CarouselViewport,
  carouselViewportClassNames,
  useCarouselViewport_unstable,
  useCarouselViewportStyles_unstable,
  renderCarouselViewport_unstable,
} from './index';
import type { CarouselViewportProps } from './CarouselViewport.types';
import { Carousel } from '../Carousel/Carousel';
import type { CarouselProps, CarouselUpdateData } from '../Carousel/Carousel.types';
import { CarouselSlider } from '../CarouselSlider/CarouselSlider';
import { useCarouselSliderContext } from '../CarouselSlider/CarouselSliderContext';
import { useCarouselSliderContextValues_unstable } from '../CarouselSlider/useCarouselSliderContextValues';
import { CarouselCard } from '../CarouselCard/CarouselCard';
import { CarouselNav } from '../CarouselNav/CarouselNav';
import { CarouselNavButton } from '../CarouselNavButton/CarouselNavButton';
import { CarouselProvider, carouselContextDefaultValue, useCarouselContext_unstable } from '../CarouselContext';
import { useViewportCoverageStyles } from './CarouselViewport.cy.styles';

const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr') =>
  mountBase(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
const view = (prefix = 'view') => cy.get<HTMLDivElement>(`[data-testid="${prefix}-viewport"]`);
const track = (prefix = 'view') => cy.get<HTMLDivElement>(`[data-testid="${prefix}-track"]`);
const card = (index: number, prefix = 'view') => cy.get<HTMLDivElement>(`[data-testid="${prefix}-card-${index}"]`);
const nav = (index: number, prefix = 'view') => cy.get(`[data-testid="${prefix}-nav-${index}"]`);
const selected = (index: number, prefix = 'view') => nav(index, prefix).should('have.attr', 'aria-selected', 'true');
const aligned = (index: number, dir: 'ltr' | 'rtl' = 'ltr', width = 480, prefix = 'view') =>
  card(index, prefix).should(elements => {
    const viewport = elements[0].closest('.fui-CarouselViewport')!;
    const box = viewport.getBoundingClientRect();
    const slide = elements[0].getBoundingClientRect();
    expect(box.width, 'viewport measured width').to.equal(width);
    expect(slide.width, 'slide measured width').to.equal(width);
    expect(Math.abs(dir === 'ltr' ? slide.left - box.left : box.right - slide.right)).to.be.lessThan(1);
  });
const nativeFrame = () =>
  cy.window().then(win => new Cypress.Promise<void>(resolve => win.requestAnimationFrame(() => resolve())));
const testCleanups: (() => void)[] = [];
const cleanupTestResources = () =>
  testCleanups
    .splice(0)
    .reverse()
    .forEach(restore => restore());

afterEach(() => {
  cy.then(cleanupTestResources);
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [] },
    }),
  );
});

describe('CarouselViewport edges and accessibility relationships', () => {
  const PauseFixture = ({
    pause,
    props,
  }: {
    pause: (enabled: boolean, temporary?: boolean) => void;
    props?: CarouselViewportProps;
  }) => (
    <CarouselProvider value={{ ...carouselContextDefaultValue, enableAutoplay: pause }}>
      <button data-testid="outside">Outside viewport</button>
      <CarouselViewport data-testid="view-viewport" {...props}>
        <button data-testid="inside-first">First child</button>
        <button data-testid="inside-second">Second child</button>
      </CarouselViewport>
    </CarouselProvider>
  );

  it('real keyboard entry pauses autoplay and internal focus movement never resumes it before exit', () => {
    const pause = cy.stub();
    mount(<PauseFixture pause={pause} />);
    cy.get('[data-testid="outside"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="inside-first"]').should('be.focused');
    cy.then(() => expect(pause.lastCall.args).to.deep.equal([false, true]));
    cy.realPress('Tab');
    cy.get('[data-testid="inside-second"]').should('be.focused');
    cy.then(() =>
      expect(pause.getCalls().map(call => call.args)).to.deep.equal([
        [false, true],
        [false, true],
      ]),
    );
    cy.get('[data-testid="outside"]').focus();
    cy.then(() => expect(pause.lastCall.args).to.deep.equal([true, true]));
  });

  it('real mouse entry and exit pause and resume autoplay only as temporary requests', () => {
    const pause = cy.stub();
    mount(<PauseFixture pause={pause} />);
    cy.get('[data-testid="outside"]').realHover();
    cy.then(() => pause.resetHistory());
    view().realHover();
    cy.then(() => expect(pause.lastCall.args).to.deep.equal([false, true]));
    cy.get('[data-testid="outside"]').realHover();
    cy.then(() => expect(pause.lastCall.args).to.deep.equal([true, true]));
  });

  it('focus holds the pause after mouse exit and mouse holds the pause after external blur', () => {
    const pause = cy.stub();
    mount(<PauseFixture pause={pause} />);
    cy.get('[data-testid="outside"]').realHover();
    view().realHover();
    cy.get('[data-testid="inside-first"]').focus();
    cy.then(() => pause.resetHistory());
    cy.get('[data-testid="outside"]').realHover();
    cy.then(() => expect(pause).not.to.have.been.called);
    cy.get('[data-testid="outside"]').focus();
    cy.then(() => expect(pause.lastCall.args).to.deep.equal([true, true]));
    view().realHover();
    cy.get('[data-testid="inside-first"]').focus();
    cy.then(() => pause.resetHistory());
    cy.get('[data-testid="outside"]').focus();
    cy.then(() => expect(pause).not.to.have.been.called);
    cy.get('[data-testid="outside"]').realHover();
    cy.then(() => expect(pause.lastCall.args).to.deep.equal([true, true]));
  });

  it('consumer handlers run before internal pause requests even when defaultPrevented', () => {
    const order: string[] = [];
    const pause = cy.stub().callsFake((enabled: boolean) => order.push(`pause:${enabled}`));
    const handler = (event: React.SyntheticEvent) => {
      order.push(event.type);
      event.preventDefault();
    };
    mount(
      <PauseFixture
        pause={pause}
        props={{ onFocusCapture: handler, onBlurCapture: handler, onMouseEnter: handler, onMouseLeave: handler }}
      />,
    );
    cy.get('[data-testid="outside"]').realHover();
    cy.then(() => order.splice(0));
    view().realHover();
    cy.get('[data-testid="outside"]').realHover();
    cy.get('[data-testid="inside-first"]').focus();
    cy.get('[data-testid="outside"]').focus();
    cy.then(() =>
      expect(order).to.deep.equal([
        'mouseenter',
        'pause:false',
        'mouseleave',
        'pause:true',
        'focus',
        'pause:false',
        'blur',
        'pause:true',
      ]),
    );
  });

  it('null relatedTarget blur releases the pause without requiring another focusable destination', () => {
    const pause = cy.stub();
    mount(<PauseFixture pause={pause} />);
    cy.get('[data-testid="outside"]').realHover();
    cy.get('[data-testid="inside-first"]').focus().blur();
    cy.then(() => expect(pause.lastCall.args).to.deep.equal([true, true]));
  });

  it('explicit labelledby and describedby names resolve to consumer elements without generated ARIA announcements', () => {
    mount(
      <>
        <h2 id="offers-label">Available offers</h2>
        <p id="offers-description">Browse with page controls</p>
        <CarouselViewport
          role="group"
          aria-labelledby="offers-label"
          aria-describedby="offers-description"
          data-testid="view-viewport"
        >
          <button>Open offer</button>
        </CarouselViewport>
      </>,
    );
    view().should(elements => {
      const root = elements[0];
      expect(root.ownerDocument.getElementById(root.getAttribute('aria-labelledby')!)!.textContent).to.equal(
        'Available offers',
      );
      expect(root.ownerDocument.getElementById(root.getAttribute('aria-describedby')!)!.textContent).to.equal(
        'Browse with page controls',
      );
      expect(root.hasAttribute('aria-live')).to.equal(false);
    });
    cy.contains('button', 'Open offer').realClick().should('be.focused');
  });

  it('empty and single-card discovery do not require a selected viewport or synthetic progress control', () => {
    mount(<Fixture cards={[]} />);
    view().should('have.attr', 'role', 'presentation');
    track().should('be.empty');
    cy.get('[data-testid="view-engine"]').should('contain.text', '"count":0');
    cy.get('[data-testid^="view-nav-"]').should('not.exist');
    mount(<Fixture cards={[0]} />);
    selected(0);
    aligned(0);
    cy.get('[data-testid^="view-nav-"]').should('have.length', 1);
    view().should(elements => expect(elements[0].querySelector('[role="progressbar"]')).to.equal(null));
  });

  [false, true].forEach(draggable => {
    it(`real pointer drag ${
      draggable ? 'moves' : 'does not move'
    } the track with root draggable ${draggable} and native dragstart cancellation`, () => {
      const changed = cy.stub();
      mount(
        <Fixture
          cards={[0, 1]}
          clip
          draggable={draggable}
          viewportProps={{ onDragStart: event => event.preventDefault() }}
          onActiveIndexChange={changed}
        />,
      );
      selected(0);
      aligned(0);
      view().realMouseDown({ position: 'center', x: 420, y: 80 });
      view().realMouseMove(280, 80);
      view().realMouseMove(100, 80);
      view().realMouseUp({ x: 100, y: 80 });
      if (draggable) {
        selected(1);
        aligned(1);
        cy.then(() => {
          expect(changed.getCalls().some(call => call.args[1].type === 'drag' && call.args[1].index === 1)).to.equal(
            true,
          );
        });
      } else {
        selected(0);
        aligned(0);
        cy.then(() => expect(changed).not.to.have.been.called);
      }
      view().should('have.attr', 'draggable', 'true').and('have.css', 'transform', 'none');
    });
  });

  ['ltr', 'rtl'].forEach(dir => {
    it(`real ${dir} keyboard card focus selects and scrolls the associated page without viewport tab semantics`, () => {
      const changed = cy.stub();
      mount(<Fixture cardFocus onActiveIndexChange={changed} />, dir === 'rtl' ? 'rtl' : 'ltr');
      card(0).focus();
      cy.realPress(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
      card(1).should('be.focused');
      selected(1);
      aligned(1, dir === 'rtl' ? 'rtl' : 'ltr');
      cy.then(() =>
        expect(changed.getCalls().some(call => call.args[1].type === 'focus' && call.args[1].index === 1)).to.equal(
          true,
        ),
      );
      view().should(elements => expect(elements[0].hasAttribute('tabindex')).to.equal(false));
    });
  });

  it('banner visibility events make offscreen children inert while the current child remains a real keyboard target', () => {
    const focused = cy.stub();
    // The AUT's Cypress/Keyborg focus wrapper can emit synthetic focusin even when native inert rejects focus.
    const nativeFocus = window.top!.document.createElement('button').focus;
    const Host = () => {
      const [width, setWidth] = React.useState(480);
      return (
        <>
          <button onClick={() => setWidth(400)}>Discover visibility</button>
          <Fixture width={width} clip viewportProps={{ onFocusCapture: focused }} />
        </>
      );
    };
    mount(<Host />);
    cy.contains('button', 'Discover visibility').click();
    card(1).should('have.attr', 'aria-hidden', 'true').and('have.prop', 'inert', true);
    cy.get('[data-testid="view-action-1"]').then(elements => {
      nativeFocus.call(elements[0]);
      expect(elements[0].ownerDocument.activeElement).not.to.equal(elements[0]);
      expect(focused, 'inert focus rejection emits no consumer focus callback').not.to.have.been.called;
    });
    selected(0);
    aligned(0, 'ltr', 400);
    card(0).should('have.attr', 'aria-hidden', 'false').and('have.prop', 'inert', false);
    cy.get('[data-testid="view-action-0"]').then(elements => {
      nativeFocus.call(elements[0]);
      expect(elements[0].ownerDocument.activeElement, 'same native focus method accepts the visible child').to.equal(
        elements[0],
      );
      expect(focused).to.have.been.calledOnce;
      expect(focused.firstCall.args[0].nativeEvent.isTrusted, 'positive control is native focus').to.equal(true);
    });
    cy.contains('button', 'Discover visibility').focus();
    nativeFrame();
    cy.realPress('Tab', { pressDelay: 0 });
    cy.get('[data-testid="view-action-0"]').then(elements => {
      expect(elements[0].ownerDocument.activeElement, 'actual focus destination after initial banner').to.equal(
        elements[0],
      );
    });
    nav(1).click();
    aligned(1, 'ltr', 400);
    card(1).should('have.attr', 'aria-hidden', 'false').and('have.prop', 'inert', false);
    card(0).should('have.attr', 'aria-hidden', 'true').and('have.prop', 'inert', true);
    cy.contains('button', 'Discover visibility').focus();
    nativeFrame();
    cy.realPress('Tab', { pressDelay: 0 });
    cy.get('[data-testid="view-action-1"]').then(elements =>
      expect(elements[0].ownerDocument.activeElement, 'actual focus destination after selected banner').to.equal(
        elements[0],
      ),
    );
  });

  it('characterizes clipped scroll state when cardFocus keeps offscreen cards focusable rather than inert', () => {
    mount(<Fixture cardFocus clip />);
    card(2).should('have.prop', 'inert', false);
    card(0).focus();
    cy.realPress('ArrowRight');
    card(1).should('be.focused');
    selected(1);
    view().should(elements => {
      expect(Math.abs(elements[0].scrollLeft), 'consumer overflow hidden scrolls through native focus').to.equal(480);
      expect(elements[0].getBoundingClientRect().width).to.equal(480);
    });
    card(1).should('have.prop', 'inert', false);
  });

  it('two carousel contexts keep viewport refs selection and physical tracks independent', () => {
    const first = React.createRef<HTMLDivElement>();
    const second = React.createRef<HTMLDivElement>();
    mount(
      <>
        <Fixture prefix="first" viewportRef={first} />
        <Fixture prefix="second" viewportRef={second} />
      </>,
    );
    nav(2, 'first').click();
    selected(2, 'first');
    selected(0, 'second');
    aligned(2, 'ltr', 480, 'first');
    aligned(0, 'ltr', 480, 'second');
    view('first').then(elements => expect(first.current).to.equal(elements[0]));
    view('second').then(elements => {
      expect(second.current).to.equal(elements[0]);
      expect(second.current).not.to.equal(first.current);
    });
  });

  it('real viewport resize recomputes geometry and associations without replacing the registered root', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Host = () => {
      const [width, setWidth] = React.useState(480);
      return (
        <>
          <button onClick={() => setWidth(300)}>Narrow viewport</button>
          <Fixture width={width} viewportRef={ref} />
        </>
      );
    };
    mount(<Host />);
    nav(1).click();
    aligned(1);
    view().then(elements => {
      const original = elements[0];
      cy.contains('button', 'Narrow viewport').click();
      aligned(1, 'ltr', 300);
      nav(1).should('have.attr', 'aria-controls', 'view-card-1');
      view().then(current => {
        expect(current[0]).to.equal(original);
        expect(ref.current).to.equal(original);
      });
    });
  });
});

const Probe = ({ prefix }: { prefix: string }) => {
  const index = useCarouselContext_unstable(ctx => ctx.activeIndex);
  const viewportRef = useCarouselContext_unstable(ctx => ctx.viewportRef);
  const containerRef = useCarouselContext_unstable(ctx => ctx.containerRef);
  const subscribe = useCarouselContext_unstable(ctx => ctx.subscribeForValues);
  const [data, setData] = React.useState<CarouselUpdateData>();
  useIsomorphicLayoutEffect(() => subscribe(setData), [subscribe]);
  return (
    <output data-testid={`${prefix}-engine`}>
      {JSON.stringify({
        index,
        count: data?.navItemsCount,
        ids: data?.slideNodes.map(node => node.id),
        viewport: viewportRef?.current?.getAttribute('data-testid'),
        container: containerRef?.current?.getAttribute('data-testid'),
      })}
    </output>
  );
};
type FixtureProps = CarouselProps & {
  prefix?: string;
  width?: number;
  viewportWidth?: number;
  clip?: boolean;
  cardFocus?: boolean;
  cards?: number[];
  viewportProps?: CarouselViewportProps;
  viewportRef?: React.Ref<HTMLDivElement>;
  generatedIds?: boolean;
};
const Fixture = ({
  prefix = 'view',
  width = 480,
  viewportWidth,
  clip = false,
  cardFocus = false,
  cards = [0, 1, 2],
  viewportProps,
  viewportRef,
  generatedIds = false,
  children,
  ...props
}: FixtureProps) => (
  <Carousel aria-label={`${prefix} carousel`} data-testid={`${prefix}-root`} style={{ width }} groupSize={1} {...props}>
    <CarouselViewport
      data-testid={`${prefix}-viewport`}
      style={{ width: viewportWidth, overflow: clip ? 'hidden' : undefined }}
      ref={viewportRef}
      {...viewportProps}
    >
      <CarouselSlider data-testid={`${prefix}-track`} aria-label="Pages" cardFocus={cardFocus}>
        {cards.map(index => (
          <CarouselCard
            key={index}
            id={generatedIds ? undefined : `${prefix}-card-${index}`}
            data-testid={`${prefix}-card-${index}`}
            aria-label={`Page ${index + 1}`}
            style={{ height: 120 }}
          >
            <button data-testid={`${prefix}-action-${index}`}>Action {index}</button>
          </CarouselCard>
        ))}
      </CarouselSlider>
    </CarouselViewport>
    <CarouselNav aria-label="Choose page">
      {index => <CarouselNavButton aria-label={`Page ${index + 1}`} data-testid={`${prefix}-nav-${index}`} />}
    </CarouselNav>
    <Probe prefix={prefix} />
    {children}
  </Carousel>
);

describe('CarouselViewport documented contracts', () => {
  it('renders an empty presentation div with native draggable default and no invented selection or live semantics', () => {
    mount(<CarouselViewport data-testid="view-viewport" />);
    view()
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'presentation')
      .and('have.attr', 'draggable', 'true')
      .and('have.class', carouselViewportClassNames.root)
      .and('be.empty');
    view().should(elements => {
      ['tabindex', 'aria-live', 'aria-selected', 'aria-controls', 'id'].forEach(name =>
        expect(elements[0].hasAttribute(name), name).to.equal(false),
      );
    });
  });
});

describe('CarouselViewport unit and source derived regressions', () => {
  const FocusContext = ({ id }: { id: string }) => {
    const context = useCarouselSliderContext();
    return <output data-testid={id}>{String(context.cardFocus)}</output>;
  };

  it('exported hook styles context values and renderer preserve native defaults and ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Composed = () => {
      const state = useCarouselViewport_unstable({ title: 'Composed root', children: 'Composed content' }, ref);
      useCarouselViewportStyles_unstable(state);
      return renderCarouselViewport_unstable(state, useCarouselSliderContextValues_unstable(state));
    };
    mount(<Composed />);
    cy.get(`.${carouselViewportClassNames.root}`)
      .should('have.attr', 'role', 'presentation')
      .and('have.attr', 'draggable', 'true')
      .and('have.attr', 'title', 'Composed root')
      .and('have.text', 'Composed content')
      .then(elements => expect(ref.current).to.equal(elements[0]));
  });

  it('root render functions preserve native props ref classes and the physical engine viewport', () => {
    const ref = React.createRef<HTMLDivElement>();
    const render: SlotRenderFunction<React.ComponentPropsWithRef<'div'>> = (Component, props) => (
      <Component {...props} data-rendered="true">
        <CarouselSlider data-testid="view-track">
          <CarouselCard id="render-card">Render function card</CarouselCard>
        </CarouselSlider>
      </Component>
    );
    mount(
      <Carousel style={{ width: 480 }} aria-label="Render carousel">
        <CarouselViewport as="div" ref={ref} data-testid="view-viewport" title="Render title" id="render-viewport">
          {render}
        </CarouselViewport>
        <Probe prefix="view" />
      </Carousel>,
    );
    view()
      .should('have.attr', 'data-rendered', 'true')
      .and('have.attr', 'title', 'Render title')
      .and('have.attr', 'role', 'presentation')
      .and('have.class', carouselViewportClassNames.root)
      .then(elements => expect(ref.current).to.equal(elements[0]));
    cy.get('[data-testid="view-engine"]')
      .should('contain.text', '"ids":["render-card"]')
      .and('contain.text', '"viewport":"view-viewport"');
  });

  it('object and consumer merged callback refs retain node identity on rerender and release on removal', () => {
    const object = React.createRef<HTMLDivElement>();
    const callback = cy.stub();
    const contextRef = React.createRef<HTMLDivElement>();
    const Host = () => {
      const [version, setVersion] = React.useState(0);
      const merged = useMergedRefs(object, callback);
      return (
        <CarouselProvider value={{ ...carouselContextDefaultValue, viewportRef: contextRef }}>
          <button onClick={() => setVersion(value => value + 1)}>Update viewport</button>
          <button onClick={() => setVersion(2)}>Unmount viewport</button>
          {version < 2 && (
            <CarouselViewport ref={merged} data-testid="view-viewport">
              Version {version}
            </CarouselViewport>
          )}
        </CarouselProvider>
      );
    };
    mount(<Host />);
    view().then(elements => {
      const original = elements[0];
      expect(object.current).to.equal(original);
      expect(contextRef.current).to.equal(original);
      expect(callback.lastCall.args[0]).to.equal(original);
      cy.contains('button', 'Update viewport').click();
      view()
        .should('have.text', 'Version 1')
        .then(current => expect(current[0]).to.equal(original));
    });
    cy.contains('button', 'Unmount viewport').click();
    view()
      .should('not.exist')
      .then(() => {
        expect(object.current).to.equal(null);
        expect(contextRef.current).to.equal(null);
        expect(callback.lastCall.args[0]).to.equal(null);
      });
  });

  it('replaces callback refs with balanced null release then supplies the latest callback to keyed roots', () => {
    const first = cy.stub();
    const latest = cy.stub();
    const Host = () => {
      const [version, setVersion] = React.useState(0);
      return (
        <>
          <button onClick={() => setVersion(1)}>Swap callback</button>
          <button onClick={() => setVersion(2)}>Swap root</button>
          <button onClick={() => setVersion(3)}>Remove root</button>
          {version < 3 && (
            <CarouselViewport
              key={version < 2 ? 'original' : 'new'}
              ref={version ? latest : first}
              data-testid="view-viewport"
            />
          )}
        </>
      );
    };
    mount(<Host />);
    view().then(elements => {
      const original = elements[0];
      cy.contains('button', 'Swap callback').click();
      view().then(current => {
        expect(current[0]).to.equal(original);
        expect(first.lastCall.args[0]).to.equal(null);
        expect(latest.lastCall.args[0]).to.equal(original);
      });
      cy.contains('button', 'Swap root').click();
      view().then(current => {
        expect(current[0]).not.to.equal(original);
        expect(original.isConnected).to.equal(false);
        expect(latest.lastCall.args[0]).to.equal(current[0]);
        expect(latest.getCalls().some(call => call.args[0] === null)).to.equal(true);
      });
    });
    cy.contains('button', 'Remove root').click();
    view()
      .should('not.exist')
      .then(() => expect(latest.lastCall.args[0]).to.equal(null));
  });

  it('swapping provider viewport refs releases the old context ref without replacing the consumer root', () => {
    const first = React.createRef<HTMLDivElement>();
    const latest = React.createRef<HTMLDivElement>();
    const consumer = React.createRef<HTMLDivElement>();
    const Host = () => {
      const [swapped, setSwapped] = React.useState(false);
      return (
        <CarouselProvider value={{ ...carouselContextDefaultValue, viewportRef: swapped ? latest : first }}>
          <button onClick={() => setSwapped(true)}>Swap context ref</button>
          <CarouselViewport data-testid="view-viewport" ref={consumer} />
        </CarouselProvider>
      );
    };
    mount(<Host />);
    view().then(elements => {
      const original = elements[0];
      expect(first.current).to.equal(original);
      cy.contains('button', 'Swap context ref').click();
      view().then(current => {
        expect(current[0]).to.equal(original);
        expect(first.current).to.equal(null);
        expect(latest.current).to.equal(original);
        expect(consumer.current).to.equal(original);
      });
    });
  });

  it('latest consumer focus blur enter and leave closures replace previous handlers without duplicate internal calls', () => {
    const old = cy.stub();
    const latest = cy.stub();
    const pause = cy.stub();
    const Host = () => {
      const [updated, setUpdated] = React.useState(false);
      const handler = updated ? latest : old;
      return (
        <CarouselProvider value={{ ...carouselContextDefaultValue, enableAutoplay: pause }}>
          <button data-testid="outside" onClick={() => setUpdated(true)}>
            Latest handlers
          </button>
          <CarouselViewport
            data-testid="view-viewport"
            onFocusCapture={handler}
            onBlurCapture={handler}
            onMouseEnter={handler}
            onMouseLeave={handler}
          >
            <button data-testid="inside">Inside</button>
          </CarouselViewport>
        </CarouselProvider>
      );
    };
    mount(<Host />);
    cy.get('[data-testid="outside"]').realHover();
    view().realHover();
    cy.then(() => expect(old).to.have.been.calledOnce);
    cy.get('[data-testid="outside"]').realHover().click();
    cy.then(() => {
      old.resetHistory();
      pause.resetHistory();
    });
    view().realHover();
    cy.get('[data-testid="outside"]').realHover();
    cy.get('[data-testid="inside"]').focus();
    cy.get('[data-testid="outside"]').focus();
    cy.then(() => {
      expect(old).not.to.have.been.called;
      expect(latest).to.have.callCount(4);
      expect(pause.getCalls().map(call => call.args)).to.deep.equal([
        [false, true],
        [true, true],
        [false, true],
        [true, true],
      ]);
    });
  });

  it('latest provider autoplay closure handles blur using preserved focus state after context update', () => {
    const first = cy.stub();
    const latest = cy.stub();
    const Host = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <CarouselProvider value={{ ...carouselContextDefaultValue, enableAutoplay: updated ? latest : first }}>
          <button data-testid="outside">Outside</button>
          <CarouselViewport data-testid="view-viewport" title={updated ? 'Latest context' : 'First context'}>
            <button onClick={() => setUpdated(true)}>Swap pause context</button>
          </CarouselViewport>
        </CarouselProvider>
      );
    };
    mount(<Host />);
    cy.get('[data-testid="outside"]').realHover();
    cy.contains('button', 'Swap pause context').focus();
    cy.realPress('Enter');
    view().should('have.attr', 'title', 'Latest context');
    cy.contains('button', 'Swap pause context').should('be.focused');
    cy.then(() => first.resetHistory());
    cy.get('[data-testid="outside"]').realHover();
    cy.get('[data-testid="outside"]').focus();
    cy.then(() => {
      expect(first).not.to.have.been.called;
      expect(latest.lastCall.args).to.deep.equal([true, true]);
    });
  });

  it('nearest nested providers isolate pause handlers and viewport refs', () => {
    const first = cy.stub();
    const second = cy.stub();
    const outer = React.createRef<HTMLDivElement>();
    const inner = React.createRef<HTMLDivElement>();
    mount(
      <CarouselProvider value={{ ...carouselContextDefaultValue, viewportRef: outer, enableAutoplay: first }}>
        <button data-testid="outside">Outside</button>
        <CarouselViewport data-testid="outer-viewport">
          <button data-testid="outer-child">Outer child</button>
        </CarouselViewport>
        <CarouselProvider value={{ ...carouselContextDefaultValue, viewportRef: inner, enableAutoplay: second }}>
          <CarouselViewport data-testid="inner-viewport">
            <button data-testid="inner-child">Inner child</button>
          </CarouselViewport>
        </CarouselProvider>
      </CarouselProvider>,
    );
    cy.get('[data-testid="outside"]').realHover();
    cy.get('[data-testid="inner-child"]').focus();
    cy.then(() => {
      expect(first).not.to.have.been.called;
      expect(second.lastCall.args).to.deep.equal([false, true]);
    });
    cy.get('[data-testid="outer-child"]').focus();
    cy.then(() => {
      expect(first.lastCall.args).to.deep.equal([false, true]);
      expect(second.lastCall.args).to.deep.equal([true, true]);
      expect(outer.current).not.to.equal(inner.current);
      expect(outer.current!.getAttribute('data-testid')).to.equal('outer-viewport');
      expect(inner.current!.getAttribute('data-testid')).to.equal('inner-viewport');
    });
  });

  it('standalone children remain keyboard usable with default noop carousel context', () => {
    mount(
      <>
        <button data-testid="outside">Before viewport</button>
        <CarouselViewport data-testid="view-viewport">
          <button data-testid="inside">Inside viewport</button>
        </CarouselViewport>
      </>,
    );
    cy.get('[data-testid="outside"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="inside"]').should('be.focused').realClick().should('be.focused');
    cy.get('[data-testid="outside"]').focus();
    view().realHover();
    cy.get('[data-testid="outside"]').realHover();
  });

  it('characterizes viewport focus context as undefined while nested slider restores its explicit cardFocus value', () => {
    mount(
      <CarouselSlider cardFocus>
        <FocusContext id="outer-value" />
        <CarouselViewport data-testid="view-viewport">
          <FocusContext id="viewport-value" />
          <CarouselCard data-testid="direct-card">Direct card</CarouselCard>
          <CarouselSlider cardFocus>
            <FocusContext id="inner-value" />
            <CarouselCard data-testid="inner-card">Nested card</CarouselCard>
          </CarouselSlider>
        </CarouselViewport>
        <FocusContext id="restored-value" />
      </CarouselSlider>,
    );
    cy.get('[data-testid="outer-value"]').should('have.text', 'true');
    cy.get('[data-testid="viewport-value"]').should('have.text', 'undefined');
    cy.get('[data-testid="direct-card"]').should(elements =>
      expect(elements[0].hasAttribute('tabindex')).to.equal(false),
    );
    cy.get('[data-testid="inner-value"]').should('have.text', 'true');
    cy.get('[data-testid="inner-card"]').should('have.attr', 'tabindex', '0');
    cy.get('[data-testid="restored-value"]').should('have.text', 'true');
  });

  it('dynamic card IDs refresh existing controls while newly discovered controls need a subsequent resize association', () => {
    const Host = () => {
      const [cards, setCards] = React.useState([0, 1]);
      const [width, setWidth] = React.useState(480);
      return (
        <>
          <button onClick={() => setCards([0, 2, 3])}>Change cards</button>
          <button onClick={() => setWidth(400)}>Refresh new control</button>
          <Fixture cards={cards} width={width} />
        </>
      );
    };
    mount(<Host />);
    cy.contains('button', 'Change cards').click();
    card(1).should('not.exist');
    cy.get('[data-testid="view-engine"]')
      .should('contain.text', '"ids":["view-card-0","view-card-2","view-card-3"]')
      .and('contain.text', '"count":3');
    nav(1).should('have.attr', 'aria-controls', 'view-card-2');
    nav(2).should(elements => expect(elements[0].hasAttribute('aria-controls')).to.equal(false));
    cy.contains('button', 'Refresh new control').click();
    nav(2).should('have.attr', 'aria-controls', 'view-card-3').click();
    aligned(3, 'ltr', 400);
    view().should(elements => expect(elements[0].hasAttribute('id')).to.equal(false));
  });

  it('characterizes keyed viewport replacement as ref rebinding without automatic engine retargeting', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Host = () => {
      const [key, setKey] = React.useState(0);
      return (
        <>
          <button onClick={() => setKey(1)}>Replace viewport only</button>
          <Carousel style={{ width: 480 }} aria-label="Root retained" groupSize={1}>
            <CarouselViewport key={key} data-testid="view-viewport" ref={ref}>
              <CarouselSlider data-testid="view-track">
                {[0, 1].map(index => (
                  <CarouselCard key={index} data-testid={`view-card-${index}`}>
                    Card {index}
                  </CarouselCard>
                ))}
              </CarouselSlider>
            </CarouselViewport>
            <CarouselNav aria-label="Choose page">
              {index => <CarouselNavButton data-testid={`view-nav-${index}`} aria-label={`Page ${index + 1}`} />}
            </CarouselNav>
            <Probe prefix="view" />
          </Carousel>
        </>
      );
    };
    mount(<Host />);
    selected(0);
    view().then(elements => {
      const old = elements[0];
      cy.contains('button', 'Replace viewport only').click();
      view().then(current => {
        expect(current[0]).not.to.equal(old);
        expect(old.isConnected).to.equal(false);
        expect(ref.current).to.equal(current[0]);
      });
      nav(1).click();
      selected(1);
      aligned(0);
      track().should('have.css', 'transform', 'none');
    });
  });

  it('full carousel remount releases old viewport and registers a working new motion container', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Host = () => {
      const [key, setKey] = React.useState(0);
      return (
        <>
          <button onClick={() => setKey(1)}>Remount carousel</button>
          <Fixture key={key} viewportRef={ref} />
        </>
      );
    };
    mount(<Host />);
    nav(1).click();
    aligned(1);
    view().then(elements => {
      const old = elements[0];
      cy.contains('button', 'Remount carousel').click();
      view().then(current => {
        expect(old.isConnected).to.equal(false);
        expect(current[0]).not.to.equal(old);
        expect(ref.current).to.equal(current[0]);
      });
    });
    selected(0);
    nav(2).click();
    selected(2);
    aligned(2);
  });

  it('removing a hovered viewport releases its ref without inventing an unmount autoplay-resume callback', () => {
    const pause = cy.stub();
    const ref = React.createRef<HTMLDivElement>();
    let remove: () => void;
    const Host = () => {
      const [visible, setVisible] = React.useState(true);
      remove = () => setVisible(false);
      return (
        <CarouselProvider value={{ ...carouselContextDefaultValue, enableAutoplay: pause }}>
          {visible && (
            <CarouselViewport ref={ref} data-testid="view-viewport">
              Hovered content
            </CarouselViewport>
          )}
        </CarouselProvider>
      );
    };
    mount(<Host />);
    view().realHover();
    cy.then(() => {
      expect(pause.lastCall.args).to.deep.equal([false, true]);
      pause.resetHistory();
      remove();
    });
    view()
      .should('not.exist')
      .then(() => {
        expect(ref.current).to.equal(null);
        expect(pause).not.to.have.been.called;
      });
  });

  it('native animation events use latest handlers while transition-end prop is characterized as filtered', () => {
    const old = cy.stub();
    const latest = cy.stub();
    const transitionProp = cy.stub();
    const nativeTransition = cy.stub();
    const Host = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Latest animation handlers</button>
          <CarouselViewport
            data-testid="view-viewport"
            style={{ height: 60 }}
            onAnimationStart={updated ? latest : old}
            onAnimationEnd={updated ? latest : old}
            onTransitionEnd={transitionProp}
          />
        </>
      );
    };
    mount(<Host />);
    view().then(elements => elements[0].addEventListener('transitionend', nativeTransition));
    view().trigger('animationstart', {
      eventConstructor: 'AnimationEvent',
      bubbles: true,
      animationName: 'consumer-animation',
    });
    cy.then(() => expect(old).to.have.been.calledOnce);
    cy.contains('button', 'Latest animation handlers').click();
    view()
      .trigger('animationstart', {
        eventConstructor: 'AnimationEvent',
        bubbles: true,
        animationName: 'consumer-animation',
      })
      .trigger('animationend', {
        eventConstructor: 'AnimationEvent',
        bubbles: true,
        animationName: 'consumer-animation',
      })
      .trigger('transitionend', { eventConstructor: 'TransitionEvent', bubbles: true, propertyName: 'width' });
    cy.then(() => {
      expect(old).to.have.been.calledOnce;
      expect(latest).to.have.callCount(2);
      expect(latest.firstCall.args[0].type).to.equal('animationstart');
      expect(latest.lastCall.args[0].type).to.equal('animationend');
      expect(nativeTransition).to.have.been.calledOnce;
      expect(transitionProp).not.to.have.been.called;
    });
  });

  it('latest custom style hook runs after viewport base styles and preserves consumer inline overrides', () => {
    const seen = cy.stub();
    const Host = () => {
      const [updated, setUpdated] = React.useState(false);
      const styles = useViewportCoverageStyles();
      return (
        <CustomStyleHooksProvider_unstable
          value={{
            // eslint-disable-next-line @typescript-eslint/naming-convention
            useCarouselViewportStyles_unstable: state => {
              if (
                typeof state !== 'object' ||
                state === null ||
                !('root' in state) ||
                typeof state.root !== 'object' ||
                state.root === null ||
                !('className' in state.root) ||
                typeof state.root.className !== 'string'
              ) {
                throw new Error('Expected styled viewport root');
              }
              seen(updated, state.root.className);
              state.root.className = mergeClasses(state.root.className, updated && styles.override);
            },
          }}
        >
          <button onClick={() => setUpdated(true)}>Change custom style hook</button>
          <div style={{ width: 400 }}>
            <CarouselViewport data-testid="view-viewport" style={{ width: 280 }} />
          </div>
        </CustomStyleHooksProvider_unstable>
      );
    };
    mount(<Host />);
    view().should('have.css', 'width', '280px').and('have.css', 'max-width', '100%');
    cy.contains('button', 'Change custom style hook').click();
    view()
      .should('have.css', 'width', '280px')
      .and('have.css', 'max-width', 'none')
      .and('have.css', 'overflow', 'hidden');
    cy.then(() => {
      expect(seen.lastCall.args[0]).to.equal(true);
      expect(seen.lastCall.args[1]).to.contain(carouselViewportClassNames.root);
    });
  });

  it('light dark and custom token changes style viewport content without changing root defaults', () => {
    const Host = () => {
      const [dark, setDark] = React.useState(false);
      const [custom, setCustom] = React.useState(false);
      const styles = useViewportCoverageStyles();
      return (
        <FluentProvider
          theme={
            custom
              ? { ...teamsDarkTheme, colorNeutralBackground1: teamsLightTheme.colorBrandBackground }
              : dark
              ? teamsDarkTheme
              : teamsLightTheme
          }
        >
          <button onClick={() => setDark(true)}>Dark viewport content</button>
          <button onClick={() => setCustom(true)}>Custom viewport tokens</button>
          <CarouselViewport data-testid="view-viewport" className={styles.themed}>
            Themed viewport
          </CarouselViewport>
        </FluentProvider>
      );
    };
    mount(<Host />);
    const color = (value: string) =>
      view().should(elements => {
        const sample = elements[0].ownerDocument.createElement('span');
        sample.style.backgroundColor = value;
        expect(elements[0].ownerDocument.defaultView!.getComputedStyle(elements[0]).backgroundColor).to.equal(
          sample.style.backgroundColor,
        );
      });
    color(teamsLightTheme.colorNeutralBackground1);
    cy.contains('button', 'Dark viewport content').click();
    color(teamsDarkTheme.colorNeutralBackground1);
    cy.contains('button', 'Custom viewport tokens').click();
    color(teamsLightTheme.colorBrandBackground);
    view().should('have.attr', 'role', 'presentation').and('have.css', 'max-width', '100%');
  });

  it('latest controlled motion and active-change handler update through the same viewport root', () => {
    const old = cy.stub();
    const latest = cy.stub();
    const Host = () => {
      const [updated, setUpdated] = React.useState(false);
      const [index, setIndex] = React.useState(0);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Change motion handler</button>
          <Fixture
            activeIndex={index}
            motion={updated ? { kind: 'slide', duration: 20 } : 'slide'}
            onActiveIndexChange={(event, data) => {
              (updated ? latest : old)(event, data);
              setIndex(data.index);
            }}
          />
        </>
      );
    };
    mount(<Host />);
    nav(1).click();
    aligned(1);
    cy.contains('button', 'Change motion handler').click();
    nav(2).click();
    aligned(2);
    cy.then(() => {
      expect(old).to.have.been.calledOnce;
      expect(latest).to.have.been.calledOnce;
      expect(latest.lastCall.args[1]).to.include({ type: 'click', index: 2 });
    });
  });

  it('characterizes reduced-motion media as not consumed by viewport or the inherited slide engine', () => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
      }),
    );
    mount(<Fixture motion={{ kind: 'slide', duration: 60 }} />);
    view().then(elements =>
      expect(elements[0].ownerDocument.defaultView!.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(
        true,
      ),
    );
    nav(1).click();
    selected(1);
    track().then(elements => {
      const viewRect = elements[0].parentElement!.getBoundingClientRect();
      const rect = elements[0].querySelector('[data-testid="view-card-1"]')!.getBoundingClientRect();
      expect(rect.left - viewRect.left, 'selection does not mean an instant reduced-motion jump').to.be.greaterThan(1);
    });
    aligned(1);
    view().should('have.css', 'animation-name', 'none');
  });

  it('generated card IDs remain unique across viewport contexts and associations resolve after discovery', () => {
    const Host = () => {
      const [width, setWidth] = React.useState(480);
      return (
        <>
          <button onClick={() => setWidth(400)}>Discover generated IDs</button>
          <Fixture prefix="generated-first" width={width} generatedIds />
          <Fixture prefix="generated-second" width={width} generatedIds />
        </>
      );
    };
    mount(<Host />);
    cy.contains('button', 'Discover generated IDs').click();
    cy.get('.fui-CarouselCard').should(elements => {
      const ids = Array.from(elements, element => element.id);
      expect(ids).to.have.length(6);
      expect(ids.every(id => id.length > 0)).to.equal(true);
      expect(new Set(ids).size).to.equal(6);
    });
    ['generated-first', 'generated-second'].forEach(prefix => {
      [0, 1, 2].forEach(index => {
        card(index, prefix).then(elements => nav(index, prefix).should('have.attr', 'aria-controls', elements[0].id));
      });
      view(prefix).should(elements => expect(elements[0].hasAttribute('id')).to.equal(false));
    });
  });

  it('a focusable native viewport pauses on root focus and does not resume when focus moves to its child', () => {
    const pause = cy.stub();
    mount(
      <CarouselProvider value={{ ...carouselContextDefaultValue, enableAutoplay: pause }}>
        <button data-testid="outside">Outside</button>
        <CarouselViewport data-testid="view-viewport" tabIndex={0}>
          <button data-testid="inside">Child</button>
        </CarouselViewport>
      </CarouselProvider>,
    );
    cy.get('[data-testid="outside"]').realHover().focus();
    cy.realPress('Tab');
    view().should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-testid="inside"]').should('be.focused');
    cy.then(() =>
      expect(pause.getCalls().map(call => call.args)).to.deep.equal([
        [false, true],
        [false, true],
      ]),
    );
    cy.get('[data-testid="outside"]').focus();
    cy.then(() => expect(pause.lastCall.args).to.deep.equal([true, true]));
  });

  it('latest native click pointer and keydown handlers receive real browser events without passive viewport selection', () => {
    const first = cy.stub();
    const latest = cy.stub();
    const Host = () => {
      const [updated, setUpdated] = React.useState(false);
      const handler = updated ? latest : first;
      return (
        <>
          <button onClick={() => setUpdated(true)}>Latest native events</button>
          <CarouselViewport
            data-testid="view-viewport"
            tabIndex={0}
            onClick={handler}
            onPointerDown={handler}
            onKeyDown={handler}
            style={{ height: 70 }}
          >
            Native event area
          </CarouselViewport>
        </>
      );
    };
    mount(<Host />);
    view().realClick();
    cy.then(() => expect(first).to.have.callCount(2));
    cy.contains('button', 'Latest native events').click();
    view().realClick();
    cy.realPress('ArrowRight');
    cy.then(() => {
      expect(first).to.have.callCount(2);
      expect(latest).to.have.callCount(3);
      expect(latest.getCalls().map(call => call.args[0].type)).to.deep.equal(['pointerdown', 'click', 'keydown']);
      expect(latest.getCalls().every(call => call.args[0].nativeEvent.isTrusted)).to.equal(true);
    });
    view().should(elements => expect(elements[0].hasAttribute('aria-selected')).to.equal(false));
  });

  it('consumer border padding and border-box clipping preserve viewport width while cards use inner track width', () => {
    mount(
      <Fixture
        width={600}
        viewportProps={{
          style: {
            width: 360,
            boxSizing: 'border-box',
            padding: tokens.spacingHorizontalL,
            border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
            overflow: 'hidden',
          },
        }}
      />,
    );
    const centered = (index: number) =>
      card(index).should(elements => {
        const root = elements[0].closest('.fui-CarouselViewport')!;
        const box = root.getBoundingClientRect();
        const rect = elements[0].getBoundingClientRect();
        const style = root.ownerDocument.defaultView!.getComputedStyle(root);
        const inset = parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth);
        expect(box.width).to.equal(360);
        expect(rect.width).to.equal(box.width - 2 * inset);
        expect(Math.abs((rect.left + rect.right) / 2 - (box.left + box.right) / 2)).to.be.lessThan(1);
      });
    centered(0);
    nav(1).click();
    selected(1);
    centered(1);
    view().should('have.css', 'transform', 'none');
  });
});

describe('CarouselViewport documented contracts', () => {
  it('forwards native attributes explicit role name ID style and draggable false without adding a viewport ID', () => {
    mount(
      <CarouselViewport
        id="named-viewport"
        data-testid="view-viewport"
        role="group"
        aria-label="Visible offers"
        title="Native viewport"
        lang="fr"
        dir="rtl"
        draggable={false}
        tabIndex={0}
        className="consumer-viewport"
        style={{ width: 320, height: 80 }}
      >
        <button>Offer</button>
      </CarouselViewport>,
    );
    view()
      .should('have.attr', 'id', 'named-viewport')
      .and('have.attr', 'role', 'group')
      .and('have.attr', 'aria-label', 'Visible offers')
      .and('have.attr', 'title', 'Native viewport')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'draggable', 'false')
      .and('have.attr', 'tabindex', '0')
      .and('have.class', 'consumer-viewport')
      .and('have.css', 'width', '320px')
      .and('have.css', 'height', '80px');
  });

  it('discovers cards through the inner track and registers the viewport separately from the carousel root', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(<Fixture viewportRef={ref} />);
    view().then(elements => expect(ref.current).to.equal(elements[0]));
    cy.get('[data-testid="view-engine"]')
      .should('contain.text', '"count":3')
      .and('contain.text', '"ids":["view-card-0","view-card-1","view-card-2"]')
      .and('contain.text', '"viewport":"view-viewport"')
      .and('contain.text', '"container":"view-root"');
    track().should('have.css', 'display', 'flex').and('have.css', 'transform').and('not.equal', 'none');
    view().should('have.css', 'transform', 'none');
  });

  it('characterizes initially absent controls associations then associates card IDs after viewport resize discovery', () => {
    const Host = () => {
      const [width, setWidth] = React.useState(480);
      return (
        <>
          <button onClick={() => setWidth(400)}>Resize discovery</button>
          <Fixture width={width} viewportProps={{ id: 'viewport-id' }} />
        </>
      );
    };
    mount(<Host />);
    nav(0).should(elements => expect(elements[0].hasAttribute('aria-controls')).to.equal(false));
    cy.contains('button', 'Resize discovery').click();
    [0, 1, 2].forEach(index => nav(index).should('have.attr', 'aria-controls', `view-card-${index}`));
    nav(2).click();
    selected(2);
    aligned(2, 'ltr', 400);
    view().should('have.attr', 'id', 'viewport-id');
    view().should(elements => expect(elements[0].hasAttribute('aria-controls')).to.equal(false));
  });

  it('characterizes default visible viewport overflow and root-owned horizontal clipping', () => {
    mount(<Fixture />);
    view().should('have.css', 'overflow-x', 'visible').and('have.css', 'max-width', '100%');
    cy.get('[data-testid="view-root"]').should('have.css', 'overflow-x', 'hidden');
    card(1).should(elements => {
      const root = elements[0].closest('.fui-Carousel')!.getBoundingClientRect();
      expect(elements[0].getBoundingClientRect().left).to.be.at.least(root.right - 1);
    });
  });

  it('consumer clipping and viewport size define the visible box independently of outer controls', () => {
    mount(<Fixture width={600} viewportWidth={360} clip />);
    view().should('have.css', 'overflow-x', 'hidden');
    nav(1).click();
    aligned(1, 'ltr', 360);
    view().should(elements => {
      const rect = elements[0].getBoundingClientRect();
      const action = elements[0].querySelector('[data-testid="view-action-1"]')!.getBoundingClientRect();
      expect(action.left).to.be.at.least(rect.left);
      expect(action.right).to.be.at.most(rect.right);
    });
  });

  ['ltr', 'rtl'].forEach(dir => {
    it(`settles active pages by moving the inner track not the ${dir} viewport`, () => {
      mount(<Fixture clip />, dir === 'rtl' ? 'rtl' : 'ltr');
      aligned(0, dir === 'rtl' ? 'rtl' : 'ltr');
      nav(2).click();
      selected(2);
      aligned(2, dir === 'rtl' ? 'rtl' : 'ltr');
      view().should('have.css', 'transform', 'none');
      track().should(elements => expect(elements[0].style.transform).to.contain('translate3d'));
    });
  });

  it('supports uncontrolled initial page without giving viewport an activeIndex prop', () => {
    mount(<Fixture defaultActiveIndex={1} />);
    selected(1);
    aligned(1);
    nav(0).click();
    selected(0);
    aligned(0);
    view().should('not.have.attr', 'activeindex');
  });

  it('controlled external page updates retain the same physical viewport ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Host = () => {
      const [index, setIndex] = React.useState(0);
      return (
        <>
          <button onClick={() => setIndex(2)}>External page</button>
          <Fixture activeIndex={index} onActiveIndexChange={(_, data) => setIndex(data.index)} viewportRef={ref} />
        </>
      );
    };
    mount(<Host />);
    aligned(0);
    view().then(elements => {
      const original = elements[0];
      cy.contains('button', 'External page').click();
      selected(2);
      aligned(2);
      view().then(current => {
        expect(current[0]).to.equal(original);
        expect(ref.current).to.equal(original);
      });
    });
  });

  it('explicit context jump completes fade card opacity without viewport CSS animation events', () => {
    const animation = cy.stub();
    const Jump = () => {
      const select = useCarouselContext_unstable(ctx => ctx.selectPageByIndex);
      return <button onClick={event => select(event, 1, true)}>Jump fade page</button>;
    };
    mount(
      <Fixture motion="fade" viewportProps={{ onAnimationStart: animation, onAnimationEnd: animation }}>
        <Jump />
      </Fixture>,
    );
    card(0).should('have.css', 'opacity', '1');
    cy.contains('button', 'Jump fade page').click();
    selected(1);
    card(1).should('have.css', 'opacity', '1');
    card(0).should('have.css', 'opacity', '0');
    view().should('have.css', 'transform', 'none').and('have.css', 'animation-name', 'none');
    cy.then(() => expect(animation).not.to.have.been.called);
  });

  (['non-jump fade', 'jump fade', 'non-jump slide'] as const).forEach(mode => {
    it(`controlled frame ${mode} observes selection callback and physical motion without invented WAAPI effects`, () => {
      const changed = cy.stub();
      const animationEvents = cy.stub();
      const clicked = cy.stub();
      const frames = new Map<number, FrameRequestCallback>();
      let nextId = 0;
      const Select = () => {
        const select = useCarouselContext_unstable(ctx => ctx.selectPageByIndex);
        return (
          <div>
            <button onClick={event => select(event, 1, mode === 'jump fade')}>Select motion page</button>
          </div>
        );
      };
      mount(
        <Fixture
          motion={mode === 'non-jump slide' ? 'slide' : 'fade'}
          onActiveIndexChange={changed}
          viewportProps={{ onAnimationStart: animationEvents, onAnimationEnd: animationEvents, onClick: clicked }}
        >
          <Select />
        </Fixture>,
      );
      view().then(
        elements =>
          new Cypress.Promise<void>(resolve => {
            const observer = new ResizeObserver(() => {
              observer.disconnect();
              resolve();
            });
            observer.observe(elements[0]);
            testCleanups.push(() => observer.disconnect());
          }),
      );
      nativeFrame();
      aligned(0);
      view().then(viewports => {
        const viewport = viewports[0];
        const root = viewport.closest<HTMLElement>('[data-testid="view-root"]')!;
        const slider = viewport.querySelector<HTMLElement>('[data-testid="view-track"]')!;
        const outgoing = viewport.querySelector<HTMLElement>('[data-testid="view-card-0"]')!;
        const incoming = viewport.querySelector<HTMLElement>('[data-testid="view-card-1"]')!;
        const win = viewport.ownerDocument.defaultView!;
        let timestamp = win.performance.now();
        const originalRequest = win.requestAnimationFrame;
        const originalCancel = win.cancelAnimationFrame;
        const initialBox = viewport.getBoundingClientRect();
        const rootBox = root.getBoundingClientRect();
        const isFade = mode !== 'non-jump slide';
        const assertBoundary = () => {
          [root, viewport, slider, outgoing, incoming].forEach(node =>
            expect(node.getAnimations(), `${node.dataset.testid} has no WAAPI effect to seek`).to.have.length(0),
          );
          expect(win.getComputedStyle(viewport).opacity, 'viewport remains opaque').to.equal('1');
          expect(win.getComputedStyle(root).opacity, 'outer root remains opaque').to.equal('1');
          expect(win.getComputedStyle(viewport).transform, 'viewport is not the motion target').to.equal('none');
          expect(win.getComputedStyle(root).transform, 'outer root is not the motion target').to.equal('none');
          expect(viewport.getBoundingClientRect().left).to.equal(initialBox.left);
          expect(viewport.getBoundingClientRect().width).to.equal(initialBox.width);
          expect(root.getBoundingClientRect().left).to.equal(rootBox.left);
          expect(root.getBoundingClientRect().width).to.equal(rootBox.width);
          expect(animationEvents, 'no fabricated CSS animation lifecycle').not.to.have.been.called;
        };
        const opacity = (node: HTMLElement) => Number(win.getComputedStyle(node).opacity);
        const advanceFrame = () => {
          expect(frames.size, 'real engine scheduled a frame').to.be.greaterThan(0);
          const callbacks = [...frames.values()];
          frames.clear();
          timestamp += 1000 / 60;
          callbacks.forEach(callback => callback(timestamp));
        };
        // Control only the browser frame scheduler; the real engine/plugin still creates and renders motion.
        const requested = cy.stub(win, 'requestAnimationFrame').callsFake((callback: FrameRequestCallback) => {
          const id = --nextId;
          frames.set(id, callback);
          return id;
        });
        testCleanups.push(() => {
          requested.restore();
          frames.clear();
          expect(win.requestAnimationFrame, 'original requestAnimationFrame restored').to.equal(originalRequest);
        });
        const cancelled = cy.stub(win, 'cancelAnimationFrame').callsFake((id: number) => {
          if (id < 0) {
            frames.delete(id);
          } else {
            originalCancel.call(win, id);
          }
        });
        testCleanups.push(() => {
          cancelled.restore();
          expect(win.cancelAnimationFrame, 'original cancelAnimationFrame restored').to.equal(originalCancel);
        });
        expect(opacity(outgoing)).to.equal(1);
        expect(opacity(incoming)).to.equal(isFade ? 0 : 1);
        assertBoundary();
        cy.contains('button', 'Select motion page')
          .then(elements => {
            const button = elements[0];
            const box = button.getBoundingClientRect();
            expect(
              button.ownerDocument.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2),
              'selection control is a native hit target',
            ).to.equal(button);
          })
          .realClick({ scrollBehavior: false });
        nav(1).then(elements => expect(elements[0].getAttribute('aria-selected')).to.equal('true'));
        cy.then(() => {
          expect(changed).to.have.been.calledOnce;
          const [event, data] = changed.firstCall.args;
          expect(event.type, 'real selection event').to.equal('click');
          expect(event.nativeEvent.isTrusted, 'selection originates in a native pointer click').to.equal(true);
          expect(data).to.include({ type: 'click', index: 1 });
          expect(data.event).to.equal(event);
          assertBoundary();
          if (mode === 'jump fade') {
            expect(opacity(outgoing)).to.equal(0);
            expect(opacity(incoming)).to.equal(1);
          } else {
            expect(requested, 'non-jump branch owns animation scheduling').to.have.been.called;
            expect(opacity(outgoing), 'selection precedes rendered motion').to.equal(1);
            expect(opacity(incoming)).to.equal(isFade ? 0 : 1);
            for (let frame = 0; frame < 8; frame++) {
              advanceFrame();
            }
            if (isFade) {
              expect(opacity(incoming), 'incoming intermediate phase').to.be.within(0.01, 0.99);
              expect(opacity(outgoing), 'outgoing intermediate phase').to.be.within(0.01, 0.99);
              expect(opacity(incoming) + opacity(outgoing), 'complementary fade pair').to.be.closeTo(1, 0.01);
              expect(win.getComputedStyle(slider).transform, 'fade disables track translation').to.equal('none');
            } else {
              expect(opacity(outgoing), 'slide does not load fade styles').to.equal(1);
              expect(opacity(incoming)).to.equal(1);
              const displacement = incoming.getBoundingClientRect().left - initialBox.left;
              expect(displacement, 'slide intermediate geometry').to.be.within(1, initialBox.width - 1);
              expect(slider.style.transform).to.contain('translate3d');
            }
            assertBoundary();
          }
          let remainingFrames = 0;
          while (frames.size && remainingFrames++ < 240) {
            advanceFrame();
          }
          expect(frames.size, 'frame queue becomes idle within 240 further frames').to.equal(0);
          expect(opacity(incoming), 'settled incoming card').to.equal(1);
          expect(opacity(outgoing), 'settled outgoing card').to.equal(isFade ? 0 : 1);
          expect(
            Math.abs(incoming.getBoundingClientRect().left - initialBox.left),
            'settled selected geometry',
          ).to.be.lessThan(1);
          if (isFade) {
            expect(outgoing.style.pointerEvents, 'hidden card rejects pointer interaction').to.equal('none');
            expect(incoming.style.pointerEvents, 'selected card accepts pointer interaction').to.equal('auto');
            expect(win.getComputedStyle(slider).transform).to.equal('none');
          }
          expect(changed, 'rendering does not invent additional selection callbacks').to.have.been.calledOnce;
          assertBoundary();
        });
        cy.then(cleanupTestResources);
        // Native rendering delivers IntersectionObserver visibility/inert updates after the controlled motion.
        nativeFrame();
        nativeFrame();
        cy.then(
          () =>
            new Cypress.Promise<void>(resolve => {
              if (!incoming.inert) {
                resolve();
                return;
              }
              const observer = new win.MutationObserver(() => {
                if (!incoming.inert) {
                  observer.disconnect();
                  resolve();
                }
              });
              observer.observe(incoming, { attributes: true, attributeFilter: ['inert'] });
              testCleanups.push(() => observer.disconnect());
            }),
        );
        cy.get('[data-testid="view-action-1"]')
          .then(elements => {
            const button = elements[0];
            expect(incoming.inert, 'native visibility discovery enables the settled child').to.equal(false);
            const box = button.getBoundingClientRect();
            expect(
              button.ownerDocument.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2),
              'settled incoming action is the native hit target',
            ).to.equal(button);
          })
          .realClick({ scrollBehavior: false });
        cy.then(() => {
          expect(clicked, 'settled incoming child accepts a native pointer click').to.have.been.calledOnce;
          expect(clicked.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
          expect(clicked.firstCall.args[0].target).to.equal(incoming.querySelector('button'));
          expect(changed, 'pointer focus does not fabricate another selection').to.have.been.calledOnce;
          expect(opacity(incoming)).to.equal(1);
          expect(opacity(outgoing)).to.equal(isFade ? 0 : 1);
          assertBoundary();
        });
      });
    });
  });

  it('consumer Griffel overrides retain the viewport marker and override width and clipping', () => {
    const Styled = () => {
      const styles = useViewportCoverageStyles();
      return (
        <div style={{ width: 400 }}>
          <CarouselViewport className={styles.override} data-testid="view-viewport" />
        </div>
      );
    };
    mount(<Styled />);
    view()
      .should('have.class', carouselViewportClassNames.root)
      .and('have.css', 'width', '300px')
      .and('have.css', 'max-width', 'none')
      .and('have.css', 'overflow', 'hidden');
  });
});
