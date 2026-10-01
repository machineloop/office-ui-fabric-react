import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { Portal } from '@fluentui/react-portal';
import type { RefAttributes } from '@fluentui/react-utilities';
import { teamsLightTheme, tokens } from '@fluentui/react-theme';
import {
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
  MenuItemCheckbox,
  MenuItemRadio,
  MenuGroup,
  MenuGroupHeader,
  MenuDivider,
  MenuItemLink,
  type MenuProps,
} from '@fluentui/react-menu';
import { MenuPopover } from './MenuPopover';
import type { MenuPopoverProps } from './MenuPopover.types';
import { MenuProvider, type MenuContextValue } from '../../contexts/menuContext';
import { MenuListProvider, type MenuListContextValue } from '../../contexts/menuListContext';

const popover = '[data-testid="popover"]';
const trigger = '[data-testid="trigger"]';
const first = '[data-testid="first"]';
const last = '[data-testid="last"]';
type SurfaceProps = MenuPopoverProps & RefAttributes<HTMLDivElement>;

const Fixture = ({
  menuProps = {},
  popoverProps = {},
  children,
}: {
  menuProps?: Partial<MenuProps>;
  popoverProps?: SurfaceProps;
  children?: React.ReactNode;
}) => {
  return (
    <div data-testid="host">
      <button data-testid="before">Before</button>
      <Menu {...menuProps}>
        <MenuTrigger disableButtonEnhancement>
          <button data-testid="trigger">Actions</button>
        </MenuTrigger>
        <MenuPopover data-testid="popover" {...popoverProps}>
          <MenuList>
            {children ?? (
              <>
                <MenuItem data-testid="first">Alpha</MenuItem>
                <MenuItem disabled data-testid="disabled">
                  Disabled
                </MenuItem>
                <MenuItem data-testid="last">Zulu</MenuItem>
              </>
            )}
          </MenuList>
        </MenuPopover>
      </Menu>
      <button data-testid="after">After</button>
    </div>
  );
};

function render(element: React.ReactElement, dir: 'ltr' | 'rtl' = 'ltr') {
  mount(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
}

function open() {
  cy.get(popover).should('not.exist');
  cy.get(trigger).click();
  cy.get(popover).should('be.visible');
  cy.get(first).should('be.focused');
}

const Submenu = () => {
  return (
    <Menu inline>
      <MenuTrigger disableButtonEnhancement>
        <MenuItem data-testid="submenu-trigger">More</MenuItem>
      </MenuTrigger>
      <MenuPopover data-testid="submenu">
        <MenuList>
          <MenuItem data-testid="child">Child action</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};

describe('MenuPopover documentation scenarios', () => {
  it('renders a presentation surface around a named menu, portals by default, and dismisses actions', () => {
    const action = cy.stub().as('action');
    render(
      <Fixture>
        <MenuItem data-testid="first" onClick={action}>
          Alpha
        </MenuItem>
      </Fixture>,
    );
    cy.get(trigger).should('have.attr', 'aria-haspopup', 'menu').and('not.have.attr', 'aria-expanded');
    open();
    cy.get(trigger).should('have.attr', 'aria-expanded', 'true');
    cy.get(popover).should('have.attr', 'role', 'presentation').and('have.class', 'fui-MenuPopover');
    cy.get('[data-testid="host"]').find(popover).should('not.exist');
    cy.get(trigger)
      .invoke('attr', 'id')
      .then(id => {
        cy.get(popover).find('[role="menu"]').should('have.attr', 'aria-labelledby', id);
      });
    cy.get(first).click();
    cy.get('@action').should('have.been.calledOnce');
    cy.get(popover).should('not.exist');
    cy.get(trigger).should('not.have.attr', 'aria-expanded');
    cy.get(trigger).should('be.focused');
  });
});
describe('MenuPopover edge and accessibility scenarios', () => {
  (['Tab', 'Shift+Tab'] as const).forEach(key => {
    it(`dismisses on ${key} and continues the page tab order`, () => {
      const changes = cy.stub().as('changes');
      render(<Fixture menuProps={{ onOpenChange: (_, data) => changes(data.type, data.open) }} />);
      open();
      cy.realPress(key === 'Tab' ? 'Tab' : ['Shift', 'Tab']);
      cy.get(popover).should('not.exist');
      cy.get(`[data-testid="${key === 'Tab' ? 'after' : 'before'}"]`).should('be.focused');
      cy.get('@changes').should('have.been.calledWith', 'menuPopoverKeyDown', false);
    });
  });

  it('does not dismiss a root menu on horizontal arrows', () => {
    render(<Fixture />);
    open();
    cy.realPress('ArrowLeft');
    cy.get(popover).should('be.visible');
    cy.get(first).should('be.focused');
    cy.realPress('ArrowRight');
    cy.get(popover).should('be.visible');
    cy.realPress('Escape');
    cy.get(popover).should('not.exist');
  });

  it('respects descendant prevention of Escape, with an unprevented positive control', () => {
    const keys = cy.stub().as('keys');
    render(
      <Fixture popoverProps={{ onKeyDown: event => keys(event.key, event.defaultPrevented) }}>
        <MenuItem
          data-testid="first"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault();
            }
          }}
        >
          Protected
        </MenuItem>
        <MenuItem data-testid="last">Normal</MenuItem>
      </Fixture>,
    );
    open();
    cy.realPress('Escape');
    cy.get(popover).should('be.visible');
    cy.get('@keys').should('have.been.calledWith', 'Escape', true);
    cy.realPress('ArrowDown');
    cy.get(last).should('be.focused');
    cy.realPress('Escape');
    cy.get(popover).should('not.exist');
    cy.get(trigger).should('be.focused');
  });

  it('marks handled Escape prevented so an ancestor overlay does not dismiss', () => {
    const ancestor = cy.stub().as('ancestor');
    const original = cy.stub().as('original');
    render(
      <div onKeyDown={event => ancestor(event.key, event.defaultPrevented)}>
        <Fixture popoverProps={{ onKeyDown: event => original(event.key, event.defaultPrevented) }} />
      </div>,
    );
    open();
    cy.realPress('x');
    cy.get('@ancestor').should('have.been.calledWith', 'x', false);
    cy.realPress('Escape');
    cy.get('@original').should('have.been.calledWith', 'Escape', true);
    cy.get('@ancestor').should('have.been.calledWith', 'Escape', true);
    cy.get(popover).should('not.exist');
    cy.get(trigger).should('be.focused');
  });

  it('keeps controlled surfaces open until the owner accepts the close request', () => {
    const changes = cy.stub().as('changes');
    const Controlled = () => {
      const [isOpen, setOpen] = React.useState(true);
      return (
        <>
          <button data-testid="owner-close" onClick={() => setOpen(false)}>
            Owner close
          </button>
          <Fixture menuProps={{ open: isOpen, onOpenChange: (_, data) => changes(data.type, data.open) }} />
        </>
      );
    };
    render(<Controlled />);
    cy.get(first).focus();
    cy.realPress('Escape');
    cy.get('@changes').should('have.been.calledWith', 'menuPopoverKeyDown', false);
    cy.get(popover).should('be.visible');
    cy.get('[data-testid="owner-close"]').click();
    cy.get(popover).should('not.exist');
  });

  it('forwards native root props, user classes, styles, and a root ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Fixture
        popoverProps={{
          ref,
          id: 'custom-surface',
          title: 'Available actions',
          lang: 'fr',
          'aria-label': 'Action surface',
          className: 'custom-surface',
          style: { padding: tokens.spacingHorizontalL },
        }}
      />,
    );
    open();
    cy.get(popover)
      .should('have.id', 'custom-surface')
      .and('have.attr', 'title', 'Available actions')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'aria-label', 'Action surface')
      .and('have.class', 'custom-surface')
      .and('have.class', 'fui-MenuPopover')
      .and('have.css', 'padding-top', teamsLightTheme.spacingHorizontalL)
      .then($surface => expect(ref.current).to.equal($surface[0]));
    cy.realPress('Escape');
    cy.get(popover)
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('honors an explicit root role and renders children outside Menu context', () => {
    render(
      <MenuPopover data-testid="standalone" role="region" aria-label="Standalone" tabIndex={0}>
        <span>Standalone content</span>
      </MenuPopover>,
    );
    cy.get('[data-testid="standalone"]')
      .should('have.attr', 'role', 'region')
      .and('have.attr', 'aria-label', 'Standalone')
      .and('contain.text', 'Standalone content')
      .focus()
      .should('be.focused');
    cy.realPress('Escape');
    cy.get('[data-testid="standalone"]').should('be.visible');
  });

  it('renders in a supplied portal mount node and removes the surface on dismissal', () => {
    const CustomMount = () => {
      const [mountNode, setMountNode] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div data-testid="portal-target" ref={setMountNode} />
          <Fixture menuProps={{ mountNode }} />
        </>
      );
    };
    render(<CustomMount />);
    open();
    cy.get('[data-testid="portal-target"]').find(popover).should('be.visible');
    cy.realPress('Escape');
    cy.get('[data-testid="portal-target"]').find(popover).should('not.exist');
  });

  it('prefers inline rendering over a supplied portal mount node', () => {
    const CustomMount = () => {
      const [mountNode, setMountNode] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div data-testid="portal-target" ref={setMountNode} />
          <Fixture menuProps={{ mountNode, inline: true }} />
        </>
      );
    };
    render(<CustomMount />);
    open();
    cy.get('[data-testid="host"]').find(popover).should('be.visible');
    cy.get('[data-testid="portal-target"]').find(popover).should('not.exist');
  });

  it('opens on hover, cancels trigger-leave dismissal in the surface, and waits for outside dismissal', () => {
    const changes = cy.stub().as('changes');
    render(
      <Fixture
        menuProps={{
          openOnHover: true,
          hoverDelay: 50,
          onOpenChange: (_, data) => changes(data.type, data.open),
        }}
      />,
    );
    cy.get('[data-testid="after"]').realHover();
    cy.get(trigger).realHover();
    cy.get(popover).should('be.visible');
    cy.get(first).realHover();
    cy.get('@changes').should('have.been.calledWith', 'menuPopoverMouseEnter', true);
    // Let the trigger's pending hover-delay close expire after entering the surface.
    cy.wait(100);
    cy.get(popover).should('be.visible');
    cy.get('[data-testid="after"]').realHover();
    cy.get(popover).should('be.visible');
    cy.get('[data-testid="after"]').click();
    cy.get(popover).should('not.exist');
  });

  it('opens a context surface at the pointer but not on a primary click', () => {
    render(<Fixture menuProps={{ openOnContext: true }} />);
    cy.get(trigger).click();
    cy.get(popover).should('not.exist');
    cy.get(trigger).rightclick('center');
    cy.get(popover).should('be.visible');
    cy.get(first).should('be.focused');
    cy.get(popover).should($surface => {
      const rect = $surface[0].getBoundingClientRect();
      const anchor = Cypress.$(trigger)[0].getBoundingClientRect();
      expect(rect.left).to.be.closeTo(anchor.left + anchor.width / 2, 2);
      expect(rect.top).to.be.at.least(anchor.top);
    });
    cy.realPress('Escape');
    cy.get(popover).should('not.exist');
  });

  it('updates surface content and layout while open, then cleans up portals and refs on unmount', () => {
    const refs = cy.stub().as('refs');
    const Dynamic = () => {
      const [version, setVersion] = React.useState(0);
      const [present, setPresent] = React.useState(true);
      return (
        <>
          <button data-testid="update" onClick={() => setVersion(value => value + 1)}>
            Update
          </button>
          <button data-testid="remove" onClick={() => setPresent(false)}>
            Remove
          </button>
          {present && (
            <Fixture
              menuProps={{ open: true, inline: version > 0 }}
              popoverProps={{ ref: refs, title: `Version ${version}` }}
            >
              <MenuItem data-testid="first">{version === 0 ? 'Old action' : 'Replacement action'}</MenuItem>
            </Fixture>
          )}
        </>
      );
    };
    render(<Dynamic />);
    cy.get(popover).should('contain.text', 'Old action');
    cy.get('[data-testid="host"]').find(popover).should('not.exist');
    cy.get('[data-testid="update"]').click();
    cy.get('[data-testid="host"]').find(popover).should('contain.text', 'Replacement action');
    cy.get(popover).should('have.attr', 'title', 'Version 1').and('not.contain.text', 'Old action');
    cy.get('@refs').should('have.been.calledWith', null);
    cy.get('[data-testid="remove"]').click();
    cy.get(popover).should('not.exist');
    cy.get('@refs').its('lastCall.args.0').should('be.null');
  });

  it('anchors a triggerless surface to a custom element and exposes its accessible menu name', () => {
    const CustomTarget = () => {
      const [target, setTarget] = React.useState<HTMLButtonElement | null>(null);
      return (
        <>
          <button data-testid="anchor" ref={setTarget}>
            Anchor
          </button>
          <Menu open positioning={{ target, position: 'below', align: 'start' }}>
            <MenuPopover data-testid="popover">
              <MenuList aria-label="Custom actions">
                <MenuItem>Action</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </>
      );
    };
    render(<CustomTarget />);
    cy.get(popover).find('[role="menu"]').should('have.attr', 'aria-label', 'Custom actions');
    cy.get(popover).should($surface => {
      const rect = $surface[0].getBoundingClientRect();
      const anchor = Cypress.$('[data-testid="anchor"]')[0].getBoundingClientRect();
      expect(rect.top).to.be.at.least(anchor.bottom);
      expect(rect.left).to.be.closeTo(anchor.left, 1);
    });
  });
});
describe('MenuPopover documentation scenarios continued', () => {
  (['Enter', 'Space', 'ArrowDown'] as const).forEach(key => {
    it(`opens by ${key}, navigates disabled items, and restores focus after Escape`, () => {
      render(<Fixture />);
      cy.get(trigger).focus();
      cy.realPress(key);
      cy.get(popover).should('be.visible');
      cy.get(first).should('be.focused');
      cy.realPress('ArrowDown');
      cy.get('[data-testid="disabled"]').should('be.focused').and('have.attr', 'aria-disabled', 'true');
      cy.realPress('Enter');
      cy.get(popover).should('be.visible');
      cy.realPress('ArrowDown');
      cy.get(last).should('be.focused');
      cy.realPress('Escape');
      cy.get(popover).should('not.exist');
      cy.get(trigger).should('be.focused');
    });
  });

  it('supports typeahead and Home/End without dismissing the surface', () => {
    render(<Fixture />);
    open();
    cy.realPress('End');
    cy.get(last).should('be.focused');
    cy.realPress('Home');
    cy.get(first).should('be.focused');
    cy.realPress('z');
    cy.get(last).should('be.focused');
    cy.get(popover).should('be.visible');
  });

  it('dismisses outside clicks without stealing focus from the clicked button', () => {
    render(<Fixture />);
    open();
    cy.get('[data-testid="after"]').click().should('be.focused');
    cy.get(popover).should('not.exist');
  });

  it('renders inline in DOM order when requested by the parent Menu', () => {
    render(<Fixture menuProps={{ inline: true }} />);
    open();
    cy.get('[data-testid="host"]').find(popover).should('be.visible');
    cy.realPress('Escape');
    cy.get(popover).should('not.exist');
  });

  it('accepts controlled open/close requests and reports their origin', () => {
    const changes = cy.stub().as('changes');
    const Controlled = () => {
      const [isOpen, setOpen] = React.useState(false);
      return (
        <Fixture
          menuProps={{
            open: isOpen,
            onOpenChange: (event, data) => {
              changes(data.type, data.open);
              setOpen(data.open);
            },
          }}
        />
      );
    };
    render(<Controlled />);
    open();
    cy.get('@changes').should('have.been.calledWith', 'menuTriggerClick', true);
    cy.realPress('Escape');
    cy.get(popover).should('not.exist');
    cy.get('@changes').should('have.been.calledWith', 'menuPopoverKeyDown', false);
    open();
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`opens nested menus and closes only the submenu with the ${dir} close arrow`, () => {
      render(
        <Fixture menuProps={{ inline: true }}>
          <MenuItem data-testid="first">Alpha</MenuItem>
          <Submenu />
        </Fixture>,
        dir,
      );
      open();
      cy.realPress('ArrowDown');
      cy.get('[data-testid="submenu-trigger"]').should('be.focused');
      cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('[data-testid="submenu"]').should('be.visible');
      cy.get('[data-testid="child"]').should('be.focused');
      cy.get(popover).find('[data-testid="submenu"]').should('not.exist');
      cy.realPress(dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
      cy.get('[data-testid="submenu"]').should('not.exist');
      cy.get(popover).should('be.visible');
      cy.get('[data-testid="submenu-trigger"]').should('be.focused');
      cy.realPress('Escape');
      cy.get(popover).should('not.exist');
    });
  });

  it('contains grouped selectable and link content while persistent actions keep it open', () => {
    render(
      <Fixture menuProps={{ persistOnItemClick: true, hasCheckmarks: true, hasIcons: true }}>
        <MenuGroup>
          <MenuGroupHeader>Options</MenuGroupHeader>
          <MenuItemCheckbox data-testid="first" name="options" value="wrap" icon={<span>W</span>}>
            Wrap
          </MenuItemCheckbox>
        </MenuGroup>
        <MenuDivider />
        <MenuGroup>
          <MenuItemRadio name="mode" value="one" data-testid="radio-one">
            One
          </MenuItemRadio>
          <MenuItemRadio name="mode" value="two" data-testid="radio-two">
            Two
          </MenuItemRadio>
        </MenuGroup>
        <MenuItemLink href="#menu-popover-example" data-testid="link">
          Help
        </MenuItemLink>
      </Fixture>,
    );
    open();
    cy.get(first).should('have.attr', 'aria-checked', 'false');
    cy.realPress('Space');
    cy.get(first).should('have.attr', 'aria-checked', 'true');
    cy.get('[data-testid="radio-one"]').click().should('have.attr', 'aria-checked', 'true');
    cy.get('[data-testid="radio-two"]').click().should('have.attr', 'aria-checked', 'true');
    cy.get('[data-testid="radio-one"]').should('have.attr', 'aria-checked', 'false');
    cy.get('[data-testid="link"]').should('have.attr', 'href', '#menu-popover-example');
    cy.get(popover).should('be.visible');
    cy.realPress('Escape');
    cy.get(popover).should('not.exist');
  });

  it('positions below the trigger with a requested offset', () => {
    render(<Fixture menuProps={{ positioning: { position: 'below', align: 'start', offset: 12 } }} />);
    open();
    cy.get(popover).should($surface => {
      const surface = $surface[0].getBoundingClientRect();
      const anchor = Cypress.$(trigger)[0].getBoundingClientRect();
      expect(surface.top - anchor.bottom).to.be.closeTo(12, 1);
      expect(surface.left).to.be.closeTo(anchor.left, 1);
      expect(surface.width).to.be.at.least(138);
      expect(surface.width).to.be.at.most(300);
    });
  });

  it('auto-sizes long menus to the viewport and allows internal scrolling', () => {
    cy.viewport(500, 350);
    render(
      <Fixture menuProps={{ positioning: { autoSize: true } }}>
        {Array.from({ length: 40 }, (_, index) => (
          <MenuItem key={index} data-testid={index === 0 ? 'first' : `item-${index}`}>
            Action {index}
          </MenuItem>
        ))}
      </Fixture>,
    );
    open();
    cy.get(popover).should($surface => {
      const element = $surface[0];
      const rect = element.getBoundingClientRect();
      expect(rect.top).to.be.at.least(0);
      expect(rect.bottom).to.be.at.most(350);
      expect(element.scrollHeight).to.be.greaterThan(element.clientHeight);
    });
    cy.get(popover)
      .scrollTo('bottom')
      .should($surface => {
        expect($surface[0].scrollTop).to.be.greaterThan(0);
      });
    cy.get('[data-testid="item-39"]').should('be.visible');
  });

  it('supports disabled motion and repeated default-open lifecycle', () => {
    render(<Fixture menuProps={{ defaultOpen: true, surfaceMotion: null }} />);
    cy.get(popover).should('be.visible');
    cy.get(first).focus();
    cy.realPress('Escape');
    cy.get(popover).should('not.exist');
    open();
    cy.realPress('Escape');
    cy.get(popover).should('not.exist');
  });
});

const ContextFixture = ({
  initiallyOpen = true,
  submenu = false,
  openOnHover = false,
  inline = true,
  shouldCloseOnArrowLeft = true,
  popoverProps = {},
  portalChild = false,
  safeZone = false,
}: {
  initiallyOpen?: boolean;
  submenu?: boolean;
  openOnHover?: boolean;
  inline?: boolean;
  shouldCloseOnArrowLeft?: boolean;
  popoverProps?: SurfaceProps;
  portalChild?: boolean;
  safeZone?: boolean;
}) => {
  const [isOpen, setOpen] = React.useState(initiallyOpen);
  const [requests, setRequests] = React.useState(0);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuPopoverRef = React.useRef<HTMLElement>(null);
  const value: MenuContextValue = {
    open: isOpen,
    setOpen: (_, data) => {
      setOpen(data.open);
      setRequests(count => count + 1);
    },
    checkedValues: {},
    onCheckedValueChange: () => undefined,
    isSubmenu: submenu,
    triggerRef,
    menuPopoverRef,
    mountNode: null,
    triggerId: 'context-trigger',
    openOnContext: false,
    openOnHover,
    hasIcons: false,
    hasCheckmarks: false,
    inline,
    persistOnItemClick: false,
    safeZone: safeZone ? <button data-testid="safe-zone">Safe zone sibling</button> : undefined,
  };
  const listValue: MenuListContextValue = {
    checkedValues: {},
    hasIcons: false,
    hasCheckmarks: false,
    shouldCloseOnArrowLeft,
  };
  const surface = (
    <MenuPopover data-testid="popover" {...popoverProps}>
      <button data-testid="first">Inside</button>
      {portalChild && (
        <Portal>
          <button data-testid="portal-child">Outside DOM, inside React tree</button>
        </Portal>
      )}
    </MenuPopover>
  );
  return (
    <div data-testid="context-host">
      <button ref={triggerRef} id="context-trigger" data-testid="trigger">
        Context trigger
      </button>
      <output data-testid="requests" data-open={String(isOpen)}>
        {requests}
      </output>
      <MenuProvider value={value}>
        {submenu ? <MenuListProvider value={listValue}>{surface}</MenuListProvider> : surface}
      </MenuProvider>
      <button data-testid="after">Outside</button>
    </div>
  );
};

describe('MenuPopover unit-derived browser regressions', () => {
  it('applies the theme surface tokens and constrains wide content without horizontal overflow', () => {
    render(
      <Fixture>
        <MenuItem data-testid="first">{'A deliberately wide action '.repeat(30)}</MenuItem>
      </Fixture>,
    );
    open();
    cy.get(popover)
      .should('have.css', 'box-sizing', 'border-box')
      .and('have.css', 'overflow-x', 'hidden')
      .and('have.css', 'border-radius', teamsLightTheme.borderRadiusMedium)
      .and('have.css', 'max-width', '300px')
      .and('have.css', 'min-width', '138px')
      .should($surface => {
        expect($surface[0].getBoundingClientRect().width).to.be.at.most(300);
        expect($surface[0].getBoundingClientRect().width).to.be.at.least(138);
      });
    cy.get(popover).then($surface => {
      const view = $surface[0].ownerDocument.defaultView!;
      const expected = $surface[0].ownerDocument.createElement('div');
      expected.style.backgroundColor = teamsLightTheme.colorNeutralBackground1;
      $surface[0].appendChild(expected);
      expect(view.getComputedStyle($surface[0]).backgroundColor).to.equal(
        view.getComputedStyle(expected).backgroundColor,
      );
      expected.remove();
    });
  });

  ([false, true] as const).forEach(closeOnScroll => {
    it(`${
      closeOnScroll ? 'dismisses' : 'preserves'
    } the surface on outside scroll when closeOnScroll is ${closeOnScroll}`, () => {
      render(
        <>
          <div data-testid="scroller" style={{ maxHeight: tokens.spacingVerticalXXXL, overflowY: 'auto' }}>
            {Array.from({ length: 30 }, (_, index) => (
              <p key={index}>Scroll content {index}</p>
            ))}
          </div>
          <Fixture menuProps={{ closeOnScroll }} />
        </>,
      );
      open();
      cy.get('[data-testid="scroller"]').realHover().realMouseWheel({ deltaY: 600 });
      cy.get('[data-testid="scroller"]').should($scroller => {
        expect($scroller[0].scrollTop).to.be.greaterThan(0);
      });
      cy.get(popover).should(closeOnScroll ? 'not.exist' : 'be.visible');
      if (!closeOnScroll) {
        cy.realPress('Escape');
        cy.get(popover).should('not.exist');
      }
    });
  });

  it('does not process Escape while context is closed, but processes it after hovering requests open', () => {
    render(<ContextFixture initiallyOpen={false} openOnHover />);
    cy.get(first).focus();
    cy.realPress('Escape');
    cy.get('[data-testid="requests"]').should('have.text', '0').and('have.attr', 'data-open', 'false');
    cy.get(popover).realHover();
    cy.get('[data-testid="requests"]').should('have.text', '1').and('have.attr', 'data-open', 'true');
    cy.get(first).focus();
    cy.realPress('Escape');
    cy.get('[data-testid="requests"]').should('have.text', '2').and('have.attr', 'data-open', 'false');
  });

  it('ignores Escape bubbling from a portaled descendant that is outside the surface DOM', () => {
    const keys = cy.stub().as('keys');
    render(
      <ContextFixture portalChild popoverProps={{ onKeyDown: event => keys(event.key, event.defaultPrevented) }} />,
    );
    cy.get('[data-testid="portal-child"]').focus();
    cy.realPress('Escape');
    cy.get('@keys').should('have.been.calledWith', 'Escape', false);
    cy.get('[data-testid="requests"]').should('have.text', '0').and('have.attr', 'data-open', 'true');
    cy.get(first).focus();
    cy.realPress('Escape');
    cy.get('[data-testid="requests"]').should('have.text', '1').and('have.attr', 'data-open', 'false');
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`honors the submenu list's close-arrow opt-out in ${dir}, while Escape still closes`, () => {
      render(<ContextFixture submenu shouldCloseOnArrowLeft={false} />, dir);
      cy.get(first).focus();
      cy.realPress(dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
      cy.get('[data-testid="requests"]').should('have.text', '0').and('have.attr', 'data-open', 'true');
      cy.realPress('Escape');
      cy.get('[data-testid="requests"]').should('have.text', '1').and('have.attr', 'data-open', 'false');
    });
  });

  ([false, true] as const).forEach(submenu => {
    it(`Tab requests close and ${submenu ? 'does not focus' : 'focuses'} the trigger for a ${
      submenu ? 'submenu' : 'root'
    }`, () => {
      const focusedDuringHandler = cy.stub().as('focusedDuringHandler');
      render(
        <ContextFixture
          submenu={submenu}
          popoverProps={{
            onKeyDown: event => {
              if (event.key === 'Tab') {
                focusedDuringHandler(Cypress.$(trigger).is(':focus'));
              }
            },
          }}
        />,
      );
      cy.get(first).focus();
      cy.realPress('Tab');
      cy.get('[data-testid="requests"]').should('have.text', '1').and('have.attr', 'data-open', 'false');
      cy.get('@focusedDuringHandler').should('have.been.calledOnceWith', !submenu);
    });
  });

  ([false, true] as const).forEach(submenu => {
    it(`mouseover ${submenu ? 'requests open for a submenu' : 'does not request open for a non-hover root'}`, () => {
      const enter = cy.stub().as('enter');
      render(<ContextFixture submenu={submenu} popoverProps={{ onMouseEnter: enter }} />);
      cy.get('[data-testid="after"]').realHover();
      cy.then(() => enter.resetHistory());
      cy.get('[data-testid="requests"]')
        .invoke('text')
        .then(previous => {
          cy.get(first).trigger('mouseover', { relatedTarget: null });
          cy.get('@enter').should('have.been.calledOnce');
          cy.get('[data-testid="requests"]').should('have.text', String(Number(previous) + (submenu ? 1 : 0)));
        });
    });
  });

  ([false, true] as const).forEach(inline => {
    it(`renders the context safe-zone sibling ${inline ? 'inline' : 'in the portal'}`, () => {
      render(<ContextFixture inline={inline} safeZone />);
      cy.get('[data-testid="safe-zone"]').should('be.visible');
      cy.get(popover).find('[data-testid="safe-zone"]').should('not.exist');
      cy.get(popover).parent().find('[data-testid="safe-zone"]').should('be.visible');
      cy.get('[data-testid="context-host"]')
        .find('[data-testid="safe-zone"]')
        .should(inline ? 'exist' : 'not.exist');
    });
  });

  it('preserves the original mouse leave, blur, click and key handlers', () => {
    const leave = cy.stub().as('leave');
    const blur = cy.stub().as('blur');
    const click = cy.stub().as('click');
    const keys = cy.stub().as('keys');
    render(<ContextFixture popoverProps={{ onMouseLeave: leave, onBlur: blur, onClick: click, onKeyDown: keys }} />);
    cy.get(first).realHover().click().should('be.focused');
    cy.get('@click').should('have.been.calledOnce');
    cy.realPress('a');
    cy.get('@keys').should('have.been.calledOnce');
    cy.get('[data-testid="after"]').realHover().focus();
    cy.get('@leave').should('have.been.calledOnce');
    cy.get('@blur').should('have.been.calledOnce');
    cy.get('[data-testid="requests"]').should('have.text', '0');
  });

  it('merges focus-restoration and Escape-ignore tabster attributes', () => {
    render(<Fixture />);
    open();
    cy.get(popover)
      .invoke('attr', 'data-tabster')
      .then(raw => {
        const attributes = JSON.parse(raw!);
        expect(attributes.restorer).to.deep.equal({ type: 0 });
        expect(attributes.focusable.ignoreKeydown.Escape).to.equal(true);
      });
    cy.realPress('Escape');
    cy.get(trigger).should('be.focused');
  });

  it('throttles native menu-enter events for 250ms and resets after expiry', () => {
    const enters = cy.stub().as('enters');
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.clock(0, ['setTimeout', 'clearTimeout']);
    render(<ContextFixture />);
    cy.get(popover).then($surface => {
      $surface[0].addEventListener('fuimenuenter', enters);
    });
    cy.get(first).trigger('mouseover');
    cy.get('@enters').should('have.been.calledOnce');
    cy.get(first).trigger('mouseover');
    cy.tick(249);
    cy.get(first).trigger('mouseover');
    cy.get('@enters').should('have.been.calledOnce');
    cy.tick(1);
    cy.get(first).trigger('mouseover');
    cy.get('@enters').should('have.been.calledTwice');
    cy.get(popover).then($surface => {
      expect(enters.lastCall.args[0].target).to.equal($surface[0]);
      expect(enters.lastCall.args[0].detail.nativeEvent.type).to.equal('mouseover');
    });
  });

  it('unmounts a throttled instance and a new instance dispatches menu-enter immediately', () => {
    const enters = cy.stub().as('enters');
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.clock(0, ['setTimeout', 'clearTimeout']);
    const Lifecycle = () => {
      const [present, setPresent] = React.useState(true);
      return (
        <>
          <button data-testid="toggle" onClick={() => setPresent(value => !value)}>
            Toggle instance
          </button>
          {present && <ContextFixture />}
        </>
      );
    };
    render(<Lifecycle />);
    cy.get(popover).then($surface => $surface[0].addEventListener('fuimenuenter', enters));
    cy.get(first).trigger('mouseover');
    cy.get('@enters').should('have.been.calledOnce');
    cy.get('[data-testid="toggle"]').click();
    cy.get(popover).should('not.exist');
    cy.tick(250);
    cy.get('[data-testid="toggle"]').click();
    cy.get(popover)
      .should('be.visible')
      .then($surface => $surface[0].addEventListener('fuimenuenter', enters));
    cy.get(first).trigger('mouseover');
    cy.get('@enters').should('have.been.calledTwice');
  });
});
