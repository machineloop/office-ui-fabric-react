import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme } from '@fluentui/react-theme';
import { ButtonContextProvider } from '../../contexts/ButtonContext';
import { ToggleButton } from './ToggleButton';
import type { ToggleButtonProps } from './ToggleButton.types';
import { Default } from '../../../../stories/src/ToggleButton/ToggleButtonDefault.stories';
import { Checked } from '../../../../stories/src/ToggleButton/ToggleButtonChecked.stories';
import { Disabled } from '../../../../stories/src/ToggleButton/ToggleButtonDisabled.stories';
import { Appearance } from '../../../../stories/src/ToggleButton/ToggleButtonAppearance.stories';
import { AccessibleAppearance } from '../../../../stories/src/ToggleButton/ToggleButtonAppearanceAccessible.stories';
import { Shape } from '../../../../stories/src/ToggleButton/ToggleButtonShape.stories';
import { Size } from '../../../../stories/src/ToggleButton/ToggleButtonSize.stories';
import { Icon } from '../../../../stories/src/ToggleButton/ToggleButtonIcon.stories';
import { WithLongText } from '../../../../stories/src/ToggleButton/ToggleButtonWithLongText.stories';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import {
  bundleIcon,
  CalendarMonthFilled,
  CalendarMonthRegular,
  iconFilledClassName,
  iconRegularClassName,
} from '@fluentui/react-icons';

const CalendarIcon = bundleIcon(CalendarMonthFilled, CalendarMonthRegular);
const cssColor = (value: string) => {
  const probe = document.createElement('span');
  probe.style.color = value;
  return probe.style.color;
};

const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const button = (props: ToggleButtonProps = {}) =>
  render(
    <ToggleButton id="toggle" {...props}>
      Calendar
    </ToggleButton>,
  );
const pressed = (value: boolean) => cy.get('#toggle').should('have.attr', 'aria-pressed', String(value));

describe('ToggleButton documented stories', () => {
  it('toggles the default story repeatedly', () => {
    render(<Default id="toggle" />);
    pressed(false);
    cy.get('#toggle').realClick();
    pressed(true);
    cy.get('#toggle').realClick();
    pressed(false);
  });

  describe('ToggleButton native activation and state boundaries', () => {
    for (const key of ['Enter', 'Space'] as const) {
      it(`toggles once per native ${key} activation and preserves focus`, () => {
        const click = cy.spy().as('click');
        button({ onClick: click });
        cy.get('#toggle').focus();
        cy.realPress(key);
        pressed(true);
        cy.get('#toggle').should('have.focus');
        cy.get('@click').should('have.been.calledOnce');
        cy.realPress(key);
        pressed(false);
        cy.get('@click').should('have.been.calledTwice');
      });
    }

    describe('ToggleButton source and conformance contracts', () => {
      for (const role of ['checkbox', 'menuitemcheckbox'] as const) {
        for (const initial of [false, true]) {
          it(`toggles ${role} from ${initial} through aria-checked without aria-pressed`, () => {
            button({ role, defaultChecked: initial });
            cy.get('#toggle').should('not.have.attr', 'aria-pressed');
            cy.get('#toggle').should('have.attr', 'aria-checked', String(initial));
            cy.get('#toggle').realClick().should('have.attr', 'aria-checked', String(!initial));
            cy.get('#toggle').focus();
            cy.realPress('Space');
            cy.get('#toggle').should('have.attr', 'aria-checked', String(initial));
          });
        }
      }

      it('updates role-specific state attributes on the same root', () => {
        const Owner = () => {
          const [role, setRole] = React.useState<'button' | 'checkbox'>('button');
          return (
            <>
              <ToggleButton id="toggle" role={role}>
                Calendar
              </ToggleButton>
              <button id="role" onClick={() => setRole(value => (value === 'button' ? 'checkbox' : 'button'))}>
                Role
              </button>
            </>
          );
        };
        render(<Owner />);
        cy.get('#toggle').then($original => {
          cy.get('#toggle').realClick();
          cy.get('#role').realClick();
          cy.get('#toggle').should('have.attr', 'aria-checked', 'true');
          cy.get('#toggle').should('not.have.attr', 'aria-pressed');
          cy.get('#toggle').should($current => expect($current[0]).to.equal($original[0]));
          cy.get('#role').realClick();
          pressed(true);
          cy.get('#toggle').should('not.have.attr', 'aria-checked');
        });
      });

      it('lets a link click handler cancel native Enter navigation and toggling', () => {
        const click = cy.spy().as('click');
        button({
          as: 'a',
          href: '#calendar',
          onClick: ev => {
            click(ev.currentTarget.tagName);
            ev.preventDefault();
          },
        });
        cy.get('#toggle').should('have.prop', 'tagName', 'A').and('have.attr', 'href', '#calendar').focus();
        cy.realPress('Enter');
        pressed(false);
        cy.get('@click').should('have.been.calledOnce').its('firstCall.args.0').should('equal', 'A');
      });

      it('activates an anchor without href as a keyboard button', () => {
        button({ as: 'a' });
        cy.get('#toggle').should('have.attr', 'role', 'button').focus();
        cy.realPress('Enter');
        pressed(true);
        cy.realPress('Space');
        pressed(false);
      });

      for (const props of [{ disabled: true }, { disabledFocusable: true }]) {
        it(`blocks anchor activation with ${JSON.stringify(props)} and removes href`, () => {
          const click = cy.spy().as('click');
          button({ as: 'a', href: '#calendar', ...props, onClick: click });
          cy.get('#toggle').should('have.attr', 'aria-disabled', 'true').realClick();
          pressed(false);
          cy.get('@click').should('not.have.been.called');
          cy.get('#toggle').should('not.have.attr', 'href');
        });
      }

      it('defaults to non-submitting button type and permits an explicit submit', () => {
        const submit = cy.spy().as('submit');
        render(
          <form
            onSubmit={ev => {
              ev.preventDefault();
              submit();
            }}
          >
            <ToggleButton id="toggle" name="calendar" value="weekly">
              Calendar
            </ToggleButton>
            <ToggleButton id="submit" type="submit">
              Submit
            </ToggleButton>
          </form>,
        );
        cy.get('#toggle')
          .should('have.attr', 'type', 'button')
          .and('have.attr', 'name', 'calendar')
          .and('have.attr', 'value', 'weekly')
          .realClick();
        pressed(true);
        cy.get('@submit').should('not.have.been.called');
        cy.get('#submit').realClick();
        cy.get('@submit').should('have.been.calledOnce');
      });

      it('forwards root and icon class names, native title, slot metadata and icon clicks', () => {
        const iconClick = cy.spy().as('icon');
        const rootClick = cy.spy().as('root');
        button({
          className: 'custom-root',
          title: 'Schedule',
          icon: { children: '●', id: 'icon', className: 'custom-icon', title: 'Calendar icon', onClick: iconClick },
          onClick: rootClick,
        });
        cy.get('#toggle')
          .should('have.class', 'fui-ToggleButton')
          .and('have.class', 'custom-root')
          .and('have.attr', 'title', 'Schedule');
        cy.get('#icon')
          .should('have.class', 'fui-ToggleButton__icon')
          .and('have.class', 'custom-icon')
          .and('have.attr', 'title', 'Calendar icon')
          .realClick();
        pressed(true);
        cy.get('@icon').should('have.been.calledOnce');
        cy.get('@root').should('have.been.calledOnce');
      });

      it('keeps object refs attached to the real root and clears them after committed unmount', () => {
        const ref = React.createRef<HTMLButtonElement>();
        const Owner = () => {
          const [show, setShow] = React.useState(true);
          return (
            <>
              {show && (
                <ToggleButton id="toggle" ref={ref}>
                  Calendar
                </ToggleButton>
              )}
              <button id="remove" onClick={() => setShow(false)}>
                Remove
              </button>
            </>
          );
        };
        render(<Owner />);
        cy.get('#toggle').should($node => expect(ref.current).to.equal($node[0]));
        cy.get('#remove').realClick();
        cy.get('#toggle')
          .should('not.exist')
          .then(() => expect(ref.current).to.equal(null));
      });

      it('forwards callback refs for anchor roots and detaches after unmount', () => {
        const ref = cy.spy().as('ref');
        const Owner = () => {
          const [show, setShow] = React.useState(true);
          return (
            <>
              {show && (
                <ToggleButton id="toggle" as="a" ref={ref}>
                  Calendar
                </ToggleButton>
              )}
              <button id="remove" onClick={() => setShow(false)}>
                Remove
              </button>
            </>
          );
        };
        render(<Owner />);
        cy.get('#toggle').then($node => cy.get('@ref').its('lastCall.args.0').should('equal', $node[0]));
        cy.get('#remove').realClick();
        cy.get('#toggle').should('not.exist');
        cy.get('@ref').its('lastCall.args.0').should('be.null');
      });

      it('replaces consumer handlers on owner updates without resetting uncontrolled state', () => {
        const first = cy.spy().as('first');
        const second = cy.spy().as('second');
        const Owner = () => {
          const [updated, setUpdated] = React.useState(false);
          return (
            <>
              <ToggleButton id="toggle" onClick={updated ? second : first}>
                Calendar
              </ToggleButton>
              <button id="update" onClick={() => setUpdated(true)}>
                Update
              </button>
            </>
          );
        };
        render(<Owner />);
        cy.get('#toggle').realClick();
        pressed(true);
        cy.get('#update').realClick();
        cy.get('#toggle').realClick();
        pressed(false);
        cy.get('@first').should('have.been.calledOnce');
        cy.get('@second').should('have.been.calledOnce');
      });

      it('supports live disabled-focusable changes and resumes native keyboard toggling', () => {
        const Owner = () => {
          const [disabled, setDisabled] = React.useState(false);
          return (
            <>
              <ToggleButton id="toggle" disabledFocusable={disabled}>
                Calendar
              </ToggleButton>
              <button id="disable" onClick={() => setDisabled(value => !value)}>
                Disable
              </button>
            </>
          );
        };
        render(<Owner />);
        cy.get('#toggle').realClick();
        pressed(true);
        cy.get('#disable').realClick();
        cy.get('#toggle').should('have.attr', 'aria-disabled', 'true').focus();
        cy.realPress('Space');
        pressed(true);
        cy.get('#disable').realClick();
        cy.get('#toggle').should('not.have.attr', 'aria-disabled');
        cy.get('#toggle').focus();
        cy.realPress('Space');
        pressed(false);
      });

      it('inherits live context size while explicit size overrides it', () => {
        const Owner = () => {
          const [size, setSize] = React.useState<'small' | 'large'>('small');
          return (
            <ButtonContextProvider value={{ size }}>
              <ToggleButton id="toggle">Calendar</ToggleButton>
              <ToggleButton id="explicit" size="small">
                Explicit
              </ToggleButton>
              <button id="size" onClick={() => setSize('large')}>
                Size
              </button>
            </ButtonContextProvider>
          );
        };
        render(<Owner />);
        cy.get('#toggle').then($node => {
          const initial = $node[0].getBoundingClientRect().height;
          cy.get('#size').realClick();
          cy.get('#toggle').should($updated =>
            expect($updated[0].getBoundingClientRect().height).to.be.greaterThan(initial),
          );
          cy.get('#explicit').should($explicit =>
            expect($explicit[0].getBoundingClientRect().height).to.equal(initial),
          );
        });
      });

      it('updates provider theme without losing selected state or root identity', () => {
        const Owner = () => {
          const [dark, setDark] = React.useState(false);
          return (
            <FluentProvider theme={dark ? webDarkTheme : webLightTheme}>
              <ToggleButton id="toggle">Calendar</ToggleButton>
              <button id="theme" onClick={() => setDark(true)}>
                Theme
              </button>
            </FluentProvider>
          );
        };
        mount(<Owner />);
        cy.get('#toggle').realClick();
        cy.get('body').realHover({ position: 'topLeft' });
        cy.get('#toggle').should(
          'have.css',
          'background-color',
          cssColor(webLightTheme.colorNeutralBackground1Selected),
        );
        cy.get('#toggle').then($node => {
          cy.get('#theme').realClick();
          pressed(true);
          cy.get('#toggle').should($updated => {
            expect($updated[0]).to.equal($node[0]);
            expect(getComputedStyle($updated[0]).backgroundColor).to.equal(
              cssColor(webDarkTheme.colorNeutralBackground1Selected),
            );
          });
        });
      });
    });

    it('ignores unrelated keys with enabled pointer activation as a positive control', () => {
      const click = cy.spy().as('click');
      button({ onClick: click });
      cy.get('#toggle').focus();
      for (const key of ['Escape', 'ArrowLeft', 'ArrowRight', 'a'] as const) {
        cy.realPress(key);
      }
      pressed(false);
      cy.get('@click').should('not.have.been.called');
      cy.get('#toggle').realClick();
      pressed(true);
      cy.get('@click').should('have.been.calledOnce');
    });

    for (const props of [{ disabled: true }, { disabledFocusable: true }]) {
      for (const initial of [false, true]) {
        it(`blocks pointer activation with ${JSON.stringify(props)} and initial checked ${initial}`, () => {
          const click = cy.spy().as('click');
          render(
            <>
              <ToggleButton id="toggle" defaultChecked={initial} {...props} onClick={click}>
                Disabled calendar
              </ToggleButton>
              <ToggleButton id="enabled" onClick={click}>
                Enabled calendar
              </ToggleButton>
            </>,
          );
          cy.get('#toggle').realClick();
          pressed(initial);
          cy.get('@click').should('not.have.been.called');
          cy.get('#enabled').realClick().should('have.attr', 'aria-pressed', 'true');
          cy.get('@click').should('have.been.calledOnce');
        });
      }
    }

    for (const key of ['Enter', 'Space'] as const) {
      it(`blocks native ${key} on a disabled-focusable button while enabled activation works`, () => {
        const click = cy.spy().as('click');
        render(
          <>
            <ToggleButton id="toggle" disabledFocusable onClick={click}>
              Disabled calendar
            </ToggleButton>
            <ToggleButton id="enabled" onClick={click}>
              Enabled calendar
            </ToggleButton>
          </>,
        );
        cy.get('#toggle').focus();
        cy.realPress(key);
        pressed(false);
        cy.get('@click').should('not.have.been.called');
        cy.get('#enabled').focus();
        cy.realPress(key);
        cy.get('#enabled').should('have.attr', 'aria-pressed', 'true');
        cy.get('@click').should('have.been.calledOnce');
      });
    }

    it('honors preventDefault in the consumer click handler before changing state', () => {
      const click = cy.spy().as('click');
      button({
        onClick: (ev: React.MouseEvent<HTMLButtonElement>) => {
          click(ev.currentTarget.getAttribute('aria-pressed'));
          ev.preventDefault();
        },
      });
      cy.get('#toggle').realClick();
      pressed(false);
      cy.get('#toggle').focus();
      cy.realPress('Space');
      pressed(false);
      cy.get('@click').should('have.been.calledTwice').its('firstCall.args.0').should('equal', 'false');
    });

    it('reports pre-toggle state and composes bubbling handlers without duplicate clicks', () => {
      const click = cy.spy().as('click');
      const bubble = cy.spy().as('bubble');
      render(
        <div onClick={bubble}>
          <ToggleButton
            id="toggle"
            onClick={ev => click(ev.currentTarget.id, ev.currentTarget.getAttribute('aria-pressed'))}
          >
            <span id="child">Calendar</span>
          </ToggleButton>
        </div>,
      );
      cy.get('#child').realClick();
      pressed(true);
      cy.get('@click').should('have.been.calledOnce').its('firstCall.args').should('deep.equal', ['toggle', 'false']);
      cy.get('@bubble').should('have.been.calledOnce');
    });

    for (const initial of [false, true]) {
      it(`keeps controlled ${initial} authoritative over opposite defaultChecked`, () => {
        const click = cy.spy().as('click');
        button({ checked: initial, defaultChecked: !initial, onClick: click });
        cy.get('#toggle').realClick();
        pressed(initial);
        cy.get('@click').should('have.been.calledOnce');
      });
    }

    it('lets an owner accept clicks, reject clicks, and change controlled state externally', () => {
      const Owner = () => {
        const [checked, setChecked] = React.useState(false);
        const [accept, setAccept] = React.useState(true);
        return (
          <>
            <ToggleButton id="toggle" checked={checked} onClick={() => accept && setChecked(value => !value)}>
              Calendar
            </ToggleButton>
            <button id="reject" onClick={() => setAccept(false)}>
              Reject
            </button>
            <button id="external" onClick={() => setChecked(value => !value)}>
              External
            </button>
          </>
        );
      };
      render(<Owner />);
      cy.get('#toggle').realClick();
      pressed(true);
      cy.get('#reject').realClick();
      cy.get('#toggle').realClick();
      pressed(true);
      cy.get('#external').realClick();
      pressed(false);
    });

    it('uses defaultChecked only at initialization through later owner renders', () => {
      const Owner = () => {
        const [defaultChecked, setDefault] = React.useState(false);
        return (
          <>
            <ToggleButton id="toggle" defaultChecked={defaultChecked}>
              Calendar
            </ToggleButton>
            <button id="default" onClick={() => setDefault(value => !value)}>
              Change default
            </button>
          </>
        );
      };
      render(<Owner />);
      cy.get('#default').realClick();
      pressed(false);
      cy.get('#toggle').realClick();
      pressed(true);
      cy.get('#default').realClick();
      pressed(true);
    });

    for (const dir of ['ltr', 'rtl'] as const) {
      it(`keeps pointer and keyboard activation independent of ${dir} layout`, () => {
        render(
          <ToggleButton id="toggle" icon={<span>●</span>} iconPosition="after">
            Calendar
          </ToggleButton>,
          dir,
        );
        cy.get('#toggle').should('have.css', 'direction', dir).realClick();
        pressed(true);
        cy.get('#toggle').focus();
        cy.realPress('Space');
        pressed(false);
      });
    }

    it('passes ordinary axe rules for a labeled accessible selected button', () => {
      button({ defaultChecked: true, isAccessible: true });
      cy.get('#toggle').then($node =>
        axe
          .run($node[0])
          .then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
      );
    });
  });

  it('keeps both explicitly controlled story states unchanged on activation', () => {
    render(<Checked />);
    cy.contains('button', 'Controlled checked state').realClick().should('have.attr', 'aria-pressed', 'true');
    cy.contains('button', 'Controlled unchecked state').realClick().should('have.attr', 'aria-pressed', 'false');
  });

  it('retains disabled-focusable tab order while skipping native disabled buttons', () => {
    render(
      <>
        <button id="before">Before</button>
        <Disabled />
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.contains('button', /^Enabled state$/)
      .first()
      .should('have.focus');
    cy.realPress('Tab');
    cy.contains('button', /^Disabled focusable state$/)
      .first()
      .should('have.focus')
      .and('have.attr', 'aria-disabled', 'true');
    cy.realPress('Enter');
    cy.contains('button', /^Disabled focusable state$/)
      .first()
      .should('have.attr', 'aria-pressed', 'false');
    cy.realPress('Tab');
    cy.get('button').eq(4).should('have.focus').and('have.text', 'Enabled state');
  });

  it('activates all documented appearances independently', () => {
    render(<Appearance />);
    for (const name of ['Default', 'Primary', 'Outline', 'Subtle', 'Transparent']) {
      cy.contains('button', name)
        .should('have.attr', 'aria-pressed', 'false')
        .realClick()
        .should('have.attr', 'aria-pressed', 'true');
    }
  });

  it('uses the accessible selected style for every documented appearance', () => {
    render(<AccessibleAppearance />);
    for (const name of ['Default', 'Outline', 'Subtle', 'Transparent']) {
      cy.contains('button', name).then($node => {
        cy.wrap($node).realClick().should('have.attr', 'aria-pressed', 'true').realHover({ position: 'bottomRight' });
        cy.get('body').realHover({ position: 'topLeft' });
        cy.wrap($node).should($selected => {
          const style = getComputedStyle($selected[0]);
          expect(style.backgroundColor).to.equal(cssColor(webLightTheme.colorBrandBackground));
          expect(style.color).to.equal(cssColor(webLightTheme.colorNeutralForegroundOnBrand));
        });
      });
    }
    cy.contains('button', 'Primary')
      .realClick()
      .should('have.attr', 'aria-pressed', 'true')
      .should($primary => {
        const style = getComputedStyle($primary[0]);
        expect(style.outlineStyle).to.equal('solid');
        expect(parseFloat(style.outlineOffset)).to.be.lessThan(0);
      });
  });

  it('renders rounded, circular and square actual border geometry', () => {
    render(<Shape />);
    cy.contains('button', 'Square').should('have.css', 'border-top-left-radius', '0px');
    cy.contains('button', 'Rounded').then($rounded => {
      const rounded = parseFloat(getComputedStyle($rounded[0]).borderTopLeftRadius);
      expect(rounded).to.be.greaterThan(0);
      cy.contains('button', 'Circular').should($circular => {
        expect(parseFloat(getComputedStyle($circular[0]).borderTopLeftRadius)).to.be.greaterThan(rounded);
      });
    });
  });

  it('renders increasing small, medium and large heights', () => {
    render(<Size />);
    cy.contains('button', 'Size: small').then($small => {
      cy.contains('button', 'Size: medium').then($medium => {
        cy.contains('button', 'Size: large').should($large => {
          expect($small[0].getBoundingClientRect().height).to.be.lessThan($medium[0].getBoundingClientRect().height);
          expect($medium[0].getBoundingClientRect().height).to.be.lessThan($large[0].getBoundingClientRect().height);
        });
      });
    });
  });

  it('positions icons before and after text and labels the icon-only story', () => {
    render(<Icon />);
    cy.contains('button', 'before contents').should($button => {
      expect($button[0].firstElementChild).to.have.class('fui-ToggleButton__icon');
    });
    cy.contains('button', 'after contents').should($button => {
      expect($button[0].lastElementChild).to.have.class('fui-ToggleButton__icon');
    });
    cy.get('button')
      .last()
      .should($button => {
        expect(computeAccessibleName($button[0])).to.equal('With calendar icon only');
      })
      .realClick()
      .should('have.attr', 'aria-pressed', 'true');
  });

  it('wraps long text within its documented width without clipping', () => {
    render(<WithLongText />);
    cy.contains('button', 'Short text').then($short => {
      cy.contains('button', 'Long text').should($long => {
        const node = $long[0];
        expect(node.getBoundingClientRect().width).to.be.closeTo(280, 1);
        expect(node.getBoundingClientRect().height).to.be.greaterThan($short[0].getBoundingClientRect().height);
        expect(node.scrollWidth).to.be.at.most(node.clientWidth);
      });
    });
  });

  it('switches the visible bundled icon across checked and unchecked states', () => {
    button({ icon: <CalendarIcon /> });
    cy.get(`#toggle .${iconRegularClassName}`).should('be.visible');
    cy.get(`#toggle .${iconFilledClassName}`).should('not.be.visible');
    cy.get('#toggle').realClick();
    cy.get(`#toggle .${iconRegularClassName}`).should('not.be.visible');
    cy.get(`#toggle .${iconFilledClassName}`).should('be.visible');
    cy.get('#toggle').realClick();
    cy.get(`#toggle .${iconRegularClassName}`).should('be.visible');
    cy.get(`#toggle .${iconFilledClassName}`).should('not.be.visible');
  });

  it('distinguishes selected rest, native hover and held pointer press', () => {
    button({ defaultChecked: true });
    cy.get('body').realHover({ position: 'topLeft' });
    cy.get('#toggle').should('have.css', 'background-color', cssColor(webLightTheme.colorNeutralBackground1Selected));
    cy.get('#toggle').realHover();
    cy.get('#toggle').should('have.css', 'background-color', cssColor(webLightTheme.colorNeutralBackground1Hover));
    cy.get('#toggle').realMouseDown();
    cy.get('#toggle').should($held => {
      expect(getComputedStyle($held[0]).backgroundColor).to.equal(
        cssColor(webLightTheme.colorNeutralBackground1Pressed),
      );
      expect($held.attr('aria-pressed')).to.equal('true');
    });
    cy.get('#toggle').realMouseUp();
    pressed(false);
  });

  it('keeps disabled checked styles stable under real hover and held pointer press', () => {
    button({ defaultChecked: true, disabledFocusable: true, isAccessible: true });
    cy.get('body').realHover({ position: 'topLeft' });
    const background = cssColor(webLightTheme.colorNeutralBackgroundDisabled);
    cy.get('#toggle').should('have.css', 'background-color', background);
    cy.get('#toggle').realHover().should('have.css', 'background-color', background);
    cy.get('#toggle').realMouseDown().should('have.css', 'background-color', background);
    cy.get('#toggle').realMouseUp();
    pressed(true);
  });

  it('adds and removes icon slots on the same root without resetting its state', () => {
    const Owner = () => {
      const [icon, setIcon] = React.useState(false);
      return (
        <>
          <ToggleButton id="toggle" icon={icon ? { children: <CalendarIcon />, id: 'live-icon' } : undefined}>
            Calendar
          </ToggleButton>
          <button id="icon-update" onClick={() => setIcon(value => !value)}>
            Icon
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#toggle')
      .realClick()
      .then($original => {
        cy.get('#live-icon').should('not.exist');
        cy.get('#icon-update').realClick();
        cy.get('#live-icon').should('be.visible');
        cy.get('#toggle').should($current => expect($current[0]).to.equal($original[0]));
        pressed(true);
        cy.get('#icon-update').realClick();
        cy.get('#live-icon').should('not.exist');
        pressed(true);
      });
  });

  it('gives icon-only buttons an explicit accessible name and a minimum target', () => {
    render(<ToggleButton id="toggle" aria-label="Calendar" icon={<CalendarIcon />} isAccessible />);
    cy.get('#toggle')
      .should($node => {
        expect(computeAccessibleName($node[0])).to.equal('Calendar');
        expect($node[0].getBoundingClientRect().width).to.be.at.least(24);
        expect($node[0].getBoundingClientRect().height).to.be.at.least(24);
      })
      .realClick();
    pressed(true);
    cy.get('#toggle').then($node =>
      axe.run($node[0]).then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
    );
  });
});
