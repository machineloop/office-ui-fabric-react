import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { getByRole } from '@testing-library/dom';
import { bundleIcon, CutFilled, CutRegular, ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { slot } from '@fluentui/react-utilities';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuSplitGroup,
  MenuItemCheckbox,
  menuItemClassNames,
} from '@fluentui/react-menu';
import type { MenuProps } from '@fluentui/react-menu';
import { MenuItem } from './MenuItem';
import type { MenuItemProps } from './MenuItem.types';
import type { MenuItemState } from './MenuItem.types';
import { useMenuItem_unstable } from './useMenuItem';
import { useMenuItemBase_unstable } from './useMenuItemBase';
import { renderMenuItem_unstable } from './renderMenuItem';
import { useMenuItemStyles_unstable } from './useMenuItemStyles.styles';
import { MenuTriggerContextProvider } from '../../contexts/menuTriggerContext';

const CutIcon = bundleIcon(CutFilled, CutRegular);
const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr') =>
  mountBase(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
const ItemMenu = ({
  children,
  ...props
}: Pick<
  MenuProps,
  'children' | 'persistOnItemClick' | 'hasIcons' | 'hasCheckmarks' | 'openOnContext' | 'openOnHover'
>) => (
  <Menu {...props}>
    <MenuTrigger disableButtonEnhancement>
      <button id="trigger">Commands</button>
    </MenuTrigger>
    <MenuPopover id="popover">
      <MenuList>{children}</MenuList>
    </MenuPopover>
  </Menu>
);
const open = () => {
  cy.get('#trigger').realClick();
  cy.get('#popover').should('be.visible');
};
const named = (name: string, description?: string) =>
  cy
    .get('[data-cy-root]')
    .should($root => expect(getByRole($root[0].ownerDocument.body, 'menuitem', { name, description })).to.exist);
const glyph = (selector: string, reference: string) =>
  cy
    .get(selector)
    .should($icon =>
      expect($icon[0].querySelector('path')!.getAttribute('d')).to.equal(
        $icon[0].ownerDocument.querySelector(`${reference} path`)!.getAttribute('d'),
      ),
    );

describe('MenuItem documented activation', () => {
  for (const activation of ['pointer', 'Enter', 'Space'] as const) {
    it(`activates the documented command once with ${activation} and restores trigger focus`, () => {
      const onClick = cy.stub().as('action');
      mount(
        <ItemMenu>
          <MenuItem id="item" onClick={onClick}>
            New file
          </MenuItem>
        </ItemMenu>,
      );
      open();
      cy.get('#item').should('be.focused');
      named('New file');
      if (activation === 'pointer') {
        cy.get('#item').realClick();
      } else {
        cy.realPress(activation);
      }
      cy.get('@action').should('have.been.calledOnce');
      cy.get('#popover').should('not.exist');
      cy.get('#trigger').should('be.focused');
    });
  }
});

describe('MenuItem supported edges and accessibility', () => {
  for (const policy of ['item', 'context', 'override'] as const) {
    for (const activation of ['pointer', 'Enter', 'Space'] as const) {
      it(`honors ${policy} persistence with ${activation} activation`, () => {
        const action = cy.stub().as('action');
        mount(
          <ItemMenu persistOnItemClick={policy !== 'item'}>
            <MenuItem
              id="item"
              persistOnClick={policy === 'item' ? true : policy === 'override' ? false : undefined}
              onClick={action}
            >
              Keep working
            </MenuItem>
          </ItemMenu>,
        );
        open();
        if (activation === 'pointer') {
          cy.get('#item').realClick();
        } else {
          cy.realPress(activation);
        }
        cy.get('@action').should('have.been.calledOnce');
        if (policy === 'override') {
          cy.get('#popover').should('not.exist');
          cy.get('#trigger').should('be.focused');
        } else {
          cy.get('#popover').should('be.visible');
          cy.get('#item').should('be.focused');
          cy.realPress('Escape');
          cy.get('#popover').should('not.exist');
          cy.get('#trigger').should('be.focused');
        }
      });
    }
  }

  for (const key of ['Enter', 'Space'] as const) {
    it(`lets caller preventDefault cancel native ${key} activation and restores the handler`, () => {
      const action = cy.stub().as('action');
      const Updating = () => {
        const [prevent, setPrevent] = React.useState(true);
        return (
          <>
            <button id="update" onClick={() => setPrevent(value => !value)}>
              Update
            </button>
            <MenuList>
              <MenuItem
                id="item"
                onClick={action}
                onKeyDown={prevent ? event => event.preventDefault() : undefined}
                onKeyUp={prevent ? event => event.preventDefault() : undefined}
              >
                Command
              </MenuItem>
            </MenuList>
          </>
        );
      };
      mount(<Updating />);
      cy.get('#item').realHover().should('be.focused');
      cy.realPress(key);
      cy.get('@action').should('not.have.been.called');
      cy.get('#update').realClick();
      cy.get('#item').realHover().should('be.focused');
      cy.realPress(key);
      cy.get('@action').should('have.been.calledOnce');
      cy.get('#update').realClick();
      cy.get('#item').realHover().should('be.focused');
      cy.realPress(key);
      cy.get('@action').should('have.been.calledOnce');
    });
  }

  for (const disabled of [false, true]) {
    for (const disabledFocusable of [false, true]) {
      it(`keeps deprecated disabledFocusable=${disabledFocusable} inert with disabled=${disabled}`, () => {
        const action = cy.stub().as('action');
        const props: MenuItemProps = {
          disabled,
          disabledFocusable,
        };
        mount(
          <MenuList>
            <MenuItem id="item" {...props} onClick={action}>
              Command
            </MenuItem>
          </MenuList>,
        );
        cy.get('#item').realHover().should('be.focused');
        cy.realPress('Enter');
        cy.get('@action').should(disabled ? 'not.have.been.called' : 'have.been.calledOnce');
        cy.get('#item').should('have.attr', 'tabindex', '0');
      });
    }
  }

  it('focuses a disabled item on native mousemove without activating it or its ancestors', () => {
    const action = cy.stub().as('action');
    const parent = cy.stub().as('parent');
    mount(
      <div onClick={parent}>
        <button id="away">Away</button>
        <MenuList>
          <MenuItem id="item" disabled onClick={action}>
            Unavailable
          </MenuItem>
        </MenuList>
      </div>,
    );
    cy.get('#away').focus();
    cy.get('#item').realHover().should('be.focused').realClick();
    cy.get('@action').should('not.have.been.called');
    cy.get('@parent').should('not.have.been.called');
  });

  for (const opening of ['context', 'hover'] as const) {
    it(`activates and restores focus from a real ${opening}-opened menu`, () => {
      const action = cy.stub().as('action');
      mount(
        <ItemMenu openOnContext={opening === 'context'} openOnHover={opening === 'hover'}>
          <MenuItem id="item" onClick={action}>
            Command
          </MenuItem>
        </ItemMenu>,
      );
      if (opening === 'context') {
        cy.get('#trigger').realClick({ button: 'right' });
      } else {
        cy.get('#trigger').realHover();
      }
      cy.get('#popover').should('be.visible');
      cy.get('#item').realHover().should('be.focused');
      cy.realPress('Enter');
      cy.get('@action').should('have.been.calledOnce');
      cy.get('#popover').should('not.exist');
      cy.get('#trigger').should('be.focused');
    });
  }

  it('opens a submenu on native hover without activating the trigger and Escape restores its focus', () => {
    const action = cy.stub().as('action');
    mount(
      <ItemMenu>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <MenuItem id="submenu-item" onClick={action}>
              More
            </MenuItem>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem id="child-item">Child command</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </ItemMenu>,
    );
    open();
    cy.get('#submenu-item').realHover();
    cy.get('#child-item').should('be.visible');
    cy.get('@action').should('not.have.been.called');
    cy.get('#child-item').realHover().should('be.focused');
    cy.realPress('Escape');
    cy.get('#child-item').should('not.exist');
    cy.get('#submenu-item').should('be.focused').and('have.attr', 'aria-expanded', 'false');
    cy.get('#popover').should('be.visible');
  });

  it('removes disabled, submenu, persistence and optional slots on omission without replacing the root', () => {
    const action = cy.stub().as('action');
    let original: HTMLElement;
    const Updating = () => {
      const [special, setSpecial] = React.useState(true);
      return (
        <>
          <button id="update" onClick={() => setSpecial(false)}>
            Defaults
          </button>
          <MenuList>
            <MenuItem
              id="item"
              disabled={special ? true : undefined}
              hasSubmenu={special ? true : undefined}
              persistOnClick={special ? true : undefined}
              icon={special ? <CutIcon /> : undefined}
              checkmark={special ? 'Selected' : undefined}
              subText={special ? 'Details' : undefined}
              secondaryContent={special ? 'Shortcut' : undefined}
              onClick={action}
            >
              Command
            </MenuItem>
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#item')
      .should('have.attr', 'aria-disabled', 'true')
      .then($item => {
        original = $item[0];
      });
    cy.get('#item').find('span').should('have.length', 6);
    cy.get('#update').realClick();
    cy.get('#item').should($item => expect($item[0]).to.equal(original));
    cy.get('#item').should('not.have.attr', 'aria-disabled');
    cy.get('#item').find('span').should('have.length', 1);
    named('Command');
    cy.get('#item').realHover().should('be.focused');
    cy.realPress('Space');
    cy.get('@action').should('have.been.calledOnce');
  });

  it('suppresses explicit null slots even when alignment and submenu defaults would create them', () => {
    mount(
      <MenuList hasIcons hasCheckmarks>
        <MenuItem
          id="item"
          hasSubmenu
          icon={null}
          checkmark={null}
          submenuIndicator={null}
          content={null}
          secondaryContent={null}
          subText="Orphan details"
          aria-label="Named command"
        >
          Ignored content
        </MenuItem>
      </MenuList>,
    );
    named('Named command');
    cy.get('#item').should('have.text', '').find('span').should('not.exist');
  });

  it('prioritizes content shorthand and preserves explicit numeric and empty content', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="update" onClick={() => setPhase(value => value + 1)}>
            Update
          </button>
          <MenuList>
            <MenuItem id="item" content={phase === 0 ? 'Override' : phase === 1 ? 0 : ''}>
              Fallback
            </MenuItem>
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    named('Override');
    cy.get('#update').realClick();
    named('0');
    cy.get('#update').realClick();
    cy.get('#item').find(`.${menuItemClassNames.content}`).should('have.text', '');
    cy.get('#item').should('not.contain.text', 'Fallback');
  });

  it('updates native accessible name, description, role overrides and div as without stale relationships', () => {
    const Updating = () => {
      const [custom, setCustom] = React.useState(true);
      return (
        <>
          <button id="update" onClick={() => setCustom(false)}>
            Defaults
          </button>
          <span id="label">External label</span>
          <span id="description">External description</span>
          <MenuList>
            <MenuItem
              id="item"
              as="div"
              {...(custom ? { role: 'menuitemcheckbox' } : {})}
              aria-checked={custom ? 'true' : undefined}
              aria-labelledby={custom ? 'label' : undefined}
              aria-describedby={custom ? 'description' : undefined}
            >
              Visible command
            </MenuItem>
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    cy.get('[data-cy-root]').should(
      $root =>
        expect(
          getByRole($root[0], 'menuitemcheckbox', {
            name: 'External label',
            description: 'External description',
            checked: true,
          }),
        ).to.exist,
    );
    cy.get('#item').should('have.prop', 'tagName', 'DIV');
    cy.get('#update').realClick();
    named('Visible command', '');
    cy.get('#item').should('not.have.attr', 'aria-checked');
    cy.get('#item').should('not.have.attr', 'aria-labelledby');
    cy.get('#item').should('not.have.attr', 'aria-describedby');
  });

  it('forwards latest native handlers, removes and restores them and clears the root ref on unmount', () => {
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const mouse = cy.stub().as('mouse');
    const key = cy.stub().as('key');
    const ref = React.createRef<HTMLDivElement>();
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="update" onClick={() => setPhase(value => value + 1)}>
            Update
          </button>
          <MenuList>
            {phase < 4 && (
              <MenuItem
                id="item"
                ref={ref}
                persistOnClick
                onClick={phase === 0 ? first : phase === 2 ? undefined : latest}
                onMouseMove={phase === 2 ? undefined : mouse}
                onKeyDown={phase === 2 ? undefined : key}
              >
                Command
              </MenuItem>
            )}
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#item')
      .should($item => expect(ref.current).to.equal($item[0]))
      .realClick();
    cy.get('@first').should('have.been.calledOnce');
    cy.get('#update').realClick();
    cy.get('#item').realHover().should('be.focused');
    cy.realPress('Enter');
    cy.get('@latest').should('have.been.calledOnce');
    cy.get('@key').should('have.been.calledOnce');
    cy.get('@mouse').should('have.been.called');
    cy.get('#update').realClick();
    cy.then(() => {
      mouse.resetHistory();
      key.resetHistory();
    });
    cy.get('#item').realHover().should('be.focused').realClick();
    cy.realPress('Space');
    cy.get('@latest').should('have.been.calledOnce');
    cy.get('@key').should('not.have.been.called');
    cy.get('@mouse').should('not.have.been.called');
    cy.get('#update').realClick();
    cy.get('#item').realClick();
    cy.get('@latest').should('have.been.calledTwice');
    cy.get('@first').should('have.been.calledOnce');
    cy.get('#update').realClick();
    cy.get('#item')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('preserves and removes consumer classes and token inline styles on every slot', () => {
    const Updating = () => {
      const [custom, setCustom] = React.useState(true);
      const options = (name: string) => ({
        className: custom ? `consumer-${name}` : undefined,
        style: custom ? { color: teamsLightTheme.colorPaletteRedForeground1 } : undefined,
        children: name,
      });
      return (
        <>
          <button id="update" onClick={() => setCustom(false)}>
            Defaults
          </button>
          <MenuList>
            <MenuItem
              id="item"
              className={custom ? 'consumer-root' : undefined}
              style={custom ? { maxWidth: 'none' } : undefined}
              icon={options('icon')}
              checkmark={options('checkmark')}
              content={options('content')}
              subText={options('subText')}
              secondaryContent={options('secondaryContent')}
              submenuIndicator={options('submenuIndicator')}
            />
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#item').should('have.class', 'consumer-root').and('have.css', 'max-width', 'none');
    for (const name of ['icon', 'checkmark', 'content', 'subText', 'secondaryContent', 'submenuIndicator'] as const) {
      cy.get(`.${menuItemClassNames[name]}`).should('have.class', `consumer-${name}`).and('have.attr', 'style');
    }
    cy.get('#update').realClick();
    cy.get('#item').should('not.have.class', 'consumer-root').and('have.css', 'max-width', '290px');
    for (const name of ['icon', 'checkmark', 'content', 'subText', 'secondaryContent', 'submenuIndicator'] as const) {
      cy.get(`.${menuItemClassNames[name]}`)
        .should('not.have.class', `consumer-${name}`)
        .should($slot => expect($slot[0].style.color).to.equal(''));
    }
  });

  it('applies and removes the provider style hook and live theme tokens without losing native activation', () => {
    const action = cy.stub().as('action');
    const customStyle = (state: unknown) => {
      const item = state as MenuItemState;
      item.root.style = { ...item.root.style, maxWidth: 'none' };
    };
    const Updating = () => {
      const [custom, setCustom] = React.useState(true);
      return (
        <FluentProvider
          theme={
            custom ? { ...teamsLightTheme, borderRadiusMedium: teamsLightTheme.borderRadiusXLarge } : teamsLightTheme
          }
          customStyleHooks_unstable={
            custom
              ? {
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  useMenuItemStyles_unstable: customStyle,
                }
              : {}
          }
        >
          <button id="update" onClick={() => setCustom(false)}>
            Defaults
          </button>
          <MenuList>
            <MenuItem id="item" onClick={action}>
              Command
            </MenuItem>
          </MenuList>
        </FluentProvider>
      );
    };
    mount(<Updating />);
    cy.get('#item')
      .should('have.css', 'max-width', 'none')
      .and('have.css', 'border-top-left-radius', teamsLightTheme.borderRadiusXLarge);
    cy.get('#update').realClick();
    cy.get('#item')
      .should('have.css', 'max-width', '290px')
      .and('have.css', 'border-top-left-radius', teamsLightTheme.borderRadiusMedium);
    cy.get('#item').realHover().should('be.focused');
    cy.realPress('Enter');
    cy.get('@action').should('have.been.calledOnce');
  });
});

describe('MenuItem documented layout and composition', () => {
  for (const activation of ['pointer', 'Enter', 'Space'] as const) {
    it(`keeps the documented disabled command focusable but blocks ${activation}`, () => {
      const onClick = cy.stub().as('action');
      mount(
        <ItemMenu>
          <MenuItem id="item" disabled onClick={onClick}>
            Open file
          </MenuItem>
        </ItemMenu>,
      );
      open();
      cy.get('#item').should('be.focused').and('have.attr', 'aria-disabled', 'true');
      if (activation === 'pointer') {
        cy.get('#item').realClick();
      } else {
        cy.realPress(activation);
      }
      cy.get('@action').should('not.have.been.called');
      cy.get('#popover').should('be.visible');
      cy.get('#item').should('be.focused');
      cy.realPress('Escape');
      cy.get('#trigger').should('be.focused');
    });
  }

  it('renders the documented exact bundled decorative icon and switches its variant on hover', () => {
    mount(
      <>
        <span id="cut-reference" hidden>
          <CutRegular />
        </span>
        <span id="cut-filled-reference" hidden>
          <CutFilled />
        </span>
        <MenuList>
          <MenuItem id="item" icon={<CutIcon />}>
            Cut
          </MenuItem>
        </MenuList>
        <button id="away">Away</button>
      </>,
    );
    cy.get('#away').realHover();
    glyph('#item .fui-Icon-regular', '#cut-reference');
    cy.get('#item .fui-Icon-regular').should('be.visible').and('have.attr', 'aria-hidden', 'true');
    cy.get('#item .fui-Icon-filled').should('not.be.visible');
    named('Cut');
    cy.get('#item').realHover().should('be.focused');
    glyph('#item .fui-Icon-filled', '#cut-filled-reference');
    cy.get('#item .fui-Icon-filled').should('be.visible');
    cy.get('#item .fui-Icon-regular').should('not.be.visible');
  });

  it('includes documented shortcut text in the computed name without giving it keyboard behavior', () => {
    const action = cy.stub().as('action');
    mount(
      <MenuList>
        <MenuItem id="item" secondaryContent="Ctrl+N" onClick={action}>
          New file
        </MenuItem>
      </MenuList>,
    );
    named('New file Ctrl+N');
    cy.get(`.${menuItemClassNames.secondaryContent}`).should('have.text', 'Ctrl+N');
    cy.get('#item').realHover().should('be.focused');
    cy.realPress(['Control', 'n']);
    cy.get('@action').should('not.have.been.called');
    cy.realPress('Enter');
    cy.get('@action').should('have.been.calledOnce');
  });

  for (const disabled of [false, true]) {
    it(`lays out documented multiline content with disabled=${disabled}`, () => {
      mount(
        <MenuList>
          <MenuItem
            id="item"
            disabled={disabled}
            subText="Cut to clipboard"
            secondaryContent="Ctrl+X"
            icon={<CutIcon />}
          >
            Cut
          </MenuItem>
        </MenuList>,
      );
      named('Cut Cut to clipboard Ctrl+X');
      cy.get(`.${menuItemClassNames.content}`).should('have.css', 'flex-direction', 'column');
      cy.get(`.${menuItemClassNames.subText}`).should($text => {
        const content = $text[0].parentElement!;
        expect(content.classList.contains(menuItemClassNames.content)).to.equal(true);
        expect($text[0].getBoundingClientRect().top).to.be.greaterThan(content.getBoundingClientRect().top);
      });
      cy.get(`.${menuItemClassNames.secondaryContent}`).should('have.css', 'align-self', 'center');
    });
  }

  for (const alignment of ['icons', 'checkmarks', 'both'] as const) {
    it(`aligns documented mixed rows using ${alignment} context`, () => {
      mount(
        <MenuList hasIcons={alignment !== 'checkmarks'} hasCheckmarks={alignment !== 'icons'}>
          {alignment === 'icons' ? (
            <MenuItem id="selectable" icon={<CutIcon />}>
              With icon
            </MenuItem>
          ) : (
            <MenuItemCheckbox
              id="selectable"
              name="edit"
              value="cut"
              icon={alignment === 'both' ? <CutIcon /> : undefined}
            >
              Selectable
            </MenuItemCheckbox>
          )}
          <MenuItem id="item">Command</MenuItem>
        </MenuList>,
      );
      cy.get('#item').should($item => {
        expect($item[0].querySelectorAll(`.${menuItemClassNames.icon}`).length).to.equal(
          alignment !== 'checkmarks' ? 1 : 0,
        );
        expect($item[0].querySelectorAll(`.${menuItemClassNames.checkmark}`).length).to.equal(
          alignment !== 'icons' ? 1 : 0,
        );
        const own = $item[0].querySelector(`.${menuItemClassNames.content}`)!.getBoundingClientRect();
        const other = $item[0].ownerDocument
          .querySelector(
            alignment === 'icons' ? '#selectable .fui-MenuItem__content' : '#selectable .fui-MenuItemCheckbox__content',
          )!
          .getBoundingClientRect();
        expect(own.left).to.be.closeTo(other.left, 1);
      });
      named('Command');
    });
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`opens the documented ${dir} submenu by native arrow and closes the chain from its command`, () => {
      const action = cy.stub().as('action');
      mount(
        <>
          <span id="chevron-reference" hidden>
            {dir === 'ltr' ? <ChevronRightRegular /> : <ChevronLeftRegular />}
          </span>
          <ItemMenu>
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <MenuItem id="submenu-item">Preferences</MenuItem>
              </MenuTrigger>
              <MenuPopover id="child-popover">
                <MenuList>
                  <MenuItem id="child-item" onClick={action}>
                    Settings
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </ItemMenu>
        </>,
        dir,
      );
      open();
      cy.get('#submenu-item')
        .should('be.focused')
        .and('have.attr', 'aria-haspopup', 'menu')
        .and('have.attr', 'aria-expanded', 'false');
      glyph('#submenu-item .fui-Icon-regular', '#chevron-reference');
      cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#child-item').should('be.focused');
      cy.get('#submenu-item').should('have.attr', 'aria-expanded', 'true');
      cy.get('#child-item').realClick();
      cy.get('@action').should('have.been.calledOnce');
      cy.get('#popover').should('not.exist');
      cy.get('#child-popover').should('not.exist');
      cy.get('#trigger').should('be.focused');
    });
  }

  it('splits the documented main command from a separately named submenu trigger', () => {
    const action = cy.stub().as('action');
    mount(
      <ItemMenu hasIcons hasCheckmarks>
        <Menu>
          <MenuSplitGroup>
            <MenuItem id="main-item" subText="Choose platform" onClick={action}>
              Open
            </MenuItem>
            <MenuTrigger disableButtonEnhancement>
              <MenuItem id="split-trigger" aria-label="Open on platform" />
            </MenuTrigger>
          </MenuSplitGroup>
          <MenuPopover>
            <MenuList>
              <MenuItem id="child-item">In browser</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </ItemMenu>,
    );
    open();
    named('Open on platform');
    cy.get('#split-trigger').find(`.${menuItemClassNames.icon}, .${menuItemClassNames.checkmark}`).should('not.exist');
    cy.get('#split-trigger').realClick();
    cy.get('#child-item').should('be.visible');
    cy.get('@action').should('not.have.been.called');
    cy.realPress('Escape');
    cy.get('#main-item').realClick();
    cy.get('@action').should('have.been.calledOnce');
    cy.get('#popover').should('not.exist');
  });
});

describe('MenuItem meaningful unit-derived contracts', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const key of ['Enter', 'Space'] as const) {
      it(`opens the ${dir} submenu with native ${key} without dismissing the parent or duplicating callbacks`, () => {
        const action = cy.stub().as('trigger-action');
        const change = cy.stub().as('submenu-change');
        mount(
          <ItemMenu>
            <Menu onOpenChange={change}>
              <MenuTrigger disableButtonEnhancement>
                <MenuItem id="submenu-item" onClick={action}>
                  More
                </MenuItem>
              </MenuTrigger>
              <MenuPopover id="child-popover">
                <MenuList>
                  <MenuItem id="child-item">Child command</MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </ItemMenu>,
          dir,
        );
        open();
        cy.get('#submenu-item').should('be.focused').and('have.attr', 'aria-expanded', 'false');
        cy.realPress(key);
        cy.get('#child-popover').should('be.visible');
        cy.get('#child-item').should('be.focused');
        cy.get('#submenu-item').should('have.attr', 'aria-expanded', 'true');
        cy.get('#popover').should('be.visible');
        cy.get('@trigger-action').should('have.been.calledOnce');
        cy.get('@submenu-change').should('have.been.calledOnce');
        cy.realPress('Escape');
        cy.get('#child-popover').should('not.exist');
        cy.get('#submenu-item').should('be.focused').and('have.attr', 'aria-expanded', 'false');
        cy.get('#popover').should('be.visible');
        cy.get('@submenu-change').should('have.been.calledTwice');
        cy.realPress('Escape');
        cy.get('#popover').should('not.exist');
        cy.get('#trigger').should('be.focused');
      });
    }
  }

  for (const activation of ['pointer', 'Enter', 'Space', 'ArrowRight', 'hover'] as const) {
    it(`blocks disabled submenu ${activation} then opens normally after a live enabled transition`, () => {
      const action = cy.stub().as('trigger-action');
      const change = cy.stub().as('submenu-change');
      const Updating = () => {
        const [disabled, setDisabled] = React.useState(true);
        return (
          <ItemMenu>
            <Menu onOpenChange={change}>
              <MenuTrigger disableButtonEnhancement>
                <MenuItem id="submenu-item" disabled={disabled} onClick={action}>
                  More
                </MenuItem>
              </MenuTrigger>
              <MenuPopover id="child-popover">
                <MenuList>
                  <MenuItem id="child-item">Child command</MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
            <MenuItem id="enable" persistOnClick onClick={() => setDisabled(false)}>
              Enable submenu
            </MenuItem>
          </ItemMenu>
        );
      };
      mount(<Updating />);
      open();
      cy.get('#submenu-item').realHover().should('be.focused').and('have.attr', 'aria-disabled', 'true');
      if (activation === 'pointer') {
        cy.get('#submenu-item').realClick();
      } else if (activation !== 'hover') {
        cy.realPress(activation);
      }
      cy.get('#child-popover').should('not.exist');
      cy.get('#submenu-item').should('have.attr', 'aria-expanded', 'false');
      cy.get('#popover').should('be.visible');
      cy.get('@trigger-action').should('not.have.been.called');
      cy.get('@submenu-change').should('not.have.been.called');
      cy.get('#enable').realClick();
      cy.get('#submenu-item').focus().should('be.focused');
      cy.realPress('Enter');
      cy.get('#child-item').should('be.focused');
      cy.get('#child-popover').should('be.visible');
      cy.get('#popover').should('be.visible');
      cy.get('@trigger-action').should('have.been.calledOnce');
      cy.get('@submenu-change').should('have.been.calledOnce');
    });
  }

  it('returns a live open-menu item from disabled submenu persistence to ordinary dismissing defaults', () => {
    const action = cy.stub().as('action');
    let original: HTMLElement;
    const Updating = () => {
      const [special, setSpecial] = React.useState(true);
      return (
        <ItemMenu>
          <MenuItem id="update" persistOnClick onClick={() => setSpecial(false)}>
            Use defaults
          </MenuItem>
          <MenuItem
            id="item"
            disabled={special ? true : undefined}
            hasSubmenu={special ? true : undefined}
            persistOnClick={special ? true : undefined}
            onClick={action}
          >
            Command
          </MenuItem>
        </ItemMenu>
      );
    };
    mount(<Updating />);
    open();
    cy.get('#item')
      .should('have.attr', 'aria-disabled', 'true')
      .then($item => {
        original = $item[0];
      });
    cy.get('#item').realClick();
    cy.get('@action').should('not.have.been.called');
    cy.get('#popover').should('be.visible');
    cy.get('#update').realClick();
    cy.get('#item').should($item => expect($item[0]).to.equal(original));
    cy.get('#item').find(`.${menuItemClassNames.submenuIndicator}`).should('not.exist');
    cy.get('#item').realHover().should('be.focused');
    cy.realPress('Enter');
    cy.get('@action').should('have.been.calledOnce');
    cy.get('#popover').should('not.exist');
    cy.get('#trigger').should('be.focused');
  });

  it('keeps a disabled bundled icon regular on hover and uses disabled text and cursor tokens', () => {
    mount(
      <>
        <span id="cut-reference" hidden>
          <CutRegular />
        </span>
        <MenuList>
          <MenuItem id="item" disabled icon={<CutIcon />} subText="Unavailable details">
            Command
          </MenuItem>
        </MenuList>
      </>,
    );
    cy.get('#item').realHover().should('be.focused').and('have.css', 'cursor', 'not-allowed');
    glyph('#item .fui-Icon-regular', '#cut-reference');
    cy.get('#item .fui-Icon-regular').should('be.visible');
    cy.get('#item .fui-Icon-filled').should('not.be.visible');
    cy.get('#item').should($item => {
      const probe = $item[0].ownerDocument.createElement('span');
      probe.style.color = teamsLightTheme.colorNeutralForegroundDisabled;
      const view = $item[0].ownerDocument.defaultView!;
      expect(view.getComputedStyle($item[0]).color).to.equal(probe.style.color);
      expect(view.getComputedStyle($item[0].querySelector(`.${menuItemClassNames.subText}`)!).color).to.equal(
        probe.style.color,
      );
    });
    named('Command Unavailable details');
  });

  it('does not treat caller click preventDefault as a persistence option', () => {
    const action = cy.stub().as('action');
    mount(
      <ItemMenu>
        <MenuItem
          id="item"
          onClick={event => {
            event.preventDefault();
            action();
          }}
        >
          Command
        </MenuItem>
      </ItemMenu>,
    );
    open();
    cy.get('#item').realClick();
    cy.get('@action').should('have.been.calledOnce');
    cy.get('#popover').should('not.exist');
    cy.get('#trigger').should('be.focused');
  });

  it('recomposes the public hooks and renderer with a native command and ref cleanup', () => {
    const Recomposed = React.forwardRef<HTMLDivElement, MenuItemProps>((props, ref) => {
      const state = useMenuItem_unstable(props, ref);
      useMenuItemStyles_unstable(state);
      return renderMenuItem_unstable(state);
    });
    const ref = React.createRef<HTMLDivElement>();
    const action = cy.stub().as('action');
    const Updating = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="unmount" onClick={() => setVisible(false)}>
            Unmount
          </button>
          <MenuList>
            {visible && (
              <Recomposed id="item" ref={ref} onClick={action}>
                Recomposed
              </Recomposed>
            )}
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    named('Recomposed');
    cy.get('#item')
      .should('have.class', menuItemClassNames.root)
      .should($item => expect(ref.current).to.equal($item[0]))
      .realHover()
      .should('be.focused');
    cy.realPress('Space');
    cy.get('@action').should('have.been.calledOnce');
    cy.get('#unmount').realClick();
    cy.get('#item')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('recomposes the distinct base hook without injecting a chevron and preserves explicit indicator children', () => {
    const Base = React.forwardRef<HTMLDivElement, MenuItemProps>((props, ref) =>
      renderMenuItem_unstable(useMenuItemBase_unstable(props, ref)),
    );
    const action = cy.stub().as('action');
    const ref = React.createRef<HTMLDivElement>();
    const Updating = () => {
      const [custom, setCustom] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setCustom(true)}>
            Custom indicator
          </button>
          <MenuList>
            <Base
              id="item"
              ref={ref}
              hasSubmenu
              submenuIndicator={custom ? { children: 'Explicit chevron', 'aria-hidden': true } : undefined}
              onClick={action}
            >
              Base command
            </Base>
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#item').should($item => expect(ref.current).to.equal($item[0]));
    cy.get('#item > span').last().should('have.text', '').find('svg').should('not.exist');
    named('Base command');
    cy.get('#item').realHover().should('be.focused');
    cy.realPress('Enter');
    cy.get('@action').should('have.been.calledOnce');
    cy.get('#update').realClick();
    named('Base command');
    cy.get('#item > span').last().should('have.text', 'Explicit chevron');
  });

  it('renders all seven slot callbacks with computed semantics, child content and native actions intact', () => {
    const renderSpan: SlotRenderFunction<React.HTMLAttributes<HTMLSpanElement>> = (Component, props) => (
      <Component {...props} data-callback="span">
        {props.children}
      </Component>
    );
    const renderRoot: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props} data-callback="root">
        {props.children}
      </Component>
    );
    const SlotsItem = (props: MenuItemProps) => {
      const state = useMenuItem_unstable(props, React.useRef<HTMLDivElement>(null));
      state.root = slot.always({ ...state.root, children: renderRoot }, { elementType: 'div' });
      useMenuItemStyles_unstable(state);
      return renderMenuItem_unstable(state);
    };
    const action = cy.stub().as('action');
    mount(
      <MenuList>
        <SlotsItem
          id="item"
          onClick={action}
          icon={{ children: renderSpan, 'aria-label': 'Icon' }}
          checkmark={{ children: renderSpan, 'aria-label': 'Check' }}
          content={{ children: renderSpan }}
          subText={{ children: renderSpan, 'aria-label': 'Details' }}
          secondaryContent={{ children: renderSpan, 'aria-label': 'Shortcut' }}
          submenuIndicator={{ children: renderSpan, 'aria-label': 'Indicator' }}
        >
          Command
        </SlotsItem>
      </MenuList>,
    );
    cy.get('#item').should('have.attr', 'data-callback', 'root').and('have.class', menuItemClassNames.root);
    cy.get('[data-callback=span]').should('have.length', 6);
    for (const name of ['icon', 'checkmark', 'content', 'subText', 'secondaryContent', 'submenuIndicator'] as const) {
      cy.get(`.${menuItemClassNames[name]}`).should('have.attr', 'data-callback', 'span');
    }
    cy.get(`.${menuItemClassNames.content}`).should('contain.text', 'Command');
    cy.get(`.${menuItemClassNames.checkmark}`).should('not.be.visible');
    named('Icon Command Details Shortcut Indicator');
    cy.get('#item').realHover().should('be.focused');
    cy.realPress('Enter');
    cy.get('@action').should('have.been.calledOnce');
  });

  for (const hasIcons of [false, true]) {
    for (const hasCheckmarks of [false, true]) {
      it(`resets alignment defaults from hasIcons=${hasIcons} and hasCheckmarks=${hasCheckmarks}`, () => {
        const Updating = () => {
          const [custom, setCustom] = React.useState(true);
          return (
            <>
              <button id="update" onClick={() => setCustom(false)}>
                Defaults
              </button>
              <MenuList hasIcons={custom ? hasIcons : undefined} hasCheckmarks={custom ? hasCheckmarks : undefined}>
                <MenuItem id="item">Command</MenuItem>
              </MenuList>
            </>
          );
        };
        mount(<Updating />);
        cy.get('#item').should($item => {
          expect($item[0].querySelectorAll(`.${menuItemClassNames.icon}`).length).to.equal(hasIcons ? 1 : 0);
          expect($item[0].querySelectorAll(`.${menuItemClassNames.checkmark}`).length).to.equal(hasCheckmarks ? 1 : 0);
        });
        cy.get('#update').realClick();
        cy.get('#item').find(`.${menuItemClassNames.icon}, .${menuItemClassNames.checkmark}`).should('not.exist');
        named('Command');
      });
    }
  }

  for (const context of [false, true]) {
    it(`lets explicit hasSubmenu override trigger context=${context} then returns to the context default`, () => {
      const Updating = () => {
        const [override, setOverride] = React.useState(true);
        return (
          <>
            <button id="update" onClick={() => setOverride(false)}>
              Defaults
            </button>
            <MenuList>
              <MenuTriggerContextProvider value={context}>
                <MenuItem id="item" hasSubmenu={override ? !context : undefined}>
                  Command
                </MenuItem>
              </MenuTriggerContextProvider>
            </MenuList>
          </>
        );
      };
      mount(<Updating />);
      cy.get('#item').should($item =>
        expect($item[0].querySelectorAll(`.${menuItemClassNames.submenuIndicator}`).length).to.equal(context ? 0 : 1),
      );
      cy.get('#update').realClick();
      cy.get('#item').should($item =>
        expect($item[0].querySelectorAll(`.${menuItemClassNames.submenuIndicator}`).length).to.equal(context ? 1 : 0),
      );
    });
  }

  it('replaces the custom submenu indicator with the exact directional glyph after omission', () => {
    const Updating = () => {
      const [custom, setCustom] = React.useState(true);
      return (
        <>
          <button id="update" onClick={() => setCustom(false)}>
            Defaults
          </button>
          <span id="chevron-reference" hidden>
            <ChevronRightRegular />
          </span>
          <MenuList>
            <MenuItem id="item" hasSubmenu submenuIndicator={custom ? 'Custom indicator' : undefined}>
              More
            </MenuItem>
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    named('More Custom indicator');
    cy.get('#item').find('svg').should('not.exist');
    cy.get('#update').realClick();
    named('More');
    glyph('#item .fui-Icon-regular', '#chevron-reference');
    cy.get('#item svg').should('have.attr', 'aria-hidden', 'true');
  });

  it('delegates single-character native keys to real list search without activating any command', () => {
    const action = cy.stub().as('action');
    mount(
      <MenuList>
        <MenuItem id="item" onClick={action}>
          Alpha
        </MenuItem>
        <MenuItem id="beta" onClick={action}>
          Beta
        </MenuItem>
        <MenuItem id="bravo" onClick={action}>
          Bravo
        </MenuItem>
      </MenuList>,
    );
    cy.get('#item').realHover().should('be.focused');
    cy.realPress('b');
    cy.get('#beta').should('be.focused');
    cy.realPress('b');
    cy.get('#bravo').should('be.focused');
    cy.realPress('ArrowUp');
    cy.get('#beta').should('be.focused');
    cy.get('@action').should('not.have.been.called');
  });

  it('notifies the split group when main multiline content is removed and restores trigger alignment', () => {
    const Updating = () => {
      const [multiline, setMultiline] = React.useState(true);
      return (
        <>
          <button id="update" onClick={() => setMultiline(false)}>
            Defaults
          </button>
          <MenuList>
            <MenuSplitGroup id="split">
              <MenuItem id="item" subText={multiline ? 'Details' : undefined}>
                Command
              </MenuItem>
              <MenuTriggerContextProvider value={true}>
                <MenuItem id="split-trigger" aria-label="More" />
              </MenuTriggerContextProvider>
            </MenuSplitGroup>
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#split').should('have.attr', 'data-multiline');
    cy.get('#split-trigger').should('have.css', 'align-self', 'center');
    cy.get('#update').realClick();
    cy.get('#split').should('not.have.attr', 'data-multiline');
    cy.get('#split-trigger').should('have.css', 'align-self', 'auto');
  });

  it('prevents text selection from a native double click while keeping activation available', () => {
    const action = cy.stub().as('action');
    mount(
      <MenuList>
        <MenuItem id="item" onClick={action}>
          Command text
        </MenuItem>
      </MenuList>,
    );
    cy.get('#item').should('have.css', 'user-select', 'none').realClick({ clickCount: 2 });
    cy.get('#item').should($item => expect($item[0].ownerDocument.getSelection()!.toString()).to.equal(''));
    cy.get('@action').should('have.been.calledTwice');
  });
});
