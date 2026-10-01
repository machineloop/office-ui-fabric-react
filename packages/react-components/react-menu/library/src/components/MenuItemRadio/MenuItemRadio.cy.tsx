import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
  type MenuProps,
  type MenuListProps,
} from '@fluentui/react-menu';
import { MenuItemRadio } from './MenuItemRadio';
import type { MenuItemRadioProps } from './MenuItemRadio.types';
import { MenuListProvider, type MenuListContextValue } from '../../contexts/menuListContext';

const item = (id: string) => `[data-testid="${id}"]`;
const checkmark = '.fui-MenuItemRadio__checkmark';

const renderSlot =
  (id: string, children: React.ReactNode): SlotRenderFunction<React.HTMLAttributes<HTMLSpanElement>> =>
  (Component, props) =>
    (
      <Component {...props} data-testid={id}>
        {children}
      </Component>
    );

function render(element: React.ReactElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) {
  mount(
    <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
}

function checked(id: string, value: boolean) {
  cy.get(item(id)).should('have.attr', 'aria-checked', String(value));
  cy.get(item(id))
    .find(checkmark)
    .should('have.css', 'visibility', value ? 'visible' : 'hidden');
}

const Choices = ({ secondProps = {} }: { secondProps?: Partial<MenuItemRadioProps> }) => (
  <>
    <MenuItemRadio data-testid="alpha" name="font" value="alpha">
      Alpha
    </MenuItemRadio>
    <MenuItemRadio data-testid="beta" name="font" value="beta" {...secondProps}>
      Beta
    </MenuItemRadio>
    <MenuItemRadio data-testid="other" name="size" value="large">
      Large
    </MenuItemRadio>
  </>
);

const Surface = ({
  popup = false,
  selection = {},
  menuProps = {},
  children,
}: {
  popup?: boolean;
  selection?: Pick<MenuListProps, 'checkedValues' | 'defaultCheckedValues' | 'onCheckedValueChange'>;
  menuProps?: Partial<MenuProps>;
  children?: React.ReactNode;
}) =>
  popup ? (
    <Menu {...selection} {...menuProps} surfaceMotion={null}>
      <MenuTrigger disableButtonEnhancement>
        <button data-testid="trigger">Fonts</button>
      </MenuTrigger>
      <MenuPopover data-testid="popover">
        <MenuList>{children ?? <Choices />}</MenuList>
      </MenuPopover>
    </Menu>
  ) : (
    <MenuList aria-label="Fonts" {...selection}>
      {children ?? <Choices />}
    </MenuList>
  );

function open(popup: boolean) {
  if (popup) {
    cy.get(item('trigger')).click();
    cy.get(item('popover')).should('be.visible');
  }
}

describe('MenuItemRadio documentation', () => {
  for (const popup of [false, true]) {
    const owner = popup ? 'Menu' : 'standalone MenuList';

    it(`${owner}: defaults unchecked, selects exactly one value, and retains other groups`, () => {
      const change = cy.stub().as('change');
      render(<Surface popup={popup} selection={{ onCheckedValueChange: change }} />);
      open(popup);
      checked('alpha', false);
      checked('beta', false);
      checked('other', false);
      cy.get(item('other')).click();
      if (popup) {
        cy.get(item('popover')).should('not.exist');
        open(popup);
      }
      cy.get(item('alpha')).click();
      open(popup);
      checked('alpha', true);
      checked('other', true);
      cy.get(item('beta')).click();
      open(popup);
      checked('alpha', false);
      checked('beta', true);
      checked('other', true);
      cy.get('@change').should('have.callCount', 3);
      cy.then(() => {
        expect(change.getCalls().map(call => call.args[1])).to.deep.equal([
          { name: 'size', checkedItems: ['large'] },
          { name: 'font', checkedItems: ['alpha'] },
          { name: 'font', checkedItems: ['beta'] },
        ]);
        expect(change.firstCall.args[0].type).to.equal('click');
      });
    });
  }
});

describe('MenuItemRadio keyboard, accessibility and lifecycle edges', () => {
  afterEach(() => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });
  for (const popup of [false, true]) {
    for (const key of ['Enter', 'Space'] as const) {
      it(`${popup ? 'popup' : 'standalone'} ${key} selects once through a click event`, () => {
        const change = cy.stub().as('change');
        const click = cy.stub().as('click');
        render(
          <Surface popup={popup} selection={{ onCheckedValueChange: change }}>
            <Choices secondProps={{ onClick: click }} />
          </Surface>,
        );
        open(popup);
        cy.get(item('beta')).focus().realPress(key);
        if (popup) {
          cy.get(item('popover')).should('not.exist');
          cy.get(item('trigger')).should('be.focused');
          open(true);
        }
        checked('alpha', false);
        checked('beta', true);
        cy.get('@change').should('have.been.calledOnce');
        cy.get('@click').should('have.been.calledOnce');
        cy.then(() => {
          expect(change.firstCall.args[1]).to.deep.equal({ name: 'font', checkedItems: ['beta'] });
          expect(change.firstCall.args[0].type).to.equal('click');
          expect(click.firstCall.args[0]).to.equal(change.firstCall.args[0]);
        });
      });
    }
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`${dir}: circular arrows, Home/End and case-insensitive typeahead move focus without selection`, () => {
      const change = cy.stub().as('change');
      render(
        <MenuList aria-label="Fonts" defaultCheckedValues={{ font: ['alpha'] }} onCheckedValueChange={change}>
          <MenuItemRadio name="font" value="alpha" data-testid="alpha">
            Alpha
          </MenuItemRadio>
          <MenuItemRadio name="font" value="beta" data-testid="beta" disabled>
            Beta
          </MenuItemRadio>
          <MenuItemRadio name="font" value="apple" data-testid="apple">
            Apple
          </MenuItemRadio>
        </MenuList>,
        dir,
      );
      cy.get(item('alpha')).focus().realPress('ArrowDown');
      cy.get(item('beta')).should('be.focused').realPress('ArrowDown');
      cy.get(item('apple')).should('be.focused').realPress('ArrowDown');
      cy.get(item('alpha')).should('be.focused').realPress('ArrowUp');
      cy.get(item('apple')).should('be.focused').realPress('Home');
      cy.get(item('alpha')).should('be.focused').realPress('End');
      cy.get(item('apple')).should('be.focused').type('a');
      cy.get(item('alpha')).should('be.focused').type('A');
      cy.get(item('apple')).should('be.focused').type('b');
      cy.get(item('beta')).should('be.focused');
      checked('alpha', true);
      checked('beta', false);
      checked('apple', false);
      cy.get('@change').should('not.have.been.called');
      cy.get(item('apple')).focus().realPress('Enter');
      checked('alpha', false);
      checked('apple', true);
      cy.get('@change').should('have.been.calledOnce');
    });
  }

  for (const secondProps of [
    { disabled: true },
    { disabled: true, disabledFocusable: false },
    { disabled: true, disabledFocusable: true },
    { 'aria-disabled': 'true' as const },
  ]) {
    it(`blocks pointer/Enter/Space but keeps focus for ${JSON.stringify(secondProps)}`, () => {
      const change = cy.stub().as('change');
      const click = cy.stub().as('click');
      render(
        <Surface selection={{ onCheckedValueChange: change }}>
          <Choices secondProps={{ ...secondProps, onClick: click }} />
        </Surface>,
      );
      cy.get(item('beta')).trigger('mousemove').should('be.focused').and('have.attr', 'aria-disabled', 'true');
      cy.get(item('beta')).click().realPress('Enter');
      cy.get(item('beta')).realPress('Space');
      checked('beta', false);
      cy.get('@change').should('not.have.been.called');
      cy.get('@click').should('not.have.been.called');
      cy.get(item('alpha')).click();
      checked('alpha', true);
      cy.get('@change').should('have.been.calledOnce');
    });
  }

  it('deprecated disabledFocusable alone does not disable an enabled radio', () => {
    render(
      <Surface>
        <Choices secondProps={{ disabledFocusable: true }} />
      </Surface>,
    );
    cy.get(item('beta')).should('not.have.attr', 'aria-disabled');
    cy.get(item('beta')).click();
    checked('beta', true);
  });

  it('pointer movement focuses without selecting and forwards the latest mouse handler', () => {
    const move = cy.stub().as('move');
    const change = cy.stub().as('change');
    render(
      <Surface selection={{ onCheckedValueChange: change }}>
        <Choices secondProps={{ onMouseMove: move }} />
      </Surface>,
    );
    cy.get(item('beta')).trigger('mousemove').should('be.focused');
    checked('beta', false);
    cy.get('@move').should('have.been.calledOnce');
    cy.get('@change').should('not.have.been.called');
    cy.get(item('beta')).click();
    checked('beta', true);
    cy.get('@change').should('have.been.calledOnce');
  });

  for (const key of ['Enter', 'Space'] as const) {
    it(`prevented ${key} ${key === 'Enter' ? 'keydown' : 'keyup'} blocks selection with an unprevented control`, () => {
      const change = cy.stub().as('change');
      const Example = () => {
        const [prevent, setPrevent] = React.useState(true);
        return (
          <>
            <button data-testid="update" onClick={() => setPrevent(false)}>
              Allow
            </button>
            <Surface selection={{ onCheckedValueChange: change }}>
              <Choices
                secondProps={{
                  onKeyDown: event => {
                    if (prevent && key === 'Enter') {
                      event.preventDefault();
                    }
                  },
                  onKeyUp: event => {
                    if (prevent && key === 'Space') {
                      event.preventDefault();
                    }
                  },
                }}
              />
            </Surface>
          </>
        );
      };
      render(<Example />);
      cy.get(item('beta')).focus().realPress(key);
      checked('beta', false);
      cy.get('@change').should('not.have.been.called');
      cy.get(item('update')).click();
      cy.get(item('beta')).focus().realPress(key);
      checked('beta', true);
      cy.get('@change').should('have.been.calledOnce');
    });
  }

  for (const persist of [false, true]) {
    it(`item persistOnClick=${persist} overrides inverse Menu persistence and keeps selection on reentry`, () => {
      const change = cy.stub().as('change');
      render(
        <Surface popup selection={{ onCheckedValueChange: change }} menuProps={{ persistOnItemClick: !persist }}>
          <Choices secondProps={{ persistOnClick: persist }} />
        </Surface>,
      );
      open(true);
      cy.get(item('beta')).click();
      if (persist) {
        cy.get(item('popover')).should('be.visible');
        checked('beta', true);
        cy.get(item('beta')).focus().realPress('Escape');
      } else {
        cy.get(item('popover')).should('not.exist');
      }
      open(true);
      checked('beta', true);
      checked('alpha', false);
      cy.get('@change').should('have.been.calledOnce');
    });
  }

  it('onClick prevention runs after selection and dismissal; it is not a cancellation API', () => {
    const sequence: string[] = [];
    render(
      <Surface
        popup
        selection={{ onCheckedValueChange: () => sequence.push('selection') }}
        menuProps={{
          onOpenChange: (_, data) => {
            if (!data.open) {
              sequence.push('dismiss');
            }
          },
        }}
      >
        <Choices
          secondProps={{
            onClick: event => {
              event.preventDefault();
              sequence.push('click');
            },
          }}
        />
      </Surface>,
    );
    open(true);
    cy.get(item('beta')).click();
    cy.get(item('popover')).should('not.exist');
    cy.then(() => expect(sequence).to.deep.equal(['dismiss', 'selection', 'click']));
    open(true);
    checked('beta', true);
  });

  it('outside wheel closure does not change a persisted selection or invoke selection callbacks', () => {
    const change = cy.stub().as('change');
    const close = cy.stub().as('close');
    render(
      <>
        <div data-testid="outside">Outside</div>
        <Surface
          popup
          menuProps={{ persistOnItemClick: true, closeOnScroll: true, onOpenChange: close }}
          selection={{ onCheckedValueChange: change }}
        />
      </>,
    );
    open(true);
    cy.get(item('beta')).click();
    checked('beta', true);
    cy.get(item('outside')).trigger('wheel', { deltaY: 20 });
    cy.get(item('popover')).should('not.exist');
    cy.then(() => expect(close.lastCall.args[1]).to.include({ open: false, type: 'scrollOutside' }));
    open(true);
    checked('beta', true);
    cy.get('@change').should('have.been.calledOnce');
  });

  it('computes the explicit accessible name and referenced description without decorative glyph text', () => {
    render(
      <MenuList aria-label="Fonts">
        <MenuItemRadio
          name="font"
          value="alpha"
          data-testid="alpha"
          aria-label="Preferred font"
          aria-describedby="details"
          icon={{ children: 'Decorative', 'aria-hidden': true }}
          secondaryContent={{ children: 'Ctrl+A', 'aria-hidden': true }}
          subText={{ children: 'Readable', id: 'details' }}
        >
          Alpha
        </MenuItemRadio>
      </MenuList>,
    );
    cy.get(item('alpha')).then($el => {
      expect(computeAccessibleName($el[0])).to.equal('Preferred font');
      expect(computeAccessibleDescription($el[0])).to.equal('Readable');
    });
    cy.get(item('alpha'))
      .then($el => axe.run($el[0]))
      .then(results => {
        expect(
          results.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })),
        ).to.deep.equal([]);
      });
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const dark of [false, true]) {
      it(`${dir} ${dark ? 'dark' : 'light'}: slot dimensions, ordering and inherited theme color`, () => {
        render(
          <MenuList aria-label="Fonts" defaultCheckedValues={{ font: ['alpha'] }}>
            <MenuItemRadio name="font" value="alpha" data-testid="alpha" icon="I" secondaryContent="Ctrl+A">
              Alpha
            </MenuItemRadio>
          </MenuList>,
          dir,
          dark,
        );
        checked('alpha', true);
        cy.get(item('alpha'))
          .should('have.css', 'direction', dir)
          .then($root => {
            const root = $root[0];
            const style = root.ownerDocument.defaultView!.getComputedStyle(root);
            const token = style.getPropertyValue('--colorNeutralForeground2').trim();
            expect(token).to.equal((dark ? teamsDarkTheme : teamsLightTheme).colorNeutralForeground2);
            const probe = root.ownerDocument.createElement('span');
            probe.style.color = token;
            root.appendChild(probe);
            expect(style.color).to.equal(root.ownerDocument.defaultView!.getComputedStyle(probe).color);
            probe.remove();
            expect(root.getBoundingClientRect().height).to.be.at.least(32);
            const slots = Array.from(root.children).map(el => el.getBoundingClientRect());
            expect(slots[0].width).to.equal(16);
            expect(slots[0].height).to.equal(16);
            expect(slots[1].width).to.equal(20);
            expect(slots[1].height).to.equal(20);
            if (dir === 'ltr') {
              expect(slots[0].right).to.be.at.most(slots[1].left);
              expect(slots[1].right).to.be.at.most(slots[2].left);
              expect(slots[2].right).to.be.at.most(slots[3].left);
            } else {
              expect(slots[0].left).to.be.at.least(slots[1].right);
              expect(slots[1].left).to.be.at.least(slots[2].right);
              expect(slots[2].left).to.be.at.least(slots[3].right);
            }
          });
      });
    }
  }

  it('forced colors retain checked visibility and disabled focus/selection semantics', () => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: 'active' }] },
      }),
    );
    render(
      <Surface selection={{ defaultCheckedValues: { font: ['alpha'] } }}>
        <Choices secondProps={{ disabled: true }} />
      </Surface>,
    );
    cy.get(item('alpha')).then($el =>
      expect($el[0].ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(true),
    );
    checked('alpha', true);
    cy.get(item('beta')).focus().realPress('Enter');
    cy.get(item('beta')).should('be.focused');
    cy.get(item('beta')).then($el => {
      const root = $el[0];
      const probe = root.ownerDocument.createElement('span');
      probe.style.color = 'GrayText';
      root.appendChild(probe);
      const view = root.ownerDocument.defaultView!;
      expect(view.getComputedStyle(root).color).to.equal(view.getComputedStyle(probe).color);
      probe.remove();
    });
    checked('beta', false);
    cy.get(item('other')).click();
    checked('other', true);
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });
});

describe('MenuItemRadio documentation variants', () => {
  for (const popup of [false, true]) {
    const owner = popup ? 'Menu' : 'standalone MenuList';
    it(`${owner}: defaultCheckedValues initialize once and repeated activation never unchecks`, () => {
      const change = cy.stub().as('change');
      const Example = () => {
        const [initial, setInitial] = React.useState('alpha');
        return (
          <>
            <button data-testid="update" onClick={() => setInitial('beta')}>
              Update default
            </button>
            <Surface
              popup={popup}
              selection={{ defaultCheckedValues: { font: [initial] }, onCheckedValueChange: change }}
            />
          </>
        );
      };
      render(<Example />);
      cy.get(item('update')).click();
      open(popup);
      checked('alpha', true);
      checked('beta', false);
      cy.get(item('alpha')).click();
      open(popup);
      checked('alpha', true);
      cy.get('@change').should('have.been.calledOnce');
      cy.then(() => expect(change.firstCall.args[1]).to.deep.equal({ name: 'font', checkedItems: ['alpha'] }));
    });

    for (const accept of [false, true]) {
      it(`${owner}: controlled selection ${accept ? 'accepts' : 'rejects'} the exact callback hint`, () => {
        const change = cy.stub().as('change');
        const Example = () => {
          const [values, setValues] = React.useState({ font: ['alpha'] });
          return (
            <Surface
              popup={popup}
              selection={{
                checkedValues: values,
                onCheckedValueChange: (event, data) => {
                  change(event, data);
                  if (accept) {
                    setValues(current => ({ ...current, [data.name]: data.checkedItems }));
                  }
                },
              }}
            />
          );
        };
        render(<Example />);
        open(popup);
        cy.get(item('beta')).click();
        open(popup);
        checked('alpha', !accept);
        checked('beta', accept);
        cy.get('@change').should('have.been.calledOnce');
        cy.then(() => expect(change.firstCall.args[1]).to.deep.equal({ name: 'font', checkedItems: ['beta'] }));
      });
    }

    it(`${owner}: external controlled updates change both glyph and aria without callbacks`, () => {
      const change = cy.stub().as('change');
      const Example = () => {
        const [values, setValues] = React.useState<Record<string, string[]>>({ font: ['alpha'] });
        return (
          <>
            <button data-testid="update" onClick={() => setValues({ font: ['beta'], size: ['large'] })}>
              Update
            </button>
            <Surface popup={popup} selection={{ checkedValues: values, onCheckedValueChange: change }} />
          </>
        );
      };
      render(<Example />);
      open(popup);
      checked('alpha', true);
      cy.get(item('update')).click();
      open(popup);
      checked('alpha', false);
      checked('beta', true);
      checked('other', true);
      cy.get('@change').should('not.have.been.called');
    });
  }

  it('renders menuitemradio semantics, not a radiogroup or native radio input', () => {
    render(<Surface />);
    cy.get('[role="menu"]').should('have.attr', 'aria-label', 'Fonts');
    cy.get('[role="menuitemradio"]').should('have.length', 3).first().should('have.text', 'Alpha');
    cy.get(item('alpha')).then($el => expect(computeAccessibleName($el[0])).to.equal('Alpha'));
    cy.get(item('beta')).then($el => expect(computeAccessibleName($el[0])).to.equal('Beta'));
    cy.get('[role="radiogroup"], input[type="radio"]').should('not.exist');
    cy.get(item('alpha')).should('have.attr', 'tabindex', '0');
    cy.get(item('alpha')).find(`${checkmark} svg`).should('have.attr', 'aria-hidden', 'true');
  });

  it('renders icon, checkmark, secondary content and multiline descriptor with native slot props', () => {
    render(
      <MenuList aria-label="Fonts" defaultCheckedValues={{ font: ['alpha'] }}>
        <MenuItemRadio
          name="font"
          value="alpha"
          data-testid="alpha"
          aria-label="Alpha font"
          icon={{ children: 'I', 'aria-hidden': true, className: 'custom-icon' }}
          checkmark={{ children: '✓', 'aria-hidden': true, className: 'custom-check' }}
          secondaryContent={{ children: 'Ctrl+A', 'aria-hidden': true, title: 'Shortcut' }}
          subText={{ children: 'Recommended', id: 'description' }}
          aria-describedby="description"
        >
          Alpha
        </MenuItemRadio>
      </MenuList>,
    );
    checked('alpha', true);
    cy.get(item('alpha'))
      .should('have.attr', 'aria-label', 'Alpha font')
      .and('have.attr', 'aria-describedby', 'description');
    cy.get('.custom-icon').should('have.class', 'fui-MenuItemRadio__icon').and('have.text', 'I');
    cy.get('.custom-check').should('have.class', 'fui-MenuItemRadio__checkmark').and('have.text', '✓');
    cy.get('.fui-MenuItemRadio__secondaryContent').should('have.text', 'Ctrl+A').and('have.attr', 'title', 'Shortcut');
    cy.get('.fui-MenuItemRadio__content')
      .should('have.css', 'flex-direction', 'column')
      .find('.fui-MenuItemRadio__subText')
      .should('have.text', 'Recommended');
  });

  it('omits explicitly null slots without changing checked semantics', () => {
    render(
      <MenuList aria-label="Fonts" hasIcons hasCheckmarks defaultCheckedValues={{ font: ['alpha'] }}>
        <MenuItemRadio
          name="font"
          value="alpha"
          data-testid="alpha"
          aria-label="Alpha"
          checkmark={null}
          icon={null}
          content={null}
          secondaryContent={null}
          subText={null}
        >
          Not rendered
        </MenuItemRadio>
      </MenuList>,
    );
    cy.get(item('alpha')).should('have.attr', 'aria-checked', 'true').and('have.text', '');
    cy.get(item('alpha')).children().should('have.length', 0);
  });

  it('merges checkmark shorthand props with the default hidden SVG', () => {
    render(
      <MenuList aria-label="Fonts">
        <MenuItemRadio
          name="font"
          value="alpha"
          data-testid="alpha"
          checkmark={{ className: 'custom-check', title: 'Selection' }}
        >
          Alpha
        </MenuItemRadio>
      </MenuList>,
    );
    checked('alpha', false);
    cy.get('.custom-check').should('have.attr', 'title', 'Selection').find('svg').should('have.length', 1);
    cy.get(item('alpha')).click();
    checked('alpha', true);
  });

  it('uses named MenuGroup labels while keeping selection independent by name', () => {
    render(
      <MenuList aria-label="Settings">
        <MenuGroup>
          <MenuGroupHeader>Font</MenuGroupHeader>
          <Choices />
        </MenuGroup>
        <MenuGroup>
          <MenuGroupHeader>Color</MenuGroupHeader>
          <MenuItemRadio name="color" value="blue" data-testid="blue">
            Blue
          </MenuItemRadio>
        </MenuGroup>
      </MenuList>,
    );
    cy.get('[role="group"]').each($group => {
      const label = $group.attr('aria-labelledby');
      expect(label).to.be.a('string').and.not.equal('');
      cy.get(`[id="${label}"]`).should('be.visible');
    });
    cy.get(item('blue')).click();
    cy.get(item('beta')).click();
    checked('blue', true);
    checked('beta', true);
    checked('alpha', false);
  });
});

describe('MenuItemRadio unit-derived composition and rerenders', () => {
  for (const hasCheckmarks of [false, true]) {
    it(`null checkmark survives hasCheckmarks=${hasCheckmarks} while enabled activation updates aria`, () => {
      render(
        <MenuList aria-label="Fonts" hasCheckmarks={hasCheckmarks}>
          <MenuItemRadio name="font" value="alpha" data-testid="alpha" checkmark={null}>
            Alpha
          </MenuItemRadio>
        </MenuList>,
      );
      cy.get(item('alpha')).find(checkmark).should('not.exist');
      cy.get(item('alpha')).should('have.attr', 'aria-checked', 'false').click();
      cy.get(item('alpha')).should('have.attr', 'aria-checked', 'true');
      cy.get(item('alpha')).find(checkmark).should('not.exist');
    });
  }

  it('selection forwards name, value and previous checked flag to the nearest list handler before consumer click', () => {
    const select = cy.stub().as('select');
    const click = cy.stub().as('click');
    const context: MenuListContextValue = { checkedValues: { font: ['alpha'] }, selectRadio: select };
    render(
      <MenuListProvider value={context}>
        <MenuList aria-label="Fonts">
          <MenuListProvider value={context}>
            <MenuItemRadio name="font" value="alpha" data-testid="alpha" onClick={click}>
              Alpha
            </MenuItemRadio>
            <MenuItemRadio name="font" value="beta" data-testid="beta" onClick={click}>
              Beta
            </MenuItemRadio>
          </MenuListProvider>
        </MenuList>
      </MenuListProvider>,
    );
    checked('alpha', true);
    checked('beta', false);
    cy.get(item('alpha')).click();
    cy.get(item('beta')).click();
    cy.then(() => {
      expect(select.firstCall.args.slice(1)).to.deep.equal(['font', 'alpha', true]);
      expect(select.secondCall.args.slice(1)).to.deep.equal(['font', 'beta', false]);
      expect(select.firstCall.args[0]).to.equal(click.firstCall.args[0]);
      expect(select.firstCall.calledBefore(click.firstCall)).to.equal(true);
    });
    cy.get('@select').should('have.callCount', 2);
    cy.get('@click').should('have.callCount', 2);
  });

  it('latest name/value, list callback and item click/key/mouse handlers replace old closures after rerender', () => {
    const old = cy.stub().as('old');
    const latest = cy.stub().as('latest');
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      const notify = updated ? latest : old;
      return (
        <>
          <button data-testid="update" onClick={() => setUpdated(true)}>
            Replace
          </button>
          <MenuList
            aria-label="Settings"
            defaultCheckedValues={{ font: ['alpha'], color: ['blue'] }}
            onCheckedValueChange={(event, data) => notify('selection', event.type, data)}
          >
            <MenuItemRadio
              name={updated ? 'color' : 'font'}
              value={updated ? 'red' : 'alpha'}
              data-testid="alpha"
              onClick={event => notify('click', event.type)}
              onKeyDown={event => notify('down', event.key)}
              onKeyUp={event => notify('up', event.key)}
              onMouseMove={event => notify('move', event.type)}
            >
              Alpha
            </MenuItemRadio>
          </MenuList>
        </>
      );
    };
    render(<Example />);
    checked('alpha', true);
    cy.get(item('update')).click();
    checked('alpha', false);
    cy.get(item('alpha')).trigger('mousemove').should('be.focused').realPress('Enter');
    checked('alpha', true);
    cy.get('@old').should('not.have.been.called');
    cy.then(() =>
      expect(latest.getCalls().map(call => call.args)).to.deep.equal([
        ['move', 'mousemove'],
        ['down', 'Enter'],
        ['selection', 'click', { name: 'color', checkedItems: ['red'] }],
        ['click', 'click'],
        ['up', 'Enter'],
      ]),
    );
  });

  it('disabled rerender blocks activation then re-enables with latest callbacks and unchanged selection', () => {
    const click = cy.stub().as('click');
    const change = cy.stub().as('change');
    const Example = () => {
      const [disabled, setDisabled] = React.useState(false);
      return (
        <>
          <button data-testid="update" onClick={() => setDisabled(value => !value)}>
            Toggle disabled
          </button>
          <Surface selection={{ onCheckedValueChange: change }}>
            <Choices secondProps={{ disabled, onClick: click }} />
          </Surface>
        </>
      );
    };
    render(<Example />);
    cy.get(item('beta')).click();
    checked('beta', true);
    cy.get(item('update')).click();
    cy.get(item('beta')).should('have.attr', 'aria-disabled', 'true').focus().realPress('Space');
    checked('beta', true);
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@change').should('have.been.calledOnce');
    cy.get(item('update')).click();
    cy.get(item('alpha')).click();
    checked('beta', false);
    cy.get(item('beta')).click();
    checked('beta', true);
    cy.get('@click').should('have.callCount', 2);
    cy.get('@change').should('have.callCount', 3);
  });

  it('forwards root native attributes/class/style and refs, clearing the ref on unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    const slotRef = React.createRef<HTMLSpanElement>();
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button data-testid="update" onClick={() => setVisible(false)}>
            Remove
          </button>
          <MenuList aria-label="Fonts">
            {visible && (
              <MenuItemRadio
                name="font"
                value="alpha"
                data-testid="alpha"
                id="custom-id"
                className="custom-root"
                title="Native title"
                lang="fr"
                dir="rtl"
                tabIndex={-1}
                style={{ maxWidth: 'none' }}
                ref={ref}
                icon={{ children: 'I', ref: slotRef }}
              >
                Alpha
              </MenuItemRadio>
            )}
          </MenuList>
        </>
      );
    };
    render(<Example />);
    cy.get(item('alpha'))
      .should('have.id', 'custom-id')
      .and('have.class', 'custom-root')
      .and('have.class', 'fui-MenuItemRadio')
      .and('have.attr', 'title', 'Native title')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'tabindex', '-1')
      .and('have.css', 'max-width', 'none')
      .then($el => {
        expect(ref.current).to.equal($el[0]);
        expect(slotRef.current).to.equal($el[0].querySelector('.fui-MenuItemRadio__icon'));
      });
    cy.get(item('alpha')).focus().should('be.focused');
    cy.get(item('update')).click();
    cy.get(item('alpha')).should('not.exist');
    cy.then(() => {
      expect(ref.current).to.equal(null);
      expect(slotRef.current).to.equal(null);
    });
  });

  it('render-function slots retain classes, content props and custom glyph checked visibility', () => {
    render(
      <MenuList aria-label="Fonts">
        <MenuItemRadio
          name="font"
          value="alpha"
          data-testid="alpha"
          icon={{ children: renderSlot('render-icon', 'Icon') }}
          checkmark={{
            children: renderSlot('render-check', '✓'),
            'aria-hidden': true,
          }}
          content={{
            children: renderSlot('render-content', 'Rendered title'),
          }}
          secondaryContent={{
            children: renderSlot('render-secondary', 'Shortcut'),
          }}
          subText={{
            children: renderSlot('render-subtext', 'Descriptor'),
          }}
        >
          Child fallback
        </MenuItemRadio>
      </MenuList>,
    );
    cy.get(item('render-icon')).should('have.class', 'fui-MenuItemRadio__icon').and('have.text', 'Icon');
    cy.get(item('render-content'))
      .should('have.class', 'fui-MenuItemRadio__content')
      .and('have.text', 'Rendered title');
    cy.get(item('render-secondary'))
      .should('have.class', 'fui-MenuItemRadio__secondaryContent')
      .and('have.text', 'Shortcut');
    cy.get(item('render-check')).should('have.css', 'visibility', 'hidden').and('have.text', '✓');
    // A content render function owns its child structure, including whether it renders subText.
    cy.get(item('render-subtext')).should('not.exist');
    cy.get(item('alpha')).click();
    checked('alpha', true);
    cy.get(item('render-check')).should('have.css', 'visibility', 'visible');
  });

  it('content shorthand overrides child fallback and embeds a subText render function', () => {
    render(
      <MenuList aria-label="Fonts">
        <MenuItemRadio
          name="font"
          value="alpha"
          data-testid="alpha"
          content="Explicit title"
          subText={{
            children: renderSlot('render-subtext', 'Descriptor'),
          }}
        >
          Child fallback
        </MenuItemRadio>
      </MenuList>,
    );
    cy.get('.fui-MenuItemRadio__content').should('have.text', 'Explicit titleDescriptor');
    cy.get(item('render-subtext')).should('have.class', 'fui-MenuItemRadio__subText');
    cy.contains('Child fallback').should('not.exist');
  });

  it('default checkmark and alignment icon respond to changing list hints without losing selection', () => {
    const Example = () => {
      const [icons, setIcons] = React.useState(false);
      return (
        <>
          <button data-testid="update" onClick={() => setIcons(value => !value)}>
            Icons
          </button>
          <MenuList
            aria-label="Fonts"
            hasIcons={icons}
            hasCheckmarks={false}
            defaultCheckedValues={{ font: ['alpha'] }}
          >
            <MenuItemRadio name="font" value="alpha" data-testid="alpha">
              Alpha
            </MenuItemRadio>
          </MenuList>
        </>
      );
    };
    render(<Example />);
    checked('alpha', true);
    cy.get('.fui-MenuItemRadio__icon').should('not.exist');
    cy.get(item('update')).click();
    cy.get('.fui-MenuItemRadio__icon').should('exist').and('be.empty');
    checked('alpha', true);
    cy.get(item('update')).click();
    cy.get('.fui-MenuItemRadio__icon').should('not.exist');
    checked('alpha', true);
  });

  it('inherited submenuIndicator is currently not rendered by the radio render function', () => {
    render(
      <MenuList aria-label="Fonts">
        <MenuItemRadio
          name="font"
          value="alpha"
          data-testid="alpha"
          hasSubmenu
          submenuIndicator={{ children: <span data-testid="indicator">Indicator</span> }}
        >
          Alpha
        </MenuItemRadio>
      </MenuList>,
    );
    cy.get(item('indicator')).should('not.exist');
    cy.get('.fui-MenuItemRadio__submenuIndicator, .fui-MenuItem__submenuIndicator').should('not.exist');
    cy.get(item('alpha')).click();
    checked('alpha', true);
  });

  it('array-shaped initial state is read by membership; activation normalizes only its own radio group', () => {
    const change = cy.stub().as('change');
    render(
      <Surface
        selection={{
          defaultCheckedValues: { font: ['alpha', 'beta', 'unrendered'], size: ['large'] },
          onCheckedValueChange: change,
        }}
      />,
    );
    checked('alpha', true);
    checked('beta', true);
    checked('other', true);
    cy.get(item('beta')).click();
    checked('alpha', false);
    checked('beta', true);
    checked('other', true);
    cy.then(() => expect(change.firstCall.args[1]).to.deep.equal({ name: 'font', checkedItems: ['beta'] }));
  });

  it('a missing rendered value stays unchecked; identical values in differently named groups remain independent', () => {
    render(
      <MenuList aria-label="Settings" defaultCheckedValues={{ font: ['not-present'], color: [] }}>
        <MenuItemRadio name="font" value="shared" data-testid="alpha">
          Font
        </MenuItemRadio>
        <MenuItemRadio name="color" value="shared" data-testid="beta">
          Color
        </MenuItemRadio>
      </MenuList>,
    );
    checked('alpha', false);
    checked('beta', false);
    cy.get(item('alpha')).click();
    checked('alpha', true);
    checked('beta', false);
    cy.get(item('beta')).click();
    checked('alpha', true);
    checked('beta', true);
  });

  it('item unmount/reentry preserves list-owned selection, while owner remount resets defaults', () => {
    const change = cy.stub().as('change');
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      const [key, setKey] = React.useState(0);
      return (
        <>
          <button data-testid="toggle" onClick={() => setVisible(value => !value)}>
            Toggle items
          </button>
          <button data-testid="reset" onClick={() => setKey(value => value + 1)}>
            Reset list
          </button>
          <MenuList
            key={key}
            aria-label="Fonts"
            defaultCheckedValues={{ font: ['alpha'] }}
            onCheckedValueChange={change}
          >
            {visible && <Choices />}
          </MenuList>
        </>
      );
    };
    render(<Example />);
    cy.get(item('beta')).click();
    checked('beta', true);
    cy.get(item('toggle')).click();
    cy.get('[role="menuitemradio"]').should('not.exist');
    cy.get(item('toggle')).click();
    checked('beta', true);
    checked('alpha', false);
    cy.get(item('reset')).click();
    checked('alpha', true);
    checked('beta', false);
    cy.get('@change').should('have.been.calledOnce');
  });

  it('memoized radio children update through controlled context rather than stale props', () => {
    const Memo = React.memo(Choices);
    const Example = () => {
      const [values, setValues] = React.useState({ font: ['alpha'] });
      return (
        <MenuList
          aria-label="Fonts"
          checkedValues={values}
          onCheckedValueChange={(_, data) => setValues(current => ({ ...current, [data.name]: data.checkedItems }))}
        >
          <Memo />
        </MenuList>
      );
    };
    render(<Example />);
    checked('alpha', true);
    cy.get(item('beta')).click();
    checked('alpha', false);
    checked('beta', true);
  });

  it('adjacent standalone lists isolate identical name/value groups and exact callbacks', () => {
    const left = cy.stub().as('left');
    const right = cy.stub().as('right');
    render(
      <>
        <div data-testid="left">
          <Surface selection={{ onCheckedValueChange: left }} />
        </div>
        <div data-testid="right">
          <Surface selection={{ defaultCheckedValues: { font: ['alpha'] }, onCheckedValueChange: right }} />
        </div>
      </>,
    );
    cy.get(`${item('left')} ${item('beta')}`)
      .click()
      .should('have.attr', 'aria-checked', 'true');
    cy.get(`${item('right')} ${item('beta')}`).should('have.attr', 'aria-checked', 'false');
    cy.get(`${item('right')} ${item('alpha')}`).should('have.attr', 'aria-checked', 'true');
    cy.get('@left').should('have.been.calledOnce');
    cy.get('@right').should('not.have.been.called');
    cy.get(`${item('right')} ${item('beta')}`)
      .click()
      .should('have.attr', 'aria-checked', 'true');
    cy.get('@right').should('have.been.calledOnce');
  });

  for (const persist of [false, true]) {
    it(`nested Menu radio context is isolated and persistOnClick=${persist} controls stack dismissal`, () => {
      const parent = cy.stub().as('parent');
      const child = cy.stub().as('child');
      render(
        <Surface popup selection={{ defaultCheckedValues: { font: ['alpha'] }, onCheckedValueChange: parent }}>
          <Choices />
          <Menu
            onCheckedValueChange={child}
            defaultCheckedValues={{ font: ['one'] }}
            surfaceMotion={null}
            openOnHover={false}
          >
            <MenuTrigger disableButtonEnhancement>
              <MenuItem data-testid="subtrigger">More</MenuItem>
            </MenuTrigger>
            <MenuPopover data-testid="subpopover">
              <MenuList>
                <MenuItemRadio name="font" value="one" data-testid="one">
                  One
                </MenuItemRadio>
                <MenuItemRadio name="font" value="two" data-testid="two" persistOnClick={persist}>
                  Two
                </MenuItemRadio>
              </MenuList>
            </MenuPopover>
          </Menu>
        </Surface>,
      );
      open(true);
      cy.get(item('subtrigger')).focus().realPress('ArrowRight');
      cy.get(item('subpopover')).should('be.visible');
      checked('one', true);
      checked('two', false);
      cy.get(item('two')).click();
      if (persist) {
        checked('two', true);
        checked('one', false);
        checked('alpha', true);
        cy.get(item('popover')).should('be.visible');
        cy.get(item('two')).focus().realPress('Escape');
        cy.get(item('subtrigger')).should('be.focused');
      } else {
        cy.get(item('subpopover')).should('not.exist');
        cy.get(item('popover')).should('not.exist');
        open(true);
      }
      checked('alpha', true);
      cy.get('@parent').should('not.have.been.called');
      cy.get('@child').should('have.been.calledOnce');
      cy.then(() => expect(child.firstCall.args[1]).to.deep.equal({ name: 'font', checkedItems: ['two'] }));
    });
  }

  it('explicit MenuList controlled selection and callback override Menu ownership', () => {
    const parent = cy.stub().as('parent');
    const list = cy.stub().as('list');
    const Example = () => {
      const [values, setValues] = React.useState({ font: ['beta'] });
      return (
        <Menu defaultOpen persistOnItemClick defaultCheckedValues={{ font: ['alpha'] }} onCheckedValueChange={parent}>
          <MenuTrigger disableButtonEnhancement>
            <button>Fonts</button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList
              checkedValues={values}
              onCheckedValueChange={(event, data) => {
                list(event, data);
                setValues(current => ({ ...current, [data.name]: data.checkedItems }));
              }}
            >
              <Choices />
            </MenuList>
          </MenuPopover>
        </Menu>
      );
    };
    render(<Example />);
    checked('beta', true);
    checked('alpha', false);
    cy.get(item('alpha')).click();
    checked('alpha', true);
    checked('beta', false);
    cy.get('@parent').should('not.have.been.called');
    cy.get('@list').should('have.been.calledOnce');
    cy.then(() => expect(list.firstCall.args[1]).to.deep.equal({ name: 'font', checkedItems: ['alpha'] }));
  });

  it('slot and accessible name/description rerenders preserve selection and root identity', () => {
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button data-testid="update" onClick={() => setUpdated(value => !value)}>
            Update slots
          </button>
          <MenuList aria-label="Fonts" defaultCheckedValues={{ font: ['alpha'] }}>
            <MenuItemRadio
              name="font"
              value="alpha"
              data-testid="alpha"
              aria-label={updated ? 'New name' : 'Old name'}
              aria-describedby={updated ? 'new-details' : 'old-details'}
              icon={updated ? null : 'I'}
              checkmark={updated ? '✓' : undefined}
              secondaryContent={updated ? 'Updated shortcut' : null}
              subText={{
                id: updated ? 'new-details' : 'old-details',
                children: updated ? 'New description' : 'Old description',
              }}
            >
              {updated ? 'New title' : 'Old title'}
            </MenuItemRadio>
          </MenuList>
        </>
      );
    };
    render(<Example />);
    let element: HTMLElement;
    cy.get(item('alpha')).then($el => {
      element = $el[0];
      expect(computeAccessibleName(element)).to.equal('Old name');
      expect(computeAccessibleDescription(element)).to.equal('Old description');
    });
    checked('alpha', true);
    cy.get(item('alpha')).find(`${checkmark} svg`).should('exist');
    cy.get(item('update')).click();
    checked('alpha', true);
    cy.get(item('alpha')).then($el => {
      expect($el[0]).to.equal(element);
      expect(computeAccessibleName($el[0])).to.equal('New name');
      expect(computeAccessibleDescription($el[0])).to.equal('New description');
    });
    cy.get(item('alpha')).find(checkmark).should('have.text', '✓').find('svg').should('not.exist');
    cy.get(item('alpha')).find('.fui-MenuItemRadio__icon').should('not.exist');
    cy.get('.fui-MenuItemRadio__secondaryContent').should('have.text', 'Updated shortcut');
    cy.get('#old-details').should('not.exist');
    cy.get(item('update')).click();
    checked('alpha', true);
    cy.get(item('alpha')).find(`${checkmark} svg`).should('exist');
    cy.get(item('alpha')).find('.fui-MenuItemRadio__icon').should('have.text', 'I');
    cy.get('.fui-MenuItemRadio__secondaryContent').should('not.exist');
  });

  it('standalone list is one tab stop with radio arrows selecting only on activation', () => {
    const change = cy.stub().as('change');
    render(
      <>
        <button data-testid="before">Before</button>
        <Surface selection={{ onCheckedValueChange: change }} />
        <button data-testid="after">After</button>
      </>,
    );
    cy.get(item('before')).focus().realPress('Tab');
    cy.get(item('alpha')).should('be.focused').realPress('ArrowDown');
    cy.get(item('beta')).should('be.focused').realPress('Tab');
    cy.get(item('after')).should('be.focused').realPress(['Shift', 'Tab']);
    cy.get(item('beta')).should('be.focused').realPress('Space');
    checked('beta', true);
    cy.get('@change').should('have.been.calledOnce');
  });

  for (const key of ['Tab', ['Shift', 'Tab']] as const) {
    it(`popup ${typeof key === 'string' ? key : key.join('+')} dismisses without radio activation`, () => {
      const change = cy.stub().as('change');
      render(
        <>
          <button data-testid="before">Before</button>
          <Surface popup selection={{ defaultCheckedValues: { font: ['alpha'] }, onCheckedValueChange: change }} />
          <button data-testid="after">After</button>
        </>,
      );
      open(true);
      cy.get(item('beta'))
        .focus()
        .realPress(typeof key === 'string' ? key : [...key]);
      cy.get(item('popover')).should('not.exist');
      cy.get(item(typeof key === 'string' ? 'after' : 'before')).should('be.focused');
      open(true);
      checked('alpha', true);
      checked('beta', false);
      cy.get('@change').should('not.have.been.called');
    });
  }

  it('disabled popup radio never closes the menu or selects; enabled pointer control does both', () => {
    const change = cy.stub().as('change');
    const close = cy.stub().as('close');
    render(
      <Surface popup selection={{ onCheckedValueChange: change }} menuProps={{ onOpenChange: close }}>
        <Choices secondProps={{ disabled: true }} />
      </Surface>,
    );
    open(true);
    cy.get(item('beta')).click().realPress('Enter');
    cy.get(item('beta')).realPress('Space');
    cy.get(item('popover')).should('be.visible');
    checked('beta', false);
    cy.get('@change').should('not.have.been.called');
    cy.get('@close').should('have.been.calledOnce');
    cy.get(item('alpha')).click();
    cy.get(item('popover')).should('not.exist');
    cy.get('@change').should('have.been.calledOnce');
    cy.get('@close').should('have.callCount', 2);
  });

  it('selection callback preventDefault is advisory and does not suppress uncontrolled state update', () => {
    const change = cy.stub().as('change');
    render(
      <Surface
        selection={{
          onCheckedValueChange: (event, data) => {
            event.preventDefault();
            change(event, data);
          },
        }}
      />,
    );
    cy.get(item('beta')).click();
    checked('alpha', false);
    checked('beta', true);
    cy.get('@change').should('have.been.calledOnce');
    cy.then(() => {
      expect(change.firstCall.args[0].isDefaultPrevented()).to.equal(true);
      expect(change.firstCall.args[1]).to.deep.equal({ name: 'font', checkedItems: ['beta'] });
    });
  });

  it('null/default checkmark rerenders stay omitted/visible in a list reserving alignment', () => {
    const Example = () => {
      const [omit, setOmit] = React.useState(false);
      return (
        <>
          <button data-testid="update" onClick={() => setOmit(value => !value)}>
            Toggle checkmark
          </button>
          <MenuList aria-label="Fonts" hasCheckmarks defaultCheckedValues={{ font: ['alpha'] }}>
            <MenuItemRadio name="font" value="alpha" data-testid="alpha" checkmark={omit ? null : undefined}>
              Alpha
            </MenuItemRadio>
          </MenuList>
        </>
      );
    };
    render(<Example />);
    checked('alpha', true);
    cy.get(item('update')).click();
    cy.get(item('alpha')).should('have.attr', 'aria-checked', 'true').find(checkmark).should('not.exist');
    cy.get(item('update')).click();
    checked('alpha', true);
    cy.get(item('alpha')).find(`${checkmark} svg`).should('exist');
  });
});
