import * as React from 'react';
import 'cypress-real-events';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme } from '@fluentui/react-theme';
import type { Theme } from '@fluentui/react-theme';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { Badge } from './Badge';
import { useConsumerStyles } from './Badge.cy.styles';
import type { BadgeProps, BadgeSlots, BadgeState } from './Badge.types';

const sizes = ['tiny', 'extra-small', 'small', 'medium', 'large', 'extra-large'] as const;
const shapes = ['circular', 'rounded', 'square'] as const;
const appearances = ['filled', 'ghost', 'outline', 'tint'] as const;
const colors = ['brand', 'danger', 'important', 'informative', 'severe', 'subtle', 'success', 'warning'] as const;
const heights = [6, 10, 16, 20, 24, 32];
const iconSizes = [6, 10, 12, 12, 16, 20];
const badge = '[data-testid="badge"]';
const icon = (
  <svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 16 16">
    <path d="M2 2h12v12H2z" />
  </svg>
);

const themedMount = (children: React.ReactNode, theme: Theme = webLightTheme, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={theme} dir={dir}>
      {children}
    </FluentProvider>,
  );

function css(element: Element, pseudo?: string) {
  const view = element.ownerDocument.defaultView;
  if (!view) {
    throw new Error('Badge must have an attached browsing context');
  }
  return view.getComputedStyle(element, pseudo);
}

function normalizedColor(element: HTMLElement, color: string) {
  const probe = element.ownerDocument.createElement('span');
  probe.style.color = color;
  element.appendChild(probe);
  const result = css(probe).color;
  probe.remove();
  return result;
}

type ColorToken = Extract<keyof Theme, `color${string}`>;
type ColorTokens = [ColorToken | undefined, ColorToken, ColorToken | 'currentColor'];
function colorTokens(
  appearance: NonNullable<BadgeProps['appearance']>,
  color: NonNullable<BadgeProps['color']>,
): ColorTokens {
  const filled: Record<NonNullable<BadgeProps['color']>, ColorTokens> = {
    brand: ['colorBrandBackground', 'colorNeutralForegroundOnBrand', 'colorTransparentStroke'],
    danger: ['colorPaletteRedBackground3', 'colorNeutralForegroundOnBrand', 'colorTransparentStroke'],
    important: ['colorNeutralForeground1', 'colorNeutralBackground1', 'colorTransparentStroke'],
    informative: ['colorNeutralBackground5', 'colorNeutralForeground3', 'colorTransparentStroke'],
    severe: ['colorPaletteDarkOrangeBackground3', 'colorNeutralForegroundOnBrand', 'colorTransparentStroke'],
    subtle: ['colorNeutralBackground1', 'colorNeutralForeground1', 'colorTransparentStroke'],
    success: ['colorPaletteGreenBackground3', 'colorNeutralForegroundOnBrand', 'colorTransparentStroke'],
    warning: ['colorPaletteYellowBackground3', 'colorNeutralForeground1Static', 'colorTransparentStroke'],
  };
  const foreground: Record<NonNullable<BadgeProps['color']>, ColorToken> = {
    brand: 'colorBrandForeground1',
    danger: 'colorPaletteRedForeground3',
    important: 'colorNeutralForeground1',
    informative: 'colorNeutralForeground3',
    severe: 'colorPaletteDarkOrangeForeground3',
    subtle: 'colorNeutralForegroundStaticInverted',
    success: 'colorPaletteGreenForeground3',
    warning: 'colorPaletteYellowForeground2',
  };
  const tint: Record<NonNullable<BadgeProps['color']>, ColorTokens> = {
    brand: ['colorBrandBackground2', 'colorBrandForeground2', 'colorBrandStroke2'],
    danger: ['colorPaletteRedBackground1', 'colorPaletteRedForeground1', 'colorPaletteRedBorder1'],
    important: ['colorNeutralForeground3', 'colorNeutralBackground1', 'colorTransparentStroke'],
    informative: ['colorNeutralBackground4', 'colorNeutralForeground3', 'colorNeutralStroke2'],
    severe: ['colorPaletteDarkOrangeBackground1', 'colorPaletteDarkOrangeForeground1', 'colorPaletteDarkOrangeBorder1'],
    subtle: ['colorNeutralBackground1', 'colorNeutralForeground3', 'colorNeutralStroke2'],
    success: ['colorPaletteGreenBackground1', 'colorPaletteGreenForeground1', 'colorPaletteGreenBorder1'],
    warning: ['colorPaletteYellowBackground1', 'colorPaletteYellowForeground1', 'colorPaletteYellowBorder1'],
  };
  if (appearance === 'filled') {
    return filled[color];
  }
  if (appearance === 'tint') {
    return tint[color];
  }
  if (appearance === 'ghost') {
    return [undefined, foreground[color], 'colorTransparentStroke'];
  }
  const borders: Partial<Record<NonNullable<BadgeProps['color']>, ColorToken>> = {
    danger: 'colorPaletteRedBorder2',
    important: 'colorNeutralStrokeAccessible',
    informative: 'colorNeutralStroke2',
    success: 'colorPaletteGreenBorder2',
  };
  return [
    undefined,
    color === 'important' ? 'colorNeutralForeground3' : foreground[color],
    borders[color] || 'currentColor',
  ];
}

describe('Badge documented scenarios', () => {
  it('renders the documented default without counter or presence semantics', () => {
    themedMount(<Badge data-testid="badge">Default Badge</Badge>);
    cy.get(badge).should('have.text', 'Default Badge').and('have.class', 'fui-Badge');
    cy.get(badge).should($root => {
      expect($root[0].getBoundingClientRect().height).to.equal(20);
      expect($root[0].tagName).to.equal('DIV');
      for (const attr of ['role', 'tabindex', 'aria-live']) {
        expect($root[0].hasAttribute(attr)).to.equal(false);
      }
      expect(css($root[0]).borderRadius).to.equal(webLightTheme.borderRadiusCircular);
      expect(css($root[0]).backgroundColor).to.equal(normalizedColor($root[0], webLightTheme.colorBrandBackground));
    });
    cy.get('.fui-Badge__icon').should('not.exist');
  });

  describe('Badge edges and accessibility', () => {
    for (const [index, size] of sizes.entries()) {
      for (const shape of shapes) {
        it(`checks the complete appearance/color matrix at ${size}/${shape}`, () => {
          themedMount(
            <div style={{ backgroundColor: webLightTheme.colorBrandBackground }}>
              {appearances.flatMap(appearance =>
                colors.map(color => (
                  <Badge
                    key={`${appearance}-${color}`}
                    data-testid={`${appearance}-${color}`}
                    size={size}
                    shape={shape}
                    appearance={appearance}
                    color={color}
                    icon={icon}
                  >
                    7
                  </Badge>
                )),
              )}
            </div>,
          );
          for (const appearance of appearances) {
            for (const color of colors) {
              cy.get(`[data-testid="${appearance}-${color}"]`).should($root => {
                const element = $root[0];
                const [background, foreground, border] = colorTokens(appearance, color);
                const style = css(element);
                const stroke = css(element, '::after');
                expect(element.getBoundingClientRect().height).to.equal(heights[index]);
                expect(style.color).to.equal(normalizedColor(element, webLightTheme[foreground]));
                expect(style.backgroundColor).to.equal(
                  normalizedColor(element, background ? webLightTheme[background] : 'transparent'),
                );
                const radius =
                  shape === 'square'
                    ? webLightTheme.borderRadiusNone
                    : shape === 'circular'
                    ? webLightTheme.borderRadiusCircular
                    : index < 3
                    ? webLightTheme.borderRadiusSmall
                    : webLightTheme.borderRadiusMedium;
                expect(Number.parseFloat(style.borderRadius)).to.equal(Number.parseFloat(radius));
                expect(stroke.display).to.equal(appearance === 'ghost' ? 'none' : 'block');
                if (appearance !== 'ghost') {
                  expect(stroke.borderTopColor).to.equal(
                    border === 'currentColor' ? style.color : normalizedColor(element, webLightTheme[border]),
                  );
                }
                for (const attr of ['size', 'shape', 'appearance', 'color', 'icon', 'iconposition']) {
                  expect(element.hasAttribute(attr), attr).to.equal(false);
                }
              });
            }
          }
        });
      }
    }

    for (const size of ['medium', 'extra-large'] as const) {
      for (const position of ['before', 'after'] as const) {
        for (const [label, children, hasContent] of [
          ['zero', 0, true],
          ['null', null, false],
          ['undefined', undefined, false],
          ['false', false, false],
          ['empty-string', '', true],
          ['text', 'Ready', true],
        ] as const) {
          it(`preserves ${label} content and ${size}/${position} icon margins`, () => {
            themedMount(
              <Badge data-testid="badge" size={size} icon={icon} iconPosition={position}>
                {children}
              </Badge>,
            );
            cy.get(badge).should('have.text', children === 0 ? '0' : typeof children === 'string' ? children : '');
            cy.get(`${badge} .fui-Badge__icon`).should($icon => {
              const style = css($icon[0]);
              const negative = -Number.parseFloat(webLightTheme.spacingHorizontalXXS);
              const spacing =
                Number.parseFloat(
                  size === 'extra-large' ? webLightTheme.spacingHorizontalXS : webLightTheme.spacingHorizontalXXS,
                ) + Number.parseFloat(webLightTheme.spacingHorizontalXXS);
              expect(Number.parseFloat(style.marginLeft)).to.equal(
                hasContent && position === 'after' ? spacing : negative,
              );
              expect(Number.parseFloat(style.marginRight)).to.equal(
                hasContent && position === 'before' ? spacing : negative,
              );
            });
          });
        }
      }
    }

    for (const dir of ['ltr', 'rtl'] as const) {
      for (const [index, size] of sizes.entries()) {
        it(`measures text and oversized icon overflow at ${size}/${dir} without inventing truncation`, () => {
          themedMount(
            <div>
              <Badge data-testid="short" size={size}>
                7
              </Badge>
              <Badge data-testid="long" size={size}>
                <span data-testid="long-text">Unsupported long badge text that must remain intact</span>
              </Badge>
              <Badge data-testid="oversized" size={size} icon={<svg aria-hidden="true" width="64" height="64" />} />
            </div>,
            webLightTheme,
            dir,
          );
          cy.get('[data-testid="long"]').should($root => {
            const root = $root[0];
            const text = root.querySelector('[data-testid="long-text"]');
            if (!text) {
              throw new Error('Long text probe missing');
            }
            expect(root.textContent).to.equal('Unsupported long badge text that must remain intact');
            expect(root.getBoundingClientRect().height).to.equal(heights[index]);
            expect(css(root).overflow).to.equal('visible');
            expect(css(root).textOverflow).to.equal('clip');
            if (index < 2) {
              expect(root.getBoundingClientRect().width).to.equal(heights[index]);
              expect(text.getBoundingClientRect().width).to.be.greaterThan(root.getBoundingClientRect().width);
            } else {
              const short = root.parentElement?.querySelector('[data-testid="short"]');
              if (!short) {
                throw new Error('Short content positive control missing');
              }
              expect(root.getBoundingClientRect().width).to.be.greaterThan(short.getBoundingClientRect().width);
            }
          });
          cy.get('[data-testid="oversized"]').should($root => {
            const svg = $root[0].querySelector('svg');
            if (!svg) {
              throw new Error('Oversized SVG missing');
            }
            expect($root[0].getBoundingClientRect().height).to.equal(heights[index]);
            expect(svg.getBoundingClientRect().height).to.equal(64);
            expect(svg.getBoundingClientRect().height).to.be.greaterThan($root[0].getBoundingClientRect().height);
            expect(css($root[0]).overflow).to.equal('visible');
          });
        });
      }
    }

    it('exposes consumer-owned button names, descriptions, labelled images and meaningful icons', () => {
      themedMount(
        <div data-testid="a11y">
          <button data-testid="inbox">
            Inbox{' '}
            <Badge icon={icon}>
              6<span> unread messages</span>
            </Badge>
          </button>
          <button data-testid="explicit" aria-label="Inbox, 6 unread messages">
            Inbox <Badge>6</Badge>
          </button>
          <Badge data-testid="image" role="img" aria-label="Active" />
          <Badge icon={<svg role="img" aria-label="Paste" width="16" height="16" />} />
          <span id="badge-description">Three pending requests</span>
          <button data-testid="described" aria-describedby="badge-description">
            Requests<Badge aria-hidden="true">3</Badge>
          </button>
        </div>,
      );
      cy.get('[data-testid="inbox"]').should($root => {
        expect(computeAccessibleName($root[0])).to.equal('Inbox 6 unread messages');
      });
      cy.get('[data-testid="explicit"]').should($root => {
        expect(computeAccessibleName($root[0])).to.equal('Inbox, 6 unread messages');
      });
      cy.get('[data-testid="image"]').should($root => {
        expect(computeAccessibleName($root[0])).to.equal('Active');
      });
      cy.get('svg[role="img"]').should($root => {
        expect(computeAccessibleName($root[0])).to.equal('Paste');
      });
      cy.get('[data-testid="described"]').should($root => {
        expect(computeAccessibleName($root[0])).to.equal('Requests');
        expect(computeAccessibleDescription($root[0])).to.equal('Three pending requests');
      });
      cy.get('[data-testid="a11y"]')
        .then($root => axe.run($root[0]))
        .then(result => {
          expect(result.violations.map(violation => `${violation.id}: ${violation.description}`)).to.deep.equal([]);
        });
    });

    it('keeps decorative badges outside the tab order while native consumer focus remains possible', () => {
      themedMount(
        <div>
          <button data-testid="start">Start</button>
          <Badge data-testid="badge">Ready</Badge>
          <button data-testid="end">End</button>
          <Badge data-testid="focusable" tabIndex={0} aria-label="Consumer focus">
            Ready
          </Badge>
        </div>,
      );
      cy.get('[data-testid="start"]').focus();
      cy.realPress('Tab');
      cy.get('[data-testid="end"]').should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="focusable"]').should('be.focused');
      cy.get(badge).should($root => {
        expect($root[0].tabIndex).to.equal(-1);
      });
    });

    it('updates the owning control name without injecting live regions or counter behavior', () => {
      const Fixture = () => {
        const [count, setCount] = React.useState(0);
        return (
          <button data-testid="owner" onClick={() => setCount(count + 1)}>
            Inbox{' '}
            <Badge data-testid="badge">
              {count}
              <span> unread messages</span>
            </Badge>
          </button>
        );
      };
      themedMount(<Fixture />);
      cy.get('[data-testid="owner"]')
        .should($root => {
          expect(computeAccessibleName($root[0])).to.equal('Inbox 0 unread messages');
        })
        .click();
      cy.get('[data-testid="owner"]').should($root => {
        expect(computeAccessibleName($root[0])).to.equal('Inbox 1 unread messages');
      });
      cy.get(badge).should($root => {
        expect($root[0].hasAttribute('aria-live')).to.equal(false);
        expect($root[0].hasAttribute('role')).to.equal(false);
      });
      cy.get('[aria-live], [role="status"], [role="alert"]').should('not.exist');
    });

    it('preserves native props, root/icon refs and slot render functions on supported elements', () => {
      const rootRef = React.createRef<HTMLDivElement>();
      const iconRef = React.createRef<HTMLSpanElement>();
      const clicked = cy.stub().as('slotClick');
      const renderIcon: SlotRenderFunction<ExtractSlotProps<BadgeSlots['icon']>> = (Component, props) => (
        <Component {...props}>
          <svg aria-hidden="true" width="1em" height="1em" />
          <span>Glyph</span>
        </Component>
      );
      const renderRoot: SlotRenderFunction<ExtractSlotProps<BadgeSlots['root']>> = (Component, props) => (
        <Component {...props}>
          <strong data-testid="custom-root">Custom</strong>
          {props.children}
        </Component>
      );
      themedMount(
        <Badge
          as="div"
          data-testid="badge"
          id="native-id"
          title="Badge title"
          lang="fr"
          aria-label="Custom Badge"
          ref={rootRef}
          className="consumer-root"
          style={{ height: 40 }}
          onClick={clicked}
          icon={{ as: 'span', ref: iconRef, className: 'consumer-icon', title: 'Icon title', children: renderIcon }}
        >
          {renderRoot}
        </Badge>,
      );
      cy.get(badge).should($root => {
        expect($root[0].tagName).to.equal('DIV');
        expect(rootRef.current).to.equal($root[0]);
        expect($root[0].id).to.equal('native-id');
        expect($root[0].getAttribute('lang')).to.equal('fr');
        expect($root[0].title).to.equal('Badge title');
        expect($root[0].classList.contains('consumer-root')).to.equal(true);
        expect($root[0].getBoundingClientRect().height).to.equal(40);
      });
      cy.get('.fui-Badge__icon').should($icon => {
        expect($icon[0].tagName).to.equal('SPAN');
        expect(iconRef.current).to.equal($icon[0]);
        expect($icon[0].classList.contains('consumer-icon')).to.equal(true);
        expect($icon[0].title).to.equal('Icon title');
        expect($icon[0].textContent).to.equal('Glyph');
      });
      cy.get(badge).click();
      cy.get('[data-testid="custom-root"]').should('have.text', 'Custom');
      cy.get('@slotClick').should('have.been.calledOnce');
    });
  });

  describe('Badge forced colors', () => {
    afterEach(() =>
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [] },
        }),
      ),
    );

    for (const appearance of appearances) {
      for (const color of colors) {
        it(`preserves ${appearance}/${color} border geometry and system colors in active forced colors`, () => {
          cy.then(() =>
            Cypress.automation('remote:debugger:protocol', {
              command: 'Emulation.setEmulatedMedia',
              params: { features: [{ name: 'forced-colors', value: 'active' }] },
            }),
          );
          themedMount(
            <Badge data-testid="badge" appearance={appearance} color={color} icon={icon}>
              Ready
            </Badge>,
          );
          cy.get(badge).should($root => {
            const element = $root[0];
            const view = element.ownerDocument.defaultView;
            if (!view) {
              throw new Error('Missing browsing context');
            }
            expect(view.matchMedia('(forced-colors: active)').matches).to.equal(true);
            expect(css(element).forcedColorAdjust).to.equal('auto');
            expect(css(element).color).to.equal(normalizedColor(element, 'CanvasText'));
            if (appearance === 'filled' || appearance === 'tint') {
              expect(css(element).backgroundColor).to.equal(normalizedColor(element, 'Canvas'));
            }
            const stroke = css(element, '::after');
            expect(stroke.display).to.equal(appearance === 'ghost' ? 'none' : 'block');
            if (appearance !== 'ghost') {
              expect(stroke.borderTopColor).to.equal(normalizedColor(element, 'CanvasText'));
              expect(stroke.borderTopStyle).to.equal('solid');
              expect(stroke.borderTopWidth).to.equal(webLightTheme.strokeWidthThin);
            }
            expect(element.getBoundingClientRect().height).to.equal(20);
            expect(element.textContent).to.equal('Ready');
          });
        });
      }
    }
  });
  for (const [themeName, theme] of [
    ['light', webLightTheme],
    ['dark', webDarkTheme],
  ] as const) {
    for (const appearance of appearances) {
      for (const color of colors) {
        it(`resolves ${themeName} ${appearance}/${color} foreground, fill and stroke tokens`, () => {
          themedMount(
            <div style={{ backgroundColor: theme.colorBrandBackground }}>
              <Badge data-testid="badge" appearance={appearance} color={color} icon={icon}>
                999+
              </Badge>
            </div>,
            theme,
          );
          cy.get(badge).should($root => {
            const element = $root[0];
            const style = css(element);
            const stroke = css(element, '::after');
            const [background, foreground, border] = colorTokens(appearance, color);
            expect(style.color).to.equal(normalizedColor(element, theme[foreground]));
            expect(style.backgroundColor).to.equal(
              normalizedColor(element, background ? theme[background] : 'transparent'),
            );
            expect(stroke.display).to.equal(appearance === 'ghost' ? 'none' : 'block');
            if (appearance !== 'ghost') {
              expect(stroke.borderTopColor).to.equal(
                border === 'currentColor' ? style.color : normalizedColor(element, theme[border]),
              );
              expect(stroke.borderTopWidth).to.equal(theme.strokeWidthThin);
              expect(stroke.borderRadius).to.equal(style.borderRadius);
            }
            expect(element.textContent).to.equal('999+');
            expect(element.getBoundingClientRect().height).to.equal(20);
          });
        });
      }
    }
  }

  for (const [index, size] of sizes.entries()) {
    for (const shape of shapes) {
      it(`measures ${size}/${shape} empty, icon-only and short content geometry`, () => {
        themedMount(
          <div>
            <Badge data-testid="empty" size={size} shape={shape} />
            <Badge data-testid="icon-only" size={size} shape={shape} icon={icon} />
            <Badge data-testid="text" size={size} shape={shape}>
              7
            </Badge>
          </div>,
        );
        for (const testId of ['empty', 'icon-only', 'text']) {
          cy.get(`[data-testid="${testId}"]`).should($root => {
            const element = $root[0];
            const rect = element.getBoundingClientRect();
            const radius =
              shape === 'square'
                ? webLightTheme.borderRadiusNone
                : shape === 'circular'
                ? webLightTheme.borderRadiusCircular
                : index < 3
                ? webLightTheme.borderRadiusSmall
                : webLightTheme.borderRadiusMedium;
            expect(rect.height).to.equal(heights[index]);
            expect(rect.width).to.be.at.least(heights[index]);
            if (testId !== 'text' || index < 2) {
              expect(rect.width).to.equal(heights[index]);
            }
            expect(Number.parseFloat(css(element).borderRadius)).to.equal(Number.parseFloat(radius));
            expect(css(element).boxSizing).to.equal('border-box');
          });
        }
        cy.get('[data-testid="icon-only"] .fui-Badge__icon').should($icon => {
          expect(css($icon[0]).fontSize).to.equal(`${iconSizes[index]}px`);
          expect($icon[0].getBoundingClientRect().height).to.equal(iconSizes[index]);
        });
      });
    }
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const position of ['before', 'after'] as const) {
      for (const size of sizes) {
        it(`orders and spaces ${size} ${position} icon in ${dir}`, () => {
          themedMount(
            <Badge data-testid="badge" icon={icon} iconPosition={position} size={size}>
              <span data-testid="text">7</span>
            </Badge>,
            webLightTheme,
            dir,
          );
          cy.get(badge).should($root => {
            const element = $root[0];
            const glyph = element.querySelector('.fui-Badge__icon');
            const text = element.querySelector('[data-testid="text"]');
            expect(glyph).not.to.equal(null);
            expect(text).not.to.equal(null);
            if (!glyph || !text) {
              throw new Error('Expected both icon and text');
            }
            expect(element.children[position === 'before' ? 0 : 1]).to.equal(glyph);
            const iconRect = glyph.getBoundingClientRect();
            const textRect = text.getBoundingClientRect();
            const iconOnLeft = (position === 'before') === (dir === 'ltr');
            const gap = iconOnLeft ? textRect.left - iconRect.right : iconRect.left - textRect.right;
            const expected =
              Number.parseFloat(
                size === 'extra-large' ? webLightTheme.spacingHorizontalXS : webLightTheme.spacingHorizontalXXS,
              ) + Number.parseFloat(webLightTheme.spacingHorizontalXXS);
            expect(gap).to.be.closeTo(expected, 0.1);
            expect((iconRect.top + iconRect.bottom) / 2).to.be.closeTo((textRect.top + textRect.bottom) / 2, 0.6);
          });
        });
      }
    }
  }
});

describe('Badge unit-derived conformance and lifecycle', () => {
  it('lets consumer Griffel classes win while preserving both static slot classes', () => {
    const Fixture = () => {
      const styles = useConsumerStyles();
      return (
        <Badge data-testid="badge" className={styles.root} icon={{ children: icon, className: styles.icon }}>
          Ready
        </Badge>
      );
    };
    themedMount(<Fixture />);
    cy.get(badge).should($root => {
      expect($root[0].classList.contains('fui-Badge')).to.equal(true);
      expect(css($root[0]).color).to.equal(normalizedColor($root[0], webLightTheme.colorPaletteRedForeground1));
      expect(css($root[0]).backgroundColor).to.equal(
        normalizedColor($root[0], webLightTheme.colorPaletteRedBackground1),
      );
      expect(css($root[0]).borderRadius).to.equal('0px');
    });
    cy.get('.fui-Badge__icon').should($icon => {
      expect(css($icon[0]).fontSize).to.equal(webLightTheme.fontSizeBase600);
    });
  });

  for (const [label, value, expected, exists] of [
    ['omitted', undefined, '', false],
    ['null', null, '', false],
    ['numeric-zero', 0, '0', true],
    ['text-shorthand', 'Test Icon', 'Test Icon', true],
    ['empty-object', {}, '', true],
    ['object-null', { children: null }, '', true],
    ['object-empty', { children: '' }, '', true],
    ['object-zero', { children: 0 }, '0', true],
    ['element', icon, '', true],
  ] as const) {
    it(`resolves ${label} icon shorthand without losing the root or zero`, () => {
      themedMount(
        <Badge data-testid="badge" icon={value}>
          0
        </Badge>,
      );
      cy.get(badge).should('have.class', 'fui-Badge').and('contain.text', '0');
      if (exists) {
        cy.get('.fui-Badge__icon').should('have.text', expected).and('have.class', 'fui-Badge__icon');
      } else {
        cy.get('.fui-Badge__icon').should('not.exist');
      }
    });
  }

  for (const [index, size] of sizes.entries()) {
    it(`checks ${size} typography, padding and appearance-independent bounds`, () => {
      themedMount(
        <div>
          {appearances.map(appearance => (
            <Badge key={appearance} data-testid={appearance} size={size} appearance={appearance}>
              7
            </Badge>
          ))}
        </div>,
      );
      let width: number;
      cy.get('[data-testid="filled"]').then($root => {
        width = $root[0].getBoundingClientRect().width;
      });
      for (const appearance of appearances) {
        cy.get(`[data-testid="${appearance}"]`).should($root => {
          const root = $root[0];
          const style = css(root);
          expect(root.getBoundingClientRect().width).to.equal(width);
          expect(root.getBoundingClientRect().height).to.equal(heights[index]);
          const font =
            index === 0
              ? '4px'
              : index === 1
              ? '6px'
              : index === 2
              ? webLightTheme.fontSizeBase100
              : webLightTheme.fontSizeBase200;
          const lineHeight =
            index === 0
              ? '4px'
              : index === 1
              ? '6px'
              : index === 2
              ? webLightTheme.lineHeightBase100
              : webLightTheme.lineHeightBase200;
          expect(style.fontSize).to.equal(font);
          expect(style.lineHeight).to.equal(lineHeight);
          expect(Number(style.fontWeight)).to.equal(webLightTheme.fontWeightSemibold);
          const padding =
            index < 2
              ? 0
              : Number.parseFloat(
                  index === 2
                    ? webLightTheme.spacingHorizontalXXS
                    : index === 5
                    ? webLightTheme.spacingHorizontalSNudge
                    : webLightTheme.spacingHorizontalXS,
                ) + Number.parseFloat(webLightTheme.spacingHorizontalXXS);
          expect(Number.parseFloat(style.paddingLeft)).to.equal(padding);
          expect(Number.parseFloat(style.paddingRight)).to.equal(padding);
        });
      }
    });
  }

  it('updates all visual props, content, icon and provider theme/direction without remounting the root', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Fixture = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <FluentProvider theme={phase === 1 ? webDarkTheme : webLightTheme} dir={phase === 1 ? 'rtl' : 'ltr'}>
          <button onClick={() => setPhase((phase + 1) % 3)}>Update</button>
          <Badge
            data-testid="badge"
            ref={ref}
            size={phase === 1 ? 'extra-large' : 'small'}
            shape={phase === 1 ? 'square' : 'rounded'}
            appearance={phase === 1 ? 'tint' : 'ghost'}
            color={phase === 1 ? 'danger' : 'success'}
            icon={phase === 2 ? null : icon}
            iconPosition={phase === 1 ? 'after' : 'before'}
          >
            {phase === 0 ? 0 : phase === 1 ? 'Ready' : null}
          </Badge>
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    let original: HTMLElement;
    cy.get(badge).then($root => {
      original = $root[0];
    });
    cy.get(badge).should('have.text', '0');
    cy.contains('button', 'Update').click();
    cy.get(badge).should($root => {
      const root = $root[0];
      expect(root).to.equal(original);
      expect(ref.current).to.equal(original);
      expect(root.textContent).to.equal('Ready');
      expect(root.lastElementChild?.classList.contains('fui-Badge__icon')).to.equal(true);
      expect(root.getBoundingClientRect().height).to.equal(32);
      expect(css(root).direction).to.equal('rtl');
      expect(css(root).borderRadius).to.equal('0px');
      expect(css(root).backgroundColor).to.equal(normalizedColor(root, webDarkTheme.colorPaletteRedBackground1));
      expect(css(root).color).to.equal(normalizedColor(root, webDarkTheme.colorPaletteRedForeground1));
    });
    cy.contains('button', 'Update').click();
    cy.get(badge).should($root => {
      expect($root[0]).to.equal(original);
      expect($root[0].textContent).to.equal('');
      expect($root[0].getBoundingClientRect().height).to.equal(16);
      expect(css($root[0]).direction).to.equal('ltr');
      expect(css($root[0]).borderRadius).to.equal(webLightTheme.borderRadiusSmall);
      expect(css($root[0], '::after').display).to.equal('none');
      expect(css($root[0]).backgroundColor).to.equal(normalizedColor($root[0], 'transparent'));
      expect(css($root[0]).color).to.equal(normalizedColor($root[0], webLightTheme.colorPaletteGreenForeground3));
    });
    cy.get('.fui-Badge__icon').should('not.exist');
    cy.contains('button', 'Update').click();
    cy.get(badge).should('have.text', '0');
    cy.get('.fui-Badge__icon').should('exist');
  });

  it('uses latest native handlers, preserves event targets and clears refs on unmount/remount', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const iconRef = React.createRef<HTMLSpanElement>();
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const key = cy.stub().as('key');
    const focus = cy.stub().as('focus');
    const pointer = cy.stub().as('pointer');
    const iconEvent = cy.stub().as('iconEvent');
    const Fixture = () => {
      const [updated, setUpdated] = React.useState(false);
      const [visible, setVisible] = React.useState(true);
      return (
        <div>
          <button onClick={() => setUpdated(true)}>Replace handler</button>
          <button onClick={() => setVisible(!visible)}>Toggle badge</button>
          {visible && (
            <Badge
              data-testid="badge"
              ref={rootRef}
              tabIndex={0}
              onClick={updated ? latest : first}
              onKeyDown={key}
              onFocus={focus}
              onPointerDown={pointer}
              icon={{ ref: iconRef, tabIndex: -1, onFocus: iconEvent, children: icon }}
            >
              Ready
            </Badge>
          )}
        </div>
      );
    };
    themedMount(<Fixture />);
    cy.get(badge).click();
    cy.get('@first').should('have.been.calledOnce');
    cy.get('@pointer').should('have.been.calledOnce');
    cy.get(badge).focus().trigger('keydown', { key: 'Enter' }).trigger('pointerdown', { pointerType: 'mouse' });
    cy.get('@key').should('have.been.calledOnce');
    cy.get('@pointer').should('have.been.calledTwice');
    cy.get('@focus').should('have.been.called');
    cy.get('.fui-Badge__icon').focus();
    cy.get('@iconEvent').should('have.been.calledOnce');
    cy.contains('button', 'Replace handler').click();
    cy.get(badge).click();
    cy.get('@first').should('have.been.calledOnce');
    cy.get('@latest').should('have.been.calledOnce');
    cy.then(() => {
      expect(latest.firstCall.args[0].target).to.equal(rootRef.current);
      expect(key.firstCall.args[0].key).to.equal('Enter');
    });
    let oldRoot: HTMLElement;
    cy.get(badge).then($root => {
      oldRoot = $root[0];
    });
    cy.contains('button', 'Toggle badge').click();
    cy.get(badge).should('not.exist');
    cy.then(() => {
      expect(rootRef.current).to.equal(null);
      expect(iconRef.current).to.equal(null);
    });
    cy.contains('button', 'Toggle badge').click();
    cy.get(badge)
      .should($root => {
        expect(rootRef.current).to.equal($root[0]);
        expect($root[0]).not.to.equal(oldRoot);
        expect(iconRef.current).to.equal($root[0].querySelector('.fui-Badge__icon'));
      })
      .click();
    cy.get('@latest').should('have.been.calledTwice');
  });

  it('scopes nested theme tokens and custom style hooks without leaking to sibling providers', () => {
    const custom = { ...webDarkTheme, spacingHorizontalXXS: '3px', spacingHorizontalXS: '5px' };
    mount(
      <FluentProvider theme={webLightTheme}>
        <Badge data-testid="outer">Ready</Badge>
        <FluentProvider
          theme={custom}
          customStyleHooks_unstable={{
            // eslint-disable-next-line @typescript-eslint/naming-convention
            useBadgeStyles_unstable: rawState => {
              // The shared hook context erases component-specific state types.
              const state = rawState as BadgeState;
              state.root.style = { ...state.root.style, height: 40 };
              if (state.icon) {
                state.icon.style = { ...state.icon.style, fontSize: 18 };
              }
            },
          }}
        >
          <Badge data-testid="inner" icon={icon}>
            Ready
          </Badge>
        </FluentProvider>
        <Badge data-testid="sibling">Ready</Badge>
      </FluentProvider>,
    );
    for (const id of ['outer', 'sibling']) {
      cy.get(`[data-testid="${id}"]`).should($root => {
        expect($root[0].getBoundingClientRect().height).to.equal(20);
        expect(css($root[0]).backgroundColor).to.equal(normalizedColor($root[0], webLightTheme.colorBrandBackground));
      });
    }
    cy.get('[data-testid="inner"]').should($root => {
      expect($root[0].getBoundingClientRect().height).to.equal(40);
      expect(css($root[0]).backgroundColor).to.equal(normalizedColor($root[0], custom.colorBrandBackground));
      expect(css($root[0]).paddingLeft).to.equal('8px');
    });
    cy.get('[data-testid="inner"] .fui-Badge__icon').should($icon => {
      expect(css($icon[0]).fontSize).to.equal('18px');
      expect(css($icon[0]).marginLeft).to.equal('-3px');
      expect(css($icon[0]).marginRight).to.equal('6px');
    });
  });

  it('preserves explicitly consumer-owned live-region attributes and changing status text', () => {
    const Fixture = () => {
      const [done, setDone] = React.useState(false);
      return (
        <div>
          <button onClick={() => setDone(true)}>Finish</button>
          <Badge data-testid="badge" role="status" aria-live="polite" aria-atomic="true">
            {done ? 'Complete' : 'Pending'}
          </Badge>
        </div>
      );
    };
    themedMount(<Fixture />);
    cy.get(badge).should('have.text', 'Pending');
    cy.contains('button', 'Finish').click();
    cy.get(badge).should('have.text', 'Complete');
    cy.get(badge).should($root => {
      expect($root[0].getAttribute('role')).to.equal('status');
      expect($root[0].getAttribute('aria-live')).to.equal('polite');
      expect($root[0].getAttribute('aria-atomic')).to.equal('true');
    });
  });

  it('detects an unnamed image positive control and accepts a consumer-provided name', () => {
    themedMount(
      <div data-testid="scan">
        <Badge role="img" />
        <Badge role="img" aria-label="Ready" />
      </div>,
    );
    cy.get('[data-testid="scan"]')
      .then($root => axe.run($root[0], { runOnly: ['role-img-alt'] }))
      .then(result => {
        expect(result.violations.map(violation => violation.id)).to.deep.equal(['role-img-alt']);
        expect(result.violations[0].nodes).to.have.length(1);
        expect(result.passes.find(pass => pass.id === 'role-img-alt')?.nodes).to.have.length(1);
      });
  });
});
