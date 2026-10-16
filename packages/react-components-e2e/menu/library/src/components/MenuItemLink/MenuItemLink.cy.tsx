import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, tokens } from '@fluentui/react-theme';
import { Menu, MenuTrigger, MenuPopover, MenuList } from '@fluentui/react-menu';
import type { MenuProps } from '@fluentui/react-menu';
import { MenuItemLink } from './MenuItemLink';
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const link = (name: string) => cy.get(`[data-link="${name}"]`);
const popup = () => cy.get('[role="menu"]');
const Navigation = ({
  onClick,
  ...props
}: Omit<MenuProps, 'children'> & {
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) => (
  <>
    <button data-test="before">Before</button>
    <Menu {...props}>
      <MenuTrigger disableButtonEnhancement>
        <button data-test="trigger">Navigation menu</button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItemLink data-link="home" href="#home" target="_blank" rel="noopener" onClick={onClick}>
            Home
          </MenuItemLink>
          <MenuItemLink data-link="shop" href="#shop" onClick={onClick}>
            Online shop
          </MenuItemLink>
          <MenuItemLink data-link="contact" href="#contact" onClick={onClick}>
            Contact us
          </MenuItemLink>
          <MenuItemLink data-link="about" href="#about" onClick={onClick}>
            About
          </MenuItemLink>
        </MenuList>
      </MenuPopover>
    </Menu>
    <button data-test="after">After</button>
  </>
);
const open = () => cy.get('[data-test="trigger"]').focus().realPress('Enter');

describe('MenuItemLink documented navigation (round 1)', () => {
  it('Navigation story: real anchor semantics/target/rel and pointer hash navigation close the menu once', () => {
    const click = cy.stub().as('click');
    const changes = cy.stub().as('changes');
    mount(<Navigation onClick={click} onOpenChange={changes} />);
    open();
    link('home')
      .should('have.prop', 'tagName', 'A')
      .and('have.attr', 'role', 'menuitem')
      .and('have.attr', 'target', '_blank')
      .and('have.attr', 'rel', 'noopener');
    cy.window().then(win =>
      win.history.replaceState(null, '', `${win.location.pathname}${win.location.search}#before-pointer`),
    );
    cy.then(() => changes.resetHistory());
    link('shop').should('have.attr', 'href', '#shop').click();
    cy.window().its('location.hash').should('equal', '#shop');
    popup().should('not.exist');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@changes').should('have.been.calledOnce');
    cy.get('@changes').then(() => {
      const [event, data] = changes.firstCall.args;
      expect(data).to.deep.equal({ event, open: false, keyboard: false, bubble: true, type: 'menuItemClick' });
    });
  });
  (['Enter', 'Space'] as const).forEach(key => {
    it(`native ${key} on a link navigates its real hash and restores trigger after closing`, () => {
      const click = cy.stub().as('click');
      const changes = cy.stub().as('changes');
      mount(<Navigation onClick={click} onOpenChange={changes} />);
      open();
      cy.realPress('ArrowDown');
      cy.window().then(win =>
        win.history.replaceState(null, '', `${win.location.pathname}${win.location.search}#before-${key}`),
      );
      cy.then(() => changes.resetHistory());
      link('shop').should('be.focused').realPress(key);
      cy.window().its('location.hash').should('equal', '#shop');
      popup().should('not.exist');
      cy.get('[data-test="trigger"]').should('be.focused');
      cy.get('@click').should('have.been.calledOnce');
      cy.get('@changes').should('have.been.calledOnce');
      cy.get('@changes').then(() => {
        const [event, data] = changes.firstCall.args;
        expect(data).to.deep.equal({ event, open: false, keyboard: true, bubble: true, type: 'menuItemClick' });
      });
    });
  });
  it('menu arrows/Home/End/Escape move focus without navigation or item activation', () => {
    const click = cy.stub().as('click');
    mount(<Navigation onClick={click} />);
    cy.get('[data-test="before"]').focus().realPress('Tab');
    cy.get('[data-test="trigger"]').should('be.focused').realPress('Enter');
    link('home').should('be.focused');
    cy.realPress('End');
    link('about').should('be.focused');
    cy.realPress('Home');
    link('home').should('be.focused');
    cy.realPress('ArrowDown');
    link('shop').should('be.focused');
    cy.realPress('ArrowUp');
    link('home').should('be.focused');
    cy.realPress('Escape');
    popup().should('not.exist');
    cy.get('[data-test="trigger"]').should('be.focused');
    cy.get('@click').should('not.have.been.called');
  });
  it('documented linked mouse/keyboard focus: hovering another link takes over from keyboard focus', () => {
    const click = cy.stub().as('click');
    mount(<Navigation onClick={click} />);
    open();
    link('home').should('be.focused');
    link('contact').realHover();
    link('contact').should('be.focused');
    cy.get('@click').should('not.have.been.called');
  });
  it('menu character search reaches the matching link without navigating', () => {
    const click = cy.stub().as('click');
    mount(<Navigation onClick={click} />);
    open();
    cy.realPress('c');
    link('contact').should('be.focused');
    cy.get('@click').should('not.have.been.called');
  });
});

describe('MenuItemLink accessibility/cancellation edges (round 2)', () => {
  it('disabled link remains focusable but cancels click/Enter/Space navigation and dismissal callbacks', () => {
    const click = cy.stub().as('click');
    const changes = cy.stub().as('changes');
    mount(
      <Menu defaultOpen onOpenChange={changes}>
        <MenuPopover>
          <MenuList>
            <MenuItemLink href="#enabled" data-link="enabled">
              Enabled
            </MenuItemLink>
            <MenuItemLink href="#disabled-navigation" disabled onClick={click} data-link="disabled">
              Disabled
            </MenuItemLink>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    link('disabled').should('have.attr', 'aria-disabled', 'true').focus().should('be.focused');
    cy.window().then(win =>
      win.history.replaceState(null, '', `${win.location.pathname}${win.location.search}#before-disabled`),
    );
    cy.realPress('Enter');
    cy.realPress('Space');
    link('disabled').click({ force: true });
    cy.window().its('location.hash').should('equal', '#before-disabled');
    popup().should('be.visible');
    cy.get('@click').should('not.have.been.called');
    cy.get('@changes').should('not.have.been.called');
  });
  it('consumer-prevented Enter/Space emits no click or dismissal and does not navigate', () => {
    const click = cy.stub().as('click');
    const changes = cy.stub().as('changes');
    mount(
      <Menu defaultOpen onOpenChange={changes}>
        <MenuPopover>
          <MenuList>
            <MenuItemLink
              href="#cancelled"
              data-link="cancelled"
              onClick={click}
              onKeyDown={event => event.preventDefault()}
              onKeyUp={event => event.preventDefault()}
            >
              Cancelled
            </MenuItemLink>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    link('cancelled').should('be.focused');
    cy.window().then(win =>
      win.history.replaceState(null, '', `${win.location.pathname}${win.location.search}#before-cancelled`),
    );
    cy.realPress('Enter');
    cy.realPress('Space');
    popup().should('be.visible');
    cy.window().its('location.hash').should('equal', '#before-cancelled');
    cy.get('@click').should('not.have.been.called');
    cy.get('@changes').should('not.have.been.called');
  });
  it('preventing the consumer click cancels navigation but does not retroactively veto the dismissal request', () => {
    const calls = cy.stub().as('calls');
    mount(
      <Menu defaultOpen onOpenChange={(_, data) => calls('close', data.type, data.open)}>
        <MenuPopover>
          <MenuList>
            <MenuItemLink
              href="#prevented"
              data-link="prevented"
              onClick={event => {
                calls('click', event.currentTarget.dataset.link);
                event.preventDefault();
              }}
            >
              Prevented
            </MenuItemLink>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    link('prevented').should('exist');
    cy.window().then(win =>
      win.history.replaceState(null, '', `${win.location.pathname}${win.location.search}#before-click-cancelled`),
    );
    link('prevented').click();
    popup().should('not.exist');
    cy.window().its('location.hash').should('equal', '#before-click-cancelled');
    cy.get('@calls').then(() =>
      expect(calls.getCalls().map(call => call.args)).to.deep.equal([
        ['close', 'menuItemClick', false],
        ['click', 'prevented'],
      ]),
    );
  });
  it('persistOnItemClick retains the menu after one pointer and one keyboard link activation', () => {
    const click = cy.stub().as('click');
    const changes = cy.stub().as('changes');
    mount(
      <Navigation
        persistOnItemClick
        onClick={event => {
          event.preventDefault();
          click();
        }}
        onOpenChange={changes}
      />,
    );
    open();
    cy.then(() => changes.resetHistory());
    link('shop').click();
    popup().should('be.visible');
    link('contact').focus().realPress('Enter');
    popup().should('be.visible');
    cy.get('@click').should('have.callCount', 2);
    cy.get('@changes').should('not.have.been.called');
  });
  it('ARIA naming overrides preserve label/description without adding nested interactive content', () => {
    mount(
      <MenuList>
        <span id="link-description">Opens account settings</span>
        <MenuItemLink
          href="#account"
          data-link="account"
          aria-label="Account settings"
          aria-describedby="link-description"
          secondaryContent="Ctrl+A"
        >
          Account
        </MenuItemLink>
      </MenuList>,
    );
    link('account')
      .should('have.attr', 'aria-label', 'Account settings')
      .and('have.attr', 'aria-describedby', 'link-description');
    link('account').find('.fui-MenuItemLink__secondaryContent').should('have.text', 'Ctrl+A');
    link('account').find('button,a,input').should('not.exist');
  });
  it('native Tab and shiftTab can reach standalone links without forcing a click or navigation', () => {
    const click = cy.stub().as('click');
    mount(
      <>
        <button data-test="before">Before</button>
        <MenuItemLink data-link="one" href="#one" onClick={click}>
          One
        </MenuItemLink>
        <MenuItemLink data-link="two" href="#two" onClick={click}>
          Two
        </MenuItemLink>
        <button data-test="after">After</button>
      </>,
    );
    cy.get('[data-test="before"]').focus().realPress('Tab');
    link('one').should('be.focused').realPress('Tab');
    link('two').should('be.focused').realPress(['Shift', 'Tab']);
    link('one').should('be.focused');
    cy.get('@click').should('not.have.been.called');
  });
});

describe('MenuItemLink unit-derived/lifecycle contracts (round 3)', () => {
  it('unit anchor native props/root ref and all four slots survive rendering and clear refs on unmount', () => {
    const ref = React.createRef<HTMLAnchorElement>();
    const callback = cy.stub().as('ref');
    let setVisible: React.Dispatch<React.SetStateAction<boolean>>;
    const Lifecycle = () => {
      const [visible, update] = React.useState(true);
      setVisible = update;
      return visible ? (
        <MenuList hasIcons hasCheckmarks>
          <MenuItemLink
            ref={node => {
              ref.current = node;
              callback(node);
            }}
            data-link="document"
            href="#document"
            target="_blank"
            rel="noopener"
            download="document.txt"
            title="Document"
            className="consumer-link"
            aria-label="Open document"
            checkmark={{ children: <span>Checked</span>, className: 'consumer-check', 'aria-hidden': true }}
            icon={{ children: <span>Icon</span>, className: 'consumer-icon', 'aria-hidden': true }}
            content={{ children: 'Resolved content', className: 'consumer-content' }}
            secondaryContent={{ children: 'Shortcut', className: 'consumer-secondary' }}
          >
            Fallback
          </MenuItemLink>
        </MenuList>
      ) : (
        <p data-test="removed">Removed</p>
      );
    };
    mount(<Lifecycle />);
    link('document')
      .should('have.class', 'fui-MenuItemLink')
      .and('have.class', 'consumer-link')
      .and('have.attr', 'title', 'Document')
      .and('have.attr', 'download', 'document.txt');
    link('document')
      .should('have.attr', 'href', '#document')
      .and('have.attr', 'target', '_blank')
      .and('have.attr', 'rel', 'noopener')
      .and('have.attr', 'aria-label', 'Open document');
    ['checkmark', 'icon', 'content', 'secondaryContent'].forEach(name =>
      link('document').find(`.fui-MenuItemLink__${name}`).should('have.length', 1),
    );
    link('document').find('.consumer-content').should('have.text', 'Resolved content');
    link('document').should('not.have.attr', 'content');
    link('document').find('.consumer-secondary').should('have.text', 'Shortcut');
    link('document').then($el => {
      expect(ref.current).to.equal($el[0]);
      expect(callback.lastCall.args[0]).to.equal($el[0]);
    });
    cy.then(() => setVisible(false));
    cy.get('[data-test="removed"]').should('exist');
    cy.then(() => {
      expect(ref.current).to.equal(null);
      expect(callback.lastCall.args[0]).to.equal(null);
    });
  });
  it('native tabindex/role and consumer inline styles override defaults while retaining anchor semantics', () => {
    mount(
      <MenuItemLink
        href="#custom"
        data-link="custom"
        tabIndex={-1}
        role="link"
        style={{ textDecorationLine: 'underline', fontWeight: tokens.fontWeightBold }}
      >
        Custom link
      </MenuItemLink>,
    );
    link('custom')
      .should('have.prop', 'tagName', 'A')
      .and('have.attr', 'tabindex', '-1')
      .and('have.attr', 'role', 'link');
    link('custom')
      .should('have.css', 'text-decoration-line', 'underline')
      .and('have.css', 'font-weight', webLightTheme.fontWeightBold.toString());
  });
  it('default link underline reset and explicit null slots are reflected in browser DOM', () => {
    mount(
      <MenuItemLink href="#plain" data-link="plain" icon={null} checkmark={null} secondaryContent={null}>
        Plain
      </MenuItemLink>,
    );
    link('plain').should('have.css', 'text-decoration-line', 'none');
    ['icon', 'checkmark', 'secondaryContent'].forEach(name =>
      link('plain').find(`.fui-MenuItemLink__${name}`).should('not.exist'),
    );
    link('plain').find('.fui-MenuItemLink__content').should('have.text', 'Plain');
  });
  it('current href/content/consumer handler is used after rerender with actual anchor currentTarget', () => {
    const click = cy.stub().as('click');
    let setVersion: React.Dispatch<React.SetStateAction<number>>;
    const Current = () => {
      const [version, update] = React.useState(0);
      setVersion = update;
      return (
        <MenuList>
          <MenuItemLink
            data-link="current"
            href={`#version-${version}`}
            onClick={event => {
              event.preventDefault();
              click(version, event.type, event.currentTarget.getAttribute('href'));
            }}
          >
            Version {version}
          </MenuItemLink>
        </MenuList>
      );
    };
    mount(<Current />);
    link('current').should('have.text', 'Version 0');
    cy.then(() => setVersion(1));
    link('current').should('have.text', 'Version 1').and('have.attr', 'href', '#version-1').focus().realPress('Enter');
    cy.get('@click').should('have.been.calledOnceWithExactly', 1, 'click', '#version-1');
  });
  it('controlled Menu reports one close hint but remains open until the consumer changes state', () => {
    const changes = cy.stub().as('changes');
    let setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    const Controlled = () => {
      const [visible, update] = React.useState(true);
      setOpen = update;
      return <Navigation open={visible} onOpenChange={changes} onClick={event => event.preventDefault()} />;
    };
    mount(<Controlled />);
    link('shop').should('exist').click();
    popup().should('be.visible');
    cy.get('[data-test="trigger"]').should('have.attr', 'aria-expanded', 'true');
    cy.get('@changes').should('have.been.calledOnce');
    cy.get('@changes').then(() => {
      const [event, data] = changes.firstCall.args;
      expect(data).to.deep.equal({ event, open: false, keyboard: false, bubble: true, type: 'menuItemClick' });
    });
    cy.then(() => setOpen(false));
    popup().should('not.exist');
    cy.get('@changes').should('have.been.calledOnce');
  });
  it('changed parent persistence flag and current close handler apply immediately to the same link', () => {
    const changes = cy.stub().as('changes');
    let setPersistent: React.Dispatch<React.SetStateAction<boolean>>;
    const Current = () => {
      const [persistent, update] = React.useState(true);
      setPersistent = update;
      return (
        <Navigation
          defaultOpen
          persistOnItemClick={persistent}
          onClick={event => event.preventDefault()}
          onOpenChange={(_, data) => changes(persistent, data.type, data.open)}
        />
      );
    };
    mount(<Current />);
    link('shop').should('exist').click();
    popup().should('be.visible');
    cy.get('@changes').should('not.have.been.called');
    cy.then(() => setPersistent(false));
    link('shop').click();
    popup().should('not.exist');
    cy.get('@changes').should('have.been.calledOnceWithExactly', false, 'menuItemClick', false);
  });
  it('MenuTrigger context link opens a submenu without requesting ancestor item-click dismissal', () => {
    const outerChanges = cy.stub().as('outerChanges');
    const innerChanges = cy.stub().as('innerChanges');
    mount(
      <Menu defaultOpen onOpenChange={outerChanges}>
        <MenuPopover>
          <MenuList data-test="outer-list">
            <Menu onOpenChange={innerChanges}>
              <MenuTrigger disableButtonEnhancement>
                <MenuItemLink href="#category" data-link="category" onClick={event => event.preventDefault()}>
                  Category
                </MenuItemLink>
              </MenuTrigger>
              <MenuPopover>
                <MenuList data-test="inner-list">
                  <MenuItemLink href="#child" data-link="child">
                    Child page
                  </MenuItemLink>
                </MenuList>
              </MenuPopover>
            </Menu>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    link('category').should('be.focused').realPress('ArrowRight');
    cy.get('[data-test="inner-list"]').should('be.visible');
    cy.get('[data-test="outer-list"]').should('be.visible');
    cy.get('@outerChanges').should('not.have.been.called');
    cy.get('@innerChanges').should('have.been.calledOnce');
    link('child').should('be.focused').realPress('Escape');
    cy.get('[data-test="inner-list"]').should('not.exist');
    cy.get('[data-test="outer-list"]').should('be.visible');
    link('category').should('be.focused');
  });
  it('defaultOpen initializes once and a later default change cannot reopen a dismissed link menu', () => {
    let setDefault: React.Dispatch<React.SetStateAction<boolean>>;
    const Defaults = () => {
      const [value, update] = React.useState(true);
      setDefault = update;
      return (
        <div data-default={String(value)}>
          <Navigation defaultOpen={value} />
        </div>
      );
    };
    mount(<Defaults />);
    link('shop').should('exist').focus().realPress('Escape');
    popup().should('not.exist');
    cy.then(() => setDefault(false));
    cy.get('[data-default="false"]').should('exist');
    cy.then(() => setDefault(true));
    cy.get('[data-default="true"]').should('exist');
    popup().should('not.exist');
    cy.get('[data-test="trigger"]').should('not.have.attr', 'aria-expanded');
  });
});
