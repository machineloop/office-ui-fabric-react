import 'cypress-real-events';
import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { useARIAButtonProps } from '@fluentui/react-aria';
import { teamsDarkTheme, teamsLightTheme } from '@fluentui/react-theme';
import { slot } from '@fluentui/react-utilities';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import {
  CarouselNavButton,
  carouselNavButtonClassNames,
  renderCarouselNavButton_unstable,
  useCarouselNavButton_unstable,
  useCarouselNavButtonStyles_unstable,
} from './index';
import type { CarouselNavButtonProps, CarouselNavButtonSlots } from './CarouselNavButton.types';
import { Carousel } from '../Carousel/Carousel';
import type { CarouselProps, CarouselUpdateData } from '../Carousel/Carousel.types';
import { CarouselCard } from '../CarouselCard/CarouselCard';
import { CarouselSlider } from '../CarouselSlider/CarouselSlider';
import { CarouselViewport } from '../CarouselViewport/CarouselViewport';
import { CarouselNav } from '../CarouselNav/CarouselNav';
import { CarouselNavIndexContextProvider } from '../CarouselNav/CarouselNavIndexContext';
import { CarouselProvider, carouselContextDefaultValue } from '../CarouselContext';
import { useNavButtonCoverageStyles } from './CarouselNavButton.cy.styles';

type BrowserFrame = { frame: { id: string }; childFrames?: BrowserFrame[] };
type AccessibleNode = {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
};

const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  mountBase(
    <FluentProvider dir={dir} theme={dark ? teamsDarkTheme : teamsLightTheme}>
      {element}
    </FluentProvider>,
  );

type FixtureProps = CarouselProps & {
  prefix?: string;
  cards?: string[];
  half?: boolean;
  brand?: boolean;
  buttonProps?: (index: number) => CarouselNavButtonProps;
};

const Fixture = ({
  prefix = 'button',
  cards = ['a', 'b', 'c', 'd'],
  half = false,
  brand = false,
  buttonProps,
  children,
  ...props
}: FixtureProps) => {
  const styles = useNavButtonCoverageStyles();
  return (
    <Carousel aria-label={`${prefix} carousel`} className={styles.carousel} groupSize={half ? 2 : 1} {...props}>
      <CarouselViewport data-testid={`${prefix}-viewport`}>
        <CarouselSlider>
          {cards.map(key => (
            <CarouselCard key={key} id={`${prefix}-${key}`} className={half ? styles.halfCard : styles.card}>
              Panel {key}
            </CarouselCard>
          ))}
        </CarouselSlider>
      </CarouselViewport>
      <CarouselNav aria-label={`${prefix} pages`} appearance={brand ? 'brand' : undefined}>
        {index => (
          <CarouselNavButton
            aria-label={`Page ${index + 1}`}
            data-testid={`${prefix}-${index}`}
            {...buttonProps?.(index)}
          />
        )}
      </CarouselNav>
      {children}
    </Carousel>
  );
};

const tab = (index: number, prefix = 'button') => cy.get<HTMLButtonElement>(`[data-testid="${prefix}-${index}"]`);
const selected = (index: number, prefix = 'button') => {
  tab(index, prefix).should('have.attr', 'aria-selected', 'true');
  cy.get(`[data-testid^="${prefix}-"][role="tab"][aria-selected="true"]`).should('have.length', 1);
};
const pseudo = (element: HTMLElement, name = '::after') =>
  element.ownerDocument.defaultView!.getComputedStyle(element, name);
const cssColor = (element: HTMLElement, color: string) => {
  const probe = element.ownerDocument.createElement('span');
  probe.style.color = color;
  element.appendChild(probe);
  const result = element.ownerDocument.defaultView!.getComputedStyle(probe).color;
  probe.remove();
  return result;
};

const activate = (selector: string, action: 'pointer' | 'Enter' | 'Space') => {
  if (action === 'pointer') {
    cy.get(selector).realClick();
  } else {
    cy.get(selector).focus();
    cy.realPress(action);
  }
};

describe('CarouselNavButton edges and accessibility', () => {
  afterEach(() =>
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    ),
  );
  (['button', 'a', 'div'] as const).forEach(as => {
    it(`${as} consumer click prevention vetoes selection but still resets autoplay and bubbles`, () => {
      const calls: string[] = [];
      mount(
        <CarouselProvider
          value={{
            ...carouselContextDefaultValue,
            selectPageByIndex: () => calls.push('select'),
            resetAutoplay: () => calls.push('reset'),
          }}
        >
          <div onClick={event => calls.push(`bubble:${event.defaultPrevented}`)}>
            <CarouselNavButton
              as={as}
              role="tab"
              id="veto"
              aria-label="Veto page"
              onClick={(event: React.MouseEvent<HTMLElement>) => {
                calls.push('user');
                event.preventDefault();
              }}
            />
          </div>
        </CarouselProvider>,
      );
      cy.get('#veto').realClick();
      cy.then(() => expect(calls).to.deep.equal(['user', 'reset', 'bubble:true']));
    });

    it(`${as} consumer keydown veto blocks real Enter without a click or autoplay reset`, () => {
      const select = cy.stub();
      const reset = cy.stub();
      const keydown = cy.stub().callsFake((event: React.KeyboardEvent) => event.preventDefault());
      mount(
        <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select, resetAutoplay: reset }}>
          <CarouselNavButton as={as} role="tab" id="key-veto" aria-label="Veto page" onKeyDown={keydown} />
        </CarouselProvider>,
      );
      cy.get('#key-veto').focus();
      cy.realPress('Enter');
      cy.then(() => {
        expect(keydown.callCount).to.equal(1);
        expect(keydown.firstCall.args[0].key).to.equal('Enter');
        expect(select.callCount).to.equal(0);
        expect(reset.callCount).to.equal(0);
      });
    });
  });

  (['a', 'div'] as const).forEach(as => {
    it(`${as} Space keyup veto prevents helper activation after keydown while preserving both user handlers`, () => {
      const calls: string[] = [];
      mount(
        <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: () => calls.push('select') }}>
          <CarouselNavButton
            as={as}
            role="tab"
            id="space-veto"
            aria-label="Space veto"
            onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => calls.push(`down:${event.key}`)}
            onKeyUp={(event: React.KeyboardEvent<HTMLElement>) => {
              calls.push(`up:${event.key}`);
              event.preventDefault();
            }}
          />
        </CarouselProvider>,
      );
      cy.get('#space-veto').focus();
      cy.realPress('Space');
      cy.then(() => expect(calls).to.deep.equal(['down: ', 'up: ']));
    });
  });

  it('native Space keyup prevention cancels browser activation with an enabled native keyboard positive control', () => {
    const calls: string[] = [];
    mount(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: () => calls.push('select') }}>
        <CarouselNavButton
          id="native-space"
          aria-label="Native Space"
          onKeyUp={event => {
            calls.push(`up:${event.key}`);
            event.preventDefault();
          }}
        />
        <CarouselNavButton id="native-positive" aria-label="Native positive" />
      </CarouselProvider>,
    );
    cy.get('#native-space').focus();
    cy.realPress('Space');
    cy.then(() => expect(calls).to.deep.equal(['up: ']));
    cy.get('#native-positive').focus();
    cy.realPress('Space');
    cy.then(() => expect(calls).to.deep.equal(['up: ', 'select']));
  });

  const disabledModes: {
    name: string;
    props: Pick<CarouselNavButtonProps, 'disabled' | 'disabledFocusable' | 'aria-disabled'>;
    blocked: boolean;
  }[] = [
    { name: 'enabled', props: {}, blocked: false },
    { name: 'native disabled', props: { disabled: true }, blocked: true },
    { name: 'disabledFocusable', props: { disabledFocusable: true }, blocked: false },
    { name: 'disabled plus disabledFocusable', props: { disabled: true, disabledFocusable: true }, blocked: false },
    { name: 'aria-disabled boolean', props: { 'aria-disabled': true }, blocked: false },
    { name: 'aria-disabled string', props: { 'aria-disabled': 'true' }, blocked: false },
  ];
  (['submit', 'reset'] as const).forEach(type => {
    disabledModes.forEach(({ name, props, blocked }) => {
      const actions = blocked ? (['pointer'] as const) : (['pointer', 'Enter', 'Space'] as const);
      actions.forEach(action => {
        it(`${type} ${name} real ${action}: characterizes actual native form action versus guarded ARIA positive control`, () => {
          const navAction = cy.stub();
          const controlAction = cy.stub();
          const navClick = cy.stub();
          const controlClick = cy.stub();
          const select = cy.stub();
          const reset = cy.stub();
          const bubbled: string[] = [];
          const Guarded = ({ disabledProps }: { disabledProps: typeof props }) => {
            const guarded = useARIAButtonProps('button', { type, ...disabledProps, onClick: controlClick });
            return (
              <button {...guarded} data-testid="guarded">
                {name} control
              </button>
            );
          };
          const Forms = () => {
            const [guardDisabled, setGuardDisabled] = React.useState(false);
            const [active, setActive] = React.useState(0);
            return (
              <CarouselProvider
                value={{
                  ...carouselContextDefaultValue,
                  activeIndex: active,
                  resetAutoplay: reset,
                  selectPageByIndex: (event, index) => {
                    select(event, index);
                    setActive(index);
                  },
                }}
              >
                <button onClick={() => setGuardDisabled(true)}>Apply control mode</button>
                <form
                  data-testid="guard-form"
                  onSubmit={event => {
                    controlAction('submit', event.nativeEvent);
                    event.preventDefault();
                  }}
                  onReset={event => controlAction('reset', event.nativeEvent)}
                >
                  <input aria-label="Control field" data-testid="control-field" defaultValue="seed" />
                  <Guarded disabledProps={guardDisabled ? props : {}} />
                </form>
                <form
                  data-testid="nav-form"
                  onSubmit={event => {
                    navAction('submit', event.nativeEvent);
                    event.preventDefault();
                  }}
                  onReset={event => navAction('reset', event.nativeEvent)}
                >
                  <input aria-label="Nav field" data-testid="nav-field" defaultValue="seed" />
                  <div onClick={event => bubbled.push(`${event.defaultPrevented}`)}>
                    <CarouselNavIndexContextProvider value={2}>
                      <CarouselNavButton
                        {...props}
                        type={type}
                        name="page"
                        value="submitted-value"
                        data-testid="form-nav"
                        aria-label="Form page"
                        onClick={navClick}
                      />
                    </CarouselNavIndexContextProvider>
                  </div>
                </form>
              </CarouselProvider>
            );
          };
          mount(<Forms />);
          cy.get('[data-testid="control-field"]').clear().type('edited');
          activate('[data-testid="guarded"]', action);
          cy.then(() => {
            expect(controlAction.callCount, 'enabled native form positive control').to.equal(1);
            expect(controlAction.firstCall.args[0]).to.equal(type);
            expect(controlClick.callCount).to.equal(1);
          });
          cy.get('[data-testid="control-field"]').should('have.value', type === 'reset' ? 'seed' : 'edited');
          cy.contains('button', 'Apply control mode').realClick();
          cy.get('[data-testid="control-field"]').clear().type('edited');
          activate('[data-testid="guarded"]', action);
          cy.then(() => expect(controlAction.callCount).to.equal(name === 'enabled' ? 2 : 1));
          cy.get('[data-testid="control-field"]').should(
            'have.value',
            type === 'reset' && name === 'enabled' ? 'seed' : 'edited',
          );
          cy.get('[data-testid="nav-field"]').clear().type('edited');
          cy.get('[data-testid="form-nav"]').should('have.prop', 'disabled', blocked);
          activate('[data-testid="form-nav"]', action);
          cy.then(() => {
            const expected = blocked ? 0 : 1;
            expect(navAction.callCount, 'actual submit/reset not callback-only masking').to.equal(expected);
            if (expected) {
              expect(navAction.firstCall.args[0]).to.equal(type);
              expect(select.firstCall.args[1]).to.equal(2);
              expect(select.firstCall.args[0]).to.equal(navClick.firstCall.args[0]);
            }
            expect(navClick.callCount).to.equal(expected);
            expect(select.callCount).to.equal(expected);
            expect(reset.callCount).to.equal(expected);
            expect(bubbled).to.deep.equal(blocked ? [] : ['false']);
          });
          cy.get('[data-testid="nav-field"]').should('have.value', type === 'reset' && !blocked ? 'seed' : 'edited');
          cy.get('[data-testid="form-nav"]').should('have.attr', 'aria-selected', blocked ? 'false' : 'true');
        });
      });
    });
  });

  (['a', 'div'] as const).forEach(as => {
    (['disabled', 'disabledFocusable'] as const).forEach(mode => {
      it(`${as} ${mode} blocks Enter and Space but characterizes unguarded real pointer selection`, () => {
        const select = cy.stub();
        const reset = cy.stub();
        mount(
          <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select, resetAutoplay: reset }}>
            <CarouselNavButton
              as={as}
              role="tab"
              {...{ [mode]: true }}
              id="disabled-alt"
              aria-label="Disabled alternative"
            />
            <CarouselNavButton as={as} role="tab" id="enabled-alt" aria-label="Enabled alternative" />
          </CarouselProvider>,
        );
        cy.get('#enabled-alt').focus();
        cy.realPress('Enter');
        cy.then(() => expect(select.callCount).to.equal(1));
        cy.get('#disabled-alt').should('have.attr', 'aria-disabled', 'true');
        if (mode === 'disabledFocusable') {
          cy.get('#disabled-alt').should('have.attr', 'tabindex', '0');
          cy.get('#disabled-alt').focus();
          cy.realPress('Enter');
          cy.realPress('Space');
          cy.then(() => {
            expect(select.callCount).to.equal(1);
            expect(reset.callCount).to.equal(1);
          });
        }
        cy.get('#disabled-alt').realClick();
        cy.then(() => {
          expect(select.callCount, 'known replaced click guard').to.equal(2);
          expect(reset.callCount).to.equal(2);
        });
      });
    });
  });

  it('disabled anchor removes its href but does not prevent the NavButton pointer callback', () => {
    const select = cy.stub();
    mount(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
        <CarouselNavButton
          as="a"
          disabled
          href="#disabled-target"
          role="tab"
          id="disabled-link"
          aria-label="Disabled link"
        />
      </CarouselProvider>,
    );
    cy.get('#disabled-link').should('not.have.attr', 'href');
    cy.get('#disabled-link').realClick();
    cy.then(() => expect(select.callCount).to.equal(1));
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`${dir} dynamically disabled selected tab changes real Tab entry and arrows skip it without selecting`, () => {
      const select = cy.stub();
      const Dynamic = () => {
        const [disabled, setDisabled] = React.useState(false);
        return (
          <>
            <button data-testid="before" onClick={() => setDisabled(!disabled)}>
              Toggle disabled
            </button>
            <CarouselProvider value={{ ...carouselContextDefaultValue, activeIndex: 1, selectPageByIndex: select }}>
              <CarouselNav totalSlides={3} aria-label="Dynamic pages">
                {index => (
                  <CarouselNavButton
                    disabled={disabled && index === 1}
                    aria-label={`Page ${index}`}
                    data-testid={`button-${index}`}
                  />
                )}
              </CarouselNav>
            </CarouselProvider>
            <button data-testid="after">After</button>
          </>
        );
      };
      mount(<Dynamic />, dir);
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      tab(1).should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.get('[data-testid="before"]').realClick().focus();
      tab(1).should('be.disabled');
      cy.realPress('Tab');
      tab(0).should('be.focused');
      cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      tab(2).should('be.focused');
      cy.realPress(dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
      tab(0).should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      tab(2).should('be.focused');
      selected(1);
      cy.then(() => expect(select.callCount).to.equal(0));
    });
  });

  it('resolves labelledby and describedby endpoints and preserves a consumer text name without a live-region promise', () => {
    mount(
      <>
        <span id="page-name">Quarterly results</span>
        <span id="page-description">Open the next panel</span>
        <CarouselNavButton aria-labelledby="page-name" aria-describedby="page-description" id="named">
          Visible page
        </CarouselNavButton>
      </>,
    );
    cy.get('#named')
      .should('have.attr', 'aria-labelledby', 'page-name')
      .and('have.attr', 'aria-describedby', 'page-description')
      .and('have.text', 'Visible page');
    cy.get('#page-name').should('have.text', 'Quarterly results');
    cy.get('#page-description').should('have.text', 'Open the next panel');
    cy.get('#named').should('not.have.attr', 'aria-live');
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Page.getFrameTree',
        params: {},
      }),
    )
      .then((page: { frameTree: BrowserFrame }) => {
        const frameIds: string[] = [];
        const collect = (frame: BrowserFrame) => {
          frameIds.push(frame.frame.id);
          frame.childFrames?.forEach(collect);
        };
        collect(page.frameTree);
        return Promise.all(
          frameIds.map(frameId =>
            Cypress.automation('remote:debugger:protocol', {
              command: 'Accessibility.getFullAXTree',
              params: { frameId },
            }).then((tree: { nodes: AccessibleNode[] }) => tree.nodes),
          ),
        ).then(trees => trees.flat());
      })
      .then((nodes: AccessibleNode[]) => {
        const namedTabs = nodes.filter(
          node => !node.ignored && node.role?.value === 'tab' && node.name?.value === 'Quarterly results',
        );
        expect(namedTabs).to.have.length(1);
        expect(namedTabs[0].description?.value).to.equal('Open the next panel');
      });
  });

  [false, true].forEach(brand => {
    it(`${
      brand ? 'brand' : 'default'
    } real hover active release and keyboard focus produce actual pseudo-element styles`, () => {
      mount(
        <CarouselNav totalSlides={2} appearance={brand ? 'brand' : undefined} aria-label="Interaction styles">
          {index => <CarouselNavButton data-testid={`button-${index}`} aria-label={`Page ${index}`} />}
        </CarouselNav>,
      );
      tab(1).realHover();
      tab(1).should(elements => expect(pseudo(elements[0]).opacity).to.equal('0.75'));
      tab(1).realMouseDown();
      tab(1).should(elements => expect(pseudo(elements[0]).opacity).to.equal('1'));
      tab(1).realMouseUp();
      tab(1).should(elements => expect(pseudo(elements[0]).opacity).to.equal('0.75'));
      tab(0).realHover();
      tab(0).should(elements => {
        const style = pseudo(elements[0]);
        expect(style.opacity).to.equal(brand ? '1' : '0.75');
        expect(style.backgroundColor).to.equal(
          cssColor(
            elements[0],
            brand ? teamsLightTheme.colorCompoundBrandBackgroundHover : teamsLightTheme.colorNeutralForeground1,
          ),
        );
      });
      tab(0).realMouseDown();
      tab(0).should(elements => {
        const style = pseudo(elements[0]);
        expect(style.opacity).to.equal(brand ? '1' : '0.65');
        expect(style.backgroundColor).to.equal(
          cssColor(
            elements[0],
            brand ? teamsLightTheme.colorCompoundBrandBackgroundPressed : teamsLightTheme.colorNeutralForeground1,
          ),
        );
      });
      tab(0).realMouseUp();
      tab(0).focus();
      cy.realPress('ArrowRight');
      tab(1)
        .should('be.focused')
        .should(elements => {
          const focus = elements[0].ownerDocument.defaultView!.getComputedStyle(elements[0]);
          expect(focus.borderTopWidth).to.equal(teamsLightTheme.strokeWidthThick);
          expect(focus.borderTopColor).to.equal(cssColor(elements[0], teamsLightTheme.colorStrokeFocus2));
        });
    });
  });

  it('forced colors exposes the actual dot inversion rule and keyboard focus border with media positive control', () => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: 'active' }] },
      }),
    );
    mount(
      <>
        <button data-testid="before">Before</button>
        <CarouselNav totalSlides={2} aria-label="Forced colors pages">
          {index => <CarouselNavButton data-testid={`button-${index}`} aria-label={`Page ${index}`} />}
        </CarouselNav>
      </>,
    );
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    tab(0)
      .should('be.focused')
      .should(elements => {
        const element = elements[0];
        expect(element.ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(true);
        expect(pseudo(element).forcedColorAdjust).to.equal('none');
        expect(pseudo(element).mixBlendMode).to.equal('difference');
        expect(pseudo(element).backgroundColor).to.equal('rgb(255, 255, 255)');
        expect(element.ownerDocument.defaultView!.getComputedStyle(element).borderTopWidth).to.equal(
          teamsLightTheme.strokeWidthThick,
        );
      });
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
    tab(0).should(elements =>
      expect(elements[0].ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(false),
    );
  });

  it('characterizes SENSITIVE DEFECT: disabledFocusable submits the actual form despite disabled ARIA', () => {
    const submit = cy.stub();
    mount(
      <form
        onSubmit={event => {
          submit();
          event.preventDefault();
        }}
      >
        <button type="submit" data-testid="positive-submit">
          Enabled control
        </button>
        <CarouselNavButton
          disabledFocusable
          type="submit"
          aria-label="Disabled submission"
          data-testid="sensitive-submit"
        />
      </form>,
    );
    cy.get('[data-testid="positive-submit"]').realClick();
    cy.then(() => expect(submit.callCount).to.equal(1));
    cy.get('[data-testid="sensitive-submit"]').should('have.attr', 'aria-disabled', 'true').realClick();
    cy.then(() => expect(submit.callCount, 'known unguarded native default: unwanted submission').to.equal(2));
  });
});

describe('CarouselNavButton documented API', () => {
  it('defaults to a named native tab with an empty root and no invented icon or Button variants', () => {
    mount(<CarouselNavButton aria-label="Page one" data-testid="standalone" />);
    cy.get('[data-testid="standalone"]')
      .should('match', 'button')
      .and('have.attr', 'type', 'button')
      .and('have.attr', 'role', 'tab')
      .and('have.attr', 'aria-label', 'Page one')
      .and('have.attr', 'aria-selected', 'true')
      .and('have.class', carouselNavButtonClassNames.root)
      .should(elements => {
        ['data-index', 'aria-controls', 'aria-checked', 'aria-live'].forEach(attribute =>
          expect(elements[0].hasAttribute(attribute), attribute).to.equal(false),
        );
        expect(elements[0].childNodes.length).to.equal(0);
      });
  });

  it('forwards native attributes children consumer class style and a button ref without treating value as page index', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const select = cy.stub();
    mount(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
        <CarouselNavIndexContextProvider value={2}>
          <CarouselNavButton
            ref={ref}
            id="native"
            title="Choose third page"
            lang="fr"
            name="page"
            value="not-an-index"
            data-index="consumer-value"
            className="consumer-button"
            style={{ marginLeft: 3 }}
          >
            <span>Third page</span>
          </CarouselNavButton>
        </CarouselNavIndexContextProvider>
      </CarouselProvider>,
    );
    cy.get('#native')
      .should('have.class', 'consumer-button')
      .and('have.attr', 'name', 'page')
      .and('have.attr', 'value', 'not-an-index')
      .and('have.attr', 'data-index', 'consumer-value')
      .and('have.attr', 'title', 'Choose third page')
      .and('have.attr', 'lang', 'fr')
      .and('have.css', 'margin-left', '3px')
      .and('have.text', 'Third page')
      .and('have.attr', 'aria-selected', 'false')
      .then(elements => expect(ref.current).to.equal(elements[0]));
    cy.get('#native span').realClick();
    cy.then(() => {
      expect(select.callCount).to.equal(1);
      expect(select.firstCall.args[1]).to.equal(2);
      expect(select.firstCall.args).to.have.length(2);
    });
  });

  (['a', 'div'] as const).forEach(as => {
    it(`supports ${as} polymorphism with forwarded ref and explicit tab semantics`, () => {
      const ref = React.createRef<HTMLAnchorElement | HTMLDivElement>();
      mount(<CarouselNavButton as={as} ref={ref} role="tab" aria-label="Alternative page" id="alternate" />);
      cy.get('#alternate')
        .should('match', as)
        .and('have.attr', 'role', 'tab')
        .and('have.attr', 'tabindex', '0')
        .and('have.attr', 'aria-selected', 'true')
        .then(elements => expect(ref.current).to.equal(elements[0]));
    });

    it(`characterizes ${as} ARIA helper default role overriding the native tab default`, () => {
      mount(<CarouselNavButton as={as} aria-label="Alternative page" id="alternate" />);
      cy.get('#alternate').should('have.attr', 'role', 'button');
    });
  });

  it('enabled anchor retains href target and rel while its helper leaves the link role implicit', () => {
    mount(<CarouselNavButton as="a" href="#page" target="_self" rel="nofollow" id="link" aria-label="Linked page" />);
    cy.get('#link')
      .should('have.attr', 'href', '#page')
      .and('have.attr', 'target', '_self')
      .and('have.attr', 'rel', 'nofollow')
      .and('not.have.attr', 'role');
  });

  (['pointer', 'Enter', 'Space'] as const).forEach(action => {
    it(`native ${action} selects the contextual page with the exact click payload not a keyboard reason`, () => {
      const change = cy.stub();
      const click = cy.stub();
      mount(<Fixture onActiveIndexChange={change} buttonProps={() => ({ onClick: click })} />);
      selected(0);
      if (action === 'pointer') {
        tab(2).realClick();
      } else {
        tab(2).focus();
        cy.realPress(action);
      }
      selected(2);
      tab(2).should('be.focused');
      cy.then(() => {
        expect(change.callCount).to.equal(1);
        expect(click.callCount).to.equal(1);
        const [event, data] = change.firstCall.args;
        expect(event).to.equal(click.firstCall.args[0]);
        expect(event.type).to.equal('click');
        expect(data).to.deep.equal({ event, type: 'click', index: 2 });
        expect(event.nativeEvent.type).to.equal('click');
        expect(event.nativeEvent.detail).to.equal(action === 'pointer' ? 1 : 0);
      });
    });
  });

  (['a', 'div'] as const).forEach(as => {
    (['Enter', 'Space'] as const).forEach(key => {
      it(`${as} real ${key} generates one click and exact parent click payload`, () => {
        const change = cy.stub();
        mount(<Fixture onActiveIndexChange={change} buttonProps={() => ({ as, role: 'tab' })} />);
        tab(1).focus();
        cy.realPress(key);
        selected(1);
        tab(1).should('be.focused');
        cy.then(() => {
          expect(change.callCount).to.equal(1);
          const [event, data] = change.firstCall.args;
          expect(event.type).to.equal('click');
          expect(data).to.deep.equal({ event, type: 'click', index: 1 });
        });
      });
    });
  });

  it('uses parent controlled feedback and external active changes without an independent button value state', () => {
    const change = cy.stub();
    const Controlled = () => {
      const [active, setActive] = React.useState(1);
      return (
        <>
          <button onClick={() => setActive(3)}>External page</button>
          <Fixture
            activeIndex={active}
            onActiveIndexChange={(event, data) => {
              change(event, data);
              setActive(data.index);
            }}
          />
        </>
      );
    };
    mount(<Controlled />);
    selected(1);
    tab(2).realClick();
    selected(2);
    cy.contains('button', 'External page').realClick();
    selected(3);
    cy.then(() => expect(change.getCalls().map(call => call.args[1].index)).to.deep.equal([2]));
  });

  it('respects caller role selected ARIA and tabIndex overrides without adding checked or indeterminate state', () => {
    mount(
      <CarouselNavButton role="button" aria-selected={false} tabIndex={-1} aria-label="Custom semantics" id="custom" />,
    );
    cy.get('#custom')
      .should('have.attr', 'role', 'button')
      .and('have.attr', 'aria-selected', 'false')
      .and('have.attr', 'tabindex', '-1')
      .and('not.have.attr', 'aria-checked');
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    [false, true].forEach(dark => {
      [false, true].forEach(brand => {
        it(`${dir} ${dark ? 'dark' : 'light'} ${
          brand ? 'brand' : 'default'
        } renders selected pill unselected dot and themed geometry`, () => {
          const theme = dark ? teamsDarkTheme : teamsLightTheme;
          mount(
            <CarouselProvider value={{ ...carouselContextDefaultValue, activeIndex: 1 }}>
              <CarouselNav totalSlides={2} appearance={brand ? 'brand' : undefined} aria-label="Styled pages">
                {index => <CarouselNavButton aria-label={`Page ${index + 1}`} data-testid={`button-${index}`} />}
              </CarouselNav>
            </CarouselProvider>,
            dir,
            dark,
          );
          tab(0).should(elements => {
            const dot = pseudo(elements[0]);
            expect(dot.width).to.equal(theme.spacingHorizontalS);
            expect(dot.height).to.equal(theme.spacingVerticalS);
            expect(dot.borderRadius).to.equal('50%');
            expect(dot.opacity).to.equal('0.6');
            expect(dot.backgroundColor).to.equal(cssColor(elements[0], theme.colorNeutralForeground1));
            expect(elements[0].getBoundingClientRect().width).to.equal(3 * parseFloat(theme.spacingHorizontalS));
          });
          tab(1).should(elements => {
            const pill = pseudo(elements[0]);
            expect(pill.width).to.equal(theme.spacingHorizontalL);
            expect(pill.borderRadius).to.equal('4px');
            expect(pill.opacity).to.equal('1');
            expect(pill.backgroundColor).to.equal(
              cssColor(elements[0], brand ? theme.colorCompoundBrandBackground : theme.colorNeutralForeground1),
            );
            expect(elements[0].getBoundingClientRect().width).to.equal(
              parseFloat(theme.spacingHorizontalL) + 2 * parseFloat(theme.spacingHorizontalXS),
            );
          });
          tab(0).then(dot =>
            tab(1).then(pill => {
              expect(dot[0].getBoundingClientRect().left < pill[0].getBoundingClientRect().left).to.equal(
                dir === 'ltr',
              );
            }),
          );
        });
      });
    });
  });

  it('exported hook styles and renderer preserve root render function native props children ref and activation', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const select = cy.stub();
    const renderRoot: SlotRenderFunction<React.ComponentPropsWithRef<'button'>> = (Component, props) => (
      <Component {...props} data-rendered="true">
        <span data-testid="custom-content">Rendered page</span>
      </Component>
    );
    const Composed = () => {
      const state = useCarouselNavButton_unstable({ 'aria-label': 'Composed page', title: 'Custom root' }, ref);
      useCarouselNavButtonStyles_unstable(state);
      state.root = slot.always({ ...state.root, children: renderRoot }, { elementType: 'button' });
      return renderCarouselNavButton_unstable(state);
    };
    mount(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
        <CarouselNavIndexContextProvider value={3}>
          <Composed />
        </CarouselNavIndexContextProvider>
      </CarouselProvider>,
    );
    cy.get('[data-rendered="true"]')
      .should('have.class', carouselNavButtonClassNames.root)
      .and('have.attr', 'role', 'tab')
      .and('have.attr', 'title', 'Custom root')
      .then(elements => expect(ref.current).to.equal(elements[0]));
    cy.get('[data-testid="custom-content"]').realClick();
    cy.then(() => expect(select.firstCall.args[1]).to.equal(3));
  });
});

describe('CarouselNavButton unit and source derived', () => {
  it('public root children render function receives native props selected state ref and click handler without an icon slot', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const click = cy.stub();
    const renderRoot: SlotRenderFunction<React.ComponentPropsWithRef<'button'>> = (Component, props) => (
      <Component {...props} data-testid="public-render">
        <span>Public rendered page</span>
      </Component>
    );
    mount(
      <CarouselNavButton ref={ref} title="Rendered root" aria-label="Public custom page" onClick={click}>
        {renderRoot}
      </CarouselNavButton>,
    );
    cy.get('[data-testid="public-render"]')
      .should('have.attr', 'aria-selected', 'true')
      .and('have.attr', 'role', 'tab')
      .and('have.attr', 'title', 'Rendered root')
      .and('have.class', carouselNavButtonClassNames.root)
      .then(elements => expect(ref.current).to.equal(elements[0]));
    cy.get('[data-testid="public-render"] span').realClick();
    cy.then(() => expect(click.callCount).to.equal(1));
  });

  it('uncontrolled nonzero parent defaultActiveIndex initializes selection then native activation updates the page and physical alignment', () => {
    const change = cy.stub();
    mount(<Fixture defaultActiveIndex={2} onActiveIndexChange={change} />);
    selected(2);
    tab(1).realClick();
    selected(1);
    cy.get('#button-b').should(elements => {
      const viewport = elements[0].closest('.fui-CarouselViewport');
      expect(viewport).not.to.equal(null);
      expect(
        Math.abs(elements[0].getBoundingClientRect().left - viewport!.getBoundingClientRect().left),
      ).to.be.lessThan(1);
    });
    cy.then(() => expect(change.getCalls().map(call => call.args[1].index)).to.deep.equal([1]));
  });

  (['submit', 'reset'] as const).forEach(type => {
    it(`${type} user click veto cancels the actual native form default without hiding it in callback-only assertions`, () => {
      const formAction = cy.stub();
      const select = cy.stub();
      const reset = cy.stub();
      mount(
        <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select, resetAutoplay: reset }}>
          <form
            onSubmit={event => {
              formAction('submit');
              event.preventDefault();
            }}
            onReset={() => formAction('reset')}
          >
            <input defaultValue="seed" data-testid="veto-field" aria-label="Veto field" />
            <button type={type} data-testid="form-positive">
              Native positive
            </button>
            <CarouselNavButton
              type={type}
              id="form-veto"
              aria-label="Veto form action"
              onClick={event => event.preventDefault()}
            />
          </form>
        </CarouselProvider>,
      );
      cy.get('[data-testid="veto-field"]').clear().type('edited');
      cy.get('[data-testid="form-positive"]').realClick();
      cy.then(() => {
        expect(formAction.callCount).to.equal(1);
        expect(formAction.firstCall.args[0]).to.equal(type);
      });
      cy.get('[data-testid="veto-field"]')
        .should('have.value', type === 'reset' ? 'seed' : 'edited')
        .clear()
        .type('edited');
      cy.get('#form-veto').realClick();
      cy.get('[data-testid="veto-field"]').should('have.value', 'edited');
      cy.then(() => {
        expect(formAction.callCount).to.equal(1);
        expect(select.callCount).to.equal(0);
        expect(reset.callCount).to.equal(1);
      });
    });
  });

  it('typed API has only a required root slot and no icon size shape appearance checked or indeterminate Button props', () => {
    const slots: Record<keyof CarouselNavButtonSlots, true> = { root: true };
    const unsupported: Record<
      Extract<keyof CarouselNavButtonProps, 'icon' | 'size' | 'shape' | 'appearance' | 'checked' | 'indeterminate'>,
      never
    > = {};
    expect(Object.keys(slots)).to.deep.equal(['root']);
    expect(Object.keys(unsupported)).to.deep.equal([]);
    mount(<CarouselNavButton aria-label="Root only" />);
    cy.get('.fui-CarouselNavButton').should(elements => {
      expect(elements[0].childElementCount).to.equal(0);
      expect(elements[0].hasAttribute('size')).to.equal(false);
      expect(elements[0].hasAttribute('appearance')).to.equal(false);
    });
  });

  it('omitted and explicit button types never perform native form submission unlike the submit positive control', () => {
    const submit = cy.stub();
    const select = cy.stub();
    mount(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
        <form
          onSubmit={event => {
            submit();
            event.preventDefault();
          }}
        >
          <button type="submit" id="submit-positive">
            Submit control
          </button>
          <CarouselNavButton id="default-action" aria-label="Default action" />
          <CarouselNavButton type="button" id="button-action" aria-label="Button action" />
        </form>
      </CarouselProvider>,
    );
    cy.get('#submit-positive').realClick();
    cy.then(() => expect(submit.callCount).to.equal(1));
    cy.get('#default-action').realClick();
    cy.get('#button-action').focus();
    cy.realPress('Enter');
    cy.then(() => {
      expect(select.callCount).to.equal(2);
      expect(submit.callCount).to.equal(1);
    });
  });

  (['button', 'a', 'div'] as const).forEach(as => {
    it(`${as} first enabled callback after disabled toggle uses latest user context index and reset handlers`, () => {
      const calls: string[] = [];
      const Dynamic = () => {
        const [latest, setLatest] = React.useState(false);
        return (
          <>
            <button onClick={() => setLatest(true)}>Enable latest page</button>
            <CarouselProvider
              value={{
                ...carouselContextDefaultValue,
                activeIndex: latest ? 3 : 0,
                selectPageByIndex: (_, index) => calls.push(`${latest ? 'new' : 'old'}-select:${index}`),
                resetAutoplay: () => calls.push(`${latest ? 'new' : 'old'}-reset`),
              }}
            >
              <CarouselNavIndexContextProvider value={latest ? 3 : 1}>
                <CarouselNavButton
                  as={as}
                  role="tab"
                  disabled={!latest}
                  id="latest"
                  aria-label="Latest page"
                  data-index={latest ? 'consumer-new' : 'consumer-old'}
                  {...(as === 'button' ? { value: latest ? 'new-native-value' : 'old-native-value' } : {})}
                  onClick={() => calls.push(`${latest ? 'new' : 'old'}-user`)}
                />
              </CarouselNavIndexContextProvider>
            </CarouselProvider>
          </>
        );
      };
      mount(<Dynamic />);
      if (as === 'button') {
        cy.get('#latest').should('be.disabled').realClick();
        cy.then(() => expect(calls).to.deep.equal([]));
      } else {
        cy.get('#latest').should('have.attr', 'aria-disabled', 'true');
      }
      cy.contains('button', 'Enable latest page').realClick();
      cy.get('#latest').should('have.attr', 'aria-selected', 'true').and('have.attr', 'data-index', 'consumer-new');
      if (as === 'button') {
        cy.get('#latest').should('have.attr', 'value', 'new-native-value');
      }
      cy.get('#latest').focus();
      cy.realPress('Enter');
      cy.then(() => expect(calls).to.deep.equal(['new-user', 'new-select:3', 'new-reset']));
    });
  });

  it('native disabledFocusable omits consumer key handlers but invokes click until reenabled restores current key handlers', () => {
    const calls: string[] = [];
    const Dynamic = () => {
      const [enabled, setEnabled] = React.useState(false);
      return (
        <>
          <button onClick={() => setEnabled(true)}>Reenable native</button>
          <CarouselNavButton
            disabledFocusable={!enabled}
            id="keys"
            aria-label="Key handlers"
            onClick={() => calls.push(`${enabled ? 'new' : 'old'}-click`)}
            onKeyDown={() => calls.push(`${enabled ? 'new' : 'old'}-down`)}
            onKeyUp={() => calls.push(`${enabled ? 'new' : 'old'}-up`)}
          />
        </>
      );
    };
    mount(<Dynamic />);
    cy.get('#keys').focus();
    cy.realPress('Enter');
    cy.then(() => expect(calls).to.deep.equal(['old-click']));
    cy.contains('button', 'Reenable native').realClick();
    cy.get('#keys').focus();
    cy.realPress('Enter');
    cy.then(() => expect(calls).to.deep.equal(['old-click', 'new-down', 'new-click', 'new-up']));
  });

  it('stopPropagation does not veto selection and a late parent preventDefault does not undo selection or reset', () => {
    const calls: string[] = [];
    mount(
      <CarouselProvider
        value={{
          ...carouselContextDefaultValue,
          selectPageByIndex: () => calls.push('select'),
          resetAutoplay: () => calls.push('reset'),
        }}
      >
        <div
          onClick={event => {
            calls.push('parent');
            event.preventDefault();
          }}
        >
          <CarouselNavButton
            id="stop"
            aria-label="Stop propagation"
            onClick={event => {
              calls.push('user-stop');
              event.stopPropagation();
            }}
          />
          <CarouselNavButton id="bubble" aria-label="Bubble cancellation" onClick={() => calls.push('user-bubble')} />
        </div>
      </CarouselProvider>,
    );
    cy.get('#stop').realClick();
    cy.then(() => expect(calls).to.deep.equal(['user-stop', 'select', 'reset']));
    cy.get('#bubble').realClick();
    cy.then(() =>
      expect(calls).to.deep.equal(['user-stop', 'select', 'reset', 'user-bubble', 'select', 'reset', 'parent']),
    );
  });

  it('repeated selected-page clicks still call the contextual selection and reset exactly once per click', () => {
    const select = cy.stub();
    const reset = cy.stub();
    mount(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select, resetAutoplay: reset }}>
        <CarouselNavButton id="repeat" aria-label="Current page" />
      </CarouselProvider>,
    );
    cy.get('#repeat').should('have.attr', 'aria-selected', 'true').realClick().realClick();
    cy.then(() => {
      expect(select.getCalls().map(call => call.args[1])).to.deep.equal([0, 0]);
      expect(reset.callCount).to.equal(2);
    });
  });

  it('SVG child click is characterized as a non-HTMLElement target so selection is absent while autoplay still resets', () => {
    const select = cy.stub();
    const reset = cy.stub();
    mount(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select, resetAutoplay: reset }}>
        <CarouselNavButton id="svg-page" aria-label="SVG page">
          <svg width="16" height="16" data-testid="svg-content">
            <rect width="16" height="16" />
          </svg>
        </CarouselNavButton>
        <CarouselNavButton id="html-page" aria-label="HTML positive">
          <span>HTML child</span>
        </CarouselNavButton>
      </CarouselProvider>,
    );
    cy.get('#svg-page rect').realClick();
    cy.then(() => {
      expect(select.callCount).to.equal(0);
      expect(reset.callCount).to.equal(1);
    });
    cy.get('#html-page span').realClick();
    cy.then(() => {
      expect(select.callCount).to.equal(1);
      expect(reset.callCount).to.equal(2);
    });
  });

  it('replaces callback refs and clears them on unmount while keeping the same native root through rerenders', () => {
    const oldRef = cy.stub();
    const newRef = cy.stub();
    let original: HTMLElement;
    const RefLifecycle = () => {
      const [latest, setLatest] = React.useState(false);
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button onClick={() => setLatest(true)}>Replace ref</button>
          <button onClick={() => setShown(false)}>Remove root</button>
          {shown && <CarouselNavButton id="ref-root" aria-label="Referenced page" ref={latest ? newRef : oldRef} />}
        </>
      );
    };
    mount(<RefLifecycle />);
    cy.get('#ref-root').then(elements => {
      original = elements[0];
      expect(oldRef.lastCall.args[0]).to.equal(original);
    });
    cy.contains('button', 'Replace ref').realClick();
    cy.get('#ref-root').then(elements => {
      expect(elements[0]).to.equal(original);
      expect(oldRef.lastCall.args[0]).to.equal(null);
      expect(newRef.lastCall.args[0]).to.equal(original);
    });
    cy.contains('button', 'Remove root').realClick();
    cy.get('#ref-root').should('not.exist');
    cy.then(() => expect(newRef.lastCall.args[0]).to.equal(null));
  });

  it('index and subscription replacement dispose the old listener and update exact ordered IDREFs only on publication', () => {
    const oldListeners = new Set<(data: CarouselUpdateData) => void>();
    const newListeners = new Set<(data: CarouselUpdateData) => void>();
    const subscribe = (listeners: typeof oldListeners) => (listener: (data: CarouselUpdateData) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    };
    const oldSubscribe = subscribe(oldListeners);
    const newSubscribe = subscribe(newListeners);
    const Publication = () => {
      const [latest, setLatest] = React.useState(false);
      const [index, setIndex] = React.useState(0);
      const [shown, setShown] = React.useState(true);
      const publish = (event: React.MouseEvent<HTMLButtonElement>) => {
        const doc = event.currentTarget.ownerDocument;
        const slideNodes = ['panel-a', 'panel-b', 'panel-c'].map(id => {
          const node = doc.getElementById(id);
          if (!node) {
            throw new Error(`Missing publication endpoint ${id}`);
          }
          return node;
        });
        const data: CarouselUpdateData = {
          activeIndex: 0,
          navItemsCount: 2,
          groupIndexList: [[0, 1], [2]],
          slideNodes,
        };
        (latest ? newListeners : oldListeners).forEach(listener => listener(data));
      };
      return (
        <CarouselProvider
          value={{ ...carouselContextDefaultValue, subscribeForValues: latest ? newSubscribe : oldSubscribe }}
        >
          <button onClick={publish}>Publish values</button>
          <button onClick={() => setIndex(1)}>Change index</button>
          <button onClick={() => setLatest(true)}>Replace subscription</button>
          <button onClick={() => setIndex(4)}>Select empty group</button>
          <button onClick={() => setShown(!shown)}>Toggle subscriber</button>
          <div role="tabpanel" id="panel-a">
            A
          </div>
          <div role="tabpanel" id="panel-b">
            B
          </div>
          <div role="tabpanel" id="panel-c">
            C
          </div>
          <CarouselNavIndexContextProvider value={index}>
            {shown && <CarouselNavButton id="subscriber" aria-label="Subscriber" aria-controls="consumer-initial" />}
          </CarouselNavIndexContextProvider>
        </CarouselProvider>
      );
    };
    mount(<Publication />);
    cy.get('#subscriber')
      .should('have.attr', 'aria-controls', 'consumer-initial')
      .then(() => expect(oldListeners.size).to.equal(1));
    cy.contains('button', 'Publish values').realClick();
    cy.get('#subscriber').should('have.attr', 'aria-controls', 'panel-a panel-b');
    cy.contains('button', 'Change index').realClick();
    cy.get('#subscriber')
      .should('have.attr', 'aria-controls', 'panel-a panel-b')
      .then(() => expect(oldListeners.size).to.equal(1));
    cy.contains('button', 'Publish values').realClick();
    cy.get('#subscriber').should('have.attr', 'aria-controls', 'panel-c');
    cy.contains('button', 'Replace subscription').realClick();
    cy.get('#subscriber').then(() => {
      expect(oldListeners.size).to.equal(0);
      expect(newListeners.size).to.equal(1);
    });
    cy.contains('button', 'Select empty group').realClick();
    cy.contains('button', 'Publish values').realClick();
    cy.get('#subscriber').should('have.attr', 'aria-controls', '');
    cy.contains('button', 'Toggle subscriber').realClick();
    cy.get('#subscriber')
      .should('not.exist')
      .then(() => expect(newListeners.size).to.equal(0));
    cy.contains('button', 'Toggle subscriber').realClick();
    cy.get('#subscriber')
      .should('have.attr', 'aria-controls', 'consumer-initial')
      .then(() => expect(newListeners.size).to.equal(1));
    cy.contains('button', 'Publish values').realClick();
    cy.get('#subscriber').should('have.attr', 'aria-controls', '');
  });

  (['button', 'a'] as const).forEach(as => {
    it(`${as} real grouped card publication removal and remount give surviving buttons exact live controls`, () => {
      const Lifecycle = () => {
        const [wide, setWide] = React.useState(false);
        const [cards, setCards] = React.useState(['a', 'b', 'c', 'd']);
        const [version, setVersion] = React.useState(0);
        return (
          <>
            <button onClick={() => setWide(!wide)}>Publish real layout</button>
            <button onClick={() => setCards(['a', 'b'])}>Remove grouped cards</button>
            <button onClick={() => setVersion(1)}>Remount pagination roots</button>
            <Fixture
              half
              cards={cards}
              style={{ width: wide ? 500 : 480 }}
              buttonProps={index => ({ as, role: 'tab', key: `${version}-${index}` })}
            />
          </>
        );
      };
      const relationship = (index: number, ids: string) =>
        tab(index)
          .should('have.attr', 'aria-controls', ids)
          .should(elements => {
            ids.split(' ').forEach(id => {
              const panel = elements[0].ownerDocument.getElementById(id);
              expect(panel, `live ${id}`).not.to.equal(null);
              expect(panel!.getAttribute('role')).to.equal('tabpanel');
            });
          });
      mount(<Lifecycle />);
      tab(0).should('not.have.attr', 'aria-controls');
      cy.contains('button', 'Publish real layout').realClick();
      relationship(0, 'button-a button-b');
      relationship(1, 'button-c button-d');
      tab(1).realClick();
      selected(1);
      cy.contains('button', 'Remove grouped cards').realClick();
      cy.get('#button-c, #button-d').should('not.exist');
      tab(1).should('not.exist');
      relationship(0, 'button-a button-b');
      cy.contains('button', 'Remount pagination roots').realClick();
      tab(0).should('not.have.attr', 'aria-controls');
      cy.contains('button', 'Publish real layout').realClick();
      relationship(0, 'button-a button-b');
      selected(0);
    });
  });

  it('nested independent Carousel contexts isolate selected styling clicks and autoplay reset ownership', () => {
    const outerSelect = cy.stub();
    const innerSelect = cy.stub();
    const outerReset = cy.stub();
    const innerReset = cy.stub();
    mount(
      <CarouselProvider
        value={{
          ...carouselContextDefaultValue,
          activeIndex: 2,
          selectPageByIndex: outerSelect,
          resetAutoplay: outerReset,
        }}
      >
        <CarouselNavIndexContextProvider value={2}>
          <CarouselNavButton id="outer" aria-label="Outer page" />
          <CarouselProvider
            value={{
              ...carouselContextDefaultValue,
              activeIndex: 0,
              selectPageByIndex: innerSelect,
              resetAutoplay: innerReset,
            }}
          >
            <CarouselNavButton id="inner" aria-label="Inner page" />
          </CarouselProvider>
        </CarouselNavIndexContextProvider>
      </CarouselProvider>,
    );
    cy.get('#outer').should('have.attr', 'aria-selected', 'true');
    cy.get('#inner').should('have.attr', 'aria-selected', 'false').realClick();
    cy.then(() => {
      expect(innerSelect.firstCall.args[1]).to.equal(2);
      expect(innerReset.callCount).to.equal(1);
      expect(outerSelect.callCount).to.equal(0);
      expect(outerReset.callCount).to.equal(0);
    });
    cy.get('#outer').realClick();
    cy.then(() => {
      expect(outerSelect.firstCall.args[1]).to.equal(2);
      expect(outerReset.callCount).to.equal(1);
      expect(innerSelect.callCount).to.equal(1);
      expect(innerReset.callCount).to.equal(1);
    });
  });

  it('live Nav appearance and provider theme changes restyle the same root while consumer Griffel width wins', () => {
    const LiveStyles = () => {
      const classes = useNavButtonCoverageStyles();
      const [brand, setBrand] = React.useState(false);
      const [dark, setDark] = React.useState(false);
      return (
        <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme}>
          <button onClick={() => setBrand(!brand)}>Toggle brand</button>
          <button onClick={() => setDark(!dark)}>Toggle theme</button>
          <CarouselNav totalSlides={1} appearance={brand ? 'brand' : undefined} aria-label="Live style">
            {() => <CarouselNavButton data-testid="button-0" className={classes.override} aria-label="Styled page" />}
          </CarouselNav>
        </FluentProvider>
      );
    };
    let original: HTMLElement;
    mount(<LiveStyles />);
    tab(0).then(elements => {
      original = elements[0];
    });
    tab(0).should('have.css', 'width', teamsLightTheme.spacingHorizontalXXL);
    cy.contains('button', 'Toggle brand').realClick();
    tab(0).should(elements => {
      expect(elements[0]).to.equal(original);
      expect(pseudo(elements[0]).backgroundColor).to.equal(
        cssColor(elements[0], teamsLightTheme.colorCompoundBrandBackground),
      );
    });
    cy.contains('button', 'Toggle theme').realClick();
    tab(0).should(elements => {
      expect(elements[0]).to.equal(original);
      expect(pseudo(elements[0]).backgroundColor).to.equal(
        cssColor(elements[0], teamsDarkTheme.colorCompoundBrandBackground),
      );
    });
    cy.contains('button', 'Toggle brand').realClick();
    tab(0).should(elements =>
      expect(pseudo(elements[0]).backgroundColor).to.equal(
        cssColor(elements[0], teamsDarkTheme.colorNeutralForeground1),
      ),
    );
  });
});
