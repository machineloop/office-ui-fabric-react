import 'cypress-real-events';
import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsDarkTheme, teamsLightTheme } from '@fluentui/react-theme';
import { slot } from '@fluentui/react-utilities';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import { useARIAButtonProps } from '@fluentui/react-aria';
import {
  CarouselNavContainer,
  carouselNavContainerClassNames,
  renderCarouselNavContainer_unstable,
  useCarouselNavContainer_unstable,
  useCarouselNavContainerStyles_unstable,
} from './index';
import type { CarouselNavContainerProps } from './CarouselNavContainer.types';
import { CarouselProvider, carouselContextDefaultValue } from '../CarouselContext';
import type { CarouselContextValue } from '../CarouselContext.types';
import { Carousel } from '../Carousel/Carousel';
import type { CarouselProps, CarouselUpdateData } from '../Carousel/Carousel.types';
import { CarouselCard } from '../CarouselCard/CarouselCard';
import { CarouselSlider } from '../CarouselSlider/CarouselSlider';
import { CarouselViewport } from '../CarouselViewport/CarouselViewport';
import { CarouselNav } from '../CarouselNav/CarouselNav';
import { CarouselNavButton } from '../CarouselNavButton/CarouselNavButton';
import { CarouselNavImageButton } from '../CarouselNavImageButton/CarouselNavImageButton';
import { useContainerCoverageStyles } from './CarouselNavContainer.cy.styles';

const layouts = ['inline', 'inline-wide', 'overlay', 'overlay-wide', 'overlay-expanded'] as const;
const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  mountBase(
    <FluentProvider dir={dir} theme={dark ? teamsDarkTheme : teamsLightTheme}>
      {element}
    </FluentProvider>,
  );
const nav = () => cy.get<HTMLElement>('[data-testid="container"]');
const control = (name: 'prev' | 'next' | 'autoplay') =>
  cy.get<HTMLButtonElement>(`.${carouselNavContainerClassNames[name]}`);
const style = (element: Element) => element.ownerDocument.defaultView!.getComputedStyle(element);
const token = (element: Element, name: keyof typeof teamsLightTheme) =>
  style(element).getPropertyValue(`--${name}`).trim();

const PassiveFixture = React.forwardRef<
  HTMLDivElement,
  CarouselNavContainerProps & { value?: Partial<CarouselContextValue> }
>(({ value, children = <div data-testid="child">Pages</div>, ...props }, ref) => {
  const styles = useContainerCoverageStyles();
  return (
    <CarouselProvider value={{ ...carouselContextDefaultValue, circular: true, ...value }}>
      <div data-testid="frame" className={styles.frame}>
        <CarouselNavContainer ref={ref} data-testid="container" {...props}>
          {children}
        </CarouselNavContainer>
      </div>
    </CarouselProvider>
  );
});

const RealFixture = ({
  container,
  prefix = 'real',
  cards = ['a', 'b', 'c'],
  ...props
}: CarouselProps & { container?: CarouselNavContainerProps; prefix?: string; cards?: string[] }) => {
  const styles = useContainerCoverageStyles();
  return (
    <Carousel aria-label={`${prefix} carousel`} className={styles.carousel} groupSize={1} {...props}>
      <CarouselViewport>
        <CarouselSlider>
          {cards.map(key => (
            <CarouselCard id={`${prefix}-${key}`} key={key} className={styles.card}>
              Panel {key}
            </CarouselCard>
          ))}
        </CarouselSlider>
      </CarouselViewport>
      <CarouselNavContainer
        data-testid={`${prefix}-container`}
        next={{ 'aria-label': 'Next page' }}
        prev={{ 'aria-label': 'Previous page' }}
        {...container}
      >
        <CarouselNav aria-label={`${prefix} pages`}>
          {index => <CarouselNavButton data-testid={`${prefix}-page-${index}`} aria-label={`Page ${index + 1}`} />}
        </CarouselNav>
      </CarouselNavContainer>
    </Carousel>
  );
};

describe('CarouselNavContainer documentation', () => {
  it('defaults to a passive inline div with prev child next order, icons, no autoplay or invented names', () => {
    mount(<PassiveFixture />);
    nav().should('have.prop', 'tagName', 'DIV');
    nav().should('not.have.attr', 'role');
    nav().should('not.have.attr', 'tabindex');
    nav().should('not.have.attr', 'data-tabster');
    nav().should('not.have.attr', 'aria-live');
    nav()
      .children()
      .then(children => {
        expect(children.length).to.equal(3);
        expect(children[0].classList.contains(carouselNavContainerClassNames.prev)).to.equal(true);
        expect(children[1].getAttribute('data-testid')).to.equal('child');
        expect(children[2].classList.contains(carouselNavContainerClassNames.next)).to.equal(true);
      });

    control('prev').find('svg').should('have.length', 1).and('have.attr', 'aria-hidden', 'true');
    control('next').find('svg').should('have.length', 1);
    control('prev').should('not.have.attr', 'aria-label');
    control('next').should('not.have.attr', 'aria-label');
    control('autoplay').should('not.exist');
    nav().should('have.css', 'pointer-events', 'none').and('have.css', 'display', 'flex');
    control('prev').should('have.css', 'pointer-events', 'all');
  });
});

describe('CarouselNavContainer edges and accessibility', () => {
  afterEach(() =>
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    ),
  );

  (['prev', 'next', 'autoplay'] as const).forEach(name => {
    (['pointer', 'Enter', 'Space'] as const).forEach(action => {
      it(`${name} real ${action} invokes context then current native callback then root bubble`, () => {
        const calls: string[] = [];
        const enable = cy.stub();
        const slotProps = { 'aria-label': name, onClick: () => calls.push('user') };
        mount(
          <PassiveFixture
            autoplay={{ 'aria-label': 'Autoplay', ...(name === 'autoplay' ? slotProps : {}) }}
            prev={name === 'prev' ? slotProps : undefined}
            next={name === 'next' ? slotProps : undefined}
            onClick={() => calls.push('bubble')}
            value={{
              selectPageByDirection: (_event, direction) => {
                calls.push(direction);
                return 1;
              },
              resetAutoplay: () => calls.push('reset'),
              enableAutoplay: enable,
            }}
          />,
        );
        cy.then(() => calls.splice(0));
        if (action === 'pointer') {
          control(name).realClick();
        } else {
          control(name).focus();
          cy.realPress(action);
        }
        cy.then(() => {
          expect(calls).to.deep.equal(name === 'autoplay' ? ['user', 'bubble'] : [name, 'reset', 'user', 'bubble']);
          expect(enable.lastCall.args).to.deep.equal([name === 'autoplay']);
        });
      });
    });
  });

  (['prev', 'next', 'autoplay'] as const).forEach(name => {
    it(`${name} native disabled slot suppresses pointer and skips Tab with an enabled positive control`, () => {
      const click = cy.stub();
      const direction = cy.stub().returns(1);
      const Fixture = () => {
        const styles = useContainerCoverageStyles();
        return (
          <>
            <button id="before">Before</button>
            <PassiveFixture
              value={{ selectPageByDirection: direction }}
              prev={name === 'prev' ? { disabled: true, onClick: click } : null}
              next={name === 'next' ? { disabled: true, onClick: click } : null}
              autoplay={name === 'autoplay' ? { disabled: true, onClick: click } : null}
            >
              <button id="positive" className={styles.child} onClick={click}>
                Positive
              </button>
            </PassiveFixture>
          </>
        );
      };
      mount(<Fixture />);
      control(name).should('be.disabled').realClick();
      cy.then(() => {
        expect(click.callCount).to.equal(0);
        expect(direction.callCount).to.equal(0);
      });
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#positive').should('be.focused').realClick();
      cy.then(() => expect(click.callCount).to.equal(1));
    });
  });

  it('characterizes inherited child NavButton disabledFocusable click bug against guarded slot next', () => {
    const selected = cy.stub();
    const direction = cy.stub().returns(1);
    const Guarded = () => {
      const props = useARIAButtonProps('button', { disabled: true, disabledFocusable: true, onClick: selected });
      return (
        <button id="guarded" {...props}>
          Guarded
        </button>
      );
    };
    mount(
      <PassiveFixture
        value={{ selectPageByDirection: direction, selectPageByIndex: selected }}
        next={{ disabled: true, disabledFocusable: true, 'aria-label': 'Disabled next' }}
        prev={null}
      >
        <CarouselNav totalSlides={1} aria-label="Pages">
          {() => <CarouselNavButton id="known-bug" disabled disabledFocusable aria-label="Disabled page" />}
        </CarouselNav>
        <Guarded />
      </PassiveFixture>,
    );
    control('next').realClick();
    cy.get('#guarded').realClick();
    cy.then(() => {
      expect(direction.callCount).to.equal(0);
      expect(selected.callCount).to.equal(0);
    });
    cy.get('#known-bug').realClick();
    cy.then(() => expect(selected.callCount).to.equal(1));
  });

  it('consumer click prevention is too late to veto slot navigation; capture prevention is early enough', () => {
    const calls: string[] = [];
    mount(
      <PassiveFixture
        next={{
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            calls.push('user');
            event.preventDefault();
          },
        }}
        onClick={event => calls.push(`bubble:${event.defaultPrevented}`)}
        onClickCapture={event => {
          if ((event.target as HTMLElement).closest(`.${carouselNavContainerClassNames.prev}`)) {
            calls.push('capture');
            event.preventDefault();
          }
        }}
        value={{
          selectPageByDirection: () => {
            calls.push('select');
            return 1;
          },
          resetAutoplay: () => calls.push('reset'),
        }}
      />,
    );
    control('next').realClick();
    cy.then(() => expect(calls).to.deep.equal(['select', 'reset', 'user', 'bubble:true']));
    cy.then(() => calls.splice(0));
    control('prev').realClick();
    cy.then(() => expect(calls).to.deep.equal(['capture', 'bubble:true']));
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`${dir} actual DOM tab order and child-only arrows do not turn the container into a roving root`, () => {
      const select = cy.stub();
      mount(
        <>
          <button id="before">Before</button>
          <PassiveFixture autoplay={{ 'aria-label': 'Autoplay' }} value={{ selectPageByIndex: select }}>
            <CarouselNav totalSlides={3} aria-label="Pages">
              {index => <CarouselNavButton id={`page-${index}`} aria-label={`Page ${index + 1}`} />}
            </CarouselNav>
          </PassiveFixture>
          <button id="after">After</button>
        </>,
        dir,
      );
      cy.get('#before').focus();
      cy.realPress('Tab');
      control('autoplay').should('be.focused');
      cy.realPress('Tab');
      control('prev').should('be.focused');
      cy.realPress('ArrowRight');
      control('prev').should('be.focused');
      cy.realPress('Tab');
      cy.get('#page-0').should('be.focused');
      cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#page-1').should('be.focused');
      cy.then(() => expect(select.callCount).to.equal(0));
      cy.realPress('Enter');
      cy.then(() => expect(select.lastCall.args[1]).to.equal(1));
      cy.realPress('Tab');
      control('next').should('be.focused');
      cy.realPress('Tab');
      cy.get('#after').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      control('next').should('be.focused');
      nav().should('not.have.attr', 'data-tabster');
      nav().should('not.have.attr', 'tabindex');
    });
  });

  it('noncircular real edge disables trailing slots and transfers focus to the remaining enabled control', () => {
    const change = cy.stub();
    mount(<RealFixture onActiveIndexChange={change} />);
    cy.get('[data-testid="real-page-2"]').should('exist');
    control('prev').should('be.disabled').and('have.attr', 'tabindex', '-1');
    control('next').should('not.be.disabled');
    control('next').realClick();
    cy.then(() => expect(change.lastCall.args[1].index, 'first next request').to.equal(1));
    cy.get('[data-testid="real-page-1"]').should('have.attr', 'aria-selected', 'true');
    control('next').should('not.be.disabled');
    control('next').realClick();
    cy.then(() => expect(change.lastCall.args[1].index, 'second next request').to.equal(2));
    control('next').should('be.disabled').and('have.attr', 'aria-disabled', 'true');
    control('prev').should('not.be.disabled').and('be.focused');
    control('prev').realClick();
    cy.get('[data-testid="real-page-1"]').should('have.attr', 'aria-selected', 'true');
  });

  it('circular real edge wraps through next and previous while finite discovery keeps both controls enabled', () => {
    mount(<RealFixture circular />);
    cy.get('[data-testid="real-page-2"]').realClick();
    control('next').should('not.be.disabled').realClick();
    cy.get('[data-testid="real-page-0"]').should('have.attr', 'aria-selected', 'true');
    control('prev').should('not.be.disabled').realClick();
    cy.get('[data-testid="real-page-2"]').should('have.attr', 'aria-selected', 'true');
  });

  (['div'] as const).forEach(as => {
    it(`${as} root forwards native attributes semantic overrides class style and ref without leaking layout props`, () => {
      const ref = React.createRef<HTMLDivElement>();
      mount(
        <PassiveFixture
          as={as}
          ref={ref}
          role="group"
          aria-label="Navigation controls"
          aria-describedby="help"
          title="Footer"
          id="native-root"
          lang="fr"
          className="consumer-root"
          style={{ justifyContent: 'flex-end' }}
          layout="inline-wide"
          next={{ className: 'consumer-next', name: 'forward', value: 'one', title: 'Next title' }}
        >
          <span id="help">Three pages</span>
        </PassiveFixture>,
      );
      nav().should('have.prop', 'tagName', as.toUpperCase());
      nav().should('have.attr', 'role', 'group');
      nav().should('have.attr', 'aria-label', 'Navigation controls');
      nav().should('have.attr', 'aria-describedby', 'help');
      nav().should('have.attr', 'title', 'Footer');
      nav().should('have.attr', 'lang', 'fr');
      nav().should('have.class', 'consumer-root').and('have.class', carouselNavContainerClassNames.root);
      nav().should('have.css', 'justify-content', 'flex-end');
      nav().should('not.have.attr', 'layout');
      control('next').should('have.class', 'consumer-next').and('have.attr', 'name', 'forward');
      control('next').should('have.attr', 'value', 'one');
      nav().then(root => expect(ref.current).to.equal(root[0]));
    });
  });

  (['light', 'dark'] as const).forEach(theme => {
    it(`${theme} token colors remain on controls, not an invented container surface`, () => {
      mount(<PassiveFixture autoplay={{ 'aria-label': 'Autoplay' }} />, 'ltr', theme === 'dark');
      cy.get('[data-testid="frame"]').realHover({ position: 'topLeft' });
      const cssColor = (element: HTMLElement, color: string) => {
        const probe = element.ownerDocument.createElement('span');
        probe.style.color = color;
        element.appendChild(probe);
        const result = style(probe).color;
        probe.remove();
        return result;
      };
      control('next').then(next => {
        expect(style(next[0]).color).to.equal(cssColor(next[0], token(next[0], 'colorNeutralForeground2')));
        expect(style(next[0]).backgroundColor).to.equal('rgba(0, 0, 0, 0)');
      });
      control('autoplay').then(button => {
        expect(style(button[0]).backgroundColor).to.equal(
          cssColor(button[0], token(button[0], 'colorNeutralBackgroundAlpha')),
        );
      });
      nav().should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
    });
  });

  it('forced colors media positive control preserves passive layout and inherited button boundaries', () => {
    mount(<PassiveFixture layout="overlay-expanded" autoplay={{ 'aria-label': 'Autoplay' }} />);
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: 'active' }] },
      }),
    );
    nav().then(root => {
      expect(root[0].ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(true);
      expect(style(root[0]).position).to.equal('absolute');
      expect(style(root[0]).pointerEvents).to.equal('none');
    });
    control('next').focus().should('be.focused');
    control('next').then(next => {
      expect(style(next[0]).borderTopStyle).to.equal('solid');
      expect(style(next[0]).borderTopWidth).to.equal('1px');
      expect(style(next[0]).color).not.to.equal(style(next[0]).backgroundColor);
    });
  });

  it('Chromium accessibility tree exposes named group buttons and child tablist but no container live region', () => {
    mount(
      <PassiveFixture
        role="group"
        aria-label="Carousel controls"
        next={{ 'aria-label': 'Next page' }}
        prev={{ 'aria-label': 'Previous page' }}
        autoplay={{ 'aria-label': 'Autoplay' }}
      >
        <CarouselNav totalSlides={2} aria-label="Pages">
          {index => <CarouselNavButton aria-label={`Page ${index + 1}`} />}
        </CarouselNav>
      </PassiveFixture>,
    );
    type Frame = { frame: { id: string }; childFrames?: Frame[] };
    type Node = { ignored: boolean; role?: { value: string }; name?: { value: string } };
    cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Page.getFrameTree' }))
      .then((result: { frameTree: Frame }) => {
        const ids: string[] = [];
        const collect = (frame: Frame) => {
          ids.push(frame.frame.id);
          frame.childFrames?.forEach(collect);
        };
        collect(result.frameTree);
        return Promise.all(
          ids.map(frameId =>
            Cypress.automation('remote:debugger:protocol', {
              command: 'Accessibility.getFullAXTree',
              params: { frameId },
            }).then((tree: { nodes: Node[] }) => tree.nodes),
          ),
        ).then(trees => trees.flat());
      })
      .then((nodes: Node[]) => {
        const named = nodes.filter(node => !node.ignored).map(node => [node.role?.value, node.name?.value]);
        expect(named).to.deep.include(['group', 'Carousel controls']);
        expect(named).to.deep.include(['button', 'Next page']);
        expect(named).to.deep.include(['button', 'Previous page']);
        expect(named).to.deep.include(['button', 'Autoplay']);
        expect(named).to.deep.include(['tablist', 'Pages']);
      });
    nav().find('[aria-live]').should('not.exist');
  });
});
describe('CarouselNavContainer documentation', () => {
  layouts.forEach(layout => {
    (['ltr', 'rtl'] as const).forEach(dir => {
      ([false, true] as const).forEach(autoplay => {
        it(`${layout} ${dir} autoplay=${autoplay}: measures supported spacing alignment and placement`, () => {
          mount(<PassiveFixture layout={layout} autoplay={autoplay ? { 'aria-label': 'Autoplay' } : undefined} />, dir);
          nav().then(root => {
            const element = root[0];
            const computed = style(element);
            const bounds = element.getBoundingClientRect();
            const frame = element.parentElement!.getBoundingClientRect();
            const prev = element.querySelector<HTMLElement>(`.${carouselNavContainerClassNames.prev}`)!;
            const next = element.querySelector<HTMLElement>(`.${carouselNavContainerClassNames.next}`)!;
            const child = element.querySelector<HTMLElement>('[data-testid="child"]')!;
            const p = prev.getBoundingClientRect();
            const n = next.getBoundingClientRect();
            const c = child.getBoundingClientRect();
            const overlay = layout.startsWith('overlay');
            expect(computed.position).to.equal(overlay ? 'absolute' : 'static');
            expect(bounds.width).to.be.closeTo(frame.width, 0.5);
            expect(computed.justifyContent).to.equal('center');
            expect(computed.marginTop).to.equal(overlay ? '0px' : token(element, 'spacingVerticalM'));
            if (overlay) {
              expect(computed.boxSizing).to.equal('border-box');
              expect(frame.bottom - bounds.bottom).to.be.closeTo(
                layout === 'overlay-expanded' ? 0 : parseFloat(token(element, 'spacingVerticalM')),
                0.5,
              );
            }
            const wide = layout.endsWith('wide');
            const expanded = layout === 'overlay-expanded';
            if (wide || expanded) {
              const inset = overlay ? parseFloat(token(element, 'spacingHorizontalM')) : 0;
              expect(dir === 'ltr' ? bounds.right - n.right : n.left - bounds.left).to.be.closeTo(inset, 0.5);
              if (!autoplay || expanded) {
                expect(dir === 'ltr' ? p.left - bounds.left : bounds.right - p.right).to.be.closeTo(inset, 0.5);
              } else {
                const a = element.querySelector<HTMLElement>(`.${carouselNavContainerClassNames.autoplay}`)!;
                const ab = a.getBoundingClientRect();
                expect(dir === 'ltr' ? ab.left - bounds.left : bounds.right - ab.right).to.be.closeTo(inset, 0.5);
                expect(dir === 'ltr' ? p.left - ab.right : ab.left - p.right).to.be.closeTo(0, 0.5);
              }
            } else {
              expect(dir === 'ltr' ? c.left - p.right : p.left - c.right).to.be.closeTo(0, 0.5);
              expect(dir === 'ltr' ? n.left - c.right : c.left - n.right).to.be.closeTo(0, 0.5);
            }
            if (expanded) {
              expect(bounds.height).to.be.closeTo(frame.height, 0.5);
              expect(computed.alignItems).to.equal('flex-end');
              expect((p.top + p.bottom) / 2).to.be.closeTo((frame.top + frame.bottom) / 2, 0.5);
              expect((n.top + n.bottom) / 2).to.be.closeTo((frame.top + frame.bottom) / 2, 0.5);
              expect(bounds.bottom - c.bottom).to.be.closeTo(parseFloat(token(element, 'spacingVerticalL')), 0.5);
              if (autoplay) {
                const a = element.querySelector<HTMLElement>(`.${carouselNavContainerClassNames.autoplay}`)!;
                expect(style(a).position).to.equal('absolute');
                // Production emits -var(...), an invalid CSS value; retain this defect characterization.
                expect(style(a).bottom).to.equal('0px');
                expect(style(a).marginBottom).to.equal(token(element, 'spacingVerticalM'));
              }
            }
          });
        });
      });
    });
  });

  it('only the next and prev slot keys exist; their next and prev navType aliases can be exchanged', () => {
    const directions: string[] = [];
    mount(
      <PassiveFixture
        value={{
          selectPageByDirection: (_event, direction) => {
            directions.push(direction);
            return 1;
          },
        }}
        next={{ navType: 'prev', children: 'Next slot goes back' }}
        prev={{ navType: 'next', children: 'Prev slot goes forward' }}
      />,
    );
    control('next').realClick();
    control('prev').realClick();
    cy.then(() => expect(directions).to.deep.equal(['prev', 'next']));
    nav().should('not.have.attr', 'next');
    nav().should('not.have.attr', 'prev');
    nav().should('not.have.attr', 'layout');
  });

  (['prev', 'next', 'autoplay', 'all'] as const).forEach(omission => {
    it(`null ${omission} omits only requested controls and preserves root children`, () => {
      mount(
        <PassiveFixture
          autoplay={omission === 'autoplay' || omission === 'all' ? null : { 'aria-label': 'Autoplay' }}
          prev={omission === 'prev' || omission === 'all' ? null : undefined}
          next={omission === 'next' || omission === 'all' ? null : undefined}
        />,
      );
      (['prev', 'next', 'autoplay'] as const).forEach(name =>
        control(name).should(omission === name || omission === 'all' ? 'not.exist' : 'exist'),
      );
      nav().find('[data-testid="child"]').should('have.text', 'Pages');
    });
  });

  it('autoplay precedes prev child next and initializes unchecked despite stale component comment', () => {
    const enable = cy.stub();
    mount(<PassiveFixture autoplay={{ 'aria-label': 'Autoplay' }} value={{ enableAutoplay: enable }} />);
    nav()
      .children()
      .then(children => {
        expect(children[0].classList.contains(carouselNavContainerClassNames.autoplay)).to.equal(true);
        expect(children[1].classList.contains(carouselNavContainerClassNames.prev)).to.equal(true);
        expect(children[2].getAttribute('data-testid')).to.equal('child');
        expect(children[3].classList.contains(carouselNavContainerClassNames.next)).to.equal(true);
      });
    control('autoplay').should('have.attr', 'aria-pressed', 'false').find('svg').should('exist');
    cy.then(() => expect(enable.lastCall.args).to.deep.equal([false]));
    control('autoplay').realClick();
    control('autoplay').should('have.attr', 'aria-pressed', 'true');
    cy.then(() => expect(enable.lastCall.args).to.deep.equal([true]));
  });

  it('label tooltips provide localized accessible names and autoplayTooltip alone creates autoplay', () => {
    mount(
      <PassiveFixture
        prevTooltip={{ content: 'Previous page', relationship: 'label' }}
        nextTooltip={{ content: 'Next page', relationship: 'label' }}
        autoplayTooltip={{ content: 'Play carousel', relationship: 'label' }}
      />,
    );
    control('prev').should('have.attr', 'aria-label', 'Previous page');
    control('next').should('have.attr', 'aria-label', 'Next page');
    control('autoplay').should('have.attr', 'aria-label', 'Play carousel');
    control('prev').focus();
    cy.realPress('Tab');
    control('next').should('be.focused');
    cy.get('[role="tooltip"]').should('have.text', 'Next page');
  });

  it('real composed child nav characterizes initial missing relationships, then resize publishes IDs and controls navigate', () => {
    const change = cy.stub();
    mount(<RealFixture onActiveIndexChange={change} />);
    cy.get('[data-testid="real-page-0"]').should('not.have.attr', 'aria-controls');
    cy.get('[aria-label="real carousel"]').invoke('css', 'width', '460px');
    cy.get('[data-testid="real-page-0"]').should('have.attr', 'aria-controls', 'real-a');
    cy.get('[data-testid="real-page-0"]').should('have.attr', 'aria-selected', 'true');
    control('next').realClick();
    cy.get('[data-testid="real-page-1"]').should('have.attr', 'aria-selected', 'true');
    cy.then(() => expect(change.lastCall.args[1]).to.include({ type: 'click', index: 1 }));
    control('prev').realClick();
    cy.get('[data-testid="real-page-0"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="real-page-2"]').realClick();
    cy.get('[data-testid="real-page-2"]').should('have.attr', 'aria-selected', 'true');
    cy.then(() => expect(change.lastCall.args[1]).to.include({ type: 'click', index: 2 }));
  });

  (['small', 'medium', 'large'] as const).forEach(size => {
    (['rounded', 'circular', 'square'] as const).forEach(shape => {
      it(`slot-only ${size} ${shape} variants preserve container layout and button dimensions`, () => {
        mount(<PassiveFixture prev={{ size, shape }} next={{ size, shape }} autoplay={{ size, shape }} />);
        nav().should('have.css', 'justify-content', 'center');
        control('next').then(next => {
          const computed = style(next[0]);
          expect(next[0].getBoundingClientRect().height).to.be.closeTo({ small: 24, medium: 32, large: 40 }[size], 0.5);
          expect(computed.borderTopLeftRadius).to.equal(
            shape === 'square' ? '0px' : shape === 'circular' ? '10000px' : token(next[0], 'borderRadiusMedium'),
          );
        });
        control('prev').then(prev => control('next').should('have.css', 'min-height', style(prev[0]).minHeight));
      });
    });
  });
});

describe('CarouselNavContainer unit and source derived', () => {
  const Composed = React.forwardRef<HTMLDivElement, CarouselNavContainerProps>((props, ref) => {
    const state = useCarouselNavContainer_unstable(props, ref);
    useCarouselNavContainerStyles_unstable(state);
    const originalChildren = state.root.children;
    state.root = slot.always(
      {
        ...state.root,
        children: ((Component, nativeProps) => (
          <Component {...nativeProps} data-rendered="true">
            {nativeProps.children}
            {originalChildren}
          </Component>
        )) satisfies SlotRenderFunction<React.ComponentPropsWithRef<'div'>>,
      },
      { elementType: 'div' },
    );
    return renderCarouselNavContainer_unstable(state);
  });

  it('exported hook styles renderer preserve root ref native props children and styled controls', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <Composed ref={ref} data-testid="container" title="Composed" next={{ 'aria-label': 'Next' }} autoplay={null}>
        <span id="composed-child">Child</span>
      </Composed>,
    );
    nav().should('have.attr', 'data-rendered', 'true');
    nav().should('have.attr', 'title', 'Composed');
    nav().find('#composed-child').should('have.text', 'Child');
    control('next').should('have.class', carouselNavContainerClassNames.next);
    nav().then(root => expect(ref.current).to.equal(root[0]));
  });

  it('public root render function receives composed control children and native props without a wrapper', () => {
    const renderRoot: SlotRenderFunction<React.ComponentPropsWithRef<'div'>> = (Component, props) => (
      <Component {...props} data-rendered="public">
        {props.children}
      </Component>
    );
    mount(<CarouselNavContainer data-testid="container" title="Public" children={renderRoot} />);
    nav().should('have.attr', 'data-rendered', 'public');
    nav().should('have.attr', 'title', 'Public');
    nav().find(`.${carouselNavContainerClassNames.next}`).should('have.length', 1);
    nav().find(`.${carouselNavContainerClassNames.prev}`).should('have.length', 1);
  });

  it('next prev and autoplay slot render functions preserve native props handlers refs and supplied content', () => {
    const nextRef = React.createRef<HTMLButtonElement>();
    const prevRef = React.createRef<HTMLButtonElement>();
    const autoRef = React.createRef<HTMLButtonElement>();
    const direction = cy.stub().returns(1);
    const renderButton =
      (ref: React.Ref<HTMLButtonElement>): SlotRenderFunction<React.ComponentPropsWithRef<'button'>> =>
      (Component, props) =>
        (
          <Component {...props} ref={ref} data-slot-render="true">
            {props['aria-label']}
          </Component>
        );
    mount(
      <PassiveFixture
        value={{ selectPageByDirection: direction }}
        next={{ 'aria-label': 'Next', children: renderButton(nextRef) }}
        prev={{ 'aria-label': 'Previous', children: renderButton(prevRef) }}
        autoplay={{ 'aria-label': 'Autoplay', children: renderButton(autoRef) }}
      />,
    );
    control('next').should('have.attr', 'data-slot-render', 'true').and('have.text', 'Next');
    control('prev').should('have.text', 'Previous');
    control('autoplay').should('have.text', 'Autoplay');
    control('next').then(button => expect(nextRef.current).to.equal(button[0]));
    control('prev').then(button => expect(prevRef.current).to.equal(button[0]));
    control('autoplay').then(button => expect(autoRef.current).to.equal(button[0]));
    control('next').realClick();
    cy.then(() => expect(direction.firstCall.args[1]).to.equal('next'));
  });

  it('null icon slots omit SVGs while text shorthand and custom icons preserve container static classes', () => {
    mount(
      <PassiveFixture
        next={{ icon: null, children: 'Forward' }}
        prev={{ icon: <span data-testid="custom-icon">Back icon</span>, children: 'Back' }}
        autoplay={{ icon: null, children: 'Play' }}
      />,
    );
    control('next').find('svg').should('not.exist');
    control('autoplay').find('svg').should('not.exist');
    control('prev').find('[data-testid="custom-icon"]').should('have.text', 'Back icon');
    control('next').should('contain.text', 'Forward');
    control('autoplay').should('contain.text', 'Play');
  });

  it('string shorthand supplies text to both default navigation slots', () => {
    mount(<PassiveFixture next="Forward" prev="Back" autoplay="Play" />);
    control('next').should('contain.text', 'Forward');
    control('prev').should('contain.text', 'Back');
    control('autoplay').should('contain.text', 'Play');
  });

  it('empty string autoplay is omitted without tooltip but null wins over an autoplay tooltip', () => {
    const Fixture = () => {
      const [tooltip, setTooltip] = React.useState(false);
      const [omit, setOmit] = React.useState(false);
      return (
        <>
          <button id="tooltip" onClick={() => setTooltip(true)}>
            Tooltip
          </button>
          <button id="omit" onClick={() => setOmit(true)}>
            Omit
          </button>
          <PassiveFixture
            autoplay={omit ? null : ''}
            autoplayTooltip={tooltip ? { content: 'Autoplay', relationship: 'label' } : undefined}
          />
        </>
      );
    };
    mount(<Fixture />);
    control('autoplay').should('not.exist');
    cy.get('#tooltip').realClick();
    control('autoplay').should('have.attr', 'aria-label', 'Autoplay');
    cy.get('#omit').realClick();
    control('autoplay').should('not.exist');
    nav().find('[role="tooltip"]').should('not.exist');
  });

  it('controlled autoplay requests checked changes without changing pressed state until external feedback', () => {
    const change = cy.stub();
    const enable = cy.stub();
    const Fixture = () => {
      const [checked, setChecked] = React.useState(false);
      return (
        <>
          <button id="feedback" onClick={() => setChecked(true)}>
            Feedback
          </button>
          <PassiveFixture
            value={{ enableAutoplay: enable }}
            autoplay={{ checked, onCheckedChange: change, 'aria-label': 'Autoplay' }}
          />
        </>
      );
    };
    mount(<Fixture />);
    control('autoplay').realClick().should('have.attr', 'aria-pressed', 'false');
    cy.then(() => {
      expect(change.callCount).to.equal(1);
      expect(change.firstCall.args[1]).to.include({ type: 'click', checked: true });
      expect(enable.lastCall.args).to.deep.equal([false]);
    });
    cy.get('#feedback').realClick();
    control('autoplay').should('have.attr', 'aria-pressed', 'true');
    cy.then(() => expect(enable.lastCall.args).to.deep.equal([true]));
  });

  it('uncontrolled autoplay defaultChecked toggles and unmount disables context, remount reinitializes', () => {
    const enable = cy.stub();
    const Fixture = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button id="toggle" onClick={() => setShown(!shown)}>
            Toggle
          </button>
          <PassiveFixture
            value={{ enableAutoplay: enable }}
            autoplay={shown ? { defaultChecked: true, 'aria-label': 'Autoplay' } : null}
          />
        </>
      );
    };
    mount(<Fixture />);
    control('autoplay').should('have.attr', 'aria-pressed', 'true');
    cy.then(() => expect(enable.lastCall.args).to.deep.equal([true]));
    control('autoplay').realClick().should('have.attr', 'aria-pressed', 'false');
    control('autoplay').realClick().should('have.attr', 'aria-pressed', 'true');
    cy.get('#toggle').realClick();
    control('autoplay').should('not.exist');
    cy.then(() => expect(enable.lastCall.args).to.deep.equal([false]));
    cy.get('#toggle').realClick();
    control('autoplay').should('have.attr', 'aria-pressed', 'true');
    cy.then(() => expect(enable.lastCall.args).to.deep.equal([true]));
  });

  it('latest context and native callbacks are used after layout children slot props and active index change', () => {
    const calls: string[] = [];
    let root: HTMLElement;
    let next: HTMLElement;
    const Fixture = () => {
      const [version, setVersion] = React.useState(0);
      return (
        <>
          <button id="update" onClick={() => setVersion(1)}>
            Update
          </button>
          <PassiveFixture
            layout={version ? 'overlay-wide' : 'inline'}
            title={`Version ${version}`}
            onClick={() => calls.push(`root:${version}`)}
            next={{
              'aria-label': `Next ${version}`,
              size: version ? 'large' : 'small',
              onClick: () => calls.push(`native:${version}`),
            }}
            value={{
              activeIndex: version,
              selectPageByDirection: (_event, direction) => {
                calls.push(`select:${version}:${direction}`);
                return 1;
              },
              resetAutoplay: () => calls.push(`reset:${version}`),
            }}
          >
            <div data-testid="child">Version {version}</div>
          </PassiveFixture>
        </>
      );
    };
    mount(<Fixture />);
    nav().then(element => {
      root = element[0];
    });
    control('next').then(element => {
      next = element[0];
    });
    control('next').realClick();
    cy.then(() => expect(calls).to.deep.equal(['select:0:next', 'reset:0', 'native:0', 'root:0']));
    cy.get('#update').realClick();
    nav().should('have.attr', 'title', 'Version 1').and('have.css', 'position', 'absolute');
    nav().find('[data-testid="child"]').should('have.text', 'Version 1');
    control('next').should('have.attr', 'aria-label', 'Next 1').realClick();
    cy.then(() => {
      expect(calls).to.deep.equal([
        'select:0:next',
        'reset:0',
        'native:0',
        'root:0',
        'select:1:next',
        'reset:1',
        'native:1',
        'root:1',
      ]);
    });
    nav().then(element => expect(element[0]).to.equal(root));
    control('next').then(element => expect(element[0]).to.equal(next));
  });

  it('all live layout transitions remove previous absolute and wide slot styles without replacing root or controls', () => {
    let root: HTMLElement;
    let next: HTMLElement;
    const Fixture = () => {
      const [layout, setLayout] = React.useState<CarouselNavContainerProps['layout']>('inline');
      return (
        <>
          {layouts.map(value => (
            <button key={value} id={`set-${value}`} onClick={() => setLayout(value)}>
              {value}
            </button>
          ))}
          <PassiveFixture layout={layout} autoplay={{ 'aria-label': 'Autoplay' }} />
        </>
      );
    };
    mount(<Fixture />);
    nav().then(element => {
      root = element[0];
    });
    control('next').then(element => {
      next = element[0];
    });
    [...layouts, 'inline' as const].forEach(layout => {
      cy.get(`#set-${layout}`).realClick();
      nav().should('have.css', 'position', layout.startsWith('overlay') ? 'absolute' : 'static');
      control('next').should('have.css', 'position', layout === 'overlay-expanded' ? 'absolute' : 'static');
      nav().then(element => expect(element[0]).to.equal(root));
      control('next').then(element => expect(element[0]).to.equal(next));
    });
    control('next').should('have.css', 'margin-right', '0px');
    control('prev').should('have.css', 'margin-left', '0px');
  });

  it('overlay-wide shifts the leading inset between autoplay and prev as autoplay is added and removed', () => {
    let root: HTMLElement;
    const Fixture = () => {
      const [shown, setShown] = React.useState(false);
      return (
        <>
          <button id="toggle-auto" onClick={() => setShown(!shown)}>
            Toggle autoplay
          </button>
          <PassiveFixture layout="overlay-wide" autoplay={shown ? { 'aria-label': 'Autoplay' } : null} />
        </>
      );
    };
    mount(<Fixture />);
    nav().then(element => {
      root = element[0];
    });
    control('prev').then(button =>
      expect(style(button[0]).marginLeft).to.equal(token(button[0], 'spacingHorizontalM')),
    );
    cy.get('#toggle-auto').realClick();
    control('autoplay').then(button =>
      expect(style(button[0]).marginLeft).to.equal(token(button[0], 'spacingHorizontalM')),
    );
    control('prev').should('have.css', 'margin-left', '0px');
    cy.get('#toggle-auto').realClick();
    control('autoplay').should('not.exist');
    control('prev').then(button =>
      expect(style(button[0]).marginLeft).to.equal(token(button[0], 'spacingHorizontalM')),
    );
    nav().then(element => expect(element[0]).to.equal(root));
  });

  it('callback root refs replace and clear on unmount while ordinary updates preserve native identity', () => {
    const oldRef = cy.stub();
    const newRef = cy.stub();
    let root: HTMLElement;
    const Fixture = () => {
      const [latest, setLatest] = React.useState(false);
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button id="replace-ref" onClick={() => setLatest(true)}>
            Replace
          </button>
          <button id="unmount" onClick={() => setShown(false)}>
            Unmount
          </button>
          {shown && <CarouselNavContainer data-testid="container" ref={latest ? newRef : oldRef} />}
        </>
      );
    };
    mount(<Fixture />);
    nav().then(element => {
      root = element[0];
      expect(oldRef.lastCall.args[0]).to.equal(root);
    });
    cy.get('#replace-ref').realClick();
    nav().then(element => expect(element[0]).to.equal(root));
    cy.then(() => {
      expect(oldRef.lastCall.args[0]).to.equal(null);
      expect(newRef.lastCall.args[0]).to.equal(root);
    });
    cy.get('#unmount').realClick();
    nav().should('not.exist');
    cy.then(() => expect(newRef.lastCall.args[0]).to.equal(null));
  });

  it('consumer Griffel class overrides root layout without removing static classes', () => {
    const Fixture = () => {
      const styles = useContainerCoverageStyles();
      return <PassiveFixture className={styles.override} />;
    };
    mount(<Fixture />);
    nav().should('have.class', carouselNavContainerClassNames.root).and('have.css', 'justify-content', 'flex-end');
    nav().then(element => expect(style(element[0]).marginTop).to.equal(token(element[0], 'spacingVerticalXXL')));
  });

  it('independent parent contexts isolate container controls and nested child Nav active selection', () => {
    mount(
      <>
        <RealFixture prefix="first" />
        <RealFixture prefix="second" />
      </>,
    );
    cy.get('[data-testid="first-page-2"]').should('exist');
    cy.get('[data-testid="second-page-2"]').should('exist');
    cy.get('[data-testid="first-container"]').find(`.${carouselNavContainerClassNames.next}`).realClick();
    cy.get('[data-testid="first-page-1"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="second-page-0"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="second-container"]').find(`.${carouselNavContainerClassNames.next}`).realClick();
    cy.get('[data-testid="second-page-1"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="first-page-1"]').should('have.attr', 'aria-selected', 'true');
  });

  it('real controlled feedback updates child Nav and slot edge state without introducing container index state', () => {
    const requests: number[] = [];
    const Fixture = () => {
      const [index, setIndex] = React.useState(0);
      return (
        <RealFixture
          activeIndex={index}
          onActiveIndexChange={(_event, data) => {
            requests.push(data.index);
            setIndex(data.index);
          }}
        />
      );
    };
    mount(<Fixture />);
    cy.get('[data-testid="real-page-2"]').should('exist');
    control('next').realClick();
    cy.then(() => expect(requests).to.deep.equal([1]));
    cy.get('[data-testid="real-page-1"]').should('have.attr', 'aria-selected', 'true');
    control('prev').realClick();
    cy.get('[data-testid="real-page-0"]').should('have.attr', 'aria-selected', 'true');
    cy.then(() => expect(requests).to.deep.equal([1, 0]));
    cy.get('[data-testid="real-container"]').should('not.have.attr', 'aria-selected');
  });

  it('default context stays safe outside Carousel without invented discovery or local page state', () => {
    mount(
      <CarouselNavContainer data-testid="container" autoplay={{ 'aria-label': 'Autoplay' }}>
        Standalone
      </CarouselNavContainer>,
    );
    control('prev').should('be.disabled');
    control('next').should('not.be.disabled').realClick();
    nav().should('contain.text', 'Standalone');
    control('autoplay').realClick().should('have.attr', 'aria-pressed', 'true');
    nav().should('not.have.attr', 'aria-live');
  });

  it('live RTL reverses default arrow paths and placement without replacing controls', () => {
    let next: HTMLElement;
    let ltrNext: string;
    let ltrPrev: string;
    const Fixture = () => {
      const [dir, setDir] = React.useState<'ltr' | 'rtl'>('ltr');
      return (
        <FluentProvider dir={dir} theme={teamsLightTheme}>
          <button id="rtl" onClick={() => setDir('rtl')}>
            RTL
          </button>
          <PassiveFixture layout="overlay-wide" />
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    control('next').then(element => {
      next = element[0];
    });
    control('next')
      .find('path')
      .invoke('attr', 'd')
      .then(path => {
        ltrNext = path!;
      });
    control('prev')
      .find('path')
      .invoke('attr', 'd')
      .then(path => {
        ltrPrev = path!;
      });
    cy.get('#rtl').realClick();
    control('next')
      .find('path')
      .should('have.attr', 'd')
      .then(path => expect(path).to.equal(ltrPrev));
    control('prev')
      .find('path')
      .should('have.attr', 'd')
      .then(path => expect(path).to.equal(ltrNext));
    control('next').then(element => {
      expect(element[0]).to.equal(next);
      expect(
        element[0].getBoundingClientRect().left - element[0].parentElement!.getBoundingClientRect().left,
      ).to.be.closeTo(parseFloat(token(element[0], 'spacingHorizontalM')), 0.5);
    });
  });

  it('subscriptions belong to present controls, not the passive root, and dispose on replacement and unmount', () => {
    const oldListeners = new Set<(data: CarouselUpdateData) => void>();
    const newListeners = new Set<(data: CarouselUpdateData) => void>();
    const subscribe =
      (listeners: typeof oldListeners): CarouselContextValue['subscribeForValues'] =>
      listener => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      };
    const oldSubscribe = subscribe(oldListeners);
    const newSubscribe = subscribe(newListeners);
    const Fixture = () => {
      const [latest, setLatest] = React.useState(false);
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button id="replace-subscription" onClick={() => setLatest(true)}>
            Replace
          </button>
          <button id="remove-controls" onClick={() => setShown(false)}>
            Remove
          </button>
          <PassiveFixture
            value={{ subscribeForValues: latest ? newSubscribe : oldSubscribe }}
            prev={shown ? undefined : null}
            next={shown ? undefined : null}
          />
        </>
      );
    };
    mount(<Fixture />);
    control('next').should('exist');
    control('prev').should('exist');
    cy.then(() => expect(oldListeners.size).to.equal(2));
    cy.get('#replace-subscription').realClick();
    cy.then(() => {
      expect(oldListeners.size).to.equal(0);
      expect(newListeners.size).to.equal(2);
    });
    cy.get('#remove-controls').realClick();
    nav().should('exist');
    cy.then(() => expect(newListeners.size).to.equal(0));
  });

  it('real dynamic child Nav arrangement updates page count without replacing the container root', () => {
    let root: HTMLElement;
    const Fixture = () => {
      const [cards, setCards] = React.useState(['a', 'b', 'c']);
      return (
        <>
          <button id="add-card" onClick={() => setCards(['a', 'b', 'c', 'd'])}>
            Add
          </button>
          <button id="remove-card" onClick={() => setCards(['a', 'b'])}>
            Remove
          </button>
          <RealFixture cards={cards} />
        </>
      );
    };
    mount(<Fixture />);
    cy.get('[data-testid="real-container"]').then(element => {
      root = element[0];
    });
    cy.get('[data-testid="real-page-2"]').should('exist');
    cy.get('#add-card').realClick();
    cy.get('[data-testid="real-page-3"]').should('exist');
    cy.get('#remove-card').realClick();
    cy.get('[data-testid="real-page-2"]').should('not.exist');
    cy.get('[data-testid="real-page-1"]').realClick().should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="real-container"]').then(element => expect(element[0]).to.equal(root));
  });

  (['pointer', 'Enter', 'Space'] as const).forEach(action => {
    it(`anchor next slot real ${action} uses native pressability and consumer prevents outbound default`, () => {
      const direction = cy.stub().returns(1);
      const click = cy.stub().callsFake((event: React.MouseEvent) => event.preventDefault());
      mount(
        <PassiveFixture
          value={{ selectPageByDirection: direction }}
          next={{
            as: 'a',
            href: '#local-only',
            target: '_self',
            rel: 'nofollow',
            'aria-label': 'Next link',
            onClick: click,
          }}
        />,
      );
      control('next').should('have.prop', 'tagName', 'A');
      control('next').should('have.attr', 'href', '#local-only');
      control('next').should('have.attr', 'rel', 'nofollow');
      if (action === 'pointer') {
        control('next').realClick();
      } else {
        control('next').focus();
        cy.realPress(action);
      }
      cy.then(() => {
        expect(direction.callCount).to.equal(1);
        expect(direction.firstCall.args[1]).to.equal('next');
        expect(click.callCount).to.equal(1);
      });
    });
  });

  it('null controls defeat corresponding tooltips and null tooltip slots do not wrap remaining controls', () => {
    mount(
      <PassiveFixture
        prev={null}
        prevTooltip={{ content: 'Absent previous', relationship: 'label' }}
        nextTooltip={null}
        autoplay={null}
        autoplayTooltip={{ content: 'Absent autoplay', relationship: 'label' }}
      />,
    );
    control('prev').should('not.exist');
    control('autoplay').should('not.exist');
    control('next').should('not.have.attr', 'aria-label');
    nav().find('[role="tooltip"]').should('not.exist');
    nav().children().should('have.length', 2);
  });

  it('description tooltip retains button name and exposes the described-by endpoint on keyboard focus', () => {
    mount(
      <PassiveFixture
        next={{ 'aria-label': 'Next page' }}
        nextTooltip={{ content: 'Move to the following page', relationship: 'description' }}
      />,
    );
    control('prev').focus();
    cy.realPress('Tab');
    control('next').should('be.focused').and('have.attr', 'aria-label', 'Next page');
    cy.get('[role="tooltip"]').should('have.text', 'Move to the following page');
    control('next')
      .invoke('attr', 'aria-describedby')
      .then(id => {
        expect(id).to.be.a('string').and.not.to.equal('');
        cy.get(`[id="${id}"]`).should('have.text', 'Move to the following page');
      });
  });

  it('empty root children retain default controls and inserting keyed children preserves their native identities', () => {
    let next: HTMLElement;
    const Fixture = () => {
      const [shown, setShown] = React.useState(false);
      return (
        <>
          <button id="insert" onClick={() => setShown(!shown)}>
            Insert
          </button>
          <PassiveFixture>
            {shown
              ? [
                  <span key="a" id="child-a">
                    A
                  </span>,
                  <span key="b" id="child-b">
                    B
                  </span>,
                ]
              : null}
          </PassiveFixture>
        </>
      );
    };
    mount(<Fixture />);
    nav().children().should('have.length', 2);
    control('next').then(element => {
      next = element[0];
    });
    cy.get('#insert').realClick();
    nav().children().should('have.length', 4);
    nav().find('#child-a').should('have.text', 'A');
    nav().find('#child-b').should('have.text', 'B');
    control('next').then(element => expect(element[0]).to.equal(next));
    cy.get('#insert').realClick();
    nav().children().should('have.length', 2);
  });

  it('autoplay context function replacement disables the old owner and initializes the new owner with current state', () => {
    const oldEnable = cy.stub();
    const newEnable = cy.stub();
    const oldChange = cy.stub();
    const newChange = cy.stub();
    const Fixture = () => {
      const [latest, setLatest] = React.useState(false);
      return (
        <>
          <button id="replace-owner" onClick={() => setLatest(true)}>
            Replace owner
          </button>
          <PassiveFixture
            value={{ enableAutoplay: latest ? newEnable : oldEnable }}
            autoplay={{
              'aria-label': 'Autoplay',
              defaultChecked: true,
              onCheckedChange: latest ? newChange : oldChange,
            }}
          />
        </>
      );
    };
    mount(<Fixture />);
    control('autoplay').should('have.attr', 'aria-pressed', 'true');
    cy.then(() => expect(oldEnable.lastCall.args).to.deep.equal([true]));
    cy.get('#replace-owner').realClick();
    cy.then(() => {
      expect(oldEnable.lastCall.args).to.deep.equal([false]);
      expect(newEnable.lastCall.args).to.deep.equal([true]);
    });
    control('autoplay').realClick();
    cy.then(() => {
      expect(oldChange.callCount).to.equal(0);
      expect(newChange.callCount).to.equal(1);
      expect(newChange.firstCall.args[1].checked).to.equal(false);
      expect(newEnable.lastCall.args).to.deep.equal([false]);
    });
  });

  it('image slideshow story composition keeps named image Nav children in the expanded footer between side controls', () => {
    const select = cy.stub();
    mount(
      <PassiveFixture layout="overlay-expanded" value={{ selectPageByIndex: select }}>
        <CarouselNav totalSlides={2} aria-label="Image pages">
          {index => (
            <CarouselNavImageButton
              id={`image-page-${index}`}
              image={{ src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E' }}
              aria-label={`Image page ${index + 1}`}
            />
          )}
        </CarouselNav>
      </PassiveFixture>,
    );
    nav().find('[role="tablist"]').should('have.attr', 'aria-label', 'Image pages');
    cy.get('#image-page-1').find('img').should('have.attr', 'aria-hidden', 'true');
    cy.get('#image-page-1').realClick();
    cy.then(() => {
      expect(select.callCount).to.equal(1);
      expect(select.firstCall.args[1]).to.equal(1);
    });
    nav().then(element => {
      const root = element[0];
      const child = root.querySelector<HTMLElement>('[role="tablist"]')!;
      expect(root.getBoundingClientRect().bottom - child.getBoundingClientRect().bottom).to.be.closeTo(
        parseFloat(token(root, 'spacingVerticalL')),
        0.5,
      );
    });
    control('next').should('have.css', 'position', 'absolute');
    control('prev').should('have.css', 'position', 'absolute');
  });

  it('published slide count and activeIndex change slot disabled edges without any container subscription', () => {
    const listeners = new Set<(data: CarouselUpdateData) => void>();
    const subscribeForValues: CarouselContextValue['subscribeForValues'] = listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    };
    const Fixture = () => {
      const [activeIndex, setActiveIndex] = React.useState(0);
      const publish = (count: number) =>
        listeners.forEach(listener =>
          listener({
            activeIndex,
            navItemsCount: count,
            groupIndexList: [],
            slideNodes: [],
            canLoop: false,
          }),
        );
      return (
        <>
          <button id="publish-two" onClick={() => publish(2)}>
            Two
          </button>
          <button id="publish-three" onClick={() => publish(3)}>
            Three
          </button>
          <button id="last-index" onClick={() => setActiveIndex(1)}>
            Last
          </button>
          <PassiveFixture value={{ circular: false, activeIndex, subscribeForValues }} />
        </>
      );
    };
    mount(<Fixture />);
    control('prev').should('be.disabled');
    cy.get('#publish-two').realClick();
    cy.get('#last-index').realClick();
    control('prev').should('not.be.disabled');
    control('next').should('be.disabled');
    cy.get('#publish-three').realClick();
    control('next').should('not.be.disabled');
    cy.then(() => expect(listeners.size).to.equal(2));
    nav().should('not.have.attr', 'aria-selected');
  });
});
