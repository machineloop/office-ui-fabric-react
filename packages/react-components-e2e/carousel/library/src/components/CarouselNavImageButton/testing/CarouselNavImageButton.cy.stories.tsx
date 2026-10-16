import 'cypress-real-events';
import * as React from 'react';
import * as axe from 'axe-core';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  tokens,
  makeStyles,
  mergeClasses,
} from '@fluentui/react-components';
import type { SlotRenderFunction, FluentProviderCustomStyleHooks } from '@fluentui/react-components';
import {
  CarouselNavImageButton,
  carouselNavImageButtonClassNames,
  renderCarouselNavImageButton_unstable,
  useCarouselNavImageButton_unstable,
  useCarouselNavImageButtonStyles_unstable,
} from '../index';
import type { CarouselNavImageButtonProps, CarouselNavImageButtonState } from '../CarouselNavImageButton.types';
import { Carousel } from '../../Carousel/Carousel';
import type { CarouselProps, CarouselUpdateData } from '../../Carousel/Carousel.types';
import { CarouselNav } from '../../CarouselNav/CarouselNav';
import { CarouselCard } from '../../CarouselCard/CarouselCard';
import { CarouselSlider } from '../../CarouselSlider/CarouselSlider';
import { CarouselViewport } from '../../CarouselViewport/CarouselViewport';
import { CarouselProvider, carouselContextDefaultValue } from '../../CarouselContext';
import { CarouselNavIndexContextProvider } from '../../CarouselNav/CarouselNavIndexContext';
import { ImageSlideshow } from '../../../../../stories/src/Carousel/CarouselImageBox.stories';
import { Default as NavStory } from '../../../../../stories/src/CarouselNav/CarouselNavDefault.stories';

const requestedRound = Cypress.env('coverageRound');
const round = Number(requestedRound === undefined ? 3 : requestedRound);
if (![1, 2, 3, '1', '2', '3'].includes(requestedRound === undefined ? 3 : requestedRound)) {
  throw new Error('coverageRound must be 1, 2, or 3');
}
const evidenceRoot = `src/components/CarouselNavImageButton/.runner-temp/audits-${Date.now()}-${Cypress._.random(
  0,
  1e9,
)}`;
let auditIndex = 0;
const imageSource = (alternate = false) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="40" height="40" fill="${
      alternate ? webLightTheme.colorPaletteGreenBackground3 : webLightTheme.colorBrandBackground
    }"/><rect x="40" width="40" height="40" fill="${webLightTheme.colorPaletteRedBackground3}"/></svg>`,
  )}`;

const useFixtureStyles = makeStyles({
  carousel: { width: '480px' },
  card: { width: '100%', height: '100px', backgroundColor: tokens.colorNeutralBackground2 },
  halfCard: { width: '50%', height: '100px', backgroundColor: tokens.colorNeutralBackground2 },
  overrideRoot: { width: '64px', height: '64px', borderRadius: tokens.borderRadiusCircular },
  overrideImage: { width: '64px', height: '64px', borderRadius: tokens.borderRadiusCircular, objectFit: 'cover' },
});
type FixtureProps = CarouselProps & {
  prefix?: string;
  half?: boolean;
  cards?: string[];
  navAppearance?: 'brand';
  buttonProps?: (index: number) => BrowserButtonProps;
};
type BrowserButtonProps = Omit<React.HTMLAttributes<HTMLElement>, 'children'> & {
  children?: CarouselNavImageButtonProps['children'];
  image?: CarouselNavImageButtonProps['image'];
  disabled?: boolean;
  disabledFocusable?: boolean;
  name?: string;
  value?: React.ButtonHTMLAttributes<HTMLButtonElement>['value'];
  type?: 'button' | 'submit' | 'reset';
  as?: 'button' | 'a' | 'div';
  ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement | HTMLDivElement>;
  href?: string;
  target?: string;
  rel?: string;
  'data-index'?: string;
};
const renderButton = ({ as = 'button', ...props }: BrowserButtonProps) => {
  const image = props.image ?? { src: imageSource() };
  if (as === 'a') {
    return <CarouselNavImageButton {...props} image={image} as="a" />;
  }
  if (as === 'div') {
    return <CarouselNavImageButton {...props} image={image} as="div" />;
  }
  return <CarouselNavImageButton {...props} image={image} as="button" />;
};
const Fixture = ({
  prefix = 'image',
  half = false,
  cards = ['a', 'b', 'c', 'd'],
  navAppearance,
  buttonProps,
  children,
  ...props
}: FixtureProps) => {
  const styles = useFixtureStyles();
  return (
    <Carousel aria-label={`${prefix} carousel`} className={styles.carousel} groupSize={half ? 2 : 1} {...props}>
      <CarouselViewport data-testid={`${prefix}-viewport`}>
        <CarouselSlider>
          {cards.map(key => (
            <CarouselCard
              key={key}
              id={`${prefix}-${key}`}
              aria-label={`Panel ${key}`}
              className={half ? styles.halfCard : styles.card}
            >
              Panel {key}
            </CarouselCard>
          ))}
        </CarouselSlider>
      </CarouselViewport>
      <CarouselNav aria-label={`${prefix} pages`} appearance={navAppearance}>
        {index =>
          renderButton({ id: `${prefix}-tab-${index}`, 'aria-label': `Preview ${index + 1}`, ...buttonProps?.(index) })
        }
      </CarouselNav>
      {children}
    </Carousel>
  );
};
const mount = (element: React.ReactElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  mountBase(
    <FluentProvider dir={dir} theme={dark ? webDarkTheme : webLightTheme}>
      <div id="fixture">{element}</div>
    </FluentProvider>,
  );
const tab = (index: number, prefix = 'image') => cy.get<HTMLButtonElement>(`#${prefix}-tab-${index}`);
const selected = (index: number, prefix = 'image') => {
  tab(index, prefix).should('have.attr', 'aria-selected', 'true');
  cy.get(`[id^="${prefix}-tab-"][aria-selected="true"]`).should('have.length', 1);
};
const loaded = (selector = '#fixture img') =>
  cy.get<HTMLImageElement>(selector).should($images => {
    $images.each((_, image) => {
      expect(image.complete, 'loaded thumbnail').to.equal(true);
      expect(image.naturalWidth, 'decoded pixels').to.be.greaterThan(0);
    });
  });
const aligned = (index: number, dir: 'ltr' | 'rtl' = 'ltr') =>
  cy.get('[data-testid="image-viewport"]').then($viewport => {
    const viewport = $viewport[0].getBoundingClientRect();
    cy.get(`#image-${['a', 'b', 'c', 'd'][index]}`).should($card => {
      const card = $card[0].getBoundingClientRect();
      expect(
        Math.abs((dir === 'ltr' ? card.left : card.right) - (dir === 'ltr' ? viewport.left : viewport.right)),
      ).to.be.lessThan(1);
    });
  });
const settled = () =>
  cy.get('#fixture').then(
    $fixture =>
      new Cypress.Promise<void>((resolve, reject) => {
        const window = $fixture[0].ownerDocument.defaultView!;
        let previous = '';
        let stable = 0;
        let frames = 0;
        const check = () => {
          const current = Array.from($fixture[0].querySelectorAll('.fui-CarouselSlider'))
            .map(slider => window.getComputedStyle(slider).transform)
            .join('|');
          stable = current === previous ? stable + 1 : 0;
          previous = current;
          if (stable >= 6) {
            resolve();
          } else if (++frames > 600) {
            reject(new Error('Carousel geometry did not settle within 600 animation frames'));
          } else {
            window.requestAnimationFrame(check);
          }
        };
        window.requestAnimationFrame(check);
      }),
  );
const audit = (
  phase: string,
  baseline: 'clean' | 'mover' | 'decorative-alt' = 'clean',
  expectedViolations: { id: string; targets: string[][] }[] = [],
) => {
  settled();
  return cy.get('#fixture').then($fixture => {
    if (baseline === 'mover') {
      const navs = $fixture[0].querySelectorAll('.fui-CarouselNav');
      expect(navs).to.have.length(1);
      const nav = navs[0];
      const sentinels = [nav.firstElementChild!, nav.lastElementChild!];
      sentinels.forEach((sentinel, index) => {
        expect(sentinel.tagName).to.equal('I');
        expect(sentinel.getAttribute('role')).to.equal('none');
        expect(sentinel.getAttribute('tabindex')).to.equal('0');
        expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
        expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
          `isFirst=${index === 0}, isOutside=false, (Mover, tabbable=true)`,
        );
      });
      expectedViolations = [
        { id: 'aria-hidden-focus', targets: [['i:nth-child(1)'], [`i:nth-child(${nav.children.length})`]] },
      ];
    }
    return cy
      .then(() => axe.run($fixture[0]))
      .then(result => {
        const report = {
          scenario: Cypress.currentTest.title,
          test: Cypress.currentTest.titlePath.join(' / '),
          retries: Cypress.currentRetry,
          phase,
          classification:
            baseline === 'mover'
              ? 'exact-Tabster-mover-sentinels'
              : baseline === 'decorative-alt'
              ? 'exact-hidden-nonempty-alt-role-incomplete'
              : expectedViolations.length
              ? 'exact-consumer-finding'
              : 'clean',
          passes: result.passes.map(rule => rule.id),
          violations: result.violations.map(rule => ({
            id: rule.id,
            impact: rule.impact,
            nodes: rule.nodes.map(node => ({
              target: node.target,
              html: node.html,
              failureSummary: node.failureSummary,
              anyChecks: node.any,
              all: node.all,
              none: node.none,
            })),
          })),
          incomplete: result.incomplete.map(rule => ({
            id: rule.id,
            nodes: rule.nodes.map(node => ({
              target: node.target,
              html: node.html,
              anyChecks: node.any,
              all: node.all,
              none: node.none,
            })),
          })),
        };
        return cy.writeFile(`${evidenceRoot}/audit-${++auditIndex}.json`, report, { log: false }).then(() => {
          expect(report.passes.length).to.be.greaterThan(0);
          expect(
            report.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) })),
          ).to.deep.equal(expectedViolations);
          if (baseline === 'mover') {
            result.violations[0].nodes.forEach(node => {
              const endpoint = $fixture[0].ownerDocument.querySelector(String(node.target[0]));
              expect(endpoint!.parentElement!.classList.contains('fui-CarouselNav')).to.equal(true);
              expect(node.failureSummary).to.equal(
                'Fix all of the following:\n  Focusable content should have tabindex="-1" or be removed from the DOM',
              );
              expect(node.all.map(check => check.id)).to.deep.equal(['focusable-not-tabbable']);
              expect(node.any).to.deep.equal([]);
              expect(node.none).to.deep.equal([]);
            });
          }
          if (baseline === 'decorative-alt') {
            expect(Cypress.currentTest.title).to.equal(
              'R1.09 explicit image alt title loading and draggable survive while native decoding is filtered by the current helper',
            );
            expect(
              report.incomplete.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) })),
            ).to.deep.equal([{ id: 'aria-allowed-role', targets: [['img']] }]);
            const node = result.incomplete[0].nodes[0];
            expect(
              node.any.map(check => ({ id: check.id, data: check.data, impact: check.impact, message: check.message })),
            ).to.deep.equal([
              {
                id: 'aria-allowed-role',
                data: ['presentation'],
                impact: 'minor',
                message:
                  'ARIA role presentation must be removed when the element is made visible, as it is not allowed for the element',
              },
            ]);
            expect(node.all).to.deep.equal([]);
            expect(node.none).to.deep.equal([]);
            const image = $fixture[0].querySelector('img')!;
            expect(image.getAttribute('alt')).to.equal('Sea thumbnail');
            expect(image.getAttribute('aria-hidden')).to.equal('true');
            expect(image.getAttribute('role')).to.equal('presentation');
          } else {
            expect(report.incomplete, 'no unclassified incomplete results').to.deep.equal([]);
          }
        });
      });
  });
};
const contextMount = (
  props: BrowserButtonProps = {},
  value: Partial<typeof carouselContextDefaultValue> = {},
  index = 0,
) =>
  mount(
    <CarouselProvider value={{ ...carouselContextDefaultValue, ...value }}>
      <CarouselNavIndexContextProvider value={index}>
        <div role="tablist" aria-label="Preview pages">
          {renderButton({ id: 'subject', 'aria-label': 'Preview', ...props })}
        </div>
      </CarouselNavIndexContextProvider>
    </CarouselProvider>,
  );

const registerRoundTwo = () => {
  if (round >= 2) {
    describe('ONLY131 R2 keyboard accessibility and native edge contracts', () => {
      (['ltr', 'rtl'] as const).forEach(dir => {
        [false, true].forEach(disableMiddle => {
          it(`R2.01 ${dir} arrow navigation ${
            disableMiddle ? 'skips disabled' : 'visits enabled'
          } thumbnails without selecting until Enter`, () => {
            mount(
              <Fixture defaultActiveIndex={1} buttonProps={index => ({ disabled: disableMiddle && index === 2 })} />,
              dir,
            );
            selected(1);
            tab(1).focus();
            cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
            tab(disableMiddle ? 3 : 2).should('be.focused');
            selected(1);
            cy.realPress('Enter');
            selected(disableMiddle ? 3 : 2);
            audit('arrow focus versus explicit activation', 'mover');
          });
        });
        it(`R2.02 ${dir} real Tab and Shift Tab enter the selected thumbnail and leave the group`, () => {
          mount(
            <div>
              <button id="before">Before previews</button>
              <Fixture defaultActiveIndex={2} />
              <button id="after">After previews</button>
            </div>,
            dir,
          );
          selected(2);
          cy.get('.fui-CarouselNav > [data-tabster-dummy]').should('have.length', 2);
          settled();
          cy.get('#before').focus().should('be.focused');
          cy.realPress('Tab');
          tab(2).should('be.focused');
          cy.realPress('Tab');
          cy.get('#after').should('be.focused');
          cy.realPress(['Shift', 'Tab']);
          tab(2).should('be.focused');
          cy.realPress(['Shift', 'Tab']);
          cy.get('#before').should('be.focused');
          audit('real bidirectional group tab order', 'mover');
        });
        it(`R2.03 ${dir} noncircular keyboard mover stops at both endpoint thumbnails`, () => {
          mount(<Fixture />, dir);
          tab(0).focus();
          cy.realPress(dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
          tab(0).should('be.focused');
          tab(3).focus();
          cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
          tab(3).should('be.focused');
          selected(0);
          audit('bounded mover endpoints', 'mover');
        });
      });

      (['button', 'a', 'div'] as const).forEach(as => {
        (['pointer', 'Enter', 'Space'] as const).forEach(action => {
          it(`R2.04 ${as} supports real ${action} activation with explicit tab semantics`, () => {
            const select = cy.stub();
            contextMount({ as, role: 'tab' }, { selectPageByIndex: select }, 3);
            if (action === 'pointer') {
              cy.get('#subject img').realClick();
            } else {
              cy.get('#subject').focus();
              cy.realPress(action);
            }
            cy.then(() => {
              expect(select).to.have.been.calledOnce;
              expect(select.firstCall.args[1]).to.equal(3);
              expect(select.firstCall.args[0].type).to.equal('click');
            });
            audit('supported root polymorphism');
          });
        });
        (['Enter', 'Space'] as const).forEach(key => {
          it(`R2.05 ${as} consumer ${key === 'Enter' ? 'keydown' : 'keyup'} prevention vetoes real ${key}`, () => {
            const select = cy.stub();
            const events: string[] = [];
            contextMount(
              {
                as,
                role: 'tab',
                onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
                  events.push(`down:${event.key}`);
                  if (key === 'Enter') {
                    event.preventDefault();
                  }
                },
                onKeyUp: (event: React.KeyboardEvent<HTMLElement>) => {
                  events.push(`up:${event.key}`);
                  if (key === 'Space') {
                    event.preventDefault();
                  }
                },
              },
              { selectPageByIndex: select },
            );
            cy.get('#subject').focus();
            cy.realPress(key);
            cy.then(() => {
              expect(select).not.to.have.been.called;
              expect(events).to.deep.equal([
                `down:${key === 'Space' ? ' ' : key}`,
                `up:${key === 'Space' ? ' ' : key}`,
              ]);
            });
            audit('native and helper key cancellation');
          });
        });
      });

      const disabledModes: {
        name: string;
        props: BrowserButtonProps;
        pointerBlocked: boolean;
        nativeDisabled: boolean;
      }[] = [
        { name: 'enabled', props: {}, pointerBlocked: false, nativeDisabled: false },
        { name: 'native disabled', props: { disabled: true }, pointerBlocked: true, nativeDisabled: true },
        { name: 'disabledFocusable', props: { disabledFocusable: true }, pointerBlocked: false, nativeDisabled: false },
        {
          name: 'disabled plus disabledFocusable',
          props: { disabled: true, disabledFocusable: true },
          pointerBlocked: false,
          nativeDisabled: false,
        },
        {
          name: 'aria-disabled boolean',
          props: { 'aria-disabled': true },
          pointerBlocked: false,
          nativeDisabled: false,
        },
        {
          name: 'aria-disabled string',
          props: { 'aria-disabled': 'true' },
          pointerBlocked: false,
          nativeDisabled: false,
        },
      ];
      disabledModes.forEach(({ name, props, pointerBlocked, nativeDisabled }) => {
        const actions = nativeDisabled ? (['pointer'] as const) : (['pointer', 'Enter', 'Space'] as const);
        actions.forEach(action => {
          it(`R2.06 native ${name} ${action} characterizes the overridden ARIA click guard without masking callbacks`, () => {
            const select = cy.stub();
            const click = cy.stub();
            contextMount({ ...props, onClick: click }, { selectPageByIndex: select }, 2);
            if (action === 'pointer') {
              cy.get('#subject').realClick();
            } else {
              cy.get('#subject').focus();
              cy.realPress(action);
            }
            cy.then(() => {
              expect(click.callCount).to.equal(pointerBlocked ? 0 : 1);
              expect(select.callCount).to.equal(pointerBlocked ? 0 : 1);
              if (!pointerBlocked) {
                expect(select.firstCall.args[1]).to.equal(2);
              }
            });
            cy.get('#subject').should(nativeDisabled ? 'be.disabled' : 'not.be.disabled');
            audit('explicit disabled click-guard characterization');
          });
        });
      });
      (['a', 'div'] as const).forEach(as => {
        (['pointer', 'Enter', 'Space'] as const).forEach(action => {
          it(`R2.07 ${as} disabledFocusable ${action} ${
            action === 'pointer' ? 'still selects through overwritten guard' : 'is blocked by retained key helper'
          }`, () => {
            const select = cy.stub();
            contextMount({ as, role: 'tab', disabledFocusable: true }, { selectPageByIndex: select });
            cy.get('#subject').should('have.attr', 'aria-disabled', 'true');
            if (action === 'pointer') {
              cy.get('#subject').realClick();
            } else {
              cy.get('#subject').focus();
              cy.realPress(action);
            }
            cy.then(() => expect(select.callCount).to.equal(action === 'pointer' ? 1 : 0));
            audit('polymorphic disabled pointer/key difference');
          });
        });
      });
      (['button', 'submit', 'reset'] as const).forEach(type => {
        [false, true].forEach(disabledFocusable => {
          it(`R2.08 native ${type} ${
            disabledFocusable ? 'disabledFocusable' : 'enabled'
          } executes exactly the browser form default`, () => {
            const select = cy.stub();
            const submit = cy.stub();
            const reset = cy.stub();
            mount(
              <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
                <form
                  onSubmit={event => {
                    submit();
                    event.preventDefault();
                  }}
                  onReset={() => reset()}
                >
                  <label htmlFor="field">Form field</label>
                  <input id="field" defaultValue="original" />
                  <div role="tablist" aria-label="Images">
                    <CarouselNavImageButton
                      id="subject"
                      type={type}
                      disabledFocusable={disabledFocusable}
                      aria-label="Preview form action"
                      image={{ src: imageSource() }}
                    />
                  </div>
                </form>
              </CarouselProvider>,
            );
            cy.get('#field').clear().type('changed');
            cy.get('#subject').focus();
            cy.realPress('Enter');
            cy.then(() => {
              expect(select.callCount).to.equal(1);
              expect(submit.callCount).to.equal(type === 'submit' ? 1 : 0);
              expect(reset.callCount).to.equal(type === 'reset' ? 1 : 0);
            });
            cy.get('#field').should('have.value', type === 'reset' ? 'original' : 'changed');
            audit('real in-memory form submission/reset');
          });
        });
      });
      it('R2.09 default native button does not submit a form and consumer click prevention cancels submit', () => {
        const submit = cy.stub();
        mount(
          <form
            onSubmit={event => {
              submit();
              event.preventDefault();
            }}
          >
            <div role="tablist" aria-label="Previews">
              <CarouselNavImageButton id="default-button" aria-label="Default preview" image={{ src: imageSource() }} />
              <CarouselNavImageButton
                id="prevent-submit"
                type="submit"
                aria-label="Prevent submission"
                onClick={event => event.preventDefault()}
                image={{ src: imageSource() }}
              />
            </div>
          </form>,
        );
        cy.get('#default-button').realClick();
        cy.get('#prevent-submit').focus();
        cy.realPress('Space');
        cy.then(() => expect(submit).not.to.have.been.called);
        audit('default type and canceled form action');
      });
      it('R2.10 native focus blur and keyboard callbacks preserve trusted event keys and currentTarget', () => {
        const events: string[] = [];
        contextMount({
          onFocus: (event: React.FocusEvent<HTMLElement>) => {
            expect(event.currentTarget.id).to.equal('subject');
            events.push('focus');
          },
          onBlur: () => events.push('blur'),
          onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => events.push(`down:${event.key}`),
          onKeyUp: (event: React.KeyboardEvent<HTMLElement>) => events.push(`up:${event.key}`),
        });
        cy.get('#subject').focus();
        cy.realPress('Space');
        cy.get('#subject').blur();
        cy.then(() => expect(events).to.deep.equal(['focus', 'down: ', 'up: ', 'blur']));
        audit('native focus/key event composition');
      });
      it('R2.11 native tabindex minus one excludes the thumbnail from real Tab without disabling pointer activation', () => {
        const select = cy.stub();
        mount(
          <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
            <button id="before">Before</button>
            <div role="tablist" aria-label="Preview">
              <CarouselNavImageButton id="subject" tabIndex={-1} aria-label="Preview" image={{ src: imageSource() }} />
            </div>
            <button id="after">After</button>
          </CarouselProvider>,
        );
        cy.get('#before').focus();
        cy.realPress('Tab');
        cy.get('#after').should('be.focused');
        cy.get('#subject img').realClick();
        cy.then(() => expect(select).to.have.been.calledOnce);
        audit('explicit native tabIndex');
      });
      it('R2.12 real hover applies pointer cursor and keyboard focus has a nonzero browser outline', () => {
        contextMount();
        cy.get('#subject').realHover().should('have.css', 'cursor', 'pointer');
        cy.realPress('Tab');
        cy.get('#subject').focus();
        cy.realPress('ArrowRight');
        cy.get('#subject').should($root => {
          const css = $root[0].ownerDocument.defaultView!.getComputedStyle($root[0]);
          expect(css.outlineStyle).not.to.equal('none');
          expect(parseFloat(css.outlineWidth)).to.be.greaterThan(0);
        });
        audit('browser-owned focus indicator not NavButton pseudo-element');
      });
      it('R2.13 absent root name is a precise consumer button-name violation despite image alt', () => {
        contextMount({ 'aria-label': undefined });
        cy.get('#subject').should($root => expect(computeAccessibleName($root[0])).to.equal(''));
        audit('negative naming control', 'clean', [{ id: 'button-name', targets: [['#subject']] }]);
      });
      it('R2.14 explicit visible image semantics retain image alt without changing a labeled root', () => {
        contextMount({ image: { src: imageSource(), alt: 'Sea', 'aria-hidden': false, role: 'img' } });
        cy.get('#subject img').should('have.attr', 'aria-hidden', 'false').and('have.attr', 'role', 'img');
        cy.get('#subject').should($root => expect(computeAccessibleName($root[0])).to.equal('Preview'));
        audit('consumer visible image semantic override');
      });
      it('R2.15 native anchor href target and rel survive with explicit tab semantics and canceled navigation', () => {
        const click = cy.stub();
        contextMount({
          as: 'a',
          role: 'tab',
          href: '#preview-target',
          target: '_self',
          rel: 'nofollow',
          onClick: event => {
            click();
            event.preventDefault();
          },
        });
        cy.get('#subject')
          .should('have.attr', 'href', '#preview-target')
          .and('have.attr', 'target', '_self')
          .and('have.attr', 'rel', 'nofollow');
        cy.get('#subject').focus();
        cy.realPress('Enter');
        cy.then(() => expect(click).to.have.been.calledOnce);
        audit('safe anchor native metadata');
      });
      it('R2.16 disabled anchors remove href but retain the source-owned pointer click defect', () => {
        const select = cy.stub();
        contextMount({ as: 'a', role: 'tab', href: '#preview-target', disabled: true }, { selectPageByIndex: select });
        cy.get('#subject').should('not.have.attr', 'href');
        cy.get('#subject').realClick();
        cy.then(() => expect(select).to.have.been.calledOnce);
        audit('disabled anchor href removal');
      });
      it('R2.17 image load callback receives the actual decoded thumbnail node', () => {
        const load = cy.stub();
        contextMount({ image: { src: imageSource(), onLoad: event => load(event.currentTarget) } });
        loaded();
        cy.get('#subject img').then($image => {
          expect(load).to.have.been.calledOnce;
          expect(load.firstCall.args[0]).to.equal($image[0]);
        });
        audit('native load event');
      });
      it('R2.18 broken image fires native error and remains an operable named navigation button', () => {
        cy.intercept('GET', '**/only131-missing.png', { statusCode: 404, body: '' });
        const error = cy.stub();
        const select = cy.stub();
        contextMount(
          { image: { src: '/only131-missing.png', onError: event => error(event.currentTarget) } },
          { selectPageByIndex: select },
        );
        cy.get<HTMLImageElement>('#subject img').should($image => {
          expect($image[0].complete).to.equal(true);
          expect($image[0].naturalWidth).to.equal(0);
          expect(error).to.have.been.calledOnce;
        });
        cy.get('#subject').focus();
        cy.realPress('Enter');
        cy.then(() => expect(select).to.have.been.calledOnce);
        audit('native broken-image resilience');
      });
      it('R2.19 native srcSet and crossOrigin route to the image while sizes is filtered by the current helper', () => {
        contextMount({
          image: {
            src: imageSource(),
            srcSet: `${imageSource()} 1x, ${imageSource(true)} 2x`,
            sizes: '48px',
            crossOrigin: 'anonymous',
          },
        });
        loaded();
        cy.get('#subject img').should('have.attr', 'crossorigin', 'anonymous');
        cy.get('#subject img').should('not.have.attr', 'sizes');
        cy.get<HTMLImageElement>('#subject img').should($image => {
          expect($image[0].srcset).to.contain('2x');
          expect($image[0].currentSrc).to.match(/^data:image\/svg\+xml,/);
        });
        audit('native responsive image metadata');
      });
      it('R2.20 CarouselNav brand appearance does not turn image previews into inherited dot/pill buttons', () => {
        mount(<Fixture navAppearance="brand" />);
        tab(0).should($root => {
          expect($root[0].ownerDocument.defaultView!.getComputedStyle($root[0], '::after').content).to.equal('none');
          expect($root[0].classList.contains('fui-CarouselNavButton')).to.equal(false);
        });
        tab(1).realClick();
        selected(1);
        audit('no NavButton appearance inheritance', 'mover');
      });
    });
  }
};

describe('ONLY131 R1 documented and native image-button contract', () => {
  it('R1.01 stable ImageSlideshow selects the final image with real thumbnail input', () => {
    cy.intercept('GET', 'https://fabricweb.azureedge.net/**', {
      statusCode: 200,
      headers: { 'content-type': 'image/svg+xml' },
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="teal"/></svg>',
    });
    mount(<ImageSlideshow />);
    loaded();
    settled();
    cy.get('.fui-CarouselNavImageButton')
      .should('have.length', 3)
      .last()
      .find('img')
      .scrollIntoView()
      .should('be.visible')
      .realHover({ scrollBehavior: false })
      .should($image => {
        const image = $image[0];
        expect(image.matches(':hover'), 'native pointer is over the original thumbnail').to.equal(true);
        const rect = image.getBoundingClientRect();
        const hit = image.ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        expect(hit, `original thumbnail center target: ${hit?.outerHTML}`).to.equal(image);
      })
      .realClick({ scrollBehavior: false });
    cy.get('.fui-CarouselNavImageButton').last().should('have.attr', 'aria-selected', 'true');
    loaded();
    audit('stable ImageSlideshow', 'mover');
  });
  it('R1.02 stable Nav Default switches all five dot controls to thumbnail controls', () => {
    cy.intercept('GET', 'https://fabricweb.azureedge.net/**', {
      headers: { 'content-type': 'image/svg+xml' },
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="teal"/></svg>',
    });
    mount(<NavStory />);
    cy.get('.fui-CarouselNavButton').should('have.length', 5);
    cy.get('[role="switch"]').realClick();
    cy.get('.fui-CarouselNavButton').should('not.exist');
    cy.get('.fui-CarouselNavImageButton').should('have.length', 5);
    loaded();
    audit('stable Nav Default', 'mover');
  });
  (['ltr', 'rtl'] as const).forEach(dir => {
    [false, true].forEach(dark => {
      it(`R1.03 ${dir} ${
        dark ? 'dark' : 'light'
      } selected 48px and unselected 40px thumbnails have rounded clipped roots`, () => {
        mount(<Fixture />, dir, dark);
        loaded();
        [0, 1].forEach(index => {
          tab(index).should($button => {
            const root = $button[0];
            const image = root.querySelector('img')!;
            const css = root.ownerDocument.defaultView!.getComputedStyle(root);
            const size = index === 0 ? 48 : 40;
            expect(css.width).to.equal(`${size}px`);
            expect(css.height).to.equal(`${size}px`);
            expect(css.boxSizing).to.equal('content-box');
            expect(css.overflow).to.equal('hidden');
            expect(css.borderRadius).to.equal(webLightTheme.borderRadiusSmall);
            expect(css.marginLeft).to.equal(webLightTheme.spacingHorizontalXS);
            expect(image.getBoundingClientRect().width).to.equal(size);
            expect(image.getBoundingClientRect().height).to.equal(size);
            expect(root.classList.contains(carouselNavImageButtonClassNames.root)).to.equal(true);
            expect(image.classList.contains(carouselNavImageButtonClassNames.image)).to.equal(true);
          });
        });
        tab(1).find('img').realClick();
        selected(1);
        tab(0).find('img').should('have.css', 'width', '40px');
        tab(1).find('img').should('have.css', 'width', '48px');
        audit('geometry after selected change', 'mover');
      });
    });
    (['pointer', 'Enter', 'Space'] as const).forEach(action => {
      it(`R1.04 ${dir} real ${action} navigates exactly once with click event and physical panel alignment`, () => {
        const events: { type: string; index: number; same: boolean; native: string }[] = [];
        mount(
          <Fixture
            onActiveIndexChange={(event, data) =>
              events.push({
                type: data.type ?? 'undefined',
                index: data.index,
                same: event === data.event,
                native: 'nativeEvent' in event ? event.nativeEvent.type : event.type,
              })
            }
          />,
          dir,
        );
        tab(2).should('exist');
        if (action === 'pointer') {
          tab(2).find('img').realClick();
        } else {
          tab(2).focus();
          cy.realPress(action);
        }
        selected(2);
        aligned(2, dir);
        cy.then(() => expect(events).to.deep.equal([{ type: 'click', index: 2, same: true, native: 'click' }]));
        audit('trusted browser activation', 'mover');
      });
    });
    [true, false].forEach(feedback => {
      it(`R1.05 ${dir} controlled index ${
        feedback ? 'accepts' : 'declines'
      } the requested page without inventing selection state`, () => {
        const calls: number[] = [];
        const Controlled = () => {
          const [index, setIndex] = React.useState(1);
          return (
            <Fixture
              activeIndex={index}
              onActiveIndexChange={(_, data) => {
                calls.push(data.index);
                if (feedback) {
                  setIndex(data.index);
                }
              }}
            />
          );
        };
        mount(<Controlled />, dir);
        selected(1);
        tab(3).realClick();
        selected(feedback ? 3 : 1);
        cy.then(() => expect(calls).to.deep.equal([3]));
        audit('controlled parent decision', 'mover');
      });
    });
    it(`R1.06 ${dir} groupSize two maps thumbnail one to both final live panels`, () => {
      const Resizable = () => {
        const [width, setWidth] = React.useState(480);
        return (
          <Fixture half style={{ width }}>
            <button id="resize" onClick={() => setWidth(500)}>
              Resize carousel
            </button>
          </Fixture>
        );
      };
      mount(<Resizable />, dir);
      cy.get('[id^="image-tab-"]').should('have.length', 2);
      tab(1).realClick();
      selected(1);
      // Newly generated controls receive IDREFs on the next engine publication.
      cy.get('#resize').realClick();
      tab(1).should('have.attr', 'aria-controls', 'image-c image-d');
      cy.get('#image-c, #image-d').should('have.length', 2);
      audit('grouped page controls', 'mover');
    });
  });
  it('R1.07 defaultActiveIndex initializes an uncontrolled selected preview', () => {
    mount(<Fixture defaultActiveIndex={2} />);
    selected(2);
    aligned(2);
    tab(0).realClick();
    selected(0);
    audit('uncontrolled initial and changed page', 'mover');
  });
  it('R1.08 image defaults are decorative and do not replace the root accessible label', () => {
    contextMount();
    loaded();
    cy.get('#subject img')
      .should('have.attr', 'alt', '')
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.attr', 'role', 'presentation');
    cy.get('#subject').should($root => {
      expect(computeAccessibleName($root[0])).to.equal('Preview');
      expect($root[0].getAttribute('type')).to.equal('button');
      expect($root[0].getAttribute('role')).to.equal('tab');
    });
    audit('decorative thumbnail');
  });
  it('R1.09 explicit image alt title loading and draggable survive while native decoding is filtered by the current helper', () => {
    contextMount({
      image: {
        src: imageSource(),
        alt: 'Sea thumbnail',
        title: 'Sea',
        loading: 'eager',
        decoding: 'sync',
        draggable: false,
      },
    });
    loaded();
    cy.get('#subject img')
      .should('have.attr', 'alt', 'Sea thumbnail')
      .and('have.attr', 'title', 'Sea')
      .and('have.attr', 'loading', 'eager')
      .and('have.attr', 'draggable', 'false');
    cy.get('#subject img').should('not.have.attr', 'decoding');
    cy.get('#subject').should($root => expect(computeAccessibleName($root[0])).to.equal('Preview'));
    audit('image attribute routing', 'decorative-alt');
  });
  (['fill', 'contain', 'cover', 'none', 'scale-down'] as const).forEach(fit => {
    it(`R1.10 native image style objectFit ${fit} is supported without an invented fit prop`, () => {
      contextMount({ image: { src: imageSource(), style: { objectFit: fit, objectPosition: 'left top' } } });
      loaded();
      cy.get('#subject img').should('have.css', 'object-fit', fit).and('have.css', 'object-position', '0% 0%');
      cy.get<HTMLImageElement>('#subject img').should($image => {
        expect($image[0].naturalWidth).to.equal(80);
        expect($image[0].naturalHeight).to.equal(40);
        expect($image[0].getBoundingClientRect().width).to.equal(48);
      });
      audit(`native objectFit ${fit}`);
    });
  });
  it('R1.11 image width and height HTML attributes do not override fixed CSS thumbnail size', () => {
    contextMount({ image: { src: imageSource(), width: 120, height: 60 } });
    cy.get('#subject img')
      .should('have.attr', 'width', '120')
      .and('have.attr', 'height', '60')
      .and('have.css', 'width', '48px')
      .and('have.css', 'height', '48px');
    audit('HTML dimensions versus CSS');
  });
  it('R1.12 consumer style supplies custom size and shape on both slots', () => {
    contextMount({
      style: { width: 64, height: 64, borderRadius: webLightTheme.borderRadiusCircular },
      image: { src: imageSource(), style: { width: 64, height: 64, borderRadius: webLightTheme.borderRadiusCircular } },
    });
    cy.get('#subject, #subject img')
      .should('have.css', 'width', '64px')
      .and('have.css', 'height', '64px')
      .and('have.css', 'border-radius', webLightTheme.borderRadiusCircular);
    audit('native slot size/shape overrides');
  });
  it('R1.13 native root attributes, label and description endpoints survive prop filtering', () => {
    mount(
      <div>
        <span id="label">Sea preview</span>
        <span id="description">Open the sea panel</span>
        <div role="tablist" aria-label="Pictures">
          <CarouselNavImageButton
            id="subject"
            image={{ src: imageSource() }}
            aria-labelledby="label"
            aria-describedby="description"
            name="preview"
            value="not-an-index"
            title="Open preview"
            data-test="native"
            className="consumer-root"
          />
        </div>
      </div>,
    );
    cy.get('#subject')
      .should('have.attr', 'name', 'preview')
      .and('have.attr', 'value', 'not-an-index')
      .and('have.attr', 'data-test', 'native')
      .and('have.class', 'consumer-root')
      .and('have.attr', 'title', 'Open preview');
    cy.get('#subject').should($root => {
      expect(computeAccessibleName($root[0])).to.equal('Sea preview');
      expect(computeAccessibleDescription($root[0])).to.equal('Open the sea panel');
    });
    type BrowserFrame = { frame: { id: string }; childFrames?: BrowserFrame[] };
    type AccessibleNode = {
      ignored: boolean;
      role?: { value: string };
      name?: { value: string };
      description?: { value: string };
      properties?: { name: string; value: { value?: string | boolean } }[];
    };
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
        const matching = nodes.filter(
          node => !node.ignored && node.role?.value === 'tab' && node.name?.value === 'Sea preview',
        );
        expect(matching).to.have.length(1);
        expect(matching[0].description?.value).to.equal('Open the sea panel');
        expect(matching[0].properties?.find(property => property.name === 'selected')?.value.value).to.equal(true);
        return cy.writeFile(
          `${evidenceRoot}/accessibility-tree.json`,
          { scenario: Cypress.currentTest.title, nodes: matching },
          { log: false },
        );
      });
    audit('native metadata and IDREFs');
  });
  it('R1.14 root and image refs resolve exact native nodes', () => {
    const root = React.createRef<HTMLButtonElement>();
    const image = React.createRef<HTMLImageElement>();
    contextMount({ ref: root, image: { src: imageSource(), ref: image } });
    cy.get('#subject').then($root => expect(root.current).to.equal($root[0]));
    cy.get('#subject img').then($image => expect(image.current).to.equal($image[0]));
    audit('forwarded root and image refs');
  });
  it('R1.15 image native click bubbles before selection and root bubble callback', () => {
    const calls: string[] = [];
    mount(
      <CarouselProvider
        value={{ ...carouselContextDefaultValue, selectPageByIndex: (_, index) => calls.push(`select:${index}`) }}
      >
        <div role="tablist" aria-label="Images" onClick={() => calls.push('parent')}>
          <CarouselNavImageButton
            id="subject"
            aria-label="Preview"
            onClick={() => calls.push('root')}
            image={{
              src: imageSource(),
              onClick: event => {
                expect(event.target).to.equal(event.currentTarget);
                calls.push('image');
              },
            }}
          />
        </div>
      </CarouselProvider>,
    );
    cy.get('#subject img').realClick();
    cy.then(() => expect(calls).to.deep.equal(['image', 'root', 'select:0', 'parent']));
    audit('native image callback order');
  });
  it('R1.16 native consumer preventDefault vetoes selection without resetting autoplay unlike NavButton', () => {
    const select = cy.stub();
    const reset = cy.stub();
    contextMount(
      { onClick: (event: React.MouseEvent<HTMLElement>) => event.preventDefault() },
      { selectPageByIndex: select, resetAutoplay: reset },
    );
    cy.get('#subject img').realClick();
    cy.then(() => {
      expect(select).not.to.have.been.called;
      expect(reset).not.to.have.been.called;
    });
    audit('consumer selection veto');
  });
  it('R1.17 clicking the already-selected page still notifies the exact contextual index', () => {
    const select = cy.stub();
    contextMount({ value: '99', 'data-index': '99' }, { activeIndex: 2, selectPageByIndex: select }, 2);
    cy.get('#subject').realClick();
    cy.then(() => {
      expect(select).to.have.been.calledOnce;
      expect(select.firstCall.args[1]).to.equal(2);
    });
    audit('context not native value');
  });
});
registerRoundTwo();

if (round >= 3) {
  describe('ONLY131 R3 unit-derived slots refs styles and context lifecycle', () => {
    afterEach(() =>
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [] },
        }),
      ),
    );
    it('R3.01 standalone context defaults select index zero with a 48px decorative thumbnail', () => {
      contextMount();
      cy.get('#subject').should('have.attr', 'aria-selected', 'true').and('have.css', 'width', '48px');
      cy.get('#subject').realClick();
      audit('standalone default context');
    });
    it('R3.02 nonmatching context index selects false and uses 40px geometry', () => {
      contextMount({}, { activeIndex: 1 }, 2);
      cy.get('#subject').should('have.attr', 'aria-selected', 'false').and('have.css', 'width', '40px');
      cy.get('#subject img').should('have.css', 'width', '40px');
      audit('context equality selection');
    });
    it('R3.03 external active context updates selection and both slot dimensions without remount', () => {
      const Harness = () => {
        const [activeIndex, setIndex] = React.useState(0);
        return (
          <CarouselProvider value={{ ...carouselContextDefaultValue, activeIndex }}>
            <button id="activate" onClick={() => setIndex(2)}>
              Activate preview
            </button>
            <CarouselNavIndexContextProvider value={2}>
              <div role="tablist" aria-label="Preview">
                <CarouselNavImageButton id="subject" aria-label="Preview" image={{ src: imageSource() }} />
              </div>
            </CarouselNavIndexContextProvider>
          </CarouselProvider>
        );
      };
      mount(<Harness />);
      cy.get('#subject').then($root => {
        const root = $root[0];
        cy.get('#activate').realClick();
        cy.get('#subject').should($next => expect($next[0]).to.equal(root));
      });
      cy.get('#subject').should('have.attr', 'aria-selected', 'true').and('have.css', 'width', '48px');
      cy.get('#subject img').should('have.css', 'width', '48px');
      audit('context-driven geometry');
    });
    it('R3.04 caller aria-selected overrides DOM semantics but cannot invent the internal selected size', () => {
      contextMount({ 'aria-selected': true }, { activeIndex: 0 }, 1);
      cy.get('#subject').should('have.attr', 'aria-selected', 'true').and('have.css', 'width', '40px');
      audit('consumer ARIA override versus internal state');
    });
    it('R3.05 native children content is replaced by the required image slot', () => {
      contextMount({ children: 'Not the rendered thumbnail' });
      cy.get('#subject').should('not.contain.text', 'Not the rendered thumbnail').find('img').should('have.length', 1);
      audit('renderer-owned image children');
    });
    it('R3.06 public root render function receives and forwards the default image and native handlers', () => {
      const select = cy.stub();
      const renderRoot: SlotRenderFunction<React.ComponentProps<'button'>> = (Root, props) => (
        <Root {...props} data-rendered="root">
          <span id="wrapped-image">{props.children}</span>
        </Root>
      );
      contextMount({ children: renderRoot }, { selectPageByIndex: select });
      cy.get('#subject').should('have.attr', 'data-rendered', 'root');
      cy.get('#wrapped-image img').realClick();
      cy.then(() => expect(select).to.have.been.calledOnce);
      audit('public root render-function composition');
    });
    it('R3.07 public root render function can replace its image with a consumer native image and ref', () => {
      const imageRef = React.createRef<HTMLImageElement>();
      const renderRoot: SlotRenderFunction<React.ComponentProps<'button'>> = (Root, props) => (
        <Root {...props}>
          <img src={imageSource()} ref={imageRef} alt="" aria-hidden="true" data-rendered="image" />
        </Root>
      );
      contextMount({ children: renderRoot });
      loaded();
      cy.get('#subject img')
        .should('have.attr', 'data-rendered', 'image')
        .then($image => expect(imageRef.current).to.equal($image[0]));
      audit('public root image replacement');
    });
    it('R3.08 a public root render function can suppress the complete root and image', () => {
      const renderRoot: SlotRenderFunction<React.ComponentProps<'button'>> = () => null;
      mount(
        <div>
          <button>Positive audit control</button>
          <CarouselNavImageButton
            id="subject"
            aria-label="Preview"
            image={{ src: imageSource() }}
            children={renderRoot}
          />
        </div>,
      );
      cy.get('#subject').should('not.exist');
      cy.get('#fixture img').should('not.exist');
      audit('supported null root render result');
    });
    it('R3.09 headless hook plus styles plus renderer preserves the exact slot contract', () => {
      const Headless = () => {
        const ref = React.useRef<HTMLButtonElement>(null);
        const state = useCarouselNavImageButton_unstable(
          { id: 'subject', 'aria-label': 'Composed preview', image: { src: imageSource() } },
          ref,
        );
        useCarouselNavImageButtonStyles_unstable(state);
        return renderCarouselNavImageButton_unstable(state);
      };
      mount(
        <div role="tablist" aria-label="Composed previews">
          <Headless />
        </div>,
      );
      loaded();
      cy.get('#subject').should('have.class', carouselNavImageButtonClassNames.root).and('have.css', 'width', '48px');
      cy.get('#subject img').should('have.class', carouselNavImageButtonClassNames.image);
      audit('exported hook/style/render composition');
    });
    it('R3.10 caller Griffel classes override root and image sizing shape and fit after selected styles', () => {
      const Override = () => {
        const styles = useFixtureStyles();
        return (
          <CarouselNavImageButton
            id="subject"
            aria-label="Custom preview"
            className={mergeClasses(styles.overrideRoot, 'consumer-root')}
            image={{ src: imageSource(), className: mergeClasses(styles.overrideImage, 'consumer-image') }}
          />
        );
      };
      mount(
        <div role="tablist" aria-label="Preview">
          <Override />
        </div>,
      );
      cy.get('#subject, #subject img')
        .should('have.css', 'width', '64px')
        .and('have.css', 'height', '64px')
        .and('have.css', 'border-radius', webLightTheme.borderRadiusCircular);
      cy.get('#subject img').should('have.css', 'object-fit', 'cover').and('have.class', 'consumer-image');
      cy.get('#subject').should('have.class', 'consumer-root');
      audit('consumer Griffel precedence');
    });
    it('R3.11 provider custom style hook applies to both image-button slots', () => {
      const hooks: FluentProviderCustomStyleHooks = {
        ['useCarouselNavImageButtonStyles_unstable']: rawState => {
          const state = rawState as CarouselNavImageButtonState;
          state.root.style = { ...state.root.style, width: 64, height: 64 };
          state.image.style = { ...state.image.style, width: 64, height: 64 };
        },
      };
      mount(
        <FluentProvider theme={webLightTheme} customStyleHooks_unstable={hooks}>
          <div role="tablist" aria-label="Custom previews">
            <CarouselNavImageButton id="subject" aria-label="Preview" image={{ src: imageSource() }} />
          </div>
        </FluentProvider>,
      );
      cy.get('#subject, #subject img').should('have.css', 'width', '64px').and('have.css', 'height', '64px');
      audit('provider custom style hook');
    });
    it('R3.12 source and callbacks update on the same root and image nodes with newly decoded pixels', () => {
      const calls: number[] = [];
      const Harness = () => {
        const [version, setVersion] = React.useState(0);
        return (
          <div>
            <button id="update" onClick={() => setVersion(1)}>
              Update image
            </button>
            <div role="tablist" aria-label="Preview">
              <CarouselNavImageButton
                id="subject"
                aria-label="Preview"
                onClick={() => calls.push(version)}
                image={{ src: imageSource(version === 1) }}
              />
            </div>
          </div>
        );
      };
      mount(<Harness />);
      loaded();
      cy.get('#subject img').then($image => {
        const image = $image[0];
        const root = image.parentElement!;
        cy.get('#subject').realClick();
        cy.get('#update').realClick();
        cy.get('#subject img').should($next => {
          expect($next[0]).to.equal(image);
          expect($next[0].parentElement).to.equal(root);
          expect($next[0].getAttribute('src')).to.equal(imageSource(true));
        });
      });
      loaded();
      cy.get('#subject').realClick();
      cy.then(() => expect(calls).to.deep.equal([0, 1]));
      cy.get<HTMLImageElement>('#subject img').then($image => {
        const canvas = $image[0].ownerDocument.createElement('canvas');
        canvas.width = 80;
        canvas.height = 40;
        const context = canvas.getContext('2d')!;
        context.drawImage($image[0], 0, 0);
        const rgb = Array.from(context.getImageData(10, 10, 1, 1).data);
        const color = webLightTheme.colorPaletteGreenBackground3;
        expect(rgb).to.deep.equal([
          parseInt(color.slice(1, 3), 16),
          parseInt(color.slice(3, 5), 16),
          parseInt(color.slice(5, 7), 16),
          255,
        ]);
      });
      audit('live source decoding and event closure');
    });
    it('R3.13 root and image ref replacement clears old refs then unmount clears current refs', () => {
      const roots = [React.createRef<HTMLButtonElement>(), React.createRef<HTMLButtonElement>()];
      const images = [React.createRef<HTMLImageElement>(), React.createRef<HTMLImageElement>()];
      const Harness = () => {
        const [version, setVersion] = React.useState(0);
        const [shown, setShown] = React.useState(true);
        return (
          <div>
            <button id="replace" onClick={() => setVersion(1)}>
              Replace refs
            </button>
            <button id="remove" onClick={() => setShown(false)}>
              Remove preview
            </button>
            {shown && (
              <div role="tablist" aria-label="Previews">
                <CarouselNavImageButton
                  ref={roots[version]}
                  id="subject"
                  aria-label="Preview"
                  image={{ src: imageSource(), ref: images[version] }}
                />
              </div>
            )}
          </div>
        );
      };
      mount(<Harness />);
      cy.get('#subject').then($root => expect(roots[0].current).to.equal($root[0]));
      cy.get('#replace').realClick();
      cy.get('#subject').then($root => {
        expect(roots[0].current).to.equal(null);
        expect(images[0].current).to.equal(null);
        expect(roots[1].current).to.equal($root[0]);
        expect(images[1].current).to.equal($root[0].querySelector('img'));
      });
      cy.get('#remove').realClick();
      cy.get('#subject').should('not.exist');
      cy.then(() => {
        expect(roots[1].current).to.equal(null);
        expect(images[1].current).to.equal(null);
      });
      audit('ref replacement and disposal');
    });
    it('R3.14 native disabledFocusable drops key handlers while reenable uses current handlers', () => {
      const calls: string[] = [];
      const Harness = () => {
        const [disabledFocusable, setDisabled] = React.useState(true);
        return (
          <div>
            <button id="enable" onClick={() => setDisabled(false)}>
              Enable preview
            </button>
            <div role="tablist" aria-label="Preview">
              <CarouselNavImageButton
                id="subject"
                aria-label="Preview"
                disabledFocusable={disabledFocusable}
                onKeyDown={() => calls.push(disabledFocusable ? 'stale' : 'current')}
                image={{ src: imageSource() }}
              />
            </div>
          </div>
        );
      };
      mount(<Harness />);
      cy.get('#subject').focus();
      cy.realPress('Enter');
      cy.then(() => expect(calls).to.deep.equal([]));
      cy.get('#enable').realClick();
      cy.get('#subject').focus();
      cy.realPress('Enter');
      cy.then(() => expect(calls).to.deep.equal(['current']));
      audit('updated native disabled key handlers');
    });
    (['image', 'root'] as const).forEach(where => {
      it(`R3.15 ${where} stopPropagation ${
        where === 'image' ? 'prevents the root handler' : 'does not veto selection'
      }`, () => {
        const select = cy.stub();
        const parent = cy.stub();
        mount(
          <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
            <div role="tablist" aria-label="Preview" onClick={() => parent()}>
              <CarouselNavImageButton
                id="subject"
                aria-label="Preview"
                onClick={where === 'root' ? event => event.stopPropagation() : undefined}
                image={{
                  src: imageSource(),
                  onClick: where === 'image' ? event => event.stopPropagation() : undefined,
                }}
              />
            </div>
          </CarouselProvider>,
        );
        cy.get('#subject img').realClick();
        cy.then(() => {
          expect(select.callCount).to.equal(where === 'image' ? 0 : 1);
          expect(parent).not.to.have.been.called;
        });
        audit('native image/root propagation');
      });
    });
    it('R3.16 SVG image replacement fails the HTMLElement selection guard with a real img positive control', () => {
      const select = cy.stub();
      const reset = cy.stub();
      const renderRoot: SlotRenderFunction<React.ComponentProps<'button'>> = (Root, props) => (
        <Root {...props}>
          <svg id="svg-preview" width="48" height="48" aria-hidden="true">
            <rect width="48" height="48" fill={webLightTheme.colorBrandBackground} />
          </svg>
        </Root>
      );
      mount(
        <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select, resetAutoplay: reset }}>
          <div role="tablist" aria-label="Previews">
            <CarouselNavImageButton
              id="subject"
              aria-label="SVG preview"
              image={{ src: imageSource() }}
              children={renderRoot}
            />
            <CarouselNavImageButton id="positive" aria-label="Image preview" image={{ src: imageSource() }} />
          </div>
        </CarouselProvider>,
      );
      cy.get('#svg-preview rect').realClick();
      cy.then(() => {
        expect(select).not.to.have.been.called;
        expect(reset).not.to.have.been.called;
      });
      cy.get('#positive img').realClick();
      cy.then(() => {
        expect(select).to.have.been.calledOnce;
        expect(reset).not.to.have.been.called;
      });
      audit('HTML versus SVG click target guard');
    });

    const subscriptionFixture = (initialIndex = 0) => {
      const listeners = new Set<(data: CarouselUpdateData) => void>();
      const disposals: number[] = [];
      const selections: number[] = [];
      let serial = 0;
      const subscribe: typeof carouselContextDefaultValue.subscribeForValues = listener => {
        const id = ++serial;
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
          disposals.push(id);
        };
      };
      const Harness = () => {
        const [index, setIndex] = React.useState(initialIndex);
        const [version, setVersion] = React.useState(0);
        const [shown, setShown] = React.useState(true);
        const stableSubscribe = React.useMemo(() => (version === 0 ? subscribe : subscribe.bind(null)), [version]);
        const publish = (event: React.MouseEvent<HTMLButtonElement>, empty = false) => {
          const document = event.currentTarget.ownerDocument;
          const data: CarouselUpdateData = {
            activeIndex: 0,
            navItemsCount: 2,
            groupIndexList: empty ? [] : [[0, 1], [2]],
            slideNodes: ['panel-a', 'panel-b', 'panel-c'].map(id => document.getElementById(id)!),
          };
          listeners.forEach(listener => listener(data));
        };
        return (
          <CarouselProvider
            value={{
              ...carouselContextDefaultValue,
              subscribeForValues: stableSubscribe,
              selectPageByIndex: (_, next) => selections.push(next),
            }}
          >
            <button id="publish" onClick={event => publish(event)}>
              Publish panels
            </button>
            <button id="empty" onClick={event => publish(event, true)}>
              Publish no groups
            </button>
            <button id="index" onClick={() => setIndex(1)}>
              Replace index
            </button>
            <button id="subscriber" onClick={() => setVersion(value => value + 1)}>
              Replace subscription
            </button>
            <button id="toggle" onClick={() => setShown(value => !value)}>
              Toggle preview
            </button>
            <div id="panel-a" role="tabpanel" aria-label="Panel A">
              A
            </div>
            <div id="panel-b" role="tabpanel" aria-label="Panel B">
              B
            </div>
            <div id="panel-c" role="tabpanel" aria-label="Panel C">
              C
            </div>
            <CarouselNavIndexContextProvider value={index}>
              <div role="tablist" aria-label="Previews">
                {shown && <CarouselNavImageButton id="subject" aria-label="Preview" image={{ src: imageSource() }} />}
              </div>
            </CarouselNavIndexContextProvider>
          </CarouselProvider>
        );
      };
      return { Harness, listeners, disposals, selections };
    };
    it('R3.17 subscription publishes ordered aria-controls with exact existing grouped panel endpoints', () => {
      const { Harness, listeners } = subscriptionFixture();
      mount(<Harness />);
      cy.get('#subject').should('exist');
      cy.then(() => expect(listeners.size).to.equal(1));
      cy.get('#subject').should('not.have.attr', 'aria-controls');
      cy.get('#publish').realClick();
      cy.get('#subject').should('have.attr', 'aria-controls', 'panel-a panel-b');
      cy.get('#panel-a, #panel-b').should('have.length', 2);
      audit('ordered live controlled panels');
    });
    it('R3.18 absent group publications set empty aria-controls rather than stale panel IDs', () => {
      const { Harness } = subscriptionFixture();
      mount(<Harness />);
      cy.get('#publish').realClick();
      cy.get('#subject').should('have.attr', 'aria-controls', 'panel-a panel-b');
      cy.get('#empty').realClick();
      cy.get('#subject').should('have.attr', 'aria-controls', '');
      audit('missing group publication');
    });
    it('R3.19 changing context index disposes the old subscriber and does not replay or clear IDs before next publication', () => {
      const { Harness, listeners, disposals, selections } = subscriptionFixture();
      mount(<Harness />);
      cy.get('#publish').realClick();
      cy.get('#index').realClick();
      cy.get('#subject')
        .should('have.attr', 'aria-controls', 'panel-a panel-b')
        .and('have.attr', 'aria-selected', 'false');
      cy.then(() => {
        expect(listeners.size).to.equal(1);
        expect(disposals).to.deep.equal([1, 2]);
      });
      cy.get('#subject').realClick();
      cy.then(() => expect(selections).to.deep.equal([1]));
      cy.get('#publish').realClick();
      cy.get('#subject').should('have.attr', 'aria-controls', 'panel-c');
      audit('index replacement and no-replay semantics');
    });
    it('R3.20 replacing subscribe identity cleans up exactly once and next publication reaches the current root', () => {
      const { Harness, listeners, disposals } = subscriptionFixture();
      mount(<Harness />);
      cy.get('#publish').realClick();
      cy.get('#subscriber').realClick();
      cy.then(() => {
        expect(listeners.size).to.equal(1);
        expect(disposals).to.deep.equal([1, 2]);
      });
      cy.get('#subject').should('have.attr', 'aria-controls', 'panel-a panel-b');
      cy.get('#empty').realClick();
      cy.get('#subject').should('have.attr', 'aria-controls', '');
      audit('subscribe identity replacement');
    });
    it('R3.21 unmount removes subscription and remount has no stale or replayed controls until a fresh publication', () => {
      const { Harness, listeners, disposals } = subscriptionFixture();
      mount(<Harness />);
      cy.get('#publish').realClick();
      cy.get('#toggle').realClick();
      cy.get('#subject').should('not.exist');
      cy.then(() => {
        expect(listeners.size).to.equal(0);
        expect(disposals).to.deep.equal([1, 2]);
      });
      cy.get('#publish').realClick();
      cy.get('#toggle').realClick();
      cy.get('#subject').should('not.have.attr', 'aria-controls');
      cy.then(() => expect(listeners.size).to.equal(1));
      cy.get('#publish').realClick();
      cy.get('#subject').should('have.attr', 'aria-controls', 'panel-a panel-b');
      audit('subscription unmount/remount');
    });
    it('R3.22 nested provider selects only its nearest carousel and index context', () => {
      const outer = cy.stub();
      const inner = cy.stub();
      mount(
        <CarouselProvider value={{ ...carouselContextDefaultValue, activeIndex: 2, selectPageByIndex: outer }}>
          <CarouselNavIndexContextProvider value={2}>
            <div role="tablist" aria-label="Outer">
              <CarouselNavImageButton id="outer" aria-label="Outer preview" image={{ src: imageSource() }} />
            </div>
            <CarouselProvider value={{ ...carouselContextDefaultValue, activeIndex: 1, selectPageByIndex: inner }}>
              <CarouselNavIndexContextProvider value={1}>
                <div role="tablist" aria-label="Inner">
                  <CarouselNavImageButton id="inner" aria-label="Inner preview" image={{ src: imageSource() }} />
                </div>
              </CarouselNavIndexContextProvider>
            </CarouselProvider>
          </CarouselNavIndexContextProvider>
        </CarouselProvider>,
      );
      cy.get('#inner img').realClick();
      cy.then(() => {
        expect(inner).to.have.been.calledOnce;
        expect(inner.firstCall.args[1]).to.equal(1);
        expect(outer).not.to.have.been.called;
      });
      cy.get('#outer img').realClick();
      cy.then(() => {
        expect(outer).to.have.been.calledOnce;
        expect(outer.firstCall.args[1]).to.equal(2);
      });
      audit('nearest context isolation');
    });
    (['ltr', 'rtl'] as const).forEach(dir => {
      it(`R3.23 ${dir} actual grouped card removal republishes only surviving image-button panel IDs`, () => {
        const Harness = () => {
          const [cards, setCards] = React.useState(['a', 'b', 'c', 'd']);
          const [width, setWidth] = React.useState(480);
          return (
            <Fixture half cards={cards} style={{ width }}>
              <button id="resize" onClick={() => setWidth(500)}>
                Resize
              </button>
              <button id="remove-card" onClick={() => setCards(['a', 'b', 'c'])}>
                Remove final card
              </button>
            </Fixture>
          );
        };
        mount(<Harness />, dir);
        tab(1).should('exist');
        cy.get('#resize').realClick();
        tab(1).should('have.attr', 'aria-controls', 'image-c image-d');
        cy.get('#remove-card').realClick();
        cy.get('#image-d').should('not.exist');
        tab(1).should('have.attr', 'aria-controls', 'image-c');
        tab(1).realClick();
        selected(1);
        audit('real card-removal publication', 'mover');
      });
    });
    (['ltr', 'rtl'] as const).forEach(dir => {
      it(`R3.24 ${dir} circular Carousel navigation still marks one selected thumbnail after end-to-start clicks`, () => {
        mount(<Fixture circular />, dir);
        tab(3).realClick();
        selected(3);
        tab(0).realClick();
        selected(0);
        audit('circular engine image pagination', 'mover');
      });
    });
    it('R3.25 provider theme and direction can change while retaining decoded image nodes and selection', () => {
      const Harness = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <FluentProvider dir={changed ? 'rtl' : 'ltr'} theme={changed ? webDarkTheme : webLightTheme}>
            <button id="change-provider" onClick={() => setChanged(true)}>
              Change theme and direction
            </button>
            <Fixture defaultActiveIndex={1} />
          </FluentProvider>
        );
      };
      mount(<Harness />);
      tab(1)
        .find('img')
        .then($image => {
          const image = $image[0];
          cy.get('#change-provider').realClick();
          tab(1)
            .find('img')
            .should($next => expect($next[0]).to.equal(image));
        });
      selected(1);
      tab(1).should('have.css', 'direction', 'rtl');
      loaded();
      audit('dynamic provider inheritance', 'mover');
    });
    (['a', 'div'] as const).forEach(as => {
      it(`R3.26 ${as} default ARIA helper semantics are not tab semantics and expose exact selected-attribute misuse`, () => {
        mount(<CarouselNavImageButton as={as} id="subject" aria-label="Preview" image={{ src: imageSource() }} />);
        cy.get('#subject').should('have.attr', 'role', 'button').and('have.attr', 'aria-selected', 'true');
        audit('negative default polymorphic semantics', 'clean', [
          { id: 'aria-allowed-attr', targets: [['#subject']] },
        ]);
      });
    });
    it('R3.27 required empty image object renders a decorative native image without inventing a source or fallback', () => {
      contextMount({ image: {} });
      cy.get('#subject img').should('have.attr', 'alt', '').and('have.attr', 'aria-hidden', 'true');
      cy.get('#subject img').should('not.have.attr', 'src');
      cy.get('#subject').focus();
      cy.realPress('Enter');
      audit('supported empty image slot object');
    });
    (['ltr', 'rtl'] as const).forEach(dir => {
      it(`R3.28 ${dir} real forced-colors media preserves decoded thumbnails and native keyboard focus`, () => {
        cy.then(() =>
          Cypress.automation('remote:debugger:protocol', {
            command: 'Emulation.setEmulatedMedia',
            params: { features: [{ name: 'forced-colors', value: 'active' }] },
          }),
        );
        const select = cy.stub();
        mount(
          <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
            <div role="tablist" aria-label="Preview">
              <CarouselNavImageButton id="subject" aria-label="Preview" image={{ src: imageSource() }} />
            </div>
          </CarouselProvider>,
          dir,
        );
        loaded();
        cy.get('#subject').focus();
        cy.realPress('ArrowRight');
        cy.get('#subject').should($root => {
          const window = $root[0].ownerDocument.defaultView!;
          expect(window.matchMedia('(forced-colors: active)').matches).to.equal(true);
          expect(window.getComputedStyle($root[0]).width).to.equal('48px');
          expect(parseFloat(window.getComputedStyle($root[0]).outlineWidth)).to.be.greaterThan(0);
        });
        cy.get('#subject').screenshot(`only131-forced-colors-${dir}`);
        cy.realPress('Enter');
        cy.then(() => expect(select).to.have.been.calledOnce);
        audit('real forced-colors positive control');
      });
    });
    (['image', 'parent'] as const).forEach(where => {
      it(`R3.29 ${where} preventDefault ${
        where === 'image' ? 'vetoes selection before the root' : 'runs after selection and cannot undo it'
      }`, () => {
        const calls: string[] = [];
        mount(
          <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: () => calls.push('select') }}>
            <div
              role="tablist"
              aria-label="Preview"
              onClick={event => {
                calls.push('parent');
                if (where === 'parent') {
                  event.preventDefault();
                }
              }}
            >
              <CarouselNavImageButton
                id="subject"
                aria-label="Preview"
                onClick={() => calls.push('root')}
                image={{
                  src: imageSource(),
                  onClick: event => {
                    calls.push('image');
                    if (where === 'image') {
                      event.preventDefault();
                    }
                  },
                }}
              />
            </div>
          </CarouselProvider>,
        );
        cy.get('#subject img').realClick();
        cy.then(() =>
          expect(calls).to.deep.equal(
            where === 'image' ? ['image', 'root', 'parent'] : ['image', 'root', 'select', 'parent'],
          ),
        );
        audit('native prevention ordering');
      });
    });
  });
}
