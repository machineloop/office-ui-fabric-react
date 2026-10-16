import 'cypress-real-events';
import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme, tokens } from '@fluentui/react-theme';
import { slot, useIsomorphicLayoutEffect } from '@fluentui/react-utilities';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import {
  CarouselNav,
  carouselNavClassNames,
  useCarouselNav_unstable,
  useCarouselNavStyles_unstable,
  renderCarouselNav_unstable,
} from './index';
import { useCarouselNavContextValues_unstable } from './useCarouselNavContextValues';
import type { CarouselNavProps } from './CarouselNav.types';
import { useCarouselNavContext } from './CarouselNavContext';
import { useCarouselNavIndexContext } from './CarouselNavIndexContext';
import { Carousel } from '../Carousel/Carousel';
import type { CarouselProps, CarouselUpdateData } from '../Carousel/Carousel.types';
import { CarouselCard } from '../CarouselCard/CarouselCard';
import { CarouselViewport } from '../CarouselViewport/CarouselViewport';
import { CarouselSlider } from '../CarouselSlider/CarouselSlider';
import { CarouselNavButton } from '../CarouselNavButton/CarouselNavButton';
import { CarouselNavImageButton } from '../CarouselNavImageButton/CarouselNavImageButton';
import { CarouselProvider, carouselContextDefaultValue, useCarouselContext_unstable } from '../CarouselContext';
import { useNavCoverageStyles } from './CarouselNav.cy.styles';
import { getTabster } from 'tabster';

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
      {JSON.stringify({ activeIndex, count: data?.navItemsCount, groups: data?.groupIndexList })}
    </output>
  );
};

type FixtureProps = CarouselProps & {
  prefix?: string;
  cards?: string[];
  half?: boolean;
  fixed?: boolean;
  navProps?: Omit<CarouselNavProps, 'children'>;
  renderButton?: CarouselNavProps['children'];
  top?: boolean;
};

const Fixture = ({
  prefix = 'nav',
  cards = ['a', 'b', 'c', 'd'],
  half = false,
  fixed = false,
  navProps,
  renderButton,
  top = false,
  children,
  ...props
}: FixtureProps) => {
  const styles = useNavCoverageStyles();
  const navigation = (
    <CarouselNav aria-label={`${prefix} pages`} data-testid={`${prefix}-root`} {...navProps}>
      {renderButton ??
        (index => <CarouselNavButton aria-label={`Page ${index + 1}`} data-testid={`${prefix}-button-${index}`} />)}
    </CarouselNav>
  );
  return (
    <Carousel aria-label={`${prefix} carousel`} className={styles.carousel} groupSize={1} {...props}>
      {top && navigation}
      <CarouselViewport data-testid={`${prefix}-viewport`}>
        <CarouselSlider>
          {cards.map(key => (
            <CarouselCard
              key={key}
              id={`${prefix}-${key}`}
              className={fixed ? styles.fixedCard : half ? styles.halfCard : styles.card}
            >
              <button>Action {key}</button>
            </CarouselCard>
          ))}
        </CarouselSlider>
      </CarouselViewport>
      {!top && navigation}
      <ContextOutput prefix={prefix} />
      {children}
    </Carousel>
  );
};

const root = (prefix = 'nav') => cy.get<HTMLDivElement>(`[data-testid="${prefix}-root"]`);
const button = (index: number, prefix = 'nav') =>
  cy.get<HTMLButtonElement>(`[data-testid="${prefix}-button-${index}"]`);
const selection = (index: number, prefix = 'nav') => {
  root(prefix).find('[role="tab"][aria-selected="true"]').should('have.length', 1);
  button(index, prefix).should('have.attr', 'aria-selected', 'true');
  cy.get(`[data-testid="${prefix}-context"]`).should('contain.text', `"activeIndex":${index}`);
};
const controls = (keys: string[]) => {
  root().find('[role="tab"]').should('have.length', keys.length);
  keys.forEach((key, index) => {
    button(index)
      .should('have.attr', 'aria-controls', `nav-${key}`)
      .should(elements => {
        const ids = elements[0].getAttribute('aria-controls')!.split(/\s+/);
        ids.forEach(id => {
          const panel = elements[0].ownerDocument.getElementById(id);
          expect(panel, `surviving tab ${index} controls existing ${id}`).not.to.equal(null);
          expect(panel!.getAttribute('role')).to.equal('tabpanel');
        });
      });
  });
};
const IndexOutput = () => {
  const index = useCarouselNavIndexContext();
  const { appearance } = useCarouselNavContext();
  return <span data-testid="index-output">{`${index}:${appearance ?? 'default'}`}</span>;
};
const computedColor = (element: HTMLElement, color: string) => {
  const probe = element.ownerDocument.createElement('span');
  probe.style.color = color;
  element.appendChild(probe);
  const result = element.ownerDocument.defaultView!.getComputedStyle(probe).color;
  probe.remove();
  return result;
};
const noRenderedItems = (elements: JQuery<HTMLElement>) => {
  expect(
    Array.from(elements[0].children).filter(child => !child.hasAttribute('data-tabster-dummy')).length,
    `no generated items (Tabster sentinels excluded): ${elements[0].innerHTML}`,
  ).to.equal(0);
  expect(elements[0].textContent, 'no generated text').to.equal('');
};

describe('CarouselNav documented API', () => {
  [0, 1, 5].forEach(count => {
    it(`renders exactly ${count} items with ascending zero-based callback indices per render`, () => {
      const render = cy.stub().callsFake((index: number) => <span data-testid="item">{index}</span>);
      mount(
        <CarouselNav totalSlides={count} aria-label="Standalone pages">
          {render}
        </CarouselNav>,
      );
      cy.get('[role="tablist"]').should('have.attr', 'aria-label', 'Standalone pages');
      cy.then(() => {
        const calls = render.getCalls().map(call => call.args);
        if (count === 0) {
          expect(calls).to.deep.equal([]);
        } else {
          expect(calls.length).to.be.greaterThan(0);
          expect(calls.length % count).to.equal(0);
          for (let start = 0; start < calls.length; start += count) {
            expect(calls.slice(start, start + count)).to.deep.equal(
              Array.from({ length: count }, (_, index) => [index]),
            );
          }
        }
      });

      cy.get('[role="tablist"]').find('[data-testid="item"]').should('have.length', count);
    });
  });
});

describe('CarouselNav edges and accessibility', () => {
  it('keeps the named tablist passive while real Tab enters the selected tab and exits the group', () => {
    mount(
      <>
        <button data-testid="before">Before navigation</button>
        <CarouselProvider value={{ ...carouselContextDefaultValue, activeIndex: 2 }}>
          <CarouselNav totalSlides={4} aria-label="nav pages" data-testid="nav-root">
            {index => <CarouselNavButton aria-label={`Page ${index + 1}`} data-testid={`nav-button-${index}`} />}
          </CarouselNav>
        </CarouselProvider>
        <button data-testid="after">After carousel</button>
      </>,
    );
    root().should('have.attr', 'role', 'tablist').and('not.have.attr', 'tabindex');
    button(2).should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="before"]')
      .focus()
      .should($before =>
        expect(
          getTabster($before[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement(),
          'native focus backend has observed the original preceding button',
        ).to.equal($before[0]),
      );
    cy.realPress('Tab');
    button(2).should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    button(2).should('be.focused');
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`${dir} horizontal arrows move focus in visual order without selecting and do not wrap`, () => {
      const change = cy.stub();
      mount(<Fixture onActiveIndexChange={change} />, dir);
      selection(0);
      button(0).focus();
      cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      button(1).should('be.focused');
      selection(0);
      cy.then(() => expect(change.callCount).to.equal(0));
      cy.realPress(dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
      button(0).should('be.focused');
      cy.realPress(dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
      button(0).should('be.focused');
      button(3).focus();
      cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      button(3).should('be.focused');
      selection(0);
    });

    it(`${dir} flex layout has actual nonoverlapping visual positions and no invented gap`, () => {
      mount(<Fixture />, dir);
      root().should('have.css', 'display', 'flex').and('have.css', 'flex-direction', 'row');
      root().should('have.css', 'align-items', 'center').and('have.css', 'justify-content', 'center');
      root().should('have.css', 'column-gap', 'normal');
      root()
        .find('[role="tab"]')
        .then(elements => {
          const rects = Array.from(elements, element => element.getBoundingClientRect());
          rects.forEach(rect => expect(rect.width).to.be.greaterThan(0));
          for (let index = 1; index < rects.length; index++) {
            if (dir === 'ltr') {
              expect(rects[index].left).to.be.at.least(rects[index - 1].right);
            } else {
              expect(rects[index].right).to.be.at.most(rects[index - 1].left);
            }
          }
        });
    });
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`real ${key} activates the focused tab with the exact click index`, () => {
      const change = cy.stub();
      mount(<Fixture onActiveIndexChange={change} />);
      button(1).focus();
      selection(0);
      cy.realPress(key);
      selection(1);
      button(1).should('be.focused');
      cy.then(() => {
        expect(change.callCount).to.equal(1);
        const [event, data] = change.firstCall.args;
        expect(event.type).to.equal('click');
        expect(data).to.deep.equal({ event, type: 'click', index: 1 });
      });
    });
  });

  it('vertical arrows do not acquire horizontal selection behavior', () => {
    const change = cy.stub();
    mount(<Fixture onActiveIndexChange={change} />);
    button(1).focus();
    cy.realPress('ArrowDown');
    button(1).should('be.focused');
    cy.realPress('ArrowUp');
    button(1).should('be.focused');
    selection(0);
    cy.then(() => expect(change.callCount).to.equal(0));
  });

  it('honors labelledby and caller role without inventing an orientation or live region', () => {
    mount(
      <>
        <span id="pages-label">Choose a page</span>
        <CarouselNav totalSlides={2} aria-labelledby="pages-label" role="group" id="labelled">
          {index => <CarouselNavButton aria-label={`Choice ${index + 1}`} />}
        </CarouselNav>
      </>,
    );
    cy.get('#labelled')
      .should('have.attr', 'role', 'group')
      .and('have.attr', 'aria-labelledby', 'pages-label')
      .and('not.have.attr', 'aria-orientation');
    cy.get('#labelled').should('not.have.attr', 'aria-live');
    cy.get('#pages-label').should('have.text', 'Choose a page');
    cy.get('#labelled').find('[role="tab"]').eq(1).should('have.attr', 'aria-label', 'Choice 2');
  });

  it('characterizes missing initial controls and proves relationships after real resize', () => {
    const Resize = () => {
      const [wide, setWide] = React.useState(false);
      return (
        <>
          <button onClick={() => setWide(true)}>Resize discovery</button>
          <Fixture style={{ width: wide ? 500 : 480 }} />
        </>
      );
    };
    mount(<Resize />);
    root()
      .find('[role="tab"]')
      .should('have.length', 4)
      .each(tab => {
        expect(tab[0].hasAttribute('aria-controls'), 'initial subscriptions do not replay').to.equal(false);
      });
    cy.contains('button', 'Resize discovery').click();
    ['a', 'b', 'c', 'd'].forEach((key, index) => {
      button(index).should('have.attr', 'aria-controls', `nav-${key}`);
      cy.get(`#nav-${key}`).should('have.attr', 'role', 'tabpanel');
    });
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`${dir} dynamic insertion removal and reorder retain exact live controls and index-based membership`, () => {
      const Dynamic = () => {
        const [cards, setCards] = React.useState(['a', 'b']);
        const [wide, setWide] = React.useState(false);
        return (
          <>
            <button onClick={() => setCards(['a', 'b', 'c'])}>Add card</button>
            <button onClick={() => setCards(['c', 'a', 'b'])}>Reorder cards</button>
            <button onClick={() => setCards(['c', 'a'])}>Remove card</button>
            <button onClick={() => setWide(true)}>Publish inserted controls</button>
            <Fixture cards={cards} style={{ width: wide ? 500 : 480 }} />
          </>
        );
      };
      mount(<Dynamic />, dir);
      root().find('[role="tab"]').should('have.length', 2);
      cy.contains('button', 'Add card').click();
      root().find('[role="tab"]').should('have.length', 3);
      // Newly inserted subscribers miss the first publication; resize must settle before checking every IDREF.
      cy.contains('button', 'Publish inserted controls').click();
      controls(['a', 'b', 'c']);
      cy.contains('button', 'Reorder cards').click();
      controls(['c', 'a', 'b']);
      button(0).realClick();
      cy.get('#nav-c').should(elements => {
        const viewport = elements[0].closest('.fui-CarouselViewport')!;
        expect(
          Math.abs(elements[0].getBoundingClientRect().left - viewport.getBoundingClientRect().left),
        ).to.be.lessThan(1);
      });
      cy.contains('button', 'Remove card').click();
      cy.get('#nav-b').should('not.exist');
      controls(['c', 'a']);
      button(0).focus();
      cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      button(1).should('be.focused');
      selection(0);
      button(1).click();
      selection(1);
      button(1).should('have.attr', 'aria-controls', 'nav-a');
      cy.get('#nav-a').should(elements => {
        const viewport = elements[0].closest('.fui-CarouselViewport')!;
        expect(
          Math.abs(elements[0].getBoundingClientRect().left - viewport.getBoundingClientRect().left),
        ).to.be.lessThan(1);
      });
    });
  });

  it('updates explicit count and callback closure without stale children', () => {
    const Dynamic = () => {
      const [count, setCount] = React.useState(2);
      const [label, setLabel] = React.useState('first');
      return (
        <>
          <button
            onClick={() => {
              setCount(4);
              setLabel('latest');
            }}
          >
            Update render callback
          </button>
          <button onClick={() => setCount(1)}>Shrink count</button>
          <CarouselNav totalSlides={count}>
            {index => (
              <CarouselNavButton aria-label={`${label} ${index}`}>
                <IndexOutput />
              </CarouselNavButton>
            )}
          </CarouselNav>
        </>
      );
    };
    mount(<Dynamic />);
    cy.get('[role="tablist"]')
      .find('[role="tab"]')
      .should('have.length', 2)
      .eq(1)
      .should('have.attr', 'aria-label', 'first 1');
    cy.contains('button', 'Update render callback').click();
    cy.get('[role="tablist"]')
      .find('[role="tab"]')
      .should('have.length', 4)
      .eq(3)
      .should('have.attr', 'aria-label', 'latest 3');
    cy.contains('button', 'Shrink count').click();
    cy.get('[role="tablist"]').find('[role="tab"]').should('have.length', 1).eq(0).should('have.text', '0:default');
  });

  it('empty and single parent geometries produce zero and one navigation items', () => {
    mount(
      <>
        <Fixture prefix="empty" cards={[]} />
        <Fixture prefix="single" cards={['a']} />
      </>,
    );
    root('empty').should('exist').find('[role="tab"]').should('have.length', 0);
    root('single').find('[role="tab"]').should('have.length', 1);
    selection(0, 'single');
    button(0, 'single').focus();
    cy.realPress('ArrowRight');
    button(0, 'single').should('be.focused').click();
    selection(0, 'single');
  });

  it('supports null fragment and inert callback content without synthesizing buttons', () => {
    mount(
      <CarouselNav totalSlides={4} aria-label="Custom content">
        {index =>
          index === 0 ? null : (
            <React.Fragment>
              <span data-testid="inert">{index}</span>
              <IndexOutput />
            </React.Fragment>
          )
        }
      </CarouselNav>,
    );
    cy.get('[role="tablist"]').find('[role="tab"],button').should('have.length', 0);
    cy.get('[data-testid="inert"]').should('have.length', 3);
    cy.get('[data-testid="index-output"]').then(items =>
      expect(Array.from(items, item => item.textContent)).to.deep.equal(['1:default', '2:default', '3:default']),
    );
  });

  it('a consumer-disabled button is skipped by arrows without a nonexistent Nav disabled API', () => {
    const change = cy.stub();
    mount(
      <Fixture
        onActiveIndexChange={change}
        renderButton={index => (
          <CarouselNavButton
            disabled={index === 1}
            aria-label={`Page ${index + 1}`}
            data-testid={`nav-button-${index}`}
          />
        )}
      />,
    );
    root().should('not.have.attr', 'disabled');
    root().should('not.have.attr', 'aria-disabled');
    button(1).should('be.disabled');
    button(0).realClick();
    selection(0);
    cy.then(() => expect(change.callCount).to.equal(1));
    button(1).realClick();
    selection(0);
    cy.then(() => expect(change.callCount).to.equal(1));
    button(0).should('not.be.disabled').focus();
    cy.realPress('ArrowRight');
    button(2).should('be.focused');
    cy.realPress('Enter');
    selection(2);
    cy.then(() => expect(change.getCalls().map(call => call.args[1].index)).to.deep.equal([0, 2]));
  });

  it('real Tab skips the native-disabled selected tab without forcing unreachable keyboard focus', () => {
    const select = cy.stub();
    mount(
      <>
        <button data-testid="before">Before</button>
        <CarouselProvider value={{ ...carouselContextDefaultValue, activeIndex: 1, selectPageByIndex: select }}>
          <CarouselNav totalSlides={3} data-testid="nav-root">
            {index => <CarouselNavButton disabled={index === 1} data-testid={`nav-button-${index}`} />}
          </CarouselNav>
        </CarouselProvider>
        <button data-testid="after">After</button>
      </>,
    );
    button(1).should('be.disabled').and('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    button(0).should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    button(2).should('be.focused');
    button(1).should('not.be.focused').and('have.attr', 'aria-selected', 'true');
    cy.then(() => expect(select.callCount).to.equal(0));
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`public disabledFocusable anchor blocks real ${key} with an enabled keyboard control`, () => {
      const change = cy.stub();
      mount(
        <Fixture
          onActiveIndexChange={change}
          renderButton={index => (
            <CarouselNavButton
              as="a"
              role="tab"
              disabledFocusable={index === 1}
              aria-label={`Page ${index + 1}`}
              data-testid={`nav-button-${index}`}
            />
          )}
        />,
      );
      button(1).should('have.attr', 'aria-disabled', 'true').focus().should('be.focused');
      cy.realPress(key);
      selection(0);
      cy.then(() => expect(change.callCount).to.equal(0));
      button(2).focus().should('be.focused');
      cy.realPress(key);
      selection(2);
      cy.then(() => expect(change.getCalls().map(call => call.args[1].index)).to.deep.equal([2]));
    });

    it(`characterizes public native disabledFocusable real ${key} activating despite aria-disabled`, () => {
      const change = cy.stub();
      mount(
        <Fixture
          onActiveIndexChange={change}
          renderButton={index => (
            <CarouselNavButton
              disabledFocusable={index === 1}
              aria-label={`Page ${index + 1}`}
              data-testid={`nav-button-${index}`}
            />
          )}
        />,
      );
      button(1).should('not.be.disabled').and('have.attr', 'aria-disabled', 'true').focus().should('be.focused');
      cy.realPress(key);
      selection(1);
      cy.then(() => expect(change.getCalls().map(call => call.args[1].index)).to.deep.equal([1]));
      button(2).focus().should('be.focused');
      cy.realPress(key);
      selection(2);
      cy.then(() => expect(change.getCalls().map(call => call.args[1].index)).to.deep.equal([1, 2]));
    });
  });

  it('keeps selection and discovery isolated between sibling carousels', () => {
    mount(
      <>
        <Fixture prefix="first" cards={['a', 'b']} />
        <Fixture prefix="second" cards={['a', 'b', 'c']} />
      </>,
    );
    root('first').find('[role="tab"]').should('have.length', 2);
    root('second').find('[role="tab"]').should('have.length', 3);
    button(1, 'first').click();
    selection(1, 'first');
    selection(0, 'second');
    button(2, 'second').click();
    selection(1, 'first');
    selection(2, 'second');
  });

  [false, true].forEach(dark => {
    it(`uses ${dark ? 'dark' : 'light'} theme margin and underlay tokens with consumer-owned gap`, () => {
      const Themed = () => {
        const styles = useNavCoverageStyles();
        return (
          <CarouselNav totalSlides={3} className={styles.gap}>
            {index => <CarouselNavButton aria-label={`Page ${index}`} />}
          </CarouselNav>
        );
      };
      mount(<Themed />, 'ltr', dark);
      const theme = dark ? teamsDarkTheme : teamsLightTheme;
      cy.get('[role="tablist"]')
        .should('have.css', 'margin-left', theme.spacingHorizontalS)
        .and('have.css', 'margin-right', theme.spacingHorizontalS)
        .and('have.css', 'column-gap', theme.spacingHorizontalM)
        .should(elements => {
          expect(elements[0].ownerDocument.defaultView!.getComputedStyle(elements[0]).backgroundColor).to.equal(
            computedColor(elements[0], theme.colorNeutralBackgroundAlpha),
          );
        });
    });
  });

  it('preserves consumer styling and allows finite overflowing navigation', () => {
    const Overflow = () => {
      const styles = useNavCoverageStyles();
      return (
        <CarouselNav totalSlides={12} className={styles.overflow} style={{ borderRadius: tokens.borderRadiusSmall }}>
          {index => <CarouselNavButton aria-label={`Page ${index + 1}`} />}
        </CarouselNav>
      );
    };
    mount(<Overflow />);
    cy.get('[role="tablist"]')
      .should('have.css', 'overflow-x', 'auto')
      .and('have.css', 'border-radius', teamsLightTheme.borderRadiusSmall);
    cy.get('[role="tablist"]').find('[role="tab"]').should('have.length', 12);
    cy.get('[role="tablist"]').then(elements => {
      expect(elements[0].clientWidth).to.equal(80);
      expect(elements[0].scrollWidth).to.be.greaterThan(elements[0].clientWidth);
    });
    cy.get('[role="tablist"]').find('[role="tab"]').last().focus().should('be.focused');
  });
});

describe('CarouselNav documented API', () => {
  it('provides index and brand contexts to arbitrary callback descendants', () => {
    mount(
      <CarouselNav totalSlides={3} appearance="brand">
        {index => (
          <section data-index={index}>
            <IndexOutput />
          </section>
        )}
      </CarouselNav>,
    );
    cy.get('[data-testid="index-output"]').then(items =>
      expect(Array.from(items, item => item.textContent)).to.deep.equal(['0:brand', '1:brand', '2:brand']),
    );
  });

  it('supports the story image-button alternative without manual index props', () => {
    mount(
      <Fixture
        renderButton={index => (
          <CarouselNavImageButton
            aria-label={`Preview ${index + 1}`}
            data-testid={`nav-button-${index}`}
            image={{ src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }}
          />
        )}
      />,
    );
    root().find('[role="tab"]').should('have.length', 4);
    button(2).find('img').should('have.attr', 'alt', '').and('have.attr', 'aria-hidden', 'true');
    button(2).click();
    selection(2);
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`story image-button real ${key} matches exact click selection payload and index once`, () => {
      const change = cy.stub();
      mount(
        <Fixture
          onActiveIndexChange={change}
          renderButton={index => (
            <CarouselNavImageButton
              aria-label={`Preview ${index + 1}`}
              data-testid={`nav-button-${index}`}
              image={{ src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }}
            />
          )}
        />,
      );
      root().find('[role="tab"]').should('have.length', 4);
      button(2).find('img').should('have.attr', 'alt', '').and('have.attr', 'aria-hidden', 'true');
      button(2).focus().should('be.focused');
      selection(0);
      cy.realPress(key);
      selection(2);
      button(2).should('be.focused');
      cy.then(() => {
        expect(change.callCount).to.equal(1);
        const [event, data] = change.firstCall.args;
        expect(event.type).to.equal('click');
        expect(data).to.deep.equal({ event, type: 'click', index: 2 });
      });
    });
  });

  [1, 2, 'auto' as const].forEach(groupSize => {
    it(`discovers actual parent membership for groupSize ${groupSize}`, () => {
      mount(<Fixture groupSize={groupSize} half={groupSize !== 1} />);
      const count = groupSize === 1 ? 4 : 2;
      root().find('[role="tab"]').should('have.length', count);
      cy.get('[data-testid="nav-context"]').should('contain.text', `"count":${count}`);
      button(count - 1).click();
      selection(count - 1);
    });
  });

  it('honors explicit totalSlides rather than parent membership', () => {
    mount(<Fixture navProps={{ totalSlides: 2 }} />);
    root().find('[role="tab"]').should('have.length', 2);
    cy.get('[data-testid="nav-context"]').should('contain.text', '"count":4');
    button(1).click();
    selection(1);
  });

  it('composes valid tab buttons and changes exactly the requested active page on click', () => {
    const change = cy.stub();
    mount(<Fixture onActiveIndexChange={change} />);
    selection(0);
    button(3).should('have.attr', 'type', 'button').click();
    selection(3);
    button(0).should('have.attr', 'aria-selected', 'false');
    cy.then(() => {
      expect(change.callCount).to.equal(1);
      expect(change.firstCall.args[1].index).to.equal(3);
      expect(change.firstCall.args[1].type).to.equal('click');
      expect(change.firstCall.args[1].event).to.equal(change.firstCall.args[0]);
    });
  });

  [0, 2].forEach(defaultActiveIndex => {
    it(`reflects the parent defaultActiveIndex ${defaultActiveIndex}`, () => {
      mount(<Fixture defaultActiveIndex={defaultActiveIndex} />);
      selection(defaultActiveIndex);
      button(defaultActiveIndex === 0 ? 1 : 0).click();
      selection(defaultActiveIndex === 0 ? 1 : 0);
    });
  });

  it('supports controlled parent feedback and subsequent external index changes', () => {
    const Controlled = () => {
      const [index, setIndex] = React.useState(1);
      return (
        <>
          <button onClick={() => setIndex(3)}>External page</button>
          <Fixture activeIndex={index} onActiveIndexChange={(_, data) => setIndex(data.index)} />
        </>
      );
    };
    mount(<Controlled />);
    selection(1);
    button(2).click();
    selection(2);
    cy.contains('button', 'External page').click();
    selection(3);
  });

  it('works with consumer-owned placement before the viewport', () => {
    mount(<Fixture top />);
    root().then(elements => {
      const next = elements[0].nextElementSibling;
      expect(next?.getAttribute('data-testid')).to.equal('nav-viewport');
    });
    button(1).click();
    selection(1);
  });

  it('applies the supported brand appearance while preserving the underlay', () => {
    mount(<Fixture navProps={{ appearance: 'brand' }} />);
    button(0).then(elements => {
      const view = elements[0].ownerDocument.defaultView!;
      expect(view.getComputedStyle(elements[0], '::after').backgroundColor).to.equal(
        computedColor(elements[0], teamsLightTheme.colorCompoundBrandBackground),
      );
    });
    root().should(elements => {
      expect(elements[0].ownerDocument.defaultView!.getComputedStyle(elements[0]).backgroundColor).to.equal(
        computedColor(elements[0], teamsLightTheme.colorNeutralBackgroundAlpha),
      );
    });
    button(1).click();
    selection(1);
  });
});

describe('CarouselNav unit and source derived regressions', () => {
  it('forwards an object ref to the stable native root and releases it on unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    const RefFixture = () => {
      const [count, setCount] = React.useState(2);
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setCount(3)}>Change ref content</button>
          <button onClick={() => setVisible(false)}>Unmount navigation</button>
          {visible && (
            <CarouselNav ref={ref} totalSlides={count} data-testid="ref-root">
              {index => <span>{index}</span>}
            </CarouselNav>
          )}
        </>
      );
    };
    mount(<RefFixture />);
    cy.get('[data-testid="ref-root"]').then(elements => {
      const node = elements[0];
      expect(ref.current).to.equal(node);
      expect(node.tagName).to.equal('DIV');
      cy.contains('button', 'Change ref content').click();
      cy.get('[data-testid="ref-root"]')
        .should('have.text', '012')
        .then(current => {
          expect(current[0]).to.equal(node);
          expect(ref.current).to.equal(node);
        });
    });
    cy.contains('button', 'Unmount navigation').click();
    cy.get('[data-testid="ref-root"]')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('replaces callback refs with balanced old release and current attachment', () => {
    const old = cy.stub();
    const latest = cy.stub();
    const RefFixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(true)}>Replace ref</button>
          <CarouselNav ref={changed ? latest : old} totalSlides={1} data-testid="ref-root">
            {index => <span>{index}</span>}
          </CarouselNav>
        </>
      );
    };
    mount(<RefFixture />);
    cy.get('[data-testid="ref-root"]').then(elements => {
      const node = elements[0];
      expect(old.lastCall.args[0]).to.equal(node);
      cy.contains('button', 'Replace ref').click();
      cy.get('[data-testid="ref-root"]').then(current => {
        expect(current[0]).to.equal(node);
        expect(old.lastCall.args[0]).to.equal(null);
        expect(latest.lastCall.args[0]).to.equal(node);
      });
    });
  });

  it('forwards native root attributes handlers and class without leaking internal props', () => {
    const click = cy.stub();
    const keydown = cy.stub();
    const targets: string[] = [];
    mount(
      <CarouselNav
        totalSlides={2}
        appearance="brand"
        id="native-root"
        title="Pagination"
        className="consumer-nav"
        lang="fr"
        aria-label="Pages"
        onClick={event => {
          targets.push(event.currentTarget.id);
          click(event);
        }}
        onKeyDown={keydown}
      >
        {index => <CarouselNavButton aria-label={`Page ${index}`} />}
      </CarouselNav>,
    );
    cy.get('#native-root')
      .should('have.class', carouselNavClassNames.root)
      .and('have.class', 'consumer-nav')
      .and('have.attr', 'title', 'Pagination')
      .and('have.attr', 'lang', 'fr');
    cy.get('#native-root').should('not.have.attr', 'totalSlides');
    cy.get('#native-root').should('not.have.attr', 'appearance');
    cy.get('#native-root').find('[role="tab"]').eq(1).click().focus();
    cy.realPress('Enter');
    cy.then(() => {
      expect(click.callCount).to.equal(2);
      expect(keydown.callCount).to.equal(1);
      expect(targets).to.deep.equal(['native-root', 'native-root']);
      expect(keydown.lastCall.args[0].key).to.equal('Enter');
    });
  });

  it('exported hook styles context and renderer retain root slot customization and indexed children', () => {
    const ref = React.createRef<HTMLDivElement>();
    const renderRoot: SlotRenderFunction<React.ComponentPropsWithRef<'div'>> = (Component, props) => (
      <Component {...props} data-rendered="true">
        {props.children}
        <span data-testid="root-extra">Extra</span>
      </Component>
    );
    const Composed = () => {
      const state = useCarouselNav_unstable(
        { totalSlides: 3, appearance: 'brand', 'aria-label': 'Composed navigation', children: () => <IndexOutput /> },
        ref,
      );
      const contexts = useCarouselNavContextValues_unstable(state);
      useCarouselNavStyles_unstable(state);
      state.root = slot.always({ ...state.root, children: renderRoot }, { elementType: 'div' });
      return renderCarouselNav_unstable(state, contexts);
    };
    mount(<Composed />);
    cy.get('[data-rendered="true"]')
      .should('have.class', carouselNavClassNames.root)
      .and('have.attr', 'role', 'tablist')
      .and('have.attr', 'aria-label', 'Composed navigation')
      .then(elements => expect(ref.current).to.equal(elements[0]));
    cy.get('[data-testid="root-extra"]').should('have.text', 'Extra');
    cy.get('[data-testid="index-output"]').then(items =>
      expect(Array.from(items, item => item.textContent)).to.deep.equal(['0:brand', '1:brand', '2:brand']),
    );
  });

  it('an uncontrolled Nav subscribes once in steady state and disposes membership on removal', () => {
    const listeners = new Set<(data: CarouselUpdateData) => void>();
    const subscribe = (listener: (data: CarouselUpdateData) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    };
    const data = (count: number): CarouselUpdateData => ({
      navItemsCount: count,
      activeIndex: 0,
      groupIndexList: [],
      slideNodes: [],
      canLoop: false,
    });
    const Subscription = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <CarouselProvider value={{ ...carouselContextDefaultValue, subscribeForValues: subscribe }}>
          <button onClick={() => listeners.forEach(listener => listener(data(3)))}>Publish three</button>
          <button onClick={() => setVisible(false)}>Remove subscriber</button>
          <button onClick={() => setVisible(true)}>Restore subscriber</button>
          <button onClick={() => listeners.forEach(listener => listener(data(1)))}>Publish one</button>
          {visible && <CarouselNav data-testid="subscriber">{index => <IndexOutput />}</CarouselNav>}
        </CarouselProvider>
      );
    };
    mount(<Subscription />);
    cy.get('[data-testid="subscriber"]')
      .should(noRenderedItems)
      .then(() => expect(listeners.size).to.equal(1));
    cy.contains('button', 'Publish three').click();
    cy.get('[data-testid="subscriber"]')
      .find('[data-testid="index-output"]')
      .should('have.length', 3)
      .then(() => expect(listeners.size).to.equal(1));
    cy.contains('button', 'Remove subscriber').click();
    cy.get('[data-testid="subscriber"]')
      .should('not.exist')
      .then(() => expect(listeners.size).to.equal(0));
    cy.contains('button', 'Publish three').click();
    cy.contains('button', 'Restore subscriber').click();
    cy.get('[data-testid="subscriber"]')
      .should(noRenderedItems)
      .then(() => expect(listeners.size).to.equal(1));
    cy.contains('button', 'Publish one').click();
    cy.get('[data-testid="subscriber"]').find('[data-testid="index-output"]').should('have.length', 1);
  });

  it('replaces the discovery subscription when its parent context identity changes', () => {
    const oldListeners = new Set<(data: CarouselUpdateData) => void>();
    const latestListeners = new Set<(data: CarouselUpdateData) => void>();
    const subscribeOld = (listener: (data: CarouselUpdateData) => void) => {
      oldListeners.add(listener);
      return () => {
        oldListeners.delete(listener);
      };
    };
    const subscribeLatest = (listener: (data: CarouselUpdateData) => void) => {
      latestListeners.add(listener);
      return () => {
        latestListeners.delete(listener);
      };
    };
    const SwapContext = () => {
      const [latest, setLatest] = React.useState(false);
      return (
        <CarouselProvider
          value={{ ...carouselContextDefaultValue, subscribeForValues: latest ? subscribeLatest : subscribeOld }}
        >
          <button onClick={() => setLatest(true)}>Replace context</button>
          <button
            onClick={() =>
              latestListeners.forEach(listener =>
                listener({
                  navItemsCount: 2,
                  activeIndex: 0,
                  groupIndexList: [],
                  slideNodes: [],
                  canLoop: false,
                }),
              )
            }
          >
            Publish latest
          </button>
          <CarouselNav data-testid="subscriber">{() => <IndexOutput />}</CarouselNav>
        </CarouselProvider>
      );
    };
    mount(<SwapContext />);
    cy.get('[data-testid="subscriber"]').then(() => {
      expect(oldListeners.size).to.equal(1);
      expect(latestListeners.size).to.equal(0);
    });
    cy.contains('button', 'Replace context').click();
    cy.get('[data-testid="subscriber"]').then(() => {
      expect(oldListeners.size).to.equal(0);
      expect(latestListeners.size).to.equal(1);
    });
    cy.contains('button', 'Publish latest').click();
    cy.get('[data-testid="subscriber"]').find('[data-testid="index-output"]').should('have.length', 2);
  });

  it('keeps a controlled count zero across real parent discoveries and membership updates', () => {
    const ControlledCount = () => {
      const [cards, setCards] = React.useState(['a', 'b']);
      return (
        <>
          <button onClick={() => setCards(['a', 'b', 'c'])}>Add controlled card</button>
          <Fixture cards={cards} navProps={{ totalSlides: 0 }} />
        </>
      );
    };
    mount(<ControlledCount />);
    root().should(noRenderedItems);
    cy.get('[data-testid="nav-context"]').should('contain.text', '"count":2');
    cy.contains('button', 'Add controlled card').click();
    cy.get('[data-testid="nav-context"]').should('contain.text', '"count":3');
    root().should(noRenderedItems);
  });

  it('uses the latest root and child click callbacks and honors child preventDefault', () => {
    const oldRoot = cy.stub();
    const latestRoot = cy.stub();
    const oldChild = cy.stub();
    const latestChild = cy.stub();
    const change = cy.stub();
    const Events = () => {
      const [latest, setLatest] = React.useState(false);
      const [veto, setVeto] = React.useState(false);
      return (
        <>
          <button onClick={() => setLatest(true)}>Latest handlers</button>
          <button onClick={() => setVeto(true)}>Veto child</button>
          <Fixture
            onActiveIndexChange={change}
            navProps={{ onClick: latest ? latestRoot : oldRoot }}
            renderButton={index => (
              <CarouselNavButton
                data-testid={`nav-button-${index}`}
                aria-label={`Page ${index + 1}`}
                onClick={event => {
                  (latest ? latestChild : oldChild)(index);
                  if (veto) {
                    event.preventDefault();
                  }
                }}
              />
            )}
          />
        </>
      );
    };
    mount(<Events />);
    button(1).click();
    selection(1);
    cy.contains('button', 'Latest handlers').click();
    button(2).click();
    selection(2);
    cy.contains('button', 'Veto child').click();
    button(3).click();
    selection(2);
    cy.then(() => {
      expect(oldRoot.callCount).to.equal(1);
      expect(oldChild.getCalls().map(call => call.args)).to.deep.equal([[1]]);
      expect(latestRoot.callCount).to.equal(2);
      expect(latestChild.getCalls().map(call => call.args)).to.deep.equal([[2], [3]]);
      expect(change.getCalls().map(call => call.args[1].index)).to.deep.equal([1, 2]);
    });
  });

  it('root bubble cancellation is too late to veto the child selection', () => {
    const change = cy.stub();
    mount(<Fixture onActiveIndexChange={change} navProps={{ onClick: event => event.preventDefault() }} />);
    button(1).click();
    selection(1);
    cy.then(() => expect(change.callCount).to.equal(1));
  });

  it('characterizes Tabster intercepting handled arrows before consumer React key capture', () => {
    const capture = cy.stub();
    mount(
      <Fixture
        navProps={{
          onKeyDownCapture: event => {
            if (event.key === 'ArrowRight') {
              event.preventDefault();
            }
            capture(event.key, event.defaultPrevented);
          },
        }}
      />,
    );
    button(0).focus();
    cy.realPress('ArrowRight');
    button(1).should('be.focused');
    selection(0);
    cy.then(() => expect(capture.callCount).to.equal(0));
    cy.realPress('Enter');
    selection(1);
    cy.then(() => expect(capture.getCalls().map(call => call.args)).to.deep.equal([['Enter', false]]));
  });

  it('selected class styling and ARIA follow the active index without becoming inert', () => {
    mount(<Fixture />);
    let selectedClass = '';
    let unselectedClass = '';
    button(0).then(elements => {
      selectedClass = elements[0].className;
    });
    button(1).then(elements => {
      unselectedClass = elements[0].className;
    });
    button(1).click();
    selection(1);
    button(1).should(elements => {
      expect(elements[0].className).to.equal(selectedClass);
      expect(elements[0].className).not.to.equal(unselectedClass);
      expect(elements[0].inert).to.equal(false);
    });
    button(0).should(elements => {
      expect(elements[0].className).to.equal(unselectedClass);
      expect(elements[0].inert).to.equal(false);
      expect(elements[0].getAttribute('aria-hidden')).to.equal(null);
    });
  });

  it('updates appearance contexts and restores default without replacing indexed button nodes', () => {
    const Appearance = () => {
      const [brand, setBrand] = React.useState(false);
      return (
        <>
          <button onClick={() => setBrand(value => !value)}>Toggle appearance</button>
          <CarouselNav totalSlides={2} appearance={brand ? 'brand' : undefined}>
            {index => (
              <CarouselNavButton data-testid={`appearance-${index}`} aria-label={`Page ${index}`}>
                <IndexOutput />
              </CarouselNavButton>
            )}
          </CarouselNav>
        </>
      );
    };
    mount(<Appearance />);
    cy.get('[data-testid="appearance-0"]').then(elements => {
      const node = elements[0];
      const originalClass = node.className;
      cy.contains('button', 'Toggle appearance').click();
      cy.get('[data-testid="appearance-0"]')
        .should('have.text', '0:brand')
        .then(current => {
          expect(current[0]).to.equal(node);
          expect(current[0].className).not.to.equal(originalClass);
        });
      cy.contains('button', 'Toggle appearance').click();
      cy.get('[data-testid="appearance-0"]')
        .should('have.text', '0:default')
        .then(current => {
          expect(current[0]).to.equal(node);
          expect(current[0].className).to.equal(originalClass);
        });
    });
  });

  it('nested Nav providers isolate appearance and index and do not leak to siblings', () => {
    mount(
      <>
        <CarouselNav totalSlides={2} appearance="brand">
          {index => (
            <section data-testid={`outer-${index}`}>
              <IndexOutput />
              <CarouselNav totalSlides={1}>{() => <IndexOutput />}</CarouselNav>
            </section>
          )}
        </CarouselNav>
        <div data-testid="outside">
          <IndexOutput />
        </div>
      </>,
    );
    cy.get('[data-testid="outer-1"]').children('[data-testid="index-output"]').should('have.text', '1:brand');
    cy.get('[data-testid="outer-1"]')
      .find('[role="tablist"] [data-testid="index-output"]')
      .should('have.text', '0:default');
    cy.get('[data-testid="outside"]').should('have.text', '0:default');
  });

  it('standalone uncontrolled Nav stays empty rather than discovering arbitrary DOM buttons', () => {
    mount(
      <>
        <button>Unregistered content</button>
        <CarouselNav data-testid="standalone">{() => <CarouselNavButton />}</CarouselNav>
      </>,
    );
    cy.get('[data-testid="standalone"]').should(noRenderedItems).and('have.attr', 'role', 'tablist');
    cy.contains('button', 'Unregistered content').click();
    cy.get('[data-testid="standalone"]').should(noRenderedItems);
  });

  it('multiple elements returned for one index share that index rather than registering extra pages', () => {
    mount(
      <Fixture
        renderButton={index => (
          <>
            <CarouselNavButton aria-label={`Primary ${index}`} data-testid={`nav-button-${index}`} />
            <CarouselNavButton aria-label={`Secondary ${index}`} data-testid={`duplicate-${index}`} />
          </>
        )}
      />,
    );
    root().find('[role="tab"]').should('have.length', 8);
    cy.get('[data-testid="duplicate-2"]').click();
    button(2).should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="duplicate-2"]').should('have.attr', 'aria-selected', 'true');
    root().find('[aria-selected="true"]').should('have.length', 2);
    cy.get('[data-testid="nav-context"]').should('contain.text', '"count":4').and('contain.text', '"activeIndex":2');
  });

  it('responsive automatic grouping updates the finite render count using actual measured card widths', () => {
    const Resize = () => {
      const [wide, setWide] = React.useState(false);
      return (
        <>
          <button onClick={() => setWide(true)}>Widen automatic groups</button>
          <Fixture cards={['a', 'b', 'c', 'd', 'e', 'f']} fixed groupSize="auto" style={{ width: wide ? 480 : 320 }} />
        </>
      );
    };
    mount(<Resize />);
    cy.get('#nav-a').should(elements => expect(elements[0].getBoundingClientRect().width).to.equal(160));
    root().find('[role="tab"]').should('have.length', 3);
    cy.contains('button', 'Widen automatic groups').click();
    root().find('[role="tab"]').should('have.length', 2);
    button(0).should('have.attr', 'aria-controls', 'nav-a nav-b nav-c');
    button(1).should('have.attr', 'aria-controls', 'nav-d nav-e nav-f').click();
    selection(1);
  });

  it('reentering a group uses selected default rather than memorizing the previously arrow-focused tab', () => {
    mount(
      <>
        <button data-testid="before">Before</button>
        <CarouselNav totalSlides={3}>
          {index => <CarouselNavButton data-testid={`nav-button-${index}`} aria-label={`Page ${index}`} />}
        </CarouselNav>
        <button data-testid="after">After</button>
      </>,
    );
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    button(0).should('be.focused');
    cy.realPress('ArrowRight');
    button(1).should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    button(0).should('be.focused');
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`${dir} indexed click aligns the actual requested card in the viewport`, () => {
      mount(<Fixture />, dir);
      const aligned = (key: string) =>
        cy.get(`#nav-${key}`).should(elements => {
          const viewport = elements[0].closest('.fui-CarouselViewport')!;
          const cardRect = elements[0].getBoundingClientRect();
          const viewportRect = viewport.getBoundingClientRect();
          expect(viewportRect.width).to.equal(480);
          expect(cardRect.width).to.equal(480);
          expect(Math.abs(cardRect.left - viewportRect.left)).to.be.lessThan(1);
        });
      aligned('a');
      button(3).click();
      selection(3);
      aligned('d');
      button(1).click();
      selection(1);
      aligned('b');
    });

    it(`${dir} Home and End move focus to finite boundaries without changing the active page`, () => {
      const change = cy.stub();
      mount(<Fixture onActiveIndexChange={change} />, dir);
      button(1).focus();
      cy.realPress('End');
      button(3).should('be.focused');
      cy.realPress('Home');
      button(0).should('be.focused');
      selection(0);
      cy.then(() => expect(change.callCount).to.equal(0));
    });
  });

  it('runtime groupSize changes update count and multi-panel controls without assigning manual button values', () => {
    const Groups = () => {
      const [grouped, setGrouped] = React.useState(false);
      return (
        <>
          <button onClick={() => setGrouped(true)}>Group pages</button>
          <Fixture half groupSize={grouped ? 2 : 1} />
        </>
      );
    };
    mount(<Groups />);
    root().find('[role="tab"]').should('have.length', 4);
    cy.contains('button', 'Group pages').click();
    root().find('[role="tab"]').should('have.length', 2);
    button(0).should('have.attr', 'aria-controls', 'nav-a nav-b');
    button(1).should('have.attr', 'aria-controls', 'nav-c nav-d').click();
    selection(1);
  });

  it('consumer Griffel root overrides are retained and themed gap is reflected in real geometry', () => {
    const Consumer = () => {
      const styles = useNavCoverageStyles();
      return (
        <div data-testid="gap-owner" className={styles.gap}>
          <CarouselNav totalSlides={3} className={styles.consumer} style={{ gap: tokens.spacingHorizontalM }}>
            {index => <CarouselNavButton aria-label={`Page ${index}`} />}
          </CarouselNav>
        </div>
      );
    };
    mount(<Consumer />);
    cy.get('[role="tablist"]')
      .should('have.css', 'justify-content', 'flex-start')
      .and('have.css', 'column-gap', teamsLightTheme.spacingHorizontalM);
    cy.get('[role="tablist"]').then(elements => {
      const view = elements[0].ownerDocument.defaultView!;
      expect(view.getComputedStyle(elements[0]).backgroundColor).to.equal(
        computedColor(elements[0], teamsLightTheme.colorNeutralBackground1),
      );
      const tabs = elements[0].querySelectorAll('[role="tab"]');
      expect(tabs.length).to.equal(3);
      expect(tabs[1].getBoundingClientRect().left - tabs[0].getBoundingClientRect().right).to.equal(
        parseFloat(teamsLightTheme.spacingHorizontalM),
      );
    });
  });

  it('characterizes rejected controlled parent requests keeping Nav selected state while physical page moves', () => {
    const change = cy.stub();
    mount(<Fixture activeIndex={0} onActiveIndexChange={change} />);
    selection(0);
    button(2).click();
    selection(0);
    button(2).should('have.attr', 'aria-selected', 'false');
    cy.get('#nav-c').should(elements => {
      const viewport = elements[0].closest('.fui-CarouselViewport')!;
      expect(Math.abs(elements[0].getBoundingClientRect().left - viewport.getBoundingClientRect().left)).to.be.lessThan(
        1,
      );
    });
    cy.then(() => {
      expect(change.callCount).to.equal(1);
      expect(change.firstCall.args[1].index).to.equal(2);
    });
  });

  it('story-style callback replacement constructs image buttons with the latest index and active state', () => {
    const SwitchRender = () => {
      const [image, setImage] = React.useState(false);
      return (
        <>
          <button onClick={() => setImage(true)}>Use previews</button>
          <Fixture
            renderButton={index =>
              image ? (
                <CarouselNavImageButton
                  data-testid={`nav-button-${index}`}
                  aria-label={`Preview ${index + 1}`}
                  image={{ src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }}
                />
              ) : (
                <CarouselNavButton data-testid={`nav-button-${index}`} aria-label={`Page ${index + 1}`} />
              )
            }
          />
        </>
      );
    };
    mount(<SwitchRender />);
    button(2).click();
    selection(2);
    cy.contains('button', 'Use previews').click();
    root().find('[role="tab"]').should('have.length', 4);
    button(2).should('have.attr', 'aria-label', 'Preview 3').find('img').should('have.length', 1);
    selection(2);
    button(1).click();
    selection(1);
    button(1).should('have.attr', 'aria-label', 'Preview 2');
  });
});
