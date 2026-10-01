import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Link } from './Link';
import { Default } from '../../../../stories/src/Link/LinkDefault.stories';
import { Appearance } from '../../../../stories/src/Link/LinkAppearance.stories';
import { Inline } from '../../../../stories/src/Link/LinkInline.stories';
import { Disabled } from '../../../../stories/src/Link/LinkDisabled.stories';
import { DisabledFocusable } from '../../../../stories/src/Link/LinkDisabledFocusable.stories';
import { AsButton } from '../../../../stories/src/Link/LinkAsButton.stories';
import { AsSpan } from '../../../../stories/src/Link/LinkAsSpan.stories';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);

describe('Link unit-derived contracts', () => {
  for (const as of ['a', 'button', 'span'] as const) {
    it(`forwards ${as} refs, attributes and role/tabIndex overrides`, () => {
      const ref = React.createRef<HTMLAnchorElement | HTMLButtonElement | HTMLSpanElement>();
      mount(
        <Link
          as={as}
          href={as === 'a' ? '#home' : undefined}
          ref={ref}
          id="home"
          role="presentation"
          tabIndex={-1}
          className="consumer"
          title="Home"
        >
          Home
        </Link>,
      );
      cy.get('#home').should($root => {
        expect(ref.current).to.equal($root[0]);
        expect($root[0].tagName).to.equal(as.toUpperCase());
        expect($root)
          .to.have.attr('role', 'presentation')
          .and.have.attr('tabindex', '-1')
          .and.have.attr('title', 'Home');
        expect($root).to.have.class('fui-Link').and.have.class('consumer');
      });
    });
  }
  it('respects a supplied span onKeyDown without adding another activation', () => {
    const click = cy.stub().as('click');
    const key = cy.stub().as('key');
    mount(
      <Link
        as="span"
        onClick={click}
        onKeyDown={ev => {
          key();
          if (ev.key === 'Enter') {
            ev.currentTarget.click();
          }
        }}
      >
        Home
      </Link>,
    );
    cy.get('.fui-Link').focus().realPress('Enter');
    cy.get('@key').should('have.been.calledOnce');
    cy.get('@click').should('have.been.calledOnce');
  });
  it('leaves span keyboard activation to a consumer-provided handler', () => {
    const click = cy.stub().as('click');
    const key = cy.stub().as('key');
    mount(
      <Link as="span" onClick={click} onKeyDown={key}>
        Home
      </Link>,
    );
    cy.get('.fui-Link').focus().realPress('Enter');
    cy.get('@key').should('have.been.calledOnce');
    cy.get('@click').should('not.have.been.called');
  });
  it('updates disabled, inline and destination state on the same anchor', () => {
    const Harness = () => {
      const [disabled, setDisabled] = React.useState(true);
      return (
        <>
          <button onClick={() => setDisabled(false)}>Enable</button>
          <Link href="#new" disabled={disabled} inline={!disabled}>
            Home
          </Link>
        </>
      );
    };
    mount(<Harness />);
    cy.get('.fui-Link').should('not.have.attr', 'href');
    cy.contains('button', 'Enable').click();
    cy.get('.fui-Link').should('have.attr', 'href', '#new');
    cy.get('.fui-Link').should('not.have.attr', 'aria-disabled');
    cy.get('.fui-Link').should('have.css', 'text-decoration-line', 'underline');
  });
});

describe('Link keyboard and accessibility edges', () => {
  for (const as of ['a', 'button', 'span'] as const) {
    it(`activates ${as} with native or emulated keyboard semantics`, () => {
      const click = cy.stub().as('click');
      mount(
        <>
          <button>Before</button>
          <Link
            as={as}
            href={as === 'a' ? '#home' : undefined}
            onClick={(ev: React.MouseEvent<HTMLElement>) => {
              ev.preventDefault();
              click();
            }}
          >
            Home
          </Link>
          <button>After</button>
        </>,
      );
      cy.contains('button', 'Before').click().realPress('Tab');
      cy.get('.fui-Link').should('be.focused').realPress('Enter');
      cy.get('@click').should('have.callCount', 1);
      if (as !== 'a') {
        cy.get('.fui-Link').realPress('Space');
        cy.get('@click').should('have.callCount', 2);
      }
      cy.get('.fui-Link').realPress('Tab');
      cy.contains('button', 'After').should('be.focused');
    });
    for (const mode of ['disabled', 'disabledFocusable'] as const) {
      it(`suppresses ${as} activation when ${mode}`, () => {
        const click = cy.stub().as('click');
        mount(
          <>
            <button>Before</button>
            <Link as={as} href={as === 'a' ? '#home' : undefined} {...{ [mode]: true }} onClick={click}>
              Home
            </Link>
            <button>After</button>
          </>,
        );
        cy.get('.fui-Link').should('have.attr', 'aria-disabled', 'true');
        cy.contains('button', 'Before').click().realPress('Tab');
        if (mode === 'disabled') {
          cy.contains('button', 'After').should('be.focused');
          if (as !== 'button') {
            cy.get('.fui-Link').click();
          }
        } else {
          cy.get('.fui-Link').should('be.focused').click().realPress('Enter').realPress('Space');
        }
        cy.get('@click').should('not.have.been.called');
      });
    }
  }
  it('does not submit a surrounding form through the default button link', () => {
    const submit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={ev => {
          ev.preventDefault();
          submit();
        }}
      >
        <Link>Action</Link>
      </form>,
    );
    cy.contains('button', 'Action').click().realPress('Enter');
    cy.get('@submit').should('not.have.been.called');
  });
});

describe('Link documented scenarios', () => {
  it('renders the default anchor destination', () => {
    mount(<Default />);
    cy.contains('a', 'This is a link').should('have.attr', 'href', 'https://www.bing.com');
  });
  it('renders subtle appearance without changing destination semantics', () => {
    mount(<Appearance />);
    cy.contains('a', 'Subtle link')
      .should('have.attr', 'href', 'https://www.bing.com')
      .and('have.css', 'text-decoration-line', 'none');
  });
  it('underlines inline links alongside surrounding text', () => {
    mount(<Inline />);
    cy.contains('a', 'inline link').should('have.css', 'text-decoration-line', 'underline');
    cy.contains('div', 'used alongside other text').should('be.visible');
  });
  it('renders the documented disabled and disabledFocusable distinctions', () => {
    mount(
      <>
        <button>Before</button>
        <Disabled />
        <DisabledFocusable />
        <button>After</button>
      </>,
    );
    cy.contains('a', 'Disabled link').should('have.attr', 'aria-disabled', 'true').and('not.have.attr', 'href');
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.contains('a', 'Disabled but still focusable').should('be.focused').and('have.attr', 'aria-disabled', 'true');
  });
  it('renders a button without href', () => {
    mount(<AsButton />);
    cy.contains('button', 'Render as a button').should('have.attr', 'type', 'button');
  });
  it('wraps the documented span link across lines with button semantics', () => {
    mount(<AsSpan />);
    cy.get('span.fui-Link')
      .should('have.attr', 'role', 'button')
      .and('have.attr', 'tabindex', '0')
      .then($span => {
        const range = $span[0].ownerDocument.createRange();
        range.selectNodeContents($span[0]);
        expect(range.getClientRects().length).to.be.greaterThan(1);
      });
  });
});
