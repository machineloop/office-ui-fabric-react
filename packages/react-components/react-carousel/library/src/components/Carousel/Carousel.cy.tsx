import 'cypress-real-events';
import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import type { CarouselProps } from './Carousel.types';
import { CarouselNav } from '../CarouselNav/CarouselNav';
import { CarouselNavButton, carouselNavButtonClassNames } from '../CarouselNavButton/index';
import { CarouselNavContainer } from '../CarouselNavContainer/CarouselNavContainer';
import { CarouselSlider } from '../CarouselSlider/CarouselSlider';
import { CarouselViewport } from '../CarouselViewport/CarouselViewport';
import { Carousel } from './Carousel';
import { CarouselCard, carouselCardClassNames } from '../CarouselCard/index';
import type { CarouselIndexChangeData } from '../CarouselContext.types';
import { useIsomorphicLayoutEffect } from '@fluentui/react-utilities';
import type { EventHandler, JSXElement } from '@fluentui/react-utilities';
import { CarouselButton } from '../CarouselButton/CarouselButton';
import { CarouselAutoplayButton } from '../CarouselAutoplayButton/CarouselAutoplayButton';
import { useCarouselContext_unstable } from '../CarouselContext';
import { useCarouselCoverageStyles } from './Carousel.cy.styles';
import type { CarouselUpdateData } from './Carousel.types';
import { AriaLiveAnnouncer } from '@fluentui/react-aria';
import { AnnounceProvider } from '@fluentui/react-shared-contexts';

const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

const CarouselTest = (props: CarouselProps) => {
  return (
    <Carousel {...props}>
      <CarouselViewport>
        <CarouselSlider cardFocus>
          <CarouselCard>Card 1</CarouselCard>
          <CarouselCard>Card 2</CarouselCard>
          <CarouselCard>Card 3</CarouselCard>
        </CarouselSlider>
      </CarouselViewport>
      <CarouselNavContainer>
        <CarouselNav>{index => <CarouselNavButton aria-label={`Carousel Nav Button ${index}`} />}</CarouselNav>
      </CarouselNavContainer>
    </Carousel>
  );
};
CarouselTest.displayName = 'CarouselTest';

describe('CarouselControlledIndexTest', () => {
  it('Should render to initial value', () => {
    const defaultActiveIndex = 1;
    mount(<CarouselTest defaultActiveIndex={defaultActiveIndex} />);
    const activeIndexNavButton = cy.get<HTMLElement>(`.${carouselNavButtonClassNames.root}`).eq(defaultActiveIndex);
    activeIndexNavButton.should('have.attr', 'aria-selected', 'true');
  });

  it('Should render to controlled value', () => {
    const controlledActiveIndex = 1;
    mount(<CarouselTest activeIndex={controlledActiveIndex} />);
    const activeIndexNavButton = cy.get<HTMLElement>(`.${carouselNavButtonClassNames.root}`).eq(controlledActiveIndex);
    activeIndexNavButton.should('have.attr', 'aria-selected', 'true');
  });

  it('Should callback new index value', () => {
    const controlledActiveIndex = 1;
    let callbackIndex = controlledActiveIndex;
    const callback: EventHandler<CarouselIndexChangeData> = (ev, data) => {
      callbackIndex = data.index;
    };
    mount(<CarouselTest defaultActiveIndex={controlledActiveIndex} onActiveIndexChange={callback} />);

    const prevIndexButton = cy.get<HTMLElement>(`.${carouselNavButtonClassNames.root}`).first();
    const nextIndexButton = cy.get<HTMLElement>(`.${carouselNavButtonClassNames.root}`).last();

    // Click to previous of original index
    prevIndexButton.click().then(() => {
      expect(callbackIndex).equals(controlledActiveIndex - 1);
      const prevIndexNavButton = cy
        .get<HTMLElement>(`.${carouselNavButtonClassNames.root}`)
        .eq(controlledActiveIndex - 1);
      prevIndexNavButton.should('have.attr', 'aria-selected', 'true');
    });

    // Check next from original index
    nextIndexButton.click().then(() => {
      expect(callbackIndex).equals(controlledActiveIndex + 1);
      const nextIndexNavButton = cy
        .get<HTMLElement>(`.${carouselNavButtonClassNames.root}`)
        .eq(controlledActiveIndex + 1);
      nextIndexNavButton.should('have.attr', 'aria-selected', 'true');
    });
  });

  it('Should set index to focused card', () => {
    mount(<CarouselTest />);

    const secondCard = cy.get<HTMLElement>(`.${carouselCardClassNames.root}`).eq(1);
    secondCard.focus().then(() => {
      const nextIndexNavButton = cy.get<HTMLElement>(`.${carouselNavButtonClassNames.root}`).eq(1);
      nextIndexNavButton.should('have.attr', 'aria-selected', 'true');
    });
  });
});

const CarouselAddCardsTest = (props: CarouselProps) => {
  const [isVisible, setVisibility] = React.useState(false);
  const [controlledIndex, setControlledIndex] = React.useState<number | undefined>(props.activeIndex);

  return (
    <Carousel {...props} activeIndex={controlledIndex}>
      <CarouselViewport>
        <CarouselSlider>
          <CarouselCard>Card 1</CarouselCard>
          <CarouselCard>Card 2</CarouselCard>
          <CarouselCard>Card 3</CarouselCard>
          {isVisible && <CarouselCard>Card 4</CarouselCard>}
          {isVisible && <CarouselCard>Card 5</CarouselCard>}
        </CarouselSlider>
      </CarouselViewport>
      <CarouselNavContainer>
        <CarouselNav>{index => <CarouselNavButton aria-label={`Carousel Nav Button ${index}`} />}</CarouselNav>
      </CarouselNavContainer>
      <button
        className="addNewCardsButton"
        onClick={() => {
          // Add and set to new card
          setVisibility(true);
          setControlledIndex(4);
        }}
      >
        {'Add cards'}
      </button>
    </Carousel>
  );
};
CarouselAddCardsTest.displayName = 'CarouselAddCardsTest';

describe('CarouselAddCardsTest', () => {
  it('Should handle controlled index set to newly appended card', () => {
    mount(<CarouselAddCardsTest activeIndex={1} />);

    const activeIndexNavButton = cy.get<HTMLElement>(`.${carouselNavButtonClassNames.root}`).eq(1);
    activeIndexNavButton.should('have.attr', 'aria-selected', 'true');
    cy.then(() => {
      const addNewCardsButton = cy.get<HTMLElement>('.addNewCardsButton');
      addNewCardsButton.click();
    }).then(() => {
      const newCardIndexNavButton = cy.get<HTMLElement>(`.${carouselNavButtonClassNames.root}`).eq(4);
      newCardIndexNavButton.should('have.attr', 'aria-selected', 'true');
    });
  });
});

const ContextOutput = () => {
  const activeIndex = useCarouselContext_unstable(ctx => ctx.activeIndex);
  const subscribe = useCarouselContext_unstable(ctx => ctx.subscribeForValues);
  const [data, setData] = React.useState<CarouselUpdateData>();
  useIsomorphicLayoutEffect(() => subscribe(setData), [subscribe]);
  return (
    <output data-testid="context">
      {JSON.stringify({ activeIndex, count: data?.navItemsCount, groups: data?.groupIndexList })}
    </output>
  );
};

type FixtureProps = CarouselProps & {
  count?: number;
  cardWidth?: number;
  cardFocus?: boolean;
  autoplay?: boolean;
  prefix?: string;
  rootRef?: React.Ref<HTMLDivElement>;
  topNav?: boolean;
  observer?: React.ReactNode;
};

const Fixture = ({
  count = 3,
  cardWidth,
  cardFocus = false,
  autoplay = false,
  prefix = 'fixture',
  rootRef,
  topNav = false,
  observer,
  ...props
}: FixtureProps) => {
  const styles = useCarouselCoverageStyles();
  const nav = (
    <CarouselNav aria-label="Pages">
      {index => <CarouselNavButton aria-label={`Page ${index + 1}`} data-testid={`nav-${index}`} />}
    </CarouselNav>
  );
  return (
    <Carousel aria-label={prefix} data-testid={prefix} className={styles.root} groupSize={1} {...props} ref={rootRef}>
      {topNav && nav}
      <CarouselViewport data-testid="viewport">
        <CarouselSlider cardFocus={cardFocus}>
          {Array.from({ length: count }, (_, index) => (
            <CarouselCard
              key={index}
              aria-label={`Card ${index + 1}`}
              className={styles.card}
              style={cardWidth ? { flexBasis: cardWidth, maxWidth: cardWidth } : undefined}
            >
              <button data-testid={`action-${index}`}>Action {index + 1}</button>
            </CarouselCard>
          ))}
        </CarouselSlider>
      </CarouselViewport>
      <CarouselButton navType="prev" aria-label="Previous" data-testid="prev" />
      {!topNav && nav}
      <CarouselButton aria-label="Next" data-testid="next" />
      {autoplay && <CarouselAutoplayButton aria-label="Autoplay" data-testid="autoplay" />}
      <ContextOutput />
      {observer}
    </Carousel>
  );
};

const navAt = (index: number) => cy.get(`[data-testid="nav-${index}"]`);
const selected = (index: number) => navAt(index).should('have.attr', 'aria-selected', 'true');
const contextIndex = (index: number) =>
  cy.get('[data-testid="context"]').should('contain.text', `"activeIndex":${index}`);

function aligned(index: number, fraction = 0) {
  cy.get('[data-testid="viewport"]').then($viewport => {
    const viewport = $viewport[0].getBoundingClientRect();
    cy.get(`.${carouselCardClassNames.root}`)
      .eq(index)
      .should($card => {
        const card = $card[0].getBoundingClientRect();
        expect(Math.abs(card.left - (viewport.left + fraction * (viewport.width - card.width)))).lessThan(2);
      });
  });
}

describe('Carousel documentation contract', () => {
  it('defaults to the first page with finite previous and next boundaries', () => {
    mount(<Fixture />);
    selected(0);
    cy.get('[data-testid="prev"]').should('be.disabled');
    cy.get('[data-testid="next"]').click();
    selected(1);
    aligned(1);
    cy.get('[data-testid="next"]').click();
    selected(2);
    cy.get('[data-testid="next"]').should('be.disabled');
    cy.get('[data-testid="prev"]').click();
    selected(1);
  });

  it('reports exact click event identity and index for direct and directional navigation', () => {
    const changes = cy.stub().as('changes');
    mount(<Fixture onActiveIndexChange={changes} />);
    navAt(2).click();
    cy.get('@changes').should('have.been.calledOnce');
    cy.then(() => {
      const [event, data] = changes.firstCall.args;
      expect(data.type).equals('click');
      expect(data.index).equals(2);
      expect(data.event).equals(event);
      expect(event.type).equals('click');
    });
    cy.get('[data-testid="prev"]').click();
    cy.then(() => expect(changes.lastCall.args[1]).includes({ type: 'click', index: 1 }));
    selected(1);
  });

  it('characterizes rejected controlled requests preserving context but moving physical geometry until an external update', () => {
    const changes = cy.stub().as('changes');
    const Controlled = () => {
      const [index, setIndex] = React.useState(1);
      return (
        <>
          <button data-testid="external" onClick={() => setIndex(2)}>
            External
          </button>
          <Fixture activeIndex={index} onActiveIndexChange={changes} />
        </>
      );
    };
    mount(<Controlled />);
    selected(1);
    navAt(0).click();
    cy.get('@changes').should('have.been.calledOnce');
    selected(1);
    contextIndex(1);
    aligned(0);
    cy.get('[data-testid="external"]').click();
    selected(2);
    aligned(2);
    cy.get('@changes').should('have.been.calledOnce');
  });

  it('supports controlled feedback from the exact requested index', () => {
    const Controlled = () => {
      const [index, setIndex] = React.useState(0);
      return <Fixture activeIndex={index} onActiveIndexChange={(_, data) => setIndex(data.index)} />;
    };
    mount(<Controlled />);
    cy.get('[data-testid="next"]').click();
    selected(1);
    aligned(1);
    navAt(2).click();
    selected(2);
    aligned(2);
  });

  it('uses defaultActiveIndex only to initialize uncontrolled state', () => {
    const Uncontrolled = () => {
      const [initial, setInitial] = React.useState(1);
      return (
        <>
          <button data-testid="external" onClick={() => setInitial(2)}>
            Change default
          </button>
          <Fixture defaultActiveIndex={initial} />
        </>
      );
    };
    mount(<Uncontrolled />);
    selected(1);
    cy.get('[data-testid="external"]').click();
    selected(1);
    cy.get('[data-testid="prev"]').click();
    selected(0);
  });

  it('wraps next and previous when circular geometry can loop', () => {
    const changes = cy.stub();
    mount(<Fixture circular onActiveIndexChange={changes} />);
    cy.get('[data-testid="prev"]').should('not.be.disabled').click();
    selected(2);
    cy.then(() => expect(changes.lastCall.args[1]).includes({ type: 'click', index: 2 }));
    cy.get('[data-testid="next"]').should('not.be.disabled').click();
    selected(0);
  });

  for (const motion of ['slide', 'fade', { kind: 'slide', duration: 40 }] as const) {
    it(`navigates and settles with motion ${JSON.stringify(motion)}`, () => {
      mount(<Fixture motion={motion} />);
      cy.get('[data-testid="next"]').click();
      selected(1);
      if (motion !== 'fade') {
        aligned(1);
      } else {
        cy.get(`.${carouselCardClassNames.root}`).eq(1).should('have.css', 'opacity', '1');
        cy.get(`.${carouselCardClassNames.root}`).eq(0).should('have.css', 'opacity', '0');
      }
    });
  }

  for (const align of ['start', 'center', 'end'] as const) {
    for (const whitespace of [false, true]) {
      it(`respects ${align} alignment with whitespace ${whitespace}`, () => {
        mount(<Fixture cardWidth={240} align={align} whitespace={whitespace} />);
        selected(0);
        aligned(0, whitespace ? { start: 0, center: 0.5, end: 1 }[align] : 0);
        navAt(2).click();
        selected(2);
        aligned(2, whitespace ? { start: 0, center: 0.5, end: 1 }[align] : 1);
      });
    }
  }

  for (const groupSize of [1, 2, 'auto'] as const) {
    it(`discovers groupSize ${groupSize} from measured cards`, () => {
      mount(<Fixture count={4} cardWidth={240} groupSize={groupSize} />);
      cy.get('[role="tab"]').should('have.length', groupSize === 1 ? 4 : 2);
      cy.get('[data-testid="context"]').should(
        'contain.text',
        groupSize === 1 ? '"groups":[[0],[1],[2],[3]]' : '"groups":[[0,1],[2,3]]',
      );
      cy.get('[data-testid="next"]').click();
      selected(1);
      aligned(groupSize === 1 ? 1 : 2, groupSize === 1 ? 0.5 : 0);
    });
  }

  for (const appearance of ['flat', 'elevated'] as const) {
    it(`propagates ${appearance} appearance while preserving root styling and navigation`, () => {
      mount(<Fixture appearance={appearance} />);
      cy.get('[data-testid="fixture"]')
        .should('have.css', 'overflow-x', 'hidden')
        .and('have.css', 'position', 'relative');
      cy.get(`.${carouselCardClassNames.root}`)
        .first()
        .should(appearance === 'flat' ? 'have.css' : 'not.have.css', 'box-shadow', 'none');
      cy.get('[data-testid="next"]').click();
      selected(1);
    });
  }

  it('supports controls before the viewport and independent next/previous composition', () => {
    mount(<Fixture topNav />);
    cy.get('[role="tab"]').should('have.length', 3);
    cy.get('[role="tablist"]').then($nav =>
      cy
        .get('[data-testid="viewport"]')
        .then($viewport =>
          expect($nav[0].getBoundingClientRect().top).lessThan($viewport[0].getBoundingClientRect().top),
        ),
    );
    navAt(2).click();
    selected(2);
    cy.get('[data-testid="prev"]').click();
    selected(1);
    aligned(1);
  });
});

describe('Carousel edges and accessibility', () => {
  it('owns a named region while forwarding native attributes and root handlers', () => {
    const click = cy.stub().as('rootClick');
    const key = cy.stub().as('rootKey');
    mount(<Fixture id="owned-root" title="Root title" lang="fr" tabIndex={0} onClick={click} onKeyDown={key} />);
    cy.get('#owned-root').should('have.attr', 'role', 'region').and('have.attr', 'aria-label', 'fixture');
    cy.get('#owned-root')
      .should('have.attr', 'title', 'Root title')
      .and('have.attr', 'lang', 'fr')
      .focus()
      .realPress('ArrowRight');
    cy.get('@rootKey').should('have.been.calledOnce');
    selected(0);
    navAt(1).click();
    cy.get('@rootClick').should('have.been.calledOnce');
    selected(1);
  });

  describe('Carousel unit and source derived regressions', () => {
    it('uses the latest callback closure for direct direction and focus requests after rerender', () => {
      const changes = cy.stub();
      const Latest = () => {
        const [version, setVersion] = React.useState('first');
        return (
          <>
            <button data-testid="version" onClick={() => setVersion('latest')}>
              Update
            </button>
            <Fixture cardFocus onActiveIndexChange={(event, data) => changes(version, event, data)} />
          </>
        );
      };
      mount(<Latest />);
      navAt(1).click();
      cy.then(() => expect(changes.lastCall.args[0]).equals('first'));
      cy.get('[data-testid="version"]').click();
      navAt(2).click();
      cy.then(() => {
        expect(changes.lastCall.args[0]).equals('latest');
        expect(changes.lastCall.args[2]).includes({ type: 'click', index: 2 });
      });
      cy.get('[data-testid="prev"]').click();
      selected(1);
      cy.then(() => expect(changes.lastCall.args[2]).includes({ type: 'click', index: 1 }));
      cy.get('[role="tabpanel"]').eq(0).focus();
      selected(0);
      cy.then(() => {
        expect(changes.lastCall.args[0]).equals('latest');
        expect(changes.lastCall.args[2]).includes({ type: 'focus', index: 0 });
      });
    });

    it('uses the latest announcement formatter without replaying an unchanged index callback', () => {
      const announce = cy.stub().as('announce');
      const changes = cy.stub().as('changes');
      const Latest = () => {
        const [language, setLanguage] = React.useState('Page');
        return (
          <AnnounceProvider value={{ announce }}>
            <button data-testid="language" onClick={() => setLanguage('Slide')}>
              Language
            </button>
            <Fixture
              onActiveIndexChange={changes}
              announcement={(index, count) => `${language} ${index + 1}/${count}`}
            />
          </AnnounceProvider>
        );
      };
      mount(<Latest />);
      selected(0);
      cy.get('[data-testid="language"]').click();
      cy.get('@changes').should('not.have.been.called');
      navAt(1).click();
      cy.get('@announce').should('have.been.calledWith', 'Slide 2/3', { polite: true });
      cy.get('@changes').should('have.been.calledOnce');
    });

    it('updates automatic grouping and tab count after a real viewport resize', () => {
      const Resize = () => {
        const [width, setWidth] = React.useState(480);
        return (
          <>
            <button data-testid="resize" onClick={() => setWidth(240)}>
              Resize
            </button>
            <Fixture count={4} cardWidth={240} groupSize="auto" style={{ width }} />
          </>
        );
      };
      mount(<Resize />);
      cy.get('[role="tab"]').should('have.length', 2);
      cy.get('[data-testid="resize"]').click();
      cy.get('[role="tab"]').should('have.length', 4);
      cy.get('[data-testid="context"]').should('contain.text', '"groups":[[0],[1],[2],[3]]');
      navAt(3).click();
      selected(3);
      aligned(3);
    });

    it('adds removes and restores cards with valid simultaneous controlled index updates', () => {
      const Dynamic = () => {
        const [count, setCount] = React.useState(3);
        const [index, setIndex] = React.useState(0);
        return (
          <>
            <button
              data-testid="grow"
              onClick={() => {
                setCount(5);
                setIndex(4);
              }}
            >
              Grow
            </button>
            <button
              data-testid="shrink"
              onClick={() => {
                setCount(2);
                setIndex(1);
              }}
            >
              Shrink
            </button>
            <Fixture count={count} activeIndex={index} onActiveIndexChange={(_, data) => setIndex(data.index)} />
          </>
        );
      };
      mount(<Dynamic />);
      selected(0);
      cy.get('[data-testid="grow"]').click();
      cy.get('[role="tab"]').should('have.length', 5);
      selected(4);
      aligned(4);
      cy.get('[data-testid="shrink"]').click();
      cy.get('[role="tab"]').should('have.length', 2);
      selected(1);
      aligned(1);
      cy.get('[data-testid="prev"]').click();
      selected(0);
      cy.get('[data-testid="grow"]').click();
      selected(4);
      cy.get('[role="tab"]').should('have.length', 5);
    });

    it('discovers cards added to initially empty geometry', () => {
      const Dynamic = () => {
        const [count, setCount] = React.useState(0);
        return (
          <>
            <button data-testid="grow" onClick={() => setCount(3)}>
              Grow
            </button>
            <Fixture count={count} />
          </>
        );
      };
      mount(<Dynamic />);
      cy.get('[role="tab"]').should('not.exist');
      cy.get('[data-testid="grow"]').click();
      cy.get('[role="tab"]').should('have.length', 3);
      selected(0);
      cy.get('[data-testid="next"]').click();
      selected(1);
      aligned(1);
    });

    for (const draggable of [false, true]) {
      it(`handles real pointer dragging with draggable ${draggable}`, () => {
        const changes = cy.stub();
        mount(<Fixture count={2} draggable={draggable} onActiveIndexChange={changes} />);
        selected(0);
        cy.get('[data-testid="viewport"]').realMouseDown({ x: 400, y: 80 });
        cy.get('[data-testid="viewport"]').realMouseMove(240, 80);
        cy.get('[data-testid="viewport"]').realMouseMove(60, 80);
        cy.get('[data-testid="viewport"]').realMouseUp({ x: 60, y: 80 });
        selected(draggable ? 1 : 0);
        if (draggable) {
          aligned(1);
          cy.then(() => {
            const [event, data] = changes.lastCall.args;
            expect(data).includes({ type: 'drag', index: 1 });
            expect(data.event).equals(event);
            expect(['mousedown', 'pointerdown']).includes(event.type);
          });
        } else {
          cy.then(() => expect(changes.callCount).equals(0));
        }
      });
    }

    it('uses current handlers for autoplay after rerender and stops timers when the root unmounts', () => {
      cy.clock(0, ['setTimeout', 'clearTimeout']);
      const changes = cy.stub();
      const Host = () => {
        const [version, setVersion] = React.useState('first');
        const [shown, setShown] = React.useState(true);
        return (
          <>
            <button data-testid="version" onClick={() => setVersion('latest')}>
              Version
            </button>
            <button data-testid="toggle" onClick={() => setShown(!shown)}>
              Toggle
            </button>
            {shown && (
              <Fixture
                circular
                autoplay
                autoplayInterval={1000}
                onActiveIndexChange={(_, data) => changes(version, data)}
              />
            )}
          </>
        );
      };
      mount(<Host />);
      cy.get('[data-testid="autoplay"]').click();
      cy.get('[data-testid="version"]').click();
      cy.tick(1000);
      selected(1);
      cy.then(() =>
        expect(changes.lastCall.args).deep.equals([
          'latest',
          { event: changes.lastCall.args[1].event, type: 'autoplay', index: 1 },
        ]),
      );
      cy.get('[data-testid="toggle"]').click();
      cy.get('[data-testid="fixture"]').should('not.exist');
      cy.then(() => changes.resetHistory());
      cy.tick(5000);
      cy.then(() => expect(changes.callCount).equals(0));
      cy.get('[data-testid="toggle"]').click();
      selected(0);
      cy.tick(2000);
      selected(0);
      cy.then(() => expect(changes.callCount).equals(0));
      cy.get('[data-testid="autoplay"]').click();
      cy.tick(1000);
      selected(1);
      cy.then(() => expect(changes.callCount).equals(1));
    });

    it('reconfigures autoplayInterval and resets timing on direct navigation', () => {
      cy.clock(0, ['setTimeout', 'clearTimeout']);
      const Interval = () => {
        const [interval, setInterval] = React.useState(1000);
        return (
          <>
            <button data-testid="interval" onClick={() => setInterval(2000)}>
              Interval
            </button>
            <Fixture circular autoplay autoplayInterval={interval} />
          </>
        );
      };
      mount(<Interval />);
      cy.get('[data-testid="autoplay"]').click();
      cy.get('[data-testid="interval"]').click();
      cy.tick(1999);
      selected(0);
      cy.tick(1);
      selected(1);
      navAt(0).click();
      selected(0);
      cy.tick(1999);
      selected(0);
      cy.tick(1);
      selected(1);
    });

    it('does not resume autoplay until both hover and focus have left the viewport', () => {
      cy.clock(0, ['setTimeout', 'clearTimeout']);
      mount(<Fixture circular autoplay autoplayInterval={1000} />);
      cy.get('[data-testid="autoplay"]').click();
      cy.get('[data-testid="viewport"]').realHover();
      cy.get('[data-testid="action-0"]').focus();
      cy.get('[data-testid="autoplay"]').realHover();
      cy.tick(2000);
      selected(0);
      cy.get('[data-testid="autoplay"]').focus();
      cy.tick(1000);
      selected(1);
    });

    it('unsubscribes removed context consumers and delivers one update per later reinitialization', () => {
      const update = cy.stub();
      const Subscriber = () => {
        const subscribe = useCarouselContext_unstable(ctx => ctx.subscribeForValues);
        useIsomorphicLayoutEffect(() => subscribe(update), [subscribe]);
        return null;
      };
      const Host = () => {
        const [shown, setShown] = React.useState(true);
        const [count, setCount] = React.useState(3);
        return (
          <>
            <button data-testid="toggle" onClick={() => setShown(!shown)}>
              Toggle consumer
            </button>
            <button data-testid="grow" onClick={() => setCount(value => value + 1)}>
              Grow
            </button>
            <Fixture count={count} observer={shown && <Subscriber />} />
          </>
        );
      };
      mount(<Host />);
      cy.get('[role="tab"]').should('have.length', 3);
      cy.then(() => {
        expect(update.callCount).greaterThan(0);
        update.resetHistory();
      });
      cy.get('[data-testid="toggle"]').click();
      cy.get('[data-testid="grow"]').click();
      cy.get('[role="tab"]').should('have.length', 4);
      cy.then(() => expect(update.callCount).equals(0));
      cy.get('[data-testid="toggle"]').click();
      cy.get('[data-testid="grow"]').click();
      cy.get('[role="tab"]').should('have.length', 5);
      cy.then(() => expect(update.callCount).equals(1));
    });

    it('supports root render-function children inside the same Carousel context', () => {
      mount(
        <Carousel style={{ width: 480 }} aria-label="Rendered gallery">
          {(
            Root: React.ElementType<React.HTMLAttributes<HTMLDivElement>>,
            rootProps: React.HTMLAttributes<HTMLDivElement>,
          ) => (
            <Root {...rootProps} data-testid="render-root">
              <CarouselViewport>
                <CarouselSlider>
                  <CarouselCard>One</CarouselCard>
                  <CarouselCard>Two</CarouselCard>
                </CarouselSlider>
              </CarouselViewport>
              <CarouselNav>
                {index => <CarouselNavButton data-testid={`nav-${index}`} aria-label={`Page ${index + 1}`} />}
              </CarouselNav>
              <ContextOutput />
            </Root>
          )}
        </Carousel>,
      );
      cy.get('[data-testid="render-root"]')
        .should('have.class', 'fui-Carousel')
        .and('have.attr', 'aria-label', 'Rendered gallery');
      selected(0);
      navAt(1).click();
      selected(1);
      contextIndex(1);
    });
  });

  it('reconfigures circular boundary behavior without remounting the consumer', () => {
    const Circular = () => {
      const [circular, setCircular] = React.useState(false);
      return (
        <>
          <button data-testid="circular" onClick={() => setCircular(true)}>
            Circular
          </button>
          <Fixture circular={circular} />
        </>
      );
    };
    mount(<Circular />);
    selected(0);
    cy.get('[data-testid="prev"]').should('be.disabled');
    cy.get('[data-testid="circular"]').click();
    cy.get('[data-testid="prev"]').should('not.be.disabled').click();
    selected(2);
    cy.get('[data-testid="next"]').click();
    selected(0);
  });

  it('reconfigures alignment whitespace and grouping from supported root props', () => {
    const Options = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button data-testid="options" onClick={() => setChanged(true)}>
            Options
          </button>
          <Fixture
            count={4}
            cardWidth={240}
            align={changed ? 'end' : 'start'}
            whitespace={changed}
            groupSize={changed ? 2 : 1}
          />
        </>
      );
    };
    mount(<Options />);
    selected(0);
    cy.get('[role="tab"]').should('have.length', 4);
    aligned(0);
    cy.get('[data-testid="options"]').click();
    cy.get('[role="tab"]').should('have.length', 2);
    cy.get('[data-testid="context"]').should('contain.text', '"groups":[[0,1],[2,3]]');
    navAt(1).click();
    selected(1);
    aligned(2);
  });

  it('uses native Tab order for active full-width content and skips inert offscreen actions', () => {
    mount(
      <>
        <button data-testid="before">Before</button>
        <Fixture />
      </>,
    );
    selected(0);
    cy.get('[data-testid="before"]').focus().realPress('Tab');
    cy.get('[data-testid="action-0"]').should('be.focused');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'data-testid', 'nav-0');
    cy.get('[data-testid="action-1"]').should('not.be.focused');
    cy.get('[data-testid="action-2"]').should('not.be.focused');
  });

  it('uses the latest drag handler after parent rerender with exact event and settled geometry', () => {
    const changes = cy.stub();
    const LatestDrag = () => {
      const [version, setVersion] = React.useState('first');
      return (
        <>
          <button data-testid="version" onClick={() => setVersion('latest')}>
            Version
          </button>
          <Fixture count={2} draggable onActiveIndexChange={(event, data) => changes(version, event, data)} />
        </>
      );
    };
    mount(<LatestDrag />);
    selected(0);
    cy.get('[data-testid="version"]').click();
    cy.get('[data-testid="viewport"]').realMouseDown({ x: 400, y: 80 });
    cy.get('[data-testid="viewport"]').realMouseMove(240, 80);
    cy.get('[data-testid="viewport"]').realMouseMove(60, 80);
    cy.get('[data-testid="viewport"]').realMouseUp({ x: 60, y: 80 });
    selected(1);
    aligned(1);
    cy.then(() => {
      expect(changes.lastCall.args[0]).equals('latest');
      expect(changes.lastCall.args[2]).includes({ type: 'drag', index: 1 });
      expect(changes.lastCall.args[2].event).equals(changes.lastCall.args[1]);
    });
  });

  it('stops autoplay when its opt-in control is removed while the root remains mounted', () => {
    cy.clock(0, ['setTimeout', 'clearTimeout']);
    const changes = cy.stub().as('changes');
    const Host = () => {
      const [present, setPresent] = React.useState(true);
      return (
        <>
          <button data-testid="remove" onClick={() => setPresent(false)}>
            Remove autoplay
          </button>
          <Fixture circular autoplay={present} autoplayInterval={1000} onActiveIndexChange={changes} />
        </>
      );
    };
    mount(<Host />);
    cy.get('[data-testid="autoplay"]').click();
    cy.tick(1000);
    selected(1);
    cy.get('[data-testid="remove"]').click();
    cy.get('[data-testid="autoplay"]').should('not.exist');
    cy.then(() => changes.resetHistory());
    cy.tick(3000);
    selected(1);
    cy.get('@changes').should('not.have.been.called');
    cy.get('[data-testid="next"]').click();
    selected(2);
    cy.get('@changes').should('have.been.calledOnce');
  });

  it('does not localize empty geometry or reannounce identical text for different indices', () => {
    const announce = cy.stub().as('announce');
    const localize = cy.stub().returns('Gallery');
    const Host = () => {
      const [count, setCount] = React.useState(0);
      return (
        <AnnounceProvider value={{ announce }}>
          <button data-testid="grow" onClick={() => setCount(3)}>
            Grow
          </button>
          <Fixture count={count} announcement={localize} />
        </AnnounceProvider>
      );
    };
    mount(<Host />);
    cy.get('[role="tab"]').should('not.exist');
    cy.then(() => expect(localize.callCount).equals(0));
    cy.get('[data-testid="grow"]').click();
    selected(0);
    cy.get('@announce').should('not.have.been.called');
    navAt(1).click();
    selected(1);
    cy.then(() => expect(localize.lastCall.args).deep.equals([1, 3, [[0], [1], [2]]]));
    cy.get('@announce').should('not.have.been.called');
  });

  it('preserves a supplied native root class and style through appearance updates', () => {
    const Appearance = () => {
      const [appearance, setAppearance] = React.useState<CarouselProps['appearance']>('flat');
      return (
        <>
          <button data-testid="appearance" onClick={() => setAppearance('elevated')}>
            Elevate
          </button>
          <Fixture appearance={appearance} className="consumer-root" style={{ width: 480 }} />
        </>
      );
    };
    mount(<Appearance />);
    cy.get('[data-testid="fixture"]').should('have.class', 'consumer-root').and('have.class', 'fui-Carousel');
    cy.get('[data-testid="appearance"]').click();
    cy.get('[data-testid="fixture"]').should('have.class', 'consumer-root').and('have.css', 'width', '480px');
    cy.get('[role="tabpanel"]').first().should('not.have.css', 'box-shadow', 'none');
    cy.get('[data-testid="next"]').click();
    selected(1);
  });

  it('allows a caller role and labelledby without inventing a root live region', () => {
    mount(
      <>
        <h2 id="gallery-label">Gallery</h2>
        <Fixture role="group" aria-label={undefined} aria-labelledby="gallery-label" />
      </>,
    );
    cy.get('[data-testid="fixture"]')
      .should('have.attr', 'role', 'group')
      .and('have.attr', 'aria-labelledby', 'gallery-label');
    cy.get('[data-testid="fixture"]').should('not.have.attr', 'aria-live');
    cy.get('#gallery-label').should('have.text', 'Gallery');
  });

  it('characterizes missing initial controls then connects stable grouped panel ids after resize', () => {
    const Resizable = () => {
      const [width, setWidth] = React.useState(480);
      return (
        <>
          <button data-testid="resize" onClick={() => setWidth(482)}>
            Resize
          </button>
          <Fixture count={4} cardWidth={240} groupSize={2} style={{ width }} />
        </>
      );
    };
    mount(<Resizable />);
    cy.get('[role="tab"]').should('have.length', 2).and('not.have.attr', 'aria-controls');
    let ids: string[];
    cy.get('[data-testid="resize"]').click();
    cy.get('[role="tabpanel"]').then($cards => {
      ids = Array.from($cards, card => card.id);
      expect(new Set(ids).size).equals(4);
      expect(ids.every(Boolean)).equals(true);
      navAt(0).should('have.attr', 'aria-controls', ids.slice(0, 2).join(' '));
      navAt(1).should('have.attr', 'aria-controls', ids.slice(2).join(' '));
    });
    navAt(1).click();
    selected(1);
    cy.get('[role="tabpanel"]').should($cards => expect(Array.from($cards, card => card.id)).deep.equals(ids));
    cy.get('[role="tablist"]').should('have.attr', 'aria-label', 'Pages');
  });

  it('makes offscreen full-width panels inert and exposes the settled active panel', () => {
    mount(<Fixture />);
    cy.get('[role="tabpanel"]').eq(0).should('have.attr', 'aria-hidden', 'false').and('not.have.attr', 'inert');
    cy.get('[role="tabpanel"]').eq(2).should('have.attr', 'aria-hidden', 'true').and('have.attr', 'inert');
    navAt(2).click();
    selected(2);
    aligned(2);
    cy.get('[role="tabpanel"]').eq(2).should('have.attr', 'aria-hidden', 'false').and('not.have.attr', 'inert');
    cy.get('[role="tabpanel"]').eq(0).should('have.attr', 'aria-hidden', 'true').and('have.attr', 'inert');
  });

  it('keeps cardFocus panels keyboard reachable and reports focus reason with matching event', () => {
    const changes = cy.stub();
    mount(<Fixture cardFocus onActiveIndexChange={changes} />);
    cy.get('[role="tabpanel"]').eq(0).focus().realPress('ArrowRight');
    cy.get('[role="tabpanel"]').eq(1).should('be.focused').and('not.have.attr', 'inert');
    selected(1);
    aligned(1);
    cy.then(() => {
      const [event, data] = changes.lastCall.args;
      expect(data).includes({ type: 'focus', index: 1 });
      expect(data.event).equals(event);
      expect(event.type).equals('focus');
    });
  });

  it('activates a navigation tab with native Space without assigning root arrow navigation', () => {
    const changes = cy.stub();
    mount(<Fixture onActiveIndexChange={changes} />);
    navAt(1).focus().realPress('Space');
    selected(1);
    cy.then(() => expect(changes.lastCall.args[1]).includes({ type: 'click', index: 1 }));
    cy.get('[role="tab"][aria-selected="true"]').should('have.length', 1);
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`moves next logically and physically in ${dir}`, () => {
      mountBase(
        <FluentProvider theme={teamsLightTheme} dir={dir}>
          <Fixture />
        </FluentProvider>,
      );
      selected(0);
      cy.get('[data-testid="next"]').click();
      selected(1);
      aligned(1);
      cy.get('[data-testid="prev"]').click();
      selected(0);
      aligned(0);
    });
  }

  it('keeps a single circular page finite when the engine cannot loop', () => {
    const changes = cy.stub().as('changes');
    mount(<Fixture count={1} circular onActiveIndexChange={changes} />);
    selected(0);
    cy.get('[data-testid="next"]').should('be.disabled');
    cy.get('[data-testid="prev"]').should('be.disabled');
    cy.get('@changes').should('not.have.been.called');
  });

  it('characterizes empty geometry: no tabs and previous disabled but next remains enabled', () => {
    const changes = cy.stub();
    mount(<Fixture count={0} onActiveIndexChange={changes} />);
    cy.get('[role="tab"]').should('not.exist');
    contextIndex(0);
    cy.get('[data-testid="prev"]').should('be.disabled');
    cy.get('[data-testid="next"]').should('not.be.disabled').click();
    cy.then(() => expect(changes.lastCall.args[1]).includes({ type: 'click', index: 0 }));
    contextIndex(0);
  });

  it('isolates sibling carousel state subscriptions and callbacks', () => {
    const first = cy.stub().as('first');
    const second = cy.stub().as('second');
    mount(
      <>
        <Fixture prefix="first" onActiveIndexChange={first} />
        <Fixture prefix="second" onActiveIndexChange={second} />
      </>,
    );
    cy.get('[data-testid="first"] [data-testid="next"]').click();
    cy.get('[data-testid="first"] [data-testid="nav-1"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="second"] [data-testid="nav-0"]').should('have.attr', 'aria-selected', 'true');
    cy.get('@first').should('have.been.calledOnce');
    cy.get('@second').should('not.have.been.called');
    cy.get('[data-testid="second"] [data-testid="nav-2"]').click();
    cy.get('[data-testid="first"] [data-testid="nav-1"]').should('have.attr', 'aria-selected', 'true');
    cy.get('@second').should('have.been.calledOnce');
  });

  it('does not start autoplay from autoplayInterval alone', () => {
    cy.clock(0, ['setTimeout', 'clearTimeout']);
    const changes = cy.stub().as('changes');
    mount(<Fixture autoplayInterval={1000} onActiveIndexChange={changes} />);
    selected(0);
    cy.tick(5000);
    selected(0);
    cy.get('@changes').should('not.have.been.called');
  });

  for (const interval of [1000, 4000]) {
    it(`starts only after opt-in and emits autoplay events at interval ${interval}`, () => {
      cy.clock(0, ['setTimeout', 'clearTimeout']);
      const changes = cy.stub();
      mount(<Fixture autoplay circular autoplayInterval={interval} onActiveIndexChange={changes} />);
      selected(0);
      cy.get('[data-testid="autoplay"]').should('have.attr', 'aria-pressed', 'false').click();
      cy.tick(interval - 1);
      selected(0);
      cy.tick(1);
      selected(1);
      cy.then(() => {
        const [event, data] = changes.lastCall.args;
        expect(data).includes({ type: 'autoplay', index: 1 });
        expect(data.event).equals(event);
        expect(event.type).equals('autoplay');
      });
      cy.get('[data-testid="autoplay"]').click().should('have.attr', 'aria-pressed', 'false');
      cy.tick(interval * 2);
      selected(1);
    });
  }

  it('pauses opted-in autoplay on viewport hover and resumes only on leave', () => {
    cy.clock(0, ['setTimeout', 'clearTimeout']);
    mount(<Fixture autoplay circular autoplayInterval={1000} />);
    cy.get('[data-testid="autoplay"]').click();
    cy.get('[data-testid="viewport"]').realHover();
    cy.tick(3000);
    selected(0);
    cy.get('[data-testid="autoplay"]').realHover();
    cy.tick(1000);
    selected(1);
  });

  it('pauses on viewport focus and resumes after focus leaves', () => {
    cy.clock(0, ['setTimeout', 'clearTimeout']);
    mount(<Fixture autoplay circular autoplayInterval={1000} />);
    cy.get('[data-testid="autoplay"]').click();
    cy.get('[data-testid="action-0"]').focus();
    cy.tick(3000);
    selected(0);
    cy.get('[data-testid="autoplay"]').focus();
    cy.tick(1000);
    selected(1);
  });

  it('initializes announcement text silently and deduplicates unchanged localization', () => {
    const announce = cy.stub().as('announce');
    const localize = cy.stub().callsFake((index: number, count: number) => `Slide ${index + 1} / ${count}`);
    mount(
      <AnnounceProvider value={{ announce }}>
        <Fixture announcement={localize} />
      </AnnounceProvider>,
    );
    selected(0);
    cy.get('@announce').should('not.have.been.called');
    navAt(1).click();
    cy.get('@announce').should('have.been.calledOnce').and('have.been.calledWith', 'Slide 2 / 3', { polite: true });
    cy.then(() => expect(localize.lastCall.args).deep.equals([1, 3, [[0], [1], [2]]]));
    navAt(1).click();
    cy.get('@announce').should('have.been.calledOnce');
    navAt(2).click();
    cy.get('@announce').should('have.been.calledTwice').and('have.been.calledWith', 'Slide 3 / 3', { polite: true });
  });

  it('characterizes the shared announcer assertive DOM fallback despite a polite root request', () => {
    mount(
      <AriaLiveAnnouncer>
        <Fixture announcement={(index, count) => `Gallery ${index + 1} of ${count}`} />
      </AriaLiveAnnouncer>,
    );
    selected(0);
    navAt(1).click();
    cy.get('[aria-live="assertive"]').should('contain.text', 'Gallery 2 of 3');
    cy.get('[data-testid="fixture"]').should('not.have.attr', 'aria-live');
  });

  it('balances forwarded root ref attachments and releases on unmount and fresh remount', () => {
    const ref = cy.stub().as('ref');
    const Host = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button data-testid="toggle" onClick={() => setShown(!shown)}>
            Toggle
          </button>
          {shown && <Fixture rootRef={ref} />}
        </>
      );
    };
    mount(<Host />);
    selected(0);
    cy.get('[data-testid="fixture"]').then($root => expect(ref.lastCall.args[0]).equals($root[0]));
    cy.get('[data-testid="toggle"]').click();
    cy.get('[data-testid="fixture"]').should('not.exist');
    cy.then(() => expect(ref.lastCall.args[0]).equals(null));
    cy.get('[data-testid="toggle"]').click();
    selected(0);
    cy.get('[data-testid="next"]').click();
    selected(1);
    cy.then(() => {
      const calls = ref.getCalls();
      const attached = calls.filter(call => call.args[0] !== null).length;
      const detached = calls.filter(call => call.args[0] === null).length;
      expect(attached).equals(detached + 1);
    });
    cy.get('[data-testid="toggle"]').click();
    cy.then(() => {
      const calls = ref.getCalls();
      expect(calls.filter(call => call.args[0] !== null).length).equals(
        calls.filter(call => call.args[0] === null).length,
      );
      expect(ref.lastCall.args[0]).equals(null);
    });
  });
});
