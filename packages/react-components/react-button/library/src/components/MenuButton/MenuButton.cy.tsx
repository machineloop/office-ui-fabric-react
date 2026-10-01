import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme, tokens } from '@fluentui/react-theme';
import { getByRole } from '@testing-library/dom';
import { bundleIcon, CalendarMonthFilled, CalendarMonthRegular, ChevronDownRegular } from '@fluentui/react-icons';
import { MenuButton } from './MenuButton';
import type { MenuButtonProps } from './MenuButton.types';
import { Tooltip } from '@fluentui/react-tooltip';
import { Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from '@fluentui/react-menu';
import { ButtonContextProvider } from '../../contexts/ButtonContext';
import { useMenuButtonBase_unstable } from './useMenuButton';
import { renderMenuButton_unstable } from './renderMenuButton';
import type { MenuButtonBaseProps } from './MenuButton.types';

const Calendar = bundleIcon(CalendarMonthFilled, CalendarMonthRegular);
type MenuButtonKeyboardEvent = React.KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>;
type MenuButtonMouseEvent = React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>;
const glyph = (
  <svg data-testid="glyph" aria-hidden="true" focusable="false" width="1em" height="1em">
    <rect width="100%" height="100%" fill="currentColor" />
  </svg>
);
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const button = () => cy.get('[data-testid="button"]');
const menuIcon = () => button().find('.fui-MenuButton__menuIcon');
beforeEach(() => {
  cy.get('body').realHover({ position: 'bottomRight' });
});
const name = (label: string, role: 'button' | 'link' = 'button') =>
  cy.get('[data-cy-root]').should(root => {
    expect(getByRole(root[0], role, { name: label })).to.equal(root[0].querySelector('[data-testid="button"]'));
  });

describe('MenuButton native and accessibility edges', () => {
  const roots: Array<[string, MenuButtonProps, 'button' | 'link']> = [
    ['native button', {}, 'button'],
    ['anchor button', { as: 'a' }, 'button'],
    ['anchor link', { as: 'a', href: '#menu-button-destination' }, 'link'],
  ];

  roots.forEach(([root, props, role]) => {
    it(`activates ${root} exactly once per pointer, Enter and Space with native event ordering`, () => {
      const events: string[] = [];
      const clicked = cy.spy().as('click');
      mount(
        <MenuButton
          data-testid="button"
          {...props}
          onKeyDown={(event: MenuButtonKeyboardEvent) => events.push(`down:${event.key}`)}
          onKeyUp={(event: MenuButtonKeyboardEvent) => events.push(`up:${event.key}`)}
          onClick={(event: MenuButtonMouseEvent) => {
            event.preventDefault();
            events.push('click');
            clicked(event.type, event.currentTarget);
          }}
        >
          Actions
        </MenuButton>,
      );
      name('Actions', role);
      button().realClick();
      cy.get('@click').should('have.been.calledOnce');
      cy.then(() => {
        events.length = 0;
      });
      button().focus().realPress('Enter');
      cy.get('@click').should('have.been.calledTwice');
      cy.then(() => expect(events).to.deep.equal(['down:Enter', 'click', 'up:Enter']));
      button().realPress('Space');
      cy.get('@click').should('have.been.calledThrice');
      cy.then(() => expect(events).to.deep.equal(['down:Enter', 'click', 'up:Enter', 'down: ', 'up: ', 'click']));
      button().then(element => {
        cy.get('@click').its('lastCall.args').should('deep.equal', ['click', element[0]]);
      });
      button().realPress('ArrowDown').realPress('Escape').realPress('A');
      cy.get('@click').should('have.been.calledThrice');
      cy.get('[role="menu"]').should('not.exist');
    });

    it(`respects keydown/keyup prevention on ${root} and uses the latest replacement handlers`, () => {
      const first = cy.spy().as('first');
      const latest = cy.spy().as('latest');
      const Example = () => {
        const [phase, setPhase] = React.useState(0);
        return (
          <>
            <MenuButton
              {...props}
              data-testid="button"
              onKeyDown={(event: MenuButtonKeyboardEvent) => {
                if (phase === 0) {
                  event.preventDefault();
                }
              }}
              onKeyUp={(event: MenuButtonKeyboardEvent) => {
                if (phase === 1) {
                  event.preventDefault();
                }
              }}
              onClick={(event: MenuButtonMouseEvent) => {
                event.preventDefault();
                (phase < 2 ? first : latest)();
              }}
            >
              Actions
            </MenuButton>
            <button onClick={() => setPhase(value => value + 1)}>Next phase</button>
          </>
        );
      };
      mount(<Example />);
      button().focus().realPress('Enter');
      cy.get('@first').should('not.have.been.called');
      button().realClick();
      cy.get('@first').should('have.been.calledOnce');
      cy.contains('button', 'Next phase').click();
      button().focus().realPress('Space');
      cy.get('@first').should('have.been.calledOnce');
      cy.contains('button', 'Next phase').click();
      button().focus().realPress('Enter').realPress('Space');
      cy.get('@latest').should('have.been.calledTwice');
      cy.get('@first').should('have.been.calledOnce');
    });

    const disabledStates: Array<
      [string, Pick<MenuButtonProps, 'disabled' | 'disabledFocusable' | 'aria-disabled'>, boolean]
    > = [
      ['disabled', { disabled: true }, false],
      ['disabledFocusable', { disabledFocusable: true }, true],
      ['both flags', { disabled: true, disabledFocusable: true }, true],
      ['aria-disabled boolean', { 'aria-disabled': true }, true],
      ['aria-disabled string', { 'aria-disabled': 'true' }, true],
    ];
    disabledStates.forEach(([state, disabledProps, focusable]) => {
      it(`blocks ${state} ${root} activation and restores keyboard and pointer actions when enabled`, () => {
        const clicked = cy.spy().as('click');
        const bubbled = cy.spy().as('bubbled');
        const Example = () => {
          const [enabled, setEnabled] = React.useState(false);
          return (
            <>
              <button>Before</button>
              <div onClick={bubbled}>
                <MenuButton
                  {...props}
                  {...(enabled ? {} : disabledProps)}
                  data-testid="button"
                  onClick={(event: MenuButtonMouseEvent) => {
                    event.preventDefault();
                    clicked();
                  }}
                >
                  Actions
                </MenuButton>
              </div>
              <button>After</button>
              <button onClick={() => setEnabled(true)}>Enable</button>
            </>
          );
        };
        mount(<Example />);
        name('Actions', role);
        button().should('have.attr', root === 'native button' && state === 'disabled' ? 'disabled' : 'aria-disabled');
        if (root === 'anchor link') {
          button().should('not.have.attr', 'href');
          button().should('have.attr', 'role', 'link');
        }
        cy.contains('button', 'Before').focus().realPress('Tab');
        if (focusable && !(root === 'anchor link' && state.startsWith('aria-disabled'))) {
          button().should('be.focused').realPress('Enter').realPress('Space');
        } else {
          cy.contains('button', 'After').should('be.focused');
          button().then(element => element[0].focus());
          button().should('not.be.focused');
        }
        button().realClick();
        cy.get('@click').should('not.have.been.called');
        cy.get('@bubbled').should('not.have.been.called');
        cy.contains('button', 'Enable').click();
        button().should('not.be.disabled');
        cy.contains('button', 'Before').focus().realPress('Tab');
        button().should('be.focused').realPress('Enter').realPress('Space');
        button().realClick();
        cy.get('@click').should('have.been.calledThrice');
        cy.get('@bubbled').should('have.been.calledThrice');
        if (root === 'anchor link') {
          button().should('have.attr', 'href', '#menu-button-destination');
        }
      });
    });

    it(`forwards ${root} ref, native attributes, focus/blur and explicit tabIndex changes`, () => {
      const ref = React.createRef<HTMLButtonElement & HTMLAnchorElement>();
      const focus = cy.spy().as('focus');
      const blur = cy.spy().as('blur');
      const Example = () => {
        const [excluded, setExcluded] = React.useState(true);
        return (
          <>
            <button>Before</button>
            <MenuButton
              {...props}
              ref={ref}
              data-testid="button"
              id="consumer-id"
              title="Actions"
              aria-describedby="menu-button-description"
              tabIndex={excluded ? -1 : 0}
              onFocus={focus}
              onBlur={blur}
            >
              Actions
            </MenuButton>
            <span id="menu-button-description">Available actions</span>
            <button>After</button>
            <button onClick={() => setExcluded(false)}>Include</button>
          </>
        );
      };
      mount(<Example />);
      button().then(element => expect(ref.current).to.equal(element[0]));
      button().should('have.attr', 'id', 'consumer-id').and('have.attr', 'title', 'Actions');
      cy.contains('button', 'Before').focus().realPress('Tab');
      cy.contains('button', 'After').should('be.focused');
      button().focus().should('be.focused');
      cy.get('@focus').should('have.been.calledOnce');
      cy.contains('button', 'After').focus();
      cy.get('@blur').should('have.been.calledOnce');
      cy.contains('button', 'Include').click();
      cy.contains('button', 'Before').focus().realPress('Tab');
      button().should('be.focused');
      cy.get('@focus').should('have.been.calledTwice');
      cy.contains('button', 'After').focus().realPress(['Shift', 'Tab']);
      button().should('be.focused');
      cy.get('@focus').should('have.been.calledThrice');
      cy.get('[data-cy-root]').should(element => {
        expect(getByRole(element[0], role, { name: 'Actions', description: 'Available actions' })).to.equal(
          ref.current,
        );
      });
    });
  });

  const formDisabledStates: Pick<MenuButtonProps, 'disabled' | 'disabledFocusable'>[] = [
    {},
    { disabled: true },
    { disabledFocusable: true },
  ];
  (['button', 'submit', 'reset'] as const).forEach(type => {
    formDisabledStates.forEach((disabledProps, index) => {
      it(`preserves native ${type} form defaults with disabled mode ${index} and enabled positive control`, () => {
        const submit = cy.spy().as('submit');
        const reset = cy.spy().as('reset');
        const clicked = cy.spy().as('click');
        const Example = () => {
          const [enabled, setEnabled] = React.useState(index === 0);
          return (
            <>
              <form
                id="action-form"
                onSubmit={event => {
                  event.preventDefault();
                  submit(event.nativeEvent.type);
                }}
                onReset={reset}
              >
                <input data-testid="field" name="field" defaultValue="initial" />
              </form>
              <MenuButton
                data-testid="button"
                form="action-form"
                type={type}
                name="operation"
                value="actions"
                {...(enabled ? {} : disabledProps)}
                onClick={clicked}
              >
                Actions
              </MenuButton>
              <button onClick={() => setEnabled(true)}>Enable</button>
            </>
          );
        };
        mount(<Example />);
        button().should('have.attr', 'form', 'action-form').and('have.attr', 'name', 'operation');
        button().should('have.attr', 'value', 'actions').and('have.attr', 'type', type);
        cy.get('[data-testid="field"]').clear().type('edited');
        if (index !== 0) {
          button().realClick();
          if (index === 2) {
            button().focus().realPress('Enter').realPress('Space');
          }
          cy.get('@click').should('not.have.been.called');
          cy.get('@submit').should('not.have.been.called');
          cy.get('@reset').should('not.have.been.called');
          cy.get('[data-testid="field"]').should('have.value', 'edited');
          cy.contains('button', 'Enable').click();
        }
        button().realClick();
        button().focus().realPress('Enter').realPress('Space');
        cy.get('@click').should('have.been.calledThrice');
        cy.get('@submit').should('have.callCount', type === 'submit' ? 3 : 0);
        cy.get('@reset').should('have.callCount', type === 'reset' ? 3 : 0);
        cy.get('[data-testid="field"]').should('have.value', type === 'reset' ? 'initial' : 'edited');
      });
    });
  });

  it('allows native fragment navigation, cancels it when requested and never navigates while disabledFocusable', () => {
    const clicked = cy.spy().as('click');
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <MenuButton
            as="a"
            href="#menu-button-native-target"
            data-testid="button"
            disabledFocusable={phase === 2}
            onClick={event => {
              clicked();
              if (phase === 1) {
                event.preventDefault();
              }
            }}
          >
            Actions
          </MenuButton>
          <button onClick={() => setPhase(value => value + 1)}>Next phase</button>
          <span id="menu-button-native-target">Destination</span>
        </>
      );
    };
    mount(<Example />);
    button().then(element => {
      element[0].ownerDocument.defaultView!.history.replaceState(null, '', '#menu-button-origin');
    });
    button().realClick();
    cy.get('@click').should('have.been.calledOnce');
    button().should(element =>
      expect(element[0].ownerDocument.defaultView!.location.hash).to.equal('#menu-button-native-target'),
    );
    cy.contains('button', 'Next phase').click();
    button().then(element => {
      element[0].ownerDocument.defaultView!.history.replaceState(null, '', '#menu-button-origin');
    });
    button().realClick();
    cy.get('@click').should('have.been.calledTwice');
    button().should(element =>
      expect(element[0].ownerDocument.defaultView!.location.hash).to.equal('#menu-button-origin'),
    );
    cy.contains('button', 'Next phase').click();
    button().focus().realPress('Enter').realPress('Space');
    button().realClick();
    cy.get('@click').should('have.been.calledTwice');
    button().should(element =>
      expect(element[0].ownerDocument.defaultView!.location.hash).to.equal('#menu-button-origin'),
    );
  });

  it('uses aria-labelledby over aria-label, exposes description and preserves authored popup semantics', () => {
    mount(
      <>
        <span id="action-name">Labelled actions</span>
        <span id="action-description">Choose an operation</span>
        <MenuButton
          data-testid="button"
          aria-label="Fallback actions"
          aria-labelledby="action-name"
          aria-describedby="action-description"
          aria-haspopup="dialog"
          aria-controls="author-popup"
          menuIcon={{ children: 'Decorative text', 'aria-hidden': true }}
        >
          Visible text
        </MenuButton>
        <div id="author-popup" role="dialog" aria-label="Operations" />
      </>,
    );
    name('Labelled actions');
    button().should('have.attr', 'aria-haspopup', 'dialog').and('have.attr', 'aria-controls', 'author-popup');
    cy.get('[data-cy-root]').should(root => {
      expect(getByRole(root[0], 'button', { name: 'Labelled actions', description: 'Choose an operation' })).to.equal(
        root[0].querySelector('[data-testid="button"]'),
      );
    });
  });

  it('accepts Tooltip labels on icon-only controls without rendering a second icon', () => {
    mount(
      <Tooltip relationship="label" content="Calendar actions">
        <MenuButton data-testid="button" icon={glyph} />
      </Tooltip>,
    );
    name('Calendar actions');
    menuIcon().should('not.exist');
    button().focus().should('be.focused');
    name('Calendar actions');
  });

  ([true, false, 'true', 'false', undefined] as const).forEach(expanded => {
    it(`normalizes standalone aria-expanded=${String(
      expanded,
    )} (${typeof expanded}) without manufacturing popup relationships`, () => {
      mount(
        <MenuButton data-testid="button" aria-expanded={expanded}>
          Actions
        </MenuButton>,
      );
      button().should('have.attr', 'aria-expanded', expanded === true || expanded === 'true' ? 'true' : 'false');
      button().should('not.have.attr', 'aria-haspopup');
      button().should('not.have.attr', 'aria-controls');
      name('Actions');
    });
  });
});
const assertColor = (property: 'color' | 'backgroundColor', value: string, selector?: string) =>
  (selector ? button().find(selector) : button()).should(element => {
    const doc = element[0].ownerDocument;
    const probe = doc.createElement('span');
    probe.style[property] = value;
    element[0].appendChild(probe);
    const view = doc.defaultView!;
    const expected = view.getComputedStyle(probe)[property];
    probe.remove();
    expect(view.getComputedStyle(element[0])[property]).to.equal(expected);
  });

describe('MenuButton unit-derived state and MenuTrigger composition', () => {
  const roots: Array<[string, MenuButtonProps]> = [
    ['native', {}],
    ['anchor button', { as: 'a' }],
    ['anchor link', { as: 'a', href: '#menu-button-menu-target' }],
  ];
  roots.forEach(([root, props]) => {
    it(`preserves both icon slots, ref, semantics and activation through a ${root} root render function`, () => {
      const ref = React.createRef<HTMLButtonElement & HTMLAnchorElement>();
      const clicked = cy.spy().as('click');
      mount(
        <MenuButton
          {...props}
          data-testid="button"
          ref={ref}
          icon={glyph}
          onClick={(event: MenuButtonMouseEvent) => {
            event.preventDefault();
            clicked();
          }}
        >
          {(Root: React.ElementType, rootProps: React.HTMLAttributes<HTMLButtonElement | HTMLAnchorElement>) => (
            <Root {...rootProps}>
              <span>Rendered actions</span>
              {rootProps.children}
            </Root>
          )}
        </MenuButton>,
      );
      name('Rendered actions', root === 'anchor link' ? 'link' : 'button');
      button().then(element => expect(ref.current).to.equal(element[0]));
      button().find('[data-testid="glyph"]').should('have.length', 1);
      menuIcon().find('svg').should('have.length', 1);
      button().should('have.attr', 'aria-expanded', 'false');
      button().realClick();
      button().focus().realPress('Enter').realPress('Space');
      cy.get('@click').should('have.been.calledThrice');
    });
  });
  ([false, true] as const).forEach(disableButtonEnhancement => {
    roots.forEach(([root, props]) => {
      (['Enter', 'Space', 'ArrowDown'] as const).forEach(key => {
        it(`opens ${root} via real ${key} exactly once with enhancement ${!disableButtonEnhancement}, focuses and restores its merged ref`, () => {
          const clicked = cy.spy().as('click');
          const down = cy.spy().as('down');
          const changes = cy.spy().as('changes');
          const action = cy.spy().as('action');
          const ref = React.createRef<HTMLButtonElement & HTMLAnchorElement>();
          mount(
            <Menu onOpenChange={(_event, data) => changes(data.open, data.type)} surfaceMotion={null}>
              <MenuTrigger disableButtonEnhancement={disableButtonEnhancement}>
                <MenuButton
                  data-testid="button"
                  {...props}
                  ref={ref}
                  onKeyDown={(event: MenuButtonKeyboardEvent) => down(event.key)}
                  onClick={(event: MenuButtonMouseEvent) => {
                    event.preventDefault();
                    clicked();
                  }}
                >
                  Actions
                </MenuButton>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem onClick={action}>First action</MenuItem>
                  <MenuItem>Second action</MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>,
          );
          button().should('have.attr', 'aria-haspopup', 'menu').and('have.attr', 'aria-expanded', 'false');
          button().then(element => expect(ref.current).to.equal(element[0]));
          cy.get('[role="menu"]').should('not.exist');
          button().focus().realPress(key);
          cy.get('@down').should('have.been.calledOnce');
          cy.get('@down')
            .its('firstCall.args')
            .should('deep.equal', [key === 'Space' ? ' ' : key]);
          cy.get('@click').should('have.callCount', key === 'ArrowDown' ? 0 : 1);
          cy.get('@changes').should('have.been.calledOnce');
          cy.get('@changes')
            .its('firstCall.args')
            .should('deep.equal', [true, key === 'ArrowDown' ? 'menuTriggerKeyDown' : 'menuTriggerClick']);
          button().should('have.attr', 'aria-expanded', 'true');
          cy.contains('[role="menuitem"]', 'First action').should('be.focused');
          button().then(element => {
            cy.get('[role="menu"]').should('have.attr', 'aria-labelledby', element[0].id);
          });
          cy.contains('[role="menuitem"]', 'First action').realPress('ArrowDown');
          cy.contains('[role="menuitem"]', 'Second action').should('be.focused').realPress('Escape');
          cy.get('[role="menu"]').should('not.exist');
          button().should('be.focused').and('have.attr', 'aria-expanded', 'false');
          cy.get('@changes').should('have.been.calledTwice');
          cy.get('@action').should('not.have.been.called');
          button().realPress(key);
          cy.get('@changes').should('have.been.calledThrice');
          cy.contains('[role="menuitem"]', 'First action').should('be.focused').realPress('Enter');
          cy.get('@action').should('have.been.calledOnce');
          cy.get('@changes').should('have.callCount', 4);
          cy.get('[role="menu"]').should('not.exist');
          button().should('be.focused');
          cy.get('@click').should('have.callCount', key === 'ArrowDown' ? 0 : 2);
        });
      });
    });

    (['disabled', 'disabledFocusable'] as const).forEach(flag => {
      it(`blocks ${flag} MenuTrigger opening with enhancement ${!disableButtonEnhancement} and restores real keyboard opening`, () => {
        const changes = cy.spy().as('changes');
        const clicked = cy.spy().as('click');
        const Example = () => {
          const [disabled, setDisabled] = React.useState(true);
          return (
            <>
              <button>Before</button>
              <Menu onOpenChange={(_event, data) => changes(data.open)} surfaceMotion={null}>
                <MenuTrigger disableButtonEnhancement={disableButtonEnhancement}>
                  <MenuButton data-testid="button" {...{ [flag]: disabled }} onClick={clicked}>
                    Actions
                  </MenuButton>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem>First action</MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
              <button>After</button>
              <button onClick={() => setDisabled(false)}>Enable</button>
            </>
          );
        };
        mount(<Example />);
        cy.contains('button', 'Before').focus().realPress('Tab');
        if (flag === 'disabledFocusable') {
          button().should('be.focused').realPress('Enter').realPress('Space').realPress('ArrowDown');
        } else {
          cy.contains('button', 'After').should('be.focused');
        }
        button().realClick();
        cy.get('@click').should('not.have.been.called');
        cy.get('@changes').should('not.have.been.called');
        cy.get('[role="menu"]').should('not.exist');
        cy.contains('button', 'Enable').click();
        button().focus().realPress('ArrowDown');
        cy.get('@changes').should('have.been.calledOnce');
        cy.get('@changes').its('firstCall.args').should('deep.equal', [true]);
        cy.contains('[role="menuitem"]', 'First action').should('be.focused').realPress('Escape');
        button().should('be.focused');
        button().realPress('Space');
        cy.get('@click').should('have.been.calledOnce');
        cy.get('@changes').should('have.been.calledThrice');
        cy.contains('[role="menuitem"]', 'First action').should('be.focused');
      });
    });

    it(`toggles from nested menuIcon pointer input without duplicate open requests with enhancement ${!disableButtonEnhancement}`, () => {
      const changes = cy.spy().as('changes');
      const clicked = cy.spy().as('click');
      mount(
        <Menu onOpenChange={(_event, data) => changes(data.open)} surfaceMotion={null}>
          <MenuTrigger disableButtonEnhancement={disableButtonEnhancement}>
            <MenuButton data-testid="button" menuIcon={glyph} onClick={clicked}>
              Actions
            </MenuButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem>First action</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>,
      );
      cy.get('[data-testid="glyph"]').realClick();
      cy.get('@click').should('have.been.calledOnce');
      cy.get('@changes').should('have.been.calledOnce');
      button().should('have.attr', 'aria-expanded', 'true');
      cy.get('[role="menu"]').should('be.visible');
      cy.get('[data-testid="glyph"]').realClick();
      cy.get('@click').should('have.been.calledTwice');
      cy.get('@changes').should('have.been.calledTwice');
      cy.get('@changes').its('lastCall.args').should('deep.equal', [false]);
      button().should('have.attr', 'aria-expanded', 'false');
      cy.get('[role="menu"]').should('not.exist');
    });
  });

  it('keeps controlled Menu open ownership external while reflecting rejected and accepted requests', () => {
    const changes = cy.spy().as('changes');
    const Example = () => {
      const [open, setOpen] = React.useState(false);
      const [accept, setAccept] = React.useState(false);
      return (
        <>
          <Menu
            open={open}
            surfaceMotion={null}
            onOpenChange={(_event, data) => {
              changes(data.open);
              if (accept) {
                setOpen(data.open);
              }
            }}
          >
            <MenuTrigger disableButtonEnhancement>
              <MenuButton data-testid="button">Actions</MenuButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem>First action</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <button onClick={() => setAccept(true)}>Accept requests</button>
        </>
      );
    };
    mount(<Example />);
    button().focus().realPress('ArrowDown');
    cy.get('@changes').should('have.been.calledOnce');
    button().should('have.attr', 'aria-expanded', 'false');
    cy.get('[role="menu"]').should('not.exist');
    cy.contains('button', 'Accept requests').click();
    button().focus().realPress('ArrowDown');
    cy.get('@changes').should('have.been.calledTwice');
    button().should('have.attr', 'aria-expanded', 'true');
    cy.contains('[role="menuitem"]', 'First action').should('be.focused').realPress('Escape');
    cy.get('@changes').should('have.been.calledThrice');
    button().should('be.focused').and('have.attr', 'aria-expanded', 'false');
  });

  it('composes an icon-only Tooltip label, trigger ref and menu labelling', () => {
    const ref = React.createRef<HTMLButtonElement>();
    mount(
      <Menu surfaceMotion={null}>
        <MenuTrigger disableButtonEnhancement>
          <Tooltip relationship="label" content="Calendar actions">
            <MenuButton data-testid="button" icon={glyph} ref={ref} />
          </Tooltip>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>First action</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    name('Calendar actions');
    menuIcon().should('not.exist');
    button().then(element => expect(ref.current).to.equal(element[0]));
    button().focus().realPress('ArrowDown');
    cy.contains('[role="menuitem"]', 'First action').should('be.focused').realPress('Escape');
    button().should('be.focused');
    name('Calendar actions');
  });

  it('inherits changing ButtonContext size unless an explicit size overrides it', () => {
    const Example = () => {
      const [size, setSize] = React.useState<'small' | 'large'>('small');
      return (
        <ButtonContextProvider value={{ size }}>
          <MenuButton data-testid="button">Actions</MenuButton>
          <MenuButton data-testid="explicit" size="medium">
            Other actions
          </MenuButton>
          <button onClick={() => setSize(value => (value === 'small' ? 'large' : 'small'))}>Resize context</button>
        </ButtonContextProvider>
      );
    };
    mount(<Example />);
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
    menuIcon().should('have.css', 'width', '12px');
    cy.get('[data-testid="explicit"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
    cy.contains('button', 'Resize context').click();
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
    menuIcon().should('have.css', 'width', '16px');
    cy.get('[data-testid="explicit"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
    cy.contains('button', 'Resize context').click();
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
  });

  it('updates appearance, shape, size, content, slots and expanded strings on the same root', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <MenuButton
            data-testid="button"
            ref={ref}
            appearance={phase === 0 ? 'secondary' : 'primary'}
            size={phase === 0 ? 'small' : 'large'}
            shape={phase === 0 ? 'square' : 'circular'}
            icon={phase === 2 ? undefined : glyph}
            menuIcon={phase === 1 ? null : undefined}
            aria-expanded={phase === 1 ? 'true' : 'false'}
            aria-label={phase === 0 ? 'Icon actions' : undefined}
          >
            {phase === 0 ? undefined : 'Updated actions'}
          </MenuButton>
          <button onClick={() => setPhase(value => value + 1)}>Next phase</button>
        </>
      );
    };
    mount(<Example />);
    name('Icon actions');
    button().then(element => {
      const initial = element[0];
      cy.contains('button', 'Next phase').click();
      button().should(updated => expect(updated[0]).to.equal(initial));
      button().then(updated => expect(ref.current).to.equal(updated[0]));
    });
    name('Updated actions');
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
    button().should('have.css', 'border-top-left-radius', teamsLightTheme.borderRadiusCircular);
    button().should('have.attr', 'aria-expanded', 'true');
    assertColor('backgroundColor', teamsLightTheme.colorBrandBackgroundSelected);
    menuIcon().should('not.exist');
    cy.contains('button', 'Next phase').click();
    button().find('.fui-MenuButton__icon').should('not.exist');
    menuIcon().find('svg').should('have.length', 1);
    button().should('have.attr', 'aria-expanded', 'false');
    assertColor('backgroundColor', teamsLightTheme.colorBrandBackground);
  });

  it('clears the forwarded ref on unmount and supplies the replacement node on remount', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          {visible && (
            <MenuButton ref={ref} data-testid="button">
              Actions
            </MenuButton>
          )}
          <button onClick={() => setVisible(value => !value)}>Toggle mount</button>
        </>
      );
    };
    mount(<Example />);
    button().then(element => {
      const initial = element[0];
      expect(ref.current).to.equal(initial);
      cy.contains('button', 'Toggle mount').click();
      button().should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
      cy.contains('button', 'Toggle mount').click();
      button().then(replacement => {
        expect(ref.current).to.equal(replacement[0]);
        expect(replacement[0]).not.to.equal(initial);
      });
    });
  });

  (['text', 'with-icon'] as const).forEach(content => {
    // Zero with a leading icon still lacks shared useButtonStyles spacing; only content and trailing spacing are fixed.
    it(`preserves numeric zero ${content} children and the trailing menu icon`, () => {
      mount(
        <MenuButton data-testid="button" icon={content === 'with-icon' ? glyph : undefined}>
          {0}
        </MenuButton>,
      );
      name('0');
      button().should('have.text', '0');
      menuIcon().find('svg').should('have.length', 1);
      menuIcon().should('have.css', 'margin-left', teamsLightTheme.spacingHorizontalXS);
    });
  });

  it('treats numeric zero icon shorthand as populated and suppresses the second menu icon', () => {
    mount(<MenuButton data-testid="button" icon={0} aria-label="Zero actions" />);
    name('Zero actions');
    button().find('.fui-MenuButton__icon').should('have.text', '0');
    menuIcon().should('not.exist');
  });

  ([undefined, null, false, ''] as const).forEach(children => {
    it(`omits the trailing icon for populated leading icon and empty ${String(
      children,
    )} (${typeof children}) children`, () => {
      mount(
        <MenuButton data-testid="button" icon={glyph} aria-label="More actions">
          {children}
        </MenuButton>,
      );
      name('More actions');
      menuIcon().should('not.exist');
      button().find('[data-testid="glyph"]').should('exist');
    });
  });

  const Headless = React.forwardRef<HTMLButtonElement, MenuButtonBaseProps>((props, ref) =>
    renderMenuButton_unstable(useMenuButtonBase_unstable(props, ref)),
  );
  ([undefined, null, 'custom'] as const).forEach(value => {
    it(`ships no headless chevron, rendering only ${String(value)} consumer menuIcon input`, () => {
      const ref = React.createRef<HTMLButtonElement>();
      mount(
        <Headless data-testid="button" ref={ref} menuIcon={value} aria-expanded="true">
          Actions
        </Headless>,
      );
      name(value === 'custom' ? 'Actionscustom' : 'Actions');
      button().should('have.attr', 'aria-expanded', 'true').and('have.attr', 'type', 'button');
      button().find('svg').should('not.exist');
      button().then(element => {
        expect(ref.current).to.equal(element[0]);
        expect(element[0].querySelectorAll('span').length).to.equal(value === 'custom' ? 1 : 0);
      });
    });
  });
});

describe('MenuButton documented variants and slots', () => {
  it('defaults to a named medium rounded native button and decorative trailing chevron without owning a menu', () => {
    const clicked = cy.spy().as('click');
    mount(
      <MenuButton data-testid="button" onClick={clicked}>
        Actions
      </MenuButton>,
    );
    button().should('have.prop', 'tagName', 'BUTTON').and('have.attr', 'type', 'button');
    button().should('have.attr', 'aria-expanded', 'false').and('not.have.attr', 'aria-haspopup');
    button().should('not.have.attr', 'aria-controls');
    button().should('have.class', 'fui-MenuButton');
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
    button().should('have.css', 'border-top-left-radius', teamsLightTheme.borderRadiusMedium);
    menuIcon().find('svg').should('have.length', 1).and('have.attr', 'aria-hidden', 'true');
    name('Actions');
    button().click();
    cy.get('@click').should('have.been.calledOnce');
    button().should('have.attr', 'aria-expanded', 'false');
    cy.get('[role="menu"]').should('not.exist');
    button().focus().realPress('ArrowDown').realPress('Escape');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('[role="menu"]').should('not.exist');
  });

  const appearances: NonNullable<MenuButtonProps['appearance']>[] = [
    'secondary',
    'primary',
    'outline',
    'subtle',
    'transparent',
  ];
  appearances.forEach(appearance => {
    it(`applies ${appearance} rest and expanded tokens and restores regular icon on collapse`, () => {
      const Example = () => {
        const [expanded, setExpanded] = React.useState(false);
        return (
          <>
            <MenuButton data-testid="button" appearance={appearance} aria-expanded={expanded} icon={<Calendar />}>
              Actions
            </MenuButton>
            <button onClick={() => setExpanded(value => !value)}>Toggle expansion</button>
          </>
        );
      };
      mount(<Example />);
      const rest = {
        secondary: teamsLightTheme.colorNeutralBackground1,
        primary: teamsLightTheme.colorBrandBackground,
        outline: teamsLightTheme.colorTransparentBackground,
        subtle: teamsLightTheme.colorSubtleBackground,
        transparent: teamsLightTheme.colorTransparentBackground,
      };
      const expanded = {
        secondary: teamsLightTheme.colorNeutralBackground1Selected,
        primary: teamsLightTheme.colorBrandBackgroundSelected,
        outline: teamsLightTheme.colorTransparentBackground,
        subtle: teamsLightTheme.colorSubtleBackgroundSelected,
        transparent: teamsLightTheme.colorTransparentBackgroundSelected,
      };
      assertColor('backgroundColor', rest[appearance]);
      button().find('.fui-Icon-filled').should('have.css', 'display', 'none');
      button().find('.fui-Icon-regular').should('not.have.css', 'display', 'none');
      cy.contains('button', 'Toggle expansion').click();
      button().should('have.attr', 'aria-expanded', 'true');
      assertColor('backgroundColor', expanded[appearance]);
      assertColor(
        'color',
        {
          secondary: teamsLightTheme.colorNeutralForeground1Selected,
          primary: teamsLightTheme.colorNeutralForegroundOnBrand,
          outline: teamsLightTheme.colorNeutralForeground1Selected,
          subtle: teamsLightTheme.colorNeutralForeground2BrandSelected,
          transparent: teamsLightTheme.colorNeutralForeground2BrandSelected,
        }[appearance],
        '.fui-MenuButton__icon',
      );
      button().find('.fui-Icon-filled').should('not.have.css', 'display', 'none');
      button().find('.fui-Icon-regular').should('have.css', 'display', 'none');
      if (appearance === 'outline') {
        button().should('have.css', 'border-top-width', teamsLightTheme.strokeWidthThicker);
      }
      cy.contains('button', 'Toggle expansion').click();
      button().should('have.attr', 'aria-expanded', 'false');
      assertColor('backgroundColor', rest[appearance]);
      button().find('.fui-Icon-filled').should('have.css', 'display', 'none');
    });
  });

  appearances.forEach(appearance => {
    (['disabled', 'disabledFocusable'] as const).forEach(flag => {
      it(`keeps ${appearance} ${flag} visual tokens and regular icon on hover, then restores enabled interaction`, () => {
        const clicked = cy.spy().as('click');
        const Example = () => {
          const [disabled, setDisabled] = React.useState(true);
          return (
            <>
              <MenuButton
                data-testid="button"
                appearance={appearance}
                {...{ [flag]: disabled }}
                icon={<Calendar />}
                onClick={clicked}
              >
                Actions
              </MenuButton>
              <button onClick={() => setDisabled(false)}>Enable</button>
            </>
          );
        };
        mount(<Example />);
        assertColor(
          'backgroundColor',
          appearance === 'secondary' || appearance === 'primary'
            ? teamsLightTheme.colorNeutralBackgroundDisabled
            : teamsLightTheme.colorTransparentBackground,
        );
        assertColor('color', teamsLightTheme.colorNeutralForegroundDisabled);
        assertColor('color', teamsLightTheme.colorNeutralForegroundDisabled, '.fui-MenuButton__icon');
        button().realHover();
        button().should('have.css', 'cursor', 'not-allowed');
        assertColor('color', teamsLightTheme.colorNeutralForegroundDisabled);
        button().find('.fui-Icon-filled').should('have.css', 'display', 'none');
        button().find('.fui-Icon-regular').should('not.have.css', 'display', 'none');
        button().realClick();
        cy.get('@click').should('not.have.been.called');
        cy.contains('button', 'Enable').click();
        button().realHover();
        button().should('have.css', 'cursor', 'pointer');
        button().realClick();
        cy.get('@click').should('have.been.calledOnce');
      });
    });
  });

  const sizes: NonNullable<MenuButtonProps['size']>[] = ['small', 'medium', 'large'];
  const shapes: NonNullable<MenuButtonProps['shape']>[] = ['rounded', 'circular', 'square'];
  sizes.forEach(size => {
    shapes.forEach(shape => {
      (['text', 'icon-text', 'icon-only'] as const).forEach(content => {
        it(`measures ${size} ${shape} ${content} targets, typography and slot geometry`, () => {
          mount(
            <MenuButton
              data-testid="button"
              size={size}
              shape={shape}
              icon={content !== 'text' ? glyph : undefined}
              aria-label={content === 'icon-only' ? 'More actions' : undefined}
            >
              {content === 'icon-only' ? undefined : 'Actions'}
            </MenuButton>,
          );
          name(content === 'icon-only' ? 'More actions' : 'Actions');
          button().should(element => {
            const bounds = element[0].getBoundingClientRect();
            expect(bounds.width).to.be.at.least(24);
            expect(bounds.height).to.be.at.least(24);
            if (content === 'icon-only') {
              expect(bounds.width).to.equal({ small: 24, medium: 32, large: 40 }[size]);
            }
          });
          button().should(
            'have.css',
            'font-size',
            {
              small: teamsLightTheme.fontSizeBase200,
              medium: teamsLightTheme.fontSizeBase300,
              large: teamsLightTheme.fontSizeBase400,
            }[size],
          );
          button().should(
            'have.css',
            'border-top-left-radius',
            {
              rounded: teamsLightTheme.borderRadiusMedium,
              circular: teamsLightTheme.borderRadiusCircular,
              square: `${parseFloat(teamsLightTheme.borderRadiusNone)}px`,
            }[shape],
          );
          if (content === 'icon-only') {
            menuIcon().should('not.exist');
            button().find('[data-testid="glyph"]').should('have.length', 1);
          } else {
            menuIcon().should('have.css', 'width', size === 'large' ? '16px' : '12px');
            menuIcon().should('have.css', 'margin-left', teamsLightTheme.spacingHorizontalXS);
          }
          if (content === 'icon-text') {
            button().should(element => {
              const leading = element[0].querySelector('.fui-MenuButton__icon')!;
              const trailing = element[0].querySelector('.fui-MenuButton__menuIcon')!;
              expect(element[0].firstChild).to.equal(leading);
              expect(element[0].lastChild).to.equal(trailing);
              expect(leading.getBoundingClientRect().right).to.be.lessThan(trailing.getBoundingClientRect().left);
            });
          }
        });
      });
    });
  });

  ([undefined, null] as const).forEach(value => {
    it(`distinguishes menuIcon=${String(value)} from a supplied replacement`, () => {
      mount(
        <>
          <MenuButton data-testid="button" menuIcon={value}>
            Actions
          </MenuButton>
          <MenuButton data-testid="custom" menuIcon={<svg data-testid="replacement" aria-hidden="true" />}>
            Other actions
          </MenuButton>
        </>,
      );
      if (value === null) {
        menuIcon().should('not.exist');
      } else {
        menuIcon().find('svg').should('have.length', 1);
      }
      cy.get('[data-testid="custom"] .fui-MenuButton__menuIcon svg').should('have.length', 1);
      cy.get('[data-testid="replacement"]').should('exist');
      name('Actions');
    });
  });

  it('forwards object slot attrs, classes, styles and nested pointer events without losing the root handler', () => {
    const slotClick = cy.spy().as('slot');
    const rootClick = cy.spy().as('root');
    mount(
      <MenuButton
        data-testid="button"
        className="consumer-root"
        icon={{ children: glyph, className: 'consumer-icon', 'aria-hidden': true }}
        menuIcon={{
          children: <span data-testid="custom-chevron">v</span>,
          className: 'consumer-menu',
          'aria-hidden': true,
          title: 'Decorative',
          style: { width: tokens.spacingHorizontalL },
          onClick: slotClick,
        }}
        onClick={rootClick}
      >
        Actions
      </MenuButton>,
    );
    button().should('have.class', 'consumer-root').and('have.class', 'fui-MenuButton');
    button().find('.fui-MenuButton__icon').should('have.class', 'consumer-icon');
    menuIcon().should('have.class', 'consumer-menu').and('have.attr', 'title', 'Decorative');
    menuIcon().should('have.css', 'width', teamsLightTheme.spacingHorizontalL);
    name('Actions');
    cy.get('[data-testid="custom-chevron"]').click();
    cy.get('@slot').should('have.been.calledOnce');
    cy.get('@root').should('have.been.calledOnce');
  });

  it('passes resolved menuIcon props and default children into a render function', () => {
    mount(
      <MenuButton
        data-testid="button"
        menuIcon={{
          'aria-hidden': true,
          title: 'Custom renderer',
          children: (Component: React.ElementType, props: React.HTMLAttributes<HTMLSpanElement>) => (
            <Component {...props} data-testid="rendered-menu-icon">
              <span data-testid="render-wrapper">{props.children}</span>
            </Component>
          ),
        }}
      >
        Actions
      </MenuButton>,
    );
    cy.get('[data-testid="rendered-menu-icon"]')
      .should('have.class', 'fui-MenuButton__menuIcon')
      .and('have.attr', 'title', 'Custom renderer');
    cy.get('[data-testid="render-wrapper"] svg').should('have.length', 1);
    name('Actions');
  });

  // Slot<'span'> supports only as="span"; other native elements use the supported children render function.
  const CustomMenuIcon = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>((props, ref) => (
    <em {...props} ref={ref} />
  ));
  (['explicit span', 'custom em renderer'] as const).forEach(renderer => {
    (['callback', 'object'] as const).forEach(refKind => {
      it(`preserves ${renderer} menuIcon native props, glyph and ${refKind} ref lifecycle across updates`, () => {
        const firstRef = React.createRef<HTMLSpanElement>();
        const latestRef = React.createRef<HTMLSpanElement>();
        const firstNodes: Array<HTMLSpanElement | null> = [];
        const latestNodes: Array<HTMLSpanElement | null> = [];
        const firstCallback = (node: HTMLSpanElement | null) => {
          firstNodes.push(node);
        };
        const latestCallback = (node: HTMLSpanElement | null) => {
          latestNodes.push(node);
        };
        const firstClick = cy.spy().as('firstSlotClick');
        const latestClick = cy.spy().as('latestSlotClick');
        const rootClick = cy.spy().as('slotRootClick');
        const currentRef = (latest: boolean) =>
          refKind === 'object'
            ? (latest ? latestRef : firstRef).current
            : (latest ? latestNodes : firstNodes).slice(-1)[0];
        const Example = () => {
          const [phase, setPhase] = React.useState(0);
          const [visible, setVisible] = React.useState(true);
          const [slotVisible, setSlotVisible] = React.useState(true);
          const updatedGlyph = (
            <svg data-testid="updated-glyph" aria-hidden="true" focusable="false" width="1em" height="1em">
              <circle cx="0.5em" cy="0.5em" r="0.5em" fill="currentColor" />
            </svg>
          );
          return (
            <>
              {visible && (
                <MenuButton
                  data-testid="button"
                  onClick={rootClick}
                  menuIcon={
                    slotVisible
                      ? {
                          as: 'span',
                          ref:
                            refKind === 'object'
                              ? phase === 0
                                ? firstRef
                                : latestRef
                              : phase === 0
                              ? firstCallback
                              : latestCallback,
                          id: phase === 0 ? 'first-menu-icon' : 'latest-menu-icon',
                          title: phase === 0 ? 'First decoration' : 'Latest decoration',
                          'aria-hidden': true,
                          dir: phase === 0 ? 'ltr' : 'rtl',
                          className: phase === 0 ? 'first-slot' : 'latest-slot',
                          onClick: phase === 0 ? firstClick : latestClick,
                          children:
                            renderer === 'explicit span'
                              ? phase === 0
                                ? glyph
                                : updatedGlyph
                              : (_Component: React.ElementType, props: React.ComponentPropsWithRef<'span'>) => (
                                  <CustomMenuIcon {...props}>
                                    {phase === 0 ? props.children : updatedGlyph}
                                  </CustomMenuIcon>
                                ),
                        }
                      : null
                  }
                >
                  Actions
                </MenuButton>
              )}
              {renderer === 'custom em renderer' && (
                <span data-testid="chevron-reference" aria-hidden="true">
                  <ChevronDownRegular />
                </span>
              )}
              <button onClick={() => setPhase(1)}>Update slot</button>
              <button onClick={() => setSlotVisible(value => !value)}>Toggle slot</button>
              <button onClick={() => setVisible(value => !value)}>Toggle root</button>
            </>
          );
        };
        mount(<Example />);
        name('Actions');
        menuIcon()
          .should('have.prop', 'tagName', renderer === 'explicit span' ? 'SPAN' : 'EM')
          .and('have.attr', 'id', 'first-menu-icon')
          .and('have.attr', 'title', 'First decoration')
          .and('have.attr', 'aria-hidden', 'true')
          .and('have.attr', 'dir', 'ltr')
          .and('have.class', 'first-slot');
        menuIcon().find('svg').should('have.length', 1).and('have.attr', 'aria-hidden', 'true');
        if (renderer === 'explicit span') {
          menuIcon().find('[data-testid="glyph"] rect').should('have.length', 1);
        } else {
          menuIcon().find('svg path').should('have.length', 1);
          cy.get('[data-testid="chevron-reference"] svg path').then(reference => {
            menuIcon().find('svg path').should('have.attr', 'd', reference[0].getAttribute('d'));
          });
        }
        menuIcon().then(element => {
          const initial = element[0];
          expect(currentRef(false)).to.equal(initial);
          if (refKind === 'callback') {
            // The shared mount runs StrictMode's initial attach/detach/attach ref cycle.
            expect(firstNodes).to.deep.equal([initial, null, initial]);
          }
          menuIcon().realClick();
          cy.get('@firstSlotClick').should('have.been.calledOnce');
          cy.get('@slotRootClick').should('have.been.calledOnce');
          cy.contains('button', 'Update slot').click();
          menuIcon().should(updated => {
            expect(updated[0]).to.equal(initial);
            expect(currentRef(false)).to.equal(null);
            expect(currentRef(true)).to.equal(initial);
            if (refKind === 'callback') {
              expect(firstNodes).to.deep.equal([initial, null, initial, null]);
              expect(latestNodes).to.deep.equal([initial]);
            }
          });
          name('Actions');
          menuIcon()
            .should('have.attr', 'id', 'latest-menu-icon')
            .and('have.attr', 'title', 'Latest decoration')
            .and('have.attr', 'aria-hidden', 'true')
            .and('have.attr', 'dir', 'rtl')
            .and('have.class', 'latest-slot')
            .and('not.have.class', 'first-slot');
          menuIcon().find('svg').should('have.length', 1);
          menuIcon().find('[data-testid="updated-glyph"] circle').should('have.length', 1);
          menuIcon().find('rect, path').should('not.exist');
          menuIcon().realClick();
          cy.get('@latestSlotClick').should('have.been.calledOnce');
          cy.get('@firstSlotClick').should('have.been.calledOnce');
          cy.get('@slotRootClick').should('have.been.calledTwice');
          cy.contains('button', 'Toggle slot').click();
          menuIcon().should('not.exist');
          cy.then(() => expect(currentRef(true)).to.equal(null));
          name('Actions');
          cy.contains('button', 'Toggle slot').click();
          menuIcon().then(replacement => {
            expect(replacement[0]).not.to.equal(initial);
            expect(currentRef(true)).to.equal(replacement[0]);
            if (refKind === 'callback') {
              expect(latestNodes).to.deep.equal([initial, null, replacement[0], null, replacement[0]]);
            }
            menuIcon().find('[data-testid="updated-glyph"] circle').should('have.length', 1);
            cy.contains('button', 'Toggle root').click();
            button().should('not.exist');
            cy.then(() => {
              expect(currentRef(true)).to.equal(null);
              if (refKind === 'callback') {
                expect(latestNodes).to.deep.equal([initial, null, replacement[0], null, replacement[0], null]);
              }
            });
          });
        });
      });
    });
  });

  it('keeps a chevron-only control named and removes its text spacing', () => {
    mount(<MenuButton data-testid="button" aria-label="More actions" />);
    name('More actions');
    menuIcon().should('have.css', 'margin-left', '0px');
    menuIcon().find('svg').should('have.length', 1);
  });

  it('wraps documented long text rather than clipping the label or overlapping its chevron', () => {
    const text = 'Long text wraps after it hits the max width of the component';
    mount(
      <MenuButton data-testid="button" style={{ width: '280px' }}>
        <span data-testid="label">{text}</span>
      </MenuButton>,
    );
    name(text);
    button().should(element => {
      const label = element[0].querySelector('[data-testid="label"]')!;
      const chevron = element[0].querySelector('.fui-MenuButton__menuIcon')!;
      const bounds = element[0].getBoundingClientRect();
      expect(label.getBoundingClientRect().height).to.be.greaterThan(parseFloat(teamsLightTheme.lineHeightBase300));
      expect(label.getBoundingClientRect().right).to.be.at.most(chevron.getBoundingClientRect().left);
      expect(chevron.getBoundingClientRect().right).to.be.lessThan(bounds.right);
      expect(element[0].scrollWidth).to.be.at.most(element[0].clientWidth);
    });
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`uses ${dir} leading icon and trailing chevron geometry with logical gaps`, () => {
      mountBase(
        <FluentProvider theme={teamsLightTheme} dir={dir}>
          <MenuButton data-testid="button" icon={glyph}>
            <span data-testid="label">Actions</span>
          </MenuButton>
        </FluentProvider>,
      );
      button().should(element => {
        const leading = element[0].querySelector('.fui-MenuButton__icon')!.getBoundingClientRect();
        const label = element[0].querySelector('[data-testid="label"]')!.getBoundingClientRect();
        const trailing = element[0].querySelector('.fui-MenuButton__menuIcon')!.getBoundingClientRect();
        const gap = parseFloat(teamsLightTheme.spacingHorizontalXS);
        if (dir === 'ltr') {
          expect(leading.right).to.be.lessThan(label.left);
          expect(trailing.left - label.right).to.be.closeTo(gap, 0.1);
        } else {
          expect(leading.left).to.be.greaterThan(label.right);
          expect(label.left - trailing.right).to.be.closeTo(gap, 0.1);
        }
      });
    });
  });

  it('updates selected brand styling when the provider theme changes', () => {
    const Example = () => {
      const [dark, setDark] = React.useState(false);
      return (
        <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme}>
          <MenuButton data-testid="button" appearance="primary" aria-expanded>
            Actions
          </MenuButton>
          <button onClick={() => setDark(value => !value)}>Switch theme</button>
        </FluentProvider>
      );
    };
    mountBase(<Example />);
    assertColor('backgroundColor', teamsLightTheme.colorBrandBackgroundSelected);
    cy.contains('button', 'Switch theme').click();
    assertColor('backgroundColor', teamsDarkTheme.colorBrandBackgroundSelected);
    assertColor('color', teamsDarkTheme.colorNeutralForegroundOnBrand);
    cy.contains('button', 'Switch theme').click();
    assertColor('backgroundColor', teamsLightTheme.colorBrandBackgroundSelected);
  });
});
