import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, tokens } from '@fluentui/react-theme';
import { Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from '@fluentui/react-menu';
import type { MenuProps } from '@fluentui/react-menu';
import type { MenuButtonProps } from '@fluentui/react-button';
import { SplitButton } from './SplitButton';
import type { SplitButtonProps } from './SplitButton.types';
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const primary = () => cy.get('.fui-SplitButton__primaryActionButton');
const secondary = () => cy.get('.fui-SplitButton__menuButton');
const popup = () => cy.get('[role="menu"]');
const cssColor = (color: string) =>
  color === 'transparent'
    ? 'rgba(0, 0, 0, 0)'
    : color.startsWith('#')
    ? `rgb(${[1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16)).join(', ')})`
    : color.replace(/,\s*/g, ', ');
const Example = ({
  children = 'Send',
  menuProps,
  onAction,
  ...props
}: SplitButtonProps & {
  menuProps?: Omit<MenuProps, 'children'>;
  onAction?: React.MouseEventHandler<HTMLButtonElement>;
}) => (
  <>
    <button data-test="before">Before</button>
    <Menu {...menuProps}>
      <MenuTrigger disableButtonEnhancement>
        {(triggerProps: MenuButtonProps) => (
          <SplitButton primaryActionButton={{ onClick: onAction }} menuButton={triggerProps} {...props}>
            {children}
          </SplitButton>
        )}
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem data-test="first-item">Send later</MenuItem>
          <MenuItem data-test="last-item">Schedule send</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
    <button data-test="after">After</button>
  </>
);

describe('SplitButton documented browser contracts (round 1)', () => {
  (['Enter', 'Space'] as const).forEach(key => {
    it(`Default: independent native ${key} activation, two Tab stops, menu navigation/Escape restoration`, () => {
      const action = cy.stub().as('action');
      mount(<Example onAction={action} />);
      cy.get('.fui-SplitButton').should('have.prop', 'tagName', 'DIV');
      cy.get('.fui-SplitButton').should('not.have.attr', 'role');
      cy.get('[data-test="before"]').focus().realPress('Tab');
      primary().should('be.focused').realPress(key);
      cy.get('@action').should('have.been.calledOnce');
      popup().should('not.exist');
      cy.realPress('Tab');
      secondary()
        .should('be.focused')
        .and('have.attr', 'aria-expanded', 'false')
        .and('have.attr', 'aria-haspopup', 'menu');
      primary()
        .invoke('attr', 'id')
        .then(id => secondary().should('have.attr', 'aria-labelledby', id));
      cy.realPress(key);
      popup().should('be.visible');
      secondary().should('have.attr', 'aria-expanded', 'true');
      cy.get('[data-test="first-item"]').should('be.focused');
      cy.realPress('End');
      cy.get('[data-test="last-item"]').should('be.focused');
      cy.realPress('Home');
      cy.get('[data-test="first-item"]').should('be.focused');
      cy.realPress('ArrowDown');
      cy.get('[data-test="last-item"]').should('be.focused');
      cy.realPress('Escape');
      popup().should('not.exist');
      secondary().should('be.focused').and('have.attr', 'aria-expanded', 'false');
      cy.get('@action').should('have.been.calledOnce');
      cy.realPress(['Shift', 'Tab']);
      primary().should('be.focused');
    });
  });
  (['secondary', 'primary', 'outline', 'subtle', 'transparent'] as const).forEach(appearance => {
    it(`Appearance ${appearance}: primary click remains separate from secondary menu click`, () => {
      const action = cy.stub().as('action');
      mount(<Example appearance={appearance} onAction={action} />);
      const normal =
        appearance === 'secondary'
          ? webLightTheme.colorNeutralBackground1
          : appearance === 'primary'
          ? webLightTheme.colorBrandBackground
          : webLightTheme.colorTransparentBackground;
      const hover =
        appearance === 'secondary'
          ? webLightTheme.colorNeutralBackground1Hover
          : appearance === 'primary'
          ? webLightTheme.colorBrandBackgroundHover
          : appearance === 'subtle'
          ? webLightTheme.colorSubtleBackgroundHover
          : webLightTheme.colorTransparentBackgroundHover;
      [primary, secondary].forEach(button => {
        button().should('have.css', 'background-color', cssColor(normal));
        button().realHover();
        button().should('have.css', 'background-color', cssColor(hover));
        cy.get('[data-test="after"]').realHover();
      });
      primary().click();
      popup().should('not.exist');
      secondary().click();
      popup().should('be.visible');
      cy.get('@action').should('have.been.calledOnce');
      cy.realPress('Escape');
      secondary().should('be.focused');
    });
  });
  (['small', 'medium', 'large'] as const).forEach((size, index) => {
    it(`Size ${size}/Shape variants: both targets keep 24px menu width and joined inner corners`, () => {
      mount(<Example size={size} shape={(['rounded', 'square', 'circular'] as const)[index]} />);
      [primary, secondary].forEach(button =>
        button().should(
          'have.css',
          'font-size',
          [webLightTheme.fontSizeBase200, webLightTheme.fontSizeBase300, webLightTheme.fontSizeBase400][index],
        ),
      );
      secondary().then($el => expect($el[0].getBoundingClientRect().width).to.be.at.least(24));
      primary().should('have.css', 'border-top-right-radius', '0px');
      secondary().should('have.css', 'border-top-left-radius', '0px');
      primary().should('have.css', 'border-top-left-radius', ['4px', '0px', '10000px'][index]);
      secondary().focus().realPress('Enter');
      popup().should('be.visible');
    });
  });
  (['before', 'after'] as const).forEach(iconPosition => {
    it(`Icon ${iconPosition}: primary icon order and custom menu icon preserve separate actions`, () => {
      mount(
        <Example
          icon={<span data-test="primary-icon">Icon</span>}
          iconPosition={iconPosition}
          menuIcon={<span data-test="menu-icon">More</span>}
        />,
      );
      primary().find('[data-test="primary-icon"]').should('have.length', 1);
      primary().then($button => {
        const button = $button[0];
        const icon = button.querySelector('[data-test="primary-icon"]')!;
        const text = Array.from(button.childNodes).find(
          node => node.nodeType === Node.TEXT_NODE && node.textContent?.includes('Send'),
        )!;
        expect(Boolean(icon.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING)).to.equal(
          iconPosition === 'before',
        );
      });
      secondary().find('[data-test="menu-icon"]').should('have.length', 1);
      secondary().find('svg').should('not.exist');
      secondary().focus().realPress('Space');
      popup().should('be.visible');
    });
  });
  it('WithLongText: bounded primary wraps without losing menu name or keyboard activation', () => {
    const text = 'Long text wraps after it hits the max width of the component';
    mount(
      <Example primaryActionButton={{ style: { width: `calc(${tokens.spacingHorizontalXXXL} * 5)` } }}>{text}</Example>,
    );
    primary().should('have.text', text).and('have.css', 'white-space', 'normal');
    primary().should($el => {
      const button = $el[0];
      const doc = button.ownerDocument;
      const styles = doc.defaultView!.getComputedStyle(button);
      const bounds = button.getBoundingClientRect();
      expect(bounds.width).to.equal(parseFloat(styles.getPropertyValue('--spacingHorizontalXXXL')) * 5);
      const range = doc.createRange();
      range.selectNodeContents(button);
      const lines = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
      expect(new Set(lines.map(rect => rect.top)).size).to.be.greaterThan(1);
      lines.forEach(rect => {
        expect(rect.left).to.be.at.least(bounds.left);
        expect(rect.right).to.be.at.most(bounds.right);
        expect(rect.bottom).to.be.at.most(bounds.bottom);
      });
    });
    primary()
      .invoke('attr', 'id')
      .then(id => secondary().should('have.attr', 'aria-labelledby', id));
    secondary().focus().realPress('Enter');
    popup().should('be.visible');
  });
  (['disabled', 'disabledFocusable'] as const).forEach(kind => {
    it(`Disabled story ${kind}: both halves reject native activation/open callbacks`, () => {
      const action = cy.stub().as('action');
      const opened = cy.stub().as('opened');
      mount(<Example {...{ [kind]: true }} onAction={action} menuProps={{ onOpenChange: opened }} />);
      cy.get('[data-test="before"]').focus().realPress('Tab');
      if (kind === 'disabled') {
        cy.get('[data-test="after"]').should('be.focused');
        primary().should('be.disabled').click({ force: true });
        secondary().should('be.disabled').click({ force: true });
      } else {
        primary().should('be.focused').and('have.attr', 'aria-disabled', 'true').realPress('Enter');
        cy.realPress('Tab');
        secondary().should('be.focused').and('have.attr', 'aria-disabled', 'true').realPress('Space');
        primary().click();
        secondary().click();
      }
      popup().should('not.exist');
      cy.get('@action').should('not.have.been.called');
      cy.get('@opened').should('not.have.been.called');
    });
  });
});

describe('SplitButton accessibility edges (round 2)', () => {
  (['primaryActionButton', 'menuButton'] as const).forEach(slot => {
    (['disabled', 'disabledFocusable'] as const).forEach(kind => {
      it(`unit independent ${slot} ${kind}: other half remains actionable and disabled callback is silent`, () => {
        const main = cy.stub().as('main');
        const menu = cy.stub().as('menu');
        mount(
          <>
            <button data-test="before">Before</button>
            <SplitButton
              primaryActionButton={{ onClick: main, ...(slot === 'primaryActionButton' ? { [kind]: true } : {}) }}
              menuButton={{ onClick: menu, ...(slot === 'menuButton' ? { [kind]: true } : {}) }}
            >
              Send
            </SplitButton>
            <button data-test="after">After</button>
          </>,
        );
        const disabled = slot === 'primaryActionButton' ? primary : secondary;
        const enabled = slot === 'primaryActionButton' ? secondary : primary;
        cy.get('[data-test="before"]').focus().realPress('Tab');
        if (kind === 'disabled') {
          enabled().should('be.focused');
          disabled().should('be.disabled').click({ force: true });
        } else {
          primary().should('be.focused');
          disabled().focus().realPress('Enter');
          cy.realPress('Space');
          disabled().click();
        }
        enabled().focus().realPress('Enter');
        cy.get(slot === 'primaryActionButton' ? '@main' : '@menu').should('not.have.been.called');
        cy.get(slot === 'primaryActionButton' ? '@menu' : '@main').should('have.been.calledOnce');
      });
    });
  });
  it('icon-only primary and explicit secondary labels provide two independent accessible names', () => {
    const primaryRef = React.createRef<HTMLButtonElement>();
    const click = cy.stub().as('click');
    mount(
      <SplitButton
        icon={<span data-test="icon">Icon</span>}
        primaryActionButton={{ 'aria-label': 'Send now', ref: primaryRef, onClick: click }}
        menuButton={{ 'aria-label': 'More send options' }}
      />,
    );
    primary()
      .should('have.attr', 'aria-label', 'Send now')
      .then($el => expect(primaryRef.current).to.equal($el[0]));
    secondary().should('have.attr', 'aria-label', 'More send options');
    secondary().should('not.have.attr', 'aria-labelledby');
    primary().focus().realPress('Space');
    cy.get('@click').should('have.been.calledOnce');
  });
  it('consumer aria-labelledby is preserved instead of replaced with the generated primary label', () => {
    mount(
      <>
        <span id="menu-description">Additional send choices</span>
        <SplitButton menuButton={{ 'aria-labelledby': 'menu-description' }}>Send</SplitButton>
      </>,
    );
    secondary().should('have.attr', 'aria-labelledby', 'menu-description');
    cy.get('#menu-description').should('have.text', 'Additional send choices');
  });
  it('cancelled native primary Enter/Space yields no action, while secondary still opens', () => {
    const click = cy.stub().as('click');
    mount(
      <Example
        primaryActionButton={{
          onClick: click,
          onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => event.preventDefault(),
          onKeyUp: (event: React.KeyboardEvent<HTMLButtonElement>) => event.preventDefault(),
        }}
      />,
    );
    primary().focus().realPress('Enter');
    cy.realPress('Space');
    popup().should('not.exist');
    cy.get('@click').should('not.have.been.called');
    secondary().focus().realPress('Enter');
    popup().should('be.visible');
  });
  it('primary navigation keys do not trigger actions or open the menu; secondary ArrowDown does', () => {
    const click = cy.stub().as('click');
    mount(<Example onAction={click} />);
    primary().focus();
    (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'] as const).forEach(key => cy.realPress(key));
    primary().should('be.focused');
    popup().should('not.exist');
    cy.get('@click').should('not.have.been.called');
    secondary().focus().realPress('ArrowDown');
    cy.get('[data-test="first-item"]').should('be.focused');
    cy.realPress('Escape');
    secondary().should('be.focused');
  });
  it('disabledFocusable submit slots cancel native form defaults as well as consumer actions', () => {
    const submit = cy.stub().as('submit');
    const click = cy.stub().as('click');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <SplitButton
          disabledFocusable
          primaryActionButton={{ type: 'submit', onClick: click }}
          menuButton={{ type: 'submit', onClick: click }}
        >
          Submit
        </SplitButton>
      </form>,
    );
    primary().focus().realPress('Enter');
    cy.realPress('Space');
    primary().click();
    secondary().focus().realPress('Enter');
    cy.realPress('Space');
    secondary().click();
    cy.get('@submit').should('not.have.been.called');
    cy.get('@click').should('not.have.been.called');
  });
});

describe('SplitButton unit-derived and lifecycle contracts (round 3)', () => {
  it('unit styled child metadata/default chevron and non-native prop filtering are preserved in the browser', () => {
    mount(
      <SplitButton disabledFocusable icon={<span data-test="icon">Icon</span>} iconPosition="after">
        Send
      </SplitButton>,
    );
    primary().should('have.class', 'fui-Button').and('have.attr', 'aria-disabled', 'true');
    secondary().should('have.class', 'fui-MenuButton').and('have.attr', 'aria-disabled', 'true');
    secondary().find('svg').should('have.length', 1);
    [primary, secondary].forEach(button => {
      button().should('not.have.attr', 'disabledfocusable');
      button().should('not.have.attr', 'iconposition');
    });
    primary().find('[data-test="icon"]').should('exist');
  });
  it('root and child object/callback refs identify actual nodes; native attributes/classes survive then refs clear', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const primaryRef = React.createRef<HTMLButtonElement>();
    const menuRef = cy.stub().as('menuRef');
    let setVisible: React.Dispatch<React.SetStateAction<boolean>>;
    const Lifecycle = () => {
      const [visible, update] = React.useState(true);
      setVisible = update;
      return visible ? (
        <SplitButton
          ref={rootRef}
          id="split-root"
          title="Actions"
          className="consumer-root"
          primaryActionButton={{
            ref: primaryRef,
            id: 'main-action',
            name: 'action',
            type: 'button',
            className: 'consumer-primary',
          }}
          menuButton={{ ref: menuRef, id: 'menu-action', className: 'consumer-menu', 'aria-label': 'More choices' }}
        >
          Send
        </SplitButton>
      ) : (
        <p data-test="removed">Removed</p>
      );
    };
    mount(<Lifecycle />);
    cy.get('#split-root')
      .should('have.class', 'fui-SplitButton')
      .and('have.class', 'consumer-root')
      .and('have.attr', 'title', 'Actions')
      .then($el => expect(rootRef.current).to.equal($el[0]));
    primary()
      .should('have.class', 'consumer-primary')
      .and('have.attr', 'name', 'action')
      .then($el => expect(primaryRef.current).to.equal($el[0]));
    secondary()
      .should('have.class', 'consumer-menu')
      .then($el => expect(menuRef.lastCall.args[0]).to.equal($el[0]));
    cy.then(() => setVisible(false));
    cy.get('[data-test="removed"]').should('exist');
    cy.then(() => {
      expect(rootRef.current).to.equal(null);
      expect(primaryRef.current).to.equal(null);
      expect(menuRef.lastCall.args[0]).to.equal(null);
    });
  });
  it('root onClick bubbles from both halves with root currentTarget after each slot handler', () => {
    const calls = cy.stub().as('calls');
    mount(
      <SplitButton
        id="split-root"
        onClick={(event: React.MouseEvent<HTMLElement>) => calls('root', event.currentTarget.id)}
        primaryActionButton={{
          id: 'main-action',
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => calls('main', event.currentTarget.id),
        }}
        menuButton={{
          id: 'menu-action',
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => calls('menu', event.currentTarget.id),
        }}
      >
        Send
      </SplitButton>,
    );
    primary().click();
    secondary().click();
    cy.get('@calls').then(() =>
      expect(calls.getCalls().map(call => call.args)).to.deep.equal([
        ['main', 'main-action'],
        ['root', 'split-root'],
        ['menu', 'menu-action'],
        ['root', 'split-root'],
      ]),
    );
  });
  (['primaryActionButton', 'menuButton'] as const).forEach(slot => {
    it(`null ${slot} omits only that optional slot and the remaining button still activates`, () => {
      const click = cy.stub().as('click');
      mount(
        <SplitButton
          primaryActionButton={slot === 'primaryActionButton' ? null : { onClick: click }}
          menuButton={slot === 'menuButton' ? null : { onClick: click, 'aria-label': 'Remaining menu' }}
        >
          Send
        </SplitButton>,
      );
      (slot === 'primaryActionButton' ? primary : secondary)().should('not.exist');
      (slot === 'primaryActionButton' ? secondary : primary)().focus().realPress('Enter');
      cy.get('@click').should('have.been.calledOnce');
    });
  });
  it('dynamic primary ID/slot label/appearance/size update on the same root and relabel secondary correctly', () => {
    let setVersion: React.Dispatch<React.SetStateAction<number>>;
    const Dynamic = () => {
      const [version, update] = React.useState(0);
      setVersion = update;
      return (
        <SplitButton
          appearance={version ? 'primary' : 'secondary'}
          size={version ? 'large' : 'small'}
          primaryActionButton={{ id: `main-${version}`, children: `Action ${version}` }}
        >
          Ignored top-level text
        </SplitButton>
      );
    };
    mount(<Dynamic />);
    primary().should('have.text', 'Action 0');
    secondary().should('have.attr', 'aria-labelledby', 'main-0');
    cy.get('.fui-SplitButton').then($root => {
      cy.then(() => setVersion(1));
      primary().should('have.text', 'Action 1').and('have.css', 'font-size', webLightTheme.fontSizeBase400);
      secondary()
        .should('have.attr', 'aria-labelledby', 'main-1')
        .and('have.css', 'background-color', cssColor(webLightTheme.colorBrandBackground));
      cy.get('.fui-SplitButton').then($next => expect($next[0]).to.equal($root[0]));
    });
  });
  it('latest slot callbacks/currentTarget are used after rerender without leaking stale actions', () => {
    const calls = cy.stub().as('calls');
    let setVersion: React.Dispatch<React.SetStateAction<number>>;
    const Current = () => {
      const [version, update] = React.useState(0);
      setVersion = update;
      return (
        <SplitButton
          primaryActionButton={{
            id: `main-${version}`,
            onClick: (event: React.MouseEvent<HTMLButtonElement>) =>
              calls('main', version, event.type, event.currentTarget.id),
          }}
          menuButton={{
            id: `menu-${version}`,
            onClick: (event: React.MouseEvent<HTMLButtonElement>) =>
              calls('menu', version, event.type, event.currentTarget.id),
          }}
        >
          Send {version}
        </SplitButton>
      );
    };
    mount(<Current />);
    primary().should('have.text', 'Send 0');
    cy.then(() => setVersion(1));
    primary().should('have.text', 'Send 1').focus().realPress('Enter');
    secondary().focus().realPress('Space');
    cy.get('@calls').then(() =>
      expect(calls.getCalls().map(call => call.args)).to.deep.equal([
        ['main', 1, 'click', 'main-1'],
        ['menu', 1, 'click', 'menu-1'],
      ]),
    );
  });
  it('controlled Menu rejects requests until external state changes with actual envelope/identity', () => {
    const changes = cy.stub().as('changes');
    let setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    const Controlled = () => {
      const [open, update] = React.useState(false);
      setOpen = update;
      return <Example menuProps={{ open, onOpenChange: (event, data) => changes(event, data) }} />;
    };
    mount(<Controlled />);
    secondary().click();
    popup().should('not.exist');
    secondary().should('have.attr', 'aria-expanded', 'false');
    cy.get('@changes').should('have.been.calledOnce');
    cy.get('@changes').then(() => {
      const [event, data] = changes.firstCall.args;
      expect(data).to.deep.equal({ type: 'menuTriggerClick', event, open: true, keyboard: false });
    });
    cy.then(() => setOpen(true));
    popup().should('be.visible');
    secondary().should('have.attr', 'aria-expanded', 'true');
    cy.get('@changes').should('have.been.calledOnce');
  });
  it('Menu defaultOpen initializes expanded secondary while native primary remains a separate action', () => {
    const click = cy.stub().as('click');
    mount(<Example onAction={click} menuProps={{ defaultOpen: true }} />);
    popup().should('be.visible');
    secondary().should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-test="first-item"]').focus().realPress('Escape');
    popup().should('not.exist');
    secondary().should('be.focused').and('have.attr', 'aria-expanded', 'false');
    primary().click();
    cy.get('@click').should('have.been.calledOnce');
    popup().should('not.exist');
  });
  it('anchor primary preserves href/name semantics while independently labelled menu stays a button', () => {
    const click = cy.stub().as('click');
    mount(
      <SplitButton
        primaryActionButton={{
          as: 'a',
          href: '#destination',
          onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            click(event.currentTarget.href);
          },
        }}
        menuButton={{ 'aria-label': 'Additional actions' }}
      >
        Navigate
      </SplitButton>,
    );
    primary().should('have.prop', 'tagName', 'A').and('have.attr', 'href', '#destination').focus().realPress('Enter');
    secondary().should('have.prop', 'tagName', 'BUTTON').and('have.attr', 'aria-label', 'Additional actions');
    cy.get('@click').should('have.been.calledOnce');
  });
  it('external MenuTrigger limitation: current composition omits aria-controls unless a consumer supplies it', () => {
    mount(<Example />);
    secondary().should('not.have.attr', 'aria-controls');
    secondary().focus().realPress('Enter');
    popup().should('be.visible');
    secondary().should('not.have.attr', 'aria-controls');
    cy.realPress('Escape');
    mount(<SplitButton menuButton={{ 'aria-controls': 'consumer-menu', 'aria-label': 'Menu' }}>Send</SplitButton>);
    secondary().should('have.attr', 'aria-controls', 'consumer-menu');
  });
});
